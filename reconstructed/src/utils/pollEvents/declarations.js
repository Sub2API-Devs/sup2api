/**
 * utils/pollEvents/declarations.ts
 *
 * 2.1.316 新增：轮询事件声明校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (35)
 * attribution: placement 35
 */
import { POLL } from "../../tools/PollTool/prompt.js";
import { kFe, oCt, ime, vYe, QAt, zar, renderPollEvent } from "../pollEvents.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isAbortError } from "../errors.js";
import { logError } from "../log.js";
import { ge } from "../identity.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, oe, A, pe, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../slowOperations.js";
import { memoizeWithLRU } from "../memoize.js";
import { safeParseJSON } from "../json.js";
import { logForDebugging } from "../debug.js";
import { sanitizeTelemetryString } from "../sanitization.js";

//@ chunk-e6aww6q8.js:157378-157503 placement
var TENGU_MOONLIT_ISLAND = "tengu_moonlit_island",
  ivt = `<system>One or more events arrived; they follow as the result of a ${POLL} call.</system>`;
//@ chunk-e6aww6q8.js:157503-157670 placement
function declaredRoundStamp(e) {
  try {
    return e.length > 0 &&
      e.every(({ pollEvent: pollEvent }) => pollEvent?.declared !== void 0 && !kFe(pollEvent.kind)) &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MOONLIT_ISLAND, !1)
      ? { declaredRound: !0 }
      : {};
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {};
  }
}
//@ chunk-e6aww6q8.js:157670-157695 placement
function vVs(e) {
  return !1;
}
//@ chunk-e6aww6q8.js:157695-157810 placement
function isDeclaredRound(e) {
  try {
    return (
      e.declaredRound === !0 &&
      e.userRoleGuard !== !0 &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MOONLIT_ISLAND, !0)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return !1;
  }
}
//@ chunk-e6aww6q8.js:157810-157845 placement
var nvt = ge(new Set(), (e) => e.clear());
/**
 * 每个回合记录一次"轮询事件声明轮次"的特性状态（已生效、开关关闭或未标记）。
 */
//@ chunk-e6aww6q8.js:157845-158153 placement
function logDeclaredRound(e, n) {
  try {
    if (
      nvt.has(e) ||
      n.userRoleGuard === !0 ||
      n.declared === void 0 ||
      n.declared.length === 0 ||
      n.declared.some((r) => r === null) ||
      n.kinds?.some(kFe) === !0
    )
      return;
    if ((nvt.add(e), isDeclaredRound(n))) logFeatureOk("poll_event_declared_round");
    else logFeatureSad("poll_event_declared_round", n.declaredRound === !0 ? "flag_off" : "not_stamped");
  } catch {}
}
/**
 * 轮询事件声明的上限与 schema：kind 数量、字段路径数、枚举值数、at 令牌长度、描述长度、对象嵌套深度、提示词字节数、kind 名称格式、保留键，以及声明/事件 schema。
 */
//@ chunk-e6aww6q8.js:158153-158565 placement
var MAX_DECLARED_KINDS = 64,
  MAX_FIELD_PATHS = 48,
  MAX_ENUM_VALUES = 32,
  MAX_AT_TOKEN_LENGTH = 256,
  MAX_KIND_DESCRIPTION = 500,
  MAX_OBJECT_DEPTH = 3,
  MAX_DECLARATIONS_PROMPT_BYTES = 16384,
  KIND_NAME_REGEX = /^[a-z][a-z0-9_-]{0,63}$/,
  RESERVED_ENVELOPE_KEYS = new Set(["type", "kind", "at", "nonce"]),
  declarationSchema = DoctorLazy(() =>
    zodStrictObject({
      kind: o(),
      description: o().max(MAX_KIND_DESCRIPTION).optional(),
      schema: oe().optional(),
      untrusted_fields: A(o()).max(MAX_FIELD_PATHS).optional(),
      auto_mode_fields: A(o()).max(MAX_FIELD_PATHS).optional(),
    }),
  ),
  declarationsSchema = DoctorLazy(() => A(declarationSchema()).max(MAX_DECLARED_KINDS)),
  eventFieldsSchema = DoctorLazy(() => pe(o(), oe())),
  pollEventSchema = DoctorLazy(() => u({ kind: o(), at: o(), fields: eventFieldsSchema() })),
  EMPTY_DECLARATIONS = new Map();
