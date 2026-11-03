/**
 * cli/handlers/pluginEval/mockGuards.ts
 *
 * 2.1.316 新增。claude plugin eval 的 mock 守卫：expect 正则/类型检查、仓库路径校验、代理输入替换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vzw8h259.js (26)
 * attribution: placement 26
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
  u,
  _enum,
  string,
  lazy,
  union,
  array,
  record,
  discriminatedUnion,
  literal,
  M,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-vzw8h259.js:754-764 placement
var MAX_GUARD_VALUE_CHARS = 120;
//@ chunk-vzw8h259.js:764-814 placement
function truncateGuardValue(e) {
  return e.length > MAX_GUARD_VALUE_CHARS ? `${truncateToLength(e, MAX_GUARD_VALUE_CHARS)}...` : e;
}
//@ chunk-vzw8h259.js:814-849 placement
/**
 * 把守卫值转成可展示文本：先按 120 字符截断，再 JSON 序列化并转义不可打印字符。
 */
function formatGuardValueJson(e) {
  return escapeNonPrintable(jsonStringify(truncateGuardValue(e)));
}
//@ chunk-vzw8h259.js:849-962 placement
/**
 * 把清单校验中的值格式化为可显示文本（过长时截断并转义）。
 */
function formatGuardValue(value) {
  if (typeof value === "string") return formatGuardValueJson(value);
  let t = jsonStringify(value) ?? String(value);
  return t.length <= MAX_GUARD_VALUE_CHARS
    ? escapeNonPrintable(t)
    : escapeNonPrintable(jsonStringify(truncateGuardValue(t)));
}
//@ chunk-vzw8h259.js:962-2507 placement
async function checkRepoAuthoredPath(e, t, r, i = []) {
  let resolved = path.resolve(e, t);
  let s = formatGuardValueJson(t);
  let anchors = [e, ...i];
  if (
    (isNetworkRelatedPath(t) && !isNetworkMountRoot(t)) ||
    (isNetworkRelatedPath(resolved) && !isNetworkMountRoot(resolved))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} is an automounter path (macOS /Network, or the bare /net root) \u2014 refusing it (a lookup there is a network request)`,
      "plugin eval: a repo-authored path is an automounter path \u2014 refusing it",
    );
  let c = isWslUncPath(resolved) || (isWslUncPath(t) && !isOnForeignMount(resolved, e));
  if (isOnForeignMount(t, e) && i.every((h) => isOnForeignMount(resolved, h)) && !c)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} is a network-reaching path (UNC / automount) \u2014 refusing it`,
      "plugin eval: a repo-authored path is network-reaching \u2014 refusing it",
    );
  let m;
  let intermediateUncJunction = await findIntermediateUncJunctionAsync(NodeFsOperations, resolved, {
    anchors,
    surfaceNetworkRaw: true,
    unreadableAncestry: "unverified",
    onOutcome: (h) => {
      if (h.kind === "resolved") m = h.path;
    },
  });
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} passes through a component that cannot be examined (unreadable, a link or junction whose target does not exist, or a symlink chain too long to follow) \u2014 refusing it (it could not be vetted)`,
      "plugin eval: a repo-authored path has an unexaminable component \u2014 refusing it",
    );
  if (intermediateUncJunction !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} passes through a symlink to a network-reaching path (or a dotted one that cannot be vetted) \u2014 refusing it`,
      "plugin eval: a repo-authored path links to a network-reaching path \u2014 refusing it",
    );
  if (m !== undefined && isNetworkMountRoot_2(m))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} leads to an automounter map directory (/net, /net/<host>; macOS /Network, /home) \u2014 refusing it (naming anything in it asks the automounter or a host)`,
      "plugin eval: a repo-authored path lands on an automounter map directory \u2014 refusing it",
    );
}
//@ chunk-vzw8h259.js:2527-2562 placement
var MAX_REGEX_EXPECT_LENGTH = 8192;
var MAX_EXPECT_REPEAT_BUDGET = 50000000;
var EXPECT_REGEX_FLAGS_PATTERN = /^[is]*$/;
//@ chunk-vzw8h259.js:2562-5316 placement
function compileExpectRegex(source) {
  let r = 0;
  let i = 1;
  let n = 0;
  let s = false;
  let a = false;
  let c = false;
  for (let idx = 0; idx < source.length; idx++) {
    let f = source[idx];
    if (f === "(" || f === ")" || f === "|")
      return {
        problem:
          'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
      };
    if (f === "^") {
      if (idx !== 0)
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      s = true;
      a = false;
      c = false;
      continue;
    }
    if (f === "$") {
      if (idx !== source.length - 1)
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      continue;
    }
    let b = null;
    if (f === "*")
      b = {
        lo: 0,
        hi: 1 / 0,
      };
    else if (f === "+")
      b = {
        lo: 1,
        hi: 1 / 0,
      };
    else if (f === "?") {
      if (c) {
        c = false;
        continue;
      }
      b = {
        lo: 0,
        hi: 1,
      };
    } else if (f === "{") {
      let match = /^\{(\d+)(?:,(\d*))?\}/.exec(source.slice(idx));
      if (match) {
        let w = Number(match[1]);
        let S = match[2] === undefined ? w : match[2] === "" ? 1 / 0 : Number(match[2]);
        if (S < w)
          return {
            problem: `quantifier ${match[0]} has max < min`,
          };
        b = {
          lo: w,
          hi: S,
        };
        idx += match[0].length - 1;
      }
    }
    if (b !== null) {
      if (!a)
        return {
          problem: "a quantifier must follow a single character, escape, or class",
        };
      n += (b.hi === 1 / 0 ? b.lo : b.hi) - 1;
      if (b.hi === 1 / 0) r++;
      else i *= b.hi - b.lo + 1;
      a = false;
      c = true;
      continue;
    }
    c = false;
    if (f === "\\") {
      let g = source[idx + 1];
      if (g === undefined)
        return {
          problem: "pattern ends with a lone backslash",
        };
      if (/[1-9]/.test(g) || g === "k")
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      a = g !== "b" && g !== "B";
      if (a) n++;
      idx++;
      continue;
    }
    if (f === "[") {
      idx++;
      while (idx < source.length && source[idx] !== "]") {
        if (source[idx] === "\\") idx++;
        idx++;
      }
      if (idx >= source.length)
        return {
          problem: "unterminated character class",
        };
      a = true;
      n++;
      continue;
    }
    a = true;
    n++;
  }
  if (i > MAX_EXPECT_REPEAT_BUDGET)
    return {
      problem: "too many optional/bounded repeats for an expect: guard",
    };
  let m = (l) => {
    let f = 1;
    for (let idx = 1; idx <= r; idx++) f = (f * (l + idx)) / idx;
    return (s ? 1 : Math.max(1, l)) * f * i * (l + n);
  };
  let y = 0;
  let h = MAX_REGEX_EXPECT_LENGTH;
  while (y < h) {
    let l = Math.ceil((y + h) / 2);
    if (m(l) <= MAX_EXPECT_REPEAT_BUDGET) y = l;
    else h = l - 1;
  }
  if (y < 16)
    return {
      problem:
        "this combination of repeats leaves no useful subject length under the matching budget \u2014 use fewer quantifiers",
    };
  return {
    maxSubject: y,
    problem: null,
  };
}
//@ chunk-vzw8h259.js:5316-5386 placement
var GUARD_SCALAR_TYPES = new Set(["string", "number", "bool", "boolean", "object", "array"]);
//@ chunk-vzw8h259.js:5386-5591 placement
function getByDottedPath(root, path) {
  let r = root;
  for (let i of path.split(".")) {
    if (r === null || typeof r !== "object") return;
    if (Array.isArray(r)) {
      if (!/^\d+$/.test(i)) return;
      r = r[Number(i)];
      continue;
    }
    r = Object.hasOwn(r, i) ? r[i] : undefined;
  }
  return r;
}
//@ chunk-vzw8h259.js:5591-5726 placement
/**
 * 按 expect 表逐个键（点分路径）检查输入：取出值后交给 checkExpectType，返回第一个违反描述，全部通过返回 null。
 */
function checkExpectGuards(input, expect, prefix = "") {
  for (let [key, value] of Object.entries(expect)) {
    let path = prefix ? `${prefix}.${key}` : key;
    let a = getByDottedPath(input, path);
    let c = checkExpectType(a, value, path, input);
    if (c !== null) return c;
  }
  return null;
}
//@ chunk-vzw8h259.js:5726-6442 placement
function checkExpectType(e, text, r, i) {
  if (Array.isArray(text))
    return text.some((s) => scalarEquals(e, s))
      ? null
      : `${r} = ${describeGuardValue(e)} is not one of [${text.join(", ")}]`;
  if (typeof text === "object" && text !== null) return checkExpectGuards(i, text, r);
  let regexLiteral = parseRegexLiteral(text);
  if (regexLiteral !== null) {
    let s = typeof e === "string" ? e : typeof e === "number" || typeof e === "boolean" ? String(e) : null;
    let a = compileExpectRegex(regexLiteral.source);
    if (!("maxSubject" in a)) return `${r}: ${text} is not a usable guard (${a.problem})`;
    let maxSubject = a.maxSubject;
    if (s !== null && s.length > maxSubject)
      return `${r} is ${s.length} characters, more than this /regex/ guard checks (${maxSubject})`;
    return s !== null && regexLiteral.test(s)
      ? null
      : `${r} = ${describeGuardValue(e)} does not match ${text}`;
  }
  if (GUARD_SCALAR_TYPES.has(text)) {
    let s = text === "boolean" ? "bool" : text;
    return guardTypeOf(e) === s ? null : `${r} = ${describeGuardValue(e)} is not a ${text}`;
  }
  return scalarEquals(e, text) ? null : `${r} = ${describeGuardValue(e)} is not "${text}"`;
}
//@ chunk-vzw8h259.js:6442-6569 placement
function scalarEquals(e, t) {
  if (typeof e === "string") return e === t;
  if (typeof e === "number" || typeof e === "boolean") return String(e) === t;
  return false;
}
//@ chunk-vzw8h259.js:6569-6674 placement
function parseRegexLiteral(text) {
  let match = /^\/(.+)\/([a-z]*)$/s.exec(text);
  if (!match) return null;
  return new RegExp(match[1] ?? "", match[2] ?? "");
}
//@ chunk-vzw8h259.js:6674-6816 placement
function guardTypeOf(e) {
  if (Array.isArray(e)) return "array";
  if (e === null || e === undefined) return "missing";
  if (typeof e === "boolean") return "bool";
  return typeof e;
}
//@ chunk-vzw8h259.js:6816-6911 placement
function describeGuardValue(e) {
  if (e === undefined) return "(missing)";
  let t = jsonStringify(e);
  return t.length > 80 ? `${truncateToLength(t, 77)}...` : t;
}
//@ chunk-vzw8h259.js:6911-6920 placement
var MAX_GUARDS_OR_LEAVES = 32;
//@ chunk-vzw8h259.js:6920-7921 placement
function compileExpectGuards(e, t = "") {
  let r = [];
  if (t === "") {
    let i = countLeafValues(e);
    if (i > MAX_GUARDS_OR_LEAVES) {
      r.push(
        `expect: ${i} guards is more than the ${MAX_GUARDS_OR_LEAVES} one responder may carry \u2014 every call checks each of them; keep the ones that catch a wrong call`,
      );
      return r;
    }
  }
  for (let [key, value] of Object.entries(e)) {
    let s = t ? `${t}.${key}` : key;
    if (Array.isArray(value)) {
      if (value.length === 0)
        r.push(
          `expect.${s}: an empty list of allowed values can never be satisfied \u2014 list at least one`,
        );
      continue;
    }
    if (typeof value === "object" && value !== null) {
      r.push(...compileExpectGuards(value, s));
      continue;
    }
    if (/^\/.*\/[a-z]*$/s.test(value))
      try {
        let regexLiteral = parseRegexLiteral(value);
        let c = regexLiteral ? compileExpectRegex(regexLiteral.source) : null;
        if (regexLiteral && !EXPECT_REGEX_FLAGS_PATTERN.test(regexLiteral.flags))
          r.push(`expect.${s}: ${value} \u2014 only the i and s flags are supported in expect: guards`);
        else if (c && c.problem !== null) r.push(`expect.${s}: ${value} \u2014 ${c.problem}`);
      } catch (error) {
        r.push(
          `expect.${s}: invalid regular expression ${value} (${error instanceof Error ? error.message : String(error)}) \u2014 a value written /like this/ is read as a regex; for a literal that starts and ends with a slash, write a one-element list: ["${value}"]`,
        );
      }
  }
  return r;
}
//@ chunk-vzw8h259.js:7921-7960 placement
var SAFE_FILE_NAME_SEGMENT_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;
//@ chunk-vzw8h259.js:7960-8956 placement
async function substituteAgentInput(e, root, baseDir, readFixture, n = Number.POSITIVE_INFINITY) {
  let s = null;
  let a = [];
  let c = 0;
  for (let y of e.matchAll(
    /\{\{\s*(input\.[A-Za-z0-9_.-]+|file:(?:[^{}]|\{input\.[A-Za-z0-9_.-]+\})+?)\s*\}\}/g,
  )) {
    a.push(e.slice(c, y.index));
    c = y.index + y[0].length;
    let h = y[1] ?? "";
    if (h.startsWith("input.")) {
      let g = getByDottedPath(root, h.slice(6));
      let w = g === undefined ? "" : typeof g === "string" ? g : jsonStringify(g);
      a.push(w.length > n ? `${truncateToLength(w, n)}\u2026 [${w.length - n} more characters omitted]` : w);
      continue;
    }
    let trimmed = h.slice(5).trim();
    let f = null;
    trimmed = trimmed.replace(/\{input\.([A-Za-z0-9_.-]+)\}/g, (g, path) => {
      let S = getByDottedPath(root, path);
      let F = S === undefined || S === null ? "" : String(S);
      if (!SAFE_FILE_NAME_SEGMENT_PATTERN.test(F))
        f = `{input.${path}} = ${describeGuardValue(S)} is not a plain file-name segment`;
      return F;
    });
    if (f !== null) {
      s ??= f;
      continue;
    }
    let resolved = path.resolve(baseDir, trimmed);
    if (!isPathInside(baseDir, resolved)) {
      s ??= `{{file:${trimmed}}} names a path outside the mock's directory`;
      continue;
    }
    a.push(
      readFixture(resolved).then((g) => {
        if (typeof g !== "string") {
          s ??= `{{file:${trimmed}}}: ${g.problem}`;
          return "";
        }
        return g;
      }),
    );
  }
  a.push(e.slice(c));
  let results = await Promise.all(a);
  if (s !== null)
    return {
      ok: false,
      reason: s,
    };
  return {
    ok: true,
    text: results.join(""),
  };
}
//@ chunk-vzw8h259.js:8956-9048 placement
function isPathInside(e, t) {
  let relativePath = path.relative(e, t);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}
