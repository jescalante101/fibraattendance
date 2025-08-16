
export interface PersonalTransferDto {
  id: number;
  personalId: string;
  fullName: string;
  branchId: string;
  branchDescription: string;
  areaId: string;
  areaDescription: string;
  costCenterId: string;
  costCenterDescription: string;
  startDate: string; // ISO date string
  endDate?: string | null; // ISO date string
  observation?: string | null;
  createdBy: string;
  createdAt: string; // ISO datetime string
  updatedBy?: string | null;
  updatedAt?: string | null; // ISO datetime string
}

export interface CreatePersonalTransferDto {
  personalId: string;
  fullName: string;
  branchId: string;
  branchDescription: string;
  areaId: string;
  areaDescription: string;
  costCenterId: string;
  costCenterDescription: string;
  startDate: string; // ISO date string
  endDate?: string | null; // ISO date string
  observation?: string | null;
  createdBy: string;
}

export interface UpdatePersonalTransferDto {
  branchId?: string;
  branchDescription?: string;
  areaId?: string;
  areaDescription?: string;
  costCenterId?: string;
  costCenterDescription?: string;
  startDate?: string; // ISO date string
  endDate?: string | null; // ISO date string
  observation?: string | null;
  updatedBy: string;
}

export interface ApiResponsePersonalTransfer<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponsePersonalTransfer<T> {

  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}