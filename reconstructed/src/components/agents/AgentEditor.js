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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let $ = w(13);
  let { userCode, verificationUri, onCancel } = props;
  let W;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    W = {
      context: "Confirmation",
    };
    $[0] = W;
  } else W = $[0];
  useKeybinding("confirm:no", onCancel, W);
  let F;
  let U;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    F = jsxProd_default(Text, {
      bold: true,
      children: "Cloud gateway \xB7 sign in",
    });
    U = jsxProd_default(Text, {
      children: TRUST_DECLINE_LABEL,
    });
    $[1] = F;
    $[2] = U;
  } else {
    F = $[1];
    U = $[2];
  }
  let i;
  if ($[3] !== userCode) {
    i = jsxProd_default(Box, {
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
    $[4] = i;
  } else i = $[4];
  let ae;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    ae = jsxProd_default(Text, {
      dimColor: true,
      children: TRUST_REJECTED_MESSAGE,
    });
    $[5] = ae;
  } else ae = $[5];
  let x;
  if ($[6] !== verificationUri) {
    x = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        ae,
        jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children: verificationUri,
        }),
      ],
    });
    $[6] = verificationUri;
    $[7] = x;
  } else x = $[7];
  let _;
  let Q;
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
    Q = jsxProd_default(Text, {
      dimColor: true,
      children: "Press Esc to cancel",
    });
    $[8] = _;
    $[9] = Q;
  } else {
    _ = $[8];
    Q = $[9];
  }
  let ue;
  if ($[10] !== i || $[11] !== x) {
    ue = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [F, U, i, x, _, Q],
    });
    $[10] = i;
    $[11] = x;
    $[12] = ue;
  } else ue = $[12];
  return ue;
}
export { AgentEditor };
