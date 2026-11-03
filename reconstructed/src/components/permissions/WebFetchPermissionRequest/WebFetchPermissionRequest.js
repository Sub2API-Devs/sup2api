/**
 * components/permissions/WebFetchPermissionRequest/WebFetchPermissionRequest.tsx
 *
 * WebFetch 权限请求：URL、安全检查，"允许并不再询问该域名"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/WebFetchPermissionRequest/WebFetchPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (5), chunk-e6aww6q8.js (1)
 * attribution: placement 3, layout 1, fingerprint 2
 */
import { isConsentRow, parseConsentSuggestions } from "../consentRows.js";
import {
  plainDisplay,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  displayField,
  needsGutter,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { v$t } from "../permissionCardKinds.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Blockquote } from "../../Blockquote.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { WebFetchTool } from "../../../tools/WebFetchTool/WebFetchTool.js";

//@ chunk-18hwfzwa.js:1412972-1413264 placement
function webFetchChoiceToResult(h, x, D) {
  switch (h) {
    case "yes":
      return { behavior: "allow", updatedInput: x.input };
    case "yes-dont-ask-again-domain":
      if (D === null || !isConsentRow(D)) return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: D.applies };
    case "no":
      return { behavior: "deny" };
  }
}
/**
 * 生成 "不再询问该域名" 的 localSettings 规则建议行（domain:主机名）。
 */
//@ chunk-18hwfzwa.js:1413264-1413780 placement
function buildWebFetchDomainRule(h) {
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [{ toolName: h.toolName, ruleContent: `domain:${h.hostname}` }],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: T0o,
      renderLabel: (x) => {
        let D = x.length === 1 ? x[0] : void 0;
        if (
          D === void 0 ||
          D.type !== "addRules" ||
          D.rules.length !== 1 ||
          D.rules[0]?.toolName !== h.toolName ||
          D.rules[0]?.ruleContent !== `domain:${h.hostname}`
        )
          return null;
        let L = plainDisplay(h.hostname);
        if (L === null) return null;
        return r(Text, {
          children: ["Yes, and don't ask again for ", e(Text, { bold: !0, children: L.display })],
        });
      },
    },
  );
}
//@ chunk-18hwfzwa.js:1413780-1413810 placement
var T0o = new Set(["addRules"]);
//@ chunk-18hwfzwa.js:1413810-1414011 layout
function shouldOfferWebFetchDomainAllow(h) {
  let decisionReason = h.permissionResult.decisionReason,
    D = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  return h.showAlwaysAllow && !D && !h.isAskCappedByOrg && h.hostname !== "" && !h.hostname.includes("*");
}
/**
 * WebFetch 权限：显示 URL 与安全检查结果，选项允许一次 / 不再询问该域名（domain: 规则）/ 拒绝并反馈。
 */
