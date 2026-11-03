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
import { wasProactivityEverOn } from "../../Tool.js";
import { permissionModeForProactivityLevel } from "../../utils/permissions/getNextPermissionMode.js";
import { getProactivityPolicyVerdict } from "../../utils/permissions/permissionSetup.js";
import { isBypassAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";
import { removeTeammateFromTeamFile } from "../../utils/swarm/teamHelpers.js";
import { unassignTeammateTasks } from "../../utils/tasks.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { TASK_NOTIFICATION_DELAY_MS } from "../../utils/task/framework.js";
import { SYSTEM } from "../../utils/swarm/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { PERMISSION_MODE_STEPS, nextModeIndex, LessonFrame } from "../onboarding/PowerupLessons.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { isFocusModeFlag } from "../../utils/focusMode.js";

//@ chunk-e6aww6q8.js:1296816-1297008 callgraph-fingerprint = cycleAllTeammateModes (0.2)
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
//@ chunk-e6aww6q8.js:3014808-3014916 fingerprint = cycleTeammateMode (0.655)
function cycleTeammateMode(e, n, suggestedRules, s) {
  return (
    isBypassAllowedInMode(e, s, suggestedRules.isBypassPermissionsModeAvailable, n.forRemoteExecution) &&
    !isWebToolRestrictedInRelay(e.name)
  );
}
//@ chunk-18hwfzwa.js:1686214-1687162 fingerprint = killTeammate (0.495)
/**
 * 关停队友：发送 shutdown，等待完成并从 inbox 移除，记录 teammate_terminated。
 */
async function killTeammate(teammateName, x, setState, storageV5) {
  if (!teammateName || !x.teamContext?.teammates) return;
  let teammateId = Object.entries(x.teamContext.teammates).find(
    ([, value]) => value.name === teammateName,
  )?.[0];
  if (!teammateId) return;
  let teamName = x.teamContext?.teamName;
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
    let { [teammateId]: He, ...remainingTeammates } = prev.teamContext.teammates;
    let ze = {
      ...prev.tasks,
    };
    for (let [key, value] of Object.entries(ze))
      if (isInProcessTeammateTask(value) && value.identity.agentId === teammateId)
        ze[key] = {
          ...value,
          status: "completed",
          endTime: Date.now(),
          notified: true,
          evictAfter: Date.now() + TASK_NOTIFICATION_DELAY_MS,
        };
    return {
      ...prev,
      tasks: ze,
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
//@ chunk-19dk83fw.js:4454-5071 fingerprint = TeammateDetailView (0.314)
function TeammateDetailView() {
  let $ = w(11);
  let [p, t] = y(0);
  let l = PERMISSION_MODE_STEPS[p];
  let cycleModeShortcut = useShortcutDisplay("confirm:cycleMode", "Confirmation", "shift+tab");
  let i;
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    i = {
      "confirm:cycleMode": () => t(nextModeIndex),
    };
    x = {
      context: "Confirmation",
    };
    $[0] = i;
    $[1] = x;
  } else {
    i = $[0];
    x = $[1];
  }
  MessageActionsKeybindings(i, x);
  let g;
  if ($[2] !== cycleModeShortcut) {
    g = jsxProd_default_2(Text, {
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
    $[3] = g;
  } else g = $[3];
  const h = l.symbol ? `${l.symbol} ` : "  ";
  let f;
  if ($[4] !== l.color || $[5] !== l.label || $[6] !== h) {
    f = jsxProd_default_2(Text, {
      color: l.color,
      children: [h, l.label],
    });
    $[4] = l.color;
    $[5] = l.label;
    $[6] = h;
    $[7] = f;
  } else f = $[7];
  let b;
  if ($[8] !== g || $[9] !== f) {
    b = jsxProd_default(LessonFrame, {
      live: true,
      children: jsxProd_default_2(Text, {
        children: [g, f],
      }),
    });
    $[8] = g;
    $[9] = f;
    $[10] = b;
  } else b = $[10];
  return b;
}
//@ chunk-82kqcve8.js:37066-37112 fingerprint = viewTeammateOutput (0.388)
function viewTeammateOutput() {
  return isFocusModeFlag() ? "focus" : "default";
}
export { cycleAllTeammateModes, cycleTeammateMode, viewTeammateOutput, killTeammate, TeammateDetailView };
