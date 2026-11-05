/**
 * plugins/functionHooks/api/sessionOps.ts
 *
 * 函数钩子 $ 接口：prompt.fill/submit、session.*、state、telemetry（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (27)
 * attribution: sole-consumer 1, placement 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { pickAlias } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { everyIndex } from "../sites/promptContextSites.js";
import { HooksError } from "../hooksErrors.js";
import { checkDecorations, checkCursorInteger } from "../sites/promptSites.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "../hookApiSurface.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { freezeApiObject } from "../dispatch/chain.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-j8f885h1.js:263520-263630 sole-consumer (2.1.88 match: isToolResultBlockWithContent, 1)
function toSlimTranscriptMessage(obj) {
  let { message, agentId } = obj;
  return {
    message: pickAlias(message, ["type", "content"]),
    ...(agentId !== undefined && {
      agentId,
    }),
  };
}
//@ chunk-j8f885h1.js:263630-263764 placement
var SESSION_APPEND_USAGE =
  'takes { message: { type: "user" | "system", content } } (content an array of text blocks) and an optional agentId (a string)';
//@ chunk-j8f885h1.js:263764-263992 placement
/**
 * 校验 $.session.append 参数：message.type 为 user/system 且 content 为对象数组，agentId 可选非空；不合法返回用法说明。
 */
function checkSessionAppendArgs(args) {
  let message = isPlainObject(args) ? args.message : undefined;
  let hasValidMessage =
    isPlainObject(message) &&
    (message.type === "user" || message.type === "system") &&
    Array.isArray(message.content) &&
    everyIndex(message.content, isPlainObject);
  let hasValidAgentId =
    isPlainObject(args) &&
    (args.agentId === undefined || (typeof args.agentId === "string" && args.agentId !== ""));
  return hasValidMessage && hasValidAgentId ? undefined : SESSION_APPEND_USAGE;
}
//@ chunk-j8f885h1.js:263992-264108 placement
var withArgCheck = (spec) => (args) => {
  let problem = spec.problemOf(args);
  return problem !== undefined || !isPlainObject(args)
    ? Promise.reject(new HooksError(`${spec.name} ${problem}`))
    : spec.host(args);
};
//@ chunk-j8f885h1.js:264108-264136 placement
/**
 * 装饰段合法（光标整数）
 */
var hasValidDecorations = (decorations) => checkDecorations(decorations) === undefined;
//@ chunk-j8f885h1.js:264136-264291 placement
function requireTextArg(args, pluginName, method) {
  let text = isPlainObject(args) ? args.text : undefined;
  return typeof text === "string"
    ? Promise.resolve(text)
    : Promise.reject(new HooksError(`${pluginName}: $.${method} takes { text } (a string)`));
}
//@ chunk-j8f885h1.js:264291-264699 placement
var PROMPT_FILL_OP = (args, pluginName) =>
  requireTextArg(args, pluginName, "prompt.fill").then((text) => {
    let mode = isPlainObject(args) ? args.mode : undefined;
    let decorations = isPlainObject(args) ? args.decorations : undefined;
    let cursor = isPlainObject(args) ? args.cursor : undefined;
    let invalidMode = mode !== undefined && !isPromptSectionMode(mode);
    return !invalidMode && hasValidDecorations(decorations) && checkCursorInteger(cursor) === undefined
      ? {
          text,
          ...(mode !== undefined && {
            mode,
          }),
          ...(decorations !== undefined && {
            decorations,
          }),
          ...(typeof cursor === "number" && {
            cursor,
          }),
        }
      : Promise.reject(
          new HooksError(
            `${pluginName}: $.prompt.fill ` +
              (invalidMode
                ? `takes { mode } of ${PROMPT_SECTION_MODES.join(", ")}`
                : (checkDecorations(decorations) ?? checkCursorInteger(cursor) ?? "takes { decorations }")),
          ),
        );
  });
//@ chunk-j8f885h1.js:264699-264824 placement
function pickTranscriptReadOptions(args) {
  let options = isPlainObject(args) ? args : {};
  let { agentId } = options;
  let hasAgentId = typeof agentId === "string";
  let wantsApi = options.as === "api";
  return {
    ...(hasAgentId && {
      agentId,
    }),
    ...(wantsApi && {
      as: "api",
    }),
  };
}
//@ chunk-j8f885h1.js:264824-265262 placement
/**
 * 校验读取会话记录的参数：只允许 agentId 与 as 两个键（或不传）。
 */
