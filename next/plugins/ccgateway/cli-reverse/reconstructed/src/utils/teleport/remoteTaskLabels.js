/**
 * utils/teleport/remoteTaskLabels.ts
 *
 * 远程任务标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPlatform as getPlatform_2 } from "../platform.js";
import { foldPathCase } from "../pathCaseFolding.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:392900-392944 placement
/**
 * 后台任务与远程任务的默认标题。
 */
var BACKGROUND_TASK_TITLE = "Background task";
var REMOTE_TASK_TITLE = "Remote task";
//@ chunk-7jxyna5q.js:392944-393017 placement (2.1.88 match: setCwdState, 1)
function nfcLowerNfc(cwd) {
  return cwd.normalize("NFC").toLowerCase().normalize("NFC");
}
//@ chunk-7jxyna5q.js:393017-393054 placement
var SPECIAL_LATIN_RE = /[\u017f\u212a\ufb00-\ufb06]/;
//@ chunk-7jxyna5q.js:393054-393115 placement
var WSL_MNT_DRIVE_PATTERN = /^\/mnt\/[a-z](?:\/|$)/i;
var WSL_MNT_ROOT_RE = /^\/mnt(?:\/[a-z])?\/?$/i;
//@ chunk-7jxyna5q.js:393115-393161 placement (2.1.88 match: execTmux, 1)
function isWslMntRoot(path) {
  return getPlatform_2() === "wsl" && WSL_MNT_ROOT_RE.test(path);
}
//@ chunk-7jxyna5q.js:393282-393316 placement
/**
 * 是否含特殊拉丁字母（ſ、K、ff 连字）。
 */
function hasSpecialLatinLetter(value) {
  return SPECIAL_LATIN_RE.test(value);
}
//@ chunk-7jxyna5q.js:393316-393397 placement
var DEFAULT_IGNORABLE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_9;
deferInit("chunk-7jxyna5q.js:393316", () => {
  DEFAULT_IGNORABLE_RE = /\p{Default_Ignorable_Code_Point}/gu;
  regExp_9 = new RegExp(`(${DEFAULT_IGNORABLE_RE.source}+)`, "u");
});
//@ chunk-7jxyna5q.js:393565-393663 placement
/**
 * 折叠路径大小写但保留默认可忽略字符。
 */
function foldPathCaseKeepingIgnorables(path) {
  let parts = path.split(regExp_9);
  return parts.length === 1
    ? null
    : parts.map((part, index) => (index % 2 === 1 ? part : foldPathCase(part))).join("");
}
//@ chunk-7jxyna5q.js:393663-393756 placement
/**
 * 列出路径的各级父目录。
 */
function parentDirsOf(path) {
  let parts = path.split("/");
  return parts.slice(0, -1).map((index, index_2) => parts.slice(0, index_2 + 1).join("/"));
}
export {
  BACKGROUND_TASK_TITLE,
  REMOTE_TASK_TITLE,
  parentDirsOf,
  nfcLowerNfc,
  hasSpecialLatinLetter,
  foldPathCaseKeepingIgnorables,
  WSL_MNT_DRIVE_PATTERN,
  DEFAULT_IGNORABLE_RE,
  isWslMntRoot,
};
