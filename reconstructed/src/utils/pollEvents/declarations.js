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
import {
  mentionsReservedKind,
  eventByteLength,
  MAX_POLL_EVENT_ENVELOPE_BYTES,
  normalizeNewlines,
  isValidPollEventKind,
  sanitizeEventAttributes,
  renderPollEvent,
} from "../pollEvents.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isAbortError } from "../errors.js";
import { logError } from "../log.js";
import { identity as identity_2 } from "../identity.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  string,
  unknown,
  array,
  record,
  u,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../slowOperations.js";
import { memoizeWithLRU } from "../memoize.js";
import { safeParseJSON } from "../json.js";
import { logForDebugging } from "../debug.js";
import { sanitizeTelemetryString } from "../sanitization.js";

//@ chunk-e6aww6q8.js:157378-157503 placement
/**
 * POLL_EVENTS_ANNOUNCE_LINE：轮询事件到达时的系统提示行。
 */
var TENGU_MOONLIT_ISLAND = "tengu_moonlit_island";
var POLL_EVENTS_ANNOUNCE_LINE = `<system>One or more events arrived; they follow as the result of a ${POLL} call.</system>`;
//@ chunk-e6aww6q8.js:157503-157670 placement
function declaredRoundStamp(e) {
  try {
    return e.length > 0 &&
      e.every(
        ({ pollEvent }) => pollEvent?.declared !== undefined && !mentionsReservedKind(pollEvent.kind),
      ) &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MOONLIT_ISLAND, false)
      ? {
          declaredRound: true,
        }
      : {};
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {};
  }
}
//@ chunk-e6aww6q8.js:157670-157695 placement
/**
 * neverDeclaresEvents：恒 false 的声明判定（占位）。
 */
