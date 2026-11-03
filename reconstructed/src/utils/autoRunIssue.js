/**
 * utils/autoRunIssue.tsx
 *
 * 自动运行 /issue 前的确认提示组件（Esc 取消）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/autoRunIssue.tsx
 * pieces: chunk-s5p7fp0c.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Spinner } from "../components/Spinner.js";
import { Box, Text } from "../ink/components/Text.js";

//@ chunk-s5p7fp0c.js:11644-12107 callgraph-fingerprint = AutoRunIssueNotification (0.382)
function AutoRunIssueNotification(props) {
  let M = w(7);
  let { label, onCancel } = props;
  let L;
  if (M[0] === MEMO_CACHE_SENTINEL) {
    L = {
      context: "Confirmation",
    };
    M[0] = L;
  } else L = M[0];
  useKeybinding("confirm:no", onCancel, L);
  let W;
  if (M[1] === MEMO_CACHE_SENTINEL) {
    W = jsxProd_default(Spinner, {});
    M[1] = W;
  } else W = M[1];
  let F;
  if (M[2] !== label) {
    F = jsxProd_default_2(Box, {
      gap: 1,
      children: [
        W,
        jsxProd_default(Text, {
          children: label,
        }),
      ],
    });
    M[2] = label;
    M[3] = F;
  } else F = M[3];
  let t5;
  if (M[4] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Text, {
      dimColor: true,
      children: "Press Esc to cancel",
    });
    M[4] = t5;
  } else t5 = M[4];
  let t6;
  if (M[5] !== F) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [F, t5],
    });
    M[5] = F;
    M[6] = t6;
  } else t6 = M[6];
  return t6;
}
export { AutoRunIssueNotification };
