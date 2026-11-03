/**
 * cli/headlessCloud/attachDeviceBinding.ts
 *
 * 2.1.316 新增。附着远程会话时解析设备绑定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x1rd87x0.js (14)
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

//@ chunk-x1rd87x0.js:726-2064 placement
/**
 * 附着远程会话时解析设备绑定。
 */
async function resolveAttachDeviceBinding(e) {
  let i = e.session.then(
    (session) => ({
      read: true,
      session,
    }),
    (error) => ({
      read: false,
      error,
    }),
  );
  if (!(await (e.isEnabled ?? isDeviceIdentityEnabled)().catch(() => false)))
    return {
      status: "disabled",
    };
  let o = await i;
  if (!o.read) return attachBindingUnreadable("session_unreadable", o.error);
  if (o.session.archived)
    return {
      status: "disabled",
    };
  if (o.session.boundDeviceId === undefined) {
    let r = await (
      e.readUnboundCreateReason ??
      ((A) => unboundCreateReason(A, isKnownDeviceBindingRefusal, productionUnboundCreatesDeps(e.storageV5)))
    )(e.sessionId).catch(() => {
      return;
    });
    logEvent("tengu_device_bind_attach", {
      outcome: lit("session_unbound"),
      created_here: r !== undefined,
    });
    return r === undefined
      ? {
          status: "not_applicable",
        }
      : {
          status: "created_unbound",
          reason: r,
        };
  }
  let s;
  try {
    s = (e.isEgressAllowed ?? isDeviceBindingAllowed)();
  } catch {
    s = false;
  }
  if (!s) return unboundAtAttach("egress");
  let n = await (e.getAccount?.() ?? resolveCurrentDeviceBinding(e.credentials));
  if (n.status === "missing") return unboundAtAttach("account");
  if (n.status === "mismatch") return unboundAtAttach("account_mismatch");
  let l = await (
    e.loadLocalDevice?.(n.accountUuid) ?? resolveRegisteredDevice(n.accountUuid, e.credentials)
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
  if (!l.read) return attachBindingUnreadable("local_device_unreadable", l.error);
  if (l.held === undefined) return unboundAtAttach("no_device_here");
  let lower = l.held.rowPk.toLowerCase();
  if (lower !== o.session.boundDeviceId.toLowerCase()) return unboundAtAttach("other_device");
  let { toolHostLink } = o.session;
  logEvent("tengu_device_bind_attach", {
    outcome: lit("bound"),
    tool_host_link: fromEnum(toolHostLink),
  });
  logFeatureOk("device_bind_attach");
  return {
    status: "bound",
    deviceId: lower,
    held: l.held,
    toolHostLink,
  };
}
//@ chunk-x1rd87x0.js:2064-2220 placement
function sessionBindingFields(e) {
  return {
    archived: e.session_status === "archived",
    boundDeviceId: e.bound_device_uuid,
    toolHostLink: deviceBindingState(e.tool_host_status, e.device_bind_posture),
  };
}
//@ chunk-x1rd87x0.js:2220-2426 placement
async function rereadBoundDevice(
  e,
  { isEnabled: i = isDeviceIdentityEnabled, isEgressAllowed: o = isDeviceBindingAllowed } = {},
) {
  e.catch(() => {});
  if (!(await i().catch(() => false))) return;
  let { archived, boundDeviceId } = await e;
  if (archived) return;
  try {
    return o() ? boundDeviceId : undefined;
  } catch {
    return;
  }
}
//@ chunk-x1rd87x0.js:2426-2488 placement
function pullsBackToThisMachine(binding) {
  return binding.then(
    (i) => i.status === "bound",
    () => false,
  );
}
//@ chunk-x1rd87x0.js:2488-2574 placement
function boundDeviceOf(binding) {
  return binding.then(
    (i) => (i.status === "bound" ? i.deviceId : undefined),
    () => {
      return;
    },
  );
}
//@ chunk-x1rd87x0.js:2574-2656 placement
function boundDeviceKeyOf(binding) {
  return binding.then(
    (i) => (i.status === "bound" ? i.held : undefined),
    () => {
      return;
    },
  );
}
//@ chunk-x1rd87x0.js:2656-2785 placement
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
//@ chunk-x1rd87x0.js:2785-3058 placement
async function sessionStillBoundTo(e, i) {
  try {
    let o = await i();
    return (
      o.session_status !== "archived" &&
      typeof o.bound_device_uuid === "string" &&
      o.bound_device_uuid.toLowerCase() === e.toLowerCase()
    );
  } catch (error) {
    logForDebugging(
      `[attachBinding] re-reading the session's binding failed (keeping it): ${errorMessage(error)}`,
    );
    return;
  }
}
//@ chunk-x1rd87x0.js:3058-3561 placement
async function servedToolsForAttach({
  sessionId,
  binding,
  deviceBridge,
  onNotice,
  repositoryTrust,
  readSession,
}) {
  return (await import("./chunk-012rhzq5.js")).servedToolsAttachOptions({
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
        (v) => (v.status === "bound" ? sessionStillBoundTo(v.deviceId, readSession) : undefined),
        () => {
          return;
        },
      ),
    plumbing: (await import("./chunk-2s19t0f2.js")).servedSessionPlumbing(sessionId),
  });
}
//@ chunk-x1rd87x0.js:3561-3811 placement
var SETTINGS_NOT_KEPT_REFUSAL =
  "This session can run tools on this computer, so Claude Code must first keep a copy of this folder's settings, and it could not. Check free disk space and that ~/.claude/state can be written, then attach again; add --debug to see the cause.";
