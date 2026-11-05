/**
 * schemas/hookEntryValidation.ts
 *
 * 2.1.316 新增：解析 hooks 设置，返回合法 hooks、无效项与无法加载的守护；剔除无效 hook 条目；守护型事件的无效条目记为无法加载的守护等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (20)
 * attribution: placement 20
 */
import { getPlatform } from "../utils/platform.js";
import { HookCommandSchema, HookMatcherSchema } from "./hooks.js";
import { escapeControlCharsForDisplay } from "../utils/stringUtils.js";
import { HOOK_EVENTS } from "../entrypoints/sdk/coreSchemas.js";
import { array } from "../../vendor/zod/v4/classic/schemas.js";
import { mcpInfoFromString, getMcpPrefix } from "../services/mcp/mcpStringUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:57955-59069 placement
/**
 * 检查 hook 命令只用允许的变量展开。
 */
function checkHookCommandExpansion(command) {
  if (
    /\$(?!\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\})/.test(command) ||
    command.includes("`") ||
    /%[A-Za-z_][A-Za-z0-9_]*%/.test(command)
  )
    return "Only ${CLAUDE_PROJECT_DIR}, ${CLAUDE_PLUGIN_ROOT} and ${CLAUDE_PLUGIN_DATA} are expanded in `file` (no shell runs); any other $\u2026, backtick or %NAME% is not expanded";
  let looksWindows = /^[a-zA-Z]:/.test(command) || command.includes("\\");
  if (
    getPlatform() === "windows"
      ? /^[\\/](?![\\/])/.test(command) || /^[a-zA-Z]:(?![\\/])/.test(command)
      : looksWindows
  )
    return getPlatform() === "windows"
      ? "`file` is drive-relative on Windows (\\path or C:path); use a drive-absolute path, ~/ or a ${CLAUDE_\u2026} placeholder"
      : "`file` is a Windows path (C:\u2026 or \\\u2026) read on another platform; use ~/, a ${CLAUDE_\u2026} placeholder or a relative path so the hook resolves everywhere";
  if (command.startsWith("~") && command !== "~" && !/^~[\\/]/.test(command))
    return "`file` starting with ~name is not expanded; use an absolute path or ~/";
  if (
    command.trim() === "" ||
    command === "." ||
    command === ".." ||
    command === "~" ||
    /[\\/]$/.test(command) ||
    /[\\/]\.{1,2}$/.test(command) ||
    /^\$\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\}$/.test(command)
  )
    return "`file` must name a script file, not a directory or an empty path";
  return;
}
//@ chunk-z20c443b.js:59069-59142 placement
function knownHookTypes() {
  return new Set(HookCommandSchema().options.map((option) => option.shape.type.value));
}
//@ chunk-z20c443b.js:59142-59698 placement
/**
 * 校验 hook 条目（对象、type 字段、已知类型），返回问题说明。
 */
function validateHookEntry(entry, eventName) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    let typeName = describeValueType(entry);
    return {
      problem: `Hook entry must be an object; received ${typeName}`,
      received: typeName,
      aboutType: false,
    };
  }
  let type = entry.type;
  if (typeof type !== "string") {
    let typeName = describeValueType(type);
    return {
      problem:
        type === undefined
          ? 'Hook entry has no "type"'
          : `Hook entry "type" must be a string; received ${typeName}`,
      received: typeName,
      aboutType: true,
    };
  }
  if (!eventName.has(type)) {
    let displayType = escapeControlCharsForDisplay(type);
    return {
      problem: `Unknown hook type "${displayType}"`,
      received: displayType,
      aboutType: true,
    };
  }
  let parsed = HookCommandSchema().safeParse(entry);
  if (!parsed.success)
    return {
      problem: `Invalid ${type} hook (${formatZodIssues(parsed.error)})`,
      received: type,
      aboutType: false,
    };
  return;
}
//@ chunk-z20c443b.js:59698-59812 placement
function formatZodIssues(error) {
  return error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
//@ chunk-z20c443b.js:59812-60081 placement
/**
 * 值是否像 hooks 匹配项：带 matcher 或 hooks 字段（非空数组，或带 type 的对象）；把事件名当键的对象不算。
 */
function looksLikeHookMatcher(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!("matcher" in value) && Object.keys(value).some((key) => HOOK_EVENTS.includes(key))) return false;
  let hooks = value.hooks;
  if (Array.isArray(hooks)) return hooks.length > 0;
  return !!hooks && typeof hooks === "object" && ("matcher" in value || typeof hooks.type === "string");
}
//@ chunk-z20c443b.js:60081-60538 placement
/**
 * 递归判断值里是否含 hooks 定义。
 */
