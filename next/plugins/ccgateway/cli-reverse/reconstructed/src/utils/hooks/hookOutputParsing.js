/**
 * utils/hooks/hookOutputParsing.ts
 *
 * 2.1.316 新增：钩子输出解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getHookEventEmitState, getHookMessageTexts } from "./hookEventHelpers.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { hookJSONOutputSchema, isSyncHookJSONOutput } from "../../types/hooks.js";
import { hasMcpInboundDoor, MAX_NESTING_PARSED } from "../../services/mcp/mcpInboundDoor.js";
import { isJsonNestingWithin, countJsonMembers } from "../jsonScan.js";
import { jsonParse } from "../slowOperations.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:948464-948513 placement
/**
 * 打开/关闭"发送全部钩子事件"的 SDK 开关。
 */
function setAllHookEventsEnabled(enabled) {
  getHookEventEmitState().setAllHookEventsEnabled(enabled);
}
//@ chunk-5xgkngpb.js:948513-948684 placement
/**
 * 读取并清除 CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS，开启 UserPromptSubmit 开始/结束事件。
 */
function consumeUserPromptSubmitEventsEnv() {
  if (env.CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS)
    getHookEventEmitState().userPromptSubmitStartAndEndEnabled = true;
  env.unset("CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS");
}
//@ chunk-5xgkngpb.js:948684-949339 placement
/**
 * 校验钩子 JSON 输出的键，给出拼写建议。
 */
function validateHookJsonOutput(output, schema) {
  if (!output || typeof output !== "object" || Array.isArray(output) || !schema || typeof schema !== "object")
    return;
  let unknownKeys = [];
  let allowedKeys = new Set(Object.keys(schema));
  for (let key of Object.keys(output)) if (!allowedKeys.has(key)) unknownKeys.push(key);
  let hookSpecificOutput = output.hookSpecificOutput;
  let hookSpecificOutput_2 = "hookSpecificOutput" in schema ? schema.hookSpecificOutput : undefined;
  if (
    hookSpecificOutput &&
    typeof hookSpecificOutput === "object" &&
    !Array.isArray(hookSpecificOutput) &&
    hookSpecificOutput_2 &&
    typeof hookSpecificOutput_2 === "object"
  ) {
    let nestedAllowed = new Set(Object.keys(hookSpecificOutput_2));
    for (let key of Object.keys(hookSpecificOutput))
      if (!nestedAllowed.has(key)) unknownKeys.push(`hookSpecificOutput.${key}`);
  }
  if (unknownKeys.length === 0) return;
  let hint = unknownKeys.includes("additionalContext")
    ? " Did you mean hookSpecificOutput.additionalContext (with a hookEventName)?"
    : "";
  logForDebugging(`Hook JSON output had unrecognized keys (ignored): ${unknownKeys.join(", ")}.${hint}`);
}
//@ chunk-5xgkngpb.js:949339-949580 placement
function findSyncJsonAnswer(value, { objectIn: reader } = createHookJsonReader()) {
  let lines = value.trim().split(`
`);
  let [firstLine = ""] = lines;
  let parsed = reader(firstLine.trim());
  let candidates = [
    (parsed !== undefined && "async" in parsed ? lines.slice(1) : lines)
      .join(
        `
`,
      )
      .trim(),
    ...lines.map((line) => line.trim()),
  ];
  for (let candidate of candidates) {
    let json = reader(candidate);
    if (json !== undefined && !("async" in json)) return json;
  }
  return;
}
//@ chunk-5xgkngpb.js:949580-949766 placement
function hasUnparsedJsonLine(value, { objectIn: reader, leftSomeUnparsed } = createHookJsonReader()) {
  let isAsync = (text) => "async" in (reader(text) ?? {});
  return (
    !isAsync(value.trim()) &&
    value
      .split(
        `
`,
      )
      .some((line) => {
        let text = line.trim();
        return text.startsWith("{") && !isAsync(text);
      }) &&
    !leftSomeUnparsed()
  );
}
//@ chunk-5xgkngpb.js:949766-951012 placement
/**
 * 解析异步钩子的 JSON 输出，校验 systemMessage 等字段。
 */
