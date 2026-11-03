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
import { randomUUID } from "crypto";
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
import { dirSyncSession } from "../../../utils/teleport/dirSync.js";
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
  fti,
  recordServedUserRulesAtAttach,
  getHeldServedOwnerSettings,
  keepEmptyOwnerSettings,
  hasUserSettingsChangedSinceAttach,
  SERVED_OWN_SETTINGS_WAITING,
} from "../servedOwnerSettings.js";
import { createAcceptedSettingsStore } from "../../../services/remoteTools/acceptedSettings.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";
import { createHostPathReach } from "../../../utils/hooks/servedHooks/hostPaths.js";
import { createServingReadiness } from "./servingReadiness.js";
import { saveSeenHookPins } from "../../../utils/hooks/servedHooks/hookPins.js";
import { isHostInventoryShared } from "./hostInventory.js";
import { callerKey } from "./servedShellSettings.js";
import { NOT_HELD_LEASE } from "../../../services/remoteTools/lease.js";
import { splitHostField, HOST_TOOL_INPUT_FIELD } from "../../../bridge/deviceRegistration.js";
import { matchesApprovedCall } from "./sessionApprovals.js";
import { getToolRemoteExecution } from "../../../Tool.js";
import { ANTHROPIC_REMOTETOOLEXECUTION } from "../protocolSchemas.js";
import { CURRENT_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from "../protocolConstants.js";
import { admitServedCall } from "./callAdmission.js";
import { toolInputJsonSchema } from "../../../plugins/functionHooks/types/builtinToolSchemas.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  looseObject,
  literal,
  record,
  string,
  unknown,
  array,
} from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-ad2e1aj6.js:80196-81783 placement
function remoteToolServingGroupProvider(e = {}) {
  let tools = e.tools ?? getAllBaseTools;
  let policy = e.policy ?? resolveServingPolicy;
  return (h) => {
    let { registry, getDeviceId, onNotice, serving } = h;
    let R = policy();
    let w = serving !== undefined ? serving.offReason : remoteToolServingOffReason();
    if (w !== undefined) {
      let Y = getDeviceId() !== undefined;
      logEvent("tengu_remote_tool_serving", {
        event: lit("gate_off"),
        served_tool_count: 0,
        policy: fromEnum(R.name),
        reason: fromEnum(w),
        ...launchLocationFacts(w),
        bound: Y,
      });
      if (Y && isPersonFixableOffReason(w))
        onNotice?.(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
      return;
    }
    let C = h.servingKit.current === undefined;
    let P = servingKitFor(h, {
      tools,
      policy,
    });
    let x = () => {
      let Y = (ae) => {
        let mapped = servableTools(P.deps).map((V) => servedToolDefinition(V, P.deps, P.description));
        registry.setGroup(REMOTE_TOOLS, mapped);
        logEvent("tengu_remote_tool_serving", {
          event: lit(ae),
          served_tool_count: mapped.length,
          policy: fromEnum(P.policy.name),
          project_sync: fromEnum(P.description.project_sync ?? "unknown"),
        });
      };
      Y("announced");
      let F = false;
      let D;
      let { attachSyncs } = dirSyncSession();
      let j = () => {
        if (P.description.project_sync !== "unknown" && !attachSyncs.concerns(h.sessionId)) {
          D?.();
          D = undefined;
        }
      };
      let M;
      let Q = (ae, fe) => {
        if (F) return;
        M = fe ?? M;
        let V = ae === "unknown" && attachSyncs.concerns(h.sessionId) ? "off" : ae;
        if (P.redescribe(V, M)) Y("redescribed");
        j();
      };
      let ee = () => {
        if (
          F ||
          D !== undefined ||
          (P.description.project_sync !== "unknown" && !attachSyncs.concerns(h.sessionId))
        )
          return;
        D = (e.watchProjectSync ?? watchProjectSyncState)(h.sessionId, (ae) => Q(projectSyncDirection(ae)));
        j();
      };
      if (h.dirSync instanceof Promise) {
        let ae = h.folderRelation?.catch(() => {
          return;
        });
        h.dirSync
          .then(
            (fe) => {
              if (!fe) {
                if (ae === undefined) {
                  Q("off");
                  return;
                }
                return ae.then((V) => Q("off", V));
              }
              Q(projectSyncDirectionOf(h.sessionId));
              ee();
            },
            () => Q("off"),
          )
          .catch((error) => logError(toError(error)));
      }
      ee();
      let q = attachSyncs.onChanged(h.sessionId, () => {
        Q(projectSyncDirectionOf(h.sessionId));
        ee();
      });
      return () => {
        F = true;
        q();
        D?.();
        P.dispose();
        registry.setGroup(REMOTE_TOOLS, []);
        logEvent("tengu_remote_tool_serving", {
          event: lit("withdrawn"),
          served_tool_count: 0,
          policy: fromEnum(P.policy.name),
        });
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
  if (s !== undefined) {
    if ((n.tools !== undefined && n.tools !== s.tools) || (n.policy !== undefined && n.policy !== s.policy))
      throw Error(
        "servingKitFor: a second tool group asked for a different tool set or policy than the kit was built with",
      );
    return s.kit;
  }
  let tools = n.tools ?? getAllBaseTools;
  let policy = n.policy ?? resolveServingPolicy;
  let servingKit = createServingKit({
    sessionId: e.sessionId,
    limiter: e.limiter,
    getDeviceId: e.getDeviceId,
    onNotice: e.onNotice,
    tools,
    policy,
    ...(e.dirSync !== undefined && {
      dirSync: e.dirSync,
    }),
    ...(e.transport !== undefined && {
      registrationTransport: e.transport,
    }),
    ...(e.readiness !== undefined && {
      readiness: e.readiness,
    }),
    ...(e.hostInventory !== undefined && {
      hostInventory: e.hostInventory,
    }),
    ...(e.execution !== undefined && {
      execution: e.execution,
    }),
    ...(e.sandboxRequiredNow !== undefined && {
      sandboxRequiredNow: e.sandboxRequiredNow,
    }),
  });
  let y = {
    ...servingKit,
    get description() {
      return servingKit.description;
    },
    dispose: () => {
      servingKit.dispose();
      if (e.servingKit.current?.kit === y) e.servingKit.current = undefined;
    },
  };
  e.servingKit.current = {
    kit: y,
    tools,
    policy,
  };
  return y;
}
//@ chunk-ad2e1aj6.js:82732-82744 placement
var PRE_EXIT_FLUSH_TIMEOUT_MS = 1000;
//@ chunk-ad2e1aj6.js:82744-86452 placement
function createServingKit(e) {
  let { limiter, onNotice, sessionId } = e;
  let r = e.execution ?? {
    mode: "in_process",
  };
  let tools = e.tools ?? getAllBaseTools;
  let y = (e.policy ?? resolveServingPolicy)();
  let O = e.launchDir ?? getOriginalCwd();
  let epoch = randomUUID();
  let signal = createSignal();
  let deviceId = e.getDeviceId();
  let copy = r.mode === "vm" ? r.copy : undefined;
  let tools_2 = copy === undefined ? tools() : copy.tools(tools());
  let { hostName } = e;
  let servingAnnouncement = buildServingAnnouncement({
    policy: y,
    launchDir: copy?.workingDir ?? O,
    ...(hostName !== undefined && {
      getHostname: () => hostName,
    }),
    ...(copy !== undefined
      ? {
          projectSync: "off",
          folderRelation: "separate_copy",
        }
      : {
          projectSync: e.dirSync === false ? "off" : projectSyncDirectionOf(sessionId),
          syncRoot: dirSyncSession().rootOf(sessionId),
          readyToSyncAtAttach: syncReadyAtAttach(sessionId),
        }),
    epoch,
    ...(deviceId !== undefined && {
      deviceId,
    }),
    servedToolNames: servableTools({
      policy: y,
      tools: tools_2,
    }).map((te) => te.name),
    ...(e.hostInventory !== undefined && {
      inventory: e.hostInventory,
    }),
  });
  if (r.mode === "vm" && r.notes !== undefined) {
    let { shell, inventory, ...me } = servingAnnouncement;
    servingAnnouncement = {
      ...me,
      notes: r.notes,
    };
  }
  if (copy !== undefined) {
    let { home_dir: homeDir, platform, ...me } = servingAnnouncement;
    servingAnnouncement = {
      ...me,
      platform: copy.platform,
      shell: copy.shell,
      copy_of: {
        platform,
        dir: O,
        ...(homeDir !== undefined && {
          home_dir: homeDir,
        }),
      },
    };
  }
  let D = writeServedCallLog({
    epoch,
    targetName: servingAnnouncement.name,
  });
  let L =
    e.readsNoPriorCalls === true
      ? {
          note: D.note,
          flush: D.flush,
          priorLoaded: true,
          loadPrior: () => Promise.resolve(),
          priorCallsFor: () => [],
        }
      : D;
  registerPreExitFlush(() =>
    Promise.race([
      L.flush(),
      sleep(PRE_EXIT_FLUSH_TIMEOUT_MS, undefined, {
        unref: true,
      }),
    ]),
  );
  let callerSessions = createCallerSessions({
    limit: callerSessionsLimit(),
    epoch,
    priorCallsFor: L.priorCallsFor,
  });
  let abortController = createAbortController();
  let Q = new Set();
  let ee =
    onNotice === undefined
      ? undefined
      : (te, Re) => {
          if (!Q.has(te)) {
            Q.add(te);
            onNotice(te, Re);
          }
        };
  let q = new Map();
  let ae = new Map();
  let fe;
  let V = false;
  let K = () => {
    if (!V && !abortController.signal.aborted) {
      fe = freezeServedSettings(ee);
      V = true;
    }
  };
  let Se = new Set();
  let projectHookWaitingFor = (te) => {
    if (fe?.hookWaiting !== true || Se.has(te)) return false;
    Se.add(te);
    return true;
  };
  let Z = fti;
  let X = false;
  let ce = false;
  let ge = new Set();
  let ownSettingsWaitingFor = (te) => {
    if (!ce || ge.has(te)) return false;
    ge.add(te);
    return true;
  };
  let we = () => {
    if (!V || X) return;
    X = true;
    try {
      recordServedUserRulesAtAttach(createAcceptedSettingsStore());
      Z = getHeldServedOwnerSettings();
    } catch (error) {
      logError(toError(error));
      keepEmptyOwnerSettings();
      Z = {
        held: true,
        settings: {},
        took: "failed",
      };
    }
    try {
      ce = hasUserSettingsChangedSinceAttach(createAcceptedSettingsStore());
      if (ce) ee?.(SERVED_OWN_SETTINGS_WAITING, REMOTE_TOOLS_CONSENT_TEXT["served_settings.own_waiting"]);
    } catch (error) {
      logError(toError(error));
    }
  };
  if (deviceId !== undefined) {
    K();
    we();
  }
  try {
    let reach = createHostPathReach({
      launchDir: O,
      projectDir: getProjectRoot(),
      originalCwd: getOriginalCwd(),
    });
    let Re = {
      policy: y,
      targetName: servingAnnouncement.name,
      ...(deviceId !== undefined && {
        deviceId,
      }),
      launchDir: O,
      ...(copy !== undefined && {
        announcedDir: copy.workingDir,
      }),
      reach,
      ...(ee !== undefined && {
        onNotice: ee,
      }),
      ...(copy === undefined && {
        dirSyncOf: (me) => dirSyncSession().syncOf(me),
      }),
      tools: tools_2,
      gate: admissionGateFor(y, {
        limiter,
        getDeviceId: () => {
          let deviceId = e.getDeviceId();
          if (deviceId === undefined) return;
          try {
            K();
          } catch (error) {
            logError(toError(error));
            return;
          }
          we();
          return deviceId;
        },
        isModeCurrent: () => true,
      }),
      sessions: callerSessions,
      ...(r.mode === "vm"
        ? {
            execution: {
              mode: "vm",
              availability: r.availability,
            },
            executor: r.executor,
          }
        : {
            execution: r,
          }),
      sandboxRequiredNow: e.sandboxRequiredNow ?? (() => false),
      ownerSettingsLost: userSettingsErrorWatcher(),
      callLog: L,
      readiness: e.readiness ?? createServingReadiness(),
      lifetime: abortController.signal,
      servedMcpTools: () => q,
      servedMcpWireArguments: (me) => ae.get(me),
      userSettingsAtAttach: () => Z,
      sandboxTurnedOnByHeldFile: () => fe?.sandboxTurnedOn === true,
      projectHookWaitingFor,
      ownSettingsWaitingFor,
      ...(e.registrationTransport !== undefined && {
        registrationTransport: e.registrationTransport,
      }),
    };
    if (Re.reach.projectHooks !== undefined) registerPreExitFlush(() => saveSeenHookPins(Re.reach));
    return {
      policy: y,
      get description() {
        if (servingAnnouncement.inventory !== undefined && !isHostInventoryShared()) {
          let { inventory, ...ke } = servingAnnouncement;
          servingAnnouncement = ke;
        }
        return servingAnnouncement;
      },
      redescribe: (me, ke) => {
        if (copy !== undefined) return false;
        let Qe = folderRelationField(me, ke);
        let je = withSyncAtAttach(servingAnnouncement.capabilities ?? [], syncReadyAtAttach(sessionId));
        if (
          me === servingAnnouncement.project_sync &&
          Qe.folder_relation === servingAnnouncement.folder_relation &&
          isDeepStrictEqual(je, servingAnnouncement.capabilities ?? [])
        )
          return false;
        let {
          sync_root: syncRoot,
          folder_relation: folderRelation,
          capabilities,
          ...Ie
        } = servingAnnouncement;
        let He = dirSyncSession().rootOf(sessionId);
        servingAnnouncement = {
          ...Ie,
          project_sync: me,
          ...(He !== undefined &&
            isSyncingFolder(me) && {
              sync_root: He,
            }),
          ...Qe,
          ...(je.length > 0 && {
            capabilities: je,
          }),
        };
        try {
          signal.emit();
        } catch (error) {
          logError(toError(error));
        }
        return true;
      },
      onRedescribed: signal.subscribe,
      ensureSettingsHeld: () => {
        if (e.getDeviceId() !== undefined) {
          K();
          we();
        }
      },
      deps: Re,
      setServedMcp: (me, ke) => {
        q = me;
        ae = ke;
      },
      heldServedCall: (me) => {
        let ke = callerSessions.heldAsk(
          callerKey({
            sessionId,
          }),
          me.toolUseId,
        );
        if (ke === undefined) return NOT_HELD_LEASE;
        return splitHostField(me.input).requested === servingAnnouncement.name &&
          matchesApprovedCall(ke, me.toolName, me.input)
          ? {
              held: true,
              startCwd: ke.startCwd,
            }
          : {
              held: false,
              reason: "other_input",
            };
      },
      dispose: () => {
        abortController.abort();
        fe?.end();
        saveSeenHookPins(Re.reach);
      },
    };
  } catch (error) {
    fe?.end();
    throw error;
  }
}
//@ chunk-ad2e1aj6.js:86452-86500 placement
function syncReadyAtAttach(sessionId) {
  return dirSyncSession().attachSyncs.ready(sessionId);
}
//@ chunk-ad2e1aj6.js:86500-86542 placement
function projectSyncDirectionOf(sessionId) {
  return projectSyncDirection(dirSyncSession().stateOf(sessionId));
}
//@ chunk-ad2e1aj6.js:86542-86587 placement
function watchProjectSyncState(e, n) {
  return dirSyncSession().watchState(e, n);
}
//@ chunk-ad2e1aj6.js:86587-86763 placement
function projectSyncDirection(e) {
  switch (e?.state) {
    case "armed":
      return e.direction === "pending" ? "unknown" : e.direction;
    case "off":
    case "stopped":
      return "off";
    case undefined:
    case "seeding":
      return "unknown";
  }
}
//@ chunk-ad2e1aj6.js:86763-86894 placement
function getRefusedInputFields(policy, n) {
  if (policy.refusedInputFields) return policy.refusedInputFields(n);
  let toolRemoteExecution = getToolRemoteExecution(n);
  return toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : [];
}
//@ chunk-ad2e1aj6.js:86894-87204 placement
function servedToolDefinition(e, deps, description) {
  let refusedInputFields = getRefusedInputFields(deps.policy, e);
  return {
    definition: {
      name: e.name,
      description: servedToolDescription(e, description),
      inputSchema: servedInputSchema(e, [...refusedInputFields, HOST_TOOL_INPUT_FIELD]),
      _meta: {
        [ANTHROPIC_REMOTETOOLEXECUTION]: {
          v: CURRENT_PROTOCOL_VERSION,
          tool: e.name,
          refused_input_fields: refusedInputFields,
          target: description,
          protocol_versions: SUPPORTED_PROTOCOL_VERSIONS,
        },
      },
    },
    analyticsName: lit("remote_served_tool"),
    senderJudgedBy: "handler",
    call: (r, i) => admitServedCall(e.name, r, i, deps, "bridge"),
  };
}
//@ chunk-ad2e1aj6.js:87204-87359 placement
function announcedToolFor(e, deps, description) {
  let refusedInputFields = getRefusedInputFields(deps.policy, e);
  return {
    name: e.name,
    refused_input_fields: refusedInputFields,
    protocol_versions: SUPPORTED_PROTOCOL_VERSIONS,
    description: servedToolDescription(e, description),
    input_schema: servedInputSchema(e, [...refusedInputFields, HOST_TOOL_INPUT_FIELD]),
  };
}
//@ chunk-ad2e1aj6.js:87359-87507 placement
function servedToolDescription(e, n) {
  return `Claude Code ${e.name} served by ${n.name} for its bound cloud session; called by that session's own routing, not directly.`;
}
//@ chunk-ad2e1aj6.js:87507-87777 placement
function servedInputSchema(e, n) {
  let s = toolInputJsonSchemaValidator().safeParse(toolInputJsonSchema(e.inputSchema));
  if (!s.success) throw Error("a served tool must have an object input schema");
  let { properties, required } = s.data;
  let filtered = required?.filter((y) => !n.includes(y));
  return {
    type: "object",
    properties: Uo(properties, n),
    ...(filtered?.length && {
      required: filtered,
    }),
  };
}
//@ chunk-ad2e1aj6.js:87777-87873 placement
var toolInputJsonSchemaValidator = DoctorLazy(() =>
  looseObject({
    type: literal("object"),
    properties: record(string(), record(string(), unknown())),
    required: array(string()).optional(),
  }),
);
export { createServingKit, announcedToolFor, servingKitFor };
