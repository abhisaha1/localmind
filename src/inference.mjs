// Modular inference system - main coordination module
import { updateStats, showError } from './ui.mjs';

// Import modular components
import { 
  getCurrentPipeline, 
  getCurrentTask, 
  isModelLoading, 
  isModelGenerating, 
  getTotalRuns,
  setGenerating,
  incrementTotalRuns,
  resetModelState,
  resetTotalRuns
} from './inference/state.mjs';

import { loadModel as loadModelImpl } from './inference/model-loader.mjs';
import { cancelCurrentDownload as cancelCurrentDownloadImpl } from './inference/download-manager.mjs';
import { runTaskSpecificInference } from './inference/task-runners.mjs';
import { setModelStatus } from './ui.mjs';

// Re-export state getters for external modules
export { getCurrentPipeline, getCurrentTask, isModelLoading, isModelGenerating, getTotalRuns };

// ── Model loading ──────────────────────────────────────────────────────────
export async function loadModel(task, modelId, hasWebGPU = false) {
  return await loadModelImpl(task, modelId, hasWebGPU);
}

// ── Inference operations ─────────────────────────────────────────────────────
export async function runInference(text, onStreamCallback = null) {
  const pipeline = getCurrentPipeline();
  const task = getCurrentTask();
  
  if (!pipeline || isModelGenerating() || !text.trim()) {
    return null;
  }

  setGenerating(true);
  const startTime = performance.now();

  try {
    const output = await runTaskSpecificInference(task, text, onStreamCallback);

    const latency = Math.round(performance.now() - startTime);
    const totalRuns = incrementTotalRuns();

    updateStats({
      latency: latency,
      totalRuns: totalRuns
    });

    return output;

  } catch (error) {
    console.error(error);
    showError(error.message || String(error));
    return '⚠ ' + error.message;
  } finally {
    setGenerating(false);
  }
}


export function cancelCurrentDownload() {
  if (isModelLoading()) {
    cancelCurrentDownloadImpl();
  }
}

// ── State reset ───────────────────────────────────────────────────────────────
export function resetModel() {
  cancelCurrentDownload(); // Cancel any ongoing download
  resetModelState();
  setModelStatus('none');
}

export function resetStats() {
  resetTotalRuns();
  updateStats({
    totalRuns: 0,
    latency: '—'
  });
}
