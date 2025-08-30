let locList = {};
let isRunning = false;
let currentActiveContainer = 'control'; // Keeps selcted page, in case of returning to website
let currentLocoUid = null; // Keeps selected locomotive from control page (via UID)
let currentKeyboardId = 0; // Keeps selected keyboard ID from keyboard page
const debounce_udp_message = 10; // Timer in ms

const stopBtn = document.getElementById('stopBtn');
const speedSlider = document.getElementById('speedSlider');
const speedFill = document.getElementById('speedFill');
const speedValue = document.getElementById('speedValue');
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
const keyboardPageBtns = document.querySelectorAll('.keyboard-page-btn');
const infoBtn = document.getElementById('infoBtn');

// Keyboard bottom bar button logic
keyboardPageBtns.forEach((btn, idx) => {
  btn.addEventListener('click', function() {
    keyboardPageBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentKeyboardId = idx;
    updateKeyboardHeaderText();
    fetch('/api/switch_state')
      .then(response => response.json())
      .then(data => {
        if (data && data.switch_state) {
          const keyboardBtns = document.querySelectorAll('.keyboard-btn');
          for (let groupIdx = 0; groupIdx < 8; groupIdx++) {
            const eventIdx = (currentKeyboardId * 8) + groupIdx;
            const value = data.switch_state[eventIdx];
            const btn1 = keyboardBtns[groupIdx * 2];
            const btn2 = keyboardBtns[groupIdx * 2 + 1];
            if (btn1 && btn2) {
              applySwitchUI(btn1, btn2, value);
            }
          }
        }
      });
  });
});

// Tab navigation between control and keyboard panels
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

// On page load, restore currentKeyboardId and active container from localStorage if available
function activateKeyboardBtnById(id) {
  if (keyboardPageBtns.length > 0 && id >= 0 && id < keyboardPageBtns.length) {
    keyboardPageBtns.forEach(b => b.classList.remove('active'));
    keyboardPageBtns[id].classList.add('active');
    currentKeyboardId = id;
    updateKeyboardHeaderText();
  }
}

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
});

if (infoBtn) {
  infoBtn.onclick = function() {
    // Save current active container (control/keyboard)
    localStorage.setItem('currentActiveContainer', currentActiveContainer);
    // Save locomotive ID
    if (currentLocoUid != null) {
      localStorage.setItem('currentLocoUid', currentLocoUid);
    }
    // Save current keyboard button
    localStorage.setItem('currentKeyboardId', currentKeyboardId);
    window.location.href = '/info';
  };
}

/** Format an icon id as two digits (e.g., 1 -> "01") */
function pad2(v) {
  const s = String(v ?? '');
  return s.length >= 2 ? s : s.padStart(2, '0');
}

/** Set function icon with fallbacks (browser-safe, no filesystem).
 *  Tries the specific icon first; on 404 loads the fallback.
 *  @param {HTMLImageElement} img
 *  @param {string} iconPrefix
 *  @param {number} id
 *  @param {number} index
 */
function setFunctionIcon(img, iconPrefix, id, index) {
  const primary  = `/static/fcticons/FktIcon_a_${iconPrefix}_${pad2(id)}.png`;
  const fallback = `/static/fcticons/FktIcon_a_${iconPrefix}_${pad2(50 + index)}.png`;

  const probe = new Image();
  probe.onload  = () => { img.src = primary; };
  probe.onerror = () => { img.src = fallback; };
  probe.src = primary;
  return primary;
}

function getTypFromLocList(idx) {
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

function updateStopBtn() {
  stopBtn.className = isRunning ? 'stop tab' : 'go tab';
  stopBtn.textContent = isRunning ? 'STOP' : 'GO';
}

fetch('/api/system_state')
  .then(response => response.json())
  .then(data => {
    isRunning = data.status;
    updateStopBtn();
  });

stopBtn.addEventListener('click', () => {
  fetch('/api/stop_button', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: !isRunning })
  });
  // isRunning and updateStopBtn() are only set via SSE!
});