//@ chunk-e6aww6q8.js:158565-158612 placement
function Xun() {
  return mvt()?.declarations ?? EMPTY_DECLARATIONS;
}
//@ chunk-e6aww6q8.js:158612-158647 placement
function TVs() {
  return mvt()?.fault;
}
//@ chunk-e6aww6q8.js:158647-159176 placement
function validatePollEventDeclarations(e) {
  let safeParse = declarationsSchema().safeParse(e);
  if (!safeParse.success) {
    let h = safeParse.error.issues[0],
      y = h?.path.join(".") ?? "",
      S = y === "" ? "" : ` at ${y}`,
      w = h?.code === "unrecognized_keys" ? `: ${m$e(h.keys)} is not a key it takes` : "";
    return { ok: !1, reason: `declarations do not match the schema${S}${w}` };
  }
  let r = new Map();
  for (let h of safeParse.data) {
    let y = validatePollEventDeclaration(h, r);
    if (!y.ok) return y;
    r.set(y.value.kind, y.value);
  }
  let byteLength = Buffer.byteLength(declaredKindsPrompt(r) ?? "", "utf8");
  if (byteLength > MAX_DECLARATIONS_PROMPT_BYTES)
    return {
      ok: !1,
      reason: `the declared kinds take ${byteLength} bytes of prompt (cap ${MAX_DECLARATIONS_PROMPT_BYTES})`,
    };
  return { ok: !0, declarations: r };
}
/**
 * 生成宿主声明的轮询事件说明提示词：每种 kind 的字段与不受信字段列表。
 */
//@ chunk-e6aww6q8.js:159176-159499 placement
function declaredKindsPrompt(e) {
  if (e.size === 0) return;
  return `Your host declares the event kinds below. Poll returns each one as an event element whose body is one JSON object, with only the fields listed for its kind. ${glo} The host sets every field except those listed as untrusted, which may hold text from untrusted sources.
${declaredKindsList(e)}`;
}
//@ chunk-e6aww6q8.js:159499-159590 placement
var glo = "Such an event ends at the closing tag that repeats the nonce of its opening tag.";
/**
 * 校验一条轮询事件：kind 未保留、字段符合声明、字段总字节不超限、at 是合法令牌，通过时返回信封与字段。
 */
//@ chunk-e6aww6q8.js:159590-159984 placement
function buildPollEventEnvelope({ declaration: declaration, at: at, fields: fields }) {
  if (kFe(declaration.kind)) return { ok: !1, reason: `kind ${declaration.kind} is reserved` };
  let s = validateEventFields(declaration.fields, fields, "");
  if (!s.ok) return { ok: !1, reason: `${s.reason} on kind ${declaration.kind}` };
  let h = oCt(s.value);
  if (h > ime) return { ok: !1, reason: `fields are ${h} bytes (cap ${ime})` };
  if (!kvt(at)) return { ok: !1, reason: "at is not a token" };
  return { ok: !0, envelope: _lo(declaration.kind, at, s.value), fields: s.value };
}
//@ chunk-e6aww6q8.js:159984-160037 placement
function AVs(e) {
  let n = [];
  return (
    collectFieldStrings(e, n),
    n.join(`
`)
  );
}
//@ chunk-e6aww6q8.js:160037-160263 placement
function collectFieldStrings(e, n) {
  if (typeof e === "string") n.push(vYe(e));
  else if (typeof e === "number" || typeof e === "boolean") n.push(String(e));
  else if (Array.isArray(e)) for (let r of e) collectFieldStrings(r, n);
  else if (dG(e)) for (let r of Object.values(e)) collectFieldStrings(r, n);
}
//@ chunk-e6aww6q8.js:160263-160313 placement
function CVs(e) {
  return escapeHtmlChars(jsonStringify(vYe(e))).slice(1, -1);
}
/**
 * 取出事件中声明为 auto_mode_fields 的字段，序列化后给自动模式分类器。
 */
