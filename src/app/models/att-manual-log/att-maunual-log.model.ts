

export interface AttManualLog {
    manualLogId: number;
    abstractexceptionPtrId: number;
    punchTime: string;
    punchState: number;
    workCode: string;
    applyReason: string;
    applyTime: string;
    auditReason: string;
    auditTime: string;
    approvalLevel: number | null;
    auditUserId: number | null;
    approver: string;
    employeeId: number  | null;
    isMask: boolean;
    temperature: number | null;
    nroDoc: string | null;
    fullName: string | null;

}