//@ chunk-18hwfzwa.js:1414011-1417159 fingerprint = WebFetchPermissionRequest (0.355)
function WebFetchPermissionRequest(t0) {
  let $ = w(57),
    { payload: payload, answer: answer } = t0,
    ee;
  if ($[0] !== payload.input.url)
    ((ee = typeof payload.input.url === "string" ? v$t(payload.input.url) : payload.input.url),
      ($[0] = payload.input.url),
      ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] !== ee)
    ((ke = serializeApprovalPayload(ee, { maxUnits: MAX_PAYLOAD_UNITS })), ($[2] = ee), ($[3] = ke));
  else ke = $[3];
  let Re = ke,
    Be = Re.kind === "withheld",
    He;
  if ($[4] !== payload.input.prompt)
    ((He = displayField(payload.input.prompt)), ($[4] = payload.input.prompt), ($[5] = He));
  else He = $[5];
  let We = He,
    ze;
  if ($[6] !== payload || $[7] !== Be)
    ((ze = shouldOfferWebFetchDomainAllow(payload) && !Be ? buildWebFetchDomainRule(payload) : null),
      ($[6] = payload),
      ($[7] = Be),
      ($[8] = ze));
  else ze = $[8];
  let Xe = ze,
    rt;
  if ($[9] !== answer || $[10] !== Xe || $[11] !== payload)
    ((rt = (kt) => answer(webFetchChoiceToResult(kt, payload, Xe))),
      ($[9] = answer),
      ($[10] = Xe),
      ($[11] = payload),
      ($[12] = rt));
  else rt = $[12];
  let At = rt,
    It;
  if ($[13] !== answer)
    ((It = () => {
      answer({ behavior: "cancelled" });
    }),
      ($[13] = answer),
      ($[14] = It));
  else It = $[14];
  let Ot = It,
    Et = payload.permissionResult.inPlaceOfClassifier === !0,
    Dt;
  if ($[15] === MEMO_CACHE_SENTINEL)
    ((Dt = {
      label: r(Text, {
        children: ["No, and tell Claude what to do differently ", e(Text, { bold: !0, children: "(esc)" })],
      }),
      value: "no",
    }),
      ($[15] = Dt));
  else Dt = $[15];
  let Lt = Dt,
    oo;
  if ($[16] === MEMO_CACHE_SENTINEL) ((oo = { label: "Yes", value: "yes" }), ($[16] = oo));
  else oo = $[16];
  let Xt = oo,
    io;
  if ($[17] !== Xe || $[18] !== Et) {
    io = Et ? [Lt, Xt] : [Xt];
    if (Xe !== null) {
      let so;
      if ($[20] !== Xe.node)
        ((so = { label: Xe.node, value: "yes-dont-ask-again-domain" }), ($[20] = Xe.node), ($[21] = so));
      else so = $[21];
      io.push(so);
    }
    if (!Et) io.push(Lt);
    (($[17] = Xe), ($[18] = Et), ($[19] = io));
  } else io = $[19];
  let po = io;
  const requestSource = payload.requestSource;
  let ao;
  if ($[22] !== payload.description)
    ((ao = needsGutter(payload.description)), ($[22] = payload.description), ($[23] = ao));
  else ao = $[23];
  let co;
  if ($[24] !== payload.description)
    ((co = e(Text, { dimColor: !0, children: payload.description })),
      ($[24] = payload.description),
      ($[25] = co));
  else co = $[25];
  let bo;
  if ($[26] !== ao || $[27] !== co)
    ((bo = e(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: e(Blockquote, { multiline: ao, children: co }),
    })),
      ($[26] = ao),
      ($[27] = co),
      ($[28] = bo));
  else bo = $[28];
  let Ao;
  if ($[29] !== Re.kind || $[30] !== Re.marker || $[31] !== Re.needsGutter || $[32] !== Re.text)
    ((Ao =
      Re.kind === "full"
        ? e(Blockquote, { multiline: Re.needsGutter, children: r(Text, { children: ["url: ", Re.text] }) })
        : e(Text, { dimColor: !0, children: Re.marker })),
      ($[29] = Re.kind),
      ($[30] = Re.marker),
      ($[31] = Re.needsGutter),
      ($[32] = Re.text),
      ($[33] = Ao));
  else Ao = $[33];
  let Bo;
  if ($[34] !== We.needsGutter || $[35] !== We.text)
    ((Bo =
      We.text !== ""
        ? e(Blockquote, { multiline: We.needsGutter, children: r(Text, { children: ["prompt: ", We.text] }) })
        : null),
      ($[34] = We.needsGutter),
      ($[35] = We.text),
      ($[36] = Bo));
  else Bo = $[36];
  let Ro;
  if ($[37] !== Ao || $[38] !== Bo)
    ((Ro = r(DiffFrame, { children: [Ao, Bo] })), ($[37] = Ao), ($[38] = Bo), ($[39] = Ro));
  else Ro = $[39];
  const Ho = Et ? MAX_EXPLANATION_LINES : void 0;
  let Io;
  if ($[40] !== payload.permissionResult || $[41] !== Ho)
    ((Io = e(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: "tool",
      rowBudget: Ho,
    })),
      ($[40] = payload.permissionResult),
      ($[41] = Ho),
      ($[42] = Io));
  else Io = $[42];
  let Wo;
  if ($[43] === MEMO_CACHE_SENTINEL)
    ((Wo = e(Text, { children: "Do you want to allow Claude to fetch this content?" })), ($[43] = Wo));
  else Wo = $[43];
  let mn;
  if ($[44] !== Ot || $[45] !== At || $[46] !== Et || $[47] !== po)
    ((mn = e(ModelSelector, {
      hideIndexes: Et,
      selectedValue: NO_COMMITTED_ROW,
      options: po,
      onChange: At,
      onCancel: Ot,
    })),
      ($[44] = Ot),
      ($[45] = At),
      ($[46] = Et),
      ($[47] = po),
      ($[48] = mn));
  else mn = $[48];
  let Cn;
  if ($[49] !== Io || $[50] !== mn)
    ((Cn = r(Box, { flexDirection: "column", paddingX: 1, children: [Io, Wo, mn] })),
      ($[49] = Io),
      ($[50] = mn),
      ($[51] = Cn));
  else Cn = $[51];
  let No;
  if ($[52] !== payload.requestSource || $[53] !== bo || $[54] !== Ro || $[55] !== Cn)
    ((No = r(PermissionDialog_2, {
      title: "Fetch",
      innerPaddingX: 0,
      requestSource: requestSource,
      children: [bo, Ro, Cn],
    })),
      ($[52] = payload.requestSource),
      ($[53] = bo),
      ($[54] = Ro),
      ($[55] = Cn),
      ($[56] = No));
  else No = $[56];
  return No;
}
//@ chunk-e6aww6q8.js:2182965-2183156 fingerprint = inputToPermissionRuleContent (1)
function inputToPermissionRuleContent(input) {
  try {
    let parsedInput = WebFetchTool.inputSchema.safeParse(input);
    if (!parsedInput.success) return `input:${input.toString()}`;
    let { url: url } = parsedInput.data;
    return `domain:${new URL(url).hostname}`;
  } catch {
    return `input:${input.toString()}`;
  }
}

export { WebFetchPermissionRequest, inputToPermissionRuleContent };