//@ chunk-e6aww6q8.js:160313-160538 placement
function autoModeFieldsText({ declaration: declaration, fields: fields }) {
  let filtered = declaration.fields
    .map((field) => field.name)
    .filter((s) => declaration.auto_mode_fields.includes(s) && Object.hasOwn(fields, s));
  return filtered.length === 0
    ? void 0
    : wvt({ kind: declaration.kind, ...Object.fromEntries(filtered.map((s) => [s, fields[s]])) });
}
//@ chunk-e6aww6q8.js:160538-160560 placement
function mvt() {
  return;
}
//@ chunk-e6aww6q8.js:160560-160808 placement
var parseDeclarationsCached = memoizeWithLRU(
  (e) => {
    let n = validatePollEventDeclarations(safeParseJSON(e, !1));
    if (!n.ok)
      return (
        logFeatureBad("poll_event_delivery", "declarations_invalid"),
        logForDebugging(`poll event declarations refused: ${n.reason}`, { level: "error" }),
        { declarations: EMPTY_DECLARATIONS, fault: n.reason }
      );
    return { declarations: n.declarations };
  },
  (e) => e,
  4,
);
/**
 * 校验轮询事件声明（kind 合法、不重复、描述无换行、受信字段）。
 */
//@ chunk-e6aww6q8.js:160808-162060 placement
function validatePollEventDeclaration(e, n) {
  let { kind: kind } = e;
  if (!QAt(kind)) return { ok: !1, reason: "invalid kind" };
  if (kFe(kind)) return { ok: !1, reason: `kind ${kind} is reserved for a trusted in-process producer` };
  if (n.has(kind)) return { ok: !1, reason: `kind ${kind} is declared twice` };
  if (
    e.description !== void 0 &&
    (/[\n<>]/.test(e.description) || sanitizeTelemetryString(e.description) !== e.description)
  )
    return {
      ok: !1,
      reason: `kind ${kind}: the description has a line break, markup or a character that cannot be shown`,
    };
  let s =
    e.schema === void 0
      ? { ok: !0, value: [] }
      : validatePollEventSchema(e.schema, "", 1, { left: MAX_FIELD_PATHS });
  if (!s.ok) return { ok: !1, reason: `kind ${kind}: ${s.reason}` };
  let h = e.untrusted_fields ?? [];
  for (let w of h) {
    let L = fieldPathProblem(s.value, w);
    if (L !== void 0)
      return { ok: !1, reason: `kind ${kind}: untrusted_fields names "${sanitizeTelemetryString(w)}", ${L}` };
  }
  if (new Set(h).size !== h.length)
    return { ok: !1, reason: `kind ${kind}: untrusted_fields names a field twice` };
  let y = e.auto_mode_fields ?? [],
    found = y.find((w) => !s.value.some((L) => L.name === w));
  if (found !== void 0)
    return {
      ok: !1,
      reason: `kind ${kind}: auto_mode_fields names "${sanitizeTelemetryString(found)}", which is not a field of the kind itself`,
    };
  if (new Set(y).size !== y.length)
    return { ok: !1, reason: `kind ${kind}: auto_mode_fields names a field twice` };
  return {
    ok: !0,
    value: {
      kind: kind,
      ...(e.description !== void 0 && { description: e.description }),
      fields: s.value,
      untrusted_fields: h,
      auto_mode_fields: y,
    },
  };
}
/**
 * 校验轮询事件字段的 schema（对象嵌套深度等）。
 */
