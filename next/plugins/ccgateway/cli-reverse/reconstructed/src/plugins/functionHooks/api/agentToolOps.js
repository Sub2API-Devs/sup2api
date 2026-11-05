/**
 * plugins/functionHooks/api/agentToolOps.ts
 *
 * 函数钩子 $ 接口：agent/tool/mcp/ui.log 操作（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (27)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:270716-270725 placement
/**
 * 5
 */
var MAX_QUESTION_OPTIONS = 5;
//@ chunk-j8f885h1.js:270725-271006 placement
var buildAgentToolInput = (args, prompt) => ({
  tool: AGENT_TOOL_NAME,
  prompt,
  description: args.description ?? prompt.split(/\s+/).slice(0, MAX_QUESTION_OPTIONS).join(" "),
  run_in_background: true,
  ...(args.model !== undefined && {
    model: args.model,
  }),
  ...(args.subagentType !== undefined && {
    subagent_type: args.subagentType,
  }),
  ...(args.name !== undefined && {
    name: args.name,
  }),
  ...(args.cwd !== undefined && {
    cwd: args.cwd,
  }),
});
//@ chunk-j8f885h1.js:271006-271231 placement
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
//@ chunk-j8f885h1.js:271231-271370 placement
var pickAgentDefinitionFields = (value) =>
  isPlainObject(value)
    ? Object.fromEntries(
        PLUGIN_AGENT_FIELDS.flatMap((field) => {
          let fieldValue = value[field];
          if (fieldValue === undefined) return [];
          return [[field, Array.isArray(fieldValue) ? [...denseListCopy(fieldValue)] : fieldValue]];
        }),
      )
    : undefined;
//@ chunk-j8f885h1.js:271370-271456 placement
/**
 * 取 resolvedModel 字符串
 */
function resolvedModelOf(value) {
  let resolvedModel = isPlainObject(value) ? value.resolvedModel : undefined;
  return typeof resolvedModel === "string" ? resolvedModel : undefined;
}
//@ chunk-j8f885h1.js:271456-271539 placement
/**
 * 取 teammate_id
 */
function teammateIdOf(result) {
  let teammateId = isPlainObject(result) ? result.teammate_id : undefined;
  return typeof teammateId === "string" ? teammateId : undefined;
}
//@ chunk-j8f885h1.js:271539-272238 placement
var AGENT_OPS = (pluginName, host) =>
  freezeApiObject({
    list: () => host("agent.list", {}),
    register: (args) => {
      let definition = pickAgentDefinitionFields(args);
      return definition !== undefined &&
        typeof definition.name === "string" &&
        MCP_SERVER_NAME_RE.test(definition.name)
        ? host("agent.register", definition)
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.agent.register takes { name, description, prompt, ... }; name is letters, digits, _ or - (up to 64)`,
            ),
          );
    },
    spawn: async (args) => {
      let prompt = args?.prompt;
      if (args === undefined || typeof prompt !== "string" || prompt.trim() === "")
        throw new HooksError(`${pluginName}: $.agent.spawn takes { prompt, ... } (a non-empty prompt)`);
      let result = await host("agent.spawn", buildAgentToolInput(args, prompt));
      let denyReason = result.deny ?? (result.isError === true ? result.text : undefined);
      let agentId = agentIdFromArg(result.result);
      let teammateId = teammateIdOf(result.result);
      let ok = denyReason === undefined;
      return freezeApiObject(
        ok
          ? {
              model: resolvedModelOf(result.result) ?? args.model ?? "inherit",
              ...(agentId !== undefined && {
                agentId,
              }),
              ...(teammateId !== undefined && {
                teammateId,
              }),
            }
          : {
              deny: denyReason,
            },
      );
    },
  });
//@ chunk-j8f885h1.js:272238-273595 placement
/**
 * $.tool.register 实现：校验 name/description/inputSchema
 */
var TOOL_REGISTER_OP = (pluginName, host) =>
  freezeApiObject({
    register: (definition) => {
      if (
        !isPlainObject(definition) ||
        typeof definition.name !== "string" ||
        !MCP_SERVER_NAME_RE.test(definition.name)
      )
        return Promise.reject(
          new HooksError(
            `${pluginName}: $.tool.register takes { name, description, inputSchema?, isDeferred? }; name is letters, digits, _ or - (up to 64)`,
          ),
        );
      if (typeof definition.description !== "string" || definition.description.trim() === "")
        return Promise.reject(
          new HooksError(
            `${pluginName}: $.tool.register: ${definition.name} needs a description (what the model reads)`,
          ),
        );
      if (definition.isDeferred !== undefined && typeof definition.isDeferred !== "boolean")
        return Promise.reject(
          new HooksError(
            `${pluginName}: $.tool.register: ${definition.name}'s isDeferred must be true or false`,
          ),
        );
      let name = definition.inputSchema ?? {
        type: "object",
      };
      return isPlainObject(name)
        ? host("tool.register", {
            name: definition.name,
            description: definition.description,
            inputSchema: {
              type: "object",
              ...name,
            },
            ...(definition.isDeferred !== undefined && {
              isDeferred: definition.isDeferred,
            }),
          })
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.tool.register: ${definition.name}'s inputSchema must be a JSON schema object`,
            ),
          );
    },
    list: () => host("tool.list", {}),
    call: async (name) => {
      if (!isPlainObject(name)) throw new HooksError(`${pluginName}: $.tool.call: input must be an object`);
      if (typeof name.tool !== "string" || name.tool.length === 0)
        throw new HooksError(`${pluginName}: $.tool.call takes the event's input: { tool, ...args }`);
      return host("tool.call", name);
    },
    check: (name) =>
      isPlainObject(name) &&
      typeof name.tool === "string" &&
      name.tool.length > 0 &&
      isPlainObject(name.input)
        ? host("tool.check", {
            tool: name.tool,
            input: name.input,
          })
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.tool.check takes { tool, input }: the tool's name and its arguments, an object`,
            ),
          ),
  });
