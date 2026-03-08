import { $, escapeHtml } from './ui.mjs';

// ── Chat message management ──────────────────────────────────────────────────
export function addSystemMessage(message) {
  clearWelcomeAndEmptyState();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg';
  msgDiv.innerHTML = `
    <div class="msg-role system">SYS</div>
    <div class="msg-content" style="color:var(--muted);font-size:11px">${escapeHtml(message)}</div>
  `;
  $('chatArea').appendChild(msgDiv);
  scrollToBottom();
}

export function addUserMessage(message) {
  clearWelcomeAndEmptyState();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg';
  msgDiv.innerHTML = `
    <div class="msg-role user">YOU</div>
    <div class="msg-content">${escapeHtml(message)}</div>
  `;
  $('chatArea').appendChild(msgDiv);
  scrollToBottom();
}

export function addAiMessage(message = '', streaming = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content' + (streaming ? ' streaming' : '');
  contentDiv.textContent = message;

  msgDiv.innerHTML = `<div class="msg-role assistant">AI</div>`;
  msgDiv.appendChild(contentDiv);
  $('chatArea').appendChild(msgDiv);
  scrollToBottom();

  return contentDiv;
}

export function clearChat() {
  const chatArea = $('chatArea');
  chatArea.innerHTML = '';

  // Show welcome state when clearing chat
  showWelcomeState();
}

export function showWelcomeState() {
  const chatArea = $('chatArea');
  chatArea.innerHTML = createWelcomeStateHTML();
}

export function showEmptyState() {
  const chatArea = $('chatArea');
  chatArea.innerHTML = createEmptyStateHTML();
}

// ── Helper functions ─────────────────────────────────────────────────────────
function clearWelcomeAndEmptyState() {
  // Remove any welcome/empty state elements when starting chat
  const chatArea = $('chatArea');
  const welcomeState = chatArea.querySelector('.welcome-state');
  const emptyState = chatArea.querySelector('.empty-state');
  if (welcomeState) welcomeState.remove();
  if (emptyState) emptyState.remove();
}

function createWelcomeStateHTML() {
  return `
    <div class="welcome-state">
      <div class="welcome-header">
        <p class="welcome-subtitle">
          Run AI models locally in your browser
        </p>
      </div>
      
      <div class="welcome-content">
        <div class="welcome-section">
          <h2>What is this?</h2>
          <p>
            Run AI models completely locally in your browser. No data
            leaves your device — everything runs client-side using
            Transformers.js and WebGPU.
          </p>
          <div class="task-list">
            <div class="task-item">
              <strong>- Text Generation</strong> - Chat with AI, creative
              writing, code completion
            </div>
            <div class="task-item">
              <strong>- Sentiment Analysis</strong> - Detect if text is positive,
              negative, or neutral
            </div>
            <div class="task-item">
              <strong>- Summarization</strong> - Create concise summaries of
              longer texts
            </div>
            <div class="task-item">
              <strong>- Question Answering</strong> - Answer questions based on
              provided context
            </div>
            <div class="task-item">
              <strong>- Zero-Shot Classification</strong> - Classify text into
              custom categories
            </div>
          </div>
        </div>
        
        <div class="welcome-section">
          <h2>How to use</h2>
          <ol>
            <li>Select a task and model</li>
            <li>
              Click
              <strong style="color: var(--accent)">LOAD MODEL</strong>
            </li>
            <li>Start chatting</li>
          </ol>
        </div>
      </div>
    </div>
  `;
}

function createEmptyStateHTML() {
  return `
    <div class="empty-state">
      <div class="empty-icon">⬡</div>
      <p>
        Choose a task + model,<br />click
        <strong style="color: var(--accent)">LOAD MODEL</strong
        >.<br /><br />First load downloads the model<br />(cached in
        browser after that).<br />Everything runs locally — no server.
      </p>
    </div>
  `;
}

function scrollToBottom() {
  $('chatArea').scrollTop = 99999;
}