/**
 * components/agents/AgentEditor.tsx
 *
 * 子代理编辑器；本模块实际内容与云网关登录相关，疑似匹配错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentEditor.tsx
 * pieces: chunk-s5p7fp0c.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  TRUST_DECLINE_LABEL,
  TRUST_REJECTED_MESSAGE,
} from "../../services/oauth/gatewayLogin/GatewayLogin.js";
import { Spinner } from "../Spinner.js";

//@ chunk-s5p7fp0c.js:10633-11644 callgraph-fingerprint = AgentEditor (0.184)
function AgentEditor(props) {
  let $ = useMemoCache(13);
  let { userCode, verificationUri, onCancel } = props;
  let keybindingsContext;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingsContext = {
      context: "Confirmation",
    };
    $[0] = keybindingsContext;
  } else keybindingsContext = $[0];
  useKeybinding("confirm:no", onCancel, keybindingsContext);
  let title;
  let declinedNote;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    title = jsxProd_default(Text, {
      bold: true,
      children: "Cloud gateway \xB7 sign in",
    });
    declinedNote = jsxProd_default(Text, {
      children: TRUST_DECLINE_LABEL,
    });
    $[1] = title;
    $[2] = declinedNote;
  } else {
    title = $[1];
    declinedNote = $[2];
  }
  let codeBox;
  if ($[3] !== userCode) {
    codeBox = jsxProd_default(Box, {
      borderDimColor: true,
      borderStyle: "round",
      paddingX: 2,
      children: jsxProd_default(Text, {
        bold: true,
        color: "suggestion",
        children: userCode,
      }),
    });
    $[3] = userCode;
    $[4] = codeBox;
  } else codeBox = $[4];
  let rejectedMessage;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    rejectedMessage = jsxProd_default(Text, {
      dimColor: true,
      children: TRUST_REJECTED_MESSAGE,
    });
    $[5] = rejectedMessage;
  } else rejectedMessage = $[5];
  let uriBox;
  if ($[6] !== verificationUri) {
    uriBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        rejectedMessage,
        jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children: verificationUri,
        }),
      ],
    });
    $[6] = verificationUri;
    $[7] = uriBox;
  } else uriBox = $[7];
  let _;
  let cancelHint;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    _ = jsxProd_default_2(Box, {
      gap: 1,
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default(Text, {
          dimColor: true,
          children: "Waiting for sign-in to complete in your browser\u2026",
        }),
      ],
    });
    cancelHint = jsxProd_default(Text, {
      dimColor: true,
      children: "Press Esc to cancel",
    });
    $[8] = _;
    $[9] = cancelHint;
  } else {
    _ = $[8];
    cancelHint = $[9];
  }
  let column;
  if ($[10] !== codeBox || $[11] !== uriBox) {
    column = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [title, declinedNote, codeBox, uriBox, _, cancelHint],
    });
    $[10] = codeBox;
    $[11] = uriBox;
    $[12] = column;
  } else column = $[12];
  return column;
}
export { AgentEditor };
