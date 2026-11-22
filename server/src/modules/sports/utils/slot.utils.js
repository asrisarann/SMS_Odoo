/**
 * Slot and Timezone Utilities for Asia/Kolkata (UTC+05:30)
 */

const KOLKATA_OFFSET_MINUTES = 330; // 5 hours 30 minutes
const KOLKATA_OFFSET_MS = KOLKATA_OFFSET_MINUTES * 60 * 1000;

/**
 * Returns current Date adjusted to Asia/Kolkata time.
 */
export const getKolkataNow = () => {
  return new Date();
};

/**
 * Parse a date string (YYYY-MM-DD) and time string (HH:mm) in Asia/Kolkata
 * into a UTC Date object representing that exact moment.
 *
 * Example: dateStr="2026-11-21", timeStr="09:00"
 * Represents 2026-11-21 09:00:00 GMT+0530 -> 2026-11-21 03:30:00Z
 */
export const parseKolkataToUTC = (dateStr, timeStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // UTC timestamp = Date.UTC(year, month - 1, day, hours, minutes) - 5h 30m
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes) - KOLKATA_OFFSET_MS;
  return new Date(utcMs);
};

/**
 * Formats a UTC Date object into Asia/Kolkata date and time strings.
 */
export const formatUTCToKolkata = (utcDate) => {
  const kolkataMs = utcDate.getTime() + KOLKATA_OFFSET_MS;
  const kDate = new Date(kolkataMs);

  const year = kDate.getUTCFullYear();
  const month = String(kDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kDate.getUTCDate()).padStart(2, "0");
  const hours = String(kDate.getUTCHours()).padStart(2, "0");
  const minutes = String(kDate.getUTCMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

/**
 * Determines whether a given date and time falls on Friday night social play (Friday 18:00+).
 * As per PRD: "on Friday night the courts open up for social play where many people share one court".
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} [timeStr] - 'HH:mm'
 * @returns {boolean}
 */
export const isFridaySocialPlay = (dateStr, timeStr) => {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const isFriday = d.getUTCDay() === 5; // 5 = Friday
  if (!isFriday) return false;

  if (timeStr) {
    const [h] = timeStr.split(":").map(Number);
    return h >= 18; // 6:00 PM onwards
  }
  return true;
};

/**
 * Generate 1-hour session slots opening every 30 minutes between openTime and closeTime for a specific date in Asia/Kolkata.
 * Per PRD: "Sessions last an hour, a new slot opens every half hour".
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} openTime - 'HH:mm', e.g. '06:00'
 * @param {string} closeTime - 'HH:mm', e.g. '22:00'
 * @param {number} sessionDurationMinutes - default 60 (1 hour)
 * @param {number} stepMinutes - default 30 (new slot opens every half hour)
 */
export const generateDailySlots = (
  dateStr,
  openTime = "06:00",
  closeTime = "22:00",
  sessionDurationMinutes = 60,
  stepMinutes = 30
) => {
  const slots = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  const openTotalMins = openH * 60 + openM;
  const closeTotalMins = closeH * 60 + closeM;

  const now = new Date();

  for (let currentMins = openTotalMins; currentMins + sessionDurationMinutes <= closeTotalMins; currentMins += stepMinutes) {
    const startH = String(Math.floor(currentMins / 60)).padStart(2, "0");
    const startM = String(currentMins % 60).padStart(2, "0");
    const endMins = currentMins + sessionDurationMinutes;
    const endH = String(Math.floor(endMins / 60)).padStart(2, "0");
    const endM = String(endMins % 60).padStart(2, "0");

    const startTimeStr = `${startH}:${startM}`;
    const endTimeStr = `${endH}:${endM}`;

    const startUTC = parseKolkataToUTC(dateStr, startTimeStr);
    const endUTC = parseKolkataToUTC(dateStr, endTimeStr);

    slots.push({
      slotStartTime: startUTC,
      slotEndTime: endUTC,
      date: dateStr,
      startTimeStr,
      endTimeStr,
      label: `${startTimeStr} - ${endTimeStr}`,
      isPast: startUTC.getTime() <= now.getTime(),
      sessionDurationMinutes,
      isSocialPlay: isFridaySocialPlay(dateStr, startTimeStr),
    });
  }

  return slots;
};
