/*
 THE BEER-WARE LICENSE (Revision 42)

<mende.r@hotmail.de> wrote this file. As long as you retain this notice you can do whatever you want with this
 stuff. If we meet someday, and you think this stuff is worth it, you can
 buy me a beer in return.
 Ralf Mende
*/

// Number of switch groups per keyboard page (each group has 2 buttons) -> can be set to 8/16
const keyboardGroupCnt = 8;

let locList = {};
let switchList = {};
let locoState = {};

let isRunning = false;
let currentActiveContainer = 'control'; // Keeps selected page, in case of returning to website
let currentLocoUid = null; // Keeps selected locomotive from control page (via UID)
let currentKeyboardId = 0; // Keeps selected keyboard ID from keyboard page
const debounce_udp_message = 10; // Timer in ms

let isDragging = false;
let dragTimeout = null;

const Direction = Object.freeze({
  FORWARD: 1,
  REVERSE: 2,
});

const stopBtn = document.getElementById('stopBtn');
const speedSlider = document.getElementById('speedSlider');
const speedFill = document.getElementById('speedFill');
const speedValue = document.getElementById('speedValue');
const speedBar = document.getElementById('speedBar');
const reverseBtn = document.getElementById('reverseBtn');
const forwardBtn = document.getElementById('forwardBtn');
const locoDesc = document.getElementById('locoDesc');
const locoImg = document.getElementById('locoImg');
const locoList = document.getElementById('locoList');
const leftCol = document.getElementById('leftFunctions');
const rightCol = document.getElementById('rightFunctions');
const keyboardTab = document.getElementById('keyboardTab');
const controlTab = document.getElementById('controlTab');
const controlPage = document.getElementById('controlPage');
const keyboardPage = document.getElementById('keyboardPage');
const infoBtn = document.getElementById('infoBtn');
// Keyboard buttons and page buttons are built dynamically; query as needed
let keyboardPageBtns = null; // will be set after dynamic build

if (!window.CONFIG_PATH) {
  throw new Error('CONFIG_PATH not defined: backend must set window.CONFIG_PATH before loading script.js');
}
const STATIC_BASE = window.CONFIG_PATH.replace(/\/$/, '');
function asset(rel) {
  if (!rel.startsWith('/')) rel = '/' + rel;
  return STATIC_BASE + rel;
}

// Tab navigation between control and keyboard panels.
// The markup contains two tabs: one for the locomotive control view and one for the keyboard view.
// Attach click listeners to each tab so that clicking a tab hides the inactive page, reveals the
// chosen page and updates the 'active' CSS class on the tab.  This also updates the
// `currentActiveContainer` global so other code knows which panel is showing.
if (keyboardTab && controlTab && controlPage && keyboardPage) {
  keyboardTab.addEventListener('click', function() {
    controlPage.classList.add('hidden');
    keyboardPage.classList.remove('hidden');
    keyboardTab.classList.add('active');
    controlTab.classList.remove('active');
    currentActiveContainer = 'keyboard';
  });
  controlTab.addEventListener('click', function() {
    keyboardPage.classList.add('hidden');
    controlPage.classList.remove('hidden');
    controlTab.classList.add('active');
    keyboardTab.classList.remove('active');
    currentActiveContainer = 'control';
  });
}

/**
 * Switch between the control and keyboard views.
 *
 * When the user navigates via the tab bar or when persisted state
 * is restored on page load, the UI must show either the locomotive
 * control panel or the keyboard panel.  This helper applies
 * appropriate CSS classes to hide or reveal the pages and sets
 * the `currentActiveContainer` global to reflect the new active
 * view.
 *
 * @param {('control'|'keyboard')} container – which container to activate
 */
function activateContainer(container) {
  if (container === 'keyboard') {
    controlPage.classList.add('hidden');
    keyboardPage.classList.remove('hidden');
    keyboardTab.classList.add('active');
    controlTab.classList.remove('active');
    currentActiveContainer = 'keyboard';
  } else {
    keyboardPage.classList.add('hidden');
    controlPage.classList.remove('hidden');
    controlTab.classList.add('active');
    keyboardTab.classList.remove('active');
    currentActiveContainer = 'control';
  }
}

