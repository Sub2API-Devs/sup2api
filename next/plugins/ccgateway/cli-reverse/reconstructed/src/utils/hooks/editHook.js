/**
 * utils/hooks/editHook.ts
 *
 * 2.1.316 新增。编辑 settings 中的 hooks（edit_hook）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-azbt01vf.js (22)
 * attribution: placement 22
 */
import { HookCommandSchema } from "../../schemas/hooks.js";
import { EDITABLE_SETTING_SOURCES, isSettingSourceEnabled } from "../settings/constants.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import {
  getSettingsForSource,
  updateSettingsForSourceWithTransform,
  getSettingsForSourceWriteSeed,
  getSettingsFilePathForSource,
  parseSettingsFile,
  getLegacyLocalSettingsFilePath,
  settleBackgroundSettingsWork,
} from "../settings/settings.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { policySettingsUnreadable } from "./hooksConfigSnapshot.js";
import { redactHttpHeaderValues } from "./hookSourceDisplay.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sanitizeTelemetryString } from "../sanitization.js";

//@ chunk-azbt01vf.js:4004-4052 placement
var EDIT_HOOK_OPERATIONS = ["add", "replace", "remove"];
var MAX_EDIT_FIELD_CHARS = 1e4;
var MAX_EDIT_PAYLOAD_CHARS = 262144;
//@ chunk-azbt01vf.js:4052-4122 placement
function isPlainObjectLike(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-azbt01vf.js:4122-4177 placement
var FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
//@ chunk-azbt01vf.js:4177-4297 placement
function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isPlainObjectLike(value)) return false;
  return Object.keys(value).some((key) => FORBIDDEN_OBJECT_KEYS.has(key) || hasForbiddenKey(value[key]));
}
//@ chunk-azbt01vf.js:4297-4762 placement
/**
 * 校验 edit_hook 的命令对象：必须是对象、不含禁用键、大小受限。
 */
function validateEditHookCommand(hook, label) {
  if (!isPlainObjectLike(hook))
    return {
      ok: false,
      error: `edit_hook: ${label} must be an object`,
    };
  if (hasForbiddenKey(hook))
    return {
      ok: false,
      error: `edit_hook: ${label} has a key that is not allowed`,
    };
  if (JSON.stringify(hook).length > MAX_EDIT_PAYLOAD_CHARS)
    return {
      ok: false,
      error: `edit_hook: ${label} is too large`,
    };
  let parsed = HookCommandSchema().safeParse(hook);
  if (!parsed.success) {
    let issue = parsed.error.issues[0];
    let at = issue && issue.path.length > 0 ? ` (${issue.path.join(".")})` : "";
    return {
      ok: false,
      error: `edit_hook: ${label} is not a valid hook${at}: ${issue?.message ?? "invalid"}`,
    };
  }
  return {
    ok: true,
    hook: parsed.data,
  };
}
//@ chunk-azbt01vf.js:4762-5056 placement
function validateEditHookMatcher(matcher, label) {
  if (matcher === undefined || matcher === null)
    return {
      ok: true,
      matcher: "",
    };
  if (typeof matcher !== "string")
    return {
      ok: false,
      error: `edit_hook: ${label} must be a string`,
    };
  if (matcher.length > MAX_EDIT_FIELD_CHARS)
    return {
      ok: false,
      error: `edit_hook: ${label} is too long`,
    };
  if (matcher in {})
    return {
      ok: false,
      error: `edit_hook: ${label} is not allowed`,
    };
  return {
    ok: true,
    matcher,
  };
}
//@ chunk-azbt01vf.js:5056-6081 placement
function validateEditHookRequest(request) {
  let op = request.op;
  if (typeof op !== "string" || !EDIT_HOOK_OPERATIONS.includes(op))
    return {
      ok: false,
      error: "edit_hook: op must be add, replace, or remove",
    };
  let source = request.source;
  if (typeof source !== "string" || !EDITABLE_SETTING_SOURCES.includes(source))
    return {
      ok: false,
      error: "edit_hook: source must be userSettings, projectSettings, or localSettings",
    };
  let event = request.event;
  if (typeof event !== "string" || !HOOK_EVENTS.includes(event))
    return {
      ok: false,
      error: "edit_hook: event is not a known hook event",
    };
  let matcherCheck = validateEditHookMatcher(request.matcher, "matcher");
  if (!matcherCheck.ok) return matcherCheck;
  let hook;
  if (op === "add" || op === "replace") {
    let hookCheck = validateEditHookCommand(request.hook, "hook");
    if (!hookCheck.ok) return hookCheck;
    hook = hookCheck.hook;
  }
  let target;
  if (op === "replace" || op === "remove") {
    let target_2 = request.target;
    if (!isPlainObjectLike(target_2))
      return {
        ok: false,
        error: "edit_hook: target must be an object for replace and remove",
      };
    let event = target_2.event;
    if (typeof event !== "string" || !HOOK_EVENTS.includes(event))
      return {
        ok: false,
        error: "edit_hook: target.event is not a known hook event",
      };
    let matcherCheck = validateEditHookMatcher(target_2.matcher, "target.matcher");
    if (!matcherCheck.ok) return matcherCheck;
    let hookCheck = validateEditHookCommand(target_2.hook, "target.hook");
    if (!hookCheck.ok) return hookCheck;
    target = {
      event,
      matcher: matcherCheck.matcher,
      hook: hookCheck.hook,
    };
  }
  return {
    ok: true,
    value: {
      op,
      source,
      event,
      matcher: matcherCheck.matcher,
      hook,
      target,
    },
  };
}
//@ chunk-azbt01vf.js:6081-6485 placement
/**
 * 托管设置禁止编辑 hook 时返回原因（禁用全部 hook 或只允许托管 hook）。
 */
