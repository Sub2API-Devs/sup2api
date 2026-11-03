/**
 * components/PromptInput/AgentsPill.tsx
 *
 * 2.1.316 新增。输入框页脚的后台代理计数胶囊。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { init_react_production, P, y, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { LEFT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
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
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-18hwfzwa.js:806983-806987 placement
init_react_production();
//@ chunk-18hwfzwa.js:806987-807031 placement
function selectLeftArrowLeadsTo(Mn) {
  return Mn.leftArrowLeadsTo;
}
//@ chunk-18hwfzwa.js:807031-807051 placement
var AGENTS_PILL_DONE_CLEAR_MS = 2500;
var NARROW_AGENTS_PILL_COLUMNS = 100;
//@ chunk-18hwfzwa.js:807051-807243 placement
function AgentsPillHint(props) {
  let $ = w(2);
  let { words, narrow } = props;
  let { columns } = useTerminalSize();
  const ee = columns >= NARROW_AGENTS_PILL_COLUMNS ? words : narrow;
  let Re;
  if ($[0] !== ee) {
    Re = jsxProd_default_2(Text, {
      dimColor: true,
      children: [LEFT_ARROW, " ", ee],
    });
    $[0] = ee;
    $[1] = Re;
  } else Re = $[1];
  return Re;
}
//@ chunk-18hwfzwa.js:807243-809924 placement
function AgentsPill(props) {
  let $ = w(36);
  let { available, restingHintExpired } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let appStateSlice = useAppStateSlice(selectLeftArrowLeadsTo);
  let ke = available && !isScreenReaderEnabled && appStateSlice === undefined;
  let fleetNudgeStore = useFleetNudgeStore();
  let storeSelector = useStoreSelector(ke ? fleetNudgeStore : null);
  let needsInput = storeSelector?.needsInput;
  let succeeded = storeSelector?.succeeded;
  let terminalFocusState = useTerminalFocusState();
  let rt;
  let kt;
  if ($[0] !== ke || $[1] !== terminalFocusState || $[2] !== fleetNudgeStore) {
    rt = () => {
      if (ke) fleetNudgeStore.setFocused(terminalFocusState !== "blurred");
    };
    kt = [ke, terminalFocusState, fleetNudgeStore];
    $[0] = ke;
    $[1] = terminalFocusState;
    $[2] = fleetNudgeStore;
    $[3] = rt;
    $[4] = kt;
  } else {
    rt = $[3];
    kt = $[4];
  }
  P(rt, kt);
  let prefersReducedMotion = usePrefersReducedMotion();
  let clock = useClock();
  let [Ot, Et] = y("none");
  let [Dt, Lt] = y(0);
  let needsInputRef = R(undefined);
  let succeededRef = R(undefined);
  let io = R(null);
  let so;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    so = () => () => io.current?.clear();
    $[5] = so;
  } else so = $[5];
  let po;
  if ($[6] !== ke) {
    po = [ke];
    $[6] = ke;
    $[7] = po;
  } else po = $[7];
  P(so, po);
  let ao;
  let co;
  if ($[8] !== clock || $[9] !== needsInput || $[10] !== prefersReducedMotion || $[11] !== succeeded) {
    ao = () => {
      let bo = needsInputRef.current;
      let Ao = succeededRef.current;
      needsInputRef.current = needsInput;
      succeededRef.current = succeeded;
      let Bo = bo !== undefined && needsInput !== undefined && needsInput !== bo;
      let Ro = Ao !== undefined && succeeded !== undefined && succeeded > Ao;
      let Ho = needsInput !== undefined && needsInput > 0;
      if (!Ho && Ro && !prefersReducedMotion) {
        io.current?.clear();
        let Io = succeeded - Ao;
        Lt(Io);
        let Wo = clock.setTimeout(() => {
          io.current = null;
          Lt(0);
        }, AGENTS_PILL_DONE_CLEAR_MS);
        io.current = {
          kind: "done",
          clear: () => {
            Wo();
            io.current = null;
            Lt(0);
          },
        };
        return;
      }
      if (!Ho || (!Bo && !Ro) || prefersReducedMotion) {
        return;
      }
      if (!Bo && io.current?.kind === "awaiting") {
        return;
      }
      io.current?.clear();
      let mn = Bo ? "awaiting" : "done";
      Et(mn);
      let Cn = clock.setTimeout(() => {
        io.current = null;
        Et("none");
      }, AGENTS_PILL_DONE_CLEAR_MS);
      io.current = {
        kind: mn,
        clear: () => {
          Cn();
          io.current = null;
          Et("none");
        },
      };
    };
    co = [needsInput, succeeded, clock, prefersReducedMotion];
    $[8] = clock;
    $[9] = needsInput;
    $[10] = prefersReducedMotion;
    $[11] = succeeded;
    $[12] = ao;
    $[13] = co;
  } else {
    ao = $[12];
    co = $[13];
  }
  P(ao, co);
  if (!available) {
    return null;
  }
  if (ke && (needsInput === 0 || needsInput === undefined) && Dt > 0) {
    let No;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      No = jsxProd_default_2(Text, {
        dimColor: true,
        children: [LEFT_ARROW, " "],
      });
      $[14] = No;
    } else No = $[14];
    const children = Dt > 99 ? "99+" : Dt;
    let Yo;
    if ($[15] !== children) {
      Yo = jsxProd_default(Text, {
        color: "success",
        children,
      });
      $[15] = children;
      $[16] = Yo;
    } else Yo = $[16];
    let kn;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      kn = jsxProd_default(Text, {
        dimColor: true,
        children: " done",
      });
      $[17] = kn;
    } else kn = $[17];
    let Fn;
    if ($[18] !== Yo) {
      Fn = jsxProd_default_2(Fragment, {
        children: [No, Yo, kn],
      });
      $[18] = Yo;
      $[19] = Fn;
    } else Fn = $[19];
    return Fn;
  }
  if (appStateSlice !== undefined) {
    let No;
    if ($[20] !== appStateSlice) {
      No = jsxProd_default(AgentsPillHint, {
        ...appStateSlice,
      });
      $[20] = appStateSlice;
      $[21] = No;
    } else No = $[21];
    return No;
  }
  if (!ke || needsInput === undefined || needsInput === 0) {
    let No;
    if ($[22] !== restingHintExpired) {
      No = restingHintExpired
        ? null
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [LEFT_ARROW, " for agents"],
          });
      $[22] = restingHintExpired;
      $[23] = No;
    } else No = $[23];
    return No;
  }
  let No;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    No = jsxProd_default_2(Text, {
      dimColor: true,
      children: [LEFT_ARROW, " "],
    });
    $[24] = No;
  } else No = $[24];
  const color = Ot === "awaiting" ? "warning" : Ot === "done" ? "success" : undefined;
  const dimColor = Ot === "none";
  const children = needsInput > 99 ? "99+" : needsInput;
  let Fn;
  if ($[25] !== children || $[26] !== color || $[27] !== dimColor) {
    Fn = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[25] = children;
    $[26] = color;
    $[27] = dimColor;
    $[28] = Fn;
  } else Fn = $[28];
  let bn;
  if ($[29] !== needsInput) {
    bn = plural(needsInput, "agent");
    $[29] = needsInput;
    $[30] = bn;
  } else bn = $[30];
  let Go;
  if ($[31] !== bn) {
    Go = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", bn],
    });
    $[31] = bn;
    $[32] = Go;
  } else Go = $[32];
  let hn;
  if ($[33] !== Fn || $[34] !== Go) {
    hn = jsxProd_default_2(Fragment, {
      children: [No, Fn, Go],
    });
    $[33] = Fn;
    $[34] = Go;
    $[35] = hn;
  } else hn = $[35];
  return hn;
}
//@ chunk-18hwfzwa.js:809924-810035 placement
/**
 * 侧问（/btw）界面里的代理入口胶囊（始终可用、不显示静止提示）。
 */
function SideQuestionAgentsPill() {
  let $ = w(1);
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
//@ chunk-18hwfzwa.js:810035-810039 placement
init_react_production();
//@ chunk-18hwfzwa.js:810039-810094 placement
var SIDE_QUESTION_HINT_MS = 5000;
var sideQuestionAgentsSchema = DoctorLazy(() =>
  u({
    id: string(),
    content: string(),
  }),
);
var SIDE_QUESTION_MAX_AGENTS = 16;
export {
  AgentsPill,
  SIDE_QUESTION_MAX_AGENTS,
  SIDE_QUESTION_HINT_MS,
  sideQuestionAgentsSchema,
  SideQuestionAgentsPill,
};
