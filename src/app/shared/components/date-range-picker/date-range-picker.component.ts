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
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';
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
  @Input() showIcon = true;
  @Input() iconName = 'calendar';
  @Input() errorClass = 'border-red-500';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() theme: 'default' | 'fiori' = 'default';
  @Input() disableHolidays = true;
  @Input() startDatePlaceholder = 'Fecha inicio';
  @Input() endDatePlaceholder = 'Fecha fin';
  
  // Output events
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() dateSelected = new EventEmitter<Date[]>();
  @Output() pickerOpen = new EventEmitter<void>();
  @Output() pickerClose = new EventEmitter<void>();
  
  // Internal state
  startDate: Date | null = null;
  endDate: Date | null = null;
  currentValue: DateRange = { start: '', end: '' };
  private holidays: Date[] = [];
  private holidayStrings: string[] = [];
  private holidayNames: Map<string, string> = new Map(); // Mapeo fecha -> nombre del feriado
  
  // ControlValueAccessor callbacks
  private onChange = (value: DateRange) => {};
  private onTouched = () => {
    this.wasTouched = true;
  };

  constructor(private cdr: ChangeDetectorRef, private holidaysService: HolidaysService) {}

  ngOnInit(): void {
    if (this.disableHolidays) {
      this.loadHolidays();
    }
  }

  ngOnDestroy(): void {
    // Cleanup MutationObserver
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }
  
  private mutationObserver?: MutationObserver;

  private loadHolidays(): void {
    const currentYear = new Date().getFullYear().toString();
    console.log('🎄 Loading holidays for current year:', currentYear);
    
    this.holidaysService.getHolidaysByYear(currentYear).subscribe({
      next: (holidayYear: HolidayYear) => {
        console.log(`🎄 Processing holidays for year ${currentYear}:`, holidayYear.hld1s.length);
        
        const holidayDates: Date[] = [];
        const holidayStrings: string[] = [];
        
        holidayYear.hld1s.forEach(holiday => {
          // Fix timezone parsing: Force local date interpretation
          const start = this.parseLocalDate(holiday.strDate);
          const end = this.parseLocalDate(holiday.endDate);
          
          // Fix date mutation bug: Use milliseconds instead of mutating original date
          const startTime = start.getTime();
          const endTime = end.getTime();
          const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day
          
          for (let time = startTime; time <= endTime; time += oneDay) {
            const currentDate = new Date(time);
            const dateStr = this.formatDate(currentDate);
            
            holidayDates.push(new Date(currentDate));
            holidayStrings.push(dateStr);
            
            // Almacenar el nombre del feriado para el tooltip
            this.holidayNames.set(dateStr, holiday.rmrks);
          }
        });
        
        this.holidays = holidayDates;
        this.holidayStrings = holidayStrings;
        console.log('🎄 Current year holidays loaded:', this.holidayStrings);
        
        // Force change detection to update the calendar
        this.cdr.detectChanges();
        
        // Setup MutationObserver for holiday styling (dateClass is not working reliably)
        this.setupHolidayObserver();
      },
      error: (error) => {
        console.warn(`⚠️ Failed to load holidays for year ${currentYear}:`, error);
        // Fallback: usar array vacío
        this.holidays = [];
        this.holidayStrings = [];
      }
    });
  }

  /**
   * Holiday date filter function for Material DatePicker
   */
  holidayFilter = (date: Date | null): boolean => {
    if (!date || !this.disableHolidays) return true;
    
    const dateStr = this.formatDate(date);
    const isHoliday = this.holidayStrings.includes(dateStr);
    
    // Return false to disable holidays, true to enable them
    // Since we want holidays to be selectable but visually styled, we return true
    return true;
  }

  /**
   * Holiday CSS class function for Material DatePicker
   */
  dateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) => {
    if (view === 'month' && this.disableHolidays && this.holidayStrings.length > 0) {
      const dateStr = this.formatDate(cellDate);
      const isHoliday = this.holidayStrings.includes(dateStr);
      
      if (isHoliday) {
        console.log(`🎄 Applying holiday class to: ${dateStr}`);
        
        // Add tooltip using setTimeout to ensure DOM is ready
        setTimeout(() => {
          const holidayName = this.holidayNames.get(dateStr) || 'Día Feriado';
          const cellElement = document.querySelector(`[aria-label*="${cellDate.getDate()}"]`);
          if (cellElement) {
            (cellElement as HTMLElement).title = `🎄 ${holidayName} (${dateStr})`;
          }
        }, 0);
        
        return 'holiday-cell';
      }
    }
    
    return '';
  }

  /**
   * Handle start date selection change
   */
  onStartDateChange(date: Date | null): void {
    console.log('📅 Start date changed:', date);
    this.startDate = date;
    this.updateDateRange();
  }

  /**
   * Handle end date selection change
   */
  onEndDateChange(date: Date | null): void {
    console.log('📅 End date changed:', date);
    this.endDate = date;
    this.updateDateRange();
  }

  /**
   * Update the internal date range and emit events
   */
  private updateDateRange(): void {
    const startDateStr = this.startDate ? this.formatDate(this.startDate) : '';
    const endDateStr = this.endDate ? this.formatDate(this.endDate) : '';

    this.currentValue = {
      start: startDateStr,
      end: endDateStr
    };

    console.log('📅 Date range updated:', this.currentValue);

    // Emit events
    this.dateRangeChange.emit(this.currentValue);
    
    const selectedDates = [this.startDate, this.endDate].filter(Boolean) as Date[];
    this.dateSelected.emit(selectedDates);
    
    this.onChange(this.currentValue);
    this.onTouched();

    // Force change detection
    this.cdr.detectChanges();
  }

  /**
   * Reset dates to empty state
   */
  private resetDates(): void {
    this.startDate = null;
    this.endDate = null;
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
        this.startDate = startDate;
        this.endDate = endDate;
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
    this.cdr.detectChanges();
  }

  /**
   * Setup MutationObserver to watch for Material calendar DOM changes
   */
  private setupHolidayObserver(): void {
    // Disconnect previous observer if exists
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
              // Look for Material calendar cells
              const dayElements = element.querySelectorAll('.mat-calendar-body-cell');
              if (dayElements.length > 0) {
                console.log(`🎄 MutationObserver detected ${dayElements.length} Material calendar cells`);
                this.styleMaterialHolidayElements(dayElements);
              }
              
              // Check if the node itself is a calendar cell
              if (element.classList && element.classList.contains('mat-calendar-body-cell')) {
                console.log('🎄 MutationObserver detected single Material calendar cell');
                this.styleMaterialHolidayElements([element]);
              }
            }
          });
        }
      });
    });

    // Observe changes in the document body
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('🎄 MutationObserver setup for Material DatePicker');
  }

  /**
   * Style Material calendar holiday elements
   */
  private styleMaterialHolidayElements(dayElements: NodeListOf<Element> | Element[]): void {
    dayElements.forEach((dayElem: Element) => {
      const htmlDayElem = dayElem as HTMLElement;
      
      // Material calendar stores date info differently
      const cellContent = htmlDayElem.querySelector('.mat-calendar-body-cell-content');
      if (cellContent && cellContent.textContent) {
        const dayText = cellContent.textContent.trim();
        const dayNumber = parseInt(dayText);
        
        if (dayNumber > 0 && dayNumber <= 31) {
          // For Material calendar, we need to get the current month/year from context
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth();
          
          const date = new Date(currentYear, currentMonth, dayNumber);
          const dateStr = this.formatDate(date);
          const isHoliday = this.holidayStrings.includes(dateStr);
          
          if (isHoliday) {
            console.log(`🎄 MutationObserver styling Material holiday: ${dateStr}`);
            
            // Apply class
            htmlDayElem.classList.add('holiday-cell');
            
            // Apply styles directly - simple and direct
            if (cellContent) {
              const contentElem = cellContent as HTMLElement;
              contentElem.style.backgroundColor = '#fef2f2'; // red-50
              contentElem.style.color = '#dc2626'; // red-600
              contentElem.style.fontWeight = 'bold';
              contentElem.style.borderRadius = '100%';
            }
            
            // Add tooltip with holiday name
            const holidayName = this.holidayNames.get(dateStr) || 'Día Feriado';
            htmlDayElem.title = `🎄 ${holidayName} (${dateStr})`;
            
            console.log(`✅ Applied styles and tooltip to ${dateStr}: ${holidayName}`);
          }
        }
      }
    });
  }

  /**
   * Apply holiday styling to Material calendar elements
   */
  private applyMaterialHolidayStyle(cellElem: HTMLElement, contentElem: HTMLElement, dateStr: string): void {
    // Add class to the cell
    cellElem.classList.add('holiday-cell');
    
    // Apply styles directly to the content element with maximum priority
    contentElem.style.setProperty('background-color', '#fef2f2', 'important'); // red-50
    contentElem.style.setProperty('color', '#dc2626', 'important'); // red-600
    contentElem.style.setProperty('font-weight', 'bold', 'important');
    contentElem.style.setProperty('border', '2px solid #f87171', 'important'); // red-400
    contentElem.style.setProperty('border-radius', '4px', 'important');
    
    // Add tooltip with holiday name
    const holidayName = this.holidayNames.get(dateStr) || 'Día Feriado';
    cellElem.title = `🎄 ${holidayName} (${dateStr}) - Seleccionable`;
    
    console.log(`✅ Applied Material holiday styles to ${dateStr}`);
  }
}