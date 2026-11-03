/**
 * cli/handlers/pluginTest/engineShim.ts
 *
 * 2.1.316 新增。claude plugin test 中模拟引擎事件、会话存储与 hooks 模块源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1tz177x8.js (58)
 * attribution: placement 58
 */
import { join } from "path";
import {
  isStreamingHookEvent,
  HOOK_EVENTS,
  isHookApiCall,
} from "../../../plugins/functionHooks/hookApiSurface.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { scaffoldPluginTestDir } from "./runner.js";
import { getSessionId } from "../../../bootstrap/state.js";
import { getCwd } from "../../../utils/cwd.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { isClassicHookEvent } from "../../../plugins/functionHooks/toolCallHooks.js";
import { runClassicHookChain } from "../../../plugins/functionHooks/classicHookBridge.js";
import { getRuleBehaviorDescription } from "../../../utils/permissions/PermissionResult.js";
import { toolInputOf, REQUESTMETA, toolCallEvent } from "../../../plugins/functionHooks/sites/toolSites.js";
import {
  restoreMissingKeys_2,
  reportPreToolUseChainFailure,
} from "../../../plugins/functionHooks/sites/siteRules.js";
import {
  reportChainFailure,
  createStepRecorder,
  missingImplementation,
} from "../../../plugins/functionHooks/dispatch/chain.js";
import {
  toToolCheckEvent,
  TOOL_CHECK_RULES,
  describePluginPermissionDenial,
} from "../../../plugins/functionHooks/toolCheckHooks.js";
import {
  hookMembersFor,
  hookOriginFromStack,
  pluginsMatchingEvent,
} from "../../../plugins/functionHooks/hookDispatch.js";
import { AUTO_REJECT_MESSAGE } from "../../../utils/messages.js";
import { matcherTestTarget } from "../../../utils/hooks/matcherGrammar.js";
import { hasModuleHookingSite } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import {
  insertBeforeEngineAnswer,
  createEventCallers,
  NO_CORE_AT_CHAIN_BOTTOM,
} from "../../../plugins/functionHooks/eventCatalog.js";
import { contentBlockStableKeys } from "../../../engine/renderedRows.js";
import {
  parseTypedBlocks,
  resolveBlocks,
  reconcileAppendContent,
  normalizeAppendedToolResult,
  refuseSessionAppend,
} from "../../../plugins/functionHooks/api/sessionAppend.js";
import { uniq } from "../../../utils/collections.js";
import {
  checkAppendMessage,
  isPluginNoteRefusal,
} from "../../../plugins/functionHooks/sites/sessionSites.js";
import {
  safeDeepEqual,
  throwIfDenied,
  promptBoxForPlugin,
} from "../../../plugins/functionHooks/apiDispatch.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { getOwn } from "../../../utils/objectSafety.js";
import { moveToCloudTrash } from "../../../utils/cloudTrash.js";
import { dispatchInputQueued } from "../../../plugins/functionHooks/ui/interactions.js";
import { DoctorLazy } from "../util.js";
import { u, string, _enum, array, record, union, E, M } from "../../../../vendor/zod/v4/classic/schemas.js";
import { isUiElementTypeName, RENDER_SITES } from "../../../plugins/functionHooks/ui/renderSites.js";
import { bumpRenderPaced } from "../../../plugins/functionHooks/ui/renderInstances.js";
import {
  validateStateSetArgs,
  stateSetForPlugin,
  flushStaleFold,
} from "../../../plugins/functionHooks/api/state.js";
import { check } from "../../../utils/lockfile.js";
import { judgeHookInput } from "../../../plugins/functionHooks/dispatch/inputJudging.js";
import { isReservedHookName } from "../../../plugins/functionHooks/eventPatterns.js";
import { normalizePluginHostAction } from "../../../plugins/functionHooks/hostBridge.js";
import { env } from "../../../utils/env.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { setTestPluginStateSlot } from "./uiDriver.js";

