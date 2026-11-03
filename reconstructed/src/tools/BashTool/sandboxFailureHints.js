/**
 * tools/BashTool/sandboxFailureHints.ts
 *
 * 2.1.316 新增：沙箱失败（只读文件系统、无权限）时的提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { homedir } from "os";
import { isAbsolute } from "path";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { sanitizeLogLine } from "../../utils/sanitization.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";

//@ chunk-e6aww6q8.js:4812474-4812911 placement
/**
 * 沙箱失败提示常量：扫描长度与条目上限、失败类型及匹配正则（Operation not permitted、Read-only file system、LaunchServices、沙箱不可用），以及路径字符相关正则。
 */
var MAX_HINT_OUTPUT_SCAN = 65536;
var MAX_HINT_PATHS = 128;
var MAX_HINT_COMMANDS = 256;
var MAX_HINT_PATH_LENGTH = 256;
var SANDBOX_FAILURE_PATTERNS = [
  ["operation_not_permitted", /Operation not permitted/i],
  ["read_only_file_system", /Read-only file system/i],
  ["launch_services", /-10810\b|kLSUnknownErr|LSOpenURLsWithRole\(\)/],
  ["sandbox_unavailable", /^(?:\s*(?:bwrap|sandbox-exec): [^\n]*(?:\n|$))+\s*$/],
];
var GLOB_CHAR_RE_2 = /[*?[{]/;
var PATH_CHAR_RE = /[\p{L}\p{M}\p{N}._@+%~$/\\-]/u;
var PATH_TAIL_RE = /^[^\s"'`:;,|&<>(){}[\]]*/;
var SAFE_PATH_RE = /^[\p{L}\p{M}\p{N}._@+%~$/\\:,=#-]+$/u;
var SPACE_OR_CONTROL_RE = /[\s\p{Cc}]/u;
//@ chunk-e6aww6q8.js:4812911-4813979 placement
/**
 * 沙箱失败（权限不允许、只读文件系统、沙箱不可用）时给出提示。
 */
function buildSandboxFailureHint(e) {
  let n =
    e.output.length <= MAX_HINT_OUTPUT_SCAN
      ? e.output
      : e.output.slice(0, MAX_HINT_OUTPUT_SCAN / 2) +
        `
` +
        e.output.slice(-MAX_HINT_OUTPUT_SCAN / 2);
  let r = e.filesystemPolicy === "strict";
  let symptoms = e.failed
    ? SANDBOX_FAILURE_PATTERNS.flatMap(([S, w]) =>
        (r || (S !== "operation_not_permitted" && S !== "read_only_file_system")) &&
        (S !== "sandbox_unavailable" || !e.violationRecorded) &&
        w.test(n)
          ? [S]
          : [],
      )
    : [];
  let h = e.failed || e.violationRecorded ? n : "";
  let y = [];
  if (r) {
    let fsReadConfig = SandboxManager.getFsReadConfig();
    let flattened = (fsReadConfig.allowWithinDeny ?? []).flatMap((q) => {
      let Z = normalizeHintPath(q);
      if (Z === undefined) return [];
      let match = GLOB_CHAR_RE_2.exec(Z);
      if (match === null) return [Z];
      let sliced = Z.slice(0, Math.max(Z.lastIndexOf("/", match.index), Z.lastIndexOf("\\", match.index)));
      return sliced.length < 2 ? [] : [sliced];
    });
    let L = homedir();
    let G = new Set();
    for (let q of [
      ...collectHintPaths(fsReadConfig.denyOnly).slice(0, MAX_HINT_PATHS),
      ...collectHintPaths(e.additionalDenyRead()),
    ].slice(0, MAX_HINT_COMMANDS)) {
      if (G.has(q)) continue;
      G.add(q);
      if (
        (q === L
          ? [q, "~", "$HOME"]
          : q.startsWith(L + "/") || q.startsWith(L + "\\")
            ? [q, `~${q.slice(L.length)}`, `$HOME${q.slice(L.length)}`]
            : [q]
        ).some(
          (Se) =>
            mentionsPathOutsideAllowed(e.command, Se, q, flattened) ||
            mentionsPathOutsideAllowed(h, Se, q, flattened),
        )
      )
        y.push(q);
    }
  }
  return {
    key: "sandboxed",
    failed: e.failed,
    violationRecorded: e.violationRecorded,
    filesystemConfined: r,
    symptoms,
    deniedPathsNamed: y,
  };
}
//@ chunk-e6aww6q8.js:4813979-4814102 placement
function collectHintPaths(e) {
  return e.flatMap((n) => {
    let r = normalizeHintPath(n);
    return r === undefined || !SAFE_PATH_RE.test(r) || sanitizeLogLine(r.normalize("NFKC")) !== r ? [] : [r];
  });
}
//@ chunk-e6aww6q8.js:4814102-4814215 placement
function normalizeHintPath(e) {
  let replaced = expandTildeWithHome(e).replace(/[\\/]+$/, "");
  return replaced.length < 2 ||
    replaced.length > MAX_HINT_PATH_LENGTH ||
    SPACE_OR_CONTROL_RE.test(replaced) ||
    !isAbsolute(replaced)
    ? undefined
    : replaced;
}
//@ chunk-e6aww6q8.js:4814215-4814533 placement
/**
 * 判断输出中某路径片段的出现处（作为完整路径成分）是否指向允许目录之外。
 */
function mentionsPathOutsideAllowed(e, n, r, s) {
  let h = 0;
  for (;;) {
    let index = e.indexOf(n, h);
    if (index === -1) return false;
    h = index + 1;
    let S = e[index - 1];
    let w = e[index + n.length];
    if (
      (S !== undefined && PATH_CHAR_RE.test(S)) ||
      (w !== undefined && w !== "/" && w !== "\\" && PATH_CHAR_RE.test(w))
    )
      continue;
    let L = r + (PATH_TAIL_RE.exec(e.slice(index + n.length))?.[0] ?? "");
    if (!s.some((G) => L === G || L.startsWith(G + "/") || L.startsWith(G + "\\"))) return true;
  }
}
//@ chunk-e6aww6q8.js:4814533-4814999 placement
/**
 * 命令运行期间内核因内存不足杀死进程时附加的说明（会话共享同一内存上限，建议减少并行），以及每会话最多附加次数。
 */
var OOM_KILL_NOTE =
  "[While this command ran, the kernel killed at least one process for lack of memory. All commands in this session share one memory limit. The killed process may have been a worker that a test or build runner replaced, so this output may not show it. It may also have belonged to another command, a background task or another program under the same limit. If this command was the heavy one, run fewer workers in parallel, or a smaller part at a time.]";
var MAX_OOM_NOTES = 3;
export { MAX_OOM_NOTES, OOM_KILL_NOTE, buildSandboxFailureHint };
