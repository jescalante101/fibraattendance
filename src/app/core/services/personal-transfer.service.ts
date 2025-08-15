import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from "src/environments/environment";
import { 
  ApiResponsePersonalTransfer, 
  CreatePersonalTransferDto, 
  PersonalTransferDto, 
  UpdatePersonalTransferDto,
  PaginatedResponsePersonalTransfer // Make sure this is added to your models
} from "../models/personal-transfer.model";

@Injectable({
  providedIn: 'root'
})
export class PersonalTransferService {
  private readonly baseUrl = environment.apiUrlPro + "api";

  constructor(private http: HttpClient) {}

  /**
   * Get HTTP headers with content type and authorization
   */
  private getHttpHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * Handle HTTP errors consistently
   */
  private handleError(error: HttpErrorResponse): Observable<ApiResponsePersonalTransfer<any>> {
    console.error('PersonalTransferService error:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = `Server error: ${error.status} - ${error.message}`;
    }

    return throwError(() => ({
      success: false,
      message: errorMessage,
      errors: error.error?.errors || []
    }));
  }

  /**
   * Gets all personal Transfer records
   */
  getAllPersonalTransfers(): Observable<ApiResponsePersonalTransfer<PersonalTransferDto[]>> {
    return this.http.get<PersonalTransferDto[]>(`${this.baseUrl}/personal`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Gets personal records with pagination
   */
  getPersonalTransfersPaginated(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchTerm?: string,
    branchId?: string,
    areaId?: string,
    costCenterId?: string,
    isActive?: boolean
  ): Observable<ApiResponsePersonalTransfer<PaginatedResponsePersonalTransfer<PersonalTransferDto>>> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    if (branchId) {
      params = params.set('branchId', branchId);
    }
    if (areaId) {
      params = params.set('areaId', areaId);
    }
    if (costCenterId) {
      params = params.set('costCenterId', costCenterId);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<PaginatedResponsePersonalTransfer<PersonalTransferDto>>(`${this.baseUrl}/personal/paginated`, {

      headers: this.getHttpHeaders(),
      params: params
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Gets personal records with advanced pagination and sorting
   */
  getPersonalTransfersPaginatedAdvanced(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchTerm?: string,
    branchId?: string,
    areaId?: string,
    costCenterId?: string,
    isActive?: boolean,
    sortBy: string = 'PersonalId',
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Observable<ApiResponsePersonalTransfer<PaginatedResponsePersonalTransfer<PersonalTransferDto>>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    if (branchId) {
      params = params.set('branchId', branchId);
    }
    if (areaId) {
      params = params.set('areaId', areaId);
    }
    if (costCenterId) {
      params = params.set('costCenterId', costCenterId);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<PaginatedResponsePersonalTransfer<PersonalTransferDto>>(`${this.baseUrl}/personal/paginated/advanced`, {

      headers: this.getHttpHeaders(),
      params: params
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Gets a personal Transfer record by ID
   */
  getPersonalTransferById(personalId: string): Observable<ApiResponsePersonalTransfer<PersonalTransferDto>> {
    return this.http.get<PersonalTransferDto>(`${this.baseUrl}/personal/${encodeURIComponent(personalId)}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return throwError(() => ({
            success: false,
            message: 'Personal Transfer not found'
          }));
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Creates a new personal Transfer record
   */
  createPersonalTransfer(personalTransfer: CreatePersonalTransferDto): Observable<ApiResponsePersonalTransfer<PersonalTransferDto>> {
    return this.http.post<PersonalTransferDto>(`${this.baseUrl}/personal`, personalTransfer, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data,
        message: 'Personal Transfer created successfully'
      })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 409) {
          return throwError(() => ({
            success: false,
            message: 'Personal Transfer with this ID already exists'
          }));
        }
        if (error.status === 400) {
          return throwError(() => ({
            success: false,
            message: 'Validation errors occurred',
            errors: error.error?.errors || ['Bad request']
          }));
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Updates an existing personal Transfer record
   */
  updatePersonalTransfer(
    personalId: string,
    personalTransfer: UpdatePersonalTransferDto
  ): Observable<ApiResponsePersonalTransfer<PersonalTransferDto>> {
    return this.http.put<PersonalTransferDto>(`${this.baseUrl}/personal/${encodeURIComponent(personalId)}`, personalTransfer, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data,
        message: 'Personal Transfer updated successfully'
      })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return throwError(() => ({
            success: false,
            message: 'Personal Transfer not found'
          }));
        }
        if (error.status === 400) {
          return throwError(() => ({
            success: false,
            message: 'Validation errors occurred',
            errors: error.error?.errors || ['Bad request']
          }));
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Deletes a personal Transfer record
   */
  deletePersonalTransfer(personalId: string): Observable<ApiResponsePersonalTransfer<void>> {
    return this.http.delete<void>(`${this.baseUrl}/personal/${encodeURIComponent(personalId)}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(() => ({
        success: true,
        message: 'Personal Transfer deleted successfully'
      })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return throwError(() => ({
            success: false,
            message: 'Personal Transfer not found'
          }));
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Gets personal Transfers by branch ID
   */
  getPersonalTransfersByBranch(branchId: string): Observable<ApiResponsePersonalTransfer<PersonalTransferDto[]>> {
    return this.http.get<PersonalTransferDto[]>(`${this.baseUrl}/personal/branch/${encodeURIComponent(branchId)}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Gets personal Transfers by area ID
   */
  getPersonalTransfersByArea(areaId: string): Observable<ApiResponsePersonalTransfer<PersonalTransferDto[]>> {
    return this.http.get<PersonalTransferDto[]>(`${this.baseUrl}/personal/area/${encodeURIComponent(areaId)}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Gets personal Transfers by cost center ID
   */
  getPersonalTransfersByCostCenter(costCenterId: string): Observable<ApiResponsePersonalTransfer<PersonalTransferDto[]>> {
    return this.http.get<PersonalTransferDto[]>(`${this.baseUrl}/personal/costcenter/${encodeURIComponent(costCenterId)}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => ({
        success: true,
        data
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Gets active personal Transfer records
   */
  getActivePersonalTransfers(): Observable<ApiResponsePersonalTransfer<PersonalTransferDto[]>> {
    return this.getPersonalTransfersPaginated(1, 1000, undefined, undefined, undefined, undefined, true).pipe(
      map(response => ({
        success: response.success,
        data: response.data?.data || [],
        message: response.message
      }))
    );
  }

  /**
   * Gets inactive personal Transfer records
   */
  getInactivePersonalTransfers(): Observable<ApiResponsePersonalTransfer<PersonalTransferDto[]>> {
    return this.getPersonalTransfersPaginated(1, 1000, undefined, undefined, undefined, undefined, false).pipe(
      map(response => ({
        success: response.success,
        data: response.data?.data || [],
        message: response.message
      }))
    );
  }

  /**
   * Search personal transfers by name or ID
   */
  searchPersonalTransfers(
    searchTerm: string, 
    pageNumber: number = 1, 
    pageSize: number = 20
  ): Observable<ApiResponsePersonalTransfer<PaginatedResponsePersonalTransfer<PersonalTransferDto>>> {

    return this.getPersonalTransfersPaginated(pageNumber, pageSize, searchTerm);
  }

  /**
   * Gets personal statistics summary
   */
  getPersonalStatistics(): Observable<ApiResponsePersonalTransfer<{
    totalCount: number;
    activeCount: number;
    inactiveCount: number;
    branchCounts: { [branchId: string]: number };
    areaCounts: { [areaId: string]: number };
  }>> {
    // This would require a new endpoint in your controller for statistics
    // For now, we'll simulate it by getting paginated data
    return this.getPersonalTransfersPaginated(1, 1).pipe(
      map(response => ({
        success: true,
        data: {
          totalCount: response.data?.totalCount || 0,
          activeCount: 0, // Would need separate endpoint
          inactiveCount: 0, // Would need separate endpoint
          branchCounts: {},
          areaCounts: {}
        }
      }))
    );
  }

  /**
   * Validates a personal Transfer before sending to API
   */
  validatePersonalTransfer(personalTransfer: CreatePersonalTransferDto | UpdatePersonalTransferDto): string[] {
    const errors: string[] = [];

    if ('personalId' in personalTransfer) {
      if (!personalTransfer.personalId?.trim()) {
        errors.push('Personal ID is required');
      } else if (personalTransfer.personalId.length > 30) {
        errors.push('Personal ID cannot exceed 30 characters');
      }
    }

    if ('fullName' in personalTransfer && personalTransfer.fullName) {
      if (personalTransfer.fullName.length > 200) {
        errors.push('Full name cannot exceed 200 characters');
      }
    }

    if ('branchId' in personalTransfer && personalTransfer.branchId) {
      if (personalTransfer.branchId.length > 30) {
        errors.push('Branch ID cannot exceed 30 characters');
      }
    }

    if ('branchDescription' in personalTransfer && personalTransfer.branchDescription) {
      if (personalTransfer.branchDescription.length > 100) {
        errors.push('Branch description cannot exceed 100 characters');
      }
    }

    if ('areaId' in personalTransfer && personalTransfer.areaId) {
      if (personalTransfer.areaId.length > 30) {
        errors.push('Area ID cannot exceed 30 characters');
      }
    }

    if ('areaDescription' in personalTransfer && personalTransfer.areaDescription) {
      if (personalTransfer.areaDescription.length > 100) {
        errors.push('Area description cannot exceed 100 characters');
      }
    }

    if ('costCenterId' in personalTransfer && personalTransfer.costCenterId) {
      if (personalTransfer.costCenterId.length > 30) {
        errors.push('Cost center ID cannot exceed 30 characters');
      }
    }

    if ('costCenterDescription' in personalTransfer && personalTransfer.costCenterDescription) {
      if (personalTransfer.costCenterDescription.length > 100) {
        errors.push('Cost center description cannot exceed 100 characters');
      }
    }

    if ('startDate' in personalTransfer && personalTransfer.startDate) {
      if (!this.isValidDate(personalTransfer.startDate)) {
        errors.push('Start date must be a valid date');
      }
    }

    if ('endDate' in personalTransfer && personalTransfer.endDate) {
      if (!this.isValidDate(personalTransfer.endDate)) {
        errors.push('End date must be a valid date');
      }
    }

    if ('createdBy' in personalTransfer) {
      if (!personalTransfer.createdBy?.trim()) {
        errors.push('Created by is required');
      } else if (personalTransfer.createdBy.length > 30) {
        errors.push('Created by cannot exceed 30 characters');
      }
    }

    if ('updatedBy' in personalTransfer) {
      if (!personalTransfer.updatedBy?.trim()) {
        errors.push('Updated by is required');
      } else if (personalTransfer.updatedBy.length > 30) {
        errors.push('Updated by cannot exceed 30 characters');
      }
    }

    return errors;
  }

  /**
   * Helper method to validate date strings
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Helper method to format date for API
   */
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  /**
   * Helper method to format datetime for API
   */
  formatDateTimeForApi(date: Date): string {
    return date.toISOString(); // Returns full ISO datetime string
  }

  /**
   * Helper method to get sort options for UI
   */
  getSortOptions(): { value: string; label: string; }[] {
    return [
      { value: 'PersonalId', label: 'Personal ID' },
      { value: 'FullName', label: 'Full Name' },
      { value: 'BranchId', label: 'Branch' },
      { value: 'AreaId', label: 'Area' },
      { value: 'StartDate', label: 'Start Date' },
      { value: 'CreatedAt', label: 'Created Date' }
    ];
  }
}