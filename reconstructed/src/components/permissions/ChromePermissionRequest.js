/**
 * components/permissions/ChromePermissionRequest.tsx
 *
 * 2.1.316 新增。Claude in Chrome 权限请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { isConsentRow, parseConsentSuggestions } from "./consentRows.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL } from "../../utils/claudeInChrome/common.js";
import {
  plainDisplay,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  displayField,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { describeAutoModeGrantBlock } from "./permissionCardKinds.js";
import { PermissionRuleExplanation } from "./PermissionRuleExplanation.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";

//@ chunk-18hwfzwa.js:1333385-1333389 placement
init_react_production();
//@ chunk-18hwfzwa.js:1333389-1333672 placement
function chromeChoiceToResult(h, payload, D) {
  switch (h) {
    case "allow":
      return {
        behavior: "allow",
        updatedInput: payload.input,
      };
    case "allow-domain":
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
    case "deny":
      return {
        behavior: "deny",
      };
  }
}
//@ chunk-18hwfzwa.js:1333672-1334160 placement
/**
 * 生成 "本会话允许该站点所有操作" 的建议行（会话级 addRules），站点名不可安全显示时返回 null。
 */
function buildChromeDomainSuggestion(chrome) {
  if (!chrome) return null;
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [
          {
            toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
            ruleContent: chrome.host,
          },
        ],
        behavior: "allow",
        destination: "session",
      },
    ],
    {
      displayedTypes: CHROME_RULE_UPDATE_TYPES,
      renderLabel: (x) => {
        let D = x.length === 1 ? x[0] : undefined;
        if (
          D === undefined ||
          D.type !== "addRules" ||
          D.rules.length !== 1 ||
          D.rules[0]?.toolName !== CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL ||
          D.rules[0]?.ruleContent !== chrome.host
        )
          return null;
        let L = plainDisplay(chrome.host);
        if (L === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Allow all actions on ",
            jsxProd_default(Text, {
              bold: true,
              children: L.display,
            }),
            " for this session",
          ],
        });
      },
    },
  );
}
//@ chunk-18hwfzwa.js:1334160-1334190 placement
var CHROME_RULE_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-18hwfzwa.js:1334190-1334466 placement
function shouldOfferChromeDomainAllow(payload) {
  let decisionReason =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.decisionReason : undefined;
  if (decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable) return false;
  if (payload.domainAllowed) return false;
  return (
    payload.showAlwaysAllow &&
    !payload.isAskCappedByOrg &&
    !!payload.chrome &&
    !payload.chrome.host.includes("*")
  );
}
//@ chunk-18hwfzwa.js:1334466-1337112 placement
function ChromePermissionRequest(props) {
  let $ = w(44);
  let { payload, answer } = props;
  let { verbPhrase, chrome } = payload;
  let Re;
  if ($[0] !== chrome) {
    Re = chrome
      ? serializeApprovalPayload(chrome.url, {
          maxUnits: MAX_PAYLOAD_UNITS,
        })
      : null;
    $[0] = chrome;
    $[1] = Re;
  } else Re = $[1];
  let Be = Re;
  let He = Be !== null && Be.kind === "withheld";
  let We;
  if ($[2] !== chrome || $[3] !== payload || $[4] !== He) {
    We = shouldOfferChromeDomainAllow(payload) && !He ? buildChromeDomainSuggestion(chrome) : null;
    $[2] = chrome;
    $[3] = payload;
    $[4] = He;
    $[5] = We;
  } else We = $[5];
  let ze = We;
  let Xe;
  if ($[6] !== answer || $[7] !== ze || $[8] !== payload) {
    Xe = (rt) => answer(chromeChoiceToResult(rt, payload, ze));
    $[6] = answer;
    $[7] = ze;
    $[8] = payload;
    $[9] = Xe;
  } else Xe = $[9];
  let onChange = Xe;
  let At;
  if ($[10] !== answer) {
    At = () => {
      answer({
        behavior: "cancelled",
      });
    };
    $[10] = answer;
    $[11] = At;
  } else At = $[11];
  let onCancel = At;
  let Ot;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    Ot = {
      label: "Allow",
      value: "allow",
    };
    $[12] = Ot;
  } else Ot = $[12];
  let Et;
  if ($[13] !== ze) {
    let Dt = [Ot];
    if (ze !== null) {
      let Lt;
      if ($[15] !== ze.node) {
        Lt = {
          label: ze.node,
          value: "allow-domain",
        };
        $[15] = ze.node;
        $[16] = Lt;
      } else Lt = $[16];
      Dt.push(Lt);
    }
    Et =
      (Dt.push({
        label: jsxProd_default_2(Text, {
          children: [
            "Deny ",
            jsxProd_default(Text, {
              bold: true,
              children: "(esc)",
            }),
          ],
        }),
        value: "deny",
      }),
      Dt);
    $[13] = ze;
    $[14] = Et;
  } else Et = $[14];
  let options = Et;
  let Lt;
  let Xt;
  if ($[17] !== chrome || $[18] !== payload.grantNotice) {
    Xt = chrome ? plainDisplay(chrome.host) : null;
    Lt =
      payload.grantNotice !== undefined && Xt !== null
        ? displayField(describeAutoModeGrantBlock(payload.grantNotice, Xt.display)).text
        : null;
    $[17] = chrome;
    $[18] = payload.grantNotice;
    $[19] = Lt;
    $[20] = Xt;
  } else {
    Lt = $[19];
    Xt = $[20];
  }
  let io = Lt;
  const title =
    Xt !== null
      ? `Claude in Chrome wants to ${verbPhrase} on ${Xt.display}`
      : `Claude in Chrome wants to ${verbPhrase}`;
  let po;
  if ($[21] !== payload.permissionResult) {
    po =
      payload.permissionResult.denialLimitFallback !== undefined &&
      jsxProd_default(Box, {
        paddingX: 1,
        marginTop: 1,
        children: jsxProd_default(PermissionRuleExplanation, {
          permissionResult: payload.permissionResult,
          toolType: "tool",
        }),
      });
    $[21] = payload.permissionResult;
    $[22] = po;
  } else po = $[22];
  let ao;
  if ($[23] !== io) {
    ao =
      io !== null &&
      jsxProd_default(Box, {
        paddingX: 1,
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: io,
        }),
      });
    $[23] = io;
    $[24] = ao;
  } else ao = $[24];
  let co;
  if ($[25] !== chrome || $[26] !== Be) {
    co =
      chrome && Be !== null
        ? jsxProd_default(DiffFrame, {
            children:
              Be.kind === "withheld"
                ? jsxProd_default(Text, {
                    dimColor: true,
                    children: Be.marker,
                  })
                : jsxProd_default(Blockquote, {
                    multiline: Be.needsGutter,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: Be.text,
                    }),
                  }),
          })
        : null;
    $[25] = chrome;
    $[26] = Be;
    $[27] = co;
  } else co = $[27];
  const marginTop = chrome && Be !== null ? 0 : 1;
  let children;
  if ($[28] !== onCancel || $[29] !== onChange || $[30] !== options) {
    children = jsxProd_default(ModelSelector, {
      selectedValue: NO_COMMITTED_ROW,
      options,
      onChange,
      onCancel,
    });
    $[28] = onCancel;
    $[29] = onChange;
    $[30] = options;
    $[31] = children;
  } else children = $[31];
  let Bo;
  if ($[32] !== marginTop || $[33] !== children) {
    Bo = jsxProd_default(Box, {
      paddingX: 1,
      marginTop,
      children,
    });
    $[32] = marginTop;
    $[33] = children;
    $[34] = Bo;
  } else Bo = $[34];
  let children_2;
  if ($[35] !== ao || $[36] !== co || $[37] !== Bo || $[38] !== po) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingBottom: 1,
      children: [po, ao, co, Bo],
    });
    $[35] = ao;
    $[36] = co;
    $[37] = Bo;
    $[38] = po;
    $[39] = children_2;
  } else children_2 = $[39];
  let Ho;
  if ($[40] !== payload.requestSource || $[41] !== children_2 || $[42] !== title) {
    Ho = jsxProd_default(PermissionDialog_2, {
      title,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: children_2,
    });
    $[40] = payload.requestSource;
    $[41] = children_2;
    $[42] = title;
    $[43] = Ho;
  } else Ho = $[43];
  return Ho;
}
//@ chunk-18hwfzwa.js:1337112-1337116 placement
init_react_production();
export { ChromePermissionRequest };
