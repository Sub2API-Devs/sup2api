/**
 * utils/plugins/validatePluginContract.ts
 *
 * 2.1.316 新增：插件 contract 文件校验：自包含的轻量词法检查，禁止外部引用，提取名词与状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bfqsgtvj.js (32)
 * attribution: placement 32
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { transpileHooksSource } from "../../plugins/functionHooks/moduleLoader.js";
import { errorMessage } from "../errors.js";
import { getFirstLine, collapseWhitespace } from "../stringUtils.js";

//@ chunk-bfqsgtvj.js:1417-1543 placement
function detectForbiddenComment(source) {
  let matches = /@ts-/i.test(source);
  let matches_2 = /\u2500\u2500 from plugin |\/\/\s*Skipped:/.test(source);
  return matches ? "@ts-" : matches_2 ? "framing" : undefined;
}
//@ chunk-bfqsgtvj.js:1543-1593 placement
var isPunctToken = (token, kind, ...texts) => token?.kind === kind && texts.includes(token.text);
//@ chunk-bfqsgtvj.js:1593-1684 placement
function bracketDelta(token) {
  let opens = isPunctToken(token, "punct", "{", "(", "[");
  let closes = isPunctToken(token, "punct", "}", ")", "]");
  return opens ? 1 : closes ? -1 : 0;
}
//@ chunk-bfqsgtvj.js:1684-1724 placement
var makeToken = (kind, text, line) => ({
  kind,
  text,
  line,
});
//@ chunk-bfqsgtvj.js:1724-1937 placement
var lexBlockComment = (source, start, line) => {
  let index = source.indexOf("*/", start + 2);
  let closed = index !== -1;
  let end = closed ? index + 2 : source.length;
  let source_2 = source.slice(start, end);
  let match = source_2.match(/\r\n|[\n\r\u2028\u2029]/g);
  let line_2 = line + (match?.length ?? 0);
  let forbidden = closed ? detectForbiddenComment(source_2) : "/*";
  let result = {
    end,
    line: line_2,
  };
  return forbidden
    ? {
        ...result,
        token: makeToken("stray", forbidden, line),
      }
    : result;
};
//@ chunk-bfqsgtvj.js:1937-2165 placement
var lexLineComment = (source, start, line) => {
  let newlineIndex = source.slice(start).search(/[\n\r\u2028\u2029]/);
  let end = newlineIndex === -1 ? source.length : start + newlineIndex;
  let source_2 = source.slice(start, end).trim();
  let forbiddenComment = detectForbiddenComment(source_2);
  let token = source_2.startsWith("///")
    ? makeToken("reference", source_2, line)
    : forbiddenComment
      ? makeToken("stray", forbiddenComment, line)
      : undefined;
  return token
    ? {
        end,
        line,
        token,
      }
    : {
        end,
        line,
      };
};
//@ chunk-bfqsgtvj.js:2165-2419 placement
var lexStringLiteral = (source, start, line) => {
  let quote = source[start] ?? "";
  let text = "";
  let index = start + 1;
  while (index < source.length) {
    let char = source[index] ?? "";
    let isEscape = char === "\\" && index + 1 < source.length;
    if (
      char === quote ||
      char ===
        `
` ||
      char === "\r"
    )
      break;
    text += isEscape ? (source[index + 1] ?? "") : char;
    index += isEscape ? 2 : 1;
  }
  return source[index] === quote
    ? {
        end: index + 1,
        line,
        token: makeToken("string", text, line),
      }
    : {
        end: index,
        line,
        token: makeToken("stray", quote, line),
      };
};
//@ chunk-bfqsgtvj.js:2419-2545 placement
var lexWord = (source, start, line) => {
  let end = start + 1;
  while (end < source.length && /[\w$]/.test(source[end] ?? "")) end += 1;
  return {
    end,
    line,
    token: makeToken("word", source.slice(start, end), line),
  };
};
//@ chunk-bfqsgtvj.js:2545-2683 placement
function pickLexer(source, index) {
  let char = source[index] ?? "";
  let sliced = source.slice(index, index + 2);
  let commentLexers = {
    "//": lexLineComment,
    "/*": lexBlockComment,
  };
  let stringLexers = {
    "'": lexStringLiteral,
    '"': lexStringLiteral,
  };
  let matches = /[\w$]/.test(char);
  return commentLexers[sliced] ?? stringLexers[char] ?? (matches ? lexWord : undefined);
}
//@ chunk-bfqsgtvj.js:2683-3389 placement
function tokenizeContractSource(source) {
  let tokens = [];
  let templateBraceStack = [];
  let braceDepth = 0;
  let index = 0;
  let line = 1;
  let inTemplate = false;
  let templateStartLine = 1;
  while (index < source.length) {
    let char = source[index] ?? "";
    let isLineBreak =
      char ===
        `
` ||
      char === "\u2028" ||
      char === "\u2029" ||
      (char === "\r" &&
        source[index + 1] !==
          `
`);
    if (inTemplate) {
      let isEscape = char === "\\";
      let opensSubstitution = char === "$" && source[index + 1] === "{";
      let closesTemplate = char === "`";
      if (opensSubstitution) templateBraceStack.push(braceDepth);
      inTemplate = !opensSubstitution && !closesTemplate;
      line += isLineBreak ? 1 : 0;
      index += isEscape || opensSubstitution ? 2 : 1;
      continue;
    }
    let lexer = pickLexer(source, index);
    let startsTemplate = char === "`";
    let closesSubstitution =
      char === "}" && templateBraceStack.length > 0 && braceDepth === templateBraceStack.at(-1);
    let matches = /[\t\n\v\f\r \u2028\u2029]/.test(char);
    let isSlash = char === "/" || char === "\\";
    let isPrintable = /[!-~]/.test(char) && !isSlash;
    let isStray = !matches && !isPrintable;
    let strayText = isSlash ? char : "other";
    if (lexer) {
      let lexed = lexer(source, index, line);
      if (lexed.token) tokens.push(lexed.token);
      index = lexed.end;
      line = lexed.line;
      continue;
    }
    if (startsTemplate) {
      tokens.push(makeToken("string", "`", line));
      templateStartLine = line;
    }
    if (isStray) tokens.push(makeToken("stray", strayText, line));
    if (closesSubstitution) templateBraceStack.pop();
    if (!startsTemplate && !closesSubstitution && !isStray && !matches) {
      tokens.push(makeToken("punct", char, line));
      braceDepth += char === "{" ? 1 : char === "}" ? -1 : 0;
    }
    inTemplate = startsTemplate || closesSubstitution;
    line += isLineBreak ? 1 : 0;
    index += 1;
  }
  if (inTemplate || templateBraceStack.length > 0) tokens.push(makeToken("stray", "`", templateStartLine));
  return tokens;
}
//@ chunk-bfqsgtvj.js:3389-3424 placement
var tokenWindow = (tokens, index) => [tokens[index], tokens[index + 1], tokens[index + 2]];
//@ chunk-bfqsgtvj.js:3424-4023 placement
/**
 * global/嵌套 module/as namespace 等不允许的声明形式。
 */
