// === IMPORTS ===
import { SHIFTS, LOCATIONS } from "./config.js";
import { formToCode, codeToForm } from "./logic.js";

// === STATE ===
let mode = "formToCode"; // "formToCode" | "codeToForm"
let format = "letters";
let debounceTimer = null;

// The sliding neumorphic tab platform indicator element
let tabIndicatorEl; 

// Track if user has typed in code input to prevent premature errors
let hasTypedCode = false;

// SVGs for Copy Button
const SVG_COPY = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" /></svg>`;
const SVG_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`;

// === ELEMENTS ===
const leftCard = document.getElementById("leftCard");
const rightCard = document.getElementById("rightCard");
const switchBtn = document.getElementById("switchBtn");
const formatTabsContainer = document.getElementById("formatTabs");

// === NEUMORPHIC TAB INDICATOR LOGIC ===
// Create the elevated platform element and add it to the DOM on load
function initTabIndicator() {
  if (!formatTabsContainer || tabIndicatorEl) return;

  tabIndicatorEl = document.createElement('div');
  tabIndicatorEl.className = 'format-selector-indicator';
  formatTabsContainer.appendChild(tabIndicatorEl);

  // Position it correctly for the initial active tab
  moveTabIndicator(formatTabsContainer.querySelector('button.active'));
}

// Calculate the active button's offset and width within the flex container to move the absolute platform
function moveTabIndicator(targetButton) {
  if (!targetButton || !tabIndicatorEl) return;
  
  // Calculate width and left position relative to the container for correct sliding animation
  const width = targetButton.offsetWidth;
  const leftPosition = targetButton.offsetLeft;
  
  // Apply calculated values to the platform indicator
  tabIndicatorEl.style.width = width + "px";
  tabIndicatorEl.style.left = leftPosition + "px";
}

// Ensure the indicator stays correctly positioned on layout change and resize
function repositionIndicator() {
    moveTabIndicator(document.querySelector('.format-selector button.active'));
}

// === RENDERERS ===
function renderFormInput(container) {
  container.innerHTML = `
    <div class="input-group">
      <label>Date</label>
      <input type="date" id="dateInput">
    </div>
    <div class="input-group">
      <label>Shift</label>
      <select id="shiftInput"></select>
    </div>
    <div class="input-group">
      <label>Location</label>
      <select id="locInput"></select>
    </div>
  `;

  const shiftEl = container.querySelector("#shiftInput");
  const locEl = container.querySelector("#locInput");

  SHIFTS.forEach(s => { shiftEl.innerHTML += `<option value="${s.id}">${s.name}</option>`; });
  LOCATIONS.forEach(l => { locEl.innerHTML += `<option value="${l.id}">${l.name}</option>`; });

  container.querySelector("#dateInput").valueAsDate = new Date();
  
  // Attach immediate update listeners
  container.querySelectorAll("select, input").forEach(el => el.addEventListener("input", update));
}

function renderFormOutput(container) {
  container.innerHTML = `
    <div class="form-output-display" id="formOutput">
      </div>
    <div class="error" id="formError"></div>
  `;
}

function renderCodeInput(container) {
  container.innerHTML = `
    <div class="input-group">
      <label>Code</label>
      <input id="codeInput" placeholder="Enter code" autocomplete="off" spellcheck="false">
    </div>
    <div class="error" id="codeError"></div>
  `;

  const codeInput = container.querySelector("#codeInput");
  codeInput.addEventListener("input", (e) => {
    hasTypedCode = true;
    // Force uppercase immediately
    e.target.value = e.target.value.toUpperCase();
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 350);
  });
}

function renderCodeOutput(container) {
  container.innerHTML = `
    <label>Generated Code</label>
    <div class="code-output-container selectable" id="codeOutputTextContainer">
      <span class="code-output-text selectable" id="codeOutputText"></span>
      <button class="copy-btn selectable" id="copyBtn" aria-label="Copy Code">
      <span class="icon icon-copy">${SVG_COPY}</span>
      <span class="icon icon-check">${SVG_CHECK}</span>
