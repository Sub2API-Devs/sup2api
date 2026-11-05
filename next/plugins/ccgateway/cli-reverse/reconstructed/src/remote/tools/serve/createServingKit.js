/**
 * remote/tools/serve/createServingKit.ts
 *
 * 2.1.316 新增：远程工具服务套件（工具定义、输入结构、分组提供者）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (14)
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
  UNBOUND_MANAGED_HOLD,
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
import { omitAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  looseObject,
  literal,
  record,
  stringSchema,
  unknown,
  array,
} from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-nvm0wye1.js:82346-83935 placement
function remoteToolServingGroupProvider(options = {}) {
  let tools = options.tools ?? getAllBaseTools;
  let policy = options.policy ?? resolveServingPolicy;
  return (ctx) => {
    let { registry, getDeviceId, onNotice, serving } = ctx;
    let policyValue = policy();
    let offReason = serving !== undefined ? serving.offReason : remoteToolServingOffReason();
    if (offReason !== undefined) {
      let isBound = getDeviceId() !== undefined;
      logEvent("tengu_remote_tool_serving", {
        event: lit("gate_off"),
        served_tool_count: 0,
        policy: fromEnum(policyValue.name),
        reason: fromEnum(offReason),
        ...launchLocationFacts(offReason),
        bound: isBound,
      });
      if (isBound && isPersonFixableOffReason(offReason))
        onNotice?.(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
      return;
    }
    let isFirstKit = ctx.servingKit.current === undefined;
    let kit = servingKitFor(ctx, {
      tools,
      policy,
    });
    let attachGroup = () => {
      let publish = (event) => {
        let mapped = servableTools(kit.deps).map((tool) =>
          servedToolDefinition(tool, kit.deps, kit.description),
        );
        registry.setGroup(REMOTE_TOOLS, mapped);
        logEvent("tengu_remote_tool_serving", {
          event: lit(event),
          served_tool_count: mapped.length,
          policy: fromEnum(kit.policy.name),
          project_sync: fromEnum(kit.description.project_sync ?? "unknown"),
        });
      };
      publish("announced");
      let disposed = false;
      let stopWatch;
      let { attachSyncs } = dirSyncSession();
      let stopWatchIfUnwatched = () => {
        if (kit.description.project_sync !== "unknown" && !attachSyncs.concerns(ctx.sessionId)) {
          stopWatch?.();
          stopWatch = undefined;
        }
      };
      let folderRelation;
      let onSyncDirection = (direction, relation) => {
        if (disposed) return;
        folderRelation = relation ?? folderRelation;
        let effectiveDirection =
          direction === "unknown" && attachSyncs.concerns(ctx.sessionId) ? "off" : direction;
        if (kit.redescribe(effectiveDirection, folderRelation)) publish("redescribed");
        stopWatchIfUnwatched();
      };
      let startWatch = () => {
        if (
          disposed ||
          stopWatch !== undefined ||
          (kit.description.project_sync !== "unknown" && !attachSyncs.concerns(ctx.sessionId))
        )
          return;
        stopWatch = (options.watchProjectSync ?? watchProjectSyncState)(ctx.sessionId, (sync) =>
          onSyncDirection(projectSyncDirection(sync)),
        );
        stopWatchIfUnwatched();
      };
      if (ctx.dirSync instanceof Promise) {
        let relationPromise = ctx.folderRelation?.catch(() => {
          return;
        });
        ctx.dirSync
          .then(
            (ok) => {
              if (!ok) {
                if (relationPromise === undefined) {
                  onSyncDirection("off");
                  return;
                }
                return relationPromise.then((relation) => onSyncDirection("off", relation));
              }
              onSyncDirection(projectSyncDirectionOf(ctx.sessionId));
              startWatch();
            },
            () => onSyncDirection("off"),
          )
          .catch((error) => logError(toError(error)));
      }
      startWatch();
      let unsubscribe = attachSyncs.onChanged(ctx.sessionId, () => {
        onSyncDirection(projectSyncDirectionOf(ctx.sessionId));
        startWatch();
      });
      return () => {
        disposed = true;
        unsubscribe();
        stopWatch?.();
        kit.dispose();
        registry.setGroup(REMOTE_TOOLS, []);
        logEvent("tengu_remote_tool_serving", {
          event: lit("withdrawn"),
          served_tool_count: 0,
          policy: fromEnum(kit.policy.name),
        });
      };
    };
    try {
      return attachGroup();
    } catch (error) {
      if (isFirstKit) kit.dispose();
      throw error;
    }
  };
}
//@ chunk-nvm0wye1.js:83935-84884 placement
function servingKitFor(ctx, options = {}) {
  let current = ctx.servingKit.current;
  if (current !== undefined) {
    if (
      (options.tools !== undefined && options.tools !== current.tools) ||
      (options.policy !== undefined && options.policy !== current.policy)
    )
      throw Error(
        "servingKitFor: a second tool group asked for a different tool set or policy than the kit was built with",
      );
    return current.kit;
  }
  let tools = options.tools ?? getAllBaseTools;
  let policy = options.policy ?? resolveServingPolicy;
  let servingKit = createServingKit({
    sessionId: ctx.sessionId,
    limiter: ctx.limiter,
    getDeviceId: ctx.getDeviceId,
    onNotice: ctx.onNotice,
    tools,
    policy,
    ...(ctx.dirSync !== undefined && {
      dirSync: ctx.dirSync,
    }),
    ...(ctx.transport !== undefined && {
      registrationTransport: ctx.transport,
    }),
    ...(ctx.readiness !== undefined && {
      readiness: ctx.readiness,
    }),
    ...(ctx.hostInventory !== undefined && {
      hostInventory: ctx.hostInventory,
    }),
    ...(ctx.execution !== undefined && {
      execution: ctx.execution,
    }),
    ...(ctx.sandboxRequiredNow !== undefined && {
      sandboxRequiredNow: ctx.sandboxRequiredNow,
    }),
  });
  let kit = {
    ...servingKit,
    get description() {
      return servingKit.description;
    },
    dispose: () => {
      servingKit.dispose();
      if (ctx.servingKit.current?.kit === kit) ctx.servingKit.current = undefined;
    },
  };
  ctx.servingKit.current = {
    kit,
    tools,
    policy,
  };
  return kit;
}
//@ chunk-nvm0wye1.js:84884-84896 placement
var PRE_EXIT_FLUSH_TIMEOUT_MS = 1000;
//@ chunk-nvm0wye1.js:84896-88607 placement
function createServingKit(options) {
  let { limiter, onNotice, sessionId } = options;
  let execution = options.execution ?? {
    mode: "in_process",
  };
  let tools = options.tools ?? getAllBaseTools;
  let policyValue = (options.policy ?? resolveServingPolicy)();
  let launchDir = options.launchDir ?? getOriginalCwd();
  let epoch = randomUUID();
  let signal = createSignal();
  let deviceId = options.getDeviceId();
  let copy = execution.mode === "vm" ? execution.copy : undefined;
  let tools_2 = copy === undefined ? tools() : copy.tools(tools());
  let { hostName } = options;
  let servingAnnouncement = buildServingAnnouncement({
    policy: policyValue,
    launchDir: copy?.workingDir ?? launchDir,
    ...(hostName !== undefined && {
      getHostname: () => hostName,
    }),
    ...(copy !== undefined
      ? {
          projectSync: "off",
          folderRelation: "separate_copy",
        }
      : {
          projectSync: options.dirSync === false ? "off" : projectSyncDirectionOf(sessionId),
          syncRoot: dirSyncSession().rootOf(sessionId),
          readyToSyncAtAttach: syncReadyAtAttach(sessionId),
        }),
    epoch,
    ...(deviceId !== undefined && {
      deviceId,
    }),
    servedToolNames: servableTools({
      policy: policyValue,
      tools: tools_2,
    }).map((tool) => tool.name),
    ...(options.hostInventory !== undefined && {
      inventory: options.hostInventory,
    }),
  });
  if (execution.mode === "vm" && execution.notes !== undefined) {
    let { shell, inventory, ...rest } = servingAnnouncement;
    servingAnnouncement = {
      ...rest,
      notes: execution.notes,
    };
  }
  if (copy !== undefined) {
    let { home_dir: homeDir, platform, ...rest } = servingAnnouncement;
    servingAnnouncement = {
      ...rest,
      platform: copy.platform,
      shell: copy.shell,
      copy_of: {
        platform,
        dir: launchDir,
        ...(homeDir !== undefined && {
          home_dir: homeDir,
        }),
      },
    };
  }
  let logHandle = writeServedCallLog({
    epoch,
    targetName: servingAnnouncement.name,
  });
  let callLog =
    options.readsNoPriorCalls === true
      ? {
          note: logHandle.note,
          flush: logHandle.flush,
          priorLoaded: true,
          loadPrior: () => Promise.resolve(),
          priorCallsFor: () => [],
        }
      : logHandle;
  registerPreExitFlush(() =>
    Promise.race([
      callLog.flush(),
      sleep(PRE_EXIT_FLUSH_TIMEOUT_MS, undefined, {
        unref: true,
      }),
    ]),
  );
  let callerSessions = createCallerSessions({
    limit: callerSessionsLimit(),
    epoch,
    priorCallsFor: callLog.priorCallsFor,
  });
  let abortController = createAbortController();
  let notifiedKeys = new Set();
  let noticeOnce =
    onNotice === undefined
      ? undefined
      : (key, text) => {
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            onNotice(key, text);
          }
        };
  let servedMcpTools = new Map();
  let servedMcpWireArguments = new Map();
  let heldSettings;
  let settingsFrozen = false;
  let freezeSettings = () => {
    if (!settingsFrozen && !abortController.signal.aborted) {
      heldSettings = freezeServedSettings(noticeOnce);
      settingsFrozen = true;
    }
  };
  let projectHookNotified = new Set();
  let projectHookWaitingFor = (key) => {
    if (heldSettings?.hookWaiting !== true || projectHookNotified.has(key)) return false;
    projectHookNotified.add(key);
    return true;
  };
  let ownerSettings = UNBOUND_MANAGED_HOLD;
  let ownerSettingsTaken = false;
  let ownSettingsWaiting = false;
  let ownSettingsNotified = new Set();
  let ownSettingsWaitingFor = (key) => {
    if (!ownSettingsWaiting || ownSettingsNotified.has(key)) return false;
    ownSettingsNotified.add(key);
    return true;
  };
  let takeOwnerSettings = () => {
    if (!settingsFrozen || ownerSettingsTaken) return;
    ownerSettingsTaken = true;
    try {
      recordServedUserRulesAtAttach(createAcceptedSettingsStore());
      ownerSettings = getHeldServedOwnerSettings();
    } catch (error) {
      logError(toError(error));
      keepEmptyOwnerSettings();
      ownerSettings = {
        held: true,
        settings: {},
        took: "failed",
      };
    }
    try {
      ownSettingsWaiting = hasUserSettingsChangedSinceAttach(createAcceptedSettingsStore());
      if (ownSettingsWaiting)
        noticeOnce?.(SERVED_OWN_SETTINGS_WAITING, REMOTE_TOOLS_CONSENT_TEXT["served_settings.own_waiting"]);
    } catch (error) {
      logError(toError(error));
    }
  };
  if (deviceId !== undefined) {
    freezeSettings();
    takeOwnerSettings();
  }
  try {
    let reach = createHostPathReach({
      launchDir,
      projectDir: getProjectRoot(),
      originalCwd: getOriginalCwd(),
    });
    let deps = {
      policy: policyValue,
      targetName: servingAnnouncement.name,
      ...(deviceId !== undefined && {
        deviceId,
      }),
      launchDir,
      ...(copy !== undefined && {
        announcedDir: copy.workingDir,
      }),
      reach,
      ...(noticeOnce !== undefined && {
        onNotice: noticeOnce,
      }),
      ...(copy === undefined && {
        dirSyncOf: (sessionId) => dirSyncSession().syncOf(sessionId),
      }),
      tools: tools_2,
      gate: admissionGateFor(policyValue, {
        limiter,
        getDeviceId: () => {
          let deviceId = options.getDeviceId();
          if (deviceId === undefined) return;
          try {
            freezeSettings();
          } catch (error) {
            logError(toError(error));
            return;
          }
          takeOwnerSettings();
          return deviceId;
        },
        isModeCurrent: () => true,
      }),
      sessions: callerSessions,
      ...(execution.mode === "vm"
        ? {
            execution: {
              mode: "vm",
              availability: execution.availability,
            },
            executor: execution.executor,
          }
        : {
            execution,
          }),
      sandboxRequiredNow: options.sandboxRequiredNow ?? (() => false),
      ownerSettingsLost: userSettingsErrorWatcher(),
      callLog,
      readiness: options.readiness ?? createServingReadiness(),
      lifetime: abortController.signal,
      servedMcpTools: () => servedMcpTools,
      servedMcpWireArguments: (toolName) => servedMcpWireArguments.get(toolName),
      userSettingsAtAttach: () => ownerSettings,
      sandboxTurnedOnByHeldFile: () => heldSettings?.sandboxTurnedOn === true,
      projectHookWaitingFor,
      ownSettingsWaitingFor,
      ...(options.registrationTransport !== undefined && {
        registrationTransport: options.registrationTransport,
      }),
    };
    if (deps.reach.projectHooks !== undefined) registerPreExitFlush(() => saveSeenHookPins(deps.reach));
    return {
      policy: policyValue,
      get description() {
        if (servingAnnouncement.inventory !== undefined && !isHostInventoryShared()) {
          let { inventory, ...withoutInventory } = servingAnnouncement;
          servingAnnouncement = withoutInventory;
        }
        return servingAnnouncement;
      },
      redescribe: (projectSync, folderRelation) => {
        if (copy !== undefined) return false;
        let relationField = folderRelationField(projectSync, folderRelation);
        let capabilities = withSyncAtAttach(
          servingAnnouncement.capabilities ?? [],
          syncReadyAtAttach(sessionId),
        );
        if (
          projectSync === servingAnnouncement.project_sync &&
          relationField.folder_relation === servingAnnouncement.folder_relation &&
          isDeepStrictEqual(capabilities, servingAnnouncement.capabilities ?? [])
        )
          return false;
        let {
          sync_root: syncRoot,
          folder_relation: folderRelation_2,
          capabilities: capabilities_2,
          ...rest
        } = servingAnnouncement;
        let currentSyncRoot = dirSyncSession().rootOf(sessionId);
        servingAnnouncement = {
          ...rest,
          project_sync: projectSync,
          ...(currentSyncRoot !== undefined &&
            isSyncingFolder(projectSync) && {
              sync_root: currentSyncRoot,
            }),
          ...relationField,
          ...(capabilities.length > 0 && {
            capabilities,
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
        if (options.getDeviceId() !== undefined) {
          freezeSettings();
          takeOwnerSettings();
        }
      },
      deps,
      setServedMcp: (tools, wireArguments) => {
        servedMcpTools = tools;
        servedMcpWireArguments = wireArguments;
      },
      heldServedCall: (held) => {
        let ask = callerSessions.heldAsk(
          callerKey({
            sessionId,
          }),
          held.toolUseId,
        );
        if (ask === undefined) return NOT_HELD_LEASE;
        return splitHostField(held.input).requested === servingAnnouncement.name &&
          matchesApprovedCall(ask, held.toolName, held.input)
          ? {
              held: true,
              startCwd: ask.startCwd,
            }
          : {
              held: false,
              reason: "other_input",
            };
      },
      dispose: () => {
        abortController.abort();
        heldSettings?.end();
        saveSeenHookPins(deps.reach);
      },
    };
  } catch (error) {
    heldSettings?.end();
    throw error;
  }
}
//@ chunk-nvm0wye1.js:88607-88655 placement
function syncReadyAtAttach(sessionId) {
  return dirSyncSession().attachSyncs.ready(sessionId);
}
//@ chunk-nvm0wye1.js:88655-88697 placement
function projectSyncDirectionOf(sessionId) {
  return projectSyncDirection(dirSyncSession().stateOf(sessionId));
}
//@ chunk-nvm0wye1.js:88697-88742 placement
function watchProjectSyncState(sessionId, onChange) {
  return dirSyncSession().watchState(sessionId, onChange);
}
//@ chunk-nvm0wye1.js:88742-88918 placement
function projectSyncDirection(state) {
  switch (state?.state) {
    case "armed":
      return state.direction === "pending" ? "unknown" : state.direction;
    case "off":
    case "stopped":
      return "off";
    case undefined:
    case "seeding":
      return "unknown";
  }
}
//@ chunk-nvm0wye1.js:88918-89049 placement
function getRefusedInputFields(policy, tool) {
  if (policy.refusedInputFields) return policy.refusedInputFields(tool);
  let toolRemoteExecution = getToolRemoteExecution(tool);
  return toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : [];
}
//@ chunk-nvm0wye1.js:89049-89359 placement
function servedToolDefinition(tool, deps, description) {
  let refusedInputFields = getRefusedInputFields(deps.policy, tool);
  return {
    definition: {
      name: tool.name,
      description: servedToolDescription(tool, description),
      inputSchema: servedInputSchema(tool, [...refusedInputFields, HOST_TOOL_INPUT_FIELD]),
      _meta: {
        [ANTHROPIC_REMOTETOOLEXECUTION]: {
          v: CURRENT_PROTOCOL_VERSION,
          tool: tool.name,
          refused_input_fields: refusedInputFields,
          target: description,
          protocol_versions: SUPPORTED_PROTOCOL_VERSIONS,
        },
      },
    },
    analyticsName: lit("remote_served_tool"),
    senderJudgedBy: "handler",
    call: (toolInput, ctx) => admitServedCall(tool.name, toolInput, ctx, deps, "bridge"),
  };
}
//@ chunk-nvm0wye1.js:89359-89514 placement
function announcedToolFor(tool, deps, description) {
  let refusedInputFields = getRefusedInputFields(deps.policy, tool);
  return {
    name: tool.name,
    refused_input_fields: refusedInputFields,
    protocol_versions: SUPPORTED_PROTOCOL_VERSIONS,
    description: servedToolDescription(tool, description),
    input_schema: servedInputSchema(tool, [...refusedInputFields, HOST_TOOL_INPUT_FIELD]),
  };
}
//@ chunk-nvm0wye1.js:89514-89662 placement
function servedToolDescription(tool, description) {
  return `Claude Code ${tool.name} served by ${description.name} for its bound cloud session; called by that session's own routing, not directly.`;
}
//@ chunk-nvm0wye1.js:89662-89932 placement
function servedInputSchema(tool, refusedFields) {
  let parsed = toolInputJsonSchemaValidator().safeParse(toolInputJsonSchema(tool.inputSchema));
  if (!parsed.success) throw Error("a served tool must have an object input schema");
  let { properties, required } = parsed.data;
  let filtered = required?.filter((name) => !refusedFields.includes(name));
  return {
    type: "object",
    properties: omitAlias(properties, refusedFields),
    ...(filtered?.length && {
      required: filtered,
    }),
  };
}
//@ chunk-nvm0wye1.js:89932-90028 placement
var toolInputJsonSchemaValidator = DoctorLazy(() =>
  looseObject({
    type: literal("object"),
    properties: record(stringSchema(), record(stringSchema(), unknown())),
    required: array(stringSchema()).optional(),
  }),
);
export { createServingKit, announcedToolFor, servingKitFor, remoteToolServingGroupProvider };