//@ chunk-1tz177x8.js:14394-14407 placement = resetStateForTests (0.751)
var resetStateForTests = "test";
//@ chunk-1tz177x8.js:14407-14637 placement
async function hooksModuleSource(e, r) {
  let n = join(e, resetStateForTests);
  let joined = r.map((f) => {
    let a = isStreamingHookEvent(f) ? "async function* () {}" : "() => undefined";
    return `  on(${jsonStringify(f)}, ${a})`;
  }).join(`
`);
  let modulePath = await scaffoldPluginTestDir(
    n,
    resetStateForTests,
    `export function register(on) {
${joined}
}
`,
  );
  return {
    dir: n,
    modulePath,
  };
}
//@ chunk-1tz177x8.js:14637-14729 placement
var hookInputForTest = (hookEventName, r) => ({
  session_id: getSessionId(),
  transcript_path: "",
  cwd: getCwd(),
  ...(isPlainObject(r) ? r : {}),
  hook_event_name: hookEventName,
});
//@ chunk-1tz177x8.js:14729-15025 placement
function classicHookCaller(path, signal) {
  let hookEventName = path.slice(8);
  if (hookEventName === "PreToolUse")
    throw new HooksError(
      "$.classic.PreToolUse is no call on the engine's $: the engine raises it inside tool.call, so a test calls $.tool.call",
    );
  if (!isClassicHookEvent(hookEventName)) throw new HooksError(`$.${path} is no call on the engine's $`);
  return (m) =>
    runClassicHookChain({
      hookInput: hookInputForTest(hookEventName, m),
      signal,
    });
}
//@ chunk-1tz177x8.js:15025-15069 placement
var classicHooksAsPairs = () => HOOK_EVENTS.filter(isClassicHookEvent).map((e) => [e, false]);
//@ chunk-1tz177x8.js:15069-15207 placement
function applyRecordedDenial(e, denials) {
  let n = denials.of(e.ref);
  return n !== undefined && e.deny === undefined && (e.result === undefined || e.result === n.made.result)
    ? {
        deny: n.made.text,
      }
    : e;
}
//@ chunk-1tz177x8.js:15207-15375 placement
function denyToolCall(call, reason, denials) {
  let s = reason || `Hook PreToolUse:${call.tool} ${getRuleBehaviorDescription("deny")} this tool`;
  let result = `Error: ${s}`;
  return {
    ref: denials.keep(toolInputOf(call), {
      result,
      text: s,
    }),
    result,
    text: s,
    isError: true,
  };
}
//@ chunk-1tz177x8.js:15375-15449 placement
var toolCallWithUpdatedInput = (e, updatedInput) =>
  restoreMissingKeys_2(
    ["agentId", "consent", REQUESTMETA],
    toolCallEvent(e.tool, e.tool_use_id, updatedInput),
    e,
  );
//@ chunk-1tz177x8.js:15449-15785 placement
/**
 * 把插件测试中钩子的 allow/ask/deny 决定转换为权限结果对象。
 */
function toPermissionResult({ decision, reason }, n, updatedInput) {
  let message = reason || `Permission to use ${n} has been denied.`;
  let message_2 = reason || `${n} needs approval`;
  let decisionReason = {
    type: "other",
    reason: reason || "denied",
  };
  switch (decision) {
    case "allow":
      return {
        behavior: "allow",
        updatedInput,
      };
    case "ask":
      return {
        behavior: "ask",
        message: message_2,
        updatedInput,
      };
    case "deny":
      return {
        behavior: "deny",
        message,
        decisionReason,
      };
  }
}
//@ chunk-1tz177x8.js:15785-15881 placement
var coreEngineMember = (e) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(r, n) {
    let s = await n(r);
    e(s);
    return s;
  },
});
//@ chunk-1tz177x8.js:15881-15954 placement
function runCorePermissionChain(tool, updatedInput) {
  let n;
  return {
    core: coreEngineMember((m) => {
      n = toPermissionResult(m, tool, updatedInput);
    }),
    decided: () => n,
  };
}
//@ chunk-1tz177x8.js:15954-16030 placement
var coreNoopEngineMember = () => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: () => Promise.resolve({}),
});
//@ chunk-1tz177x8.js:16030-16362 placement
/**
 * 钩子改写工具输入后重新跑一遍 tool.check（只用替引擎作答的成员），把决定转换成 {updatedInput} 或 {deny}。
 */
