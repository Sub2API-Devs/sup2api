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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useState, useEffect, useRef } from "../../../vendor/react/cjs/react.production.js";
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
  let $ = useMemoCache(92);
  let { onDone, tmuxAvailable, wouldTakeAnswer } = props;
  let { storageV5 } = useTheme_2();
  let [phase, setPhase] = useState("initial");
  let [packageManager, setPackageManager] = useState(null);
  let [errorText, setErrorText] = useState(null);
  let inputClock = useInputClock();
  let [lastPhase, setLastPhase] = useState(phase);
  let [phaseChangedAt, setPhaseChangedAt] = useState(0);
  if (lastPhase !== phase) {
    setLastPhase(phase);
    setPhaseChangedAt(Date.now());
  }
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let hasRecentInputCached;
  if ($[0] !== inputClock || $[1] !== phaseChangedAt) {
    hasRecentInputCached = () => phaseChangedAt !== 0 && isWithinRecentInput(inputClock, phaseChangedAt);
    $[0] = inputClock;
    $[1] = phaseChangedAt;
    $[2] = hasRecentInputCached;
  } else hasRecentInputCached = $[2];
  let hasRecentInput = hasRecentInputCached;
  let refuseInputCached;
  if (
    $[3] !== inputRefusalWindow ||
    $[4] !== noteRefused ||
    $[5] !== refusedWithin ||
    $[6] !== hasRecentInput
  ) {
    refuseInputCached = function shouldRefuseInput() {
      if (inputRefusalWindow() || hasRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[3] = inputRefusalWindow;
    $[4] = noteRefused;
    $[5] = refusedWithin;
    $[6] = hasRecentInput;
    $[7] = refuseInputCached;
  } else refuseInputCached = $[7];
  let refuseInput = refuseInputCached;
  let detectManagerEffect;
  let detectManagerDeps;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    detectManagerEffect = () => {
      detectPythonPackageManager().then((pythonPackageManager) => {
        setPackageManager(pythonPackageManager);
      });
    };
    detectManagerDeps = [];
    $[8] = detectManagerEffect;
    $[9] = detectManagerDeps;
  } else {
    detectManagerEffect = $[8];
    detectManagerDeps = $[9];
  }
  useEffect(detectManagerEffect, detectManagerDeps);
  let installStartedRef = useRef(false);
  let cancelledRef = useRef(false);
  let detectingRef = useRef(false);
  let unmountEffect;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    unmountEffect = () => {
      installStartedRef.current = false;
    };
    $[10] = unmountEffect;
  } else unmountEffect = $[10];
  useEffect(unmountEffect);
  let cancelHandlerCached;
  if (
    $[11] !== inputRefusalWindow ||
    $[12] !== noteRefused ||
    $[13] !== onDone ||
    $[14] !== refusedWithin ||
    $[15] !== hasRecentInput
  ) {
    cancelHandlerCached = () => {
      if (inputRefusalWindow() || hasRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (onDone("cancelled")) cancelledRef.current = true;
    };
    $[11] = inputRefusalWindow;
    $[12] = noteRefused;
    $[13] = onDone;
    $[14] = refusedWithin;
    $[15] = hasRecentInput;
    $[16] = cancelHandlerCached;
  } else cancelHandlerCached = $[16];
  let onCancel = cancelHandlerCached;
  const isActive = phase !== "installing" && phase !== "verifying" && phase !== "success";
  let cancelKeybindingOptions;
  if ($[17] !== isActive) {
    cancelKeybindingOptions = {
      context: "Confirmation",
      isActive,
    };
    $[17] = isActive;
    $[18] = cancelKeybindingOptions;
  } else cancelKeybindingOptions = $[18];
  useKeybinding("confirm:no", onCancel, cancelKeybindingOptions);
  let finishInstalled;
  if ($[19] !== onDone) {
    finishInstalled = () => {
      cancelledRef.current = true;
      onDone("installed");
    };
    $[19] = onDone;
    $[20] = finishInstalled;
  } else finishInstalled = $[20];
  useTimeout(finishInstalled, phase === "success" ? 1500 : null);
  let verifyHandlerCached;
  if (
    $[21] !== noteRefused ||
    $[22] !== refusedWithin ||
    $[23] !== hasRecentInput ||
    $[24] !== storageV5 ||
    $[25] !== wouldTakeAnswer
  ) {
    verifyHandlerCached = function handleVerify() {
      if (hasRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (installStartedRef.current) {
        return;
      }
      installStartedRef.current = true;
      setPhase("verifying");
      verifyIt2Setup().then((verifyResult) => {
        if (verifyResult.success) {
          markIt2SetupComplete(storageV5);
          setPhase("success");
        } else {
          setErrorText(verifyResult.error);
          setPhase("failed");
        }
      });
    };
    $[21] = noteRefused;
    $[22] = refusedWithin;
    $[23] = hasRecentInput;
    $[24] = storageV5;
    $[25] = wouldTakeAnswer;
    $[26] = verifyHandlerCached;
  } else verifyHandlerCached = $[26];
  let onVerify = verifyHandlerCached;
  let keyDownHandlerCached;
  if ($[27] !== onVerify || $[28] !== phase) {
    keyDownHandlerCached = function handleKeyDown(event) {
      if (phase === "api-instructions" && event.key === "return") {
        event.preventDefault();
        onVerify();
      }
    };
    $[27] = onVerify;
    $[28] = phase;
    $[29] = keyDownHandlerCached;
  } else keyDownHandlerCached = $[29];
  let onKeyDown = keyDownHandlerCached;
  let installHandlerCached;
  if (
    $[30] !== inputRefusalWindow ||
    $[31] !== noteRefused ||
    $[32] !== packageManager ||
    $[33] !== refusedWithin ||
    $[34] !== hasRecentInput ||
    $[35] !== wouldTakeAnswer
  ) {
    installHandlerCached = async function handleInstall() {
      if (inputRefusalWindow() || hasRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (installStartedRef.current || detectingRef.current) {
        return;
      }
      let packageManager_2 = packageManager;
      if (!packageManager_2) {
        detectingRef.current = true;
        packageManager_2 = await detectPythonPackageManager();
        detectingRef.current = false;
        if (cancelledRef.current || !wouldTakeAnswer()) {
          return;
        }
      }
      if (!packageManager_2) {
        setErrorText("No Python package manager found (uvx, pipx, or pip)");
        setPhase("install-failed");
        return;
      }
      if (packageManager_2 !== packageManager) setPackageManager(packageManager_2);
      installStartedRef.current = true;
      setPhase("installing");
      let installResult = await installIt2(packageManager_2);
      if (installResult.success) setPhase("api-instructions");
      else {
        setErrorText(installResult.error);
        setPhase("install-failed");
      }
    };
    $[30] = inputRefusalWindow;
    $[31] = noteRefused;
    $[32] = packageManager;
    $[33] = refusedWithin;
    $[34] = hasRecentInput;
    $[35] = wouldTakeAnswer;
    $[36] = installHandlerCached;
  } else installHandlerCached = $[36];
  let onInstall = installHandlerCached;
  let useTmuxHandlerCached;
  if (
    $[37] !== inputRefusalWindow ||
    $[38] !== noteRefused ||
    $[39] !== onDone ||
    $[40] !== refusedWithin ||
    $[41] !== hasRecentInput ||
    $[42] !== storageV5 ||
    $[43] !== wouldTakeAnswer
  ) {
    useTmuxHandlerCached = function handleUseTmux() {
      if (inputRefusalWindow() || hasRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (installStartedRef.current) {
        return;
      }
      installStartedRef.current = true;
      setPreferTmuxOverIterm2(true, storageV5);
      cancelledRef.current = true;
      onDone("use-tmux");
    };
    $[37] = inputRefusalWindow;
    $[38] = noteRefused;
    $[39] = onDone;
    $[40] = refusedWithin;
    $[41] = hasRecentInput;
    $[42] = storageV5;
    $[43] = wouldTakeAnswer;
    $[44] = useTmuxHandlerCached;
  } else useTmuxHandlerCached = $[44];
  let onUseTmux = useTmuxHandlerCached;
  let titleElement;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    titleElement = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "iTerm2 Split Pane Setup",
    });
    $[45] = titleElement;
  } else titleElement = $[45];
  let installPromptElement;
  if (
    $[46] !== onCancel ||
    $[47] !== onInstall ||
    $[48] !== onUseTmux ||
    $[49] !== packageManager ||
    $[50] !== refuseInput ||
    $[51] !== phase ||
    $[52] !== tmuxAvailable
  ) {
    installPromptElement =
      phase === "initial" &&
      jsxProd_default(It2InstallPrompt, {
        refuseInput,
        packageManager,
        tmuxAvailable,
        onInstall,
        onUseTmux,
        onCancel,
      });
    $[46] = onCancel;
    $[47] = onInstall;
    $[48] = onUseTmux;
    $[49] = packageManager;
    $[50] = refuseInput;
    $[51] = phase;
    $[52] = tmuxAvailable;
    $[53] = installPromptElement;
  } else installPromptElement = $[53];
  let installingElement;
  if ($[54] !== packageManager || $[55] !== phase) {
    installingElement =
      phase === "installing" &&
      jsxProd_default(It2Installing, {
        packageManager,
      });
    $[54] = packageManager;
    $[55] = phase;
    $[56] = installingElement;
  } else installingElement = $[56];
  let installFailedElement;
  if (
    $[57] !== errorText ||
    $[58] !== onCancel ||
    $[59] !== onInstall ||
    $[60] !== onUseTmux ||
    $[61] !== packageManager ||
    $[62] !== refuseInput ||
    $[63] !== phase ||
    $[64] !== tmuxAvailable
  ) {
    installFailedElement =
      phase === "install-failed" &&
      jsxProd_default(It2SetupPrompt, {
        refuseInput,
        error: errorText,
        packageManager,
        tmuxAvailable,
        onRetry: onInstall,
        onUseTmux,
        onCancel,
      });
    $[57] = errorText;
    $[58] = onCancel;
    $[59] = onInstall;
    $[60] = onUseTmux;
    $[61] = packageManager;
    $[62] = refuseInput;
    $[63] = phase;
    $[64] = tmuxAvailable;
    $[65] = installFailedElement;
  } else installFailedElement = $[65];
  let apiInstructionsElement;
  if ($[66] !== phase) {
    apiInstructionsElement = phase === "api-instructions" && jsxProd_default(It2InstalledSuccess, {});
    $[66] = phase;
    $[67] = apiInstructionsElement;
  } else apiInstructionsElement = $[67];
  let verifyingElement;
  if ($[68] !== phase) {
    verifyingElement = phase === "verifying" && jsxProd_default(It2Verifying, {});
    $[68] = phase;
    $[69] = verifyingElement;
  } else verifyingElement = $[69];
  let readyElement;
  if ($[70] !== phase) {
    readyElement = phase === "success" && jsxProd_default(It2SplitPaneReady, {});
    $[70] = phase;
    $[71] = readyElement;
  } else readyElement = $[71];
  let errorElement;
  if (
    $[72] !== errorText ||
    $[73] !== onCancel ||
    $[74] !== onUseTmux ||
    $[75] !== onVerify ||
    $[76] !== refuseInput ||
    $[77] !== phase ||
    $[78] !== tmuxAvailable
  ) {
    errorElement =
      phase === "failed" &&
      jsxProd_default(It2SetupError, {
        refuseInput,
        error: errorText,
        tmuxAvailable,
        onRetry: onVerify,
        onUseTmux,
        onCancel,
      });
    $[72] = errorText;
    $[73] = onCancel;
    $[74] = onUseTmux;
    $[75] = onVerify;
    $[76] = refuseInput;
    $[77] = phase;
    $[78] = tmuxAvailable;
    $[79] = errorElement;
  } else errorElement = $[79];
  let footerElement;
  if ($[80] !== phase) {
    footerElement =
      phase !== "installing" &&
      phase !== "verifying" &&
      phase !== "success" &&
      jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      });
    $[80] = phase;
    $[81] = footerElement;
  } else footerElement = $[81];
  let paneElement;
  if (
    $[82] !== onKeyDown ||
    $[83] !== installPromptElement ||
    $[84] !== installingElement ||
    $[85] !== installFailedElement ||
    $[86] !== apiInstructionsElement ||
    $[87] !== verifyingElement ||
    $[88] !== readyElement ||
    $[89] !== errorElement ||
    $[90] !== footerElement
  ) {
    paneElement = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingBottom: 1,
        tabIndex: 0,
        autoFocus: true,
        onKeyDown,
        children: [
          titleElement,
          installPromptElement,
          installingElement,
          installFailedElement,
          apiInstructionsElement,
          verifyingElement,
          readyElement,
          errorElement,
          footerElement,
        ],
      }),
    });
    $[82] = onKeyDown;
    $[83] = installPromptElement;
    $[84] = installingElement;
    $[85] = installFailedElement;
    $[86] = apiInstructionsElement;
    $[87] = verifyingElement;
    $[88] = readyElement;
    $[89] = errorElement;
    $[90] = footerElement;
    $[91] = paneElement;
  } else paneElement = $[91];
  return paneElement;
}
export { AgentDetail };
