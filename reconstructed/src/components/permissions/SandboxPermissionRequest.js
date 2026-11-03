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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  sandboxHostGrantDestination,
  isMisleadingConsentHost,
  consentHostEntry,
} from "../../utils/sandbox/sandbox-adapter.js";
import {
  serializeApprovalPayload,
  Nur,
  plainDisplay,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { parseConsentSuggestions } from "./consentRows.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { So } from "../../hooks/useRecentInputGuard.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";

//@ chunk-18hwfzwa.js:1248685-1248689 placement
j();
//@ chunk-18hwfzwa.js:1248689-1248719 layout
var Bct = new Set(["addRules"]);
/**
 * 沙箱网络请求：显示请求访问的主机，选项允许一次 / 永久允许该域名（写 userSettings 的 sandbox 规则）/ 拒绝。
 */
//@ chunk-18hwfzwa.js:1248719-1252276 fingerprint = SandboxPermissionRequest (0.396)
function SandboxPermissionRequest(t0) {
  let $ = w(44),
    { hostPattern: t1, requestSource: requestSource, onUserResponse: onUserResponse } = t0,
    { host: host } = t1,
    Re;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Re = sandboxHostGrantDestination()), ($[0] = Re));
  else Re = $[0];
  let Be = Re,
    He;
  if ($[1] !== host)
    ((He = serializeApprovalPayload(host, { maxUnits: Nur(host) })), ($[1] = host), ($[2] = He));
  else He = $[2];
  let We = He,
    ze;
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
    if ($[3] !== host) ((rt = plainDisplay(host)), ($[3] = host), ($[4] = rt));
    else rt = $[4];
    let kt = rt;
    if (kt === null) {
      ze = null;
      break Xe;
    }
    let At;
    if ($[5] !== host || $[6] !== kt) {
      let It;
      if ($[8] !== host) ((It = consentHostEntry(host)), ($[8] = host), ($[9] = It));
      else It = $[9];
      At = parseConsentSuggestions(
        [
          {
            type: "addRules",
            rules: [{ toolName: WEBFETCH, ruleContent: `domain:${It}` }],
            behavior: "allow",
            destination: Be,
          },
        ],
        {
          displayedTypes: Bct,
          displayedDestinations: new Set([Be]),
          renderLabel: (value) => {
            let Et = value.length === 1 ? value[0] : void 0;
            if (
              Et === void 0 ||
              Et.type !== "addRules" ||
              Et.destination !== Be ||
              Et.rules.length !== 1 ||
              Et.rules[0]?.toolName !== WEBFETCH ||
              Et.rules[0]?.ruleContent !== `domain:${consentHostEntry(host)}`
            ) {
              return null;
            }
            return r(Text, {
              children: [
                "Yes, and don't ask again for",
                " ",
                e(Text, { bold: !0, children: kt.display }),
                Et.destination === "userSettings" ? " in any project (user settings)" : "",
              ],
            });
          },
        },
      );
      (($[5] = host), ($[6] = kt), ($[7] = At));
    } else At = $[7];
    ze = At;
  }
  let Dt = ze,
    rt;
  if ($[10] !== onUserResponse)
    ((rt = (At) => {
      let { response: response } = At;
      return onUserResponse(response);
    }),
      ($[10] = onUserResponse),
      ($[11] = rt));
  else rt = $[11];
  let oo = useRefusableAnswer(rt),
    Xt = useTimeout(So),
    At;
  if ($[12] !== Xt || $[13] !== oo)
    ((At = function po(io, so) {
      if (!Xt) {
        return;
      }
      if (!oo.answer({ result: io, response: so })) {
        return;
      }
    }),
      ($[12] = Xt),
      ($[13] = oo),
      ($[14] = At));
  else At = $[14];
  let po = At,
    ao = oo.refused === null ? void 0 : oo.refused.result === "yes" ? "yes" : "no",
    It;
  if ($[15] !== Dt || $[16] !== po)
    ((It = function Ao(co) {
      bo: switch (co) {
        case "yes": {
          po("yes", { allow: !0, persistToSettings: !1 });
          break bo;
        }
        case "yes-dont-ask-again": {
          if (Dt !== null) po("yes-dont-ask-again", { allow: !0, persistToSettings: !0, persistRow: Dt });
          else po("yes", { allow: !0, persistToSettings: !1 });
          break bo;
        }
        case "no": {
          po("no", { allow: !1, persistToSettings: !1 });
        }
      }
    }),
      ($[15] = Dt),
      ($[16] = po),
      ($[17] = It));
  else It = $[17];
  let Ao = It,
    Bo;
  if ($[18] === MEMO_CACHE_SENTINEL) ((Bo = { label: "Yes", value: "yes" }), ($[18] = Bo));
  else Bo = $[18];
  let Ro;
  if ($[19] !== Dt)
    ((Ro = Dt !== null ? [{ label: Dt.node, value: "yes-dont-ask-again" }] : []), ($[19] = Dt), ($[20] = Ro));
  else Ro = $[20];
  let Ho;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((Ho = {
      label: r(Text, {
        children: ["No, and tell Claude what to do differently ", e(Text, { bold: !0, children: "(esc)" })],
      }),
      value: "no",
    }),
      ($[21] = Ho));
  else Ho = $[21];
  let Io;
  if ($[22] !== Ro) ((Io = [Bo, ...Ro, Ho]), ($[22] = Ro), ($[23] = Io));
  else Io = $[23];
  let Wo = Io,
    mn;
  if ($[24] === MEMO_CACHE_SENTINEL) ((mn = e(Text, { dimColor: !0, children: "Host:" })), ($[24] = mn));
  else mn = $[24];
  const Cn = We.kind === "full" && We.needsGutter,
    No = We.kind === "full" ? We.text : We.marker;
  let vo;
  if ($[25] !== No) ((vo = r(Text, { children: [" ", No] })), ($[25] = No), ($[26] = vo));
  else vo = $[26];
  let Yo;
  if ($[27] !== Cn || $[28] !== vo)
    ((Yo = e(DiffFrame, {
      children: r(Box, { children: [mn, e(Blockquote, { multiline: Cn, children: vo })] }),
    })),
      ($[27] = Cn),
      ($[28] = vo),
      ($[29] = Yo));
  else Yo = $[29];
  let kn;
  if ($[30] === MEMO_CACHE_SENTINEL)
    ((kn = e(Text, { children: "Do you want to allow this connection?" })), ($[30] = kn));
  else kn = $[30];
  const Fn = !Xt;
  let bn;
  if ($[31] !== po)
    ((bn = () => po("cancel", { allow: !1, persistToSettings: !1 })), ($[31] = po), ($[32] = bn));
  else bn = $[32];
  let Go;
  if ($[33] !== Ao || $[34] !== Wo || $[35] !== oo.attempts || $[36] !== ao || $[37] !== Fn || $[38] !== bn)
    ((Go = r(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingBottom: 1,
      children: [
        kn,
        e(Box, {
          children: e(
            ModelSelector,
            { defaultFocusValue: ao, options: Wo, isDisabled: Fn, onChange: Ao, onCancel: bn },
            oo.attempts,
          ),
        }),
      ],
    })),
      ($[33] = Ao),
      ($[34] = Wo),
      ($[35] = oo.attempts),
      ($[36] = ao),
      ($[37] = Fn),
      ($[38] = bn),
      ($[39] = Go));
  else Go = $[39];
  let hn;
  if ($[40] !== requestSource || $[41] !== Yo || $[42] !== Go)
    ((hn = r(PermissionDialog_2, {
      title: "Network request outside of sandbox",
      innerPaddingX: 0,
      requestSource: requestSource,
      children: [Yo, Go],
    })),
      ($[40] = requestSource),
      ($[41] = Yo),
      ($[42] = Go),
      ($[43] = hn));
  else hn = $[43];
  return hn;
}

export { SandboxPermissionRequest };
