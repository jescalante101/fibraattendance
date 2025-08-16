# Guía de Uso: Edición de Transferencias de Personal

## Descripción General
La funcionalidad de edición de transferencias permite modificar transferencias existentes de personal, incluyendo cambios de sede, área, centro de costo, fechas y observaciones.

## Características Implementadas

### ✅ **Funcionalidades Completadas:**
- **Carga automática de datos** por ID de transferencia
- **Prellenado automático** de todos los campos del formulario
- **Integración con AuthService** para usuario logueado
- **Validación en tiempo real** del formulario
- **Actualización directa** mediante API REST
- **Notificaciones toast** de éxito/error
- **UI adaptada** para modo edición

## Uso desde Componente Principal

### Ejemplo de Código:

```typescript
import { PersonalTransferDto } from '../../../core/models/personal-transfer.model';
import { TransferModalComponent } from './transfer-modal/transfer-modal.component';

// En el componente que liste las transferencias
editTransfer(transfer: PersonalTransferDto): void {
  this.modalService.open({
    title: 'Editar Transferencia de Personal',
    componentType: TransferModalComponent,
    width: '90vw',
    height: 'auto',
    componentData: {
      mode: 'edit',
      transferId: transfer.id, // ID para cargar datos frescos
      transferData: transfer   // Datos como respaldo
    }
  }).then(result => {
    if (result && result.action === 'save' && result.success) {
      this.toastService.success('Éxito', result.message);
      this.loadTransfers(); // Recargar lista
    }
  }).catch(error => {
    console.error('Error en modal de edición:', error);
    this.toastService.error('Error', 'Error al abrir el modal');
  });
}
```

## Interfaz del Modal

### TransferModalData Interface:
```typescript
export interface TransferModalData {
  employee?: Employee;           // Empleado prellenado (opcional)
  mode: 'create' | 'edit';      // Modo del modal
  transferData?: PersonalTransferDto; // Datos de transferencia existente
  transferId?: number;          // ID para cargar datos frescos
}
```

## Flujo de Edición

### 1. **Apertura del Modal**
```typescript
// El usuario hace clic en el botón "Editar" de una transferencia
editTransfer(transfer) // → Abre modal en modo 'edit'
```

### 2. **Carga Automática de Datos**
```typescript
// Modal se inicializa y carga datos automáticamente
loadTransferForEdit(transferId) // → Llama a API
initializeForm()                // → Rellena formulario
```

### 3. **Visualización de Datos**
```typescript
// En modo edición se muestra:
UBICACIÓN ACTUAL (solo lectura):
- Sede actual donde está el empleado
- Área actual donde está el empleado  
- Centro de costo actual

NUEVA UBICACIÓN (campos editables):
- Nueva Sede (obligatorio) - Campos vacíos para llenar
- Nueva Área (obligatorio) - Campos vacíos para llenar
- Nuevo Centro de Costo (opcional)
```

### 4. **Edición de Campos**
```typescript
// Usuario modifica los campos disponibles:
- Nueva Sede (obligatorio)
- Nueva Área (obligatorio) 
- Nuevo Centro de Costo (opcional)
- Fecha de Inicio (puede modificarse)
- Fecha de Fin (puede modificarse si no es permanente)
- Observaciones (pueden modificarse)
```

### 5. **Guardado**
```typescript
// Al hacer clic en "Actualizar Transferencia"
updateTransfer() // → Llama a PersonalTransferService.updatePersonalTransfer()
// → Muestra toast de éxito
// → Cierra modal
// → Recarga lista en componente padre
```

## Campos Editables

### ✅ **Campos Modificables:**
- **Nueva Sede**: Autocomplete con todas las sedes disponibles
- **Nueva Área**: Autocomplete con todas las áreas disponibles  
- **Nuevo Centro de Costo**: Autocomplete opcional
- **Fecha de Inicio**: Selector de fecha
- **Fecha de Fin**: Selector de fecha (si no es permanente)
- **Transferencia Permanente**: Checkbox
- **Observaciones**: Textarea libre

### ⚠️ **Campos No Editables:**
- **Empleado**: Fijo, no se puede cambiar en una transferencia existente
- **Ubicación Actual**: Solo lectura, muestra dónde está actualmente el empleado según la transferencia existente

## Validaciones

### Campos Obligatorios:
- ✅ Empleado seleccionado (fijo en modo edición)
- ✅ Nueva Sede
- ✅ Nueva Área  
- ✅ Fecha de Inicio
- ✅ Fecha de Fin (si no es permanente)

### Reglas de Negocio:
- Si "Transferencia Permanente" está marcado, no se requiere fecha de fin
- Las fechas deben ser válidas
- Los IDs de sede y área deben existir en el sistema

## Respuesta del Modal

### Objeto de Respuesta Exitosa:
```typescript
{
  action: 'save',
  success: true,
  data: PersonalTransferDto, // Transferencia actualizada
  message: 'Transferencia actualizada correctamente'
}
```

### Manejo de Errores:
```typescript
{
  action: 'save', 
  success: false,
  message: 'Mensaje de error específico'
}
```

## Integración con Servicios

### Servicios Utilizados:
- **PersonalTransferService**: CRUD de transferencias
- **AuthService**: Usuario logueado para `updatedBy`
- **CategoriaAuxiliarService**: Lista de sedes
- **RhAreaService**: Lista de áreas
- **CostCenterService**: Lista de centros de costo
- **ToastService**: Notificaciones

### API Endpoints:
- `GET /api/personal/{id}` - Obtener transferencia por ID
- `PUT /api/personal/{id}` - Actualizar transferencia

## Ejemplo de HTML del Botón de Edición

```html
<!-- En la tabla/lista de transferencias -->
<button 
  (click)="editTransfer(transfer)"
  class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
  <lucide-icon name="edit-3" class="w-4 h-4 mr-1"></lucide-icon>
  Editar
</button>
```

## Notas Técnicas

### Manejo de Fechas:
- Las fechas de la API vienen en formato ISO (`2024-01-15T00:00:00`)
- Se convierten a formato `YYYY-MM-DD` para inputs HTML
- Se envían de vuelta como string de fecha

### Performance:
- Los datos se cargan una sola vez al abrir el modal
- Las listas de sedes/áreas se cachean durante la sesión
- La validación es reactiva sin llamadas al servidor

### Accesibilidad:
- Modal tiene foco automático
- Campos obligatorios marcados con asterisco
- Indicadores visuales claros para modo edición

---

**✅ Estado: Implementación Completa y Lista para Uso**