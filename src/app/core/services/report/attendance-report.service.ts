import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';

@Injectable({
    providedIn: 'root'
})
export class AttendanceReportService {
    generateMonthlyAttendanceReport(data: any[]) {
        // 1. Agrupar datos por empleado y fecha
        const groupedData = this.groupByEmployeeAndDate(data);

        // 2. Obtener todas las fechas únicas (ordenadas)
        const uniqueDates = [...new Set(data.map(item => item.fecha))]
            .map(date => new Date(date))
            .sort((a, b) => a.getTime() - b.getTime())
            .map(date => date.toLocaleDateString('es-PE')); // Formato "DD/MM/YYYY"

        // 3. Crear encabezado del reporte
        const headers = [
            'ITEM',
            'PLANILLA',
            'NRO DOC',
            'APELLIDOS Y NOMBRES',
            'AREA',
            'CARGO',
            'SEDE',
            'FECHA INGRESO',
            'FECHA CESE'
        ];

        // Agregar columnas por fecha (INGRESO/SALIDA)
        const dateHeaders: string[] = [];
        uniqueDates.forEach(date => {
            dateHeaders.push(`${date} INGRESO`);
            dateHeaders.push(`${date} SALIDA`);
        });

        // 4. Construir los datos del reporte
        const wsData: any[][] = [];

        // Primera fila: Títulos generales
        wsData.push(headers.concat(dateHeaders));

        // Segunda fila: Etiquetas de INGRESO/SALIDA
        const secondRow = Array(headers.length).fill('');
        dateHeaders.forEach((header, index) => {
            if (index % 2 === 0) {
                secondRow[headers.length + index] = 'INGRESO';
            } else {
                secondRow[headers.length + index] = 'SALIDA';
            }
        });
        wsData.push(secondRow);

        let item = 1;
        for (const employee of groupedData) {
            const row = [
                item++,
                employee.planilla,
                employee.nroDoc,
                employee.fullNameEmployee,
                employee.areaDescription,
                employee.cargo, // Cargo (puedes ajustarlo si lo tienes)
                employee.locationName,
                employee.fechaIngreso, // FECHA INGRESO (opcional)
                employee.fechaCese  // FECHA CESE (opcional)
            ];

            // Añadir horarios por fecha
            uniqueDates.forEach(date => {
                const dayData = employee.fechas.get(date) || { entrada: '-', salida: '-' };
                row.push(dayData.entrada);
                row.push(dayData.salida);
            });

            wsData.push(row);
        }

        // 5. Crear worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 6. Estilos (encabezado azul, ancho de columnas)
        const headerStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '2563EB' } }, // Azul moderno
            alignment: { horizontal: 'center' }
        };

        // Aplicar estilo al encabezado
        headers.forEach((_, colIndex) => {
            const cell = XLSX.utils.encode_cell({ r: 0, c: colIndex });
            if (ws[cell]) ws[cell].s = headerStyle;
        });

        // Aplicar estilo a la segunda fila (INGRESO/SALIDA)
        dateHeaders.forEach((_, colIndex) => {
            const cell = XLSX.utils.encode_cell({ r: 1, c: headers.length + colIndex });
            if (ws[cell]) ws[cell].s = headerStyle;
        });

        // Ajustar ancho de columnas
        ws['!cols'] = [
            { wch: 5 },   // ITEM
            { wch: 10 },  // PLANILLA
            { wch: 12 },  // NRO DOC
            { wch: 30 },  // NOMBRES
            { wch: 20 },  // AREA
            { wch: 20 },  // CARGO
            { wch: 15 },  // SEDE
            { wch: 12 },  // FECHA INGRESO
            { wch: 12 },  // FECHA CESE
            ...Array(uniqueDates.length * 2).fill({ wch: 12 }) // Fechas
        ];

        // 7. Crear libro y exportar
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Marcaciones');
        XLSX.writeFile(wb, `Reporte_Marcaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    private groupByEmployeeAndDate(data: any[]): any[] {
        const employeesMap = new Map<string, {
            employeeId: string;
            nroDoc: string;
            fullNameEmployee: string;
            areaDescription: string;
            locationName: string;
            fechas: Map<string, { entrada: string; salida: string }>;
        }>();

        data.forEach(row => {
            const key = row.employeeId;
            const fecha = new Date(row.fecha).toLocaleDateString('es-PE'); // "04/07/2025"

            if (!employeesMap.has(key)) {
                employeesMap.set(key, {
                    employeeId: row.employeeId,
                    nroDoc: row.nroDoc,
                    fullNameEmployee: row.fullNameEmployee,
                    areaDescription: row.areaDescription,
                    locationName: row.locationName,
                    fechas: new Map()
                });
            }
            
            const emp = employeesMap.get(key)!;

            // Aseguramos que exista el objeto de fecha
            if (!emp.fechas.has(fecha)) {
                emp.fechas.set(fecha, { entrada: '-', salida: '-' });
            }

            const dayData = emp.fechas.get(fecha)!;

            // Asignar ingreso o salida
            if (row.tipoMarcacion === 'Entrada') {
                dayData.entrada = row.horaMarcacionReal || this.getEstadoAbreviado(row);
            }
            if (row.tipoMarcacion === 'Salida') {
                dayData.salida = row.horaMarcacionReal || this.getEstadoAbreviado(row);
            }
        });

        return Array.from(employeesMap.values());
    }

    private getEstadoAbreviado(row: any): string {
        if (row.estadoMarcacion === 'FALTA') return 'FALTA';
        if (row.tipoPermiso) return row.tipoPermiso.substring(0, 4).toUpperCase(); // Ej: VACACIONES -> VAC
        if (row.estadoMarcacion === 'SALIDA TEMPRANA') return 'SALIDA TEMPRANA';
        return '-';
    }
}