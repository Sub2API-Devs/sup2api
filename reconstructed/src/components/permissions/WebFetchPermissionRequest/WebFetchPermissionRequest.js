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
import { WebFetchTool } from "../../../tools/WebFetchTool/WebFetchTool.js";
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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { normalizeUrlHref } from "../permissionCardKinds.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Blockquote } from "../../Blockquote.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

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
//@ chunk-18hwfzwa.js:1412972-1413264 placement
function webFetchChoiceToResult(choice, payload, selectedRow) {
  switch (choice) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
      };
    case "yes-dont-ask-again-domain":
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
      renderLabel: (updates) => {
        let update = updates.length === 1 ? updates[0] : undefined;
        if (
          update === undefined ||
          update.type !== "addRules" ||
          update.rules.length !== 1 ||
          update.rules[0]?.toolName !== payload.toolName ||
          update.rules[0]?.ruleContent !== `domain:${payload.hostname}`
        )
          return null;
        let hostDisplay = plainDisplay(payload.hostname);
        if (hostDisplay === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for ",
            jsxProd_default(Text, {
              bold: true,
              children: hostDisplay.display,
            }),
          ],
        });
      },
    },
  );
}
//@ chunk-18hwfzwa.js:1413780-1413810 placement
var WEBFETCH_RULE_UPDATE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1413780", () => {
  WEBFETCH_RULE_UPDATE_TYPES = new Set(["addRules"]);
});
//@ chunk-18hwfzwa.js:1413810-1414011 layout
function shouldOfferWebFetchDomainAllow(payload) {
  let decisionReason = payload.permissionResult.decisionReason;
  let isUnapprovableCheck = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  return (
    payload.showAlwaysAllow &&
    !isUnapprovableCheck &&
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
  let $ = useMemoCache(57);
  let { payload, answer } = props;
  let normalizedUrl;
  if ($[0] !== payload.input.url) {
    normalizedUrl =
      typeof payload.input.url === "string" ? normalizeUrlHref(payload.input.url) : payload.input.url;
    $[0] = payload.input.url;
    $[1] = normalizedUrl;
  } else normalizedUrl = $[1];
  let serializedUrl;
  if ($[2] !== normalizedUrl) {
    serializedUrl = serializeApprovalPayload(normalizedUrl, {
      maxUnits: MAX_PAYLOAD_UNITS,
    });
    $[2] = normalizedUrl;
    $[3] = serializedUrl;
  } else serializedUrl = $[3];
  let serializedUrl_2 = serializedUrl;
  let isUrlWithheld = serializedUrl_2.kind === "withheld";
  let promptField;
  if ($[4] !== payload.input.prompt) {
    promptField = displayField(payload.input.prompt);
    $[4] = payload.input.prompt;
    $[5] = promptField;
  } else promptField = $[5];
  let promptField_2 = promptField;
  let domainRule;
  if ($[6] !== payload || $[7] !== isUrlWithheld) {
    domainRule =
      shouldOfferWebFetchDomainAllow(payload) && !isUrlWithheld ? buildWebFetchDomainRule(payload) : null;
    $[6] = payload;
    $[7] = isUrlWithheld;
    $[8] = domainRule;
  } else domainRule = $[8];
  let domainRule_2 = domainRule;
  let onChange;
  if ($[9] !== answer || $[10] !== domainRule_2 || $[11] !== payload) {
    onChange = (choice) => answer(webFetchChoiceToResult(choice, payload, domainRule_2));
    $[9] = answer;
    $[10] = domainRule_2;
    $[11] = payload;
    $[12] = onChange;
  } else onChange = $[12];
  let onChange_2 = onChange;
  let onCancel;
  if ($[13] !== answer) {
    onCancel = () => {
      answer({
        behavior: "cancelled",
      });
    };
    $[13] = answer;
    $[14] = onCancel;
  } else onCancel = $[14];
  let onCancel_2 = onCancel;
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let noOption;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    noOption = {
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
    $[15] = noOption;
  } else noOption = $[15];
  let noOption_2 = noOption;
  let yesOption;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    yesOption = {
      label: "Yes",
      value: "yes",
    };
    $[16] = yesOption;
  } else yesOption = $[16];
  let yesOption_2 = yesOption;
  let options;
  if ($[17] !== domainRule_2 || $[18] !== hideIndexes) {
    options = hideIndexes ? [noOption_2, yesOption_2] : [yesOption_2];
    if (domainRule_2 !== null) {
      let domainOption;
      if ($[20] !== domainRule_2.node) {
        domainOption = {
          label: domainRule_2.node,
          value: "yes-dont-ask-again-domain",
        };
        $[20] = domainRule_2.node;
        $[21] = domainOption;
      } else domainOption = $[21];
      options.push(domainOption);
    }
    if (!hideIndexes) options.push(noOption_2);
    $[17] = domainRule_2;
    $[18] = hideIndexes;
    $[19] = options;
  } else options = $[19];
  let options_2 = options;
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
  let descriptionBox;
  if ($[26] !== multiline || $[27] !== children) {
    descriptionBox = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: jsxProd_default(Blockquote, {
        multiline,
        children,
      }),
    });
    $[26] = multiline;
    $[27] = children;
    $[28] = descriptionBox;
  } else descriptionBox = $[28];
  let urlBlock;
  if (
    $[29] !== serializedUrl_2.kind ||
    $[30] !== serializedUrl_2.marker ||
    $[31] !== serializedUrl_2.needsGutter ||
    $[32] !== serializedUrl_2.text
  ) {
    urlBlock =
      serializedUrl_2.kind === "full"
        ? jsxProd_default(Blockquote, {
            multiline: serializedUrl_2.needsGutter,
            children: jsxProd_default_2(Text, {
              children: ["url: ", serializedUrl_2.text],
            }),
          })
        : jsxProd_default(Text, {
            dimColor: true,
            children: serializedUrl_2.marker,
          });
    $[29] = serializedUrl_2.kind;
    $[30] = serializedUrl_2.marker;
    $[31] = serializedUrl_2.needsGutter;
    $[32] = serializedUrl_2.text;
    $[33] = urlBlock;
  } else urlBlock = $[33];
  let promptBlock;
  if ($[34] !== promptField_2.needsGutter || $[35] !== promptField_2.text) {
    promptBlock =
      promptField_2.text !== ""
        ? jsxProd_default(Blockquote, {
            multiline: promptField_2.needsGutter,
            children: jsxProd_default_2(Text, {
              children: ["prompt: ", promptField_2.text],
            }),
          })
        : null;
    $[34] = promptField_2.needsGutter;
    $[35] = promptField_2.text;
    $[36] = promptBlock;
  } else promptBlock = $[36];
  let fetchBlock;
  if ($[37] !== urlBlock || $[38] !== promptBlock) {
    fetchBlock = jsxProd_default_2(DiffFrame, {
      children: [urlBlock, promptBlock],
    });
    $[37] = urlBlock;
    $[38] = promptBlock;
    $[39] = fetchBlock;
  } else fetchBlock = $[39];
  const rowBudget = hideIndexes ? MAX_EXPLANATION_LINES : undefined;
  let ruleExplanation;
  if ($[40] !== payload.permissionResult || $[41] !== rowBudget) {
    ruleExplanation = jsxProd_default(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: "tool",
      rowBudget,
    });
    $[40] = payload.permissionResult;
    $[41] = rowBudget;
    $[42] = ruleExplanation;
  } else ruleExplanation = $[42];
  let question;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    question = jsxProd_default(Text, {
      children: "Do you want to allow Claude to fetch this content?",
    });
    $[43] = question;
  } else question = $[43];
  let selector;
  if ($[44] !== onCancel_2 || $[45] !== onChange_2 || $[46] !== hideIndexes || $[47] !== options_2) {
    selector = jsxProd_default(ModelSelector, {
      hideIndexes,
      selectedValue: NO_COMMITTED_ROW,
      options: options_2,
      onChange: onChange_2,
      onCancel: onCancel_2,
    });
    $[44] = onCancel_2;
    $[45] = onChange_2;
    $[46] = hideIndexes;
    $[47] = options_2;
    $[48] = selector;
  } else selector = $[48];
  let promptBox;
  if ($[49] !== ruleExplanation || $[50] !== selector) {
    promptBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [ruleExplanation, question, selector],
    });
    $[49] = ruleExplanation;
    $[50] = selector;
    $[51] = promptBox;
  } else promptBox = $[51];
  let dialog;
  if (
    $[52] !== payload.requestSource ||
    $[53] !== descriptionBox ||
    $[54] !== fetchBlock ||
    $[55] !== promptBox
  ) {
    dialog = jsxProd_default_2(PermissionDialog_2, {
      title: "Fetch",
      innerPaddingX: 0,
      requestSource,
      children: [descriptionBox, fetchBlock, promptBox],
    });
    $[52] = payload.requestSource;
    $[53] = descriptionBox;
    $[54] = fetchBlock;
    $[55] = promptBox;
    $[56] = dialog;
  } else dialog = $[56];
  return dialog;
}
export { WebFetchPermissionRequest, inputToPermissionRuleContent };
