export interface FilterConfig {
  type: 'text' | 'autocomplete' | 'multiselect' | 'daterange' | 'checkbox' | 'date';
  key: string;
  label: string;
  placeholder?: string;
  options?: any[];
  displayField?: string;
  valueField?: string;
  searchable?: boolean;
  required?: boolean;
  multiple?: boolean;
  section?: string; // Para agrupar filtros en secciones
}

export interface FilterState {
  [key: string]: any;
}

export interface FilterSection {
  title: string;
  filters: FilterConfig[];
}

export interface GenericFilterConfig {
  sections?: FilterSection[];
  filters?: FilterConfig[];
  showClearAll?: boolean;
  showApplyButton?: boolean;
  position?: 'left' | 'right' | 'center';
}

export interface FilterChangeEvent {
  key: string;
  value: any;
  allFilters: FilterState;
}