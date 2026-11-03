/**
 * hooks/useWorkspaceDiff.ts
 *
 * 2.1.316 新增：工作区 diff 侧栏：本地/远程 diff 读取、基准切换与 /diff 切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7), chunk-qwh6zcf0.js (37)
 * attribution: placement 44
 */
import { win32, sep, isAbsolute } from "path";
import { init_react_production, y, P, Se, R, Q, qt } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-qwh6zcf0.js:1247-1251 placement
init_react_production();
//@ chunk-qwh6zcf0.js:1251-1305 placement
var diffPanelState = () => ({
  isSidebarOn: isDiffPanelEnabled(),
  isOwnedByPlugin: isDiffPaneAvailable(),
});
//@ chunk-qwh6zcf0.js:1305-1588 placement
function useDiffSidebarState() {
  let [t, r] = y(diffPanelState);
  let settingsState = useSettingsState();
  let s = useAppState((i) => i.panelFileView !== null);
  P(() => {
    let i = () =>
      r((p) => {
        let D = diffPanelState();
        return p.isSidebarOn === D.isSidebarOn && p.isOwnedByPlugin === D.isOwnedByPlugin ? p : D;
      });
    i();
    let a = onGrowthBookRefresh(i);
    let u = subscribe_2(i);
    return () => {
      a();
      u();
    };
  }, [settingsState]);
  return t.isSidebarOn && (s || !t.isOwnedByPlugin);
}
//@ chunk-qwh6zcf0.js:1588-1592 placement
init_react_production();
//@ chunk-qwh6zcf0.js:1592-1657 placement
/**
 * 导出值：同一声明里的多个绑定：DIFF_DEBOUNCE_MS（400：diff 刷新防抖）；DIFF_MIN_REFRESH_MS（150：diff 最小刷新间隔）；DIFF_STALE_MS（2000：diff 过期时间）；EMPTY_DIFF_RESULT（空 hunks 结果）。
 */
var DIFF_DEBOUNCE_MS = 400;
var DIFF_MIN_REFRESH_MS = 150;
var DIFF_STALE_MS = 2000;
var EMPTY_DIFF_RESULT = {
  hunks: new Map(),
  skippedLarge: new Set(),
};
//@ chunk-qwh6zcf0.js:1657-2064 placement
async function readWorkspaceDiff(t, r, o) {
  try {
    let gitDiff = await fetchGitDiff(t, o, r);
    if (o?.aborted) return null;
    if (gitDiff === null) {
      logFeatureSad("repl_diff_read", "git_diff_failed");
      return null;
    }
    let i =
      gitDiff.stats.filesCount === 0 ? EMPTY_DIFF_RESULT : await fetchGitDiff_2(o, diffBaseRef(gitDiff));
    if (o?.aborted) return null;
    if (i === null) logFeatureSad("repl_diff_read", "git_hunks_failed");
    else logFeatureOk("repl_diff_read");
    return {
      result: gitDiff,
      hunks: i,
    };
  } catch (error) {
    if (o?.aborted) return null;
    logError(error);
    logFeatureSad("repl_diff_read", "git_diff_threw");
    return null;
  }
}
//@ chunk-qwh6zcf0.js:2064-2340 placement
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
  take(t, r) {
    let o = this.#e;
    if (o === null) return;
    if (r - o.at > DIFF_STALE_MS) {
      this.#e = null;
      return;
    }
    if (o.baseMode !== t) return;
    this.#e = null;
    return {
      round: o.round,
      refreshKey: o.refreshKey,
    };
  }
  get isPrimed() {
    return this.#e !== null;
  }
}
//@ chunk-qwh6zcf0.js:2340-2363 placement
var diffServiceSlot = new HostScoped(() => new PendingRefresh());
//@ chunk-qwh6zcf0.js:2363-2510 placement
async function prefetchWorkspaceDiff(t, diffBaseMode, o, signal) {
  let workspaceDiff = await readWorkspaceDiff(t, diffBaseMode, signal);
  if (signal?.aborted) return;
  diffServiceSlot.of(t).set(
    diffBaseMode,
    o,
    workspaceDiff && {
      result: workspaceDiff.result,
      baseMode: diffBaseMode,
      hunks: workspaceDiff.hunks ?? EMPTY_DIFF_RESULT,
    },
    Date.now(),
  );
}
//@ chunk-qwh6zcf0.js:2510-3730 placement
/**
 * 定时读取本地 git diff（会话/未提交/分支三种基准），带缓存与大文件跳过。
 */
