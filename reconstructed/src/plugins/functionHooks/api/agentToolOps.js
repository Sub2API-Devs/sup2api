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
import { denseListCopy } from "../sites/promptContextSites.js";
import { freezeApiObject } from "../dispatch/chain.js";
import {
  MCP_SERVER_NAME_RE,
  wrapNamespaceMethods,
  MODEL_OPS,
  AUDIO_OPS,
  mcpApi,
  COMMAND_OPS,
  CONFIG_OPS,
  FS_OPS,
  CLOCK_OPS,
  HTTP_FETCH_OP,
  PROCESS_OPS,
  ENV_OPS,
  isOutsideAllowedScope,
} from "./operations.js";
import { HooksError } from "../hooksErrors.js";
import {
  agentIdFromArg,
  SESSION_OPS,
  PROMPT_SUBMIT_OP,
  TELEMETRY_OPS,
  STORE_OPS,
  STATE_OPS,
  SETTINGS_OPS,
} from "./sessionOps.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../../utils/errors.js";
import { checkRenderArgument } from "../ui/renderSites.js";
import { normalizeFullWidthSpace, truncateToLength } from "../../../utils/stringUtils.js";
import { flagValueApi, coreNotAnOperation } from "./interfaces.js";
import { CORE_ORIGIN } from "../eventPatterns.js";

//@ chunk-4121qate.js:289524-289533 placement
/**
 * 5
 */
var MAX_QUESTION_OPTIONS = 5;
//@ chunk-4121qate.js:289533-289814 placement
var buildAgentToolInput = (e, prompt) => ({
  tool: AGENT_TOOL_NAME,
  prompt,
  description: e.description ?? prompt.split(/\s+/).slice(0, MAX_QUESTION_OPTIONS).join(" "),
  run_in_background: true,
  ...(e.model !== undefined && {
    model: e.model,
  }),
  ...(e.subagentType !== undefined && {
    subagent_type: e.subagentType,
  }),
  ...(e.name !== undefined && {
    name: e.name,
  }),
  ...(e.cwd !== undefined && {
    cwd: e.cwd,
  }),
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
          if (r === undefined) return [];
          return [[o, Array.isArray(r) ? [...denseListCopy(r)] : r]];
        }),
      )
    : undefined;
//@ chunk-4121qate.js:290178-290264 placement
/**
 * 取 resolvedModel 字符串
 */
function resolvedModelOf(e) {
  let resolvedModel = isPlainObject(e) ? e.resolvedModel : undefined;
  return typeof resolvedModel === "string" ? resolvedModel : undefined;
}
//@ chunk-4121qate.js:290264-290347 placement
/**
 * 取 teammate_id
 */
