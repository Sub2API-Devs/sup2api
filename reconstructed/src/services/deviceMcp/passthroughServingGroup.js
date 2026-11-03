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
function subscribeMcpConfigChanges(o, servedSettingsChanged) {
  let mcpConfigFingerprint = getMcpConfigFingerprint();
  let D = [
    settingsChangeDetector.subscribe(() => o()),
    servedSettingsChanged?.subscribe(() => o()) ?? (() => {}),
    subscribeGlobalConfigInstalled(() => {
      try {
        let mcpConfigFingerprint_2 = getMcpConfigFingerprint();
        if (mcpConfigFingerprint_2 !== mcpConfigFingerprint) {
          mcpConfigFingerprint = mcpConfigFingerprint_2;
          o();
        }
      } catch (error) {
        logError(toError(error));
      }
    }),
  ];
  return () => D.forEach((u) => u());
}
//@ chunk-xqfbbyzk.js:15777-15929 placement = isMcpServerDisabled (0.857)
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
function notNowConsentMessage(o, d) {
  if (d)
    return o
      ? "You chose Not now, so this machine's MCP servers aren't shared with cloud sessions. You'll be asked again when you add an MCP server."
      : `You chose Not now, so this machine's MCP servers aren't shared with cloud sessions. To be asked again, ${deleteNotNowHint()}.`;
  return o
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
function toolsChangedMessage(o, d) {
  let joined = o.slice(0, 4).map(shortServerLabel).join(", ");
  let D = o.length > 4 ? ` and ${o.length - 4} more` : "";
  let u = o.length === 1;
  return `MCP ${plural(o.length, "server")} ${joined}${D} changed the tools ${u ? "it lists" : "they list"} since you approved offering ${u ? "it" : "them"}; not offered to cloud sessions until re-approved${d ? "." : " (claude --cloud asks at the next start)."}`;
}
//@ chunk-xqfbbyzk.js:17506-17556 placement
/**
 * 同意状态是否属于未接受（declined/unset）。
 */
function isDeclinedOrUnset(o) {
  return o === "declined" || o === "unset";
}
//@ chunk-xqfbbyzk.js:17556-25038 placement
/**
 * 把本机 MCP 服务器提供给云会话（同意检查、策略拒绝、工具变化重新同意、通知）。
 */
function passthroughServingGroupProvider(o = {}) {
  return (d) => {
    if (!(d.serving !== undefined ? d.serving.offReason === undefined : isRemoteToolServingSwitchOn()))
      return;
    let { registry, onNotice, storageV5 } = d;
    let U = d.deviceMcpQuestion !== undefined;
    let Ne = o.readConsent ?? (() => readDeviceMcpConsent(deviceMcpConsentStore(storageV5)));
    let ce = false;
    let Q = async () => (ce ? "declined" : Ne());
    let ae =
      o.resolveOffer ??
      (() =>
        getDeviceBridgeMcpConfigs_2({
          storageV5,
        }));
    let Te = o.readNotNow ?? (() => readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5)));
    let de = async (e) => containsAll(await Te().catch(() => []), e);
    let Re =
      o.createPool ??
      ((configs) =>
        createPassthroughMcpBridge({
          configs,
          storageV5,
        }));
    let kitFor = o.kitFor ?? servingKitFor;
    let servingDenied = o.servingDenied ?? isDeviceMcpDenied;
    let y = kitFor(d);
    let Z = o.snapshotDeps ?? createSnapshotStore(storageV5);
    let A;
    let le = true;
    let M;
    let z;
    let p = false;
    let T = false;
    let ke = y.onRedescribed(() => {
      if (T) I("tools_changed").catch((error) => logError(toError(error)));
    });
    let F;
    let J;
    let pe;
    let x;
    let ee = false;
    let I = async (e) => {
      if (F !== undefined) {
        J = e;
        return F;
      }
      F = (async () => {
        try {
          await fe(e);
          while (J !== undefined && !p) {
            let n = J;
            J = undefined;
            await fe(n);
          }
        } finally {
          F = undefined;
        }
      })();
      return F;
    };
    let fe = async (e) => {
      if (M === undefined || !T || p) return;
      if (servingDenied()) {
        W();
        return;
      }
      let n = M;
      let r = K;
      let i = await Q();
      if (isDeclinedOrUnset(i) || (Y && i !== "accepted")) {
        ne();
        return;
      }
      let servers = n.servers().filter((v) => isDeviceScopeEnabled(v.name, v));
      let S = servedPermissionContext({
        stance: y.policy.stance,
        launchDir: y.deps.launchDir,
        userSettings: y.deps.userSettingsAtAttach?.(),
      });
      let w = new Map();
      let [passthroughAnnouncement, deviceMcpSnapshot] = await Promise.all([
        buildPassthroughAnnouncement(servers, {
          target: y.description,
          configured: G.map(([v, k]) => ({
            name: v,
            scope: k.scope,
          })),
          isDenied: (v) => getDenyRuleForTool(S, v) !== null,
          serve: (v) => Ie(v, y, n, w),
        }),
        readDeviceMcpSnapshot(Z),
      ]);
      let _e = deviceMcpSnapshot !== "unreadable" ? mergeSnapshot(deviceMcpSnapshot, A) : A;
      if (_e === undefined) {
        if (p || K !== r || M !== n || !T) return;
        R = new Set(passthroughAnnouncement.byServer.keys());
        registry.setGroup(MCP_PASSTHROUGH_2, [], e);
        q(new Map());
        if (!h.has("snapshot_unreadable")) {
          h.add("snapshot_unreadable");
          onNotice?.(DEVICE_MCP_RECONSENT, DEVICE_MCP_UNREADABLE_MESSAGE);
        }
        return;
      }
      let L = reconcileSnapshot(passthroughAnnouncement.byServer, _e);
      let Ce = new Set(L.withheld.keys());
      let Ge = new Set(
        [...Ce].flatMap((v) => (passthroughAnnouncement.byServer.get(v) ?? []).map((k) => k.name)),
      );
      let filtered = passthroughAnnouncement.tools.filter((tool) => !Ge.has(tool.definition.name));
      if (p || K !== r || M !== n || !T) return;
      if (servingDenied()) {
        W();
        return;
      }
      Y = false;
      h.delete("policy_denied");
      R = Ce;
      A = L.next;
      q(
        new Map(
          filtered.flatMap((v) => {
            let k = w.get(v.definition.name);
            return k === undefined ? [] : [[k.localName, k]];
          }),
        ),
      );
      registry.setGroup(MCP_PASSTHROUGH_2, filtered, e);
      je(filtered, passthroughAnnouncement.dropped, e);
      Ae(L.next.withheld);
      if ((L.changed || !le) && deviceMcpSnapshot !== "unreadable")
        le = await writeDeviceMcpSnapshot(L.next, Z);
    };
    let R = new Set();
    let Ae = (withheld) => {
      let keys = Object.keys(withheld);
      if (keys.length === 0 || h.has(DEVICE_MCP_RECONSENT)) return;
      h.add(DEVICE_MCP_RECONSENT);
      logEvent("tengu_device_mcp_serving", {
        event: lit("snapshot_changed"),
        announced_count: 0,
        dropped_count: keys.length,
        policy: fromEnum(y.policy.name),
      });
      onNotice?.(DEVICE_MCP_RECONSENT, toolsChangedMessage(keys, U));
    };
    let G = [];
    let Ie = (e, n, deps, i) => {
      let passthroughCall = makePassthroughCall(deps, e.server, e.rawName, e.wireArguments);
      let tool = {
        ...e.tool,
        validateInput: async (w, C) => {
          let P = await ge(e.server);
          if (P !== undefined) return refuseNotServedValidation(C.remoteCall, P);
          return (
            e.tool.validateInput?.(w, C) ?? {
              result: true,
            }
          );
        },
        call: async (w, C) => {
          let P = await ge(e.server);
          if (P !== undefined) throwNotServed(C.remoteCall, P.message, P.telemetry);
          return passthroughCall(w, C);
        },
      };
      i.set(e.name, {
        localName: e.tool.name,
        tool,
        wireArguments: e.wireArguments,
      });
      return {
        definition: e.definition,
        analyticsName: MCP_PASSTHROUGH,
        senderJudgedBy: "handler",
        call: (w, C) => admitServedCall(e.tool.name, w, C, n.deps, "bridge"),
      };
    };
    let ge = async (server) => {
      if (servingDenied()) {
        W();
        return POLICY_DENIED_RESULT;
      }
      let n = await Q();
      if (isDeclinedOrUnset(n) || (Y && n !== "accepted")) {
        ne();
        return {
          message: "This machine no longer offers its MCP servers to cloud sessions; the call did not run",
          telemetry: "MCP passthrough consent withdrawn since the announce",
        };
      }
      if (isMcpServerDisabled(server)) {
        q(new Map([...he].filter(([, s]) => s.tool.mcpInfo?.serverName !== server)));
        I("tools_changed").catch((error) => logError(toError(error)));
        return {
          message: `MCP server "${server}" was turned off on this machine since it was offered; the call did not run`,
          telemetry: "MCP passthrough server turned off since the announce",
        };
      }
      if (R.has(server))
        return {
          message: `MCP server "${shortServerLabel(server)}" changed the tools it lists since you approved offering it; the call did not run (claude --cloud asks at the next start)`,
          telemetry: "MCP passthrough server withheld: snapshot changed",
        };
      let deviceMcpSnapshot = await readDeviceMcpSnapshot(Z);
      let i = deviceMcpSnapshot !== "unreadable" ? deviceMcpSnapshot : A;
      if (i === undefined) {
        R = new Set([...R, server]);
        return {
          message: `MCP server "${shortServerLabel(server)}" is temporarily unavailable; the call did not run`,
          telemetry: "MCP passthrough server withheld: no readable basis",
        };
      }
      if (Object.hasOwn(i.servers, server) && i.servers[server] === "declined") {
        R = new Set([...R, server]);
        if (deviceMcpSnapshot !== "unreadable") A = mergeSnapshot(deviceMcpSnapshot, A);
        I("tools_changed").catch((error) => logError(toError(error)));
        return {
          message: `MCP server "${shortServerLabel(server)}" is no longer offered to cloud sessions from this machine; the call did not run`,
          telemetry: "MCP passthrough server withheld: declined since announce",
        };
      }
      if (servingDenied()) {
        W();
        return POLICY_DENIED_RESULT;
      }
      return;
    };
    let he = new Map();
    let q = (e) => {
      he = e;
      y.setServedMcp(
        new Map([...e].map(([n, r]) => [n, r.tool])),
        new Map([...e].map(([n, r]) => [n, r.wireArguments])),
      );
    };
    let V = () => {
      q(new Map());
      registry.setGroup(MCP_PASSTHROUGH_2, []);
      oe = undefined;
    };
    let Y = false;
    let K = 0;
    let W = () => {
      K++;
      V();
      if (G.some(([e, n]) => isForwardableDeviceMcp(e, n)))
        H({
          event: "policy_denied",
        });
    };
    let ne = () => {
      K++;
      V();
      if (!Y) {
        Y = true;
        logEvent("tengu_device_mcp_serving", {
          event: lit("revoked"),
          announced_count: 0,
          dropped_count: 0,
          policy: fromEnum(y.policy.name),
        });
      }
    };
    let h = new Set();
    let te = false;
    let oe;
    let je = (e, dropped, r) => {
      let i = jsonStringify([e.map((s) => s.definition), dropped]);
      if (r === "tools_changed" && i === oe) return;
      oe = i;
      if (!te) logFeatureOk("device_mcp_serving");
      te = true;
      logEvent("tengu_device_mcp_serving", {
        event: lit(r === "tools_settled" ? "announced" : "changed"),
        announced_count: e.length,
        dropped_count: dropped.length,
        policy: fromEnum(y.policy.name),
      });
      if (dropped.length > 0 && !h.has(DEVICE_MCP_DROPPED)) {
        h.add(DEVICE_MCP_DROPPED);
        let joined = dropped
          .slice(0, 6)
          .map(
            (S) =>
              `${shortServerLabel(S.server)}/${shortServerLabel(S.tool)} (${S.reason.replace(/_/g, " ")})`,
          )
          .join(", ");
        onNotice?.(
          DEVICE_MCP_DROPPED,
          `Not offered to the cloud session: ${joined}${dropped.length > 6 ? `, and ${dropped.length - 6} more` : ""}.`,
        );
      }
    };
    let H = (e) => {
      if (h.has(e.event)) {
        if (e.event === "consent_unset" && !e.putOff && h.delete(DEVICE_MCP_NOT_NOW_NOTICE_KEY))
          onNotice?.(DEVICE_MCP_CONSENT, notNowConsentMessage(U, false));
        return;
      }
      h.add(e.event);
      logFeatureSad("device_mcp_serving", e.event);
      logEvent("tengu_device_mcp_serving", {
        event: fromEnum(e.event),
        announced_count: 0,
        dropped_count: 0,
        policy: fromEnum(y.policy.name),
      });
      if (e.event === "consent_unset") {
        let n = e.putOff && !U ? DEVICE_MCP_NOT_NOW_NOTICE_KEY : DEVICE_MCP_CONSENT;
        h.add(n);
        onNotice?.(n, notNowConsentMessage(U, e.putOff));
      }
      if (e.event === "policy_denied") onNotice?.(DEVICE_MCP_POLICY, POLICY_DENIED_MESSAGE);
    };
    let me = () => {
      if (x !== undefined) {
        ee = true;
        return x;
      }
      x = (async () => {
        try {
          do {
            ee = false;
            await Be();
          } while (ee);
        } finally {
          x = undefined;
        }
      })();
      return x;
    };
    let Be = async () => {
      if (p) return;
      let e = M;
      try {
        await (e === undefined ? Fe() : xe(e));
        h.delete("start_failed");
      } catch (error) {
        if (e !== undefined) logFeatureSad("device_mcp_serving", "reread_failed");
        else if (!h.has("start_failed")) {
          h.add("start_failed");
          logFeatureBad("device_mcp_serving", "start_failed");
        }
        logError(toError(error));
        if (M === undefined) V();
      }
    };
    let Fe = async () => {
      let e = await Q();
      let n = e === "unreadable" ? "unset" : e;
      if (n === "declined") {
        H({
          event: "declined",
        });
        return;
      }
      let { configs, deniedBySettings } = await ae();
      G = Object.entries(configs);
      let filtered = G.filter(([S, w]) => isForwardableDeviceMcp(S, w));
      if (p || filtered.length === 0) return;
      if (deniedBySettings) {
        H({
          event: "policy_denied",
        });
        return;
      }
      if (n === "unset") {
        let putOff = await de(filtered.map(([w]) => w));
        if (!p)
          H({
            event: "consent_unset",
            putOff,
          });
        return;
      }
      await ve(configs);
    };
    let xe = async (e) => {
      let n = await ae();
      if (p) return;
      G = Object.entries(n.configs);
      if (n.deniedBySettings) W();
      let configs = n.deniedBySettings ? {} : n.configs;
      if (stableServerKeys(forwardableServers(configs)) === pe) {
        await I("tools_changed");
        return;
      }
      z?.();
      z = undefined;
      T = false;
      await e.stop().catch((error) => logError(toError(error)));
      M = undefined;
      if (p) return;
      let i = await Q();
      if (p) return;
      if (i === "declined") {
        ne();
        return;
      }
      if (i !== "accepted") {
        V();
        let keys = Object.keys(forwardableServers(configs));
        if (i === "unset" && keys.length > 0) {
          let putOff = await de(keys);
          if (!p)
            H({
              event: "consent_unset",
              putOff,
            });
        }
        return;
      }
      await ve(servingDenied() ? {} : configs);
    };
    let ve = async (configs) => {
      let n = forwardableServers(configs);
      let r = Re(n);
      M = r;
      pe = stableServerKeys(n);
      z = r.subscribe(() => {
        if (T && M === r) I("tools_changed").catch((error) => logError(toError(error)));
      });
      let settled = await r.settled;
      T = true;
      logForDebugging(
        `[deviceBridge] MCP servers for the cloud session settled: ${settled.connected} connected, ${settled.cached} cached, ${settled.failed} failed, ${settled.needsAuth} need login, ${settled.unreported} still starting (${settled.settleMs} ms)`,
      );
      if (p) {
        await r.stop();
        return;
      }
      await I("tools_settled");
    };
    let ye = () => {};
    let Se = () => {
      if (p) return;
      ye = (
        o.subscribeConfigurationChanges ?? ((e) => subscribeMcpConfigChanges(e, d.servedSettingsChanged))
      )(() => void me());
      me();
    };
    if (d.deviceMcpQuestion === undefined) Se();
    else
      d.deviceMcpQuestion
        .then((e) => {
          ce = e === "declined";
          Se();
        })
        .catch((error) => logError(toError(error)));
    return () => {
      p = true;
      ke();
      ye();
      z?.();
      V();
      y.dispose();
      if (te)
        logEvent("tengu_device_mcp_serving", {
          event: lit("withdrawn"),
          announced_count: 0,
          dropped_count: 0,
          policy: fromEnum(y.policy.name),
        });
      M?.stop().catch((error) => logError(toError(error)));
    };
  };
}
//@ chunk-xqfbbyzk.js:25038-25082 placement
/**
 * 过滤出可转发给远程设备的 MCP 服务器。
 */
function forwardableServers(configs) {
  return pickByHelper(configs, (d, E) => isForwardableDeviceMcp(E, d));
}
//@ chunk-xqfbbyzk.js:25082-25148 placement
/**
 * 把服务器映射转成稳定的键顺序 JSON（用于比较变化）。
 */
function stableServerKeys(o) {
  return jsonStringify(
    Object.keys(o)
      .sort()
      .map((key) => [key, o[key]]),
  );
}
