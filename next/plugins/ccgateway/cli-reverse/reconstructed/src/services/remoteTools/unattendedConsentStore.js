/**
 * services/remoteTools/unattendedConsentStore.ts
 *
 * 2.1.316 新增。无人值守服务同意记录的读写、缓存与托管设置禁止判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fcmdaxcr.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { homedir, hostname } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, _enum, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fcmdaxcr.js:731-825 placement
function normalizeHostname(hostname) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/(\.(local|lan|home|localdomain))+$/, "");
}
//@ chunk-fcmdaxcr.js:825-1019 placement
/**
 * 无人值守服务同意记录文件的名、版本、条款串与 schema。
 */
var UNATTENDED_SERVING_CONSENT_VERSION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var UNATTENDED_SERVING_CONSENT_TERMS;
var UNATTENDED_SERVING_CONSENT_JSON;
var unattendedConsentRecordSchema;
deferInit("chunk-fcmdaxcr.js:825", () => {
  UNATTENDED_SERVING_CONSENT_VERSION = 1;
  UNATTENDED_SERVING_CONSENT_TERMS = "unattended-serving:v1:auto-arm-classifier";
  UNATTENDED_SERVING_CONSENT_JSON = "unattended-serving-consent.json";
  unattendedConsentRecordSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(UNATTENDED_SERVING_CONSENT_VERSION),
      choice: _enum(["accepted", "declined"]),
      terms: stringSchema(),
      decidedAt: stringSchema(),
      hostname: stringSchema(),
    }),
  );
});
//@ chunk-fcmdaxcr.js:1019-1066 placement
/**
 * 同意记录文件的完整路径（~/.claude/state/unattended-serving-consent.json）。
 */