function containsHooks(
  value,
  depth = 3,
  { matchersCount = true, unscannedKeys = NO_SKIPPED_KEYS, inHooksList = false } = {},
) {
  if (hasGuardHooks(value)) return true;
  if (matchersCount && looksLikeHookMatcher(value)) return true;
  if (depth === 0 || !value || typeof value !== "object") return false;
  if (Array.isArray(value))
    return value.some((item) =>
      containsHooks(item, depth - 1, {
        matchersCount,
        unscannedKeys,
        inHooksList,
      }),
    );
  if (inHooksList && typeof value.type === "string") return false;
  return Object.entries(value).some(
    ([key, value]) =>
      !unscannedKeys.has(key) &&
      containsHooks(value, depth - 1, {
        unscannedKeys,
        matchersCount: matchersCount && !HOOK_EVENTS.includes(key),
        inHooksList: key === "hooks" && Array.isArray(value),
      }),
  );
}
//@ chunk-z20c443b.js:60538-60738 placement
/**
 * 对象除 hooks 键外是否还含 hooks 定义。
 */
function hasNestedHooks(value, skippedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    hasGuardHooks(value) ||
    Object.entries(value).some(
      ([key, value]) =>
        key !== "hooks" &&
        !skippedKeys.has(key) &&
        containsHooks(value, 3, {
          unscannedKeys: skippedKeys,
          matchersCount: !HOOK_EVENTS.includes(key),
        }),
    )
  );
}
//@ chunk-z20c443b.js:60738-61006 placement
/**
 * 扫描 hooks 时跳过的键集合：设置中值为映射的键、插件清单中非 hooks 的键（含 experimental），以及空集合别名。
 */
var NO_SKIPPED_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OPAQUE_SETTING_KEYS;
var PLUGIN_NON_HOOK_KEYS;
var PLUGIN_SKIPPED_KEYS;
var SETTINGS_SKIPPED_KEYS;
deferInit("chunk-z20c443b.js:60738", () => {
  NO_SKIPPED_KEYS = new Set();
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
  ]);
  PLUGIN_NON_HOOK_KEYS = new Set(["metadata", "mcpServers", "lspServers"]);
  PLUGIN_SKIPPED_KEYS = new Set([...PLUGIN_NON_HOOK_KEYS, "experimental"]);
  SETTINGS_SKIPPED_KEYS = NO_SKIPPED_KEYS;
});
//@ chunk-z20c443b.js:61006-61182 placement
function hasGuardHooks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).some(
    ([key, value]) =>
      GUARD_HOOK_EVENTS.has(key) &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0),
  );
}
//@ chunk-z20c443b.js:61182-61397 placement
/**
 * 是否含 PreToolUse/PermissionRequest hooks。
 */
function hasGuardHooks_2(value) {
  if (looksLikeHookMatcher(value)) return true;
  if (Array.isArray(value)) return value.some(hasGuardHooks_2);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, value]) =>
      GUARD_HOOK_EVENTS.has(key) &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0),
  );
}
//@ chunk-z20c443b.js:61397-61448 placement
/**
 * 守护型 hook 事件（PreToolUse、PermissionRequest）。
 */
var GUARD_HOOK_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:61397", () => {
  GUARD_HOOK_EVENTS = new Set(["PreToolUse", "PermissionRequest"]);
});
//@ chunk-z20c443b.js:61448-62566 placement
/**
 * 剔除无效 hook 条目；守护型事件的无效条目记为无法加载的守护。
 */
