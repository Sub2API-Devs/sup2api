/**
 * vim/transitions.ts
 *
 * 并入旧版已有路径：vim 状态转换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/transitions.ts
 * pieces: chunk-530hfzwb.js (37)
 * attribution: fingerprint 12, layout 8, file-local 2, placement 15
 */
import {
  executeToggleCase,
  executeX,
  executeSubstitute,
  executeLineOp,
  executeJoinLines,
  executePaste,
  executeOperatorMotion,
  executeOpenLine,
  clampOffsetOutsidePlaceholder,
  executeOperatorG,
  executeOperatorFind,
  executeOperatorTextObj,
  computeScreenLineMove,
  executeOperatorGg,
  executeReplace,
  executeIndent,
} from "./operators.js";
import {
  isOperatorKey,
  OPERATORS,
  BACKSPACE_KEY,
  resolveMotion,
  FIND_KEYS,
  isTextObjScopeKey,
  TEXT_OBJ_SCOPES,
  TEXT_OBJ_TYPES,
  SIMPLE_MOTIONS,
  CHAR_MOTIONS,
  MAX_VIM_COUNT,
} from "./types.js";
import { truncatePathMiddle, Cursor } from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";

//@ chunk-530hfzwb.js:19998-20379 fingerprint = transition (1)
/**
 * 普通模式状态机入口：按当前命令状态（idle/count/operator/operatorCount/operatorFind/operatorTextObj/find/g/operatorG/replace/indent）分派处理一个输入，返回 {next 下一状态} 或 {execute 要执行的动作}（可带 wanted 目标列）。
 */
function transition(state, input, ctx) {
  switch (state.type) {
    case "idle":
      return fromIdle(input, ctx);
    case "count":
      return fromCount(state, input, ctx);
    case "operator":
      return fromOperator(state, input, ctx);
    case "operatorCount":
      return fromOperatorCount(state, input, ctx);
    case "operatorFind":
      return fromOperatorFind(state, input, ctx);
    case "operatorTextObj":
      return fromOperatorTextObj(state, input, ctx);
    case "find":
      return fromFind(state, input, ctx);
    case "g":
      return fromG(state, input, ctx);
    case "operatorG":
      return fromOperatorG(state, input, ctx);
    case "replace":
      return fromReplace(state, input, ctx);
    case "indent":
      return fromIndent(state, input, ctx);
  }
}
//@ chunk-530hfzwb.js:20379-21423 fingerprint = handleNormalInput (0.433)
/**
 * 普通模式单键命令表：g r > < 进入子状态；~ x s S J p P D C Y ; , u i I a A o O 直接执行。
 */