</button>
    </div>
  `;

  container.querySelector("#copyBtn").addEventListener("click", async function() {
    const text = document.getElementById("codeOutputText").innerText;
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      this.classList.add("copied");

      setTimeout(() => {
        this.classList.remove("copied");
      }, 1500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  });
}

// === MAIN UPDATE LOOP ===
function update() {
  // === FORM -> CODE ===
  if (mode === "formToCode") {
    const dateInput = document.getElementById("dateInput");
    if (!dateInput) return; // Prevent crash during layout redraws

    const dateStr = dateInput.value;
    if (!dateStr) return; // Prevent crash if manually cleared

    const date = new Date(dateStr);
    const shift = Number(document.getElementById("shiftInput").value);
    const loc = Number(document.getElementById("locInput").value);

    const code = formToCode(date, shift, loc, format);
    document.getElementById("codeOutputText").innerText = code;
  } 
  
  // === CODE -> FORM ===
  else {
    const inputEl = document.getElementById("codeInput");
    const errorEl = document.getElementById("codeError");
    const outputEl = document.getElementById("formOutput");
    
    if (!inputEl) return; // Layout redraw handling

    const code = inputEl.value.toUpperCase();

    // Reset UI
    errorEl.textContent = "";
    outputEl.innerHTML = "";

    if (!code) {
      if (hasTypedCode) errorEl.textContent = "Code required";
      return;
    }

    const result = codeToForm(code, format);

    if (result.error) {
      errorEl.textContent = result.error;
      return;
    }

    // Success - Format Output (Using standard formatting)
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = result.date.toLocaleDateString(undefined, dateOptions);
    const shiftName = SHIFTS.find(s => s.id === result.shift)?.name || "Unknown Shift";
    const locName = LOCATIONS.find(l => l.id === result.loc)?.name || "Unknown Location";

    // Inject final, clean output fields
    outputEl.innerHTML = `
      <div class="output-row">
        <label>Date</label>
        <span class="output-val selectable">${dateFormatted}</span>
      </div>
      <div class="output-row">
        <label>Shift & Location</label>
        <span class="output-val">${shiftName} • ${locName}</span>
      </div>
    `;
  }
}

// === INITIALIZATION & EVENT DELEGATION ===
function initLayout() {
  leftCard.innerHTML = "";
  rightCard.innerHTML = "";

  // Left card is always input, right card is always output.
  if (mode === "formToCode") {
    renderFormInput(leftCard);
    renderCodeOutput(rightCard);
  } else {
    renderCodeInput(leftCard);
    renderFormOutput(rightCard);
  }

  update();
  // Call immediately to reposition indicator if layout changes
  repositionIndicator();
}

// Switch Mode Button
switchBtn.addEventListener("click", () => {
  mode = mode === "formToCode" ? "codeToForm" : "formToCode";
  hasTypedCode = false; // Reset error tracking
  initLayout();
});

// Format Select Tabs
document.querySelectorAll(".format-selector button").forEach(btn => {
  btn.addEventListener("click", () => {
    // UI Update (Old active tab text changes back to muted)
    document.querySelectorAll(".format-selector button").forEach(b => b.classList.remove("active"));
    
    // Set New active tab text to Accent
    btn.classList.add("active");
    
    // SLIDE ANIMATION: Move the neumorphic white platform to the new button
    moveTabIndicator(btn);
    
    // State Update
    format = btn.dataset.format;
    
    // Clear debounce timer and error tracking on format switch
    clearTimeout(debounceTimer);
    if(mode === "codeToForm") hasTypedCode = false; 

    update();
  });
});

// Window Resize Handling
window.addEventListener('resize', () => {
    // Re-position sliding indicator to prevent alignment issues
    repositionIndicator();
});

// === DomLoaded Initialisation ===
document.addEventListener('DOMContentLoaded', () => {
    // Create and place the sliding platform element
    initTabIndicator();
    // Render the initial form and cards
    initLayout();
});