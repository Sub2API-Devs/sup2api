/**
 * utils/settings/mdm/settings.ts
 *
 * MDM 设置加载器：解析 plist/注册表内容为托管设置，WSL 继承 Windows 策略，记录 tengu_managed_settings_os_read。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/mdm/settings.ts
 * pieces: chunk-dcmhvw5a.js (1), chunk-q8cqcff6.js (21), chunk-yhvmbyx2.js (1)
 * attribution: callgraph-fingerprint 1, fingerprint 4, placement 7, layout 10, sole-consumer 1
 */
import { dirname, join } from "path";
import { lstat } from "fs/promises";
import { getMdmRawReadPromise, fireRawRead } from "./rawRead.js";
import { logForDebugging } from "../../debug.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  mdmResult,
  withAskedWhere,
  mdmLoader,
  PLUGIN_ORDER_KEYS,
  isPlainRecord,
  BUILTIN_PLUGIN_TIER,
  hasMdmResult,
} from "../managedPluginTiers.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { safeParseJSON } from "../../json.js";
import { isPlainObject } from "../../isPlainObject.js";
import {
  unparseablePolicyDocumentError,
  unreadableWslFlagWithoutPolicyError,
  parseSettingsContent,
} from "../settingsFileParsing.js";
import {
  MANAGED_ONLY_KEYS,
  isInertManagedMcpServersNotice,
  parsePolicyObjectTolerant,
  accountCouldChangeDocument,
  dropManagedOnlyKeys,
} from "../managedFileSettings.js";
import { pickByHelper } from "../../git/gitSafeEnv.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { isWsl, isCoworkCloudEntrypoint, WSL_REG_EXE_PATH, WSL_MANAGED_SETTINGS_DIR } from "./wslRegistry.js";
import { hasPolicyContent, adminDocumentPresent, combinedLoadState, loadStateOf } from "../policySettings.js";
import { WINDOWS_REGISTRY_KEY_PATH_HKLM, SETTINGS, WINDOWS_REGISTRY_KEY_PATH_HKCU } from "./constants.js";
import { SettingsCacheStore } from "../../../bootstrap/stateSlices.js";
import { readWslInheritFlag, getSettingsSchemaForDocument } from "../types.js";
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
import { clone } from "../../slowOperations.js";
import { validateSettingsDocument } from "../hooksValidation.js";
import { formatZodError } from "../validation.js";

