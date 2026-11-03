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
  cleanOptionalText_2,
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
  cleanOptionalText,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { redactUrlCredentials } from "../../utils/plugins/marketplaceManager.js";
import { displaySafeUrl, REDACTED_URL } from "../../utils/redaction/urlRedaction.js";
import { SUPPORTED_PLATFORMS } from "../../utils/settings/types.js";
import {
  DANGEROUS_SHELL_SETTINGS_LIST,
  SANDBOX_BINARY_SETTINGS,
  SANDBOX_SETTINGS_KEYS,
  SANDBOX_NETWORK_MODE_VALUES,
  isProtectedEnvVar,
} from "../../utils/managedEnvConstants.js";
import { extraMarketplacesOf, describeEnvRows } from "../../utils/settings/otelEndpointValidation.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { uniq } from "../../utils/collections.js";
import { editSizeOf } from "../FileEditToolUpdatedMessage.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { safeParseJSON } from "../../utils/json.js";

//@ chunk-dcmhvw5a.js:376544-376884 placement
/**
 * 清洗插件清单里要展示的字段（显示名、版本、描述、作者），去掉不可打印字符并截断。
 */
function sanitizePluginManifestForDisplay(manifest) {
  return {
    ...manifest,
    displayName: cleanOptionalText_2(manifest.displayName),
    version: cleanOptionalText_2(manifest.version),
    description: cleanOptionalText_2(manifest.description, stripInvisibleKeepNewlines),
    author:
      manifest.author === undefined
        ? undefined
        : {
            ...manifest.author,
            name: stripInvisibleKeepEmoji(manifest.author.name),
            email: cleanOptionalText_2(manifest.author.email),
            url: redactUrlCredentials(manifest.author.url),
          },
    homepage: redactUrlCredentials(manifest.homepage),
    repository: redactUrlCredentials(manifest.repository),
    license: cleanOptionalText_2(manifest.license),
    keywords: manifest.keywords?.map(stripInvisibleKeepEmoji),
  };
}
//@ chunk-dcmhvw5a.js:376884-376912 placement
/**
 * 把插件名转成可打印形式。
 */
function printablePluginName(e) {
  return cleanOptionalText(e);
}
//@ chunk-dcmhvw5a.js:376912-377097 placement
/**
 * 取插件可显示名称：清单 displayName → 名称 → 来源，都不可打印时返回占位文字。
 */
function getPluginDisplayName(e) {
  let displayName = hasManifest(e) ? e.manifest.displayName : e.displayName;
  return (
    trimmedOrUndefined(
      typeof displayName === "string" ? stripInvisibleKeepEmoji(displayName).trim() : displayName,
    ) ??
    trimmedOrUndefined(printablePluginName(e.name)) ??
    trimmedOrUndefined(printablePluginName(hasManifest(e) ? e.source : "")) ??
    "(unprintable plugin name)"
  );
}
//@ chunk-dcmhvw5a.js:377097-377168 placement
/**
 * 函数 trimmedOrUndefined（trim 后为空返回 undefined）；位于「托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化」模块。
 */
function trimmedOrUndefined(displayName) {
  if (typeof displayName !== "string") return;
  return displayName.trim() ? displayName : undefined;
}
//@ chunk-dcmhvw5a.js:377168-377253 placement
function hasManifest(e) {
  return "manifest" in e && typeof e.manifest === "object" && e.manifest !== null;
}
//@ chunk-dcmhvw5a.js:377253-377396 placement
var HIDDEN_CHARS_WARNING =
  "The command contains non-ASCII, hidden or control characters (shown as \\u{\u2026} escapes). Do not proceed unless you expected them.";
//@ chunk-dcmhvw5a.js:377396-377534 placement
/**
 * 描述插件归档下载的 headersHelper 命令（目的地、隐藏字符警告、转义后的命令）。
 */
function describeArchiveFetchCommand(e) {
  let { text, escaped } = escapeNonPrintable(e.command);
  return {
    destination: displaySafeUrl(e.archiveUrl) ?? REDACTED_URL,
    hiddenCharactersWarning: escaped ? HIDDEN_CHARS_WARNING : null,
    command: text,
  };
}
//@ chunk-dcmhvw5a.js:377534-377702 placement
/**
 * 把不可打印字符（及反斜杠）转义为 \u{…} 形式，返回转义后文本及是否发生转义。
 */
