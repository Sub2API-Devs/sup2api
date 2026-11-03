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
import { init_react_production, y, P } from "../../vendor/react/cjs/react.production.js";
import { userCheckoutSpawnTerms, stashToCleanState } from "../utils/teleport.js";
import { getFileStatus } from "../utils/git.js";
import { buildGitEnvForRepo } from "../utils/git/gitDirResolution.js";
import { logForDebugging } from "../utils/debug.js";
import { TeleportOperationError } from "../utils/errors.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Dialog } from "./design-system/Dialog.js";
import { HintText } from "./design-system/HintText.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-qh0448cn.js:1233-1237 placement
init_react_production();
//@ chunk-qh0448cn.js:1237-1241 placement
init_react_production();
//@ chunk-qh0448cn.js:1241-3194 fingerprint = TeleportStash (0.597)
function TeleportStash({ onStashAndContinue, onCancel, cancelQuits }) {
  let [gitFileStatus, setGitFileStatus] = y(null);
  let changedFiles = gitFileStatus !== null ? [...gitFileStatus.tracked, ...gitFileStatus.untracked] : [];
  let [loading, setLoading] = y(true);
  let [stashing, setStashing] = y(false);
  let [error, setError] = y(null);
  P(() => {
    (async () => {
      try {
        let { cwd } = userCheckoutSpawnTerms();
        let fileStatus = await getFileStatus(
          cwd,
          buildGitEnvForRepo(cwd, undefined, {
            userLocale: true,
          }),
        );
        setGitFileStatus(fileStatus);
      } catch (err) {
        let errorMessage = err instanceof Error ? err.message : String(err);
        logForDebugging(`Error getting changed files: ${errorMessage}`, {
          level: "error",
        });
        setError(err instanceof TeleportOperationError ? err.message : "Failed to get changed files");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  let handleStash = async () => {
    setStashing(true);
    try {
      logForDebugging("Stashing changes before teleport...");
      if (!(await stashToCleanState("Teleport auto-stash", userCheckoutSpawnTerms()))) {
        setError("Failed to stash changes");
        setStashing(false);
        return;
      }
      logForDebugging("Successfully stashed changes");
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : String(err);
      logForDebugging(`Error stashing changes: ${errorMessage}`, {
        level: "error",
      });
      setError(err instanceof TeleportOperationError ? err.message : "Failed to stash changes");
      setStashing(false);
      return;
    }
    try {
      await onStashAndContinue();
    } finally {
      setStashing(false);
    }
  };
  if (loading)
    return jsxProd_default(Box, {
      flexDirection: "column",
      padding: 1,
      children: jsxProd_default_2(Box, {
        marginBottom: 1,
        children: [
          jsxProd_default(Spinner, {}),
          jsxProd_default_2(Text, {
            children: [" Checking git status", figures_default.ellipsis],
          }),
        ],
      }),
    });
  if (error)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      padding: 1,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          color: "error",
          children: ["Error: ", error],
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              bold: true,
            }),
          }),
        }),
      ],
    });
  let showFileCount = changedFiles.length > 8;
  let g = stashing && !cancelQuits;
  return jsxProd_default_2(
    Dialog,
    {
      title: "Working directory has changes",
      onCancel: g ? noop : onCancel,
      exitOnCtrlCD: cancelQuits || g,
      inputGuide: g ? "Teleport continues when the stash finishes\u2026" : undefined,
      children: [
        jsxProd_default(Text, {
          children: "Teleport will switch git branches. The following changes were found:",
        }),
        jsxProd_default(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children:
            changedFiles.length > 0
              ? showFileCount
                ? jsxProd_default_2(Text, {
                    children: [changedFiles.length, " files changed"],
                  })
                : changedFiles.map((file, index) =>
                    jsxProd_default(
                      Text,
                      {
                        children: file,
                      },
                      index,
                    ),
                  )
              : jsxProd_default(HintText, {
                  children: "No changes detected",
                }),
        }),
        jsxProd_default(Text, {
          children: "Would you like to stash these changes and continue with teleport?",
        }),
        stashing
          ? jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Spinner, {}),
                jsxProd_default(Text, {
                  children: " Stashing changes...",
                }),
              ],
            })
          : jsxProd_default(ConfirmSelect, {
              confirmLabel: "Stash changes and continue",
              cancelLabel: cancelQuits ? "Exit" : "Cancel",
              onConfirm: () => void handleStash(),
              onCancel,
            }),
      ],
    },
    g ? "stashing" : "asking",
  );
}
//@ chunk-qh0448cn.js:3194-3209 affinity
function noop() {}
export { TeleportStash };
