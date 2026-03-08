// ── State management ─────────────────────────────────────────────────────────
let currentPipeline = null;
let currentTask = null;
let isLoading = false;
let isGenerating = false;
let totalRuns = 0;

// ── State getters ────────────────────────────────────────────────────────────
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

// ── State setters ────────────────────────────────────────────────────────────
export function setCurrentPipeline(pipeline) {
  currentPipeline = pipeline;
}

export function setCurrentTask(task) {
  currentTask = task;
}

export function setLoading(loading) {
  isLoading = loading;
}

export function setGenerating(generating) {
  isGenerating = generating;
}

export function incrementTotalRuns() {
  totalRuns++;
  return totalRuns;
}

export function resetTotalRuns() {
  totalRuns = 0;
}

// ── State reset ─────────────────────────────────────────────────────────────
export function resetModelState() {
  currentPipeline = null;
  currentTask = null;
}

export function resetAllState() {
  currentPipeline = null;
  currentTask = null;
  isLoading = false;
  isGenerating = false;
  totalRuns = 0;
}