/**
 * hooks/useWorkspaceDiff.ts
 *
 * 2.1.316 新增：工作区 diff 侧栏：本地/远程 diff 读取、基准切换与 /diff 切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qwh6zcf0.js (37)
 * attribution: placement 37
 */
import { win32, win32 as win32_2, sep, sep as sep_2, isAbsolute, isAbsolute as isAbsolute_2 } from "path";
import { j, y, P, Se, R, Q, qt } from "../../vendor/react/cjs/react.production.js";
import { OVe } from "../utils/task/framework.js";
import { isDiffPaneAvailable } from "../plugins/bundled/diffPane/index.js";
import { qd } from "./useSettings.js";
import { useAppState } from "../state/AppState.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { subscribe_2 } from "../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { fetchGitDiff, fetchGitDiff_2, diffBaseRef, isDiffCwdInRepoCached } from "../utils/gitDiff.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { _T, $L } from "../ink/components/ClockContext.js";
import { useHost } from "../context/session.js";
import { onWatchedGitStateChange } from "../utils/git/gitFilesystem.js";
import { Jn, _C } from "../remote/remoteMode.js";
import { useDiffData } from "./useDiffData.js";
import { errorMessage } from "../utils/errors.js";
import { classifyControlRequestError, ControlRequestTimeoutError } from "../remote/controlRequestErrors.js";
import { ge } from "../utils/identity.js";
import { DIFF_SIDEBAR_MIN_COLUMNS, okt } from "../plugins/bundled/diff/index.js";
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

//@ chunk-qwh6zcf0.js:1247-1251 placement
j();
//@ chunk-qwh6zcf0.js:1251-1305 placement
var q = () => ({ isSidebarOn: OVe(), isOwnedByPlugin: isDiffPaneAvailable() });
//@ chunk-qwh6zcf0.js:1305-1588 placement
function useDiffSidebarState() {
  let [t, r] = y(q),
    o = qd(),
    s = useAppState((i) => i.panelFileView !== null);
  return (
    P(() => {
      let i = () =>
        r((p) => {
          let D = q();
          return p.isSidebarOn === D.isSidebarOn && p.isOwnedByPlugin === D.isOwnedByPlugin ? p : D;
        });
      i();
      let a = onGrowthBookRefresh(i),
        u = subscribe_2(i);
      return () => {
        (a(), u());
      };
    }, [o]),
    t.isSidebarOn && (s || !t.isOwnedByPlugin)
  );
}
//@ chunk-qwh6zcf0.js:1588-1592 placement
j();
//@ chunk-qwh6zcf0.js:1592-1657 placement
var K = 400,
  rCr = 150,
  de = 2000,
  v = { hunks: new Map(), skippedLarge: new Set() };
