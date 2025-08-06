# Actualización de Estructura de Datos - Matriz de Asistencia

## CONTEXTO DEL PROYECTO

Estamos trabajando en un sistema de matriz de asistencia donde cambiamos la estructura de datos de la API. Antes recibíamos datos "verticales" (una fila por empleado por día), pero ahora implementamos un endpoint que devuelve datos "pivoteados" (una fila por empleado con todas las fechas como propiedades).

## CAMBIO IMPLEMENTADO

- **Antes:** `/api/attendancematrix/matrix` devolvía `AttendanceMatrixResponse` con array de `AttendanceMatrixDto[]` (formato vertical)
- **Ahora:** `/api/attendancematrix/pivot` devuelve `AttendanceMatrixPivotResponse` con array de `EmployeePivotData[]` (formato horizontal/pivoteado)

## ESTRUCTURA NUEVA

Los datos ahora vienen así:

```typescript
{
 employees: [
   {
     personalId: "123",
     colaborador: "JUAN PEREZ",
     sede: "SEDE CHILCA",
     area: "PRODUCCION",
     dailyData: {
       "2025-01-15T00:00:00": { 
         entradaReal: "08:00", 
         salidaReal: "17:00",
         diaSemana: "MIERCOLES",
         tipoDia: "LABORABLE" 
       },
       "2025-01-16T00:00:00": { 
         entradaReal: "08:15", 
         salidaReal: "17:30",
         diaSemana: "JUEVES", 
         tipoDia: "LABORABLE"
       }
     },
     totalHoras: 16.5,
     horasExtras: 1.5
   }
 ],
 dateRange: ["2025-01-15T00:00:00", "2025-01-16T00:00:00"],
 summary: { 
   totalEmployees: 100, 
   totalAbsences: 5,
   totalHours: 1650,
   totalOvertimeHours: 150
 }
}
INSTRUCCIONES

Actualiza el código frontend para usar el nuevo endpoint /pivot en lugar de /matrix
Modifica el procesamiento de datos para trabajar con la estructura pivoteada donde:

Cada empleado tiene un dailyData objeto con fechas como keys
Las fechas vienen como strings ISO: "2025-01-15T00:00:00"
Ya no necesitas agrupar por empleado, viene agrupado


Implementa el manejo de fechas dinámicas usando dateRange array
Usa las interfaces TypeScript que ya están definidas:

AttendanceMatrixPivotResponse
EmployeePivotData
DailyAttendanceData
AttendanceSummary


Para mostrar en tablas:

Usa dateRange para generar headers dinámicos
Usa employee.dailyData[fechaKey] para obtener datos de cada día



CASOS ESPECIALES

Fechas sin datos: pueden no existir en dailyData
Valores de marcaciones: entradaReal y salidaReal pueden ser:

Hora normal: "08:00"
Ausencia: "FALTA"
Permiso: "VACACIONES", "LICENCIA MEDICA", etc.
Vacío: ""


Formato de fechas: siempre vienen en formato ISO con hora 00:00:00
Acceso a datos: employee.dailyData[dateString]?.entradaReal

EJEMPLO DE IMPLEMENTACIÓN
typescript// Procesar datos recibidos
const processAttendanceData = (response: AttendanceMatrixPivotResponse) => {
  return {
    headers: response.dateRange.map(dateStr => ({
      date: dateStr,
      dayName: new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long' })
    })),
    employees: response.employees.map(emp => ({
      ...emp,
      attendance: response.dateRange.map(dateStr => 
        emp.dailyData[dateStr] || { entradaReal: '', salidaReal: '' }
      )
    }))
  };
};
Por favor actualiza el código frontend existente para trabajar con esta nueva estructura de datos pivoteada.