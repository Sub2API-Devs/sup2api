/**
 * components/LogoV2/LogoV2.tsx
 *
 * 启动 Logo 主组件：根据宽度/会话状态选择完整欢迎框或精简 Logo，并挂 Feed、通知、提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/LogoV2.tsx
 * pieces: chunk-hnxhr3bs.js (23)
 * attribution: placement 14, sole-consumer 8, callgraph-witnessed 1
 */
import {
  init_react_production,
  useSyncExternalStore,
  useState,
  useEffect,
  useContext,
  fragmentTypeExport,
} from "../../../vendor/react/cjs/react.production.js";
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
import { countWhere, stringArray } from "../../utils/collections.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { SlashLinkContexts, slashCommandLinkContext } from "../SlashCommandLink.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:68610-68614 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:68610", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:68614-68645 placement
function useComplianceTaints() {
  return useSyncExternalStore(onComplianceTaintsChanged, getComplianceTaints);
}
//@ chunk-hnxhr3bs.js:68645-68685 placement
/**
 * 函数 useHasComplianceTaint（是否有合规标记）；位于「启动 Logo 主组件：根据宽度/会话状态选择完整欢迎框或精简 Logo，并挂 Feed、通知、提示」模块。
 */
function useHasComplianceTaint(taints) {
  return useSyncExternalStore(onComplianceTaintsChanged, () => hasComplianceTaint(taints));
}
//@ chunk-hnxhr3bs.js:68685-68689 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:68685", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:68689-68721 placement
function useLastLoadStatus() {
  return useSyncExternalStore(onLastLoadStatusChanged, getLastLoadStatus);
}
//@ chunk-hnxhr3bs.js:68721-68783 placement
var MAX_NOTICED_MCP_SERVERS = 128;
var MCP_CONNECTION_CHECKS = {
  hasEverConnected: hasClaudeAiMcpEverConnected,
  connectedThisSession: isClaudeAiMcpConnectedThisSession,
};
//@ chunk-hnxhr3bs.js:68783-68969 placement
function isNeedsAuthNotice(client, { hasEverConnected, connectedThisSession }) {
  if (client.type !== "needs-auth" || !isNoticeableMcpServer(client, hasEverConnected, connectedThisSession))
    return false;
  return (
    getCliOwnedState().needsAuthNoticedThisSession.has(client.name) ||
    !stringArrayOf(getGlobalConfig()).includes(client.name)
  );
}
//@ chunk-hnxhr3bs.js:68969-69011 placement
function countNeedsAuthServers_2(clients, connectionState) {
  return countWhere(clients, (client) => isNeedsAuthNotice(client, connectionState));
}
//@ chunk-hnxhr3bs.js:69011-69314 placement
function needsAuthNoticeServers(clients, connectionState, storageV5) {
  let needsAuthNoticedThisSession = getCliOwnedState().needsAuthNoticedThisSession;
  let noticed = [];
  for (let client of clients)
    if (isNeedsAuthNotice(client, connectionState) && !needsAuthNoticedThisSession.has(client.name)) {
      needsAuthNoticedThisSession.add(client.name);
      noticed.push(client.name);
    }
  if (noticed.length === 0) return;
  saveGlobalConfig((config) => {
    let noticedList = stringArrayOf(config);
    let filtered = noticed.filter((name) => !noticedList.includes(name));
    if (filtered.length === 0) return config;
    let merged = [...noticedList, ...filtered];
    return {
      ...config,
      mcpNeedsAuthNoticed: merged.slice(-MAX_NOTICED_MCP_SERVERS),
    };
  }, storageV5);
}
//@ chunk-hnxhr3bs.js:69314-69427 placement (2.1.88 match: findChromeClient, 1)
function findChromeClient(clients) {
  let noticedList = stringArrayOf(getGlobalConfig());
  if (noticedList.length === 0) return 0;
  return countWhere(clients, (client) => client.type === "connected" && noticedList.includes(client.name));
}
//@ chunk-hnxhr3bs.js:69427-69629 placement
function clearNoticedMcpNeedsAuth(clients, storageV5) {
  saveGlobalConfig((config) => {
    let noticedList = stringArrayOf(config);
    if (noticedList.length === 0) return config;
    let filtered = noticedList.filter(
      (name) => !clients.some((client) => client.name === name && client.type === "connected"),
    );
    if (filtered.length === noticedList.length) return config;
    return {
      ...config,
      mcpNeedsAuthNoticed: filtered,
    };
  }, storageV5);
}
//@ chunk-hnxhr3bs.js:69629-69677 placement
function stringArrayOf(globalConfig) {
  return stringArray(globalConfig.mcpNeedsAuthNoticed);
}
//@ chunk-hnxhr3bs.js:69720-69733 placement
var MCP_CONNECTED_TTL_MS = 15000;
//@ chunk-hnxhr3bs.js:70156-70160 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:70156", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:117015-117101 sole-consumer
function unknownModelWindowModel(state) {
  return state.setupIssues.unknownModelWindowWarning ? state.mainLoopModel : null;
}
//@ chunk-hnxhr3bs.js:117101-117197 sole-consumer
function selectUnknownModelWindowModel(appState) {
  return appState.setupIssues.unknownModelWindowWarning ? appState.mainLoopModelForSession : null;
}
//@ chunk-hnxhr3bs.js:117197-117249 sole-consumer
function selectReplBridgeAutoOn(state) {
  return state.replBridgeAutoOnByDefault;
}
//@ chunk-hnxhr3bs.js:117249-117296 sole-consumer (2.1.88 match: _temp4, 1)
function selectReplBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-hnxhr3bs.js:117296-117341 sole-consumer (2.1.88 match: _temp, 1)
function countNeedsAuthServers(s) {
  return countNeedsAuthServers_2(s.mcp.clients, MCP_CONNECTION_CHECKS);
}
//@ chunk-hnxhr3bs.js:117341-117383 sole-consumer (2.1.88 match: _temp, 1)
function countChromeClients(s) {
  return findChromeClient(s.mcp.clients);
}
//@ chunk-hnxhr3bs.js:117383-117393 sole-consumer
var EMPTY_MEMORY_FILES = [];
//@ chunk-hnxhr3bs.js:117393-117709 sole-consumer
/**
 * 异步加载 CLAUDE.md 等记忆文件（关闭 CLAUDE.md 加载时为空），组件卸载后忽略结果；返回当前结果。
 */
