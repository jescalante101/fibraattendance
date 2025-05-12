export interface IclockTerminalModel {
      id: number;
    createTime: string;
    createUser: any; // Puedes especificar un tipo más concreto si conoces su estructura
    changeTime: string;
    changeUser: any; // Puedes especificar un tipo más concreto si conoces su estructura
    status: number;
    sn: string;
    alias: string;
    ipAddress: string;
    realIp: string;
    state: number;
    terminalTz: number;
    heartbeat: number;
    transferMode: number;
    transferInterval: number;
    transferTime: string;
    productType: number;
    isAttendance: number;
    isRegistration: number;
    purpose: any; // Puedes especificar un tipo más concreto si conoces su estructura
    controllerType: number;
    authentication: number;
    style: any; // Puedes especificar un tipo más concreto si conoces su estructura
    uploadFlag: string;
    fwVer: string;
    pushProtocol: string;
    pushVer: string;
    language: number;
    isTft: boolean;
    terminalName: string;
    platform: string;
    oemVendor: any; // Puedes especificar un tipo más concreto si conoces su estructura
    logStamp: string;
    opLogStamp: string;
    captureStamp: string;
    userCount: number;
    userCapacity: any; // Puedes especificar un tipo más concreto si conoces su estructura
    photoFuncOn: boolean;
    transactionCount: number;
    transactionCapacity: any; // Puedes especificar un tipo más concreto si conoces su estructura
    fpFuncOn: boolean;
    fpCount: number;
    fpCapacity: any; // Puedes especificar un tipo más concreto si conoces su estructura
    fpAlgVer: string;
    faceFuncOn: boolean;
    faceCount: number;
    faceCapacity: any; // Puedes especificar un tipo más concreto si conoces su estructura
    faceAlgVer: string;
    fvFuncOn: boolean;
    fvCount: number;
    fvCapacity: any; // Puedes especificar un tipo más concreto si conoces su estructura
    fvAlgVer: string;
    palmFuncOn: boolean;
    palmCount: number;
    palmCapacity: any; // Puedes especificar un tipo más concreto si conoces su estructura
    palmAlgVer: string;
    lastActivity: string;
    uploadTime: string;
    pushTime: string;
    areaId: number;
    isAccess: number;
    lockFunc: number;
    accAccterminals: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    area: any; // Puedes especificar un tipo más concreto si conoces su estructura
    epEptransactions: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockErrorcommandlogs: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockPublicmessages: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockTerminalcommands: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockTerminallogs: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockTerminalparameters: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockTerminaluploadlogs: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockTransactionproofcmds: any[]; // Puedes especificar un tipo más concreto si conoces su estructura
    iclockTransactions: any[]; //
}
