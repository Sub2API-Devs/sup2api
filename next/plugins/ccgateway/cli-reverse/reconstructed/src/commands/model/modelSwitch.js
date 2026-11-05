/**
 * commands/model/modelSwitch.ts
 *
 * 2.1.316 新增：模型切换：服务端模型选择状态同步（model_selector_state）、PreModelSwitch 钩子、保存为默认模型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wefvmrb3.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  useMainLoopModel_2 as useMainLoopModel_2_2,
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
  getEffectiveSettingSource,
  getSettingsForSource,
  getRelativeSettingsFilePathForSource,
} from "../../utils/settings/settings.js";
import { withDeadline } from "../../utils/sleep.js";
import { tildify } from "../../utils/path.js";
import { env } from "../../utils/env.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { sequential } from "../../utils/sequential.js";

//@ chunk-wefvmrb3.js:1970-1981 placement
var MODEL_SWITCH_TIMEOUT_MS = 5000;
//@ chunk-wefvmrb3.js:1981-2260 placement
async function classifyModelScope(model) {
  if (model === null) return skipSelectionWrite("follows_account");
  if (isOpusPlanAlias(model)) return skipSelectionWrite("not_representable");
  if (servedCatalogMode() !== "primary") return skipSelectionWrite("not_primary");
  if (servedCatalogSource() !== "served") return skipSelectionWrite("not_served");
  let scope = catalogScope();
  if (scope === null || scope.kind !== "account") return skipSelectionWrite("no_account_scope");
  return syncModelSelectionToServer(scope, catalogSurface(), model);
}
//@ chunk-wefvmrb3.js:2260-3129 placement
/**
 * 把模型选择写到组织的 model_selector_state（失败分类记录）。
 */