// Restore persisted UI state and initialize accessory data on page load.
// When the DOM content is ready, read persisted selections from localStorage (the active
// keyboard page and last active container) and apply them. Then load the accessory (switch)
// list and state from the backend so the keyboard view can be initialized correctly.
document.addEventListener('DOMContentLoaded', function() {
  let savedKeyboardId = localStorage.getItem('currentKeyboardId');
  let savedContainer = localStorage.getItem('currentActiveContainer');
  if (savedKeyboardId) {
    activateKeyboardBtnById(Number(savedKeyboardId));
  } else {
    activateKeyboardBtnById(0);
  }
  if (savedContainer === 'keyboard') {
    activateContainer('keyboard');
  } else {
    activateContainer('control');
  }
  updateKeyboardHeaderText();
  updateKeyboardGroupLabels();
  // Load accessory (switch) list
  fetch('/api/switch_list')
    .then(response => response.json())
    .then(data => {
      switchList = data;
      updateKeyboardGroupLabels();
    })
    .catch(() => {
      switchList = {};
      updateKeyboardGroupLabels();
    });
  // Load and initialize keyboard switch states
  fetch('/api/switch_state')
    .then(response => response.json())
    .then(data => {
      const switchState = data && data.switch_state ? data.switch_state : [];
      initializeKeyboardButtons(switchState);
    })
    .catch(() => {
      initializeKeyboardButtons([]);
    });
});

//
// ==========================
//  INFO BUTTON SECTION
// ==========================
//
// The functions in this section handle the behavior of the global
// "INFO" button. With this button you leave the current view and
// navigate to the info page.

// When the user clicks the info button, persist the current UI state and navigate to /info.
// This persists the active container, selected locomotive and keyboard page so the UI can
// be restored when returning from the info page.
if (infoBtn) {
  infoBtn.onclick = function() {
    localStorage.setItem('currentActiveContainer', currentActiveContainer);
    if (currentLocoUid != null) {
      localStorage.setItem('currentLocoUid', currentLocoUid);
    }
    localStorage.setItem('currentKeyboardId', currentKeyboardId);
    window.location.href = '/info';
  };
}

//
// ==========================
//  STOP BUTTON SECTION
// ==========================
//
// The functions in this section handle the behaviour of the global
// "STOP" button.  This button toggles the overall system state
// (start/stop) and updates its own appearance based on that state.
// Grouping these together makes it easier to reason about the
// stop‑button behavior independently of locomotive control or
// keyboard logic.

/**
 * Update the visual state of the stop button.
 *
 * The stop button toggles between a running and a stopped state.
 * Whenever the server reports a change in the overall system status,
 * this function adjusts the CSS class and label accordingly.  It
 * encapsulates DOM manipulation so that other parts of the code
 * simply call {@link updateStopButtonUI} without worrying about how
 * the styling or text is applied.
 */
function updateStopButtonUI() {
  stopBtn.className = isRunning ? 'stop tab' : 'go tab';
  stopBtn.textContent = isRunning ? 'STOP' : 'GO';
}

// Handle clicks on the stop button by toggling the overall system state.
// The new desired state is sent to the server; the isRunning flag is only updated when
// the server broadcasts a system event via SSE.
stopBtn.addEventListener('click', () => {
  fetch('/api/stop_button', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: !isRunning })
  });
  // isRunning and updateStopButtonUI() are only set via SSE!
});

// Subscribe to Server‑Sent Events (SSE) from the backend to keep the UI in sync.
// The backend emits events for system status, switch changes and locomotive state changes.
// When messages arrive, update the corresponding UI (stop button, switch pairs, direction, speed
// and function buttons) if they relate to the currently active locomotive or keyboard page.
const evtSource = new EventSource('/api/events');
evtSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'loco_list_reloaded') {
    // Backend indicates that lokomotive.cs2 changed. Reload list and UI using the shared path.
    loadAndRenderLocoList({ preserveSelection: true });
    return;
  }
  if (data.type === 'system') {
      isRunning = data.status;
    updateStopButtonUI();
  }
  if (currentLocoUid == data.loc_id) {
    if (data.type === 'direction') {
      const v = (data.value === 'reverse' || data.value === 2 || data.value === '2')
        ? Direction.REVERSE
        : Direction.FORWARD;
      updateDirectionUI(v);
    }
    if (data.type === 'speed') {
      speedSlider.value = data.value;
      updateSpeedUI(data.value);
    }
    if (data.type === 'function') {
      updateLocoFunctionButton(data.fn, data.value);
    }
  }
  if (data.type === 'switch' && typeof data.idx === 'number' && typeof data.value !== 'undefined') {
  // idx: 0-63
  // Back-calculate: keyboardId = Math.floor(idxNum/keyboardGroupCnt), groupIdx = (idxNum%keyboardGroupCnt)
  const idxNum = Number(data.idx);
  const valueNum = Number(data.value);
  const keyboardId = Math.floor(idxNum / keyboardGroupCnt);
  const groupIdx = idxNum % keyboardGroupCnt;
    // Only if the current page is affected:
    if (keyboardId === currentKeyboardId) {
      // Find the two buttons of the group
      const btn1 = document.querySelectorAll('.keyboard-btn')[groupIdx * 2];
      const btn2 = document.querySelectorAll('.keyboard-btn')[groupIdx * 2 + 1];
      if (btn1 && btn2) {
        updateSwitchUI(btn1, btn2, valueNum);
      }
    }
  }
};

