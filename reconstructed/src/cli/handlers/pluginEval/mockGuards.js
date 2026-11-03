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
import path, { default as path_2, default as path_3 } from "path";
import { createConnection } from "net";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { escapeNonPrintable } from "../../../utils/resultError.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { Qg, yl, isWslUncPath, isOnForeignMount, isNetworkMountRoot } from "../../../utils/networkPaths.js";
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
import { u, U, o, aA, Ue, A, pe, Ir, T, M, oe } from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-vzw8h259.js:754-764 placement
var R = 120;
//@ chunk-vzw8h259.js:764-814 placement
function B(e) {
  return e.length > R ? `${truncateToLength(e, R)}...` : e;
}
//@ chunk-vzw8h259.js:814-849 placement
function Rm(e) {
  return escapeNonPrintable(jsonStringify(B(e)));
}
/**
 * 把清单校验中的值格式化为可显示文本（过长时截断并转义）。
 */
//@ chunk-vzw8h259.js:849-962 placement
function formatGuardValue(value) {
  if (typeof value === "string") return Rm(value);
  let t = jsonStringify(value) ?? String(value);
  return t.length <= R ? escapeNonPrintable(t) : escapeNonPrintable(jsonStringify(B(t)));
}
//@ chunk-vzw8h259.js:962-2507 placement
async function checkRepoAuthoredPath(e, t, r, i = []) {
  let resolved = path_2.resolve(e, t),
    s = Rm(t),
    a = [e, ...i];
  if ((Qg(t) && !yl(t)) || (Qg(resolved) && !yl(resolved)))
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
  let m,
    y = await findIntermediateUncJunctionAsync(NodeFsOperations, resolved, {
      anchors: a,
      surfaceNetworkRaw: !0,
      unreadableAncestry: "unverified",
      onOutcome: (h) => {
        if (h.kind === "resolved") m = h.path;
      },
    });
  if (y === UNVERIFIED_ANCESTRY)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} passes through a component that cannot be examined (unreadable, a link or junction whose target does not exist, or a symlink chain too long to follow) \u2014 refusing it (it could not be vetted)`,
      "plugin eval: a repo-authored path has an unexaminable component \u2014 refusing it",
    );
  if (y !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} passes through a symlink to a network-reaching path (or a dotted one that cannot be vetted) \u2014 refusing it`,
      "plugin eval: a repo-authored path links to a network-reaching path \u2014 refusing it",
    );
  if (m !== void 0 && isNetworkMountRoot(m))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: ${s} leads to an automounter map directory (/net, /net/<host>; macOS /Network, /home) \u2014 refusing it (naming anything in it asks the automounter or a host)`,
      "plugin eval: a repo-authored path lands on an automounter map directory \u2014 refusing it",
    );
}
//@ chunk-vzw8h259.js:2527-2562 placement
var Q = 8192,
  H = 50000000,
  ee = /^[is]*$/;
//@ chunk-vzw8h259.js:2562-5316 placement
function compileExpectRegex(e) {
  let r = 0,
    i = 1,
    n = 0,
    s = !1,
    a = !1,
    c = !1;
  for (let l = 0; l < e.length; l++) {
    let f = e[l];
    if (f === "(" || f === ")" || f === "|")
      return {
        problem:
          'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
      };
    if (f === "^") {
      if (l !== 0)
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      ((s = !0), (a = !1), (c = !1));
      continue;
    }
    if (f === "$") {
      if (l !== e.length - 1)
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      continue;
    }
    let b = null;
    if (f === "*") b = { lo: 0, hi: 1 / 0 };
    else if (f === "+") b = { lo: 1, hi: 1 / 0 };
    else if (f === "?") {
      if (c) {
        c = !1;
        continue;
      }
      b = { lo: 0, hi: 1 };
    } else if (f === "{") {
      let match = /^\{(\d+)(?:,(\d*))?\}/.exec(e.slice(l));
      if (match) {
        let w = Number(match[1]),
          S = match[2] === void 0 ? w : match[2] === "" ? 1 / 0 : Number(match[2]);
        if (S < w) return { problem: `quantifier ${match[0]} has max < min` };
        ((b = { lo: w, hi: S }), (l += match[0].length - 1));
      }
    }
    if (b !== null) {
      if (!a) return { problem: "a quantifier must follow a single character, escape, or class" };
      if (((n += (b.hi === 1 / 0 ? b.lo : b.hi) - 1), b.hi === 1 / 0)) r++;
      else i *= b.hi - b.lo + 1;
      ((a = !1), (c = !0));
      continue;
    }
    if (((c = !1), f === "\\")) {
      let g = e[l + 1];
      if (g === void 0) return { problem: "pattern ends with a lone backslash" };
      if (/[1-9]/.test(g) || g === "k")
        return {
          problem:
            'expect: /regex/ guards use a small dialect \u2014 literals, ".", escapes, character classes, and quantifiers (* + ? {m,n}) on single atoms, with optional ^ and $; no groups "(\u2026)", alternation "|", backreferences, or lookaround. Use a list of literals, a type name, or several simpler guards instead',
        };
      if (((a = g !== "b" && g !== "B"), a)) n++;
      l++;
      continue;
    }
    if (f === "[") {
      l++;
      while (l < e.length && e[l] !== "]") {
        if (e[l] === "\\") l++;
        l++;
      }
      if (l >= e.length) return { problem: "unterminated character class" };
      ((a = !0), n++);
      continue;
    }
    ((a = !0), n++);
  }
  if (i > H) return { problem: "too many optional/bounded repeats for an expect: guard" };
  let m = (l) => {
      let f = 1;
      for (let b = 1; b <= r; b++) f = (f * (l + b)) / b;
      return (s ? 1 : Math.max(1, l)) * f * i * (l + n);
    },
    y = 0,
    h = Q;
  while (y < h) {
    let ceil = Math.ceil((y + h) / 2);
    if (m(ceil) <= H) y = ceil;
    else h = ceil - 1;
  }
  if (y < 16)
    return {
      problem:
        "this combination of repeats leaves no useful subject length under the matching budget \u2014 use fewer quantifiers",
    };
  return { maxSubject: y, problem: null };
}
//@ chunk-vzw8h259.js:5316-5386 placement
var re = new Set(["string", "number", "bool", "boolean", "object", "array"]);
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
    r = Object.hasOwn(r, i) ? r[i] : void 0;
  }
  return r;
}
/**
 * 按 expect 表逐个键（点分路径）检查输入：取出值后交给 checkExpectType，返回第一个违反描述，全部通过返回 null。
 */
//@ chunk-vzw8h259.js:5591-5726 placement
function checkExpectGuards(input, expect, prefix = "") {
  for (let [i, n] of Object.entries(expect)) {
    let s = prefix ? `${prefix}.${i}` : i,
      a = getByDottedPath(input, s),
      c = checkExpectType(a, n, s, input);
    if (c !== null) return c;
  }
  return null;
}
//@ chunk-vzw8h259.js:5726-6442 placement
function checkExpectType(e, t, r, i) {
  if (Array.isArray(t))
    return t.some((s) => scalarEquals(e, s)) ? null : `${r} = ${E(e)} is not one of [${t.join(", ")}]`;
  if (typeof t === "object" && t !== null) return checkExpectGuards(i, t, r);
  let n = parseRegexLiteral(t);
  if (n !== null) {
    let s = typeof e === "string" ? e : typeof e === "number" || typeof e === "boolean" ? String(e) : null,
      a = compileExpectRegex(n.source);
    if (!("maxSubject" in a)) return `${r}: ${t} is not a usable guard (${a.problem})`;
    let maxSubject = a.maxSubject;
    if (s !== null && s.length > maxSubject)
      return `${r} is ${s.length} characters, more than this /regex/ guard checks (${maxSubject})`;
    return s !== null && n.test(s) ? null : `${r} = ${E(e)} does not match ${t}`;
  }
  if (re.has(t)) {
    let s = t === "boolean" ? "bool" : t;
    return guardTypeOf(e) === s ? null : `${r} = ${E(e)} is not a ${t}`;
  }
  return scalarEquals(e, t) ? null : `${r} = ${E(e)} is not "${t}"`;
}
//@ chunk-vzw8h259.js:6442-6569 placement
function scalarEquals(e, t) {
  if (typeof e === "string") return e === t;
  if (typeof e === "number" || typeof e === "boolean") return String(e) === t;
  return !1;
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
  if (e === null || e === void 0) return "missing";
  if (typeof e === "boolean") return "bool";
  return typeof e;
}
//@ chunk-vzw8h259.js:6816-6911 placement
function E(e) {
  if (e === void 0) return "(missing)";
  let t = jsonStringify(e);
  return t.length > 80 ? `${truncateToLength(t, 77)}...` : t;
}
//@ chunk-vzw8h259.js:6911-6920 placement
var O = 32;
//@ chunk-vzw8h259.js:6920-7921 placement
function compileExpectGuards(e, t = "") {
  let r = [];
  if (t === "") {
    let i = countLeafValues(e);
    if (i > O)
      return (
        r.push(
          `expect: ${i} guards is more than the ${O} one responder may carry \u2014 every call checks each of them; keep the ones that catch a wrong call`,
        ),
        r
      );
  }
  for (let [i, n] of Object.entries(e)) {
    let s = t ? `${t}.${i}` : i;
    if (Array.isArray(n)) {
      if (n.length === 0)
        r.push(
          `expect.${s}: an empty list of allowed values can never be satisfied \u2014 list at least one`,
        );
      continue;
    }
    if (typeof n === "object" && n !== null) {
      r.push(...compileExpectGuards(n, s));
      continue;
    }
    if (/^\/.*\/[a-z]*$/s.test(n))
      try {
        let a = parseRegexLiteral(n),
          c = a ? compileExpectRegex(a.source) : null;
        if (a && !ee.test(a.flags))
          r.push(`expect.${s}: ${n} \u2014 only the i and s flags are supported in expect: guards`);
        else if (c && c.problem !== null) r.push(`expect.${s}: ${n} \u2014 ${c.problem}`);
      } catch (error) {
        r.push(
          `expect.${s}: invalid regular expression ${n} (${error instanceof Error ? error.message : String(error)}) \u2014 a value written /like this/ is read as a regex; for a literal that starts and ends with a slash, write a one-element list: ["${n}"]`,
        );
      }
  }
  return r;
}
//@ chunk-vzw8h259.js:7921-7960 placement
var ae = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;
//@ chunk-vzw8h259.js:7960-8956 placement
async function substituteAgentInput(e, t, r, i, n = Number.POSITIVE_INFINITY) {
  let s = null,
    a = [],
    c = 0;
  for (let y of e.matchAll(
    /\{\{\s*(input\.[A-Za-z0-9_.-]+|file:(?:[^{}]|\{input\.[A-Za-z0-9_.-]+\})+?)\s*\}\}/g,
  )) {
    (a.push(e.slice(c, y.index)), (c = y.index + y[0].length));
    let h = y[1] ?? "";
    if (h.startsWith("input.")) {
      let g = getByDottedPath(t, h.slice(6)),
        w = g === void 0 ? "" : typeof g === "string" ? g : jsonStringify(g);
      a.push(w.length > n ? `${truncateToLength(w, n)}\u2026 [${w.length - n} more characters omitted]` : w);
      continue;
    }
    let trimmed = h.slice(5).trim(),
      f = null;
    if (
      ((trimmed = trimmed.replace(/\{input\.([A-Za-z0-9_.-]+)\}/g, (g, w) => {
        let S = getByDottedPath(t, w),
          F = S === void 0 || S === null ? "" : String(S);
        if (!ae.test(F)) f = `{input.${w}} = ${E(S)} is not a plain file-name segment`;
        return F;
      })),
      f !== null)
    ) {
      s ??= f;
      continue;
    }
    let resolved = path_3.resolve(r, trimmed);
    if (!le(r, resolved)) {
      s ??= `{{file:${trimmed}}} names a path outside the mock's directory`;
      continue;
    }
    a.push(
      i(resolved).then((g) => {
        if (typeof g !== "string") return ((s ??= `{{file:${trimmed}}}: ${g.problem}`), "");
        return g;
      }),
    );
  }
  a.push(e.slice(c));
  let results = await Promise.all(a);
  if (s !== null) return { ok: !1, reason: s };
  return { ok: !0, text: results.join("") };
}
//@ chunk-vzw8h259.js:8956-9048 placement
function le(e, t) {
  let relativePath = path_3.relative(e, t);
  return relativePath !== "" && !relativePath.startsWith("..") && !path_3.isAbsolute(relativePath);
}
//@ chunk-vzw8h259.js:9048-9181 placement
function countLeafValues(e) {
  let t = 0;
  for (let r of Object.values(e))
    if (((t += typeof r === "object" && r !== null && !Array.isArray(r) ? countLeafValues(r) : 1), t > O))
      break;
  return t;
}
//@ chunk-vzw8h259.js:9221-9286 placement
var Brn = "eval aborted by mock",
  iLe = "mock agent responder failed";
