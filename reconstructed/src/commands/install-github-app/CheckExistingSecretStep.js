/**
 * commands/install-github-app/CheckExistingSecretStep.tsx
 *
 * 并入已有模块：检查已有 secret 步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/CheckExistingSecretStep.tsx
 * pieces: chunk-4v9zy7gn.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../../components/design-system/ThemeProvider.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { color } from "../../components/design-system/color.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-4v9zy7gn.js:25463-25467 placement
init_react_production();
//@ chunk-4v9zy7gn.js:25467-27429 fingerprint = CheckExistingSecretStep (0.705)
function CheckExistingSecretStep(props) {
  let $ = w(38);
  let { useExistingSecret, secretName, onToggleUseExistingSecret, onSecretNameChange, onSubmit } = props;
  let [cursorOffset, setCursorOffset] = y(0);
  let terminalSize = useTerminalSize();
  let [theme] = useTheme();
  let t1;
  if ($[0] !== onToggleUseExistingSecret) {
    t1 = () => onToggleUseExistingSecret(true);
    $[0] = onToggleUseExistingSecret;
    $[1] = t1;
  } else t1 = $[1];
  let handlePrevious = t1;
  let t2;
  if ($[2] !== onToggleUseExistingSecret) {
    t2 = () => onToggleUseExistingSecret(false);
    $[2] = onToggleUseExistingSecret;
    $[3] = t2;
  } else t2 = $[3];
  let handleNext = t2;
  let t3;
  if ($[4] !== handleNext || $[5] !== handlePrevious || $[6] !== onSubmit) {
    t3 = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
      "confirm:yes": onSubmit,
    };
    $[4] = handleNext;
    $[5] = handlePrevious;
    $[6] = onSubmit;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== useExistingSecret) {
    t4 = {
      context: "Confirmation",
      isActive: useExistingSecret,
    };
    $[8] = useExistingSecret;
    $[9] = t4;
  } else t4 = $[9];
  MessageActionsKeybindings(t3, t4);
  let t5;
  if ($[10] !== handleNext || $[11] !== handlePrevious) {
    t5 = {
      "confirm:previous": handlePrevious,
      "confirm:next": handleNext,
    };
    $[10] = handleNext;
    $[11] = handlePrevious;
    $[12] = t5;
  } else t5 = $[12];
  const isActive = !useExistingSecret;
  let t7;
  if ($[13] !== isActive) {
    t7 = {
      context: "Confirmation",
      isActive,
    };
    $[13] = isActive;
    $[14] = t7;
  } else t7 = $[14];
  MessageActionsKeybindings(t5, t7);
  let t8;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        color: "warning",
        children: "ANTHROPIC_API_KEY already exists in repository secrets!",
      }),
    });
    $[15] = t8;
  } else t8 = $[15];
  let t9;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    t9 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        children: "Would you like to:",
      }),
    });
    $[16] = t9;
  } else t9 = $[16];
  let F;
  if ($[17] !== theme || $[18] !== useExistingSecret) {
    F = useExistingSecret ? color("success", theme)("> ") : "  ";
    $[17] = theme;
    $[18] = useExistingSecret;
    $[19] = F;
  } else F = $[19];
  let U;
  if ($[20] !== F) {
    U = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        children: [F, "Use the existing API key"],
      }),
    });
    $[20] = F;
    $[21] = U;
  } else U = $[21];
  let t13;
  if ($[22] !== theme || $[23] !== useExistingSecret) {
    t13 = !useExistingSecret ? color("success", theme)("> ") : "  ";
    $[22] = theme;
    $[23] = useExistingSecret;
    $[24] = t13;
  } else t13 = $[24];
  let Y;
  if ($[25] !== t13) {
    Y = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        children: [t13, "Create a new secret with a different name"],
      }),
    });
    $[25] = t13;
    $[26] = Y;
  } else Y = $[26];
  let X;
  if (
    $[27] !== cursorOffset ||
    $[28] !== onSecretNameChange ||
    $[29] !== onSubmit ||
    $[30] !== secretName ||
    $[31] !== terminalSize ||
    $[32] !== useExistingSecret
  ) {
    X =
      !useExistingSecret &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              children: "Enter new secret name (alphanumeric with underscores):",
            }),
          }),
          jsxProd_default(TextInput, {
            value: secretName,
            onChange: onSecretNameChange,
            onSubmit,
            focus: true,
            placeholder: "e.g., CLAUDE_API_KEY",
            columns: terminalSize.columns,
            cursorOffset,
            onChangeCursorOffset: setCursorOffset,
            showCursor: true,
          }),
        ],
      });
    $[27] = cursorOffset;
    $[28] = onSecretNameChange;
    $[29] = onSubmit;
    $[30] = secretName;
    $[31] = terminalSize;
    $[32] = useExistingSecret;
    $[33] = X;
  } else X = $[33];
  let pe;
  if ($[34] !== U || $[35] !== Y || $[36] !== X) {
    pe = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t8, t9, U, Y, X],
    });
    $[34] = U;
    $[35] = Y;
    $[36] = X;
    $[37] = pe;
  } else pe = $[37];
  return pe;
}
export { CheckExistingSecretStep };
