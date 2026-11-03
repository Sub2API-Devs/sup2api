/**
 * plugins/functionHooks/api/sessionOps.ts
 *
 * 函数钩子 $ 接口：prompt.fill/submit、session.*、state、telemetry（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (26)
 * attribution: placement 26
 */
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { everyIndex } from "../sites/promptContextSites.js";
import { HooksError } from "../hooksErrors.js";
import { checkDecorations, checkCursorInteger } from "../sites/promptSites.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "../hookApiSurface.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { freezeApiObject } from "../dispatch/chain.js";
import { toSlimTranscriptMessage } from "../../../utils/toolSearch.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-4121qate.js:282438-282572 placement
var SESSION_APPEND_USAGE =
  'takes { message: { type: "user" | "system", content } } (content an array of text blocks) and an optional agentId (a string)';
//@ chunk-4121qate.js:282572-282800 placement
/**
 * 校验 $.session.append 参数：message.type 为 user/system 且 content 为对象数组，agentId 可选非空；不合法返回用法说明。
 */
function checkSessionAppendArgs(e) {
  let message = isPlainObject(e) ? e.message : undefined;
  let r =
    isPlainObject(message) &&
    (message.type === "user" || message.type === "system") &&
    Array.isArray(message.content) &&
    everyIndex(message.content, isPlainObject);
  let n =
    isPlainObject(e) && (e.agentId === undefined || (typeof e.agentId === "string" && e.agentId !== ""));
  return r && n ? undefined : SESSION_APPEND_USAGE;
}
//@ chunk-4121qate.js:282800-282916 placement
var withArgCheck = (e) => (o) => {
  let r = e.problemOf(o);
  return r !== undefined || !isPlainObject(o) ? Promise.reject(new HooksError(`${e.name} ${r}`)) : e.host(o);
};
//@ chunk-4121qate.js:282916-282944 placement
/**
 * 装饰段合法（光标整数）
 */
var hasValidDecorations = (decorations) => checkDecorations(decorations) === undefined;
//@ chunk-4121qate.js:282944-283099 placement
function requireTextArg(e, o, r) {
  let text = isPlainObject(e) ? e.text : undefined;
  return typeof text === "string"
    ? Promise.resolve(text)
    : Promise.reject(new HooksError(`${o}: $.${r} takes { text } (a string)`));
}
//@ chunk-4121qate.js:283099-283507 placement
var PROMPT_FILL_OP = (e, o) =>
  requireTextArg(e, o, "prompt.fill").then((text) => {
    let mode = isPlainObject(e) ? e.mode : undefined;
    let decorations = isPlainObject(e) ? e.decorations : undefined;
    let cursor = isPlainObject(e) ? e.cursor : undefined;
    let p = mode !== undefined && !isPromptSectionMode(mode);
    return !p && hasValidDecorations(decorations) && checkCursorInteger(cursor) === undefined
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
            `${o}: $.prompt.fill ` +
              (p
                ? `takes { mode } of ${PROMPT_SECTION_MODES.join(", ")}`
                : (checkDecorations(decorations) ?? checkCursorInteger(cursor) ?? "takes { decorations }")),
          ),
        );
  });
//@ chunk-4121qate.js:283507-283632 placement
function pickTranscriptReadOptions(e) {
  let o = isPlainObject(e) ? e : {};
  let { agentId } = o;
  let n = typeof agentId === "string";
  let s = o.as === "api";
  return {
    ...(n && {
      agentId,
    }),
    ...(s && {
      as: "api",
    }),
  };
}
//@ chunk-4121qate.js:283632-284070 placement
/**
 * 校验读取会话记录的参数：只允许 agentId 与 as 两个键（或不传）。
 */
