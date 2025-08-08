// Modelo para un día festivo individual
export interface Holiday {
  hldCode: string;
  strDate: Date;
  endDate: Date;
  rmrks: string;
}

// Modelo para un año de feriados completo
export interface HolidayYear {
  hldCode: string;
  wndFrm: string;
  wndTo: string;
  isCurYear: string;
  ignrWnd: string;
  weekNoRule: string;
  hld1s: Holiday[];
}

// DTO para respuesta de sincronización
export interface SynchronizationResult {
  success: boolean;
  message: string;
  totalRecordsProcessed: number;
  newRecordsAdded: number;
  existingRecordsUpdated: number;
  recordsDeleted: number;
  synchronizedAt: Date;
  errors: string[];
  warnings: string[];
}

// Modelo para la tabla de AG-Grid
export interface HolidayTableRow {
  year: string;
  holidayDate: Date;
  endDate: Date;
  description: string;
  dayName: string;
  monthName: string;
  duration: number; // días de duración
  isCurrentYear: boolean;
}

// Filtros para la tabla
export interface HolidayFilters {
  yearFilter: string;
  searchTerm: string;
  showCurrentYearOnly: boolean;
}