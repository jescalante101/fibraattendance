import { Pipe, PipeTransform } from '@angular/core';
import { EmployeePivotData, DailyAttendanceData } from 'src/app/components/asistencia/reportes/reporte-asistencia/reporte-asistencia.component';

@Pipe({
  name: 'dayValue',
  pure: true
})
export class DayValuePipe implements PipeTransform {

  transform(employee: EmployeePivotData, date: Date, type: 'entrada' | 'salida'): string {
    if (!employee || !date) return '-';
    
    const dateKey = this.formatDate(date);
    const dayData = employee.dailyData[dateKey];

    if (!dayData) return '-';

    return type === 'entrada' ? dayData.entradaReal : dayData.salidaReal;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}