/**
 * components/agents/AgentDetail.tsx
 *
 * 子代理详情视图；本模块实际内容为安装/验证流程（initial/installing/verifying/success），疑似匹配错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentDetail.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useState, useEffect, useRef } from "../../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRecentInputStamp, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useRecentInputWithin, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
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

//@ chunk-czq1j3j2.js:1285358-1290236 callgraph-fingerprint (2.1.88 match: AgentDetail, 0.23)
function AgentDetail(props) {
  let $ = useMemoCache(93);
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
  let usePhaseStamp = useRecentInputStamp(phaseChangedAt);
  let recentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let hasRecentInputCached;
  if ($[0] !== inputClock || $[1] !== usePhaseStamp || $[2] !== phaseChangedAt) {
    hasRecentInputCached = () =>
      phaseChangedAt !== 0 && isWithinRecentInput(inputClock, usePhaseStamp(phaseChangedAt));
    $[0] = inputClock;
    $[1] = usePhaseStamp;
    $[2] = phaseChangedAt;
    $[3] = hasRecentInputCached;
  } else hasRecentInputCached = $[3];
  let hasRecentInput = hasRecentInputCached;
  let refuseInputCached;
  if ($[4] !== recentInput || $[5] !== noteRefused || $[6] !== refusedWithin || $[7] !== hasRecentInput) {
    refuseInputCached = function shouldRefuseInput() {
      if (recentInput() || hasRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[4] = recentInput;
    $[5] = noteRefused;
    $[6] = refusedWithin;
    $[7] = hasRecentInput;
    $[8] = refuseInputCached;
  } else refuseInputCached = $[8];
  let refuseInput = refuseInputCached;
  let detectManagerEffect;
  let detectManagerDeps;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    detectManagerEffect = () => {
      detectPythonPackageManager().then((pythonPackageManager) => {
        setPackageManager(pythonPackageManager);
      });
    };
    detectManagerDeps = [];
    $[9] = detectManagerEffect;
    $[10] = detectManagerDeps;
  } else {
    detectManagerEffect = $[9];
    detectManagerDeps = $[10];
  }
  useEffect(detectManagerEffect, detectManagerDeps);
  let installStartedRef = useRef(false);
  let cancelledRef = useRef(false);
  let detectingRef = useRef(false);
  let unmountEffect;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    unmountEffect = () => {
      installStartedRef.current = false;
    };
    $[11] = unmountEffect;
  } else unmountEffect = $[11];
  useEffect(unmountEffect);
  let cancelHandlerCached;
  if (
    $[12] !== recentInput ||
    $[13] !== noteRefused ||
    $[14] !== onDone ||
    $[15] !== refusedWithin ||
    $[16] !== hasRecentInput
  ) {
    cancelHandlerCached = () => {
      if (recentInput() || hasRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (onDone("cancelled")) cancelledRef.current = true;
    };
    $[12] = recentInput;
    $[13] = noteRefused;
    $[14] = onDone;
    $[15] = refusedWithin;
    $[16] = hasRecentInput;
    $[17] = cancelHandlerCached;
  } else cancelHandlerCached = $[17];
  let onCancel = cancelHandlerCached;
  const isActive = phase !== "installing" && phase !== "verifying" && phase !== "success";
  let cancelKeybindingOptions;
  if ($[18] !== isActive) {
    cancelKeybindingOptions = {
      context: "Confirmation",
      isActive,
    };
    $[18] = isActive;
    $[19] = cancelKeybindingOptions;
  } else cancelKeybindingOptions = $[19];
  useKeybinding("confirm:no", onCancel, cancelKeybindingOptions);
  let finishInstalled;
  if ($[20] !== onDone) {
    finishInstalled = () => {
      cancelledRef.current = true;
      onDone("installed");
    };
    $[20] = onDone;
    $[21] = finishInstalled;
  } else finishInstalled = $[21];
  useTimeout(finishInstalled, phase === "success" ? 1500 : null);
  let verifyHandlerCached;
  if (
    $[22] !== noteRefused ||
    $[23] !== refusedWithin ||
    $[24] !== hasRecentInput ||
    $[25] !== storageV5 ||
    $[26] !== wouldTakeAnswer
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
    $[22] = noteRefused;
    $[23] = refusedWithin;
    $[24] = hasRecentInput;
    $[25] = storageV5;
    $[26] = wouldTakeAnswer;
    $[27] = verifyHandlerCached;
  } else verifyHandlerCached = $[27];
  let onVerify = verifyHandlerCached;
  let keyDownHandlerCached;
  if ($[28] !== onVerify || $[29] !== phase) {
    keyDownHandlerCached = function handleKeyDown(event) {
      if (phase === "api-instructions" && event.key === "return") {
        event.preventDefault();
        onVerify();
      }
    };
    $[28] = onVerify;
    $[29] = phase;
    $[30] = keyDownHandlerCached;
  } else keyDownHandlerCached = $[30];
  let onKeyDown = keyDownHandlerCached;
  let installHandlerCached;
  if (
    $[31] !== recentInput ||
    $[32] !== noteRefused ||
    $[33] !== packageManager ||
    $[34] !== refusedWithin ||
    $[35] !== hasRecentInput ||
    $[36] !== wouldTakeAnswer
  ) {
    installHandlerCached = async function handleInstall() {
      if (recentInput() || hasRecentInput() || refusedWithin()) {
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
    $[31] = recentInput;
    $[32] = noteRefused;
    $[33] = packageManager;
    $[34] = refusedWithin;
    $[35] = hasRecentInput;
    $[36] = wouldTakeAnswer;
    $[37] = installHandlerCached;
  } else installHandlerCached = $[37];
  let onInstall = installHandlerCached;
  let useTmuxHandlerCached;
  if (
    $[38] !== recentInput ||
    $[39] !== noteRefused ||
    $[40] !== onDone ||
    $[41] !== refusedWithin ||
    $[42] !== hasRecentInput ||
    $[43] !== storageV5 ||
    $[44] !== wouldTakeAnswer
  ) {
    useTmuxHandlerCached = function handleUseTmux() {
      if (recentInput() || hasRecentInput() || refusedWithin()) {
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
    $[38] = recentInput;
    $[39] = noteRefused;
    $[40] = onDone;
    $[41] = refusedWithin;
    $[42] = hasRecentInput;
    $[43] = storageV5;
    $[44] = wouldTakeAnswer;
    $[45] = useTmuxHandlerCached;
  } else useTmuxHandlerCached = $[45];
  let onUseTmux = useTmuxHandlerCached;
  let titleElement;
  if ($[46] === MEMO_CACHE_SENTINEL) {
    titleElement = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "iTerm2 Split Pane Setup",
    });
    $[46] = titleElement;
  } else titleElement = $[46];
  let installPromptElement;
  if (
    $[47] !== onCancel ||
    $[48] !== onInstall ||
    $[49] !== onUseTmux ||
    $[50] !== packageManager ||
    $[51] !== refuseInput ||
    $[52] !== phase ||
    $[53] !== tmuxAvailable
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
    $[47] = onCancel;
    $[48] = onInstall;
    $[49] = onUseTmux;
    $[50] = packageManager;
    $[51] = refuseInput;
    $[52] = phase;
    $[53] = tmuxAvailable;
    $[54] = installPromptElement;
  } else installPromptElement = $[54];
  let installingElement;
  if ($[55] !== packageManager || $[56] !== phase) {
    installingElement =
      phase === "installing" &&
      jsxProd_default(It2Installing, {
        packageManager,
      });
    $[55] = packageManager;
    $[56] = phase;
    $[57] = installingElement;
  } else installingElement = $[57];
  let installFailedElement;
  if (
    $[58] !== errorText ||
    $[59] !== onCancel ||
    $[60] !== onInstall ||
    $[61] !== onUseTmux ||
    $[62] !== packageManager ||
    $[63] !== refuseInput ||
    $[64] !== phase ||
    $[65] !== tmuxAvailable
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
    $[58] = errorText;
    $[59] = onCancel;
    $[60] = onInstall;
    $[61] = onUseTmux;
    $[62] = packageManager;
    $[63] = refuseInput;
    $[64] = phase;
    $[65] = tmuxAvailable;
    $[66] = installFailedElement;
  } else installFailedElement = $[66];
  let apiInstructionsElement;
  if ($[67] !== phase) {
    apiInstructionsElement = phase === "api-instructions" && jsxProd_default(It2InstalledSuccess, {});
    $[67] = phase;
    $[68] = apiInstructionsElement;
  } else apiInstructionsElement = $[68];
  let verifyingElement;
  if ($[69] !== phase) {
    verifyingElement = phase === "verifying" && jsxProd_default(It2Verifying, {});
    $[69] = phase;
    $[70] = verifyingElement;
  } else verifyingElement = $[70];
  let readyElement;
  if ($[71] !== phase) {
    readyElement = phase === "success" && jsxProd_default(It2SplitPaneReady, {});
    $[71] = phase;
    $[72] = readyElement;
  } else readyElement = $[72];
  let errorElement;
  if (
    $[73] !== errorText ||
    $[74] !== onCancel ||
    $[75] !== onUseTmux ||
    $[76] !== onVerify ||
    $[77] !== refuseInput ||
    $[78] !== phase ||
    $[79] !== tmuxAvailable
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
    $[73] = errorText;
    $[74] = onCancel;
    $[75] = onUseTmux;
    $[76] = onVerify;
    $[77] = refuseInput;
    $[78] = phase;
    $[79] = tmuxAvailable;
    $[80] = errorElement;
  } else errorElement = $[80];
  let footerElement;
  if ($[81] !== phase) {
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
    $[81] = phase;
    $[82] = footerElement;
  } else footerElement = $[82];
  let paneElement;
  if (
    $[83] !== onKeyDown ||
    $[84] !== installPromptElement ||
    $[85] !== installingElement ||
    $[86] !== installFailedElement ||
    $[87] !== apiInstructionsElement ||
    $[88] !== verifyingElement ||
    $[89] !== readyElement ||
    $[90] !== errorElement ||
    $[91] !== footerElement
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
    $[83] = onKeyDown;
    $[84] = installPromptElement;
    $[85] = installingElement;
    $[86] = installFailedElement;
    $[87] = apiInstructionsElement;
    $[88] = verifyingElement;
    $[89] = readyElement;
    $[90] = errorElement;
    $[91] = footerElement;
    $[92] = paneElement;
  } else paneElement = $[92];
  return paneElement;
}
export { AgentDetail };
