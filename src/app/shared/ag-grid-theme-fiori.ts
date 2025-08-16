// ag-grid-theme-fiori.ts - Tema SAP Fiori personalizado para ag-Grid v34

import { themeQuartz } from 'ag-grid-community';

/**
 * Tema SAP Fiori basado en themeQuartz
 * Configuración completa con colores y espaciado oficial de SAP
 */
export const themeFiori = themeQuartz.withParams({
  // Paleta de colores SAP Fiori
  backgroundColor: '#ffffff',
  foregroundColor: '#32363a',
  borderColor: '#d9d9d9',
  
  // Colores primarios
  accentColor: '#0070f2',
  
  // Header styling
  headerBackgroundColor: '#f7f7f7',
  
  // Espaciado y tipografía
  spacing: 8,
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
  
  // Bordes y escalado
  borderRadius: 6,
  cellHorizontalPaddingScale: 1.2,
  rowVerticalPaddingScale: 1.1,
  
  // Colores de interacción
  rowHoverColor: '#f1f5fe',
  selectedRowBackgroundColor: '#e7f3ff'
} as any); // Usar 'as any' para evitar errores de tipos temporalmente

/**
 * Configuración del sidebar para ag-Grid
 * Define los paneles disponibles y su configuración
 */
export const sideBarConfig = {
  toolPanels: [
    {
      id: 'columns',
      labelDefault: 'Columnas',
      labelKey: 'columns',
      iconKey: 'columns',
      toolPanel: 'agColumnsToolPanel',
      minWidth: 225,
      maxWidth: 300,
      width: 250
    },
    {
      id: 'filters',
      labelDefault: 'Filtros',
      labelKey: 'filters', 
      iconKey: 'filter',
      toolPanel: 'agFiltersToolPanel',
      minWidth: 225,
      maxWidth: 300,
      width: 250
    }
  ],
  position: 'right',
  defaultToolPanel: 'columns',
  hiddenByDefault: false
};

/**
 * Configuración por defecto para columnas
 * Configuración estándar que se aplica a todas las columnas
 */
export const defaultColDefFiori = {
  sortable: true,
  filter: true,
  resizable: true,
  floatingFilter: true,
  minWidth: 100,
  flex: 1,
  cellStyle: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px'
  },
  headerStyle: {
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
};

/**
 * Configuración de Grid Options optimizada para SAP Fiori
 */
export const gridOptionsFiori = {
  // Configuración base
  defaultColDef: defaultColDefFiori,
  
  // Sidebar
  sideBar: sideBarConfig,
  
  // Paginación
  pagination: true,
  paginationPageSize: 50,
  paginationPageSizeSelector: [25, 50, 100, 200],
  
  // Selección
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  
  // Animaciones y UX
  animateRows: true,
  enableCellTextSelection: true,
  suppressMenuHide: false,
  
  // Comportamiento de filtros
  suppressColumnVirtualisation: false,
  enableRangeSelection: false,
  
  // Headers
  suppressHeaderKeyboardEvent: false,
  suppressHeaderMenuButton: false,
  
  // Performance
  rowBuffer: 10,
  suppressRowVirtualisation: false,
  
  // Drag & Drop
  rowDragManaged: false,
  suppressMoveWhenRowDragging: true,
  
  // Resize
  suppressAutoSize: false,
  skipHeaderOnAutoSize: false,
  
  // Context menu
  allowContextMenuWithControlKey: true,
  preventDefaultOnContextMenu: false,
  
  // Accessibility
  ensureDomOrder: true,
  suppressRowHoverHighlight: false,
  
  // Tool panels configuration
  toolPanelSizeChanged: () => {
    // Auto-resize columns when tool panel size changes
    // This will be called when sidebar is opened/closed
  }
};

/**
 * Configuración de localización en español para ag-Grid
 * Textos de interfaz traducidos al español
 */
