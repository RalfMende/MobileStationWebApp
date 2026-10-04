/*
 THE BEER-WARE LICENSE (Revision 42)

<mende.r@hotmail.de> wrote this file. As long as you retain this notice you can do whatever you want with this
 stuff. If we meet someday, and you think this stuff is worth it, you can
 buy me a beer in return.
 Ralf Mende
*/

// CV-Index map per decoder protocol.
const CV_MAP = {
  mfx: {
    vmax: { cv: 2227, length: 1 },
    vmin: { cv: 1203, length: 1 },
    acc: { cv: 1202, length: 1 },
    dcc: { cv: 2226, length: 1 },
    vol: { cv: 1325, length: 1 },
    name: { cv: 1027, length: 16, field: 'name' }
  },
  dcc: {
    address: { cv: 1, length: 1, field: 'dccAddress' },
    vmin: { cv: 2, length: 1 },
    acc: { cv: 3, length: 1 },
    dcc: { cv: 4, length: 1 },
    vmax: { cv: 5, length: 1 }
  }
};

let currentUid = null;
let currentProtocol = null;
let nameChars = [];
let evtSource = null;
let expectedCvs = new Set();
let receivedCvs = new Set();
let configWaiters = new Set();
const CONFIG_READ_INTERVAL_MS = 1000;

function normalizeProtocol(raw) {
  const p = String(raw || '').toLowerCase();
  if (p.indexOf('mfx') !== -1) return 'mfx';
  if (p.indexOf('dcc') !== -1) return 'dcc';
  if (p.indexOf('mm') !== -1) return 'mm';
  return '';
}

function setFieldValue(key, value) {
  const el = document.querySelector('[data-protocol="' + currentProtocol + '"] [data-cv-field="' + key + '"]')
    || document.querySelector('[data-cv-field="' + key + '"]');
  if (el) el.textContent = String(value);
}

function setCvIndexValue(key, value) {
  const el = document.querySelector('[data-cv-index="' + key + '"]');
  if (el) el.textContent = value;
}

function updateNameField() {
  let out = '';
  for (let i = 0; i < nameChars.length; i++) {
    const c = nameChars[i];
    if (c === null) {
      out += '…';
      continue;
    }
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  setFieldValue('name', out || '—');
}

function waitForConfigValues(cvs, timeoutMs) {
  function missingCvs() {
    return cvs.filter(function (cv) { return !receivedCvs.has(cv); });
  }
  if (missingCvs().length === 0) return Promise.resolve([]);

  return new Promise(function (resolve) {
    let timer;
    function finish(missing) {
      window.clearTimeout(timer);
      configWaiters.delete(check);
      resolve(missing);
    }
    function check() {
      const missing = missingCvs();
      if (missing.length === 0) finish(missing);
    }
    timer = window.setTimeout(function () {
      finish(missingCvs());
    }, timeoutMs);
    configWaiters.add(check);
    check();
  });
}

function handleConfigValue(uid, cv, value) {
  if (uid !== currentUid) return;
  const map = CV_MAP[currentProtocol];
  if (!map) return;
  if (!expectedCvs.has(cv)) return;
  receivedCvs.add(cv);
  updateEditorStatus('Responses: ' + receivedCvs.size + '/' + expectedCvs.size);
  configWaiters.forEach(function (check) { check(); });
  const name = map.name;
  if (name && cv >= name.cv && (cv - name.cv) % 1024 === 0) {
    const idx = (cv - name.cv) / 1024;
    if (idx < name.length) {
      nameChars[idx] = value;
      updateNameField();
      return;
    }
  }
  Object.keys(map).forEach(function (key) {
    const definition = map[key];
    if (key !== 'name' && cv === definition.cv) {
      setFieldValue(definition.field || key, value);
    }
  });
}

function updateEditorStatus(message) {
  const status = document.getElementById('editorStatus');
  if (status) status.textContent = message;
}

function connectEditorSSE() {
  return new Promise(function (resolve, reject) {
    evtSource = new EventSource('/api/events');
    const timeout = window.setTimeout(function () {
      evtSource.close();
      reject(new Error('SSE connection timed out'));
    }, 10000);
    evtSource.onopen = function () {
      window.clearTimeout(timeout);
      resolve();
    };
    evtSource.onmessage = function (ev) {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'config_value') handleConfigValue(data.loc_id, data.cv, data.value);
      } catch (e) { /* ignore malformed event */ }
    };
    evtSource.onerror = function () {
      if (evtSource.readyState === EventSource.CLOSED) {
        window.clearTimeout(timeout);
        reject(new Error('SSE connection closed'));
      }
    };
  });
}

