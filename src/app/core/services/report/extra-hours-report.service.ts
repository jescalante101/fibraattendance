import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ReportFiltersHE,
  ExtraHoursReportResult,
  SummaryResponse,
  CompanyOption,
  AreaOption,
  SedeOption
} from '../../models/report/extra-hours-report.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExtraHoursReportService {
  private readonly baseUrl = environment.apiUrlPro + 'api/ExtraHoursReport';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtiene los datos del reporte de horas extras
   */
  getReportData(filters: ReportFiltersHE): Observable<ExtraHoursReportResult> {
    return this.http.post<ExtraHoursReportResult>(
      `${this.baseUrl}/data`,
      filters,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Descarga el reporte en formato Excel
   */
  downloadExcel(filters: ReportFiltersHE): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/export`,
      filters,
      {
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Obtiene resumen ejecutivo del período
   */
  getSummary(filters: ReportFiltersHE): Observable<SummaryResponse> {
    return this.http.post<SummaryResponse>(
      `${this.baseUrl}/summary`,
      filters,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtiene lista de compañías disponibles
   */
  getCompanies(): Observable<CompanyOption[]> {
    return this.http.get<CompanyOption[]>(
      `${this.baseUrl}/filters/companies`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtiene áreas por compañía
   */
  getAreas(companyId: string): Observable<AreaOption[]> {
    return this.http.get<AreaOption[]>(
      `${this.baseUrl}/filters/areas/${companyId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtiene sedes por compañía
   */
  getSites(companyId: string): Observable<SedeOption[]> {
    return this.http.get<SedeOption[]>(
      `${this.baseUrl}/filters/sites/${companyId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Valida filtros antes del envío
   */
  validateFilters(filters: ReportFiltersHE): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar fechas obligatorias
    if (!filters.startDate) {
      errors.push('La fecha de inicio es obligatoria');
    }
    if (!filters.endDate) {
      errors.push('La fecha de fin es obligatoria');
    }
    if (!filters.companyId) {
      errors.push('La compañía es obligatoria');
    }

    // Validar rango de fechas
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

      if (endDate < startDate) {
        errors.push('La fecha fin debe ser mayor o igual a la fecha inicio');
      }

      // Validar rango máximo de 62 días
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 62) {
        errors.push('El rango de fechas no puede ser mayor a 62 días');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera nombre para archivo de descarga
   */
  generateFileName(filters: ReportFiltersHE): string {
    const startDate = filters.startDate.replace(/-/g, '');
    const endDate = filters.endDate.replace(/-/g, '');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    
    return `Reporte_Horas_Extras_${startDate}_${endDate}_${timestamp}.xlsx`;
  }

  /**
   * Formatea fechas para mostrar en UI
   */
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  }

  /**
   * Formatea horas decimales a formato HH:mm
   */
  formatHours(hours: number): string {
    if (!hours || hours === 0) return '00:00';
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Calcula porcentaje de asistencia
   */
  calculateAttendancePercentage(totalDays: number, presentDays: number): number {
    if (totalDays === 0) return 0;
    return Math.round((presentDays / totalDays) * 100);
  }
}