async function checkUpdatedInput(call, signal, stack) {
  let updatedInput = toolInputOf(call);
  let permissionResult = toPermissionResult(
    await reportChainFailure({
      e: toToolCheckEvent(
        {
          name: call.tool,
        },
        call.tool_use_id,
        {
          input: updatedInput,
          agentId: call.agentId,
        },
      ),
      handlers: hookMembersFor("tool.check", stack).filter((a) => a.answersForEngine === true),
      site: TOOL_CHECK_RULES,
      signal,
      origin: hookOriginFromStack(stack),
      bottom: () =>
        Promise.resolve({
          decision: "allow",
        }),
    }),
    call.tool,
    updatedInput,
  );
  return permissionResult.behavior === "allow"
    ? {
        updatedInput,
      }
    : {
        deny: permissionResult.message,
      };
}
//@ chunk-1tz177x8.js:16362-16770 placement
/**
 * ask 决定时跑 PermissionRequest 钩子：allow 时若改写输入再检查一次；deny 用钩子消息；无人作答时用自动拒绝消息。
 */
async function askPermissionRequestHook(call, signal, origin) {
  let s = await runClassicHookChain({
    hookInput: hookInputForTest("PermissionRequest", {
      tool_name: call.tool,
      tool_input: toolInputOf(call),
      ...(call.agentId !== undefined && {
        agent_id: call.agentId,
      }),
    }),
    core: coreNoopEngineMember(),
    signal,
    origin,
  });
  let decision = "decision" in s ? s.decision : undefined;
  switch (decision?.behavior) {
    case "allow":
      return decision.updatedInput
        ? checkUpdatedInput(toolCallWithUpdatedInput(call, decision.updatedInput), signal, origin)
        : {};
    case "deny":
      return {
        deny: decision.message || "Permission denied by hook",
      };
    case undefined:
      return {
        deny: AUTO_REJECT_MESSAGE(call.tool),
      };
  }
}
//@ chunk-1tz177x8.js:16770-17420 placement
/**
 * 测试引擎里的 tool.check 链：跑插件的 tool.check 处理器，汇总为 allow/deny/ask；ask 交给 PermissionRequest 钩子。
 */
async function runToolCheckChain({ e, next: { signal }, settled, stated }, stack) {
  let f = {
    name: e.tool,
  };
  let a = {
    ...matcherTestTarget(f),
    agentId: e.agentId,
  };
  if (!hasModuleHookingSite("tool.check", a)) return {};
  let c = toolInputOf(e);
  let h = hookMembersFor("tool.check", stack);
  let k = runCorePermissionChain(e.tool, c);
  let y = describePluginPermissionDenial({
    result: await reportChainFailure({
      e: {
        ...toToolCheckEvent(f, e.tool_use_id, {
          input: c,
          agentId: e.agentId,
        }),
        ...stated,
      },
      handlers: insertBeforeEngineAnswer(h, k.core),
      site: TOOL_CHECK_RULES,
      signal,
      origin: hookOriginFromStack(stack),
      bottom: () => Promise.resolve(settled),
    }),
    decided: k.decided(),
    tool: e.tool,
    input: c,
    toolUseID: e.tool_use_id,
    hooked: pluginsMatchingEvent(
      "tool.check",
      {
        ...a,
        isReadOnly: stated.isReadOnly,
      },
      stack,
    ).filter((b) => !h.some((z) => z.name === b && z.answersForEngine === true)),
  });
  switch (y.behavior) {
    case "allow":
      return {};
    case "deny":
      return {
        deny: y.message,
      };
    case "ask":
      return askPermissionRequestHook(e, signal, stack);
  }
}
//@ chunk-1tz177x8.js:17420-17553 placement
async function checkThenCall(step, stack, denials) {
  let { e: s, next: m } = step;
  let { deny, updatedInput } = await runToolCheckChain(step, stack);
  return typeof deny === "string"
    ? denyToolCall(s, deny, denials)
    : m(updatedInput ? toolCallWithUpdatedInput(s, updatedInput) : s);
}
//@ chunk-1tz177x8.js:17553-17698 placement
function settledFromPreToolUse({ ask, allow }) {
  return typeof ask === "string"
    ? {
        decision: "ask",
        reason: ask,
        hook: "PreToolUse",
      }
    : {
        decision: "allow",
        ...(allow && {
          hook: "PreToolUse",
        }),
      };
}
//@ chunk-1tz177x8.js:17698-18034 placement
/**
 * 测试引擎里 tool.call 链底的核心步骤：先跑 classic PreToolUse 钩子（可拒绝或改写输入），再走 tool.check。
 */
