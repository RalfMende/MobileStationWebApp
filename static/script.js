
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

function updateStopBtn() {
  stopBtn.className = isRunning ? 'stop tab' : 'go tab';
  stopBtn.textContent = isRunning ? 'STOP' : 'GO';
}
updateStopBtn();

stopBtn.addEventListener('click', () => {
  isRunning = !isRunning;
  updateStopBtn();
  fetch('/api/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: isRunning
    })
  });
});

function setDirection(dir) {
  console.log("Sending direction for loco_id:", currentLocoUid, "direction:", dir);
  if (dir === 'forward') {
    forwardBtn.src = '/static/grafics/dir_right_active.png';
    reverseBtn.src = '/static/grafics/dir_left_inactive.png';
  } else {
    forwardBtn.src = '/static/grafics/dir_right_inactive.png';
    reverseBtn.src = '/static/grafics/dir_left_active.png';
  }
  locoState[currentLocoUid].direction = dir;
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

function updateSlider(val) {
  speedValue.textContent = `${val} km/h`;
  speedFill.style.height = `${val / 2}%`;
  locoState[currentLocoUid].speed = val;
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
    const value = Math.min(200, Math.max(0, Math.round(percent * 200)));
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
      const value = Math.min(200, Math.max(0, Math.round(percent * 200)));
      speedSlider.value = value;
      updateSlider(value);
    }
  };

  speedBar.addEventListener('pointermove', onMove);
  speedBar.addEventListener('pointerup', onUp);
  speedBar.addEventListener('pointercancel', onUp);
});

function createFunctionButtons(col, offset) {
  for (let i = 0; i < 8; i++) {
    const idx = offset + i;
    /*const name = `F${idx}`;*/
    const btn = document.createElement('button');
    const img = document.createElement('img');
    const imgid = 50 + offset + i;
    img.src = `/static/fcticons/FktIcon_i_we_${imgid}.png`;
    btn.appendChild(img);
    btn.onclick = () => {
      const newState = !(locoState[currentLocoUid].functions[idx] || false);
      locoState[currentLocoUid].functions[idx] = newState;
      btn.style.background = newState ? 'lime' : 'transparent';
      fetch('/api/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loco_id: currentLocoUid, 
          function: idx, 
          value: newState ? 1 : 0 })
      });
    };
    col.appendChild(btn);
  }
}
createFunctionButtons(leftCol, 0);
createFunctionButtons(rightCol, 7);

fetch('/api/locs')
  .then(response => response.json())
  .then(locList => {
    locoState = {};
    Object.keys(locList).forEach(uid => {
      // 1. locoState initialisieren
      locoState[locList[uid].uid] = {
        speed: 0,
        direction: 'forward',
        functions: {}
      };
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
        const state = locoState[currentLocoUid];
        speedSlider.value = state.speed;
        updateSlider(state.speed);
        setDirection(state.direction);
        updateFunctionButtons(state.functions);
      };
    });
  });
  
function updateFunctionButtons(functions) {
  document.querySelectorAll('#leftFunctions button, #rightFunctions button').forEach((btn, index) => {
    const active = functions[index];
    btn.style.background = active ? 'lime' : 'transparent';
  });
}