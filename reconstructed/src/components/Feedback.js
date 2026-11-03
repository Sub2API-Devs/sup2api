/**
 * components/Feedback.tsx
 *
 * /feedback（/bug）：收集描述、可选附带会话记录，提交到 /api/claude_cli_feedback 并生成 GitHub issue 链接（模型生成标题）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Feedback.tsx
 * pieces: chunk-4121qate.js (1), chunk-hm0ce8vc.js (1), chunk-hwmsct5x.js (1), chunk-seqjkch8.js (13), chunk-xx1vmpsq.js (2)
 * attribution: fingerprint 8, placement 5, layout 3, sole-consumer 2
 */
import { j, y, ce, fo, Qr } from "../../vendor/react/cjs/react.production.js";
import { createStore } from "../state/store.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { wt, Jn } from "../remote/remoteMode.js";
import { getIsGit, getGitState } from "../utils/git.js";
import { useAppState } from "../state/AppState.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { nullStub } from "../utils/externalBuildStubs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { checkProductFeedbackAllowed } from "../commands/feedback/feedbackPolicy.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { saveFeedbackBundle, postFeedbackSubmission } from "../services/feedback/feedbackBundle.js";
import {
  orgRefusalError,
  credentialRefusalMessage,
  serverStatusSuffix,
  buildFeedbackPayload,
  TRANSCRIPT_FIELDS,
  xs,
  dDe,
  redactError,
  classifyFeedbackError,
} from "../services/feedback/submitFeedback.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { fi } from "../utils/browser.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Box, Text } from "../ink/components/Text.js";
import { TextInput } from "./TextInput.js";
import { ErrorText } from "./ErrorText.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { env } from "../utils/env.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { truncateToLength, getFirstLine } from "../utils/stringUtils.js";
import { redactSecrets, redactSecrets as redactSecrets_2 } from "../services/teamMemorySync/secretScanner.js";
import { queryHaikuWithFallback } from "../services/api/claude.js";
import { asSystemPrompt } from "../utils/systemPromptType.js";
import { mainAgentContext } from "../utils/agentContext.js";
import { startsWithApiErrorPrefix } from "../services/api/errors.js";
import { isAbortError, isExpectedApiError, errorMessage } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { isSessionsToken } from "../services/oauth/sessionsBearerHooks.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import { withOAuth401Retry } from "../utils/http.js";
import { apiClient } from "../services/routines/routinesApi.js";
import { isCancel, isAxiosError } from "../../vendor/axios/dist/esm/axios.js";
import { describeThrownValue, createSealedError } from "../plugins/functionHooks/vm/vmRealm.js";
import { jsonStringify } from "../utils/slowOperations.js";

//@ chunk-seqjkch8.js:1689-1693 placement
j();
//@ chunk-seqjkch8.js:1693-1697 placement
j();
//@ chunk-seqjkch8.js:1697-1701 placement
j();
/**
 * /feedback 的文案常量：记录范围说明与选项、记录缺失/不完整/过大的提示、post/bundle/share 三种模式的同意与提交文案。
 */
//@ chunk-seqjkch8.js:1701-3098 placement
var MAX_FEEDBACK_BODY_CHARS = 7250,
  MAX_ISSUE_TITLE_CHARS = 200,
  TRANSCRIPT_SCOPE_DESCRIPTIONS = {
    session: "this session only",
    day: "this session + this project\u2019s other sessions from the last 24 hours",
    week: "this session + this project\u2019s other sessions from the last 7 days",
  },
  TRANSCRIPT_SCOPE_OPTIONS = [
    { label: "This session only", value: "session" },
    { label: "This session + the last 24 hours", value: "day" },
    { label: "This session + the last 7 days", value: "week" },
  ],
  TRANSCRIPT_PROBLEM_NOTES = {
    transcript_missing: "This session has no transcript on disk, so the bundle has the report only.",
    transcript_incomplete:
      "The session transcript couldn't be read in full, so the bundle is missing some or all of it.",
    transcript_over_zip_limit:
      "The session transcript is too large for one archive, so the bundle has only the start of it.",
  },
  FEEDBACK_MODE_COPY = {
    post: {
      consentAction: "submit",
      consentIntro: "This report will include:",
      consentFooter: "We may use these to debug related issues and improve Claude Code.",
      submitting: "Submitting report\u2026",
    },
    bundle: {
      consentAction: "save",
      consentIntro: "An archive will be saved to disk containing:",
      consentFooter:
        "Nothing leaves this machine until you send the bundle file. Secrets (API keys, tokens, credentials) are redacted before writing.",
      submitting: "Saving bundle\u2026",
    },
    share: {
      consentAction: "share",
      consentIntro: "This shared conversation will include:",
      consentFooter:
        "A shareable link will be created so you can post the conversation for debugging and support.",
      submitting: "Uploading share\u2026",
    },
  };
