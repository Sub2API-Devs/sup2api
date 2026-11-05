/**
 * utils/shell/headlessBash.ts
 *
 * 2.1.316 新增：解析 OSC 序列参数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zjspdyjm.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-zjspdyjm.js:678-841 placement
/**
 * 描述 Bash 启动失败：bridge 连接下隐去细节，否则返回错误消息。
 */
function describeSpawnFailure(error, session) {
  if (!isBridgeOrTransport(session)) return errorMessage(error);
  logForDebugging(`bash spawn failure detail: ${errorMessage(error)}`, {
    level: "error",
  });
  return "shell command failed (detail withheld on this connection)";
}
//@ chunk-zjspdyjm.js:997-1250 placement
var MAX_BASH_OUTPUT_CHARS = 262144;
var OTHER_DIRECTORY_WORDS =
  "Not run: this command was sent for a different folder than the one the session is in now. Ask Claude to run it instead.";
var BASH_TIMEOUT_MS = 600000;
var BASH_INTERRUPTED_NOTE = "[interrupted]";
var TIMED_OUT_NOTE = "[timed out after 10 minutes]";
var OUTPUT_LIMIT_NOTE = "[stopped: the command printed more than 100 MB]";
//@ chunk-zjspdyjm.js:1250-2496 placement
async function runHeadlessBashCommand(options) {
  let { command } = options;
  let cwd = options.cwd ?? getCwd();
  let maxOutputChars = options.maxOutputChars ?? MAX_BASH_OUTPUT_CHARS;
  let { file, args } =
    resolveDefaultShell() === "powershell"
      ? {
          file: "pwsh",
          args: ["-NoProfile", "-Command", command],
        }
      : {
          file: "/bin/sh",
          args: ["-c", command],
        };
  let abortController = new AbortController();
  let timer = setTimeout((controller) => controller.abort(), BASH_TIMEOUT_MS + 2000, abortController);
  let abortSignal = AbortSignal.any(
    options.abortSignal === undefined
      ? [abortController.signal]
      : [options.abortSignal, abortController.signal],
  );
  let { stdout, stderr, code, exitCode, timedOut, maxBufferExceeded, error } = await execFileNoThrowWithCwd(
    file,
    args,
    {
      abortSignal,
      timeout: BASH_TIMEOUT_MS,
      cwd,
      env: subprocessEnv(),
      extendEnv: false,
      preserveOutputOnError: true,
      withoutControllingTerminal: true,
      abortEndsProcessGroup: true,
      waitForExitAfterKill: true,
    },
  ).finally(() => clearTimeout(timer));
  let interruptKind =
    timedOut || abortController.signal.aborted
      ? "timeout"
      : options.abortSignal?.aborted === true
        ? "interrupt"
        : maxBufferExceeded
          ? "output_limit"
          : undefined;
  let spawnError =
    error && interruptKind === undefined && !error.startsWith(`Command failed with exit code ${code}`)
      ? error
      : "";
  if (spawnError) logFeatureBad("input_remote_bash", "spawn_failed");
  else if (interruptKind === "timeout") logFeatureBad("input_remote_bash", "timed_out");
  else if (interruptKind === "output_limit") logFeatureBad("input_remote_bash", "output_limit");
  else
    logFeatureOk("input_remote_bash", {
      interrupted: interruptKind === "interrupt",
    });
  let failureText = spawnError ? describeSpawnFailure(spawnError, options.session) : "";
  let note =
    interruptKind === "timeout"
      ? TIMED_OUT_NOTE
      : interruptKind === "interrupt"
        ? BASH_INTERRUPTED_NOTE
        : interruptKind === "output_limit"
          ? OUTPUT_LIMIT_NOTE
          : "";
  let finalExitCode =
    exitCode ?? (interruptKind === "interrupt" ? 130 : interruptKind === "timeout" ? 124 : code);
  return {
    outputText: `<${BASH_STDOUT}>${formatBashOutput(stdout, maxOutputChars, "")}</${BASH_STDOUT}><${BASH_STDERR}>${formatBashOutput(stderr || failureText, maxOutputChars, note)}</${BASH_STDERR}><${BASH_EXIT_CODE}>${finalExitCode}</${BASH_EXIT_CODE}>`,
    exitCode: finalExitCode,
  };
}
//@ chunk-zjspdyjm.js:2496-2683 placement
function formatBashOutput(text, maxOutputChars, note) {
  let noteSuffix =
    note === ""
      ? ""
      : `
${note}`;
  let budget = maxOutputChars - noteSuffix.length;
  let trimmedText = truncateToLength(text, Math.max(budget, 0));
  let droppedChars = text.length - trimmedText.length;
  let cleaned = cleanShellOutputForViewers(trimmedText);
  let escaped = escapeXml(cleaned);
  let output =
    droppedChars === 0 && escaped.length <= budget
      ? escaped
      : escapeXml(
          truncateBeforeEscape(cleaned, budget, (truncatedChars) =>
            formatTruncationNotice(truncatedChars + droppedChars),
          ),
        );
  return `${output}${output === "" ? note : noteSuffix}`;
}
//@ chunk-zjspdyjm.js:2683-2781 placement
function formatTruncationNotice(droppedChars) {
  return `
[output truncated: ${droppedChars.toLocaleString("en-US")} more characters not shown]`;
}
//@ chunk-zjspdyjm.js:2781-2806 placement
var ANSI_SGR_RE = /\x1b\[[0-9;:]*m/g;
//@ chunk-zjspdyjm.js:2806-3441 placement
/**
 * 解析 OSC 序列参数。
 */
function parseOscSequence(sequence) {
  let sgrParams = [];
  let parts = sequence.slice(2, -1).split(";");
  for (let j = 0; j < parts.length; j++) {
    let part = parts[j];
    let head = firstLineOf(part, ":");
    let code = head === "" ? 0 : Number(head);
    if (code === 38 || code === 48 || code === 58) {
      let params = part.includes(":")
        ? part.split(":")
        : parts[j + 1] === "5"
          ? parts.slice(j, j + 3)
          : parts[j + 1] === "2"
            ? parts.slice(j, j + 5)
            : [part];
      if (!part.includes(":")) j += params.length - 1;
      if (code !== 38) continue;
      if (params[1] === "5" && params.length === 3 && isOscNumericParam(params[2]))
        sgrParams.push("38", "5", params[2]);
      else if (params[1] === "2") {
        let sliced = params.slice(-3);
        if ((params.length === 5 || params.length === 6) && sliced.every(isOscNumericParam))
          sgrParams.push("38", "2", ...sliced);
      }
      continue;
    }
    if (
      code === 0 ||
      code === 1 ||
      code === 2 ||
      code === 3 ||
      code === 4 ||
      code === 9 ||
      (code >= 21 && code <= 24) ||
      code === 29 ||
      (code >= 30 && code <= 37) ||
      code === 39 ||
      (code >= 90 && code <= 97)
    )
      sgrParams.push(String(code));
  }
  return sgrParams.length === 0 ? "" : `\x1B[${sgrParams.join(";")}m`;
}
//@ chunk-zjspdyjm.js:3441-3587 placement
function cleanShellOutputForViewers(text, options = {}) {
  if (options.keepColors !== true) return sanitizeTerminalText(text);
  let sgrMatches = text.match(ANSI_SGR_RE) ?? [];
  return text
    .split(ANSI_SGR_RE)
    .map(
      (segment, segmentIndex) =>
        sanitizeTerminalText(segment) +
        (sgrMatches[segmentIndex] === undefined ? "" : parseOscSequence(sgrMatches[segmentIndex])),
    )
    .join("");
}
//@ chunk-zjspdyjm.js:3587-3826 placement
function sanitizeTerminalText(text) {
  return stripAnsiSequences(toWellFormedString(text))
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
//@ chunk-zjspdyjm.js:3826-3879 placement
function isOscNumericParam(param) {
  return param !== undefined && /^\d{1,3}$/.test(param);
}
export {
  cleanShellOutputForViewers,
  BASH_INTERRUPTED_NOTE,
  OTHER_DIRECTORY_WORDS,
  describeSpawnFailure,
  runHeadlessBashCommand,
};
