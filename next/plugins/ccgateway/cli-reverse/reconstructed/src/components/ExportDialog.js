/**
 * components/ExportDialog.tsx
 *
 * /export：把会话复制到剪贴板或导出到文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ExportDialog.tsx
 * pieces: chunk-am3vy82s.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState } from "../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useProject } from "../context/session.js";
import { useCwdDerived } from "../utils/cwd.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { setClipboard } from "../ink/termio/osc.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { writeExportFile } from "../commands/export/export.js";
import { getCaps } from "../bootstrap/state.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Box, Text } from "../ink/components/Text.js";
import { TextInput } from "./TextInput.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-am3vy82s.js:18832-18870 sole-consumer
function selectOriginalCwd(state) {
  return state.originalCwd;
}
//@ chunk-am3vy82s.js:18870-18900 affinity
function selectCwd(state) {
  return state.cwd;
}
//@ chunk-am3vy82s.js:18900-21471 fingerprint = ExportDialog (0.776)
/**
 * /export：选择复制到剪贴板或导出到文件（默认文件名带时间），完成后显示结果。
 */
function ExportDialog(props) {
  let $ = useMemoCache(32);
  let { content, defaultFilename, onDone } = props;
  let [, setSelectedOption] = useState(null);
  let [filename, setFilename] = useState(defaultFilename);
  let [cursorOffset, setCursorOffset] = useState(defaultFilename.length);
  let [showFilenameInput, setShowFilenameInput] = useState(false);
  let { columns } = useTerminalSize();
  let originalCwd = useProject(selectOriginalCwd);
  let cwdDerived = useCwdDerived(useProject(selectCwd));
  let resetSelectionCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    resetSelectionCached = () => {
      setShowFilenameInput(false);
      setSelectedOption(null);
    };
    $[0] = resetSelectionCached;
  } else resetSelectionCached = $[0];
  let resetSelection = resetSelectionCached;
  let changeHandlerCached;
  if ($[1] !== content || $[2] !== onDone) {
    changeHandlerCached = async (value) => {
      if (value === "clipboard") {
        let raw = await setClipboard(content);
        if (raw) process.stdout.write(raw);
        logFeatureOk("export_clipboard");
        onDone({
          success: true,
          message: "Conversation copied to clipboard",
        });
      } else if (value === "file") {
        setSelectedOption("file");
        setShowFilenameInput(true);
      }
    };
    $[1] = content;
    $[2] = onDone;
    $[3] = changeHandlerCached;
  } else changeHandlerCached = $[3];
  let onChange = changeHandlerCached;
  let submitCached;
  if ($[4] !== content || $[5] !== filename || $[6] !== onDone) {
    submitCached = async () => {
      try {
        let writtenPath = await writeExportFile(filename, content);
        logFeatureOk("export_file");
        onDone({
          success: true,
          message: `Conversation exported to: ${writtenPath}`,
        });
      } catch (error) {
        let writeError = error;
        logFeatureBad("export_file", "write_failed");
        onDone({
          success: false,
          message: `Failed to export conversation: ${writeError instanceof Error ? writeError.message : "Unknown error"}`,
        });
      }
    };
    $[4] = content;
    $[5] = filename;
    $[6] = onDone;
    $[7] = submitCached;
  } else submitCached = $[7];
  let onSubmit = submitCached;
  let handleCancelCached;
  if ($[8] !== onDone || $[9] !== showFilenameInput) {
    handleCancelCached = () => {
      if (showFilenameInput) resetSelection();
      else
        onDone({
          success: false,
          message: "Export cancelled",
        });
    };
    $[8] = onDone;
    $[9] = showFilenameInput;
    $[10] = handleCancelCached;
  } else handleCancelCached = $[10];
  let handleCancel = handleCancelCached;
  let showsRemotePath = getCaps().workspace === "remote" && originalCwd !== cwdDerived;
  let clipboardOption;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    clipboardOption = {
      label: "Copy to clipboard",
      value: "clipboard",
      description: "Copy the conversation to your system clipboard",
    };
    $[11] = clipboardOption;
  } else clipboardOption = $[11];
  const finalFilename = showsRemotePath
    ? "Save the conversation to a file in the directory claude was launched from"
    : "Save the conversation to a file in the current directory";
  let optionsCached;
  if ($[12] !== finalFilename) {
    optionsCached = [
      clipboardOption,
      {
        label: "Save to file",
        value: "file",
        description: finalFilename,
      },
    ];
    $[12] = finalFilename;
    $[13] = optionsCached;
  } else optionsCached = $[13];
  let options = optionsCached;
  let inputGuideCached;
  if ($[14] !== showFilenameInput) {
    inputGuideCached = showFilenameInput
      ? jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "save",
            }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Confirmation",
              fallback: "Esc",
              description: "go back",
            }),
          ],
        })
      : jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "cancel",
        });
    $[14] = showFilenameInput;
    $[15] = inputGuideCached;
  } else inputGuideCached = $[15];
  let inputGuide = inputGuideCached;
  let cancelKeyOptions;
  if ($[16] !== showFilenameInput) {
    cancelKeyOptions = {
      context: "Settings",
      isActive: showFilenameInput,
    };
    $[16] = showFilenameInput;
    $[17] = cancelKeyOptions;
  } else cancelKeyOptions = $[17];
  useKeybinding("confirm:no", handleCancel, cancelKeyOptions);
  const isCancelActive = !showFilenameInput;
  let children;
  if (
    $[18] !== columns ||
    $[19] !== cursorOffset ||
    $[20] !== filename ||
    $[21] !== handleCancel ||
    $[22] !== onSubmit ||
    $[23] !== onChange ||
    $[24] !== options ||
    $[25] !== showFilenameInput
  ) {
    children = !showFilenameInput
      ? jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: handleCancel,
        })
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              children: "Enter filename:",
            }),
            jsxProd_default_2(Box, {
              flexDirection: "row",
              gap: 1,
              marginTop: 1,
              children: [
                jsxProd_default(Text, {
                  children: ">",
                }),
                jsxProd_default(TextInput, {
                  value: filename,
                  onChange: setFilename,
                  onSubmit,
                  focus: true,
                  showCursor: true,
                  columns,
                  cursorOffset,
                  onChangeCursorOffset: setCursorOffset,
                }),
              ],
            }),
          ],
        });
    $[18] = columns;
    $[19] = cursorOffset;
    $[20] = filename;
    $[21] = handleCancel;
    $[22] = onSubmit;
    $[23] = onChange;
    $[24] = options;
    $[25] = showFilenameInput;
    $[26] = children;
  } else children = $[26];
  let dialogElement;
  if ($[27] !== handleCancel || $[28] !== inputGuide || $[29] !== isCancelActive || $[30] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Export conversation",
      subtitle: "Select export method",
      color: "permission",
      onCancel: handleCancel,
      inputGuide,
      isCancelActive,
      children,
    });
    $[27] = handleCancel;
    $[28] = inputGuide;
    $[29] = isCancelActive;
    $[30] = children;
    $[31] = dialogElement;
  } else dialogElement = $[31];
  return dialogElement;
}
export { ExportDialog };
