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
import { u, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { PROACTIVITY_MODES, isProactivityMode } from "../../utils/proactivityMode.js";
import { noop as noop_2 } from "../../keybindings/cycleModeBinding.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-tyg7f3ek.js:86501-86559 placement
function safeCallback(onLate) {
  return (...n) => {
    try {
      onLate(...n);
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
function notifyProactivityChanged(sessionState, n) {
  if (!wasProactivityEverOn()) return;
  sessionState.notifyMetadataChanged({
    proactivity: proactivityMetadata(n),
  });
}
//@ chunk-tyg7f3ek.js:86830-86907 placement
function proactivityMetadata(e) {
  if (!isProactivityActive()) return null;
  return (
    proactivityStateStub(e) ?? {
      level: e.proactivityLevel,
    }
  );
}
//@ chunk-tyg7f3ek.js:86907-86972 placement
function makePermissionModeReader(e, n) {
  return () => n(toExternalPermissionMode(e().toolPermissionContext.mode));
}
//@ chunk-tyg7f3ek.js:86972-87046 placement
function onProactivitySelectorChange(e) {
  return onProactivitySelectorGateChanged(() => {
    if (proactivityExclusionReason() === "session_excluded") return;
    e();
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
    let S = isProactivityActive();
    trackProactivitySelectorGate(optIn);
    if (!isProactivityActive() || S || attaching || planModeRestoredAtBoot) return;
    let proactivityLevel = getAppState().proactivityLevel;
    if (proactivityLevel === "default" || permissionModeSuppliedOnInvocation) return;
    setAppState((w) => {
      let proactivityModeTransition = computeProactivityModeTransition(
        proactivityLevel,
        w.toolPermissionContext,
        {
          offerBypass: false,
        },
      );
      return {
        ...w,
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
var proactivityLevelSchema = DoctorLazy(() =>
  u({
    level: _enum(PROACTIVITY_MODES),
  }),
);
//@ chunk-tyg7f3ek.js:87471-87753 placement
function setProactivityLevel(proactivity, setAppState) {
  {
    trackProactivitySelectorGate(true);
    let r = proactivityLevelSchema().safeParse(proactivity);
    if (!r.success || noop_2() !== undefined) return false;
    let { level } = r.data;
    setAppState((h) =>
      h.proactivityLevel === level
        ? h
        : {
            ...h,
            proactivityLevel: level,
            toolPermissionContext: {
              ...h.toolPermissionContext,
              startupModeDecidedByProactivityLevel: undefined,
            },
          },
    );
    return true;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:87753-87844 placement
function notifyProactivityOptIn(e, n, r) {
  e.notifyInternalMetadataChanged({
    proactivity_opt_in: n ? true : null,
  });
  notifyProactivityChanged(e, r);
}
//@ chunk-tyg7f3ek.js:87844-88853 placement
/**
 * SDK 请求切换主动性等级（proactivity）：会话被排除、未启用或等级非法时返回错误，可附带绕过权限选项。
 */
function cycleProactivityLevel(level, n, r, storageV5, { offerBypass: h, cloudOptIn: y } = {}) {
  {
    let S = (w, error) => {
      logFeatureBad("proactivity_cycle", w);
      return {
        ok: false,
        error,
      };
    };
    if (proactivityExclusionReason() === "session_excluded")
      return S(
        "session_excluded",
        `Cannot set proactivity: levels are not enabled for this session \u2014 the session is excluded (${BARE_ATTACHMENTS_REASON()})`,
      );
    if (!isProactivityMode(level))
      return S(
        "invalid_level",
        `Cannot set proactivity: unrecognized level ${previewValue(level)} (expected one of ${PROACTIVITY_MODES.join(", ")})`,
      );
    if (h !== undefined && typeof h !== "boolean")
      return S(
        "invalid_offer_bypass",
        `Cannot set proactivity: offer_bypass must be a boolean when present (got ${previewValue(h, {
          quoteStrings: true,
        })})`,
      );
    if (y && proactivityExclusionReason() === "gate_off") {
      trackProactivitySelectorGate(true);
      notifyProactivityOptIn(y, true, n());
    }
    if (proactivityExclusionReason() === "gate_off")
      return S(
        "not_enabled",
        "Cannot set proactivity: levels are not enabled for this session (the host must send proactivity: true on initialize, with no kill switch set)",
      );
    setProactivityLevel_2(level, r, storageV5, {
      offerBypass: h ?? true,
    });
    let R = n();
    return {
      ok: true,
      response: {
        level: R.proactivityLevel,
        permissionMode: toExternalPermissionMode(R.toolPermissionContext.mode),
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
function previewValue(e, { quoteStrings: n = false } = {}) {
  let r;
  if (typeof e === "string" && !n) r = e;
  else
    try {
      r = jsonStringify(e) ?? String(e);
    } catch {
      r = String(e);
    }
  return r.length > MAX_PROACTIVITY_REASON_CHARS
    ? `${truncateToLength(r, MAX_PROACTIVITY_REASON_CHARS)}\u2026`
    : r;
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
