/**
 * components/settings/stagedSettingsReview.tsx
 *
 * 2.1.316 新增：审阅"暂存的设置变更"与云会话使用的设置冻结版本（逐条接受、冲突/过期/被替换检测）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kh7eenke.js (50)
 * attribution: placement 49, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstatSync, realpathSync } from "fs";
import { dirname, resolve, join, basename } from "path";
import { homedir } from "os";
import {
  init_react_production,
  useState,
  useRef,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import {
  markBrokenSequences,
  isCombiningOrZeroWidth,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { GRAPHEME_TRUNCATION_MARKER_RE } from "../../utils/truncateGraphemes.js";
import { tildify } from "../../utils/path.js";
import { wrapByWidth } from "../permissions/wrapWidth.js";
import { countCharInString, takeLastChars, plural } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import {
  PROPOSED_FILE_INFIX,
  describeSettingsChange,
  discardSettingsProposal,
  acceptSettingsProposal,
  stripBomAndCarriageReturns,
  REVIEW_STORE_VERSION,
} from "../../utils/settings/settingsReview.js";
import { formatRelativeTimeAgo } from "../../utils/format.js";
import { getPatchFromContents } from "../../utils/diff.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { PANE_PADDING_X, PANE_PADDING, Pane } from "../design-system/Pane.js";
import { useInputClock } from "../../ink/components/Input.js";
import {
  useRecentInputStamp,
  RECENT_INPUT_GUARD_MS,
  isWithinRecentInput,
} from "../../hooks/useRecentInputGuard.js";
import { useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { AgentNavigationFooter } from "../agents/AgentNavigationFooter.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import {
  logFeatureOk,
  logFeatureSad,
  logFeatureBad,
  logFeatureBadAsync,
  logFeatureOkAsync,
} from "../../services/analytics/featureTelemetry.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { logError } from "../../utils/log.js";
import {
  APPLY_PROJECT_SETTINGS,
  isApplyProjectSettingsCommand,
} from "../../cli/handlers/applyProjectSettings.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { USER_SETTINGS_FILE_NAMES, parseSettingsContent } from "../../utils/settings/settingsFileParsing.js";
import { isSameOrUnderPath } from "../../utils/pathPrefix.js";
import { REPO_DIR_SETTING_SOURCES } from "../../utils/settings/constants.js";
import {
  hashOrNull,
  checkSettingsCopy,
  createAcceptedSettingsStore,
} from "../../services/remoteTools/acceptedSettings.js";
import { settingsToJsonText, servedRestrictionSnapshot } from "../../remote/tools/servedOwnerSettings.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { CONFIG_CHANGE_SOURCES_2 } from "../../entrypoints/sdk/coreSchemas.js";
import { AppRoot } from "../AppRoot.js";
import { onChangeAppState } from "../../state/onChangeAppState.js";
import {
  repoTierFileSlots,
  getSettingsFilePathForSource,
  readRepoTierFileText,
} from "../../utils/settings/settings.js";
import {
  getFlagSettingsPath,
  getFlagSettingsInline,
  getAllowedSettingSourcesAsConfigured,
} from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { getCwd } from "../../utils/cwd.js";
import { printCliError, exitAfterAnalyticsFlush } from "../../cli/exit.js";
import { configChangeBlocker } from "../../utils/model/providerAttribution.js";
import { createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";

//@ chunk-kh7eenke.js:17351-17355 placement
init_react_production();
//@ chunk-kh7eenke.js:17355-17643 placement
var DIFF_CONTEXT_LINES = 8;
var REVIEW_MAX_ROWS = 8;
var REVIEW_HEADER_ROWS = 2;
var REVIEW_INDENT = 3;
var REVIEW_BLOCK_ROWS = 3;
var TERMINAL_TOO_SMALL_REVIEW_TEXT =
  "Enlarge the terminal (or reduce the font size) and run /settings-review again to see the whole change before accepting; or discard it.";
var STAGED_CHANGE_PREFIX = "Staged change to ";
var LINKED_PATH_NOTE = "A linked path; accepting writes the file it points to \u2192";
var ACCEPT_WRITES_PREFIX = "Accepting writes \u2192 ";
//@ chunk-kh7eenke.js:17643-17746 placement
var UNSAFE_DISPLAY_CHARS_RE =
  /[\x00-\x08\x0a-\x1f\x7f-\x9f\u2028\u2029\u2800\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-kh7eenke.js:17746-17812 placement
function escapeControlChars(text, tabReplacement) {
  return text.replace(UNSAFE_DISPLAY_CHARS_RE, "\uFFFD").replaceAll("\t", tabReplacement);
}
//@ chunk-kh7eenke.js:17812-17848 placement
function sanitizeEscaped(text, tabReplacement) {
  return markBrokenSequences(escapeControlChars(text, tabReplacement));
}
//@ chunk-kh7eenke.js:17848-17906 placement
function isInvisibleOnly(text) {
  return /[\p{Mn}\p{Me}]/u.test(text) && bunStringWidth(text) === 0;
}
//@ chunk-kh7eenke.js:17906-17934 placement
function isVisibleLine(text) {
  return !isInvisibleOnly(text);
}
//@ chunk-kh7eenke.js:17934-17971 placement
function isNumericLine(text) {
  return isCombiningOrZeroWidth(text) && !isInvisibleOnly(text);
}
//@ chunk-kh7eenke.js:17971-18032 placement
function countMatching(lines, predicate) {
  let count = 0;
  for (let line of lines) if (predicate(line)) count++;
  return count;
}
//@ chunk-kh7eenke.js:18032-18125 placement
function hasMoreContent(original, candidate) {
  return (
    countMatching(candidate, isVisibleLine) >= countMatching(original, isVisibleLine) &&
    countMatching(candidate, isNumericLine) === countMatching(original, isNumericLine) &&
    (!GRAPHEME_TRUNCATION_MARKER_RE.test(candidate) || GRAPHEME_TRUNCATION_MARKER_RE.test(original))
  );
}
//@ chunk-kh7eenke.js:18125-18184 placement
function normalizeSpaces(text) {
  return sanitizeEscaped(tildify(text), "\uFFFD").replace(/ +/g, " ");
}
//@ chunk-kh7eenke.js:18184-18198 placement (2.1.88 match: _temp18, 1)
var SPACE_CHAR = "    ";
//@ chunk-kh7eenke.js:18198-18229 layout
function sanitizeWithSpaces(text) {
  return sanitizeEscaped(text, SPACE_CHAR);
}
//@ chunk-kh7eenke.js:18229-18285 placement
function sanitizeOneLine(text) {
  return sanitizeEscaped(text, "\uFFFD").replace(/ +/g, " ");
}
//@ chunk-kh7eenke.js:18285-18582 placement
/**
 * 按宽度把文本折成行，超过行数上限时截断最后一行并附 "… (+N chars)"，返回 {rows, cut}。
 */
