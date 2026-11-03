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
import {
  servedCatalogMode,
  catalogScope,
  catalogSurface,
  getCachedCatalogEntry,
  saveCachedCatalog,
} from "../../services/modelCatalog/servedCatalog.js";
import { servedCatalogSource, selectorStateSchema } from "../../utils/model/modelCatalog/servedCatalog.js";
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
  resolveRequestedModel,
} from "./model.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
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
  neverDenied,
  codeError,
  classifyModelUnavailability,
  ladderForDefaultModel,
} from "../../utils/model/modelUnavailability.js";
import { getModelUnavailabilityReason } from "../../utils/model/classifierModel.js";
import { fetchBootstrapData } from "../../services/api/bootstrap.js";
import {
  effectiveModelForContext,
  runPreModelSwitchHooks as runPreModelSwitchHooks_2,
  useMainLoopModel_2 as useMainLoopModel_2_2_2,
  resolveEffectiveModel,
  recordSwitchIfChanged,
} from "../../utils/model/modelSwitchHooks.js";
import {
  replaceLineBreaks,
  stripUnsafeChars,
  truncateForDisplayText,
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
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
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
var MODEL_SWITCH_TIMEOUT_MS = 5000;
//@ chunk-d1cgs5na.js:1914-2192 placement
async function classifyModelScope(e) {
  if (e === null) return skipSelectionWrite("follows_account");
  if (isOpusPlanAlias(e)) return skipSelectionWrite("not_representable");
  if (servedCatalogMode() !== "primary") return skipSelectionWrite("not_primary");
  if (servedCatalogSource() !== "served") return skipSelectionWrite("not_served");
  let o = catalogScope();
  if (o === null || o.kind !== "account") return skipSelectionWrite("no_account_scope");
  return syncModelSelectionToServer(o, catalogSurface(), e);
}
//@ chunk-d1cgs5na.js:2192-3061 placement
/**
 * 把模型选择写到组织的 model_selector_state（失败分类记录）。
 */
async function syncModelSelectionToServer(e, o, s) {
  let a = {
    model: parseUserSpecifiedModel(s),
  };
  try {
    let n = await apiClient.patch(`/api/organizations/:orgUUID/model_selector_state/${o}`, a, {
      auth: "teleport-org",
      isBackground: true,
      timeout: MODEL_SWITCH_TIMEOUT_MS,
      validateStatus: () => true,
    });
    if (!n.ok) {
      logForDebugging(`[servedCatalog] selection write (${o}) skipped: ${n.reason}`);
      logFeatureSad("model_default_server_sync", `declined_${n.reason}`);
      return {
        status: "skipped",
        reason: "declined",
      };
    }
    let status = n.status;
    if (status < 200 || status >= 300) {
      logForDebugging(`[servedCatalog] selection write (${o}): HTTP ${status}`);
      logFeatureSad("model_default_server_sync", `http_${status}`);
      return {
        status: "error",
        reason: "http_status",
        httpStatus: status,
      };
    }
    logForDebugging(`[servedCatalog] selection write (${o}) ok`);
    logFeatureOk("model_default_server_sync");
    await describeModelSource(e, o, n.data, a.model);
    return {
      status: "ok",
      httpStatus: status,
    };
  } catch (error) {
    let kind = classifyAxiosError(error).kind;
    logForDebugging(`[servedCatalog] selection write (${o}) failed: ${kind}`);
    logFeatureSad("model_default_server_sync", `network_${kind}`);
    return {
      status: "error",
      reason: "network",
    };
  }
}
//@ chunk-d1cgs5na.js:3061-3361 placement
async function describeModelSource(e, o, s, model) {
  let cachedCatalogEntry = getCachedCatalogEntry(e, o);
  if (cachedCatalogEntry === undefined || cachedCatalogEntry.catalog === null) return;
  let l = selectorStateSchema().safeParse(s);
  let state =
    l.success && l.data.id === o
      ? l.data
      : {
          ...(cachedCatalogEntry.catalog.state ?? {
            id: o,
          }),
          model,
          selection_source: "user_setting",
        };
  await saveCachedCatalog(e, o, {
    ...cachedCatalogEntry,
    staleAt: Math.min(cachedCatalogEntry.staleAt, Date.now()),
    catalog: {
      ...cachedCatalogEntry.catalog,
      state,
    },
  });
}
//@ chunk-d1cgs5na.js:3361-3461 placement
function skipSelectionWrite(e) {
  logForDebugging(`[servedCatalog] selection write skipped: ${e}`);
  return {
    status: "skipped",
    reason: e,
  };
}
//@ chunk-d1cgs5na.js:3461-3546 placement
function isOpusPlanAlias(e) {
  let lower = e.trim().toLowerCase();
  return lower === "opusplan" || lower === "opusplan[1m]";
}
//@ chunk-d1cgs5na.js:3546-3713 placement
/**
 * 切换主循环模型的安全包装：失败消息与额度拒绝说明经过遥测清理后再返回。
 */
async function switchMainLoopModelSafe(...e) {
  let o = await switchMainLoopModel(...e);
  if (!o.ok)
    return {
      ...o,
      message: sanitizeTelemetryString(o.message),
    };
  return o.creditsRefusal === undefined
    ? o
    : {
        ...o,
        creditsRefusal: sanitizeTelemetryString(o.creditsRefusal),
      };
}
//@ chunk-d1cgs5na.js:3713-8138 placement
/**
 * 切换主循环模型：默认/别名、计划模式、保存、遥测（约 4.4 KB）。
 */
async function switchMainLoopModel(e, o, s, a) {
  let model = e === "default" ? null : e;
  if (model === null) {
    let r = managedDenyStartupRefusal(getDefaultMainLoopModelSetting(), "switch");
    if (r !== null) {
      logFeatureBad("model_switch", "denied_by_managed_settings");
      return {
        ok: false,
        message: r,
        code: "restricted_by_org",
      };
    }
  }
  let l;
  if (model) {
    let r = diagnose1mAliasSwitch(model);
    if (r !== null) {
      let c = strip1mSuffix(model.trim().toLowerCase());
      let u = displayModelName(model);
      let p = artifactPathPrefix("model");
      switch (r.kind) {
        case "disabled":
          logFeatureBad("model_switch", "alias_1m_disabled");
          return {
            ok: false,
            message: p
              ? `1M context is turned off here (CLAUDE_CODE_DISABLE_1M_CONTEXT is set), so '${u}' isn't available. Run ${p} ${c} instead.`
              : `1M context is turned off (CLAUDE_CODE_DISABLE_1M_CONTEXT is set), so '${u}' isn\u2019t available. Switch to ${c} instead.`,
            code: "alias_1m_disabled",
          };
        case "unsupported":
          logFeatureBad("model_switch", "alias_1m_unsupported");
          return {
            ok: false,
            message: p
              ? `${sanitizeTitle(renderModelName(r.carrier))} doesn't have a 1M context window, so '${u}' isn't available. Run ${p} ${c} to use it with its standard context window.`
              : `${sanitizeTitle(renderModelName(r.carrier))} doesn\u2019t have a 1M context window, so '${u}' isn\u2019t available. Switch to ${c} to use its standard context window.`,
            code: "alias_1m_unsupported",
          };
        case "noModeDependentVariant":
          logFeatureBad("model_switch", "alias_1m_no_mode_variant");
          return {
            ok: false,
            message: p
              ? `'${u}' isn't available: the ${c} setting switches models in plan mode and has no 1M form. Run ${p} ${c}, or ${p} sonnet[1m] for a 1M context window.`
              : `'${u}' isn\u2019t available, because the ${c} setting switches models in plan mode and has no 1M form. You can switch to ${c}, or to sonnet[1m] for a 1M context window.`,
            code: "alias_1m_unsupported",
          };
      }
    }
  }
  if (model && isModelDenied(model, getModelEntitlementDenySet())) {
    let r = stepDownRestrictedFamilyAliasPick(model);
    if (r === null) {
      let c = await reprobeEntitlementDeny(model, o, s);
      if (c !== "overturned") {
        logFeatureBad(
          "model_switch",
          c === "probe_failed" ? "entitlement_probe_failed" : "denied_by_entitlement",
        );
        let u = artifactPathPrefix("model");
        return {
          ok: false,
          message: `Model '${displayModelName(model)}' is restricted by your organization's settings. ${u ? `Run ${u} to choose a different model.` : "Switch to a different model."}`,
          code: c === "probe_failed" ? "check_failed" : "restricted_by_org",
        };
      }
    } else {
      l = model;
      model = r;
    }
  } else if (model && !isModelAllowed(model)) {
    let r = stepDownRestrictedFamilyAliasPick(model);
    if (r === null) {
      logFeatureBad("model_switch", classifyModelDenial(model));
      return {
        ok: false,
        message: `Model '${displayModelName(model)}' is not available. Your organization restricts model selection.`,
        code: "restricted_by_org",
      };
    }
    l = model;
    model = r;
  }
  if (model && isOpus1mUnavailable(model)) {
    logFeatureBad("model_switch", "opus_1m_unavailable");
    return {
      ok: false,
      message:
        "Opus with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m",
      code: "unavailable_for_account",
    };
  }
  if (model && requires1mEntitlementCheck(model)) {
    logFeatureBad("model_switch", "sonnet_1m_unavailable");
    return {
      ok: false,
      message:
        "Sonnet with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m",
      code: "unavailable_for_account",
    };
  }
  if (model) {
    let modelUnavailabilityReason = getModelUnavailabilityReason(model);
    if (modelUnavailabilityReason)
      switch (modelUnavailabilityReason.reason) {
        case "disabled":
          if (modelUnavailabilityReason.notOffered) {
            logFeatureBad("model_switch", "not_offered");
            return {
              ok: false,
              message: `Model '${displayModelName(model)}' is not available. ${sanitizeShortText(modelUnavailabilityReason.description)}`,
              code: "not_offered",
            };
          }
          logFeatureBad("model_switch", "disabled_by_org");
          return {
            ok: false,
            message:
              `Model '${displayModelName(model)}' is not currently available for your account. ${sanitizeShortText(modelUnavailabilityReason.description)}`.trimEnd(),
            code: "unavailable_for_account",
          };
        case "absent": {
          let c = await validateModelWithDeadline(
            resolveAliasForProbe(model),
            {
              forceServerProbe: true,
              credentials: s,
            },
            a?.deadlineMs,
          );
          let u = neverDenied(c, a);
          if (!c.valid && !u) {
            logFeatureBad("model_switch", c.notFound ? "fable_unavailable" : "fable_probe_failed");
            let p = artifactPathPrefix("model");
            return {
              ok: false,
              message: c.notFound
                ? `${modelUnavailabilityReason.displayName} isn't available for your account yet. ${p ? `Run ${p} to pick another model.` : "Switch to a different model."}`
                : c.error,
              ...codeError(
                c.notFound || c.permissionDenied ? "unavailable_for_account" : classifyModelUnavailability(c),
              ),
              ...(c.serverRefusedModel === true &&
                l === undefined && {
                  serverRefusedModel: true,
                }),
            };
          }
          if (c.valid) fetchBootstrapData(o, s);
          return {
            ok: true,
            model: isAliasSpelling(model) ? model.trim().toLowerCase() : model,
            ...(l !== undefined && {
              substitutedFrom: l,
            }),
            ...(u && {
              unconfirmed: true,
            }),
          };
        }
      }
  }
  if (!model)
    return {
      ok: true,
      model,
    };
  if (isAliasSpelling(model))
    return {
      ok: true,
      model: model.trim().toLowerCase(),
    };
  try {
    let r = await validateModelWithDeadline(
      model,
      {
        credentials: s,
        ...(a?.confirmWithServer === false && {
          serverProbe: false,
        }),
      },
      a?.deadlineMs,
    );
    let c =
      !r.valid &&
      r.creditsRequired === true &&
      a?.acceptCreditsRequired === true &&
      ladderForDefaultModel(identity(model));
    let u = neverDenied(r, a);
    let p = !r.valid && r.sharedLimitReached === true && a?.acceptSharedLimitRefusal === true;
    if (!r.valid && !c && !u && !p) {
      logFeatureBad("model_switch", "invalid_model");
      return {
        ok: false,
        message: r.error,
        ...codeError(classifyModelUnavailability(r)),
        ...(r.serverRefusedModel === true &&
          l === undefined && {
            serverRefusedModel: true,
          }),
      };
    }
    return {
      ok: true,
      model: identity(model),
      ...(l !== undefined && {
        substitutedFrom: l,
      }),
      ...(!r.valid &&
        c && {
          creditsRefusal: r.error,
        }),
      ...(u && {
        unconfirmed: true,
      }),
    };
  } catch (error) {
    logFeatureBad("model_switch", "validate_exception");
    return {
      ok: false,
      message: `Failed to validate model: ${sanitizeShortText(errorMessage(error))}`,
      code: "check_failed",
    };
  }
}
//@ chunk-d1cgs5na.js:8138-8161 placement
function identity(e) {
  return e;
}
//@ chunk-d1cgs5na.js:8161-8898 placement
/**
 * 运行 PreModelSwitch 钩子决定 proceed/block（会话模型在钩子运行中变化时作废）。
 */
async function runPreModelSwitchHooks(session, o, s, a, n = {}) {
  let l = o();
  let r = effectiveModelForContext(l);
  let c = planModeModelOf(l, s);
  if (c.length === 0)
    return {
      decision: "proceed",
      skipConfirm: false,
      messages: [],
    };
  let u = [];
  let reason;
  let M = false;
  let _ = true;
  for (let h of c) {
    let S = await runPreModelSwitchHooks_2(
      session,
      {
        ...h,
        requestedModel: s,
        source: a,
      },
      {
        signal: n.signal,
      },
    );
    u.push(...S.messages);
    if (S.decision === "block")
      return {
        decision: "block",
        reason: S.reason,
        messages: u,
      };
    if (S.decision === "ask") {
      M = true;
      reason ??= S.reason;
    } else _ = _ && S.skipConfirm;
  }
  if (effectiveModelForContext(o()) !== r) {
    if (n.revalidating)
      return {
        decision: "block",
        reason: "the session model changed while a PreModelSwitch hook was running; pick again",
        messages: u,
      };
    let h = await runPreModelSwitchHooks(session, o, s, a, {
      ...n,
      revalidating: true,
    });
    return {
      ...h,
      messages: [...u, ...h.messages],
    };
  }
  return M
    ? {
        decision: "ask",
        reason,
        messages: u,
      }
    : {
        decision: "proceed",
        skipConfirm: _,
        messages: u,
      };
}
//@ chunk-d1cgs5na.js:8898-9136 placement
function planModeModelOf(e, o) {
  let mainLoopModel = useMainLoopModel_2_2_2(e);
  let mode = e.toolPermissionContext.mode;
  let n = [mode, mode === "plan" ? "default" : "plan"];
  let l = new Set();
  let r = [];
  for (let c of n) {
    let effectiveModel = resolveEffectiveModel(mainLoopModel, c);
    let effectiveModel_2 = resolveEffectiveModel(o, c);
    let M = `${effectiveModel}\x00${effectiveModel_2}`;
    if (effectiveModel !== effectiveModel_2 && !l.has(M)) {
      l.add(M);
      r.push({
        fromModel: effectiveModel,
        toModel: effectiveModel_2,
      });
    }
  }
  return r;
}
//@ chunk-d1cgs5na.js:9136-9357 placement
function describeModelSwitchBlocked(e) {
  return [
    `Model switch blocked by a PreModelSwitch hook${e.reason !== undefined ? `: ${sanitizeHookText(e.reason)}` : e.decision === "ask" ? ": confirmation required, and this session cannot ask" : ""}`,
    ...e.messages.map(sanitizeHookText),
  ].join(`
`);
}
//@ chunk-d1cgs5na.js:9357-9404 placement
/**
 * 净化来自钩子的文本：去不安全字符、换行替换、去尾部空白。
 */
function sanitizeHookText(e) {
  return replaceLineBreaks(stripUnsafeChars(truncateForDisplayText(e.trimEnd())));
}
//@ chunk-d1cgs5na.js:9404-9538 placement
/**
 * PreModelSwitch 钩子阻止切换模型时的提示文本（含钩子给出的原因与附加消息）。
 */
function preModelSwitchBlockedMessage(e, o, messages) {
  return [
    `Model switch to ${renderModelLabel(e)} was blocked by a PreModelSwitch hook${o ? `: ${sanitizeHookText(o)}` : ""}`,
    ...messages.map(sanitizeHookText),
  ].join(`
`);
}
//@ chunk-d1cgs5na.js:9538-10115 placement
async function saveModelSwitch(session, o, s, setAppState, n, l, r, storageV5, u) {
  let fastMode = s().fastMode;
  clearRefusalFallbackModelLatch();
  recordSwitchIfChanged(session, s(), o, l);
  setAppState((b) => ({
    ...b,
    mainLoopModel: o,
    mainLoopModelForSession: null,
  }));
  if (r !== undefined) logFeatureSad("model_switch", "family_alias_stepped_down");
  else logFeatureOk("model_switch");
  let M = isFastModeEnabled() ? isFastModeActive(o, fastMode) : !!fastMode;
  if (isFastModeEnabled()) {
    clearFastModeCooldown();
    if (M !== !!fastMode) {
      setAppState((b) => ({
        ...b,
        fastMode: M,
      }));
      reportFastModeToggle(fastMode, M);
    }
  }
  let _ = n ? await setDefaultModel(o, storageV5) : null;
  u?.(_);
  let h = _?.kind === "saved";
  let S = `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(o))}${h ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
  S += formatFastModeSuffix(fastMode, M, o, {
    announceKeptOn: true,
  });
  S += describeDefaultSaved(_);
  S += (h ? anthropicModelEnvNotice(o) : "") || findModelSettingSource(o);
  let O = isRemoteSessionAvailable()
    ? null
    : buildUnknownModelNotice(resolveRequestedModel(o), s().autoCompactWindow);
  if (O !== null)
    S += `
${O.text}`;
  return S;
}
//@ chunk-d1cgs5na.js:10115-10136 placement
/**
 * 设置默认模型的等待 3000ms 与模型列表刷新超时 15000ms。
 */
var SET_DEFAULT_MODEL_TIMEOUT_MS = 3000;
var MODEL_LIST_REFRESH_TIMEOUT_MS = 15000;
//@ chunk-d1cgs5na.js:10136-10493 placement
async function setDefaultModel(e, storageV5, s = SET_DEFAULT_MODEL_TIMEOUT_MS) {
  let a = updateSettingsForSource(
    "userSettings",
    {
      model: e ?? undefined,
    },
    undefined,
    storageV5,
  );
  a.then((l) => (l.error ? undefined : classifyModelScope(e))).catch(() => {});
  let n = await withDeadline(a, s);
  if (n === undefined) {
    logFeatureSad("model_set_default", "unconfirmed");
    return {
      kind: "unconfirmed",
    };
  }
  if (n.error) {
    logFeatureBad("model_set_default", "write_failed");
    return {
      kind: "failed",
      error: n.error,
    };
  }
  logFeatureOk("model_set_default");
  return {
    kind: "saved",
  };
}
//@ chunk-d1cgs5na.js:10493-10896 placement
function describeDefaultSaved(e) {
  if (e === null || e.kind === "saved") return "";
  let o = tildify(getSettingsFilePathForSource("userSettings") ?? "settings.json");
  switch (e.kind) {
    case "unconfirmed":
      return ` \xB7 couldn't confirm it was saved as your default (${o} is still being written)`;
    case "failed": {
      let cause = e.error.cause;
      let a =
        cause instanceof Error
          ? `can't be written (${getErrnoCode(cause) ?? sanitizeShortText(cause.message)})`
          : "isn't valid JSON";
      return ` \xB7 couldn't save it as your default: ${o} ${a}`;
    }
  }
}
//@ chunk-d1cgs5na.js:10896-11078 placement
/**
 * ANTHROPIC_MODEL 环境变量设置了允许的模型且与当前选择不同时，提示新会话将使用该模型。
 */