const evtSource = new EventSource('/api/events');
evtSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'system') {
      isRunning = data.status;
      updateStopBtn();
  }
  if (data.type === 'switch' && typeof data.idx === 'number' && typeof data.value !== 'undefined') {
  // idx: 0-63
  // Rückwärts rechnen: keyboardId = Math.floor(idxNum/8), groupIdx = (idxNum%8)
  const idxNum = Number(data.idx);
  const valueNum = Number(data.value);
  const keyboardId = Math.floor(idxNum / 8);
  const groupIdx = idxNum % 8;
    // Nur wenn die aktuelle Seite betroffen ist:
    if (keyboardId === currentKeyboardId) {
      // Finde die beiden Buttons der Gruppe
      const btn1 = document.querySelectorAll('.keyboard-btn')[groupIdx * 2];
      const btn2 = document.querySelectorAll('.keyboard-btn')[groupIdx * 2 + 1];
      if (btn1 && btn2) {
        applySwitchUI(btn1, btn2, valueNum);
      }
    }
  }
  if (currentLocoUid == data.loc_id) {
    if (data.type === 'direction') {
      applyDirectionUI(data.value === 1 ? 'forward' : data.value === 2 ? 'reverse' : undefined);
    }
        if (data.type === 'speed') {
      speedSlider.value = data.value;
      applySpeedUI(data.value);
    }
    if (data.type === 'function') {
      updateFunctionButton(data.fn, data.value);
    }
  }
};

fetch('/api/locs')
  .then(response => response.json())
  .then(data => {
    locList = data;
    // Mirror state from server (authoritative)
    fetch('/api/state').then(r=>r.json()).then(s => { locoState = s; }).catch(()=>{ locoState = {}; });

    // Initialize currentLocoUid
    let savedLocoUid = localStorage.getItem('currentLocoUid');
    if (savedLocoUid && locList[savedLocoUid]) {
      currentLocoUid = Number(savedLocoUid);
    } else {
      // Initialize with the first locomotive from locList
      const firstUid = Object.keys(locList)[0];
      currentLocoUid = locList[firstUid]?.uid || Number(firstUid);
    }

    Object.keys(locList).forEach(uid => {
      // 2. Create locomotive icon
      console.log("Initializing locomotive:", uid, locList[uid]);
      const img = new Image();
      img.alt = locList[uid].name;
      img.title = locList[uid].name;
      img.onerror = function() {
        img.onerror = null;
        img.src = '/static/icons/leeres Gleis.png';
      };
      const iconName = locList[uid].icon || locList[uid].bild || 'leeres Gleis';
      img.src = `/static/icons/${iconName}.png`;
      document.getElementById("locoList").appendChild(img);
      // 3. Set locomotive icon event handler
      img.onclick = () => {
        currentLocoUid = locList[uid].uid;
        locoDesc.textContent = locList[uid].name;
        locoImg.src = img.src;
        fetchAndApplyState(currentLocoUid);
        localStorage.setItem('currentLocoUid', currentLocoUid);
      };
    });

    // After initialization: Apply state of the current locomotive and update function buttons
    if (currentLocoUid) {
      locoDesc.textContent = locList[currentLocoUid]?.name || '';
      locoImg.src = `/static/icons/${locList[currentLocoUid]?.icon || locList[currentLocoUid]?.bild || 'leeres Gleis'}.png`;
      fetch(`/api/state?loco_id=${currentLocoUid}`)
        .then(r => r.json())
        .then(state => {
          updateAllFunctionButtons(state.functions || {});
          applySpeedUI(state.speed || 0);
          applyDirectionUI(state.direction === 'reverse' ? 'reverse' : 'forward');
        });
    }
  });

function setDirection(dir) {
  console.log("Sending direction for loco_id:", currentLocoUid, "direction:", dir);
  fetch('/api/direction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loco_id: currentLocoUid,
      direction: dir === 'forward' ? 1 : 2
    })
  });
}

reverseBtn.addEventListener('click', () => setDirection('reverse'));
forwardBtn.addEventListener('click', () => setDirection('forward'));

function applyDirectionUI(dir) {
  if (dir === 'forward') {
    forwardBtn.src = '/static/grafics/dir_right_active.png';
    reverseBtn.src = '/static/grafics/dir_left_inactive.png';
  } else {
    forwardBtn.src = '/static/grafics/dir_right_inactive.png';
    reverseBtn.src = '/static/grafics/dir_left_active.png';
  }
}

