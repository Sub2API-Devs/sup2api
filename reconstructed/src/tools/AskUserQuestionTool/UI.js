/**
 * tools/AskUserQuestionTool/UI.tsx
 *
 * 2.1.316 新增：显示用户对 AskUserQuestion 的回答（超时继续）；显示用户要求更多问题/回答的结果等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (10)
 * attribution: placement 10
 */
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-ah34pb7m.js:21034-21127 placement
function AP(m) {
  let [N, W] = m;
  return r(Text, { color: "inactive", children: ["\xB7 ", N, " \u2192 ", W] }, N);
}
//@ chunk-ah34pb7m.js:21127-21157 placement
function DP(U) {
  return U.label;
}
//@ chunk-ah34pb7m.js:21157-21283 placement
function renderQuestionSummary(K) {
  return r(
    Text,
    { color: "inactive", children: ["\xB7 ", K.question, " (", K.options.map(DP).join(" / "), ")"] },
    K.question,
  );
}
//@ chunk-ah34pb7m.js:21283-21376 placement
function NP(m) {
  let [L, N] = m;
  return r(Text, { color: "inactive", children: ["\xB7 ", L, " \u2192 ", N] }, L);
}
/**
 * 显示用户对 AskUserQuestion 的回答（超时继续）。
 */
//@ chunk-ah34pb7m.js:21376-22263 placement
function AskUserQuestionAnswers(m) {
  let f = w(15),
    { questions: questions, answers: answers, timeoutMs: timeoutMs } = m,
    h;
  if (f[0] !== answers) ((h = Object.entries(answers)), (f[0] = answers), (f[1] = h));
  else h = f[1];
  let M = h,
    T = M.length > 0,
    x;
  if (f[2] === MEMO_CACHE_SENTINEL)
    ((x = r(Box, {
      flexDirection: "row",
      children: [
        r(Text, { color: themeColorOf("default"), children: [BLACK_CIRCLE, "\xA0"] }),
        e(Text, { children: "Claude asked:" }),
      ],
    })),
      (f[2] = x));
  else x = f[2];
  let k;
  if (f[3] !== M || f[4] !== T || f[5] !== questions)
    ((k = T ? M.map(AP) : questions.map(renderQuestionSummary)),
      (f[3] = M),
      (f[4] = T),
      (f[5] = questions),
      (f[6] = k));
  else k = f[6];
  let b;
  if (f[7] !== timeoutMs) ((b = Math.round(timeoutMs / 1000)), (f[7] = timeoutMs), (f[8] = b));
  else b = f[8];
  const E = T ? "continued with the answers selected so far" : "continued without an answer";
  let B;
  if (f[9] !== b || f[10] !== E)
    ((B = r(Text, { dimColor: !0, children: [BLACK_CIRCLE, " No response after ", b, "s \u2014", " ", E] })),
      (f[9] = b),
      (f[10] = E),
      (f[11] = B));
  else B = f[11];
  let L;
  if (f[12] !== k || f[13] !== B)
    ((L = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [x, e(MessageResponse, { children: r(Box, { flexDirection: "column", children: [k, B] }) })],
    })),
      (f[12] = k),
      (f[13] = B),
      (f[14] = L));
  else L = f[14];
  return L;
}
/**
 * 显示用户要求更多问题/回答的结果。
 */
//@ chunk-ah34pb7m.js:22263-23123 placement
function AskUserQuestionFollowUp(m) {
  let f = w(13),
    { answers: answers, response: response, followUp: followUp } = m,
    h;
  if (f[0] !== answers) ((h = Object.entries(answers)), (f[0] = answers), (f[1] = h));
  else h = f[1];
  let M = h,
    T = Boolean(response) || M.length > 0;
  if (!followUp && !T) {
    return null;
  }
  let x = followUp
      ? T
        ? "User asked Claude for more questions (so far):"
        : "User asked Claude for more questions"
      : "User answered Claude's questions:",
    k;
  if (f[2] === MEMO_CACHE_SENTINEL)
    ((k = r(Text, { color: themeColorOf("default"), children: [BLACK_CIRCLE, "\xA0"] })), (f[2] = k));
  else k = f[2];
  let b;
  if (f[3] !== x)
    ((b = r(Box, { flexDirection: "row", children: [k, e(Text, { children: x })] })), (f[3] = x), (f[4] = b));
  else b = f[4];
  let E;
  if (f[5] !== M || f[6] !== followUp || f[7] !== T || f[8] !== response)
    ((E =
      T &&
      e(MessageResponse, {
        children: r(Box, {
          flexDirection: "column",
          children: [
            (followUp || !response) && M.map(NP),
            response && r(Text, { color: "inactive", children: ["\xB7 ", response] }),
          ],
        }),
      })),
      (f[5] = M),
      (f[6] = followUp),
      (f[7] = T),
      (f[8] = response),
      (f[9] = E));
  else E = f[9];
  let B;
  if (f[10] !== b || f[11] !== E)
    ((B = r(Box, { flexDirection: "column", marginTop: 1, children: [b, E] })),
      (f[10] = b),
      (f[11] = E),
      (f[12] = B));
  else B = f[12];
  return B;
}
//@ chunk-ah34pb7m.js:23123-23149 placement
function iM() {
  return null;
}
//@ chunk-ah34pb7m.js:23149-23175 placement
function lM() {
  return null;
}
//@ chunk-ah34pb7m.js:23175-23350 placement
function AskUserQuestionResult({
  questions: questions,
  answers: answers,
  response: response,
  afkTimeoutMs: afkTimeoutMs,
  followUp: followUp,
}) {
  if (afkTimeoutMs)
    return e(AskUserQuestionAnswers, { questions: questions, answers: answers, timeoutMs: afkTimeoutMs });
  return e(AskUserQuestionFollowUp, { answers: answers, response: response, followUp: followUp });
}
/**
 * 用户拒绝回答问题。
 */
//@ chunk-ah34pb7m.js:23350-23757 placement
function AskUserQuestionDeclined({ questions: questions }) {
  return r(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      r(Box, {
        flexDirection: "row",
        children: [
          r(Text, { color: themeColorOf("default"), children: [BLACK_CIRCLE, "\xA0"] }),
          e(Text, { children: "User declined to answer questions" }),
        ],
      }),
      e(MessageResponse, {
        children: e(Box, {
          flexDirection: "column",
          children: questions.map((d) =>
            r(
              Text,
              {
                color: "inactive",
                children: [
                  "\xB7 ",
                  d.question,
                  " (",
                  d.options.map((option) => option.label).join(" / "),
                  ")",
                ],
              },
              d.question,
            ),
          ),
        }),
      }),
    ],
  });
}

export { AskUserQuestionResult, AskUserQuestionDeclined, iM, lM };
