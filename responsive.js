/**
 * responsive.js — Centralized responsive utility for Neon Arcade
 * Handles mobile detection, vibration, fullscreen, orientation, and performance tiers.
 */
const Responsive = (() => {
  // --- Device Detection ---
  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches && isTouchDevice();
  }

  function isTablet() {
    return window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches && isTouchDevice();
  }

  function isSmallPhone() {
    return window.matchMedia('(max-width: 480px)').matches;
  }

  // --- Performance Tier ---
  // Classifies device capability to gate expensive effects
  function getPerformanceTier() {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4; // GB, Chrome-only API
    
    if (cores <= 2 || memory <= 2) return 'low';
    if (cores <= 4 || memory <= 4) return 'mid';
    return 'high';
  }

  // --- Vibration API ---
  function vibrate(pattern) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) { /* silently fail on unsupported */ }
    }
  }

  // --- Fullscreen API (cross-browser) ---
  function requestFullscreen(element) {
    const el = element || document.documentElement;
    const rfs = el.requestFullscreen
      || el.webkitRequestFullscreen
      || el.mozRequestFullScreen
      || el.msRequestFullscreen;
    if (rfs) {
      rfs.call(el).catch(() => {});
    }
  }

  function exitFullscreen() {
    const efs = document.exitFullscreen
      || document.webkitExitFullscreen
      || document.mozCancelFullScreen
      || document.msExitFullscreen;
    if (efs && isFullscreen()) {
      efs.call(document).catch(() => {});
    }
  }

  function isFullscreen() {
    return !!(document.fullscreenElement
      || document.webkitFullscreenElement
      || document.mozFullScreenElement
      || document.msFullscreenElement);
  }

  function toggleFullscreen(element) {
    if (isFullscreen()) {
      exitFullscreen();
    } else {
      requestFullscreen(element);
    }
  }

  function onFullscreenChange(callback) {
    document.addEventListener('fullscreenchange', callback);
    document.addEventListener('webkitfullscreenchange', callback);
    document.addEventListener('mozfullscreenchange', callback);
    document.addEventListener('MSFullscreenChange', callback);
  }

  // --- Orientation Change Handler (debounced) ---
  let orientationTimeout = null;
  function onOrientationChange(callback) {
    const handler = () => {
      clearTimeout(orientationTimeout);
      orientationTimeout = setTimeout(() => {
        callback();
      }, 150);
    };
    window.addEventListener('orientationchange', handler);
    window.addEventListener('resize', handler);
  }

  // --- Canvas Fit Utility ---
  // Adjusts the CSS display size of a canvas to fit its container
  // while maintaining the internal resolution (canvas.width/height stay fixed)
  function fitCanvasToContainer(canvas) {
    const container = canvas.parentElement;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const canvasAspect = canvas.width / canvas.height;
    const containerAspect = containerW / containerH;

    let displayW, displayH;
    if (containerAspect > canvasAspect) {
      // Container is wider — fit by height
      displayH = containerH;
      displayW = containerH * canvasAspect;
    } else {
      // Container is taller — fit by width
      displayW = containerW;
      displayH = containerW / canvasAspect;
    }

    canvas.style.width = Math.floor(displayW) + 'px';
    canvas.style.height = Math.floor(displayH) + 'px';
  }

  // --- Prevent Bounce / Pull-to-refresh on iOS ---
  function preventOverscroll() {
    document.body.addEventListener('touchmove', (e) => {
      // Only prevent if the target is not inside a scrollable element
      if (!e.target.closest('.achievements-grid')) {
        // Don't prevent on scrollable containers
      }
    }, { passive: true });
  }

  // --- Apply Mobile Body Class ---
  function applyDeviceClasses() {
    const body = document.body;
    if (isTouchDevice()) body.classList.add('touch-device');
    if (isMobile()) body.classList.add('is-mobile');
    if (isTablet()) body.classList.add('is-tablet');
    if (isSmallPhone()) body.classList.add('is-small-phone');
    
    const tier = getPerformanceTier();
    body.dataset.perfTier = tier;
  }

  // Initialize on load
  function init() {
    applyDeviceClasses();
    preventOverscroll();

    // Re-apply on resize (orientation change can toggle mobile/tablet)
    onOrientationChange(() => {
      document.body.classList.remove('is-mobile', 'is-tablet', 'is-small-phone');
      applyDeviceClasses();
    });
  }

  return {
    isTouchDevice,
    isMobile,
    isTablet,
    isSmallPhone,
    getPerformanceTier,
    vibrate,
    requestFullscreen,
    exitFullscreen,
    isFullscreen,
    toggleFullscreen,
    onFullscreenChange,
    onOrientationChange,
    fitCanvasToContainer,
    init
  };
})();

window.Responsive = Responsive;
