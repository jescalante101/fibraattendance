// Mock data para el modal de creación de días compensatorios
// Este archivo contiene la estructura de datos de referencia para el desarrollo

export interface AreaOption {
  id: number;
  name: string;
  departmentName: string;
  employeeCount: number;
}

export interface Employee {
  id: string;
  fullName: string;
  documentNumber: string;
  position: string;
  department: string;
  area: string;
  avatar?: string;
  isSelected: boolean;
}

export interface CompensatoryDayFormData {
  areaId: number;
  areaName: string;
  holidayWorkedDate: string;
  compensatoryDayOffDate: string;
  reason: string;
  selectedEmployees: Employee[];
}

// Mock de áreas disponibles para el autocomplete
export const MOCK_AREAS: AreaOption[] = [
  { id: 1, name: "Producción Hilado", departmentName: "Producción", employeeCount: 45 },
  { id: 2, name: "Producción Tejido", departmentName: "Producción", employeeCount: 38 },
  { id: 3, name: "Control de Calidad", departmentName: "Calidad", employeeCount: 12 },
  { id: 4, name: "Mantenimiento Industrial", departmentName: "Mantenimiento", employeeCount: 18 },
  { id: 5, name: "Logística Interna", departmentName: "Logística", employeeCount: 15 },
  { id: 6, name: "Recursos Humanos", departmentName: "Administración", employeeCount: 8 },
  { id: 7, name: "Contabilidad", departmentName: "Administración", employeeCount: 6 },
  { id: 8, name: "Sistemas", departmentName: "TI", employeeCount: 4 }
];

// Mock de empleados disponibles (se filtra por área seleccionada)
export const MOCK_EMPLOYEES: Employee[] = [
  // Área Producción Hilado (areaId: 1)
  {
    id: "EMP001",
    fullName: "Juan Carlos Pérez González",
    documentNumber: "12345678",
    position: "Operario de Hilado",
    department: "Producción",
    area: "Producción Hilado",
    isSelected: false
  },
  {
    id: "EMP002", 
    fullName: "María Elena Rodríguez Vega",
    documentNumber: "87654321",
    position: "Supervisora de Turno",
    department: "Producción",
    area: "Producción Hilado",
    isSelected: false
  },
  {
    id: "EMP003",
    fullName: "Carlos Alberto Mendoza Silva",
    documentNumber: "11223344",
    position: "Técnico de Máquinas",
    department: "Producción",
    area: "Producción Hilado",
    isSelected: false
  },
  {
    id: "EMP004",
    fullName: "Ana Sofía Herrera López",
    documentNumber: "44332211",
    position: "Operaria de Hilado",
    department: "Producción",
    area: "Producción Hilado",
    isSelected: false
  },
  {
    id: "EMP005",
    fullName: "Roberto Francisco Díaz Castro",
    documentNumber: "55667788",
    position: "Jefe de Línea",
    department: "Producción",
    area: "Producción Hilado",
    isSelected: false
  },

  // Área Producción Tejido (areaId: 2)
  {
    id: "EMP010",
    fullName: "Patricia Isabel Morales Torres",
    documentNumber: "99887766",
    position: "Operaria de Tejido",
    department: "Producción",
    area: "Producción Tejido",
    isSelected: false
  },
  {
    id: "EMP011",
    fullName: "Luis Fernando García Ruiz",
    documentNumber: "33445566",
    position: "Técnico de Telares",
    department: "Producción",
    area: "Producción Tejido",
    isSelected: false
  },
  {
    id: "EMP012",
    fullName: "Sandra Milena Vargas Peña",
    documentNumber: "77889900",
    position: "Supervisora de Calidad",
    department: "Producción", 
    area: "Producción Tejido",
    isSelected: false
  },

  // Área Control de Calidad (areaId: 3)
  {
    id: "EMP020",
    fullName: "Fernando José Ramírez Ortiz",
    documentNumber: "66554433",
    position: "Inspector de Calidad",
    department: "Calidad",
    area: "Control de Calidad",
    isSelected: false
  },
  {
    id: "EMP021",
    fullName: "Carmen Rosa Aguirre Flores",
    documentNumber: "22334455",
    position: "Analista de Laboratorio",
    department: "Calidad",
    area: "Control de Calidad",
    isSelected: false
  },

  // Área Mantenimiento Industrial (areaId: 4)
  {
    id: "EMP030",
    fullName: "Miguel Ángel Castillo Núñez",
    documentNumber: "88776655",
    position: "Técnico Electricista",
    department: "Mantenimiento",
    area: "Mantenimiento Industrial",
    isSelected: false
  },
  {
    id: "EMP031",
    fullName: "Jorge Enrique Salinas Ramos",
    documentNumber: "44556677",
    position: "Técnico Mecánico",
    department: "Mantenimiento",
    area: "Mantenimiento Industrial",
    isSelected: false
  }
];

// Mock del formulario inicial
export const INITIAL_FORM_DATA: CompensatoryDayFormData = {
  areaId: 0,
  areaName: '',
  holidayWorkedDate: '',
  compensatoryDayOffDate: '',
  reason: '',
  selectedEmployees: []
};

// Helper function para filtrar empleados por área
export function getEmployeesByArea(areaId: number): Employee[] {
  const area = MOCK_AREAS.find(a => a.id === areaId);
  if (!area) return [];
  
  return MOCK_EMPLOYEES
    .filter(emp => emp.area === area.name)
    .map(emp => ({ ...emp, isSelected: false })); // Reset selection state
}

// Helper function para obtener estadísticas de empleados
export function getEmployeeStats(areaId: number) {
  const employees = getEmployeesByArea(areaId);
  return {
    total: employees.length,
    available: employees.filter(emp => !emp.isSelected).length,
    selected: employees.filter(emp => emp.isSelected).length
  };
}

// Configuración visual del modal
export const MODAL_CONFIG = {
  title: 'Registrar Días Compensatorios',
  width: '1200px',
  height: '800px',
  sections: {
    form: {
      title: 'Información del Registro',
      cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    },
    employees: {
      title: 'Selección de Empleados',
      leftPanel: {
        title: 'Empleados Disponibles',
        subtitle: 'Seleccione los empleados para asignar días compensatorios'
      },
      rightPanel: {
        title: 'Empleados Seleccionados',
        subtitle: 'Empleados que recibirán el día compensatorio'
      }
    }
  },
  buttons: {
    cancel: 'Cancelar',
    save: 'Registrar Días Compensatorios',
    selectAll: 'Seleccionar Todos',
    removeAll: 'Quitar Todos'
  }
};

// Validaciones del formulario
export const FORM_VALIDATIONS = {
  areaId: {
    required: true,
    message: 'Debe seleccionar un área'
  },
  holidayWorkedDate: {
    required: true,
    message: 'Debe ingresar la fecha del día feriado trabajado'
  },
  compensatoryDayOffDate: {
    required: true,
    message: 'Debe ingresar la fecha del día compensatorio'
  },
  reason: {
    required: true,
    minLength: 10,
    maxLength: 200,
    message: 'Debe ingresar una razón válida (10-200 caracteres)'
  },
  selectedEmployees: {
    required: true,
    minItems: 1,
    message: 'Debe seleccionar al menos un empleado'
  }
};