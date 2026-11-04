/**
 * components/ResumeTask.tsx
 *
 * 恢复云端任务（teleport）列表；本模块混入 Bedrock API key 测试代码（误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ResumeTask.tsx
 * pieces: chunk-0bntfk7p.js (4), chunk-sx9xc5ee.js (1)
 * attribution: fingerprint 4, sole-consumer 1
 */
import { probeModelAccess } from "./ModelPinWizard.js";
import { testBedrockRequest, isAwsTimeoutError } from "./providerSetup/bedrock/bedrockVerify.js";
import { BEDROCK_VERIFY_TIMEOUT_TEXT } from "./providerSetup/bedrock/BedrockSaveStep.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useState, useCallback } from "../../vendor/react/cjs/react.production.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { detectCurrentRepository } from "../utils/detectRepository.js";
import { logForDebugging } from "../utils/debug.js";
import { fetchCodeSessionsFromSessionsAPI } from "../utils/teleport/api.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TeleportError } from "./TeleportError.js";
import { Box, Text } from "../ink/components/Text.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { formatRelativeTime, truncateToWidth } from "../utils/format.js";
import { sanitizeSessionTitle } from "../utils/stringUtils.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-sx9xc5ee.js:9790-9902 fingerprint = renderErrorSpecificGuidance (0.564)
async function renderErrorSpecificGuidance(wizardData, modelId) {
  return probeModelAccess(
    () => testBedrockRequest(wizardData),
    modelId,
    (error) =>
      error instanceof Error && (error.message === BEDROCK_VERIFY_TIMEOUT_TEXT || isAwsTimeoutError(error))
        ? "network"
        : "auth",
  );
}
//@ chunk-0bntfk7p.js:1975-2064 fingerprint = UPDATED_STRING (0.486)
var UPDATED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ORIGIN;
var REMOTE_CONTROL_LABEL;
var max;
var SPACE;
deferInit("chunk-0bntfk7p.js:1975", () => {
  UPDATED = "Updated";
  ORIGIN = "Origin";
  REMOTE_CONTROL_LABEL = "Remote Control";
  max = Math.max(ORIGIN.length, REMOTE_CONTROL_LABEL.length);
  SPACE = "  ";
});
//@ chunk-0bntfk7p.js:2064-5609 fingerprint = ResumeTask (0.71)
function ResumeTask({ onSelect, onCancel, isEmbedded = false, onSettingsReload }) {
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let [sessions, setSessions] = useState([]);
  let [currentRepo, setCurrentRepo] = useState(null);
  let [loading, setLoading] = useState(true);
  let [loadErrorType, setLoadErrorType] = useState(null);
  let [refusalMessage, props] = useState(null);
  let [retrying, setRetrying] = useState(false);
  let [hasCompletedTeleportErrorFlow, setHasCompletedTeleportErrorFlow] = useState(false);
  let [focusedIndex, setFocusedIndex] = useState(1);
  let escKey = useShortcutDisplay("confirm:no", "Confirmation", "Esc");
  let loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setLoadErrorType(null);
      let detectedRepo = await detectCurrentRepository();
      setCurrentRepo(detectedRepo);
      logForDebugging(`Current repository: ${detectedRepo || "not detected"}`);
      let codeSessions = await fetchCodeSessionsFromSessionsAPI();
      let filteredSessions = codeSessions;
      if (detectedRepo) {
        filteredSessions = codeSessions.filter((session) => {
          if (!session.repo) return false;
          return `${session.repo.owner.login}/${session.repo.name}` === detectedRepo;
        });
        logForDebugging(
          `Filtered ${filteredSessions.length} sessions for repo ${detectedRepo} from ${codeSessions.length} total`,
        );
      }
      let sortedSessions = [...filteredSessions].sort((a, b) => {
        let dateA = new Date(a.updated_at);
        return new Date(b.updated_at).getTime() - dateA.getTime();
      });
      setSessions(sortedSessions);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : String(err);
      logForDebugging(`Error loading code sessions: ${errorMessage}`);
      if (err instanceof Error && err.name === "CloudSessionAccessError") {
        props(err.message);
        setLoadErrorType("refused");
      } else setLoadErrorType(determineErrorType(errorMessage));
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);
  let handleRetry = () => {
    setRetrying(true);
    loadSessions();
  };
  useKeybinding("confirm:no", onCancel, {
    context: "Confirmation",
  });
  function handleKeyDown(event) {
    if (event.ctrl && event.key === "c") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.ctrl && event.key === "r" && loadErrorType) {
      event.preventDefault();
      handleRetry();
      return;
    }
    if (loadErrorType !== null && event.key === "return") {
      event.preventDefault();
      onCancel();
      return;
    }
  }
  let handleErrorComplete = useCallback(() => {
    setHasCompletedTeleportErrorFlow(true);
    loadSessions();
  }, [setHasCompletedTeleportErrorFlow, loadSessions]);
  if (!hasCompletedTeleportErrorFlow)
    return jsxProd_default(TeleportError, {
      onComplete: handleErrorComplete,
      onCancel: isEmbedded ? onCancel : undefined,
      onSettingsReload,
    });
  if (loading)
    return jsxProd_default(Box, {
      flexDirection: "column",
      padding: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: handleKeyDown,
      children: jsxProd_default(WorkerBadge, {
        message: "Loading Claude Code sessions\u2026",
        bold: true,
        subtitle: retrying ? "Retrying\u2026" : "Fetching your Claude Code sessions\u2026",
      }),
    });
  if (loadErrorType)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      padding: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: handleKeyDown,
      children: [
        jsxProd_default(Text, {
          bold: true,
          color: "error",
          children: "Error loading Claude Code sessions",
        }),
        renderLoadFailure(loadErrorType, refusalMessage),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "Press ",
            jsxProd_default(Text, {
              bold: true,
              children: "Ctrl+R",
            }),
            " to retry \xB7 Press",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: escKey,
            }),
            " to cancel",
          ],
        }),
      ],
    });
  if (sessions.length === 0)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      padding: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: handleKeyDown,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          children: [
            "No Claude Code sessions found",
            currentRepo &&
              jsxProd_default_2(Text, {
                children: [" for ", currentRepo],
              }),
          ],
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Press ",
              jsxProd_default(Text, {
                bold: true,
                children: escKey,
              }),
              " to cancel",
            ],
          }),
        }),
      ],
    });
  let sessionMetadata = sessions.map((session) => ({
    ...session,
    timeString: formatRelativeTime(new Date(session.updated_at)),
  }));
  let maxTimeStringLength = Math.max(
    UPDATED.length,
    ...sessionMetadata.map((meta) => meta.timeString.length),
  );
  let any = sessions.some((session) => session.environment_kind === "bridge");
  let bridgeColumnWidth = any ? max + SPACE.length : 0;
  let countColumnWidth = String(sessions.length).length + 2;
  let timeColumnWidth =
    columns - 4 - countColumnWidth - maxTimeStringLength - SPACE.length - bridgeColumnWidth;
  let options = sessionMetadata.map(({ timeString, title, id, environment_kind: environmentKind }) => {
    let paddedTime = timeString.padEnd(maxTimeStringLength, " ");
    return {
      label: jsxProd_default_2(Fragment, {
        children: [
          paddedTime,
          SPACE,
          any &&
            jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: (environmentKind === "bridge" ? REMOTE_CONTROL_LABEL : "").padEnd(max, " "),
                }),
                SPACE,
              ],
            }),
          truncateToWidth(sanitizeSessionTitle(title).replace(/\s+/g, " ").trim(), timeColumnWidth),
        ],
      }),
      value: id,
    };
  });
  let layoutOverhead = 7;
  let maxVisibleOptions = Math.max(
    1,
    isEmbedded
      ? Math.min(sessions.length, 5, rows - 6 - layoutOverhead)
      : Math.min(sessions.length, rows - 1 - layoutOverhead),
  );
  let maxHeight = maxVisibleOptions + layoutOverhead;
  let showScrollPosition = sessions.length > maxVisibleOptions;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    padding: 1,
    height: maxHeight,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: handleKeyDown,
    children: [
      jsxProd_default_2(Text, {
        bold: true,
        children: [
          "Select a session to resume",
          showScrollPosition &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" ", "(", focusedIndex, " of ", sessions.length, ")"],
            }),
          currentRepo &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" (", currentRepo, ")"],
            }),
          ":",
        ],
      }),
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        flexGrow: 1,
        children: [
          jsxProd_default(Box, {
            marginLeft: 2 + countColumnWidth,
            children: jsxProd_default_2(Text, {
              bold: true,
              children: [
                UPDATED.padEnd(maxTimeStringLength, " "),
                SPACE,
                any && ORIGIN.padEnd(max, " ") + SPACE,
                "Session Title",
              ],
            }),
          }),
          jsxProd_default(ModelSelector, {
            visibleOptionCount: maxVisibleOptions,
            options,
            onChange: (value) => {
              let session = sessions.find((session) => session.id === value);
              if (session) onSelect(session);
            },
            onFocus: (value) => {
              let index = options.findIndex((option) => option.value === value);
              if (index >= 0) setFocusedIndex(index + 1);
            },
          }),
        ],
      }),
      jsxProd_default(Box, {
        flexDirection: "row",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: ["up", "down"],
                action: "select",
              }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "confirm",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Confirmation",
                fallback: "Esc",
                description: "cancel",
              }),
            ],
          }),
        }),
      }),
    ],
  });
}
//@ chunk-0bntfk7p.js:5609-6050 fingerprint = determineErrorType (1)
function determineErrorType(errorMessage) {
  let message = errorMessage.toLowerCase();
  if (message.includes("fetch") || message.includes("network") || message.includes("timeout"))
    return "network";
  if (
    message.includes("auth") ||
    message.includes("token") ||
    message.includes("permission") ||
    message.includes("oauth") ||
    message.includes("not authenticated") ||
    message.includes("/login") ||
    message.includes("console account") ||
    message.includes("403")
  )
    return "auth";
  if (
    message.includes("api") ||
    message.includes("rate limit") ||
    message.includes("500") ||
    message.includes("529")
  )
    return "api";
  return "other";
}
//@ chunk-0bntfk7p.js:6050-6828 sole-consumer
/**
 * 按失败类型（refused/network/auth/api/other）渲染加载远程会话失败的提示；auth 时提示 /login 选择订阅账号。
 */
function renderLoadFailure(failureKind, refusalMessage) {
  switch (failureKind) {
    case "refused":
      return jsxProd_default(Box, {
        marginY: 1,
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: refusalMessage,
        }),
      });
    case "network":
      return jsxProd_default(Box, {
        marginY: 1,
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Check your internet connection",
        }),
      });
    case "auth":
      return jsxProd_default_2(Box, {
        marginY: 1,
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "Teleport requires a Claude account",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Run ",
              jsxProd_default(Text, {
                bold: true,
                children: "/login",
              }),
              ' and select "Claude account with subscription"',
            ],
          }),
        ],
      });
    case "api":
      return jsxProd_default(Box, {
        marginY: 1,
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Sorry, Claude encountered an error",
        }),
      });
    case "other":
      return jsxProd_default(Box, {
        marginY: 1,
        flexDirection: "row",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Sorry, Claude Code encountered an error",
        }),
      });
  }
}
export { ResumeTask, renderErrorSpecificGuidance };
