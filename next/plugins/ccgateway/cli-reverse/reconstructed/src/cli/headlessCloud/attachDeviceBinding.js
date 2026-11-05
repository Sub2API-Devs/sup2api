/**
 * cli/headlessCloud/attachDeviceBinding.ts
 *
 * 2.1.316 新增。附着远程会话时解析设备绑定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7er3h6tn.js (14)
 * attribution: placement 14
 */
import { isDeviceIdentityEnabled } from "../../services/analytics/violinGates.js";
import { unboundCreateReason, productionUnboundCreatesDeps } from "../../bridge/deviceUnboundCreates.js";
import {
  isKnownDeviceBindingRefusal,
  isDeviceRevokedError,
  formatUnboundSessionNotice,
  getDeviceBindingStatusNotice,
} from "../../bridge/deviceBinding.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isDeviceBindingAllowed } from "../../bridge/deviceBindingPolicy.js";
import { resolveCurrentDeviceBinding } from "../../bridge/deviceBindingRecord.js";
import { resolveRegisteredDevice } from "../../bridge/deviceRegistry.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { deviceBindingState, isKnownBindingState } from "../../bridge/deviceBindingState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { startDeviceRegistration } from "../../services/deviceBridge/deviceRegistrationSocket.js";
import { NOT_HELD_LEASE } from "../../services/remoteTools/lease.js";

//@ chunk-7er3h6tn.js:727-2066 placement
/**
 * 附着远程会话时解析设备绑定。
 */
