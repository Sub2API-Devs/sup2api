/**
 * components/diff/DiffDialog.tsx
 *
 * /diff 对话框：当前工作区 diff 与每回合 diff（turn）切换，文件列表与详情两级视图。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffDialog.tsx
 * pieces: chunk-r1fypyw9.js (7)
 * attribution: placement 4, fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { merged } from "../CustomSelect/select.js";
import { FileItem } from "./DiffFileList.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { HintText } from "../design-system/HintText.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { useWorkspaceDiff } from "../../hooks/useWorkspaceDiff.js";
import { useTurnDiffs } from "../../hooks/useTurnDiffs.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-r1fypyw9.js:18197-18212 placement
function noop() {}
//@ chunk-r1fypyw9.js:18212-18278 placement
function renderFileItem(file) {
  return jsxProd_default(
    merged.Item,
    {
      children: jsxProd_default(FileItem, {
        file,
      }),
    },
    file.path,
  );
}
//@ chunk-r1fypyw9.js:18278-18287 placement
var DIFF_LIST_VISIBLE_COUNT = 7;
//@ chunk-r1fypyw9.js:18287-18764 placement
/**
 * /diff 对话框的变更文件列表；没有文件时显示 “No changed files”。
 */
function DiffFileList(props) {
  let $ = useMemoCache(9);
  let { files, defaultFocusIndex, resetKey, onFocus, onSelect } = props;
  if (files.length === 0) {
    let emptyHint;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      emptyHint = jsxProd_default(HintText, {
        children: "No changed files",
      });
      $[0] = emptyHint;
    } else emptyHint = $[0];
    return emptyHint;
  }
  let children;
  if ($[1] !== files) {
    children = files.map(renderFileItem);
    $[1] = files;
    $[2] = children;
  } else children = $[2];
  let list;
  if (
    $[3] !== defaultFocusIndex ||
    $[4] !== onFocus ||
    $[5] !== onSelect ||
    $[6] !== resetKey ||
    $[7] !== children
  ) {
    list = jsxProd_default(merged, {
      visibleCount: DIFF_LIST_VISIBLE_COUNT,
      defaultFocusIndex,
      resetKey,
      onFocus,
      onSelect,
      onUpFromFirstItem: noop,
      children,
    });
    $[3] = defaultFocusIndex;
    $[4] = onFocus;
    $[5] = onSelect;
    $[6] = resetKey;
    $[7] = children;
    $[8] = list;
  } else list = $[8];
  return list;
}
//@ chunk-r1fypyw9.js:20263-20307 fingerprint (2.1.88 match: _temp, 1)
function turnDiffEntry(turn) {
  return {
    type: "turn",
    turn,
  };
}
//@ chunk-r1fypyw9.js:20307-20795 fingerprint (2.1.88 match: turnDiffToDiffData, 0.851)
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
    .sort((left, right) => left.path.localeCompare(right.path));
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
//@ chunk-r1fypyw9.js:20795-27103 fingerprint (2.1.88 match: DiffDialog, 0.557)
function DiffDialog(props) {
  let $ = useMemoCache(83);
  let { messages, onDone } = props;
  let isRemote;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    isRemote = isRemoteSessionAvailable();
    $[0] = isRemote;
  } else isRemote = $[0];
  let { data: workspaceDiff, notice } = useWorkspaceDiff(isRemote);
  let turnDiffs = useTurnDiffs(messages);
  let [viewMode, setViewMode] = useState("list");
  let [sourceIndex, setSourceIndex] = useState(0);
  let initialFileSelection;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    initialFileSelection = {
      source: 0,
      index: 0,
      mount: 0,
    };
    $[1] = initialFileSelection;
  } else initialFileSelection = $[1];
  let [fileSelection, setFileSelection] = useState(initialFileSelection);
  let index = fileSelection.source === sourceIndex ? fileSelection.index : 0;
  let workspaceSource;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    workspaceSource = {
      type: "current",
    };
    $[2] = workspaceSource;
  } else workspaceSource = $[2];
  let sourcesCached;
  if ($[3] !== turnDiffs) {
    sourcesCached = [workspaceSource, ...turnDiffs.map(turnDiffEntry)];
    $[3] = turnDiffs;
    $[4] = sourcesCached;
  } else sourcesCached = $[4];
  let sources = sourcesCached;
  let currentSource = sources[sourceIndex];
  let currentTurn = currentSource?.type === "turn" ? currentSource.turn : null;
  let diffDataCached;
  if ($[5] !== currentTurn || $[6] !== workspaceDiff) {
    diffDataCached = currentTurn ? turnDiffToDiffData(currentTurn) : workspaceDiff;
    $[5] = currentTurn;
    $[6] = workspaceDiff;
    $[7] = diffDataCached;
  } else diffDataCached = $[7];
  let diffData = diffDataCached;
  let selectedFile = diffData.files[index];
  let hunksCached;
  if ($[8] !== diffData.hunks || $[9] !== selectedFile) {
    hunksCached = selectedFile ? diffData.hunks.get(selectedFile.path) || [] : [];
    $[8] = diffData.hunks;
    $[9] = selectedFile;
    $[10] = hunksCached;
  } else hunksCached = $[10];
  let hunks = hunksCached;
  let clampSourceEffect;
  let clampSourceDeps;
  if ($[11] !== sourceIndex || $[12] !== sources.length) {
    clampSourceEffect = () => {
      if (sourceIndex >= sources.length) setSourceIndex(Math.max(0, sources.length - 1));
    };
    clampSourceDeps = [sources.length, sourceIndex];
    $[11] = sourceIndex;
    $[12] = sources.length;
    $[13] = clampSourceEffect;
    $[14] = clampSourceDeps;
  } else {
    clampSourceEffect = $[13];
    clampSourceDeps = $[14];
  }
  useEffect(clampSourceEffect, clampSourceDeps);
  useRegisterOverlay("diff-dialog");
  let scrollViewportHandle = useScrollViewportHandle();
  let scrollCommandCached;
  if ($[15] !== scrollViewportHandle?.handle || $[16] !== viewMode) {
    scrollCommandCached = function handleScrollCommand(command) {
      let handle = scrollViewportHandle?.handle;
      if (viewMode !== "detail" || !handle) {
        return false;
      }
      let max = Math.max(1, Math.floor(handle.getViewportHeight() / 2));
      let max_2 = Math.max(1, handle.getViewportHeight());
      Xi: switch (command) {
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
    $[16] = viewMode;
    $[17] = scrollCommandCached;
  } else scrollCommandCached = $[17];
  let runScrollCommand = scrollCommandCached;
  let previousSource;
  let nextSource;
  if ($[18] !== sources.length || $[19] !== viewMode) {
    previousSource = () => {
      if (viewMode === "list" && sources.length > 1)
        setSourceIndex((previous) => (previous - 1 + sources.length) % sources.length);
    };
    nextSource = () => {
      if (viewMode === "list" && sources.length > 1)
        setSourceIndex((previous) => (previous + 1) % sources.length);
    };
    $[18] = sources.length;
    $[19] = viewMode;
    $[20] = previousSource;
    $[21] = nextSource;
  } else {
    previousSource = $[20];
    nextSource = $[21];
  }
  let backToList;
  if ($[22] !== viewMode) {
    backToList = () => {
      if (viewMode === "detail") setViewMode("list");
    };
    $[22] = viewMode;
    $[23] = backToList;
  } else backToList = $[23];
  let previousFile;
  let nextFile;
  let pageUp;
  let pageDown;
  let fullPageUp;
  let fullPageDown;
  let scrollTop;
  let scrollBottom;
  if ($[24] !== runScrollCommand) {
    previousFile = () => runScrollCommand("up");
    nextFile = () => runScrollCommand("down");
    pageUp = () => runScrollCommand("pageUp");
    pageDown = () => runScrollCommand("pageDown");
    fullPageUp = () => runScrollCommand("fullPageUp");
    fullPageDown = () => runScrollCommand("fullPageDown");
    scrollTop = () => runScrollCommand("top");
    scrollBottom = () => runScrollCommand("bottom");
    $[24] = runScrollCommand;
    $[25] = previousFile;
    $[26] = nextFile;
    $[27] = pageUp;
    $[28] = pageDown;
    $[29] = fullPageUp;
    $[30] = fullPageDown;
    $[31] = scrollTop;
    $[32] = scrollBottom;
  } else {
    previousFile = $[25];
    nextFile = $[26];
    pageUp = $[27];
    pageDown = $[28];
    fullPageUp = $[29];
    fullPageDown = $[30];
    scrollTop = $[31];
    scrollBottom = $[32];
  }
  let diffKeybindingOptions;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    diffKeybindingOptions = {
      context: "DiffDialog",
    };
    $[33] = diffKeybindingOptions;
  } else diffKeybindingOptions = $[33];
  MessageActionsKeybindings(
    {
      "diff:dismiss": handleCancel,
      "diff:previousSource": previousSource,
      "diff:nextSource": nextSource,
      "diff:back": backToList,
      "diff:previousFile": previousFile,
      "diff:nextFile": nextFile,
      "scroll:pageUp": pageUp,
      "scroll:pageDown": pageDown,
      "scroll:fullPageUp": fullPageUp,
      "scroll:fullPageDown": fullPageDown,
      "scroll:top": scrollTop,
      "scroll:bottom": scrollBottom,
    },
    diffKeybindingOptions,
  );
  useRegisterKeybindingContext("DiffDialog");
  let changeFileCached;
  if ($[34] !== diffData.files.length || $[35] !== sourceIndex) {
    changeFileCached = (prev_2) =>
      setFileSelection((previous) => {
        let index = previous.source === sourceIndex ? previous.index : 0;
        let max = Math.max(0, Math.min(diffData.files.length - 1, index + prev_2));
        if (max === index) {
          return previous;
        }
        return {
          source: sourceIndex,
          index: max,
          mount: previous.mount + 1,
        };
      });
    $[34] = diffData.files.length;
    $[35] = sourceIndex;
    $[36] = changeFileCached;
  } else changeFileCached = $[36];
  let changeFile = changeFileCached;
  let listBindings;
  if ($[37] !== changeFile) {
    listBindings = {
      "diff:previousFile": () => changeFile(-1),
      "diff:nextFile": () => changeFile(1),
    };
    $[37] = changeFile;
    $[38] = listBindings;
  } else listBindings = $[38];
  const isActive = viewMode === "list";
  let listKeybindingOptions;
  if ($[39] !== isActive) {
    listKeybindingOptions = {
      context: "Select",
      isActive,
    };
    $[39] = isActive;
    $[40] = listKeybindingOptions;
  } else listKeybindingOptions = $[40];
  MessageActionsKeybindings(listBindings, listKeybindingOptions);
  let statsElement;
  if ($[41] !== diffData.stats) {
    statsElement = diffData.stats
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            diffData.stats.filesCount,
            " ",
            plural(diffData.stats.filesCount, "file"),
            " ",
            "changed",
            " ",
            jsxProd_default(DiffStatCounts, {
              added: diffData.stats.linesAdded,
              removed: diffData.stats.linesRemoved,
            }),
          ],
        })
      : null;
    $[41] = diffData.stats;
    $[42] = statsElement;
  } else statsElement = $[42];
  let stats = statsElement;
  let isStagedFiles = !currentTurn && diffData.noCommits === true;
  let isBranchSource = !currentTurn && diffData.source.kind === "branch";
  let headerTitle = currentTurn
    ? `Turn ${currentTurn.turnIndex}`
    : isStagedFiles
      ? "Staged and new files"
      : isBranchSource
        ? "Branch changes"
        : "Uncommitted changes";
  let headerSubtitle = currentTurn
    ? currentTurn.userPromptPreview
      ? `"${currentTurn.userPromptPreview}"`
      : ""
    : isStagedFiles
      ? "(no commits yet)"
      : diffData.source.kind === "branch"
        ? `(vs ${diffData.source.baseBranch})`
        : "(git diff HEAD)";
  let titleCached;
  Yi: {
    if (currentTurn) {
      titleCached = "No file changes in this turn";
      break Yi;
    }
    if (notice) {
      titleCached = notice;
      break Yi;
    }
    if (diffData.stats && diffData.stats.filesCount > 0 && diffData.files.length === 0) {
      titleCached = "Too many files to display details";
      break Yi;
    }
    titleCached = "No changes yet";
  }
  let children = titleCached;
  let subtitleElement;
  if ($[43] !== headerSubtitle) {
    subtitleElement =
      headerSubtitle &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" ", headerSubtitle],
      });
    $[43] = headerSubtitle;
    $[44] = subtitleElement;
  } else subtitleElement = $[44];
  let titleElement;
  if ($[45] !== headerTitle || $[46] !== subtitleElement) {
    titleElement = jsxProd_default_2(Text, {
      children: [headerTitle, subtitleElement],
    });
    $[45] = headerTitle;
    $[46] = subtitleElement;
    $[47] = titleElement;
  } else titleElement = $[47];
  let title = titleElement;
  function handleCancel() {
    if (viewMode === "detail") setViewMode("list");
    else
      onDone("Diff dialog dismissed", {
        display: "system",
      });
  }
  let bodyElement;
  if (
    $[48] !== diffData.files ||
    $[49] !== diffData.loading ||
    $[50] !== children ||
    $[51] !== fileSelection.mount ||
    $[52] !== selectedFile?.isBinary ||
    $[53] !== selectedFile?.isLargeFile ||
    $[54] !== selectedFile?.isRestricted ||
    $[55] !== selectedFile?.isTruncated ||
    $[56] !== selectedFile?.isUntracked ||
    $[57] !== selectedFile?.path ||
    $[58] !== hunks ||
    $[59] !== index ||
    $[60] !== sourceIndex ||
    $[61] !== viewMode
  ) {
    bodyElement =
      diffData.files.length === 0
        ? diffData.loading
          ? jsxProd_default(WorkerBadge, {
              message: "Loading diff\u2026",
              dimColor: true,
            })
          : jsxProd_default(Text, {
              dimColor: true,
              children,
            })
        : viewMode === "list"
          ? jsxProd_default(Box, {
              flexDirection: "column",
              children: jsxProd_default(
                DiffFileList,
                {
                  files: diffData.files,
                  defaultFocusIndex: index,
                  resetKey: sourceIndex,
                  onFocus: (index) =>
                    setFileSelection((selection) => ({
                      ...selection,
                      source: sourceIndex,
                      index,
                    })),
                  onSelect: () => setViewMode("detail"),
                },
                fileSelection.mount,
              ),
            })
          : jsxProd_default(Box, {
              flexDirection: "column",
              children: jsxProd_default(DiffDetailView, {
                filePath: selectedFile?.path || "",
                hunks,
                isLargeFile: selectedFile?.isLargeFile,
                isBinary: selectedFile?.isBinary,
                isTruncated: selectedFile?.isTruncated,
                isUntracked: selectedFile?.isUntracked,
                isRestricted: selectedFile?.isRestricted,
              }),
            });
    $[48] = diffData.files;
    $[49] = diffData.loading;
    $[50] = children;
    $[51] = fileSelection.mount;
    $[52] = selectedFile?.isBinary;
    $[53] = selectedFile?.isLargeFile;
    $[54] = selectedFile?.isRestricted;
    $[55] = selectedFile?.isTruncated;
    $[56] = selectedFile?.isUntracked;
    $[57] = selectedFile?.path;
    $[58] = hunks;
    $[59] = index;
    $[60] = sourceIndex;
    $[61] = viewMode;
    $[62] = bodyElement;
  } else bodyElement = $[62];
  let contentElement;
  if ($[63] !== stats || $[64] !== bodyElement) {
    contentElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [stats, bodyElement],
    });
    $[63] = stats;
    $[64] = bodyElement;
    $[65] = contentElement;
  } else contentElement = $[65];
  let children_2 = contentElement;
  const onCancel = handleCancel;
  let inputGuide;
  if ($[66] !== sources.length || $[67] !== viewMode) {
    inputGuide =
      viewMode === "list"
        ? jsxProd_default_2(Byline, {
            children: [
              sources.length > 1 &&
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
    $[66] = sources.length;
    $[67] = viewMode;
    $[68] = inputGuide;
  } else inputGuide = $[68];
  const hidden = sources.length <= 1;
  const selectedTab = String(sourceIndex);
  let onTabChange;
  if ($[69] === MEMO_CACHE_SENTINEL) {
    onTabChange = (exitState) => setSourceIndex(Number(exitState));
    $[69] = onTabChange;
  } else onTabChange = $[69];
  const disableNavigation = viewMode === "detail";
  let children_3;
  if ($[70] !== children_2 || $[71] !== sources) {
    children_3 = sources.map((source, index) =>
      jsxProd_default(
        Tab,
        {
          id: String(index),
          title: source.type === "current" ? "Current" : `T${source.turn.turnIndex}`,
          children: children_2,
        },
        index,
      ),
    );
    $[70] = children_2;
    $[71] = sources;
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
  let dialogElement;
  if ($[78] !== handleCancel || $[79] !== inputGuide || $[80] !== children_4 || $[81] !== title) {
    dialogElement = jsxProd_default(Dialog, {
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
    $[82] = dialogElement;
  } else dialogElement = $[82];
  return dialogElement;
}
export { DiffDialog };
