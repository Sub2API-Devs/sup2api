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
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { sanitizeLogLine } from "../../utils/sanitization.js";
import { Lu } from "../../utils/networkPaths.js";

/**
 * 沙箱失败提示常量：扫描长度与条目上限、失败类型及匹配正则（Operation not permitted、Read-only file system、LaunchServices、沙箱不可用），以及路径字符相关正则。
 */
//@ chunk-e6aww6q8.js:4812474-4812911 placement
var MAX_HINT_OUTPUT_SCAN = 65536,
  MAX_HINT_PATHS = 128,
  MAX_HINT_COMMANDS = 256,
  MAX_HINT_PATH_LENGTH = 256,
  SANDBOX_FAILURE_PATTERNS = [
    ["operation_not_permitted", /Operation not permitted/i],
    ["read_only_file_system", /Read-only file system/i],
    ["launch_services", /-10810\b|kLSUnknownErr|LSOpenURLsWithRole\(\)/],
    ["sandbox_unavailable", /^(?:\s*(?:bwrap|sandbox-exec): [^\n]*(?:\n|$))+\s*$/],
  ],
  GLOB_CHAR_RE_2 = /[*?[{]/,
  PATH_CHAR_RE = /[\p{L}\p{M}\p{N}._@+%~$/\\-]/u,
  PATH_TAIL_RE = /^[^\s"'`:;,|&<>(){}[\]]*/,
  SAFE_PATH_RE = /^[\p{L}\p{M}\p{N}._@+%~$/\\:,=#-]+$/u,
  SPACE_OR_CONTROL_RE = /[\s\p{Cc}]/u;
/**
 * 沙箱失败（权限不允许、只读文件系统、沙箱不可用）时给出提示。
 */
//@ chunk-e6aww6q8.js:4812911-4813979 placement
function buildSandboxFailureHint(e) {
  let n =
      e.output.length <= MAX_HINT_OUTPUT_SCAN
        ? e.output
        : e.output.slice(0, MAX_HINT_OUTPUT_SCAN / 2) +
          `
` +
          e.output.slice(-MAX_HINT_OUTPUT_SCAN / 2),
    r = e.filesystemPolicy === "strict",
    s = e.failed
      ? SANDBOX_FAILURE_PATTERNS.flatMap(([S, w]) =>
          (r || (S !== "operation_not_permitted" && S !== "read_only_file_system")) &&
          (S !== "sandbox_unavailable" || !e.violationRecorded) &&
          w.test(n)
            ? [S]
            : [],
        )
      : [],
    h = e.failed || e.violationRecorded ? n : "",
    y = [];
  if (r) {
    let fsReadConfig = SandboxManager.getFsReadConfig(),
      flattened = (fsReadConfig.allowWithinDeny ?? []).flatMap((q) => {
        let Z = normalizeHintPath(q);
        if (Z === void 0) return [];
        let match = GLOB_CHAR_RE_2.exec(Z);
        if (match === null) return [Z];
        let sliced = Z.slice(0, Math.max(Z.lastIndexOf("/", match.index), Z.lastIndexOf("\\", match.index)));
        return sliced.length < 2 ? [] : [sliced];
      }),
      L = homedir_12(),
      G = new Set();
    for (let q of [
      ...collectHintPaths(fsReadConfig.denyOnly).slice(0, MAX_HINT_PATHS),
      ...collectHintPaths(e.additionalDenyRead()),
    ].slice(0, MAX_HINT_COMMANDS)) {
      if (G.has(q)) continue;
      if (
        (G.add(q),
        (q === L
          ? [q, "~", "$HOME"]
          : q.startsWith(L + "/") || q.startsWith(L + "\\")
            ? [q, `~${q.slice(L.length)}`, `$HOME${q.slice(L.length)}`]
            : [q]
        ).some(
          (Se) =>
            mentionsPathOutsideAllowed(e.command, Se, q, flattened) ||
            mentionsPathOutsideAllowed(h, Se, q, flattened),
        ))
      )
        y.push(q);
    }
  }
  return {
    key: "sandboxed",
    failed: e.failed,
    violationRecorded: e.violationRecorded,
    filesystemConfined: r,
    symptoms: s,
    deniedPathsNamed: y,
  };
}
//@ chunk-e6aww6q8.js:4813979-4814102 placement
function collectHintPaths(e) {
  return e.flatMap((n) => {
    let r = normalizeHintPath(n);
    return r === void 0 || !SAFE_PATH_RE.test(r) || sanitizeLogLine(r.normalize("NFKC")) !== r ? [] : [r];
  });
}
//@ chunk-e6aww6q8.js:4814102-4814215 placement
function normalizeHintPath(e) {
  let replaced = Lu(e).replace(/[\\/]+$/, "");
  return replaced.length < 2 ||
    replaced.length > MAX_HINT_PATH_LENGTH ||
    SPACE_OR_CONTROL_RE.test(replaced) ||
    !isAbsolute_57(replaced)
    ? void 0
    : replaced;
}
/**
 * 判断输出中某路径片段的出现处（作为完整路径成分）是否指向允许目录之外。
 */
//@ chunk-e6aww6q8.js:4814215-4814533 placement
function mentionsPathOutsideAllowed(e, n, r, s) {
  let h = 0;
  for (;;) {
    let index = e.indexOf(n, h);
    if (index === -1) return !1;
    h = index + 1;
    let S = e[index - 1],
      w = e[index + n.length];
    if (
      (S !== void 0 && PATH_CHAR_RE.test(S)) ||
      (w !== void 0 && w !== "/" && w !== "\\" && PATH_CHAR_RE.test(w))
    )
      continue;
    let L = r + (PATH_TAIL_RE.exec(e.slice(index + n.length))?.[0] ?? "");
    if (!s.some((G) => L === G || L.startsWith(G + "/") || L.startsWith(G + "\\"))) return !0;
  }
}
/**
 * 命令运行期间内核因内存不足杀死进程时附加的说明（会话共享同一内存上限，建议减少并行），以及每会话最多附加次数。
 */
//@ chunk-e6aww6q8.js:4814533-4814999 placement
var OOM_KILL_NOTE =
    "[While this command ran, the kernel killed at least one process for lack of memory. All commands in this session share one memory limit. The killed process may have been a worker that a test or build runner replaced, so this output may not show it. It may also have belonged to another command, a background task or another program under the same limit. If this command was the heavy one, run fewer workers in parallel, or a smaller part at a time.]",
  MAX_OOM_NOTES = 3;

export { MAX_OOM_NOTES, OOM_KILL_NOTE, buildSandboxFailureHint };
