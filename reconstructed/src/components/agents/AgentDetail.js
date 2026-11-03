/**
 * components/agents/AgentDetail.tsx
 *
 * 子代理详情视图；本模块实际内容为安装/验证流程（initial/installing/verifying/success），疑似匹配错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentDetail.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { y, P, R } from "../../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  detectPythonPackageManager,
  verifyIt2Setup,
  markIt2SetupComplete,
  installIt2,
  setPreferTmuxOverIterm2,
} from "../../utils/swarm/backends/it2Setup.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  It2InstallPrompt,
  It2Installing,
  It2SetupPrompt,
  It2InstalledSuccess,
  It2Verifying,
  It2SplitPaneReady,
  It2SetupError,
} from "../../utils/swarm/It2SetupPrompt.js";
import { AgentNavigationFooter } from "./AgentNavigationFooter.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Pane } from "../design-system/Pane.js";

//@ chunk-18hwfzwa.js:1259603-1264443 callgraph-fingerprint = AgentDetail (0.23)
function AgentDetail(t0) {
  let $ = w(92),
    { onDone: onDone, tmuxAvailable: tmuxAvailable, wouldTakeAnswer: wouldTakeAnswer } = t0,
    { storageV5: storageV5 } = Me(),
    [ke, Re] = y("initial"),
    [Be, He] = y(null),
    [We, ze] = y(null),
    Xe = useInputClock(),
    [rt, kt] = y(ke),
    [At, It] = y(0);
  if (rt !== ke) (kt(ke), It(Date.now()));
  let Ot = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    oo;
  if ($[0] !== Xe || $[1] !== At)
    ((oo = () => At !== 0 && isWithinRecentInput(Xe, At)), ($[0] = Xe), ($[1] = At), ($[2] = oo));
  else oo = $[2];
  let Xt = oo,
    io;
  if ($[3] !== Ot || $[4] !== noteRefused || $[5] !== refusedWithin || $[6] !== Xt)
    ((io = function so() {
      if (Ot() || Xt() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[3] = Ot),
      ($[4] = noteRefused),
      ($[5] = refusedWithin),
      ($[6] = Xt),
      ($[7] = io));
  else io = $[7];
  let so = io,
    po,
    ao;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((po = () => {
      detectPythonPackageManager().then((co) => {
        He(co);
      });
    }),
      (ao = []),
      ($[8] = po),
      ($[9] = ao));
  else ((po = $[8]), (ao = $[9]));
  P(po, ao);
  let bo = R(!1),
    Ao = R(!1),
    Bo = R(!1),
    Ro;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((Ro = () => {
      bo.current = !1;
    }),
      ($[10] = Ro));
  else Ro = $[10];
  P(Ro);
  let Ho;
  if ($[11] !== Ot || $[12] !== noteRefused || $[13] !== onDone || $[14] !== refusedWithin || $[15] !== Xt)
    ((Ho = () => {
      if (Ot() || Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (onDone("cancelled")) Ao.current = !0;
    }),
      ($[11] = Ot),
      ($[12] = noteRefused),
      ($[13] = onDone),
      ($[14] = refusedWithin),
      ($[15] = Xt),
      ($[16] = Ho));
  else Ho = $[16];
  let Io = Ho;
  const Wo = ke !== "installing" && ke !== "verifying" && ke !== "success";
  let mn;
  if ($[17] !== Wo) ((mn = { context: "Confirmation", isActive: Wo }), ($[17] = Wo), ($[18] = mn));
  else mn = $[18];
  useKeybinding("confirm:no", Io, mn);
  let Cn;
  if ($[19] !== onDone)
    ((Cn = () => {
      ((Ao.current = !0), onDone("installed"));
    }),
      ($[19] = onDone),
      ($[20] = Cn));
  else Cn = $[20];
  useTimeout(Cn, ke === "success" ? 1500 : null);
  let No;
  if (
    $[21] !== noteRefused ||
    $[22] !== refusedWithin ||
    $[23] !== Xt ||
    $[24] !== storageV5 ||
    $[25] !== wouldTakeAnswer
  )
    ((No = function Yo() {
      if (Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (bo.current) {
        return;
      }
      ((bo.current = !0),
        Re("verifying"),
        verifyIt2Setup().then((vo) => {
          if (vo.success) (markIt2SetupComplete(storageV5), Re("success"));
          else (ze(vo.error), Re("failed"));
        }));
    }),
      ($[21] = noteRefused),
      ($[22] = refusedWithin),
      ($[23] = Xt),
      ($[24] = storageV5),
      ($[25] = wouldTakeAnswer),
      ($[26] = No));
  else No = $[26];
  let Yo = No,
    kn;
  if ($[27] !== Yo || $[28] !== ke)
    ((kn = function bn(Fn) {
      if (ke === "api-instructions" && Fn.key === "return") (Fn.preventDefault(), Yo());
    }),
      ($[27] = Yo),
      ($[28] = ke),
      ($[29] = kn));
  else kn = $[29];
  let bn = kn,
    Go;
  if (
    $[30] !== Ot ||
    $[31] !== noteRefused ||
    $[32] !== Be ||
    $[33] !== refusedWithin ||
    $[34] !== Xt ||
    $[35] !== wouldTakeAnswer
  )
    ((Go = async function Xo() {
      if (Ot() || Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (bo.current || Bo.current) {
        return;
      }
      let hn = Be;
      if (!hn) {
        if (
          ((Bo.current = !0),
          (hn = await detectPythonPackageManager()),
          (Bo.current = !1),
          Ao.current || !wouldTakeAnswer())
        ) {
          return;
        }
      }
      if (!hn) {
        (ze("No Python package manager found (uvx, pipx, or pip)"), Re("install-failed"));
        return;
      }
      if (hn !== Be) He(hn);
      ((bo.current = !0), Re("installing"));
      let Mn = await installIt2(hn);
      if (Mn.success) Re("api-instructions");
      else (ze(Mn.error), Re("install-failed"));
    }),
      ($[30] = Ot),
      ($[31] = noteRefused),
      ($[32] = Be),
      ($[33] = refusedWithin),
      ($[34] = Xt),
      ($[35] = wouldTakeAnswer),
      ($[36] = Go));
  else Go = $[36];
  let Xo = Go,
    Sn;
  if (
    $[37] !== Ot ||
    $[38] !== noteRefused ||
    $[39] !== onDone ||
    $[40] !== refusedWithin ||
    $[41] !== Xt ||
    $[42] !== storageV5 ||
    $[43] !== wouldTakeAnswer
  )
    ((Sn = function $n() {
      if (Ot() || Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (bo.current) {
        return;
      }
      ((bo.current = !0), setPreferTmuxOverIterm2(!0, storageV5), (Ao.current = !0), onDone("use-tmux"));
    }),
      ($[37] = Ot),
      ($[38] = noteRefused),
      ($[39] = onDone),
      ($[40] = refusedWithin),
      ($[41] = Xt),
      ($[42] = storageV5),
      ($[43] = wouldTakeAnswer),
      ($[44] = Sn));
  else Sn = $[44];
  let $n = Sn,
    on;
  if ($[45] === MEMO_CACHE_SENTINEL)
    ((on = e(Text, { bold: !0, color: "permission", children: "iTerm2 Split Pane Setup" })), ($[45] = on));
  else on = $[45];
  let _o;
  if (
    $[46] !== Io ||
    $[47] !== Xo ||
    $[48] !== $n ||
    $[49] !== Be ||
    $[50] !== so ||
    $[51] !== ke ||
    $[52] !== tmuxAvailable
  )
    ((_o =
      ke === "initial" &&
      e(It2InstallPrompt, {
        refuseInput: so,
        packageManager: Be,
        tmuxAvailable: tmuxAvailable,
        onInstall: Xo,
        onUseTmux: $n,
        onCancel: Io,
      })),
      ($[46] = Io),
      ($[47] = Xo),
      ($[48] = $n),
      ($[49] = Be),
      ($[50] = so),
      ($[51] = ke),
      ($[52] = tmuxAvailable),
      ($[53] = _o));
  else _o = $[53];
  let cn;
  if ($[54] !== Be || $[55] !== ke)
    ((cn = ke === "installing" && e(It2Installing, { packageManager: Be })),
      ($[54] = Be),
      ($[55] = ke),
      ($[56] = cn));
  else cn = $[56];
  let Dn;
  if (
    $[57] !== We ||
    $[58] !== Io ||
    $[59] !== Xo ||
    $[60] !== $n ||
    $[61] !== Be ||
    $[62] !== so ||
    $[63] !== ke ||
    $[64] !== tmuxAvailable
  )
    ((Dn =
      ke === "install-failed" &&
      e(It2SetupPrompt, {
        refuseInput: so,
        error: We,
        packageManager: Be,
        tmuxAvailable: tmuxAvailable,
        onRetry: Xo,
        onUseTmux: $n,
        onCancel: Io,
      })),
      ($[57] = We),
      ($[58] = Io),
      ($[59] = Xo),
      ($[60] = $n),
      ($[61] = Be),
      ($[62] = so),
      ($[63] = ke),
      ($[64] = tmuxAvailable),
      ($[65] = Dn));
  else Dn = $[65];
  let wn;
  if ($[66] !== ke)
    ((wn = ke === "api-instructions" && e(It2InstalledSuccess, {})), ($[66] = ke), ($[67] = wn));
  else wn = $[67];
  let mr;
  if ($[68] !== ke) ((mr = ke === "verifying" && e(It2Verifying, {})), ($[68] = ke), ($[69] = mr));
  else mr = $[69];
  let Kn;
  if ($[70] !== ke) ((Kn = ke === "success" && e(It2SplitPaneReady, {})), ($[70] = ke), ($[71] = Kn));
  else Kn = $[71];
  let Wn;
  if (
    $[72] !== We ||
    $[73] !== Io ||
    $[74] !== $n ||
    $[75] !== Yo ||
    $[76] !== so ||
    $[77] !== ke ||
    $[78] !== tmuxAvailable
  )
    ((Wn =
      ke === "failed" &&
      e(It2SetupError, {
        refuseInput: so,
        error: We,
        tmuxAvailable: tmuxAvailable,
        onRetry: Yo,
        onUseTmux: $n,
        onCancel: Io,
      })),
      ($[72] = We),
      ($[73] = Io),
      ($[74] = $n),
      ($[75] = Yo),
      ($[76] = so),
      ($[77] = ke),
      ($[78] = tmuxAvailable),
      ($[79] = Wn));
  else Wn = $[79];
  let Fr;
  if ($[80] !== ke)
    ((Fr =
      ke !== "installing" &&
      ke !== "verifying" &&
      ke !== "success" &&
      e(AgentNavigationFooter, { children: e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }) })),
      ($[80] = ke),
      ($[81] = Fr));
  else Fr = $[81];
  let Zn;
  if (
    $[82] !== bn ||
    $[83] !== _o ||
    $[84] !== cn ||
    $[85] !== Dn ||
    $[86] !== wn ||
    $[87] !== mr ||
    $[88] !== Kn ||
    $[89] !== Wn ||
    $[90] !== Fr
  )
    ((Zn = e(Pane, {
      color: "permission",
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        paddingBottom: 1,
        tabIndex: 0,
        autoFocus: !0,
        onKeyDown: bn,
        children: [on, _o, cn, Dn, wn, mr, Kn, Wn, Fr],
      }),
    })),
      ($[82] = bn),
      ($[83] = _o),
      ($[84] = cn),
      ($[85] = Dn),
      ($[86] = wn),
      ($[87] = mr),
      ($[88] = Kn),
      ($[89] = Wn),
      ($[90] = Fr),
      ($[91] = Zn));
  else Zn = $[91];
  return Zn;
}

export { AgentDetail };
