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
import { j, y, P, R, Q, ce } from "../../../vendor/react/cjs/react.production.js";
import { BLANK_LOOKALIKE_RE, INVISIBLE_SYMBOL_RE } from "../../utils/emojiPatterns.js";
import {
  wrapTextToWidth,
  mTr,
  measureInstructionsRows,
  xpt,
  countItemsFittingRows,
  ProjectProposalCard,
} from "../projects/ProjectProposalCard.js";
import { bsn, qOr, defaultCloudEnvironment } from "../../services/projects/repoContext.js";
import { isProposalEmpty } from "../../services/projects/proposalValidation.js";
import { XOr, OWn } from "../../tools/ContinueInProjectsTool/submit.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { yce } from "../permissions/wrapWidth.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { Rz, L$t, ChannelApiError, isRetryableChannelError } from "../../services/projects/channelApi.js";
import { setupProposalSchema, normalizeProposal } from "../../services/projects/setupProposalSchema.js";
import { coe, wht, toolsUsedDialogLine } from "../../services/projects/toolsUsedSummary.js";
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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { Me } from "../design-system/ThemeProvider.js";
import { useAppStateSession } from "../../state/AppState.js";
import { messageTitle, MESSAGE_REVEAL_NOTICE } from "../projects/messageRevealConfirm.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { Lcr } from "../../utils/github/anthropicRepos.js";
import { scanFolderContext } from "../../services/projects/sessionScan.js";
import { YOr, notSentLine } from "../../services/projects/disclosure.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";

//@ chunk-6d9n2xk3.js:14339-14343 placement
j();
//@ chunk-6d9n2xk3.js:14343-15669 placement
var SEND_TO_PROJECT_TEXT = " \xB7 ",
  ao = 4,
  X = 3,
  Fo = `${"\u9805".repeat(80)}\u2026`,
  co = "Send to your project (looking it up\u2026) with the following:",
  Ne = "\u2423",
  fo = "\\p{Default_Ignorable_Code_Point}",
  regExp = new RegExp(fo, "gu"),
  _e = `(?:\\p{White_Space}|${BLANK_LOOKALIKE_RE.source}|${INVISIBLE_SYMBOL_RE.source}|${fo})`,
  regExp_2 = new RegExp(`(?! )${_e}|(?<=^|${_e}) | (?=$|${_e})`, "gu"),
  uo = 6,
  xe = {
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
  },
  Go = { anthropic_cloud: "cloud", byoc: "self-hosted", self_hosted_pool: "self-hosted" };
