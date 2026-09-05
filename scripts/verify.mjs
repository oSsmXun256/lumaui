import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, createContext } from "node:vm";
import { createDocument, FakeCustomEvent, FakeElement, FakeEvent } from "./fake-dom.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modules = [
  "lumaui-core.css",
  "lumaui-button.css",
  "lumaui-form.css",
  "lumaui-table.css",
  "lumaui-navigation.css",
  "lumaui-components.css",
  "lumaui-overlay.css"
];
const cssPath = resolve(root, "lumaui.css");
const jsPath = resolve(root, "lumaui.js");
const css = await readFile(cssPath, "utf8");
const js = await readFile(jsPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countBraces(text) {
  let clean = text.replace(/\/\*[\s\S]*?\*\//g, "");
  clean = clean.replace(/(['"])(?:\\.|(?!\1)[^\\])*\1/g, "");
  return [...clean].reduce((depth, char) => {
    if (char === "{") return depth + 1;
    if (char === "}") return depth - 1;
    return depth;
  }, 0);
}

/* ---- 1. Bundle sync: lumaui.css must equal the concatenation of the
        split modules so the two distributions never drift apart again. ---- */
let expectedBundle = "";
for (const file of modules) {
  const part = await readFile(resolve(root, file), "utf8");
  expectedBundle += expectedBundle.endsWith("\n") || expectedBundle === "" ? part : "\n" + part;
}
assert(css === expectedBundle, "lumaui.css is out of sync with the split modules — run `npm run build`");

/* ---- 2. CSS contract: surface / elevation / semantic / a11y API ---- */
const requiredCss = [
  // surface tiers + elevation scale
  "--luma-surface-0", "--luma-surface-1", "--luma-surface-2", "--luma-surface-3",
  "--luma-elevation-1", "--luma-elevation-2", "--luma-elevation-3", "--luma-elevation-4",
  "--luma-focus-ring",
  // semantic colors
  "--luma-on", "--luma-error", "--luma-warning", "--luma-info",
  "--luma-on-border", "--luma-error-border", "--luma-warning-border", "--luma-info-border",
  ".luma-badge--warning", ".luma-badge--info", ".luma-text-warning", ".luma-text-info",
  ".luma-inset--on", ".luma-inset--error", ".luma-inset--warning", ".luma-inset--info",
  // components that must consume the token scale (no hardcoded tier shadows)
  ".luma-card--static", ".luma-card--interactive", ".luma-btn--loading", ".luma-btn--ghost",
  ".luma-multiselect__search", ".luma-multiselect__chip",
  // a11y: closed layers must leave the tab order
  "visibility: hidden", "visibility: visible",
  // a11y: reduced motion + dark theme
  "@media (prefers-reduced-motion: reduce)", "[data-theme=\"dark\"]", "[data-style=\"flat\"]"
];
const missingCss = requiredCss.filter((needle) => !css.includes(needle));
if (missingCss.length) throw new Error(`Missing required CSS API: ${missingCss.join(", ")}`);

assert(!/\.luma-modal\s*\{[^}]*box-shadow:\s*0 16px/.test(css), "Modal must use --luma-elevation tokens");
assert(!/\.demo-bar\s*\{/.test(css), "demo-only classes must live in demo.html, not the library CSS");
assert(/\.luma-input:disabled/.test(css), "Inputs must expose a disabled state");
assert(/\.luma-tabs\s*\{[^}]*overflow-x:\s*auto;[^}]*scrollbar-width:\s*none;[^}]*-ms-overflow-style:\s*none;/.test(css), "Horizontal tabs must hide native scrollbars while preserving horizontal overflow");
assert(css.includes(".luma-tabs::-webkit-scrollbar"), "Chromium tabs must hide native scrollbars");
assert(/\.luma-tabs--vertical \.luma-tabs__list\s*\{[^}]*overflow-x:\s*auto;[^}]*scrollbar-width:\s*none;[^}]*-ms-overflow-style:\s*none;/.test(css), "Mobile vertical tab lists must hide native scrollbars");
assert(css.includes(".luma-tabs--vertical .luma-tabs__list::-webkit-scrollbar"), "Chromium mobile vertical tabs must hide native scrollbars");

assert(countBraces(css) === 0, "CSS braces are unbalanced");
assert(countBraces(js) === 0, "JS braces are unbalanced");

/* ---- 3. JS syntax ---- */
try {
  new Script(js, { filename: jsPath });
} catch (error) {
  throw new Error(`JavaScript syntax check failed: ${error.message}`);
}

/* ---- 4. Behavior tests with a minimal DOM shim ---- */
function bootLumaUI(doc, overrides = {}) {
  const sandbox = {
    window: null,
    document: doc,
    CustomEvent: FakeCustomEvent,
    localStorage: { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } },
    setTimeout,
    clearTimeout,
    ...overrides
  };
  sandbox.window = sandbox;
  const context = createContext(sandbox);
  new Script(js, { filename: jsPath }).runInContext(context);
  return sandbox.window.LumaUI;
}

function withDoc(doc, ...els) {
  els.forEach((el) => { el._doc = doc; });
}

function testThemeToggle() {
  const doc = createDocument();
  const btn = new FakeElement("button", { "data-luma-theme-toggle": "" });
  withDoc(doc, btn);
  doc.body.appendChild(btn);
  const LumaUI = bootLumaUI(doc, { matchMedia: () => ({ matches: true }) }); // OSダーク設定を再現
  // OSダーク設定で属性未指定のとき、最初のクリックでライトへ切り替わる
  btn.dispatchEvent(new FakeEvent("click", { target: btn }));
  assert(doc.documentElement.getAttribute("data-theme") === "light", "ThemeToggle must treat the OS dark preference as the effective theme");
  btn.dispatchEvent(new FakeEvent("click", { target: btn }));
  assert(doc.documentElement.getAttribute("data-theme") === "dark", "ThemeToggle should toggle back to dark");
  assert(LumaUI && typeof LumaUI.Toast.show === "function", "window.LumaUI must expose the public API");
}

function testToast() {
  const doc = createDocument();
  const api = bootLumaUI(doc);
  const toast = api.Toast.show("<img src=x onerror=alert(1)>", { type: "on" });
  const span = toast.querySelector("span");
  assert(span && span.textContent === "<img src=x onerror=alert(1)>", "Toast must insert the message as text, not HTML");
  assert(!toast.childNodes.some((n) => typeof n === "string" && n.includes("<img")), "Toast must not build markup by string concatenation");
  const region = doc.querySelector(".luma-toast-region");
  assert(region && region.getAttribute("aria-live") === "polite", "Toast region must be a live region");
  toast.querySelector("button").dispatchEvent(new FakeEvent("click", { target: null }));
  assert(toast.classList.contains("is-leaving"), "Toast close button must start the leave animation");
}

function testModal() {
  const doc = createDocument();
  const trigger = new FakeElement("button", { "data-luma-modal-open": "demoModal", text: "open" });
  const backdrop = new FakeElement("div", { class: "luma-modal-backdrop", id: "demoModal" });
  const modal = new FakeElement("div", { class: "luma-modal", role: "dialog" });
  const closeBtn = new FakeElement("button", { "data-luma-modal-close": "", text: "close" });
  modal.appendChild(closeBtn);
  backdrop.appendChild(modal);
  doc.body.appendChild(trigger);
  doc.body.appendChild(backdrop);
  withDoc(doc, trigger, backdrop, modal, closeBtn);

  const LumaUI = bootLumaUI(doc);
  doc.activeElement = trigger; // ユーザーがトリガーを押した直後を再現
  LumaUI.Modal.open("demoModal");
  assert(backdrop.classList.contains("is-open"), "Modal.open must open the backdrop");
  assert(doc.body.style.overflow === "hidden", "Modal.open must lock body scroll");
  assert(doc.activeElement === closeBtn, "Modal.open must move focus into the dialog");
  LumaUI.Modal.close("demoModal");
  assert(!backdrop.classList.contains("is-open"), "Modal.close must close the backdrop");
  assert(doc.body.style.overflow === "", "Modal.close must restore body scroll");
  assert(doc.activeElement === trigger, "Modal.close must restore focus to the opener");
  // double open/close guards
  LumaUI.Modal.open("demoModal");
  LumaUI.Modal.open("demoModal");
  LumaUI.Modal.close("demoModal");
  assert(doc.body.style.overflow === "" && !backdrop.classList.contains("is-open"), "Modal must tolerate duplicate open/close calls");
}

function testDropdownTabindex() {
  const doc = createDocument();
  const rootEl = new FakeElement("div", { class: "luma-dropdown" });
  const trigger = new FakeElement("button", { class: "luma-dropdown__trigger" });
  const list = new FakeElement("ul", { class: "luma-dropdown__list", role: "listbox" });
  const item1 = new FakeElement("li", { class: "luma-dropdown__item", role: "option", "data-value": "a", text: "A" });
  const item2 = new FakeElement("li", { class: "luma-dropdown__item", role: "option", "data-value": "b", text: "B" });
  list.appendChild(item1);
  list.appendChild(item2);
  rootEl.appendChild(trigger);
  rootEl.appendChild(list);
  doc.body.appendChild(rootEl);
  withDoc(doc, rootEl, trigger, list, item1, item2);

  bootLumaUI(doc);
  trigger.dispatchEvent(new FakeEvent("click", { target: trigger }));
  assert(rootEl.classList.contains("is-open"), "Dropdown trigger click must open the list");
  assert(doc.activeElement === item1, "Dropdown must focus the first option on open");
  assert(item1.getAttribute("tabindex") === "0", "Focused option must be tabbable while open");
  // click outside closes and must not leave tab stops behind
  doc.dispatchEvent(new FakeEvent("click", { target: doc.body }));
  assert(!rootEl.classList.contains("is-open"), "Outside click must close the dropdown");
  assert(item1.getAttribute("tabindex") === "-1" && item2.getAttribute("tabindex") === "-1", "Closed dropdown options must not remain tabbable");
  // Escape close
  trigger.dispatchEvent(new FakeEvent("click", { target: trigger }));
  rootEl.dispatchEvent(new FakeEvent("keydown", { key: "Escape", target: item2 }));
  assert(!rootEl.classList.contains("is-open"), "Escape must close the dropdown");
}

function testAccordion() {
  const doc = createDocument();
  const item = new FakeElement("div", { class: "luma-accordion__item" });
  const trigger = new FakeElement("button", { class: "luma-accordion__trigger", text: "spec" });
  const panel = new FakeElement("div", { class: "luma-accordion__panel" });
  const inner = new FakeElement("div", { class: "luma-accordion__panel-inner", text: "vCPU 4" });
  panel.appendChild(inner);
  item.appendChild(trigger);
  item.appendChild(panel);
  doc.body.appendChild(item);
  withDoc(doc, item, trigger, panel);

  bootLumaUI(doc);
  trigger.dispatchEvent(new FakeEvent("click", { target: trigger }));
  assert(trigger.getAttribute("aria-expanded") === "true", "Accordion trigger must set aria-expanded");
  assert(panel.classList.contains("is-open"), "Open accordion panel must be marked visible for a11y");
  assert(panel.style.maxHeight === "100px", "Accordion must size the panel to its content");
  trigger.dispatchEvent(new FakeEvent("click", { target: trigger }));
  assert(panel.style.maxHeight === "0px", "Accordion must collapse to zero height");
  assert(!panel.classList.contains("is-open"), "Collapsed accordion panel must leave the a11y tree");
}

function testTabs() {
  const doc = createDocument();
  const tabsRoot = new FakeElement("div", { class: "luma-tabs", role: "tablist" });
  const tab1 = new FakeElement("button", { class: "luma-tabs__item", role: "tab", "aria-selected": "true", "aria-controls": "p1", "tabindex": "0", text: "A" });
  const tab2 = new FakeElement("button", { class: "luma-tabs__item", role: "tab", "aria-selected": "false", "aria-controls": "p2", "tabindex": "-1", text: "B" });
  tabsRoot.appendChild(tab1);
  tabsRoot.appendChild(tab2);
  const panel1 = new FakeElement("div", { class: "luma-tabs__panel", id: "p1" });
  const panel2 = new FakeElement("div", { class: "luma-tabs__panel", id: "p2", hidden: "" });
  doc.body.appendChild(tabsRoot);
  doc.body.appendChild(panel1);
  doc.body.appendChild(panel2);
  withDoc(doc, tabsRoot, tab1, tab2, panel1, panel2);

  bootLumaUI(doc);
  tab1.dispatchEvent(new FakeEvent("keydown", { key: "ArrowRight", target: tab1 }));
  assert(tab2.getAttribute("aria-selected") === "true" && tab1.getAttribute("aria-selected") === "false", "ArrowRight must select the next tab");
  assert(panel2.hidden === false && panel1.hidden === true, "Arrow navigation must swap panels");
  assert(doc.activeElement === tab2, "Arrow navigation must move focus with selection");
  tab2.dispatchEvent(new FakeEvent("keydown", { key: "Home", target: tab2 }));
  assert(tab1.getAttribute("aria-selected") === "true", "Home must select the first tab");
}

function testTabsVertical() {
  const doc = createDocument();
  const tabsRoot = new FakeElement("div", { class: "luma-tabs luma-tabs--vertical" });
  const tab1 = new FakeElement("button", { class: "luma-tabs__item", role: "tab", "aria-selected": "true", "aria-controls": "v1", "tabindex": "0", text: "A" });
  const tab2 = new FakeElement("button", { class: "luma-tabs__item", role: "tab", "aria-selected": "false", "aria-controls": "v2", "tabindex": "-1", text: "B" });
  tabsRoot.appendChild(tab1);
  tabsRoot.appendChild(tab2);
  doc.body.appendChild(tabsRoot);
  withDoc(doc, tabsRoot, tab1, tab2);
  bootLumaUI(doc);
  assert(tabsRoot.getAttribute("aria-orientation") === "vertical", "Vertical tabs must declare vertical orientation");
  tab1.dispatchEvent(new FakeEvent("keydown", { key: "ArrowDown", target: tab1 }));
  assert(tab2.getAttribute("aria-selected") === "true", "Vertical tabs must navigate with ArrowDown");
}

const tests = [
  ["ThemeToggle", testThemeToggle],
  ["Toast (XSS-safe)", testToast],
  ["Modal (focus restore / scroll lock)", testModal],
  ["Dropdown (tabindex hygiene)", testDropdownTabindex],
  ["Accordion (visibility)", testAccordion],
  ["Tabs (keyboard)", testTabs],
  ["Tabs (vertical)", testTabsVertical]
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed++;
    console.error(`  FAIL ${name}: ${error.message}`);
  }
}
if (failed) throw new Error(`${failed} behavior test(s) failed`);
console.log(`LumaUI verification passed (${css.length} CSS chars incl. bundle sync, ${js.length} JS chars; ${tests.length} behavior tests OK).`);