var coreToolCallStep = (stack, denials, stated) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(s, m) {
    let f = toolCallEvent(s.tool, s.tool_use_id, toolInputOf(s));
    let a = await reportPreToolUseChainFailure(f, hookMembersFor("classic.PreToolUse", stack), {
      signal: m.signal,
      origin: hookOriginFromStack(stack),
      bottom: () => Promise.resolve({}),
    });
    let { deny, updatedInput } = a;
    let k = typeof deny === "string";
    let y = updatedInput ? toolCallWithUpdatedInput(s, updatedInput) : s;
    return k
      ? denyToolCall(f, deny, denials)
      : checkThenCall(
          {
            e: y,
            next: m,
            settled: settledFromPreToolUse(a),
            stated,
          },
          stack,
          denials,
        );
  },
});
//@ chunk-1tz177x8.js:18034-18139 placement
function withheldCoreSteps(stack, denials = createStepRecorder(), stated = {}) {
  return hasModuleHookingSite("classic.PreToolUse") || hasModuleHookingSite("tool.check")
    ? {
        "tool.call": coreToolCallStep(stack, denials, stated),
      }
    : {};
}
//@ chunk-1tz177x8.js:18139-18204 placement
var be = Object.freeze({
  isHookable: true,
  keep: () => {},
  arrived: () => {},
});
//@ chunk-1tz177x8.js:18204-18339 placement
function newAppendedBlockTypes(content, content_2) {
  let n = new Set(contentBlockStableKeys(parseTypedBlocks(content_2)));
  let s = contentBlockStableKeys(content);
  return uniq(
    content.flatMap((m, f) => {
      let a = s[f];
      return a !== undefined && !n.has(a) ? [m.type] : [];
    }),
  );
}
//@ chunk-1tz177x8.js:18339-18406 placement
var textOfContentBlocks = (e) => e.content.map((r) => (typeof r.text === "string" ? r.text : ""));
//@ chunk-1tz177x8.js:18406-18438 placement
var POLL_EVENTS_ONLY_TOOL_NAMES = new Set(["poll_events"]);
//@ chunk-1tz177x8.js:18438-18549 placement
function freezeToolResultContent(e, r) {
  let n = POLL_EVENTS_ONLY_TOOL_NAMES.has(e.name ?? "");
  let blocks = resolveBlocks(textOfContentBlocks(e), r);
  return n
    ? e.content
    : blocks.map((text) => ({
        type: "text",
        text,
      }));
}
//@ chunk-1tz177x8.js:18549-18641 placement
var collapseToTextContent = (e, r) =>
  [
    resolveBlocks(textOfContentBlocks(e), r).join(`
`),
  ]
    .filter((n) => n !== "")
    .map((text) => ({
      type: "text",
      text,
    }));
