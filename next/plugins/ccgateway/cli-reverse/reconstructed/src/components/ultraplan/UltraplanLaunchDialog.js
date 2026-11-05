/**
 * components/ultraplan/UltraplanLaunchDialog.tsx
 *
 * 2.1.316 新增。ultraplan 启动对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: placement 9
 */
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import { detectCurrentRepositoryWithHost, isNestedGitLabProject } from "../../utils/detectRepository.js";
import { checkGate_CACHED_OR_BLOCKING } from "../../services/analytics/growthbook.js";
import { findGitRoot } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { env } from "../../utils/env.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { isGithubAppInstalled } from "../../utils/background/remote/preconditions.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { getUltraplanCopy, CCR_TERMS_URL_ULTRAPLAN } from "../../commands/ultraplan.js";
import { useAppState } from "../../state/AppState.js";
import { useRecentInputWithin, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1278029-1278033 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1278029", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1280727-1281011 placement
async function isCcrBundleSeedEnabled() {
  let [currentRepositoryWithHost, bundleSeedGate] = await Promise.all([
    detectCurrentRepositoryWithHost(),
    checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled"),
  ]);
  let bundleSeedEnabled = findGitRoot(getCwd()) !== null && (env.CCR_ENABLE_BUNDLE || bundleSeedGate);
  if (!bundleSeedEnabled)
    return {
      cloneViable: false,
      bundleSeedEnabled,
    };
  return {
    cloneViable:
      currentRepositoryWithHost !== null &&
      !isNestedGitLabProject(currentRepositoryWithHost) &&
      (!isGithubDotCom(currentRepositoryWithHost.host) ||
        (await isGithubAppInstalled(currentRepositoryWithHost.owner, currentRepositoryWithHost.name))),
    bundleSeedEnabled,
  };
}
//@ chunk-czq1j3j2.js:1281011-1281056 placement (2.1.88 match: _temp2, 1)
function selectReplBridgeEnabled(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-czq1j3j2.js:1281056-1281082 placement
function getTermsState() {
  return TERMS_DEFAULT_STATE;
}
//@ chunk-czq1j3j2.js:1281082-1281295 placement
function ultraplanUploadNote(sourceState) {
  if (!sourceState.bundleSeedEnabled) return null;
  return sourceState.cloneViable
    ? "This will try to clone your git remote and fall back to uploading this repository."
    : "This will upload your repository to a cloud session.";
}
//@ chunk-czq1j3j2.js:1281295-1281367 placement
var TERMS_DEFAULT_STATE = {
  cloneViable: false,
  bundleSeedEnabled: true,
};
var NOTHING_PRINTABLE_TEXT = "(nothing printable)";
//@ chunk-czq1j3j2.js:1281367-1282779 placement
function UltraplanLaunchDialog(props) {
  let $ = useMemoCache(27);
  let { promptIdentifier, showTerms, prompt, deliveredByRelay, onDone, wouldTakeAnswer } = props;
  useRegisterOverlay("ultraplan-launch");
  let copy;
  if ($[0] !== promptIdentifier) {
    copy = getUltraplanCopy(promptIdentifier);
    $[0] = promptIdentifier;
    $[1] = copy;
  } else copy = $[1];
  let copy_ = copy;
  let replBridgeEnabled = useAppState(selectReplBridgeEnabled);
  let loadSourceState;
  if ($[2] !== showTerms) {
    loadSourceState = () => (showTerms ? isCcrBundleSeedEnabled().catch(getTermsState) : null);
    $[2] = showTerms;
    $[3] = loadSourceState;
  } else loadSourceState = $[3];
  let [sourcePromise] = useState(loadSourceState);
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let handleChoice;
  if ($[4] !== onDone) {
    handleChoice = function onChoice(choice) {
      onDone(choice);
    };
    $[4] = onDone;
    $[5] = handleChoice;
  } else handleChoice = $[5];
  let onChoice_ = handleChoice;
  let refuseInput;
  if ($[6] !== isRecentInput || $[7] !== noteRefused || $[8] !== refusedWithin || $[9] !== wouldTakeAnswer) {
    refuseInput = function refuseInput_() {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return wouldTakeAnswer?.() === false;
    };
    $[6] = isRecentInput;
    $[7] = noteRefused;
    $[8] = refusedWithin;
    $[9] = wouldTakeAnswer;
    $[10] = refuseInput;
  } else refuseInput = $[10];
  let refuseInput_2 = refuseInput;
  let onCancel;
  if ($[11] !== onChoice_) {
    onCancel = () => onChoice_("cancel");
    $[11] = onChoice_;
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
    $[14] !== onChoice_ ||
    $[15] !== copy_ ||
    $[16] !== deliveredByRelay ||
    $[17] !== prompt ||
    $[18] !== refuseInput_2 ||
    $[19] !== replBridgeEnabled ||
    $[20] !== showTerms ||
    $[21] !== sourcePromise
  ) {
    children = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(UltraplanLaunchBody, {
        showTerms,
        prompt,
        deliveredByRelay,
        sourcePromise,
        copy: copy_,
        replBridgeEnabled,
        onChoice: onChoice_,
        refuseInput: refuseInput_2,
      }),
    });
    $[14] = onChoice_;
    $[15] = copy_;
    $[16] = deliveredByRelay;
    $[17] = prompt;
    $[18] = refuseInput_2;
    $[19] = replBridgeEnabled;
    $[20] = showTerms;
    $[21] = sourcePromise;
    $[22] = children;
  } else children = $[22];
  let dialogElement;
  if ($[23] !== copy_.timeEstimate || $[24] !== onCancel || $[25] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Run ultraplan in the cloud?",
      subtitle: copy_.timeEstimate,
      onCancel,
      children,
    });
    $[23] = copy_.timeEstimate;
    $[24] = onCancel;
    $[25] = children;
    $[26] = dialogElement;
  } else dialogElement = $[26];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:1282779-1285305 placement
