import { Pipe, PipeTransform } from '@angular/core';
import { EmployeePivotData } from 'src/app/components/asistencia/reportes/reporte-asistencia/reporte-asistencia.component';

@Pipe({
  name: 'weeklyTotal',
  pure: true
})
export class WeeklyTotalPipe implements PipeTransform {

  transform(employee: EmployeePivotData, weekKey: string, type: 'totalHoras' | 'horasExtras'): number {
    if (!employee || !weekKey) return 0;
    
    const weeklyTotal = employee.weeklyTotals[weekKey];
    return weeklyTotal ? weeklyTotal[type] : 0;
  }
}