//@ chunk-e6aww6q8.js:162060-163490 placement
function validatePollEventSchema(e, n, r, s) {
  let h = n === "" ? "the schema" : `field ${n.slice(0, -1)}`;
  if (!dG(e) || e.type !== "object") return { ok: !1, reason: `${h} is not an object schema` };
  if (r > MAX_OBJECT_DEPTH)
    return { ok: !1, reason: `${h} nests objects more than ${MAX_OBJECT_DEPTH} deep` };
  let filtered = Object.keys(e).filter(
    (Se) =>
      Se !== "type" &&
      Se !== "properties" &&
      Se !== "required" &&
      Se !== "additionalProperties" &&
      !(Se === "$schema" && n === ""),
  );
  if (filtered.length > 0) return { ok: !1, reason: `${h}: ${m$e(filtered)} is not a key it takes` };
  if (e.additionalProperties !== void 0 && e.additionalProperties !== !1)
    return { ok: !1, reason: `${h}: additionalProperties, when present, is false` };
  let S = e.properties === void 0 ? {} : e.properties,
    w = e.required === void 0 ? [] : e.required;
  if (!dG(S) || !Array.isArray(w) || !w.every((Se) => typeof Se === "string"))
    return { ok: !1, reason: `${h}: properties is an object and required a list of names` };
  let keys = Object.keys(S);
  if (((s.left -= keys.length), s.left < 0)) return { ok: !1, reason: `more than ${MAX_FIELD_PATHS} fields` };
  let G = new Set(w),
    found = w.find((Se) => !Object.hasOwn(S, Se));
  if (found !== void 0)
    return {
      ok: !1,
      reason: `${h}: required names "${sanitizeTelemetryString(found)}", which is not a property`,
    };
  let Z = [];
  for (let Se of keys) {
    if (!KIND_NAME_REGEX.test(Se) || (n === "" && RESERVED_ENVELOPE_KEYS.has(Se)))
      return {
        ok: !1,
        reason: `field "${sanitizeTelemetryString(n + Se)}" is not a name a host may declare (a lowercase letter, then up to 63 lowercase letters, digits, hyphens or underscores, and not type, kind, at or nonce)`,
      };
    let ke = validatePollEventField(S[Se], n + Se, r, s);
    if (!ke.ok) return ke;
    Z.push({ name: Se, required: G.has(Se), is: ke.value });
  }
  return { ok: !0, value: Z };
}
/**
 * 校验轮询事件单个字段的 schema（类型、枚举）。
 */
//@ chunk-e6aww6q8.js:163490-165066 placement
function validatePollEventField(e, n, r, s) {
  if (!dG(e)) return { ok: !1, reason: `field ${n} has no schema` };
  switch (e.type) {
    case "string": {
      let h = unknownKeysProblem(e, ["type", "enum"], n);
      if (h !== void 0) return { ok: !1, reason: h };
      if (e.enum === void 0) return { ok: !0, value: { type: "string" } };
      let y = e.enum;
      if (
        !Array.isArray(y) ||
        y.length === 0 ||
        y.length > MAX_ENUM_VALUES ||
        !y.every((S) => typeof S === "string" && kvt(S)) ||
        new Set(y).size !== y.length
      )
        return {
          ok: !1,
          reason: `field ${n} has an enum that is not a list of 1 to ${MAX_ENUM_VALUES} tokens, or lists one twice`,
        };
      return { ok: !0, value: { type: "string", values: y } };
    }
    case "boolean": {
      let h = unknownKeysProblem(e, ["type"], n);
      return h === void 0 ? { ok: !0, value: { type: "boolean" } } : { ok: !1, reason: h };
    }
    case "integer":
    case "number": {
      let h = unknownKeysProblem(e, ["type", "minimum", "maximum"], n);
      if (h !== void 0) return { ok: !1, reason: h };
      let { minimum: minimum, maximum: maximum } = e;
      if ((minimum !== void 0 && !f$e(minimum)) || (maximum !== void 0 && !f$e(maximum)))
        return { ok: !1, reason: `field ${n}: minimum and maximum, when present, are numbers` };
      if (minimum !== void 0 && maximum !== void 0 && minimum > maximum)
        return { ok: !1, reason: `field ${n}: minimum is greater than maximum` };
      return {
        ok: !0,
        value: {
          type: e.type,
          ...(minimum !== void 0 && { minimum: minimum }),
          ...(maximum !== void 0 && { maximum: maximum }),
        },
      };
    }
    case "array": {
      let h = unknownKeysProblem(e, ["type", "items"], n);
      if (h !== void 0) return { ok: !1, reason: h };
      if (dG(e.items) && e.items.type === "array")
        return { ok: !1, reason: `field ${n} is a list of lists, which a field may not be` };
      let y = validatePollEventField(e.items, `${n}[]`, r, s);
      return y.ok ? { ok: !0, value: { type: "array", items: y.value } } : y;
    }
    case "object": {
      let h = validatePollEventSchema(e, `${n}.`, r + 1, s);
      return h.ok ? { ok: !0, value: { type: "object", fields: h.value } } : h;
    }
    default:
      return {
        ok: !1,
        reason: `field ${n} has a type that is not string, boolean, integer, number, array or object`,
      };
  }
}
/**
 * 检查字段路径（a.b[] 形式）是否指向已声明的文本字段，不是时返回问题描述。
 */
