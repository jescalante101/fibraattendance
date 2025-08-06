using ClosedXML.Excel;
using Dtos.Reportes.Matrix;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Drawing;
using System.Globalization;

namespace FibAttendanceApi.Core.Reporte.AttendanceMatrix
{
    /// <summary>
    /// Servicio para manejo de matriz de asistencia
    /// </summary>
    public class AttendanceMatrixService : IAttendanceMatrixService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AttendanceMatrixService> _logger;
        private readonly string _connectionString;

        public AttendanceMatrixService(
            IConfiguration configuration,
            ILogger<AttendanceMatrixService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _connectionString = _configuration.GetConnectionString("DefaultConnection");
        }

        /// <summary>
        /// Obtiene datos de matriz de asistencia
        /// </summary>
        public async Task<AttendanceMatrixResponseDto> GetAttendanceMatrixAsync(AttendanceMatrixFilterDto filter)
        {
            var startTime = DateTime.Now;
            var response = new AttendanceMatrixResponseDto
            {
                Data = new List<AttendanceMatrixDto>(),
                GeneratedAt = startTime
            };

            try
            {
                _logger.LogInformation("Iniciando consulta de matriz de asistencia para período {FechaInicio} - {FechaFin}",
                    filter.FechaInicio, filter.FechaFin);

                using var connection = new SqlConnection(_connectionString);
                using var command = new SqlCommand("sp_AttendanceMatrixOptimized", connection)
                {
                    CommandType = CommandType.StoredProcedure,
                    CommandTimeout = 300 // 5 minutos timeout
                };

                // Agregar parámetros
                AddParameters(command, filter);

                await connection.OpenAsync();

                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    response.Data.Add(MapToDto(reader));
                }

                response.TotalRecords = response.Data.Count;
                response.Success = true;
                response.Message = $"Consulta exitosa. {response.TotalRecords} registros encontrados.";

                _logger.LogInformation("Consulta completada exitosamente. {TotalRecords} registros obtenidos",
                    response.TotalRecords);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Error SQL al ejecutar consulta de matriz de asistencia");
                response.Success = false;
                response.Message = $"Error en base de datos: {ex.Message}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error general al obtener matriz de asistencia");
                response.Success = false;
                response.Message = $"Error interno: {ex.Message}";
            }

            response.ExecutionTime = DateTime.Now - startTime;
            return response;
        }

        // <summary>
        /// Exporta datos a Excel con formato matriz pivoteada
        /// </summary>
        public async Task<byte[]> ExportToExcelAsync(AttendanceMatrixFilterDto filter)
        {
            var startTime = DateTime.Now;
            _logger.LogInformation("Iniciando exportación a Excel para período {FechaInicio} - {FechaFin}",
                filter.FechaInicio, filter.FechaFin);

            try
            {
                // 1. Obtener datos del SP
                var data = await GetAttendanceMatrixAsync(filter);

                if (!data.Success || !data.Data.Any())
                {
                    throw new InvalidOperationException("No hay datos para exportar");
                }

                // 2. Procesar datos y hacer pivot
                var pivotData = ProcessDataForPivot(data.Data, filter.FechaInicio, filter.FechaFin);

                // 3. Generar Excel
                using var workbook = new XLWorkbook();
                var worksheet = workbook.Worksheets.Add("Matriz de Asistencia");

                // 4. Configurar formato y generar contenido
                GenerateExcelContent(worksheet, pivotData, filter.FechaInicio, filter.FechaFin);

                // 5. Convertir a bytes
                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                var result = stream.ToArray();

                _logger.LogInformation("Exportación completada. {TotalEmployees} empleados, {FileSize} bytes",
                    pivotData.Count, result.Length);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al exportar matriz de asistencia a Excel");
                throw;
            }
        }

        /// <summary>
        /// Procesa los datos verticales y los convierte en formato pivot horizontal
        /// </summary>
        private List<EmployeePivotData> ProcessDataForPivot(List<AttendanceMatrixDto> rawData, DateTime fechaInicio, DateTime fechaFin)
        {
            _logger.LogInformation("Procesando {TotalRecords} registros para pivot", rawData.Count);

            var employeeGroups = rawData
                .GroupBy(x => new { x.PersonalId, x.NroDoc, x.Colaborador })
                .Select(employeeGroup =>
                {
                    var firstRecord = employeeGroup.First();
                    var dailyData = new Dictionary<DateTime, DailyAttendanceData>();

                    // Procesar cada día del empleado
                    foreach (var dayRecord in employeeGroup)
                    {
                        dailyData[dayRecord.Fecha.Date] = new DailyAttendanceData
                        {
                            DiaSemana = dayRecord.DiaSemanaEs,
                            TipoDia = dayRecord.TipoDia,
                            TurnoNombre = dayRecord.TurnoNombre,
                            EntradaProgramada = dayRecord.EntradaProgramada,
                            SalidaProgramada = dayRecord.SalidaProgramada,
                            MarcacionesDelDia = dayRecord.MarcacionesDelDia,
                            OrigenMarcaciones = dayRecord.OrigenMarcaciones,
                            TipoPermiso = dayRecord.TipoPermiso,
                            EntradaReal = ExtractFirstTime(dayRecord.MarcacionesDelDia, dayRecord.TipoPermiso),
                            SalidaReal = ExtractLastTime(dayRecord.MarcacionesDelDia, dayRecord.TipoPermiso)
                        };
                    }

                    // Calcular totales
                    var totalHoras = CalculateTotalHours(dailyData, fechaInicio, fechaFin);
                    var horasExtras = CalculateOvertimeHours(dailyData, fechaInicio, fechaFin);

                    return new EmployeePivotData
                    {
                        PersonalId = firstRecord.PersonalId,
                        NroDoc = firstRecord.NroDoc,
                        Colaborador = firstRecord.Colaborador,
                        Sede = firstRecord.Sede,
                        Area = firstRecord.Area,
                        Cargo = firstRecord.Cargo,
                        CentroCosto = firstRecord.CentroCosto,
                        Compania = firstRecord.Compania,
                        FechaIngreso = firstRecord.FechaIngreso,
                        DailyData = dailyData,
                        TotalHoras = totalHoras,
                        HorasExtras = horasExtras
                    };
                })
                .OrderBy(x => x.Colaborador)
                .ToList();

            _logger.LogInformation("Pivot procesado: {TotalEmployees} empleados", employeeGroups.Count);
            return employeeGroups;
        }

        /// <summary>
        /// Genera el contenido del Excel con formato similar al archivo original
        /// </summary>
        private void GenerateExcelContent(IXLWorksheet worksheet, List<EmployeePivotData> pivotData,
            DateTime fechaInicio, DateTime fechaFin)
        {
            var currentRow = 1;
            var currentCol = 1;

            // Generar lista de fechas del período
            var dateRange = GenerateDateRange(fechaInicio, fechaFin);

            // === ENCABEZADOS PRINCIPALES ===

            // Fila 1: Título del período
            worksheet.Cell(currentRow, 10).Value = $"PERIODO\r\n{fechaInicio:dd-MM} AL {fechaFin:dd-MM-yy}";
            worksheet.Cell(currentRow, 10).Style.Alignment.WrapText = true;
            worksheet.Cell(currentRow, 10).Style.Font.Bold = true;
            worksheet.Cell(currentRow, 10).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            currentRow = 2;

            // Fila 2: Encabezados fijos + días
            var headers = new List<string>
    {
        "TIPO DOC.", "N° DOC.", "COLABORADOR", "SEDE", "AREA", "CARGO",
        "PERSONAL NO FISCALIZADO", "CC", "FECHA INGRESO"
    };

            // Agregar encabezados fijos
            for (int i = 0; i < headers.Count; i++)
            {
                worksheet.Cell(currentRow, i + 1).Value = headers[i];
                worksheet.Cell(currentRow, i + 1).Style.Font.Bold = true;
                worksheet.Cell(currentRow, i + 1).Style.Fill.BackgroundColor = XLColor.LightGray;
            }

            currentCol = headers.Count + 1;

            // Agregar encabezados de fechas
            foreach (var date in dateRange)
            {
                // FUSIONAR 2 COLUMNAS PARA EL DÍA
                var dayHeaderRange = worksheet.Range(currentRow, currentCol, currentRow, currentCol + 1);
                dayHeaderRange.Merge();

                worksheet.Cell(currentRow, currentCol).Value = date.ToString("dddd", new CultureInfo("es-ES")).ToUpper();
                worksheet.Cell(currentRow, currentCol).Style.Font.Bold = true;
                worksheet.Cell(currentRow, currentCol).Style.Fill.BackgroundColor = XLColor.LightBlue;
                worksheet.Cell(currentRow, currentCol).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                currentCol += 2; // Avanzar 2 columnas (ENTRADA y SALIDA)
            }

            // Columnas de totales (sin cambios)
            worksheet.Cell(currentRow, currentCol).Value = "TOTAL HORAS";
            worksheet.Cell(currentRow, currentCol).Style.Font.Bold = true;
            worksheet.Cell(currentRow, currentCol).Style.Fill.BackgroundColor = XLColor.LightGreen;
            currentCol++;

            worksheet.Cell(currentRow, currentCol).Value = "HORAS EXTRAS";
            worksheet.Cell(currentRow, currentCol).Style.Font.Bold = true;
            worksheet.Cell(currentRow, currentCol).Style.Fill.BackgroundColor = XLColor.LightGreen;

            currentRow = 3;

            // Fila 3: Sub-encabezados (ENTRADA/SALIDA para cada día)
            currentCol = headers.Count + 1;
            foreach (var date in dateRange)
            {
                worksheet.Cell(currentRow, currentCol).Value = "ENTRADA";
                worksheet.Cell(currentRow, currentCol).Style.Font.Bold = true;
                worksheet.Cell(currentRow, currentCol).Style.Fill.BackgroundColor = XLColor.LightYellow;
                currentCol++;

                worksheet.Cell(currentRow, currentCol).Value = "SALIDA";
                worksheet.Cell(currentRow, currentCol).Style.Font.Bold = true;
                worksheet.Cell(currentRow, currentCol).Style.Fill.BackgroundColor = XLColor.LightYellow;
                currentCol++;
            }

            currentRow = 4;

            // === DATOS DE EMPLEADOS ===
            foreach (var employee in pivotData)
            {
                currentCol = 1;

                // Datos fijos del empleado
                worksheet.Cell(currentRow, currentCol++).Value = "DNI";
                worksheet.Cell(currentRow, currentCol++).Value = employee.NroDoc;
                worksheet.Cell(currentRow, currentCol++).Value = employee.Colaborador;
                worksheet.Cell(currentRow, currentCol++).Value = employee.Sede;
                worksheet.Cell(currentRow, currentCol++).Value = employee.Area;
                worksheet.Cell(currentRow, currentCol++).Value = employee.Cargo;
                worksheet.Cell(currentRow, currentCol++).Value = ""; // Personal no fiscalizado
                worksheet.Cell(currentRow, currentCol++).Value = employee.CentroCosto;
                worksheet.Cell(currentRow, currentCol++).Value = employee.FechaIngreso;

                // Datos por día
                foreach (var date in dateRange)
                {
                    if (employee.DailyData.TryGetValue(date.Date, out var dayData))
                    {
                        // DEBUG: Ver qué se está escribiendo
                      
                        worksheet.Cell(currentRow, currentCol++).Value = dayData.EntradaReal ?? "";
                        worksheet.Cell(currentRow, currentCol++).Value = dayData.SalidaReal ?? "";
                    }
                    else
                    {
                       
                        worksheet.Cell(currentRow, currentCol++).Value = "";
                        worksheet.Cell(currentRow, currentCol++).Value = "";
                    }
                }

                // Totales
                worksheet.Cell(currentRow, currentCol++).Value = employee.TotalHoras;
                worksheet.Cell(currentRow, currentCol).Value = employee.HorasExtras;

                // Alternar color de filas
                if (currentRow % 2 == 0)
                {
                    var range = worksheet.Range(currentRow, 1, currentRow, currentCol);
                    range.Style.Fill.BackgroundColor = XLColor.AliceBlue;
                }

                currentRow++;
            }

            // === FORMATEO FINAL ===

            // Ajustar anchos de columna
            worksheet.Column(1).Width = 10;  // TIPO DOC
            worksheet.Column(2).Width = 12;  // N° DOC
            worksheet.Column(3).Width = 35;  // COLABORADOR
            worksheet.Column(4).Width = 15;  // SEDE
            worksheet.Column(5).Width = 20;  // AREA
            worksheet.Column(6).Width = 25;  // CARGO
            worksheet.Column(7).Width = 12;  // PERSONAL NO FISCALIZADO
            worksheet.Column(8).Width = 20;  // CC
            worksheet.Column(9).Width = 12;  // FECHA INGRESO

            // Columnas de días
            for (int i = 10; i <= 9 + (dateRange.Count * 2); i++)
            {
                worksheet.Column(i).Width = 8;
            }

            // Columnas de totales
            worksheet.Column(9 + (dateRange.Count * 2) + 1).Width = 12;
            worksheet.Column(9 + (dateRange.Count * 2) + 2).Width = 12;

            // Congelar filas y columnas
            worksheet.SheetView.FreezeRows(3);
            worksheet.SheetView.FreezeColumns(3);

            // Agregar bordes
            var dataRange = worksheet.Range(2, 1, currentRow - 1, 9 + (dateRange.Count * 2) + 2);
            dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Medium;
            dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            _logger.LogInformation("Excel generado con {TotalRows} filas y {TotalCols} columnas",
                currentRow - 1, 9 + (dateRange.Count * 2) + 2);
        }

        /// <summary>
        /// Genera lista de fechas en el rango especificado
        /// </summary>
        private List<DateTime> GenerateDateRange(DateTime fechaInicio, DateTime fechaFin)
        {
            var dates = new List<DateTime>();
            for (var date = fechaInicio.Date; date <= fechaFin.Date; date = date.AddDays(1))
            {
                dates.Add(date);
            }
            return dates;
        }
        /// <summary>
        /// Extrae la primera hora única
        /// </summary>
        private string ExtractFirstTime(string marcaciones, string tipoPermiso)
        {
            if ((string.IsNullOrEmpty(marcaciones) || marcaciones == "SIN_MARCACIONES") &&
                !string.IsNullOrEmpty(tipoPermiso))
                return tipoPermiso;

            if (string.IsNullOrEmpty(marcaciones) || marcaciones == "SIN_MARCACIONES")
                return "FALTA";

            var horasUnicas = marcaciones
                .Split('|', StringSplitOptions.RemoveEmptyEntries)
                .Select(m => {
                    var limpia = m.Trim();
                    var parenIndex = limpia.IndexOf('(');
                    return parenIndex > 0 ? limpia.Substring(0, parenIndex).Trim() : limpia.Trim();
                })
                .Distinct()
                .ToList();

            return horasUnicas.FirstOrDefault() ?? "FALTA";
        }

        /// <summary>
        /// Extrae la última hora única
        /// </summary>
        private string ExtractLastTime(string marcaciones, string tipoPermiso)
        {
            if ((string.IsNullOrEmpty(marcaciones) || marcaciones == "SIN_MARCACIONES") &&
                !string.IsNullOrEmpty(tipoPermiso))
                return "";

            if (string.IsNullOrEmpty(marcaciones) || marcaciones == "SIN_MARCACIONES")
                return "FALTA";

            var horasUnicas = marcaciones
                .Split('|', StringSplitOptions.RemoveEmptyEntries)
                .Select(m => {
                    var limpia = m.Trim();
                    var parenIndex = limpia.IndexOf('(');
                    return parenIndex > 0 ? limpia.Substring(0, parenIndex).Trim() : limpia.Trim();
                })
                .Distinct()
                .ToList();

            return horasUnicas.LastOrDefault() ?? "FALTA";
        }

 
        /// <summary>
        /// Calcula total de horas trabajadas (lógica corregida)
        /// </summary>
        private decimal CalculateTotalHours(Dictionary<DateTime, DailyAttendanceData> dailyData,
            DateTime fechaInicio, DateTime fechaFin)
        {
            decimal totalHours = 0;

            for (var date = fechaInicio.Date; date <= fechaFin.Date; date = date.AddDays(1))
            {
                if (dailyData.TryGetValue(date, out var dayData))
                {
                    // Si hay permiso, no contar horas
                    if (!string.IsNullOrEmpty(dayData.TipoPermiso))
                        continue;

                    // Si es FALTA, continuar con el siguiente día (no sumar, pero no parar)
                    if (dayData.EntradaReal == "FALTA" || dayData.SalidaReal == "FALTA")
                        continue;

                    // Solo calcular si hay entrada y salida válidas (horarios reales)
                    if (!string.IsNullOrEmpty(dayData.EntradaReal) &&
                        !string.IsNullOrEmpty(dayData.SalidaReal) &&
                        TimeSpan.TryParse(dayData.EntradaReal, out var entrada) &&
                        TimeSpan.TryParse(dayData.SalidaReal, out var salida))
                    {
                        var workedHours = salida - entrada;
                        if (workedHours.TotalHours > 0 && workedHours.TotalHours < 24)
                        {
                            totalHours += (decimal)workedHours.TotalHours;
                        }
                    }
                }
            }

            return Math.Round(totalHours, 2);
        }


        /// <summary>
        /// Calcula horas extras (lógica corregida)
        /// </summary>
        private decimal CalculateOvertimeHours(Dictionary<DateTime, DailyAttendanceData> dailyData,
            DateTime fechaInicio, DateTime fechaFin)
        {
            decimal overtimeHours = 0;
            const decimal normalWorkDay = 8.0m;

            for (var date = fechaInicio.Date; date <= fechaFin.Date; date = date.AddDays(1))
            {
                if (dailyData.TryGetValue(date, out var dayData))
                {
                    // Si hay permiso, no contar horas extras
                    if (!string.IsNullOrEmpty(dayData.TipoPermiso))
                        continue;

                    // Si es FALTA, continuar con el siguiente día
                    if (dayData.EntradaReal == "FALTA" || dayData.SalidaReal == "FALTA")
                        continue;

                    // Solo calcular si hay entrada y salida válidas
                    if (!string.IsNullOrEmpty(dayData.EntradaReal) &&
                        !string.IsNullOrEmpty(dayData.SalidaReal) &&
                        TimeSpan.TryParse(dayData.EntradaReal, out var entrada) &&
                        TimeSpan.TryParse(dayData.SalidaReal, out var salida))
                    {
                        var workedHours = (decimal)(salida - entrada).TotalHours;
                        if (workedHours > normalWorkDay && workedHours < 24)
                        {
                            overtimeHours += workedHours - normalWorkDay;
                        }
                    }
                }
            }

            return Math.Round(overtimeHours, 2);
        }

        /// <summary>
        /// Agrega parámetros al comando SQL
        /// </summary>
        private void AddParameters(SqlCommand command, AttendanceMatrixFilterDto filter)
        {
            command.Parameters.Add("@FechaInicio", SqlDbType.Date).Value = filter.FechaInicio;
            command.Parameters.Add("@FechaFin", SqlDbType.Date).Value = filter.FechaFin;

            command.Parameters.Add("@EmployeeId", SqlDbType.VarChar, 20).Value =
                string.IsNullOrEmpty(filter.EmployeeId) ? DBNull.Value : filter.EmployeeId;

            command.Parameters.Add("@CompaniaId", SqlDbType.VarChar, 2).Value =
                string.IsNullOrEmpty(filter.CompaniaId) ? DBNull.Value : filter.CompaniaId;

            command.Parameters.Add("@AreaId", SqlDbType.VarChar, 3).Value =
                string.IsNullOrEmpty(filter.AreaId) ? DBNull.Value : filter.AreaId;

            command.Parameters.Add("@SedeId", SqlDbType.VarChar, 15).Value =
                string.IsNullOrEmpty(filter.SedeId) ? DBNull.Value : filter.SedeId;

            command.Parameters.Add("@CargoId", SqlDbType.VarChar, 3).Value =
                string.IsNullOrEmpty(filter.CargoId) ? DBNull.Value : filter.CargoId;

            command.Parameters.Add("@CentroCostoId", SqlDbType.VarChar, 15).Value =
                string.IsNullOrEmpty(filter.CentroCostoId) ? DBNull.Value : filter.CentroCostoId;

            command.Parameters.Add("@SedeCodigo", SqlDbType.VarChar, 15).Value =
                string.IsNullOrEmpty(filter.SedeCodigo) ? DBNull.Value : filter.SedeCodigo;

            command.Parameters.Add("@CCCodigo", SqlDbType.VarChar, 15).Value =
                string.IsNullOrEmpty(filter.CcCodigo) ? DBNull.Value : filter.CcCodigo;
        }

        /// <summary>
        /// Mapea SqlDataReader a DTO
        /// </summary>
        private AttendanceMatrixDto MapToDto(SqlDataReader reader)
        {
            return new AttendanceMatrixDto
            {
                PersonalId = GetSafeString(reader, "Personal_Id"),
                NroDoc = GetSafeString(reader, "Nro_Doc"),
                Colaborador = GetSafeString(reader, "colaborador"),
                Sede = GetSafeString(reader, "sede"),
                SedeCodigo = GetSafeString(reader, "sede_codigo"),
                Area = GetSafeString(reader, "area"),
                Cargo = GetSafeString(reader, "cargo"),
                CentroCosto = GetSafeString(reader, "centro_costo"),
                CcCodigo = GetSafeString(reader, "cc_codigo"),
                Compania = GetSafeString(reader, "compania"),
                FechaIngreso = GetSafeString(reader, "fecha_ingreso"),

                // Información del día
                Fecha = GetSafeDateTime(reader, "Fecha"),
                DiaSemanaEs = GetSafeString(reader, "dia_semana_es"),

                // Configuración de horario
                TurnoNombre = GetSafeString(reader, "turno_nombre"),
                TipoHorario = GetSafeString(reader, "tipo_horario"),
                TipoDia = GetSafeString(reader, "tipo_dia"),

                // Horarios programados
                EntradaProgramada = GetSafeString(reader, "entrada_programada"),
                SalidaProgramada = GetSafeString(reader, "salida_programada"),
                MarcacionesEsperadas = GetSafeInt(reader, "marcaciones_esperadas"),
                BreaksConfigurados = GetSafeString(reader, "breaks_configurados"),

                // Permisos
                TipoPermiso = GetSafeString(reader, "tipo_permiso"),

                // Marcaciones reales - NUEVOS CAMPOS
                MarcacionesDelDia = GetSafeString(reader, "marcaciones_del_dia"),
                MarcacionesManuales = GetSafeString(reader, "marcaciones_manuales"),
                RazonesManuales = GetSafeString(reader, "razones_manuales"),
                OrigenMarcaciones = GetSafeString(reader, "origen_marcaciones")
            };
        }

        /// <summary>
        /// Obtiene string de forma segura del SqlDataReader
        /// </summary>
        private string GetSafeString(SqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? string.Empty : reader.GetString(ordinal);
        }

        /// <summary>
        /// Obtiene DateTime de forma segura del SqlDataReader
        /// </summary>
        private DateTime GetSafeDateTime(SqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? DateTime.MinValue : reader.GetDateTime(ordinal);
        }

        /// <summary>
        /// Obtiene int nullable de forma segura del SqlDataReader
        /// </summary>
        private int? GetSafeInt(SqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
        }
    }
}
