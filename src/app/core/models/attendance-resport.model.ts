
// Nuevas interfaces para el sistema de asistencia

import { ApiResponse } from "./api-response.model";

// Información de cada día de la semana para un empleado
export interface DiaSemana {
    fecha: string; // formato ISO: "2025-07-21T00:00:00-05:00"
    diaSemana: string; // "lunes", "martes", etc.
    shiftName: string; // "Turno D", "Turno A (empieza Sem. día)", etc.
    horaEntrada: string | "FALTA"; // "07:46" o "FALTA"
    horaSalida: string | "FALTA"; // hora o "FALTA"
    horaEntradaBreak: string | "FALTA" | null; // puede ser null para algunos turnos
    horaSalidaBreak: string | "FALTA" | null; // puede ser null para algunos turnos
    estadoDia: string; // "FALTA", "PRESENTE", etc.
    totalMinutosTardanza: number;
    tieneMarcacionManual: boolean;
    observaciones: string; // observaciones del día
}

// Información completa de un empleado con sus días
export interface EmpleadoAsistencia {
    nroDoc: string; // número de documento
    employeeId: string; // ID interno del empleado
    fullNameEmployee: string; // nombre completo
    areaDescription: string; // área de trabajo
    locationName: string; // sede o ubicación
    fechaIngreso: string | null; // fecha de ingreso (puede ser null)
    diasSemana: DiaSemana[]; // array con los días de la semana
    totalDiasPresente: number; // resumen estadístico
    totalDiasFalta: number;
    totalDiasVacaciones: number;
    totalTardanzas: number;
    porcentajeAsistencia: number; // porcentaje de asistencia
}

// Tipo específico para la respuesta de asistencia
export type AsistenciaResponse = ApiResponse<EmpleadoAsistencia>;

// Interfaces adicionales útiles para el manejo de datos

// Para agrupar fechas por semana (útil para generar columnas)
export interface SemanaInfo {
    fechaInicio: string;
    fechaFin: string;
    dias: {
        fecha: string;
        diaSemana: string;
        nombreDia: string; // "LUNES", "MARTES", etc. (mayúsculas para headers)
    }[];
}

// Para procesar las columnas dinámicas de la tabla
export interface ColumnaAsistencia {
    key: string; // clave única para React
    label: string; // texto a mostrar en header
    type: 'info' | 'fecha' | 'hora' | 'estado' | 'observacion'; // tipo de columna
    width?: number; // ancho opcional
    align?: 'left' | 'center' | 'right'; // alineación
}

// Para el estado de cada celda en la tabla
export interface CeldaAsistencia {
    valor: string | number;
    tipo: 'normal' | 'falta' | 'tardanza' | 'presente';
    esManual?: boolean; // si fue marcación manual
    observacion?: string;
}

// Utilidades para filtros y búsquedas
export interface FiltrosAsistencia {
    fechaInicio?: string;
    fechaFin?: string;
    sede?: string;
    area?: string;
    empleado?: string;
    estadoDia?: string;
    turno?: string;
}

// Para paginación y parámetros de consulta
export interface ParametrosConsulta extends FiltrosAsistencia {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}