function escapeNonPrintable(command) {
  let escaped = false;
  return {
    text: command.replace(/[^\x20-\x5b\x5d-\x7e]/gu, (s) => {
      if (s === "\\") return "\\\\";
      escaped = true;
      return `\\u{${s.codePointAt(0).toString(16)}}`;
    }),
    escaped,
  };
}
//@ chunk-dcmhvw5a.js:377702-377810 placement
var SANDBOX_TOGGLE_KEYS = ["enabled", "enabledPlatforms"];
var NETWORK_ALLOWEDDOMAINS = "network.allowedDomains";
var IGNORED_ENV_VARS = new Set(["OTEL_LOG_MANAGED_SETTINGS"]);
//@ chunk-dcmhvw5a.js:377810-378429 placement
/**
 * 汇总托管设置文档里需要用户确认的危险项（shell 设置、环境变量、沙箱、隔离、hooks、policyHelpers 槽位）。
 */
function summarizeManagedSettingsRisk(e) {
  if (!e)
    return {
      shellSettings: {},
      envVars: {},
      sandboxSettings: {},
      isolationSettings: {},
      hasHooks: false,
      payloadSlots: {},
    };
  let n = [
    ["top", e],
    ...policyHelperSlots(e),
    ...policyHelperSlots(e).map(([m]) => [
      m,
      {
        slotPresent: true,
      },
    ]),
    ...SUPPORTED_PLATFORMS.map((m) => [
      `policyHelpers.${m}`,
      {
        outputBehavior: getAtPath_2(e, `policyHelpers.${m}.outputBehavior`),
      },
    ]),
  ];
  let dangerousSettings = collectDangerousSettings(e, n);
  let s = mapSettingsValues(e, n);
  markSandboxSettingConflicts([dangerousSettings, ...s.map(([, m]) => m)]);
  let a = {};
  for (let [m, f] of s) {
    let h = {
      shellSettings: f.hasHooks
        ? {
            ...f.shellSettings,
            hooks: toCanonicalPath(f.hooks),
          }
        : f.shellSettings,
      envVars: f.envVars,
      sandboxSettings: f.sandboxSettings,
      isolationSettings: f.isolationSettings,
    };
    if (hasRiskySettings(h)) a[m] = h;
  }
  let { sandboxSwitches, ...g } = dangerousSettings;
  return {
    ...g,
    payloadSlots: a,
  };
}
//@ chunk-dcmhvw5a.js:378429-380873 placement
/**
 * 遍历托管设置的危险键（含 policyHelpers.* 子项），收集命令文本与脚本大小。
 */