function checkTranscriptReadArgs(args) {
  if (args === undefined) return;
  if (!isPlainObject(args)) return "takes { agentId, as } or nothing";
  let filtered = Object.keys(args).filter((key) => key !== "agentId" && key !== "as");
  if (filtered.length > 0) return `takes { agentId, as } or nothing (not ${filtered.join(", ")})`;
  let { agentId } = args;
  let as = args.as;
  let validAgentId = agentId === undefined || (typeof agentId === "string" && agentId !== "");
  let validAs = as === undefined || as === "api";
  if (!validAgentId) return `takes agentId, a non-empty string (got ${String(agentId)})`;
  return validAs ? undefined : `takes as "api" or none (got ${String(as)})`;
}
//@ chunk-j8f885h1.js:265262-265487 placement
/**
 * 校验 $.prompt.paint 的 decorations：必须为数组，且有 text（或无文本时为空数组）后再检查各 run。
 */
function checkDecorationsArgs(text, decorations) {
  if (!Array.isArray(decorations)) return "takes { decorations } (an array of { start, end } runs)";
  return typeof text === "string" || (text === undefined && checkedListLength(decorations) === 0)
    ? checkDecorations(decorations)
    : "takes { text } (a string, the draft the runs were computed for)";
}
//@ chunk-j8f885h1.js:265487-265710 placement
async function normalizePaintArgs(args, pluginName) {
  let text = isPlainObject(args) ? args.text : undefined;
  let decorations = isPlainObject(args) ? args.decorations : undefined;
  if (!(
    decorations !== undefined &&
    checkDecorationsArgs(text, decorations) === undefined &&
    hasValidDecorations(decorations)
  ))
    throw new HooksError(`${pluginName}: $.prompt.paint ${checkDecorationsArgs(text, decorations)}`);
  return {
    ...(typeof text === "string" && {
      text,
    }),
    decorations,
  };
}
//@ chunk-j8f885h1.js:265710-266490 placement
var PROMPT_SUBMIT_OP = (pluginName, host) =>
  freezeApiObject({
    submit: (args) =>
      requireTextArg(args, pluginName, "prompt.submit").then((text) => {
        let isBlank = text.trim() === "";
        let asUser = isPlainObject(args) ? args.asUser : undefined;
        return isBlank
          ? Promise.reject(
              new HooksError(`${pluginName}: $.prompt.submit takes { text } (a non-empty prompt)`),
            )
          : asUser !== undefined && typeof asUser !== "boolean"
            ? Promise.reject(new HooksError(`${pluginName}: $.prompt.submit takes { asUser } as a boolean`))
            : host(
                "prompt.submit",
                asUser === true
                  ? {
                      text,
                      asUser: true,
                    }
                  : {
                      text,
                    },
              );
      }),
    read: () => host("prompt.read", {}),
    media: (args) => host("prompt.media", args),
    fill: (args) => PROMPT_FILL_OP(args, pluginName).then((fillArgs) => host("prompt.fill", fillArgs)),
    paint: (args) =>
      normalizePaintArgs(args, pluginName).then((paintArgs) => host("prompt.paint", paintArgs)),
    suggest: (args) =>
      requireTextArg(args, pluginName, "prompt.suggest").then((text) =>
        host("prompt.suggest", {
          text,
        }),
      ),
    compose: (args) =>
      args === undefined || isPlainObject(args)
        ? host("prompt.compose", {
            ...args,
          })
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.prompt.compose takes the facts to compose for ({ tools, traits, ... }), or nothing`,
            ),
          ),
  });
//@ chunk-j8f885h1.js:266490-266645 placement
function normalizeSendArgs(args) {
  let { to, text } = args;
  if (typeof to === "string")
    return {
      to,
      text,
    };
  return {
    to:
      "sessionId" in to
        ? {
            sessionId: to.sessionId,
          }
        : {
            agentId: to.agentId,
          },
    text,
  };
}
//@ chunk-j8f885h1.js:266645-266761 placement
function pickSendTargetId(args) {
  return isPlainObject(args) && Object.hasOwn(args, "sessionId") !== Object.hasOwn(args, "agentId")
    ? (args.sessionId ?? args.agentId)
    : undefined;
}
//@ chunk-j8f885h1.js:266761-266903 placement
var SESSION_SEND_USAGE =
  "takes { to, text }: to a name, an agent id or an address (a non-empty string), { sessionId } or { agentId }; text a non-empty string";
//@ chunk-j8f885h1.js:266903-267083 placement
/**
 * 校验 $.session.send 参数：to 为非空字符串或 {sessionId}/{agentId} 之一，text 非空。
 */
function checkSessionSendArgs(args) {
  if (!isPlainObject(args)) return SESSION_SEND_USAGE;
  let { to, text } = args;
  let hasText = typeof text === "string" && text.trim() !== "";
  let target = typeof to === "string" ? to : pickSendTargetId(to);
  let hasTarget = typeof target === "string" && target.trim() !== "";
  return hasText && hasTarget ? undefined : SESSION_SEND_USAGE;
}
//@ chunk-j8f885h1.js:267083-267191 placement
function pickUsageOptions(args) {
  let { breakdown, columns } = args;
  return {
    ...(breakdown !== undefined && {
      breakdown,
    }),
    ...(columns !== undefined && {
      columns,
    }),
  };
}
//@ chunk-j8f885h1.js:267191-267416 placement
function checkUsageArgs(args) {
  if (args === undefined) return;
  let extraKeys = isPlainObject(args)
    ? Object.keys(args).filter((key) => key !== "breakdown" && key !== "columns")
    : [];
  return isPlainObject(args) && extraKeys.length === 0
    ? undefined
    : "takes { breakdown, columns } or nothing" +
        (extraKeys.length > 0 ? ` (not ${extraKeys.join(", ")})` : "");
}
//@ chunk-j8f885h1.js:267416-268505 placement
var SESSION_OPS = (pluginName, host) =>
  freezeApiObject({
    messages: (args) => {
      let problem = checkTranscriptReadArgs(args);
      return problem !== undefined
        ? Promise.reject(new HooksError(`${pluginName}: $.session.messages ${problem}`))
        : host("session.messages", pickTranscriptReadOptions(args));
    },
    cwd: () => host("session.cwd", {}),
    root: () => host("session.root", {}),
    model: () => host("session.model", {}),
    turns: () => host("session.turns", {}),
    id: () => host("session.id", {}),
    repo: () => host("session.repo", {}),
    surface: () => host("session.surface", {}),
    surfaces: () => host("session.surfaces", {}),
    authorize: () => host("session.authorize", {}),
    identity: () => host("session.identity", {}),
    usage: (args) => {
      let problem = checkUsageArgs(args);
      return problem !== undefined
        ? Promise.reject(new HooksError(`${pluginName}: $.session.usage ${problem}`))
        : host("session.usage", isPlainObject(args) ? pickUsageOptions(args) : {});
    },
    version: () => host("session.version", {}),
    send: withArgCheck({
      name: `${pluginName}: $.session.send`,
      problemOf: checkSessionSendArgs,
      host: (args) => host("session.send", normalizeSendArgs(args)),
    }),
    append: withArgCheck({
      name: `${pluginName}: $.session.append`,
      problemOf: checkSessionAppendArgs,
      host: (args) => host("session.append", toSlimTranscriptMessage(args)),
    }),
    compact: (args) => {
      let instructions = isPlainObject(args) ? args.instructions : undefined;
      return args !== undefined &&
        (!isPlainObject(args) || (instructions !== undefined && typeof instructions !== "string"))
        ? Promise.reject(
            new HooksError(`${pluginName}: $.session.compact takes { instructions } (a string) or nothing`),
          )
        : host(
            "session.compact",
            typeof instructions === "string"
              ? {
                  instructions,
                }
              : {},
          );
    },
  });
//@ chunk-j8f885h1.js:268505-268870 placement
/**
 * $.settings 命名空间：read（可按 source 或 key 读取设置）。
 */
var SETTINGS_OPS = (pluginName, host) =>
  freezeApiObject({
    read: (args) => {
      let { source, key } = isPlainObject(args)
        ? {
            source: args.source,
            key: args.key,
          }
        : {
            source: undefined,
            key: undefined,
          };
      return (args !== undefined && !isPlainObject(args)) || (key !== undefined && typeof key !== "string")
        ? Promise.reject(
            new HooksError(`${pluginName}: $.settings.read takes { source }, { key } or nothing`),
          )
        : host(
            "settings.read",
            source === undefined
              ? {}
              : {
                  source,
                },
          ).then((problem) =>
            key === undefined ? problem : Object.entries(problem).find(([key_2]) => key_2 === key)?.[1],
          );
    },
  });
//@ chunk-j8f885h1.js:268870-268886 placement
/**
 * 接口调用返回值的字符上限 4194304，超出的值按错误拒绝。
 */
var MAX_CALL_VALUE_CHARS = 4194304;
//@ chunk-j8f885h1.js:268886-269265 placement
/**
 * 把值序列化为 JSON 再解析回来，确保是 JSON 数据且不超过 4M 字符，否则抛 HooksError。
 */
function toStoredJson(value, pluginName, method = "store.set") {
  let json;
  try {
    json = JSON.stringify(value);
  } catch (error) {
    throw new HooksError(`${pluginName}: $.${method}: value is not JSON data (${errorMessage(error)})`);
  }
  if (typeof json !== "string")
    throw new HooksError(
      `${pluginName}: $.${method}: value is not JSON data (${value === undefined ? "undefined" : `a ${typeof value}`})`,
    );
  if (json.length > MAX_CALL_VALUE_CHARS)
    throw new HooksError(
      `${pluginName}: $.${method}: the value is ${json.length} characters, over the ${MAX_CALL_VALUE_CHARS} limit`,
    );
  return JSON.parse(json);
}
//@ chunk-j8f885h1.js:269265-269622 placement
/**
 * $.store 命名空间：get/set/delete/keys，键为非空字符串，值须为 JSON 数据。
 */
function STORE_OPS(pluginName, host) {
  function key(value, method) {
    if (typeof value !== "string" || value === "")
      throw new HooksError(`${pluginName}: $.store.${method} takes a non-empty string key`);
    return value;
  }
  return freezeApiObject({
    get: async (secondKey) =>
      host("store.get", {
        key: key(secondKey, "get"),
      }),
    set: async (thirdKey, value) => {
      await host("store.set", {
        value: toStoredJson(value, pluginName),
        key: key(thirdKey, "set"),
      });
    },
    delete: async (fourthKey) => {
      await host("store.delete", {
        key: key(fourthKey, "delete"),
      });
    },
    keys: () => host("store.keys", {}),
  });
}
//@ chunk-j8f885h1.js:269622-270138 placement
function STATE_OPS(pluginName, host) {
  function ref(args, method) {
    let plugin = isPlainObject(args) ? args.plugin : undefined;
    let key = isPlainObject(args) ? args.key : undefined;
    let id = isPlainObject(args) ? args.id : undefined;
    if (!(
      typeof plugin === "string" &&
      typeof key === "string" &&
      (id === undefined || typeof id === "string")
    ))
      throw new HooksError(
        `${pluginName}: $.state.${method} takes a reference { plugin, key } (and id for a family's member)`,
      );
    return id === undefined
      ? {
          plugin,
          key,
        }
      : {
          plugin,
          key,
          id,
        };
  }
  return freezeApiObject({
    get: async (args) => host("state.get", ref(args, "get")),
    set: async (args, value, options) =>
      host("state.set", {
        ...ref(args, "set"),
        value: toStoredJson(value, pluginName, "state.set"),
        ...(options?.ifVersion !== undefined && {
          ifVersion: options.ifVersion,
        }),
      }),
  });
}
//@ chunk-j8f885h1.js:270138-270221 placement
/**
 * 只取存在的字段
 */
