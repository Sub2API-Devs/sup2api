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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { formatTokens } from "../utils/format.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-10q8r8ck.js:16647-16988 fingerprint = _temp (0.831)
/**
 * 渲染一条 /context 优化建议：严重度图标、标题、可节省 token 数与说明。
 */
function renderContextSuggestion(suggestion, i) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      marginTop: i === 0 ? 0 : 1,
      children: [
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(StatusIcon, {
              status: suggestion.severity,
              withSpace: true,
            }),
            jsxProd_default(Text, {
              bold: true,
              children: suggestion.title,
            }),
            suggestion.savingsTokens
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    " ",
                    figures_default.arrowRight,
                    " save ~",
                    formatTokens(suggestion.savingsTokens),
                  ],
                })
              : null,
          ],
        }),
        jsxProd_default(Box, {
          marginLeft: 2,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: suggestion.detail,
          }),
        }),
      ],
    },
    i,
  );
}
//@ chunk-10q8r8ck.js:16988-17306 fingerprint = ContextSuggestions (0.431)
function ContextSuggestions(props) {
  let $ = w(5);
  let { suggestions } = props;
  if (suggestions.length === 0) {
    return null;
  }
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      bold: true,
      children: "Suggestions",
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== suggestions) {
    t2 = suggestions.map(renderContextSuggestion);
    $[1] = suggestions;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== t2) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [t1, t2],
    });
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
export { ContextSuggestions };