function wrapRowsWithCap(text, columns, maxRows) {
  let wrapped = wrapByWidth(text, Math.max(1, columns));
  if (wrapped.length <= maxRows)
    return {
      rows: wrapped,
      cut: 0,
    };
  let charCount = [...text].length;
  let sliced = wrapped.slice(0, maxRows);
  let overflowNote = ` \u2026 (+${charCount} chars)`.length + 1;
  let lastLine = wrapByWidth(sliced[maxRows - 1], Math.max(1, columns - overflowNote))[0] ?? "";
  sliced[maxRows - 1] = lastLine;
  let droppedChars = charCount - sliced.reduce((acc, line) => acc + [...line].length, 0);
  sliced[maxRows - 1] = `${lastLine} \u2026 (+${droppedChars} chars)`;
  return {
    rows: sliced,
    cut: droppedChars,
  };
}
//@ chunk-kh7eenke.js:18582-18643 placement
function textHeight(text, columns) {
  return (
    countCharInString(
      wrapText(text, Math.max(1, columns), "wrap"),
      `
`,
    ) + 1
  );
}
//@ chunk-kh7eenke.js:18643-18728 placement
var NON_PRINTABLE_PATTERN = /[\x00-\x08\x0b-\x1f\x7f]|[^\x00-\x7f]/gu;
var NON_ASCII_OR_CONTROL_RE = /[\x00-\x1f\x7f]|[^\x00-\x7f]/gu;
//@ chunk-kh7eenke.js:18728-18789 placement (2.1.88 match: getErrnoPath, 1)
function getErrnoPath(message, field) {
  return message.match(field === "path" ? NON_ASCII_OR_CONTROL_RE : NON_PRINTABLE_PATTERN)?.length ?? 0;
}
//@ chunk-kh7eenke.js:18789-18965 placement
function describeStagedBy(staged) {
  let shortSessionId = takeLastChars(sanitizeOneLine(staged.by.sessionId), 8);
  return staged.by.origin === "served"
    ? `by a cloud session (\u2026${shortSessionId}) this computer served`
    : `by a session on this computer (\u2026${shortSessionId})`;
}
//@ chunk-kh7eenke.js:18965-19011 placement
function isPathResolved(change) {
  return change.resolvedPath === change.path;
}
//@ chunk-kh7eenke.js:19011-19081 placement
var QUOTE_CHARS_RE = /["\u00ab\u00bb\u201c-\u201f\u2033\u2036\u301d-\u301f\uff02]/g;
//@ chunk-kh7eenke.js:19081-19249 placement
function truncateStartToWidth(text, maxWidth) {
  let chars = [...text];
  let width = 0;
  let index = chars.length;
  while (index > 0) {
    let char = chars[index - 1];
    let charWidth = char.length === 1 && char < "\x80" ? 1 : 2;
    if (width + charWidth > maxWidth) break;
    width += charWidth;
    index--;
  }
  return index === 0 ? text : `\u2026${chars.slice(index).join("")}`;
}
//@ chunk-kh7eenke.js:19249-19316 placement
function fileHeaderLine(change) {
  return `File: "${truncateStartToWidth(normalizeSpaces(change.path).replace(QUOTE_CHARS_RE, "'"), 60)}"`;
}
//@ chunk-kh7eenke.js:19316-20852 placement
/**
 * 应用暂存变更的结果说明（已写入、文件已变、提议已变、路径被重定向、硬链接、不可写、被篡改）。
 */
function describeApplyOutcome(outcome) {
  switch (outcome) {
    case "applied":
      return "Applied the staged change: the file is written and this session has reloaded it; settings that are only read at startup take effect next launch.";
    case "conflict":
      return "The file changed after this proposal was staged, so it was not applied. Discard it, or ask Claude to make the change again.";
    case "stale":
      return "The staged proposal changed while you were reviewing it, so it was not applied. Run /settings-review again to see the current one.";
    case "redirected":
      return "The path no longer leads to the file it did when this change was staged (a directory on the way now points elsewhere, or a link has appeared at it), so it was not applied. Discard it, or ask Claude to make the change again.";
    case "hard_linked":
      return "This settings file has other names on disk (a hard link), so it could not be rewritten safely and the change was not applied. It stays staged. Remove the extra link, then accept it again.";
    case "gone":
      return "The staged change is no longer in the review store.";
    case "not_writable":
      return "The file could not be written (a managed, read-only or locked location), so the change was not applied. It stays staged.";
    case "tampered":
      return "The proposal file shown to your ConfigChange hooks changed while they ran, so nothing was applied. It stays staged.";
    case "blocked":
      return `A ConfigChange hook blocked the change (hooks are shown the proposed content in a ${PROPOSED_FILE_INFIX}* file beside the settings file), so it was not applied: the file was never touched, and the change stays staged.`;
  }
}
//@ chunk-kh7eenke.js:20852-22284 placement
var STAGED_CHANGE_WORDING = {
  header: STAGED_CHANGE_PREFIX,
  listTitle: (count) => `${count} settings ${count === 1 ? "change" : "changes"} staged for your review`,
  listIntro:
    "Claude changed these Claude Code settings files without you approving it here, so the changes were held instead of applied. Nothing takes effect until you accept it.",
  listMore: (count) =>
    `+${count} more staged ${count === 1 ? "change" : "changes"} not listed; review these first`,
  listNote: (change, changeState) =>
    `${formatRelativeTimeAgo(new Date(change.stagedAt))} \xB7 ${describeStagedBy(change)}${changeState === "unreadable" ? " \xB7 file unreadable, cannot apply" : changeState === "changed" ? " \xB7 file changed since, cannot apply" : ""}`,
  byline: (change) =>
    `${change.by.tool} \xB7 ${formatRelativeTimeAgo(new Date(change.stagedAt))} \xB7 ${describeStagedBy(change)}`,
  acceptLabel: "Accept and apply this change",
  discardLabel: "Discard this change",
  enlarge: TERMINAL_TOO_SMALL_REVIEW_TEXT,
  underReview: "proposal",
  unreadable: (readError) =>
    `This file could not be read (${readError}), so the proposal cannot be applied here. Fix what keeps the file from being read, or discard it.`,
  notApplicable:
    "This file changed after this was staged (or the proposal no longer matches what was recorded), so it cannot be applied. Discard it, or ask Claude to make the change again.",
  diffUnavailable:
    "The diff for this proposal could not be computed, so it cannot be accepted here. Compare the file with what Claude proposed yourself, or discard it.",
  later: (followUp) => `Left the staged change for later \xB7 /settings-review. ${followUp}`,
  outcome: describeApplyOutcome,
  failed: (action, errorMessage, hint) =>
    `Could not ${action} the staged change. Nothing was applied; it stays staged. Error: "${errorMessage}" ${hint}`,
};
//@ chunk-kh7eenke.js:22284-22649 placement
/**
 * 把 diff hunk 行按宽度折行并放进剩余行数预算，放不下或显示不安全时停止，返回 {shown, hiddenLines}。
 */
function fitDiffHunks(rawHunks, budgetRows, maxLines) {
  let hunks = [];
  let remaining = budgetRows;
  let skipped = 0;
  let overflowed = false;
  for (let rawHunk of rawHunks) {
    if (overflowed) {
      skipped += rawHunk.lines.length;
      continue;
    }
    if (hunks.length > 0) remaining -= 1;
    let keptLines = [];
    for (let line of rawHunk.lines) {
      if (overflowed) {
        skipped++;
        continue;
      }
      let text = line.slice(1);
      let sanitized = sanitizeWithSpaces(text);
      let wrapped = wrapByWidth(sanitized, maxLines);
      if (wrapped.length <= remaining && hasMoreContent(escapeControlChars(text, SPACE_CHAR), sanitized)) {
        let moreContent = line[0];
        keptLines.push({
          marker: moreContent === "+" || moreContent === "-" ? moreContent : " ",
          rows: wrapped,
        });
        remaining -= wrapped.length;
      } else {
        overflowed = true;
        skipped++;
      }
    }
    if (keptLines.length > 0) hunks.push(keptLines);
  }
  return {
    shown: hunks,
    hiddenLines: skipped,
  };
}
//@ chunk-kh7eenke.js:22649-23009 placement
/**
 * 计算暂存设置变更的 diff：hunk、无法显示 diff 的情况、变更摘要，以及路径/内容中被隐藏的码点数。
 */
function computeStagedChangeDiff({ change, current: currentContent }) {
  let patchFromContents = getPatchFromContents({
    filePath: change.path,
    oldContent: currentContent ?? "",
    newContent: change.proposedContent,
  });
  let description = describeSettingsChange(currentContent, change.proposedContent);
  return {
    rawHunks: patchFromContents,
    diffUnavailable: patchFromContents.length === 0 && (currentContent ?? "") !== change.proposedContent,
    rawSummary: description,
    hiddenCodepoints:
      getErrnoPath(change.path, "path") +
      (isPathResolved(change) ? 0 : getErrnoPath(change.resolvedPath, "path")) +
      getErrnoPath(change.proposedContent, "text") +
      description.reduce((acc, patchFromContents) => acc + getErrnoPath(patchFromContents, "path"), 0),
  };
}
//@ chunk-kh7eenke.js:23009-23423 placement
/**
 * 按行渲染文本，首行带前缀、后续行用等宽空格缩进，可设置粗体与颜色。
 */
function IndentedRows(props) {
  let $ = useMemoCache(11);
  let { first, rows, bold, color } = props;
  let children;
  if ($[0] !== bold || $[1] !== color || $[2] !== first || $[3] !== rows) {
    let renderRow;
    if ($[5] !== bold || $[6] !== color || $[7] !== first) {
      renderRow = (text, index) =>
        jsxProd_default_2(
          Text,
          {
            bold,
            color,
            children: [index === 0 ? first : " ".repeat(first.length), text],
          },
          index,
        );
      $[5] = bold;
      $[6] = color;
      $[7] = first;
      $[8] = renderRow;
    } else renderRow = $[8];
    children = rows.map(renderRow);
    $[0] = bold;
    $[1] = color;
    $[2] = first;
    $[3] = rows;
    $[4] = children;
  } else children = $[4];
  let boxElement;
  if ($[9] !== children) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    $[9] = children;
    $[10] = boxElement;
  } else boxElement = $[10];
  return boxElement;
}
//@ chunk-kh7eenke.js:23423-23444 placement
var GUTTER_BAR = "\u2502";
var REVIEW_EXTRA_INDENT = 4;
//@ chunk-kh7eenke.js:23444-23877 placement
/**
 * 渲染待审设置的差异行：+/- 行加增删背景色，未变化行变暗，首行显示标记符号。
 */
