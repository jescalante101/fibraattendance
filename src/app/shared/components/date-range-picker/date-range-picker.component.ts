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
import { MatCalendarCellClassFunction, MatDateRangePicker } from '@angular/material/datepicker';
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
  ],
  encapsulation: ViewEncapsulation.None,
})
export class DateRangePickerComponent implements ControlValueAccessor, OnInit, OnChanges {

  @ViewChild('rangePicker') rangePicker!: MatDateRangePicker<Date>;

  @HostBinding('class.compact-filter')
  get isCompact(): boolean {
    return this.compact && this.size === 'sm' && this.theme === 'fiori';
  }

  @HostBinding('class.medium-filter')
  get isMedium(): boolean {
    return this.size === 'md' && this.theme === 'fiori';
  }

  // ... (Input, Output, y otras propiedades se mantienen igual)
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
  @Input() compact = false;
  @Input() startDatePlaceholder = 'Fecha inicio';
  @Input() endDatePlaceholder = 'Fecha fin';

  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() dateSelected = new EventEmitter<Date[]>();
  @Output() pickerOpen = new EventEmitter<void>();
  @Output() pickerClose = new EventEmitter<void>();

  startDate: Date | null = null;
  endDate: Date | null = null;
  currentValue: DateRange = { start: '', end: '' };
  
  private holidayTimeStamps = new Set<number>();
  private holidayNames = new Map<number, string>();
  private loadedYears = new Set<number>();

  private onChange = (value: DateRange) => {};
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
    // Usamos requestAnimationFrame para esperar al próximo ciclo de pintado del navegador.
    // Esto garantiza que el DOM esté completamente actualizado antes de que lo manipulemos.
    requestAnimationFrame(() => {
        const holidayCells = document.querySelectorAll('td.mat-calendar-body-cell.holiday-cell');
        
        if (holidayCells.length > 0) {
            console.log(`[SUCCESS] Found ${holidayCells.length} holiday cells. Applying tooltips.`);
        } else {
            // Este reintento es una salvaguarda final por si la animación del calendario tarda un poco más.
            setTimeout(() => this.applyTooltipsToVisibleHolidays(), 100);
            return;
        }

        holidayCells.forEach(cell => {
            const cellElement = cell as HTMLElement;
            // Solo añadimos el tooltip si no lo tiene ya, para evitar trabajo innecesario.
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
    // También aplicamos los tooltips cuando el usuario cambia de mes.
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
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }

  private formatDate(date: Date): string {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onStartDateChange(date: Date | null): void { this.startDate = date; this.updateDateRange(); }
  onEndDateChange(date: Date | null): void { this.endDate = date; this.updateDateRange(); }
  
  openCalendar(): void {
    if (!this.disabled && this.rangePicker && !this.rangePicker.opened) {
      this.rangePicker.open();
    }
  }
  
  private updateDateRange(): void {
    this.currentValue = { 
      start: this.startDate ? this.formatDate(this.startDate) : '', 
      end: this.endDate ? this.formatDate(this.endDate) : '' 
    };
    this.dateRangeChange.emit(this.currentValue);
    this.onChange(this.currentValue);
    this.onTouched();
    this.cdr.markForCheck();
  }

  writeValue(value: DateRange | null): void {
    if (value && value.start && value.end) {
      this.startDate = this.parseLocalDate(value.start);
      this.endDate = this.parseLocalDate(value.end);
    } else {
      this.startDate = null; this.endDate = null;
    }
    this.updateDateRange();
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { 
    this.disabled = isDisabled; 
    this.cdr.markForCheck();
  }
  hasError(): boolean { return this.required && !(this.currentValue.start && this.currentValue.end) && this.wasTouched; }
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

