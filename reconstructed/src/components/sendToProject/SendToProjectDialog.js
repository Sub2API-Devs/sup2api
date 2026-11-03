/**
 * components/sendToProject/SendToProjectDialog.tsx
 *
 * 2.1.316 新增：“发送到项目”权限对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6d9n2xk3.js (28)
 * attribution: placement 28
 */
import { init_react_production, y, P, R, Q, ce } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useInputClock } from "../../ink/components/Input.js";
import {
  useInputRefusalWindow,
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
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";

//@ chunk-6d9n2xk3.js:14339-14343 placement
init_react_production();
//@ chunk-6d9n2xk3.js:14343-15669 placement
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
//@ chunk-6d9n2xk3.js:15669-18263 placement
function projectSummaryLines(o) {
  let { width, existing } = o;
  let project = existing === null ? undefined : existing.project;
  if (project === null) {
    let mapped = wrapTextToWidth(LOOKUP_ERROR_TEXT[existing?.failure ?? "transient"], Math.max(1, width)).map(
      (text, x) => ({
        key: `lead-${x}`,
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
  if (o.oneMessage && existing !== null)
    return {
      rows: [],
      whole: {
        environment: true,
        repository: true,
      },
      rowsAtMost: project === undefined ? HEADER_RESERVED_ROWS : 0,
    };
  let p = o.proposal.sessions?.length ?? 0;
  let h =
    o.attach &&
    o.detection?.repo.kind === "github" &&
    (!isRepoAccessUnverified(o.detection.repo) || o.monorepoEnvironment);
  let c = o.environment != null ? sanitizeDialogText(o.environment.name) : "";
  let E =
    existing === null ? ["instructions", "icon", "color"].filter((f) => (o.proposal[f] ?? "") !== "") : [];
  let m = [
    ...(existing === null
      ? [
          {
            key: "env",
            label: "Cloud environment",
            value: environmentStatusText(o).slice(c.length),
            maxRows: MESSAGE_MAX_LINES,
            ...(o.environment != null && {
              bound: c,
            }),
          },
          {
            key: "repository",
            label: "Repository",
            value: h ? "" : detectionStatusText(o),
            maxRows: h ? CHOICE_INDENT : HEADER_RESERVED_ROWS,
            underBullet: h,
            ...(h && {
              bound: detectionStatusText(o),
            }),
          },
        ]
      : []),
    {
      key: "brief",
      label: "Brief",
      value: isProposalEmpty(
        stripPresentationFields(o.proposal, existing === null ? "new" : "existing", "pane"),
      )
        ? "saved to project memory. No setup card is posted."
        : "saved to project memory and posted as the setup card",
      maxRows: 2,
    },
    ...(E.length > 0
      ? [
          {
            key: "settings",
            label: "Project settings",
            value: `${joinWithAnd_2(E)} from the brief`,
            maxRows: 2,
          },
        ]
      : []),
    ...(p > 0
      ? [
          {
            key: "threads",
            label: "Threads",
            value: `${p} on the setup card. You start ${p === 1 ? "it" : "them"} there.`,
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
  let mapped = (o.oneMessage ? m.filter(({ key }) => key === "env" || key === "repository") : m).map(
    ({ key, label, value: x, maxRows, underBullet, bound }) => {
      let F =
        bound === undefined
          ? labeledLine(label, x, width, maxRows)
          : labeledWrappedLines(label, bound, x, width, maxRows, underBullet);
      let B =
        bound === undefined
          ? labeledLine(label, x, width, Number.MAX_SAFE_INTEGER)
          : labeledWrappedLines(label, bound, "", width, Number.MAX_SAFE_INTEGER, underBullet);
      return {
        key,
        rows: F,
        whole:
          B.length <= maxRows &&
          (bound === undefined || B.every((I, U) => F[U]?.startsWith(I.trimEnd()) === true)),
        rowsAtMost:
          (key === "env" && o.environment === undefined) ||
          (key === "repository" && o.detection === null && !o.detectFailed)
            ? key === "env"
              ? MESSAGE_MAX_LINES
              : CHOICE_INDENT
            : 0,
      };
    },
  );
  let flattened = mapped.flatMap((f) =>
    f.rows.map((text, x) => ({
      key: `${f.key}-${x}`,
      text,
    })),
  );
  let k =
    existing === null
      ? o.oneMessage
        ? wrapToMaxLines("New personal project with this setup:", width).map((text, g) => ({
            key: `lead-${g}`,
            text,
          }))
        : quotedPreviewLines("Create personal project ", o.projectName, " with the following setup:", width)
      : project === undefined
        ? wrapToMaxLines(LOOKUP_COPY_TEXT, width).map((text, g) => ({
            key: `lead-${g}`,
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
    rows: [...k, ...flattened],
    whole: {
      environment: mapped.every((f) => f.key !== "env" || f.whole),
      repository: mapped.every((f) => f.key !== "repository" || f.whole),
    },
    rowsAtMost:
      (existing !== null && project === undefined
        ? Math.max(
            k.length,
            quotedPreviewLines(
              "Send to personal project ",
              EMPTY_REPO_PLACEHOLDER,
              " with the following:",
              width,
            ).length,
          )
        : k.length) + mapped.reduce((acc, g) => acc + Math.max(g.rows.length, g.rowsAtMost), 0),
  };
}
//@ chunk-6d9n2xk3.js:18263-18297 placement
var filtered = Object.keys(LOOKUP_ERROR_TEXT).filter(isKnownErrorCode);
//@ chunk-6d9n2xk3.js:18297-18339 placement
function isKnownErrorCode(o) {
  return Object.hasOwn(LOOKUP_ERROR_TEXT, o);
}
//@ chunk-6d9n2xk3.js:18339-18378 placement
function replaceControlChars(o) {
  return o.replace(regExp_2, BLANK_GLYPH);
}
//@ chunk-6d9n2xk3.js:18378-18648 placement
function wrapGraphemes(o, i, l = i) {
  let u = [];
  let p = "";
  let h = 0;
  let max = Math.max(1, l);
  for (let { segment } of getGraphemeSegmenter().segment(replaceControlChars(o))) {
    let m = bunStringWidth(segment);
    if (p !== "" && h + m > max) {
      max = Math.max(1, i);
      let C = p.trimEnd();
      let sliced = p.slice(C.length);
      let A = C !== "" && sliced !== "" && bunStringWidth(sliced) + m <= max;
      u.push(A ? C : p);
      p = A ? sliced : "";
      h = A ? bunStringWidth(sliced) : 0;
    }
    p += segment;
    h += m;
  }
  return [...u, p];
}
//@ chunk-6d9n2xk3.js:18648-18900 placement
function labeledLine(label, i, width, u) {
  let p = `${SEND_TO_PROJECT_TEXT}${label}: `;
  let h = bunStringWidth(p) <= width / 2;
  let c = bunStringWidth(h ? p : SEND_TO_PROJECT_TEXT);
  let E = wrapTextToWidth(h ? i : `${label}: ${i}`, Math.max(1, width - c));
  let mapped = E.slice(0, u).map((S, A) => (A === 0 ? (h ? p : SEND_TO_PROJECT_TEXT) : " ".repeat(c)) + S);
  let last = mapped.at(-1);
  if (E.length > u && last !== undefined)
    mapped[mapped.length - 1] = truncateToWidth(`${last}\u2026`, Math.max(1, width));
  return mapped;
}
//@ chunk-6d9n2xk3.js:18900-19674 placement
function labeledWrappedLines(label, bound, l, width, p, underBullet = false) {
  let max = Math.max(2, width);
  let E = `${SEND_TO_PROJECT_TEXT}${label}: `;
  let m = bunStringWidth(SEND_TO_PROJECT_TEXT);
  let C = bunStringWidth(E) <= max / 2 && !underBullet ? bunStringWidth(E) : m;
  let mapped = wrapTextToWidth(`${label}:`, max - m).map(
    (T, F) => (F === 0 ? SEND_TO_PROJECT_TEXT : " ".repeat(m)) + T,
  );
  let A = `${mapped.at(-1) ?? ""} `;
  let k = max - bunStringWidth(A) >= 2;
  let f = l.trim() === "" ? [] : l.trim().split(" ");
  let g = [
    ...mapped.slice(0, k ? -1 : undefined),
    ...wrapGraphemes(bound, max - C, k ? max - bunStringWidth(A) : max - C).map(
      (T, F) => (k && F === 0 ? A : " ".repeat(C)) + T,
    ),
  ];
  let x = 0;
  for (let T = f[x]; T !== undefined && bunStringWidth(`${g.at(-1)} ${T}`) <= max; T = f[x]) {
    g[g.length - 1] = `${g.at(-1)} ${T}`;
    x += 1;
  }
  if (x < f.length) {
    let T = x === 0 ? (g.at(-1) ?? "") : "";
    let sliced = T.slice(T.trimEnd().length);
    if (sliced !== "" && bunStringWidth(T.trimEnd()) > C) g[g.length - 1] = T.trimEnd();
    let B = T !== g.at(-1) ? sliced : "";
    g.push(
      ...wrapTextToWidth(f.slice(x).join(" "), Math.max(1, max - C - bunStringWidth(B))).map(
        (I, U) => " ".repeat(C) + (U === 0 ? B : "") + I,
      ),
    );
  }
  let sliced = g.slice(0, p);
  let last = sliced.at(-1);
  if (g.length > p && last !== undefined) sliced[sliced.length - 1] = truncateToWidth(`${last}\u2026`, max);
  return sliced;
}
//@ chunk-6d9n2xk3.js:19674-19822 placement
function wrapToMaxLines(o, width) {
  let l = wrapTextToWidth(o, Math.max(1, width));
  let sliced = l.slice(0, HEADER_RESERVED_ROWS);
  let last = sliced.at(-1);
  if (l.length > HEADER_RESERVED_ROWS && last !== undefined)
    sliced[sliced.length - 1] = truncateToWidth(`${last}\u2026`, Math.max(1, width));
  return sliced;
}
//@ chunk-6d9n2xk3.js:19822-20307 placement
function quotedPreviewLines(o, i, l, width, p = 1) {
  let h = replaceControlChars(sanitizeDialogText(i));
  let c = `\u201C${h}\u201D`;
  let max = Math.max(2, width);
  let m = wrapTextToWidth(o.trimEnd(), max);
  let C = wrapTextToWidth(l.trimStart(), max);
  let S = `${m.at(-1) ?? ""} `;
  let A = max - bunStringWidth(S);
  let k = wrapGraphemes(c, max, A);
  let f =
    (bunStringWidth(c) <= A || (bunStringWidth(c) > max && A >= 2)) &&
    m.length - 1 + k.length + C.length >= p;
  return (
    p <= 1 && bunStringWidth(`${o}${c}${l}`) <= width
      ? [`${o}${c}${l}`]
      : [
          ...m.slice(0, f ? -1 : undefined),
          ...(f ? k.map((g, x) => (x === 0 ? S + g : g)) : wrapGraphemes(c, max)),
          ...C,
        ]
  ).map((g, x) => {
    let index = g.indexOf(c);
    return {
      key: `lead-${x}`,
      text: g,
      ...(index >= 0 && {
        named: {
          before: g.slice(0, index),
          name: h,
          after: g.slice(index + c.length),
        },
      }),
    };
  });
}
//@ chunk-6d9n2xk3.js:20307-20856 placement
function environmentStatusText(o) {
  let { environment } = o;
  if (environment === undefined) return "looking it up\u2026";
  if (environment === null)
    return o.environmentLookupFailed
      ? "your organization\u2019s default (yours could not be looked up)"
      : "your organization\u2019s default";
  let l = `(${TAILSCALE_KIND_LABELS[environment.kind] ?? "cloud"})`;
  let u =
    o.monorepoEnvironment &&
    o.attach &&
    o.detection?.repo.kind === "github" &&
    isRepoAccessUnverified(o.detection.repo)
      ? "If the server refuses it, your organization\u2019s default is used and no repository is added."
      : "If the server refuses it, your organization\u2019s default is used.";
  return `${sanitizeDialogText(environment.name)} ${l}. ${u}`;
}
//@ chunk-6d9n2xk3.js:20856-21412 placement
function detectionStatusText(o) {
  let { detection } = o;
  if (detection === null)
    return o.detectFailed
      ? "couldn\u2019t read this folder\u2019s git state. Close and run /send-to-project again."
      : "reading this folder\u2019s git remote\u2026";
  let repo = detection.repo;
  if (!o.attach) return "none";
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
//@ chunk-6d9n2xk3.js:21412-21475 placement
function sanitizeDialogText(name) {
  return stripNonPrintable(name.replace(regExp, BLANK_GLYPH).replaceAll("\t", BLANK_GLYPH));
}
//@ chunk-6d9n2xk3.js:21475-22133 placement
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
//@ chunk-6d9n2xk3.js:22133-22708 placement
function dialogRowBudget(o) {
  let i =
    o.titleRows +
    o.previewHeadRows +
    o.warningRows +
    o.noticeRows +
    (o.oneMessage ? BODY_GAP : LABEL_GAP) +
    o.feedbackExtraRows;
  let l = o.oneMessage ? 0 : MAX_MESSAGE_LINES;
  let u = i + o.localRows + Math.max(l, o.blockRows);
  let p = i + Math.max(o.localRows, o.localRowsAtMost) + Math.max(l, o.blockRows, o.blockRowsAtMost);
  let h = o.terminalRows - Math.max(p + DIALOG_LAYOUT + CHOICE_HEIGHT, o.screenReader ? p + o.widgetRows : 0);
  let c = u + DIALOG_LAYOUT + CHOICE_HEIGHT + CHOICE_MIN_HEIGHT - o.terminalRows;
  return {
    preview: o.oneMessage || o.terminalColumns >= MAX_REPO_WIDTH ? h : Math.min(MAX_VISIBLE_ITEMS - 1, h),
    gapsDropped: Math.min(CHOICE_HEIGHT, Math.max(0, c)),
    tooShort:
      o.optionsWrap ||
      o.terminalColumns - LIST_OVERHEAD_ROWS < MAX_LIST_ROWS ||
      c > CHOICE_HEIGHT ||
      (o.screenReader && u + o.widgetRows + CHOICE_MIN_HEIGHT > o.terminalRows),
  };
}
//@ chunk-6d9n2xk3.js:22708-23166 placement
function requesterLabel(o) {
  switch (o?.type) {
    case "workflow-agent": {
      let approvalLabel = toApprovalLabel(o.workflowName);
      return approvalLabel === null
        ? "\xB7 from a workflow"
        : `\xB7 from the "${String(approvalLabel)}" workflow`;
    }
    case "subagent": {
      let approvalLabel = toApprovalLabel(o.agentName);
      return approvalLabel === null ? "\xB7 from a subagent" : `\xB7 from the ${String(approvalLabel)} agent`;
    }
    case "remote-agent":
      return "\xB7 from a remote cloud agent";
    case "plugin": {
      let approvalLabel = toApprovalLabel(o.pluginName);
      return approvalLabel === null ? "\xB7 from a plugin" : `\xB7 from the ${String(approvalLabel)} plugin`;
    }
    default:
      return null;
  }
}
//@ chunk-6d9n2xk3.js:23166-23513 placement
function dialogTitleLine(o, requestSource, columns, u, isScreenReaderEnabled, askPositionLabel) {
  let c = isScreenReaderEnabled ? `Permission Required: ${o}` : o;
  let max = Math.max(1, isScreenReaderEnabled ? columns : columns - 2);
  let m = requesterLabel(requestSource);
  let C = m !== null && bunStringWidth(c) + 1 + bunStringWidth(m) <= max;
  let S = m === null || C ? [] : wrapTextToWidth(m, u);
  let A =
    askPositionLabel !== null &&
    bunStringWidth(o) +
      (C && m !== null ? 1 + bunStringWidth(m) : 0) +
      1 +
      bunStringWidth(askPositionLabel) <=
      columns - 2;
  let joined = [
    c,
    ...(C && m !== null ? [m] : []),
    ...(A && askPositionLabel !== null ? [askPositionLabel] : []),
  ].join(" ");
  return {
    rows:
      (isScreenReaderEnabled
        ? wrapTextToWidth(joined, max, true).length
        : C
          ? 1
          : wrapTextToWidth(c, max).length) + S.length,
    beside: C,
    sourceRows: S,
  };
}
//@ chunk-6d9n2xk3.js:23513-23875 placement
function parseSendToProjectInput(o) {
  let { project_name: projectName, project_id: projectId, proposal, attach_git_remote: attachGitRemote } = o;
  if (
    typeof projectName !== "string" ||
    (projectId !== undefined && (typeof projectId !== "string" || !CHANNEL_ID_REGEX.test(projectId))) ||
    typeof attachGitRemote !== "boolean"
  )
    return null;
  let h = setupProposalSchema().safeParse(proposal);
  if (!h.success) return null;
  return {
    projectName: oneLineSummary(projectName),
    projectId: typeof projectId === "string" ? projectId : null,
    proposal: normalizeProposal(h.data),
    attach: attachGitRemote,
    messageFrom: drawnMessageFrom(o[MESSAGE_KEY], h.data),
  };
}
//@ chunk-6d9n2xk3.js:23875-24196 placement
function sendToProjectAnswer(o, payload, appStateSession, u, p, toolsUsed, c) {
  let E = withEditedMessage(payload.input, u, p);
  switch (o) {
    case "yes": {
      let sendToProjectInput = parseSendToProjectInput(payload.input);
      return sendToProjectInput === null
        ? {
            behavior: "deny",
          }
        : {
            behavior: "allow",
            updatedInput: {
              ...E,
              [PANE_CONSENT_TOKEN_KEY]: mintPaneConsent(appStateSession, payload.requestId, E, {
                toolsUsed,
                messageFrom: sendToProjectInput.messageFrom,
              }),
            },
          };
    }
    case "no": {
      let m = c?.trim() ?? "";
      return m === ""
        ? {
            behavior: "deny",
          }
        : {
            behavior: "deny",
            feedback: m,
          };
    }
  }
}
//@ chunk-6d9n2xk3.js:24196-24272 placement
function withEditedMessage(o, i, l) {
  return {
    ...o,
    [PANE_APPROVED_ORIGIN_KEY]: i,
    [PANE_APPROVED_ENVIRONMENT_KEY]: l ?? "",
    ...(l === null && {
      [ENVIRONMENT_LOOKUP_FAILED_KEY]: true,
    }),
  };
}
//@ chunk-6d9n2xk3.js:24272-24322 placement
function repoLabel(o, id) {
  return o === null ? "" : repoSlugOrEmpty(o.repo, id);
}
//@ chunk-6d9n2xk3.js:24322-24632 placement
function sendToProjectOptions(projectId, i, initialValue, onChange, p) {
  return [
    ...(i
      ? [
          {
            label: sendConfirmLabel(projectId, p),
            value: "yes",
          },
        ]
      : []),
    p
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
    ...(p
      ? [
          {
            label: "No",
            value: "no",
          },
        ]
      : []),
  ];
}
//@ chunk-6d9n2xk3.js:24632-24658 placement
var EDIT_MESSAGE_ACTION = "Edit the message";
//@ chunk-6d9n2xk3.js:24658-24783 placement
function sendConfirmLabel(o, i) {
  return i
    ? o !== null
      ? "Send"
      : "Create and send"
    : o !== null
      ? "Yes, send it to the project"
      : "Yes, create the project";
}
//@ chunk-6d9n2xk3.js:24783-24805 placement
var MAX_LIST_ROWS = 20;
var LIST_OVERHEAD_ROWS = 8;
var CHOICE_TIMEOUT_MS = 500;
//@ chunk-6d9n2xk3.js:24805-25261 placement
function PreviewRow(props) {
  let l = w(8);
  let { row } = props;
  if (row.named === undefined) {
    let u;
    if (l[0] !== row.text) {
      u = jsxProd_default(Text, {
        children: row.text,
      });
      l[0] = row.text;
      l[1] = u;
    } else u = l[1];
    return u;
  }
  let u;
  if (l[2] !== row.named.name) {
    u = jsxProd_default(Text, {
      bold: true,
      children: row.named.name,
    });
    l[2] = row.named.name;
    l[3] = u;
  } else u = l[3];
  let p;
  if (l[4] !== row.named.after || l[5] !== row.named.before || l[6] !== u) {
    p = jsxProd_default_2(Text, {
      children: [row.named.before, "\u201C", u, "\u201D", row.named.after],
    });
    l[4] = row.named.after;
    l[5] = row.named.before;
    l[6] = u;
    l[7] = p;
  } else p = l[7];
  return p;
}
//@ chunk-6d9n2xk3.js:25261-31759 placement
/**
 * “发送到项目”权限对话框：显示项目、环境检测、预览与选项，带误触保护。
 */
function SendToProjectDialog({ payload, answer, wouldTakeAnswer }) {
  let inputClock = useInputClock();
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  function m() {
    if (inputRefusalWindow() || refusedWithin()) {
      noteRefused();
      return true;
    }
    return false;
  }
  let openedAt = useMountTime();
  let S = settleKey(epoch);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [f, g] = y(false);
  let [remountKey, setRemountKey] = y(S.remountKey);
  P(() => {
    if (!(isScreenReaderEnabled && f)) setRemountKey(S.remountKey);
  }, [S.remountKey, isScreenReaderEnabled, f]);
  let { columns, rows } = useTerminalSize();
  let askPositionLabel = useAskPositionLabel();
  let shortcutDisplay = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let max = Math.max(MAX_LIST_ROWS, columns - LIST_OVERHEAD_ROWS);
  let [U, _o] = y("");
  let we = R("");
  let [jo, No] = y(true);
  let N = Q(() => parseSendToProjectInput(payload.input), [payload.input]);
  let v = N !== null && N.messageFrom !== null;
  let z = v ? "edit" : "no";
  let feedbackExtraRows =
    U === "" && (!jo || isScreenReaderEnabled)
      ? 0
      : wrapTextToWidth(
          `${v ? EDIT_MESSAGE_ACTION : "No"}, ${U === "" ? EDIT_MESSAGE_PLACEHOLDER : U}`,
          Math.max(1, columns - 14),
          true,
        ).length - 1;
  let { storageV5, credentials } = useTheme_2();
  let appStateSession = useAppStateSession();
  let projectId = N?.projectId ?? null;
  let De = v
    ? messageTitle(N.projectName, projectId === null)
    : projectId !== null
      ? "Send this session to a Claude Project?"
      : "Create a Claude Project from this session?";
  let Re = R(false);
  let onChange = ce((a) => {
    we.current = a;
    Re.current = true;
    g(true);
    _o(a);
  }, []);
  let [context, xo] = y(null);
  let Y = toolsUsedSessionSlot.peek(appStateSession)?.current ?? null;
  let tools = Y !== null && context !== null && Y.cwd === context.cwd ? Y.tools : null;
  let We =
    Y !== null && (context === null || Y.cwd === context.cwd)
      ? toolsUsedDialogLine(Y.tools, "this computer")
      : null;
  let [le, Mo] = y(false);
  let [Ee, Be] = y(undefined);
  let [Ao, vo] = y(null);
  P(() => {
    if (projectId === null) return;
    let abortController = new AbortController();
    getOwnerProjectChannel(projectId, abortController.signal, credentials).then(
      (ownerProjectChannel) => {
        if (!abortController.signal.aborted) {
          Be({
            name: ownerProjectChannel.name,
          });
          noteRefused();
        }
      },
      (error) => {
        if (!abortController.signal.aborted) {
          logForDebugging(`send-to-project: project lookup failed: ${errorMessage(error)}`);
          vo(
            error instanceof ChannelApiError && !isRetryableChannelError(error)
              ? error.telemetryCode
              : "transient",
          );
          Be(null);
        }
      },
    );
    return () => abortController.abort();
  }, [projectId, credentials, noteRefused]);
  let [G, Ge] = y(undefined);
  let [ye, Io] = y(false);
  P(() => {
    if (projectId !== null) return;
    let a = true;
    defaultCloudEnvironment(storageV5, credentials).then(
      (b) => {
        if (a) {
          Ge(b);
          noteRefused();
        }
      },
      (error) => {
        logForDebugging(`send-to-project: environment lookup failed: ${errorMessage(error)}`);
        if (a) {
          Io(true);
          Ge(null);
          noteRefused();
        }
      },
    );
    return () => {
      a = false;
    };
  }, [projectId, storageV5, credentials, noteRefused]);
  let Ue = isAnthropicRepoText(G?.id);
  P(() => {
    let abortController = new AbortController();
    scanFolderContext(
      {
        checkAccess: false,
        withSessions: false,
      },
      abortController.signal,
      storageV5,
    ).then(
      (b) => {
        if (!abortController.signal.aborted) {
          xo(b);
          noteRefused();
        }
      },
      (error) => {
        logForDebugging(`send-to-project: pane detection failed: ${errorMessage(error)}`);
        if (!abortController.signal.aborted) Mo(true);
      },
    );
    return () => abortController.abort();
  }, [storageV5, noteRefused]);
  let ae =
    N !== null
      ? projectSummaryLines({
          width: max - 2,
          projectName: N.projectName,
          proposal: N.proposal,
          existing:
            projectId !== null
              ? {
                  project: Ee,
                  failure: Ao,
                }
              : null,
          environment: G,
          environmentLookupFailed: ye,
          detection: context,
          detectFailed: le,
          attach: N.attach,
          monorepoEnvironment: Ue,
          oneMessage: v,
        })
      : null;
  let rows_2 = ae?.rows ?? [];
  let Ke = G != null && N !== null && projectId === null && ae?.whole.environment === false;
  let pe = dialogTitleLine(
    De,
    payload.requestSource,
    columns,
    max - 2,
    isScreenReaderEnabled,
    askPositionLabel,
  );
  let de = v
    ? MESSAGE_DISCLOSURE.flatMap((a) => wrapToMaxLines(a, max - 2))
    : projectId !== null
      ? wrapToMaxLines(NOTHING_ELSE_SENT_NOTICE, max - 2)
      : context !== null && N !== null
        ? wrapToMaxLines(
            notSentLine(
              context,
              N.attach && context.repo.kind === "github" && (!isRepoAccessUnverified(context.repo) || Ue),
            ),
            max - 2,
          )
        : [];
  let Ye = wrapTextToWidth(v ? MESSAGE_REVEAL_NOTICE : CONFIRM_YES_AGAIN_TEXT, max - 2);
  let Ve =
    context !== null &&
    context.repo.kind === "github" &&
    N !== null &&
    N.attach &&
    projectId === null &&
    repoLabel(context, G?.id) !== "" &&
    ae?.whole.repository === false;
  let qe = Ve || Ke;
  let flattened = [
    ...(projectId !== null && le ? [GIT_STATE_UNREADABLE_TEXT] : []),
    ...(Ve ? [REPO_TOO_NARROW_TEXT] : []),
    ...(Ke ? [CLOUD_ENV_TOO_NARROW_TEXT] : []),
  ].flatMap((a) => wrapTextToWidth(a, max - 2));
  let Xe = N !== null ? Buffer.byteLength(jsonStringify(N.proposal), "utf8") : 0;
  let ze = {
    terminalRows: rows,
    terminalColumns: columns,
    screenReader: isScreenReaderEnabled,
    titleRows: pe.rows,
    previewHeadRows: v
      ? 1 +
        (N.messageFrom === "drafted"
          ? wrapTextToWidth(DRAFTED_BY_CLAUDE_TEXT, isScreenReaderEnabled ? columns : max - 5).length
          : 0)
      : isScreenReaderEnabled && N !== null
        ? measureInstructionsRows(N.proposal, Xe, shortcutDisplay, columns)
        : CHOICE_GAP,
    warningRows: flattened.length,
    localRows: de.length,
    localRowsAtMost: !v && projectId === null && context === null && !le ? HEADER_RESERVED_ROWS : de.length,
    optionsWrap:
      FOOTER_GAP + bunStringWidth(v ? EDIT_MESSAGE_ACTION : sendConfirmLabel(projectId, false)) > columns - 4,
    blockRows: rows_2.length,
    blockRowsAtMost: ae?.rowsAtMost ?? 0,
    feedbackExtraRows,
    noticeRows: Ye.length,
    widgetRows: isScreenReaderEnabled
      ? DIALOG_HELP_LINES.reduce((acc, b) => acc + wrapTextToWidth(b, Math.max(1, columns)).length, 0)
      : 0,
    oneMessage: v,
  };
  let Se = dialogRowBudget(ze);
  let W = context !== null && (projectId !== null ? Ee !== undefined : G !== undefined);
  let max_2 = Math.max(
    0,
    Math.floor(
      (W
        ? Se.preview
        : dialogRowBudget({
            ...ze,
            localRows: 0,
            localRowsAtMost: 0,
            blockRows: 0,
            blockRowsAtMost: 0,
          }).preview) / 2,
    ),
  );
  let Ze = We !== null ? labeledLine("MCP tools used", We, max - 2, max_2 + 1) : [];
  let me = Ze.length <= max_2 ? Ze : [];
  let { gapsDropped, tooShort } = Se;
  let oo = tooShort ? wrapTextToWidth(REQUEST_TOO_SMALL_TEXT, max - 2) : [];
  let max_3 = Math.max(CHOICE_MIN_HEIGHT, Se.preview - me.length - oo.length);
  let ge = max_3 - CHOICE_ROW_WIDTH > CHOICE_MIN_HEIGHT ? 1 : 0;
  let no = !W && max_3 === CHOICE_ROW_WIDTH + CHOICE_MIN_HEIGHT ? max_3 - 1 : max_3 - CHOICE_ROW_WIDTH * ge;
  let to = Q(() => (v ? wrapCardText(N.proposal.summary ?? "", max - 2) : []), [v, N, max]);
  let ro = countItemsFittingRows(to, no, isScreenReaderEnabled ? columns : null) < to.length;
  let V = isScreenReaderEnabled || W;
  let J = `${remountKey}:${V ? "both" : "no-only"}`;
  let [Ce, Oo] = y(() => ({
    key: J,
    options: sendToProjectOptions(projectId, V, "", onChange, v),
  }));
  let options = Ce.key === J ? Ce.options : sendToProjectOptions(projectId, V, we.current, onChange, v);
  if (Ce.key !== J)
    Oo({
      key: J,
      options,
    });
  let io = R("yes");
  let ke = R(null);
  let [$o, lo] = y(false);
  let [Lo, Do] = y(false);
  P(() => {
    if (W) {
      ke.current = Date.now();
      lo(false);
    }
  }, [W]);
  let q = ce(
    (a, b) => {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return false;
      }
      if (!wouldTakeAnswer()) return false;
      if (a === "yes" && !W) {
        lo(true);
        noteRefused();
        return false;
      }
      if (a === "yes" && (qe || tooShort || ro)) {
        noteRefused();
        return false;
      }
      if (
        a === "yes" &&
        (ke.current === null || isWithinRecentInput(inputClock, ke.current, CHOICE_TIMEOUT_MS))
      ) {
        Do(true);
        noteRefused();
        return false;
      }
      if (
        answer(
          sendToProjectAnswer(
            a,
            payload,
            appStateSession,
            repoLabel(context, G?.id),
            ye ? null : (G?.id ?? ""),
            me.length > 0 ? tools : null,
            b,
          ),
        ) !== false &&
        a === "no" &&
        (b?.trim() ?? "") !== ""
      )
        releaseTypedMessage(appStateSession);
      return true;
    },
    [
      answer,
      wouldTakeAnswer,
      payload,
      appStateSession,
      context,
      W,
      qe,
      tooShort,
      ro,
      G,
      ye,
      tools,
      me.length,
      inputRefusalWindow,
      refusedWithin,
      noteRefused,
      inputClock,
    ],
  );
  if (N === null)
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
                refuseInput: m,
                openedAt,
                hideIndexes: true,
                focus: "cancel",
                confirmLabel: "Dismiss",
                cancelLabel: "Dismiss",
                onConfirm: () => q("no"),
                onCancel: () => q("no"),
              },
              S.remountKey,
            ),
          }),
        ],
      }),
    });
  return jsxProd_default_2(PermissionDialog_2, {
    title: De,
    requestSource: pe.beside ? payload.requestSource : undefined,
    children: [
      pe.sourceRows.length > 0
        ? jsxProd_default(Box, {
            flexDirection: "column",
            paddingX: 1,
            children: pe.sourceRows.map((children, b) =>
              jsxProd_default(
                Text,
                {
                  children,
                },
                `source-${b}`,
              ),
            ),
          })
        : null,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: gapsDropped < CHOICE_HEIGHT ? 1 : 0,
        paddingX: 1,
        children: [
          v
            ? null
            : rows_2.map((a) =>
                jsxProd_default(
                  PreviewRow,
                  {
                    row: a,
                  },
                  a.key,
                ),
              ),
          tools !== null && W
            ? me.map((children, b) =>
                jsxProd_default(
                  Text,
                  {
                    children,
                  },
                  `tools-${b}`,
                ),
              )
            : null,
          [...flattened, ...oo].map((children, b) =>
            jsxProd_default(
              Text,
              {
                color: "warning",
                children,
              },
              `warning-${b}`,
            ),
          ),
          jsxProd_default(ProjectProposalCard, {
            proposal: N.proposal,
            proposalBytes: Xe,
            existingProject: projectId !== null,
            width: max - 2,
            maxRows: no,
            marginTop: v ? 0 : ge,
            transcriptChord: shortcutDisplay,
            screenReaderColumns: isScreenReaderEnabled ? columns : null,
            messageFrom: N.messageFrom,
          }),
          v && rows_2.length > 0
            ? jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: ge,
                children: rows_2.map((a) =>
                  jsxProd_default(
                    PreviewRow,
                    {
                      row: a,
                    },
                    a.key,
                  ),
                ),
              })
            : null,
          de.length > 0
            ? jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: ge,
                children: de.map((children, b) =>
                  jsxProd_default(
                    Text,
                    {
                      dimColor: true,
                      children,
                    },
                    `local-${b}`,
                  ),
                ),
              })
            : null,
          jsxProd_default(Box, {
            marginTop: gapsDropped > 0 ? 0 : 1,
            flexDirection: "column",
            children:
              le || (projectId !== null && Ee === null)
                ? jsxProd_default(
                    ConfirmSelect,
                    {
                      refuseInput: m,
                      openedAt,
                      hideIndexes: true,
                      focus: "cancel",
                      confirmLabel: "Close",
                      cancelLabel: "Close",
                      onConfirm: () => q("no"),
                      onCancel: () => q("no"),
                    },
                    S.remountKey,
                  )
                : jsxProd_default_2(Fragment, {
                    children: [
                      !W
                        ? jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [
                              "Preparing\u2026",
                              $o
                                ? ` Still reading the lines above. Choose ${v ? "Send" : "Yes"} again in a moment.`
                                : "",
                            ],
                          })
                        : Lo
                          ? Ye.map((children, b) =>
                              jsxProd_default(
                                Text,
                                {
                                  dimColor: true,
                                  children,
                                },
                                `notice-${b}`,
                              ),
                            )
                          : null,
                      jsxProd_default(
                        ModelSelector,
                        {
                          refuseInput: m,
                          selectedValue: NO_COMMITTED_ROW,
                          hideIndexes: !V,
                          inlineDescriptions: true,
                          defaultFocusValue: V && !Re.current ? io.current : z,
                          inputChromeWidth: 4,
                          options,
                          onChange: (a) => q(a === "yes" ? "yes" : "no", a === z ? we.current : undefined),
                          onFocus: (a) => {
                            No(a === z);
                            if (V && (a !== "yes" || S.settled)) {
                              io.current = a;
                              if (a !== z) Re.current = false;
                            }
                            if (a !== z) g(false);
                          },
                          onCancel: () => {
                            q("no");
                          },
                        },
                        J,
                      ),
                    ],
                  }),
          }),
        ],
      }),
    ],
  });
}
