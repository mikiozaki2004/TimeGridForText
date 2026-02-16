// State
let selectedSlots = {};
let dates = [];
let isDragging = false;
let dragMode = null; // 'select' or 'deselect'

let startHour = 9;
let endHour = 21;
const DAYS_COUNT = 7;
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

let longPressTimer = null;
let longPressCell = null;
const LONG_PRESS_MS = 500;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initDates();
  initTimeRangeSelectors();
  loadSettings();
  renderGrid();
  setupEventListeners();
  updateOutput();
});

// Generate dates for 1 week starting from today
function initDates() {
  const today = new Date();
  dates = [];
  for (let i = 0; i < DAYS_COUNT; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dow = DAY_NAMES[d.getDay()];
    const full = `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dates.push({ full, display: `${month}/${day}(${dow})`, isToday: i === 0 });
  }
}

// Initialize time range selectors (0:00 ~ 24:00)
function initTimeRangeSelectors() {
  const startSelect = document.getElementById('start-hour-select');
  const endSelect = document.getElementById('end-hour-select');

  for (let h = 0; h <= 23; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${h}:00`;
    startSelect.appendChild(opt);
  }

  for (let h = 1; h <= 24; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${h}:00`;
    endSelect.appendChild(opt);
  }

  startSelect.value = startHour;
  endSelect.value = endHour;

  startSelect.addEventListener('change', onTimeRangeChange);
  endSelect.addEventListener('change', onTimeRangeChange);
}

// Handle time range change
function onTimeRangeChange() {
  const newStart = parseInt(document.getElementById('start-hour-select').value);
  const newEnd = parseInt(document.getElementById('end-hour-select').value);

  if (newStart >= newEnd) return;

  startHour = newStart;
  endHour = newEnd;
  saveSettings();
  renderGrid();
  updateOutput();
}

// Render the time grid
function renderGrid() {
  const grid = document.getElementById('time-grid');
  grid.innerHTML = '';
  const hours = endHour - startHour;
  grid.style.gridTemplateColumns = `44px repeat(${DAYS_COUNT}, 1fr)`;
  grid.style.gridTemplateRows = `auto repeat(${hours}, 1fr)`;

  // Corner cell
  const corner = document.createElement('div');
  corner.className = 'grid-corner grid-header';
  grid.appendChild(corner);

  // Date headers (clickable to toggle all day)
  dates.forEach(d => {
    const header = document.createElement('div');
    header.className = 'grid-header date-header' + (d.isToday ? ' today' : '');
    header.textContent = d.display;
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => toggleAllDay(d.full));
    grid.appendChild(header);
  });

  // Time rows
  for (let h = startHour; h < endHour; h++) {
    // Time label
    const timeLabel = document.createElement('div');
    timeLabel.className = 'grid-header time-header';
    timeLabel.textContent = `${h}:00`;
    grid.appendChild(timeLabel);

    // Day cells
    dates.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.date = d.full;
      cell.dataset.hour = h;
      cell.textContent = `${h}`;

      cell.addEventListener('mousedown', (e) => {
        e.preventDefault();

        if (e.shiftKey) {
          selectRange(d.full, startHour, h);
          isDragging = false;
          return;
        }

        if (e.ctrlKey || e.metaKey) {
          selectRange(d.full, h, endHour - 1);
          isDragging = false;
          return;
        }

        // Start long press detection
        longPressCell = { date: d.full, hour: h };
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          // Long press activated: wait for arrow key
          isDragging = false;
          cell.classList.add('long-pressed');
        }, LONG_PRESS_MS);

        isDragging = true;
        const isSelected = cell.classList.contains('selected');
        dragMode = isSelected ? 'deselect' : 'select';
        toggleCell(cell);
      });

      cell.addEventListener('mouseup', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        cell.classList.remove('long-pressed');
      });

      cell.addEventListener('mouseenter', () => {
        if (isDragging) {
          toggleCell(cell);
        }
      });

      // Restore selection state
      if (selectedSlots[d.full] && selectedSlots[d.full].includes(h)) {
        cell.classList.add('selected');
      }

      grid.appendChild(cell);
    });
  }
}

// Toggle all hours for a given date (all day)
function toggleAllDay(date) {
  const allSelected = selectedSlots[date] && selectedSlots[date].length === (endHour - startHour);

  if (allSelected) {
    // Deselect all
    delete selectedSlots[date];
    document.querySelectorAll(`.grid-cell[data-date="${date}"]`).forEach(cell => {
      cell.classList.remove('selected');
    });
  } else {
    // Select all
    selectRange(date, startHour, endHour - 1);
  }

  updateOutput();
}

// Check if a date has all hours selected
function isAllDay(date) {
  if (!selectedSlots[date]) return false;
  for (let h = startHour; h < endHour; h++) {
    if (!selectedSlots[date].includes(h)) return false;
  }
  return true;
}

// Select a range of hours for a given date
function selectRange(date, fromHour, toHour) {
  if (!selectedSlots[date]) selectedSlots[date] = [];

  for (let h = fromHour; h <= toHour; h++) {
    if (!selectedSlots[date].includes(h)) {
      selectedSlots[date].push(h);
    }
    const cell = document.querySelector(`.grid-cell[data-date="${date}"][data-hour="${h}"]`);
    if (cell) cell.classList.add('selected');
  }

  selectedSlots[date].sort((a, b) => a - b);
  updateOutput();
}

// Toggle a cell based on drag mode
function toggleCell(cell) {
  const date = cell.dataset.date;
  const hour = parseInt(cell.dataset.hour);

  if (dragMode === 'select') {
    cell.classList.add('selected');
    if (!selectedSlots[date]) selectedSlots[date] = [];
    if (!selectedSlots[date].includes(hour)) {
      selectedSlots[date].push(hour);
      selectedSlots[date].sort((a, b) => a - b);
    }
  } else if (dragMode === 'deselect') {
    cell.classList.remove('selected');
    if (selectedSlots[date]) {
      selectedSlots[date] = selectedSlots[date].filter(h => h !== hour);
      if (selectedSlots[date].length === 0) delete selectedSlots[date];
    }
  }

  updateOutput();
}

// Merge consecutive hours into ranges
function mergeHours(hours) {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ start, end: end + 1 });
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push({ start, end: end + 1 });
  return ranges;
}

// Format date for display
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES[d.getDay()];
  return `${month}/${day}(${dow})`;
}

// Generate output text based on template
function generateText(template) {
  const sortedDates = Object.keys(selectedSlots).sort();
  if (sortedDates.length === 0) return '';

  const lines = [];

  sortedDates.forEach(date => {
    const hours = selectedSlots[date];
    if (!hours || hours.length === 0) return;
    const dateDisplay = formatDate(date);
    const allDay = isAllDay(date);
    const timeStr = allDay ? '\u7D42\u65E5' : (() => {
      const ranges = mergeHours(hours);
      return ranges.map(r => `${r.start}:00\u301C${r.end}:00`).join(template === 'simple' ? ', ' : ' / ');
    })();

    if (template === 'simple') {
      lines.push(`${dateDisplay} ${timeStr}`);
    } else if (template === 'polite') {
      lines.push(`- ${dateDisplay} ${timeStr}`);
    } else if (template === 'business') {
      lines.push(`  ${dateDisplay} ${timeStr}`);
    }
  });

  if (template === 'simple') {
    return lines.join('\n');
  } else if (template === 'polite') {
    return `\u4E0B\u8A18\u306E\u65E5\u7A0B\u3067\u3054\u90FD\u5408\u3044\u304B\u304C\u3067\u3057\u3087\u3046\u304B\uFF1F\n\n${lines.join('\n')}\n\n\u3054\u78BA\u8A8D\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002`;
  } else if (template === 'business') {
    return `\u304A\u4E16\u8A71\u306B\u306A\u3063\u3066\u304A\u308A\u307E\u3059\u3002\n\u6253\u3061\u5408\u308F\u305B\u306E\u4EF6\u3001\u4E0B\u8A18\u65E5\u7A0B\u3067\u304A\u4F3A\u3044\u3067\u304D\u307E\u3059\u3002\n\n${lines.join('\n')}\n\n\u3054\u90FD\u5408\u306E\u3088\u308D\u3057\u3044\u65E5\u6642\u3092\u304A\u77E5\u3089\u305B\u3044\u305F\u3060\u3051\u307E\u3059\u3068\u5E78\u3044\u3067\u3059\u3002\n\u4F55\u5352\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002`;
  }
  return '';
}

// Update the output textarea
function updateOutput() {
  const template = document.getElementById('template-select').value;
  const text = generateText(template);
  document.getElementById('output-text').value = text;
}

// Setup event listeners
function setupEventListeners() {
  // Mouse up (once)
  document.addEventListener('mouseup', () => {
    isDragging = false;
    dragMode = null;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    // Clear long-pressed state after a short delay (allow keydown to fire first)
    setTimeout(() => {
      document.querySelectorAll('.long-pressed').forEach(c => c.classList.remove('long-pressed'));
      longPressCell = null;
    }, 300);
  });

  // Arrow keys after long press
  document.addEventListener('keydown', (e) => {
    if (!longPressCell) return;
    const { date, hour } = longPressCell;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectRange(date, startHour, hour);
      longPressCell = null;
      document.querySelectorAll('.long-pressed').forEach(c => c.classList.remove('long-pressed'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectRange(date, hour, endHour - 1);
      longPressCell = null;
      document.querySelectorAll('.long-pressed').forEach(c => c.classList.remove('long-pressed'));
    }
  });

  // Template change
  document.getElementById('template-select').addEventListener('change', () => {
    updateOutput();
    saveSettings();
  });

  // Reset button
  document.getElementById('btn-reset').addEventListener('click', resetAll);

  // Copy button
  document.getElementById('btn-copy').addEventListener('click', copyToClipboard);

  // Pin button (always on top)
  document.getElementById('btn-pin').addEventListener('click', toggleAlwaysOnTop);

  // Close button
  document.getElementById('btn-close').addEventListener('click', closeWindow);
}

// Reset all selections
function resetAll() {
  selectedSlots = {};
  document.querySelectorAll('.grid-cell.selected').forEach(cell => {
    cell.classList.remove('selected');
  });
  updateOutput();
}

// Copy to clipboard
async function copyToClipboard() {
  const text = document.getElementById('output-text').value;
  if (!text) return;

  const btn = document.getElementById('btn-copy');

  try {
    if (window.__TAURI__ && window.__TAURI__.clipboardManager) {
      await window.__TAURI__.clipboardManager.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }

    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy to Clipboard';
      btn.classList.remove('copied');
    }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
    btn.textContent = 'Copy Failed';
    setTimeout(() => {
      btn.textContent = 'Copy to Clipboard';
    }, 1500);
  }
}

// Get Tauri window object
function getTauriWindow() {
  if (window.__TAURI__ && window.__TAURI__.window) {
    return window.__TAURI__.window.getCurrentWindow();
  }
  return null;
}

// Toggle always on top
let isPinned = false;
async function toggleAlwaysOnTop() {
  const btn = document.getElementById('btn-pin');

  try {
    const appWindow = getTauriWindow();
    if (appWindow) {
      isPinned = !isPinned;
      await appWindow.setAlwaysOnTop(isPinned);
    } else {
      isPinned = !isPinned;
    }
  } catch (err) {
    console.error('Failed to toggle always on top:', err);
    isPinned = !isPinned;
  }

  btn.classList.toggle('pinned', isPinned);
}

// Close window
async function closeWindow() {
  try {
    const appWindow = getTauriWindow();
    if (appWindow) {
      await appWindow.close();
    } else {
      window.close();
    }
  } catch (err) {
    console.error('Failed to close:', err);
    window.close();
  }
}

// Save settings to localStorage
function saveSettings() {
  const template = document.getElementById('template-select').value;
  localStorage.setItem('timegrid-template', template);
  localStorage.setItem('timegrid-start-hour', startHour);
  localStorage.setItem('timegrid-end-hour', endHour);
}

// Load settings from localStorage
function loadSettings() {
  const template = localStorage.getItem('timegrid-template');
  if (template) {
    document.getElementById('template-select').value = template;
  }

  const savedStart = localStorage.getItem('timegrid-start-hour');
  const savedEnd = localStorage.getItem('timegrid-end-hour');
  if (savedStart !== null && savedEnd !== null) {
    const s = parseInt(savedStart);
    const e = parseInt(savedEnd);
    if (s < e && s >= 0 && e <= 24) {
      startHour = s;
      endHour = e;
      document.getElementById('start-hour-select').value = startHour;
      document.getElementById('end-hour-select').value = endHour;
    }
  }
}
