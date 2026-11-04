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
function buildSandboxFailureHint(hintInput) {
  let output =
    hintInput.output.length <= MAX_HINT_OUTPUT_SCAN
      ? hintInput.output
      : hintInput.output.slice(0, MAX_HINT_OUTPUT_SCAN / 2) +
        `
` +
        hintInput.output.slice(-MAX_HINT_OUTPUT_SCAN / 2);
  let isStrictPolicy = hintInput.filesystemPolicy === "strict";
  let symptoms = hintInput.failed
    ? SANDBOX_FAILURE_PATTERNS.flatMap(([symptom, pattern]) =>
        (isStrictPolicy || (symptom !== "operation_not_permitted" && symptom !== "read_only_file_system")) &&
        (symptom !== "sandbox_unavailable" || !hintInput.violationRecorded) &&
        pattern.test(output)
          ? [symptom]
          : [],
      )
    : [];
  let scanText = hintInput.failed || hintInput.violationRecorded ? output : "";
  let deniedPathsNamed = [];
  if (isStrictPolicy) {
    let fsReadConfig = SandboxManager.getFsReadConfig();
    let allowedPaths = (fsReadConfig.allowWithinDeny ?? []).flatMap((allowedPath) => {
      let normalized = normalizeHintPath(allowedPath);
      if (normalized === undefined) return [];
      let match = GLOB_CHAR_RE_2.exec(normalized);
      if (match === null) return [normalized];
      let sliced = normalized.slice(
        0,
        Math.max(normalized.lastIndexOf("/", match.index), normalized.lastIndexOf("\\", match.index)),
      );
      return sliced.length < 2 ? [] : [sliced];
    });
    let homeDir = homedir();
    let seen = new Set();
    for (let path of [
      ...collectHintPaths(fsReadConfig.denyOnly).slice(0, MAX_HINT_PATHS),
      ...collectHintPaths(hintInput.additionalDenyRead()),
    ].slice(0, MAX_HINT_COMMANDS)) {
      if (seen.has(path)) continue;
      seen.add(path);
      if (
        (path === homeDir
          ? [path, "~", "$HOME"]
          : path.startsWith(homeDir + "/") || path.startsWith(homeDir + "\\")
            ? [path, `~${path.slice(homeDir.length)}`, `$HOME${path.slice(homeDir.length)}`]
            : [path]
        ).some(
          (spelling) =>
            mentionsPathOutsideAllowed(hintInput.command, spelling, path, allowedPaths) ||
            mentionsPathOutsideAllowed(scanText, spelling, path, allowedPaths),
        )
      )
        deniedPathsNamed.push(path);
    }
  }
  return {
    key: "sandboxed",
    failed: hintInput.failed,
    violationRecorded: hintInput.violationRecorded,
    filesystemConfined: isStrictPolicy,
    symptoms,
    deniedPathsNamed,
  };
}
//@ chunk-e6aww6q8.js:4813979-4814102 placement
function collectHintPaths(paths) {
  return paths.flatMap((path) => {
    let normalized = normalizeHintPath(path);
    return normalized === undefined ||
      !SAFE_PATH_RE.test(normalized) ||
      sanitizeLogLine(normalized.normalize("NFKC")) !== normalized
      ? []
      : [normalized];
  });
}
//@ chunk-e6aww6q8.js:4814102-4814215 placement
function normalizeHintPath(path) {
  let replaced = expandTildeWithHome(path).replace(/[\\/]+$/, "");
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
function mentionsPathOutsideAllowed(text, needle, needlePath, allowedPaths) {
  let from = 0;
  for (;;) {
    let index = text.indexOf(needle, from);
    if (index === -1) return false;
    from = index + 1;
    let before = text[index - 1];
    let after = text[index + needle.length];
    if (
      (before !== undefined && PATH_CHAR_RE.test(before)) ||
      (after !== undefined && after !== "/" && after !== "\\" && PATH_CHAR_RE.test(after))
    )
      continue;
    let fullPath = needlePath + (PATH_TAIL_RE.exec(text.slice(index + needle.length))?.[0] ?? "");
    if (
      !allowedPaths.some(
        (allowed) =>
          fullPath === allowed || fullPath.startsWith(allowed + "/") || fullPath.startsWith(allowed + "\\"),
      )
    )
      return true;
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