//@ chunk-x1rd87x0.js:3811-4706 placement
function keepSettingsBesideAHelper(e, i = {}) {
  let o = {
    status: "disabled",
  };
  let s = (u, p) => logForDebugging(`[remote-tools] ${u}: ${p}`);
  let n = [];
  let l = (u) => {
    let p = n ?? [];
    n = undefined;
    p.forEach(([_, D]) => {
      try {
        u(_, D);
      } catch {
        s(_, D);
      }
    });
  };
  let onNotice = i.onNotice ?? s;
  let h = false;
  let r;
  let A;
  let S = e
    .catch((error) => {
      logForDebugging(`[deviceBind] attach binding failed unexpectedly: ${errorMessage(error)}`);
      return o;
    })
    .then(async (u) => {
      if (u.status !== "bound" || isKnownBindingState(u.toolHostLink)) return u;
      if (h) return o;
      let p = i.loadHoldSettings
        ? await i.loadHoldSettings()
        : (await import("./chunk-xnr5zsa8.js")).holdSettingsBesideAHelper;
      if (h) return o;
      r = p((_, D) => (n ? void n.push([_, D]) : onNotice(_, D)));
      A = registerCleanup(async () => r?.end());
      l(onNotice);
      return u;
    });
  S.then(
    () => {
      if (r !== undefined) logFeatureOk("attach_settings_held_beside_helper");
    },
    (error) => {
      logFeatureBad("attach_settings_held_beside_helper", "hold_failed");
      l(s);
      logForDebugging(
        `[deviceBind] attach could not hold the settings beside the session's helper: ${errorMessage(error)}`,
      );
    },
  ).catch(() => {});
  return {
    binding: S.catch(() => o),
    kept: S.then(
      () => true,
      () => false,
    ),
    end: () => {
      h = true;
      A?.();
      r?.end();
    },
  };
}
//@ chunk-x1rd87x0.js:4706-5841 placement
function registerAttachedDevice(e) {
  let i = e.binding.catch((error) => {
    logForDebugging(`[deviceBind] attach binding failed unexpectedly: ${errorMessage(error)}`);
    return {
      status: "disabled",
    };
  });
  let o = false;
  let s;
  i.then((n) => {
    if (o || n.status !== "bound" || !isKnownBindingState(n.toolHostLink)) return;
    s = (e.startRegistration ?? startDeviceRegistration)({
      sessionId: e.sessionId,
      getAccessToken: e.getAccessToken,
      orgUuid: e.orgUuid,
      getDeviceId: () => n.deviceId,
      cloudClient: e.cloudClient,
      storageV5: e.storageV5,
      ...(e.dirSync !== undefined && {
        dirSync: e.dirSync,
      }),
      ...(e.folderRelation !== undefined && {
        folderRelation: e.folderRelation,
      }),
      ...(e.onNotice && {
        onNotice: e.onNotice,
      }),
      ...(e.servedSettingsChanged && {
        servedSettingsChanged: e.servedSettingsChanged,
      }),
      ...(e.deviceMcpQuestion && {
        deviceMcpQuestion: e.deviceMcpQuestion,
      }),
    });
  }).catch((error) => {
    logForDebugging(`[deviceBind] attach could not start the device registration: ${errorMessage(error)}`);
  });
  return {
    announceSettled: (n) => s?.announceSettled(n),
    serving: i.then(() => s?.serving),
    notice: i.then((n) =>
      n.status === "unbound"
        ? {
            text: isDeviceRevokedError(n.reason),
            toast: true,
          }
        : n.status === "created_unbound"
          ? {
              text: formatUnboundSessionNotice(n.reason),
              toast: true,
            }
          : n.status === "bound" && e.toolServingOn && !isKnownBindingState(n.toolHostLink)
            ? getDeviceBindingStatusNotice(n.toolHostLink)
            : undefined,
    ),
    stop: async () => {
      o = true;
      await s?.stop();
    },
    heldServedCall: (n) => s?.heldServedCall(n) ?? NOT_HELD_LEASE,
  };
}
//@ chunk-x1rd87x0.js:5841-5961 placement
function unboundAtAttach(e) {
  logEvent("tengu_device_bind_attach", {
    outcome: fromEnum(e),
  });
  logFeatureSad("device_bind_attach", e);
  return {
    status: "unbound",
    reason: e,
  };
}
//@ chunk-x1rd87x0.js:5961-6221 placement
/**
 * 附着时读不到会话绑定，记遥测并按未绑定处理
 */
function attachBindingUnreadable(e, error) {
  logEvent("tengu_device_bind_attach", {
    outcome: fromEnum(e),
  });
  if (e === "session_unreadable") logFeatureSad("device_bind_attach", e);
  else logFeatureBad("device_bind_attach", e);
  logForDebugging(`[deviceBind] attach could not check the session's binding (${e}): ${errorMessage(error)}`);
  return {
    status: "unbound",
    reason: e,
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
};
