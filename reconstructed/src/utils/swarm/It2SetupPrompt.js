/**
 * utils/swarm/It2SetupPrompt.tsx
 *
 * 并入旧版已有路径：iTerm2 设置提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/It2SetupPrompt.tsx
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 8, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";
import { Spinner } from "../../components/Spinner.js";
import { getPythonApiInstructions } from "./backends/it2Setup.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { jAo } from "../../components/ultraplan/UltraplanLaunchDialog.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

/**
 * iTerm2 原生分屏队友所需的 it2 CLI 安装提示：选项为用包管理器安装、改用 tmux（可用时）或取消。
 */
//@ chunk-18hwfzwa.js:1264443-1265953 placement
function It2InstallPrompt(props) {
  let $ = w(18),
    {
      packageManager: packageManager,
      tmuxAvailable: tmuxAvailable,
      onInstall: onInstall,
      onUseTmux: onUseTmux,
      onCancel: onCancel,
      refuseInput: refuseInput,
    } = props;
  const Be = packageManager
    ? `Uses ${packageManager} to install the it2 CLI tool`
    : "Requires Python (uvx, pipx, or pip)";
  let We;
  if ($[0] !== Be)
    ((We = { label: "Install it2 now", value: "install", description: Be }), ($[0] = Be), ($[1] = We));
  else We = $[1];
  let ze;
  if ($[2] !== We || $[3] !== tmuxAvailable) {
    ze = [We];
    if (tmuxAvailable) {
      let Xe;
      if ($[5] === MEMO_CACHE_SENTINEL)
        ((Xe = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Opens teammates in a separate tmux session",
        }),
          ($[5] = Xe));
      else Xe = $[5];
      ze.push(Xe);
    }
    let Xe;
    if ($[6] === MEMO_CACHE_SENTINEL)
      ((Xe = { label: "Cancel", value: "cancel", description: "Skip teammate spawning for now" }),
        ($[6] = Xe));
    else Xe = $[6];
    ze.push(Xe);
    (($[2] = We), ($[3] = tmuxAvailable), ($[4] = ze));
  } else ze = $[4];
  let Xe, rt;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((Xe = r(Text, {
      children: [
        "To use native iTerm2 split panes for teammates, you need the",
        " ",
        e(Text, { bold: !0, children: "it2" }),
        " CLI tool.",
      ],
    })),
      (rt = e(Text, {
        dimColor: !0,
        children: "This enables teammates to appear as split panes within your current window.",
      })),
      ($[7] = Xe),
      ($[8] = rt));
  else ((Xe = $[7]), (rt = $[8]));
  let kt;
  if ($[9] !== onCancel || $[10] !== onInstall || $[11] !== onUseTmux)
    ((kt = (At) => {
      It: switch (At) {
        case "install": {
          onInstall();
          break It;
        }
        case "tmux": {
          onUseTmux();
          break It;
        }
        case "cancel": {
          onCancel();
        }
      }
    }),
      ($[9] = onCancel),
      ($[10] = onInstall),
      ($[11] = onUseTmux),
      ($[12] = kt));
  else kt = $[12];
  let Ot;
  if ($[13] !== onCancel || $[14] !== ze || $[15] !== refuseInput || $[16] !== kt)
    ((Ot = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        Xe,
        rt,
        e(Box, {
          marginTop: 1,
          children: e(ModelSelector, {
            refuseInput: refuseInput,
            hideIndexes: !0,
            selectedValue: NO_COMMITTED_ROW,
            options: ze,
            onChange: kt,
            onCancel: onCancel,
          }),
        }),
      ],
    })),
      ($[13] = onCancel),
      ($[14] = ze),
      ($[15] = refuseInput),
      ($[16] = kt),
      ($[17] = Ot));
  else Ot = $[17];
  return Ot;
}
/**
 * it2 安装进行中界面：显示转圈和所用的包管理器。
 */
//@ chunk-18hwfzwa.js:1265953-1266381 placement
function It2Installing(h) {
  let D = w(6),
    { packageManager: packageManager } = h,
    L;
  if (D[0] === MEMO_CACHE_SENTINEL) ((L = e(Spinner, {})), (D[0] = L));
  else L = D[0];
  let ee;
  if (D[1] !== packageManager)
    ((ee = r(Box, {
      children: [L, r(Text, { children: [" Installing it2 using ", packageManager, "\u2026"] })],
    })),
      (D[1] = packageManager),
      (D[2] = ee));
  else ee = D[2];
  let ke;
  if (D[3] === MEMO_CACHE_SENTINEL)
    ((ke = e(Text, { dimColor: !0, children: "This may take a moment." })), (D[3] = ke));
  else ke = D[3];
  let Re;
  if (D[4] !== ee)
    ((Re = r(Box, { flexDirection: "column", gap: 1, children: [ee, ke] })), (D[4] = ee), (D[5] = Re));
  else Re = D[5];
  return Re;
}
/**
 * it2 安装失败界面：显示错误与手动安装命令，选项为重试、改用 tmux（tmux 可用时）、取消。
 */
