/**
 * components/DevChannelsDialog.tsx
 *
 * 使用 --dangerously-load-development-channels 时的风险确认。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DevChannelsDialog.tsx
 * pieces: chunk-jmdd9gvn.js (3)
 * attribution: file-last-pair 1, layout 1, fingerprint 1
 */
import { gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-jmdd9gvn.js:13631-13650 file-last-pair
function k() {
  gracefulShutdownSync(0);
}
//@ chunk-jmdd9gvn.js:13650-13744 layout = _temp2 (1)
function A(c) {
  return c.kind === "plugin" ? `plugin:${c.name}@${c.marketplace}` : `server:${c.name}`;
}
//@ chunk-jmdd9gvn.js:13744-14784 fingerprint = DevChannelsDialog (0.658)
function DevChannelsDialog(t0) {
  let $ = w(13),
    { channels: channels, onAccept: onAccept } = t0,
    f;
  if ($[0] !== onAccept)
    ((f = function a(value) {
      z: switch (value) {
        case "accept": {
          onAccept();
          break z;
        }
        case "exit": {
          gracefulShutdownSync(1);
        }
      }
    }),
      ($[0] = onAccept),
      ($[1] = f));
  else f = $[1];
  let a = f,
    L = k,
    C,
    g;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((C = e(Text, {
      children:
        "--dangerously-load-development-channels is for local channel development only. Do not use this option to run channels you have downloaded off the internet.",
    })),
      (g = e(Text, { children: "Please use --channels to run a list of approved channels." })),
      ($[2] = C),
      ($[3] = g));
  else ((C = $[2]), (g = $[3]));
  let c;
  if ($[4] !== channels) ((c = channels.map(A).join(", ")), ($[4] = channels), ($[5] = c));
  else c = $[5];
  let l;
  if ($[6] !== c)
    ((l = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [C, g, r(Text, { dimColor: !0, children: ["Channels:", " ", c] })],
    })),
      ($[6] = c),
      ($[7] = l));
  else l = $[7];
  let i;
  if ($[8] !== a)
    ((i = e(ConfirmSelect, {
      confirmLabel: "I am using this for local development",
      cancelLabel: "Exit",
      onConfirm: () => a("accept"),
      onCancel: () => a("exit"),
    })),
      ($[8] = a),
      ($[9] = i));
  else i = $[9];
  let u;
  if ($[10] !== l || $[11] !== i)
    ((u = r(Dialog, {
      title: "WARNING: Loading development channels",
      color: "error",
      onCancel: L,
      children: [l, i],
    })),
      ($[10] = l),
      ($[11] = i),
      ($[12] = u));
  else u = $[12];
  return u;
}
