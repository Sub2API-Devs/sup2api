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
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:1248685-1248689 placement
init_react_production();
//@ chunk-18hwfzwa.js:1248689-1248719 layout
var SANDBOX_RULE_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-18hwfzwa.js:1248719-1252276 fingerprint = SandboxPermissionRequest (0.396)
/**
 * 沙箱网络请求：显示请求访问的主机，选项允许一次 / 永久允许该域名（写 userSettings 的 sandbox 规则）/ 拒绝。
 */
function SandboxPermissionRequest(props) {
  let $ = w(44);
  let { hostPattern, requestSource, onUserResponse } = props;
  let { host } = hostPattern;
  let Re;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Re = sandboxHostGrantDestination();
    $[0] = Re;
  } else Re = $[0];
  let Be = Re;
  let He;
  if ($[1] !== host) {
    He = serializeApprovalPayload(host, {
      maxUnits: hostnameLengthAllowance(host),
    });
    $[1] = host;
    $[2] = He;
  } else He = $[2];
  let We = He;
  let ze;
  Xe: {
    if (Be === null) {
      ze = null;
      break Xe;
    }
    if (isMisleadingConsentHost(host)) {
      ze = null;
      break Xe;
    }
    if (We.kind !== "full") {
      ze = null;
      break Xe;
    }
    let rt;
    if ($[3] !== host) {
      rt = plainDisplay(host);
      $[3] = host;
      $[4] = rt;
    } else rt = $[4];
    let kt = rt;
    if (kt === null) {
      ze = null;
      break Xe;
    }
    let At;
    if ($[5] !== host || $[6] !== kt) {
      let It;
      if ($[8] !== host) {
        It = consentHostEntry(host);
        $[8] = host;
        $[9] = It;
      } else It = $[9];
      At = parseConsentSuggestions(
        [
          {
            type: "addRules",
            rules: [
              {
                toolName: WEBFETCH,
                ruleContent: `domain:${It}`,
              },
            ],
            behavior: "allow",
            destination: Be,
          },
        ],
        {
          displayedTypes: SANDBOX_RULE_UPDATE_TYPES,
          displayedDestinations: new Set([Be]),
          renderLabel: (value) => {
            let Et = value.length === 1 ? value[0] : undefined;
            if (
              Et === undefined ||
              Et.type !== "addRules" ||
              Et.destination !== Be ||
              Et.rules.length !== 1 ||
              Et.rules[0]?.toolName !== WEBFETCH ||
              Et.rules[0]?.ruleContent !== `domain:${consentHostEntry(host)}`
            ) {
              return null;
            }
            return jsxProd_default_2(Text, {
              children: [
                "Yes, and don't ask again for",
                " ",
                jsxProd_default(Text, {
                  bold: true,
                  children: kt.display,
                }),
                Et.destination === "userSettings" ? " in any project (user settings)" : "",
              ],
            });
          },
        },
      );
      $[5] = host;
      $[6] = kt;
      $[7] = At;
    } else At = $[7];
    ze = At;
  }
  let Dt = ze;
  let rt;
  if ($[10] !== onUserResponse) {
    rt = (At) => {
      let { response } = At;
      return onUserResponse(response);
    };
    $[10] = onUserResponse;
    $[11] = rt;
  } else rt = $[11];
  let refusableAnswer = useRefusableAnswer(rt);
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS_3);
  let At;
  if ($[12] !== timeout || $[13] !== refusableAnswer) {
    At = function po(result, response) {
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
    $[14] = At;
  } else At = $[14];
  let po = At;
  let defaultFocusValue =
    refusableAnswer.refused === null ? undefined : refusableAnswer.refused.result === "yes" ? "yes" : "no";
  let It;
  if ($[15] !== Dt || $[16] !== po) {
    It = function onSelect(value) {
      bo: switch (value) {
        case "yes": {
          po("yes", {
            allow: true,
            persistToSettings: false,
          });
          break bo;
        }
        case "yes-dont-ask-again": {
          if (Dt !== null)
            po("yes-dont-ask-again", {
              allow: true,
              persistToSettings: true,
              persistRow: Dt,
            });
          else
            po("yes", {
              allow: true,
              persistToSettings: false,
            });
          break bo;
        }
        case "no": {
          po("no", {
            allow: false,
            persistToSettings: false,
          });
        }
      }
    };
    $[15] = Dt;
    $[16] = po;
    $[17] = It;
  } else It = $[17];
  let onChange = It;
  let Bo;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    Bo = {
      label: "Yes",
      value: "yes",
    };
    $[18] = Bo;
  } else Bo = $[18];
  let Ro;
  if ($[19] !== Dt) {
    Ro =
      Dt !== null
        ? [
            {
              label: Dt.node,
              value: "yes-dont-ask-again",
            },
          ]
        : [];
    $[19] = Dt;
    $[20] = Ro;
  } else Ro = $[20];
  let Ho;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    Ho = {
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
    $[21] = Ho;
  } else Ho = $[21];
  let Io;
  if ($[22] !== Ro) {
    Io = [Bo, ...Ro, Ho];
    $[22] = Ro;
    $[23] = Io;
  } else Io = $[23];
  let options = Io;
  let mn;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    mn = jsxProd_default(Text, {
      dimColor: true,
      children: "Host:",
    });
    $[24] = mn;
  } else mn = $[24];
  const multiline = We.kind === "full" && We.needsGutter;
  const No = We.kind === "full" ? We.text : We.marker;
  let children;
  if ($[25] !== No) {
    children = jsxProd_default_2(Text, {
      children: [" ", No],
    });
    $[25] = No;
    $[26] = children;
  } else children = $[26];
  let Yo;
  if ($[27] !== multiline || $[28] !== children) {
    Yo = jsxProd_default(DiffFrame, {
      children: jsxProd_default_2(Box, {
        children: [
          mn,
          jsxProd_default(Blockquote, {
            multiline,
            children,
          }),
        ],
      }),
    });
    $[27] = multiline;
    $[28] = children;
    $[29] = Yo;
  } else Yo = $[29];
  let kn;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    kn = jsxProd_default(Text, {
      children: "Do you want to allow this connection?",
    });
    $[30] = kn;
  } else kn = $[30];
  const isDisabled = !timeout;
  let onCancel;
  if ($[31] !== po) {
    onCancel = () =>
      po("cancel", {
        allow: false,
        persistToSettings: false,
      });
    $[31] = po;
    $[32] = onCancel;
  } else onCancel = $[32];
  let Go;
  if (
    $[33] !== onChange ||
    $[34] !== options ||
    $[35] !== refusableAnswer.attempts ||
    $[36] !== defaultFocusValue ||
    $[37] !== isDisabled ||
    $[38] !== onCancel
  ) {
    Go = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingBottom: 1,
      children: [
        kn,
        jsxProd_default(Box, {
          children: jsxProd_default(
            ModelSelector,
            {
              defaultFocusValue,
              options,
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
    $[34] = options;
    $[35] = refusableAnswer.attempts;
    $[36] = defaultFocusValue;
    $[37] = isDisabled;
    $[38] = onCancel;
    $[39] = Go;
  } else Go = $[39];
  let hn;
  if ($[40] !== requestSource || $[41] !== Yo || $[42] !== Go) {
    hn = jsxProd_default_2(PermissionDialog_2, {
      title: "Network request outside of sandbox",
      innerPaddingX: 0,
      requestSource,
      children: [Yo, Go],
    });
    $[40] = requestSource;
    $[41] = Yo;
    $[42] = Go;
    $[43] = hn;
  } else hn = $[43];
  return hn;
}
export { SandboxPermissionRequest };