function DiffLineRows(props) {
  let $ = useMemoCache(7);
  let { marker, rows } = props;
  let children;
  if ($[0] !== marker || $[1] !== rows) {
    let renderLine;
    if ($[3] !== marker) {
      renderLine = (line, index) =>
        jsxProd_default_2(
          Text,
          {
            dimColor: marker === " ",
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: GUTTER_BAR,
              }),
              jsxProd_default_2(Text, {
                backgroundColor: marker === "+" ? "diffAdded" : marker === "-" ? "diffRemoved" : undefined,
                children: [index === 0 ? marker : " ", " ", line],
              }),
            ],
          },
          index,
        );
      $[3] = marker;
      $[4] = renderLine;
    } else renderLine = $[4];
    children = rows.map(renderLine);
    $[0] = marker;
    $[1] = rows;
    $[2] = children;
  } else children = $[2];
  let boxElement;
  if ($[5] !== children) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    $[5] = children;
    $[6] = boxElement;
  } else boxElement = $[6];
  return boxElement;
}
//@ chunk-kh7eenke.js:23877-29457 placement
/**
 * 逐条显示暂存的设置变更（diff）并等待接受/拒绝。
 */
function StagedSettingsReview({ changes, deps, onDone, wording = STAGED_CHANGE_WORDING }) {
  let { columns, rows } = useScrollViewportSize(useTerminalSize());
  let hasScrollViewport = useHasScrollViewport();
  let max = Math.max(8, columns - 2 * (hasScrollViewport ? PANE_PADDING_X : PANE_PADDING));
  let [selectedChange, setSelectedChange] = useState(changes.length === 1 ? changes[0] : undefined);
  let [isSubmitting, setIsSubmitting] = useState(false);
  let submittingRef = useRef(false);
  let inputClock = useInputClock();
  let lastShownAt = useRef(Date.now());
  let isWithinGuard = useRecentInputStamp(lastShownAt.current);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let settle = settleKey(`${selectedChange?.change.id ?? ""}:${epoch}`, RECENT_INPUT_GUARD_MS);
  function refuseInput() {
    if (
      isWithinRecentInput(inputClock, isWithinGuard(lastShownAt.current), RECENT_INPUT_GUARD_MS) ||
      refusedWithin(RECENT_INPUT_GUARD_MS)
    ) {
      noteRefused();
      return true;
    }
    return false;
  }
  let exitKeybindings = useGlobalExitKeybindings(() => onDone());
  useKeybinding("confirm:no", () => onDone(), {
    context: "Confirmation",
    isActive: selectedChange === undefined,
  });
  let diff = useMemo(
    () => (selectedChange === undefined ? undefined : computeStagedChangeDiff(selectedChange)),
    [selectedChange],
  );
  if (selectedChange === undefined || diff === undefined) {
    let sliced = changes.slice(0, DIFF_CONTEXT_LINES);
    let hiddenCount = changes.length - sliced.length;
    let listTextWidth = max - 4;
    return jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: wording.listTitle(changes.length),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: wording.listIntro,
          }),
          jsxProd_default_2(OrderedListWithItem, {
            onSelect: (index) => {
              let change = sliced[index];
              if (change === undefined) {
                onDone();
                return;
              }
              lastShownAt.current = Date.now();
              setSelectedChange(change);
            },
            children: [
              sliced.map(({ change, applicable, readError }) =>
                jsxProd_default(
                  OrderedListWithItem.Item,
                  {
                    label: wrapRowsWithCap(normalizeSpaces(change.path), listTextWidth, 1).rows[0] ?? "",
                    description: wrapRowsWithCap(
                      `${wording.listNote(change, readError !== null ? "unreadable" : applicable ? undefined : "changed")}${isPathResolved(change) ? "" : ` \xB7 writes \u2192 ${normalizeSpaces(change.resolvedPath)}`}`,
                      listTextWidth,
                      1,
                    ).rows[0],
                  },
                  `open:${change.id}`,
                ),
              ),
              jsxProd_default(
                OrderedListWithItem.Item,
                {
                  label: "Done",
                },
                "done",
              ),
            ],
          }),
          hiddenCount > 0 &&
            jsxProd_default(Text, {
              dimColor: true,
              children: wording.listMore(hiddenCount),
            }),
          jsxProd_default(AgentNavigationFooter, {
            exitActive: false,
            children: exitKeybindings.pending
              ? `Press ${exitKeybindings.keyName} again to close`
              : jsxProd_default_2(Byline, {
                  children: [
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "enter",
                      action: "open",
                    }),
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "escape",
                      action: "close",
                    }),
                  ],
                }),
          }),
        ],
      }),
    });
  }
  let { change, readError, applicable } = selectedChange;
  let { rawHunks, diffUnavailable, rawSummary, hiddenCodepoints } = diff;
  let isUnresolvedPath = !isPathResolved(change);
  let headerRows = wrapRowsWithCap(normalizeSpaces(change.path), max - wording.header.length, REVIEW_INDENT);
  let resolvedPath = isUnresolvedPath ? normalizeSpaces(change.resolvedPath) : "";
  let pathNeedsCut =
    hasMoreContent(
      escapeControlChars(tildify(change.path), "\uFFFD").replace(/ +/g, " "),
      normalizeSpaces(change.path),
    ) &&
    (!isUnresolvedPath ||
      hasMoreContent(
        escapeControlChars(tildify(change.resolvedPath), "\uFFFD").replace(/ +/g, " "),
        resolvedPath,
      ));
  let linkedPathRows = isUnresolvedPath
    ? wrapRowsWithCap(resolvedPath, max - 2, REVIEW_INDENT)
    : {
        rows: [],
        cut: 0,
      };
  let acceptPathRows = isUnresolvedPath
    ? wrapRowsWithCap(resolvedPath, max - ACCEPT_WRITES_PREFIX.length, REVIEW_INDENT)
    : {
        rows: [],
        cut: 0,
      };
  let mapped = rawSummary
    .slice(0, REVIEW_MAX_ROWS)
    .map((line) => wrapRowsWithCap(sanitizeOneLine(line), max - 2, REVIEW_HEADER_ROWS).rows);
  let hiddenSummaryCount = rawSummary.length - mapped.length;
  let byline = wording.byline(change);
  let moreKeysNote =
    hiddenSummaryCount > 0
      ? `+${hiddenSummaryCount} more top-level ${plural(hiddenSummaryCount, "key")} changed, not listed; the diff below has them`
      : "";
  let nonAsciiNote =
    hiddenCodepoints > 0
      ? `${hiddenCodepoints} ${plural(hiddenCodepoints, "character")} in this ${wording.underReview} ${plural(hiddenCodepoints, "is", "are")} not plain ASCII (such characters may not display as written, or may look like others; controls show here as \uFFFD). Compare the file yourself before accepting; what you accept is the ${wording.underReview} as written.`
      : "";
  let problemText =
    readError !== null
      ? wording.unreadable(wrapRowsWithCap(sanitizeOneLine(readError), 48, 1).rows[0] ?? "")
      : !applicable
        ? wording.notApplicable
        : diffUnavailable
          ? wording.diffUnavailable
          : "";
  let canShowDiff = problemText === "";
  let acceptAsciiNote =
    canShowDiff && hiddenCodepoints > 0
      ? `Accepting applies ${hiddenCodepoints} ${plural(hiddenCodepoints, "character")} that ${plural(hiddenCodepoints, "is", "are")} not plain ASCII`
      : "";
  let textRows = (text) => (text === "" ? 0 : textHeight(text, max));
  let withGap = (rows) => (rows > 0 ? rows + 1 : 0);
  let reservedRows =
    REVIEW_BLOCK_ROWS +
    (hasScrollViewport ? 0 : 2) +
    withGap(
      headerRows.rows.length +
        (isUnresolvedPath ? textRows(LINKED_PATH_NOTE) + linkedPathRows.rows.length : 0) +
        textRows(byline),
    ) +
    withGap(mapped.reduce((acc, rows) => acc + rows.length, 0) + textRows(moreKeysNote)) +
    withGap(textRows(nonAsciiNote)) +
    withGap(textRows(acceptAsciiNote)) +
    withGap(acceptPathRows.rows.length) +
    textRows(
      `+${rawHunks.reduce((acc, rawHunk) => acc + rawHunk.lines.length, 0)} more changed lines are not shown; the path is too long to show whole; the file it points to is too long to show whole \u2014 ${wording.enlarge}`,
    ) +
    withGap(3);
  let { shown, hiddenLines } = canShowDiff
    ? fitDiffHunks(rawHunks, Math.max(0, rows - reservedRows), max - REVIEW_EXTRA_INDENT)
    : {
        shown: [],
        hiddenLines: 0,
      };
  let filtered = [
    hiddenLines > 0
      ? `${hiddenLines} more changed ${plural(hiddenLines, "line")} ${plural(hiddenLines, "is", "are")} not shown`
      : "",
    headerRows.cut > 0 || !pathNeedsCut ? "the path is too long to show whole" : "",
    linkedPathRows.cut > 0 || acceptPathRows.cut > 0 ? "the file it points to is too long to show whole" : "",
  ].filter((reason) => reason !== "");
  let cutNote = canShowDiff && filtered.length > 0 ? `+${filtered.join("; ")} \u2014 ${wording.enlarge}` : "";
  let canAccept = canShowDiff && filtered.length === 0;
  let fileHeader = fileHeaderLine(change);
  async function onAction(action) {
    if (submittingRef.current || refuseInput()) return;
    submittingRef.current = true;
    if (action === "later") {
      if (changes.length === 1) onDone(wording.later(fileHeader));
      else {
        submittingRef.current = false;
        setSelectedChange(undefined);
      }
      return;
    }
    setIsSubmitting(true);
    let ageMs = Date.now() - Date.parse(change.stagedAt);
    try {
      if (action === "discard") {
        let discarded = await discardSettingsProposal(change.id, deps);
        logEvent("tengu_settings_change_reviewed", {
          action: fromEnum(discarded ? "discard" : "discard_gone"),
          origin: fromEnum(change.by.origin),
          age_ms: ageMs,
        });
        if (discarded) {
          logFeatureOk("settings_quarantine");
          onDone(`Discarded the staged change. The file was not touched. ${fileHeader}`);
        } else {
          logFeatureSad("settings_quarantine", "discard_gone");
          onDone(
            `The staged proposal changed while you were reviewing it, so nothing was discarded. Run /settings-review again to see the current one. ${fileHeader}`,
          );
        }
        return;
      }
      if (!canAccept) return;
      let outcome = await acceptSettingsProposal(change, deps);
      logEvent("tengu_settings_change_reviewed", {
        action: fromEnum(outcome === "applied" ? "accept" : outcome),
        origin: fromEnum(change.by.origin),
        age_ms: ageMs,
      });
      if (outcome === "applied") logFeatureOk("settings_quarantine");
      else logFeatureSad("settings_quarantine", `accept_${outcome}`);
      onDone(`${wording.outcome(outcome)} ${fileHeader}`);
    } catch (error) {
      logFeatureBad("settings_quarantine", "review_action_failed");
      onDone(
        wording.failed(
          action,
          wrapRowsWithCap(sanitizeOneLine(errorMessage(error)).replace(QUOTE_CHARS_RE, "'"), 120, 1)
            .rows[0] ?? "",
          fileHeader,
        ),
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }
  return jsxProd_default(Pane, {
    color: "permission",
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(IndentedRows, {
              first: wording.header,
              rows: headerRows.rows,
              bold: true,
            }),
            isUnresolvedPath &&
              jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Text, {
                    children: LINKED_PATH_NOTE,
                  }),
                  jsxProd_default(IndentedRows, {
                    first: "  ",
                    rows: linkedPathRows.rows,
                  }),
                ],
              }),
            jsxProd_default(Text, {
              dimColor: true,
              children: byline,
            }),
          ],
        }),
        mapped.length > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              mapped.map((rows, index) =>
                jsxProd_default(
                  IndentedRows,
                  {
                    first: "\xB7 ",
                    rows,
                  },
                  index,
                ),
              ),
              moreKeysNote !== "" &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: moreKeysNote,
                }),
            ],
          }),
        nonAsciiNote !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: nonAsciiNote,
          }),
        canShowDiff
          ? jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                shown.map((hunk, index) =>
                  jsxProd_default_2(
                    Box,
                    {
                      flexDirection: "column",
                      children: [
                        index > 0 &&
                          jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [GUTTER_BAR, " ..."],
                          }),
                        hunk.map((line, index) =>
                          jsxProd_default(
                            DiffLineRows,
                            {
                              marker: line.marker,
                              rows: line.rows,
                            },
                            index,
                          ),
                        ),
                      ],
                    },
                    index,
                  ),
                ),
                cutNote !== "" &&
                  jsxProd_default(Text, {
                    color: "warning",
                    children: cutNote,
                  }),
              ],
            })
          : jsxProd_default(Text, {
              color: "warning",
              children: problemText,
            }),
        canAccept &&
          acceptAsciiNote !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: acceptAsciiNote,
          }),
        canAccept &&
          isUnresolvedPath &&
          jsxProd_default(IndentedRows, {
            first: ACCEPT_WRITES_PREFIX,
            rows: acceptPathRows.rows,
            color: "warning",
          }),
        jsxProd_default(
          ModelSelector,
          {
            isDisabled: isSubmitting,
            hideIndexes: true,
            refuseInput,
            options: [
              ...(canAccept
                ? [
                    {
                      label: wording.acceptLabel,
                      value: "accept",
                    },
                  ]
                : []),
              ...(wording.discardLabel !== undefined
                ? [
                    {
                      label: wording.discardLabel,
                      value: "discard",
                    },
                  ]
                : []),
              {
                label: "Decide later",
                value: "later",
              },
            ],
            defaultFocusValue: "later",
            onChange: (value) => {
              onAction(value).catch(logError);
            },
            onCancel: () => {
              onAction("later").catch(logError);
            },
          },
          settle.remountKey,
        ),
        jsxProd_default(AgentNavigationFooter, {
          exitActive: false,
          children: exitKeybindings.pending
            ? `Press ${exitKeybindings.keyName} again to close`
            : jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "choose",
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "decide later",
                  }),
                ],
              }),
        }),
      ],
    }),
  });
}
//@ chunk-kh7eenke.js:29457-29480 placement (2.1.88 match: COPY_DIR, 1)
var COPY_DIR = `claude ${APPLY_PROJECT_SETTINGS}`;
//@ chunk-kh7eenke.js:29480-29512 placement
function normalizePathForDisplay(path) {
  return stripControlChars(tildify(path));
}
//@ chunk-kh7eenke.js:29512-29589 placement
var STAGED_SOURCES = ["project", "local", "legacy"];
var TARGET_PATH_BY_SCOPE = {
  own: USER_SETTINGS_FILE_NAMES.default,
  own_cowork: USER_SETTINGS_FILE_NAMES.cowork,
};
//@ chunk-kh7eenke.js:29589-29639 placement
function isOwnScope(slot) {
  return slot === "own" || slot === "own_cowork";
}
//@ chunk-kh7eenke.js:29639-29787 placement
function isUnsafeSettingsPath(path) {
  let probe = (path, checkHardLinks) => {
    try {
      let stats = lstatSync(path);
      return stats.isSymbolicLink() || (checkHardLinks && stats.isFile() && stats.nlink > 1);
    } catch (error) {
      return !isENOENT(error);
    }
  };
  return probe(dirname(path), false) || probe(path, true);
}
//@ chunk-kh7eenke.js:29787-29875 placement
function allStagedFiles(paths) {
  return [paths.project, paths.local, paths.legacy].flatMap((path) =>
    path === null ? [] : [dirname(dirname(path))],
  );
}
//@ chunk-kh7eenke.js:29875-30479 placement
function checkSettingsPathFollowable(path, roots) {
  let resolvePair = (path) => {
    try {
      return [resolve(path), realpathSync(path)];
    } catch {
      return [resolve(path)];
    }
  };
  let flattened = roots.flatMap(resolvePair);
  let checkPath = (path) => flattened.some((root) => isSameOrUnderPath(path, root));
  let isSamePath = (path, other) => isSameOrUnderPath(path, other) && isSameOrUnderPath(other, path);
  if (!isSamePath(resolve(path), resolve(homedir(), ".claude")) && resolvePair(path).some(checkPath))
    return true;
  let realPath = resolveRealPath(path);
  if (realPath === "absent") return false;
  if (realPath === "unfollowable") return true;
  let realPath_2 = resolveRealPath(homedir());
  if (
    !(typeof realPath_2 === "object" && isSamePath(realPath.path, join(realPath_2.path, ".claude"))) &&
    checkPath(realPath.path)
  )
    return true;
  for (let fileName of Object.values(USER_SETTINGS_FILE_NAMES)) {
    let filePath = join(path, fileName);
    try {
      let stats = lstatSync(filePath);
      if (stats.isFile() && stats.nlink > 1) return true;
    } catch (error) {
      if (isENOENT(error)) continue;
      return true;
    }
    let realPath_2 = resolveRealPath(filePath);
    if (realPath_2 === "absent") continue;
    if (
      realPath_2 === "unfollowable" ||
      (!isSamePath(realPath_2.path, join(realPath.path, fileName)) && checkPath(realPath_2.path))
    )
      return true;
  }
  return false;
}
//@ chunk-kh7eenke.js:30479-30634 placement
function resolveRealPath(path) {
  try {
    return {
      path: realpathSync(path),
    };
  } catch (error) {
    if (!isENOENT(error)) return "unfollowable";
  }
  try {
    lstatSync(path);
    return "unfollowable";
  } catch (error) {
    return isENOENT(error) ? "absent" : "unfollowable";
  }
}
//@ chunk-kh7eenke.js:30634-31291 placement
function describeNeedsTerminal(env) {
  if (!env.stdinIsTTY || !env.stdoutIsTTY)
    return `${COPY_DIR} shows you changes and waits for your answer, so it needs a terminal. Run it yourself in a terminal in the project folder.`;
  if (
    !env.verbFirst ||
    env.settingsGivenOnCommandLine ||
    env.allowedSources.some((allowedSource) => REPO_DIR_SETTING_SOURCES.has(allowedSource))
  )
    return `Run it as "${COPY_DIR}", with nothing between "claude" and "${APPLY_PROJECT_SETTINGS}": it has to start with this folder's own settings files switched off.`;
  if (env.configHomeRedirectedIntoFolder)
    return "Run it with CLAUDE_CONFIG_DIR set outside this folder: it points into the folder, so the settings this process itself reads are this folder's own files, and it has to start with those switched off.";
  return;
}
//@ chunk-kh7eenke.js:31291-32146 placement
function readServedSettingsRecord(folderApi, record, now, isUnsafePath = isUnsafeSettingsPath) {
  let changes = [];
  let conflicts = [];
  let notes = [];
  let basePath = folderApi.folder(record.key);
  for (let slot of STAGED_SOURCES) {
    let slotRecord = record[slot];
    if (slotRecord === null) continue;
    if (record.linkedAway.includes(slot) || isUnsafePath(slotRecord)) {
      notes.push(slotRecord);
      continue;
    }
    let snapshot = now(slotRecord);
    if (isUnsafePath(slotRecord)) {
      notes.push(slotRecord);
      continue;
    }
    if (snapshot === "unreadable") {
      conflicts.push(slotRecord);
      continue;
    }
    let text = snapshot === "absent" ? null : stripBomAndCarriageReturns(snapshot.text);
    let baseRecord = typeof basePath === "object" ? basePath[slot] : slotRecord;
    let acceptedFile =
      basePath === "unreadable" ? "unreadable" : baseRecord === null ? "none" : folderApi.file(baseRecord);
    if (acceptedFile === "unreadable") {
      changes.push({
        slot,
        path: slotRecord,
        accepted: null,
        live: text,
        note: "record_unreadable",
      });
      continue;
    }
    if (acceptedFile === "none") {
      if (typeof basePath === "object" && text !== null)
        changes.push({
          slot,
          path: slotRecord,
          accepted: null,
          live: text,
          note: "new_here",
        });
      continue;
    }
    if (hashOrNull(text) === acceptedFile.sha256) continue;
    changes.push(
      baseRecord !== null && baseRecord !== slotRecord
        ? {
            slot,
            path: slotRecord,
            accepted: acceptedFile.text,
            live: text,
            note: "moved",
            movedFrom: baseRecord,
          }
        : {
            slot,
            path: slotRecord,
            accepted: acceptedFile.text,
            live: text,
            note: "changed",
          },
    );
  }
  let isLinked = (path) => basePath !== "none" || folderApi.file(path) !== "none";
  return {
    files: changes,
    unreadable: conflicts.filter(isLinked),
    linked: notes.filter(isLinked),
  };
}
//@ chunk-kh7eenke.js:32146-32315 placement
function readSettingsSnapshot(path, probePath) {
  let probeResult = probePath(path);
  if (probeResult === "unreadable") return "unreadable";
  if (probeResult === "absent") return null;
  let { settings } = parseSettingsContent(stripBomAndCarriageReturns(probeResult.text), path);
  return settings === null ? "unreadable" : settingsToJsonText(servedRestrictionSnapshot(settings));
}
//@ chunk-kh7eenke.js:32315-32449 placement
function getServedSettingsSlots(settingsFilePathForSource) {
  if (settingsFilePathForSource === undefined) return [];
  let baseDir = dirname(settingsFilePathForSource);
  return [
    {
      slot: "own",
      path: join(baseDir, TARGET_PATH_BY_SCOPE.own),
    },
    {
      slot: "own_cowork",
      path: join(baseDir, TARGET_PATH_BY_SCOPE.own_cowork),
    },
  ];
}
//@ chunk-kh7eenke.js:32449-32870 placement
function describeRecordState(records, { slot, path }, probePath) {
  let readState = records.file(path);
  if (readState === "none") return;
  let settingsSnapshot = readSettingsSnapshot(path, probePath);
  if (settingsSnapshot === "unreadable") return "unreadable";
  let settings =
    readState === "unreadable" || readState.text === null
      ? null
      : parseSettingsContent(readState.text, path).settings;
  if (readState === "unreadable" || (readState.text !== null && settings === null))
    return {
      slot,
      path,
      accepted: null,
      live: settingsSnapshot,
      note: "record_unreadable",
    };
  let accepted = settings === null ? null : settingsToJsonText(servedRestrictionSnapshot(settings));
  let emptyText = settingsToJsonText({});
  return (accepted ?? emptyText) === (settingsSnapshot ?? emptyText)
    ? undefined
    : {
        slot,
        path,
        accepted,
        live: settingsSnapshot,
        note: "changed",
      };
}
//@ chunk-kh7eenke.js:32870-33174 placement
/**
 * 把云会话使用的设置冻结槽（当前与已接受内容）转换为待审阅的变更记录。
 */
