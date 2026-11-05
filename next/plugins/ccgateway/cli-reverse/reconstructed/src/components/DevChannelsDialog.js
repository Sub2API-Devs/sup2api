/**
 * components/DevChannelsDialog.tsx
 *
 * 使用 --dangerously-load-development-channels 时的风险确认。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DevChannelsDialog.tsx
 * pieces: chunk-1rnky8em.js (3)
 * attribution: file-last-pair 1, fingerprint 2
 */
import { gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-1rnky8em.js:14779-14798 file-last-pair
function exitZeroNow() {
  gracefulShutdownSync(0);
}
//@ chunk-1rnky8em.js:14798-14892 fingerprint (2.1.88 match: _temp2, 1)
function exitZeroToo(c) {
  return c.kind === "plugin" ? `plugin:${c.name}@${c.marketplace}` : `server:${c.name}`;
}
//@ chunk-1rnky8em.js:14892-15932 fingerprint (2.1.88 match: DevChannelsDialog, 0.658)
function DevChannelsDialog(props) {
  let $ = useMemoCache(13);
  let { channels, onAccept } = props;
  let t1;
  if ($[0] !== onAccept) {
    t1 = function onChange(value) {
      z: switch (value) {
        case "accept": {
          onAccept();
          break z;
        }
        case "exit": {
          gracefulShutdownSync(1);
        }
      }
    };
    $[0] = onAccept;
    $[1] = t1;
  } else t1 = $[1];
  let onChange = t1;
  let handleEscape = exitZeroNow;
  let t2;
  let t3;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      children:
        "--dangerously-load-development-channels is for local channel development only. Do not use this option to run channels you have downloaded off the internet.",
    });
    t3 = jsxProd_default(Text, {
      children: "Please use --channels to run a list of approved channels.",
    });
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  let t4;
  if ($[4] !== channels) {
    t4 = channels.map(exitZeroToo).join(", ");
    $[4] = channels;
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  if ($[6] !== t4) {
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        t2,
        t3,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Channels:", " ", t4],
        }),
      ],
    });
    $[6] = t4;
    $[7] = t5;
  } else t5 = $[7];
  let confirmElement;
  if ($[8] !== onChange) {
    confirmElement = jsxProd_default(ConfirmSelect, {
      confirmLabel: "I am using this for local development",
      cancelLabel: "Exit",
      onConfirm: () => onChange("accept"),
      onCancel: () => onChange("exit"),
    });
    $[8] = onChange;
    $[9] = confirmElement;
  } else confirmElement = $[9];
  let t8;
  if ($[10] !== t5 || $[11] !== confirmElement) {
    t8 = jsxProd_default_2(Dialog, {
      title: "WARNING: Loading development channels",
      color: "error",
      onCancel: handleEscape,
      children: [t5, confirmElement],
    });
    $[10] = t5;
    $[11] = confirmElement;
    $[12] = t8;
  } else t8 = $[12];
  return t8;
}
export { DevChannelsDialog };
