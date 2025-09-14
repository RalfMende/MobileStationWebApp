/*
 THE BEER-WARE LICENSE (Revision 42)

<mende.r@hotmail.de> wrote this file. As long as you retain this notice you can do whatever you want with this
 stuff. If we meet someday, and you think this stuff is worth it, you can
 buy me a beer in return.
 Ralf Mende
*/

// Info Site Button-Handler
// The 4 buttons are used to control the list of locomotives (Lokliste) handling of the SRSEII

// According to documentation locoId must be set 1.
const locoId = 1;

// Function 0: Import / update new locos from Lokliste
document.getElementById('eventBtn1').onclick = function() {
  fetch('/api/info_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 0, value: 1 })
  });
};

// Function 1: Activate Lokliste-import in Railcontrol
document.getElementById('eventBtn2').onclick = function() {
  fetch('/api/info_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 1, value: 1 })
  });
};

// Function 2: Restart Railcontrol
document.getElementById('eventBtn3').onclick = function() {
  fetch('/api/info_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 2, value: 1 })
  });
};

// Function 4: Delete Lokliste and re-import Lokliste from MS2
document.getElementById('eventBtn4').onclick = function() {
  fetch('/api/info_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: locoId, function: 4, value: 1 })
  });
};

document.getElementById('backBtn').onclick = function() {
  window.location.href = '/';
};

