
let isRunning = false;
let currentLoco = 'loc_1';
let locoState = {
  'loc_1': { speed: 0, direction: 'forward', functions: {} },
  'loc_2': { speed: 0, direction: 'forward', functions: {} },
  'loc_3': { speed: 0, direction: 'forward', functions: {} },
  'loc_4': { speed: 0, direction: 'forward', functions: {} },
  'loc_5': { speed: 0, direction: 'forward', functions: {} },
  'loc_6': { speed: 0, direction: 'forward', functions: {} },
  'loc_7': { speed: 0, direction: 'forward', functions: {} },
  'loc_8': { speed: 0, direction: 'forward', functions: {} },
  'loc_9': { speed: 0, direction: 'forward', functions: {} },
  'loc_10': { speed: 0, direction: 'forward', functions: {} }
};

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
    body: JSON.stringify({ state: isRunning })
  });
});

function updateSlider(val) {
  speedValue.textContent = `${val} km/h`;
  speedFill.style.height = `${val / 2}%`;
  locoState[currentLoco].speed = val;
  fetch('/api/speed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco: currentLoco, speed: val })
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

function setDirection(dir) {
  /*reverseBtn.classList.remove('active');
  forwardBtn.classList.remove('active');
  if (dir === 'forward') forwardBtn.classList.add('active');
  else reverseBtn.classList.add('active');*/
  if (dir === 'forward') {
    forwardBtn.src = '/static/grafics/dir_right_active.png';
    reverseBtn.src = '/static/grafics/dir_left_inactive.png';
  } else {
    forwardBtn.src = '/static/grafics/dir_right_inactive.png';
    reverseBtn.src = '/static/grafics/dir_left_active.png';
  }
  locoState[currentLoco].direction = dir;
  fetch('/api/direction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco: currentLoco, direction: dir })
  });
}

reverseBtn.addEventListener('click', () => setDirection('reverse'));
forwardBtn.addEventListener('click', () => setDirection('forward'));

function createFunctionButtons(col, offset) {
  for (let i = 0; i < 8; i++) {
    const idx = offset + i;
    const name = `F${idx}`;
    const btn = document.createElement('button');
    const img = document.createElement('img');
    const imgid = 50 + offset + i;
    img.src = `/static/fcticons/FktIcon_i_we_${imgid}.png`;
    btn.appendChild(img);
    btn.onclick = () => {
      const newState = !(locoState[currentLoco].functions[name] || false);
      locoState[currentLoco].functions[name] = newState;
      btn.style.background = newState ? 'lime' : 'transparent';
      fetch('/api/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loco: currentLoco, function: name, state: newState })
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
    const container = document.getElementById('locoList');
    Object.keys(locList).forEach(name => {
      console.log("Initialisiere Lok:", name, locList[name]);
      const img = new Image();
      img.alt = locList[name].name;
      img.title = locList[name].name;
/*      img.src = "/static/icons/" + (locList[name].icon + ".png" || "leeres Gleis.png");*/
      img.onerror = function() {
        img.onerror = null;
        img.src = '/static/icons/leeres Gleis.png';
      };
      const iconName = locList[name].icon || locList[name].bild || 'leeres Gleis';
      img.src = `/static/icons/${iconName}.png`;
      container.appendChild(img);
      img.onclick = () => {
        currentLoco = locList[name].id;
        locoDesc.textContent = locList[name].name;
        locoImg.src = img.src;
        const state = locoState[locList[name].name];
        speedSlider.value = state.speed;
        updateSlider(state.speed);
        setDirection(state.direction);
        updateFunctionButtons(state.functions);
      };
      document.getElementById("locoList").appendChild(img);
    });
  });
  
function updateFunctionButtons(functions) {
  document.querySelectorAll('#leftFunctions button, #rightFunctions button').forEach((btn, index) => {
    const name = `F${index}`;
    const active = functions[name];
    btn.style.background = active ? 'lime' : 'transparent';
  });
}