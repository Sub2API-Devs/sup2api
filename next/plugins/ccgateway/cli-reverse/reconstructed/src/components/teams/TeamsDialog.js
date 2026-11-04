/**
 * components/teams/TeamsDialog.tsx
 *
 * 队友管理对话框：查看队友、切换其权限模式（shift+tab）、关停队友。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/teams/TeamsDialog.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-19dk83fw.js (1), chunk-82kqcve8.js (1), chunk-e6aww6q8.js (2)
 * attribution: fingerprint 4, callgraph-fingerprint 1
 */
import { randomUUID } from "crypto";
import { isFocusModeFlag } from "../../utils/focusMode.js";
import { wasProactivityEverOn } from "../../Tool.js";
import { permissionModeForProactivityLevel } from "../../utils/permissions/getNextPermissionMode.js";
import { getProactivityPolicyVerdict } from "../../utils/permissions/permissionSetup.js";
import { isBypassAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { PERMISSION_MODE_STEPS, nextModeIndex, LessonFrame } from "../onboarding/PowerupLessons.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { removeTeammateFromTeamFile } from "../../utils/swarm/teamHelpers.js";
import { unassignTeammateTasks } from "../../utils/tasks.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { TASK_NOTIFICATION_DELAY_MS } from "../../utils/task/framework.js";
import { SYSTEM } from "../../utils/swarm/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-82kqcve8.js:37066-37112 fingerprint (2.1.88 match: viewTeammateOutput, 0.388)
function viewTeammateOutput() {
  return isFocusModeFlag() ? "focus" : "default";
}
//@ chunk-e6aww6q8.js:1296816-1297008 callgraph-fingerprint (2.1.88 match: cycleAllTeammateModes, 0.2)
/**
 * 一次性切换所有队友的权限模式（default/auto 循环）。
 */
function cycleAllTeammateModes(teammates, teamName, isBypassAvailable) {
  if (teammates === "auto" && teamName === "ask" && wasProactivityEverOn())
    return permissionModeForProactivityLevel(
      "ask",
      {
        isAutoModeAvailable: false,
        isBypassPermissionsModeAvailable: false,
      },
      undefined,
    );
  if (isBypassAvailable && getProactivityPolicyVerdict(teamName, teammates, undefined) !== undefined)
    return "default";
  return teammates;
}
//@ chunk-e6aww6q8.js:3014808-3014916 fingerprint (2.1.88 match: cycleTeammateMode, 0.655)
function cycleTeammateMode(toolPermissionContext, settings, suggestedRules, suggestedRules_2) {
  return (
    isBypassAllowedInMode(
      toolPermissionContext,
      suggestedRules_2,
      suggestedRules.isBypassPermissionsModeAvailable,
      settings.forRemoteExecution,
    ) && !isWebToolRestrictedInRelay(toolPermissionContext.name)
  );
}
//@ chunk-19dk83fw.js:4454-5071 fingerprint (2.1.88 match: TeammateDetailView, 0.314)
function TeammateDetailView() {
  let $ = useMemoCache(11);
  let [modeIndex, setModeIndex] = useState(0);
  let currentMode = PERMISSION_MODE_STEPS[modeIndex];
  let cycleModeShortcut = useShortcutDisplay("confirm:cycleMode", "Confirmation", "shift+tab");
  let keybindingHandlers;
  let keybindingContextOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingHandlers = {
      "confirm:cycleMode": () => setModeIndex(nextModeIndex),
    };
    keybindingContextOptions = {
      context: "Confirmation",
    };
    $[0] = keybindingHandlers;
    $[1] = keybindingContextOptions;
  } else {
    keybindingHandlers = $[0];
    keybindingContextOptions = $[1];
  }
  MessageActionsKeybindings(keybindingHandlers, keybindingContextOptions);
  let promptElement;
  if ($[2] !== cycleModeShortcut) {
    promptElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Press ",
        cycleModeShortcut,
        " now",
        `

`,
      ],
    });
    $[2] = cycleModeShortcut;
    $[3] = promptElement;
  } else promptElement = $[3];
  const symbolPrefix = currentMode.symbol ? `${currentMode.symbol} ` : "  ";
  let modeElement;
  if ($[4] !== currentMode.color || $[5] !== currentMode.label || $[6] !== symbolPrefix) {
    modeElement = jsxProd_default_2(Text, {
      color: currentMode.color,
      children: [symbolPrefix, currentMode.label],
    });
    $[4] = currentMode.color;
    $[5] = currentMode.label;
    $[6] = symbolPrefix;
    $[7] = modeElement;
  } else modeElement = $[7];
  let frameElement;
  if ($[8] !== promptElement || $[9] !== modeElement) {
    frameElement = jsxProd_default(LessonFrame, {
      live: true,
      children: jsxProd_default_2(Text, {
        children: [promptElement, modeElement],
      }),
    });
    $[8] = promptElement;
    $[9] = modeElement;
    $[10] = frameElement;
  } else frameElement = $[10];
  return frameElement;
}
//@ chunk-18hwfzwa.js:1686214-1687162 fingerprint (2.1.88 match: killTeammate, 0.495)
/**
 * 关停队友：发送 shutdown，等待完成并从 inbox 移除，记录 teammate_terminated。
 */
async function killTeammate(teammateName, appState, setState, storageV5) {
  if (!teammateName || !appState.teamContext?.teammates) return;
  let teammateId = Object.entries(appState.teamContext.teammates).find(
    ([, value]) => value.name === teammateName,
  )?.[0];
  if (!teammateId) return;
  let teamName = appState.teamContext?.teamName;
  if (teamName)
    await removeTeammateFromTeamFile(
      teamName,
      {
        agentId: teammateId,
        name: teammateName,
      },
      storageV5,
    );
  let { notificationMessage } = teamName
    ? await unassignTeammateTasks(teamName, teammateId, teammateName, "shutdown", storageV5)
    : {
        notificationMessage: `${teammateName} has shut down.`,
      };
  setState((prev) => {
    if (!prev.teamContext?.teammates) return prev;
    if (!(teammateId in prev.teamContext.teammates)) return prev;
    let { [teammateId]: removedTeammate, ...remainingTeammates } = prev.teamContext.teammates;
    let nextTasks = {
      ...prev.tasks,
    };
    for (let [key, value] of Object.entries(nextTasks))
      if (isInProcessTeammateTask(value) && value.identity.agentId === teammateId)
        nextTasks[key] = {
          ...value,
          status: "completed",
          endTime: Date.now(),
          notified: true,
          evictAfter: Date.now() + TASK_NOTIFICATION_DELAY_MS,
        };
    return {
      ...prev,
      tasks: nextTasks,
      teamContext: {
        ...prev.teamContext,
        teammates: remainingTeammates,
      },
      inbox: {
        messages: [
          ...prev.inbox.messages,
          {
            id: randomUUID(),
            from: SYSTEM,
            text: jsonStringify({
              type: "teammate_terminated",
              message: notificationMessage,
            }),
            timestamp: new Date().toISOString(),
            status: "pending",
          },
        ],
      },
    };
  });
  logForDebugging(`[InboxPoller] Removed ${teammateName} (${teammateId}) from teamContext`);
}
export { cycleAllTeammateModes, cycleTeammateMode, viewTeammateOutput, killTeammate, TeammateDetailView };