/**
 * 创建反馈提交状态存储（none/sending/delivered/saved/failed）；share 模式返回空操作版本，失败不会覆盖已送达或已保存的状态。
 */
//@ chunk-seqjkch8.js:3098-3715 placement
function createFeedbackStatusStore(mode) {
  let store = createStore({ status: "none" }),
    { subscribe: subscribe, getSnapshot: getSnapshot } = store;
  if (mode === "share")
    return {
      subscribe: subscribe,
      getSnapshot: getSnapshot,
      start() {},
      deliver() {},
      save() {},
      fail() {},
      abandon() {},
    };
  return {
    subscribe: subscribe,
    getSnapshot: getSnapshot,
    start() {
      store.setState(() => ({ status: "sending" }));
    },
    deliver(h) {
      store.setState(() => ({ status: "delivered", referenceId: h }));
    },
    save(h, k, c) {
      store.setState(() => ({
        status: "saved",
        referenceId: h,
        bundlePath: k,
        ...(c !== void 0 && { transcriptProblem: c }),
      }));
    },
    fail(h, k) {
      store.setState((c) =>
        c.status === "delivered" || c.status === "saved"
          ? c
          : { status: "failed", reason: h, ...(k === !0 && { final: k }) },
      );
    },
    abandon() {
      store.setState((h) => (h.status === "sending" ? { status: "none" } : h));
    },
  };
}
//@ chunk-seqjkch8.js:3715-3773 layout
async function Ut(d, o) {
  try {
    await d();
  } finally {
    o.abandon();
  }
}
/**
 * /feedback：输入描述 → 确认是否附带记录 → 提交（submitFeedback）→ 显示 feedback ID 与可打开的 GitHub issue 链接。
 */
