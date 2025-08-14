
export interface SedeCcosto {
    siteId: string;
    costCenterId: string;
    observation: string;
    siteName: string;
    costCenterName: string;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updateDate: string;
    active: string;
}

export interface SedeCcostoInsert {
    siteId: string;
    costCenterId: string;
    observation: string;
    siteName: string;
    costCenterName: string;
    createdBy: string;
    createdAt: string;
    active: string;
}

export interface SedeCcostoUpdate {
    observation: string;
    siteName: string;
    costCenterName: string;
    updatedBy: string;
    updateDate: string;
    active: string;
}

