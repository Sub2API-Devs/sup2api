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
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { hookJSONOutputSchema, isSyncHookJSONOutput } from "../../types/hooks.js";
import { hasMcpInboundDoor, MAX_NESTING_PARSED } from "../../services/mcp/mcpInboundDoor.js";
import { isJsonNestingWithin, countJsonMembers } from "../jsonScan.js";
import { jsonParse } from "../slowOperations.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

/**
 * 打开/关闭"发送全部钩子事件"的 SDK 开关。
 */
//@ chunk-e6aww6q8.js:937271-937320 placement
function setAllHookEventsEnabled(enabled) {
  getHookEventEmitState().setAllHookEventsEnabled(enabled);
}
/**
 * 读取并清除 CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS，开启 UserPromptSubmit 开始/结束事件。
 */
//@ chunk-e6aww6q8.js:937320-937491 placement
function consumeUserPromptSubmitEventsEnv() {
  if (env.CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS)
    getHookEventEmitState().userPromptSubmitStartAndEndEnabled = !0;
  env.unset("CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS");
}
/**
 * 校验钩子 JSON 输出的键，给出拼写建议。
 */
//@ chunk-e6aww6q8.js:937491-938146 placement
function validateHookJsonOutput(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e) || !n || typeof n !== "object") return;
  let r = [],
    s = new Set(Object.keys(n));
  for (let w of Object.keys(e)) if (!s.has(w)) r.push(w);
  let hookSpecificOutput = e.hookSpecificOutput,
    y = "hookSpecificOutput" in n ? n.hookSpecificOutput : void 0;
  if (
    hookSpecificOutput &&
    typeof hookSpecificOutput === "object" &&
    !Array.isArray(hookSpecificOutput) &&
    y &&
    typeof y === "object"
  ) {
    let w = new Set(Object.keys(y));
    for (let L of Object.keys(hookSpecificOutput)) if (!w.has(L)) r.push(`hookSpecificOutput.${L}`);
  }
  if (r.length === 0) return;
  let S = r.includes("additionalContext")
    ? " Did you mean hookSpecificOutput.additionalContext (with a hookEventName)?"
    : "";
  logForDebugging(`Hook JSON output had unrecognized keys (ignored): ${r.join(", ")}.${S}`);
}
//@ chunk-e6aww6q8.js:938146-938387 placement
function findSyncJsonAnswer(e, { objectIn: n } = createHookJsonReader()) {
  let parts = e.trim().split(`
`),
    [s = ""] = parts,
    h = n(s.trim()),
    y = [
      (h !== void 0 && "async" in h ? parts.slice(1) : parts)
        .join(
          `
`,
        )
        .trim(),
      ...parts.map((S) => S.trim()),
    ];
  for (let S of y) {
    let w = n(S);
    if (w !== void 0 && !("async" in w)) return w;
  }
  return;
}
//@ chunk-e6aww6q8.js:938387-938573 placement
function hasUnparsedJsonLine(e, { objectIn: n, leftSomeUnparsed: r } = createHookJsonReader()) {
  let s = (y) => "async" in (n(y) ?? {});
  return (
    !s(e.trim()) &&
    e
      .split(
        `
`,
      )
      .some((y) => {
        let trimmed = y.trim();
        return trimmed.startsWith("{") && !s(trimmed);
      }) &&
    !r()
  );
}
/**
 * 解析异步钩子的 JSON 输出，校验 systemMessage 等字段。
 */
