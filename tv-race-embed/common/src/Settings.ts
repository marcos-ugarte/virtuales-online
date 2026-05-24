export class Settings {
  public static versionNumber = "1.029.11";

  public static defaultSocketUrl = "";
  public static socketUrls = [
    {
      domain: "",
      socketUrl: ""
    },
  ];
  public static geolocRequestUrl =
    "https://pro.ip-api.com/json/?key=vijXq4nIVhdbfsl&fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,offset,currency,isp,org,as,mobile,query";
  public static geolocIntervalTryTime = 60000; //milliseconds
  public static geolocIntervalMaxCount = 480; //milliseconds
  public static geolocTimout = 7000; //milliseconds
  public static geolocIntervalTimeout = 120000;
  public static noResultWaitSeconds = 10;
  public static kickboxQuotaDecimalPlaces = 2;
  public static onlineRetryTime = 60000; //milliseconds
  public static socketClosedRetryTime = 10000; //milliseconds

  public static terminalSettings = {
    closeLoadScreenMessage: "closeLoadingScreen",
    targetOrigin: "https://api.virtuales.bet",
    targetOriginDev: "http://192.168.130.40:81",
    targetOriginCompareStr: "192.168.130.40:65336"
  };
}

interface ISocketUrls {
  domain: string;
  socketUrl: string;
}
