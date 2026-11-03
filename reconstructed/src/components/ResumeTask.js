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
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { y, ce } from "../../vendor/react/cjs/react.production.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { detectCurrentRepository } from "../utils/detectRepository.js";
import { logForDebugging } from "../utils/debug.js";
import { fetchCodeSessionsFromSessionsAPI } from "../utils/teleport/api.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TeleportError } from "./TeleportError.js";
import { Box, Text } from "../ink/components/Text.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { formatRelativeTime, truncateToWidth } from "../utils/format.js";
import { sanitizeSessionTitle } from "../utils/stringUtils.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { probeModelAccess } from "./ModelPinWizard.js";
import { testBedrockRequest, isAwsTimeoutError } from "./providerSetup/bedrock/bedrockVerify.js";
import { Q } from "./providerSetup/bedrock/BedrockSaveStep.js";

//@ chunk-0bntfk7p.js:1975-2064 fingerprint = UPDATED_STRING (0.486)
var UPDATED = "Updated",
  ORIGIN = "Origin",
  Ce = "Remote Control",
  max = Math.max(ORIGIN.length, Ce.length),
  O = "  ";
//@ chunk-0bntfk7p.js:2064-5609 fingerprint = ResumeTask (0.71)
function ResumeTask({
  onSelect: onSelect,
  onCancel: onCancel,
  isEmbedded: isEmbedded = !1,
  onSettingsReload: onSettingsReload,
}) {
  let { rows: rows, columns: columns } = useScrollViewportSize(useTerminalSize()),
    [f, D] = y([]),
    [T, k] = y(null),
    [m, v] = y(!0),
    [l, L] = y(null),
    [M, G] = y(null),
    [H, W] = y(!1),
    [Y, z] = y(!1),
    [F, U] = y(1),
    escKey = useShortcutDisplay("confirm:no", "Confirmation", "Esc"),
    loadSessions = ce(async () => {
      try {
        (v(!0), L(null));
        let detectedRepo = await detectCurrentRepository();
        (k(detectedRepo), logForDebugging(`Current repository: ${detectedRepo || "not detected"}`));
        let codeSessions = await fetchCodeSessionsFromSessionsAPI(),
          filteredSessions = codeSessions;
        if (detectedRepo)
          ((filteredSessions = codeSessions.filter((session) => {
            if (!session.repo) return !1;
            return `${session.repo.owner.login}/${session.repo.name}` === detectedRepo;
          })),
            logForDebugging(
              `Filtered ${filteredSessions.length} sessions for repo ${detectedRepo} from ${codeSessions.length} total`,
            ));
        let sortedSessions = [...filteredSessions].sort((I, se) => {
          let dateA = new Date(I.updated_at);
          return new Date(se.updated_at).getTime() - dateA.getTime();
        });
        D(sortedSessions);
      } catch (err) {
        let u = err instanceof Error ? err.message : String(err);
        if (
          (logForDebugging(`Error loading code sessions: ${u}`),
          err instanceof Error && err.name === "CloudSessionAccessError")
        )
          (G(err.message), L("refused"));
        else L(determineErrorType(u));
      } finally {
        (v(!1), W(!1));
      }
    }, []),
    handleRetry = () => {
      (W(!0), loadSessions());
    };
  useKeybinding("confirm:no", onCancel, { context: "Confirmation" });
  function g(o) {
    if (o.ctrl && o.key === "c") {
      (o.preventDefault(), onCancel());
      return;
    }
    if (o.ctrl && o.key === "r" && l) {
      (o.preventDefault(), handleRetry());
      return;
    }
    if (l !== null && o.key === "return") {
      (o.preventDefault(), onCancel());
      return;
    }
  }
  let handleErrorComplete = ce(() => {
    (z(!0), loadSessions());
  }, [z, loadSessions]);
  if (!Y)
    return e(TeleportError, {
      onComplete: handleErrorComplete,
      onCancel: isEmbedded ? onCancel : void 0,
      onSettingsReload: onSettingsReload,
    });
  if (m)
    return e(Box, {
      flexDirection: "column",
      padding: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: g,
      children: e(WorkerBadge, {
        message: "Loading Claude Code sessions\u2026",
        bold: !0,
        subtitle: H ? "Retrying\u2026" : "Fetching your Claude Code sessions\u2026",
      }),
    });
  if (l)
    return r(Box, {
      flexDirection: "column",
      padding: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: g,
      children: [
        e(Text, { bold: !0, color: "error", children: "Error loading Claude Code sessions" }),
        renderLoadFailure(l, M),
        r(Text, {
          dimColor: !0,
          children: [
            "Press ",
            e(Text, { bold: !0, children: "Ctrl+R" }),
            " to retry \xB7 Press",
            " ",
            e(Text, { bold: !0, children: escKey }),
            " to cancel",
          ],
        }),
      ],
    });
  if (f.length === 0)
    return r(Box, {
      flexDirection: "column",
      padding: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: g,
      children: [
        r(Text, {
          bold: !0,
          children: ["No Claude Code sessions found", T && r(Text, { children: [" for ", T] })],
        }),
        e(Box, {
          marginTop: 1,
          children: r(Text, {
            dimColor: !0,
            children: ["Press ", e(Text, { bold: !0, children: escKey }), " to cancel"],
          }),
        }),
      ],
    });
  let sessionMetadata = f.map((session_0) => ({
      ...session_0,
      timeString: formatRelativeTime(new Date(session_0.updated_at)),
    })),
    maxTimeStringLength = Math.max(UPDATED.length, ...sessionMetadata.map((meta) => meta.timeString.length)),
    any = f.some((o) => o.environment_kind === "bridge"),
    he = any ? max + O.length : 0,
    pe = String(f.length).length + 2,
    Re = columns - 4 - pe - maxTimeStringLength - O.length - he,
    options = sessionMetadata.map(
      ({ timeString: timeString, title: title, id: id, environment_kind: environment_kind }) => {
        let paddedTime = timeString.padEnd(maxTimeStringLength, " ");
        return {
          label: r(Fragment, {
            children: [
              paddedTime,
              O,
              any &&
                r(Fragment, {
                  children: [
                    e(Text, {
                      dimColor: !0,
                      children: (environment_kind === "bridge" ? Ce : "").padEnd(max, " "),
                    }),
                    O,
                  ],
                }),
              truncateToWidth(sanitizeSessionTitle(title).replace(/\s+/g, " ").trim(), Re),
            ],
          }),
          value: id,
        };
      },
    ),
    layoutOverhead = 7,
    maxVisibleOptions = Math.max(
      1,
      isEmbedded
        ? Math.min(f.length, 5, rows - 6 - layoutOverhead)
        : Math.min(f.length, rows - 1 - layoutOverhead),
    ),
    be = maxVisibleOptions + layoutOverhead,
    we = f.length > maxVisibleOptions;
  return r(Box, {
    flexDirection: "column",
    padding: 1,
    height: be,
    tabIndex: 0,
    autoFocus: !0,
    onKeyDown: g,
    children: [
      r(Text, {
        bold: !0,
        children: [
          "Select a session to resume",
          we && r(Text, { dimColor: !0, children: [" ", "(", F, " of ", f.length, ")"] }),
          T && r(Text, { dimColor: !0, children: [" (", T, ")"] }),
          ":",
        ],
      }),
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        flexGrow: 1,
        children: [
          e(Box, {
            marginLeft: 2 + pe,
            children: r(Text, {
              bold: !0,
              children: [
                UPDATED.padEnd(maxTimeStringLength, " "),
                O,
                any && ORIGIN.padEnd(max, " ") + O,
                "Session Title",
              ],
            }),
          }),
          e(ModelSelector, {
            visibleOptionCount: maxVisibleOptions,
            options: options,
            onChange: (value) => {
              let session_1 = f.find((h) => h.id === value);
              if (session_1) onSelect(session_1);
            },
            onFocus: (value_0) => {
              let index = options.findIndex((h) => h.value === value_0);
              if (index >= 0) U(index + 1);
            },
          }),
        ],
      }),
      e(Box, {
        flexDirection: "row",
        children: e(Text, {
          dimColor: !0,
          children: r(Byline, {
            children: [
              e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select" }),
              e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
              e(ConfigurableShortcutHint, {
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
/**
 * 按失败类型（refused/network/auth/api/other）渲染加载远程会话失败的提示；auth 时提示 /login 选择订阅账号。
 */
//@ chunk-0bntfk7p.js:6050-6828 sole-consumer
function renderLoadFailure(failureKind, refusalMessage) {
  switch (failureKind) {
    case "refused":
      return e(Box, {
        marginY: 1,
        flexDirection: "column",
        children: e(Text, { dimColor: !0, children: refusalMessage }),
      });
    case "network":
      return e(Box, {
        marginY: 1,
        flexDirection: "column",
        children: e(Text, { dimColor: !0, children: "Check your internet connection" }),
      });
    case "auth":
      return r(Box, {
        marginY: 1,
        flexDirection: "column",
        children: [
          e(Text, { dimColor: !0, children: "Teleport requires a Claude account" }),
          r(Text, {
            dimColor: !0,
            children: [
              "Run ",
              e(Text, { bold: !0, children: "/login" }),
              ' and select "Claude account with subscription"',
            ],
          }),
        ],
      });
    case "api":
      return e(Box, {
        marginY: 1,
        flexDirection: "column",
        children: e(Text, { dimColor: !0, children: "Sorry, Claude encountered an error" }),
      });
    case "other":
      return e(Box, {
        marginY: 1,
        flexDirection: "row",
        children: e(Text, { dimColor: !0, children: "Sorry, Claude Code encountered an error" }),
      });
  }
}
//@ chunk-sx9xc5ee.js:9790-9902 fingerprint = renderErrorSpecificGuidance (0.564)
async function renderErrorSpecificGuidance(o, d) {
  return probeModelAccess(
    () => testBedrockRequest(o),
    d,
    (c) => (c instanceof Error && (c.message === Q || isAwsTimeoutError(c)) ? "network" : "auth"),
  );
}

export { ResumeTask, renderErrorSpecificGuidance };
