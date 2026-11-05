/**
 * utils/argumentSubstitution.ts
 *
 * 技能/命令/hook 模板的参数替换（$ARGUMENTS、$1…、命名参数）与长度上限
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/argumentSubstitution.ts
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 2, fingerprint 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getCommandArgv } from "./bash/commands.js";
import { MalformedCommandError } from "./errors.js";
import { urlPatternToRegex as urlPatternToRegex_2 } from "./stringUtils.js";

//@ chunk-5xgkngpb.js:997639-997693 placement
/**
 * 参数替换后总字符数上限（400 万）。
 */
var MAX_SUBSTITUTION_CHARS = 4000000;
var MAX_LISTED_ARGUMENTS = 64;
var MAX_ARGUMENT_NAME_CHARS = 64;
var DOLLAR_PLACEHOLDER_CHAR = "\uFFFF";
var LITERAL_PLACEHOLDER_CHAR = "\uFFFE";
//@ chunk-5xgkngpb.js:997693-997798 placement
function parseArgumentNames(args) {
  if (!args || !args.trim()) return [];
  let result = getCommandArgv(args);
  return result.length > 0 ? result : args.split(/\s+/).filter(Boolean);
}
//@ chunk-5xgkngpb.js:998099-999366 fingerprint (2.1.88 match: substituteArguments, 0.524)
/**
 * 把参数代入技能/命令/hook 模板（$ARGUMENTS、$1…、命名参数），超过字符上限抛错；先把模板中的保留占位符替换为 U+FFFD。
 */
function substituteArguments(
  template,
  argumentsText,
  appendIfNoPlaceholder = true,
  argumentNames = [],
  transformArgument,
  mapTemplate,
) {
  if (argumentsText === undefined || argumentsText === null)
    return mapTemplate ? mapTemplate(template, (segment) => segment) : template;
  template = template
    .replaceAll(DOLLAR_PLACEHOLDER_CHAR, "\uFFFD")
    .replaceAll(LITERAL_PLACEHOLDER_CHAR, "\uFFFD");
  if (mapTemplate) template = mapTemplate(template, wrapLiteralForSubstitution);
  let totalLength = template.length;
  let substituteOne = (argText) => {
    let rawArgText = argText ?? "";
    let transformedText = transformArgument ? transformArgument(rawArgText) : rawArgText;
    totalLength += Math.max(rawArgText.length, transformedText.length);
    if (totalLength > MAX_SUBSTITUTION_CHARS)
      throw new MalformedCommandError(
        `This skill, command or hook and the arguments filled into it add up to more than ${MAX_SUBSTITUTION_CHARS.toLocaleString("en-US")} characters. Use shorter arguments or fewer placeholders such as $ARGUMENTS.`,
      );
    return wrapLiteralForSubstitution(transformedText);
  };
  let parsedNames;
  let getNameAt = (index) => (parsedNames ??= parseArgumentNames(argumentsText))[index];
  let sorted = argumentNames
    .map((name, position) => ({
      name,
      i: position,
    }))
    .filter((namedArg) => Boolean(namedArg.name) && namedArg.name.length <= MAX_ARGUMENT_NAME_CHARS)
    .slice(0, MAX_LISTED_ARGUMENTS)
    .sort((leftArg, rightArg) => rightArg.name.length - leftArg.name.length);
  let joined = [
    "\\d",
    "ARGUMENTS",
    ...sorted.map(({ name }) => `${urlPatternToRegex_2(name)}(?![\\[\\w])`),
  ].join("|");
  template = template.replace(new RegExp(`(?<!\\\\)\\\\\\$(?=${joined})`, "g"), DOLLAR_PLACEHOLDER_CHAR);
  let didSubstitute = false;
  for (let { name, i: position } of sorted)
    template = template.replace(new RegExp(`\\$${urlPatternToRegex_2(name)}(?![\\[\\w])`, "g"), () => {
      didSubstitute = true;
      return substituteOne(getNameAt(position));
    });
  template = template.replace(/\$ARGUMENTS\[(\d+)\]/g, (matchText, indexStr) => {
    let index = parseInt(indexStr, 10);
    if (getNameAt(index) === undefined) return DOLLAR_PLACEHOLDER_CHAR + matchText.slice(1);
    didSubstitute = true;
    return substituteOne(getNameAt(index));
  });
  template = template.replace(/\$(\d+)(?!\w)/g, (matchText, indexStr) => {
    let index = parseInt(indexStr, 10);
    if (getNameAt(index) === undefined) return matchText;
    didSubstitute = true;
    return substituteOne(getNameAt(index));
  });
  template = template.replaceAll("$ARGUMENTS", () => {
    didSubstitute = true;
    return substituteOne(argumentsText);
  });
  if (!didSubstitute && appendIfNoPlaceholder && argumentsText)
    template =
      template +
      `

ARGUMENTS: ${substituteOne(argumentsText)}`;
  return template.replaceAll(DOLLAR_PLACEHOLDER_CHAR, "$").replaceAll(LITERAL_PLACEHOLDER_CHAR, "");
}
//@ chunk-5xgkngpb.js:999366-999464 affinity
function wrapLiteralForSubstitution(text) {
  return (
    LITERAL_PLACEHOLDER_CHAR +
    text
      .replaceAll(DOLLAR_PLACEHOLDER_CHAR, "\uFFFD")
      .replaceAll(LITERAL_PLACEHOLDER_CHAR, "\uFFFD")
      .replaceAll("$", DOLLAR_PLACEHOLDER_CHAR) +
    LITERAL_PLACEHOLDER_CHAR
  );
}
export { substituteArguments, MAX_SUBSTITUTION_CHARS, parseArgumentNames };
