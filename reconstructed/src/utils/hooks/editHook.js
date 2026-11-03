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
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sanitizeTelemetryString } from "../sanitization.js";

//@ chunk-azbt01vf.js:4004-4052 placement
var EDIT_HOOK_OPERATIONS = ["add", "replace", "remove"];
var MAX_EDIT_FIELD_CHARS = 1e4;
var MAX_EDIT_PAYLOAD_CHARS = 262144;
//@ chunk-azbt01vf.js:4052-4122 placement
function isPlainObjectLike(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-azbt01vf.js:4122-4177 placement
var FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
//@ chunk-azbt01vf.js:4177-4297 placement
function hasForbiddenKey(e) {
  if (Array.isArray(e)) return e.some(hasForbiddenKey);
  if (!isPlainObjectLike(e)) return false;
  return Object.keys(e).some((key) => FORBIDDEN_OBJECT_KEYS.has(key) || hasForbiddenKey(e[key]));
}
//@ chunk-azbt01vf.js:4297-4762 placement
/**
 * 校验 edit_hook 的命令对象：必须是对象、不含禁用键、大小受限。
 */
function validateEditHookCommand(hook, o) {
  if (!isPlainObjectLike(hook))
    return {
      ok: false,
      error: `edit_hook: ${o} must be an object`,
    };
  if (hasForbiddenKey(hook))
    return {
      ok: false,
      error: `edit_hook: ${o} has a key that is not allowed`,
    };
  if (JSON.stringify(hook).length > MAX_EDIT_PAYLOAD_CHARS)
    return {
      ok: false,
      error: `edit_hook: ${o} is too large`,
    };
  let t = HookCommandSchema().safeParse(hook);
  if (!t.success) {
    let a = t.error.issues[0];
    let r = a && a.path.length > 0 ? ` (${a.path.join(".")})` : "";
    return {
      ok: false,
      error: `edit_hook: ${o} is not a valid hook${r}: ${a?.message ?? "invalid"}`,
    };
  }
  return {
    ok: true,
    hook: t.data,
  };
}
//@ chunk-azbt01vf.js:4762-5056 placement
function validateEditHookMatcher(matcher, o) {
  if (matcher === undefined || matcher === null)
    return {
      ok: true,
      matcher: "",
    };
  if (typeof matcher !== "string")
    return {
      ok: false,
      error: `edit_hook: ${o} must be a string`,
    };
  if (matcher.length > MAX_EDIT_FIELD_CHARS)
    return {
      ok: false,
      error: `edit_hook: ${o} is too long`,
    };
  if (matcher in {})
    return {
      ok: false,
      error: `edit_hook: ${o} is not allowed`,
    };
  return {
    ok: true,
    matcher,
  };
}
//@ chunk-azbt01vf.js:5056-6081 placement
function validateEditHookRequest(e) {
  let op = e.op;
  if (typeof op !== "string" || !EDIT_HOOK_OPERATIONS.includes(op))
    return {
      ok: false,
      error: "edit_hook: op must be add, replace, or remove",
    };
  let source = e.source;
  if (typeof source !== "string" || !EDITABLE_SETTING_SOURCES.includes(source))
    return {
      ok: false,
      error: "edit_hook: source must be userSettings, projectSettings, or localSettings",
    };
  let event = e.event;
  if (typeof event !== "string" || !HOOK_EVENTS.includes(event))
    return {
      ok: false,
      error: "edit_hook: event is not a known hook event",
    };
  let r = validateEditHookMatcher(e.matcher, "matcher");
  if (!r.ok) return r;
  let hook;
  if (op === "add" || op === "replace") {
    let c = validateEditHookCommand(e.hook, "hook");
    if (!c.ok) return c;
    hook = c.hook;
  }
  let target;
  if (op === "replace" || op === "remove") {
    let target_2 = e.target;
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
    let l = validateEditHookMatcher(target_2.matcher, "target.matcher");
    if (!l.ok) return l;
    let s = validateEditHookCommand(target_2.hook, "target.hook");
    if (!s.ok) return s;
    target = {
      event,
      matcher: l.matcher,
      hook: s.hook,
    };
  }
  return {
    ok: true,
    value: {
      op,
      source,
      event,
      matcher: r.matcher,
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
async function applyHookEditToSettings(e, o) {
  let outcome = null;
  return {
    error: (
      await updateSettingsForSourceWithTransform(
        e.source,
        (r) => {
          let n = applyHookEdit(r, e);
          outcome = n.outcome;
          return n.partial;
        },
        {
          legacyRevocation: "skip",
        },
        o,
      )
    ).error,
    outcome,
  };
}
//@ chunk-azbt01vf.js:6766-6962 placement
function stableStringify(e) {
  if (Array.isArray(e)) return `[${e.map(stableStringify).join(",")}]`;
  if (isPlainObjectLike(e))
    return `{${Object.keys(e)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(e[key])}`)
      .join(",")}}`;
  return JSON.stringify(e) ?? "null";
}
//@ chunk-azbt01vf.js:6962-7060 placement
function isSameHookCommand(hook, config) {
  let t = HookCommandSchema().safeParse(hook);
  if (!t.success) return false;
  return stableStringify(redactHttpHeaderValues(t.data)) === stableStringify(redactHttpHeaderValues(config));
}
//@ chunk-azbt01vf.js:7060-7174 placement = isHTTPConfig (1)
function canonicalHookKey(config) {
  return stableStringify(
    config.type === "http" && config.headers !== undefined
      ? {
          ...config,
          headers: identityMap(config.headers, (o, t) => t.toLowerCase()),
        }
      : config,
  );
}
//@ chunk-azbt01vf.js:7174-7245 placement
function canonicalHookKeyOf(e) {
  let o = HookCommandSchema().safeParse(e);
  return o.success ? canonicalHookKey(o.data) : null;
}
//@ chunk-azbt01vf.js:7245-7532 placement
/**
 * findDuplicateHook：在同 matcher 的 hook 组里查找重复 hook，返回 exact/by-headers/null（编辑 hooks 设置用，非 MCP；见 lead 建议）。
 */
function findDuplicateHook(e, matcher, t, a) {
  let r = HookCommandSchema().safeParse(t);
  if (!r.success) return null;
  let n = canonicalHookKey(r.data);
  let i = false;
  for (let [c, u] of e.entries()) {
    if (getHookMatcherKey(u) !== matcher) continue;
    for (let [l, s] of u.hooks.entries()) {
      if (a?.group === c && a.index === l) continue;
      if (canonicalHookKeyOf(s) === n) return "exact";
      if (isSameHookCommand(s, r.data)) i = true;
    }
  }
  return i ? "by-headers" : null;
}
//@ chunk-azbt01vf.js:7532-7595 placement
function duplicateHookKind(duplicateHook) {
  return duplicateHook === "exact" ? "duplicate" : "twin-by-headers";
}
//@ chunk-azbt01vf.js:7595-7746 placement
function getHookMatcherKey(e) {
  if (!isPlainObjectLike(e) || !Array.isArray(e.hooks)) return null;
  let matcher = e.matcher;
  if (matcher === undefined || matcher === null || matcher === "") return "";
  return typeof matcher === "string" ? matcher : null;
}
//@ chunk-azbt01vf.js:7746-8291 placement = isHTTPConfig (1)
/**
 * mergeHookPreservingHeaders：编辑 http hook 时保留原有未知字段与被遮蔽的 header 值（非 MCP；见 lead 建议）。
 */
function mergeHookPreservingHeaders(e, hook) {
  let t = hook;
  let a = {};
  if (isPlainObjectLike(e)) {
    let n = HookCommandSchema().safeParse(e);
    if (n.success) {
      for (let key of Object.keys(e))
        if (!(key in n.data) && !FORBIDDEN_OBJECT_KEYS.has(key)) a[key] = e[key];
      if (n.data.type === "http" && t.type === "http") {
        let headers = n.data.headers ?? {};
        if (t.headers === undefined) a.headers = n.data.headers;
        else {
          let c = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
          t = {
            ...t,
            headers: xr(t.headers, (u, l) =>
              u === "" ? ((Object.hasOwn(headers, l) ? headers[l] : c.get(l.toLowerCase())) ?? "") : u,
            ),
          };
        }
      }
    }
  }
  let r = {
    ...a,
    ...t,
  };
  if (r.type === "http" && isPlainObjectLike(r.headers) && Object.keys(r.headers).length === 0)
    delete r.headers;
  return r;
}
//@ chunk-azbt01vf.js:8291-8479 placement = convertToHookMatchers (0.839)
/**
 * 统计设置对象里某事件、某 matcher 下与给定钩子相同的条目数。
 */
function countMatchingHookEntries(e, target) {
  let hooks = e?.hooks;
  if (!isPlainObjectLike(hooks) || !Array.isArray(hooks[target.event])) return 0;
  let a = 0;
  for (let r of hooks[target.event]) {
    if (getHookMatcherKey(r) !== target.matcher) continue;
    for (let hook of r.hooks) if (isSameHookCommand(hook, target.hook)) a++;
  }
  return a;
}
//@ chunk-azbt01vf.js:8479-9859 placement
function applyHookEdit(e, o) {
  let hooks = e?.hooks;
  if (hooks !== undefined && !isPlainObjectLike(hooks))
    return {
      partial: null,
      outcome: "not-a-list",
    };
  let a = hooks ?? {};
  let r = new Map();
  let n = (event) => {
    let k = r.get(event);
    if (k) return k;
    let d = a[event];
    if (d !== undefined && !Array.isArray(d)) return null;
    let mapped = (d ?? []).map((f) =>
      isPlainObjectLike(f) && Array.isArray(f.hooks)
        ? {
            ...f,
            hooks: [...f.hooks],
          }
        : f,
    );
    r.set(event, mapped);
    return mapped;
  };
  let i;
  if (o.op === "add")
    i = {
      ...o.hook,
    };
  else {
    let target = o.target;
    let k = n(target.event);
    if (k === null)
      return {
        partial: null,
        outcome: "not-a-list",
      };
    let d = null;
    for (let idx = 0; idx < k.length && d === null; idx++) {
      let H = k[idx];
      if (getHookMatcherKey(H) !== target.matcher) continue;
      let hooks = H.hooks;
      let index = hooks.findIndex((hook) => isSameHookCommand(hook, target.hook));
      if (index >= 0)
        d = {
          list: hooks,
          index,
          groupIndex: idx,
        };
    }
    if (d === null)
      return {
        partial: null,
        outcome: "target-missing",
      };
    if (o.op === "replace" && o.event === target.event && o.matcher === target.matcher) {
      i = mergeHookPreservingHeaders(d.list[d.index], o.hook);
      let duplicateHook = findDuplicateHook(k, target.matcher, i, {
        group: d.groupIndex,
        index: d.index,
      });
      if (duplicateHook !== null)
        return {
          partial: null,
          outcome: duplicateHookKind(duplicateHook),
        };
      d.list[d.index] = i;
      return {
        partial: buildHooksPartial(a, r),
        outcome: "applied",
      };
    }
    let [p] = d.list.splice(d.index, 1);
    if (d.list.length === 0) k.splice(d.groupIndex, 1);
    if (o.op === "remove")
      return {
        partial: buildHooksPartial(a, r),
        outcome: "applied",
      };
    i = mergeHookPreservingHeaders(p, o.hook);
  }
  let c = n(o.event);
  if (c === null)
    return {
      partial: null,
      outcome: "not-a-list",
    };
  let duplicateHook = findDuplicateHook(c, o.matcher, i);
  if (duplicateHook !== null)
    return {
      partial: null,
      outcome: duplicateHookKind(duplicateHook),
    };
  let found = c.find((s) => getHookMatcherKey(s) === o.matcher);
  if (found) found.hooks.push(i);
  else {
    let s = {
      ...(o.matcher !== "" && {
        matcher: o.matcher,
      }),
      hooks: [i],
    };
    c.push(s);
  }
  return {
    partial: buildHooksPartial(a, r),
    outcome: "applied",
  };
}
//@ chunk-azbt01vf.js:9859-10060 placement
function buildHooksPartial(e, o) {
  let t = {};
  for (let [n, i] of o) t[n] = i.length > 0 ? i : undefined;
  return Object.keys(e).filter((key) => !(key in t) || t[key] !== undefined).length > 0 ||
    Object.values(t).some((n) => n !== undefined)
    ? {
        hooks: t,
      }
    : {
        hooks: undefined,
      };
}
//@ chunk-azbt01vf.js:10060-12184 placement
async function editHook(e, o) {
  let t = (code, error, d) => ({
    ok: false,
    error,
    code,
    ...(d !== undefined && {
      refusal: d,
    }),
  });
  let error = managedHooksEditBlockReason();
  if (error !== null) return t("policy_locked", error);
  if (!isPlainObjectLike(e)) return t("bad_request", "edit_hook: the edit must be a JSON object");
  let r = validateEditHookRequest(e);
  if (!r.ok) return t("bad_request", sanitizeTelemetryString(r.error));
  let n = r.value;
  let error_2 = disabledSourceEditReason(n.source);
  if (error_2 !== null) return t("source_disabled", error_2);
  let settingsForSourceWriteSeed = getSettingsForSourceWriteSeed(n.source);
  let settingsFilePathForSource = getSettingsFilePathForSource(n.source);
  if (
    settingsForSourceWriteSeed === null &&
    settingsFilePathForSource !== undefined &&
    parseSettingsFile(settingsFilePathForSource).errors.some((error) => error.severity !== "warning")
  )
    return t(
      "file_unloadable",
      `edit_hook: the ${n.source} file has errors and could not be loaded; fix it by hand first`,
      settingsFilePathForSource === undefined
        ? undefined
        : {
            code: "unloadable",
            file: settingsFilePathForSource,
          },
    );
  if (n.target !== undefined) {
    let s = countMatchingHookEntries(settingsForSourceWriteSeed, n.target);
    if (
      n.source === "localSettings" &&
      countMatchingHookEntries(getSettingsForSource(n.source), n.target) > s
    ) {
      let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
      return t(
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
    if (s === 0)
      return t(
        "target_missing",
        `edit_hook: that hook is no longer in ${n.source}; it may have been changed outside this dialog`,
      );
    if (s > 1)
      return t(
        "target_ambiguous",
        `edit_hook: more than one identical hook is configured for ${n.event} in ${n.source}; edit the file by hand`,
        settingsFilePathForSource === undefined
          ? undefined
          : {
              code: "twins",
              file: settingsFilePathForSource,
            },
      );
  }
  let l = await applyHookEditToSettings(n, o);
  await settleBackgroundSettingsWork();
  if (l.error)
    return t(
      "write_failed",
      `edit_hook: the settings write failed: ${sanitizeTelemetryString(l.error.message)}`,
    );
  switch (l.outcome) {
    case "applied":
      break;
    case "duplicate":
      return t(
        "duplicate",
        `edit_hook: an identical hook is already configured for ${n.event} in ${n.source}`,
      );
    case "twin-by-headers":
      return t(
        "twin_by_headers",
        `edit_hook: a hook that differs from this one only in header values is already configured for ${n.event} in ${n.source}; this dialog could not tell the two apart afterwards, so edit the file by hand to keep both`,
      );
    case "not-a-list":
      return t(
        "not_a_list",
        `edit_hook: the ${n.event} entry in ${n.source} is not a list; fix the file by hand`,
        settingsFilePathForSource === undefined
          ? undefined
          : {
              code: "not-a-list",
              file: settingsFilePathForSource,
            },
      );
    default:
      return t(
        "target_missing",
        `edit_hook: that hook is no longer in ${n.source}; it may have been changed outside this dialog`,
      );
  }
  return {
    ok: true,
  };
}
