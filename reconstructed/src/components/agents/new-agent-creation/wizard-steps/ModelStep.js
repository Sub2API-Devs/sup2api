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
import { init_react_production, R } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
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
  let $ = w(34);
  let { forwarded, stayed, consentLocation, onDone } = props;
  let p = R(false);
  let M;
  if ($[0] !== consentLocation) {
    M = truncatePathMiddle(consentLocation.replace(/\s+/g, " "), MAX_CONSENT_PATH_WIDTH);
    $[0] = consentLocation;
    $[1] = M;
  } else M = $[1];
  let children = M;
  let T;
  if ($[2] !== onDone) {
    T = function f(model) {
      if (p.current) {
        return;
      }
      p.current = true;
      onDone(model);
    };
    $[2] = onDone;
    $[3] = T;
  } else T = $[3];
  let f = T;
  let y;
  if ($[4] !== forwarded) {
    y = forwarded > 0 ? [`${forwarded} plugin ${plural(forwarded, "choice")} would be sent`] : [];
    $[4] = forwarded;
    $[5] = y;
  } else y = $[5];
  let C;
  if ($[6] !== forwarded || $[7] !== stayed) {
    C =
      stayed > 0
        ? [
            `${stayed} ${forwarded > 0 ? "" : `plugin ${plural(stayed, "choice")} `}would stay on this machine (you are told which, and why, when a session starts)`,
          ]
        : [];
    $[6] = forwarded;
    $[7] = stayed;
    $[8] = C;
  } else C = $[8];
  let V;
  if ($[9] !== y || $[10] !== C) {
    V = [...y, ...C];
    $[9] = y;
    $[10] = C;
    $[11] = V;
  } else V = $[11];
  let joined = V.join("; ");
  let onCancel;
  if ($[12] !== f) {
    onCancel = () => f("not_now");
    $[12] = f;
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
  let G;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    G = jsxProd_default(Text, {
      children:
        "A cloud session normally loads only the repository's and your organization's plugins. If you say yes, each cloud session you start or attach to from this machine is also told which plugins you have turned on or off here for its folder \u2014 their names, and the address of any marketplace they come from on GitHub, in a git repository or at a URL \u2014 and installs the enabled ones itself. Saying yes sends nothing else: no plugin files, no other settings, no credentials, no local paths.",
    });
    $[15] = G;
  } else G = $[15];
  let v;
  if ($[16] !== joined) {
    v =
      joined !== "" &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Right now: ", joined, "."],
      });
    $[16] = joined;
    $[17] = v;
  } else v = $[17];
  let I;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    I = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Yes and No are saved for this machine; run /cloud-plugins again to change your answer. Not now decides nothing. The answer is kept in:",
    });
    $[18] = I;
  } else I = $[18];
  let D;
  if ($[19] !== children) {
    D = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        I,
        jsxProd_default(Text, {
          dimColor: true,
          children,
        }),
      ],
    });
    $[19] = children;
    $[20] = D;
  } else D = $[20];
  let k;
  if ($[21] !== D || $[22] !== v) {
    k = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [G, v, D],
    });
    $[21] = D;
    $[22] = v;
    $[23] = k;
  } else k = $[23];
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
  if ($[25] !== f) {
    onCancel_2 = () => f("not_now");
    $[25] = f;
    $[26] = onCancel_2;
  } else onCancel_2 = $[26];
  let L;
  if ($[27] !== f || $[28] !== onCancel_2) {
    L = jsxProd_default(ModelSelector, {
      options,
      defaultFocusValue: "not_now",
      onChange: f,
      onCancel: onCancel_2,
    });
    $[27] = f;
    $[28] = onCancel_2;
    $[29] = L;
  } else L = $[29];
  let U;
  if ($[30] !== k || $[31] !== L || $[32] !== onCancel) {
    U = jsxProd_default_2(Dialog, {
      title: "Use your enabled plugins in cloud sessions you run from this machine?",
      onCancel,
      isCancelActive: false,
      inputGuide,
      children: [k, L],
    });
    $[30] = k;
    $[31] = L;
    $[32] = onCancel;
    $[33] = U;
  } else U = $[33];
  return U;
}
export { ModelStep };
