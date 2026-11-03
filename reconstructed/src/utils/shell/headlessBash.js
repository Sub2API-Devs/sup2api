/**
 * utils/shell/headlessBash.ts
 *
 * 2.1.316 新增：解析 OSC 序列参数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rnaw3pc3.js (10)
 * attribution: placement 10
 */
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { getCwd } from "../cwd.js";
import { resolveDefaultShell } from "./resolveDefaultShell.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { BASH_STDOUT, BASH_STDERR, BASH_EXIT_CODE } from "../../constants/xml.js";
import { truncateToLength, firstLineOf, toWellFormedString } from "../stringUtils.js";
import { escapeXml_2 as escapeXml, truncateBeforeEscape } from "../confusables.js";
import { stripAnsiSequences } from "../printableName.js";

/**
 * 描述 Bash 启动失败：bridge 连接下隐去细节，否则返回错误消息。
 */
//@ chunk-rnaw3pc3.js:679-842 placement
function describeSpawnFailure(e, s) {
  if (!isBridgeOrTransport(s)) return errorMessage(e);
  return (
    logForDebugging(`bash spawn failure detail: ${errorMessage(e)}`, { level: "error" }),
    "shell command failed (detail withheld on this connection)"
  );
}
//@ chunk-rnaw3pc3.js:998-1251 placement
var MAX_BASH_OUTPUT_CHARS = 262144,
  OTHER_DIRECTORY_WORDS =
    "Not run: this command was sent for a different folder than the one the session is in now. Ask Claude to run it instead.",
  BASH_TIMEOUT_MS = 600000,
  BASH_INTERRUPTED_NOTE = "[interrupted]",
  TIMED_OUT_NOTE = "[timed out after 10 minutes]",
  OUTPUT_LIMIT_NOTE = "[stopped: the command printed more than 100 MB]";
