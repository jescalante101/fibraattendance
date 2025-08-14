
export interface SedeAreaCosto {
    siteId: string;
    areaId: string;
    observation: string;
    siteName: string;
    areaName: string;
    createdBy: string;
    createdAt: string;
    costCenterId: string;
    costCenterName: string;
    active: string;
    updatedBy: string;
    updateDate: string;
}

export interface SedeAreaCostoInsert{
    siteId: string;
    areaId: string;
    siteName: string;
    areaName: string;
    observation: string;
    costCenterId: string;
    costCenterName: string;
    createdBy: string;
    createdAt: string;
    active: string;
}

export interface SedeAreaCostoUpdate {
    siteId: string;
    areaId: string;
    observation: string;
    costCenterId: string;
    costCenterName: string;
    active: string;
    updatedBy: string;
    updateDate: string;
}
