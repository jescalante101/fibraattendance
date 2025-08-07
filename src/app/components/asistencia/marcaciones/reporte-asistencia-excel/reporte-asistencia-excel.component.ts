import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AttendanceMatrixReportService } from '../../../../core/services/report/attendance-matrix-report.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { ReportMatrixResponse, ReportMatrixResponseData } from '../../../../core/models/report/report-matrix-response.model';
import { ReportMatrixParams } from '../../../../core/models/report/report-matrix-params.model';

interface MarcacionParseada {
  hora: string;
  dispositivo: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'BREAK_ENTRADA' | 'BREAK_SALIDA';
}

interface RegistroMarcacion {
  nroDoc: string;
  colaborador: string;
  sede: string;
  area: string;
  cargo: string;
  ccCodigo: string;
  fechaIngreso: string;
  fecha: string;
  diaSemanaEs: string;
  marcacionIngreso: string;
  marcacionSalida: string;
  marcacionesRaw: string; // Nueva propiedad para mostrar el dato crudo
  // Datos originales completos
  datosOriginales: ReportMatrixResponseData;
}

@Component({
  selector: 'app-reporte-asistencia-excel',
  templateUrl: './reporte-asistencia-excel.component.html',
  styleUrls: ['./reporte-asistencia-excel.component.css']
})
export class ReporteAsistenciaExcelComponent implements OnInit, OnDestroy {
  
  // Formulario de filtros
  filterForm!: FormGroup;
  
  // Datos principales
  registros: RegistroMarcacion[] = [];
  loading = false;
  
  // Paginación
  totalCount = 0;
  page = 1;
  pageSize = 20;
  
  // Configuración del header
  private headerConfig: HeaderConfig | null = null;
  private headerSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private attendanceMatrixService: AttendanceMatrixReportService,
    private headerConfigService: HeaderConfigService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Suscribirse a cambios en la configuración del header
    this.headerSubscription = this.headerConfigService.headerConfig$.subscribe(config => {
      this.headerConfig = config;
      // Solo almacenar la config, no cargar automáticamente
      console.log('🔧 Header config recibida:', config);
    });
  }

  ngOnDestroy(): void {
    if (this.headerSubscription) {
      this.headerSubscription.unsubscribe();
    }
  }

  private initializeForm(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filterForm = this.fb.group({
      fechaInicio: [firstDay.toISOString().split('T')[0], Validators.required],
      fechaFin: [today.toISOString().split('T')[0], Validators.required],
      employeeId: [''],
      areaId: [''],
      sedeId: [''],
      cargoId: [''],
      centroCostoId: ['']
    });
  }

  loadData(): void {
    if (!this.headerConfig || !this.filterForm.valid) {
      return;
    }

    this.loading = true;
    
    const params: ReportMatrixParams = {
      fechaInicio: this.filterForm.get('fechaInicio')?.value,
      fechaFin: this.filterForm.get('fechaFin')?.value,
      employeeId: this.filterForm.get('employeeId')?.value || '',
      companiaId: this.headerConfig.selectedEmpresa?.companiaId || '',
      areaId: this.filterForm.get('areaId')?.value || '',
      sedeId: this.filterForm.get('sedeId')?.value || '',
      cargoId: this.filterForm.get('cargoId')?.value || '',
      centroCostoId: this.filterForm.get('centroCostoId')?.value || '',
      sedeCodigo: '',
      ccCodigo: '',
      planillaId: this.headerConfig.selectedPlanilla?.planillaId || '',
      pageNumber: this.page,
      pageSize: this.pageSize
    };

    console.log('🚀 Llamando al servicio con params:', params);
    
    this.attendanceMatrixService.getAttendanceMatrixReport(params).subscribe({
      next: (response: ReportMatrixResponse) => {
        console.log('📡 Respuesta recibida:', response);
        if (response.success && response.data) {
          this.processData(response.data);
          this.totalCount = response.totalRecords || 0;
          console.log('✅ Total de registros:', this.totalCount);
          console.log('✅ Registros procesados:', this.registros.length);
        } else {
          console.error('❌ Error en respuesta:', response.message);
          this.registros = [];
        }
        this.loading = false;
        console.log('📊 Estado final: loading=', this.loading, 'registros.length=', this.registros.length);
      },
      error: (error) => {
        console.error('❌ Error cargando datos:', error);
        this.registros = [];
        this.loading = false;
        console.log('📊 Estado final (error): loading=', this.loading, 'registros.length=', this.registros.length);
      }
    });
  }

  private convertDdMmYyyyToYyyyMmDd(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString; // Return original if format is not as expected
  }

  private processData(data: ReportMatrixResponseData[]): void {
    // Mapeo directo sin procesamiento complejo
    this.registros = data.map(item => {
      return {
        nroDoc: item.nroDoc,
        colaborador: item.colaborador,
        sede: item.sede,
        area: item.area,
        cargo: item.cargo,
        ccCodigo: item.ccCodigo,
        fechaIngreso: this.convertDdMmYyyyToYyyyMmDd(item.fechaIngreso),
        fecha: this.convertDdMmYyyyToYyyyMmDd(item.fecha),
        diaSemanaEs: item.diaSemanaEs,
        marcacionIngreso: '', // Se vacía para la prueba
        marcacionSalida: '', // Se vacía para la prueba
        marcacionesRaw: item.marcacionesDelDia || '', // Asignar el valor crudo
        datosOriginales: item
      };
    });

    console.log('✅ Datos mapeados directamente:', this.registros.length);
  }

  private parseMarcacionesDelDia(marcacionesString: string): MarcacionParseada[] {
    if (!marcacionesString || marcacionesString.trim() === '') {
      return [];
    }

    const marcaciones: MarcacionParseada[] = [];
    const marcacionesArray = marcacionesString.split('|');

    marcacionesArray.forEach(marcacion => {
      const match = marcacion.match(/^(\d{2}:\d{2})\(([^-]+)\s*-\s*([^)]+)\)$/);
      if (match) {
        const [, hora, dispositivo, tipoRaw] = match;
        const tipo = this.determinarTipoMarcacion(tipoRaw.trim());
        
        marcaciones.push({
          hora: hora,
          dispositivo: dispositivo.trim(),
          tipo: tipo
        });
      }
    });

    return marcaciones.sort((a, b) => a.hora.localeCompare(b.hora));
  }

  private determinarTipoMarcacion(tipoRaw: string): 'ENTRADA' | 'SALIDA' | 'BREAK_ENTRADA' | 'BREAK_SALIDA' {
    const tipoLower = tipoRaw.toLowerCase();
    
    if (tipoLower.includes('ing') || tipoLower.includes('entrada')) {
      return 'ENTRADA';
    } else if (tipoLower.includes('sal') || tipoLower.includes('salida')) {
      return 'SALIDA';
    } else if (tipoLower.includes('break') && tipoLower.includes('ing')) {
      return 'BREAK_ENTRADA';
    } else if (tipoLower.includes('break') && tipoLower.includes('sal')) {
      return 'BREAK_SALIDA';
    }
    
    // Por defecto, asumimos entrada para el primer registro y salida para el último
    return 'ENTRADA';
  }

  onFilter(): void {
    this.page = 1;
    this.loadData();
  }

  onPageChange(event: any): void {
    console.log('📄 Página cambiada:', event);
    this.page = event.pageNumber || event;
    this.pageSize = event.pageSize || this.pageSize;
    this.loadData();
  }

  trackByRegistro(index: number, registro: RegistroMarcacion): string {
    return `${registro.nroDoc}-${registro.fecha}`;
  }
}