/**
 * commands/model/modelSwitch.ts
 *
 * 2.1.316 新增：模型切换：服务端模型选择状态同步（model_selector_state）、PreModelSwitch 钩子、保存为默认模型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d1cgs5na.js (23)
 * attribution: placement 23
 */
import { iHe, Toe, nZ, Djs, saveCachedCatalog } from "../../services/modelCatalog/servedCatalog.js";
import { servedCatalogSource, vCn } from "../../utils/model/modelCatalog/servedCatalog.js";
import {
  parseUserSpecifiedModel,
  renderModelName,
  renderModelSetting,
} from "../../utils/model/modelDisplay.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { classifyAxiosError, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import {
  managedDenyStartupRefusal,
  isModelDenied,
  getModelEntitlementDenySet,
  isModelAllowed,
} from "../../utils/model/modelAllowlist.js";
import {
  getDefaultMainLoopModelSetting,
  stepDownRestrictedFamilyAliasPick,
  isModeDependentModelSetting,
  getOrgLockedDefaultModel,
} from "../../utils/model/planModeModel.js";
import {
  diagnose1mAliasSwitch,
  isOpus1mUnavailable,
  requires1mEntitlementCheck,
  renderModelLabel,
  aue,
} from "./model.js";
import { Lt } from "../../utils/model/modelIds.js";
import {
  displayModelName,
  reprobeEntitlementDeny,
  validateModelWithDeadline,
  resolveAliasForProbe,
  isAliasSpelling,
} from "../../utils/model/validateModel.js";
import { artifactPathPrefix } from "../../services/artifacts/artifactMount.js";
import { sanitizeTitle, sanitizeShortText } from "../../utils/resultError.js";
import {
  classifyModelDenial,
  D,
  P,
  classifyModelUnavailability,
  WKn,
} from "../../utils/model/modelUnavailability.js";
import { getModelUnavailabilityReason } from "../../utils/model/classifierModel.js";
import { fetchBootstrapData } from "../../services/api/bootstrap.js";
import {
  bk,
  runPreModelSwitchHooks as runPreModelSwitchHooks_2,
  useMainLoopModel_2 as useMainLoopModel_2_2_2,
  resolveEffectiveModel,
  zE,
} from "../../utils/model/modelSwitchHooks.js";
import {
  replaceLineBreaks,
  stripUnsafeChars,
  pAn,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { clearRefusalFallbackModelLatch } from "../../bootstrap/state.js";
import {
  isFastModeEnabled,
  isFastModeActive,
  clearFastModeCooldown,
  reportFastModeToggle,
} from "../../utils/fastMode.js";
import { SET_MODEL_PREFIX, toInlineCode, SAVED_AS_DEFAULT_SUFFIX } from "./modelMessages.js";
import { formatFastModeSuffix } from "../fast/fast.js";
import { wt } from "../../remote/remoteMode.js";
import { buildUnknownModelNotice } from "../../services/compact/unknownModelNotice.js";
import {
  updateSettingsForSource,
  getSettingsFilePathForSource,
  getEffectiveSettingSource_2,
  getSettingsForSource,
  getRelativeSettingsFilePathForSource,
} from "../../utils/settings/settings.js";
import { withDeadline } from "../../utils/sleep.js";
import { tildify } from "../../utils/path.js";
import { env } from "../../utils/env.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { sequential } from "../../utils/sequential.js";

//@ chunk-d1cgs5na.js:1903-1914 placement
var T = 5000;
//@ chunk-d1cgs5na.js:1914-2192 placement
async function classifyModelScope(e) {
  if (e === null) return skipSelectionWrite("follows_account");
  if (I(e)) return skipSelectionWrite("not_representable");
  if (iHe() !== "primary") return skipSelectionWrite("not_primary");
  if (servedCatalogSource() !== "served") return skipSelectionWrite("not_served");
  let o = Toe();
  if (o === null || o.kind !== "account") return skipSelectionWrite("no_account_scope");
  return syncModelSelectionToServer(o, nZ(), e);
}
/**
 * 把模型选择写到组织的 model_selector_state（失败分类记录）。
 */
//@ chunk-d1cgs5na.js:2192-3061 placement
async function syncModelSelectionToServer(e, o, s) {
  let a = { model: parseUserSpecifiedModel(s) };
  try {
    let patch = await apiClient.patch(`/api/organizations/:orgUUID/model_selector_state/${o}`, a, {
      auth: "teleport-org",
      isBackground: !0,
      timeout: T,
      validateStatus: () => !0,
    });
    if (!patch.ok)
      return (
        logForDebugging(`[servedCatalog] selection write (${o}) skipped: ${patch.reason}`),
        logFeatureSad("model_default_server_sync", `declined_${patch.reason}`),
        { status: "skipped", reason: "declined" }
      );
    let status = patch.status;
    if (status < 200 || status >= 300)
      return (
        logForDebugging(`[servedCatalog] selection write (${o}): HTTP ${status}`),
        logFeatureSad("model_default_server_sync", `http_${status}`),
        { status: "error", reason: "http_status", httpStatus: status }
      );
    return (
      logForDebugging(`[servedCatalog] selection write (${o}) ok`),
      logFeatureOk("model_default_server_sync"),
      await describeModelSource(e, o, patch.data, a.model),
      { status: "ok", httpStatus: status }
    );
  } catch (error) {
    let kind = classifyAxiosError(error).kind;
    return (
      logForDebugging(`[servedCatalog] selection write (${o}) failed: ${kind}`),
      logFeatureSad("model_default_server_sync", `network_${kind}`),
      { status: "error", reason: "network" }
    );
  }
}
//@ chunk-d1cgs5na.js:3061-3361 placement
async function describeModelSource(e, o, s, a) {
  let n = Djs(e, o);
  if (n === void 0 || n.catalog === null) return;
  let safeParse = vCn().safeParse(s),
    r =
      safeParse.success && safeParse.data.id === o
        ? safeParse.data
        : { ...(n.catalog.state ?? { id: o }), model: a, selection_source: "user_setting" };
  await saveCachedCatalog(e, o, {
    ...n,
    staleAt: Math.min(n.staleAt, Date.now()),
    catalog: { ...n.catalog, state: r },
  });
}
//@ chunk-d1cgs5na.js:3361-3461 placement
function skipSelectionWrite(e) {
  return (logForDebugging(`[servedCatalog] selection write skipped: ${e}`), { status: "skipped", reason: e });
}
//@ chunk-d1cgs5na.js:3461-3546 placement
function I(e) {
  let lower = e.trim().toLowerCase();
  return lower === "opusplan" || lower === "opusplan[1m]";
}
/**
 * 切换主循环模型的安全包装：失败消息与额度拒绝说明经过遥测清理后再返回。
 */
//@ chunk-d1cgs5na.js:3546-3713 placement
async function switchMainLoopModelSafe(...e) {
  let o = await switchMainLoopModel(...e);
  if (!o.ok) return { ...o, message: sanitizeTelemetryString(o.message) };
  return o.creditsRefusal === void 0
    ? o
    : { ...o, creditsRefusal: sanitizeTelemetryString(o.creditsRefusal) };
}
/**
 * 切换主循环模型：默认/别名、计划模式、保存、遥测（约 4.4 KB）。
 */
//@ chunk-d1cgs5na.js:3713-8138 placement
async function switchMainLoopModel(e, o, s, a) {
  let n = e === "default" ? null : e;
  if (n === null) {
    let r = managedDenyStartupRefusal(getDefaultMainLoopModelSetting(), "switch");
    if (r !== null)
      return (
        logFeatureBad("model_switch", "denied_by_managed_settings"),
        { ok: !1, message: r, code: "restricted_by_org" }
      );
  }
  let l;
  if (n) {
    let r = diagnose1mAliasSwitch(n);
    if (r !== null) {
      let c = Lt(n.trim().toLowerCase()),
        u = displayModelName(n),
        p = artifactPathPrefix("model");
      switch (r.kind) {
        case "disabled":
          return (
            logFeatureBad("model_switch", "alias_1m_disabled"),
            {
              ok: !1,
              message: p
                ? `1M context is turned off here (CLAUDE_CODE_DISABLE_1M_CONTEXT is set), so '${u}' isn't available. Run ${p} ${c} instead.`
                : `1M context is turned off (CLAUDE_CODE_DISABLE_1M_CONTEXT is set), so '${u}' isn\u2019t available. Switch to ${c} instead.`,
              code: "alias_1m_disabled",
            }
          );
        case "unsupported":
          return (
            logFeatureBad("model_switch", "alias_1m_unsupported"),
            {
              ok: !1,
              message: p
                ? `${sanitizeTitle(renderModelName(r.carrier))} doesn't have a 1M context window, so '${u}' isn't available. Run ${p} ${c} to use it with its standard context window.`
                : `${sanitizeTitle(renderModelName(r.carrier))} doesn\u2019t have a 1M context window, so '${u}' isn\u2019t available. Switch to ${c} to use its standard context window.`,
              code: "alias_1m_unsupported",
            }
          );
        case "noModeDependentVariant":
          return (
            logFeatureBad("model_switch", "alias_1m_no_mode_variant"),
            {
              ok: !1,
              message: p
                ? `'${u}' isn't available: the ${c} setting switches models in plan mode and has no 1M form. Run ${p} ${c}, or ${p} sonnet[1m] for a 1M context window.`
                : `'${u}' isn\u2019t available, because the ${c} setting switches models in plan mode and has no 1M form. You can switch to ${c}, or to sonnet[1m] for a 1M context window.`,
              code: "alias_1m_unsupported",
            }
          );
      }
    }
  }
  if (n && isModelDenied(n, getModelEntitlementDenySet())) {
    let r = stepDownRestrictedFamilyAliasPick(n);
    if (r === null) {
      let c = await reprobeEntitlementDeny(n, o, s);
      if (c !== "overturned") {
        logFeatureBad(
          "model_switch",
          c === "probe_failed" ? "entitlement_probe_failed" : "denied_by_entitlement",
        );
        let u = artifactPathPrefix("model");
        return {
          ok: !1,
          message: `Model '${displayModelName(n)}' is restricted by your organization's settings. ${u ? `Run ${u} to choose a different model.` : "Switch to a different model."}`,
          code: c === "probe_failed" ? "check_failed" : "restricted_by_org",
        };
      }
    } else ((l = n), (n = r));
  } else if (n && !isModelAllowed(n)) {
    let r = stepDownRestrictedFamilyAliasPick(n);
    if (r === null)
      return (
        logFeatureBad("model_switch", classifyModelDenial(n)),
        {
          ok: !1,
          message: `Model '${displayModelName(n)}' is not available. Your organization restricts model selection.`,
          code: "restricted_by_org",
        }
      );
    ((l = n), (n = r));
  }
  if (n && isOpus1mUnavailable(n))
    return (
      logFeatureBad("model_switch", "opus_1m_unavailable"),
      {
        ok: !1,
        message:
          "Opus with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m",
        code: "unavailable_for_account",
      }
    );
  if (n && requires1mEntitlementCheck(n))
    return (
      logFeatureBad("model_switch", "sonnet_1m_unavailable"),
      {
        ok: !1,
        message:
          "Sonnet with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m",
        code: "unavailable_for_account",
      }
    );
  if (n) {
    let r = getModelUnavailabilityReason(n);
    if (r)
      switch (r.reason) {
        case "disabled":
          if (r.notOffered)
            return (
              logFeatureBad("model_switch", "not_offered"),
              {
                ok: !1,
                message: `Model '${displayModelName(n)}' is not available. ${sanitizeShortText(r.description)}`,
                code: "not_offered",
              }
            );
          return (
            logFeatureBad("model_switch", "disabled_by_org"),
            {
              ok: !1,
              message:
                `Model '${displayModelName(n)}' is not currently available for your account. ${sanitizeShortText(r.description)}`.trimEnd(),
              code: "unavailable_for_account",
            }
          );
        case "absent": {
          let c = await validateModelWithDeadline(
              resolveAliasForProbe(n),
              { forceServerProbe: !0, credentials: s },
              a?.deadlineMs,
            ),
            u = D(c, a);
          if (!c.valid && !u) {
            logFeatureBad("model_switch", c.notFound ? "fable_unavailable" : "fable_probe_failed");
            let p = artifactPathPrefix("model");
            return {
              ok: !1,
              message: c.notFound
                ? `${r.displayName} isn't available for your account yet. ${p ? `Run ${p} to pick another model.` : "Switch to a different model."}`
                : c.error,
              ...P(
                c.notFound || c.permissionDenied ? "unavailable_for_account" : classifyModelUnavailability(c),
              ),
              ...(c.serverRefusedModel === !0 && l === void 0 && { serverRefusedModel: !0 }),
            };
          }
          if (c.valid) fetchBootstrapData(o, s);
          return {
            ok: !0,
            model: isAliasSpelling(n) ? n.trim().toLowerCase() : n,
            ...(l !== void 0 && { substitutedFrom: l }),
            ...(u && { unconfirmed: !0 }),
          };
        }
      }
  }
  if (!n) return { ok: !0, model: n };
  if (isAliasSpelling(n)) return { ok: !0, model: n.trim().toLowerCase() };
  try {
    let r = await validateModelWithDeadline(
        n,
        { credentials: s, ...(a?.confirmWithServer === !1 && { serverProbe: !1 }) },
        a?.deadlineMs,
      ),
      c = !r.valid && r.creditsRequired === !0 && a?.acceptCreditsRequired === !0 && WKn(x(n)),
      u = D(r, a),
      p = !r.valid && r.sharedLimitReached === !0 && a?.acceptSharedLimitRefusal === !0;
    if (!r.valid && !c && !u && !p)
      return (
        logFeatureBad("model_switch", "invalid_model"),
        {
          ok: !1,
          message: r.error,
          ...P(classifyModelUnavailability(r)),
          ...(r.serverRefusedModel === !0 && l === void 0 && { serverRefusedModel: !0 }),
        }
      );
    return {
      ok: !0,
      model: x(n),
      ...(l !== void 0 && { substitutedFrom: l }),
      ...(!r.valid && c && { creditsRefusal: r.error }),
      ...(u && { unconfirmed: !0 }),
    };
  } catch (error) {
    return (
      logFeatureBad("model_switch", "validate_exception"),
      {
        ok: !1,
        message: `Failed to validate model: ${sanitizeShortText(errorMessage(error))}`,
        code: "check_failed",
      }
    );
  }
}
//@ chunk-d1cgs5na.js:8138-8161 placement
function x(e) {
  return e;
}
/**
 * 运行 PreModelSwitch 钩子决定 proceed/block（会话模型在钩子运行中变化时作废）。
 */
//@ chunk-d1cgs5na.js:8161-8898 placement
async function runPreModelSwitchHooks(e, o, s, a, n = {}) {
  let l = o(),
    r = bk(l),
    c = planModeModelOf(l, s);
  if (c.length === 0) return { decision: "proceed", skipConfirm: !1, messages: [] };
  let u = [],
    p,
    M = !1,
    _ = !0;
  for (let h of c) {
    let S = await runPreModelSwitchHooks_2(e, { ...h, requestedModel: s, source: a }, { signal: n.signal });
    if ((u.push(...S.messages), S.decision === "block"))
      return { decision: "block", reason: S.reason, messages: u };
    if (S.decision === "ask") ((M = !0), (p ??= S.reason));
    else _ = _ && S.skipConfirm;
  }
  if (bk(o()) !== r) {
    if (n.revalidating)
      return {
        decision: "block",
        reason: "the session model changed while a PreModelSwitch hook was running; pick again",
        messages: u,
      };
    let h = await runPreModelSwitchHooks(e, o, s, a, { ...n, revalidating: !0 });
    return { ...h, messages: [...u, ...h.messages] };
  }
  return M
    ? { decision: "ask", reason: p, messages: u }
    : { decision: "proceed", skipConfirm: _, messages: u };
}
//@ chunk-d1cgs5na.js:8898-9136 placement
function planModeModelOf(e, o) {
  let s = useMainLoopModel_2_2_2(e),
    mode = e.toolPermissionContext.mode,
    n = [mode, mode === "plan" ? "default" : "plan"],
    l = new Set(),
    r = [];
  for (let c of n) {
    let u = resolveEffectiveModel(s, c),
      p = resolveEffectiveModel(o, c),
      M = `${u}\x00${p}`;
    if (u !== p && !l.has(M)) (l.add(M), r.push({ fromModel: u, toModel: p }));
  }
  return r;
}
//@ chunk-d1cgs5na.js:9136-9357 placement
function describeModelSwitchBlocked(e) {
  return [
    `Model switch blocked by a PreModelSwitch hook${e.reason !== void 0 ? `: ${Nf(e.reason)}` : e.decision === "ask" ? ": confirmation required, and this session cannot ask" : ""}`,
    ...e.messages.map(Nf),
  ].join(`
`);
}
//@ chunk-d1cgs5na.js:9357-9404 placement
function Nf(e) {
  return replaceLineBreaks(stripUnsafeChars(pAn(e.trimEnd())));
}
/**
 * PreModelSwitch 钩子阻止切换模型时的提示文本（含钩子给出的原因与附加消息）。
 */
//@ chunk-d1cgs5na.js:9404-9538 placement
function preModelSwitchBlockedMessage(e, o, s) {
  return [
    `Model switch to ${renderModelLabel(e)} was blocked by a PreModelSwitch hook${o ? `: ${Nf(o)}` : ""}`,
    ...s.map(Nf),
  ].join(`
`);
}
//@ chunk-d1cgs5na.js:9538-10115 placement
async function saveModelSwitch(e, o, s, a, n, l, r, c, u) {
  let fastMode = s().fastMode;
  if (
    (clearRefusalFallbackModelLatch(),
    zE(e, s(), o, l),
    a((b) => ({ ...b, mainLoopModel: o, mainLoopModelForSession: null })),
    r !== void 0)
  )
    logFeatureSad("model_switch", "family_alias_stepped_down");
  else logFeatureOk("model_switch");
  let M = isFastModeEnabled() ? isFastModeActive(o, fastMode) : !!fastMode;
  if (isFastModeEnabled()) {
    if ((clearFastModeCooldown(), M !== !!fastMode))
      (a((b) => ({ ...b, fastMode: M })), reportFastModeToggle(fastMode, M));
  }
  let _ = n ? await setDefaultModel(o, c) : null;
  u?.(_);
  let h = _?.kind === "saved",
    S = `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(o))}${h ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
  ((S += formatFastModeSuffix(fastMode, M, o, { announceKeptOn: !0 })),
    (S += describeDefaultSaved(_)),
    (S += (h ? anthropicModelEnvNotice(o) : "") || findModelSettingSource(o)));
  let O = wt() ? null : buildUnknownModelNotice(aue(o), s().autoCompactWindow);
  if (O !== null)
    S += `
${O.text}`;
  return S;
}
//@ chunk-d1cgs5na.js:10115-10136 placement
var W = 3000,
  jKn = 15000;
//@ chunk-d1cgs5na.js:10136-10493 placement
async function setDefaultModel(e, o, s = W) {
  let a = updateSettingsForSource("userSettings", { model: e ?? void 0 }, void 0, o);
  a.then((l) => (l.error ? void 0 : classifyModelScope(e))).catch(() => {});
  let n = await withDeadline(a, s);
  if (n === void 0) return (logFeatureSad("model_set_default", "unconfirmed"), { kind: "unconfirmed" });
  if (n.error)
    return (logFeatureBad("model_set_default", "write_failed"), { kind: "failed", error: n.error });
  return (logFeatureOk("model_set_default"), { kind: "saved" });
}
//@ chunk-d1cgs5na.js:10493-10896 placement
function describeDefaultSaved(e) {
  if (e === null || e.kind === "saved") return "";
  let o = tildify(getSettingsFilePathForSource("userSettings") ?? "settings.json");
  switch (e.kind) {
    case "unconfirmed":
      return ` \xB7 couldn't confirm it was saved as your default (${o} is still being written)`;
    case "failed": {
      let cause = e.error.cause,
        a =
          cause instanceof Error
            ? `can't be written (${getErrnoCode(cause) ?? sanitizeShortText(cause.message)})`
            : "isn't valid JSON";
      return ` \xB7 couldn't save it as your default: ${o} ${a}`;
    }
  }
}
/**
 * ANTHROPIC_MODEL 环境变量设置了允许的模型且与当前选择不同时，提示新会话将使用该模型。
 */