function stripInvalidHookEntries(entries, eventName) {
  if (!Array.isArray(entries))
    return {
      stripped: [],
      unloadableGuards: [],
    };
  let isGuardEvent = GUARD_HOOK_EVENTS.has(eventName);
  let knownTypes = knownHookTypes();
  let matcherSchema = HookMatcherSchema();
  let stripped = [];
  let unloadableGuards = [];
  for (let j = entries.length - 1; j >= 0; j--) {
    let entry = entries[j];
    let report = (problem, received) => {
      if (!isGuardEvent) entries.splice(j, 1);
      stripped.push({
        matcherIndex: j,
        hookIndex: undefined,
        path: `${j}`,
        problem,
        received,
        aboutType: false,
      });
    };
    if (
      containsHooks(entry, 3, {
        matchersCount: false,
      })
    ) {
      (isGuardEvent ? stripped : unloadableGuards).push({
        matcherIndex: j,
        hookIndex: undefined,
        path: `${j}`,
        problem: "holds PreToolUse/PermissionRequest hooks where a matcher was expected",
        received: describeValueType(entry),
        aboutType: false,
      });
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      report(
        `Hook matcher must be an object; received ${describeValueType(entry)}`,
        describeValueType(entry),
      );
      continue;
    }
    let hooks = entry.hooks;
    if (!Array.isArray(hooks)) {
      report(
        `Hook matcher "hooks" must be an array of hook entries; received ${describeValueType(hooks)}`,
        describeValueType(hooks),
      );
      continue;
    }
    let problems = [];
    for (let j_2 = hooks.length - 1; j_2 >= 0; j_2--) {
      let problem = validateHookEntry(hooks[j_2], knownTypes);
      if (problem !== undefined) {
        if (!isGuardEvent) hooks.splice(j_2, 1);
        problems.push({
          matcherIndex: j,
          hookIndex: j_2,
          path: `${j}.hooks.${j_2}`,
          ...problem,
        });
      }
    }
    let parsed = matcherSchema.safeParse(
      isGuardEvent
        ? {
            ...entry,
            hooks: [],
          }
        : entry,
    );
    if (!parsed.success) {
      report(`Invalid hook matcher (${formatZodIssues(parsed.error)})`, "matcher");
      continue;
    }
    stripped.push(...problems);
  }
  stripped.reverse();
  unloadableGuards.reverse();
  return isGuardEvent
    ? {
        stripped: [],
        unloadableGuards: stripped,
      }
    : {
        stripped,
        unloadableGuards,
      };
}
//@ chunk-z20c443b.js:62566-62591 placement
/**
 * hook 校验错误类。
 */
class HookValidationError extends Error {}
//@ chunk-z20c443b.js:62591-62782 placement
/**
 * 守护型 hook 无法加载时的说明。
 */
var UNLOADABLE_GUARD_NOTE =
  "a PreToolUse/PermissionRequest hook that cannot be loaded may be what guards the permissions declared beside it, so nothing it sits in is applied until the entry is fixed or removed";
//@ chunk-z20c443b.js:62782-63877 placement
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
  let hooksMap = hooks;
  let eventSet = new Set(HOOK_EVENTS);
  let notes = [];
  let notes_2 = [];
  for (let [key, value] of Object.entries(hooksMap)) {
    let displayKey = escapeControlCharsForDisplay(key);
    if (!eventSet.has(key)) {
      if (
        containsHooks(value, 3, {
          matchersCount: !Array.isArray(value),
        })
      ) {
        notes_2.push(
          `hooks.${displayKey}: not a hook event, but it holds PreToolUse/PermissionRequest hooks`,
        );
        continue;
      }
      delete hooksMap[key];
      notes.push(`hooks.${displayKey}: unknown hook event; entry ignored`);
      continue;
    }
    if (!Array.isArray(value)) {
      if (
        (GUARD_HOOK_EVENTS.has(key) && value !== null) ||
        containsHooks(value, 3, {
          matchersCount: false,
        })
      ) {
        notes_2.push(
          `hooks.${displayKey}: must be an array of matchers; received ${describeValueType(value)}`,
        );
        continue;
      }
      delete hooksMap[key];
      notes.push(
        `hooks.${displayKey}: must be an array of matchers; received ${describeValueType(value)}; entry ignored`,
      );
      continue;
    }
    let stripped = stripInvalidHookEntries(value, key);
    for (let entry of stripped.stripped)
      notes.push(`hooks.${displayKey}.${entry.path}: ${entry.problem}; entry ignored`);
    for (let unloadableGuard of stripped.unloadableGuards)
      notes_2.push(`hooks.${displayKey}.${unloadableGuard.path}: ${unloadableGuard.problem}`);
  }
  return {
    notes,
    unloadableGuards: notes_2,
  };
}
//@ chunk-z20c443b.js:63877-65357 placement
/**
 * 解析 hooks 设置，返回合法 hooks、无效项与无法加载的守护。
 */
