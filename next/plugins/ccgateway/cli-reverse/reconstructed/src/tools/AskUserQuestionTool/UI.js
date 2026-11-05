/**
 * tools/AskUserQuestionTool/UI.tsx
 *
 * 2.1.316 新增：显示用户对 AskUserQuestion 的回答（超时继续）；显示用户要求更多问题/回答的结果等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (10)
 * attribution: placement 10
 */
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-wjygkcr4.js:21317-21410 placement
/**
 * 把 answers 的 [问题, 回答] 条目渲染成一行灰色文本 “· 问题 → 回答”；AskUserQuestionAnswers 用它显示已回答的问题。
 */
function renderAnswerSummaryLine(questionAnswerPair) {
  let [question, answer] = questionAnswerPair;
  return jsxProd_default_2(
    Text,
    {
      color: "inactive",
      children: ["\xB7 ", question, " \u2192 ", answer],
    },
    question,
  );
}
//@ chunk-wjygkcr4.js:21410-21440 placement
/**
 * 读取单个选项的 label；renderQuestionSummary 把各选项 label 用 “ / ” 连成一行摘要。
 */
function optionLabel(option) {
  return option.label;
}
//@ chunk-wjygkcr4.js:21440-21566 placement
function renderQuestionSummary(question) {
  return jsxProd_default_2(
    Text,
    {
      color: "inactive",
      children: ["\xB7 ", question.question, " (", question.options.map(optionLabel).join(" / "), ")"],
    },
    question.question,
  );
}
//@ chunk-wjygkcr4.js:21566-21659 placement
/**
 * 追问视图里把 [问题, 回答] 渲染成与 AP 相同的灰色箭头行，供 AskUserQuestionFollowUp 使用。
 */
function renderFollowUpAnswerLine(questionAnswerPair) {
  let [question, answer] = questionAnswerPair;
  return jsxProd_default_2(
    Text,
    {
      color: "inactive",
      children: ["\xB7 ", question, " \u2192 ", answer],
    },
    question,
  );
}
//@ chunk-wjygkcr4.js:21659-22546 placement
/**
 * 显示用户对 AskUserQuestion 的回答（超时继续）。
 */
function AskUserQuestionAnswers(props) {
  let $ = useMemoCache(15);
  let { questions, answers, timeoutMs } = props;
  let answerEntries;
  if ($[0] !== answers) {
    answerEntries = Object.entries(answers);
    $[0] = answers;
    $[1] = answerEntries;
  } else answerEntries = $[1];
  let answerPairs = answerEntries;
  let hasAnswers = answerPairs.length > 0;
  let headerElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    headerElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        jsxProd_default_2(Text, {
          color: themeColorOf("default"),
          children: [BLACK_CIRCLE, "\xA0"],
        }),
        jsxProd_default(Text, {
          children: "Claude asked:",
        }),
      ],
    });
    $[2] = headerElement;
  } else headerElement = $[2];
  let summaryLines;
  if ($[3] !== answerPairs || $[4] !== hasAnswers || $[5] !== questions) {
    summaryLines = hasAnswers
      ? answerPairs.map(renderAnswerSummaryLine)
      : questions.map(renderQuestionSummary);
    $[3] = answerPairs;
    $[4] = hasAnswers;
    $[5] = questions;
    $[6] = summaryLines;
  } else summaryLines = $[6];
  let timeoutSeconds;
  if ($[7] !== timeoutMs) {
    timeoutSeconds = Math.round(timeoutMs / 1000);
    $[7] = timeoutMs;
    $[8] = timeoutSeconds;
  } else timeoutSeconds = $[8];
  const timeoutSuffix = hasAnswers
    ? "continued with the answers selected so far"
    : "continued without an answer";
  let timeoutLine;
  if ($[9] !== timeoutSeconds || $[10] !== timeoutSuffix) {
    timeoutLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: [BLACK_CIRCLE, " No response after ", timeoutSeconds, "s \u2014", " ", timeoutSuffix],
    });
    $[9] = timeoutSeconds;
    $[10] = timeoutSuffix;
    $[11] = timeoutLine;
  } else timeoutLine = $[11];
  let element;
  if ($[12] !== summaryLines || $[13] !== timeoutLine) {
    element = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        headerElement,
        jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [summaryLines, timeoutLine],
          }),
        }),
      ],
    });
    $[12] = summaryLines;
    $[13] = timeoutLine;
    $[14] = element;
  } else element = $[14];
  return element;
}
//@ chunk-wjygkcr4.js:22546-23406 placement
/**
 * 显示用户要求更多问题/回答的结果。
 */
