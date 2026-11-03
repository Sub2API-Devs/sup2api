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
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  join,
  join as join_2,
  join as join_3,
} from "path";
import { lstat } from "fs/promises";
import { getMdmRawReadPromise, fireRawRead } from "./rawRead.js";
import { logForDebugging } from "../../debug.js";
import { logEvent } from "../../../services/analytics/index.js";
import { One, Uyr, se, Ii, Ni, Qt, ave } from "../managedPluginTiers.js";
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
import { Do } from "../../git/gitSafeEnv.js";
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
var EMPTY_MDM_RESULT = Object.freeze({ settings: {}, errors: [], loadState: "absent" }),
  freeze = Object.freeze({ settings: {}, errors: [] });
/**
 * MDM 设置加载器：启动时异步读取 macOS plist 或 Windows 注册表 HKLM/HKCU\SOFTWARE\Policies\ClaudeCode\Settings（WSL 下可继承 Windows），完成后打 tengu_managed_settings_os_read。
 */
//@ chunk-q8cqcff6.js:9107-9983 fingerprint = startMdmSettingsLoad (0.742)
class MdmSettingsLoader {
  mdm = null;
  hkcu = null;
  wslInherits = !1;
  whereAsked = void 0;
  readOutcomes = null;
  loadPromise = null;
  startLoad(e) {
    if (this.loadPromise) return;
    this.loadPromise = (async () => {
      let now = Date.now(),
        s = await (getMdmRawReadPromise() ?? fireRawRead()),
        {
          mdm: mdm,
          hkcu: hkcu,
          wslInherits: wslInherits,
          whereAsked: whereAsked,
        } = await resolveMdmReadResult(s, e);
      (this.replace(mdm, hkcu, wslInherits, whereAsked), (this.readOutcomes = s.outcomes));
      let P = Date.now() - now;
      logForDebugging(`MDM settings load completed in ${P}ms`);
      try {
        logEvent("tengu_managed_settings_os_read", buildMdmReadTelemetry(s, P));
      } catch {}
      let O = One();
      if (Object.keys(O.settings).length > 0) {
        logForDebugging(`MDM settings found: ${Object.keys(O.settings).join(", ")}`);
        try {
          logForDiagnosticsNoPII("info", "mdm_settings_loaded", {
            duration_ms: P,
            key_count: Object.keys(mdm.settings).length,
            error_count: mdm.errors.length,
          });
        } catch {}
      }
    })();
  }
  replace(e, n, r, s) {
    ((this.mdm = e), (this.hkcu = n), (this.wslInherits = r), (this.whereAsked = s));
  }
  reset() {
    ((this.mdm = null),
      (this.hkcu = null),
      (this.wslInherits = !1),
      (this.whereAsked = void 0),
      (this.readOutcomes = null),
      (this.loadPromise = null));
  }
}
//@ chunk-q8cqcff6.js:10676-10720 placement
function Mne() {
  return Uyr(se()).wslInherits;
}
//@ chunk-q8cqcff6.js:10720-10764 placement
function GOe(e, n, r, s) {
  se().replace(e, n, r, s);
}
/**
 * 读取当前 MDM、HKCU 与 WSL 继承设置的快照（缺省时用空结果）。
 */