var NORMAL_COMMANDS = Object.assign(Object.create(null), {
  g: (count) => ({
    next: {
      type: "g",
      count,
    },
  }),
  r: (count) => ({
    next: {
      type: "replace",
      count,
    },
  }),
  ">": (count) => ({
    next: {
      type: "indent",
      dir: ">",
      count,
    },
  }),
  "<": (count) => ({
    next: {
      type: "indent",
      dir: "<",
      count,
    },
  }),
  "~": (count, ctx) => ({
    execute: () => executeToggleCase(count, ctx),
  }),
  x: (count, ctx) => ({
    execute: () => executeX(count, ctx),
    wanted: null,
  }),
  s: (count, ctx) => ({
    execute: () => executeSubstitute(count, ctx),
  }),
  S: (e, t) => ({
    execute: () => executeLineOp("change", e, t),
  }),
  J: (count, ctx) => ({
    execute: () => executeJoinLines(count, ctx),
  }),
  p: (count, ctx) => ({
    execute: () => executePaste(true, count, ctx),
    wanted: ctx.getRegister() === "" ? undefined : null,
  }),
  P: (count, ctx) => ({
    execute: () => executePaste(false, count, ctx),
    wanted: ctx.getRegister() === "" ? undefined : null,
  }),
  D: (e, t) => ({
    execute: () => executeOperatorMotion("delete", "$", 1, t),
    wanted: null,
  }),
  C: (e, t) => ({
    execute: () => executeOperatorMotion("change", "$", 1, t),
  }),
  Y: (e, t) => ({
    execute: () => executeLineOp("yank", e, t),
  }),
  ";": (e, t) => ({
    execute: () => executeRepeatFind(false, e, t),
  }),
  ",": (e, t) => ({
    execute: () => executeRepeatFind(true, e, t),
  }),
  u: (e, t) => ({
    execute: () => t.onUndo?.(),
    wanted: null,
  }),
  i: (e, t) => ({
    execute: () => executeInsertCommand("i", t),
  }),
  I: (e, t) => ({
    execute: () => executeInsertCommand("I", t),
  }),
  a: (e, t) => ({
    execute: () => executeInsertCommand("a", t),
  }),
  A: (e, t) => ({
    execute: () => executeInsertCommand("A", t),
  }),
  o: (e, ctx) => ({
    execute: () => executeOpenLine("below", ctx),
  }),
  O: (e, ctx) => ({
    execute: () => executeOpenLine("above", ctx),
  }),
});
//@ chunk-530hfzwb.js:21423-22339 layout
/**
 * idle/count 状态下解析一个键：操作符 d c y 进入 operator 状态；G 跳行；j k 保持目标列移动；$ 记住列为无穷；其余简单移动；f F t T 进入 find；. 重复上次修改；否则查单键命令表。
 */
function handleNormalInput(input, count, countTyped, ctx) {
  if (isOperatorKey(input))
    return {
      next: {
        type: "operator",
        op: OPERATORS[input],
        count,
        countTyped,
      },
    };
  if (input === "G")
    return {
      execute: () => {
        ctx.setOffset(
          countTyped
            ? ctx.cursor.goToLine(count).offset
            : ctx.text.lastIndexOf(`
`) + 1,
        );
      },
    };
  if (input === "j" || input === "k") {
    let { offset, column } = truncatePathMiddle(input === "j", count, ctx);
    let { text } = ctx.cursor;
    if (offset === null)
      return {
        next: {
          type: "idle",
        },
        wanted: {
          column,
          offset: ctx.cursor.offset,
          text,
        },
      };
    let u = clampOffsetOutsidePlaceholder(ctx.cursor, offset);
    return {
      execute: () => ctx.setOffset(u),
      wanted: {
        column,
        offset: u,
        text,
      },
    };
  }
  if (input === "$") {
    let offset = ctx.cursor.lastCharInLogicalLine().offset;
    return {
      execute: () => ctx.setOffset(offset),
      wanted: {
        column: 1 / 0,
        offset,
        text: ctx.cursor.text,
      },
    };
  }
  if (isSimpleMotion(input, countTyped)) {
    let s =
      input === " " || input === BACKSPACE_KEY
        ? applyCharMotionAcrossLines(input, ctx.cursor, count)
        : resolveMotion(input, ctx.cursor, count);
    let o = clampOffsetOutsidePlaceholder(s, s.offset);
    if (o === ctx.cursor.offset && isNoOpWhenUnmoved(input))
      return {
        next: {
          type: "idle",
        },
      };
    return {
      execute: () => ctx.setOffset(o),
      wanted: null,
    };
  }
  if (FIND_KEYS.has(input))
    return {
      next: {
        type: "find",
        find: input,
        count,
      },
    };
  if (input === ".")
    return {
      execute: () => ctx.onDotRepeat?.(countTyped ? count : undefined),
    };
  return NORMAL_COMMANDS[input]?.(count, ctx) ?? null;
}
//@ chunk-530hfzwb.js:22339-22711 fingerprint = handleOperatorInput (0.95)
/**
 * operator 状态下的后续键：i/a 进文本对象、f/F/t/T 进查找、移动键直接执行、G 到行、g 进 operatorG。
 */
