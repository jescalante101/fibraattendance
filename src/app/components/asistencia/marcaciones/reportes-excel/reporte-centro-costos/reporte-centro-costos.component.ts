import { Component, OnInit } from '@angular/core';

interface EmpleadoCentroCosto {
  item: number;
  planilla: string;
  nroDoc: string;
  apellidosNombres: string;
  area: string;
  cargo: string;
  sede: string;
  fechaIngreso: string;
  fechaCese?: string;
  datosSemana: { [fecha: string]: number | string };
}

interface SemanaInfo {
  fechaInicio: string;
  fechaFin: string;
  dias: string[];
}

@Component({
  selector: 'app-reporte-centro-costos',
  templateUrl: './reporte-centro-costos.component.html',
  styleUrls: ['./reporte-centro-costos.component.css']
})
export class ReporteCentroCostosComponent implements OnInit {
  
  empleados: EmpleadoCentroCosto[] = [];
  loading = false;
  
  // Configuración de vista
  viewMode: 'semanal' | 'mensual' = 'semanal';
  
  // Filtros
  filterText = '';
  selectedArea = '';
  selectedSede = '';
  selectedPlanilla = '';
  fechaInicio = '';
  fechaFin = '';
  
  // Datos para filtros
  areas: string[] = [];
  sedes: string[] = [];
  planillas: string[] = [];
  
  // Información de semanas
  semanasInfo: SemanaInfo[] = [];
  
  // Estadísticas
  totalEmpleados = 0;
  totalHorasTrabajadas = 0;
  promedioHorasPorEmpleado = 0;

  constructor() { }

  ngOnInit(): void {
    this.loadMockData();
    this.generateFilterOptions();
    this.generateSemanasInfo();
    this.calculateStatistics();
  }

  private loadMockData(): void {
    const fechas = this.generateDateRange();
    
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
        datosSemana: this.generateWeeklyData(fechas)
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
        datosSemana: this.generateWeeklyData(fechas)
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
        datosSemana: this.generateWeeklyData(fechas)
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
        datosSemana: this.generateWeeklyData(fechas)
      },
      {
        item: 5,
        planilla: 'EMPLEADOS',
        nroDoc: '99887766',
        apellidosNombres: 'MORALES SILVA, CARLOS ALBERTO',
        area: 'MANTENIMIENTO',
        cargo: 'TÉCNICO',
        sede: 'SEDE CHILCA 01',
        fechaIngreso: '2018-11-12',
        datosSemana: this.generateWeeklyData(fechas)
      }
    ];

    // Agregar más empleados mock
    for (let i = 6; i <= 28; i++) {
      this.empleados.push({
        item: i,
        planilla: i % 3 === 0 ? 'OBREROS' : 'EMPLEADOS',
        nroDoc: `${10000000 + i}`,
        apellidosNombres: `EMPLEADO MOCK ${i}, NOMBRE ${i}`,
        area: this.getRandomArea(),
        cargo: this.getRandomCargo(),
        sede: 'SEDE CHILCA 01',
        fechaIngreso: this.getRandomDate(),
        datosSemana: this.generateWeeklyData(fechas)
      });
    }
  }

  private generateDateRange(): string[] {
    const fechas: string[] = [];
    const startDate = new Date('2025-06-23');
    const endDate = new Date('2025-07-31');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Solo días laborables (lunes a viernes)
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        fechas.push(d.toISOString().split('T')[0]);
      }
    }
    
    return fechas;
  }

  private generateWeeklyData(fechas: string[]): { [fecha: string]: number | string } {
    const datos: { [fecha: string]: number | string } = {};
    
    fechas.forEach(fecha => {
      // Simular horas trabajadas (8 horas normales, algunas variaciones)
      const random = Math.random();
      if (random < 0.05) {
        datos[fecha] = 'FALTA'; // 5% faltas
      } else if (random < 0.1) {
        datos[fecha] = 4; // 5% medio día
      } else if (random < 0.2) {
        datos[fecha] = Math.floor(Math.random() * 3) + 9; // 10% extras
      } else {
        datos[fecha] = 8; // 80% días normales
      }
    });
    
    return datos;
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

  private generateSemanasInfo(): void {
    // Simplificado: generar info de semanas basado en el rango de fechas
    this.semanasInfo = [
      {
        fechaInicio: '2025-06-23',
        fechaFin: '2025-06-27',
        dias: ['2025-06-23', '2025-06-24', '2025-06-25', '2025-06-26', '2025-06-27']
      },
      {
        fechaInicio: '2025-06-30',
        fechaFin: '2025-07-04',
        dias: ['2025-06-30', '2025-07-01', '2025-07-02', '2025-07-03', '2025-07-04']
      },
      {
        fechaInicio: '2025-07-07',
        fechaFin: '2025-07-11',
        dias: ['2025-07-07', '2025-07-08', '2025-07-09', '2025-07-10', '2025-07-11']
      },
      {
        fechaInicio: '2025-07-14',
        fechaFin: '2025-07-18',
        dias: ['2025-07-14', '2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18']
      },
      {
        fechaInicio: '2025-07-21',
        fechaFin: '2025-07-25',
        dias: ['2025-07-21', '2025-07-22', '2025-07-23', '2025-07-24', '2025-07-25']
      },
      {
        fechaInicio: '2025-07-28',
        fechaFin: '2025-07-31',
        dias: ['2025-07-28', '2025-07-29', '2025-07-30', '2025-07-31']
      }
    ];
  }

  private calculateStatistics(): void {
    this.totalEmpleados = this.filteredEmpleados.length;
    
    let totalHoras = 0;
    this.filteredEmpleados.forEach(empleado => {
      Object.values(empleado.datosSemana).forEach(valor => {
        if (typeof valor === 'number') {
          totalHoras += valor;
        }
      });
    });
    
    this.totalHorasTrabajadas = totalHoras;
    this.promedioHorasPorEmpleado = this.totalEmpleados > 0 ? totalHoras / this.totalEmpleados : 0;
  }

  get filteredEmpleados(): EmpleadoCentroCosto[] {
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

  getAllDates(): string[] {
    const allDates: string[] = [];
    this.semanasInfo.forEach(semana => {
      allDates.push(...semana.dias);
    });
    return allDates;
  }

  getCellValue(empleado: EmpleadoCentroCosto, fecha: string): string {
    const valor = empleado.datosSemana[fecha];
    if (valor === undefined || valor === null) return '-';
    if (typeof valor === 'string') return valor;
    return valor.toString();
  }

  getCellClass(empleado: EmpleadoCentroCosto, fecha: string): string {
    const valor = empleado.datosSemana[fecha];
    if (valor === 'FALTA') return 'bg-red-100 text-red-800';
    if (typeof valor === 'number') {
      if (valor > 8) return 'bg-blue-100 text-blue-800'; // Horas extras
      if (valor < 8) return 'bg-yellow-100 text-yellow-800'; // Medio día
    }
    return 'bg-green-50 text-green-800'; // Día normal
  }

  formatDate(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit'
    });
  }

  getDayName(fecha: string): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[new Date(fecha).getDay()];
  }

  clearFilters(): void {
    this.filterText = '';
    this.selectedArea = '';
    this.selectedSede = '';
    this.selectedPlanilla = '';
    this.fechaInicio = '';
    this.fechaFin = '';
  }

  exportToExcel(): void {
    console.log('Exportando reporte centro de costos a Excel...');
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'semanal' ? 'mensual' : 'semanal';
  }

  trackByEmpleado(index: number, item: EmpleadoCentroCosto): any {
    return item.nroDoc;
  }
}