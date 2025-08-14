import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { GenericFilterConfig, FilterState, FilterChangeEvent, FilterConfig } from './filter-config.interface';

@Component({
  selector: 'app-generic-filter',
  templateUrl: './generic-filter.component.html',
  styleUrls: ['./generic-filter.component.css']
})
export class GenericFilterComponent implements OnInit, OnDestroy {
  @Input() config!: GenericFilterConfig;
  @Input() initialValues: FilterState = {};
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();
  @Output() filtersApply = new EventEmitter<FilterState>();
  @Output() filtersClear = new EventEmitter<void>();

  @ViewChild('popoverButton', { static: true }) popoverButton!: ElementRef;
  @ViewChild('popoverContent', { static: true }) popoverContent!: ElementRef;

  currentFilters: FilterState = {};
  showPopover = false;
  activeFiltersCount = 0;
  popoverPosition: 'left' | 'right' | 'center' = 'left'; // Posición calculada dinámicamente

  // Estados para autocompletes individuales
  autocompleteStates: { [key: string]: {
    searchTerm: string;
    showDropdown: boolean;
    filteredOptions: any[];
    highlightedIndex: number;
    selectedItem: any;
  }} = {};

  ngOnInit() {
    this.currentFilters = { ...this.initialValues };
    this.initializeAutocompleteStates();
    this.updateActiveFiltersCount();
    this.setupClickOutside();
    // Inicializar posición por defecto
    this.popoverPosition = this.config.position || 'left';
  }

  ngOnDestroy() {
    this.removeClickOutside();
  }

  private initializeAutocompleteStates() {
    const allFilters = this.getAllFilters();
    allFilters.forEach(filter => {
      if (filter.type === 'autocomplete') {
        this.autocompleteStates[filter.key] = {
          searchTerm: '',
          showDropdown: false,
          filteredOptions: filter.options || [],
          highlightedIndex: -1,
          selectedItem: null
        };

        // Set initial search term if there's a selected value
        const currentValue = this.currentFilters[filter.key];
        if (currentValue && filter.options) {
          const selectedItem = filter.options.find(opt => 
            opt[filter.valueField || 'value'] === currentValue
          );
          if (selectedItem) {
            this.autocompleteStates[filter.key].searchTerm = selectedItem[filter.displayField || 'label'];
            this.autocompleteStates[filter.key].selectedItem = selectedItem;
          }
        }
      }
    });
  }

  private getAllFilters(): FilterConfig[] {
    if (this.config.sections) {
      return this.config.sections.flatMap(section => section.filters);
    }
    return this.config.filters || [];
  }

