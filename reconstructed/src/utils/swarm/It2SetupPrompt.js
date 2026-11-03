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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1264443-1265953 placement
/**
 * iTerm2 原生分屏队友所需的 it2 CLI 安装提示：选项为用包管理器安装、改用 tmux（可用时）或取消。
 */
function It2InstallPrompt(props) {
  let $ = w(18);
  let { packageManager, tmuxAvailable, onInstall, onUseTmux, onCancel, refuseInput } = props;
  const description = packageManager
    ? `Uses ${packageManager} to install the it2 CLI tool`
    : "Requires Python (uvx, pipx, or pip)";
  let We;
  if ($[0] !== description) {
    We = {
      label: "Install it2 now",
      value: "install",
      description,
    };
    $[0] = description;
    $[1] = We;
  } else We = $[1];
  let ze;
  if ($[2] !== We || $[3] !== tmuxAvailable) {
    ze = [We];
    if (tmuxAvailable) {
      let Xe;
      if ($[5] === MEMO_CACHE_SENTINEL) {
        Xe = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Opens teammates in a separate tmux session",
        };
        $[5] = Xe;
      } else Xe = $[5];
      ze.push(Xe);
    }
    let Xe;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      Xe = {
        label: "Cancel",
        value: "cancel",
        description: "Skip teammate spawning for now",
      };
      $[6] = Xe;
    } else Xe = $[6];
    ze.push(Xe);
    $[2] = We;
    $[3] = tmuxAvailable;
    $[4] = ze;
  } else ze = $[4];
  let Xe;
  let rt;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Xe = jsxProd_default_2(Text, {
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
    rt = jsxProd_default(Text, {
      dimColor: true,
      children: "This enables teammates to appear as split panes within your current window.",
    });
    $[7] = Xe;
    $[8] = rt;
  } else {
    Xe = $[7];
    rt = $[8];
  }
  let onChange;
  if ($[9] !== onCancel || $[10] !== onInstall || $[11] !== onUseTmux) {
    onChange = (At) => {
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
    };
    $[9] = onCancel;
    $[10] = onInstall;
    $[11] = onUseTmux;
    $[12] = onChange;
  } else onChange = $[12];
  let Ot;
  if ($[13] !== onCancel || $[14] !== ze || $[15] !== refuseInput || $[16] !== onChange) {
    Ot = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        Xe,
        rt,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(ModelSelector, {
            refuseInput,
            hideIndexes: true,
            selectedValue: NO_COMMITTED_ROW,
            options: ze,
            onChange,
            onCancel,
          }),
        }),
      ],
    });
    $[13] = onCancel;
    $[14] = ze;
    $[15] = refuseInput;
    $[16] = onChange;
    $[17] = Ot;
  } else Ot = $[17];
  return Ot;
}
//@ chunk-18hwfzwa.js:1265953-1266381 placement
/**
 * it2 安装进行中界面：显示转圈和所用的包管理器。
 */
function It2Installing(props) {
  let D = w(6);
  let { packageManager } = props;
  let L;
  if (D[0] === MEMO_CACHE_SENTINEL) {
    L = jsxProd_default(Spinner, {});
    D[0] = L;
  } else L = D[0];
  let ee;
  if (D[1] !== packageManager) {
    ee = jsxProd_default_2(Box, {
      children: [
        L,
        jsxProd_default_2(Text, {
          children: [" Installing it2 using ", packageManager, "\u2026"],
        }),
      ],
    });
    D[1] = packageManager;
    D[2] = ee;
  } else ee = D[2];
  let ke;
  if (D[3] === MEMO_CACHE_SENTINEL) {
    ke = jsxProd_default(Text, {
      dimColor: true,
      children: "This may take a moment.",
    });
    D[3] = ke;
  } else ke = D[3];
  let Re;
  if (D[4] !== ee) {
    Re = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [ee, ke],
    });
    D[4] = ee;
    D[5] = Re;
  } else Re = D[5];
  return Re;
}
//@ chunk-18hwfzwa.js:1266381-1268003 fingerprint = It2SetupPrompt (0.535)
/**
 * it2 安装失败界面：显示错误与手动安装命令，选项为重试、改用 tmux（tmux 可用时）、取消。
 */
