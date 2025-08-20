# Time Picker Component

Un componente reutilizable de selección de tiempo basado en Flatpickr que implementa `ControlValueAccessor` para integrarse perfectamente con Angular Reactive Forms.

## Características

- ✅ **Formato 24 horas** por defecto (configurable)
- ✅ **Soporte de segundos** opcional
- ✅ **Validación integrada** con formularios reactivos
- ✅ **Límites de tiempo** (minTime/maxTime)
- ✅ **Múltiples tamaños** (sm, md, lg)
- ✅ **Temas personalizables** (default, fiori)
- ✅ **Iconos Lucide** integrados
- ✅ **Localización en español**
- ✅ **Estados de error** visuales
- ✅ **Responsive design**

## Uso Básico

### Template
```html
<!-- Uso simple -->
<app-time-picker
  formControlName="horaInicio"
  placeholder="Seleccionar hora de inicio..."
  [required]="true">
</app-time-picker>

<!-- Con configuración avanzada -->
<app-time-picker
  formControlName="horaFin"
  [required]="true"
  [time24hr]="true"
  [enableSeconds]="false"
  minTime="08:00"
  maxTime="18:00"
  defaultTime="09:00"
  size="md"
  theme="fiori"
  placeholder="Hora de finalización..."
  (timeChange)="onTimeChange($event)"
  (timeSelected)="onTimeSelected($event)">
</app-time-picker>
```

### Component TypeScript
```typescript
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export class MiComponente {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      horaInicio: ['', Validators.required],
      horaFin: ['']
    });
  }

  onTimeChange(time: string) {
    console.log('Tiempo seleccionado:', time); // "14:30"
  }

  onTimeSelected(date: Date) {
    console.log('Date objeto:', date);
  }
}
```

## Propiedades de Input

| Propiedad | Tipo | Defecto | Descripción |
|-----------|------|---------|-------------|
| `placeholder` | string | 'Seleccionar hora...' | Texto placeholder |
| `required` | boolean | false | Si el campo es requerido |
| `disabled` | boolean | false | Deshabilitar el componente |
| `minTime` | string | undefined | Tiempo mínimo (formato "HH:mm") |
| `maxTime` | string | undefined | Tiempo máximo (formato "HH:mm") |
| `defaultTime` | string | undefined | Tiempo por defecto (formato "HH:mm") |
| `showIcon` | boolean | true | Mostrar icono de reloj |
| `iconName` | string | 'clock' | Nombre del icono Lucide |
| `size` | 'sm' \| 'md' \| 'lg' | 'sm' | Tamaño del input |
| `theme` | 'default' \| 'fiori' | 'default' | Tema visual |
| `time24hr` | boolean | true | Formato 24 horas |
| `enableSeconds` | boolean | false | Habilitar selección de segundos |

## Eventos de Output

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `timeChange` | string | Emite cuando cambia el tiempo (formato "HH:mm" o "HH:mm:ss") |
| `timeSelected` | Date | Emite el objeto Date cuando se selecciona un tiempo |
| `pickerOpen` | void | Se emite cuando se abre el selector |
| `pickerClose` | void | Se emite cuando se cierra el selector |

## Ejemplos de Uso

### Horario de Trabajo
```html
<div class="grid grid-cols-2 gap-4">
  <div>
    <label class="block text-sm font-medium mb-2">Hora de Inicio</label>
    <app-time-picker
      formControlName="horaInicio"
      [required]="true"
      minTime="06:00"
      maxTime="12:00"
      defaultTime="08:00"
      placeholder="Hora de inicio">
    </app-time-picker>
  </div>
  
  <div>
    <label class="block text-sm font-medium mb-2">Hora de Fin</label>
    <app-time-picker
      formControlName="horaFin"
      [required]="true"
      minTime="12:00"
      maxTime="22:00"
      defaultTime="17:00"
      placeholder="Hora de fin">
    </app-time-picker>
  </div>
</div>
```

### Con Segundos y Tema Fiori
```html
<app-time-picker
  formControlName="tiempoPreciso"
  [enableSeconds]="true"
  theme="fiori"
  size="lg"
  placeholder="Tiempo preciso con segundos...">
</app-time-picker>
```

### Validación de Formulario
```typescript
// En el componente
get horaInicioControl() {
  return this.form.get('horaInicio');
}

// En el template
<app-time-picker
  formControlName="horaInicio"
  [required]="true">
</app-time-picker>

<div *ngIf="horaInicioControl?.hasError('required') && horaInicioControl?.touched"
     class="text-red-500 text-sm mt-1">
  La hora de inicio es requerida
</div>
```

## Formatos de Tiempo Soportados

- **24 horas**: "14:30", "09:15", "23:59"
- **Con segundos**: "14:30:45", "09:15:30"
- **Automático**: El componente detecta y maneja ambos formatos

## Integración con Formularios

El componente implementa `ControlValueAccessor`, por lo que funciona perfectamente con:
- ✅ Formularios Reactivos (FormControl, FormGroup)
- ✅ Template-driven forms (ngModel)
- ✅ Validaciones de Angular
- ✅ Estados de formulario (pristine, dirty, touched, etc.)

## Personalización CSS

El componente utiliza clases Tailwind CSS y permite personalización adicional:

```css
/* Personalizar el contenedor */
app-time-picker {
  --picker-border-color: #e5e7eb;
  --picker-focus-color: #3b82f6;
  --picker-error-color: #ef4444;
}

/* Estilos específicos para temas */
app-time-picker.theme-fiori {
  /* Estilos personalizados para tema Fiori */
}
```