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
import { j, P, y, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { LEFT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { rs } from "../../state/AppState.js";
import { useFleetNudgeStore } from "../fleet/FleetNudgeStore.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { vye } from "../../ink/hooks/use-terminal-focus.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { plural } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-18hwfzwa.js:806983-806987 placement
j();
//@ chunk-18hwfzwa.js:806987-807031 placement
function selectLeftArrowLeadsTo(Mn) {
  return Mn.leftArrowLeadsTo;
}
//@ chunk-18hwfzwa.js:807031-807051 placement
var dX = 2500,
  jJe = 100;
//@ chunk-18hwfzwa.js:807051-807243 placement
function AgentsPillHint(h) {
  let $ = w(2),
    { words: words, narrow: narrow } = h,
    { columns: columns } = useTerminalSize();
  const ee = columns >= jJe ? words : narrow;
  let Re;
  if ($[0] !== ee)
    ((Re = r(Text, { dimColor: !0, children: [LEFT_ARROW, " ", ee] })), ($[0] = ee), ($[1] = Re));
  else Re = $[1];
  return Re;
}
//@ chunk-18hwfzwa.js:807243-809924 placement
function AgentsPill(h) {
  let $ = w(36),
    { available: available, restingHintExpired: restingHintExpired } = h,
    L = useIsScreenReaderEnabled(),
    ee = rs(selectLeftArrowLeadsTo),
    ke = available && !L && ee === void 0,
    Re = useFleetNudgeStore(),
    Be = useStoreSelector(ke ? Re : null),
    He = Be?.needsInput,
    We = Be?.succeeded,
    ze = vye(),
    rt,
    kt;
  if ($[0] !== ke || $[1] !== ze || $[2] !== Re)
    ((rt = () => {
      if (ke) Re.setFocused(ze !== "blurred");
    }),
      (kt = [ke, ze, Re]),
      ($[0] = ke),
      ($[1] = ze),
      ($[2] = Re),
      ($[3] = rt),
      ($[4] = kt));
  else ((rt = $[3]), (kt = $[4]));
  P(rt, kt);
  let At = usePrefersReducedMotion(),
    It = useClock(),
    [Ot, Et] = y("none"),
    [Dt, Lt] = y(0),
    oo = R(void 0),
    Xt = R(void 0),
    io = R(null),
    so;
  if ($[5] === MEMO_CACHE_SENTINEL) ((so = () => () => io.current?.clear()), ($[5] = so));
  else so = $[5];
  let po;
  if ($[6] !== ke) ((po = [ke]), ($[6] = ke), ($[7] = po));
  else po = $[7];
  P(so, po);
  let ao, co;
  if ($[8] !== It || $[9] !== He || $[10] !== At || $[11] !== We)
    ((ao = () => {
      let bo = oo.current;
      let Ao = Xt.current;
      ((oo.current = He), (Xt.current = We));
      let Bo = bo !== void 0 && He !== void 0 && He !== bo;
      let Ro = Ao !== void 0 && We !== void 0 && We > Ao;
      let Ho = He !== void 0 && He > 0;
      if (!Ho && Ro && !At) {
        io.current?.clear();
        let Io = We - Ao;
        Lt(Io);
        let Wo = It.setTimeout(() => {
          ((io.current = null), Lt(0));
        }, dX);
        io.current = {
          kind: "done",
          clear: () => {
            (Wo(), (io.current = null), Lt(0));
          },
        };
        return;
      }
      if (!Ho || (!Bo && !Ro) || At) {
        return;
      }
      if (!Bo && io.current?.kind === "awaiting") {
        return;
      }
      io.current?.clear();
      let mn = Bo ? "awaiting" : "done";
      Et(mn);
      let Cn = It.setTimeout(() => {
        ((io.current = null), Et("none"));
      }, dX);
      io.current = {
        kind: mn,
        clear: () => {
          (Cn(), (io.current = null), Et("none"));
        },
      };
    }),
      (co = [He, We, It, At]),
      ($[8] = It),
      ($[9] = He),
      ($[10] = At),
      ($[11] = We),
      ($[12] = ao),
      ($[13] = co));
  else ((ao = $[12]), (co = $[13]));
  if ((P(ao, co), !available)) {
    return null;
  }
  if (ke && (He === 0 || He === void 0) && Dt > 0) {
    let No;
    if ($[14] === MEMO_CACHE_SENTINEL)
      ((No = r(Text, { dimColor: !0, children: [LEFT_ARROW, " "] })), ($[14] = No));
    else No = $[14];
    const vo = Dt > 99 ? "99+" : Dt;
    let Yo;
    if ($[15] !== vo) ((Yo = e(Text, { color: "success", children: vo })), ($[15] = vo), ($[16] = Yo));
    else Yo = $[16];
    let kn;
    if ($[17] === MEMO_CACHE_SENTINEL) ((kn = e(Text, { dimColor: !0, children: " done" })), ($[17] = kn));
    else kn = $[17];
    let Fn;
    if ($[18] !== Yo) ((Fn = r(Fragment, { children: [No, Yo, kn] })), ($[18] = Yo), ($[19] = Fn));
    else Fn = $[19];
    return Fn;
  }
  if (ee !== void 0) {
    let No;
    if ($[20] !== ee) ((No = e(AgentsPillHint, { ...ee })), ($[20] = ee), ($[21] = No));
    else No = $[21];
    return No;
  }
  if (!ke || He === void 0 || He === 0) {
    let No;
    if ($[22] !== restingHintExpired)
      ((No = restingHintExpired ? null : r(Text, { dimColor: !0, children: [LEFT_ARROW, " for agents"] })),
        ($[22] = restingHintExpired),
        ($[23] = No));
    else No = $[23];
    return No;
  }
  let No;
  if ($[24] === MEMO_CACHE_SENTINEL)
    ((No = r(Text, { dimColor: !0, children: [LEFT_ARROW, " "] })), ($[24] = No));
  else No = $[24];
  const vo = Ot === "awaiting" ? "warning" : Ot === "done" ? "success" : void 0,
    Yo = Ot === "none",
    kn = He > 99 ? "99+" : He;
  let Fn;
  if ($[25] !== kn || $[26] !== vo || $[27] !== Yo)
    ((Fn = e(Text, { color: vo, dimColor: Yo, children: kn })),
      ($[25] = kn),
      ($[26] = vo),
      ($[27] = Yo),
      ($[28] = Fn));
  else Fn = $[28];
  let bn;
  if ($[29] !== He) ((bn = plural(He, "agent")), ($[29] = He), ($[30] = bn));
  else bn = $[30];
  let Go;
  if ($[31] !== bn) ((Go = r(Text, { dimColor: !0, children: [" ", bn] })), ($[31] = bn), ($[32] = Go));
  else Go = $[32];
  let hn;
  if ($[33] !== Fn || $[34] !== Go)
    ((hn = r(Fragment, { children: [No, Fn, Go] })), ($[33] = Fn), ($[34] = Go), ($[35] = hn));
  else hn = $[35];
  return hn;
}
/**
 * 侧问（/btw）界面里的代理入口胶囊（始终可用、不显示静止提示）。
 */
//@ chunk-18hwfzwa.js:809924-810035 placement
function SideQuestionAgentsPill() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL) ((x = { available: !0, restingHintExpired: !1 }), ($[0] = x));
  else x = $[0];
  return AgentsPill(x);
}
//@ chunk-18hwfzwa.js:810035-810039 placement
j();
//@ chunk-18hwfzwa.js:810039-810094 placement
var peo = 5000,
  feo = DoctorLazy(() => u({ id: o(), content: o() })),
  XJe = 16;

export { AgentsPill, XJe, peo, feo, SideQuestionAgentsPill };
