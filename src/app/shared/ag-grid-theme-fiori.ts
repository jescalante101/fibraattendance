// ag-grid-theme-fiori.ts - Tema SAP Fiori profesional y personalizado para ag-Grid
import { ColDef, GridOptions, SideBarDef, themeBalham, themeQuartz, GridApi, GridReadyEvent, FirstDataRenderedEvent, GridSizeChangedEvent, RowHeightParams, Column } from 'ag-grid-community';

/**
 * =================================================================================
 * THEME FIORI PARAMS
 * Basado en themeQuartz y alineado con tailwind.config.js
 * Documentación de variables: https://www.ag-grid.com/angular-data-grid/theming-parameters/
 * =================================================================================
 */

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
 
  // Tema y Estilo
  theme: 'legacy', // 
  
  // Paginación
  paginationPageSize: 50,
  paginationPageSizeSelector: [25, 50, 100, 200],
  
  // Selección
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  rowDragManaged: true,

  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100
  },
  
  // UX y Animaciones
  animateRows: true,
  enableCellTextSelection: true,
  
  // Rendimiento
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false,
  
  
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
 * DYNAMIC VERTICAL RESIZING
 * Funcionalidad para ajustar automáticamente la altura de las filas según el espacio disponible
 * =================================================================================
 */

// Variables para el dynamic resizing
let minRowHeight = 32; // Altura mínima por defecto (se actualiza desde el tema)
let currentRowHeight = 32;

/**
 * Actualiza la altura de las filas dinámicamente basado en el espacio disponible
 */
const updateRowHeight = (params: { api: GridApi }) => {
  // Obtener la altura del viewport del grid body (excluyendo headers)
  const bodyViewport = document.querySelector(".ag-body-viewport");
  if (!bodyViewport) {
    return;
  }

  const gridHeight = bodyViewport.clientHeight;
  const renderedRowCount = params.api.getDisplayedRowCount();

  // Si las filas * altura mínima es mayor que la altura disponible, usar altura mínima
  if (renderedRowCount * minRowHeight >= gridHeight) {
    if (currentRowHeight !== minRowHeight) {
      currentRowHeight = minRowHeight;
      params.api.resetRowHeights();
    }
  } else {
    // Establecer la altura de la fila al espacio disponible / número de filas
    currentRowHeight = Math.floor(gridHeight / renderedRowCount);
    params.api.resetRowHeights();
  }
};

/**
 * Manejador para el evento onFirstDataRendered
 */
function onFirstDataRendered(params: FirstDataRenderedEvent) {
  updateRowHeight(params);
}

/**
 * Manejador para el evento onGridSizeChanged
 */
function onGridSizeChanged(params: GridSizeChangedEvent) {
  updateRowHeight(params);
}

/**
 * Manejador para onGridReady que inicializa la altura mínima
 */
function onGridReady(params: GridReadyEvent) {
  minRowHeight = params.api.getSizesForCurrentTheme().rowHeight;
  currentRowHeight = minRowHeight;
}

/**
 * Función para obtener la altura de fila dinámica
 */
function getRowHeight(params: RowHeightParams): number {
  return currentRowHeight;
}

/**
 * =================================================================================
 * DYNAMIC WIDTH/COLUMN VISIBILITY
 * Funcionalidad para mostrar/ocultar columnas según el ancho disponible
 * =================================================================================
 */

/**
 * Maneja el redimensionamiento dinámico de columnas basado en el ancho disponible
 */
function onGridSizeChangedDynamic(params: GridSizeChangedEvent) {
  // Obtener el ancho actual del grid
  const gridWidth = document.querySelector(".ag-body-viewport")?.clientWidth;
  if (!gridWidth) return;

  // Arrays para rastrear qué columnas mostrar/ocultar
  const columnsToShow: string[] = [];
  const columnsToHide: string[] = [];

  // Iterar sobre todas las columnas y calcular cuántas caben
  let totalColsWidth = 0;
  const allColumns = params.api.getColumns();
  
  if (allColumns && allColumns.length > 0) {
    for (let i = 0; i < allColumns.length; i++) {
      const column = allColumns[i];
      const colDef = column.getColDef();
      
      // Siempre mostrar columnas requeridas (checkbox, acciones)
      if (colDef.pinned || colDef.lockPosition) {
        columnsToShow.push(column.getColId());
        totalColsWidth += column.getMinWidth() || 100;
      } else {
        totalColsWidth += column.getMinWidth() || 100;
        if (totalColsWidth > gridWidth) {
          columnsToHide.push(column.getColId());
        } else {
          columnsToShow.push(column.getColId());
        }
      }
    }
  }

  // Mostrar/ocultar columnas basado en el ancho actual
  params.api.setColumnsVisible(columnsToShow, true);
  params.api.setColumnsVisible(columnsToHide, false);

  // Esperar hasta que las columnas terminen de moverse y llenar
  // cualquier espacio disponible para asegurar que no hay gaps
  window.setTimeout(() => {
    params.api.sizeColumnsToFit();
  }, 10);
}

/**
 * Manejador para onFirstDataRendered con auto-sizing
 */
