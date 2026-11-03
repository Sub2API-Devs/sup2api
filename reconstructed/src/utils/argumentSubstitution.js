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
var UUr = 4000000,
  sPo = 64,
  iPo = 64,
  Hz = "\uFFFF",
  W7 = "\uFFFE";
//@ chunk-e6aww6q8.js:983983-984088 placement
function parseArgumentNames(argumentNames) {
  if (!argumentNames || !argumentNames.trim()) return [];
  let n = getCommandArgv(argumentNames);
  return n.length > 0 ? n : argumentNames.split(/\s+/).filter(Boolean);
}
/**
 * 把参数代入技能/命令/hook 模板（$ARGUMENTS、$1…、命名参数），超过字符上限抛错；先把模板中的保留占位符替换为 U+FFFD。
 */
//@ chunk-e6aww6q8.js:984389-985654 fingerprint = substituteArguments (0.523)
function substituteArguments(e, n, r = !0, s = [], h, y) {
  if (n === void 0 || n === null) return y ? y(e, (ke) => ke) : e;
  if (((e = e.replaceAll(Hz, "\uFFFD").replaceAll(W7, "\uFFFD")), y)) e = y(e, wrapLiteralForSubstitution);
  let S = e.length,
    w = (ke) => {
      let we = ke ?? "",
        Ee = h ? h(we) : we;
      if (((S += Math.max(we.length, Ee.length)), S > UUr))
        throw new MalformedCommandError(
          `This skill, command or hook and the arguments filled into it add up to more than ${UUr.toLocaleString("en-US")} characters. Use shorter arguments or fewer placeholders such as $ARGUMENTS.`,
        );
      return wrapLiteralForSubstitution(Ee);
    },
    L,
    G = (ke) => (L ??= parseArgumentNames(n))[ke],
    sorted = s
      .map((ke, we) => ({ name: ke, i: we }))
      .filter((ke) => Boolean(ke.name) && ke.name.length <= iPo)
      .slice(0, sPo)
      .sort((ke, we) => we.name.length - ke.name.length),
    joined = [
      "\\d",
      "ARGUMENTS",
      ...sorted.map(({ name: ke }) => `${urlPatternToRegex_2(ke)}(?![\\[\\w])`),
    ].join("|");
  e = e.replace(new RegExp(`(?<!\\\\)\\\\\\$(?=${joined})`, "g"), Hz);
  let Se = !1;
  for (let { name: ke, i: we } of sorted)
    e = e.replace(new RegExp(`\\$${urlPatternToRegex_2(ke)}(?![\\[\\w])`, "g"), () => ((Se = !0), w(G(we))));
  if (
    ((e = e.replace(/\$ARGUMENTS\[(\d+)\]/g, (ke, indexStr) => {
      let index = parseInt(indexStr, 10);
      if (G(index) === void 0) return Hz + ke.slice(1);
      return ((Se = !0), w(G(index)));
    })),
    (e = e.replace(/\$(\d+)(?!\w)/g, (ke, indexStr) => {
      let index = parseInt(indexStr, 10);
      if (G(index) === void 0) return ke;
      return ((Se = !0), w(G(index)));
    })),
    (e = e.replaceAll("$ARGUMENTS", () => ((Se = !0), w(n)))),
    !Se && r && n)
  )
    e =
      e +
      `

ARGUMENTS: ${w(n)}`;
  return e.replaceAll(Hz, "$").replaceAll(W7, "");
}
//@ chunk-e6aww6q8.js:985654-985752 affinity
function wrapLiteralForSubstitution(e) {
  return W7 + e.replaceAll(Hz, "\uFFFD").replaceAll(W7, "\uFFFD").replaceAll("$", Hz) + W7;
}

export { parseArgumentNames, UUr, substituteArguments };
