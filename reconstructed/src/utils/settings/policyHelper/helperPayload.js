/**
 * utils/settings/policyHelper/helperPayload.ts
 *
 * policyHelper 静态设置载荷（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (23)
 * attribution: placement 23
 */
import {
  R,
  Ee,
  Ft,
  REMOTE_ENTRY_NOT_RUN_PREFIX,
  REMOTE_PAYLOAD_NOT_APPLIED_PREFIX,
  nt,
  MAX_WARNING_CHARS,
  warnInvalidStaticPayload,
  _r,
} from "./policyHelper.js";
import { logForDebugging } from "../../debug.js";
import { asciiOnly } from "../otelEndpointValidation.js";
import { validatePolicyHelperConfig } from "../validation.js";
import { SUPPORTED_PLATFORMS, STATIC_PAYLOAD_SCHEMA } from "../types.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { serializeSettingsErrors } from "../../fileStateCache.js";
import {
  TPi,
  summarizeManagedSettingsRisk,
  hasDangerousManagedSettings,
  getPolicyHelperCommand,
} from "../../../components/ManagedSettingsSecurityDialog/utils.js";
import { platformSettingsChain } from "../marketplaceSettingsAliases.js";
import { hs, selectPerOsConfig } from "./helperRemote.js";
import { withholdUnverifiedCacheKeys } from "../../../services/remoteManagedSettings/remoteSettingsCache.js";
import {
  isRemoteManagedSettingsVerified,
  isRemoteManagedSettingsVerifiedAndApprovedForSession,
} from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { jsonStringify } from "../../slowOperations.js";
import { sortKeysDeep } from "../settingsSourceTrust.js";

//@ chunk-q8cqcff6.js:69996-70148 placement
function addSelectionWarning(e) {
  (R.selectionWarnings.push({
    file: "policyHelper",
    path: "policyHelpers",
    message: e,
    severity: "warning",
    statusOnly: !0,
  }),
    Ee(),
    logForDebugging(e, { level: "warn" }));
}
//@ chunk-q8cqcff6.js:70148-70174 placement
function hr() {
  (yr(), clearSelectionWarnings(Ft));
}
//@ chunk-q8cqcff6.js:70174-70226 placement
function yr() {
  (clearSelectionWarnings(REMOTE_ENTRY_NOT_RUN_PREFIX),
    clearSelectionWarnings(REMOTE_PAYLOAD_NOT_APPLIED_PREFIX),
    R.retireRemoteFailure());
}
//@ chunk-q8cqcff6.js:70226-70266 placement
var Je = "policyHelper refresh failing: ";
//@ chunk-q8cqcff6.js:70266-70675 placement
function warnPolicyHelperRefresh(e, n, r) {
  let s = `; ${n}`,
    S = nt(asciiOnly(e.replace(/\s+/gu, " ")), MAX_WARNING_CHARS - Je.length - s.length),
    E = `${Je}${S}${s}`;
  if (R.selectionWarnings.some((selectionWarning) => selectionWarning.message === E)) return;
  let filtered = R.selectionWarnings.filter((selectionWarning) => !selectionWarning.message.startsWith(Je)),
    y = filtered.length !== R.selectionWarnings.length;
  if (
    ((R.selectionWarnings = [
      ...filtered,
      {
        file: "policyHelper",
        path: r ? "policyHelpers" : "policyHelper",
        message: E,
        severity: "warning",
        statusOnly: !0,
      },
    ]),
    !y)
  )
    Ee();
}
//@ chunk-q8cqcff6.js:70675-70696 placement
function Ht() {
  clearSelectionWarnings(Je);
}
//@ chunk-q8cqcff6.js:70696-70764 placement
var Rr = "policyHelpers is configured but has no entry for platform ";
//@ chunk-q8cqcff6.js:70764-70918 placement
function clearSelectionWarnings(e) {
  let filtered = R.selectionWarnings.filter((selectionWarning) => !selectionWarning.message.startsWith(e));
  if (filtered.length === R.selectionWarnings.length) return;
  ((R.selectionWarnings = filtered), Ee());
}
//@ chunk-q8cqcff6.js:70918-71131 placement
function validatePayloadAndLog(e, n) {
  let r = validatePolicyHelperConfig(e, n);
  for (let strippedKey of r.strippedKeys)
    logForDebugging(`${n}: stripped ${strippedKey} from the settings payload (no recursion)`, {
      level: "warn",
    });
  for (let warning of r.warnings) logForDebugging(`${n}: ${warning.message}`, { level: "warn" });
  return r;
}
//@ chunk-q8cqcff6.js:71131-71641 placement
function mergeDefaultSettingsPayload(e, n) {
  let r = [];
  for (let s of n) {
    let S = e[s],
      E = S?.defaultSettings;
    if (E !== void 0 && E !== null)
      r.push({
        field: `policyHelpers.${s}.defaultSettings`,
        raw: E,
        onChain: !0,
        mergesOutput: S?.outputBehavior === "merge",
      });
  }
  for (let s of SUPPORTED_PLATFORMS) {
    let S = e[s]?.defaultSettings;
    if (S !== void 0 && S !== null && !n.includes(s))
      r.push({ field: `policyHelpers.${s}.defaultSettings`, raw: S, onChain: !1, mergesOutput: !1 });
  }
  if (e.default !== void 0 && e.default !== null)
    r.push({ field: "policyHelpers.default", raw: e.default, onChain: !0, mergesOutput: !1 });
  return r;
}
//@ chunk-q8cqcff6.js:71641-72078 placement
function validateStaticPayload(e, n) {
  if (e.raw !== null && typeof e.raw === "object" && !Array.isArray(e.raw)) {
    let { policyHelper: policyHelper, policyHelpers: policyHelpers, ...E } = e.raw,
      safeParse = STATIC_PAYLOAD_SCHEMA().safeParse(E);
    if (!safeParse.success) return { error: safeParse.error.issues[0]?.message ?? "failed validation" };
  }
  let r = n ? validatePayloadAndLog(e.raw, e.field) : validatePolicyHelperConfig(e.raw, e.field);
  if ("error" in r) return { error: r.error };
  return {
    settings: r.settings,
    warnings: r.warnings.map((warning) => ({ ...warning, statusOnly: !0 })),
    sourceField: e.field,
    mergesOutput: e.mergesOutput,
  };
}
/**
 * 校验 policyHelpers 默认设置载荷，记录链上第一个有效的作为默认回退；任何一个无效则返回阻止启动的错误。
 */
