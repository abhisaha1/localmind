import { getInputPlaceholder, getModelById } from './models.mjs';
import {
  $,
  initializeWebGPU,
  populateModelDropdown,
  updateModelInfo,
  updateConfigPanels,
  setInputsEnabled,
} from './ui.mjs';
import {
  loadModel,
  runInference,
  resetModel,
  resetStats,
  isModelLoading,
  isModelGenerating,
  cancelCurrentDownload
} from './inference.mjs';
import { addUserMessage, addAiMessage, clearChat, showWelcomeState } from './chat.mjs';

// ── Application state ────────────────────────────────────────────────────────
let hasWebGPU = false;

// ── Application initialization ───────────────────────────────────────────────
export async function initializeApp() {
  // Initialize WebGPU detection
  hasWebGPU = await initializeWebGPU();

  // Set up initial UI state
  populateModelDropdown($('taskSelect').value);
  updateConfigPanels($('taskSelect').value);
  
  // Show welcome state initially
  showWelcomeState();

  // Bind event handlers
  bindEventHandlers();
}

// ── Event handlers ───────────────────────────────────────────────────────────
function bindEventHandlers() {
  // Task selection change
  $('taskSelect').addEventListener('change', handleTaskChange);

  // Model selection change  
  $('modelSelect').addEventListener('change', handleModelChange);

  // Load model button
  $('loadBtn').addEventListener('click', handleLoadModel);

  // Clear chat button
  $('clearBtn').addEventListener('click', handleClearChat);

  // Cancel download button
  $('cancelBtn').addEventListener('click', handleCancelDownload);

  // Send button
  $('sendBtn').addEventListener('click', handleSendMessage);

  // Input keydown (Enter to send)
  $('userInput').addEventListener('keydown', handleKeyDown);

  // Info button
  $('infoBtn').addEventListener('click', handleInfoButton);

  // Mobile sidebar toggle
  $('hamburgerBtn').addEventListener('click', toggleSidebar);
  $('sidebarOverlay').addEventListener('click', closeSidebar);
}

function handleTaskChange() {
  const task = $('taskSelect').value;
  populateModelDropdown(task);
  updateConfigPanels(task);

  // Reset model state
  resetModel();
  setInputsEnabled(false, 'Load a model first…');
}

function handleModelChange() {
  const task = $('taskSelect').value;
  updateModelInfo(task);
}

async function handleLoadModel() {
  if (isModelLoading() || isModelGenerating()) return;

  const task = $('taskSelect').value;
  const modelId = $('modelSelect').value;

  const success = await loadModel(task, modelId, hasWebGPU);
  if (success) {
    const placeholder = getInputPlaceholder(task);
    setInputsEnabled(true, placeholder);
    closeSidebar();
  }
}

function handleClearChat() {
  clearChat();
  resetStats();
}

function handleCancelDownload() {
  cancelCurrentDownload();
}

function handleInfoButton() {
  showWelcomeState();
  closeSidebar();
}

async function handleSendMessage() {
  const text = $('userInput').value.trim();
  if (!text || isModelGenerating()) return;

  const task = $('taskSelect').value;

  // Clear input and disable controls
  $('userInput').value = '';
  setInputsEnabled(false);

  // Add user message immediately
  addUserMessage(text);

  // Add AI message with appropriate streaming/progress state
  const isStreamingTask = task === 'text-generation';
  const contentEl = addAiMessage('', true);

  // Run inference with appropriate callback
  const output = await runInference(text, (content) => {
    if (isStreamingTask) {
      // For streaming tasks, update content progressively
      contentEl.textContent = content;
    } else {
      // For non-streaming tasks, show progress messages
      contentEl.textContent = content;
    }
    $('chatArea').scrollTop = 99999;
  });

  // Update final content and remove streaming class
  if (output !== null) {
    contentEl.textContent = output;
  }
  contentEl.classList.remove('streaming');

  // Re-enable controls
  const placeholder = getInputPlaceholder(task);
  setInputsEnabled(true, placeholder);
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.panel-left');
  const overlay = $('sidebarOverlay');
  const body = document.body;

  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
  body.classList.toggle('sidebar-open');
}

function closeSidebar() {
  const sidebar = document.querySelector('.panel-left');
  const overlay = $('sidebarOverlay');
  const body = document.body;

  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  body.classList.remove('sidebar-open');
}

