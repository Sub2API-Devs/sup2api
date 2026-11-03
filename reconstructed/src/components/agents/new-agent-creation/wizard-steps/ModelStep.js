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
import { j, R } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { truncatePathMiddle } from "../../../../utils/format.js";
import { plural } from "../../../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { ModelSelector } from "../../ModelSelector.js";
import { Dialog } from "../../../design-system/Dialog.js";

//@ chunk-n30mmv2p.js:13828-13832 placement
j();
//@ chunk-n30mmv2p.js:13832-13841 layout
var B = 72;
//@ chunk-n30mmv2p.js:13841-16519 callgraph-witnessed = ModelStep (0.158)
function ModelStep(u) {
  let $ = w(34),
    { forwarded: forwarded, stayed: stayed, consentLocation: consentLocation, onDone: onDone } = u,
    p = R(!1),
    M;
  if ($[0] !== consentLocation)
    ((M = truncatePathMiddle(consentLocation.replace(/\s+/g, " "), B)), ($[0] = consentLocation), ($[1] = M));
  else M = $[1];
  let z = M,
    T;
  if ($[2] !== onDone)
    ((T = function f(model) {
      if (p.current) {
        return;
      }
      ((p.current = !0), onDone(model));
    }),
      ($[2] = onDone),
      ($[3] = T));
  else T = $[3];
  let f = T,
    y;
  if ($[4] !== forwarded)
    ((y = forwarded > 0 ? [`${forwarded} plugin ${plural(forwarded, "choice")} would be sent`] : []),
      ($[4] = forwarded),
      ($[5] = y));
  else y = $[5];
  let C;
  if ($[6] !== forwarded || $[7] !== stayed)
    ((C =
      stayed > 0
        ? [
            `${stayed} ${forwarded > 0 ? "" : `plugin ${plural(stayed, "choice")} `}would stay on this machine (you are told which, and why, when a session starts)`,
          ]
        : []),
      ($[6] = forwarded),
      ($[7] = stayed),
      ($[8] = C));
  else C = $[8];
  let V;
  if ($[9] !== y || $[10] !== C) ((V = [...y, ...C]), ($[9] = y), ($[10] = C), ($[11] = V));
  else V = $[11];
  let joined = V.join("; "),
    b;
  if ($[12] !== f) ((b = () => f("not_now")), ($[12] = f), ($[13] = b));
  else b = $[13];
  let Y;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((Y = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "not now",
        }),
      ],
    })),
      ($[14] = Y));
  else Y = $[14];
  let G;
  if ($[15] === MEMO_CACHE_SENTINEL)
    ((G = e(Text, {
      children:
        "A cloud session normally loads only the repository's and your organization's plugins. If you say yes, each cloud session you start or attach to from this machine is also told which plugins you have turned on or off here for its folder \u2014 their names, and the address of any marketplace they come from on GitHub, in a git repository or at a URL \u2014 and installs the enabled ones itself. Saying yes sends nothing else: no plugin files, no other settings, no credentials, no local paths.",
    })),
      ($[15] = G));
  else G = $[15];
  let v;
  if ($[16] !== joined)
    ((v = joined !== "" && r(Text, { dimColor: !0, children: ["Right now: ", joined, "."] })),
      ($[16] = joined),
      ($[17] = v));
  else v = $[17];
  let I;
  if ($[18] === MEMO_CACHE_SENTINEL)
    ((I = e(Text, {
      dimColor: !0,
      children:
        "Yes and No are saved for this machine; run /cloud-plugins again to change your answer. Not now decides nothing. The answer is kept in:",
    })),
      ($[18] = I));
  else I = $[18];
  let D;
  if ($[19] !== z)
    ((D = r(Box, { flexDirection: "column", children: [I, e(Text, { dimColor: !0, children: z })] })),
      ($[19] = z),
      ($[20] = D));
  else D = $[20];
  let k;
  if ($[21] !== D || $[22] !== v)
    ((k = r(Box, { flexDirection: "column", gap: 1, children: [G, v, D] })),
      ($[21] = D),
      ($[22] = v),
      ($[23] = k));
  else k = $[23];
  let J;
  if ($[24] === MEMO_CACHE_SENTINEL)
    ((J = [
      { label: "Yes, use my enabled plugins in cloud sessions", value: "accepted" },
      { label: "No, keep them on this machine only", value: "declined" },
      { label: "Not now", value: "not_now" },
    ]),
      ($[24] = J));
  else J = $[24];
  let N;
  if ($[25] !== f) ((N = () => f("not_now")), ($[25] = f), ($[26] = N));
  else N = $[26];
  let L;
  if ($[27] !== f || $[28] !== N)
    ((L = e(ModelSelector, { options: J, defaultFocusValue: "not_now", onChange: f, onCancel: N })),
      ($[27] = f),
      ($[28] = N),
      ($[29] = L));
  else L = $[29];
  let U;
  if ($[30] !== k || $[31] !== L || $[32] !== b)
    ((U = r(Dialog, {
      title: "Use your enabled plugins in cloud sessions you run from this machine?",
      onCancel: b,
      isCancelActive: !1,
      inputGuide: Y,
      children: [k, L],
    })),
      ($[30] = k),
      ($[31] = L),
      ($[32] = b),
      ($[33] = U));
  else U = $[33];
  return U;
}

export { ModelStep };