function collectDangerousSettings(e, n) {
  let r = {};
  let s;
  for (let S of DANGEROUS_SHELL_SETTINGS_LIST) {
    let C = e[S];
    if (S === "policyHelpers") {
      if (C !== null && typeof C === "object")
        for (let L of SUPPORTED_PLATFORMS) {
          let v = policyHelperCommand(C[L]);
          if (v) {
            r[`policyHelpers.${L}`] = v.command;
            if (v.scriptSize) {
              s ??= {};
              s[`policyHelpers.${L}`] = v.scriptSize;
            }
          }
        }
      continue;
    }
    let w;
    if (typeof C === "string") w = C;
    else if (C !== null && typeof C === "object" && "command" in C && typeof C.command === "string")
      w = C.command;
    if (w !== undefined && w.length > 0) r[S] = w;
  }
  let a = extraMarketplacesOf(e);
  if (a && typeof a === "object")
    for (let [key, value] of Object.entries(a)) {
      let pluginDigests = value?.pluginDigests;
      if (pluginDigests !== undefined && pluginDigests !== null && Object.keys(pluginDigests).length > 0)
        r[`extraKnownMarketplaces[${jsonStringify(key)}].pluginDigests`] = toCanonicalPath({
          pluginDigests,
          arming: pluginSlotDangerEntries(n, key, pluginDigests),
        });
      let source = value?.source;
      if (!source || typeof source !== "object") continue;
      if (
        source.source === "url" &&
        typeof source.headersHelper === "string" &&
        source.headersHelper.length > 0
      )
        r[`extraKnownMarketplaces[${jsonStringify(key)}].source.headersHelper`] = joinPathParts(
          source.headersHelper,
          "url",
          source.url,
        );
      if (source.source === "settings" && Array.isArray(source.plugins)) {
        let v = new Map();
        for (let plugin of source.plugins) {
          let x = jsonStringify(plugin?.name);
          let K = v.get(x) ?? 0;
          v.set(x, K + 1);
          let source = plugin?.source;
          if (
            source !== null &&
            typeof source === "object" &&
            "source" in source &&
            source.source === "command" &&
            "command" in source &&
            typeof source.command === "string" &&
            source.command.length > 0
          )
            r[
              `extraKnownMarketplaces[${jsonStringify(key)}].plugins[${jsonStringify(plugin.name)}][${K}].source.command`
            ] = source.command;
          if (typeof plugin?.headersHelper === "string" && plugin.headersHelper.length > 0) {
            let source = plugin.source;
            let Z = source !== null && typeof source === "object";
            r[
              `extraKnownMarketplaces[${jsonStringify(key)}].plugins[${jsonStringify(plugin.name)}][${K}].headersHelper`
            ] = joinPathParts(
              plugin.headersHelper,
              Z && "source" in source ? source.source : undefined,
              Z && "url" in source ? source.url : undefined,
            );
          }
        }
      }
    }
  let sandbox = e.sandbox;
  let g = {};
  let m = {
    enabled: getAtPath_2(sandbox, "enabled"),
    enabledPlatforms: getAtPath_2(sandbox, "enabledPlatforms"),
    [NETWORK_ALLOWEDDOMAINS]: getAtPath_2(sandbox, NETWORK_ALLOWEDDOMAINS),
  };
  if (sandbox !== null && typeof sandbox === "object") {
    let S = {
      enabled: m.enabled,
      enabledPlatforms: m.enabledPlatforms,
    };
    for (let C of SANDBOX_BINARY_SETTINGS) {
      let w = hookCommandText(sandbox[C]);
      if (w)
        r[`sandbox.${C}`] = toCanonicalPath({
          value: w,
          ...S,
        });
    }
    for (let C of SANDBOX_SETTINGS_KEYS) {
      let atPath = getAtPath_2(sandbox, C);
      if (isMeaningfulValue(C, atPath))
        g[`sandbox.${C}`] = toCanonicalPath({
          value: atPath,
          ...S,
          ...(SENSITIVE_POLICY_KEYS.has(C) && {
            allowedDomains: sortedStringList(m[NETWORK_ALLOWEDDOMAINS]),
          }),
        });
    }
  }
  let isolation = e.isolation;
  let h = {};
  for (let S of SANDBOX_NETWORK_MODE_VALUES) {
    let atPath = getAtPath_2(isolation, S);
    if (isRiskyIsolationValue(S, atPath))
      h[`isolation.${S}`] = toCanonicalPath({
        value: atPath,
      });
  }
  let y = {};
  if (e.env && typeof e.env === "object")
    for (let [key, value] of Object.entries(e.env)) {
      if (value === undefined) continue;
      let w = String(value);
      if (w.length > 0 && !IGNORED_ENV_VARS.has(key.toUpperCase()) && !isProtectedEnvVar(key, w)) y[key] = w;
    }
  let b =
    e.hooks !== undefined &&
    e.hooks !== null &&
    typeof e.hooks === "object" &&
    Object.keys(e.hooks).length > 0;
  return {
    shellSettings: r,
    inlineHelperScriptSizes: s,
    envVars: y,
    sandboxSettings: g,
    isolationSettings: h,
    hasHooks: b,
    hooks: b ? e.hooks : undefined,
    sandboxSwitches: m,
  };
}
//@ chunk-dcmhvw5a.js:380873-380929 placement
function mapSettingsValues(e, n) {
  return policyHelperSlots(e).map(([r, s]) => [r, collectDangerousSettings(s, n)]);
}
//@ chunk-dcmhvw5a.js:380929-381092 placement
/**
 * 列出托管设置中各 policyHelpers 槽位的配置（去掉嵌套的 policyHelper/policyHelpers 字段）。
 */
