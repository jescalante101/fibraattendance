import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent, ColumnGroup, ColumnManagerState, detectColumnType, generateFriendlyLabel } from './column-config.interface';

@Component({
  selector: 'app-column-manager',
  templateUrl: './column-manager.component.html',
  styleUrls: ['./column-manager.component.css']
})
export class ColumnManagerComponent implements OnInit, OnDestroy {
  @Input() config!: ColumnManagerConfig;
  @Input() columns!: ColumnConfig[];
  @Input() dataSource?: any[]; // Para detección automática de propiedades
  @Input() modelType?: any; // Tipo del modelo para detección automática
  @Output() columnChange = new EventEmitter<ColumnChangeEvent>();
  @Output() columnsApply = new EventEmitter<ColumnConfig[]>();
  @Output() columnsReset = new EventEmitter<void>();

  @ViewChild('popoverButton', { static: true }) popoverButton!: ElementRef;
  @ViewChild('popoverContent', { static: true }) popoverContent!: ElementRef;

  currentColumns: ColumnConfig[] = [];
  showPopover = false;
  searchTerm = '';
  filteredColumns: ColumnConfig[] = [];
  groups: ColumnGroup[] = [];
  popoverPosition: 'left' | 'right' = 'left';

  // Estados para el componente
  visibleCount = 0;
  totalCount = 0;
  allSelected = false;
  indeterminate = false;

  ngOnInit() {
    this.initializeColumns();
    this.updateCounters();
    this.createGroups();
    this.setupSearch();
    this.setupClickOutside();
  }

  ngOnDestroy() {
    this.removeClickOutside();
  }

  private initializeColumns() {
    // Si no se proporcionan columnas, auto-detectarlas del dataSource
    if (!this.columns || this.columns.length === 0) {
      this.autoDetectColumns();
    } else {
      this.currentColumns = [...this.columns];
    }
    
    // Aplicar configuraciones predeterminadas si no están definidas
    this.currentColumns = this.currentColumns.map(col => ({
      ...col,
      visible: col.visible !== undefined ? col.visible : true,
      required: col.required !== undefined ? col.required : false,
      sortable: col.sortable !== undefined ? col.sortable : true
    }));
  }

  private autoDetectColumns() {
    if (!this.dataSource || this.dataSource.length === 0) {
      this.currentColumns = [];
      return;
    }

    const sampleItem = this.dataSource[0];
    const detectedColumns: ColumnConfig[] = [];

    // Iterar sobre todas las propiedades del primer elemento
    Object.keys(sampleItem).forEach(key => {
      // Saltar propiedades que no deberían ser columnas visibles
      if (key === 'selected' || key.startsWith('_')) return;

      const sampleValue = sampleItem[key];
      const columnType = detectColumnType(key, sampleValue);
      
      const column: ColumnConfig = {
        key,
        label: generateFriendlyLabel(key),
        visible: true,
        required: ['personalId', 'nroDoc', 'nombres'].includes(key), // Campos obligatorios comunes
        sortable: columnType !== 'actions',
        type: columnType
      };

      detectedColumns.push(column);
    });

    this.currentColumns = detectedColumns;
  }

  private updateCounters() {
    this.totalCount = this.currentColumns.length;
    this.visibleCount = this.currentColumns.filter(col => col.visible).length;
    
    // Actualizar estado del checkbox "Seleccionar Todo"
    const visibleOptionalColumns = this.currentColumns.filter(col => !col.required);
    const checkedOptionalColumns = visibleOptionalColumns.filter(col => col.visible);
    
    this.allSelected = visibleOptionalColumns.length > 0 && checkedOptionalColumns.length === visibleOptionalColumns.length;
    this.indeterminate = checkedOptionalColumns.length > 0 && checkedOptionalColumns.length < visibleOptionalColumns.length;
  }

  private createGroups() {
    if (!this.config.groupByCategory) {
      this.groups = [];
      return;
    }

    // Agrupar columnas por categorías basadas en el tipo o nombre
    const groupMap = new Map<string, ColumnConfig[]>();

    this.currentColumns.forEach(column => {
      let groupName = 'General';
      
      // Determinar grupo basado en el nombre de la propiedad
      if (column.key.includes('fecha') || column.type === 'date' || column.type === 'datetime') {
        groupName = 'Fechas';
      } else if (['personalId', 'nroDoc', 'nombres', 'apellidoPaterno', 'apellidoMaterno'].includes(column.key)) {
        groupName = 'Información Personal';
      } else if (column.key.includes('area') || column.key.includes('cargo') || column.key.includes('ccosto')) {
        groupName = 'Información Laboral';
      } else if (column.key.includes('categoria') || column.key.includes('planilla') || column.key.includes('compania')) {
        groupName = 'Organización';
      } else if (column.type === 'actions') {
        groupName = 'Acciones';
      }

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(column);
    });

    // Convertir mapa a array de grupos
    this.groups = Array.from(groupMap.entries()).map(([name, columns]) => ({
      name,
      columns,
      collapsed: false
    }));
  }

