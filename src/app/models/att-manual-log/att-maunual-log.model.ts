

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

    //
    createdAt: string | null;
    createdBy: string | null;
    updatedAt: string | null;
    updatedBy: string | null;

}
 // insert
 export interface AttManualLogInsert {
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
    createdAt: string ;
    createdBy: string;
}
// update
export interface AttManualLogUpdate {
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
    updatedAt: string;
    updatedBy: string;    
}


