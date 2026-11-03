/**
 * components/ChannelDowngradeDialog.tsx
 *
 * 切换到 stable 更新通道可能降级时的确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ChannelDowngradeDialog.tsx
 * pieces: chunk-9h8dr0qb.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-9h8dr0qb.js:6534-6538 placement
j();
//@ chunk-9h8dr0qb.js:6538-6542 placement
j();
//@ chunk-9h8dr0qb.js:6542-7565 fingerprint = ChannelDowngradeDialog (0.849)
function ChannelDowngradeDialog(t0) {
  let $ = w(17),
    { currentVersion: currentVersion, onChoice: onChoice } = t0,
    D;
  if ($[0] !== onChoice)
    ((D = function T(value) {
      onChoice(value);
    }),
      ($[0] = onChoice),
      ($[1] = D));
  else D = $[1];
  let T = D,
    A;
  if ($[2] !== onChoice)
    ((A = function v() {
      onChoice("cancel");
    }),
      ($[2] = onChoice),
      ($[3] = A));
  else A = $[3];
  let v = A,
    F;
  if ($[4] !== currentVersion)
    ((F = r(Text, {
      children: [
        "The stable channel may have an older version than what you're currently running (",
        currentVersion,
        ").",
      ],
    })),
      ($[4] = currentVersion),
      ($[5] = F));
  else F = $[5];
  let U;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((U = e(Text, { dimColor: !0, children: "How would you like to handle this?" })), ($[6] = U));
  else U = $[6];
  let W;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((W = { label: "Allow possible downgrade to stable version", value: "downgrade" }), ($[7] = W));
  else W = $[7];
  const t6 = `Stay on current version (${currentVersion}) until stable catches up`;
  let B;
  if ($[8] !== t6) ((B = [W, { label: t6, value: "stay" }]), ($[8] = t6), ($[9] = B));
  else B = $[9];
  let H;
  if ($[10] !== T || $[11] !== B)
    ((H = e(ModelSelector, { options: B, onChange: T })), ($[10] = T), ($[11] = B), ($[12] = H));
  else H = $[12];
  let K;
  if ($[13] !== v || $[14] !== F || $[15] !== H)
    ((K = r(Dialog, {
      title: "Switch to Stable Channel",
      onCancel: v,
      color: "permission",
      hideBorder: !0,
      hideInputGuide: !0,
      children: [F, U, H],
    })),
      ($[13] = v),
      ($[14] = F),
      ($[15] = H),
      ($[16] = K));
  else K = $[16];
  return K;
}

export { ChannelDowngradeDialog };