  private updateActiveFiltersCount() {
    this.activeFiltersCount = Object.keys(this.currentFilters).filter(key => {
      const value = this.currentFilters[key];
      return value !== null && value !== undefined && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  }

  togglePopover() {
    this.showPopover = !this.showPopover;
    if (this.showPopover) {
      // Recalcular posición cada vez que se abre el popover
      this.calculatePopoverPosition();
    }
  }

  private calculatePopoverPosition() {
    // Esperar un tick para que el DOM esté actualizado
    setTimeout(() => {
      if (!this.popoverButton?.nativeElement) return;

      const buttonRect = this.popoverButton.nativeElement.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const popoverMinWidth = 400; // Ancho mínimo del popover según el CSS
      const popoverMaxWidth = 500; // Ancho máximo del popover según el CSS
      const margin = 20; // Margen de seguridad
      
      // Calcular espacio disponible a la derecha e izquierda
      const spaceRight = windowWidth - buttonRect.right - margin;
      const spaceLeft = buttonRect.left - margin;
      
      // Lógica de posicionamiento inteligente:
      // 1. Si hay suficiente espacio a la derecha para el ancho mínimo, usar left (popover hacia la derecha)
      // 2. Si hay suficiente espacio a la izquierda y no hay suficiente a la derecha, usar right
      // 3. Por defecto usar left
      
      if (spaceRight >= popoverMinWidth) {
        this.popoverPosition = 'left'; // Popover se abre hacia la derecha
      } else if (spaceLeft >= popoverMinWidth) {
        this.popoverPosition = 'right'; // Popover se abre hacia la izquierda
      } else {
        // Si no hay suficiente espacio en ningún lado, usar el lado con más espacio
        this.popoverPosition = spaceRight > spaceLeft ? 'left' : 'right';
      }
      
      // Debug info - can be removed in production
      // console.log('Popover position calculated:', this.popoverPosition);
    }, 10); // Incrementar el tiempo para asegurar que el DOM está completamente renderizado
  }

  closePopover() {
    this.showPopover = false;
  }

  onFilterValueChange(filterKey: string, value: any) {
    this.currentFilters[filterKey] = value;
    this.updateActiveFiltersCount();
    
    this.filterChange.emit({
      key: filterKey,
      value: value,
      allFilters: { ...this.currentFilters }
    });
  }

  // Métodos para autocomplete
  onAutocompleteSearch(filterKey: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    const state = this.autocompleteStates[filterKey];
    const filter = this.getAllFilters().find(f => f.key === filterKey);
    
    if (!state || !filter) return;

    state.searchTerm = searchTerm;
    state.showDropdown = true;
    state.highlightedIndex = -1;

    if (!searchTerm.trim()) {
      state.filteredOptions = filter.options || [];
      // Clear selection if search is empty
      state.selectedItem = null;
      this.onFilterValueChange(filterKey, null);
    } else {
      const displayField = filter.displayField || 'label';
      state.filteredOptions = (filter.options || []).filter(option =>
        option[displayField].toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }

  onAutocompleteFocus(filterKey: string) {
    const state = this.autocompleteStates[filterKey];
    if (state) {
      state.showDropdown = true;
    }
  }

  onAutocompleteBlur(filterKey: string) {
    const state = this.autocompleteStates[filterKey];
    if (state) {
      setTimeout(() => {
        state.showDropdown = false;
        
        // If no item is selected and search term doesn't match any option, clear the field
        if (!state.selectedItem && state.searchTerm) {
          const filter = this.getAllFilters().find(f => f.key === filterKey);
          const displayField = filter?.displayField || 'label';
          const matchingOption = (filter?.options || []).find(option =>
            option[displayField].toLowerCase() === state.searchTerm.toLowerCase()
          );
          
          if (!matchingOption) {
            state.searchTerm = '';
            this.onFilterValueChange(filterKey, null);
          }
        }
      }, 150);
    }
  }

  onAutocompleteKeydown(filterKey: string, event: KeyboardEvent) {
    const state = this.autocompleteStates[filterKey];
    if (!state || !state.showDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        state.highlightedIndex = Math.min(state.highlightedIndex + 1, state.filteredOptions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        state.highlightedIndex = Math.max(state.highlightedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (state.highlightedIndex >= 0 && state.highlightedIndex < state.filteredOptions.length) {
          this.selectAutocompleteOption(filterKey, state.filteredOptions[state.highlightedIndex]);
        }
        break;
      case 'Escape':
        state.showDropdown = false;
        break;
    }
  }

  selectAutocompleteOption(filterKey: string, option: any) {
    const state = this.autocompleteStates[filterKey];
    const filter = this.getAllFilters().find(f => f.key === filterKey);
    
    if (!state || !filter) return;

    const displayField = filter.displayField || 'label';
    const valueField = filter.valueField || 'value';

    state.searchTerm = option[displayField];
    state.selectedItem = option;
    state.showDropdown = false;
    
    this.onFilterValueChange(filterKey, option[valueField]);
  }

  onApplyFilters() {
    this.filtersApply.emit({ ...this.currentFilters });
    this.closePopover();
  }

  onClearFilters() {
    this.currentFilters = {};
    this.updateActiveFiltersCount();
    
    // Reset autocomplete states
    Object.keys(this.autocompleteStates).forEach(key => {
      const state = this.autocompleteStates[key];
      state.searchTerm = '';
      state.selectedItem = null;
      state.showDropdown = false;
    });

    this.filtersClear.emit();
    this.closePopover();
  }

  removeFilter(filterKey: string) {
    delete this.currentFilters[filterKey];
    this.updateActiveFiltersCount();
    
    // Reset autocomplete state if it's an autocomplete filter
    if (this.autocompleteStates[filterKey]) {
      this.autocompleteStates[filterKey].searchTerm = '';
      this.autocompleteStates[filterKey].selectedItem = null;
    }

    this.filterChange.emit({
      key: filterKey,
      value: null,
      allFilters: { ...this.currentFilters }
    });
  }

  getFilterDisplayValue(filter: FilterConfig): string {
    const value = this.currentFilters[filter.key];
    if (!value) return '';

    if (filter.type === 'autocomplete' && filter.options) {
      const option = filter.options.find(opt => 
        opt[filter.valueField || 'value'] === value
      );
      return option ? option[filter.displayField || 'label'] : value;
    }

    return value;
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

  getAutocompleteSearchTerm(filterKey: string): string {
    return this.autocompleteStates[filterKey]?.searchTerm || '';
  }

  getOptionValue(option: any, valueField?: string): any {
    return option[valueField || 'value'];
  }

  getOptionDisplay(option: any, displayField?: string): string {
    return option[displayField || 'label'];
  }

  isCheckboxChecked(filterKey: string, value: any): boolean {
    const currentArray = this.currentFilters[filterKey];
    return Array.isArray(currentArray) && currentArray.includes(value);
  }

  setHighlightedIndex(filterKey: string, index: number) {
    const state = this.autocompleteStates[filterKey];
    if (state) {
      state.highlightedIndex = index;
    }
  }

  shouldShowDropdown(filterKey: string): boolean {
    const state = this.autocompleteStates[filterKey];
    return !!(state?.showDropdown && state?.filteredOptions?.length > 0);
  }

  shouldShowEmptyDropdown(filterKey: string): boolean {
    const state = this.autocompleteStates[filterKey];
    return !!(state?.showDropdown && state?.filteredOptions?.length === 0);
  }

  getFilteredOptions(filterKey: string): any[] {
    return this.autocompleteStates[filterKey]?.filteredOptions || [];
  }

  isHighlighted(filterKey: string, index: number): boolean {
    return this.autocompleteStates[filterKey]?.highlightedIndex === index;
  }

  getPopoverClasses(): string {
    const baseClasses = 'absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[400px] max-w-[500px] max-h-[600px] overflow-y-auto';
    
    let positionClasses = '';
    
    // Priorizar la posición calculada dinámicamente sobre la configuración
    const effectivePosition = this.popoverPosition || this.config.position || 'left';
    
    switch (effectivePosition) {
      case 'right':
        positionClasses = 'right-0';
        break;
      case 'left':
        positionClasses = 'left-0';
        break;
      case 'center':
        positionClasses = 'left-1/2 -translate-x-1/2';
        break;
      default:
        positionClasses = 'left-0';
        break;
    }
    
    // Debug info - can be removed in production
    // console.log('Popover classes applied:', `${baseClasses} ${positionClasses}`);
    
    return `${baseClasses} ${positionClasses}`;
  }

  onCheckboxChange(filterKey: string, value: any, event: Event) {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    
    if (!this.currentFilters[filterKey]) {
      this.currentFilters[filterKey] = [];
    }
    
    const currentArray = this.currentFilters[filterKey] as any[];
    
    if (checked) {
      if (!currentArray.includes(value)) {
        currentArray.push(value);
      }
    } else {
      const index = currentArray.indexOf(value);
      if (index > -1) {
        currentArray.splice(index, 1);
      }
    }
    
    this.onFilterValueChange(filterKey, currentArray);
  }
}