//@ chunk-qwh6zcf0.js:1657-2064 placement
async function readWorkspaceDiff(t, r, o) {
  try {
    let s = await fetchGitDiff(t, o, r);
    if (o?.aborted) return null;
    if (s === null) return (logFeatureSad("repl_diff_read", "git_diff_failed"), null);
    let i = s.stats.filesCount === 0 ? v : await fetchGitDiff_2(o, diffBaseRef(s));
    if (o?.aborted) return null;
    if (i === null) logFeatureSad("repl_diff_read", "git_hunks_failed");
    else logFeatureOk("repl_diff_read");
    return { result: s, hunks: i };
  } catch (error) {
    if (o?.aborted) return null;
    return (logError(error), logFeatureSad("repl_diff_read", "git_diff_threw"), null);
  }
}
//@ chunk-qwh6zcf0.js:2064-2340 placement
class PendingRefresh {
  #e = null;
  set(t, r, o, s) {
    this.#e = { baseMode: t, refreshKey: r, round: o, at: s };
  }
  take(t, r) {
    let o = this.#e;
    if (o === null) return;
    if (r - o.at > de) {
      this.#e = null;
      return;
    }
    if (o.baseMode !== t) return;
    return ((this.#e = null), { round: o.round, refreshKey: o.refreshKey });
  }
  get isPrimed() {
    return this.#e !== null;
  }
}
//@ chunk-qwh6zcf0.js:2340-2363 placement
var Y = new HostScoped(() => new PendingRefresh());
//@ chunk-qwh6zcf0.js:2363-2510 placement
async function prefetchWorkspaceDiff(t, r, o, s) {
  let i = await readWorkspaceDiff(t, r, s);
  if (s?.aborted) return;
  Y.of(t).set(r, o, i && { result: i.result, baseMode: r, hunks: i.hunks ?? v }, Date.now());
}
/**
 * 定时读取本地 git diff（会话/未提交/分支三种基准），带缓存与大文件跳过。
 */
//@ chunk-qwh6zcf0.js:2510-3730 placement
function useLocalWorkspaceDiff(t = 0, r = !0, o = "auto") {
  let i = Se(_T)?.setTimeout ?? $L,
    a = useHost(),
    [u] = y(() => (r ? Y.of(a).take(o, Date.now()) : void 0)),
    [p, D] = y(u?.round ?? null),
    [k, M] = y(u === void 0),
    U = R(u !== void 0),
    N = R(u !== void 0 && u.refreshKey === t),
    [se, ae] = y(0);
  return (
    P(() => onWatchedGitStateChange(() => ae((_) => _ + 1)), []),
    P(() => {
      if (!r) return;
      if (N.current) {
        N.current = !1;
        return;
      }
      let _ = !1,
        abortController = new AbortController();
      async function O() {
        let b = await readWorkspaceDiff(a, o, abortController.signal);
        if (_) return;
        if (b !== null) {
          let h = diffBaseRef(b.result);
          D((A) => ({
            result: b.result,
            baseMode: o,
            hunks: b.hunks ?? (A !== null && diffBaseRef(A.result) === h ? A.hunks : v),
          }));
        }
        ((U.current = !0), M(!1));
      }
      let x = i(O, U.current || t !== 0 ? rCr : 0);
      return () => {
        ((_ = !0), x(), abortController.abort());
      };
    }, [t, r, se, o, a]),
    Q(() => {
      if (!p)
        return {
          stats: null,
          files: [],
          hunks: new Map(),
          loading: r && k,
          source: { kind: "working-tree" },
          baseMode: o,
        };
      let { stats: stats, perFileStats: perFileStats, source: source } = p.result,
        x = [];
      for (let [b, h] of perFileStats) {
        let isUntracked = h.isUntracked,
          V = p.hunks.skippedLarge.has(b),
          fe = h.added + h.removed,
          le = !V && !h.isBinary && fe > K;
        x.push({
          path: b,
          linesAdded: h.added,
          linesRemoved: h.removed,
          isBinary: h.isBinary,
          isLargeFile: V,
          isTruncated: le,
          isUntracked: isUntracked,
          preSession: h.preSession,
        });
      }
      return (
        x.sort((b, h) => b.path.localeCompare(h.path)),
        {
          stats: stats,
          files: x,
          hunks: p.hunks.hunks,
          loading: !1,
          source: source,
          baseMode: p.baseMode,
          noCommits: p.result.noCommits,
        }
      );
    }, [p, k, r, o])
  );
}
//@ chunk-qwh6zcf0.js:3730-3841 placement
function emptyDiffState(t) {
  return {
    stats: null,
    files: [],
    hunks: new Map(),
    loading: t,
    source: { kind: "working-tree" },
    baseMode: "auto",
  };
}
/**
 * 远程会话通过控制通道取工作区 diff，不可用时给出提示文案。
 */
//@ chunk-qwh6zcf0.js:4330-5570 placement
function useRemoteWorkspaceDiff(t) {
  let [r, o] = y(() => ({ data: emptyDiffState(t), notice: null }));
  return (
    P(() => {
      if (!t) return;
      let s = Jn();
      if (!s || !_C("controlChannel")) {
        (logFeatureSad("remote_workspace_diff_fetch", "no_channel"),
          o({
            data: emptyDiffState(!1),
            notice:
              "Workspace changes aren't available over this connection \u2014 showing per-turn changes only",
          }));
        return;
      }
      let i = !1;
      return (
        s
          .sendControlRequest({ subtype: "get_workspace_diff" })
          .then((a) => {
            if (i) return;
            (logFeatureOk("remote_workspace_diff_fetch"),
              o({ data: a.diff ? useDiffData(a.diff) : emptyDiffState(!1), notice: null }));
          })
          .catch((a) => {
            if (i) return;
            let u = errorMessage(a),
              p = u.includes("Unsupported control request subtype")
                ? "unsupported_subtype"
                : classifyControlRequestError(a);
            if (p === "unsupported_subtype") logFeatureSad("remote_workspace_diff_fetch", p);
            else logFeatureBad("remote_workspace_diff_fetch", p);
            o({
              data: emptyDiffState(!1),
              notice:
                p === "unsupported_subtype"
                  ? "The remote workspace is running an older Claude Code version that cannot report workspace changes \u2014 showing per-turn changes only"
                  : a instanceof ControlRequestTimeoutError
                    ? "Timed out fetching workspace changes \u2014 showing per-turn changes only"
                    : p === "disconnected" || p === "not_connected"
                      ? "Lost the connection to the cloud session \u2014 showing per-turn changes only"
                      : p === "not_delivered"
                        ? "Couldn't reach the cloud session \u2014 showing per-turn changes only"
                        : `Couldn't fetch workspace changes: ${u}`,
            });
          }),
        () => {
          i = !0;
        }
      );
    }, [t]),
    r
  );
}
//@ chunk-qwh6zcf0.js:5570-5642 placement
function useWorkspaceDiff(t) {
  let r = useLocalWorkspaceDiff(0, !t),
    o = useRemoteWorkspaceDiff(t);
  return t ? o : { data: r, notice: null };
}
//@ chunk-qwh6zcf0.js:5642-5694 placement
class J {
  lastLoggedSessionId = null;
  autoOpenPending = !1;
}
/**
 * diff 侧栏相关单例。
 */
//@ chunk-qwh6zcf0.js:5694-5813 placement
var diffSidebarStore = new HostScoped(() => new J()),
  loggedSessionState = new HostScoped(() => ({ lastLoggedSessionId: null })),
  tabCycleState = new HostScoped(() =>
    ge({ cycled: !1 }, (t) => {
      t.cycled = !1;
    }),
  );
//@ chunk-qwh6zcf0.js:5813-6010 placement
var DIFF_NOT_GIT_MESSAGE =
    "The diff panel shows git changes \u2014 the current directory isn\u2019t in a git repository",
  fyo = "The diff panel isn\u2019t available right now \u2014 run /diff again to see your changes";
//@ chunk-qwh6zcf0.js:6010-6055 placement
function markDiffAutoOpenPending(t) {
  diffSidebarStore.of(t).autoOpenPending = !0;
}
//@ chunk-qwh6zcf0.js:6055-6137 placement
function takeDiffAutoOpenPending(t) {
  let of = diffSidebarStore.of(t),
    autoOpenPending = of.autoOpenPending;
  return ((of.autoOpenPending = !1), autoOpenPending);
}
//@ chunk-qwh6zcf0.js:6137-6180 placement
function Z(t) {
  diffSidebarStore.of(t).autoOpenPending = !1;
}
//@ chunk-qwh6zcf0.js:6180-6208 placement
function wFn() {
  return isDiffCwdInRepoCached();
}
//@ chunk-qwh6zcf0.js:6208-6331 placement
function shouldShowDiffSidebar({
  enabled: enabled,
  fullscreen: fullscreen,
  columns: columns,
  isThinClient: isThinClient,
  isMainFocused: isMainFocused,
  hasGitRepo: hasGitRepo,
}) {
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
function isDiffSidebarPreferred(t) {
  let diffSidebarOpen = getGlobalConfig().diffSidebarOpen;
  if (diffSidebarOpen === !1) return !1;
  return t >= (diffSidebarOpen === !0 ? DIFF_SIDEBAR_MIN_COLUMNS : okt) && wFn();
}
//@ chunk-qwh6zcf0.js:6427-6693 placement
function toggleReplTab(t, r, o, s) {
  let i = o === "diff" ? "convo" : "diff";
  (Z(t),
    r((u) => (u.replTab === i && u.panelFileView === null ? u : { ...u, replTab: i, panelFileView: null })));
  let a = i === "diff";
  if (getGlobalConfig().diffSidebarOpen !== a) saveGlobalConfig((u) => ({ ...u, diffSidebarOpen: a }), s);
  return (logFeatureOk("repl_tab_switch", { tab: fromEnum(i) }), i);
}
//@ chunk-qwh6zcf0.js:6693-6784 placement
async function he(t, r, o, s, i) {
  if ((await prefetchWorkspaceDiff(t, getDiffBaseMode(), s), r() === "diff")) return;
  toggleReplTab(t, o, "convo", i);
}
//@ chunk-qwh6zcf0.js:6784-6842 placement
var De = "Diff panel shown",
  be = "Diff panel hidden",
  cPs = 2000;
//@ chunk-qwh6zcf0.js:6842-6949 placement
function diffToggleResultText(t) {
  switch (t.status) {
    case "shown":
      return De;
    case "hidden":
      return be;
    case "refused":
      return t.text;
  }
}
/**
 * /diff：在 REPL 的 diff 标签与对话标签间切换，不可用时返回原因。
 */
//@ chunk-qwh6zcf0.js:6949-7405 placement
function toggleDiffPanel({
  host: host,
  getReplTab: getReplTab,
  setAppState: setAppState,
  columns: columns,
  trackSequence: trackSequence,
  storageV5: storageV5,
}) {
  if (getReplTab() === "diff")
    return (toggleReplTab(host, setAppState, "diff", storageV5), { status: "hidden" });
  if (!OVe()) return { status: "refused", reason: "unavailable", text: fyo };
  if (!wFn()) return { status: "refused", reason: "no-git", text: DIFF_NOT_GIT_MESSAGE };
  if (columns < DIFF_SIDEBAR_MIN_COLUMNS)
    return {
      status: "refused",
      reason: "too-narrow",
      text: `Resize your terminal to at least ${DIFF_SIDEBAR_MIN_COLUMNS} columns to show the diff panel`,
    };
  return {
    status: "shown",
    settled: he(host, getReplTab, setAppState, trackSequence, storageV5).catch(logError),
  };
}
//@ chunk-qwh6zcf0.js:7405-7524 placement
function switchToConversationTab(t, r) {
  (Z(t),
    r((o) =>
      o.replTab === "convo" && o.panelFileView === null ? o : { ...o, replTab: "convo", panelFileView: null },
    ));
}
//@ chunk-qwh6zcf0.js:7524-7659 placement
function closeDiffSidebar(t, r, o) {
  if ((switchToConversationTab(t, r), getGlobalConfig().diffSidebarOpen !== !1))
    saveGlobalConfig((s) => ({ ...s, diffSidebarOpen: !1 }), o);
  logFeatureOk("repl_tab_switch", { tab: fromEnum("convo") });
}
//@ chunk-qwh6zcf0.js:7659-7700 placement
var H = ["session", "uncommitted", "branch"];
//@ chunk-qwh6zcf0.js:7700-7797 placement
function getDiffBaseMode() {
  let diffSidebarBaseMode = getCurrentProjectConfig().diffSidebarBaseMode;
  return diffSidebarBaseMode === "uncommitted" || diffSidebarBaseMode === "branch"
    ? diffSidebarBaseMode
    : "session";
}
//@ chunk-qwh6zcf0.js:7797-7977 placement
function cycleDiffBaseMode(t, r) {
  let o = H[(H.indexOf(t) + 1) % H.length] ?? "session";
  return (
    saveCurrentProjectConfig((s) => (s.diffSidebarBaseMode === o ? s : { ...s, diffSidebarBaseMode: o }), r),
    logFeatureOk("repl_diff_base_switch", { mode: fromEnum(o) }),
    o
  );
}
//@ chunk-qwh6zcf0.js:7977-8011 placement
function ztn(t) {
  return hasControlChars(projectRelativePath(t));
}
//@ chunk-qwh6zcf0.js:8011-8268 placement
function projectRelativePath(t) {
  let r = getProjectRoot(),
    o = getPlatform() === "windows",
    s = o ? win32.sep : sep,
    i = (D) => (o ? D.replaceAll("/", s).toLowerCase() : D),
    a = i(t),
    u = i(r);
  if (a.length !== t.length || u.length !== r.length) return t;
  if (a === u) return "";
  let p = u.endsWith(s) ? u : u + s;
  return a.startsWith(p) ? t.slice(p.length) : t;
}
//@ chunk-qwh6zcf0.js:8268-8272 placement
j();
//@ chunk-qwh6zcf0.js:8394-8491 placement
function L(t) {
  if (getPlatform() === "windows") return win32_2.isAbsolute(t) && win32_2.parse(t).root.length > 1;
  return isAbsolute_2(t);
}
//@ chunk-qwh6zcf0.js:8491-8508 placement
var vFn = qt(null);

export {
  switchToConversationTab,
  isDiffSidebarPreferred,
  prefetchWorkspaceDiff,
  getDiffBaseMode,
  markDiffAutoOpenPending,
  rCr,
  toggleDiffPanel,
  useLocalWorkspaceDiff,
  cycleDiffBaseMode,
  closeDiffSidebar,
  wFn,
  useDiffSidebarState,
  shouldShowDiffSidebar,
  vFn,
  loggedSessionState,
  tabCycleState,
  cPs,
  diffToggleResultText,
  diffSidebarStore,
  takeDiffAutoOpenPending,
  fyo,
  ztn,
  useWorkspaceDiff,
  K,
  L,
};