function policyHelperSlots(e) {
  let n = [];
  for (let r of POLICY_HELPER_SETTING_PATHS) {
    let s = `policyHelpers.${r}`;
    let atPath = getAtPath_2(e, s);
    if (!isPlainObject(atPath)) continue;
    let { policyHelper, policyHelpers, ...m } = atPath;
    n.push([s, m]);
  }
  return n;
}
//@ chunk-dcmhvw5a.js:381092-381169 placement
function isPolicyHelperPath(e) {
  return SUPPORTED_PLATFORMS.find((n) => e === `policyHelpers.${n}.defaultSettings`);
}
//@ chunk-dcmhvw5a.js:381169-381269 placement
/**
 * 判断某个设置对应的 policyHelper 是否为 merge 输出行为。
 */
function isMergingPolicyHelper(e, n) {
  let r = isPolicyHelperPath(n);
  return r !== undefined && getAtPath_2(e, `policyHelpers.${r}.outputBehavior`) === "merge";
}
//@ chunk-dcmhvw5a.js:381269-381754 placement
/**
 * 在多份托管设置摘要间标出沙箱设置的重叠与冲突。
 */
function markSandboxSettingConflicts(e) {
  let mapped = e.map(
    (s) =>
      Object.keys(s.sandboxSettings).length > 0 ||
      SANDBOX_BINARY_SETTINGS.some((a) => s.shellSettings[`sandbox.${a}`] !== undefined),
  );
  let mapped_2 = e.map((s) =>
    [...SENSITIVE_POLICY_KEYS].some((a) => s.sandboxSettings[`sandbox.${a}`] !== undefined),
  );
  e.forEach((s, a) => {
    if (mapped.some((c, g) => c && g !== a))
      for (let c of SANDBOX_TOGGLE_KEYS) {
        let g = s.sandboxSwitches[c];
        if (g !== undefined)
          s.sandboxSettings[`sandbox.${c}`] = toCanonicalPath({
            value: g,
          });
      }
    if (mapped_2.some((c, g) => c && g !== a)) {
      let c = s.sandboxSwitches[NETWORK_ALLOWEDDOMAINS];
      if (c !== undefined)
        s.sandboxSettings[`sandbox.${NETWORK_ALLOWEDDOMAINS}`] = toCanonicalPath({
          value: sortedStringList(c) ?? c,
        });
    }
  });
}
//@ chunk-dcmhvw5a.js:381754-381812 placement
var POLICY_HELPER_SETTING_PATHS = [...SUPPORTED_PLATFORMS.map((e) => `${e}.defaultSettings`), "default"];
//@ chunk-dcmhvw5a.js:381812-381944 placement
/**
 * 列出载荷中含危险内容的 policyHelpers 槽位。
 */
function riskyPayloadSlots(e) {
  let n = [];
  for (let r of POLICY_HELPER_SETTING_PATHS) {
    let s = `policyHelpers.${r}`;
    let a = e.payloadSlots[s];
    if (a !== undefined && hasRiskySettings(a)) n.push([s, a]);
  }
  return n;
}
//@ chunk-dcmhvw5a.js:381944-382011 placement
/**
 * 函数 hasPayloadSlot（payloadSlots 有条目）；位于「托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化」模块。
 */
function hasPayloadSlot(e, sourceField) {
  let r = e.payloadSlots[sourceField];
  return r !== undefined && hasRiskySettings(r);
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
var SENSITIVE_POLICY_KEYS = new Set(["credentials", "network.tlsTerminate"]);
//@ chunk-dcmhvw5a.js:382243-382334 placement
function sortedStringList(e) {
  return Array.isArray(e) ? uniq(e.filter((n) => typeof n === "string")).sort() : undefined;
}
//@ chunk-dcmhvw5a.js:382334-382442 placement
function getAtPath_2(sandbox, n) {
  let r = sandbox;
  for (let s of n.split(".")) {
    if (r === null || typeof r !== "object") return;
    r = r[s];
  }
  return r;
}
//@ chunk-dcmhvw5a.js:382442-382577 placement
function isMeaningfulValue(e, atPath) {
  if (atPath === undefined || atPath === null || atPath === false) return false;
  if (Array.isArray(atPath) && atPath.length === 0) return false;
  return !(e === "credentials" && isCredentialsSettingShape(atPath));
}
//@ chunk-dcmhvw5a.js:382577-382804 placement
function isRiskyIsolationValue(e, atPath) {
  if (atPath === undefined || atPath === null) return false;
  switch (e) {
    case "required":
      return atPath !== false;
    case "egress":
      return (
        !isPlainObject(atPath) ||
        Object.entries(atPath).some(([key, value]) =>
          NETWORK_HOST_KEYS.has(key)
            ? value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)
            : value !== undefined,
        )
      );
  }
}
//@ chunk-dcmhvw5a.js:382804-382851 placement
var NETWORK_HOST_KEYS = new Set(["allowedHosts", "deniedHosts"]);
//@ chunk-dcmhvw5a.js:382851-383237 placement
/**
 * 判断 credentials 设置是否为合法形状（files/envVars 条目带 mode）。
 */
