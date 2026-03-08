import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0/dist/transformers.min.js';
import { getModelById } from '../models.mjs';
import { setModelStatus, showProgress, hideProgress, updateStats, showError, getDeviceInfo, clearProgressFiles } from '../ui.mjs';
import { addSystemMessage } from '../chat.mjs';
import { formatDeviceString } from '../device-info.mjs';
import { setCurrentPipeline, setCurrentTask, setLoading, isModelGenerating } from './state.mjs';
import { createDownloadSession, createSafeProgressCallback, getDownloadAbortController, cleanupDownload } from './download-manager.mjs';

// ── Model loading ──────────────────────────────────────────────────────────
export async function loadModel(task, modelId, hasWebGPU = false) {
  // Prevent loading if already generating
  if (isModelGenerating()) return false;

  // Set loading state
  setLoading(true);
  setCurrentPipeline(null);
  setCurrentTask(task);

  // Create download session (cancels any existing downloads)
  const { abortController } = createDownloadSession();

  const modelMeta = getModelById(task, modelId);

  setModelStatus('loading');
  
  // Small delay to ensure clean UI transition after cancel
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force clear any lingering progress elements
  clearProgressFiles();
  
  showProgress();

  addSystemMessage(`Loading ${modelId}\n${modelMeta?.size || ''} · dtype:${modelMeta?.dtype || 'auto'}`);

  try {
    const options = {
      dtype: modelMeta?.dtype || 'fp32',
      progress_callback: createSafeProgressCallback(),
    };

    // Configure device and update stats
    configureDeviceAndStats(hasWebGPU, task, options);

    // Check if download was cancelled before starting pipeline creation
    if (abortController?.signal.aborted) {
      throw new Error('Download cancelled');
    }

    const loadedPipeline = await pipeline(task, modelId, options);
    setCurrentPipeline(loadedPipeline);

    setModelStatus('ready');
    hideProgress();

    if (modelMeta) {
      updateStats({ modelSize: modelMeta.size });
    }

    addSystemMessage('✓ Model ready. Type below and press Enter.');
    return true;

  } catch (error) {
    console.error(error);
    handleLoadingError(error, abortController);
    return false;
  } finally {
    setLoading(false);
    cleanupDownload();
  }
}

// ── Device configuration ─────────────────────────────────────────────────────
function configureDeviceAndStats(hasWebGPU, task, options) {
  const deviceInfo = getDeviceInfo();
  
  if (hasWebGPU && task === 'text-generation') {
    options.device = 'webgpu';
    // Update with detailed GPU information when using WebGPU
    const gpuDevice = deviceInfo?.webgpu?.info ? 
      formatDeviceString(deviceInfo, 'compact') : 'WebGPU';
    updateStats({ device: gpuDevice });
  } else {
    // Update with CPU information when using WASM
    const cpuDevice = deviceInfo ? 
      formatDeviceString(deviceInfo, 'compact') : 'CPU/WASM';
    updateStats({ device: cpuDevice });
  }
}

// ── Error handling ───────────────────────────────────────────────────────────
function handleLoadingError(error, abortController) {
  // Handle cancellation differently from other errors
  if (error.message === 'Download cancelled' || abortController?.signal.aborted) {
    setModelStatus('none');
    addSystemMessage('✗ Download cancelled');
  } else {
    setModelStatus('failed');
    showError(error.message || String(error));
    addSystemMessage('✗ Failed: ' + error.message);
  }

  hideProgress();
}