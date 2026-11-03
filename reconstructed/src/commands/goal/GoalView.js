/**
 * commands/goal/GoalView.tsx
 *
 * 2.1.316 新增：/goal 无参数时的当前目标状态视图
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hgfnw8bk.js (6)
 * attribution: placement 6
 */
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useInterval } from "../../ink/components/Input.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { BULLSEYE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../components/design-system/Byline.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import {
  findLastMetGoal,
  isGoalClearKeyword,
  clearSessionGoal,
  MAX_GOAL_CONDITION_CHARS,
  setSessionGoal,
  buildGoalSetMessage,
} from "./goal.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { HintText } from "../../components/design-system/HintText.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-hgfnw8bk.js:5734-5738 placement
j();
//@ chunk-hgfnw8bk.js:5738-5774 placement
function Y(et) {
  return et.activeGoal;
}
//@ chunk-hgfnw8bk.js:5774-5801 placement
function Z(at) {
  return at + 1;
}
/**
 * /goal 无参数时显示当前目标条件、已运行时长与轮数的视图。
 */
//@ chunk-hgfnw8bk.js:5801-8335 placement
function GoalStatusView(p) {
  let o = w(38),
    { messages: messages, onDone: onDone } = p,
    t = useAppState(Y),
    [, u] = y(0),
    A;
  if (o[0] === MEMO_CACHE_SENTINEL) ((A = () => u(Z)), (o[0] = A));
  else A = o[0];
  if ((useInterval(A, t ? 1000 : null), t)) {
    const b = Date.now() - t.setAt;
    let g;
    if (o[1] !== b) ((g = formatDuration(b, { mostSignificantOnly: !0 })), (o[1] = b), (o[2] = g));
    else g = o[2];
    let H = g;
    const m = getTotalOutputTokens() - t.tokensAtStart;
    let h;
    if (o[3] !== m) ((h = formatTokens(m)), (o[3] = m), (o[4] = h));
    else h = o[4];
    let tt = h;
    const k = `running ${H}`;
    let N;
    if (o[5] !== t.iterations)
      ((N = t.iterations > 0 && `${t.iterations} ${plural(t.iterations, "turn")}`),
        (o[5] = t.iterations),
        (o[6] = N));
    else N = o[6];
    const L = `${tt} tokens`;
    let B;
    if (o[7] !== k || o[8] !== N || o[9] !== L)
      ((B = [k, N, L].filter(Boolean)), (o[7] = k), (o[8] = N), (o[9] = L), (o[10] = B));
    else B = o[10];
    let ot = B;
    const st = `${BULLSEYE} Goal active`;
    const joined = ot.join(" \xB7 ");
    let F;
    if (o[11] === MEMO_CACHE_SENTINEL)
      ((F = r(Byline, {
        children: [
          e(Text, { children: "/goal clear to stop early" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "dismiss" }),
        ],
      })),
        (o[11] = F));
    else F = o[11];
    let D;
    if (o[12] !== t.condition)
      ((D = e(GoalField, { label: "Goal", children: t.condition })), (o[12] = t.condition), (o[13] = D));
    else D = o[13];
    let M;
    if (o[14] !== t.lastReason)
      ((M = t.lastReason
        ? e(GoalField, { label: "Last check", children: getFirstLine(t.lastReason.trim()) })
        : null),
        (o[14] = t.lastReason),
        (o[15] = M));
    else M = o[15];
    let R;
    if (o[16] !== D || o[17] !== M)
      ((R = r(Box, { flexDirection: "column", children: [D, M] })), (o[16] = D), (o[17] = M), (o[18] = R));
    else R = o[18];
    let I;
    if (o[19] !== onDone || o[20] !== joined || o[21] !== R)
      ((I = e(Dialog, { title: st, subtitle: joined, onCancel: onDone, inputGuide: F, children: R })),
        (o[19] = onDone),
        (o[20] = joined),
        (o[21] = R),
        (o[22] = I));
    else I = o[22];
    return I;
  }
  let b;
  if (o[23] !== messages || o[24] !== onDone) {
    b = EARLY_RETURN_SENTINEL;
    Rt: {
      let l = findLastMetGoal(messages);
      if (l) {
        let T = [];
        if (l.durationMs !== void 0) T.push(formatDuration(l.durationMs, { mostSignificantOnly: !0 }));
        if (l.iterations !== void 0) T.push(`${l.iterations} ${plural(l.iterations, "turn")}`);
        if (l.tokens !== void 0) T.push(`${formatTokens(l.tokens)} tokens`);
        let g;
        if (o[26] === MEMO_CACHE_SENTINEL)
          ((g = r(Text, {
            children: [e(StatusIcon, { status: "success", withSpace: !0 }), "Goal achieved"],
          })),
            (o[26] = g));
        else g = o[26];
        const joined = T.join(" \xB7 ");
        let h;
        if (o[27] === MEMO_CACHE_SENTINEL)
          ((h = r(Byline, {
            children: [
              e(Text, { children: "/goal <condition> to set another" }),
              e(KeyboardShortcutHint, { chord: "escape", action: "dismiss" }),
            ],
          })),
            (o[27] = h));
        else h = o[27];
        let k;
        if (o[28] !== l)
          ((k = e(GoalField, { label: "Goal", children: l.condition })), (o[28] = l), (o[29] = k));
        else k = o[29];
        let N;
        if (o[30] !== onDone || o[31] !== joined || o[32] !== k)
          ((N = e(Dialog, {
            title: g,
            subtitle: joined,
            color: "success",
            onCancel: onDone,
            inputGuide: h,
            children: k,
          })),
            (o[30] = onDone),
            (o[31] = joined),
            (o[32] = k),
            (o[33] = N));
        else N = o[33];
        b = N;
        break Rt;
      }
    }
    ((o[23] = messages), (o[24] = onDone), (o[25] = b));
  } else b = o[25];
  if (b !== EARLY_RETURN_SENTINEL) return b;
  let g, m;
  if (o[34] === MEMO_CACHE_SENTINEL)
    ((g = e(KeyboardShortcutHint, { chord: "escape", action: "dismiss" })),
      (m = e(HintText, { hint: "/goal <condition> to set one", children: "No goal set" })),
      (o[34] = g),
      (o[35] = m));
  else ((g = o[34]), (m = o[35]));
  let h;
  if (o[36] !== onDone)
    ((h = e(Dialog, { title: "Goal", onCancel: onDone, inputGuide: g, children: m })),
      (o[36] = onDone),
      (o[37] = h));
  else h = o[37];
  return h;
}
//@ chunk-hgfnw8bk.js:8335-8708 placement
function GoalField(p) {
  let t = w(7),
    { label: label, children: children } = p,
    u;
  if (t[0] !== label)
    ((u = e(Box, { flexShrink: 0, children: r(Text, { dimColor: !0, children: [label, ": "] }) })),
      (t[0] = label),
      (t[1] = u));
  else u = t[1];
  let o;
  if (t[2] !== children)
    ((o = e(Box, { flexGrow: 1, children: e(Text, { wrap: "wrap", children: children }) })),
      (t[2] = children),
      (t[3] = o));
  else o = t[3];
  let A;
  if (t[4] !== u || t[5] !== o)
    ((A = r(Box, { flexDirection: "row", children: [u, o] })), (t[4] = u), (t[5] = o), (t[6] = A));
  else A = t[6];
  return A;
}
/**
 * /goal <condition>|clear：设置或清除会话目标（以会话级 Stop 钩子实现）。
 */
//@ chunk-hgfnw8bk.js:8708-9206 placement
var runGoalCommand = async (onDone, context, args) => {
  let trimmed = args.trim();
  if (trimmed === "")
    return e(GoalStatusView, {
      messages: context.messages,
      onDone: () => onDone(void 0, { display: "skip" }),
    });
  if (isGoalClearKeyword(trimmed)) {
    let o = clearSessionGoal(context);
    return (onDone(o === null ? "No goal set" : `Goal cleared: ${o}`, { display: "system" }), null);
  }
  if (trimmed.length > MAX_GOAL_CONDITION_CHARS)
    return (
      logFeatureSad("goal_set", "too_long"),
      onDone(`Goal condition is limited to ${MAX_GOAL_CONDITION_CHARS} characters (got ${trimmed.length})`, {
        display: "system",
      }),
      null
    );
  let u = setSessionGoal(trimmed, context);
  if (u !== null) return (onDone(u, { display: "system" }), null);
  return (
    onDone(`Goal set: ${trimmed}`, { shouldQuery: !0, metaMessages: [buildGoalSetMessage(trimmed)] }),
    null
  );
};
