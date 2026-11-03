/**
 * commands/ide/ide.tsx
 *
 * /ide 实现：检测运行中的 IDE、选择连接、安装扩展
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/ide/ide.tsx
 * pieces: chunk-5bdzenzx.js (24), chunk-e6aww6q8.js (1), chunk-fq0cr76a.js (1)
 * attribution: sole-consumer 5, file-local 1, fingerprint 11, placement 4, affinity 1, layout 4
 */
import * as pathModule from "path";
import { isIP } from "net";
import { getGlobalConfig } from "../../utils/config.js";
import {
  isSupportedTerminal,
  toIDEDisplayName,
  isJetBrainsTerminal,
  VSCODE_EXTENSION_DOCS_URL,
  getIdeAutoInstallSkipReason,
  isJetBrainsIde,
  getVSCodeIDECommand,
  detectIDEs,
  refreshRunningIDEs,
} from "../../utils/ide.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { isIdeClient } from "../mcp/mcp.js";
import { isIncludedMcpTool } from "../../services/mcp/client.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, P, R } from "../../../vendor/react/cjs/react.production.js";
import {
  shouldShowAutoConnectDialog,
  IdeAutoConnectDialog,
  IdeDisableAutoConnectDialog,
} from "../../components/IdeAutoConnectDialog.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { HintText } from "../../components/design-system/HintText.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { OverflowHint } from "../../components/CtrlOToExpand.js";
import { sequential } from "../../utils/sequential.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { PromptDialog } from "../../components/hooks/PromptDialog.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { getCwd } from "../../utils/cwd.js";
import { useAppState, useSetAppState } from "../../state/AppState.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { setMcpOnClose } from "../../services/mcp/mcpWireUtils.js";

