/**
 * plugins/functionHooks/hookApiSurface.ts
 *
 * 2.1.316 新增：插件 hooks 模块可调用的 $ API 名单（model.complete、mcp.call、session.* 等）；插件 hooks 模块可监听的事件名单（classic.*、tool.call、ui.*、prompt.*、agent.* 等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (20)
 * attribution: placement 20
 */
import { HOOK_EVENTS as HOOK_EVENTS_3 } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-bfnfj4kx.js:1863-1874 placement
/**
 * 钩子事件清单
 */
var HOOK_EVENTS = HOOK_EVENTS_3;
//@ chunk-bfnfj4kx.js:1874-1910 placement
var mapped = HOOK_EVENTS.map((e) => `classic.${e}`);
//@ chunk-bfnfj4kx.js:1910-2835 placement
/**
 * 插件 hooks 模块可调用的 $ API 名单（model.complete、mcp.call、session.* 等）。
 */
var HOOK_API_CALLS = [
  "model.complete",
  "model.classify",
  "model.fork",
  "audio.play",
  "audio.speak",
  "mcp.call",
  "mcp.connect",
  "session.cwd",
  "session.root",
  "session.model",
  "session.turns",
  "session.id",
  "session.messages",
  "session.repo",
  "session.surface",
  "session.surfaces",
  "session.authorize",
  "session.identity",
  "session.usage",
  "session.version",
  "turn.abort",
  "prompt.read",
  "prompt.paint",
  "flag.value",
  "tool.list",
  "tool.register",
  "command.list",
  "command.register",
  "config.list",
  "agent.list",
  "agent.register",
  "ui.toast",
  "ui.status",
  "ui.log",
  "ui.notice",
  "ui.invalidate",
  "ui.open",
  "ui.close",
  "ui.panes",
  "ui.place",
  "ui.selection",
  "ui.copy",
  "ui.view",
  "ui.notify",
  "ui.blit",
  "fs.read",
  "fs.write",
  "fs.list",
  "fs.exists",
  "fs.stat",
  "fs.ancestors",
  "store.get",
  "store.set",
  "store.delete",
  "store.keys",
  "state.get",
  "state.set",
  "clock.now",
  "clock.sleep",
  "clock.after",
  "clock.every",
  "http.fetch",
  "process.run",
  "process.spawn",
  "settings.read",
  "env.get",
  "env.set",
];
//@ chunk-bfnfj4kx.js:2835-3576 placement
/**
 * 插件 hooks 模块可监听的事件名单（classic.*、tool.call、ui.*、prompt.*、agent.* 等）。
 */
var HOOK_EVENTS_2 = [
  ...mapped,
  "tool.call",
  "tool.check",
  "ui.render",
  "ui.resolve",
  "ui.press",
  "ui.input",
  "ui.select",
  "ui.message",
  "ui.fault",
  "ui.scroll",
  "ui.focus",
  "agent.offer",
  "agent.spawn",
  "prompt.submit",
  "prompt.fill",
  "prompt.suggest",
  "prompt.edit",
  "prompt.change",
  "prompt.autocomplete",
  "prompt.section",
  "prompt.context",
  "prompt.attachment",
  "prompt.mention",
  "prompt.compose",
  "tool.describe",
  "command.run",
  "command.describe",
  "config.set",
  "config.describe",
  "telemetry.log",
  "telemetry.mark",
  "skill.prompt",
  "attribution.text",
  "session.start",
  "session.receive",
  "session.append",
  "session.send",
  "session.compact",
  "session.attach",
  "session.detach",
  "session.measure",
  "session.end",
  "plugin.register",
  "turn.start",
  "turn.step",
  "turn.complete",
  "engine.create",
  ...HOOK_API_CALLS,
];
//@ chunk-bfnfj4kx.js:3576-3625 placement
var filtered = mapped.filter((e) => e !== "classic.PreToolUse");
//@ chunk-bfnfj4kx.js:3625-3654 placement
/**
 * 是否为已知 hooks 事件名。
 */
var isHookEvent = (e) => HOOK_EVENTS_2.includes(e);
//@ chunk-bfnfj4kx.js:3654-3683 placement
/**
 * 是否为 $ API 调用
 */