//
// ==========================
//  LOCOMOTIVE CONTROL SECTION
// ==========================
//
// The functions in this section manipulate a single locomotive.  They
// send commands to the backend (speed, direction, functions) and
// reflect state changes in the UI.  Naming is normalised to start
// with "setLoco…" for actions that send commands to the server, and
// "update…" for pure UI updates.  Fetch functions that only read
// state are prefixed with "fetchAnd…".

// Helper: select a locomotive by uid, update UI and fetch state
function selectLoco(uid) {
  currentLocoUid = Number(uid);
  if (!isFinite(currentLocoUid)) return;
  const loco = locList[String(currentLocoUid)] || locList[currentLocoUid];
  locoDesc.textContent = loco ? (loco.name || '') : '';
  const iconName = (loco && (loco.icon || loco.bild)) || 'leeres Gleis';
  locoImg.src = asset(`icons/${iconName}.png`);
  fetchAndApplyLocoState(currentLocoUid);
  localStorage.setItem('currentLocoUid', String(currentLocoUid));
}

// Helper: rebuild the locomotive list icons and click handlers
function renderLocoList() {
  const listEl = document.getElementById('locoList');
  if (listEl) listEl.innerHTML = '';
  const uids = Object.keys(locList);
  uids.forEach(uid => {
    const loco = locList[uid];
    const img = new Image();
    img.alt = loco.name;
    img.title = loco.name;
    img.onerror = function() {
      img.onerror = null;
      img.src = asset('icons/leeres Gleis.png');
    };
    const iconName = loco.icon || loco.bild || 'leeres Gleis';
    img.src = asset(`icons/${iconName}.png`);
    if (listEl) listEl.appendChild(img);
    img.onclick = () => selectLoco(loco.uid);
  });
  return uids;
}

// Unified loader: fetch loco_list (and optionally loco_state), render UI, and choose selection
function loadAndRenderLocoList(options) {
  const opts = Object.assign({ preserveSelection: false, alsoLoadStateMap: false }, options || {});
  const prevUid = opts.preserveSelection ? currentLocoUid : null;
  return fetch('/api/loco_list')
    .then(r => r.json())
    .then(newList => {
      locList = newList || {};
      const statePromise = opts.alsoLoadStateMap
        ? fetch('/api/loco_state').then(r => r.json()).then(s => { locoState = s || {}; }).catch(() => { locoState = {}; })
        : Promise.resolve();
      return statePromise.then(() => {
        const uids = renderLocoList();
        let selected = null;
        if (prevUid && (locList[String(prevUid)] || locList[prevUid])) {
          selected = Number(prevUid);
        } else {
          // Try localStorage
          const saved = localStorage.getItem('currentLocoUid');
          if (saved && (locList[saved] || locList[Number(saved)])) selected = Number(saved);
        }
        if (selected == null) {
          const firstUid = uids[0];
          if (firstUid) selected = locList[firstUid]?.uid || Number(firstUid);
        }
        if (selected != null) selectLoco(selected);
      });
    })
    .catch(err => console.warn('Failed to load loco list:', err));
}

// Load the list of available locomotives and initialise their UI elements.
// This call retrieves the locomotive metadata, populates the locomotive list with icons and
// names, restores the previously selected locomotive if present and applies its state to the
// UI.  It also fetches the overall state once to mirror the authoritative state from the server.
// Initial load using unified path
loadAndRenderLocoList({ preserveSelection: true, alsoLoadStateMap: true });

/**
 * Update the direction buttons in the UI.
 *
 * The direction buttons (forward/reverse) use different images to
 * indicate which one is active.  This function takes a direction
 * string and swaps the corresponding images.  The value may come
 * either from the server (state update) or from user interaction.
 *
 * @param {1|2} dir – direction enum (Direction.FORWARD or Direction.REVERSE)
 */
function updateDirectionUI(dir) {
  if (dir === Direction.FORWARD) {
    forwardBtn.src = '/static/grafics/dir_right_active.png';
    reverseBtn.src = '/static/grafics/dir_left_inactive.png';
  } else {
    forwardBtn.src = '/static/grafics/dir_right_inactive.png';
    reverseBtn.src = '/static/grafics/dir_left_active.png';
  }
}

/**
 * Send a direction command for the current locomotive.
 *
 * Converts a human‑friendly string ('forward'/'reverse') into the
 * numeric values understood by the backend (1 for forward, 2 for
 * reverse) and posts the update via fetch.  Logging is kept for
 * debugging purposes.
 *
 * @param {1|2} dir – direction enum (Direction.FORWARD or Direction.REVERSE)
 */
function setLocoDirection(dir) {
  console.log('Sending direction for loco_id:', currentLocoUid, 'direction:', dir);
  fetch('/api/control_event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loco_id: currentLocoUid,
   direction: dir
    })
  });
}

