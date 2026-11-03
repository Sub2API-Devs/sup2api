/**
 * commands/ide/ide.tsx
 *
 * /ide 实现：检测运行中的 IDE、选择连接、安装扩展
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/ide/ide.tsx
 * pieces: chunk-5bdzenzx.js (21), chunk-fq0cr76a.js (1)
 * attribution: sole-consumer 5, file-local 1, fingerprint 11, affinity 1, layout 4
 */
import * as pathModule from "path";
import { isIP, isIP as isIP_2, isIP as isIP_3, isIP as isIP_4, isIP as isIP_5 } from "net";
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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { Lo, Ao, Po } from "./_new/ide.helpers-5bdz.js";
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
import { wt } from "../../remote/remoteMode.js";
import { PromptDialog } from "../../components/hooks/PromptDialog.js";
import { detectVSCodeFamily } from "./_new/detectVSCodeFamily.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { getCwd } from "../../utils/cwd.js";
import { useAppState, useSetAppState } from "../../state/AppState.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { setMcpOnClose } from "../../services/mcp/mcpWireUtils.js";

//@ chunk-5bdzenzx.js:16087-16147 sole-consumer = _temp (1)
function ye() {
  let f = getGlobalConfig();
  return !isSupportedTerminal() && f.autoConnectIde === !0;
}
//@ chunk-5bdzenzx.js:16147-16207 file-local
function countByName(acc, ide_0) {
  return ((acc[ide_0.name] = (acc[ide_0.name] || 0) + 1), acc);
}
//@ chunk-5bdzenzx.js:16207-16282 fingerprint = _temp2 (1)
function isVSCodeName(ide_2) {
  return ide_2.name === "VS Code" || ide_2.name === "Visual Studio Code";
}
//@ chunk-5bdzenzx.js:16282-16395 fingerprint = _temp3 (0.748)
function renderIdeWorkspaceRow(ide_3, index) {
  return e(
    BulletRow,
    {
      children: r(Text, {
        dimColor: !0,
        children: [ide_3.name, ": ", formatWorkspaceFolders(ide_3.workspaceFolders)],
      }),
    },
    index,
  );
}
//@ chunk-5bdzenzx.js:16395-16450 sole-consumer
function _o(C) {
  return e(OrderedListWithItem.Item, { label: C.name }, C.port);
}
//@ chunk-5bdzenzx.js:16450-16499 sole-consumer
function Vo(E) {
  return e(OrderedListWithItem.Item, { label: toIDEDisplayName(E) }, E);
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
      clients: s.mcp.clients.filter(Lo),
      tools: s.mcp.tools.filter(isIncludedMcpTool),
      commands: s.mcp.commands.filter(isIncludedMcpTool_2),
    },
  };
}
//@ chunk-5bdzenzx.js:16891-16940 affinity
function Wo(Cn) {
  let { ide: ide, ...N } = Cn ?? {};
  return N;
}
//@ chunk-5bdzenzx.js:16940-20006 fingerprint = IDEScreen (0.611)
function IDEScreen(t0) {
  let t = w(45),
    {
      availableIDEs: availableIDEs,
      unavailableIDEs: unavailableIDEs,
      selectedIDE: selectedIDE,
      onClose: onClose,
      onSelect: onSelect,
    } = t0,
    I;
  if (t[0] !== selectedIDE?.port)
    ((I = selectedIDE?.port?.toString() ?? "None"), (t[0] = selectedIDE?.port), (t[1] = I));
  else I = t[1];
  let [p, h] = y(I),
    [D, d] = y(!1),
    [C, E] = y(!1),
    x;
  if (t[2] !== availableIDEs || t[3] !== onSelect)
    ((x = (value) => {
      if (value !== "None" && shouldShowAutoConnectDialog()) d(!0);
      else if (value === "None" && ye()) E(!0);
      else onSelect(availableIDEs.find((ide) => ide.port === parseInt(value)));
    }),
      (t[2] = availableIDEs),
      (t[3] = onSelect),
      (t[4] = x));
  else x = t[4];
  let v = x,
    q;
  if (t[5] !== availableIDEs)
    ((q = availableIDEs.reduce(countByName, {})), (t[5] = availableIDEs), (t[6] = q));
  else q = t[6];
  let V = q,
    H,
    A,
    F,
    b,
    J,
    ne,
    oe,
    te,
    ie;
  if (
    t[7] !== availableIDEs ||
    t[8] !== v ||
    t[9] !== V ||
    t[10] !== onClose ||
    t[11] !== onSelect ||
    t[12] !== p ||
    t[13] !== D ||
    t[14] !== C
  ) {
    F = EARLY_RETURN_SENTINEL;
    Ht: {
      let L;
      if (t[24] !== V)
        ((L = (value_0) => {
          let Cn = (V[value_0.name] || 0) > 1 && value_0.workspaceFolders.length > 0;
          return {
            label: value_0.name,
            value: value_0.port.toString(),
            description: Cn ? formatWorkspaceFolders(value_0.workspaceFolders) : void 0,
          };
        }),
          (t[24] = V),
          (t[25] = L));
      else L = t[25];
      let combined = availableIDEs.map(L).concat([{ label: "None", value: "None", description: void 0 }]);
      if (D) {
        let N;
        if (t[26] !== v || t[27] !== p)
          ((N = e(IdeAutoConnectDialog, { onComplete: () => v(p) })), (t[26] = v), (t[27] = p), (t[28] = N));
        else N = t[28];
        F = N;
        break Ht;
      }
      if (C) {
        let N;
        if (t[29] !== onSelect)
          ((N = e(IdeDisableAutoConnectDialog, {
            onComplete: () => {
              onSelect(void 0);
            },
          })),
            (t[29] = onSelect),
            (t[30] = N));
        else N = t[30];
        F = N;
        break Ht;
      }
      A = Dialog;
      ne = "Select IDE";
      oe = "Connect to an IDE for integrated development features.";
      te = onClose;
      ie = "ide";
      H = Box;
      b = "column";
      J =
        availableIDEs.length === 0
          ? e(HintText, {
              children: isJetBrainsTerminal()
                ? `No available IDEs detected. Please install the plugin and restart your IDE:
https://code.claude.com/docs/en/jetbrains`
                : "No available IDEs detected. Make sure your IDE has the Claude Code extension or plugin installed and is running.",
            })
          : r(Fragment, {
              children: [
                e(OrderedListWithItem, {
                  defaultFocusIndex: combined.findIndex((Ho) => Ho.value === p),
                  onSelect: (Jo) => {
                    let Le = combined[Jo];
                    if (!Le) {
                      return;
                    }
                    (h(Le.value), v(Le.value));
                  },
                  children: combined.map((ge) =>
                    e(
                      OrderedListWithItem.Item,
                      {
                        label: ge.label,
                        icon:
                          ge.value === p
                            ? e(StatusIcon, { status: "success", "aria-label": "current:" })
                            : void 0,
                        description: ge.description,
                      },
                      ge.value,
                    ),
                  ),
                }),
                availableIDEs.some(isVSCodeName) &&
                  e(Box, {
                    marginTop: 1,
                    children: e(Text, {
                      color: "warning",
                      children: "Note: Only one Claude Code instance can be connected to VS Code at a time.",
                    }),
                  }),
                !isSupportedTerminal() &&
                  e(Box, {
                    marginTop: 1,
                    children: e(Text, {
                      dimColor: !0,
                      children: "Tip: You can enable auto-connect to IDE in /config or with the --ide flag",
                    }),
                  }),
              ],
            });
    }
    ((t[7] = availableIDEs),
      (t[8] = v),
      (t[9] = V),
      (t[10] = onClose),
      (t[11] = onSelect),
      (t[12] = p),
      (t[13] = D),
      (t[14] = C),
      (t[15] = H),
      (t[16] = A),
      (t[17] = F),
      (t[18] = b),
      (t[19] = J),
      (t[20] = ne),
      (t[21] = oe),
      (t[22] = te),
      (t[23] = ie));
  } else
    ((H = t[15]),
      (A = t[16]),
      (F = t[17]),
      (b = t[18]),
      (J = t[19]),
      (ne = t[20]),
      (oe = t[21]),
      (te = t[22]),
      (ie = t[23]));
  if (F !== EARLY_RETURN_SENTINEL) return F;
  let L;
  if (t[31] !== unavailableIDEs)
    ((L =
      unavailableIDEs.length > 0 &&
      r(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          r(Text, {
            dimColor: !0,
            children: [
              "Found ",
              unavailableIDEs.length,
              " other running IDE(s). However, their workspace or project directories don't match the current directory.",
            ],
          }),
          r(Box, {
            marginTop: 1,
            paddingLeft: 3,
            flexDirection: "column",
            children: [
              unavailableIDEs.slice(0, 4).map(renderIdeWorkspaceRow),
              unavailableIDEs.length > 4 &&
                e(OverflowHint, { count: unavailableIDEs.length - 4, unit: "IDE" }),
            ],
          }),
        ],
      })),
      (t[31] = unavailableIDEs),
      (t[32] = L));
  else L = t[32];
  let N;
  if (t[33] !== H || t[34] !== L || t[35] !== b || t[36] !== J)
    ((N = r(H, { flexDirection: b, children: [J, L] })),
      (t[33] = H),
      (t[34] = L),
      (t[35] = b),
      (t[36] = J),
      (t[37] = N));
  else N = t[37];
  let En;
  if (t[38] !== A || t[39] !== N || t[40] !== ne || t[41] !== oe || t[42] !== te || t[43] !== ie)
    ((En = e(A, { title: ne, subtitle: oe, onCancel: te, color: ie, children: N })),
      (t[38] = A),
      (t[39] = N),
      (t[40] = ne),
      (t[41] = oe),
      (t[42] = te),
      (t[43] = ie),
      (t[44] = En));
  else En = t[44];
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
function IDEOpenSelection(t0) {
  let u = w(13),
    { availableIDEs: availableIDEs, onSelectIDE: onSelectIDE, onDone: onDone } = t0,
    l;
  if (u[0] !== onDone)
    ((l = function t() {
      onDone("IDE selection cancelled", { display: "system" });
    }),
      (u[0] = onDone),
      (u[1] = l));
  else l = u[1];
  let t = l,
    I;
  if (u[2] !== availableIDEs || u[3] !== onSelectIDE)
    ((I = (value) => onSelectIDE(availableIDEs[value])),
      (u[2] = availableIDEs),
      (u[3] = onSelectIDE),
      (u[4] = I));
  else I = u[4];
  let h;
  if (u[5] !== availableIDEs) ((h = availableIDEs.map(_o)), (u[5] = availableIDEs), (u[6] = h));
  else h = u[6];
  let D;
  if (u[7] !== I || u[8] !== h)
    ((D = e(OrderedListWithItem, { onSelect: I, children: h })), (u[7] = I), (u[8] = h), (u[9] = D));
  else D = u[9];
  let d;
  if (u[10] !== t || u[11] !== D)
    ((d = e(Dialog, { title: "Select an IDE to open the project", onCancel: t, color: "ide", children: D })),
      (u[10] = t),
      (u[11] = D),
      (u[12] = d));
  else d = u[12];
  return d;
}
//@ chunk-5bdzenzx.js:20717-21294 fingerprint = RunningIDESelector (0.772)
function RunningIDESelector(t0) {
  let u = w(13),
    { runningIDEs: runningIDEs, onSelectIDE: onSelectIDE, onDone: onDone } = t0,
    l;
  if (u[0] !== onDone)
    ((l = function t() {
      onDone("IDE selection cancelled", { display: "system" });
    }),
      (u[0] = onDone),
      (u[1] = l));
  else l = u[1];
  let t = l,
    I;
  if (u[2] !== onSelectIDE || u[3] !== runningIDEs)
    ((I = (p) => {
      let h = runningIDEs[p];
      if (h) onSelectIDE(h);
    }),
      (u[2] = onSelectIDE),
      (u[3] = runningIDEs),
      (u[4] = I));
  else I = u[4];
  let D;
  if (u[5] !== runningIDEs) ((D = runningIDEs.map(Vo)), (u[5] = runningIDEs), (u[6] = D));
  else D = u[6];
  let d;
  if (u[7] !== I || u[8] !== D)
    ((d = e(OrderedListWithItem, { onSelect: I, children: D })), (u[7] = I), (u[8] = D), (u[9] = d));
  else d = u[9];
  let C;
  if (u[10] !== t || u[11] !== d)
    ((C = e(Dialog, { title: "Select IDE to set up Claude Code", onCancel: t, color: "ide", children: d })),
      (u[10] = t),
      (u[11] = d),
      (u[12] = C));
  else C = u[12];
  return C;
}
//@ chunk-5bdzenzx.js:21294-21455 fingerprint = InstallOnMount (1)
function InstallOnMount(t0) {
  let i = w(4),
    { ide: ide, onInstall: onInstall } = t0,
    u,
    l;
  if (i[0] !== ide || i[1] !== onInstall)
    ((u = () => {
      onInstall(ide);
    }),
      (l = [ide, onInstall]),
      (i[0] = ide),
      (i[1] = onInstall),
      (i[2] = u),
      (i[3] = l));
  else ((u = i[2]), (l = i[3]));
  return (P(u, l), null);
}
/**
 * /ide 安装扩展步骤组件：挂载时调用 installExtension，按结果回报已安装/需重载/失败/跳过原因；Esc 停止等待并提示稍后用 /status 查看。
 */
