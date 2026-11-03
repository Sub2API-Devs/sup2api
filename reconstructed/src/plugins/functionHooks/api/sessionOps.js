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
import { ct } from "../sites/promptContextSites.js";
import { HooksError } from "../hooksErrors.js";
import { checkDecorations, MAn } from "../sites/promptSites.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "../hookApiSurface.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { freezeApiObject } from "../dispatch/chain.js";
import { toSlimTranscriptMessage } from "../../../utils/toolSearch.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-4121qate.js:282438-282572 placement
var SESSION_APPEND_USAGE =
  'takes { message: { type: "user" | "system", content } } (content an array of text blocks) and an optional agentId (a string)';
/**
 * 校验 $.session.append 参数：message.type 为 user/system 且 content 为对象数组，agentId 可选非空；不合法返回用法说明。
 */
//@ chunk-4121qate.js:282572-282800 placement
function checkSessionAppendArgs(e) {
  let o = isPlainObject(e) ? e.message : void 0,
    r =
      isPlainObject(o) &&
      (o.type === "user" || o.type === "system") &&
      Array.isArray(o.content) &&
      ct(o.content, isPlainObject),
    n = isPlainObject(e) && (e.agentId === void 0 || (typeof e.agentId === "string" && e.agentId !== ""));
  return r && n ? void 0 : SESSION_APPEND_USAGE;
}
//@ chunk-4121qate.js:282800-282916 placement
var withArgCheck = (e) => (o) => {
  let problemOf = e.problemOf(o);
  return problemOf !== void 0 || !isPlainObject(o)
    ? Promise.reject(new HooksError(`${e.name} ${problemOf}`))
    : e.host(o);
};
//@ chunk-4121qate.js:282916-282944 placement
var _n = (e) => checkDecorations(e) === void 0;
//@ chunk-4121qate.js:282944-283099 placement
function requireTextArg(e, o, r) {
  let n = isPlainObject(e) ? e.text : void 0;
  return typeof n === "string"
    ? Promise.resolve(n)
    : Promise.reject(new HooksError(`${o}: $.${r} takes { text } (a string)`));
}
//@ chunk-4121qate.js:283099-283507 placement
var PROMPT_FILL_OP = (e, o) =>
  requireTextArg(e, o, "prompt.fill").then((r) => {
    let n = isPlainObject(e) ? e.mode : void 0,
      s = isPlainObject(e) ? e.decorations : void 0,
      i = isPlainObject(e) ? e.cursor : void 0,
      p = n !== void 0 && !isPromptSectionMode(n);
    return !p && _n(s) && MAn(i) === void 0
      ? {
          text: r,
          ...(n !== void 0 && { mode: n }),
          ...(s !== void 0 && { decorations: s }),
          ...(typeof i === "number" && { cursor: i }),
        }
      : Promise.reject(
          new HooksError(
            `${o}: $.prompt.fill ` +
              (p
                ? `takes { mode } of ${PROMPT_SECTION_MODES.join(", ")}`
                : (checkDecorations(s) ?? MAn(i) ?? "takes { decorations }")),
          ),
        );
  });
//@ chunk-4121qate.js:283507-283632 placement
function pickTranscriptReadOptions(e) {
  let o = isPlainObject(e) ? e : {},
    { agentId: agentId } = o,
    n = typeof agentId === "string",
    s = o.as === "api";
  return { ...(n && { agentId: agentId }), ...(s && { as: "api" }) };
}
/**
 * 校验读取会话记录的参数：只允许 agentId 与 as 两个键（或不传）。
 */