function UltraplanLaunchBody(props) {
  let $ = useMemoCache(41);
  let { showTerms, prompt, deliveredByRelay, sourcePromise, copy, replBridgeEnabled, onChoice, refuseInput } =
    props;
  let sourceState = sourcePromise ? use(sourcePromise) : null;
  let uploadNote;
  if ($[0] !== sourceState) {
    uploadNote = sourceState && ultraplanUploadNote(sourceState);
    $[0] = sourceState;
    $[1] = uploadNote;
  } else uploadNote = $[1];
  let uploadNote_ = uploadNote;
  let promptLabel;
  if ($[2] !== prompt) {
    promptLabel = sanitizeOneLineLabel(prompt);
    $[2] = prompt;
    $[3] = promptLabel;
  } else promptLabel = $[3];
  let promptText = promptLabel;
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let isInputRefused;
  if ($[4] !== isRecentInput || $[5] !== noteRefused || $[6] !== refusedWithin) {
    isInputRefused = function isInputRefused_() {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[4] = isRecentInput;
    $[5] = noteRefused;
    $[6] = refusedWithin;
    $[7] = isInputRefused;
  } else isInputRefused = $[7];
  let refuseInputLocal = isInputRefused;
  const children = deliveredByRelay ? "Prompt (sent from a connected channel): " : "Prompt: ";
  let promptLabelElement;
  if ($[8] !== children) {
    promptLabelElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[8] = children;
    $[9] = promptLabelElement;
  } else promptLabelElement = $[9];
  const promptDisplay = promptText === "" ? NOTHING_PRINTABLE_TEXT : promptText;
  let promptElement;
  if ($[10] !== promptLabelElement || $[11] !== promptDisplay) {
    promptElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [promptLabelElement, promptDisplay],
    });
    $[10] = promptLabelElement;
    $[11] = promptDisplay;
    $[12] = promptElement;
  } else promptElement = $[12];
  let bodyElement;
  if (
    $[13] !== copy.dialogBody ||
    $[14] !== copy.dialogPipeline ||
    $[15] !== replBridgeEnabled ||
    $[16] !== showTerms ||
    $[17] !== uploadNote_
  ) {
    bodyElement = showTerms
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: copy.dialogBody,
            }),
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                uploadNote_ &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: uploadNote_,
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
    $[17] = uploadNote_;
    $[18] = bodyElement;
  } else bodyElement = $[18];
  let refuseInput_2;
  if ($[19] !== refuseInputLocal || $[20] !== refuseInput) {
    refuseInput_2 = () => refuseInputLocal() || refuseInput();
    $[19] = refuseInputLocal;
    $[20] = refuseInput;
    $[21] = refuseInput_2;
  } else refuseInput_2 = $[21];
  const label = showTerms ? "Yes" : "Run ultraplan";
  const description = replBridgeEnabled
    ? "Disable remote control and launch in a cloud session"
    : "launch in a cloud session";
  let runOption;
  if ($[22] !== label || $[23] !== description) {
    runOption = {
      label,
      value: "run",
      description,
    };
    $[22] = label;
    $[23] = description;
    $[24] = runOption;
  } else runOption = $[24];
  const label_2 = showTerms ? "No" : "Not now";
  let cancelOption;
  if ($[25] !== label_2) {
    cancelOption = {
      label: label_2,
      value: "cancel",
    };
    $[25] = label_2;
    $[26] = cancelOption;
  } else cancelOption = $[26];
  let options;
  if ($[27] !== runOption || $[28] !== cancelOption) {
    options = [runOption, cancelOption];
    $[27] = runOption;
    $[28] = cancelOption;
    $[29] = options;
  } else options = $[29];
  let onChange;
  if ($[30] !== onChoice || $[31] !== refuseInputLocal) {
    onChange = (value) => {
      if (refuseInputLocal()) {
        return;
      }
      if (value !== "cancelled") onChoice(value);
    };
    $[30] = onChoice;
    $[31] = refuseInputLocal;
    $[32] = onChange;
  } else onChange = $[32];
  let selectorElement;
  if ($[33] !== options || $[34] !== onChange || $[35] !== refuseInput_2) {
    selectorElement = jsxProd_default(ModelSelector, {
      refuseInput: refuseInput_2,
      selectedValue: "cancelled",
      options,
      onChange,
    });
    $[33] = options;
    $[34] = onChange;
    $[35] = refuseInput_2;
    $[36] = selectorElement;
  } else selectorElement = $[36];
  let bodyElement_;
  if ($[37] !== selectorElement || $[38] !== promptElement || $[39] !== bodyElement) {
    bodyElement_ = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [promptElement, bodyElement, selectorElement],
    });
    $[37] = selectorElement;
    $[38] = promptElement;
    $[39] = bodyElement;
    $[40] = bodyElement_;
  } else bodyElement_ = $[40];
  return bodyElement_;
}
//@ chunk-czq1j3j2.js:1285309-1285358 placement
function renderPlainText(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
export { renderPlainText, UltraplanLaunchDialog };