function parseHooksSetting(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {
      hooks: undefined,
      invalid: [
        {
          path: "hooks",
          reason: `must be an object mapping hook event names to matcher arrays; received ${describeValueType(value)}`,
        },
      ],
      unloadableGuards: Array.isArray(value) && value.some(looksLikeHookMatcher) ? ["hooks"] : [],
    };
  if (looksLikeHookMatcher(value))
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
  let knownEvents = new Set(HOOK_EVENTS);
  let matcherArraySchema = array(HookMatcherSchema());
  let mapped = Object.entries(value).map(([key, value]) => {
    if (!knownEvents.has(key))
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
    let mapped = stripped.map((problem) => `${problem.path}: ${problem.problem}; entry ignored`);
    let parsed = matcherArraySchema.safeParse(value);
    if (parsed.success) {
      let strippedNote = mapped.length > 0 && {
        invalid: {
          path: `hooks.${key}`,
          reason: mapped.join("; "),
        },
      };
      if (strippedNote && !parsed.data.some((matcher) => matcher.hooks.length > 0))
        return {
          ...strippedNote,
        };
      return {
        entry: [key, parsed.data],
        ...strippedNote,
      };
    }
    let reason = Array.isArray(value)
      ? [...mapped, formatZodIssues(parsed.error)].join("; ")
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
  let flattened = mapped.flatMap((result) => (result.entry ? [result.entry] : []));
  return {
    hooks: flattened.length > 0 ? Object.fromEntries(flattened) : undefined,
    invalid: mapped.flatMap((result) => (result.invalid ? [result.invalid] : [])),
    unloadableGuards: mapped.flatMap((result) =>
      result.unloadableGuard && result.invalid ? [result.invalid.path] : [],
    ),
  };
}
//@ chunk-z20c443b.js:65357-65503 placement
function describeValueType(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return "an array";
  let typeName = typeof value;
  return `${typeName === "object" ? "an" : "a"} ${typeName}`;
}
//@ chunk-z20c443b.js:65503-65548 placement
function isUnparsableServerName(name) {
  return mcpInfoFromString(`${getMcpPrefix(name)}t`) === null;
}
//@ chunk-z20c443b.js:65548-65599 placement
/**
 * 键名是否为 Object.prototype 上的名字。
 */
function isPrototypeKey(key) {
  return key in Object.prototype && isUnparsableServerName(key);
}
//@ chunk-z20c443b.js:65599-65804 placement
var SERVER_NAME_RULE_MESSAGE =
  "server names may only contain letters, numbers, hyphens and underscores, and may not be constructor, prototype, __proto__, __defineGetter__, __defineSetter__, __lookupGetter__ or __lookupSetter__";
export {
  isPrototypeKey,
  hasNestedHooks,
  SETTINGS_SKIPPED_KEYS,
  looksLikeHookMatcher,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
  HookValidationError,
  GUARD_HOOK_EVENTS,
  hasGuardHooks_2,
  parseHooksSetting,
  SERVER_NAME_RULE_MESSAGE,
  PLUGIN_SKIPPED_KEYS,
  PLUGIN_NON_HOOK_KEYS,
  containsHooks,
  checkHookCommandExpansion,
  OPAQUE_SETTING_KEYS,
  stripInvalidHookEntries,
  knownHookTypes,
};
