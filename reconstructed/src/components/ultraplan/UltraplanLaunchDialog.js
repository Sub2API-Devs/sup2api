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
import { y, fo, Qr, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { Dialog } from "../design-system/Dialog.js";
import { sanitizeOneLineLabel } from "../EffortMediumNudgeDialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-18hwfzwa.js:1254974-1255258 placement
async function isCcrBundleSeedEnabled() {
  let [currentRepositoryWithHost, x] = await Promise.all([
    detectCurrentRepositoryWithHost(),
    checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled"),
  ]);
  let D = findGitRoot(getCwd()) !== null && (env.CCR_ENABLE_BUNDLE || x);
  if (!D)
    return {
      cloneViable: false,
      bundleSeedEnabled: D,
    };
  return {
    cloneViable:
      currentRepositoryWithHost !== null &&
      !isNestedGitLabProject(currentRepositoryWithHost) &&
      (!isGithubDotCom(currentRepositoryWithHost.host) ||
        (await isGithubAppInstalled(currentRepositoryWithHost.owner, currentRepositoryWithHost.name))),
    bundleSeedEnabled: D,
  };
}
//@ chunk-18hwfzwa.js:1255258-1255303 placement = _temp2 (1)
function selectReplBridgeEnabled(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-18hwfzwa.js:1255303-1255329 placement
function getTermsState() {
  return TERMS_DEFAULT_STATE;
}
//@ chunk-18hwfzwa.js:1255329-1255542 placement
function ultraplanUploadNote(h) {
  if (!h.bundleSeedEnabled) return null;
  return h.cloneViable
    ? "This will try to clone your git remote and fall back to uploading this repository."
    : "This will upload your repository to a cloud session.";
}
//@ chunk-18hwfzwa.js:1255542-1255614 placement
var TERMS_DEFAULT_STATE = {
  cloneViable: false,
  bundleSeedEnabled: true,
};
var NOTHING_PRINTABLE_TEXT = "(nothing printable)";
//@ chunk-18hwfzwa.js:1255614-1257026 placement
function UltraplanLaunchDialog(props) {
  let $ = w(27);
  let { promptIdentifier, showTerms, prompt, deliveredByRelay, onDone, wouldTakeAnswer } = props;
  useRegisterOverlay("ultraplan-launch");
  let He;
  if ($[0] !== promptIdentifier) {
    He = getUltraplanCopy(promptIdentifier);
    $[0] = promptIdentifier;
    $[1] = He;
  } else He = $[1];
  let We = He;
  let replBridgeEnabled = useAppState(selectReplBridgeEnabled);
  let Xe;
  if ($[2] !== showTerms) {
    Xe = () => (showTerms ? isCcrBundleSeedEnabled().catch(getTermsState) : null);
    $[2] = showTerms;
    $[3] = Xe;
  } else Xe = $[3];
  let [rt] = y(Xe);
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let Ot;
  if ($[4] !== onDone) {
    Ot = function Dt(Et) {
      onDone(Et);
    };
    $[4] = onDone;
    $[5] = Ot;
  } else Ot = $[5];
  let Dt = Ot;
  let Lt;
  if (
    $[6] !== inputRefusalWindow ||
    $[7] !== noteRefused ||
    $[8] !== refusedWithin ||
    $[9] !== wouldTakeAnswer
  ) {
    Lt = function oo() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return wouldTakeAnswer?.() === false;
    };
    $[6] = inputRefusalWindow;
    $[7] = noteRefused;
    $[8] = refusedWithin;
    $[9] = wouldTakeAnswer;
    $[10] = Lt;
  } else Lt = $[10];
  let refuseInput = Lt;
  let onCancel;
  if ($[11] !== Dt) {
    onCancel = () => Dt("cancel");
    $[11] = Dt;
    $[12] = onCancel;
  } else onCancel = $[12];
  let fallback;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Loading\u2026",
    });
    $[13] = fallback;
  } else fallback = $[13];
  let children;
  if (
    $[14] !== Dt ||
    $[15] !== We ||
    $[16] !== deliveredByRelay ||
    $[17] !== prompt ||
    $[18] !== refuseInput ||
    $[19] !== replBridgeEnabled ||
    $[20] !== showTerms ||
    $[21] !== rt
  ) {
    children = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(UltraplanLaunchBody, {
        showTerms,
        prompt,
        deliveredByRelay,
        sourcePromise: rt,
        copy: We,
        replBridgeEnabled,
        onChoice: Dt,
        refuseInput,
      }),
    });
    $[14] = Dt;
    $[15] = We;
    $[16] = deliveredByRelay;
    $[17] = prompt;
    $[18] = refuseInput;
    $[19] = replBridgeEnabled;
    $[20] = showTerms;
    $[21] = rt;
    $[22] = children;
  } else children = $[22];
  let po;
  if ($[23] !== We.timeEstimate || $[24] !== onCancel || $[25] !== children) {
    po = jsxProd_default(Dialog, {
      title: "Run ultraplan in the cloud?",
      subtitle: We.timeEstimate,
      onCancel,
      children,
    });
    $[23] = We.timeEstimate;
    $[24] = onCancel;
    $[25] = children;
    $[26] = po;
  } else po = $[26];
  return po;
}
//@ chunk-18hwfzwa.js:1257026-1259550 placement
function UltraplanLaunchBody(props) {
  let $ = w(41);
  let { showTerms, prompt, deliveredByRelay, sourcePromise, copy, replBridgeEnabled, onChoice, refuseInput } =
    props;
  let We = sourcePromise ? Qr(sourcePromise) : null;
  let Xe;
  if ($[0] !== We) {
    Xe = We && ultraplanUploadNote(We);
    $[0] = We;
    $[1] = Xe;
  } else Xe = $[1];
  let rt = Xe;
  let kt;
  if ($[2] !== prompt) {
    kt = sanitizeOneLineLabel(prompt);
    $[2] = prompt;
    $[3] = kt;
  } else kt = $[3];
  let At = kt;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let Dt;
  if ($[4] !== inputRefusalWindow || $[5] !== noteRefused || $[6] !== refusedWithin) {
    Dt = function Lt() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[4] = inputRefusalWindow;
    $[5] = noteRefused;
    $[6] = refusedWithin;
    $[7] = Dt;
  } else Dt = $[7];
  let Lt = Dt;
  const children = deliveredByRelay ? "Prompt (sent from a connected channel): " : "Prompt: ";
  let Xt;
  if ($[8] !== children) {
    Xt = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[8] = children;
    $[9] = Xt;
  } else Xt = $[9];
  const io = At === "" ? NOTHING_PRINTABLE_TEXT : At;
  let so;
  if ($[10] !== Xt || $[11] !== io) {
    so = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [Xt, io],
    });
    $[10] = Xt;
    $[11] = io;
    $[12] = so;
  } else so = $[12];
  let po;
  if (
    $[13] !== copy.dialogBody ||
    $[14] !== copy.dialogPipeline ||
    $[15] !== replBridgeEnabled ||
    $[16] !== showTerms ||
    $[17] !== rt
  ) {
    po = showTerms
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: copy.dialogBody,
            }),
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                rt &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: rt,
                  }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "More information: ",
                    jsxProd_default(Link, {
                      url: CCR_TERMS_URL_ULTRAPLAN,
                      children: CCR_TERMS_URL_ULTRAPLAN,
                    }),
                  ],
                }),
              ],
            }),
            jsxProd_default(Text, {
              children: "Proceed?",
            }),
          ],
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: copy.dialogBody,
                }),
                replBridgeEnabled &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "This will disable Remote Control for this session.",
                  }),
              ],
            }),
            !replBridgeEnabled &&
              jsxProd_default(Text, {
                dimColor: true,
                children: copy.dialogPipeline,
              }),
          ],
        });
    $[13] = copy.dialogBody;
    $[14] = copy.dialogPipeline;
    $[15] = replBridgeEnabled;
    $[16] = showTerms;
    $[17] = rt;
    $[18] = po;
  } else po = $[18];
  let refuseInput_2;
  if ($[19] !== Lt || $[20] !== refuseInput) {
    refuseInput_2 = () => Lt() || refuseInput();
    $[19] = Lt;
    $[20] = refuseInput;
    $[21] = refuseInput_2;
  } else refuseInput_2 = $[21];
  const label = showTerms ? "Yes" : "Run ultraplan";
  const description = replBridgeEnabled
    ? "Disable remote control and launch in a cloud session"
    : "launch in a cloud session";
  let Ao;
  if ($[22] !== label || $[23] !== description) {
    Ao = {
      label,
      value: "run",
      description,
    };
    $[22] = label;
    $[23] = description;
    $[24] = Ao;
  } else Ao = $[24];
  const label_2 = showTerms ? "No" : "Not now";
  let Ro;
  if ($[25] !== label_2) {
    Ro = {
      label: label_2,
      value: "cancel",
    };
    $[25] = label_2;
    $[26] = Ro;
  } else Ro = $[26];
  let options;
  if ($[27] !== Ao || $[28] !== Ro) {
    options = [Ao, Ro];
    $[27] = Ao;
    $[28] = Ro;
    $[29] = options;
  } else options = $[29];
  let onChange;
  if ($[30] !== onChoice || $[31] !== Lt) {
    onChange = (Wo) => {
      if (Lt()) {
        return;
      }
      if (Wo !== "cancelled") onChoice(Wo);
    };
    $[30] = onChoice;
    $[31] = Lt;
    $[32] = onChange;
  } else onChange = $[32];
  let mn;
  if ($[33] !== options || $[34] !== onChange || $[35] !== refuseInput_2) {
    mn = jsxProd_default(ModelSelector, {
      refuseInput: refuseInput_2,
      selectedValue: "cancelled",
      options,
      onChange,
    });
    $[33] = options;
    $[34] = onChange;
    $[35] = refuseInput_2;
    $[36] = mn;
  } else mn = $[36];
  let Cn;
  if ($[37] !== mn || $[38] !== so || $[39] !== po) {
    Cn = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [so, po, mn],
    });
    $[37] = mn;
    $[38] = so;
    $[39] = po;
    $[40] = Cn;
  } else Cn = $[40];
  return Cn;
}
//@ chunk-18hwfzwa.js:1259550-1259554 placement
init_react_production();
//@ chunk-18hwfzwa.js:1259554-1259603 placement
function renderPlainText(children, We) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    We,
  );
}
export { renderPlainText, UltraplanLaunchDialog };