function parseAsyncHookOutput(output, hookName) {
  if (!isPlainObject_6(output)) {
    logForDebugging(
      `${hookName} async hook JSON output must be an object, got ${jsonTypeLabel(output)} \u2014 ignored`,
      {
        level: "error",
      },
    );
    return {};
  }
  let parsed = hookJSONOutputSchema().safeParse(output);
  if (parsed.success && isSyncHookJSONOutput(parsed.data)) {
    validateHookJsonOutput(output, parsed.data);
    return parsed.data;
  }
  let dropped = [];
  let result = {};
  if ("systemMessage" in output)
    if (typeof output.systemMessage === "string") result.systemMessage = output.systemMessage;
    else dropped.push(`systemMessage (${jsonTypeLabel(output.systemMessage)})`);
  if ("metrics" in output)
    if (isPlainObject_6(output.metrics)) {
      let filtered = Object.entries(output.metrics).filter(
        (entry) => typeof entry[1] === "boolean" || typeof entry[1] === "number",
      );
      result.metrics = Object.fromEntries(filtered);
    } else dropped.push(`metrics (${jsonTypeLabel(output.metrics)})`);
  if ("hookSpecificOutput" in output)
    if (isPlainObject_6(output.hookSpecificOutput)) {
      let { additionalContext, ...rest } = output.hookSpecificOutput;
      let hasContext = typeof additionalContext === "string";
      if (!hasContext && additionalContext !== undefined)
        dropped.push(`hookSpecificOutput.additionalContext (${jsonTypeLabel(additionalContext)})`);
      result.hookSpecificOutput = hasContext ? output.hookSpecificOutput : rest;
    } else dropped.push(`hookSpecificOutput (${jsonTypeLabel(output.hookSpecificOutput)})`);
  let issue = parsed.success ? undefined : parsed.error.issues[0];
  let issueText = issue
    ? `${issue.path.join(".") || "(root)"}: ${issue.message}`
    : "async-marker response where a sync response was expected";
  logForDebugging(
    `${hookName} async hook JSON output failed schema validation (${issueText})` +
      (dropped.length > 0
        ? `; ignored malformed field(s): ${dropped.join(", ")}`
        : "; delivering recognized fields as-is"),
    {
      level: dropped.length > 0 ? "error" : "debug",
    },
  );
  return result;
}
//@ chunk-5xgkngpb.js:951012-951111 placement
function jsonTypeLabel(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}
//@ chunk-5xgkngpb.js:951111-951123 placement
var MAX_JSON_KEYS_BUDGET = 256;
//@ chunk-5xgkngpb.js:951123-951496 placement
/**
 * 存在 MCP 入站通道时创建 JSON 解析预算：限制嵌套深度和成员总数。
 */