async function resolveAttachDeviceBinding(options) {
  let sessionResult = options.session.then(
    (session) => ({
      read: true,
      session,
    }),
    (error) => ({
      read: false,
      error,
    }),
  );
  if (!(await (options.isEnabled ?? isDeviceIdentityEnabled)().catch(() => false)))
    return {
      status: "disabled",
    };
  let loaded = await sessionResult;
  if (!loaded.read) return attachBindingUnreadable("session_unreadable", loaded.error);
  if (loaded.session.archived)
    return {
      status: "disabled",
    };
  if (loaded.session.boundDeviceId === undefined) {
    let unboundReason = await (
      options.readUnboundCreateReason ??
      ((sessionId) =>
        unboundCreateReason(
          sessionId,
          isKnownDeviceBindingRefusal,
          productionUnboundCreatesDeps(options.storageV5),
        ))
    )(options.sessionId).catch(() => {
      return;
    });
    logEvent("tengu_device_bind_attach", {
      outcome: lit("session_unbound"),
      created_here: unboundReason !== undefined,
    });
    return unboundReason === undefined
      ? {
          status: "not_applicable",
        }
      : {
          status: "created_unbound",
          reason: unboundReason,
        };
  }
  let isEgressAllowed;
  try {
    isEgressAllowed = (options.isEgressAllowed ?? isDeviceBindingAllowed)();
  } catch {
    isEgressAllowed = false;
  }
  if (!isEgressAllowed) return unboundAtAttach("egress");
  let account = await (options.getAccount?.() ?? resolveCurrentDeviceBinding(options.credentials));
  if (account.status === "missing") return unboundAtAttach("account");
  if (account.status === "mismatch") return unboundAtAttach("account_mismatch");
  let localDevice = await (
    options.loadLocalDevice?.(account.accountUuid) ??
    resolveRegisteredDevice(account.accountUuid, options.credentials)
  ).then(
    (held) => ({
      read: true,
      held,
    }),
    (error) => ({
      read: false,
      error,
    }),
  );
  if (!localDevice.read) return attachBindingUnreadable("local_device_unreadable", localDevice.error);
  if (localDevice.held === undefined) return unboundAtAttach("no_device_here");
  let lower = localDevice.held.rowPk.toLowerCase();
  if (lower !== loaded.session.boundDeviceId.toLowerCase()) return unboundAtAttach("other_device");
  let { toolHostLink } = loaded.session;
  logEvent("tengu_device_bind_attach", {
    outcome: lit("bound"),
    tool_host_link: fromEnum(toolHostLink),
  });
  logFeatureOk("device_bind_attach");
  return {
    status: "bound",
    deviceId: lower,
    held: localDevice.held,
    toolHostLink,
  };
}
//@ chunk-7er3h6tn.js:2066-2222 placement
function sessionBindingFields(session) {
  return {
    archived: session.session_status === "archived",
    boundDeviceId: session.bound_device_uuid,
    toolHostLink: deviceBindingState(session.tool_host_status, session.device_bind_posture),
  };
}
//@ chunk-7er3h6tn.js:2222-2428 placement
async function rereadBoundDevice(
  sessionPromise,
  { isEnabled = isDeviceIdentityEnabled, isEgressAllowed = isDeviceBindingAllowed } = {},
) {
  sessionPromise.catch(() => {});
  if (!(await isEnabled().catch(() => false))) return;
  let { archived, boundDeviceId } = await sessionPromise;
  if (archived) return;
  try {
    return isEgressAllowed() ? boundDeviceId : undefined;
  } catch {
    return;
  }
}
//@ chunk-7er3h6tn.js:2428-2490 placement
function pullsBackToThisMachine(binding) {
  return binding.then(
    (binding) => binding.status === "bound",
    () => false,
  );
}
//@ chunk-7er3h6tn.js:2490-2576 placement
function boundDeviceOf(binding) {
  return binding.then(
    (binding) => (binding.status === "bound" ? binding.deviceId : undefined),
    () => {
      return;
    },
  );
}
//@ chunk-7er3h6tn.js:2576-2658 placement
function boundDeviceKeyOf(binding) {
  return binding.then(
    (binding) => (binding.status === "bound" ? binding.held : undefined),
    () => {
      return;
    },
  );
}
//@ chunk-7er3h6tn.js:2658-2787 placement
function getBindingOwnership({ viewerOnly, binding }) {
  return !viewerOnly && binding.status === "bound" && isKnownBindingState(binding.toolHostLink)
    ? {
        owner: true,
        deviceId: binding.deviceId,
      }
    : {
        owner: false,
      };
}
//@ chunk-7er3h6tn.js:2787-3060 placement
async function sessionStillBoundTo(deviceId, readSession) {
  try {
    let session = await readSession();
    return (
      session.session_status !== "archived" &&
      typeof session.bound_device_uuid === "string" &&
      session.bound_device_uuid.toLowerCase() === deviceId.toLowerCase()
    );
  } catch (error) {
    logForDebugging(
      `[attachBinding] re-reading the session's binding failed (keeping it): ${errorMessage(error)}`,
    );
    return;
  }
}
//@ chunk-7er3h6tn.js:3060-3563 placement
async function servedToolsForAttach({
  sessionId,
  binding,
  deviceBridge,
  onNotice,
  repositoryTrust,
  readSession,
}) {
  return (await import("../../remote/tools/servedToolsAttachOptions.lazy.js")).servedToolsAttachOptions({
    owner: binding.then(
      (binding) => {
        let bindingOwnership = getBindingOwnership({
          viewerOnly: false,
          binding,
        });
        return () => bindingOwnership;
      },
      () => () => ({
        owner: false,
      }),
    ),
    cloudClient: true,
    ...(deviceBridge && {
      deviceBridge,
    }),
    ...(onNotice && {
      onNotice,
    }),
    ...(repositoryTrust && {
      repositoryTrust,
    }),
    stillBound: () =>
      binding.then(
        (bindingState) =>
          bindingState.status === "bound"
            ? sessionStillBoundTo(bindingState.deviceId, readSession)
            : undefined,
        () => {
          return;
        },
      ),
    plumbing: (
      await import("../../services/remoteTools/servedSessionPlumbing.lazy.js")
    ).servedSessionPlumbing(sessionId),
  });
}
//@ chunk-7er3h6tn.js:3563-3813 placement
var SETTINGS_NOT_KEPT_REFUSAL =
  "This session can run tools on this computer, so Claude Code must first keep a copy of this folder's settings, and it could not. Check free disk space and that ~/.claude/state can be written, then attach again; add --debug to see the cause.";
