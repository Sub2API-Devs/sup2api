/**
 * components/sendToProject/SendToProjectDialog.tsx
 *
 * 2.1.316 新增：“发送到项目”权限对话框
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e98td4c6.js (28)
 * attribution: placement 28
 */
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
import { BLANK_LOOKALIKE_RE, INVISIBLE_SYMBOL_RE } from "../../utils/emojiPatterns.js";
import {
  wrapTextToWidth,
  DRAFTED_BY_CLAUDE_TEXT,
  measureInstructionsRows,
  wrapCardText,
  countItemsFittingRows,
  ProjectProposalCard,
} from "../projects/ProjectProposalCard.js";
import {
  isRepoAccessUnverified,
  repoSlugOrEmpty,
  defaultCloudEnvironment,
} from "../../services/projects/repoContext.js";
import { isProposalEmpty } from "../../services/projects/proposalValidation.js";
import { stripPresentationFields, joinWithAnd_2 } from "../../tools/ContinueInProjectsTool/submit.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { MAX_VISIBLE_ITEMS } from "../permissions/wrapWidth.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  CHANNEL_ID_REGEX,
  getOwnerProjectChannel,
  ChannelApiError,
  isRetryableChannelError,
} from "../../services/projects/channelApi.js";
import { setupProposalSchema, normalizeProposal } from "../../services/projects/setupProposalSchema.js";
import {
  oneLineSummary,
  toolsUsedSessionSlot,
  toolsUsedDialogLine,
} from "../../services/projects/toolsUsedSummary.js";
import {
  drawnMessageFrom,
  MESSAGE_KEY,
  PANE_CONSENT_TOKEN_KEY,
  mintPaneConsent,
  PANE_APPROVED_ORIGIN_KEY,
  PANE_APPROVED_ENVIRONMENT_KEY,
  ENVIRONMENT_LOOKUP_FAILED_KEY,
  MESSAGE_DISCLOSURE,
  releaseTypedMessage,
} from "../../tools/ContinueInProjectsTool/ContinueInProjectsTool.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useInputClock } from "../../ink/components/Input.js";
import {
  useRecentInputWithin,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useAskPositionLabel } from "../permissions/PermissionRequestTitle.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useAppStateSession } from "../../state/AppState.js";
import { messageTitle, MESSAGE_REVEAL_NOTICE } from "../projects/messageRevealConfirm.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isAnthropicRepoText } from "../../utils/github/anthropicRepos.js";
import { scanFolderContext } from "../../services/projects/sessionScan.js";
import { NOTHING_ELSE_SENT_NOTICE, notSentLine } from "../../services/projects/disclosure.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { useRecentInputStamp, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";

