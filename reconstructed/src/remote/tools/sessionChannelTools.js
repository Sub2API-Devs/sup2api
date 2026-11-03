/**
 * remote/tools/sessionChannelTools.ts
 *
 * 2.1.316 新增：会话通道工具（处理远程工具通告并转为本地工具）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qqkcdb5s.js (13)
 * attribution: placement 13
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
import { count } from "../../utils/collections.js";
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
import { isSafeMode } from "../../utils/envUtils.js";
import { ownSessionIdPrefixes, buildCcrMcpProxyUrls } from "../../services/analytics/metadata.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { logError } from "../../utils/log.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { BridgeToolProvider } from "../../bridge/bridgePermissionResponse.js";
import { ToolHostsForwardingState } from "./toolHostsNotice.js";
import { RemoteAskSeat } from "../../services/remoteTools/remoteAskSeat.js";

//@ chunk-qqkcdb5s.js:6117-6186 placement
function loadMcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-qqkcdb5s.js:6186-6333 placement
var SESSION_CHANNEL_SERVER_CONFIG = {
  serverName: REMOTE_DEVICES_SERVER_NAME,
  scope: "dynamic",
  serverType: "http",
  source: "dynamic",
  skipPrefix: false,
  serverAlwaysLoad: false,
  isFirstPartyDesignServer: false,
  cliOwned: false,
};
//@ chunk-qqkcdb5s.js:6333-6545 placement
function buildSessionChannelTools(e, r) {
  return [
    ...e
      .entries()
      .toSorted((s, h) => s.name.localeCompare(h.name))
      .flatMap(powerShellPromptToolsFor),
    ...e.entries().flatMap((s) =>
      [...s.passthrough.values()].map((h) => ({
        tool: toSessionChannelTool(s.name, h, r?.[h.name]),
        machine: s.name,
      })),
    ),
  ];
}
//@ chunk-qqkcdb5s.js:6545-6659 placement
function powerShellPromptToolsFor(e) {
  return e.servedTools.has(POWERSHELL_TOOL_NAME) && !isPowerShellToolEnabled()
    ? [
        {
          tool: sessionChannelPowerShellPrompt(e.name, parseShellCapabilityTag(e.description.shell)),
          machine: e.name,
        },
      ]
    : [];
}
//@ chunk-qqkcdb5s.js:6659-6837 placement
function createCachedSessionChannelTools(
  e,
  r = () => {
    return;
  },
) {
  let s;
  return () => {
    let h = e.generation();
    let g = r();
    if (s === undefined || s.generation !== h || s.ceilings !== g)
      s = {
        generation: h,
        ceilings: g,
        tools: buildSessionChannelTools(e, g),
      };
    return s.tools;
  };
}
//@ chunk-qqkcdb5s.js:6837-7364 placement
function toSessionChannelTool(name, r, effectiveMaxPermission) {
  let listed = recursivelySanitizeUnicode({
    name: r.name,
    description: r.description ?? "",
    inputSchema: {
      ...r.input_schema,
      type: "object",
    },
    ...(r.annotations !== undefined && {
      annotations: r.annotations,
    }),
    ...(r.hints !== undefined && {
      _meta: sessionToolMeta(r.hints),
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
        `${r.name} is one of ${name}'s own MCP tools; the session runs it on that machine and it cannot run here.`,
        "session-channel MCP tool called without being routed to its machine",
      );
    },
  });
}
//@ chunk-qqkcdb5s.js:7364-7692 placement
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
//@ chunk-qqkcdb5s.js:7692-7714 placement
var MAX_ANNOUNCE_DEPTH = 32;
var MAX_ANNOUNCE_ITEMS = 200;
var EMPTY_ANNOUNCE_ITEMS = [];
//@ chunk-qqkcdb5s.js:7714-7815 placement
function memoizeLast(e) {
  let r;
  return (s) => {
    if (r === undefined || r.input !== s)
      r = {
        input: s,
        result: e(s),
      };
    return r.result;
  };
}
//@ chunk-qqkcdb5s.js:7815-7882 placement
var MACHINE_TOOLS_POLICY_STATES = {
  allowed: undefined,
  denied: "policy",
  pending: "pending",
};
var ANNOUNCE_PENDING_WINDOW_MS = 30000;
//@ chunk-qqkcdb5s.js:7882-7964 placement
function collectPassthroughToolNames(registry) {
  return new Set(registry.entries().flatMap((r) => [...r.passthrough.keys()]));
}
//@ chunk-qqkcdb5s.js:7964-13673 placement
/**
 * 处理附着机器发来的 remote_tools_announce：校验嵌套深度/大小/epoch，登记其工具（served/passthrough/plumbing）。
 */
