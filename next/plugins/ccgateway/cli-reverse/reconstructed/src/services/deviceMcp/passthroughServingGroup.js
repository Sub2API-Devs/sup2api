/**
 * services/deviceMcp/passthroughServingGroup.ts
 *
 * 2.1.316 新增：把本机 MCP 服务器提供给云会话（同意检查、策略拒绝、工具变化重新同意、通知）；本机 MCP 透传相关的提示文本与通知键等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xqfbbyzk.js (10)
 * attribution: placement 10
 */
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import {
  subscribeGlobalConfigInstalled,
  getCurrentProjectConfig,
  getGlobalConfig,
} from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  deleteNotNowHint,
  shortServerLabel,
  readDeviceMcpConsent,
  deviceMcpConsentStore,
  readDeviceMcpNotNow,
  deviceMcpNotNowStore,
  containsAll,
  MCP_PASSTHROUGH,
} from "../deviceBridge/deviceMcpConsent.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { plural } from "../../utils/stringUtils.js";
import { isRemoteToolServingSwitchOn } from "../remoteTools/servingGates.js";
import {
  getDeviceBridgeMcpConfigs_2,
  isDeviceMcpDenied,
  isDeviceScopeEnabled,
  isForwardableDeviceMcp,
} from "../mcp/deviceMcpServers.js";
import {
  createPassthroughMcpBridge,
  buildPassthroughAnnouncement,
  makePassthroughCall,
  refuseNotServedValidation,
  throwNotServed,
} from "../deviceBridge/passthroughMcp.js";
import { servingKitFor } from "../../remote/tools/serve/createServingKit.js";
import {
  createSnapshotStore,
  readDeviceMcpSnapshot,
  mergeSnapshot,
  reconcileSnapshot,
  writeDeviceMcpSnapshot,
} from "../deviceBridge/deviceMcpSnapshot.js";
import { servedPermissionContext } from "../../remote/tools/serve/servedPermissionDecision.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { MCP_PASSTHROUGH as MCP_PASSTHROUGH_2 } from "../remoteTools/remoteToolAdmission.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { admitServedCall } from "../../remote/tools/serve/callAdmission.js";
import { isMcpServerDisabled } from "../mcp/config.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { DEVICE_MCP_NOT_NOW_NOTICE_KEY } from "./deviceToolNotices.js";
import { logForDebugging } from "../../utils/debug.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";

