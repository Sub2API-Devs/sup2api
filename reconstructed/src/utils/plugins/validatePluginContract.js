/**
 * utils/plugins/validatePluginContract.ts
 *
 * 2.1.316 新增：插件 contract 文件校验：自包含的轻量词法检查，禁止外部引用，提取名词与状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-85kmkm1x.js (32)
 * attribution: placement 32
 */
import { transpileHooksSource } from "../../plugins/functionHooks/moduleLoader.js";
import { errorMessage } from "../errors.js";
import { getFirstLine, Dr } from "../stringUtils.js";

//@ chunk-85kmkm1x.js:1344-1470 placement
function detectForbiddenComment(e) {
  let matches = /@ts-/i.test(e),
    matches_2 = /\u2500\u2500 from plugin |\/\/\s*Skipped:/.test(e);
  return matches ? "@ts-" : matches_2 ? "framing" : void 0;
}
//@ chunk-85kmkm1x.js:1470-1520 placement
var P = (e, n, ...s) => e?.kind === n && s.includes(e.text);
//@ chunk-85kmkm1x.js:1520-1611 placement
function He(e) {
  let n = P(e, "punct", "{", "(", "["),
    s = P(e, "punct", "}", ")", "]");
  return n ? 1 : s ? -1 : 0;
}
//@ chunk-85kmkm1x.js:1611-1651 placement
var B = (e, n, s) => ({ kind: e, text: n, line: s });
//@ chunk-85kmkm1x.js:1651-1864 placement
var lexBlockComment = (e, n, s) => {
  let index = e.indexOf("*/", n + 2),
    a = index !== -1,
    i = a ? index + 2 : e.length,
    sliced = e.slice(n, i),
    match = sliced.match(/\r\n|[\n\r\u2028\u2029]/g),
    m = s + (match?.length ?? 0),
    p = a ? detectForbiddenComment(sliced) : "/*",
    y = { end: i, line: m };
  return p ? { ...y, token: B("stray", p, s) } : y;
};
//@ chunk-85kmkm1x.js:1864-2092 placement
var lexLineComment = (e, n, s) => {
  let search = e.slice(n).search(/[\n\r\u2028\u2029]/),
    a = search === -1 ? e.length : n + search,
    trimmed = e.slice(n, a).trim(),
    l = detectForbiddenComment(trimmed),
    m = trimmed.startsWith("///") ? B("reference", trimmed, s) : l ? B("stray", l, s) : void 0;
  return m ? { end: a, line: s, token: m } : { end: a, line: s };
};
//@ chunk-85kmkm1x.js:2092-2346 placement
var lexStringLiteral = (e, n, s) => {
  let r = e[n] ?? "",
    a = "",
    i = n + 1;
  while (i < e.length) {
    let c = e[i] ?? "",
      m = c === "\\" && i + 1 < e.length;
    if (
      c === r ||
      c ===
        `
` ||
      c === "\r"
    )
      break;
    ((a += m ? (e[i + 1] ?? "") : c), (i += m ? 2 : 1));
  }
  return e[i] === r
    ? { end: i + 1, line: s, token: B("string", a, s) }
    : { end: i, line: s, token: B("stray", r, s) };
};
//@ chunk-85kmkm1x.js:2346-2472 placement
var lexWord = (e, n, s) => {
  let r = n + 1;
  while (r < e.length && /[\w$]/.test(e[r] ?? "")) r += 1;
  return { end: r, line: s, token: B("word", e.slice(n, r), s) };
};
//@ chunk-85kmkm1x.js:2472-2610 placement
function pickLexer(e, n) {
  let s = e[n] ?? "",
    sliced = e.slice(n, n + 2),
    a = { "//": lexLineComment, "/*": lexBlockComment },
    i = { "'": lexStringLiteral, '"': lexStringLiteral },
    matches = /[\w$]/.test(s);
  return a[sliced] ?? i[s] ?? (matches ? lexWord : void 0);
}
//@ chunk-85kmkm1x.js:2610-3316 placement
function tokenizeContractSource(e) {
  let n = [],
    s = [],
    r = 0,
    a = 0,
    i = 1,
    l = !1,
    c = 1;
  while (a < e.length) {
    let m = e[a] ?? "",
      p =
        m ===
          `
` ||
        m === "\u2028" ||
        m === "\u2029" ||
        (m === "\r" &&
          e[a + 1] !==
            `
`);
    if (l) {
      let T = m === "\\",
        w = m === "$" && e[a + 1] === "{",
        R = m === "`";
      if (w) s.push(r);
      ((l = !w && !R), (i += p ? 1 : 0), (a += T || w ? 2 : 1));
      continue;
    }
    let y = pickLexer(e, a),
      h = m === "`",
      v = m === "}" && s.length > 0 && r === s.at(-1),
      matches = /[\t\n\v\f\r \u2028\u2029]/.test(m),
      C = m === "/" || m === "\\",
      S = /[!-~]/.test(m) && !C,
      x = !matches && !S,
      f = C ? m : "other";
    if (y) {
      let T = y(e, a, i);
      if (T.token) n.push(T.token);
      ((a = T.end), (i = T.line));
      continue;
    }
    if (h) (n.push(B("string", "`", i)), (c = i));
    if (x) n.push(B("stray", f, i));
    if (v) s.pop();
    if (!h && !v && !x && !matches) (n.push(B("punct", m, i)), (r += m === "{" ? 1 : m === "}" ? -1 : 0));
    ((l = h || v), (i += p ? 1 : 0), (a += 1));
  }
  if (l || s.length > 0) n.push(B("stray", "`", c));
  return n;
}
//@ chunk-85kmkm1x.js:3316-3351 placement
var le = (e, n) => [e[n], e[n + 1], e[n + 2]];
/**
 * global/嵌套 module/as namespace 等不允许的声明形式。
 */
