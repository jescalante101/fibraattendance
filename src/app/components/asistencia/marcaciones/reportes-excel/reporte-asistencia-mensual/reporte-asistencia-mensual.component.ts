import { Component, OnInit } from '@angular/core';

interface EmpleadoAsistenciaMensual {
  item: number;
  planilla: string;
  nroDoc: string;
  apellidosNombres: string;
  area: string;
  cargo: string;
  sede: string;
  fechaIngreso: string;
  fechaCese?: string;
  asistenciaDias: { [fecha: string]: number | string };
}

interface ResumenEmpleado {
  diasTrabajados: number;
  diasFalta: number;
  diasTardanza: number;
  diasPuntuales: number;
  porcentajeAsistencia: number;
}

@Component({
  selector: 'app-reporte-asistencia-mensual',
  templateUrl: './reporte-asistencia-mensual.component.html',
  styleUrls: ['./reporte-asistencia-mensual.component.css']
})
export class ReporteAsistenciaMensualComponent implements OnInit {
  
  empleados: EmpleadoAsistenciaMensual[] = [];
  loading = false;
  
  // Configuración de vista
  showWeekends = false;
  showSummary = true;
  
  // Filtros
  filterText = '';
  selectedArea = '';
  selectedSede = '';
  selectedPlanilla = '';
  mesSeleccionado = '';
  
  // Datos para filtros
  areas: string[] = [];
  sedes: string[] = [];
  planillas: string[] = [];
  mesesDisponibles: { value: string, label: string }[] = [];
  
  // Información de días del mes
  diasDelMes: string[] = [];
  
  // Estadísticas generales
  totalEmpleados = 0;
  porcentajeAsistenciaGeneral = 0;
  totalDiasTrabajados = 0;
  totalFaltas = 0;

  constructor() { }

  ngOnInit(): void {
    this.initializeMeses();
    this.loadMockData();
    this.generateFilterOptions();
    this.generateDiasDelMes();
    this.calculateGeneralStatistics();
  }

  private initializeMeses(): void {
    this.mesesDisponibles = [
      { value: '2025-06', label: 'Junio 2025' },
      { value: '2025-07', label: 'Julio 2025' },
      { value: '2025-08', label: 'Agosto 2025' },
    ];
    this.mesSeleccionado = '2025-07'; // Julio por defecto
  }

  private loadMockData(): void {
    const diasMes = this.generateDaysInMonth();
    
    this.empleados = [
      {
        item: 1,
        planilla: 'EMPLEADOS',
        nroDoc: '12345678',
        apellidosNombres: 'GARCIA RODRIGUEZ, JUAN CARLOS',
        area: 'MALLA FRUTERA TEJIDA',
        cargo: 'OPERARIO',
        sede: 'SEDE CHILCA 01',
        fechaIngreso: '2020-01-15',
        asistenciaDias: this.generateMonthlyAttendance(diasMes)
      },
      {
        item: 2,
        planilla: 'EMPLEADOS',
        nroDoc: '87654321',
        apellidosNombres: 'LOPEZ MARTINEZ, MARIA ELENA',
        area: 'MOLINO',
        cargo: 'SUPERVISOR',
        sede: 'SEDE CHILCA 01',
        fechaIngreso: '2019-03-10',
        asistenciaDias: this.generateMonthlyAttendance(diasMes)
      },
      {
        item: 3,
        planilla: 'OBREROS',
        nroDoc: '11223344',
        apellidosNombres: 'FERNANDEZ CASTRO, PEDRO JOSE',
        area: 'EXTRUSORA PLANA',
        cargo: 'OPERARIO',
        sede: 'SEDE CHILCA 01',
        fechaIngreso: '2021-06-20',
        asistenciaDias: this.generateMonthlyAttendance(diasMes)
      },
      {
        item: 4,
        planilla: 'EMPLEADOS',
        nroDoc: '55667788',
        apellidosNombres: 'RAMIREZ TORRES, ANA LUCIA',
        area: 'ADMINISTRACIÓN',
        cargo: 'ASISTENTE',
        sede: 'SEDE CHILCA 01',
        fechaIngreso: '2020-09-05',
        asistenciaDias: this.generateMonthlyAttendance(diasMes)
      }
    ];

    // Agregar más empleados mock
    for (let i = 5; i <= 29; i++) {
      this.empleados.push({
        item: i,
        planilla: i % 3 === 0 ? 'OBREROS' : 'EMPLEADOS',
        nroDoc: `${10000000 + i}`,
        apellidosNombres: `EMPLEADO MOCK ${i}, NOMBRE ${i}`,
        area: this.getRandomArea(),
        cargo: this.getRandomCargo(),
        sede: 'SEDE CHILCA 01',
        fechaIngreso: this.getRandomDate(),
        asistenciaDias: this.generateMonthlyAttendance(diasMes)
      });
    }
  }

