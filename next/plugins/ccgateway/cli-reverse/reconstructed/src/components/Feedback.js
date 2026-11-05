/**
 * components/Feedback.tsx
 *
 * /feedback（/bug）：收集描述、可选附带会话记录，提交到 /api/claude_cli_feedback 并生成 GitHub issue 链接（模型生成标题）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Feedback.tsx
 * pieces: chunk-asf5gh8x.js (1), chunk-hmaqgh0x.js (1), chunk-pwdsqzsj.js (2), chunk-vn3g7zt8.js (1), chunk-y656fhcx.js (13)
 * attribution: fingerprint 8, sole-consumer 2, placement 5, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { describeThrownValue, createSealedError } from "../plugins/functionHooks/vm/vmRealm.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { isSessionsToken } from "../services/oauth/sessionsBearerHooks.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import {
  buildFeedbackPayload,
  TRANSCRIPT_FIELDS,
  SUBAGENT_TRANSCRIPT_FIELDS,
  MAX_PAYLOAD_PART_COUNT,
  redactError,
  classifyFeedbackError,
  orgRefusalError,
  credentialRefusalMessage,
  serverStatusSuffix,
} from "../services/feedback/submitFeedback.js";
import { withOAuth401Retry } from "../utils/http.js";
import { apiClient } from "../services/routines/routinesApi.js";
import { logForDebugging } from "../utils/debug.js";
import { isCancel, isAxiosError } from "../../vendor/axios/dist/esm/axios.js";
import { isExpectedApiError, errorMessage, isAbortError } from "../utils/errors.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import {
  init_react_production,
  useState,
  useCallback,
  suspenseTypeExport,
  use,
} from "../../vendor/react/cjs/react.production.js";
import { createStore } from "../state/store.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { isRemoteSessionAvailable, getRemoteCaps } from "../remote/remoteMode.js";
import { getIsGit, getGitState } from "../utils/git.js";
import { useAppState } from "../state/AppState.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { nullStub } from "../utils/externalBuildStubs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { checkProductFeedbackAllowed } from "../commands/feedback/feedbackPolicy.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { saveFeedbackBundle, postFeedbackSubmission } from "../services/feedback/feedbackBundle.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { openValidatedUrlSucceeded } from "../utils/browser.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { isOn } from "../utils/codeMode/accepted.js";
import { CODE_MODE_EXPERIMENTAL_LABEL } from "../constants/codeMode.js";
import { queryHaikuWithFallback } from "../services/api/claude.js";
import { asSystemPrompt } from "../utils/systemPromptType.js";
import { mainAgentContext } from "../utils/agentContext.js";
import { startsWithApiErrorPrefix } from "../services/api/errors.js";
import { logError } from "../utils/log.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:197924-197996 fingerprint (2.1.88 match: GITHUB_ISSUES_REPO_URL, 0.432)
function GITHUB_ISSUES_REPO_URL() {
  return "https://github.com/anthropics/claude-code/issues";
}
//@ chunk-hmaqgh0x.js:13007-13157 fingerprint (2.1.88 match: sanitizeAndLogError, 0.504)
function sanitizeAndLogError(err) {
  let wrapped = (...args) => {
    try {
      return err(...args);
    } catch (error) {
      let { msg, name, stack } = describeThrownValue(error);
      throw createSealedError(msg, name, stack);
    }
  };
  Object.setPrototypeOf(wrapped, null);
  return wrapped;
}
//@ chunk-asf5gh8x.js:76841-76968 fingerprint (2.1.88 match: loadRawTranscriptJsonl, 0.519)
function loadRawTranscriptJsonl(message) {
  let json = jsonStringify(message) ?? String(message);
  let byteLength = Buffer.byteLength(json, "utf8");
  return byteLength <= 200 ? json : `${json.slice(0, 200)}\u2026 (+${byteLength - 200} bytes)`;
}
//@ chunk-pwdsqzsj.js:19279-19340 sole-consumer
function requestIdHeader(headers) {
  let requestId = headers?.["request-id"];
  return isSessionsToken(requestId) ? requestId : undefined;
}
//@ chunk-pwdsqzsj.js:19340-21140 fingerprint (2.1.88 match: submitFeedback, 0.33)
/**
 * 提交反馈到 /api/claude_cli_feedback（检查策略 allow_product_feedback 与大小），返回 feedback ID。
 */
