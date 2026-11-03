/**
 * commands/loops/loops.tsx
 *
 * 2.1.316 新增：/loops 界面：列出与管理会话的定时 cron 与 Stop 钩子循环
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wtfk012h.js (7)
 * attribution: placement 7
 */
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../../components/design-system/Byline.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TextInput } from "../../components/TextInput.js";
import { HintText } from "../../components/design-system/HintText.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { parseCronExpression, cronToHuman } from "../../utils/cron.js";
import { logEvent } from "../../services/analytics/index.js";
import { listAllCronTasks, removeCronTasks, addCronTask } from "../../utils/cronTasks.js";
import { getSessionStopPromptHooks, clearSessionGoal, setSessionGoal } from "../goal/goal.js";
import { getSessionId, setScheduledTasksEnabled } from "../../bootstrap/state.js";
import { mze } from "../../services/daemon/sessionCron.js";
import { runWithWorkload } from "../../utils/workloadContext.js";

//@ chunk-wtfk012h.js:13782-13786 placement
j();
//@ chunk-wtfk012h.js:13786-13843 placement
function Eo(Uo) {
  return Uo === "interval" ? "text" : "interval";
}
//@ chunk-wtfk012h.js:13843-14043 placement
function renderLoopItem(D) {
  switch (D.kind) {
    case "cron": {
      return e(OrderedListWithItem.Item, { label: D.prompt, meta: [D.human, D.id] }, D.id);
    }
    case "stophook": {
      return e(OrderedListWithItem.Item, { label: D.condition, meta: ["stop-hook"] }, D.id);
    }
    default: {
      return D;
    }
  }
}
/**
 * /loops 界面：列出会话的定时 cron 与 Stop 钩子循环，支持新建（every 间隔/until 条件）和删除。
 */
