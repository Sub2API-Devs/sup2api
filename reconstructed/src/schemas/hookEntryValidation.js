/**
 * schemas/hookEntryValidation.ts
 *
 * 2.1.316 新增：解析 hooks 设置，返回合法 hooks、无效项与无法加载的守护；剔除无效 hook 条目；守护型事件的无效条目记为无法加载的守护等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (20)
 * attribution: placement 20
 */
import { getPlatform } from "../utils/platform.js";
import { HookCommandSchema, HookMatcherSchema } from "./hooks.js";
import { Mu } from "../utils/stringUtils.js";
import { HOOK_EVENTS } from "../entrypoints/sdk/coreSchemas.js";
import { A } from "../../vendor/zod/v4/classic/schemas.js";
import { mcpInfoFromString, getMcpPrefix } from "../services/mcp/mcpStringUtils.js";

/**
 * 检查 hook 命令只用允许的变量展开。
 */
//@ chunk-dcmhvw5a.js:57897-59011 placement
function checkHookCommandExpansion(e) {
  if (
    /\$(?!\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\})/.test(e) ||
    e.includes("`") ||
    /%[A-Za-z_][A-Za-z0-9_]*%/.test(e)
  )
    return "Only ${CLAUDE_PROJECT_DIR}, ${CLAUDE_PLUGIN_ROOT} and ${CLAUDE_PLUGIN_DATA} are expanded in `file` (no shell runs); any other $\u2026, backtick or %NAME% is not expanded";
  let n = /^[a-zA-Z]:/.test(e) || e.includes("\\");
  if (getPlatform() === "windows" ? /^[\\/](?![\\/])/.test(e) || /^[a-zA-Z]:(?![\\/])/.test(e) : n)
    return getPlatform() === "windows"
      ? "`file` is drive-relative on Windows (\\path or C:path); use a drive-absolute path, ~/ or a ${CLAUDE_\u2026} placeholder"
      : "`file` is a Windows path (C:\u2026 or \\\u2026) read on another platform; use ~/, a ${CLAUDE_\u2026} placeholder or a relative path so the hook resolves everywhere";
  if (e.startsWith("~") && e !== "~" && !/^~[\\/]/.test(e))
    return "`file` starting with ~name is not expanded; use an absolute path or ~/";
  if (
    e.trim() === "" ||
    e === "." ||
    e === ".." ||
    e === "~" ||
    /[\\/]$/.test(e) ||
    /[\\/]\.{1,2}$/.test(e) ||
    /^\$\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\}$/.test(e)
  )
    return "`file` must name a script file, not a directory or an empty path";
  return;
}
//@ chunk-dcmhvw5a.js:59011-59084 placement
function qn() {
  return new Set(HookCommandSchema().options.map((option) => option.shape.type.value));
}
/**
 * 校验 hook 条目（对象、type 字段、已知类型），返回问题说明。
 */
