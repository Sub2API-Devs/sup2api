/**
 * remote/tools/sessionChannelTools.ts
 *
 * 2.1.316 新增：会话通道工具（处理远程工具通告并转为本地工具）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4hamj64m.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  REMOTE_DEVICES_SERVER_NAME,
  isEmptyAnnouncement,
  RemoteBackgroundCommands,
} from "../../services/remoteTools/backgroundCommands.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isPowerShellToolEnabled } from "../../utils/shell/shellToolUtils.js";
import { sessionChannelPowerShellPrompt } from "../../tools/PowerShellTool/sessionChannelPowerShell.js";
import { parseShellCapabilityTag } from "../../services/remoteTools/shellForwarding.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { isStandardKeyActive } from "../../services/mcp/mcpStandardKeys.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import { TOOL_META_KEYS } from "../../bridge/deviceRegistration.js";
import { countWhere } from "../../utils/collections.js";
import {
  normalizeWithdrawReason,
  STILL_HERE,
  MACHINE_PRESENCE_STATES,
  SAYS_STILL_HERE,
  STILL_HERE_TEXT,
} from "./protocolConstants.js";
import { logRemoteTools } from "../../services/remoteTools/remoteToolsDebug.js";
import { withinDepth, parseAdvert } from "./protocolSchemas.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { MAX_RESULT_SIZE_HINT, parseAnnouncedTools } from "./toolDescriptors.js";
import { SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { MINIMAL_INTERFACE_VERSION } from "./protocolNegotiation.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { ownSessionIdPrefixes, buildCcrMcpProxyUrls } from "../../services/analytics/metadata.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { logError } from "../../utils/log.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { BridgeToolProvider } from "../../bridge/bridgePermissionResponse.js";
import { isRemoteEnvPlaceholder } from "../../utils/remoteEnvironment.js";
import { ToolHostsForwardingState } from "./toolHostsNotice.js";
import { RemoteAskSeat } from "../../services/remoteTools/remoteAskSeat.js";

//@ chunk-4hamj64m.js:6626-6695 placement
function loadMcpClientModule() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-4hamj64m.js:6695-6871 placement
var SESSION_CHANNEL_SERVER_CONFIG = {
  serverName: REMOTE_DEVICES_SERVER_NAME,
  scope: "dynamic",
  serverType: "http",
  serverProvenance: "connector",
  source: "dynamic",
  skipPrefix: false,
  serverAlwaysLoad: false,
  isFirstPartyDesignServer: false,
  cliOwned: false,
};
//@ chunk-4hamj64m.js:6871-7083 placement
function buildSessionChannelTools(registry, limits) {
  return [
    ...registry
      .entries()
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .flatMap(powerShellPromptToolsFor),
    ...registry.entries().flatMap((machine) =>
      [...machine.passthrough.values()].map((tool) => ({
        tool: toSessionChannelTool(machine.name, tool, limits?.[tool.name]),
        machine: machine.name,
      })),
    ),
  ];
}
//@ chunk-4hamj64m.js:7083-7197 placement
function powerShellPromptToolsFor(machine) {
  return machine.servedTools.has(POWERSHELL_TOOL_NAME) && !isPowerShellToolEnabled()
    ? [
        {
          tool: sessionChannelPowerShellPrompt(
            machine.name,
            parseShellCapabilityTag(machine.description.shell),
          ),
          machine: machine.name,
        },
      ]
    : [];
}
//@ chunk-4hamj64m.js:7197-7375 placement
function createCachedSessionChannelTools(
  registry,
  onChanged = () => {
    return;
  },
) {
  let cache;
  return () => {
    let generation = registry.generation();
    let ceilings = onChanged();
    if (cache === undefined || cache.generation !== generation || cache.ceilings !== ceilings)
      cache = {
        generation,
        ceilings,
        tools: buildSessionChannelTools(registry, ceilings),
      };
    return cache.tools;
  };
}
//@ chunk-4hamj64m.js:7375-7902 placement
function toSessionChannelTool(name, tool, effectiveMaxPermission) {
  let listed = recursivelySanitizeUnicode({
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: {
      ...tool.input_schema,
      type: "object",
    },
    ...(tool.annotations !== undefined && {
      annotations: tool.annotations,
    }),
    ...(tool.hints !== undefined && {
      _meta: sessionToolMeta(tool.hints),
    }),
  });
  return loadMcpClientModule().composeMcpTool({
    ...SESSION_CHANNEL_SERVER_CONFIG,
    standardKey: isStandardKeyActive()
      ? {
          key: REMOTE_DEVICES_SERVER_NAME,
          pinned: true,
        }
      : undefined,
    effectiveMaxPermission,
    listed,
    async call() {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${tool.name} is one of ${name}'s own MCP tools; the session runs it on that machine and it cannot run here.`,
        "session-channel MCP tool called without being routed to its machine",
      );
    },
  });
}
//@ chunk-4hamj64m.js:7902-8230 placement
function sessionToolMeta(hints) {
  return {
    ...(hints.search_hint !== undefined && {
      [TOOL_META_KEYS.searchHint]: hints.search_hint,
    }),
    ...(hints.always_load !== undefined && {
      [TOOL_META_KEYS.alwaysLoad]: hints.always_load,
    }),
    ...(hints.max_result_size_chars !== undefined && {
      [TOOL_META_KEYS.maxResultSizeChars]: hints.max_result_size_chars,
    }),
    ...(hints.requires_user_interaction !== undefined && {
      [TOOL_META_KEYS.requiresUserInteraction]: hints.requires_user_interaction,
    }),
  };
}
//@ chunk-4hamj64m.js:8230-8252 placement
var MAX_ANNOUNCE_DEPTH = 32;
var MAX_ANNOUNCE_ITEMS = 200;
var EMPTY_ANNOUNCE_ITEMS = [];
//@ chunk-4hamj64m.js:8252-8353 placement
function memoizeLast(compute) {
  let last;
  return (input) => {
    if (last === undefined || last.input !== input)
      last = {
        input,
        result: compute(input),
      };
    return last.result;
  };
}
//@ chunk-4hamj64m.js:8353-8420 placement
var MACHINE_TOOLS_POLICY_STATES = {
  allowed: undefined,
  denied: "policy",
  pending: "pending",
};
var ANNOUNCE_PENDING_WINDOW_MS = 30000;
//@ chunk-4hamj64m.js:8420-8502 placement
function collectPassthroughToolNames(registry) {
  return new Set(registry.entries().flatMap((machine) => [...machine.passthrough.keys()]));
}
//@ chunk-4hamj64m.js:8502-14368 placement
/**
 * 处理附着机器发来的 remote_tools_announce：校验嵌套深度/大小/epoch，登记其工具（served/passthrough/plumbing）。
 */
