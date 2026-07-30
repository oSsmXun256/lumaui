/* ============================================================
   LumaUI v1.4 — lumaui.js
   Dropdown / Drawer / ThemeToggle / Modal / Tabs / Accordion / Toast
   キーボード操作: Arrow / Home / End / Esc / Tab Trap
   ============================================================ */
(function (global) {
  'use strict';

  function trapFocus(container, e) {
    var focusables = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Dropdown ---------- */
  var Dropdown = {
    init: function (root) {
      var trigger = root.querySelector('.luma-dropdown__trigger');
      var list = root.querySelector('.luma-dropdown__list');
      var items = Array.prototype.slice.call(root.querySelectorAll('.luma-dropdown__item'));
      if (!trigger || !list) return;

      function open() {
        root.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        var active = root.querySelector('.luma-dropdown__item--selected') || items[0];
        if (active) { active.setAttribute('tabindex', '0'); active.focus(); }
      }
      function close(focusTrigger) {
        root.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        if (focusTrigger) trigger.focus();
      }
      function toggle() { root.classList.contains('is-open') ? close() : open(); }

      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', toggle);

      items.forEach(function (item, i) {
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '-1');
        item.addEventListener('click', function () {
          items.forEach(function (it) { it.classList.remove('luma-dropdown__item--selected'); });
          item.classList.add('luma-dropdown__item--selected');
          close(true);
          root.dispatchEvent(new CustomEvent('luma:change', { detail: { value: item.dataset.value, item: item } }));
        });
        item.addEventListener('keydown', function (e) {
          var idx = items.indexOf(item);
          if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0]).focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1]).focus(); }
          else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
          else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
          else if (e.key === 'Escape') { e.preventDefault(); close(true); }
        });
      });

      document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) close();
      });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && root.classList.contains('is-open')) close(true);
      });
    },
    initAll: function () {
      document.querySelectorAll('.luma-dropdown').forEach(Dropdown.init);
    }
  };

  /* ---------- Drawer / Mobile Nav ---------- */
  var Drawer = {
    initAll: function () {
      var nav = document.querySelector('.luma-nav--side');
      var overlay = document.querySelector('.luma-overlay');
      var openBtn = document.querySelector('[data-luma-drawer-open]');
      var closeBtn = document.getElementById('menuCloseBtn');
      if (!nav) return;

      function open() {
        nav.classList.add('is-open');
        if (overlay) overlay.classList.add('is-visible');
        document.addEventListener('keydown', onKeydown);
        var first = nav.querySelector('a, button');
        if (first) first.focus();
      }
      function close() {
        nav.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-visible');
        document.removeEventListener('keydown', onKeydown);
        if (openBtn) openBtn.focus();
      }
      function onKeydown(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'Tab') trapFocus(nav, e);
      }

      if (openBtn) openBtn.addEventListener('click', open);
      if (closeBtn) closeBtn.addEventListener('click', close);
      if (overlay) overlay.addEventListener('click', close);
    }
  };

  /* ---------- Theme Toggle ---------- */
  var ThemeToggle = {
    initAll: function () {
      document.querySelectorAll('[data-luma-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var current = document.documentElement.getAttribute('data-theme');
          var next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          try { localStorage.setItem('luma-theme', next); } catch (e) {}
        });
      });
      try {
        var saved = localStorage.getItem('luma-theme');
        if (saved) document.documentElement.setAttribute('data-theme', saved);
      } catch (e) {}
    }
  };

  /* ---------- Modal ---------- */
  var Modal = {
    open: function (id) {
      var backdrop = document.getElementById(id);
      if (!backdrop) return;
      backdrop.classList.add('is-open');
      var modal = backdrop.querySelector('.luma-modal');
      document.addEventListener('keydown', onKeydown);
      var first = modal && modal.querySelector('a, button, input, select, textarea');
      if (first) first.focus();

      function onKeydown(e) {
        if (e.key === 'Escape') Modal.close(id);
        else if (e.key === 'Tab' && modal) trapFocus(modal, e);
      }
      backdrop._onKeydown = onKeydown;
    },
    close: function (id) {
      var backdrop = document.getElementById(id);
      if (!backdrop) return;
      backdrop.classList.remove('is-open');
      if (backdrop._onKeydown) document.removeEventListener('keydown', backdrop._onKeydown);
    },
    initAll: function () {
      document.querySelectorAll('[data-luma-modal-open]').forEach(function (btn) {
        btn.addEventListener('click', function () { Modal.open(btn.getAttribute('data-luma-modal-open')); });
      });
      document.querySelectorAll('[data-luma-modal-close]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var backdrop = btn.closest('.luma-modal-backdrop');
          if (backdrop) Modal.close(backdrop.id);
        });
      });
      document.querySelectorAll('.luma-modal-backdrop').forEach(function (backdrop) {
        backdrop.addEventListener('click', function (e) { if (e.target === backdrop) Modal.close(backdrop.id); });
      });
    }
  };

  /* ---------- Tabs ---------- */
  var Tabs = {
    init: function (root) {
      var tabs = Array.prototype.slice.call(root.querySelectorAll('.luma-tabs__item'));
      var suppressClick = false;
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.setAttribute('tabindex', selected ? '0' : '-1');
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !selected;
        });
        if (focus) tab.focus();
      }
      tabs.forEach(function (tab, i) {
        tab.setAttribute('role', 'tab');
        tab.addEventListener('click', function (e) {
          if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
          select(tab);
        });
        tab.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); }
          else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
          else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
        });
      });

      /* スワイプ / ドラッグでのタブ切替（オーバーフローしていない場合のみ） */
      var startX = null, startY = null, dragging = false, moved = false;
      var SWIPE_THRESHOLD = 40;
      root.addEventListener('pointerdown', function (e) {
        if (root.scrollWidth > root.clientWidth) return; // 横スクロール中はネイティブ挙動を優先
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        startX = e.clientX; startY = e.clientY; dragging = true; moved = false;
      });
      root.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
      });
      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        if (!moved) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        var current = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
        if (current === -1) current = 0;
        var next = dx < 0 ? Math.min(tabs.length - 1, current + 1) : Math.max(0, current - 1);
        suppressClick = true;
        if (next !== current) select(tabs[next]); else suppressClick = false;
      }
      root.addEventListener('pointerup', endDrag);
      root.addEventListener('pointercancel', function () { dragging = false; });
    },
    initAll: function () { document.querySelectorAll('.luma-tabs').forEach(Tabs.init); }
  };

  /* ---------- Accordion ---------- */
  var Accordion = {
    init: function (item) {
      var trigger = item.querySelector('.luma-accordion__trigger');
      var panel = item.querySelector('.luma-accordion__panel');
      if (!trigger || !panel) return;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', function () {
        var open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.style.maxHeight = open ? '0px' : panel.scrollHeight + 'px';
      });
    },
    initAll: function () { document.querySelectorAll('.luma-accordion__item').forEach(Accordion.init); }
  };

  /* ---------- Toast ---------- */
  var Toast = {
    region: null,
    collapseBar: null,
    STACK_THRESHOLD: 4,
    ensureRegion: function () {
      if (Toast.region) return Toast.region;
      var region = document.querySelector('.luma-toast-region');
      if (!region) {
        region = document.createElement('div');
        region.className = 'luma-toast-region';
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        document.body.appendChild(region);
      }
      Toast.region = region;
      var bar = region.querySelector('.luma-toast-region__collapse');
      if (!bar) {
        bar = document.createElement('button');
        bar.type = 'button';
        bar.className = 'luma-toast-region__collapse';
        bar.textContent = '▲ たたむ';
        bar.addEventListener('click', function () {
          region.classList.remove('is-expanded');
          Toast.updateStack();
        });
        region.insertBefore(bar, region.firstChild);
      }
      Toast.collapseBar = bar;
      return region;
    },
    updateStack: function () {
      var region = Toast.region;
      if (!region) return;
      var toasts = Array.prototype.slice.call(region.querySelectorAll('.luma-toast'));
      var count = toasts.length;
      toasts.forEach(function (el) {
        el.classList.remove('is-stack-lid', 'is-collapsed');
        el.onclick = null;
        var badge = el.querySelector('.luma-toast__stack-badge');
        if (badge) badge.remove();
      });
      if (count <= Toast.STACK_THRESHOLD) {
        region.classList.remove('is-stacked', 'is-expanded');
        return;
      }
      region.classList.add('is-stacked');
      if (region.classList.contains('is-expanded')) return;
      var lidIndex = Toast.STACK_THRESHOLD - 1;
      var hiddenCount = count - Toast.STACK_THRESHOLD;
      toasts.forEach(function (el, i) { if (i >= Toast.STACK_THRESHOLD) el.classList.add('is-collapsed'); });
      var lid = toasts[lidIndex];
      lid.classList.add('is-stack-lid');
      var badge = document.createElement('span');
      badge.className = 'luma-toast__stack-badge';
      badge.textContent = '+' + hiddenCount;
      lid.appendChild(badge);
      lid.onclick = function () {
        region.classList.add('is-expanded');
        Toast.updateStack();
      };
    },
    show: function (message, opts) {
      opts = opts || {};
      var region = Toast.ensureRegion();
      var toast = document.createElement('div');
      toast.className = 'luma-toast' + (opts.type ? ' luma-toast--' + opts.type : '');
      toast.innerHTML = '<span>' + message + '</span><button class="luma-toast__close" aria-label="閉じる">×</button>';
      var firstExisting = region.querySelector('.luma-toast');
      if (firstExisting) region.insertBefore(toast, firstExisting);
      else region.appendChild(toast);
      Toast.updateStack();

      var dismissed = false;
      var dismiss = function () {
        if (dismissed) return;
        dismissed = true;
        clearTimeout(timer);
        if (toast.offsetParent === null) { toast.remove(); Toast.updateStack(); return; }
        toast.classList.add('is-leaving');
        toast.addEventListener('animationend', function () {
          toast.remove();
          Toast.updateStack();
        }, { once: true });
      };
      var timer = setTimeout(dismiss, opts.duration || 4000);
      toast.querySelector('.luma-toast__close').addEventListener('click', function (e) {
        e.stopPropagation();
        dismiss();
      });
      return toast;
    }
  };

  /* ---------- Boot ---------- */
  function initAll() {
    Dropdown.initAll();
    Drawer.initAll();
    ThemeToggle.initAll();
    Modal.initAll();
    Tabs.initAll();
    Accordion.initAll();
    Toast.ensureRegion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  global.LumaUI = { Dropdown: Dropdown, Drawer: Drawer, ThemeToggle: ThemeToggle, Modal: Modal, Tabs: Tabs, Accordion: Accordion, Toast: Toast, initAll: initAll };
})(window);
