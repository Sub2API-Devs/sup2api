/**
 * components/diff/DiffDialog.tsx
 *
 * /diff 对话框：当前工作区 diff 与每回合 diff（turn）切换，文件列表与详情两级视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffDialog.tsx
 * pieces: chunk-mtx4csef.js (7)
 * attribution: placement 4, fingerprint 3
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { merged } from "../CustomSelect/select.js";
import { FileItem } from "./DiffFileList.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { HintText } from "../design-system/HintText.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { useWorkspaceDiff } from "../../hooks/useWorkspaceDiff.js";
import { useTurnDiffs } from "../../hooks/useTurnDiffs.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useScrollViewportHandle } from "../ScrollViewportContext.js";
import { jumpBy } from "../ScrollKeybindingHandler.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useRegisterKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { Text, Box } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { DiffStatCounts } from "../PrBadge.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { DiffDetailView } from "./DiffDetailView.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-mtx4csef.js:17021-17036 placement
function noop() {}
//@ chunk-mtx4csef.js:17036-17102 placement
function renderFileItem(U) {
  return jsxProd_default(
    merged.Item,
    {
      children: jsxProd_default(FileItem, {
        file: U,
      }),
    },
    U.path,
  );
}
//@ chunk-mtx4csef.js:17102-17111 placement
var DIFF_LIST_VISIBLE_COUNT = 7;
//@ chunk-mtx4csef.js:17111-17588 placement
/**
 * /diff 对话框的变更文件列表；没有文件时显示 “No changed files”。
 */
