let locList = {};
let isRunning = false;
let currentLocoUid = 1; // Default loco ID

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

/** Read function 'typ' from current loco's locList entry */


/** Format an icon id as two digits (e.g., 1 -> "01") */
function pad2(v) {
  const s = String(v ?? '');
  return s.length >= 2 ? s : s.padStart(2, '0');
}

/** Set function icon with fallbacks (browser-safe, no fs).
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
  // isRunning und updateStopBtn() werden erst durch SSE gesetzt!
});

const evtSource = new EventSource('/api/events');
evtSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'system') {
      isRunning = data.status;
      updateStopBtn();
  }
  if (currentLocoUid == data.loc_id) {
    if (data.type === 'direction') {
      applyDirectionUI(data.value === 1 ? 'forward' : data.value === 2 ? 'reverse' : undefined);
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
    Object.keys(locList).forEach(uid => {
      // 2. Lok-Icon erzeugen
      console.log("Initialisiere Lok:", uid, locList[uid]);
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
      // 3. Lok-Icon Eventhandler setzen
      img.onclick = () => {
        currentLocoUid = locList[uid].uid;
        locoDesc.textContent = locList[uid].name;
        locoImg.src = img.src;
        fetchAndApplyState(currentLocoUid);
      };
    });
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

// --- Client-side helpers to apply server-side state without sending commands ---
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
  const tachomax = locList[currentLocoUid].tachomax || 200;
  const kmh = Math.round(val * tachomax / 1000);
  speedValue.textContent = `${kmh} km/h`;
  speedFill.style.height = `${(val / 1000) * 100}%`;
}

// Fetch state for a given loco from the server and update the UI (no commands sent)
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
  const tachomax = locList[currentLocoUid].tachomax || 200;
  // Umrechnung: 0–1000 (Protokoll) auf 0–tachomax (Anzeige)
  //const kmh = Math.round((val / 1000) * tachomax);
  const kmh = Math.round(val * tachomax / 1000);
  speedValue.textContent = `${kmh} km/h`;
  speedFill.style.height = `${(val / 1000) * 100}%`;
  fetch('/api/speed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loco_id: currentLocoUid,
      speed: val
    })
  });
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

