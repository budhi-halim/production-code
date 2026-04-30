// === IMPORTS ===
import { SHIFTS, LOCATIONS, DEFAULT_SHELF_LIFE } from "./config.js";
import { formToCode, codeToForm, calculateExpirationDate, calculateProductionDate } from "./logic.js";

// === STATE ===
let mode = "formToCode"; // "formToCode" | "codeToForm"
let currentTab = "prodCode"; // "prodCode" | "expDate"
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

// === HELPER UTILS ===
// Ensure timezone doesn't shift the native date input string
function getLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d);
}

function getTodayLocalString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = date.getDate().toString().padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

function formatDateDDMMYY(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
  return `${d}${m}${y}`;
}

// === NEUMORPHIC TAB INDICATOR LOGIC ===
function initTabIndicator() {
  if (!formatTabsContainer || tabIndicatorEl) return;

  tabIndicatorEl = document.createElement('div');
  tabIndicatorEl.className = 'format-selector-indicator';
  formatTabsContainer.appendChild(tabIndicatorEl);

  moveTabIndicator(formatTabsContainer.querySelector('button.active'));
}

function moveTabIndicator(targetButton) {
  if (!targetButton || !tabIndicatorEl) return;
  
  const width = targetButton.offsetWidth;
  const leftPosition = targetButton.offsetLeft;
  
  tabIndicatorEl.style.width = width + "px";
  tabIndicatorEl.style.left = leftPosition + "px";
}

function repositionIndicator() {
    moveTabIndicator(document.querySelector('.format-selector button.active'));
}

// === RENDERERS ===
function renderFormInput(container) {
  if (currentTab === "prodCode") {
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
  } else {
    // Expiration Date (Forward Calculation)
    container.innerHTML = `
      <div class="input-group">
        <label>Production Date</label>
        <input type="date" id="dateInput">
      </div>
      <div class="input-group">
        <label>Shelf Life (Days)</label>
        <input type="number" id="shelfLifeInput" value="${DEFAULT_SHELF_LIFE}" min="1">
      </div>
    `;
  }

  container.querySelector("#dateInput").value = getTodayLocalString();
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
  if (currentTab === "prodCode") {
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
      e.target.value = e.target.value.toUpperCase();
      
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(update, 350);
    });
  } else {
    // Expiration Date (Reverse Calculation)
    container.innerHTML = `
      <div class="input-group">
        <label>Expiration Date</label>
        <input type="date" id="dateInput">
      </div>
      <div class="input-group">
        <label>Shelf Life (Days)</label>
        <input type="number" id="shelfLifeInput" value="${DEFAULT_SHELF_LIFE}" min="1">
      </div>
    `;
    container.querySelector("#dateInput").value = getTodayLocalString();
    container.querySelectorAll("input").forEach(el => el.addEventListener("input", update));
  }
}

function renderCodeOutput(container) {
  if (currentTab === "prodCode") {
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
  } else {
    container.innerHTML = `
      <div class="output-row" style="margin-bottom: 1rem;">
        <label>Expiration Date</label>
        <span class="output-val selectable" id="expDateText"></span>
      </div>
      <div class="code-output-container selectable" id="codeOutputTextContainer">
        <span class="code-output-text selectable" id="codeOutputText"></span>
        <button class="copy-btn selectable" id="copyBtn" aria-label="Copy Code">
        <span class="icon icon-copy">${SVG_COPY}</span>
        <span class="icon icon-check">${SVG_CHECK}</span>
        </button>
      </div>
    `;
  }

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
  if (mode === "formToCode") {
    if (currentTab === "prodCode") {
      const dateInput = document.getElementById("dateInput");
      if (!dateInput || !dateInput.value) return;

      const date = getLocalDate(dateInput.value);
      const shift = Number(document.getElementById("shiftInput").value);
      const loc = Number(document.getElementById("locInput").value);

      const code = formToCode(date, shift, loc);
      document.getElementById("codeOutputText").innerText = code;
    } else {
      const dateInput = document.getElementById("dateInput");
      const shelfInput = document.getElementById("shelfLifeInput");
      if (!dateInput || !dateInput.value || !shelfInput || !shelfInput.value) return;

      const prodDate = getLocalDate(dateInput.value);
      const shelfLife = parseInt(shelfInput.value, 10);
      const expDate = calculateExpirationDate(prodDate, shelfLife);
      
      document.getElementById("expDateText").innerText = formatDateDisplay(expDate);
      document.getElementById("codeOutputText").innerText = formatDateDDMMYY(expDate);
    }
  } 
  else {
    const outputEl = document.getElementById("formOutput");
    if (!outputEl) return;
    
    // Reset output block entirely
    outputEl.innerHTML = "";
    const errorEl = document.getElementById("codeError") || document.getElementById("formError");
    if (errorEl) errorEl.textContent = "";

    if (currentTab === "prodCode") {
      const inputEl = document.getElementById("codeInput");
      if (!inputEl) return; 

      const code = inputEl.value.toUpperCase();

      if (!code) {
        if (hasTypedCode && errorEl) errorEl.textContent = "Code required";
        return;
      }

      const result = codeToForm(code);

      if (result.error) {
        if (errorEl) errorEl.textContent = result.error;
        return;
      }

      const shiftName = SHIFTS.find(s => s.id === result.shift)?.name || "Unknown Shift";
      const locName = LOCATIONS.find(l => l.id === result.loc)?.name || "Unknown Location";

      outputEl.innerHTML = `
        <div class="output-row">
          <label>Date</label>
          <span class="output-val selectable">${formatDateDisplay(result.date)}</span>
        </div>
        <div class="output-row">
          <label>Shift & Location</label>
          <span class="output-val">${shiftName} • ${locName}</span>
        </div>
      `;
    } else {
      const dateInput = document.getElementById("dateInput");
      const shelfInput = document.getElementById("shelfLifeInput");
      if (!dateInput || !dateInput.value || !shelfInput || !shelfInput.value) return;

      const expDate = getLocalDate(dateInput.value);
      const shelfLife = parseInt(shelfInput.value, 10);
      const prodDate = calculateProductionDate(expDate, shelfLife);
      
      outputEl.innerHTML = `
        <div class="output-row">
          <label>Production Date</label>
          <span class="output-val selectable">${formatDateDisplay(prodDate)}</span>
        </div>
      `;
    }
  }
}

// === INITIALIZATION & EVENT DELEGATION ===
function initLayout() {
  leftCard.innerHTML = "";
  rightCard.innerHTML = "";

  if (mode === "formToCode") {
    renderFormInput(leftCard);
    renderCodeOutput(rightCard);
  } else {
    renderCodeInput(leftCard);
    renderFormOutput(rightCard);
  }

  update();
  repositionIndicator();
}

// Switch Mode Button
switchBtn.addEventListener("click", () => {
  mode = mode === "formToCode" ? "codeToForm" : "formToCode";
  hasTypedCode = false; 
  initLayout();
});

// Tab Selection
document.querySelectorAll(".format-selector button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".format-selector button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    moveTabIndicator(btn);
    
    currentTab = btn.dataset.tab;
    
    clearTimeout(debounceTimer);
    hasTypedCode = false; 

    initLayout();
  });
});

window.addEventListener('resize', () => {
    repositionIndicator();
});

document.addEventListener('DOMContentLoaded', () => {
    initTabIndicator();
    initLayout();
});