import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  forwardRef, 
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';

export interface DateRange {
  start: string;
  end: string;
}

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateRangePickerComponent),
      multi: true
    }
  ]
})
export class DateRangePickerComponent implements ControlValueAccessor, OnInit, OnDestroy {
  
  // Input properties para configuración
  @Input() placeholder = 'Seleccionar rango de fechas...';
  @Input() required = false;
  @Input() disabled = false;
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() dateFormat = 'Y-m-d';
  @Input() altFormat = 'd/m/Y';
  @Input() showIcon = true;
  @Input() iconName = 'calendar';
  @Input() errorClass = 'border-red-500';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() theme: 'default' | 'fiori' = 'default';
  
  // Output events
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() dateSelected = new EventEmitter<Date[]>();
  @Output() pickerOpen = new EventEmitter<void>();
  @Output() pickerClose = new EventEmitter<void>();
  
  // Internal state
  selectedDateRange: Date[] = [];
  currentValue: DateRange = { start: '', end: '' };
  
  // ControlValueAccessor callbacks
  private onChange = (value: DateRange) => {};
  private onTouched = () => {};
  
  // Flatpickr configuration
  flatpickrDefaults: FlatpickrDefaultsInterface = {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeFlatpickrConfig();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Initialize Flatpickr configuration based on inputs
   */
  private initializeFlatpickrConfig(): void {
    this.flatpickrDefaults = {
      mode: 'range',
      dateFormat: this.dateFormat,
      locale: Spanish,
      allowInput: true,
      clickOpens: true,
      altInput: true,
      altFormat: this.altFormat,
      minDate: this.minDate,
      maxDate: this.maxDate,
      disable: this.disabled ? [() => true] : undefined
    };
  }

  /**
   * Handle date changes from Flatpickr
   */
  handleDateChange(event: any): void {
    console.log('📅 DateRangePicker: handleDateChange called with:', event);
    
    let selectedDates: Date[] = [];
    
    // Extract dates based on event format
    if (Array.isArray(event)) {
      selectedDates = event;
      console.log('📅 Array directo detectado');
    } else if (event && event.selectedDates && Array.isArray(event.selectedDates)) {
      selectedDates = event.selectedDates;
      console.log('📅 Objeto angularx-flatpickr detectado');
      console.log('📝 dateString:', event.dateString);
    } else {
      console.log('⚠️ Formato no reconocido, reseteando fechas');
      this.resetDates();
      return;
    }
    
    console.log('📅 Fechas extraídas:', selectedDates);
    
    // Process extracted dates
    if (selectedDates.length >= 2) {
      // Complete range selected
      this.selectedDateRange = selectedDates;
      const startDate = this.formatDate(selectedDates[0]);
      const endDate = this.formatDate(selectedDates[1]);
      
      this.currentValue = {
        start: startDate,
        end: endDate
      };
      
      console.log('✅ Full range selected:', this.currentValue);
      
      // Emit events
      this.dateRangeChange.emit(this.currentValue);
      this.dateSelected.emit(selectedDates);
      this.onChange(this.currentValue);
      this.onTouched();
      
      // Force change detection
      this.cdr.detectChanges();
      
    } else if (selectedDates.length === 1) {
      // Only start date selected (incomplete range)
      this.selectedDateRange = selectedDates;
      const startDate = this.formatDate(selectedDates[0]);
      
      this.currentValue = {
        start: startDate,
        end: ''
      };
      
      console.log('⚠️ Only start date selected:', this.currentValue);
      
      // Emit partial selection
      this.dateRangeChange.emit(this.currentValue);
      this.dateSelected.emit(selectedDates);
      this.onChange(this.currentValue);
      this.onTouched();
      
      this.cdr.detectChanges();
    } else {
      // Empty selection
      this.resetDates();
    }
  }

  /**
   * Reset dates to empty state
   */
  private resetDates(): void {
    this.selectedDateRange = [];
    this.currentValue = { start: '', end: '' };
    
    this.dateRangeChange.emit(this.currentValue);
    this.onChange(this.currentValue);
    this.onTouched();
    
    console.log('🔄 Dates reset');
    this.cdr.detectChanges();
  }

  /**
   * Format date to string
   */
  private formatDate(date: Date): string {
    if (!date || !(date instanceof Date)) {
      console.log('❌ formatDate: Invalid date, returning empty string');
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const formatted = `${year}-${month}-${day}`;
    console.log('✅ formatDate result:', formatted);
    
    return formatted;
  }

  /**
   * Check if the current selection is valid (both dates selected)
   */
  isValid(): boolean {
    return !!(this.currentValue.start && this.currentValue.end);
  }

  /**
   * Check if the component should show error state
   */
  hasError(): boolean {
    return this.required && !this.isValid();
  }

  /**
   * Get CSS classes for the input
   */
  getInputClasses(): string {
    const baseClasses = this.getBaseClasses();
    const sizeClasses = this.getSizeClasses();
    const themeClasses = this.getThemeClasses();
    const errorClasses = this.hasError() ? this.errorClass : '';
    
    return `${baseClasses} ${sizeClasses} ${themeClasses} ${errorClasses}`.trim();
  }

  /**
   * Get base CSS classes
   */
  private getBaseClasses(): string {
    return 'w-full border rounded-md bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500';
  }

  /**
   * Get size-specific CSS classes
   */
  private getSizeClasses(): string {
    switch (this.size) {
      case 'sm':
        return 'px-2 py-1.5 text-sm';
      case 'md':
        return 'px-3 py-2 text-base';
      case 'lg':
        return 'px-4 py-3 text-lg';
      default:
        return 'px-2 py-1.5 text-sm';
    }
  }

  /**
   * Get theme-specific CSS classes
   */
  private getThemeClasses(): string {
    switch (this.theme) {
      case 'fiori':
        return 'border-gray-300 focus:ring-fiori-primary focus:border-fiori-primary';
      case 'default':
      default:
        return 'border-gray-300';
    }
  }

  /**
   * Get icon size based on input size
   */
  getIconSize(): string {
    switch (this.size) {
      case 'sm':
        return 'w-3.5 h-3.5';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-3.5 h-3.5';
    }
  }

  /**
   * Get padding for input when icon is shown
   */
  getInputPadding(): string {
    if (!this.showIcon) return '';
    
    switch (this.size) {
      case 'sm':
        return 'pl-7';
      case 'md':
        return 'pl-10';
      case 'lg':
        return 'pl-12';
      default:
        return 'pl-7';
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: DateRange | null): void {
    if (value) {
      this.currentValue = value;
      // If we need to update Flatpickr with the new value, we can do it here
      // This would require storing a reference to the Flatpickr instance
    } else {
      this.resetDates();
    }
  }

  registerOnChange(fn: (value: DateRange) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.initializeFlatpickrConfig();
  }
}