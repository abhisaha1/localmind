import { pipeline, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0/dist/transformers.min.js';
import { getModelById } from './models.mjs';
import { $, updateFileProgress, updateProgressHeader, clearProgressFiles, setModelStatus, showProgress, hideProgress, updateStats, showError, getDeviceInfo } from './ui.mjs';
import { formatDeviceString } from './device-info.mjs';
import { addSystemMessage } from './chat.mjs';

// ── State management ─────────────────────────────────────────────────────────
let currentPipeline = null;
let currentTask = null;
let isLoading = false;
let isGenerating = false;
let totalRuns = 0;

// Download management
let downloadAbortController = null;
let activeDownloads = new Map(); // Track multiple file downloads per model
let currentDownloadSession = null; // Unique ID to prevent stale callbacks

export function getCurrentPipeline() {
  return currentPipeline;
}

export function getCurrentTask() {
  return currentTask;
}

export function isModelLoading() {
  return isLoading;
}

export function isModelGenerating() {
  return isGenerating;
}

export function getTotalRuns() {
  return totalRuns;
}

// ── Model loading ──────────────────────────────────────────────────────────
export async function loadModel(task, modelId, hasWebGPU = false) {
  // Cancel any existing download
  if (isLoading) {
    cancelDownload();
  }

  if (isGenerating) return;

  isLoading = true;
  currentPipeline = null;
  currentTask = task;

  // Create new abort controller for this download
  downloadAbortController = new AbortController();
  activeDownloads.clear();
  currentDownloadSession = Date.now() + Math.random(); // Unique session ID

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

    // Use WebGPU for text generation if available
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

    // Check if download was cancelled before starting pipeline creation
    if (downloadAbortController?.signal.aborted) {
      throw new Error('Download cancelled');
    }

    currentPipeline = await pipeline(task, modelId, options);

    setModelStatus('ready');
    hideProgress();

    if (modelMeta) {
      updateStats({ modelSize: modelMeta.size });
    }

    addSystemMessage('✓ Model ready. Type below and press Enter.');
    return true;

  } catch (error) {
    console.error(error);

    // Handle cancellation differently from other errors
    if (error.message === 'Download cancelled' || downloadAbortController?.signal.aborted) {
      setModelStatus('none');
      addSystemMessage('✗ Download cancelled');
    } else {
      setModelStatus('failed');
      showError(error.message || String(error));
      addSystemMessage('✗ Failed: ' + error.message);
    }

    hideProgress();
    return false;
  } finally {
    isLoading = false;
    downloadAbortController = null;
    activeDownloads.clear();
  }
}

// ── Inference operations ─────────────────────────────────────────────────────
export async function runInference(text, onStreamCallback = null) {
  if (!currentPipeline || isGenerating || !text.trim()) {
    return null;
  }

  isGenerating = true;
  const startTime = performance.now();

  try {
    let output = '';

    if (currentTask === 'text-generation') {
      output = await runTextGeneration(text, onStreamCallback);
    } else if (currentTask === 'sentiment-analysis') {
      output = await runSentimentAnalysis(text, onStreamCallback);
    } else if (currentTask === 'translation') {
      output = await runTranslation(text, onStreamCallback);
    } else if (currentTask === 'summarization') {
      output = await runSummarization(text, onStreamCallback);
    } else if (currentTask === 'question-answering') {
      output = await runQuestionAnswering(text, onStreamCallback);
    } else if (currentTask === 'zero-shot-classification') {
      output = await runZeroShotClassification(text, onStreamCallback);
    }

    const latency = Math.round(performance.now() - startTime);
    totalRuns++;

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
    isGenerating = false;
  }
}

// ── Task-specific inference functions ────────────────────────────────────────
async function runTextGeneration(text, onStreamCallback) {
  const maxTokens = parseInt($('maxTokens').value) || 2560;
  const temperature = parseFloat($('temperature').value) || 0.7;
  const topP = parseFloat($('topP').value) || 0.9;

  const modelId = $('modelSelect').value;
  const modelMeta = getModelById(currentTask, modelId);

  const input = modelMeta?.chat
    ? [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: text },
    ]
    : text;

  let output = '';

  if (onStreamCallback) {
    const streamer = new TextStreamer(currentPipeline.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token) => {
        output += token;
        onStreamCallback(output);
      },
    });

    await currentPipeline(input, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      do_sample: temperature > 0,
      streamer,
    });
  } else {
    const result = await currentPipeline(input, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      do_sample: temperature > 0,
    });
    output = result.generated_text || result[0]?.generated_text || '';
  }

  return output || '(no output)';
}

async function runSentimentAnalysis(text, onProgressCallback) {
  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Analyzing sentiment...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const result = await currentPipeline(text);
  const item = Array.isArray(result) ? result[0] : result;
  return `${item.label}\nConfidence: ${(item.score * 100).toFixed(1)}%`;
}

