/**
 * components/permissions/ChromePermissionRequest.tsx
 *
 * 2.1.316 新增。Claude in Chrome 权限请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { describeAutoModeGrantBlock } from "./permissionCardKinds.js";
import { PermissionRuleExplanation } from "./PermissionRuleExplanation.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1347824-1347828 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1347824", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1355706-1355710 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1355706", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1355710-1355993 placement
function chromeChoiceToResult(choice, payload, selectedRow) {
  switch (choice) {
    case "allow":
      return {
        behavior: "allow",
        updatedInput: payload.input,
      };
    case "allow-domain":
      if (selectedRow === null || !isConsentRow(selectedRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: selectedRow.applies,
      };
    case "deny":
      return {
        behavior: "deny",
      };
  }
}
//@ chunk-czq1j3j2.js:1355993-1356481 placement
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
      renderLabel: (updates) => {
        let update = updates.length === 1 ? updates[0] : undefined;
        if (
          update === undefined ||
          update.type !== "addRules" ||
          update.rules.length !== 1 ||
          update.rules[0]?.toolName !== CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL ||
          update.rules[0]?.ruleContent !== chrome.host
        )
          return null;
        let hostDisplay = plainDisplay(chrome.host);
        if (hostDisplay === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Allow all actions on ",
            jsxProd_default(Text, {
              bold: true,
              children: hostDisplay.display,
            }),
            " for this session",
          ],
        });
      },
    },
  );
}
//@ chunk-czq1j3j2.js:1356481-1356511 placement
var CHROME_RULE_UPDATE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1356481", () => {
  CHROME_RULE_UPDATE_TYPES = new Set(["addRules"]);
});
//@ chunk-czq1j3j2.js:1356511-1356787 placement
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
//@ chunk-czq1j3j2.js:1356787-1359433 placement
function ChromePermissionRequest(props) {
  let $ = useMemoCache(44);
  let { payload, answer } = props;
  let { verbPhrase, chrome } = payload;
  let serializedUrl;
  if ($[0] !== chrome) {
    serializedUrl = chrome
      ? serializeApprovalPayload(chrome.url, {
          maxUnits: MAX_PAYLOAD_UNITS,
        })
      : null;
    $[0] = chrome;
    $[1] = serializedUrl;
  } else serializedUrl = $[1];
  let serializedUrl_2 = serializedUrl;
  let isUrlWithheld = serializedUrl_2 !== null && serializedUrl_2.kind === "withheld";
  let domainSuggestion;
  if ($[2] !== chrome || $[3] !== payload || $[4] !== isUrlWithheld) {
    domainSuggestion =
      shouldOfferChromeDomainAllow(payload) && !isUrlWithheld ? buildChromeDomainSuggestion(chrome) : null;
    $[2] = chrome;
    $[3] = payload;
    $[4] = isUrlWithheld;
    $[5] = domainSuggestion;
  } else domainSuggestion = $[5];
  let domainSuggestion_2 = domainSuggestion;
  let onChange;
  if ($[6] !== answer || $[7] !== domainSuggestion_2 || $[8] !== payload) {
    onChange = (choice) => answer(chromeChoiceToResult(choice, payload, domainSuggestion_2));
    $[6] = answer;
    $[7] = domainSuggestion_2;
    $[8] = payload;
    $[9] = onChange;
  } else onChange = $[9];
  let onChange_2 = onChange;
  let onCancel;
  if ($[10] !== answer) {
    onCancel = () => {
      answer({
        behavior: "cancelled",
      });
    };
    $[10] = answer;
    $[11] = onCancel;
  } else onCancel = $[11];
  let onCancel_2 = onCancel;
  let allowOption;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    allowOption = {
      label: "Allow",
      value: "allow",
    };
    $[12] = allowOption;
  } else allowOption = $[12];
  let options;
  if ($[13] !== domainSuggestion_2) {
    let optionsList = [allowOption];
    if (domainSuggestion_2 !== null) {
      let domainOption;
      if ($[15] !== domainSuggestion_2.node) {
        domainOption = {
          label: domainSuggestion_2.node,
          value: "allow-domain",
        };
        $[15] = domainSuggestion_2.node;
        $[16] = domainOption;
      } else domainOption = $[16];
      optionsList.push(domainOption);
    }
    options =
      (optionsList.push({
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
      optionsList);
    $[13] = domainSuggestion_2;
    $[14] = options;
  } else options = $[14];
  let options_2 = options;
  let grantNoticeText;
  let hostDisplay;
  if ($[17] !== chrome || $[18] !== payload.grantNotice) {
    hostDisplay = chrome ? plainDisplay(chrome.host) : null;
    grantNoticeText =
      payload.grantNotice !== undefined && hostDisplay !== null
        ? displayField(describeAutoModeGrantBlock(payload.grantNotice, hostDisplay.display)).text
        : null;
    $[17] = chrome;
    $[18] = payload.grantNotice;
    $[19] = grantNoticeText;
    $[20] = hostDisplay;
  } else {
    grantNoticeText = $[19];
    hostDisplay = $[20];
  }
  let grantNoticeText_2 = grantNoticeText;
  const title =
    hostDisplay !== null
      ? `Claude in Chrome wants to ${verbPhrase} on ${hostDisplay.display}`
      : `Claude in Chrome wants to ${verbPhrase}`;
  let fallbackNotice;
  if ($[21] !== payload.permissionResult) {
    fallbackNotice =
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
    $[22] = fallbackNotice;
  } else fallbackNotice = $[22];
  let grantNoticeBox;
  if ($[23] !== grantNoticeText_2) {
    grantNoticeBox =
      grantNoticeText_2 !== null &&
      jsxProd_default(Box, {
        paddingX: 1,
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: grantNoticeText_2,
        }),
      });
    $[23] = grantNoticeText_2;
    $[24] = grantNoticeBox;
  } else grantNoticeBox = $[24];
  let urlBlock;
  if ($[25] !== chrome || $[26] !== serializedUrl_2) {
    urlBlock =
      chrome && serializedUrl_2 !== null
        ? jsxProd_default(DiffFrame, {
            children:
              serializedUrl_2.kind === "withheld"
                ? jsxProd_default(Text, {
                    dimColor: true,
                    children: serializedUrl_2.marker,
                  })
                : jsxProd_default(Blockquote, {
                    multiline: serializedUrl_2.needsGutter,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: serializedUrl_2.text,
                    }),
                  }),
          })
        : null;
    $[25] = chrome;
    $[26] = serializedUrl_2;
    $[27] = urlBlock;
  } else urlBlock = $[27];
  const marginTop = chrome && serializedUrl_2 !== null ? 0 : 1;
  let children;
  if ($[28] !== onCancel_2 || $[29] !== onChange_2 || $[30] !== options_2) {
    children = jsxProd_default(ModelSelector, {
      selectedValue: NO_COMMITTED_ROW,
      options: options_2,
      onChange: onChange_2,
      onCancel: onCancel_2,
    });
    $[28] = onCancel_2;
    $[29] = onChange_2;
    $[30] = options_2;
    $[31] = children;
  } else children = $[31];
  let selectorBox;
  if ($[32] !== marginTop || $[33] !== children) {
    selectorBox = jsxProd_default(Box, {
      paddingX: 1,
      marginTop,
      children,
    });
    $[32] = marginTop;
    $[33] = children;
    $[34] = selectorBox;
  } else selectorBox = $[34];
  let children_2;
  if ($[35] !== grantNoticeBox || $[36] !== urlBlock || $[37] !== selectorBox || $[38] !== fallbackNotice) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingBottom: 1,
      children: [fallbackNotice, grantNoticeBox, urlBlock, selectorBox],
    });
    $[35] = grantNoticeBox;
    $[36] = urlBlock;
    $[37] = selectorBox;
    $[38] = fallbackNotice;
    $[39] = children_2;
  } else children_2 = $[39];
  let dialog;
  if ($[40] !== payload.requestSource || $[41] !== children_2 || $[42] !== title) {
    dialog = jsxProd_default(PermissionDialog_2, {
      title,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: children_2,
    });
    $[40] = payload.requestSource;
    $[41] = children_2;
    $[42] = title;
    $[43] = dialog;
  } else dialog = $[43];
  return dialog;
}
export { ChromePermissionRequest };