//@ chunk-q8cqcff6.js:10764-10885 placement
function mdmReadSnapshot() {
  let { mdm: mdm, hkcu: hkcu, wslInherits: wslInherits, whereAsked: whereAsked } = se();
  return {
    mdm: mdm ?? EMPTY_MDM_RESULT,
    hkcu: hkcu ?? freeze,
    wslInherits: wslInherits,
    whereAsked: whereAsked,
  };
}
//@ chunk-q8cqcff6.js:10885-10974 placement
async function n1e(e) {
  let n = await fireRawRead();
  return { ...(await resolveMdmReadResult(n, e)), readOutcomes: n.outcomes };
}
//@ chunk-q8cqcff6.js:10974-12545 placement
function checkManagedOnlySettings(e, n, { userWritable: r = !1 } = {}) {
  let s = safeParseJSON(e, !1);
  if (!isPlainObject(s))
    return {
      settings: {},
      errors: [unparseablePolicyDocumentError(n, { userWritable: r })],
      documentHasPolicyContent: !1,
      loadState: "didNotLoad",
    };
  let S = [],
    E = s;
  for (let M of r ? MANAGED_ONLY_KEYS : []) {
    if (!(M in E)) continue;
    if (((E = E === s ? { ...s } : E), delete E[M], !isInertManagedMcpServersNotice(M)))
      S.push({
        file: n,
        path: M,
        message: `"${M}" is only honored from administrator-controlled managed settings and was ignored in ${n}, which the user account can write.`,
        severity: "warning",
        statusOnly: !0,
      });
  }
  if (r) {
    for (let x of Ii) {
      if (!(x in E)) continue;
      ((E = E === s ? { ...s } : E),
        delete E[x],
        S.push({
          file: n,
          path: x,
          message: `"${x}" is only honored from administrator-controlled managed settings and was ignored in ${n}, which the user account can write.`,
          severity: "warning",
          statusOnly: !0,
        }));
    }
    let enabledPlugins = E.enabledPlugins;
    if (Ni(enabledPlugins)) {
      if (Object.entries(enabledPlugins).filter(([L, G]) => L.endsWith(Qt) || G !== !1).length > 0) {
        E = E === s ? { ...s } : E;
        let L = Do(enabledPlugins, (G, q) => !q.endsWith(Qt) && G === !1);
        if (Object.keys(L).length > 0) E.enabledPlugins = L;
        else delete E.enabledPlugins;
        S.push({
          file: n,
          path: "enabledPlugins",
          message: `"enabledPlugins" entries that enable a plugin, or name a built-in, are only honored from administrator-controlled managed settings and were ignored in ${n}, which the user account can write.`,
          severity: "warning",
          statusOnly: !0,
        });
      }
    }
  }
  let {
      settings: settings,
      errors: errors,
      documentHasPolicyContent: documentHasPolicyContent,
      loadState: loadState,
      onlySubstitutes: onlySubstitutes,
    } = parsePolicyObjectTolerant(E, n),
    v = [...S, ...errors];
  return {
    settings: settings ?? {},
    errors: r
      ? v.map((M) => ({
          ...(M.severity === "warning" && !M.startupFatal
            ? M
            : { ...wi(M), severity: "warning", statusOnly: !0 }),
          userWritable: !0,
        }))
      : v,
    documentHasPolicyContent: documentHasPolicyContent,
    loadState: loadState,
    ...(onlySubstitutes && { onlySubstitutes: onlySubstitutes }),
  };
}
//@ chunk-q8cqcff6.js:12545-12614 placement
function wi({ startupFatal: startupFatal, loadedWithoutGuardHook: loadedWithoutGuardHook, ...r }) {
  return r;
}
//@ chunk-q8cqcff6.js:12614-12878 layout
function managedDocumentUnreadableError(e, n, r, s) {
  return {
    file: e,
    path: "",
    message: `Managed settings document (${e}) could not be read: ${n}; none of its settings are in effect.`,
    severity: r ? "warning" : "fatal",
    statusOnly: !0,
    errorClass: "unreadable",
    ...(s !== void 0 && { errno: s }),
    ...(r && { userWritable: !0 }),
  };
}
/**
 * 从 reg query 输出中提取 REG_SZ/REG_EXPAND_SZ 值（默认值名 Settings）。
 */
//@ chunk-q8cqcff6.js:12878-13074 fingerprint = parseRegQueryStdout (0.627)
function parseRegQueryStdout(stdout, valueName = "Settings") {
  let escaped = valueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    regExp = new RegExp(`^[ \\t]+${escaped}[ \\t]+REG_(?:EXPAND_)?SZ[ \\t]+([\\s\\S]*)`, "im"),
    S = stdout.match(regExp)?.[1]?.trimEnd();
  return S ? S : null;
}
/**
 * MDM 读取遥测中允许上报的 errno 与信号名映射。
 */
