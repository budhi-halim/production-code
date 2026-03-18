// === IMPORTS ===
import { REV, FORMATS } from "./config.js";

// === DATE UTILS ===
export function isLeapYear(year) {
  return new Date(year, 1, 29).getDate() === 29;
}

// Get 1-based day index (1 to 366)
export function getDayIndex(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  let diff = Math.floor((date - start) / 86400000) + 1;

  // Leap year adjustment: skip Feb 29 logic (index 60) for non-leap years
  if (!isLeapYear(date.getFullYear()) && diff >= 60) {
    diff += 1;
  }

  return diff;
}

// Reconstruct Date object from Year and 1-based Day Index
export function getDateFromDayIndex(year, dayIndex) {
  if (dayIndex < 1 || dayIndex > 366) return null;
  
  const leap = isLeapYear(year);
  
  // If non-leap year and asking for day 60 (Feb 29 equivalent), invalid
  if (!leap && dayIndex === 60) return null;
  
  let actualDiff = dayIndex;
  
  // Reverse the leap year skip
  if (!leap && dayIndex > 60) {
    actualDiff -= 1;
  }
  
  // actualDiff is 1-based, JS Date month-day is 0-based offset from Jan 1
  return new Date(year, 0, actualDiff);
}

// === ENCODER / DECODER CORE ===
function encodeSegment(val, chars, len, reverse) {
  const base = chars.length;
  let out = "";

  for (let i = 0; i < len; i++) {
    let idx = val % base;
    if (reverse) idx = base - 1 - idx;
    out = chars[idx] + out;
    val = Math.floor(val / base);
  }

  return out;
}

function decodeSegment(str, chars, reverse) {
  const base = chars.length;
  let val = 0;

  for (let i = 0; i < str.length; i++) {
    let idx = chars.indexOf(str[i]);
    if (idx === -1) return null; // Invalid char found
    
    if (reverse) idx = base - 1 - idx;
    val = val * base + idx;
  }

  return val;
}

// === MAIN TRANSLATION LOGIC ===
export function formToCode(date, shift, loc, formatId) {
  const fmt = FORMATS[formatId];
  const rev = REV[formatId];
  const base = fmt.chars.length;

  // Year: modulo cycle based on the alphabet length
  const y = date.getFullYear() % base;
  
  // Day: 0-indexed for Base26/36, 1-indexed for Base10
  let d = getDayIndex(date);
  if (formatId !== "numbers") d -= 1; 

  // Shift & Location: Combined base 9 logic
  const sl = shift * 3 + loc;

  return (
    encodeSegment(y, fmt.chars, fmt.lengths[0], rev.year) +
    encodeSegment(d, fmt.chars, fmt.lengths[1], rev.date) +
    encodeSegment(sl, fmt.chars, fmt.lengths[2], rev.shiftLoc)
  );
}

export function codeToForm(code, formatId) {
  const fmt = FORMATS[formatId];
  const rev = REV[formatId];
  const base = fmt.chars.length;

  const [lenY, lenD, lenSL] = fmt.lengths;
  const expectedLength = lenY + lenD + lenSL;

  // 1. Length Validation
  if (code.length !== expectedLength) {
    return { error: `Must be exactly ${expectedLength} characters` };
  }

  const yStr = code.substring(0, lenY);
  const dStr = code.substring(lenY, lenY + lenD);
  const slStr = code.substring(lenY + lenD);

  const yVal = decodeSegment(yStr, fmt.chars, rev.year);
  const dValRaw = decodeSegment(dStr, fmt.chars, rev.date);
  const slVal = decodeSegment(slStr, fmt.chars, rev.shiftLoc);

  // 2. Character Validation
  if (yVal === null || dValRaw === null || slVal === null) {
    return { error: "Contains invalid characters for this format" };
  }

  // 3. Resolve Closest Past/Current Year
  const currentYear = new Date().getFullYear(); 
  // Math explanation: We want the highest year <= currentYear where year % base == yVal
  const modDiff = ((currentYear - yVal) % base + base) % base;
  const year = currentYear - modDiff;

  // 4. Resolve Date
  const dVal = formatId === "numbers" ? dValRaw : dValRaw + 1;
  const date = getDateFromDayIndex(year, dVal);
  
  if (!date) {
    return { error: "Invalid date combination" };
  }

  // 5. Resolve Shift & Location
  if (slVal >= 9) {
    return { error: "Invalid shift-location identifier" };
  }
  const shift = Math.floor(slVal / 3);
  const loc = slVal % 3;

  return { date, shift, loc, error: null };
}