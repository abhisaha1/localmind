import { getModelsByTask, getModelById } from './models.mjs';

// DOM helper
export const $ = (id) => document.getElementById(id);

// ── WebGPU detection and status management ───────────────────────────────────
export async function initializeWebGPU() {
  const dot = $('dotWebGPU');
  const lbl = $('statusWebGPU');
  
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        dot.className = 'dot green';
        lbl.textContent = 'WEBGPU ✓';
        return true;
      }
    }
  } catch (_) {}
  
  dot.className = 'dot yellow';
  lbl.textContent = 'WASM (no WebGPU)';
  return false;
}

// ── Model dropdown management ────────────────────────────────────────────────
export function populateModelDropdown(task) {
  const select = $('modelSelect');
  select.innerHTML = '';
  
  const models = getModelsByTask(task);
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.label}  ·  ${model.size}`;
    select.appendChild(option);
  });
  
  updateModelInfo(task);
}

export function updateModelInfo(task) {
  const modelId = $('modelSelect').value;
  const model = getModelById(task, modelId);
  const infoEl = $('modelInfo');
  
  if (model) {
    infoEl.innerHTML = `<strong>${model.id}</strong><br>${model.note}<br>Size: <strong>${model.size}</strong> &middot; dtype: <strong>${model.dtype}</strong>`;
  } else {
    infoEl.innerHTML = '';
  }
}

// ── Configuration panel management ───────────────────────────────────────────
export function updateConfigPanels(task) {
  document.querySelectorAll('.task-config').forEach(el => el.classList.remove('visible'));
  
  const configMap = {
    'text-generation': 'configTextGen',
    'question-answering': 'configQA',
    'zero-shot-classification': 'configZeroShot',
  };
  
  const configId = configMap[task] || 'configDefault';
  $(configId).classList.add('visible');
}

// ── Progress bar management ──────────────────────────────────────────────────
export function showProgress() {
  $('progressWrap').classList.add('visible');
  $('progressFill').className = 'progress-fill indeterminate';
  $('progressPct').textContent = '';
  $('progressLabel').textContent = 'Starting…';
}

export function hideProgress() {
  $('progressWrap').classList.remove('visible');
}

export function updateProgress(progressData) {
  const { status, loaded, total, file } = progressData;
  
  if (status === 'progress' && total) {
    const pct = Math.round((loaded / total) * 100);
    const mb = (loaded / 1048576).toFixed(1);
    const totalMb = (total / 1048576).toFixed(1);
    
    $('progressFill').className = 'progress-fill';
    $('progressFill').style.width = pct + '%';
    $('progressLabel').textContent = (file || 'Downloading') + '…';
    $('progressPct').textContent = `${mb}/${totalMb} MB`;
  } else if (status === 'initiate') {
    $('progressFill').className = 'progress-fill indeterminate';
    $('progressLabel').textContent = `Fetching ${file || 'files'}…`;
    $('progressPct').textContent = '';
  } else if (status === 'done') {
    $('progressFill').className = 'progress-fill indeterminate';
    $('progressLabel').textContent = 'Building ONNX session…';
    $('progressPct').textContent = '';
  }
}

// ── Model status management ──────────────────────────────────────────────────
export function setModelStatus(status, message) {
  const statusMap = {
    loading: { dot: 'dot yellow', text: 'LOADING', btn: '⏳ LOADING…', disabled: true },
    ready: { dot: 'dot green', text: 'READY', btn: '✓ READY – RELOAD?', disabled: false },
    failed: { dot: 'dot red', text: 'FAILED', btn: '⬇ RETRY', disabled: false },
    none: { dot: 'dot', text: 'NO MODEL', btn: '⬇ LOAD MODEL', disabled: false }
  };
  
  const config = statusMap[status];
  if (config) {
    $('dotModel').className = config.dot;
    $('statusModel').textContent = config.text;
    $('loadBtn').textContent = config.btn;
    $('loadBtn').disabled = config.disabled;
  }
}

// ── Input/UI state management ────────────────────────────────────────────────
export function setInputsEnabled(enabled, placeholder = null) {
  $('userInput').disabled = !enabled;
  $('sendBtn').disabled = !enabled;
  $('clearBtn').disabled = !enabled;
  
  if (placeholder) {
    $('userInput').placeholder = placeholder;
  }
  
  if (enabled) {
    $('userInput').focus();
  }
}

// ── Stats display ────────────────────────────────────────────────────────────
export function updateStats({ latency, totalRuns, modelSize, device }) {
  if (latency !== undefined) {
    $('gaugeLatency').textContent = latency;
    $('statusLatency').textContent = latency + 'ms';
  }
  if (totalRuns !== undefined) {
    $('gaugeTotal').textContent = totalRuns;
  }
  if (modelSize !== undefined) {
    $('gaugeSize').textContent = modelSize.replace('~', '');
  }
  if (device !== undefined) {
    $('gaugeDevice').textContent = device;
  }
}

// ── Error handling ───────────────────────────────────────────────────────────
export function showError(message) {
  const toast = $('errorToast');
  toast.textContent = '⚠ ' + message;
  toast.style.display = 'block';
  
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 8000);
}

// ── Utility functions ────────────────────────────────────────────────────────
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}