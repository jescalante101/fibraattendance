export interface ColumnConfig {
  key: string;           // Nombre de la propiedad en el modelo (ej: 'nroDoc')
  label: string;         // Etiqueta amigable para mostrar (ej: 'Documento')
  visible: boolean;      // Si la columna está visible
  required: boolean;     // Si es obligatoria (no se puede ocultar)
  sortable?: boolean;    // Si se puede ordenar por esta columna
  width?: string;        // Ancho personalizado (ej: '150px', '20%')
  type?: ColumnType;     // Tipo de dato para renderizado especial
  align?: 'left' | 'center' | 'right'; // Alineación del contenido
  description?: string;  // Descripción de ayuda para la columna
}

export type ColumnType = 
  | 'text'           // Texto normal
  | 'number'         // Números
  | 'date'           // Fechas
  | 'datetime'       // Fecha y hora
  | 'email'          // Correos electrónicos
  | 'phone'          // Teléfonos
  | 'currency'       // Moneda
  | 'percentage'     // Porcentajes
  | 'boolean'        // Si/No, True/False
  | 'badge'          // Pills/badges (estados)
  | 'avatar'         // Avatares/imágenes
  | 'actions'        // Columna de acciones
  | 'custom';        // Renderizado personalizado

export interface ColumnManagerConfig {
  title?: string;                    // Título del popover (ej: "Gestionar Columnas")
  showSelectAll?: boolean;           // Mostrar checkbox "Seleccionar Todo"
  showReset?: boolean;               // Mostrar botón "Restaurar"
  groupByCategory?: boolean;         // Agrupar columnas por categorías
  persistKey?: string;               // Clave para persistir en localStorage
  minVisibleColumns?: number;        // Mínimo de columnas que deben estar visibles
  maxVisibleColumns?: number;        // Máximo de columnas que pueden estar visibles
  searchable?: boolean;              // Permitir buscar columnas
  position?: 'left' | 'right';       // Posición del popover
}

export interface ColumnGroup {
  name: string;                      // Nombre del grupo (ej: "Información Personal")
  columns: ColumnConfig[];           // Columnas en este grupo
  collapsed?: boolean;               // Si el grupo está colapsado
}

export interface ColumnChangeEvent {
  column: ColumnConfig;              // Columna que cambió
  allColumns: ColumnConfig[];        // Todas las columnas actuales
  visibleColumns: ColumnConfig[];    // Solo columnas visibles
}

export interface ColumnManagerState {
  columns: ColumnConfig[];
  groups?: ColumnGroup[];
  visibleCount: number;
  totalCount: number;
}

// Configuraciones predefinidas para tipos comunes de datos
export const COLUMN_TYPE_DEFAULTS: Record<ColumnType, Partial<ColumnConfig>> = {
  text: { align: 'left', width: 'auto' },
  number: { align: 'right', width: '100px' },
  date: { align: 'center', width: '120px' },
  datetime: { align: 'center', width: '160px' },
  email: { align: 'left', width: '200px' },
  phone: { align: 'left', width: '120px' },
  currency: { align: 'right', width: '120px' },
  percentage: { align: 'right', width: '80px' },
  boolean: { align: 'center', width: '80px' },
  badge: { align: 'center', width: '100px' },
  avatar: { align: 'center', width: '60px' },
  actions: { align: 'right', width: '120px', sortable: false },
  custom: { align: 'left', width: 'auto' }
};

// Función helper para detectar tipo de columna basado en el nombre de la propiedad
export function detectColumnType(propertyName: string, sampleValue?: any): ColumnType {
  const name = propertyName.toLowerCase();
  
  // Detectar por nombre de propiedad
  if (name.includes('email') || name.includes('correo')) return 'email';
  if (name.includes('phone') || name.includes('telefono') || name.includes('celular')) return 'phone';
  if (name.includes('fecha') || name.includes('date')) return 'date';
  if (name.includes('precio') || name.includes('amount') || name.includes('monto')) return 'currency';
  if (name.includes('porcentaje') || name.includes('percent')) return 'percentage';
  if (name.includes('id') && (name.endsWith('id') || name.startsWith('id'))) return 'number';
  if (name.includes('activ') || name.includes('enable') || name.includes('visible')) return 'boolean';
  if (name.includes('estado') || name.includes('status') || name.includes('tipo')) return 'badge';
  if (name.includes('action') || name.includes('acciones')) return 'actions';
  if (name.includes('avatar') || name.includes('photo') || name.includes('imagen')) return 'avatar';
  
  // Detectar por valor de muestra
  if (sampleValue !== undefined && sampleValue !== null) {
    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (typeof sampleValue === 'string') {
      // Verificar si parece una fecha ISO
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleValue)) return 'datetime';
      if (/^\d{4}-\d{2}-\d{2}$/.test(sampleValue)) return 'date';
      // Verificar si parece un email
      if (/@.*\./.test(sampleValue)) return 'email';
    }
  }
  
  return 'text'; // Por defecto
}

// Función helper para generar etiquetas amigables
export function generateFriendlyLabel(propertyName: string): string {
  const commonLabels: Record<string, string> = {
    // IDs
    'personalId': 'ID Personal',
    'companiaId': 'ID Compañía',
    'areaId': 'ID Área',
    'cargoId': 'ID Cargo',
    'ccostoId': 'ID Centro Costo',
    'planillaId': 'ID Planilla',
    
    // Información personal
    'nroDoc': 'Documento',
    'nombres': 'Nombres',
    'apellidoPaterno': 'Apellido Paterno',
    'apellidoMaterno': 'Apellido Materno',
    'fechaNacimiento': 'Fecha Nacimiento',
    'sexoId': 'Sexo',
    'direccion': 'Dirección',
    'telefono': 'Teléfono',
    'email': 'Correo Electrónico',
    
    // Información laboral
    'fechaIngreso': 'Fecha Ingreso',
    'fechaCese': 'Fecha Cese',
    'areaDescripcion': 'Área',
    'cargoDescripcion': 'Cargo',
    'ccostoDescripcion': 'Centro de Costo',
    'categoriaAuxiliarDescripcion': 'Sede',
    'categoriaAuxiliar2Descripcion': 'Categoría Auxiliar 2',
    
    // Comunes
    'active': 'Activo',
    'visible': 'Visible',
    'enabled': 'Habilitado',
    'createdAt': 'Fecha Creación',
    'updatedAt': 'Fecha Actualización',
    'createdBy': 'Creado Por',
    'updatedBy': 'Actualizado Por'
  };
  
  // Si hay una etiqueta específica, usarla
  if (commonLabels[propertyName]) {
    return commonLabels[propertyName];
  }
  
  // Generar etiqueta a partir del nombre de la propiedad
  return propertyName
    .replace(/([A-Z])/g, ' $1') // Separar camelCase
    .replace(/^./, str => str.toUpperCase()) // Capitalizar primera letra
    .trim();
}