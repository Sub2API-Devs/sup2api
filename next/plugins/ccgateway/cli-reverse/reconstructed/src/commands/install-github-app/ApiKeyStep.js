/**
 * commands/install-github-app/ApiKeyStep.tsx
 *
 * 并入已有模块：GitHub App 安装向导 API key 步骤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ApiKeyStep.tsx
 * pieces: chunk-2xbvbqx2.js (3)
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

//@ chunk-2xbvbqx2.js:23995-23999 placement
init_react_production();
//@ chunk-2xbvbqx2.js:23999-24033 layout
var API_KEY_OPTIONS = ["existing", "oauth", "new"];
//@ chunk-2xbvbqx2.js:24033-26505 fingerprint (2.1.88 match: ApiKeyStep, 0.781)
function ApiKeyStep(props) {
  let $ = useMemoCache(51);
  let {
    existingApiKey,
    apiKeyOrOAuthToken,
    onApiKeyChange,
    onSubmit,
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
  if ($[3] !== list || $[4] !== onSelectOption || $[5] !== selectedOption_2) {
    move = (delta) => {
      let nextOption = list[list.indexOf(selectedOption_2) + delta];
      if (!nextOption) {
        return;
      }
      onSelectOption(nextOption);
    };
    $[3] = list;
    $[4] = onSelectOption;
    $[5] = selectedOption_2;
    $[6] = move;
  } else move = $[6];
  let handleMove = move;
  let body;
  if ($[7] !== handleMove) {
    body = () => handleMove(-1);
    $[7] = handleMove;
    $[8] = body;
  } else body = $[8];
  let handlePrevious = body;
  let footer;
  if ($[9] !== handleMove) {
    footer = () => handleMove(1);
    $[9] = handleMove;
    $[10] = footer;
  } else footer = $[10];
  let handleNext = footer;
  let isTextInputVisible = selectedOption_2 === "new";
  let statusLine;
  if ($[11] !== onCreateOAuthToken || $[12] !== onSubmit || $[13] !== selectedOption_2) {
    statusLine = () => {
      if (selectedOption_2 === "oauth" && onCreateOAuthToken) {
        onCreateOAuthToken();
        return;
      }
      onSubmit();
    };
    $[11] = onCreateOAuthToken;
    $[12] = onSubmit;
    $[13] = selectedOption_2;
    $[14] = statusLine;
  } else statusLine = $[14];
  let status = statusLine;
  let t5;
  if ($[15] !== status || $[16] !== handleNext || $[17] !== handlePrevious) {
    t5 = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
      "confirm:yes": status,
    };
    $[15] = status;
    $[16] = handleNext;
    $[17] = handlePrevious;
    $[18] = t5;
  } else t5 = $[18];
  const isActive = !isTextInputVisible;
  let t7;
  if ($[19] !== isActive) {
    t7 = {
      context: "Confirmation",
      isActive,
    };
    $[19] = isActive;
    $[20] = t7;
  } else t7 = $[20];
  MessageActionsKeybindings(t5, t7);
  let hint;
  if ($[21] !== handleNext || $[22] !== handlePrevious) {
    hint = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
    };
    $[21] = handleNext;
    $[22] = handlePrevious;
    $[23] = hint;
  } else hint = $[23];
  let t9;
  if ($[24] !== isTextInputVisible) {
    t9 = {
      context: "Confirmation",
      isActive: isTextInputVisible,
    };
    $[24] = isTextInputVisible;
    $[25] = t9;
  } else t9 = $[25];
  MessageActionsKeybindings(hint, t9);
  let existingOption;
  if ($[26] !== existingApiKey || $[27] !== selectedOption_2 || $[28] !== theme) {
    existingOption =
      existingApiKey &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          children: [
            selectedOption_2 === "existing" ? color("success", theme)("> ") : "  ",
            "Use your existing Claude Code API key",
          ],
        }),
      });
    $[26] = existingApiKey;
    $[27] = selectedOption_2;
    $[28] = theme;
    $[29] = existingOption;
  } else existingOption = $[29];
  let oauthOption;
  if ($[30] !== onCreateOAuthToken || $[31] !== selectedOption_2 || $[32] !== theme) {
    oauthOption =
      onCreateOAuthToken &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          children: [
            selectedOption_2 === "oauth" ? color("success", theme)("> ") : "  ",
            "Create a long-lived token with your Claude subscription",
          ],
        }),
      });
    $[30] = onCreateOAuthToken;
    $[31] = selectedOption_2;
    $[32] = theme;
    $[33] = oauthOption;
  } else oauthOption = $[33];
  let t13;
  if ($[34] !== selectedOption_2 || $[35] !== theme) {
    t13 = selectedOption_2 === "new" ? color("success", theme)("> ") : "  ";
    $[34] = selectedOption_2;
    $[35] = theme;
    $[36] = t13;
  } else t13 = $[36];
  let newKeyOption;
  if ($[37] !== t13) {
    newKeyOption = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        children: [t13, "Enter a new API key"],
      }),
    });
    $[37] = t13;
    $[38] = newKeyOption;
  } else newKeyOption = $[38];
  let keyInput;
  if (
    $[39] !== apiKeyOrOAuthToken ||
    $[40] !== cursorOffset ||
    $[41] !== status ||
    $[42] !== onApiKeyChange ||
    $[43] !== selectedOption_2 ||
    $[44] !== terminalSize
  ) {
    keyInput =
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
    $[39] = apiKeyOrOAuthToken;
    $[40] = cursorOffset;
    $[41] = status;
    $[42] = onApiKeyChange;
    $[43] = selectedOption_2;
    $[44] = terminalSize;
    $[45] = keyInput;
  } else keyInput = $[45];
  let child;
  if ($[46] !== existingOption || $[47] !== oauthOption || $[48] !== newKeyOption || $[49] !== keyInput) {
    child = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [existingOption, oauthOption, newKeyOption, keyInput],
    });
    $[46] = existingOption;
    $[47] = oauthOption;
    $[48] = newKeyOption;
    $[49] = keyInput;
    $[50] = child;
  } else child = $[50];
  return child;
}
export { ApiKeyStep };