//@ chunk-wtfk012h.js:14043-19477 placement
function LoopsManager(f) {
  let t = w(88),
    { loops: loops, onDelete: onDelete, onCreate: onCreate, onCancel: onCancel } = f,
    [c, M] = y("list"),
    [i, T] = y(0),
    [h, de] = y(),
    [o, Oo] = y("every"),
    [C, Po] = y("10m"),
    [E, Go] = y(3),
    [g, Vo] = y(""),
    [F, Ao] = y(0),
    [u, A] = y(o === "every" ? "interval" : "text"),
    { columns: columns } = useTerminalSize(),
    Ne;
  if (t[0] !== h) ((Ne = (No) => No.id === h), (t[0] = h), (t[1] = Ne));
  else Ne = t[1];
  let index = loops.findIndex(Ne),
    _e;
  if (t[2] !== o || t[3] !== onCancel || t[4] !== c)
    ((_e = (N) => {
      if (c !== "list") {
        return;
      }
      if (N.key === "escape") {
        (N.preventDefault(), onCancel());
        return;
      }
      if (N.key === "n") (N.preventDefault(), M("create"), A(o === "every" ? "interval" : "text"));
    }),
      (t[2] = o),
      (t[3] = onCancel),
      (t[4] = c),
      (t[5] = _e));
  else _e = t[5];
  let _o = _e,
    Ke;
  if (t[6] !== o)
    ((Ke = () => {
      let Je = o === "every" ? "until" : "every";
      (Oo(Je), A(Je === "every" ? "interval" : "text"));
    }),
      (t[6] = o),
      (t[7] = Ke));
  else Ke = t[7];
  let _ = Ke,
    We;
  if (
    t[8] !== u ||
    t[9] !== C ||
    t[10] !== E ||
    t[11] !== o ||
    t[12] !== g.length ||
    t[13] !== F ||
    t[14] !== _ ||
    t[15] !== c
  )
    ((We = (k) => {
      if (c !== "create") {
        return;
      }
      if (k.key === "escape") {
        (k.preventDefault(), M("list"));
        return;
      }
      if (k.key === "tab") {
        (k.preventDefault(), _());
        return;
      }
      let Xe = u === "interval" ? E : F;
      let Ko = u === "interval" ? C.length : g.length;
      if ((k.key === "left" && Xe === 0) || (k.key === "right" && Xe >= Ko)) {
        (k.preventDefault(), _());
        return;
      }
      if (o === "every" && (k.key === "down" || k.key === "up")) (k.preventDefault(), A(Eo));
    }),
      (t[8] = u),
      (t[9] = C),
      (t[10] = E),
      (t[11] = o),
      (t[12] = g.length),
      (t[13] = F),
      (t[14] = _),
      (t[15] = c),
      (t[16] = We));
  else We = t[16];
  let Jo = We,
    je;
  if (t[17] !== C || t[18] !== o || t[19] !== onCreate || t[20] !== g)
    ((je = function W() {
      let trimmed = g.trim();
      if (o === "every") {
        if (!C.trim() || !trimmed) {
          return;
        }
        onCreate({ kind: "cron", interval: C.trim(), prompt: trimmed });
      } else {
        if (!trimmed) {
          return;
        }
        onCreate({ kind: "stophook", condition: trimmed });
      }
    }),
      (t[17] = C),
      (t[18] = o),
      (t[19] = onCreate),
      (t[20] = g),
      (t[21] = je));
  else je = t[21];
  let W = je,
    X;
  if (t[22] !== loops.length)
    ((X = loops.length > 0 && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select" })),
      (t[22] = loops.length),
      (t[23] = X));
  else X = t[23];
  let z;
  if (t[24] !== loops.length)
    ((z = loops.length > 0 && e(KeyboardShortcutHint, { chord: "d", action: "delete" })),
      (t[24] = loops.length),
      (t[25] = z));
  else z = t[25];
  let qe, ze;
  if (t[26] === MEMO_CACHE_SENTINEL)
    ((qe = e(KeyboardShortcutHint, { chord: "n", action: "add" })),
      (ze = e(KeyboardShortcutHint, { chord: "escape", action: "close" })),
      (t[26] = qe),
      (t[27] = ze));
  else ((qe = t[26]), (ze = t[27]));
  let Qe;
  if (t[28] !== X || t[29] !== z)
    ((Qe = r(Byline, { children: [X, z, qe, ze] })), (t[28] = X), (t[29] = z), (t[30] = Qe));
  else Qe = t[30];
  let Wo = Qe,
    Ue;
  if (t[31] === MEMO_CACHE_SENTINEL)
    ((Ue = e(KeyboardShortcutHint, { chord: "tab", action: "switch mode" })), (t[31] = Ue));
  else Ue = t[31];
  let Q;
  if (t[32] !== o)
    ((Q = o === "every" && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "next field" })),
      (t[32] = o),
      (t[33] = Q));
  else Q = t[33];
  let Ye, Ze;
  if (t[34] === MEMO_CACHE_SENTINEL)
    ((Ye = e(KeyboardShortcutHint, { chord: "enter", action: "create" })),
      (Ze = e(KeyboardShortcutHint, { chord: "escape", action: "back" })),
      (t[34] = Ye),
      (t[35] = Ze));
  else ((Ye = t[34]), (Ze = t[35]));
  let He;
  if (t[36] !== Q) ((He = r(Byline, { children: [Ue, Q, Ye, Ze] })), (t[36] = Q), (t[37] = He));
  else He = t[37];
  let Xo = He;
  const ce = o !== "every",
    pe = o === "every" ? re.radioOn : re.radioOff;
  let U;
  if (t[38] !== ce || t[39] !== pe)
    ((U = r(Text, { dimColor: ce, children: [pe, " every"] })), (t[38] = ce), (t[39] = pe), (t[40] = U));
  else U = t[40];
  let Se;
  if (t[41] === MEMO_CACHE_SENTINEL) ((Se = e(Text, { dimColor: !0, children: "  " })), (t[41] = Se));
  else Se = t[41];
  const me = o !== "until",
    ue = o === "until" ? re.radioOn : re.radioOff;
  let Y;
  if (t[42] !== me || t[43] !== ue)
    ((Y = r(Text, { dimColor: me, children: [ue, " until"] })), (t[42] = me), (t[43] = ue), (t[44] = Y));
  else Y = t[44];
  let Z;
  if (t[45] !== U || t[46] !== Y)
    ((Z = r(Text, { children: [U, Se, Y] })), (t[45] = U), (t[46] = Y), (t[47] = Z));
  else Z = t[47];
  let H;
  if (t[48] !== u || t[49] !== C || t[50] !== E || t[51] !== o)
    ((H =
      o === "every" &&
      r(Box, {
        flexDirection: "row",
        gap: 1,
        marginTop: 1,
        children: [
          e(Text, { dimColor: u !== "interval", children: "Interval >" }),
          e(TextInput, {
            value: C,
            onChange: Po,
            onSubmit: () => A("text"),
            focus: u === "interval",
            showCursor: u === "interval",
            multiline: !1,
            columns: 12,
            cursorOffset: E,
            onChangeCursorOffset: Go,
            placeholder: "10m",
            disableEscapeDoublePress: !0,
          }),
        ],
      })),
      (t[48] = u),
      (t[49] = C),
      (t[50] = E),
      (t[51] = o),
      (t[52] = H));
  else H = t[52];
  const fe = o === "every" && u !== "text",
    ve = o === "every" ? "Prompt   >" : "Condition>";
  let ee;
  if (t[53] !== fe || t[54] !== ve)
    ((ee = e(Text, { dimColor: fe, children: ve })), (t[53] = fe), (t[54] = ve), (t[55] = ee));
  else ee = t[55];
  const ye = o === "until" || u === "text",
    Ce = o === "until" || u === "text",
    ke = columns - 16,
    he = o === "every" ? "e.g. /babysit-prs" : "e.g. tests pass and PR is merged";
  let oe;
  if (
    t[56] !== W ||
    t[57] !== ye ||
    t[58] !== Ce ||
    t[59] !== ke ||
    t[60] !== he ||
    t[61] !== g ||
    t[62] !== F
  )
    ((oe = e(TextInput, {
      value: g,
      onChange: Vo,
      onSubmit: W,
      focus: ye,
      showCursor: Ce,
      multiline: !1,
      columns: ke,
      cursorOffset: F,
      onChangeCursorOffset: Ao,
      placeholder: he,
      disableEscapeDoublePress: !0,
    })),
      (t[56] = W),
      (t[57] = ye),
      (t[58] = Ce),
      (t[59] = ke),
      (t[60] = he),
      (t[61] = g),
      (t[62] = F),
      (t[63] = oe));
  else oe = t[63];
  let te;
  if (t[64] !== ee || t[65] !== oe)
    ((te = r(Box, { flexDirection: "row", gap: 1, marginTop: 1, children: [ee, oe] })),
      (t[64] = ee),
      (t[65] = oe),
      (t[66] = te));
  else te = t[66];
  let eo;
  if (t[67] !== Z || t[68] !== H || t[69] !== te)
    ((eo = r(Box, { flexDirection: "column", children: [Z, H, te] })),
      (t[67] = Z),
      (t[68] = H),
      (t[69] = te),
      (t[70] = eo));
  else eo = t[70];
  let qo = eo,
    oo;
  if (t[71] !== i || t[72] !== index || t[73] !== loops || t[74] !== onDelete)
    ((oo = e(Box, {
      flexDirection: "column",
      children:
        loops.length === 0
          ? e(HintText, { children: "No active loops" })
          : e(OrderedListWithItem, {
              defaultFocusIndex: index < 0 ? i : index,
              onFocus: (to) => {
                (T(to), de(loops[to]?.id));
              },
              onRowKeyDown: (ro, zo) => {
                let no = loops[zo];
                if (ro.key === "d" && no) (ro.preventDefault(), onDelete(no));
              },
              children: loops.map(renderLoopItem),
            }),
    })),
      (t[71] = i),
      (t[72] = index),
      (t[73] = loops),
      (t[74] = onDelete),
      (t[75] = oo));
  else oo = t[75];
  let Qo = oo;
  const ge = c === "list" ? _o : Jo,
    xe = c === "list" ? "Loops" : "New loop",
    be = c === "list" ? "Recurring crons and stop-hooks active for this session" : void 0;
  let ne;
  if (t[76] !== onCancel || t[77] !== c)
    ((ne = c === "list" ? onCancel : () => M("list")), (t[76] = onCancel), (t[77] = c), (t[78] = ne));
  else ne = t[78];
  const Ie = c === "list" ? Wo : Xo,
    Le = c === "list" ? Qo : qo;
  let ie;
  if (t[79] !== xe || t[80] !== be || t[81] !== ne || t[82] !== Ie || t[83] !== Le)
    ((ie = e(Dialog, {
      title: xe,
      subtitle: be,
      color: "permission",
      onCancel: ne,
      isCancelActive: !1,
      inputGuide: Ie,
      children: Le,
    })),
      (t[79] = xe),
      (t[80] = be),
      (t[81] = ne),
      (t[82] = Ie),
      (t[83] = Le),
      (t[84] = ie));
  else ie = t[84];
  let io;
  if (t[85] !== ge || t[86] !== ie)
    ((io = e(Box, { flexDirection: "column", tabIndex: 0, autoFocus: !0, onKeyDown: ge, children: ie })),
      (t[85] = ge),
      (t[86] = ie),
      (t[87] = io));
  else io = t[87];
  return io;
}
//@ chunk-wtfk012h.js:19477-19503 placement
var Mo = /^(\d+)([smhd])$/i;
//@ chunk-wtfk012h.js:19503-19906 placement
function intervalToCron(f) {
  let match = f.match(Mo);
  if (!match) return null;
  let p = parseInt(match[1], 10);
  if (p < 1) return null;
  let m;
  switch (match[2].toLowerCase()) {
    case "s":
      m = `*/${Math.max(1, Math.ceil(p / 60))} * * * *`;
      break;
    case "m":
      m = p <= 59 ? `*/${p} * * * *` : `0 */${Math.round(p / 60)} * * *`;
      break;
    case "h":
      if (p > 23) return null;
      m = `0 */${p} * * *`;
      break;
    case "d":
      if (p > 31) return null;
      m = `0 0 */${p} * *`;
      break;
    default:
      return null;
  }
  return parseCronExpression(m) ? m : null;
}
/**
 * /loops 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-wtfk012h.js:19906-20969 placement
var runLoopsCommand = async (onDone, context) => {
  logEvent("tengu_loops_command", {});
  let p = await listAllCronTasks(),
    m = getSessionStopPromptHooks(context.sessionHooksRegistry, getSessionId()),
    L = [
      ...p.map((i) => ({
        kind: "cron",
        id: i.id,
        cron: i.cron,
        human: cronToHuman(i.cron),
        prompt: i.prompt,
      })),
      ...m.map((i, T) => ({ kind: "stophook", id: `stophook-${T}`, condition: i.prompt })),
    ];
  async function c(i) {
    if (i.kind === "cron") {
      try {
        (await removeCronTasks([i.id]),
          context.applyMessageOp({ type: "update", updater: mze }),
          onDone(`Loop ${i.id} deleted`, { display: "system" }));
      } catch (error) {
        onDone(`Failed to delete loop ${i.id}: ${error}`, { display: "system" });
      }
      return;
    }
    let T = clearSessionGoal(context);
    onDone(T === null ? "Stop hook not found" : "Stop hook cleared", { display: "system" });
  }
  async function M(i) {
    if (i.kind === "cron") {
      let h = intervalToCron(i.interval);
      if (!h) {
        onDone(`Invalid interval: ${i.interval}`, { display: "system" });
        return;
      }
      let de = await runWithWorkload(void 0, () => addCronTask(h, i.prompt, !0, !1));
      (setScheduledTasksEnabled(!0),
        context.applyMessageOp({ type: "update", updater: mze }),
        onDone(`Loop ${de} created (${cronToHuman(h)})`, { display: "system" }));
      return;
    }
    let T = setSessionGoal(i.condition, context, "loops_dialog");
    onDone(T ?? "Stop hook set", { display: "system" });
  }
  return e(LoopsManager, {
    loops: L,
    onDelete: (i) => void c(i),
    onCreate: (i) => void M(i),
    onCancel: () => onDone("", { display: "skip" }),
  });
};