//@ chunk-4121qate.js:283632-284070 placement
function checkTranscriptReadArgs(e) {
  if (e === void 0) return;
  if (!isPlainObject(e)) return "takes { agentId, as } or nothing";
  let filtered = Object.keys(e).filter((p) => p !== "agentId" && p !== "as");
  if (filtered.length > 0) return `takes { agentId, as } or nothing (not ${filtered.join(", ")})`;
  let { agentId: agentId } = e,
    as = e.as,
    s = agentId === void 0 || (typeof agentId === "string" && agentId !== ""),
    i = as === void 0 || as === "api";
  if (!s) return `takes agentId, a non-empty string (got ${String(agentId)})`;
  return i ? void 0 : `takes as "api" or none (got ${String(as)})`;
}
/**
 * 校验 $.prompt.paint 的 decorations：必须为数组，且有 text（或无文本时为空数组）后再检查各 run。
 */
//@ chunk-4121qate.js:284070-284295 placement
function checkDecorationsArgs(e, o) {
  if (!Array.isArray(o)) return "takes { decorations } (an array of { start, end } runs)";
  return typeof e === "string" || (e === void 0 && checkedListLength(o) === 0)
    ? checkDecorations(o)
    : "takes { text } (a string, the draft the runs were computed for)";
}
//@ chunk-4121qate.js:284295-284518 placement
async function normalizePaintArgs(e, o) {
  let r = isPlainObject(e) ? e.text : void 0,
    n = isPlainObject(e) ? e.decorations : void 0;
  if (!(n !== void 0 && checkDecorationsArgs(r, n) === void 0 && _n(n)))
    throw new HooksError(`${o}: $.prompt.paint ${checkDecorationsArgs(r, n)}`);
  return { ...(typeof r === "string" && { text: r }), decorations: n };
}
//@ chunk-4121qate.js:284518-285298 placement
var PROMPT_SUBMIT_OP = (e, o) =>
  freezeApiObject({
    submit: (r) =>
      requireTextArg(r, e, "prompt.submit").then((n) => {
        let s = n.trim() === "",
          i = isPlainObject(r) ? r.asUser : void 0;
        return s
          ? Promise.reject(new HooksError(`${e}: $.prompt.submit takes { text } (a non-empty prompt)`))
          : i !== void 0 && typeof i !== "boolean"
            ? Promise.reject(new HooksError(`${e}: $.prompt.submit takes { asUser } as a boolean`))
            : o("prompt.submit", i === !0 ? { text: n, asUser: !0 } : { text: n });
      }),
    read: () => o("prompt.read", {}),
    media: (r) => o("prompt.media", r),
    fill: (r) => PROMPT_FILL_OP(r, e).then((n) => o("prompt.fill", n)),
    paint: (r) => normalizePaintArgs(r, e).then((n) => o("prompt.paint", n)),
    suggest: (r) => requireTextArg(r, e, "prompt.suggest").then((n) => o("prompt.suggest", { text: n })),
    compose: (r) =>
      r === void 0 || isPlainObject(r)
        ? o("prompt.compose", { ...r })
        : Promise.reject(
            new HooksError(
              `${e}: $.prompt.compose takes the facts to compose for ({ tools, traits, ... }), or nothing`,
            ),
          ),
  });
//@ chunk-4121qate.js:285298-285453 placement
function normalizeSendArgs(e) {
  let { to: to, text: text } = e;
  if (typeof to === "string") return { to: to, text: text };
  return { to: "sessionId" in to ? { sessionId: to.sessionId } : { agentId: to.agentId }, text: text };
}
//@ chunk-4121qate.js:285453-285569 placement
function pickSendTargetId(e) {
  return isPlainObject(e) && Object.hasOwn(e, "sessionId") !== Object.hasOwn(e, "agentId")
    ? (e.sessionId ?? e.agentId)
    : void 0;
}
//@ chunk-4121qate.js:285569-285711 placement
var SESSION_SEND_USAGE =
  "takes { to, text }: to a name, an agent id or an address (a non-empty string), { sessionId } or { agentId }; text a non-empty string";
/**
 * 校验 $.session.send 参数：to 为非空字符串或 {sessionId}/{agentId} 之一，text 非空。
 */
