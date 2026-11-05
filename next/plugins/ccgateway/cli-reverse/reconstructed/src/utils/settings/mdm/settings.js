/**
 * utils/settings/mdm/settings.ts
 *
 * MDM 设置加载器：解析 plist/注册表内容为托管设置，WSL 继承 Windows 策略，记录 tengu_managed_settings_os_read。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/mdm/settings.ts
 * pieces: chunk-5fn9rb8r.js (21), chunk-gme60te5.js (1), chunk-z20c443b.js (1)
 * attribution: fingerprint 4, placement 7, layout 10, sole-consumer 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, join } from "path";
import { lstat } from "fs/promises";
import { clone } from "../../slowOperations.js";
import {
  dropManagedOnlyKeys,
  MANAGED_ONLY_KEYS,
  isInertManagedMcpServersNotice,
  parsePolicyObjectTolerant,
  accountCouldChangeDocument,
} from "../managedFileSettings.js";
import { validateSettingsDocument } from "../hooksValidation.js";
import { getSettingsSchemaForDocument, readWslInheritFlag } from "../types.js";
import { formatZodError } from "../validation.js";
import { getMdmRawReadPromise, fireRawRead } from "./rawRead.js";
import { logForDebugging } from "../../debug.js";
import { logEvent } from "../../../services/analytics/index.js";
import { mdmResult, withAskedWhere, mdmLoader, hasMdmResult } from "./mdmLoader.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { safeParseJSON } from "../../json.js";
import { isPlainObject } from "../../isPlainObject.js";
import {
  unparseablePolicyDocumentError,
  unreadableWslFlagWithoutPolicyError,
  parseSettingsContent,
} from "../settingsFileParsing.js";
import { PLUGIN_ORDER_KEYS, isPlainRecord, BUILTIN_PLUGIN_TIER } from "../managedPluginTiers.js";
import { pickByHelper } from "../../git/gitSafeEnv.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { isWsl, isCoworkCloudEntrypoint, WSL_REG_EXE_PATH, WSL_MANAGED_SETTINGS_DIR } from "./wslRegistry.js";
import { hasPolicyContent, adminDocumentPresent, combinedLoadState, loadStateOf } from "../policySettings.js";
import { WINDOWS_REGISTRY_KEY_PATH_HKLM, SETTINGS, WINDOWS_REGISTRY_KEY_PATH_HKCU } from "./constants.js";
import { SettingsCacheStore } from "../../../bootstrap/stateSlices.js";
import {
  loadManagedSettingsFile,
  hasManagedSettingsDocument,
  isNotFoundErrno_5,
} from "../managedSettingsFiles.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../hoverRest.js";
import { readFileChecked, readFileSync } from "../../fileRead.js";
import {
  MAX_SETTINGS_JSON_BYTES,
  isMachineAdminDocumentUnreadable,
  getEveryMachineAdminTierSettings,
} from "../settings.js";
import { getManagedFilePath, getManagedFilePathOverride } from "../managedPath.js";
import { isENOENT } from "../../errors.js";
import { getFsImplementation } from "../../fsOperations.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:468789-469092 callgraph-fingerprint (2.1.88 match: parseCommandOutputAsSettings, 0.209)
function parseCommandOutputAsSettings(stdout) {
  let data = clone(stdout);
  let issues = [
    ...dropManagedOnlyKeys(data, "SDK inline settings"),
    ...validateSettingsDocument(data, "SDK inline settings"),
  ];
  let parseResult = getSettingsSchemaForDocument(data).safeParse(data);
  if (!parseResult.success)
    return {
      settings: null,
      errors: [...issues, ...formatZodError(parseResult.error, "SDK inline settings")],
    };
  if (issues.some((issue) => issue.severity === "fatal"))
    return {
      settings: null,
      errors: issues,
    };
  return {
    settings: parseResult.data,
    errors: issues,
  };
}
//@ chunk-5fn9rb8r.js:9243-9350 fingerprint (2.1.88 match: EMPTY_RESULT, 0.73)
var EMPTY_MDM_RESULT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_MDM_SETTINGS;
deferInit("chunk-5fn9rb8r.js:9243", () => {
  EMPTY_MDM_RESULT = Object.freeze({
    settings: {},
    errors: [],
    loadState: "absent",
  });
  EMPTY_MDM_SETTINGS = Object.freeze({
    settings: {},
    errors: [],
  });
});
//@ chunk-5fn9rb8r.js:9350-10226 fingerprint (2.1.88 match: startMdmSettingsLoad, 0.742)
/**
 * MDM 设置加载器：启动时异步读取 macOS plist 或 Windows 注册表 HKLM/HKCU\SOFTWARE\Policies\ClaudeCode\Settings（WSL 下可继承 Windows），完成后打 tengu_managed_settings_os_read。
 */