function describeForbiddenAugmentation(tokens, index) {
  let [first, second, third] = tokenWindow(tokens, index);
  let isGlobalBlock = isPunctToken(first, "word", "global") && isPunctToken(second, "punct", "{");
  let isNestedModule = isPunctToken(first, "word", "module", "namespace") && second?.kind === "string";
  let isAsNamespace = isPunctToken(first, "word", "as") && isPunctToken(second, "word", "namespace");
  let isInterfaceBreak =
    isPunctToken(first, "word", "interface") && second?.kind === "word" && second.line !== first?.line;
  let isEngineInterfaceBare =
    isPunctToken(first, "word", "interface") &&
    isPunctToken(second, "word", "EngineInterface") &&
    !isPunctToken(third, "punct", "{");
  return isGlobalBlock
    ? "`global { \u2026 }` augments the global scope"
    : isNestedModule
      ? `a nested \`module '${second.text}'\` augments another module`
      : isAsNamespace
        ? "`as namespace` declares a global"
        : isInterfaceBreak
          ? "`interface` without its name on the same line"
          : isEngineInterfaceBare
            ? "`EngineInterface` takes members only, no `extends` or type parameters"
            : undefined;
}
//@ chunk-bfqsgtvj.js:4023-4282 placement
function findForbiddenAugmentations(tokens) {
  let problems = [];
  let depth = 0;
  for (let [index, token] of tokens.entries()) {
    let description =
      depth === 0 &&
      isPunctToken(tokens[index - 1], "word", "declare") &&
      isPunctToken(token, "word", "module")
        ? undefined
        : describeForbiddenAugmentation(tokens, index);
    depth += bracketDelta(token);
    if (description !== undefined)
      problems.push(
        `line ${token.line}: ${description}; the contract may only augment 'claude-code', at its top level`,
      );
  }
  return problems;
}
//@ chunk-bfqsgtvj.js:4282-4446 placement
function isInterfaceOpening(tokens, index, interfaceName) {
  let [first, second, third] = tokenWindow(tokens, index);
  return (
    first?.kind === "word" &&
    first.text === "interface" &&
    second?.kind === "word" &&
    second.text === interfaceName &&
    second.line === first.line &&
    third?.kind === "punct" &&
    third.text === "{"
  );
}
//@ chunk-bfqsgtvj.js:4446-4629 placement
function findMatchingBrace(tokens, start) {
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    let token = tokens[index];
    if (!(token?.kind === "punct" && (token.text === "{" || token.text === "}"))) continue;
    depth += token.text === "{" ? 1 : -1;
    if (depth === 0) return index;
  }
  return tokens.length;
}
//@ chunk-bfqsgtvj.js:4629-5034 placement
/**
 * 块内顶层成员名。
 */