//@ chunk-18hwfzwa.js:1266381-1268003 fingerprint = It2SetupPrompt (0.535)
function It2SetupPrompt(t0) {
  let He = w(23),
    {
      error: error,
      packageManager: packageManager,
      tmuxAvailable: tmuxAvailable,
      onRetry: onRetry,
      onUseTmux: onUseTmux,
      onCancel: onCancel,
      refuseInput: refuseInput,
    } = t0,
    We;
  if (He[0] === MEMO_CACHE_SENTINEL)
    ((We = { label: "Try again", value: "retry", description: "Retry the installation" }), (He[0] = We));
  else We = He[0];
  let ze;
  if (He[1] !== tmuxAvailable) {
    ze = [We];
    if (tmuxAvailable) {
      let Xe;
      if (He[3] === MEMO_CACHE_SENTINEL)
        ((Xe = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Falls back to tmux for teammate panes",
        }),
          (He[3] = Xe));
      else Xe = He[3];
      ze.push(Xe);
    }
    let Xe;
    if (He[4] === MEMO_CACHE_SENTINEL)
      ((Xe = { label: "Cancel", value: "cancel", description: "Skip teammate spawning for now" }),
        (He[4] = Xe));
    else Xe = He[4];
    ze.push(Xe);
    ((He[1] = tmuxAvailable), (He[2] = ze));
  } else ze = He[2];
  let Xe;
  if (He[5] === MEMO_CACHE_SENTINEL)
    ((Xe = e(Text, { color: "error", children: "Installation failed" })), (He[5] = Xe));
  else Xe = He[5];
  let rt;
  if (He[6] !== error)
    ((rt = error && e(Text, { dimColor: !0, children: error })), (He[6] = error), (He[7] = rt));
  else rt = He[7];
  const kt =
    packageManager === "uvx"
      ? "uv tool install it2"
      : packageManager === "pipx"
        ? "pipx install it2"
        : "pip install --user it2";
  let At;
  if (He[8] !== kt)
    ((At = r(Text, { dimColor: !0, children: ["You can try installing manually:", " ", kt] })),
      (He[8] = kt),
      (He[9] = At));
  else At = He[9];
  let It;
  if (He[10] !== onCancel || He[11] !== onRetry || He[12] !== onUseTmux)
    ((It = (value) => {
      Et: switch (value) {
        case "retry": {
          onRetry();
          break Et;
        }
        case "tmux": {
          onUseTmux();
          break Et;
        }
        case "cancel": {
          onCancel();
        }
      }
    }),
      (He[10] = onCancel),
      (He[11] = onRetry),
      (He[12] = onUseTmux),
      (He[13] = It));
  else It = He[13];
  let Dt;
  if (He[14] !== onCancel || He[15] !== ze || He[16] !== refuseInput || He[17] !== It)
    ((Dt = e(Box, {
      marginTop: 1,
      children: e(ModelSelector, {
        refuseInput: refuseInput,
        hideIndexes: !0,
        selectedValue: NO_COMMITTED_ROW,
        options: ze,
        onChange: It,
        onCancel: onCancel,
      }),
    })),
      (He[14] = onCancel),
      (He[15] = ze),
      (He[16] = refuseInput),
      (He[17] = It),
      (He[18] = Dt));
  else Dt = He[18];
  let Lt;
  if (He[19] !== rt || He[20] !== At || He[21] !== Dt)
    ((Lt = r(Box, { flexDirection: "column", gap: 1, children: [Xe, rt, At, Dt] })),
      (He[19] = rt),
      (He[20] = At),
      (He[21] = Dt),
      (He[22] = Lt));
  else Lt = He[22];
  return Lt;
}
/**
 * it2 安装成功的提示界面。
 */
//@ chunk-18hwfzwa.js:1268003-1268531 placement
function It2InstalledSuccess() {
  let $ = w(6),
    x,
    D,
    L,
    ee,
    ke;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let Re = getPythonApiInstructions();
    x = Box;
    D = "column";
    L = 1;
    ee = r(Text, {
      color: "success",
      children: [e(StatusIcon, { status: "success", withSpace: !0 }), "it2 installed successfully"],
    });
    ke = e(Box, { flexDirection: "column", marginTop: 1, children: Re.map(jAo) });
    (($[0] = x), ($[1] = D), ($[2] = L), ($[3] = ee), ($[4] = ke));
  } else ((x = $[0]), (D = $[1]), (L = $[2]), (ee = $[3]), (ke = $[4]));
  let Be;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((Be = r(x, {
      flexDirection: D,
      gap: L,
      children: [
        ee,
        ke,
        e(Box, {
          marginTop: 1,
          children: e(Text, { dimColor: !0, children: "Press Enter when ready to verify\u2026" }),
        }),
      ],
    })),
      ($[5] = Be));
  else Be = $[5];
  return Be;
}
//@ chunk-18hwfzwa.js:1268531-1268695 placement
function It2Verifying() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((x = r(Box, {
      children: [e(Spinner, {}), e(Text, { children: " Verifying it2 can communicate with iTerm2\u2026" })],
    })),
      ($[0] = x));
  else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:1268695-1268987 placement