var isHookApiCall = (e) => HOOK_API_CALLS.includes(e);
//@ chunk-bfnfj4kx.js:3683-3721 placement
/**
 * 流式事件
 */
var STREAMING_EVENTS = ["turn.step", "process.spawn"];
//@ chunk-bfnfj4kx.js:3721-3750 placement
/**
 * 是否为流式事件（turn.step、process.spawn）。
 */
var isStreamingHookEvent = (e) => STREAMING_EVENTS.includes(e);
//@ chunk-bfnfj4kx.js:3750-3835 placement
/**
 * 事件命名空间集合
 */
var EVENT_NAMESPACES = new Set(
  HOOK_EVENTS_2.filter((e) => e.includes(".")).map((e) => e.slice(0, e.indexOf("."))),
);
//@ chunk-bfnfj4kx.js:3835-3979 placement
/**
 * 合法 JS 标识符的正则源（排除默认可忽略码点），用于校验插件自定义事件名。
 */
var IDENTIFIER_PATTERN_SOURCE =
  String.raw`(?!\p{Default_Ignorable_Code_Point})[\p{ID_Start}$_]` +
  String.raw`(?:(?!\p{Default_Ignorable_Code_Point})[\p{ID_Continue}$])*`;
//@ chunk-bfnfj4kx.js:3979-4029 placement
var regExp = new RegExp(String.raw`^${IDENTIFIER_PATTERN_SOURCE}\.${IDENTIFIER_PATTERN_SOURCE}$`, "u");
//@ chunk-bfnfj4kx.js:4029-4089 placement
/**
 * 是否为插件自定义事件名（不属于内置命名空间）。
 */
var isPluginDefinedEvent = (e) => regExp.test(e) && !EVENT_NAMESPACES.has(e.slice(0, e.indexOf(".")));
//@ chunk-bfnfj4kx.js:4089-4143 placement = VALID_UPDATE_SCOPES (0.841)
var VALID_UPDATE_SCOPES = ["managed", "user", "project", "local", "memory"];
//@ chunk-bfnfj4kx.js:4143-4181 placement
/**
 * 提示段落的放置方式（replace/append/insert）。
 */
var PROMPT_SECTION_MODES = ["replace", "append", "insert"];
//@ chunk-bfnfj4kx.js:4181-4231 placement
/**
 * 是否为合法的提示段落放置方式。
 */
var isPromptSectionMode = (mode) => typeof mode === "string" && PROMPT_SECTION_MODES.includes(mode);
//@ chunk-bfnfj4kx.js:4231-4275 placement
/**
 * Symbol.for 状态原子
 */
var STATE_ATOM_SYMBOL = Symbol.for("claude-code.state.atom");
//@ chunk-bfnfj4kx.js:4275-4412 placement
function deepFreeze(e) {
  if (typeof e !== "object" || e === null || Object.isFrozen(e)) return e;
  for (let o of Object.values(e)) deepFreeze(o);
  return Object.freeze(e);
}
//@ chunk-bfnfj4kx.js:4412-4527 placement
/**
 * 构造冻结的状态引用 {plugin, key, id?}。
 */
function stateRef(e, requestId = e.id) {
  let { plugin, key } = e;
  return Object.freeze(
    requestId === undefined
      ? {
          plugin,
          key,
        }
      : {
          plugin,
          key,
          id: requestId,
        },
  );
}
//@ chunk-bfnfj4kx.js:4527-4629 placement
/**
 * 创建状态原子描述（冻结）：引用、初始值与可选形状。
 */
var createStateAtom = (e, o, t) =>
  Object.freeze({
    [STATE_ATOM_SYMBOL]: true,
    ref: stateRef(e),
    initial: deepFreeze(o),
    ...(t?.shape !== undefined && {
      shape: t.shape,
    }),
  });
export {
  isStreamingHookEvent,
  HOOK_EVENTS,
  isHookApiCall,
  HOOK_EVENTS_2,
  VALID_UPDATE_SCOPES,
  HOOK_API_CALLS,
  filtered,
  isHookEvent,
  isPromptSectionMode,
  PROMPT_SECTION_MODES,
  STREAMING_EVENTS,
  STATE_ATOM_SYMBOL,
  stateRef,
  createStateAtom,
  isPluginDefinedEvent,
  IDENTIFIER_PATTERN_SOURCE,
};
