/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/glob-pattern.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-getdj2mr.js (8)
 * attribution: esm-layout 2, esm-fingerprint 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../utils/debug.js";

//@ chunk-getdj2mr.js:1985-1991 esm-layout
var GlobTokenKind;
//@ chunk-getdj2mr.js:1991-2155 esm-fingerprint
(function (GlobTokenKind) {
  GlobTokenKind.Text = "text";
  GlobTokenKind.Separator = "separator";
  GlobTokenKind.AnyChar = "anyChar";
  GlobTokenKind.Star = "star";
  GlobTokenKind.Globstar = "globstar";
  GlobTokenKind.GlobstarSlash = "globstarSlash";
  GlobTokenKind.Set = "set";
})(GlobTokenKind || (GlobTokenKind = {}));
//@ chunk-getdj2mr.js:2155-2344 esm-fingerprint
function setRanges(members) {
  if (members === "") return;
  let ranges = [];
  for (let i = 0; i < members.length; i++) {
    let isRange = members[i + 1] === "-" && i + 2 < members.length;
    let from = members.charCodeAt(i);
    if (isRange) i += 2;
    let to = members.charCodeAt(i);
    if (to < from) return;
    ranges.push([from, to]);
  }
  return ranges;
}
//@ chunk-getdj2mr.js:2344-2354 esm-layout
var SEPARATOR = 47;
//@ chunk-getdj2mr.js:2354-3419 esm-fingerprint
function parseGlob(pattern) {
  let tokens = [];
  let textStart = 0;
  let endText = (at) => {
    if (textStart < at) {
      let text = pattern.slice(textStart, at);
      tokens.push({
        kind: GlobTokenKind.Text,
        text,
      });
    }
  };
  let addWildcard = (kind) => {
    let { Star, Globstar, GlobstarSlash } = GlobTokenKind;
    let kindAt = (fromEnd) => tokens[tokens.length - fromEnd]?.kind;
    if (kindAt(1) === Globstar || kindAt(1) === kind) return;
    if (!(kind === Globstar || (kindAt(2) === kind && (kindAt(1) === Star || kindAt(1) === GlobstarSlash)))) {
      tokens.push({
        kind,
      });
      return;
    }
    while (kindAt(1) === Star || kindAt(1) === GlobstarSlash) tokens.pop();
    tokens.push({
      kind: Globstar,
    });
  };
  let bracketsAreTextUntil = 0;
  let noSets = [];
  let i_2 = 0;
  while (i_2 < pattern.length)
    switch (pattern[i_2]) {
      case "/":
        endText(i_2);
        tokens.push({
          kind: GlobTokenKind.Separator,
        });
        textStart = ++i_2;
        break;
      case "?":
        endText(i_2);
        tokens.push({
          kind: GlobTokenKind.AnyChar,
        });
        textStart = ++i_2;
        break;
      case "*": {
        endText(i_2);
        let start = i_2;
        while (pattern[i_2] === "*") i_2++;
        let withSeparator = i_2 - start >= 2 && pattern[i_2] === "/";
        let rest = i_2 - start - (withSeparator ? 2 : 0);
        if (rest >= 2) addWildcard(GlobTokenKind.Globstar);
        if (rest === 1) addWildcard(GlobTokenKind.Star);
        if (withSeparator) addWildcard(GlobTokenKind.GlobstarSlash);
        textStart = withSeparator ? ++i_2 : i_2;
        break;
      }
      case "[": {
        if (i_2 < bracketsAreTextUntil) {
          i_2++;
          break;
        }
        let close = pattern.indexOf("]", i_2 + 1);
        if (close === -1) {
          noSets.push(pattern.slice(i_2));
          bracketsAreTextUntil = pattern.length;
          i_2++;
          break;
        }
        let members = pattern.slice(i_2 + 1, close);
        let ranges = setRanges(members);
        if (ranges === undefined) {
          noSets.push(`[${members}]`);
          bracketsAreTextUntil = close + 1;
          i_2++;
          break;
        }
        endText(i_2);
        tokens.push({
          kind: GlobTokenKind.Set,
          members,
          matchesSeparator: ranges.some(([from, to]) => from <= SEPARATOR && SEPARATOR <= to),
        });
        textStart = i_2 = close + 1;
        break;
      }
      default:
        i_2++;
    }
  endText(i_2);
  if (noSets.length > 0)
    logForDebugging(
      `[Sandbox] The brackets in ${noSets.join(", ")} spell no set of characters, so they are read as text: ${pattern}`,
      {
        level: "warn",
      },
    );
  return tokens;
}
//@ chunk-getdj2mr.js:3419-3482 esm-fingerprint
function escapeRegexLiteral(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//@ chunk-getdj2mr.js:3482-3754 esm-fingerprint
function globTokenToRegex(token) {
  switch (token.kind) {
    case GlobTokenKind.Text:
      return escapeRegexLiteral(token.text);
    case GlobTokenKind.Separator:
      return "/";
    case GlobTokenKind.AnyChar:
      return "[^/]";
    case GlobTokenKind.Star:
      return "[^/]*";
    case GlobTokenKind.Globstar:
      return ".*";
    case GlobTokenKind.GlobstarSlash:
      return "(.*/)?";
    case GlobTokenKind.Set:
      return `[${token.members.replace(/[.^$+{}()|\\]/g, "\\$&")}]`;
  }
}
//@ chunk-getdj2mr.js:3754-3804 esm-fingerprint
function globToRegex(globPattern) {
  return `^${parseGlob(globPattern).map(globTokenToRegex).join("")}$`;
}
export { globToRegex, globTokenToRegex, GlobTokenKind, parseGlob, escapeRegexLiteral };
