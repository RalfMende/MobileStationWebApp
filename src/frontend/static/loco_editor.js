/*
 THE BEER-WARE LICENSE (Revision 42)

<mende.r@hotmail.de> wrote this file. As long as you retain this notice you can do whatever you want with this
 stuff. If we meet someday, and you think this stuff is worth it, you can
 buy me a beer in return.
 Ralf Mende
*/

let currentUid = null;
let currentProtocol = null;
let protocolCvMap = {};
let nameChars = [];
let evtSource = null;
let evtSourcePromise = null;
let expectedCvs = new Set();
let receivedCvs = new Set();
let configWaiters = new Set();
let readInProgress = false;
let requestedReadCvs = new Set();
let readCvs = new Set();
const CV_LABELS = {
  en: {
    adresse: 'Address', vmin: 'Minimum Speed', av: 'Acceleration Delay',
    bv: 'Braking Delay', vmax: 'Maximum Speed', volume: 'Volume', name: 'Name'
  },
  de: {
    adresse: 'Adresse', vmin: 'Mindestgeschwindigkeit', av: 'Anfahrverzögerung',
    bv: 'Bremsverzögerung', vmax: 'Höchstgeschwindigkeit', volume: 'Lautstärke', name: 'Name'
  },
  fr: {
    adresse: 'Adresse', vmin: 'Vitesse minimale', av: 'Temporisation d’accélération',
    bv: 'Temporisation de freinage', vmax: 'Vitesse maximale', volume: 'Volume', name: 'Nom'
  },
  nl: {
    adresse: 'Adres', vmin: 'Minimumsnelheid', av: 'Optrekvertraging',
    bv: 'Remvertraging', vmax: 'Maximumsnelheid', volume: 'Volume', name: 'Naam'
  }
};

function detectEditorLanguage() {
  const language = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
  if (language.indexOf('de') === 0) return 'de';
  if (language.indexOf('fr') === 0) return 'fr';
  if (language.indexOf('nl') === 0) return 'nl';
  return 'en';
}

function getCvLabel(key) {
  return CV_LABELS[detectEditorLanguage()][key] || key;
}

function normalizeProtocol(raw) {
  const p = String(raw || '').toLowerCase();
  if (p.indexOf('mfx') !== -1) return 'mfx';
  if (p.indexOf('dcc') !== -1) return 'dcc';
  if (p.indexOf('mm2') !== -1) return 'mm2_prog';
  return '';
}

function setFieldValue(key, value) {
  const el = document.querySelector('[data-protocol="' + currentProtocol + '"] [data-cv-field="' + key + '"]')
    || document.querySelector('[data-cv-field="' + key + '"]');
  if (!el) return;
  if (el instanceof HTMLInputElement) el.value = String(value);
  else el.textContent = String(value);
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
  const definitions = protocolCvMap[currentProtocol];
  if (!definitions) return;
  if (!expectedCvs.has(cv)) return;
  receivedCvs.add(cv);
  if (requestedReadCvs.has(cv)) {
    readCvs.add(cv);
    setWriteControlEnabled(cv, true);
  }
  updateEditorStatus('Responses: ' + receivedCvs.size + '/' + expectedCvs.size);
  configWaiters.forEach(function (check) { check(); });
  const name = definitions.find(function (definition) { return definition.response_step > 0; });
  if (name && cv >= name.cv && (cv - name.cv) % name.response_step === 0) {
    const idx = (cv - name.cv) / name.response_step;
    if (idx < name.length) {
      nameChars[idx] = value;
      updateNameField();
      return;
    }
  }
  const definition = definitions.find(function (item) { return item.cv === cv; });
  if (definition) setFieldValue(definition.key, value);
}

function updateEditorStatus(message) {
  const status = document.getElementById('editorStatus');
  if (status) {
    status.textContent = message;
    status.classList.remove('warning');
  }
}

function showEditorWarning(message) {
  const status = document.getElementById('editorStatus');
  if (status) {
    status.textContent = message;
    status.classList.add('warning');
  }
}

async function canConfigureLocomotive() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const health = await response.json();
    if (health.system_state !== 'running') {
      showEditorWarning('Configuration of the locomotive is not possible while the system is in STOP state.');
      return false;
    }
    return true;
  } catch (error) {
    showEditorWarning('Unable to check system state; configuration request cancelled.');
    console.error(error);
    return false;
  }
}

function setWriteControlEnabled(cv, enabled) {
  document.querySelectorAll('.cv-write-button[data-cv-index="' + cv + '"]').forEach(function (button) {
    button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    button.classList.toggle('is-disabled', !enabled);
  });
}

