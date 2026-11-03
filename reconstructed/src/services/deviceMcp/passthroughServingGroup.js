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
  _0n,
  t9,
  readDeviceMcpConsent,
  deviceMcpConsentStore,
  readDeviceMcpNotNow,
  deviceMcpNotNowStore,
  ppt,
  MCP_PASSTHROUGH,
} from "../deviceBridge/deviceMcpConsent.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { plural } from "../../utils/stringUtils.js";
import { isRemoteToolServingSwitchOn } from "../remoteTools/servingGates.js";
import {
  getDeviceBridgeMcpConfigs,
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
import { Do } from "../../utils/git/gitSafeEnv.js";

//@ chunk-xqfbbyzk.js:15601-15777 placement
function subscribeMcpConfigChanges(o, d) {
  let E = getMcpConfigFingerprint(),
    D = [
      settingsChangeDetector.subscribe(() => o()),
      d?.subscribe(() => o()) ?? (() => {}),
      subscribeGlobalConfigInstalled(() => {
        try {
          let u = getMcpConfigFingerprint();
          if (u !== E) ((E = u), o());
        } catch (error) {
          logError(toError(error));
        }
      }),
    ];
  return () => D.forEach((u) => u());
}
/**
 * getMcpConfigFingerprint：全局与项目 mcpServers 及启用/禁用表的序列化指纹，用于检测配置变化。
 */
//@ chunk-xqfbbyzk.js:15777-15929 placement = isMcpServerDisabled (0.857)
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
/**
 * 用户选择"暂不"后关于本机 MCP 不共享的说明。
 */
//@ chunk-xqfbbyzk.js:15957-16482 placement
function notNowConsentMessage(o, d) {
  if (d)
    return o
      ? "You chose Not now, so this machine's MCP servers aren't shared with cloud sessions. You'll be asked again when you add an MCP server."
      : `You chose Not now, so this machine's MCP servers aren't shared with cloud sessions. To be asked again, ${_0n()}.`;
  return o
    ? "This machine's MCP servers aren't shared with cloud sessions until you allow it here."
    : "This machine's MCP servers aren't shared with cloud sessions until you allow it. To choose, start a new claude --cloud session from a terminal.";
}
/**
 * 本机 MCP 透传相关的提示文本与通知键。
 */
//@ chunk-xqfbbyzk.js:16482-17157 placement
var DEVICE_MCP_UNREADABLE_MESSAGE =
    "This machine's MCP-passthrough state could not be read; no MCP servers are offered to cloud sessions this session.",
  DEVICE_MCP_DROPPED = "device-mcp-dropped",
  DEVICE_MCP_POLICY = "device-mcp-policy",
  Ke = `deniedMcpServers lists ${REMOTE_DEVICES}, so this machine's MCP servers aren't offered to cloud sessions (set in your own, the project's or your organization's Claude Code settings).`,
  Ee = {
    message: `This machine no longer offers MCP servers to cloud sessions: deniedMcpServers now lists ${REMOTE_DEVICES} (in your own, the project's or your organization's Claude Code settings); the call did not run`,
    telemetry: "MCP passthrough withdrawn: remote-devices added to deniedMcpServers since the announce",
  },
  DEVICE_MCP_RECONSENT = "device-mcp-reconsent";
/**
 * MCP 服务器工具变化后需重新同意的说明。
 */
//@ chunk-xqfbbyzk.js:17157-17506 placement
function toolsChangedMessage(o, d) {
  let joined = o.slice(0, 4).map(t9).join(", "),
    D = o.length > 4 ? ` and ${o.length - 4} more` : "",
    u = o.length === 1;
  return `MCP ${plural(o.length, "server")} ${joined}${D} changed the tools ${u ? "it lists" : "they list"} since you approved offering ${u ? "it" : "them"}; not offered to cloud sessions until re-approved${d ? "." : " (claude --cloud asks at the next start)."}`;
}
//@ chunk-xqfbbyzk.js:17506-17556 placement
function De(o) {
  return o === "declined" || o === "unset";
}
/**
 * 把本机 MCP 服务器提供给云会话（同意检查、策略拒绝、工具变化重新同意、通知）。
 */
//@ chunk-xqfbbyzk.js:17556-25038 placement
function passthroughServingGroupProvider(o = {}) {
  return (d) => {
    if (!(d.serving !== void 0 ? d.serving.offReason === void 0 : isRemoteToolServingSwitchOn())) return;
    let { registry: registry, onNotice: onNotice, storageV5: storageV5 } = d,
      U = d.deviceMcpQuestion !== void 0,
      Ne = o.readConsent ?? (() => readDeviceMcpConsent(deviceMcpConsentStore(storageV5))),
      ce = !1,
      Q = async () => (ce ? "declined" : Ne()),
      ae = o.resolveOffer ?? (() => getDeviceBridgeMcpConfigs({ storageV5: storageV5 })),
      Te = o.readNotNow ?? (() => readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5))),
      de = async (e) => ppt(await Te().catch(() => []), e),
      Re = o.createPool ?? ((e) => createPassthroughMcpBridge({ configs: e, storageV5: storageV5 })),
      $e = o.kitFor ?? servingKitFor,
      B = o.servingDenied ?? isDeviceMcpDenied,
      y = $e(d),
      Z = o.snapshotDeps ?? createSnapshotStore(storageV5),
      A,
      le = !0,
      M,
      z,
      p = !1,
      T = !1,
      onRedescribed = y.onRedescribed(() => {
        if (T) I("tools_changed").catch((e) => logError(toError(e)));
      }),
      F,
      J,
      pe,
      x,
      ee = !1,
      I = async (e) => {
        if (F !== void 0) return ((J = e), F);
        return (
          (F = (async () => {
            try {
              await fe(e);
              while (J !== void 0 && !p) {
                let n = J;
                ((J = void 0), await fe(n));
              }
            } finally {
              F = void 0;
            }
          })()),
          F
        );
      },
      fe = async (e) => {
        if (M === void 0 || !T || p) return;
        if (B()) {
          W();
          return;
        }
        let n = M,
          r = K,
          i = await Q();
        if (De(i) || (Y && i !== "accepted")) {
          ne();
          return;
        }
        let filtered = n.servers().filter((v) => isDeviceScopeEnabled(v.name, v)),
          S = servedPermissionContext({
            stance: y.policy.stance,
            launchDir: y.deps.launchDir,
            userSettings: y.deps.userSettingsAtAttach?.(),
          }),
          w = new Map(),
          [C, P] = await Promise.all([
            buildPassthroughAnnouncement(filtered, {
              target: y.description,
              configured: G.map(([v, k]) => ({ name: v, scope: k.scope })),
              isDenied: (v) => getDenyRuleForTool(S, v) !== null,
              serve: (v) => Ie(v, y, n, w),
            }),
            readDeviceMcpSnapshot(Z),
          ]),
          _e = P !== "unreadable" ? mergeSnapshot(P, A) : A;
        if (_e === void 0) {
          if (p || K !== r || M !== n || !T) return;
          if (
            ((R = new Set(C.byServer.keys())),
            registry.setGroup(MCP_PASSTHROUGH_2, [], e),
            q(new Map()),
            !h.has("snapshot_unreadable"))
          )
            (h.add("snapshot_unreadable"), onNotice?.(DEVICE_MCP_RECONSENT, DEVICE_MCP_UNREADABLE_MESSAGE));
          return;
        }
        let L = reconcileSnapshot(C.byServer, _e),
          Ce = new Set(L.withheld.keys()),
          Ge = new Set([...Ce].flatMap((v) => (C.byServer.get(v) ?? []).map((k) => k.name))),
          filtered_2 = C.tools.filter((tool) => !Ge.has(tool.definition.name));
        if (p || K !== r || M !== n || !T) return;
        if (B()) {
          W();
          return;
        }
        if (
          ((Y = !1),
          h.delete("policy_denied"),
          (R = Ce),
          (A = L.next),
          q(
            new Map(
              filtered_2.flatMap((v) => {
                let k = w.get(v.definition.name);
                return k === void 0 ? [] : [[k.localName, k]];
              }),
            ),
          ),
          registry.setGroup(MCP_PASSTHROUGH_2, filtered_2, e),
          je(filtered_2, C.dropped, e),
          Ae(L.next.withheld),
          (L.changed || !le) && P !== "unreadable")
        )
          le = await writeDeviceMcpSnapshot(L.next, Z);
      },
      R = new Set(),
      Ae = (e) => {
        let keys = Object.keys(e);
        if (keys.length === 0 || h.has(DEVICE_MCP_RECONSENT)) return;
        (h.add(DEVICE_MCP_RECONSENT),
          logEvent("tengu_device_mcp_serving", {
            event: lit("snapshot_changed"),
            announced_count: 0,
            dropped_count: keys.length,
            policy: fromEnum(y.policy.name),
          }),
          onNotice?.(DEVICE_MCP_RECONSENT, toolsChangedMessage(keys, U)));
      },
      G = [],
      Ie = (e, n, r, i) => {
        let s = makePassthroughCall(r, e.server, e.rawName, e.wireArguments),
          S = {
            ...e.tool,
            validateInput: async (w, C) => {
              let P = await ge(e.server);
              if (P !== void 0) return refuseNotServedValidation(C.remoteCall, P);
              return e.tool.validateInput?.(w, C) ?? { result: !0 };
            },
            call: async (w, C) => {
              let P = await ge(e.server);
              if (P !== void 0) throwNotServed(C.remoteCall, P.message, P.telemetry);
              return s(w, C);
            },
          };
        return (
          i.set(e.name, { localName: e.tool.name, tool: S, wireArguments: e.wireArguments }),
          {
            definition: e.definition,
            analyticsName: MCP_PASSTHROUGH,
            senderJudgedBy: "handler",
            call: (w, C) => admitServedCall(e.tool.name, w, C, n.deps, "bridge"),
          }
        );
      },
      ge = async (e) => {
        if (B()) return (W(), Ee);
        let n = await Q();
        if (De(n) || (Y && n !== "accepted"))
          return (
            ne(),
            {
              message:
                "This machine no longer offers its MCP servers to cloud sessions; the call did not run",
              telemetry: "MCP passthrough consent withdrawn since the announce",
            }
          );
        if (isMcpServerDisabled(e))
          return (
            q(new Map([...he].filter(([, s]) => s.tool.mcpInfo?.serverName !== e))),
            I("tools_changed").catch((s) => logError(toError(s))),
            {
              message: `MCP server "${e}" was turned off on this machine since it was offered; the call did not run`,
              telemetry: "MCP passthrough server turned off since the announce",
            }
          );
        if (R.has(e))
          return {
            message: `MCP server "${t9(e)}" changed the tools it lists since you approved offering it; the call did not run (claude --cloud asks at the next start)`,
            telemetry: "MCP passthrough server withheld: snapshot changed",
          };
        let r = await readDeviceMcpSnapshot(Z),
          i = r !== "unreadable" ? r : A;
        if (i === void 0)
          return (
            (R = new Set([...R, e])),
            {
              message: `MCP server "${t9(e)}" is temporarily unavailable; the call did not run`,
              telemetry: "MCP passthrough server withheld: no readable basis",
            }
          );
        if (Object.hasOwn(i.servers, e) && i.servers[e] === "declined") {
          if (((R = new Set([...R, e])), r !== "unreadable")) A = mergeSnapshot(r, A);
          return (
            I("tools_changed").catch((s) => logError(toError(s))),
            {
              message: `MCP server "${t9(e)}" is no longer offered to cloud sessions from this machine; the call did not run`,
              telemetry: "MCP passthrough server withheld: declined since announce",
            }
          );
        }
        if (B()) return (W(), Ee);
        return;
      },
      he = new Map(),
      q = (e) => {
        ((he = e),
          y.setServedMcp(
            new Map([...e].map(([n, r]) => [n, r.tool])),
            new Map([...e].map(([n, r]) => [n, r.wireArguments])),
          ));
      },
      V = () => {
        (q(new Map()), registry.setGroup(MCP_PASSTHROUGH_2, []), (oe = void 0));
      },
      Y = !1,
      K = 0,
      W = () => {
        if ((K++, V(), G.some(([e, n]) => isForwardableDeviceMcp(e, n)))) H({ event: "policy_denied" });
      },
      ne = () => {
        if ((K++, V(), !Y))
          ((Y = !0),
            logEvent("tengu_device_mcp_serving", {
              event: lit("revoked"),
              announced_count: 0,
              dropped_count: 0,
              policy: fromEnum(y.policy.name),
            }));
      },
      h = new Set(),
      te = !1,
      oe,
      je = (e, n, r) => {
        let i = jsonStringify([e.map((s) => s.definition), n]);
        if (r === "tools_changed" && i === oe) return;
        if (((oe = i), !te)) logFeatureOk("device_mcp_serving");
        if (
          ((te = !0),
          logEvent("tengu_device_mcp_serving", {
            event: lit(r === "tools_settled" ? "announced" : "changed"),
            announced_count: e.length,
            dropped_count: n.length,
            policy: fromEnum(y.policy.name),
          }),
          n.length > 0 && !h.has(DEVICE_MCP_DROPPED))
        ) {
          h.add(DEVICE_MCP_DROPPED);
          let joined = n
            .slice(0, 6)
            .map((S) => `${t9(S.server)}/${t9(S.tool)} (${S.reason.replace(/_/g, " ")})`)
            .join(", ");
          onNotice?.(
            DEVICE_MCP_DROPPED,
            `Not offered to the cloud session: ${joined}${n.length > 6 ? `, and ${n.length - 6} more` : ""}.`,
          );
        }
      },
      H = (e) => {
        if (h.has(e.event)) {
          if (e.event === "consent_unset" && !e.putOff && h.delete(DEVICE_MCP_NOT_NOW_NOTICE_KEY))
            onNotice?.(DEVICE_MCP_CONSENT, notNowConsentMessage(U, !1));
          return;
        }
        if (
          (h.add(e.event),
          logFeatureSad("device_mcp_serving", e.event),
          logEvent("tengu_device_mcp_serving", {
            event: fromEnum(e.event),
            announced_count: 0,
            dropped_count: 0,
            policy: fromEnum(y.policy.name),
          }),
          e.event === "consent_unset")
        ) {
          let n = e.putOff && !U ? DEVICE_MCP_NOT_NOW_NOTICE_KEY : DEVICE_MCP_CONSENT;
          (h.add(n), onNotice?.(n, notNowConsentMessage(U, e.putOff)));
        }
        if (e.event === "policy_denied") onNotice?.(DEVICE_MCP_POLICY, Ke);
      },
      me = () => {
        if (x !== void 0) return ((ee = !0), x);
        return (
          (x = (async () => {
            try {
              do ((ee = !1), await Be());
              while (ee);
            } finally {
              x = void 0;
            }
          })()),
          x
        );
      },
      Be = async () => {
        if (p) return;
        let e = M;
        try {
          (await (e === void 0 ? Fe() : xe(e)), h.delete("start_failed"));
        } catch (error) {
          if (e !== void 0) logFeatureSad("device_mcp_serving", "reread_failed");
          else if (!h.has("start_failed"))
            (h.add("start_failed"), logFeatureBad("device_mcp_serving", "start_failed"));
          if ((logError(toError(error)), M === void 0)) V();
        }
      },
      Fe = async () => {
        let e = await Q(),
          n = e === "unreadable" ? "unset" : e;
        if (n === "declined") {
          H({ event: "declined" });
          return;
        }
        let { configs: configs, deniedBySettings: deniedBySettings } = await ae();
        G = Object.entries(configs);
        let filtered = G.filter(([S, w]) => isForwardableDeviceMcp(S, w));
        if (p || filtered.length === 0) return;
        if (deniedBySettings) {
          H({ event: "policy_denied" });
          return;
        }
        if (n === "unset") {
          let S = await de(filtered.map(([w]) => w));
          if (!p) H({ event: "consent_unset", putOff: S });
          return;
        }
        await ve(configs);
      },
      xe = async (e) => {
        let n = await ae();
        if (p) return;
        if (((G = Object.entries(n.configs)), n.deniedBySettings)) W();
        let r = n.deniedBySettings ? {} : n.configs;
        if (Oe(se(r)) === pe) {
          await I("tools_changed");
          return;
        }
        if (
          (z?.(), (z = void 0), (T = !1), await e.stop().catch((s) => logError(toError(s))), (M = void 0), p)
        )
          return;
        let i = await Q();
        if (p) return;
        if (i === "declined") {
          ne();
          return;
        }
        if (i !== "accepted") {
          V();
          let keys = Object.keys(se(r));
          if (i === "unset" && keys.length > 0) {
            let S = await de(keys);
            if (!p) H({ event: "consent_unset", putOff: S });
          }
          return;
        }
        await ve(B() ? {} : r);
      },
      ve = async (e) => {
        let n = se(e),
          r = Re(n);
        ((M = r),
          (pe = Oe(n)),
          (z = r.subscribe(() => {
            if (T && M === r) I("tools_changed").catch((s) => logError(toError(s)));
          })));
        let settled = await r.settled;
        if (
          ((T = !0),
          logForDebugging(
            `[deviceBridge] MCP servers for the cloud session settled: ${settled.connected} connected, ${settled.cached} cached, ${settled.failed} failed, ${settled.needsAuth} need login, ${settled.unreported} still starting (${settled.settleMs} ms)`,
          ),
          p)
        ) {
          await r.stop();
          return;
        }
        await I("tools_settled");
      },
      ye = () => {},
      Se = () => {
        if (p) return;
        ((ye = (
          o.subscribeConfigurationChanges ?? ((e) => subscribeMcpConfigChanges(e, d.servedSettingsChanged))
        )(() => void me())),
          me());
      };
    if (d.deviceMcpQuestion === void 0) Se();
    else
      d.deviceMcpQuestion
        .then((e) => {
          ((ce = e === "declined"), Se());
        })
        .catch((e) => logError(toError(e)));
    return () => {
      if (((p = !0), onRedescribed(), ye(), z?.(), V(), y.dispose(), te))
        logEvent("tengu_device_mcp_serving", {
          event: lit("withdrawn"),
          announced_count: 0,
          dropped_count: 0,
          policy: fromEnum(y.policy.name),
        });
      M?.stop().catch((e) => logError(toError(e)));
    };
  };
}
//@ chunk-xqfbbyzk.js:25038-25082 placement
function se(o) {
  return Do(o, (d, E) => isForwardableDeviceMcp(E, d));
}
//@ chunk-xqfbbyzk.js:25082-25148 placement
function Oe(o) {
  return jsonStringify(
    Object.keys(o)
      .sort()
      .map((d) => [d, o[d]]),
  );
}
