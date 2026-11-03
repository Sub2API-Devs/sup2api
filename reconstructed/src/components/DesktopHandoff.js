/**
 * components/DesktopHandoff.tsx
 *
 * 把会话交给 Claude Desktop：检测/下载桌面版并打开。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DesktopHandoff.tsx
 * pieces: chunk-ds2d8kad.js (5)
 * attribution: placement 1, fingerprint 3, layout 1
 */
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useClock } from "../ink/components/ClockContext.js";
import { Tl } from "./ScrollViewportContext.js";
import { fi } from "../utils/browser.js";
import { getDesktopInstallStatus, dDr } from "../utils/desktopDeepLink.js";
import { confirmRelaunch, withRelaunchHint } from "../utils/processRelaunch.js";
import { flushSessionStorage } from "../utils/sessionStorage.js";
import { vFs } from "./_new/DesktopHandoff.helpers-5nte.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { sendDetachRequest, tce } from "../screens/repl/backgroundConfirm.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { errorMessage } from "../utils/errors.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { zR, PANE_PADDING } from "./design-system/Pane.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";

//@ chunk-ds2d8kad.js:15178-15182 placement
j();
//@ chunk-ds2d8kad.js:15182-15214 fingerprint = DESKTOP_DOCS_URL (1)
var DESKTOP_DOCS_URL = "https://clau.de/desktop";
//@ chunk-ds2d8kad.js:15214-15407 fingerprint = getDownloadUrl (0.863)
function getDownloadUrl() {
  switch ("linux") {
    case "win32":
      return "https://claude.ai/api/desktop/win32/x64/exe/latest/redirect";
    default:
      return "https://claude.ai/api/desktop/darwin/universal/dmg/latest/redirect";
  }
}
//@ chunk-ds2d8kad.js:15407-15441 layout
function v() {
  return { current: null };
}
/**
 * 交给桌面版：检测是否安装 Claude Desktop，未安装则提示下载（按平台下载链接），已安装则打开并传递会话。
 */
//@ chunk-ds2d8kad.js:15441-18318 fingerprint = DesktopHandoff (0.632)
function DesktopHandoff({ onDone: onDone, handoff: handoff, getTranscript: getTranscript }) {
  let { storageV5: storageV5 } = Me(),
    [l, c] = y(handoff.current?.state ?? "checking"),
    [M, m] = y(handoff.current?.error ?? null),
    [_, g] = y(handoff.current?.downloadMessage ?? ""),
    R = useClock(),
    b = Tl();
  P(() => {
    let t = handoff.current;
    if (t)
      ((t.setters = { setState: c, setError: m, setDownloadMessage: g }),
        c(t.state),
        m(t.error),
        g(t.downloadMessage));
    return () => {
      if (handoff.current?.setters?.setState === c) handoff.current.setters = null;
    };
  }, [handoff]);
  function p(t, u) {
    ((handoff.current = null), onDone(t, u));
  }
  function D() {
    p(`Cancelled. Learn more about Claude Desktop at ${DESKTOP_DOCS_URL}`, { display: "system" });
  }
  function S(t) {
    if (t.meta && (t.key === "c" || t.key === "d")) {
      (t.preventDefault(), D());
      return;
    }
    if (t.ctrl || t.meta) return;
    if (l === "error") {
      (t.preventDefault(), p(M ?? "Unknown error", { display: "system" }));
      return;
    }
    if (l === "prompt-download") {
      if (t.key === "y" || t.key === "Y")
        (t.preventDefault(),
          fi(getDownloadUrl()).catch(() => {}),
          p(
            `Starting download. Re-run /desktop once you\u2019ve installed the app.
Learn more at ${DESKTOP_DOCS_URL}`,
            { display: "system" },
          ));
      else if (t.key === "n" || t.key === "N")
        (t.preventDefault(),
          p(`The desktop app is required for /desktop. Learn more at ${DESKTOP_DOCS_URL}`, {
            display: "system",
          }));
    }
  }
  if (
    (P(() => {
      if (handoff.current) return;
      handoff.current = {
        state: "checking",
        error: null,
        downloadMessage: "",
        setters: { setState: c, setError: m, setDownloadMessage: g },
      };
      function t(input) {
        let i = handoff.current;
        if (!i) return;
        Object.assign(i, input);
        let setters = i.setters;
        if (input.state !== void 0) setters?.setState(input.state);
        if (input.error !== void 0) setters?.setError(input.error);
        if (input.downloadMessage !== void 0) setters?.setDownloadMessage(input.downloadMessage);
      }
      let u = !1;
      async function O() {
        t({ state: "checking" });
        let installStatus = await getDesktopInstallStatus();
        if (installStatus.status === "not-installed") {
          t({ state: "prompt-download", downloadMessage: "Claude Desktop is not installed." });
          return;
        }
        if (installStatus.status === "version-too-old") {
          t({
            state: "prompt-download",
            downloadMessage: `Claude Desktop needs to be updated (found v${installStatus.version}, need v${dDr}+).`,
          });
          return;
        }
        ((u = await confirmRelaunch(getTranscript(), "desktop_handoff", {}, storageV5)),
          t({ state: "flushing" }),
          await flushSessionStorage(),
          t({ state: "opening" }));
        let result = await vFs();
        if (!result.success) {
          t({ state: "error", error: withRelaunchHint(result.error, u) });
          return;
        }
        (t({ state: "success" }),
          R.setTimeout(async () => {
            if ((p("Session transferred to Claude Desktop", { display: "system" }), isBgSession()))
              sendDetachRequest({ broadcast: !0, message: tce() });
            await gracefulShutdown(0, "other");
          }, 500));
      }
      O().catch((err) => {
        t({ state: "error", error: withRelaunchHint(errorMessage(err), u, { as: "clause" }) });
      });
    }, []),
    l === "error")
  )
    return e(Dialog, {
      title: "Claude Desktop",
      onCancel: D,
      inputGuide: "Press any key to continue\u2026",
      children: e(FocusColumn, {
        onKeyDown: S,
        children: r(Text, { color: "error", children: ["Error: ", M] }),
      }),
    });
  if (l === "prompt-download")
    return e(Dialog, {
      title: "Claude Desktop",
      onCancel: D,
      inputGuide: e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
      }),
      children: r(FocusColumn, {
        onKeyDown: S,
        children: [e(Text, { children: _ }), e(Text, { children: "Download now? (y/n)" })],
      }),
    });
  return e(Box, {
    paddingX: b ? zR : PANE_PADDING,
    children: e(WorkerBadge, {
      message: {
        checking: "Checking for Claude Desktop\u2026",
        flushing: "Saving session\u2026",
        opening: "Opening Claude Desktop\u2026",
        success: "Opening in Claude Desktop\u2026",
      }[l],
    }),
  });
}

export { DesktopHandoff, v };
