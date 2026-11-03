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
import { u, T, U, o } from "../../../vendor/zod/v4/classic/schemas.js";
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
var UNATTENDED_SERVING_CONSENT_VERSION = 1,
  UNATTENDED_SERVING_CONSENT_TERMS = "unattended-serving:v1:auto-arm-classifier",
  UNATTENDED_SERVING_CONSENT_JSON = "unattended-serving-consent.json",
  E = DoctorLazy(() =>
    u({
      version: T(UNATTENDED_SERVING_CONSENT_VERSION),
      choice: U(["accepted", "declined"]),
      terms: o(),
      decidedAt: o(),
      hostname: o(),
    }),
  );
//@ chunk-dw613xrm.js:1019-1066 placement
function v() {
  return join(homedir(), ".claude", "state", UNATTENDED_SERVING_CONSENT_JSON);
}
//@ chunk-dw613xrm.js:1066-1104 placement
function unattendedServingMachineName(e = hostname()) {
  return shortLabel(normalizeHostname(e));
}
//@ chunk-dw613xrm.js:1104-1188 placement
function unattendedServingConsentRevokeHint() {
  return `change it in /config, or delete ${tildify(v())} to be asked again`;
}
/**
 * 默认同意存储读写
 */
//@ chunk-dw613xrm.js:1188-1413 placement
function defaultConsentStore() {
  return {
    readText: async () => {
      try {
        return await getFileReader().read(v());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (e) => {
      let n = v();
      (await getFileReader().mkdir(dirname(n), 448), await getFileReader().atomicWrite(n, e, 384));
    },
    now: () => new Date(),
    hostname: hostname,
  };
}
//@ chunk-dw613xrm.js:1413-1820 placement
async function readUnattendedServingConsent(e) {
  let n = e === void 0 ? i() : void 0,
    now = Date.now(),
    a = n?.writes,
    {
      choice: choice,
      unreadable: unreadable,
      staleYes: staleYes,
    } = await readConsentRecord(e ?? defaultConsentStore()),
    f = n !== void 0 && isStoredLoginPinned() && (await unattendedRunGrantStands(hostUnattendedGrant())),
    m = f && (await commandSandboxPosture({ start: !0 })).confined;
  if (n !== void 0 && a === n.writes && (n.view === void 0 || !c(n) || now >= n.view.readAt)) {
    if (
      ((n.view = {
        choice: choice,
        readAt: now,
        unreadable: unreadable,
        staleYes: staleYes === !0,
        hostAllows: m,
        grantOutsideSandbox: f && !m,
      }),
      c(n))
    )
      n.staleUnresolved = !1;
  }
  return choice;
}
/**
 * 读无人值守服务同意记录
 */
//@ chunk-dw613xrm.js:1820-2356 placement
async function readConsentRecord(e) {
  let n;
  try {
    n = await e.readText();
  } catch (error) {
    return (
      logForDebugging(`unattended-serving consent: store unreadable (${errorMessage(error)})`, {
        level: "warn",
      }),
      { choice: "unset", unreadable: !0 }
    );
  }
  if (n === void 0) return { choice: "unset", unreadable: !1 };
  try {
    let safeParse = E().safeParse(jsonParse(n));
    if (!safeParse.success) return { choice: "unset", unreadable: !0 };
    let a =
      safeParse.data.choice === "declined" ||
      (normalizeHostname(safeParse.data.hostname) === normalizeHostname(e.hostname()) &&
        safeParse.data.terms === UNATTENDED_SERVING_CONSENT_TERMS);
    return {
      choice: a ? safeParse.data.choice : "unset",
      unreadable: !1,
      staleYes: !a && safeParse.data.choice === "accepted",
    };
  } catch {
    return { choice: "unset", unreadable: !0 };
  }
}
/**
 * 写入无人值守服务同意（unattended-serving-consent.json）；本模块还负责读取、缓存与托管设置禁止判断。
 */
//@ chunk-dw613xrm.js:2356-2991 placement
async function writeUnattendedServingConsent(e, n) {
  if (e === "accepted" && managedSettingsForbidUnattendedServing())
    return (
      logForDebugging(
        "unattended-serving consent: a Yes while settings turn unattended serving off is not stored",
        { level: "warn" },
      ),
      !1
    );
  let r = n === void 0 ? i() : void 0,
    a = n ?? defaultConsentStore();
  try {
    if (
      (await a.writeText(
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
      ),
      r !== void 0)
    )
      ((r.writes += 1),
        (r.view = {
          choice: e,
          readAt: Date.now(),
          unreadable: !1,
          staleYes: !1,
          hostAllows: r.view?.hostAllows === !0,
          grantOutsideSandbox: r.view?.grantOutsideSandbox === !0,
        }),
        (r.staleUnresolved = !1));
    return !0;
  } catch (error) {
    return (
      logForDebugging(`unattended-serving consent: answer not saved (${errorMessage(error)})`, {
        level: "warn",
      }),
      !1
    );
  }
}
//@ chunk-dw613xrm.js:2991-3115 placement
var CONSENT_REFRESH_TIMEOUT_MS = 3000,
  unattendedConsentCache = new HostScoped(() => ({
    view: void 0,
    refresh: void 0,
    refreshStartedAt: void 0,
    abandoned: void 0,
    staleUnresolved: !1,
    writes: 0,
  }));
//@ chunk-dw613xrm.js:3115-3141 placement
function i() {
  return onProcessRootHost(unattendedConsentCache);
}
//@ chunk-dw613xrm.js:3141-3210 placement
function unattendedServingConsentView() {
  let e = i();
  if (!c(e)) refreshConsentView(e);
  return e.view?.choice ?? "unset";
}
//@ chunk-dw613xrm.js:3210-3305 placement
function c(e, n = Date.now()) {
  if (e.view === void 0) return !1;
  let r = n - e.view.readAt;
  return r >= 0 && r <= CONSENT_REFRESH_TIMEOUT_MS;
}
//@ chunk-dw613xrm.js:3305-3348 placement
function unattendedServingConsentViewIsFresh(e = Date.now()) {
  return c(i(), e);
}
//@ chunk-dw613xrm.js:3348-3359 placement
var b = 1500;
//@ chunk-dw613xrm.js:3359-3709 placement
async function freshUnattendedServingConsent(e) {
  let n = i();
  if (c(n)) return;
  let r = refreshConsentView(n),
    a,
    s,
    g =
      e?.aborted === !0
        ? Promise.resolve("gave_up")
        : new Promise((l) => {
            ((a = setTimeout((f) => f("gave_up"), b, l)),
              (s = () => l("gave_up")),
              e?.addEventListener("abort", s, { once: !0 }));
          });
  if ((await Promise.race([r, g]), clearTimeout(a), s !== void 0)) e?.removeEventListener("abort", s);
  if (!c(n)) ((n.staleUnresolved = !0), abandonConsentRefresh(n, r));
}
/**
 * 放弃超时的同意刷新
 */
//@ chunk-dw613xrm.js:3709-3895 placement
function abandonConsentRefresh(e, n) {
  if (e.refresh !== n || e.abandoned !== void 0) return !1;
  return (
    (e.refresh = void 0),
    (e.refreshStartedAt = void 0),
    (e.abandoned = n),
    n.finally(() => {
      if (e.abandoned === n) e.abandoned = void 0;
    }),
    !0
  );
}
/**
 * 刷新同意视图
 */
//@ chunk-dw613xrm.js:3895-4203 placement
function refreshConsentView(e) {
  if (e.refresh !== void 0) {
    if (
      (e.refreshStartedAt !== void 0 && performance.now() - e.refreshStartedAt <= b) ||
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
      if (e.refresh === n) ((e.refresh = void 0), (e.refreshStartedAt = void 0));
    });
  return ((e.refresh = n), n);
}
//@ chunk-dw613xrm.js:4203-4243 placement
function unattendedServingConsented() {
  return unattendedServingConsentView() === "accepted";
}
//@ chunk-dw613xrm.js:4243-4279 placement
function managedSettingsForbidUnattendedServing() {
  return unattendedServingForbiddenBy() !== void 0;
}
//@ chunk-dw613xrm.js:4279-4455 placement
function unattendedServingForbiddenBy() {
  let e = (n) => n?.remoteTools?.allowUnattendedServing === !1;
  return getAllPolicyTierSettings().some(e) ||
    getDurablePolicyTierSettings().some(e) ||
    e(getSettingsForSource("policySettings"))
    ? "managed"
    : e(getSettingsForSourceTightenOnly("userSettings"))
      ? "user"
      : void 0;
}
//@ chunk-dw613xrm.js:4455-4475 placement
function primeUnattendedServingConsent() {
  unattendedServingConsentView();
}
//@ chunk-dw613xrm.js:4475-4550 placement
function unattendedServingConsentMayHoldYes() {
  let { view: view } = i();
  return view?.unreadable === !0 || view?.staleYes === !0;
}
//@ chunk-dw613xrm.js:4550-4598 placement
function unattendedServingConsentUnreadable() {
  return i().view?.unreadable === !0;
}
//@ chunk-dw613xrm.js:4598-4988 placement
async function commandSandboxPosture({ start: start }) {
  try {
    let {
      classifyDeviceSandboxPosture: classifyDeviceSandboxPosture,
      ensureDeviceSandboxPosture: ensureDeviceSandboxPosture,
      readDeviceSandboxSnapshot: readDeviceSandboxSnapshot,
    } = await import("./chunk-g33cj79a.js");
    return start
      ? await ensureDeviceSandboxPosture()
      : classifyDeviceSandboxPosture(readDeviceSandboxSnapshot(), { requireStarted: !1 });
  } catch (error) {
    return (
      logForDebugging(
        `unattended-serving consent: command sandbox could not be asked, taken as not confining (${errorMessage(error)})`,
        { level: "warn" },
      ),
      { confined: !1, reason: "sandbox_failed_to_start" }
    );
  }
}
//@ chunk-dw613xrm.js:4988-5034 placement
function R() {
  return i().view?.hostAllows === !0;
}
//@ chunk-dw613xrm.js:5034-5118 placement
function hostGrantOutsideSandbox() {
  let e = i();
  return !e.staleUnresolved && e.view?.grantOutsideSandbox === !0;
}
//@ chunk-dw613xrm.js:5118-5205 placement
function C(e, n) {
  return n && e.view !== void 0 && e.view.choice === "unset" && !e.view.unreadable;
}
//@ chunk-dw613xrm.js:5205-5312 placement
function unattendedServingAllowedByHostFlag() {
  try {
    let e = i();
    return !managedSettingsForbidUnattendedServing() && !e.staleUnresolved && C(e, e.view?.hostAllows === !0);
  } catch {
    return !1;
  }
}
//@ chunk-dw613xrm.js:5312-5518 placement
function unattendedServingConsentPending(e) {
  try {
    let n = unattendedServingConsented(),
      r = i();
    return managedSettingsForbidUnattendedServing() || r.staleUnresolved || (!n && !C(r, e ?? R()));
  } catch (error) {
    return (
      logForDebugging(
        `unattended-serving consent: read failed, call treated as unconsented (${errorMessage(error)})`,
        { level: "warn" },
      ),
      !0
    );
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
