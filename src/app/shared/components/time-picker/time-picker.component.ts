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

@Component({
  selector: 'app-time-picker',
  templateUrl: './time-picker.component.html',
  styleUrls: ['./time-picker.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimePickerComponent),
      multi: true
    }
  ]
})
export class TimePickerComponent implements ControlValueAccessor, OnInit, OnDestroy {
  
  // Input properties para configuración
  @Input() placeholder = 'Seleccionar hora...';
  @Input() required = false;
  @Input() disabled = false;
  @Input() minTime?: string; // Formato "HH:mm"
  @Input() maxTime?: string; // Formato "HH:mm"
  @Input() defaultTime?: string; // Formato "HH:mm"
  @Input() showIcon = true;
  @Input() iconName = 'clock';
  @Input() errorClass = 'border-red-500';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() theme: 'default' | 'fiori' = 'default';
  @Input() time24hr = true; // Formato 24 horas por defecto
  @Input() enableSeconds = false; // Habilitar segundos
  
  // Output events
  @Output() timeChange = new EventEmitter<string>();
  @Output() timeSelected = new EventEmitter<Date>();
  @Output() pickerOpen = new EventEmitter<void>();
  @Output() pickerClose = new EventEmitter<void>();
  
  // Internal state
  selectedTime: Date | null = null;
  currentValue: string = '';
  
  // ControlValueAccessor callbacks
  private onChange = (value: string) => {};
  private onTouched = () => {
    this.wasTouched = true;
  };
  
  // Flatpickr configuration
  flatpickrDefaults: FlatpickrDefaultsInterface = {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeFlatpickrConfig();
    
    // Establecer tiempo por defecto si está configurado
    if (this.defaultTime && !this.currentValue) {
      this.writeValue(this.defaultTime);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Initialize Flatpickr configuration for time picker
   */
  private initializeFlatpickrConfig(): void {
    this.flatpickrDefaults = {
      enableTime: true,
      noCalendar: true, // Solo mostrar selector de tiempo
      dateFormat: this.enableSeconds ? 'H:i:S' : 'H:i',
      time24hr: this.time24hr,
      locale: Spanish,
      allowInput: true,
      clickOpens: true,
      minTime: this.minTime,
      maxTime: this.maxTime,
      // defaultDate no es válido para time picker, se manejará en writeValue
      disable: this.disabled ? [() => true] : undefined,
      // Configuración específica para time picker
      disableMobile: true, // Evitar el picker nativo en móviles
      minuteIncrement: 1, // Incremento de minutos
      hourIncrement: 1, // Incremento de horas
    };
  }

  /**
   * Handle time changes from Flatpickr
   */
  handleTimeChange(event: any): void {
    console.log('🕐 TimePicker: handleTimeChange called with:', event);
    
    let selectedDate: Date | null = null;
    
    // Extract time based on event format
    if (Array.isArray(event) && event.length > 0) {
      selectedDate = event[0];
      console.log('🕐 Array format detected');
    } else if (event && event.selectedDates && Array.isArray(event.selectedDates) && event.selectedDates.length > 0) {
      selectedDate = event.selectedDates[0];
      console.log('🕐 angularx-flatpickr format detected');
      console.log('🕐 dateString:', event.dateString);
    } else {
      console.log('⚠️ Unknown format or empty, resetting time');
      this.resetTime();
      return;
    }
    
    console.log('🕐 Time extracted:', selectedDate);
    
    // Process extracted time
    if (selectedDate && selectedDate instanceof Date) {
      this.selectedTime = selectedDate;
      this.currentValue = this.formatTime(selectedDate);
      
      console.log('✅ Time selected:', this.currentValue);
      
      // Emit events
      this.timeChange.emit(this.currentValue);
      this.timeSelected.emit(selectedDate);
      this.onChange(this.currentValue);
      this.onTouched();
      
      // Force change detection
      this.cdr.detectChanges();
      
    } else {
      // Invalid time
      this.resetTime();
    }
  }

  /**
   * Reset time to empty state
   */
  private resetTime(): void {
    this.selectedTime = null;
    this.currentValue = '';
    
    this.timeChange.emit(this.currentValue);
    this.onChange(this.currentValue);
    // Don't call onTouched() here to avoid marking as touched during reset
    
    console.log('🔄 Time reset');
    this.cdr.detectChanges();
  }

  /**
   * Format time to string
   */
  private formatTime(date: Date): string {
    if (!date || !(date instanceof Date)) {
      console.log('❌ formatTime: Invalid date, returning empty string');
      return '';
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    let formatted = `${hours}:${minutes}`;
    
    if (this.enableSeconds) {
      const seconds = String(date.getSeconds()).padStart(2, '0');
      formatted += `:${seconds}`;
    }
    
    console.log('✅ formatTime result:', formatted);
    return formatted;
  }

  /**
   * Check if the current time is valid
   */
  isValid(): boolean {
    return !!this.currentValue;
  }

  /**
   * Check if the component should show error state
   */
  hasError(): boolean {
    // Show error only if:
    // 1. Component is required
    // 2. Component is invalid (no time selected)
    // 3. User has interacted with it (touched) but hasn't provided valid input
    
    if (!this.required) {
      return false;
    }
    
    const isInvalid = !this.isValid();
    const hasBeenTouched = this.wasTouched;
    
    // Don't show error if we have valid time
    if (this.currentValue) {
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
  writeValue(value: string | null): void {
    if (value) {
      this.currentValue = value;
      
      // Convert string time to Date object for Flatpickr
      const timeDate = this.parseTimeString(value);
      
      if (timeDate) {
        this.selectedTime = timeDate;
        console.log('🕐 writeValue: Updated with time:', value);
        
        // Don't mark as touched when programmatically setting value
        // This ensures we don't show error state immediately
        
        // Force change detection to update UI
        this.cdr.detectChanges();
      }
    } else {
      this.resetTime();
    }
  }

  /**
   * Parse time string to Date object
   */
  private parseTimeString(timeStr: string): Date | null {
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      
      // Create a Date object with today's date but with the specified time
      const date = new Date();
      date.setHours(hours, minutes, seconds, 0);
      
      return date;
    }
    return null;
  }

  registerOnChange(fn: (value: string) => void): void {
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