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
import { isIP } from "net";
import * as pathModule from "path";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, useEffect, useRef } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-fq0cr76a.js:916465-916672 fingerprint = _temp4 (0.691)
/**
 * 解析 "host:port"：端口 1–65535，host 非空；以冒号结尾的 host 必须是 IPv6。失败返回 undefined。
 */
function parseHostPort(ide_0) {
  let index = ide_0.lastIndexOf(":");
  let sliced = ide_0.slice(index + 1);
  let sliced_2 = ide_0.slice(0, index);
  if (!/^\d{1,5}$/.test(sliced)) return;
  let port = Number(sliced);
  if (port < 1 || port > 65535 || sliced_2 === "") return;
  if (sliced_2.endsWith(":") && isIP(sliced_2) !== 6) return;
  return {
    host: sliced_2,
    port,
  };
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
function renderAvailableIde(available) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: available.name,
    },
    available.port,
  );
}
//@ chunk-5bdzenzx.js:16450-16499 sole-consumer
function renderRunningIde(running) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: toIDEDisplayName(running),
    },
    running,
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
function withoutIdeEntry(value) {
  let { ide, ...rest } = value ?? {};
  return rest;
}
//@ chunk-5bdzenzx.js:16940-20006 fingerprint = IDEScreen (0.611)
function IDEScreen(props) {
  let $ = useMemoCache(45);
  let { availableIDEs, unavailableIDEs, selectedIDE, onClose, onSelect } = props;
  let t1;
  if ($[0] !== selectedIDE?.port) {
    t1 = selectedIDE?.port?.toString() ?? "None";
    $[0] = selectedIDE?.port;
    $[1] = t1;
  } else t1 = $[1];
  let [selectedValue, setSelectedValue] = useState(t1);
  let [showAutoConnectDialog, setShowAutoConnectDialog] = useState(false);
  let [showDisableAutoConnectDialog, setShowDisableAutoConnectDialog] = useState(false);
  let t2;
  if ($[2] !== availableIDEs || $[3] !== onSelect) {
    t2 = (value) => {
      if (value !== "None" && shouldShowAutoConnectDialog()) setShowAutoConnectDialog(true);
      else if (value === "None" && shouldAutoConnectIdeAnyway()) setShowDisableAutoConnectDialog(true);
      else onSelect(availableIDEs.find((ide) => ide.port === parseInt(value)));
    };
    $[2] = availableIDEs;
    $[3] = onSelect;
    $[4] = t2;
  } else t2 = $[4];
  let handleSelectIDE = t2;
  let t3;
  if ($[5] !== availableIDEs) {
    t3 = availableIDEs.reduce(countByName, {});
    $[5] = availableIDEs;
    $[6] = t3;
  } else t3 = $[6];
  let ideCounts = t3;
  let titleLine;
  let urlLine;
  let body;
  let flexDirection;
  let footer;
  let title;
  let subtitle;
  let onCancel;
  let color;
  if (
    $[7] !== availableIDEs ||
    $[8] !== handleSelectIDE ||
    $[9] !== ideCounts ||
    $[10] !== onClose ||
    $[11] !== onSelect ||
    $[12] !== selectedValue ||
    $[13] !== showAutoConnectDialog ||
    $[14] !== showDisableAutoConnectDialog
  ) {
    body = EARLY_RETURN_SENTINEL;
    Ht: {
      let t5;
      if ($[24] !== ideCounts) {
        t5 = (ide) => {
          let showWorkspaceHint = (ideCounts[ide.name] || 0) > 1 && ide.workspaceFolders.length > 0;
          return {
            label: ide.name,
            value: ide.port.toString(),
            description: showWorkspaceHint ? formatWorkspaceFolders(ide.workspaceFolders) : undefined,
          };
        };
        $[24] = ideCounts;
        $[25] = t5;
      } else t5 = $[25];
      let combined = availableIDEs.map(t5).concat([
        {
          label: "None",
          value: "None",
          description: undefined,
        },
      ]);
      if (showAutoConnectDialog) {
        let t5;
        if ($[26] !== handleSelectIDE || $[27] !== selectedValue) {
          t5 = jsxProd_default(IdeAutoConnectDialog, {
            onComplete: () => handleSelectIDE(selectedValue),
          });
          $[26] = handleSelectIDE;
          $[27] = selectedValue;
          $[28] = t5;
        } else t5 = $[28];
        body = t5;
        break Ht;
      }
      if (showDisableAutoConnectDialog) {
        let t5;
        if ($[29] !== onSelect) {
          t5 = jsxProd_default(IdeDisableAutoConnectDialog, {
            onComplete: () => {
              onSelect(undefined);
            },
          });
          $[29] = onSelect;
          $[30] = t5;
        } else t5 = $[30];
        body = t5;
        break Ht;
      }
      urlLine = Dialog;
      title = "Select IDE";
      subtitle = "Connect to an IDE for integrated development features.";
      onCancel = onClose;
      color = "ide";
      titleLine = Box;
      flexDirection = "column";
      footer =
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
                  defaultFocusIndex: combined.findIndex((item) => item.value === selectedValue),
                  onSelect: (index) => {
                    let ide = combined[index];
                    if (!ide) {
                      return;
                    }
                    setSelectedValue(ide.value);
                    handleSelectIDE(ide.value);
                  },
                  children: combined.map((item) =>
                    jsxProd_default(
                      OrderedListWithItem.Item,
                      {
                        label: item.label,
                        icon:
                          item.value === selectedValue
                            ? jsxProd_default(StatusIcon, {
                                status: "success",
                                "aria-label": "current:",
                              })
                            : undefined,
                        description: item.description,
                      },
                      item.value,
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
    $[7] = availableIDEs;
    $[8] = handleSelectIDE;
    $[9] = ideCounts;
    $[10] = onClose;
    $[11] = onSelect;
    $[12] = selectedValue;
    $[13] = showAutoConnectDialog;
    $[14] = showDisableAutoConnectDialog;
    $[15] = titleLine;
    $[16] = urlLine;
    $[17] = body;
    $[18] = flexDirection;
    $[19] = footer;
    $[20] = title;
    $[21] = subtitle;
    $[22] = onCancel;
    $[23] = color;
  } else {
    titleLine = $[15];
    urlLine = $[16];
    body = $[17];
    flexDirection = $[18];
    footer = $[19];
    title = $[20];
    subtitle = $[21];
    onCancel = $[22];
    color = $[23];
  }
  if (body !== EARLY_RETURN_SENTINEL) return body;
  let content;
  if ($[31] !== unavailableIDEs) {
    content =
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
    $[31] = unavailableIDEs;
    $[32] = content;
  } else content = $[32];
  let children;
  if ($[33] !== titleLine || $[34] !== content || $[35] !== flexDirection || $[36] !== footer) {
    children = jsxProd_default_2(titleLine, {
      flexDirection,
      children: [footer, content],
    });
    $[33] = titleLine;
    $[34] = content;
    $[35] = flexDirection;
    $[36] = footer;
    $[37] = children;
  } else children = $[37];
  let hint;
  if (
    $[38] !== urlLine ||
    $[39] !== children ||
    $[40] !== title ||
    $[41] !== subtitle ||
    $[42] !== onCancel ||
    $[43] !== color
  ) {
    hint = jsxProd_default(urlLine, {
      title,
      subtitle,
      onCancel,
      color,
      children,
    });
    $[38] = urlLine;
    $[39] = children;
    $[40] = title;
    $[41] = subtitle;
    $[42] = onCancel;
    $[43] = color;
    $[44] = hint;
  } else hint = $[44];
  return hint;
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
  let $ = useMemoCache(13);
  let { availableIDEs, onSelectIDE, onDone } = props;
  let t1;
  if ($[0] !== onDone) {
    t1 = function handleCancel() {
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
  let body;
  if ($[10] !== onCancel || $[11] !== children_2) {
    body = jsxProd_default(Dialog, {
      title: "Select an IDE to open the project",
      onCancel,
      color: "ide",
      children: children_2,
    });
    $[10] = onCancel;
    $[11] = children_2;
    $[12] = body;
  } else body = $[12];
  return body;
}
//@ chunk-5bdzenzx.js:20717-21294 fingerprint = RunningIDESelector (0.772)
function RunningIDESelector(props) {
  let $ = useMemoCache(13);
  let { runningIDEs, onSelectIDE, onDone } = props;
  let footer;
  if ($[0] !== onDone) {
    footer = function value() {
      onDone("IDE selection cancelled", {
        display: "system",
      });
    };
    $[0] = onDone;
    $[1] = footer;
  } else footer = $[1];
  let onCancel = footer;
  let onSelect;
  if ($[2] !== onSelectIDE || $[3] !== runningIDEs) {
    onSelect = (index) => {
      let ide = runningIDEs[index];
      if (ide) onSelectIDE(ide);
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
  let $ = useMemoCache(4);
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
  useEffect(t1, t2);
  return null;
}
//@ chunk-5bdzenzx.js:21455-22661 layout
/**
 * /ide 安装扩展步骤组件：挂载时调用 installExtension，按结果回报已安装/需重载/失败/跳过原因；Esc 停止等待并提示稍后用 /status 查看。
 */
function InstallExtensionStep(props) {
  let $ = useMemoCache(14);
  let { ide, installExtension, onDone } = props;
  let label;
  if ($[0] !== ide) {
    label = toIDEDisplayName(ide);
    $[0] = ide;
    $[1] = label;
  } else label = $[1];
  let ideName = label;
  let content;
  let footer;
  if ($[2] !== ide || $[3] !== ideName || $[4] !== installExtension || $[5] !== onDone) {
    content = () => {
      let done = true;
      installExtension(ide).then((result) => {
        if (!done) {
          return;
        }
        let boldName = sequential.bold(ideName);
        let manualNote = `To install it yourself, see ${VSCODE_EXTENSION_DOCS_URL}`;
        if (result?.installed)
          onDone(
            result.previouslyInstalled
              ? `The Claude Code extension is installed in ${boldName}. Reload the ${ideName} window (Developer: Reload Window), then run /ide again.`
              : `Installed the Claude Code extension in ${boldName}.`,
          );
        else if (result?.error)
          onDone(`Couldn't install the Claude Code extension in ${boldName}:
${result.error}
${manualNote}`);
        else {
          let skipReason =
            getIdeAutoInstallSkipReason() ??
            (isRemoteSessionAvailable() ? "this session's workspace is remote" : null);
          onDone(`Didn't install the Claude Code extension in ${boldName}${skipReason ? ` because ${skipReason}` : ""}.
${manualNote}`);
        }
      });
      return () => {
        done = false;
      };
    };
    footer = [ide, ideName, installExtension, onDone];
    $[2] = ide;
    $[3] = ideName;
    $[4] = installExtension;
    $[5] = onDone;
    $[6] = content;
    $[7] = footer;
  } else {
    content = $[6];
    footer = $[7];
  }
  useEffect(content, footer);
  const message = `Installing the Claude Code extension in ${ideName}\u2026`;
  let onCancel;
  if ($[8] !== ideName || $[9] !== onDone) {
    onCancel = () =>
      onDone(
        `Still installing the Claude Code extension in ${ideName}. /status shows the result when it finishes.`,
        {
          display: "system",
        },
      );
    $[8] = ideName;
    $[9] = onDone;
    $[10] = onCancel;
  } else onCancel = $[10];
  let statusLine;
  if ($[11] !== message || $[12] !== onCancel) {
    statusLine = jsxProd_default(PromptDialog, {
      message,
      escAction: "stop waiting",
      onCancel,
    });
    $[11] = message;
    $[12] = onCancel;
    $[13] = statusLine;
  } else statusLine = $[13];
  return statusLine;
}
//@ chunk-5bdzenzx.js:22661-23489 layout
/**
 * /ide 安装扩展流程：JetBrains 直接安装并提示重启；只有一个运行中 IDE 时自动安装，否则先让用户选择。
 */
function InstallExtensionFlow(props) {
  let $ = useMemoCache(16);
  let { runningIDEs, installExtension, onDone } = props;
  let [selected, setSelected] = useState(null);
  let handleSelect;
  if ($[0] !== installExtension || $[1] !== onDone) {
    handleSelect = (index) => {
      if (isJetBrainsIde(index)) {
        installExtension(index);
        let ideDisplayName = toIDEDisplayName(index);
        onDone(`Couldn't find the Claude Code plugin running in ${sequential.bold(ideDisplayName)}.
${sequential.bold(`restart ${ideDisplayName}`)} completely and run /ide again.
`);
        return;
      }
      setSelected(index);
    };
    $[0] = installExtension;
    $[1] = onDone;
    $[2] = handleSelect;
  } else handleSelect = $[2];
  let onSelect = handleSelect;
  if (selected) {
    let content;
    if ($[3] !== installExtension || $[4] !== selected || $[5] !== onDone) {
      content = jsxProd_default(InstallExtensionStep, {
        ide: selected,
        installExtension,
        onDone,
      });
      $[3] = installExtension;
      $[4] = selected;
      $[5] = onDone;
      $[6] = content;
    } else content = $[6];
    return content;
  }
  if (runningIDEs.length === 1) {
    let footer;
    if ($[7] !== onSelect || $[8] !== runningIDEs[0]) {
      footer = jsxProd_default(InstallOnMount, {
        ide: runningIDEs[0],
        onInstall: onSelect,
      });
      $[7] = onSelect;
      $[8] = runningIDEs[0];
      $[9] = footer;
    } else footer = $[9];
    return footer;
  }
  let onDone_2;
  if ($[10] !== onDone) {
    onDone_2 = () => {
      onDone("No IDE selected.", {
        display: "system",
      });
    };
    $[10] = onDone;
    $[11] = onDone_2;
  } else onDone_2 = $[11];
  let status;
  if ($[12] !== onSelect || $[13] !== runningIDEs || $[14] !== onDone_2) {
    status = jsxProd_default(RunningIDESelector, {
      runningIDEs,
      onSelectIDE: onSelect,
      onDone: onDone_2,
    });
    $[12] = onSelect;
    $[13] = runningIDEs;
    $[14] = onDone_2;
    $[15] = status;
  } else status = $[15];
  return status;
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
  let command = vsCodeFamily ? await getVSCodeIDECommand(vsCodeFamily, ide.name) : null;
  if (!command) {
    report(
      `Please open the ${isWorktree ? "worktree" : "project"} manually in ${sequential.bold(ide.name)}: ${targetPath}`,
    );
    return;
  }
  let options = {
    useCwd: true,
    useToolMemoryCgroup: false,
  };
  let { code } = await execFileNoThrow(command, [targetPath], options);
  if (code !== 0 && !pathModule.basename(command).startsWith("code"))
    ({ code } = await execFileNoThrow("code", [targetPath], options));
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
  let $ = useMemoCache(27);
  let { availableIDEs, unavailableIDEs, currentIDE, onChangeDynamicMcpConfig, onDone } = props;
  let [connectingIDE, setConnectingIDE] = useState(null);
  let appState = useAppState(findIdeClient);
  let setAppState = useSetAppState();
  let isFirstCheckRef = useRef(true);
  let body;
  let footer;
  if ($[0] !== connectingIDE || $[1] !== appState || $[2] !== onDone) {
    body = () => {
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
    footer = [appState, connectingIDE, onDone];
    $[0] = connectingIDE;
    $[1] = appState;
    $[2] = onDone;
    $[3] = body;
    $[4] = footer;
  } else {
    body = $[3];
    footer = $[4];
  }
  useEffect(body, footer);
  let statusLine;
  if ($[5] !== connectingIDE || $[6] !== onDone) {
    statusLine = () => {
      if (!connectingIDE) {
        return;
      }
      logFeatureBad("ide_connect", "ide_connect_timeout");
      onDone(`Connection to ${connectingIDE.name} timed out.`);
    };
    $[5] = connectingIDE;
    $[6] = onDone;
    $[7] = statusLine;
  } else statusLine = $[7];
  let deps;
  if ($[8] !== connectingIDE || $[9] !== onDone) {
    deps = [connectingIDE, onDone];
    $[8] = connectingIDE;
    $[9] = onDone;
    $[10] = deps;
  } else deps = $[10];
  useTimeout(statusLine, connectingIDE ? IDE_CONNECT_TIMEOUT_MS : null, deps);
  let errorLine;
  if (
    $[11] !== currentIDE ||
    $[12] !== appState ||
    $[13] !== onChangeDynamicMcpConfig ||
    $[14] !== onDone ||
    $[15] !== setAppState
  ) {
    errorLine = (selectedIDE) => {
      if (!onChangeDynamicMcpConfig) {
        onDone("Error connecting to IDE.");
        return;
      }
      if (!selectedIDE) {
        if (appState && appState.type === "connected" && currentIDE) {
          setMcpOnClose(appState, noop);
          let { clearServerCache } =
            require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
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
    $[16] = errorLine;
  } else errorLine = $[16];
  let onSelect = errorLine;
  if (connectingIDE) {
    let actionLine;
    if ($[17] !== connectingIDE.name) {
      actionLine = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Connecting to ", connectingIDE.name, "\u2026"],
      });
      $[17] = connectingIDE.name;
      $[18] = actionLine;
    } else actionLine = $[18];
    return actionLine;
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
  let helpText;
  if (
    $[21] !== availableIDEs ||
    $[22] !== currentIDE ||
    $[23] !== onSelect ||
    $[24] !== onClose ||
    $[25] !== unavailableIDEs
  ) {
    helpText = jsxProd_default(IDEScreen, {
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
    $[26] = helpText;
  } else helpText = $[26];
  return helpText;
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
export {
  parseHostPort,
  IDECommandFlow,
  IDE_CONNECT_TIMEOUT_MS,
  call,
  formatWorkspaceFolders,
  openProjectInIde,
};