//@ chunk-e98td4c6.js:15523-15527 placement
init_react_production();
//@ chunk-e98td4c6.js:15527-16853 placement
var SEND_TO_PROJECT_TEXT = " \xB7 ";
var CHOICE_INDENT = 4;
var HEADER_RESERVED_ROWS = 3;
var EMPTY_REPO_PLACEHOLDER = `${"\u9805".repeat(80)}\u2026`;
var LOOKUP_COPY_TEXT = "Send to your project (looking it up\u2026) with the following:";
var BLANK_GLYPH = "\u2423";
var IGNORABLE_CLASS = "\\p{Default_Ignorable_Code_Point}";
var regExp = new RegExp(IGNORABLE_CLASS, "gu");
var INVISIBLE_CLASS_RE_SOURCE = `(?:\\p{White_Space}|${BLANK_LOOKALIKE_RE.source}|${INVISIBLE_SYMBOL_RE.source}|${IGNORABLE_CLASS})`;
var regExp_2 = new RegExp(
  `(?! )${INVISIBLE_CLASS_RE_SOURCE}|(?<=^|${INVISIBLE_CLASS_RE_SOURCE}) | (?=$|${INVISIBLE_CLASS_RE_SOURCE})`,
  "gu",
);
var MESSAGE_MAX_LINES = 6;
var LOOKUP_ERROR_TEXT = {
  transient: "That project couldn\u2019t be looked up just now. Close and run /send-to-project again.",
  not_a_target:
    "That project can\u2019t take this session. Only a personal project that is not paused or archived can. Close and run /send-to-project again to pick another.",
  auth_or_access:
    "This login can\u2019t use that project. Check that you are signed in and that the project is yours, then close and run /send-to-project again.",
  request_failed:
    "That project was not found, or the server did not accept the request. Close and run /send-to-project again to pick another.",
  policy_disabled:
    "Claude Projects can\u2019t be reached with this session\u2019s provider or traffic settings, so that project couldn\u2019t be looked up.",
  invalid_input: "That project couldn\u2019t be looked up. Close and run /send-to-project again.",
  bad_response: "That project couldn\u2019t be looked up. Close and run /send-to-project again.",
};
var TAILSCALE_KIND_LABELS = {
  anthropic_cloud: "cloud",
  byoc: "self-hosted",
  self_hosted_pool: "self-hosted",
};
//@ chunk-e98td4c6.js:16853-19447 placement
function projectSummaryLines(args) {
  let { width, existing } = args;
  let project = existing === null ? undefined : existing.project;
  if (project === null) {
    let mapped = wrapTextToWidth(LOOKUP_ERROR_TEXT[existing?.failure ?? "transient"], Math.max(1, width)).map(
      (text, index) => ({
        key: `lead-${index}`,
        text,
      }),
    );
    return {
      rows: mapped,
      whole: {
        environment: true,
        repository: true,
      },
      rowsAtMost: mapped.length,
    };
  }
  if (args.oneMessage && existing !== null)
    return {
      rows: [],
      whole: {
        environment: true,
        repository: true,
      },
      rowsAtMost: project === undefined ? HEADER_RESERVED_ROWS : 0,
    };
  let sessionCount = args.proposal.sessions?.length ?? 0;
  let repoUnverified =
    args.attach &&
    args.detection?.repo.kind === "github" &&
    (!isRepoAccessUnverified(args.detection.repo) || args.monorepoEnvironment);
  let envName = args.environment != null ? sanitizeDialogText(args.environment.name) : "";
  let presentationFields =
    existing === null
      ? ["instructions", "icon", "color"].filter((field) => (args.proposal[field] ?? "") !== "")
      : [];
  let specs = [
    ...(existing === null
      ? [
          {
            key: "env",
            label: "Cloud environment",
            value: environmentStatusText(args).slice(envName.length),
            maxRows: MESSAGE_MAX_LINES,
            ...(args.environment != null && {
              bound: envName,
            }),
          },
          {
            key: "repository",
            label: "Repository",
            value: repoUnverified ? "" : detectionStatusText(args),
            maxRows: repoUnverified ? CHOICE_INDENT : HEADER_RESERVED_ROWS,
            underBullet: repoUnverified,
            ...(repoUnverified && {
              bound: detectionStatusText(args),
            }),
          },
        ]
      : []),
    {
      key: "brief",
      label: "Brief",
      value: isProposalEmpty(
        stripPresentationFields(args.proposal, existing === null ? "new" : "existing", "pane"),
      )
        ? "saved to project memory. No setup card is posted."
        : "saved to project memory and posted as the setup card",
      maxRows: 2,
    },
    ...(presentationFields.length > 0
      ? [
          {
            key: "settings",
            label: "Project settings",
            value: `${joinWithAnd_2(presentationFields)} from the brief`,
            maxRows: 2,
          },
        ]
      : []),
    ...(sessionCount > 0
      ? [
          {
            key: "threads",
            label: "Threads",
            value: `${sessionCount} on the setup card. You start ${sessionCount === 1 ? "it" : "them"} there.`,
            maxRows: 2,
          },
        ]
      : []),
    {
      key: "session",
      label: "This session",
      value: "the project can read it",
      maxRows: 2,
    },
  ];
  let mapped = (
    args.oneMessage ? specs.filter(({ key }) => key === "env" || key === "repository") : specs
  ).map(({ key, label, value, maxRows, underBullet, bound }) => {
    let rows =
      bound === undefined
        ? labeledLine(label, value, width, maxRows)
        : labeledWrappedLines(label, bound, value, width, maxRows, underBullet);
    let wholeRows =
      bound === undefined
        ? labeledLine(label, value, width, Number.MAX_SAFE_INTEGER)
        : labeledWrappedLines(label, bound, "", width, Number.MAX_SAFE_INTEGER, underBullet);
    return {
      key,
      rows,
      whole:
        wholeRows.length <= maxRows &&
        (bound === undefined ||
          wholeRows.every((wholeLine, index) => rows[index]?.startsWith(wholeLine.trimEnd()) === true)),
      rowsAtMost:
        (key === "env" && args.environment === undefined) ||
        (key === "repository" && args.detection === null && !args.detectFailed)
          ? key === "env"
            ? MESSAGE_MAX_LINES
            : CHOICE_INDENT
          : 0,
    };
  });
  let flattened = mapped.flatMap((spec) =>
    spec.rows.map((text, index) => ({
      key: `${spec.key}-${index}`,
      text,
    })),
  );
  let leadLines =
    existing === null
      ? args.oneMessage
        ? wrapToMaxLines("New personal project with this setup:", width).map((text, index) => ({
            key: `lead-${index}`,
            text,
          }))
        : quotedPreviewLines(
            "Create personal project ",
            args.projectName,
            " with the following setup:",
            width,
          )
      : project === undefined
        ? wrapToMaxLines(LOOKUP_COPY_TEXT, width).map((text, index) => ({
            key: `lead-${index}`,
            text,
          }))
        : quotedPreviewLines(
            "Send to personal project ",
            project.name !== "" ? project.name : "Untitled project",
            " with the following:",
            width,
            wrapToMaxLines(LOOKUP_COPY_TEXT, width).length,
          );
  return {
    rows: [...leadLines, ...flattened],
    whole: {
      environment: mapped.every((spec) => spec.key !== "env" || spec.whole),
      repository: mapped.every((spec) => spec.key !== "repository" || spec.whole),
    },
    rowsAtMost:
      (existing !== null && project === undefined
        ? Math.max(
            leadLines.length,
            quotedPreviewLines(
              "Send to personal project ",
              EMPTY_REPO_PLACEHOLDER,
              " with the following:",
              width,
            ).length,
          )
        : leadLines.length) +
      mapped.reduce((acc, spec) => acc + Math.max(spec.rows.length, spec.rowsAtMost), 0),
  };
}
//@ chunk-e98td4c6.js:19447-19481 placement
var filtered = Object.keys(LOOKUP_ERROR_TEXT).filter(isKnownErrorCode);
//@ chunk-e98td4c6.js:19481-19523 placement
function isKnownErrorCode(code) {
  return Object.hasOwn(LOOKUP_ERROR_TEXT, code);
}
//@ chunk-e98td4c6.js:19523-19562 placement
function replaceControlChars(text) {
  return text.replace(regExp_2, BLANK_GLYPH);
}
//@ chunk-e98td4c6.js:19562-19832 placement
function wrapGraphemes(text, width, maxWidth = width) {
  let lines = [];
  let currentLine = "";
  let currentWidth = 0;
  let max = Math.max(1, maxWidth);
  for (let { segment } of getGraphemeSegmenter().segment(replaceControlChars(text))) {
    let segmentWidth = bunStringWidth(segment);
    if (currentLine !== "" && currentWidth + segmentWidth > max) {
      max = Math.max(1, width);
      let trimmedLine = currentLine.trimEnd();
      let sliced = currentLine.slice(trimmedLine.length);
      let canKeepPrefix = trimmedLine !== "" && sliced !== "" && bunStringWidth(sliced) + segmentWidth <= max;
      lines.push(canKeepPrefix ? trimmedLine : currentLine);
      currentLine = canKeepPrefix ? sliced : "";
      currentWidth = canKeepPrefix ? bunStringWidth(sliced) : 0;
    }
    currentLine += segment;
    currentWidth += segmentWidth;
  }
  return [...lines, currentLine];
}
//@ chunk-e98td4c6.js:19832-20084 placement
function labeledLine(label, value, width, maxLines) {
  let prefix = `${SEND_TO_PROJECT_TEXT}${label}: `;
  let prefixFits = bunStringWidth(prefix) <= width / 2;
  let prefixWidth = bunStringWidth(prefixFits ? prefix : SEND_TO_PROJECT_TEXT);
  let wrappedLines = wrapTextToWidth(
    prefixFits ? value : `${label}: ${value}`,
    Math.max(1, width - prefixWidth),
  );
  let mapped = wrappedLines
    .slice(0, maxLines)
    .map(
      (line, index) =>
        (index === 0 ? (prefixFits ? prefix : SEND_TO_PROJECT_TEXT) : " ".repeat(prefixWidth)) + line,
    );
  let last = mapped.at(-1);
  if (wrappedLines.length > maxLines && last !== undefined)
    mapped[mapped.length - 1] = truncateToWidth(`${last}\u2026`, Math.max(1, width));
  return mapped;
}
//@ chunk-e98td4c6.js:20084-20858 placement
function labeledWrappedLines(label, text, value, width, maxRows, underBullet = false) {
  let max = Math.max(2, width);
  let inlineLabel = `${SEND_TO_PROJECT_TEXT}${label}: `;
  let prefixWidth = bunStringWidth(SEND_TO_PROJECT_TEXT);
  let prefixIndent =
    bunStringWidth(inlineLabel) <= max / 2 && !underBullet ? bunStringWidth(inlineLabel) : prefixWidth;
  let mapped = wrapTextToWidth(`${label}:`, max - prefixWidth).map(
    (line, index) => (index === 0 ? SEND_TO_PROJECT_TEXT : " ".repeat(prefixWidth)) + line,
  );
  let trailingPrefix = `${mapped.at(-1) ?? ""} `;
  let canAppendTrailing = max - bunStringWidth(trailingPrefix) >= 2;
  let words = value.trim() === "" ? [] : value.trim().split(" ");
  let lines = [
    ...mapped.slice(0, canAppendTrailing ? -1 : undefined),
    ...wrapGraphemes(
      text,
      max - prefixIndent,
      canAppendTrailing ? max - bunStringWidth(trailingPrefix) : max - prefixIndent,
    ).map(
      (wrapped, index) =>
        (canAppendTrailing && index === 0 ? trailingPrefix : " ".repeat(prefixIndent)) + wrapped,
    ),
  ];
  let wordIndex = 0;
  for (
    let word = words[wordIndex];
    word !== undefined && bunStringWidth(`${lines.at(-1)} ${word}`) <= max;
    word = words[wordIndex]
  ) {
    lines[lines.length - 1] = `${lines.at(-1)} ${word}`;
    wordIndex += 1;
  }
  if (wordIndex < words.length) {
    let lastLine = wordIndex === 0 ? (lines.at(-1) ?? "") : "";
    let sliced = lastLine.slice(lastLine.trimEnd().length);
    if (sliced !== "" && bunStringWidth(lastLine.trimEnd()) > prefixIndent)
      lines[lines.length - 1] = lastLine.trimEnd();
    let leadingSpaces = lastLine !== lines.at(-1) ? sliced : "";
    lines.push(
      ...wrapTextToWidth(
        words.slice(wordIndex).join(" "),
        Math.max(1, max - prefixIndent - bunStringWidth(leadingSpaces)),
      ).map((line, index) => " ".repeat(prefixIndent) + (index === 0 ? leadingSpaces : "") + line),
    );
  }
  let sliced = lines.slice(0, maxRows);
  let last = sliced.at(-1);
  if (lines.length > maxRows && last !== undefined)
    sliced[sliced.length - 1] = truncateToWidth(`${last}\u2026`, max);
  return sliced;
}
//@ chunk-e98td4c6.js:20858-21006 placement
function wrapToMaxLines(text, width) {
  let lines = wrapTextToWidth(text, Math.max(1, width));
  let sliced = lines.slice(0, HEADER_RESERVED_ROWS);
  let last = sliced.at(-1);
  if (lines.length > HEADER_RESERVED_ROWS && last !== undefined)
    sliced[sliced.length - 1] = truncateToWidth(`${last}\u2026`, Math.max(1, width));
  return sliced;
}
//@ chunk-e98td4c6.js:21006-21491 placement
function quotedPreviewLines(leadText, name, tailText, width, maxLines = 1) {
  let sanitizedName = replaceControlChars(sanitizeDialogText(name));
  let quotedName = `\u201C${sanitizedName}\u201D`;
  let max = Math.max(2, width);
  let leadLines = wrapTextToWidth(leadText.trimEnd(), max);
  let tailLines = wrapTextToWidth(tailText.trimStart(), max);
  let lastLeadPrefix = `${leadLines.at(-1) ?? ""} `;
  let availableWidth = max - bunStringWidth(lastLeadPrefix);
  let nameLines = wrapGraphemes(quotedName, max, availableWidth);
  let canInlineName =
    (bunStringWidth(quotedName) <= availableWidth ||
      (bunStringWidth(quotedName) > max && availableWidth >= 2)) &&
    leadLines.length - 1 + nameLines.length + tailLines.length >= maxLines;
  return (
    maxLines <= 1 && bunStringWidth(`${leadText}${quotedName}${tailText}`) <= width
      ? [`${leadText}${quotedName}${tailText}`]
      : [
          ...leadLines.slice(0, canInlineName ? -1 : undefined),
          ...(canInlineName
            ? nameLines.map((wrappedLine, index) =>
                index === 0 ? lastLeadPrefix + wrappedLine : wrappedLine,
              )
            : wrapGraphemes(quotedName, max)),
          ...tailLines,
        ]
  ).map((previewLine, index) => {
    let index_2 = previewLine.indexOf(quotedName);
    return {
      key: `lead-${index}`,
      text: previewLine,
      ...(index_2 >= 0 && {
        named: {
          before: previewLine.slice(0, index_2),
          name: sanitizedName,
          after: previewLine.slice(index_2 + quotedName.length),
        },
      }),
    };
  });
}
//@ chunk-e98td4c6.js:21491-22040 placement
function environmentStatusText(state) {
  let { environment } = state;
  if (environment === undefined) return "looking it up\u2026";
  if (environment === null)
    return state.environmentLookupFailed
      ? "your organization\u2019s default (yours could not be looked up)"
      : "your organization\u2019s default";
  let kindLabel = `(${TAILSCALE_KIND_LABELS[environment.kind] ?? "cloud"})`;
  let statusText =
    state.monorepoEnvironment &&
    state.attach &&
    state.detection?.repo.kind === "github" &&
    isRepoAccessUnverified(state.detection.repo)
      ? "If the server refuses it, your organization\u2019s default is used and no repository is added."
      : "If the server refuses it, your organization\u2019s default is used.";
  return `${sanitizeDialogText(environment.name)} ${kindLabel}. ${statusText}`;
}
//@ chunk-e98td4c6.js:22040-22596 placement
function detectionStatusText(state) {
  let { detection } = state;
  if (detection === null)
    return state.detectFailed
      ? "couldn\u2019t read this folder\u2019s git state. Close and run /send-to-project again."
      : "reading this folder\u2019s git remote\u2026";
  let repo = detection.repo;
  if (!state.attach) return "none";
  switch (repo.kind) {
    case "github":
      return `github.com/${repo.owner}/${repo.name}`;
    case "no-github-remote":
      return repo.hasOrigin
        ? "none. The origin is not a github.com repository. Add one from project settings afterwards."
        : "none. This repository has no origin remote.";
    case "no-git":
      return "none. This folder is not a git repository.";
  }
}
//@ chunk-e98td4c6.js:22596-22659 placement
function sanitizeDialogText(name) {
  return stripNonPrintable(name.replace(regExp, BLANK_GLYPH).replaceAll("\t", BLANK_GLYPH));
}
//@ chunk-e98td4c6.js:22659-23317 placement
var DIALOG_LAYOUT = 2;
var CHOICE_GAP = 2;
var LABEL_GAP = 2;
var BODY_GAP = 3;
var FOOTER_GAP = 5;
var EDIT_MESSAGE_PLACEHOLDER = "tell Claude what to change";
var MAX_MESSAGE_LINES = 10;
var CHOICE_HEIGHT = 2;
var CHOICE_MIN_HEIGHT = 1;
var CHOICE_ROW_WIDTH = 2;
var MAX_REPO_WIDTH = 80;
var CONFIRM_YES_AGAIN_TEXT = "Choose Yes again to confirm.";
var GIT_STATE_UNREADABLE_TEXT =
  "Couldn\u2019t read this folder\u2019s git state. Close and run /send-to-project again.";