//@ chunk-1tz177x8.js:18641-18719 placement
function mergeAppendedContent(content, content_2) {
  let n = Array.isArray(content) ? content : undefined;
  return content_2 === undefined ? content : reconcileAppendContent(n, content_2);
}
//@ chunk-1tz177x8.js:18719-18808 placement
function withErrorFlag(e, isError) {
  let { is_error: isError_2, ...s } = e;
  return isError === (isError_2 === true)
    ? e
    : {
        ...s,
        ...(isError && {
          is_error: true,
        }),
      };
}
//@ chunk-1tz177x8.js:18808-18934 placement
function applyEditToToolResult(e, r) {
  return r.kind === "tool-result" && e.type === "tool_result"
    ? withErrorFlag(
        {
          ...e,
          content: mergeAppendedContent(e.content, r.content),
        },
        r.isError,
      )
    : e;
}
//@ chunk-1tz177x8.js:18934-19013 placement
var textBlockForMessage = (e, text) => ({
  type: "text",
  text,
  ...(e.type === "assistant" && {
    citations: null,
  }),
});
//@ chunk-1tz177x8.js:19013-19161 placement
function sliceEditedBlocks(e, r) {
  if (r.kind === "text") return [textBlockForMessage(e, r.text)];
  let sliced = e.content.slice(r.index, r.index + 1);
  return e.type === "assistant" ? sliced : sliced.map((m) => applyEditToToolResult(m, r));
}
//@ chunk-1tz177x8.js:19161-19199 placement
var sliceBlocksForRole = (e, r) => r.flatMap((n) => sliceEditedBlocks(e, n));
//@ chunk-1tz177x8.js:19199-19268 placement
var bo = Object.freeze({
  user: sliceBlocksForRole,
  assistant: sliceBlocksForRole,
  attachment: freezeToolResultContent,
  system: collapseToTextContent,
});
//@ chunk-1tz177x8.js:19268-19457 placement
function normalizeAppendedMessage(message, message_2) {
  if (!(
    checkAppendMessage(message) === undefined &&
    Object.hasOwn(bo, message.type) &&
    parseTypedBlocks(message.content).length === message.content.length
  ))
    return message_2;
  let s = normalizeAppendedToolResult(message.content, parseTypedBlocks(message_2.content));
  return {
    ...message,
    content: bo[message.type](message, s),
  };
}
//@ chunk-1tz177x8.js:19457-20291 placement
function storeSessionAppendRow(e, message, n) {
  if (n === message || safeDeepEqual(n.content, message.content)) return;
  let appendedBlockTypes = newAppendedBlockTypes(e.message.content, message.content);
  let f = `session.append: the ${e.door} row ${e.uuid} is stored `;
  let c = appendedBlockTypes.includes("tool_result")
    ? " To scrub a tool result, pass on a tool_result with the same tool_use_id and new content."
    : "";
  return appendedBlockTypes.length > 0
    ? `${f}with its ${appendedBlockTypes.join(", ")} kept, as a session stores it. A session pins tool_use, tool_result, thinking and unknown blocks (a request pairs each tool call with its result and carries thinking as signed), so no hook drops one or changes its id.` +
        c
    : `${f}as a session stores it, not as the hooks left it: a pinned block a hook changed is put back as raised, new or changed media and empty texts are not kept, a response's new text carries citations: null, a notice is one text, and an attachment rendered per request stays as raised.`;
}
//@ chunk-1tz177x8.js:20291-20421 placement
function storeAppendedRow(e, r) {
  let n = normalizeAppendedMessage(e.message, r.message);
  let s = storeSessionAppendRow(e, r.message, n);
  if (s !== undefined) matcherLog().log(s, "warn");
  return {
    message: n,
    uuid: e.uuid,
  };
}
//@ chunk-1tz177x8.js:20421-20468 placement
var sessionAppendHandler = (e) => async (r) =>
  isPluginNoteRefusal(e) ? refuseSessionAppend(r, be) : storeAppendedRow(e, r);
