/**
 * commands/memory/memory.tsx
 *
 * /memory 实现：选择并在编辑器打开 CLAUDE.md 或记忆文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/memory/memory.tsx
 * pieces: chunk-c55mbvfz.js (2)
 * attribution: file-last-pair 1, fingerprint 1
 */
import { homedir } from "os";
import { relative } from "path";
import { writeFile } from "fs/promises";
import { getCwd } from "../../utils/cwd.js";
import { getClaudeConfigDir, isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { openFileInExternalEditor } from "../../utils/editor.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { fo } from "../../../vendor/react/cjs/react.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { MemoryFileSelector } from "../../components/memory/MemoryFileSelector.js";
import { LearnMoreLink } from "../../components/LearnMoreLink.js";

//@ chunk-c55mbvfz.js:41910-42077 file-last-pair
function call(onDone) {
  let _ = homedir(),
    C = getCwd(),
    v = onDone.startsWith(_) ? "~" + onDone.slice(_.length) : null,
    T = onDone.startsWith(C) ? "./" + relative(C, onDone) : null;
  if (v && T) return v.length <= T.length ? v : T;
  return v || T || onDone;
}
//@ chunk-c55mbvfz.js:42077-43674 fingerprint = MemoryCommand (0.697)
function MemoryCommand({
  session: session,
  commandContext: commandContext,
  addedInstructionFiles: addedInstructionFiles,
  onDone: onDone,
}) {
  let handleSelectMemoryFile = async (memoryPath) => {
      try {
        if (memoryPath.includes(getClaudeConfigDir()))
          await getFsImplementation().mkdir(getClaudeConfigDir());
        try {
          await writeFile(memoryPath, "", { encoding: "utf8", flag: "wx" });
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") throw error;
        }
        if (!openFileInExternalEditor(memoryPath)) {
          onDone(
            `Couldn't open ${call(memoryPath)} in an editor. If no editor is configured, set $EDITOR or $VISUAL, then run /memory again.`,
            { display: "system" },
          );
          return;
        }
        let editorSource = "default",
          editorValue = "";
        if (env.VISUAL) ((editorSource = "$VISUAL"), (editorValue = env.VISUAL));
        else if (env.EDITOR) ((editorSource = "$EDITOR"), (editorValue = env.EDITOR));
        let I = editorSource !== "default" ? `Using ${editorSource}="${editorValue}".` : "",
          L = I
            ? `> ${I} To change editor, set $EDITOR or $VISUAL environment variable.`
            : "> To use a different editor, set the $EDITOR or $VISUAL environment variable.",
          U = isSafeMode()
            ? `

> Safe mode: this session doesn't load CLAUDE.md files, so changes take effect after you ${getSafeModeExitHint()}.`
            : "";
        onDone(
          `Opened ${call(memoryPath)}${U}

${L}`,
          { display: "system" },
        );
      } catch (error) {
        (logForDebugging(`Failed to open memory file ${memoryPath}: ${error}`, { level: "error" }),
          onDone(`Couldn't open ${call(memoryPath)}: ${errorMessage(error)}`, { display: "system" }));
      }
    },
    handleCancel = () => {
      onDone("Cancelled memory editing", { display: "system" });
    };
  return e(Dialog, {
    title: "Memory",
    onCancel: handleCancel,
    color: "remember",
    children: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        isSafeMode() &&
          r(Box, {
            flexDirection: "column",
            children: [
              r(Text, { color: "suggestion", children: [re.info, " Safe mode"] }),
              r(Text, {
                dimColor: !0,
                children: [
                  "CLAUDE.md files aren't loaded into this session. You can still edit them \u2014 changes take effect after you",
                  " ",
                  getSafeModeExitHint(),
                  ".",
                ],
              }),
            ],
          }),
        e(fo, {
          fallback: e(WorkerBadge, { message: "Loading\u2026", dimColor: !0 }),
          children: e(MemoryFileSelector, {
            session: session,
            commandContext: commandContext,
            addedInstructionFiles: addedInstructionFiles,
            onSelect: handleSelectMemoryFile,
            onCancel: handleCancel,
          }),
        }),
        e(LearnMoreLink, { url: "https://code.claude.com/docs/en/memory" }),
      ],
    }),
  });
}

export { MemoryCommand };
