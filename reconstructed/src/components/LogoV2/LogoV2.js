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
import { yt, init_react_production, y, P, Se, Kc } from "../../../vendor/react/cjs/react.production.js";
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
import { getCliOwnedState } from "../../services/mcp/cliOwnedClients.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { count, stringArray } from "../../utils/collections.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import { getMemoryFilesCached } from "../../utils/claudemd.js";
import {
  noopMountEffect,
  selectSetupIssues,
  resolveAnnouncementSlot,
  selectStatusNotices,
  activeStatusNotices,
  McpAuthNoticeTrigger,
  NoticeVisibilityTracker,
} from "../../utils/statusNoticeDefinitions.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getLayoutMode } from "../../utils/logoV2Utils.js";
import { useSession } from "../../context/session.js";
import { useAppStateSlice, appStoreContext } from "../../state/AppState.js";
import { unknownModelWindowModel } from "../../commands/fast/fast.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useTasksV2 } from "../../hooks/useTasksV2.js";
import { useModelSuccessorSubscriptions } from "./ModelSuccessorNotice.js";
import { getMainLoopModelFromState } from "../../hooks/useMainLoopModel.js";
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { reportInvalidWindowEnv } from "../../services/compact/autoCompactWindow.js";
import { env } from "../../utils/env.js";
import { getUnusableEnterpriseMcpConfigMessage } from "../../services/mcp/config.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import { isModeDependentModelSetting } from "../../utils/model/planModeModel.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isPromoOffersBlocked } from "../../utils/planTiers.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { InfoNotice } from "./Notices.js";
import { plural } from "../../utils/stringUtils.js";
import { noticeImpressionEnabled } from "./CondensedLogo.js";
import { FreezeWhenOffscreen } from "../FreezeWhenOffscreen.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";

//@ chunk-ag5x7vhf.js:69058-69089 placement
function useComplianceTaints() {
  return yt(onComplianceTaintsChanged, getComplianceTaints);
}
//@ chunk-ag5x7vhf.js:69089-69128 placement
/**
 * 函数 useHasComplianceTaint（是否有合规标记）；位于「启动 Logo 主组件：根据宽度/会话状态选择完整欢迎框或精简 Logo，并挂 Feed、通知、提示」模块。
 */