//@ chunk-5bdzenzx.js:16087-16147 sole-consumer = _temp (1)
function shouldAutoConnectIdeAnyway() {
  let config = getGlobalConfig();
  return !isSupportedTerminal() && config.autoConnectIde === true;
}
//@ chunk-5bdzenzx.js:16147-16207 file-local
function countByName(acc, ide) {
  acc[ide.name] = (acc[ide.name] || 0) + 1;
  return acc;
}
//@ chunk-5bdzenzx.js:16207-16282 fingerprint = _temp2 (1)
function isVSCodeName(ide) {
  return ide.name === "VS Code" || ide.name === "Visual Studio Code";
}
//@ chunk-5bdzenzx.js:16282-16395 fingerprint = _temp3 (0.748)
function renderIdeWorkspaceRow(ide, index) {
  return jsxProd_default(
    BulletRow,
    {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [ide.name, ": ", formatWorkspaceFolders(ide.workspaceFolders)],
      }),
    },
    index,
  );
}
//@ chunk-5bdzenzx.js:16395-16450 sole-consumer
function renderAvailableIde(C) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: C.name,
    },
    C.port,
  );
}
//@ chunk-5bdzenzx.js:16450-16499 sole-consumer
function renderRunningIde(E) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: toIDEDisplayName(E),
    },
    E,
  );
}
//@ chunk-5bdzenzx.js:16538-16585 placement = _temp (1)
function findIdeClient(s) {
  return s.mcp.clients.find(isIdeClient);
}
//@ chunk-5bdzenzx.js:16585-16600 placement
function noop() {}
//@ chunk-5bdzenzx.js:16600-16639 placement = _temp2 (1)
function isNonIdeMcpClient(c) {
  return c.name !== "ide";
}
//@ chunk-5bdzenzx.js:16696-16751 sole-consumer = isIncludedMcpTool (1)
function isIncludedMcpTool_2(tool) {
  return !tool.name?.startsWith("mcp__ide__");
}
//@ chunk-5bdzenzx.js:16751-16891 sole-consumer = _temp (0.819)
function withoutIdeMcpEntries(s) {
  return {
    ...s,
    mcp: {
      ...s.mcp,
      clients: s.mcp.clients.filter(isNonIdeMcpClient),
      tools: s.mcp.tools.filter(isIncludedMcpTool),
      commands: s.mcp.commands.filter(isIncludedMcpTool_2),
    },
  };
}
//@ chunk-5bdzenzx.js:16891-16940 affinity
function withoutIdeEntry(Cn) {
  let { ide, ...N } = Cn ?? {};
  return N;
}
//@ chunk-5bdzenzx.js:16940-20006 fingerprint = IDEScreen (0.611)
function IDEScreen(props) {
  let t = w(45);
  let { availableIDEs, unavailableIDEs, selectedIDE, onClose, onSelect } = props;
  let t1;
  if (t[0] !== selectedIDE?.port) {
    t1 = selectedIDE?.port?.toString() ?? "None";
    t[0] = selectedIDE?.port;
    t[1] = t1;
  } else t1 = t[1];
  let [selectedValue, setSelectedValue] = y(t1);
  let [showAutoConnectDialog, setShowAutoConnectDialog] = y(false);
  let [showDisableAutoConnectDialog, setShowDisableAutoConnectDialog] = y(false);
  let t2;
  if (t[2] !== availableIDEs || t[3] !== onSelect) {
    t2 = (value) => {
      if (value !== "None" && shouldShowAutoConnectDialog()) setShowAutoConnectDialog(true);
      else if (value === "None" && shouldAutoConnectIdeAnyway()) setShowDisableAutoConnectDialog(true);
      else onSelect(availableIDEs.find((ide) => ide.port === parseInt(value)));
    };
    t[2] = availableIDEs;
    t[3] = onSelect;
    t[4] = t2;
  } else t2 = t[4];
  let handleSelectIDE = t2;
  let t3;
  if (t[5] !== availableIDEs) {
    t3 = availableIDEs.reduce(countByName, {});
    t[5] = availableIDEs;
    t[6] = t3;
  } else t3 = t[6];
  let ideCounts = t3;
  let H;
  let A;
  let F;
  let flexDirection;
  let J;
  let title;
  let subtitle;
  let onCancel;
  let color;
  if (
    t[7] !== availableIDEs ||
    t[8] !== handleSelectIDE ||
    t[9] !== ideCounts ||
    t[10] !== onClose ||
    t[11] !== onSelect ||
    t[12] !== selectedValue ||
    t[13] !== showAutoConnectDialog ||
    t[14] !== showDisableAutoConnectDialog
  ) {
    F = EARLY_RETURN_SENTINEL;
    Ht: {
      let t5;
      if (t[24] !== ideCounts) {
        t5 = (ide) => {
          let Cn = (ideCounts[ide.name] || 0) > 1 && ide.workspaceFolders.length > 0;
          return {
            label: ide.name,
            value: ide.port.toString(),
            description: Cn ? formatWorkspaceFolders(ide.workspaceFolders) : undefined,
          };
        };
        t[24] = ideCounts;
        t[25] = t5;
      } else t5 = t[25];
      let combined = availableIDEs.map(t5).concat([
        {
          label: "None",
          value: "None",
          description: undefined,
        },
      ]);
      if (showAutoConnectDialog) {
        let t5;
        if (t[26] !== handleSelectIDE || t[27] !== selectedValue) {
          t5 = jsxProd_default(IdeAutoConnectDialog, {
            onComplete: () => handleSelectIDE(selectedValue),
          });
          t[26] = handleSelectIDE;
          t[27] = selectedValue;
          t[28] = t5;
        } else t5 = t[28];
        F = t5;
        break Ht;
      }
      if (showDisableAutoConnectDialog) {
        let t5;
        if (t[29] !== onSelect) {
          t5 = jsxProd_default(IdeDisableAutoConnectDialog, {
            onComplete: () => {
              onSelect(undefined);
            },
          });
          t[29] = onSelect;
          t[30] = t5;
        } else t5 = t[30];
        F = t5;
        break Ht;
      }
      A = Dialog;
      title = "Select IDE";
      subtitle = "Connect to an IDE for integrated development features.";
      onCancel = onClose;
      color = "ide";
      H = Box;
      flexDirection = "column";
      J =
        availableIDEs.length === 0
          ? jsxProd_default(HintText, {
              children: isJetBrainsTerminal()
                ? `No available IDEs detected. Please install the plugin and restart your IDE:
https://code.claude.com/docs/en/jetbrains`
                : "No available IDEs detected. Make sure your IDE has the Claude Code extension or plugin installed and is running.",
            })
          : jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(OrderedListWithItem, {
                  defaultFocusIndex: combined.findIndex((Ho) => Ho.value === selectedValue),
                  onSelect: (Jo) => {
                    let Le = combined[Jo];
                    if (!Le) {
                      return;
                    }
                    setSelectedValue(Le.value);
                    handleSelectIDE(Le.value);
                  },
                  children: combined.map((ge) =>
                    jsxProd_default(
                      OrderedListWithItem.Item,
                      {
                        label: ge.label,
                        icon:
                          ge.value === selectedValue
                            ? jsxProd_default(StatusIcon, {
                                status: "success",
                                "aria-label": "current:",
                              })
                            : undefined,
                        description: ge.description,
                      },
                      ge.value,
                    ),
                  ),
                }),
                availableIDEs.some(isVSCodeName) &&
                  jsxProd_default(Box, {
                    marginTop: 1,
                    children: jsxProd_default(Text, {
                      color: "warning",
                      children: "Note: Only one Claude Code instance can be connected to VS Code at a time.",
                    }),
                  }),
                !isSupportedTerminal() &&
                  jsxProd_default(Box, {
                    marginTop: 1,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: "Tip: You can enable auto-connect to IDE in /config or with the --ide flag",
                    }),
                  }),
              ],
            });
    }
    t[7] = availableIDEs;
    t[8] = handleSelectIDE;
    t[9] = ideCounts;
    t[10] = onClose;
    t[11] = onSelect;
    t[12] = selectedValue;
    t[13] = showAutoConnectDialog;
    t[14] = showDisableAutoConnectDialog;
    t[15] = H;
    t[16] = A;
    t[17] = F;
    t[18] = flexDirection;
    t[19] = J;
    t[20] = title;
    t[21] = subtitle;
    t[22] = onCancel;
    t[23] = color;
  } else {
    H = t[15];
    A = t[16];
    F = t[17];
    flexDirection = t[18];
    J = t[19];
    title = t[20];
    subtitle = t[21];
    onCancel = t[22];
    color = t[23];
  }
  if (F !== EARLY_RETURN_SENTINEL) return F;
  let L;
  if (t[31] !== unavailableIDEs) {
    L =
      unavailableIDEs.length > 0 &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Found ",
              unavailableIDEs.length,
              " other running IDE(s). However, their workspace or project directories don't match the current directory.",
            ],
          }),
          jsxProd_default_2(Box, {
            marginTop: 1,
            paddingLeft: 3,
            flexDirection: "column",
            children: [
              unavailableIDEs.slice(0, 4).map(renderIdeWorkspaceRow),
              unavailableIDEs.length > 4 &&
                jsxProd_default(OverflowHint, {
                  count: unavailableIDEs.length - 4,
                  unit: "IDE",
                }),
            ],
          }),
        ],
      });
    t[31] = unavailableIDEs;
    t[32] = L;
  } else L = t[32];
  let children;
  if (t[33] !== H || t[34] !== L || t[35] !== flexDirection || t[36] !== J) {
    children = jsxProd_default_2(H, {
      flexDirection,
      children: [J, L],
    });
    t[33] = H;
    t[34] = L;
    t[35] = flexDirection;
    t[36] = J;
    t[37] = children;
  } else children = t[37];
  let En;
  if (
    t[38] !== A ||
    t[39] !== children ||
    t[40] !== title ||
    t[41] !== subtitle ||
    t[42] !== onCancel ||
    t[43] !== color
  ) {
    En = jsxProd_default(A, {
      title,
      subtitle,
      onCancel,
      color,
      children,
    });
    t[38] = A;
    t[39] = children;
    t[40] = title;
    t[41] = subtitle;
    t[42] = onCancel;
    t[43] = color;
    t[44] = En;
  } else En = t[44];
  return En;
}
//@ chunk-5bdzenzx.js:20006-20152 fingerprint = findCurrentIDE (1)
async function findCurrentIDE(availableIDEs, dynamicMcpConfig) {
  let currentConfig = dynamicMcpConfig?.ide;
  if (!currentConfig || (currentConfig.type !== "sse-ide" && currentConfig.type !== "ws-ide")) return null;
  for (let ide of availableIDEs) if (ide.url === currentConfig.url) return ide;
  return null;
}
//@ chunk-5bdzenzx.js:20152-20717 fingerprint = IDEOpenSelection (0.843)
function IDEOpenSelection(props) {
  let $ = w(13);
  let { availableIDEs, onSelectIDE, onDone } = props;
  let t1;
  if ($[0] !== onDone) {
    t1 = function t() {
      onDone("IDE selection cancelled", {
        display: "system",
      });
    };
    $[0] = onDone;
    $[1] = t1;
  } else t1 = $[1];
  let onCancel = t1;
  let onSelect;
  if ($[2] !== availableIDEs || $[3] !== onSelectIDE) {
    onSelect = (value) => onSelectIDE(availableIDEs[value]);
    $[2] = availableIDEs;
    $[3] = onSelectIDE;
    $[4] = onSelect;
  } else onSelect = $[4];
  let children;
  if ($[5] !== availableIDEs) {
    children = availableIDEs.map(renderAvailableIde);
    $[5] = availableIDEs;
    $[6] = children;
  } else children = $[6];
  let children_2;
  if ($[7] !== onSelect || $[8] !== children) {
    children_2 = jsxProd_default(OrderedListWithItem, {
      onSelect,
      children,
    });
    $[7] = onSelect;
    $[8] = children;
    $[9] = children_2;
  } else children_2 = $[9];
  let d;
  if ($[10] !== onCancel || $[11] !== children_2) {
    d = jsxProd_default(Dialog, {
      title: "Select an IDE to open the project",
      onCancel,
      color: "ide",
      children: children_2,
    });
    $[10] = onCancel;
    $[11] = children_2;
    $[12] = d;
  } else d = $[12];
  return d;
}
//@ chunk-5bdzenzx.js:20717-21294 fingerprint = RunningIDESelector (0.772)
function RunningIDESelector(props) {
  let $ = w(13);
  let { runningIDEs, onSelectIDE, onDone } = props;
  let l;
  if ($[0] !== onDone) {
    l = function value() {
      onDone("IDE selection cancelled", {
        display: "system",
      });
    };
    $[0] = onDone;
    $[1] = l;
  } else l = $[1];
  let onCancel = l;
  let onSelect;
  if ($[2] !== onSelectIDE || $[3] !== runningIDEs) {
    onSelect = (p) => {
      let h = runningIDEs[p];
      if (h) onSelectIDE(h);
    };
    $[2] = onSelectIDE;
    $[3] = runningIDEs;
    $[4] = onSelect;
  } else onSelect = $[4];
  let children;
  if ($[5] !== runningIDEs) {
    children = runningIDEs.map(renderRunningIde);
    $[5] = runningIDEs;
    $[6] = children;
  } else children = $[6];
  let children_2;
  if ($[7] !== onSelect || $[8] !== children) {
    children_2 = jsxProd_default(OrderedListWithItem, {
      onSelect,
      children,
    });
    $[7] = onSelect;
    $[8] = children;
    $[9] = children_2;
  } else children_2 = $[9];
  let t6;
  if ($[10] !== onCancel || $[11] !== children_2) {
    t6 = jsxProd_default(Dialog, {
      title: "Select IDE to set up Claude Code",
      onCancel,
      color: "ide",
      children: children_2,
    });
    $[10] = onCancel;
    $[11] = children_2;
    $[12] = t6;
  } else t6 = $[12];
  return t6;
}
//@ chunk-5bdzenzx.js:21294-21455 fingerprint = InstallOnMount (1)
function InstallOnMount(props) {
  let $ = w(4);
  let { ide, onInstall } = props;
  let t1;
  let t2;
  if ($[0] !== ide || $[1] !== onInstall) {
    t1 = () => {
      onInstall(ide);
    };
    t2 = [ide, onInstall];
    $[0] = ide;
    $[1] = onInstall;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  P(t1, t2);
  return null;
}
//@ chunk-5bdzenzx.js:21455-22661 layout
/**
 * /ide 安装扩展步骤组件：挂载时调用 installExtension，按结果回报已安装/需重载/失败/跳过原因；Esc 停止等待并提示稍后用 /status 查看。
 */
function InstallExtensionStep(props) {
  let u = w(14);
  let { ide, installExtension, onDone } = props;
  let l;
  if (u[0] !== ide) {
    l = toIDEDisplayName(ide);
    u[0] = ide;
    u[1] = l;
  } else l = u[1];
  let t = l;
  let I;
  let p;
  if (u[2] !== ide || u[3] !== t || u[4] !== installExtension || u[5] !== onDone) {
    I = () => {
      let h = true;
      installExtension(ide).then((D) => {
        if (!h) {
          return;
        }
        let d = sequential.bold(t);
        let C = `To install it yourself, see ${VSCODE_EXTENSION_DOCS_URL}`;
        if (D?.installed)
          onDone(
            D.previouslyInstalled
              ? `The Claude Code extension is installed in ${d}. Reload the ${t} window (Developer: Reload Window), then run /ide again.`
              : `Installed the Claude Code extension in ${d}.`,
          );
        else if (D?.error)
          onDone(`Couldn't install the Claude Code extension in ${d}:
${D.error}
${C}`);
        else {
          let E =
            getIdeAutoInstallSkipReason() ??
            (isRemoteSessionAvailable() ? "this session's workspace is remote" : null);
          onDone(`Didn't install the Claude Code extension in ${d}${E ? ` because ${E}` : ""}.
${C}`);
        }
      });
      return () => {
        h = false;
      };
    };
    p = [ide, t, installExtension, onDone];
    u[2] = ide;
    u[3] = t;
    u[4] = installExtension;
    u[5] = onDone;
    u[6] = I;
    u[7] = p;
  } else {
    I = u[6];
    p = u[7];
  }
  P(I, p);
  const message = `Installing the Claude Code extension in ${t}\u2026`;
  let onCancel;
  if (u[8] !== t || u[9] !== onDone) {
    onCancel = () =>
      onDone(
        `Still installing the Claude Code extension in ${t}. /status shows the result when it finishes.`,
        {
          display: "system",
        },
      );
    u[8] = t;
    u[9] = onDone;
    u[10] = onCancel;
  } else onCancel = u[10];
  let O;
  if (u[11] !== message || u[12] !== onCancel) {
    O = jsxProd_default(PromptDialog, {
      message,
      escAction: "stop waiting",
      onCancel,
    });
    u[11] = message;
    u[12] = onCancel;
    u[13] = O;
  } else O = u[13];
  return O;
}
//@ chunk-5bdzenzx.js:22661-23489 layout
/**
 * /ide 安装扩展流程：JetBrains 直接安装并提示重启；只有一个运行中 IDE 时自动安装，否则先让用户选择。
 */
function InstallExtensionFlow(props) {
  let t = w(16);
  let { runningIDEs, installExtension, onDone } = props;
  let [u, l] = y(null);
  let I;
  if (t[0] !== installExtension || t[1] !== onDone) {
    I = (p) => {
      if (isJetBrainsIde(p)) {
        installExtension(p);
        let ideDisplayName = toIDEDisplayName(p);
        onDone(`Couldn't find the Claude Code plugin running in ${sequential.bold(ideDisplayName)}.
${sequential.bold(`restart ${ideDisplayName}`)} completely and run /ide again.
`);
        return;
      }
      l(p);
    };
    t[0] = installExtension;
    t[1] = onDone;
    t[2] = I;
  } else I = t[2];
  let D = I;
  if (u) {
    let d;
    if (t[3] !== installExtension || t[4] !== u || t[5] !== onDone) {
      d = jsxProd_default(InstallExtensionStep, {
        ide: u,
        installExtension,
        onDone,
      });
      t[3] = installExtension;
      t[4] = u;
      t[5] = onDone;
      t[6] = d;
    } else d = t[6];
    return d;
  }
  if (runningIDEs.length === 1) {
    let d;
    if (t[7] !== D || t[8] !== runningIDEs[0]) {
      d = jsxProd_default(InstallOnMount, {
        ide: runningIDEs[0],
        onInstall: D,
      });
      t[7] = D;
      t[8] = runningIDEs[0];
      t[9] = d;
    } else d = t[9];
    return d;
  }
  let onDone_2;
  if (t[10] !== onDone) {
    onDone_2 = () => {
      onDone("No IDE selected.", {
        display: "system",
      });
    };
    t[10] = onDone;
    t[11] = onDone_2;
  } else onDone_2 = t[11];
  let C;
  if (t[12] !== D || t[13] !== runningIDEs || t[14] !== onDone_2) {
    C = jsxProd_default(RunningIDESelector, {
      runningIDEs,
      onSelectIDE: D,
      onDone: onDone_2,
    });
    t[12] = D;
    t[13] = runningIDEs;
    t[14] = onDone_2;
    t[15] = C;
  } else C = t[15];
  return C;
}
//@ chunk-5bdzenzx.js:23489-24052 layout
/**
 * 用选中的 IDE 打开项目或 worktree 目录：VS Code 系找到命令行工具后执行，失败再试 code；记录 ide_open_project 遥测并回报结果。
 */
async function openProjectInIde(ide, targetPath, isWorktree, report) {
  if (!ide) {
    report("No IDE selected.");
    return;
  }
  let vsCodeFamily = detectVSCodeFamily(ide.name);
  let l = vsCodeFamily ? await getVSCodeIDECommand(vsCodeFamily, ide.name) : null;
  if (!l) {
    report(
      `Please open the ${isWorktree ? "worktree" : "project"} manually in ${sequential.bold(ide.name)}: ${targetPath}`,
    );
    return;
  }
  let t = {
    useCwd: true,
    useToolMemoryCgroup: false,
  };
  let { code } = await execFileNoThrow(l, [targetPath], t);
  if (code !== 0 && !pathModule.basename(l).startsWith("code"))
    ({ code } = await execFileNoThrow("code", [targetPath], t));
  if (code === 0) {
    logFeatureOk("ide_open_project");
    report(`Opened ${isWorktree ? "worktree" : "project"} in ${sequential.bold(ide.name)}`);
    return;
  }
  logFeatureBad("ide_open_project", "ide_open_project_failed");
  report(`Failed to open in ${ide.name}. Try opening manually: ${targetPath}`);
}
//@ chunk-5bdzenzx.js:24052-24808 fingerprint = call (0.612)
/**
 * /ide 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  logEvent("tengu_ext_ide_command", {});
  let {
    options: { dynamicMcpConfig },
    onChangeDynamicMcpConfig,
  } = context;
  if (args?.trim() === "open") {
    let worktreeSession = getCurrentWorktreeSession();
    let targetPath = worktreeSession ? worktreeSession.worktreePath : getCwd();
    let availableIDEs = (await detectIDEs(true)).filter((ide) => ide.isValid);
    if (availableIDEs.length === 0) {
      onDone("No IDEs with Claude Code extension detected.");
      return null;
    }
    return jsxProd_default(IDEOpenSelection, {
      availableIDEs,
      onSelectIDE: (selectedIDE) => openProjectInIde(selectedIDE, targetPath, !!worktreeSession, onDone),
      onDone: () => {
        onDone("Exited without opening IDE", {
          display: "system",
        });
      },
    });
  }
  let detectedIDEs = await detectIDEs(true);
  let onInstallIDEExtension = context.onInstallIDEExtension;
  if (detectedIDEs.length === 0 && onInstallIDEExtension && !isSupportedTerminal()) {
    let runningIDEs = await refreshRunningIDEs();
    if (runningIDEs.length > 0)
      return jsxProd_default(InstallExtensionFlow, {
        runningIDEs,
        installExtension: onInstallIDEExtension,
        onDone,
      });
  }
  let availableIDEs = detectedIDEs.filter((ide) => ide.isValid);
  let unavailableIDEs = detectedIDEs.filter((ide) => !ide.isValid);
  let currentIDE = await findCurrentIDE(availableIDEs, dynamicMcpConfig);
  return jsxProd_default(IDECommandFlow, {
    availableIDEs,
    unavailableIDEs,
    currentIDE,
    onChangeDynamicMcpConfig,
    onDone,
  });
}
//@ chunk-5bdzenzx.js:24808-24821 layout
var IDE_CONNECT_TIMEOUT_MS = 35000;
//@ chunk-5bdzenzx.js:24821-26672 fingerprint = IDECommandFlow (0.79)
function IDECommandFlow(props) {
  let $ = w(27);
  let { availableIDEs, unavailableIDEs, currentIDE, onChangeDynamicMcpConfig, onDone } = props;
  let [connectingIDE, setConnectingIDE] = y(null);
  let appState = useAppState(findIdeClient);
  let setAppState = useSetAppState();
  let isFirstCheckRef = R(true);
  let C;
  let E;
  if ($[0] !== connectingIDE || $[1] !== appState || $[2] !== onDone) {
    C = () => {
      if (!connectingIDE) {
        return;
      }
      if (isFirstCheckRef.current) {
        isFirstCheckRef.current = false;
        return;
      }
      if (!appState || appState.type === "pending") {
        return;
      }
      if (appState.type === "connected") {
        logFeatureOk("ide_connect");
        onDone(`Connected to ${connectingIDE.name}.`);
      } else if (appState.type === "failed") {
        logFeatureBad("ide_connect", "ide_connect_failed");
        onDone(`Failed to connect to ${connectingIDE.name}.`);
      }
    };
    E = [appState, connectingIDE, onDone];
    $[0] = connectingIDE;
    $[1] = appState;
    $[2] = onDone;
    $[3] = C;
    $[4] = E;
  } else {
    C = $[3];
    E = $[4];
  }
  P(C, E);
  let x;
  if ($[5] !== connectingIDE || $[6] !== onDone) {
    x = () => {
      if (!connectingIDE) {
        return;
      }
      logFeatureBad("ide_connect", "ide_connect_timeout");
      onDone(`Connection to ${connectingIDE.name} timed out.`);
    };
    $[5] = connectingIDE;
    $[6] = onDone;
    $[7] = x;
  } else x = $[7];
  let k;
  if ($[8] !== connectingIDE || $[9] !== onDone) {
    k = [connectingIDE, onDone];
    $[8] = connectingIDE;
    $[9] = onDone;
    $[10] = k;
  } else k = $[10];
  useTimeout(x, connectingIDE ? IDE_CONNECT_TIMEOUT_MS : null, k);
  let O;
  if (
    $[11] !== currentIDE ||
    $[12] !== appState ||
    $[13] !== onChangeDynamicMcpConfig ||
    $[14] !== onDone ||
    $[15] !== setAppState
  ) {
    O = (selectedIDE) => {
      if (!onChangeDynamicMcpConfig) {
        onDone("Error connecting to IDE.");
        return;
      }
      if (!selectedIDE) {
        if (appState && appState.type === "connected" && currentIDE) {
          setMcpOnClose(appState, noop);
          let { clearServerCache } = require("./chunk-asne9cp8.js").mcpClientModule();
          clearServerCache("ide", appState.config);
          setAppState(withoutIdeMcpEntries);
        }
        onChangeDynamicMcpConfig(withoutIdeEntry);
        if (currentIDE) logFeatureOk("ide_disconnect");
        onDone(currentIDE ? `Disconnected from ${currentIDE.name}.` : "No IDE selected.");
        return;
      }
      let url = selectedIDE.url;
      let ide = {
        type: url.startsWith("ws:") ? "ws-ide" : "sse-ide",
        url,
        ideName: selectedIDE.name,
        authToken: selectedIDE.authToken,
        ideRunningInWindows: selectedIDE.ideRunningInWindows,
        scope: "dynamic",
      };
      isFirstCheckRef.current = true;
      setConnectingIDE(selectedIDE);
      onChangeDynamicMcpConfig((prev) => ({
        ...prev,
        ide,
      }));
    };
    $[11] = currentIDE;
    $[12] = appState;
    $[13] = onChangeDynamicMcpConfig;
    $[14] = onDone;
    $[15] = setAppState;
    $[16] = O;
  } else O = $[16];
  let onSelect = O;
  if (connectingIDE) {
    let b;
    if ($[17] !== connectingIDE.name) {
      b = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Connecting to ", connectingIDE.name, "\u2026"],
      });
      $[17] = connectingIDE.name;
      $[18] = b;
    } else b = $[18];
    return b;
  }
  let onClose;
  if ($[19] !== onDone) {
    onClose = () =>
      onDone("IDE selection cancelled", {
        display: "system",
      });
    $[19] = onDone;
    $[20] = onClose;
  } else onClose = $[20];
  let J;
  if (
    $[21] !== availableIDEs ||
    $[22] !== currentIDE ||
    $[23] !== onSelect ||
    $[24] !== onClose ||
    $[25] !== unavailableIDEs
  ) {
    J = jsxProd_default(IDEScreen, {
      availableIDEs,
      unavailableIDEs,
      selectedIDE: currentIDE,
      onClose,
      onSelect,
    });
    $[21] = availableIDEs;
    $[22] = currentIDE;
    $[23] = onSelect;
    $[24] = onClose;
    $[25] = unavailableIDEs;
    $[26] = J;
  } else J = $[26];
  return J;
}
//@ chunk-5bdzenzx.js:26672-27019 fingerprint = formatWorkspaceFolders (1)
function formatWorkspaceFolders(folders, maxLength = 100) {
  if (folders.length === 0) return "";
  let cwd = getCwd();
  let foldersToShow = folders.slice(0, 2);
  let hasMore = folders.length > 2;
  let ellipsisOverhead = hasMore ? 3 : 0;
  let separatorOverhead = (foldersToShow.length - 1) * 2;
  let availableLength = maxLength - separatorOverhead - ellipsisOverhead;
  let maxLengthPerPath = Math.floor(availableLength / foldersToShow.length);
  let cwdNFC = cwd.normalize("NFC");
  let joined = foldersToShow
    .map((folder) => {
      let folderNFC = folder.normalize("NFC");
      if (folderNFC.startsWith(cwdNFC + pathModule.sep)) folder = folderNFC.slice(cwdNFC.length + 1);
      if (folder.length <= maxLengthPerPath) return folder;
      return "\u2026" + folder.slice(-(maxLengthPerPath - 1));
    })
    .join(", ");
  if (hasMore) joined += ", \u2026";
  return joined;
}
//@ chunk-e6aww6q8.js:3244299-3244625 placement
/**
 * 按 IDE 名判断属于哪个 VS Code 系：windsurf/devin→windsurf，cursor→cursor，VS Code/VSCodium/Code-OSS（非 Insiders）→vscode，否则 null。
 */
function detectVSCodeFamily(name) {
  let lower = name.toLowerCase();
  if (lower.includes("windsurf") || lower.includes("devin")) return "windsurf";
  if (lower.includes("cursor")) return "cursor";
  if (
    !lower.includes("insiders") &&
    (lower.includes("vscode") ||
      lower.includes("vs code") ||
      lower.includes("visual studio code") ||
      lower.includes("vscodium") ||
      lower.includes("code - oss"))
  )
    return "vscode";
  return null;
}
//@ chunk-fq0cr76a.js:916465-916672 fingerprint = _temp4 (0.691)
/**
 * 解析 "host:port"：端口 1–65535，host 非空；以冒号结尾的 host 必须是 IPv6。失败返回 undefined。
 */
function parseHostPort(ide_0) {
  let index = ide_0.lastIndexOf(":");
  let sliced = ide_0.slice(index + 1);
  let sliced_2 = ide_0.slice(0, index);
  if (!/^\d{1,5}$/.test(sliced)) return;
  let h = Number(sliced);
  if (h < 1 || h > 65535 || sliced_2 === "") return;
  if (sliced_2.endsWith(":") && isIP(sliced_2) !== 6) return;
  return {
    host: sliced_2,
    port: h,
  };
}
export { parseHostPort };