/**
 * Update the speed readout and bar in the UI.
 *
 * The protocol expresses speed from 0–1000.  The UI displays a bar
 * scaled 0–100 % and a textual km/h value based on each
 * locomotive's maximum.  This function performs both calculations.
 *
 * @param {number} val – the raw speed value (0–1000)
 */
function updateSpeedUI(val) {
  speedFill.style.height = `${(val / 1000) * 100}%`;
  // Each locomotive may declare its own max speed in km/h.  If not
  // provided, default to 200.  Convert the protocol value to km/h.
  const tachomax = locList[currentLocoUid].tachomax || 200;
  const kmh = Math.round(val * tachomax / 1000);
  speedValue.textContent = `${kmh} km/h`;
}

/**
 * Fetch the current state for a given locomotive and update the UI.
 *
 * This function reads the latest speed, direction and function states
 * from the backend without sending any commands.  It then applies
 * those values to the controls.  Use this after selecting a new
 * locomotive or when you need to mirror server state on page load.
 *
 * @param {number} locoUid – the unique id of the locomotive
 */
function fetchAndApplyLocoState(locoUid) {
  fetch(`/api/loco_state?loco_id=${locoUid}`)
    .then(r => r.json())
    .then(state => {
      const s = state || {};
      const spd = Number(s.speed || 0);
      speedSlider.value = spd;
      updateSpeedUI(spd);
      const dir = (s.direction === 'reverse' || s.direction === 2 || s.direction === '2')
        ? Direction.REVERSE
        : Direction.FORWARD;
      updateDirectionUI(dir);
      updateAllLocoFunctionButtons(s.functions || {});
    })
    .catch(err => console.warn('Failed to fetch state:', err));
}


//
// Pointer event handling for the vertical speed bar.  When the user
// presses and drags on the speed bar, update the slider value
// continuously; on click release, send a final update.  These
// handlers operate on the global `speedBar` element defined in
// the markup.  They are grouped here because they tie directly into
// speed setting for the locomotive.
speedBar.addEventListener('pointerdown', (e) => {
  isDragging = false;
  const startY = e.clientY;
  dragTimeout = setTimeout(() => {
    isDragging = true;
  }, 100);

  speedBar.setPointerCapture(e.pointerId);

  const onMove = (e) => {
    if (!isDragging) return;
    const rect = speedBar.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = 1 - (y / rect.height);
    const value = Math.min(1000, Math.max(0, Math.round(percent * 1000)));
    speedSlider.value = value;
    setLocoSpeed(value);
  };

  const onUp = (e) => {
    clearTimeout(dragTimeout);
    speedBar.releasePointerCapture(e.pointerId);
    speedBar.removeEventListener('pointermove', onMove);
    speedBar.removeEventListener('pointerup', onUp);
    speedBar.removeEventListener('pointercancel', onUp);

    if (!isDragging) {
      const rect = speedBar.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percent = 1 - (y / rect.height);
      const value = Math.min(1000, Math.max(0, Math.round(percent * 1000)));
      speedSlider.value = value;
      setLocoSpeed(value);
    }
  };

  speedBar.addEventListener('pointermove', onMove);
  speedBar.addEventListener('pointerup', onUp);
  speedBar.addEventListener('pointercancel', onUp);
});

/**
 * Set the speed of the current locomotive.
 *
 * Writes the speed slider value back to the UI (so the bar and
 * readout update) and posts the new speed to the server.  A
 * debounce could be added here but is commented out for now.
 *
 * @param {number} val – the raw speed (0–1000)
 */
function setLocoSpeed(val) {
  updateSpeedUI(val);
  fetch('/api/control_event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loco_id: currentLocoUid,
      speed: val
    })
  });
}

/**
 * Format an icon id as two digits (e.g., 1 → "01").
 *
 * The server provides icon identifiers as numbers.  Many of the
 * filenames on disk expect two‑character numeric strings.  This helper
 * pads single‑digit numbers with a leading zero.  It is kept near
 * the stop‑button group because icons are also used in several UI
 * elements and having this utility here aids readability.
 *
 * @param {number|string} v – the numeric value to pad
 * @returns {string} the zero‑padded string
 */
function pad2(v) {
  const s = String(v ?? '');
  return s.length >= 2 ? s : s.padStart(2, '0');
}

/**
 * Set a function icon with fallbacks (browser‑safe, no filesystem).
 *
 * Each locomotive function (e.g. headlights, horn) is represented by
 * an icon.  Icons may differ across locomotives, so this helper
 * constructs a URL for the appropriate file and falls back to a
 * generic icon if the specific one isn't available.  The browser
 * preloads the primary icon and selects the fallback on error.  This
 * avoids filesystem access issues on certain platforms.
 *
 * @param {HTMLImageElement} img – the DOM image element to mutate
 * @param {string} iconPrefix – 'we' for inactive or 'ge' for active
 * @param {number} id – the icon identifier
 * @param {number} index – the function index (used for fallback)
 * @returns {string} the URL of the primary image
 */