function connectEditorSSE() {
  if (evtSource && evtSource.readyState === EventSource.OPEN) return Promise.resolve();
  if (evtSourcePromise) return evtSourcePromise;

  const source = new EventSource('/api/events');
  evtSource = source;
  evtSourcePromise = new Promise(function (resolve, reject) {
    const timeout = window.setTimeout(function () {
      source.close();
      evtSource = null;
      evtSourcePromise = null;
      reject(new Error('SSE connection timed out'));
    }, 10000);
    source.onopen = function () {
      window.clearTimeout(timeout);
      resolve();
    };
    source.onmessage = function (ev) {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'loco_uid_changed' && Number(data.old_uid) === currentUid) {
          const oldUid = String(data.old_uid);
          currentUid = Number(data.new_uid);
          const newUid = String(currentUid);
          const url = new URL(window.location.href);
          url.searchParams.set('uid', newUid);
          window.history.replaceState(null, '', url.toString());
          localStorage.setItem('currentLocoUid', newUid);
          ['dockLocoUids', 'pinnedLocoUids'].forEach(function (key) {
            try {
              const uids = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(uids)) {
                localStorage.setItem(key, JSON.stringify(uids.map(function (uid) {
                  return String(uid) === oldUid ? newUid : uid;
                })));
              }
            } catch (e) { /* ignore invalid stored dock state */ }
          });
        } else if (data.type === 'config_value') {
          handleConfigValue(data.loc_id, data.cv, data.value);
        }
      } catch (e) { /* ignore malformed event */ }
    };
    source.onerror = function () {
      if (source.readyState === EventSource.CLOSED) {
        window.clearTimeout(timeout);
        evtSource = null;
        evtSourcePromise = null;
        reject(new Error('SSE connection closed'));
      }
    };
  });
  return evtSourcePromise;
}

async function requestConfigRead(uid, cv, length) {
  const response = await fetch('/api/loco_config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: uid, cvs: [cv], count: length })
  });
  if (!response.ok) throw new Error('Read request failed: HTTP ' + response.status);
}

function setupReadControl(definition, valueCell) {
  if (!Number.isInteger(definition.cv)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cv-read-button';
  button.textContent = 'Read';
  button.addEventListener('click', async function () {
    if (readInProgress) return;
    if (!await canConfigureLocomotive()) return;
    readInProgress = true;
    const readButtons = Array.from(document.querySelectorAll('.cv-read-button'));
    readButtons.forEach(function (readButton) { readButton.disabled = true; });
    const responseCvs = definition.response_step > 0
      ? Array.from({ length: definition.length }, function (_, i) { return definition.cv + i * definition.response_step; })
      : [definition.cv];
    expectedCvs = new Set(responseCvs);
    receivedCvs.clear();
    requestedReadCvs = new Set(responseCvs);
    updateEditorStatus('Reading CV ' + definition.cv + '…');

    try {
      await connectEditorSSE();
      await requestConfigRead(currentUid, definition.cv, definition.length);
      const missing = await waitForConfigValues(responseCvs, definition.response_step > 0 ? 5000 : 2500);
      updateEditorStatus(missing.length ? 'No response for CV ' + missing.join(', ') : 'CV read complete.');
    } catch (error) {
      updateEditorStatus('CV read failed.');
      console.error(error);
    } finally {
      readInProgress = false;
      readButtons.forEach(function (readButton) { readButton.disabled = false; });
    }
  });

  valueCell.append(button);
}

async function requestConfigWrite(uid, cv, value) {
  const response = await fetch('/api/loco_config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ write: true, uid: uid, cv: cv, value: value })
  });
  if (!response.ok) throw new Error('Write request failed: HTTP ' + response.status);
}