function It2SplitPaneReady() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((x = r(Box, {
      flexDirection: "column",
      children: [
        r(Text, {
          color: "success",
          children: [
            e(StatusIcon, { status: "success", withSpace: !0 }),
            "iTerm2 split pane support is ready",
          ],
        }),
        e(Text, { dimColor: !0, children: "Teammates will now appear as split panes." }),
      ],
    })),
      ($[0] = x));
  else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:1268987-1270661 placement
function It2SetupError(h) {
  let $ = w(22),
    {
      error: error,
      tmuxAvailable: tmuxAvailable,
      onRetry: onRetry,
      onUseTmux: onUseTmux,
      onCancel: onCancel,
      refuseInput: refuseInput,
    } = h,
    He;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((He = { label: "Try again", value: "retry", description: "Verify the connection again" }), ($[0] = He));
  else He = $[0];
  let We;
  if ($[1] !== tmuxAvailable) {
    We = [He];
    if (tmuxAvailable) {
      let ze;
      if ($[3] === MEMO_CACHE_SENTINEL)
        ((ze = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Falls back to tmux for teammate panes",
        }),
          ($[3] = ze));
      else ze = $[3];
      We.push(ze);
    }
    let ze;
    if ($[4] === MEMO_CACHE_SENTINEL)
      ((ze = { label: "Cancel", value: "cancel", description: "Skip teammate spawning for now" }),
        ($[4] = ze));
    else ze = $[4];
    We.push(ze);
    (($[1] = tmuxAvailable), ($[2] = We));
  } else We = $[2];
  let ze;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((ze = e(Text, { color: "error", children: "Verification failed" })), ($[5] = ze));
  else ze = $[5];
  let Xe;
  if ($[6] !== error)
    ((Xe = error && e(Text, { dimColor: !0, children: error })), ($[6] = error), ($[7] = Xe));
  else Xe = $[7];
  let rt;
  if ($[8] === MEMO_CACHE_SENTINEL) ((rt = e(Text, { children: "Make sure:" })), ($[8] = rt));
  else rt = $[8];
  let kt;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((kt = r(Box, {
      flexDirection: "column",
      paddingLeft: 2,
      children: [
        e(Text, { children: "\xB7 Python API is enabled in iTerm2 preferences" }),
        e(Text, { children: "\xB7 You may need to restart iTerm2 after enabling" }),
      ],
    })),
      ($[9] = kt));
  else kt = $[9];
  let At;
  if ($[10] !== onCancel || $[11] !== onRetry || $[12] !== onUseTmux)
    ((At = (It) => {
      Ot: switch (It) {
        case "retry": {
          onRetry();
          break Ot;
        }
        case "tmux": {
          onUseTmux();
          break Ot;
        }
        case "cancel": {
          onCancel();
        }
      }
    }),
      ($[10] = onCancel),
      ($[11] = onRetry),
      ($[12] = onUseTmux),
      ($[13] = At));
  else At = $[13];
  let Et;
  if ($[14] !== onCancel || $[15] !== We || $[16] !== refuseInput || $[17] !== At)
    ((Et = e(Box, {
      marginTop: 1,
      children: e(ModelSelector, {
        refuseInput: refuseInput,
        hideIndexes: !0,
        selectedValue: NO_COMMITTED_ROW,
        options: We,
        onChange: At,
        onCancel: onCancel,
      }),
    })),
      ($[14] = onCancel),
      ($[15] = We),
      ($[16] = refuseInput),
      ($[17] = At),
      ($[18] = Et));
  else Et = $[18];
  let Dt;
  if ($[19] !== Xe || $[20] !== Et)
    ((Dt = r(Box, { flexDirection: "column", gap: 1, children: [ze, Xe, rt, kt, Et] })),
      ($[19] = Xe),
      ($[20] = Et),
      ($[21] = Dt));
  else Dt = $[21];
  return Dt;
}
//@ chunk-18hwfzwa.js:1270661-1270665 placement
j();
//@ chunk-18hwfzwa.js:1270665-1270669 placement
j();

export {
  It2InstallPrompt,
  It2Installing,
  It2SetupPrompt,
  It2InstalledSuccess,
  It2Verifying,
  It2SplitPaneReady,
  It2SetupError,
};
