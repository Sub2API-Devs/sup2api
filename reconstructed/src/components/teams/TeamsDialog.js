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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { wasProactivityEverOn } from "../../Tool.js";
import { permissionModeForProactivityLevel } from "../../utils/permissions/getNextPermissionMode.js";
import { getProactivityPolicyVerdict } from "../../utils/permissions/permissionSetup.js";
import { isBypassAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";
import { removeTeammateFromTeamFile } from "../../utils/swarm/teamHelpers.js";
import { unassignTeammateTasks } from "../../utils/tasks.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { y2t } from "../../utils/task/framework.js";
import { SYSTEM } from "../../utils/swarm/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { PERMISSION_MODE_STEPS, nextModeIndex, LessonFrame } from "../onboarding/PowerupLessons.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { isFocusModeFlag } from "../../utils/focusMode.js";

/**
 * 一次性切换所有队友的权限模式（default/auto 循环）。
 */
//@ chunk-e6aww6q8.js:1296816-1297008 callgraph-fingerprint = cycleAllTeammateModes (0.2)
function cycleAllTeammateModes(teammates, teamName, isBypassAvailable) {
  if (teammates === "auto" && teamName === "ask" && wasProactivityEverOn())
    return permissionModeForProactivityLevel(
      "ask",
      { isAutoModeAvailable: !1, isBypassPermissionsModeAvailable: !1 },
      void 0,
    );
  if (isBypassAvailable && getProactivityPolicyVerdict(teamName, teammates, void 0) !== void 0)
    return "default";
  return teammates;
}
//@ chunk-e6aww6q8.js:3014808-3014916 fingerprint = cycleTeammateMode (0.655)
function cycleTeammateMode(e, n, r, s) {
  return (
    isBypassAllowedInMode(e, s, r.isBypassPermissionsModeAvailable, n.forRemoteExecution) &&
    !isWebToolRestrictedInRelay(e.name)
  );
}
/**
 * 关停队友：发送 shutdown，等待完成并从 inbox 移除，记录 teammate_terminated。
 */
//@ chunk-18hwfzwa.js:1686214-1687162 fingerprint = killTeammate (0.495)
async function killTeammate(h, x, D, L) {
  if (!h || !x.teamContext?.teammates) return;
  let ee = Object.entries(x.teamContext.teammates).find(([, Be]) => Be.name === h)?.[0];
  if (!ee) return;
  let ke = x.teamContext?.teamName;
  if (ke) await removeTeammateFromTeamFile(ke, { agentId: ee, name: h }, L);
  let { notificationMessage: notificationMessage } = ke
    ? await unassignTeammateTasks(ke, ee, h, "shutdown", L)
    : { notificationMessage: `${h} has shut down.` };
  (D((prev) => {
    if (!prev.teamContext?.teammates) return prev;
    if (!(ee in prev.teamContext.teammates)) return prev;
    let { [ee]: He, ...We } = prev.teamContext.teammates,
      ze = { ...prev.tasks };
    for (let [Xe, rt] of Object.entries(ze))
      if (isInProcessTeammateTask(rt) && rt.identity.agentId === ee)
        ze[Xe] = {
          ...rt,
          status: "completed",
          endTime: Date.now(),
          notified: !0,
          evictAfter: Date.now() + y2t,
        };
    return {
      ...prev,
      tasks: ze,
      teamContext: { ...prev.teamContext, teammates: We },
      inbox: {
        messages: [
          ...prev.inbox.messages,
          {
            id: randomUUID_17(),
            from: SYSTEM,
            text: jsonStringify({ type: "teammate_terminated", message: notificationMessage }),
            timestamp: new Date().toISOString(),
            status: "pending",
          },
        ],
      },
    };
  }),
    logForDebugging(`[InboxPoller] Removed ${h} (${ee}) from teamContext`));
}
//@ chunk-19dk83fw.js:4454-5071 fingerprint = TeammateDetailView (0.314)
function TeammateDetailView() {
  let $ = w(11),
    [p, t] = y(0),
    l = PERMISSION_MODE_STEPS[p],
    cycleModeShortcut = useShortcutDisplay("confirm:cycleMode", "Confirmation", "shift+tab"),
    i,
    x;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((i = { "confirm:cycleMode": () => t(nextModeIndex) }),
      (x = { context: "Confirmation" }),
      ($[0] = i),
      ($[1] = x));
  else ((i = $[0]), (x = $[1]));
  MessageActionsKeybindings(i, x);
  let g;
  if ($[2] !== cycleModeShortcut)
    ((g = r(Text, {
      dimColor: !0,
      children: [
        "Press ",
        cycleModeShortcut,
        " now",
        `

`,
      ],
    })),
      ($[2] = cycleModeShortcut),
      ($[3] = g));
  else g = $[3];
  const h = l.symbol ? `${l.symbol} ` : "  ";
  let f;
  if ($[4] !== l.color || $[5] !== l.label || $[6] !== h)
    ((f = r(Text, { color: l.color, children: [h, l.label] })),
      ($[4] = l.color),
      ($[5] = l.label),
      ($[6] = h),
      ($[7] = f));
  else f = $[7];
  let b;
  if ($[8] !== g || $[9] !== f)
    ((b = e(LessonFrame, { live: !0, children: r(Text, { children: [g, f] }) })),
      ($[8] = g),
      ($[9] = f),
      ($[10] = b));
  else b = $[10];
  return b;
}
//@ chunk-82kqcve8.js:37066-37112 fingerprint = viewTeammateOutput (0.388)
function viewTeammateOutput() {
  return isFocusModeFlag() ? "focus" : "default";
}

export { cycleAllTeammateModes, cycleTeammateMode, viewTeammateOutput, killTeammate, TeammateDetailView };