//@ chunk-q8cqcff6.js:72078-72443 placement
function applyDefaultPayloads(e, n) {
  if (((R.defaultFallback = null), !e)) return null;
  let r = null;
  for (let s of mergeDefaultSettingsPayload(e, n)) {
    let S = validateStaticPayload(s, s.onChain && !r);
    if ("error" in S)
      return (
        logFeatureBad("settings_policy_helpers_per_os", "default_payload_invalid"),
        `${s.field} is not a valid static settings payload (${S.error}); Claude Code will not start until it is fixed`
      );
    if (s.onChain && !r) r = S;
  }
  return ((R.defaultFallback = r), null);
}
//@ chunk-q8cqcff6.js:72443-72630 placement
function pickStaticPayload(e) {
  let n = null,
    r = [];
  for (let s of e) {
    let S = validateStaticPayload(s, !1);
    if ("error" in S) r.push({ field: s.field, error: S.error });
    else if (!n) n = { ...S, warnings: serializeSettingsErrors(S.warnings) };
  }
  return { winner: n, skipped: r };
}
//@ chunk-q8cqcff6.js:72630-72735 placement
function applyStaticPayloadChoice(e) {
  (clearSelectionWarnings(Ft), (R.defaultFallback = e.winner));
  for (let { field: field, error: error } of e.skipped) warnInvalidStaticPayload(field, error, e.verified);
}
//@ chunk-q8cqcff6.js:72735-72805 placement
function Ir(e, n) {
  return (
    TPi(summarizeManagedSettingsRisk(e), n.sourceField) ||
    hasDangerousManagedSettings(summarizeManagedSettingsRisk(n.settings))
  );
}
//@ chunk-q8cqcff6.js:72805-72896 placement
function Nr(e) {
  let n = e?.policyHelpers;
  return n ? mergeDefaultSettingsPayload(n, platformSettingsChain().chain).filter((r) => r.onChain) : [];
}
//@ chunk-q8cqcff6.js:72896-72988 placement
function jRi(e) {
  if (hs(e) !== void 0) return !0;
  let { winner: winner } = pickStaticPayload(Nr(e));
  return winner !== null && Ir(e, winner);
}
//@ chunk-q8cqcff6.js:72988-73029 placement
function Qe(e, n, r) {
  return n && !r ? withholdUnverifiedCacheKeys(e) : e;
}
/**
 * 汇总远程托管设置中 policyHelper 的关键状态：是否已验证、命令、能否执行、是否合并输出/失败拒绝、载荷键、选中的静态载荷与跳过项、载荷能否使用。
 */