function createJsonParseBudget() {
  if (!hasMcpInboundDoor()) return () => true;
  let budget = MAX_JSON_KEYS_BUDGET;
  let noted = false;
  return (text) => {
    let usage =
      budget > 0 && isJsonNestingWithin(text, MAX_NESTING_PARSED)
        ? countJsonMembers(text, budget, 0)
        : undefined;
    if (usage !== undefined) {
      budget -= Math.max(usage.members, 1);
      return true;
    }
    if (!noted) {
      noted = true;
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
//@ chunk-5xgkngpb.js:951496-951788 placement
function createHookJsonReader() {
  if (!hasMcpInboundDoor())
    return {
      objectIn: parseJsonObjectOrUndefined,
      leftSomeUnparsed: () => false,
    };
  let budgets = {
    aLine: createJsonParseBudget(),
    severalLines: createJsonParseBudget(),
  };
  let cache = new Map();
  let dropped = false;
  return {
    objectIn: (text) => {
      if (text.startsWith("{") && !cache.has(text))
        if (
          budgets[
            text.includes(`
`)
              ? "severalLines"
              : "aLine"
          ](text)
        )
          cache.set(text, parseJsonObjectOrUndefined(text));
        else dropped = true;
      return cache.get(text);
    },
    leftSomeUnparsed: () => dropped,
  };
}
//@ chunk-5xgkngpb.js:951788-951884 placement
function parseJsonObjectOrUndefined(text) {
  if (!text.startsWith("{")) return;
  try {
    let parsed = jsonParse(text);
    return isPlainObject_6(parsed) ? parsed : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:951884-952590 placement
/**
 * 异步 hook 注册状态：待完成 hook、未投递的响应、会话环境是否过期等。
 */
class AsyncHookRegistryState {
  pendingHooks = new Map();
  undeliveredResponses = [];
  holdsAnswerForModel = false;
  plainOutputs = {
    held: 0,
    polled: 0,
  };
  isSessionEnvStale = false;
  register(hook) {
    this.pendingHooks.set(hook.processId, hook);
  }
  get(processId) {
    return this.pendingHooks.get(processId);
  }
  values() {
    return Array.from(this.pendingHooks.values());
  }
  size() {
    return this.pendingHooks.size;
  }
  remove(processId) {
    this.pendingHooks.delete(processId);
  }
  removeAll() {
    this.pendingHooks.clear();
    this.takeUndeliveredResponses();
    this.isSessionEnvStale = false;
  }
  holdResponse(response) {
    this.undeliveredResponses.push(response);
    if (response.isPlainOutput) this.plainOutputs.held++;
    this.holdsAnswerForModel ||= !response.isPlainOutput && getHookMessageTexts(response.response).length > 0;
  }
  takeUndeliveredResponses() {
    this.holdsAnswerForModel = false;
    return this.undeliveredResponses.splice(0);
  }
}
//@ chunk-5xgkngpb.js:952590-952617 placement
var asyncHookRegistryStateRegistry; // deferred: uses AsyncHookRegistryState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:952590", () => {
  asyncHookRegistryStateRegistry = new HostScoped(() => new AsyncHookRegistryState());
});
//@ chunk-5xgkngpb.js:952617-952656 placement
/**
 * 取当前宿主的异步钩子注册状态。
 */
function currentAsyncHookRegistryState() {
  return asyncHookRegistryStateRegistry.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:3479954-3480121 placement
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
//@ chunk-5xgkngpb.js:3480121-3480231 placement
/**
 * 扫描钩子输出中的 started/result/exited 标记段。
 */
function scanHookOutputMarkers(state, marker) {
  state.scanFrom = stripHookOutputMarkers(state, "stderr", state.scanFrom, marker);
  state.stdoutScanFrom = stripHookOutputMarkers(state, "stdout", state.stdoutScanFrom, marker);
}
//@ chunk-5xgkngpb.js:3480231-3481197 placement
/**
 * 从 hook 输出中剥离 started/result/exited 标记段并解析结果，记录冲突。
 */
function stripHookOutputMarkers(state, stream, fromIndex, marker) {
  let startMarker = `
${marker} started
`;
  let index = state[stream].indexOf(startMarker, fromIndex);
  while (index !== -1) {
    state.started = true;
    spliceOutputSegment(state, stream, index, index + startMarker.length);
    index = state[stream].indexOf(startMarker, index);
  }
  let resultMarker = `
${marker} result `;
  index = state[stream].indexOf(resultMarker, fromIndex);
  while (index !== -1) {
    let index_2 = state[stream].indexOf(
      `
`,
      index + resultMarker.length,
    );
    if (index_2 === -1) break;
    let sliced = state[stream].slice(index + resultMarker.length, index_2);
    spliceOutputSegment(state, stream, index, index_2 + 1);
    let parsed;
    try {
      parsed = jsonParse(sliced);
    } catch {
      state.resultConflict = true;
      index = state[stream].indexOf(resultMarker, index);
      continue;
    }
    let resultWasString = typeof parsed === "string";
    let stdout = typeof parsed === "string" ? parsed : sliced;
    if (state.resultStdout !== undefined && state.resultStdout !== stdout) state.resultConflict = true;
    state.resultStdout = stdout;
    state.resultWasString = resultWasString;
    index = state[stream].indexOf(resultMarker, index);
  }
  let exitMarker = `
${marker} exited `;
  index = state[stream].indexOf(exitMarker, fromIndex);
  while (index !== -1) {
    let index_2 = state[stream].indexOf(
      `
`,
      index + exitMarker.length,
    );
    if (index_2 === -1) break;
    let sliced = state[stream].slice(index + exitMarker.length, index_2);
    if (!/^\d{1,3}$/.test(sliced)) {
      spliceOutputSegment(state, stream, index, index_2 + 1);
      state.resultConflict = true;
      index = state[stream].indexOf(exitMarker, index);
      continue;
    }
    let status = Number(sliced);
    spliceOutputSegment(state, stream, index, index_2 + 1);
    state.exitStatus = state.exitStatus === 2 ? 2 : status;
    index = state[stream].indexOf(exitMarker, index);
  }
  let index_2 = state[stream].indexOf(
    `
${marker} `,
    fromIndex,
  );
  let max = Math.max(0, state[stream].length - (marker.length + 16));
  return index_2 === -1 ? max : Math.min(index_2, max);
}
//@ chunk-5xgkngpb.js:3481197-3481253 placement
/**
 * 合并退出码：2（阻断）优先，否则取新值。
 */
function strongerExitStatus(code, exitStatus) {
  if (exitStatus === undefined) return;
  return code === 2 ? 2 : exitStatus;
}
//@ chunk-5xgkngpb.js:3481253-3481426 placement (2.1.88 match: sameSessionId, 0.656)
/**
 * 从输出缓冲的某字段剪掉一段并在 output 中删除相同文本（与 bridge 无关）。
 */
function spliceOutputSegment(state, stream, from, to) {
  let streamText = state[stream];
  let sliced = streamText.slice(from, to);
  state[stream] = streamText.slice(0, from) + streamText.slice(to);
  let index = state.output.lastIndexOf(sliced);
  if (index !== -1) state.output = state.output.slice(0, index) + state.output.slice(index + sliced.length);
}
export {
  currentAsyncHookRegistryState,
  createHookJsonReader,
  findSyncJsonAnswer,
  parseAsyncHookOutput,
  hasUnparsedJsonLine,
  createJsonParseBudget,
  validateHookJsonOutput,
  emptyHookOutputState,
  scanHookOutputMarkers,
  strongerExitStatus,
  setAllHookEventsEnabled,
  consumeUserPromptSubmitEventsEnv,
};
