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
  jX,
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
import { Clr, parseAnnouncedTools } from "./toolDescriptors.js";
import { SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { ownSessionIdPrefixes, buildCcrMcpProxyUrls } from "../../services/analytics/metadata.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { logError } from "../../utils/log.js";
import { _2 } from "../../services/api/deferredToolsState.js";
import { BridgeToolProvider } from "../../bridge/bridgePermissionResponse.js";
import { ToolHostsForwardingState } from "./toolHostsNotice.js";
import { RemoteAskSeat } from "../../services/remoteTools/remoteAskSeat.js";

//@ chunk-qqkcdb5s.js:6117-6186 placement
function X() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-qqkcdb5s.js:6186-6333 placement
var SESSION_CHANNEL_SERVER_CONFIG = {
  serverName: jX,
  scope: "dynamic",
  serverType: "http",
  source: "dynamic",
  skipPrefix: !1,
  serverAlwaysLoad: !1,
  isFirstPartyDesignServer: !1,
  cliOwned: !1,
};
//@ chunk-qqkcdb5s.js:6333-6545 placement
function buildSessionChannelTools(e, r) {
  return [
    ...e
      .entries()
      .toSorted((s, h) => s.name.localeCompare(h.name))
      .flatMap(powerShellPromptToolsFor),
    ...e
      .entries()
      .flatMap((s) =>
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
    let generation = e.generation(),
      g = r();
    if (s === void 0 || s.generation !== generation || s.ceilings !== g)
      s = { generation: generation, ceilings: g, tools: buildSessionChannelTools(e, g) };
    return s.tools;
  };
}
//@ chunk-qqkcdb5s.js:6837-7364 placement
function toSessionChannelTool(e, r, s) {
  let h = recursivelySanitizeUnicode({
    name: r.name,
    description: r.description ?? "",
    inputSchema: { ...r.input_schema, type: "object" },
    ...(r.annotations !== void 0 && { annotations: r.annotations }),
    ...(r.hints !== void 0 && { _meta: sessionToolMeta(r.hints) }),
  });
  return X().composeMcpTool({
    ...SESSION_CHANNEL_SERVER_CONFIG,
    standardKey: isStandardKeyActive() ? { key: jX, pinned: !0 } : void 0,
    effectiveMaxPermission: s,
    listed: h,
    async call() {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r.name} is one of ${e}'s own MCP tools; the session runs it on that machine and it cannot run here.`,
        "session-channel MCP tool called without being routed to its machine",
      );
    },
  });
}
//@ chunk-qqkcdb5s.js:7364-7692 placement
function sessionToolMeta(e) {
  return {
    ...(e.search_hint !== void 0 && { [TOOL_META_KEYS.searchHint]: e.search_hint }),
    ...(e.always_load !== void 0 && { [TOOL_META_KEYS.alwaysLoad]: e.always_load }),
    ...(e.max_result_size_chars !== void 0 && {
      [TOOL_META_KEYS.maxResultSizeChars]: e.max_result_size_chars,
    }),
    ...(e.requires_user_interaction !== void 0 && {
      [TOOL_META_KEYS.requiresUserInteraction]: e.requires_user_interaction,
    }),
  };
}
//@ chunk-qqkcdb5s.js:7692-7714 placement
var ne = 32,
  re = 200,
  H = [];
//@ chunk-qqkcdb5s.js:7714-7815 placement
function memoizeLast(e) {
  let r;
  return (s) => {
    if (r === void 0 || r.input !== s) r = { input: s, result: e(s) };
    return r.result;
  };
}
//@ chunk-qqkcdb5s.js:7815-7882 placement
var se = { allowed: void 0, denied: "policy", pending: "pending" },
  ie = 30000;
//@ chunk-qqkcdb5s.js:7882-7964 placement
function I(e) {
  return new Set(e.entries().flatMap((r) => [...r.passthrough.keys()]));
}
/**
 * 处理附着机器发来的 remote_tools_announce：校验嵌套深度/大小/epoch，登记其工具（served/passthrough/plumbing）。
 */
