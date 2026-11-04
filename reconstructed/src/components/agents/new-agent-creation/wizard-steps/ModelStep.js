/**
 * components/agents/new-agent-creation/wizard-steps/ModelStep.tsx
 *
 * 向导模型步骤；实际内容为数据发送/本地保留的选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/ModelStep.tsx
 * pieces: chunk-n30mmv2p.js (3)
 * attribution: placement 1, layout 1, callgraph-witnessed 1
 */
import { init_react_production, useRef } from "../../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { truncatePathMiddle } from "../../../../utils/format.js";
import { plural } from "../../../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { ModelSelector } from "../../ModelSelector.js";
import { Dialog } from "../../../design-system/Dialog.js";

//@ chunk-n30mmv2p.js:13828-13832 placement
init_react_production();
//@ chunk-n30mmv2p.js:13832-13841 layout
var MAX_CONSENT_PATH_WIDTH = 72;
//@ chunk-n30mmv2p.js:13841-16519 callgraph-witnessed = ModelStep (0.158)
function ModelStep(props) {
  let $ = useMemoCache(34);
  let { forwarded, stayed, consentLocation, onDone } = props;
  let answeredRef = useRef(false);
  let pathText;
  if ($[0] !== consentLocation) {
    pathText = truncatePathMiddle(consentLocation.replace(/\s+/g, " "), MAX_CONSENT_PATH_WIDTH);
    $[0] = consentLocation;
    $[1] = pathText;
  } else pathText = $[1];
  let children = pathText;
  let finish;
  if ($[2] !== onDone) {
    finish = function model(model) {
      if (answeredRef.current) {
        return;
      }
      answeredRef.current = true;
      onDone(model);
    };
    $[2] = onDone;
    $[3] = finish;
  } else finish = $[3];
  let handleDone = finish;
  let forwardedLines;
  if ($[4] !== forwarded) {
    forwardedLines =
      forwarded > 0 ? [`${forwarded} plugin ${plural(forwarded, "choice")} would be sent`] : [];
    $[4] = forwarded;
    $[5] = forwardedLines;
  } else forwardedLines = $[5];
  let stayedLines;
  if ($[6] !== forwarded || $[7] !== stayed) {
    stayedLines =
      stayed > 0
        ? [
            `${stayed} ${forwarded > 0 ? "" : `plugin ${plural(stayed, "choice")} `}would stay on this machine (you are told which, and why, when a session starts)`,
          ]
        : [];
    $[6] = forwarded;
    $[7] = stayed;
    $[8] = stayedLines;
  } else stayedLines = $[8];
  let summaryLines;
  if ($[9] !== forwardedLines || $[10] !== stayedLines) {
    summaryLines = [...forwardedLines, ...stayedLines];
    $[9] = forwardedLines;
    $[10] = stayedLines;
    $[11] = summaryLines;
  } else summaryLines = $[11];
  let joined = summaryLines.join("; ");
  let onCancel;
  if ($[12] !== handleDone) {
    onCancel = () => handleDone("not_now");
    $[12] = handleDone;
    $[13] = onCancel;
  } else onCancel = $[13];
  let inputGuide;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "not now",
        }),
      ],
    });
    $[14] = inputGuide;
  } else inputGuide = $[14];
  let explainText;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    explainText = jsxProd_default(Text, {
      children:
        "A cloud session normally loads only the repository's and your organization's plugins. If you say yes, each cloud session you start or attach to from this machine is also told which plugins you have turned on or off here for its folder \u2014 their names, and the address of any marketplace they come from on GitHub, in a git repository or at a URL \u2014 and installs the enabled ones itself. Saying yes sends nothing else: no plugin files, no other settings, no credentials, no local paths.",
    });
    $[15] = explainText;
  } else explainText = $[15];
  let currentLine;
  if ($[16] !== joined) {
    currentLine =
      joined !== "" &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Right now: ", joined, "."],
      });
    $[16] = joined;
    $[17] = currentLine;
  } else currentLine = $[17];
  let answerNote;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    answerNote = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Yes and No are saved for this machine; run /cloud-plugins again to change your answer. Not now decides nothing. The answer is kept in:",
    });
    $[18] = answerNote;
  } else answerNote = $[18];
  let answerBox;
  if ($[19] !== children) {
    answerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        answerNote,
        jsxProd_default(Text, {
          dimColor: true,
          children,
        }),
      ],
    });
    $[19] = children;
    $[20] = answerBox;
  } else answerBox = $[20];
  let bodyBox;
  if ($[21] !== answerBox || $[22] !== currentLine) {
    bodyBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [explainText, currentLine, answerBox],
    });
    $[21] = answerBox;
    $[22] = currentLine;
    $[23] = bodyBox;
  } else bodyBox = $[23];
  let options;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Yes, use my enabled plugins in cloud sessions",
        value: "accepted",
      },
      {
        label: "No, keep them on this machine only",
        value: "declined",
      },
      {
        label: "Not now",
        value: "not_now",
      },
    ];
    $[24] = options;
  } else options = $[24];
  let onCancel_2;
  if ($[25] !== handleDone) {
    onCancel_2 = () => handleDone("not_now");
    $[25] = handleDone;
    $[26] = onCancel_2;
  } else onCancel_2 = $[26];
  let selector;
  if ($[27] !== handleDone || $[28] !== onCancel_2) {
    selector = jsxProd_default(ModelSelector, {
      options,
      defaultFocusValue: "not_now",
      onChange: handleDone,
      onCancel: onCancel_2,
    });
    $[27] = handleDone;
    $[28] = onCancel_2;
    $[29] = selector;
  } else selector = $[29];
  let dialog;
  if ($[30] !== bodyBox || $[31] !== selector || $[32] !== onCancel) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Use your enabled plugins in cloud sessions you run from this machine?",
      onCancel,
      isCancelActive: false,
      inputGuide,
      children: [bodyBox, selector],
    });
    $[30] = bodyBox;
    $[31] = selector;
    $[32] = onCancel;
    $[33] = dialog;
  } else dialog = $[33];
  return dialog;
}
export { ModelStep };