//@ chunk-rnaw3pc3.js:1251-2497 placement
async function runHeadlessBashCommand(e) {
  let { command: command } = e,
    r = e.cwd ?? getCwd(),
    o = e.maxOutputChars ?? MAX_BASH_OUTPUT_CHARS,
    { file: file, args: args } =
      resolveDefaultShell() === "powershell"
        ? { file: "pwsh", args: ["-NoProfile", "-Command", command] }
        : { file: "/bin/sh", args: ["-c", command] },
    abortController = new AbortController(),
    u = setTimeout((D) => D.abort(), BASH_TIMEOUT_MS + 2000, abortController),
    any = AbortSignal.any(
      e.abortSignal === void 0 ? [abortController.signal] : [e.abortSignal, abortController.signal],
    ),
    {
      stdout: stdout,
      stderr: stderr,
      code: code,
      exitCode: exitCode,
      timedOut: timedOut,
      maxBufferExceeded: maxBufferExceeded,
      error: error,
    } = await execFileNoThrowWithCwd(file, args, {
      abortSignal: any,
      timeout: BASH_TIMEOUT_MS,
      cwd: r,
      env: subprocessEnv(),
      extendEnv: !1,
      preserveOutputOnError: !0,
      withoutControllingTerminal: !0,
      abortEndsProcessGroup: !0,
      waitForExitAfterKill: !0,
    }).finally(() => clearTimeout(u)),
    a =
      timedOut || abortController.signal.aborted
        ? "timeout"
        : e.abortSignal?.aborted === !0
          ? "interrupt"
          : maxBufferExceeded
            ? "output_limit"
            : void 0,
    S = error && a === void 0 && !error.startsWith(`Command failed with exit code ${code}`) ? error : "";
  if (S) logFeatureBad("input_remote_bash", "spawn_failed");
  else if (a === "timeout") logFeatureBad("input_remote_bash", "timed_out");
  else if (a === "output_limit") logFeatureBad("input_remote_bash", "output_limit");
  else logFeatureOk("input_remote_bash", { interrupted: a === "interrupt" });
  let B = S ? describeSpawnFailure(S, e.session) : "",
    R =
      a === "timeout"
        ? TIMED_OUT_NOTE
        : a === "interrupt"
          ? BASH_INTERRUPTED_NOTE
          : a === "output_limit"
            ? OUTPUT_LIMIT_NOTE
            : "",
    b = exitCode ?? (a === "interrupt" ? 130 : a === "timeout" ? 124 : code);
  return {
    outputText: `<${BASH_STDOUT}>${formatBashOutput(stdout, o, "")}</${BASH_STDOUT}><${BASH_STDERR}>${formatBashOutput(stderr || B, o, R)}</${BASH_STDERR}><${BASH_EXIT_CODE}>${b}</${BASH_EXIT_CODE}>`,
    exitCode: b,
  };
}
//@ chunk-rnaw3pc3.js:2497-2685 placement
function formatBashOutput(e, s, r) {
  let o =
      r === ""
        ? ""
        : `
${r}`,
    i = s - o.length,
    l = truncateToLength(e, Math.max(i, 0)),
    n = e.length - l.length,
    u = cleanShellOutputForViewers(l),
    c = escapeXml(u),
    p = n === 0 && c.length <= i ? c : escapeXml(truncateBeforeEscape(u, i, (f) => U(f + n)));
  return `${p}${p === "" ? r : o}`;
}
//@ chunk-rnaw3pc3.js:2685-2783 placement
function U(e) {
  return `
[output truncated: ${e.toLocaleString("en-US")} more characters not shown]`;
}
//@ chunk-rnaw3pc3.js:2783-2808 placement
var E = /\x1b\[[0-9;:]*m/g;
/**
 * 解析 OSC 序列参数。
 */
//@ chunk-rnaw3pc3.js:2808-3443 placement
function parseOscSequence(e) {
  let s = [],
    parts = e.slice(2, -1).split(";");
  for (let o = 0; o < parts.length; o++) {
    let i = parts[o],
      l = firstLineOf(i, ":"),
      n = l === "" ? 0 : Number(l);
    if (n === 38 || n === 48 || n === 58) {
      let u = i.includes(":")
        ? i.split(":")
        : parts[o + 1] === "5"
          ? parts.slice(o, o + 3)
          : parts[o + 1] === "2"
            ? parts.slice(o, o + 5)
            : [i];
      if (!i.includes(":")) o += u.length - 1;
      if (n !== 38) continue;
      if (u[1] === "5" && u.length === 3 && x(u[2])) s.push("38", "5", u[2]);
      else if (u[1] === "2") {
        let sliced = u.slice(-3);
        if ((u.length === 5 || u.length === 6) && sliced.every(x)) s.push("38", "2", ...sliced);
      }
      continue;
    }
    if (
      n === 0 ||
      n === 1 ||
      n === 2 ||
      n === 3 ||
      n === 4 ||
      n === 9 ||
      (n >= 21 && n <= 24) ||
      n === 29 ||
      (n >= 30 && n <= 37) ||
      n === 39 ||
      (n >= 90 && n <= 97)
    )
      s.push(String(n));
  }
  return s.length === 0 ? "" : `\x1B[${s.join(";")}m`;
}
//@ chunk-rnaw3pc3.js:3443-3589 placement
function cleanShellOutputForViewers(e, s = {}) {
  if (s.keepColors !== !0) return sanitizeTerminalText(e);
  let r = e.match(E) ?? [];
  return e
    .split(E)
    .map((o, i) => sanitizeTerminalText(o) + (r[i] === void 0 ? "" : parseOscSequence(r[i])))
    .join("");
}
//@ chunk-rnaw3pc3.js:3589-3828 placement
function sanitizeTerminalText(e) {
  return stripAnsiSequences(toWellFormedString(e))
    .replace(
      /\r\n?/g,
      `
`,
    )
    .replace(
      /(?![\t\n])[\p{Cc}\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u206A-\u206F\u061C\u034F\u180E\u115F\u1160\u3164\uFFA0\uFEFF\uFFF9-\uFFFB\u{E0000}-\u{E007F}]/gu,
      "",
    );
}
//@ chunk-rnaw3pc3.js:3828-3881 placement
function x(e) {
  return e !== void 0 && /^\d{1,3}$/.test(e);
}

export { cleanShellOutputForViewers, BASH_INTERRUPTED_NOTE, OTHER_DIRECTORY_WORDS, describeSpawnFailure };
