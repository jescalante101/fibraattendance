# DateRangePickerComponent

Componente reutilizable para selección de rangos de fechas basado en Flatpickr, con soporte completo para Angular Reactive Forms.

## Características

- ✅ Integración completa con Angular Reactive Forms (ControlValueAccessor)
- ✅ Múltiples tamaños y temas
- ✅ Localización en español
- ✅ Validación visual automática
- ✅ Iconos personalizables (Lucide)
- ✅ Eventos granulares
- ✅ TypeScript tipado

## Uso Básico

### Forma Simple (Event Binding)

```html
<app-date-range-picker
  placeholder="Seleccionar rango de fechas..."
  [required]="true"
  (dateRangeChange)="onDateRangeSelected($event)">
</app-date-range-picker>
```

```typescript
onDateRangeSelected(dateRange: DateRange): void {
  console.log('Start:', dateRange.start); // "2025-08-18"
  console.log('End:', dateRange.end);     // "2025-08-20"
}
```

### Con Reactive Forms

```html
<form [formGroup]="myForm">
  <app-date-range-picker
    formControlName="dateRange"
    placeholder="Seleccionar período..."
    [required]="true"
    size="md"
    theme="fiori">
  </app-date-range-picker>
</form>
```

```typescript
export class MyComponent {
  myForm = this.fb.group({
    dateRange: [null, Validators.required]
  });

  constructor(private fb: FormBuilder) {}

  onSubmit(): void {
    const dateRange = this.myForm.get('dateRange')?.value;
    console.log('Selected range:', dateRange);
    // { start: "2025-08-18", end: "2025-08-20" }
  }
}
```

## Propiedades de Entrada (Inputs)

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `placeholder` | `string` | `'Seleccionar rango de fechas...'` | Texto placeholder |
| `required` | `boolean` | `false` | Si el campo es requerido |
| `disabled` | `boolean` | `false` | Si el campo está deshabilitado |
| `minDate` | `Date` | `undefined` | Fecha mínima seleccionable |
| `maxDate` | `Date` | `undefined` | Fecha máxima seleccionable |
| `dateFormat` | `string` | `'Y-m-d'` | Formato interno de fecha |
| `altFormat` | `string` | `'d/m/Y'` | Formato de visualización |
| `showIcon` | `boolean` | `true` | Mostrar icono |
| `iconName` | `string` | `'calendar'` | Nombre del icono Lucide |
| `errorClass` | `string` | `'border-red-500'` | Clase CSS para estado de error |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Tamaño del componente |
| `theme` | `'default' \| 'fiori'` | `'default'` | Tema visual |

## Eventos de Salida (Outputs)

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `dateRangeChange` | `EventEmitter<DateRange>` | Emite cuando cambia el rango |
| `dateSelected` | `EventEmitter<Date[]>` | Emite las fechas raw seleccionadas |
| `pickerOpen` | `EventEmitter<void>` | Emite cuando se abre el picker |
| `pickerClose` | `EventEmitter<void>` | Emite cuando se cierra el picker |

## Interfaz DateRange

```typescript
export interface DateRange {
  start: string; // Formato: "YYYY-MM-DD"
  end: string;   // Formato: "YYYY-MM-DD"
}
```

## Ejemplos Avanzados

### Con Validaciones Personalizadas

```html
<app-date-range-picker
  formControlName="reportPeriod"
  [required]="true"
  [minDate]="minAllowedDate"
  [maxDate]="maxAllowedDate"
  placeholder="Período del reporte..."
  size="lg"
  theme="fiori"
  (dateRangeChange)="validateDateRange($event)">
</app-date-range-picker>

<div *ngIf="myForm.get('reportPeriod')?.errors?.['invalidRange']" 
     class="text-red-500 text-sm mt-1">
  El rango no puede ser mayor a 31 días
</div>
```

```typescript
validateDateRange(dateRange: DateRange): void {
  if (dateRange.start && dateRange.end) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 31) {
      this.myForm.get('reportPeriod')?.setErrors({ invalidRange: true });
    } else {
      this.myForm.get('reportPeriod')?.setErrors(null);
    }
  }
}
```

### Múltiples Instancias

```html
<!-- Período de reportes -->
<div class="mb-4">
  <label class="block text-sm font-medium mb-2">Período de Análisis</label>
  <app-date-range-picker
    formControlName="analysisPeriod"
    placeholder="Seleccionar período de análisis..."
    size="md"
    iconName="bar-chart-3">
  </app-date-range-picker>
</div>

<!-- Período de comparación -->
<div class="mb-4">
  <label class="block text-sm font-medium mb-2">Período de Comparación</label>
  <app-date-range-picker
    formControlName="comparisonPeriod"
    placeholder="Seleccionar período de comparación..."
    size="md"
    iconName="trending-up"
    theme="fiori">
  </app-date-range-picker>
</div>
```

## Personalización de Estilos

### Temas Disponibles

#### Default Theme
```html
<app-date-range-picker theme="default">
</app-date-range-picker>
```

#### Fiori Theme
```html
<app-date-range-picker theme="fiori">
</app-date-range-picker>
```

### Clases CSS Personalizadas

```css
/* Personalizar el calendario */
::ng-deep .flatpickr-calendar {
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Personalizar días seleccionados */
::ng-deep .flatpickr-day.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## Integración con otros Componentes

### Con AG-Grid Filters

```typescript
// Usar en ag-Grid como filtro de rango de fechas
const columnDefs = [
  {
    headerName: 'Fecha',
    field: 'date',
    filter: 'agDateColumnFilter',
    filterParams: {
      // Integrar con DateRangePickerComponent
      customFilterComponent: DateRangeFilterComponent
    }
  }
];
```

### Con Modal de Reportes

```html
<div class="modal-body">
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label>Tipo de Reporte</label>
      <select formControlName="reportType">
        <option value="attendance">Asistencia</option>
        <option value="performance">Rendimiento</option>
      </select>
    </div>
    
    <div>
      <label>Período</label>
      <app-date-range-picker
        formControlName="period"
        [required]="true"
        size="sm">
      </app-date-range-picker>
    </div>
  </div>
</div>
```

## Troubleshooting

### El componente no se muestra
- Verificar que `SharedModule` esté importado en el módulo
- Verificar que `FlatpickrModule` esté importado correctamente

### Las fechas no se validan
- Verificar que el FormControl esté configurado correctamente
- Verificar que `[required]="true"` esté establecido si es necesario

### Problemas de estilo
- Verificar que Tailwind CSS esté configurado
- Verificar que Lucide Angular esté instalado e importado

## Dependencias

- `angularx-flatpickr: ^8.1.0`
- `flatpickr: ^4.6.13`
- `lucide-angular: ^0.534.0`
- `@angular/forms` (para ControlValueAccessor)