/**
 * services/remoteTools/unattendedConsentStore.ts
 *
 * 2.1.316 新增。无人值守服务同意记录的读写、缓存与托管设置禁止判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dw613xrm.js (30)
 * attribution: placement 30
 */
import { join, dirname } from "path";
import { homedir, hostname } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, _enum, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { shortLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { tildify } from "../../utils/path.js";
import { getFileReader } from "../../utils/fileStore.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { unattendedRunGrantStands } from "./unattendedRunGrant.js";
import { hostUnattendedGrant } from "../../utils/sessionShape.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost } from "../../bootstrap/state.js";
import {
  getAllPolicyTierSettings,
  getDurablePolicyTierSettings,
  getSettingsForSource,
  getSettingsForSourceTightenOnly,
} from "../../utils/settings/settings.js";

//@ chunk-dw613xrm.js:731-825 placement
function normalizeHostname(e) {
  return e
    .trim()
    .toLowerCase()
    .replace(/(\.(local|lan|home|localdomain))+$/, "");
}
//@ chunk-dw613xrm.js:825-1019 placement
/**
 * 无人值守服务同意记录文件的名、版本、条款串与 schema。
 */
var UNATTENDED_SERVING_CONSENT_VERSION = 1;
var UNATTENDED_SERVING_CONSENT_TERMS = "unattended-serving:v1:auto-arm-classifier";
var UNATTENDED_SERVING_CONSENT_JSON = "unattended-serving-consent.json";
var unattendedConsentRecordSchema = DoctorLazy(() =>
  u({
    version: literal(UNATTENDED_SERVING_CONSENT_VERSION),
    choice: _enum(["accepted", "declined"]),
    terms: string(),
    decidedAt: string(),
    hostname: string(),
  }),
);
//@ chunk-dw613xrm.js:1019-1066 placement
/**
 * 同意记录文件的完整路径（~/.claude/state/unattended-serving-consent.json）。
 */
function unattendedConsentFilePath() {
  return join(homedir(), ".claude", "state", UNATTENDED_SERVING_CONSENT_JSON);
}
//@ chunk-dw613xrm.js:1066-1104 placement
function unattendedServingMachineName(e = hostname()) {
  return shortLabel(normalizeHostname(e));
}
//@ chunk-dw613xrm.js:1104-1188 placement
function unattendedServingConsentRevokeHint() {
  return `change it in /config, or delete ${tildify(unattendedConsentFilePath())} to be asked again`;
}
//@ chunk-dw613xrm.js:1188-1413 placement
/**
 * 默认同意存储读写
 */
function defaultConsentStore() {
  return {
    readText: async () => {
      try {
        return await getFileReader().read(unattendedConsentFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (e) => {
      let n = unattendedConsentFilePath();
      await getFileReader().mkdir(dirname(n), 448);
      await getFileReader().atomicWrite(n, e, 384);
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-dw613xrm.js:1413-1820 placement
async function readUnattendedServingConsent(e) {
  let n = e === undefined ? currentUnattendedConsentCache() : undefined;
  let now = Date.now();
  let writes = n?.writes;
  let { choice, unreadable, staleYes } = await readConsentRecord(e ?? defaultConsentStore());
  let f = n !== undefined && isStoredLoginPinned() && (await unattendedRunGrantStands(hostUnattendedGrant()));
  let confined =
    f &&
    (
      await commandSandboxPosture({
        start: true,
      })
    ).confined;
  if (
    n !== undefined &&
    writes === n.writes &&
    (n.view === undefined || !isConsentViewFresh(n) || now >= n.view.readAt)
  ) {
    n.view = {
      choice,
      readAt: now,
      unreadable,
      staleYes: staleYes === true,
      hostAllows: confined,
      grantOutsideSandbox: f && !confined,
    };
    if (isConsentViewFresh(n)) n.staleUnresolved = false;
  }
  return choice;
}
//@ chunk-dw613xrm.js:1820-2356 placement
/**
 * 读无人值守服务同意记录
 */
async function readConsentRecord(e) {
  let n;
  try {
    n = await e.readText();
  } catch (error) {
    logForDebugging(`unattended-serving consent: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return {
      choice: "unset",
      unreadable: true,
    };
  }
  if (n === undefined)
    return {
      choice: "unset",
      unreadable: false,
    };
  try {
    let r = unattendedConsentRecordSchema().safeParse(jsonParse(n));
    if (!r.success)
      return {
        choice: "unset",
        unreadable: true,
      };
    let a =
      r.data.choice === "declined" ||
      (normalizeHostname(r.data.hostname) === normalizeHostname(e.hostname()) &&
        r.data.terms === UNATTENDED_SERVING_CONSENT_TERMS);
    return {
      choice: a ? r.data.choice : "unset",
      unreadable: false,
      staleYes: !a && r.data.choice === "accepted",
    };
  } catch {
    return {
      choice: "unset",
      unreadable: true,
    };
  }
}
//@ chunk-dw613xrm.js:2356-2991 placement
/**
 * 写入无人值守服务同意（unattended-serving-consent.json）；本模块还负责读取、缓存与托管设置禁止判断。
 */
async function writeUnattendedServingConsent(e, n) {
  if (e === "accepted" && managedSettingsForbidUnattendedServing()) {
    logForDebugging(
      "unattended-serving consent: a Yes while settings turn unattended serving off is not stored",
      {
        level: "warn",
      },
    );
    return false;
  }
  let r = n === undefined ? currentUnattendedConsentCache() : undefined;
  let a = n ?? defaultConsentStore();
  try {
    await a.writeText(
      jsonStringify(
        {
          version: UNATTENDED_SERVING_CONSENT_VERSION,
          choice: e,
          terms: UNATTENDED_SERVING_CONSENT_TERMS,
          decidedAt: a.now().toISOString(),
          hostname: normalizeHostname(a.hostname()),
        },
        null,
        2,
      ) +
        `
`,
    );
    if (r !== undefined) {
      r.writes += 1;
      r.view = {
        choice: e,
        readAt: Date.now(),
        unreadable: false,
        staleYes: false,
        hostAllows: r.view?.hostAllows === true,
        grantOutsideSandbox: r.view?.grantOutsideSandbox === true,
      };
      r.staleUnresolved = false;
    }
    return true;
  } catch (error) {
    logForDebugging(`unattended-serving consent: answer not saved (${errorMessage(error)})`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-dw613xrm.js:2991-3115 placement
var CONSENT_REFRESH_TIMEOUT_MS = 3000;
var unattendedConsentCache = new HostScoped(() => ({
  view: undefined,
  refresh: undefined,
  refreshStartedAt: undefined,
  abandoned: undefined,
  staleUnresolved: false,
  writes: 0,
}));
//@ chunk-dw613xrm.js:3115-3141 placement
/**
 * 当前进程根下的同意记录缓存（含视图与写入计数）。
 */
function currentUnattendedConsentCache() {
  return onProcessRootHost(unattendedConsentCache);
}
//@ chunk-dw613xrm.js:3141-3210 placement
function unattendedServingConsentView() {
  let e = currentUnattendedConsentCache();
  if (!isConsentViewFresh(e)) refreshConsentView(e);
  return e.view?.choice ?? "unset";
}
//@ chunk-dw613xrm.js:3210-3305 placement
/**
 * 缓存的同意视图是否仍在刷新时限内（未被超时视为有效）。
 */
function isConsentViewFresh(e, n = Date.now()) {
  if (e.view === undefined) return false;
  let r = n - e.view.readAt;
  return r >= 0 && r <= CONSENT_REFRESH_TIMEOUT_MS;
}
//@ chunk-dw613xrm.js:3305-3348 placement
function unattendedServingConsentViewIsFresh(e = Date.now()) {
  return isConsentViewFresh(currentUnattendedConsentCache(), e);
}
//@ chunk-dw613xrm.js:3348-3359 placement
var CONSENT_REFRESH_GIVE_UP_MS = 1500;
//@ chunk-dw613xrm.js:3359-3709 placement
async function freshUnattendedServingConsent(signal) {
  let n = currentUnattendedConsentCache();
  if (isConsentViewFresh(n)) return;
  let r = refreshConsentView(n);
  let a;
  let s;
  let g =
    signal?.aborted === true
      ? Promise.resolve("gave_up")
      : new Promise((resolve) => {
          a = setTimeout((f) => f("gave_up"), CONSENT_REFRESH_GIVE_UP_MS, resolve);
          s = () => resolve("gave_up");
          signal?.addEventListener("abort", s, {
            once: true,
          });
        });
  await Promise.race([r, g]);
  clearTimeout(a);
  if (s !== undefined) signal?.removeEventListener("abort", s);
  if (!isConsentViewFresh(n)) {
    n.staleUnresolved = true;
    abandonConsentRefresh(n, r);
  }
}
//@ chunk-dw613xrm.js:3709-3895 placement
/**
 * 放弃超时的同意刷新
 */
function abandonConsentRefresh(e, n) {
  if (e.refresh !== n || e.abandoned !== undefined) return false;
  e.refresh = undefined;
  e.refreshStartedAt = undefined;
  e.abandoned = n;
  n.finally(() => {
    if (e.abandoned === n) e.abandoned = undefined;
  });
  return true;
}
//@ chunk-dw613xrm.js:3895-4203 placement
/**
 * 刷新同意视图
 */
function refreshConsentView(e) {
  if (e.refresh !== undefined) {
    if (
      (e.refreshStartedAt !== undefined &&
        performance.now() - e.refreshStartedAt <= CONSENT_REFRESH_GIVE_UP_MS) ||
      !abandonConsentRefresh(e, e.refresh)
    )
      return e.refresh;
  }
  e.refreshStartedAt = performance.now();
  let n = readUnattendedServingConsent()
    .catch(() => {
      return;
    })
    .finally(() => {
      if (e.refresh === n) {
        e.refresh = undefined;
        e.refreshStartedAt = undefined;
      }
    });
  e.refresh = n;
  return n;
}
//@ chunk-dw613xrm.js:4203-4243 placement
function unattendedServingConsented() {
  return unattendedServingConsentView() === "accepted";
}
//@ chunk-dw613xrm.js:4243-4279 placement
function managedSettingsForbidUnattendedServing() {
  return unattendedServingForbiddenBy() !== undefined;
}
//@ chunk-dw613xrm.js:4279-4455 placement
function unattendedServingForbiddenBy() {
  let e = (n) => n?.remoteTools?.allowUnattendedServing === false;
  return getAllPolicyTierSettings().some(e) ||
    getDurablePolicyTierSettings().some(e) ||
    e(getSettingsForSource("policySettings"))
    ? "managed"
    : e(getSettingsForSourceTightenOnly("userSettings"))
      ? "user"
      : undefined;
}
//@ chunk-dw613xrm.js:4455-4475 placement
function primeUnattendedServingConsent() {
  unattendedServingConsentView();
}
//@ chunk-dw613xrm.js:4475-4550 placement
function unattendedServingConsentMayHoldYes() {
  let { view } = currentUnattendedConsentCache();
  return view?.unreadable === true || view?.staleYes === true;
}
//@ chunk-dw613xrm.js:4550-4598 placement
function unattendedServingConsentUnreadable() {
  return currentUnattendedConsentCache().view?.unreadable === true;
}
//@ chunk-dw613xrm.js:4598-4988 placement
async function commandSandboxPosture({ start }) {
  try {
    let { classifyDeviceSandboxPosture, ensureDeviceSandboxPosture, readDeviceSandboxSnapshot } =
      await import("./chunk-g33cj79a.js");
    return start
      ? await ensureDeviceSandboxPosture()
      : classifyDeviceSandboxPosture(readDeviceSandboxSnapshot(), {
          requireStarted: false,
        });
  } catch (error) {
    logForDebugging(
      `unattended-serving consent: command sandbox could not be asked, taken as not confining (${errorMessage(error)})`,
      {
        level: "warn",
      },
    );
    return {
      confined: false,
      reason: "sandbox_failed_to_start",
    };
  }
}
//@ chunk-dw613xrm.js:4988-5034 placement
/**
 * 托管设置是否明确允许无人值守服务。
 */
function hostAllowsUnattended() {
  return currentUnattendedConsentCache().view?.hostAllows === true;
}
//@ chunk-dw613xrm.js:5034-5118 placement
function hostGrantOutsideSandbox() {
  let e = currentUnattendedConsentCache();
  return !e.staleUnresolved && e.view?.grantOutsideSandbox === true;
}
//@ chunk-dw613xrm.js:5118-5205 placement
/**
 * 视图尚未被读坏、选择为 unset 且 hostAllows 为真时，允许保守地按「是」处理。
 */
function mayHoldUnansweredConsent(e, n) {
  return n && e.view !== undefined && e.view.choice === "unset" && !e.view.unreadable;
}
//@ chunk-dw613xrm.js:5205-5312 placement
function unattendedServingAllowedByHostFlag() {
  try {
    let e = currentUnattendedConsentCache();
    return (
      !managedSettingsForbidUnattendedServing() &&
      !e.staleUnresolved &&
      mayHoldUnansweredConsent(e, e.view?.hostAllows === true)
    );
  } catch {
    return false;
  }
}
//@ chunk-dw613xrm.js:5312-5518 placement
function unattendedServingConsentPending(e) {
  try {
    let n = unattendedServingConsented();
    let r = currentUnattendedConsentCache();
    return (
      managedSettingsForbidUnattendedServing() ||
      r.staleUnresolved ||
      (!n && !mayHoldUnansweredConsent(r, e ?? hostAllowsUnattended()))
    );
  } catch (error) {
    logForDebugging(
      `unattended-serving consent: read failed, call treated as unconsented (${errorMessage(error)})`,
      {
        level: "warn",
      },
    );
    return true;
  }
}
export {
  normalizeHostname,
  unattendedServingConsentView,
  unattendedServingConsentMayHoldYes,
  unattendedServingConsentViewIsFresh,
  freshUnattendedServingConsent,
  unattendedServingAllowedByHostFlag,
  unattendedServingConsentPending,
  unattendedServingConsented,
  readUnattendedServingConsent,
  managedSettingsForbidUnattendedServing,
  writeUnattendedServingConsent,
  unattendedServingConsentRevokeHint,
  unattendedServingMachineName,
  UNATTENDED_SERVING_CONSENT_TERMS,
  UNATTENDED_SERVING_CONSENT_VERSION,
  primeUnattendedServingConsent,
  unattendedServingForbiddenBy,
  commandSandboxPosture,
  unattendedServingConsentUnreadable,
  hostGrantOutsideSandbox,
};