function teammateIdOf(result) {
  let teammateId = isPlainObject(result) ? result.teammate_id : undefined;
  return typeof teammateId === "string" ? teammateId : undefined;
}
//@ chunk-4121qate.js:290347-291046 placement
var AGENT_OPS = (pluginName, host) =>
  freezeApiObject({
    list: () => host("agent.list", {}),
    register: (r) => {
      let n = pickAgentDefinitionFields(r);
      return n !== undefined && typeof n.name === "string" && MCP_SERVER_NAME_RE.test(n.name)
        ? host("agent.register", n)
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.agent.register takes { name, description, prompt, ... }; name is letters, digits, _ or - (up to 64)`,
            ),
          );
    },
    spawn: async (r) => {
      let prompt = r?.prompt;
      if (r === undefined || typeof prompt !== "string" || prompt.trim() === "")
        throw new HooksError(`${pluginName}: $.agent.spawn takes { prompt, ... } (a non-empty prompt)`);
      let i = await host("agent.spawn", buildAgentToolInput(r, prompt));
      let p = i.deny ?? (i.isError === true ? i.text : undefined);
      let f = agentIdFromArg(i.result);
      let a = teammateIdOf(i.result);
      let m = p === undefined;
      return freezeApiObject(
        m
          ? {
              model: resolvedModelOf(i.result) ?? r.model ?? "inherit",
              ...(f !== undefined && {
                agentId: f,
              }),
              ...(a !== undefined && {
                teammateId: a,
              }),
            }
          : {
              deny: p,
            },
      );
    },
  });
//@ chunk-4121qate.js:291046-292403 placement
/**
 * $.tool.register 实现：校验 name/description/inputSchema
 */
var TOOL_REGISTER_OP = (pluginName, host) =>
  freezeApiObject({
    register: (r) => {
      if (!isPlainObject(r) || typeof r.name !== "string" || !MCP_SERVER_NAME_RE.test(r.name))
        return Promise.reject(
          new HooksError(
            `${pluginName}: $.tool.register takes { name, description, inputSchema?, isDeferred? }; name is letters, digits, _ or - (up to 64)`,
          ),
        );
      if (typeof r.description !== "string" || r.description.trim() === "")
        return Promise.reject(
          new HooksError(
            `${pluginName}: $.tool.register: ${r.name} needs a description (what the model reads)`,
          ),
        );
      if (r.isDeferred !== undefined && typeof r.isDeferred !== "boolean")
        return Promise.reject(
          new HooksError(`${pluginName}: $.tool.register: ${r.name}'s isDeferred must be true or false`),
        );
      let p = r.inputSchema ?? {
        type: "object",
      };
      return isPlainObject(p)
        ? host("tool.register", {
            name: r.name,
            description: r.description,
            inputSchema: {
              type: "object",
              ...p,
            },
            ...(r.isDeferred !== undefined && {
              isDeferred: r.isDeferred,
            }),
          })
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.tool.register: ${r.name}'s inputSchema must be a JSON schema object`,
            ),
          );
    },
    list: () => host("tool.list", {}),
    call: async (r) => {
      if (!isPlainObject(r)) throw new HooksError(`${pluginName}: $.tool.call: input must be an object`);
      if (typeof r.tool !== "string" || r.tool.length === 0)
        throw new HooksError(`${pluginName}: $.tool.call takes the event's input: { tool, ...args }`);
      return host("tool.call", r);
    },
    check: (r) =>
      isPlainObject(r) && typeof r.tool === "string" && r.tool.length > 0 && isPlainObject(r.input)
        ? host("tool.check", {
            tool: r.tool,
            input: r.input,
          })
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.tool.check takes { tool, input }: the tool's name and its arguments, an object`,
            ),
          ),
  });
//@ chunk-4121qate.js:292403-292615 placement
var TURN_OPS = (pluginName, host) =>
  freezeApiObject({
    abort: (r) => {
      let turnId = isPlainObject(r) ? r.turnId : undefined;
      return typeof turnId !== "string" || turnId === ""
        ? Promise.reject(
            new HooksError(`${pluginName}: $.turn.abort takes { turnId } (the id turn.start carried)`),
          )
        : host("turn.abort", {
            turnId,
          });
    },
  });
//@ chunk-4121qate.js:292615-292625 placement
/**
 * 12
 */
var MAX_ROW_CELLS = 12;
//@ chunk-4121qate.js:292625-292634 placement
/**
 * 4
 */
var MAX_UI_ROWS = 4;
//@ chunk-4121qate.js:292634-292643 placement
/**
 * 2
 */
var MAX_OPTIONS = 2;
//@ chunk-4121qate.js:292643-292663 placement
/**
 * ["Yes","No"]
 */
var DEFAULT_YES_NO = ["Yes", "No"];
//@ chunk-4121qate.js:292663-292674 placement
/**
 * 120
 */
var MAX_WAIT_SECONDS = 120;
//@ chunk-4121qate.js:292674-292699 placement = ASK_USER_QUESTION_TOOL_NAME (1)
/**
 * AskUserQuestion 工具名常量（另一 chunk 中的同值副本）。
 */
var ASK_USER_QUESTION_TOOL_NAME = "AskUserQuestion";
//@ chunk-4121qate.js:292699-293047 placement
/**
 * 校验 $.ui.ask 的选项列表（最多 4 个），转成字符串数组并保留稀疏位。
 */
function normalizeAskOptions(e, options) {
  let r = options ?? [];
  let n = Array.isArray(r) ? Number(r.length) : Number.NaN;
  let s = Number.isSafeInteger(n) && n >= 0;
  if (!Array.isArray(r) || !s) throw new HooksError(`${e}: $.ui.ask takes its options as a list`);
  if (n > MAX_UI_ROWS) throw new HooksError(`${e}: $.ui.ask takes at most ${MAX_UI_ROWS} options (got ${n})`);
  let i = [];
  i.length = n;
  for (let p = 0; p < n; p += 1) if (p in r) i[p] = String(r[p]);
  return i;
}
//@ chunk-4121qate.js:293047-293146 placement
/**
 * 不足则补 Yes/No
 */
