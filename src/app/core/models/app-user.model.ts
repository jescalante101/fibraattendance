export interface CreateAppUser {
    userName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
}

export interface UpdateAppUser {
    userName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
}