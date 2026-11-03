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
import { escapeControlCharsForDisplay } from "../utils/stringUtils.js";
import { HOOK_EVENTS } from "../entrypoints/sdk/coreSchemas.js";
import { array } from "../../vendor/zod/v4/classic/schemas.js";
import { mcpInfoFromString, getMcpPrefix } from "../services/mcp/mcpStringUtils.js";

//@ chunk-dcmhvw5a.js:57897-59011 placement
/**
 * 检查 hook 命令只用允许的变量展开。
 */
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
function knownHookTypes() {
  return new Set(HookCommandSchema().options.map((option) => option.shape.type.value));
}
//@ chunk-dcmhvw5a.js:59084-59640 placement
/**
 * 校验 hook 条目（对象、type 字段、已知类型），返回问题说明。
 */
function validateHookEntry(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e)) {
    let a = describeValueType(e);
    return {
      problem: `Hook entry must be an object; received ${a}`,
      received: a,
      aboutType: false,
    };
  }
  let r = e.type;
  if (typeof r !== "string") {
    let a = describeValueType(r);
    return {
      problem:
        r === undefined ? 'Hook entry has no "type"' : `Hook entry "type" must be a string; received ${a}`,
      received: a,
      aboutType: true,
    };
  }
  if (!n.has(r)) {
    let a = escapeControlCharsForDisplay(r);
    return {
      problem: `Unknown hook type "${a}"`,
      received: a,
      aboutType: true,
    };
  }
  let s = HookCommandSchema().safeParse(e);
  if (!s.success)
    return {
      problem: `Invalid ${r} hook (${formatZodIssues(s.error)})`,
      received: r,
      aboutType: false,
    };
  return;
}
//@ chunk-dcmhvw5a.js:59640-59754 placement
function formatZodIssues(error) {
  return error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
//@ chunk-dcmhvw5a.js:59754-60023 placement
/**
 * 值是否像 hooks 匹配项：带 matcher 或 hooks 字段（非空数组，或带 type 的对象）；把事件名当键的对象不算。
 */
function looksLikeHookMatcher(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return false;
  if (!("matcher" in e) && Object.keys(e).some((key) => HOOK_EVENTS.includes(key))) return false;
  let hooks = e.hooks;
  if (Array.isArray(hooks)) return hooks.length > 0;
  return !!hooks && typeof hooks === "object" && ("matcher" in e || typeof hooks.type === "string");
}
//@ chunk-dcmhvw5a.js:60023-60480 placement
/**
 * 递归判断值里是否含 hooks 定义。
 */
function containsHooks(
  e,
  n = 3,
  { matchersCount: r = true, unscannedKeys: s = NO_SKIPPED_KEYS, inHooksList: a = false } = {},
) {
  if (hasGuardHooks(e)) return true;
  if (r && looksLikeHookMatcher(e)) return true;
  if (n === 0 || !e || typeof e !== "object") return false;
  if (Array.isArray(e))
    return e.some((c) =>
      containsHooks(c, n - 1, {
        matchersCount: r,
        unscannedKeys: s,
        inHooksList: a,
      }),
    );
  if (a && typeof e.type === "string") return false;
  return Object.entries(e).some(
    ([key, value]) =>
      !s.has(key) &&
      containsHooks(value, n - 1, {
        unscannedKeys: s,
        matchersCount: r && !HOOK_EVENTS.includes(key),
        inHooksList: key === "hooks" && Array.isArray(value),
      }),
  );
}
//@ chunk-dcmhvw5a.js:60480-60680 placement
/**
 * 对象除 hooks 键外是否还含 hooks 定义。
 */
function hasNestedHooks(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return false;
  return (
    hasGuardHooks(e) ||
    Object.entries(e).some(
      ([key, value]) =>
        key !== "hooks" &&
        !n.has(key) &&
        containsHooks(value, 3, {
          unscannedKeys: n,
          matchersCount: !HOOK_EVENTS.includes(key),
        }),
    )
  );
}
//@ chunk-dcmhvw5a.js:60680-60948 placement
/**
 * 扫描 hooks 时跳过的键集合：设置中值为映射的键、插件清单中非 hooks 的键（含 experimental），以及空集合别名。
 */
var NO_SKIPPED_KEYS = new Set();
var OPAQUE_SETTING_KEYS = new Set([
  "mcpServers",
  "managedMcpServers",
  "lspServers",
  "pluginConfigs",
  "enabledPlugins",
  "extraKnownMarketplaces",
  "env",
  "skillOverrides",
  "modelSettings",
]);
var PLUGIN_NON_HOOK_KEYS = new Set(["metadata", "mcpServers", "lspServers"]);
var PLUGIN_SKIPPED_KEYS = new Set([...PLUGIN_NON_HOOK_KEYS, "experimental"]);
var SETTINGS_SKIPPED_KEYS = NO_SKIPPED_KEYS;
//@ chunk-dcmhvw5a.js:60948-61124 placement
function hasGuardHooks(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return false;
  return Object.entries(e).some(
    ([key, value]) =>
      GUARD_HOOK_EVENTS.has(key) &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0),
  );
}
//@ chunk-dcmhvw5a.js:61124-61339 placement
/**
 * 是否含 PreToolUse/PermissionRequest hooks。
 */
