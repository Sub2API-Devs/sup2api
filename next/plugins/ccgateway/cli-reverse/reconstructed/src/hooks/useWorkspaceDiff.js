/**
 * hooks/useWorkspaceDiff.ts
 *
 * 2.1.316 新增：工作区 diff 侧栏：本地/远程 diff 读取、基准切换与 /diff 切换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7), chunk-e2r2f340.js (37)
 * attribution: placement 44
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { win32, sep, isAbsolute } from "path";
import {
  init_react_production,
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  createContext,
} from "../../vendor/react/cjs/react.production.js";
import { isDiffPanelEnabled } from "../utils/task/framework.js";
import { isDiffPaneAvailable } from "../plugins/bundled/diffPane/index.js";
import { useSettingsState } from "./useSettings.js";
import { useAppState } from "../state/AppState.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { subscribe_2 } from "../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { fetchGitDiff, fetchGitDiff_2, diffBaseRef, isDiffCwdInRepoCached } from "../utils/gitDiff.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { clockContext, defaultSetTimeout } from "../ink/components/ClockContext.js";
import { useHost } from "../context/session.js";
import { onWatchedGitStateChange } from "../utils/git/gitFilesystem.js";
import { getRemoteCaps, hasRemoteCap } from "../remote/remoteMode.js";
import { useDiffData } from "./useDiffData.js";
import { errorMessage } from "../utils/errors.js";
import { classifyControlRequestError, ControlRequestTimeoutError } from "../remote/controlRequestErrors.js";
import { identity } from "../utils/identity.js";
import { DIFF_SIDEBAR_MIN_COLUMNS, DIFF_SIDEBAR_OPEN_COLUMNS } from "../plugins/bundled/diff/index.js";
import {
  getGlobalConfig,
  saveGlobalConfig,
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from "../utils/config.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { hasControlChars } from "../services/policyLimits/complianceTaints.js";
import { getProjectRoot } from "../bootstrap/state.js";
import { getPlatform } from "../utils/platform.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e2r2f340.js:1247-1251 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e2r2f340.js:1247", () => {
  init_react_production();
});
//@ chunk-e2r2f340.js:1251-1305 placement
var diffPanelState = () => ({
  isSidebarOn: isDiffPanelEnabled(),
  isOwnedByPlugin: isDiffPaneAvailable(),
});
//@ chunk-e2r2f340.js:1305-1588 placement
function useDiffSidebarState() {
  let [panelState, setPanelState] = useState(diffPanelState);
  let settingsState = useSettingsState();
  let isPanelFileOpen = useAppState((state) => state.panelFileView !== null);
  useEffect(() => {
    let refresh = () =>
      setPanelState((prev) => {
        let next = diffPanelState();
        return prev.isSidebarOn === next.isSidebarOn && prev.isOwnedByPlugin === next.isOwnedByPlugin
          ? prev
          : next;
      });
    refresh();
    let unsubRefresh = onGrowthBookRefresh(refresh);
    let unsubChange = subscribe_2(refresh);
    return () => {
      unsubRefresh();
      unsubChange();
    };
  }, [settingsState]);
  return panelState.isSidebarOn && (isPanelFileOpen || !panelState.isOwnedByPlugin);
}
//@ chunk-e2r2f340.js:1588-1592 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e2r2f340.js:1588", () => {
  init_react_production();
});
//@ chunk-e2r2f340.js:1592-1657 placement
/**
 * 导出值：同一声明里的多个绑定：DIFF_DEBOUNCE_MS（400：diff 刷新防抖）；DIFF_MIN_REFRESH_MS（150：diff 最小刷新间隔）；DIFF_STALE_MS（2000：diff 过期时间）；EMPTY_DIFF_RESULT（空 hunks 结果）。
 */