//@ chunk-vzw8h259.js:9048-9181 placement
function countLeafValues(e) {
  let t = 0;
  for (let r of Object.values(e)) {
    t += typeof r === "object" && r !== null && !Array.isArray(r) ? countLeafValues(r) : 1;
    if (t > MAX_GUARDS_OR_LEAVES) break;
  }
  return t;
}
//@ chunk-vzw8h259.js:9221-9286 placement
/**
 * 插件评测的两条固定文案："eval aborted by mock" 与 "mock agent responder failed"（后者附 harness_unreachable 提示）。
 */
var EVAL_ABORTED_BY_MOCK = "eval aborted by mock";
var MOCK_RESPONDER_FAILED_TEXT = "mock agent responder failed";
//@ chunk-vzw8h259.js:9286-9400 placement
var RELAY_RESPONSE_SCHEMA = DoctorLazy(() =>
  u({
    verdict: _enum(["ok", "tool_error", "abort"]),
    text: string(),
    replay: _enum(["hit", "miss"]).optional(),
  }),
);
var MAX_RELAY_RESPONSE_BYTES = 4194304;
//@ chunk-vzw8h259.js:9400-9688 placement
/**
 * 把 agent 型 mock 调用通过 unix socket 交给评测宿主代理处理并解析回应；失败时写 stderr 并返回 abort（harness_unreachable）。
 */