function checkTranscriptReadArgs(e) {
  if (e === undefined) return;
  if (!isPlainObject(e)) return "takes { agentId, as } or nothing";
  let filtered = Object.keys(e).filter((key) => key !== "agentId" && key !== "as");
  if (filtered.length > 0) return `takes { agentId, as } or nothing (not ${filtered.join(", ")})`;
  let { agentId } = e;
  let as = e.as;
  let s = agentId === undefined || (typeof agentId === "string" && agentId !== "");
  let i = as === undefined || as === "api";
  if (!s) return `takes agentId, a non-empty string (got ${String(agentId)})`;
  return i ? undefined : `takes as "api" or none (got ${String(as)})`;
}
//@ chunk-4121qate.js:284070-284295 placement
/**
 * 校验 $.prompt.paint 的 decorations：必须为数组，且有 text（或无文本时为空数组）后再检查各 run。
 */
function checkDecorationsArgs(text, decorations) {
  if (!Array.isArray(decorations)) return "takes { decorations } (an array of { start, end } runs)";
  return typeof text === "string" || (text === undefined && checkedListLength(decorations) === 0)
    ? checkDecorations(decorations)
    : "takes { text } (a string, the draft the runs were computed for)";
}
//@ chunk-4121qate.js:284295-284518 placement
async function normalizePaintArgs(e, o) {
  let text = isPlainObject(e) ? e.text : undefined;
  let decorations = isPlainObject(e) ? e.decorations : undefined;
  if (!(
    decorations !== undefined &&
    checkDecorationsArgs(text, decorations) === undefined &&
    hasValidDecorations(decorations)
  ))
    throw new HooksError(`${o}: $.prompt.paint ${checkDecorationsArgs(text, decorations)}`);
  return {
    ...(typeof text === "string" && {
      text,
    }),
    decorations,
  };
}
//@ chunk-4121qate.js:284518-285298 placement
var PROMPT_SUBMIT_OP = (pluginName, host) =>
  freezeApiObject({
    submit: (r) =>
      requireTextArg(r, pluginName, "prompt.submit").then((n) => {
        let s = n.trim() === "";
        let asUser = isPlainObject(r) ? r.asUser : undefined;
        return s
          ? Promise.reject(
              new HooksError(`${pluginName}: $.prompt.submit takes { text } (a non-empty prompt)`),
            )
          : asUser !== undefined && typeof asUser !== "boolean"
            ? Promise.reject(new HooksError(`${pluginName}: $.prompt.submit takes { asUser } as a boolean`))
            : host(
                "prompt.submit",
                asUser === true
                  ? {
                      text: n,
                      asUser: true,
                    }
                  : {
                      text: n,
                    },
              );
      }),
    read: () => host("prompt.read", {}),
    media: (r) => host("prompt.media", r),
    fill: (r) => PROMPT_FILL_OP(r, pluginName).then((n) => host("prompt.fill", n)),
    paint: (r) => normalizePaintArgs(r, pluginName).then((n) => host("prompt.paint", n)),
    suggest: (r) =>
      requireTextArg(r, pluginName, "prompt.suggest").then((text) =>
        host("prompt.suggest", {
          text,
        }),
      ),
    compose: (r) =>
      r === undefined || isPlainObject(r)
        ? host("prompt.compose", {
            ...r,
          })
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.prompt.compose takes the facts to compose for ({ tools, traits, ... }), or nothing`,
            ),
          ),
  });
//@ chunk-4121qate.js:285298-285453 placement
function normalizeSendArgs(e) {
  let { to, text } = e;
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
//@ chunk-4121qate.js:285453-285569 placement
function pickSendTargetId(e) {
  return isPlainObject(e) && Object.hasOwn(e, "sessionId") !== Object.hasOwn(e, "agentId")
    ? (e.sessionId ?? e.agentId)
    : undefined;
}
//@ chunk-4121qate.js:285569-285711 placement
var SESSION_SEND_USAGE =
  "takes { to, text }: to a name, an agent id or an address (a non-empty string), { sessionId } or { agentId }; text a non-empty string";
//@ chunk-4121qate.js:285711-285891 placement
/**
 * 校验 $.session.send 参数：to 为非空字符串或 {sessionId}/{agentId} 之一，text 非空。
 */
function checkSessionSendArgs(e) {
  if (!isPlainObject(e)) return SESSION_SEND_USAGE;
  let { to, text } = e;
  let n = typeof text === "string" && text.trim() !== "";
  let s = typeof to === "string" ? to : pickSendTargetId(to);
  let i = typeof s === "string" && s.trim() !== "";
  return n && i ? undefined : SESSION_SEND_USAGE;
}
//@ chunk-4121qate.js:285891-285999 placement
function pickUsageOptions(e) {
  let { breakdown, columns } = e;
  return {
    ...(breakdown !== undefined && {
      breakdown,
    }),
    ...(columns !== undefined && {
      columns,
    }),
  };
}
//@ chunk-4121qate.js:285999-286224 placement
function checkUsageArgs(e) {
  if (e === undefined) return;
  let o = isPlainObject(e) ? Object.keys(e).filter((key) => key !== "breakdown" && key !== "columns") : [];
  return isPlainObject(e) && o.length === 0
    ? undefined
    : "takes { breakdown, columns } or nothing" + (o.length > 0 ? ` (not ${o.join(", ")})` : "");
}
//@ chunk-4121qate.js:286224-287313 placement
var SESSION_OPS = (pluginName, host) =>
  freezeApiObject({
    messages: (r) => {
      let n = checkTranscriptReadArgs(r);
      return n !== undefined
        ? Promise.reject(new HooksError(`${pluginName}: $.session.messages ${n}`))
        : host("session.messages", pickTranscriptReadOptions(r));
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
    usage: (r) => {
      let n = checkUsageArgs(r);
      return n !== undefined
        ? Promise.reject(new HooksError(`${pluginName}: $.session.usage ${n}`))
        : host("session.usage", isPlainObject(r) ? pickUsageOptions(r) : {});
    },
    version: () => host("session.version", {}),
    send: withArgCheck({
      name: `${pluginName}: $.session.send`,
      problemOf: checkSessionSendArgs,
      host: (r) => host("session.send", normalizeSendArgs(r)),
    }),
    append: withArgCheck({
      name: `${pluginName}: $.session.append`,
      problemOf: checkSessionAppendArgs,
      host: (r) => host("session.append", toSlimTranscriptMessage(r)),
    }),
    compact: (r) => {
      let instructions = isPlainObject(r) ? r.instructions : undefined;
      return r !== undefined &&
        (!isPlainObject(r) || (instructions !== undefined && typeof instructions !== "string"))
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
//@ chunk-4121qate.js:287313-287678 placement
/**
 * $.settings 命名空间：read（可按 source 或 key 读取设置）。
 */
var SETTINGS_OPS = (pluginName, host) =>
  freezeApiObject({
    read: (r) => {
      let { source, key } = isPlainObject(r)
        ? {
            source: r.source,
            key: r.key,
          }
        : {
            source: undefined,
            key: undefined,
          };
      return (r !== undefined && !isPlainObject(r)) || (key !== undefined && typeof key !== "string")
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
          ).then((p) => (key === undefined ? p : Object.entries(p).find(([key_2]) => key_2 === key)?.[1]));
    },
  });
//@ chunk-4121qate.js:287678-287694 placement
/**
 * 接口调用返回值的字符上限 4194304，超出的值按错误拒绝。
 */
var MAX_CALL_VALUE_CHARS = 4194304;
//@ chunk-4121qate.js:287694-288073 placement
/**
 * 把值序列化为 JSON 再解析回来，确保是 JSON 数据且不超过 4M 字符，否则抛 HooksError。
 */
function toStoredJson(e, o, r = "store.set") {
  let n;
  try {
    n = JSON.stringify(e);
  } catch (error) {
    throw new HooksError(`${o}: $.${r}: value is not JSON data (${errorMessage(error)})`);
  }
  if (typeof n !== "string")
    throw new HooksError(
      `${o}: $.${r}: value is not JSON data (${e === undefined ? "undefined" : `a ${typeof e}`})`,
    );
  if (n.length > MAX_CALL_VALUE_CHARS)
    throw new HooksError(
      `${o}: $.${r}: the value is ${n.length} characters, over the ${MAX_CALL_VALUE_CHARS} limit`,
    );
  return JSON.parse(n);
}
//@ chunk-4121qate.js:288073-288430 placement
/**
 * $.store 命名空间：get/set/delete/keys，键为非空字符串，值须为 JSON 数据。
 */
function STORE_OPS(pluginName, host) {
  function r(n, s) {
    if (typeof n !== "string" || n === "")
      throw new HooksError(`${pluginName}: $.store.${s} takes a non-empty string key`);
    return n;
  }
  return freezeApiObject({
    get: async (n) =>
      host("store.get", {
        key: r(n, "get"),
      }),
    set: async (n, s) => {
      await host("store.set", {
        value: toStoredJson(s, pluginName),
        key: r(n, "set"),
      });
    },
    delete: async (n) => {
      await host("store.delete", {
        key: r(n, "delete"),
      });
    },
    keys: () => host("store.keys", {}),
  });
}
//@ chunk-4121qate.js:288430-288946 placement
function STATE_OPS(pluginName, host) {
  function r(n, s) {
    let plugin = isPlainObject(n) ? n.plugin : undefined;
    let key = isPlainObject(n) ? n.key : undefined;
    let id = isPlainObject(n) ? n.id : undefined;
    if (!(
      typeof plugin === "string" &&
      typeof key === "string" &&
      (id === undefined || typeof id === "string")
    ))
      throw new HooksError(
        `${pluginName}: $.state.${s} takes a reference { plugin, key } (and id for a family's member)`,
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
    get: async (n) => host("state.get", r(n, "get")),
    set: async (n, s, i) =>
      host("state.set", {
        ...r(n, "set"),
        value: toStoredJson(s, pluginName, "state.set"),
        ...(i?.ifVersion !== undefined && {
          ifVersion: i.ifVersion,
        }),
      }),
  });
}
//@ chunk-4121qate.js:288946-289029 placement
/**
 * 只取存在的字段
 */
