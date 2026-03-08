// ── Device Information Detection ────────────────────────────────────────────
//
// This module provides comprehensive device information including:
// - CPU details (cores, architecture)
// - GPU information (via WebGPU when available)
// - WebGPU adapter details
// - Fallback device detection

// ── CPU Information ──────────────────────────────────────────────────────────
function getCPUInfo() {
  const cores = navigator.hardwareConcurrency || 'Unknown';
  
  // Try to detect CPU architecture from user agent
  let architecture = 'Unknown';
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('arm') || userAgent.includes('aarch64')) {
    architecture = 'ARM64';
  } else if (userAgent.includes('x86_64') || userAgent.includes('x64')) {
    architecture = 'x64';
  } else if (userAgent.includes('i386') || userAgent.includes('x86')) {
    architecture = 'x86';
  }
  
  // Detect platform for better context
  let platform = 'Unknown';
  if (userAgent.includes('mac')) {
    platform = 'macOS';
  } else if (userAgent.includes('windows')) {
    platform = 'Windows';
  } else if (userAgent.includes('linux')) {
    platform = 'Linux';
  } else if (userAgent.includes('android')) {
    platform = 'Android';
  } else if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    platform = 'iOS';
  }
  
  return {
    cores,
    architecture,
    platform
  };
}

// ── WebGPU Information ───────────────────────────────────────────────────────
async function getWebGPUInfo() {
  if (!navigator.gpu) {
    return {
      available: false,
      adapter: null,
      device: null,
      info: null
    };
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        adapter: null,
        device: null,
        info: null
      };
    }
    
    // Get adapter info if available (experimental feature)
    let adapterInfo = null;
    try {
      if (adapter.info) {
        adapterInfo = {
          vendor: adapter.info.vendor || 'Unknown',
          architecture: adapter.info.architecture || 'Unknown',
          device: adapter.info.device || 'Unknown',
          description: adapter.info.description || 'Unknown'
        };
      }
    } catch (e) {
      // Adapter info might not be available in all browsers
      console.log('Adapter info not available:', e);
    }
    
    // Get adapter limits for additional context
    const limits = adapter.limits;
    
    return {
      available: true,
      adapter,
      info: adapterInfo,
      limits: {
        maxBufferSize: limits.maxBufferSize || 'Unknown',
        maxComputeWorkgroupStorageSize: limits.maxComputeWorkgroupStorageSize || 'Unknown',
        maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize || 'Unknown'
      }
    };
  } catch (error) {
    console.error('WebGPU detection error:', error);
    return {
      available: false,
      adapter: null,
      device: null,
      info: null,
      error: error.message
    };
  }
}

// ── Canvas/WebGL GPU Information ─────────────────────────────────────────────
function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { available: false };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let renderer = 'Unknown';
    let vendor = 'Unknown';
    
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
    }
    
    return {
      available: true,
      renderer,
      vendor,
      version: gl.getParameter(gl.VERSION) || 'Unknown',
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || 'Unknown'
    };
  } catch (error) {
    console.error('WebGL detection error:', error);
    return { available: false, error: error.message };
  }
}

