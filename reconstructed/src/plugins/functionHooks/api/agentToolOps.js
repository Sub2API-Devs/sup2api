/**
 * plugins/functionHooks/api/agentToolOps.ts
 *
 * 函数钩子 $ 接口：agent/tool/mcp/ui.log 操作（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (27)
 * attribution: placement 27
 */
import { AGENT_TOOL_NAME } from "../../../tools/AgentTool/constants.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { Xv } from "../sites/promptContextSites.js";
import { freezeApiObject } from "../dispatch/chain.js";
import {
  lxt,
  wrapNamespaceMethods,
  MODEL_OPS,
  AUDIO_OPS,
  DC,
  COMMAND_OPS,
  CONFIG_OPS,
  FS_OPS,
  CLOCK_OPS,
  HTTP_FETCH_OP,
  PROCESS_OPS,
  ENV_OPS,
  wC,
} from "./operations.js";
import { HooksError } from "../hooksErrors.js";
import {
  Id,
  SESSION_OPS,
  PROMPT_SUBMIT_OP,
  TELEMETRY_OPS,
  STORE_OPS,
  STATE_OPS,
  SETTINGS_OPS,
} from "./sessionOps.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../../utils/errors.js";
import { checkRenderArgument } from "../ui/renderSites.js";
import { normalizeFullWidthSpace, truncateToLength } from "../../../utils/stringUtils.js";
import { xC, Mt } from "./interfaces.js";
import { CORE_ORIGIN } from "../eventPatterns.js";

//@ chunk-4121qate.js:289524-289533 placement
var Md = 5;
//@ chunk-4121qate.js:289533-289814 placement
var buildAgentToolInput = (e, o) => ({
  tool: AGENT_TOOL_NAME,
  prompt: o,
  description: e.description ?? o.split(/\s+/).slice(0, Md).join(" "),
  run_in_background: !0,
  ...(e.model !== void 0 && { model: e.model }),
  ...(e.subagentType !== void 0 && { subagent_type: e.subagentType }),
  ...(e.name !== void 0 && { name: e.name }),
  ...(e.cwd !== void 0 && { cwd: e.cwd }),
});
//@ chunk-4121qate.js:289814-290039 placement
var PLUGIN_AGENT_FIELDS = [
  "name",
  "description",
  "prompt",
  "tools",
  "disallowedTools",
  "model",
  "effort",
  "permissionMode",
  "mcpServers",
  "hooks",
  "maxTurns",
  "autoCompactWindow",
  "skills",
  "initialPrompt",
  "memory",
  "background",
  "omitClaudeMd",
  "isolation",
];
//@ chunk-4121qate.js:290039-290178 placement
var pickAgentDefinitionFields = (e) =>
  isPlainObject(e)
    ? Object.fromEntries(
        PLUGIN_AGENT_FIELDS.flatMap((o) => {
          let r = e[o];
          if (r === void 0) return [];
          return [[o, Array.isArray(r) ? [...Xv(r)] : r]];
        }),
      )
    : void 0;
//@ chunk-4121qate.js:290178-290264 placement
function Peo(e) {
  let o = isPlainObject(e) ? e.resolvedModel : void 0;
  return typeof o === "string" ? o : void 0;
}
//@ chunk-4121qate.js:290264-290347 placement
function $d(e) {
  let o = isPlainObject(e) ? e.teammate_id : void 0;
  return typeof o === "string" ? o : void 0;
}
//@ chunk-4121qate.js:290347-291046 placement
var AGENT_OPS = (e, o) =>
  freezeApiObject({
    list: () => o("agent.list", {}),
    register: (r) => {
      let n = pickAgentDefinitionFields(r);
      return n !== void 0 && typeof n.name === "string" && lxt.test(n.name)
        ? o("agent.register", n)
        : Promise.reject(
            new HooksError(
              `${e}: $.agent.register takes { name, description, prompt, ... }; name is letters, digits, _ or - (up to 64)`,
            ),
          );
    },
    spawn: async (r) => {
      let n = r?.prompt;
      if (r === void 0 || typeof n !== "string" || n.trim() === "")
        throw new HooksError(`${e}: $.agent.spawn takes { prompt, ... } (a non-empty prompt)`);
      let i = await o("agent.spawn", buildAgentToolInput(r, n)),
        p = i.deny ?? (i.isError === !0 ? i.text : void 0),
        f = Id(i.result),
        a = $d(i.result),
        m = p === void 0;
      return freezeApiObject(
        m
          ? {
              model: Peo(i.result) ?? r.model ?? "inherit",
              ...(f !== void 0 && { agentId: f }),
              ...(a !== void 0 && { teammateId: a }),
            }
          : { deny: p },
      );
    },
  });