export const localeTextFiori = {
  // Paginación
  page: 'Página',
  more: 'Más',
  to: 'a',
  of: 'de',
  next: 'Siguiente',
  last: 'Último',
  first: 'Primero',
  previous: 'Anterior',
  loadingOoo: 'Cargando...',
  
  // Sidebar
  columns: 'Columnas',
  filters: 'Filtros',
  
  // Filtros
  selectAll: 'Seleccionar todo',
  searchOoo: 'Buscar...',
  blank: 'Vacío',
  notBlank: 'No vacío',
  filterOoo: 'Filtrar...',
  applyFilter: 'Aplicar filtro',
  clearFilter: 'Limpiar filtro',
  
  // Operadores de filtro
  equals: 'Igual a',
  notEqual: 'No igual a',
  lessThan: 'Menor que',
  greaterThan: 'Mayor que',
  lessThanOrEqual: 'Menor o igual que',
  greaterThanOrEqual: 'Mayor o igual que',
  inRange: 'En rango',
  contains: 'Contiene',
  notContains: 'No contiene',
  startsWith: 'Empieza con',
  endsWith: 'Termina con',
  
  // Condiciones
  andCondition: 'Y',
  orCondition: 'O',
  
  // Menú de columnas
  pinColumn: 'Fijar columna',
  pinLeft: 'Fijar a la izquierda',
  pinRight: 'Fijar a la derecha',
  noPin: 'No fijar',
  autosizeThiscolumn: 'Autoajustar esta columna',
  autosizeAllColumns: 'Autoajustar todas las columnas',
  groupBy: 'Agrupar por',
  ungroupBy: 'Desagrupar por',
  resetColumns: 'Reiniciar columnas',
  expandAll: 'Expandir todo',
  collapseAll: 'Contraer todo',
  
  // Tool panel
  toolPanel: 'Panel de herramientas',
  export: 'Exportar',
  csvExport: 'Exportar a CSV',
  excelExport: 'Exportar a Excel (.xlsx)',
  
  // Menú contextual
  copy: 'Copiar',
  copyWithHeaders: 'Copiar con cabeceras',
  paste: 'Pegar',
  
  // Estados
  noRowsToShow: 'No hay filas para mostrar',
  
  // Paginador personalizado
  pageSizeSelectorLabel: 'Tamaño de página:',
  ariaPageSizeSelector: 'Tamaño de página',
  
  // Tool panel específico
  rowGroupColumns: 'Columnas de agrupación',
  rowGroupColumnsEmptyMessage: 'Arrastra columnas aquí para agrupar',
  valueColumns: 'Columnas de valores',
  pivotMode: 'Modo pivote',
  groups: 'Grupos',
  values: 'Valores',
  pivots: 'Pivotes',
  valueColumnsEmptyMessage: 'Arrastra columnas aquí para agregar',
  pivotColumnsEmptyMessage: 'Arrastra aquí para establecer pivotes',
  
  // Separadores numéricos
  thousandSeparator: '.',
  decimalSeparator: ','
};

/**
 * Función utilitaria para aplicar configuración completa Fiori a ag-Grid
 * @param customGridOptions Opciones personalizadas adicionales
 * @returns Configuración completa de gridOptions
 */
export function createFioriGridOptions(customGridOptions: any = {}) {
  return {
    ...gridOptionsFiori,
    localeText: localeTextFiori,
    ...customGridOptions
  };
}

/**
 * Configuración específica para componentes con selección múltiple
 */
export const multiSelectGridOptions = {
  ...gridOptionsFiori,
  checkboxSelection: true,
  headerCheckboxSelection: false, // Evitar doble checkbox
  rowMultiSelectWithClick: false,
  suppressRowDeselection: false
};

/**
 * Configuración para grids de solo lectura (sin edición)
 */
export const readOnlyGridOptions = {
  ...gridOptionsFiori,
  editable: false,
  suppressClickEdit: true,
  rowSelection: 'single'
};

/**
 * Configuración para grids con grouping habilitado
 */
export const groupingGridOptions = {
  ...gridOptionsFiori,
  autoGroupColumnDef: {
    headerName: 'Grupo',
    minWidth: 200,
    cellRendererParams: {
      suppressCount: false,
      checkbox: true
    }
  },
  groupSelectsChildren: true,
  groupSelectsFiltered: true,
  suppressRowGroupHidesColumns: true
};