//@ chunk-j8f885h1.js:273595-273807 placement
var TURN_OPS = (pluginName, host) =>
  freezeApiObject({
    abort: (args) => {
      let turnId = isPlainObject(args) ? args.turnId : undefined;
      return typeof turnId !== "string" || turnId === ""
        ? Promise.reject(
            new HooksError(`${pluginName}: $.turn.abort takes { turnId } (the id turn.start carried)`),
          )
        : host("turn.abort", {
            turnId,
          });
    },
  });
//@ chunk-j8f885h1.js:273807-273817 placement
/**
 * 12
 */
var MAX_ROW_CELLS = 12;
//@ chunk-j8f885h1.js:273817-273826 placement
/**
 * 4
 */
var MAX_UI_ROWS = 4;
//@ chunk-j8f885h1.js:273826-273835 placement
/**
 * 2
 */
var MAX_OPTIONS = 2;
//@ chunk-j8f885h1.js:273835-273855 placement
/**
 * ["Yes","No"]
 */
var DEFAULT_YES_NO = ["Yes", "No"];
//@ chunk-j8f885h1.js:273855-273866 placement
/**
 * 120
 */
var MAX_WAIT_SECONDS = 120;
//@ chunk-j8f885h1.js:273866-273891 placement (2.1.88 match: ASK_USER_QUESTION_TOOL_NAME, 1)
/**
 * AskUserQuestion 工具名常量（另一 chunk 中的同值副本）。
 */
var ASK_USER_QUESTION_TOOL_NAME = "AskUserQuestion";
//@ chunk-j8f885h1.js:273891-274239 placement
/**
 * 校验 $.ui.ask 的选项列表（最多 4 个），转成字符串数组并保留稀疏位。
 */
function normalizeAskOptions(pluginName, options) {
  let rawOptions = options ?? [];
  let count = Array.isArray(rawOptions) ? Number(rawOptions.length) : Number.NaN;
  let isValidCount = Number.isSafeInteger(count) && count >= 0;
  if (!Array.isArray(rawOptions) || !isValidCount)
    throw new HooksError(`${pluginName}: $.ui.ask takes its options as a list`);
  if (count > MAX_UI_ROWS)
    throw new HooksError(`${pluginName}: $.ui.ask takes at most ${MAX_UI_ROWS} options (got ${count})`);
  let secondOptions = [];
  secondOptions.length = count;
  for (let index = 0; index < count; index += 1)
    if (index in rawOptions) secondOptions[index] = String(rawOptions[index]);
  return secondOptions;
}
//@ chunk-j8f885h1.js:274239-274338 placement
/**
 * 不足则补 Yes/No
 */
function ensureQuestions(labels) {
  return labels.length >= MAX_OPTIONS
    ? labels
    : [
        ...labels,
        ...DEFAULT_YES_NO.filter((label) => !labels.includes(label)).slice(0, MAX_OPTIONS - labels.length),
      ];
}
//@ chunk-j8f885h1.js:274338-274411 placement
/**
 * 带 cells 字符串的表格
 */
