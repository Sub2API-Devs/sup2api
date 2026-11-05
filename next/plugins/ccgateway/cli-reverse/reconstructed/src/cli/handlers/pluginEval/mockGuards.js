/**
 * cli/handlers/pluginEval/mockGuards.ts
 *
 * 2.1.316 新增。claude plugin eval 的 mock 守卫：expect 正则/类型检查、仓库路径校验、代理输入替换。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3nd3dera.js (26)
 * attribution: placement 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import path from "path";
import { createConnection } from "net";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { escapeNonPrintable } from "../../../utils/resultError.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import {
  isNetworkRelatedPath,
  isNetworkMountRoot,
  isWslUncPath,
  isOnForeignMount,
  isNetworkMountRoot_2,
} from "../../../utils/networkPaths.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../../utils/errors.js";
import {
  findIntermediateUncJunctionAsync,
  NodeFsOperations,
  UNVERIFIED_ANCESTRY,
} from "../../../utils/fsOperations.js";
import { DoctorLazy } from "../util.js";
import {
  objectSchema,
  _enum,
  stringSchema,
  lazy,
  union,
  array,
  record,
  discriminatedUnion,
  literal,
  booleanSchema,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-3nd3dera.js:787-797 placement
var MAX_GUARD_VALUE_CHARS = 120;
//@ chunk-3nd3dera.js:797-846 placement
function truncateGuardValue(value) {
  return value.length > MAX_GUARD_VALUE_CHARS
    ? `${truncateToLength(value, MAX_GUARD_VALUE_CHARS)}...`
    : value;
}
//@ chunk-3nd3dera.js:846-881 placement
/**
 * 把守卫值转成可展示文本：先按 120 字符截断，再 JSON 序列化并转义不可打印字符。
 */
function formatGuardValueJson(value) {
  return escapeNonPrintable(jsonStringify(truncateGuardValue(value)));
}
//@ chunk-3nd3dera.js:881-994 placement
/**
 * 把清单校验中的值格式化为可显示文本（过长时截断并转义）。
 */
