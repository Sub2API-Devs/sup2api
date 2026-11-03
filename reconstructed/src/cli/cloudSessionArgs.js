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
function validateCloudSessionFlags(e) {
  let n = "Error: ";
  let r = "--cloud";
  let s = `
${CLOUD_REATTACH_HINT}`;
  if (e.hasPool || e.hasEnvironmentQuery) {
    let f = environmentFlagErrorPrefix(e.isChosenByNoMonorepo === true);
    n = f.prefix;
    r = f.flag;
    s = "";
  }
  if (e.print && !e.hasPool && !e.isCloudAttach && !e.headlessCloudPrint) {
    if (e.loneWordValue !== undefined)
      return `Error: --cloud ${truncateCloudSessionLabel(e.loneWordValue)} is not a cloud session ID or URL.
With --print, --cloud sends the prompt to an existing cloud session: pass its ID (session_... or cse_...) or its claude.ai/code URL. To start a new cloud session from a description instead, drop --print.`;
    return `Error: ${r} cannot be combined with --print.
Starting a new cloud session with ${r} is interactive only: drop --print, or drop ${r} to run locally. To message an existing cloud session instead, pass its ID: \`claude -p "message" --cloud <session-id>\` (find IDs at claude.ai/code).`;
  }
  if (e.nonInteractive && !e.hasPool && !e.isCloudAttach && !e.headlessCloud && !e.headlessCloudPrint) {
    if (e.loneWordValue !== undefined)
      return `Error: --cloud ${truncateCloudSessionLabel(e.loneWordValue)} is not a cloud session ID or URL.
Without an interactive terminal, --cloud can only send the prompt to an existing cloud session: pass its ID (session_... or cse_...) or its claude.ai/code URL. To start a new cloud session, run from a TTY.`;
    return `Error: ${r} requires an interactive terminal.
Non-interactive invocations (piped stdout, --init-only, --sdk-url) run locally and would silently ignore ${r}. Drop ${r}, or run from a TTY.`;
  }
  if (e.continue) return `${n}${r} cannot be combined with --continue.${s}`;
  if (e.hasConnect || e.hasSSH || e.hasAssistant || e.hasTeleport) {
    let f = e.hasConnect
      ? "a cc:// connect URL"
      : e.hasSSH
        ? "`claude ssh`"
        : e.hasAssistant
          ? "`claude assistant`"
          : "--teleport";
    return `${n}${r} cannot be combined with ${f} \u2014 both select a remote backend; pick one.`;
  }
  if (e.resume || e.fromPr) {
    let f = e.resume ? "--resume" : "--from-pr";
    return `${n}${r} cannot be combined with ${f}.${s}`;
  }
  return null;
}
//@ chunk-y162pn60.js:51403-51542 placement
function isStreamJsonRemoteMode(e) {
  return (
    !e.print &&
    !e.initOnly &&
    e.nonInteractive &&
    !e.hasSdkUrl &&
    e.inputFormat === "stream-json" &&
    e.outputFormat === "stream-json"
  );
}
//@ chunk-y162pn60.js:51542-51632 placement
function isPrintNonStreamMode(e) {
  return e.print && !e.initOnly && !e.hasSdkUrl && e.outputFormat !== "stream-json";
}
//@ chunk-y162pn60.js:51632-52016 placement
function rejectBgWithEnvironmentFlags(e) {
  if (
    e.some(
      (n) =>
        n === "--environment" || n.startsWith("--environment=") || n === "--pool" || n.startsWith("--pool="),
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
function hasRemoteBackendFlags(e) {
  if (
    e.some(
      (n) =>
        n === "--environment" || n.startsWith("--environment=") || n === "--pool" || n.startsWith("--pool="),
    )
  )
    return true;
  return e.some(
    (n) => n === "--cloud" || n.startsWith("--cloud=") || n === "--remote" || n.startsWith("--remote="),
  );
}
//@ chunk-y162pn60.js:52313-52618 placement
function stripEnvironmentFlags(e) {
  let n = [];
  for (let j = 0; j < e.length; j++) {
    let s = e[j];
    if (s === "--") {
      for (let f = j; f < e.length; f++) n.push(e[f]);
      break;
    }
    if (s.startsWith("--environment=") || s.startsWith("--pool=")) continue;
    if (s === "--environment" || s === "--pool") {
      if (e[j + 1] !== undefined && !e[j + 1].startsWith("-")) j++;
      continue;
    }
    n.push(s);
  }
  return n;
}
//@ chunk-y162pn60.js:52618-52629 placement
var MAX_CLOUD_SESSION_LABEL_CHARS = 100;
//@ chunk-y162pn60.js:52629-52708 placement
function truncateCloudSessionLabel(e) {
  let n = truncateToLength(e, MAX_CLOUD_SESSION_LABEL_CHARS);
  return escapeInvisibleChars(jsonStringify(n.length < e.length ? `${n}\u2026` : n));
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
