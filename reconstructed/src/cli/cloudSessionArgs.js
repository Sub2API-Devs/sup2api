/**
 * cli/cloudSessionArgs.ts
 *
 * 2.1.316 新增：--cloud/--environment/--pool 等云会话参数组合校验与剥离
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (11)
 * attribution: placement 11
 */
import { truncateToLength } from "../utils/stringUtils.js";
import { escapeInvisibleChars } from "../utils/resultError.js";
import { jsonStringify } from "../utils/slowOperations.js";

//@ chunk-y162pn60.js:49379-49493 placement
var CLOUD_REATTACH_HINT =
  "To reattach to a cloud session, pass its id: `claude --cloud <session-id>` (find IDs at claude.ai/code).";
//@ chunk-y162pn60.js:49493-49517 placement
function isCloudBackendForced() {
  return false;
}
//@ chunk-y162pn60.js:49517-51403 placement
/**
 * 校验 --cloud/--environment/--pool 与 --print、--continue 等参数组合，返回错误文案。
 */
function validateCloudSessionFlags(flags) {
  let prefix = "Error: ";
  let flagLabel = "--cloud";
  let hintSuffix = `
${CLOUD_REATTACH_HINT}`;
  if (flags.hasPool || flags.hasEnvironmentQuery) {
    let environmentPrefix = environmentFlagErrorPrefix(flags.isChosenByNoMonorepo === true);
    prefix = environmentPrefix.prefix;
    flagLabel = environmentPrefix.flag;
    hintSuffix = "";
  }
  if (flags.print && !flags.hasPool && !flags.isCloudAttach && !flags.headlessCloudPrint) {
    if (flags.loneWordValue !== undefined)
      return `Error: --cloud ${truncateCloudSessionLabel(flags.loneWordValue)} is not a cloud session ID or URL.
With --print, --cloud sends the prompt to an existing cloud session: pass its ID (session_... or cse_...) or its claude.ai/code URL. To start a new cloud session from a description instead, drop --print.`;
    return `Error: ${flagLabel} cannot be combined with --print.
Starting a new cloud session with ${flagLabel} is interactive only: drop --print, or drop ${flagLabel} to run locally. To message an existing cloud session instead, pass its ID: \`claude -p "message" --cloud <session-id>\` (find IDs at claude.ai/code).`;
  }
  if (
    flags.nonInteractive &&
    !flags.hasPool &&
    !flags.isCloudAttach &&
    !flags.headlessCloud &&
    !flags.headlessCloudPrint
  ) {
    if (flags.loneWordValue !== undefined)
      return `Error: --cloud ${truncateCloudSessionLabel(flags.loneWordValue)} is not a cloud session ID or URL.
Without an interactive terminal, --cloud can only send the prompt to an existing cloud session: pass its ID (session_... or cse_...) or its claude.ai/code URL. To start a new cloud session, run from a TTY.`;
    return `Error: ${flagLabel} requires an interactive terminal.
Non-interactive invocations (piped stdout, --init-only, --sdk-url) run locally and would silently ignore ${flagLabel}. Drop ${flagLabel}, or run from a TTY.`;
  }
  if (flags.continue) return `${prefix}${flagLabel} cannot be combined with --continue.${hintSuffix}`;
  if (flags.hasConnect || flags.hasSSH || flags.hasAssistant || flags.hasTeleport) {
    let backend = flags.hasConnect
      ? "a cc:// connect URL"
      : flags.hasSSH
        ? "`claude ssh`"
        : flags.hasAssistant
          ? "`claude assistant`"
          : "--teleport";
    return `${prefix}${flagLabel} cannot be combined with ${backend} \u2014 both select a remote backend; pick one.`;
  }
  if (flags.resume || flags.fromPr) {
    let flag = flags.resume ? "--resume" : "--from-pr";
    return `${prefix}${flagLabel} cannot be combined with ${flag}.${hintSuffix}`;
  }
  return null;
}
//@ chunk-y162pn60.js:51403-51542 placement
function isStreamJsonRemoteMode(flags) {
  return (
    !flags.print &&
    !flags.initOnly &&
    flags.nonInteractive &&
    !flags.hasSdkUrl &&
    flags.inputFormat === "stream-json" &&
    flags.outputFormat === "stream-json"
  );
}
//@ chunk-y162pn60.js:51542-51632 placement
function isPrintNonStreamMode(flags) {
  return flags.print && !flags.initOnly && !flags.hasSdkUrl && flags.outputFormat !== "stream-json";
}
//@ chunk-y162pn60.js:51632-52016 placement
function rejectBgWithEnvironmentFlags(args) {
  if (
    args.some(
      (arg) =>
        arg === "--environment" ||
        arg.startsWith("--environment=") ||
        arg === "--pool" ||
        arg.startsWith("--pool="),
    )
  )
    return "--bg and --environment are different backends. Use `claude -p '<task>' --environment <id>` directly to start a session on the environment.";
  return "--bg and --cloud are different backends. Use `claude --cloud '<task>'` directly to start a cloud session.";
}
//@ chunk-y162pn60.js:52016-52078 placement
function environmentFlagErrorPrefix(noMonorepo) {
  return {
    prefix: "Error: ",
    flag: "--environment",
  };
}
//@ chunk-y162pn60.js:52078-52313 placement
function hasRemoteBackendFlags(args) {
  if (
    args.some(
      (arg) =>
        arg === "--environment" ||
        arg.startsWith("--environment=") ||
        arg === "--pool" ||
        arg.startsWith("--pool="),
    )
  )
    return true;
  return args.some(
    (arg) =>
      arg === "--cloud" || arg.startsWith("--cloud=") || arg === "--remote" || arg.startsWith("--remote="),
  );
}
//@ chunk-y162pn60.js:52313-52618 placement
function stripEnvironmentFlags(args) {
  let kept = [];
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    if (arg === "--") {
      for (let index = j; index < args.length; index++) kept.push(args[index]);
      break;
    }
    if (arg.startsWith("--environment=") || arg.startsWith("--pool=")) continue;
    if (arg === "--environment" || arg === "--pool") {
      if (args[j + 1] !== undefined && !args[j + 1].startsWith("-")) j++;
      continue;
    }
    kept.push(arg);
  }
  return kept;
}
//@ chunk-y162pn60.js:52618-52629 placement
var MAX_CLOUD_SESSION_LABEL_CHARS = 100;
//@ chunk-y162pn60.js:52629-52708 placement
function truncateCloudSessionLabel(label) {
  let truncated = truncateToLength(label, MAX_CLOUD_SESSION_LABEL_CHARS);
  return escapeInvisibleChars(
    jsonStringify(truncated.length < label.length ? `${truncated}\u2026` : truncated),
  );
}
export {
  environmentFlagErrorPrefix,
  isCloudBackendForced,
  truncateCloudSessionLabel,
  isStreamJsonRemoteMode,
  isPrintNonStreamMode,
  validateCloudSessionFlags,
  stripEnvironmentFlags,
  hasRemoteBackendFlags,
  rejectBgWithEnvironmentFlags,
};