async function syncModelSelectionToServer(model, session, requested) {
  let payload = {
    model: parseUserSpecifiedModel(requested),
  };
  try {
    let response = await apiClient.patch(
      `/api/organizations/:orgUUID/model_selector_state/${session}`,
      payload,
      {
        auth: "teleport-org",
        isBackground: true,
        timeout: MODEL_SWITCH_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
    if (!response.ok) {
      logForDebugging(`[servedCatalog] selection write (${session}) skipped: ${response.reason}`);
      logFeatureSad("model_default_server_sync", `declined_${response.reason}`);
      return {
        status: "skipped",
        reason: "declined",
      };
    }
    let status = response.status;
    if (status < 200 || status >= 300) {
      logForDebugging(`[servedCatalog] selection write (${session}): HTTP ${status}`);
      logFeatureSad("model_default_server_sync", `http_${status}`);
      return {
        status: "error",
        reason: "http_status",
        httpStatus: status,
      };
    }
    logForDebugging(`[servedCatalog] selection write (${session}) ok`);
    logFeatureOk("model_default_server_sync");
    await describeModelSource(model, session, response.data, payload.model);
    return {
      status: "ok",
      httpStatus: status,
    };
  } catch (error) {
    let kind = classifyAxiosError(error).kind;
    logForDebugging(`[servedCatalog] selection write (${session}) failed: ${kind}`);
    logFeatureSad("model_default_server_sync", `network_${kind}`);
    return {
      status: "error",
      reason: "network",
    };
  }
}
//@ chunk-wefvmrb3.js:3129-3429 placement
async function describeModelSource(model, session, state, model_2) {
  let cachedCatalogEntry = getCachedCatalogEntry(model, session);
  if (cachedCatalogEntry === undefined || cachedCatalogEntry.catalog === null) return;
  let parsed = selectorStateSchema().safeParse(state);
  let state_2 =
    parsed.success && parsed.data.id === session
      ? parsed.data
      : {
          ...(cachedCatalogEntry.catalog.state ?? {
            id: session,
          }),
          model: model_2,
          selection_source: "user_setting",
        };
  await saveCachedCatalog(model, session, {
    ...cachedCatalogEntry,
    staleAt: Math.min(cachedCatalogEntry.staleAt, Date.now()),
    catalog: {
      ...cachedCatalogEntry.catalog,
      state: state_2,
    },
  });
}
//@ chunk-wefvmrb3.js:3429-3529 placement
function skipSelectionWrite(state) {
  logForDebugging(`[servedCatalog] selection write skipped: ${state}`);
  return {
    status: "skipped",
    reason: state,
  };
}
//@ chunk-wefvmrb3.js:3529-3614 placement
function isOpusPlanAlias(model) {
  let lower = model.trim().toLowerCase();
  return lower === "opusplan" || lower === "opusplan[1m]";
}
//@ chunk-wefvmrb3.js:3614-3781 placement
/**
 * 切换主循环模型的安全包装：失败消息与额度拒绝说明经过遥测清理后再返回。
 */
async function switchMainLoopModelSafe(...args) {
  let result = await switchMainLoopModel(...args);
  if (!result.ok)
    return {
      ...result,
      message: sanitizeTelemetryString(result.message),
    };
  return result.creditsRefusal === undefined
    ? result
    : {
        ...result,
        creditsRefusal: sanitizeTelemetryString(result.creditsRefusal),
      };
}
//@ chunk-wefvmrb3.js:3781-8206 placement
/**
 * 切换主循环模型：默认/别名、计划模式、保存、遥测（约 4.4 KB）。
 */
async function switchMainLoopModel(state, session, storageV5, options) {
  let requestedModel = state === "default" ? null : state;
  if (requestedModel === null) {
    let denyReason = managedDenyStartupRefusal(getDefaultMainLoopModelSetting(), "switch");
    if (denyReason !== null) {
      logFeatureBad("model_switch", "denied_by_managed_settings");
      return {
        ok: false,
        message: denyReason,
        code: "restricted_by_org",
      };
    }
  }
  let notice;
  if (requestedModel) {
    let aliasDiagnosis = diagnose1mAliasSwitch(requestedModel);
    if (aliasDiagnosis !== null) {
      let canonical = strip1mSuffix(requestedModel.trim().toLowerCase());
      let displayName = displayModelName(requestedModel);
      let artifactPrefix = artifactPathPrefix("model");
      switch (aliasDiagnosis.kind) {
        case "disabled":
          logFeatureBad("model_switch", "alias_1m_disabled");
          return {
            ok: false,
            message: artifactPrefix
              ? `1M context is turned off here (CLAUDE_CODE_DISABLE_1M_CONTEXT is set), so '${displayName}' isn't available. Run ${artifactPrefix} ${canonical} instead.`
              : `1M context is turned off (CLAUDE_CODE_DISABLE_1M_CONTEXT is set), so '${displayName}' isn\u2019t available. Switch to ${canonical} instead.`,
            code: "alias_1m_disabled",
          };
        case "unsupported":
          logFeatureBad("model_switch", "alias_1m_unsupported");
          return {
            ok: false,
            message: artifactPrefix
              ? `${sanitizeTitle(renderModelName(aliasDiagnosis.carrier))} doesn't have a 1M context window, so '${displayName}' isn't available. Run ${artifactPrefix} ${canonical} to use it with its standard context window.`
              : `${sanitizeTitle(renderModelName(aliasDiagnosis.carrier))} doesn\u2019t have a 1M context window, so '${displayName}' isn\u2019t available. Switch to ${canonical} to use its standard context window.`,
            code: "alias_1m_unsupported",
          };
        case "noModeDependentVariant":
          logFeatureBad("model_switch", "alias_1m_no_mode_variant");
          return {
            ok: false,
            message: artifactPrefix
              ? `'${displayName}' isn't available: the ${canonical} setting switches models in plan mode and has no 1M form. Run ${artifactPrefix} ${canonical}, or ${artifactPrefix} sonnet[1m] for a 1M context window.`
              : `'${displayName}' isn\u2019t available, because the ${canonical} setting switches models in plan mode and has no 1M form. You can switch to ${canonical}, or to sonnet[1m] for a 1M context window.`,
            code: "alias_1m_unsupported",
          };
      }
    }
  }
  if (requestedModel && isModelDenied(requestedModel, getModelEntitlementDenySet())) {
    let stepDown = stepDownRestrictedFamilyAliasPick(requestedModel);
    if (stepDown === null) {
      let denial = await reprobeEntitlementDeny(requestedModel, session, storageV5);
      if (denial !== "overturned") {
        logFeatureBad(
          "model_switch",
          denial === "probe_failed" ? "entitlement_probe_failed" : "denied_by_entitlement",
        );
        let artifactPrefix = artifactPathPrefix("model");
        return {
          ok: false,
          message: `Model '${displayModelName(requestedModel)}' is restricted by your organization's settings. ${artifactPrefix ? `Run ${artifactPrefix} to choose a different model.` : "Switch to a different model."}`,
          code: denial === "probe_failed" ? "check_failed" : "restricted_by_org",
        };
      }
    } else {
      notice = requestedModel;
      requestedModel = stepDown;
    }
  } else if (requestedModel && !isModelAllowed(requestedModel)) {
    let stepDown = stepDownRestrictedFamilyAliasPick(requestedModel);
    if (stepDown === null) {
      logFeatureBad("model_switch", classifyModelDenial(requestedModel));
      return {
        ok: false,
        message: `Model '${displayModelName(requestedModel)}' is not available. Your organization restricts model selection.`,
        code: "restricted_by_org",
      };
    }
    notice = requestedModel;
    requestedModel = stepDown;
  }
  if (requestedModel && isOpus1mUnavailable(requestedModel)) {
    logFeatureBad("model_switch", "opus_1m_unavailable");
    return {
      ok: false,
      message:
        "Opus with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m",
      code: "unavailable_for_account",
    };
  }
  if (requestedModel && requires1mEntitlementCheck(requestedModel)) {
    logFeatureBad("model_switch", "sonnet_1m_unavailable");
    return {
      ok: false,
      message:
        "Sonnet with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m",
      code: "unavailable_for_account",
    };
  }
  if (requestedModel) {
    let modelUnavailabilityReason = getModelUnavailabilityReason(requestedModel);
    if (modelUnavailabilityReason)
      switch (modelUnavailabilityReason.reason) {
        case "disabled":
          if (modelUnavailabilityReason.notOffered) {
            logFeatureBad("model_switch", "not_offered");
            return {
              ok: false,
              message: `Model '${displayModelName(requestedModel)}' is not available. ${sanitizeShortText(modelUnavailabilityReason.description)}`,
              code: "not_offered",
            };
          }
          logFeatureBad("model_switch", "disabled_by_org");
          return {
            ok: false,
            message:
              `Model '${displayModelName(requestedModel)}' is not currently available for your account. ${sanitizeShortText(modelUnavailabilityReason.description)}`.trimEnd(),
            code: "unavailable_for_account",
          };
        case "absent": {
          let validation = await validateModelWithDeadline(
            resolveAliasForProbe(requestedModel),
            {
              forceServerProbe: true,
              credentials: storageV5,
            },
            options?.deadlineMs,
          );
          let denialResult = neverDenied(validation, options);
          if (!validation.valid && !denialResult) {
            logFeatureBad("model_switch", validation.notFound ? "fable_unavailable" : "fable_probe_failed");
            let artifactPrefix = artifactPathPrefix("model");
            return {
              ok: false,
              message: validation.notFound
                ? `${modelUnavailabilityReason.displayName} isn't available for your account yet. ${artifactPrefix ? `Run ${artifactPrefix} to pick another model.` : "Switch to a different model."}`
                : validation.error,
              ...codeError(
                validation.notFound || validation.permissionDenied
                  ? "unavailable_for_account"
                  : classifyModelUnavailability(validation),
              ),
              ...(validation.serverRefusedModel === true &&
                notice === undefined && {
                  serverRefusedModel: true,
                }),
            };
          }
          if (validation.valid) fetchBootstrapData(session, storageV5);
          return {
            ok: true,
            model: isAliasSpelling(requestedModel) ? requestedModel.trim().toLowerCase() : requestedModel,
            ...(notice !== undefined && {
              substitutedFrom: notice,
            }),
            ...(denialResult && {
              unconfirmed: true,
            }),
          };
        }
      }
  }
  if (!requestedModel)
    return {
      ok: true,
      model: requestedModel,
    };
  if (isAliasSpelling(requestedModel))
    return {
      ok: true,
      model: requestedModel.trim().toLowerCase(),
    };
  try {
    let validation = await validateModelWithDeadline(
      requestedModel,
      {
        credentials: storageV5,
        ...(options?.confirmWithServer === false && {
          serverProbe: false,
        }),
      },
      options?.deadlineMs,
    );
    let modelNotice =
      !validation.valid &&
      validation.creditsRequired === true &&
      options?.acceptCreditsRequired === true &&
      ladderForDefaultModel(identity(requestedModel));
    let denialResult = neverDenied(validation, options);
    let artifactPrefix =
      !validation.valid &&
      validation.sharedLimitReached === true &&
      options?.acceptSharedLimitRefusal === true;
    if (!validation.valid && !modelNotice && !denialResult && !artifactPrefix) {
      logFeatureBad("model_switch", "invalid_model");
      return {
        ok: false,
        message: validation.error,
        ...codeError(classifyModelUnavailability(validation)),
        ...(validation.serverRefusedModel === true &&
          notice === undefined && {
            serverRefusedModel: true,
          }),
      };
    }
    return {
      ok: true,
      model: identity(requestedModel),
      ...(notice !== undefined && {
        substitutedFrom: notice,
      }),
      ...(!validation.valid &&
        modelNotice && {
          creditsRefusal: validation.error,
        }),
      ...(denialResult && {
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
//@ chunk-wefvmrb3.js:8206-8229 placement
function identity(value) {
  return value;
}
//@ chunk-wefvmrb3.js:8229-8966 placement
/**
 * 运行 PreModelSwitch 钩子决定 proceed/block（会话模型在钩子运行中变化时作废）。
 */
async function runPreModelSwitchHooks(session, readState, model, source, options = {}) {
  let state = readState();
  let effectiveModel = effectiveModelForContext(state);
  let candidates = planModeModelOf(state, model);
  if (candidates.length === 0)
    return {
      decision: "proceed",
      skipConfirm: false,
      messages: [],
    };
  let messages = [];
  let reason;
  let blocked = false;
  let allowed = true;
  for (let candidate of candidates) {
    let hookResult = await runPreModelSwitchHooks_2(
      session,
      {
        ...candidate,
        requestedModel: model,
        source,
      },
      {
        signal: options.signal,
      },
    );
    messages.push(...hookResult.messages);
    if (hookResult.decision === "block")
      return {
        decision: "block",
        reason: hookResult.reason,
        messages,
      };
    if (hookResult.decision === "ask") {
      blocked = true;
      reason ??= hookResult.reason;
    } else allowed = allowed && hookResult.skipConfirm;
  }
  if (effectiveModelForContext(readState()) !== effectiveModel) {
    if (options.revalidating)
      return {
        decision: "block",
        reason: "the session model changed while a PreModelSwitch hook was running; pick again",
        messages,
      };
    let retry = await runPreModelSwitchHooks(session, readState, model, source, {
      ...options,
      revalidating: true,
    });
    return {
      ...retry,
      messages: [...messages, ...retry.messages],
    };
  }
  return blocked
    ? {
        decision: "ask",
        reason,
        messages,
      }
    : {
        decision: "proceed",
        skipConfirm: allowed,
        messages,
      };
}
//@ chunk-wefvmrb3.js:8966-9204 placement
function planModeModelOf(state, currentModel) {
  let mainLoopModel = useMainLoopModel_2_2(state);
  let mode = state.toolPermissionContext.mode;
  let modes = [mode, mode === "plan" ? "default" : "plan"];
  let seen = new Set();
  let models = [];
  for (let mode of modes) {
    let effectiveModel = resolveEffectiveModel(mainLoopModel, mode);
    let effectiveModel_2 = resolveEffectiveModel(currentModel, mode);
    let key = `${effectiveModel}\x00${effectiveModel_2}`;
    if (effectiveModel !== effectiveModel_2 && !seen.has(key)) {
      seen.add(key);
      models.push({
        fromModel: effectiveModel,
        toModel: effectiveModel_2,
      });
    }
  }
  return models;
}
//@ chunk-wefvmrb3.js:9204-9425 placement
function describeModelSwitchBlocked(refusal) {
  return [
    `Model switch blocked by a PreModelSwitch hook${refusal.reason !== undefined ? `: ${sanitizeHookText(refusal.reason)}` : refusal.decision === "ask" ? ": confirmation required, and this session cannot ask" : ""}`,
    ...refusal.messages.map(sanitizeHookText),
  ].join(`
`);
}
//@ chunk-wefvmrb3.js:9425-9472 placement
/**
 * 净化来自钩子的文本：去不安全字符、换行替换、去尾部空白。
 */
function sanitizeHookText(text) {
  return replaceLineBreaks(stripUnsafeChars(truncateForDisplayText(text.trimEnd())));
}
//@ chunk-wefvmrb3.js:9472-9606 placement
/**
 * PreModelSwitch 钩子阻止切换模型时的提示文本（含钩子给出的原因与附加消息）。
 */
function preModelSwitchBlockedMessage(refusal, session, messages) {
  return [
    `Model switch to ${renderModelLabel(refusal)} was blocked by a PreModelSwitch hook${session ? `: ${sanitizeHookText(session)}` : ""}`,
    ...messages.map(sanitizeHookText),
  ].join(`
`);
}
//@ chunk-wefvmrb3.js:9606-10183 placement
async function saveModelSwitch(
  session,
  model,
  fastMode,
  setAppState,
  saveAsDefault,
  fastSession,
  credentials,
  storageV5,
  options,
) {
  let fastMode_2 = fastMode().fastMode;
  clearRefusalFallbackModelLatch();
  recordSwitchIfChanged(session, fastMode(), model, fastSession);
  setAppState((state) => ({
    ...state,
    mainLoopModel: model,
    mainLoopModelForSession: null,
  }));
  if (credentials !== undefined) logFeatureSad("model_switch", "family_alias_stepped_down");
  else logFeatureOk("model_switch");
  let nextFastMode = isFastModeEnabled() ? isFastModeActive(model, fastMode_2) : !!fastMode_2;
  if (isFastModeEnabled()) {
    clearFastModeCooldown();
    if (nextFastMode !== !!fastMode_2) {
      setAppState((state) => ({
        ...state,
        fastMode: nextFastMode,
      }));
      reportFastModeToggle(fastMode_2, nextFastMode);
    }
  }
  let saveResult = saveAsDefault ? await setDefaultModel(model, storageV5) : null;
  options?.(saveResult);
  let saved = saveResult?.kind === "saved";
  let notice = `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(model))}${saved ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
  notice += formatFastModeSuffix(fastMode_2, nextFastMode, model, {
    announceKeptOn: true,
  });
  notice += describeDefaultSaved(saveResult);
  notice += (saved ? anthropicModelEnvNotice(model) : "") || findModelSettingSource(model);
  let remoteResult = isRemoteSessionAvailable()
    ? null
    : buildUnknownModelNotice(resolveRequestedModel(model), fastMode().autoCompactWindow);
  if (remoteResult !== null)
    notice += `
${remoteResult.text}`;
  return notice;
}
//@ chunk-wefvmrb3.js:10183-10204 placement
/**
 * 设置默认模型的等待 3000ms 与模型列表刷新超时 15000ms。
 */
var SET_DEFAULT_MODEL_TIMEOUT_MS = 3000;
var MODEL_LIST_REFRESH_TIMEOUT_MS = 15000;
//@ chunk-wefvmrb3.js:10204-10561 placement
async function setDefaultModel(model, storageV5, timeoutMs = SET_DEFAULT_MODEL_TIMEOUT_MS) {
  let write = updateSettingsForSource(
    "userSettings",
    {
      model: model ?? undefined,
    },
    undefined,
    storageV5,
  );
  write.then((result) => (result.error ? undefined : classifyModelScope(model))).catch(() => {});
  let settled = await withDeadline(write, timeoutMs);
  if (settled === undefined) {
    logFeatureSad("model_set_default", "unconfirmed");
    return {
      kind: "unconfirmed",
    };
  }
  if (settled.error) {
    logFeatureBad("model_set_default", "write_failed");
    return {
      kind: "failed",
      error: settled.error,
    };
  }
  logFeatureOk("model_set_default");
  return {
    kind: "saved",
  };
}
//@ chunk-wefvmrb3.js:10561-10964 placement
function describeDefaultSaved(saved) {
  if (saved === null || saved.kind === "saved") return "";
  let path = tildify(getSettingsFilePathForSource("userSettings") ?? "settings.json");
  switch (saved.kind) {
    case "unconfirmed":
      return ` \xB7 couldn't confirm it was saved as your default (${path} is still being written)`;
    case "failed": {
      let cause = saved.error.cause;
      let detail =
        cause instanceof Error
          ? `can't be written (${getErrnoCode(cause) ?? sanitizeShortText(cause.message)})`
          : "isn't valid JSON";
      return ` \xB7 couldn't save it as your default: ${path} ${detail}`;
    }
  }
}
//@ chunk-wefvmrb3.js:10964-11146 placement
/**
 * ANTHROPIC_MODEL 环境变量设置了允许的模型且与当前选择不同时，提示新会话将使用该模型。
 */
function anthropicModelEnvNotice(userModel) {
  let ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
  if (!ANTHROPIC_MODEL || !isModelAllowed(ANTHROPIC_MODEL)) return "";
  if (!isDifferentModelSetting(userModel ?? getDefaultMainLoopModelSetting(), ANTHROPIC_MODEL)) return "";
  return dimWithCode(
    "ANTHROPIC_MODEL is set to ",
    renderModelSetting(ANTHROPIC_MODEL),
    " \u2014 new sessions use that while it is set",
  );
}
//@ chunk-wefvmrb3.js:11146-11279 placement
function isDifferentModelSetting(setting, model) {
  let userSpecifiedModel = parseUserSpecifiedModel(setting);
  let userSpecifiedModel_2 = parseUserSpecifiedModel(model);
  return (
    isModeDependentModelSetting(setting) ||
    getCanonicalName(userSpecifiedModel, {
      identity: true,
    }) !==
      getCanonicalName(userSpecifiedModel_2, {
        identity: true,
      }) ||
    /\[1m\]$/i.test(userSpecifiedModel) !== /\[1m\]$/i.test(userSpecifiedModel_2)
  );
}
//@ chunk-wefvmrb3.js:11279-11784 placement (2.1.88 match: updateSettingsForSource, 0.263)
function findModelSettingSource(setting) {
  let effectiveSettingSource = getEffectiveSettingSource("model");
  if (
    effectiveSettingSource !== "projectSettings" &&
    effectiveSettingSource !== "localSettings" &&
    effectiveSettingSource !== "policySettings"
  ) {
    let orgLockedDefaultModel = getOrgLockedDefaultModel();
    if (
      orgLockedDefaultModel !== null &&
      setting !== null &&
      effectiveSettingSource !== "flagSettings" &&
      !env.ANTHROPIC_MODEL &&
      isDifferentModelSetting(setting, orgLockedDefaultModel.model)
    )
      return renderOrgDefaultRestartNotice(orgLockedDefaultModel);
    return "";
  }
  if (effectiveSettingSource !== "policySettings") {
    let orgLockedDefaultModel = getOrgLockedDefaultModel();
    if (orgLockedDefaultModel !== null && !env.ANTHROPIC_MODEL) {
      if (setting === null) return "";
      if (isDifferentModelSetting(setting, orgLockedDefaultModel.model))
        return renderOrgDefaultRestartNotice(orgLockedDefaultModel);
      return "";
    }
  }
  let model = getSettingsForSource(effectiveSettingSource)?.model;
  if (model === undefined || setting === model) return "";
  let lockedByPolicy =
    effectiveSettingSource === "policySettings"
      ? "Managed settings"
      : getRelativeSettingsFilePathForSource(effectiveSettingSource);
  return dimWithCode(`${lockedByPolicy} pins `, renderModelSetting(model), " \u2014 that applies on restart");
}
//@ chunk-wefvmrb3.js:11784-11854 placement
function dimWithCode(name, code, suffix) {
  return `${sequential.dim(`
     ${name}`)}${toInlineCode(code)}${sequential.dim(suffix)}`;
}
//@ chunk-wefvmrb3.js:11854-12122 placement
/**
 * 组织默认模型在重启后生效的提示（org 或 standard）。
 */
function renderOrgDefaultRestartNotice(orgLockedDefaultModel) {
  let rendered = renderModelSetting(orgLockedDefaultModel.model);
  switch (orgLockedDefaultModel.kind) {
    case "org":
      return dimWithCode("Your organization's default (", rendered, ") applies on restart");
    case "standard":
      return dimWithCode(
        "Your organization's default model isn't available in this build, so the standard default (",
        rendered,
        ") applies on restart",
      );
  }
}
export {
  runPreModelSwitchHooks,
  describeModelSwitchBlocked,
  sanitizeHookText,
  preModelSwitchBlockedMessage,
  switchMainLoopModelSafe,
  MODEL_LIST_REFRESH_TIMEOUT_MS,
  setDefaultModel,
  describeDefaultSaved,
  saveModelSwitch,
  anthropicModelEnvNotice,
  findModelSettingSource,
};