class MdmSettingsLoader {
  mdm = null;
  hkcu = null;
  wslInherits = false;
  whereAsked = undefined;
  readOutcomes = null;
  loadPromise = null;
  startLoad(options) {
    if (this.loadPromise) return;
    this.loadPromise = (async () => {
      let startTime = Date.now();
      let raw = await (getMdmRawReadPromise() ?? fireRawRead());
      let { mdm, hkcu, wslInherits, whereAsked } = await resolveMdmReadResult(raw, options);
      this.replace(mdm, hkcu, wslInherits, whereAsked);
      this.readOutcomes = raw.outcomes;
      let duration = Date.now() - startTime;
      logForDebugging(`MDM settings load completed in ${duration}ms`);
      try {
        logEvent("tengu_managed_settings_os_read", buildMdmReadTelemetry(raw, duration));
      } catch {}
      let result = mdmResult();
      if (Object.keys(result.settings).length > 0) {
        logForDebugging(`MDM settings found: ${Object.keys(result.settings).join(", ")}`);
        try {
          logForDiagnosticsNoPII("info", "mdm_settings_loaded", {
            duration_ms: duration,
            key_count: Object.keys(mdm.settings).length,
            error_count: mdm.errors.length,
          });
        } catch {}
      }
    })();
  }
  replace(mdm, hkcu, wslInherits, whereAsked) {
    this.mdm = mdm;
    this.hkcu = hkcu;
    this.wslInherits = wslInherits;
    this.whereAsked = whereAsked;
  }
  reset() {
    this.mdm = null;
    this.hkcu = null;
    this.wslInherits = false;
    this.whereAsked = undefined;
    this.readOutcomes = null;
    this.loadPromise = null;
  }
}
//@ chunk-5fn9rb8r.js:10919-10963 placement
/**
 * wslInheritsSettings：WSL 是否继承 Windows 设置。
 */
function wslInheritsSettings() {
  return withAskedWhere(mdmLoader()).wslInherits;
}
//@ chunk-5fn9rb8r.js:10963-11007 placement
/**
 * replaceMdmSetting：替换 MDM 设置。
 */
function replaceMdmSetting(mdm, hkcu, wslInherits, whereAsked) {
  mdmLoader().replace(mdm, hkcu, wslInherits, whereAsked);
}
//@ chunk-5fn9rb8r.js:11007-11128 placement
/**
 * 读取当前 MDM、HKCU 与 WSL 继承设置的快照（缺省时用空结果）。
 */
function mdmReadSnapshot() {
  let { mdm, hkcu, wslInherits, whereAsked } = mdmLoader();
  return {
    mdm: mdm ?? EMPTY_MDM_RESULT,
    hkcu: hkcu ?? EMPTY_MDM_SETTINGS,
    wslInherits,
    whereAsked,
  };
}
//@ chunk-5fn9rb8r.js:11128-11217 placement
/**
 * readMdmSnapshot：读取 MDM 设置快照。
 */
