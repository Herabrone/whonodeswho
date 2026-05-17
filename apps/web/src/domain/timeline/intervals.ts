export interface TimelineInterval {
  startDate: string;
  endDate?: string;
}

interface IntervalBounds {
  start: number;
  end: number;
}

export function toTimelineTime(value: string): number {
  const timestamp = Date.parse(value.length <= 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

export function isValidTimelineDate(value: string | undefined): value is string {
  return typeof value === "string" && Number.isFinite(toTimelineTime(value));
}

export function compareTimelineDates(left: string, right: string): number {
  return toTimelineTime(left) - toTimelineTime(right);
}

export function getIntervalBounds(interval: TimelineInterval): IntervalBounds {
  return {
    start: toTimelineTime(interval.startDate),
    end: interval.endDate === undefined
      ? Number.POSITIVE_INFINITY
      : toTimelineTime(interval.endDate),
  };
}

export function intervalsOverlap(
  left: TimelineInterval,
  right: TimelineInterval,
): boolean {
  const leftBounds = getIntervalBounds(left);
  const rightBounds = getIntervalBounds(right);
  return leftBounds.start < rightBounds.end && rightBounds.start < leftBounds.end;
}

export function intervalsMeet(
  left: TimelineInterval,
  right: TimelineInterval,
): boolean {
  const leftBounds = getIntervalBounds(left);
  const rightBounds = getIntervalBounds(right);
  return leftBounds.end === rightBounds.start || rightBounds.end === leftBounds.start;
}

export function intervalContains(
  outer: TimelineInterval,
  inner: TimelineInterval,
): boolean {
  const outerBounds = getIntervalBounds(outer);
  const innerBounds = getIntervalBounds(inner);
  return outerBounds.start <= innerBounds.start && innerBounds.end <= outerBounds.end;
}

export function intervalContainsDate(
  interval: TimelineInterval,
  date: string,
): boolean {
  const bounds = getIntervalBounds(interval);
  const query = toTimelineTime(date);
  return bounds.start <= query && query < bounds.end;
}

export function intervalsEqual(
  left: TimelineInterval,
  right: TimelineInterval,
): boolean {
  const leftBounds = getIntervalBounds(left);
  const rightBounds = getIntervalBounds(right);
  return leftBounds.start === rightBounds.start && leftBounds.end === rightBounds.end;
}

export function intervalEndsBeforeOrOnDate(
  interval: TimelineInterval,
  date: string,
): boolean {
  const bounds = getIntervalBounds(interval);
  return bounds.end <= toTimelineTime(date);
}

export function intervalStartsAfterDate(
  interval: TimelineInterval,
  date: string,
): boolean {
  return getIntervalBounds(interval).start > toTimelineTime(date);
}