//@ chunk-e6aww6q8.js:165066-165551 placement
function fieldPathProblem(e, n) {
  let r = e,
    s;
  for (let h of n.split(".")) {
    let endsWith = h.endsWith("[]"),
      S = endsWith ? h.slice(0, -2) : h;
    if (((s = r?.find((w) => w.name === S)?.is), s === void 0)) return "which is not a declared field";
    if (endsWith && (s.type !== "array" || s.items.type === "string"))
      return s.type === "array" ? "which names a list of strings, written without []" : "which is not a list";
    if (s.type === "array" && (endsWith || s.items.type === "string")) s = s.items;
    r = s.type === "object" ? s.fields : void 0;
  }
  return s?.type === "string" ? void 0 : "which does not hold text";
}
/**
 * 递归描述声明字段（枚举值、嵌套对象与列表），跳过不受信字段。
 */
//@ chunk-e6aww6q8.js:165551-166010 placement
function describeFields(e, n, r) {
  return e.flatMap(({ name: s, is: is }) => {
    let y = r + s;
    if (n.has(y)) return [];
    let S = is.type === "array" ? is.items : is;
    switch (S.type) {
      case "string":
        return [S.values === void 0 ? s : `${s} (${S.values.join(" | ")})`];
      case "object": {
        let w = describeFields(S.fields, n, is.type === "array" ? `${y}[].` : `${y}.`);
        if (w.length === 0) return S.fields.length === 0 ? [s] : [];
        return [`${s} (${is.type === "array" ? "each: " : ""}${w.join(", ")})`];
      }
      case "boolean":
      case "integer":
      case "number":
      case "array":
        return [s];
    }
  });
}
/**
 * 按声明校验事件字段：不允许未声明字段，必填字段必须存在，逐个校验值类型。
 */