  private generateDaysInMonth(): string[] {
    if (!this.mesSeleccionado) return [];
    
    const [year, month] = this.mesSeleccionado.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: string[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      days.push(date.toISOString().split('T')[0]);
    }
    
    return days;
  }

  private generateMonthlyAttendance(dias: string[]): { [fecha: string]: number | string } {
    const asistencia: { [fecha: string]: number | string } = {};
    
    dias.forEach(fecha => {
      const dayOfWeek = new Date(fecha).getDay();
      
      // Fines de semana
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        asistencia[fecha] = 'D'; // Descanso
        return;
      }
      
      // Días laborables
      const random = Math.random();
      if (random < 0.05) {
        asistencia[fecha] = 'F'; // Falta (5%)
      } else if (random < 0.1) {
        asistencia[fecha] = 'T'; // Tardanza (5%)
      } else if (random < 0.15) {
        asistencia[fecha] = 'V'; // Vacaciones (5%)
      } else if (random < 0.18) {
        asistencia[fecha] = 'DM'; // Descanso médico (3%)
      } else if (random < 0.2) {
        asistencia[fecha] = 'P'; // Permiso (2%)
      } else {
        asistencia[fecha] = 'A'; // Asistió (80%)
      }
    });
    
    return asistencia;
  }

  private getRandomArea(): string {
    const areas = ['MALLA FRUTERA TEJIDA', 'MOLINO', 'EXTRUSORA PLANA', 'ADMINISTRACIÓN', 'MANTENIMIENTO', 'LOGÍSTICA', 'CONTROL DE CALIDAD'];
    return areas[Math.floor(Math.random() * areas.length)];
  }

  private getRandomCargo(): string {
    const cargos = ['OPERARIO', 'SUPERVISOR', 'TÉCNICO', 'ASISTENTE', 'ANALISTA', 'COORDINADOR'];
    return cargos[Math.floor(Math.random() * cargos.length)];
  }

  private getRandomDate(): string {
    const start = new Date('2018-01-01');
    const end = new Date('2023-12-31');
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  }

  private generateFilterOptions(): void {
    this.areas = [...new Set(this.empleados.map(e => e.area))].sort();
    this.sedes = [...new Set(this.empleados.map(e => e.sede))].sort();
    this.planillas = [...new Set(this.empleados.map(e => e.planilla))].sort();
  }

  private generateDiasDelMes(): void {
    this.diasDelMes = this.generateDaysInMonth();
  }

  private calculateGeneralStatistics(): void {
    this.totalEmpleados = this.filteredEmpleados.length;
    
    let totalDias = 0;
    let totalAsistencias = 0;
    let totalFaltas = 0;
    
    this.filteredEmpleados.forEach(empleado => {
      Object.values(empleado.asistenciaDias).forEach(valor => {
        if (valor !== 'D') { // No contar fines de semana
          totalDias++;
          if (valor === 'A') totalAsistencias++;
          if (valor === 'F') totalFaltas++;
        }
      });
    });
    
    this.totalDiasTrabajados = totalAsistencias;
    this.totalFaltas = totalFaltas;
    this.porcentajeAsistenciaGeneral = totalDias > 0 ? (totalAsistencias / totalDias) * 100 : 0;
  }

  get filteredEmpleados(): EmpleadoAsistenciaMensual[] {
    return this.empleados.filter(empleado => {
      const matchesText = !this.filterText || 
        empleado.apellidosNombres.toLowerCase().includes(this.filterText.toLowerCase()) ||
        empleado.nroDoc.includes(this.filterText) ||
        empleado.cargo.toLowerCase().includes(this.filterText.toLowerCase());
      
      const matchesArea = !this.selectedArea || empleado.area === this.selectedArea;
      const matchesSede = !this.selectedSede || empleado.sede === this.selectedSede;
      const matchesPlanilla = !this.selectedPlanilla || empleado.planilla === this.selectedPlanilla;
      
      return matchesText && matchesArea && matchesSede && matchesPlanilla;
    });
  }

  get visibleDias(): string[] {
    return this.showWeekends ? this.diasDelMes : this.diasDelMes.filter(fecha => {
      const dayOfWeek = new Date(fecha).getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }

  getCellValue(empleado: EmpleadoAsistenciaMensual, fecha: string): string {
    const valor = empleado.asistenciaDias[fecha];
    if (valor === undefined || valor === null) return '-';
    return valor.toString();
  }

  getCellClass(empleado: EmpleadoAsistenciaMensual, fecha: string): string {
    const valor = empleado.asistenciaDias[fecha];
    const dayOfWeek = new Date(fecha).getDay();
    
    // Fines de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'bg-gray-100 text-gray-500';
    
    switch (valor) {
      case 'A': return 'bg-green-100 text-green-800'; // Asistió
      case 'F': return 'bg-red-100 text-red-800'; // Falta
      case 'T': return 'bg-orange-100 text-orange-800'; // Tardanza
      case 'V': return 'bg-blue-100 text-blue-800'; // Vacaciones
      case 'DM': return 'bg-purple-100 text-purple-800'; // Descanso médico
      case 'P': return 'bg-yellow-100 text-yellow-800'; // Permiso
      case 'D': return 'bg-gray-100 text-gray-500'; // Descanso
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getResumenEmpleado(empleado: EmpleadoAsistenciaMensual): ResumenEmpleado {
    let diasTrabajados = 0;
    let diasFalta = 0;
    let diasTardanza = 0;
    let diasPuntuales = 0;
    let totalDiasLaborables = 0;
    
    Object.entries(empleado.asistenciaDias).forEach(([fecha, valor]) => {
      const dayOfWeek = new Date(fecha).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Solo días laborables
        totalDiasLaborables++;
        if (valor === 'A') {
          diasTrabajados++;
          diasPuntuales++;
        } else if (valor === 'T') {
          diasTrabajados++;
          diasTardanza++;
        } else if (valor === 'F') {
          diasFalta++;
        }
      }
    });
    
    return {
      diasTrabajados,
      diasFalta,
      diasTardanza,
      diasPuntuales,
      porcentajeAsistencia: totalDiasLaborables > 0 ? (diasTrabajados / totalDiasLaborables) * 100 : 0
    };
  }

  formatDate(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', { 
      day: '2-digit'
    });
  }

  getDayName(fecha: string): string {
    const dias = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return dias[new Date(fecha).getDay()];
  }

  onMesChange(): void {
    this.generateDiasDelMes();
    this.loadMockData(); // Recargar datos para el nuevo mes
    this.calculateGeneralStatistics();
  }

  clearFilters(): void {
    this.filterText = '';
    this.selectedArea = '';
    this.selectedSede = '';
    this.selectedPlanilla = '';
  }

  toggleWeekends(): void {
    this.showWeekends = !this.showWeekends;
  }

  toggleSummary(): void {
    this.showSummary = !this.showSummary;
  }

  exportToExcel(): void {
    console.log('Exportando reporte asistencia mensual a Excel...');
  }

  trackByEmpleado(index: number, item: EmpleadoAsistenciaMensual): any {
    return item.nroDoc;
  }
}