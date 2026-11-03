/**
 * utils/hooks/hookOutputParsing.ts
 *
 * 2.1.316 新增：钩子输出解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { getHookEventEmitState, getHookMessageTexts } from "./hookEventHelpers.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { hookJSONOutputSchema, isSyncHookJSONOutput } from "../../types/hooks.js";
import { hasMcpInboundDoor, MAX_NESTING_PARSED } from "../../services/mcp/mcpInboundDoor.js";
import { isJsonNestingWithin, countJsonMembers } from "../jsonScan.js";
import { jsonParse } from "../slowOperations.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:937271-937320 placement
/**
 * 打开/关闭"发送全部钩子事件"的 SDK 开关。
 */
function setAllHookEventsEnabled(enabled) {
  getHookEventEmitState().setAllHookEventsEnabled(enabled);
}
//@ chunk-e6aww6q8.js:937320-937491 placement
/**
 * 读取并清除 CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS，开启 UserPromptSubmit 开始/结束事件。
 */
function consumeUserPromptSubmitEventsEnv() {
  if (env.CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS)
    getHookEventEmitState().userPromptSubmitStartAndEndEnabled = true;
  env.unset("CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS");
}
//@ chunk-e6aww6q8.js:937491-938146 placement
/**
 * 校验钩子 JSON 输出的键，给出拼写建议。
 */
function validateHookJsonOutput(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e) || !n || typeof n !== "object") return;
  let r = [];
  let s = new Set(Object.keys(n));
  for (let key of Object.keys(e)) if (!s.has(key)) r.push(key);
  let hookSpecificOutput = e.hookSpecificOutput;
  let hookSpecificOutput_2 = "hookSpecificOutput" in n ? n.hookSpecificOutput : undefined;
  if (
    hookSpecificOutput &&
    typeof hookSpecificOutput === "object" &&
    !Array.isArray(hookSpecificOutput) &&
    hookSpecificOutput_2 &&
    typeof hookSpecificOutput_2 === "object"
  ) {
    let w = new Set(Object.keys(hookSpecificOutput_2));
    for (let key of Object.keys(hookSpecificOutput)) if (!w.has(key)) r.push(`hookSpecificOutput.${key}`);
  }
  if (r.length === 0) return;
  let S = r.includes("additionalContext")
    ? " Did you mean hookSpecificOutput.additionalContext (with a hookEventName)?"
    : "";
  logForDebugging(`Hook JSON output had unrecognized keys (ignored): ${r.join(", ")}.${S}`);
}
//@ chunk-e6aww6q8.js:938146-938387 placement
function findSyncJsonAnswer(stdout, { objectIn: n } = createHookJsonReader()) {
  let lines = stdout.trim().split(`
`);
  let [s = ""] = lines;
  let h = n(s.trim());
  let y = [
    (h !== undefined && "async" in h ? lines.slice(1) : lines)
      .join(
        `
`,
      )
      .trim(),
    ...lines.map((line) => line.trim()),
  ];
  for (let S of y) {
    let w = n(S);
    if (w !== undefined && !("async" in w)) return w;
  }
  return;
}
//@ chunk-e6aww6q8.js:938387-938573 placement
function hasUnparsedJsonLine(stdout, { objectIn: n, leftSomeUnparsed: r } = createHookJsonReader()) {
  let s = (y) => "async" in (n(y) ?? {});
  return (
    !s(stdout.trim()) &&
    stdout
      .split(
        `
`,
      )
      .some((line) => {
        let trimmed = line.trim();
        return trimmed.startsWith("{") && !s(trimmed);
      }) &&
    !r()
  );
}
//@ chunk-e6aww6q8.js:938573-939819 placement
/**
 * 解析异步钩子的 JSON 输出，校验 systemMessage 等字段。
 */