//@ chunk-e6aww6q8.js:938573-939819 placement
function parseAsyncHookOutput(e, n) {
  if (!isPlainObject_4(e))
    return (
      logForDebugging(`${n} async hook JSON output must be an object, got ${N7(e)} \u2014 ignored`, {
        level: "error",
      }),
      {}
    );
  let safeParse = hookJSONOutputSchema().safeParse(e);
  if (safeParse.success && isSyncHookJSONOutput(safeParse.data))
    return (validateHookJsonOutput(e, safeParse.data), safeParse.data);
  let s = [],
    h = {};
  if ("systemMessage" in e)
    if (typeof e.systemMessage === "string") h.systemMessage = e.systemMessage;
    else s.push(`systemMessage (${N7(e.systemMessage)})`);
  if ("metrics" in e)
    if (isPlainObject_4(e.metrics)) {
      let filtered = Object.entries(e.metrics).filter(
        (L) => typeof L[1] === "boolean" || typeof L[1] === "number",
      );
      h.metrics = Object.fromEntries(filtered);
    } else s.push(`metrics (${N7(e.metrics)})`);
  if ("hookSpecificOutput" in e)
    if (isPlainObject_4(e.hookSpecificOutput)) {
      let { additionalContext: additionalContext, ...L } = e.hookSpecificOutput,
        G = typeof additionalContext === "string";
      if (!G && additionalContext !== void 0)
        s.push(`hookSpecificOutput.additionalContext (${N7(additionalContext)})`);
      h.hookSpecificOutput = G ? e.hookSpecificOutput : L;
    } else s.push(`hookSpecificOutput (${N7(e.hookSpecificOutput)})`);
  let y = safeParse.success ? void 0 : safeParse.error.issues[0],
    S = y
      ? `${y.path.join(".") || "(root)"}: ${y.message}`
      : "async-marker response where a sync response was expected";
  return (
    logForDebugging(
      `${n} async hook JSON output failed schema validation (${S})` +
        (s.length > 0
          ? `; ignored malformed field(s): ${s.join(", ")}`
          : "; delivering recognized fields as-is"),
      { level: s.length > 0 ? "error" : "debug" },
    ),
    h
  );
}
//@ chunk-e6aww6q8.js:939819-939918 placement
function N7(e) {
  if (e === null) return "null";
  if (Array.isArray(e)) return "an array";
  return `a ${typeof e}`;
}
//@ chunk-e6aww6q8.js:939918-939930 placement
var SUt = 256;
/**
 * 存在 MCP 入站通道时创建 JSON 解析预算：限制嵌套深度和成员总数。
 */
//@ chunk-e6aww6q8.js:939930-940304 placement
function createJsonParseBudget() {
  if (!hasMcpInboundDoor()) return () => !0;
  let e = SUt,
    n = !1;
  return (r) => {
    let s = e > 0 && isJsonNestingWithin(r, MAX_NESTING_PARSED) ? countJsonMembers(r, e, 0) : void 0;
    if (s !== void 0) return ((e -= Math.max(s.members, 1)), !0);
    if (!n)
      ((n = !0),
        logForDebugging(
          `Hooks: part of a background hook's output was not read as JSON: reading it would parse more than ${SUt} JSON keys in all, or it nests too deep. Print one answer with fewer keys.`,
          { level: "error" },
        ));
    return !1;
  };
}
//@ chunk-e6aww6q8.js:940304-940597 placement
function createHookJsonReader() {
  if (!hasMcpInboundDoor()) return { objectIn: kUt, leftSomeUnparsed: () => !1 };
  let e = { aLine: createJsonParseBudget(), severalLines: createJsonParseBudget() },
    n = new Map(),
    r = !1;
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
          n.set(s, kUt(s));
        else r = !0;
      return n.get(s);
    },
    leftSomeUnparsed: () => r,
  };
}
//@ chunk-e6aww6q8.js:940597-940693 placement
function kUt(e) {
  if (!e.startsWith("{")) return;
  try {
    let n = jsonParse(e);
    return isPlainObject_4(n) ? n : void 0;
  } catch {
    return;
  }
}
/**
 * 异步 hook 注册状态：待完成 hook、未投递的响应、会话环境是否过期等。
 */