//@ chunk-4121qate.js:285711-285891 placement
function checkSessionSendArgs(e) {
  if (!isPlainObject(e)) return SESSION_SEND_USAGE;
  let { to: to, text: text } = e,
    n = typeof text === "string" && text.trim() !== "",
    s = typeof to === "string" ? to : pickSendTargetId(to),
    i = typeof s === "string" && s.trim() !== "";
  return n && i ? void 0 : SESSION_SEND_USAGE;
}
//@ chunk-4121qate.js:285891-285999 placement
function pickUsageOptions(e) {
  let { breakdown: breakdown, columns: columns } = e;
  return {
    ...(breakdown !== void 0 && { breakdown: breakdown }),
    ...(columns !== void 0 && { columns: columns }),
  };
}
//@ chunk-4121qate.js:285999-286224 placement
function checkUsageArgs(e) {
  if (e === void 0) return;
  let o = isPlainObject(e) ? Object.keys(e).filter((n) => n !== "breakdown" && n !== "columns") : [];
  return isPlainObject(e) && o.length === 0
    ? void 0
    : "takes { breakdown, columns } or nothing" + (o.length > 0 ? ` (not ${o.join(", ")})` : "");
}
//@ chunk-4121qate.js:286224-287313 placement
var SESSION_OPS = (e, o) =>
  freezeApiObject({
    messages: (r) => {
      let n = checkTranscriptReadArgs(r);
      return n !== void 0
        ? Promise.reject(new HooksError(`${e}: $.session.messages ${n}`))
        : o("session.messages", pickTranscriptReadOptions(r));
    },
    cwd: () => o("session.cwd", {}),
    root: () => o("session.root", {}),
    model: () => o("session.model", {}),
    turns: () => o("session.turns", {}),
    id: () => o("session.id", {}),
    repo: () => o("session.repo", {}),
    surface: () => o("session.surface", {}),
    surfaces: () => o("session.surfaces", {}),
    authorize: () => o("session.authorize", {}),
    identity: () => o("session.identity", {}),
    usage: (r) => {
      let n = checkUsageArgs(r);
      return n !== void 0
        ? Promise.reject(new HooksError(`${e}: $.session.usage ${n}`))
        : o("session.usage", isPlainObject(r) ? pickUsageOptions(r) : {});
    },
    version: () => o("session.version", {}),
    send: withArgCheck({
      name: `${e}: $.session.send`,
      problemOf: checkSessionSendArgs,
      host: (r) => o("session.send", normalizeSendArgs(r)),
    }),
    append: withArgCheck({
      name: `${e}: $.session.append`,
      problemOf: checkSessionAppendArgs,
      host: (r) => o("session.append", toSlimTranscriptMessage(r)),
    }),
    compact: (r) => {
      let n = isPlainObject(r) ? r.instructions : void 0;
      return r !== void 0 && (!isPlainObject(r) || (n !== void 0 && typeof n !== "string"))
        ? Promise.reject(
            new HooksError(`${e}: $.session.compact takes { instructions } (a string) or nothing`),
          )
        : o("session.compact", typeof n === "string" ? { instructions: n } : {});
    },
  });
/**
 * $.settings 命名空间：read（可按 source 或 key 读取设置）。
 */
//@ chunk-4121qate.js:287313-287678 placement
var SETTINGS_OPS = (e, o) =>
  freezeApiObject({
    read: (r) => {
      let { source: source, key: key } = isPlainObject(r)
        ? { source: r.source, key: r.key }
        : { source: void 0, key: void 0 };
      return (r !== void 0 && !isPlainObject(r)) || (key !== void 0 && typeof key !== "string")
        ? Promise.reject(new HooksError(`${e}: $.settings.read takes { source }, { key } or nothing`))
        : o("settings.read", source === void 0 ? {} : { source: source }).then((p) =>
            key === void 0 ? p : Object.entries(p).find(([f]) => f === key)?.[1],
          );
    },
  });
//@ chunk-4121qate.js:287678-287694 placement
var uEe = 4194304;
/**
 * 把值序列化为 JSON 再解析回来，确保是 JSON 数据且不超过 4M 字符，否则抛 HooksError。
 */
