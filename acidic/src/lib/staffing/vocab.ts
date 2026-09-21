export const SHIFT_ROLES = ["barista", "bartender", "floor", "sound", "manager"] as const;
export type ShiftRole = (typeof SHIFT_ROLES)[number];
export const EMPLOYMENT_TYPES = ["casual", "part_time", "full_time", "contractor"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const SHIFT_STATUSES = ["rostered", "confirmed", "worked", "no_show", "cancelled"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];
