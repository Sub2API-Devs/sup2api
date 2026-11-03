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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../../components/design-system/ThemeProvider.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { color } from "../../components/design-system/color.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-4v9zy7gn.js:22847-22851 placement
j();
//@ chunk-4v9zy7gn.js:22851-22885 layout
var API_KEY_OPTIONS = ["existing", "oauth", "new"];
//@ chunk-4v9zy7gn.js:22885-25463 fingerprint = ApiKeyStep (0.787)
function ApiKeyStep(t0) {
  let N = w(52),
    {
      existingApiKey: existingApiKey,
      apiKeyOrOAuthToken: apiKeyOrOAuthToken,
      onApiKeyChange: onApiKeyChange,
      onSubmit: onSubmit,
      onToggleUseExistingKey: onToggleUseExistingKey,
      onCreateOAuthToken: onCreateOAuthToken,
      selectedOption: t1,
      onSelectOption: onSelectOption,
    } = t0,
    selectedOption =
      t1 === void 0 ? (existingApiKey ? "existing" : onCreateOAuthToken ? "oauth" : "new") : t1,
    [_, k] = y(0),
    terminalSize = useTerminalSize(),
    [x] = useTheme();
  const T = !!existingApiKey,
    W = !!onCreateOAuthToken;
  let G;
  if (N[0] !== T || N[1] !== W) {
    let B = { existing: T, oauth: W, new: !0 };
    G = API_KEY_OPTIONS.filter((V) => B[V]);
    ((N[0] = T), (N[1] = W), (N[2] = G));
  } else G = N[2];
  let M = G,
    ie;
  if (N[3] !== M || N[4] !== onSelectOption || N[5] !== onToggleUseExistingKey || N[6] !== selectedOption)
    ((ie = (F) => {
      let U = M[M.indexOf(selectedOption) + F];
      if (!U) {
        return;
      }
      if ((onSelectOption(U), (U === "existing") !== (selectedOption === "existing")))
        onToggleUseExistingKey(U === "existing");
    }),
      (N[3] = M),
      (N[4] = onSelectOption),
      (N[5] = onToggleUseExistingKey),
      (N[6] = selectedOption),
      (N[7] = ie));
  else ie = N[7];
  let D = ie,
    Y;
  if (N[8] !== D) ((Y = () => D(-1)), (N[8] = D), (N[9] = Y));
  else Y = N[9];
  let X = Y,
    pe;
  if (N[10] !== D) ((pe = () => D(1)), (N[10] = D), (N[11] = pe));
  else pe = N[11];
  let ae = pe,
    isTextInputVisible = selectedOption === "new",
    _e;
  if (N[12] !== onCreateOAuthToken || N[13] !== onSubmit || N[14] !== selectedOption)
    ((_e = () => {
      if (selectedOption === "oauth" && onCreateOAuthToken) {
        onCreateOAuthToken();
        return;
      }
      onSubmit();
    }),
      (N[12] = onCreateOAuthToken),
      (N[13] = onSubmit),
      (N[14] = selectedOption),
      (N[15] = _e));
  else _e = N[15];
  let te = _e,
    me;
  if (N[16] !== te || N[17] !== ae || N[18] !== X)
    ((me = { "confirm:previous": X, "confirm:next": ae, "confirm:yes": te }),
      (N[16] = te),
      (N[17] = ae),
      (N[18] = X),
      (N[19] = me));
  else me = N[19];
  const t6 = !isTextInputVisible;
  let se;
  if (N[20] !== t6) ((se = { context: "Confirmation", isActive: t6 }), (N[20] = t6), (N[21] = se));
  else se = N[21];
  MessageActionsKeybindings(me, se);
  let ge;
  if (N[22] !== ae || N[23] !== X)
    ((ge = { "confirm:previous": X, "confirm:next": ae }), (N[22] = ae), (N[23] = X), (N[24] = ge));
  else ge = N[24];
  let J;
  if (N[25] !== isTextInputVisible)
    ((J = { context: "Confirmation", isActive: isTextInputVisible }),
      (N[25] = isTextInputVisible),
      (N[26] = J));
  else J = N[26];
  MessageActionsKeybindings(ge, J);
  let ye;
  if (N[27] !== existingApiKey || N[28] !== selectedOption || N[29] !== x)
    ((ye =
      existingApiKey &&
      e(Box, {
        children: r(Text, {
          children: [
            selectedOption === "existing" ? color("success", x)("> ") : "  ",
            "Use your existing Claude Code API key",
          ],
        }),
      })),
      (N[27] = existingApiKey),
      (N[28] = selectedOption),
      (N[29] = x),
      (N[30] = ye));
  else ye = N[30];
  let be;
  if (N[31] !== onCreateOAuthToken || N[32] !== selectedOption || N[33] !== x)
    ((be =
      onCreateOAuthToken &&
      e(Box, {
        children: r(Text, {
          children: [
            selectedOption === "oauth" ? color("success", x)("> ") : "  ",
            "Create a long-lived token with your Claude subscription",
          ],
        }),
      })),
      (N[31] = onCreateOAuthToken),
      (N[32] = selectedOption),
      (N[33] = x),
      (N[34] = be));
  else be = N[34];
  let m;
  if (N[35] !== selectedOption || N[36] !== x)
    ((m = selectedOption === "new" ? color("success", x)("> ") : "  "),
      (N[35] = selectedOption),
      (N[36] = x),
      (N[37] = m));
  else m = N[37];
  let h;
  if (N[38] !== m)
    ((h = e(Box, { children: r(Text, { children: [m, "Enter a new API key"] }) })), (N[38] = m), (N[39] = h));
  else h = N[39];
  let H;
  if (
    N[40] !== apiKeyOrOAuthToken ||
    N[41] !== _ ||
    N[42] !== te ||
    N[43] !== onApiKeyChange ||
    N[44] !== selectedOption ||
    N[45] !== terminalSize
  )
    ((H =
      selectedOption === "new" &&
      e(TextInput, {
        value: apiKeyOrOAuthToken,
        onChange: onApiKeyChange,
        onSubmit: te,
        onPaste: onApiKeyChange,
        focus: !0,
        placeholder: "sk-ant\u2026 (Create a new key at https://platform.claude.com/settings/keys)",
        mask: "*",
        columns: terminalSize.columns,
        cursorOffset: _,
        onChangeCursorOffset: k,
        showCursor: !0,
      })),
      (N[40] = apiKeyOrOAuthToken),
      (N[41] = _),
      (N[42] = te),
      (N[43] = onApiKeyChange),
      (N[44] = selectedOption),
      (N[45] = terminalSize),
      (N[46] = H));
  else H = N[46];
  let K;
  if (N[47] !== ye || N[48] !== be || N[49] !== h || N[50] !== H)
    ((K = r(Box, { flexDirection: "column", gap: 1, children: [ye, be, h, H] })),
      (N[47] = ye),
      (N[48] = be),
      (N[49] = h),
      (N[50] = H),
      (N[51] = K));
  else K = N[51];
  return K;
}

export { ApiKeyStep };