function handleRemoteToolsAnnounce(announcement) {
  let counts = {
    served: 0,
    ignored: 0,
    passthrough: 0,
    passthrough_adopted: 0,
    passthrough_ignored: 0,
    passthrough_declined: undefined,
    plumbing: 0,
    displaced: false,
  };
  let report = (outcome, error) => {
    announcement.telemetry.announce({
      outcome,
      ...counts,
    });
    return {
      kind: "error",
      error,
    };
  };
  let reportPublished = (passthroughToolNames, reason) => {
    let passthroughToolNames_2 = collectPassthroughToolNames(announcement.registry);
    let removedCount = countWhere([...passthroughToolNames], (name) => !passthroughToolNames_2.has(name));
    if (removedCount > 0 || passthroughToolNames_2.size !== passthroughToolNames.size)
      announcement.telemetry.published({
        count: passthroughToolNames_2.size,
        removed: removedCount,
        reason,
      });
  };
  let reportRefused = (outcome, error, announcement_2, instanceId, passthroughToolNames) => {
    announcement.registry.clear();
    reportPublished(passthroughToolNames, "gate_off");
    if (isEmptyAnnouncement(announcement_2)) announcement.forwardingOff.withdrew(instanceId);
    else if (outcome !== "disabled_channel_off") announcement.forwardingOff.refused(instanceId, outcome);
    return report(outcome, error);
  };
  let endServingInstance = (instanceId, reason) => {
    let legsAbandoned = announcement.abandonCalls?.(instanceId, reason) ?? 0;
    let calls = announcement.forwardedCalls.addressedTo(instanceId);
    let asksEnded = 0;
    let inheritedWithdrawn = 0;
    for (let call of calls) {
      if (call.withdrawInherited()) inheritedWithdrawn += 1;
      if (!call.askOutstanding) continue;
      call.endAsk(normalizeWithdrawReason(reason));
      asksEnded += 1;
    }
    logRemoteTools(undefined, "serving instance gone", {
      host_inst: instanceId,
      why: reason,
      legs_abandoned: legsAbandoned,
      calls_addressed: calls.length,
      asks_ended: asksEnded,
      inherited_withdrawn: inheritedWithdrawn,
    });
  };
  return {
    async handle(request) {
      if (!withinDepth(request, MAX_ANNOUNCE_DEPTH))
        return report("invalid", "invalid_announce: request nested too deep");
      if (jsonStringifyRaw(request).length > MAX_RESULT_SIZE_HINT)
        return report("invalid", "invalid_announce: request larger than 1 MiB");
      let parsed = SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema().safeParse(request);
      if (!parsed.success) {
        let issue = parsed.error.issues[0];
        return report(
          "invalid",
          `invalid_announce: ${sanitizeDisplayText(
            `${issue?.path.join(".") ?? ""} ${issue?.message ?? "malformed"}`,
            {
              maxCodeUnits: MAX_ANNOUNCE_ITEMS,
            },
          )}`,
        );
      }
      let passthroughDeclined = !announcement.adoptsMcpTools()
        ? "switched_off"
        : parsed.data.passthrough.length === 0
          ? undefined
          : MACHINE_TOOLS_POLICY_STATES[announcement.machineMcpToolsPolicy()];
      let deviceBridgeServerPresent =
        parsed.data.passthrough.length > 0 ? announcement.deviceBridgeServerPresent() : undefined;
      let announcement_2 = parseAnnouncedTools(
        parsed.data,
        passthroughDeclined === undefined
          ? announcement.passthroughAdoption
          : {
              ...announcement.passthroughAdoption,
              admitsName: () => false,
            },
      );
      if (announcement_2 === undefined)
        return report(
          "invalid",
          typeof parsed.data.host.epoch !== "string" && parseAdvert(parsed.data.host) !== undefined
            ? "invalid_announce: host.epoch is required on this channel"
            : "invalid_announce: host is not a readable machine description (name a lowercase slug other than container/this-machine, an epoch, kind, platform, working_dir and limits)",
        );
      if (parsed.data.worker_epoch !== undefined && parsed.data.worker_epoch !== announcement.workerEpoch)
        return report("stale_epoch", `stale_worker_epoch: worker epoch is ${announcement.workerEpoch}`);
      if (announcement_2.host.capabilities?.includes(STILL_HERE) === true) {
        let found = announcement.registry.entries().find((entry) => entry.name === announcement_2.host.name);
        if (found?.instanceId !== parsed.data.instance_id)
          return {
            kind: "error",
            error: "invalid_announce: only the client that holds a machine can say it is still here",
          };
        let noted =
          announcement.switches() === "on" &&
          announcement.stillHereOn() &&
          announcement.forwardedCalls.addressedTo(found.instanceId).some((call) => !call.askOutstanding) &&
          announcement.registry.noteStillHere(found.instanceId, announcement.now());
        logRemoteTools(undefined, "machine still here", {
          host_inst: found.instanceId,
          noted,
        });
        return {
          kind: "success",
          response: {
            status: "announced",
            worker_epoch: announcement.workerEpoch,
            protocol_version: found.protocol.kind === "compatible" ? found.protocol.version : null,
          },
        };
      }
      let passthroughToolNames = collectPassthroughToolNames(announcement.registry);
      switch (announcement.switches()) {
        case "channel_off":
          return reportRefused(
            "disabled_channel_off",
            "remote_tools_disabled: session_channel_off",
            announcement_2,
            parsed.data.instance_id,
            passthroughToolNames,
          );
        case "switch_off":
          return reportRefused(
            "disabled_switch_off",
            "remote_tools_disabled: switch_off",
            announcement_2,
            parsed.data.instance_id,
            passthroughToolNames,
          );
        case "no_device_policy":
          return reportRefused(
            "disabled_device_policy",
            "remote_tools_disabled: device_policy_not_enforced",
            announcement_2,
            parsed.data.instance_id,
            passthroughToolNames,
          );
        case "on":
          break;
      }
      switch (
        (await withDeadline(
          announcement.readAccountFlag().catch(() => "pending"),
          announcement.flagWaitCapMs,
        )) ??
        "pending"
      ) {
        case "pending":
          if (isEmptyAnnouncement(announcement_2))
            announcement.forwardingOff.withdrew(parsed.data.instance_id);
          else if ((announcement.forwardingOff.reason() ?? "not_ready") === "not_ready")
            announcement.forwardingOff.refused(parsed.data.instance_id, "not_ready");
          return report("not_ready", "remote_tools_not_ready: feature flags not yet available; retry");
        case "off":
          return reportRefused(
            "disabled_flag_off",
            "remote_tools_disabled: flag_off",
            announcement_2,
            parsed.data.instance_id,
            passthroughToolNames,
          );
        case "on":
          break;
      }
      if (
        announcement_2.host.capabilities?.includes(MACHINE_PRESENCE_STATES) === true &&
        announcement.sleepNoticeOn()
      ) {
        let found = announcement.registry.entries().find((entry) => entry.name === announcement_2.host.name);
        if (found?.instanceId !== parsed.data.instance_id)
          return {
            kind: "error",
            error: "invalid_announce: only the client that holds a machine can say it sleeps",
          };
        announcement.registry.markAsleep(found.instanceId, announcement.now());
        logRemoteTools(undefined, "machine asleep", {
          host_inst: found.instanceId,
        });
        return {
          kind: "success",
          response: {
            status: "announced",
            worker_epoch: announcement.workerEpoch,
            protocol_version: found.protocol.kind === "compatible" ? found.protocol.version : null,
          },
        };
      }
      announcement.forwardingOff.clear();
      let acceptResult = announcement.registry.accept(announcement_2, {
        instanceId: parsed.data.instance_id,
        now: announcement.now(),
        transport: announcement.transportFor(announcement_2.host.name),
      });
      let counts = {
        ignored: acceptResult.ignoredTools.length,
        passthrough: parsed.data.passthrough.length,
        passthrough_ignored: parsed.data.passthrough.length - announcement_2.passthrough.length,
        passthrough_declined: parsed.data.passthrough.length > 0 ? passthroughDeclined : undefined,
        device_bridge_server_present: deviceBridgeServerPresent,
        plumbing: announcement_2.plumbing.length,
      };
      let adoptedFields = {
        ...(passthroughDeclined !== "switched_off" &&
          passthroughDeclined !== "pending" && {
            passthrough_adopted: acceptResult.status === "announced" ? acceptResult.passthroughAdopted : 0,
          }),
        ...(counts.passthrough_declined === "policy" && {
          passthrough_declined: "policy",
        }),
        ...(counts.passthrough_declined === "pending" && {
          passthrough_declined: "pending",
        }),
      };
      let ignoredFields =
        acceptResult.ignoredTools.length > 0
          ? {
              ignored_tools: acceptResult.ignoredTools.slice(0, 32),
            }
          : {};
      switch (acceptResult.status) {
        case "withdrawn":
          if (acceptResult.heldByAnother)
            logForDebugging(
              `[remote-tools] ${announcement_2.host.name}: a withdrawal from client instance ${parsed.data.instance_id} names a machine another instance announced since; kept`,
            );
          if (acceptResult.removed.length > 0) endServingInstance(parsed.data.instance_id, "withdrawn");
          reportPublished(passthroughToolNames, "withdrawn");
          announcement.telemetry.announce({
            outcome: "withdrawn",
            served: 0,
            passthrough_adopted: 0,
            ...counts,
            displaced: false,
          });
          return {
            kind: "success",
            response: {
              status: "withdrawn",
              worker_epoch: announcement.workerEpoch,
              protocol_version: null,
              ...adoptedFields,
              ...ignoredFields,
            },
          };
        case "announced":
          if (acceptResult.displaced !== undefined) {
            logForDebugging(
              `[remote-tools] ${announcement_2.host.name}: client instance ${parsed.data.instance_id} now announces this machine (was ${acceptResult.displaced}); calls go to the newcomer`,
            );
            endServingInstance(acceptResult.displaced, "displaced");
          }
          reportPublished(
            passthroughToolNames,
            acceptResult.displaced !== undefined ? "displaced" : "announced",
          );
          announcement.telemetry.announce({
            outcome: "announced",
            served: acceptResult.served,
            passthrough_adopted: acceptResult.passthroughAdopted,
            ...counts,
            displaced: acceptResult.displaced !== undefined,
            host_interface: announcement_2.host.tool_host_interface,
          });
          return {
            kind: "success",
            response: {
              status: "announced",
              worker_epoch: announcement.workerEpoch,
              protocol_version: acceptResult.protocolVersion,
              tool_host_interface: MINIMAL_INTERFACE_VERSION,
              ...adoptedFields,
              ...ignoredFields,
              ...(announcement_2.host.capabilities?.includes(SAYS_STILL_HERE) === true &&
                announcement.stillHereOn() && {
                  worker_capabilities: [STILL_HERE_TEXT],
                }),
            },
          };
      }
    },
  };
}
//@ chunk-4hamj64m.js:14368-18447 placement
/**
 * 为云会话构建会话通道工具：附着机器公告的工具成为本会话可调用的 MCP 风格工具。
 */