/**
 * $.tool.register 实现：校验 name/description/inputSchema
 */
//@ chunk-4121qate.js:291046-292403 placement
var TOOL_REGISTER_OP = (e, o) =>
  freezeApiObject({
    register: (r) => {
      if (!isPlainObject(r) || typeof r.name !== "string" || !lxt.test(r.name))
        return Promise.reject(
          new HooksError(
            `${e}: $.tool.register takes { name, description, inputSchema?, isDeferred? }; name is letters, digits, _ or - (up to 64)`,
          ),
        );
      if (typeof r.description !== "string" || r.description.trim() === "")
        return Promise.reject(
          new HooksError(`${e}: $.tool.register: ${r.name} needs a description (what the model reads)`),
        );
      if (r.isDeferred !== void 0 && typeof r.isDeferred !== "boolean")
        return Promise.reject(
          new HooksError(`${e}: $.tool.register: ${r.name}'s isDeferred must be true or false`),
        );
      let p = r.inputSchema ?? { type: "object" };
      return isPlainObject(p)
        ? o("tool.register", {
            name: r.name,
            description: r.description,
            inputSchema: { type: "object", ...p },
            ...(r.isDeferred !== void 0 && { isDeferred: r.isDeferred }),
          })
        : Promise.reject(
            new HooksError(`${e}: $.tool.register: ${r.name}'s inputSchema must be a JSON schema object`),
          );
    },
    list: () => o("tool.list", {}),
    call: async (r) => {
      if (!isPlainObject(r)) throw new HooksError(`${e}: $.tool.call: input must be an object`);
      if (typeof r.tool !== "string" || r.tool.length === 0)
        throw new HooksError(`${e}: $.tool.call takes the event's input: { tool, ...args }`);
      return o("tool.call", r);
    },
    check: (r) =>
      isPlainObject(r) && typeof r.tool === "string" && r.tool.length > 0 && isPlainObject(r.input)
        ? o("tool.check", { tool: r.tool, input: r.input })
        : Promise.reject(
            new HooksError(
              `${e}: $.tool.check takes { tool, input }: the tool's name and its arguments, an object`,
            ),
          ),
  });
//@ chunk-4121qate.js:292403-292615 placement
var TURN_OPS = (e, o) =>
  freezeApiObject({
    abort: (r) => {
      let n = isPlainObject(r) ? r.turnId : void 0;
      return typeof n !== "string" || n === ""
        ? Promise.reject(new HooksError(`${e}: $.turn.abort takes { turnId } (the id turn.start carried)`))
        : o("turn.abort", { turnId: n });
    },
  });
//@ chunk-4121qate.js:292615-292625 placement
var jH = 12;
//@ chunk-4121qate.js:292625-292634 placement
var Ud = 4;
//@ chunk-4121qate.js:292634-292643 placement
var Wd = 2;
//@ chunk-4121qate.js:292643-292663 placement
var $H = ["Yes", "No"];
//@ chunk-4121qate.js:292663-292674 placement
var DH = 120;
/**
 * AskUserQuestion 工具名常量（另一 chunk 中的同值副本）。
 */
//@ chunk-4121qate.js:292674-292699 placement = ASK_USER_QUESTION_TOOL_NAME (1)
var ASK_USER_QUESTION_TOOL_NAME = "AskUserQuestion";
/**
 * 校验 $.ui.ask 的选项列表（最多 4 个），转成字符串数组并保留稀疏位。
 */
