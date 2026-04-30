// === CONSTANTS ===
export const SHIFTS = [
  { id: 0, name: "Shift 1" },
  { id: 1, name: "Shift 2" },
  { id: 2, name: "Shift 3" } 
];

export const LOCATIONS = [
  { id: 0, name: "Factory A" },
  { id: 1, name: "Factory B" },
  { id: 2, name: "Factory C" }
];

export const DEFAULT_SHELF_LIFE = 240;

// === FORMAT DEFINITIONS ===
export const FORMATS = {
  "numbers": {
    chars: "0123456789",
    lengths: [1, 3, 1],
  }
};

// === REVERSE FLAGS ===
export const REV = {
  "numbers": { year: false, date: false, shiftLoc: true }
};