var REPO_TOO_NARROW_TEXT =
  "This terminal is too narrow to show the repository in full. Widen it, or choose No.";
var CLOUD_ENV_TOO_NARROW_TEXT =
  "This terminal is too narrow to show the cloud environment in full. Widen it, or choose No.";
var REQUEST_TOO_SMALL_TEXT =
  "This terminal is too small to show the whole request. Make it taller or wider, or choose No.";
var DIALOG_HELP_LINES = [
  "Select with numbers [1-2] or up / down arrow keys. Then Enter to submit or Escape to cancel: 12",
  'Invalid selection "12". Enter a number between 1 and 2.',
];
//@ chunk-e98td4c6.js:23317-23891 placement
function dialogRowBudget(layout) {
  let fixedRows =
    layout.titleRows +
    layout.previewHeadRows +
    layout.warningRows +
    layout.noticeRows +
    (layout.oneMessage ? BODY_GAP : LABEL_GAP) +
    layout.feedbackExtraRows;
  let maxBlockLines = layout.oneMessage ? 0 : MAX_MESSAGE_LINES;
  let baseRows = fixedRows + layout.localRows + Math.max(maxBlockLines, layout.blockRows);
  let reservedRows =
    fixedRows +
    Math.max(layout.localRows, layout.localRowsAtMost) +
    Math.max(maxBlockLines, layout.blockRows, layout.blockRowsAtMost);
  let availableRows =
    layout.terminalRows -
    Math.max(
      reservedRows + DIALOG_LAYOUT + CHOICE_HEIGHT,
      layout.screenReader ? reservedRows + layout.widgetRows : 0,
    );
  let overflowRows = baseRows + DIALOG_LAYOUT + CHOICE_HEIGHT + CHOICE_MIN_HEIGHT - layout.terminalRows;
  return {
    preview:
      layout.oneMessage || layout.terminalColumns >= MAX_REPO_WIDTH
        ? availableRows
        : Math.min(MAX_VISIBLE_ITEMS - 1, availableRows),
    gapsDropped: Math.min(CHOICE_HEIGHT, Math.max(0, overflowRows)),
    tooShort:
      layout.optionsWrap ||
      layout.terminalColumns - LIST_OVERHEAD_ROWS < MAX_LIST_ROWS ||
      overflowRows > CHOICE_HEIGHT ||
      (layout.screenReader && baseRows + layout.widgetRows + CHOICE_MIN_HEIGHT > layout.terminalRows),
  };
}
//@ chunk-e98td4c6.js:23891-24349 placement
function requesterLabel(source) {
  switch (source?.type) {
    case "workflow-agent": {
      let approvalLabel = toApprovalLabel(source.workflowName);
      return approvalLabel === null
        ? "\xB7 from a workflow"
        : `\xB7 from the "${String(approvalLabel)}" workflow`;
    }
    case "subagent": {
      let approvalLabel = toApprovalLabel(source.agentName);
      return approvalLabel === null ? "\xB7 from a subagent" : `\xB7 from the ${String(approvalLabel)} agent`;
    }
    case "remote-agent":
      return "\xB7 from a remote cloud agent";
    case "plugin": {
      let approvalLabel = toApprovalLabel(source.pluginName);
      return approvalLabel === null ? "\xB7 from a plugin" : `\xB7 from the ${String(approvalLabel)} plugin`;
    }
    default:
      return null;
  }
}
//@ chunk-e98td4c6.js:24349-24696 placement
function dialogTitleLine(title, source, columns, wrapWidth, isScreenReaderEnabled, askPositionLabel) {
  let displayTitle = isScreenReaderEnabled ? `Permission Required: ${title}` : title;
  let max = Math.max(1, isScreenReaderEnabled ? columns : columns - 2);
  let requester = requesterLabel(source);
  let fitsBeside = requester !== null && bunStringWidth(displayTitle) + 1 + bunStringWidth(requester) <= max;
  let requesterRows = requester === null || fitsBeside ? [] : wrapTextToWidth(requester, wrapWidth);
  let fitsWithPosition =
    askPositionLabel !== null &&
    bunStringWidth(title) +
      (fitsBeside && requester !== null ? 1 + bunStringWidth(requester) : 0) +
      1 +
      bunStringWidth(askPositionLabel) <=
      columns - 2;
  let joined = [
    displayTitle,
    ...(fitsBeside && requester !== null ? [requester] : []),
    ...(fitsWithPosition && askPositionLabel !== null ? [askPositionLabel] : []),
  ].join(" ");
  return {
    rows:
      (isScreenReaderEnabled
        ? wrapTextToWidth(joined, max, true).length
        : fitsBeside
          ? 1
          : wrapTextToWidth(displayTitle, max).length) + requesterRows.length,
    beside: fitsBeside,
    sourceRows: requesterRows,
  };
}
//@ chunk-e98td4c6.js:24696-25058 placement
function parseSendToProjectInput(input) {
  let {
    project_name: projectName,
    project_id: projectId,
    proposal,
    attach_git_remote: attachGitRemote,
  } = input;
  if (
    typeof projectName !== "string" ||
    (projectId !== undefined && (typeof projectId !== "string" || !CHANNEL_ID_REGEX.test(projectId))) ||
    typeof attachGitRemote !== "boolean"
  )
    return null;
  let parsedProposal = setupProposalSchema().safeParse(proposal);
  if (!parsedProposal.success) return null;
  return {
    projectName: oneLineSummary(projectName),
    projectId: typeof projectId === "string" ? projectId : null,
    proposal: normalizeProposal(parsedProposal.data),
    attach: attachGitRemote,
    messageFrom: drawnMessageFrom(input[MESSAGE_KEY], parsedProposal.data),
  };
}
//@ chunk-e98td4c6.js:25058-25379 placement
function sendToProjectAnswer(choice, payload, session, originKey, environmentKey, toolsUsed, extra) {
  let input = withEditedMessage(payload.input, originKey, environmentKey);
  switch (choice) {
    case "yes": {
      let sendToProjectInput = parseSendToProjectInput(payload.input);
      return sendToProjectInput === null
        ? {
            behavior: "deny",
          }
        : {
            behavior: "allow",
            updatedInput: {
              ...input,
              [PANE_CONSENT_TOKEN_KEY]: mintPaneConsent(session, payload.requestId, input, {
                toolsUsed,
                messageFrom: sendToProjectInput.messageFrom,
              }),
            },
          };
    }
    case "no": {
      let feedbackText = extra?.trim() ?? "";
      return feedbackText === ""
        ? {
            behavior: "deny",
          }
        : {
            behavior: "deny",
            feedback: feedbackText,
          };
    }
  }
}
//@ chunk-e98td4c6.js:25379-25455 placement
function withEditedMessage(input, originKey, environmentKey) {
  return {
    ...input,
    [PANE_APPROVED_ORIGIN_KEY]: originKey,
    [PANE_APPROVED_ENVIRONMENT_KEY]: environmentKey ?? "",
    ...(environmentKey === null && {
      [ENVIRONMENT_LOOKUP_FAILED_KEY]: true,
    }),
  };
}
//@ chunk-e98td4c6.js:25455-25505 placement
function repoLabel(repo, repoText) {
  return repo === null ? "" : repoSlugOrEmpty(repo.repo, repoText);
}
//@ chunk-e98td4c6.js:25505-25815 placement
function sendToProjectOptions(projectId, canSend, initialValue, onChange, messageText) {
  return [
    ...(canSend
      ? [
          {
            label: sendConfirmLabel(projectId, messageText),
            value: "yes",
          },
        ]
      : []),
    messageText
      ? {
          type: "input",
          label: EDIT_MESSAGE_ACTION,
          value: "edit",
          placeholder: EDIT_MESSAGE_PLACEHOLDER,
          initialValue,
          onChange,
          ignoreEmptySubmit: true,
        }
      : {
          type: "input",
          label: "No",
          value: "no",
          placeholder: EDIT_MESSAGE_PLACEHOLDER,
          initialValue,
          onChange,
          allowEmptySubmitToCancel: true,
        },
    ...(messageText
      ? [
          {
            label: "No",
            value: "no",
          },
        ]
      : []),
  ];
}
//@ chunk-e98td4c6.js:25815-25841 placement
var EDIT_MESSAGE_ACTION = "Edit the message";
//@ chunk-e98td4c6.js:25841-25966 placement
function sendConfirmLabel(projectId, isExisting) {
  return isExisting
    ? projectId !== null
      ? "Send"
      : "Create and send"
    : projectId !== null
      ? "Yes, send it to the project"
      : "Yes, create the project";
}
//@ chunk-e98td4c6.js:25966-25988 placement
var MAX_LIST_ROWS = 20;
var LIST_OVERHEAD_ROWS = 8;
var CHOICE_TIMEOUT_MS = 500;
//@ chunk-e98td4c6.js:25988-26444 placement
function PreviewRow(props) {
  let $ = useMemoCache(8);
  let { row } = props;
  if (row.named === undefined) {
    let textElement;
    if ($[0] !== row.text) {
      textElement = jsxProd_default(Text, {
        children: row.text,
      });
      $[0] = row.text;
      $[1] = textElement;
    } else textElement = $[1];
    return textElement;
  }
  let labelElement;
  if ($[2] !== row.named.name) {
    labelElement = jsxProd_default(Text, {
      bold: true,
      children: row.named.name,
    });
    $[2] = row.named.name;
    $[3] = labelElement;
  } else labelElement = $[3];
  let rowElement;
  if ($[4] !== row.named.after || $[5] !== row.named.before || $[6] !== labelElement) {
    rowElement = jsxProd_default_2(Text, {
      children: [row.named.before, "\u201C", labelElement, "\u201D", row.named.after],
    });
    $[4] = row.named.after;
    $[5] = row.named.before;
    $[6] = labelElement;
    $[7] = rowElement;
  } else rowElement = $[7];
  return rowElement;
}
//@ chunk-e98td4c6.js:26444-33017 placement
/**
 * “发送到项目”权限对话框：显示项目、环境检测、预览与选项，带误触保护。
 */
