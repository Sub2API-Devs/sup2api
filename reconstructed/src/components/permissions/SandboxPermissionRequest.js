/**
 * components/permissions/SandboxPermissionRequest.tsx
 *
 * 沙箱网络访问请求：允许某域名一次或写入 userSettings 永久允许。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/SandboxPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 1, layout 1, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  sandboxHostGrantDestination,
  isMisleadingConsentHost,
  consentHostEntry,
} from "../../utils/sandbox/sandbox-adapter.js";
import {
  serializeApprovalPayload,
  hostnameLengthAllowance,
  plainDisplay,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { parseConsentSuggestions } from "./consentRows.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3 } from "../../hooks/useRecentInputGuard.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1248685-1248689 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1248685", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1248689-1248719 layout
var SANDBOX_RULE_UPDATE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1248689", () => {
  SANDBOX_RULE_UPDATE_TYPES = new Set(["addRules"]);
});
//@ chunk-18hwfzwa.js:1248719-1252276 fingerprint = SandboxPermissionRequest (0.396)
/**
 * 沙箱网络请求：显示请求访问的主机，选项允许一次 / 永久允许该域名（写 userSettings 的 sandbox 规则）/ 拒绝。
 */
function SandboxPermissionRequest(props) {
  let $ = useMemoCache(44);
  let { hostPattern, requestSource, onUserResponse } = props;
  let { host } = hostPattern;
  let grantDestination;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    grantDestination = sandboxHostGrantDestination();
    $[0] = grantDestination;
  } else grantDestination = $[0];
  let destination = grantDestination;
  let hostPayload;
  if ($[1] !== host) {
    hostPayload = serializeApprovalPayload(host, {
      maxUnits: hostnameLengthAllowance(host),
    });
    $[1] = host;
    $[2] = hostPayload;
  } else hostPayload = $[2];
  let hostPayload_2 = hostPayload;
  let consentRow;
  Xe: {
    if (destination === null) {
      consentRow = null;
      break Xe;
    }
    if (isMisleadingConsentHost(host)) {
      consentRow = null;
      break Xe;
    }
    if (hostPayload_2.kind !== "full") {
      consentRow = null;
      break Xe;
    }
    let plainHost;
    if ($[3] !== host) {
      plainHost = plainDisplay(host);
      $[3] = host;
      $[4] = plainHost;
    } else plainHost = $[4];
    let plainHost_2 = plainHost;
    if (plainHost_2 === null) {
      consentRow = null;
      break Xe;
    }
    let parsedSuggestions;
    if ($[5] !== host || $[6] !== plainHost_2) {
      let hostEntry;
      if ($[8] !== host) {
        hostEntry = consentHostEntry(host);
        $[8] = host;
        $[9] = hostEntry;
      } else hostEntry = $[9];
      parsedSuggestions = parseConsentSuggestions(
        [
          {
            type: "addRules",
            rules: [
              {
                toolName: WEBFETCH,
                ruleContent: `domain:${hostEntry}`,
              },
            ],
            behavior: "allow",
            destination,
          },
        ],
        {
          displayedTypes: SANDBOX_RULE_UPDATE_TYPES,
          displayedDestinations: new Set([destination]),
          renderLabel: (value) => {
            let update = value.length === 1 ? value[0] : undefined;
            if (
              update === undefined ||
              update.type !== "addRules" ||
              update.destination !== destination ||
              update.rules.length !== 1 ||
              update.rules[0]?.toolName !== WEBFETCH ||
              update.rules[0]?.ruleContent !== `domain:${consentHostEntry(host)}`
            ) {
              return null;
            }
            return jsxProd_default_2(Text, {
              children: [
                "Yes, and don't ask again for",
                " ",
                jsxProd_default(Text, {
                  bold: true,
                  children: plainHost_2.display,
                }),
                update.destination === "userSettings" ? " in any project (user settings)" : "",
              ],
            });
          },
        },
      );
      $[5] = host;
      $[6] = plainHost_2;
      $[7] = parsedSuggestions;
    } else parsedSuggestions = $[7];
    consentRow = parsedSuggestions;
  }
  let consentRow_2 = consentRow;
  let rawAnswer;
  if ($[10] !== onUserResponse) {
    rawAnswer = (event) => {
      let { response } = event;
      return onUserResponse(response);
    };
    $[10] = onUserResponse;
    $[11] = rawAnswer;
  } else rawAnswer = $[11];
  let refusableAnswer = useRefusableAnswer(rawAnswer);
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS_3);
  let answerWithTimeout;
  if ($[12] !== timeout || $[13] !== refusableAnswer) {
    answerWithTimeout = function answerWithTimeoutImpl(result, response) {
      if (!timeout) {
        return;
      }
      if (
        !refusableAnswer.answer({
          result,
          response,
        })
      ) {
        return;
      }
    };
    $[12] = timeout;
    $[13] = refusableAnswer;
    $[14] = answerWithTimeout;
  } else answerWithTimeout = $[14];
  let answerWithTimeoutFn = answerWithTimeout;
  let defaultFocusValue =
    refusableAnswer.refused === null ? undefined : refusableAnswer.refused.result === "yes" ? "yes" : "no";
  let onSelect;
  if ($[15] !== consentRow_2 || $[16] !== answerWithTimeoutFn) {
    onSelect = function onSelect(value) {
      bo: switch (value) {
        case "yes": {
          answerWithTimeoutFn("yes", {
            allow: true,
            persistToSettings: false,
          });
          break bo;
        }
        case "yes-dont-ask-again": {
          if (consentRow_2 !== null)
            answerWithTimeoutFn("yes-dont-ask-again", {
              allow: true,
              persistToSettings: true,
              persistRow: consentRow_2,
            });
          else
            answerWithTimeoutFn("yes", {
              allow: true,
              persistToSettings: false,
            });
          break bo;
        }
        case "no": {
          answerWithTimeoutFn("no", {
            allow: false,
            persistToSettings: false,
          });
        }
      }
    };
    $[15] = consentRow_2;
    $[16] = answerWithTimeoutFn;
    $[17] = onSelect;
  } else onSelect = $[17];
  let onChange = onSelect;
  let yesOption;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    yesOption = {
      label: "Yes",
      value: "yes",
    };
    $[18] = yesOption;
  } else yesOption = $[18];
  let dontAskOption;
  if ($[19] !== consentRow_2) {
    dontAskOption =
      consentRow_2 !== null
        ? [
            {
              label: consentRow_2.node,
              value: "yes-dont-ask-again",
            },
          ]
        : [];
    $[19] = consentRow_2;
    $[20] = dontAskOption;
  } else dontAskOption = $[20];
  let noOption;
  if ($[21] === MEMO_CACHE_SENTINEL) {
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
    $[21] = noOption;
  } else noOption = $[21];
  let options;
  if ($[22] !== dontAskOption) {
    options = [yesOption, ...dontAskOption, noOption];
    $[22] = dontAskOption;
    $[23] = options;
  } else options = $[23];
  let options_2 = options;
  let hostLabel;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    hostLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "Host:",
    });
    $[24] = hostLabel;
  } else hostLabel = $[24];
  const multiline = hostPayload_2.kind === "full" && hostPayload_2.needsGutter;
  const hostText = hostPayload_2.kind === "full" ? hostPayload_2.text : hostPayload_2.marker;
  let children;
  if ($[25] !== hostText) {
    children = jsxProd_default_2(Text, {
      children: [" ", hostText],
    });
    $[25] = hostText;
    $[26] = children;
  } else children = $[26];
  let hostBlock;
  if ($[27] !== multiline || $[28] !== children) {
    hostBlock = jsxProd_default(DiffFrame, {
      children: jsxProd_default_2(Box, {
        children: [
          hostLabel,
          jsxProd_default(Blockquote, {
            multiline,
            children,
          }),
        ],
      }),
    });
    $[27] = multiline;
    $[28] = children;
    $[29] = hostBlock;
  } else hostBlock = $[29];
  let question;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    question = jsxProd_default(Text, {
      children: "Do you want to allow this connection?",
    });
    $[30] = question;
  } else question = $[30];
  const isDisabled = !timeout;
  let onCancel;
  if ($[31] !== answerWithTimeoutFn) {
    onCancel = () =>
      answerWithTimeoutFn("cancel", {
        allow: false,
        persistToSettings: false,
      });
    $[31] = answerWithTimeoutFn;
    $[32] = onCancel;
  } else onCancel = $[32];
  let promptBox;
  if (
    $[33] !== onChange ||
    $[34] !== options_2 ||
    $[35] !== refusableAnswer.attempts ||
    $[36] !== defaultFocusValue ||
    $[37] !== isDisabled ||
    $[38] !== onCancel
  ) {
    promptBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingBottom: 1,
      children: [
        question,
        jsxProd_default(Box, {
          children: jsxProd_default(
            ModelSelector,
            {
              defaultFocusValue,
              options: options_2,
              isDisabled,
              onChange,
              onCancel,
            },
            refusableAnswer.attempts,
          ),
        }),
      ],
    });
    $[33] = onChange;
    $[34] = options_2;
    $[35] = refusableAnswer.attempts;
    $[36] = defaultFocusValue;
    $[37] = isDisabled;
    $[38] = onCancel;
    $[39] = promptBox;
  } else promptBox = $[39];
  let dialog;
  if ($[40] !== requestSource || $[41] !== hostBlock || $[42] !== promptBox) {
    dialog = jsxProd_default_2(PermissionDialog_2, {
      title: "Network request outside of sandbox",
      innerPaddingX: 0,
      requestSource,
      children: [hostBlock, promptBox],
    });
    $[40] = requestSource;
    $[41] = hostBlock;
    $[42] = promptBox;
    $[43] = dialog;
  } else dialog = $[43];
  return dialog;
}
export { SandboxPermissionRequest };
