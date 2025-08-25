# 📊 API Documentation - Reporte de Horas Extras

## 🎯 Base URL
```
/api/ExtraHoursReport
```



---

## 📋 Endpoints Disponibles

### 1. 📈 **Obtener Datos del Reporte** 
**`POST /api/ExtraHoursReport/data`**

Retorna los datos del reporte en formato JSON para mostrar en tablas o grillas.

#### Request Body:
```typescript
interface ReportFiltersHE {
  startDate: string;      // Formato: "2025-07-21"
  endDate: string;        // Formato: "2025-08-15"
  companyId: string;      // ID de la compañía (obligatorio)
  employeeIds?: string;   // IDs separados por coma: "123,456,789" (opcional)
  areaId?: string;        // ID del área (opcional)
  sedeId?: string;        // ID de la sede (opcional)
}
```

#### Response:
```typescript
interface ExtraHoursReportResult {
  success: boolean;
  message: string;
  data: ReporteAsistenciaSemanalDto[];
}

interface ReporteAsistenciaSemanalDto {
  nro_Doc: string;
  colaborador: string;
  area: string;
  sede: string;
  cargo: string;
  fechaIngreso?: string;    // Formato: "2023-01-15"
  asistenciaPorDia: { [fecha: string]: AsistenciaDiaReporteDto };
  totalHorasNormales: number;
  totalHorasExtras1: number;
  totalHorasExtras2: number;
}

interface AsistenciaDiaReporteDto {
  horaEntrada: string;      // "07:30" o "FALTA"
  horaSalida: string;       // "18:45" o "FALTA"
  horasNormales: number;    // 8.5
  horasExtras1: number;     // 2.5 (H.E 25%)
  horasExtras2: number;     // 1.0 (H.E 35%)
  estado: string;           // "PRESENTE", "FALTA", "VACACIONES"
}
```

#### Angular TypeScript Example:
```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class ExtraHoursReportService {
  private baseUrl = '/api/ExtraHoursReport';

  constructor(private http: HttpClient) {}

  getReportData(filters: ReportFiltersHE): Observable<ExtraHoursReportResult> {
    return this.http.post<ExtraHoursReportResult>(
      `${this.baseUrl}/data`, 
      filters
    );
  }
}

// Uso en componente:
const filters: ReportFiltersHE = {
  startDate: '2025-07-21',
  endDate: '2025-08-15',
  companyId: 'COMP001',
  employeeIds: '123,456,789', // opcional
  areaId: 'AREA001',          // opcional
  sedeId: 'SEDE001'           // opcional
};

this.extraHoursService.getReportData(filters).subscribe({
  next: (response) => {
    if (response.success) {
      console.log('Datos:', response.data);
      // Procesar datos para mostrar en tabla
      this.processReportData(response.data);
    } else {
      console.error('Error:', response.message);
    }
  },
  error: (error) => console.error('Error HTTP:', error)
});
```

---

### 2. 📥 **Descargar Excel**
**`POST /api/ExtraHoursReport/export`**

Descarga el reporte en formato Excel con formato completo y colores.

#### Request Body:
```typescript
// Mismo interface ReportFiltersHE que arriba
```

#### Response:
```typescript
// Archivo Excel (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
// Nombre: "Reporte_Horas_Extras_20250721_20250815_143022.xlsx"
```

#### Angular TypeScript Example:
```typescript
downloadExcel(filters: ReportFiltersHE): Observable<Blob> {
  return this.http.post(`${this.baseUrl}/export`, filters, {
    responseType: 'blob'
  });
}

// Uso en componente:
downloadReport() {
  const filters: ReportFiltersHE = {
    startDate: this.form.value.startDate,
    endDate: this.form.value.endDate,
    companyId: this.form.value.companyId
  };

  this.extraHoursService.downloadExcel(filters).subscribe({
    next: (blob) => {
      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Horas_Extras_${new Date().getTime()}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    error: (error) => console.error('Error al descargar:', error)
  });
}
```

---

### 3. 📊 **Resumen Ejecutivo**
**`POST /api/ExtraHoursReport/summary`**

Obtiene un resumen con totales generales del período.

#### Request Body:
```typescript
// Mismo interface ReportFiltersHE que arriba
```

#### Response:
```typescript
interface SummaryResponse {
  success: boolean;
  data: {
    totalEmpleados: number;
    totalHorasNormales: number;
    totalHorasExtras25: number;
    totalHorasExtras35: number;
    fechaGeneracion: string;
    periodoReporte: {
      fechaInicio: string;
      fechaFin: string;
      totalDias: number;
    };
  };
}
```