function It2SetupPrompt(props) {
  let He = w(23);
  let { error, packageManager, tmuxAvailable, onRetry, onUseTmux, onCancel, refuseInput } = props;
  let We;
  if (He[0] === MEMO_CACHE_SENTINEL) {
    We = {
      label: "Try again",
      value: "retry",
      description: "Retry the installation",
    };
    He[0] = We;
  } else We = He[0];
  let ze;
  if (He[1] !== tmuxAvailable) {
    ze = [We];
    if (tmuxAvailable) {
      let Xe;
      if (He[3] === MEMO_CACHE_SENTINEL) {
        Xe = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Falls back to tmux for teammate panes",
        };
        He[3] = Xe;
      } else Xe = He[3];
      ze.push(Xe);
    }
    let Xe;
    if (He[4] === MEMO_CACHE_SENTINEL) {
      Xe = {
        label: "Cancel",
        value: "cancel",
        description: "Skip teammate spawning for now",
      };
      He[4] = Xe;
    } else Xe = He[4];
    ze.push(Xe);
    He[1] = tmuxAvailable;
    He[2] = ze;
  } else ze = He[2];
  let Xe;
  if (He[5] === MEMO_CACHE_SENTINEL) {
    Xe = jsxProd_default(Text, {
      color: "error",
      children: "Installation failed",
    });
    He[5] = Xe;
  } else Xe = He[5];
  let rt;
  if (He[6] !== error) {
    rt =
      error &&
      jsxProd_default(Text, {
        dimColor: true,
        children: error,
      });
    He[6] = error;
    He[7] = rt;
  } else rt = He[7];
  const kt =
    packageManager === "uvx"
      ? "uv tool install it2"
      : packageManager === "pipx"
        ? "pipx install it2"
        : "pip install --user it2";
  let At;
  if (He[8] !== kt) {
    At = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["You can try installing manually:", " ", kt],
    });
    He[8] = kt;
    He[9] = At;
  } else At = He[9];
  let onChange;
  if (He[10] !== onCancel || He[11] !== onRetry || He[12] !== onUseTmux) {
    onChange = (value) => {
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
    };
    He[10] = onCancel;
    He[11] = onRetry;
    He[12] = onUseTmux;
    He[13] = onChange;
  } else onChange = He[13];
  let Dt;
  if (He[14] !== onCancel || He[15] !== ze || He[16] !== refuseInput || He[17] !== onChange) {
    Dt = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(ModelSelector, {
        refuseInput,
        hideIndexes: true,
        selectedValue: NO_COMMITTED_ROW,
        options: ze,
        onChange,
        onCancel,
      }),
    });
    He[14] = onCancel;
    He[15] = ze;
    He[16] = refuseInput;
    He[17] = onChange;
    He[18] = Dt;
  } else Dt = He[18];
  let Lt;
  if (He[19] !== rt || He[20] !== At || He[21] !== Dt) {
    Lt = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Xe, rt, At, Dt],
    });
    He[19] = rt;
    He[20] = At;
    He[21] = Dt;
    He[22] = Lt;
  } else Lt = He[22];
  return Lt;
}
//@ chunk-18hwfzwa.js:1268003-1268531 placement
/**
 * it2 安装成功的提示界面。
 */
