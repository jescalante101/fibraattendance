// src/app/features/schedule/models/schedule.model.ts

/**
 * Represents the information about the assigned shift.
 */
export interface ShiftInfoDto {
  id: number;
  alias: string;
  shiftCycle: number;
}

/**
 * Represents the date range for which the schedule was queried.
 */
export interface DateRangeDto {
  startDate: string; // ISO Date string, e.g., "2025-08-21T00:00:00"
  endDate: string;   // ISO Date string
}

/**
 * Represents the details of a single day within the schedule.
 */
export interface ScheduleDayDto {
  date: string; // ISO Date string
  dayName: string;
  alias: string;
  inTime: string;  // Formatted as "HH:mm" or "--:--"
  outTime: string; // Formatted as "HH:mm" or "--:--"
  workTimeDurationMinutes: number;
  scheduleId: number;
  duration: number;
  isException: boolean;
}

/**
 * Represents the entire API response for a schedule query.
 * This is the main interface you will use in your component.
 */
export interface ScheduleResponseDto {
  employeeId: string;
  fullNameEmployee: string;
  assignmentId: number;
  shiftInfo: ShiftInfoDto;
  queryRange?: DateRangeDto;  // Made optional since API may not include it
  schedule: ScheduleDayDto[];
}