//@ chunk-q8cqcff6.js:9000-9107 fingerprint = EMPTY_RESULT (0.729)
var EMPTY_MDM_RESULT = Object.freeze({
  settings: {},
  errors: [],
  loadState: "absent",
});
var me = Object.freeze({
  settings: {},
  errors: [],
});
//@ chunk-q8cqcff6.js:9107-9983 fingerprint = startMdmSettingsLoad (0.742)
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
  startLoad(e) {
    if (this.loadPromise) return;
    this.loadPromise = (async () => {
      let startTime = Date.now();
      let s = await (getMdmRawReadPromise() ?? fireRawRead());
      let { mdm, hkcu, wslInherits, whereAsked } = await resolveMdmReadResult(s, e);
      this.replace(mdm, hkcu, wslInherits, whereAsked);
      this.readOutcomes = s.outcomes;
      let duration = Date.now() - startTime;
      logForDebugging(`MDM settings load completed in ${duration}ms`);
      try {
        logEvent("tengu_managed_settings_os_read", buildMdmReadTelemetry(s, duration));
      } catch {}
      let O = mdmResult();
      if (Object.keys(O.settings).length > 0) {
        logForDebugging(`MDM settings found: ${Object.keys(O.settings).join(", ")}`);
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
//@ chunk-q8cqcff6.js:10676-10720 placement
/**
 * wslInheritsSettings：WSL 是否继承 Windows 设置。
 */
function wslInheritsSettings() {
  return withAskedWhere(mdmLoader()).wslInherits;
}
//@ chunk-q8cqcff6.js:10720-10764 placement
/**
 * replaceMdmSetting：替换 MDM 设置。
 */
function replaceMdmSetting(e, hkcu, wslInherits, whereAsked) {
  mdmLoader().replace(e, hkcu, wslInherits, whereAsked);
}
//@ chunk-q8cqcff6.js:10764-10885 placement
/**
 * 读取当前 MDM、HKCU 与 WSL 继承设置的快照（缺省时用空结果）。
 */
function mdmReadSnapshot() {
  let { mdm, hkcu, wslInherits, whereAsked } = mdmLoader();
  return {
    mdm: mdm ?? EMPTY_MDM_RESULT,
    hkcu: hkcu ?? me,
    wslInherits,
    whereAsked,
  };
}
//@ chunk-q8cqcff6.js:10885-10974 placement
/**
 * readMdmSnapshot：读取 MDM 设置快照。
 */
async function readMdmSnapshot(e) {
  let n = await fireRawRead();
  return {
    ...(await resolveMdmReadResult(n, e)),
    readOutcomes: n.outcomes,
  };
}
//@ chunk-q8cqcff6.js:10974-12545 placement
function checkManagedOnlySettings(e, n, { userWritable: r = false } = {}) {
  let s = safeParseJSON(e, false);
  if (!isPlainObject(s))
    return {
      settings: {},
      errors: [
        unparseablePolicyDocumentError(n, {
          userWritable: r,
        }),
      ],
      documentHasPolicyContent: false,
      loadState: "didNotLoad",
    };
  let S = [];
  let E = s;
  for (let M of r ? MANAGED_ONLY_KEYS : []) {
    if (!(M in E)) continue;
    E =
      E === s
        ? {
            ...s,
          }
        : E;
    delete E[M];
    if (!isInertManagedMcpServersNotice(M))
      S.push({
        file: n,
        path: M,
        message: `"${M}" is only honored from administrator-controlled managed settings and was ignored in ${n}, which the user account can write.`,
        severity: "warning",
        statusOnly: true,
      });
  }
  if (r) {
    for (let x of PLUGIN_ORDER_KEYS) {
      if (!(x in E)) continue;
      E =
        E === s
          ? {
              ...s,
            }
          : E;
      delete E[x];
      S.push({
        file: n,
        path: x,
        message: `"${x}" is only honored from administrator-controlled managed settings and was ignored in ${n}, which the user account can write.`,
        severity: "warning",
        statusOnly: true,
      });
    }
    let enabledPlugins = E.enabledPlugins;
    if (isPlainRecord(enabledPlugins)) {
      if (
        Object.entries(enabledPlugins).filter(
          ([key, value]) => key.endsWith(BUILTIN_PLUGIN_TIER) || value !== false,
        ).length > 0
      ) {
        E =
          E === s
            ? {
                ...s,
              }
            : E;
        let L = pickByHelper(enabledPlugins, (G, q) => !q.endsWith(BUILTIN_PLUGIN_TIER) && G === false);
        if (Object.keys(L).length > 0) E.enabledPlugins = L;
        else delete E.enabledPlugins;
        S.push({
          file: n,
          path: "enabledPlugins",
          message: `"enabledPlugins" entries that enable a plugin, or name a built-in, are only honored from administrator-controlled managed settings and were ignored in ${n}, which the user account can write.`,
          severity: "warning",
          statusOnly: true,
        });
      }
    }
  }
  let { settings, errors, documentHasPolicyContent, loadState, onlySubstitutes } = parsePolicyObjectTolerant(
    E,
    n,
  );
  let v = [...S, ...errors];
  return {
    settings: settings ?? {},
    errors: r
      ? v.map((M) => ({
          ...(M.severity === "warning" && !M.startupFatal
            ? M
            : {
                ...omitStartupFlags(M),
                severity: "warning",
                statusOnly: true,
              }),
          userWritable: true,
        }))
      : v,
    documentHasPolicyContent,
    loadState,
    ...(onlySubstitutes && {
      onlySubstitutes,
    }),
  };
}
//@ chunk-q8cqcff6.js:12545-12614 placement
function omitStartupFlags({ startupFatal, loadedWithoutGuardHook, ...r }) {
  return r;
}
//@ chunk-q8cqcff6.js:12614-12878 layout
function managedDocumentUnreadableError(e, n, r, unreadErrno) {
  return {
    file: e,
    path: "",
    message: `Managed settings document (${e}) could not be read: ${n}; none of its settings are in effect.`,
    severity: r ? "warning" : "fatal",
    statusOnly: true,
    errorClass: "unreadable",
    ...(unreadErrno !== undefined && {
      errno: unreadErrno,
    }),
    ...(r && {
      userWritable: true,
    }),
  };
}
//@ chunk-q8cqcff6.js:12878-13074 fingerprint = parseRegQueryStdout (0.627)
/**
 * 从 reg query 输出中提取 REG_SZ/REG_EXPAND_SZ 值（默认值名 Settings）。
 */
function parseRegQueryStdout(stdout, valueName = "Settings") {
  let lines = valueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let regExp = new RegExp(`^[ \\t]+${lines}[ \\t]+REG_(?:EXPAND_)?SZ[ \\t]+([\\s\\S]*)`, "im");
  let S = stdout.match(regExp)?.[1]?.trimEnd();
  return S ? S : null;
}
//@ chunk-q8cqcff6.js:13074-13446 layout
/**
 * MDM 读取遥测中允许上报的 errno 与信号名映射。
 */
var ERRNO_TELEMETRY_VALUES = new Map([
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
var SIGNAL_TELEMETRY_VALUES = new Map([
  ["SIGTERM", lit("SIGTERM")],
  ["SIGKILL", lit("SIGKILL")],
  ["SIGINT", lit("SIGINT")],
]);
//@ chunk-q8cqcff6.js:13446-13503 layout
function errnoTelemetryValue(errno) {
  if (!errno) return;
  return ERRNO_TELEMETRY_VALUES.get(errno) ?? lit("other");
}
//@ chunk-q8cqcff6.js:13503-13560 layout
function signalTelemetryValue(signal) {
  if (!signal) return;
  return SIGNAL_TELEMETRY_VALUES.get(signal) ?? lit("other");
}
//@ chunk-q8cqcff6.js:13560-13756 layout
function mdmReadFields(e, n) {
  if (!n) return {};
  return {
    [`${e}_status`]: fromEnum(n.status),
    [`${e}_exit_code`]: n.exitCode ?? undefined,
    [`${e}_errno`]: errnoTelemetryValue(n.errno),
    [`${e}_signal`]: signalTelemetryValue(n.signal),
    [`${e}_duration_ms`]: n.durationMs,
  };
}
//@ chunk-q8cqcff6.js:13756-13865 layout
function buildMdmReadTelemetry(e, awaitMs) {
  return {
    is_wsl: isWsl(),
    await_ms: awaitMs,
    ...mdmReadFields("hklm", e.outcomes.hklm),
    ...mdmReadFields("hkcu", e.outcomes.hkcu),
  };
}
//@ chunk-q8cqcff6.js:13865-16864 layout
async function resolveMdmReadResult(e, n, r = false) {
  let s = [];
  let S = false;
  let E = "absent";
  for (let K of e.plistStdouts ?? []) {
    let { label, userWritable } = K;
    if (userWritable && S) continue;
    let Z =
      K.stdout === null
        ? {
            settings: {},
            errors: [managedDocumentUnreadableError(label, K.unreadReason, userWritable, K.unreadErrno)],
            documentHasPolicyContent: false,
            loadState: "didNotLoad",
            ...(userWritable && {
              userWritable,
            }),
          }
        : {
            ...checkManagedOnlySettings(K.stdout, label, {
              userWritable,
            }),
            ...(userWritable && {
              userWritable,
            }),
          };
    if (userWritable ? hasPolicyContent(Z.settings) : Z.documentHasPolicyContent)
      return {
        mdm: {
          ...Z,
          errors: [...s, ...Z.errors],
          documentHasPolicyContent: true,
        },
        hkcu: me,
        wslInherits: false,
      };
    S ||= adminDocumentPresent(Z);
    s.push(...Z.errors);
    if (!userWritable) E = combinedLoadState(E, Z.loadState);
  }
  let h = `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKLM}\\${SETTINGS}`;
  let y = null;
  let P = "disarmed";
  let O = `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKCU}\\${SETTINGS}`;
  if (
    !r &&
    (e.hklmStdout !== null || e.hklmUnreadReason !== undefined || e.hkcuStdout !== null) &&
    true &&
    isCoworkCloudEntrypoint()
  ) {
    let [K, U] = await Promise.all(
      [WSL_REG_EXE_PATH, dirname(WSL_REG_EXE_PATH)].map((Z) =>
        lstat(Z).then(
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
    let j = true;
    try {
      j = accountCouldChangeDocument(new SettingsCacheStore(), WSL_REG_EXE_PATH, K, U);
    } catch (error) {
      logForDebugging(`registry tool: could not be asked about, held: ${error}`, {
        level: "error",
      });
    }
    if (j) {
      let Z = [];
      if (e.hklmStdout !== null)
        Z.push([h, checkManagedOnlySettings(parseRegQueryStdout(e.hklmStdout) ?? "", h)]);
      else if (e.hklmUnreadReason !== undefined)
        Z.push([
          h,
          {
            settings: {},
            errors: [managedDocumentUnreadableError(h, e.hklmUnreadReason, false)],
            documentHasPolicyContent: false,
            loadState: "didNotLoad",
          },
        ]);
      if (e.hkcuStdout !== null)
        Z.push([
          O,
          checkManagedOnlySettings(parseRegQueryStdout(e.hkcuStdout) ?? "", O, {
            userWritable: true,
          }),
        ]);
      let mdmReadResult = await resolveMdmReadResult(e, n, true);
      let mdmReadResult_2 = await resolveMdmReadResult(
        {
          ...e,
          hklmStdout: null,
          hklmUnreadReason: undefined,
          hkcuStdout: null,
        },
        n,
        true,
      );
      return {
        ...mdmReadResult,
        whereAsked: {
          ...mdmReadResult_2,
          mdm: {
            ...mdmReadResult_2.mdm,
            heldDocuments: Z.map(([re, ee]) => ({
              path: re,
              parsed: {
                ...ee,
                settings: ee.loadState === "loaded" ? ee.settings : null,
              },
            })),
          },
        },
      };
    }
  }
  if (e.hklmStdout !== null) {
    let K = parseRegQueryStdout(e.hklmStdout) ?? "";
    y = checkManagedOnlySettings(K, h);
    let U = safeParseJSON(K, false);
    if (isPlainObject(U)) P = readWslInheritFlag(U);
  } else if (e.hklmUnreadReason !== undefined)
    y = {
      settings: {},
      errors: [managedDocumentUnreadableError(h, e.hklmUnreadReason, false)],
      documentHasPolicyContent: false,
      loadState: "didNotLoad",
    };
  let T = y !== null && adminDocumentPresent(y);
  if (y) {
    s.push(...y.errors);
    E = combinedLoadState(E, y.loadState);
  }
  let v = isWsl();
  let M = "disarmed";
  let x = h;
  let L = [];
  if (v) {
    M = P;
    if (M !== "armed") {
      let managedSettingsFile = await loadManagedSettingsFile(n);
      L = managedSettingsFile.links;
      if (managedSettingsFile.flag === "armed" || M === "disarmed") {
        M = managedSettingsFile.flag;
        x = managedSettingsFile.unreadableFlagPath ?? WSL_MANAGED_SETTINGS_DIR;
      }
      if (M === "disarmed") {
        s.push(...managedSettingsFile.records);
        E = combinedLoadState(E, managedSettingsFile.loadState);
      }
    }
  }
  let G = M !== "disarmed";
  let q = {
    settings: {},
    errors: s,
    loadState: E,
  };
  if (v && !G) {
    let K = new Set(y?.errors.filter((error) => error.severity === "warning"));
    return {
      mdm: {
        ...q,
        errors: q.errors.map((error) =>
          K.has(error)
            ? {
                ...error,
                wslIgnored: true,
              }
            : error,
        ),
        ...(L.length > 0 && {
          managedDocumentLinks: L,
        }),
      },
      hkcu: me,
      wslInherits: false,
    };
  }
  if (y && T)
    return {
      mdm: y,
      hkcu: me,
      wslInherits: G,
    };
  if (M === "unreadable") {
    let K = await hasManagedSettingsDocument(WSL_MANAGED_SETTINGS_DIR, n);
    let U = unreadableWslFlagWithoutPolicyError(x);
    return {
      mdm: {
        ...q,
        errors: K ? q.errors : [...q.errors, U],
        ...(K && {
          withheldFlagRecord: U,
        }),
        documentHasPolicyContent: true,
        loadState: combinedLoadState(q.loadState, "loaded"),
      },
      hkcu: me,
      wslInherits: G,
    };
  }
  if (e.hkcuStdout !== null && !isDiskless() && !(await hasWslManagedSettings(G, n))) {
    let K = checkManagedOnlySettings(parseRegQueryStdout(e.hkcuStdout) ?? "", O, {
      userWritable: true,
    });
    if (!v || K.settings.wslInheritsWindowsSettings === true) {
      let { wslInheritsWindowsSettings, managedSourcesBehavior, ...Z } = K.settings;
      return {
        mdm: q,
        hkcu: {
          settings: Z,
          errors: K.errors,
        },
        wslInherits: G,
      };
    }
    if (K.errors.length > 0)
      return {
        mdm: q,
        hkcu: {
          settings: {},
          errors: K.errors,
        },
        wslInherits: G,
      };
  }
  return {
    mdm: q,
    hkcu: me,
    wslInherits: G,
  };
}
//@ chunk-q8cqcff6.js:16864-16953 layout
async function readManagedDocumentText(e, n) {
  if (isStorageV5Enabled() && n !== undefined)
    return (await readFileChecked(e, MAX_SETTINGS_JSON_BYTES)).content;
  return readFileSync(e, MAX_SETTINGS_JSON_BYTES);
}
//@ chunk-q8cqcff6.js:16953-17024 layout
async function hasWslManagedSettings(e, n) {
  if (e && (await hasManagedSettingsDocument(WSL_MANAGED_SETTINGS_DIR, n))) return true;
  return hasManagedSettingsDocument(getManagedFilePath(), n);
}
//@ chunk-q8cqcff6.js:17024-17167 layout
async function managedFileHasContent(e, n) {
  let r;
  try {
    r = await readManagedDocumentText(e, n);
  } catch (error) {
    return !isENOENT(error);
  }
  try {
    let settingsContent = parseSettingsContent(r, e, true);
    return adminDocumentPresent({
      ...settingsContent,
      loadState: loadStateOf(settingsContent),
    });
  } catch {
    return true;
  }
}
//@ chunk-q8cqcff6.js:17167-17659 fingerprint = hasManagedSettingsFile (0.617)
async function hasManagedSettingsFile(e) {
  if (!isWsl() || !mdmLoader().wslInherits) return "";
  let n = [];
  try {
    n.push(await readManagedDocumentText(join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"), e));
  } catch (error) {
    n.push(unreadableMarker(error));
  }
  try {
    let dropInDir = join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d");
    let sorted = (await getFsImplementation().readdir(dropInDir))
      .filter(
        (S) => (S.isFile() || S.isSymbolicLink()) && S.name.endsWith(".json") && !S.name.startsWith("."),
      )
      .map((S) => S.name)
      .sort();
    for (let S of sorted)
      try {
        n.push(`${S}\x00${await readManagedDocumentText(join(dropInDir, S), e)}`);
      } catch (error) {
        n.push(`${S}\x00${unreadableMarker(error)}`);
      }
  } catch (error) {
    let content = unreadableMarker(error);
    if (content !== "") n.push(content);
  }
  return n.join("\x01");
}
//@ chunk-q8cqcff6.js:17659-17707 sole-consumer
function unreadableMarker(error) {
  return isNotFoundErrno_5(error) ? "" : "\x00unreadable";
}
//@ chunk-dcmhvw5a.js:470165-470468 callgraph-fingerprint = parseCommandOutputAsSettings (0.209)
function parseCommandOutputAsSettings(stdout) {
  let data = clone(stdout);
  let r = [
    ...dropManagedOnlyKeys(data, "SDK inline settings"),
    ...validateSettingsDocument(data, "SDK inline settings"),
  ];
  let parseResult = getSettingsSchemaForDocument(data).safeParse(data);
  if (!parseResult.success)
    return {
      settings: null,
      errors: [...r, ...formatZodError(parseResult.error, "SDK inline settings")],
    };
  if (r.some((a) => a.severity === "fatal"))
    return {
      settings: null,
      errors: r,
    };
  return {
    settings: parseResult.data,
    errors: r,
  };
}
//@ chunk-yhvmbyx2.js:273-590 placement
function describeMdmSettingsState() {
  if (!hasMdmResult()) throw Error("the MDM settings have not been read yet");
  if (isMachineAdminDocumentUnreadable()) throw Error("an admin-owned settings document could not be read");
  if (getManagedFilePathOverride() !== undefined) throw Error("the managed-settings path was overridden");
  let forceLoginOrgUUID = getEveryMachineAdminTierSettings()[0]?.forceLoginOrgUUID;
  if (forceLoginOrgUUID === undefined) return;
  return typeof forceLoginOrgUUID === "string" ? [forceLoginOrgUUID] : forceLoginOrgUUID;
}
export {
  wslInheritsSettings,
  readMdmSnapshot,
  replaceMdmSetting,
  mdmReadSnapshot,
  describeMdmSettingsState,
  hasManagedSettingsFile,
  me,
  parseCommandOutputAsSettings,
  MdmSettingsLoader,
  EMPTY_MDM_RESULT,
  readManagedDocumentText,
  managedFileHasContent,
};