async function relayAgentMockCall(agent, payload, signal) {
  try {
    let i = await requestOverSocketLine(
      agent.socketPath,
      `${jsonStringify({
        token: agent.token,
        ...payload,
      })}
`,
      signal,
    );
    return RELAY_RESPONSE_SCHEMA().parse(jsonParse(i));
  } catch (error) {
    process.stderr.write(`eval mock stand-in: agent relay failed: ${errorMessage(error)}
`);
    return {
      verdict: "abort",
      text: `${MOCK_RESPONDER_FAILED_TEXT} (harness_unreachable) \u2014 see the eval debug log`,
    };
  }
}
//@ chunk-vzw8h259.js:9688-10297 placement
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
    let a = Buffer.alloc(0);
    let c = false;
    let m = (h, l) => {
      if (c) return;
      c = true;
      signal.removeEventListener("abort", y);
      connection.destroy();
      if (h !== null) reject(h);
      else resolve(l ?? "");
    };
    let y = () => m(Error("aborted"));
    signal.addEventListener("abort", y, {
      once: true,
    });
    connection.once("connect", () => connection.write(line));
    connection.on("data", (h) => {
      a = Buffer.concat([a, h]);
      if (a.length > MAX_RELAY_RESPONSE_BYTES) {
        m(Error("relay response too large"));
        return;
      }
      let index = a.indexOf(10);
      if (index !== -1) m(null, a.subarray(0, index).toString("utf8"));
    });
    connection.once("error", (h) => m(h));
    connection.once("close", () => m(Error("harness closed the relay without answering")));
  });
}
//@ chunk-vzw8h259.js:10297-10847 placement
/**
 * 插件评测模拟服务器的配置结构：工具列表与响应器（固定响应或代理），以及读取上限。
 */
