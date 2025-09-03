# FIBRAWEB 2.0

Sistema de gestión de asistencia para Fibrafil desarrollado con Angular 18.

## Características Principales

- Gestión de asistencia y horarios de empleados
- Integración con dispositivos de control de tiempo
- Reportes de asistencia y horas extras
- Gestión de estructura organizacional
- Aprobaciones de marcaciones manuales
- Generación de reportes en Excel y PDF

## Arquitectura

### Tecnologías Principales
- **Angular 18**: Framework principal
- **Angular Material**: Componentes UI con tema Azure Blue
- **Tailwind CSS**: Framework CSS utilitario
- **Kendo UI**: Grillas de datos y componentes de fecha
- **RxJS**: Manejo de operaciones asíncronas

### Estructura de Módulos
- **asistencia/**: Gestión de asistencia y horarios
- **personal/**: Gestión de RRHH y estructura organizacional
- **dispositivo/**: Gestión de dispositivos de control de tiempo
- **login/**: Autenticación

## Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo
npm start

# Construir proyecto
npm run build

# Modo watch
npm run watch

# Ejecutar tests
npm test
```

## Configuración

El proyecto utiliza un proxy para las llamadas a la API backend:
- Backend: `http://192.168.10.67:8090`
- Prefijo API: `/iclock/api`

### Repositorios Backend

El sistema FIBRAWEB 2.0 se conecta con los siguientes servicios backend:

- **[api-rh-scire](https://github.com/jescalante101/api-rh-scire.git)**: API para obtener el personal completo de planilla
- **[fibraattendance](https://github.com/jescalante101/fibraattendance.git)**: API principal para las marcaciones del personal y gestión de asistencia
- **[api-sap](https://github.com/jescalante101/api-sap.git)**: API para gestión de feriados (requerido internamente por fibraattendance)

## Desarrollo

El servidor de desarrollo se ejecuta en `http://localhost:4200/`. La aplicación se recarga automáticamente cuando se modifican los archivos fuente.

## Generación de Código

Usar Angular CLI para generar nuevos componentes:
```bash
ng generate component component-name
ng generate service service-name
```

## Build de Producción

```bash
ng build
```

Los artefactos de construcción se almacenan en el directorio `dist/`.

## Ayuda

Para obtener más ayuda sobre Angular CLI:
```bash
ng help
```

O consultar la [documentación oficial de Angular CLI](https://angular.io/cli).