//@ chunk-4121qate.js:292699-293047 placement
function normalizeAskOptions(e, o) {
  let r = o ?? [],
    n = Array.isArray(r) ? Number(r.length) : Number.NaN,
    s = Number.isSafeInteger(n) && n >= 0;
  if (!Array.isArray(r) || !s) throw new HooksError(`${e}: $.ui.ask takes its options as a list`);
  if (n > Ud) throw new HooksError(`${e}: $.ui.ask takes at most ${Ud} options (got ${n})`);
  let i = [];
  i.length = n;
  for (let p = 0; p < n; p += 1) if (p in r) i[p] = String(r[p]);
  return i;
}
//@ chunk-4121qate.js:293047-293146 placement
function Xd(e) {
  return e.length >= Wd ? e : [...e, ...$H.filter((r) => !e.includes(r)).slice(0, Wd - e.length)];
}
//@ chunk-4121qate.js:293146-293219 placement
function zd(e) {
  return isPlainObject(e) && typeof e.cells === "string" && e.source === void 0;
}
//@ chunk-4121qate.js:293219-293483 placement
function normalizeRenderRequest(e) {
  let o = {
    ...(e?.columns !== void 0 && { columns: e.columns }),
    ...(e?.rows !== void 0 && { rows: e.rows }),
  };
  return zd(e)
    ? { requestId: e.requestId, key: e.key, cells: e.cells, ...o }
    : {
        requestId: e?.requestId,
        key: e?.key,
        source: e?.source,
        ...(isPlainObject(e) && "cells" in e && { cells: e.cells }),
        ...o,
      };
}
//@ chunk-4121qate.js:293483-293552 placement
var Jd = ["ui.log", "ui.notice", "ui.invalidate", "ui.toast", "ui.status"];
//@ chunk-4121qate.js:293552-293580 placement
var y3t = (e) => Jd.includes(e);
//@ chunk-4121qate.js:293580-293797 placement
function normalizeAgentIdArg(e) {
  let o =
      isPlainObject(e) &&
      Object.prototype.toString.call(e) === "[object Object]" &&
      Reflect.ownKeys(e).every((s) => s === "agentId"),
    r = o && !("agentId" in e),
    n = o ? e.agentId : void 0;
  return r ? {} : { agentId: typeof n === "string" ? n : "" };
}
//@ chunk-4121qate.js:293797-295915 placement
function UI_LOG_OP(e, o, r) {
  let n = (a, m) => {
      o(a, m).catch((c) => pd().log(`[${e}] $.${a} dropped: ${errorMessage(c)}`, "warn"));
    },
    s = (a, m = {}) => n("ui.log", { text: String(a), to: m?.to ?? "transcript" }),
    i = (a, m = {}) => {
      n("ui.toast", { text: String(a), ...(typeof m.timeoutMs === "number" && { timeoutMs: m.timeoutMs }) });
    },
    p = (a) => {
      n("ui.status", { text: a === void 0 || a === null ? void 0 : String(a) });
    };
  function f(a) {
    let m = checkRenderArgument(a);
    if (m !== void 0) throw new HooksError(`${e}: $.ui.resolve ${m}`);
    return r(a);
  }
  return freezeApiObject({
    notice: (a, m) => n("ui.notice", { tool_use_id: a, text: m }),
    invalidate: (a) => n("ui.invalidate", { event: a }),
    blit: (a) => o("ui.blit", normalizeRenderRequest(a)),
    resolve: f,
    log: s,
    status: p,
    ask: async (a, m) => {
      if (typeof a !== "string" || a.trim() === "")
        throw new HooksError(`${e}: $.ui.ask takes the question first`);
      let c = Array.isArray(m) ? { options: m } : (m ?? {}),
        u = normalizeAskOptions(e, c.options),
        l = normalizeFullWidthSpace(a),
        y = Xd(u.map(normalizeFullWidthSpace)),
        g = truncateToLength(c.header ?? "Plugin", jH),
        x = await o("ui.ask", {
          tool: ASK_USER_QUESTION_TOOL_NAME,
          questions: [
            {
              question: l,
              header: g,
              options: y.map((v) => ({ label: v, description: "" })),
              multiSelect: c.multiSelect === !0,
            },
          ],
        }),
        T = x.result?.answers?.[l],
        h = (v) => u.find((R) => normalizeFullWidthSpace(R) === v) ?? v;
      if (typeof T === "string") return h(T);
      if (Array.isArray(T)) return T.map((v) => h(String(v))).join(", ");
      throw new HooksError(
        `${e}: $.ui.ask: no answer (${truncateToLength(x.deny ?? x.text ?? "", DH) || "the dialog was dismissed"})`,
      );
    },
    toast: i,
    notify: (a, m = {}) => o("ui.notify", { text: a, ...(m?.title !== void 0 && { title: m.title }) }),
    open: (a) =>
      o("ui.open", {
        id: a?.id,
        ...(a?.title !== void 0 && { title: String(a.title) }),
        ...(a?.focus !== void 0 && { focus: a.focus }),
        ...(a?.closeOnEscape !== void 0 && { closeOnEscape: a.closeOnEscape }),
        ...(a?.holdToasts !== void 0 && { holdToasts: a.holdToasts }),
        ...(a?.backgroundColor !== void 0 && { backgroundColor: a.backgroundColor }),
        ...(a?.rows !== void 0 && { rows: a.rows }),
        ...(a?.columns !== void 0 && { columns: a.columns }),
      }),
    close: (a) => o("ui.close", { id: a?.id, origin: { kind: "plugin" } }),
    panes: () => o("ui.panes", {}),
    place: (a) => o("ui.place", { id: a?.id }),
    selection: () => o("ui.selection", {}),
    scroll: (a) =>
      o("ui.scroll", {
        to: a?.to,
        ...(a?.in !== void 0 && { in: a.in }),
        ...(a?.block !== void 0 && { block: a.block }),
      }),
    focus: (a) => o("ui.focus", { requestId: a?.requestId, key: a?.key }),
    copy: (a) => o("ui.copy", { text: a?.text, ...(a?.surface !== void 0 && { surface: a.surface }) }),
    view: (a) => o("ui.view", normalizeAgentIdArg(a)),
  });
}
//@ chunk-4121qate.js:295915-296540 placement
function MCP_OPS({
  pluginName: pluginName,
  host: host,
  hostStream: hostStream,
  resolvedTable: resolvedTable,
  timers: timers,
  unloaded: unloaded,
  invoke: invoke,
  wrapMethod: wrapMethod,
  signalFrom: signalFrom,
  makeSignal: makeSignal,
}) {
  let c = (u) => wrapNamespaceMethods(u, wrapMethod);
  return {
    ui: c(UI_LOG_OP(pluginName, host, resolvedTable)),
    model: c(MODEL_OPS(host)),
    audio: c(AUDIO_OPS(pluginName, host)),
    mcp: c(
      DC(
        pluginName,
        (u) => host("mcp.call", u),
        (u) => host("mcp.connect", u),
      ),
    ),
    session: c(SESSION_OPS(pluginName, host)),
    prompt: c(PROMPT_SUBMIT_OP(pluginName, host)),
    turn: c(TURN_OPS(pluginName, host)),
    tool: c(TOOL_REGISTER_OP(pluginName, host)),
    command: c(COMMAND_OPS(pluginName, host)),
    config: c(CONFIG_OPS(pluginName, host)),
    telemetry: c(TELEMETRY_OPS(pluginName, host)),
    agent: c(AGENT_OPS(pluginName, host)),
    fs: c(FS_OPS(host)),
    store: c(STORE_OPS(pluginName, host)),
    state: c(STATE_OPS(pluginName, host)),
    clock: c(
      CLOCK_OPS({
        pluginName: pluginName,
        host: host,
        live: timers,
        unloaded: unloaded,
        invoke: invoke,
        signalFrom: signalFrom,
        makeSignal: makeSignal,
      }),
    ),
    http: c(HTTP_FETCH_OP(pluginName, host)),
    process: c(PROCESS_OPS(host, hostStream)),
    settings: c(SETTINGS_OPS(pluginName, host)),
    env: c(ENV_OPS(host)),
    flag: c(xC(host)),
  };
}
//@ chunk-4121qate.js:296540-296803 placement
function buildCoreMethodTable() {
  let e = {},
    o = MCP_OPS({
      pluginName: "core",
      host: Mt,
      hostStream: Mt,
      resolvedTable: Mt,
      timers: new Set(),
      unloaded: Mt,
      invoke: Mt,
      wrapMethod: (r) => r,
      signalFrom: Mt,
      makeSignal: Mt,
    });
  for (let [r, n] of Object.entries(o)) e[r] = Object.freeze(Object.keys(n));
  return Object.freeze(e);
}
//@ chunk-4121qate.js:296803-296815 placement
var el = buildCoreMethodTable();
/**
 * 把核心方法表转换为接口表（owner=core、方法名列表），只包含允许的命名空间。
 */
//@ chunk-4121qate.js:296815-296923 placement
function coreInterfaceTable() {
  let e = {};
  for (let [o, r] of Object.entries(el)) if (wC(o)) e[o] = { owner: CORE_ORIGIN, methods: [...r] };
  return e;
}

export { MCP_OPS, Peo, y3t, coreInterfaceTable };