function pickFields(e, o) {
  let r = {};
  for (let n of o) {
    let s = e[n];
    if (s !== undefined) r[n] = s;
  }
  return r;
}
//@ chunk-4121qate.js:289029-289430 placement
var TELEMETRY_OPS = (pluginName, host) =>
  freezeApiObject({
    log: (r) =>
      isPlainObject(r)
        ? host("telemetry.log", pickFields(r, ["to", "event", "props", "attributes", "loggedAt", "span"]))
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.telemetry.log takes an entry ({ to?, event, props? } or a collector record)`,
            ),
          ),
    mark: (r) =>
      isPlainObject(r)
        ? host("telemetry.mark", pickFields(r, ["feature", "kind", "reason", "props"]))
        : Promise.reject(
            new HooksError(
              `${pluginName}: $.telemetry.mark takes an entry ({ feature, kind, reason?, props? })`,
            ),
          ),
  });
//@ chunk-4121qate.js:289430-289509 placement
/**
 * 取参数里的 agentId
 */
function agentIdFromArg(result) {
  let agentId = isPlainObject(result) ? result.agentId : undefined;
  return typeof agentId === "string" ? agentId : undefined;
}
export {
  agentIdFromArg,
  SESSION_OPS,
  PROMPT_SUBMIT_OP,
  TELEMETRY_OPS,
  STORE_OPS,
  STATE_OPS,
  SETTINGS_OPS,
  checkSessionSendArgs,
  checkSessionAppendArgs,
  checkDecorationsArgs,
  MAX_CALL_VALUE_CHARS,
};