//@ chunk-85kmkm1x.js:3351-3950 placement
function describeForbiddenAugmentation(e, n) {
  let [s, r, a] = le(e, n),
    i = P(s, "word", "global") && P(r, "punct", "{"),
    l = P(s, "word", "module", "namespace") && r?.kind === "string",
    c = P(s, "word", "as") && P(r, "word", "namespace"),
    m = P(s, "word", "interface") && r?.kind === "word" && r.line !== s?.line,
    p = P(s, "word", "interface") && P(r, "word", "EngineInterface") && !P(a, "punct", "{");
  return i
    ? "`global { \u2026 }` augments the global scope"
    : l
      ? `a nested \`module '${r.text}'\` augments another module`
      : c
        ? "`as namespace` declares a global"
        : m
          ? "`interface` without its name on the same line"
          : p
            ? "`EngineInterface` takes members only, no `extends` or type parameters"
            : void 0;
}
//@ chunk-85kmkm1x.js:3950-4209 placement
function findForbiddenAugmentations(e) {
  let n = [],
    s = 0;
  for (let [r, a] of e.entries()) {
    let l =
      s === 0 && P(e[r - 1], "word", "declare") && P(a, "word", "module")
        ? void 0
        : describeForbiddenAugmentation(e, r);
    if (((s += He(a)), l !== void 0))
      n.push(`line ${a.line}: ${l}; the contract may only augment 'claude-code', at its top level`);
  }
  return n;
}
//@ chunk-85kmkm1x.js:4209-4373 placement
function isInterfaceOpening(e, n, s) {
  let [r, a, i] = le(e, n);
  return (
    r?.kind === "word" &&
    r.text === "interface" &&
    a?.kind === "word" &&
    a.text === s &&
    a.line === r.line &&
    i?.kind === "punct" &&
    i.text === "{"
  );
}
//@ chunk-85kmkm1x.js:4373-4556 placement
function findMatchingBrace(e, n) {
  let s = 0;
  for (let r = n; r < e.length; r += 1) {
    let a = e[r];
    if (!(a?.kind === "punct" && (a.text === "{" || a.text === "}"))) continue;
    if (((s += a.text === "{" ? 1 : -1), s === 0)) return r;
  }
  return e.length;
}
/**
 * 块内顶层成员名。
 */
