/**
 * commands/memory/memory.tsx
 *
 * /memory 实现：选择并在编辑器打开 CLAUDE.md 或记忆文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/memory/memory.tsx
 * pieces: chunk-dzt5bmy4.js (2)
 * attribution: file-last-pair 1, fingerprint 1
 */
import { homedir } from "os";
import { relative } from "path";
import { writeFile } from "fs/promises";
import { getCwd } from "../../utils/cwd.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { openFileInExternalEditor } from "../../utils/editor.js";
import { env } from "../../utils/env.js";
import { isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { suspenseTypeExport } from "../../../vendor/react/cjs/react.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { MemoryFileSelector } from "../../components/memory/MemoryFileSelector.js";
import { LearnMoreLink } from "../../components/LearnMoreLink.js";

//@ chunk-dzt5bmy4.js:43106-43273 file-last-pair
function call(onDone) {
  let home = homedir();
  let cwd = getCwd();
  let homePath = onDone.startsWith(home) ? "~" + onDone.slice(home.length) : null;
  let cwdPath = onDone.startsWith(cwd) ? "./" + relative(cwd, onDone) : null;
  if (homePath && cwdPath) return homePath.length <= cwdPath.length ? homePath : cwdPath;
  return homePath || cwdPath || onDone;
}
//@ chunk-dzt5bmy4.js:43273-44870 fingerprint (2.1.88 match: MemoryCommand, 0.697)
function MemoryCommand({ session, commandContext, addedInstructionFiles, onDone }) {
  let handleSelectMemoryFile = async (memoryPath) => {
    try {
      if (memoryPath.includes(getClaudeConfigDir())) await getFsImplementation().mkdir(getClaudeConfigDir());
      try {
        await writeFile(memoryPath, "", {
          encoding: "utf8",
          flag: "wx",
        });
      } catch (e) {
        if (getErrnoCode(e) !== "EEXIST") throw e;
      }
      if (!openFileInExternalEditor(memoryPath)) {
        onDone(
          `Couldn't open ${call(memoryPath)} in an editor. If no editor is configured, set $EDITOR or $VISUAL, then run /memory again.`,
          {
            display: "system",
          },
        );
        return;
      }
      let editorSource = "default";
      let editorValue = "";
      if (env.VISUAL) {
        editorSource = "$VISUAL";
        editorValue = env.VISUAL;
      } else if (env.EDITOR) {
        editorSource = "$EDITOR";
        editorValue = env.EDITOR;
      }
      let editorInfo = editorSource !== "default" ? `Using ${editorSource}="${editorValue}".` : "";
      let editorHint = editorInfo
        ? `> ${editorInfo} To change editor, set $EDITOR or $VISUAL environment variable.`
        : "> To use a different editor, set the $EDITOR or $VISUAL environment variable.";
      let safeModeNote = isSafeMode()
        ? `

> Safe mode: this session doesn't load CLAUDE.md files, so changes take effect after you ${getSafeModeExitHint()}.`
        : "";
      onDone(
        `Opened ${call(memoryPath)}${safeModeNote}

${editorHint}`,
        {
          display: "system",
        },
      );
    } catch (error) {
      logForDebugging(`Failed to open memory file ${memoryPath}: ${error}`, {
        level: "error",
      });
      onDone(`Couldn't open ${call(memoryPath)}: ${errorMessage(error)}`, {
        display: "system",
      });
    }
  };
  let handleCancel = () => {
    onDone("Cancelled memory editing", {
      display: "system",
    });
  };
  return jsxProd_default(Dialog, {
    title: "Memory",
    onCancel: handleCancel,
    color: "remember",
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        isSafeMode() &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                color: "suggestion",
                children: [figures_default.info, " Safe mode"],
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "CLAUDE.md files aren't loaded into this session. You can still edit them \u2014 changes take effect after you",
                  " ",
                  getSafeModeExitHint(),
                  ".",
                ],
              }),
            ],
          }),
        jsxProd_default(suspenseTypeExport, {
          fallback: jsxProd_default(WorkerBadge, {
            message: "Loading\u2026",
            dimColor: true,
          }),
          children: jsxProd_default(MemoryFileSelector, {
            session,
            commandContext,
            addedInstructionFiles,
            onSelect: handleSelectMemoryFile,
            onCancel: handleCancel,
          }),
        }),
        jsxProd_default(LearnMoreLink, {
          url: "https://code.claude.com/docs/en/memory",
        }),
      ],
    }),
  });
}
export { MemoryCommand };
