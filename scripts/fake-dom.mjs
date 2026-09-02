/**
 * Minimal DOM shim used by verify.mjs to exercise lumaui.js behavior
 * (theme toggle / toast / modal / dropdown / tabs / accordion) without a browser.
 * Supports only the simple selectors and DOM APIs the library actually uses.
 */

export class FakeClassList {
  constructor(el) { this._el = el; }
  get _set() {
    return new Set((this._el.getAttribute("class") || "").split(/\s+/).filter(Boolean));
  }
  add(...names) {
    const set = this._set;
    names.forEach((n) => set.add(n));
    this._el.setAttribute("class", [...set].join(" "));
  }
  remove(...names) {
    const set = this._set;
    names.forEach((n) => set.delete(n));
    this._el.setAttribute("class", [...set].join(" "));
  }
  contains(name) { return this._set.has(name); }
  toggle(name, force) {
    const set = this._set;
    const on = force === undefined ? !set.has(name) : !!force;
    if (on) set.add(name); else set.delete(name);
    this._el.setAttribute("class", [...set].join(" "));
    return on;
  }
}

export class FakeEvent {
  constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.stopped = true; }
}

export class FakeElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = {};
    this.style = { setProperty(k, v) { this[k] = v; } };
    this._listeners = {};
    this._classList = new FakeClassList(this);
    this.scrollTop = 0;
    this.scrollHeight = 100;
    this.clientWidth = 100;
    this.scrollWidth = 100;
    this.offsetWidth = 100;
    this.offsetParent = null;
    this.isConnected = true;
    this.focusCalls = 0;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") this.setAttribute("class", v);
      else if (k === "text") this.textContent = v;
      else this.setAttribute(k, v);
    }
  }
  get classList() { return this._classList; }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
  }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
  hasAttribute(name) { return name in this.attributes; }
  removeAttribute(name) { delete this.attributes[name]; }
  get className() { return this.getAttribute("class") || ""; }
  set className(value) { this.setAttribute("class", value); }
  appendChild(child) {
    child.parentNode = this;
    // 親にぶら下がった要素は「描画されている」ものとして扱う
    child.offsetParent = { stub: true };
    this.childNodes.push(child);
    return child;
  }
  insertBefore(child, ref) {
    child.parentNode = this;
    child.offsetParent = { stub: true };
    const idx = ref ? this.childNodes.indexOf(ref) : -1;
    if (idx === -1) this.childNodes.push(child);
    else this.childNodes.splice(idx, 0, child);
    return child;
  }
  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); this.isConnected = false; this.offsetParent = null; }
  get textContent() {
    return this.childNodes.map((n) => (typeof n === "string" ? n : n.textContent)).join("");
  }
  set textContent(value) {
    this.childNodes = typeof value === "string" ? [value] : [];
  }
  get innerHTML() { return this.textContent; }
  set innerHTML(value) { this.textContent = value; }
  get hidden() { return this.hasAttribute("hidden"); }
  set hidden(value) {
    if (value) this.setAttribute("hidden", "");
    else this.removeAttribute("hidden");
  }
  contains(node) {
    let cur = node;
    while (cur) { if (cur === this) return true; cur = cur.parentNode; }
    return false;
  }
  closest(selector) {
    let cur = this;
    while (cur) { if (matchesDeep(cur, selector)) return cur; cur = cur.parentNode; }
    return null;
  }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener(type, fn) {
    const list = this._listeners[type] || [];
    const idx = list.indexOf(fn);
    if (idx !== -1) list.splice(idx, 1);
  }
  dispatchEvent(event) {
    // Minimal bubbling: element → ancestors (incl. the document root),
    // honoring stopPropagation. Delegated listeners rely on this.
    if (!event.target) event.target = this;
    let cur = this;
    while (cur) {
      for (const fn of [...(cur._listeners[event.type] || [])]) {
        if (event.stopped) return true;
        fn.call(cur, event);
      }
      cur = cur.parentNode === cur ? null : cur.parentNode;
    }
    return true;
  }
  focus() { this.focusCalls++; if (this._doc) this._doc.activeElement = this; }
  blur() { if (this._doc && this._doc.activeElement === this) this._doc.activeElement = this._doc.body; }
  click() { this.dispatchEvent(new FakeEvent("click", { target: this })); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40 }; }
  matches(selector) { return matchesDeep(this, selector); }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (typeof child === "string") continue;
        if (matchesDeep(child, selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

// ---- selector engine: tag / * / .class / #id / [attr|=value] / :not(...) / comma ----
function tokenize(group) {
  const tokens = [];
  const re = /(:not\([^)]*\))|(\*)|([a-zA-Z]+)|(\[[^\]]*\])|(\.[A-Za-z0-9_-]+)|(#[A-Za-z0-9_-]+)/g;
  let m;
  while ((m = re.exec(group)) !== null) tokens.push(m[0]);
  return tokens;
}

function tokenMatcher(token) {
  const not = token.match(/^:not\((.+)\)$/);
  if (not) {
    const inner = tokenMatcher(not[1]);
    return (el) => !inner(el);
  }
  if (token === "*") return () => true;
  if (token.startsWith(".")) { const c = token.slice(1); return (el) => el.classList.contains(c); }
  if (token.startsWith("#")) { const id = token.slice(1); return (el) => el.getAttribute("id") === id; }
  if (token.startsWith("[")) {
    const m = token.slice(1, -1).match(/^([A-Za-z-]+)(?:=["']?([^"']*)["']?)?$/);
    if (!m) return () => true;
    return (el) => (m[2] === undefined ? el.hasAttribute(m[1]) : el.getAttribute(m[1]) === m[2]);
  }
  return (el) => el.tagName === token.toUpperCase();
}

function matchesDeep(el, selector) {
  return String(selector).split(",").some((group) => {
    const parts = tokenize(group.trim()).map(tokenMatcher);
    return parts.length > 0 && parts.every((fn) => fn(el));
  });
}

export function createDocument() {
  const doc = new FakeElement("#document");
  doc.tagName = "#DOCUMENT";
  doc.readyState = "complete";
  doc.documentElement = new FakeElement("html");
  doc.documentElement._doc = doc;
  doc.body = new FakeElement("body");
  doc.body._doc = doc;
  doc.appendChild(doc.documentElement);
  doc.documentElement.appendChild(doc.body);
  doc.activeElement = doc.body;

  doc.querySelectorAll = (selector) => {
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (typeof child === "string") continue;
        if (matchesDeep(child, selector)) out.push(child);
        walk(child);
      }
    };
    walk(doc);
    return out;
  };
  doc.querySelector = (selector) => doc.querySelectorAll(selector)[0] || null;
  doc.getElementById = (id) => doc.querySelectorAll("#" + id)[0] || null;
  doc.createElement = (tag) => {
    const el = new FakeElement(tag);
    el._doc = doc;
    return el;
  };
  return doc;
}

export class FakeCustomEvent extends FakeEvent {
  constructor(type, init = {}) { super(type); this.detail = init.detail; }
}
