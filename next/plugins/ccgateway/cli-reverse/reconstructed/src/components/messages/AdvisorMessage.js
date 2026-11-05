/**
 * components/messages/AdvisorMessage.tsx
 *
 * Advisor（顾问模型）server_tool_use 的显示："Advising using <模型>"、拒绝或结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AdvisorMessage.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../context/session.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { getErrorMessageIfRefusal } from "../../services/api/errors.js";
import { getAdvisorRefusalText } from "../../utils/advisor.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { claimOnceStore } from "../../services/api/verificationRequired.js";
import { logEvent } from "../../services/analytics/index.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-wjygkcr4.js:41145-43856 fingerprint (2.1.88 match: AdvisorMessage, 0.614)
function AdvisorMessage(props) {
  let $ = useMemoCache(42);
  let { block, addMargin, resolvedToolUseIDs, erroredToolUseIDs, shouldAnimate, verbose, advisorModel } =
    props;
  let host = useHost();
  if (block.type === "server_tool_use") {
    let t1;
    if ($[0] !== block.input) {
      t1 = block.input && Object.keys(block.input).length > 0 ? jsonStringify(block.input) : null;
      $[0] = block.input;
      $[1] = t1;
    } else t1 = $[1];
    let input = t1;
    const marginTop = addMargin ? 1 : 0;
    let t3;
    if ($[2] !== block.id || $[3] !== resolvedToolUseIDs) {
      t3 = resolvedToolUseIDs.has(block.id);
      $[2] = block.id;
      $[3] = resolvedToolUseIDs;
      $[4] = t3;
    } else t3 = $[4];
    const isUnresolved = !t3;
    let isError;
    if ($[5] !== block.id || $[6] !== erroredToolUseIDs) {
      isError = erroredToolUseIDs.has(block.id);
      $[5] = block.id;
      $[6] = erroredToolUseIDs;
      $[7] = isError;
    } else isError = $[7];
    let t6;
    if ($[8] !== shouldAnimate || $[9] !== isUnresolved || $[10] !== isError) {
      t6 = jsxProd_default(ToolUseLoader, {
        shouldAnimate,
        isUnresolved,
        isError,
      });
      $[8] = shouldAnimate;
      $[9] = isUnresolved;
      $[10] = isError;
      $[11] = t6;
    } else t6 = $[11];
    let t7;
    if ($[12] === MEMO_CACHE_SENTINEL) {
      t7 = jsxProd_default(Text, {
        bold: true,
        children: "Advising",
      });
      $[12] = t7;
    } else t7 = $[12];
    let t8;
    if ($[13] !== advisorModel) {
      t8 = advisorModel
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" using ", renderModelName(advisorModel)],
          })
        : null;
      $[13] = advisorModel;
      $[14] = t8;
    } else t8 = $[14];
    let t9;
    if ($[15] !== input) {
      t9 = input
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" \xB7 ", input],
          })
        : null;
      $[15] = input;
      $[16] = t9;
    } else t9 = $[16];
    let t10;
    if ($[17] !== marginTop || $[18] !== t6 || $[19] !== t8 || $[20] !== t9) {
      t10 = jsxProd_default_2(Box, {
        marginTop,
        paddingRight: 2,
        flexDirection: "row",
        children: [t6, t7, t8, t9],
      });
      $[17] = marginTop;
      $[18] = t6;
      $[19] = t8;
      $[20] = t9;
      $[21] = t10;
    } else t10 = $[21];
    return t10;
  }
  let body;
  if (getErrorMessageIfRefusal(block)) {
    let refusalText;
    if ($[22] !== block) {
      refusalText = getAdvisorRefusalText(block);
      $[22] = block;
      $[23] = refusalText;
    } else refusalText = $[23];
    let refusalDetail = refusalText;
    let warningText;
    if ($[24] === MEMO_CACHE_SENTINEL) {
      warningText = jsxProd_default(Text, {
        color: "warning",
        children: "Advisor declined to advise on this request",
      });
      $[24] = warningText;
    } else warningText = $[24];
    let expandHint;
    if ($[25] !== refusalDetail || $[26] !== verbose) {
      expandHint =
        refusalDetail !== undefined && !verbose
          ? jsxProd_default_2(Fragment, {
              children: [" ", jsxProd_default(CtrlOToExpand, {})],
            })
          : null;
      $[25] = refusalDetail;
      $[26] = verbose;
      $[27] = expandHint;
    } else expandHint = $[27];
    let summaryLine;
    if ($[28] !== expandHint) {
      summaryLine = jsxProd_default_2(Text, {
        children: [warningText, expandHint],
      });
      $[28] = expandHint;
      $[29] = summaryLine;
    } else summaryLine = $[29];
    let summaryText = summaryLine;
    let refusalBody;
    if ($[30] !== summaryText || $[31] !== refusalDetail || $[32] !== verbose) {
      refusalBody =
        verbose && refusalDetail !== undefined
          ? jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                summaryText,
                jsxProd_default(Text, {
                  dimColor: true,
                  children: refusalDetail,
                }),
              ],
            })
          : summaryText;
      $[30] = summaryText;
      $[31] = refusalDetail;
      $[32] = verbose;
      $[33] = refusalBody;
    } else refusalBody = $[33];
    body = refusalBody;
  } else {
    ce: switch (block.content?.type) {
      case "advisor_tool_result_error": {
        let t1;
        if ($[34] !== block.content.error_code) {
          t1 = jsxProd_default_2(Text, {
            color: "error",
            children: ["Advisor unavailable (", block.content.error_code, ")"],
          });
          $[34] = block.content.error_code;
          $[35] = t1;
        } else t1 = $[35];
        body = t1;
        break ce;
      }
      case "advisor_result": {
        let t1;
        if ($[36] !== block.content || $[37] !== verbose) {
          t1 = verbose
            ? jsxProd_default(Text, {
                dimColor: true,
                children: block.content.text,
              })
            : jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  jsxProd_default_2(Text, {
                    "aria-hidden": true,
                    children: [figures_default.tick, " "],
                  }),
                  "Advisor has reviewed the conversation and will apply the feedback ",
                  jsxProd_default(CtrlOToExpand, {}),
                ],
              });
          $[36] = block.content;
          $[37] = verbose;
          $[38] = t1;
        } else t1 = $[38];
        body = t1;
        break ce;
      }
      case "advisor_redacted_result": {
        let redactedText;
        if ($[39] === MEMO_CACHE_SENTINEL) {
          redactedText = jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              jsxProd_default_2(Text, {
                "aria-hidden": true,
                children: [figures_default.tick, " "],
              }),
              "Advisor has reviewed the conversation and will apply the feedback",
            ],
          });
          $[39] = redactedText;
        } else redactedText = $[39];
        body = redactedText;
        break ce;
      }
      default: {
        if (block.content != null && claimOnceStore.of(host).claim(`advisor-unknown:${block.tool_use_id}`))
          logEvent("tengu_advisor_unknown_content", {});
        return null;
      }
    }
  }
  let t1;
  if ($[40] !== body) {
    t1 = jsxProd_default(Box, {
      paddingRight: 2,
      children: jsxProd_default(MessageResponse, {
        children: body,
      }),
    });
    $[40] = body;
    $[41] = t1;
  } else t1 = $[41];
  return t1;
}
export { AdvisorMessage };
