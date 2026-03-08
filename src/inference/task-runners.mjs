import { TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0/dist/transformers.min.js';
import { getModelById } from '../models.mjs';
import { $ } from '../ui.mjs';
import { getCurrentPipeline, getCurrentTask } from './state.mjs';

// ── Task-specific inference functions ────────────────────────────────────────
export async function runTextGeneration(text, onStreamCallback) {
  const maxTokens = parseInt($('maxTokens').value) || 2560;
  const temperature = parseFloat($('temperature').value) || 0.7;
  const topP = parseFloat($('topP').value) || 0.9;

  const modelId = $('modelSelect').value;
  const modelMeta = getModelById(getCurrentTask(), modelId);

  const input = modelMeta?.chat
    ? [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: text },
    ]
    : text;

  let output = '';
  const pipeline = getCurrentPipeline();

  if (onStreamCallback) {
    const streamer = new TextStreamer(pipeline.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token) => {
        output += token;
        onStreamCallback(output);
      },
    });

    await pipeline(input, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      do_sample: temperature > 0,
      streamer,
    });
  } else {
    const result = await pipeline(input, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      do_sample: temperature > 0,
    });
    output = result.generated_text || result[0]?.generated_text || '';
  }

  return output || '(no output)';
}

export async function runSentimentAnalysis(text, onProgressCallback) {
  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Analyzing sentiment...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const pipeline = getCurrentPipeline();
  const result = await pipeline(text);
  const item = Array.isArray(result) ? result[0] : result;
  return `${item.label}\nConfidence: ${(item.score * 100).toFixed(1)}%`;
}

export async function runTranslation(text, onProgressCallback) {
  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Translating text...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const pipeline = getCurrentPipeline();
  const result = await pipeline(text);
  const item = Array.isArray(result) ? result[0] : result;
  return item.translation_text || JSON.stringify(item, null, 2);
}

export async function runSummarization(text, onProgressCallback) {
  // Show progress indicator if callback provided
  if (onProgressCallback) {
    onProgressCallback('Analyzing text...');

    // Add a small delay to show the progress message
    await new Promise(resolve => setTimeout(resolve, 100));

    onProgressCallback('Generating summary...');
  }

  const pipeline = getCurrentPipeline();
  const result = await pipeline(text, {
    max_new_tokens: 150,
    // min_new_tokens: 20,
  });
  console.log(result)
  const item = Array.isArray(result) ? result[0] : result;
  return item.summary_text || JSON.stringify(item, null, 2);
}

export async function runQuestionAnswering(text, onProgressCallback) {
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

  const pipeline = getCurrentPipeline();
  const result = await pipeline(text, context);
  console.log(result);
  return `Answer: ${result.answer}\nScore:  ${(result.score * 100).toFixed(1)}`;
}

export async function runZeroShotClassification(text, onProgressCallback) {
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

  const pipeline = getCurrentPipeline();
  const result = await pipeline(text, labels);
  const lines = result.labels.map(
    (label, i) => `${label.padEnd(24)}${(result.scores[i] * 100).toFixed(1)}%`
  );

  return 'LABEL                   SCORE\n' + '─'.repeat(32) + '\n' + lines.join('\n');
}

// ── Task router ──────────────────────────────────────────────────────────────
export async function runTaskSpecificInference(task, text, onStreamCallback = null) {
  switch (task) {
    case 'text-generation':
      return await runTextGeneration(text, onStreamCallback);
    case 'sentiment-analysis':
      return await runSentimentAnalysis(text, onStreamCallback);
    case 'translation':
      return await runTranslation(text, onStreamCallback);
    case 'summarization':
      return await runSummarization(text, onStreamCallback);
    case 'question-answering':
      return await runQuestionAnswering(text, onStreamCallback);
    case 'zero-shot-classification':
      return await runZeroShotClassification(text, onStreamCallback);
    default:
      throw new Error(`Unknown task: ${task}`);
  }
}