function useHasComplianceTaint(m) {
  return yt(onComplianceTaintsChanged, () => hasComplianceTaint(m));
}
//@ chunk-ag5x7vhf.js:69128-69132 placement
init_react_production();
//@ chunk-ag5x7vhf.js:69132-69164 placement
function useLastLoadStatus() {
  return yt(onLastLoadStatusChanged, getLastLoadStatus);
}
//@ chunk-ag5x7vhf.js:69164-69226 placement
var MAX_NOTICED_MCP_SERVERS = 128;
var MCP_CONNECTION_CHECKS = {
  hasEverConnected: hasClaudeAiMcpEverConnected,
  connectedThisSession: isClaudeAiMcpConnectedThisSession,
};
//@ chunk-ag5x7vhf.js:69226-69412 placement
function isNeedsAuthNotice(m, { hasEverConnected, connectedThisSession }) {
  if (m.type !== "needs-auth" || !isNoticeableMcpServer(m, hasEverConnected, connectedThisSession))
    return false;
  return (
    getCliOwnedState().needsAuthNoticedThisSession.has(m.name) ||
    !stringArrayOf(getGlobalConfig()).includes(m.name)
  );
}
//@ chunk-ag5x7vhf.js:69412-69454 placement
function countNeedsAuthServers_2(clients, h) {
  return count(clients, (x) => isNeedsAuthNotice(x, h));
}
//@ chunk-ag5x7vhf.js:69454-69757 placement
function needsAuthNoticeServers(clients, h, storageV5) {
  let needsAuthNoticedThisSession = getCliOwnedState().needsAuthNoticedThisSession;
  let k = [];
  for (let _ of clients)
    if (isNeedsAuthNotice(_, h) && !needsAuthNoticedThisSession.has(_.name)) {
      needsAuthNoticedThisSession.add(_.name);
      k.push(_.name);
    }
  if (k.length === 0) return;
  saveGlobalConfig((_) => {
    let I = stringArrayOf(_);
    let filtered = k.filter((L) => !I.includes(L));
    if (filtered.length === 0) return _;
    let A = [...I, ...filtered];
    return {
      ..._,
      mcpNeedsAuthNoticed: A.slice(-MAX_NOTICED_MCP_SERVERS),
    };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:69757-69870 placement = findChromeClient (1)
function findChromeClient(clients) {
  let h = stringArrayOf(getGlobalConfig());
  if (h.length === 0) return 0;
  return count(clients, (client) => client.type === "connected" && h.includes(client.name));
}
//@ chunk-ag5x7vhf.js:69870-70072 placement
function clearNoticedMcpNeedsAuth(clients, storageV5) {
  saveGlobalConfig((x) => {
    let T = stringArrayOf(x);
    if (T.length === 0) return x;
    let filtered = T.filter((_) => !clients.some((I) => I.name === _ && I.type === "connected"));
    if (filtered.length === T.length) return x;
    return {
      ...x,
      mcpNeedsAuthNoticed: filtered,
    };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:70072-70120 placement
function stringArrayOf(globalConfig) {
  return stringArray(globalConfig.mcpNeedsAuthNoticed);
}
//@ chunk-ag5x7vhf.js:70163-70176 placement
var MCP_CONNECTED_TTL_MS = 15000;
//@ chunk-ag5x7vhf.js:70599-70603 placement
init_react_production();
//@ chunk-ag5x7vhf.js:74592-74596 placement
init_react_production();
//@ chunk-ag5x7vhf.js:112980-113076 sole-consumer
function selectUnknownModelWindowModel(oo) {
  return oo.setupIssues.unknownModelWindowWarning ? oo.mainLoopModelForSession : null;
}
//@ chunk-ag5x7vhf.js:113076-113128 sole-consumer
function selectReplBridgeAutoOn(mo) {
  return mo.replBridgeAutoOnByDefault;
}
//@ chunk-ag5x7vhf.js:113128-113175 sole-consumer = _temp4 (1)
function selectReplBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-ag5x7vhf.js:113175-113220 sole-consumer = _temp (1)
function countNeedsAuthServers(s) {
  return countNeedsAuthServers_2(s.mcp.clients, MCP_CONNECTION_CHECKS);
}
//@ chunk-ag5x7vhf.js:113220-113262 sole-consumer = _temp (1)
function countChromeClients(s) {
  return findChromeClient(s.mcp.clients);
}
//@ chunk-ag5x7vhf.js:113262-113272 sole-consumer
var EMPTY_MEMORY_FILES = [];
//@ chunk-ag5x7vhf.js:113272-113588 sole-consumer
/**
 * 异步加载 CLAUDE.md 等记忆文件（关闭 CLAUDE.md 加载时为空），组件卸载后忽略结果；返回当前结果。
 */
function useMemoryFiles(showGuestPassesUpsell, storageV5, credentials) {
  let T = w(7);
  let k;
  if (T[0] !== credentials || T[1] !== showGuestPassesUpsell || T[2] !== storageV5) {
    k = isClaudeMdLoadingDisabled()
      ? null
      : getMemoryFilesCached(showGuestPassesUpsell, false, storageV5, credentials);
    T[0] = credentials;
    T[1] = showGuestPassesUpsell;
    T[2] = storageV5;
    T[3] = k;
  } else k = T[3];
  let _ = k;
  let [I, D] = y(EMPTY_MEMORY_FILES);
  let A;
  let L;
  if (T[4] !== _) {
    A = () => {
      if (_ === null) {
        D(EMPTY_MEMORY_FILES);
        return;
      }
      let V = true;
      _.then((W) => {
        if (V) D(W);
      }, noopMountEffect);
      return () => {
        V = false;
      };
    };
    L = [_];
    T[4] = _;
    T[5] = A;
    T[6] = L;
  } else {
    A = T[5];
    L = T[6];
  }
  P(A, L);
  return I;
}
//@ chunk-ag5x7vhf.js:113588-117168 callgraph-witnessed = LogoV2 (0.17)
function LogoV2(m) {
  let $ = w(28);
  let x;
  if ($[0] !== m) {
    x = m === undefined ? {} : m;
    $[0] = m;
    $[1] = x;
  } else x = $[1];
  let { latchAnnouncementSlot, homeMessage } = x;
  let _ = latchAnnouncementSlot === undefined ? true : latchAnnouncementSlot;
  if (homeMessage === undefined) false;
  else homeMessage;
  let { storageV5, credentials } = useTheme_2();
  let { columns } = useTerminalSize();
  let layoutMode = getLayoutMode(columns);
  let showGuestPassesUpsell = useSession();
  let appStateSlice = useAppStateSlice(selectSetupIssues);
  let appStateSlice_2 = useAppStateSlice(unknownModelWindowModel);
  let appStateSlice_3 = useAppStateSlice(selectUnknownModelWindowModel);
  let agent = useAppStateSlice(selectReplBridgeAutoOn);
  let effortValue = useAppStateSlice(selectReplBridgeSessionUrl);
  let pe;
  if ($[2] !== _) {
    pe = (xe) => (_ ? xe.agentDefinitions : undefined);
    $[2] = _;
    $[3] = pe;
  } else pe = $[3];
  let agentDefinitions = useAppStateSlice(pe);
  let Re = useAppStateSlice(countNeedsAuthServers) ?? 0;
  let We = useAppStateSlice(countChromeClients) ?? 0;
  let fe = Se(appStoreContext);
  let Fe;
  let te;
  if ($[4] !== fe || $[5] !== _ || $[6] !== We || $[7] !== storageV5) {
    Fe = () => {
      if (!_ || fe === null || We === 0) {
        return;
      }
      clearNoticedMcpNeedsAuth(fe.getState().mcp.clients, storageV5);
    };
    te = [_, fe, We, storageV5];
    $[4] = fe;
    $[5] = _;
    $[6] = We;
    $[7] = storageV5;
    $[8] = Fe;
    $[9] = te;
  } else {
    Fe = $[8];
    te = $[9];
  }
  P(Fe, te);
  useComplianceTaints();
  useStoreSelector(useTasksV2);
  useModelSuccessorSubscriptions();
  let me;
  if ($[10] !== fe) {
    me = () => (fe?.getState().initialMessage ?? null) !== null;
    $[10] = fe;
    $[11] = me;
  } else me = $[11];
  let se = me;
  let [_e] = y(se);
  useLastLoadStatus();
  let memoryFiles = useMemoryFiles(showGuestPassesUpsell, storageV5, credentials);
  let unknownModelWindowWarning = appStateSlice?.unknownModelWindowWarning ?? null;
  let Ee;
  if ($[12] !== appStateSlice_2 || $[13] !== appStateSlice_3 || $[14] !== unknownModelWindowWarning) {
    Ee =
      unknownModelWindowWarning !== null &&
      unknownModelWindowWarning.model ===
        getMainLoopModelFromState({
          mainLoopModel: appStateSlice_2 ?? null,
          mainLoopModelForSession: appStateSlice_3 ?? null,
        })
        ? unknownModelWindowWarning
        : null;
    $[12] = appStateSlice_2;
    $[13] = appStateSlice_3;
    $[14] = unknownModelWindowWarning;
    $[15] = Ee;
  } else Ee = $[15];
  let unknownModelWindowWarning_2 = Ee;
  const config = getGlobalConfig();
  let isLaunchPromptPending;
  if ($[16] !== se || $[17] !== _e) {
    isLaunchPromptPending = () => _e || se();
    $[16] = se;
    $[17] = _e;
    $[18] = isLaunchPromptPending;
  } else isLaunchPromptPending = $[18];
  const modelDeprecationWarning = appStateSlice?.modelDeprecationWarning ?? null;
  let securityWarnings;
  if ($[19] !== appStateSlice?.securityWarnings) {
    securityWarnings = appStateSlice?.securityWarnings ?? [];
    $[19] = appStateSlice?.securityWarnings;
    $[20] = securityWarnings;
  } else securityWarnings = $[20];
  const autoCompactWindowEnvWarning = getIsRemoteMode()
    ? null
    : reportInvalidWindowEnv(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  const unusableManagedMcpConfigMessage = getIsRemoteMode() ? null : getUnusableEnterpriseMcpConfigMessage();
  let Je;
  Qe: {
    let modelRestrictedWarning = appStateSlice?.modelRestrictedWarning;
    if (!modelRestrictedWarning) {
      Je = null;
      break Qe;
    }
    let model = getMainLoopModel();
    let fullModelDisplayName = strip1mSuffix(modelRestrictedWarning.requested.trim().toLowerCase());
    if (
      !isModeDependentModelSetting(fullModelDisplayName) &&
      fullModelDisplayName !== "best" &&
      parseUserSpecifiedModel(modelRestrictedWarning.requested).toLowerCase() === model.toLowerCase()
    ) {
      Je = null;
      break Qe;
    }
    Je = {
      requested: modelRestrictedWarning.requested,
      effective: model,
    };
  }
  let pt = {
    session: showGuestPassesUpsell,
    config,
    agentDefinitions,
    memoryFiles,
    isLaunchPromptPending,
    modelDeprecationWarning,
    unknownModelWindowWarning: unknownModelWindowWarning_2,
    securityWarnings,
    autoCompactWindowEnvWarning,
    unusableManagedMcpConfigMessage,
    modelRestrictedWarning: Je,
    sandboxDeniesOnAnotherHostCount: appStateSlice?.sandboxDeniesOnAnotherHostCount ?? 0,
    existingClaudeSubscription: appStateSlice?.existingClaudeSubscription ?? null,
    replBridgeAutoOnByDefault: agent ?? false,
    replBridgeSessionUrl: effortValue,
    mcpNeedsAuthCount: Re,
    storageV5,
  };
  let rt = (_ ? resolveAnnouncementSlot : selectStatusNotices)(activeStatusNotices(pt), layoutMode, {
    suppressPromos: isPromoOffersBlocked(),
  });
  let { slot, warnings } = rt;
  let dt;
  let Pt = false || dt !== undefined;
  let Ot = warnings.length > 0;
  let It = slot !== null;
  let kt = rt.ant.length > 0;
  let to = slot?.showAccentBar?.() ?? true;
  let de =
    rt.slotOverflowCount > 0 &&
    jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default_2(InfoNotice, {
        children: [rt.slotOverflowCount, " more ", plural(rt.slotOverflowCount, "notice"), " ", "hidden"],
      }),
    });
  const le = noticeImpressionEnabled;
  const Be = FreezeWhenOffscreen;
  const children =
    !Ot && !It && !kt && !Pt
      ? null
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          flexGrow: Pt ? 1 : 0,
          children: [
            Pt &&
              jsxProd_default(SlashLinkContexts.Provider, {
                value: true,
                children: jsxProd_default(Box, {
                  flexDirection: "column",
                  alignItems: "center",
                  marginTop: 1,
                  marginBottom: Ot || It || kt || de !== false ? 1 : 0,
                  children: (dt ?? null)?.render(pt),
                }),
              }),
            jsxProd_default(McpAuthNoticeTrigger, {
              count: Re,
              storageV5,
            }),
            jsxProd_default(NoticeVisibilityTracker, {
              rows: pt.securityWarnings,
              storageV5,
            }),
            warnings.map((warning) =>
              jsxProd_default(
                Kc,
                {
                  children: warning.render(pt),
                },
                warning.id,
              ),
            ),
            false &&
              de !== false &&
              jsxProd_default(Box, {
                marginTop: Ot ? 1 : 0,
                children: de,
              }),
            slot === null
              ? null
              : jsxProd_default_2(Box, {
                  flexDirection: "column",
                  marginTop: Ot ? 1 : 0,
                  children: [
                    jsxProd_default(Box, {
                      flexDirection: "column",
                      paddingLeft: to ? 1 : 2,
                      borderStyle: to ? "quote" : undefined,
                      borderTop: false,
                      borderBottom: false,
                      borderRight: false,
                      borderColor: slot.tier === "announcement" ? "claude" : undefined,
                      borderDimColor: slot.tier !== "announcement",
                      children: slot.render(pt),
                    }),
                    de,
                  ],
                }),
            kt &&
              jsxProd_default(Box, {
                flexDirection: "column",
                paddingLeft: 2,
                marginTop: Ot || It || (false && de !== false) ? 1 : 0,
                children: rt.ant.map((Ge) =>
                  jsxProd_default(
                    Kc,
                    {
                      children: Ge.render(pt),
                    },
                    Ge.id,
                  ),
                ),
              }),
          ],
        });
  let children_2;
  if ($[21] !== Be || $[22] !== children) {
    children_2 = jsxProd_default(Be, {
      children,
    });
    $[21] = Be;
    $[22] = children;
    $[23] = children_2;
  } else children_2 = $[23];
  let At;
  if ($[24] !== _ || $[25] !== le.Provider || $[26] !== children_2) {
    At = jsxProd_default(le.Provider, {
      value: _,
      children: children_2,
    });
    $[24] = _;
    $[25] = le.Provider;
    $[26] = children_2;
    $[27] = At;
  } else At = $[27];
  return At;
}
export { LogoV2, useHasComplianceTaint, MCP_CONNECTED_TTL_MS, needsAuthNoticeServers, MCP_CONNECTION_CHECKS };