function unattendedConsentFilePath() {
  return join(homedir(), ".claude", "state", UNATTENDED_SERVING_CONSENT_JSON);
}
//@ chunk-fcmdaxcr.js:1066-1104 placement
function unattendedServingMachineName(host = hostname()) {
  return shortLabel(normalizeHostname(host));
}
//@ chunk-fcmdaxcr.js:1104-1188 placement
function unattendedServingConsentRevokeHint() {
  return `change it in /config, or delete ${tildify(unattendedConsentFilePath())} to be asked again`;
}
//@ chunk-fcmdaxcr.js:1188-1413 placement
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
    writeText: async (text) => {
      let path = unattendedConsentFilePath();
      await getFileReader().mkdir(dirname(path), 448);
      await getFileReader().atomicWrite(path, text, 384);
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-fcmdaxcr.js:1413-1820 placement
async function readUnattendedServingConsent(store) {
  let cache = store === undefined ? currentUnattendedConsentCache() : undefined;
  let now = Date.now();
  let writes = cache?.writes;
  let { choice, unreadable, staleYes } = await readConsentRecord(store ?? defaultConsentStore());
  let grantOutsideSandbox =
    cache !== undefined && isStoredLoginPinned() && (await unattendedRunGrantStands(hostUnattendedGrant()));
  let confined =
    grantOutsideSandbox &&
    (
      await commandSandboxPosture({
        start: true,
      })
    ).confined;
  if (
    cache !== undefined &&
    writes === cache.writes &&
    (cache.view === undefined || !isConsentViewFresh(cache) || now >= cache.view.readAt)
  ) {
    cache.view = {
      choice,
      readAt: now,
      unreadable,
      staleYes: staleYes === true,
      hostAllows: confined,
      grantOutsideSandbox: grantOutsideSandbox && !confined,
    };
    if (isConsentViewFresh(cache)) cache.staleUnresolved = false;
  }
  return choice;
}
//@ chunk-fcmdaxcr.js:1820-2356 placement
/**
 * 读无人值守服务同意记录
 */
async function readConsentRecord(store) {
  let text;
  try {
    text = await store.readText();
  } catch (error) {
    logForDebugging(`unattended-serving consent: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return {
      choice: "unset",
      unreadable: true,
    };
  }
  if (text === undefined)
    return {
      choice: "unset",
      unreadable: false,
    };
  try {
    let parsed = unattendedConsentRecordSchema().safeParse(jsonParse(text));
    if (!parsed.success)
      return {
        choice: "unset",
        unreadable: true,
      };
    let applies =
      parsed.data.choice === "declined" ||
      (normalizeHostname(parsed.data.hostname) === normalizeHostname(store.hostname()) &&
        parsed.data.terms === UNATTENDED_SERVING_CONSENT_TERMS);
    return {
      choice: applies ? parsed.data.choice : "unset",
      unreadable: false,
      staleYes: !applies && parsed.data.choice === "accepted",
    };
  } catch {
    return {
      choice: "unset",
      unreadable: true,
    };
  }
}
//@ chunk-fcmdaxcr.js:2356-2991 placement
/**
 * 写入无人值守服务同意（unattended-serving-consent.json）；本模块还负责读取、缓存与托管设置禁止判断。
 */
async function writeUnattendedServingConsent(choice, store) {
  if (choice === "accepted" && managedSettingsForbidUnattendedServing()) {
    logForDebugging(
      "unattended-serving consent: a Yes while settings turn unattended serving off is not stored",
      {
        level: "warn",
      },
    );
    return false;
  }
  let cache = store === undefined ? currentUnattendedConsentCache() : undefined;
  let target = store ?? defaultConsentStore();
  try {
    await target.writeText(
      jsonStringify(
        {
          version: UNATTENDED_SERVING_CONSENT_VERSION,
          choice,
          terms: UNATTENDED_SERVING_CONSENT_TERMS,
          decidedAt: target.now().toISOString(),
          hostname: normalizeHostname(target.hostname()),
        },
        null,
        2,
      ) +
        `
`,
    );
    if (cache !== undefined) {
      cache.writes += 1;
      cache.view = {
        choice,
        readAt: Date.now(),
        unreadable: false,
        staleYes: false,
        hostAllows: cache.view?.hostAllows === true,
        grantOutsideSandbox: cache.view?.grantOutsideSandbox === true,
      };
      cache.staleUnresolved = false;
    }
    return true;
  } catch (error) {
    logForDebugging(`unattended-serving consent: answer not saved (${errorMessage(error)})`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-fcmdaxcr.js:2991-3115 placement
var CONSENT_REFRESH_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var unattendedConsentCache;
deferInit("chunk-fcmdaxcr.js:2991", () => {
  CONSENT_REFRESH_TIMEOUT_MS = 3000;
  unattendedConsentCache = new HostScoped(() => ({
    view: undefined,
    refresh: undefined,
    refreshStartedAt: undefined,
    abandoned: undefined,
    staleUnresolved: false,
    writes: 0,
  }));
});
//@ chunk-fcmdaxcr.js:3115-3141 placement
/**
 * 当前进程根下的同意记录缓存（含视图与写入计数）。
 */
function currentUnattendedConsentCache() {
  return onProcessRootHost(unattendedConsentCache);
}
//@ chunk-fcmdaxcr.js:3141-3211 placement
function unattendedServingConsentView() {
  let cache = currentUnattendedConsentCache();
  if (!isConsentViewFresh(cache)) refreshConsentView(cache);
  return cache.view?.choice ?? "unset";
}
//@ chunk-fcmdaxcr.js:3211-3306 placement
/**
 * 缓存的同意视图是否仍在刷新时限内（未被超时视为有效）。
 */
function isConsentViewFresh(cache, nowMs = Date.now()) {
  if (cache.view === undefined) return false;
  let ageMs = nowMs - cache.view.readAt;
  return ageMs >= 0 && ageMs <= CONSENT_REFRESH_TIMEOUT_MS;
}
//@ chunk-fcmdaxcr.js:3306-3349 placement
function unattendedServingConsentViewIsFresh(nowMs = Date.now()) {
  return isConsentViewFresh(currentUnattendedConsentCache(), nowMs);
}
//@ chunk-fcmdaxcr.js:3349-3360 placement
var CONSENT_REFRESH_GIVE_UP_MS = 1500;
//@ chunk-fcmdaxcr.js:3360-3710 placement
async function freshUnattendedServingConsent(signal) {
  let cache = currentUnattendedConsentCache();
  if (isConsentViewFresh(cache)) return;
  let refresh = refreshConsentView(cache);
  let timer;
  let onAbort;
  let giveUp =
    signal?.aborted === true
      ? Promise.resolve("gave_up")
      : new Promise((resolve) => {
          timer = setTimeout((finish) => finish("gave_up"), CONSENT_REFRESH_GIVE_UP_MS, resolve);
          onAbort = () => resolve("gave_up");
          signal?.addEventListener("abort", onAbort, {
            once: true,
          });
        });
  await Promise.race([refresh, giveUp]);
  clearTimeout(timer);
  if (onAbort !== undefined) signal?.removeEventListener("abort", onAbort);
  if (!isConsentViewFresh(cache)) {
    cache.staleUnresolved = true;
    abandonConsentRefresh(cache, refresh);
  }
}
//@ chunk-fcmdaxcr.js:3710-3896 placement
/**
 * 放弃超时的同意刷新
 */
function abandonConsentRefresh(cache, refresh) {
  if (cache.refresh !== refresh || cache.abandoned !== undefined) return false;
  cache.refresh = undefined;
  cache.refreshStartedAt = undefined;
  cache.abandoned = refresh;
  refresh.finally(() => {
    if (cache.abandoned === refresh) cache.abandoned = undefined;
  });
  return true;
}
//@ chunk-fcmdaxcr.js:3896-4204 placement
/**
 * 刷新同意视图
 */
function refreshConsentView(cache) {
  if (cache.refresh !== undefined) {
    if (
      (cache.refreshStartedAt !== undefined &&
        performance.now() - cache.refreshStartedAt <= CONSENT_REFRESH_GIVE_UP_MS) ||
      !abandonConsentRefresh(cache, cache.refresh)
    )
      return cache.refresh;
  }
  cache.refreshStartedAt = performance.now();
  let refresh = readUnattendedServingConsent()
    .catch(() => {
      return;
    })
    .finally(() => {
      if (cache.refresh === refresh) {
        cache.refresh = undefined;
        cache.refreshStartedAt = undefined;
      }
    });
  cache.refresh = refresh;
  return refresh;
}
//@ chunk-fcmdaxcr.js:4204-4245 placement
function unattendedServingConsented() {
  return unattendedServingConsentView() === "accepted";
}
//@ chunk-fcmdaxcr.js:4245-4281 placement
function managedSettingsForbidUnattendedServing() {
  return unattendedServingForbiddenBy() !== undefined;
}
//@ chunk-fcmdaxcr.js:4281-4457 placement
function unattendedServingForbiddenBy() {
  let forbids = (settings) => settings?.remoteTools?.allowUnattendedServing === false;
  return getAllPolicyTierSettings().some(forbids) ||
    getDurablePolicyTierSettings().some(forbids) ||
    forbids(getSettingsForSource("policySettings"))
    ? "managed"
    : forbids(getSettingsForSourceTightenOnly("userSettings"))
      ? "user"
      : undefined;
}
//@ chunk-fcmdaxcr.js:4457-4478 placement
function primeUnattendedServingConsent() {
  unattendedServingConsentView();
}
//@ chunk-fcmdaxcr.js:4478-4553 placement
function unattendedServingConsentMayHoldYes() {
  let { view } = currentUnattendedConsentCache();
  return view?.unreadable === true || view?.staleYes === true;
}
//@ chunk-fcmdaxcr.js:4553-4601 placement
function unattendedServingConsentUnreadable() {
  return currentUnattendedConsentCache().view?.unreadable === true;
}
//@ chunk-fcmdaxcr.js:4601-4991 placement
async function commandSandboxPosture({ start }) {
  try {
    let { classifyDeviceSandboxPosture, ensureDeviceSandboxPosture, readDeviceSandboxSnapshot } =
      await import("../../remote/tools/deviceSandboxPosture.js");
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
//@ chunk-fcmdaxcr.js:4991-5037 placement
/**
 * 托管设置是否明确允许无人值守服务。
 */
function hostAllowsUnattended() {
  return currentUnattendedConsentCache().view?.hostAllows === true;
}
//@ chunk-fcmdaxcr.js:5037-5121 placement
function hostGrantOutsideSandbox() {
  let cache = currentUnattendedConsentCache();
  return !cache.staleUnresolved && cache.view?.grantOutsideSandbox === true;
}
//@ chunk-fcmdaxcr.js:5121-5208 placement
/**
 * 视图尚未被读坏、选择为 unset 且 hostAllows 为真时，允许保守地按「是」处理。
 */
function mayHoldUnansweredConsent(cache, hostAllows) {
  return hostAllows && cache.view !== undefined && cache.view.choice === "unset" && !cache.view.unreadable;
}
//@ chunk-fcmdaxcr.js:5208-5315 placement
function unattendedServingAllowedByHostFlag() {
  try {
    let cache = currentUnattendedConsentCache();
    return (
      !managedSettingsForbidUnattendedServing() &&
      !cache.staleUnresolved &&
      mayHoldUnansweredConsent(cache, cache.view?.hostAllows === true)
    );
  } catch {
    return false;
  }
}
//@ chunk-fcmdaxcr.js:5315-5521 placement
function unattendedServingConsentPending(hostAllows) {
  try {
    let consented = unattendedServingConsented();
    let cache = currentUnattendedConsentCache();
    return (
      managedSettingsForbidUnattendedServing() ||
      cache.staleUnresolved ||
      (!consented && !mayHoldUnansweredConsent(cache, hostAllows ?? hostAllowsUnattended()))
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
  primeUnattendedServingConsent,
  unattendedServingAllowedByHostFlag,
  unattendedServingConsentViewIsFresh,
  freshUnattendedServingConsent,
  unattendedServingConsentPending,
  commandSandboxPosture,
  unattendedServingConsentView,
  normalizeHostname,
  managedSettingsForbidUnattendedServing,
  unattendedServingConsentUnreadable,
  hostGrantOutsideSandbox,
  readUnattendedServingConsent,
  UNATTENDED_SERVING_CONSENT_TERMS,
  UNATTENDED_SERVING_CONSENT_VERSION,
  unattendedServingMachineName,
  writeUnattendedServingConsent,
  unattendedServingConsented,
  unattendedServingConsentRevokeHint,
  unattendedServingForbiddenBy,
  unattendedServingConsentMayHoldYes,
};
