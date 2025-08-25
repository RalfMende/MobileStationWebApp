// Info-Seite Button-Handler
// The 4 buttons are used to control the list of locomotives (Lokliste) handling of the SRSEII

// According to documentation locoId must be set 1.
const locoId = 1;

// Function 0: Import / update new locos from Lokliste
document.getElementById('eventBtn1').onclick = function() {
  fetch('/api/custom_function', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 0, value: 1 })
  });
};

// Function 1: Activate Lokliste-import in Railcontrol
document.getElementById('eventBtn2').onclick = function() {
  fetch('/api/custom_function', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 1, value: 1 })
  });
};

// Function 2: Restart Railcontrol
document.getElementById('eventBtn3').onclick = function() {
  fetch('/api/custom_function', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 2, value: 1 })
  });
};

// Function 4: Delete Lokliste and re-import Lokliste from MS2
document.getElementById('eventBtn4').onclick = function() {
  fetch('/api/custom_function', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 4, value: 1 })
  });
};

document.getElementById('backBtn').onclick = function() {
  window.location.href = '/';
};