// ── Memory Information ───────────────────────────────────────────────────────
function getMemoryInfo() {
  try {
    if (performance.memory) {
      return {
        available: true,
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
  } catch (error) {
    console.error('Memory info error:', error);
  }
  
  return { available: false };
}

// ── Main Device Detection Function ───────────────────────────────────────────
export async function detectDeviceInfo() {
  console.log('🔍 Detecting device information...');
  
  const cpuInfo = getCPUInfo();
  const webgpuInfo = await getWebGPUInfo();
  const webglInfo = getWebGLInfo();
  const memoryInfo = getMemoryInfo();
  
  // Determine the best available compute device
  let computeDevice = 'CPU/WASM';
  let deviceDetails = `${cpuInfo.cores} cores`;
  
  if (webgpuInfo.available) {
    computeDevice = 'WebGPU';
    
    if (webgpuInfo.info) {
      // Use WebGPU adapter info if available
      const vendor = webgpuInfo.info.vendor;
      const device = webgpuInfo.info.device;
      
      if (vendor && vendor !== 'Unknown') {
        deviceDetails = vendor;
        if (device && device !== 'Unknown') {
          deviceDetails += ` ${device}`;
        }
      }
    } else if (webglInfo.available && webglInfo.renderer !== 'Unknown') {
      // Fallback to WebGL renderer info
      deviceDetails = webglInfo.renderer;
    }
  } else if (webglInfo.available && webglInfo.renderer !== 'Unknown') {
    // WebGL available but not WebGPU
    computeDevice = 'WebGL';
    deviceDetails = webglInfo.renderer;
  }
  
  const deviceInfo = {
    compute: {
      device: computeDevice,
      details: deviceDetails
    },
    cpu: cpuInfo,
    webgpu: webgpuInfo,
    webgl: webglInfo,
    memory: memoryInfo,
    summary: {
      platform: cpuInfo.platform,
      cores: cpuInfo.cores,
      architecture: cpuInfo.architecture,
      hasWebGPU: webgpuInfo.available,
      hasWebGL: webglInfo.available
    }
  };
  
  console.log('📊 Device info detected:', deviceInfo);
  return deviceInfo;
}

// ── Formatted Device String for UI ──────────────────────────────────────────
export function formatDeviceString(deviceInfo, mode = 'compact') {
  if (!deviceInfo) return 'Unknown';
  
  const { compute, cpu } = deviceInfo;
  
  if (mode === 'compact') {
    // For the stats gauge - keep it short
    return compute.device === 'CPU/WASM' 
      ? `CPU (${cpu.cores}c)` 
      : compute.device;
  } else if (mode === 'detailed') {
    // For detailed display
    return `${compute.device} • ${compute.details} • ${cpu.cores} cores`;
  }
  
  return compute.device;
}

// ── Detailed Device Info Display ──────────────────────────────────────────────────────────────
export function logDeviceDetails(deviceInfo) {
  if (!deviceInfo) {
    console.log('💻 Device Info: Not available');
    return;
  }
  
  console.group('💻 Device Information');
  
  // Platform and CPU
  console.log(`🖥️ Platform: ${deviceInfo.cpu.platform}`);
  console.log(`⚙️ CPU: ${deviceInfo.cpu.cores} cores (${deviceInfo.cpu.architecture})`);
  
  // Memory
  if (deviceInfo.memory.available) {
    console.log(`🧠 Memory: ${deviceInfo.memory.usedJSHeapSize}MB used / ${deviceInfo.memory.jsHeapSizeLimit}MB limit`);
  }
  
  // WebGPU
  if (deviceInfo.webgpu.available) {
    console.log('✅ WebGPU: Available');
    if (deviceInfo.webgpu.info) {
      console.log(`  💾 GPU: ${deviceInfo.webgpu.info.vendor} ${deviceInfo.webgpu.info.device}`);
    }
  } else {
    console.log('❌ WebGPU: Not available');
    if (deviceInfo.webgpu.error) {
      console.log(`  Error: ${deviceInfo.webgpu.error}`);
    }
  }
  
  // WebGL fallback
  if (deviceInfo.webgl.available) {
    console.log(`🎨 WebGL: ${deviceInfo.webgl.renderer} (${deviceInfo.webgl.vendor})`);
  } else {
    console.log('❌ WebGL: Not available');
  }
  
  // Compute preference
  console.log(`🎯 Compute: ${deviceInfo.compute.device} - ${deviceInfo.compute.details}`);
  
  console.groupEnd();
}

// ── Export for backward compatibility ────────────────────────────────────────────────────────────────────────
export { getCPUInfo, getWebGPUInfo, getWebGLInfo, getMemoryInfo };