#### Angular TypeScript Example:
```typescript
getSummary(filters: ReportFiltersHE): Observable<SummaryResponse> {
  return this.http.post<SummaryResponse>(`${this.baseUrl}/summary`, filters);
}

// Uso:
this.extraHoursService.getSummary(filters).subscribe({
  next: (response) => {
    if (response.success) {
      this.summary = response.data;
      console.log(`Total empleados: ${this.summary.totalEmpleados}`);
      console.log(`Horas normales: ${this.summary.totalHorasNormales}`);
    }
  }
});
```

---

## 🔧 **Endpoints de Filtros** (Auxiliares)

### 4. **Obtener Compañías**
**`GET /api/ExtraHoursReport/filters/companies`**

### 5. **Obtener Áreas por Compañía**
**`GET /api/ExtraHoursReport/filters/areas/{companyId}`**

### 6. **Obtener Sedes por Compañía**
**`GET /api/ExtraHoursReport/filters/sites/{companyId}`**

---

## ⚠️ **Validaciones y Errores**

### Validaciones del Backend:
- ✅ `endDate >= startDate`
- ✅ Rango máximo: **62 días**
- ✅ `companyId` es obligatorio

### Errores Comunes:
```typescript
// Error 400 - Validación
{
  "message": "La fecha fin debe ser mayor o igual a la fecha inicio"
}

// Error 400 - Rango
{
  "message": "El rango de fechas no puede ser mayor a 62 días"
}

// Error 500 - Server Error
{
  "message": "Error interno del servidor al obtener datos del reporte de horas extras",
  "details": "Detalles del error..."
}
```

---

## 🎨 **Procesamiento de Datos para UI**

### Ejemplo de procesamiento para tabla:
```typescript
processReportData(data: ReporteAsistenciaSemanalDto[]) {
  this.tableData = data.map(employee => {
    const processedEmployee = {
      nroDoc: employee.nro_Doc,
      nombre: employee.colaborador,
      area: employee.area,
      sede: employee.sede,
      cargo: employee.cargo,
      fechaIngreso: employee.fechaIngreso,
      days: {},
      totales: {
        horasNormales: employee.totalHorasNormales,
        horasExtras1: employee.totalHorasExtras1,
        horasExtras2: employee.totalHorasExtras2
      }
    };

    // Procesar días
    Object.keys(employee.asistenciaPorDia).forEach(fecha => {
      const dayData = employee.asistenciaPorDia[fecha];
      processedEmployee.days[fecha] = {
        entrada: dayData.horaEntrada,
        salida: dayData.horaSalida,
        horasNormales: dayData.horasNormales,
        horasExtras1: dayData.horasExtras1,
        horasExtras2: dayData.horasExtras2,
        estado: dayData.estado,
        // Para aplicar clases CSS según estado
        cssClass: this.getStatusClass(dayData.estado)
      };
    });

    return processedEmployee;
  });
}

getStatusClass(estado: string): string {
  switch (estado) {
    case 'FALTA': return 'status-absent';
    case 'VACACIONES': return 'status-vacation';
    case 'PRESENTE': return 'status-present';
    default: return '';
  }
}
```

### CSS para estados:
```css
.status-present { background-color: #d4edda; } /* Verde claro */
.status-absent { background-color: #f8d7da; }  /* Rosa claro */
.status-vacation { background-color: #fff3cd; } /* Amarillo claro */

.hours-normal { background-color: #cce5ff; }    /* Azul claro */
.hours-extra1 { background-color: #ffe6cc; }    /* Naranja claro */
.hours-extra2 { background-color: #ffb3d9; }    /* Rosa claro */
```

---

## 🚀 **Ejemplo Completo de Servicio Angular**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExtraHoursReportService {
  private readonly baseUrl = '/api/ExtraHoursReport';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getReportData(filters: ReportFiltersHE): Observable<ExtraHoursReportResult> {
    return this.http.post<ExtraHoursReportResult>(
      `${this.baseUrl}/data`,
      filters,
      { headers: this.getHeaders() }
    );
  }

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

  getSummary(filters: ReportFiltersHE): Observable<SummaryResponse> {
    return this.http.post<SummaryResponse>(
      `${this.baseUrl}/summary`,
      filters,
      { headers: this.getHeaders() }
    );
  }

  getCompanies(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/filters/companies`,
      { headers: this.getHeaders() }
    );
  }

  getAreas(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/filters/areas/${companyId}`,
      { headers: this.getHeaders() }
    );
  }

  getSites(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/filters/sites/${companyId}`,
      { headers: this.getHeaders() }
    );
  }
}
```

---

## ✅ **Lista de Verificación para Frontend**

- [ ] Implementar interfaces TypeScript
- [ ] Crear servicio con HttpClient
- [ ] Validar formularios (fechas, obligatorios)
- [ ] Procesar respuesta para mostrar en tabla
- [ ] Implementar descarga de Excel
- [ ] Aplicar estilos CSS por estado
- [ ] Manejar errores y loading states
- [ ] Implementar filtros auxiliares
- [ ] Testing de endpoints

¡Listo para implementar! 🚀