/**
 * utils/swarm/It2SetupPrompt.tsx
 *
 * 并入旧版已有路径：iTerm2 设置提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/It2SetupPrompt.tsx
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: placement 8, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";
import { Spinner } from "../../components/Spinner.js";
import { getPythonApiInstructions } from "./backends/it2Setup.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { renderPlainText } from "../../components/ultraplan/UltraplanLaunchDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1280723-1280727 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1280723", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1285305-1285309 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1285305", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1290236-1291746 placement
/**
 * iTerm2 原生分屏队友所需的 it2 CLI 安装提示：选项为用包管理器安装、改用 tmux（可用时）或取消。
 */
function It2InstallPrompt(props) {
  let $ = useMemoCache(18);
  let { packageManager, tmuxAvailable, onInstall, onUseTmux, onCancel, refuseInput } = props;
  const description = packageManager
    ? `Uses ${packageManager} to install the it2 CLI tool`
    : "Requires Python (uvx, pipx, or pip)";
  let installOption;
  if ($[0] !== description) {
    installOption = {
      label: "Install it2 now",
      value: "install",
      description,
    };
    $[0] = description;
    $[1] = installOption;
  } else installOption = $[1];
  let options;
  if ($[2] !== installOption || $[3] !== tmuxAvailable) {
    options = [installOption];
    if (tmuxAvailable) {
      let tmuxOption;
      if ($[5] === MEMO_CACHE_SENTINEL) {
        tmuxOption = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Opens teammates in a separate tmux session",
        };
        $[5] = tmuxOption;
      } else tmuxOption = $[5];
      options.push(tmuxOption);
    }
    let cancelOption;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      cancelOption = {
        label: "Cancel",
        value: "cancel",
        description: "Skip teammate spawning for now",
      };
      $[6] = cancelOption;
    } else cancelOption = $[6];
    options.push(cancelOption);
    $[2] = installOption;
    $[3] = tmuxAvailable;
    $[4] = options;
  } else options = $[4];
  let leadText;
  let detailText;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    leadText = jsxProd_default_2(Text, {
      children: [
        "To use native iTerm2 split panes for teammates, you need the",
        " ",
        jsxProd_default(Text, {
          bold: true,
          children: "it2",
        }),
        " CLI tool.",
      ],
    });
    detailText = jsxProd_default(Text, {
      dimColor: true,
      children: "This enables teammates to appear as split panes within your current window.",
    });
    $[7] = leadText;
    $[8] = detailText;
  } else {
    leadText = $[7];
    detailText = $[8];
  }
  let onChange;
  if ($[9] !== onCancel || $[10] !== onInstall || $[11] !== onUseTmux) {
    onChange = (selectedValue) => {
      xt: switch (selectedValue) {
        case "install": {
          onInstall();
          break xt;
        }
        case "tmux": {
          onUseTmux();
          break xt;
        }
        case "cancel": {
          onCancel();
        }
      }
    };
    $[9] = onCancel;
    $[10] = onInstall;
    $[11] = onUseTmux;
    $[12] = onChange;
  } else onChange = $[12];
  let dialog;
  if ($[13] !== onCancel || $[14] !== options || $[15] !== refuseInput || $[16] !== onChange) {
    dialog = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        leadText,
        detailText,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(ModelSelector, {
            refuseInput,
            hideIndexes: true,
            selectedValue: NO_COMMITTED_ROW,
            options,
            onChange,
            onCancel,
          }),
        }),
      ],
    });
    $[13] = onCancel;
    $[14] = options;
    $[15] = refuseInput;
    $[16] = onChange;
    $[17] = dialog;
  } else dialog = $[17];
  return dialog;
}
//@ chunk-czq1j3j2.js:1291746-1292174 placement
/**
 * it2 安装进行中界面：显示转圈和所用的包管理器。
 */
function It2Installing(props) {
  let $ = useMemoCache(6);
  let { packageManager } = props;
  let spinner;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    spinner = jsxProd_default(Spinner, {});
    $[0] = spinner;
  } else spinner = $[0];
  let installingRow;
  if ($[1] !== packageManager) {
    installingRow = jsxProd_default_2(Box, {
      children: [
        spinner,
        jsxProd_default_2(Text, {
          children: [" Installing it2 using ", packageManager, "\u2026"],
        }),
      ],
    });
    $[1] = packageManager;
    $[2] = installingRow;
  } else installingRow = $[2];
  let waitText;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    waitText = jsxProd_default(Text, {
      dimColor: true,
      children: "This may take a moment.",
    });
    $[3] = waitText;
  } else waitText = $[3];
  let elements;
  if ($[4] !== installingRow) {
    elements = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [installingRow, waitText],
    });
    $[4] = installingRow;
    $[5] = elements;
  } else elements = $[5];
  return elements;
}
//@ chunk-czq1j3j2.js:1292174-1293796 fingerprint (2.1.88 match: It2SetupPrompt, 0.535)
/**
 * it2 安装失败界面：显示错误与手动安装命令，选项为重试、改用 tmux（tmux 可用时）、取消。
 */
