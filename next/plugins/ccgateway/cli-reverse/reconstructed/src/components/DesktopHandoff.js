/**
 * components/DesktopHandoff.tsx
 *
 * 把会话交给 Claude Desktop：检测/下载桌面版并打开。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DesktopHandoff.tsx
 * pieces: chunk-nj7rp16y.js (5), chunk-vbwrr9hv.js (1)
 * attribution: placement 2, fingerprint 3, layout 1
 */
import {
  openCurrentSessionInDesktop,
  getDesktopInstallStatus,
  MIN_DESKTOP_VERSION,
} from "../utils/desktopDeepLink.js";
import { getSessionId } from "../bootstrap/state.js";
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useHasScrollViewport } from "./ScrollViewportContext.js";
import { openValidatedUrlSucceeded } from "../utils/browser.js";
import { confirmRelaunch, withRelaunchHint } from "../utils/processRelaunch.js";
import { flushSessionStorage } from "../utils/sessionStorage.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { sendDetachRequest, noopBackgroundConfirm } from "../screens/repl/backgroundConfirm.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { errorMessage } from "../utils/errors.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { PANE_PADDING_X, PANE_PADDING } from "./design-system/Pane.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";

//@ chunk-vbwrr9hv.js:3680-3743 placement
/**
 * 以 resume 方式把当前会话交到 Claude Desktop 打开。
 */
async function resumeCurrentSessionInDesktop() {
  return openCurrentSessionInDesktop({
    kind: "resume",
    sessionId: getSessionId(),
  });
}
//@ chunk-nj7rp16y.js:16349-16353 placement
init_react_production();
//@ chunk-nj7rp16y.js:16353-16385 fingerprint (2.1.88 match: DESKTOP_DOCS_URL, 1)
var DESKTOP_DOCS_URL = "https://clau.de/desktop";
//@ chunk-nj7rp16y.js:16385-16578 fingerprint (2.1.88 match: getDownloadUrl, 0.863)
function getDownloadUrl() {
  switch ("linux") {
    case "win32":
      return "https://claude.ai/api/desktop/win32/x64/exe/latest/redirect";
    default:
      return "https://claude.ai/api/desktop/darwin/universal/dmg/latest/redirect";
  }
}
//@ chunk-nj7rp16y.js:16578-16612 layout
function nullRef() {
  return {
    current: null,
  };
}
//@ chunk-nj7rp16y.js:16612-19487 fingerprint (2.1.88 match: DesktopHandoff, 0.632)
/**
 * 交给桌面版：检测是否安装 Claude Desktop，未安装则提示下载（按平台下载链接），已安装则打开并传递会话。
 */
