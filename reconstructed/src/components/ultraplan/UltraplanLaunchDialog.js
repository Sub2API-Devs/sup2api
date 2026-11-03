/**
 * components/ultraplan/UltraplanLaunchDialog.tsx
 *
 * 2.1.316 新增。ultraplan 启动对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { detectCurrentRepositoryWithHost, isNestedGitLabProject } from "../../utils/detectRepository.js";
import { checkGate_CACHED_OR_BLOCKING } from "../../services/analytics/growthbook.js";
import { findGitRoot } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { env } from "../../utils/env.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { isGithubAppInstalled } from "../../utils/background/remote/preconditions.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { getUltraplanCopy, CCR_TERMS_URL_ULTRAPLAN } from "../../commands/ultraplan.js";
import { useAppState } from "../../state/AppState.js";
import { y, fo, Qr, j } from "../../../vendor/react/cjs/react.production.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { Dialog } from "../design-system/Dialog.js";
import { sanitizeOneLineLabel } from "../EffortMediumNudgeDialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-18hwfzwa.js:1254974-1255258 placement
async function isCcrBundleSeedEnabled() {
  let [h, x] = await Promise.all([
      detectCurrentRepositoryWithHost(),
      checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled"),
    ]),
    D = findGitRoot(getCwd()) !== null && (env.CCR_ENABLE_BUNDLE || x);
  if (!D) return { cloneViable: !1, bundleSeedEnabled: D };
  return {
    cloneViable:
      h !== null &&
      !isNestedGitLabProject(h) &&
      (!isGithubDotCom(h.host) || (await isGithubAppInstalled(h.owner, h.name))),
    bundleSeedEnabled: D,
  };
}
//@ chunk-18hwfzwa.js:1255258-1255303 placement = _temp2 (1)
function selectReplBridgeEnabled(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-18hwfzwa.js:1255303-1255329 placement
function hAo() {
  return Jct;
}
//@ chunk-18hwfzwa.js:1255329-1255542 placement
function ultraplanUploadNote(h) {
  if (!h.bundleSeedEnabled) return null;
  return h.cloneViable
    ? "This will try to clone your git remote and fall back to uploading this repository."
    : "This will upload your repository to a cloud session.";
}
//@ chunk-18hwfzwa.js:1255542-1255614 placement
var Jct = { cloneViable: !1, bundleSeedEnabled: !0 },
  Xct = "(nothing printable)";
//@ chunk-18hwfzwa.js:1255614-1257026 placement
function UltraplanLaunchDialog(h) {
  let $ = w(27),
    {
      promptIdentifier: promptIdentifier,
      showTerms: showTerms,
      prompt: prompt,
      deliveredByRelay: deliveredByRelay,
      onDone: onDone,
      wouldTakeAnswer: wouldTakeAnswer,
    } = h;
  useRegisterOverlay("ultraplan-launch");
  let He;
  if ($[0] !== promptIdentifier)
    ((He = getUltraplanCopy(promptIdentifier)), ($[0] = promptIdentifier), ($[1] = He));
  else He = $[1];
  let We = He,
    ze = useAppState(selectReplBridgeEnabled),
    Xe;
  if ($[2] !== showTerms)
    ((Xe = () => (showTerms ? isCcrBundleSeedEnabled().catch(hAo) : null)), ($[2] = showTerms), ($[3] = Xe));
  else Xe = $[3];
  let [rt] = y(Xe),
    kt = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    Ot;
  if ($[4] !== onDone)
    ((Ot = function Dt(Et) {
      onDone(Et);
    }),
      ($[4] = onDone),
      ($[5] = Ot));
  else Ot = $[5];
  let Dt = Ot,
    Lt;
  if ($[6] !== kt || $[7] !== noteRefused || $[8] !== refusedWithin || $[9] !== wouldTakeAnswer)
    ((Lt = function oo() {
      if (kt() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return wouldTakeAnswer?.() === !1;
    }),
      ($[6] = kt),
      ($[7] = noteRefused),
      ($[8] = refusedWithin),
      ($[9] = wouldTakeAnswer),
      ($[10] = Lt));
  else Lt = $[10];
  let oo = Lt,
    Xt;
  if ($[11] !== Dt) ((Xt = () => Dt("cancel")), ($[11] = Dt), ($[12] = Xt));
  else Xt = $[12];
  let io;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((io = e(Text, { dimColor: !0, children: "Loading\u2026" })), ($[13] = io));
  else io = $[13];
  let so;
  if (
    $[14] !== Dt ||
    $[15] !== We ||
    $[16] !== deliveredByRelay ||
    $[17] !== prompt ||
    $[18] !== oo ||
    $[19] !== ze ||
    $[20] !== showTerms ||
    $[21] !== rt
  )
    ((so = e(fo, {
      fallback: io,
      children: e(UltraplanLaunchBody, {
        showTerms: showTerms,
        prompt: prompt,
        deliveredByRelay: deliveredByRelay,
        sourcePromise: rt,
        copy: We,
        replBridgeEnabled: ze,
        onChoice: Dt,
        refuseInput: oo,
      }),
    })),
      ($[14] = Dt),
      ($[15] = We),
      ($[16] = deliveredByRelay),
      ($[17] = prompt),
      ($[18] = oo),
      ($[19] = ze),
      ($[20] = showTerms),
      ($[21] = rt),
      ($[22] = so));
  else so = $[22];
  let po;
  if ($[23] !== We.timeEstimate || $[24] !== Xt || $[25] !== so)
    ((po = e(Dialog, {
      title: "Run ultraplan in the cloud?",
      subtitle: We.timeEstimate,
      onCancel: Xt,
      children: so,
    })),
      ($[23] = We.timeEstimate),
      ($[24] = Xt),
      ($[25] = so),
      ($[26] = po));
  else po = $[26];
  return po;
}
//@ chunk-18hwfzwa.js:1257026-1259550 placement
function UltraplanLaunchBody(h) {
  let $ = w(41),
    {
      showTerms: showTerms,
      prompt: prompt,
      deliveredByRelay: deliveredByRelay,
      sourcePromise: sourcePromise,
      copy: copy,
      replBridgeEnabled: replBridgeEnabled,
      onChoice: onChoice,
      refuseInput: refuseInput,
    } = h,
    We = sourcePromise ? Qr(sourcePromise) : null,
    Xe;
  if ($[0] !== We) ((Xe = We && ultraplanUploadNote(We)), ($[0] = We), ($[1] = Xe));
  else Xe = $[1];
  let rt = Xe,
    kt;
  if ($[2] !== prompt) ((kt = sanitizeOneLineLabel(prompt)), ($[2] = prompt), ($[3] = kt));
  else kt = $[3];
  let At = kt,
    It = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    Dt;
  if ($[4] !== It || $[5] !== noteRefused || $[6] !== refusedWithin)
    ((Dt = function Lt() {
      if (It() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[4] = It),
      ($[5] = noteRefused),
      ($[6] = refusedWithin),
      ($[7] = Dt));
  else Dt = $[7];
  let Lt = Dt;
  const oo = deliveredByRelay ? "Prompt (sent from a connected channel): " : "Prompt: ";
  let Xt;
  if ($[8] !== oo) ((Xt = e(Text, { dimColor: !0, children: oo })), ($[8] = oo), ($[9] = Xt));
  else Xt = $[9];
  const io = At === "" ? Xct : At;
  let so;
  if ($[10] !== Xt || $[11] !== io)
    ((so = r(Text, { wrap: "truncate-end", children: [Xt, io] })), ($[10] = Xt), ($[11] = io), ($[12] = so));
  else so = $[12];
  let po;
  if (
    $[13] !== copy.dialogBody ||
    $[14] !== copy.dialogPipeline ||
    $[15] !== replBridgeEnabled ||
    $[16] !== showTerms ||
    $[17] !== rt
  )
    ((po = showTerms
      ? r(Fragment, {
          children: [
            e(Text, { dimColor: !0, children: copy.dialogBody }),
            r(Box, {
              flexDirection: "column",
              children: [
                rt && e(Text, { dimColor: !0, children: rt }),
                r(Text, {
                  dimColor: !0,
                  children: [
                    "More information: ",
                    e(Link, { url: CCR_TERMS_URL_ULTRAPLAN, children: CCR_TERMS_URL_ULTRAPLAN }),
                  ],
                }),
              ],
            }),
            e(Text, { children: "Proceed?" }),
          ],
        })
      : r(Fragment, {
          children: [
            r(Box, {
              flexDirection: "column",
              children: [
                e(Text, { dimColor: !0, children: copy.dialogBody }),
                replBridgeEnabled &&
                  e(Text, { dimColor: !0, children: "This will disable Remote Control for this session." }),
              ],
            }),
            !replBridgeEnabled && e(Text, { dimColor: !0, children: copy.dialogPipeline }),
          ],
        })),
      ($[13] = copy.dialogBody),
      ($[14] = copy.dialogPipeline),
      ($[15] = replBridgeEnabled),
      ($[16] = showTerms),
      ($[17] = rt),
      ($[18] = po));
  else po = $[18];
  let ao;
  if ($[19] !== Lt || $[20] !== refuseInput)
    ((ao = () => Lt() || refuseInput()), ($[19] = Lt), ($[20] = refuseInput), ($[21] = ao));
  else ao = $[21];
  const co = showTerms ? "Yes" : "Run ultraplan",
    bo = replBridgeEnabled
      ? "Disable remote control and launch in a cloud session"
      : "launch in a cloud session";
  let Ao;
  if ($[22] !== co || $[23] !== bo)
    ((Ao = { label: co, value: "run", description: bo }), ($[22] = co), ($[23] = bo), ($[24] = Ao));
  else Ao = $[24];
  const Bo = showTerms ? "No" : "Not now";
  let Ro;
  if ($[25] !== Bo) ((Ro = { label: Bo, value: "cancel" }), ($[25] = Bo), ($[26] = Ro));
  else Ro = $[26];
  let Ho;
  if ($[27] !== Ao || $[28] !== Ro) ((Ho = [Ao, Ro]), ($[27] = Ao), ($[28] = Ro), ($[29] = Ho));
  else Ho = $[29];
  let Io;
  if ($[30] !== onChoice || $[31] !== Lt)
    ((Io = (Wo) => {
      if (Lt()) {
        return;
      }
      if (Wo !== "cancelled") onChoice(Wo);
    }),
      ($[30] = onChoice),
      ($[31] = Lt),
      ($[32] = Io));
  else Io = $[32];
  let mn;
  if ($[33] !== Ho || $[34] !== Io || $[35] !== ao)
    ((mn = e(ModelSelector, { refuseInput: ao, selectedValue: "cancelled", options: Ho, onChange: Io })),
      ($[33] = Ho),
      ($[34] = Io),
      ($[35] = ao),
      ($[36] = mn));
  else mn = $[36];
  let Cn;
  if ($[37] !== mn || $[38] !== so || $[39] !== po)
    ((Cn = r(Box, { flexDirection: "column", gap: 1, children: [so, po, mn] })),
      ($[37] = mn),
      ($[38] = so),
      ($[39] = po),
      ($[40] = Cn));
  else Cn = $[40];
  return Cn;
}
//@ chunk-18hwfzwa.js:1259550-1259554 placement
j();
//@ chunk-18hwfzwa.js:1259554-1259603 placement
function jAo(He, We) {
  return e(Text, { children: He }, We);
}

export { jAo, UltraplanLaunchDialog };