async function readMdmSnapshot(options) {
  let raw = await fireRawRead();
  return {
    ...(await resolveMdmReadResult(raw, options)),
    readOutcomes: raw.outcomes,
  };
}
//@ chunk-5fn9rb8r.js:11217-12790 placement
function checkManagedOnlySettings(text, label, { userWritable = false } = {}) {
  let parsed = safeParseJSON(text, false);
  if (!isPlainObject(parsed))
    return {
      settings: {},
      errors: [
        unparseablePolicyDocumentError(label, {
          userWritable,
        }),
      ],
      documentHasPolicyContent: false,
      loadState: "didNotLoad",
    };
  let issues = [];
  let working = parsed;
  for (let key of userWritable ? MANAGED_ONLY_KEYS : []) {
    if (!(key in working)) continue;
    working =
      working === parsed
        ? {
            ...parsed,
          }
        : working;
    delete working[key];
    if (!isInertManagedMcpServersNotice(key))
      issues.push({
        file: label,
        path: key,
        message: `"${key}" is only honored from administrator-controlled managed settings and was ignored in ${label}, which the user account can write.`,
        severity: "warning",
        statusOnly: true,
      });
  }
  if (userWritable) {
    for (let key of PLUGIN_ORDER_KEYS) {
      if (!(key in working)) continue;
      working =
        working === parsed
          ? {
              ...parsed,
            }
          : working;
      delete working[key];
      issues.push({
        file: label,
        path: key,
        message: `"${key}" is only honored from administrator-controlled managed settings and was ignored in ${label}, which the user account can write.`,
        severity: "warning",
        statusOnly: true,
      });
    }
    let enabledPlugins = working.enabledPlugins;
    if (isPlainRecord(enabledPlugins)) {
      if (
        Object.entries(enabledPlugins).filter(
          ([key, value]) => key.endsWith(BUILTIN_PLUGIN_TIER) || value !== false,
        ).length > 0
      ) {
        working =
          working === parsed
            ? {
                ...parsed,
              }
            : working;
        let kept = pickByHelper(
          enabledPlugins,
          (value, key) => !key.endsWith(BUILTIN_PLUGIN_TIER) && value === false,
        );
        if (Object.keys(kept).length > 0) working.enabledPlugins = kept;
        else delete working.enabledPlugins;
        issues.push({
          file: label,
          path: "enabledPlugins",
          message: `"enabledPlugins" entries that enable a plugin, or name a built-in, are only honored from administrator-controlled managed settings and were ignored in ${label}, which the user account can write.`,
          severity: "warning",
          statusOnly: true,
        });
      }
    }
  }
  let { settings, errors, documentHasPolicyContent, loadState, onlySubstitutes } = parsePolicyObjectTolerant(
    working,
    label,
  );
  let allErrors = [...issues, ...errors];
  return {
    settings: settings ?? {},
    errors: userWritable
      ? allErrors.map((issue) => ({
          ...(issue.severity === "warning" && !issue.startupFatal
            ? issue
            : {
                ...omitStartupFlags(issue),
                severity: "warning",
                statusOnly: true,
              }),
          userWritable: true,
        }))
      : allErrors,
    documentHasPolicyContent,
    loadState,
    ...(onlySubstitutes && {
      onlySubstitutes,
    }),
  };
}
//@ chunk-5fn9rb8r.js:12790-12859 placement
function omitStartupFlags({ startupFatal, loadedWithoutGuardHook, ...rest }) {
  return rest;
}
//@ chunk-5fn9rb8r.js:12859-13123 layout
function managedDocumentUnreadableError(label, reason, userWritable, unreadErrno) {
  return {
    file: label,
    path: "",
    message: `Managed settings document (${label}) could not be read: ${reason}; none of its settings are in effect.`,
    severity: userWritable ? "warning" : "fatal",
    statusOnly: true,
    errorClass: "unreadable",
    ...(unreadErrno !== undefined && {
      errno: unreadErrno,
    }),
    ...(userWritable && {
      userWritable: true,
    }),
  };
}
//@ chunk-5fn9rb8r.js:13123-13319 fingerprint (2.1.88 match: parseRegQueryStdout, 0.627)
/**
 * 从 reg query 输出中提取 REG_SZ/REG_EXPAND_SZ 值（默认值名 Settings）。
 */
function parseRegQueryStdout(stdout, valueName = "Settings") {
  let lines = valueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let regExp = new RegExp(`^[ \\t]+${lines}[ \\t]+REG_(?:EXPAND_)?SZ[ \\t]+([\\s\\S]*)`, "im");
  let match = stdout.match(regExp)?.[1]?.trimEnd();
  return match ? match : null;
}
//@ chunk-5fn9rb8r.js:13319-13691 layout
/**
 * MDM 读取遥测中允许上报的 errno 与信号名映射。
 */