function pickFields(source, keys) {
  let picked = {};
  for (let key of keys) {
    let value = source[key];
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}
//@ chunk-j8f885h1.js:270221-270622 placement
var TELEMETRY_OPS = (pluginName, host) =>
  freezeApiObject({
    log: (args) =>
      isPlainObject(args)
        ? host("telemetry.log", pickFields(args, ["to", "event", "props", "attributes", "loggedAt", "span"]))
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.telemetry.log takes an entry ({ to?, event, props? } or a collector record)`,
            ),
          ),
    mark: (args) =>
      isPlainObject(args)
        ? host("telemetry.mark", pickFields(args, ["feature", "kind", "reason", "props"]))
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.telemetry.mark takes an entry ({ feature, kind, reason?, props? })`,
            ),
          ),
  });
//@ chunk-j8f885h1.js:270622-270701 placement
/**
 * 取参数里的 agentId
 */
function agentIdFromArg(result) {
  let agentId = isPlainObject(result) ? result.agentId : undefined;
  return typeof agentId === "string" ? agentId : undefined;
}
export {
  checkSessionSendArgs,
  checkSessionAppendArgs,
  checkDecorationsArgs,
  MAX_CALL_VALUE_CHARS,
  agentIdFromArg,
  SESSION_OPS,
  PROMPT_SUBMIT_OP,
  TELEMETRY_OPS,
  STORE_OPS,
  STATE_OPS,
  SETTINGS_OPS,
};