function handleOperatorInput(op, count, countTyped, input, ctx) {
  if (isTextObjScopeKey(input))
    return {
      next: {
        type: "operatorTextObj",
        op,
        count,
        scope: TEXT_OBJ_SCOPES[input],
      },
    };
  if (FIND_KEYS.has(input))
    return {
      next: {
        type: "operatorFind",
        op,
        count,
        find: input,
      },
    };
  if (isSimpleMotion(input, countTyped))
    return {
      execute: () => executeOperatorMotion(op, input, count, ctx),
      wanted: input === "j" || input === "k" || input === "%" ? undefined : null,
    };
  if (input === "G") {
    let count_2 = countTyped ? count : 0;
    return {
      execute: () => executeOperatorG(op, count_2, ctx),
    };
  }
  if (input === "g")
    return {
      next: {
        type: "operatorG",
        op,
        count,
      },
    };
  return null;
}
//@ chunk-530hfzwb.js:22711-22919 fingerprint = fromIdle (0.878)
/**
 * idle：1-9 开始计数，0 回行首，其他交给 handleNormalInput。
 */
function fromIdle(input, ctx) {
  if (/[1-9]/.test(input))
    return {
      next: {
        type: "count",
        count: parseInt(input, 10),
      },
    };
  if (input === "0")
    return {
      execute: () => ctx.setOffset(ctx.cursor.startOfLogicalLine().offset),
    };
  let result = handleNormalInput(input, 1, false, ctx);
  if (result) return result;
  return {};
}
//@ chunk-530hfzwb.js:22919-23071 fingerprint = fromCount (0.794)
/**
 * count：继续累积数字（上限 10000），否则带计数执行。
 */