function useLocalWorkspaceDiff(appState = 0, r = true, o = "auto") {
  let i = Se(clockContext)?.setTimeout ?? defaultSetTimeout;
  let host = useHost();
  let [u] = y(() => (r ? diffServiceSlot.of(host).take(o, Date.now()) : undefined));
  let [round, setRound] = y(u?.round ?? null);
  let [k, M] = y(u === undefined);
  let U = R(u !== undefined);
  let N = R(u !== undefined && u.refreshKey === appState);
  let [se, ae] = y(0);
  P(() => onWatchedGitStateChange(() => ae((_) => _ + 1)), []);
  P(() => {
    if (!r) return;
    if (N.current) {
      N.current = false;
      return;
    }
    let _ = false;
    let abortController = new AbortController();
    async function O() {
      let workspaceDiff = await readWorkspaceDiff(host, o, abortController.signal);
      if (_) return;
      if (workspaceDiff !== null) {
        let h = diffBaseRef(workspaceDiff.result);
        setRound((A) => ({
          result: workspaceDiff.result,
          baseMode: o,
          hunks:
            workspaceDiff.hunks ?? (A !== null && diffBaseRef(A.result) === h ? A.hunks : EMPTY_DIFF_RESULT),
        }));
      }
      U.current = true;
      M(false);
    }
    let x = i(O, U.current || appState !== 0 ? DIFF_MIN_REFRESH_MS : 0);
    return () => {
      _ = true;
      x();
      abortController.abort();
    };
  }, [appState, r, se, o, host]);
  return Q(() => {
    if (!round)
      return {
        stats: null,
        files: [],
        hunks: new Map(),
        loading: r && k,
        source: {
          kind: "working-tree",
        },
        baseMode: o,
      };
    let { stats, perFileStats, source } = round.result;
    let x = [];
    for (let [b, h] of perFileStats) {
      let isUntracked = h.isUntracked;
      let V = round.hunks.skippedLarge.has(b);
      let fe = h.added + h.removed;
      let isTruncated = !V && !h.isBinary && fe > DIFF_DEBOUNCE_MS;
      x.push({
        path: b,
        linesAdded: h.added,
        linesRemoved: h.removed,
        isBinary: h.isBinary,
        isLargeFile: V,
        isTruncated,
        isUntracked,
        preSession: h.preSession,
      });
    }
    x.sort((b, h) => b.path.localeCompare(h.path));
    return {
      stats,
      files: x,
      hunks: round.hunks.hunks,
      loading: false,
      source,
      baseMode: round.baseMode,
      noCommits: round.result.noCommits,
    };
  }, [round, k, r, o]);
}
//@ chunk-qwh6zcf0.js:3730-3841 placement
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
//@ chunk-qwh6zcf0.js:4330-5570 placement
/**
 * 远程会话通过控制通道取工作区 diff，不可用时给出提示文案。
 */