function useMemoryFiles(showGuestPassesUpsell, storageV5, credentials) {
  let $ = useMemoCache(7);
  let loading;
  if ($[0] !== credentials || $[1] !== showGuestPassesUpsell || $[2] !== storageV5) {
    loading = isClaudeMdLoadingDisabled()
      ? null
      : getMemoryFilesCached(showGuestPassesUpsell, false, storageV5, credentials);
    $[0] = credentials;
    $[1] = showGuestPassesUpsell;
    $[2] = storageV5;
    $[3] = loading;
  } else loading = $[3];
  let loading_2 = loading;
  let [memoryFiles, setMemoryFiles] = useState(EMPTY_MEMORY_FILES);
  let loadEffect;
  let loadDeps;
  if ($[4] !== loading_2) {
    loadEffect = () => {
      if (loading_2 === null) {
        setMemoryFiles(EMPTY_MEMORY_FILES);
        return;
      }
      let alive = true;
      loading_2.then((files) => {
        if (alive) setMemoryFiles(files);
      }, noopMountEffect);
      return () => {
        alive = false;
      };
    };
    loadDeps = [loading_2];
    $[4] = loading_2;
    $[5] = loadEffect;
    $[6] = loadDeps;
  } else {
    loadEffect = $[5];
    loadDeps = $[6];
  }
  useEffect(loadEffect, loadDeps);
  return memoryFiles;
}
//@ chunk-hnxhr3bs.js:117709-121325 callgraph-witnessed (2.1.88 match: LogoV2, 0.172)
function LogoV2(props) {
  let $ = useMemoCache(28);
  let options;
  if ($[0] !== props) {
    options = props === undefined ? {} : props;
    $[0] = props;
    $[1] = options;
  } else options = $[1];
  let { latchAnnouncementSlot, homeMessage } = options;
  let latchSlot = latchAnnouncementSlot === undefined ? true : latchAnnouncementSlot;
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
  let selectAgentDefs;
  if ($[2] !== latchSlot) {
    selectAgentDefs = (state) => (latchSlot ? state.agentDefinitions : undefined);
    $[2] = latchSlot;
    $[3] = selectAgentDefs;
  } else selectAgentDefs = $[3];
  let agentDefinitions = useAppStateSlice(selectAgentDefs);
  let mcpNeedsAuthCount = useAppStateSlice(countNeedsAuthServers) ?? 0;
  let chromeClientCount = useAppStateSlice(countChromeClients) ?? 0;
  let appStore = useContext(appStoreContext);
  let clearAuthEffect;
  let clearAuthDeps;
  if ($[4] !== appStore || $[5] !== latchSlot || $[6] !== chromeClientCount || $[7] !== storageV5) {
    clearAuthEffect = () => {
      if (!latchSlot || appStore === null || chromeClientCount === 0) {
        return;
      }
      clearNoticedMcpNeedsAuth(appStore.getState().mcp.clients, storageV5);
    };
    clearAuthDeps = [latchSlot, appStore, chromeClientCount, storageV5];
    $[4] = appStore;
    $[5] = latchSlot;
    $[6] = chromeClientCount;
    $[7] = storageV5;
    $[8] = clearAuthEffect;
    $[9] = clearAuthDeps;
  } else {
    clearAuthEffect = $[8];
    clearAuthDeps = $[9];
  }
  useEffect(clearAuthEffect, clearAuthDeps);
  useComplianceTaints();
  useStoreSelector(useTasksV2);
  useModelSuccessorSubscriptions();
  let selectHasInitialMessage;
  if ($[10] !== appStore) {
    selectHasInitialMessage = () => (appStore?.getState().initialMessage ?? null) !== null;
    $[10] = appStore;
    $[11] = selectHasInitialMessage;
  } else selectHasInitialMessage = $[11];
  let hasInitialMessage = selectHasInitialMessage;
  let [launchPromptTaken] = useState(hasInitialMessage);
  useLastLoadStatus();
  let memoryFiles = useMemoryFiles(showGuestPassesUpsell, storageV5, credentials);
  let unknownModelWindowWarning = appStateSlice?.unknownModelWindowWarning ?? null;
  let matchingUnknownModelWarning;
  if ($[12] !== appStateSlice_2 || $[13] !== appStateSlice_3 || $[14] !== unknownModelWindowWarning) {
    matchingUnknownModelWarning =
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
    $[15] = matchingUnknownModelWarning;
  } else matchingUnknownModelWarning = $[15];
  let unknownModelWindowWarning_2 = matchingUnknownModelWarning;
  const config = getGlobalConfig();
  let isLaunchPromptPending;
  if ($[16] !== hasInitialMessage || $[17] !== launchPromptTaken) {
    isLaunchPromptPending = () => launchPromptTaken || hasInitialMessage();
    $[16] = hasInitialMessage;
    $[17] = launchPromptTaken;
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
  let modelRestrictedWarning;
  qe: {
    let modelRestrictedWarning_2 = appStateSlice?.modelRestrictedWarning;
    if (!modelRestrictedWarning_2) {
      modelRestrictedWarning = null;
      break qe;
    }
    let model = getMainLoopModel();
    let fullModelDisplayName = strip1mSuffix(modelRestrictedWarning_2.requested.trim().toLowerCase());
    if (
      !isModeDependentModelSetting(fullModelDisplayName) &&
      fullModelDisplayName !== "best" &&
      parseUserSpecifiedModel(modelRestrictedWarning_2.requested).toLowerCase() === model.toLowerCase()
    ) {
      modelRestrictedWarning = null;
      break qe;
    }
    modelRestrictedWarning = {
      requested: modelRestrictedWarning_2.requested,
      effective: model,
    };
  }
  let noticeProps = {
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
    modelRestrictedWarning,
    sandboxDeniesOnAnotherHostCount: appStateSlice?.sandboxDeniesOnAnotherHostCount ?? 0,
    existingClaudeSubscription: appStateSlice?.existingClaudeSubscription ?? null,
    replBridgeAutoOnByDefault: agent ?? false,
    replBridgeSessionUrl: effortValue,
    mcpNeedsAuthCount,
    storageV5,
  };
  let statusNotices = (latchSlot ? resolveAnnouncementSlot : selectStatusNotices)(
    activeStatusNotices(noticeProps),
    layoutMode,
    {
      suppressPromos: isPromoOffersBlocked(),
    },
  );
  let { slot, warnings } = statusNotices;
  let homeNotice;
  let showHomeNotice = false || homeNotice !== undefined;
  let hasWarnings = warnings.length > 0;
  let hasSlot = slot !== null;
  let hasAnt = statusNotices.ant.length > 0;
  let showAccentBar = slot?.showAccentBar?.() ?? true;
  let overflowBox =
    statusNotices.slotOverflowCount > 0 &&
    jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default_2(InfoNotice, {
        children: [
          statusNotices.slotOverflowCount,
          " more ",
          plural(statusNotices.slotOverflowCount, "notice"),
          " ",
          "hidden",
        ],
      }),
    });
  const contextProvider = noticeImpressionEnabled;
  const Wrapper = FreezeWhenOffscreen;
  const children =
    !hasWarnings && !hasSlot && !hasAnt && !showHomeNotice
      ? null
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          flexGrow: showHomeNotice ? 1 : 0,
          children: [
            showHomeNotice &&
              jsxProd_default(SlashLinkContexts.Provider, {
                value: true,
                children: jsxProd_default(Box, {
                  flexDirection: "column",
                  alignItems: "center",
                  marginTop: 1,
                  marginBottom: hasWarnings || hasSlot || hasAnt || overflowBox !== false ? 1 : 0,
                  children: (homeNotice ?? null)?.render(noticeProps),
                }),
              }),
            jsxProd_default(McpAuthNoticeTrigger, {
              count: mcpNeedsAuthCount,
              storageV5,
            }),
            jsxProd_default(NoticeVisibilityTracker, {
              rows: noticeProps.securityWarnings,
              storageV5,
            }),
            warnings.map((warning) =>
              jsxProd_default(
                fragmentTypeExport,
                {
                  children: warning.render(noticeProps),
                },
                warning.id,
              ),
            ),
            false &&
              overflowBox !== false &&
              jsxProd_default(Box, {
                marginTop: hasWarnings ? 1 : 0,
                children: overflowBox,
              }),
            slot === null
              ? null
              : jsxProd_default(slashCommandLinkContext.Provider, {
                  value: false,
                  children: jsxProd_default_2(Box, {
                    flexDirection: "column",
                    marginTop: hasWarnings ? 1 : 0,
                    children: [
                      jsxProd_default(Box, {
                        flexDirection: "column",
                        paddingLeft: showAccentBar ? 1 : 2,
                        borderStyle: showAccentBar ? "quote" : undefined,
                        borderTop: false,
                        borderBottom: false,
                        borderRight: false,
                        borderColor: slot.tier === "announcement" ? "claude" : undefined,
                        borderDimColor: slot.tier !== "announcement",
                        children: slot.render(noticeProps),
                      }),
                      overflowBox,
                    ],
                  }),
                }),
            hasAnt &&
              jsxProd_default(Box, {
                flexDirection: "column",
                paddingLeft: 2,
                marginTop: hasWarnings || hasSlot || (false && overflowBox !== false) ? 1 : 0,
                children: statusNotices.ant.map((antNotice) =>
                  jsxProd_default(
                    fragmentTypeExport,
                    {
                      children: antNotice.render(noticeProps),
                    },
                    antNotice.id,
                  ),
                ),
              }),
          ],
        });
  let children_2;
  if ($[21] !== Wrapper || $[22] !== children) {
    children_2 = jsxProd_default(Wrapper, {
      children,
    });
    $[21] = Wrapper;
    $[22] = children;
    $[23] = children_2;
  } else children_2 = $[23];
  let wrapped;
  if ($[24] !== latchSlot || $[25] !== contextProvider.Provider || $[26] !== children_2) {
    wrapped = jsxProd_default(contextProvider.Provider, {
      value: latchSlot,
      children: children_2,
    });
    $[24] = latchSlot;
    $[25] = contextProvider.Provider;
    $[26] = children_2;
    $[27] = wrapped;
  } else wrapped = $[27];
  return wrapped;
}
export { useHasComplianceTaint, LogoV2, MCP_CONNECTED_TTL_MS, needsAuthNoticeServers, MCP_CONNECTION_CHECKS };
