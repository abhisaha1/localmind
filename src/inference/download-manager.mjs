import { updateFileProgress, updateProgressHeader, clearProgressFiles, hideProgress, setModelStatus } from '../ui.mjs';
import { addSystemMessage } from '../chat.mjs';

// ── Download state ───────────────────────────────────────────────────────────
let downloadAbortController = null;
let activeDownloads = new Map(); // Track multiple file downloads per model
let currentDownloadSession = null; // Unique ID to prevent stale callbacks

// ── Download session management ──────────────────────────────────────────────
export function createDownloadSession() {
  // Cancel any existing download
  if (downloadAbortController) {
    cancelDownload();
  }

  // Create new abort controller for this download
  downloadAbortController = new AbortController();
  activeDownloads.clear();
  currentDownloadSession = Date.now() + Math.random(); // Unique session ID

  return {
    abortController: downloadAbortController,
    sessionId: currentDownloadSession
  };
}

export function isDownloadActive() {
  return downloadAbortController && !downloadAbortController.signal.aborted;
}

export function getDownloadAbortController() {
  return downloadAbortController;
}

// ── Progress callback creation ───────────────────────────────────────────────
export function createSafeProgressCallback() {
  const sessionId = currentDownloadSession; // Capture current session ID

  return (progressData) => {
    // Only update progress if this download hasn't been cancelled AND is from current session
    if (downloadAbortController &&
      !downloadAbortController.signal.aborted &&
      currentDownloadSession === sessionId) {
      handleMultiFileProgress(progressData);
    }
  };
}

// ── Multi-file progress handling ─────────────────────────────────────────────
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

// ── Download cancellation ────────────────────────────────────────────────────
export function cancelDownload() {
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
  cancelDownload();
  setModelStatus('none');
  addSystemMessage('✗ Download cancelled by user');
}

// ── Download cleanup ─────────────────────────────────────────────────────────
export function cleanupDownload() {
  downloadAbortController = null;
  activeDownloads.clear();
}