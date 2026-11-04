/**
 * commands/install-github-app/ApiKeyStep.tsx
 *
 * 并入已有模块：GitHub App 安装向导 API key 步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ApiKeyStep.tsx
 * pieces: chunk-4v9zy7gn.js (3)
 * attribution: placement 1, layout 1, fingerprint 1
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../../components/design-system/ThemeProvider.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { color } from "../../components/design-system/color.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-4v9zy7gn.js:22847-22851 placement
init_react_production();
//@ chunk-4v9zy7gn.js:22851-22885 layout
var API_KEY_OPTIONS = ["existing", "oauth", "new"];
//@ chunk-4v9zy7gn.js:22885-25463 fingerprint = ApiKeyStep (0.787)
function ApiKeyStep(props) {
  let $ = useMemoCache(52);
  let {
    existingApiKey,
    apiKeyOrOAuthToken,
    onApiKeyChange,
    onSubmit,
    onToggleUseExistingKey,
    onCreateOAuthToken,
    selectedOption,
    onSelectOption,
  } = props;
  let selectedOption_2 =
    selectedOption === undefined
      ? existingApiKey
        ? "existing"
        : onCreateOAuthToken
          ? "oauth"
          : "new"
      : selectedOption;
  let [cursorOffset, setCursorOffset] = useState(0);
  let terminalSize = useTerminalSize();
  let [theme] = useTheme();
  const existing = !!existingApiKey;
  const oauth = !!onCreateOAuthToken;
  let options;
  if ($[0] !== existing || $[1] !== oauth) {
    let available = {
      existing,
      oauth,
      new: true,
    };
    options = API_KEY_OPTIONS.filter((option) => available[option]);
    $[0] = existing;
    $[1] = oauth;
    $[2] = options;
  } else options = $[2];
  let list = options;
  let move;
  if (
    $[3] !== list ||
    $[4] !== onSelectOption ||
    $[5] !== onToggleUseExistingKey ||
    $[6] !== selectedOption_2
  ) {
    move = (delta) => {
      let nextOption = list[list.indexOf(selectedOption_2) + delta];
      if (!nextOption) {
        return;
      }
      onSelectOption(nextOption);
      if ((nextOption === "existing") !== (selectedOption_2 === "existing"))
        onToggleUseExistingKey(nextOption === "existing");
    };
    $[3] = list;
    $[4] = onSelectOption;
    $[5] = onToggleUseExistingKey;
    $[6] = selectedOption_2;
    $[7] = move;
  } else move = $[7];
  let handleMove = move;
  let body;
  if ($[8] !== handleMove) {
    body = () => handleMove(-1);
    $[8] = handleMove;
    $[9] = body;
  } else body = $[9];
  let handlePrevious = body;
  let footer;
  if ($[10] !== handleMove) {
    footer = () => handleMove(1);
    $[10] = handleMove;
    $[11] = footer;
  } else footer = $[11];
  let handleNext = footer;
  let isTextInputVisible = selectedOption_2 === "new";
  let statusLine;
  if ($[12] !== onCreateOAuthToken || $[13] !== onSubmit || $[14] !== selectedOption_2) {
    statusLine = () => {
      if (selectedOption_2 === "oauth" && onCreateOAuthToken) {
        onCreateOAuthToken();
        return;
      }
      onSubmit();
    };
    $[12] = onCreateOAuthToken;
    $[13] = onSubmit;
    $[14] = selectedOption_2;
    $[15] = statusLine;
  } else statusLine = $[15];
  let status = statusLine;
  let t5;
  if ($[16] !== status || $[17] !== handleNext || $[18] !== handlePrevious) {
    t5 = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
      "confirm:yes": status,
    };
    $[16] = status;
    $[17] = handleNext;
    $[18] = handlePrevious;
    $[19] = t5;
  } else t5 = $[19];
  const isActive = !isTextInputVisible;
  let t7;
  if ($[20] !== isActive) {
    t7 = {
      context: "Confirmation",
      isActive,
    };
    $[20] = isActive;
    $[21] = t7;
  } else t7 = $[21];
  MessageActionsKeybindings(t5, t7);
  let hint;
  if ($[22] !== handleNext || $[23] !== handlePrevious) {
    hint = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
    };
    $[22] = handleNext;
    $[23] = handlePrevious;
    $[24] = hint;
  } else hint = $[24];
  let t9;
  if ($[25] !== isTextInputVisible) {
    t9 = {
      context: "Confirmation",
      isActive: isTextInputVisible,
    };
    $[25] = isTextInputVisible;
    $[26] = t9;
  } else t9 = $[26];
  MessageActionsKeybindings(hint, t9);
  let t11;
  if ($[27] !== existingApiKey || $[28] !== selectedOption_2 || $[29] !== theme) {
    t11 =
      existingApiKey &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          children: [
            selectedOption_2 === "existing" ? color("success", theme)("> ") : "  ",
            "Use your existing Claude Code API key",
          ],
        }),
      });
    $[27] = existingApiKey;
    $[28] = selectedOption_2;
    $[29] = theme;
    $[30] = t11;
  } else t11 = $[30];
  let t12;
  if ($[31] !== onCreateOAuthToken || $[32] !== selectedOption_2 || $[33] !== theme) {
    t12 =
      onCreateOAuthToken &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          children: [
            selectedOption_2 === "oauth" ? color("success", theme)("> ") : "  ",
            "Create a long-lived token with your Claude subscription",
          ],
        }),
      });
    $[31] = onCreateOAuthToken;
    $[32] = selectedOption_2;
    $[33] = theme;
    $[34] = t12;
  } else t12 = $[34];
  let t13;
  if ($[35] !== selectedOption_2 || $[36] !== theme) {
    t13 = selectedOption_2 === "new" ? color("success", theme)("> ") : "  ";
    $[35] = selectedOption_2;
    $[36] = theme;
    $[37] = t13;
  } else t13 = $[37];
  let t14;
  if ($[38] !== t13) {
    t14 = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        children: [t13, "Enter a new API key"],
      }),
    });
    $[38] = t13;
    $[39] = t14;
  } else t14 = $[39];
  let t15;
  if (
    $[40] !== apiKeyOrOAuthToken ||
    $[41] !== cursorOffset ||
    $[42] !== status ||
    $[43] !== onApiKeyChange ||
    $[44] !== selectedOption_2 ||
    $[45] !== terminalSize
  ) {
    t15 =
      selectedOption_2 === "new" &&
      jsxProd_default(TextInput, {
        value: apiKeyOrOAuthToken,
        onChange: onApiKeyChange,
        onSubmit: status,
        onPaste: onApiKeyChange,
        focus: true,
        placeholder: "sk-ant\u2026 (Create a new key at https://platform.claude.com/settings/keys)",
        mask: "*",
        columns: terminalSize.columns,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        showCursor: true,
      });
    $[40] = apiKeyOrOAuthToken;
    $[41] = cursorOffset;
    $[42] = status;
    $[43] = onApiKeyChange;
    $[44] = selectedOption_2;
    $[45] = terminalSize;
    $[46] = t15;
  } else t15 = $[46];
  let child;
  if ($[47] !== t11 || $[48] !== t12 || $[49] !== t14 || $[50] !== t15) {
    child = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t11, t12, t14, t15],
    });
    $[47] = t11;
    $[48] = t12;
    $[49] = t14;
    $[50] = t15;
    $[51] = child;
  } else child = $[51];
  return child;
}
export { ApiKeyStep };