function onFirstDataRenderedDynamic(params: FirstDataRenderedEvent) {
  // Primero manejar el height dinámico
  updateRowHeight(params);
  
  // Luego ajustar las columnas al ancho disponible
  params.api.sizeColumnsToFit();
}

/**
 * =================================================================================
 * CONFIGURACIONES ESPECÍFICAS PARA DYNAMIC RESIZING
 * =================================================================================
 */

// Opciones del Grid con Dynamic Vertical Resizing habilitado
export const gridOptionsFioriWithDynamicResize: GridOptions = {
  ...gridOptionsFiori,
  
  // Configuración para dynamic resizing
  autoSizeStrategy: {
    type: "fitGridWidth",
  },
  
  // Event handlers para dynamic resizing (solo height)
  onGridReady: onGridReady,
  onFirstDataRendered: onFirstDataRendered,
  onGridSizeChanged: onGridSizeChanged,
  getRowHeight: getRowHeight,
};

// Opciones del Grid con Dynamic Height + Width habilitado
export const gridOptionsFioriWithFullDynamicResize: GridOptions = {
  ...gridOptionsFiori,
  
  // Configuración para dynamic resizing completo
  autoSizeStrategy: {
    type: "fitGridWidth",
  },
  
  // Event handlers para dynamic resizing completo (height + width)
  onGridReady: onGridReady,
  onFirstDataRendered: onFirstDataRenderedDynamic,
  onGridSizeChanged: (params: GridSizeChangedEvent) => {
    // Manejar tanto height como width dinámicos
    updateRowHeight(params);
    onGridSizeChangedDynamic(params);
  },
  getRowHeight: getRowHeight,
};

// Definición de columna optimizada para dynamic resizing
export const defaultColDefFioriDynamic: ColDef = {
  ...defaultColDefFiori,
  // Configuraciones específicas para que funcione bien con dynamic resizing
  wrapText: true, // Permitir wrap de texto
  autoHeight: false, // Deshabilitado porque usamos altura dinámica
  cellStyle: {
    ...defaultColDefFiori.cellStyle,
    whiteSpace: 'normal', // Permitir salto de línea
    wordBreak: 'break-word', // Romper palabras largas
  },
};

/**
 * =================================================================================
 * FUNCIONES UTILITARIAS
 * =================================================================================
 */

/**
 * Crea opciones de grid Fiori estándar
 */
export function createFioriGridOptions(customGridOptions: GridOptions = {}): GridOptions {
  return {
    ...gridOptionsFiori,
    localeText: localeTextFiori,
    ...customGridOptions,
  };
}

/**
 * Crea opciones de grid Fiori con Dynamic Vertical Resizing habilitado
 */
export function createFioriGridOptionsWithDynamicResize(customGridOptions: GridOptions = {}): GridOptions {
  return {
    ...gridOptionsFioriWithDynamicResize,
    localeText: localeTextFiori,
    ...customGridOptions,
  };
}

/**
 * Crea opciones de grid Fiori con Dynamic Height + Width habilitado (RECOMENDADO)
 */
export function createFioriGridOptionsWithFullDynamicResize(customGridOptions: GridOptions = {}): GridOptions {
  return {
    ...gridOptionsFioriWithFullDynamicResize,
    localeText: localeTextFiori,
    ...customGridOptions,
  };
}

/**
 * Función utilitaria para aplicar configuraciones específicas para dynamic resizing en columnDefs
 */
export function applyDynamicResizeToColumns(columnDefs: ColDef[]): ColDef[] {
  return columnDefs.map(colDef => ({
    ...colDef,
    // Asegurar que las columnas tengan minWidth y maxWidth apropiados
    minWidth: colDef.minWidth || 100,
    maxWidth: colDef.maxWidth || undefined,
    // Configurar para que funcione bien con dynamic resizing
    wrapText: colDef.wrapText !== false, // Por defecto true, a menos que se especifique false
    autoHeight: false,
    cellStyle: {
      ...colDef.cellStyle,
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  }));
}

/**
 * Función avanzada para aplicar configuraciones con prioridades de columnas para dynamic width
 * Las columnas con mayor prioridad se mantienen visibles más tiempo
 */
export function applyDynamicResizeToColumnsWithPriority(
  columnDefs: ColDef[], 
  priorities: { [field: string]: number } = {}
): ColDef[] {
  return columnDefs.map((colDef, index) => {
    const priority = priorities[colDef.field || ''] || index; // Por defecto usar el orden
    
    return {
      ...colDef,
      // Asegurar configuraciones para dynamic resizing
      minWidth: colDef.minWidth || 100,
      maxWidth: colDef.maxWidth || undefined,
      wrapText: colDef.wrapText !== false,
      autoHeight: false,
      
      // Añadir metadatos para el algoritmo de prioridad
      suppressColumnsToolPanel: colDef.suppressColumnsToolPanel || false,
      // Usar un campo personalizado para guardar la prioridad
      headerTooltip: colDef.headerTooltip || `Prioridad: ${priority}`,
      
      cellStyle: {
        ...colDef.cellStyle,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    };
  });
}
