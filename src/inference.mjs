import { pipeline, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0/dist/transformers.min.js';
import { getModelById } from './models.mjs';
import { $, updateProgress, setModelStatus, showProgress, hideProgress, updateStats, showError } from './ui.mjs';
import { addSystemMessage } from './chat.mjs';

// ── State management ─────────────────────────────────────────────────────────
let currentPipeline = null;
let currentTask = null;
let isLoading = false;
let isGenerating = false;
let totalRuns = 0;

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

// ── Model loading ────────────────────────────────────────────────────────────
export async function loadModel(task, modelId, hasWebGPU = false) {
  if (isLoading || isGenerating) return;

  isLoading = true;
  currentPipeline = null;
  currentTask = task;

  const modelMeta = getModelById(task, modelId);

  setModelStatus('loading');
  showProgress();

  addSystemMessage(`Loading ${modelId}\n${modelMeta?.size || ''} · dtype:${modelMeta?.dtype || 'auto'}`);

  try {
    const options = {
      dtype: modelMeta?.dtype || 'fp32',
      progress_callback: updateProgress,
    };

    // Use WebGPU for text generation if available
    if (hasWebGPU && task === 'text-generation') {
      options.device = 'webgpu';
      updateStats({ device: 'GPU' });
    } else {
      updateStats({ device: 'CPU/WASM' });
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
    setModelStatus('failed');
    hideProgress();
    showError(error.message || String(error));
    addSystemMessage('✗ Failed: ' + error.message);
    return false;
  } finally {
    isLoading = false;
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
      output = await runSentimentAnalysis(text);
    } else if (currentTask === 'translation') {
      output = await runTranslation(text);
    } else if (currentTask === 'summarization') {
      output = await runSummarization(text, onStreamCallback);
    } else if (currentTask === 'question-answering') {
      output = await runQuestionAnswering(text);
    } else if (currentTask === 'zero-shot-classification') {
      output = await runZeroShotClassification(text);
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

async function runSentimentAnalysis(text) {
  const result = await currentPipeline(text);
  const item = Array.isArray(result) ? result[0] : result;
  return `${item.label}\nConfidence: ${(item.score * 100).toFixed(1)}%`;
}

async function runTranslation(text) {
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
    min_new_tokens: 20,
  });
  
  const item = Array.isArray(result) ? result[0] : result;
  return item.summary_text || JSON.stringify(item, null, 2);
}

async function runQuestionAnswering(text) {
  const context = $('qaContext').value.trim();
  if (!context) {
    throw new Error('Paste a context passage in the Config panel first.');
  }

  const result = await currentPipeline(text, context);
  console.log(result);
  return `Answer: ${result.answer}\nScore:  ${(result.score * 100).toFixed(1)}`;
}

async function runZeroShotClassification(text) {
  const labels = $('zeroShotLabels')
    .value.split(',')
    .map(l => l.trim())
    .filter(Boolean);

  if (!labels.length) {
    throw new Error('Add candidate labels in Config.');
  }

  const result = await currentPipeline(text, labels);
  const lines = result.labels.map(
    (label, i) => `${label.padEnd(24)}${(result.scores[i] * 100).toFixed(1)}%`
  );

  return 'LABEL                   SCORE\n' + '─'.repeat(32) + '\n' + lines.join('\n');
}

// ── State reset ──────────────────────────────────────────────────────────────
export function resetModel() {
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