//@ chunk-q8cqcff6.js:13074-13446 layout
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
  ]),
  SIGNAL_TELEMETRY_VALUES = new Map([
    ["SIGTERM", lit("SIGTERM")],
    ["SIGKILL", lit("SIGKILL")],
    ["SIGINT", lit("SIGINT")],
  ]);
//@ chunk-q8cqcff6.js:13446-13503 layout
function Di(e) {
  if (!e) return;
  return ERRNO_TELEMETRY_VALUES.get(e) ?? lit("other");
}
//@ chunk-q8cqcff6.js:13503-13560 layout
function Hi(e) {
  if (!e) return;
  return SIGNAL_TELEMETRY_VALUES.get(e) ?? lit("other");
}
//@ chunk-q8cqcff6.js:13560-13756 layout
function mdmReadFields(e, n) {
  if (!n) return {};
  return {
    [`${e}_status`]: fromEnum(n.status),
    [`${e}_exit_code`]: n.exitCode ?? void 0,
    [`${e}_errno`]: Di(n.errno),
    [`${e}_signal`]: Hi(n.signal),
    [`${e}_duration_ms`]: n.durationMs,
  };
}
//@ chunk-q8cqcff6.js:13756-13865 layout
function buildMdmReadTelemetry(e, n) {
  return {
    is_wsl: isWsl(),
    await_ms: n,
    ...mdmReadFields("hklm", e.outcomes.hklm),
    ...mdmReadFields("hkcu", e.outcomes.hkcu),
  };
}
//@ chunk-q8cqcff6.js:13865-16864 layout
async function resolveMdmReadResult(e, n, r = !1) {
  let s = [],
    S = !1,
    E = "absent";
  for (let K of e.plistStdouts ?? []) {
    let { label: label, userWritable: userWritable } = K;
    if (userWritable && S) continue;
    let Z =
      K.stdout === null
        ? {
            settings: {},
            errors: [managedDocumentUnreadableError(label, K.unreadReason, userWritable, K.unreadErrno)],
            documentHasPolicyContent: !1,
            loadState: "didNotLoad",
            ...(userWritable && { userWritable: userWritable }),
          }
        : {
            ...checkManagedOnlySettings(K.stdout, label, { userWritable: userWritable }),
            ...(userWritable && { userWritable: userWritable }),
          };
    if (userWritable ? hasPolicyContent(Z.settings) : Z.documentHasPolicyContent)
      return {
        mdm: { ...Z, errors: [...s, ...Z.errors], documentHasPolicyContent: !0 },
        hkcu: freeze,
        wslInherits: !1,
      };
    if (((S ||= adminDocumentPresent(Z)), s.push(...Z.errors), !userWritable))
      E = combinedLoadState(E, Z.loadState);
  }
  let h = `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKLM}\\${SETTINGS}`,
    y = null,
    P = "disarmed",
    O = `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKCU}\\${SETTINGS}`;
  if (
    !r &&
    (e.hklmStdout !== null || e.hklmUnreadReason !== void 0 || e.hkcuStdout !== null) &&
    !0 &&
    isCoworkCloudEntrypoint()
  ) {
    let [K, U] = await Promise.all(
        [WSL_REG_EXE_PATH, dirname_4(WSL_REG_EXE_PATH)].map((Z) =>
          lstat(Z).then(
            ({ uid: uid, gid: gid, mode: mode }) => ({ uid: uid, gid: gid, mode: mode }),
            () => {
              return;
            },
          ),
        ),
      ),
      j = !0;
    try {
      j = accountCouldChangeDocument(new SettingsCacheStore(), WSL_REG_EXE_PATH, K, U);
    } catch (error) {
      logForDebugging(`registry tool: could not be asked about, held: ${error}`, { level: "error" });
    }
    if (j) {
      let Z = [];
      if (e.hklmStdout !== null)
        Z.push([h, checkManagedOnlySettings(parseRegQueryStdout(e.hklmStdout) ?? "", h)]);
      else if (e.hklmUnreadReason !== void 0)
        Z.push([
          h,
          {
            settings: {},
            errors: [managedDocumentUnreadableError(h, e.hklmUnreadReason, !1)],
            documentHasPolicyContent: !1,
            loadState: "didNotLoad",
          },
        ]);
      if (e.hkcuStdout !== null)
        Z.push([
          O,
          checkManagedOnlySettings(parseRegQueryStdout(e.hkcuStdout) ?? "", O, { userWritable: !0 }),
        ]);
      let te = await resolveMdmReadResult(e, n, !0),
        ie = await resolveMdmReadResult(
          { ...e, hklmStdout: null, hklmUnreadReason: void 0, hkcuStdout: null },
          n,
          !0,
        );
      return {
        ...te,
        whereAsked: {
          ...ie,
          mdm: {
            ...ie.mdm,
            heldDocuments: Z.map(([re, ee]) => ({
              path: re,
              parsed: { ...ee, settings: ee.loadState === "loaded" ? ee.settings : null },
            })),
          },
        },
      };
    }
  }
  if (e.hklmStdout !== null) {
    let K = parseRegQueryStdout(e.hklmStdout) ?? "";
    y = checkManagedOnlySettings(K, h);
    let U = safeParseJSON(K, !1);
    if (isPlainObject(U)) P = readWslInheritFlag(U);
  } else if (e.hklmUnreadReason !== void 0)
    y = {
      settings: {},
      errors: [managedDocumentUnreadableError(h, e.hklmUnreadReason, !1)],
      documentHasPolicyContent: !1,
      loadState: "didNotLoad",
    };
  let T = y !== null && adminDocumentPresent(y);
  if (y) (s.push(...y.errors), (E = combinedLoadState(E, y.loadState)));
  let v = isWsl(),
    M = "disarmed",
    x = h,
    L = [];
  if (v) {
    if (((M = P), M !== "armed")) {
      let K = await loadManagedSettingsFile(n);
      if (((L = K.links), K.flag === "armed" || M === "disarmed"))
        ((M = K.flag), (x = K.unreadableFlagPath ?? WSL_MANAGED_SETTINGS_DIR));
      if (M === "disarmed") (s.push(...K.records), (E = combinedLoadState(E, K.loadState)));
    }
  }
  let G = M !== "disarmed",
    q = { settings: {}, errors: s, loadState: E };
  if (v && !G) {
    let K = new Set(y?.errors.filter((U) => U.severity === "warning"));
    return {
      mdm: {
        ...q,
        errors: q.errors.map((error) => (K.has(error) ? { ...error, wslIgnored: !0 } : error)),
        ...(L.length > 0 && { managedDocumentLinks: L }),
      },
      hkcu: freeze,
      wslInherits: !1,
    };
  }
  if (y && T) return { mdm: y, hkcu: freeze, wslInherits: G };
  if (M === "unreadable") {
    let K = await hasManagedSettingsDocument(WSL_MANAGED_SETTINGS_DIR, n),
      U = unreadableWslFlagWithoutPolicyError(x);
    return {
      mdm: {
        ...q,
        errors: K ? q.errors : [...q.errors, U],
        ...(K && { withheldFlagRecord: U }),
        documentHasPolicyContent: !0,
        loadState: combinedLoadState(q.loadState, "loaded"),
      },
      hkcu: freeze,
      wslInherits: G,
    };
  }
  if (e.hkcuStdout !== null && !isDiskless() && !(await Mi(G, n))) {
    let K = checkManagedOnlySettings(parseRegQueryStdout(e.hkcuStdout) ?? "", O, { userWritable: !0 });
    if (!v || K.settings.wslInheritsWindowsSettings === !0) {
      let {
        wslInheritsWindowsSettings: wslInheritsWindowsSettings,
        managedSourcesBehavior: managedSourcesBehavior,
        ...Z
      } = K.settings;
      return { mdm: q, hkcu: { settings: Z, errors: K.errors }, wslInherits: G };
    }
    if (K.errors.length > 0) return { mdm: q, hkcu: { settings: {}, errors: K.errors }, wslInherits: G };
  }
  return { mdm: q, hkcu: freeze, wslInherits: G };
}
//@ chunk-q8cqcff6.js:16864-16953 layout
async function readManagedDocumentText(e, n) {
  if (isStorageV5Enabled() && n !== void 0)
    return (await readFileChecked(e, MAX_SETTINGS_JSON_BYTES)).content;
  return readFileSync(e, MAX_SETTINGS_JSON_BYTES);
}
//@ chunk-q8cqcff6.js:16953-17024 layout
async function Mi(e, n) {
  if (e && (await hasManagedSettingsDocument(WSL_MANAGED_SETTINGS_DIR, n))) return !0;
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
    let s = parseSettingsContent(r, e, !0);
    return adminDocumentPresent({ ...s, loadState: loadStateOf(s) });
  } catch {
    return !0;
  }
}
//@ chunk-q8cqcff6.js:17167-17659 fingerprint = hasManagedSettingsFile (0.617)
async function hasManagedSettingsFile(e) {
  if (!isWsl() || !se().wslInherits) return "";
  let n = [];
  try {
    n.push(await readManagedDocumentText(join_3(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"), e));
  } catch (error) {
    n.push(St(error));
  }
  try {
    let r = join_3(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d"),
      sorted = (await getFsImplementation().readdir(r))
        .filter(
          (S) => (S.isFile() || S.isSymbolicLink()) && S.name.endsWith(".json") && !S.name.startsWith("."),
        )
        .map((S) => S.name)
        .sort();
    for (let S of sorted)
      try {
        n.push(`${S}\x00${await readManagedDocumentText(join_3(r, S), e)}`);
      } catch (error) {
        n.push(`${S}\x00${St(error)}`);
      }
  } catch (error) {
    let content = St(error);
    if (content !== "") n.push(content);
  }
  return n.join("\x01");
}
//@ chunk-q8cqcff6.js:17659-17707 sole-consumer
function St(e) {
  return isNotFoundErrno_5(e) ? "" : "\x00unreadable";
}
//@ chunk-dcmhvw5a.js:470165-470468 callgraph-fingerprint = parseCommandOutputAsSettings (0.209)
function parseCommandOutputAsSettings(e) {
  let n = clone(e),
    r = [
      ...dropManagedOnlyKeys(n, "SDK inline settings"),
      ...validateSettingsDocument(n, "SDK inline settings"),
    ],
    parseResult = getSettingsSchemaForDocument(n).safeParse(n);
  if (!parseResult.success)
    return { settings: null, errors: [...r, ...formatZodError(parseResult.error, "SDK inline settings")] };
  if (r.some((a) => a.severity === "fatal")) return { settings: null, errors: r };
  return { settings: parseResult.data, errors: r };
}
//@ chunk-yhvmbyx2.js:273-590 placement
function describeMdmSettingsState() {
  if (!ave()) throw Error("the MDM settings have not been read yet");
  if (isMachineAdminDocumentUnreadable()) throw Error("an admin-owned settings document could not be read");
  if (getManagedFilePathOverride() !== void 0) throw Error("the managed-settings path was overridden");
  let e = getEveryMachineAdminTierSettings()[0]?.forceLoginOrgUUID;
  if (e === void 0) return;
  return typeof e === "string" ? [e] : e;
}

export {
  Mne,
  n1e,
  GOe,
  mdmReadSnapshot,
  describeMdmSettingsState,
  hasManagedSettingsFile,
  freeze,
  parseCommandOutputAsSettings,
  MdmSettingsLoader,
  EMPTY_MDM_RESULT,
  readManagedDocumentText,
  managedFileHasContent,
};