function servedSlotsToChanges(files, now) {
  return files.map((file) => {
    let live = file.live ?? "";
    return {
      change: {
        id: file.slot,
        path: file.path,
        resolvedPath: file.path,
        baseSha256: hashOrNull(file.accepted),
        proposedSha256: hashOrNull(live) ?? "",
        proposedContent: live,
        stagedAt: now.toISOString(),
        by: {
          tool: "Write",
          origin: "local",
          sessionId: "",
        },
      },
      current: file.accepted,
      readError: null,
      applicable: true,
    };
  });
}
//@ chunk-kh7eenke.js:33304-34888 placement
/**
 * 比较当前设置与已接受的冻结版本，给出可接受/冲突/过期状态。
 */
function compareServedSettings(snapshot) {
  let filesByPath = new Map(snapshot.files.map((file) => [file.path, file]));
  let allChanges = servedSlotsToChanges(snapshot.files, snapshot.now());
  let entries = allChanges.map(({ change }) => change);
  let appliedCount = 0;
  let resolveSlot = (slotInfo) => {
    if (isOwnScope(slotInfo.slot)) {
      let ownRecord = describeRecordState(
        snapshot.store,
        {
          slot: slotInfo.slot,
          path: slotInfo.path,
        },
        snapshot.readLive,
      );
      return ownRecord === undefined || ownRecord === "unreadable" ? slotInfo.live : ownRecord.accepted;
    }
    let found = readServedSettingsRecord(snapshot.store, snapshot.slots, snapshot.readLive).files.find(
      (file) => file.slot === slotInfo.slot,
    );
    return found === undefined ? slotInfo.live : found.accepted;
  };
  return {
    accepted: () => appliedCount,
    reviewed: allChanges,
    readStore: async () =>
      jsonStringify({
        version: REVIEW_STORE_VERSION,
        entries,
      }),
    writeStore: async () => {},
    deleteStore: async () => {},
    readTarget: async (path) => {
      let fileRecord = filesByPath.get(path);
      return fileRecord === undefined ? null : resolveSlot(fileRecord);
    },
    locate: async (path) => path,
    isSettingsFile: async (path) => filesByPath.has(path),
    configChangeBlocked: async (path, options, extra) => {
      let fileRecord = filesByPath.get(path);
      return fileRecord === undefined || snapshot.gate === undefined
        ? true
        : snapshot.gate(CONFIG_CHANGE_SOURCES_2[fileRecord.slot], extra);
    },
    afterApplied: () => {},
    now: snapshot.now,
    writeTarget: async ({ path, content, blockedOnceWritten }) => {
      let fileRecord = filesByPath.get(path);
      if (fileRecord === undefined || content !== (fileRecord.live ?? "")) return "changed";
      let copyCheck = await checkSettingsCopy(
        {
          name: basename(path),
          text: content,
          ...(snapshot.shownDir !== undefined && {
            dir: snapshot.shownDir,
          }),
        },
        blockedOnceWritten,
      );
      if (copyCheck !== "allowed") return copyCheck;
      if (resolveSlot(fileRecord) !== fileRecord.accepted) return "changed";
      if (isOwnScope(fileRecord.slot)) {
        if (readSettingsSnapshot(path, snapshot.readLive) !== fileRecord.live) return "changed";
        snapshot.store.recordFile(path, fileRecord.live, "person");
        appliedCount++;
        return "written";
      }
      if (isUnsafeSettingsPath(path)) return "redirected";
      let live = snapshot.readLive(path);
      if (
        live === "unreadable" ||
        hashOrNull(live === "absent" ? null : stripBomAndCarriageReturns(live.text)) !==
          hashOrNull(fileRecord.live)
      )
        return "changed";
      if (isUnsafeSettingsPath(path)) return "redirected";
      snapshot.store.recordFile(path, fileRecord.live, "person");
      let folderRecord = snapshot.store.folder(snapshot.slots.key);
      if (folderRecord === "unreadable")
        snapshot.store.recordFolder(snapshot.slots.key, {
          project: snapshot.slots.project,
          local: snapshot.slots.local,
          legacy: snapshot.slots.legacy,
        });
      else if (folderRecord !== "none" && folderRecord[fileRecord.slot] !== path)
        snapshot.store.recordFolder(snapshot.slots.key, {
          ...folderRecord,
          [fileRecord.slot]: path,
        });
      appliedCount++;
      return "written";
    },
  };
}
//@ chunk-kh7eenke.js:34888-35816 placement
function describeAcceptOutcome(outcome) {
  switch (outcome) {
    case "applied":
      return "Accepted. Cloud sessions use this version from the next time this computer starts serving one. A session that is using this computer now keeps the version it started with.";
    case "conflict":
    case "stale":
    case "gone":
      return `The file, or what you last accepted, changed while you were looking, so nothing was accepted. Run ${COPY_DIR} again to see it as it is now.`;
    case "redirected":
    case "hard_linked":
      return "The path no longer leads to the file it did when this was shown, so nothing was accepted.";
    case "not_writable":
      return "This computer's record of what you accept could not be written, so nothing was accepted.";
    case "tampered":
      return "The copy shown to your ConfigChange hooks changed while they ran, so nothing was accepted.";
    case "blocked":
      return "A ConfigChange hook blocked this change (hooks are shown a copy of the new content), so nothing was accepted. The file itself was not touched.";
  }
}
//@ chunk-kh7eenke.js:35816-38346 placement
/**
 * 渲染云会话设置冻结版本的各槽（未变、已变、个人设置文件消失等）。
 */
