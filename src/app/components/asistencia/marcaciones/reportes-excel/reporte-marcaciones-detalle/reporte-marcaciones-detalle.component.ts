import { Component, OnInit } from '@angular/core';

interface MarcacionDetalle {
  item: number;
  planilla: string;
  nroDoc: string;
  apellidosNombres: string;
  area: string;
  cargo: string;
  sede: string;
  fechaIngreso: string;
  fechaCese?: string;
  marcacionesPorFecha: { [fecha: string]: MarcacionDia };
}

interface MarcacionDia {
  fecha: string;
  ingreso?: string;
  salida?: string;
  ingresoBreak?: string;
  salidaBreak?: string;
  horasReales?: number;
  horasEsperadas?: number;
  diferencia?: number;
  estado: 'PUNTUAL' | 'TARDANZA' | 'FALTA' | 'INCOMPLETO';
  observaciones?: string;
}

@Component({
  selector: 'app-reporte-marcaciones-detalle',
  templateUrl: './reporte-marcaciones-detalle.component.html',
  styleUrls: ['./reporte-marcaciones-detalle.component.css']
})
export class ReporteMarcacionesDetalleComponent implements OnInit {
  
  empleados: MarcacionDetalle[] = [];
  loading = false;
  
  // Configuración de vista
  viewMode: 'detalle' | 'resumen' = 'detalle';
  showBreakTimes = true;
  
  // Filtros
  filterText = '';
  selectedArea = '';
  selectedSede = '';
  selectedEstado = '';
  fechaInicio = '';
  fechaFin = '';
  
  // Datos para filtros
  areas: string[] = [];
  sedes: string[] = [];
  estados: string[] = ['PUNTUAL', 'TARDANZA', 'FALTA', 'INCOMPLETO'];
  
  // Fechas específicas para el reporte
  fechasReporte: string[] = [];
  
  // Estadísticas
  totalEmpleados = 0;
  totalMarcaciones = 0;
  marcacionesPuntuales = 0;
  marcacionesTardanza = 0;
  promedioHorasTrabajadas = 0;

  constructor() { }

  ngOnInit(): void {
    this.initializeFechas();
    this.loadMockData();
    this.generateFilterOptions();
    this.calculateStatistics();
  }

  private initializeFechas(): void {
    // Fechas específicas según el Excel analizado (26 y 27 de mayo 2025)
    this.fechasReporte = ['2025-05-26', '2025-05-27'];
    this.fechaInicio = '2025-05-26';
    this.fechaFin = '2025-05-27';
  }