var ERRNO_TELEMETRY_VALUES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SIGNAL_TELEMETRY_VALUES;
deferInit("chunk-5fn9rb8r.js:13319", () => {
  ERRNO_TELEMETRY_VALUES = new Map([
    ["ENOENT", lit("ENOENT")],
    ["EACCES", lit("EACCES")],
    ["EPERM", lit("EPERM")],
    ["ENOEXEC", lit("ENOEXEC")],
    ["EAGAIN", lit("EAGAIN")],
    ["EMFILE", lit("EMFILE")],
    ["ENOMEM", lit("ENOMEM")],
    ["ETIMEDOUT", lit("ETIMEDOUT")],
    ["ERR_CHILD_PROCESS_STDIO_MAXBUFFER", lit("ERR_CHILD_PROCESS_STDIO_MAXBUFFER")],
  ]);
  SIGNAL_TELEMETRY_VALUES = new Map([
    ["SIGTERM", lit("SIGTERM")],
    ["SIGKILL", lit("SIGKILL")],
    ["SIGINT", lit("SIGINT")],
  ]);
});
//@ chunk-5fn9rb8r.js:13691-13748 layout
function errnoTelemetryValue(errno) {
  if (!errno) return;
  return ERRNO_TELEMETRY_VALUES.get(errno) ?? lit("other");
}
//@ chunk-5fn9rb8r.js:13748-13805 layout
function signalTelemetryValue(signal) {
  if (!signal) return;
  return SIGNAL_TELEMETRY_VALUES.get(signal) ?? lit("other");
}
//@ chunk-5fn9rb8r.js:13805-14001 layout
function mdmReadFields(prefix, outcome) {
  if (!outcome) return {};
  return {
    [`${prefix}_status`]: fromEnum(outcome.status),
    [`${prefix}_exit_code`]: outcome.exitCode ?? undefined,
    [`${prefix}_errno`]: errnoTelemetryValue(outcome.errno),
    [`${prefix}_signal`]: signalTelemetryValue(outcome.signal),
    [`${prefix}_duration_ms`]: outcome.durationMs,
  };
}
//@ chunk-5fn9rb8r.js:14001-14110 layout
function buildMdmReadTelemetry(raw, awaitMs) {
  return {
    is_wsl: isWsl(),
    await_ms: awaitMs,
    ...mdmReadFields("hklm", raw.outcomes.hklm),
    ...mdmReadFields("hkcu", raw.outcomes.hkcu),
  };
}
//@ chunk-5fn9rb8r.js:14110-17119 layout
async function resolveMdmReadResult(raw, store, nested = false) {
  let errors = [];
  let adminSeen = false;
  let loadState = "absent";
  for (let doc of raw.plistStdouts ?? []) {
    let { label, userWritable } = doc;
    if (userWritable && adminSeen) continue;
    let result =
      doc.stdout === null
        ? {
            settings: {},
            errors: [managedDocumentUnreadableError(label, doc.unreadReason, userWritable, doc.unreadErrno)],
            documentHasPolicyContent: false,
            loadState: "didNotLoad",
            ...(userWritable && {
              userWritable,
            }),
          }
        : {
            ...checkManagedOnlySettings(doc.stdout, label, {
              userWritable,
            }),
            ...(userWritable && {
              userWritable,
            }),
          };
    if (userWritable ? hasPolicyContent(result.settings) : result.documentHasPolicyContent)
      return {
        mdm: {
          ...result,
          errors: [...errors, ...result.errors],
          documentHasPolicyContent: true,
        },
        hkcu: EMPTY_MDM_SETTINGS,
        wslInherits: false,
      };
    adminSeen ||= adminDocumentPresent(result);
    errors.push(...result.errors);
    if (!userWritable) loadState = combinedLoadState(loadState, result.loadState);
  }
  let hklmLabel = `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKLM}\\${SETTINGS}`;
  let hklmResult = null;
  let wslFlag = "disarmed";
  let hkcuLabel = `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKCU}\\${SETTINGS}`;
  if (
    !nested &&
    (raw.hklmStdout !== null || raw.hklmUnreadReason !== undefined || raw.hkcuStdout !== null) &&
    true &&
    isCoworkCloudEntrypoint()
  ) {
    let [regStats, regDirStats] = await Promise.all(
      [WSL_REG_EXE_PATH, dirname(WSL_REG_EXE_PATH)].map((path) =>
        lstat(path).then(
          ({ uid, gid, mode }) => ({
            uid,
            gid,
            mode,
          }),
          () => {
            return;
          },
        ),
      ),
    );
    let canChange = true;
    try {
      canChange = accountCouldChangeDocument(
        new SettingsCacheStore(),
        WSL_REG_EXE_PATH,
        regStats,
        regDirStats,
      );
    } catch (error) {
      logForDebugging(`registry tool: could not be asked about, held: ${error}`, {
        level: "error",
      });
    }
    if (canChange) {
      let heldDocs = [];
      if (raw.hklmStdout !== null)
        heldDocs.push([
          hklmLabel,
          checkManagedOnlySettings(parseRegQueryStdout(raw.hklmStdout) ?? "", hklmLabel),
        ]);
      else if (raw.hklmUnreadReason !== undefined)
        heldDocs.push([
          hklmLabel,
          {
            settings: {},
            errors: [managedDocumentUnreadableError(hklmLabel, raw.hklmUnreadReason, false)],
            documentHasPolicyContent: false,
            loadState: "didNotLoad",
          },
        ]);
      if (raw.hkcuStdout !== null)
        heldDocs.push([
          hkcuLabel,
          checkManagedOnlySettings(parseRegQueryStdout(raw.hkcuStdout) ?? "", hkcuLabel, {
            userWritable: true,
          }),
        ]);
      let mdmReadResult = await resolveMdmReadResult(raw, store, true);
      let mdmReadResult_2 = await resolveMdmReadResult(
        {
          ...raw,
          hklmStdout: null,
          hklmUnreadReason: undefined,
          hkcuStdout: null,
        },
        store,
        true,
      );
      return {
        ...mdmReadResult,
        whereAsked: {
          ...mdmReadResult_2,
          mdm: {
            ...mdmReadResult_2.mdm,
            heldDocuments: heldDocs.map(([label, result]) => ({
              path: label,
              parsed: {
                ...result,
                settings: result.loadState === "loaded" ? result.settings : null,
              },
            })),
          },
        },
      };
    }
  }
  if (raw.hklmStdout !== null) {
    let text = parseRegQueryStdout(raw.hklmStdout) ?? "";
    hklmResult = checkManagedOnlySettings(text, hklmLabel);
    let parsed = safeParseJSON(text, false);
    if (isPlainObject(parsed)) wslFlag = readWslInheritFlag(parsed);
  } else if (raw.hklmUnreadReason !== undefined)
    hklmResult = {
      settings: {},
      errors: [managedDocumentUnreadableError(hklmLabel, raw.hklmUnreadReason, false)],
      documentHasPolicyContent: false,
      loadState: "didNotLoad",
    };
  let adminPresent = hklmResult !== null && adminDocumentPresent(hklmResult);
  if (hklmResult) {
    errors.push(...hklmResult.errors);
    loadState = combinedLoadState(loadState, hklmResult.loadState);
  }
  let isWslEnv = isWsl();
  let flag = "disarmed";
  let flagPath = hklmLabel;
  let links = [];
  if (isWslEnv) {
    flag = wslFlag;
    if (flag !== "armed") {
      let managedSettingsFile = await loadManagedSettingsFile(store);
      links = managedSettingsFile.links;
      if (managedSettingsFile.flag === "armed" || flag === "disarmed") {
        flag = managedSettingsFile.flag;
        flagPath = managedSettingsFile.unreadableFlagPath ?? WSL_MANAGED_SETTINGS_DIR;
      }
      if (flag === "disarmed") {
        errors.push(...managedSettingsFile.records);
        loadState = combinedLoadState(loadState, managedSettingsFile.loadState);
      }
    }
  }
  let armed = flag !== "disarmed";
  let baseResult = {
    settings: {},
    errors,
    loadState,
  };
  if (isWslEnv && !armed) {
    let warnings = new Set(hklmResult?.errors.filter((error) => error.severity === "warning"));
    return {
      mdm: {
        ...baseResult,
        errors: baseResult.errors.map((error) =>
          warnings.has(error)
            ? {
                ...error,
                wslIgnored: true,
              }
            : error,
        ),
        ...(links.length > 0 && {
          managedDocumentLinks: links,
        }),
      },
      hkcu: EMPTY_MDM_SETTINGS,
      wslInherits: false,
    };
  }
  if (hklmResult && adminPresent)
    return {
      mdm: hklmResult,
      hkcu: EMPTY_MDM_SETTINGS,
      wslInherits: armed,
    };
  if (flag === "unreadable") {
    let hasDoc = await hasManagedSettingsDocument(WSL_MANAGED_SETTINGS_DIR, store);
    let flagRecord = unreadableWslFlagWithoutPolicyError(flagPath);
    return {
      mdm: {
        ...baseResult,
        errors: hasDoc ? baseResult.errors : [...baseResult.errors, flagRecord],
        ...(hasDoc && {
          withheldFlagRecord: flagRecord,
        }),
        documentHasPolicyContent: true,
        loadState: combinedLoadState(baseResult.loadState, "loaded"),
      },
      hkcu: EMPTY_MDM_SETTINGS,
      wslInherits: armed,
    };
  }
  if (raw.hkcuStdout !== null && !isDiskless() && !(await hasWslManagedSettings(armed, store))) {
    let hkcuResult = checkManagedOnlySettings(parseRegQueryStdout(raw.hkcuStdout) ?? "", hkcuLabel, {
      userWritable: true,
    });
    if (!isWslEnv || hkcuResult.settings.wslInheritsWindowsSettings === true) {
      let { wslInheritsWindowsSettings, managedSourcesBehavior, ...hkcuSettings } = hkcuResult.settings;
      return {
        mdm: baseResult,
        hkcu: {
          settings: hkcuSettings,
          errors: hkcuResult.errors,
        },
        wslInherits: armed,
      };
    }
    if (hkcuResult.errors.length > 0)
      return {
        mdm: baseResult,
        hkcu: {
          settings: {},
          errors: hkcuResult.errors,
        },
        wslInherits: armed,
      };
  }
  return {
    mdm: baseResult,
    hkcu: EMPTY_MDM_SETTINGS,
    wslInherits: armed,
  };
}
//@ chunk-5fn9rb8r.js:17119-17208 layout
async function readManagedDocumentText(path, store) {
  if (isStorageV5Enabled() && store !== undefined)
    return (await readFileChecked(path, MAX_SETTINGS_JSON_BYTES)).content;
  return readFileSync(path, MAX_SETTINGS_JSON_BYTES);
}
//@ chunk-5fn9rb8r.js:17208-17279 layout
async function hasWslManagedSettings(armed, store) {
  if (armed && (await hasManagedSettingsDocument(WSL_MANAGED_SETTINGS_DIR, store))) return true;
  return hasManagedSettingsDocument(getManagedFilePath(), store);
}
//@ chunk-5fn9rb8r.js:17279-17422 layout
async function managedFileHasContent(path, store) {
  let content;
  try {
    content = await readManagedDocumentText(path, store);
  } catch (error) {
    return !isENOENT(error);
  }
  try {
    let settingsContent = parseSettingsContent(content, path, true);
    return adminDocumentPresent({
      ...settingsContent,
      loadState: loadStateOf(settingsContent),
    });
  } catch {
    return true;
  }
}
//@ chunk-5fn9rb8r.js:17422-17914 fingerprint (2.1.88 match: hasManagedSettingsFile, 0.618)
async function hasManagedSettingsFile(store) {
  if (!isWsl() || !mdmLoader().wslInherits) return "";
  let parts = [];
  try {
    parts.push(await readManagedDocumentText(join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"), store));
  } catch (error) {
    parts.push(unreadableMarker(error));
  }
  try {
    let dropInDir = join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d");
    let sorted = (await getFsImplementation().readdir(dropInDir))
      .filter(
        (dirent) =>
          (dirent.isFile() || dirent.isSymbolicLink()) &&
          dirent.name.endsWith(".json") &&
          !dirent.name.startsWith("."),
      )
      .map((dirent) => dirent.name)
      .sort();
    for (let name of sorted)
      try {
        parts.push(`${name}\x00${await readManagedDocumentText(join(dropInDir, name), store)}`);
      } catch (error) {
        parts.push(`${name}\x00${unreadableMarker(error)}`);
      }
  } catch (error) {
    let content = unreadableMarker(error);
    if (content !== "") parts.push(content);
  }
  return parts.join("\x01");
}
//@ chunk-5fn9rb8r.js:17914-17962 sole-consumer
function unreadableMarker(error) {
  return isNotFoundErrno_5(error) ? "" : "\x00unreadable";
}
//@ chunk-gme60te5.js:272-588 placement
function describeMdmSettingsState() {
  if (!hasMdmResult()) throw Error("the MDM settings have not been read yet");
  if (isMachineAdminDocumentUnreadable()) throw Error("an admin-owned settings document could not be read");
  if (getManagedFilePathOverride() !== undefined) throw Error("the managed-settings path was overridden");
  let forceLoginOrgUUID = getEveryMachineAdminTierSettings()[0]?.forceLoginOrgUUID;
  if (forceLoginOrgUUID === undefined) return;
  return typeof forceLoginOrgUUID === "string" ? [forceLoginOrgUUID] : forceLoginOrgUUID;
}
export {
  describeMdmSettingsState,
  readMdmSnapshot,
  replaceMdmSetting,
  wslInheritsSettings,
  MdmSettingsLoader,
  EMPTY_MDM_RESULT,
  EMPTY_MDM_SETTINGS,
  hasManagedSettingsFile,
  readManagedDocumentText,
  managedFileHasContent,
  mdmReadSnapshot,
  parseCommandOutputAsSettings,
};