function fromCount(state, input, ctx) {
  if (/[0-9]/.test(input))
    return {
      next: {
        type: "count",
        count: appendCountDigit(state.count, input),
      },
    };
  let n = handleNormalInput(input, state.count, true, ctx);
  if (n) return n;
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:23071-23336 fingerprint = fromOperator (0.777)
/**
 * operator：同一操作符键（dd/cc/yy）做整行操作；1-9 开始移动计数；否则交给 handleOperatorInput。
 */
function fromOperator(state, input, ctx) {
  if (input === state.op[0])
    return {
      execute: () => executeLineOp(state.op, state.count, ctx),
    };
  if (/[1-9]/.test(input))
    return {
      next: {
        type: "operatorCount",
        op: state.op,
        count: state.count,
        motionCount: parseInt(input, 10),
      },
    };
  let countTyped = state.countTyped ?? false;
  let s = handleOperatorInput(state.op, state.count, countTyped, input, ctx);
  if (s) return s;
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:23336-23566 layout = fromOperatorTextObj (0.872)
/**
 * operatorCount（如 d3w）：累积移动计数，总计数 = 操作符计数 × 移动计数。
 */
function fromOperatorCount(state, input, ctx) {
  if (/[0-9]/.test(input))
    return {
      next: {
        ...state,
        motionCount: appendCountDigit(state.motionCount, input),
      },
    };
  let count = state.count * state.motionCount;
  if (input === state.op[0])
    return {
      execute: () => executeLineOp(state.op, count, ctx),
    };
  let s = handleOperatorInput(state.op, count, true, input, ctx);
  if (s) return s;
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:23566-23669 fingerprint = fromOperatorFind (0.803)
function fromOperatorFind(state, input, ctx) {
  return {
    execute: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      executeOperatorFind(state.op, state.find, input, state.count, ctx);
    },
  };
}
//@ chunk-530hfzwb.js:23669-23777 fingerprint = fromOperatorTextObj (1)
function fromOperatorTextObj(state, input, ctx) {
  if (TEXT_OBJ_TYPES.has(input))
    return {
      execute: () => executeOperatorTextObj(state.op, state.scope, input, state.count, ctx),
    };
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:23777-23926 fingerprint = fromFind (1)
function fromFind(state, input, ctx) {
  return {
    execute: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      let result = ctx.cursor.findCharacter(input, state.find, state.count);
      if (result !== null) ctx.setOffset(result);
    },
  };
}
//@ chunk-530hfzwb.js:23926-24261 fingerprint = fromG (1)
/**
 * g 前缀：gj/gk 按屏幕行移动，gg/{count}gg 跳到第一行/第 count 行。
 */
function fromG(state, input, ctx) {
  if (input === "j" || input === "k")
    return toScreenLineMoveResult(computeScreenLineMove(`g${input}`, state.count, ctx), ctx);
  if (input === "g") {
    if (state.count > 1)
      return {
        execute: () => {
          let lines = ctx.text.split(`
`);
          let targetLine = Math.min(state.count - 1, lines.length - 1);
          let offset = 0;
          for (let i = 0; i < targetLine; i++) offset += (lines[i]?.length ?? 0) + 1;
          ctx.setOffset(offset);
        },
      };
    return {
      execute: () => ctx.setOffset(ctx.cursor.startOfFirstLine().offset),
    };
  }
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:24261-24483 layout = fromOperatorTextObj (0.876)
/**
 * operatorG：dgj/dgk 按屏幕行，dgg 到首行。
 */
function fromOperatorG(state, input, ctx) {
  if (input === "j" || input === "k") {
    let screenLineMove = computeScreenLineMove(`g${input}`, state.count, ctx);
    if (screenLineMove.rowsRunOut) return toScreenLineMoveResult(screenLineMove, ctx);
    return {
      execute: () => executeOperatorMotion(state.op, `g${input}`, state.count, ctx),
    };
  }
  if (input === "g")
    return {
      execute: () => executeOperatorGg(state.op, state.count, ctx),
    };
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:24483-24575 fingerprint = fromReplace (1)
function fromReplace(state, input, ctx) {
  if (input === "")
    return {
      next: {
        type: "idle",
      },
    };
  return {
    execute: () => executeReplace(input, state.count, ctx),
  };
}
//@ chunk-530hfzwb.js:24575-24674 layout = fromReplace (1)
/**
 * indent：同一方向键（>> 或 <<）执行缩进，否则回 idle。
 */
function fromIndent(state, input, ctx) {
  if (input === state.dir)
    return {
      execute: () => executeIndent(state.dir, state.count, ctx),
    };
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:24674-24845 fingerprint = executeRepeatFind (1)
/**
 * ; 与 ,：按上次查找（, 时方向反转）再找一次。
 */
function executeRepeatFind(reverse, count, ctx) {
  let lastFind = ctx.getLastFind();
  if (!lastFind) return;
  let findType = lastFind.type;
  if (reverse)
    findType = {
      f: "F",
      F: "f",
      t: "T",
      T: "t",
    }[findType];
  let result = ctx.cursor.findCharacter(lastFind.char, findType, count);
  if (result !== null) ctx.setOffset(result);
}
//@ chunk-530hfzwb.js:24845-25103 layout
/**
 * 可视模式（316 新增）状态机入口：按 idle/count/find/g/replace/textObject 分派，返回 {next, move, wanted} 或 {exit: 结束可视模式要执行的操作}。
 */
function visualTransition(state, input, ctx) {
  switch (state.type) {
    case "idle":
      return visualFromIdle(input, ctx);
    case "count":
      return visualFromCount(state, input, ctx);
    case "find":
      return visualFromFind(state, input, ctx);
    case "g":
      return visualFromG(state, input, ctx);
    case "replace":
      if (input === "")
        return {
          next: {
            type: "idle",
          },
        };
      return {
        exit: "replace",
        char: input,
      };
    case "textObject":
      return visualFromTextObject(state, input, ctx);
  }
}
//@ chunk-530hfzwb.js:25103-26227 layout
/**
 * 可视模式单键命令：x/s/X/D/C/S/R/Y → 删除/修改/复制（大写强制整行）；r 进替换；~ u U 切换/小写/大写；p P 粘贴；> < 缩进；v V 切换字符/整行可视；o 交换选区两端；J 合并；$ g ; , 移动。
 */
var VISUAL_COMMANDS = Object.assign(Object.create(null), {
  x: () => ({
    exit: "operator",
    op: "delete",
  }),
  s: () => ({
    exit: "operator",
    op: "change",
  }),
  X: () => ({
    exit: "operator",
    op: "delete",
    forceLinewise: true,
  }),
  D: () => ({
    exit: "operator",
    op: "delete",
    forceLinewise: true,
  }),
  C: () => ({
    exit: "operator",
    op: "change",
    forceLinewise: true,
  }),
  S: () => ({
    exit: "operator",
    op: "change",
    forceLinewise: true,
  }),
  R: () => ({
    exit: "operator",
    op: "change",
    forceLinewise: true,
  }),
  Y: () => ({
    exit: "operator",
    op: "yank",
    forceLinewise: true,
  }),
  r: () => ({
    next: {
      type: "replace",
    },
  }),
  "~": () => ({
    exit: "case",
    op: "toggle",
  }),
  u: () => ({
    exit: "case",
    op: "lower",
  }),
  U: () => ({
    exit: "case",
    op: "upper",
  }),
  p: () => ({
    exit: "paste",
  }),
  P: () => ({
    exit: "paste",
  }),
  ">": (count) => ({
    exit: "indent",
    dir: ">",
    count,
  }),
  "<": (count) => ({
    exit: "indent",
    dir: "<",
    count,
  }),
  v: () => ({
    exit: "toggleKind",
    key: "v",
  }),
  V: () => ({
    exit: "toggleKind",
    key: "V",
  }),
  o: () => ({
    exit: "swap",
  }),
  J: () => ({
    exit: "join",
  }),
  $: (e, t) => {
    let offset = t.cursor.endOfLogicalLine().offset;
    return {
      next: {
        type: "idle",
      },
      move: () => t.setOffset(offset),
      wanted: {
        column: 1 / 0,
        offset,
        text: t.cursor.text,
      },
    };
  },
  g: (count) => ({
    next: {
      type: "g",
      count,
    },
  }),
  ";": (state, t) => ({
    next: {
      type: "idle",
    },
    move: () => executeRepeatFind(false, state, t),
  }),
  ",": (state, t) => ({
    next: {
      type: "idle",
    },
    move: () => executeRepeatFind(true, state, t),
  }),
});
//@ chunk-530hfzwb.js:26227-26893 layout
function handleVisualInput(input, count, countTyped, ctx) {
  if (isOperatorKey(input))
    return {
      exit: "operator",
      op: OPERATORS[input],
    };
  if (input === "G")
    return {
      next: {
        type: "idle",
      },
      move: () => {
        ctx.setOffset(
          countTyped
            ? ctx.cursor.goToLine(count).offset
            : ctx.text.lastIndexOf(`
`) + 1,
        );
      },
    };
  let s = VISUAL_COMMANDS[input];
  if (s) return s(count, ctx);
  if (isTextObjScopeKey(input))
    return {
      next: {
        type: "textObject",
        scope: TEXT_OBJ_SCOPES[input],
        count,
      },
    };
  if (input === "j" || input === "k") {
    let o = truncatePathMiddle(input === "j", count, ctx);
    let offset = o.offset ?? ctx.cursor.offset;
    return {
      next: {
        type: "idle",
      },
      move: () => ctx.setOffset(offset),
      wanted: {
        column: o.column,
        offset,
        text: ctx.cursor.text,
      },
    };
  }
  if (isSimpleMotion(input, countTyped)) {
    let { offset } = resolveMotion(input, ctx.cursor, count);
    if (offset === ctx.cursor.offset && isNoOpWhenUnmoved(input))
      return {
        next: {
          type: "idle",
        },
      };
    return {
      next: {
        type: "idle",
      },
      move: () => ctx.setOffset(offset),
    };
  }
  if (FIND_KEYS.has(input))
    return {
      next: {
        type: "find",
        find: input,
        count,
      },
    };
  return null;
}
//@ chunk-530hfzwb.js:26893-27117 file-local
function visualFromIdle(input, ctx) {
  if (/[1-9]/.test(input))
    return {
      next: {
        type: "count",
        count: parseInt(input, 10),
      },
    };
  if (input === "0")
    return {
      next: {
        type: "idle",
      },
      move: () => ctx.setOffset(ctx.cursor.startOfLogicalLine().offset),
    };
  return (
    handleVisualInput(input, 1, false, ctx) ?? {
      next: {
        type: "idle",
      },
    }
  );
}
//@ chunk-530hfzwb.js:27117-27251 layout = fromCount (0.794)
function visualFromCount(state, input, ctx) {
  if (/[0-9]/.test(input))
    return {
      next: {
        type: "count",
        count: appendCountDigit(state.count, input),
      },
    };
  return (
    handleVisualInput(input, state.count, true, ctx) ?? {
      next: {
        type: "idle",
      },
    }
  );
}
//@ chunk-530hfzwb.js:27251-27416 file-local
function visualFromFind(state, input, ctx) {
  return {
    next: {
      type: "idle",
    },
    move: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      let result = ctx.cursor.findCharacter(input, state.find, state.count);
      if (result !== null) ctx.setOffset(result);
    },
  };
}
//@ chunk-530hfzwb.js:27416-27781 placement
function visualFromG(state, t, ctx) {
  if (t === "j" || t === "k") {
    let { offset, column } = computeScreenLineMove(`g${t}`, state.count, ctx);
    return {
      next: {
        type: "idle",
      },
      move: () => ctx.setOffset(offset),
      wanted:
        column === null
          ? null
          : {
              column,
              offset,
              text: ctx.cursor.text,
            },
    };
  }
  if (t === "g")
    return {
      next: {
        type: "idle",
      },
      move: () => {
        let n = state.count > 1 ? ctx.cursor.goToLine(state.count) : ctx.cursor.startOfFirstLine();
        ctx.setOffset(n.offset);
      },
    };
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:27781-27950 placement
function visualFromTextObject(state, objType, ctx) {
  if (TEXT_OBJ_TYPES.has(objType)) {
    let textObject = findTextObject(ctx.text, ctx.cursor.offset, objType, state.scope === "inner");
    if (textObject)
      return {
        exit: "selectRange",
        start: textObject.start,
        end: textObject.end,
      };
  }
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-530hfzwb.js:27950-27999 placement
function isSimpleMotion(e, countTyped) {
  return SIMPLE_MOTIONS.has(e) && !(e === "%" && countTyped);
}
//@ chunk-530hfzwb.js:27999-28040 placement
function isNoOpWhenUnmoved(e) {
  return CHAR_MOTIONS.has(e) || e === "%";
}
//@ chunk-530hfzwb.js:28040-28097 placement
function appendCountDigit(e, t) {
  return Math.min(e * 10 + parseInt(t, 10), MAX_VIM_COUNT);
}
//@ chunk-530hfzwb.js:28097-28322 placement
function getInsertOffset(e, t) {
  switch (e) {
    case "i":
      return t.offset;
    case "I":
      return t.firstNonBlankInLogicalLine().offset;
    case "a":
      return t.isAtEnd() ||
        t.text[t.offset] ===
          `
`
        ? t.offset
        : t.right().offset;
    case "A":
      return t.endOfLogicalLine().offset;
  }
}
//@ chunk-530hfzwb.js:28322-28414 placement
function executeInsertCommand(e, t) {
  t.enterInsert(getInsertOffset(e, t.cursor));
  t.recordChange({
    type: "insertCommand",
    key: e,
  });
}
//@ chunk-530hfzwb.js:28414-28612 placement
function applyCharMotionAcrossLines(e, cursor, count) {
  let n = cursor;
  for (let k = 0; k < count; k++) {
    let motion = resolveMotion(e, n, 1);
    let { text, offset } = motion;
    if (
      text[offset] ===
        `
` &&
      offset > 0 &&
      text[offset - 1] !==
        `
`
    )
      motion =
        e === BACKSPACE_KEY
          ? new Cursor(motion.measuredText, clampOffsetOutsidePlaceholder(motion, offset))
          : resolveMotion(e, motion, 1);
    if (motion.equals(n)) break;
    n = motion;
  }
  return n;
}
//@ chunk-530hfzwb.js:28975-29179 placement
function toScreenLineMoveResult(screenLineMove, ctx) {
  let r = clampOffsetOutsidePlaceholder(ctx.cursor, screenLineMove.offset);
  if (r === ctx.cursor.offset)
    return {
      next: {
        type: "idle",
      },
    };
  return {
    execute: () => ctx.setOffset(r),
    wanted:
      screenLineMove.column === null
        ? null
        : {
            column: screenLineMove.column,
            offset: r,
            text: ctx.cursor.text,
          },
  };
}
//@ chunk-530hfzwb.js:29179-29410 placement
var META_CHAR_SEQUENCE = /^\x1b(?![[\]P_\\])[\x21-\x7e]$/;
var NON_TEXT_KEY_NAMES = new Set([
  "backspace",
  "delete",
  "tab",
  "home",
  "end",
  "pageup",
  "pagedown",
  "insert",
  "clear",
  "enter",
  "center",
  "undefined",
  "mouse",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
]);
//@ chunk-530hfzwb.js:29410-29467 placement
function isTextInputKey(rawInput, t) {
  return (t || rawInput.name === "") && !NON_TEXT_KEY_NAMES.has(rawInput.name);
}
//@ chunk-530hfzwb.js:29467-29685 placement
function changeEntersInsert(e) {
  if (!e) return false;
  switch (e.type) {
    case "insertCommand":
    case "openLine":
    case "substitute":
      return true;
    case "operator":
    case "operatorFind":
    case "operatorTextObj":
    case "visualOp":
      return e.op === "change";
    default:
      return false;
  }
}
//@ chunk-530hfzwb.js:29685-29872 placement
function isCursorMovingChange(e) {
  switch (e.type) {
    case "x":
    case "substitute":
    case "paste":
    case "operatorTextObj":
      return true;
    case "operator":
      return !["h", "l", " ", BACKSPACE_KEY, "gj", "gk", "%"].includes(e.motion);
    default:
      return false;
  }
}
//@ chunk-530hfzwb.js:29872-30058 placement
function wrapCtxWithHook(e, t) {
  return {
    ...e,
    setText: (r, n) => {
      t();
      e.setText(r, n);
    },
    setOffset: (r) => {
      t();
      e.setOffset(r);
    },
    enterInsert: (r) => {
      t();
      e.enterInsert(r);
    },
    setRegister: (r, n) => {
      t();
      e.setRegister(r, n);
    },
  };
}
//@ chunk-530hfzwb.js:30058-30136 placement
function clampCursorInPlace(e, key) {
  let r = clampOffsetOutsidePlaceholder(e, e.offset);
  if (r !== e.offset) key.setOffset(r);
  return r;
}
export {
  isTextInputKey,
  changeEntersInsert,
  getInsertOffset,
  isCursorMovingChange,
  wrapCtxWithHook,
  transition,
  META_CHAR_SEQUENCE,
  clampCursorInPlace,
  NON_TEXT_KEY_NAMES,
  visualTransition,
};