function formatGuardValue(value) {
  if (typeof value === "string") return formatGuardValueJson(value);
  let json = jsonStringify(value) ?? String(value);
  return json.length <= MAX_GUARD_VALUE_CHARS
    ? escapeNonPrintable(json)
    : escapeNonPrintable(jsonStringify(truncateGuardValue(json)));
}
//@ chunk-3nd3dera.js:994-2539 placement
async function checkRepoAuthoredPath(root, repoPath, label, extraAnchors = []) {
  let resolved = path.resolve(root, repoPath);
  let displayPath = formatGuardValueJson(repoPath);
  let anchors = [root, ...extraAnchors];
  if (
    (isNetworkRelatedPath(repoPath) && !isNetworkMountRoot(repoPath)) ||
    (isNetworkRelatedPath(resolved) && !isNetworkMountRoot(resolved))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: ${displayPath} is an automounter path (macOS /Network, or the bare /net root) \u2014 refusing it (a lookup there is a network request)`,
      "plugin eval: a repo-authored path is an automounter path \u2014 refusing it",
    );
  let isWslPath = isWslUncPath(resolved) || (isWslUncPath(repoPath) && !isOnForeignMount(resolved, root));
  if (
    isOnForeignMount(repoPath, root) &&
    extraAnchors.every((anchor) => isOnForeignMount(resolved, anchor)) &&
    !isWslPath
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: ${displayPath} is a network-reaching path (UNC / automount) \u2014 refusing it`,
      "plugin eval: a repo-authored path is network-reaching \u2014 refusing it",
    );
  let resolvedTarget;
  let intermediateUncJunction = await findIntermediateUncJunctionAsync(NodeFsOperations, resolved, {
    anchors,
    surfaceNetworkRaw: true,
    unreadableAncestry: "unverified",
    onOutcome: (outcome) => {
      if (outcome.kind === "resolved") resolvedTarget = outcome.path;
    },
  });
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: ${displayPath} passes through a component that cannot be examined (unreadable, a link or junction whose target does not exist, or a symlink chain too long to follow) \u2014 refusing it (it could not be vetted)`,
      "plugin eval: a repo-authored path has an unexaminable component \u2014 refusing it",
    );
  if (intermediateUncJunction !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: ${displayPath} passes through a symlink to a network-reaching path (or a dotted one that cannot be vetted) \u2014 refusing it`,
      "plugin eval: a repo-authored path links to a network-reaching path \u2014 refusing it",
    );
  if (resolvedTarget !== undefined && isNetworkMountRoot_2(resolvedTarget))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: ${displayPath} leads to an automounter map directory (/net, /net/<host>; macOS /Network, /home) \u2014 refusing it (naming anything in it asks the automounter or a host)`,
      "plugin eval: a repo-authored path lands on an automounter map directory \u2014 refusing it",
    );
}
//@ chunk-3nd3dera.js:2559-2595 placement
var MAX_REGEX_EXPECT_LENGTH = 8192;
var MAX_EXPECT_REPEAT_BUDGET = 50000000;
var EXPECT_REGEX_FLAGS_PATTERN = /^[is]*$/;
//@ chunk-3nd3dera.js:2595-5350 placement
function compileExpectRegex(source) {
  let singleCount = 0;
  let repeatCount = 1;
  let literalCount = 0;
  let isAnchoredStart = false;
  let isLiteralAtom = false;
  let prevWasQuantified = false;
  for (let idx = 0; idx < source.length; idx++) {
    let char = source[idx];
    if (char === "(" || char === ")" || char === "|")
      return {
        problem:
          'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
      };
    if (char === "^") {
      if (idx !== 0)
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      isAnchoredStart = true;
      isLiteralAtom = false;
      prevWasQuantified = false;
      continue;
    }
    if (char === "$") {
      if (idx !== source.length - 1)
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      continue;
    }
    let quantifier = null;
    if (char === "*")
      quantifier = {
        lo: 0,
        hi: 1 / 0,
      };
    else if (char === "+")
      quantifier = {
        lo: 1,
        hi: 1 / 0,
      };
    else if (char === "?") {
      if (prevWasQuantified) {
        prevWasQuantified = false;
        continue;
      }
      quantifier = {
        lo: 0,
        hi: 1,
      };
    } else if (char === "{") {
      let match = /^\{(\d+)(?:,(\d*))?\}/.exec(source.slice(idx));
      if (match) {
        let min = Number(match[1]);
        let max = match[2] === undefined ? min : match[2] === "" ? 1 / 0 : Number(match[2]);
        if (max < min)
          return {
            problem: `quantifier ${match[0]} has max < min`,
          };
        quantifier = {
          lo: min,
          hi: max,
        };
        idx += match[0].length - 1;
      }
    }
    if (quantifier !== null) {
      if (!isLiteralAtom)
        return {
          problem: "a quantifier must follow a single character, escape, or class",
        };
      literalCount += (quantifier.hi === 1 / 0 ? quantifier.lo : quantifier.hi) - 1;
      if (quantifier.hi === 1 / 0) singleCount++;
      else repeatCount *= quantifier.hi - quantifier.lo + 1;
      isLiteralAtom = false;
      prevWasQuantified = true;
      continue;
    }
    prevWasQuantified = false;
    if (char === "\\") {
      let escaped = source[idx + 1];
      if (escaped === undefined)
        return {
          problem: "pattern ends with a lone backslash",
        };
      if (/[1-9]/.test(escaped) || escaped === "k")
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      isLiteralAtom = escaped !== "b" && escaped !== "B";
      if (isLiteralAtom) literalCount++;
      idx++;
      continue;
    }
    if (char === "[") {
      idx++;
      while (idx < source.length && source[idx] !== "]") {
        if (source[idx] === "\\") idx++;
        idx++;
      }
      if (idx >= source.length)
        return {
          problem: "unterminated character class",
        };
      isLiteralAtom = true;
      literalCount++;
      continue;
    }
    isLiteralAtom = true;
    literalCount++;
  }
  if (repeatCount > MAX_EXPECT_REPEAT_BUDGET)
    return {
      problem: "too many optional/bounded repeats for an expect: guard",
    };
  let subjectCost = (subjectLength) => {
    let product = 1;
    for (let idx = 1; idx <= singleCount; idx++) product = (product * (subjectLength + idx)) / idx;
    return (
      (isAnchoredStart ? 1 : Math.max(1, subjectLength)) *
      product *
      repeatCount *
      (subjectLength + literalCount)
    );
  };
  let lo = 0;
  let hi = MAX_REGEX_EXPECT_LENGTH;
  while (lo < hi) {
    let mid = Math.ceil((lo + hi) / 2);
    if (subjectCost(mid) <= MAX_EXPECT_REPEAT_BUDGET) lo = mid;
    else hi = mid - 1;
  }
  if (lo < 16)
    return {
      problem:
        "this combination of repeats leaves no useful subject length under the matching budget \u2014 use fewer quantifiers",
    };
  return {
    maxSubject: lo,
    problem: null,
  };
}
//@ chunk-3nd3dera.js:5350-5420 placement
var GUARD_SCALAR_TYPES = new Set(["string", "number", "bool", "boolean", "object", "array"]);
//@ chunk-3nd3dera.js:5420-5625 placement
function getByDottedPath(root, path) {
  let cursor = root;
  for (let segment of path.split(".")) {
    if (cursor === null || typeof cursor !== "object") return;
    if (Array.isArray(cursor)) {
      if (!/^\d+$/.test(segment)) return;
      cursor = cursor[Number(segment)];
      continue;
    }
    cursor = Object.hasOwn(cursor, segment) ? cursor[segment] : undefined;
  }
  return cursor;
}
//@ chunk-3nd3dera.js:5625-5760 placement
/**
 * 按 expect 表逐个键（点分路径）检查输入：取出值后交给 checkExpectType，返回第一个违反描述，全部通过返回 null。
 */
function checkExpectGuards(input, expect, prefix = "") {
  for (let [key, value] of Object.entries(expect)) {
    let path = prefix ? `${prefix}.${key}` : key;
    let actual = getByDottedPath(input, path);
    let problem = checkExpectType(actual, value, path, input);
    if (problem !== null) return problem;
  }
  return null;
}
//@ chunk-3nd3dera.js:5760-6476 placement
function checkExpectType(value, expected, path, root) {
  if (Array.isArray(expected))
    return expected.some((allowed) => scalarEquals(value, allowed))
      ? null
      : `${path} = ${describeGuardValue(value)} is not one of [${expected.join(", ")}]`;
  if (typeof expected === "object" && expected !== null) return checkExpectGuards(root, expected, path);
  let regexLiteral = parseRegexLiteral(expected);
  if (regexLiteral !== null) {
    let subject =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : null;
    let compiled = compileExpectRegex(regexLiteral.source);
    if (!("maxSubject" in compiled))
      return `${path}: ${expected} is not a usable guard (${compiled.problem})`;
    let maxSubject = compiled.maxSubject;
    if (subject !== null && subject.length > maxSubject)
      return `${path} is ${subject.length} characters, more than this /regex/ guard checks (${maxSubject})`;
    return subject !== null && regexLiteral.test(subject)
      ? null
      : `${path} = ${describeGuardValue(value)} does not match ${expected}`;
  }
  if (GUARD_SCALAR_TYPES.has(expected)) {
    let typeName = expected === "boolean" ? "bool" : expected;
    return guardTypeOf(value) === typeName
      ? null
      : `${path} = ${describeGuardValue(value)} is not a ${expected}`;
  }
  return scalarEquals(value, expected) ? null : `${path} = ${describeGuardValue(value)} is not "${expected}"`;
}
//@ chunk-3nd3dera.js:6476-6603 placement
function scalarEquals(value, expected) {
  if (typeof value === "string") return value === expected;
  if (typeof value === "number" || typeof value === "boolean") return String(value) === expected;
  return false;
}
//@ chunk-3nd3dera.js:6603-6708 placement
function parseRegexLiteral(text) {
  let match = /^\/(.+)\/([a-z]*)$/s.exec(text);
  if (!match) return null;
  return new RegExp(match[1] ?? "", match[2] ?? "");
}
//@ chunk-3nd3dera.js:6708-6850 placement
function guardTypeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null || value === undefined) return "missing";
  if (typeof value === "boolean") return "bool";
  return typeof value;
}
//@ chunk-3nd3dera.js:6850-6944 placement
function describeGuardValue(value) {
  if (value === undefined) return "(missing)";
  let text = jsonStringify(value);
  return text.length > 80 ? `${truncateToLength(text, 77)}...` : text;
}
//@ chunk-3nd3dera.js:6944-6953 placement
var MAX_GUARDS_OR_LEAVES = 32;
//@ chunk-3nd3dera.js:6953-7954 placement
function compileExpectGuards(expect, prefix = "") {
  let problems = [];
  if (prefix === "") {
    let leafCount = countLeafValues(expect);
    if (leafCount > MAX_GUARDS_OR_LEAVES) {
      problems.push(
        `expect: ${leafCount} guards is more than the ${MAX_GUARDS_OR_LEAVES} one responder may carry \u2014 every call checks each of them; keep the ones that catch a wrong call`,
      );
      return problems;
    }
  }
  for (let [key, value] of Object.entries(expect)) {
    let path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      if (value.length === 0)
        problems.push(
          `expect.${path}: an empty list of allowed values can never be satisfied \u2014 list at least one`,
        );
      continue;
    }
    if (typeof value === "object" && value !== null) {
      problems.push(...compileExpectGuards(value, path));
      continue;
    }
    if (/^\/.*\/[a-z]*$/s.test(value))
      try {
        let regexLiteral = parseRegexLiteral(value);
        let compiled = regexLiteral ? compileExpectRegex(regexLiteral.source) : null;
        if (regexLiteral && !EXPECT_REGEX_FLAGS_PATTERN.test(regexLiteral.flags))
          problems.push(
            `expect.${path}: ${value} \u2014 only the i and s flags are supported in expect: guards`,
          );
        else if (compiled && compiled.problem !== null)
          problems.push(`expect.${path}: ${value} \u2014 ${compiled.problem}`);
      } catch (error) {
        problems.push(
          `expect.${path}: invalid regular expression ${value} (${error instanceof Error ? error.message : String(error)}) \u2014 a value written /like this/ is read as a regex; for a literal that starts and ends with a slash, write a one-element list: ["${value}"]`,
        );
      }
  }
  return problems;
}
//@ chunk-3nd3dera.js:7954-7993 placement
var SAFE_FILE_NAME_SEGMENT_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;
//@ chunk-3nd3dera.js:7993-8988 placement
async function substituteAgentInput(
  template,
  root,
  parent,
  readFixture,
  maxChars = Number.POSITIVE_INFINITY,
) {
  let failure = null;
  let parts = [];
  let cursor = 0;
  for (let match of template.matchAll(
    /\{\{\s*(input\.[A-Za-z0-9_.-]+|file:(?:[^{}]|\{input\.[A-Za-z0-9_.-]+\})+?)\s*\}\}/g,
  )) {
    parts.push(template.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    let placeholder = match[1] ?? "";
    if (placeholder.startsWith("input.")) {
      let value = getByDottedPath(root, placeholder.slice(6));
      let text = value === undefined ? "" : typeof value === "string" ? value : jsonStringify(value);
      parts.push(
        text.length > maxChars
          ? `${truncateToLength(text, maxChars)}\u2026 [${text.length - maxChars} more characters omitted]`
          : text,
      );
      continue;
    }
    let trimmed = placeholder.slice(5).trim();
    let fileProblem = null;
    trimmed = trimmed.replace(/\{input\.([A-Za-z0-9_.-]+)\}/g, (whole, path) => {
      let value = getByDottedPath(root, path);
      let segment = value === undefined || value === null ? "" : String(value);
      if (!SAFE_FILE_NAME_SEGMENT_PATTERN.test(segment))
        fileProblem = `{input.${path}} = ${describeGuardValue(value)} is not a plain file-name segment`;
      return segment;
    });
    if (fileProblem !== null) {
      failure ??= fileProblem;
      continue;
    }
    let child = path.resolve(parent, trimmed);
    if (!isPathInside(parent, child)) {
      failure ??= `{{file:${trimmed}}} names a path outside the mock's directory`;
      continue;
    }
    parts.push(
      readFixture(child).then((fixture) => {
        if (typeof fixture !== "string") {
          failure ??= `{{file:${trimmed}}}: ${fixture.problem}`;
          return "";
        }
        return fixture;
      }),
    );
  }
  parts.push(template.slice(cursor));
  let results = await Promise.all(parts);
  if (failure !== null)
    return {
      ok: false,
      reason: failure,
    };
  return {
    ok: true,
    text: results.join(""),
  };
}
//@ chunk-3nd3dera.js:8988-9080 placement (2.1.88 match: normalizeGitPaths, 0.68)
function isPathInside(parent, child) {
  let relativePath = path.relative(parent, child);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}
