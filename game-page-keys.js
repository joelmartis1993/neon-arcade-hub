/* =========================================================================
   game-page-keys.js — Prevents arrow/space key scrolling during gameplay
   Loaded on all game landing pages alongside game-page.css
   ========================================================================= */
(function () {
  var SCROLL_KEYS = {
    ArrowUp: true, ArrowDown: true, ArrowLeft: true, ArrowRight: true,
    ' ': true, Space: true,
    // Legacy key codes
    32: true, 37: true, 38: true, 39: true, 40: true
  };

  document.addEventListener('keydown', function (e) {
    if (SCROLL_KEYS[e.key] || SCROLL_KEYS[e.code] || SCROLL_KEYS[e.keyCode]) {
      // Only prevent if focus is NOT inside a text input / textarea / select
      var tag = (e.target || e.srcElement).tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
      }
    }
  }, { passive: false });
})();