//@ chunk-d1cgs5na.js:10896-11078 placement
function anthropicModelEnvNotice(e) {
  let ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
  if (!ANTHROPIC_MODEL || !isModelAllowed(ANTHROPIC_MODEL)) return "";
  if (!isDifferentModelSetting(e ?? getDefaultMainLoopModelSetting(), ANTHROPIC_MODEL)) return "";
  return v(
    "ANTHROPIC_MODEL is set to ",
    renderModelSetting(ANTHROPIC_MODEL),
    " \u2014 new sessions use that while it is set",
  );
}
//@ chunk-d1cgs5na.js:11078-11211 placement
function isDifferentModelSetting(e, o) {
  let s = parseUserSpecifiedModel(e),
    a = parseUserSpecifiedModel(o);
  return (
    isModeDependentModelSetting(e) ||
    getCanonicalName(s, { identity: !0 }) !== getCanonicalName(a, { identity: !0 }) ||
    /\[1m\]$/i.test(s) !== /\[1m\]$/i.test(a)
  );
}
//@ chunk-d1cgs5na.js:11211-11716 placement
function findModelSettingSource(e) {
  let o = getEffectiveSettingSource_2("model");
  if (o !== "projectSettings" && o !== "localSettings" && o !== "policySettings") {
    let n = getOrgLockedDefaultModel();
    if (
      n !== null &&
      e !== null &&
      o !== "flagSettings" &&
      !env.ANTHROPIC_MODEL &&
      isDifferentModelSetting(e, n.model)
    )
      return renderOrgDefaultRestartNotice(n);
    return "";
  }
  if (o !== "policySettings") {
    let n = getOrgLockedDefaultModel();
    if (n !== null && !env.ANTHROPIC_MODEL) {
      if (e === null) return "";
      if (isDifferentModelSetting(e, n.model)) return renderOrgDefaultRestartNotice(n);
      return "";
    }
  }
  let s = getSettingsForSource(o)?.model;
  if (s === void 0 || e === s) return "";
  let a = o === "policySettings" ? "Managed settings" : getRelativeSettingsFilePathForSource(o);
  return v(`${a} pins `, renderModelSetting(s), " \u2014 that applies on restart");
}
//@ chunk-d1cgs5na.js:11716-11786 placement
function v(e, o, s) {
  return `${sequential.dim(`
     ${e}`)}${toInlineCode(o)}${sequential.dim(s)}`;
}
/**
 * 组织默认模型在重启后生效的提示（org 或 standard）。
 */
//@ chunk-d1cgs5na.js:11786-12054 placement
function renderOrgDefaultRestartNotice(e) {
  let o = renderModelSetting(e.model);
  switch (e.kind) {
    case "org":
      return v("Your organization's default (", o, ") applies on restart");
    case "standard":
      return v(
        "Your organization's default model isn't available in this build, so the standard default (",
        o,
        ") applies on restart",
      );
  }
}

export {
  switchMainLoopModelSafe,
  jKn,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  saveModelSwitch,
  Nf,
  describeModelSwitchBlocked,
  setDefaultModel,
  describeDefaultSaved,
  anthropicModelEnvNotice,
  findModelSettingSource,
};
