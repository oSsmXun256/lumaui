/* ============================================================
   LumaUI v1.5 — lumaui.js
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
      if (root.getAttribute('data-luma-dropdown-ready') === 'true') return;
      var trigger = root.querySelector('.luma-dropdown__trigger');
      var list = root.querySelector('.luma-dropdown__list');
      var items = Array.prototype.slice.call(root.querySelectorAll('.luma-dropdown__item'));
      if (!trigger || !list) return;
      root.setAttribute('data-luma-dropdown-ready', 'true');
      var multiple = root.getAttribute('data-multiple') === 'true';
      var search = root.querySelector('.luma-multiselect__search');
      var clear = root.querySelector('.luma-multiselect__clear');
      var selectedArea = root.querySelector('.luma-multiselect__selected');

      function selectedItems() {
        return items.filter(function (item) { return item.classList.contains('luma-dropdown__item--selected'); });
      }
      function updateMultiple() {
        if (!multiple) return;
        var selected = selectedItems();
        var valueEl = trigger.querySelector('.luma-dropdown__value');
        if (valueEl) valueEl.textContent = selected.length ? selected.length + '件選択中' : (root.dataset.placeholder || '選択してください');
        root.dataset.values = JSON.stringify(selected.map(function (item) { return item.dataset.value; }));
        if (selectedArea) {
          selectedArea.replaceChildren();
          selected.forEach(function (item) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'luma-multiselect__chip';
            chip.dataset.removeValue = item.dataset.value;
            var label = document.createElement('span');
            label.textContent = item.textContent.trim();
            var close = document.createElement('span');
            close.textContent = '×';
            close.setAttribute('aria-hidden', 'true');
            chip.appendChild(label);
            chip.appendChild(close);
            selectedArea.appendChild(chip);
          });
        }
      }
      function emitMultipleChange() {
        var selected = selectedItems();
        updateMultiple();
        root.dispatchEvent(new CustomEvent('luma:change', { detail: { values: selected.map(function (item) { return item.dataset.value; }), items: selected } }));
      }

      function open() {
        root.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        if (multiple && search) search.focus();
        else {
          var active = root.querySelector('.luma-dropdown__item--selected') || items[0];
          if (active) { active.setAttribute('tabindex', '0'); active.focus(); }
        }
      }
      function close(focusTrigger) {
        root.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        // 閉じたリスト項目がTabストップとして残らないようにする
        items.forEach(function (it) { it.setAttribute('tabindex', '-1'); });
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
          if (multiple) {
            item.classList.toggle('luma-dropdown__item--selected');
            emitMultipleChange();
            return;
          }
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

      if (search) search.addEventListener('input', function () {
        var query = search.value.trim().toLocaleLowerCase('ja');
        items.forEach(function (item) { item.hidden = !!query && (item.dataset.search || item.textContent.toLocaleLowerCase('ja')).indexOf(query) === -1; });
      });
      if (clear) clear.addEventListener('click', function (e) {
        e.stopPropagation();
        items.forEach(function (item) { item.classList.remove('luma-dropdown__item--selected'); });
        emitMultipleChange();
      });
      if (selectedArea) selectedArea.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-remove-value]');
        if (!chip) return;
        var item = items.find(function (candidate) { return candidate.dataset.value === chip.dataset.removeValue; });
        if (item) item.classList.remove('luma-dropdown__item--selected');
        emitMultipleChange();
      });
      updateMultiple();

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
          // data-theme 未指定時はOS設定を実効テーマとして扱う
          // (OSダーク環境で最初のクリックが無視される問題の回避)
          var attr = document.documentElement.getAttribute('data-theme');
          var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          var current = attr || (prefersDark ? 'dark' : 'light');
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
    _openCount: 0,
    _savedOverflow: '',
    open: function (id) {
      var backdrop = document.getElementById(id);
      if (!backdrop || backdrop.classList.contains('is-open')) return;
      backdrop.classList.add('is-open');
      var modal = backdrop.querySelector('.luma-modal');
      // 閉じたときに起点へフォーカスを戻せるよう開いた直前の要素を記録する
      backdrop._opener = document.activeElement && !backdrop.contains(document.activeElement) ? document.activeElement : null;
      if (Modal._openCount === 0) {
        Modal._savedOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden'; // 背景スクロールの固定
      }
      Modal._openCount++;
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
      if (!backdrop || !backdrop.classList.contains('is-open')) return;
      backdrop.classList.remove('is-open');
      if (backdrop._onKeydown) document.removeEventListener('keydown', backdrop._onKeydown);
      Modal._openCount = Math.max(0, Modal._openCount - 1);
      if (Modal._openCount === 0) document.body.style.overflow = Modal._savedOverflow;
      var opener = backdrop._opener;
      backdrop._opener = null;
      if (opener && typeof opener.focus === 'function') opener.focus();
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
      // 画面遷移用リンクはタブパネル制御の対象外。クリック直後に先頭へ
      // リセットされる挙動を防ぎ、ルーターへそのまま委ねる。
      if (root.hasAttribute('data-route-tabs')) return;
      var tabs = Array.prototype.slice.call(root.querySelectorAll('.luma-tabs__item'));
      if (!tabs.length) return;
      var vertical = root.classList.contains('luma-tabs--vertical') || root.getAttribute('aria-orientation') === 'vertical';
      if (vertical) root.setAttribute('aria-orientation', 'vertical');
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
          if ((!vertical && e.key === 'ArrowRight') || (vertical && e.key === 'ArrowDown')) { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
          else if ((!vertical && e.key === 'ArrowLeft') || (vertical && e.key === 'ArrowUp')) { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); }
          else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
          else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
        });
      });

      // 縦タブのモバイル表示はリスト側のネイティブ横スクロールを使う。
      // ルートでスワイプ判定すると、スクロール中に意図せず項目が切り替わる。
      if (vertical) return;

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
        if (open) {
          // maxHeight:none のまま 0 へ遷移させるため一度実高さへ戻す
          panel.style.maxHeight = panel.scrollHeight + 'px';
          panel.getBoundingClientRect(); // reflow
          panel.style.maxHeight = '0px';
          panel.classList.remove('is-open');
        } else {
          panel.classList.add('is-open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
      // 展開が完了したら maxHeight を外す。これでウィンドウリサイズ時や
      // 内部コンテンツの変化でもパネルがクリップされない
      panel.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'max-height') return;
        if (trigger.getAttribute('aria-expanded') === 'true') panel.style.maxHeight = 'none';
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
      // メッセージはテキストとして挿入する（HTML連結による意図しないマークアップ混入を防ぐ）
      var text = document.createElement('span');
      text.textContent = message == null ? '' : String(message);
      var closeBtn = document.createElement('button');
      closeBtn.className = 'luma-toast__close';
      closeBtn.setAttribute('aria-label', '閉じる');
      closeBtn.textContent = '×';
      toast.appendChild(text);
      toast.appendChild(closeBtn);
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
      closeBtn.addEventListener('click', function (e) {
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