function AskUserQuestionFollowUp(props) {
  let $ = useMemoCache(13);
  let { answers, response, followUp } = props;
  let answerEntries;
  if ($[0] !== answers) {
    answerEntries = Object.entries(answers);
    $[0] = answers;
    $[1] = answerEntries;
  } else answerEntries = $[1];
  let answerPairs = answerEntries;
  let hasContent = Boolean(response) || answerPairs.length > 0;
  if (!followUp && !hasContent) {
    return null;
  }
  let children = followUp
    ? hasContent
      ? "User asked Claude for more questions (so far):"
      : "User asked Claude for more questions"
    : "User answered Claude's questions:";
  let bulletElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    bulletElement = jsxProd_default_2(Text, {
      color: themeColorOf("default"),
      children: [BLACK_CIRCLE, "\xA0"],
    });
    $[2] = bulletElement;
  } else bulletElement = $[2];
  let headerElement;
  if ($[3] !== children) {
    headerElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        bulletElement,
        jsxProd_default(Text, {
          children,
        }),
      ],
    });
    $[3] = children;
    $[4] = headerElement;
  } else headerElement = $[4];
  let bodyElement;
  if ($[5] !== answerPairs || $[6] !== followUp || $[7] !== hasContent || $[8] !== response) {
    bodyElement =
      hasContent &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            (followUp || !response) && answerPairs.map(renderFollowUpAnswerLine),
            response &&
              jsxProd_default_2(Text, {
                color: "inactive",
                children: ["\xB7 ", response],
              }),
          ],
        }),
      });
    $[5] = answerPairs;
    $[6] = followUp;
    $[7] = hasContent;
    $[8] = response;
    $[9] = bodyElement;
  } else bodyElement = $[9];
  let element;
  if ($[10] !== headerElement || $[11] !== bodyElement) {
    element = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [headerElement, bodyElement],
    });
    $[10] = headerElement;
    $[11] = bodyElement;
    $[12] = element;
  } else element = $[12];
  return element;
}
//@ chunk-wjygkcr4.js:23406-23432 placement
/**
 * 该工具不提供执行中进度界面，返回 null；由 SkillProposalMessage 指派为 renderToolUseProgressMessage。
 */
function renderNoToolUseProgress() {
  return null;
}
//@ chunk-wjygkcr4.js:23432-23458 placement
/**
 * 该工具不提供工具使用错误界面，返回 null；指派为 renderToolUseErrorMessage。
 */
function renderNoToolUseError() {
  return null;
}
//@ chunk-wjygkcr4.js:23458-23633 placement
function AskUserQuestionResult({ questions, answers, response, afkTimeoutMs, followUp }) {
  if (afkTimeoutMs)
    return jsxProd_default(AskUserQuestionAnswers, {
      questions,
      answers,
      timeoutMs: afkTimeoutMs,
    });
  return jsxProd_default(AskUserQuestionFollowUp, {
    answers,
    response,
    followUp,
  });
}
//@ chunk-wjygkcr4.js:23633-24040 placement
/**
 * 用户拒绝回答问题。
 */
function AskUserQuestionDeclined({ questions }) {
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default_2(Text, {
            color: themeColorOf("default"),
            children: [BLACK_CIRCLE, "\xA0"],
          }),
          jsxProd_default(Text, {
            children: "User declined to answer questions",
          }),
        ],
      }),
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Box, {
          flexDirection: "column",
          children: questions.map((question) =>
            jsxProd_default_2(
              Text,
              {
                color: "inactive",
                children: [
                  "\xB7 ",
                  question.question,
                  " (",
                  question.options.map((option) => option.label).join(" / "),
                  ")",
                ],
              },
              question.question,
            ),
          ),
        }),
      }),
    ],
  });
}
export { AskUserQuestionResult, AskUserQuestionDeclined, renderNoToolUseProgress, renderNoToolUseError };