//@ chunk-1tz177x8.js:20468-20512 placement
var ko = Object.freeze({
  "session.append": sessionAppendHandler,
});
//@ chunk-1tz177x8.js:20512-20904 placement
/**
 * 按 "事件.方法" 路径取出测试引擎 $ 上可调用的函数；classic.* 走经典钩子；调用时要求传完整事件输入。
 */
function engineCallFor(path, signal) {
  let [n = "", s = ""] = path.split(".");
  if (n === "classic") return classicHookCaller(path, signal);
  let eventCallers = createEventCallers({
    signal,
    withheldCore: withheldCoreSteps(),
    withheldFloor: ko,
  });
  let f = getOwn(eventCallers, n);
  let a = isPlainObject(f) ? getOwn(f, s) : undefined;
  if (typeof a !== "function") throw new HooksError(`$.${path} is no call on the engine's $`);
  let c = a;
  return (h) => {
    if (h === undefined)
      throw new HooksError(
        `$.${path} in a test takes the whole input of its event, which a mod's call may leave out`,
      );
    return c(h);
  };
}
//@ chunk-1tz177x8.js:20904-21023 placement
var describeEngineCalls = () => [
  ...Object.entries(createEventCallers()).map(([key, value]) => [
    key,
    Object.keys(value).map((key_2) => [key_2, isStreamingHookEvent(`${key}.${key_2}`)]),
  ]),
  ["classic", classicHooksAsPairs()],
];
//@ chunk-1tz177x8.js:21023-21610 placement
/**
 * 在已绘制的插件 UI 中按标签、插件、key（及可选 requestId/surface）找唯一一个元素；找不到或多于一个时抛出带说明的 HooksError。
 */
function findHostedElement({ act, tag, plugin, key, requestId, surface }) {
  let matches = moveToCloudTrash
    .hostedButtonsOf(plugin, key)
    .filter(
      ({ button }) =>
        button.tag === tag &&
        (surface === undefined || button.surface === surface) &&
        (requestId === undefined || button.requestId === requestId),
    );
  let [first, ...h] = matches;
  if (!first)
    throw new HooksError(
      `$.ui.${act}: no ${tag} of ${plugin} keyed ${JSON.stringify(key)} is drawn${surface === undefined ? "" : ` on the ${surface} surface`}; render or mount the tree that holds it first`,
    );
  if (h.length > 0)
    throw new HooksError(
      `$.ui.${act}: ${plugin} holds ${matches.length} ${tag}s keyed ${JSON.stringify(key)}, in ` +
        matches.map((match) => `${match.button.requestId} on ${match.button.surface}`).join(", ") +
        "; name the requestId or the surface",
    );
  return first;
}
//@ chunk-1tz177x8.js:21639-22172 placement
/**
 * 把测试里内联给的 register 源码（方法简写、function 或箭头函数）改写成 export function register(...) 模块源码；格式不对时报错。
 */