function SendToProjectDialog({ payload, answer, wouldTakeAnswer }) {
  let inputClock = useInputClock();
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  function refuseInput() {
    if (isRecentInput() || refusedWithin()) {
      noteRefused();
      return true;
    }
    return false;
  }
  let openedAt = useMountTime();
  let settle = settleKey(epoch);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isFlipped, setFlipped] = useState(false);
  let [remountKey, setRemountKey] = useState(settle.remountKey);
  useEffect(() => {
    if (!(isScreenReaderEnabled && isFlipped)) setRemountKey(settle.remountKey);
  }, [settle.remountKey, isScreenReaderEnabled, isFlipped]);
  let { columns, rows } = useTerminalSize();
  let askPositionLabel = useAskPositionLabel();
  let shortcutDisplay = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let max = Math.max(MAX_LIST_ROWS, columns - LIST_OVERHEAD_ROWS);
  let [feedbackText, setFeedbackText] = useState("");
  let feedbackRef = useRef("");
  let [canEdit, setCanEdit] = useState(true);
  let parsedInput = useMemo(() => parseSendToProjectInput(payload.input), [payload.input]);
  let hasMessageFrom = parsedInput !== null && parsedInput.messageFrom !== null;
  let editValue = hasMessageFrom ? "edit" : "no";
  let feedbackExtraRows =
    feedbackText === "" && (!canEdit || isScreenReaderEnabled)
      ? 0
      : wrapTextToWidth(
          `${hasMessageFrom ? EDIT_MESSAGE_ACTION : "No"}, ${feedbackText === "" ? EDIT_MESSAGE_PLACEHOLDER : feedbackText}`,
          Math.max(1, columns - 14),
          true,
        ).length - 1;
  let { storageV5, credentials } = useTheme_2();
  let appStateSession = useAppStateSession();
  let projectId = parsedInput?.projectId ?? null;
  let title = hasMessageFrom
    ? messageTitle(parsedInput.projectName, projectId === null)
    : projectId !== null
      ? "Send this session to a Claude Project?"
      : "Create a Claude Project from this session?";
  let hasFocusChange = useRef(false);
  let onChange = useCallback((text) => {
    feedbackRef.current = text;
    hasFocusChange.current = true;
    setFlipped(true);
    setFeedbackText(text);
  }, []);
  let [detection, setDetection] = useState(null);
  let toolsUsed = toolsUsedSessionSlot.peek(appStateSession)?.current ?? null;
  let tools =
    toolsUsed !== null && detection !== null && toolsUsed.cwd === detection.cwd ? toolsUsed.tools : null;
  let toolsLine =
    toolsUsed !== null && (detection === null || toolsUsed.cwd === detection.cwd)
      ? toolsUsedDialogLine(toolsUsed.tools, "this computer")
      : null;
  let [detectFailed, setDetectFailed] = useState(false);
  let [existingProject, setExistingProject] = useState(undefined);
  let [projectError, setProjectError] = useState(null);
  useEffect(() => {
    if (projectId === null) return;
    let abortController = new AbortController();
    getOwnerProjectChannel(projectId, abortController.signal, credentials).then(
      (ownerProjectChannel) => {
        if (!abortController.signal.aborted) {
          setExistingProject({
            name: ownerProjectChannel.name,
          });
          noteRefused();
        }
      },
      (error) => {
        if (!abortController.signal.aborted) {
          logForDebugging(`send-to-project: project lookup failed: ${errorMessage(error)}`);
          setProjectError(
            error instanceof ChannelApiError && !isRetryableChannelError(error)
              ? error.telemetryCode
              : "transient",
          );
          setExistingProject(null);
        }
      },
    );
    return () => abortController.abort();
  }, [projectId, credentials, noteRefused]);
  let [environment, setEnvironment] = useState(undefined);
  let [envLookupFailed, setEnvLookupFailed] = useState(false);
  useEffect(() => {
    if (projectId !== null) return;
    let isMounted = true;
    defaultCloudEnvironment(storageV5, credentials).then(
      (environment) => {
        if (isMounted) {
          setEnvironment(environment);
          noteRefused();
        }
      },
      (error) => {
        logForDebugging(`send-to-project: environment lookup failed: ${errorMessage(error)}`);
        if (isMounted) {
          setEnvLookupFailed(true);
          setEnvironment(null);
          noteRefused();
        }
      },
    );
    return () => {
      isMounted = false;
    };
  }, [projectId, storageV5, credentials, noteRefused]);
  let isAnthropicRepo = isAnthropicRepoText(environment?.id);
  useEffect(() => {
    let abortController = new AbortController();
    scanFolderContext(
      {
        checkAccess: false,
        withSessions: false,
      },
      abortController.signal,
      storageV5,
    ).then(
      (detection) => {
        if (!abortController.signal.aborted) {
          setDetection(detection);
          noteRefused();
        }
      },
      (error) => {
        logForDebugging(`send-to-project: pane detection failed: ${errorMessage(error)}`);
        if (!abortController.signal.aborted) setDetectFailed(true);
      },
    );
    return () => abortController.abort();
  }, [storageV5, noteRefused]);
  let summary =
    parsedInput !== null
      ? projectSummaryLines({
          width: max - 2,
          projectName: parsedInput.projectName,
          proposal: parsedInput.proposal,
          existing:
            projectId !== null
              ? {
                  project: existingProject,
                  failure: projectError,
                }
              : null,
          environment,
          environmentLookupFailed: envLookupFailed,
          detection,
          detectFailed,
          attach: parsedInput.attach,
          monorepoEnvironment: isAnthropicRepo,
          oneMessage: hasMessageFrom,
        })
      : null;
  let rows_2 = summary?.rows ?? [];
  let envTooNarrow =
    environment != null && parsedInput !== null && projectId === null && summary?.whole.environment === false;
  let titleLine = dialogTitleLine(
    title,
    payload.requestSource,
    columns,
    max - 2,
    isScreenReaderEnabled,
    askPositionLabel,
  );
  let localRows = hasMessageFrom
    ? MESSAGE_DISCLOSURE.flatMap((line) => wrapToMaxLines(line, max - 2))
    : projectId !== null
      ? wrapToMaxLines(NOTHING_ELSE_SENT_NOTICE, max - 2)
      : detection !== null && parsedInput !== null
        ? wrapToMaxLines(
            notSentLine(
              detection,
              parsedInput.attach &&
                detection.repo.kind === "github" &&
                (!isRepoAccessUnverified(detection.repo) || isAnthropicRepo),
            ),
            max - 2,
          )
        : [];
  let noticeLines = wrapTextToWidth(hasMessageFrom ? MESSAGE_REVEAL_NOTICE : CONFIRM_YES_AGAIN_TEXT, max - 2);
  let repoTooNarrow =
    detection !== null &&
    detection.repo.kind === "github" &&
    parsedInput !== null &&
    parsedInput.attach &&
    projectId === null &&
    repoLabel(detection, environment?.id) !== "" &&
    summary?.whole.repository === false;
  let hasWarning = repoTooNarrow || envTooNarrow;
  let flattened = [
    ...(projectId !== null && detectFailed ? [GIT_STATE_UNREADABLE_TEXT] : []),
    ...(repoTooNarrow ? [REPO_TOO_NARROW_TEXT] : []),
    ...(envTooNarrow ? [CLOUD_ENV_TOO_NARROW_TEXT] : []),
  ].flatMap((line) => wrapTextToWidth(line, max - 2));
  let proposalBytes =
    parsedInput !== null ? Buffer.byteLength(jsonStringify(parsedInput.proposal), "utf8") : 0;
  let budgetInput = {
    terminalRows: rows,
    terminalColumns: columns,
    screenReader: isScreenReaderEnabled,
    titleRows: titleLine.rows,
    previewHeadRows: hasMessageFrom
      ? 1 +
        (parsedInput.messageFrom === "drafted"
          ? wrapTextToWidth(DRAFTED_BY_CLAUDE_TEXT, isScreenReaderEnabled ? columns : max - 5).length
          : 0)
      : isScreenReaderEnabled && parsedInput !== null
        ? measureInstructionsRows(parsedInput.proposal, proposalBytes, shortcutDisplay, columns)
        : CHOICE_GAP,
    warningRows: flattened.length,
    localRows: localRows.length,
    localRowsAtMost:
      !hasMessageFrom && projectId === null && detection === null && !detectFailed
        ? HEADER_RESERVED_ROWS
        : localRows.length,
    optionsWrap:
      FOOTER_GAP + bunStringWidth(hasMessageFrom ? EDIT_MESSAGE_ACTION : sendConfirmLabel(projectId, false)) >
      columns - 4,
    blockRows: rows_2.length,
    blockRowsAtMost: summary?.rowsAtMost ?? 0,
    feedbackExtraRows,
    noticeRows: noticeLines.length,
    widgetRows: isScreenReaderEnabled
      ? DIALOG_HELP_LINES.reduce(
          (acc, helpLine) => acc + wrapTextToWidth(helpLine, Math.max(1, columns)).length,
          0,
        )
      : 0,
    oneMessage: hasMessageFrom,
  };
  let budget = dialogRowBudget(budgetInput);
  let isReady =
    detection !== null && (projectId !== null ? existingProject !== undefined : environment !== undefined);
  let max_2 = Math.max(
    0,
    Math.floor(
      (isReady
        ? budget.preview
        : dialogRowBudget({
            ...budgetInput,
            localRows: 0,
            localRowsAtMost: 0,
            blockRows: 0,
            blockRowsAtMost: 0,
          }).preview) / 2,
    ),
  );
  let toolsLines = toolsLine !== null ? labeledLine("MCP tools used", toolsLine, max - 2, max_2 + 1) : [];
  let toolsLines_2 = toolsLines.length <= max_2 ? toolsLines : [];
  let { gapsDropped, tooShort } = budget;
  let tooShortLines = tooShort ? wrapTextToWidth(REQUEST_TOO_SMALL_TEXT, max - 2) : [];
  let max_3 = Math.max(CHOICE_MIN_HEIGHT, budget.preview - toolsLines_2.length - tooShortLines.length);
  let choiceGap = max_3 - CHOICE_ROW_WIDTH > CHOICE_MIN_HEIGHT ? 1 : 0;
  let cardRows =
    !isReady && max_3 === CHOICE_ROW_WIDTH + CHOICE_MIN_HEIGHT
      ? max_3 - 1
      : max_3 - CHOICE_ROW_WIDTH * choiceGap;
  let summaryLines = useMemo(
    () => (hasMessageFrom ? wrapCardText(parsedInput.proposal.summary ?? "", max - 2) : []),
    [hasMessageFrom, parsedInput, max],
  );
  let summaryTruncated =
    countItemsFittingRows(summaryLines, cardRows, isScreenReaderEnabled ? columns : null) <
    summaryLines.length;
  let showBothOptions = isScreenReaderEnabled || isReady;
  let optionsKey = `${remountKey}:${showBothOptions ? "both" : "no-only"}`;
  let [cachedOptions, setCachedOptions] = useState(() => ({
    key: optionsKey,
    options: sendToProjectOptions(projectId, showBothOptions, "", onChange, hasMessageFrom),
  }));
  let options =
    cachedOptions.key === optionsKey
      ? cachedOptions.options
      : sendToProjectOptions(projectId, showBothOptions, feedbackRef.current, onChange, hasMessageFrom);
  if (cachedOptions.key !== optionsKey)
    setCachedOptions({
      key: optionsKey,
      options,
    });
  let lastFocused = useRef("yes");
  let [yesPressedAt, setYesPressedAt] = useState(() => ({
    ready: isReady,
    at: isReady ? Date.now() : 0,
  }));
  if (yesPressedAt.ready !== isReady)
    setYesPressedAt({
      ready: isReady,
      at: isReady ? Date.now() : yesPressedAt.at,
    });
  let isWithinChoiceTimeout = useRecentInputStamp(yesPressedAt.at);
  let [needsPreparing, setNeedsPreparing] = useState(false);
  let [showNotice, setShowNotice] = useState(false);
  useEffect(() => {
    if (isReady) setNeedsPreparing(false);
  }, [isReady]);
  let onChoice = useCallback(
    (choice, typedMessage) => {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return false;
      }
      if (!wouldTakeAnswer()) return false;
      if (choice === "yes" && !isReady) {
        setNeedsPreparing(true);
        noteRefused();
        return false;
      }
      if (choice === "yes" && (hasWarning || tooShort || summaryTruncated)) {
        noteRefused();
        return false;
      }
      if (
        choice === "yes" &&
        (yesPressedAt.at === 0 ||
          isWithinRecentInput(inputClock, isWithinChoiceTimeout(yesPressedAt.at), CHOICE_TIMEOUT_MS))
      ) {
        setShowNotice(true);
        noteRefused();
        return false;
      }
      if (
        answer(
          sendToProjectAnswer(
            choice,
            payload,
            appStateSession,
            repoLabel(detection, environment?.id),
            envLookupFailed ? null : (environment?.id ?? ""),
            toolsLines_2.length > 0 ? tools : null,
            typedMessage,
          ),
        ) !== false &&
        choice === "no" &&
        (typedMessage?.trim() ?? "") !== ""
      )
        releaseTypedMessage(appStateSession);
      return true;
    },
    [
      answer,
      wouldTakeAnswer,
      payload,
      appStateSession,
      detection,
      isReady,
      hasWarning,
      tooShort,
      summaryTruncated,
      environment,
      envLookupFailed,
      tools,
      toolsLines_2.length,
      isRecentInput,
      refusedWithin,
      noteRefused,
      inputClock,
      yesPressedAt.at,
      isWithinChoiceTimeout,
    ],
  );
  if (parsedInput === null)
    return jsxProd_default(PermissionDialog_2, {
      title: "Create a Claude Project from this session?",
      requestSource: payload.requestSource,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        paddingX: 1,
        children: [
          jsxProd_default(Text, {
            color: "error",
            children:
              "The request is missing its project name, brief or repository choice, or the brief could not be read. There is nothing to approve.",
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(
              ConfirmSelect,
              {
                refuseInput,
                openedAt,
                hideIndexes: true,
                focus: "cancel",
                confirmLabel: "Dismiss",
                cancelLabel: "Dismiss",
                onConfirm: () => onChoice("no"),
                onCancel: () => onChoice("no"),
              },
              settle.remountKey,
            ),
          }),
        ],
      }),
    });
  return jsxProd_default_2(PermissionDialog_2, {
    title,
    requestSource: titleLine.beside ? payload.requestSource : undefined,
    children: [
      titleLine.sourceRows.length > 0
        ? jsxProd_default(Box, {
            flexDirection: "column",
            paddingX: 1,
            children: titleLine.sourceRows.map((children, index) =>
              jsxProd_default(
                Text,
                {
                  children,
                },
                `source-${index}`,
              ),
            ),
          })
        : null,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: gapsDropped < CHOICE_HEIGHT ? 1 : 0,
        paddingX: 1,
        children: [
          hasMessageFrom
            ? null
            : rows_2.map((row) =>
                jsxProd_default(
                  PreviewRow,
                  {
                    row,
                  },
                  row.key,
                ),
              ),
          tools !== null && isReady
            ? toolsLines_2.map((children, index) =>
                jsxProd_default(
                  Text,
                  {
                    children,
                  },
                  `tools-${index}`,
                ),
              )
            : null,
          [...flattened, ...tooShortLines].map((children, index) =>
            jsxProd_default(
              Text,
              {
                color: "warning",
                children,
              },
              `warning-${index}`,
            ),
          ),
          jsxProd_default(ProjectProposalCard, {
            proposal: parsedInput.proposal,
            proposalBytes,
            existingProject: projectId !== null,
            width: max - 2,
            maxRows: cardRows,
            marginTop: hasMessageFrom ? 0 : choiceGap,
            transcriptChord: shortcutDisplay,
            screenReaderColumns: isScreenReaderEnabled ? columns : null,
            messageFrom: parsedInput.messageFrom,
          }),
          hasMessageFrom && rows_2.length > 0
            ? jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: choiceGap,
                children: rows_2.map((row) =>
                  jsxProd_default(
                    PreviewRow,
                    {
                      row,
                    },
                    row.key,
                  ),
                ),
              })
            : null,
          localRows.length > 0
            ? jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: choiceGap,
                children: localRows.map((children, index) =>
                  jsxProd_default(
                    Text,
                    {
                      dimColor: true,
                      children,
                    },
                    `local-${index}`,
                  ),
                ),
              })
            : null,
          jsxProd_default(Box, {
            marginTop: gapsDropped > 0 ? 0 : 1,
            flexDirection: "column",
            children:
              detectFailed || (projectId !== null && existingProject === null)
                ? jsxProd_default(
                    ConfirmSelect,
                    {
                      refuseInput,
                      openedAt,
                      hideIndexes: true,
                      focus: "cancel",
                      confirmLabel: "Close",
                      cancelLabel: "Close",
                      onConfirm: () => onChoice("no"),
                      onCancel: () => onChoice("no"),
                    },
                    settle.remountKey,
                  )
                : jsxProd_default_2(Fragment, {
                    children: [
                      !isReady
                        ? jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [
                              "Preparing\u2026",
                              needsPreparing
                                ? ` Still reading the lines above. Choose ${hasMessageFrom ? "Send" : "Yes"} again in a moment.`
                                : "",
                            ],
                          })
                        : showNotice
                          ? noticeLines.map((children, index) =>
                              jsxProd_default(
                                Text,
                                {
                                  dimColor: true,
                                  children,
                                },
                                `notice-${index}`,
                              ),
                            )
                          : null,
                      jsxProd_default(
                        ModelSelector,
                        {
                          refuseInput,
                          selectedValue: NO_COMMITTED_ROW,
                          hideIndexes: !showBothOptions,
                          inlineDescriptions: true,
                          defaultFocusValue:
                            showBothOptions && !hasFocusChange.current ? lastFocused.current : editValue,
                          inputChromeWidth: 4,
                          options,
                          onChange: (optionValue) =>
                            onChoice(
                              optionValue === "yes" ? "yes" : "no",
                              optionValue === editValue ? feedbackRef.current : undefined,
                            ),
                          onFocus: (focusedValue) => {
                            setCanEdit(focusedValue === editValue);
                            if (showBothOptions && (focusedValue !== "yes" || settle.settled)) {
                              lastFocused.current = focusedValue;
                              if (focusedValue !== editValue) hasFocusChange.current = false;
                            }
                            if (focusedValue !== editValue) setFlipped(false);
                          },
                          onCancel: () => {
                            onChoice("no");
                          },
                        },
                        optionsKey,
                      ),
                    ],
                  }),
          }),
        ],
      }),
    ],
  });
}
export { SendToProjectDialog };