//@ chunk-7er3h6tn.js:3813-4708 placement
function keepSettingsBesideAHelper(bindingPromise, options = {}) {
  let disabledStatus = {
    status: "disabled",
  };
  let debugLog = (what, detail) => logForDebugging(`[remote-tools] ${what}: ${detail}`);
  let pendingNotices = [];
  let flushNotices = (notify) => {
    let queued = pendingNotices ?? [];
    pendingNotices = undefined;
    queued.forEach(([message, kind]) => {
      try {
        notify(message, kind);
      } catch {
        debugLog(message, kind);
      }
    });
  };
  let onNotice = options.onNotice ?? debugLog;
  let isEnded = false;
  let hold;
  let cleanup;
  let keptPromise = bindingPromise
    .catch((error) => {
      logForDebugging(`[deviceBind] attach binding failed unexpectedly: ${errorMessage(error)}`);
      return disabledStatus;
    })
    .then(async (bindingState) => {
      if (bindingState.status !== "bound" || isKnownBindingState(bindingState.toolHostLink))
        return bindingState;
      if (isEnded) return disabledStatus;
      let holdSettings = options.loadHoldSettings
        ? await options.loadHoldSettings()
        : (await import("../../utils/settings/holdSettingsBesideAHelper.lazy.js")).holdSettingsBesideAHelper;
      if (isEnded) return disabledStatus;
      hold = holdSettings((message, kind) =>
        pendingNotices ? void pendingNotices.push([message, kind]) : onNotice(message, kind),
      );
      cleanup = registerCleanup(async () => hold?.end());
      flushNotices(onNotice);
      return bindingState;
    });
  keptPromise
    .then(
      () => {
        if (hold !== undefined) logFeatureOk("attach_settings_held_beside_helper");
      },
      (error) => {
        logFeatureBad("attach_settings_held_beside_helper", "hold_failed");
        flushNotices(debugLog);
        logForDebugging(
          `[deviceBind] attach could not hold the settings beside the session's helper: ${errorMessage(error)}`,
        );
      },
    )
    .catch(() => {});
  return {
    binding: keptPromise.catch(() => disabledStatus),
    kept: keptPromise.then(
      () => true,
      () => false,
    ),
    end: () => {
      isEnded = true;
      cleanup?.();
      hold?.end();
    },
  };
}
//@ chunk-7er3h6tn.js:4708-5843 placement
function registerAttachedDevice(options) {
  let started = options.binding.catch((error) => {
    logForDebugging(`[deviceBind] attach binding failed unexpectedly: ${errorMessage(error)}`);
    return {
      status: "disabled",
    };
  });
  let isStopped = false;
  let registration;
  started
    .then((value) => {
      if (isStopped || value.status !== "bound" || !isKnownBindingState(value.toolHostLink)) return;
      registration = (options.startRegistration ?? startDeviceRegistration)({
        sessionId: options.sessionId,
        getAccessToken: options.getAccessToken,
        orgUuid: options.orgUuid,
        getDeviceId: () => value.deviceId,
        cloudClient: options.cloudClient,
        storageV5: options.storageV5,
        ...(options.dirSync !== undefined && {
          dirSync: options.dirSync,
        }),
        ...(options.folderRelation !== undefined && {
          folderRelation: options.folderRelation,
        }),
        ...(options.onNotice && {
          onNotice: options.onNotice,
        }),
        ...(options.servedSettingsChanged && {
          servedSettingsChanged: options.servedSettingsChanged,
        }),
        ...(options.deviceMcpQuestion && {
          deviceMcpQuestion: options.deviceMcpQuestion,
        }),
      });
    })
    .catch((error) => {
      logForDebugging(`[deviceBind] attach could not start the device registration: ${errorMessage(error)}`);
    });
  return {
    announceSettled: (settled) => registration?.announceSettled(settled),
    serving: started.then(() => registration?.serving),
    notice: started.then((bindingState) =>
      bindingState.status === "unbound"
        ? {
            text: isDeviceRevokedError(bindingState.reason),
            toast: true,
          }
        : bindingState.status === "created_unbound"
          ? {
              text: formatUnboundSessionNotice(bindingState.reason),
              toast: true,
            }
          : bindingState.status === "bound" &&
              options.toolServingOn &&
              !isKnownBindingState(bindingState.toolHostLink)
            ? getDeviceBindingStatusNotice(bindingState.toolHostLink)
            : undefined,
    ),
    stop: async () => {
      isStopped = true;
      await registration?.stop();
    },
    heldServedCall: (call) => registration?.heldServedCall(call) ?? NOT_HELD_LEASE,
  };
}
//@ chunk-7er3h6tn.js:5843-5963 placement
function unboundAtAttach(reason) {
  logEvent("tengu_device_bind_attach", {
    outcome: fromEnum(reason),
  });
  logFeatureSad("device_bind_attach", reason);
  return {
    status: "unbound",
    reason,
  };
}
//@ chunk-7er3h6tn.js:5963-6223 placement
/**
 * 附着时读不到会话绑定，记遥测并按未绑定处理
 */
function attachBindingUnreadable(reason, error) {
  logEvent("tengu_device_bind_attach", {
    outcome: fromEnum(reason),
  });
  if (reason === "session_unreadable") logFeatureSad("device_bind_attach", reason);
  else logFeatureBad("device_bind_attach", reason);
  logForDebugging(
    `[deviceBind] attach could not check the session's binding (${reason}): ${errorMessage(error)}`,
  );
  return {
    status: "unbound",
    reason,
  };
}
export {
  sessionStillBoundTo,
  resolveAttachDeviceBinding,
  sessionBindingFields,
  keepSettingsBesideAHelper,
  boundDeviceKeyOf,
  pullsBackToThisMachine,
  boundDeviceOf,
  registerAttachedDevice,
  SETTINGS_NOT_KEPT_REFUSAL,
  rereadBoundDevice,
  servedToolsForAttach,
};
