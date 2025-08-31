import {
  ApplicationRef,
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ChangeDetectorRef,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  HostBinding,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatCalendarCellClassFunction, MatDatepicker } from '@angular/material/datepicker';
import { HolidaysService } from 'src/app/core/services/holidays.service';
import { HolidayYear } from 'src/app/core/models/holiday.model';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  encapsulation: ViewEncapsulation.None,
})
export class DatePickerComponent implements ControlValueAccessor, OnInit, OnChanges {

  @ViewChild('datePicker') datePicker!: MatDatepicker<Date>;

  @HostBinding('class.compact-filter')
  get isCompact(): boolean {
    return this.compact && this.size === 'sm' && this.theme === 'fiori';
  }

  @HostBinding('class.medium-filter')
  get isMedium(): boolean {
    return this.size === 'md' && this.theme === 'fiori';
  }

  // Inputs y Outputs
  @Input() placeholder = 'Seleccionar fecha...';
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
  @Input() compact = false;
  @Input() datePlaceholder = 'Fecha';

  @Output() dateChange = new EventEmitter<string>();
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() pickerOpen = new EventEmitter<void>();
  @Output() pickerClose = new EventEmitter<void>();

  selectedDate: Date | null = null;
  currentValue: string = '';
  
  private holidayTimeStamps = new Set<number>();
  private holidayNames = new Map<number, string>();
  private loadedYears = new Set<number>();

  private onChange = (value: string) => {};
  private onTouched = () => { this.wasTouched = true; };
  private wasTouched = false;

