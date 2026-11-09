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

// CONFIG_PATH is injected by the backend into loco_editor.html; fall back to the
// default public config base used by the server ("/cfg") when it is missing.
const STATIC_BASE = String(window.CONFIG_PATH || '/cfg').replace(/\/$/, '');
function asset(rel) {
  if (!rel.startsWith('/')) rel = '/' + rel;
  return STATIC_BASE + rel;
}

// Same fallback chain as the main page: icon -> sym_<Symbol>.png -> leeres Gleis.png
function setEditorLocoIcon(imgEl, loco) {
  if (!imgEl) return;
  const iconName = loco && loco.icon;
  const symbolVal = loco && loco.symbol;
  let stage = 0; // 0: try icon, 1: try symbol, 2: final fallback
  imgEl.onerror = function () {
    if (stage === 0 && Number.isFinite(Number(symbolVal))) {
      stage = 1;
      imgEl.src = '/static/grafics/sym_' + Number(symbolVal) + '.png';
    } else if (stage <= 1) {
      stage = 2;
      imgEl.onerror = null;
      imgEl.src = asset('icons/leeres Gleis.png');
    }
  };
  if (iconName) {
    imgEl.src = asset('icons/' + iconName + '.png');
  } else if (Number.isFinite(Number(symbolVal))) {
    stage = 1;
    imgEl.src = '/static/grafics/sym_' + Number(symbolVal) + '.png';
  } else {
    imgEl.onerror = null;
    imgEl.src = asset('icons/leeres Gleis.png');
  }
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
  const customIndex = document.getElementById('customCvIndex');
  if (customIndex && Number(customIndex.value) === cv) {
    const customValue = document.getElementById('customCvValue');
    if (customValue) customValue.value = String(value);
  }
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

function renderCvTableHead() {
  const tableHead = document.getElementById('cvTableHead');
  if (!tableHead) return;
  tableHead.replaceChildren();
  const row = document.createElement('tr');
  const labels = currentProtocol === 'dcc'
    ? ['CV Index', 'Parameter', 'Value']
    : ['Parameter', 'CV Index', 'Value'];
  labels.forEach(function (label) {
    const th = document.createElement('th');
    th.textContent = label;
    row.appendChild(th);
  });
  tableHead.appendChild(row);
}

// DCC-only extra row: lets the user enter any CV index (1-1024), shows the
// parameter meaning from the XML map when one exists, and allows read/write
// of that CV (write only after a successful read).
function setupCustomCvRow(definitions, tableBody) {
  const row = document.createElement('tr');
  row.dataset.protocol = currentProtocol;

  const indexCell = document.createElement('td');
  indexCell.className = 'cv-idx';
  const indexInput = document.createElement('input');
  indexInput.type = 'number';
  indexInput.id = 'customCvIndex';
  indexInput.className = 'cv-index-input';
  indexInput.min = '1';
  indexInput.max = '1024';
  indexInput.step = '1';
  indexInput.inputMode = 'numeric';
  indexInput.setAttribute('aria-label', 'CV Index');
  indexCell.appendChild(indexInput);

  const labelCell = document.createElement('td');
  labelCell.id = 'customCvParam';

  const valueCell = document.createElement('td');
  valueCell.className = 'cv-value-cell';
  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.id = 'customCvValue';
  valueInput.className = 'cv-value cv-value-input';
  valueInput.min = '0';
  valueInput.max = '255';
  valueInput.step = '1';
  valueInput.inputMode = 'numeric';
  valueInput.setAttribute('aria-label', 'Value for custom CV');

  const readButton = document.createElement('button');
  readButton.type = 'button';
  readButton.className = 'cv-read-button';
  readButton.textContent = 'Read';

  const writeButton = document.createElement('button');
  writeButton.type = 'button';
  writeButton.className = 'cv-write-button is-disabled';
  writeButton.textContent = 'Write';
  writeButton.setAttribute('aria-disabled', 'true');

  function currentCustomCv() {
    const cv = Number(indexInput.value);
    return Number.isInteger(cv) && cv >= 1 && cv <= 1024 ? cv : null;
  }

  function syncCustomRow() {
    const cv = currentCustomCv();
    const definition = cv === null ? null
      : definitions.find(function (item) { return item.cv === cv; }) || null;
    labelCell.textContent = definition ? getCvLabel(definition.key) : '';
    let min = 0, max = 255;
    if (definition && definition.range) {
      const range = String(definition.range).match(/^(\d+)-(\d+)$/);
      if (range) { min = Number(range[1]); max = Number(range[2]); }
    }
    valueInput.min = String(min);
    valueInput.max = String(max);
    valueInput.value = '';
    readButton.disabled = cv === null;
    if (cv === null) writeButton.removeAttribute('data-cv-index');
    else writeButton.dataset.cvIndex = String(cv);
    const writeEnabled = cv !== null && readCvs.has(cv);
    writeButton.setAttribute('aria-disabled', writeEnabled ? 'false' : 'true');
    writeButton.classList.toggle('is-disabled', !writeEnabled);
  }

  indexInput.addEventListener('input', syncCustomRow);

  readButton.addEventListener('click', async function () {
    const cv = currentCustomCv();
    if (cv === null || readInProgress) return;
    if (!await canConfigureLocomotive()) return;
    readInProgress = true;
    const readButtons = Array.from(document.querySelectorAll('.cv-read-button'));
    readButtons.forEach(function (button) { button.disabled = true; });
    expectedCvs = new Set([cv]);
    receivedCvs.clear();
    requestedReadCvs = new Set([cv]);
    updateEditorStatus('Reading CV ' + cv + '…');

    try {
      await connectEditorSSE();
      await requestConfigRead(currentUid, cv, 1);
      const missing = await waitForConfigValues([cv], 2500);
      updateEditorStatus(missing.length ? 'No response for CV ' + missing.join(', ') : 'CV read complete.');
    } catch (error) {
      updateEditorStatus('CV read failed.');
      console.error(error);
    } finally {
      readInProgress = false;
      readButtons.forEach(function (button) { button.disabled = false; });
      readButton.disabled = currentCustomCv() === null;
    }
  });

  writeButton.addEventListener('click', async function () {
    const cv = currentCustomCv();
    if (cv === null) return;
    if (!readCvs.has(cv)) {
      showEditorWarning('Read this CV before writing it.');
      return;
    }
    if (!await canConfigureLocomotive()) return;
    const min = Number(valueInput.min);
    const max = Number(valueInput.max);
    const value = Number(valueInput.value);
    if (!Number.isInteger(value) || value < min || value > max) {
      updateEditorStatus('Enter a value between ' + min + ' and ' + max + '.');
      valueInput.focus();
      return;
    }

    writeButton.disabled = true;
    updateEditorStatus('Writing CV ' + cv + '…');
    try {
      await requestConfigWrite(currentUid, cv, value);
      updateEditorStatus('Write request sent; waiting for CAN response…');
    } catch (error) {
      updateEditorStatus('CV write failed.');
      console.error(error);
    } finally {
      writeButton.disabled = false;
    }
  });

  valueCell.appendChild(valueInput);
  valueCell.appendChild(readButton);
  valueCell.appendChild(writeButton);

  row.appendChild(indexCell);
  row.appendChild(labelCell);
  row.appendChild(valueCell);
  tableBody.appendChild(row);
  syncCustomRow();
}

function renderCvTable(definitions, configValues) {
  const tableBody = document.getElementById('cvTableBody');
  const responseCvs = [];
  if (!tableBody) return responseCvs;
  tableBody.replaceChildren();

  definitions.forEach(function (definition) {
    if (currentProtocol === 'dcc' && definition.key === 'name') return; // name is shown in the header bar
    const row = document.createElement('tr');
    row.dataset.protocol = currentProtocol;

    const labelCell = document.createElement('td');
    labelCell.textContent = getCvLabel(definition.key);

    const indexCell = document.createElement('td');
    indexCell.className = 'cv-idx';
    if (Number.isInteger(definition.cv)) {
      indexCell.textContent = definition.response_step > 0
        ? definition.cv + '–' + (definition.cv + (definition.length - 1) * definition.response_step)
        : String(definition.cv);
    }

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

    if (currentProtocol === 'dcc') {
      row.appendChild(indexCell);
      row.appendChild(labelCell);
    } else {
      row.appendChild(labelCell);
      row.appendChild(indexCell);
    }
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

  if (currentProtocol === 'dcc') setupCustomCvRow(definitions, tableBody);

  return responseCvs;
}

function getUidFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const uid = parseInt(params.get('uid'), 10);
  return Number.isFinite(uid) && uid > 0 ? uid : null;
}

// ==========================
//  Icon picker (opened via double-click on the loco icon)
// ==========================

function openIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  const filter = document.getElementById('iconFilter');
  if (!modal || !currentUid) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  fetch('/api/icons')
    .then(function (r) { return r.json(); })
    .then(function (list) {
      renderIconGrid(list || []);
      if (filter) {
        filter.value = '';
        filter.oninput = function () {
          const q = filter.value.trim().toLowerCase();
          const filtered = (list || []).filter(function (it) { return it.name.toLowerCase().includes(q); });
          renderIconGrid(filtered);
        };
      }
    })
    .catch(function () { renderIconGrid([]); });
}

function closeIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderIconGrid(items) {
  const grid = document.getElementById('iconPickerGrid');
  if (!grid) return;
  grid.replaceChildren();
  if (!Array.isArray(items)) return;
  items.forEach(function (it) {
    const card = document.createElement('div');
    card.className = 'icon-card';
    const img = new Image();
    img.alt = it.name;
    img.src = asset('icons/' + it.name + '.png');
    img.onerror = function () {
      img.onerror = null;
      img.src = '/static/grafics/unknown_loco.png';
    };
    const cap = document.createElement('div');
    cap.className = 'caption';
    cap.textContent = it.file;
    card.appendChild(img);
    card.appendChild(cap);
    card.onclick = function () { chooseIconForCurrentLoco(it.name); };
    grid.appendChild(card);
  });
}

function chooseIconForCurrentLoco(iconNameNoExt) {
  if (!currentUid) return;
  fetch('/api/loco_icon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loco_id: currentUid, icon: iconNameNoExt })
  })
    .then(function (r) { return r.json(); })
    .then(function () {
      const iconImg = document.getElementById('editorLocoIcon');
      if (iconImg) {
        iconImg.onerror = null;
        iconImg.src = asset('icons/' + iconNameNoExt + '.png');
      }
      closeIconPicker();
    })
    .catch(function () { closeIconPicker(); });
}