function handleRemoteToolsAnnounce(e) {
  let r = {
    served: 0,
    ignored: 0,
    passthrough: 0,
    passthrough_adopted: 0,
    passthrough_ignored: 0,
    passthrough_declined: undefined,
    plumbing: 0,
    displaced: false,
  };
  let s = (outcome, error) => {
    e.telemetry.announce({
      outcome,
      ...r,
    });
    return {
      kind: "error",
      error,
    };
  };
  let h = (passthroughToolNames, reason) => {
    let passthroughToolNames_2 = collectPassthroughToolNames(e.registry);
    let p = count([...passthroughToolNames], (i) => !passthroughToolNames_2.has(i));
    if (p > 0 || passthroughToolNames_2.size !== passthroughToolNames.size)
      e.telemetry.published({
        count: passthroughToolNames_2.size,
        removed: p,
        reason,
      });
  };
  let g = (outcome, error, announcedTools, instanceId, passthroughToolNames) => {
    e.registry.clear();
    h(passthroughToolNames, "gate_off");
    if (isEmptyAnnouncement(announcedTools)) e.forwardingOff.withdrew(instanceId);
    else if (outcome !== "disabled_channel_off") e.forwardingOff.refused(instanceId, outcome);
    return s(outcome, error);
  };
  let v = (d, n) => {
    let legsAbandoned = e.abandonCalls?.(d, n) ?? 0;
    let p = e.forwardedCalls.addressedTo(d);
    let asksEnded = 0;
    let inheritedWithdrawn = 0;
    for (let w of p) {
      if (w.withdrawInherited()) inheritedWithdrawn += 1;
      if (!w.askOutstanding) continue;
      w.endAsk(normalizeWithdrawReason(n));
      asksEnded += 1;
    }
    logRemoteTools(undefined, "serving instance gone", {
      host_inst: d,
      why: n,
      legs_abandoned: legsAbandoned,
      calls_addressed: p.length,
      asks_ended: asksEnded,
      inherited_withdrawn: inheritedWithdrawn,
    });
  };
  return {
    async handle(d) {
      if (!withinDepth(d, MAX_ANNOUNCE_DEPTH))
        return s("invalid", "invalid_announce: request nested too deep");
      if (jsonStringifyRaw(d).length > MAX_RESULT_SIZE_HINT)
        return s("invalid", "invalid_announce: request larger than 1 MiB");
      let n = SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema().safeParse(d);
      if (!n.success) {
        let c = n.error.issues[0];
        return s(
          "invalid",
          `invalid_announce: ${sanitizeDisplayText(
            `${c?.path.join(".") ?? ""} ${c?.message ?? "malformed"}`,
            {
              maxCodeUnits: MAX_ANNOUNCE_ITEMS,
            },
          )}`,
        );
      }
      let u = !e.adoptsMcpTools()
        ? "switched_off"
        : n.data.passthrough.length === 0
          ? undefined
          : MACHINE_TOOLS_POLICY_STATES[e.machineMcpToolsPolicy()];
      let deviceBridgeServerPresent =
        n.data.passthrough.length > 0 ? e.deviceBridgeServerPresent() : undefined;
      let announcedTools = parseAnnouncedTools(
        n.data,
        u === undefined
          ? e.passthroughAdoption
          : {
              ...e.passthroughAdoption,
              admitsName: () => false,
            },
      );
      if (announcedTools === undefined)
        return s(
          "invalid",
          typeof n.data.host.epoch !== "string" && parseAdvert(n.data.host) !== undefined
            ? "invalid_announce: host.epoch is required on this channel"
            : "invalid_announce: host is not a readable machine description (name a lowercase slug other than container/this-machine, an epoch, kind, platform, working_dir and limits)",
        );
      if (n.data.worker_epoch !== undefined && n.data.worker_epoch !== e.workerEpoch)
        return s("stale_epoch", `stale_worker_epoch: worker epoch is ${e.workerEpoch}`);
      if (announcedTools.host.capabilities?.includes(STILL_HERE) === true) {
        let found = e.registry.entries().find((R) => R.name === announcedTools.host.name);
        if (found?.instanceId !== n.data.instance_id)
          return {
            kind: "error",
            error: "invalid_announce: only the client that holds a machine can say it is still here",
          };
        let noted =
          e.switches() === "on" &&
          e.stillHereOn() &&
          e.forwardedCalls.addressedTo(found.instanceId).some((R) => !R.askOutstanding) &&
          e.registry.noteStillHere(found.instanceId, e.now());
        logRemoteTools(undefined, "machine still here", {
          host_inst: found.instanceId,
          noted,
        });
        return {
          kind: "success",
          response: {
            status: "announced",
            worker_epoch: e.workerEpoch,
            protocol_version: found.protocol.kind === "compatible" ? found.protocol.version : null,
          },
        };
      }
      let passthroughToolNames = collectPassthroughToolNames(e.registry);
      switch (e.switches()) {
        case "channel_off":
          return g(
            "disabled_channel_off",
            "remote_tools_disabled: session_channel_off",
            announcedTools,
            n.data.instance_id,
            passthroughToolNames,
          );
        case "switch_off":
          return g(
            "disabled_switch_off",
            "remote_tools_disabled: switch_off",
            announcedTools,
            n.data.instance_id,
            passthroughToolNames,
          );
        case "on":
          break;
      }
      switch (
        (await withDeadline(
          e.readAccountFlag().catch(() => "pending"),
          e.flagWaitCapMs,
        )) ??
        "pending"
      ) {
        case "pending":
          if (isEmptyAnnouncement(announcedTools)) e.forwardingOff.withdrew(n.data.instance_id);
          else if ((e.forwardingOff.reason() ?? "not_ready") === "not_ready")
            e.forwardingOff.refused(n.data.instance_id, "not_ready");
          return s("not_ready", "remote_tools_not_ready: feature flags not yet available; retry");
        case "off":
          return g(
            "disabled_flag_off",
            "remote_tools_disabled: flag_off",
            announcedTools,
            n.data.instance_id,
            passthroughToolNames,
          );
        case "on":
          break;
      }
      if (announcedTools.host.capabilities?.includes(MACHINE_PRESENCE_STATES) === true && e.sleepNoticeOn()) {
        let found = e.registry.entries().find((b) => b.name === announcedTools.host.name);
        if (found?.instanceId !== n.data.instance_id)
          return {
            kind: "error",
            error: "invalid_announce: only the client that holds a machine can say it sleeps",
          };
        e.registry.markAsleep(found.instanceId, e.now());
        logRemoteTools(undefined, "machine asleep", {
          host_inst: found.instanceId,
        });
        return {
          kind: "success",
          response: {
            status: "announced",
            worker_epoch: e.workerEpoch,
            protocol_version: found.protocol.kind === "compatible" ? found.protocol.version : null,
          },
        };
      }
      e.forwardingOff.clear();
      let a = e.registry.accept(announcedTools, {
        instanceId: n.data.instance_id,
        now: e.now(),
        transport: e.transportFor(announcedTools.host.name),
      });
      let S = {
        ignored: a.ignoredTools.length,
        passthrough: n.data.passthrough.length,
        passthrough_ignored: n.data.passthrough.length - announcedTools.passthrough.length,
        passthrough_declined: n.data.passthrough.length > 0 ? u : undefined,
        device_bridge_server_present: deviceBridgeServerPresent,
        plumbing: announcedTools.plumbing.length,
      };
      let T = {
        ...(u !== "switched_off" &&
          u !== "pending" && {
            passthrough_adopted: a.status === "announced" ? a.passthroughAdopted : 0,
          }),
        ...(S.passthrough_declined === "policy" && {
          passthrough_declined: "policy",
        }),
        ...(S.passthrough_declined === "pending" && {
          passthrough_declined: "pending",
        }),
      };
      let E =
        a.ignoredTools.length > 0
          ? {
              ignored_tools: a.ignoredTools.slice(0, 32),
            }
          : {};
      switch (a.status) {
        case "withdrawn":
          if (a.heldByAnother)
            logForDebugging(
              `[remote-tools] ${announcedTools.host.name}: a withdrawal from client instance ${n.data.instance_id} names a machine another instance announced since; kept`,
            );
          if (a.removed.length > 0) v(n.data.instance_id, "withdrawn");
          h(passthroughToolNames, "withdrawn");
          e.telemetry.announce({
            outcome: "withdrawn",
            served: 0,
            passthrough_adopted: 0,
            ...S,
            displaced: false,
          });
          return {
            kind: "success",
            response: {
              status: "withdrawn",
              worker_epoch: e.workerEpoch,
              protocol_version: null,
              ...T,
              ...E,
            },
          };
        case "announced":
          if (a.displaced !== undefined) {
            logForDebugging(
              `[remote-tools] ${announcedTools.host.name}: client instance ${n.data.instance_id} now announces this machine (was ${a.displaced}); calls go to the newcomer`,
            );
            v(a.displaced, "displaced");
          }
          h(passthroughToolNames, a.displaced !== undefined ? "displaced" : "announced");
          e.telemetry.announce({
            outcome: "announced",
            served: a.served,
            passthrough_adopted: a.passthroughAdopted,
            ...S,
            displaced: a.displaced !== undefined,
            host_interface: announcedTools.host.tool_host_interface,
          });
          return {
            kind: "success",
            response: {
              status: "announced",
              worker_epoch: e.workerEpoch,
              protocol_version: a.protocolVersion,
              ...T,
              ...E,
              ...(announcedTools.host.capabilities?.includes(SAYS_STILL_HERE) === true &&
                e.stillHereOn() && {
                  worker_capabilities: [STILL_HERE_TEXT],
                }),
            },
          };
      }
    },
  };
}
//@ chunk-qqkcdb5s.js:13673-17659 placement
/**
 * 为云会话构建会话通道工具：附着机器公告的工具成为本会话可调用的 MCP 风格工具。
 */