//@ chunk-6d9n2xk3.js:15669-18263 placement
function projectSummaryLines(o) {
  let { width: width, existing: existing } = o,
    u = existing === null ? void 0 : existing.project;
  if (u === null) {
    let mapped = wrapTextToWidth(xe[existing?.failure ?? "transient"], Math.max(1, width)).map((g, x) => ({
      key: `lead-${x}`,
      text: g,
    }));
    return { rows: mapped, whole: { environment: !0, repository: !0 }, rowsAtMost: mapped.length };
  }
  if (o.oneMessage && existing !== null)
    return { rows: [], whole: { environment: !0, repository: !0 }, rowsAtMost: u === void 0 ? X : 0 };
  let p = o.proposal.sessions?.length ?? 0,
    h = o.attach && o.detection?.repo.kind === "github" && (!bsn(o.detection.repo) || o.monorepoEnvironment),
    c = o.environment != null ? ve(o.environment.name) : "",
    E =
      existing === null ? ["instructions", "icon", "color"].filter((f) => (o.proposal[f] ?? "") !== "") : [],
    m = [
      ...(existing === null
        ? [
            {
              key: "env",
              label: "Cloud environment",
              value: environmentStatusText(o).slice(c.length),
              maxRows: uo,
              ...(o.environment != null && { bound: c }),
            },
            {
              key: "repository",
              label: "Repository",
              value: h ? "" : detectionStatusText(o),
              maxRows: h ? ao : X,
              underBullet: h,
              ...(h && { bound: detectionStatusText(o) }),
            },
          ]
        : []),
      {
        key: "brief",
        label: "Brief",
        value: isProposalEmpty(XOr(o.proposal, existing === null ? "new" : "existing", "pane"))
          ? "saved to project memory. No setup card is posted."
          : "saved to project memory and posted as the setup card",
        maxRows: 2,
      },
      ...(E.length > 0
        ? [{ key: "settings", label: "Project settings", value: `${OWn(E)} from the brief`, maxRows: 2 }]
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
      { key: "session", label: "This session", value: "the project can read it", maxRows: 2 },
    ],
    mapped = (o.oneMessage ? m.filter(({ key: key }) => key === "env" || key === "repository") : m).map(
      ({ key: key, label: label, value: x, maxRows: maxRows, underBullet: underBullet, bound: bound }) => {
        let F =
            bound === void 0
              ? labeledLine(label, x, width, maxRows)
              : labeledWrappedLines(label, bound, x, width, maxRows, underBullet),
          B =
            bound === void 0
              ? labeledLine(label, x, width, Number.MAX_SAFE_INTEGER)
              : labeledWrappedLines(label, bound, "", width, Number.MAX_SAFE_INTEGER, underBullet);
        return {
          key: key,
          rows: F,
          whole:
            B.length <= maxRows &&
            (bound === void 0 || B.every((I, U) => F[U]?.startsWith(I.trimEnd()) === !0)),
          rowsAtMost:
            (key === "env" && o.environment === void 0) ||
            (key === "repository" && o.detection === null && !o.detectFailed)
              ? key === "env"
                ? uo
                : ao
              : 0,
        };
      },
    ),
    flattened = mapped.flatMap((f) => f.rows.map((row, x) => ({ key: `${f.key}-${x}`, text: row }))),
    k =
      existing === null
        ? o.oneMessage
          ? wrapToMaxLines("New personal project with this setup:", width).map((f, g) => ({
              key: `lead-${g}`,
              text: f,
            }))
          : quotedPreviewLines("Create personal project ", o.projectName, " with the following setup:", width)
        : u === void 0
          ? wrapToMaxLines(co, width).map((f, g) => ({ key: `lead-${g}`, text: f }))
          : quotedPreviewLines(
              "Send to personal project ",
              u.name !== "" ? u.name : "Untitled project",
              " with the following:",
              width,
              wrapToMaxLines(co, width).length,
            );
  return {
    rows: [...k, ...flattened],
    whole: {
      environment: mapped.every((f) => f.key !== "env" || f.whole),
      repository: mapped.every((f) => f.key !== "repository" || f.whole),
    },
    rowsAtMost:
      (existing !== null && u === void 0
        ? Math.max(
            k.length,
            quotedPreviewLines("Send to personal project ", Fo, " with the following:", width).length,
          )
        : k.length) + mapped.reduce((f, g) => f + Math.max(g.rows.length, g.rowsAtMost), 0),
  };
}
//@ chunk-6d9n2xk3.js:18263-18297 placement
var filtered = Object.keys(xe).filter(Uo);
//@ chunk-6d9n2xk3.js:18297-18339 placement
function Uo(o) {
  return Object.hasOwn(xe, o);
}
//@ chunk-6d9n2xk3.js:18339-18378 placement
function ho(o) {
  return o.replace(regExp_2, Ne);
}
//@ chunk-6d9n2xk3.js:18378-18648 placement
function wrapGraphemes(o, i, l = i) {
  let u = [],
    p = "",
    h = 0,
    max = Math.max(1, l);
  for (let { segment: segment } of getGraphemeSegmenter().segment(ho(o))) {
    let m = bunStringWidth(segment);
    if (p !== "" && h + m > max) {
      max = Math.max(1, i);
      let trimEnd = p.trimEnd(),
        sliced = p.slice(trimEnd.length),
        A = trimEnd !== "" && sliced !== "" && bunStringWidth(sliced) + m <= max;
      (u.push(A ? trimEnd : p), (p = A ? sliced : ""), (h = A ? bunStringWidth(sliced) : 0));
    }
    ((p += segment), (h += m));
  }
  return [...u, p];
}
//@ chunk-6d9n2xk3.js:18648-18900 placement
function labeledLine(o, i, l, u) {
  let p = `${SEND_TO_PROJECT_TEXT}${o}: `,
    h = bunStringWidth(p) <= l / 2,
    c = bunStringWidth(h ? p : SEND_TO_PROJECT_TEXT),
    E = wrapTextToWidth(h ? i : `${o}: ${i}`, Math.max(1, l - c)),
    mapped = E.slice(0, u).map((S, A) => (A === 0 ? (h ? p : SEND_TO_PROJECT_TEXT) : " ".repeat(c)) + S),
    at = mapped.at(-1);
  if (E.length > u && at !== void 0)
    mapped[mapped.length - 1] = truncateToWidth(`${at}\u2026`, Math.max(1, l));
  return mapped;
}
//@ chunk-6d9n2xk3.js:18900-19674 placement
function labeledWrappedLines(o, i, l, u, p, h = !1) {
  let max = Math.max(2, u),
    E = `${SEND_TO_PROJECT_TEXT}${o}: `,
    m = bunStringWidth(SEND_TO_PROJECT_TEXT),
    C = bunStringWidth(E) <= max / 2 && !h ? bunStringWidth(E) : m,
    mapped = wrapTextToWidth(`${o}:`, max - m).map(
      (T, F) => (F === 0 ? SEND_TO_PROJECT_TEXT : " ".repeat(m)) + T,
    ),
    A = `${mapped.at(-1) ?? ""} `,
    k = max - bunStringWidth(A) >= 2,
    f = l.trim() === "" ? [] : l.trim().split(" "),
    g = [
      ...mapped.slice(0, k ? -1 : void 0),
      ...wrapGraphemes(i, max - C, k ? max - bunStringWidth(A) : max - C).map(
        (T, F) => (k && F === 0 ? A : " ".repeat(C)) + T,
      ),
    ],
    x = 0;
  for (let T = f[x]; T !== void 0 && bunStringWidth(`${g.at(-1)} ${T}`) <= max; T = f[x])
    ((g[g.length - 1] = `${g.at(-1)} ${T}`), (x += 1));
  if (x < f.length) {
    let T = x === 0 ? (g.at(-1) ?? "") : "",
      sliced = T.slice(T.trimEnd().length);
    if (sliced !== "" && bunStringWidth(T.trimEnd()) > C) g[g.length - 1] = T.trimEnd();
    let B = T !== g.at(-1) ? sliced : "";
    g.push(
      ...wrapTextToWidth(f.slice(x).join(" "), Math.max(1, max - C - bunStringWidth(B))).map(
        (I, U) => " ".repeat(C) + (U === 0 ? B : "") + I,
      ),
    );
  }
  let sliced = g.slice(0, p),
    at = sliced.at(-1);
  if (g.length > p && at !== void 0) sliced[sliced.length - 1] = truncateToWidth(`${at}\u2026`, max);
  return sliced;
}
//@ chunk-6d9n2xk3.js:19674-19822 placement
function wrapToMaxLines(o, i) {
  let l = wrapTextToWidth(o, Math.max(1, i)),
    sliced = l.slice(0, X),
    at = sliced.at(-1);
  if (l.length > X && at !== void 0)
    sliced[sliced.length - 1] = truncateToWidth(`${at}\u2026`, Math.max(1, i));
  return sliced;
}
//@ chunk-6d9n2xk3.js:19822-20307 placement
function quotedPreviewLines(o, i, l, u, p = 1) {
  let h = ho(ve(i)),
    c = `\u201C${h}\u201D`,
    max = Math.max(2, u),
    m = wrapTextToWidth(o.trimEnd(), max),
    C = wrapTextToWidth(l.trimStart(), max),
    S = `${m.at(-1) ?? ""} `,
    A = max - bunStringWidth(S),
    k = wrapGraphemes(c, max, A),
    f =
      (bunStringWidth(c) <= A || (bunStringWidth(c) > max && A >= 2)) &&
      m.length - 1 + k.length + C.length >= p;
  return (
    p <= 1 && bunStringWidth(`${o}${c}${l}`) <= u
      ? [`${o}${c}${l}`]
      : [
          ...m.slice(0, f ? -1 : void 0),
          ...(f ? k.map((g, x) => (x === 0 ? S + g : g)) : wrapGraphemes(c, max)),
          ...C,
        ]
  ).map((g, x) => {
    let index = g.indexOf(c);
    return {
      key: `lead-${x}`,
      text: g,
      ...(index >= 0 && { named: { before: g.slice(0, index), name: h, after: g.slice(index + c.length) } }),
    };
  });
}
//@ chunk-6d9n2xk3.js:20307-20856 placement
function environmentStatusText(o) {
  let { environment: environment } = o;
  if (environment === void 0) return "looking it up\u2026";
  if (environment === null)
    return o.environmentLookupFailed
      ? "your organization\u2019s default (yours could not be looked up)"
      : "your organization\u2019s default";
  let l = `(${Go[environment.kind] ?? "cloud"})`,
    u =
      o.monorepoEnvironment && o.attach && o.detection?.repo.kind === "github" && bsn(o.detection.repo)
        ? "If the server refuses it, your organization\u2019s default is used and no repository is added."
        : "If the server refuses it, your organization\u2019s default is used.";
  return `${ve(environment.name)} ${l}. ${u}`;
}
//@ chunk-6d9n2xk3.js:20856-21412 placement
function detectionStatusText(o) {
  let { detection: detection } = o;
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
function ve(o) {
  return stripNonPrintable(o.replace(regExp, Ne).replaceAll("\t", Ne));
}
//@ chunk-6d9n2xk3.js:21475-22133 placement
var DIALOG_LAYOUT = 2,
  Yo = 2,
  Vo = 2,
  qo = 3,
  Ho = 5,
  Oe = "tell Claude what to change",
  Xo = 10,
  oe = 2,
  ne = 1,
  Ie = 2,
  zo = 80,
  Jo = "Choose Yes again to confirm.",
  Qo = "Couldn\u2019t read this folder\u2019s git state. Close and run /send-to-project again.",
  Zo = "This terminal is too narrow to show the repository in full. Widen it, or choose No.",
  en = "This terminal is too narrow to show the cloud environment in full. Widen it, or choose No.",
  on = "This terminal is too small to show the whole request. Make it taller or wider, or choose No.",
  nn = [
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
      (o.oneMessage ? qo : Vo) +
      o.feedbackExtraRows,
    l = o.oneMessage ? 0 : Xo,
    u = i + o.localRows + Math.max(l, o.blockRows),
    p = i + Math.max(o.localRows, o.localRowsAtMost) + Math.max(l, o.blockRows, o.blockRowsAtMost),
    h = o.terminalRows - Math.max(p + DIALOG_LAYOUT + oe, o.screenReader ? p + o.widgetRows : 0),
    c = u + DIALOG_LAYOUT + oe + ne - o.terminalRows;
  return {
    preview: o.oneMessage || o.terminalColumns >= zo ? h : Math.min(yce - 1, h),
    gapsDropped: Math.min(oe, Math.max(0, c)),
    tooShort:
      o.optionsWrap ||
      o.terminalColumns - Co < Po ||
      c > oe ||
      (o.screenReader && u + o.widgetRows + ne > o.terminalRows),
  };
}
//@ chunk-6d9n2xk3.js:22708-23166 placement
function requesterLabel(o) {
  switch (o?.type) {
    case "workflow-agent": {
      let i = toApprovalLabel(o.workflowName);
      return i === null ? "\xB7 from a workflow" : `\xB7 from the "${String(i)}" workflow`;
    }
    case "subagent": {
      let i = toApprovalLabel(o.agentName);
      return i === null ? "\xB7 from a subagent" : `\xB7 from the ${String(i)} agent`;
    }
    case "remote-agent":
      return "\xB7 from a remote cloud agent";
    case "plugin": {
      let i = toApprovalLabel(o.pluginName);
      return i === null ? "\xB7 from a plugin" : `\xB7 from the ${String(i)} plugin`;
    }
    default:
      return null;
  }
}
//@ chunk-6d9n2xk3.js:23166-23513 placement
function dialogTitleLine(o, i, l, u, p, h) {
  let c = p ? `Permission Required: ${o}` : o,
    max = Math.max(1, p ? l : l - 2),
    m = requesterLabel(i),
    C = m !== null && bunStringWidth(c) + 1 + bunStringWidth(m) <= max,
    S = m === null || C ? [] : wrapTextToWidth(m, u),
    A =
      h !== null &&
      bunStringWidth(o) + (C && m !== null ? 1 + bunStringWidth(m) : 0) + 1 + bunStringWidth(h) <= l - 2,
    joined = [c, ...(C && m !== null ? [m] : []), ...(A && h !== null ? [h] : [])].join(" ");
  return {
    rows: (p ? wrapTextToWidth(joined, max, !0).length : C ? 1 : wrapTextToWidth(c, max).length) + S.length,
    beside: C,
    sourceRows: S,
  };
}
//@ chunk-6d9n2xk3.js:23513-23875 placement
function parseSendToProjectInput(o) {
  let {
    project_name: project_name,
    project_id: project_id,
    proposal: proposal,
    attach_git_remote: attach_git_remote,
  } = o;
  if (
    typeof project_name !== "string" ||
    (project_id !== void 0 && (typeof project_id !== "string" || !Rz.test(project_id))) ||
    typeof attach_git_remote !== "boolean"
  )
    return null;
  let safeParse = setupProposalSchema().safeParse(proposal);
  if (!safeParse.success) return null;
  return {
    projectName: coe(project_name),
    projectId: typeof project_id === "string" ? project_id : null,
    proposal: normalizeProposal(safeParse.data),
    attach: attach_git_remote,
    messageFrom: drawnMessageFrom(o[MESSAGE_KEY], safeParse.data),
  };
}
//@ chunk-6d9n2xk3.js:23875-24196 placement
function sendToProjectAnswer(o, i, l, u, p, h, c) {
  let E = ln(i.input, u, p);
  switch (o) {
    case "yes": {
      let m = parseSendToProjectInput(i.input);
      return m === null
        ? { behavior: "deny" }
        : {
            behavior: "allow",
            updatedInput: {
              ...E,
              [PANE_CONSENT_TOKEN_KEY]: mintPaneConsent(l, i.requestId, E, {
                toolsUsed: h,
                messageFrom: m.messageFrom,
              }),
            },
          };
    }
    case "no": {
      let m = c?.trim() ?? "";
      return m === "" ? { behavior: "deny" } : { behavior: "deny", feedback: m };
    }
  }
}
//@ chunk-6d9n2xk3.js:24196-24272 placement
function ln(o, i, l) {
  return {
    ...o,
    [PANE_APPROVED_ORIGIN_KEY]: i,
    [PANE_APPROVED_ENVIRONMENT_KEY]: l ?? "",
    ...(l === null && { [ENVIRONMENT_LOOKUP_FAILED_KEY]: !0 }),
  };
}
//@ chunk-6d9n2xk3.js:24272-24322 placement
function bo(o, i) {
  return o === null ? "" : qOr(o.repo, i);
}
//@ chunk-6d9n2xk3.js:24322-24632 placement
function sendToProjectOptions(o, i, l, u, p) {
  return [
    ...(i ? [{ label: sendConfirmLabel(o, p), value: "yes" }] : []),
    p
      ? {
          type: "input",
          label: $e,
          value: "edit",
          placeholder: Oe,
          initialValue: l,
          onChange: u,
          ignoreEmptySubmit: !0,
        }
      : {
          type: "input",
          label: "No",
          value: "no",
          placeholder: Oe,
          initialValue: l,
          onChange: u,
          allowEmptySubmitToCancel: !0,
        },
    ...(p ? [{ label: "No", value: "no" }] : []),
  ];
}
//@ chunk-6d9n2xk3.js:24632-24658 placement
var $e = "Edit the message";
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
var Po = 20,
  Co = 8,
  an = 500;
//@ chunk-6d9n2xk3.js:24805-25261 placement
function PreviewRow(o) {
  let l = w(8),
    { row: row } = o;
  if (row.named === void 0) {
    let u;
    if (l[0] !== row.text) ((u = e(Text, { children: row.text })), (l[0] = row.text), (l[1] = u));
    else u = l[1];
    return u;
  }
  let u;
  if (l[2] !== row.named.name)
    ((u = e(Text, { bold: !0, children: row.named.name })), (l[2] = row.named.name), (l[3] = u));
  else u = l[3];
  let p;
  if (l[4] !== row.named.after || l[5] !== row.named.before || l[6] !== u)
    ((p = r(Text, { children: [row.named.before, "\u201C", u, "\u201D", row.named.after] })),
      (l[4] = row.named.after),
      (l[5] = row.named.before),
      (l[6] = u),
      (l[7] = p));
  else p = l[7];
  return p;
}
/**
 * “发送到项目”权限对话框：显示项目、环境检测、预览与选项，带误触保护。
 */
//@ chunk-6d9n2xk3.js:25261-31759 placement
function SendToProjectDialog({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) {
  let u = useInputClock(),
    p = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker();
  function m() {
    if (p() || refusedWithin()) return (noteRefused(), !0);
    return !1;
  }
  let C = useMountTime(),
    S = settleKey(epoch),
    k = useIsScreenReaderEnabled(),
    [f, g] = y(!1),
    [x, D] = y(S.remountKey);
  P(() => {
    if (!(k && f)) D(S.remountKey);
  }, [S.remountKey, k, f]);
  let { columns: columns, rows: rows } = useTerminalSize(),
    F = useAskPositionLabel(),
    B = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    max = Math.max(Po, columns - Co),
    [U, _o] = y(""),
    we = R(""),
    [jo, No] = y(!0),
    N = Q(() => parseSendToProjectInput(payload.input), [payload.input]),
    v = N !== null && N.messageFrom !== null,
    z = v ? "edit" : "no",
    To =
      U === "" && (!jo || k)
        ? 0
        : wrapTextToWidth(`${v ? $e : "No"}, ${U === "" ? Oe : U}`, Math.max(1, columns - 14), !0).length - 1,
    { storageV5: storageV5, credentials: credentials } = Me(),
    se = useAppStateSession(),
    M = N?.projectId ?? null,
    De = v
      ? messageTitle(N.projectName, M === null)
      : M !== null
        ? "Send this session to a Claude Project?"
        : "Create a Claude Project from this session?",
    Re = R(!1),
    Fe = ce((a) => {
      ((we.current = a), (Re.current = !0), g(!0), _o(a));
    }, []),
    [L, xo] = y(null),
    Y = wht.peek(se)?.current ?? null,
    be = Y !== null && L !== null && Y.cwd === L.cwd ? Y.tools : null,
    We = Y !== null && (L === null || Y.cwd === L.cwd) ? toolsUsedDialogLine(Y.tools, "this computer") : null,
    [le, Mo] = y(!1),
    [Ee, Be] = y(void 0),
    [Ao, vo] = y(null);
  P(() => {
    if (M === null) return;
    let abortController = new AbortController();
    return (
      L$t(M, abortController.signal, credentials).then(
        (b) => {
          if (!abortController.signal.aborted) (Be({ name: b.name }), noteRefused());
        },
        (b) => {
          if (!abortController.signal.aborted)
            (logForDebugging(`send-to-project: project lookup failed: ${errorMessage(b)}`),
              vo(b instanceof ChannelApiError && !isRetryableChannelError(b) ? b.telemetryCode : "transient"),
              Be(null));
        },
      ),
      () => abortController.abort()
    );
  }, [M, credentials, noteRefused]);
  let [G, Ge] = y(void 0),
    [ye, Io] = y(!1);
  P(() => {
    if (M !== null) return;
    let a = !0;
    return (
      defaultCloudEnvironment(storageV5, credentials).then(
        (b) => {
          if (a) (Ge(b), noteRefused());
        },
        (b) => {
          if ((logForDebugging(`send-to-project: environment lookup failed: ${errorMessage(b)}`), a))
            (Io(!0), Ge(null), noteRefused());
        },
      ),
      () => {
        a = !1;
      }
    );
  }, [M, storageV5, credentials, noteRefused]);
  let Ue = Lcr(G?.id);
  P(() => {
    let abortController = new AbortController();
    return (
      scanFolderContext({ checkAccess: !1, withSessions: !1 }, abortController.signal, storageV5).then(
        (b) => {
          if (!abortController.signal.aborted) (xo(b), noteRefused());
        },
        (b) => {
          if (
            (logForDebugging(`send-to-project: pane detection failed: ${errorMessage(b)}`),
            !abortController.signal.aborted)
          )
            Mo(!0);
        },
      ),
      () => abortController.abort()
    );
  }, [storageV5, noteRefused]);
  let ae =
      N !== null
        ? projectSummaryLines({
            width: max - 2,
            projectName: N.projectName,
            proposal: N.proposal,
            existing: M !== null ? { project: Ee, failure: Ao } : null,
            environment: G,
            environmentLookupFailed: ye,
            detection: L,
            detectFailed: le,
            attach: N.attach,
            monorepoEnvironment: Ue,
            oneMessage: v,
          })
        : null,
    ue = ae?.rows ?? [],
    Ke = G != null && N !== null && M === null && ae?.whole.environment === !1,
    pe = dialogTitleLine(De, payload.requestSource, columns, max - 2, k, F),
    de = v
      ? MESSAGE_DISCLOSURE.flatMap((a) => wrapToMaxLines(a, max - 2))
      : M !== null
        ? wrapToMaxLines(YOr, max - 2)
        : L !== null && N !== null
          ? wrapToMaxLines(
              notSentLine(L, N.attach && L.repo.kind === "github" && (!bsn(L.repo) || Ue)),
              max - 2,
            )
          : [],
    Ye = wrapTextToWidth(v ? MESSAGE_REVEAL_NOTICE : Jo, max - 2),
    Ve =
      L !== null &&
      L.repo.kind === "github" &&
      N !== null &&
      N.attach &&
      M === null &&
      bo(L, G?.id) !== "" &&
      ae?.whole.repository === !1,
    qe = Ve || Ke,
    flattened = [...(M !== null && le ? [Qo] : []), ...(Ve ? [Zo] : []), ...(Ke ? [en] : [])].flatMap((a) =>
      wrapTextToWidth(a, max - 2),
    ),
    Xe = N !== null ? Buffer.byteLength(jsonStringify(N.proposal), "utf8") : 0,
    ze = {
      terminalRows: rows,
      terminalColumns: columns,
      screenReader: k,
      titleRows: pe.rows,
      previewHeadRows: v
        ? 1 + (N.messageFrom === "drafted" ? wrapTextToWidth(mTr, k ? columns : max - 5).length : 0)
        : k && N !== null
          ? measureInstructionsRows(N.proposal, Xe, B, columns)
          : Yo,
      warningRows: flattened.length,
      localRows: de.length,
      localRowsAtMost: !v && M === null && L === null && !le ? X : de.length,
      optionsWrap: Ho + bunStringWidth(v ? $e : sendConfirmLabel(M, !1)) > columns - 4,
      blockRows: ue.length,
      blockRowsAtMost: ae?.rowsAtMost ?? 0,
      feedbackExtraRows: To,
      noticeRows: Ye.length,
      widgetRows: k ? nn.reduce((a, b) => a + wrapTextToWidth(b, Math.max(1, columns)).length, 0) : 0,
      oneMessage: v,
    },
    Se = dialogRowBudget(ze),
    W = L !== null && (M !== null ? Ee !== void 0 : G !== void 0),
    max_2 = Math.max(
      0,
      Math.floor(
        (W
          ? Se.preview
          : dialogRowBudget({ ...ze, localRows: 0, localRowsAtMost: 0, blockRows: 0, blockRowsAtMost: 0 })
              .preview) / 2,
      ),
    ),
    Ze = We !== null ? labeledLine("MCP tools used", We, max - 2, max_2 + 1) : [],
    me = Ze.length <= max_2 ? Ze : [],
    { gapsDropped: gapsDropped, tooShort: tooShort } = Se,
    oo = tooShort ? wrapTextToWidth(on, max - 2) : [],
    max_3 = Math.max(ne, Se.preview - me.length - oo.length),
    ge = max_3 - Ie > ne ? 1 : 0,
    no = !W && max_3 === Ie + ne ? max_3 - 1 : max_3 - Ie * ge,
    to = Q(() => (v ? xpt(N.proposal.summary ?? "", max - 2) : []), [v, N, max]),
    ro = countItemsFittingRows(to, no, k ? columns : null) < to.length,
    V = k || W,
    J = `${x}:${V ? "both" : "no-only"}`,
    [Ce, Oo] = y(() => ({ key: J, options: sendToProjectOptions(M, V, "", Fe, v) })),
    so = Ce.key === J ? Ce.options : sendToProjectOptions(M, V, we.current, Fe, v);
  if (Ce.key !== J) Oo({ key: J, options: so });
  let io = R("yes"),
    ke = R(null),
    [$o, lo] = y(!1),
    [Lo, Do] = y(!1);
  P(() => {
    if (W) ((ke.current = Date.now()), lo(!1));
  }, [W]);
  let q = ce(
    (a, b) => {
      if (p() || refusedWithin()) return (noteRefused(), !1);
      if (!wouldTakeAnswer()) return !1;
      if (a === "yes" && !W) return (lo(!0), noteRefused(), !1);
      if (a === "yes" && (qe || tooShort || ro)) return (noteRefused(), !1);
      if (a === "yes" && (ke.current === null || isWithinRecentInput(u, ke.current, an)))
        return (Do(!0), noteRefused(), !1);
      if (
        answer(
          sendToProjectAnswer(
            a,
            payload,
            se,
            bo(L, G?.id),
            ye ? null : (G?.id ?? ""),
            me.length > 0 ? be : null,
            b,
          ),
        ) !== !1 &&
        a === "no" &&
        (b?.trim() ?? "") !== ""
      )
        releaseTypedMessage(se);
      return !0;
    },
    [
      answer,
      wouldTakeAnswer,
      payload,
      se,
      L,
      W,
      qe,
      tooShort,
      ro,
      G,
      ye,
      be,
      me.length,
      p,
      refusedWithin,
      noteRefused,
      u,
    ],
  );
  if (N === null)
    return e(PermissionDialog_2, {
      title: "Create a Claude Project from this session?",
      requestSource: payload.requestSource,
      children: r(Box, {
        flexDirection: "column",
        marginTop: 1,
        paddingX: 1,
        children: [
          e(Text, {
            color: "error",
            children:
              "The request is missing its project name, brief or repository choice, or the brief could not be read. There is nothing to approve.",
          }),
          e(Box, {
            marginTop: 1,
            children: e(
              ConfirmSelect,
              {
                refuseInput: m,
                openedAt: C,
                hideIndexes: !0,
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
  return r(PermissionDialog_2, {
    title: De,
    requestSource: pe.beside ? payload.requestSource : void 0,
    children: [
      pe.sourceRows.length > 0
        ? e(Box, {
            flexDirection: "column",
            paddingX: 1,
            children: pe.sourceRows.map((sourceRow, b) => e(Text, { children: sourceRow }, `source-${b}`)),
          })
        : null,
      r(Box, {
        flexDirection: "column",
        marginTop: gapsDropped < oe ? 1 : 0,
        paddingX: 1,
        children: [
          v ? null : ue.map((a) => e(PreviewRow, { row: a }, a.key)),
          be !== null && W ? me.map((a, b) => e(Text, { children: a }, `tools-${b}`)) : null,
          [...flattened, ...oo].map((a, b) => e(Text, { color: "warning", children: a }, `warning-${b}`)),
          e(ProjectProposalCard, {
            proposal: N.proposal,
            proposalBytes: Xe,
            existingProject: M !== null,
            width: max - 2,
            maxRows: no,
            marginTop: v ? 0 : ge,
            transcriptChord: B,
            screenReaderColumns: k ? columns : null,
            messageFrom: N.messageFrom,
          }),
          v && ue.length > 0
            ? e(Box, {
                flexDirection: "column",
                marginTop: ge,
                children: ue.map((a) => e(PreviewRow, { row: a }, a.key)),
              })
            : null,
          de.length > 0
            ? e(Box, {
                flexDirection: "column",
                marginTop: ge,
                children: de.map((a, b) => e(Text, { dimColor: !0, children: a }, `local-${b}`)),
              })
            : null,
          e(Box, {
            marginTop: gapsDropped > 0 ? 0 : 1,
            flexDirection: "column",
            children:
              le || (M !== null && Ee === null)
                ? e(
                    ConfirmSelect,
                    {
                      refuseInput: m,
                      openedAt: C,
                      hideIndexes: !0,
                      focus: "cancel",
                      confirmLabel: "Close",
                      cancelLabel: "Close",
                      onConfirm: () => q("no"),
                      onCancel: () => q("no"),
                    },
                    S.remountKey,
                  )
                : r(Fragment, {
                    children: [
                      !W
                        ? r(Text, {
                            dimColor: !0,
                            children: [
                              "Preparing\u2026",
                              $o
                                ? ` Still reading the lines above. Choose ${v ? "Send" : "Yes"} again in a moment.`
                                : "",
                            ],
                          })
                        : Lo
                          ? Ye.map((a, b) => e(Text, { dimColor: !0, children: a }, `notice-${b}`))
                          : null,
                      e(
                        ModelSelector,
                        {
                          refuseInput: m,
                          selectedValue: NO_COMMITTED_ROW,
                          hideIndexes: !V,
                          inlineDescriptions: !0,
                          defaultFocusValue: V && !Re.current ? io.current : z,
                          inputChromeWidth: 4,
                          options: so,
                          onChange: (a) => q(a === "yes" ? "yes" : "no", a === z ? we.current : void 0),
                          onFocus: (a) => {
                            if ((No(a === z), V && (a !== "yes" || S.settled))) {
                              if (((io.current = a), a !== z)) Re.current = !1;
                            }
                            if (a !== z) g(!1);
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
