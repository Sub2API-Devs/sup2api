/**
 * components/ManagedSettingsSecurityDialog/utils.ts
 *
 * 托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ManagedSettingsSecurityDialog/utils.ts
 * pieces: chunk-dcmhvw5a.js (54)
 * attribution: placement 47, fingerprint 3, layout 3, affinity 1
 */
import {
  cleanOptionalText,
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
  gu,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { redactUrlCredentials } from "../../utils/plugins/marketplaceManager.js";
import { displaySafeUrl, REDACTED_URL } from "../../utils/redaction/urlRedaction.js";
import { SUPPORTED_PLATFORMS } from "../../utils/settings/types.js";
import {
  DANGEROUS_SHELL_SETTINGS_LIST,
  Os,
  cu,
  uu,
  isProtectedEnvVar,
} from "../../utils/managedEnvConstants.js";
import { extraMarketplacesOf, describeEnvRows } from "../../utils/settings/otelEndpointValidation.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { uniq } from "../../utils/collections.js";
import { oC } from "../FileEditToolUpdatedMessage.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { safeParseJSON } from "../../utils/json.js";

/**
 * 清洗插件清单里要展示的字段（显示名、版本、描述、作者），去掉不可打印字符并截断。
 */
//@ chunk-dcmhvw5a.js:376544-376884 placement
function sanitizePluginManifestForDisplay(e) {
  return {
    ...e,
    displayName: cleanOptionalText(e.displayName),
    version: cleanOptionalText(e.version),
    description: cleanOptionalText(e.description, stripInvisibleKeepNewlines),
    author:
      e.author === void 0
        ? void 0
        : {
            ...e.author,
            name: stripInvisibleKeepEmoji(e.author.name),
            email: cleanOptionalText(e.author.email),
            url: redactUrlCredentials(e.author.url),
          },
    homepage: redactUrlCredentials(e.homepage),
    repository: redactUrlCredentials(e.repository),
    license: cleanOptionalText(e.license),
    keywords: e.keywords?.map(stripInvisibleKeepEmoji),
  };
}
/**
 * 把插件名转成可打印形式。
 */
//@ chunk-dcmhvw5a.js:376884-376912 placement
function printablePluginName(e) {
  return gu(e);
}
/**
 * 取插件可显示名称：清单 displayName → 名称 → 来源，都不可打印时返回占位文字。
 */
//@ chunk-dcmhvw5a.js:376912-377097 placement
function getPluginDisplayName(e) {
  let n = mu(e) ? e.manifest.displayName : e.displayName;
  return (
    Tct(typeof n === "string" ? stripInvisibleKeepEmoji(n).trim() : n) ??
    Tct(printablePluginName(e.name)) ??
    Tct(printablePluginName(mu(e) ? e.source : "")) ??
    "(unprintable plugin name)"
  );
}
//@ chunk-dcmhvw5a.js:377097-377168 placement
function Tct(e) {
  if (typeof e !== "string") return;
  return e.trim() ? e : void 0;
}
//@ chunk-dcmhvw5a.js:377168-377253 placement
function mu(e) {
  return "manifest" in e && typeof e.manifest === "object" && e.manifest !== null;
}
//@ chunk-dcmhvw5a.js:377253-377396 placement
var HIDDEN_CHARS_WARNING =
  "The command contains non-ASCII, hidden or control characters (shown as \\u{\u2026} escapes). Do not proceed unless you expected them.";
/**
 * 描述插件归档下载的 headersHelper 命令（目的地、隐藏字符警告、转义后的命令）。
 */
//@ chunk-dcmhvw5a.js:377396-377534 placement
function describeArchiveFetchCommand(e) {
  let { text: text, escaped: escaped } = escapeNonPrintable(e.command);
  return {
    destination: displaySafeUrl(e.archiveUrl) ?? REDACTED_URL,
    hiddenCharactersWarning: escaped ? HIDDEN_CHARS_WARNING : null,
    command: text,
  };
}
/**
 * 把不可打印字符（及反斜杠）转义为 \u{…} 形式，返回转义后文本及是否发生转义。
 */
//@ chunk-dcmhvw5a.js:377534-377702 placement
function escapeNonPrintable(e) {
  let n = !1;
  return {
    text: e.replace(/[^\x20-\x5b\x5d-\x7e]/gu, (s) => {
      if (s === "\\") return "\\\\";
      return ((n = !0), `\\u{${s.codePointAt(0).toString(16)}}`);
    }),
    escaped: n,
  };
}
//@ chunk-dcmhvw5a.js:377702-377810 placement
var SANDBOX_TOGGLE_KEYS = ["enabled", "enabledPlatforms"],
  NETWORK_ALLOWEDDOMAINS = "network.allowedDomains",
  IGNORED_ENV_VARS = new Set(["OTEL_LOG_MANAGED_SETTINGS"]);
/**
 * 汇总托管设置文档里需要用户确认的危险项（shell 设置、环境变量、沙箱、隔离、hooks、policyHelpers 槽位）。
 */
//@ chunk-dcmhvw5a.js:377810-378429 placement
function summarizeManagedSettingsRisk(e) {
  if (!e)
    return {
      shellSettings: {},
      envVars: {},
      sandboxSettings: {},
      isolationSettings: {},
      hasHooks: !1,
      payloadSlots: {},
    };
  let n = [
      ["top", e],
      ...policyHelperSlots(e),
      ...policyHelperSlots(e).map(([m]) => [m, { slotPresent: !0 }]),
      ...SUPPORTED_PLATFORMS.map((m) => [
        `policyHelpers.${m}`,
        { outputBehavior: getAtPath_2(e, `policyHelpers.${m}.outputBehavior`) },
      ]),
    ],
    r = collectDangerousSettings(e, n),
    s = JE(e, n);
  markSandboxSettingConflicts([r, ...s.map(([, m]) => m)]);
  let a = {};
  for (let [m, f] of s) {
    let h = {
      shellSettings: f.hasHooks ? { ...f.shellSettings, hooks: Ve(f.hooks) } : f.shellSettings,
      envVars: f.envVars,
      sandboxSettings: f.sandboxSettings,
      isolationSettings: f.isolationSettings,
    };
    if (hasRiskySettings(h)) a[m] = h;
  }
  let { sandboxSwitches: sandboxSwitches, ...g } = r;
  return { ...g, payloadSlots: a };
}
/**
 * 遍历托管设置的危险键（含 policyHelpers.* 子项），收集命令文本与脚本大小。
 */
//@ chunk-dcmhvw5a.js:378429-380873 placement
function collectDangerousSettings(e, n) {
  let r = {},
    s;
  for (let S of DANGEROUS_SHELL_SETTINGS_LIST) {
    let C = e[S];
    if (S === "policyHelpers") {
      if (C !== null && typeof C === "object")
        for (let L of SUPPORTED_PLATFORMS) {
          let v = policyHelperCommand(C[L]);
          if (v) {
            if (((r[`policyHelpers.${L}`] = v.command), v.scriptSize))
              ((s ??= {}), (s[`policyHelpers.${L}`] = v.scriptSize));
          }
        }
      continue;
    }
    let w;
    if (typeof C === "string") w = C;
    else if (C !== null && typeof C === "object" && "command" in C && typeof C.command === "string")
      w = C.command;
    if (w !== void 0 && w.length > 0) r[S] = w;
  }
  let a = extraMarketplacesOf(e);
  if (a && typeof a === "object")
    for (let [S, C] of Object.entries(a)) {
      let w = C?.pluginDigests;
      if (w !== void 0 && w !== null && Object.keys(w).length > 0)
        r[`extraKnownMarketplaces[${jsonStringify(S)}].pluginDigests`] = Ve({
          pluginDigests: w,
          arming: pluginSlotDangerEntries(n, S, w),
        });
      let L = C?.source;
      if (!L || typeof L !== "object") continue;
      if (L.source === "url" && typeof L.headersHelper === "string" && L.headersHelper.length > 0)
        r[`extraKnownMarketplaces[${jsonStringify(S)}].source.headersHelper`] = _u(
          L.headersHelper,
          "url",
          L.url,
        );
      if (L.source === "settings" && Array.isArray(L.plugins)) {
        let v = new Map();
        for (let plugin of L.plugins) {
          let x = jsonStringify(plugin?.name),
            K = v.get(x) ?? 0;
          v.set(x, K + 1);
          let q = plugin?.source;
          if (
            q !== null &&
            typeof q === "object" &&
            "source" in q &&
            q.source === "command" &&
            "command" in q &&
            typeof q.command === "string" &&
            q.command.length > 0
          )
            r[
              `extraKnownMarketplaces[${jsonStringify(S)}].plugins[${jsonStringify(plugin.name)}][${K}].source.command`
            ] = q.command;
          if (typeof plugin?.headersHelper === "string" && plugin.headersHelper.length > 0) {
            let source = plugin.source,
              Z = source !== null && typeof source === "object";
            r[
              `extraKnownMarketplaces[${jsonStringify(S)}].plugins[${jsonStringify(plugin.name)}][${K}].headersHelper`
            ] = _u(
              plugin.headersHelper,
              Z && "source" in source ? source.source : void 0,
              Z && "url" in source ? source.url : void 0,
            );
          }
        }
      }
    }
  let sandbox = e.sandbox,
    g = {},
    m = {
      enabled: getAtPath_2(sandbox, "enabled"),
      enabledPlatforms: getAtPath_2(sandbox, "enabledPlatforms"),
      [NETWORK_ALLOWEDDOMAINS]: getAtPath_2(sandbox, NETWORK_ALLOWEDDOMAINS),
    };
  if (sandbox !== null && typeof sandbox === "object") {
    let S = { enabled: m.enabled, enabledPlatforms: m.enabledPlatforms };
    for (let C of Os) {
      let w = hookCommandText(sandbox[C]);
      if (w) r[`sandbox.${C}`] = Ve({ value: w, ...S });
    }
    for (let C of cu) {
      let w = getAtPath_2(sandbox, C);
      if (isMeaningfulValue(C, w))
        g[`sandbox.${C}`] = Ve({
          value: w,
          ...S,
          ...(Tu.has(C) && { allowedDomains: vu(m[NETWORK_ALLOWEDDOMAINS]) }),
        });
    }
  }
  let isolation = e.isolation,
    h = {};
  for (let S of uu) {
    let C = getAtPath_2(isolation, S);
    if (isRiskyIsolationValue(S, C)) h[`isolation.${S}`] = Ve({ value: C });
  }
  let y = {};
  if (e.env && typeof e.env === "object")
    for (let [S, C] of Object.entries(e.env)) {
      if (C === void 0) continue;
      let w = String(C);
      if (w.length > 0 && !IGNORED_ENV_VARS.has(S.toUpperCase()) && !isProtectedEnvVar(S, w)) y[S] = w;
    }
  let b =
    e.hooks !== void 0 && e.hooks !== null && typeof e.hooks === "object" && Object.keys(e.hooks).length > 0;
  return {
    shellSettings: r,
    inlineHelperScriptSizes: s,
    envVars: y,
    sandboxSettings: g,
    isolationSettings: h,
    hasHooks: b,
    hooks: b ? e.hooks : void 0,
    sandboxSwitches: m,
  };
}
//@ chunk-dcmhvw5a.js:380873-380929 placement
function JE(e, n) {
  return policyHelperSlots(e).map(([r, s]) => [r, collectDangerousSettings(s, n)]);
}
/**
 * 列出托管设置中各 policyHelpers 槽位的配置（去掉嵌套的 policyHelper/policyHelpers 字段）。
 */
//@ chunk-dcmhvw5a.js:380929-381092 placement
function policyHelperSlots(e) {
  let n = [];
  for (let r of Ru) {
    let s = `policyHelpers.${r}`,
      a = getAtPath_2(e, s);
    if (!isPlainObject(a)) continue;
    let { policyHelper: policyHelper, policyHelpers: policyHelpers, ...m } = a;
    n.push([s, m]);
  }
  return n;
}
//@ chunk-dcmhvw5a.js:381092-381169 placement
function Ps(e) {
  return SUPPORTED_PLATFORMS.find((n) => e === `policyHelpers.${n}.defaultSettings`);
}
/**
 * 判断某个设置对应的 policyHelper 是否为 merge 输出行为。
 */
//@ chunk-dcmhvw5a.js:381169-381269 placement
function isMergingPolicyHelper(e, n) {
  let r = Ps(n);
  return r !== void 0 && getAtPath_2(e, `policyHelpers.${r}.outputBehavior`) === "merge";
}
/**
 * 在多份托管设置摘要间标出沙箱设置的重叠与冲突。
 */
//@ chunk-dcmhvw5a.js:381269-381754 placement
function markSandboxSettingConflicts(e) {
  let mapped = e.map(
      (s) =>
        Object.keys(s.sandboxSettings).length > 0 ||
        Os.some((a) => s.shellSettings[`sandbox.${a}`] !== void 0),
    ),
    mapped_2 = e.map((s) => [...Tu].some((a) => s.sandboxSettings[`sandbox.${a}`] !== void 0));
  e.forEach((s, a) => {
    if (mapped.some((c, g) => c && g !== a))
      for (let c of SANDBOX_TOGGLE_KEYS) {
        let g = s.sandboxSwitches[c];
        if (g !== void 0) s.sandboxSettings[`sandbox.${c}`] = Ve({ value: g });
      }
    if (mapped_2.some((c, g) => c && g !== a)) {
      let c = s.sandboxSwitches[NETWORK_ALLOWEDDOMAINS];
      if (c !== void 0) s.sandboxSettings[`sandbox.${NETWORK_ALLOWEDDOMAINS}`] = Ve({ value: vu(c) ?? c });
    }
  });
}
//@ chunk-dcmhvw5a.js:381754-381812 placement
var Ru = [...SUPPORTED_PLATFORMS.map((e) => `${e}.defaultSettings`), "default"];
/**
 * 列出载荷中含危险内容的 policyHelpers 槽位。
 */
//@ chunk-dcmhvw5a.js:381812-381944 placement
function riskyPayloadSlots(e) {
  let n = [];
  for (let r of Ru) {
    let s = `policyHelpers.${r}`,
      a = e.payloadSlots[s];
    if (a !== void 0 && hasRiskySettings(a)) n.push([s, a]);
  }
  return n;
}
//@ chunk-dcmhvw5a.js:381944-382011 placement
function TPi(e, n) {
  let r = e.payloadSlots[n];
  return r !== void 0 && hasRiskySettings(r);
}
//@ chunk-dcmhvw5a.js:382011-382188 placement
function hasRiskySettings(e) {
  return (
    Object.keys(e.shellSettings).length > 0 ||
    Object.keys(e.envVars).length > 0 ||
    Object.keys(e.sandboxSettings).length > 0 ||
    Object.keys(e.isolationSettings).length > 0
  );
}
//@ chunk-dcmhvw5a.js:382188-382243 placement
var Tu = new Set(["credentials", "network.tlsTerminate"]);
//@ chunk-dcmhvw5a.js:382243-382334 placement
function vu(e) {
  return Array.isArray(e) ? uniq(e.filter((n) => typeof n === "string")).sort() : void 0;
}
//@ chunk-dcmhvw5a.js:382334-382442 placement
function getAtPath_2(e, n) {
  let r = e;
  for (let s of n.split(".")) {
    if (r === null || typeof r !== "object") return;
    r = r[s];
  }
  return r;
}
//@ chunk-dcmhvw5a.js:382442-382577 placement
function isMeaningfulValue(e, n) {
  if (n === void 0 || n === null || n === !1) return !1;
  if (Array.isArray(n) && n.length === 0) return !1;
  return !(e === "credentials" && isCredentialsSettingShape(n));
}
//@ chunk-dcmhvw5a.js:382577-382804 placement
function isRiskyIsolationValue(e, n) {
  if (n === void 0 || n === null) return !1;
  switch (e) {
    case "required":
      return n !== !1;
    case "egress":
      return (
        !isPlainObject(n) ||
        Object.entries(n).some(([r, s]) =>
          QE.has(r) ? s !== void 0 && s !== null && !(Array.isArray(s) && s.length === 0) : s !== void 0,
        )
      );
  }
}
//@ chunk-dcmhvw5a.js:382804-382851 placement
var QE = new Set(["allowedHosts", "deniedHosts"]);
/**
 * 判断 credentials 设置是否为合法形状（files/envVars 条目带 mode）。
 */
//@ chunk-dcmhvw5a.js:382851-383237 placement
function isCredentialsSettingShape(e) {
  if (typeof e !== "object" || e === null) return !1;
  return Object.entries(e).every(([n, r]) => {
    if (r === void 0) return !0;
    if (n === "files" || n === "envVars")
      return Array.isArray(r) && r.every((s) => typeof s === "object" && s !== null && s.mode === "deny");
    if (n === "sigv4")
      return (
        typeof r === "object" && r !== null && Object.values(r).every((s) => s === void 0 || s === "deny")
      );
    return n === "allowPlaintextInject" && r === !1;
  });
}
//@ chunk-dcmhvw5a.js:383237-383297 fingerprint = hasDangerousSettingsChanged (0.574)
function hasDangerousSettingsChanged(e) {
  return Object.keys(e.shellSettings).some(Pu);
}
//@ chunk-dcmhvw5a.js:383297-383358 placement
function Pu(e) {
  return SUPPORTED_PLATFORMS.some((n) => e === `policyHelpers.${n}`);
}
/**
 * 判断托管设置是否需要用户确认：危险设置有变化、新增 extraKnownMarketplaces，或存在危险的 policyHelpers 槽位。
 */
//@ chunk-dcmhvw5a.js:383358-383483 placement
function needsManagedSettingsConsent(e) {
  return (
    hasDangerousSettingsChanged(e) ||
    Object.keys(e.shellSettings).some((n) => n.startsWith("extraKnownMarketplaces[")) ||
    riskyPayloadSlots(e).length > 0
  );
}
//@ chunk-dcmhvw5a.js:383483-383526 placement
function xu(e) {
  return e === "sh" || e === "pwsh";
}
/**
 * 判断 policyHelper 配置是否为内联脚本形式（合法 interpreter + 字符串 script）。
 */
//@ chunk-dcmhvw5a.js:383526-383658 placement
function isInlineScriptHelper(e) {
  return (
    e !== null &&
    typeof e === "object" &&
    "interpreter" in e &&
    xu(e.interpreter) &&
    "script" in e &&
    typeof e.script === "string"
  );
}
/**
 * 取 policyHelper 配置对应的命令文本。
 */
//@ chunk-dcmhvw5a.js:383658-383696 placement
function getPolicyHelperCommand(e) {
  return policyHelperCommand(e)?.command;
}
//@ chunk-dcmhvw5a.js:383696-383995 placement
function policyHelperCommand(e) {
  if (e === null || typeof e !== "object") return;
  let {
      path: path,
      script: script,
      interpreter: interpreter,
      timeoutMs: timeoutMs,
      refreshIntervalMs: refreshIntervalMs,
    } = e,
    g,
    m;
  if (typeof path === "string" && path) g = path;
  else if (typeof script === "string" && script && xu(interpreter))
    ((g = { interpreter: interpreter, script: Nu(script) }), (m = oC(script)));
  else return;
  return { command: jsonStringify([g, timeoutMs ?? null, refreshIntervalMs ?? null]), scriptSize: m };
}
//@ chunk-dcmhvw5a.js:384090-384121 placement
function Nu(e) {
  return computeContentHash(jsonStringify(e));
}
//@ chunk-dcmhvw5a.js:384121-384364 placement
function hookCommandText(e) {
  if (typeof e === "string") return e || void 0;
  if (e === null || typeof e !== "object" || !("command" in e) || typeof e.command !== "string" || !e.command)
    return;
  let n = "args" in e && Array.isArray(e.args) ? e.args.map(String) : [];
  return jsonStringify([e.command, ...n]);
}
/**
 * 摘要中是否含任何需要确认的危险设置（含 hooks 与 payload 槽位）。
 */
//@ chunk-dcmhvw5a.js:384364-384421 placement
function hasDangerousManagedSettings(e) {
  return hasRiskySettings(e) || e.hasHooks || riskyPayloadSlots(e).length > 0;
}
//@ chunk-dcmhvw5a.js:384421-384453 placement
function vs(e) {
  return Ve(dangerousSettingsDigestInput(e));
}
/**
 * 生成用于计算同意摘要哈希的危险设置对象。
 */
//@ chunk-dcmhvw5a.js:384453-384763 placement
function dangerousSettingsDigestInput(e) {
  return {
    shellSettings: e.shellSettings,
    envVars: e.envVars,
    sandboxSettings: Object.keys(e.sandboxSettings).length > 0 ? e.sandboxSettings : void 0,
    ...isolationSettingsField(e),
    hooks: e.hooks,
    payloadSlots:
      riskyPayloadSlots(e).length > 0
        ? Object.fromEntries(
            riskyPayloadSlots(e).map(([n, r]) => {
              let { isolationSettings: isolationSettings, ...a } = r;
              return [n, { ...a, ...isolationSettingsField(r) }];
            }),
          )
        : void 0,
  };
}
//@ chunk-dcmhvw5a.js:384763-384870 placement
function isolationSettingsField(e) {
  return Object.keys(e.isolationSettings).length > 0 ? { isolationSettings: e.isolationSettings } : {};
}
/**
 * 为托管设置里的插件槽位（enabledPlugins、prepend/appendPlugins 等）生成危险项条目。
 */
//@ chunk-dcmhvw5a.js:384870-385347 placement
function pluginSlotDangerEntries(e, n, r) {
  let s = new Set(Object.keys(r).map((a) => nfcLower(`${a}@${n}`)));
  return e.flatMap(([a, c]) =>
    [
      "enabledPlugins",
      "prependPlugins",
      "appendPlugins",
      "managedSourcesBehavior",
      "outputBehavior",
      "slotPresent",
    ].flatMap((g) => {
      let m = c[g],
        f = g === "enabledPlugins" ? isPlainObject(m) : Array.isArray(m);
      if (m === void 0) return [];
      if (!f) return [[a, `${g}:whole`, m]];
      return (isPlainObject(m) ? Object.entries(m).toSorted() : [m].flat().map((y) => [y]))
        .filter(([y]) => typeof y !== "string" || s.has(nfcLower(y)))
        .map((y) => [a, g, ...y]);
    }),
  );
}
//@ chunk-dcmhvw5a.js:385347-385378 placement
function Ve(e) {
  return jsonStringify(sortKeysDeep(e));
}
//@ chunk-dcmhvw5a.js:385378-385411 placement
function hbr(e) {
  return computeContentHash(vs(e));
}
/**
 * 判断托管设置摘要是否与已同意的哈希一致（直接比较，或加入 CLAUDE.md 内容后重算比较）。
 */
//@ chunk-dcmhvw5a.js:385411-385527 placement
function matchesConsentedHash(e, n, r) {
  if (hbr(n) === e) return !0;
  return (
    typeof r === "string" &&
    r.length > 0 &&
    computeContentHash(Ve({ ...dangerousSettingsDigestInput(n), claudeMd: r })) === e
  );
}
/**
 * 解析 headersHelper 的 JSON 三元组，取出命令与可选 URL。
 */
//@ chunk-dcmhvw5a.js:385527-385683 placement
function parseHeadersHelperCommand(e) {
  let n = safeParseJSON(e, !1);
  if (!Array.isArray(n) || n.length !== 3 || typeof n[0] !== "string") return;
  return { command: n[0], url: typeof n[2] === "string" ? n[2] : void 0 };
}
//@ chunk-dcmhvw5a.js:385683-385770 placement
function _u(e, n, r) {
  return jsonStringify([e, typeof n === "string" ? n : null, typeof r === "string" ? r : null]);
}
//@ chunk-dcmhvw5a.js:385770-385868 placement
function yu(e, n) {
  let r = summarizeManagedSettingsRisk(e),
    s = summarizeManagedSettingsRisk(n);
  if (!hasDangerousManagedSettings(s)) return !1;
  if (!hasDangerousManagedSettings(r)) return !0;
  return vs(r) !== vs(s);
}
/**
 * 判断已同意的托管设置是否需要重新征求同意：按同意来源（已同意的 payload 或组织记录）比较当前危险项与哈希/已同意内容。
 */
//@ chunk-dcmhvw5a.js:385868-386089 placement
function managedSettingsNeedReconsent(e, n) {
  switch (e.source) {
    case "consented_payload":
      return yu(e.settings, n);
    case "org_record": {
      let r = summarizeManagedSettingsRisk(n);
      if (!hasDangerousManagedSettings(r)) return !1;
      if (matchesConsentedHash(e.dangerousSettingsHash, r, n?.claudeMd)) return !1;
      return yu(e.consentedPayload, n);
    }
  }
}
//@ chunk-dcmhvw5a.js:386089-387329 fingerprint = extractDangerousSettings (0.426)
function extractDangerousSettings(e, n) {
  let r = summarizeManagedSettingsRisk(e),
    s = {},
    a = diffSettingsMap(r.shellSettings, n.shellSettings, s),
    c = {},
    g = diffSettingsMap(r.envVars, n.envVars, c),
    m = {},
    f = diffSettingsMap(r.sandboxSettings, n.sandboxSettings, m),
    h = {},
    y = diffSettingsMap(r.isolationSettings, n.isolationSettings, h),
    b = a.unchanged + g.unchanged + f.unchanged + y.unchanged,
    S = a.removed + g.removed + f.removed + y.removed;
  if (r.hasHooks && !n.hasHooks) S++;
  let hasHooks = n.hasHooks && !(r.hasHooks && Ve(r.hooks) === Ve(n.hooks));
  if (n.hasHooks && !hasHooks) b++;
  let w = {};
  for (let [L, v] of riskyPayloadSlots(n)) {
    let j = r.payloadSlots[L],
      x = { shellSettings: {}, envVars: {}, sandboxSettings: {}, isolationSettings: {} };
    for (let { unchanged: unchanged, removed: removed } of [
      diffSettingsMap(j?.shellSettings ?? {}, v.shellSettings, x.shellSettings),
      diffSettingsMap(j?.envVars ?? {}, v.envVars, x.envVars),
      diffSettingsMap(j?.sandboxSettings ?? {}, v.sandboxSettings, x.sandboxSettings),
      diffSettingsMap(j?.isolationSettings ?? {}, v.isolationSettings, x.isolationSettings),
    ])
      ((b += unchanged), (S += removed));
    if (hasRiskySettings(x)) w[L] = x;
  }
  for (let [L, v] of riskyPayloadSlots(r))
    if (n.payloadSlots[L] === void 0)
      S +=
        Object.keys(v.shellSettings).length +
        Object.keys(v.envVars).length +
        Object.keys(v.sandboxSettings).length +
        Object.keys(v.isolationSettings).length;
  return {
    changed: {
      shellSettings: s,
      inlineHelperScriptSizes: n.inlineHelperScriptSizes,
      envVars: c,
      sandboxSettings: m,
      isolationSettings: h,
      hasHooks: hasHooks,
      hooks: hasHooks ? n.hooks : void 0,
      payloadSlots: w,
    },
    unchangedCount: b,
    removedCount: S,
  };
}
//@ chunk-dcmhvw5a.js:387329-387554 layout
function diffSettingsMap(e, n, r) {
  let s = 0;
  for (let [c, g] of Object.entries(n)) {
    if (g === void 0) continue;
    if (Object.hasOwn(e, c) && e[c] === g) s++;
    else r[c] = g;
  }
  let a = 0;
  for (let c of Object.keys(e)) if (!Object.hasOwn(n, c)) a++;
  return { unchanged: s, removed: a };
}
/**
 * OTLP 导出端点环境变量名的匹配正则（含 traces/logs/metrics 及 ANT_ 前缀版本），以及增强遥测开关变量名集合。
 */
//@ chunk-dcmhvw5a.js:387554-387850 layout
var OTLP_ENDPOINT_RE = /^OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT$/,
  OTLP_TRACES_ENDPOINT_RE = /^OTEL_EXPORTER_OTLP_(?:TRACES_)?ENDPOINT$/,
  OTLP_ANY_ENDPOINT_RE =
    /^(?:ANT_OTEL_EXPORTER_OTLP_ENDPOINT|OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT)$/,
  ENHANCED_TELEMETRY_VARS = new Set([
    "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA",
    "ENABLE_ENHANCED_TELEMETRY_BETA",
  ]);
/**
 * 托管设置的危险项是否只有 OTLP 遥测端点（及增强遥测开关）而无 hooks/shell/沙箱/隔离设置——此类改动可简化确认。
 */
//@ chunk-dcmhvw5a.js:387850-388090 layout
function isTelemetryOnlyChange(e, n) {
  let r = n ? summarizeManagedSettingsRisk(n) : e,
    s = [r, ...riskyPayloadSlots(r).map(([, a]) => a)];
  return (
    onlyTelemetryEnvVars(e) &&
    onlyTelemetryEnvVars(r) &&
    !r.hasHooks &&
    s.every(
      (a) =>
        Object.keys(a.shellSettings).length === 0 &&
        Object.keys(a.sandboxSettings).length === 0 &&
        Object.keys(a.isolationSettings).length === 0,
    )
  );
}
//@ chunk-dcmhvw5a.js:388090-388361 fingerprint = hasDangerousSettings (0.736)
function hasDangerousSettings(e, n) {
  let r = n ? summarizeManagedSettingsRisk(n) : e,
    s = [r, ...riskyPayloadSlots(r).map(([, a]) => a)];
  return (
    !r.hasHooks &&
    s.some((a) => Object.keys(a.isolationSettings).length > 0) &&
    s.every(
      (a) =>
        Object.keys(a.shellSettings).length === 0 &&
        Object.keys(a.envVars).length === 0 &&
        Object.keys(a.sandboxSettings).length === 0,
    )
  );
}
//@ chunk-dcmhvw5a.js:388361-388586 affinity
function onlyTelemetryEnvVars(e) {
  let n = describeEnvRows(e),
    r = (a) => a.url !== void 0 && OTLP_ENDPOINT_RE.test(a.key.toUpperCase()),
    s =
      !n.some((a) => a.tracesSwitch === !0) ||
      n.some((a) => r(a) && OTLP_TRACES_ENDPOINT_RE.test(a.key.toUpperCase()));
  return n.some(r) && s && n.every((a) => r(a) || a.tracesSwitch === !0);
}

export {
  getPluginDisplayName,
  describeArchiveFetchCommand,
  printablePluginName,
  Tct,
  sanitizePluginManifestForDisplay,
  summarizeManagedSettingsRisk,
  extractDangerousSettings,
  hasDangerousManagedSettings,
  isTelemetryOnlyChange,
  hasDangerousSettings,
  hbr,
  managedSettingsNeedReconsent,
  isInlineScriptHelper,
  Nu,
  riskyPayloadSlots,
  ENHANCED_TELEMETRY_VARS,
  OTLP_ANY_ENDPOINT_RE,
  Pu,
  escapeNonPrintable,
  parseHeadersHelperCommand,
  needsManagedSettingsConsent,
  matchesConsentedHash,
  isMergingPolicyHelper,
  policyHelperSlots,
  Ps,
  TPi,
  getPolicyHelperCommand,
};
