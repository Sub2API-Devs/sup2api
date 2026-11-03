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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useInterval } from "../../ink/components/Input.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { BULLSEYE } from "../../utils/permissions/autoModeRulesPrompt.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
init_react_production();
//@ chunk-hgfnw8bk.js:5738-5774 placement
function selectActiveGoal(et) {
  return et.activeGoal;
}
//@ chunk-hgfnw8bk.js:5774-5801 placement
function increment(at) {
  return at + 1;
}
//@ chunk-hgfnw8bk.js:5801-8335 placement
/**
 * /goal 无参数时显示当前目标条件、已运行时长与轮数的视图。
 */
function GoalStatusView(props) {
  let o = w(38);
  let { messages, onDone } = props;
  let appState = useAppState(selectActiveGoal);
  let [, u] = y(0);
  let A;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    A = () => u(increment);
    o[0] = A;
  } else A = o[0];
  useInterval(A, appState ? 1000 : null);
  if (appState) {
    const b = Date.now() - appState.setAt;
    let g;
    if (o[1] !== b) {
      g = formatDuration(b, {
        mostSignificantOnly: true,
      });
      o[1] = b;
      o[2] = g;
    } else g = o[2];
    let H = g;
    const m = getTotalOutputTokens() - appState.tokensAtStart;
    let h;
    if (o[3] !== m) {
      h = formatTokens(m);
      o[3] = m;
      o[4] = h;
    } else h = o[4];
    let tt = h;
    const k = `running ${H}`;
    let N;
    if (o[5] !== appState.iterations) {
      N = appState.iterations > 0 && `${appState.iterations} ${plural(appState.iterations, "turn")}`;
      o[5] = appState.iterations;
      o[6] = N;
    } else N = o[6];
    const L = `${tt} tokens`;
    let B;
    if (o[7] !== k || o[8] !== N || o[9] !== L) {
      B = [k, N, L].filter(Boolean);
      o[7] = k;
      o[8] = N;
      o[9] = L;
      o[10] = B;
    } else B = o[10];
    let ot = B;
    const title = `${BULLSEYE} Goal active`;
    const subtitle = ot.join(" \xB7 ");
    let inputGuide;
    if (o[11] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(Text, {
            children: "/goal clear to stop early",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "dismiss",
          }),
        ],
      });
      o[11] = inputGuide;
    } else inputGuide = o[11];
    let D;
    if (o[12] !== appState.condition) {
      D = jsxProd_default(GoalField, {
        label: "Goal",
        children: appState.condition,
      });
      o[12] = appState.condition;
      o[13] = D;
    } else D = o[13];
    let M;
    if (o[14] !== appState.lastReason) {
      M = appState.lastReason
        ? jsxProd_default(GoalField, {
            label: "Last check",
            children: getFirstLine(appState.lastReason.trim()),
          })
        : null;
      o[14] = appState.lastReason;
      o[15] = M;
    } else M = o[15];
    let children;
    if (o[16] !== D || o[17] !== M) {
      children = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [D, M],
      });
      o[16] = D;
      o[17] = M;
      o[18] = children;
    } else children = o[18];
    let I;
    if (o[19] !== onDone || o[20] !== subtitle || o[21] !== children) {
      I = jsxProd_default(Dialog, {
        title,
        subtitle,
        onCancel: onDone,
        inputGuide,
        children,
      });
      o[19] = onDone;
      o[20] = subtitle;
      o[21] = children;
      o[22] = I;
    } else I = o[22];
    return I;
  }
  let b;
  if (o[23] !== messages || o[24] !== onDone) {
    b = EARLY_RETURN_SENTINEL;
    Rt: {
      let lastMetGoal = findLastMetGoal(messages);
      if (lastMetGoal) {
        let T = [];
        if (lastMetGoal.durationMs !== undefined)
          T.push(
            formatDuration(lastMetGoal.durationMs, {
              mostSignificantOnly: true,
            }),
          );
        if (lastMetGoal.iterations !== undefined)
          T.push(`${lastMetGoal.iterations} ${plural(lastMetGoal.iterations, "turn")}`);
        if (lastMetGoal.tokens !== undefined) T.push(`${formatTokens(lastMetGoal.tokens)} tokens`);
        let title;
        if (o[26] === MEMO_CACHE_SENTINEL) {
          title = jsxProd_default_2(Text, {
            children: [
              jsxProd_default(StatusIcon, {
                status: "success",
                withSpace: true,
              }),
              "Goal achieved",
            ],
          });
          o[26] = title;
        } else title = o[26];
        const subtitle = T.join(" \xB7 ");
        let inputGuide;
        if (o[27] === MEMO_CACHE_SENTINEL) {
          inputGuide = jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(Text, {
                children: "/goal <condition> to set another",
              }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "dismiss",
              }),
            ],
          });
          o[27] = inputGuide;
        } else inputGuide = o[27];
        let children;
        if (o[28] !== lastMetGoal) {
          children = jsxProd_default(GoalField, {
            label: "Goal",
            children: lastMetGoal.condition,
          });
          o[28] = lastMetGoal;
          o[29] = children;
        } else children = o[29];
        let N;
        if (o[30] !== onDone || o[31] !== subtitle || o[32] !== children) {
          N = jsxProd_default(Dialog, {
            title,
            subtitle,
            color: "success",
            onCancel: onDone,
            inputGuide,
            children,
          });
          o[30] = onDone;
          o[31] = subtitle;
          o[32] = children;
          o[33] = N;
        } else N = o[33];
        b = N;
        break Rt;
      }
    }
    o[23] = messages;
    o[24] = onDone;
    o[25] = b;
  } else b = o[25];
  if (b !== EARLY_RETURN_SENTINEL) return b;
  let inputGuide;
  let children;
  if (o[34] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "dismiss",
    });
    children = jsxProd_default(HintText, {
      hint: "/goal <condition> to set one",
      children: "No goal set",
    });
    o[34] = inputGuide;
    o[35] = children;
  } else {
    inputGuide = o[34];
    children = o[35];
  }
  let h;
  if (o[36] !== onDone) {
    h = jsxProd_default(Dialog, {
      title: "Goal",
      onCancel: onDone,
      inputGuide,
      children,
    });
    o[36] = onDone;
    o[37] = h;
  } else h = o[37];
  return h;
}
//@ chunk-hgfnw8bk.js:8335-8708 placement
function GoalField(props) {
  let t = w(7);
  let { label, children } = props;
  let u;
  if (t[0] !== label) {
    u = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [label, ": "],
      }),
    });
    t[0] = label;
    t[1] = u;
  } else u = t[1];
  let o;
  if (t[2] !== children) {
    o = jsxProd_default(Box, {
      flexGrow: 1,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children,
      }),
    });
    t[2] = children;
    t[3] = o;
  } else o = t[3];
  let A;
  if (t[4] !== u || t[5] !== o) {
    A = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [u, o],
    });
    t[4] = u;
    t[5] = o;
    t[6] = A;
  } else A = t[6];
  return A;
}
//@ chunk-hgfnw8bk.js:8708-9206 placement
/**
 * /goal <condition>|clear：设置或清除会话目标（以会话级 Stop 钩子实现）。
 */
var runGoalCommand = async (onDone, context, args) => {
  let trimmed = args.trim();
  if (trimmed === "")
    return jsxProd_default(GoalStatusView, {
      messages: context.messages,
      onDone: () =>
        onDone(undefined, {
          display: "skip",
        }),
    });
  if (isGoalClearKeyword(trimmed)) {
    let o = clearSessionGoal(context);
    onDone(o === null ? "No goal set" : `Goal cleared: ${o}`, {
      display: "system",
    });
    return null;
  }
  if (trimmed.length > MAX_GOAL_CONDITION_CHARS) {
    logFeatureSad("goal_set", "too_long");
    onDone(`Goal condition is limited to ${MAX_GOAL_CONDITION_CHARS} characters (got ${trimmed.length})`, {
      display: "system",
    });
    return null;
  }
  let u = setSessionGoal(trimmed, context);
  if (u !== null) {
    onDone(u, {
      display: "system",
    });
    return null;
  }
  onDone(`Goal set: ${trimmed}`, {
    shouldQuery: true,
    metaMessages: [buildGoalSetMessage(trimmed)],
  });
  return null;
};