function parseAsyncHookOutput(syncJsonAnswer, hookName) {
  if (!isPlainObject_5(syncJsonAnswer)) {
    logForDebugging(
      `${hookName} async hook JSON output must be an object, got ${jsonTypeLabel(syncJsonAnswer)} \u2014 ignored`,
      {
        level: "error",
      },
    );
    return {};
  }
  let r = hookJSONOutputSchema().safeParse(syncJsonAnswer);
  if (r.success && isSyncHookJSONOutput(r.data)) {
    validateHookJsonOutput(syncJsonAnswer, r.data);
    return r.data;
  }
  let s = [];
  let h = {};
  if ("systemMessage" in syncJsonAnswer)
    if (typeof syncJsonAnswer.systemMessage === "string") h.systemMessage = syncJsonAnswer.systemMessage;
    else s.push(`systemMessage (${jsonTypeLabel(syncJsonAnswer.systemMessage)})`);
  if ("metrics" in syncJsonAnswer)
    if (isPlainObject_5(syncJsonAnswer.metrics)) {
      let filtered = Object.entries(syncJsonAnswer.metrics).filter(
        (L) => typeof L[1] === "boolean" || typeof L[1] === "number",
      );
      h.metrics = Object.fromEntries(filtered);
    } else s.push(`metrics (${jsonTypeLabel(syncJsonAnswer.metrics)})`);
  if ("hookSpecificOutput" in syncJsonAnswer)
    if (isPlainObject_5(syncJsonAnswer.hookSpecificOutput)) {
      let { additionalContext, ...L } = syncJsonAnswer.hookSpecificOutput;
      let G = typeof additionalContext === "string";
      if (!G && additionalContext !== undefined)
        s.push(`hookSpecificOutput.additionalContext (${jsonTypeLabel(additionalContext)})`);
      h.hookSpecificOutput = G ? syncJsonAnswer.hookSpecificOutput : L;
    } else s.push(`hookSpecificOutput (${jsonTypeLabel(syncJsonAnswer.hookSpecificOutput)})`);
  let y = r.success ? undefined : r.error.issues[0];
  let S = y
    ? `${y.path.join(".") || "(root)"}: ${y.message}`
    : "async-marker response where a sync response was expected";
  logForDebugging(
    `${hookName} async hook JSON output failed schema validation (${S})` +
      (s.length > 0
        ? `; ignored malformed field(s): ${s.join(", ")}`
        : "; delivering recognized fields as-is"),
    {
      level: s.length > 0 ? "error" : "debug",
    },
  );
  return h;
}
//@ chunk-e6aww6q8.js:939819-939918 placement
function jsonTypeLabel(e) {
  if (e === null) return "null";
  if (Array.isArray(e)) return "an array";
  return `a ${typeof e}`;
}
//@ chunk-e6aww6q8.js:939918-939930 placement
var MAX_JSON_KEYS_BUDGET = 256;
//@ chunk-e6aww6q8.js:939930-940304 placement
/**
 * 存在 MCP 入站通道时创建 JSON 解析预算：限制嵌套深度和成员总数。
 */