//@ chunk-5bdzenzx.js:21455-22661 layout
function InstallExtensionStep(props) {
  let u = w(14),
    { ide: ide, installExtension: installExtension, onDone: onDone } = props,
    l;
  if (u[0] !== ide) ((l = toIDEDisplayName(ide)), (u[0] = ide), (u[1] = l));
  else l = u[1];
  let t = l,
    I,
    p;
  if (u[2] !== ide || u[3] !== t || u[4] !== installExtension || u[5] !== onDone)
    ((I = () => {
      let h = !0;
      return (
        installExtension(ide).then((D) => {
          if (!h) {
            return;
          }
          let bold = sequential.bold(t);
          let C = `To install it yourself, see ${VSCODE_EXTENSION_DOCS_URL}`;
          if (D?.installed)
            onDone(
              D.previouslyInstalled
                ? `The Claude Code extension is installed in ${bold}. Reload the ${t} window (Developer: Reload Window), then run /ide again.`
                : `Installed the Claude Code extension in ${bold}.`,
            );
          else if (D?.error)
            onDone(`Couldn't install the Claude Code extension in ${bold}:
${D.error}
${C}`);
          else {
            let E = getIdeAutoInstallSkipReason() ?? (wt() ? "this session's workspace is remote" : null);
            onDone(`Didn't install the Claude Code extension in ${bold}${E ? ` because ${E}` : ""}.
${C}`);
          }
        }),
        () => {
          h = !1;
        }
      );
    }),
      (p = [ide, t, installExtension, onDone]),
      (u[2] = ide),
      (u[3] = t),
      (u[4] = installExtension),
      (u[5] = onDone),
      (u[6] = I),
      (u[7] = p));
  else ((I = u[6]), (p = u[7]));
  P(I, p);
  const x = `Installing the Claude Code extension in ${t}\u2026`;
  let k;
  if (u[8] !== t || u[9] !== onDone)
    ((k = () =>
      onDone(
        `Still installing the Claude Code extension in ${t}. /status shows the result when it finishes.`,
        { display: "system" },
      )),
      (u[8] = t),
      (u[9] = onDone),
      (u[10] = k));
  else k = u[10];
  let O;
  if (u[11] !== x || u[12] !== k)
    ((O = e(PromptDialog, { message: x, escAction: "stop waiting", onCancel: k })),
      (u[11] = x),
      (u[12] = k),
      (u[13] = O));
  else O = u[13];
  return O;
}
/**
 * /ide 安装扩展流程：JetBrains 直接安装并提示重启；只有一个运行中 IDE 时自动安装，否则先让用户选择。
 */