function isCredentialsSettingShape(e) {
  if (typeof e !== "object" || e === null) return false;
  return Object.entries(e).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === "files" || key === "envVars")
      return (
        Array.isArray(value) && value.every((s) => typeof s === "object" && s !== null && s.mode === "deny")
      );
    if (key === "sigv4")
      return (
        typeof value === "object" &&
        value !== null &&
        Object.values(value).every((s) => s === undefined || s === "deny")
      );
    return key === "allowPlaintextInject" && value === false;
  });
}
//@ chunk-dcmhvw5a.js:383237-383297 fingerprint = hasDangerousSettingsChanged (0.574)
function hasDangerousSettingsChanged(e) {
  return Object.keys(e.shellSettings).some(isPolicyHelperName);
}
//@ chunk-dcmhvw5a.js:383297-383358 placement
function isPolicyHelperName(e) {
  return SUPPORTED_PLATFORMS.some((n) => e === `policyHelpers.${n}`);
}
//@ chunk-dcmhvw5a.js:383358-383483 placement
/**
 * 判断托管设置是否需要用户确认：危险设置有变化、新增 extraKnownMarketplaces，或存在危险的 policyHelpers 槽位。
 */
function needsManagedSettingsConsent(e) {
  return (
    hasDangerousSettingsChanged(e) ||
    Object.keys(e.shellSettings).some((key) => key.startsWith("extraKnownMarketplaces[")) ||
    riskyPayloadSlots(e).length > 0
  );
}
//@ chunk-dcmhvw5a.js:383483-383526 placement
function isShellHelper(interpreter) {
  return interpreter === "sh" || interpreter === "pwsh";
}
//@ chunk-dcmhvw5a.js:383526-383658 placement
/**
 * 判断 policyHelper 配置是否为内联脚本形式（合法 interpreter + 字符串 script）。
 */
function isInlineScriptHelper(e) {
  return (
    e !== null &&
    typeof e === "object" &&
    "interpreter" in e &&
    isShellHelper(e.interpreter) &&
    "script" in e &&
    typeof e.script === "string"
  );
}
//@ chunk-dcmhvw5a.js:383658-383696 placement
/**
 * 取 policyHelper 配置对应的命令文本。
 */
function getPolicyHelperCommand(e) {
  return policyHelperCommand(e)?.command;
}
//@ chunk-dcmhvw5a.js:383696-383995 placement
function policyHelperCommand(e) {
  if (e === null || typeof e !== "object") return;
  let { path, script, interpreter, timeoutMs, refreshIntervalMs } = e;
  let g;
  let scriptSize;
  if (typeof path === "string" && path) g = path;
  else if (typeof script === "string" && script && isShellHelper(interpreter)) {
    g = {
      interpreter,
      script: normalizePathText(script),
    };
    scriptSize = editSizeOf(script);
  } else return;
  return {
    command: jsonStringify([g, timeoutMs ?? null, refreshIntervalMs ?? null]),
    scriptSize,
  };
}
//@ chunk-dcmhvw5a.js:384090-384121 placement
function normalizePathText(e) {
  return computeContentHash(jsonStringify(e));
}
//@ chunk-dcmhvw5a.js:384121-384364 placement
function hookCommandText(e) {
  if (typeof e === "string") return e || undefined;
  if (e === null || typeof e !== "object" || !("command" in e) || typeof e.command !== "string" || !e.command)
    return;
  let n = "args" in e && Array.isArray(e.args) ? e.args.map(String) : [];
  return jsonStringify([e.command, ...n]);
}
//@ chunk-dcmhvw5a.js:384364-384421 placement
/**
 * 摘要中是否含任何需要确认的危险设置（含 hooks 与 payload 槽位）。
 */