//@ chunk-85kmkm1x.js:4556-4961 placement
function listMemberNames(e, n) {
  let s = [],
    r = findMatchingBrace(e, n),
    a = (c, ...m) => e[c]?.kind === "punct" && m.includes(e[c].text),
    i = 0,
    l = !0;
  for (let c = n + 1; c < r; c += 1) {
    let m = a(c, "{", "(", "["),
      p = a(c, "}", ")", "]"),
      y = i === 0 && a(c, ";", ","),
      h = (e[c - 1]?.line ?? 0) < (e[c]?.line ?? 0),
      b = e[c]?.text === "readonly" && e[c + 1]?.kind !== "punct" ? c + 1 : c,
      C = e[b],
      S = i === 0 && (l || h) && C !== void 0 && C.kind !== "punct" && a(b + 1, ":", "?", "(", "<");
    if (((i += m ? 1 : p ? -1 : 0), (l = y), S)) s.push(C.text);
  }
  return s;
}
//@ chunk-85kmkm1x.js:4961-5133 placement
function collectEngineNouns(e, n) {
  let s = new Set();
  for (let { start: start, end: end } of n)
    for (let i = start; i < end; i += 1) {
      if (!isInterfaceOpening(e, i, "EngineInterface")) continue;
      let l = i + 2;
      for (let c of listMemberNames(e, l)) s.add(c);
    }
  return [...s];
}
/**
 * 契约中像汇总框架或编译指令的行。
 */
//@ chunk-85kmkm1x.js:5133-5436 placement
var findFramingLines = (e) =>
  e
    .split(/\r\n|[\n\r\u2028\u2029]/)
    .flatMap((n, s) =>
      /^\s*(?:\*\s*)?\/\/\s*(?:\u2500\u2500 from plugin |Skipped:)/.test(n) ||
      /^\s*(?:\/\/\/?|\/?\*)\s*@ts-/i.test(n)
        ? [
            `line ${s + 1}: a line that would read as the roll-up's framing or a compiler pragma once copied; a contract carries neither`,
          ]
        : [],
    );
//@ chunk-85kmkm1x.js:5436-6108 placement
function outsideReferenceProblems(e) {
  let n = [],
    s =
      "reaches outside the file; the contract must be self-contained (no " +
      "import, export \u2026 from, require or reference)",
    r = 0;
  for (let [a, i] of e.entries()) {
    let l = e[a + 1],
      c = e[a + 2],
      m = (f) => i.kind === "word" && i.text === f,
      p = l?.kind === "punct" && l.text === "(" && c?.kind === "string",
      y =
        l?.kind === "string" ||
        l?.kind === "word" ||
        (l?.kind === "punct" && (l.text === "{" || l.text === "*")) ||
        p,
      h = i.line !== r,
      v = i.kind === "reference",
      b = m("import") && y,
      C = m("from") && h && l?.kind === "string",
      S = m("require") && h && p,
      x = v
        ? "a triple-slash reference"
        : b
          ? "`import`"
          : C
            ? `\`from '${l.text}'\``
            : S
              ? `\`require('${c.text}')\``
              : void 0;
    if (x === void 0) continue;
    ((r = i.line), n.push(`line ${i.line}: ${x} ${s}`));
  }
  return n;
}
//@ chunk-85kmkm1x.js:6108-6183 placement
var Xe = /[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\u2028\u2029]/u;
//@ chunk-85kmkm1x.js:6183-6381 placement
var findInvisibleCharLines = (e) =>
  e
    .split(
      `
`,
    )
    .flatMap((n, s) =>
      Xe.test(n.replace(/[\t\r]/g, ""))
        ? [
            `line ${s + 1}: an invisible or reordering character (control, bidi, zero-width, line separator); a contract holds none`,
          ]
        : [],
    );