function setupIconPicker() {
  const iconImg = document.getElementById('editorLocoIcon');
  const modal = document.getElementById('iconPickerModal');
  const closeBtn = document.getElementById('iconPickerClose');
  const cancelBtn = document.getElementById('iconPickerCancel');
  if (iconImg) {
    iconImg.setAttribute('draggable', 'false');
    iconImg.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    iconImg.addEventListener('dblclick', openIconPicker);
  }
  if (closeBtn) closeBtn.onclick = closeIconPicker;
  if (cancelBtn) cancelBtn.onclick = closeIconPicker;
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('modal-backdrop')) closeIconPicker();
    });
  }
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

  let currentLoco = null;
  try {
    const res = await fetch('/api/loco_list');
    const list = await res.json();
    const loco = list[String(currentUid)];
    if (loco) {
      currentLoco = loco;
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
  setEditorLocoIcon(document.getElementById('editorLocoIcon'), currentLoco);

  document.querySelectorAll('[data-protocol]').forEach(function (row) {
    row.hidden = row.getAttribute('data-protocol') !== currentProtocol;
  });

  // The POM table is currently only implemented for DCC; MFX support is planned later.
  const tableSupported = currentProtocol === 'dcc';
  const definitions = tableSupported ? protocolCvMap[currentProtocol] : null;
  if (!Array.isArray(definitions)) {
    if (titleEl && titleEl.textContent === 'Loading …') titleEl.textContent = 'UID ' + currentUid;
    const warn = document.getElementById('editorUnsupported');
    if (warn) warn.style.display = 'block';
    const table = document.getElementById('cvTable');
    if (table) table.style.display = 'none';
    const pomHeading = document.getElementById('pomHeading');
    if (pomHeading) pomHeading.style.display = 'none';
    updateEditorStatus('');
    return;
  }

  renderCvTableHead();
  requestedReadCvs.clear();
  readCvs.clear();
  const expectedResponseCvs = renderCvTable(definitions, locoConfigValues);
  expectedCvs = new Set(expectedResponseCvs);
  const nameDefinition = definitions.find(function (definition) { return definition.response_step > 0; });
  nameChars = nameDefinition ? new Array(nameDefinition.length).fill(null) : [];
  updateEditorStatus('Values loaded from locomotive configuration.');
}

document.addEventListener('DOMContentLoaded', function () {
  setupIconPicker();
  init();
});