var MOCK_SPEC_SCHEMA = DoctorLazy(() => {
  let e = lazy(() => union([string(), array(string()), record(string(), e)]));
  let expect = record(string(), e).nullable();
  let r = discriminatedUnion("kind", [
    u({
      kind: literal("fixed"),
      body: string(),
      isError: M(),
      expect,
      baseDir: string(),
    }),
    u({
      kind: literal("agent"),
      prompt: string(),
      abortWhen: string().nullable(),
      expect,
      baseDir: string(),
      replay: u({
        mockHash: string(),
        replayDir: string(),
        pinned: record(string(), string()),
      }).default({
        mockHash: "",
        replayDir: "",
        pinned: {},
      }),
    }),
  ]);
  return u({
    registeredName: string(),
    server: string(),
    nonce: string(),
    callLogPath: string(),
    tools: array(
      u({
        name: string(),
        description: string(),
        inputSchema: record(string(), unknown()),
      }),
    ),
    responders: record(string(), r),
    agent: u({
      socketPath: string(),
      token: string(),
    }).nullable(),
  });
});
var MAX_FIXTURE_BYTES = 1048576;
export {
  MOCK_RESPONDER_FAILED_TEXT,
  checkRepoAuthoredPath,
  formatGuardValueJson,
  compileExpectGuards,
  formatGuardValue,
  EVAL_ABORTED_BY_MOCK,
  checkExpectGuards,
  substituteAgentInput,
  relayAgentMockCall,
  MAX_FIXTURE_BYTES,
  MOCK_SPEC_SCHEMA,
};
