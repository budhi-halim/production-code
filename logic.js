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

  if (!isLeapYear(date.getFullYear()) && diff >= 60) {
    diff += 1;
  }

  return diff;
}

// Reconstruct Date object from Year and 1-based Day Index
export function getDateFromDayIndex(year, dayIndex) {
  if (dayIndex < 1 || dayIndex > 366) return null;
  
  const leap = isLeapYear(year);
  
  if (!leap && dayIndex === 60) return null;
  
  let actualDiff = dayIndex;
  
  if (!leap && dayIndex > 60) {
    actualDiff -= 1;
  }
  
  return new Date(year, 0, actualDiff);
}

// === EXPIRATION LOGIC ===
export function calculateExpirationDate(prodDate, shelfLifeDays) {
  const expDate = new Date(prodDate);
  expDate.setDate(expDate.getDate() + shelfLifeDays);
  return expDate;
}

export function calculateProductionDate(expDate, shelfLifeDays) {
  const prodDate = new Date(expDate);
  prodDate.setDate(prodDate.getDate() - shelfLifeDays);
  return prodDate;
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
    if (idx === -1) return null; 
    
    if (reverse) idx = base - 1 - idx;
    val = val * base + idx;
  }

  return val;
}

// === MAIN TRANSLATION LOGIC ===
export function formToCode(date, shift, loc) {
  const fmt = FORMATS["numbers"];
  const rev = REV["numbers"];
  const base = fmt.chars.length;

  const y = date.getFullYear() % base;
  const d = getDayIndex(date); 
  const sl = shift * 3 + loc;

  return (
    encodeSegment(y, fmt.chars, fmt.lengths[0], rev.year) +
    encodeSegment(d, fmt.chars, fmt.lengths[1], rev.date) +
    encodeSegment(sl, fmt.chars, fmt.lengths[2], rev.shiftLoc)
  );
}

export function codeToForm(code) {
  const fmt = FORMATS["numbers"];
  const rev = REV["numbers"];
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
  const modDiff = ((currentYear - yVal) % base + base) % base;
  const year = currentYear - modDiff;

  // 4. Resolve Date
  const date = getDateFromDayIndex(year, dValRaw);
  
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