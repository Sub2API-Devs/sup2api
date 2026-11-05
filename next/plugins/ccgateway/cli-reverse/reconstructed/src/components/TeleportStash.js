/**
 * components/TeleportStash.tsx
 *
 * teleport 前自动 stash 本地改动。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportStash.tsx
 * pieces: chunk-3tekt16c.js (4)
 * attribution: placement 2, fingerprint 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3tekt16c.js:1234-1238 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3tekt16c.js:1234", () => {
  init_react_production();
});
//@ chunk-3tekt16c.js:1238-1242 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3tekt16c.js:1238", () => {
  init_react_production();
});
//@ chunk-3tekt16c.js:1242-3195 fingerprint (2.1.88 match: TeleportStash, 0.597)
function TeleportStash({ onStashAndContinue, onCancel, cancelQuits }) {
  let [gitFileStatus, setGitFileStatus] = useState(null);
  let changedFiles = gitFileStatus !== null ? [...gitFileStatus.tracked, ...gitFileStatus.untracked] : [];
  let [loading, setLoading] = useState(true);
  let [stashing, setStashing] = useState(false);
  let [error, setError] = useState(null);
  useEffect(() => {
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
  let blockCancelWhileStashing = stashing && !cancelQuits;
  return jsxProd_default_2(
    Dialog,
    {
      title: "Working directory has changes",
      onCancel: blockCancelWhileStashing ? noop : onCancel,
      exitOnCtrlCD: cancelQuits || blockCancelWhileStashing,
      inputGuide: blockCancelWhileStashing ? "Teleport continues when the stash finishes\u2026" : undefined,
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
    blockCancelWhileStashing ? "stashing" : "asking",
  );
}
//@ chunk-3tekt16c.js:3195-3210 affinity
function noop() {}
export { TeleportStash };