function hasDangerousManagedSettings(e) {
  return hasRiskySettings(e) || e.hasHooks || riskyPayloadSlots(e).length > 0;
}
//@ chunk-dcmhvw5a.js:384421-384453 placement
function canonicalPath(e) {
  return toCanonicalPath(dangerousSettingsDigestInput(e));
}
//@ chunk-dcmhvw5a.js:384453-384763 placement
/**
 * 生成用于计算同意摘要哈希的危险设置对象。
 */
function dangerousSettingsDigestInput(e) {
  return {
    shellSettings: e.shellSettings,
    envVars: e.envVars,
    sandboxSettings: Object.keys(e.sandboxSettings).length > 0 ? e.sandboxSettings : undefined,
    ...isolationSettingsField(e),
    hooks: e.hooks,
    payloadSlots:
      riskyPayloadSlots(e).length > 0
        ? Object.fromEntries(
            riskyPayloadSlots(e).map(([n, r]) => {
              let { isolationSettings, ...a } = r;
              return [
                n,
                {
                  ...a,
                  ...isolationSettingsField(r),
                },
              ];
            }),
          )
        : undefined,
  };
}
//@ chunk-dcmhvw5a.js:384763-384870 placement
function isolationSettingsField(e) {
  return Object.keys(e.isolationSettings).length > 0
    ? {
        isolationSettings: e.isolationSettings,
      }
    : {};
}
//@ chunk-dcmhvw5a.js:384870-385347 placement
/**
 * 为托管设置里的插件槽位（enabledPlugins、prepend/appendPlugins 等）生成危险项条目。
 */
function pluginSlotDangerEntries(e, n, pluginDigests) {
  let s = new Set(Object.keys(pluginDigests).map((key) => nfcLower(`${key}@${n}`)));
  return e.flatMap(([a, c]) =>
    [
      "enabledPlugins",
      "prependPlugins",
      "appendPlugins",
      "managedSourcesBehavior",
      "outputBehavior",
      "slotPresent",
    ].flatMap((g) => {
      let m = c[g];
      let f = g === "enabledPlugins" ? isPlainObject(m) : Array.isArray(m);
      if (m === undefined) return [];
      if (!f) return [[a, `${g}:whole`, m]];
      return (isPlainObject(m) ? Object.entries(m).toSorted() : [m].flat().map((y) => [y]))
        .filter(([y]) => typeof y !== "string" || s.has(nfcLower(y)))
        .map((y) => [a, g, ...y]);
    }),
  );
}
//@ chunk-dcmhvw5a.js:385347-385378 placement
function toCanonicalPath(hooks) {
  return jsonStringify(sortKeysDeep(hooks));
}
//@ chunk-dcmhvw5a.js:385378-385411 placement
/**
 * 函数 realCanonicalPath（真实路径）；位于「托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化」模块。
 */
function realCanonicalPath(e) {
  return computeContentHash(canonicalPath(e));
}
//@ chunk-dcmhvw5a.js:385411-385527 placement
/**
 * 判断托管设置摘要是否与已同意的哈希一致（直接比较，或加入 CLAUDE.md 内容后重算比较）。
 */
function matchesConsentedHash(e, n, claudeMd) {
  if (realCanonicalPath(n) === e) return true;
  return (
    typeof claudeMd === "string" &&
    claudeMd.length > 0 &&
    computeContentHash(
      toCanonicalPath({
        ...dangerousSettingsDigestInput(n),
        claudeMd,
      }),
    ) === e
  );
}
//@ chunk-dcmhvw5a.js:385527-385683 placement
/**
 * 解析 headersHelper 的 JSON 三元组，取出命令与可选 URL。
 */