//@ chunk-xqfbbyzk.js:15601-15777 placement
function subscribeMcpConfigChanges(onChange, servedSettingsChanged) {
  let mcpConfigFingerprint = getMcpConfigFingerprint();
  let unsubscribes = [
    settingsChangeDetector.subscribe(() => onChange()),
    servedSettingsChanged?.subscribe(() => onChange()) ?? (() => {}),
    subscribeGlobalConfigInstalled(() => {
      try {
        let mcpConfigFingerprint_2 = getMcpConfigFingerprint();
        if (mcpConfigFingerprint_2 !== mcpConfigFingerprint) {
          mcpConfigFingerprint = mcpConfigFingerprint_2;
          onChange();
        }
      } catch (error) {
        logError(toError(error));
      }
    }),
  ];
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
//@ chunk-xqfbbyzk.js:15777-15929 placement (2.1.88 match: isMcpServerDisabled, 0.857)
/**
 * getMcpConfigFingerprint：全局与项目 mcpServers 及启用/禁用表的序列化指纹，用于检测配置变化。
 */
function getMcpConfigFingerprint() {
  try {
    let projectConfig = getCurrentProjectConfig();
    return jsonStringify([
      getGlobalConfig().mcpServers ?? {},
      projectConfig.mcpServers ?? {},
      projectConfig.disabledMcpServers ?? [],
      projectConfig.enabledMcpServers ?? [],
    ]);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-xqfbbyzk.js:15929-15957 placement
var DEVICE_MCP_CONSENT = "device-mcp-consent";
//@ chunk-xqfbbyzk.js:15957-16482 placement
/**
 * 用户选择"暂不"后关于本机 MCP 不共享的说明。
 */
function notNowConsentMessage(hadQuestion, putOff) {
  if (putOff)
    return hadQuestion
      ? "You chose Not now, so this machine's MCP servers aren't shared with cloud sessions. You'll be asked again when you add an MCP server."
      : `You chose Not now, so this machine's MCP servers aren't shared with cloud sessions. To be asked again, ${deleteNotNowHint()}.`;
  return hadQuestion
    ? "This machine's MCP servers aren't shared with cloud sessions until you allow it here."
    : "This machine's MCP servers aren't shared with cloud sessions until you allow it. To choose, start a new claude --cloud session from a terminal.";
}
//@ chunk-xqfbbyzk.js:16482-17157 placement
/**
 * 透传被撤回时返回给远端的错误与遥测。
 */
var DEVICE_MCP_UNREADABLE_MESSAGE =
  "This machine's MCP-passthrough state could not be read; no MCP servers are offered to cloud sessions this session.";
var DEVICE_MCP_DROPPED = "device-mcp-dropped";
var DEVICE_MCP_POLICY = "device-mcp-policy";
var POLICY_DENIED_MESSAGE = `deniedMcpServers lists ${REMOTE_DEVICES}, so this machine's MCP servers aren't offered to cloud sessions (set in your own, the project's or your organization's Claude Code settings).`;
var POLICY_DENIED_RESULT = {
  message: `This machine no longer offers MCP servers to cloud sessions: deniedMcpServers now lists ${REMOTE_DEVICES} (in your own, the project's or your organization's Claude Code settings); the call did not run`,
  telemetry: "MCP passthrough withdrawn: remote-devices added to deniedMcpServers since the announce",
};
var DEVICE_MCP_RECONSENT = "device-mcp-reconsent";
//@ chunk-xqfbbyzk.js:17157-17506 placement
/**
 * MCP 服务器工具变化后需重新同意的说明。
 */
function toolsChangedMessage(serverNames, hasQuestion) {
  let joined = serverNames.slice(0, 4).map(shortServerLabel).join(", ");
  let moreNote = serverNames.length > 4 ? ` and ${serverNames.length - 4} more` : "";
  let isSingle = serverNames.length === 1;
  return `MCP ${plural(serverNames.length, "server")} ${joined}${moreNote} changed the tools ${isSingle ? "it lists" : "they list"} since you approved offering ${isSingle ? "it" : "them"}; not offered to cloud sessions until re-approved${hasQuestion ? "." : " (claude --cloud asks at the next start)."}`;
}
//@ chunk-xqfbbyzk.js:17506-17556 placement
/**
 * 同意状态是否属于未接受（declined/unset）。
 */
function isDeclinedOrUnset(consent) {
  return consent === "declined" || consent === "unset";
}
//@ chunk-xqfbbyzk.js:17556-25038 placement
/**
 * 把本机 MCP 服务器提供给云会话（同意检查、策略拒绝、工具变化重新同意、通知）。
 */
function passthroughServingGroupProvider(overrides = {}) {
  return (input) => {
    if (
      !(input.serving !== undefined ? input.serving.offReason === undefined : isRemoteToolServingSwitchOn())
    )
      return;
    let { registry, onNotice, storageV5 } = input;
    let hasQuestion = input.deviceMcpQuestion !== undefined;
    let readConsent = overrides.readConsent ?? (() => readDeviceMcpConsent(deviceMcpConsentStore(storageV5)));
    let declined = false;
    let currentConsent = async () => (declined ? "declined" : readConsent());
    let resolveOffer =
      overrides.resolveOffer ??
      (() =>
        getDeviceBridgeMcpConfigs_2({
          storageV5,
        }));
    let readNotNow = overrides.readNotNow ?? (() => readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5)));
    let isAllPutOff = async (servers) => containsAll(await readNotNow().catch(() => []), servers);
    let createPool =
      overrides.createPool ??
      ((configs) =>
        createPassthroughMcpBridge({
          configs,
          storageV5,
        }));
    let kitFor = overrides.kitFor ?? servingKitFor;
    let servingDenied = overrides.servingDenied ?? isDeviceMcpDenied;
    let kit = kitFor(input);
    let snapshotStore = overrides.snapshotDeps ?? createSnapshotStore(storageV5);
    let carriedSnapshot;
    let snapshotWritable = true;
    let pool;
    let unsubscribePool;
    let disposed = false;
    let settled = false;
    let offRedescribed = kit.onRedescribed(() => {
      if (settled) refreshAnnouncement("tools_changed").catch((error) => logError(toError(error)));
    });
    let refreshPromise;
    let pendingReason;
    let announcedServerKey;
    let rereadPromise;
    let rereadAgain = false;
    let refreshAnnouncement = async (reason) => {
      if (refreshPromise !== undefined) {
        pendingReason = reason;
        return refreshPromise;
      }
      refreshPromise = (async () => {
        try {
          await applyAnnouncement(reason);
          while (pendingReason !== undefined && !disposed) {
            let reason = pendingReason;
            pendingReason = undefined;
            await applyAnnouncement(reason);
          }
        } finally {
          refreshPromise = undefined;
        }
      })();
      return refreshPromise;
    };
    let applyAnnouncement = async (reason) => {
      if (pool === undefined || !settled || disposed) return;
      if (servingDenied()) {
        onPolicyDenied();
        return;
      }
      let currentPool = pool;
      let generation = servingGeneration;
      let consent = await currentConsent();
      if (isDeclinedOrUnset(consent) || (revoked && consent !== "accepted")) {
        onRevoked();
        return;
      }
      let servers = currentPool.servers().filter((server) => isDeviceScopeEnabled(server.name, server));
      let permissionContext = servedPermissionContext({
        stance: kit.policy.stance,
        launchDir: kit.deps.launchDir,
        userSettings: kit.deps.userSettingsAtAttach?.(),
      });
      let servedByLocalName = new Map();
      let [passthroughAnnouncement, deviceMcpSnapshot] = await Promise.all([
        buildPassthroughAnnouncement(servers, {
          target: kit.description,
          configured: forwardableEntries.map(([name, entry]) => ({
            name,
            scope: entry.scope,
          })),
          isDenied: (tool) => getDenyRuleForTool(permissionContext, tool) !== null,
          serve: (served) => serveTool(served, kit, currentPool, servedByLocalName),
        }),
        readDeviceMcpSnapshot(snapshotStore),
      ]);
      let basis =
        deviceMcpSnapshot !== "unreadable"
          ? mergeSnapshot(deviceMcpSnapshot, carriedSnapshot)
          : carriedSnapshot;
      if (basis === undefined) {
        if (disposed || servingGeneration !== generation || pool !== currentPool || !settled) return;
        withheldNames = new Set(passthroughAnnouncement.byServer.keys());
        registry.setGroup(MCP_PASSTHROUGH_2, [], reason);
        setServedTools(new Map());
        if (!seenEvents.has("snapshot_unreadable")) {
          seenEvents.add("snapshot_unreadable");
          onNotice?.(DEVICE_MCP_RECONSENT, DEVICE_MCP_UNREADABLE_MESSAGE);
        }
        return;
      }
      let reconciliation = reconcileSnapshot(passthroughAnnouncement.byServer, basis);
      let withheldServers = new Set(reconciliation.withheld.keys());
      let withheldToolNames = new Set(
        [...withheldServers].flatMap((server) =>
          (passthroughAnnouncement.byServer.get(server) ?? []).map((tool) => tool.name),
        ),
      );
      let tools = passthroughAnnouncement.tools.filter(
        (tool) => !withheldToolNames.has(tool.definition.name),
      );
      if (disposed || servingGeneration !== generation || pool !== currentPool || !settled) return;
      if (servingDenied()) {
        onPolicyDenied();
        return;
      }
      revoked = false;
      seenEvents.delete("policy_denied");
      withheldNames = withheldServers;
      carriedSnapshot = reconciliation.next;
      setServedTools(
        new Map(
          tools.flatMap((tool) => {
            let served = servedByLocalName.get(tool.definition.name);
            return served === undefined ? [] : [[served.localName, served]];
          }),
        ),
      );
      registry.setGroup(MCP_PASSTHROUGH_2, tools, reason);
      reportServing(tools, passthroughAnnouncement.dropped, reason);
      reportWithheld(reconciliation.next.withheld);
      if ((reconciliation.changed || !snapshotWritable) && deviceMcpSnapshot !== "unreadable")
        snapshotWritable = await writeDeviceMcpSnapshot(reconciliation.next, snapshotStore);
    };
    let withheldNames = new Set();
    let reportWithheld = (withheld) => {
      let keys = Object.keys(withheld);
      if (keys.length === 0 || seenEvents.has(DEVICE_MCP_RECONSENT)) return;
      seenEvents.add(DEVICE_MCP_RECONSENT);
      logEvent("tengu_device_mcp_serving", {
        event: lit("snapshot_changed"),
        announced_count: 0,
        dropped_count: keys.length,
        policy: fromEnum(kit.policy.name),
      });
      onNotice?.(DEVICE_MCP_RECONSENT, toolsChangedMessage(keys, hasQuestion));
    };
    let forwardableEntries = [];
    let serveTool = (toolEntry, deps, deps_2, servedTools) => {
      let passthroughCall = makePassthroughCall(
        deps_2,
        toolEntry.server,
        toolEntry.rawName,
        toolEntry.wireArguments,
      );
      let tool = {
        ...toolEntry.tool,
        validateInput: async (input, context) => {
          let refusal = await checkNotServed(toolEntry.server);
          if (refusal !== undefined) return refuseNotServedValidation(context.remoteCall, refusal);
          return (
            toolEntry.tool.validateInput?.(input, context) ?? {
              result: true,
            }
          );
        },
        call: async (input, context) => {
          let refusal = await checkNotServed(toolEntry.server);
          if (refusal !== undefined) throwNotServed(context.remoteCall, refusal.message, refusal.telemetry);
          return passthroughCall(input, context);
        },
      };
      servedTools.set(toolEntry.name, {
        localName: toolEntry.tool.name,
        tool,
        wireArguments: toolEntry.wireArguments,
      });
      return {
        definition: toolEntry.definition,
        analyticsName: MCP_PASSTHROUGH,
        senderJudgedBy: "handler",
        call: (input, context) => admitServedCall(toolEntry.tool.name, input, context, deps.deps, "bridge"),
      };
    };
    let checkNotServed = async (server) => {
      if (servingDenied()) {
        onPolicyDenied();
        return POLICY_DENIED_RESULT;
      }
      let consent = await currentConsent();
      if (isDeclinedOrUnset(consent) || (revoked && consent !== "accepted")) {
        onRevoked();
        return {
          message: "This machine no longer offers its MCP servers to cloud sessions; the call did not run",
          telemetry: "MCP passthrough consent withdrawn since the announce",
        };
      }
      if (isMcpServerDisabled(server)) {
        setServedTools(
          new Map([...servedToolsMap].filter(([, served]) => served.tool.mcpInfo?.serverName !== server)),
        );
        refreshAnnouncement("tools_changed").catch((error) => logError(toError(error)));
        return {
          message: `MCP server "${server}" was turned off on this machine since it was offered; the call did not run`,
          telemetry: "MCP passthrough server turned off since the announce",
        };
      }
      if (withheldNames.has(server))
        return {
          message: `MCP server "${shortServerLabel(server)}" changed the tools it lists since you approved offering it; the call did not run (claude --cloud asks at the next start)`,
          telemetry: "MCP passthrough server withheld: snapshot changed",
        };
      let deviceMcpSnapshot = await readDeviceMcpSnapshot(snapshotStore);
      let basis = deviceMcpSnapshot !== "unreadable" ? deviceMcpSnapshot : carriedSnapshot;
      if (basis === undefined) {
        withheldNames = new Set([...withheldNames, server]);
        return {
          message: `MCP server "${shortServerLabel(server)}" is temporarily unavailable; the call did not run`,
          telemetry: "MCP passthrough server withheld: no readable basis",
        };
      }
      if (Object.hasOwn(basis.servers, server) && basis.servers[server] === "declined") {
        withheldNames = new Set([...withheldNames, server]);
        if (deviceMcpSnapshot !== "unreadable")
          carriedSnapshot = mergeSnapshot(deviceMcpSnapshot, carriedSnapshot);
        refreshAnnouncement("tools_changed").catch((error) => logError(toError(error)));
        return {
          message: `MCP server "${shortServerLabel(server)}" is no longer offered to cloud sessions from this machine; the call did not run`,
          telemetry: "MCP passthrough server withheld: declined since announce",
        };
      }
      if (servingDenied()) {
        onPolicyDenied();
        return POLICY_DENIED_RESULT;
      }
      return;
    };
    let servedToolsMap = new Map();
    let setServedTools = (next) => {
      servedToolsMap = next;
      kit.setServedMcp(
        new Map([...next].map(([name, served]) => [name, served.tool])),
        new Map([...next].map(([name, served]) => [name, served.wireArguments])),
      );
    };
    let withdraw = () => {
      setServedTools(new Map());
      registry.setGroup(MCP_PASSTHROUGH_2, []);
      lastAnalysis = undefined;
    };
    let revoked = false;
    let servingGeneration = 0;
    let onPolicyDenied = () => {
      servingGeneration++;
      withdraw();
      if (forwardableEntries.some(([name, entry]) => isForwardableDeviceMcp(name, entry)))
        reportConsentProblem({
          event: "policy_denied",
        });
    };
    let onRevoked = () => {
      servingGeneration++;
      withdraw();
      if (!revoked) {
        revoked = true;
        logEvent("tengu_device_mcp_serving", {
          event: lit("revoked"),
          announced_count: 0,
          dropped_count: 0,
          policy: fromEnum(kit.policy.name),
        });
      }
    };
    let seenEvents = new Set();
    let servingLogged = false;
    let lastAnalysis;
    let reportServing = (tools, dropped, reason) => {
      let fingerprint = jsonStringify([tools.map((tool) => tool.definition), dropped]);
      if (reason === "tools_changed" && fingerprint === lastAnalysis) return;
      lastAnalysis = fingerprint;
      if (!servingLogged) logFeatureOk("device_mcp_serving");
      servingLogged = true;
      logEvent("tengu_device_mcp_serving", {
        event: lit(reason === "tools_settled" ? "announced" : "changed"),
        announced_count: tools.length,
        dropped_count: dropped.length,
        policy: fromEnum(kit.policy.name),
      });
      if (dropped.length > 0 && !seenEvents.has(DEVICE_MCP_DROPPED)) {
        seenEvents.add(DEVICE_MCP_DROPPED);
        let joined = dropped
          .slice(0, 6)
          .map(
            (dropped) =>
              `${shortServerLabel(dropped.server)}/${shortServerLabel(dropped.tool)} (${dropped.reason.replace(/_/g, " ")})`,
          )
          .join(", ");
        onNotice?.(
          DEVICE_MCP_DROPPED,
          `Not offered to the cloud session: ${joined}${dropped.length > 6 ? `, and ${dropped.length - 6} more` : ""}.`,
        );
      }
    };
    let reportConsentProblem = (problem) => {
      if (seenEvents.has(problem.event)) {
        if (
          problem.event === "consent_unset" &&
          !problem.putOff &&
          seenEvents.delete(DEVICE_MCP_NOT_NOW_NOTICE_KEY)
        )
          onNotice?.(DEVICE_MCP_CONSENT, notNowConsentMessage(hasQuestion, false));
        return;
      }
      seenEvents.add(problem.event);
      logFeatureSad("device_mcp_serving", problem.event);
      logEvent("tengu_device_mcp_serving", {
        event: fromEnum(problem.event),
        announced_count: 0,
        dropped_count: 0,
        policy: fromEnum(kit.policy.name),
      });
      if (problem.event === "consent_unset") {
        let noticeKey = problem.putOff && !hasQuestion ? DEVICE_MCP_NOT_NOW_NOTICE_KEY : DEVICE_MCP_CONSENT;
        seenEvents.add(noticeKey);
        onNotice?.(noticeKey, notNowConsentMessage(hasQuestion, problem.putOff));
      }
      if (problem.event === "policy_denied") onNotice?.(DEVICE_MCP_POLICY, POLICY_DENIED_MESSAGE);
    };
    let ensureFresh = () => {
      if (rereadPromise !== undefined) {
        rereadAgain = true;
        return rereadPromise;
      }
      rereadPromise = (async () => {
        try {
          do {
            rereadAgain = false;
            await reread();
          } while (rereadAgain);
        } finally {
          rereadPromise = undefined;
        }
      })();
      return rereadPromise;
    };
    let reread = async () => {
      if (disposed) return;
      let activePool = pool;
      try {
        await (activePool === undefined ? startFirst() : restartWith(activePool));
        seenEvents.delete("start_failed");
      } catch (error) {
        if (activePool !== undefined) logFeatureSad("device_mcp_serving", "reread_failed");
        else if (!seenEvents.has("start_failed")) {
          seenEvents.add("start_failed");
          logFeatureBad("device_mcp_serving", "start_failed");
        }
        logError(toError(error));
        if (pool === undefined) withdraw();
      }
    };
    let startFirst = async () => {
      let consent = await currentConsent();
      let state = consent === "unreadable" ? "unset" : consent;
      if (state === "declined") {
        reportConsentProblem({
          event: "declined",
        });
        return;
      }
      let { configs, deniedBySettings } = await resolveOffer();
      forwardableEntries = Object.entries(configs);
      let filtered = forwardableEntries.filter(([name, entry]) => isForwardableDeviceMcp(name, entry));
      if (disposed || filtered.length === 0) return;
      if (deniedBySettings) {
        reportConsentProblem({
          event: "policy_denied",
        });
        return;
      }
      if (state === "unset") {
        let putOff = await isAllPutOff(filtered.map(([entry]) => entry));
        if (!disposed)
          reportConsentProblem({
            event: "consent_unset",
            putOff,
          });
        return;
      }
      await startPool(configs);
    };
    let restartWith = async (previousPool) => {
      let resolved = await resolveOffer();
      if (disposed) return;
      forwardableEntries = Object.entries(resolved.configs);
      if (resolved.deniedBySettings) onPolicyDenied();
      let configs = resolved.deniedBySettings ? {} : resolved.configs;
      if (stableServerKeys(forwardableServers(configs)) === announcedServerKey) {
        await refreshAnnouncement("tools_changed");
        return;
      }
      unsubscribePool?.();
      unsubscribePool = undefined;
      settled = false;
      await previousPool.stop().catch((error) => logError(toError(error)));
      pool = undefined;
      if (disposed) return;
      let consent = await currentConsent();
      if (disposed) return;
      if (consent === "declined") {
        onRevoked();
        return;
      }
      if (consent !== "accepted") {
        withdraw();
        let keys = Object.keys(forwardableServers(configs));
        if (consent === "unset" && keys.length > 0) {
          let putOff = await isAllPutOff(keys);
          if (!disposed)
            reportConsentProblem({
              event: "consent_unset",
              putOff,
            });
        }
        return;
      }
      await startPool(servingDenied() ? {} : configs);
    };
    let startPool = async (configs) => {
      let forwardable = forwardableServers(configs);
      let newPool = createPool(forwardable);
      pool = newPool;
      announcedServerKey = stableServerKeys(forwardable);
      unsubscribePool = newPool.subscribe(() => {
        if (settled && pool === newPool)
          refreshAnnouncement("tools_changed").catch((error) => logError(toError(error)));
      });
      let settled_2 = await newPool.settled;
      settled = true;
      logForDebugging(
        `[deviceBridge] MCP servers for the cloud session settled: ${settled_2.connected} connected, ${settled_2.cached} cached, ${settled_2.failed} failed, ${settled_2.needsAuth} need login, ${settled_2.unreported} still starting (${settled_2.settleMs} ms)`,
      );
      if (disposed) {
        await newPool.stop();
        return;
      }
      await refreshAnnouncement("tools_settled");
    };
    let unsubscribeConfig = () => {};
    let startListening = () => {
      if (disposed) return;
      unsubscribeConfig = (
        overrides.subscribeConfigurationChanges ??
        ((listener) => subscribeMcpConfigChanges(listener, input.servedSettingsChanged))
      )(() => void ensureFresh());
      ensureFresh();
    };
    if (input.deviceMcpQuestion === undefined) startListening();
    else
      input.deviceMcpQuestion
        .then((answer) => {
          declined = answer === "declined";
          startListening();
        })
        .catch((error) => logError(toError(error)));
    return () => {
      disposed = true;
      offRedescribed();
      unsubscribeConfig();
      unsubscribePool?.();
      withdraw();
      kit.dispose();
      if (servingLogged)
        logEvent("tengu_device_mcp_serving", {
          event: lit("withdrawn"),
          announced_count: 0,
          dropped_count: 0,
          policy: fromEnum(kit.policy.name),
        });
      pool?.stop().catch((error) => logError(toError(error)));
    };
  };
}
//@ chunk-xqfbbyzk.js:25038-25082 placement
/**
 * 过滤出可转发给远程设备的 MCP 服务器。
 */
function forwardableServers(configs) {
  return pickByHelper(configs, (name, entry) => isForwardableDeviceMcp(entry, name));
}
//@ chunk-xqfbbyzk.js:25082-25148 placement
/**
 * 把服务器映射转成稳定的键顺序 JSON（用于比较变化）。
 */
function stableServerKeys(servers) {
  return jsonStringify(
    Object.keys(servers)
      .sort()
      .map((key) => [key, servers[key]]),
  );
}
export { passthroughServingGroupProvider };
