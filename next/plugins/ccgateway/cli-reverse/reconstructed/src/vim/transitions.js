/**
 * vim/transitions.ts
 *
 * 并入旧版已有路径：vim 状态转换。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/transitions.ts
 * pieces: chunk-880p06ha.js (37)
 * attribution: fingerprint 12, file-local 3, layout 7, placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { moveLogicalLinesToColumn, Cursor } from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-880p06ha.js:20003-20384 fingerprint (2.1.88 match: transition, 1)
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
//@ chunk-880p06ha.js:20384-21428 fingerprint (2.1.88 match: handleNormalInput, 0.421)
/**
 * 普通模式单键命令表：g r > < 进入子状态；~ x s S J p P D C Y ; , u i I a A o O 直接执行。
 */
var NORMAL_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-880p06ha.js:20384", () => {
  NORMAL_COMMANDS = Object.assign(Object.create(null), {
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
    S: (count, ctx) => ({
      execute: () => executeLineOp("change", count, ctx),
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
    D: (count, ctx) => ({
      execute: () => executeOperatorMotion("delete", "$", 1, ctx),
      wanted: null,
    }),
    C: (count, ctx) => ({
      execute: () => executeOperatorMotion("change", "$", 1, ctx),
    }),
    Y: (count, ctx) => ({
      execute: () => executeLineOp("yank", count, ctx),
    }),
    ";": (count, ctx) => ({
      execute: () => executeRepeatFind(false, count, ctx),
    }),
    ",": (count, ctx) => ({
      execute: () => executeRepeatFind(true, count, ctx),
    }),
    u: (count, ctx) => ({
      execute: () => ctx.onUndo?.(),
      wanted: null,
    }),
    i: (count, ctx) => ({
      execute: () => executeInsertCommand("i", ctx),
    }),
    I: (count, ctx) => ({
      execute: () => executeInsertCommand("I", ctx),
    }),
    a: (count, ctx) => ({
      execute: () => executeInsertCommand("a", ctx),
    }),
    A: (count, ctx) => ({
      execute: () => executeInsertCommand("A", ctx),
    }),
    o: (count, ctx) => ({
      execute: () => executeOpenLine("below", ctx),
    }),
    O: (count, ctx) => ({
      execute: () => executeOpenLine("above", ctx),
    }),
  });
});
//@ chunk-880p06ha.js:21428-22344 file-local
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
    let { offset, column } = moveLogicalLinesToColumn(input === "j", count, ctx);
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
    let clampedOffset = clampOffsetOutsidePlaceholder(ctx.cursor, offset);
    return {
      execute: () => ctx.setOffset(clampedOffset),
      wanted: {
        column,
        offset: clampedOffset,
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
    let motion =
      input === " " || input === BACKSPACE_KEY
        ? applyCharMotionAcrossLines(input, ctx.cursor, count)
        : resolveMotion(input, ctx.cursor, count);
    let targetOffset = clampOffsetOutsidePlaceholder(motion, motion.offset);
    if (targetOffset === ctx.cursor.offset && isNoOpWhenUnmoved(input))
      return {
        next: {
          type: "idle",
        },
      };
    return {
      execute: () => ctx.setOffset(targetOffset),
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
//@ chunk-880p06ha.js:22344-22716 fingerprint (2.1.88 match: handleOperatorInput, 0.947)
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
//@ chunk-880p06ha.js:22716-22924 fingerprint (2.1.88 match: fromIdle, 0.916)
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
//@ chunk-880p06ha.js:22924-23076 fingerprint (2.1.88 match: fromCount, 0.854)
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
  let result = handleNormalInput(input, state.count, true, ctx);
  if (result) return result;
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-880p06ha.js:23076-23341 fingerprint (2.1.88 match: fromOperator, 0.758)
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
  let result = handleOperatorInput(state.op, state.count, countTyped, input, ctx);
  if (result) return result;
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-880p06ha.js:23341-23571 layout (2.1.88 match: fromOperatorTextObj, 0.853)
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
  let result = handleOperatorInput(state.op, count, true, input, ctx);
  if (result) return result;
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-880p06ha.js:23571-23674 fingerprint (2.1.88 match: fromOperatorFind, 0.749)
function fromOperatorFind(state, input, ctx) {
  return {
    execute: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      executeOperatorFind(state.op, state.find, input, state.count, ctx);
    },
  };
}
//@ chunk-880p06ha.js:23674-23782 fingerprint (2.1.88 match: fromOperatorTextObj, 1)
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
//@ chunk-880p06ha.js:23782-23931 fingerprint (2.1.88 match: fromFind, 1)
function fromFind(state, input, ctx) {
  return {
    execute: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      let result = ctx.cursor.findCharacter(input, state.find, state.count);
      if (result !== null) ctx.setOffset(result);
    },
  };
}
//@ chunk-880p06ha.js:23931-24266 fingerprint (2.1.88 match: fromG, 1)
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
          for (let index = 0; index < targetLine; index++) offset += (lines[index]?.length ?? 0) + 1;
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
//@ chunk-880p06ha.js:24266-24488 layout (2.1.88 match: fromOperatorTextObj, 0.857)
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
//@ chunk-880p06ha.js:24488-24580 fingerprint (2.1.88 match: fromReplace, 1)
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
//@ chunk-880p06ha.js:24580-24679 layout (2.1.88 match: fromReplace, 1)
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
//@ chunk-880p06ha.js:24679-24850 fingerprint (2.1.88 match: executeRepeatFind, 1)
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
//@ chunk-880p06ha.js:24850-25108 layout
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
//@ chunk-880p06ha.js:25108-26232 layout
/**
 * 可视模式单键命令：x/s/X/D/C/S/R/Y → 删除/修改/复制（大写强制整行）；r 进替换；~ u U 切换/小写/大写；p P 粘贴；> < 缩进；v V 切换字符/整行可视；o 交换选区两端；J 合并；$ g ; , 移动。
 */
var VISUAL_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-880p06ha.js:25108", () => {
  VISUAL_COMMANDS = Object.assign(Object.create(null), {
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
    $: (count, ctx) => {
      let offset = ctx.cursor.endOfLogicalLine().offset;
      return {
        next: {
          type: "idle",
        },
        move: () => ctx.setOffset(offset),
        wanted: {
          column: 1 / 0,
          offset,
          text: ctx.cursor.text,
        },
      };
    },
    g: (count) => ({
      next: {
        type: "g",
        count,
      },
    }),
    ";": (state, ctx) => ({
      next: {
        type: "idle",
      },
      move: () => executeRepeatFind(false, state, ctx),
    }),
    ",": (state, ctx) => ({
      next: {
        type: "idle",
      },
      move: () => executeRepeatFind(true, state, ctx),
    }),
  });
});
//@ chunk-880p06ha.js:26232-26898 layout
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
  let visualCommand = VISUAL_COMMANDS[input];
  if (visualCommand) return visualCommand(count, ctx);
  if (isTextObjScopeKey(input))
    return {
      next: {
        type: "textObject",
        scope: TEXT_OBJ_SCOPES[input],
        count,
      },
    };
  if (input === "j" || input === "k") {
    let screenLineMove = moveLogicalLinesToColumn(input === "j", count, ctx);
    let offset = screenLineMove.offset ?? ctx.cursor.offset;
    return {
      next: {
        type: "idle",
      },
      move: () => ctx.setOffset(offset),
      wanted: {
        column: screenLineMove.column,
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
//@ chunk-880p06ha.js:26898-27122 file-local
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
//@ chunk-880p06ha.js:27122-27256 layout (2.1.88 match: fromCount, 0.854)
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
//@ chunk-880p06ha.js:27256-27421 file-local
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
//@ chunk-880p06ha.js:27421-27786 placement
function visualFromG(state, input, ctx) {
  if (input === "j" || input === "k") {
    let { offset, column } = computeScreenLineMove(`g${input}`, state.count, ctx);
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
  if (input === "g")
    return {
      next: {
        type: "idle",
      },
      move: () => {
        let target = state.count > 1 ? ctx.cursor.goToLine(state.count) : ctx.cursor.startOfFirstLine();
        ctx.setOffset(target.offset);
      },
    };
  return {
    next: {
      type: "idle",
    },
  };
}
//@ chunk-880p06ha.js:27786-27955 placement
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
//@ chunk-880p06ha.js:27955-28004 placement
function isSimpleMotion(input, countTyped) {
  return SIMPLE_MOTIONS.has(input) && !(input === "%" && countTyped);
}
//@ chunk-880p06ha.js:28004-28045 placement
function isNoOpWhenUnmoved(input) {
  return CHAR_MOTIONS.has(input) || input === "%";
}
//@ chunk-880p06ha.js:28045-28102 placement
function appendCountDigit(count, digit) {
  return Math.min(count * 10 + parseInt(digit, 10), MAX_VIM_COUNT);
}
//@ chunk-880p06ha.js:28102-28327 placement
function getInsertOffset(command, cursor) {
  switch (command) {
    case "i":
      return cursor.offset;
    case "I":
      return cursor.firstNonBlankInLogicalLine().offset;
    case "a":
      return cursor.isAtEnd() ||
        cursor.text[cursor.offset] ===
          `
`
        ? cursor.offset
        : cursor.right().offset;
    case "A":
      return cursor.endOfLogicalLine().offset;
  }
}
//@ chunk-880p06ha.js:28327-28419 placement
function executeInsertCommand(command, ctx) {
  ctx.enterInsert(getInsertOffset(command, ctx.cursor));
  ctx.recordChange({
    type: "insertCommand",
    key: command,
  });
}
//@ chunk-880p06ha.js:28419-28617 placement
function applyCharMotionAcrossLines(motionKey, cursor, count) {
  let position = cursor;
  for (let k = 0; k < count; k++) {
    let motion = resolveMotion(motionKey, position, 1);
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
        motionKey === BACKSPACE_KEY
          ? new Cursor(motion.measuredText, clampOffsetOutsidePlaceholder(motion, offset))
          : resolveMotion(motionKey, motion, 1);
    if (motion.equals(position)) break;
    position = motion;
  }
  return position;
}
//@ chunk-880p06ha.js:28980-29184 placement (2.1.88 match: fromG, 0.776)
function toScreenLineMoveResult(screenLineMove, ctx) {
  let clampedOffset = clampOffsetOutsidePlaceholder(ctx.cursor, screenLineMove.offset);
  if (clampedOffset === ctx.cursor.offset)
    return {
      next: {
        type: "idle",
      },
    };
  return {
    execute: () => ctx.setOffset(clampedOffset),
    wanted:
      screenLineMove.column === null
        ? null
        : {
            column: screenLineMove.column,
            offset: clampedOffset,
            text: ctx.cursor.text,
          },
  };
}
//@ chunk-880p06ha.js:29184-29415 placement
var META_CHAR_SEQUENCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_TEXT_KEY_NAMES;
deferInit("chunk-880p06ha.js:29184", () => {
  META_CHAR_SEQUENCE = /^\x1b(?![[\]P_\\])[\x21-\x7e]$/;
  NON_TEXT_KEY_NAMES = new Set([
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
});
//@ chunk-880p06ha.js:29415-29472 placement
function isTextInputKey(key, allowUnnamed) {
  return (allowUnnamed || key.name === "") && !NON_TEXT_KEY_NAMES.has(key.name);
}
//@ chunk-880p06ha.js:29472-29690 placement
function changeEntersInsert(change) {
  if (!change) return false;
  switch (change.type) {
    case "insertCommand":
    case "openLine":
    case "substitute":
      return true;
    case "operator":
    case "operatorFind":
    case "operatorTextObj":
    case "visualOp":
      return change.op === "change";
    default:
      return false;
  }
}
//@ chunk-880p06ha.js:29690-29877 placement
function isCursorMovingChange(change) {
  switch (change.type) {
    case "x":
    case "substitute":
    case "paste":
    case "operatorTextObj":
      return true;
    case "operator":
      return !["h", "l", " ", BACKSPACE_KEY, "gj", "gk", "%"].includes(change.motion);
    default:
      return false;
  }
}
//@ chunk-880p06ha.js:29877-30063 placement
function wrapCtxWithHook(ctx, onMutate) {
  return {
    ...ctx,
    setText: (text, options) => {
      onMutate();
      ctx.setText(text, options);
    },
    setOffset: (offset) => {
      onMutate();
      ctx.setOffset(offset);
    },
    enterInsert: (offset) => {
      onMutate();
      ctx.enterInsert(offset);
    },
    setRegister: (value, linewise) => {
      onMutate();
      ctx.setRegister(value, linewise);
    },
  };
}
//@ chunk-880p06ha.js:30063-30141 placement
function clampCursorInPlace(cursor, key) {
  let clampedOffset = clampOffsetOutsidePlaceholder(cursor, cursor.offset);
  if (clampedOffset !== cursor.offset) key.setOffset(clampedOffset);
  return clampedOffset;
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
