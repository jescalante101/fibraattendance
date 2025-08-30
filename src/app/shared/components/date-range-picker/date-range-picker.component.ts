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
import { HolidaysService } from 'src/app/core/services/holidays.service';
import { HolidayYear } from 'src/app/core/models/holiday.model';

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
  @Input() disableHolidays = false;
  
  // Output events
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() dateSelected = new EventEmitter<Date[]>();
  @Output() pickerOpen = new EventEmitter<void>();
  @Output() pickerClose = new EventEmitter<void>();
  
  // Internal state
  selectedDateRange: Date[] = [];
  currentValue: DateRange = { start: '', end: '' };
  private holidays: string[] = [];
  
  // ControlValueAccessor callbacks
  private onChange = (value: DateRange) => {};
  private onTouched = () => {
    this.wasTouched = true;
  };
  
  // Flatpickr configuration
  flatpickrDefaults: FlatpickrDefaultsInterface = {};

  constructor(private cdr: ChangeDetectorRef, private holidaysService: HolidaysService) {}

  ngOnInit(): void {
    if (this.disableHolidays) {
      this.loadHolidays();
    } else {
      this.initializeFlatpickrConfig();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private loadHolidays(): void {
    this.holidaysService.getHolidays().subscribe((holidayYears: HolidayYear[]) => {
      const holidayDates: string[] = [];
      holidayYears.forEach(year => {
        year.hld1s.forEach(holiday => {
          // Fix timezone parsing: Force local date interpretation
          const start = this.parseLocalDate(holiday.strDate);
          const end = this.parseLocalDate(holiday.endDate);
          
          // Fix date mutation bug: Use milliseconds instead of mutating original date
          const startTime = start.getTime();
          const endTime = end.getTime();
          const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day
          
          for (let time = startTime; time <= endTime; time += oneDay) {
            const currentDate = new Date(time);
            holidayDates.push(this.formatDate(currentDate));
          }
        });
      });
      this.holidays = holidayDates;
      this.initializeFlatpickrConfig();
    });
  }

  /**
   * Initialize Flatpickr configuration based on inputs
   */
  private initializeFlatpickrConfig(): void {
    const disableFunctions = [];
    if (this.disabled) {
      disableFunctions.push(() => true);
    }
    if (this.disableHolidays && this.holidays.length > 0) {
      disableFunctions.push((date: Date) => {
        const dateStr = this.formatDate(date);
        return this.holidays.includes(dateStr);
      });
    }

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
      disable: disableFunctions,
      // Configuración para navegación de meses mejorada
      showMonths: 1, // Mostrar un mes
      enableTime: false, // Sin selector de tiempo
      nextArrow: '<svg class="fill-current" width="7" height="11" viewBox="0 0 7 11"><path d="m2.1 0 3.5 3.5-3.5 3.5-.7-.7 2.8-2.8L.7.7 2.1 0z"/></svg>',
      prevArrow: '<svg class="fill-current" width="7" height="11" viewBox="0 0 7 11"><path d="M5.6 0l.7.7-2.8 2.8 2.8 2.8-.7.7L2.1 3.5 5.6 0z"/></svg>',
      // Permitir navegación libre por meses/años
      disableMobile: true // Evitar el picker nativo en móviles
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
    // Don't call onTouched() here to avoid marking as touched during reset
    
    console.log('🔄 Dates reset');
    this.cdr.detectChanges();
  }

  /**
   * Parse date string as local date (prevents timezone issues)
   * Converts "2025-08-12" to local date instead of UTC
   */
  private parseLocalDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // If it's already a complete date string with time, use it as is
    if (dateInput.includes('T') || dateInput.includes(' ')) {
      return new Date(dateInput);
    }
    
    // For date-only strings (YYYY-MM-DD), force local interpretation
    // by adding midday time to avoid timezone edge cases
    const dateString = dateInput.toString();
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    
    // Create date in local timezone (month is 0-indexed in Date constructor)
    return new Date(year, month - 1, day, 12, 0, 0);
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
    // Show error only if:
    // 1. Component is required
    // 2. Component is invalid (no proper date range)
    // 3. User has interacted with it (touched) but hasn't provided valid input
    
    if (!this.required) {
      return false;
    }
    
    const isInvalid = !this.isValid();
    const hasBeenTouched = this.wasTouched;
    
    // Don't show error if we have valid dates
    if (this.currentValue.start && this.currentValue.end) {
      return false;
    }
    
    // Show error only if touched and invalid
    return isInvalid && hasBeenTouched;
  }

  // Track if the component has been touched
  private wasTouched = false;

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

  /**
   * Handle input focus
   */
  onInputFocus(): void {
    this.wasTouched = true;
    this.pickerOpen.emit();
  }

  /**
   * Handle input blur
   */
  onInputBlur(): void {
    this.onTouched();
    this.pickerClose.emit();
  }

  // ControlValueAccessor implementation
  writeValue(value: DateRange | null): void {
    if (value && value.start && value.end) {
      this.currentValue = value;
      
      // Use parseLocalDate to handle timezone issues consistently
      const startDate = this.parseLocalDate(value.start);
      const endDate = this.parseLocalDate(value.end);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        this.selectedDateRange = [startDate, endDate];
        console.log('📅 writeValue: Updated with preset dates:', value);
        
        // Don't mark as touched when programmatically setting value (e.g., via preset buttons)
        // This ensures we don't show error state immediately
        
        // Force change detection to update UI
        this.cdr.detectChanges();
      }
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