export function checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  // Simple lexicographical comparison works for zero-padded 24h formats HH:mm (e.g., "07:00", "08:40")
  return start1 < end2 && end1 > start2;
}

export function isValidAcademicDate(dateString: string): boolean {
  // Checks if date is between 03/08/2026 and 19/12/2026
  const date = new Date(dateString);
  const start = new Date('2026-08-03T00:00:00');
  const end = new Date('2026-12-19T23:59:59');
  return date >= start && date <= end;
}

export function generateTimeSlots() {
  return [
    { start: '07:00', end: '07:50' },
    { start: '07:50', end: '08:40' },
    { start: '08:40', end: '09:30' },
    { start: '09:30', end: '10:20' },
    { start: '10:20', end: '11:10' },
    { start: '11:10', end: '12:00' },
    { start: '13:00', end: '13:50' },
    { start: '13:50', end: '14:40' },
    { start: '14:40', end: '15:30' },
    { start: '15:30', end: '16:20' },
    { start: '16:20', end: '17:10' },
    { start: '17:10', end: '18:00' },
  ];
}
