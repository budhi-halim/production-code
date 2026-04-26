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

// === FORMAT DEFINITIONS ===
export const FORMATS = {
  "letters": {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lengths: [1, 2, 1], // Year, Date, ShiftLoc
  },
  "numbers": {
    chars: "0123456789",
    lengths: [1, 3, 1],
  },
  "base36-nl": {
    chars: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lengths: [1, 2, 1],
  },
  "base36-ln": {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    lengths: [1, 2, 1],
  }
};

// === REVERSE FLAGS ===
export const REV = {
  "letters": { year: false, date: true, shiftLoc: false },
  "numbers": { year: false, date: false, shiftLoc: true },
  "base36-nl": { year: false, date: true, shiftLoc: false },
  "base36-ln": { year: false, date: true, shiftLoc: false }
};