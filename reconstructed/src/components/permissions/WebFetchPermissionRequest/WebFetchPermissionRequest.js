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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { normalizeUrlHref } from "../permissionCardKinds.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Blockquote } from "../../Blockquote.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { WebFetchTool } from "../../../tools/WebFetchTool/WebFetchTool.js";

//@ chunk-18hwfzwa.js:1412972-1413264 placement
function webFetchChoiceToResult(h, payload, D) {
  switch (h) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
      };
    case "yes-dont-ask-again-domain":
      if (D === null || !isConsentRow(D))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: D.applies,
      };
    case "no":
      return {
        behavior: "deny",
      };
  }
}
//@ chunk-18hwfzwa.js:1413264-1413780 placement
/**
 * 生成 "不再询问该域名" 的 localSettings 规则建议行（domain:主机名）。
 */
function buildWebFetchDomainRule(payload) {
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [
          {
            toolName: payload.toolName,
            ruleContent: `domain:${payload.hostname}`,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: WEBFETCH_RULE_UPDATE_TYPES,
      renderLabel: (x) => {
        let D = x.length === 1 ? x[0] : undefined;
        if (
          D === undefined ||
          D.type !== "addRules" ||
          D.rules.length !== 1 ||
          D.rules[0]?.toolName !== payload.toolName ||
          D.rules[0]?.ruleContent !== `domain:${payload.hostname}`
        )
          return null;
        let L = plainDisplay(payload.hostname);
        if (L === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for ",
            jsxProd_default(Text, {
              bold: true,
              children: L.display,
            }),
          ],
        });
      },
    },
  );
}
//@ chunk-18hwfzwa.js:1413780-1413810 placement
var WEBFETCH_RULE_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-18hwfzwa.js:1413810-1414011 layout
function shouldOfferWebFetchDomainAllow(payload) {
  let decisionReason = payload.permissionResult.decisionReason;
  let D = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  return (
    payload.showAlwaysAllow &&
    !D &&
    !payload.isAskCappedByOrg &&
    payload.hostname !== "" &&
    !payload.hostname.includes("*")
  );
}
//@ chunk-18hwfzwa.js:1414011-1417159 fingerprint = WebFetchPermissionRequest (0.355)
/**
 * WebFetch 权限：显示 URL 与安全检查结果，选项允许一次 / 不再询问该域名（domain: 规则）/ 拒绝并反馈。
 */