//@ chunk-e6aww6q8.js:940693-941306 placement
class AsyncHookRegistryState {
  pendingHooks = new Map();
  undeliveredResponses = [];
  holdsAnswerForModel = !1;
  isSessionEnvStale = !1;
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
    (this.pendingHooks.clear(), this.takeUndeliveredResponses(), (this.isSessionEnvStale = !1));
  }
  holdResponse(e) {
    (this.undeliveredResponses.push(e),
      (this.holdsAnswerForModel ||= getHookMessageTexts(e.response).length > 0));
  }
  takeUndeliveredResponses() {
    return ((this.holdsAnswerForModel = !1), this.undeliveredResponses.splice(0));
  }
}
//@ chunk-e6aww6q8.js:941306-941333 placement
var txo = new HostScoped(() => new AsyncHookRegistryState());
//@ chunk-e6aww6q8.js:941333-941372 placement
function che() {
  return txo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3391747-3391914 placement
function CAn() {
  return {
    stderr: "",
    stdout: "",
    output: "",
    started: !1,
    exitStatus: void 0,
    resultStdout: void 0,
    resultWasString: !1,
    resultConflict: !1,
    scanFrom: 0,
    stdoutScanFrom: 0,
  };
}
//@ chunk-e6aww6q8.js:3391914-3392024 placement
function mnt(e, n) {
  ((e.scanFrom = RAn(e, "stderr", e.scanFrom, n)),
    (e.stdoutScanFrom = RAn(e, "stdout", e.stdoutScanFrom, n)));
}
/**
 * 从 hook 输出中剥离 started/result/exited 标记段并解析结果，记录冲突。
 */
//@ chunk-e6aww6q8.js:3392024-3392984 placement
function RAn(state, stream, fromIndex, marker) {
  let h = `
${marker} started
`,
    index = state[stream].indexOf(h, fromIndex);
  while (index !== -1)
    ((state.started = !0),
      spliceOutputSegment(state, stream, index, index + h.length),
      (index = state[stream].indexOf(h, index)));
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
      ((state.resultConflict = !0), (index = state[stream].indexOf(S, index)));
      continue;
    }
    let ke = typeof Se === "string",
      we = typeof Se === "string" ? Se : sliced;
    if (state.resultStdout !== void 0 && state.resultStdout !== we) state.resultConflict = !0;
    ((state.resultStdout = we), (state.resultWasString = ke), (index = state[stream].indexOf(S, index)));
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
      (spliceOutputSegment(state, stream, index, index_2 + 1),
        (state.resultConflict = !0),
        (index = state[stream].indexOf(w, index)));
      continue;
    }
    let Se = Number(sliced);
    (spliceOutputSegment(state, stream, index, index_2 + 1),
      (state.exitStatus = state.exitStatus === 2 ? 2 : Se),
      (index = state[stream].indexOf(w, index)));
  }
  let index_2 = state[stream].indexOf(
      `
${marker} `,
      fromIndex,
    ),
    max = Math.max(0, state[stream].length - (marker.length + 16));
  return index_2 === -1 ? max : Math.min(index_2, max);
}
//@ chunk-e6aww6q8.js:3392984-3393040 placement
function PAn(e, n) {
  if (n === void 0) return;
  return e === 2 ? 2 : n;
}
/**
 * 从输出缓冲的某字段剪掉一段并在 output 中删除相同文本（与 bridge 无关）。
 */
//@ chunk-e6aww6q8.js:3393040-3393213 placement = sameSessionId (0.656)
function spliceOutputSegment(e, n, r, s) {
  let h = e[n],
    sliced = h.slice(r, s);
  e[n] = h.slice(0, r) + h.slice(s);
  let index = e.output.lastIndexOf(sliced);
  if (index !== -1) e.output = e.output.slice(0, index) + e.output.slice(index + sliced.length);
}

export {
  che,
  setAllHookEventsEnabled,
  consumeUserPromptSubmitEventsEnv,
  createHookJsonReader,
  findSyncJsonAnswer,
  parseAsyncHookOutput,
  hasUnparsedJsonLine,
  createJsonParseBudget,
  validateHookJsonOutput,
  CAn,
  mnt,
  PAn,
};