function listMemberNames(tokens, start) {
  let names = [];
  let matchingBrace = findMatchingBrace(tokens, start);
  let isPunctAt = (index, ...texts) => tokens[index]?.kind === "punct" && texts.includes(tokens[index].text);
  let nesting = 0;
  let atMemberStart = true;
  for (let index = start + 1; index < matchingBrace; index += 1) {
    let opens = isPunctAt(index, "{", "(", "[");
    let closes = isPunctAt(index, "}", ")", "]");
    let isSeparator = nesting === 0 && isPunctAt(index, ";", ",");
    let lineChanged = (tokens[index - 1]?.line ?? 0) < (tokens[index]?.line ?? 0);
    let nameIndex =
      tokens[index]?.text === "readonly" && tokens[index + 1]?.kind !== "punct" ? index + 1 : index;
    let nameToken = tokens[nameIndex];
    let isMemberName =
      nesting === 0 &&
      (atMemberStart || lineChanged) &&
      nameToken !== undefined &&
      nameToken.kind !== "punct" &&
      isPunctAt(nameIndex + 1, ":", "?", "(", "<");
    nesting += opens ? 1 : closes ? -1 : 0;
    atMemberStart = isSeparator;
    if (isMemberName) names.push(nameToken.text);
  }
  return names;
}
//@ chunk-bfqsgtvj.js:5034-5206 placement
function collectEngineNouns(tokens, blocks) {
  let nouns = new Set();
  for (let { start, end } of blocks)
    for (let index = start; index < end; index += 1) {
      if (!isInterfaceOpening(tokens, index, "EngineInterface")) continue;
      let braceIndex = index + 2;
      for (let name of listMemberNames(tokens, braceIndex)) nouns.add(name);
    }
  return [...nouns];
}
//@ chunk-bfqsgtvj.js:5206-5509 placement
/**
 * 契约中像汇总框架或编译指令的行。
 */