function setFunctionIcon(img, iconPrefix, id, index) {
  const primary  = asset(`fcticons/FktIcon_a_${iconPrefix}_${pad2(id)}.png`);
  const fallback = asset(`fcticons/FktIcon_a_${iconPrefix}_${pad2(50 + index)}.png`);

  const probe = new Image();
  probe.onload  = () => { img.src = primary; };
  probe.onerror = () => { img.src = fallback; };
  probe.src = primary;
  return primary;
}

/**
 * Look up the configured icon type for a function index on the
 * currently selected locomotive.
 *
 * Locomotives advertise their available functions (e.g. headlights,
 * horn) via the `funktionen` array.  This helper retrieves the
 * `typ`/`type` property for the given index, falling back to null if
 * missing.  By encapsulating this lookup, the UI can remain agnostic
 * about the underlying data structures.
 *
 * @param {number} idx – the numeric function index
 * @returns {number|null} the function type id or null
 */
function getFunctionTypeFromLocList(idx) {
  try {
    const loco = locList[currentLocoUid];
    if (!loco || !loco.funktionen) return null;
    const entry = loco.funktionen[idx] ?? loco.funktionen[String(idx)];
    if (!entry) return null;
    return entry.typ ?? entry.type ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Create a function button element for a locomotive.
 *
 * Locomotives may have many auxiliary functions (F0–F28 etc.).  This
 * helper constructs a button with the correct icon and state
 * attributes.  The returned button does not yet have a click
 * handler; event delegation is set up separately.  See
 * {@link handleLocoFunctionButtonClick} for click handling.
 *
 * @param {number} idx – the function index (0–27)
 * @returns {HTMLButtonElement} the newly created button
 */
function createLocoFunctionButton(idx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fn-btn';
  btn.style.border = 'none';
  btn.style.outline = 'none';
  btn.style.boxShadow = 'none';
  btn.style.background = 'transparent';
  btn.style.padding = '0';
  btn.dataset.index = String(idx);
  let imgid = getFunctionTypeFromLocList(idx);
  if (imgid == null) imgid = 50 + idx;
  btn.dataset.imgid = String(imgid);
  btn.setAttribute('aria-pressed', 'false');
  btn.dataset.active = '0';
  const img = document.createElement('img');
  img.alt = `Function ${idx}`;
  setFunctionIcon(img, 'we', imgid, idx);
  btn.appendChild(img);
  return btn;
}

/**
 * Append eight locomotive function buttons to a column element.
 *
 * Each locomotive has up to 28 functions.  In the UI these are split
 * between two columns.  This helper populates a column (left or
 * right) with eight buttons starting at the given offset.  It also
 * attaches a delegated click handler once per column to minimise
 * individual listeners.
 *
 * @param {HTMLElement} col – the container column (left or right)
 * @param {number} offset – starting index for the eight buttons
 */
function setupLocoFunctionButtons(col, offset) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 8; i++) {
    const idx = offset + i;
    frag.appendChild(createLocoFunctionButton(idx));
  }
  col.appendChild(frag);
  if (!col.dataset.fnDelegated) {
    col.addEventListener('click', handleLocoFunctionButtonClick);
    col.dataset.fnDelegated = '1';
  }
}

// Create and attach the locomotive function buttons on initial load
setupLocoFunctionButtons(leftCol, 0);
setupLocoFunctionButtons(rightCol, 7);

/**
 * Handle clicks on locomotive function buttons via event delegation.
 *
 * Determines which button was clicked, toggles its active state,
 * updates its icon and notifies the server.  Event delegation is
 * preferred here because it avoids attaching individual listeners
 * for each function button and simplifies dynamic DOM insertion.
 *
 * @param {MouseEvent} ev – the click event
 */
