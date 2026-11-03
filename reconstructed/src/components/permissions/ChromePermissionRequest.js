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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { isConsentRow, parseConsentSuggestions } from "./consentRows.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL } from "../../utils/claudeInChrome/common.js";
import {
  plainDisplay,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  displayField,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
j();
//@ chunk-18hwfzwa.js:1333389-1333672 placement
function chromeChoiceToResult(h, x, D) {
  switch (h) {
    case "allow":
      return { behavior: "allow", updatedInput: x.input };
    case "allow-domain":
      if (D === null || !isConsentRow(D)) return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: D.applies };
    case "deny":
      return { behavior: "deny" };
  }
}
/**
 * 生成 "本会话允许该站点所有操作" 的建议行（会话级 addRules），站点名不可安全显示时返回 null。
 */
//@ chunk-18hwfzwa.js:1333672-1334160 placement
function buildChromeDomainSuggestion(h) {
  if (!h) return null;
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [{ toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: h.host }],
        behavior: "allow",
        destination: "session",
      },
    ],
    {
      displayedTypes: _Oo,
      renderLabel: (x) => {
        let D = x.length === 1 ? x[0] : void 0;
        if (
          D === void 0 ||
          D.type !== "addRules" ||
          D.rules.length !== 1 ||
          D.rules[0]?.toolName !== CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL ||
          D.rules[0]?.ruleContent !== h.host
        )
          return null;
        let L = plainDisplay(h.host);
        if (L === null) return null;
        return r(Text, {
          children: [
            "Allow all actions on ",
            e(Text, { bold: !0, children: L.display }),
            " for this session",
          ],
        });
      },
    },
  );
}
//@ chunk-18hwfzwa.js:1334160-1334190 placement
var _Oo = new Set(["addRules"]);
//@ chunk-18hwfzwa.js:1334190-1334466 placement
function shouldOfferChromeDomainAllow(h) {
  let x = h.permissionResult.behavior === "ask" ? h.permissionResult.decisionReason : void 0;
  if (x?.type === "safetyCheck" && !x.classifierApprovable) return !1;
  if (h.domainAllowed) return !1;
  return h.showAlwaysAllow && !h.isAskCappedByOrg && !!h.chrome && !h.chrome.host.includes("*");
}
//@ chunk-18hwfzwa.js:1334466-1337112 placement
function ChromePermissionRequest(h) {
  let $ = w(44),
    { payload: payload, answer: answer } = h,
    { verbPhrase: verbPhrase, chrome: chrome } = payload,
    Re;
  if ($[0] !== chrome)
    ((Re = chrome ? serializeApprovalPayload(chrome.url, { maxUnits: MAX_PAYLOAD_UNITS }) : null),
      ($[0] = chrome),
      ($[1] = Re));
  else Re = $[1];
  let Be = Re,
    He = Be !== null && Be.kind === "withheld",
    We;
  if ($[2] !== chrome || $[3] !== payload || $[4] !== He)
    ((We = shouldOfferChromeDomainAllow(payload) && !He ? buildChromeDomainSuggestion(chrome) : null),
      ($[2] = chrome),
      ($[3] = payload),
      ($[4] = He),
      ($[5] = We));
  else We = $[5];
  let ze = We,
    Xe;
  if ($[6] !== answer || $[7] !== ze || $[8] !== payload)
    ((Xe = (rt) => answer(chromeChoiceToResult(rt, payload, ze))),
      ($[6] = answer),
      ($[7] = ze),
      ($[8] = payload),
      ($[9] = Xe));
  else Xe = $[9];
  let kt = Xe,
    At;
  if ($[10] !== answer)
    ((At = () => {
      answer({ behavior: "cancelled" });
    }),
      ($[10] = answer),
      ($[11] = At));
  else At = $[11];
  let It = At,
    Ot;
  if ($[12] === MEMO_CACHE_SENTINEL) ((Ot = { label: "Allow", value: "allow" }), ($[12] = Ot));
  else Ot = $[12];
  let Et;
  if ($[13] !== ze) {
    let Dt = [Ot];
    if (ze !== null) {
      let Lt;
      if ($[15] !== ze.node)
        ((Lt = { label: ze.node, value: "allow-domain" }), ($[15] = ze.node), ($[16] = Lt));
      else Lt = $[16];
      Dt.push(Lt);
    }
    Et =
      (Dt.push({
        label: r(Text, { children: ["Deny ", e(Text, { bold: !0, children: "(esc)" })] }),
        value: "deny",
      }),
      Dt);
    (($[13] = ze), ($[14] = Et));
  } else Et = $[14];
  let oo = Et,
    Lt,
    Xt;
  if ($[17] !== chrome || $[18] !== payload.grantNotice)
    ((Xt = chrome ? plainDisplay(chrome.host) : null),
      (Lt =
        payload.grantNotice !== void 0 && Xt !== null
          ? displayField(describeAutoModeGrantBlock(payload.grantNotice, Xt.display)).text
          : null),
      ($[17] = chrome),
      ($[18] = payload.grantNotice),
      ($[19] = Lt),
      ($[20] = Xt));
  else ((Lt = $[19]), (Xt = $[20]));
  let io = Lt;
  const so =
    Xt !== null
      ? `Claude in Chrome wants to ${verbPhrase} on ${Xt.display}`
      : `Claude in Chrome wants to ${verbPhrase}`;
  let po;
  if ($[21] !== payload.permissionResult)
    ((po =
      payload.permissionResult.denialLimitFallback !== void 0 &&
      e(Box, {
        paddingX: 1,
        marginTop: 1,
        children: e(PermissionRuleExplanation, {
          permissionResult: payload.permissionResult,
          toolType: "tool",
        }),
      })),
      ($[21] = payload.permissionResult),
      ($[22] = po));
  else po = $[22];
  let ao;
  if ($[23] !== io)
    ((ao =
      io !== null &&
      e(Box, { paddingX: 1, marginTop: 1, children: e(Text, { dimColor: !0, children: io }) })),
      ($[23] = io),
      ($[24] = ao));
  else ao = $[24];
  let co;
  if ($[25] !== chrome || $[26] !== Be)
    ((co =
      chrome && Be !== null
        ? e(DiffFrame, {
            children:
              Be.kind === "withheld"
                ? e(Text, { dimColor: !0, children: Be.marker })
                : e(Blockquote, {
                    multiline: Be.needsGutter,
                    children: e(Text, { dimColor: !0, children: Be.text }),
                  }),
          })
        : null),
      ($[25] = chrome),
      ($[26] = Be),
      ($[27] = co));
  else co = $[27];
  const bo = chrome && Be !== null ? 0 : 1;
  let Ao;
  if ($[28] !== It || $[29] !== kt || $[30] !== oo)
    ((Ao = e(ModelSelector, { selectedValue: NO_COMMITTED_ROW, options: oo, onChange: kt, onCancel: It })),
      ($[28] = It),
      ($[29] = kt),
      ($[30] = oo),
      ($[31] = Ao));
  else Ao = $[31];
  let Bo;
  if ($[32] !== bo || $[33] !== Ao)
    ((Bo = e(Box, { paddingX: 1, marginTop: bo, children: Ao })), ($[32] = bo), ($[33] = Ao), ($[34] = Bo));
  else Bo = $[34];
  let Ro;
  if ($[35] !== ao || $[36] !== co || $[37] !== Bo || $[38] !== po)
    ((Ro = r(Box, { flexDirection: "column", paddingBottom: 1, children: [po, ao, co, Bo] })),
      ($[35] = ao),
      ($[36] = co),
      ($[37] = Bo),
      ($[38] = po),
      ($[39] = Ro));
  else Ro = $[39];
  let Ho;
  if ($[40] !== payload.requestSource || $[41] !== Ro || $[42] !== so)
    ((Ho = e(PermissionDialog_2, {
      title: so,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: Ro,
    })),
      ($[40] = payload.requestSource),
      ($[41] = Ro),
      ($[42] = so),
      ($[43] = Ho));
  else Ho = $[43];
  return Ho;
}
//@ chunk-18hwfzwa.js:1337112-1337116 placement
j();

export { ChromePermissionRequest };
