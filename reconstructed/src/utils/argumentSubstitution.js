/**
 * utils/argumentSubstitution.ts
 *
 * 技能/命令/hook 模板的参数替换（$ARGUMENTS、$1…、命名参数）与长度上限
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/argumentSubstitution.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 2, fingerprint 1, affinity 1
 */
import { getCommandArgv } from "./bash/commands.js";
import { MalformedCommandError } from "./errors.js";
import { urlPatternToRegex as urlPatternToRegex_2 } from "./stringUtils.js";

//@ chunk-e6aww6q8.js:983929-983983 placement
/**
 * 参数替换后总字符数上限（400 万）。
 */
var MAX_SUBSTITUTION_CHARS = 4000000;
var MAX_LISTED_ARGUMENTS = 64;
var MAX_ARGUMENT_NAME_CHARS = 64;
var DOLLAR_PLACEHOLDER_CHAR = "\uFFFF";
var LITERAL_PLACEHOLDER_CHAR = "\uFFFE";
//@ chunk-e6aww6q8.js:983983-984088 placement
function parseArgumentNames(args) {
  if (!args || !args.trim()) return [];
  let result = getCommandArgv(args);
  return result.length > 0 ? result : args.split(/\s+/).filter(Boolean);
}
//@ chunk-e6aww6q8.js:984389-985654 fingerprint = substituteArguments (0.523)
/**
 * 把参数代入技能/命令/hook 模板（$ARGUMENTS、$1…、命名参数），超过字符上限抛错；先把模板中的保留占位符替换为 U+FFFD。
 */
function substituteArguments(e, n, appendIfNoPlaceholder = true, argumentNames = [], h, y) {
  if (n === undefined || n === null) return y ? y(e, (ke) => ke) : e;
  e = e.replaceAll(DOLLAR_PLACEHOLDER_CHAR, "\uFFFD").replaceAll(LITERAL_PLACEHOLDER_CHAR, "\uFFFD");
  if (y) e = y(e, wrapLiteralForSubstitution);
  let S = e.length;
  let w = (ke) => {
    let we = ke ?? "";
    let Ee = h ? h(we) : we;
    S += Math.max(we.length, Ee.length);
    if (S > MAX_SUBSTITUTION_CHARS)
      throw new MalformedCommandError(
        `This skill, command or hook and the arguments filled into it add up to more than ${MAX_SUBSTITUTION_CHARS.toLocaleString("en-US")} characters. Use shorter arguments or fewer placeholders such as $ARGUMENTS.`,
      );
    return wrapLiteralForSubstitution(Ee);
  };
  let L;
  let G = (index) => (L ??= parseArgumentNames(n))[index];
  let sorted = argumentNames
    .map((name, we) => ({
      name,
      i: we,
    }))
    .filter((ke) => Boolean(ke.name) && ke.name.length <= MAX_ARGUMENT_NAME_CHARS)
    .slice(0, MAX_LISTED_ARGUMENTS)
    .sort((ke, we) => we.name.length - ke.name.length);
  let joined = [
    "\\d",
    "ARGUMENTS",
    ...sorted.map(({ name: ke }) => `${urlPatternToRegex_2(ke)}(?![\\[\\w])`),
  ].join("|");
  e = e.replace(new RegExp(`(?<!\\\\)\\\\\\$(?=${joined})`, "g"), DOLLAR_PLACEHOLDER_CHAR);
  let Se = false;
  for (let { name: ke, i: we } of sorted)
    e = e.replace(new RegExp(`\\$${urlPatternToRegex_2(ke)}(?![\\[\\w])`, "g"), () => {
      Se = true;
      return w(G(we));
    });
  e = e.replace(/\$ARGUMENTS\[(\d+)\]/g, (ke, indexStr) => {
    let index = parseInt(indexStr, 10);
    if (G(index) === undefined) return DOLLAR_PLACEHOLDER_CHAR + ke.slice(1);
    Se = true;
    return w(G(index));
  });
  e = e.replace(/\$(\d+)(?!\w)/g, (ke, indexStr) => {
    let index = parseInt(indexStr, 10);
    if (G(index) === undefined) return ke;
    Se = true;
    return w(G(index));
  });
  e = e.replaceAll("$ARGUMENTS", () => {
    Se = true;
    return w(n);
  });
  if (!Se && appendIfNoPlaceholder && n)
    e =
      e +
      `

ARGUMENTS: ${w(n)}`;
  return e.replaceAll(DOLLAR_PLACEHOLDER_CHAR, "$").replaceAll(LITERAL_PLACEHOLDER_CHAR, "");
}
//@ chunk-e6aww6q8.js:985654-985752 affinity
function wrapLiteralForSubstitution(e) {
  return (
    LITERAL_PLACEHOLDER_CHAR +
    e
      .replaceAll(DOLLAR_PLACEHOLDER_CHAR, "\uFFFD")
      .replaceAll(LITERAL_PLACEHOLDER_CHAR, "\uFFFD")
      .replaceAll("$", DOLLAR_PLACEHOLDER_CHAR) +
    LITERAL_PLACEHOLDER_CHAR
  );
}
export { parseArgumentNames, MAX_SUBSTITUTION_CHARS, substituteArguments };