async function requestConfigRead(uid, cv, length) {
  const response = await fetch('/api/loco_config_read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: uid, cvs: [cv], count: length })
  });
  if (!response.ok) throw new Error('Read request failed: HTTP ' + response.status);
}

function getUidFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const uid = parseInt(params.get('uid'), 10);
  return Number.isFinite(uid) && uid > 0 ? uid : null;
}

async function init() {
  const titleEl = document.getElementById('editorLocoName');
  const protocolEl = document.getElementById('editorProtocol');
  currentUid = getUidFromUrl();
  if (!currentUid) {
    if (titleEl) titleEl.textContent = 'No locomotive selected';
    return;
  }

  try {
    const res = await fetch('/api/loco_list');
    const list = await res.json();
    const loco = list[String(currentUid)];
    if (loco) {
      if (titleEl) titleEl.textContent = loco.name || ('UID ' + currentUid);
      currentProtocol = normalizeProtocol(loco.protocol);
      if (protocolEl) protocolEl.textContent = 'Protocol: ' + (loco.protocol || 'unknown');
    }
  } catch (e) { /* keep defaults */ }
  if (!currentProtocol && protocolEl && protocolEl.textContent === 'Protocol: …') {
    protocolEl.textContent = 'Protocol: unknown';
  }

  document.querySelectorAll('[data-protocol]').forEach(function (row) {
    row.hidden = row.getAttribute('data-protocol') !== currentProtocol;
  });

  const map = CV_MAP[currentProtocol];
  if (!map) {
    if (titleEl && titleEl.textContent === 'Loading …') titleEl.textContent = 'UID ' + currentUid;
    const warn = document.getElementById('editorUnsupported');
    if (warn) warn.style.display = 'block';
    updateEditorStatus('');
    return;
  }

  setCvIndexValue('name', map.name ? '1027–16387' : '');
  setCvIndexValue('dccAddress', map.address ? String(map.address.cv) : '');
  setFieldValue('name', map.name ? '—' : '');
  setFieldValue('dccAddress', map.address ? '…' : '');

  const definitions = Object.keys(map).map(function (key) {
    return { key: key, cv: map[key].cv, length: map[key].length };
  });
  const expectedResponseCvs = [];
  definitions.forEach(function (definition) {
    if (definition.key === 'name') {
      for (let i = 0; i < definition.length; i++) expectedResponseCvs.push(definition.cv + (i * 1024));
    } else {
      expectedResponseCvs.push(definition.cv);
    }
  });
  expectedCvs = new Set(expectedResponseCvs);
  nameChars = map.name ? new Array(map.name.length).fill(null) : [];
  try {
    await connectEditorSSE();
    for (let i = 0; i < definitions.length; i++) {
      const definition = definitions[i];
      updateEditorStatus('Reading CV ' + (i + 1) + '/' + definitions.length + ' (' + definition.cv + ')…');
      await requestConfigRead(currentUid, definition.cv, definition.length);
      if (i < definitions.length - 1) {
        await new Promise(function (resolve) { window.setTimeout(resolve, CONFIG_READ_INTERVAL_MS); });
      }
    }
    await waitForConfigValues(expectedResponseCvs, 2500);

    const missingValueCvs = expectedResponseCvs.filter(function (cv) { return !receivedCvs.has(cv); });
    updateEditorStatus(missingValueCvs.length === 0
      ? 'All values read.'
      : 'Read complete; no response for CV: ' + missingValueCvs.join(', '));
  } catch (error) {
    updateEditorStatus('Failed to connect or send CV read requests.');
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', init);