//@ chunk-3nd3dera.js:9080-9213 placement
function countLeafValues(node) {
  let total = 0;
  for (let value of Object.values(node)) {
    total +=
      typeof value === "object" && value !== null && !Array.isArray(value) ? countLeafValues(value) : 1;
    if (total > MAX_GUARDS_OR_LEAVES) break;
  }
  return total;
}
//@ chunk-3nd3dera.js:9253-9318 placement
/**
 * 插件评测的两条固定文案："eval aborted by mock" 与 "mock agent responder failed"（后者附 harness_unreachable 提示）。
 */
var EVAL_ABORTED_BY_MOCK = "eval aborted by mock";
var MOCK_RESPONDER_FAILED_TEXT = "mock agent responder failed";
//@ chunk-3nd3dera.js:9318-9432 placement
var RELAY_RESPONSE_SCHEMA = DoctorLazy(() =>
  objectSchema({
    verdict: _enum(["ok", "tool_error", "abort"]),
    text: stringSchema(),
    replay: _enum(["hit", "miss"]).optional(),
  }),
);
var MAX_RELAY_RESPONSE_BYTES = 4194304;
//@ chunk-3nd3dera.js:9432-9720 placement
/**
 * 把 agent 型 mock 调用通过 unix socket 交给评测宿主代理处理并解析回应；失败时写 stderr 并返回 abort（harness_unreachable）。
 */