var findFramingLines = (source) =>
  source
    .split(/\r\n|[\n\r\u2028\u2029]/)
    .flatMap((line, lineIndex) =>
      /^\s*(?:\*\s*)?\/\/\s*(?:\u2500\u2500 from plugin |Skipped:)/.test(line) ||
      /^\s*(?:\/\/\/?|\/?\*)\s*@ts-/i.test(line)
        ? [
            `line ${lineIndex + 1}: a line that would read as the roll-up's framing or a compiler pragma once copied; a contract carries neither`,
          ]
        : [],
    );
//@ chunk-bfqsgtvj.js:5509-6181 placement
function outsideReferenceProblems(tokens) {
  let problems = [];
  let reason =
    "reaches outside the file; the contract must be self-contained (no " +
    "import, export \u2026 from, require or reference)";
  let lastLine = 0;
  for (let [index, token] of tokens.entries()) {
    let next = tokens[index + 1];
    let nextNext = tokens[index + 2];
    let isWord = (text) => token.kind === "word" && token.text === text;
    let isRequireCall = next?.kind === "punct" && next.text === "(" && nextNext?.kind === "string";
    let hasModuleSpec =
      next?.kind === "string" ||
      next?.kind === "word" ||
      (next?.kind === "punct" && (next.text === "{" || next.text === "*")) ||
      isRequireCall;
    let lineChanged = token.line !== lastLine;
    let isReference = token.kind === "reference";
    let isImport = isWord("import") && hasModuleSpec;
    let isFrom = isWord("from") && lineChanged && next?.kind === "string";
    let isRequire = isWord("require") && lineChanged && isRequireCall;
    let what = isReference
      ? "a triple-slash reference"
      : isImport
        ? "`import`"
        : isFrom
          ? `\`from '${next.text}'\``
          : isRequire
            ? `\`require('${nextNext.text}')\``
            : undefined;
    if (what === undefined) continue;
    lastLine = token.line;
    problems.push(`line ${token.line}: ${what} ${reason}`);
  }
  return problems;
}
//@ chunk-bfqsgtvj.js:6181-6256 placement
var CONTROL_OR_INVISIBLE_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\u2028\u2029]/u;
//@ chunk-bfqsgtvj.js:6256-6454 placement
var findInvisibleCharLines = (source) =>
  source
    .split(
      `
`,
    )
    .flatMap((line, lineIndex) =>
      CONTROL_OR_INVISIBLE_RE.test(line.replace(/[\t\r]/g, ""))
        ? [
            `line ${lineIndex + 1}: an invisible or reordering character (control, bidi, zero-width, line separator); a contract holds none`,
          ]
        : [],
    );
//@ chunk-bfqsgtvj.js:6454-6559 placement
function checkParsesAsTypeScript(source) {
  try {
    transpileHooksSource("contract.d.ts", source);
    return;
  } catch (error) {
    return `does not parse as TypeScript: ${errorMessage(error)}`;
  }
}
//@ chunk-bfqsgtvj.js:6559-7095 placement
/**
 * PluginState 中各插件声明的状态键。
 */