function parseHeadersHelperCommand(e) {
  let n = safeParseJSON(e, false);
  if (!Array.isArray(n) || n.length !== 3 || typeof n[0] !== "string") return;
  return {
    command: n[0],
    url: typeof n[2] === "string" ? n[2] : undefined,
  };
}
//@ chunk-dcmhvw5a.js:385683-385770 placement
function joinPathParts(headersHelper, n, r) {
  return jsonStringify([headersHelper, typeof n === "string" ? n : null, typeof r === "string" ? r : null]);
}
//@ chunk-dcmhvw5a.js:385770-385868 placement
function isPathShadowed(e, n) {
  let r = summarizeManagedSettingsRisk(e);
  let s = summarizeManagedSettingsRisk(n);
  if (!hasDangerousManagedSettings(s)) return false;
  if (!hasDangerousManagedSettings(r)) return true;
  return canonicalPath(r) !== canonicalPath(s);
}
//@ chunk-dcmhvw5a.js:385868-386089 placement
/**
 * 判断已同意的托管设置是否需要重新征求同意：按同意来源（已同意的 payload 或组织记录）比较当前危险项与哈希/已同意内容。
 */
function managedSettingsNeedReconsent(e, n) {
  switch (e.source) {
    case "consented_payload":
      return isPathShadowed(e.settings, n);
    case "org_record": {
      let r = summarizeManagedSettingsRisk(n);
      if (!hasDangerousManagedSettings(r)) return false;
      if (matchesConsentedHash(e.dangerousSettingsHash, r, n?.claudeMd)) return false;
      return isPathShadowed(e.consentedPayload, n);
    }
  }
}
//@ chunk-dcmhvw5a.js:386089-387329 fingerprint = extractDangerousSettings (0.426)
function extractDangerousSettings(baseline, dangerous) {
  let r = summarizeManagedSettingsRisk(baseline);
  let s = {};
  let a = diffSettingsMap(r.shellSettings, dangerous.shellSettings, s);
  let c = {};
  let g = diffSettingsMap(r.envVars, dangerous.envVars, c);
  let m = {};
  let f = diffSettingsMap(r.sandboxSettings, dangerous.sandboxSettings, m);
  let h = {};
  let y = diffSettingsMap(r.isolationSettings, dangerous.isolationSettings, h);
  let b = a.unchanged + g.unchanged + f.unchanged + y.unchanged;
  let S = a.removed + g.removed + f.removed + y.removed;
  if (r.hasHooks && !dangerous.hasHooks) S++;
  let hasHooks =
    dangerous.hasHooks && !(r.hasHooks && toCanonicalPath(r.hooks) === toCanonicalPath(dangerous.hooks));
  if (dangerous.hasHooks && !hasHooks) b++;
  let w = {};
  for (let [L, v] of riskyPayloadSlots(dangerous)) {
    let j = r.payloadSlots[L];
    let x = {
      shellSettings: {},
      envVars: {},
      sandboxSettings: {},
      isolationSettings: {},
    };
    for (let { unchanged, removed } of [
      diffSettingsMap(j?.shellSettings ?? {}, v.shellSettings, x.shellSettings),
      diffSettingsMap(j?.envVars ?? {}, v.envVars, x.envVars),
      diffSettingsMap(j?.sandboxSettings ?? {}, v.sandboxSettings, x.sandboxSettings),
      diffSettingsMap(j?.isolationSettings ?? {}, v.isolationSettings, x.isolationSettings),
    ]) {
      b += unchanged;
      S += removed;
    }
    if (hasRiskySettings(x)) w[L] = x;
  }
  for (let [L, v] of riskyPayloadSlots(r))
    if (dangerous.payloadSlots[L] === undefined)
      S +=
        Object.keys(v.shellSettings).length +
        Object.keys(v.envVars).length +
        Object.keys(v.sandboxSettings).length +
        Object.keys(v.isolationSettings).length;
  return {
    changed: {
      shellSettings: s,
      inlineHelperScriptSizes: dangerous.inlineHelperScriptSizes,
      envVars: c,
      sandboxSettings: m,
      isolationSettings: h,
      hasHooks,
      hooks: hasHooks ? dangerous.hooks : undefined,
      payloadSlots: w,
    },
    unchangedCount: b,
    removedCount: S,
  };
}
//@ chunk-dcmhvw5a.js:387329-387554 layout
function diffSettingsMap(e, n, r) {
  let s = 0;
  for (let [key, value] of Object.entries(n)) {
    if (value === undefined) continue;
    if (Object.hasOwn(e, key) && e[key] === value) s++;
    else r[key] = value;
  }
  let a = 0;
  for (let key of Object.keys(e)) if (!Object.hasOwn(n, key)) a++;
  return {
    unchanged: s,
    removed: a,
  };
}
//@ chunk-dcmhvw5a.js:387554-387850 layout
/**
 * OTLP 导出端点环境变量名的匹配正则（含 traces/logs/metrics 及 ANT_ 前缀版本），以及增强遥测开关变量名集合。
 */
