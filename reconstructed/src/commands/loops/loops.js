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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../../components/design-system/Byline.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TextInput } from "../../components/TextInput.js";
import { HintText } from "../../components/design-system/HintText.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { parseCronExpression, cronToHuman } from "../../utils/cron.js";
import { logEvent } from "../../services/analytics/index.js";
import { listAllCronTasks, removeCronTasks, addCronTask } from "../../utils/cronTasks.js";
import { getSessionStopPromptHooks, clearSessionGoal, setSessionGoal } from "../goal/goal.js";
import { getSessionId, setScheduledTasksEnabled } from "../../bootstrap/state.js";
import { withCronCarryAttachment } from "../../services/daemon/sessionCron.js";
import { runWithWorkload } from "../../utils/workloadContext.js";

//@ chunk-wtfk012h.js:13782-13786 placement
init_react_production();
//@ chunk-wtfk012h.js:13786-13843 placement
function toggleLoopMode(Uo) {
  return Uo === "interval" ? "text" : "interval";
}
//@ chunk-wtfk012h.js:13843-14043 placement
function renderLoopItem(D) {
  switch (D.kind) {
    case "cron": {
      return jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: D.prompt,
          meta: [D.human, D.id],
        },
        D.id,
      );
    }
    case "stophook": {
      return jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: D.condition,
          meta: ["stop-hook"],
        },
        D.id,
      );
    }
    default: {
      return D;
    }
  }
}
//@ chunk-wtfk012h.js:14043-19477 placement
/**
 * /loops 界面：列出会话的定时 cron 与 Stop 钩子循环，支持新建（every 间隔/until 条件）和删除。
 */
