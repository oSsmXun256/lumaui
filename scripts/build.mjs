import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// lumaui.css は下記モジュールの結合版。分割ファイルが常に単一の情報源。
const modules = [
  "lumaui-core.css",
  "lumaui-button.css",
  "lumaui-form.css",
  "lumaui-table.css",
  "lumaui-navigation.css",
  "lumaui-components.css",
  "lumaui-overlay.css"
];

let bundle = "";
for (const file of modules) {
  const css = await readFile(resolve(root, file), "utf8");
  bundle += bundle.endsWith("\n") || bundle === "" ? css : "\n" + css;
}

await writeFile(resolve(root, "lumaui.css"), bundle, "utf8");
console.log(`LumaUI build complete: lumaui.css (${modules.length} modules, ${bundle.length} chars)`);
