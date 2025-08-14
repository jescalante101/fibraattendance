
export interface UserSite {
    userId: number;
    siteId: string;
    observation: string;
    userName: string;
    siteName: string;
    createdBy: string;
    createdAt: string;
    active: string;
}

// update interface
export interface UserSiteUpdate {
    userId: number;
    siteId: string;
    observation: string;
    userName: string;
    updatedBy: string;
    updatedAt: string;  
    active: string;
}
