import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  getDay,
  format,
} from "date-fns";

export function getCalendarMonths(startStr: string, endStr: string) {
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const months: { month: Date; days: Date[] }[] = [];

  let currentMonth = startDate;
  while (currentMonth <= endDate) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    months.push({
      month: monthStart,
      days: daysInMonth,
    });

    currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1,
    );
  }

  return months;
}
