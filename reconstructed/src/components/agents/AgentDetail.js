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
import { useTheme_2 } from "../design-system/ThemeProvider.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function AgentDetail(props) {
  let $ = w(92);
  let { onDone, tmuxAvailable, wouldTakeAnswer } = props;
  let { storageV5 } = useTheme_2();
  let [ke, Re] = y("initial");
  let [Be, He] = y(null);
  let [We, ze] = y(null);
  let inputClock = useInputClock();
  let [rt, kt] = y(ke);
  let [At, It] = y(0);
  if (rt !== ke) {
    kt(ke);
    It(Date.now());
  }
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let oo;
  if ($[0] !== inputClock || $[1] !== At) {
    oo = () => At !== 0 && isWithinRecentInput(inputClock, At);
    $[0] = inputClock;
    $[1] = At;
    $[2] = oo;
  } else oo = $[2];
  let Xt = oo;
  let io;
  if ($[3] !== inputRefusalWindow || $[4] !== noteRefused || $[5] !== refusedWithin || $[6] !== Xt) {
    io = function so() {
      if (inputRefusalWindow() || Xt() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[3] = inputRefusalWindow;
    $[4] = noteRefused;
    $[5] = refusedWithin;
    $[6] = Xt;
    $[7] = io;
  } else io = $[7];
  let refuseInput = io;
  let po;
  let ao;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    po = () => {
      detectPythonPackageManager().then((pythonPackageManager) => {
        He(pythonPackageManager);
      });
    };
    ao = [];
    $[8] = po;
    $[9] = ao;
  } else {
    po = $[8];
    ao = $[9];
  }
  P(po, ao);
  let bo = R(false);
  let Ao = R(false);
  let Bo = R(false);
  let Ro;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    Ro = () => {
      bo.current = false;
    };
    $[10] = Ro;
  } else Ro = $[10];
  P(Ro);
  let Ho;
  if (
    $[11] !== inputRefusalWindow ||
    $[12] !== noteRefused ||
    $[13] !== onDone ||
    $[14] !== refusedWithin ||
    $[15] !== Xt
  ) {
    Ho = () => {
      if (inputRefusalWindow() || Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (onDone("cancelled")) Ao.current = true;
    };
    $[11] = inputRefusalWindow;
    $[12] = noteRefused;
    $[13] = onDone;
    $[14] = refusedWithin;
    $[15] = Xt;
    $[16] = Ho;
  } else Ho = $[16];
  let Io = Ho;
  const isActive = ke !== "installing" && ke !== "verifying" && ke !== "success";
  let mn;
  if ($[17] !== isActive) {
    mn = {
      context: "Confirmation",
      isActive,
    };
    $[17] = isActive;
    $[18] = mn;
  } else mn = $[18];
  useKeybinding("confirm:no", Io, mn);
  let Cn;
  if ($[19] !== onDone) {
    Cn = () => {
      Ao.current = true;
      onDone("installed");
    };
    $[19] = onDone;
    $[20] = Cn;
  } else Cn = $[20];
  useTimeout(Cn, ke === "success" ? 1500 : null);
  let No;
  if (
    $[21] !== noteRefused ||
    $[22] !== refusedWithin ||
    $[23] !== Xt ||
    $[24] !== storageV5 ||
    $[25] !== wouldTakeAnswer
  ) {
    No = function Yo() {
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
      bo.current = true;
      Re("verifying");
      verifyIt2Setup().then((vo) => {
        if (vo.success) {
          markIt2SetupComplete(storageV5);
          Re("success");
        } else {
          ze(vo.error);
          Re("failed");
        }
      });
    };
    $[21] = noteRefused;
    $[22] = refusedWithin;
    $[23] = Xt;
    $[24] = storageV5;
    $[25] = wouldTakeAnswer;
    $[26] = No;
  } else No = $[26];
  let Yo = No;
  let kn;
  if ($[27] !== Yo || $[28] !== ke) {
    kn = function bn(event) {
      if (ke === "api-instructions" && event.key === "return") {
        event.preventDefault();
        Yo();
      }
    };
    $[27] = Yo;
    $[28] = ke;
    $[29] = kn;
  } else kn = $[29];
  let onKeyDown = kn;
  let Go;
  if (
    $[30] !== inputRefusalWindow ||
    $[31] !== noteRefused ||
    $[32] !== Be ||
    $[33] !== refusedWithin ||
    $[34] !== Xt ||
    $[35] !== wouldTakeAnswer
  ) {
    Go = async function Xo() {
      if (inputRefusalWindow() || Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (bo.current || Bo.current) {
        return;
      }
      let packageManager = Be;
      if (!packageManager) {
        Bo.current = true;
        packageManager = await detectPythonPackageManager();
        Bo.current = false;
        if (Ao.current || !wouldTakeAnswer()) {
          return;
        }
      }
      if (!packageManager) {
        ze("No Python package manager found (uvx, pipx, or pip)");
        Re("install-failed");
        return;
      }
      if (packageManager !== Be) He(packageManager);
      bo.current = true;
      Re("installing");
      let Mn = await installIt2(packageManager);
      if (Mn.success) Re("api-instructions");
      else {
        ze(Mn.error);
        Re("install-failed");
      }
    };
    $[30] = inputRefusalWindow;
    $[31] = noteRefused;
    $[32] = Be;
    $[33] = refusedWithin;
    $[34] = Xt;
    $[35] = wouldTakeAnswer;
    $[36] = Go;
  } else Go = $[36];
  let Xo = Go;
  let Sn;
  if (
    $[37] !== inputRefusalWindow ||
    $[38] !== noteRefused ||
    $[39] !== onDone ||
    $[40] !== refusedWithin ||
    $[41] !== Xt ||
    $[42] !== storageV5 ||
    $[43] !== wouldTakeAnswer
  ) {
    Sn = function $n() {
      if (inputRefusalWindow() || Xt() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (bo.current) {
        return;
      }
      bo.current = true;
      setPreferTmuxOverIterm2(true, storageV5);
      Ao.current = true;
      onDone("use-tmux");
    };
    $[37] = inputRefusalWindow;
    $[38] = noteRefused;
    $[39] = onDone;
    $[40] = refusedWithin;
    $[41] = Xt;
    $[42] = storageV5;
    $[43] = wouldTakeAnswer;
    $[44] = Sn;
  } else Sn = $[44];
  let onUseTmux = Sn;
  let on;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    on = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "iTerm2 Split Pane Setup",
    });
    $[45] = on;
  } else on = $[45];
  let _o;
  if (
    $[46] !== Io ||
    $[47] !== Xo ||
    $[48] !== onUseTmux ||
    $[49] !== Be ||
    $[50] !== refuseInput ||
    $[51] !== ke ||
    $[52] !== tmuxAvailable
  ) {
    _o =
      ke === "initial" &&
      jsxProd_default(It2InstallPrompt, {
        refuseInput,
        packageManager: Be,
        tmuxAvailable,
        onInstall: Xo,
        onUseTmux,
        onCancel: Io,
      });
    $[46] = Io;
    $[47] = Xo;
    $[48] = onUseTmux;
    $[49] = Be;
    $[50] = refuseInput;
    $[51] = ke;
    $[52] = tmuxAvailable;
    $[53] = _o;
  } else _o = $[53];
  let cn;
  if ($[54] !== Be || $[55] !== ke) {
    cn =
      ke === "installing" &&
      jsxProd_default(It2Installing, {
        packageManager: Be,
      });
    $[54] = Be;
    $[55] = ke;
    $[56] = cn;
  } else cn = $[56];
  let Dn;
  if (
    $[57] !== We ||
    $[58] !== Io ||
    $[59] !== Xo ||
    $[60] !== onUseTmux ||
    $[61] !== Be ||
    $[62] !== refuseInput ||
    $[63] !== ke ||
    $[64] !== tmuxAvailable
  ) {
    Dn =
      ke === "install-failed" &&
      jsxProd_default(It2SetupPrompt, {
        refuseInput,
        error: We,
        packageManager: Be,
        tmuxAvailable,
        onRetry: Xo,
        onUseTmux,
        onCancel: Io,
      });
    $[57] = We;
    $[58] = Io;
    $[59] = Xo;
    $[60] = onUseTmux;
    $[61] = Be;
    $[62] = refuseInput;
    $[63] = ke;
    $[64] = tmuxAvailable;
    $[65] = Dn;
  } else Dn = $[65];
  let wn;
  if ($[66] !== ke) {
    wn = ke === "api-instructions" && jsxProd_default(It2InstalledSuccess, {});
    $[66] = ke;
    $[67] = wn;
  } else wn = $[67];
  let mr;
  if ($[68] !== ke) {
    mr = ke === "verifying" && jsxProd_default(It2Verifying, {});
    $[68] = ke;
    $[69] = mr;
  } else mr = $[69];
  let Kn;
  if ($[70] !== ke) {
    Kn = ke === "success" && jsxProd_default(It2SplitPaneReady, {});
    $[70] = ke;
    $[71] = Kn;
  } else Kn = $[71];
  let Wn;
  if (
    $[72] !== We ||
    $[73] !== Io ||
    $[74] !== onUseTmux ||
    $[75] !== Yo ||
    $[76] !== refuseInput ||
    $[77] !== ke ||
    $[78] !== tmuxAvailable
  ) {
    Wn =
      ke === "failed" &&
      jsxProd_default(It2SetupError, {
        refuseInput,
        error: We,
        tmuxAvailable,
        onRetry: Yo,
        onUseTmux,
        onCancel: Io,
      });
    $[72] = We;
    $[73] = Io;
    $[74] = onUseTmux;
    $[75] = Yo;
    $[76] = refuseInput;
    $[77] = ke;
    $[78] = tmuxAvailable;
    $[79] = Wn;
  } else Wn = $[79];
  let Fr;
  if ($[80] !== ke) {
    Fr =
      ke !== "installing" &&
      ke !== "verifying" &&
      ke !== "success" &&
      jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      });
    $[80] = ke;
    $[81] = Fr;
  } else Fr = $[81];
  let Zn;
  if (
    $[82] !== onKeyDown ||
    $[83] !== _o ||
    $[84] !== cn ||
    $[85] !== Dn ||
    $[86] !== wn ||
    $[87] !== mr ||
    $[88] !== Kn ||
    $[89] !== Wn ||
    $[90] !== Fr
  ) {
    Zn = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingBottom: 1,
        tabIndex: 0,
        autoFocus: true,
        onKeyDown,
        children: [on, _o, cn, Dn, wn, mr, Kn, Wn, Fr],
      }),
    });
    $[82] = onKeyDown;
    $[83] = _o;
    $[84] = cn;
    $[85] = Dn;
    $[86] = wn;
    $[87] = mr;
    $[88] = Kn;
    $[89] = Wn;
    $[90] = Fr;
    $[91] = Zn;
  } else Zn = $[91];
  return Zn;
}
export { AgentDetail };