//@ chunk-4121qate.js:287694-288073 placement
function toStoredJson(e, o, r = "store.set") {
  let n;
  try {
    n = JSON.stringify(e);
  } catch (error) {
    throw new HooksError(`${o}: $.${r}: value is not JSON data (${errorMessage(error)})`);
  }
  if (typeof n !== "string")
    throw new HooksError(
      `${o}: $.${r}: value is not JSON data (${e === void 0 ? "undefined" : `a ${typeof e}`})`,
    );
  if (n.length > uEe)
    throw new HooksError(`${o}: $.${r}: the value is ${n.length} characters, over the ${uEe} limit`);
  return JSON.parse(n);
}
/**
 * $.store 命名空间：get/set/delete/keys，键为非空字符串，值须为 JSON 数据。
 */
//@ chunk-4121qate.js:288073-288430 placement
function STORE_OPS(e, o) {
  function r(n, s) {
    if (typeof n !== "string" || n === "")
      throw new HooksError(`${e}: $.store.${s} takes a non-empty string key`);
    return n;
  }
  return freezeApiObject({
    get: async (n) => o("store.get", { key: r(n, "get") }),
    set: async (n, s) => {
      await o("store.set", { value: toStoredJson(s, e), key: r(n, "set") });
    },
    delete: async (n) => {
      await o("store.delete", { key: r(n, "delete") });
    },
    keys: () => o("store.keys", {}),
  });
}
//@ chunk-4121qate.js:288430-288946 placement
function STATE_OPS(e, o) {
  function r(n, s) {
    let i = isPlainObject(n) ? n.plugin : void 0,
      p = isPlainObject(n) ? n.key : void 0,
      f = isPlainObject(n) ? n.id : void 0;
    if (!(typeof i === "string" && typeof p === "string" && (f === void 0 || typeof f === "string")))
      throw new HooksError(
        `${e}: $.state.${s} takes a reference { plugin, key } (and id for a family's member)`,
      );
    return f === void 0 ? { plugin: i, key: p } : { plugin: i, key: p, id: f };
  }
  return freezeApiObject({
    get: async (n) => o("state.get", r(n, "get")),
    set: async (n, s, i) =>
      o("state.set", {
        ...r(n, "set"),
        value: toStoredJson(s, e, "state.set"),
        ...(i?.ifVersion !== void 0 && { ifVersion: i.ifVersion }),
      }),
  });
}
//@ chunk-4121qate.js:288946-289029 placement
function jp(e, o) {
  let r = {};
  for (let n of o) {
    let s = e[n];
    if (s !== void 0) r[n] = s;
  }
  return r;
}
//@ chunk-4121qate.js:289029-289430 placement
var TELEMETRY_OPS = (e, o) =>
  freezeApiObject({
    log: (r) =>
      isPlainObject(r)
        ? o("telemetry.log", jp(r, ["to", "event", "props", "attributes", "loggedAt", "span"]))
        : Promise.reject(
            new HooksError(
              `${e}: $.telemetry.log takes an entry ({ to?, event, props? } or a collector record)`,
            ),
          ),
    mark: (r) =>
      isPlainObject(r)
        ? o("telemetry.mark", jp(r, ["feature", "kind", "reason", "props"]))
        : Promise.reject(
            new HooksError(`${e}: $.telemetry.mark takes an entry ({ feature, kind, reason?, props? })`),
          ),
  });
//@ chunk-4121qate.js:289430-289509 placement
function Id(e) {
  let o = isPlainObject(e) ? e.agentId : void 0;
  return typeof o === "string" ? o : void 0;
}

export {
  Id,
  SESSION_OPS,
  PROMPT_SUBMIT_OP,
  TELEMETRY_OPS,
  STORE_OPS,
  STATE_OPS,
  SETTINGS_OPS,
  checkSessionSendArgs,
  checkSessionAppendArgs,
  checkDecorationsArgs,
  uEe,
};