function createJsonParseBudget() {
  if (!hasMcpInboundDoor()) return () => true;
  let e = MAX_JSON_KEYS_BUDGET;
  let n = false;
  return (r) => {
    let s = e > 0 && isJsonNestingWithin(r, MAX_NESTING_PARSED) ? countJsonMembers(r, e, 0) : undefined;
    if (s !== undefined) {
      e -= Math.max(s.members, 1);
      return true;
    }
    if (!n) {
      n = true;
      logForDebugging(
        `Hooks: part of a background hook's output was not read as JSON: reading it would parse more than ${MAX_JSON_KEYS_BUDGET} JSON keys in all, or it nests too deep. Print one answer with fewer keys.`,
        {
          level: "error",
        },
      );
    }
    return false;
  };
}
//@ chunk-e6aww6q8.js:940304-940597 placement
function createHookJsonReader() {
  if (!hasMcpInboundDoor())
    return {
      objectIn: parseJsonObjectOrUndefined,
      leftSomeUnparsed: () => false,
    };
  let e = {
    aLine: createJsonParseBudget(),
    severalLines: createJsonParseBudget(),
  };
  let n = new Map();
  let r = false;
  return {
    objectIn: (s) => {
      if (s.startsWith("{") && !n.has(s))
        if (
          e[
            s.includes(`
`)
              ? "severalLines"
              : "aLine"
          ](s)
        )
          n.set(s, parseJsonObjectOrUndefined(s));
        else r = true;
      return n.get(s);
    },
    leftSomeUnparsed: () => r,
  };
}
//@ chunk-e6aww6q8.js:940597-940693 placement
function parseJsonObjectOrUndefined(e) {
  if (!e.startsWith("{")) return;
  try {
    let n = jsonParse(e);
    return isPlainObject_5(n) ? n : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:940693-941306 placement
/**
 * 异步 hook 注册状态：待完成 hook、未投递的响应、会话环境是否过期等。
 */
class AsyncHookRegistryState {
  pendingHooks = new Map();
  undeliveredResponses = [];
  holdsAnswerForModel = false;
  isSessionEnvStale = false;
  register(e) {
    this.pendingHooks.set(e.processId, e);
  }
  get(e) {
    return this.pendingHooks.get(e);
  }
  values() {
    return Array.from(this.pendingHooks.values());
  }
  size() {
    return this.pendingHooks.size;
  }
  remove(e) {
    this.pendingHooks.delete(e);
  }
  removeAll() {
    this.pendingHooks.clear();
    this.takeUndeliveredResponses();
    this.isSessionEnvStale = false;
  }
  holdResponse(e) {
    this.undeliveredResponses.push(e);
    this.holdsAnswerForModel ||= getHookMessageTexts(e.response).length > 0;
  }
  takeUndeliveredResponses() {
    this.holdsAnswerForModel = false;
    return this.undeliveredResponses.splice(0);
  }
}
//@ chunk-e6aww6q8.js:941306-941333 placement
var asyncHookRegistryStateRegistry = new HostScoped(() => new AsyncHookRegistryState());
//@ chunk-e6aww6q8.js:941333-941372 placement
/**
 * 取当前宿主的异步钩子注册状态。
 */
function currentAsyncHookRegistryState() {
  return asyncHookRegistryStateRegistry.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3391747-3391914 placement
/**
 * 创建空的钩子输出解析状态（stdout/stderr/退出码等字段）。
 */
function emptyHookOutputState() {
  return {
    stderr: "",
    stdout: "",
    output: "",
    started: false,
    exitStatus: undefined,
    resultStdout: undefined,
    resultWasString: false,
    resultConflict: false,
    scanFrom: 0,
    stdoutScanFrom: 0,
  };
}
//@ chunk-e6aww6q8.js:3391914-3392024 placement
/**
 * 扫描钩子输出中的 started/result/exited 标记段。
 */
function scanHookOutputMarkers(state, marker) {
  state.scanFrom = stripHookOutputMarkers(state, "stderr", state.scanFrom, marker);
  state.stdoutScanFrom = stripHookOutputMarkers(state, "stdout", state.stdoutScanFrom, marker);
}
//@ chunk-e6aww6q8.js:3392024-3392984 placement
/**
 * 从 hook 输出中剥离 started/result/exited 标记段并解析结果，记录冲突。
 */
function stripHookOutputMarkers(state, stream, fromIndex, marker) {
  let h = `
${marker} started
`;
  let index = state[stream].indexOf(h, fromIndex);
  while (index !== -1) {
    state.started = true;
    spliceOutputSegment(state, stream, index, index + h.length);
    index = state[stream].indexOf(h, index);
  }
  let S = `
${marker} result `;
  index = state[stream].indexOf(S, fromIndex);
  while (index !== -1) {
    let index_2 = state[stream].indexOf(
      `
`,
      index + S.length,
    );
    if (index_2 === -1) break;
    let sliced = state[stream].slice(index + S.length, index_2);
    spliceOutputSegment(state, stream, index, index_2 + 1);
    let Se;
    try {
      Se = jsonParse(sliced);
    } catch {
      state.resultConflict = true;
      index = state[stream].indexOf(S, index);
      continue;
    }
    let resultWasString = typeof Se === "string";
    let we = typeof Se === "string" ? Se : sliced;
    if (state.resultStdout !== undefined && state.resultStdout !== we) state.resultConflict = true;
    state.resultStdout = we;
    state.resultWasString = resultWasString;
    index = state[stream].indexOf(S, index);
  }
  let w = `
${marker} exited `;
  index = state[stream].indexOf(w, fromIndex);
  while (index !== -1) {
    let index_2 = state[stream].indexOf(
      `
`,
      index + w.length,
    );
    if (index_2 === -1) break;
    let sliced = state[stream].slice(index + w.length, index_2);
    if (!/^\d{1,3}$/.test(sliced)) {
      spliceOutputSegment(state, stream, index, index_2 + 1);
      state.resultConflict = true;
      index = state[stream].indexOf(w, index);
      continue;
    }
    let Se = Number(sliced);
    spliceOutputSegment(state, stream, index, index_2 + 1);
    state.exitStatus = state.exitStatus === 2 ? 2 : Se;
    index = state[stream].indexOf(w, index);
  }
  let index_2 = state[stream].indexOf(
    `
${marker} `,
    fromIndex,
  );
  let max = Math.max(0, state[stream].length - (marker.length + 16));
  return index_2 === -1 ? max : Math.min(index_2, max);
}
//@ chunk-e6aww6q8.js:3392984-3393040 placement
/**
 * 合并退出码：2（阻断）优先，否则取新值。
 */
function strongerExitStatus(code, exitStatus) {
  if (exitStatus === undefined) return;
  return code === 2 ? 2 : exitStatus;
}
//@ chunk-e6aww6q8.js:3393040-3393213 placement = sameSessionId (0.656)
/**
 * 从输出缓冲的某字段剪掉一段并在 output 中删除相同文本（与 bridge 无关）。
 */
function spliceOutputSegment(state, stream, r, s) {
  let h = state[stream];
  let sliced = h.slice(r, s);
  state[stream] = h.slice(0, r) + h.slice(s);
  let index = state.output.lastIndexOf(sliced);
  if (index !== -1) state.output = state.output.slice(0, index) + state.output.slice(index + sliced.length);
}
export {
  currentAsyncHookRegistryState,
  setAllHookEventsEnabled,
  consumeUserPromptSubmitEventsEnv,
  createHookJsonReader,
  findSyncJsonAnswer,
  parseAsyncHookOutput,
  hasUnparsedJsonLine,
  createJsonParseBudget,
  validateHookJsonOutput,
  emptyHookOutputState,
  scanHookOutputMarkers,
  strongerExitStatus,
};
