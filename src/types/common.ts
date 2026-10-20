/** Fields every persisted record carries. */
export interface BaseRecord {
  id: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/** Records owned by exactly one shop (the tenant boundary). */
export interface ShopScoped {
  shopId: string;
}

export type ID = string;

/** A wall-clock time of day, "HH:mm", 24-hour. */
export type ClockTime = string;

/** 0 = Sunday ... 6 = Saturday, matching `Date#getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeRange {
  start: ClockTime;
  end: ClockTime;
}

export interface DayHours {
  weekday: Weekday;
  closed: boolean;
  open: ClockTime;
  close: ClockTime;
}

export type BusinessHours = DayHours[];

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Inclusive range of calendar dates, each "yyyy-MM-dd". */
export interface DateRange {
  from: string;
  to: string;
}
