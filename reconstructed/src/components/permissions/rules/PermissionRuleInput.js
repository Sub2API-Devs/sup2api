/**
 * components/permissions/rules/PermissionRuleInput.tsx
 *
 * 权限规则输入框（新增规则）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/PermissionRuleInput.tsx
 * pieces: chunk-p2qwpk2k.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { j, y } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { permissionRuleValueFromString } from "../../../utils/permissions/permissionRuleParser.js";
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Newline } from "../../../ink/components/Input.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import { WebFetchTool } from "../../../tools/WebFetchTool/WebFetchTool.js";
import { BashTool } from "../../../tools/BashTool/BashTool.js";
import { TextInput } from "../../TextInput.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Dialog } from "../../design-system/Dialog.js";

//@ chunk-p2qwpk2k.js:24428-24432 placement
j();
//@ chunk-p2qwpk2k.js:24432-25922 fingerprint = PermissionRuleInput (0.585)
function PermissionRuleInput(t0) {
  let $ = w(18),
    { onCancel: onCancel, onSubmit: onSubmit, ruleBehavior: ruleBehavior } = t0,
    [f, g] = y(""),
    [v, x] = y(0),
    c;
  if ($[0] === MEMO_CACHE_SENTINEL) ((c = { context: "Settings" }), ($[0] = c));
  else c = $[0];
  useKeybinding("confirm:no", onCancel, c);
  let { columns: columns } = useTerminalSize(),
    textInputColumns = columns - 6,
    T;
  if ($[1] !== onSubmit || $[2] !== ruleBehavior)
    ((T = (value) => {
      let trimmedValue = value.trim();
      if (trimmedValue.length === 0) {
        return;
      }
      let ruleValue = permissionRuleValueFromString(trimmedValue);
      onSubmit(ruleValue, ruleBehavior);
    }),
      ($[1] = onSubmit),
      ($[2] = ruleBehavior),
      ($[3] = T));
  else T = $[3];
  let handleSubmit = T;
  const L = `Add ${ruleBehavior} permission rule`;
  let B;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((B = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "submit" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      ],
    })),
      ($[4] = B));
  else B = $[4];
  let Y;
  if ($[5] === MEMO_CACHE_SENTINEL) ((Y = e(Newline, {})), ($[5] = Y));
  else Y = $[5];
  let se, Re;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((se = e(Text, { bold: !0, children: formatPermissionRule({ toolName: WebFetchTool.name }) })),
      (Re = e(Text, { bold: !1, children: " or " })),
      ($[6] = se),
      ($[7] = Re));
  else ((se = $[6]), (Re = $[7]));
  let le;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((le = r(Text, {
      children: [
        "Permission rules are a tool name, optionally followed by a specifier in parentheses.",
        Y,
        "e.g.,",
        " ",
        se,
        Re,
        e(Text, {
          bold: !0,
          children: formatPermissionRule({ toolName: BashTool.name, ruleContent: "ls *" }),
        }),
      ],
    })),
      ($[8] = le));
  else le = $[8];
  let J;
  if ($[9] !== v || $[10] !== handleSubmit || $[11] !== f || $[12] !== textInputColumns)
    ((J = r(Box, {
      flexDirection: "column",
      children: [
        le,
        e(Box, {
          borderDimColor: !0,
          borderStyle: "round",
          marginY: 1,
          paddingLeft: 1,
          children: e(TextInput, {
            showCursor: !0,
            focus: !0,
            value: f,
            onChange: g,
            onSubmit: handleSubmit,
            placeholder: `Enter permission rule${re.ellipsis}`,
            columns: textInputColumns,
            cursorOffset: v,
            onChangeCursorOffset: x,
          }),
        }),
      ],
    })),
      ($[9] = v),
      ($[10] = handleSubmit),
      ($[11] = f),
      ($[12] = textInputColumns),
      ($[13] = J));
  else J = $[13];
  let K;
  if ($[14] !== onCancel || $[15] !== L || $[16] !== J)
    ((K = e(Dialog, {
      title: L,
      onCancel: onCancel,
      color: "permission",
      isCancelActive: !1,
      inputGuide: B,
      children: J,
    })),
      ($[14] = onCancel),
      ($[15] = L),
      ($[16] = J),
      ($[17] = K));
  else K = $[17];
  return K;
}

export { PermissionRuleInput };