//@ chunk-5bdzenzx.js:22661-23489 layout
function InstallExtensionFlow(props) {
  let t = w(16),
    { runningIDEs: runningIDEs, installExtension: installExtension, onDone: onDone } = props,
    [u, l] = y(null),
    I;
  if (t[0] !== installExtension || t[1] !== onDone)
    ((I = (p) => {
      if (isJetBrainsIde(p)) {
        installExtension(p);
        let h = toIDEDisplayName(p);
        onDone(`Couldn't find the Claude Code plugin running in ${sequential.bold(h)}.
${sequential.bold(`restart ${h}`)} completely and run /ide again.
`);
        return;
      }
      l(p);
    }),
      (t[0] = installExtension),
      (t[1] = onDone),
      (t[2] = I));
  else I = t[2];
  let D = I;
  if (u) {
    let d;
    if (t[3] !== installExtension || t[4] !== u || t[5] !== onDone)
      ((d = e(InstallExtensionStep, { ide: u, installExtension: installExtension, onDone: onDone })),
        (t[3] = installExtension),
        (t[4] = u),
        (t[5] = onDone),
        (t[6] = d));
    else d = t[6];
    return d;
  }
  if (runningIDEs.length === 1) {
    let d;
    if (t[7] !== D || t[8] !== runningIDEs[0])
      ((d = e(InstallOnMount, { ide: runningIDEs[0], onInstall: D })),
        (t[7] = D),
        (t[8] = runningIDEs[0]),
        (t[9] = d));
    else d = t[9];
    return d;
  }
  let d;
  if (t[10] !== onDone)
    ((d = () => {
      onDone("No IDE selected.", { display: "system" });
    }),
      (t[10] = onDone),
      (t[11] = d));
  else d = t[11];
  let C;
  if (t[12] !== D || t[13] !== runningIDEs || t[14] !== d)
    ((C = e(RunningIDESelector, { runningIDEs: runningIDEs, onSelectIDE: D, onDone: d })),
      (t[12] = D),
      (t[13] = runningIDEs),
      (t[14] = d),
      (t[15] = C));
  else C = t[15];
  return C;
}
/**
 * 用选中的 IDE 打开项目或 worktree 目录：VS Code 系找到命令行工具后执行，失败再试 code；记录 ide_open_project 遥测并回报结果。
 */