function anthropicModelEnvNotice(e) {
  let ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
  if (!ANTHROPIC_MODEL || !isModelAllowed(ANTHROPIC_MODEL)) return "";
  if (!isDifferentModelSetting(e ?? getDefaultMainLoopModelSetting(), ANTHROPIC_MODEL)) return "";
  return dimWithCode(
    "ANTHROPIC_MODEL is set to ",
    renderModelSetting(ANTHROPIC_MODEL),
    " \u2014 new sessions use that while it is set",
  );
}
//@ chunk-d1cgs5na.js:11078-11211 placement
function isDifferentModelSetting(e, model) {
  let userSpecifiedModel = parseUserSpecifiedModel(e);
  let userSpecifiedModel_2 = parseUserSpecifiedModel(model);
  return (
    isModeDependentModelSetting(e) ||
    getCanonicalName(userSpecifiedModel, {
      identity: true,
    }) !==
      getCanonicalName(userSpecifiedModel_2, {
        identity: true,
      }) ||
    /\[1m\]$/i.test(userSpecifiedModel) !== /\[1m\]$/i.test(userSpecifiedModel_2)
  );
}
//@ chunk-d1cgs5na.js:11211-11716 placement
function findModelSettingSource(e) {
  let effectiveSettingSource = getEffectiveSettingSource_2("model");
  if (
    effectiveSettingSource !== "projectSettings" &&
    effectiveSettingSource !== "localSettings" &&
    effectiveSettingSource !== "policySettings"
  ) {
    let orgLockedDefaultModel = getOrgLockedDefaultModel();
    if (
      orgLockedDefaultModel !== null &&
      e !== null &&
      effectiveSettingSource !== "flagSettings" &&
      !env.ANTHROPIC_MODEL &&
      isDifferentModelSetting(e, orgLockedDefaultModel.model)
    )
      return renderOrgDefaultRestartNotice(orgLockedDefaultModel);
    return "";
  }
  if (effectiveSettingSource !== "policySettings") {
    let orgLockedDefaultModel = getOrgLockedDefaultModel();
    if (orgLockedDefaultModel !== null && !env.ANTHROPIC_MODEL) {
      if (e === null) return "";
      if (isDifferentModelSetting(e, orgLockedDefaultModel.model))
        return renderOrgDefaultRestartNotice(orgLockedDefaultModel);
      return "";
    }
  }
  let model = getSettingsForSource(effectiveSettingSource)?.model;
  if (model === undefined || e === model) return "";
  let a =
    effectiveSettingSource === "policySettings"
      ? "Managed settings"
      : getRelativeSettingsFilePathForSource(effectiveSettingSource);
  return dimWithCode(`${a} pins `, renderModelSetting(model), " \u2014 that applies on restart");
}
//@ chunk-d1cgs5na.js:11716-11786 placement
function dimWithCode(e, o, s) {
  return `${sequential.dim(`
     ${e}`)}${toInlineCode(o)}${sequential.dim(s)}`;
}
//@ chunk-d1cgs5na.js:11786-12054 placement
/**
 * 组织默认模型在重启后生效的提示（org 或 standard）。
 */
function renderOrgDefaultRestartNotice(orgLockedDefaultModel) {
  let o = renderModelSetting(orgLockedDefaultModel.model);
  switch (orgLockedDefaultModel.kind) {
    case "org":
      return dimWithCode("Your organization's default (", o, ") applies on restart");
    case "standard":
      return dimWithCode(
        "Your organization's default model isn't available in this build, so the standard default (",
        o,
        ") applies on restart",
      );
  }
}
export {
  switchMainLoopModelSafe,
  MODEL_LIST_REFRESH_TIMEOUT_MS,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  saveModelSwitch,
  sanitizeHookText,
  describeModelSwitchBlocked,
  setDefaultModel,
  describeDefaultSaved,
  anthropicModelEnvNotice,
  findModelSettingSource,
};