function collectPluginStateKeys(tokens, blocks) {
  let keysByPlugin = new Map();
  let isPunctAt = (index, text) => tokens[index]?.kind === "punct" && tokens[index].text === text;
  for (let { start, end } of blocks)
    for (let index = start; index < end; index += 1) {
      if (!isInterfaceOpening(tokens, index, "PluginState")) continue;
      let braceIndex = index + 2;
      let matchingBrace = findMatchingBrace(tokens, braceIndex);
      let memberNames = new Set(listMemberNames(tokens, braceIndex));
      let depth = 0;
      for (let index = braceIndex + 1; index < matchingBrace; index += 1) {
        let token = tokens[index];
        if (
          depth === 0 &&
          token !== undefined &&
          token.kind !== "punct" &&
          memberNames.has(token.text) &&
          isPunctAt(index + 1, ":") &&
          isPunctAt(index + 2, "{")
        ) {
          let keySet = keysByPlugin.get(token.text) ?? new Set();
          for (let name of listMemberNames(tokens, index + 2)) keySet.add(name);
          keysByPlugin.set(token.text, keySet);
        }
        let opens = isPunctAt(index, "{") || isPunctAt(index, "(") || isPunctAt(index, "[");
        let closes = isPunctAt(index, "}") || isPunctAt(index, ")") || isPunctAt(index, "]");
        depth += Number(opens) - Number(closes);
      }
    }
  return [...keysByPlugin].map(([plugin, keys]) => ({
    plugin,
    keys: [...keys],
  }));
}
//@ chunk-bfqsgtvj.js:7095-7291 placement
function findRunnableCode(source) {
  let trimmed = transpileHooksSource("contract.ts", source)
    .replace(/^\s*export\s*\{\s*\};?\s*$/m, "")
    .trim();
  let firstLine = getFirstLine(trimmed);
  return trimmed === ""
    ? []
    : [`the contract holds code that would run (\`${firstLine}\`); a contract is types only`];
}
//@ chunk-bfqsgtvj.js:7291-7658 placement
/**
 * class/const/function 等运行时声明。
 */
var findRuntimeDeclarations = (tokens) =>
  tokens.flatMap((token, index) => {
    let previous = tokens[index - 1];
    let isDeclarationKeyword = isPunctToken(
      token,
      "word",
      "class",
      "const",
      "enum",
      "function",
      "let",
      "var",
    );
    let startsStatement =
      previous === undefined ||
      previous.line < token.line ||
      isPunctToken(previous, "punct", ";", "{", "}") ||
      isPunctToken(previous, "word", "abstract", "async", "declare", "default", "export");
    let isMemberPosition = isPunctToken(tokens[index + 1], "punct", ":", "?", "(", "<");
    return isDeclarationKeyword && startsStatement && !isMemberPosition
      ? [`line ${token.line}: \`${token.text}\` declares something that runs; a contract holds types only`]
      : [];
  });
//@ chunk-bfqsgtvj.js:7658-8129 placement
/**
 * 词法异常记号的说明。
 */
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
//@ chunk-bfqsgtvj.js:8129-8318 placement
var describeStrayTokens = (tokens) =>
  tokens
    .filter((token) => token.kind === "stray")
    .map(
      (token) =>
        `line ${token.line}: ` +
        (STRAY_TOKEN_DESCRIPTIONS[token.text] ?? `\`${token.text}\``) +
        ": a type contract never holds one, so the check refuses it rather than read past it",
    );
//@ chunk-bfqsgtvj.js:8318-8339 placement
var CLAUDE_CODE = "claude-code";
//@ chunk-bfqsgtvj.js:8339-9265 placement
/**
 * 契约顶层语句的问题（错误的 module、declare、export 等）。
 */
