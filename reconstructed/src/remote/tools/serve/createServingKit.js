/**
 * remote/tools/serve/createServingKit.ts
 *
 * 2.1.316 新增：远程工具服务套件（工具定义、输入结构、分组提供者）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (14)
 * attribution: placement 14
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { isDeepStrictEqual } from "util";
import { getAllBaseTools } from "../../../tools.js";
import { resolveServingPolicy } from "./servingPolicy.js";
import {
  remoteToolServingOffReason,
  isPersonFixableOffReason,
  callerSessionsLimit,
} from "../../../services/remoteTools/servingGates.js";
import { logEvent } from "../../../services/analytics/index.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { launchLocationFacts } from "../../../services/remoteTools/launchLocation.js";
import {
  SERVED_BASH_LAUNCHED_FROM_HOME,
  SERVED_BASH_FROM_HOME_NOTICE,
} from "../../../utils/hooks/servedHooks/notices.js";
import { servableTools, userSettingsErrorWatcher } from "./serveCall.js";
import { REMOTE_TOOLS } from "../../../services/remoteTools/remoteToolAdmission.js";
import { HB } from "../../../utils/teleport/dirSync.js";
import { logError } from "../../../utils/log.js";
import { toError } from "../../../utils/errors.js";
import { getOriginalCwd, getProjectRoot } from "../../../bootstrap/state.js";
import { createSignal } from "../../../utils/signal.js";
import {
  buildServingAnnouncement,
  admissionGateFor,
  folderRelationField,
  withSyncAtAttach,
  isSyncingFolder,
} from "./servingState.js";
import { writeServedCallLog } from "../servedCallLog.js";
import { registerPreExitFlush } from "../../../utils/cleanupRegistry.js";
import { sleep } from "../../../utils/sleep.js";
import { createCallerSessions } from "./pendingAsks.js";
import { createAbortController } from "../../../utils/abortController.js";
import { freezeServedSettings } from "./servedSettingsFreeze.js";
import {
  freeze_3,
  recordServedUserRulesAtAttach,
  getHeldServedOwnerSettings,
  N4r,
  hasUserSettingsChangedSinceAttach,
  SERVED_OWN_SETTINGS_WAITING,
} from "../servedOwnerSettings.js";
import { createAcceptedSettingsStore } from "../../../services/remoteTools/acceptedSettings.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";
import { r4s } from "../../../utils/hooks/servedHooks/hostPaths.js";
import { createServingReadiness } from "./servingReadiness.js";
import { saveSeenHookPins } from "../../../utils/hooks/servedHooks/hookPins.js";
import { isHostInventoryShared } from "./hostInventory.js";
import { callerKey } from "./servedShellSettings.js";
import { p5 } from "../../../services/remoteTools/lease.js";
import { splitHostField, $r } from "../../../bridge/deviceRegistration.js";
import { matchesApprovedCall } from "./sessionApprovals.js";
import { getToolRemoteExecution } from "../../../Tool.js";
import { ANTHROPIC_REMOTETOOLEXECUTION } from "../protocolSchemas.js";
import { zvn, sit } from "../protocolConstants.js";
import { admitServedCall } from "./callAdmission.js";
import { toolInputJsonSchema } from "../../../plugins/functionHooks/types/builtinToolSchemas.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { kt, T, pe, o, oe, A } from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-ad2e1aj6.js:80196-81783 placement
function remoteToolServingGroupProvider(e = {}) {
  let n = e.tools ?? getAllBaseTools,
    s = e.policy ?? resolveServingPolicy;
  return (h) => {
    let { registry: registry, getDeviceId: getDeviceId, onNotice: onNotice, serving: serving } = h,
      R = s(),
      w = serving !== void 0 ? serving.offReason : remoteToolServingOffReason();
    if (w !== void 0) {
      let Y = getDeviceId() !== void 0;
      if (
        (logEvent("tengu_remote_tool_serving", {
          event: lit("gate_off"),
          served_tool_count: 0,
          policy: fromEnum(R.name),
          reason: fromEnum(w),
          ...launchLocationFacts(w),
          bound: Y,
        }),
        Y && isPersonFixableOffReason(w))
      )
        onNotice?.(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
      return;
    }
    let C = h.servingKit.current === void 0,
      P = servingKitFor(h, { tools: n, policy: s }),
      x = () => {
        let Y = (ae) => {
          let mapped = servableTools(P.deps).map((V) => servedToolDefinition(V, P.deps, P.description));
          (registry.setGroup(REMOTE_TOOLS, mapped),
            logEvent("tengu_remote_tool_serving", {
              event: lit(ae),
              served_tool_count: mapped.length,
              policy: fromEnum(P.policy.name),
              project_sync: fromEnum(P.description.project_sync ?? "unknown"),
            }));
        };
        Y("announced");
        let F = !1,
          D,
          { attachSyncs: attachSyncs } = HB(),
          j = () => {
            if (P.description.project_sync !== "unknown" && !attachSyncs.concerns(h.sessionId))
              (D?.(), (D = void 0));
          },
          M,
          Q = (ae, fe) => {
            if (F) return;
            M = fe ?? M;
            let V = ae === "unknown" && attachSyncs.concerns(h.sessionId) ? "off" : ae;
            if (P.redescribe(V, M)) Y("redescribed");
            j();
          },
          ee = () => {
            if (
              F ||
              D !== void 0 ||
              (P.description.project_sync !== "unknown" && !attachSyncs.concerns(h.sessionId))
            )
              return;
            ((D = (e.watchProjectSync ?? gs)(h.sessionId, (ae) => Q(projectSyncDirection(ae)))), j());
          };
        if (h.dirSync instanceof Promise) {
          let ae = h.folderRelation?.catch(() => {
            return;
          });
          h.dirSync
            .then(
              (fe) => {
                if (!fe) {
                  if (ae === void 0) {
                    Q("off");
                    return;
                  }
                  return ae.then((V) => Q("off", V));
                }
                (Q(tn(h.sessionId)), ee());
              },
              () => Q("off"),
            )
            .catch((fe) => logError(toError(fe)));
        }
        ee();
        let onChanged = attachSyncs.onChanged(h.sessionId, () => {
          (Q(tn(h.sessionId)), ee());
        });
        return () => {
          ((F = !0),
            onChanged(),
            D?.(),
            P.dispose(),
            registry.setGroup(REMOTE_TOOLS, []),
            logEvent("tengu_remote_tool_serving", {
              event: lit("withdrawn"),
              served_tool_count: 0,
              policy: fromEnum(P.policy.name),
            }));
        };
      };
    try {
      return x();
    } catch (error) {
      if (C) P.dispose();
      throw error;
    }
  };
}
//@ chunk-ad2e1aj6.js:81783-82732 placement
function servingKitFor(e, n = {}) {
  let s = e.servingKit.current;
  if (s !== void 0) {
    if ((n.tools !== void 0 && n.tools !== s.tools) || (n.policy !== void 0 && n.policy !== s.policy))
      throw Error(
        "servingKitFor: a second tool group asked for a different tool set or policy than the kit was built with",
      );
    return s.kit;
  }
  let h = n.tools ?? getAllBaseTools,
    r = n.policy ?? resolveServingPolicy,
    i = createServingKit({
      sessionId: e.sessionId,
      limiter: e.limiter,
      getDeviceId: e.getDeviceId,
      onNotice: e.onNotice,
      tools: h,
      policy: r,
      ...(e.dirSync !== void 0 && { dirSync: e.dirSync }),
      ...(e.transport !== void 0 && { registrationTransport: e.transport }),
      ...(e.readiness !== void 0 && { readiness: e.readiness }),
      ...(e.hostInventory !== void 0 && { hostInventory: e.hostInventory }),
      ...(e.execution !== void 0 && { execution: e.execution }),
      ...(e.sandboxRequiredNow !== void 0 && { sandboxRequiredNow: e.sandboxRequiredNow }),
    }),
    y = {
      ...i,
      get description() {
        return i.description;
      },
      dispose: () => {
        if ((i.dispose(), e.servingKit.current?.kit === y)) e.servingKit.current = void 0;
      },
    };
  return ((e.servingKit.current = { kit: y, tools: h, policy: r }), y);
}
//@ chunk-ad2e1aj6.js:82732-82744 placement
var ps = 1000;
//@ chunk-ad2e1aj6.js:82744-86452 placement
function createServingKit(e) {
  let { limiter: limiter, onNotice: onNotice, sessionId: sessionId } = e,
    r = e.execution ?? { mode: "in_process" },
    i = e.tools ?? getAllBaseTools,
    y = (e.policy ?? resolveServingPolicy)(),
    O = e.launchDir ?? getOriginalCwd(),
    R = randomUUID(),
    w = createSignal(),
    deviceId = e.getDeviceId(),
    P = r.mode === "vm" ? r.copy : void 0,
    x = P === void 0 ? i() : P.tools(i()),
    { hostName: hostName } = e,
    F = buildServingAnnouncement({
      policy: y,
      launchDir: P?.workingDir ?? O,
      ...(hostName !== void 0 && { getHostname: () => hostName }),
      ...(P !== void 0
        ? { projectSync: "off", folderRelation: "separate_copy" }
        : {
            projectSync: e.dirSync === !1 ? "off" : tn(sessionId),
            syncRoot: HB().rootOf(sessionId),
            readyToSyncAtAttach: Lo(sessionId),
          }),
      epoch: R,
      ...(deviceId !== void 0 && { deviceId: deviceId }),
      servedToolNames: servableTools({ policy: y, tools: x }).map((te) => te.name),
      ...(e.hostInventory !== void 0 && { inventory: e.hostInventory }),
    });
  if (r.mode === "vm" && r.notes !== void 0) {
    let { shell: shell, inventory: inventory, ...me } = F;
    F = { ...me, notes: r.notes };
  }
  if (P !== void 0) {
    let { home_dir: home_dir, platform: platform, ...me } = F;
    F = {
      ...me,
      platform: P.platform,
      shell: P.shell,
      copy_of: { platform: platform, dir: O, ...(home_dir !== void 0 && { home_dir: home_dir }) },
    };
  }
  let D = writeServedCallLog({ epoch: R, targetName: F.name }),
    L =
      e.readsNoPriorCalls === !0
        ? {
            note: D.note,
            flush: D.flush,
            priorLoaded: !0,
            loadPrior: () => Promise.resolve(),
            priorCallsFor: () => [],
          }
        : D;
  registerPreExitFlush(() => Promise.race([L.flush(), sleep(ps, void 0, { unref: !0 })]));
  let j = createCallerSessions({ limit: callerSessionsLimit(), epoch: R, priorCallsFor: L.priorCallsFor }),
    M = createAbortController(),
    Q = new Set(),
    ee =
      onNotice === void 0
        ? void 0
        : (te, Re) => {
            if (!Q.has(te)) (Q.add(te), onNotice(te, Re));
          },
    q = new Map(),
    ae = new Map(),
    fe,
    V = !1,
    K = () => {
      if (!V && !M.signal.aborted) ((fe = freezeServedSettings(ee)), (V = !0));
    },
    Se = new Set(),
    ue = (te) => {
      if (fe?.hookWaiting !== !0 || Se.has(te)) return !1;
      return (Se.add(te), !0);
    },
    Z = freeze_3,
    X = !1,
    ce = !1,
    ge = new Set(),
    _e = (te) => {
      if (!ce || ge.has(te)) return !1;
      return (ge.add(te), !0);
    },
    we = () => {
      if (!V || X) return;
      X = !0;
      try {
        (recordServedUserRulesAtAttach(createAcceptedSettingsStore()), (Z = getHeldServedOwnerSettings()));
      } catch (error) {
        (logError(toError(error)), N4r(), (Z = { held: !0, settings: {}, took: "failed" }));
      }
      try {
        if (((ce = hasUserSettingsChangedSinceAttach(createAcceptedSettingsStore())), ce))
          ee?.(SERVED_OWN_SETTINGS_WAITING, REMOTE_TOOLS_CONSENT_TEXT["served_settings.own_waiting"]);
      } catch (error) {
        logError(toError(error));
      }
    };
  if (deviceId !== void 0) (K(), we());
  try {
    let te = r4s({ launchDir: O, projectDir: getProjectRoot(), originalCwd: getOriginalCwd() }),
      Re = {
        policy: y,
        targetName: F.name,
        ...(deviceId !== void 0 && { deviceId: deviceId }),
        launchDir: O,
        ...(P !== void 0 && { announcedDir: P.workingDir }),
        reach: te,
        ...(ee !== void 0 && { onNotice: ee }),
        ...(P === void 0 && { dirSyncOf: (me) => HB().syncOf(me) }),
        tools: x,
        gate: admissionGateFor(y, {
          limiter: limiter,
          getDeviceId: () => {
            let deviceId = e.getDeviceId();
            if (deviceId === void 0) return;
            try {
              K();
            } catch (error) {
              logError(toError(error));
              return;
            }
            return (we(), deviceId);
          },
          isModeCurrent: () => !0,
        }),
        sessions: j,
        ...(r.mode === "vm"
          ? { execution: { mode: "vm", availability: r.availability }, executor: r.executor }
          : { execution: r }),
        sandboxRequiredNow: e.sandboxRequiredNow ?? (() => !1),
        ownerSettingsLost: userSettingsErrorWatcher(),
        callLog: L,
        readiness: e.readiness ?? createServingReadiness(),
        lifetime: M.signal,
        servedMcpTools: () => q,
        servedMcpWireArguments: (me) => ae.get(me),
        userSettingsAtAttach: () => Z,
        sandboxTurnedOnByHeldFile: () => fe?.sandboxTurnedOn === !0,
        projectHookWaitingFor: ue,
        ownSettingsWaitingFor: _e,
        ...(e.registrationTransport !== void 0 && { registrationTransport: e.registrationTransport }),
      };
    if (Re.reach.projectHooks !== void 0) registerPreExitFlush(() => saveSeenHookPins(Re.reach));
    return {
      policy: y,
      get description() {
        if (F.inventory !== void 0 && !isHostInventoryShared()) {
          let { inventory: inventory, ...ke } = F;
          F = ke;
        }
        return F;
      },
      redescribe: (me, ke) => {
        if (P !== void 0) return !1;
        let Qe = folderRelationField(me, ke),
          je = withSyncAtAttach(F.capabilities ?? [], Lo(sessionId));
        if (
          me === F.project_sync &&
          Qe.folder_relation === F.folder_relation &&
          isDeepStrictEqual(je, F.capabilities ?? [])
        )
          return !1;
        let { sync_root: sync_root, folder_relation: folder_relation, capabilities: capabilities, ...Ie } = F,
          rootOf = HB().rootOf(sessionId);
        F = {
          ...Ie,
          project_sync: me,
          ...(rootOf !== void 0 && isSyncingFolder(me) && { sync_root: rootOf }),
          ...Qe,
          ...(je.length > 0 && { capabilities: je }),
        };
        try {
          w.emit();
        } catch (error) {
          logError(toError(error));
        }
        return !0;
      },
      onRedescribed: w.subscribe,
      ensureSettingsHeld: () => {
        if (e.getDeviceId() !== void 0) (K(), we());
      },
      deps: Re,
      setServedMcp: (me, ke) => {
        ((q = me), (ae = ke));
      },
      heldServedCall: (me) => {
        let heldAsk = j.heldAsk(callerKey({ sessionId: sessionId }), me.toolUseId);
        if (heldAsk === void 0) return p5;
        return splitHostField(me.input).requested === F.name &&
          matchesApprovedCall(heldAsk, me.toolName, me.input)
          ? { held: !0, startCwd: heldAsk.startCwd }
          : { held: !1, reason: "other_input" };
      },
      dispose: () => {
        (M.abort(), fe?.end(), saveSeenHookPins(Re.reach));
      },
    };
  } catch (error) {
    throw (fe?.end(), error);
  }
}
//@ chunk-ad2e1aj6.js:86452-86500 placement
function Lo(e) {
  return HB().attachSyncs.ready(e);
}
//@ chunk-ad2e1aj6.js:86500-86542 placement
function tn(e) {
  return projectSyncDirection(HB().stateOf(e));
}
//@ chunk-ad2e1aj6.js:86542-86587 placement
function gs(e, n) {
  return HB().watchState(e, n);
}
//@ chunk-ad2e1aj6.js:86587-86763 placement
function projectSyncDirection(e) {
  switch (e?.state) {
    case "armed":
      return e.direction === "pending" ? "unknown" : e.direction;
    case "off":
    case "stopped":
      return "off";
    case void 0:
    case "seeding":
      return "unknown";
  }
}
//@ chunk-ad2e1aj6.js:86763-86894 placement
function getRefusedInputFields(e, n) {
  if (e.refusedInputFields) return e.refusedInputFields(n);
  let s = getToolRemoteExecution(n);
  return s.supported ? (s.refusedInputFields ?? []) : [];
}
//@ chunk-ad2e1aj6.js:86894-87204 placement
function servedToolDefinition(e, n, s) {
  let h = getRefusedInputFields(n.policy, e);
  return {
    definition: {
      name: e.name,
      description: servedToolDescription(e, s),
      inputSchema: servedInputSchema(e, [...h, $r]),
      _meta: {
        [ANTHROPIC_REMOTETOOLEXECUTION]: {
          v: zvn,
          tool: e.name,
          refused_input_fields: h,
          target: s,
          protocol_versions: sit,
        },
      },
    },
    analyticsName: lit("remote_served_tool"),
    senderJudgedBy: "handler",
    call: (r, i) => admitServedCall(e.name, r, i, n, "bridge"),
  };
}
//@ chunk-ad2e1aj6.js:87204-87359 placement
function announcedToolFor(e, n, s) {
  let h = getRefusedInputFields(n.policy, e);
  return {
    name: e.name,
    refused_input_fields: h,
    protocol_versions: sit,
    description: servedToolDescription(e, s),
    input_schema: servedInputSchema(e, [...h, $r]),
  };
}
//@ chunk-ad2e1aj6.js:87359-87507 placement
function servedToolDescription(e, n) {
  return `Claude Code ${e.name} served by ${n.name} for its bound cloud session; called by that session's own routing, not directly.`;
}
//@ chunk-ad2e1aj6.js:87507-87777 placement
function servedInputSchema(e, n) {
  let safeParse = ys().safeParse(toolInputJsonSchema(e.inputSchema));
  if (!safeParse.success) throw Error("a served tool must have an object input schema");
  let { properties: properties, required: required } = safeParse.data,
    i = required?.filter((y) => !n.includes(y));
  return { type: "object", properties: Uo(properties, n), ...(i?.length && { required: i }) };
}
//@ chunk-ad2e1aj6.js:87777-87873 placement
var ys = DoctorLazy(() =>
  kt({ type: T("object"), properties: pe(o(), pe(o(), oe())), required: A(o()).optional() }),
);

export { createServingKit, announcedToolFor, servingKitFor };