async function submitFeedback(draft, signal, sessionIdForMessage, credentials) {
  if (isEssentialTrafficOnly())
    return {
      success: false,
    };
  if (!isPolicyAllowed("allow_product_feedback"))
    return {
      success: false,
      failureReason: "policy_blocked",
    };
  let attempts = 0;
  try {
    let feedbackPayload = buildFeedbackPayload(
      draft,
      TRANSCRIPT_FIELDS,
      SUBAGENT_TRANSCRIPT_FIELDS,
      sessionIdForMessage === undefined
        ? undefined
        : {
            extraOuterFields: {
              session_id: sessionIdForMessage,
            },
          },
    );
    attempts = feedbackPayload.length;
    if (attempts > MAX_PAYLOAD_PART_COUNT)
      return {
        success: false,
        payloadTooLarge: true,
        failureReason: "payload_too_large_precheck",
      };
    let report = await withOAuth401Retry(
      () =>
        apiClient.post("/api/claude_cli_feedback", feedbackPayload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
          signal,
          credentials,
          validateStatus: (result) => result !== 401,
        }),
      {
        gateToSessionOAuthCredential: true,
        credentials,
      },
    );
    if (!report.ok)
      switch (report.reason) {
        case "essential-traffic-only":
          return {
            success: false,
          };
        case "data-residency":
          return {
            success: false,
            failureReason: "data_residency",
          };
        case "no-auth":
          return {
            success: false,
            failureReason: "auth_error",
          };
      }
    if (report.status === 200 && report.data?.feedback_id)
      return {
        success: true,
        feedbackId: report.data.feedback_id,
      };
    let requestId = requestIdHeader(report.response.headers);
    if (report.status === 200) {
      redactError(Error("Failed to submit feedback: request did not return feedback_id"));
      return {
        success: false,
        failureReason: "missing_feedback_id",
        requestId,
      };
    }
    if (report.status === 413)
      return {
        success: false,
        payloadTooLarge: true,
        failureReason: "payload_too_large_413",
        statusCode: 413,
        requestId,
      };
    let success = "Failed to submit feedback:" + report.status;
    if (report.status === 401 || report.status === 403 || report.status === 429) logForDebugging(success);
    else redactError(Error(success));
    return {
      ...classifyFeedbackError(report.status, report.data),
      requestId,
    };
  } catch (err) {
    if (isCancel(err))
      return {
        success: false,
      };
    if (err instanceof RangeError)
      return {
        success: false,
        payloadTooLarge: true,
        failureReason: "payload_too_large_range_error",
      };
    if (isAxiosError(err) && err.code === "ECONNABORTED" && attempts > MAX_PAYLOAD_PART_COUNT / 8)
      return {
        success: false,
        payloadTooLarge: true,
        failureReason: "payload_too_large_timeout",
      };
    if (isExpectedApiError(err)) logForDebugging(redactSecrets(errorMessage(err)));
    else redactError(err);
    if (isAxiosError(err) && err.response)
      return {
        ...classifyFeedbackError(err.response.status, err.response.data),
        requestId: requestIdHeader(err.response.headers),
      };
    return {
      success: false,
      failureReason: isAxiosError(err) && err.code === "ECONNABORTED" ? "timeout" : "network_error",
    };
  }
}
//@ chunk-y656fhcx.js:1794-1798 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y656fhcx.js:1794", () => {
  init_react_production();
});
//@ chunk-y656fhcx.js:1798-1802 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y656fhcx.js:1798", () => {
  init_react_production();
});
//@ chunk-y656fhcx.js:1802-1806 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y656fhcx.js:1802", () => {
  init_react_production();
});
//@ chunk-y656fhcx.js:1806-3225 placement
/**
 * /feedback 的文案常量：记录范围说明与选项、记录缺失/不完整/过大的提示、post/bundle/share 三种模式的同意与提交文案。
 */