function DesktopHandoff({ onDone, handoff, getTranscript }) {
  let { storageV5 } = useTheme_2();
  let [state, setState] = useState(handoff.current?.state ?? "checking");
  let [error, setError] = useState(handoff.current?.error ?? null);
  let [downloadMessage, setDownloadMessage] = useState(handoff.current?.downloadMessage ?? "");
  let clock = useClock();
  let hasScrollViewport = useHasScrollViewport();
  useEffect(() => {
    let current = handoff.current;
    if (current) {
      current.setters = {
        setState,
        setError,
        setDownloadMessage,
      };
      setState(current.state);
      setError(current.error);
      setDownloadMessage(current.downloadMessage);
    }
    return () => {
      if (handoff.current?.setters?.setState === setState) handoff.current.setters = null;
    };
  }, [handoff]);
  function finish(message, options) {
    handoff.current = null;
    onDone(message, options);
  }
  function handleCancel() {
    finish(`Cancelled. Learn more about Claude Desktop at ${DESKTOP_DOCS_URL}`, {
      display: "system",
    });
  }
  function handleKeyDown(event) {
    if (event.meta && (event.key === "c" || event.key === "d")) {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (event.ctrl || event.meta) return;
    if (state === "error") {
      event.preventDefault();
      finish(error ?? "Unknown error", {
        display: "system",
      });
      return;
    }
    if (state === "prompt-download") {
      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        openValidatedUrlSucceeded(getDownloadUrl()).catch(() => {});
        finish(
          `Starting download. Re-run /desktop once you\u2019ve installed the app.
Learn more at ${DESKTOP_DOCS_URL}`,
          {
            display: "system",
          },
        );
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        finish(`The desktop app is required for /desktop. Learn more at ${DESKTOP_DOCS_URL}`, {
          display: "system",
        });
      }
    }
  }
  useEffect(() => {
    if (handoff.current) return;
    handoff.current = {
      state: "checking",
      error: null,
      downloadMessage: "",
      setters: {
        setState,
        setError,
        setDownloadMessage,
      },
    };
    function updateState(input) {
      let current = handoff.current;
      if (!current) return;
      Object.assign(current, input);
      let setters = current.setters;
      if (input.state !== undefined) setters?.setState(input.state);
      if (input.error !== undefined) setters?.setError(input.error);
      if (input.downloadMessage !== undefined) setters?.setDownloadMessage(input.downloadMessage);
    }
    let relaunchConfirmed = false;
    async function runCheck() {
      updateState({
        state: "checking",
      });
      let installStatus = await getDesktopInstallStatus();
      if (installStatus.status === "not-installed") {
        updateState({
          state: "prompt-download",
          downloadMessage: "Claude Desktop is not installed.",
        });
        return;
      }
      if (installStatus.status === "version-too-old") {
        updateState({
          state: "prompt-download",
          downloadMessage: `Claude Desktop needs to be updated (found v${installStatus.version}, need v${MIN_DESKTOP_VERSION}+).`,
        });
        return;
      }
      relaunchConfirmed = await confirmRelaunch(getTranscript(), "desktop_handoff", {}, storageV5);
      updateState({
        state: "flushing",
      });
      await flushSessionStorage();
      updateState({
        state: "opening",
      });
      let result = await resumeCurrentSessionInDesktop();
      if (!result.success) {
        updateState({
          state: "error",
          error: withRelaunchHint(result.error, relaunchConfirmed),
        });
        return;
      }
      updateState({
        state: "success",
      });
      clock.setTimeout(async () => {
        finish("Session transferred to Claude Desktop", {
          display: "system",
        });
        if (isBgSession())
          sendDetachRequest({
            broadcast: true,
            message: noopBackgroundConfirm(),
          });
        await gracefulShutdown(0, "other");
      }, 500);
    }
    runCheck().catch((err) => {
      updateState({
        state: "error",
        error: withRelaunchHint(errorMessage(err), relaunchConfirmed, {
          as: "clause",
        }),
      });
    });
  }, []);
  if (state === "error")
    return jsxProd_default(Dialog, {
      title: "Claude Desktop",
      onCancel: handleCancel,
      inputGuide: "Press any key to continue\u2026",
      children: jsxProd_default(FocusColumn, {
        onKeyDown: handleKeyDown,
        children: jsxProd_default_2(Text, {
          color: "error",
          children: ["Error: ", error],
        }),
      }),
    });
  if (state === "prompt-download")
    return jsxProd_default(Dialog, {
      title: "Claude Desktop",
      onCancel: handleCancel,
      inputGuide: jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
      }),
      children: jsxProd_default_2(FocusColumn, {
        onKeyDown: handleKeyDown,
        children: [
          jsxProd_default(Text, {
            children: downloadMessage,
          }),
          jsxProd_default(Text, {
            children: "Download now? (y/n)",
          }),
        ],
      }),
    });
  return jsxProd_default(Box, {
    paddingX: hasScrollViewport ? PANE_PADDING_X : PANE_PADDING,
    children: jsxProd_default(WorkerBadge, {
      message: {
        checking: "Checking for Claude Desktop\u2026",
        flushing: "Saving session\u2026",
        opening: "Opening Claude Desktop\u2026",
        success: "Opening in Claude Desktop\u2026",
      }[state],
    }),
  });
}
export { DesktopHandoff, nullRef };
