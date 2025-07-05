const lightBtn = document.getElementById('lightBtn');
const hornBtn = document.getElementById('hornBtn');
const directionBtn = document.getElementById('directionBtn');
const speedSlider = document.getElementById('speed');
const speedValue = document.getElementById('speedValue');
const stopBtn = document.getElementById('stopBtn');

let lightOn = false;
let directionForward = true;
let isRunning = false;

function updateStopButton() {
  if (isRunning) {
    stopBtn.classList.remove('go');
    stopBtn.classList.add('stop');
    stopBtn.textContent = "STOP";
  } else {
    stopBtn.classList.remove('stop');
    stopBtn.classList.add('go');
    stopBtn.textContent = "GO";
  }
}

lightBtn.addEventListener('click', () => {
  lightOn = !lightOn;
  fetch('/api/light', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({state: lightOn})
  });
  lightBtn.style.backgroundColor = lightOn ? '#0f0' : '#333';
});

hornBtn.addEventListener('click', () => {
  fetch('/api/horn', {
    method: 'POST'
  });
});

directionBtn.addEventListener('click', () => {
  directionForward = !directionForward;
  fetch('/api/direction', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({dir: directionForward ? "forward" : "reverse"})
  });
  directionBtn.textContent = directionForward ? '⬅️' : '➡️';
});

speedSlider.addEventListener('input', () => {
  speedValue.textContent = speedSlider.value;
  fetch('/api/speed', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({speed: parseInt(speedSlider.value)})
  });
});

stopBtn.addEventListener('click', () => {
  isRunning = !isRunning;

  fetch('/api/toggle', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({state: isRunning})
  });

  updateStopButton();
});

updateStopButton();