function It2SetupPrompt(props) {
  let $ = useMemoCache(23);
  let { error, packageManager, tmuxAvailable, onRetry, onUseTmux, onCancel, refuseInput } = props;
  let retryOption;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    retryOption = {
      label: "Try again",
      value: "retry",
      description: "Retry the installation",
    };
    $[0] = retryOption;
  } else retryOption = $[0];
  let options;
  if ($[1] !== tmuxAvailable) {
    options = [retryOption];
    if (tmuxAvailable) {
      let tmuxOption;
      if ($[3] === MEMO_CACHE_SENTINEL) {
        tmuxOption = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Falls back to tmux for teammate panes",
        };
        $[3] = tmuxOption;
      } else tmuxOption = $[3];
      options.push(tmuxOption);
    }
    let cancelOption;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      cancelOption = {
        label: "Cancel",
        value: "cancel",
        description: "Skip teammate spawning for now",
      };
      $[4] = cancelOption;
    } else cancelOption = $[4];
    options.push(cancelOption);
    $[1] = tmuxAvailable;
    $[2] = options;
  } else options = $[2];
  let failureText;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    failureText = jsxProd_default(Text, {
      color: "error",
      children: "Installation failed",
    });
    $[5] = failureText;
  } else failureText = $[5];
  let errorText;
  if ($[6] !== error) {
    errorText =
      error &&
      jsxProd_default(Text, {
        dimColor: true,
        children: error,
      });
    $[6] = error;
    $[7] = errorText;
  } else errorText = $[7];
  const manualCommand =
    packageManager === "uvx"
      ? "uv tool install it2"
      : packageManager === "pipx"
        ? "pipx install it2"
        : "pip install --user it2";
  let manualHint;
  if ($[8] !== manualCommand) {
    manualHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["You can try installing manually:", " ", manualCommand],
    });
    $[8] = manualCommand;
    $[9] = manualHint;
  } else manualHint = $[9];
  let onChange;
  if ($[10] !== onCancel || $[11] !== onRetry || $[12] !== onUseTmux) {
    onChange = (value) => {
      It: switch (value) {
        case "retry": {
          onRetry();
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
    };
    $[10] = onCancel;
    $[11] = onRetry;
    $[12] = onUseTmux;
    $[13] = onChange;
  } else onChange = $[13];
  let selector;
  if ($[14] !== onCancel || $[15] !== options || $[16] !== refuseInput || $[17] !== onChange) {
    selector = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(ModelSelector, {
        refuseInput,
        hideIndexes: true,
        selectedValue: NO_COMMITTED_ROW,
        options,
        onChange,
        onCancel,
      }),
    });
    $[14] = onCancel;
    $[15] = options;
    $[16] = refuseInput;
    $[17] = onChange;
    $[18] = selector;
  } else selector = $[18];
  let elements;
  if ($[19] !== errorText || $[20] !== manualHint || $[21] !== selector) {
    elements = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [failureText, errorText, manualHint, selector],
    });
    $[19] = errorText;
    $[20] = manualHint;
    $[21] = selector;
    $[22] = elements;
  } else elements = $[22];
  return elements;
}
//@ chunk-czq1j3j2.js:1293796-1294324 placement
/**
 * it2 安装成功的提示界面。
 */