function renderServedSettingsSlots(slots) {
  let bySlot = new Map(slots.map((slot) => [slot.slot, slot]));
  let renderSlot = (slotInfo) => {
    let record = bySlot.get(slotInfo.id);
    if (record !== undefined && isOwnScope(record.slot) && record.note === "changed")
      return record.live === null
        ? "Your own settings file is gone; cloud sessions keep using what you accepted"
        : "Your own settings, the part kept for cloud sessions: not what you accepted, which cloud sessions keep using";
    switch (record?.note) {
      case "new_here":
        return "Cloud sessions have used this folder before, and never with a file at this path, so nothing in it counts until you accept it";
      case "moved":
        return "This folder's settings file used to be somewhere else; what you accepted there still counts until you accept this one";
      case "record_unreadable":
        return "This computer's record of what you accepted could not be read, so the whole file is shown as new and none of it counts until you accept it";
      case "changed":
      case undefined:
        return record?.live === null
          ? "The file is gone; cloud sessions keep using the version you accepted"
          : record?.accepted === null
            ? "There was no file here when you last accepted, so nothing in it counts until you accept it"
            : "Different from the version you accepted; cloud sessions keep using that one";
    }
  };
  let any = slots.some((slot) => isOwnScope(slot.slot));
  return {
    header: "Not accepted for cloud sessions yet: ",
    listTitle: (count) =>
      `${count} ${any ? "" : "project "}settings ${count === 1 ? "file is" : "files are"} not what you accepted for cloud sessions`,
    listIntro: any
      ? "Cloud sessions that use this computer keep the version of each file that you last accepted. A cloud session runs commands here, so look at each change before you accept it. Nothing changes until you do."
      : "Cloud sessions that use this computer keep the version of each file that you last accepted. A cloud session can write to this folder, so look at each change before you accept it. Nothing changes until you do.",
    listMore: (count) => `+${count} more not listed; review these first`,
    listNote: renderSlot,
    byline: renderSlot,
    acceptLabel: "Accept this version for cloud sessions",
    discardLabel: undefined,
    enlarge: `Enlarge the terminal (or reduce the font size) and run ${COPY_DIR} again to see the whole change before accepting.`,
    underReview: "file",
    unreadable: (readError) =>
      `What you last accepted could not be read (${readError}), so this cannot be accepted here.`,
    notApplicable: `What you last accepted changed since this was shown. Run ${COPY_DIR} again.`,
    diffUnavailable:
      "The difference could not be computed, so this cannot be accepted here. Compare the file with what you expect yourself.",
    later: (nextStep) => `Left as it is. Cloud sessions keep the version you accepted before. ${nextStep}`,
    outcome: describeAcceptOutcome,
    failed: (action, errorMessage, hint) =>
      `Could not accept, so nothing was accepted: "${errorMessage}" ${hint}`,
  };
}
//@ chunk-kh7eenke.js:38346-38529 placement
async function renderStagedSettingsReview(renderer, session, onAppStateChange, changes, onDone) {
  return new Promise((resolve) => {
    renderer.render(
      jsxProd_default(AppRoot, {
        session,
        onChangeAppState: (appState) => onChangeAppState(appState, session),
        children: jsxProd_default(
          StagedSettingsReview,
          {
            changes: changes.reviewed,
            deps: changes,
            wording: renderServedSettingsSlots(onAppStateChange),
            onDone: resolve,
          },
          onDone,
        ),
      }),
    );
  });
}
//@ chunk-kh7eenke.js:38529-40280 placement
/**
 * claude 子命令：审阅并接受云会话使用的设置版本（remote_served_settings_freeze）。
 */
