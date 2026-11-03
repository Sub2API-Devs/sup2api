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
var T = ["add", "replace", "remove"],
  K = 1e4,
  M = 262144;
//@ chunk-azbt01vf.js:4052-4122 placement
function h(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-azbt01vf.js:4122-4177 placement
var A = new Set(["__proto__", "constructor", "prototype"]);
//@ chunk-azbt01vf.js:4177-4297 placement
function hasForbiddenKey(e) {
  if (Array.isArray(e)) return e.some(hasForbiddenKey);
  if (!h(e)) return !1;
  return Object.keys(e).some((o) => A.has(o) || hasForbiddenKey(e[o]));
}
/**
 * 校验 edit_hook 的命令对象：必须是对象、不含禁用键、大小受限。
 */
//@ chunk-azbt01vf.js:4297-4762 placement
function validateEditHookCommand(e, o) {
  if (!h(e)) return { ok: !1, error: `edit_hook: ${o} must be an object` };
  if (hasForbiddenKey(e)) return { ok: !1, error: `edit_hook: ${o} has a key that is not allowed` };
  if (JSON.stringify(e).length > M) return { ok: !1, error: `edit_hook: ${o} is too large` };
  let safeParse = HookCommandSchema().safeParse(e);
  if (!safeParse.success) {
    let a = safeParse.error.issues[0],
      r = a && a.path.length > 0 ? ` (${a.path.join(".")})` : "";
    return { ok: !1, error: `edit_hook: ${o} is not a valid hook${r}: ${a?.message ?? "invalid"}` };
  }
  return { ok: !0, hook: safeParse.data };
}
//@ chunk-azbt01vf.js:4762-5056 placement
function validateEditHookMatcher(e, o) {
  if (e === void 0 || e === null) return { ok: !0, matcher: "" };
  if (typeof e !== "string") return { ok: !1, error: `edit_hook: ${o} must be a string` };
  if (e.length > K) return { ok: !1, error: `edit_hook: ${o} is too long` };
  if (e in {}) return { ok: !1, error: `edit_hook: ${o} is not allowed` };
  return { ok: !0, matcher: e };
}
//@ chunk-azbt01vf.js:5056-6081 placement
function validateEditHookRequest(e) {
  let op = e.op;
  if (typeof op !== "string" || !T.includes(op))
    return { ok: !1, error: "edit_hook: op must be add, replace, or remove" };
  let source = e.source;
  if (typeof source !== "string" || !EDITABLE_SETTING_SOURCES.includes(source))
    return { ok: !1, error: "edit_hook: source must be userSettings, projectSettings, or localSettings" };
  let event = e.event;
  if (typeof event !== "string" || !HOOK_EVENTS.includes(event))
    return { ok: !1, error: "edit_hook: event is not a known hook event" };
  let r = validateEditHookMatcher(e.matcher, "matcher");
  if (!r.ok) return r;
  let n;
  if (op === "add" || op === "replace") {
    let c = validateEditHookCommand(e.hook, "hook");
    if (!c.ok) return c;
    n = c.hook;
  }
  let i;
  if (op === "replace" || op === "remove") {
    let target = e.target;
    if (!h(target)) return { ok: !1, error: "edit_hook: target must be an object for replace and remove" };
    let event = target.event;
    if (typeof event !== "string" || !HOOK_EVENTS.includes(event))
      return { ok: !1, error: "edit_hook: target.event is not a known hook event" };
    let l = validateEditHookMatcher(target.matcher, "target.matcher");
    if (!l.ok) return l;
    let s = validateEditHookCommand(target.hook, "target.hook");
    if (!s.ok) return s;
    i = { event: event, matcher: l.matcher, hook: s.hook };
  }
  return { ok: !0, value: { op: op, source: source, event: event, matcher: r.matcher, hook: n, target: i } };
}
/**
 * 托管设置禁止编辑 hook 时返回原因（禁用全部 hook 或只允许托管 hook）。
 */
//@ chunk-azbt01vf.js:6081-6485 placement
function managedHooksEditBlockReason() {
  let e = getSettingsForSource("policySettings");
  if (e?.disableAllHooks === !0) return "edit_hook: hooks are disabled by managed settings";
  if (e?.allowManagedHooksOnly === !0) return "edit_hook: managed settings allow managed hooks only";
  if (isRestrictedToPluginOnly("hooks"))
    return "edit_hook: managed settings restrict hooks to plugin sources";
  if (policySettingsUnreadable())
    return "edit_hook: managed settings could not be read, so hooks cannot be edited";
  return null;
}
//@ chunk-azbt01vf.js:6485-6605 placement
function disabledSourceEditReason(e) {
  if (!isSettingSourceEnabled(e))
    return `edit_hook: the ${e} source is disabled for this session (--setting-sources)`;
  return null;
}
//@ chunk-azbt01vf.js:6605-6766 placement
async function applyHookEditToSettings(e, o) {
  let t = null;
  return {
    error: (
      await updateSettingsForSourceWithTransform(
        e.source,
        (r) => {
          let n = applyHookEdit(r, e);
          return ((t = n.outcome), n.partial);
        },
        { legacyRevocation: "skip" },
        o,
      )
    ).error,
    outcome: t,
  };
}
//@ chunk-azbt01vf.js:6766-6962 placement
function stableStringify(e) {
  if (Array.isArray(e)) return `[${e.map(stableStringify).join(",")}]`;
  if (h(e))
    return `{${Object.keys(e)
      .sort()
      .map((o) => `${JSON.stringify(o)}:${stableStringify(e[o])}`)
      .join(",")}}`;
  return JSON.stringify(e) ?? "null";
}
//@ chunk-azbt01vf.js:6962-7060 placement
function w(e, o) {
  let safeParse = HookCommandSchema().safeParse(e);
  if (!safeParse.success) return !1;
  return (
    stableStringify(redactHttpHeaderValues(safeParse.data)) === stableStringify(redactHttpHeaderValues(o))
  );
}
//@ chunk-azbt01vf.js:7060-7174 placement = isHTTPConfig (1)
function canonicalHookKey(config) {
  return stableStringify(
    config.type === "http" && config.headers !== void 0
      ? { ...config, headers: identityMap(config.headers, (o, t) => t.toLowerCase()) }
      : config,
  );
}
//@ chunk-azbt01vf.js:7174-7245 placement
function canonicalHookKeyOf(e) {
  let safeParse = HookCommandSchema().safeParse(e);
  return safeParse.success ? canonicalHookKey(safeParse.data) : null;
}
/**
 * findDuplicateHook：在同 matcher 的 hook 组里查找重复 hook，返回 exact/by-headers/null（编辑 hooks 设置用，非 MCP；见 lead 建议）。
 */
//@ chunk-azbt01vf.js:7245-7532 placement
function findDuplicateHook(e, o, t, a) {
  let safeParse = HookCommandSchema().safeParse(t);
  if (!safeParse.success) return null;
  let n = canonicalHookKey(safeParse.data),
    i = !1;
  for (let [c, u] of e.entries()) {
    if (getHookMatcherKey(u) !== o) continue;
    for (let [l, s] of u.hooks.entries()) {
      if (a?.group === c && a.index === l) continue;
      if (canonicalHookKeyOf(s) === n) return "exact";
      if (w(s, safeParse.data)) i = !0;
    }
  }
  return i ? "by-headers" : null;
}
//@ chunk-azbt01vf.js:7532-7595 placement
function duplicateHookKind(e) {
  return e === "exact" ? "duplicate" : "twin-by-headers";
}
//@ chunk-azbt01vf.js:7595-7746 placement
function getHookMatcherKey(e) {
  if (!h(e) || !Array.isArray(e.hooks)) return null;
  let matcher = e.matcher;
  if (matcher === void 0 || matcher === null || matcher === "") return "";
  return typeof matcher === "string" ? matcher : null;
}
/**
 * mergeHookPreservingHeaders：编辑 http hook 时保留原有未知字段与被遮蔽的 header 值（非 MCP；见 lead 建议）。
 */
//@ chunk-azbt01vf.js:7746-8291 placement = isHTTPConfig (1)
function mergeHookPreservingHeaders(e, o) {
  let t = o,
    a = {};
  if (h(e)) {
    let safeParse = HookCommandSchema().safeParse(e);
    if (safeParse.success) {
      for (let i of Object.keys(e)) if (!(i in safeParse.data) && !A.has(i)) a[i] = e[i];
      if (safeParse.data.type === "http" && t.type === "http") {
        let i = safeParse.data.headers ?? {};
        if (t.headers === void 0) a.headers = safeParse.data.headers;
        else {
          let c = new Map(Object.entries(i).map(([u, l]) => [u.toLowerCase(), l]));
          t = {
            ...t,
            headers: xr(t.headers, (u, l) =>
              u === "" ? ((Object.hasOwn(i, l) ? i[l] : c.get(l.toLowerCase())) ?? "") : u,
            ),
          };
        }
      }
    }
  }
  let r = { ...a, ...t };
  if (r.type === "http" && h(r.headers) && Object.keys(r.headers).length === 0) delete r.headers;
  return r;
}
/**
 * 统计设置对象里某事件、某 matcher 下与给定钩子相同的条目数。
 */
//@ chunk-azbt01vf.js:8291-8479 placement = convertToHookMatchers (0.839)
function countMatchingHookEntries(e, o) {
  let t = e?.hooks;
  if (!h(t) || !Array.isArray(t[o.event])) return 0;
  let a = 0;
  for (let r of t[o.event]) {
    if (getHookMatcherKey(r) !== o.matcher) continue;
    for (let hook of r.hooks) if (w(hook, o.hook)) a++;
  }
  return a;
}
//@ chunk-azbt01vf.js:8479-9859 placement
function applyHookEdit(e, o) {
  let t = e?.hooks;
  if (t !== void 0 && !h(t)) return { partial: null, outcome: "not-a-list" };
  let a = t ?? {},
    r = new Map(),
    n = (s) => {
      let k = r.get(s);
      if (k) return k;
      let d = a[s];
      if (d !== void 0 && !Array.isArray(d)) return null;
      let mapped = (d ?? []).map((f) => (h(f) && Array.isArray(f.hooks) ? { ...f, hooks: [...f.hooks] } : f));
      return (r.set(s, mapped), mapped);
    },
    i;
  if (o.op === "add") i = { ...o.hook };
  else {
    let target = o.target,
      k = n(target.event);
    if (k === null) return { partial: null, outcome: "not-a-list" };
    let d = null;
    for (let f = 0; f < k.length && d === null; f++) {
      let H = k[f];
      if (getHookMatcherKey(H) !== target.matcher) continue;
      let hooks = H.hooks,
        index = hooks.findIndex((j) => w(j, target.hook));
      if (index >= 0) d = { list: hooks, index: index, groupIndex: f };
    }
    if (d === null) return { partial: null, outcome: "target-missing" };
    if (o.op === "replace" && o.event === target.event && o.matcher === target.matcher) {
      i = mergeHookPreservingHeaders(d.list[d.index], o.hook);
      let f = findDuplicateHook(k, target.matcher, i, { group: d.groupIndex, index: d.index });
      if (f !== null) return { partial: null, outcome: duplicateHookKind(f) };
      return ((d.list[d.index] = i), { partial: buildHooksPartial(a, r), outcome: "applied" });
    }
    let [p] = d.list.splice(d.index, 1);
    if (d.list.length === 0) k.splice(d.groupIndex, 1);
    if (o.op === "remove") return { partial: buildHooksPartial(a, r), outcome: "applied" };
    i = mergeHookPreservingHeaders(p, o.hook);
  }
  let c = n(o.event);
  if (c === null) return { partial: null, outcome: "not-a-list" };
  let u = findDuplicateHook(c, o.matcher, i);
  if (u !== null) return { partial: null, outcome: duplicateHookKind(u) };
  let found = c.find((s) => getHookMatcherKey(s) === o.matcher);
  if (found) found.hooks.push(i);
  else {
    let s = { ...(o.matcher !== "" && { matcher: o.matcher }), hooks: [i] };
    c.push(s);
  }
  return { partial: buildHooksPartial(a, r), outcome: "applied" };
}
//@ chunk-azbt01vf.js:9859-10060 placement
function buildHooksPartial(e, o) {
  let t = {};
  for (let [n, i] of o) t[n] = i.length > 0 ? i : void 0;
  return Object.keys(e).filter((n) => !(n in t) || t[n] !== void 0).length > 0 ||
    Object.values(t).some((n) => n !== void 0)
    ? { hooks: t }
    : { hooks: void 0 };
}
//@ chunk-azbt01vf.js:10060-12184 placement
async function editHook(e, o) {
  let t = (s, k, d) => ({ ok: !1, error: k, code: s, ...(d !== void 0 && { refusal: d }) }),
    a = managedHooksEditBlockReason();
  if (a !== null) return t("policy_locked", a);
  if (!h(e)) return t("bad_request", "edit_hook: the edit must be a JSON object");
  let r = validateEditHookRequest(e);
  if (!r.ok) return t("bad_request", sanitizeTelemetryString(r.error));
  let n = r.value,
    i = disabledSourceEditReason(n.source);
  if (i !== null) return t("source_disabled", i);
  let c = getSettingsForSourceWriteSeed(n.source),
    u = getSettingsFilePathForSource(n.source);
  if (c === null && u !== void 0 && parseSettingsFile(u).errors.some((error) => error.severity !== "warning"))
    return t(
      "file_unloadable",
      `edit_hook: the ${n.source} file has errors and could not be loaded; fix it by hand first`,
      u === void 0 ? void 0 : { code: "unloadable", file: u },
    );
  if (n.target !== void 0) {
    let s = countMatchingHookEntries(c, n.target);
    if (
      n.source === "localSettings" &&
      countMatchingHookEntries(getSettingsForSource(n.source), n.target) > s
    ) {
      let d = getLegacyLocalSettingsFilePath();
      return t(
        "legacy_file",
        "edit_hook: that hook is defined in the launch directory\u2019s own .claude/settings.local.json, which this dialog cannot edit; edit that file directly",
        d === void 0 ? void 0 : { code: "legacy", file: d },
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
        u === void 0 ? void 0 : { code: "twins", file: u },
      );
  }
  let l = await applyHookEditToSettings(n, o);
  if ((await settleBackgroundSettingsWork(), l.error))
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
        u === void 0 ? void 0 : { code: "not-a-list", file: u },
      );
    default:
      return t(
        "target_missing",
        `edit_hook: that hook is no longer in ${n.source}; it may have been changed outside this dialog`,
      );
  }
  return { ok: !0 };
}
