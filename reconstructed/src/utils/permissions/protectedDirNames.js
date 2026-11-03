/**
 * utils/permissions/protectedDirNames.ts
 *
 * 2.1.316 新增：路径是否进入受保护目录（.git、hooks 等）；名字折叠（小写、去变音）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (6)
 * attribution: placement 6
 */
import { sep, sep as sep_2, sep as sep_3 } from "path";

/**
 * 进入时需要保护的目录名（.git、hooks、.claude、node_modules 等）与不可见格式字符正则。
 */
//@ chunk-dcmhvw5a.js:15948-16226 placement
var PROTECTED_DIR_NAMES = new Set([
    ".git",
    "hooks",
    ".husky",
    ".githooks",
    "node_modules",
    ".vscode",
    ".idea",
    "head",
    "config",
    "objects",
    "refs",
    ".claude",
    "skills",
    "commands",
    "agents",
    ".cargo",
    ".devcontainer",
    ".yarn",
    ".mvn",
  ]),
  INVISIBLE_FORMAT_CHAR_RE = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/,
  regExp = new RegExp(INVISIBLE_FORMAT_CHAR_RE, "g");
/**
 * 名字折叠（小写、去变音）。
 */
//@ chunk-dcmhvw5a.js:16226-16257 placement
function foldName(e) {
  return foldProtectedDirName(e, !0);
}
//@ chunk-dcmhvw5a.js:16257-16289 placement
function dbr(e) {
  return foldProtectedDirName(e, !1);
}
//@ chunk-dcmhvw5a.js:16289-16451 placement
function foldProtectedDirName(e, n) {
  let replaced = e
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\u017f/g, "s"),
    replaced_2 = replaced.replace(regExp, "");
  return (n ? replaced_2.replace(/:.*$/, "") : replaced_2).replace(/[. ]+$/, "") || replaced;
}
//@ chunk-dcmhvw5a.js:16451-16476 placement
function Yps(e) {
  return !1;
}
/**
 * 路径是否进入受保护目录（.git、hooks 等）。
 */
//@ chunk-dcmhvw5a.js:16476-16655 placement
function isProtectedDirPath(e, n, r) {
  let parts = e.slice(n.length).split(sep),
    a = parts.length - 1;
  for (let c = 0; c < parts.length; c++) {
    let g = foldName(parts[c]);
    if (PROTECTED_DIR_NAMES.has(g) || Yps(g)) return !0;
    if (c === a && r?.has(g)) return !0;
  }
  return !1;
}

export { isProtectedDirPath, foldName, dbr, regExp, Yps, PROTECTED_DIR_NAMES, INVISIBLE_FORMAT_CHAR_RE };