function setupWriteControl(definition, field, valueCell, valueElement) {
    if (!definition.range || !Number.isInteger(definition.cv)) return;
    const range = String(definition.range).match(/^(\d+)-(\d+)$/);
    if (!range) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'cv-value cv-value-input';
    input.min = range[1];
    input.max = range[2];
    input.step = '1';
    input.inputMode = 'numeric';
    input.dataset.cvField = field;
    input.value = valueElement.textContent;
    input.setAttribute('aria-label', 'Value for ' + getCvLabel(definition.key) + ' (CV ' + definition.cv + ')');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cv-write-button';
    button.textContent = 'Write';
    button.dataset.cvIndex = String(definition.cv);
    button.setAttribute('aria-disabled', readCvs.has(definition.cv) ? 'false' : 'true');
    button.classList.toggle('is-disabled', !readCvs.has(definition.cv));
    button.addEventListener('click', async function () {
      if (!readCvs.has(definition.cv)) {
        showEditorWarning('Read this CV before writing it.');
        return;
      }
      if (!await canConfigureLocomotive()) return;
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < Number(range[1]) || value > Number(range[2])) {
        updateEditorStatus('Enter a value between ' + range[1] + ' and ' + range[2] + '.');
        input.focus();
        return;
      }

      button.disabled = true;
      updateEditorStatus('Writing CV ' + definition.cv + '…');
      try {
        await requestConfigWrite(currentUid, definition.cv, value);
        updateEditorStatus('Write request sent; waiting for CAN response…');
      } catch (error) {
        updateEditorStatus('CV write failed.');
        console.error(error);
      } finally {
        button.disabled = false;
      }
    });

    valueElement.replaceWith(input);
    valueCell.append(button);
}

function renderCvTable(definitions, configValues) {
  const tableBody = document.getElementById('cvTableBody');
  const responseCvs = [];
  if (!tableBody) return responseCvs;
  tableBody.replaceChildren();

  definitions.forEach(function (definition) {
    const row = document.createElement('tr');
    row.dataset.protocol = currentProtocol;

    const labelCell = document.createElement('td');
    labelCell.textContent = getCvLabel(definition.key);
    row.appendChild(labelCell);

    const indexCell = document.createElement('td');
    indexCell.className = 'cv-idx';
    if (Number.isInteger(definition.cv)) {
      indexCell.textContent = definition.response_step > 0
        ? definition.cv + '–' + (definition.cv + (definition.length - 1) * definition.response_step)
        : String(definition.cv);
    }
    row.appendChild(indexCell);

    const valueCell = document.createElement('td');
    valueCell.className = 'cv-value-cell';
    const valueElement = document.createElement('span');
    valueElement.className = 'cv-value';
    valueElement.dataset.cvField = definition.key;
    const storedValue = configValues[definition.key];
    if (typeof storedValue === 'string') valueElement.textContent = storedValue;
    valueCell.appendChild(valueElement);
    setupReadControl(definition, valueCell);
    setupWriteControl(definition, definition.key, valueCell, valueElement);
    row.appendChild(valueCell);
    tableBody.appendChild(row);

    if (Number.isInteger(definition.cv)) {
      if (definition.response_step > 0) {
        for (let i = 0; i < definition.length; i++) {
          responseCvs.push(definition.cv + i * definition.response_step);
        }
      } else {
        responseCvs.push(definition.cv);
      }
    }
  });

  return responseCvs;
}

function getUidFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const uid = parseInt(params.get('uid'), 10);
  return Number.isFinite(uid) && uid > 0 ? uid : null;
}

async function init() {
  document.documentElement.lang = detectEditorLanguage();
  const titleEl = document.getElementById('editorLocoName');
  const protocolEl = document.getElementById('editorProtocol');
  let locoConfigValues = {};
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
      locoConfigValues = loco.config_values || {};
      if (protocolEl) protocolEl.textContent = 'Protocol: ' + (loco.protocol || 'unknown');
    }
    const mapResponse = await fetch('/api/loco_cv_map');
    if (!mapResponse.ok) throw new Error('CV map request failed: HTTP ' + mapResponse.status);
    protocolCvMap = await mapResponse.json();
  } catch (e) { /* keep defaults */ }
  if (!currentProtocol && protocolEl && protocolEl.textContent === 'Protocol: …') {
    protocolEl.textContent = 'Protocol: unknown';
  }

  document.querySelectorAll('[data-protocol]').forEach(function (row) {
    row.hidden = row.getAttribute('data-protocol') !== currentProtocol;
  });

  const definitions = protocolCvMap[currentProtocol];
  if (!Array.isArray(definitions)) {
    if (titleEl && titleEl.textContent === 'Loading …') titleEl.textContent = 'UID ' + currentUid;
    const warn = document.getElementById('editorUnsupported');
    if (warn) warn.style.display = 'block';
    updateEditorStatus('');
    return;
  }

  requestedReadCvs.clear();
  readCvs.clear();
  const expectedResponseCvs = renderCvTable(definitions, locoConfigValues);
  expectedCvs = new Set(expectedResponseCvs);
  const nameDefinition = definitions.find(function (definition) { return definition.response_step > 0; });
  nameChars = nameDefinition ? new Array(nameDefinition.length).fill(null) : [];
  updateEditorStatus('Values loaded from locomotive configuration.');
}

document.addEventListener('DOMContentLoaded', init);