async function createSessionChannelTools(e) {
  let r = e.toolState.get(RemoteBackgroundCommands);
  let [
    { isAccountGateServed: s, isViolinWoodEnabled: h },
    { isSleepNoticeOnCached: g },
    { isStillHereOnCached: v },
    { refreshGrowthBookFeatures: d },
    {
      adoptMcpOverChannelSwitchOn: n,
      isRemoteToolForwardingEnabledCached: u,
      isRemoteToolForwardingSwitchOn: p,
      isSessionChannelDisabled: i,
    },
    { createSessionEventTransport: f },
    { logEvent: w },
    { fromEnum: a, fromEnumOpt: S, lit: T },
    { logFeatureBad: E, logFeatureOk: c, logFeatureSad: b },
    { judgeToolSchemaSendability: R },
    { mayBePassthroughTool: L },
    { isMcpServerBlockedAtConnectTime: x, isMcpServerDenied: j, isMcpServerDisabled: B },
    { isLockedOutByOrgMcpPolicy: W },
    { isRemoteManagedSettingsColdStartPending: V },
    { AwayRecheck: z },
    { isAwayRecheckOnCached: K },
  ] = await Promise.all([
    import("./chunk-m288yvvf.js"),
    import("./chunk-dfs6nw1a.js"),
    import("./chunk-k7wbhh0r.js"),
    import("./chunk-6df1d6re.js"),
    import("./chunk-wcfcn49z.js"),
    import("./chunk-tg9pcd2j.js"),
    import("./chunk-ezz35vxh.js"),
    import("./chunk-01ass7n1.js"),
    import("./chunk-53at0fec.js"),
    import("./chunk-xv2h6pvf.js"),
    import("./chunk-ca1aqn71.js"),
    import("./chunk-hj6c79b7.js"),
    import("./chunk-zd7g8x0w.js"),
    import("./chunk-r42q9dtm.js"),
    import("./chunk-gvr0ybct.js"),
    import("./chunk-prmw23m3.js"),
  ]);
  let k = e.toolState.get(z);
  k.start({
    registry: r,
    isEnabled: () => K() && u(),
    random: Math.random,
    schedule: (o, m) => {
      let timer = setTimeout(o, m);
      timer.unref();
      return () => clearTimeout(timer);
    },
  });
  let now = Date.now();
  let A = () => {
    if (isSafeMode()) return "denied";
    if (Date.now() - now < ANNOUNCE_PENDING_WINDOW_MS && V()) return "pending";
    let o = e.bridgeServer?.();
    if (o === undefined) {
      let m = ownSessionIdPrefixes();
      let flattened = m.flatMap((_) => buildCcrMcpProxyUrls(_));
      let flattened_2 = ["cse_", "session_"]
        .filter((_) => !m.includes(_))
        .flatMap((_) => buildCcrMcpProxyUrls(_));
      return flattened.length === 0 ||
        flattened.some((url) =>
          W(REMOTE_DEVICES, {
            type: "http",
            url,
            scope: "dynamic",
          }),
        ) ||
        flattened_2.some((url) =>
          j(REMOTE_DEVICES, {
            type: "http",
            url,
            scope: "dynamic",
          }),
        )
        ? "denied"
        : "allowed";
    }
    return x(o.name, o.config) ? "denied" : "allowed";
  };
  let cachedSessionChannelTools = createCachedSessionChannelTools(r, () => {
    let config = e.bridgeServer?.()?.config;
    return config !== undefined && "toolPermissions" in config ? config.toolPermissions : undefined;
  });
  let G = () => {
    let o = e.bridgeServer?.();
    return o !== undefined ? o.disabled === true : B(REMOTE_DEVICES);
  };
  let O = () => u() && n() && A() === "allowed" && !G();
  let P = (o, m) => () => {
    try {
      return o();
    } catch (error) {
      logError(toError(error));
      return m;
    }
  };
  let U = memoizeLast((o) => o.filter(({ tool }) => isHostOnlyNativeTool(tool)));
  e.toolState.get(BridgeToolProvider).provide(
    P(
      () => (O() ? cachedSessionChannelTools() : u() ? U(cachedSessionChannelTools()) : EMPTY_ANNOUNCE_ITEMS),
      EMPTY_ANNOUNCE_ITEMS,
    ),
    P(O, false),
    (o) => r.withdrawnThisLife(o) || r.entries().some((m) => m.name === o),
  );
  return {
    readAccountFlag: async () => {
      if (await h()) return "on";
      if (s("tengu_violin_wood")) return "off";
      d().catch(() => {});
      return "pending";
    },
    flagWaitCapMs: 5000,
    switches: () => (i() ? "channel_off" : p() ? "on" : "switch_off"),
    now: Date.now,
    workerEpoch:
      e.workerEpoch !== undefined && Number.isInteger(e.workerEpoch) && e.workerEpoch >= 1
        ? e.workerEpoch
        : 1,
    registry: r,
    forwardingOff: e.toolState.get(ToolHostsForwardingState),
    machineMcpToolsPolicy: A,
    deviceBridgeServerPresent: () => e.bridgeServer?.() !== undefined,
    adoptsMcpTools: n,
    sleepNoticeOn: g,
    stillHereOn: v,
    passthroughAdoption: {
      admitsName: L,
      judgeSchema: (o) =>
        R(o, {
          normalizeEnabled: true,
          apiValidateEnabled: true,
        }),
    },
    forwardedCalls: e.toolState.get(RemoteAskSeat),
    transportFor: (o) =>
      f({
        host: () => r.handleFor(o),
        signedOff: () => r.withdrawnThisLife(o),
        leftFor: () => r.withdrawnFor(o),
        sender: e.sender,
        rechecked: () => k.checking(o),
      }),
    ...(e.sender.abandonServedCalls !== undefined && {
      abandonCalls: (o, m) => e.sender.abandonServedCalls?.(o, m) ?? 0,
    }),
    telemetry: {
      announce: (o) => {
        w("tengu_remote_tools_announce", {
          outcome: a(o.outcome),
          served: o.served,
          ignored: o.ignored,
          passthrough: o.passthrough,
          passthrough_adopted: o.passthrough_adopted,
          passthrough_ignored: o.passthrough_ignored,
          passthrough_declined: S(o.passthrough_declined),
          device_bridge_server_present: o.device_bridge_server_present,
          plumbing: o.plumbing,
          displaced: o.displaced,
          host_interface_version: o.host_interface?.version,
          host_interface_min_version: o.host_interface?.min_version,
        });
        if (o.displaced)
          w("tengu_remote_tool_targets", {
            event: T("displaced"),
            source: T("session"),
          });
        switch (o.outcome) {
          case "announced":
          case "withdrawn":
            c("remote_tools_announce");
            break;
          case "not_ready":
            b("remote_tools_announce", o.outcome);
            break;
          default:
            E("remote_tools_announce", o.outcome);
        }
      },
      published: (o) =>
        w("tengu_remote_passthrough_published", {
          count: o.count,
          removed: o.removed,
          reason: a(o.reason),
        }),
    },
  };
}