function useRemoteWorkspaceDiff(loading) {
  let [r, o] = y(() => ({
    data: emptyDiffState(loading),
    notice: null,
  }));
  P(() => {
    if (!loading) return;
    let remoteCaps = getRemoteCaps();
    if (!remoteCaps || !hasRemoteCap("controlChannel")) {
      logFeatureSad("remote_workspace_diff_fetch", "no_channel");
      o({
        data: emptyDiffState(false),
        notice:
          "Workspace changes aren't available over this connection \u2014 showing per-turn changes only",
      });
      return;
    }
    let i = false;
    remoteCaps
      .sendControlRequest({
        subtype: "get_workspace_diff",
      })
      .then((a) => {
        if (i) return;
        logFeatureOk("remote_workspace_diff_fetch");
        o({
          data: a.diff ? useDiffData(a.diff) : emptyDiffState(false),
          notice: null,
        });
      })
      .catch((error) => {
        if (i) return;
        let u = errorMessage(error);
        let p = u.includes("Unsupported control request subtype")
          ? "unsupported_subtype"
          : classifyControlRequestError(error);
        if (p === "unsupported_subtype") logFeatureSad("remote_workspace_diff_fetch", p);
        else logFeatureBad("remote_workspace_diff_fetch", p);
        o({
          data: emptyDiffState(false),
          notice:
            p === "unsupported_subtype"
              ? "The remote workspace is running an older Claude Code version that cannot report workspace changes \u2014 showing per-turn changes only"
              : error instanceof ControlRequestTimeoutError
                ? "Timed out fetching workspace changes \u2014 showing per-turn changes only"
                : p === "disconnected" || p === "not_connected"
                  ? "Lost the connection to the cloud session \u2014 showing per-turn changes only"
                  : p === "not_delivered"
                    ? "Couldn't reach the cloud session \u2014 showing per-turn changes only"
                    : `Couldn't fetch workspace changes: ${u}`,
        });
      });
    return () => {
      i = true;
    };
  }, [loading]);
  return r;
}
//@ chunk-qwh6zcf0.js:5570-5642 placement
function useWorkspaceDiff(t) {
  let data = useLocalWorkspaceDiff(0, !t);
  let remoteWorkspaceDiff = useRemoteWorkspaceDiff(t);
  return t
    ? remoteWorkspaceDiff
    : {
        data,
        notice: null,
      };
}
//@ chunk-qwh6zcf0.js:5642-5694 placement
class DiffOpenState {
  lastLoggedSessionId = null;
  autoOpenPending = false;
}
//@ chunk-qwh6zcf0.js:5694-5813 placement
/**
 * diff 侧栏相关单例。
 */
var diffSidebarStore = new HostScoped(() => new DiffOpenState());
var loggedSessionState = new HostScoped(() => ({
  lastLoggedSessionId: null,
}));
var tabCycleState = new HostScoped(() =>
  identity(
    {
      cycled: false,
    },
    (t) => {
      t.cycled = false;
    },
  ),
);
//@ chunk-qwh6zcf0.js:5813-6010 placement
/**
 * 导出值：DIFF_UNAVAILABLE_TEXT（diff 面板不可用的提示）。
 */
var DIFF_NOT_GIT_MESSAGE =
  "The diff panel shows git changes \u2014 the current directory isn\u2019t in a git repository";
var DIFF_UNAVAILABLE_TEXT =
  "The diff panel isn\u2019t available right now \u2014 run /diff again to see your changes";
//@ chunk-qwh6zcf0.js:6010-6055 placement
function markDiffAutoOpenPending(host) {
  diffSidebarStore.of(host).autoOpenPending = true;
}
//@ chunk-qwh6zcf0.js:6055-6137 placement
function takeDiffAutoOpenPending(t) {
  let r = diffSidebarStore.of(t);
  let autoOpenPending = r.autoOpenPending;
  r.autoOpenPending = false;
  return autoOpenPending;
}
//@ chunk-qwh6zcf0.js:6137-6180 placement
function clearAutoOpenPending(t) {
  diffSidebarStore.of(t).autoOpenPending = false;
}
//@ chunk-qwh6zcf0.js:6180-6208 placement
/**
 * 函数 isDiffPanelAvailable（diff 面板是否可用）。
 */