function neverDeclaresEvents(e) {
  return false;
}
//@ chunk-e6aww6q8.js:157695-157810 placement
function isDeclaredRound(e) {
  try {
    return (
      e.declaredRound === true &&
      e.userRoleGuard !== true &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MOONLIT_ISLAND, true)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:157810-157845 placement
var declaredRoundsSeen = identity_2(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:157845-158153 placement
/**
 * 每个回合记录一次"轮询事件声明轮次"的特性状态（已生效、开关关闭或未标记）。
 */
function logDeclaredRound(e, n) {
  try {
    if (
      declaredRoundsSeen.has(e) ||
      n.userRoleGuard === true ||
      n.declared === undefined ||
      n.declared.length === 0 ||
      n.declared.some((r) => r === null) ||
      n.kinds?.some(mentionsReservedKind) === true
    )
      return;
    declaredRoundsSeen.add(e);
    if (isDeclaredRound(n)) logFeatureOk("poll_event_declared_round");
    else logFeatureSad("poll_event_declared_round", n.declaredRound === true ? "flag_off" : "not_stamped");
  } catch {}
}
//@ chunk-e6aww6q8.js:158153-158565 placement
/**
 * 轮询事件声明的上限与 schema：kind 数量、字段路径数、枚举值数、at 令牌长度、描述长度、对象嵌套深度、提示词字节数、kind 名称格式、保留键，以及声明/事件 schema。
 */
var MAX_DECLARED_KINDS = 64;
var MAX_FIELD_PATHS = 48;
var MAX_ENUM_VALUES = 32;
var MAX_AT_TOKEN_LENGTH = 256;
var MAX_KIND_DESCRIPTION = 500;
var MAX_OBJECT_DEPTH = 3;
var MAX_DECLARATIONS_PROMPT_BYTES = 16384;
var KIND_NAME_REGEX = /^[a-z][a-z0-9_-]{0,63}$/;
var RESERVED_ENVELOPE_KEYS = new Set(["type", "kind", "at", "nonce"]);
var declarationSchema = DoctorLazy(() =>
  zodStrictObject({
    kind: string(),
    description: string().max(MAX_KIND_DESCRIPTION).optional(),
    schema: unknown().optional(),
    untrusted_fields: array(string()).max(MAX_FIELD_PATHS).optional(),
    auto_mode_fields: array(string()).max(MAX_FIELD_PATHS).optional(),
  }),
);
var declarationsSchema = DoctorLazy(() => array(declarationSchema()).max(MAX_DECLARED_KINDS));
var eventFieldsSchema = DoctorLazy(() => record(string(), unknown()));
var pollEventSchema = DoctorLazy(() =>
  u({
    kind: string(),
    at: string(),
    fields: eventFieldsSchema(),
  }),
);
var EMPTY_DECLARATIONS = new Map();
//@ chunk-e6aww6q8.js:158565-158612 placement
/**
 * eventDeclarations：宿主声明的事件种类。
 */
function eventDeclarations() {
  return noHostDeclarations()?.declarations ?? EMPTY_DECLARATIONS;
}
//@ chunk-e6aww6q8.js:158612-158647 placement
/**
 * eventDeclarationFault：事件声明解析失败的原因。
 */
function eventDeclarationFault() {
  return noHostDeclarations()?.fault;
}
//@ chunk-e6aww6q8.js:158647-159176 placement
function validatePollEventDeclarations(e) {
  let n = declarationsSchema().safeParse(e);
  if (!n.success) {
    let h = n.error.issues[0];
    let y = h?.path.join(".") ?? "";
    let S = y === "" ? "" : ` at ${y}`;
    let w = h?.code === "unrecognized_keys" ? `: ${telemetryStringList(h.keys)} is not a key it takes` : "";
    return {
      ok: false,
      reason: `declarations do not match the schema${S}${w}`,
    };
  }
  let r = new Map();
  for (let h of n.data) {
    let y = validatePollEventDeclaration(h, r);
    if (!y.ok) return y;
    r.set(y.value.kind, y.value);
  }
  let s = Buffer.byteLength(declaredKindsPrompt(r) ?? "", "utf8");
  if (s > MAX_DECLARATIONS_PROMPT_BYTES)
    return {
      ok: false,
      reason: `the declared kinds take ${s} bytes of prompt (cap ${MAX_DECLARATIONS_PROMPT_BYTES})`,
    };
  return {
    ok: true,
    declarations: r,
  };
}
//@ chunk-e6aww6q8.js:159176-159499 placement
/**
 * 生成宿主声明的轮询事件说明提示词：每种 kind 的字段与不受信字段列表。
 */
function declaredKindsPrompt(e) {
  if (e.size === 0) return;
  return `Your host declares the event kinds below. Poll returns each one as an event element whose body is one JSON object, with only the fields listed for its kind. ${EVENT_NONCE_RULE_TEXT} The host sets every field except those listed as untrusted, which may hold text from untrusted sources.
${declaredKindsList(e)}`;
}
//@ chunk-e6aww6q8.js:159499-159590 placement
var EVENT_NONCE_RULE_TEXT =
  "Such an event ends at the closing tag that repeats the nonce of its opening tag.";
//@ chunk-e6aww6q8.js:159590-159984 placement
/**
 * 校验一条轮询事件：kind 未保留、字段符合声明、字段总字节不超限、at 是合法令牌，通过时返回信封与字段。
 */
function buildPollEventEnvelope({ declaration, at, fields }) {
  if (mentionsReservedKind(declaration.kind))
    return {
      ok: false,
      reason: `kind ${declaration.kind} is reserved`,
    };
  let s = validateEventFields(declaration.fields, fields, "");
  if (!s.ok)
    return {
      ok: false,
      reason: `${s.reason} on kind ${declaration.kind}`,
    };
  let h = eventByteLength(s.value);
  if (h > MAX_POLL_EVENT_ENVELOPE_BYTES)
    return {
      ok: false,
      reason: `fields are ${h} bytes (cap ${MAX_POLL_EVENT_ENVELOPE_BYTES})`,
    };
  if (!isValidAtToken(at))
    return {
      ok: false,
      reason: "at is not a token",
    };
  return {
    ok: true,
    envelope: renderEventElement(declaration.kind, at, s.value),
    fields: s.value,
  };
}
//@ chunk-e6aww6q8.js:159984-160037 placement
/**
 * collectFieldStrings：汇总事件字段的字符串。
 */
function collectFieldStrings(fields) {
  let n = [];
  collectFieldStrings_2(fields, n);
  return n.join(`
`);
}
//@ chunk-e6aww6q8.js:160037-160263 placement
function collectFieldStrings_2(e, n) {
  if (typeof e === "string") n.push(normalizeNewlines(e));
  else if (typeof e === "number" || typeof e === "boolean") n.push(String(e));
  else if (Array.isArray(e)) for (let r of e) collectFieldStrings_2(r, n);
  else if (isPlainRecord(e)) for (let r of Object.values(e)) collectFieldStrings_2(r, n);
}
//@ chunk-e6aww6q8.js:160263-160313 placement
/**
 * escapedEventJsonBody：转义后的事件 JSON 正文。
 */
function escapedEventJsonBody(e) {
  return escapeHtmlChars(jsonStringify(normalizeNewlines(e))).slice(1, -1);
}
//@ chunk-e6aww6q8.js:160313-160538 placement
/**
 * 取出事件中声明为 auto_mode_fields 的字段，序列化后给自动模式分类器。
 */
function autoModeFieldsText({ declaration, fields }) {
  let filtered = declaration.fields
    .map((field) => field.name)
    .filter((s) => declaration.auto_mode_fields.includes(s) && Object.hasOwn(fields, s));
  return filtered.length === 0
    ? undefined
    : sanitizedJson({
        kind: declaration.kind,
        ...Object.fromEntries(filtered.map((s) => [s, fields[s]])),
      });
}
//@ chunk-e6aww6q8.js:160538-160560 placement
function noHostDeclarations() {
  return;
}
//@ chunk-e6aww6q8.js:160560-160808 placement
var parseDeclarationsCached = memoizeWithLRU(
  (e) => {
    let n = validatePollEventDeclarations(safeParseJSON(e, false));
    if (!n.ok) {
      logFeatureBad("poll_event_delivery", "declarations_invalid");
      logForDebugging(`poll event declarations refused: ${n.reason}`, {
        level: "error",
      });
      return {
        declarations: EMPTY_DECLARATIONS,
        fault: n.reason,
      };
    }
    return {
      declarations: n.declarations,
    };
  },
  (e) => e,
  4,
);
//@ chunk-e6aww6q8.js:160808-162060 placement
/**
 * 校验轮询事件声明（kind 合法、不重复、描述无换行、受信字段）。
 */
function validatePollEventDeclaration(e, n) {
  let { kind } = e;
  if (!isValidPollEventKind(kind))
    return {
      ok: false,
      reason: "invalid kind",
    };
  if (mentionsReservedKind(kind))
    return {
      ok: false,
      reason: `kind ${kind} is reserved for a trusted in-process producer`,
    };
  if (n.has(kind))
    return {
      ok: false,
      reason: `kind ${kind} is declared twice`,
    };
  if (
    e.description !== undefined &&
    (/[\n<>]/.test(e.description) || sanitizeTelemetryString(e.description) !== e.description)
  )
    return {
      ok: false,
      reason: `kind ${kind}: the description has a line break, markup or a character that cannot be shown`,
    };
  let s =
    e.schema === undefined
      ? {
          ok: true,
          value: [],
        }
      : validatePollEventSchema(e.schema, "", 1, {
          left: MAX_FIELD_PATHS,
        });
  if (!s.ok)
    return {
      ok: false,
      reason: `kind ${kind}: ${s.reason}`,
    };
  let untrustedFields = e.untrusted_fields ?? [];
  for (let untrustedField of untrustedFields) {
    let L = fieldPathProblem(s.value, untrustedField);
    if (L !== undefined)
      return {
        ok: false,
        reason: `kind ${kind}: untrusted_fields names "${sanitizeTelemetryString(untrustedField)}", ${L}`,
      };
  }
  if (new Set(untrustedFields).size !== untrustedFields.length)
    return {
      ok: false,
      reason: `kind ${kind}: untrusted_fields names a field twice`,
    };
  let autoModeFields = e.auto_mode_fields ?? [];
  let found = autoModeFields.find((autoModeField) => !s.value.some((L) => L.name === autoModeField));
  if (found !== undefined)
    return {
      ok: false,
      reason: `kind ${kind}: auto_mode_fields names "${sanitizeTelemetryString(found)}", which is not a field of the kind itself`,
    };
  if (new Set(autoModeFields).size !== autoModeFields.length)
    return {
      ok: false,
      reason: `kind ${kind}: auto_mode_fields names a field twice`,
    };
  return {
    ok: true,
    value: {
      kind,
      ...(e.description !== undefined && {
        description: e.description,
      }),
      fields: s.value,
      untrusted_fields: untrustedFields,
      auto_mode_fields: autoModeFields,
    },
  };
}
//@ chunk-e6aww6q8.js:162060-163490 placement
/**
 * 校验轮询事件字段的 schema（对象嵌套深度等）。
 */
function validatePollEventSchema(e, n, r, s) {
  let h = n === "" ? "the schema" : `field ${n.slice(0, -1)}`;
  if (!isPlainRecord(e) || e.type !== "object")
    return {
      ok: false,
      reason: `${h} is not an object schema`,
    };
  if (r > MAX_OBJECT_DEPTH)
    return {
      ok: false,
      reason: `${h} nests objects more than ${MAX_OBJECT_DEPTH} deep`,
    };
  let filtered = Object.keys(e).filter(
    (key) =>
      key !== "type" &&
      key !== "properties" &&
      key !== "required" &&
      key !== "additionalProperties" &&
      !(key === "$schema" && n === ""),
  );
  if (filtered.length > 0)
    return {
      ok: false,
      reason: `${h}: ${telemetryStringList(filtered)} is not a key it takes`,
    };
  if (e.additionalProperties !== undefined && e.additionalProperties !== false)
    return {
      ok: false,
      reason: `${h}: additionalProperties, when present, is false`,
    };
  let properties = e.properties === undefined ? {} : e.properties;
  let required = e.required === undefined ? [] : e.required;
  if (
    !isPlainRecord(properties) ||
    !Array.isArray(required) ||
    !required.every((Se) => typeof Se === "string")
  )
    return {
      ok: false,
      reason: `${h}: properties is an object and required a list of names`,
    };
  let keys = Object.keys(properties);
  s.left -= keys.length;
  if (s.left < 0)
    return {
      ok: false,
      reason: `more than ${MAX_FIELD_PATHS} fields`,
    };
  let G = new Set(required);
  let found = required.find((Se) => !Object.hasOwn(properties, Se));
  if (found !== undefined)
    return {
      ok: false,
      reason: `${h}: required names "${sanitizeTelemetryString(found)}", which is not a property`,
    };
  let Z = [];
  for (let Se of keys) {
    if (!KIND_NAME_REGEX.test(Se) || (n === "" && RESERVED_ENVELOPE_KEYS.has(Se)))
      return {
        ok: false,
        reason: `field "${sanitizeTelemetryString(n + Se)}" is not a name a host may declare (a lowercase letter, then up to 63 lowercase letters, digits, hyphens or underscores, and not type, kind, at or nonce)`,
      };
    let ke = validatePollEventField(properties[Se], n + Se, r, s);
    if (!ke.ok) return ke;
    Z.push({
      name: Se,
      required: G.has(Se),
      is: ke.value,
    });
  }
  return {
    ok: true,
    value: Z,
  };
}
//@ chunk-e6aww6q8.js:163490-165066 placement
/**
 * 校验轮询事件单个字段的 schema（类型、枚举）。
 */
function validatePollEventField(e, n, r, s) {
  if (!isPlainRecord(e))
    return {
      ok: false,
      reason: `field ${n} has no schema`,
    };
  switch (e.type) {
    case "string": {
      let h = unknownKeysProblem(e, ["type", "enum"], n);
      if (h !== undefined)
        return {
          ok: false,
          reason: h,
        };
      if (e.enum === undefined)
        return {
          ok: true,
          value: {
            type: "string",
          },
        };
      let y = e.enum;
      if (
        !Array.isArray(y) ||
        y.length === 0 ||
        y.length > MAX_ENUM_VALUES ||
        !y.every((S) => typeof S === "string" && isValidAtToken(S)) ||
        new Set(y).size !== y.length
      )
        return {
          ok: false,
          reason: `field ${n} has an enum that is not a list of 1 to ${MAX_ENUM_VALUES} tokens, or lists one twice`,
        };
      return {
        ok: true,
        value: {
          type: "string",
          values: y,
        },
      };
    }
    case "boolean": {
      let h = unknownKeysProblem(e, ["type"], n);
      return h === undefined
        ? {
            ok: true,
            value: {
              type: "boolean",
            },
          }
        : {
            ok: false,
            reason: h,
          };
    }
    case "integer":
    case "number": {
      let h = unknownKeysProblem(e, ["type", "minimum", "maximum"], n);
      if (h !== undefined)
        return {
          ok: false,
          reason: h,
        };
      let { minimum, maximum } = e;
      if (
        (minimum !== undefined && !isFiniteNumber(minimum)) ||
        (maximum !== undefined && !isFiniteNumber(maximum))
      )
        return {
          ok: false,
          reason: `field ${n}: minimum and maximum, when present, are numbers`,
        };
      if (minimum !== undefined && maximum !== undefined && minimum > maximum)
        return {
          ok: false,
          reason: `field ${n}: minimum is greater than maximum`,
        };
      return {
        ok: true,
        value: {
          type: e.type,
          ...(minimum !== undefined && {
            minimum,
          }),
          ...(maximum !== undefined && {
            maximum,
          }),
        },
      };
    }
    case "array": {
      let h = unknownKeysProblem(e, ["type", "items"], n);
      if (h !== undefined)
        return {
          ok: false,
          reason: h,
        };
      if (isPlainRecord(e.items) && e.items.type === "array")
        return {
          ok: false,
          reason: `field ${n} is a list of lists, which a field may not be`,
        };
      let y = validatePollEventField(e.items, `${n}[]`, r, s);
      return y.ok
        ? {
            ok: true,
            value: {
              type: "array",
              items: y.value,
            },
          }
        : y;
    }
    case "object": {
      let h = validatePollEventSchema(e, `${n}.`, r + 1, s);
      return h.ok
        ? {
            ok: true,
            value: {
              type: "object",
              fields: h.value,
            },
          }
        : h;
    }
    default:
      return {
        ok: false,
        reason: `field ${n} has a type that is not string, boolean, integer, number, array or object`,
      };
  }
}
//@ chunk-e6aww6q8.js:165066-165551 placement
/**
 * 检查字段路径（a.b[] 形式）是否指向已声明的文本字段，不是时返回问题描述。
 */
function fieldPathProblem(e, untrustedField) {
  let r = e;
  let s;
  for (let h of untrustedField.split(".")) {
    let y = h.endsWith("[]");
    let S = y ? h.slice(0, -2) : h;
    s = r?.find((w) => w.name === S)?.is;
    if (s === undefined) return "which is not a declared field";
    if (y && (s.type !== "array" || s.items.type === "string"))
      return s.type === "array" ? "which names a list of strings, written without []" : "which is not a list";
    if (s.type === "array" && (y || s.items.type === "string")) s = s.items;
    r = s.type === "object" ? s.fields : undefined;
  }
  return s?.type === "string" ? undefined : "which does not hold text";
}
//@ chunk-e6aww6q8.js:165551-166010 placement
/**
 * 递归描述声明字段（枚举值、嵌套对象与列表），跳过不受信字段。
 */
function describeFields(fields, n, r) {
  return fields.flatMap(({ name: s, is }) => {
    let y = r + s;
    if (n.has(y)) return [];
    let S = is.type === "array" ? is.items : is;
    switch (S.type) {
      case "string":
        return [S.values === undefined ? s : `${s} (${S.values.join(" | ")})`];
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
//@ chunk-e6aww6q8.js:166010-166427 placement
/**
 * 按声明校验事件字段：不允许未声明字段，必填字段必须存在，逐个校验值类型。
 */
function validateEventFields(fields, n, r) {
  let found = Object.keys(n).find((key) => !fields.some((S) => S.name === key));
  if (found !== undefined)
    return {
      ok: false,
      reason: `field "${sanitizeTelemetryString(r + found)}" is not declared`,
    };
  let h = [];
  for (let y of fields) {
    let S = r + y.name;
    let w = Object.hasOwn(n, y.name) ? n[y.name] : undefined;
    if (w === undefined) {
      if (y.required)
        return {
          ok: false,
          reason: `missing field ${S}`,
        };
      continue;
    }
    let L = validatePollEventValue(y.is, w, S);
    if (!L.ok) return L;
    h.push([y.name, L.value]);
  }
  return {
    ok: true,
    value: Object.fromEntries(h),
  };
}
//@ chunk-e6aww6q8.js:166427-167330 placement
function validatePollEventValue(e, n, r) {
  switch (e.type) {
    case "string":
      return typeof n === "string" && (e.values === undefined || e.values.includes(n))
        ? {
            ok: true,
            value: n,
          }
        : {
            ok: false,
            reason: `field ${r} is not ${e.values === undefined ? "a string" : "one of its enum values"}`,
          };
    case "boolean":
      return typeof n === "boolean"
        ? {
            ok: true,
            value: n,
          }
        : {
            ok: false,
            reason: `field ${r} is not a boolean`,
          };
    case "integer":
    case "number":
      return isFiniteNumber(n) &&
        (e.type === "number" || Number.isSafeInteger(n)) &&
        (e.minimum === undefined || n >= e.minimum) &&
        (e.maximum === undefined || n <= e.maximum)
        ? {
            ok: true,
            value: n,
          }
        : {
            ok: false,
            reason: `field ${r} is not ${e.type === "integer" ? "an integer" : "a number"} in its range`,
          };
    case "array": {
      if (!Array.isArray(n))
        return {
          ok: false,
          reason: `field ${r} is not a list`,
        };
      let s = [];
      for (let [h, y] of n.entries()) {
        let S = validatePollEventValue(e.items, y, `${r}[${h}]`);
        if (!S.ok) return S;
        s.push(S.value);
      }
      return {
        ok: true,
        value: s,
      };
    }
    case "object":
      return isPlainRecord(n)
        ? validateEventFields(e.fields, n, `${r}.`)
        : {
            ok: false,
            reason: `field ${r} is not an object`,
          };
  }
}
//@ chunk-e6aww6q8.js:167330-167472 placement
function unknownKeysProblem(e, n, r) {
  let filtered = Object.keys(e).filter((key) => !n.includes(key));
  return filtered.length === 0
    ? undefined
    : `field ${r}: ${telemetryStringList(filtered)} is not a key it takes`;
}
//@ chunk-e6aww6q8.js:167472-167543 placement
function isPlainRecord(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:167543-167606 placement
function isFiniteNumber(e) {
  return typeof e === "number" && Number.isFinite(e);
}
//@ chunk-e6aww6q8.js:167606-167673 placement
function telemetryStringList(e) {
  return e.map((n) => `"${sanitizeTelemetryString(String(n))}"`).join(", ");
}
//@ chunk-e6aww6q8.js:167673-167748 placement
function isValidAtToken(e) {
  return e.length <= MAX_AT_TOKEN_LENGTH && /^[\x21-\x7E]+$/.test(e) && sanitizeEventAttributes(e) === e;
}
//@ chunk-e6aww6q8.js:167748-167821 placement
function renderEventElement(kind, at, r) {
  return renderPollEvent({
    kind,
    at,
    content: `
${escapeHtmlChars(sanitizedJson(r))}
`,
  });
}
//@ chunk-e6aww6q8.js:167821-167924 placement
function escapeHtmlChars(e) {
  return e.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}
//@ chunk-e6aww6q8.js:167924-168346 placement
/**
 * 把声明的事件 kind 列成提示词条目：描述、字段与不受信字段。
 */
function declaredKindsList(e) {
  return [...e.values()].map((n) => {
    let r = describeFields(n.fields, new Set(n.untrusted_fields), "");
    let s = [
      ...(n.description === undefined || n.description === ""
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
function sanitizedJson(e) {
  return jsonStringify(e, (n, r) => (typeof r === "string" ? normalizeNewlines(r) : r));
}
export {
  isDeclaredRound,
  POLL_EVENTS_ANNOUNCE_LINE,
  buildPollEventEnvelope,
  logDeclaredRound,
  pollEventSchema,
  declaredKindsPrompt,
  eventDeclarations,
  declaredRoundStamp,
  escapedEventJsonBody,
  neverDeclaresEvents,
  eventFieldsSchema,
  eventDeclarationFault,
  autoModeFieldsText,
  collectFieldStrings,
};
