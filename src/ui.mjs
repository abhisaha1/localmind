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
  } catch (_) { }

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
  clearProgressFiles();
  updateProgressHeader(0);
  $('cancelBtn').style.display = 'inline-block';
}

export function hideProgress() {
  $('progressWrap').classList.remove('visible');
  $('cancelBtn').style.display = 'none';
  // Clear all progress files to prevent flickering on restart
  clearProgressFiles();
}

export function updateFileProgress(file, progressData) {
  // Additional safety check - don't update if progress container is not visible
  if (!$('progressWrap').classList.contains('visible')) {
    return;
  }

  const { status, loaded = 0, total = 0, progress = 0 } = progressData;
  const fileName = file.split('/').pop();
  const fileId = 'progress-' + fileName.replace(/[^a-zA-Z0-9]/g, '-');

  let fileEl = $(fileId);

  if (status === 'initiate') {
    // Remove any existing element with same ID (cleanup from previous downloads)
    const existingEl = $(fileId);
    if (existingEl) {
      existingEl.remove();
    }

    // Create new file progress element
    fileEl = document.createElement('div');
    fileEl.id = fileId;
    fileEl.className = 'progress-file';
    fileEl.innerHTML = `
      <div class="progress-file-name">
        <span class="file-name">${fileName}</span>
        <span class="file-status">Preparing...</span>
      </div>
      <div class="progress-file-bar">
        <div class="progress-file-fill indeterminate"></div>
      </div>
    `;
    $('progressFiles').appendChild(fileEl);

  } else if (status === 'download' || status === 'progress') {
    if (fileEl) {
      const fillEl = fileEl.querySelector('.progress-file-fill');
      const statusEl = fileEl.querySelector('.file-status');

      if (total > 0) {
        const pct = Math.round((loaded / total) * 100);
        const mb = (loaded / 1048576).toFixed(1);
        const totalMb = (total / 1048576).toFixed(1);

        fillEl.className = 'progress-file-fill';
        fillEl.style.width = pct + '%';
        statusEl.textContent = `${mb}/${totalMb} MB (${pct}%)`;
      } else if (progress > 0) {
        fillEl.className = 'progress-file-fill';
        fillEl.style.width = progress + '%';
        statusEl.textContent = `${progress}%`;
      } else {
        fillEl.className = 'progress-file-fill indeterminate';
        statusEl.textContent = 'Downloading...';
      }
    }

  } else if (status === 'done') {
    if (fileEl) {
      const fillEl = fileEl.querySelector('.progress-file-fill');
      const statusEl = fileEl.querySelector('.file-status');

      fillEl.className = 'progress-file-fill complete';
      fillEl.style.width = '100%';
      statusEl.textContent = '✓ Complete';
    }
  }
}

export function updateProgressHeader(activeCount, allComplete = false) {
  const headerEl = $('progressHeader');

  if (allComplete) {
    headerEl.textContent = 'Building ONNX session...';
  } else if (activeCount > 1) {
    headerEl.textContent = `Downloading ${activeCount} files`;
  } else if (activeCount === 1) {
    headerEl.textContent = 'Downloading file';
  } else {
    headerEl.textContent = 'Preparing download';
  }
}

export function clearProgressFiles() {
  const progressFiles = $('progressFiles');
  // Force immediate DOM cleanup to prevent flickering
  while (progressFiles.firstChild) {
    progressFiles.removeChild(progressFiles.firstChild);
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
  // if (totalRuns !== undefined) {
  //   $('gaugeTotal').textContent = totalRuns;
  // }
  // if (modelSize !== undefined) {
  //   $('gaugeSize').textContent = modelSize.replace('~', '');
  // }
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