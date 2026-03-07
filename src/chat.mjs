import { $, escapeHtml } from './ui.mjs';

// ── Chat message management ──────────────────────────────────────────────────
export function addSystemMessage(message) {
  hideEmptyState();
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
  hideEmptyState();
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
  const emptyState = $('emptyState');
  
  chatArea.innerHTML = '';
  chatArea.appendChild(emptyState);
  emptyState.style.display = '';
}

// ── Helper functions ─────────────────────────────────────────────────────────
function hideEmptyState() {
  $('emptyState').style.display = 'none';
}

function scrollToBottom() {
  $('chatArea').scrollTop = 99999;
}