var DIFF_DEBOUNCE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DIFF_MIN_REFRESH_MS;
var DIFF_STALE_MS;
var EMPTY_DIFF_RESULT;
deferInit("chunk-e2r2f340.js:1592", () => {
  DIFF_DEBOUNCE_MS = 400;
  DIFF_MIN_REFRESH_MS = 150;
  DIFF_STALE_MS = 2000;
  EMPTY_DIFF_RESULT = {
    hunks: new Map(),
    skippedLarge: new Set(),
  };
});
//@ chunk-e2r2f340.js:1657-2064 placement
async function readWorkspaceDiff(host, baseMode, signal) {
  try {
    let gitDiff = await fetchGitDiff(host, signal, baseMode);
    if (signal?.aborted) return null;
    if (gitDiff === null) {
      logFeatureSad("repl_diff_read", "git_diff_failed");
      return null;
    }
    let hunks =
      gitDiff.stats.filesCount === 0 ? EMPTY_DIFF_RESULT : await fetchGitDiff_2(signal, diffBaseRef(gitDiff));
    if (signal?.aborted) return null;
    if (hunks === null) logFeatureSad("repl_diff_read", "git_hunks_failed");
    else logFeatureOk("repl_diff_read");
    return {
      result: gitDiff,
      hunks,
    };
  } catch (error) {
    if (signal?.aborted) return null;
    logError(error);
    logFeatureSad("repl_diff_read", "git_diff_threw");
    return null;
  }
}
//@ chunk-e2r2f340.js:2064-2340 placement
class PendingRefresh {
  #e = null;
  set(baseMode, refreshKey, round, at) {
    this.#e = {
      baseMode,
      refreshKey,
      round,
      at,
    };
  }
  take(baseMode, nowMs) {
    let primed = this.#e;
    if (primed === null) return;
    if (nowMs - primed.at > DIFF_STALE_MS) {
      this.#e = null;
      return;
    }
    if (primed.baseMode !== baseMode) return;
    this.#e = null;
    return {
      round: primed.round,
      refreshKey: primed.refreshKey,
    };
  }
  get isPrimed() {
    return this.#e !== null;
  }
}
//@ chunk-e2r2f340.js:2340-2363 placement
var diffServiceSlot; // deferred: uses PendingRefresh of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e2r2f340.js:2340", () => {
  diffServiceSlot = new HostScoped(() => new PendingRefresh());
});
//@ chunk-e2r2f340.js:2363-2510 placement
async function prefetchWorkspaceDiff(host, baseMode, refreshKey, signal) {
  let workspaceDiff = await readWorkspaceDiff(host, baseMode, signal);
  if (signal?.aborted) return;
  diffServiceSlot.of(host).set(
    baseMode,
    refreshKey,
    workspaceDiff && {
      result: workspaceDiff.result,
      baseMode,
      hunks: workspaceDiff.hunks ?? EMPTY_DIFF_RESULT,
    },
    Date.now(),
  );
}
//@ chunk-e2r2f340.js:2510-3730 placement
/**
 * 定时读取本地 git diff（会话/未提交/分支三种基准），带缓存与大文件跳过。
 */