//@ chunk-85kmkm1x.js:6381-6486 placement
function checkParsesAsTypeScript(e) {
  try {
    transpileHooksSource("contract.d.ts", e);
    return;
  } catch (error) {
    return `does not parse as TypeScript: ${errorMessage(error)}`;
  }
}
/**
 * PluginState 中各插件声明的状态键。
 */
//@ chunk-85kmkm1x.js:6486-7022 placement
function collectPluginStateKeys(e, n) {
  let s = new Map(),
    r = (a, i) => e[a]?.kind === "punct" && e[a].text === i;
  for (let { start: start, end: end } of n)
    for (let l = start; l < end; l += 1) {
      if (!isInterfaceOpening(e, l, "PluginState")) continue;
      let c = l + 2,
        m = findMatchingBrace(e, c),
        p = new Set(listMemberNames(e, c)),
        y = 0;
      for (let h = c + 1; h < m; h += 1) {
        let v = e[h];
        if (
          y === 0 &&
          v !== void 0 &&
          v.kind !== "punct" &&
          p.has(v.text) &&
          r(h + 1, ":") &&
          r(h + 2, "{")
        ) {
          let x = s.get(v.text) ?? new Set();
          for (let f of listMemberNames(e, h + 2)) x.add(f);
          s.set(v.text, x);
        }
        let C = r(h, "{") || r(h, "(") || r(h, "["),
          S = r(h, "}") || r(h, ")") || r(h, "]");
        y += Number(C) - Number(S);
      }
    }
  return [...s].map(([a, i]) => ({ plugin: a, keys: [...i] }));
}
//@ chunk-85kmkm1x.js:7022-7218 placement
function findRunnableCode(e) {
  let trimmed = transpileHooksSource("contract.ts", e)
      .replace(/^\s*export\s*\{\s*\};?\s*$/m, "")
      .trim(),
    s = getFirstLine(trimmed);
  return trimmed === ""
    ? []
    : [`the contract holds code that would run (\`${s}\`); a contract is types only`];
}
/**
 * class/const/function 等运行时声明。
 */
//@ chunk-85kmkm1x.js:7218-7585 placement
var findRuntimeDeclarations = (e) =>
  e.flatMap((n, s) => {
    let r = e[s - 1],
      a = P(n, "word", "class", "const", "enum", "function", "let", "var"),
      i =
        r === void 0 ||
        r.line < n.line ||
        P(r, "punct", ";", "{", "}") ||
        P(r, "word", "abstract", "async", "declare", "default", "export"),
      l = P(e[s + 1], "punct", ":", "?", "(", "<");
    return a && i && !l
      ? [`line ${n.line}: \`${n.text}\` declares something that runs; a contract holds types only`]
      : [];
  });
/**
 * 词法异常记号的说明。
 */
//@ chunk-85kmkm1x.js:7585-8056 placement
var STRAY_TOKEN_DESCRIPTIONS = {
  "/": "a `/` outside a comment or string (a regular expression or arithmetic)",
  "\\": "a `\\` outside a string",
  "`": "a template literal that never closes",
  "'": "a string that never closes on its line",
  '"': "a string that never closes on its line",
  "/*": "a comment that never closes",
  "@ts-": "a `@ts-` compiler pragma in a comment",
  framing: "a comment that imitates the roll-up's banner or trailer",
  other: "a character outside plain ASCII (or a control character) in code",
};
//@ chunk-85kmkm1x.js:8056-8245 placement
var describeStrayTokens = (e) =>
  e
    .filter((n) => n.kind === "stray")
    .map(
      (n) =>
        `line ${n.line}: ` +
        (STRAY_TOKEN_DESCRIPTIONS[n.text] ?? `\`${n.text}\``) +
        ": a type contract never holds one, so the check refuses it rather than read past it",
    );
