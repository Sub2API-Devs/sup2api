/**
 * execa/lib/command.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { ChildProcess } from "child_process";
import { Buffer as jo } from "buffer";

//@ chunk-m4p5zn6n.js:26397-26650 esm-layout
var normalizeArgs = (file, args = []) => {
  if (!Array.isArray(args)) return [file];
  return [file, ...args];
};
var NO_ESCAPE_REGEXP = /^[\w.-]+$/;
var escapeArg = (arg) => {
  if (typeof arg !== "string" || NO_ESCAPE_REGEXP.test(arg)) return arg;
  return `"${arg.replaceAll('"', '\\"')}"`;
};
var Ue = (file, args) => normalizeArgs(file, args).join(" ");
var Ke = (file, args) =>
  normalizeArgs(file, args)
    .map((arg) => escapeArg(arg))
    .join(" ");
var SPACES_REGEXP = / +/g;
//@ chunk-m4p5zn6n.js:26650-27510 esm-fingerprint
var parseExpression = (expression) => {
  let typeOfExpression = typeof expression;
  if (typeOfExpression === "string") return expression;
  if (typeOfExpression === "number") return String(expression);
  if (
    typeOfExpression === "object" &&
    expression !== null &&
    !(expression instanceof ChildProcess) &&
    "stdout" in expression
  ) {
    let typeOfStdout = typeof expression.stdout;
    if (typeOfStdout === "string") return expression.stdout;
    if (jo.isBuffer(expression.stdout)) return expression.stdout.toString();
    throw TypeError(`Unexpected "${typeOfStdout}" stdout in template expression`);
  }
  throw TypeError(`Unexpected "${typeOfExpression}" in template expression`);
};
var concatTokens = (tokens, nextTokens, isNew) =>
  isNew || tokens.length === 0 || nextTokens.length === 0
    ? [...tokens, ...nextTokens]
    : [...tokens.slice(0, -1), `${tokens.at(-1)}${nextTokens[0]}`, ...nextTokens.slice(1)];
var parseTemplate = ({ templates, expressions, tokens, index, template }) => {
  let templateString = template ?? templates.raw[index];
  let templateTokens = templateString.split(SPACES_REGEXP).filter(Boolean);
  let newTokens = concatTokens(tokens, templateTokens, templateString.startsWith(" "));
  if (index === expressions.length) return newTokens;
  let expression = expressions[index];
  let expressionTokens = Array.isArray(expression)
    ? expression.map((expression) => parseExpression(expression))
    : [parseExpression(expression)];
  return concatTokens(newTokens, expressionTokens, templateString.endsWith(" "));
};
var parseTemplates = (templates, expressions) => {
  let tokens = [];
  for (let [index, template] of templates.entries())
    tokens = parseTemplate({
      templates,
      expressions,
      tokens,
      index,
      template,
    });
  return tokens;
};
export { Ue, Ke, parseTemplates };