function describeTopLevelProblem(tokens, index) {
  let [first, second, third] = tokenWindow(tokens, index);
  let [, , nextThird] = tokenWindow(tokens, index + 1);
  let isDeclareModule =
    isPunctToken(first, "word", "declare") &&
    isPunctToken(second, "word", "module") &&
    third?.kind === "string" &&
    first?.line === second?.line &&
    second?.line === third.line &&
    isPunctToken(nextThird, "punct", "{");
  let isForeignModule = isDeclareModule && third.text !== CLAUDE_CODE;
  let isDeclare = isPunctToken(first, "word", "declare") && !isDeclareModule;
  let isExport = isPunctToken(first, "word", "export") && !isPunctToken(second, "word", "type", "interface");
  let isDisallowedKeyword = isPunctToken(
    first,
    "word",
    "abstract",
    "async",
    "default",
    "module",
    "namespace",
  );
  let isUnexportedType =
    isPunctToken(first, "word", "type", "interface") &&
    !isPunctToken(tokens[index - 1], "word", "export", "import");
  return isForeignModule
    ? `augments module '${third.text}'; the contract may only augment '${CLAUDE_CODE}'`
    : isDeclare
      ? `\`declare\` at the top level opens only \`declare module '${CLAUDE_CODE}' { \u2026 }\`, its three words on one line`
      : isExport
        ? "`export` at the top level is followed by `type` or `interface`: a contract exports types and nothing else"
        : isDisallowedKeyword
          ? `\`${first?.text}\` at the top level: a contract holds type exports and \`declare module '${CLAUDE_CODE}'\` blocks only`
          : isUnexportedType
            ? `a top-level \`${first?.text}\` without \`export\` would be global in a dependent's program; export it`
            : undefined;
}
//@ chunk-bfqsgtvj.js:9265-9795 placement
/**
 * 扫描顶层语句，返回问题与 declare module 块范围。
 */
function scanTopLevel(tokens) {
  let problems = [];
  let blocks = [];
  let depth = 0;
  let index = 0;
  while (index < tokens.length) {
    let [first, second, third] = tokenWindow(tokens, index);
    let problem = depth === 0 && first?.kind === "word" ? describeTopLevelProblem(tokens, index) : undefined;
    let acceptable = problem === undefined || problem.startsWith("augments");
    let isDeclareModule =
      depth === 0 &&
      acceptable &&
      isPunctToken(first, "word", "declare") &&
      isPunctToken(second, "word", "module") &&
      third?.kind === "string";
    let braceIndex = index + 2;
    depth += bracketDelta(first);
    if (problem !== undefined) problems.push(`line ${first?.line}: ${problem}`);
    if (!isDeclareModule) {
      index += 1;
      continue;
    }
    let matchingBrace = findMatchingBrace(tokens, braceIndex + 1);
    if (matchingBrace === tokens.length)
      problems.push(
        `line ${first?.line}: \`declare module\` never closes: the text does not lex as a type contract, so the check refuses it`,
      );
    blocks.push({
      start: braceIndex + 2,
      end: matchingBrace,
    });
    index = matchingBrace + 1;
  }
  return {
    problems,
    blocks,
  };
}
//@ chunk-bfqsgtvj.js:9795-10068 placement
/**
 * 校验插件 contract 文件（2.1.316 新增）：自包含的轻量词法检查，禁止 import/require/外部引用，提取声明的名词与状态。
 */
function validatePluginContract(source) {
  let parseProblem = checkParsesAsTypeScript(source);
  if (parseProblem !== undefined)
    return {
      problems: [parseProblem],
      nouns: [],
      state: [],
    };
  let tokens = tokenizeContractSource(source);
  let tokens_2 = tokens.filter((token) => token.kind !== "reference");
  let { problems, blocks } = scanTopLevel(tokens_2);
  return {
    problems: [
      ...findInvisibleCharLines(source),
      ...describeStrayTokens(tokens),
      ...findFramingLines(source),
      ...outsideReferenceProblems(tokens),
      ...problems,
      ...findRuntimeDeclarations(tokens_2),
      ...findRunnableCode(source),
      ...findForbiddenAugmentations(tokens_2),
    ],
    nouns: collectEngineNouns(tokens_2, blocks),
    state: collectPluginStateKeys(tokens_2, blocks),
  };
}
//@ chunk-bfqsgtvj.js:10132-10185 placement
/**
 * refusedContract：构造被拒的契约结果。
 */
var refusedContract = (...problems) => ({
  kind: "refused",
  problems: problems.map(collapseWhitespace),
});
export { refusedContract, validatePluginContract };
