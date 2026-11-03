/**
 * components/messages/AdvisorMessage.tsx
 *
 * Advisor（顾问模型）server_tool_use 的显示："Advising using <模型>"、拒绝或结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AdvisorMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../context/session.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { getErrorMessageIfRefusal } from "../../services/api/errors.js";
import { getAdvisorRefusalText } from "../../utils/advisor.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { claimOnceStore } from "../../services/api/verificationRequired.js";
import { logEvent } from "../../services/analytics/index.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-ah34pb7m.js:40534-43247 fingerprint = AdvisorMessage (0.614)
function AdvisorMessage(t0) {
  let $ = w(42),
    {
      block: block,
      addMargin: addMargin,
      resolvedToolUseIDs: resolvedToolUseIDs,
      erroredToolUseIDs: erroredToolUseIDs,
      shouldAnimate: shouldAnimate,
      verbose: verbose,
      advisorModel: advisorModel,
    } = t0,
    x = useHost();
  if (block.type === "server_tool_use") {
    let b;
    if ($[0] !== block.input)
      ((b = block.input && Object.keys(block.input).length > 0 ? jsonStringify(block.input) : null),
        ($[0] = block.input),
        ($[1] = b));
    else b = $[1];
    let E = b;
    const t2 = addMargin ? 1 : 0;
    let L;
    if ($[2] !== block.id || $[3] !== resolvedToolUseIDs)
      ((L = resolvedToolUseIDs.has(block.id)), ($[2] = block.id), ($[3] = resolvedToolUseIDs), ($[4] = L));
    else L = $[4];
    const t4 = !L;
    let W;
    if ($[5] !== block.id || $[6] !== erroredToolUseIDs)
      ((W = erroredToolUseIDs.has(block.id)), ($[5] = block.id), ($[6] = erroredToolUseIDs), ($[7] = W));
    else W = $[7];
    let U;
    if ($[8] !== shouldAnimate || $[9] !== t4 || $[10] !== W)
      ((U = e(ToolUseLoader, { shouldAnimate: shouldAnimate, isUnresolved: t4, isError: W })),
        ($[8] = shouldAnimate),
        ($[9] = t4),
        ($[10] = W),
        ($[11] = U));
    else U = $[11];
    let K;
    if ($[12] === MEMO_CACHE_SENTINEL) ((K = e(Text, { bold: !0, children: "Advising" })), ($[12] = K));
    else K = $[12];
    let V;
    if ($[13] !== advisorModel)
      ((V = advisorModel
        ? r(Text, { dimColor: !0, children: [" using ", renderModelName(advisorModel)] })
        : null),
        ($[13] = advisorModel),
        ($[14] = V));
    else V = $[14];
    let Y;
    if ($[15] !== E)
      ((Y = E ? r(Text, { dimColor: !0, children: [" \xB7 ", E] }) : null), ($[15] = E), ($[16] = Y));
    else Y = $[16];
    let X;
    if ($[17] !== t2 || $[18] !== U || $[19] !== V || $[20] !== Y)
      ((X = r(Box, { marginTop: t2, paddingRight: 2, flexDirection: "row", children: [U, K, V, Y] })),
        ($[17] = t2),
        ($[18] = U),
        ($[19] = V),
        ($[20] = Y),
        ($[21] = X));
    else X = $[21];
    return X;
  }
  let z;
  if (getErrorMessageIfRefusal(block)) {
    let b;
    if ($[22] !== block) ((b = getAdvisorRefusalText(block)), ($[22] = block), ($[23] = b));
    else b = $[23];
    let ee = b;
    let B;
    if ($[24] === MEMO_CACHE_SENTINEL)
      ((B = e(Text, { color: "warning", children: "Advisor declined to advise on this request" })),
        ($[24] = B));
    else B = $[24];
    let L;
    if ($[25] !== ee || $[26] !== verbose)
      ((L = ee !== void 0 && !verbose ? r(Fragment, { children: [" ", e(CtrlOToExpand, {})] }) : null),
        ($[25] = ee),
        ($[26] = verbose),
        ($[27] = L));
    else L = $[27];
    let N;
    if ($[28] !== L) ((N = r(Text, { children: [B, L] })), ($[28] = L), ($[29] = N));
    else N = $[29];
    let le = N;
    let W;
    if ($[30] !== le || $[31] !== ee || $[32] !== verbose)
      ((W =
        verbose && ee !== void 0
          ? r(Box, { flexDirection: "column", children: [le, e(Text, { dimColor: !0, children: ee })] })
          : le),
        ($[30] = le),
        ($[31] = ee),
        ($[32] = verbose),
        ($[33] = W));
    else W = $[33];
    z = W;
  } else {
    ge: switch (block.content?.type) {
      case "advisor_tool_result_error": {
        let b;
        if ($[34] !== block.content.error_code)
          ((b = r(Text, {
            color: "error",
            children: ["Advisor unavailable (", block.content.error_code, ")"],
          })),
            ($[34] = block.content.error_code),
            ($[35] = b));
        else b = $[35];
        z = b;
        break ge;
      }
      case "advisor_result": {
        let b;
        if ($[36] !== block.content || $[37] !== verbose)
          ((b = verbose
            ? e(Text, { dimColor: !0, children: block.content.text })
            : r(Text, {
                dimColor: !0,
                children: [
                  r(Text, { "aria-hidden": !0, children: [re.tick, " "] }),
                  "Advisor has reviewed the conversation and will apply the feedback ",
                  e(CtrlOToExpand, {}),
                ],
              })),
            ($[36] = block.content),
            ($[37] = verbose),
            ($[38] = b));
        else b = $[38];
        z = b;
        break ge;
      }
      case "advisor_redacted_result": {
        let b;
        if ($[39] === MEMO_CACHE_SENTINEL)
          ((b = r(Text, {
            dimColor: !0,
            children: [
              r(Text, { "aria-hidden": !0, children: [re.tick, " "] }),
              "Advisor has reviewed the conversation and will apply the feedback",
            ],
          })),
            ($[39] = b));
        else b = $[39];
        z = b;
        break ge;
      }
      default: {
        if (block.content != null && claimOnceStore.of(x).claim(`advisor-unknown:${block.tool_use_id}`))
          logEvent("tengu_advisor_unknown_content", {});
        return null;
      }
    }
  }
  let b;
  if ($[40] !== z)
    ((b = e(Box, { paddingRight: 2, children: e(MessageResponse, { children: z }) })),
      ($[40] = z),
      ($[41] = b));
  else b = $[41];
  return b;
}

export { AdvisorMessage };
