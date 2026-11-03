/**
 * components/settings/stagedSettingsReview.tsx
 *
 * 2.1.316 新增：审阅"暂存的设置变更"与云会话使用的设置冻结版本（逐条接受、冲突/过期/被替换检测）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-61a1pjwa.js (50)
 * attribution: placement 49, layout 1
 */
import { lstatSync, realpathSync } from "fs";
import { dirname, resolve, join, basename } from "path";
import { homedir } from "os";
import { init_react_production, y, R, Q } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { PANE_PADDING_X, PANE_PADDING, Pane } from "../design-system/Pane.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
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
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getCwd } from "../../utils/cwd.js";
import { printCliError, exitAfterAnalyticsFlush } from "../../cli/exit.js";
import { configChangeBlocker } from "../../utils/model/providerAttribution.js";
import { createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";

//@ chunk-61a1pjwa.js:16139-16143 placement
init_react_production();
//@ chunk-61a1pjwa.js:16143-16431 placement
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
//@ chunk-61a1pjwa.js:16431-16534 placement
var UNSAFE_DISPLAY_CHARS_RE =
  /[\x00-\x08\x0a-\x1f\x7f-\x9f\u2028\u2029\u2800\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-61a1pjwa.js:16534-16600 placement
function escapeControlChars(t, o) {
  return t.replace(UNSAFE_DISPLAY_CHARS_RE, "\uFFFD").replaceAll("\t", o);
}
//@ chunk-61a1pjwa.js:16600-16636 placement
function sanitizeEscaped(t, o) {
  return markBrokenSequences(escapeControlChars(t, o));
}
//@ chunk-61a1pjwa.js:16636-16694 placement
function isInvisibleOnly(t) {
  return /[\p{Mn}\p{Me}]/u.test(t) && bunStringWidth(t) === 0;
}
//@ chunk-61a1pjwa.js:16694-16722 placement
function isVisibleLine(t) {
  return !isInvisibleOnly(t);
}
//@ chunk-61a1pjwa.js:16722-16759 placement
function isNumericLine(t) {
  return isCombiningOrZeroWidth(t) && !isInvisibleOnly(t);
}
//@ chunk-61a1pjwa.js:16759-16820 placement
function countMatching(t, o) {
  let h = 0;
  for (let u of t) if (o(u)) h++;
  return h;
}
//@ chunk-61a1pjwa.js:16820-16913 placement
function hasMoreContent(t, o) {
  return (
    countMatching(o, isVisibleLine) >= countMatching(t, isVisibleLine) &&
    countMatching(o, isNumericLine) === countMatching(t, isNumericLine) &&
    (!GRAPHEME_TRUNCATION_MARKER_RE.test(o) || GRAPHEME_TRUNCATION_MARKER_RE.test(t))
  );
}
//@ chunk-61a1pjwa.js:16913-16972 placement
function normalizeSpaces(t) {
  return sanitizeEscaped(tildify(t), "\uFFFD").replace(/ +/g, " ");
}
//@ chunk-61a1pjwa.js:16972-16986 placement = _temp18 (1)
var SPACE_CHAR = "    ";
//@ chunk-61a1pjwa.js:16986-17017 layout
function sanitizeWithSpaces(t) {
  return sanitizeEscaped(t, SPACE_CHAR);
}
//@ chunk-61a1pjwa.js:17017-17073 placement
function sanitizeOneLine(t) {
  return sanitizeEscaped(t, "\uFFFD").replace(/ +/g, " ");
}
//@ chunk-61a1pjwa.js:17073-17370 placement
/**
 * 按宽度把文本折成行，超过行数上限时截断最后一行并附 "… (+N chars)"，返回 {rows, cut}。
 */
function wrapRowsWithCap(t, o, h) {
  let u = wrapByWidth(t, Math.max(1, o));
  if (u.length <= h)
    return {
      rows: u,
      cut: 0,
    };
  let i = [...t].length;
  let sliced = u.slice(0, h);
  let p = ` \u2026 (+${i} chars)`.length + 1;
  let C = wrapByWidth(sliced[h - 1], Math.max(1, o - p))[0] ?? "";
  sliced[h - 1] = C;
  let k = i - sliced.reduce((acc, T) => acc + [...T].length, 0);
  sliced[h - 1] = `${C} \u2026 (+${k} chars)`;
  return {
    rows: sliced,
    cut: k,
  };
}
//@ chunk-61a1pjwa.js:17370-17431 placement
function textHeight(t, o) {
  return (
    countCharInString(
      wrapText(t, Math.max(1, o), "wrap"),
      `
`,
    ) + 1
  );
}
//@ chunk-61a1pjwa.js:17431-17516 placement
var NON_PRINTABLE_PATTERN = /[\x00-\x08\x0b-\x1f\x7f]|[^\x00-\x7f]/gu;
var NON_ASCII_OR_CONTROL_RE = /[\x00-\x1f\x7f]|[^\x00-\x7f]/gu;
//@ chunk-61a1pjwa.js:17516-17577 placement = getErrnoPath (1)
function getErrnoPath(t, o) {
  return t.match(o === "path" ? NON_ASCII_OR_CONTROL_RE : NON_PRINTABLE_PATTERN)?.length ?? 0;
}
//@ chunk-61a1pjwa.js:17577-17753 placement
function describeStagedBy(t) {
  let o = takeLastChars(sanitizeOneLine(t.by.sessionId), 8);
  return t.by.origin === "served"
    ? `by a cloud session (\u2026${o}) this computer served`
    : `by a session on this computer (\u2026${o})`;
}
//@ chunk-61a1pjwa.js:17753-17799 placement
function isPathResolved(change) {
  return change.resolvedPath === change.path;
}
//@ chunk-61a1pjwa.js:17799-17869 placement
var QUOTE_CHARS_RE = /["\u00ab\u00bb\u201c-\u201f\u2033\u2036\u301d-\u301f\uff02]/g;
//@ chunk-61a1pjwa.js:17869-18037 placement
function truncateStartToWidth(t, o) {
  let h = [...t];
  let u = 0;
  let i = h.length;
  while (i > 0) {
    let S = h[i - 1];
    let p = S.length === 1 && S < "\x80" ? 1 : 2;
    if (u + p > o) break;
    u += p;
    i--;
  }
  return i === 0 ? t : `\u2026${h.slice(i).join("")}`;
}
//@ chunk-61a1pjwa.js:18037-18104 placement
function fileHeaderLine(change) {
  return `File: "${truncateStartToWidth(normalizeSpaces(change.path).replace(QUOTE_CHARS_RE, "'"), 60)}"`;
}
//@ chunk-61a1pjwa.js:18104-19640 placement
/**
 * 应用暂存变更的结果说明（已写入、文件已变、提议已变、路径被重定向、硬链接、不可写、被篡改）。
 */
function describeApplyOutcome(t) {
  switch (t) {
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
//@ chunk-61a1pjwa.js:19640-21072 placement
var STAGED_CHANGE_WORDING = {
  header: STAGED_CHANGE_PREFIX,
  listTitle: (t) => `${t} settings ${t === 1 ? "change" : "changes"} staged for your review`,
  listIntro:
    "Claude changed these Claude Code settings files without you approving it here, so the changes were held instead of applied. Nothing takes effect until you accept it.",
  listMore: (t) => `+${t} more staged ${t === 1 ? "change" : "changes"} not listed; review these first`,
  listNote: (t, o) =>
    `${formatRelativeTimeAgo(new Date(t.stagedAt))} \xB7 ${describeStagedBy(t)}${o === "unreadable" ? " \xB7 file unreadable, cannot apply" : o === "changed" ? " \xB7 file changed since, cannot apply" : ""}`,
  byline: (t) =>
    `${t.by.tool} \xB7 ${formatRelativeTimeAgo(new Date(t.stagedAt))} \xB7 ${describeStagedBy(t)}`,
  acceptLabel: "Accept and apply this change",
  discardLabel: "Discard this change",
  enlarge: TERMINAL_TOO_SMALL_REVIEW_TEXT,
  underReview: "proposal",
  unreadable: (t) =>
    `This file could not be read (${t}), so the proposal cannot be applied here. Fix what keeps the file from being read, or discard it.`,
  notApplicable:
    "This file changed after this was staged (or the proposal no longer matches what was recorded), so it cannot be applied. Discard it, or ask Claude to make the change again.",
  diffUnavailable:
    "The diff for this proposal could not be computed, so it cannot be accepted here. Compare the file with what Claude proposed yourself, or discard it.",
  later: (t) => `Left the staged change for later \xB7 /settings-review. ${t}`,
  outcome: describeApplyOutcome,
  failed: (t, o, h) =>
    `Could not ${t} the staged change. Nothing was applied; it stays staged. Error: "${o}" ${h}`,
};
//@ chunk-61a1pjwa.js:21072-21437 placement
/**
 * 把 diff hunk 行按宽度折行并放进剩余行数预算，放不下或显示不安全时停止，返回 {shown, hiddenLines}。
 */
function fitDiffHunks(rawHunks, o, h) {
  let u = [];
  let i = o;
  let S = 0;
  let p = false;
  for (let C of rawHunks) {
    if (p) {
      S += C.lines.length;
      continue;
    }
    if (u.length > 0) i -= 1;
    let k = [];
    for (let line of C.lines) {
      if (p) {
        S++;
        continue;
      }
      let sliced = line.slice(1);
      let F = sanitizeWithSpaces(sliced);
      let x = wrapByWidth(F, h);
      if (x.length <= i && hasMoreContent(escapeControlChars(sliced, SPACE_CHAR), F)) {
        let D = line[0];
        k.push({
          marker: D === "+" || D === "-" ? D : " ",
          rows: x,
        });
        i -= x.length;
      } else {
        p = true;
        S++;
      }
    }
    if (k.length > 0) u.push(k);
  }
  return {
    shown: u,
    hiddenLines: S,
  };
}
//@ chunk-61a1pjwa.js:21437-21797 placement
/**
 * 计算暂存设置变更的 diff：hunk、无法显示 diff 的情况、变更摘要，以及路径/内容中被隐藏的码点数。
 */
function computeStagedChangeDiff({ change, current: o }) {
  let patchFromContents = getPatchFromContents({
    filePath: change.path,
    oldContent: o ?? "",
    newContent: change.proposedContent,
  });
  let u = describeSettingsChange(o, change.proposedContent);
  return {
    rawHunks: patchFromContents,
    diffUnavailable: patchFromContents.length === 0 && (o ?? "") !== change.proposedContent,
    rawSummary: u,
    hiddenCodepoints:
      getErrnoPath(change.path, "path") +
      (isPathResolved(change) ? 0 : getErrnoPath(change.resolvedPath, "path")) +
      getErrnoPath(change.proposedContent, "text") +
      u.reduce((acc, S) => acc + getErrnoPath(S, "path"), 0),
  };
}
//@ chunk-61a1pjwa.js:21797-22211 placement
/**
 * 按行渲染文本，首行带前缀、后续行用等宽空格缩进，可设置粗体与颜色。
 */
function IndentedRows(props) {
  let S = w(11);
  let { first, rows, bold, color } = props;
  let children;
  if (S[0] !== bold || S[1] !== color || S[2] !== first || S[3] !== rows) {
    let C;
    if (S[5] !== bold || S[6] !== color || S[7] !== first) {
      C = (k, v) =>
        jsxProd_default_2(
          Text,
          {
            bold,
            color,
            children: [v === 0 ? first : " ".repeat(first.length), k],
          },
          v,
        );
      S[5] = bold;
      S[6] = color;
      S[7] = first;
      S[8] = C;
    } else C = S[8];
    children = rows.map(C);
    S[0] = bold;
    S[1] = color;
    S[2] = first;
    S[3] = rows;
    S[4] = children;
  } else children = S[4];
  let C;
  if (S[9] !== children) {
    C = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    S[9] = children;
    S[10] = C;
  } else C = S[10];
  return C;
}
//@ chunk-61a1pjwa.js:22211-22232 placement
var GUTTER_BAR = "\u2502";
var REVIEW_EXTRA_INDENT = 4;
//@ chunk-61a1pjwa.js:22232-22665 placement
/**
 * 渲染待审设置的差异行：+/- 行加增删背景色，未变化行变暗，首行显示标记符号。
 */
function DiffLineRows(props) {
  let u = w(7);
  let { marker, rows } = props;
  let children;
  if (u[0] !== marker || u[1] !== rows) {
    let S;
    if (u[3] !== marker) {
      S = (p, C) =>
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
                children: [C === 0 ? marker : " ", " ", p],
              }),
            ],
          },
          C,
        );
      u[3] = marker;
      u[4] = S;
    } else S = u[4];
    children = rows.map(S);
    u[0] = marker;
    u[1] = rows;
    u[2] = children;
  } else children = u[2];
  let S;
  if (u[5] !== children) {
    S = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    u[5] = children;
    u[6] = S;
  } else S = u[6];
  return S;
}
//@ chunk-61a1pjwa.js:22665-28222 placement
/**
 * 逐条显示暂存的设置变更（diff）并等待接受/拒绝。
 */
