/**
 * utils/hooks/matcherGrammar.ts
 *
 * 钩子 matcher 语法（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85qer80d.js (19), chunk-sr7jp7gh.js (2)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDiskless } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-85qer80d.js:226-289 placement
class MatcherGrammarError extends Error {
  kind;
  constructor(kind) {
    super();
    this.kind = kind;
  }
}
//@ chunk-85qer80d.js:289-680 placement
/**
 * 匹配器语法使用的字符区间（数字、单词字符等）。
 */
var DIGIT_RANGES; // deferred: uses complementRanges of its import cycle while loading; runs once the cycle is complete
var WORD_CHAR_RANGES;
var WHITESPACE_RANGES;
var CHAR_CLASS_ESCAPES;
var DOT_RANGES;
var ESCAPABLE_PUNCTUATION_RE;
var QUANTIFIER_BRACES_RE;
var NAMED_GROUP_NAME_RE;
var CAPTURE_GROUP_RE;
var NAMED_CAPTURE_GROUP_RE;
var MAX_MATCHER_NODES;
var NFA_STATE_MULTIPLIER;
var REGEX_META_CHARS;
deferInit("chunk-85qer80d.js:289", () => {
  DIGIT_RANGES = [[48, 57]];
  WORD_CHAR_RANGES = [
    [48, 57],
    [65, 90],
    [95, 95],
    [97, 122],
  ];
  WHITESPACE_RANGES = [
    [9, 13],
    [32, 32],
    [160, 160],
    [5760, 5760],
    [8192, 8202],
    [8232, 8233],
    [8239, 8239],
    [8287, 8287],
    [12288, 12288],
    [65279, 65279],
  ];
  CHAR_CLASS_ESCAPES = {
    d: DIGIT_RANGES,
    D: complementRanges(DIGIT_RANGES),
    w: WORD_CHAR_RANGES,
    W: complementRanges(WORD_CHAR_RANGES),
    s: WHITESPACE_RANGES,
    S: complementRanges(WHITESPACE_RANGES),
  };
  DOT_RANGES = complementRanges([
    [10, 10],
    [13, 13],
    [8232, 8233],
  ]);
  ESCAPABLE_PUNCTUATION_RE = /^[ -/:-@[-`{-~]$/;
  QUANTIFIER_BRACES_RE = /^\{(\d+)(?:(,)(\d*))?\}/;
  NAMED_GROUP_NAME_RE = /^([A-Za-z_$][\w$]*)>/;
  CAPTURE_GROUP_RE = /\((?!\?)|\(\?<(?![=!])/;
  NAMED_CAPTURE_GROUP_RE = /\(\?<(?![=!])/;
  MAX_MATCHER_NODES = 100;
  NFA_STATE_MULTIPLIER = 6;
  REGEX_META_CHARS = "^$\\.*+?()[]{}|";
});
//@ chunk-85qer80d.js:680-797 placement
function inRanges(ranges, code) {
  let low = 0;
  let high = ranges.length;
  while (low < high) {
    let mid = (low + high) >> 1;
    if (code > ranges[mid][1]) low = mid + 1;
    else high = mid;
  }
  return low < ranges.length && code >= ranges[low][0];
}
//@ chunk-85qer80d.js:797-910 placement
function complementRanges(ranges) {
  let missing = [];
  let cursor = 0;
  for (let [start, end] of ranges) {
    if (start > cursor) missing.push([cursor, start - 1]);
    cursor = end + 1;
  }
  if (cursor <= 65535) missing.push([cursor, 65535]);
  return missing;
}
//@ chunk-85qer80d.js:910-1068 placement
function mergeRanges(ranges) {
  let merged = [];
  for (let [start, end] of ranges.toSorted((a, b) => a[0] - b[0])) {
    let last = merged.at(-1);
    if (last !== undefined && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
//@ chunk-85qer80d.js:1068-3181 placement
/**
 * 解析钩子 matcher 语法中的序列/二选一结构
 */
function parseMatcherSequence(pattern) {
  let index = 0;
  let nodes = 0;
  let groupNames = new Set();
  function matchToken(token) {
    if (!pattern.startsWith(token, index)) return false;
    index += token.length;
    return true;
  }
  function nextCode() {
    if (index >= pattern.length) throw new MatcherGrammarError("other");
    return pattern.charCodeAt(index++);
  }
  function parseEither() {
    let options = [parseSequence()];
    while (matchToken("|")) options.push(parseSequence());
    return {
      type: "either",
      options,
    };
  }
  function parseSequence() {
    let items = [];
    while (index < pattern.length && pattern[index] !== "|" && pattern[index] !== ")")
      items.push(parseTerm());
    return {
      type: "sequence",
      items,
    };
  }
  function parseTerm() {
    if (matchToken("^"))
      return {
        type: "start",
      };
    if (matchToken("$"))
      return {
        type: "end",
      };
    if (matchToken("\\b"))
      return {
        type: "boundary",
      };
    if (matchToken("\\B"))
      return {
        type: "notBoundary",
      };
    let item = parseAtom();
    let least = 0;
    let most = 1 / 0;
    if (matchToken("+")) least = 1;
    else if (matchToken("?")) most = 1;
    else if (!matchToken("*")) {
      let quantifier = pattern[index] === "{" ? QUANTIFIER_BRACES_RE.exec(pattern.slice(index)) : null;
      if (quantifier === null) return item;
      index += quantifier[0].length;
      least = Number(quantifier[1]);
      if (quantifier[2] === undefined) most = least;
      else if (quantifier[3] !== "") most = Number(quantifier[3]);
      if (most < least) throw new MatcherGrammarError("other");
    }
    matchToken("?");
    return {
      type: "repeat",
      item,
      least,
      most,
    };
  }
  function parseAtom() {
    if (matchToken("(")) return parseGroup();
    if (matchToken("."))
      return {
        type: "set",
        set: DOT_RANGES,
      };
    if (matchToken("["))
      return {
        type: "set",
        set: parseClass(),
      };
    if (matchToken("\\")) {
      let escaped = parseEscape();
      return typeof escaped === "number"
        ? {
            type: "unit",
            unit: escaped,
          }
        : {
            type: "set",
            set: escaped,
          };
    }
    if (REGEX_META_CHARS.includes(pattern[index] ?? "")) throw new MatcherGrammarError("legacy_grammar");
    return {
      type: "unit",
      unit: nextCode(),
    };
  }
  function parseGroup() {
    if (++nodes > MAX_MATCHER_NODES) throw new MatcherGrammarError("too_large");
    let negated;
    if (matchToken("?=")) negated = false;
    else if (matchToken("?!")) negated = true;
    else if (matchToken("?<=") || matchToken("?<!")) throw new MatcherGrammarError("look_behind");
    else if (matchToken("?<")) {
      let groupName = NAMED_GROUP_NAME_RE.exec(pattern.slice(index))?.[1];
      if (groupName === undefined || groupNames.has(groupName)) throw new MatcherGrammarError("other");
      groupNames.add(groupName);
      index += groupName.length + 1;
    } else if (pattern[index] === "?" && !matchToken("?:")) throw new MatcherGrammarError("flags_group");
    let body = parseEither();
    if (!matchToken(")")) throw new MatcherGrammarError("other");
    nodes--;
    return negated === undefined
      ? body
      : {
          type: "look",
          item: body,
          isNegative: negated,
        };
  }
  function parseEscape(inClass = false) {
    let code = nextCode();
    let char = String.fromCharCode(code);
    if (Object.hasOwn(CHAR_CLASS_ESCAPES, char)) return CHAR_CLASS_ESCAPES[char];
    if (!ESCAPABLE_PUNCTUATION_RE.test(char)) {
      let backRefPattern = char === "k" ? NAMED_CAPTURE_GROUP_RE : CAPTURE_GROUP_RE;
      let isBackRef = !inClass && /[1-9k]/.test(char) && backRefPattern.test(pattern);
      throw new MatcherGrammarError(isBackRef ? "back_reference" : "escape");
    }
    return code;
  }
  function parseClass() {
    let negated = matchToken("^");
    let ranges = [];
    while (!matchToken("]")) {
      let member = matchToken("\\") ? parseEscape(true) : nextCode();
      let isRange = pattern[index] === "-" && pattern[index + 1] !== "]";
      if (typeof member !== "number") {
        if (isRange) throw new MatcherGrammarError("legacy_grammar");
        ranges.push(...member);
        continue;
      }
      if (!isRange) {
        ranges.push([member, member]);
        continue;
      }
      index++;
      let rangeEnd = matchToken("\\") ? parseEscape(true) : nextCode();
      if (typeof rangeEnd !== "number") throw new MatcherGrammarError("legacy_grammar");
      if (rangeEnd < member) throw new MatcherGrammarError("other");
      ranges.push([member, rangeEnd]);
    }
    return negated ? complementRanges(mergeRanges(ranges)) : mergeRanges(ranges);
  }
  let ast = parseEither();
  if (index < pattern.length) throw new MatcherGrammarError("other");
  return ast;
}
//@ chunk-85qer80d.js:3181-3271 placement
var OPCODES = {
  match: 0,
  unit: 1,
  set: 2,
  jump: 3,
  split: 4,
  start: 5,
  end: 6,
  boundary: 7,
  notBoundary: 8,
  look: 9,
};
//@ chunk-85qer80d.js:3271-3324 placement
function spendProgramRoom(room) {
  if (--room.left < 0) throw new MatcherGrammarError("too_large");
}
//@ chunk-85qer80d.js:3324-3383 placement
function newProgram(room) {
  return {
    room,
    ops: [],
    to: [],
    other: [],
    sets: [],
  };
}
//@ chunk-85qer80d.js:3383-3482 placement
function emitOp(program, op, arg = 0, set) {
  spendProgramRoom(program.room);
  program.to.push(arg);
  program.other.push(0);
  program.sets.push(set);
  return program.ops.push(op) - 1;
}
//@ chunk-85qer80d.js:3482-4519 placement
/**
 * 把匹配器语法树节点编译为匹配程序的指令（单元、集合、前瞻、分支等）。
 */
function compileMatcherNode(node, program, looks, reversed) {
  spendProgramRoom(program.room);
  let { ops, to, other } = program;
  switch (node.type) {
    case "unit":
      emitOp(program, OPCODES.unit, node.unit);
      return;
    case "set":
      emitOp(program, OPCODES.set, 0, node.set);
      return;
    case "start":
    case "end":
    case "boundary":
    case "notBoundary":
      emitOp(program, OPCODES[node.type]);
      return;
    case "look": {
      let lookIndex = looks.indexOf.get(node);
      if (lookIndex === undefined) {
        let program_2 = newProgram(program.room);
        compileMatcherNode(node.item, program_2, looks, true);
        emitOp(program_2, OPCODES.match);
        lookIndex =
          looks.list.push({
            places: program_2,
            isNegative: node.isNegative,
          }) - 1;
        looks.indexOf.set(node, lookIndex);
      }
      emitOp(program, OPCODES.look, lookIndex);
      return;
    }
    case "sequence":
      for (let item of reversed ? node.items.toReversed() : node.items)
        compileMatcherNode(item, program, looks, reversed);
      return;
    case "either": {
      let jumps = [];
      for (let option of node.options.slice(0, -1)) {
        let splitOp = emitOp(program, OPCODES.split, ops.length + 1);
        compileMatcherNode(option, program, looks, reversed);
        jumps.push(emitOp(program, OPCODES.jump));
        other[splitOp] = ops.length;
      }
      compileMatcherNode(node.options.at(-1), program, looks, reversed);
      for (let jump of jumps) to[jump] = ops.length;
      return;
    }
    case "repeat": {
      let loopStart = ops.length;
      for (let idx = 0; idx < node.least; idx++) {
        loopStart = ops.length;
        compileMatcherNode(node.item, program, looks, reversed);
      }
      if (node.most === 1 / 0) {
        if (node.least > 0) {
          let splitOp = emitOp(program, OPCODES.split, loopStart);
          other[splitOp] = ops.length;
          return;
        }
        let splitOp = emitOp(program, OPCODES.split, ops.length + 1);
        compileMatcherNode(node.item, program, looks, reversed);
        emitOp(program, OPCODES.jump, splitOp);
        other[splitOp] = ops.length;
        return;
      }
      let splits = [];
      for (let least = node.least; least < node.most; least++) {
        splits.push(emitOp(program, OPCODES.split, ops.length + 1));
        compileMatcherNode(node.item, program, looks, reversed);
      }
      for (let splitOp of splits) other[splitOp] = ops.length;
    }
  }
}
//@ chunk-85qer80d.js:4519-5302 placement
/**
 * 以 NFA 模拟的方式执行编译后的 matcher 程序：逐字符推进状态集合，处理单元、字符集、行首/行尾、词边界与环视结果，返回是否匹配（或为环视填充每个位置的匹配表）。
 */
function runMatcherProgram({ ops, to, other, sets }, input, looks, captures) {
  let visited = new Int32Array(ops.length).fill(-1);
  let int32Array = new Int32Array(ops.length);
  let int32Array_2 = new Int32Array(ops.length);
  let stackSize = 0;
  let lookStackSize = 0;
  let position = captures === undefined ? 0 : input.length;
  function push(pc) {
    if (visited[pc] !== position) {
      visited[pc] = position;
      int32Array[stackSize++] = pc;
    }
  }
  for (;;) {
    while (lookStackSize > 0) push(int32Array_2[--lookStackSize]);
    push(0);
    let prevCode = position > 0 ? input.charCodeAt(position - 1) : -1;
    let nextCode = position < input.length ? input.charCodeAt(position) : -1;
    let code = captures === undefined ? nextCode : prevCode;
    let atBoundary = inRanges(WORD_CHAR_RANGES, prevCode) !== inRanges(WORD_CHAR_RANGES, nextCode);
    while (stackSize > 0) {
      let pc = int32Array[--stackSize];
      switch (ops[pc]) {
        case OPCODES.match:
          if (captures === undefined) return true;
          captures[position] = 1;
          break;
        case OPCODES.unit:
          if (code === to[pc]) int32Array_2[lookStackSize++] = pc + 1;
          break;
        case OPCODES.set:
          if (inRanges(sets[pc], code)) int32Array_2[lookStackSize++] = pc + 1;
          break;
        case OPCODES.split:
          push(other[pc]);
          push(to[pc]);
          break;
        case OPCODES.jump:
          push(to[pc]);
          break;
        case OPCODES.start:
          if (prevCode < 0) push(pc + 1);
          break;
        case OPCODES.end:
          if (nextCode < 0) push(pc + 1);
          break;
        case OPCODES.boundary:
        case OPCODES.notBoundary:
          if (atBoundary === (ops[pc] === OPCODES.boundary)) push(pc + 1);
          break;
        default:
          if (looks[to[pc]][position] === 1) push(pc + 1);
      }
    }
    if (code < 0) return false;
    position += captures === undefined ? 1 : -1;
  }
}
//@ chunk-85qer80d.js:5302-5539 placement
/**
 * 把解析后的 matcher 语法树编译为线性指令程序（类 Thompson NFA），环视子表达式先单独编译；返回逐位置模拟执行的 test 函数，保证线性时间匹配。
 */
function compileMatcher(matcherSequence, left) {
  let program = newProgram({
    left,
  });
  let looks = {
    list: [],
    indexOf: new Map(),
  };
  compileMatcherNode(matcherSequence, program, looks, false);
  emitOp(program, OPCODES.match);
  return (input) => {
    let lookResults = [];
    for (let look of looks.list) {
      let uint8Array = new Uint8Array(input.length + 1);
      runMatcherProgram(look.places, input, lookResults, uint8Array);
      lookResults.push(look.isNegative ? uint8Array.map((uint8) => 1 - uint8) : uint8Array);
    }
    return runMatcherProgram(program, input, lookResults);
  };
}
//@ chunk-85qer80d.js:5539-5651 placement
function tryCompileMatcher(pattern) {
  try {
    let bound = NFA_STATE_MULTIPLIER * (pattern.length + 1);
    return {
      test: compileMatcher(parseMatcherSequence(pattern), bound),
    };
  } catch (error) {
    if (error instanceof MatcherGrammarError) return error.kind;
    throw error;
  }
}
//@ chunk-85qer80d.js:5651-5712 placement
function compileMatcherSafe(pattern) {
  let result = tryCompileMatcher(pattern);
  return typeof result === "object" ? result : undefined;
}
//@ chunk-85qer80d.js:5712-5754 placement
/**
 * matcher 语法限制常量：最大长度、目标字符上限、步数上限与集合大小上限。
 */
var MAX_MATCHER_STEPS = 1024;
var MAX_MATCHER_SET_SIZE = 16384;
var MAX_MATCHER_LENGTH = MAX_MATCHER_SET_SIZE;
var MAX_MATCH_TARGET_CHARS = 512;
var MAX_UNREADABLE_MATCHER_CHARS = 2048;
//@ chunk-85qer80d.js:5754-5779 placement
/**
 * 云会话中无法测试某 matcher 时抛出的错误。
 */
class MatcherUnsupportableError extends Error {}
//@ chunk-85qer80d.js:5779-5935 placement
function classifyUnreadableMatcher(pattern) {
  let compiled = pattern.length > MAX_MATCHER_LENGTH ? undefined : compileMatcherSafe(pattern);
  if (compiled !== undefined) return compiled;
  if (pattern.length > MAX_UNREADABLE_MATCHER_CHARS) return "not_read";
  try {
    new RegExp(pattern);
    return "not_read";
  } catch {
    return "invalid";
  }
}
//@ chunk-85qer80d.js:5935-6382 placement
function checkHookMatcherForCloud(pattern) {
  if (!isDiskless()) return new RegExp(pattern);
  let compiled = classifyUnreadableMatcher(pattern);
  if (compiled === "invalid") throw SyntaxError("invalid hook matcher");
  if (typeof compiled === "string")
    throw new MatcherUnsupportableError(
      "This hook's matcher cannot be tested in a cloud session: it has to be rewritten.",
    );
  return {
    test(target) {
      if (target.length > MAX_MATCH_TARGET_CHARS)
        throw new MatcherUnsupportableError(
          `The name that this hook's matcher is tested against (for a tool call, the tool's name) has over ${MAX_MATCH_TARGET_CHARS} characters, more than a cloud session tests.`,
        );
      return compiled.test(target);
    },
  };
}
//@ chunk-sr7jp7gh.js:335-409 placement
/**
 * 取 MCP 工具的有效权限上限（为 ask 时返回 ceiling）。
 */
var mcpPermissionCeiling = (tool) =>
  tool.mcpInfo?.effectiveMaxPermission === "ask"
    ? {
        ceiling: "ask",
      }
    : {};
//@ chunk-sr7jp7gh.js:409-460 placement
/**
 * 构造 matcher 的测试目标（工具名与权限上限）。
 */
var matcherTestTarget = (tool) => ({
  tool: tool.name,
  ceiling: mcpPermissionCeiling(tool).ceiling,
});
export {
  matcherTestTarget,
  mcpPermissionCeiling,
  checkHookMatcherForCloud,
  MatcherUnsupportableError,
  MAX_MATCHER_SET_SIZE,
  MAX_MATCHER_STEPS,
};