  private loadMockData(): void {
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
        marcacionesPorFecha: {
          '2025-05-26': {
            fecha: '2025-05-26',
            ingreso: '07:00:00',
            salida: '19:00:00',
            ingresoBreak: '12:00:00',
            salidaBreak: '13:00:00',
            horasReales: 11,
            horasEsperadas: 8,
            diferencia: 3,
            estado: 'PUNTUAL',
            observaciones: 'Horas extras aprobadas'
          },
          '2025-05-27': {
            fecha: '2025-05-27',
            ingreso: '08:00:00',
            salida: '17:00:00',
            horasReales: 8,
            horasEsperadas: 8,
            diferencia: 0,
            estado: 'PUNTUAL'
          }
        }
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
        marcacionesPorFecha: {
          '2025-05-26': {
            fecha: '2025-05-26',
            ingreso: '07:15:00',
            salida: '19:15:00',
            ingresoBreak: '12:30:00',
            salidaBreak: '13:30:00',
            horasReales: 11,
            horasEsperadas: 8,
            diferencia: 3,
            estado: 'TARDANZA',
            observaciones: 'Tardanza 15 min - Horas extras'
          },
          '2025-05-27': {
            fecha: '2025-05-27',
            ingreso: '08:05:00',
            salida: '17:05:00',
            horasReales: 8,
            horasEsperadas: 8,
            diferencia: 0,
            estado: 'TARDANZA',
            observaciones: 'Tardanza 5 min'
          }
        }
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
        marcacionesPorFecha: {
          '2025-05-26': {
            fecha: '2025-05-26',
            estado: 'FALTA',
            observaciones: 'Falta injustificada'
          },
          '2025-05-27': {
            fecha: '2025-05-27',
            ingreso: '07:45:00',
            salida: '16:30:00',
            horasReales: 7.75,
            horasEsperadas: 8,
            diferencia: -0.25,
            estado: 'INCOMPLETO',
            observaciones: 'Salida temprana por cita médica'
          }
        }
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
        marcacionesPorFecha: {
          '2025-05-26': {
            fecha: '2025-05-26',
            ingreso: '08:30:00',
            salida: '17:30:00',
            ingresoBreak: '12:00:00',
            salidaBreak: '13:00:00',
            horasReales: 8,
            horasEsperadas: 8,
            diferencia: 0,
            estado: 'PUNTUAL'
          },
          '2025-05-27': {
            fecha: '2025-05-27',
            ingreso: '08:30:00',
            salida: '17:30:00',
            horasReales: 8,
            horasEsperadas: 8,
            diferencia: 0,
            estado: 'PUNTUAL'
          }
        }
      }
    ];

    // Agregar más empleados mock
    for (let i = 5; i <= 14; i++) {
      this.empleados.push({
        item: i,
        planilla: i % 3 === 0 ? 'OBREROS' : 'EMPLEADOS',
        nroDoc: `${10000000 + i}`,
        apellidosNombres: `EMPLEADO MOCK ${i}, NOMBRE ${i}`,
        area: this.getRandomArea(),
        cargo: this.getRandomCargo(),
        sede: 'SEDE CHILCA 01',
        fechaIngreso: this.getRandomDate(),
        marcacionesPorFecha: this.generateRandomMarcaciones()
      });
    }
  }

  private generateRandomMarcaciones(): { [fecha: string]: MarcacionDia } {
    const marcaciones: { [fecha: string]: MarcacionDia } = {};
    
    this.fechasReporte.forEach(fecha => {
      const random = Math.random();
      
      if (random < 0.1) {
        // 10% faltas
        marcaciones[fecha] = {
          fecha,
          estado: 'FALTA',
          observaciones: 'Falta'
        };
      } else if (random < 0.3) {
        // 20% tardanzas
        const minutosRetraso = Math.floor(Math.random() * 60) + 5;
        const horaBase = new Date(`${fecha}T08:00:00`);
        horaBase.setMinutes(horaBase.getMinutes() + minutosRetraso);
        
        marcaciones[fecha] = {
          fecha,
          ingreso: horaBase.toTimeString().slice(0, 8),
          salida: '17:00:00',
          horasReales: 8,
          horasEsperadas: 8,
          diferencia: 0,
          estado: 'TARDANZA',
          observaciones: `Tardanza ${minutosRetraso} minutos`
        };
      } else {
        // 70% puntuales
        marcaciones[fecha] = {
          fecha,
          ingreso: '08:00:00',
          salida: Math.random() < 0.2 ? '19:00:00' : '17:00:00', // 20% con horas extras
          ingresoBreak: Math.random() < 0.7 ? '12:00:00' : undefined,
          salidaBreak: Math.random() < 0.7 ? '13:00:00' : undefined,
          horasReales: Math.random() < 0.2 ? 11 : 8,
          horasEsperadas: 8,
          diferencia: Math.random() < 0.2 ? 3 : 0,
          estado: 'PUNTUAL'
        };
      }
    });
    
    return marcaciones;
  }

  private getRandomArea(): string {
    const areas = ['MALLA FRUTERA TEJIDA', 'MOLINO', 'EXTRUSORA PLANA', 'ADMINISTRACIÓN', 'MANTENIMIENTO', 'LOGÍSTICA'];
    return areas[Math.floor(Math.random() * areas.length)];
  }

  private getRandomCargo(): string {
    const cargos = ['OPERARIO', 'SUPERVISOR', 'TÉCNICO', 'ASISTENTE', 'ANALISTA'];
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
  }

  private calculateStatistics(): void {
    this.totalEmpleados = this.filteredEmpleados.length;
    
    let totalMarcaciones = 0;
    let puntuales = 0;
    let tardanzas = 0;
    let totalHoras = 0;
    let contadorHoras = 0;
    
    this.filteredEmpleados.forEach(empleado => {
      Object.values(empleado.marcacionesPorFecha).forEach(marcacion => {
        totalMarcaciones++;
        if (marcacion.estado === 'PUNTUAL') puntuales++;
        if (marcacion.estado === 'TARDANZA') tardanzas++;
        if (marcacion.horasReales) {
          totalHoras += marcacion.horasReales;
          contadorHoras++;
        }
      });
    });
    
    this.totalMarcaciones = totalMarcaciones;
    this.marcacionesPuntuales = puntuales;
    this.marcacionesTardanza = tardanzas;
    this.promedioHorasTrabajadas = contadorHoras > 0 ? totalHoras / contadorHoras : 0;
  }

  get filteredEmpleados(): MarcacionDetalle[] {
    return this.empleados.filter(empleado => {
      const matchesText = !this.filterText || 
        empleado.apellidosNombres.toLowerCase().includes(this.filterText.toLowerCase()) ||
        empleado.nroDoc.includes(this.filterText) ||
        empleado.cargo.toLowerCase().includes(this.filterText.toLowerCase());
      
      const matchesArea = !this.selectedArea || empleado.area === this.selectedArea;
      const matchesSede = !this.selectedSede || empleado.sede === this.selectedSede;
      
      const matchesEstado = !this.selectedEstado || 
        Object.values(empleado.marcacionesPorFecha).some(m => m.estado === this.selectedEstado);
      
      return matchesText && matchesArea && matchesSede && matchesEstado;
    });
  }

  getMarcacion(empleado: MarcacionDetalle, fecha: string): MarcacionDia | undefined {
    return empleado.marcacionesPorFecha[fecha];
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'PUNTUAL': return 'bg-green-100 text-green-800';
      case 'TARDANZA': return 'bg-orange-100 text-orange-800';
      case 'FALTA': return 'bg-red-100 text-red-800';
      case 'INCOMPLETO': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatTime(time?: string): string {
    if (!time) return '-';
    return time.slice(0, 5); // HH:MM
  }

  formatDate(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  }

  getDayName(fecha: string): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[new Date(fecha).getDay()];
  }

  clearFilters(): void {
    this.filterText = '';
    this.selectedArea = '';
    this.selectedSede = '';
    this.selectedEstado = '';
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'detalle' ? 'resumen' : 'detalle';
  }

  toggleBreakTimes(): void {
    this.showBreakTimes = !this.showBreakTimes;
  }

  exportToExcel(): void {
    console.log('Exportando reporte marcaciones detalle a Excel...');
  }

  trackByEmpleado(index: number, item: MarcacionDetalle): any {
    return item.nroDoc;
  }
}