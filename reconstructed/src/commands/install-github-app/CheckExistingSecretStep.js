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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../../components/design-system/ThemeProvider.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { color } from "../../components/design-system/color.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-4v9zy7gn.js:25463-25467 placement
j();
//@ chunk-4v9zy7gn.js:25467-27429 fingerprint = CheckExistingSecretStep (0.705)
function CheckExistingSecretStep(t0) {
  let _ = w(38),
    {
      useExistingSecret: useExistingSecret,
      secretName: secretName,
      onToggleUseExistingSecret: onToggleUseExistingSecret,
      onSecretNameChange: onSecretNameChange,
      onSubmit: onSubmit,
    } = t0,
    [o, v] = y(0),
    terminalSize = useTerminalSize(),
    [g] = useTheme(),
    k;
  if (_[0] !== onToggleUseExistingSecret)
    ((k = () => onToggleUseExistingSecret(!0)), (_[0] = onToggleUseExistingSecret), (_[1] = k));
  else k = _[1];
  let E = k,
    x;
  if (_[2] !== onToggleUseExistingSecret)
    ((x = () => onToggleUseExistingSecret(!1)), (_[2] = onToggleUseExistingSecret), (_[3] = x));
  else x = _[3];
  let T = x,
    W;
  if (_[4] !== T || _[5] !== E || _[6] !== onSubmit)
    ((W = { "confirm:previous": E, "confirm:next": T, "confirm:yes": onSubmit }),
      (_[4] = T),
      (_[5] = E),
      (_[6] = onSubmit),
      (_[7] = W));
  else W = _[7];
  let N;
  if (_[8] !== useExistingSecret)
    ((N = { context: "Confirmation", isActive: useExistingSecret }), (_[8] = useExistingSecret), (_[9] = N));
  else N = _[9];
  MessageActionsKeybindings(W, N);
  let G;
  if (_[10] !== T || _[11] !== E)
    ((G = { "confirm:previous": E, "confirm:next": T }), (_[10] = T), (_[11] = E), (_[12] = G));
  else G = _[12];
  const t6 = !useExistingSecret;
  let V;
  if (_[13] !== t6) ((V = { context: "Confirmation", isActive: t6 }), (_[13] = t6), (_[14] = V));
  else V = _[14];
  MessageActionsKeybindings(G, V);
  let M;
  if (_[15] === MEMO_CACHE_SENTINEL)
    ((M = e(Box, {
      children: e(Text, {
        color: "warning",
        children: "ANTHROPIC_API_KEY already exists in repository secrets!",
      }),
    })),
      (_[15] = M));
  else M = _[15];
  let ie;
  if (_[16] === MEMO_CACHE_SENTINEL)
    ((ie = e(Box, { children: e(Text, { children: "Would you like to:" }) })), (_[16] = ie));
  else ie = _[16];
  let F;
  if (_[17] !== g || _[18] !== useExistingSecret)
    ((F = useExistingSecret ? color("success", g)("> ") : "  "),
      (_[17] = g),
      (_[18] = useExistingSecret),
      (_[19] = F));
  else F = _[19];
  let U;
  if (_[20] !== F)
    ((U = e(Box, { children: r(Text, { children: [F, "Use the existing API key"] }) })),
      (_[20] = F),
      (_[21] = U));
  else U = _[21];
  let D;
  if (_[22] !== g || _[23] !== useExistingSecret)
    ((D = !useExistingSecret ? color("success", g)("> ") : "  "),
      (_[22] = g),
      (_[23] = useExistingSecret),
      (_[24] = D));
  else D = _[24];
  let Y;
  if (_[25] !== D)
    ((Y = e(Box, { children: r(Text, { children: [D, "Create a new secret with a different name"] }) })),
      (_[25] = D),
      (_[26] = Y));
  else Y = _[26];
  let X;
  if (
    _[27] !== o ||
    _[28] !== onSecretNameChange ||
    _[29] !== onSubmit ||
    _[30] !== secretName ||
    _[31] !== terminalSize ||
    _[32] !== useExistingSecret
  )
    ((X =
      !useExistingSecret &&
      r(Fragment, {
        children: [
          e(Box, {
            children: e(Text, { children: "Enter new secret name (alphanumeric with underscores):" }),
          }),
          e(TextInput, {
            value: secretName,
            onChange: onSecretNameChange,
            onSubmit: onSubmit,
            focus: !0,
            placeholder: "e.g., CLAUDE_API_KEY",
            columns: terminalSize.columns,
            cursorOffset: o,
            onChangeCursorOffset: v,
            showCursor: !0,
          }),
        ],
      })),
      (_[27] = o),
      (_[28] = onSecretNameChange),
      (_[29] = onSubmit),
      (_[30] = secretName),
      (_[31] = terminalSize),
      (_[32] = useExistingSecret),
      (_[33] = X));
  else X = _[33];
  let pe;
  if (_[34] !== U || _[35] !== Y || _[36] !== X)
    ((pe = r(Box, { flexDirection: "column", gap: 1, children: [M, ie, U, Y, X] })),
      (_[34] = U),
      (_[35] = Y),
      (_[36] = X),
      (_[37] = pe));
  else pe = _[37];
  return pe;
}

export { CheckExistingSecretStep };