function LoopsManager(props) {
  let t = w(88);
  let { loops, onDelete, onCreate, onCancel } = props;
  let [c, M] = y("list");
  let [i, T] = y(0);
  let [h, de] = y();
  let [o, Oo] = y("every");
  let [C, Po] = y("10m");
  let [E, Go] = y(3);
  let [g, Vo] = y("");
  let [F, Ao] = y(0);
  let [u, A] = y(o === "every" ? "interval" : "text");
  let { columns } = useTerminalSize();
  let Ne;
  if (t[0] !== h) {
    Ne = (No) => No.id === h;
    t[0] = h;
    t[1] = Ne;
  } else Ne = t[1];
  let index = loops.findIndex(Ne);
  let _e;
  if (t[2] !== o || t[3] !== onCancel || t[4] !== c) {
    _e = (event) => {
      if (c !== "list") {
        return;
      }
      if (event.key === "escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === "n") {
        event.preventDefault();
        M("create");
        A(o === "every" ? "interval" : "text");
      }
    };
    t[2] = o;
    t[3] = onCancel;
    t[4] = c;
    t[5] = _e;
  } else _e = t[5];
  let _o = _e;
  let Ke;
  if (t[6] !== o) {
    Ke = () => {
      let Je = o === "every" ? "until" : "every";
      Oo(Je);
      A(Je === "every" ? "interval" : "text");
    };
    t[6] = o;
    t[7] = Ke;
  } else Ke = t[7];
  let _ = Ke;
  let We;
  if (
    t[8] !== u ||
    t[9] !== C ||
    t[10] !== E ||
    t[11] !== o ||
    t[12] !== g.length ||
    t[13] !== F ||
    t[14] !== _ ||
    t[15] !== c
  ) {
    We = (event) => {
      if (c !== "create") {
        return;
      }
      if (event.key === "escape") {
        event.preventDefault();
        M("list");
        return;
      }
      if (event.key === "tab") {
        event.preventDefault();
        _();
        return;
      }
      let Xe = u === "interval" ? E : F;
      let Ko = u === "interval" ? C.length : g.length;
      if ((event.key === "left" && Xe === 0) || (event.key === "right" && Xe >= Ko)) {
        event.preventDefault();
        _();
        return;
      }
      if (o === "every" && (event.key === "down" || event.key === "up")) {
        event.preventDefault();
        A(toggleLoopMode);
      }
    };
    t[8] = u;
    t[9] = C;
    t[10] = E;
    t[11] = o;
    t[12] = g.length;
    t[13] = F;
    t[14] = _;
    t[15] = c;
    t[16] = We;
  } else We = t[16];
  let Jo = We;
  let je;
  if (t[17] !== C || t[18] !== o || t[19] !== onCreate || t[20] !== g) {
    je = function W() {
      let trimmed = g.trim();
      if (o === "every") {
        if (!C.trim() || !trimmed) {
          return;
        }
        onCreate({
          kind: "cron",
          interval: C.trim(),
          prompt: trimmed,
        });
      } else {
        if (!trimmed) {
          return;
        }
        onCreate({
          kind: "stophook",
          condition: trimmed,
        });
      }
    };
    t[17] = C;
    t[18] = o;
    t[19] = onCreate;
    t[20] = g;
    t[21] = je;
  } else je = t[21];
  let onSubmit = je;
  let X;
  if (t[22] !== loops.length) {
    X =
      loops.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "select",
      });
    t[22] = loops.length;
    t[23] = X;
  } else X = t[23];
  let z;
  if (t[24] !== loops.length) {
    z =
      loops.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "d",
        action: "delete",
      });
    t[24] = loops.length;
    t[25] = z;
  } else z = t[25];
  let qe;
  let ze;
  if (t[26] === MEMO_CACHE_SENTINEL) {
    qe = jsxProd_default(KeyboardShortcutHint, {
      chord: "n",
      action: "add",
    });
    ze = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    t[26] = qe;
    t[27] = ze;
  } else {
    qe = t[26];
    ze = t[27];
  }
  let Qe;
  if (t[28] !== X || t[29] !== z) {
    Qe = jsxProd_default_2(Byline, {
      children: [X, z, qe, ze],
    });
    t[28] = X;
    t[29] = z;
    t[30] = Qe;
  } else Qe = t[30];
  let Wo = Qe;
  let Ue;
  if (t[31] === MEMO_CACHE_SENTINEL) {
    Ue = jsxProd_default(KeyboardShortcutHint, {
      chord: "tab",
      action: "switch mode",
    });
    t[31] = Ue;
  } else Ue = t[31];
  let Q;
  if (t[32] !== o) {
    Q =
      o === "every" &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "next field",
      });
    t[32] = o;
    t[33] = Q;
  } else Q = t[33];
  let Ye;
  let Ze;
  if (t[34] === MEMO_CACHE_SENTINEL) {
    Ye = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "create",
    });
    Ze = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "back",
    });
    t[34] = Ye;
    t[35] = Ze;
  } else {
    Ye = t[34];
    Ze = t[35];
  }
  let He;
  if (t[36] !== Q) {
    He = jsxProd_default_2(Byline, {
      children: [Ue, Q, Ye, Ze],
    });
    t[36] = Q;
    t[37] = He;
  } else He = t[37];
  let Xo = He;
  const dimColor = o !== "every";
  const pe = o === "every" ? figures_default.radioOn : figures_default.radioOff;
  let U;
  if (t[38] !== dimColor || t[39] !== pe) {
    U = jsxProd_default_2(Text, {
      dimColor,
      children: [pe, " every"],
    });
    t[38] = dimColor;
    t[39] = pe;
    t[40] = U;
  } else U = t[40];
  let Se;
  if (t[41] === MEMO_CACHE_SENTINEL) {
    Se = jsxProd_default(Text, {
      dimColor: true,
      children: "  ",
    });
    t[41] = Se;
  } else Se = t[41];
  const dimColor_2 = o !== "until";
  const ue = o === "until" ? figures_default.radioOn : figures_default.radioOff;
  let Y;
  if (t[42] !== dimColor_2 || t[43] !== ue) {
    Y = jsxProd_default_2(Text, {
      dimColor: dimColor_2,
      children: [ue, " until"],
    });
    t[42] = dimColor_2;
    t[43] = ue;
    t[44] = Y;
  } else Y = t[44];
  let Z;
  if (t[45] !== U || t[46] !== Y) {
    Z = jsxProd_default_2(Text, {
      children: [U, Se, Y],
    });
    t[45] = U;
    t[46] = Y;
    t[47] = Z;
  } else Z = t[47];
  let H;
  if (t[48] !== u || t[49] !== C || t[50] !== E || t[51] !== o) {
    H =
      o === "every" &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            dimColor: u !== "interval",
            children: "Interval >",
          }),
          jsxProd_default(TextInput, {
            value: C,
            onChange: Po,
            onSubmit: () => A("text"),
            focus: u === "interval",
            showCursor: u === "interval",
            multiline: false,
            columns: 12,
            cursorOffset: E,
            onChangeCursorOffset: Go,
            placeholder: "10m",
            disableEscapeDoublePress: true,
          }),
        ],
      });
    t[48] = u;
    t[49] = C;
    t[50] = E;
    t[51] = o;
    t[52] = H;
  } else H = t[52];
  const dimColor_3 = o === "every" && u !== "text";
  const children = o === "every" ? "Prompt   >" : "Condition>";
  let ee;
  if (t[53] !== dimColor_3 || t[54] !== children) {
    ee = jsxProd_default(Text, {
      dimColor: dimColor_3,
      children,
    });
    t[53] = dimColor_3;
    t[54] = children;
    t[55] = ee;
  } else ee = t[55];
  const focus = o === "until" || u === "text";
  const showCursor = o === "until" || u === "text";
  const columns_2 = columns - 16;
  const placeholder = o === "every" ? "e.g. /babysit-prs" : "e.g. tests pass and PR is merged";
  let oe;
  if (
    t[56] !== onSubmit ||
    t[57] !== focus ||
    t[58] !== showCursor ||
    t[59] !== columns_2 ||
    t[60] !== placeholder ||
    t[61] !== g ||
    t[62] !== F
  ) {
    oe = jsxProd_default(TextInput, {
      value: g,
      onChange: Vo,
      onSubmit,
      focus,
      showCursor,
      multiline: false,
      columns: columns_2,
      cursorOffset: F,
      onChangeCursorOffset: Ao,
      placeholder,
      disableEscapeDoublePress: true,
    });
    t[56] = onSubmit;
    t[57] = focus;
    t[58] = showCursor;
    t[59] = columns_2;
    t[60] = placeholder;
    t[61] = g;
    t[62] = F;
    t[63] = oe;
  } else oe = t[63];
  let te;
  if (t[64] !== ee || t[65] !== oe) {
    te = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      marginTop: 1,
      children: [ee, oe],
    });
    t[64] = ee;
    t[65] = oe;
    t[66] = te;
  } else te = t[66];
  let eo;
  if (t[67] !== Z || t[68] !== H || t[69] !== te) {
    eo = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Z, H, te],
    });
    t[67] = Z;
    t[68] = H;
    t[69] = te;
    t[70] = eo;
  } else eo = t[70];
  let qo = eo;
  let oo;
  if (t[71] !== i || t[72] !== index || t[73] !== loops || t[74] !== onDelete) {
    oo = jsxProd_default(Box, {
      flexDirection: "column",
      children:
        loops.length === 0
          ? jsxProd_default(HintText, {
              children: "No active loops",
            })
          : jsxProd_default(OrderedListWithItem, {
              defaultFocusIndex: index < 0 ? i : index,
              onFocus: (to) => {
                T(to);
                de(loops[to]?.id);
              },
              onRowKeyDown: (event, zo) => {
                let no = loops[zo];
                if (event.key === "d" && no) {
                  event.preventDefault();
                  onDelete(no);
                }
              },
              children: loops.map(renderLoopItem),
            }),
    });
    t[71] = i;
    t[72] = index;
    t[73] = loops;
    t[74] = onDelete;
    t[75] = oo;
  } else oo = t[75];
  let Qo = oo;
  const onKeyDown = c === "list" ? _o : Jo;
  const title = c === "list" ? "Loops" : "New loop";
  const subtitle = c === "list" ? "Recurring crons and stop-hooks active for this session" : undefined;
  let onCancel_2;
  if (t[76] !== onCancel || t[77] !== c) {
    onCancel_2 = c === "list" ? onCancel : () => M("list");
    t[76] = onCancel;
    t[77] = c;
    t[78] = onCancel_2;
  } else onCancel_2 = t[78];
  const inputGuide = c === "list" ? Wo : Xo;
  const children_2 = c === "list" ? Qo : qo;
  let children_3;
  if (
    t[79] !== title ||
    t[80] !== subtitle ||
    t[81] !== onCancel_2 ||
    t[82] !== inputGuide ||
    t[83] !== children_2
  ) {
    children_3 = jsxProd_default(Dialog, {
      title,
      subtitle,
      color: "permission",
      onCancel: onCancel_2,
      isCancelActive: false,
      inputGuide,
      children: children_2,
    });
    t[79] = title;
    t[80] = subtitle;
    t[81] = onCancel_2;
    t[82] = inputGuide;
    t[83] = children_2;
    t[84] = children_3;
  } else children_3 = t[84];
  let io;
  if (t[85] !== onKeyDown || t[86] !== children_3) {
    io = jsxProd_default(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      onKeyDown,
      children: children_3,
    });
    t[85] = onKeyDown;
    t[86] = children_3;
    t[87] = io;
  } else io = t[87];
  return io;
}
//@ chunk-wtfk012h.js:19477-19503 placement
var LOOP_INTERVAL_PATTERN = /^(\d+)([smhd])$/i;
//@ chunk-wtfk012h.js:19503-19906 placement
function intervalToCron(interval) {
  let match = interval.match(LOOP_INTERVAL_PATTERN);
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
//@ chunk-wtfk012h.js:19906-20969 placement
/**
 * /loops 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runLoopsCommand = async (onDone, context) => {
  logEvent("tengu_loops_command", {});
  let p = await listAllCronTasks();
  let sessionStopPromptHooks = getSessionStopPromptHooks(context.sessionHooksRegistry, getSessionId());
  let loops = [
    ...p.map((i) => ({
      kind: "cron",
      id: i.id,
      cron: i.cron,
      human: cronToHuman(i.cron),
      prompt: i.prompt,
    })),
    ...sessionStopPromptHooks.map((sessionStopPromptHook, T) => ({
      kind: "stophook",
      id: `stophook-${T}`,
      condition: sessionStopPromptHook.prompt,
    })),
  ];
  async function c(i) {
    if (i.kind === "cron") {
      try {
        await removeCronTasks([i.id]);
        context.applyMessageOp({
          type: "update",
          updater: withCronCarryAttachment,
        });
        onDone(`Loop ${i.id} deleted`, {
          display: "system",
        });
      } catch (error) {
        onDone(`Failed to delete loop ${i.id}: ${error}`, {
          display: "system",
        });
      }
      return;
    }
    let T = clearSessionGoal(context);
    onDone(T === null ? "Stop hook not found" : "Stop hook cleared", {
      display: "system",
    });
  }
  async function M(i) {
    if (i.kind === "cron") {
      let cron = intervalToCron(i.interval);
      if (!cron) {
        onDone(`Invalid interval: ${i.interval}`, {
          display: "system",
        });
        return;
      }
      let de = await runWithWorkload(undefined, () => addCronTask(cron, i.prompt, true, false));
      setScheduledTasksEnabled(true);
      context.applyMessageOp({
        type: "update",
        updater: withCronCarryAttachment,
      });
      onDone(`Loop ${de} created (${cronToHuman(cron)})`, {
        display: "system",
      });
      return;
    }
    let T = setSessionGoal(i.condition, context, "loops_dialog");
    onDone(T ?? "Stop hook set", {
      display: "system",
    });
  }
  return jsxProd_default(LoopsManager, {
    loops,
    onDelete: (i) => void c(i),
    onCreate: (i) => void M(i),
    onCancel: () =>
      onDone("", {
        display: "skip",
      }),
  });
};
