/**
 * components/TeleportStash.tsx
 *
 * teleport 前自动 stash 本地改动。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportStash.tsx
 * pieces: chunk-qh0448cn.js (4)
 * attribution: placement 2, fingerprint 1, affinity 1
 */
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { userCheckoutSpawnTerms, stashToCleanState } from "../utils/teleport.js";
import { getFileStatus } from "../utils/git.js";
import { buildGitEnvForRepo } from "../utils/git/gitDirResolution.js";
import { logForDebugging } from "../utils/debug.js";
import { TeleportOperationError } from "../utils/errors.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Dialog } from "./design-system/Dialog.js";
import { HintText } from "./design-system/HintText.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-qh0448cn.js:1233-1237 placement
j();
//@ chunk-qh0448cn.js:1237-1241 placement
j();
//@ chunk-qh0448cn.js:1241-3194 fingerprint = TeleportStash (0.597)
function TeleportStash({
  onStashAndContinue: onStashAndContinue,
  onCancel: onCancel,
  cancelQuits: cancelQuits,
}) {
  let [d, f] = y(null),
    u = d !== null ? [...d.tracked, ...d.untracked] : [],
    [E, D] = y(!0),
    [h, x] = y(!1),
    [C, L] = y(null);
  P(() => {
    (async () => {
      try {
        let { cwd: cwd } = userCheckoutSpawnTerms(),
          v = await getFileStatus(cwd, buildGitEnvForRepo(cwd, void 0, { userLocale: !0 }));
        f(v);
      } catch (err) {
        let v = err instanceof Error ? err.message : String(err);
        (logForDebugging(`Error getting changed files: ${v}`, { level: "error" }),
          L(err instanceof TeleportOperationError ? err.message : "Failed to get changed files"));
      } finally {
        D(!1);
      }
    })();
  }, []);
  let handleStash = async () => {
    x(!0);
    try {
      if (
        (logForDebugging("Stashing changes before teleport..."),
        !(await stashToCleanState("Teleport auto-stash", userCheckoutSpawnTerms())))
      ) {
        (L("Failed to stash changes"), x(!1));
        return;
      }
      logForDebugging("Successfully stashed changes");
    } catch (err_0) {
      let l = err_0 instanceof Error ? err_0.message : String(err_0);
      (logForDebugging(`Error stashing changes: ${l}`, { level: "error" }),
        L(err_0 instanceof TeleportOperationError ? err_0.message : "Failed to stash changes"),
        x(!1));
      return;
    }
    try {
      await onStashAndContinue();
    } finally {
      x(!1);
    }
  };
  if (E)
    return e(Box, {
      flexDirection: "column",
      padding: 1,
      children: r(Box, {
        marginBottom: 1,
        children: [e(Spinner, {}), r(Text, { children: [" Checking git status", re.ellipsis] })],
      }),
    });
  if (C)
    return r(Box, {
      flexDirection: "column",
      padding: 1,
      children: [
        r(Text, { bold: !0, color: "error", children: ["Error: ", C] }),
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            children: e(KeyboardShortcutHint, { chord: "escape", action: "cancel", bold: !0 }),
          }),
        }),
      ],
    });
  let showFileCount = u.length > 8,
    g = h && !cancelQuits;
  return r(
    Dialog,
    {
      title: "Working directory has changes",
      onCancel: g ? noop : onCancel,
      exitOnCtrlCD: cancelQuits || g,
      inputGuide: g ? "Teleport continues when the stash finishes\u2026" : void 0,
      children: [
        e(Text, { children: "Teleport will switch git branches. The following changes were found:" }),
        e(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children:
            u.length > 0
              ? showFileCount
                ? r(Text, { children: [u.length, " files changed"] })
                : u.map((file, index) => e(Text, { children: file }, index))
              : e(HintText, { children: "No changes detected" }),
        }),
        e(Text, { children: "Would you like to stash these changes and continue with teleport?" }),
        h
          ? r(Box, { children: [e(Spinner, {}), e(Text, { children: " Stashing changes..." })] })
          : e(ConfirmSelect, {
              confirmLabel: "Stash changes and continue",
              cancelLabel: cancelQuits ? "Exit" : "Cancel",
              onConfirm: () => void handleStash(),
              onCancel: onCancel,
            }),
      ],
    },
    g ? "stashing" : "asking",
  );
}
//@ chunk-qh0448cn.js:3194-3209 affinity
function noop() {}

export { TeleportStash };