function isCellsStringTable(value) {
  return isPlainObject(value) && typeof value.cells === "string" && value.source === undefined;
}
//@ chunk-j8f885h1.js:274411-274675 placement
function normalizeRenderRequest(request) {
  let extra = {
    ...(request?.columns !== undefined && {
      columns: request.columns,
    }),
    ...(request?.rows !== undefined && {
      rows: request.rows,
    }),
  };
  return isCellsStringTable(request)
    ? {
        requestId: request.requestId,
        key: request.key,
        cells: request.cells,
        ...extra,
      }
    : {
        requestId: request?.requestId,
        key: request?.key,
        source: request?.source,
        ...(isPlainObject(request) &&
          "cells" in request && {
            cells: request.cells,
          }),
        ...extra,
      };
}
//@ chunk-j8f885h1.js:274675-274744 placement
/**
 * ui.log/notice/invalidate/toast/status
 */
var UI_EVENT_NAMES = ["ui.log", "ui.notice", "ui.invalidate", "ui.toast", "ui.status"];
//@ chunk-j8f885h1.js:274744-274772 placement
/**
 * 是否 ui.* 事件
 */
var isUiEventName = (name) => UI_EVENT_NAMES.includes(name);
//@ chunk-j8f885h1.js:274772-274989 placement
function normalizeAgentIdArg(args) {
  let isAgentIdOnly =
    isPlainObject(args) &&
    Object.prototype.toString.call(args) === "[object Object]" &&
    Reflect.ownKeys(args).every((key) => key === "agentId");
  let isEmptyObject = isAgentIdOnly && !("agentId" in args);
  let agentId = isAgentIdOnly ? args.agentId : undefined;
  return isEmptyObject
    ? {}
    : {
        agentId: typeof agentId === "string" ? agentId : "",
      };
}
//@ chunk-j8f885h1.js:274989-277229 placement
function UI_LOG_OP(pluginName, host, resolvedTable) {
  let send = (op, payload) => {
    host(op, payload).catch((error) =>
      matcherLog().log(`[${pluginName}] $.${op} dropped: ${errorMessage(error)}`, "warn"),
    );
  };
  let log = (text, opts = {}) =>
    send("ui.log", {
      text: String(text),
      to: opts?.to ?? "transcript",
    });
  let toast = (text, opts = {}) => {
    send("ui.toast", {
      text: String(text),
      ...(typeof opts.timeoutMs === "number" && {
        timeoutMs: opts.timeoutMs,
      }),
    });
  };
  let status = (text) => {
    send("ui.status", {
      text: text === undefined || text === null ? undefined : String(text),
    });
  };
  function resolve(request) {
    let problem = checkRenderArgument(request);
    if (problem !== undefined) throw new HooksError(`${pluginName}: $.ui.resolve ${problem}`);
    return resolvedTable(request);
  }
  return freezeApiObject({
    notice: (toolUseId, text) =>
      send("ui.notice", {
        tool_use_id: toolUseId,
        text,
      }),
    invalidate: (event) =>
      send("ui.invalidate", {
        event,
      }),
    blit: (request) => host("ui.blit", normalizeRenderRequest(request)),
    resolve,
    log,
    status,
    ask: async (question, options) => {
      if (typeof question !== "string" || question.trim() === "")
        throw new HooksError(`${pluginName}: $.ui.ask takes the question first`);
      let askOptions = Array.isArray(options)
        ? {
            options,
          }
        : (options ?? {});
      let optionLabels = normalizeAskOptions(pluginName, askOptions.options);
      let questionText = normalizeFullWidthSpace(question);
      let questions = ensureQuestions(optionLabels.map(normalizeFullWidthSpace));
      let header = truncateToLength(askOptions.header ?? "Plugin", MAX_ROW_CELLS);
      let answer = await host("ui.ask", {
        tool: ASK_USER_QUESTION_TOOL_NAME,
        questions: [
          {
            question: questionText,
            header,
            options: questions.map((label) => ({
              label,
              description: "",
            })),
            multiSelect: askOptions.multiSelect === true,
          },
        ],
      });
      let picked = answer.result?.answers?.[questionText];
      let toOriginal = (normalized) =>
        optionLabels.find((option) => normalizeFullWidthSpace(option) === normalized) ?? normalized;
      if (typeof picked === "string") return toOriginal(picked);
      if (Array.isArray(picked)) return picked.map((part) => toOriginal(String(part))).join(", ");
      throw new HooksError(
        `${pluginName}: $.ui.ask: no answer (${truncateToLength(answer.deny ?? answer.text ?? "", MAX_WAIT_SECONDS) || "the dialog was dismissed"})`,
      );
    },
    toast,
    notify: (text, opts = {}) =>
      host("ui.notify", {
        text,
        ...(opts?.title !== undefined && {
          title: opts.title,
        }),
      }),
    open: (request) =>
      host("ui.open", {
        id: request?.id,
        ...(request?.title !== undefined && {
          title: String(request.title),
        }),
        ...(request?.focus !== undefined && {
          focus: request.focus,
        }),
        ...(request?.closeOnEscape !== undefined && {
          closeOnEscape: request.closeOnEscape,
        }),
        ...(request?.holdToasts !== undefined && {
          holdToasts: request.holdToasts,
        }),
        ...(request?.backgroundColor !== undefined && {
          backgroundColor: request.backgroundColor,
        }),
        ...(request?.rows !== undefined && {
          rows: request.rows,
        }),
        ...(request?.columns !== undefined && {
          columns: request.columns,
        }),
      }),
    close: (request) =>
      host("ui.close", {
        id: request?.id,
        origin: {
          kind: "plugin",
        },
      }),
    panes: () => host("ui.panes", {}),
    place: (request) =>
      host("ui.place", {
        id: request?.id,
      }),
    backdrop: (payload) =>
      host("ui.backdrop", {
        backdrop:
          typeof payload === "object" && payload !== null
            ? {
                id: payload.id,
                glass: payload.glass,
                colorScheme: payload.colorScheme,
              }
            : payload,
      }),
    selection: () => host("ui.selection", {}),
    scroll: (request) =>
      host("ui.scroll", {
        to: request?.to,
        ...(request?.in !== undefined && {
          in: request.in,
        }),
        ...(request?.block !== undefined && {
          block: request.block,
        }),
      }),
    focus: (request) =>
      host("ui.focus", {
        requestId: request?.requestId,
        key: request?.key,
      }),
    copy: (request) =>
      host("ui.copy", {
        text: request?.text,
        ...(request?.surface !== undefined && {
          surface: request.surface,
        }),
      }),
    view: (request) => host("ui.view", normalizeAgentIdArg(request)),
  });
}
//@ chunk-j8f885h1.js:277229-277854 placement
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
  let wrapNs = (methods) => wrapNamespaceMethods(methods, wrapMethod);
  return {
    ui: wrapNs(UI_LOG_OP(pluginName, host, resolvedTable)),
    model: wrapNs(MODEL_OPS(host)),
    audio: wrapNs(AUDIO_OPS(pluginName, host)),
    mcp: wrapNs(
      mcpApi(
        pluginName,
        (request) => host("mcp.call", request),
        (request) => host("mcp.connect", request),
      ),
    ),
    session: wrapNs(SESSION_OPS(pluginName, host)),
    prompt: wrapNs(PROMPT_SUBMIT_OP(pluginName, host)),
    turn: wrapNs(TURN_OPS(pluginName, host)),
    tool: wrapNs(TOOL_REGISTER_OP(pluginName, host)),
    command: wrapNs(COMMAND_OPS(pluginName, host)),
    config: wrapNs(CONFIG_OPS(pluginName, host)),
    telemetry: wrapNs(TELEMETRY_OPS(pluginName, host)),
    agent: wrapNs(AGENT_OPS(pluginName, host)),
    fs: wrapNs(FS_OPS(host)),
    store: wrapNs(STORE_OPS(pluginName, host)),
    state: wrapNs(STATE_OPS(pluginName, host)),
    clock: wrapNs(
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
    http: wrapNs(HTTP_FETCH_OP(pluginName, host)),
    process: wrapNs(PROCESS_OPS(host, hostStream)),
    settings: wrapNs(SETTINGS_OPS(pluginName, host)),
    env: wrapNs(ENV_OPS(host)),
    flag: wrapNs(flagValueApi(host)),
  };
}
//@ chunk-j8f885h1.js:277854-278117 placement
function buildCoreMethodTable() {
  let table = {};
  let ops = MCP_OPS({
    pluginName: "core",
    host: coreNotAnOperation,
    hostStream: coreNotAnOperation,
    resolvedTable: coreNotAnOperation,
    timers: new Set(),
    unloaded: coreNotAnOperation,
    invoke: coreNotAnOperation,
    wrapMethod: (method) => method,
    signalFrom: coreNotAnOperation,
    makeSignal: coreNotAnOperation,
  });
  for (let [key, value] of Object.entries(ops)) table[key] = Object.freeze(Object.keys(value));
  return Object.freeze(table);
}
//@ chunk-j8f885h1.js:278117-278129 placement
/**
 * 核心方法表
 */
var coreInterfaceTable; // deferred: uses buildCoreMethodTable of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:278117", () => {
  coreInterfaceTable = buildCoreMethodTable();
});
//@ chunk-j8f885h1.js:278129-278237 placement
/**
 * 把核心方法表转换为接口表（owner=core、方法名列表），只包含允许的命名空间。
 */
function coreInterfaceTable_2() {
  let table = {};
  for (let [key, value] of Object.entries(coreInterfaceTable))
    if (isOutsideAllowedScope(key))
      table[key] = {
        owner: CORE_ORIGIN,
        methods: [...value],
      };
  return table;
}
export { resolvedModelOf, isUiEventName, coreInterfaceTable_2, MCP_OPS };