function registerSourceAsModule(pluginName, source) {
  let match = /^(async\s+)?register\s*\(/.exec(source);
  if (match)
    return `export ${match[1] ?? ""}function ${source.slice(match[1]?.length ?? 0)}
`;
  let match_2 = /^(async\s+)?function\s*[\w$]*\s*\(/.exec(source);
  if (match_2)
    return `export ${match_2[1] ?? ""}function register(${source.slice(match_2[0].length)}
`;
  let match_3 = /^(async\s*)?(?:\(([^)]*)\)|([\w$]+))\s*=>\s*\{/.exec(source);
  if (match_3) {
    let f = match_3[1] !== undefined;
    let a = match_3[2] ?? match_3[3] ?? "";
    return `export ${f ? "async " : ""}function register(${a}) {${source.slice(match_3[0].length)}
`;
  }
  throw new HooksError(
    `test(name, { plugins }): ${pluginName}'s register is written \`register(on) { ... }\``,
  );
}
//@ chunk-1tz177x8.js:22172-22256 placement
async function scaffoldPluginTestRoot(e, { name: pluginName, source }) {
  let s = join(e, pluginName);
  await scaffoldPluginTestDir(s, pluginName, registerSourceAsModule(pluginName, source));
  return s;
}
//@ chunk-1tz177x8.js:22256-22523 placement
function submitTestInput({ plugin, key, text, kind, requestId, surface }) {
  let hostedElement = findHostedElement({
    act: "input",
    tag: "Input",
    plugin,
    key,
    requestId,
    surface,
  });
  return dispatchInputQueued({
    plugin,
    handle: hostedElement.hosted,
    element: key,
    component: hostedElement.button.component,
    surface: hostedElement.button.surface,
    kind: kind ?? "submit",
    value: text,
  });
}
//@ chunk-1tz177x8.js:22523-22688 placement
var INPUT_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: string(),
    key: string(),
    text: string(),
    kind: _enum(["change", "submit"]).optional(),
    requestId: string().optional(),
    surface: string().refine(isUiElementTypeName, "is not a surface").optional(),
  }),
);
//@ chunk-1tz177x8.js:22688-22698 placement
var HOOKS_SAME_THREAD_FORCED = true;
//@ chunk-1tz177x8.js:22698-22752 placement
var isRenderSiteName = (e) => typeof e === "string" && Object.hasOwn(RENDER_SITES, e);
//@ chunk-1tz177x8.js:22752-22768 placement
var resetStateLogPrefix = `${resetStateForTests}: `;
//@ chunk-1tz177x8.js:38481-38937 placement
/**
 * 插件测试引擎中各操作对应的钩子链名。
 */
var ENGINE_CHAIN_FOR_OP = {
  "tool.call": "tool.call",
  "tool.check": "tool.check",
  "agent.spawn": "agent.spawn",
  "ui.ask": "tool.call",
  "command.run": "command.run",
  "config.set": "config.set",
  "telemetry.log": "telemetry.log",
  "telemetry.mark": "telemetry.mark",
  "prompt.submit": "prompt.submit",
  "prompt.fill": "prompt.fill",
  "prompt.suggest": "prompt.suggest",
  "prompt.compose": "prompt.compose",
  "session.compact": "session.compact",
  "session.send": "session.send",
  "session.append": "session.append",
};
//@ chunk-1tz177x8.js:38937-39242 placement
/**
 * 对引擎链结果做收尾：tool.call 应用拒绝记录，遥测写入日志，prompt.fill 返回填充后的文本与光标。
 */
async function finishEngineResult(handler, r, n) {
  if (handler === "tool.call") {
    let { isReadOnly, ...c } = r;
    return applyRecordedDenial(c, n.denials);
  }
  if (handler === "telemetry.log" || handler === "telemetry.mark") return throwIfDenied(n.caller, handler, r);
  if (handler !== "prompt.fill") return r;
  let { isFilled } = r;
  let { text, cursor } = await promptBoxForPlugin(n.caller, n.scan, "prompt.fill");
  return {
    isFilled,
    text,
    cursor,
  };
}
//@ chunk-1tz177x8.js:39242-39326 placement
var uiBottomRenderHook = {
  run: (e, r) => {
    bumpRenderPaced(r.plugin, "steady");
    bumpRenderPaced(r.plugin, "live");
    return Promise.resolve();
  },
};
//@ chunk-1tz177x8.js:39353-39463 placement
var STATE_SET_STEP = {
  check: validateStateSetArgs,
  run: async (e, r) => {
    let n = await stateSetForPlugin(e, r);
    let now = Date.now();
    flushStaleFold("steady", now);
    flushStaleFold("live", now);
    return n;
  },
};
//@ chunk-1tz177x8.js:39463-39502 placement
var RESERVED_ENGINE_HOST_CALLS = {
  "state.get": check,
  "state.set": STATE_SET_STEP,
};
//@ chunk-1tz177x8.js:39502-40049 placement
/**
 * 插件测试的宿主调用分发：ui.invalidate 与保留钩子直接判定；其他操作按 ENGINE_CHAIN_FOR_OP 映射到引擎链执行，结果再按事件后处理。
 */
