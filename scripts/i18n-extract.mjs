/**
 * Lists the Vietnamese UI strings of Client Components into
 * src/i18n/client-strings.json. The server sends their translations to the
 * browser (Server Components are translated while rendering and need no list).
 * Run after editing client UI text: `npm run i18n:extract`.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = new URL("../src/", import.meta.url).pathname;
const skip = /\/(features\/admin|i18n)\//;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name) && !skip.test(path)) files.push(path);
  }
})(root);

const VIETNAMESE = /[À-ỹđĐ]/;
const strings = new Set();
const add = (raw) => {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text && VIETNAMESE.test(text) && text.length <= 500) strings.add(text);
};
for (const file of files) {
  const code = readFileSync(file, "utf8");
  if (!/^["']use client["']/m.test(code)) continue;
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  (function visit(node) {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isJsxText(node)
    )
      add(node.text);
    ts.forEachChild(node, visit);
  })(source);
}
const out = new URL("../src/i18n/client-strings.json", import.meta.url)
  .pathname;
writeFileSync(out, JSON.stringify([...strings].sort(), null, 1) + "\n");
console.log(`${strings.size} client strings → src/i18n/client-strings.json`);