function handleLocoFunctionButtonClick(ev) {
  const btn = ev.target instanceof Element ? ev.target.closest('button.fn-btn') : null;
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  let imgid = getFunctionTypeFromLocList(idx);
  if (imgid == null) imgid = Number(btn.dataset.imgid) || (50 + idx);
  btn.dataset.imgid = String(imgid);
  const wasActive = btn.dataset.active === '1' || btn.getAttribute('aria-pressed') === 'true';
  const nowActive = !wasActive;
  btn.dataset.active = nowActive ? '1' : '0';
  btn.setAttribute('aria-pressed', nowActive ? 'true' : 'false');
  const iconPrefix = nowActive ? 'ge' : 'we';
  const img = btn.querySelector('img');
  if (img) setFunctionIcon(img, iconPrefix, imgid, idx);
  try {
  fetch('/api/control_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loco_id: currentLocoUid,
        function: idx,
        value: nowActive ? 1 : 0
      })
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 * Apply the visual state to a locomotive function button.
 *
 * Chooses the correct icon for the button based on whether it is
 * active or inactive, records the active state via data attributes
 * and aria flags, and updates the image.  This helper is used by
 * both the bulk updater and the SSE handler for individual changes.
 *
 * @param {HTMLButtonElement} btn – the button to update
 * @param {number} idx – the function index
 * @param {boolean|number} active – whether the function is active
 */
function applyLocoFunctionButtonState(btn, idx, active) {
  let imgid = getFunctionTypeFromLocList(idx);
  if (imgid == null) imgid = Number(btn.dataset.imgid) || (50 + idx);
  btn.dataset.imgid = String(imgid);
  btn.dataset.active = active ? '1' : '0';
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  const iconPrefix = active ? 'ge' : 'we';
  const img = btn.querySelector('img');
  if (img) setFunctionIcon(img, iconPrefix, imgid, idx);
}

/**
 * Update a single locomotive function button from server state.
 *
 * When the backend broadcasts a function state change (e.g. via SSE)
 * this helper locates the corresponding button in either column and
 * applies the active/inactive visual state.  See also
 * {@link updateAllLocoFunctionButtons} for bulk updates.
 *
 * @param {number} idx – the function index
 * @param {boolean|number} value – whether the function is active
 */
function updateLocoFunctionButton(idx, value) {
  const btn = document.querySelector(`#leftFunctions button.fn-btn[data-index="${idx}"]`) ||
              document.querySelector(`#rightFunctions button.fn-btn[data-index="${idx}"]`);
  if (!btn) return;
  applyLocoFunctionButtonState(btn, idx, value);
}

/**
 * Update all function buttons based on a functions dictionary.
 *
 * Takes an object keyed by function index (0–27) with truthy values
 * indicating active functions.  Iterates over all buttons in both
 * columns and applies each state accordingly.  This is invoked
 * whenever a new locomotive is selected or when a bulk state update
 * arrives from the server.
 *
 * @param {Object.<number,boolean>} functions – mapping of active functions
 */
function updateAllLocoFunctionButtons(functions) {
  const buttons = document.querySelectorAll('#leftFunctions button.fn-btn, #rightFunctions button.fn-btn');
  buttons.forEach((btn) => {
    const idx = Number(btn.dataset.index);
    const active = !!(functions && functions[idx]);
    applyLocoFunctionButtonState(btn, idx, active);
  });
}

//
// ==========================
//  SWITCH KEYBOARD SECTION
// ==========================
//
// Functions and handlers related to the keyboard view live here.
// The keyboard allows control of switches or accessories via groups
// of paired buttons.  State is mirrored from the backend and
// displayed visually.  Naming is normalised to start with
// "initializeKeyboard…", "updateKeyboard…" and so on.

/**
 * Update the group labels under each pair of keyboard buttons.
 *
 * Switch groups correspond to entries in the `switchList.artikel`
 * array returned from the backend.  For each group, this helper
 * retrieves the configured name and falls back to numbering when no
 * name is set.  It is called on page load and whenever the
 * keyboard page index changes.
 */
function updateKeyboardGroupLabels() {
  const labels = document.querySelectorAll('.keyboard-btn-group-label');
  labels.forEach((label, groupIdx) => {
  const eventIdx = (currentKeyboardId * keyboardGroupCnt) + groupIdx;
    let name = '';
    if (switchList && switchList.artikel && Array.isArray(switchList.artikel)) {
      const entry = switchList.artikel[eventIdx];
      if (entry && entry.name) {
        name = entry.name;
      }
    }
    label.textContent = name ? name : (eventIdx + 1);
  });
}

/**
 * Update the dynamic header text on the keyboard page.
 *
 * The header indicates which keyboard page is currently active.  This
 * function inspects the `.keyboard-page-btn.active` element and
 * sets the header text to "Keyboard Seite" followed by the label
 * of the active page.  When no button is active, it defaults to
 * "1a" to match the first page.
 */
function updateKeyboardHeaderText() {
  const header = document.getElementById('keyboardHeaderText');
  if (!header) return;
  const btn = document.querySelector('.keyboard-page-btn.active');
  header.textContent = 'Keyboard Seite ' + (btn ? btn.textContent : '1a');
}

/**
 * Activate a keyboard page button by index.
 *
 * This helper assigns the 'active' class to the selected page
 * button, removes it from others, updates the global
 * `currentKeyboardId` and refreshes the header to reflect the
 * selection.  It is called on page load to restore the persisted
 * state and when the user clicks a page selector.
 *
 * @param {number} id – zero‑based index of the keyboard page
 */
function activateKeyboardBtnById(id) {
  if (keyboardPageBtns.length > 0 && id >= 0 && id < keyboardPageBtns.length) {
    keyboardPageBtns.forEach(b => b.classList.remove('active'));
    keyboardPageBtns[id].classList.add('active');
    currentKeyboardId = id;
    updateKeyboardHeaderText();
  }
}

/**
 * Build the keyboard bottom bar buttons according to keyboardGroupCnt.
 *
 * Creates page selector buttons inside the '.keyboard-bottom-bar' container and
 * refreshes the global NodeList reference 'keyboardPageBtns'. When
 * keyboardGroupCnt is 8, it renders pages 1a..4b; when 16, it renders pages
 * 1..4. For other values, it derives a simple numeric pagination assuming 64
 * total groups.
 *
 * Side effects:
 * - Mutates the DOM under '.keyboard-bottom-bar'.
 * - Updates the 'keyboardPageBtns' NodeList used by other helpers.
 */
function buildKeyboardBottomBar() {
  const bar = document.querySelector('.keyboard-bottom-bar');
  if (!bar) return;
  bar.innerHTML = '';
  let labels = [];
  if (keyboardGroupCnt === 8) {
    labels = ['1a','1b','2a','2b','3a','3b','4a','4b'];
  } else if (keyboardGroupCnt === 16) {
    labels = ['1','2','3','4'];
  } else {
    // Fallback: derive a simple numeric page count (assume 64 total groups)
    const totalGroups = 64;
    const pages = Math.max(1, Math.floor(totalGroups / Math.max(1, keyboardGroupCnt)));
    labels = Array.from({ length: pages }, (_, i) => String(i + 1));
  }
  labels.forEach((label, idx) => {
    const b = document.createElement('button');
    b.className = 'keyboard-page-btn';
    b.textContent = label;
    bar.appendChild(b);
  });
  // Refresh NodeList reference after (re)building
  keyboardPageBtns = document.querySelectorAll('.keyboard-page-btn');
}

// Build pages immediately (HTML is already parsed since script is at end of body)
buildKeyboardBottomBar();

/**
 * Build the keyboard grid (groups with 2 buttons each) based on keyboardGroupCnt.
 *
 * Renders 'keyboardGroupCnt' switch groups for the current page arranged in a
 * 4-column layout. Each group consists of a text label and two adjacent
 * buttons with a 1-based 'data-key' per page. Existing grid content is cleared
 * before rebuilding.
 *
 * Side effects:
 * - Mutates the DOM under '.keyboard-grid-4x4'.
 */

function buildKeyboardGrid() {
  const grid = document.querySelector('.keyboard-grid-4x4');
  if (!grid) return;
  grid.innerHTML = '';
  const colsPerRow = 4;
  const rows = Math.ceil(keyboardGroupCnt / colsPerRow);
  let groupIndex = 0;
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    for (let c = 0; c < colsPerRow && groupIndex < keyboardGroupCnt; c++, groupIndex++) {
      const col = document.createElement('div');
      col.className = 'keyboard-btn-col';
      const label = document.createElement('span');
      label.className = 'keyboard-btn-group-label';
      col.appendChild(label);
      const group = document.createElement('div');
      group.className = 'keyboard-btn-group';
      const btn1 = document.createElement('button');
      btn1.className = 'keyboard-btn';
      btn1.setAttribute('data-key', String(groupIndex * 2 + 1));
      const btn2 = document.createElement('button');
      btn2.className = 'keyboard-btn';
      btn2.setAttribute('data-key', String(groupIndex * 2 + 2));
      group.appendChild(btn1);
      group.appendChild(btn2);
      col.appendChild(group);
      row.appendChild(col);
    }
    grid.appendChild(row);
  }
}
  // Build keyboard grid according to group count
  buildKeyboardGrid();

