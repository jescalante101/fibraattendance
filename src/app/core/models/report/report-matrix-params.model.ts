export interface ReportMatrixParams {
  fechaInicio: string;
  fechaFin: string;
  employeeId: string;
  companiaId: string;
  areaId: string;
  sedeId: string;
  cargoId: string;
  centroCostoId: string;
  sedeCodigo: string;
  ccCodigo: string;
  planillaId: string;

  // Paginación
  pageNumber?: number;
  pageSize?: number;
}