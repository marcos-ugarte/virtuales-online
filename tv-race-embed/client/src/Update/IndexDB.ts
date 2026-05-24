import { openDB, IDBPDatabase, IDBPTransaction, deleteDB } from "idb";
import { Logger } from "client/Logic/Logger";
import { PathUtil } from "client/PathUtil";

export interface IFileInfo {
  name: string;
  size?: number;
  md5?: string;
}

export interface IFolderInfo {
  name: string;
  files: IFileInfo[];
  folders: IFolderInfo[];
}

export class IndexDB {
  public dbName: string;
  public version: number = 1;

  public constructor(dbName: string, version?: number) {
    this.dbName = dbName;
    if (version) this.version = version;

    if (!IndexDB.isSupported()) throw new Error("IndexDBBackend is not supported!");
  }

  public static isSupported(): boolean {
    if (!("indexedDB" in window)) {
      Logger.warn("This browser doesn't support IndexedDB");
      return false;
    }
    return true;
  }

  public async readFile(fullPath: string): Promise<Blob | undefined> {
    let db: IDBPDatabase<any> | undefined;
    let tx: IDBPTransaction<any, ["fs"]> | undefined;
    try {
      db = await this.open();
      tx = db.transaction("fs", "readonly"); // await?
      const obj = await tx.objectStore("fs").get(this.getId(fullPath));
      return obj as Blob;
    } catch (e) {
      Logger.error("ReadFile: " + fullPath + " ", e);
    } finally {
      if (tx) await tx.done;
      if (db) db.close();
    }
    return undefined;
  }

  public async getFolderInfo(folder: string): Promise<IFolderInfo | undefined> {
    let db: IDBPDatabase<any> | undefined;
    let tx: IDBPTransaction<any, ["fs"]> | undefined;
    try {
      db = await this.open();
      tx = db.transaction("fs", "readonly"); // await ?
      const folderInfo = (await tx.objectStore("fs").get(this.getId(folder))) as IFolderInfo;
      return folderInfo;
    } catch (e) {
      Logger.error("getFolderInfo: " + folder + " ", e);
    } finally {
      if (tx) await tx.done;
      if (db) db.close();
    }
  }

  public async readFileInfo(fullPath: string): Promise<IFileInfo | undefined> {
    const folder = PathUtil.dirname(fullPath);
    const fileName = PathUtil.basename(fullPath);

    const folderInfo = await this.getFolderInfo(folder);
    if (!folderInfo) return folderInfo;
    const index = folderInfo.files.findIndex((f) => f.name === fileName);
    if (index === -1) return undefined;
    return folderInfo.files[index];
  }

  private getId(...pathArray: string[]) {
    const id = PathUtil.join(...pathArray);
    return id;
  }

  private async ensureFileInfo(tx: IDBPTransaction<any, ["fs"], "readwrite">, fullName: string, fileInfo: IFileInfo) {
    const folder = PathUtil.dirname(fullName);
    const folderName = PathUtil.basename(folder);
    let dir: IFolderInfo = await tx.objectStore("fs").get(this.getId(folder));
    if (dir === undefined) {
      dir = { files: [], folders: [], name: folderName };
    }
    const index = dir.files.findIndex((fi) => fi.name === fileInfo.name);
    if (index === -1) dir.files.push(fileInfo);
    else dir.files[index] = fileInfo;
    await tx.objectStore("fs").put(dir, this.getId(folder));

    if (folder.length > 0 && folder !== "." && folder !== "/") await this.ensureFolderInfo(tx, folder, dir);
  }

  private async ensureFolderInfo(tx: IDBPTransaction<any, ["fs"], "readwrite">, folder: string, parent: IFolderInfo) {
    const folderName = PathUtil.basename(folder);
    const subFolder = PathUtil.dirname(folder);
    const subFolderName = PathUtil.basename(subFolder);
    let dir: IFolderInfo = await tx.objectStore("fs").get(this.getId(subFolder));
    if (dir === undefined) dir = { files: [], folders: [], name: subFolderName };
    const index = dir.folders.findIndex((f) => f.name === folderName);
    if (index === -1) dir.folders.push(parent);
    else dir.folders[index] = parent;

    await tx.objectStore("fs").put(dir, this.getId(subFolder));
    if (folder.length > 0 && subFolder !== "." && subFolder !== "/") await this.ensureFolderInfo(tx, subFolder, dir);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async writeFile(fullName: string, file: any, size: number, md5: string | undefined): Promise<void> {
    // const folder = PathUtil.dirname(fullName);
    const fileName = PathUtil.basename(fullName);

    let db: IDBPDatabase<any> | undefined;
    let tx: IDBPTransaction<any, ["fs"], "readwrite"> | undefined;
    try {
      db = await this.open();
      tx = db.transaction("fs", "readwrite"); // await ?
      await tx.objectStore("fs").put(file, this.getId(fullName));
      await this.ensureFileInfo(tx, fullName, { name: fileName, size, md5 });
    } catch (e) {
      Logger.error("writeFile: " + fullName + " " + fileName + " ", e);
    } finally {
      if (tx) await tx.done;
      if (db) db.close();
    }
  }

  public async delete(): Promise<void> {
    await deleteDB(this.dbName, {
      blocked: () => {
        Logger.info("Open connections!");
      }
    });
  }

  public async open(): Promise<IDBPDatabase<unknown>> {
    const db = await openDB(this.dbName, this.version, {
      upgrade: (database, oldVersion, newVersion, transaction) => {
        Logger.info("IndexDB upgrade " + oldVersion + " " + newVersion);
        try {
          database.deleteObjectStore("fs");
        } catch (e) {
          console.log("Couldn't delete object store: " + e);
        }
        try {
          database.createObjectStore("fs", { autoIncrement: true });
        } catch (e) {
          console.log("Couldn't create object store: " + e);
        }
        // const store = database.createObjectStore("fs", {autoIncrement: true});
        // Logger.info("Store created!");
      },
      blocked: () => {
        Logger.warn("IndexDB blocked");
      },
      blocking: () => {
        Logger.warn("IndexDB blocking");
      }
    });
    return db;
  }

  public async enumFiles(callback: (file: IFileInfo, folderName: string) => void): Promise<void> {
    const folder = await this.getFolderInfo(".");
    if (!folder) return;
    await this.enumFilesInternal(folder, folder.name, true, callback);
  }

  // eslint-disable-next-line no-shadow
  private async enumFilesInternal(folder: IFolderInfo, folderName: string, recursive: boolean, callback: (file: IFileInfo, folderName: string) => void): Promise<void> {
    for (const f of folder.files) {
      callback(f, folderName);
    }
    if (recursive) {
      const promises: Promise<void>[] = [];
      for (const f of folder.folders) {
        const newFolderName = this.join(folderName, f.name);
        promises.push(this.enumFilesInternal(f, newFolderName, recursive, callback));
      }
      await Promise.all(promises);
    }
  }

  private join(left: string, right: string) {
    if (left === ".") return right;
    if (left.endsWith(":")) return left + "//" + right;
    return left + "/" + right;
  }
}