function hasGuardHooks_2(e) {
  if (looksLikeHookMatcher(e)) return true;
  if (Array.isArray(e)) return e.some(hasGuardHooks_2);
  if (!e || typeof e !== "object") return false;
  return Object.entries(e).some(
    ([key, value]) =>
      GUARD_HOOK_EVENTS.has(key) &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0),
  );
}
//@ chunk-dcmhvw5a.js:61339-61390 placement
/**
 * 守护型 hook 事件（PreToolUse、PermissionRequest）。
 */
var GUARD_HOOK_EVENTS = new Set(["PreToolUse", "PermissionRequest"]);
//@ chunk-dcmhvw5a.js:61390-62508 placement
/**
 * 剔除无效 hook 条目；守护型事件的无效条目记为无法加载的守护。
 */
function stripInvalidHookEntries(e, n) {
  if (!Array.isArray(e))
    return {
      stripped: [],
      unloadableGuards: [],
    };
  let r = GUARD_HOOK_EVENTS.has(n);
  let s = knownHookTypes();
  let a = HookMatcherSchema();
  let c = [];
  let g = [];
  for (let j = e.length - 1; j >= 0; j--) {
    let f = e[j];
    let h = (problem, received) => {
      if (!r) e.splice(j, 1);
      c.push({
        matcherIndex: j,
        hookIndex: undefined,
        path: `${j}`,
        problem,
        received,
        aboutType: false,
      });
    };
    if (
      containsHooks(f, 3, {
        matchersCount: false,
      })
    ) {
      (r ? c : g).push({
        matcherIndex: j,
        hookIndex: undefined,
        path: `${j}`,
        problem: "holds PreToolUse/PermissionRequest hooks where a matcher was expected",
        received: describeValueType(f),
        aboutType: false,
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
    for (let j_2 = hooks.length - 1; j_2 >= 0; j_2--) {
      let w = validateHookEntry(hooks[j_2], s);
      if (w !== undefined) {
        if (!r) hooks.splice(j_2, 1);
        b.push({
          matcherIndex: j,
          hookIndex: j_2,
          path: `${j}.hooks.${j_2}`,
          ...w,
        });
      }
    }
    let S = a.safeParse(
      r
        ? {
            ...f,
            hooks: [],
          }
        : f,
    );
    if (!S.success) {
      h(`Invalid hook matcher (${formatZodIssues(S.error)})`, "matcher");
      continue;
    }
    c.push(...b);
  }
  c.reverse();
  g.reverse();
  return r
    ? {
        stripped: [],
        unloadableGuards: c,
      }
    : {
        stripped: c,
        unloadableGuards: g,
      };
}
//@ chunk-dcmhvw5a.js:62508-62533 placement
/**
 * hook 校验错误类。
 */
class HookValidationError extends Error {}
//@ chunk-dcmhvw5a.js:62533-62724 placement
/**
 * 守护型 hook 无法加载时的说明。
 */
var UNLOADABLE_GUARD_NOTE =
  "a PreToolUse/PermissionRequest hook that cannot be loaded may be what guards the permissions declared beside it, so nothing it sits in is applied until the entry is fixed or removed";
//@ chunk-dcmhvw5a.js:62724-63819 placement
/**
 * 校验 hooks 设置，返回提示与无法加载的守护列表。
 */
function validateHooksSetting(hooks) {
  if (looksLikeHookMatcher(hooks) || (Array.isArray(hooks) && hooks.some(looksLikeHookMatcher)))
    return {
      notes: [],
      unloadableGuards: [
        `hooks: must be an object mapping event names to matcher arrays; received ${Array.isArray(hooks) ? "an array of matchers" : "a single matcher"}`,
      ],
    };
  if (!hooks || typeof hooks !== "object" || Array.isArray(hooks))
    return {
      notes: [],
      unloadableGuards: [],
    };
  let n = hooks;
  let r = new Set(HOOK_EVENTS);
  let s = [];
  let a = [];
  for (let [key, value] of Object.entries(n)) {
    let m = escapeControlCharsForDisplay(key);
    if (!r.has(key)) {
      if (
        containsHooks(value, 3, {
          matchersCount: !Array.isArray(value),
        })
      ) {
        a.push(`hooks.${m}: not a hook event, but it holds PreToolUse/PermissionRequest hooks`);
        continue;
      }
      delete n[key];
      s.push(`hooks.${m}: unknown hook event; entry ignored`);
      continue;
    }
    if (!Array.isArray(value)) {
      if (
        (GUARD_HOOK_EVENTS.has(key) && value !== null) ||
        containsHooks(value, 3, {
          matchersCount: false,
        })
      ) {
        a.push(`hooks.${m}: must be an array of matchers; received ${describeValueType(value)}`);
        continue;
      }
      delete n[key];
      s.push(`hooks.${m}: must be an array of matchers; received ${describeValueType(value)}; entry ignored`);
      continue;
    }
    let f = stripInvalidHookEntries(value, key);
    for (let h of f.stripped) s.push(`hooks.${m}.${h.path}: ${h.problem}; entry ignored`);
    for (let unloadableGuard of f.unloadableGuards)
      a.push(`hooks.${m}.${unloadableGuard.path}: ${unloadableGuard.problem}`);
  }
  return {
    notes: s,
    unloadableGuards: a,
  };
}
//@ chunk-dcmhvw5a.js:63819-65299 placement
/**
 * 解析 hooks 设置，返回合法 hooks、无效项与无法加载的守护。
 */
function parseHooksSetting(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e))
    return {
      hooks: undefined,
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
      hooks: undefined,
      invalid: [
        {
          path: "hooks",
          reason: "must be an object mapping hook event names to matcher arrays; received a single matcher",
        },
      ],
      unloadableGuards: ["hooks"],
    };
  let n = new Set(HOOK_EVENTS);
  let r = array(HookMatcherSchema());
  let mapped = Object.entries(e).map(([key, value]) => {
    if (!n.has(key))
      return {
        invalid: {
          path: `hooks.${key}`,
          reason: `unknown hook event. Valid events: ${HOOK_EVENTS.join(", ")}`,
        },
      };
    let { stripped, unloadableGuards } = stripInvalidHookEntries(value, key);
    if (unloadableGuards.length > 0)
      return {
        invalid: {
          path: `hooks.${key}`,
          reason: `${unloadableGuards.map((unloadableGuard) => `${unloadableGuard.path}: ${unloadableGuard.problem}`).join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        },
        unloadableGuard: true,
      };
    let mapped = stripped.map((S) => `${S.path}: ${S.problem}; entry ignored`);
    let y = r.safeParse(value);
    if (y.success) {
      let S = mapped.length > 0 && {
        invalid: {
          path: `hooks.${key}`,
          reason: mapped.join("; "),
        },
      };
      if (S && !y.data.some((C) => C.hooks.length > 0))
        return {
          ...S,
        };
      return {
        entry: [key, y.data],
        ...S,
      };
    }
    let reason = Array.isArray(value)
      ? [...mapped, formatZodIssues(y.error)].join("; ")
      : `must be an array of matchers; received ${describeValueType(value)}`;
    return {
      invalid: {
        path: `hooks.${key}`,
        reason,
      },
      ...(GUARD_HOOK_EVENTS.has(key) &&
        value !== null &&
        !Array.isArray(value) && {
          unloadableGuard: true,
        }),
    };
  });
  let flattened = mapped.flatMap((c) => (c.entry ? [c.entry] : []));
  return {
    hooks: flattened.length > 0 ? Object.fromEntries(flattened) : undefined,
    invalid: mapped.flatMap((c) => (c.invalid ? [c.invalid] : [])),
    unloadableGuards: mapped.flatMap((c) => (c.unloadableGuard && c.invalid ? [c.invalid.path] : [])),
  };
}
//@ chunk-dcmhvw5a.js:65299-65445 placement
function describeValueType(e) {
  if (e === null || e === undefined) return String(e);
  if (Array.isArray(e)) return "an array";
  let n = typeof e;
  return `${n === "object" ? "an" : "a"} ${n}`;
}
//@ chunk-dcmhvw5a.js:65445-65490 placement
function isUnparsableServerName(e) {
  return mcpInfoFromString(`${getMcpPrefix(e)}t`) === null;
}
//@ chunk-dcmhvw5a.js:65490-65541 placement
/**
 * 键名是否为 Object.prototype 上的名字。
 */
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
  knownHookTypes,
  PLUGIN_SKIPPED_KEYS,
  checkHookCommandExpansion,
};