async function reviewServedSettingsFreeze(renderer, session, changes) {
  let fileSlots = repoTierFileSlots();
  let needsTerminal = describeNeedsTerminal({
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    verbFirst: isApplyProjectSettingsCommand(),
    settingsGivenOnCommandLine: getFlagSettingsPath() !== undefined || getFlagSettingsInline() !== null,
    allowedSources: getAllowedSettingSourcesAsConfigured(),
    configHomeRedirectedIntoFolder: checkSettingsPathFollowable(getClaudeConfigDir(), [
      getCwd(),
      ...allStagedFiles(fileSlots),
    ]),
  });
  if (needsTerminal !== undefined) {
    printCliError(needsTerminal);
    await logFeatureBadAsync("remote_served_settings_freeze", "accept_refused");
    await exitAfterAnalyticsFlush(1);
    return;
  }
  let acceptedSettingsStore = createAcceptedSettingsStore();
  let gate = configChangeBlocker(renderer, session, changes);
  let root;
  let acceptedCount = 0;
  let messages = [];
  let servedSettingsSlots = getServedSettingsSlots(getSettingsFilePathForSource("userSettings"));
  for (let idx = 0; ; idx++) {
    let servedSettingsRecord = readServedSettingsRecord(
      acceptedSettingsStore,
      fileSlots,
      readRepoTierFileText,
    );
    let mapped = servedSettingsSlots.map((servedSettingsSlot) => ({
      path: servedSettingsSlot.path,
      waiting: describeRecordState(acceptedSettingsStore, servedSettingsSlot, readRepoTierFileText),
    }));
    let flattened = mapped.flatMap((entry) => (entry.waiting === "unreadable" ? [entry.path] : []));
    let waitingFiles = [
      ...mapped.flatMap((entry) =>
        entry.waiting === undefined || entry.waiting === "unreadable" ? [] : [entry.waiting],
      ),
      ...servedSettingsRecord.files,
    ];
    if (idx === 0) {
      for (let path of [...flattened, ...servedSettingsRecord.unreadable])
        messages.push(
          `${normalizePathForDisplay(path)} could not be read, so it cannot be shown or accepted. Cloud sessions keep using what you accepted before.`,
        );
      for (let path of servedSettingsRecord.linked)
        messages.push(
          `${normalizePathForDisplay(path)} cannot be taken as this folder's own file: it is a link to another file, has a second name (a hard link), sits in a .claude folder that is a link, or could not be examined. So it cannot be accepted here, and cloud sessions keep using what you accepted before. A plain file with no other name, in a plain .claude folder you can read, changes that.`,
        );
    }
    if (waitingFiles.length === 0) {
      if (
        acceptedCount === 0 &&
        flattened.length === 0 &&
        servedSettingsRecord.unreadable.length === 0 &&
        servedSettingsRecord.linked.length === 0
      )
        messages.push(
          "Nothing is waiting. Cloud sessions already use your settings and this folder's on this computer.",
        );
      break;
    }
    let compared = compareServedSettings({
      store: acceptedSettingsStore,
      slots: fileSlots,
      files: waitingFiles,
      readLive: readRepoTierFileText,
      gate,
      now: () => new Date(),
    });
    root ??= await createRoot(getBaseRenderOptions(false));
    let renderResult = await renderStagedSettingsReview(root, renderer, waitingFiles, compared, idx);
    if (renderResult !== undefined) messages.push(renderResult);
    if (compared.accepted() === 0) break;
    acceptedCount += compared.accepted();
  }
  root?.unmount();
  process.stdout.write(`${messages.join(`
`)}
`);
  await logFeatureOkAsync("remote_served_settings_freeze", {
    op: lit("accept_command"),
    accepted: acceptedCount,
  });
  await exitAfterAnalyticsFlush(0);
}
export { reviewServedSettingsFreeze };
