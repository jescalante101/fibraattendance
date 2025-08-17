// ag-grid-theme-fiori.ts - Tema SAP Fiori profesional y personalizado para ag-Grid
import { ColDef, GridOptions, SideBarDef, themeQuartz } from 'ag-grid-community';

/**
 * =================================================================================
 * THEME FIORI PARAMS
 * Basado en themeQuartz y alineado con tailwind.config.js
 * Documentación de variables: https://www.ag-grid.com/angular-data-grid/theming-parameters/
 * =================================================================================
 */
export const themeFiori = themeQuartz.withParams({
  // Paleta de colores principal (de tailwind.config.js)
  backgroundColor: 'var(--ag-fiori-background-color, #f9f9f9)',
  foregroundColor: 'var(--ag-fiori-text-color, #32363a)',
  borderColor: 'var(--ag-fiori-border-color, #d1d1d1)',
  
  // Colores de acento y selección
  accentColor: 'var(--ag-fiori-primary-color, #0a6ed1)',
  rowHoverColor: 'var(--ag-fiori-hover-color, #f5f5f5)',
  selectedRowBackgroundColor: 'var(--ag-fiori-active-color, #e3f2fd)',
  
  // Cabeceras
  headerBackgroundColor: 'var(--ag-fiori-muted-color, #f8f9fa)', // Color gris sutil para separar la cabecera
  
  // Tipografía (de tailwind.config.js)
  fontFamily: '"72", "Segoe UI", Arial, sans-serif',
  fontSize: '14px', // 0.875rem (base)
  
  // Espaciado y tamaño
  spacing: 10, // Aumentamos el espaciado para dar más "aire"
  borderRadius: 4, // 0.25rem
  headerHeight: 56, // Aumentamos la altura de la cabecera
  rowHeight: 52,    // Aumentamos la altura de las filas
  
  // Iconos
  iconSize: 18,
  
  // Otros
  oddRowBackgroundColor: 'var(--ag-fiori-muted-color, #f8f9fa)',
  rangeSelectionBackgroundColor: 'rgba(10, 110, 209, 0.1)', // De fiori.primary con alpha
});

/**
 * =================================================================================
 * GRID OPTIONS POR DEFECTO
 * Configuraciones recomendadas para una experiencia Fiori consistente.
 * =================================================================================
 */

// Definiciones de columna por defecto
export const defaultColDefFiori: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  floatingFilter: true, // Filtros flotantes para una UX más rápida
  minWidth: 120,
  flex: 1,
  suppressHeaderMenuButton: false,
  cellStyle: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px', // Padding horizontal
  },
  headerClass: 'fiori-header', // Clase CSS personalizada para cabeceras
};

// Opciones del Grid
export const gridOptionsFiori: GridOptions = {
  defaultColDef: defaultColDefFiori,
  
  // Tema y Estilo
  // theme: themeFiori, // El tema se aplica a través de la clase del contenedor
  domLayout: 'normal',
  
  // Paginación
  pagination: true,
  paginationPageSize: 50,
  paginationPageSizeSelector: [25, 50, 100, 200],
  
  // Selección
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  rowDragManaged: true,
  
  // UX y Animaciones
  animateRows: true,
  enableCellTextSelection: true,
  
  // Rendimiento
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false,
  
  // Menús y Paneles
  sideBar: {
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columnas',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
      },
      {
        id: 'filters',
        labelDefault: 'Filtros',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
      }
    ],
    position: 'right',
    defaultToolPanel: 'columns',
  } as SideBarDef,
  
  // Accesibilidad
  ensureDomOrder: true,
  suppressRowHoverHighlight: false,
};

/**
 * =================================================================================
 * LOCALIZACIÓN EN ESPAÑOL
 * Textos de la interfaz para una experiencia localizada.
 * =================================================================================
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
 * =================================================================================
 * FUNCIÓN UTILITARIA
 * Combina las opciones base, la localización y cualquier personalización adicional.
 * =================================================================================
 */
export function createFioriGridOptions(customGridOptions: GridOptions = {}): GridOptions {
  return {
    ...gridOptionsFiori,
    localeText: localeTextFiori,
    ...customGridOptions,
  };
}