async function relayAgentMockCall(agent, payload, signal) {
  try {
    let line = await requestOverSocketLine(
      agent.socketPath,
      `${jsonStringify({
        token: agent.token,
        ...payload,
      })}
`,
      signal,
    );
    return RELAY_RESPONSE_SCHEMA().parse(jsonParse(line));
  } catch (error) {
    process.stderr.write(`eval mock stand-in: agent relay failed: ${errorMessage(error)}
`);
    return {
      verdict: "abort",
      text: `${MOCK_RESPONDER_FAILED_TEXT} (harness_unreachable) \u2014 see the eval debug log`,
    };
  }
}
//@ chunk-3nd3dera.js:9720-10329 placement
/**
 * 连接 unix socket，写一行请求，读到第一个换行为止返回字符串；支持中止、响应超过 MAX_RELAY_RESPONSE_BYTES 时报错、对端关闭未回应时报错。
 */
function requestOverSocketLine(socketPath, line, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(Error("aborted"));
      return;
    }
    let connection = createConnection({
      path: socketPath,
    });
    let buffer = Buffer.alloc(0);
    let isSettled = false;
    let settle = (error, value) => {
      if (isSettled) return;
      isSettled = true;
      signal.removeEventListener("abort", onAbort);
      connection.destroy();
      if (error !== null) reject(error);
      else resolve(value ?? "");
    };
    let onAbort = () => settle(Error("aborted"));
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    connection.once("connect", () => connection.write(line));
    connection.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_RELAY_RESPONSE_BYTES) {
        settle(Error("relay response too large"));
        return;
      }
      let index = buffer.indexOf(10);
      if (index !== -1) settle(null, buffer.subarray(0, index).toString("utf8"));
    });
    connection.once("error", (error) => settle(error));
    connection.once("close", () => settle(Error("harness closed the relay without answering")));
  });
}
//@ chunk-3nd3dera.js:10329-10879 placement
/**
 * 插件评测模拟服务器的配置结构：工具列表与响应器（固定响应或代理），以及读取上限。
 */