var OTLP_ENDPOINT_RE = /^OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT$/;
var OTLP_TRACES_ENDPOINT_RE = /^OTEL_EXPORTER_OTLP_(?:TRACES_)?ENDPOINT$/;
var OTLP_ANY_ENDPOINT_RE =
  /^(?:ANT_OTEL_EXPORTER_OTLP_ENDPOINT|OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT)$/;
var ENHANCED_TELEMETRY_VARS = new Set([
  "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA",
  "ENABLE_ENHANCED_TELEMETRY_BETA",
]);
//@ chunk-dcmhvw5a.js:387850-388090 layout
/**
 * 托管设置的危险项是否只有 OTLP 遥测端点（及增强遥测开关）而无 hooks/shell/沙箱/隔离设置——此类改动可简化确认。
 */
function isTelemetryOnlyChange(e, settings) {
  let r = settings ? summarizeManagedSettingsRisk(settings) : e;
  let s = [r, ...riskyPayloadSlots(r).map(([, a]) => a)];
  return (
    onlyTelemetryEnvVars(e) &&
    onlyTelemetryEnvVars(r) &&
    !r.hasHooks &&
    s.every(
      (dangerous) =>
        Object.keys(dangerous.shellSettings).length === 0 &&
        Object.keys(dangerous.sandboxSettings).length === 0 &&
        Object.keys(dangerous.isolationSettings).length === 0,
    )
  );
}
//@ chunk-dcmhvw5a.js:388090-388361 fingerprint = hasDangerousSettings (0.736)
function hasDangerousSettings(e, settings) {
  let r = settings ? summarizeManagedSettingsRisk(settings) : e;
  let s = [r, ...riskyPayloadSlots(r).map(([, a]) => a)];
  return (
    !r.hasHooks &&
    s.some((a) => Object.keys(a.isolationSettings).length > 0) &&
    s.every(
      (dangerous) =>
        Object.keys(dangerous.shellSettings).length === 0 &&
        Object.keys(dangerous.envVars).length === 0 &&
        Object.keys(dangerous.sandboxSettings).length === 0,
    )
  );
}
//@ chunk-dcmhvw5a.js:388361-388586 affinity
function onlyTelemetryEnvVars(e) {
  let n = describeEnvRows(e);
  let r = (a) => a.url !== undefined && OTLP_ENDPOINT_RE.test(a.key.toUpperCase());
  let s =
    !n.some((a) => a.tracesSwitch === true) ||
    n.some((a) => r(a) && OTLP_TRACES_ENDPOINT_RE.test(a.key.toUpperCase()));
  return n.some(r) && s && n.every((a) => r(a) || a.tracesSwitch === true);
}
export {
  getPluginDisplayName,
  describeArchiveFetchCommand,
  printablePluginName,
  trimmedOrUndefined,
  sanitizePluginManifestForDisplay,
  summarizeManagedSettingsRisk,
  extractDangerousSettings,
  hasDangerousManagedSettings,
  isTelemetryOnlyChange,
  hasDangerousSettings,
  realCanonicalPath,
  managedSettingsNeedReconsent,
  isInlineScriptHelper,
  normalizePathText,
  riskyPayloadSlots,
  ENHANCED_TELEMETRY_VARS,
  OTLP_ANY_ENDPOINT_RE,
  isPolicyHelperName,
  escapeNonPrintable,
  parseHeadersHelperCommand,
  needsManagedSettingsConsent,
  matchesConsentedHash,
  isMergingPolicyHelper,
  policyHelperSlots,
  isPolicyHelperPath,
  hasPayloadSlot,
  getPolicyHelperCommand,
};