function applySpeedUI(val) {
  speedFill.style.height = `${(val / 1000) * 100}%`;
  // Calculation: 0–1000 (Protocol) to 0–tachomax (Display)
  // const kmh = Math.round((val / 1000) * tachomax);
  const tachomax = locList[currentLocoUid].tachomax || 200;
  const kmh = Math.round(val * tachomax / 1000);
  speedValue.textContent = `${kmh} km/h`;
}

// Fetch state for a given locomotive from the server and update the UI (no commands sent)
function fetchAndApplyState(locoUid) {
  fetch(`/api/state?loco_id=${locoUid}`)
    .then(r => r.json())
    .then(state => {
      const s = state || {};
      const spd = Number(s.speed || 0);
      speedSlider.value = spd;
      applySpeedUI(spd);
      const dir = (s.direction === 'reverse') ? 'reverse' : 'forward';
      applyDirectionUI(dir);
      updateAllFunctionButtons(s.functions || {});
    })
    .catch(err => console.warn('Failed to fetch state:', err));
}

function updateSlider(val) {
  applySpeedUI(val);
  // Debounce UDP message
  //if (window._sliderDebounce) clearTimeout(window._sliderDebounce);
  //window._sliderDebounce = setTimeout(() => {
    fetch('/api/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loco_id: currentLocoUid,
        speed: val
      })
    });
  //}, debounce_udp_message);
}

let isDragging = false;
let dragTimeout = null;
const speedBar = document.getElementById('speedBar');

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
    updateSlider(value);
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
      updateSlider(value);
    }
  };

  speedBar.addEventListener('pointermove', onMove);
  speedBar.addEventListener('pointerup', onUp);
  speedBar.addEventListener('pointercancel', onUp);
});

function createFunctionButton(idx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fn-btn';
  btn.style.border = 'none';
  btn.style.outline = 'none';
  btn.style.boxShadow = 'none';
  btn.style.background = 'transparent';
  btn.style.padding = '0';
  btn.dataset.index = String(idx);
  let imgid = getTypFromLocList(idx);
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

function setupFunctionButtons(col, offset) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 8; i++) {
    const idx = offset + i;
    frag.appendChild(createFunctionButton(idx));
  }
  col.appendChild(frag);
  if (!col.dataset.fnDelegated) {
    col.addEventListener('click', onFunctionButtonClick);
    col.dataset.fnDelegated = '1';
  }
}

