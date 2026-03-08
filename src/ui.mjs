import { getModelsByTask, getModelById } from './models.mjs';
import { detectDeviceInfo, formatDeviceString, logDeviceDetails } from './device-info.mjs';

// DOM helper
export const $ = (id) => document.getElementById(id);

// ── WebGPU detection and status management ───────────────────────────────────
let deviceInfo = null;

export async function initializeWebGPU() {
  try {
    // Detect comprehensive device information
    deviceInfo = await detectDeviceInfo();
    
    // Log detailed device information for debugging
    logDeviceDetails(deviceInfo);
    
    // Update initial device stats
    updateStats({ 
      device: formatDeviceString(deviceInfo, 'compact'),
      cores: deviceInfo.cpu.cores
    });
    
    if (deviceInfo.webgpu.available) {
      console.log('✅ WebGPU available:', deviceInfo.webgpu);
      return true;
    }
  } catch (error) {
    console.error('Device detection error:', error);
    // Fallback to basic detection
    updateStats({ 
      device: 'CPU/WASM',
      cores: navigator.hardwareConcurrency || '?'
    });
  }

  console.log('⚠️ WebGPU not available, falling back to WASM');
  return false;
}

export function getDeviceInfo() {
  return deviceInfo;
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
  updateLoadButtonState(task);
}

export function updateModelInfo(task) {
  const modelId = $('modelSelect').value;
  const model = getModelById(task, modelId);
  const infoEl = $('modelInfo');
  
  // Mobile detection
  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (model) {
    let infoHTML = `<strong>${model.id}</strong><br>${model.note}<br>Size: <strong>${model.size}</strong> &middot; dtype: <strong>${model.dtype}</strong>`;
    
    // Add mobile warning if model is disabled on mobile
    if (isMobile && model.mobileDisable) {
      infoHTML += `<br><br><div style="color: #ff6b6b; font-size: 11px; padding: 8px; background: rgba(255, 107, 107, 0.1); border-radius: 4px; margin-top: 8px;">
        <strong>⚠️ Mobile Warning:</strong> This model is not supported on mobile devices due to high memory requirements. Use the Load Model button to see available alternatives.
      </div>`;
    }
    
    infoEl.innerHTML = infoHTML;
  } else {
    infoEl.innerHTML = '';
  }
  
  // Update load button state whenever model info changes
  updateLoadButtonState(task);
}

// ── Load button state management ──────────────────────────────────────────
export function updateLoadButtonState(task) {
  const modelId = $('modelSelect').value;
  const model = getModelById(task, modelId);
  const loadBtn = $('loadBtn');
  
  // Mobile detection
  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check if current model is disabled on mobile
  const isDisabledOnMobile = isMobile && model?.mobileDisable;
  
  if (isDisabledOnMobile) {
    loadBtn.disabled = true;
    loadBtn.textContent = '⚠️ MOBILE: NOT SUPPORTED';
    loadBtn.style.background = 'rgba(255, 107, 107, 0.2)';
    loadBtn.style.color = '#ff6b6b';
    loadBtn.style.cursor = 'not-allowed';
  } else {
    // Reset to normal state if not disabled
    const isLoading = loadBtn.textContent.includes('LOADING');
    const isReady = loadBtn.textContent.includes('READY');
    
    if (!isLoading && !isReady) {
      loadBtn.disabled = false;
      loadBtn.textContent = '⬇ LOAD MODEL';
      loadBtn.style.background = '';
      loadBtn.style.color = '';
      loadBtn.style.cursor = '';
    }
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

// ── Model status management ──────────────────────────────────────────────
export function setModelStatus(status, message) {
  // Check if button is currently disabled due to mobile restrictions
  const loadBtn = $('loadBtn');
  const isMobileDisabled = loadBtn.textContent.includes('MOBILE: NOT SUPPORTED');
  
  // If mobile disabled, don't change button state
  if (isMobileDisabled && status !== 'loading') {
    return;
  }
  
  const statusMap = {
    loading: { btn: '⏳ LOADING…', disabled: true },
    ready: { btn: '✓ READY – RELOAD?', disabled: false },
    failed: { btn: '⬇ RETRY', disabled: false },
    none: { btn: '⬇ LOAD MODEL', disabled: false }
  };

  const config = statusMap[status];
  if (config) {
    loadBtn.textContent = config.btn;
    loadBtn.disabled = config.disabled;
    
    // Reset custom mobile styling when setting normal states
    loadBtn.style.background = '';
    loadBtn.style.color = '';
    loadBtn.style.cursor = '';
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

// ── Stats display ────────────────────────────────────────────────────────────────────────────
export function updateStats({ latency, totalRuns, modelSize, device, cores }) {
  if (latency !== undefined) {
    $('gaugeLatency').textContent = latency;
  }
  if (device !== undefined) {
    $('gaugeDevice').textContent = device;
  }
  if (cores !== undefined) {
    $('gaugeCores').textContent = cores;
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