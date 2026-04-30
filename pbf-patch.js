/* pbf-patch.js v1 — Decision Inputs panel */
(function () {
  'use strict';

  var FIELDS = ['pdh','pdl','onh','onl','rth','poc','vah','val','pwh','orb-h','orb-l','ema200'];
  var LS_KEY = 'pbf-decision-inputs';

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      FIELDS.forEach(function (f) {
        var el = document.getElementById('di-' + f);
        if (el && saved[f] != null) el.value = saved[f];
      });
    } catch (e) {}
  }

  function apply() {
    var vals = {};
    FIELDS.forEach(function (f) {
      var el = document.getElementById('di-' + f);
      if (el && el.value !== '') vals[f] = parseFloat(el.value);
    });
    localStorage.setItem(LS_KEY, JSON.stringify(vals));
    window.dispatchEvent(new CustomEvent('pbf-levels-applied', { detail: vals }));
    var btn = document.getElementById('di-apply-btn');
    if (btn) {
      btn.textContent = 'Applied ✓';
      btn.classList.add('applied');
      setTimeout(function () {
        btn.textContent = 'Apply Levels';
        btn.classList.remove('applied');
      }, 2000);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    load();
    var btn = document.getElementById('di-apply-btn');
    if (btn) btn.addEventListener('click', apply);
  });
})();
