/**
 * cli/print/proactivityControl.ts
 *
 * 2.1.316 新增：主动性等级的切换、启用与通知
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (14)
 * attribution: placement 14
 */
import { logError } from "../../utils/log.js";
import {
  wasProactivityEverOn,
  isProactivityActive,
  proactivityExclusionReason,
  BARE_ATTACHMENTS_REASON,
} from "../../Tool.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { onProactivitySelectorGateChanged } from "../../bootstrap/state.js";
import { trackProactivitySelectorGate } from "../startup/startupMisc.js";
import {
  computeProactivityModeTransition,
  setProactivityLevel as setProactivityLevel_2,
} from "../../utils/permissions/proactivityCycle.js";
import { DoctorLazy } from "../handlers/util.js";
import { objectSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { PROACTIVITY_MODES, isProactivityMode } from "../../utils/proactivityMode.js";
import { noop as noop_2 } from "../../keybindings/cycleModeBinding.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:86501-86559 placement
function safeCallback(onLate) {
  return (...args) => {
    try {
      onLate(...args);
    } catch (error) {
      logError(error);
    }
  };
}
//@ chunk-tyg7f3ek.js:86559-86650 placement
function notifyRequiresAction({ io, setAppState }, details) {
  io.sessionState.notifyStateChanged("requires_action", details);
}
//@ chunk-tyg7f3ek.js:86687-86752 placement
function proactivityStateStub({ proactivityLevel, toolPermissionContext }) {
  return;
}
//@ chunk-tyg7f3ek.js:86752-86830 placement
function notifyProactivityChanged(sessionState, state) {
  if (!wasProactivityEverOn()) return;
  sessionState.notifyMetadataChanged({
    proactivity: proactivityMetadata(state),
  });
}
//@ chunk-tyg7f3ek.js:86830-86907 placement
function proactivityMetadata(state) {
  if (!isProactivityActive()) return null;
  return (
    proactivityStateStub(state) ?? {
      level: state.proactivityLevel,
    }
  );
}
//@ chunk-tyg7f3ek.js:86907-86972 placement
function makePermissionModeReader(getState, notify) {
  return () => notify(toExternalPermissionMode(getState().toolPermissionContext.mode));
}
//@ chunk-tyg7f3ek.js:86972-87046 placement
function onProactivitySelectorChange(onChange) {
  return onProactivitySelectorGateChanged(() => {
    if (proactivityExclusionReason() === "session_excluded") return;
    onChange();
  });
}
//@ chunk-tyg7f3ek.js:87046-87439 placement
function applyProactivityOptIn({
  optIn,
  permissionModeSuppliedOnInvocation,
  attaching,
  planModeRestoredAtBoot,
  getAppState,
  setAppState,
}) {
  {
    let wasActive = isProactivityActive();
    trackProactivitySelectorGate(optIn);
    if (!isProactivityActive() || wasActive || attaching || planModeRestoredAtBoot) return;
    let proactivityLevel = getAppState().proactivityLevel;
    if (proactivityLevel === "default" || permissionModeSuppliedOnInvocation) return;
    setAppState((state) => {
      let proactivityModeTransition = computeProactivityModeTransition(
        proactivityLevel,
        state.toolPermissionContext,
        {
          offerBypass: false,
        },
      );
      return {
        ...state,
        toolPermissionContext: {
          ...proactivityModeTransition.context,
          mode: proactivityModeTransition.nextMode,
          startupModeDecidedByProactivityLevel: proactivityLevel,
        },
      };
    });
  }
}
//@ chunk-tyg7f3ek.js:87439-87471 placement
var proactivityLevelSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:87439", () => {
  proactivityLevelSchema = DoctorLazy(() =>
    objectSchema({
      level: _enum(PROACTIVITY_MODES),
    }),
  );
});
//@ chunk-tyg7f3ek.js:87471-87753 placement
function setProactivityLevel(proactivity, setAppState) {
  {
    trackProactivitySelectorGate(true);
    let parsed = proactivityLevelSchema().safeParse(proactivity);
    if (!parsed.success || noop_2() !== undefined) return false;
    let { level } = parsed.data;
    setAppState((state) =>
      state.proactivityLevel === level
        ? state
        : {
            ...state,
            proactivityLevel: level,
            toolPermissionContext: {
              ...state.toolPermissionContext,
              startupModeDecidedByProactivityLevel: undefined,
            },
          },
    );
    return true;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:87753-87844 placement
function notifyProactivityOptIn(sessionState, optIn, state) {
  sessionState.notifyInternalMetadataChanged({
    proactivity_opt_in: optIn ? true : null,
  });
  notifyProactivityChanged(sessionState, state);
}
//@ chunk-tyg7f3ek.js:87844-88853 placement
/**
 * SDK 请求切换主动性等级（proactivity）：会话被排除、未启用或等级非法时返回错误，可附带绕过权限选项。
 */
function cycleProactivityLevel(level, getState, setAppState, context, { offerBypass, cloudOptIn } = {}) {
  {
    let refuse = (reason, error) => {
      logFeatureBad("proactivity_cycle", reason);
      return {
        ok: false,
        error,
      };
    };
    if (proactivityExclusionReason() === "session_excluded")
      return refuse(
        "session_excluded",
        `Cannot set proactivity: levels are not enabled for this session \u2014 the session is excluded (${BARE_ATTACHMENTS_REASON()})`,
      );
    if (!isProactivityMode(level))
      return refuse(
        "invalid_level",
        `Cannot set proactivity: unrecognized level ${previewValue(level)} (expected one of ${PROACTIVITY_MODES.join(", ")})`,
      );
    if (offerBypass !== undefined && typeof offerBypass !== "boolean")
      return refuse(
        "invalid_offer_bypass",
        `Cannot set proactivity: offer_bypass must be a boolean when present (got ${previewValue(
          offerBypass,
          {
            quoteStrings: true,
          },
        )})`,
      );
    if (cloudOptIn && proactivityExclusionReason() === "gate_off") {
      trackProactivitySelectorGate(true);
      notifyProactivityOptIn(cloudOptIn, true, getState());
    }
    if (proactivityExclusionReason() === "gate_off")
      return refuse(
        "not_enabled",
        "Cannot set proactivity: levels are not enabled for this session (the host must send proactivity: true on initialize, with no kill switch set)",
      );
    setProactivityLevel_2(level, setAppState, context, {
      offerBypass: offerBypass ?? true,
    });
    let state = getState();
    return {
      ok: true,
      response: {
        level: state.proactivityLevel,
        permissionMode: toExternalPermissionMode(state.toolPermissionContext.mode),
      },
    };
  }
  return {
    ok: false,
    error: "Unsupported control request subtype",
  };
}
//@ chunk-tyg7f3ek.js:88853-88863 placement
var MAX_PROACTIVITY_REASON_CHARS = 64;
//@ chunk-tyg7f3ek.js:88863-89024 placement
function previewValue(value, { quoteStrings = false } = {}) {
  let text;
  if (typeof value === "string" && !quoteStrings) text = value;
  else
    try {
      text = jsonStringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  return text.length > MAX_PROACTIVITY_REASON_CHARS
    ? `${truncateToLength(text, MAX_PROACTIVITY_REASON_CHARS)}\u2026`
    : text;
}
export {
  notifyProactivityChanged,
  notifyRequiresAction,
  makePermissionModeReader,
  onProactivitySelectorChange,
  cycleProactivityLevel,
  proactivityStateStub,
  safeCallback,
  setProactivityLevel,
  proactivityMetadata,
  applyProactivityOptIn,
  notifyProactivityOptIn,
};