//@ chunk-dcmhvw5a.js:59084-59640 placement
function validateHookEntry(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e)) {
    let a = describeValueType(e);
    return { problem: `Hook entry must be an object; received ${a}`, received: a, aboutType: !1 };
  }
  let r = e.type;
  if (typeof r !== "string") {
    let a = describeValueType(r);
    return {
      problem:
        r === void 0 ? 'Hook entry has no "type"' : `Hook entry "type" must be a string; received ${a}`,
      received: a,
      aboutType: !0,
    };
  }
  if (!n.has(r)) {
    let a = Mu(r);
    return { problem: `Unknown hook type "${a}"`, received: a, aboutType: !0 };
  }
  let safeParse = HookCommandSchema().safeParse(e);
  if (!safeParse.success)
    return { problem: `Invalid ${r} hook (${formatZodIssues(safeParse.error)})`, received: r, aboutType: !1 };
  return;
}
//@ chunk-dcmhvw5a.js:59640-59754 placement
function formatZodIssues(e) {
  return e.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
/**
 * 值是否像 hooks 匹配项：带 matcher 或 hooks 字段（非空数组，或带 type 的对象）；把事件名当键的对象不算。
 */
//@ chunk-dcmhvw5a.js:59754-60023 placement
function looksLikeHookMatcher(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return !1;
  if (!("matcher" in e) && Object.keys(e).some((r) => HOOK_EVENTS.includes(r))) return !1;
  let hooks = e.hooks;
  if (Array.isArray(hooks)) return hooks.length > 0;
  return !!hooks && typeof hooks === "object" && ("matcher" in e || typeof hooks.type === "string");
}
/**
 * 递归判断值里是否含 hooks 定义。
 */
//@ chunk-dcmhvw5a.js:60023-60480 placement
function containsHooks(
  e,
  n = 3,
  { matchersCount: r = !0, unscannedKeys: s = NO_SKIPPED_KEYS, inHooksList: a = !1 } = {},
) {
  if (hasGuardHooks(e)) return !0;
  if (r && looksLikeHookMatcher(e)) return !0;
  if (n === 0 || !e || typeof e !== "object") return !1;
  if (Array.isArray(e))
    return e.some((c) => containsHooks(c, n - 1, { matchersCount: r, unscannedKeys: s, inHooksList: a }));
  if (a && typeof e.type === "string") return !1;
  return Object.entries(e).some(
    ([c, g]) =>
      !s.has(c) &&
      containsHooks(g, n - 1, {
        unscannedKeys: s,
        matchersCount: r && !HOOK_EVENTS.includes(c),
        inHooksList: c === "hooks" && Array.isArray(g),
      }),
  );
}
/**
 * 对象除 hooks 键外是否还含 hooks 定义。
 */
//@ chunk-dcmhvw5a.js:60480-60680 placement
function hasNestedHooks(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return !1;
  return (
    hasGuardHooks(e) ||
    Object.entries(e).some(
      ([r, s]) =>
        r !== "hooks" &&
        !n.has(r) &&
        containsHooks(s, 3, { unscannedKeys: n, matchersCount: !HOOK_EVENTS.includes(r) }),
    )
  );
}
/**
 * 扫描 hooks 时跳过的键集合：设置中值为映射的键、插件清单中非 hooks 的键（含 experimental），以及空集合别名。
 */
//@ chunk-dcmhvw5a.js:60680-60948 placement
var NO_SKIPPED_KEYS = new Set(),
  OPAQUE_SETTING_KEYS = new Set([
    "mcpServers",
    "managedMcpServers",
    "lspServers",
    "pluginConfigs",
    "enabledPlugins",
    "extraKnownMarketplaces",
    "env",
    "skillOverrides",
    "modelSettings",
  ]),
  PLUGIN_NON_HOOK_KEYS = new Set(["metadata", "mcpServers", "lspServers"]),
  PLUGIN_SKIPPED_KEYS = new Set([...PLUGIN_NON_HOOK_KEYS, "experimental"]),
  SETTINGS_SKIPPED_KEYS = NO_SKIPPED_KEYS;
//@ chunk-dcmhvw5a.js:60948-61124 placement
function hasGuardHooks(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return !1;
  return Object.entries(e).some(
    ([n, r]) =>
      GUARD_HOOK_EVENTS.has(n) && r !== null && r !== void 0 && !(Array.isArray(r) && r.length === 0),
  );
}
/**
 * 是否含 PreToolUse/PermissionRequest hooks。
 */
//@ chunk-dcmhvw5a.js:61124-61339 placement
function hasGuardHooks_2(e) {
  if (looksLikeHookMatcher(e)) return !0;
  if (Array.isArray(e)) return e.some(hasGuardHooks_2);
  if (!e || typeof e !== "object") return !1;
  return Object.entries(e).some(
    ([n, r]) =>
      GUARD_HOOK_EVENTS.has(n) && r !== null && r !== void 0 && !(Array.isArray(r) && r.length === 0),
  );
}
/**
 * 守护型 hook 事件（PreToolUse、PermissionRequest）。
 */
//@ chunk-dcmhvw5a.js:61339-61390 placement
var GUARD_HOOK_EVENTS = new Set(["PreToolUse", "PermissionRequest"]);
/**
 * 剔除无效 hook 条目；守护型事件的无效条目记为无法加载的守护。
 */
//@ chunk-dcmhvw5a.js:61390-62508 placement
function stripInvalidHookEntries(e, n) {
  if (!Array.isArray(e)) return { stripped: [], unloadableGuards: [] };
  let r = GUARD_HOOK_EVENTS.has(n),
    s = qn(),
    a = HookMatcherSchema(),
    c = [],
    g = [];
  for (let m = e.length - 1; m >= 0; m--) {
    let f = e[m],
      h = (C, w) => {
        if (!r) e.splice(m, 1);
        c.push({ matcherIndex: m, hookIndex: void 0, path: `${m}`, problem: C, received: w, aboutType: !1 });
      };
    if (containsHooks(f, 3, { matchersCount: !1 })) {
      (r ? c : g).push({
        matcherIndex: m,
        hookIndex: void 0,
        path: `${m}`,
        problem: "holds PreToolUse/PermissionRequest hooks where a matcher was expected",
        received: describeValueType(f),
        aboutType: !1,
      });
      continue;
    }
    if (!f || typeof f !== "object" || Array.isArray(f)) {
      h(`Hook matcher must be an object; received ${describeValueType(f)}`, describeValueType(f));
      continue;
    }
    let hooks = f.hooks;
    if (!Array.isArray(hooks)) {
      h(
        `Hook matcher "hooks" must be an array of hook entries; received ${describeValueType(hooks)}`,
        describeValueType(hooks),
      );
      continue;
    }
    let b = [];
    for (let C = hooks.length - 1; C >= 0; C--) {
      let w = validateHookEntry(hooks[C], s);
      if (w !== void 0) {
        if (!r) hooks.splice(C, 1);
        b.push({ matcherIndex: m, hookIndex: C, path: `${m}.hooks.${C}`, ...w });
      }
    }
    let safeParse = a.safeParse(r ? { ...f, hooks: [] } : f);
    if (!safeParse.success) {
      h(`Invalid hook matcher (${formatZodIssues(safeParse.error)})`, "matcher");
      continue;
    }
    c.push(...b);
  }
  return (
    c.reverse(),
    g.reverse(),
    r ? { stripped: [], unloadableGuards: c } : { stripped: c, unloadableGuards: g }
  );
}
/**
 * hook 校验错误类。
 */
//@ chunk-dcmhvw5a.js:62508-62533 placement
class HookValidationError extends Error {}
/**
 * 守护型 hook 无法加载时的说明。
 */
//@ chunk-dcmhvw5a.js:62533-62724 placement
var UNLOADABLE_GUARD_NOTE =
  "a PreToolUse/PermissionRequest hook that cannot be loaded may be what guards the permissions declared beside it, so nothing it sits in is applied until the entry is fixed or removed";
/**
 * 校验 hooks 设置，返回提示与无法加载的守护列表。
 */
//@ chunk-dcmhvw5a.js:62724-63819 placement
function validateHooksSetting(e) {
  if (looksLikeHookMatcher(e) || (Array.isArray(e) && e.some(looksLikeHookMatcher)))
    return {
      notes: [],
      unloadableGuards: [
        `hooks: must be an object mapping event names to matcher arrays; received ${Array.isArray(e) ? "an array of matchers" : "a single matcher"}`,
      ],
    };
  if (!e || typeof e !== "object" || Array.isArray(e)) return { notes: [], unloadableGuards: [] };
  let n = e,
    r = new Set(HOOK_EVENTS),
    s = [],
    a = [];
  for (let [c, g] of Object.entries(n)) {
    let m = Mu(c);
    if (!r.has(c)) {
      if (containsHooks(g, 3, { matchersCount: !Array.isArray(g) })) {
        a.push(`hooks.${m}: not a hook event, but it holds PreToolUse/PermissionRequest hooks`);
        continue;
      }
      (delete n[c], s.push(`hooks.${m}: unknown hook event; entry ignored`));
      continue;
    }
    if (!Array.isArray(g)) {
      if ((GUARD_HOOK_EVENTS.has(c) && g !== null) || containsHooks(g, 3, { matchersCount: !1 })) {
        a.push(`hooks.${m}: must be an array of matchers; received ${describeValueType(g)}`);
        continue;
      }
      (delete n[c],
        s.push(`hooks.${m}: must be an array of matchers; received ${describeValueType(g)}; entry ignored`));
      continue;
    }
    let f = stripInvalidHookEntries(g, c);
    for (let h of f.stripped) s.push(`hooks.${m}.${h.path}: ${h.problem}; entry ignored`);
    for (let unloadableGuard of f.unloadableGuards)
      a.push(`hooks.${m}.${unloadableGuard.path}: ${unloadableGuard.problem}`);
  }
  return { notes: s, unloadableGuards: a };
}
/**
 * 解析 hooks 设置，返回合法 hooks、无效项与无法加载的守护。
 */
//@ chunk-dcmhvw5a.js:63819-65299 placement
function parseHooksSetting(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e))
    return {
      hooks: void 0,
      invalid: [
        {
          path: "hooks",
          reason: `must be an object mapping hook event names to matcher arrays; received ${describeValueType(e)}`,
        },
      ],
      unloadableGuards: Array.isArray(e) && e.some(looksLikeHookMatcher) ? ["hooks"] : [],
    };
  if (looksLikeHookMatcher(e))
    return {
      hooks: void 0,
      invalid: [
        {
          path: "hooks",
          reason: "must be an object mapping hook event names to matcher arrays; received a single matcher",
        },
      ],
      unloadableGuards: ["hooks"],
    };
  let n = new Set(HOOK_EVENTS),
    r = A(HookMatcherSchema()),
    mapped = Object.entries(e).map(([c, g]) => {
      if (!n.has(c))
        return {
          invalid: {
            path: `hooks.${c}`,
            reason: `unknown hook event. Valid events: ${HOOK_EVENTS.join(", ")}`,
          },
        };
      let { stripped: stripped, unloadableGuards: unloadableGuards } = stripInvalidHookEntries(g, c);
      if (unloadableGuards.length > 0)
        return {
          invalid: {
            path: `hooks.${c}`,
            reason: `${unloadableGuards.map((S) => `${S.path}: ${S.problem}`).join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
          },
          unloadableGuard: !0,
        };
      let mapped = stripped.map((S) => `${S.path}: ${S.problem}; entry ignored`),
        safeParse = r.safeParse(g);
      if (safeParse.success) {
        let S = mapped.length > 0 && { invalid: { path: `hooks.${c}`, reason: mapped.join("; ") } };
        if (S && !safeParse.data.some((C) => C.hooks.length > 0)) return { ...S };
        return { entry: [c, safeParse.data], ...S };
      }
      let b = Array.isArray(g)
        ? [...mapped, formatZodIssues(safeParse.error)].join("; ")
        : `must be an array of matchers; received ${describeValueType(g)}`;
      return {
        invalid: { path: `hooks.${c}`, reason: b },
        ...(GUARD_HOOK_EVENTS.has(c) && g !== null && !Array.isArray(g) && { unloadableGuard: !0 }),
      };
    }),
    flattened = mapped.flatMap((c) => (c.entry ? [c.entry] : []));
  return {
    hooks: flattened.length > 0 ? Object.fromEntries(flattened) : void 0,
    invalid: mapped.flatMap((c) => (c.invalid ? [c.invalid] : [])),
    unloadableGuards: mapped.flatMap((c) => (c.unloadableGuard && c.invalid ? [c.invalid.path] : [])),
  };
}
//@ chunk-dcmhvw5a.js:65299-65445 placement
function describeValueType(e) {
  if (e === null || e === void 0) return String(e);
  if (Array.isArray(e)) return "an array";
  let n = typeof e;
  return `${n === "object" ? "an" : "a"} ${n}`;
}
//@ chunk-dcmhvw5a.js:65445-65490 placement
function isUnparsableServerName(e) {
  return mcpInfoFromString(`${getMcpPrefix(e)}t`) === null;
}
/**
 * 键名是否为 Object.prototype 上的名字。
 */
//@ chunk-dcmhvw5a.js:65490-65541 placement
function isPrototypeKey(e) {
  return e in Object.prototype && isUnparsableServerName(e);
}
//@ chunk-dcmhvw5a.js:65541-65746 placement
var SERVER_NAME_RULE_MESSAGE =
  "server names may only contain letters, numbers, hyphens and underscores, and may not be constructor, prototype, __proto__, __defineGetter__, __defineSetter__, __lookupGetter__ or __lookupSetter__";

export {
  isPrototypeKey,
  hasNestedHooks,
  PLUGIN_NON_HOOK_KEYS,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
  SERVER_NAME_RULE_MESSAGE,
  SETTINGS_SKIPPED_KEYS,
  looksLikeHookMatcher,
  HookValidationError,
  GUARD_HOOK_EVENTS,
  hasGuardHooks_2,
  parseHooksSetting,
  OPAQUE_SETTING_KEYS,
  containsHooks,
  stripInvalidHookEntries,
  qn,
  PLUGIN_SKIPPED_KEYS,
  checkHookCommandExpansion,
};
