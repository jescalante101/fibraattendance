# ErrorHandlerService - Guía de Uso

El `ErrorHandlerService` es un servicio centralizado para manejar errores HTTP y genéricos de manera consistente en toda la aplicación.

## 🚀 Importación

```typescript
import { ErrorHandlerService } from 'src/app/shared/services/error-handler.service';

// En el constructor
constructor(private errorHandlerService: ErrorHandlerService) {}
```

## 📋 Métodos Principales

### 1. `handleHttpError()` - Manejo de Errores HTTP

**Uso Básico:**
```typescript
.subscribe({
  next: (response) => {
    // Éxito
  },
  error: (error) => {
    this.errorHandlerService.handleHttpError(error);
  }
});
```

**Con Contexto:**
```typescript
.subscribe({
  error: (error) => {
    this.errorHandlerService.handleHttpError(error, 'CrearEmpleado');
  }
});
```

**Con Mensajes Personalizados:**
```typescript
.subscribe({
  error: (error) => {
    this.errorHandlerService.handleHttpError(error, 'CrearDiaCompensatorio', {
      400: 'Error al crear día compensatorio. Verifica las fechas',
      409: 'Ya existe un día compensatorio para esta fecha'
    });
  }
});
```

### 2. Métodos de Conveniencia

**Para Operaciones de Guardado:**
```typescript
.subscribe({
  error: (error) => {
    this.errorHandlerService.handleSaveError(error, 'empleado');
    this.loading = false;
  }
});
```

**Para Operaciones de Eliminación:**
```typescript
.subscribe({
  error: (error) => {
    this.errorHandlerService.handleDeleteError(error, 'turno');
    this.loading = false;
  }
});
```

**Para Operaciones de Carga:**
```typescript
.subscribe({
  error: (error) => {
    this.errorHandlerService.handleLoadError(error, 'horarios');
    this.loading = false;
  }
});
```

### 3. `handleGenericError()` - Errores No-HTTP

```typescript
try {
  // Operación que puede fallar
  const result = this.processData(data);
} catch (error) {
  this.errorHandlerService.handleGenericError(
    error, 
    'ProcessData', 
    'Error procesando los datos del empleado'
  );
}
```

## 🎯 Códigos de Error Soportados

| Código | Título | Tipo | Descripción |
|--------|--------|------|-------------|
| 400 | Datos Inválidos | error | Datos enviados incorrectos |
| 401 | No Autorizado | warning | Sesión expirada |
| 403 | Acceso Denegado | warning | Sin permisos |
| 404 | No Encontrado | warning | Recurso no existe |
| 409 | Conflicto | warning | Registro duplicado |
| 422 | Error de Validación | error | Validaciones fallaron |
| 429 | Demasiadas Solicitudes | warning | Rate limit excedido |
| 500+ | Error del Servidor | error | Error interno |
| 0 | Error de Conexión | error | Sin conectividad |

## 📝 Ejemplos Reales

### Ejemplo 1: Crear Empleado
```typescript
crearEmpleado(empleado: Employee) {
  this.loading = true;
  
  this.employeeService.create(empleado).subscribe({
    next: (response) => {
      this.toastService.success('Éxito', 'Empleado creado correctamente');
      this.loading = false;
    },
    error: (error) => {
      this.errorHandlerService.handleSaveError(error, 'empleado');
      this.loading = false;
    }
  });
}
```

### Ejemplo 2: Cargar Turnos
```typescript
cargarTurnos() {
  this.turnosService.getAll().subscribe({
    next: (turnos) => {
      this.turnos = turnos;
    },
    error: (error) => {
      this.errorHandlerService.handleLoadError(error, 'turnos');
    }
  });
}
```

### Ejemplo 3: Error Personalizado
```typescript
eliminarAsignacion(id: number) {
  this.assignmentService.delete(id).subscribe({
    next: () => {
      this.toastService.success('Eliminado', 'Asignación eliminada');
    },
    error: (error) => {
      this.errorHandlerService.handleHttpError(error, 'EliminarAsignacion', {
        400: 'No se puede eliminar una asignación activa',
        409: 'La asignación está siendo usada en reportes'
      });
    }
  });
}
```

## 🔧 Configuración de Logging

El servicio automáticamente logea errores importantes:
- **Errores 500+**: Se registran siempre
- **Errores de conexión**: Se registran siempre  
- **Errores 400-499**: Solo se muestran al usuario

## 🎨 Tipos de Toast

El servicio muestra diferentes tipos de notificaciones:
- **Error**: Errores críticos (rojo)
- **Warning**: Advertencias (amarillo)  
- **Info**: Información (azul)

## ⚡ Migración de Código Existente

**Antes:**
```typescript
.subscribe({
  error: (err) => {
    console.error('Error:', err);
    this.toastService.error('Error', 'No se pudo guardar');
    this.loading = false;
  }
});
```

**Después:**
```typescript
.subscribe({
  error: (error) => {
    this.errorHandlerService.handleSaveError(error, 'registro');
    this.loading = false;
  }
});
```

## 📱 Beneficios

- ✅ **Consistencia**: Mensajes uniformes en toda la app
- ✅ **Menos Código**: Una línea vs múltiples
- ✅ **Mantenimiento**: Cambios centralizados
- ✅ **Logging**: Registro automático de errores
- ✅ **UX Mejorada**: Mensajes más claros para usuarios