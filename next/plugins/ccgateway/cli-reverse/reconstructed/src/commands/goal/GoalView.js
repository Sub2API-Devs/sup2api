/**
 * commands/goal/GoalView.tsx
 *
 * 2.1.316 新增：/goal 无参数时的当前目标状态视图
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z40zgveq.js (6)
 * attribution: placement 6
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useInterval } from "../../ink/components/Input.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { BULLSEYE } from "../../constants/figures.js";
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

//@ chunk-z40zgveq.js:6042-6046 placement
init_react_production();
//@ chunk-z40zgveq.js:6046-6082 placement
function selectActiveGoal(state) {
  return state.activeGoal;
}
//@ chunk-z40zgveq.js:6082-6109 placement
function increment(state) {
  return state + 1;
}
//@ chunk-z40zgveq.js:6109-8643 placement
/**
 * /goal 无参数时显示当前目标条件、已运行时长与轮数的视图。
 */
function GoalStatusView(props) {
  let $ = useMemoCache(38);
  let { messages, onDone } = props;
  let appState = useAppState(selectActiveGoal);
  let [, tick] = useState(0);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = () => tick(increment);
    $[0] = content;
  } else content = $[0];
  useInterval(content, appState ? 1000 : null);
  if (appState) {
    const elapsedMs = Date.now() - appState.setAt;
    let running;
    if ($[1] !== elapsedMs) {
      running = formatDuration(elapsedMs, {
        mostSignificantOnly: true,
      });
      $[1] = elapsedMs;
      $[2] = running;
    } else running = $[2];
    let runningText = running;
    const outputTokens = getTotalOutputTokens() - appState.tokensAtStart;
    let tokens;
    if ($[3] !== outputTokens) {
      tokens = formatTokens(outputTokens);
      $[3] = outputTokens;
      $[4] = tokens;
    } else tokens = $[4];
    let tokenText = tokens;
    const runningLabel = `running ${runningText}`;
    let tokenRow;
    if ($[5] !== appState.iterations) {
      tokenRow = appState.iterations > 0 && `${appState.iterations} ${plural(appState.iterations, "turn")}`;
      $[5] = appState.iterations;
      $[6] = tokenRow;
    } else tokenRow = $[6];
    const tokenLabel = `${tokenText} tokens`;
    let header;
    if ($[7] !== runningLabel || $[8] !== tokenRow || $[9] !== tokenLabel) {
      header = [runningLabel, tokenRow, tokenLabel].filter(Boolean);
      $[7] = runningLabel;
      $[8] = tokenRow;
      $[9] = tokenLabel;
      $[10] = header;
    } else header = $[10];
    let headerRow = header;
    const title = `${BULLSEYE} Goal active`;
    const subtitle = headerRow.join(" \xB7 ");
    let inputGuide;
    if ($[11] === MEMO_CACHE_SENTINEL) {
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
      $[11] = inputGuide;
    } else inputGuide = $[11];
    let body;
    if ($[12] !== appState.condition) {
      body = jsxProd_default(GoalField, {
        label: "Goal",
        children: appState.condition,
      });
      $[12] = appState.condition;
      $[13] = body;
    } else body = $[13];
    let footer;
    if ($[14] !== appState.lastReason) {
      footer = appState.lastReason
        ? jsxProd_default(GoalField, {
            label: "Last check",
            children: getFirstLine(appState.lastReason.trim()),
          })
        : null;
      $[14] = appState.lastReason;
      $[15] = footer;
    } else footer = $[15];
    let children;
    if ($[16] !== body || $[17] !== footer) {
      children = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [body, footer],
      });
      $[16] = body;
      $[17] = footer;
      $[18] = children;
    } else children = $[18];
    let lastMetRow;
    if ($[19] !== onDone || $[20] !== subtitle || $[21] !== children) {
      lastMetRow = jsxProd_default(Dialog, {
        title,
        subtitle,
        onCancel: onDone,
        inputGuide,
        children,
      });
      $[19] = onDone;
      $[20] = subtitle;
      $[21] = children;
      $[22] = lastMetRow;
    } else lastMetRow = $[22];
    return lastMetRow;
  }
  let statusLine;
  if ($[23] !== messages || $[24] !== onDone) {
    statusLine = EARLY_RETURN_SENTINEL;
    Ot: {
      let lastMetGoal = findLastMetGoal(messages);
      if (lastMetGoal) {
        let lines = [];
        if (lastMetGoal.durationMs !== undefined)
          lines.push(
            formatDuration(lastMetGoal.durationMs, {
              mostSignificantOnly: true,
            }),
          );
        if (lastMetGoal.iterations !== undefined)
          lines.push(`${lastMetGoal.iterations} ${plural(lastMetGoal.iterations, "turn")}`);
        if (lastMetGoal.tokens !== undefined) lines.push(`${formatTokens(lastMetGoal.tokens)} tokens`);
        let title;
        if ($[26] === MEMO_CACHE_SENTINEL) {
          title = jsxProd_default_2(Text, {
            children: [
              jsxProd_default(StatusIcon, {
                status: "success",
                withSpace: true,
              }),
              "Goal achieved",
            ],
          });
          $[26] = title;
        } else title = $[26];
        const subtitle = lines.join(" \xB7 ");
        let inputGuide;
        if ($[27] === MEMO_CACHE_SENTINEL) {
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
          $[27] = inputGuide;
        } else inputGuide = $[27];
        let children;
        if ($[28] !== lastMetGoal) {
          children = jsxProd_default(GoalField, {
            label: "Goal",
            children: lastMetGoal.condition,
          });
          $[28] = lastMetGoal;
          $[29] = children;
        } else children = $[29];
        let hintRow;
        if ($[30] !== onDone || $[31] !== subtitle || $[32] !== children) {
          hintRow = jsxProd_default(Dialog, {
            title,
            subtitle,
            color: "success",
            onCancel: onDone,
            inputGuide,
            children,
          });
          $[30] = onDone;
          $[31] = subtitle;
          $[32] = children;
          $[33] = hintRow;
        } else hintRow = $[33];
        statusLine = hintRow;
        break Ot;
      }
    }
    $[23] = messages;
    $[24] = onDone;
    $[25] = statusLine;
  } else statusLine = $[25];
  if (statusLine !== EARLY_RETURN_SENTINEL) return statusLine;
  let inputGuide;
  let children;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "dismiss",
    });
    children = jsxProd_default(HintText, {
      hint: "/goal <condition> to set one",
      children: "No goal set",
    });
    $[34] = inputGuide;
    $[35] = children;
  } else {
    inputGuide = $[34];
    children = $[35];
  }
  let footerRows;
  if ($[36] !== onDone) {
    footerRows = jsxProd_default(Dialog, {
      title: "Goal",
      onCancel: onDone,
      inputGuide,
      children,
    });
    $[36] = onDone;
    $[37] = footerRows;
  } else footerRows = $[37];
  return footerRows;
}
//@ chunk-z40zgveq.js:8643-9016 placement
function GoalField(props) {
  let $ = useMemoCache(7);
  let { label, children } = props;
  let content;
  if ($[0] !== label) {
    content = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [label, ": "],
      }),
    });
    $[0] = label;
    $[1] = content;
  } else content = $[1];
  let footer;
  if ($[2] !== children) {
    footer = jsxProd_default(Box, {
      flexGrow: 1,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children,
      }),
    });
    $[2] = children;
    $[3] = footer;
  } else footer = $[3];
  let status;
  if ($[4] !== content || $[5] !== footer) {
    status = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [content, footer],
    });
    $[4] = content;
    $[5] = footer;
    $[6] = status;
  } else status = $[6];
  return status;
}
//@ chunk-z40zgveq.js:9016-9514 placement
/**
 * /goal <condition>|clear：设置或清除会话目标（以会话级 Stop 钩子实现）。
 */
var runGoalCommand = async (onDone, context, args) => {
  let condition = args.trim();
  if (condition === "")
    return jsxProd_default(GoalStatusView, {
      messages: context.messages,
      onDone: () =>
        onDone(undefined, {
          display: "skip",
        }),
    });
  if (isGoalClearKeyword(condition)) {
    let cleared = clearSessionGoal(context);
    onDone(cleared === null ? "No goal set" : `Goal cleared: ${cleared}`, {
      display: "system",
    });
    return null;
  }
  if (condition.length > MAX_GOAL_CONDITION_CHARS) {
    logFeatureSad("goal_set", "too_long");
    onDone(`Goal condition is limited to ${MAX_GOAL_CONDITION_CHARS} characters (got ${condition.length})`, {
      display: "system",
    });
    return null;
  }
  let set = setSessionGoal(condition, context);
  if (set !== null) {
    onDone(set, {
      display: "system",
    });
    return null;
  }
  onDone(`Goal set: ${condition}`, {
    shouldQuery: true,
    metaMessages: [buildGoalSetMessage(condition)],
  });
  return null;
};
export { runGoalCommand };