function isDiffPanelAvailable() {
  return isDiffCwdInRepoCached();
}
//@ chunk-qwh6zcf0.js:6208-6331 placement
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
//@ chunk-qwh6zcf0.js:6331-6427 placement
function isDiffSidebarPreferred(columns) {
  let diffSidebarOpen = getGlobalConfig().diffSidebarOpen;
  if (diffSidebarOpen === false) return false;
  return (
    columns >= (diffSidebarOpen === true ? DIFF_SIDEBAR_MIN_COLUMNS : DIFF_SIDEBAR_OPEN_COLUMNS) &&
    isDiffPanelAvailable()
  );
}
//@ chunk-qwh6zcf0.js:6427-6693 placement
function toggleReplTab(t, r, o, s) {
  let i = o === "diff" ? "convo" : "diff";
  clearAutoOpenPending(t);
  r((u) =>
    u.replTab === i && u.panelFileView === null
      ? u
      : {
          ...u,
          replTab: i,
          panelFileView: null,
        },
  );
  let a = i === "diff";
  if (getGlobalConfig().diffSidebarOpen !== a)
    saveGlobalConfig(
      (u) => ({
        ...u,
        diffSidebarOpen: a,
      }),
      s,
    );
  logFeatureOk("repl_tab_switch", {
    tab: fromEnum(i),
  });
  return i;
}
//@ chunk-qwh6zcf0.js:6693-6784 placement
async function openDiffSurface(host, getReplTab, setAppState, trackSequence, storageV5) {
  await prefetchWorkspaceDiff(host, getDiffBaseMode(), trackSequence);
  if (getReplTab() === "diff") return;
  toggleReplTab(host, setAppState, "convo", storageV5);
}
//@ chunk-qwh6zcf0.js:6784-6842 placement
/**
 * 导出值：同一声明里的多个绑定：DIFF_SHOWN_TEXT（"Diff panel shown"）；DIFF_HIDDEN_TEXT（"Diff panel hidden"）；DIFF_RETRY_MS（2000：diff 重试间隔）。
 */
var DIFF_SHOWN_TEXT = "Diff panel shown";
var DIFF_HIDDEN_TEXT = "Diff panel hidden";
var DIFF_RETRY_MS = 2000;
//@ chunk-qwh6zcf0.js:6842-6949 placement
function diffToggleResultText(t) {
  switch (t.status) {
    case "shown":
      return DIFF_SHOWN_TEXT;
    case "hidden":
      return DIFF_HIDDEN_TEXT;
    case "refused":
      return t.text;
  }
}
//@ chunk-qwh6zcf0.js:6949-7405 placement
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
//@ chunk-qwh6zcf0.js:7405-7524 placement
function switchToConversationTab(host, setAppState) {
  clearAutoOpenPending(host);
  setAppState((o) =>
    o.replTab === "convo" && o.panelFileView === null
      ? o
      : {
          ...o,
          replTab: "convo",
          panelFileView: null,
        },
  );
}
//@ chunk-qwh6zcf0.js:7524-7659 placement
function closeDiffSidebar(host, setAppState, storageV5) {
  switchToConversationTab(host, setAppState);
  if (getGlobalConfig().diffSidebarOpen !== false)
    saveGlobalConfig(
      (s) => ({
        ...s,
        diffSidebarOpen: false,
      }),
      storageV5,
    );
  logFeatureOk("repl_tab_switch", {
    tab: fromEnum("convo"),
  });
}
//@ chunk-qwh6zcf0.js:7659-7700 placement
var DIFF_SCOPES = ["session", "uncommitted", "branch"];
//@ chunk-qwh6zcf0.js:7700-7797 placement
function getDiffBaseMode() {
  let diffSidebarBaseMode = getCurrentProjectConfig().diffSidebarBaseMode;
  return diffSidebarBaseMode === "uncommitted" || diffSidebarBaseMode === "branch"
    ? diffSidebarBaseMode
    : "session";
}
//@ chunk-qwh6zcf0.js:7797-7977 placement
function cycleDiffBaseMode(t, storageV5) {
  let o = DIFF_SCOPES[(DIFF_SCOPES.indexOf(t) + 1) % DIFF_SCOPES.length] ?? "session";
  saveCurrentProjectConfig(
    (s) =>
      s.diffSidebarBaseMode === o
        ? s
        : {
            ...s,
            diffSidebarBaseMode: o,
          },
    storageV5,
  );
  logFeatureOk("repl_diff_base_switch", {
    mode: fromEnum(o),
  });
  return o;
}
//@ chunk-qwh6zcf0.js:7977-8011 placement
/**
 * 函数 filePathToUrl（路径转 file 链接）。
 */