function onFunctionButtonClick(ev) {
  const btn = ev.target instanceof Element ? ev.target.closest('button.fn-btn') : null;
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  let imgid = getTypFromLocList(idx);
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
    fetch('/api/function', {
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

setupFunctionButtons(leftCol, 0);
setupFunctionButtons(rightCol, 7);
  
function updateFunctionButton(idx, value) {
  const btn = document.querySelector(`#leftFunctions button.fn-btn[data-index="${idx}"]`) ||
              document.querySelector(`#rightFunctions button.fn-btn[data-index="${idx}"]`);
  if (!btn) return;
  applyFunctionButtonState(btn, idx, value);
}

function updateAllFunctionButtons(functions) {
  const buttons = document.querySelectorAll('#leftFunctions button.fn-btn, #rightFunctions button.fn-btn');
  buttons.forEach((btn) => {
    const idx = Number(btn.dataset.index);
    const active = !!(functions && functions[idx]);
    applyFunctionButtonState(btn, idx, active);
  });
}

function applyFunctionButtonState(btn, idx, active) {
  let imgid = getTypFromLocList(idx);
  if (imgid == null) imgid = Number(btn.dataset.imgid) || (50 + idx);
  btn.dataset.imgid = String(imgid);
  btn.dataset.active = active ? '1' : '0';
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  const iconPrefix = active ? 'ge' : 'we';
  const img = btn.querySelector('img');
  if (img) setFunctionIcon(img, iconPrefix, imgid, idx);
}

// Keyboard button event handler (SwitchBtn1..16): no dependent activation
const keyboardBtns = document.querySelectorAll('.keyboard-btn');

// Initialisiere jeweils den ersten Button jeder Gruppe als aktiv (0,2,4,6,8,10,12,14)
const initialActiveIdx = [0,2,4,6,8,10,12,14];
keyboardBtns.forEach((btn, idx) => {
  // Style: Kein Rahmen, keine Füllung
  btn.style.border = '2px solid #ccc';
  btn.style.background = '#fff';
  btn.style.boxShadow = 'none';
  btn.style.height = '150%';
  btn.style.maxHeight = 'none';
  // Bild-Initialisierung
  let img = btn.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    btn.appendChild(img);
  }
  // Initialisiere Button-Paare wie beim Backend-Update
  const groupIdx = Math.floor(idx / 2);
  const btn1 = keyboardBtns[groupIdx * 2];
  const btn2 = keyboardBtns[groupIdx * 2 + 1];
  if (btn1 && btn2) {
    // Standard: btn1 aktiv, btn2 inaktiv (valueNum = 0)
    applySwitchUI(btn1, btn2, 0);
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
// UI-Logik für Switch-Button-Paare
function applySwitchUI(btn1, btn2, valueNum) {
  const img1 = btn1.querySelector('img');
  const img2 = btn2.querySelector('img');
  if (valueNum === 0) {
    // btn1 aktiv, btn2 inaktiv
    btn1.classList.add('active');
    btn2.classList.remove('active');
    if (img1) img1.src = '/static/grafics/switch_re_active.png';
    if (img2) img2.src = '/static/grafics/switch_gr_inactive.png';
  } else {
    // btn1 inaktiv, btn2 aktiv
    btn1.classList.remove('active');
    btn2.classList.add('active');
    if (img1) img1.src = '/static/grafics/switch_re_inactive.png';
    if (img2) img2.src = '/static/grafics/switch_gr_active.png';
  }
}

keyboardBtns.forEach((btn, idx) => {
  btn.addEventListener('click', function() {
    // Pairs: 0+1, 2+3, 4+5, ...
    const isOdd = idx % 2 === 1;
  const groupIdx = Math.floor(idx / 2);
  const eventIdx = (currentKeyboardId * 8) + groupIdx;
    const value = isOdd ? 1 : 0;
    fetch('/api/keyboard_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idx: eventIdx, value: value })
    });
  });
});

// Remove text from SwitchBtn1..16 (keyboard-btn)
/*document.querySelectorAll('.keyboard-btn').forEach((btn, idx) => {
  btn.textContent = idx.toString();
  btn.classList.add('keyboard-btn-debug');
});*/

function updateKeyboardGroupLabels() {
  const labels = document.querySelectorAll('.keyboard-btn-group-label');
  labels.forEach((label, groupIdx) => {
  const eventIdx = (currentKeyboardId * 8) + groupIdx;
    label.textContent = eventIdx + 1;
  });
}

// Call on page load and when keyboard ID changes
document.addEventListener('DOMContentLoaded', updateKeyboardGroupLabels);
keyboardPageBtns.forEach(btn => {
  btn.addEventListener('click', updateKeyboardGroupLabels);
});

// Update keyboard header text dynamically based on selected KeyboardBtn
function updateKeyboardHeaderText() {
  const header = document.getElementById('keyboardHeaderText');
  if (!header) return;
  const btn = document.querySelector('.keyboard-page-btn.active');
  header.textContent = 'Keyboard Seite ' + (btn ? btn.textContent : '1a');
}

// Update header on page load and when KeyboardBtn changes
function activateKeyboardBtnById(id) {
  if (keyboardPageBtns.length > 0 && id >= 0 && id < keyboardPageBtns.length) {
    keyboardPageBtns.forEach(b => b.classList.remove('active'));
    keyboardPageBtns[id].classList.add('active');
    currentKeyboardId = id;
    updateKeyboardHeaderText();
  }
}
keyboardPageBtns.forEach((btn, idx) => {
  btn.addEventListener('click', function() {
    keyboardPageBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentKeyboardId = idx;
    updateKeyboardHeaderText();
  });
});

document.addEventListener('DOMContentLoaded', function() {
  let savedKeyboardId = localStorage.getItem('currentKeyboardId');
  let savedContainer = localStorage.getItem('currentActiveContainer');
  if (savedKeyboardId) {
    activateKeyboardBtnById(Number(savedKeyboardId));
  } else {
    activateKeyboardBtnById(1);
  }
  if (savedContainer === 'keyboard') {
    activateContainer('keyboard');
  } else {
    activateContainer('control');
  }
  updateKeyboardHeaderText();
});

