export interface CreateAppUser {
    userName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: string;
    createdBy: string;

}

export interface UpdateAppUser {
    userName: string;
    email: string;
    password: string | null;

    firstName: string;
    lastName: string;
    isActive: boolean;
    updatedAt: string;
    updatedBy: string;

}