async function createSessionChannelTools(options) {
  let backgroundCommands = options.toolState.get(RemoteBackgroundCommands);
  let [
    { isAccountGateServed, isViolinWoodEnabled },
    { isSleepNoticeOnCached },
    { isStillHereOnCached },
    { refreshGrowthBookFeatures },
    {
      adoptMcpOverChannelSwitchOn,
      isRemoteToolForwardingEnabledCached,
      isRemoteToolForwardingSwitchOn,
      isSessionChannelDisabled,
    },
    { createSessionEventTransport },
    { logEvent },
    { fromEnum, fromEnumOpt, lit },
    { logFeatureBad, logFeatureOk, logFeatureSad },
    { judgeToolSchemaSendability },
    { mayBePassthroughTool },
    { isMcpServerBlockedAtConnectTime, isMcpServerDenied, isMcpServerDisabled },
    { isLockedOutByOrgMcpPolicy },
    { isRemoteManagedSettingsColdStartPending },
    { AwayRecheck },
    { isAwayRecheckOnCached },
  ] = await Promise.all([
    import("../../services/analytics/violinGates.js"),
    import("../../services/analytics/violinTipGate.js"),
    import("../../services/analytics/lazyDoveGate.js"),
    import("../../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
    import("../../services/remoteTools/servingGates.js"),
    import("./sessionEventTransport.js"),
    import("../../services/analytics/index.js"),
    import("../../services/analytics/safeMetadata.js"),
    import("../../services/analytics/featureTelemetry.js"),
    import("../../services/mcp/toolSchemaSendability.js"),
    import("../../services/deviceBridge/passthroughMarker.js"),
    import("../../services/mcp/config.js"),
    import("../../services/mcp/orgMcpPolicyLockout.js"),
    import("../../services/remoteManagedSettings/loader.js"),
    import("../../services/remoteTools/AwayRecheck.js"),
    import("../../services/remoteTools/awayRecheckFlag.js"),
  ]);
  let awayRecheck = options.toolState.get(AwayRecheck);
  awayRecheck.start({
    registry: backgroundCommands,
    isEnabled: () => isAwayRecheckOnCached() && isRemoteToolForwardingEnabledCached(),
    random: Math.random,
    schedule: (tick, delayMs) => {
      let timer = setTimeout(tick, delayMs);
      timer.unref();
      return () => clearTimeout(timer);
    },
  });
  let now = Date.now();
  let machineMcpToolsPolicy = () => {
    if (isSafeMode()) return "denied";
    if (Date.now() - now < ANNOUNCE_PENDING_WINDOW_MS && isRemoteManagedSettingsColdStartPending())
      return "pending";
    let bridgeServer = options.bridgeServer?.();
    if (bridgeServer === undefined) {
      let sessionPrefixes = ownSessionIdPrefixes();
      let flattened = sessionPrefixes.flatMap((prefix) => buildCcrMcpProxyUrls(prefix));
      let flattened_2 = ["cse_", "session_"]
        .filter((prefix) => !sessionPrefixes.includes(prefix))
        .flatMap((prefix) => buildCcrMcpProxyUrls(prefix));
      return flattened.length === 0 ||
        flattened.some((url) =>
          isLockedOutByOrgMcpPolicy(REMOTE_DEVICES, {
            type: "http",
            url,
            scope: "dynamic",
          }),
        ) ||
        flattened_2.some((url) =>
          isMcpServerDenied(REMOTE_DEVICES, {
            type: "http",
            url,
            scope: "dynamic",
          }),
        )
        ? "denied"
        : "allowed";
    }
    return isMcpServerBlockedAtConnectTime(bridgeServer.name, bridgeServer.config) ? "denied" : "allowed";
  };
  let cachedSessionChannelTools = createCachedSessionChannelTools(backgroundCommands, () => {
    let config = options.bridgeServer?.()?.config;
    return config !== undefined && "toolPermissions" in config ? config.toolPermissions : undefined;
  });
  let machineMcpToolsDenied = () => {
    let bridgeServer = options.bridgeServer?.();
    return bridgeServer !== undefined ? bridgeServer.disabled === true : isMcpServerDisabled(REMOTE_DEVICES);
  };
  let isMachineToolsAllowed = () =>
    isRemoteToolForwardingEnabledCached() &&
    adoptMcpOverChannelSwitchOn() &&
    machineMcpToolsPolicy() === "allowed" &&
    !machineMcpToolsDenied();
  let guard = (produce, fallback) => () => {
    try {
      return produce();
    } catch (error) {
      logError(toError(error));
      return fallback;
    }
  };
  let hostOnlyTools = memoizeLast((items) => items.filter(({ tool }) => isHostOnlyNativeTool(tool)));
  options.toolState.get(BridgeToolProvider).provide(
    guard(
      () =>
        isMachineToolsAllowed()
          ? cachedSessionChannelTools()
          : isRemoteToolForwardingEnabledCached()
            ? hostOnlyTools(cachedSessionChannelTools())
            : EMPTY_ANNOUNCE_ITEMS,
      EMPTY_ANNOUNCE_ITEMS,
    ),
    guard(isMachineToolsAllowed, false),
    (toolName) =>
      backgroundCommands.withdrawnThisLife(toolName) ||
      backgroundCommands.entries().some((entry) => entry.name === toolName),
  );
  return {
    readAccountFlag: async () => {
      if (await isViolinWoodEnabled()) return "on";
      if (isAccountGateServed("tengu_violin_wood")) return "off";
      refreshGrowthBookFeatures().catch(() => {});
      return "pending";
    },
    flagWaitCapMs: 5000,
    switches: () => {
      if (isSessionChannelDisabled()) return "channel_off";
      if (!isRemoteToolForwardingSwitchOn()) return "switch_off";
      return isRemoteEnvPlaceholder() && options.sender.enforcesDevicePolicy?.() !== true
        ? "no_device_policy"
        : "on";
    },
    now: Date.now,
    workerEpoch:
      options.workerEpoch !== undefined && Number.isInteger(options.workerEpoch) && options.workerEpoch >= 1
        ? options.workerEpoch
        : 1,
    registry: backgroundCommands,
    forwardingOff: options.toolState.get(ToolHostsForwardingState),
    machineMcpToolsPolicy,
    deviceBridgeServerPresent: () => options.bridgeServer?.() !== undefined,
    adoptsMcpTools: adoptMcpOverChannelSwitchOn,
    sleepNoticeOn: isSleepNoticeOnCached,
    stillHereOn: isStillHereOnCached,
    passthroughAdoption: {
      admitsName: mayBePassthroughTool,
      judgeSchema: (tool) =>
        judgeToolSchemaSendability(tool, {
          normalizeEnabled: true,
          apiValidateEnabled: true,
        }),
    },
    forwardedCalls: options.toolState.get(RemoteAskSeat),
    transportFor: (callId) =>
      createSessionEventTransport({
        host: () => backgroundCommands.handleFor(callId),
        signedOff: () => backgroundCommands.withdrawnThisLife(callId),
        leftFor: () => backgroundCommands.withdrawnFor(callId),
        sender: options.sender,
        rechecked: () => awayRecheck.checking(callId),
      }),
    ...(options.sender.abandonServedCalls !== undefined && {
      abandonCalls: (callId, args) => options.sender.abandonServedCalls?.(callId, args) ?? 0,
    }),
    telemetry: {
      announce: (event) => {
        logEvent("tengu_remote_tools_announce", {
          outcome: fromEnum(event.outcome),
          served: event.served,
          ignored: event.ignored,
          passthrough: event.passthrough,
          passthrough_adopted: event.passthrough_adopted,
          passthrough_ignored: event.passthrough_ignored,
          passthrough_declined: fromEnumOpt(event.passthrough_declined),
          device_bridge_server_present: event.device_bridge_server_present,
          plumbing: event.plumbing,
          displaced: event.displaced,
          host_interface_version: event.host_interface?.version,
          host_interface_min_version: event.host_interface?.min_version,
        });
        if (event.displaced)
          logEvent("tengu_remote_tool_targets", {
            event: lit("displaced"),
            source: lit("session"),
          });
        switch (event.outcome) {
          case "announced":
          case "withdrawn":
            logFeatureOk("remote_tools_announce");
            break;
          case "not_ready":
            logFeatureSad("remote_tools_announce", event.outcome);
            break;
          default:
            logFeatureBad("remote_tools_announce", event.outcome);
        }
      },
      published: (event) =>
        logEvent("tengu_remote_passthrough_published", {
          count: event.count,
          removed: event.removed,
          reason: fromEnum(event.reason),
        }),
    },
  };
}
export { handleRemoteToolsAnnounce, createSessionChannelTools };