function ensureQuestions(e) {
  return e.length >= MAX_OPTIONS
    ? e
    : [...e, ...DEFAULT_YES_NO.filter((r) => !e.includes(r)).slice(0, MAX_OPTIONS - e.length)];
}
//@ chunk-4121qate.js:293146-293219 placement
/**
 * 带 cells 字符串的表格
 */
function isCellsStringTable(e) {
  return isPlainObject(e) && typeof e.cells === "string" && e.source === undefined;
}
//@ chunk-4121qate.js:293219-293483 placement
function normalizeRenderRequest(e) {
  let o = {
    ...(e?.columns !== undefined && {
      columns: e.columns,
    }),
    ...(e?.rows !== undefined && {
      rows: e.rows,
    }),
  };
  return isCellsStringTable(e)
    ? {
        requestId: e.requestId,
        key: e.key,
        cells: e.cells,
        ...o,
      }
    : {
        requestId: e?.requestId,
        key: e?.key,
        source: e?.source,
        ...(isPlainObject(e) &&
          "cells" in e && {
            cells: e.cells,
          }),
        ...o,
      };
}
//@ chunk-4121qate.js:293483-293552 placement
/**
 * ui.log/notice/invalidate/toast/status
 */
var UI_EVENT_NAMES = ["ui.log", "ui.notice", "ui.invalidate", "ui.toast", "ui.status"];
//@ chunk-4121qate.js:293552-293580 placement
/**
 * 是否 ui.* 事件
 */