//@ chunk-vzw8h259.js:9286-9400 placement
var RELAY_RESPONSE_SCHEMA = DoctorLazy(() =>
    u({ verdict: U(["ok", "tool_error", "abort"]), text: o(), replay: U(["hit", "miss"]).optional() }),
  ),
  MAX_RELAY_RESPONSE_BYTES = 4194304;
/**
 * 把 agent 型 mock 调用通过 unix socket 交给评测宿主代理处理并解析回应；失败时写 stderr 并返回 abort（harness_unreachable）。
 */
//@ chunk-vzw8h259.js:9400-9688 placement
async function relayAgentMockCall(agent, payload, signal) {
  try {
    let i = await requestOverSocketLine(
      agent.socketPath,
      `${jsonStringify({ token: agent.token, ...payload })}
`,
      signal,
    );
    return RELAY_RESPONSE_SCHEMA().parse(jsonParse(i));
  } catch (error) {
    return (
      process.stderr.write(`eval mock stand-in: agent relay failed: ${errorMessage(error)}
`),
      { verdict: "abort", text: `${iLe} (harness_unreachable) \u2014 see the eval debug log` }
    );
  }
}
/**
 * 连接 unix socket，写一行请求，读到第一个换行为止返回字符串；支持中止、响应超过 MAX_RELAY_RESPONSE_BYTES 时报错、对端关闭未回应时报错。
 */
