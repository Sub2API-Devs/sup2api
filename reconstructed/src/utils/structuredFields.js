/**
 * utils/structuredFields.ts
 *
 * 2.1.316 新增：结构化字段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (18)
 * attribution: placement 18
 */
import { HostScoped } from "./hostScoped.js";

//@ chunk-hwmsct5x.js:252468-252665 placement
class ExternalBuildMembership {
  deps;
  loggedDowngrade = false;
  constructor(deps) {
    this.deps = deps;
  }
  resolve() {
    return this.decide().state;
  }
  verdict() {
    return this.decide().verdict;
  }
  decide() {
    return {
      state: {
        member: false,
      },
      verdict: "external_build",
    };
  }
}
//@ chunk-hwmsct5x.js:252665-252677 placement
var externalBuildModelConfig = null;
//@ chunk-hwmsct5x.js:252677-252710 placement
var externalBuildMembership = new HostScoped(
  () => new ExternalBuildMembership(() => externalBuildModelConfig),
);
//@ chunk-hwmsct5x.js:252710-252796 placement
function modelKeysOverriddenExternally(e, n) {
  if (!Array.isArray(e)) return false;
  return matchesModelKeyPattern(e, n.mainModelOverrideKeys());
}
//@ chunk-hwmsct5x.js:252796-253043 placement
function matchesModelKeyPattern(e, n) {
  let r = new Set();
  let s = [];
  for (let h of e) {
    if (typeof h !== "string") continue;
    if (h.length > 1 && h.endsWith("*")) s.push(h.slice(0, -1));
    else r.add(h);
  }
  if (r.size === 0 && s.length === 0) return false;
  return n.some((h) => r.has(h) || s.some((y) => h.startsWith(y)));
}
//@ chunk-hwmsct5x.js:253043-253321 placement
function readModelOverrideConfig(e) {
  if (!e || typeof e !== "object") return {};
  let n = e;
  let r = (h) => (typeof h === "string" && h.trim() !== "" ? h : undefined);
  let severity = n.severity;
  return {
    model: r(n.model),
    s1Suffix: r(n.s1Suffix),
    s2Suffix: r(n.s2Suffix),
    s1Prefill: r(n.s1Prefill)?.trimEnd(),
    severity: severity !== null && typeof severity === "object" ? severity : undefined,
  };
}
//@ chunk-hwmsct5x.js:253321-253365 placement
function sfToken(value) {
  return {
    type: "token",
    value,
  };
}
//@ chunk-hwmsct5x.js:253365-253410 placement
function sfString(value) {
  return {
    type: "string",
    value,
  };
}
//@ chunk-hwmsct5x.js:253410-253456 placement = isTextField (1)
function isTextField(s) {
  return {
    type: "integer",
    value: s,
  };
}
//@ chunk-hwmsct5x.js:253456-253502 placement
function sfBoolean(value) {
  return {
    type: "boolean",
    value,
  };
}
//@ chunk-hwmsct5x.js:253502-253550 placement
function sfInnerList(items) {
  return {
    type: "innerList",
    items,
  };
}
//@ chunk-hwmsct5x.js:253550-253667 placement
var SF_KEY_RE = /^[a-z*][a-z0-9_\-.*]*$/;
var SF_TOKEN_RE = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/;
var NON_PRINTABLE_RE = /[^\x20-\x7E]/g;
var SF_MAX_INTEGER = 999999999999999;
//@ chunk-hwmsct5x.js:253667-253700 placement
function isSfToken(e) {
  return SF_TOKEN_RE.test(e);
}
//@ chunk-hwmsct5x.js:253700-253733 placement
function isSfKey(key) {
  return SF_KEY_RE.test(key);
}
//@ chunk-hwmsct5x.js:253733-253811 placement
function quoteSfString(e) {
  return `"${e.replace(NON_PRINTABLE_RE, "?").replace(/[\\"]/g, (r) => `\\${r}`)}"`;
}
//@ chunk-hwmsct5x.js:253811-254052 placement
function serializeSfItem(e) {
  switch (e.type) {
    case "token":
      return isSfToken(e.value) ? e.value : undefined;
    case "string":
      return quoteSfString(e.value);
    case "integer":
      return Number.isInteger(e.value) && Math.abs(e.value) <= SF_MAX_INTEGER ? String(e.value) : undefined;
    case "boolean":
      return e.value ? "?1" : "?0";
  }
}
//@ chunk-hwmsct5x.js:254052-254203 placement
function serializeSfMember(e) {
  if (e.type !== "innerList") return serializeSfItem(e);
  let n = [];
  for (let item of e.items) {
    let s = serializeSfItem(item);
    if (s === undefined) return;
    n.push(s);
  }
  return `(${n.join(" ")})`;
}
//@ chunk-hwmsct5x.js:254203-254646 placement
/**
 * 按 RFC 8941 结构化字段把 {key, value} 列表序列化为字典头值（key=value, …）：跳过非法键、过长键/值、无法序列化的值与超出成员上限者，并通过 onDrop 回调报告原因。
 */
function serializeSfDictionary(
  e,
  { maxMembers: n = 1 / 0, maxKeyLength: r = 1 / 0, maxValueLength: s = 1 / 0, onDrop: h } = {},
) {
  let y = new Map();
  for (let { key, value: S } of e) {
    if (!isSfKey(key)) {
      h?.(key, "invalid_key");
      continue;
    }
    if (key.length > r) {
      h?.(key, "key_too_long");
      continue;
    }
    let E = serializeSfMember(S);
    if (E === undefined) {
      h?.(key, "invalid_value");
      continue;
    }
    if (E.length > s) {
      h?.(key, "value_too_long");
      continue;
    }
    if (!y.has(key) && y.size >= n) {
      h?.(key, "too_many_members");
      continue;
    }
    y.set(key, E);
  }
  return [...y].map(([w, S]) => `${w}=${S}`).join(", ");
}
export { sfToken, sfString, sfInnerList, isTextField, sfBoolean, serializeSfDictionary };
