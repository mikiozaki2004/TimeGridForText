// State
let selectedSlots = {};
let dates = [];
let isDragging = false;
let dragMode = null; // 'select' or 'deselect'

const START_HOUR = 9;
const END_HOUR = 21;
const DAYS_COUNT = 7;
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initDates();
  renderGrid();
  loadSettings();
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

// Render the time grid
function renderGrid() {
  const grid = document.getElementById('time-grid');
  const hours = END_HOUR - START_HOUR;
  grid.style.gridTemplateColumns = `44px repeat(${DAYS_COUNT}, 1fr)`;
  grid.style.gridTemplateRows = `auto repeat(${hours}, 1fr)`;

  // Corner cell
  const corner = document.createElement('div');
  corner.className = 'grid-corner grid-header';
  grid.appendChild(corner);

  // Date headers
  dates.forEach(d => {
    const header = document.createElement('div');
    header.className = 'grid-header date-header' + (d.isToday ? ' today' : '');
    header.textContent = d.display;
    grid.appendChild(header);
  });

  // Time rows
  for (let h = START_HOUR; h < END_HOUR; h++) {
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
        isDragging = true;
        const isSelected = cell.classList.contains('selected');
        dragMode = isSelected ? 'deselect' : 'select';
        toggleCell(cell);
      });

      cell.addEventListener('mouseenter', () => {
        if (isDragging) {
          toggleCell(cell);
        }
      });

      grid.appendChild(cell);
    });
  }

  document.addEventListener('mouseup', () => {
    isDragging = false;
    dragMode = null;
  });
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
    const ranges = mergeHours(hours);
    const timeStrs = ranges.map(r => `${r.start}:00\u301C${r.end}:00`);
    const dateDisplay = formatDate(date);

    if (template === 'simple') {
      lines.push(`${dateDisplay} ${timeStrs.join(', ')}`);
    } else if (template === 'polite') {
      lines.push(`- ${dateDisplay} ${timeStrs.join(' / ')}`);
    } else if (template === 'business') {
      lines.push(`  ${dateDisplay} ${timeStrs.join(' / ')}`);
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
    if (window.__TAURI__) {
      const { writeText } = window.__TAURI__.clipboardManager || {};
      if (writeText) {
        await writeText(text);
      } else {
        // Fallback: try dynamic import
        const { writeText: write } = await import('@tauri-apps/plugin-clipboard-manager');
        await write(text);
      }
    } else {
      // Fallback for browser testing
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
    // Last resort fallback
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy to Clipboard';
        btn.classList.remove('copied');
      }, 1500);
    } catch (e) {
      btn.textContent = 'Copy Failed';
      setTimeout(() => {
        btn.textContent = 'Copy to Clipboard';
      }, 1500);
    }
  }
}

// Toggle always on top
let isPinned = false;
async function toggleAlwaysOnTop() {
  const btn = document.getElementById('btn-pin');

  try {
    if (window.__TAURI__) {
      const { getCurrentWindow } = window.__TAURI__.window || {};
      if (getCurrentWindow) {
        const appWindow = getCurrentWindow();
        isPinned = !isPinned;
        await appWindow.setAlwaysOnTop(isPinned);
      } else {
        const { getCurrentWindow: getCW } = await import('@tauri-apps/api/window');
        const appWindow = getCW();
        isPinned = !isPinned;
        await appWindow.setAlwaysOnTop(isPinned);
      }
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
    if (window.__TAURI__) {
      const { getCurrentWindow } = window.__TAURI__.window || {};
      if (getCurrentWindow) {
        await getCurrentWindow().close();
      } else {
        const { getCurrentWindow: getCW } = await import('@tauri-apps/api/window');
        await getCW().close();
      }
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
}

// Load settings from localStorage
function loadSettings() {
  const template = localStorage.getItem('timegrid-template');
  if (template) {
    document.getElementById('template-select').value = template;
  }
}