//@ chunk-vzw8h259.js:9688-10297 placement
function requestOverSocketLine(socketPath, line, signal) {
  return new Promise((i, n) => {
    if (signal.aborted) {
      n(Error("aborted"));
      return;
    }
    let s = createConnection({ path: socketPath }),
      alloc = Buffer.alloc(0),
      c = !1,
      m = (h, l) => {
        if (c) return;
        if (((c = !0), signal.removeEventListener("abort", y), s.destroy(), h !== null)) n(h);
        else i(l ?? "");
      },
      y = () => m(Error("aborted"));
    (signal.addEventListener("abort", y, { once: !0 }),
      s.once("connect", () => s.write(line)),
      s.on("data", (h) => {
        if (((alloc = Buffer.concat([alloc, h])), alloc.length > MAX_RELAY_RESPONSE_BYTES)) {
          m(Error("relay response too large"));
          return;
        }
        let index = alloc.indexOf(10);
        if (index !== -1) m(null, alloc.subarray(0, index).toString("utf8"));
      }),
      s.once("error", (h) => m(h)),
      s.once("close", () => m(Error("harness closed the relay without answering"))));
  });
}
/**
 * 插件评测模拟服务器的配置结构：工具列表与响应器（固定响应或代理），以及读取上限。
 */
//@ chunk-vzw8h259.js:10297-10847 placement
var MOCK_SPEC_SCHEMA = DoctorLazy(() => {
    let e = aA(() => Ue([o(), A(o()), pe(o(), e)])),
      nullable = pe(o(), e).nullable(),
      r = Ir("kind", [
        u({ kind: T("fixed"), body: o(), isError: M(), expect: nullable, baseDir: o() }),
        u({
          kind: T("agent"),
          prompt: o(),
          abortWhen: o().nullable(),
          expect: nullable,
          baseDir: o(),
          replay: u({ mockHash: o(), replayDir: o(), pinned: pe(o(), o()) }).default({
            mockHash: "",
            replayDir: "",
            pinned: {},
          }),
        }),
      ]);
    return u({
      registeredName: o(),
      server: o(),
      nonce: o(),
      callLogPath: o(),
      tools: A(u({ name: o(), description: o(), inputSchema: pe(o(), oe()) })),
      responders: pe(o(), r),
      agent: u({ socketPath: o(), token: o() }).nullable(),
    });
  }),
  MAX_FIXTURE_BYTES = 1048576;

export {
  iLe,
  checkRepoAuthoredPath,
  Rm,
  compileExpectGuards,
  formatGuardValue,
  Brn,
  checkExpectGuards,
  substituteAgentInput,
  relayAgentMockCall,
  MAX_FIXTURE_BYTES,
  MOCK_SPEC_SCHEMA,
};
