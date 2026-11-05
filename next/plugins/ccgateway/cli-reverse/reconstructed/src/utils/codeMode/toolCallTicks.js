/**
 * utils/codeMode/toolCallTicks.ts
 *
 * Code 模式 repl_tool_call tick 的裁剪与提取：截断输入/错误文本并缓存，按 toolUseId 汇总调用与所在脚本起始时间，取活动描述（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ptn6w8qy.js (10)
 * attribution: placement 10
 */
import { truncateToLength } from "../stringUtils.js";
import { stripControlChars } from "../settings/writeQueues.js";

//@ chunk-ptn6w8qy.js:262-278 placement
var MAX_TEXT_CHARS = 1000;
var MAX_INPUT_KEYS = 32;
//@ chunk-ptn6w8qy.js:278-389 placement
/**
 * repl_tool_call 类型的 tick 走专门的裁剪，其余原样返回。
 */
function tickToStore(tick) {
  let { data } = tick;
  if (data.type !== "repl_tool_call") return tick;
  try {
    return {
      ...tick,
      data: tickDataToStore(data),
    };
  } catch {
    return;
  }
}
//@ chunk-ptn6w8qy.js:389-894 placement
/**
 * 裁剪一个 repl_tool_call tick 的输入/错误并缓存裁剪结果。
 */
function tickDataToStore(tick) {
  let toolInput = shrinkToolInput(tick.toolInput);
  let stored = {
    type: tick.type,
    toolName: tick.toolName,
    toolInput,
    toolUseId: tick.toolUseId,
    phase: tick.phase,
    ...(tick.nativeTimeoutMs !== undefined && {
      nativeTimeoutMs: tick.nativeTimeoutMs,
    }),
    ...(tick.scriptStartedAt !== undefined && {
      scriptStartedAt: tick.scriptStartedAt,
    }),
    ...(tick.shellProgress !== undefined && {
      shellProgress: {
        elapsedTimeSeconds: tick.shellProgress.elapsedTimeSeconds,
        totalLines: tick.shellProgress.totalLines,
      },
    }),
    ...(typeof tick.error === "string" && {
      error: shrinkText(tick.error),
    }),
    ...(tick.scriptHelper === true && {
      scriptHelper: true,
    }),
  };
  weakMap.set(stored, toolInput);
  return stored;
}
//@ chunk-ptn6w8qy.js:894-1204 placement
/**
 * 按 toolUseId 汇总 repl_tool_call 为调用行列表（id/name/input/phase）。
 */
function liveCallsOf(ticks) {
  let byId = new Map();
  for (let { data } of ticks)
    if (data.type === "repl_tool_call") {
      let input = weakMap.get(data);
      if (input === undefined) {
        try {
          input = shrinkToolInput(data.toolInput);
        } catch {
          input = {};
        }
        weakMap.set(data, input);
      }
      byId.set(data.toolUseId, {
        id: data.toolUseId,
        name: data.toolName,
        input,
        phase: data.phase,
        ...(data.shellProgress !== undefined && {
          shellProgress: data.shellProgress,
        }),
      });
    }
  return [...byId.values()];
}
//@ chunk-ptn6w8qy.js:1204-1256 placement
/**
 * 判定 phase 是否 start 或 executing。
 */
function isRunningPhase(phase) {
  return phase === "start" || phase === "executing";
}
//@ chunk-ptn6w8qy.js:1256-1516 placement
/**
 * 取当前活动的 repl 调用与所在脚本起始时间。
 */
function hintCallOf(ticks) {
  let calls = liveCallsOf(ticks);
  let hintCall = calls.findLast((call) => isRunningPhase(call.phase)) ?? calls.at(-1);
  if (hintCall === undefined) return;
  let startedTick = ticks.findLast(
    (tick) => tick.data.type === "repl_tool_call" && tick.data.toolUseId === hintCall.id,
  )?.data;
  return {
    call: hintCall,
    scriptStartedAt: startedTick?.type === "repl_tool_call" ? startedTick.scriptStartedAt : undefined,
  };
}
//@ chunk-ptn6w8qy.js:1516-1625 placement (2.1.88 match: createActivityDescriptionResolver, 1)
/**
 * 安全调用工具的活动描述并只接受字符串。
 */
function activityLineOf(tools, call) {
  try {
    let line = tools?.getActivityDescription?.(call);
    return typeof line === "string" ? line : undefined;
  } catch {
    return;
  }
}
//@ chunk-ptn6w8qy.js:1625-1643 placement
var weakMap = new WeakMap();
//@ chunk-ptn6w8qy.js:1643-1890 placement
function shrinkToolInput(toolInput) {
  let stored = {};
  if (typeof toolInput !== "object" || toolInput === null || Array.isArray(toolInput)) return stored;
  let input = toolInput;
  for (let key of Object.keys(input).slice(0, MAX_INPUT_KEYS)) {
    let value = input[key];
    if (typeof value === "string") stored[shrinkText(key)] = shrinkText(value);
    else if (typeof value === "number" || typeof value === "boolean") stored[shrinkText(key)] = value;
  }
  return stored;
}
//@ chunk-ptn6w8qy.js:1890-1954 placement
function shrinkText(text) {
  let cut = text.length > MAX_TEXT_CHARS ? `${truncateToLength(text, MAX_TEXT_CHARS)}\u2026` : text;
  return stripControlChars(cut);
}
export { tickDataToStore, activityLineOf, hintCallOf, isRunningPhase, liveCallsOf, tickToStore };