//@ chunk-5bdzenzx.js:23489-24052 layout
async function openProjectInIde(ide, targetPath, isWorktree, report) {
  if (!ide) {
    report("No IDE selected.");
    return;
  }
  let u = detectVSCodeFamily(ide.name),
    l = u ? await getVSCodeIDECommand(u, ide.name) : null;
  if (!l) {
    report(
      `Please open the ${isWorktree ? "worktree" : "project"} manually in ${sequential.bold(ide.name)}: ${targetPath}`,
    );
    return;
  }
  let t = { useCwd: !0, useToolMemoryCgroup: !1 },
    { code: code } = await execFileNoThrow(l, [targetPath], t);
  if (code !== 0 && !pathModule.basename(l).startsWith("code"))
    ({ code: code } = await execFileNoThrow("code", [targetPath], t));
  if (code === 0) {
    (logFeatureOk("ide_open_project"),
      report(`Opened ${isWorktree ? "worktree" : "project"} in ${sequential.bold(ide.name)}`));
    return;
  }
  (logFeatureBad("ide_open_project", "ide_open_project_failed"),
    report(`Failed to open in ${ide.name}. Try opening manually: ${targetPath}`));
}
/**
 * /ide 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-5bdzenzx.js:24052-24808 fingerprint = call (0.612)
async function call(onDone, context, args) {
  logEvent("tengu_ext_ide_command", {});
  let {
    options: { dynamicMcpConfig: i },
    onChangeDynamicMcpConfig: onChangeDynamicMcpConfig,
  } = context;
  if (args?.trim() === "open") {
    let worktreeSession = getCurrentWorktreeSession(),
      targetPath = worktreeSession ? worktreeSession.worktreePath : getCwd(),
      availableIDEs = (await detectIDEs(!0)).filter((ide) => ide.isValid);
    if (availableIDEs.length === 0) return (onDone("No IDEs with Claude Code extension detected."), null);
    return e(IDEOpenSelection, {
      availableIDEs: availableIDEs,
      onSelectIDE: (selectedIDE) => openProjectInIde(selectedIDE, targetPath, !!worktreeSession, onDone),
      onDone: () => {
        onDone("Exited without opening IDE", { display: "system" });
      },
    });
  }
  let detectedIDEs = await detectIDEs(!0),
    onInstallIDEExtension = context.onInstallIDEExtension;
  if (detectedIDEs.length === 0 && onInstallIDEExtension && !isSupportedTerminal()) {
    let runningIDEs = await refreshRunningIDEs();
    if (runningIDEs.length > 0)
      return e(InstallExtensionFlow, {
        runningIDEs: runningIDEs,
        installExtension: onInstallIDEExtension,
        onDone: onDone,
      });
  }
  let availableIDEs = detectedIDEs.filter((ide) => ide.isValid),
    unavailableIDEs = detectedIDEs.filter((ide) => !ide.isValid),
    currentIDE = await findCurrentIDE(availableIDEs, i);
  return e(IDECommandFlow, {
    availableIDEs: availableIDEs,
    unavailableIDEs: unavailableIDEs,
    currentIDE: currentIDE,
    onChangeDynamicMcpConfig: onChangeDynamicMcpConfig,
    onDone: onDone,
  });
}
//@ chunk-5bdzenzx.js:24808-24821 layout
var Dn = 35000;
//@ chunk-5bdzenzx.js:24821-26672 fingerprint = IDECommandFlow (0.79)
function IDECommandFlow(f) {
  let $ = w(27),
    {
      availableIDEs: availableIDEs,
      unavailableIDEs: unavailableIDEs,
      currentIDE: currentIDE,
      onChangeDynamicMcpConfig: onChangeDynamicMcpConfig,
      onDone: onDone,
    } = f,
    [t, I] = y(null),
    p = useAppState(Ao),
    setAppState = useSetAppState(),
    isFirstCheckRef = R(!0),
    C,
    E;
  if ($[0] !== t || $[1] !== p || $[2] !== onDone)
    ((C = () => {
      if (!t) {
        return;
      }
      if (isFirstCheckRef.current) {
        isFirstCheckRef.current = !1;
        return;
      }
      if (!p || p.type === "pending") {
        return;
      }
      if (p.type === "connected") (logFeatureOk("ide_connect"), onDone(`Connected to ${t.name}.`));
      else if (p.type === "failed")
        (logFeatureBad("ide_connect", "ide_connect_failed"), onDone(`Failed to connect to ${t.name}.`));
    }),
      (E = [p, t, onDone]),
      ($[0] = t),
      ($[1] = p),
      ($[2] = onDone),
      ($[3] = C),
      ($[4] = E));
  else ((C = $[3]), (E = $[4]));
  P(C, E);
  let x;
  if ($[5] !== t || $[6] !== onDone)
    ((x = () => {
      if (!t) {
        return;
      }
      (logFeatureBad("ide_connect", "ide_connect_timeout"), onDone(`Connection to ${t.name} timed out.`));
    }),
      ($[5] = t),
      ($[6] = onDone),
      ($[7] = x));
  else x = $[7];
  let k;
  if ($[8] !== t || $[9] !== onDone) ((k = [t, onDone]), ($[8] = t), ($[9] = onDone), ($[10] = k));
  else k = $[10];
  useTimeout(x, t ? Dn : null, k);
  let O;
  if (
    $[11] !== currentIDE ||
    $[12] !== p ||
    $[13] !== onChangeDynamicMcpConfig ||
    $[14] !== onDone ||
    $[15] !== setAppState
  )
    ((O = (selectedIDE) => {
      if (!onChangeDynamicMcpConfig) {
        onDone("Error connecting to IDE.");
        return;
      }
      if (!selectedIDE) {
        if (p && p.type === "connected" && currentIDE) {
          setMcpOnClose(p, Po);
          let { clearServerCache: clearServerCache } = require("./chunk-asne9cp8.js").mcpClientModule();
          (clearServerCache("ide", p.config), setAppState(withoutIdeMcpEntries));
        }
        if ((onChangeDynamicMcpConfig(Wo), currentIDE)) logFeatureOk("ide_disconnect");
        onDone(currentIDE ? `Disconnected from ${currentIDE.name}.` : "No IDE selected.");
        return;
      }
      let url = selectedIDE.url;
      let H = {
        type: url.startsWith("ws:") ? "ws-ide" : "sse-ide",
        url: url,
        ideName: selectedIDE.name,
        authToken: selectedIDE.authToken,
        ideRunningInWindows: selectedIDE.ideRunningInWindows,
        scope: "dynamic",
      };
      ((isFirstCheckRef.current = !0),
        I(selectedIDE),
        onChangeDynamicMcpConfig((prev) => ({ ...prev, ide: H })));
    }),
      ($[11] = currentIDE),
      ($[12] = p),
      ($[13] = onChangeDynamicMcpConfig),
      ($[14] = onDone),
      ($[15] = setAppState),
      ($[16] = O));
  else O = $[16];
  let F = O;
  if (t) {
    let b;
    if ($[17] !== t.name)
      ((b = r(Text, { dimColor: !0, children: ["Connecting to ", t.name, "\u2026"] })),
        ($[17] = t.name),
        ($[18] = b));
    else b = $[18];
    return b;
  }
  let b;
  if ($[19] !== onDone)
    ((b = () => onDone("IDE selection cancelled", { display: "system" })), ($[19] = onDone), ($[20] = b));
  else b = $[20];
  let J;
  if (
    $[21] !== availableIDEs ||
    $[22] !== currentIDE ||
    $[23] !== F ||
    $[24] !== b ||
    $[25] !== unavailableIDEs
  )
    ((J = e(IDEScreen, {
      availableIDEs: availableIDEs,
      unavailableIDEs: unavailableIDEs,
      selectedIDE: currentIDE,
      onClose: b,
      onSelect: F,
    })),
      ($[21] = availableIDEs),
      ($[22] = currentIDE),
      ($[23] = F),
      ($[24] = b),
      ($[25] = unavailableIDEs),
      ($[26] = J));
  else J = $[26];
  return J;
}
//@ chunk-5bdzenzx.js:26672-27019 fingerprint = formatWorkspaceFolders (1)
function formatWorkspaceFolders(folders, maxLength = 100) {
  if (folders.length === 0) return "";
  let cwd = getCwd(),
    foldersToShow = folders.slice(0, 2),
    u = folders.length > 2,
    ellipsisOverhead = u ? 3 : 0,
    t = (foldersToShow.length - 1) * 2,
    I = maxLength - t - ellipsisOverhead,
    maxLengthPerPath = Math.floor(I / foldersToShow.length),
    cwdNFC = cwd.normalize("NFC"),
    joined = foldersToShow
      .map((folder) => {
        let folderNFC = folder.normalize("NFC");
        if (folderNFC.startsWith(cwdNFC + pathModule.sep)) folder = folderNFC.slice(cwdNFC.length + 1);
        if (folder.length <= maxLengthPerPath) return folder;
        return "\u2026" + folder.slice(-(maxLengthPerPath - 1));
      })
      .join(", ");
  if (u) joined += ", \u2026";
  return joined;
}
/**
 * 解析 "host:port"：端口 1–65535，host 非空；以冒号结尾的 host 必须是 IPv6。失败返回 undefined。
 */
//@ chunk-fq0cr76a.js:916465-916672 fingerprint = _temp4 (0.691)
function parseHostPort(ide_0) {
  let index = ide_0.lastIndexOf(":"),
    sliced = ide_0.slice(index + 1),
    sliced_2 = ide_0.slice(0, index);
  if (!/^\d{1,5}$/.test(sliced)) return;
  let h = Number(sliced);
  if (h < 1 || h > 65535 || sliced_2 === "") return;
  if (sliced_2.endsWith(":") && isIP_5(sliced_2) !== 6) return;
  return { host: sliced_2, port: h };
}

export { parseHostPort };
