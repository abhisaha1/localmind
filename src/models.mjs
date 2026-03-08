// ── Verified model registry ──────────────────────────────────────────────────
export const MODELS = {
  'text-generation': [
    {
      id: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct',
      label: 'Qwen2.5 0.5B Coder',
      size: '~800MB',
      dtype: 'q4',
      chat: true,
      note: "Alibaba's 0.5B instruction model. Good quality for size.",
      mobileDisable: true
    },
    {
      id: 'onnx-community/Qwen3-0.6B-ONNX',
      label: 'Qwen3 0.6B Instruct',
      size: '~540MB',
      dtype: 'q4f16',
      chat: true,
      note: "Alibaba's ~0.6B parameter Qwen3 model. Thinking model.",
      mobileDisable: true
    },
    {
      id: 'onnx-community/Llama-3.2-1B-Instruct-q4f16',
      label: 'Llama 3.2 1B Instruct',
      size: '~1000MB',
      dtype: 'q4f16',
      chat: true,
      note: "Meta's Llama 3.2 1B — best quality here. Larger download.",
      mobileDisable: true
    },
  ],
  'sentiment-analysis': [
    {
      id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      label: 'DistilBERT SST-2',
      size: '~250MB',
      dtype: 'fp32',
      note: 'Fast binary sentiment: POSITIVE / NEGATIVE.',
    },
    {
      id: 'Xenova/bert-base-multilingual-uncased-sentiment',
      label: 'mBERT Sentiment',
      size: '~640MB',
      dtype: 'fp32',
      note: 'Multilingual 1–5 star sentiment classifier.',
    },
  ],
  translation: [
    {
      id: 'Xenova/opus-mt-en-fr',
      label: 'EN → French',
      size: '~74MB',
      dtype: 'fp32',
      note: 'Helsinki NLP: English → French.',
    },
    {
      id: 'Xenova/opus-mt-en-de',
      label: 'EN → German',
      size: '~74MB',
      dtype: 'fp32',
      note: 'Helsinki NLP: English → German.',
    },
    {
      id: 'Xenova/opus-mt-en-es',
      label: 'EN → Spanish',
      size: '~74MB',
      dtype: 'fp32',
      note: 'Helsinki NLP: English → Spanish.',
    },
  ],
  summarization: [
    {
      id: 'Xenova/distilbart-cnn-12-6',
      label: 'DistilBART CNN',
      size: '~750MB',
      dtype: 'fp32',
      note: 'A larger version with more layers, offering a better balance between speed and quality.',
    },
    {
      id: 'Xenova/t5-base',
      label: 'T5 Base',
      size: '~530MB',
      dtype: 'fp32',
      note: 'Better summaries while remaining relatively lightweight for browsers.',
    },
    {
      id: 'Xenova/t5-small',
      label: 'T5-Small',
      size: '~120MB',
      dtype: 'fp32',
      note: 'Google T5 small. Fast and general.',
    },
  ],
  'question-answering': [
    {
      id: 'Xenova/distilbert-base-uncased-distilled-squad',
      label: 'DistilBERT SQuAD',
      size: '~250MB',
      dtype: 'fp32',
      note: 'Extractive QA. Write context in Config panel below and start asking questions.',
    },
    {
      id: 'Xenova/albert-base-squad2',
      label: 'Albert SQuAD2',
      size: '~125MB',
      dtype: 'fp32',
      note: 'More robust extractive QA. Write context in Config panel below and start asking questions.',
    },
    {
      id: 'Xenova/bert-base-uncased-squad2',
      label: 'MiniLM SQuAD2',
      size: '~125MB',
      dtype: 'fp32',
      note: 'More robust extractive QA. Write context in Config panel below and start asking questions.',
    },
  ],
  'zero-shot-classification': [
    {
      id: 'Xenova/mobilebert-uncased-mnli',
      label: 'MobileBERT MNLI',
      size: '~90MB',
      dtype: 'fp32',
      note: 'Lightweight zero-shot via NLI.',
    },
    {
      id: 'Xenova/nli-deberta-v3-small',
      label: 'DeBERTa v3 Small',
      size: '~175MB',
      dtype: 'fp32',
      note: 'Higher accuracy zero-shot.',
    },
  ],
};

export function getModelsByTask(task) {
  return MODELS[task] || [];
}

export function getModelById(task, id) {
  return getModelsByTask(task).find(model => model.id === id);
}

export function getInputPlaceholder(task) {
  return {
    'text-generation': 'Ask anything… (Shift+Enter for newline)',
    'sentiment-analysis': 'Type text to analyse…',
    // translation: 'Enter text to translate…',
    summarization: 'Paste article to summarise…',
    'question-answering': 'Ask a question (set context in Config)…',
    'zero-shot-classification': 'Enter text to classify…',
  }[task] || 'Enter text…';
}