function managedHooksEditBlockReason() {
  let settingsForSource = getSettingsForSource("policySettings");
  if (settingsForSource?.disableAllHooks === true) return "edit_hook: hooks are disabled by managed settings";
  if (settingsForSource?.allowManagedHooksOnly === true)
    return "edit_hook: managed settings allow managed hooks only";
  if (isRestrictedToPluginOnly("hooks"))
    return "edit_hook: managed settings restrict hooks to plugin sources";
  if (policySettingsUnreadable())
    return "edit_hook: managed settings could not be read, so hooks cannot be edited";
  return null;
}
//@ chunk-azbt01vf.js:6485-6605 placement
function disabledSourceEditReason(source) {
  if (!isSettingSourceEnabled(source))
    return `edit_hook: the ${source} source is disabled for this session (--setting-sources)`;
  return null;
}
//@ chunk-azbt01vf.js:6605-6766 placement
async function applyHookEditToSettings(request, writeOptions) {
  let outcome = null;
  return {
    error: (
      await updateSettingsForSourceWithTransform(
        request.source,
        (settings) => {
          let edit = applyHookEdit(settings, request);
          outcome = edit.outcome;
          return edit.partial;
        },
        {
          legacyRevocation: "skip",
        },
        writeOptions,
      )
    ).error,
    outcome,
  };
}
//@ chunk-azbt01vf.js:6766-6962 placement
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObjectLike(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
//@ chunk-azbt01vf.js:6962-7060 placement
function isSameHookCommand(hookCommand, config) {
  let parsed = HookCommandSchema().safeParse(hookCommand);
  if (!parsed.success) return false;
  return (
    stableStringify(redactHttpHeaderValues(parsed.data)) === stableStringify(redactHttpHeaderValues(config))
  );
}
//@ chunk-azbt01vf.js:7060-7174 placement = isHTTPConfig (1)
function canonicalHookKey(config) {
  return stableStringify(
    config.type === "http" && config.headers !== undefined
      ? {
          ...config,
          headers: identityMap(config.headers, (name, headerName) => headerName.toLowerCase()),
        }
      : config,
  );
}
//@ chunk-azbt01vf.js:7174-7245 placement
function canonicalHookKeyOf(hook) {
  let parsed = HookCommandSchema().safeParse(hook);
  return parsed.success ? canonicalHookKey(parsed.data) : null;
}
//@ chunk-azbt01vf.js:7245-7532 placement
/**
 * findDuplicateHook：在同 matcher 的 hook 组里查找重复 hook，返回 exact/by-headers/null（编辑 hooks 设置用，非 MCP；见 lead 建议）。
 */
function findDuplicateHook(groups, matcher, hook, skip) {
  let parsed = HookCommandSchema().safeParse(hook);
  if (!parsed.success) return null;
  let wantedKey = canonicalHookKey(parsed.data);
  let headersOnly = false;
  for (let [groupIndex, group] of groups.entries()) {
    if (getHookMatcherKey(group) !== matcher) continue;
    for (let [hookIndex, existing] of group.hooks.entries()) {
      if (skip?.group === groupIndex && skip.index === hookIndex) continue;
      if (canonicalHookKeyOf(existing) === wantedKey) return "exact";
      if (isSameHookCommand(existing, parsed.data)) headersOnly = true;
    }
  }
  return headersOnly ? "by-headers" : null;
}
//@ chunk-azbt01vf.js:7532-7595 placement
function duplicateHookKind(duplicateHook) {
  return duplicateHook === "exact" ? "duplicate" : "twin-by-headers";
}
//@ chunk-azbt01vf.js:7595-7746 placement
function getHookMatcherKey(group) {
  if (!isPlainObjectLike(group) || !Array.isArray(group.hooks)) return null;
  let matcher = group.matcher;
  if (matcher === undefined || matcher === null || matcher === "") return "";
  return typeof matcher === "string" ? matcher : null;
}
//@ chunk-azbt01vf.js:7746-8291 placement = isHTTPConfig (1)
/**
 * mergeHookPreservingHeaders：编辑 http hook 时保留原有未知字段与被遮蔽的 header 值（非 MCP；见 lead 建议）。
 */
function mergeHookPreservingHeaders(previous, hook) {
  let hook_2 = hook;
  let extra = {};
  if (isPlainObjectLike(previous)) {
    let parsed = HookCommandSchema().safeParse(previous);
    if (parsed.success) {
      for (let key of Object.keys(previous))
        if (!(key in parsed.data) && !FORBIDDEN_OBJECT_KEYS.has(key)) extra[key] = previous[key];
      if (parsed.data.type === "http" && hook_2.type === "http") {
        let headers = parsed.data.headers ?? {};
        if (hook_2.headers === undefined) extra.headers = parsed.data.headers;
        else {
          let lowerHeaders = new Map(
            Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
          );
          hook_2 = {
            ...hook_2,
            headers: import_mapValues(hook_2.headers, (value, headerName) =>
              value === ""
                ? ((Object.hasOwn(headers, headerName)
                    ? headers[headerName]
                    : lowerHeaders.get(headerName.toLowerCase())) ?? "")
                : value,
            ),
          };
        }
      }
    }
  }
  let merged = {
    ...extra,
    ...hook_2,
  };
  if (merged.type === "http" && isPlainObjectLike(merged.headers) && Object.keys(merged.headers).length === 0)
    delete merged.headers;
  return merged;
}
//@ chunk-azbt01vf.js:8291-8479 placement = convertToHookMatchers (0.839)
/**
 * 统计设置对象里某事件、某 matcher 下与给定钩子相同的条目数。
 */
function countMatchingHookEntries(settings, target) {
  let hooks = settings?.hooks;
  if (!isPlainObjectLike(hooks) || !Array.isArray(hooks[target.event])) return 0;
  let count = 0;
  for (let group of hooks[target.event]) {
    if (getHookMatcherKey(group) !== target.matcher) continue;
    for (let hook of group.hooks) if (isSameHookCommand(hook, target.hook)) count++;
  }
  return count;
}
//@ chunk-azbt01vf.js:8479-9859 placement
function applyHookEdit(request, edit) {
  let hooks = request?.hooks;
  if (hooks !== undefined && !isPlainObjectLike(hooks))
    return {
      partial: null,
      outcome: "not-a-list",
    };
  let byEvent = hooks ?? {};
  let edited = new Map();
  let listFor = (event) => {
    let cached = edited.get(event);
    if (cached) return cached;
    let list = byEvent[event];
    if (list !== undefined && !Array.isArray(list)) return null;
    let mapped = (list ?? []).map((group) =>
      isPlainObjectLike(group) && Array.isArray(group.hooks)
        ? {
            ...group,
            hooks: [...group.hooks],
          }
        : group,
    );
    edited.set(event, mapped);
    return mapped;
  };
  let hook;
  if (edit.op === "add")
    hook = {
      ...edit.hook,
    };
  else {
    let target = edit.target;
    let targetList = listFor(target.event);
    if (targetList === null)
      return {
        partial: null,
        outcome: "not-a-list",
      };
    let located = null;
    for (let idx = 0; idx < targetList.length && located === null; idx++) {
      let group = targetList[idx];
      if (getHookMatcherKey(group) !== target.matcher) continue;
      let hooks = group.hooks;
      let index = hooks.findIndex((hook) => isSameHookCommand(hook, target.hook));
      if (index >= 0)
        located = {
          list: hooks,
          index,
          groupIndex: idx,
        };
    }
    if (located === null)
      return {
        partial: null,
        outcome: "target-missing",
      };
    if (edit.op === "replace" && edit.event === target.event && edit.matcher === target.matcher) {
      hook = mergeHookPreservingHeaders(located.list[located.index], edit.hook);
      let duplicateHook = findDuplicateHook(targetList, target.matcher, hook, {
        group: located.groupIndex,
        index: located.index,
      });
      if (duplicateHook !== null)
        return {
          partial: null,
          outcome: duplicateHookKind(duplicateHook),
        };
      located.list[located.index] = hook;
      return {
        partial: buildHooksPartial(byEvent, edited),
        outcome: "applied",
      };
    }
    let [removed] = located.list.splice(located.index, 1);
    if (located.list.length === 0) targetList.splice(located.groupIndex, 1);
    if (edit.op === "remove")
      return {
        partial: buildHooksPartial(byEvent, edited),
        outcome: "applied",
      };
    hook = mergeHookPreservingHeaders(removed, edit.hook);
  }
  let eventList = listFor(edit.event);
  if (eventList === null)
    return {
      partial: null,
      outcome: "not-a-list",
    };
  let duplicateHook = findDuplicateHook(eventList, edit.matcher, hook);
  if (duplicateHook !== null)
    return {
      partial: null,
      outcome: duplicateHookKind(duplicateHook),
    };
  let found = eventList.find((group) => getHookMatcherKey(group) === edit.matcher);
  if (found) found.hooks.push(hook);
  else {
    let newGroup = {
      ...(edit.matcher !== "" && {
        matcher: edit.matcher,
      }),
      hooks: [hook],
    };
    eventList.push(newGroup);
  }
  return {
    partial: buildHooksPartial(byEvent, edited),
    outcome: "applied",
  };
}
//@ chunk-azbt01vf.js:9859-10060 placement
function buildHooksPartial(original, edited) {
  let partial = {};
  for (let [event, list] of edited) partial[event] = list.length > 0 ? list : undefined;
  return Object.keys(original).filter((key) => !(key in partial) || partial[key] !== undefined).length > 0 ||
    Object.values(partial).some((list) => list !== undefined)
    ? {
        hooks: partial,
      }
    : {
        hooks: undefined,
      };
}
//@ chunk-azbt01vf.js:10060-12184 placement
async function editHook(request, writeOptions) {
  let failure = (code, error, refusal) => ({
    ok: false,
    error,
    code,
    ...(refusal !== undefined && {
      refusal,
    }),
  });
  let error = managedHooksEditBlockReason();
  if (error !== null) return failure("policy_locked", error);
  if (!isPlainObjectLike(request)) return failure("bad_request", "edit_hook: the edit must be a JSON object");
  let validated = validateEditHookRequest(request);
  if (!validated.ok) return failure("bad_request", sanitizeTelemetryString(validated.error));
  let edit = validated.value;
  let error_2 = disabledSourceEditReason(edit.source);
  if (error_2 !== null) return failure("source_disabled", error_2);
  let settings = getSettingsForSourceWriteSeed(edit.source);
  let settingsFilePathForSource = getSettingsFilePathForSource(edit.source);
  if (
    settings === null &&
    settingsFilePathForSource !== undefined &&
    parseSettingsFile(settingsFilePathForSource).errors.some((error) => error.severity !== "warning")
  )
    return failure(
      "file_unloadable",
      `edit_hook: the ${edit.source} file has errors and could not be loaded; fix it by hand first`,
      settingsFilePathForSource === undefined
        ? undefined
        : {
            code: "unloadable",
            file: settingsFilePathForSource,
          },
    );
  if (edit.target !== undefined) {
    let wantedMatches = countMatchingHookEntries(settings, edit.target);
    if (
      edit.source === "localSettings" &&
      countMatchingHookEntries(getSettingsForSource(edit.source), edit.target) > wantedMatches
    ) {
      let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
      return failure(
        "legacy_file",
        "edit_hook: that hook is defined in the launch directory\u2019s own .claude/settings.local.json, which this dialog cannot edit; edit that file directly",
        legacyLocalSettingsFilePath === undefined
          ? undefined
          : {
              code: "legacy",
              file: legacyLocalSettingsFilePath,
            },
      );
    }
    if (wantedMatches === 0)
      return failure(
        "target_missing",
        `edit_hook: that hook is no longer in ${edit.source}; it may have been changed outside this dialog`,
      );
    if (wantedMatches > 1)
      return failure(
        "target_ambiguous",
        `edit_hook: more than one identical hook is configured for ${edit.event} in ${edit.source}; edit the file by hand`,
        settingsFilePathForSource === undefined
          ? undefined
          : {
              code: "twins",
              file: settingsFilePathForSource,
            },
      );
  }
  let applied = await applyHookEditToSettings(edit, writeOptions);
  await settleBackgroundSettingsWork();
  if (applied.error)
    return failure(
      "write_failed",
      `edit_hook: the settings write failed: ${sanitizeTelemetryString(applied.error.message)}`,
    );
  switch (applied.outcome) {
    case "applied":
      break;
    case "duplicate":
      return failure(
        "duplicate",
        `edit_hook: an identical hook is already configured for ${edit.event} in ${edit.source}`,
      );
    case "twin-by-headers":
      return failure(
        "twin_by_headers",
        `edit_hook: a hook that differs from this one only in header values is already configured for ${edit.event} in ${edit.source}; this dialog could not tell the two apart afterwards, so edit the file by hand to keep both`,
      );
    case "not-a-list":
      return failure(
        "not_a_list",
        `edit_hook: the ${edit.event} entry in ${edit.source} is not a list; fix the file by hand`,
        settingsFilePathForSource === undefined
          ? undefined
          : {
              code: "not-a-list",
              file: settingsFilePathForSource,
            },
      );
    default:
      return failure(
        "target_missing",
        `edit_hook: that hook is no longer in ${edit.source}; it may have been changed outside this dialog`,
      );
  }
  return {
    ok: true,
  };
}
export { editHook };