function It2InstalledSuccess() {
  let $ = useMemoCache(6);
  let RootBox;
  let flexDirection;
  let gap;
  let successText;
  let instructionsBox;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let pythonApiInstructions = getPythonApiInstructions();
    RootBox = Box;
    flexDirection = "column";
    gap = 1;
    successText = jsxProd_default_2(Text, {
      color: "success",
      children: [
        jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        }),
        "it2 installed successfully",
      ],
    });
    instructionsBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: pythonApiInstructions.map(renderPlainText),
    });
    $[0] = RootBox;
    $[1] = flexDirection;
    $[2] = gap;
    $[3] = successText;
    $[4] = instructionsBox;
  } else {
    RootBox = $[0];
    flexDirection = $[1];
    gap = $[2];
    successText = $[3];
    instructionsBox = $[4];
  }
  let elements;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    elements = jsxProd_default_2(RootBox, {
      flexDirection,
      gap,
      children: [
        successText,
        instructionsBox,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "Press Enter when ready to verify\u2026",
          }),
        }),
      ],
    });
    $[5] = elements;
  } else elements = $[5];
  return elements;
}
//@ chunk-czq1j3j2.js:1294324-1294488 placement
function It2Verifying() {
  let $ = useMemoCache(1);
  let elements;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    elements = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default(Text, {
          children: " Verifying it2 can communicate with iTerm2\u2026",
        }),
      ],
    });
    $[0] = elements;
  } else elements = $[0];
  return elements;
}
//@ chunk-czq1j3j2.js:1294488-1294780 placement
function It2SplitPaneReady() {
  let $ = useMemoCache(1);
  let elements;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    elements = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          color: "success",
          children: [
            jsxProd_default(StatusIcon, {
              status: "success",
              withSpace: true,
            }),
            "iTerm2 split pane support is ready",
          ],
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "Teammates will now appear as split panes.",
        }),
      ],
    });
    $[0] = elements;
  } else elements = $[0];
  return elements;
}
//@ chunk-czq1j3j2.js:1294780-1296454 placement
function It2SetupError(props) {
  let $ = useMemoCache(22);
  let { error, tmuxAvailable, onRetry, onUseTmux, onCancel, refuseInput } = props;
  let retryOption;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    retryOption = {
      label: "Try again",
      value: "retry",
      description: "Verify the connection again",
    };
    $[0] = retryOption;
  } else retryOption = $[0];
  let options;
  if ($[1] !== tmuxAvailable) {
    options = [retryOption];
    if (tmuxAvailable) {
      let tmuxOption;
      if ($[3] === MEMO_CACHE_SENTINEL) {
        tmuxOption = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Falls back to tmux for teammate panes",
        };
        $[3] = tmuxOption;
      } else tmuxOption = $[3];
      options.push(tmuxOption);
    }
    let cancelOption;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      cancelOption = {
        label: "Cancel",
        value: "cancel",
        description: "Skip teammate spawning for now",
      };
      $[4] = cancelOption;
    } else cancelOption = $[4];
    options.push(cancelOption);
    $[1] = tmuxAvailable;
    $[2] = options;
  } else options = $[2];
  let failureText;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    failureText = jsxProd_default(Text, {
      color: "error",
      children: "Verification failed",
    });
    $[5] = failureText;
  } else failureText = $[5];
  let errorText;
  if ($[6] !== error) {
    errorText =
      error &&
      jsxProd_default(Text, {
        dimColor: true,
        children: error,
      });
    $[6] = error;
    $[7] = errorText;
  } else errorText = $[7];
  let makeSureText;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    makeSureText = jsxProd_default(Text, {
      children: "Make sure:",
    });
    $[8] = makeSureText;
  } else makeSureText = $[8];
  let checklist;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    checklist = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingLeft: 2,
      children: [
        jsxProd_default(Text, {
          children: "\xB7 Python API is enabled in iTerm2 preferences",
        }),
        jsxProd_default(Text, {
          children: "\xB7 You may need to restart iTerm2 after enabling",
        }),
      ],
    });
    $[9] = checklist;
  } else checklist = $[9];
  let onChange;
  if ($[10] !== onCancel || $[11] !== onRetry || $[12] !== onUseTmux) {
    onChange = (value) => {
      Ft: switch (value) {
        case "retry": {
          onRetry();
          break Ft;
        }
        case "tmux": {
          onUseTmux();
          break Ft;
        }
        case "cancel": {
          onCancel();
        }
      }
    };
    $[10] = onCancel;
    $[11] = onRetry;
    $[12] = onUseTmux;
    $[13] = onChange;
  } else onChange = $[13];
  let selector;
  if ($[14] !== onCancel || $[15] !== options || $[16] !== refuseInput || $[17] !== onChange) {
    selector = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(ModelSelector, {
        refuseInput,
        hideIndexes: true,
        selectedValue: NO_COMMITTED_ROW,
        options,
        onChange,
        onCancel,
      }),
    });
    $[14] = onCancel;
    $[15] = options;
    $[16] = refuseInput;
    $[17] = onChange;
    $[18] = selector;
  } else selector = $[18];
  let elements;
  if ($[19] !== errorText || $[20] !== selector) {
    elements = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [failureText, errorText, makeSureText, checklist, selector],
    });
    $[19] = errorText;
    $[20] = selector;
    $[21] = elements;
  } else elements = $[21];
  return elements;
}
export {
  It2InstallPrompt,
  It2Installing,
  It2SetupPrompt,
  It2InstalledSuccess,
  It2Verifying,
  It2SplitPaneReady,
  It2SetupError,
};
