/**
 * utils/structuredFields.ts
 *
 * 2.1.316 新增：结构化字段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "./hostScoped.js";

//@ chunk-vn3g7zt8.js:257562-257759 placement
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
//@ chunk-vn3g7zt8.js:257759-257771 placement
var externalBuildModelConfig = null;
//@ chunk-vn3g7zt8.js:257771-257804 placement
var externalBuildMembership = new HostScoped(
  () => new ExternalBuildMembership(() => externalBuildModelConfig),
);
//@ chunk-vn3g7zt8.js:257804-257890 placement
function modelKeysOverriddenExternally(patterns, config) {
  if (!Array.isArray(patterns)) return false;
  return matchesModelKeyPattern(patterns, config.mainModelOverrideKeys());
}
//@ chunk-vn3g7zt8.js:257890-258137 placement
function matchesModelKeyPattern(patterns, keys) {
  let exactKeys = new Set();
  let prefixes = [];
  for (let pattern of patterns) {
    if (typeof pattern !== "string") continue;
    if (pattern.length > 1 && pattern.endsWith("*")) prefixes.push(pattern.slice(0, -1));
    else exactKeys.add(pattern);
  }
  if (exactKeys.size === 0 && prefixes.length === 0) return false;
  return keys.some((key) => exactKeys.has(key) || prefixes.some((prefix) => key.startsWith(prefix)));
}
//@ chunk-vn3g7zt8.js:258137-258415 placement
function readModelOverrideConfig(config) {
  if (!config || typeof config !== "object") return {};
  let record = config;
  let readString = (value) => (typeof value === "string" && value.trim() !== "" ? value : undefined);
  let severity = record.severity;
  return {
    model: readString(record.model),
    s1Suffix: readString(record.s1Suffix),
    s2Suffix: readString(record.s2Suffix),
    s1Prefill: readString(record.s1Prefill)?.trimEnd(),
    severity: severity !== null && typeof severity === "object" ? severity : undefined,
  };
}
//@ chunk-vn3g7zt8.js:258415-258459 placement
function sfToken(value) {
  return {
    type: "token",
    value,
  };
}
//@ chunk-vn3g7zt8.js:258459-258504 placement
function sfString(value) {
  return {
    type: "string",
    value,
  };
}
//@ chunk-vn3g7zt8.js:258504-258550 placement (2.1.88 match: isTextField, 1)
function isTextField(s) {
  return {
    type: "integer",
    value: s,
  };
}
//@ chunk-vn3g7zt8.js:258550-258596 placement
function sfBoolean(value) {
  return {
    type: "boolean",
    value,
  };
}
//@ chunk-vn3g7zt8.js:258596-258644 placement
function sfInnerList(items) {
  return {
    type: "innerList",
    items,
  };
}
//@ chunk-vn3g7zt8.js:258644-258761 placement
var SF_KEY_RE = /^[a-z*][a-z0-9_\-.*]*$/;
var SF_TOKEN_RE = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/;
var NON_PRINTABLE_RE = /[^\x20-\x7E]/g;
var SF_MAX_INTEGER = 999999999999999;
//@ chunk-vn3g7zt8.js:258761-258794 placement
function isSfToken(value) {
  return SF_TOKEN_RE.test(value);
}
//@ chunk-vn3g7zt8.js:258794-258827 placement
function isSfKey(key) {
  return SF_KEY_RE.test(key);
}
//@ chunk-vn3g7zt8.js:258827-258905 placement
function quoteSfString(value) {
  return `"${value.replace(NON_PRINTABLE_RE, "?").replace(/[\\"]/g, (char) => `\\${char}`)}"`;
}
//@ chunk-vn3g7zt8.js:258905-259146 placement
function serializeSfItem(item) {
  switch (item.type) {
    case "token":
      return isSfToken(item.value) ? item.value : undefined;
    case "string":
      return quoteSfString(item.value);
    case "integer":
      return Number.isInteger(item.value) && Math.abs(item.value) <= SF_MAX_INTEGER
        ? String(item.value)
        : undefined;
    case "boolean":
      return item.value ? "?1" : "?0";
  }
}
//@ chunk-vn3g7zt8.js:259146-259297 placement
function serializeSfMember(member) {
  if (member.type !== "innerList") return serializeSfItem(member);
  let parts = [];
  for (let item of member.items) {
    let serialized = serializeSfItem(item);
    if (serialized === undefined) return;
    parts.push(serialized);
  }
  return `(${parts.join(" ")})`;
}
//@ chunk-vn3g7zt8.js:259297-259740 placement
/**
 * 按 RFC 8941 结构化字段把 {key, value} 列表序列化为字典头值（key=value, …）：跳过非法键、过长键/值、无法序列化的值与超出成员上限者，并通过 onDrop 回调报告原因。
 */
function serializeSfDictionary(
  members,
  { maxMembers = 1 / 0, maxKeyLength = 1 / 0, maxValueLength = 1 / 0, onDrop } = {},
) {
  let serialized = new Map();
  for (let { key, value } of members) {
    if (!isSfKey(key)) {
      onDrop?.(key, "invalid_key");
      continue;
    }
    if (key.length > maxKeyLength) {
      onDrop?.(key, "key_too_long");
      continue;
    }
    let text = serializeSfMember(value);
    if (text === undefined) {
      onDrop?.(key, "invalid_value");
      continue;
    }
    if (text.length > maxValueLength) {
      onDrop?.(key, "value_too_long");
      continue;
    }
    if (!serialized.has(key) && serialized.size >= maxMembers) {
      onDrop?.(key, "too_many_members");
      continue;
    }
    serialized.set(key, text);
  }
  return [...serialized].map(([key, text]) => `${key}=${text}`).join(", ");
}
export { sfToken, sfString, sfInnerList, isTextField, sfBoolean, serializeSfDictionary };
