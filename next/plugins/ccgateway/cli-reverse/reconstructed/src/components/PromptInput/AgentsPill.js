/**
 * components/PromptInput/AgentsPill.tsx
 *
 * 2.1.316 新增。输入框页脚的后台代理计数胶囊。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 8
 */
import {
  init_react_production,
  useEffect,
  useState,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { LEFT_ARROW } from "../../constants/figures.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { useFleetNudgeStore } from "../fleet/FleetNudgeStore.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useTerminalFocusState } from "../../ink/hooks/use-terminal-focus.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { plural } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:827731-827735 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:827731", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:827735-827739 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:827735", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:839708-839752 placement
function selectLeftArrowLeadsTo(state) {
  return state.leftArrowLeadsTo;
}
//@ chunk-czq1j3j2.js:839752-839772 placement
var AGENTS_PILL_DONE_CLEAR_MS = 2500;
var NARROW_AGENTS_PILL_COLUMNS = 100;
//@ chunk-czq1j3j2.js:839772-839964 placement
function AgentsPillHint(props) {
  let $ = useMemoCache(2);
  let { words, narrow } = props;
  let { columns } = useTerminalSize();
  const hintText = columns >= NARROW_AGENTS_PILL_COLUMNS ? words : narrow;
  let hintElement;
  if ($[0] !== hintText) {
    hintElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [LEFT_ARROW, " ", hintText],
    });
    $[0] = hintText;
    $[1] = hintElement;
  } else hintElement = $[1];
  return hintElement;
}
//@ chunk-czq1j3j2.js:839964-842647 placement
function AgentsPill(props) {
  let $ = useMemoCache(36);
  let { available, restingHintExpired } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let appStateSlice = useAppStateSlice(selectLeftArrowLeadsTo);
  let enabled = available && !isScreenReaderEnabled && appStateSlice === undefined;
  let fleetNudgeStore = useFleetNudgeStore();
  let storeSelector = useStoreSelector(enabled ? fleetNudgeStore : null);
  let needsInput = storeSelector?.needsInput;
  let succeeded = storeSelector?.succeeded;
  let terminalFocusState = useTerminalFocusState();
  let focusEffect;
  let focusDeps;
  if ($[0] !== enabled || $[1] !== terminalFocusState || $[2] !== fleetNudgeStore) {
    focusEffect = () => {
      if (enabled) fleetNudgeStore.setFocused(terminalFocusState !== "blurred");
    };
    focusDeps = [enabled, terminalFocusState, fleetNudgeStore];
    $[0] = enabled;
    $[1] = terminalFocusState;
    $[2] = fleetNudgeStore;
    $[3] = focusEffect;
    $[4] = focusDeps;
  } else {
    focusEffect = $[3];
    focusDeps = $[4];
  }
  useEffect(focusEffect, focusDeps);
  let prefersReducedMotion = usePrefersReducedMotion();
  let clock = useClock();
  let [phase, setPhase] = useState("none");
  let [justDoneCount, setJustDoneCount] = useState(0);
  let needsInputRef = useRef(undefined);
  let succeededRef = useRef(undefined);
  let timerRef = useRef(null);
  let cleanupEffect;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    cleanupEffect = () => () => timerRef.current?.clear();
    $[5] = cleanupEffect;
  } else cleanupEffect = $[5];
  let cleanupDeps;
  if ($[6] !== enabled) {
    cleanupDeps = [enabled];
    $[6] = enabled;
    $[7] = cleanupDeps;
  } else cleanupDeps = $[7];
  useEffect(cleanupEffect, cleanupDeps);
  let phaseEffect;
  let phaseDeps;
  if ($[8] !== clock || $[9] !== needsInput || $[10] !== prefersReducedMotion || $[11] !== succeeded) {
    phaseEffect = () => {
      let prevNeedsInput = needsInputRef.current;
      let prevSucceeded = succeededRef.current;
      needsInputRef.current = needsInput;
      succeededRef.current = succeeded;
      let needsInputChanged =
        prevNeedsInput !== undefined && needsInput !== undefined && needsInput !== prevNeedsInput;
      let succeededIncreased =
        prevSucceeded !== undefined && succeeded !== undefined && succeeded > prevSucceeded;
      let hasNeedsInput = needsInput !== undefined && needsInput > 0;
      if (!hasNeedsInput && succeededIncreased && !prefersReducedMotion) {
        timerRef.current?.clear();
        let doneCount = succeeded - prevSucceeded;
        setJustDoneCount(doneCount);
        let timeoutId = clock.setTimeout(() => {
          timerRef.current = null;
          setJustDoneCount(0);
        }, AGENTS_PILL_DONE_CLEAR_MS);
        timerRef.current = {
          kind: "done",
          clear: () => {
            timeoutId();
            timerRef.current = null;
            setJustDoneCount(0);
          },
        };
        return;
      }
      if (!hasNeedsInput || (!needsInputChanged && !succeededIncreased) || prefersReducedMotion) {
        return;
      }
      if (!needsInputChanged && timerRef.current?.kind === "awaiting") {
        return;
      }
      timerRef.current?.clear();
      let nextPhase = needsInputChanged ? "awaiting" : "done";
      setPhase(nextPhase);
      let timeoutId = clock.setTimeout(() => {
        timerRef.current = null;
        setPhase("none");
      }, AGENTS_PILL_DONE_CLEAR_MS);
      timerRef.current = {
        kind: nextPhase,
        clear: () => {
          timeoutId();
          timerRef.current = null;
          setPhase("none");
        },
      };
    };
    phaseDeps = [needsInput, succeeded, clock, prefersReducedMotion];
    $[8] = clock;
    $[9] = needsInput;
    $[10] = prefersReducedMotion;
    $[11] = succeeded;
    $[12] = phaseEffect;
    $[13] = phaseDeps;
  } else {
    phaseEffect = $[12];
    phaseDeps = $[13];
  }
  useEffect(phaseEffect, phaseDeps);
  if (!available) {
    return null;
  }
  if (enabled && (needsInput === 0 || needsInput === undefined) && justDoneCount > 0) {
    let arrowPrefix_2;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      arrowPrefix_2 = jsxProd_default_2(Text, {
        dimColor: true,
        children: [LEFT_ARROW, " "],
      });
      $[14] = arrowPrefix_2;
    } else arrowPrefix_2 = $[14];
    const children = justDoneCount > 99 ? "99+" : justDoneCount;
    let countText;
    if ($[15] !== children) {
      countText = jsxProd_default(Text, {
        color: "success",
        children,
      });
      $[15] = children;
      $[16] = countText;
    } else countText = $[16];
    let neverFlag;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      neverFlag = jsxProd_default(Text, {
        dimColor: true,
        children: " done",
      });
      $[17] = neverFlag;
    } else neverFlag = $[17];
    let countElement;
    if ($[18] !== countText) {
      countElement = jsxProd_default_2(Fragment, {
        children: [arrowPrefix_2, countText, neverFlag],
      });
      $[18] = countText;
      $[19] = countElement;
    } else countElement = $[19];
    return countElement;
  }
  if (appStateSlice !== undefined) {
    let placeholder;
    if ($[20] !== appStateSlice) {
      placeholder = jsxProd_default(AgentsPillHint, {
        ...appStateSlice,
      });
      $[20] = appStateSlice;
      $[21] = placeholder;
    } else placeholder = $[21];
    return placeholder;
  }
  if (!enabled || needsInput === undefined || needsInput === 0) {
    let restingHint;
    if ($[22] !== restingHintExpired) {
      restingHint = restingHintExpired
        ? null
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [LEFT_ARROW, " for agents"],
          });
      $[22] = restingHintExpired;
      $[23] = restingHint;
    } else restingHint = $[23];
    return restingHint;
  }
  let arrowPrefix_3;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    arrowPrefix_3 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [LEFT_ARROW, " "],
    });
    $[24] = arrowPrefix_3;
  } else arrowPrefix_3 = $[24];
  const color = phase === "awaiting" ? "warning" : phase === "done" ? "success" : undefined;
  const dimColor = phase === "none";
  const children = needsInput > 99 ? "99+" : needsInput;
  let countText_2;
  if ($[25] !== children || $[26] !== color || $[27] !== dimColor) {
    countText_2 = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[25] = children;
    $[26] = color;
    $[27] = dimColor;
    $[28] = countText_2;
  } else countText_2 = $[28];
  let agentWord;
  if ($[29] !== needsInput) {
    agentWord = plural(needsInput, "agent");
    $[29] = needsInput;
    $[30] = agentWord;
  } else agentWord = $[30];
  let agentSuffix;
  if ($[31] !== agentWord) {
    agentSuffix = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", agentWord],
    });
    $[31] = agentWord;
    $[32] = agentSuffix;
  } else agentSuffix = $[32];
  let content;
  if ($[33] !== countText_2 || $[34] !== agentSuffix) {
    content = jsxProd_default_2(Fragment, {
      children: [arrowPrefix_3, countText_2, agentSuffix],
    });
    $[33] = countText_2;
    $[34] = agentSuffix;
    $[35] = content;
  } else content = $[35];
  return content;
}
//@ chunk-czq1j3j2.js:842647-842758 placement
/**
 * 侧问（/btw）界面里的代理入口胶囊（始终可用、不显示静止提示）。
 */
function SideQuestionAgentsPill() {
  let $ = useMemoCache(1);
  let props;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    props = {
      available: true,
      restingHintExpired: false,
    };
    $[0] = props;
  } else props = $[0];
  return AgentsPill(props);
}
//@ chunk-czq1j3j2.js:842762-842817 placement
var SIDE_QUESTION_HINT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var sideQuestionAgentsSchema;
var SIDE_QUESTION_MAX_AGENTS;
deferInit("chunk-czq1j3j2.js:842762", () => {
  SIDE_QUESTION_HINT_MS = 5000;
  sideQuestionAgentsSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      content: stringSchema(),
    }),
  );
  SIDE_QUESTION_MAX_AGENTS = 16;
});
export {
  SIDE_QUESTION_MAX_AGENTS,
  AgentsPill,
  SIDE_QUESTION_HINT_MS,
  sideQuestionAgentsSchema,
  SideQuestionAgentsPill,
};
