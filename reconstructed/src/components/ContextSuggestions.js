/**
 * components/ContextSuggestions.tsx
 *
 * /context 的优化建议列表（每条建议与可节省的 token）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ContextSuggestions.tsx
 * pieces: chunk-10q8r8ck.js (2)
 * attribution: fingerprint 2
 */
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { formatTokens } from "../utils/format.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

/**
 * 渲染一条 /context 优化建议：严重度图标、标题、可节省 token 数与说明。
 */
//@ chunk-10q8r8ck.js:16647-16988 fingerprint = _temp (0.831)
function renderContextSuggestion(suggestion, i) {
  return r(
    Box,
    {
      flexDirection: "column",
      marginTop: i === 0 ? 0 : 1,
      children: [
        r(Box, {
          children: [
            e(StatusIcon, { status: suggestion.severity, withSpace: !0 }),
            e(Text, { bold: !0, children: suggestion.title }),
            suggestion.savingsTokens
              ? r(Text, {
                  dimColor: !0,
                  children: [" ", re.arrowRight, " save ~", formatTokens(suggestion.savingsTokens)],
                })
              : null,
          ],
        }),
        e(Box, { marginLeft: 2, children: e(Text, { dimColor: !0, children: suggestion.detail }) }),
      ],
    },
    i,
  );
}
//@ chunk-10q8r8ck.js:16988-17306 fingerprint = ContextSuggestions (0.431)
function ContextSuggestions(t0) {
  let $ = w(5),
    { suggestions: suggestions } = t0;
  if (suggestions.length === 0) {
    return null;
  }
  let i;
  if ($[0] === MEMO_CACHE_SENTINEL) ((i = e(Text, { bold: !0, children: "Suggestions" })), ($[0] = i));
  else i = $[0];
  let l;
  if ($[1] !== suggestions)
    ((l = suggestions.map(renderContextSuggestion)), ($[1] = suggestions), ($[2] = l));
  else l = $[2];
  let u;
  if ($[3] !== l)
    ((u = r(Box, { flexDirection: "column", marginTop: 1, children: [i, l] })), ($[3] = l), ($[4] = u));
  else u = $[4];
  return u;
}

export { ContextSuggestions };
