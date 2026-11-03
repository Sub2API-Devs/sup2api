/**
 * components/messages/AssistantThinkingMessage.tsx
 *
 * 思考块：默认折叠为 "✻ Thinking…"，transcript/verbose 下显示全文（HighlightedThinkingText）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantThinkingMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Cb } from "../../services/orgMemory/promptIndex.js";
import { Box, Text } from "../../ink/components/Text.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { THEREFORE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

/**
 * 思考块：非 verbose/transcript 时显示 "✻ Thinking…"（可 ctrl+o 展开），否则显示全文。
 */
//@ chunk-ah34pb7m.js:63074-64176 fingerprint = AssistantThinkingMessage (0.517)
function AssistantThinkingMessage(t0) {
  let $ = w(27),
    { param: t1, addMargin: t2, isTranscriptMode: isTranscriptMode, verbose: verbose } = t0,
    { thinking: thinking } = t1,
    M = t2 === void 0 ? !1 : t2,
    x,
    k,
    b,
    E,
    B,
    L,
    N,
    W,
    U,
    K;
  if ($[0] !== M || $[1] !== isTranscriptMode || $[2] !== thinking || $[3] !== verbose) {
    b = EARLY_RETURN_SENTINEL;
    Y: {
      let V = Cb(thinking);
      if (!V) {
        b = null;
        break Y;
      }
      let X = isTranscriptMode || verbose;
      k = Box;
      N = "row";
      W = M ? 1 : 0;
      U = "100%";
      if ($[14] === MEMO_CACHE_SENTINEL)
        ((K = e(Box, {
          minWidth: 2,
          children: e(Text, { "aria-label": "thinking:", dimColor: !0, italic: !0, children: THEREFORE }),
        })),
          ($[14] = K));
      else K = $[14];
      x = Box;
      E = "column";
      B = 1;
      L = X
        ? e(MarkdownText_2, { dimColor: !0, capProseWidth: !0, children: V.trim() })
        : e(Text, { dimColor: !0, italic: !0, children: V.trim().replace(/\s+/g, " ") });
    }
    (($[0] = M),
      ($[1] = isTranscriptMode),
      ($[2] = thinking),
      ($[3] = verbose),
      ($[4] = x),
      ($[5] = k),
      ($[6] = b),
      ($[7] = E),
      ($[8] = B),
      ($[9] = L),
      ($[10] = N),
      ($[11] = W),
      ($[12] = U),
      ($[13] = K));
  } else
    ((x = $[4]),
      (k = $[5]),
      (b = $[6]),
      (E = $[7]),
      (B = $[8]),
      (L = $[9]),
      (N = $[10]),
      (W = $[11]),
      (U = $[12]),
      (K = $[13]));
  if (b !== EARLY_RETURN_SENTINEL) return b;
  let z;
  if ($[15] !== x || $[16] !== E || $[17] !== B || $[18] !== L)
    ((z = e(x, { flexDirection: E, flexGrow: B, children: L })),
      ($[15] = x),
      ($[16] = E),
      ($[17] = B),
      ($[18] = L),
      ($[19] = z));
  else z = $[19];
  let ee;
  if ($[20] !== k || $[21] !== z || $[22] !== N || $[23] !== W || $[24] !== U || $[25] !== K)
    ((ee = r(k, { flexDirection: N, marginTop: W, width: U, children: [K, z] })),
      ($[20] = k),
      ($[21] = z),
      ($[22] = N),
      ($[23] = W),
      ($[24] = U),
      ($[25] = K),
      ($[26] = ee));
  else ee = $[26];
  return ee;
}

export { AssistantThinkingMessage };