//@ chunk-85kmkm1x.js:8245-8266 placement
var CLAUDE_CODE = "claude-code";
/**
 * 契约顶层语句的问题（错误的 module、declare、export 等）。
 */
//@ chunk-85kmkm1x.js:8266-9192 placement
function describeTopLevelProblem(e, n) {
  let [s, r, a] = le(e, n),
    [, , i] = le(e, n + 1),
    l =
      P(s, "word", "declare") &&
      P(r, "word", "module") &&
      a?.kind === "string" &&
      s?.line === r?.line &&
      r?.line === a.line &&
      P(i, "punct", "{"),
    c = l && a.text !== CLAUDE_CODE,
    m = P(s, "word", "declare") && !l,
    p = P(s, "word", "export") && !P(r, "word", "type", "interface"),
    y = P(s, "word", "abstract", "async", "default", "module", "namespace"),
    h = P(s, "word", "type", "interface") && !P(e[n - 1], "word", "export", "import");
  return c
    ? `augments module '${a.text}'; the contract may only augment '${CLAUDE_CODE}'`
    : m
      ? `\`declare\` at the top level opens only \`declare module '${CLAUDE_CODE}' { \u2026 }\`, its three words on one line`
      : p
        ? "`export` at the top level is followed by `type` or `interface`: a contract exports types and nothing else"
        : y
          ? `\`${s?.text}\` at the top level: a contract holds type exports and \`declare module '${CLAUDE_CODE}'\` blocks only`
          : h
            ? `a top-level \`${s?.text}\` without \`export\` would be global in a dependent's program; export it`
            : void 0;
}
/**
 * 扫描顶层语句，返回问题与 declare module 块范围。
 */
//@ chunk-85kmkm1x.js:9192-9722 placement
function scanTopLevel(e) {
  let n = [],
    s = [],
    r = 0,
    a = 0;
  while (a < e.length) {
    let [i, l, c] = le(e, a),
      p = r === 0 && i?.kind === "word" ? describeTopLevelProblem(e, a) : void 0,
      y = p === void 0 || p.startsWith("augments"),
      h = r === 0 && y && P(i, "word", "declare") && P(l, "word", "module") && c?.kind === "string",
      v = a + 2;
    if (((r += He(i)), p !== void 0)) n.push(`line ${i?.line}: ${p}`);
    if (!h) {
      a += 1;
      continue;
    }
    let b = findMatchingBrace(e, v + 1);
    if (b === e.length)
      n.push(
        `line ${i?.line}: \`declare module\` never closes: the text does not lex as a type contract, so the check refuses it`,
      );
    (s.push({ start: v + 2, end: b }), (a = b + 1));
  }
  return { problems: n, blocks: s };
}
/**
 * 校验插件 contract 文件（2.1.316 新增）：自包含的轻量词法检查，禁止 import/require/外部引用，提取声明的名词与状态。
 */
//@ chunk-85kmkm1x.js:9722-9995 placement
function validatePluginContract(e) {
  let n = checkParsesAsTypeScript(e);
  if (n !== void 0) return { problems: [n], nouns: [], state: [] };
  let s = tokenizeContractSource(e),
    filtered = s.filter((l) => l.kind !== "reference"),
    { problems: problems, blocks: blocks } = scanTopLevel(filtered);
  return {
    problems: [
      ...findInvisibleCharLines(e),
      ...describeStrayTokens(s),
      ...findFramingLines(e),
      ...outsideReferenceProblems(s),
      ...problems,
      ...findRuntimeDeclarations(filtered),
      ...findRunnableCode(e),
      ...findForbiddenAugmentations(filtered),
    ],
    nouns: collectEngineNouns(filtered, blocks),
    state: collectPluginStateKeys(filtered, blocks),
  };
}
//@ chunk-85kmkm1x.js:10059-10112 placement
var ue = (...e) => ({ kind: "refused", problems: e.map(Dr) });

export { ue, validatePluginContract };