  private setupSearch() {
    this.filteredColumns = [...this.currentColumns];
  }

  togglePopover() {
    if (!this.showPopover) {
      this.calculatePopoverPosition();
      this.filterColumns();
    }
    this.showPopover = !this.showPopover;
  }

  closePopover() {
    this.showPopover = false;
  }

  private calculatePopoverPosition() {
    setTimeout(() => {
      if (!this.popoverButton?.nativeElement) return;

      const buttonRect = this.popoverButton.nativeElement.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const popoverMinWidth = 350;
      const margin = 20;
      
      const spaceRight = windowWidth - buttonRect.right - margin;
      const spaceLeft = buttonRect.left - margin;
      
      if (spaceRight >= popoverMinWidth) {
        this.popoverPosition = 'left';
      } else if (spaceLeft >= popoverMinWidth) {
        this.popoverPosition = 'right';
      } else {
        this.popoverPosition = spaceRight > spaceLeft ? 'left' : 'right';
      }
    }, 0);
  }

  onColumnToggle(column: ColumnConfig) {
    if (column.required) return; // No permitir ocultar columnas requeridas
    
    column.visible = !column.visible;
    this.updateCounters();
    
    // Verificar límites de columnas visibles
    if (this.config.minVisibleColumns && this.visibleCount < this.config.minVisibleColumns) {
      column.visible = true;
      this.updateCounters();
      return;
    }
    
    if (this.config.maxVisibleColumns && this.visibleCount > this.config.maxVisibleColumns) {
      column.visible = false;
      this.updateCounters();
      return;
    }

    this.columnChange.emit({
      column,
      allColumns: [...this.currentColumns],
      visibleColumns: this.currentColumns.filter(col => col.visible)
    });
  }

  onSelectAllChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    
    // Cambiar solo columnas opcionales (no requeridas)
    this.currentColumns.forEach(column => {
      if (!column.required) {
        column.visible = checked;
      }
    });
    
    this.updateCounters();
    this.columnChange.emit({
      column: null as any,
      allColumns: [...this.currentColumns],
      visibleColumns: this.currentColumns.filter(col => col.visible)
    });
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filterColumns();
  }

  private filterColumns() {
    if (!this.searchTerm.trim()) {
      this.filteredColumns = [...this.currentColumns];
    } else {
      this.filteredColumns = this.currentColumns.filter(column =>
        column.label.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        column.key.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  onApplyColumns() {
    // Persistir configuración si está habilitada
    if (this.config.persistKey) {
      const visibilityMap = this.currentColumns.reduce((map, col) => {
        map[col.key] = col.visible;
        return map;
      }, {} as Record<string, boolean>);
      
      localStorage.setItem(this.config.persistKey, JSON.stringify(visibilityMap));
    }

    this.columnsApply.emit([...this.currentColumns]);
    this.closePopover();
  }

  onResetColumns() {
    // Restaurar configuración original o por defecto
    if (this.config.persistKey) {
      localStorage.removeItem(this.config.persistKey);
    }

    // Resetear a valores por defecto
    this.currentColumns.forEach(column => {
      column.visible = column.required || ['nroDoc', 'nombres', 'areaDescripcion'].includes(column.key);
    });

    this.updateCounters();
    this.createGroups();
    this.filterColumns();
    
    this.columnsReset.emit();
  }

  toggleGroup(group: ColumnGroup) {
    group.collapsed = !group.collapsed;
  }

  getPopoverClasses(): string {
    const baseClasses = 'absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[350px] max-w-[450px] max-h-[500px] overflow-y-auto';
    const positionClasses = this.popoverPosition === 'right' ? 'right-0' : 'left-0';
    return `${baseClasses} ${positionClasses}`;
  }

  private clickOutsideHandler = (event: Event) => {
    if (!this.popoverButton.nativeElement.contains(event.target) &&
        !this.popoverContent.nativeElement.contains(event.target)) {
      this.showPopover = false;
    }
  };

  private setupClickOutside() {
    document.addEventListener('click', this.clickOutsideHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  private removeClickOutside() {
    document.removeEventListener('click', this.clickOutsideHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private resizeHandler = () => {
    if (this.showPopover) {
      this.calculatePopoverPosition();
    }
  };
}