var MOCK_SPEC_SCHEMA = DoctorLazy(() => {
  let expectValue = lazy(() =>
    union([stringSchema(), array(stringSchema()), record(stringSchema(), expectValue)]),
  );
  let expect = record(stringSchema(), expectValue).nullable();
  let responder = discriminatedUnion("kind", [
    objectSchema({
      kind: literal("fixed"),
      body: stringSchema(),
      isError: booleanSchema(),
      expect,
      baseDir: stringSchema(),
    }),
    objectSchema({
      kind: literal("agent"),
      prompt: stringSchema(),
      abortWhen: stringSchema().nullable(),
      expect,
      baseDir: stringSchema(),
      replay: objectSchema({
        mockHash: stringSchema(),
        replayDir: stringSchema(),
        pinned: record(stringSchema(), stringSchema()),
      }).default({
        mockHash: "",
        replayDir: "",
        pinned: {},
      }),
    }),
  ]);
  return objectSchema({
    registeredName: stringSchema(),
    server: stringSchema(),
    nonce: stringSchema(),
    callLogPath: stringSchema(),
    tools: array(
      objectSchema({
        name: stringSchema(),
        description: stringSchema(),
        inputSchema: record(stringSchema(), unknown()),
      }),
    ),
    responders: record(stringSchema(), responder),
    agent: objectSchema({
      socketPath: stringSchema(),
      token: stringSchema(),
    }).nullable(),
  });
});
var MAX_FIXTURE_BYTES = 1048576;
export {
  EVAL_ABORTED_BY_MOCK,
  checkExpectGuards,
  relayAgentMockCall,
  substituteAgentInput,
  checkRepoAuthoredPath,
  MAX_FIXTURE_BYTES,
  MOCK_SPEC_SCHEMA,
  MOCK_RESPONDER_FAILED_TEXT,
  formatGuardValueJson,
  compileExpectGuards,
  formatGuardValue,
};