var isUiEventName = (e) => UI_EVENT_NAMES.includes(e);
//@ chunk-4121qate.js:293580-293797 placement
function normalizeAgentIdArg(e) {
  let o =
    isPlainObject(e) &&
    Object.prototype.toString.call(e) === "[object Object]" &&
    Reflect.ownKeys(e).every((s) => s === "agentId");
  let r = o && !("agentId" in e);
  let agentId = o ? e.agentId : undefined;
  return r
    ? {}
    : {
        agentId: typeof agentId === "string" ? agentId : "",
      };
}
//@ chunk-4121qate.js:293797-295915 placement
function UI_LOG_OP(pluginName, host, resolvedTable) {
  let n = (a, m) => {
    host(a, m).catch((error) =>
      matcherLog().log(`[${pluginName}] $.${a} dropped: ${errorMessage(error)}`, "warn"),
    );
  };
  let log = (a, m = {}) =>
    n("ui.log", {
      text: String(a),
      to: m?.to ?? "transcript",
    });
  let toast = (a, m = {}) => {
    n("ui.toast", {
      text: String(a),
      ...(typeof m.timeoutMs === "number" && {
        timeoutMs: m.timeoutMs,
      }),
    });
  };
  let status = (a) => {
    n("ui.status", {
      text: a === undefined || a === null ? undefined : String(a),
    });
  };
  function f(a) {
    let m = checkRenderArgument(a);
    if (m !== undefined) throw new HooksError(`${pluginName}: $.ui.resolve ${m}`);
    return resolvedTable(a);
  }
  return freezeApiObject({
    notice: (toolUseId, text) =>
      n("ui.notice", {
        tool_use_id: toolUseId,
        text,
      }),
    invalidate: (event) =>
      n("ui.invalidate", {
        event,
      }),
    blit: (a) => host("ui.blit", normalizeRenderRequest(a)),
    resolve: f,
    log,
    status,
    ask: async (a, m) => {
      if (typeof a !== "string" || a.trim() === "")
        throw new HooksError(`${pluginName}: $.ui.ask takes the question first`);
      let c = Array.isArray(m)
        ? {
            options: m,
          }
        : (m ?? {});
      let u = normalizeAskOptions(pluginName, c.options);
      let l = normalizeFullWidthSpace(a);
      let questions = ensureQuestions(u.map(normalizeFullWidthSpace));
      let header = truncateToLength(c.header ?? "Plugin", MAX_ROW_CELLS);
      let x = await host("ui.ask", {
        tool: ASK_USER_QUESTION_TOOL_NAME,
        questions: [
          {
            question: l,
            header,
            options: questions.map((label) => ({
              label,
              description: "",
            })),
            multiSelect: c.multiSelect === true,
          },
        ],
      });
      let T = x.result?.answers?.[l];
      let h = (v) => u.find((R) => normalizeFullWidthSpace(R) === v) ?? v;
      if (typeof T === "string") return h(T);
      if (Array.isArray(T)) return T.map((v) => h(String(v))).join(", ");
      throw new HooksError(
        `${pluginName}: $.ui.ask: no answer (${truncateToLength(x.deny ?? x.text ?? "", MAX_WAIT_SECONDS) || "the dialog was dismissed"})`,
      );
    },
    toast,
    notify: (text, m = {}) =>
      host("ui.notify", {
        text,
        ...(m?.title !== undefined && {
          title: m.title,
        }),
      }),
    open: (a) =>
      host("ui.open", {
        id: a?.id,
        ...(a?.title !== undefined && {
          title: String(a.title),
        }),
        ...(a?.focus !== undefined && {
          focus: a.focus,
        }),
        ...(a?.closeOnEscape !== undefined && {
          closeOnEscape: a.closeOnEscape,
        }),
        ...(a?.holdToasts !== undefined && {
          holdToasts: a.holdToasts,
        }),
        ...(a?.backgroundColor !== undefined && {
          backgroundColor: a.backgroundColor,
        }),
        ...(a?.rows !== undefined && {
          rows: a.rows,
        }),
        ...(a?.columns !== undefined && {
          columns: a.columns,
        }),
      }),
    close: (a) =>
      host("ui.close", {
        id: a?.id,
        origin: {
          kind: "plugin",
        },
      }),
    panes: () => host("ui.panes", {}),
    place: (a) =>
      host("ui.place", {
        id: a?.id,
      }),
    selection: () => host("ui.selection", {}),
    scroll: (a) =>
      host("ui.scroll", {
        to: a?.to,
        ...(a?.in !== undefined && {
          in: a.in,
        }),
        ...(a?.block !== undefined && {
          block: a.block,
        }),
      }),
    focus: (a) =>
      host("ui.focus", {
        requestId: a?.requestId,
        key: a?.key,
      }),
    copy: (a) =>
      host("ui.copy", {
        text: a?.text,
        ...(a?.surface !== undefined && {
          surface: a.surface,
        }),
      }),
    view: (a) => host("ui.view", normalizeAgentIdArg(a)),
  });
}
//@ chunk-4121qate.js:295915-296540 placement
function MCP_OPS({
  pluginName,
  host,
  hostStream,
  resolvedTable,
  timers,
  unloaded,
  invoke,
  wrapMethod,
  signalFrom,
  makeSignal,
}) {
  let c = (u) => wrapNamespaceMethods(u, wrapMethod);
  return {
    ui: c(UI_LOG_OP(pluginName, host, resolvedTable)),
    model: c(MODEL_OPS(host)),
    audio: c(AUDIO_OPS(pluginName, host)),
    mcp: c(
      mcpApi(
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
        pluginName,
        host,
        live: timers,
        unloaded,
        invoke,
        signalFrom,
        makeSignal,
      }),
    ),
    http: c(HTTP_FETCH_OP(pluginName, host)),
    process: c(PROCESS_OPS(host, hostStream)),
    settings: c(SETTINGS_OPS(pluginName, host)),
    env: c(ENV_OPS(host)),
    flag: c(flagValueApi(host)),
  };
}
//@ chunk-4121qate.js:296540-296803 placement
function buildCoreMethodTable() {
  let e = {};
  let o = MCP_OPS({
    pluginName: "core",
    host: coreNotAnOperation,
    hostStream: coreNotAnOperation,
    resolvedTable: coreNotAnOperation,
    timers: new Set(),
    unloaded: coreNotAnOperation,
    invoke: coreNotAnOperation,
    wrapMethod: (r) => r,
    signalFrom: coreNotAnOperation,
    makeSignal: coreNotAnOperation,
  });
  for (let [key, value] of Object.entries(o)) e[key] = Object.freeze(Object.keys(value));
  return Object.freeze(e);
}
//@ chunk-4121qate.js:296803-296815 placement
/**
 * 核心方法表
 */
var coreInterfaceTable = buildCoreMethodTable();
//@ chunk-4121qate.js:296815-296923 placement
/**
 * 把核心方法表转换为接口表（owner=core、方法名列表），只包含允许的命名空间。
 */
function coreInterfaceTable_2() {
  let e = {};
  for (let [key, value] of Object.entries(coreInterfaceTable))
    if (isOutsideAllowedScope(key))
      e[key] = {
        owner: CORE_ORIGIN,
        methods: [...value],
      };
  return e;
}
export { MCP_OPS, resolvedModelOf, isUiEventName, coreInterfaceTable_2 };