//@ chunk-q8cqcff6.js:73029-73441 placement
function remotePolicySnapshot(e) {
  let n = isRemoteManagedSettingsVerified(),
    r = isRemoteManagedSettingsVerifiedAndApprovedForSession(),
    s = e?.policyHelpers,
    S = s ? (selectPerOsConfig(s, platformSettingsChain().chain, !0)?.config ?? null) : null,
    E = getPolicyHelperCommand(S),
    h = Nr(e),
    { winner: winner, skipped: skipped } = pickStaticPayload(h);
  return {
    verified: n,
    tuple: E,
    helperMayExec: E !== void 0 && r,
    helperMergesOutput: S?.outputBehavior === "merge",
    helperRefusesOnFailure: _r(S, !0),
    payloadKey: jsonStringify(sortKeysDeep(h.map((O) => [O.field, O.raw, O.mergesOutput]))),
    winner: winner,
    skipped: skipped,
    payloadServable: winner !== null && (r || (!Ir(e, winner) && (n || E === void 0))),
  };
}
//@ chunk-q8cqcff6.js:73441-73709 placement
function sameRemoteSnapshot(e, n) {
  return (
    e.verified === n.verified &&
    e.tuple === n.tuple &&
    e.helperMayExec === n.helperMayExec &&
    e.helperMergesOutput === n.helperMergesOutput &&
    e.helperRefusesOnFailure === n.helperRefusesOnFailure &&
    e.payloadKey === n.payloadKey &&
    e.payloadServable === n.payloadServable
  );
}
//@ chunk-q8cqcff6.js:73709-73782 placement
function wt(e, n) {
  return e.outputBehavior === "merge" || n?.mergesOutput === !0;
}
//@ chunk-q8cqcff6.js:73782-74229 placement
function applyStaticPayload(e, n, r) {
  let defaultFallback = R.defaultFallback;
  if (!defaultFallback) return;
  let S = isRemoteManagedSettingsVerified();
  (R.apply({
    config: e?.config ?? null,
    fromPerOs: e?.fromPerOs ?? !1,
    serving: "default",
    armedFromRemote: r,
    mergesOutput: n,
    output: { managedSettings: Qe(defaultFallback.settings, r, S) },
    warnings: defaultFallback.warnings,
  }),
    logForDebugging(
      `${defaultFallback.sourceField} static settings payload applied${r ? ` from remote managed settings${S ? "" : " (cached, not yet verified this session)"}` : ""} (keys: ${Object.keys(defaultFallback.settings).join(",")})`,
      { level: "debug" },
    ));
}
/**
 * 判断设置中是否配置了适用于本平台的 policyHelper 或静态载荷。
 */
//@ chunk-q8cqcff6.js:74229-74436 placement
function hasPolicyHelperConfig(e) {
  let n = e?.policyHelpers;
  if (!n) return !1;
  let chain = platformSettingsChain().chain;
  return (
    selectPerOsConfig(n, chain, !0) !== null ||
    (n.default !== void 0 && n.default !== null) ||
    chain.some((s) => {
      let S = n[s]?.defaultSettings;
      return S !== void 0 && S !== null;
    })
  );
}

export {
  hasPolicyHelperConfig,
  jRi,
  validatePayloadAndLog,
  warnPolicyHelperRefresh,
  wt,
  Qe,
  Ht,
  hr,
  clearSelectionWarnings,
  Rr,
  remotePolicySnapshot,
  applyStaticPayloadChoice,
  applyDefaultPayloads,
  applyStaticPayload,
  addSelectionWarning,
  yr,
  sameRemoteSnapshot,
};