//@ chunk-qqkcdb5s.js:7964-13673 placement
function handleRemoteToolsAnnounce(e) {
  let r = {
      served: 0,
      ignored: 0,
      passthrough: 0,
      passthrough_adopted: 0,
      passthrough_ignored: 0,
      passthrough_declined: void 0,
      plumbing: 0,
      displaced: !1,
    },
    s = (d, n) => (e.telemetry.announce({ outcome: d, ...r }), { kind: "error", error: n }),
    h = (d, n) => {
      let u = I(e.registry),
        p = count([...d], (i) => !u.has(i));
      if (p > 0 || u.size !== d.size) e.telemetry.published({ count: u.size, removed: p, reason: n });
    },
    g = (d, n, u, p, i) => {
      if ((e.registry.clear(), h(i, "gate_off"), isEmptyAnnouncement(u))) e.forwardingOff.withdrew(p);
      else if (d !== "disabled_channel_off") e.forwardingOff.refused(p, d);
      return s(d, n);
    },
    v = (d, n) => {
      let u = e.abandonCalls?.(d, n) ?? 0,
        addressedTo = e.forwardedCalls.addressedTo(d),
        i = 0,
        f = 0;
      for (let w of addressedTo) {
        if (w.withdrawInherited()) f += 1;
        if (!w.askOutstanding) continue;
        (w.endAsk(normalizeWithdrawReason(n)), (i += 1));
      }
      logRemoteTools(void 0, "serving instance gone", {
        host_inst: d,
        why: n,
        legs_abandoned: u,
        calls_addressed: addressedTo.length,
        asks_ended: i,
        inherited_withdrawn: f,
      });
    };
  return {
    async handle(d) {
      if (!withinDepth(d, ne)) return s("invalid", "invalid_announce: request nested too deep");
      if (jsonStringifyRaw(d).length > Clr)
        return s("invalid", "invalid_announce: request larger than 1 MiB");
      let safeParse = SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema().safeParse(d);
      if (!safeParse.success) {
        let c = safeParse.error.issues[0];
        return s(
          "invalid",
          `invalid_announce: ${sanitizeDisplayText(`${c?.path.join(".") ?? ""} ${c?.message ?? "malformed"}`, { maxCodeUnits: re })}`,
        );
      }
      let u = !e.adoptsMcpTools()
          ? "switched_off"
          : safeParse.data.passthrough.length === 0
            ? void 0
            : se[e.machineMcpToolsPolicy()],
        p = safeParse.data.passthrough.length > 0 ? e.deviceBridgeServerPresent() : void 0,
        i = parseAnnouncedTools(
          safeParse.data,
          u === void 0 ? e.passthroughAdoption : { ...e.passthroughAdoption, admitsName: () => !1 },
        );
      if (i === void 0)
        return s(
          "invalid",
          typeof safeParse.data.host.epoch !== "string" && parseAdvert(safeParse.data.host) !== void 0
            ? "invalid_announce: host.epoch is required on this channel"
            : "invalid_announce: host is not a readable machine description (name a lowercase slug other than container/this-machine, an epoch, kind, platform, working_dir and limits)",
        );
      if (safeParse.data.worker_epoch !== void 0 && safeParse.data.worker_epoch !== e.workerEpoch)
        return s("stale_epoch", `stale_worker_epoch: worker epoch is ${e.workerEpoch}`);
      if (i.host.capabilities?.includes(STILL_HERE) === !0) {
        let found = e.registry.entries().find((R) => R.name === i.host.name);
        if (found?.instanceId !== safeParse.data.instance_id)
          return {
            kind: "error",
            error: "invalid_announce: only the client that holds a machine can say it is still here",
          };
        let b =
          e.switches() === "on" &&
          e.stillHereOn() &&
          e.forwardedCalls.addressedTo(found.instanceId).some((R) => !R.askOutstanding) &&
          e.registry.noteStillHere(found.instanceId, e.now());
        return (
          logRemoteTools(void 0, "machine still here", { host_inst: found.instanceId, noted: b }),
          {
            kind: "success",
            response: {
              status: "announced",
              worker_epoch: e.workerEpoch,
              protocol_version: found.protocol.kind === "compatible" ? found.protocol.version : null,
            },
          }
        );
      }
      let f = I(e.registry);
      switch (e.switches()) {
        case "channel_off":
          return g(
            "disabled_channel_off",
            "remote_tools_disabled: session_channel_off",
            i,
            safeParse.data.instance_id,
            f,
          );
        case "switch_off":
          return g(
            "disabled_switch_off",
            "remote_tools_disabled: switch_off",
            i,
            safeParse.data.instance_id,
            f,
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
          if (isEmptyAnnouncement(i)) e.forwardingOff.withdrew(safeParse.data.instance_id);
          else if ((e.forwardingOff.reason() ?? "not_ready") === "not_ready")
            e.forwardingOff.refused(safeParse.data.instance_id, "not_ready");
          return s("not_ready", "remote_tools_not_ready: feature flags not yet available; retry");
        case "off":
          return g("disabled_flag_off", "remote_tools_disabled: flag_off", i, safeParse.data.instance_id, f);
        case "on":
          break;
      }
      if (i.host.capabilities?.includes(MACHINE_PRESENCE_STATES) === !0 && e.sleepNoticeOn()) {
        let found = e.registry.entries().find((b) => b.name === i.host.name);
        if (found?.instanceId !== safeParse.data.instance_id)
          return {
            kind: "error",
            error: "invalid_announce: only the client that holds a machine can say it sleeps",
          };
        return (
          e.registry.markAsleep(found.instanceId, e.now()),
          logRemoteTools(void 0, "machine asleep", { host_inst: found.instanceId }),
          {
            kind: "success",
            response: {
              status: "announced",
              worker_epoch: e.workerEpoch,
              protocol_version: found.protocol.kind === "compatible" ? found.protocol.version : null,
            },
          }
        );
      }
      e.forwardingOff.clear();
      let accept = e.registry.accept(i, {
          instanceId: safeParse.data.instance_id,
          now: e.now(),
          transport: e.transportFor(i.host.name),
        }),
        S = {
          ignored: accept.ignoredTools.length,
          passthrough: safeParse.data.passthrough.length,
          passthrough_ignored: safeParse.data.passthrough.length - i.passthrough.length,
          passthrough_declined: safeParse.data.passthrough.length > 0 ? u : void 0,
          device_bridge_server_present: p,
          plumbing: i.plumbing.length,
        },
        T = {
          ...(u !== "switched_off" &&
            u !== "pending" && {
              passthrough_adopted: accept.status === "announced" ? accept.passthroughAdopted : 0,
            }),
          ...(S.passthrough_declined === "policy" && { passthrough_declined: "policy" }),
          ...(S.passthrough_declined === "pending" && { passthrough_declined: "pending" }),
        },
        E = accept.ignoredTools.length > 0 ? { ignored_tools: accept.ignoredTools.slice(0, 32) } : {};
      switch (accept.status) {
        case "withdrawn":
          if (accept.heldByAnother)
            logForDebugging(
              `[remote-tools] ${i.host.name}: a withdrawal from client instance ${safeParse.data.instance_id} names a machine another instance announced since; kept`,
            );
          if (accept.removed.length > 0) v(safeParse.data.instance_id, "withdrawn");
          return (
            h(f, "withdrawn"),
            e.telemetry.announce({
              outcome: "withdrawn",
              served: 0,
              passthrough_adopted: 0,
              ...S,
              displaced: !1,
            }),
            {
              kind: "success",
              response: {
                status: "withdrawn",
                worker_epoch: e.workerEpoch,
                protocol_version: null,
                ...T,
                ...E,
              },
            }
          );
        case "announced":
          if (accept.displaced !== void 0)
            (logForDebugging(
              `[remote-tools] ${i.host.name}: client instance ${safeParse.data.instance_id} now announces this machine (was ${accept.displaced}); calls go to the newcomer`,
            ),
              v(accept.displaced, "displaced"));
          return (
            h(f, accept.displaced !== void 0 ? "displaced" : "announced"),
            e.telemetry.announce({
              outcome: "announced",
              served: accept.served,
              passthrough_adopted: accept.passthroughAdopted,
              ...S,
              displaced: accept.displaced !== void 0,
              host_interface: i.host.tool_host_interface,
            }),
            {
              kind: "success",
              response: {
                status: "announced",
                worker_epoch: e.workerEpoch,
                protocol_version: accept.protocolVersion,
                ...T,
                ...E,
                ...(i.host.capabilities?.includes(SAYS_STILL_HERE) === !0 &&
                  e.stillHereOn() && { worker_capabilities: [STILL_HERE_TEXT] }),
              },
            }
          );
      }
    },
  };
}
/**
 * 为云会话构建会话通道工具：附着机器公告的工具成为本会话可调用的 MCP 风格工具。
 */
//@ chunk-qqkcdb5s.js:13673-17659 placement
async function createSessionChannelTools(e) {
  let r = e.toolState.get(RemoteBackgroundCommands),
    [
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
    ]),
    k = e.toolState.get(z);
  k.start({
    registry: r,
    isEnabled: () => K() && u(),
    random: Math.random,
    schedule: (o, m) => {
      let y = setTimeout(o, m);
      return (y.unref(), () => clearTimeout(y));
    },
  });
  let now = Date.now(),
    A = () => {
      if (isSafeMode()) return "denied";
      if (Date.now() - now < ie && V()) return "pending";
      let o = e.bridgeServer?.();
      if (o === void 0) {
        let m = ownSessionIdPrefixes(),
          flattened = m.flatMap((_) => buildCcrMcpProxyUrls(_)),
          flattened_2 = ["cse_", "session_"]
            .filter((_) => !m.includes(_))
            .flatMap((_) => buildCcrMcpProxyUrls(_));
        return flattened.length === 0 ||
          flattened.some((_) => W(REMOTE_DEVICES, { type: "http", url: _, scope: "dynamic" })) ||
          flattened_2.some((_) => j(REMOTE_DEVICES, { type: "http", url: _, scope: "dynamic" }))
          ? "denied"
          : "allowed";
      }
      return x(o.name, o.config) ? "denied" : "allowed";
    },
    M = createCachedSessionChannelTools(r, () => {
      let o = e.bridgeServer?.()?.config;
      return o !== void 0 && "toolPermissions" in o ? o.toolPermissions : void 0;
    }),
    G = () => {
      let o = e.bridgeServer?.();
      return o !== void 0 ? o.disabled === !0 : B(REMOTE_DEVICES);
    },
    O = () => u() && n() && A() === "allowed" && !G(),
    P = (o, m) => () => {
      try {
        return o();
      } catch (error) {
        return (logError(toError(error)), m);
      }
    },
    U = memoizeLast((o) => o.filter(({ tool: tool }) => _2(tool)));
  return (
    e.toolState.get(BridgeToolProvider).provide(
      P(() => (O() ? M() : u() ? U(M()) : H), H),
      P(O, !1),
      (o) => r.withdrawnThisLife(o) || r.entries().some((m) => m.name === o),
    ),
    {
      readAccountFlag: async () => {
        if (await h()) return "on";
        if (s("tengu_violin_wood")) return "off";
        return (d().catch(() => {}), "pending");
      },
      flagWaitCapMs: 5000,
      switches: () => (i() ? "channel_off" : p() ? "on" : "switch_off"),
      now: Date.now,
      workerEpoch:
        e.workerEpoch !== void 0 && Number.isInteger(e.workerEpoch) && e.workerEpoch >= 1 ? e.workerEpoch : 1,
      registry: r,
      forwardingOff: e.toolState.get(ToolHostsForwardingState),
      machineMcpToolsPolicy: A,
      deviceBridgeServerPresent: () => e.bridgeServer?.() !== void 0,
      adoptsMcpTools: n,
      sleepNoticeOn: g,
      stillHereOn: v,
      passthroughAdoption: {
        admitsName: L,
        judgeSchema: (o) => R(o, { normalizeEnabled: !0, apiValidateEnabled: !0 }),
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
      ...(e.sender.abandonServedCalls !== void 0 && {
        abandonCalls: (o, m) => e.sender.abandonServedCalls?.(o, m) ?? 0,
      }),
      telemetry: {
        announce: (o) => {
          if (
            (w("tengu_remote_tools_announce", {
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
            }),
            o.displaced)
          )
            w("tengu_remote_tool_targets", { event: T("displaced"), source: T("session") });
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
    }
  );
}