function handleTestHostCall({ op, args, caller }, raise, scan) {
  if (op === "ui.invalidate") {
    let invalidateArgs = args;
    return judgeHookInput({
      event: "ui.invalidate",
      args: invalidateArgs,
      caller,
      raise,
      ...(invalidateArgs.event === "ui.render" && {
        bottom: uiBottomRenderHook,
      }),
    });
  }
  if (isHookApiCall(op)) {
    let reservedBottom = isReservedHookName(op) ? RESERVED_ENGINE_HOST_CALLS[op] : undefined;
    return judgeHookInput({
      event: op,
      args,
      caller,
      raise,
      ...(reservedBottom !== undefined && {
        bottom: reservedBottom,
      }),
    });
  }
  let handler = Object.hasOwn(ENGINE_CHAIN_FOR_OP, op) ? ENGINE_CHAIN_FOR_OP[op] : undefined;
  if (!handler)
    return missingImplementation({
      event: op,
    });
  let denials = createStepRecorder();
  return NO_CORE_AT_CHAIN_BOTTOM(handler, {
    origin: caller.origin,
    signal: caller.signal,
    withheldCore: withheldCoreSteps(
      caller.origin,
      denials,
      op === "ui.ask"
        ? {
            isReadOnly: true,
          }
        : {},
    ),
    withheldFloor: ko,
  })(normalizePluginHostAction(args, caller.plugin, handler)).then((c) =>
    finishEngineResult(handler, c, {
      caller,
      scan,
      denials,
    }),
  );
}
//@ chunk-1tz177x8.js:40049-40154 placement
function installTestHost() {
  env.set("CLAUDE_CODE_HOOKS_SAME_THREAD", HOOKS_SAME_THREAD_FORCED);
  getPluginRegistry().hookRegistration ??= Promise.resolve();
  setTestPluginStateSlot(handleTestHostCall);
}
//@ chunk-1tz177x8.js:40154-40572 placement
/**
 * 校验测试声明的插件名（格式、与保留名冲突、重复），并登记插件来源。
 */
function validateTestPlugins(plugins) {
  let r = new Set([resetStateForTests]);
  for (let { name: pluginName, source } of plugins) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pluginName))
      throw new HooksError(
        `test(name, { plugins }): "${pluginName}" is no plugin name (lowercase letters, digits and dashes)`,
      );
    if (r.has(pluginName)) {
      let m = pluginName === resetStateForTests;
      throw new HooksError(
        m
          ? `test(name, { plugins }): "${pluginName}" is the name the hooks of the test load under; name the plugin otherwise`
          : `test(name, { plugins }): "${pluginName}" is named twice`,
      );
    }
    registerSourceAsModule(pluginName, source);
    r.add(pluginName);
  }
}
//@ chunk-1tz177x8.js:40572-40699 placement
var SELECT_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: string(),
    key: string(),
    value: string(),
    requestId: string().optional(),
    surface: string().refine(isUiElementTypeName, "is not a surface").optional(),
  }),
);
//@ chunk-1tz177x8.js:40699-40751 placement
var pluginTierSchema = () => _enum(["prepend", "user", "append", "builtin"]);
//@ chunk-1tz177x8.js:40751-40878 placement
var TEST_PLUGINS_SCHEMA = DoctorLazy(() =>
  u({
    tier: pluginTierSchema(),
    plugins: array(
      u({
        name: string(),
        tier: pluginTierSchema(),
        source: string(),
      }),
    ),
    options: record(string(), union([string(), E(), M(), array(string())])).optional(),
  }),
);
export {
  installTestHost,
  resetStateForTests,
  resetStateLogPrefix,
  isRenderSiteName,
  findHostedElement,
  engineCallFor,
  scaffoldPluginTestRoot,
  hooksModuleSource,
  submitTestInput,
  TEST_PLUGINS_SCHEMA,
  validateTestPlugins,
  INPUT_ACTION_SCHEMA,
  SELECT_ACTION_SCHEMA,
  describeEngineCalls,
};
