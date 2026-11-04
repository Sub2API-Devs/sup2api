/**
 * commands/install-github-app/ChooseRepoStep.tsx
 *
 * GitHub App 安装向导：选择仓库步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ChooseRepoStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-4v9zy7gn.js:27559-29707 fingerprint (2.1.88 match: ChooseRepoStep, 0.84)
function ChooseRepoStep(props) {
  let $ = useMemoCache(44);
  let { currentRepo, useCurrentRepo, repoUrl, onRepoUrlChange, onSubmit, onToggleUseCurrentRepo } = props;
  let [cursorOffset, setCursorOffset] = useState(0);
  let [showEmptyError, setShowEmptyError] = useState(false);
  let textInputColumns = useTerminalSize().columns;
  let t1;
  if ($[0] !== currentRepo || $[1] !== onSubmit || $[2] !== repoUrl || $[3] !== useCurrentRepo) {
    t1 = () => {
      if (!(useCurrentRepo ? currentRepo : repoUrl)?.trim()) {
        setShowEmptyError(true);
        return;
      }
      onSubmit();
    };
    $[0] = currentRepo;
    $[1] = onSubmit;
    $[2] = repoUrl;
    $[3] = useCurrentRepo;
    $[4] = t1;
  } else t1 = $[4];
  let handleSubmit = t1;
  let isTextInputVisible = !useCurrentRepo || !currentRepo;
  let t2;
  if ($[5] !== currentRepo || $[6] !== onToggleUseCurrentRepo) {
    t2 = () => {
      if (!currentRepo) {
        return;
      }
      onToggleUseCurrentRepo(true);
      setShowEmptyError(false);
    };
    $[5] = currentRepo;
    $[6] = onToggleUseCurrentRepo;
    $[7] = t2;
  } else t2 = $[7];
  let handlePrevious = t2;
  let t3;
  if ($[8] !== onToggleUseCurrentRepo) {
    t3 = () => {
      onToggleUseCurrentRepo(false);
      setShowEmptyError(false);
    };
    $[8] = onToggleUseCurrentRepo;
    $[9] = t3;
  } else t3 = $[9];
  let handleNext = t3;
  let t4;
  if ($[10] !== handleNext || $[11] !== handlePrevious || $[12] !== handleSubmit) {
    t4 = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
      "confirm:yes": handleSubmit,
    };
    $[10] = handleNext;
    $[11] = handlePrevious;
    $[12] = handleSubmit;
    $[13] = t4;
  } else t4 = $[13];
  const isActive = !isTextInputVisible;
  let t6;
  if ($[14] !== isActive) {
    t6 = {
      context: "Confirmation",
      isActive,
    };
    $[14] = isActive;
    $[15] = t6;
  } else t6 = $[15];
  MessageActionsKeybindings(t4, t6);
  let keybinds;
  if ($[16] !== handleNext || $[17] !== handlePrevious) {
    keybinds = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
    };
    $[16] = handleNext;
    $[17] = handlePrevious;
    $[18] = keybinds;
  } else keybinds = $[18];
  let t8;
  if ($[19] !== isTextInputVisible) {
    t8 = {
      context: "Confirmation",
      isActive: isTextInputVisible,
    };
    $[19] = isTextInputVisible;
    $[20] = t8;
  } else t8 = $[20];
  MessageActionsKeybindings(keybinds, t8);
  let repoList;
  if ($[21] !== currentRepo || $[22] !== useCurrentRepo) {
    repoList =
      currentRepo &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          bold: useCurrentRepo,
          color: useCurrentRepo ? "permission" : undefined,
          children: [useCurrentRepo ? "> " : "  ", "Use current repository: ", currentRepo],
        }),
      });
    $[21] = currentRepo;
    $[22] = useCurrentRepo;
    $[23] = repoList;
  } else repoList = $[23];
  const bold = !useCurrentRepo || !currentRepo;
  const color = !useCurrentRepo || !currentRepo ? "permission" : undefined;
  const t13 = !useCurrentRepo || !currentRepo ? "> " : "  ";
  const t14 = currentRepo ? "Enter a different repository" : "Enter repository";
  let row;
  if ($[24] !== bold || $[25] !== color || $[26] !== t13 || $[27] !== t14) {
    row = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        bold,
        color,
        children: [t13, t14],
      }),
    });
    $[24] = bold;
    $[25] = color;
    $[26] = t13;
    $[27] = t14;
    $[28] = row;
  } else row = $[28];
  let emptyHint;
  if (
    $[29] !== currentRepo ||
    $[30] !== cursorOffset ||
    $[31] !== handleSubmit ||
    $[32] !== onRepoUrlChange ||
    $[33] !== repoUrl ||
    $[34] !== textInputColumns ||
    $[35] !== useCurrentRepo
  ) {
    emptyHint =
      (!useCurrentRepo || !currentRepo) &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default(TextInput, {
          value: repoUrl,
          onChange: (value) => {
            onRepoUrlChange(value);
            setShowEmptyError(false);
          },
          onSubmit: handleSubmit,
          focus: true,
          placeholder: "Enter a repo as owner/repo or https://github.com/owner/repo\u2026",
          columns: textInputColumns,
          cursorOffset,
          onChangeCursorOffset: setCursorOffset,
          showCursor: true,
        }),
      });
    $[29] = currentRepo;
    $[30] = cursorOffset;
    $[31] = handleSubmit;
    $[32] = onRepoUrlChange;
    $[33] = repoUrl;
    $[34] = textInputColumns;
    $[35] = useCurrentRepo;
    $[36] = emptyHint;
  } else emptyHint = $[36];
  let footer;
  if ($[37] !== showEmptyError) {
    footer =
      showEmptyError &&
      jsxProd_default(Text, {
        color: "error",
        children: "Please enter a repository name to continue",
      });
    $[37] = showEmptyError;
    $[38] = footer;
  } else footer = $[38];
  let statusLine;
  if ($[39] !== row || $[40] !== emptyHint || $[41] !== footer || $[42] !== repoList) {
    statusLine = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [repoList, row, emptyHint, footer],
    });
    $[39] = row;
    $[40] = emptyHint;
    $[41] = footer;
    $[42] = repoList;
    $[43] = statusLine;
  } else statusLine = $[43];
  return statusLine;
}
export { ChooseRepoStep };