function StagedSettingsReview({ changes, deps, onDone, wording = STAGED_CHANGE_WORDING }) {
  let { columns, rows } = useScrollViewportSize(useTerminalSize());
  let hasScrollViewport = useHasScrollViewport();
  let max = Math.max(8, columns - 2 * (hasScrollViewport ? PANE_PADDING_X : PANE_PADDING));
  let [k, v] = y(changes.length === 1 ? changes[0] : undefined);
  let [T, F] = y(false);
  let x = R(false);
  let inputClock = useInputClock();
  let W = R(Date.now());
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let I = settleKey(`${k?.change.id ?? ""}:${epoch}`, RECENT_INPUT_GUARD_MS);
  function We() {
    if (
      isWithinRecentInput(inputClock, W.current, RECENT_INPUT_GUARD_MS) ||
      refusedWithin(RECENT_INPUT_GUARD_MS)
    ) {
      noteRefused();
      return true;
    }
    return false;
  }
  let oe = useGlobalExitKeybindings(() => onDone());
  useKeybinding("confirm:no", () => onDone(), {
    context: "Confirmation",
    isActive: k === undefined,
  });
  let Me = Q(() => (k === undefined ? undefined : computeStagedChangeDiff(k)), [k]);
  if (k === undefined || Me === undefined) {
    let sliced = changes.slice(0, DIFF_CONTEXT_LINES);
    let P = changes.length - sliced.length;
    let E = max - 4;
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
            onSelect: (N) => {
              let le = sliced[N];
              if (le === undefined) {
                onDone();
                return;
              }
              W.current = Date.now();
              v(le);
            },
            children: [
              sliced.map(({ change, applicable, readError }) =>
                jsxProd_default(
                  OrderedListWithItem.Item,
                  {
                    label: wrapRowsWithCap(normalizeSpaces(change.path), E, 1).rows[0] ?? "",
                    description: wrapRowsWithCap(
                      `${wording.listNote(change, readError !== null ? "unreadable" : applicable ? undefined : "changed")}${isPathResolved(change) ? "" : ` \xB7 writes \u2192 ${normalizeSpaces(change.resolvedPath)}`}`,
                      E,
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
          P > 0 &&
            jsxProd_default(Text, {
              dimColor: true,
              children: wording.listMore(P),
            }),
          jsxProd_default(AgentNavigationFooter, {
            exitActive: false,
            children: oe.pending
              ? `Press ${oe.keyName} again to close`
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
  let { change, readError, applicable } = k;
  let { rawHunks, diffUnavailable, rawSummary, hiddenCodepoints } = Me;
  let G = !isPathResolved(change);
  let ye = wrapRowsWithCap(normalizeSpaces(change.path), max - wording.header.length, REVIEW_INDENT);
  let be = G ? normalizeSpaces(change.resolvedPath) : "";
  let wt =
    hasMoreContent(
      escapeControlChars(tildify(change.path), "\uFFFD").replace(/ +/g, " "),
      normalizeSpaces(change.path),
    ) &&
    (!G ||
      hasMoreContent(escapeControlChars(tildify(change.resolvedPath), "\uFFFD").replace(/ +/g, " "), be));
  let Se = G
    ? wrapRowsWithCap(be, max - 2, REVIEW_INDENT)
    : {
        rows: [],
        cut: 0,
      };
  let ve = G
    ? wrapRowsWithCap(be, max - ACCEPT_WRITES_PREFIX.length, REVIEW_INDENT)
    : {
        rows: [],
        cut: 0,
      };
  let mapped = rawSummary
    .slice(0, REVIEW_MAX_ROWS)
    .map((A) => wrapRowsWithCap(sanitizeOneLine(A), max - 2, REVIEW_HEADER_ROWS).rows);
  let Ce = rawSummary.length - mapped.length;
  let je = wording.byline(change);
  let ke =
    Ce > 0 ? `+${Ce} more top-level ${plural(Ce, "key")} changed, not listed; the diff below has them` : "";
  let Re =
    hiddenCodepoints > 0
      ? `${hiddenCodepoints} ${plural(hiddenCodepoints, "character")} in this ${wording.underReview} ${plural(hiddenCodepoints, "is", "are")} not plain ASCII (such characters may not display as written, or may look like others; controls show here as \uFFFD). Compare the file yourself before accepting; what you accept is the ${wording.underReview} as written.`
      : "";
  let Ue =
    readError !== null
      ? wording.unreadable(wrapRowsWithCap(sanitizeOneLine(readError), 48, 1).rows[0] ?? "")
      : !applicable
        ? wording.notApplicable
        : diffUnavailable
          ? wording.diffUnavailable
          : "";
  let V = Ue === "";
  let _e =
    V && hiddenCodepoints > 0
      ? `Accepting applies ${hiddenCodepoints} ${plural(hiddenCodepoints, "character")} that ${plural(hiddenCodepoints, "is", "are")} not plain ASCII`
      : "";
  let B = (A) => (A === "" ? 0 : textHeight(A, max));
  let U = (A) => (A > 0 ? A + 1 : 0);
  let yt =
    REVIEW_BLOCK_ROWS +
    (hasScrollViewport ? 0 : 2) +
    U(ye.rows.length + (G ? B(LINKED_PATH_NOTE) + Se.rows.length : 0) + B(je)) +
    U(mapped.reduce((acc, P) => acc + P.length, 0) + B(ke)) +
    U(B(Re)) +
    U(B(_e)) +
    U(ve.rows.length) +
    B(
      `+${rawHunks.reduce((acc, rawHunk) => acc + rawHunk.lines.length, 0)} more changed lines are not shown; the path is too long to show whole; the file it points to is too long to show whole \u2014 ${wording.enlarge}`,
    ) +
    U(3);
  let { shown, hiddenLines } = V
    ? fitDiffHunks(rawHunks, Math.max(0, rows - yt), max - REVIEW_EXTRA_INDENT)
    : {
        shown: [],
        hiddenLines: 0,
      };
  let filtered = [
    hiddenLines > 0
      ? `${hiddenLines} more changed ${plural(hiddenLines, "line")} ${plural(hiddenLines, "is", "are")} not shown`
      : "",
    ye.cut > 0 || !wt ? "the path is too long to show whole" : "",
    Se.cut > 0 || ve.cut > 0 ? "the file it points to is too long to show whole" : "",
  ].filter((A) => A !== "");
  let Ye = V && filtered.length > 0 ? `+${filtered.join("; ")} \u2014 ${wording.enlarge}` : "";
  let ae = V && filtered.length === 0;
  let J = fileHeaderLine(change);
  async function Ke(A) {
    if (x.current || We()) return;
    x.current = true;
    if (A === "later") {
      if (changes.length === 1) onDone(wording.later(J));
      else {
        x.current = false;
        v(undefined);
      }
      return;
    }
    F(true);
    let ageMs = Date.now() - Date.parse(change.stagedAt);
    try {
      if (A === "discard") {
        let N = await discardSettingsProposal(change.id, deps);
        logEvent("tengu_settings_change_reviewed", {
          action: fromEnum(N ? "discard" : "discard_gone"),
          origin: fromEnum(change.by.origin),
          age_ms: ageMs,
        });
        if (N) {
          logFeatureOk("settings_quarantine");
          onDone(`Discarded the staged change. The file was not touched. ${J}`);
        } else {
          logFeatureSad("settings_quarantine", "discard_gone");
          onDone(
            `The staged proposal changed while you were reviewing it, so nothing was discarded. Run /settings-review again to see the current one. ${J}`,
          );
        }
        return;
      }
      if (!ae) return;
      let E = await acceptSettingsProposal(change, deps);
      logEvent("tengu_settings_change_reviewed", {
        action: fromEnum(E === "applied" ? "accept" : E),
        origin: fromEnum(change.by.origin),
        age_ms: ageMs,
      });
      if (E === "applied") logFeatureOk("settings_quarantine");
      else logFeatureSad("settings_quarantine", `accept_${E}`);
      onDone(`${wording.outcome(E)} ${J}`);
    } catch (error) {
      logFeatureBad("settings_quarantine", "review_action_failed");
      onDone(
        wording.failed(
          A,
          wrapRowsWithCap(sanitizeOneLine(errorMessage(error)).replace(QUOTE_CHARS_RE, "'"), 120, 1)
            .rows[0] ?? "",
          J,
        ),
      );
    } finally {
      x.current = false;
      F(false);
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
              rows: ye.rows,
              bold: true,
            }),
            G &&
              jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Text, {
                    children: LINKED_PATH_NOTE,
                  }),
                  jsxProd_default(IndentedRows, {
                    first: "  ",
                    rows: Se.rows,
                  }),
                ],
              }),
            jsxProd_default(Text, {
              dimColor: true,
              children: je,
            }),
          ],
        }),
        mapped.length > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              mapped.map((rows, P) =>
                jsxProd_default(
                  IndentedRows,
                  {
                    first: "\xB7 ",
                    rows,
                  },
                  P,
                ),
              ),
              ke !== "" &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: ke,
                }),
            ],
          }),
        Re !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: Re,
          }),
        V
          ? jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                shown.map((A, P) =>
                  jsxProd_default_2(
                    Box,
                    {
                      flexDirection: "column",
                      children: [
                        P > 0 &&
                          jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [GUTTER_BAR, " ..."],
                          }),
                        A.map((E, N) =>
                          jsxProd_default(
                            DiffLineRows,
                            {
                              marker: E.marker,
                              rows: E.rows,
                            },
                            N,
                          ),
                        ),
                      ],
                    },
                    P,
                  ),
                ),
                Ye !== "" &&
                  jsxProd_default(Text, {
                    color: "warning",
                    children: Ye,
                  }),
              ],
            })
          : jsxProd_default(Text, {
              color: "warning",
              children: Ue,
            }),
        ae &&
          _e !== "" &&
          jsxProd_default(Text, {
            color: "warning",
            children: _e,
          }),
        ae &&
          G &&
          jsxProd_default(IndentedRows, {
            first: ACCEPT_WRITES_PREFIX,
            rows: ve.rows,
            color: "warning",
          }),
        jsxProd_default(
          ModelSelector,
          {
            isDisabled: T,
            hideIndexes: true,
            refuseInput: We,
            options: [
              ...(ae
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
            onChange: (A) => {
              Ke(A).catch(logError);
            },
            onCancel: () => {
              Ke("later").catch(logError);
            },
          },
          I.remountKey,
        ),
        jsxProd_default(AgentNavigationFooter, {
          exitActive: false,
          children: oe.pending
            ? `Press ${oe.keyName} again to close`
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
//@ chunk-61a1pjwa.js:28222-28245 placement = COPY_DIR (1)
var COPY_DIR = `claude ${APPLY_PROJECT_SETTINGS}`;
//@ chunk-61a1pjwa.js:28245-28277 placement
function normalizePathForDisplay(t) {
  return stripControlChars(tildify(t));
}
//@ chunk-61a1pjwa.js:28277-28354 placement
var STAGED_SOURCES = ["project", "local", "legacy"];
var TARGET_PATH_BY_SCOPE = {
  own: USER_SETTINGS_FILE_NAMES.default,
  own_cowork: USER_SETTINGS_FILE_NAMES.cowork,
};
//@ chunk-61a1pjwa.js:28354-28404 placement
function isOwnScope(slot) {
  return slot === "own" || slot === "own_cowork";
}
//@ chunk-61a1pjwa.js:28404-28552 placement
function isUnsafeSettingsPath(path) {
  let o = (h, u) => {
    try {
      let i = lstatSync(h);
      return i.isSymbolicLink() || (u && i.isFile() && i.nlink > 1);
    } catch (error) {
      return !isENOENT(error);
    }
  };
  return o(dirname(path), false) || o(path, true);
}
//@ chunk-61a1pjwa.js:28552-28640 placement
function allStagedFiles(t) {
  return [t.project, t.local, t.legacy].flatMap((o) => (o === null ? [] : [dirname(dirname(o))]));
}
//@ chunk-61a1pjwa.js:28640-29247 placement
function checkSettingsPathFollowable(claudeConfigDir, o) {
  let h = (v) => {
    try {
      return [resolve(v), realpathSync(v)];
    } catch {
      return [resolve(v)];
    }
  };
  let flattened = o.flatMap(h);
  let i = (path) => flattened.some((T) => isSameOrUnderPath(path, T));
  let S = (path, T) => isSameOrUnderPath(path, T) && isSameOrUnderPath(T, path);
  if (!S(resolve(claudeConfigDir), resolve(homedir(), ".claude")) && h(claudeConfigDir).some(i)) return true;
  let realPath = resolveRealPath(claudeConfigDir);
  if (realPath === "absent") return false;
  if (realPath === "unfollowable") return true;
  let realPath_2 = resolveRealPath(homedir());
  if (
    !(typeof realPath_2 === "object" && S(realPath.path, join(realPath_2.path, ".claude"))) &&
    i(realPath.path)
  )
    return true;
  for (let v of Object.values(USER_SETTINGS_FILE_NAMES)) {
    let T = join(claudeConfigDir, v);
    try {
      let x = lstatSync(T);
      if (x.isFile() && x.nlink > 1) return true;
    } catch (error) {
      if (isENOENT(error)) continue;
      return true;
    }
    let realPath_2 = resolveRealPath(T);
    if (realPath_2 === "absent") continue;
    if (realPath_2 === "unfollowable" || (!S(realPath_2.path, join(realPath.path, v)) && i(realPath_2.path)))
      return true;
  }
  return false;
}
//@ chunk-61a1pjwa.js:29247-29402 placement
function resolveRealPath(t) {
  try {
    return {
      path: realpathSync(t),
    };
  } catch (error) {
    if (!isENOENT(error)) return "unfollowable";
  }
  try {
    lstatSync(t);
    return "unfollowable";
  } catch (error) {
    return isENOENT(error) ? "absent" : "unfollowable";
  }
}
//@ chunk-61a1pjwa.js:29402-30059 placement
function describeNeedsTerminal(t) {
  if (!t.stdinIsTTY || !t.stdoutIsTTY)
    return `${COPY_DIR} shows you changes and waits for your answer, so it needs a terminal. Run it yourself in a terminal in the project folder.`;
  if (
    !t.verbFirst ||
    t.settingsGivenOnCommandLine ||
    t.allowedSources.some((allowedSource) => REPO_DIR_SETTING_SOURCES.has(allowedSource))
  )
    return `Run it as "${COPY_DIR}", with nothing between "claude" and "${APPLY_PROJECT_SETTINGS}": it has to start with this folder's own settings files switched off.`;
  if (t.configHomeRedirectedIntoFolder)
    return "Run it with CLAUDE_CONFIG_DIR set outside this folder: it points into the folder, so the settings this process itself reads are this folder's own files, and it has to start with those switched off.";
  return;
}
//@ chunk-61a1pjwa.js:30059-30914 placement
function readServedSettingsRecord(t, o, h, u = isUnsafeSettingsPath) {
  let i = [];
  let S = [];
  let p = [];
  let C = t.folder(o.key);
  for (let v of STAGED_SOURCES) {
    let T = o[v];
    if (T === null) continue;
    if (o.linkedAway.includes(v) || u(T)) {
      p.push(T);
      continue;
    }
    let F = h(T);
    if (u(T)) {
      p.push(T);
      continue;
    }
    if (F === "unreadable") {
      S.push(T);
      continue;
    }
    let x = F === "absent" ? null : stripBomAndCarriageReturns(F.text);
    let D = typeof C === "object" ? C[v] : T;
    let W = C === "unreadable" ? "unreadable" : D === null ? "none" : t.file(D);
    if (W === "unreadable") {
      i.push({
        slot: v,
        path: T,
        accepted: null,
        live: x,
        note: "record_unreadable",
      });
      continue;
    }
    if (W === "none") {
      if (typeof C === "object" && x !== null)
        i.push({
          slot: v,
          path: T,
          accepted: null,
          live: x,
          note: "new_here",
        });
      continue;
    }
    if (hashOrNull(x) === W.sha256) continue;
    i.push(
      D !== null && D !== T
        ? {
            slot: v,
            path: T,
            accepted: W.text,
            live: x,
            note: "moved",
            movedFrom: D,
          }
        : {
            slot: v,
            path: T,
            accepted: W.text,
            live: x,
            note: "changed",
          },
    );
  }
  let k = (v) => C !== "none" || t.file(v) !== "none";
  return {
    files: i,
    unreadable: S.filter(k),
    linked: p.filter(k),
  };
}
//@ chunk-61a1pjwa.js:30914-31083 placement
function readSettingsSnapshot(path, o) {
  let h = o(path);
  if (h === "unreadable") return "unreadable";
  if (h === "absent") return null;
  let { settings } = parseSettingsContent(stripBomAndCarriageReturns(h.text), path);
  return settings === null ? "unreadable" : settingsToJsonText(servedRestrictionSnapshot(settings));
}
//@ chunk-61a1pjwa.js:31083-31217 placement
function getServedSettingsSlots(settingsFilePathForSource) {
  if (settingsFilePathForSource === undefined) return [];
  let o = dirname(settingsFilePathForSource);
  return [
    {
      slot: "own",
      path: join(o, TARGET_PATH_BY_SCOPE.own),
    },
    {
      slot: "own_cowork",
      path: join(o, TARGET_PATH_BY_SCOPE.own_cowork),
    },
  ];
}
//@ chunk-61a1pjwa.js:31217-31638 placement
function describeRecordState(t, { slot, path }, u) {
  let i = t.file(path);
  if (i === "none") return;
  let settingsSnapshot = readSettingsSnapshot(path, u);
  if (settingsSnapshot === "unreadable") return "unreadable";
  let settings = i === "unreadable" || i.text === null ? null : parseSettingsContent(i.text, path).settings;
  if (i === "unreadable" || (i.text !== null && settings === null))
    return {
      slot,
      path,
      accepted: null,
      live: settingsSnapshot,
      note: "record_unreadable",
    };
  let C = settings === null ? null : settingsToJsonText(servedRestrictionSnapshot(settings));
  let k = settingsToJsonText({});
  return (C ?? k) === (settingsSnapshot ?? k)
    ? undefined
    : {
        slot,
        path,
        accepted: C,
        live: settingsSnapshot,
        note: "changed",
      };
}
//@ chunk-61a1pjwa.js:31638-31942 placement
/**
 * 把云会话使用的设置冻结槽（当前与已接受内容）转换为待审阅的变更记录。
 */
function servedSlotsToChanges(files, o) {
  return files.map((h) => {
    let live = h.live ?? "";
    return {
      change: {
        id: h.slot,
        path: h.path,
        resolvedPath: h.path,
        baseSha256: hashOrNull(h.accepted),
        proposedSha256: hashOrNull(live) ?? "",
        proposedContent: live,
        stagedAt: o.toISOString(),
        by: {
          tool: "Write",
          origin: "local",
          sessionId: "",
        },
      },
      current: h.accepted,
      readError: null,
      applicable: true,
    };
  });
}
//@ chunk-61a1pjwa.js:32072-33656 placement
/**
 * 比较当前设置与已接受的冻结版本，给出可接受/冲突/过期状态。
 */
function compareServedSettings(t) {
  let o = new Map(t.files.map((file) => [file.path, file]));
  let h = servedSlotsToChanges(t.files, t.now());
  let entries = h.map(({ change }) => change);
  let i = 0;
  let S = (p) => {
    if (isOwnScope(p.slot)) {
      let k = describeRecordState(
        t.store,
        {
          slot: p.slot,
          path: p.path,
        },
        t.readLive,
      );
      return k === undefined || k === "unreadable" ? p.live : k.accepted;
    }
    let found = readServedSettingsRecord(t.store, t.slots, t.readLive).files.find(
      (file) => file.slot === p.slot,
    );
    return found === undefined ? p.live : found.accepted;
  };
  return {
    accepted: () => i,
    reviewed: h,
    readStore: async () =>
      jsonStringify({
        version: REVIEW_STORE_VERSION,
        entries,
      }),
    writeStore: async () => {},
    deleteStore: async () => {},
    readTarget: async (p) => {
      let C = o.get(p);
      return C === undefined ? null : S(C);
    },
    locate: async (p) => p,
    isSettingsFile: async (p) => o.has(p),
    configChangeBlocked: async (p, C, k) => {
      let v = o.get(p);
      return v === undefined || t.gate === undefined ? true : t.gate(CONFIG_CHANGE_SOURCES_2[v.slot], k);
    },
    afterApplied: () => {},
    now: t.now,
    writeTarget: async ({ path, content, blockedOnceWritten }) => {
      let v = o.get(path);
      if (v === undefined || content !== (v.live ?? "")) return "changed";
      let T = await checkSettingsCopy(
        {
          name: basename(path),
          text: content,
          ...(t.shownDir !== undefined && {
            dir: t.shownDir,
          }),
        },
        blockedOnceWritten,
      );
      if (T !== "allowed") return T;
      if (S(v) !== v.accepted) return "changed";
      if (isOwnScope(v.slot)) {
        if (readSettingsSnapshot(path, t.readLive) !== v.live) return "changed";
        t.store.recordFile(path, v.live, "person");
        i++;
        return "written";
      }
      if (isUnsafeSettingsPath(path)) return "redirected";
      let live = t.readLive(path);
      if (
        live === "unreadable" ||
        hashOrNull(live === "absent" ? null : stripBomAndCarriageReturns(live.text)) !== hashOrNull(v.live)
      )
        return "changed";
      if (isUnsafeSettingsPath(path)) return "redirected";
      t.store.recordFile(path, v.live, "person");
      let x = t.store.folder(t.slots.key);
      if (x === "unreadable")
        t.store.recordFolder(t.slots.key, {
          project: t.slots.project,
          local: t.slots.local,
          legacy: t.slots.legacy,
        });
      else if (x !== "none" && x[v.slot] !== path)
        t.store.recordFolder(t.slots.key, {
          ...x,
          [v.slot]: path,
        });
      i++;
      return "written";
    },
  };
}
//@ chunk-61a1pjwa.js:33656-34584 placement
function describeAcceptOutcome(t) {
  switch (t) {
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
//@ chunk-61a1pjwa.js:34584-37114 placement
/**
 * 渲染云会话设置冻结版本的各槽（未变、已变、个人设置文件消失等）。
 */
function renderServedSettingsSlots(t) {
  let o = new Map(t.map((i) => [i.slot, i]));
  let h = (i) => {
    let S = o.get(i.id);
    if (S !== undefined && isOwnScope(S.slot) && S.note === "changed")
      return S.live === null
        ? "Your own settings file is gone; cloud sessions keep using what you accepted"
        : "Your own settings, the part kept for cloud sessions: not what you accepted, which cloud sessions keep using";
    switch (S?.note) {
      case "new_here":
        return "Cloud sessions have used this folder before, and never with a file at this path, so nothing in it counts until you accept it";
      case "moved":
        return "This folder's settings file used to be somewhere else; what you accepted there still counts until you accept this one";
      case "record_unreadable":
        return "This computer's record of what you accepted could not be read, so the whole file is shown as new and none of it counts until you accept it";
      case "changed":
      case undefined:
        return S?.live === null
          ? "The file is gone; cloud sessions keep using the version you accepted"
          : S?.accepted === null
            ? "There was no file here when you last accepted, so nothing in it counts until you accept it"
            : "Different from the version you accepted; cloud sessions keep using that one";
    }
  };
  let any = t.some((i) => isOwnScope(i.slot));
  return {
    header: "Not accepted for cloud sessions yet: ",
    listTitle: (i) =>
      `${i} ${any ? "" : "project "}settings ${i === 1 ? "file is" : "files are"} not what you accepted for cloud sessions`,
    listIntro: any
      ? "Cloud sessions that use this computer keep the version of each file that you last accepted. A cloud session runs commands here, so look at each change before you accept it. Nothing changes until you do."
      : "Cloud sessions that use this computer keep the version of each file that you last accepted. A cloud session can write to this folder, so look at each change before you accept it. Nothing changes until you do.",
    listMore: (i) => `+${i} more not listed; review these first`,
    listNote: h,
    byline: h,
    acceptLabel: "Accept this version for cloud sessions",
    discardLabel: undefined,
    enlarge: `Enlarge the terminal (or reduce the font size) and run ${COPY_DIR} again to see the whole change before accepting.`,
    underReview: "file",
    unreadable: (i) => `What you last accepted could not be read (${i}), so this cannot be accepted here.`,
    notApplicable: `What you last accepted changed since this was shown. Run ${COPY_DIR} again.`,
    diffUnavailable:
      "The difference could not be computed, so this cannot be accepted here. Compare the file with what you expect yourself.",
    later: (i) => `Left as it is. Cloud sessions keep the version you accepted before. ${i}`,
    outcome: describeAcceptOutcome,
    failed: (i, S, p) => `Could not accept, so nothing was accepted: "${S}" ${p}`,
  };
}
//@ chunk-61a1pjwa.js:37114-37297 placement
async function renderStagedSettingsReview(t, o, h, u, i) {
  return new Promise((resolve) => {
    t.render(
      jsxProd_default(AppRoot, {
        session: o,
        onChangeAppState: (p) => onChangeAppState(p, o),
        children: jsxProd_default(
          StagedSettingsReview,
          {
            changes: u.reviewed,
            deps: u,
            wording: renderServedSettingsSlots(h),
            onDone: resolve,
          },
          i,
        ),
      }),
    );
  });
}
//@ chunk-61a1pjwa.js:37297-39048 placement
/**
 * claude 子命令：审阅并接受云会话使用的设置版本（remote_served_settings_freeze）。
 */
async function reviewServedSettingsFreeze(t, o, h) {
  let u = repoTierFileSlots();
  let i = describeNeedsTerminal({
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    verbFirst: isApplyProjectSettingsCommand(),
    settingsGivenOnCommandLine: getFlagSettingsPath() !== undefined || getFlagSettingsInline() !== null,
    allowedSources: getAllowedSettingSourcesAsConfigured(),
    configHomeRedirectedIntoFolder: checkSettingsPathFollowable(getClaudeConfigDir(), [
      getCwd(),
      ...allStagedFiles(u),
    ]),
  });
  if (i !== undefined) {
    printCliError(i);
    await logFeatureBadAsync("remote_served_settings_freeze", "accept_refused");
    await exitAfterAnalyticsFlush(1);
    return;
  }
  let acceptedSettingsStore = createAcceptedSettingsStore();
  let gate = configChangeBlocker(t, o, h);
  let C;
  let k = 0;
  let v = [];
  let servedSettingsSlots = getServedSettingsSlots(getSettingsFilePathForSource("userSettings"));
  for (let idx = 0; ; idx++) {
    let servedSettingsRecord = readServedSettingsRecord(acceptedSettingsStore, u, readRepoTierFileText);
    let mapped = servedSettingsSlots.map((servedSettingsSlot) => ({
      path: servedSettingsSlot.path,
      waiting: describeRecordState(acceptedSettingsStore, servedSettingsSlot, readRepoTierFileText),
    }));
    let flattened = mapped.flatMap((I) => (I.waiting === "unreadable" ? [I.path] : []));
    let K = [
      ...mapped.flatMap((I) => (I.waiting === undefined || I.waiting === "unreadable" ? [] : [I.waiting])),
      ...servedSettingsRecord.files,
    ];
    if (idx === 0) {
      for (let I of [...flattened, ...servedSettingsRecord.unreadable])
        v.push(
          `${normalizePathForDisplay(I)} could not be read, so it cannot be shown or accepted. Cloud sessions keep using what you accepted before.`,
        );
      for (let I of servedSettingsRecord.linked)
        v.push(
          `${normalizePathForDisplay(I)} cannot be taken as this folder's own file: it is a link to another file, has a second name (a hard link), sits in a .claude folder that is a link, or could not be examined. So it cannot be accepted here, and cloud sessions keep using what you accepted before. A plain file with no other name, in a plain .claude folder you can read, changes that.`,
        );
    }
    if (K.length === 0) {
      if (
        k === 0 &&
        flattened.length === 0 &&
        servedSettingsRecord.unreadable.length === 0 &&
        servedSettingsRecord.linked.length === 0
      )
        v.push(
          "Nothing is waiting. Cloud sessions already use your settings and this folder's on this computer.",
        );
      break;
    }
    let X = compareServedSettings({
      store: acceptedSettingsStore,
      slots: u,
      files: K,
      readLive: readRepoTierFileText,
      gate,
      now: () => new Date(),
    });
    C ??= await createRoot(getBaseRenderOptions(false));
    let ne = await renderStagedSettingsReview(C, t, K, X, idx);
    if (ne !== undefined) v.push(ne);
    if (X.accepted() === 0) break;
    k += X.accepted();
  }
  C?.unmount();
  process.stdout.write(`${v.join(`
`)}
`);
  await logFeatureOkAsync("remote_served_settings_freeze", {
    op: lit("accept_command"),
    accepted: k,
  });
  await exitAfterAnalyticsFlush(0);
}
