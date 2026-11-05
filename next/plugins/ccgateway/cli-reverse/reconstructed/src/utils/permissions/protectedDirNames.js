/**
 * utils/permissions/protectedDirNames.ts
 *
 * 2.1.316 新增：路径是否进入受保护目录（.git、hooks 等）；名字折叠（小写、去变音）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (6)
 * attribution: placement 6
 */
import { sep } from "path";

//@ chunk-z20c443b.js:15957-16235 placement
/**
 * 进入时需要保护的目录名（.git、hooks、.claude、node_modules 等）与不可见格式字符正则。
 */
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
]);
var INVISIBLE_FORMAT_CHAR_RE = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/;
var regExp = new RegExp(INVISIBLE_FORMAT_CHAR_RE, "g");
//@ chunk-z20c443b.js:16235-16266 placement
/**
 * 名字折叠（小写、去变音）。
 */
function foldName(name) {
  return foldProtectedDirName(name, true);
}
//@ chunk-z20c443b.js:16266-16298 placement
/**
 * foldProtectedDirNameLower：保护目录名折叠（区分大小写）。
 */
function foldProtectedDirNameLower(name) {
  return foldProtectedDirName(name, false);
}
//@ chunk-z20c443b.js:16298-16460 placement
function foldProtectedDirName(name, stripStreamSuffix) {
  let replaced = name
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017f/g, "s");
  let replaced_2 = replaced.replace(regExp, "");
  return (stripStreamSuffix ? replaced_2.replace(/:.*$/, "") : replaced_2).replace(/[. ]+$/, "") || replaced;
}
//@ chunk-z20c443b.js:16460-16485 placement
/**
 * isProtectedDirAlwaysFalse：恒 false（占位）。
 */
function isProtectedDirAlwaysFalse(name) {
  return false;
}
//@ chunk-z20c443b.js:16485-16664 placement
/**
 * 路径是否进入受保护目录（.git、hooks 等）。
 */
function isProtectedDirPath(inputPath, rootDir, dangerousFiles) {
  let parts = inputPath.slice(rootDir.length).split(sep);
  let lastIndex = parts.length - 1;
  for (let j = 0; j < parts.length; j++) {
    let foldedSegment = foldName(parts[j]);
    if (PROTECTED_DIR_NAMES.has(foldedSegment) || isProtectedDirAlwaysFalse(foldedSegment)) return true;
    if (j === lastIndex && dangerousFiles?.has(foldedSegment)) return true;
  }
  return false;
}
export {
  foldName,
  foldProtectedDirNameLower,
  isProtectedDirPath,
  regExp,
  isProtectedDirAlwaysFalse,
  PROTECTED_DIR_NAMES,
  INVISIBLE_FORMAT_CHAR_RE,
};