function filePathToUrl(t) {
  return hasControlChars(projectRelativePath(t));
}
//@ chunk-qwh6zcf0.js:8011-8268 placement
function projectRelativePath(t) {
  let projectRoot = getProjectRoot();
  let o = getPlatform() === "windows";
  let s = o ? win32.sep : sep;
  let i = (D) => (o ? D.replaceAll("/", s).toLowerCase() : D);
  let a = i(t);
  let u = i(projectRoot);
  if (a.length !== t.length || u.length !== projectRoot.length) return t;
  if (a === u) return "";
  let p = u.endsWith(s) ? u : u + s;
  return a.startsWith(p) ? t.slice(p.length) : t;
}
//@ chunk-qwh6zcf0.js:8268-8272 placement
init_react_production();
//@ chunk-qwh6zcf0.js:8394-8491 placement
function isAbsoluteForPlatform(filePath) {
  if (getPlatform() === "windows") return win32.isAbsolute(filePath) && win32.parse(filePath).root.length > 1;
  return isAbsolute(filePath);
}
//@ chunk-qwh6zcf0.js:8491-8508 placement
/**
 * 导出值：diffDialogSlot（diff 对话框槽）。
 */
var diffDialogSlot = qt(null);
//@ chunk-18hwfzwa.js:1821939-1821943 placement
init_react_production();
//@ chunk-18hwfzwa.js:1821943-1821984 placement
function selectPanelFileViewLogDiff(It) {
  return It.panelFileView;
}
//@ chunk-18hwfzwa.js:1821984-1822158 placement
function closePanelFileView(Ot) {
  let panelFileView = Ot.panelFileView;
  if (panelFileView === null) {
    return Ot;
  }
  if (panelFileView.returnTo === "closed") {
    return {
      ...Ot,
      panelFileView: null,
      replTab: "convo",
    };
  }
  return {
    ...Ot,
    panelFileView: null,
  };
}
//@ chunk-18hwfzwa.js:1822158-1822207 placement
function selectToolPermissionCtxLogDiff(Ir) {
  return Ir.toolPermissionContext;
}
//@ chunk-18hwfzwa.js:1822207-1822231 placement
function logDiffAlwaysFalse() {
  return false;
}
//@ chunk-18hwfzwa.js:1822231-1822450 placement
/**
 * 记录 REPL 差异面板显示事件（自动或手动打开、终端宽度档），每个会话只记一次。
 */
function logDiffPanelShown(host, session, columns) {
  if (isDiffPanelEnabled()) {
    let L = diffSidebarStore.of(host);
    let ee = takeDiffAutoOpenPending(host) ? "auto_open" : "manual";
    if (session === L.lastLoggedSessionId) return;
    L.lastLoggedSessionId = session;
    logEvent("tengu_repl_diff_panel_shown", {
      trigger: fromEnum(ee),
      terminal_width_bucket: fromEnum(getTerminalWidthBucket(columns)),
    });
  }
}
//@ chunk-18hwfzwa.js:1822450-1822566 placement
function getTerminalWidthBucket(h) {
  if (h < DIFF_SIDEBAR_MIN_COLUMNS) return "under_110";
  if (h < DIFF_SIDEBAR_OPEN_COLUMNS) return "110_to_143";
  if (h < 200) return "144_to_199";
  return "200_plus";
}
export {
  tabCycleState,
  switchToConversationTab,
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
  DIFF_UNAVAILABLE_TEXT,
  filePathToUrl,
  useWorkspaceDiff,
  DIFF_DEBOUNCE_MS,
  isAbsoluteForPlatform,
};