function WebFetchPermissionRequest(props) {
  let $ = w(57);
  let { payload, answer } = props;
  let ee;
  if ($[0] !== payload.input.url) {
    ee = typeof payload.input.url === "string" ? normalizeUrlHref(payload.input.url) : payload.input.url;
    $[0] = payload.input.url;
    $[1] = ee;
  } else ee = $[1];
  let ke;
  if ($[2] !== ee) {
    ke = serializeApprovalPayload(ee, {
      maxUnits: MAX_PAYLOAD_UNITS,
    });
    $[2] = ee;
    $[3] = ke;
  } else ke = $[3];
  let Re = ke;
  let Be = Re.kind === "withheld";
  let He;
  if ($[4] !== payload.input.prompt) {
    He = displayField(payload.input.prompt);
    $[4] = payload.input.prompt;
    $[5] = He;
  } else He = $[5];
  let We = He;
  let ze;
  if ($[6] !== payload || $[7] !== Be) {
    ze = shouldOfferWebFetchDomainAllow(payload) && !Be ? buildWebFetchDomainRule(payload) : null;
    $[6] = payload;
    $[7] = Be;
    $[8] = ze;
  } else ze = $[8];
  let Xe = ze;
  let rt;
  if ($[9] !== answer || $[10] !== Xe || $[11] !== payload) {
    rt = (kt) => answer(webFetchChoiceToResult(kt, payload, Xe));
    $[9] = answer;
    $[10] = Xe;
    $[11] = payload;
    $[12] = rt;
  } else rt = $[12];
  let onChange = rt;
  let It;
  if ($[13] !== answer) {
    It = () => {
      answer({
        behavior: "cancelled",
      });
    };
    $[13] = answer;
    $[14] = It;
  } else It = $[14];
  let onCancel = It;
  let Et = payload.permissionResult.inPlaceOfClassifier === true;
  let Dt;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    Dt = {
      label: jsxProd_default_2(Text, {
        children: [
          "No, and tell Claude what to do differently ",
          jsxProd_default(Text, {
            bold: true,
            children: "(esc)",
          }),
        ],
      }),
      value: "no",
    };
    $[15] = Dt;
  } else Dt = $[15];
  let Lt = Dt;
  let oo;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    oo = {
      label: "Yes",
      value: "yes",
    };
    $[16] = oo;
  } else oo = $[16];
  let Xt = oo;
  let io;
  if ($[17] !== Xe || $[18] !== Et) {
    io = Et ? [Lt, Xt] : [Xt];
    if (Xe !== null) {
      let so;
      if ($[20] !== Xe.node) {
        so = {
          label: Xe.node,
          value: "yes-dont-ask-again-domain",
        };
        $[20] = Xe.node;
        $[21] = so;
      } else so = $[21];
      io.push(so);
    }
    if (!Et) io.push(Lt);
    $[17] = Xe;
    $[18] = Et;
    $[19] = io;
  } else io = $[19];
  let options = io;
  const requestSource = payload.requestSource;
  let multiline;
  if ($[22] !== payload.description) {
    multiline = needsGutter(payload.description);
    $[22] = payload.description;
    $[23] = multiline;
  } else multiline = $[23];
  let children;
  if ($[24] !== payload.description) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: payload.description,
    });
    $[24] = payload.description;
    $[25] = children;
  } else children = $[25];
  let bo;
  if ($[26] !== multiline || $[27] !== children) {
    bo = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: jsxProd_default(Blockquote, {
        multiline,
        children,
      }),
    });
    $[26] = multiline;
    $[27] = children;
    $[28] = bo;
  } else bo = $[28];
  let Ao;
  if ($[29] !== Re.kind || $[30] !== Re.marker || $[31] !== Re.needsGutter || $[32] !== Re.text) {
    Ao =
      Re.kind === "full"
        ? jsxProd_default(Blockquote, {
            multiline: Re.needsGutter,
            children: jsxProd_default_2(Text, {
              children: ["url: ", Re.text],
            }),
          })
        : jsxProd_default(Text, {
            dimColor: true,
            children: Re.marker,
          });
    $[29] = Re.kind;
    $[30] = Re.marker;
    $[31] = Re.needsGutter;
    $[32] = Re.text;
    $[33] = Ao;
  } else Ao = $[33];
  let Bo;
  if ($[34] !== We.needsGutter || $[35] !== We.text) {
    Bo =
      We.text !== ""
        ? jsxProd_default(Blockquote, {
            multiline: We.needsGutter,
            children: jsxProd_default_2(Text, {
              children: ["prompt: ", We.text],
            }),
          })
        : null;
    $[34] = We.needsGutter;
    $[35] = We.text;
    $[36] = Bo;
  } else Bo = $[36];
  let Ro;
  if ($[37] !== Ao || $[38] !== Bo) {
    Ro = jsxProd_default_2(DiffFrame, {
      children: [Ao, Bo],
    });
    $[37] = Ao;
    $[38] = Bo;
    $[39] = Ro;
  } else Ro = $[39];
  const rowBudget = Et ? MAX_EXPLANATION_LINES : undefined;
  let Io;
  if ($[40] !== payload.permissionResult || $[41] !== rowBudget) {
    Io = jsxProd_default(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: "tool",
      rowBudget,
    });
    $[40] = payload.permissionResult;
    $[41] = rowBudget;
    $[42] = Io;
  } else Io = $[42];
  let Wo;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    Wo = jsxProd_default(Text, {
      children: "Do you want to allow Claude to fetch this content?",
    });
    $[43] = Wo;
  } else Wo = $[43];
  let mn;
  if ($[44] !== onCancel || $[45] !== onChange || $[46] !== Et || $[47] !== options) {
    mn = jsxProd_default(ModelSelector, {
      hideIndexes: Et,
      selectedValue: NO_COMMITTED_ROW,
      options,
      onChange,
      onCancel,
    });
    $[44] = onCancel;
    $[45] = onChange;
    $[46] = Et;
    $[47] = options;
    $[48] = mn;
  } else mn = $[48];
  let Cn;
  if ($[49] !== Io || $[50] !== mn) {
    Cn = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [Io, Wo, mn],
    });
    $[49] = Io;
    $[50] = mn;
    $[51] = Cn;
  } else Cn = $[51];
  let No;
  if ($[52] !== payload.requestSource || $[53] !== bo || $[54] !== Ro || $[55] !== Cn) {
    No = jsxProd_default_2(PermissionDialog_2, {
      title: "Fetch",
      innerPaddingX: 0,
      requestSource,
      children: [bo, Ro, Cn],
    });
    $[52] = payload.requestSource;
    $[53] = bo;
    $[54] = Ro;
    $[55] = Cn;
    $[56] = No;
  } else No = $[56];
  return No;
}
//@ chunk-e6aww6q8.js:2182965-2183156 fingerprint = inputToPermissionRuleContent (1)
function inputToPermissionRuleContent(input) {
  try {
    let parsedInput = WebFetchTool.inputSchema.safeParse(input);
    if (!parsedInput.success) return `input:${input.toString()}`;
    let { url } = parsedInput.data;
    return `domain:${new URL(url).hostname}`;
  } catch {
    return `input:${input.toString()}`;
  }
}
export { WebFetchPermissionRequest, inputToPermissionRuleContent };