  constructor(
    private cdr: ChangeDetectorRef, 
    private holidaysService: HolidaysService,
    private appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    if (this.disableHolidays) {
      this.loadHolidaysForYear(new Date().getFullYear());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Forzar detección de cambios cuando cambian las propiedades que afectan el estilo compacto
    if (changes['compact'] || changes['size'] || changes['theme']) {
      this.cdr.markForCheck();
    }
  }
  
  private getNormalizedTimestamp(d: Date | null): number | null {
    if (!d || isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  private loadHolidaysForYear(year: number): void {
    if (this.loadedYears.has(year)) return;

    this.holidaysService.getHolidaysByYear(year.toString()).subscribe({
      next: (holidayYear: HolidayYear) => {
        this.loadedYears.add(year);
        holidayYear.hld1s.forEach(holiday => {
          const start = this.parseLocalDate(holiday.strDate);
          const end = this.parseLocalDate(holiday.endDate);
          if (!start || !end) return;

          const oneDay = 24 * 60 * 60 * 1000;
          for (let time = start.getTime(); time <= end.getTime(); time += oneDay) {
            const date = new Date(time);
            const normalizedTimestamp = this.getNormalizedTimestamp(date);
            if (normalizedTimestamp) {
              this.holidayTimeStamps.add(normalizedTimestamp);
              this.holidayNames.set(normalizedTimestamp, holiday.rmrks);
            }
          }
        });
        
        console.log(`🎄 Holiday data loaded for ${year}.`);
      },
      error: (error) => {
        console.warn(`⚠️ Failed to load holidays for year ${year}:`, error);
        this.loadedYears.add(year);
      }
    });
  }
  
  onPickerOpened(): void {
    this.pickerOpen.emit();
    console.log('🗓️ Picker opened. Applying tooltips.');
    this.appRef.tick();
    this.applyTooltipsToVisibleHolidays();
  }

  private applyTooltipsToVisibleHolidays(): void {
    requestAnimationFrame(() => {
        const holidayCells = document.querySelectorAll('td.mat-calendar-body-cell.holiday-cell');
        
        if (holidayCells.length > 0) {
            console.log(`[SUCCESS] Found ${holidayCells.length} holiday cells. Applying tooltips.`);
        } else {
            setTimeout(() => this.applyTooltipsToVisibleHolidays(), 100);
            return;
        }

        holidayCells.forEach(cell => {
            const cellElement = cell as HTMLElement;
            if (!cellElement.hasAttribute('title')) {
                const ariaLabel = cellElement.getAttribute('aria-label');
                if (ariaLabel) {
                    const date = this.parseAriaLabel(ariaLabel);
                    const timestamp = this.getNormalizedTimestamp(date);
                    if (timestamp && this.holidayNames.has(timestamp)) {
                        const holidayName = this.holidayNames.get(timestamp);
                        cellElement.setAttribute('title', `🎉 ${holidayName}`);
                    }
                }
            }
        });
    });
  }

  private parseAriaLabel(ariaLabel: string): Date | null {
      const months: { [key: string]: number } = {
          'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
          'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      
      const parts = ariaLabel.toLowerCase().replace(/,/g, '').split(' ');
      
      if (parts.length === 5 && parts[1] === 'de' && parts[3] === 'de') {
          const day = parseInt(parts[0], 10);
          const month = months[parts[2]];
          const year = parseInt(parts[4], 10);
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
              return new Date(year, month, day);
          }
      }
      const fallbackDate = new Date(ariaLabel);
      if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate;
      }
      return null;
  }

  onMonthSelected(selectedDate: Date): void {
    if (this.disableHolidays) {
      this.loadHolidaysForYear(selectedDate.getFullYear());
    }
    this.applyTooltipsToVisibleHolidays();
  }

  holidayFilter = (date: Date | null): boolean => true;

  dateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) => {
    if (view === 'month') {
      const cellTimestamp = this.getNormalizedTimestamp(cellDate);
      if (cellTimestamp && this.holidayTimeStamps.has(cellTimestamp)) {
        return 'holiday-cell';
      }
    }
    return '';
  };
  
  private parseLocalDate(dateInput: string | Date): Date | null {
    if (dateInput instanceof Date) return dateInput;
    if (!dateInput) return null;
    const parts = dateInput.toString().split('T')[0].split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    
    let year: number, month: number, day: number;
    
    // Detect format based on the first part
    if (parts[0] > 1900) {
      // YYYY-MM-DD format
      [year, month, day] = parts;
    } else {
      // DD-MM-YYYY format 
      [day, month, year] = parts;
    }
    
    console.log(`📅 Parsing date: "${dateInput}" as ${day}/${month}/${year}`);
    
    // Create date in local timezone (month is 0-indexed in Date constructor)
    return new Date(year, month - 1, day);
  }

  private formatDate(date: Date): string {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onDateChange(date: Date | null): void {
    console.log('📅 Date changed:', date);
    this.selectedDate = date;
    this.updateDate();
  }
  
  openCalendar(): void {
    if (!this.disabled && this.datePicker && !this.datePicker.opened) {
      this.datePicker.open();
    }
  }
  
  private updateDate(): void {
    this.currentValue = this.selectedDate ? this.formatDate(this.selectedDate) : '';
    console.log('📅 Date updated:', this.currentValue);

    // Emit events
    this.dateChange.emit(this.currentValue);
    
    if (this.selectedDate) {
      this.dateSelected.emit(this.selectedDate);
    }
    
    this.onChange(this.currentValue);
    this.onTouched();

    // Force change detection
    this.cdr.detectChanges();
  }

  writeValue(value: string | null): void {
    if (value) {
      this.selectedDate = this.parseLocalDate(value);
      this.currentValue = value;
    } else {
      this.selectedDate = null;
      this.currentValue = '';
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { 
    this.disabled = isDisabled; 
    this.cdr.markForCheck();
  }

  hasError(): boolean { 
    return this.required && !this.currentValue && this.wasTouched; 
  }

  onInputFocus(): void { 
    this.wasTouched = true; 
    this.openCalendar();
  }

  onInputBlur(): void { this.onTouched(); }

  getIconSize(): string {
    switch (this.size) {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-5 h-5';
      case 'lg': return 'w-6 h-6';
      default: return 'w-4 h-4';
    }
  }
}