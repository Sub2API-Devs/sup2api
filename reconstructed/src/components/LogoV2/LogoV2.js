/**
 * components/LogoV2/LogoV2.tsx
 *
 * 启动 Logo 主组件：根据宽度/会话状态选择完整欢迎框或精简 Logo，并挂 Feed、通知、提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/LogoV2.tsx
 * pieces: chunk-ag5x7vhf.js (22)
 * attribution: placement 14, sole-consumer 7, callgraph-witnessed 1
 */
import { yt, j, y, P, Se, Kc } from "../../../vendor/react/cjs/react.production.js";
import {
  onComplianceTaintsChanged,
  getComplianceTaints,
  hasComplianceTaint,
} from "../../services/policyLimits/complianceTaints.js";
import {
  onLastLoadStatusChanged,
  getLastLoadStatus,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import {
  hasClaudeAiMcpEverConnected,
  isClaudeAiMcpConnectedThisSession,
} from "../../services/mcp/claudeai.js";
import { isNoticeableMcpServer } from "../../hooks/notifs/useMcpConnectivityStatus.js";
import { ht } from "../../services/mcp/cliOwnedClients.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { count, stringArray } from "../../utils/collections.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import { getMemoryFilesCached } from "../../utils/claudemd.js";
import {
  vE,
  selectSetupIssues,
  resolveAnnouncementSlot,
  Zm,
  activeStatusNotices,
  McpAuthNoticeTrigger,
  NoticeVisibilityTracker,
} from "../../utils/statusNoticeDefinitions.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getLayoutMode } from "../../utils/logoV2Utils.js";
import { useSession } from "../../context/session.js";
import { rs, gM } from "../../state/AppState.js";
import { CE } from "../../commands/fast/fast.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useTasksV2 } from "../../hooks/useTasksV2.js";
import { Ml } from "./ModelSuccessorNotice.js";
import { getMainLoopModelFromState } from "../../hooks/useMainLoopModel.js";
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { oKe } from "../../services/compact/autoCompactWindow.js";
import { env } from "../../utils/env.js";
import { getUnusableEnterpriseMcpConfigMessage } from "../../services/mcp/config.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { Lt } from "../../utils/model/modelIds.js";
import { isModeDependentModelSetting } from "../../utils/model/planModeModel.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isPromoOffersBlocked } from "../../utils/planTiers.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { InfoNotice } from "./Notices.js";
import { plural } from "../../utils/stringUtils.js";
import { hr } from "./CondensedLogo.js";
import { FreezeWhenOffscreen } from "../FreezeWhenOffscreen.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";

//@ chunk-ag5x7vhf.js:69058-69089 placement
function Yd() {
  return yt(onComplianceTaintsChanged, getComplianceTaints);
}
//@ chunk-ag5x7vhf.js:69089-69128 placement
function P7(m) {
  return yt(onComplianceTaintsChanged, () => hasComplianceTaint(m));
}
//@ chunk-ag5x7vhf.js:69128-69132 placement
j();
//@ chunk-ag5x7vhf.js:69132-69164 placement
function Xd() {
  return yt(onLastLoadStatusChanged, getLastLoadStatus);
}
//@ chunk-ag5x7vhf.js:69164-69226 placement
var y_ = 128,
  Qr = {
    hasEverConnected: hasClaudeAiMcpEverConnected,
    connectedThisSession: isClaudeAiMcpConnectedThisSession,
  };
//@ chunk-ag5x7vhf.js:69226-69412 placement
function isNeedsAuthNotice(
  m,
  { hasEverConnected: hasEverConnected, connectedThisSession: connectedThisSession },
) {
  if (m.type !== "needs-auth" || !isNoticeableMcpServer(m, hasEverConnected, connectedThisSession)) return !1;
  return ht().needsAuthNoticedThisSession.has(m.name) || !il(getGlobalConfig()).includes(m.name);
}
//@ chunk-ag5x7vhf.js:69412-69454 placement
function countNeedsAuthServers(m, h) {
  return count(m, (x) => isNeedsAuthNotice(x, h));
}
//@ chunk-ag5x7vhf.js:69454-69757 placement
function needsAuthNoticeServers(m, h, x) {
  let needsAuthNoticedThisSession = ht().needsAuthNoticedThisSession,
    k = [];
  for (let _ of m)
    if (isNeedsAuthNotice(_, h) && !needsAuthNoticedThisSession.has(_.name))
      (needsAuthNoticedThisSession.add(_.name), k.push(_.name));
  if (k.length === 0) return;
  saveGlobalConfig((_) => {
    let I = il(_),
      filtered = k.filter((L) => !I.includes(L));
    if (filtered.length === 0) return _;
    let A = [...I, ...filtered];
    return { ..._, mcpNeedsAuthNoticed: A.slice(-y_) };
  }, x);
}
//@ chunk-ag5x7vhf.js:69757-69870 placement = findChromeClient (1)
function findChromeClient(clients) {
  let h = il(getGlobalConfig());
  if (h.length === 0) return 0;
  return count(clients, (client) => client.type === "connected" && h.includes(client.name));
}
//@ chunk-ag5x7vhf.js:69870-70072 placement
function clearNoticedMcpNeedsAuth(m, h) {
  saveGlobalConfig((x) => {
    let T = il(x);
    if (T.length === 0) return x;
    let filtered = T.filter((_) => !m.some((I) => I.name === _ && I.type === "connected"));
    if (filtered.length === T.length) return x;
    return { ...x, mcpNeedsAuthNoticed: filtered };
  }, h);
}
//@ chunk-ag5x7vhf.js:70072-70120 placement
function il(m) {
  return stringArray(m.mcpNeedsAuthNoticed);
}
//@ chunk-ag5x7vhf.js:70163-70176 placement
var nm = 15000;
//@ chunk-ag5x7vhf.js:70599-70603 placement
j();
//@ chunk-ag5x7vhf.js:74592-74596 placement
j();
//@ chunk-ag5x7vhf.js:112980-113076 sole-consumer
function ME(oo) {
  return oo.setupIssues.unknownModelWindowWarning ? oo.mainLoopModelForSession : null;
}
//@ chunk-ag5x7vhf.js:113076-113128 sole-consumer
function kE(mo) {
  return mo.replBridgeAutoOnByDefault;
}
//@ chunk-ag5x7vhf.js:113128-113175 sole-consumer = _temp4 (1)
function _E(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-ag5x7vhf.js:113175-113220 sole-consumer = _temp (1)
function IE(s) {
  return countNeedsAuthServers(s.mcp.clients, Qr);
}
//@ chunk-ag5x7vhf.js:113220-113262 sole-consumer = _temp (1)
function EE(s) {
  return findChromeClient(s.mcp.clients);
}
//@ chunk-ag5x7vhf.js:113262-113272 sole-consumer
var Dl = [];
/**
 * 异步加载 CLAUDE.md 等记忆文件（关闭 CLAUDE.md 加载时为空），组件卸载后忽略结果；返回当前结果。
 */
//@ chunk-ag5x7vhf.js:113272-113588 sole-consumer
function useMemoryFiles(m, h, x) {
  let T = w(7),
    k;
  if (T[0] !== x || T[1] !== m || T[2] !== h)
    ((k = isClaudeMdLoadingDisabled() ? null : getMemoryFilesCached(m, !1, h, x)),
      (T[0] = x),
      (T[1] = m),
      (T[2] = h),
      (T[3] = k));
  else k = T[3];
  let _ = k,
    [I, D] = y(Dl),
    A,
    L;
  if (T[4] !== _)
    ((A = () => {
      if (_ === null) {
        D(Dl);
        return;
      }
      let V = !0;
      return (
        _.then((W) => {
          if (V) D(W);
        }, vE),
        () => {
          V = !1;
        }
      );
    }),
      (L = [_]),
      (T[4] = _),
      (T[5] = A),
      (T[6] = L));
  else ((A = T[5]), (L = T[6]));
  return (P(A, L), I);
}
//@ chunk-ag5x7vhf.js:113588-117168 callgraph-witnessed = LogoV2 (0.17)
function LogoV2(m) {
  let $ = w(28),
    x;
  if ($[0] !== m) ((x = m === void 0 ? {} : m), ($[0] = m), ($[1] = x));
  else x = $[1];
  let { latchAnnouncementSlot: latchAnnouncementSlot, homeMessage: homeMessage } = x,
    _ = latchAnnouncementSlot === void 0 ? !0 : latchAnnouncementSlot;
  homeMessage === void 0 ? !1 : homeMessage;
  let { storageV5: storageV5, credentials: credentials } = Me(),
    { columns: columns } = useTerminalSize(),
    L = getLayoutMode(columns),
    showGuestPassesUpsell = useSession(),
    W = rs(selectSetupIssues),
    z = rs(CE),
    K = rs(ME),
    agent = rs(kE),
    effortValue = rs(_E),
    pe;
  if ($[2] !== _) ((pe = (xe) => (_ ? xe.agentDefinitions : void 0)), ($[2] = _), ($[3] = pe));
  else pe = $[3];
  let ge = rs(pe),
    Re = rs(IE) ?? 0,
    We = rs(EE) ?? 0,
    fe = Se(gM),
    Fe,
    te;
  if ($[4] !== fe || $[5] !== _ || $[6] !== We || $[7] !== storageV5)
    ((Fe = () => {
      if (!_ || fe === null || We === 0) {
        return;
      }
      clearNoticedMcpNeedsAuth(fe.getState().mcp.clients, storageV5);
    }),
      (te = [_, fe, We, storageV5]),
      ($[4] = fe),
      ($[5] = _),
      ($[6] = We),
      ($[7] = storageV5),
      ($[8] = Fe),
      ($[9] = te));
  else ((Fe = $[8]), (te = $[9]));
  (P(Fe, te), Yd(), useStoreSelector(useTasksV2), Ml());
  let me;
  if ($[10] !== fe)
    ((me = () => (fe?.getState().initialMessage ?? null) !== null), ($[10] = fe), ($[11] = me));
  else me = $[11];
  let se = me,
    [_e] = y(se);
  Xd();
  let oe = useMemoryFiles(showGuestPassesUpsell, storageV5, credentials),
    ve = W?.unknownModelWindowWarning ?? null,
    Ee;
  if ($[12] !== z || $[13] !== K || $[14] !== ve)
    ((Ee =
      ve !== null &&
      ve.model === getMainLoopModelFromState({ mainLoopModel: z ?? null, mainLoopModelForSession: K ?? null })
        ? ve
        : null),
      ($[12] = z),
      ($[13] = K),
      ($[14] = ve),
      ($[15] = Ee));
  else Ee = $[15];
  let He = Ee;
  const Ue = getGlobalConfig();
  let lt;
  if ($[16] !== se || $[17] !== _e) ((lt = () => _e || se()), ($[16] = se), ($[17] = _e), ($[18] = lt));
  else lt = $[18];
  const it = W?.modelDeprecationWarning ?? null;
  let ae;
  if ($[19] !== W?.securityWarnings)
    ((ae = W?.securityWarnings ?? []), ($[19] = W?.securityWarnings), ($[20] = ae));
  else ae = $[20];
  const tt = getIsRemoteMode() ? null : oKe(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW),
    ct = getIsRemoteMode() ? null : getUnusableEnterpriseMcpConfigMessage();
  let Je;
  Qe: {
    let $e = W?.modelRestrictedWarning;
    if (!$e) {
      Je = null;
      break Qe;
    }
    let model = getMainLoopModel();
    let fullModelDisplayName = Lt($e.requested.trim().toLowerCase());
    if (
      !isModeDependentModelSetting(fullModelDisplayName) &&
      fullModelDisplayName !== "best" &&
      parseUserSpecifiedModel($e.requested).toLowerCase() === model.toLowerCase()
    ) {
      Je = null;
      break Qe;
    }
    Je = { requested: $e.requested, effective: model };
  }
  let pt = {
      session: showGuestPassesUpsell,
      config: Ue,
      agentDefinitions: ge,
      memoryFiles: oe,
      isLaunchPromptPending: lt,
      modelDeprecationWarning: it,
      unknownModelWindowWarning: He,
      securityWarnings: ae,
      autoCompactWindowEnvWarning: tt,
      unusableManagedMcpConfigMessage: ct,
      modelRestrictedWarning: Je,
      sandboxDeniesOnAnotherHostCount: W?.sandboxDeniesOnAnotherHostCount ?? 0,
      existingClaudeSubscription: W?.existingClaudeSubscription ?? null,
      replBridgeAutoOnByDefault: agent ?? !1,
      replBridgeSessionUrl: effortValue,
      mcpNeedsAuthCount: Re,
      storageV5: storageV5,
    },
    rt = (_ ? resolveAnnouncementSlot : Zm)(activeStatusNotices(pt), L, {
      suppressPromos: isPromoOffersBlocked(),
    }),
    { slot: slot, warnings: warnings } = rt,
    dt,
    Pt = !1 || dt !== void 0,
    Ot = warnings.length > 0,
    It = slot !== null,
    kt = rt.ant.length > 0,
    to = slot?.showAccentBar?.() ?? !0,
    de =
      rt.slotOverflowCount > 0 &&
      e(Box, {
        paddingLeft: 2,
        children: r(InfoNotice, {
          children: [rt.slotOverflowCount, " more ", plural(rt.slotOverflowCount, "notice"), " ", "hidden"],
        }),
      });
  const le = hr,
    Be = FreezeWhenOffscreen,
    Ve =
      !Ot && !It && !kt && !Pt
        ? null
        : r(Box, {
            flexDirection: "column",
            flexGrow: Pt ? 1 : 0,
            children: [
              Pt &&
                e(SlashLinkContexts.Provider, {
                  value: !0,
                  children: e(Box, {
                    flexDirection: "column",
                    alignItems: "center",
                    marginTop: 1,
                    marginBottom: Ot || It || kt || de !== !1 ? 1 : 0,
                    children: (dt ?? null)?.render(pt),
                  }),
                }),
              e(McpAuthNoticeTrigger, { count: Re, storageV5: storageV5 }),
              e(NoticeVisibilityTracker, { rows: pt.securityWarnings, storageV5: storageV5 }),
              warnings.map((st) => e(Kc, { children: st.render(pt) }, st.id)),
              !1 && de !== !1 && e(Box, { marginTop: Ot ? 1 : 0, children: de }),
              slot === null
                ? null
                : r(Box, {
                    flexDirection: "column",
                    marginTop: Ot ? 1 : 0,
                    children: [
                      e(Box, {
                        flexDirection: "column",
                        paddingLeft: to ? 1 : 2,
                        borderStyle: to ? "quote" : void 0,
                        borderTop: !1,
                        borderBottom: !1,
                        borderRight: !1,
                        borderColor: slot.tier === "announcement" ? "claude" : void 0,
                        borderDimColor: slot.tier !== "announcement",
                        children: slot.render(pt),
                      }),
                      de,
                    ],
                  }),
              kt &&
                e(Box, {
                  flexDirection: "column",
                  paddingLeft: 2,
                  marginTop: Ot || It || (!1 && de !== !1) ? 1 : 0,
                  children: rt.ant.map((Ge) => e(Kc, { children: Ge.render(pt) }, Ge.id)),
                }),
            ],
          });
  let ze;
  if ($[21] !== Be || $[22] !== Ve)
    ((ze = e(Be, { children: Ve })), ($[21] = Be), ($[22] = Ve), ($[23] = ze));
  else ze = $[23];
  let At;
  if ($[24] !== _ || $[25] !== le.Provider || $[26] !== ze)
    ((At = e(le.Provider, { value: _, children: ze })),
      ($[24] = _),
      ($[25] = le.Provider),
      ($[26] = ze),
      ($[27] = At));
  else At = $[27];
  return At;
}

export { LogoV2, P7, nm, needsAuthNoticeServers, Qr };