/**
 * Wire click handlers for keyboard page selector buttons.
 *
 * Attaches a click listener to each '.keyboard-page-btn'. On click it sets the
 * active state, updates 'currentKeyboardId', refreshes the page header and
 * group labels, and fetches '/api/switch_state' to hydrate the visible switch
 * pairs on the newly selected page.
 *
 * Assumptions:
 * - buildKeyboardBottomBar() has been called to (re)create page buttons.
 * - buildKeyboardGrid() has created the grid elements for the page.
 */
function wireKeyboardPageButtons() {
  if (!keyboardPageBtns) return;
  keyboardPageBtns.forEach((btn, idx) => {
    btn.addEventListener('click', function() {
      keyboardPageBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentKeyboardId = idx;
      updateKeyboardHeaderText();
      // Update group labels when switching keyboard page
      updateKeyboardGroupLabels();
      fetch('/api/switch_state')
        .then(response => response.json())
        .then(data => {
          if (data && data.switch_state) {
            const keyboardBtns = document.querySelectorAll('.keyboard-btn');
            for (let groupIdx = 0; groupIdx < keyboardGroupCnt; groupIdx++) {
              const eventIdx = (currentKeyboardId * keyboardGroupCnt) + groupIdx;
              const value = data.switch_state[eventIdx];
              const btn1 = keyboardBtns[groupIdx * 2];
              const btn2 = keyboardBtns[groupIdx * 2 + 1];
              if (btn1 && btn2) {
                updateSwitchUI(btn1, btn2, value);
              }
            }
          }
        });
    });
  });
}

