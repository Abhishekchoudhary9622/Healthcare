/**
 * Slot generation utilities
 */

/**
 * Generate all available time slots for a doctor on a given date
 * @param {Object} workingHours - doctor's working hours config
 * @param {number} slotDuration - slot duration in minutes
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} bookedSlots - array of Date objects already booked
 * @param {Array} heldSlots - array of Date objects currently held
 * @returns {Array} available slot start times as ISO strings
 */
const generateAvailableSlots = (workingHours, slotDuration, dateStr, bookedSlots = [], heldSlots = []) => {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dayConfig = workingHours[dayName];

  if (!dayConfig || !dayConfig.active) return [];

  const [startHour, startMin] = dayConfig.start.split(':').map(Number);
  const [endHour, endMin] = dayConfig.end.split(':').map(Number);

  const slots = [];
  const current = new Date(date);
  current.setHours(startHour, startMin, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, endMin, 0, 0);

  const bookedTimes = new Set([
    ...bookedSlots.map((d) => new Date(d).getTime()),
    ...heldSlots.map((d) => new Date(d).getTime()),
  ]);

  while (current < end) {
    const slotTime = new Date(current);
    if (!bookedTimes.has(slotTime.getTime())) {
      slots.push(slotTime.toISOString());
    }
    current.setMinutes(current.getMinutes() + slotDuration);
  }

  return slots;
};

/**
 * Parse frequency string into cron-like schedule array (hours in day)
 * Examples: "twice daily" -> [8, 20], "every 8 hours" -> [8, 16], "once daily" -> [8]
 */
const parseFrequencyToHours = (frequency) => {
  const f = frequency.toLowerCase();
  if (f.includes('three') || f.includes('thrice') || f.includes('3')) return [8, 14, 20];
  if (f.includes('twice') || f.includes('2') || f.includes('two')) return [8, 20];
  if (f.includes('every 4')) return [8, 12, 16, 20];
  if (f.includes('every 6')) return [8, 14, 20];
  if (f.includes('every 8')) return [8, 16];
  if (f.includes('every 12')) return [8, 20];
  return [8]; // default once daily
};

module.exports = { generateAvailableSlots, parseFrequencyToHours };