async function runTranslation(text, onProgressCallback) {
  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Translating text...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const result = await currentPipeline(text);
  const item = Array.isArray(result) ? result[0] : result;
  return item.translation_text || JSON.stringify(item, null, 2);
}

async function runSummarization(text, onProgressCallback) {
  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Analyzing text...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));

    onProgressCallback('Generating summary...');
  }

  const result = await currentPipeline(text, {
    max_new_tokens: 150,
    // min_new_tokens: 20,
  });
  console.log(result)
  const item = Array.isArray(result) ? result[0] : result;
  return item.summary_text || JSON.stringify(item, null, 2);
}

async function runQuestionAnswering(text, onProgressCallback) {
  const context = $('qaContext').value.trim();
  if (!context) {
    throw new Error('Paste a context passage in the Config panel first.');
  }

  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Processing question...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));

    onProgressCallback('Finding answer...');
  }

  const result = await currentPipeline(text, context);
  console.log(result);
  return `Answer: ${result.answer}\nScore:  ${(result.score * 100).toFixed(1)}`;
}

async function runZeroShotClassification(text, onProgressCallback) {
  const labels = $('zeroShotLabels')
    .value.split(',')
    .map(l => l.trim())
    .filter(Boolean);

  if (!labels.length) {
    throw new Error('Add candidate labels in Config.');
  }

  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Analyzing text...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));

    onProgressCallback('Classifying against labels...');
  }

  const result = await currentPipeline(text, labels);
  const lines = result.labels.map(
    (label, i) => `${label.padEnd(24)}${(result.scores[i] * 100).toFixed(1)}%`
  );

  return 'LABEL                   SCORE\n' + '─'.repeat(32) + '\n' + lines.join('\n');
}

// ── Download management helpers ───────────────────────────────────────────────────
function createSafeProgressCallback() {
  const sessionId = currentDownloadSession; // Capture current session ID
  
  return (progressData) => {
    // Only update progress if this download hasn't been cancelled AND is from current session
    if (downloadAbortController && 
        !downloadAbortController.signal.aborted && 
        currentDownloadSession === sessionId) {
      console.log('Progress:', progressData); // Temporary debug log
      handleMultiFileProgress(progressData);
    }
  };
}
function handleMultiFileProgress(progressData) {
  const { status, loaded = 0, total = 0, file, progress = 0 } = progressData;

  if (!file) return;

  if (status === 'initiate') {
    // New file starting - add to tracking and create UI element
    activeDownloads.set(file, {
      loaded: 0,
      total: total || 0,
      progress: 0,
      status: 'initiate'
    });

    updateFileProgress(file, progressData);
    updateProgressHeader(activeDownloads.size);

  } else if (status === 'download') {
    // File download started
    const fileData = activeDownloads.get(file);
    if (fileData) {
      fileData.total = total || fileData.total;
      fileData.status = 'download';
    }

    updateFileProgress(file, progressData);

  } else if (status === 'progress') {
    // Update progress for specific file
    const fileData = activeDownloads.get(file);
    if (fileData) {
      fileData.loaded = loaded;
      fileData.total = total || fileData.total;
      fileData.progress = progress;
      fileData.status = 'progress';
    }

    updateFileProgress(file, progressData);

  } else if (status === 'done') {
    // File completed
    const fileData = activeDownloads.get(file);
    if (fileData) {
      fileData.loaded = fileData.total || loaded;
      fileData.progress = 100;
      fileData.status = 'done';
    }

    updateFileProgress(file, progressData);

    // Check if all files are complete
    const allComplete = Array.from(activeDownloads.values())
      .every(data => data.status === 'done');

    if (allComplete) {
      // All files completed - show final status
      setTimeout(() => {
        updateProgressHeader(0, true);
      }, 500);
    }
  }
}



function cancelDownload() {
  if (downloadAbortController) {
    downloadAbortController.abort();
    downloadAbortController = null;
  }
  activeDownloads.clear();
  currentDownloadSession = null; // Invalidate current session
  // Immediate cleanup to prevent flickering
  clearProgressFiles();
  hideProgress();
}

export function cancelCurrentDownload() {
  if (isLoading) {
    cancelDownload();
    setModelStatus('none');
    addSystemMessage('✗ Download cancelled by user');
    isLoading = false;
  }
}

// ── State reset ───────────────────────────────────────────────────────────────
export function resetModel() {
  cancelDownload(); // Cancel any ongoing download
  currentPipeline = null;
  currentTask = null;
  setModelStatus('none');
}

export function resetStats() {
  totalRuns = 0;
  updateStats({
    totalRuns: 0,
    latency: '—'
  });
}