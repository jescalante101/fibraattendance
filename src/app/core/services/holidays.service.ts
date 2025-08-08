import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { HolidayYear, SynchronizationResult, HolidayTableRow } from '../models/holiday.model';

@Injectable({
  providedIn: 'root'
})
export class HolidaysService {
  private readonly baseUrl = `${environment.apiUrlPro}api/Ohlds`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los feriados desde la API
   */
  getHolidays(): Observable<HolidayYear[]> {
    return this.http.get<HolidayYear[]>(this.baseUrl).pipe(
      catchError(error => {
        console.error('Error obteniendo holidays:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene un año específico de feriados
   */
  getHolidaysByYear(year: string): Observable<HolidayYear> {
    return this.http.get<HolidayYear>(`${this.baseUrl}/${year}`).pipe(
      catchError(error => {
        console.error(`Error obteniendo holidays del año ${year}:`, error);
        throw error;
      })
    );
  }

  /**
   * Sincroniza los datos desde la API externa
   */
  synchronizeHolidays(useFullReplacement: boolean = true): Observable<SynchronizationResult> {
    const url = `${this.baseUrl}/synchronize?useFullReplacement=${useFullReplacement}`;

    return this.http.post<SynchronizationResult>(url, {}).pipe(
      catchError(error => {
        console.error('Error en sincronización:', error);
        throw error;
      })
    );
  }

  /**
   * Transforma los datos de la API a formato de tabla
   */
  transformToTableData(holidayYears: HolidayYear[]): HolidayTableRow[] {
    const tableData: HolidayTableRow[] = [];
    const currentYear = new Date().getFullYear().toString();

    holidayYears.forEach(yearData => {
      yearData.hld1s.forEach(holiday => {
        const startDate = new Date(holiday.strDate);
        const endDate = new Date(holiday.endDate);

        // Calcular duración en días
        const durationMs = endDate.getTime() - startDate.getTime();
        const duration = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);

        tableData.push({
          year: yearData.hldCode,
          holidayDate: startDate,
          endDate: endDate,
          description: holiday.rmrks,
          dayName: this.getDayName(startDate),
          monthName: this.getMonthName(startDate),
          duration: duration,
          isCurrentYear: yearData.hldCode === currentYear
        });
      });
    });

    // Ordenar por fecha descendente
    return tableData.sort((a, b) => b.holidayDate.getTime() - a.holidayDate.getTime());
  }

  /**
   * Filtra los datos de la tabla según los criterios
   */
  filterTableData(data: HolidayTableRow[], filters: { yearFilter?: string, searchTerm?: string, showCurrentYearOnly?: boolean }): HolidayTableRow[] {
    let filteredData = [...data];

    // Filtrar por año
    if (filters.yearFilter && filters.yearFilter !== 'all') {
      filteredData = filteredData.filter(row => row.year === filters.yearFilter);
    }

    // Filtrar solo año actual
    if (filters.showCurrentYearOnly) {
      filteredData = filteredData.filter(row => row.isCurrentYear);
    }

    // Filtrar por término de búsqueda
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filteredData = filteredData.filter(row =>
        row.description.toLowerCase().includes(searchLower) ||
        row.dayName.toLowerCase().includes(searchLower) ||
        row.monthName.toLowerCase().includes(searchLower)
      );
    }

    return filteredData;
  }

  /**
   * Obtiene los años únicos disponibles
   */
  getAvailableYears(data: HolidayTableRow[]): string[] {
    const years = [...new Set(data.map(row => row.year))];
    return years.sort((a, b) => parseInt(b) - parseInt(a));
  }

  /**
   * Obtiene estadísticas de los feriados
   */
  getHolidayStats(data: HolidayTableRow[]) {
    const currentYear = new Date().getFullYear().toString();
    const currentYearHolidays = data.filter(row => row.isCurrentYear);
    const totalYears = this.getAvailableYears(data).length;

    return {
      totalHolidays: data.length,
      currentYearHolidays: currentYearHolidays.length,
      totalYears: totalYears,
      averagePerYear: Math.round(data.length / totalYears)
    };
  }

  /**
   * Obtiene el nombre del día de la semana en español
   */
  private getDayName(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }

  /**
   * Obtiene el nombre del mes en español
   */
  private getMonthName(date: Date): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  }
}