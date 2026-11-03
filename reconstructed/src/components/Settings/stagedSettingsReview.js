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
import { j, y, R, Q } from "../../../vendor/react/cjs/react.production.js";
import { markBrokenSequences, Ons } from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { X1e } from "../../utils/truncateGraphemes.js";
import { tildify } from "../../utils/path.js";
import { wrapByWidth } from "../permissions/wrapWidth.js";
import { countCharInString, takeLastChars, plural } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import {
  PROPOSED_FILE_INFIX,
  describeSettingsChange,
  discardSettingsProposal,
  acceptSettingsProposal,
  Dq,
  REVIEW_STORE_VERSION,
} from "../../utils/settings/settingsReview.js";
import { formatRelativeTimeAgo } from "../../utils/format.js";
import { getPatchFromContents } from "../../utils/diff.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { zR, PANE_PADDING, Pane } from "../design-system/Pane.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { So, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
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
import { APPLY_PROJECT_SETTINGS, kcr } from "../../cli/handlers/applyProjectSettings.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { USER_SETTINGS_FILE_NAMES, parseSettingsContent } from "../../utils/settings/settingsFileParsing.js";
import { isSameOrUnderPath } from "../../utils/pathPrefix.js";
import { REPO_DIR_SETTING_SOURCES } from "../../utils/settings/constants.js";
import {
  _gt,
  checkSettingsCopy,
  createAcceptedSettingsStore,
} from "../../services/remoteTools/acceptedSettings.js";
import { f_n, servedRestrictionSnapshot } from "../../remote/tools/servedOwnerSettings.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { CONFIG_CHANGE_SOURCES } from "../../entrypoints/sdk/coreSchemas.js";
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
j();
//@ chunk-61a1pjwa.js:16143-16431 placement
var DIFF_CONTEXT_LINES = 8,
  Ct = 8,
  kt = 2,
  xe = 3,
  Rt = 3,
  _t =
    "Enlarge the terminal (or reduce the font size) and run /settings-review again to see the whole change before accepting; or discard it.",
  Tt = "Staged change to ",
  Xe = "A linked path; accepting writes the file it points to \u2192",
  ze = "Accepting writes \u2192 ";
//@ chunk-61a1pjwa.js:16431-16534 placement
var UNSAFE_DISPLAY_CHARS_RE =
  /[\x00-\x08\x0a-\x1f\x7f-\x9f\u2028\u2029\u2800\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-61a1pjwa.js:16534-16600 placement
function ge(t, o) {
  return t.replace(UNSAFE_DISPLAY_CHARS_RE, "\uFFFD").replaceAll("\t", o);
}
//@ chunk-61a1pjwa.js:16600-16636 placement
function Pe(t, o) {
  return markBrokenSequences(ge(t, o));
}
//@ chunk-61a1pjwa.js:16636-16694 placement
function nt(t) {
  return /[\p{Mn}\p{Me}]/u.test(t) && bunStringWidth(t) === 0;
}
//@ chunk-61a1pjwa.js:16694-16722 placement
function qe(t) {
  return !nt(t);
}
//@ chunk-61a1pjwa.js:16722-16759 placement
function Ve(t) {
  return Ons(t) && !nt(t);
}
//@ chunk-61a1pjwa.js:16759-16820 placement
function ce(t, o) {
  let h = 0;
  for (let u of t) if (o(u)) h++;
  return h;
}
//@ chunk-61a1pjwa.js:16820-16913 placement
function Fe(t, o) {
  return ce(o, qe) >= ce(t, qe) && ce(o, Ve) === ce(t, Ve) && (!X1e.test(o) || X1e.test(t));
}
//@ chunk-61a1pjwa.js:16913-16972 placement
function Y(t) {
  return Pe(tildify(t), "\uFFFD").replace(/ +/g, " ");
}
//@ chunk-61a1pjwa.js:16972-16986 placement = _temp18 (1)
var ot = "    ";
//@ chunk-61a1pjwa.js:16986-17017 layout
function At(t) {
  return Pe(t, ot);
}
//@ chunk-61a1pjwa.js:17017-17073 placement
function he(t) {
  return Pe(t, "\uFFFD").replace(/ +/g, " ");
}
/**
 * 按宽度把文本折成行，超过行数上限时截断最后一行并附 "… (+N chars)"，返回 {rows, cut}。
 */
//@ chunk-61a1pjwa.js:17073-17370 placement
function wrapRowsWithCap(t, o, h) {
  let u = wrapByWidth(t, Math.max(1, o));
  if (u.length <= h) return { rows: u, cut: 0 };
  let i = [...t].length,
    sliced = u.slice(0, h),
    p = ` \u2026 (+${i} chars)`.length + 1,
    C = wrapByWidth(sliced[h - 1], Math.max(1, o - p))[0] ?? "";
  sliced[h - 1] = C;
  let k = i - sliced.reduce((v, T) => v + [...T].length, 0);
  return ((sliced[h - 1] = `${C} \u2026 (+${k} chars)`), { rows: sliced, cut: k });
}
//@ chunk-61a1pjwa.js:17370-17431 placement
function Ft(t, o) {
  return (
    countCharInString(
      wrapText(t, Math.max(1, o), "wrap"),
      `
`,
    ) + 1
  );
}
//@ chunk-61a1pjwa.js:17431-17516 placement
var NON_PRINTABLE_PATTERN = /[\x00-\x08\x0b-\x1f\x7f]|[^\x00-\x7f]/gu,
  Dt = /[\x00-\x1f\x7f]|[^\x00-\x7f]/gu;
//@ chunk-61a1pjwa.js:17516-17577 placement = getErrnoPath (1)
function getErrnoPath(t, o) {
  return t.match(o === "path" ? Dt : NON_PRINTABLE_PATTERN)?.length ?? 0;
}
//@ chunk-61a1pjwa.js:17577-17753 placement
function describeStagedBy(t) {
  let o = takeLastChars(he(t.by.sessionId), 8);
  return t.by.origin === "served"
    ? `by a cloud session (\u2026${o}) this computer served`
    : `by a session on this computer (\u2026${o})`;
}
//@ chunk-61a1pjwa.js:17753-17799 placement
function Ie(t) {
  return t.resolvedPath === t.path;
}
//@ chunk-61a1pjwa.js:17799-17869 placement
var rt = /["\u00ab\u00bb\u201c-\u201f\u2033\u2036\u301d-\u301f\uff02]/g;
//@ chunk-61a1pjwa.js:17869-18037 placement
function truncateStartToWidth(t, o) {
  let h = [...t],
    u = 0,
    i = h.length;
  while (i > 0) {
    let S = h[i - 1],
      p = S.length === 1 && S < "\x80" ? 1 : 2;
    if (u + p > o) break;
    ((u += p), i--);
  }
  return i === 0 ? t : `\u2026${h.slice(i).join("")}`;
}
//@ chunk-61a1pjwa.js:18037-18104 placement
function Lt(t) {
  return `File: "${truncateStartToWidth(Y(t.path).replace(rt, "'"), 60)}"`;
}
/**
 * 应用暂存变更的结果说明（已写入、文件已变、提议已变、路径被重定向、硬链接、不可写、被篡改）。
 */
//@ chunk-61a1pjwa.js:18104-19640 placement
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
  header: Tt,
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
  enlarge: _t,
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
/**
 * 把 diff hunk 行按宽度折行并放进剩余行数预算，放不下或显示不安全时停止，返回 {shown, hiddenLines}。
 */
//@ chunk-61a1pjwa.js:21072-21437 placement
function fitDiffHunks(t, o, h) {
  let u = [],
    i = o,
    S = 0,
    p = !1;
  for (let C of t) {
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
      let sliced = line.slice(1),
        F = At(sliced),
        x = wrapByWidth(F, h);
      if (x.length <= i && Fe(ge(sliced, ot), F)) {
        let D = line[0];
        (k.push({ marker: D === "+" || D === "-" ? D : " ", rows: x }), (i -= x.length));
      } else ((p = !0), S++);
    }
    if (k.length > 0) u.push(k);
  }
  return { shown: u, hiddenLines: S };
}
/**
 * 计算暂存设置变更的 diff：hunk、无法显示 diff 的情况、变更摘要，以及路径/内容中被隐藏的码点数。
 */
//@ chunk-61a1pjwa.js:21437-21797 placement
function computeStagedChangeDiff({ change: change, current: o }) {
  let h = getPatchFromContents({
      filePath: change.path,
      oldContent: o ?? "",
      newContent: change.proposedContent,
    }),
    u = describeSettingsChange(o, change.proposedContent);
  return {
    rawHunks: h,
    diffUnavailable: h.length === 0 && (o ?? "") !== change.proposedContent,
    rawSummary: u,
    hiddenCodepoints:
      getErrnoPath(change.path, "path") +
      (Ie(change) ? 0 : getErrnoPath(change.resolvedPath, "path")) +
      getErrnoPath(change.proposedContent, "text") +
      u.reduce((i, S) => i + getErrnoPath(S, "path"), 0),
  };
}
/**
 * 按行渲染文本，首行带前缀、后续行用等宽空格缩进，可设置粗体与颜色。
 */
//@ chunk-61a1pjwa.js:21797-22211 placement
function IndentedRows(t) {
  let S = w(11),
    { first: first, rows: rows, bold: bold, color: color } = t,
    p;
  if (S[0] !== bold || S[1] !== color || S[2] !== first || S[3] !== rows) {
    let C;
    if (S[5] !== bold || S[6] !== color || S[7] !== first)
      ((C = (k, v) =>
        r(Text, { bold: bold, color: color, children: [v === 0 ? first : " ".repeat(first.length), k] }, v)),
        (S[5] = bold),
        (S[6] = color),
        (S[7] = first),
        (S[8] = C));
    else C = S[8];
    p = rows.map(C);
    ((S[0] = bold), (S[1] = color), (S[2] = first), (S[3] = rows), (S[4] = p));
  } else p = S[4];
  let C;
  if (S[9] !== p) ((C = e(Box, { flexDirection: "column", children: p })), (S[9] = p), (S[10] = C));
  else C = S[10];
  return C;
}
//@ chunk-61a1pjwa.js:22211-22232 placement
var De = "\u2502",
  jt = 4;
/**
 * 渲染待审设置的差异行：+/- 行加增删背景色，未变化行变暗，首行显示标记符号。
 */
//@ chunk-61a1pjwa.js:22232-22665 placement
function DiffLineRows(t) {
  let u = w(7),
    { marker: marker, rows: rows } = t,
    i;
  if (u[0] !== marker || u[1] !== rows) {
    let S;
    if (u[3] !== marker)
      ((S = (p, C) =>
        r(
          Text,
          {
            dimColor: marker === " ",
            children: [
              e(Text, { dimColor: !0, children: De }),
              r(Text, {
                backgroundColor: marker === "+" ? "diffAdded" : marker === "-" ? "diffRemoved" : void 0,
                children: [C === 0 ? marker : " ", " ", p],
              }),
            ],
          },
          C,
        )),
        (u[3] = marker),
        (u[4] = S));
    else S = u[4];
    i = rows.map(S);
    ((u[0] = marker), (u[1] = rows), (u[2] = i));
  } else i = u[2];
  let S;
  if (u[5] !== i) ((S = e(Box, { flexDirection: "column", children: i })), (u[5] = i), (u[6] = S));
  else S = u[6];
  return S;
}
/**
 * 逐条显示暂存的设置变更（diff）并等待接受/拒绝。
 */
//@ chunk-61a1pjwa.js:22665-28222 placement
function StagedSettingsReview({
  changes: changes,
  deps: deps,
  onDone: onDone,
  wording: wording = STAGED_CHANGE_WORDING,
}) {
  let { columns: columns, rows: rows } = useScrollViewportSize(useTerminalSize()),
    p = Tl(),
    max = Math.max(8, columns - 2 * (p ? zR : PANE_PADDING)),
    [k, v] = y(changes.length === 1 ? changes[0] : void 0),
    [T, F] = y(!1),
    x = R(!1),
    D = useInputClock(),
    W = R(Date.now()),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    I = settleKey(`${k?.change.id ?? ""}:${epoch}`, So);
  function We() {
    if (isWithinRecentInput(D, W.current, So) || refusedWithin(So)) return (noteRefused(), !0);
    return !1;
  }
  let oe = useGlobalExitKeybindings(() => onDone());
  useKeybinding("confirm:no", () => onDone(), { context: "Confirmation", isActive: k === void 0 });
  let Me = Q(() => (k === void 0 ? void 0 : computeStagedChangeDiff(k)), [k]);
  if (k === void 0 || Me === void 0) {
    let sliced = changes.slice(0, DIFF_CONTEXT_LINES),
      P = changes.length - sliced.length,
      E = max - 4;
    return e(Pane, {
      color: "permission",
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          e(Text, { bold: !0, children: wording.listTitle(changes.length) }),
          e(Text, { dimColor: !0, children: wording.listIntro }),
          r(OrderedListWithItem, {
            onSelect: (N) => {
              let le = sliced[N];
              if (le === void 0) {
                onDone();
                return;
              }
              ((W.current = Date.now()), v(le));
            },
            children: [
              sliced.map(({ change: change, applicable: applicable, readError: readError }) =>
                e(
                  OrderedListWithItem.Item,
                  {
                    label: wrapRowsWithCap(Y(change.path), E, 1).rows[0] ?? "",
                    description: wrapRowsWithCap(
                      `${wording.listNote(change, readError !== null ? "unreadable" : applicable ? void 0 : "changed")}${Ie(change) ? "" : ` \xB7 writes \u2192 ${Y(change.resolvedPath)}`}`,
                      E,
                      1,
                    ).rows[0],
                  },
                  `open:${change.id}`,
                ),
              ),
              e(OrderedListWithItem.Item, { label: "Done" }, "done"),
            ],
          }),
          P > 0 && e(Text, { dimColor: !0, children: wording.listMore(P) }),
          e(AgentNavigationFooter, {
            exitActive: !1,
            children: oe.pending
              ? `Press ${oe.keyName} again to close`
              : r(Byline, {
                  children: [
                    e(KeyboardShortcutHint, { chord: "enter", action: "open" }),
                    e(KeyboardShortcutHint, { chord: "escape", action: "close" }),
                  ],
                }),
          }),
        ],
      }),
    });
  }
  let { change: change, readError: readError, applicable: applicable } = k,
    {
      rawHunks: rawHunks,
      diffUnavailable: diffUnavailable,
      rawSummary: rawSummary,
      hiddenCodepoints: hiddenCodepoints,
    } = Me,
    G = !Ie(change),
    ye = wrapRowsWithCap(Y(change.path), max - wording.header.length, xe),
    be = G ? Y(change.resolvedPath) : "",
    wt =
      Fe(ge(tildify(change.path), "\uFFFD").replace(/ +/g, " "), Y(change.path)) &&
      (!G || Fe(ge(tildify(change.resolvedPath), "\uFFFD").replace(/ +/g, " "), be)),
    Se = G ? wrapRowsWithCap(be, max - 2, xe) : { rows: [], cut: 0 },
    ve = G ? wrapRowsWithCap(be, max - ze.length, xe) : { rows: [], cut: 0 },
    mapped = rawSummary.slice(0, Ct).map((A) => wrapRowsWithCap(he(A), max - 2, kt).rows),
    Ce = rawSummary.length - mapped.length,
    byline = wording.byline(change),
    ke =
      Ce > 0 ? `+${Ce} more top-level ${plural(Ce, "key")} changed, not listed; the diff below has them` : "",
    Re =
      hiddenCodepoints > 0
        ? `${hiddenCodepoints} ${plural(hiddenCodepoints, "character")} in this ${wording.underReview} ${plural(hiddenCodepoints, "is", "are")} not plain ASCII (such characters may not display as written, or may look like others; controls show here as \uFFFD). Compare the file yourself before accepting; what you accept is the ${wording.underReview} as written.`
        : "",
    Ue =
      readError !== null
        ? wording.unreadable(wrapRowsWithCap(he(readError), 48, 1).rows[0] ?? "")
        : !applicable
          ? wording.notApplicable
          : diffUnavailable
            ? wording.diffUnavailable
            : "",
    V = Ue === "",
    _e =
      V && hiddenCodepoints > 0
        ? `Accepting applies ${hiddenCodepoints} ${plural(hiddenCodepoints, "character")} that ${plural(hiddenCodepoints, "is", "are")} not plain ASCII`
        : "",
    B = (A) => (A === "" ? 0 : Ft(A, max)),
    U = (A) => (A > 0 ? A + 1 : 0),
    yt =
      Rt +
      (p ? 0 : 2) +
      U(ye.rows.length + (G ? B(Xe) + Se.rows.length : 0) + B(byline)) +
      U(mapped.reduce((A, P) => A + P.length, 0) + B(ke)) +
      U(B(Re)) +
      U(B(_e)) +
      U(ve.rows.length) +
      B(
        `+${rawHunks.reduce((A, P) => A + P.lines.length, 0)} more changed lines are not shown; the path is too long to show whole; the file it points to is too long to show whole \u2014 ${wording.enlarge}`,
      ) +
      U(3),
    { shown: shown, hiddenLines: hiddenLines } = V
      ? fitDiffHunks(rawHunks, Math.max(0, rows - yt), max - jt)
      : { shown: [], hiddenLines: 0 },
    filtered = [
      hiddenLines > 0
        ? `${hiddenLines} more changed ${plural(hiddenLines, "line")} ${plural(hiddenLines, "is", "are")} not shown`
        : "",
      ye.cut > 0 || !wt ? "the path is too long to show whole" : "",
      Se.cut > 0 || ve.cut > 0 ? "the file it points to is too long to show whole" : "",
    ].filter((A) => A !== ""),
    Ye = V && filtered.length > 0 ? `+${filtered.join("; ")} \u2014 ${wording.enlarge}` : "",
    ae = V && filtered.length === 0,
    J = Lt(change);
  async function Ke(A) {
    if (x.current || We()) return;
    if (((x.current = !0), A === "later")) {
      if (changes.length === 1) onDone(wording.later(J));
      else ((x.current = !1), v(void 0));
      return;
    }
    F(!0);
    let P = Date.now() - Date.parse(change.stagedAt);
    try {
      if (A === "discard") {
        let N = await discardSettingsProposal(change.id, deps);
        if (
          (logEvent("tengu_settings_change_reviewed", {
            action: fromEnum(N ? "discard" : "discard_gone"),
            origin: fromEnum(change.by.origin),
            age_ms: P,
          }),
          N)
        )
          (logFeatureOk("settings_quarantine"),
            onDone(`Discarded the staged change. The file was not touched. ${J}`));
        else
          (logFeatureSad("settings_quarantine", "discard_gone"),
            onDone(
              `The staged proposal changed while you were reviewing it, so nothing was discarded. Run /settings-review again to see the current one. ${J}`,
            ));
        return;
      }
      if (!ae) return;
      let E = await acceptSettingsProposal(change, deps);
      if (
        (logEvent("tengu_settings_change_reviewed", {
          action: fromEnum(E === "applied" ? "accept" : E),
          origin: fromEnum(change.by.origin),
          age_ms: P,
        }),
        E === "applied")
      )
        logFeatureOk("settings_quarantine");
      else logFeatureSad("settings_quarantine", `accept_${E}`);
      onDone(`${wording.outcome(E)} ${J}`);
    } catch (error) {
      (logFeatureBad("settings_quarantine", "review_action_failed"),
        onDone(
          wording.failed(
            A,
            wrapRowsWithCap(he(errorMessage(error)).replace(rt, "'"), 120, 1).rows[0] ?? "",
            J,
          ),
        ));
    } finally {
      ((x.current = !1), F(!1));
    }
  }
  return e(Pane, {
    color: "permission",
    children: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Box, {
          flexDirection: "column",
          children: [
            e(IndentedRows, { first: wording.header, rows: ye.rows, bold: !0 }),
            G &&
              r(Box, {
                flexDirection: "column",
                children: [e(Text, { children: Xe }), e(IndentedRows, { first: "  ", rows: Se.rows })],
              }),
            e(Text, { dimColor: !0, children: byline }),
          ],
        }),
        mapped.length > 0 &&
          r(Box, {
            flexDirection: "column",
            children: [
              mapped.map((A, P) => e(IndentedRows, { first: "\xB7 ", rows: A }, P)),
              ke !== "" && e(Text, { dimColor: !0, children: ke }),
            ],
          }),
        Re !== "" && e(Text, { color: "warning", children: Re }),
        V
          ? r(Box, {
              flexDirection: "column",
              children: [
                shown.map((A, P) =>
                  r(
                    Box,
                    {
                      flexDirection: "column",
                      children: [
                        P > 0 && r(Text, { dimColor: !0, children: [De, " ..."] }),
                        A.map((E, N) => e(DiffLineRows, { marker: E.marker, rows: E.rows }, N)),
                      ],
                    },
                    P,
                  ),
                ),
                Ye !== "" && e(Text, { color: "warning", children: Ye }),
              ],
            })
          : e(Text, { color: "warning", children: Ue }),
        ae && _e !== "" && e(Text, { color: "warning", children: _e }),
        ae && G && e(IndentedRows, { first: ze, rows: ve.rows, color: "warning" }),
        e(
          ModelSelector,
          {
            isDisabled: T,
            hideIndexes: !0,
            refuseInput: We,
            options: [
              ...(ae ? [{ label: wording.acceptLabel, value: "accept" }] : []),
              ...(wording.discardLabel !== void 0 ? [{ label: wording.discardLabel, value: "discard" }] : []),
              { label: "Decide later", value: "later" },
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
        e(AgentNavigationFooter, {
          exitActive: !1,
          children: oe.pending
            ? `Press ${oe.keyName} again to close`
            : r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "enter", action: "choose" }),
                  e(KeyboardShortcutHint, { chord: "escape", action: "decide later" }),
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
function ct(t) {
  return stripControlChars(tildify(t));
}
//@ chunk-61a1pjwa.js:28277-28354 placement
var zt = ["project", "local", "legacy"],
  dt = { own: USER_SETTINGS_FILE_NAMES.default, own_cowork: USER_SETTINGS_FILE_NAMES.cowork };
//@ chunk-61a1pjwa.js:28354-28404 placement
function we(t) {
  return t === "own" || t === "own_cowork";
}
//@ chunk-61a1pjwa.js:28404-28552 placement
function isUnsafeSettingsPath(t) {
  let o = (h, u) => {
    try {
      let i = lstatSync(h);
      return i.isSymbolicLink() || (u && i.isFile() && i.nlink > 1);
    } catch (error) {
      return !isENOENT(error);
    }
  };
  return o(dirname(t), !1) || o(t, !0);
}
//@ chunk-61a1pjwa.js:28552-28640 placement
function qt(t) {
  return [t.project, t.local, t.legacy].flatMap((o) => (o === null ? [] : [dirname(dirname(o))]));
}
//@ chunk-61a1pjwa.js:28640-29247 placement
function checkSettingsPathFollowable(t, o) {
  let h = (v) => {
      try {
        return [resolve(v), realpathSync(v)];
      } catch {
        return [resolve(v)];
      }
    },
    flattened = o.flatMap(h),
    i = (v) => flattened.some((T) => isSameOrUnderPath(v, T)),
    S = (v, T) => isSameOrUnderPath(v, T) && isSameOrUnderPath(T, v);
  if (!S(resolve(t), resolve(homedir(), ".claude")) && h(t).some(i)) return !0;
  let p = resolveRealPath(t);
  if (p === "absent") return !1;
  if (p === "unfollowable") return !0;
  let C = resolveRealPath(homedir());
  if (!(typeof C === "object" && S(p.path, join(C.path, ".claude"))) && i(p.path)) return !0;
  for (let v of Object.values(USER_SETTINGS_FILE_NAMES)) {
    let T = join(t, v);
    try {
      let x = lstatSync(T);
      if (x.isFile() && x.nlink > 1) return !0;
    } catch (error) {
      if (isENOENT(error)) continue;
      return !0;
    }
    let F = resolveRealPath(T);
    if (F === "absent") continue;
    if (F === "unfollowable" || (!S(F.path, join(p.path, v)) && i(F.path))) return !0;
  }
  return !1;
}
//@ chunk-61a1pjwa.js:29247-29402 placement
function resolveRealPath(t) {
  try {
    return { path: realpathSync(t) };
  } catch (error) {
    if (!isENOENT(error)) return "unfollowable";
  }
  try {
    return (lstatSync(t), "unfollowable");
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
  let i = [],
    S = [],
    p = [],
    folder = t.folder(o.key);
  for (let v of zt) {
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
    let x = F === "absent" ? null : Dq(F.text),
      D = typeof folder === "object" ? folder[v] : T,
      W = folder === "unreadable" ? "unreadable" : D === null ? "none" : t.file(D);
    if (W === "unreadable") {
      i.push({ slot: v, path: T, accepted: null, live: x, note: "record_unreadable" });
      continue;
    }
    if (W === "none") {
      if (typeof folder === "object" && x !== null)
        i.push({ slot: v, path: T, accepted: null, live: x, note: "new_here" });
      continue;
    }
    if (_gt(x) === W.sha256) continue;
    i.push(
      D !== null && D !== T
        ? { slot: v, path: T, accepted: W.text, live: x, note: "moved", movedFrom: D }
        : { slot: v, path: T, accepted: W.text, live: x, note: "changed" },
    );
  }
  let k = (v) => folder !== "none" || t.file(v) !== "none";
  return { files: i, unreadable: S.filter(k), linked: p.filter(k) };
}
//@ chunk-61a1pjwa.js:30914-31083 placement
function readSettingsSnapshot(t, o) {
  let h = o(t);
  if (h === "unreadable") return "unreadable";
  if (h === "absent") return null;
  let { settings: settings } = parseSettingsContent(Dq(h.text), t);
  return settings === null ? "unreadable" : f_n(servedRestrictionSnapshot(settings));
}
//@ chunk-61a1pjwa.js:31083-31217 placement
function getServedSettingsSlots(t) {
  if (t === void 0) return [];
  let o = dirname(t);
  return [
    { slot: "own", path: join(o, dt.own) },
    { slot: "own_cowork", path: join(o, dt.own_cowork) },
  ];
}
//@ chunk-61a1pjwa.js:31217-31638 placement
function describeRecordState(t, { slot: slot, path: path }, u) {
  let file = t.file(path);
  if (file === "none") return;
  let S = readSettingsSnapshot(path, u);
  if (S === "unreadable") return "unreadable";
  let p = file === "unreadable" || file.text === null ? null : parseSettingsContent(file.text, path).settings;
  if (file === "unreadable" || (file.text !== null && p === null))
    return { slot: slot, path: path, accepted: null, live: S, note: "record_unreadable" };
  let C = p === null ? null : f_n(servedRestrictionSnapshot(p)),
    k = f_n({});
  return (C ?? k) === (S ?? k) ? void 0 : { slot: slot, path: path, accepted: C, live: S, note: "changed" };
}
/**
 * 把云会话使用的设置冻结槽（当前与已接受内容）转换为待审阅的变更记录。
 */
//@ chunk-61a1pjwa.js:31638-31942 placement
function servedSlotsToChanges(t, o) {
  return t.map((h) => {
    let u = h.live ?? "";
    return {
      change: {
        id: h.slot,
        path: h.path,
        resolvedPath: h.path,
        baseSha256: _gt(h.accepted),
        proposedSha256: _gt(u) ?? "",
        proposedContent: u,
        stagedAt: o.toISOString(),
        by: { tool: "Write", origin: "local", sessionId: "" },
      },
      current: h.accepted,
      readError: null,
      applicable: !0,
    };
  });
}
/**
 * 比较当前设置与已接受的冻结版本，给出可接受/冲突/过期状态。
 */
//@ chunk-61a1pjwa.js:32072-33656 placement
function compareServedSettings(t) {
  let o = new Map(t.files.map((file) => [file.path, file])),
    h = servedSlotsToChanges(t.files, t.now()),
    mapped = h.map(({ change: change }) => change),
    i = 0,
    S = (p) => {
      if (we(p.slot)) {
        let k = describeRecordState(t.store, { slot: p.slot, path: p.path }, t.readLive);
        return k === void 0 || k === "unreadable" ? p.live : k.accepted;
      }
      let found = readServedSettingsRecord(t.store, t.slots, t.readLive).files.find(
        (file) => file.slot === p.slot,
      );
      return found === void 0 ? p.live : found.accepted;
    };
  return {
    accepted: () => i,
    reviewed: h,
    readStore: async () => jsonStringify({ version: REVIEW_STORE_VERSION, entries: mapped }),
    writeStore: async () => {},
    deleteStore: async () => {},
    readTarget: async (p) => {
      let C = o.get(p);
      return C === void 0 ? null : S(C);
    },
    locate: async (p) => p,
    isSettingsFile: async (p) => o.has(p),
    configChangeBlocked: async (p, C, k) => {
      let v = o.get(p);
      return v === void 0 || t.gate === void 0 ? !0 : t.gate(CONFIG_CHANGE_SOURCES[v.slot], k);
    },
    afterApplied: () => {},
    now: t.now,
    writeTarget: async ({ path: path, content: content, blockedOnceWritten: blockedOnceWritten }) => {
      let v = o.get(path);
      if (v === void 0 || content !== (v.live ?? "")) return "changed";
      let T = await checkSettingsCopy(
        { name: basename(path), text: content, ...(t.shownDir !== void 0 && { dir: t.shownDir }) },
        blockedOnceWritten,
      );
      if (T !== "allowed") return T;
      if (S(v) !== v.accepted) return "changed";
      if (we(v.slot)) {
        if (readSettingsSnapshot(path, t.readLive) !== v.live) return "changed";
        return (t.store.recordFile(path, v.live, "person"), i++, "written");
      }
      if (isUnsafeSettingsPath(path)) return "redirected";
      let live = t.readLive(path);
      if (live === "unreadable" || _gt(live === "absent" ? null : Dq(live.text)) !== _gt(v.live))
        return "changed";
      if (isUnsafeSettingsPath(path)) return "redirected";
      t.store.recordFile(path, v.live, "person");
      let folder = t.store.folder(t.slots.key);
      if (folder === "unreadable")
        t.store.recordFolder(t.slots.key, {
          project: t.slots.project,
          local: t.slots.local,
          legacy: t.slots.legacy,
        });
      else if (folder !== "none" && folder[v.slot] !== path)
        t.store.recordFolder(t.slots.key, { ...folder, [v.slot]: path });
      return (i++, "written");
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
/**
 * 渲染云会话设置冻结版本的各槽（未变、已变、个人设置文件消失等）。
 */
//@ chunk-61a1pjwa.js:34584-37114 placement
function renderServedSettingsSlots(t) {
  let o = new Map(t.map((i) => [i.slot, i])),
    h = (i) => {
      let S = o.get(i.id);
      if (S !== void 0 && we(S.slot) && S.note === "changed")
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
        case void 0:
          return S?.live === null
            ? "The file is gone; cloud sessions keep using the version you accepted"
            : S?.accepted === null
              ? "There was no file here when you last accepted, so nothing in it counts until you accept it"
              : "Different from the version you accepted; cloud sessions keep using that one";
      }
    },
    any = t.some((i) => we(i.slot));
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
    discardLabel: void 0,
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
  return new Promise((S) => {
    t.render(
      e(AppRoot, {
        session: o,
        onChangeAppState: (p) => onChangeAppState(p, o),
        children: e(
          StagedSettingsReview,
          { changes: u.reviewed, deps: u, wording: renderServedSettingsSlots(h), onDone: S },
          i,
        ),
      }),
    );
  });
}
/**
 * claude 子命令：审阅并接受云会话使用的设置版本（remote_served_settings_freeze）。
 */
//@ chunk-61a1pjwa.js:37297-39048 placement
async function reviewServedSettingsFreeze(t, o, h) {
  let u = repoTierFileSlots(),
    i = describeNeedsTerminal({
      stdinIsTTY: process.stdin.isTTY === !0,
      stdoutIsTTY: process.stdout.isTTY === !0,
      verbFirst: kcr(),
      settingsGivenOnCommandLine: getFlagSettingsPath() !== void 0 || getFlagSettingsInline() !== null,
      allowedSources: getAllowedSettingSourcesAsConfigured(),
      configHomeRedirectedIntoFolder: checkSettingsPathFollowable(getClaudeConfigDir(), [getCwd(), ...qt(u)]),
    });
  if (i !== void 0) {
    (printCliError(i),
      await logFeatureBadAsync("remote_served_settings_freeze", "accept_refused"),
      await exitAfterAnalyticsFlush(1));
    return;
  }
  let S = createAcceptedSettingsStore(),
    p = configChangeBlocker(t, o, h),
    C,
    k = 0,
    v = [],
    T = getServedSettingsSlots(getSettingsFilePathForSource("userSettings"));
  for (let F = 0; ; F++) {
    let x = readServedSettingsRecord(S, u, readRepoTierFileText),
      mapped = T.map((I) => ({ path: I.path, waiting: describeRecordState(S, I, readRepoTierFileText) })),
      flattened = mapped.flatMap((I) => (I.waiting === "unreadable" ? [I.path] : [])),
      K = [
        ...mapped.flatMap((I) => (I.waiting === void 0 || I.waiting === "unreadable" ? [] : [I.waiting])),
        ...x.files,
      ];
    if (F === 0) {
      for (let I of [...flattened, ...x.unreadable])
        v.push(
          `${ct(I)} could not be read, so it cannot be shown or accepted. Cloud sessions keep using what you accepted before.`,
        );
      for (let I of x.linked)
        v.push(
          `${ct(I)} cannot be taken as this folder's own file: it is a link to another file, has a second name (a hard link), sits in a .claude folder that is a link, or could not be examined. So it cannot be accepted here, and cloud sessions keep using what you accepted before. A plain file with no other name, in a plain .claude folder you can read, changes that.`,
        );
    }
    if (K.length === 0) {
      if (k === 0 && flattened.length === 0 && x.unreadable.length === 0 && x.linked.length === 0)
        v.push(
          "Nothing is waiting. Cloud sessions already use your settings and this folder's on this computer.",
        );
      break;
    }
    let X = compareServedSettings({
      store: S,
      slots: u,
      files: K,
      readLive: readRepoTierFileText,
      gate: p,
      now: () => new Date(),
    });
    C ??= await createRoot(getBaseRenderOptions(!1));
    let ne = await renderStagedSettingsReview(C, t, K, X, F);
    if (ne !== void 0) v.push(ne);
    if (X.accepted() === 0) break;
    k += X.accepted();
  }
  (C?.unmount(),
    process.stdout.write(`${v.join(`
`)}
`),
    await logFeatureOkAsync("remote_served_settings_freeze", { op: lit("accept_command"), accepted: k }),
    await exitAfterAnalyticsFlush(0));
}