function DiffFileList(props) {
  let T = w(9);
  let { files, defaultFocusIndex, resetKey, onFocus, onSelect } = props;
  if (files.length === 0) {
    let m;
    if (T[0] === MEMO_CACHE_SENTINEL) {
      m = jsxProd_default(HintText, {
        children: "No changed files",
      });
      T[0] = m;
    } else m = T[0];
    return m;
  }
  let children;
  if (T[1] !== files) {
    children = files.map(renderFileItem);
    T[1] = files;
    T[2] = children;
  } else children = T[2];
  let d;
  if (
    T[3] !== defaultFocusIndex ||
    T[4] !== onFocus ||
    T[5] !== onSelect ||
    T[6] !== resetKey ||
    T[7] !== children
  ) {
    d = jsxProd_default(merged, {
      visibleCount: DIFF_LIST_VISIBLE_COUNT,
      defaultFocusIndex,
      resetKey,
      onFocus,
      onSelect,
      onUpFromFirstItem: noop,
      children,
    });
    T[3] = defaultFocusIndex;
    T[4] = onFocus;
    T[5] = onSelect;
    T[6] = resetKey;
    T[7] = children;
    T[8] = d;
  } else d = T[8];
  return d;
}
//@ chunk-mtx4csef.js:19087-19131 fingerprint = _temp (1)
function turnDiffEntry(turn) {
  return {
    type: "turn",
    turn,
  };
}
//@ chunk-mtx4csef.js:19131-19619 fingerprint = turnDiffToDiffData (0.851)
function turnDiffToDiffData(turn) {
  let files = Array.from(turn.files.values())
    .map((file) => ({
      path: file.filePath,
      linesAdded: file.linesAdded,
      linesRemoved: file.linesRemoved,
      isBinary: false,
      isLargeFile: false,
      isTruncated: false,
      isNewFile: file.isNewFile,
    }))
    .sort((t, u) => t.path.localeCompare(u.path));
  let hunks = new Map();
  for (let file of turn.files.values()) hunks.set(file.filePath, file.hunks);
  return {
    stats: {
      filesCount: turn.stats.filesChanged,
      linesAdded: turn.stats.linesAdded,
      linesRemoved: turn.stats.linesRemoved,
    },
    files,
    hunks,
    loading: false,
    source: {
      kind: "working-tree",
    },
    baseMode: "auto",
  };
}
//@ chunk-mtx4csef.js:19619-25927 fingerprint = DiffDialog (0.557)
function DiffDialog(props) {
  let $ = w(83);
  let { messages, onDone } = props;
  let u;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    u = isRemoteSessionAvailable();
    $[0] = u;
  } else u = $[0];
  let { data: l, notice } = useWorkspaceDiff(u);
  let turnDiffs = useTurnDiffs(messages);
  let [d, U] = y("list");
  let [g, D] = y(0);
  let L;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    L = {
      source: 0,
      index: 0,
      mount: 0,
    };
    $[1] = L;
  } else L = $[1];
  let [b, J] = y(L);
  let index = b.source === g ? b.index : 0;
  let Ke;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Ke = {
      type: "current",
    };
    $[2] = Ke;
  } else Ke = $[2];
  let _e;
  if ($[3] !== turnDiffs) {
    _e = [Ke, ...turnDiffs.map(turnDiffEntry)];
    $[3] = turnDiffs;
    $[4] = _e;
  } else _e = $[4];
  let p = _e;
  let currentSource = p[g];
  let currentTurn = currentSource?.type === "turn" ? currentSource.turn : null;
  let Je;
  if ($[5] !== currentTurn || $[6] !== l) {
    Je = currentTurn ? turnDiffToDiffData(currentTurn) : l;
    $[5] = currentTurn;
    $[6] = l;
    $[7] = Je;
  } else Je = $[7];
  let c = Je;
  let f = c.files[index];
  let Qe;
  if ($[8] !== c.hunks || $[9] !== f) {
    Qe = f ? c.hunks.get(f.path) || [] : [];
    $[8] = c.hunks;
    $[9] = f;
    $[10] = Qe;
  } else Qe = $[10];
  let hunks = Qe;
  let Xe;
  let Ye;
  if ($[11] !== g || $[12] !== p.length) {
    Xe = () => {
      if (g >= p.length) D(Math.max(0, p.length - 1));
    };
    Ye = [p.length, g];
    $[11] = g;
    $[12] = p.length;
    $[13] = Xe;
    $[14] = Ye;
  } else {
    Xe = $[13];
    Ye = $[14];
  }
  P(Xe, Ye);
  useRegisterOverlay("diff-dialog");
  let scrollViewportHandle = useScrollViewportHandle();
  let Ze;
  if ($[15] !== scrollViewportHandle?.handle || $[16] !== d) {
    Ze = function M(ni) {
      let handle = scrollViewportHandle?.handle;
      if (d !== "detail" || !handle) {
        return false;
      }
      let max = Math.max(1, Math.floor(handle.getViewportHeight() / 2));
      let max_2 = Math.max(1, handle.getViewportHeight());
      Xi: switch (ni) {
        case "up": {
          handle.scrollBy(-1);
          break Xi;
        }
        case "down": {
          handle.scrollBy(1);
          break Xi;
        }
        case "pageUp": {
          jumpBy(handle, -max, false);
          break Xi;
        }
        case "pageDown": {
          jumpBy(handle, max, false);
          break Xi;
        }
        case "fullPageUp": {
          jumpBy(handle, -max_2, false);
          break Xi;
        }
        case "fullPageDown": {
          jumpBy(handle, max_2, false);
          break Xi;
        }
        case "top": {
          handle.scrollTo(0);
          break Xi;
        }
        case "bottom": {
          handle.scrollToBottom();
        }
      }
    };
    $[15] = scrollViewportHandle?.handle;
    $[16] = d;
    $[17] = Ze;
  } else Ze = $[17];
  let M = Ze;
  let it;
  let rt;
  if ($[18] !== p.length || $[19] !== d) {
    it = () => {
      if (d === "list" && p.length > 1) D((oi) => (oi - 1 + p.length) % p.length);
    };
    rt = () => {
      if (d === "list" && p.length > 1) D((li) => (li + 1) % p.length);
    };
    $[18] = p.length;
    $[19] = d;
    $[20] = it;
    $[21] = rt;
  } else {
    it = $[20];
    rt = $[21];
  }
  let st;
  if ($[22] !== d) {
    st = () => {
      if (d === "detail") U("list");
    };
    $[22] = d;
    $[23] = st;
  } else st = $[23];
  let nt;
  let ot;
  let lt;
  let at;
  let ct;
  let dt;
  let ut;
  let ft;
  if ($[24] !== M) {
    nt = () => M("up");
    ot = () => M("down");
    lt = () => M("pageUp");
    at = () => M("pageDown");
    ct = () => M("fullPageUp");
    dt = () => M("fullPageDown");
    ut = () => M("top");
    ft = () => M("bottom");
    $[24] = M;
    $[25] = nt;
    $[26] = ot;
    $[27] = lt;
    $[28] = at;
    $[29] = ct;
    $[30] = dt;
    $[31] = ut;
    $[32] = ft;
  } else {
    nt = $[25];
    ot = $[26];
    lt = $[27];
    at = $[28];
    ct = $[29];
    dt = $[30];
    ut = $[31];
    ft = $[32];
  }
  let mt;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    mt = {
      context: "DiffDialog",
    };
    $[33] = mt;
  } else mt = $[33];
  MessageActionsKeybindings(
    {
      "diff:dismiss": handleCancel,
      "diff:previousSource": it,
      "diff:nextSource": rt,
      "diff:back": st,
      "diff:previousFile": nt,
      "diff:nextFile": ot,
      "scroll:pageUp": lt,
      "scroll:pageDown": at,
      "scroll:fullPageUp": ct,
      "scroll:fullPageDown": dt,
      "scroll:top": ut,
      "scroll:bottom": ft,
    },
    mt,
  );
  useRegisterKeybindingContext("DiffDialog");
  let ht;
  if ($[34] !== c.files.length || $[35] !== g) {
    ht = (prev_2) =>
      J((X) => {
        let index = X.source === g ? X.index : 0;
        let max = Math.max(0, Math.min(c.files.length - 1, index + prev_2));
        if (max === index) {
          return X;
        }
        return {
          source: g,
          index: max,
          mount: X.mount + 1,
        };
      });
    $[34] = c.files.length;
    $[35] = g;
    $[36] = ht;
  } else ht = $[36];
  let Y = ht;
  let xt;
  if ($[37] !== Y) {
    xt = {
      "diff:previousFile": () => Y(-1),
      "diff:nextFile": () => Y(1),
    };
    $[37] = Y;
    $[38] = xt;
  } else xt = $[38];
  const isActive = d === "list";
  let yt;
  if ($[39] !== isActive) {
    yt = {
      context: "Select",
      isActive,
    };
    $[39] = isActive;
    $[40] = yt;
  } else yt = $[40];
  MessageActionsKeybindings(xt, yt);
  let Tt;
  if ($[41] !== c.stats) {
    Tt = c.stats
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            c.stats.filesCount,
            " ",
            plural(c.stats.filesCount, "file"),
            " ",
            "changed",
            " ",
            jsxProd_default(DiffStatCounts, {
              added: c.stats.linesAdded,
              removed: c.stats.linesRemoved,
            }),
          ],
        })
      : null;
    $[41] = c.stats;
    $[42] = Tt;
  } else Tt = $[42];
  let me = Tt;
  let vt = !currentTurn && c.noCommits === true;
  let ci = !currentTurn && c.source.kind === "branch";
  let headerTitle = currentTurn
    ? `Turn ${currentTurn.turnIndex}`
    : vt
      ? "Staged and new files"
      : ci
        ? "Branch changes"
        : "Uncommitted changes";
  let headerSubtitle = currentTurn
    ? currentTurn.userPromptPreview
      ? `"${currentTurn.userPromptPreview}"`
      : ""
    : vt
      ? "(no commits yet)"
      : c.source.kind === "branch"
        ? `(vs ${c.source.baseBranch})`
        : "(git diff HEAD)";
  let z;
  Yi: {
    if (currentTurn) {
      z = "No file changes in this turn";
      break Yi;
    }
    if (notice) {
      z = notice;
      break Yi;
    }
    if (c.stats && c.stats.filesCount > 0 && c.files.length === 0) {
      z = "Too many files to display details";
      break Yi;
    }
    z = "No changes yet";
  }
  let children = z;
  let ee;
  if ($[43] !== headerSubtitle) {
    ee =
      headerSubtitle &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" ", headerSubtitle],
      });
    $[43] = headerSubtitle;
    $[44] = ee;
  } else ee = $[44];
  let Ft;
  if ($[45] !== headerTitle || $[46] !== ee) {
    Ft = jsxProd_default_2(Text, {
      children: [headerTitle, ee],
    });
    $[45] = headerTitle;
    $[46] = ee;
    $[47] = Ft;
  } else Ft = $[47];
  let title = Ft;
  function handleCancel() {
    if (d === "detail") U("list");
    else
      onDone("Diff dialog dismissed", {
        display: "system",
      });
  }
  let te;
  if (
    $[48] !== c.files ||
    $[49] !== c.loading ||
    $[50] !== children ||
    $[51] !== b.mount ||
    $[52] !== f?.isBinary ||
    $[53] !== f?.isLargeFile ||
    $[54] !== f?.isRestricted ||
    $[55] !== f?.isTruncated ||
    $[56] !== f?.isUntracked ||
    $[57] !== f?.path ||
    $[58] !== hunks ||
    $[59] !== index ||
    $[60] !== g ||
    $[61] !== d
  ) {
    te =
      c.files.length === 0
        ? c.loading
          ? jsxProd_default(WorkerBadge, {
              message: "Loading diff\u2026",
              dimColor: true,
            })
          : jsxProd_default(Text, {
              dimColor: true,
              children,
            })
        : d === "list"
          ? jsxProd_default(Box, {
              flexDirection: "column",
              children: jsxProd_default(
                DiffFileList,
                {
                  files: c.files,
                  defaultFocusIndex: index,
                  resetKey: g,
                  onFocus: (index) =>
                    J((ui) => ({
                      ...ui,
                      source: g,
                      index,
                    })),
                  onSelect: () => U("detail"),
                },
                b.mount,
              ),
            })
          : jsxProd_default(Box, {
              flexDirection: "column",
              children: jsxProd_default(DiffDetailView, {
                filePath: f?.path || "",
                hunks,
                isLargeFile: f?.isLargeFile,
                isBinary: f?.isBinary,
                isTruncated: f?.isTruncated,
                isUntracked: f?.isUntracked,
                isRestricted: f?.isRestricted,
              }),
            });
    $[48] = c.files;
    $[49] = c.loading;
    $[50] = children;
    $[51] = b.mount;
    $[52] = f?.isBinary;
    $[53] = f?.isLargeFile;
    $[54] = f?.isRestricted;
    $[55] = f?.isTruncated;
    $[56] = f?.isUntracked;
    $[57] = f?.path;
    $[58] = hunks;
    $[59] = index;
    $[60] = g;
    $[61] = d;
    $[62] = te;
  } else te = $[62];
  let Pt;
  if ($[63] !== me || $[64] !== te) {
    Pt = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [me, te],
    });
    $[63] = me;
    $[64] = te;
    $[65] = Pt;
  } else Pt = $[65];
  let children_2 = Pt;
  const onCancel = handleCancel;
  let inputGuide;
  if ($[66] !== p.length || $[67] !== d) {
    inputGuide =
      d === "list"
        ? jsxProd_default_2(Byline, {
            children: [
              p.length > 1 &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: ["left", "right"],
                  action: "switch source",
                }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: ["up", "down"],
                action: "select",
              }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "view",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "diff:dismiss",
                context: "DiffDialog",
                fallback: "Esc",
                description: "close",
              }),
            ],
          })
        : jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: ["up", "down"],
                action: "scroll",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "diff:dismiss",
                context: "DiffDialog",
                fallback: "Esc",
                description: "back",
              }),
            ],
          });
    $[66] = p.length;
    $[67] = d;
    $[68] = inputGuide;
  } else inputGuide = $[68];
  const hidden = p.length <= 1;
  const selectedTab = String(g);
  let onTabChange;
  if ($[69] === MEMO_CACHE_SENTINEL) {
    onTabChange = (exitState) => D(Number(exitState));
    $[69] = onTabChange;
  } else onTabChange = $[69];
  const disableNavigation = d === "detail";
  let children_3;
  if ($[70] !== children_2 || $[71] !== p) {
    children_3 = p.map((bt, It) =>
      jsxProd_default(
        Tab,
        {
          id: String(It),
          title: bt.type === "current" ? "Current" : `T${bt.turn.turnIndex}`,
          children: children_2,
        },
        It,
      ),
    );
    $[70] = children_2;
    $[71] = p;
    $[72] = children_3;
  } else children_3 = $[72];
  let children_4;
  if ($[73] !== hidden || $[74] !== selectedTab || $[75] !== disableNavigation || $[76] !== children_3) {
    children_4 = jsxProd_default(Tabs, {
      title: null,
      hidden,
      selectedTab,
      onTabChange,
      disableNavigation,
      children: children_3,
    });
    $[73] = hidden;
    $[74] = selectedTab;
    $[75] = disableNavigation;
    $[76] = children_3;
    $[77] = children_4;
  } else children_4 = $[77];
  let Rt;
  if ($[78] !== handleCancel || $[79] !== inputGuide || $[80] !== children_4 || $[81] !== title) {
    Rt = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "background",
      inputGuide,
      children: children_4,
    });
    $[78] = handleCancel;
    $[79] = inputGuide;
    $[80] = children_4;
    $[81] = title;
    $[82] = Rt;
  } else Rt = $[82];
  return Rt;
}
