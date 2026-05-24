export class PathUtil {
  public static join(...pathes: string[]): string {
    let joined = "";
    for (const p of pathes) {
      const leftTrimmed = p.startsWith("/") ? p.substr(1) : p;
      const trimmed = leftTrimmed.endsWith("/") ? leftTrimmed.substr(0, leftTrimmed.length - 1) : p;
      if (trimmed.length > 0) {
        if (joined.length > 0 && !joined.endsWith("/")) joined = joined + "/";
        joined = joined + trimmed;
      }
    }
    return joined;
  }

  public static extName(path: string): string {
    const index = path.lastIndexOf(".");
    if (index !== -1) return path.substr(index);
    return "";
  }

  public static basename(path: string): string {
    const index = path.lastIndexOf("/");
    if (index !== -1) {
      return path.substring(index + 1);
    } else {
      return path;
    }
  }

  public static dirname(path: string): string {
    const index = path.lastIndexOf("/");
    if (index !== -1) {
      return path.substring(0, index);
    } else {
      return ".";
    }
  }

  public static fixExtension(path: string, newExtension: string): string {
    const ext = this.extName(path);
    if (ext) return path.substring(0, path.length - ext.length) + newExtension;
    return path + newExtension;
  }
}