//@ chunk-seqjkch8.js:3773-12089 fingerprint = Feedback (0.317)
function Feedback({
  abortController: abortController,
  messages: messages,
  initialDescription: initialDescription,
  onDone: onDone,
  applyMessageOp: applyMessageOp,
  backgroundTasks: backgroundTasks = {},
  mode: mode = "post",
  readFileState: readFileState,
  surveyFeedbackSource: surveyFeedbackSource,
  command: command = "/feedback",
  wholeTranscript: wholeTranscript,
  send: send,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    sanitizedErrors = useHost(),
    [Ce, z] = y("userInput"),
    [jt, Wt] = y(0),
    [se, zt] = y(initialDescription ?? ""),
    [Gt, Ue] = y(null),
    [Vt, qt] = y(null),
    [Xt, Jt] = y(null),
    [xe, re] = y(null),
    [Kt, ve] = y(!1),
    [N] = y(() => send ?? createFeedbackStatusStore(mode)),
    lastAssistantMessage = useStoreSelector(N),
    [Zt, ft] = y(!1),
    [Qt, eo] = y(null),
    D = Qt ?? lastAssistantMessage,
    V = mode !== "share" && !Zt && D.status !== "none",
    to = V && D.status !== "failed",
    oo = D.status === "sending" ? "submitting" : "done",
    F = to ? oo : Ce,
    no = V && D.status === "failed" ? D.reason : null,
    U = xe ?? no,
    fe = xe !== null ? Kt : V && D.status === "failed" && D.final === !0,
    le = V && (D.status === "delivered" || D.status === "saved") ? D.referenceId : Gt,
    ge = V && D.status === "saved" ? D.bundlePath : Vt,
    Fe = V && D.status === "saved" ? (D.transcriptProblem ?? null) : Xt,
    he = wt(),
    ht = he ? (Jn()?.sessionId ?? null) : null,
    [so] = y(() =>
      he
        ? Promise.resolve(null)
        : getIsGit()
            .then((f) => (f ? getGitState() : null))
            .catch(() => null),
    ),
    [bt, ro] = y(null),
    [be, ao] = y("session"),
    teammateTranscripts = useAppState((f) => f.transcripts),
    io = useTerminalSize().columns - 4,
    Ho = nullStub(),
    Re = getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lynx", !1),
    handleCancel = ce(async () => {
      (z("submitting"), re(null), Ue(null), N.start());
      let f = (input, I = !1) => {
        (re(input), ve(I), z("userInput"), N.fail(input, I));
      };
      if (mode === "bundle") {
        let K = checkProductFeedbackAllowed(command);
        if (K !== null) {
          (logFeatureBad("feedback_bundle", "disabled_at_save"), f(K));
          return;
        }
        let I = await saveFeedbackBundle({
          messages: messages,
          description: se,
          surface: "cli",
          scope: be,
          backgroundTasks: backgroundTasks,
          transcripts: teammateTranscripts,
          signal: abortController.signal,
          surveyFeedbackSource: surveyFeedbackSource,
          wholeTranscript: wholeTranscript,
          storageV5: storageV5,
          host: sanitizedErrors,
        });
        if (abortController.signal.aborted) return;
        if (I.success)
          (Ue(I.bundleId),
            qt(I.zipPath),
            Jt(I.transcriptProblem ?? null),
            z("done"),
            N.save(I.bundleId, I.zipPath, I.transcriptProblem));
        else f(`Couldn't save the feedback bundle to disk: ${I.error}`);
        return;
      }
      let [A, po] = await Promise.all([
        postFeedbackSubmission({
          messages: messages,
          description: se,
          surface: "cli",
          scope: be,
          backgroundTasks: backgroundTasks,
          transcripts: teammateTranscripts,
          signal: abortController.signal,
          surveyFeedbackSource: surveyFeedbackSource,
          storageV5: storageV5,
          host: sanitizedErrors,
          credentials: credentials,
        }),
        Re ? Promise.resolve(null) : generateTitle(se, abortController.signal, credentials),
      ]);
      if (abortController.signal.aborted) return;
      if ((ro(po), A.success)) (Ue(A.feedbackId), z("done"), N.deliver(A.feedbackId));
      else {
        let K = orgRefusalError(A),
          I = K ?? credentialRefusalMessage(A);
        if (I !== void 0) f(I, K !== void 0 && A.refusal?.reportContent !== !0);
        else if (A.failureReason === "auth_error")
          f("Couldn't send feedback: not signed in. Run /login, then retry.");
        else if (A.failureReason === "policy_blocked")
          f(checkProductFeedbackAllowed(command) ?? "Feedback is disabled by your organization's policy.");
        else {
          let mo =
            serverStatusSuffix(A) ??
            (A.failureReason === "timeout"
              ? " (request timed out)"
              : A.failureReason === "network_error"
                ? " (couldn't reach the service)"
                : "");
          f(
            `Couldn't send feedback${mo}. If it keeps failing, you can file at ${GITHUB_ISSUES_REPO_URL()} instead.`,
          );
        }
      }
    }, [
      se,
      messages,
      Re,
      backgroundTasks,
      teammateTranscripts,
      abortController,
      mode,
      be,
      storageV5,
      credentials,
      command,
      wholeTranscript,
      N,
      sanitizedErrors,
    ]),
    lo = ce(() => Ut(handleCancel, N), [handleCancel, N]),
    Le = ce(() => {
      if (V) {
        let snapshot = N.getSnapshot();
        eo((A) => A ?? snapshot);
      }
      (abortController.abort(), onDone("Feedback / bug report cancelled", { display: "system" }));
    }, [onDone, abortController, N, V]),
    jo = ce(() => {
      z("done");
    }, []),
    Wo = ce((f) => {
      (re(f), ve(!1), z("userInput"));
    }, []);
  useKeybinding("confirm:no", Le, { context: "Settings", isActive: F === "userInput" });
  let co = F === "done" || (U && F !== "userInput");
  function uo(f) {
    if (f.ctrl || f.meta) return;
    if (F === "done") {
      if ((f.preventDefault(), mode === "share")) return;
      if (!Re && f.key === "return" && bt) {
        let A = createGitHubIssueUrl(le ?? "", bt, se);
        fi(A);
      }
      if (U) onDone("Error submitting feedback / bug report", { display: "system" });
      else if (mode === "bundle" && ge)
        onDone(
          Fe === null
            ? `Feedback bundle saved to \`${ge}\``
            : `Feedback bundle saved to \`${ge}\`. ${TRANSCRIPT_PROBLEM_NOTES[Fe]}`,
          { display: "system" },
        );
      else onDone("Feedback / bug report submitted", { display: "system" });
      return;
    }
    if (U && F !== "userInput") {
      (f.preventDefault(), onDone("Error submitting feedback / bug report", { display: "system" }));
      return;
    }
    if (F === "consent") {
      if (f.key === "left") {
        (f.preventDefault(), z(mode === "share" || he ? "userInput" : "scope"));
        return;
      }
      if (f.key === "return" || f.key === " ") (f.preventDefault(), lo());
    }
  }
  return e(FocusColumn, {
    onKeyDown: uo,
    children: r(Dialog, {
      title: "Submit feedback / bug report",
      onCancel: Le,
      isCancelActive: F !== "userInput" && !co,
      hideInputGuide: F === "done",
      inputGuide:
        F === "userInput"
          ? r(Byline, {
              children: [
                !fe && e(KeyboardShortcutHint, { chord: "enter", action: "continue" }),
                e(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Confirmation",
                  fallback: "Esc",
                  description: "cancel",
                }),
              ],
            })
          : F === "scope"
            ? r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "enter", action: "choose" }),
                  e(ConfigurableShortcutHint, {
                    action: "confirm:no",
                    context: "Confirmation",
                    fallback: "Esc",
                    description: "cancel",
                  }),
                ],
              })
            : F === "consent"
              ? r(Byline, {
                  children: [
                    e(KeyboardShortcutHint, {
                      chord: "enter",
                      action: FEEDBACK_MODE_COPY[mode].consentAction,
                    }),
                    e(KeyboardShortcutHint, { chord: "left", action: "change" }),
                    e(ConfigurableShortcutHint, {
                      action: "confirm:no",
                      context: "Confirmation",
                      fallback: "Esc",
                      description: "cancel",
                    }),
                  ],
                })
              : null,
      children: [
        F === "userInput" &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(Text, { children: "Describe the issue below:" }),
              e(TextInput, {
                value: se,
                onChange: (f) => {
                  if ((zt(f), fe && xe === null && U !== null)) (re(U), ve(!0));
                  if ((ft(!0), U && !fe)) re(null);
                },
                columns: io,
                clearOnSubmit: !1,
                onSubmit: (f) => {
                  if (fe) return;
                  if ((ft(!0), mode !== "share" && f.trim() === "")) {
                    (re("Please describe the issue before submitting."), ve(!1));
                    return;
                  }
                  (re(null), z(mode === "share" || he ? "consent" : "scope"));
                },
                onExitMessage: (exitState) => {
                  if (exitState)
                    (abortController.abort(), onDone("Feedback cancelled", { display: "system" }));
                },
                cursorOffset: jt,
                onChangeCursorOffset: Wt,
                showCursor: !0,
                focus: !0,
              }),
              U &&
                r(Box, {
                  flexDirection: "column",
                  gap: 1,
                  children: [
                    e(ErrorText, { error: U }),
                    !fe &&
                      e(Text, { dimColor: !0, children: "Edit and press Enter to retry, or Esc to cancel" }),
                  ],
                }),
            ],
          }),
        F === "scope" &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(Text, { children: "How much session history should we include?" }),
              e(ModelSelector, {
                options: TRANSCRIPT_SCOPE_OPTIONS,
                defaultFocusValue: be,
                onChange: (value) => {
                  (ao(value), z("consent"));
                },
                onCancel: Le,
              }),
            ],
          }),
        F === "consent" &&
          r(Box, {
            flexDirection: "column",
            children: [
              e(Text, { children: FEEDBACK_MODE_COPY[mode].consentIntro }),
              r(Box, {
                marginLeft: 2,
                flexDirection: "column",
                children: [
                  r(Text, {
                    children: [
                      "- Your feedback / bug description:",
                      " ",
                      e(Text, { dimColor: !0, children: se }),
                    ],
                  }),
                  r(Text, {
                    children: [
                      "- Environment info:",
                      " ",
                      r(Text, {
                        dimColor: !0,
                        children: [
                          env.platform,
                          ", ",
                          env.terminal,
                          ", v",
                          {
                            ISSUES_EXPLAINER:
                              "report the issue at https://github.com/anthropics/claude-code/issues",
                            PACKAGE_URL: "@anthropic-ai/claude-code",
                            README_URL: "https://code.claude.com/docs/en/overview",
                            VERSION: "2.1.316",
                            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                            BUILD_TIME: "2026-10-30T23:28:13Z",
                            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                            HOOKS_WORKER_URL:
                              import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                            DD_SOURCEMAP_GROUP: "default",
                          }.VERSION,
                          "",
                        ],
                      }),
                    ],
                  }),
                  mode !== "share" &&
                    he &&
                    r(Text, {
                      children: [
                        "- Remote workspace:",
                        " ",
                        r(Text, {
                          dimColor: !0,
                          children: [
                            ht ? `session ${ht}; ` : "",
                            "git metadata is not collected from this machine",
                          ],
                        }),
                      ],
                    }),
                  mode !== "share" &&
                    e(fo, { fallback: null, children: e(GitMetadataLine, { gitStatePromise: so }) }),
                  r(Text, {
                    children: [
                      "- Session transcript:",
                      " ",
                      e(Text, {
                        dimColor: !0,
                        children:
                          mode === "share"
                            ? TRANSCRIPT_SCOPE_DESCRIPTIONS.session
                            : TRANSCRIPT_SCOPE_DESCRIPTIONS[be],
                      }),
                    ],
                  }),
                  mode !== "share" &&
                    r(Text, {
                      children: [
                        "- Recent error messages:",
                        " ",
                        e(Text, {
                          dimColor: !0,
                          children:
                            "up to the last 100 since you launched Claude Code (may include file paths)",
                        }),
                      ],
                    }),
                ],
              }),
              e(Box, {
                marginTop: 1,
                children: e(Text, {
                  wrap: "wrap",
                  dimColor: !0,
                  children: FEEDBACK_MODE_COPY[mode].consentFooter,
                }),
              }),
            ],
          }),
        F === "submitting" &&
          mode !== "share" &&
          e(Box, {
            flexDirection: "row",
            gap: 1,
            children: e(Text, { children: FEEDBACK_MODE_COPY[mode].submitting }),
          }),
        F === "done" &&
          mode === "bundle" &&
          r(Box, {
            flexDirection: "column",
            children: [
              r(Text, {
                color: "success",
                children: [e(StatusIcon, { status: "success", withSpace: !0 }), "Feedback bundle saved"],
              }),
              ge &&
                r(Box, {
                  marginTop: 1,
                  flexDirection: "column",
                  children: [
                    r(Text, { children: ["Bundle: ", e(Text, { dimColor: !0, children: ge })] }),
                    r(Text, { children: ["Reference ID: ", e(Text, { dimColor: !0, children: le })] }),
                    Fe &&
                      e(Box, {
                        marginTop: 1,
                        children: e(Text, { wrap: "wrap", children: TRANSCRIPT_PROBLEM_NOTES[Fe] }),
                      }),
                    e(Box, {
                      marginTop: 1,
                      children: e(Text, {
                        wrap: "wrap",
                        children:
                          "Send this file to your Anthropic account representative or attach it to your support request.",
                      }),
                    }),
                  ],
                }),
              e(Box, {
                marginTop: 1,
                children: e(Text, { dimColor: !0, children: "Press any key to close" }),
              }),
            ],
          }),
        F === "done" &&
          mode === "post" &&
          (Re || V
            ? r(Box, {
                flexDirection: "column",
                children: [
                  U
                    ? e(ErrorText, { error: U })
                    : r(Text, {
                        color: "success",
                        children: [e(StatusIcon, { status: "success", withSpace: !0 }), "Feedback sent"],
                      }),
                  le &&
                    r(Fragment, {
                      children: [
                        e(Box, {
                          marginTop: 1,
                          children: r(Text, {
                            children: ["Reference ID: ", e(Text, { dimColor: !0, children: le })],
                          }),
                        }),
                        e(Box, {
                          marginTop: 1,
                          children: e(Text, {
                            wrap: "wrap",
                            children:
                              "If you're working with Anthropic support, please include the ID above.",
                          }),
                        }),
                      ],
                    }),
                  e(Box, {
                    marginTop: 1,
                    children: e(Text, { dimColor: !0, italic: !0, children: "Any key to close" }),
                  }),
                ],
              })
            : r(Box, {
                flexDirection: "column",
                children: [
                  U
                    ? e(ErrorText, { error: U })
                    : e(Text, { color: "success", children: "Thank you for your report!" }),
                  le && r(Text, { dimColor: !0, children: ["Feedback ID: ", le] }),
                  e(Box, {
                    marginTop: 1,
                    children: e(Text, {
                      dimColor: !0,
                      italic: !0,
                      children: r(Byline, {
                        children: [
                          e(KeyboardShortcutHint, { chord: "enter", action: "open GitHub issue" }),
                          e(Text, { children: "any key to close" }),
                        ],
                      }),
                    }),
                  }),
                ],
              })),
        null,
      ],
    }),
  });
}
//@ chunk-seqjkch8.js:12089-13311 fingerprint = createGitHubIssueUrl (0.585)
function createGitHubIssueUrl(d, o, a) {
  let p = truncateToLength(redactSecrets(o), MAX_ISSUE_TITLE_CHARS),
    sanitizedTitle = redactSecrets(a),
    k = nullStub(),
    errorSuffix = `${GITHUB_ISSUES_REPO_URL()}/new?title=${encodeURIComponent(p)}&labels=user-reported,bug&body=`,
    errorsJson = encodeURIComponent(`**Bug Description**
`),
    encodedPrefix = encodeURIComponent(`

**Environment Info**
- Platform: ${env.platform}
- Terminal: ${env.terminal}
- Version: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION || "unknown"}
- Feedback ID: ${d}
`),
    encodedSuffix = encodeURIComponent(sanitizedTitle),
    W = MAX_FEEDBACK_BODY_CHARS - errorSuffix.length - errorsJson.length - encodedPrefix.length;
  if (encodedSuffix.length > W) {
    let encodedNote = encodeURIComponent(`\u2026

**Note:** The description was shortened to fit GitHub's link length limit. The full description was sent to Anthropic with the feedback report; its Feedback ID is below.`),
      buffer = 50,
      pe = W - encodedNote.length - 50;
    encodedSuffix = "";
    for (let me of sanitizedTitle) {
      let encodedFullBody = encodeURIComponent(me);
      if (encodedSuffix.length + encodedFullBody.length > pe) break;
      encodedSuffix += encodedFullBody;
    }
    encodedSuffix += encodedNote;
  }
  return errorSuffix + errorsJson + encodedSuffix + encodedPrefix;
}
/**
 * 用模型为公开 issue 生成简洁技术标题（不超过 80 字符），失败回落 "Bug Report"。
 */