//@ chunk-e6aww6q8.js:166010-166427 placement
function validateEventFields(e, n, r) {
  let found = Object.keys(n).find((y) => !e.some((S) => S.name === y));
  if (found !== void 0)
    return { ok: !1, reason: `field "${sanitizeTelemetryString(r + found)}" is not declared` };
  let h = [];
  for (let y of e) {
    let S = r + y.name,
      w = Object.hasOwn(n, y.name) ? n[y.name] : void 0;
    if (w === void 0) {
      if (y.required) return { ok: !1, reason: `missing field ${S}` };
      continue;
    }
    let L = validatePollEventValue(y.is, w, S);
    if (!L.ok) return L;
    h.push([y.name, L.value]);
  }
  return { ok: !0, value: Object.fromEntries(h) };
}
//@ chunk-e6aww6q8.js:166427-167330 placement
function validatePollEventValue(e, n, r) {
  switch (e.type) {
    case "string":
      return typeof n === "string" && (e.values === void 0 || e.values.includes(n))
        ? { ok: !0, value: n }
        : {
            ok: !1,
            reason: `field ${r} is not ${e.values === void 0 ? "a string" : "one of its enum values"}`,
          };
    case "boolean":
      return typeof n === "boolean"
        ? { ok: !0, value: n }
        : { ok: !1, reason: `field ${r} is not a boolean` };
    case "integer":
    case "number":
      return f$e(n) &&
        (e.type === "number" || Number.isSafeInteger(n)) &&
        (e.minimum === void 0 || n >= e.minimum) &&
        (e.maximum === void 0 || n <= e.maximum)
        ? { ok: !0, value: n }
        : {
            ok: !1,
            reason: `field ${r} is not ${e.type === "integer" ? "an integer" : "a number"} in its range`,
          };
    case "array": {
      if (!Array.isArray(n)) return { ok: !1, reason: `field ${r} is not a list` };
      let s = [];
      for (let [h, y] of n.entries()) {
        let S = validatePollEventValue(e.items, y, `${r}[${h}]`);
        if (!S.ok) return S;
        s.push(S.value);
      }
      return { ok: !0, value: s };
    }
    case "object":
      return dG(n)
        ? validateEventFields(e.fields, n, `${r}.`)
        : { ok: !1, reason: `field ${r} is not an object` };
  }
}
//@ chunk-e6aww6q8.js:167330-167472 placement
function unknownKeysProblem(e, n, r) {
  let filtered = Object.keys(e).filter((h) => !n.includes(h));
  return filtered.length === 0 ? void 0 : `field ${r}: ${m$e(filtered)} is not a key it takes`;
}
//@ chunk-e6aww6q8.js:167472-167543 placement
function dG(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:167543-167606 placement
function f$e(e) {
  return typeof e === "number" && Number.isFinite(e);
}
//@ chunk-e6aww6q8.js:167606-167673 placement
function m$e(e) {
  return e.map((n) => `"${sanitizeTelemetryString(String(n))}"`).join(", ");
}
//@ chunk-e6aww6q8.js:167673-167748 placement
function kvt(e) {
  return e.length <= MAX_AT_TOKEN_LENGTH && /^[\x21-\x7E]+$/.test(e) && zar(e) === e;
}
//@ chunk-e6aww6q8.js:167748-167821 placement
function _lo(e, n, r) {
  return renderPollEvent({
    kind: e,
    at: n,
    content: `
${escapeHtmlChars(wvt(r))}
`,
  });
}
//@ chunk-e6aww6q8.js:167821-167924 placement
function escapeHtmlChars(e) {
  return e.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}
/**
 * 把声明的事件 kind 列成提示词条目：描述、字段与不受信字段。
 */
//@ chunk-e6aww6q8.js:167924-168346 placement
function declaredKindsList(e) {
  return [...e.values()].map((n) => {
    let r = describeFields(n.fields, new Set(n.untrusted_fields), ""),
      s = [
        ...(n.description === void 0 || n.description === ""
          ? []
          : [/[.!?]$/.test(n.description) ? n.description : `${n.description}.`]),
        ...(r.length > 0 ? [`Fields: ${r.join(", ")}.`] : []),
        ...(n.untrusted_fields.length > 0 ? [`Untrusted: ${n.untrusted_fields.join(", ")}.`] : []),
      ];
    return s.length === 0 ? `- ${n.kind}` : `- ${n.kind}: ${s.join(" ")}`;
  }).join(`
`);
}
//@ chunk-e6aww6q8.js:168346-168410 placement
function wvt(e) {
  return jsonStringify(e, (n, r) => (typeof r === "string" ? vYe(r) : r));
}

export {
  isDeclaredRound,
  ivt,
  buildPollEventEnvelope,
  logDeclaredRound,
  pollEventSchema,
  declaredKindsPrompt,
  Xun,
  declaredRoundStamp,
  CVs,
  vVs,
  eventFieldsSchema,
  TVs,
  autoModeFieldsText,
  AVs,
};
