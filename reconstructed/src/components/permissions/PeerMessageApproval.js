/**
 * components/permissions/PeerMessageApproval.tsx
 *
 * 2.1.316 新增。同伴会话消息的审批。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { needsGutter } from "../../utils/permissions/approvalPayloadSerialization.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1337116-1337131 placement
var DENY = "deny";
//@ chunk-18hwfzwa.js:1337131-1338071 placement
function peerHoldExplanation(h) {
  switch (h) {
    case "mode-mismatch":
      return "The sending session's permission mode class doesn't match this session's, so it wasn't delivered automatically.";
    case "no-mode-asserted":
      return "The sender did not attest its permission mode, and this session bypasses permission prompts.";
    case "explicit-setting":
      return 'Your "crossSessionInbound" setting is "hold".';
    case "managed-setting":
      return `Your organization's managed settings set "crossSessionInbound" to "hold".`;
    case "repo-setting":
      return `This repository's settings set "crossSessionInbound" to "hold" (your own "accept" cannot override a repo tightening).`;
    case "invalid-setting":
      return 'A settings file has an unrecognized "crossSessionInbound" value (see the settings warning), so messages are held while it is present.';
    case "bypass-default":
      return "This session is not prompting for permissions.";
    case "mode-unknown":
      return "This session's permission mode could not be determined.";
  }
}
//@ chunk-18hwfzwa.js:1338071-1340420 placement
function PeerMessageApproval(h) {
  let $ = w(37),
    { payload: payload, answer: answer } = h,
    ee;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ee = [
      { value: "deny", label: "Deny \u2014 drop it and tell the sender it was declined" },
      { value: "approve", label: "Deliver this message to Claude" },
    ]),
      ($[0] = ee));
  else ee = $[0];
  let ke = ee,
    Re = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    ze = settleKey(epoch),
    Xe;
  if ($[1] !== Re || $[2] !== noteRefused || $[3] !== refusedWithin)
    ((Xe = function rt() {
      if (Re() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[1] = Re),
      ($[2] = noteRefused),
      ($[3] = refusedWithin),
      ($[4] = Xe));
  else Xe = $[4];
  let rt = Xe,
    kt = payload.fromAddress ?? "an unidentified session",
    At = payload.verifiedPeerPid !== void 0 ? ` [verified pid ${payload.verifiedPeerPid}]` : "",
    It = payload.claimedName ? ` (peer claims name: ${payload.claimedName})` : "",
    Ot;
  if ($[5] !== It || $[6] !== kt || $[7] !== At)
    ((Ot = r(Text, { children: ["Another Claude session sent a message: from ", kt, At, It] })),
      ($[5] = It),
      ($[6] = kt),
      ($[7] = At),
      ($[8] = Ot));
  else Ot = $[8];
  let Et;
  if ($[9] !== payload.holdCause)
    ((Et = peerHoldExplanation(payload.holdCause)), ($[9] = payload.holdCause), ($[10] = Et));
  else Et = $[10];
  let Dt;
  if ($[11] !== Et)
    ((Dt = e(Box, { marginTop: 1, children: e(Text, { color: "inactive", children: Et }) })),
      ($[11] = Et),
      ($[12] = Dt));
  else Dt = $[12];
  let Lt;
  if ($[13] !== payload.preview)
    ((Lt =
      payload.preview !== "" &&
      e(Box, {
        marginTop: 1,
        children: e(Text, { color: "inactive", children: "Message body (this is what will be delivered):" }),
      })),
      ($[13] = payload.preview),
      ($[14] = Lt));
  else Lt = $[14];
  let oo;
  if ($[15] !== Ot || $[16] !== Dt || $[17] !== Lt)
    ((oo = r(Box, { flexDirection: "column", marginTop: 1, paddingX: 1, children: [Ot, Dt, Lt] })),
      ($[15] = Ot),
      ($[16] = Dt),
      ($[17] = Lt),
      ($[18] = oo));
  else oo = $[18];
  let Xt;
  if ($[19] !== payload.preview)
    ((Xt =
      payload.preview !== "" &&
      e(DiffFrame, {
        children: e(Blockquote, {
          multiline: needsGutter(payload.preview),
          children: e(Text, { children: payload.preview }),
        }),
      })),
      ($[19] = payload.preview),
      ($[20] = Xt));
  else Xt = $[20];
  const io = payload.preview !== "" ? 0 : 1;
  let so, po;
  if ($[21] !== answer || $[22] !== rt)
    ((so = (ao) => {
      if (rt()) {
        return;
      }
      answer({ behavior: ao });
    }),
      (po = () => {
        if (rt()) {
          return;
        }
        answer({ behavior: "cancelled" });
      }),
      ($[21] = answer),
      ($[22] = rt),
      ($[23] = so),
      ($[24] = po));
  else ((so = $[23]), (po = $[24]));
  let co;
  if ($[25] !== ze.remountKey || $[26] !== rt || $[27] !== so || $[28] !== po)
    ((co = e(
      ModelSelector,
      {
        selectedValue: NO_COMMITTED_ROW,
        options: ke,
        defaultFocusValue: DENY,
        hideIndexes: !0,
        refuseInput: rt,
        onChange: so,
        onCancel: po,
      },
      ze.remountKey,
    )),
      ($[25] = ze.remountKey),
      ($[26] = rt),
      ($[27] = so),
      ($[28] = po),
      ($[29] = co));
  else co = $[29];
  let bo;
  if ($[30] !== co || $[31] !== io)
    ((bo = e(Box, { paddingX: 1, marginTop: io, children: co })), ($[30] = co), ($[31] = io), ($[32] = bo));
  else bo = $[32];
  let Ao;
  if ($[33] !== bo || $[34] !== oo || $[35] !== Xt)
    ((Ao = r(PermissionDialog_2, {
      color: "warning",
      title: "Held message from another session",
      innerPaddingX: 0,
      children: [oo, Xt, bo],
    })),
      ($[33] = bo),
      ($[34] = oo),
      ($[35] = Xt),
      ($[36] = Ao));
  else Ao = $[36];
  return Ao;
}
//@ chunk-18hwfzwa.js:1340420-1340424 placement
j();

export { PeerMessageApproval };
