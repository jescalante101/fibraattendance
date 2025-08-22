// src/app/core/models/time-interval.model.ts

/**
 * Represents the structure of the paginated API response.
 * It's generic to be reusable.
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalRecords: number;
}

/**
 * NEW: Represents the detailed information of a break time.
 */
export interface BreakTimeDto {
  id: number;
  alias: string;
  duration: number;
}

/**
 * Main DTO for reading the information of a schedule.
 * Matches the AttTimeIntervalDto from the backend.
 */
export interface AttTimeIntervalDto {
  id: number;
  alias: string;
  useMode: number;
  inTime: string; // Dates are received as ISO strings
  duration: number;
  workTimeDuration: number;
  workDay: number;
  companyId?: string;

  // Punching Rules
  inRequired: number;
  outRequired: number;
  allowLate: number;
  allowLeaveEarly: number;
  totalMarkings?: number;

  // Overtime Rules
  earlyIn: number;
  lateOut: number;
  minEarlyIn: number;
  minLateOut: number;
  overtimeLv:number,
  overtimeLv1: number;
  overtimeLv1Percentage?: number;
  overtimeLv2: number;
  overtimeLv2Percentage?: number;
  overtimeLv3: number;
  overtimeLv3Percentage?: number;
  punchInWindow: string;  // Ej: "07:00 - 10:00"
  punchOutWindow: string; // Ej: "16:00 - 20:00"

  // UPDATED: Now contains an array of break objects
  breaks: BreakTimeDto[];
}

export interface TimeIntervalDetailDto {
  id: number;
  alias: string;
  
  // Formatted and calculated fields
  formattedStartTime: string;
  scheduledEndTime: string;
  totalDurationMinutes: number;
  normalWorkDay: string;


  // Break details
  breaks: BreakTimeDto[];

  // Other properties
  overtimeLv1Percentage?: number;
  overtimeLv2Percentage?: number;
  overtimeLv3Percentage?: number;
  companyId: string;
}

/**
 * DTO for creating a new schedule.
 * It doesn't contain 'id' and sends a list of break IDs.
 */
export interface AttTimeIntervalCreateDto {
  alias: string;
  useMode: number;
  inTime: string;
  duration: number;
  workTimeDuration: number;
  workDay: number;
  companyId?: string;
  inRequired: number;
  outRequired: number;
  allowLate: number;
  allowLeaveEarly: number;
  totalMarkings?: number;
  earlyIn: number;
  lateOut: number;
  minEarlyIn: number;
  minLateOut: number;
  overtimeLv: number;
  overtimeLv1: number;
  overtimeLv1Percentage?: number;
  overtimeLv2: number;
  overtimeLv2Percentage?: number;
  overtimeLv3: number;
  overtimeLv3Percentage?: number;

  punchInStartTime: string;
  punchInEndTime: string;
  punchOutStartTime: string;
  punchOutEndTime: string;

  // NEW: List of IDs to associate
  breakTimeIds: number[];
}

/**
 * DTO for updating an existing schedule.
 * It includes the 'id' and the list of break IDs.
 */
export interface AttTimeIntervalUpdateDto extends AttTimeIntervalCreateDto {
  id: number;
}