// Wire handlers after build and activate first page
wireKeyboardPageButtons();
activateKeyboardBtnById(0);
updateKeyboardGroupLabels();

/**
 * Initialise keyboard buttons based on the current switch state.
 *
 * This helper prepares each keyboard button (16 per page) by
 * removing borders, setting sizes and injecting an <img> element if
 * necessary.  It also applies the current state (left/right
 * positions) by delegating to {@link updateSwitchUI}.
 *
 * @param {number[]} switchState – array of switch positions from the server
 */
function initializeKeyboardButtons(switchState) {
  const keyboardBtns = document.querySelectorAll('.keyboard-btn');
  keyboardBtns.forEach((btn, idx) => {
    // Style: No border, no filling
    btn.style.border = '2px solid #ccc';
    btn.style.background = '#fff';
    btn.style.boxShadow = 'none';
    btn.style.height = '150%';
    btn.style.maxHeight = 'none';
    let img = btn.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      btn.appendChild(img);
    }
    const groupIdx = Math.floor(idx / 2);
    const btn1 = keyboardBtns[groupIdx * 2];
    const btn2 = keyboardBtns[groupIdx * 2 + 1];
    const eventIdx = (currentKeyboardId * keyboardGroupCnt) + groupIdx;
    const valueNum = switchState && switchState.length > eventIdx ? switchState[eventIdx] : 0;
    if (btn1 && btn2) {
      updateSwitchUI(btn1, btn2, valueNum);
    }
    img.alt = 'SwitchBtn' + (idx + 1);
    img.style.display = 'block';
    img.style.margin = 'auto';
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.transform = 'none';
    img.style.width = '100%';
    img.style.height = '100%';
    btn.style.position = 'relative';
  });
}

/**
 * Apply the visual state to a pair of keyboard buttons.
 *
 * Switches are represented by two adjacent buttons: one for the
 * straight (red) position and one for the diverging (green)
 * position.  This helper marks the active button with the 'active'
 * class and sets appropriate images on both buttons.  It is used
 * both during initialisation and when switch events arrive from the
 * server.
 *
 * @param {HTMLElement} btn1 – the left/straight button
 * @param {HTMLElement} btn2 – the right/diverging button
 * @param {number} valueNum – 0 if btn1 is active, 1 if btn2 is active
 */
function updateSwitchUI(btn1, btn2, valueNum) {
  const img1 = btn1.querySelector('img');
  const img2 = btn2.querySelector('img');
  if (valueNum === 0) {
    // btn1 active, btn2 inactive
    btn1.classList.add('active');
    btn2.classList.remove('active');
    if (img1) img1.src = asset('magicons_/switch_re_active.png');
    if (img2) img2.src = asset('magicons_/switch_gr_inactive.png');
  } else {
    // btn1 inactive, btn2 active
    btn1.classList.remove('active');
    btn2.classList.add('active');
    if (img1) img1.src = asset('magicons_/switch_re_inactive.png');
    if (img2) img2.src = asset('magicons_/switch_gr_active.png');
  }
}

// Attach direction change handlers: clicking the reverse/forward arrows
// sends the appropriate command to the backend via setLocoDirection().
reverseBtn.addEventListener('click', () => setLocoDirection(Direction.REVERSE));
forwardBtn.addEventListener('click', () => setLocoDirection(Direction.FORWARD));

// UI logic for switch button pairs (delegated for dynamic content).
// Each keyboard "switch" is represented by a pair of adjacent buttons. Clicking either
// button sends a keyboard_event to the backend with the appropriate index and value (0 for
// the left/straight button, 1 for the right/diverging button). We attach a single delegated
// listener to the grid container so it works even after rebuilding the grid.
const keyboardGrid = document.querySelector('.keyboard-grid-4x4');
if (keyboardGrid) {
  keyboardGrid.addEventListener('click', function(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('.keyboard-btn') : null;
    if (!btn || !keyboardGrid.contains(btn)) return;
    const keyNum = Number(btn.getAttribute('data-key'));
    if (!Number.isFinite(keyNum)) return;
    // keyNum: 1-based within page; buttons are paired (1,2), (3,4), ...
    const groupIdx = Math.floor((keyNum - 1) / 2);
    const eventIdx = (currentKeyboardId * keyboardGroupCnt) + groupIdx;
    const value = (keyNum % 2 === 0) ? 1 : 0; // even -> right/diverging, odd -> left/straight
    fetch('/api/keyboard_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idx: eventIdx, value })
    });
  });
}