function useLocalWorkspaceDiff(appState = 0, isEnabled = true, baseMode = "auto") {
  let setTimeoutImpl = useContext(clockContext)?.setTimeout ?? defaultSetTimeout;
  let host = useHost();
  let [primed] = useState(() =>
    isEnabled ? diffServiceSlot.of(host).take(baseMode, Date.now()) : undefined,
  );
  let [round, setRound] = useState(primed?.round ?? null);
  let [isLoading, setIsLoading] = useState(primed === undefined);
  let hasLoadedRef = useRef(primed !== undefined);
  let skipNextRefreshRef = useRef(primed !== undefined && primed.refreshKey === appState);
  let [gitStateVersion, bumpGitStateVersion] = useState(0);
  useEffect(() => onWatchedGitStateChange(() => bumpGitStateVersion((version) => version + 1)), []);
  useEffect(() => {
    if (!isEnabled) return;
    if (skipNextRefreshRef.current) {
      skipNextRefreshRef.current = false;
      return;
    }
    let isCancelled = false;
    let abortController = new AbortController();
    async function refreshDiff() {
      let workspaceDiff = await readWorkspaceDiff(host, baseMode, abortController.signal);
      if (isCancelled) return;
      if (workspaceDiff !== null) {
        let baseRef = diffBaseRef(workspaceDiff.result);
        setRound((previous) => ({
          result: workspaceDiff.result,
          baseMode,
          hunks:
            workspaceDiff.hunks ??
            (previous !== null && diffBaseRef(previous.result) === baseRef
              ? previous.hunks
              : EMPTY_DIFF_RESULT),
        }));
      }
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
    let cancelTimer = setTimeoutImpl(
      refreshDiff,
      hasLoadedRef.current || appState !== 0 ? DIFF_MIN_REFRESH_MS : 0,
    );
    return () => {
      isCancelled = true;
      cancelTimer();
      abortController.abort();
    };
  }, [appState, isEnabled, gitStateVersion, baseMode, host]);
  return useMemo(() => {
    if (!round)
      return {
        stats: null,
        files: [],
        hunks: new Map(),
        loading: isEnabled && isLoading,
        source: {
          kind: "working-tree",
        },
        baseMode,
      };
    let { stats, perFileStats, source } = round.result;
    let files = [];
    for (let [path, stat] of perFileStats) {
      let isUntracked = stat.isUntracked;
      let isLargeFile = round.hunks.skippedLarge.has(path);
      let changedLines = stat.added + stat.removed;
      let isTruncated = !isLargeFile && !stat.isBinary && changedLines > DIFF_DEBOUNCE_MS;
      files.push({
        path,
        linesAdded: stat.added,
        linesRemoved: stat.removed,
        isBinary: stat.isBinary,
        isLargeFile,
        isTruncated,
        isUntracked,
        preSession: stat.preSession,
      });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    return {
      stats,
      files,
      hunks: round.hunks.hunks,
      loading: false,
      source,
      baseMode: round.baseMode,
      noCommits: round.result.noCommits,
    };
  }, [round, isLoading, isEnabled, baseMode]);
}
//@ chunk-e2r2f340.js:3730-3841 placement
function emptyDiffState(loading) {
  return {
    stats: null,
    files: [],
    hunks: new Map(),
    loading,
    source: {
      kind: "working-tree",
    },
    baseMode: "auto",
  };
}
//@ chunk-e2r2f340.js:4330-5570 placement
/**
 * 远程会话通过控制通道取工作区 diff，不可用时给出提示文案。
 */
function useRemoteWorkspaceDiff(loading) {
  let [state, setState] = useState(() => ({
    data: emptyDiffState(loading),
    notice: null,
  }));
  useEffect(() => {
    if (!loading) return;
    let remoteCaps = getRemoteCaps();
    if (!remoteCaps || !hasRemoteCap("controlChannel")) {
      logFeatureSad("remote_workspace_diff_fetch", "no_channel");
      setState({
        data: emptyDiffState(false),
        notice:
          "Workspace changes aren't available over this connection \u2014 showing per-turn changes only",
      });
      return;
    }
    let isCancelled = false;
    remoteCaps
      .sendControlRequest({
        subtype: "get_workspace_diff",
      })
      .then((response) => {
        if (isCancelled) return;
        logFeatureOk("remote_workspace_diff_fetch");
        setState({
          data: response.diff ? useDiffData(response.diff) : emptyDiffState(false),
          notice: null,
        });
      })
      .catch((error) => {
        if (isCancelled) return;
        let message = errorMessage(error);
        let failureKind = message.includes("Unsupported control request subtype")
          ? "unsupported_subtype"
          : classifyControlRequestError(error);
        if (failureKind === "unsupported_subtype") logFeatureSad("remote_workspace_diff_fetch", failureKind);
        else logFeatureBad("remote_workspace_diff_fetch", failureKind);
        setState({
          data: emptyDiffState(false),
          notice:
            failureKind === "unsupported_subtype"
              ? "The remote workspace is running an older Claude Code version that cannot report workspace changes \u2014 showing per-turn changes only"
              : error instanceof ControlRequestTimeoutError
                ? "Timed out fetching workspace changes \u2014 showing per-turn changes only"
                : failureKind === "disconnected" || failureKind === "not_connected"
                  ? "Lost the connection to the cloud session \u2014 showing per-turn changes only"
                  : failureKind === "not_delivered"
                    ? "Couldn't reach the cloud session \u2014 showing per-turn changes only"
                    : `Couldn't fetch workspace changes: ${message}`,
        });
      });
    return () => {
      isCancelled = true;
    };
  }, [loading]);
  return state;
}
//@ chunk-e2r2f340.js:5570-5642 placement
function useWorkspaceDiff(isRemote) {
  let data = useLocalWorkspaceDiff(0, !isRemote);
  let remoteWorkspaceDiff = useRemoteWorkspaceDiff(isRemote);
  return isRemote
    ? remoteWorkspaceDiff
    : {
        data,
        notice: null,
      };
}
//@ chunk-e2r2f340.js:5642-5694 placement
class DiffOpenState {
  lastLoggedSessionId = null;
  autoOpenPending = false;
}
//@ chunk-e2r2f340.js:5694-5813 placement
/**
 * diff 侧栏相关单例。
 */
var diffSidebarStore; // deferred: uses DiffOpenState of its import cycle while loading; runs once the cycle is complete
var loggedSessionState;
var tabCycleState;
deferInit("chunk-e2r2f340.js:5694", () => {
  diffSidebarStore = new HostScoped(() => new DiffOpenState());
  loggedSessionState = new HostScoped(() => ({
    lastLoggedSessionId: null,
  }));
  tabCycleState = new HostScoped(() =>
    identity(
      {
        cycled: false,
      },
      (state) => {
        state.cycled = false;
      },
    ),
  );
});
//@ chunk-e2r2f340.js:5813-6010 placement
/**
 * 导出值：DIFF_UNAVAILABLE_TEXT（diff 面板不可用的提示）。
 */
var DIFF_NOT_GIT_MESSAGE =
  "The diff panel shows git changes \u2014 the current directory isn\u2019t in a git repository";
var DIFF_UNAVAILABLE_TEXT =
  "The diff panel isn\u2019t available right now \u2014 run /diff again to see your changes";
//@ chunk-e2r2f340.js:6010-6055 placement
function markDiffAutoOpenPending(session) {
  diffSidebarStore.of(session).autoOpenPending = true;
}
//@ chunk-e2r2f340.js:6055-6137 placement
function takeDiffAutoOpenPending(host) {
  let sidebarState = diffSidebarStore.of(host);
  let autoOpenPending = sidebarState.autoOpenPending;
  sidebarState.autoOpenPending = false;
  return autoOpenPending;
}
//@ chunk-e2r2f340.js:6137-6180 placement
function clearAutoOpenPending(host) {
  diffSidebarStore.of(host).autoOpenPending = false;
}
//@ chunk-e2r2f340.js:6180-6208 placement
/**
 * 函数 isDiffPanelAvailable（diff 面板是否可用）。
 */
function isDiffPanelAvailable() {
  return isDiffCwdInRepoCached();
}
//@ chunk-e2r2f340.js:6208-6331 placement
function shouldShowDiffSidebar({ enabled, fullscreen, columns, isThinClient, isMainFocused, hasGitRepo }) {
  return (
    enabled &&
    fullscreen &&
    !isThinClient &&
    isMainFocused &&
    columns >= DIFF_SIDEBAR_MIN_COLUMNS &&
    hasGitRepo
  );
}
//@ chunk-e2r2f340.js:6331-6427 placement
function isDiffSidebarPreferred(columns) {
  let diffSidebarOpen = getGlobalConfig().diffSidebarOpen;
  if (diffSidebarOpen === false) return false;
  return (
    columns >= (diffSidebarOpen === true ? DIFF_SIDEBAR_MIN_COLUMNS : DIFF_SIDEBAR_OPEN_COLUMNS) &&
    isDiffPanelAvailable()
  );
}
//@ chunk-e2r2f340.js:6427-6693 placement
function toggleReplTab(host, setAppState, currentTab, storageV5) {
  let nextTab = currentTab === "diff" ? "convo" : "diff";
  clearAutoOpenPending(host);
  setAppState((prev) =>
    prev.replTab === nextTab && prev.panelFileView === null
      ? prev
      : {
          ...prev,
          replTab: nextTab,
          panelFileView: null,
        },
  );
  let isDiff = nextTab === "diff";
  if (getGlobalConfig().diffSidebarOpen !== isDiff)
    saveGlobalConfig(
      (config) => ({
        ...config,
        diffSidebarOpen: isDiff,
      }),
      storageV5,
    );
  logFeatureOk("repl_tab_switch", {
    tab: fromEnum(nextTab),
  });
  return nextTab;
}
//@ chunk-e2r2f340.js:6693-6784 placement
async function openDiffSurface(host, getReplTab, setAppState, refreshKey, storageV5) {
  await prefetchWorkspaceDiff(host, getDiffBaseMode(), refreshKey);
  if (getReplTab() === "diff") return;
  toggleReplTab(host, setAppState, "convo", storageV5);
}
//@ chunk-e2r2f340.js:6784-6842 placement
/**
 * 导出值：同一声明里的多个绑定：DIFF_SHOWN_TEXT（"Diff panel shown"）；DIFF_HIDDEN_TEXT（"Diff panel hidden"）；DIFF_RETRY_MS（2000：diff 重试间隔）。
 */
var DIFF_SHOWN_TEXT = "Diff panel shown";
var DIFF_HIDDEN_TEXT = "Diff panel hidden";
var DIFF_RETRY_MS = 2000;
//@ chunk-e2r2f340.js:6842-6949 placement
function diffToggleResultText(result) {
  switch (result.status) {
    case "shown":
      return DIFF_SHOWN_TEXT;
    case "hidden":
      return DIFF_HIDDEN_TEXT;
    case "refused":
      return result.text;
  }
}
//@ chunk-e2r2f340.js:6949-7405 placement
/**
 * /diff：在 REPL 的 diff 标签与对话标签间切换，不可用时返回原因。
 */
function toggleDiffPanel({ host, getReplTab, setAppState, columns, trackSequence, storageV5 }) {
  if (getReplTab() === "diff") {
    toggleReplTab(host, setAppState, "diff", storageV5);
    return {
      status: "hidden",
    };
  }
  if (!isDiffPanelEnabled())
    return {
      status: "refused",
      reason: "unavailable",
      text: DIFF_UNAVAILABLE_TEXT,
    };
  if (!isDiffPanelAvailable())
    return {
      status: "refused",
      reason: "no-git",
      text: DIFF_NOT_GIT_MESSAGE,
    };
  if (columns < DIFF_SIDEBAR_MIN_COLUMNS)
    return {
      status: "refused",
      reason: "too-narrow",
      text: `Resize your terminal to at least ${DIFF_SIDEBAR_MIN_COLUMNS} columns to show the diff panel`,
    };
  return {
    status: "shown",
    settled: openDiffSurface(host, getReplTab, setAppState, trackSequence, storageV5).catch(logError),
  };
}
//@ chunk-e2r2f340.js:7405-7524 placement
function switchToConversationTab(host, setAppState) {
  clearAutoOpenPending(host);
  setAppState((prev) =>
    prev.replTab === "convo" && prev.panelFileView === null
      ? prev
      : {
          ...prev,
          replTab: "convo",
          panelFileView: null,
        },
  );
}
//@ chunk-e2r2f340.js:7524-7659 placement
function closeDiffSidebar(host, setAppState, storageV5) {
  switchToConversationTab(host, setAppState);
  if (getGlobalConfig().diffSidebarOpen !== false)
    saveGlobalConfig(
      (config) => ({
        ...config,
        diffSidebarOpen: false,
      }),
      storageV5,
    );
  logFeatureOk("repl_tab_switch", {
    tab: fromEnum("convo"),
  });
}
//@ chunk-e2r2f340.js:7659-7700 placement
var DIFF_SCOPES = ["session", "uncommitted", "branch"];
//@ chunk-e2r2f340.js:7700-7797 placement
function getDiffBaseMode() {
  let diffSidebarBaseMode = getCurrentProjectConfig().diffSidebarBaseMode;
  return diffSidebarBaseMode === "uncommitted" || diffSidebarBaseMode === "branch"
    ? diffSidebarBaseMode
    : "session";
}
//@ chunk-e2r2f340.js:7797-7977 placement
function cycleDiffBaseMode(baseMode, storageV5) {
  let nextMode = DIFF_SCOPES[(DIFF_SCOPES.indexOf(baseMode) + 1) % DIFF_SCOPES.length] ?? "session";
  saveCurrentProjectConfig(
    (config) =>
      config.diffSidebarBaseMode === nextMode
        ? config
        : {
            ...config,
            diffSidebarBaseMode: nextMode,
          },
    storageV5,
  );
  logFeatureOk("repl_diff_base_switch", {
    mode: fromEnum(nextMode),
  });
  return nextMode;
}
//@ chunk-e2r2f340.js:7977-8011 placement
/**
 * 函数 filePathToUrl（路径转 file 链接）。
 */
function filePathToUrl(filePath) {
  return hasControlChars(projectRelativePath(filePath));
}
//@ chunk-e2r2f340.js:8011-8268 placement
function projectRelativePath(filePath) {
  let path = getProjectRoot();
  let isWindows = getPlatform() === "windows";
  let separator = isWindows ? win32.sep : sep;
  let normalize = (path) => (isWindows ? path.replaceAll("/", separator).toLowerCase() : path);
  let normalizedFile = normalize(filePath);
  let normalizedRoot = normalize(path);
  if (normalizedFile.length !== filePath.length || normalizedRoot.length !== path.length) return filePath;
  if (normalizedFile === normalizedRoot) return "";
  let rootPrefix = normalizedRoot.endsWith(separator) ? normalizedRoot : normalizedRoot + separator;
  return normalizedFile.startsWith(rootPrefix) ? filePath.slice(rootPrefix.length) : filePath;
}
//@ chunk-e2r2f340.js:8268-8272 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e2r2f340.js:8268", () => {
  init_react_production();
});
//@ chunk-e2r2f340.js:8394-8491 placement
function isAbsoluteForPlatform(filePath) {
  if (getPlatform() === "windows") return win32.isAbsolute(filePath) && win32.parse(filePath).root.length > 1;
  return isAbsolute(filePath);
}
//@ chunk-e2r2f340.js:8491-8508 placement
/**
 * 导出值：diffDialogSlot（diff 对话框槽）。
 */
var diffDialogSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e2r2f340.js:8491", () => {
  diffDialogSlot = createContext(null);
});
//@ chunk-czq1j3j2.js:1864662-1864666 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1864662", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1869925-1869966 placement
function selectPanelFileViewLogDiff(appState) {
  return appState.panelFileView;
}
//@ chunk-czq1j3j2.js:1869966-1870140 placement
function closePanelFileView(appState) {
  let panelFileView = appState.panelFileView;
  if (panelFileView === null) {
    return appState;
  }
  if (panelFileView.returnTo === "closed") {
    return {
      ...appState,
      panelFileView: null,
      replTab: "convo",
    };
  }
  return {
    ...appState,
    panelFileView: null,
  };
}
//@ chunk-czq1j3j2.js:1870140-1870189 placement
function selectToolPermissionCtxLogDiff(appState) {
  return appState.toolPermissionContext;
}
//@ chunk-czq1j3j2.js:1870189-1870213 placement
function logDiffAlwaysFalse() {
  return false;
}
//@ chunk-czq1j3j2.js:1870213-1870432 placement
/**
 * 记录 REPL 差异面板显示事件（自动或手动打开、终端宽度档），每个会话只记一次。
 */
function logDiffPanelShown(host, session, columns) {
  if (isDiffPanelEnabled()) {
    let store = diffSidebarStore.of(host);
    let trigger = takeDiffAutoOpenPending(host) ? "auto_open" : "manual";
    if (session === store.lastLoggedSessionId) return;
    store.lastLoggedSessionId = session;
    logEvent("tengu_repl_diff_panel_shown", {
      trigger: fromEnum(trigger),
      terminal_width_bucket: fromEnum(getTerminalWidthBucket(columns)),
    });
  }
}
//@ chunk-czq1j3j2.js:1870432-1870548 placement
function getTerminalWidthBucket(columns) {
  if (columns < DIFF_SIDEBAR_MIN_COLUMNS) return "under_110";
  if (columns < DIFF_SIDEBAR_OPEN_COLUMNS) return "110_to_143";
  if (columns < 200) return "144_to_199";
  return "200_plus";
}
export {
  tabCycleState,
  switchToConversationTab,
  DIFF_UNAVAILABLE_TEXT,
  isDiffSidebarPreferred,
  prefetchWorkspaceDiff,
  getDiffBaseMode,
  markDiffAutoOpenPending,
  DIFF_MIN_REFRESH_MS,
  toggleDiffPanel,
  logDiffPanelShown,
  useLocalWorkspaceDiff,
  cycleDiffBaseMode,
  closeDiffSidebar,
  isDiffPanelAvailable,
  useDiffSidebarState,
  shouldShowDiffSidebar,
  diffDialogSlot,
  loggedSessionState,
  DIFF_RETRY_MS,
  diffToggleResultText,
  DIFF_DEBOUNCE_MS,
  isAbsoluteForPlatform,
  filePathToUrl,
  useWorkspaceDiff,
};