function It2InstalledSuccess() {
  let $ = w(6);
  let x;
  let flexDirection;
  let gap;
  let ee;
  let ke;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let pythonApiInstructions = getPythonApiInstructions();
    x = Box;
    flexDirection = "column";
    gap = 1;
    ee = jsxProd_default_2(Text, {
      color: "success",
      children: [
        jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        }),
        "it2 installed successfully",
      ],
    });
    ke = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: pythonApiInstructions.map(renderPlainText),
    });
    $[0] = x;
    $[1] = flexDirection;
    $[2] = gap;
    $[3] = ee;
    $[4] = ke;
  } else {
    x = $[0];
    flexDirection = $[1];
    gap = $[2];
    ee = $[3];
    ke = $[4];
  }
  let Be;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    Be = jsxProd_default_2(x, {
      flexDirection,
      gap,
      children: [
        ee,
        ke,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "Press Enter when ready to verify\u2026",
          }),
        }),
      ],
    });
    $[5] = Be;
  } else Be = $[5];
  return Be;
}
//@ chunk-18hwfzwa.js:1268531-1268695 placement
function It2Verifying() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default(Text, {
          children: " Verifying it2 can communicate with iTerm2\u2026",
        }),
      ],
    });
    $[0] = x;
  } else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:1268695-1268987 placement
function It2SplitPaneReady() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default_2(Box, {
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
    $[0] = x;
  } else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:1268987-1270661 placement
function It2SetupError(props) {
  let $ = w(22);
  let { error, tmuxAvailable, onRetry, onUseTmux, onCancel, refuseInput } = props;
  let He;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    He = {
      label: "Try again",
      value: "retry",
      description: "Verify the connection again",
    };
    $[0] = He;
  } else He = $[0];
  let We;
  if ($[1] !== tmuxAvailable) {
    We = [He];
    if (tmuxAvailable) {
      let ze;
      if ($[3] === MEMO_CACHE_SENTINEL) {
        ze = {
          label: "Use tmux instead",
          value: "tmux",
          description: "Falls back to tmux for teammate panes",
        };
        $[3] = ze;
      } else ze = $[3];
      We.push(ze);
    }
    let ze;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      ze = {
        label: "Cancel",
        value: "cancel",
        description: "Skip teammate spawning for now",
      };
      $[4] = ze;
    } else ze = $[4];
    We.push(ze);
    $[1] = tmuxAvailable;
    $[2] = We;
  } else We = $[2];
  let ze;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    ze = jsxProd_default(Text, {
      color: "error",
      children: "Verification failed",
    });
    $[5] = ze;
  } else ze = $[5];
  let Xe;
  if ($[6] !== error) {
    Xe =
      error &&
      jsxProd_default(Text, {
        dimColor: true,
        children: error,
      });
    $[6] = error;
    $[7] = Xe;
  } else Xe = $[7];
  let rt;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    rt = jsxProd_default(Text, {
      children: "Make sure:",
    });
    $[8] = rt;
  } else rt = $[8];
  let kt;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    kt = jsxProd_default_2(Box, {
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
    $[9] = kt;
  } else kt = $[9];
  let onChange;
  if ($[10] !== onCancel || $[11] !== onRetry || $[12] !== onUseTmux) {
    onChange = (It) => {
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
    };
    $[10] = onCancel;
    $[11] = onRetry;
    $[12] = onUseTmux;
    $[13] = onChange;
  } else onChange = $[13];
  let Et;
  if ($[14] !== onCancel || $[15] !== We || $[16] !== refuseInput || $[17] !== onChange) {
    Et = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(ModelSelector, {
        refuseInput,
        hideIndexes: true,
        selectedValue: NO_COMMITTED_ROW,
        options: We,
        onChange,
        onCancel,
      }),
    });
    $[14] = onCancel;
    $[15] = We;
    $[16] = refuseInput;
    $[17] = onChange;
    $[18] = Et;
  } else Et = $[18];
  let Dt;
  if ($[19] !== Xe || $[20] !== Et) {
    Dt = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [ze, Xe, rt, kt, Et],
    });
    $[19] = Xe;
    $[20] = Et;
    $[21] = Dt;
  } else Dt = $[21];
  return Dt;
}
//@ chunk-18hwfzwa.js:1270661-1270665 placement
init_react_production();
//@ chunk-18hwfzwa.js:1270665-1270669 placement
init_react_production();
export {
  It2InstallPrompt,
  It2Installing,
  It2SetupPrompt,
  It2InstalledSuccess,
  It2Verifying,
  It2SplitPaneReady,
  It2SetupError,
};