var MAX_FEEDBACK_BODY_CHARS = 7250;
var feedbackSubmitKeys = ["enter", "escape"];
var MAX_ISSUE_TITLE_CHARS = 200;
var TRANSCRIPT_SCOPE_DESCRIPTIONS = {
  session: "this session only",
  day: "this session + this project\u2019s other sessions from the last 24 hours",
  week: "this session + this project\u2019s other sessions from the last 7 days",
};
var TRANSCRIPT_SCOPE_OPTIONS = [
  {
    label: "This session only",
    value: "session",
  },
  {
    label: "This session + the last 24 hours",
    value: "day",
  },
  {
    label: "This session + the last 7 days",
    value: "week",
  },
];
var TRANSCRIPT_PROBLEM_NOTES = {
  transcript_missing: "This session has no transcript on disk, so the bundle has the report only.",
  transcript_incomplete:
    "The session transcript couldn't be read in full, so the bundle is missing some or all of it.",
  transcript_over_zip_limit:
    "The session transcript is too large for one archive, so the bundle has only the start of it.",
};
var FEEDBACK_MODE_COPY = {
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
//@ chunk-y656fhcx.js:3225-3842 placement
/**
 * 创建反馈提交状态存储（none/sending/delivered/saved/failed）；share 模式返回空操作版本，失败不会覆盖已送达或已保存的状态。
 */
function createFeedbackStatusStore(mode) {
  let store = createStore({
    status: "none",
  });
  let { subscribe, getSnapshot } = store;
  if (mode === "share")
    return {
      subscribe,
      getSnapshot,
      start() {},
      deliver() {},
      save() {},
      fail() {},
      abandon() {},
    };
  return {
    subscribe,
    getSnapshot,
    start() {
      store.setState(() => ({
        status: "sending",
      }));
    },
    deliver(referenceId) {
      store.setState(() => ({
        status: "delivered",
        referenceId,
      }));
    },
    save(referenceId, bundlePath, statusStore) {
      store.setState(() => ({
        status: "saved",
        referenceId,
        bundlePath,
        ...(statusStore !== undefined && {
          transcriptProblem: statusStore,
        }),
      }));
    },
    fail(reason, isFinal) {
      store.setState((previous) =>
        previous.status === "delivered" || previous.status === "saved"
          ? previous
          : {
              status: "failed",
              reason,
              ...(isFinal === true && {
                final: isFinal,
              }),
            },
      );
    },
    abandon() {
      store.setState((previous) =>
        previous.status === "sending"
          ? {
              status: "none",
            }
          : previous,
      );
    },
  };
}
//@ chunk-y656fhcx.js:3842-3900 layout
async function runThenAbandon(handleCancel, tracker) {
  try {
    await handleCancel();
  } finally {
    tracker.abandon();
  }
}
//@ chunk-y656fhcx.js:3900-12490 fingerprint (2.1.88 match: Feedback, 0.313)
/**
 * /feedback：输入描述 → 确认是否附带记录 → 提交（submitFeedback）→ 显示 feedback ID 与可打开的 GitHub issue 链接。
 */
function Feedback({
  abortController,
  messages,
  initialDescription,
  onDone,
  applyMessageOp,
  backgroundTasks = {},
  mode = "post",
  readFileState,
  surveyFeedbackSource,
  command = "/feedback",
  wholeTranscript,
  send,
}) {
  let { storageV5, credentials } = useTheme_2();
  let sanitizedErrors = useHost();
  let [phase, setPhase] = useState("userInput");
  let [tick, setTick] = useState(0);
  let [description, setDescription] = useState(initialDescription ?? "");
  let [feedbackId, setFeedbackId] = useState(null);
  let [bundlePath, setBundlePath] = useState(null);
  let [transcriptProblem, setTranscriptProblem] = useState(null);
  let [errorText, setErrorText] = useState(null);
  let [isPolicyError, setIsPolicyError] = useState(false);
  let [statusStore] = useState(() => send ?? createFeedbackStatusStore(mode));
  let lastAssistantMessage = useStoreSelector(statusStore);
  let [hasTyped, setHasTyped] = useState(false);
  let [staleStatus, setStaleStatus] = useState(null);
  let currentStatus = staleStatus ?? lastAssistantMessage;
  let hasDeliveryStatus = mode !== "share" && !hasTyped && currentStatus.status !== "none";
  let isDelivered = hasDeliveryStatus && currentStatus.status !== "failed";
  let submitPhase = currentStatus.status === "sending" ? "submitting" : "done";
  let activePhase = isDelivered ? submitPhase : phase;
  let reason = hasDeliveryStatus && currentStatus.status === "failed" ? currentStatus.reason : null;
  let displayError = errorText ?? reason;
  let isErrorFinal =
    errorText !== null
      ? isPolicyError
      : hasDeliveryStatus && currentStatus.status === "failed" && currentStatus.final === true;
  let shownFeedbackId =
    hasDeliveryStatus && (currentStatus.status === "delivered" || currentStatus.status === "saved")
      ? currentStatus.referenceId
      : feedbackId;
  let shownBundlePath =
    hasDeliveryStatus && currentStatus.status === "saved" ? currentStatus.bundlePath : bundlePath;
  let shownTranscriptProblem =
    hasDeliveryStatus && currentStatus.status === "saved"
      ? (currentStatus.transcriptProblem ?? null)
      : transcriptProblem;
  let isRemoteSession = isRemoteSessionAvailable();
  let remoteSessionId = isRemoteSession ? (getRemoteCaps()?.sessionId ?? null) : null;
  let [gitStatePromise] = useState(() =>
    isRemoteSession
      ? Promise.resolve(null)
      : getIsGit()
          .then((isGit) => (isGit ? getGitState() : null))
          .catch(() => null),
  );
  let [issueBody, setIssueBody] = useState(null);
  let [transcriptScope, setTranscriptScope] = useState("session");
  let teammateTranscripts = useAppState((appState) => appState.transcripts);
  let columns = useTerminalSize().columns - 4;
  let emptyStub = nullStub();
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lynx", false);
  let handleCancel = useCallback(async () => {
    setPhase("submitting");
    setErrorText(null);
    setFeedbackId(null);
    statusStore.start();
    let failWith = (input, isPolicyFailure = false) => {
      setErrorText(input);
      setIsPolicyError(isPolicyFailure);
      setPhase("userInput");
      statusStore.fail(input, isPolicyFailure);
    };
    if (mode === "bundle") {
      let policyBlock = checkProductFeedbackAllowed(command);
      if (policyBlock !== null) {
        logFeatureBad("feedback_bundle", "disabled_at_save");
        failWith(policyBlock);
        return;
      }
      let bundleResult = await saveFeedbackBundle({
        messages,
        description,
        surface: "cli",
        scope: transcriptScope,
        backgroundTasks,
        transcripts: teammateTranscripts,
        signal: abortController.signal,
        surveyFeedbackSource,
        wholeTranscript,
        storageV5,
        host: sanitizedErrors,
      });
      if (abortController.signal.aborted) return;
      if (bundleResult.success) {
        setFeedbackId(bundleResult.bundleId);
        setBundlePath(bundleResult.zipPath);
        setTranscriptProblem(bundleResult.transcriptProblem ?? null);
        setPhase("done");
        statusStore.save(bundleResult.bundleId, bundleResult.zipPath, bundleResult.transcriptProblem);
      } else failWith(`Couldn't save the feedback bundle to disk: ${bundleResult.error}`);
      return;
    }
    let [postResult, generatedTitle] = await Promise.all([
      postFeedbackSubmission({
        messages,
        description,
        surface: "cli",
        scope: transcriptScope,
        backgroundTasks,
        transcripts: teammateTranscripts,
        signal: abortController.signal,
        surveyFeedbackSource,
        storageV5,
        host: sanitizedErrors,
        credentials,
      }),
      featureValue_CACHED_MAY_BE_STALE
        ? Promise.resolve(null)
        : generateTitle(description, abortController.signal, credentials),
    ]);
    if (abortController.signal.aborted) return;
    setIssueBody(generatedTitle);
    if (postResult.success) {
      setFeedbackId(postResult.feedbackId);
      setPhase("done");
      statusStore.deliver(postResult.feedbackId);
    } else {
      let orgRefusal = orgRefusalError(postResult);
      let refusalMessage = orgRefusal ?? credentialRefusalMessage(postResult);
      if (refusalMessage !== undefined)
        failWith(refusalMessage, orgRefusal !== undefined && postResult.refusal?.reportContent !== true);
      else if (postResult.failureReason === "auth_error")
        failWith("Couldn't send feedback: not signed in. Run /login, then retry.");
      else if (postResult.failureReason === "policy_blocked")
        failWith(
          checkProductFeedbackAllowed(command) ?? "Feedback is disabled by your organization's policy.",
        );
      else {
        let statusSuffix =
          serverStatusSuffix(postResult) ??
          (postResult.failureReason === "timeout"
            ? " (request timed out)"
            : postResult.failureReason === "network_error"
              ? " (couldn't reach the service)"
              : "");
        failWith(
          `Couldn't send feedback${statusSuffix}. If it keeps failing, you can file at ${GITHUB_ISSUES_REPO_URL()} instead.`,
        );
      }
    }
  }, [
    description,
    messages,
    featureValue_CACHED_MAY_BE_STALE,
    backgroundTasks,
    teammateTranscripts,
    abortController,
    mode,
    transcriptScope,
    storageV5,
    credentials,
    command,
    wholeTranscript,
    statusStore,
    sanitizedErrors,
  ]);
  let submitConsent = useCallback(
    () => runThenAbandon(handleCancel, statusStore),
    [handleCancel, statusStore],
  );
  let handleCancelKey = useCallback(() => {
    if (activePhase === "done") {
      onDone(undefined, {
        display: "skip",
      });
      return;
    }
    if (hasDeliveryStatus) {
      let snapshot = statusStore.getSnapshot();
      setStaleStatus((previous) => previous ?? snapshot);
    }
    abortController.abort();
    onDone("Feedback / bug report cancelled", {
      display: "system",
    });
  }, [onDone, abortController, statusStore, hasDeliveryStatus, activePhase]);
  let finishDone = useCallback(() => {
    setPhase("done");
  }, []);
  let dismissError = useCallback((message) => {
    setErrorText(message);
    setIsPolicyError(false);
    setPhase("userInput");
  }, []);
  useKeybinding("confirm:no", handleCancelKey, {
    context: "Settings",
    isActive: activePhase === "userInput",
  });
  let isDoneLocked =
    (activePhase === "done" && mode !== "share") || (displayError && activePhase !== "userInput");
  function handleKeyDown(event) {
    if (event.ctrl || event.meta) return;
    if (activePhase === "done") {
      if (mode === "share") return;
      event.preventDefault();
      if (!featureValue_CACHED_MAY_BE_STALE && event.key === "return" && issueBody) {
        let gitHubIssueUrl = createGitHubIssueUrl(shownFeedbackId ?? "", issueBody, description);
        openValidatedUrlSucceeded(gitHubIssueUrl);
      }
      if (displayError)
        onDone("Error submitting feedback / bug report", {
          display: "system",
        });
      else if (mode === "bundle" && shownBundlePath)
        onDone(
          shownTranscriptProblem === null
            ? `Feedback bundle saved to \`${shownBundlePath}\``
            : `Feedback bundle saved to \`${shownBundlePath}\`. ${TRANSCRIPT_PROBLEM_NOTES[shownTranscriptProblem]}`,
          {
            display: "system",
          },
        );
      else
        onDone("Feedback / bug report submitted", {
          display: "system",
        });
      return;
    }
    if (displayError && activePhase !== "userInput") {
      event.preventDefault();
      onDone("Error submitting feedback / bug report", {
        display: "system",
      });
      return;
    }
    if (activePhase === "consent") {
      if (event.key === "left") {
        event.preventDefault();
        setPhase(mode === "share" || isRemoteSession ? "userInput" : "scope");
        return;
      }
      if (event.key === "return" || event.key === " ") {
        event.preventDefault();
        submitConsent();
      }
    }
  }
  return jsxProd_default(FocusColumn, {
    onKeyDown: handleKeyDown,
    children: jsxProd_default_2(Dialog, {
      title: "Submit feedback / bug report",
      onCancel: handleCancelKey,
      isCancelActive: activePhase !== "userInput" && !isDoneLocked,
      hideInputGuide: activePhase === "done" && mode !== "share",
      inputGuide:
        activePhase === "userInput"
          ? jsxProd_default_2(Byline, {
              children: [
                !isErrorFinal &&
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "continue",
                  }),
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Confirmation",
                  fallback: "Esc",
                  description: "cancel",
                }),
              ],
            })
          : activePhase === "scope"
            ? jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "choose",
                  }),
                  jsxProd_default(ConfigurableShortcutHint, {
                    action: "confirm:no",
                    context: "Confirmation",
                    fallback: "Esc",
                    description: "cancel",
                  }),
                ],
              })
            : activePhase === "consent"
              ? jsxProd_default_2(Byline, {
                  children: [
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "enter",
                      action: FEEDBACK_MODE_COPY[mode].consentAction,
                    }),
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "left",
                      action: "change",
                    }),
                    jsxProd_default(ConfigurableShortcutHint, {
                      action: "confirm:no",
                      context: "Confirmation",
                      fallback: "Esc",
                      description: "cancel",
                    }),
                  ],
                })
              : activePhase === "submitting"
                ? jsxProd_default(ConfigurableShortcutHint, {
                    action: "confirm:no",
                    context: "Confirmation",
                    fallback: "Esc",
                    description: "cancel",
                  })
                : activePhase === "done"
                  ? jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "c",
                          action: "copy",
                        }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: feedbackSubmitKeys,
                          action: "close",
                        }),
                      ],
                    })
                  : null,
      children: [
        activePhase === "userInput" &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(Text, {
                children: "Describe the issue below:",
              }),
              jsxProd_default(TextInput, {
                value: description,
                onChange: (char) => {
                  setDescription(char);
                  if (isErrorFinal && errorText === null && displayError !== null) {
                    setErrorText(displayError);
                    setIsPolicyError(true);
                  }
                  setHasTyped(true);
                  if (displayError && !isErrorFinal) setErrorText(null);
                },
                columns,
                clearOnSubmit: false,
                onSubmit: (submittedText) => {
                  if (isErrorFinal) return;
                  setHasTyped(true);
                  if (mode !== "share" && submittedText.trim() === "") {
                    setErrorText("Please describe the issue before submitting.");
                    setIsPolicyError(false);
                    return;
                  }
                  setErrorText(null);
                  setPhase(mode === "share" || isRemoteSession ? "consent" : "scope");
                },
                onExitMessage: (exitState) => {
                  if (exitState) {
                    abortController.abort();
                    onDone("Feedback cancelled", {
                      display: "system",
                    });
                  }
                },
                cursorOffset: tick,
                onChangeCursorOffset: setTick,
                showCursor: true,
                focus: true,
              }),
              displayError &&
                jsxProd_default_2(Box, {
                  flexDirection: "column",
                  gap: 1,
                  children: [
                    jsxProd_default(ErrorText, {
                      error: displayError,
                    }),
                    !isErrorFinal &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "Edit and press Enter to retry, or Esc to cancel",
                      }),
                  ],
                }),
            ],
          }),
        activePhase === "scope" &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(Text, {
                children: "How much session history should we include?",
              }),
              jsxProd_default(ModelSelector, {
                options: TRANSCRIPT_SCOPE_OPTIONS,
                defaultFocusValue: transcriptScope,
                onChange: (value) => {
                  setTranscriptScope(value);
                  setPhase("consent");
                },
                onCancel: handleCancelKey,
              }),
            ],
          }),
        activePhase === "consent" &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                children: FEEDBACK_MODE_COPY[mode].consentIntro,
              }),
              jsxProd_default_2(Box, {
                marginLeft: 2,
                flexDirection: "column",
                children: [
                  jsxProd_default_2(Text, {
                    children: [
                      "- Your feedback / bug description:",
                      " ",
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: description,
                      }),
                    ],
                  }),
                  jsxProd_default_2(Text, {
                    children: [
                      "- Environment info:",
                      " ",
                      jsxProd_default_2(Text, {
                        dimColor: true,
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
                            VERSION: "2.1.318",
                            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                            BUILD_TIME: "2026-11-03T18:52:53Z",
                            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
                    isRemoteSession &&
                    jsxProd_default_2(Text, {
                      children: [
                        "- Remote workspace:",
                        " ",
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            remoteSessionId ? `session ${remoteSessionId}; ` : "",
                            "git metadata is not collected from this machine",
                          ],
                        }),
                      ],
                    }),
                  mode !== "share" &&
                    jsxProd_default(suspenseTypeExport, {
                      fallback: null,
                      children: jsxProd_default(GitMetadataLine, {
                        gitStatePromise,
                      }),
                    }),
                  jsxProd_default_2(Text, {
                    children: [
                      "- Session transcript:",
                      " ",
                      jsxProd_default(Text, {
                        dimColor: true,
                        children:
                          mode === "share"
                            ? TRANSCRIPT_SCOPE_DESCRIPTIONS.session
                            : TRANSCRIPT_SCOPE_DESCRIPTIONS[transcriptScope],
                      }),
                    ],
                  }),
                  mode !== "share" &&
                    jsxProd_default_2(Text, {
                      children: [
                        "- Recent error messages:",
                        " ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children:
                            "up to the last 100 since you launched Claude Code (may include file paths)",
                        }),
                      ],
                    }),
                ],
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  wrap: "wrap",
                  dimColor: true,
                  children: FEEDBACK_MODE_COPY[mode].consentFooter,
                }),
              }),
            ],
          }),
        activePhase === "submitting" &&
          mode !== "share" &&
          jsxProd_default(Box, {
            flexDirection: "row",
            gap: 1,
            children: jsxProd_default(Text, {
              children: FEEDBACK_MODE_COPY[mode].submitting,
            }),
          }),
        activePhase === "done" &&
          mode === "bundle" &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                color: "success",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "success",
                    withSpace: true,
                  }),
                  "Feedback bundle saved",
                ],
              }),
              shownBundlePath &&
                jsxProd_default_2(Box, {
                  marginTop: 1,
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Text, {
                      children: [
                        "Bundle: ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: shownBundlePath,
                        }),
                      ],
                    }),
                    jsxProd_default_2(Text, {
                      children: [
                        "Reference ID: ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: shownFeedbackId,
                        }),
                      ],
                    }),
                    shownTranscriptProblem &&
                      jsxProd_default(Box, {
                        marginTop: 1,
                        children: jsxProd_default(Text, {
                          wrap: "wrap",
                          children: TRANSCRIPT_PROBLEM_NOTES[shownTranscriptProblem],
                        }),
                      }),
                    jsxProd_default(Box, {
                      marginTop: 1,
                      children: jsxProd_default(Text, {
                        wrap: "wrap",
                        children:
                          "Send this file to your Anthropic account representative or attach it to your support request.",
                      }),
                    }),
                  ],
                }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: "Press any key to close",
                }),
              }),
            ],
          }),
        activePhase === "done" &&
          mode === "post" &&
          (featureValue_CACHED_MAY_BE_STALE || hasDeliveryStatus
            ? jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  displayError
                    ? jsxProd_default(ErrorText, {
                        error: displayError,
                      })
                    : jsxProd_default_2(Text, {
                        color: "success",
                        children: [
                          jsxProd_default(StatusIcon, {
                            status: "success",
                            withSpace: true,
                          }),
                          "Feedback sent",
                        ],
                      }),
                  shownFeedbackId &&
                    jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(Box, {
                          marginTop: 1,
                          children: jsxProd_default_2(Text, {
                            children: [
                              "Reference ID: ",
                              jsxProd_default(Text, {
                                dimColor: true,
                                children: shownFeedbackId,
                              }),
                            ],
                          }),
                        }),
                        jsxProd_default(Box, {
                          marginTop: 1,
                          children: jsxProd_default(Text, {
                            wrap: "wrap",
                            children:
                              "If you're working with Anthropic support, please include the ID above.",
                          }),
                        }),
                      ],
                    }),
                  jsxProd_default(Box, {
                    marginTop: 1,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      italic: true,
                      children: "Any key to close",
                    }),
                  }),
                ],
              })
            : jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  displayError
                    ? jsxProd_default(ErrorText, {
                        error: displayError,
                      })
                    : jsxProd_default(Text, {
                        color: "success",
                        children: "Thank you for your report!",
                      }),
                  shownFeedbackId &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["Feedback ID: ", shownFeedbackId],
                    }),
                  jsxProd_default(Box, {
                    marginTop: 1,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      italic: true,
                      children: jsxProd_default_2(Byline, {
                        children: [
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "enter",
                            action: "open GitHub issue",
                          }),
                          jsxProd_default(Text, {
                            children: "any key to close",
                          }),
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
//@ chunk-y656fhcx.js:12490-13739 fingerprint (2.1.88 match: createGitHubIssueUrl, 0.562)
function createGitHubIssueUrl(feedbackId, errorsText, title) {
  let shortTitle = truncateToLength(redactSecrets(errorsText), MAX_ISSUE_TITLE_CHARS);
  let sanitizedTitle = redactSecrets(title);
  let emptyStub = nullStub();
  let errorSuffix = `${GITHUB_ISSUES_REPO_URL()}/new?title=${encodeURIComponent(shortTitle)}&labels=user-reported,bug&body=`;
  let errorsJson = encodeURIComponent(`**Bug Description**
`);
  let encodedPrefix = encodeURIComponent(
    `

**Environment Info**
- Platform: ${env.platform}
- Terminal: ${env.terminal}
- Version: ${
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION || "unknown"
    }
` +
      (isOn()
        ? `- ${CODE_MODE_EXPERIMENTAL_LABEL}: on
`
        : "") +
      `- Feedback ID: ${feedbackId}
`,
  );
  let encodedSuffix = encodeURIComponent(sanitizedTitle);
  let remainingChars =
    MAX_FEEDBACK_BODY_CHARS - errorSuffix.length - errorsJson.length - encodedPrefix.length;
  if (encodedSuffix.length > remainingChars) {
    let encodedNote = encodeURIComponent(`\u2026

**Note:** The description was shortened to fit GitHub's link length limit. The full description was sent to Anthropic with the feedback report; its Feedback ID is below.`);
    let buffer = 50;
    let titleBudget = remainingChars - encodedNote.length - 50;
    encodedSuffix = "";
    for (let char of sanitizedTitle) {
      let encodedFullBody = encodeURIComponent(char);
      if (encodedSuffix.length + encodedFullBody.length > titleBudget) break;
      encodedSuffix += encodedFullBody;
    }
    encodedSuffix += encodedNote;
  }
  return errorSuffix + errorsJson + encodedSuffix + encodedPrefix;
}
//@ chunk-y656fhcx.js:13739-15343 fingerprint (2.1.88 match: generateTitle, 0.938)
/**
 * 用模型为公开 issue 生成简洁技术标题（不超过 80 字符），失败回落 "Bug Report"。
 */
async function generateTitle(description, abortSignal, credentials) {
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
      userPrompt: description,
      signal: abortSignal,
      options: {
        hasAppendSystemPrompt: false,
        toolChoice: undefined,
        isNonInteractiveSession: false,
        agents: [],
        querySource: "feedback",
        mcpTools: [],
        agentContext: mainAgentContext(),
        credentials,
      },
    });
    let title =
      response.message.content[0]?.type === "text" ? response.message.content[0].text : "Bug Report";
    if (response.isApiErrorMessage || startsWithApiErrorPrefix(title))
      return createFallbackTitle(description);
    if (isEmptyOrTemplate(title)) return createFallbackTitle(description);
    return title;
  } catch (error) {
    if (isAbortError(error))
      logForDebugging("Feedback title generation via Haiku aborted, using fallback", {
        level: "debug",
      });
    else logError(error);
    return createFallbackTitle(description);
  }
}
//@ chunk-y656fhcx.js:15343-15460 layout
var REFUSAL_PREFIX_RE =
  /^(i can['\u2019]t|i cannot|i['\u2019]m unable|i am unable|i['\u2019]m sorry|i am sorry|i apologize|sorry,)/i;
//@ chunk-y656fhcx.js:15460-15516 layout
function isEmptyOrTemplate(title) {
  let trimmed = title.trim();
  return trimmed === "" || REFUSAL_PREFIX_RE.test(trimmed);
}
//@ chunk-y656fhcx.js:15516-15707 fingerprint (2.1.88 match: createFallbackTitle, 1)
function createFallbackTitle(description) {
  let firstLine = getFirstLine(description);
  if (firstLine.length <= 60 && firstLine.length > 5) return firstLine;
  let truncated = firstLine.slice(0, 60);
  if (firstLine.length > 60) {
    let lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 30) truncated = truncated.slice(0, lastSpace);
    truncated += "...";
  }
  return truncated.length < 10 ? "Bug Report" : truncated;
}
//@ chunk-y656fhcx.js:15707-16263 sole-consumer
/**
 * 反馈确认页中的一行 git 元数据：分支、短提交号、远程地址、是否未同步与有无本地改动。
 */
function GitMetadataLine(props) {
  let $ = useMemoCache(8);
  let { gitStatePromise } = props;
  let gitState = use(gitStatePromise);
  if (!gitState) {
    return null;
  }
  const branchName = gitState.branchName;
  let commitSuffix;
  if ($[0] !== gitState.commitHash) {
    commitSuffix = gitState.commitHash ? `, ${gitState.commitHash.slice(0, 7)}` : "";
    $[0] = gitState.commitHash;
    $[1] = commitSuffix;
  } else commitSuffix = $[1];
  const remoteSuffix = gitState.remoteUrl ? ` @ ${gitState.remoteUrl}` : "";
  const unsyncedNote = !gitState.isHeadOnRemote && ", not synced";
  const dirtyNote = !gitState.isClean && ", has local changes";
  let content;
  if (
    $[2] !== gitState.branchName ||
    $[3] !== commitSuffix ||
    $[4] !== remoteSuffix ||
    $[5] !== unsyncedNote ||
    $[6] !== dirtyNote
  ) {
    content = jsxProd_default_2(Text, {
      children: [
        "- Git repo metadata:",
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [branchName, commitSuffix, remoteSuffix, unsyncedNote, dirtyNote],
        }),
      ],
    });
    $[2] = gitState.branchName;
    $[3] = commitSuffix;
    $[4] = remoteSuffix;
    $[5] = unsyncedNote;
    $[6] = dirtyNote;
    $[7] = content;
  } else content = $[7];
  return content;
}
export {
  submitFeedback,
  loadRawTranscriptJsonl,
  sanitizeAndLogError,
  GITHUB_ISSUES_REPO_URL,
  createFeedbackStatusStore,
  Feedback,
};