//@ chunk-seqjkch8.js:13311-14915 fingerprint = generateTitle (0.938)
async function generateTitle(d, o, a) {
  try {
    let response = await queryHaikuWithFallback({
        systemPrompt: asSystemPrompt([
          "Generate a concise, technical issue title (max 80 chars) for a public GitHub issue based on this bug report for Claude Code.",
          "Claude Code is an agentic coding CLI based on the Anthropic API.",
          "The title should:",
          "- Include the type of issue [Bug] or [Feature Request] as the first thing in the title",
          "- Be concise, specific and descriptive of the actual problem",
          "- Use technical terminology appropriate for a software issue",
          '- For error messages, extract the key error (e.g., "Missing Tool Result Block" rather than the full message)',
          "- Be direct and clear for developers to understand the problem",
          '- If you cannot determine a clear issue, use "Bug Report: [brief description]"',
          "- Any LLM API errors are from the Anthropic API, not from any other model provider",
          "Your response will be directly used as the title of the Github issue, and as such should not contain any other commentary or explaination",
          'Examples of good titles include: "[Bug] Auto-Compact triggers to soon", "[Bug] Anthropic API Error: Missing Tool Result Block", "[Bug] Error: Invalid Model Name for Opus"',
        ]),
        userPrompt: d,
        signal: o,
        options: {
          hasAppendSystemPrompt: !1,
          toolChoice: void 0,
          isNonInteractiveSession: !1,
          agents: [],
          querySource: "feedback",
          mcpTools: [],
          agentContext: mainAgentContext(),
          credentials: a,
        },
      }),
      title = response.message.content[0]?.type === "text" ? response.message.content[0].text : "Bug Report";
    if (response.isApiErrorMessage || startsWithApiErrorPrefix(title)) return createFallbackTitle(d);
    if (xo(title)) return createFallbackTitle(d);
    return title;
  } catch (error) {
    if (isAbortError(error))
      logForDebugging("Feedback title generation via Haiku aborted, using fallback", { level: "debug" });
    else logError(error);
    return createFallbackTitle(d);
  }
}
//@ chunk-seqjkch8.js:14915-15032 layout
var REFUSAL_PREFIX_RE =
  /^(i can['\u2019]t|i cannot|i['\u2019]m unable|i am unable|i['\u2019]m sorry|i am sorry|i apologize|sorry,)/i;
//@ chunk-seqjkch8.js:15032-15088 layout
function xo(d) {
  let trimmed = d.trim();
  return trimmed === "" || REFUSAL_PREFIX_RE.test(trimmed);
}
//@ chunk-seqjkch8.js:15088-15279 fingerprint = createFallbackTitle (1)
function createFallbackTitle(description) {
  let o = getFirstLine(description);
  if (o.length <= 60 && o.length > 5) return o;
  let truncated = o.slice(0, 60);
  if (o.length > 60) {
    let lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 30) truncated = truncated.slice(0, lastSpace);
    truncated += "...";
  }
  return truncated.length < 10 ? "Bug Report" : truncated;
}
/**
 * 反馈确认页中的一行 git 元数据：分支、短提交号、远程地址、是否未同步与有无本地改动。
 */
//@ chunk-seqjkch8.js:15279-15835 sole-consumer
function GitMetadataLine(props) {
  let $ = w(8),
    { gitStatePromise: gitStatePromise } = props,
    gitState = Qr(gitStatePromise);
  if (!gitState) {
    return null;
  }
  const branchName = gitState.branchName;
  let commitSuffix;
  if ($[0] !== gitState.commitHash)
    ((commitSuffix = gitState.commitHash ? `, ${gitState.commitHash.slice(0, 7)}` : ""),
      ($[0] = gitState.commitHash),
      ($[1] = commitSuffix));
  else commitSuffix = $[1];
  const remoteSuffix = gitState.remoteUrl ? ` @ ${gitState.remoteUrl}` : "",
    unsyncedNote = !gitState.isHeadOnRemote && ", not synced",
    dirtyNote = !gitState.isClean && ", has local changes";
  let content;
  if (
    $[2] !== gitState.branchName ||
    $[3] !== commitSuffix ||
    $[4] !== remoteSuffix ||
    $[5] !== unsyncedNote ||
    $[6] !== dirtyNote
  )
    ((content = r(Text, {
      children: [
        "- Git repo metadata:",
        " ",
        r(Text, {
          dimColor: !0,
          children: [branchName, commitSuffix, remoteSuffix, unsyncedNote, dirtyNote],
        }),
      ],
    })),
      ($[2] = gitState.branchName),
      ($[3] = commitSuffix),
      ($[4] = remoteSuffix),
      ($[5] = unsyncedNote),
      ($[6] = dirtyNote),
      ($[7] = content));
  else content = $[7];
  return content;
}
//@ chunk-xx1vmpsq.js:18905-18966 sole-consumer
function Vs(e) {
  let s = e?.["request-id"];
  return isSessionsToken(s) ? s : void 0;
}
/**
 * 提交反馈到 /api/claude_cli_feedback（检查策略 allow_product_feedback 与大小），返回 feedback ID。
 */
//@ chunk-xx1vmpsq.js:18966-20766 fingerprint = submitFeedback (0.33)
async function submitFeedback(e, s, n, y) {
  if (isEssentialTrafficOnly()) return { success: !1 };
  if (!isPolicyAllowed("allow_product_feedback")) return { success: !1, failureReason: "policy_blocked" };
  let r = 0;
  try {
    let w = buildFeedbackPayload(
      e,
      TRANSCRIPT_FIELDS,
      xs,
      n === void 0 ? void 0 : { extraOuterFields: { session_id: n } },
    );
    if (((r = w.length), r > dDe))
      return { success: !1, payloadTooLarge: !0, failureReason: "payload_too_large_precheck" };
    let T = await withOAuth401Retry(
      () =>
        apiClient.post("/api/claude_cli_feedback", w, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
          signal: s,
          credentials: y,
          validateStatus: (M) => M !== 401,
        }),
      { gateToSessionOAuthCredential: !0, credentials: y },
    );
    if (!T.ok)
      switch (T.reason) {
        case "essential-traffic-only":
          return { success: !1 };
        case "data-residency":
          return { success: !1, failureReason: "data_residency" };
        case "no-auth":
          return { success: !1, failureReason: "auth_error" };
      }
    if (T.status === 200 && T.data?.feedback_id) return { success: !0, feedbackId: T.data.feedback_id };
    let C = Vs(T.response.headers);
    if (T.status === 200)
      return (
        redactError(Error("Failed to submit feedback: request did not return feedback_id")),
        { success: !1, failureReason: "missing_feedback_id", requestId: C }
      );
    if (T.status === 413)
      return {
        success: !1,
        payloadTooLarge: !0,
        failureReason: "payload_too_large_413",
        statusCode: 413,
        requestId: C,
      };
    let I = "Failed to submit feedback:" + T.status;
    if (T.status === 401 || T.status === 403 || T.status === 429) logForDebugging(I);
    else redactError(Error(I));
    return { ...classifyFeedbackError(T.status, T.data), requestId: C };
  } catch (err) {
    if (isCancel(err)) return { success: !1 };
    if (err instanceof RangeError)
      return { success: !1, payloadTooLarge: !0, failureReason: "payload_too_large_range_error" };
    if (isAxiosError(err) && err.code === "ECONNABORTED" && r > dDe / 8)
      return { success: !1, payloadTooLarge: !0, failureReason: "payload_too_large_timeout" };
    if (isExpectedApiError(err)) logForDebugging(redactSecrets_2(errorMessage(err)));
    else redactError(err);
    if (isAxiosError(err) && err.response)
      return {
        ...classifyFeedbackError(err.response.status, err.response.data),
        requestId: Vs(err.response.headers),
      };
    return {
      success: !1,
      failureReason: isAxiosError(err) && err.code === "ECONNABORTED" ? "timeout" : "network_error",
    };
  }
}
//@ chunk-4121qate.js:62271-62421 fingerprint = sanitizeAndLogError (0.507)
function sanitizeAndLogError(err) {
  let o = (...r) => {
    try {
      return err(...r);
    } catch (error) {
      let { msg: msg, name: i, stack: stack } = describeThrownValue(error);
      throw createSealedError(msg, i, stack);
    }
  };
  return (Object.setPrototypeOf(o, null), o);
}
//@ chunk-hm0ce8vc.js:67174-67301 fingerprint = loadRawTranscriptJsonl (0.519)
function loadRawTranscriptJsonl(e) {
  let n = jsonStringify(e) ?? String(e),
    byteLength = Buffer.byteLength(n, "utf8");
  return byteLength <= 200 ? n : `${n.slice(0, 200)}\u2026 (+${byteLength - 200} bytes)`;
}
//@ chunk-hwmsct5x.js:197534-197606 fingerprint = GITHUB_ISSUES_REPO_URL (0.432)
function GITHUB_ISSUES_REPO_URL() {
  return "https://github.com/anthropics/claude-code/issues";
}

export {
  sanitizeAndLogError,
  createFeedbackStatusStore,
  Feedback,
  submitFeedback,
  loadRawTranscriptJsonl,
  GITHUB_ISSUES_REPO_URL,
};
