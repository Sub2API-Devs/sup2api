/**
 * tools/AskUserQuestionTool/answerValidation.ts
 *
 * 2.1.316 新增：AskUserQuestion 答案校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a91k35xs.js (11)
 * attribution: placement 11
 */
import { jsonStringify } from "../../utils/slowOperations.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";
import { isSameAnswerInput } from "../../utils/permissions/permissionAnswer.js";
import { displayText, hasSuspiciousText } from "../../utils/permissions/approvalPayloadSerialization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a91k35xs.js:859-946 placement
/**
 * 把选择的答案列表用 “, ” 连成一行；含 “, ” 或双引号的项用 jsonStringify 加引号，避免歧义。
 */
function formatSelectionList(selections) {
  return selections
    .map((selection) =>
      selection.includes(", ") || selection.includes('"') ? jsonStringify(selection) : selection,
    )
    .join(", ");
}
//@ chunk-a91k35xs.js:946-1473 placement
/**
 * 解析 ", " 分隔的值列表，支持 JSON 双引号字符串；格式不合法返回 null。
 */
function parseCommaSeparatedValues(input) {
  let values = [];
  let rest = input;
  for (;;) {
    if (rest.startsWith('"')) {
      let closeIndex = -1;
      let escaped = false;
      for (let pos = 1; pos < rest.length; pos++) {
        let ch = rest[pos];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          closeIndex = pos;
          break;
        }
      }
      if (closeIndex === -1) return null;
      try {
        let parsed = JSON.parse(rest.slice(0, closeIndex + 1));
        if (typeof parsed !== "string") return null;
        values.push(parsed);
      } catch {
        return null;
      }
      rest = rest.slice(closeIndex + 1);
    } else {
      let index = rest.indexOf(", ");
      let value = index === -1 ? rest : rest.slice(0, index);
      if (value.includes('"')) return null;
      values.push(value);
      rest = index === -1 ? "" : rest.slice(index);
    }
    if (rest === "") break;
    if (!rest.startsWith(", ")) return null;
    rest = rest.slice(2);
    if (rest === "") return null;
  }
  return values;
}
//@ chunk-a91k35xs.js:1473-1649 placement
var MAX_ANSWER_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_NOTES_CHARS;
var MAX_TEXT_CHARS;
var SIZE_HEADROOM;
var MAX_TOTAL_CHARS;
var MAX_PREVIEW_COMPARE_CHARS;
var UNANSWERED_REASONS;
var ANSWER_FIELDS;
var AFKTIMEOUTMS;
deferInit("chunk-a91k35xs.js:1473", () => {
  MAX_ANSWER_CHARS = 32768;
  MAX_NOTES_CHARS = 8192;
  MAX_TEXT_CHARS = 32768;
  SIZE_HEADROOM = 2000;
  MAX_TOTAL_CHARS = OUTPUT_SIZE_LIMITS - SIZE_HEADROOM;
  MAX_PREVIEW_COMPARE_CHARS = 2000;
  UNANSWERED_REASONS = ["skipped", "replied_in_chat", "dismissed"];
  ANSWER_FIELDS = new Set(["answers", "annotations", "response", "followUp"]);
  AFKTIMEOUTMS = "afkTimeoutMs";
});
//@ chunk-a91k35xs.js:1649-1709 placement
/**
 * 安全版 admitAnswerInput：宿主回传答案校验抛出异常时，按 “threw” 规则返回拒绝。
 */
function admitAnswerInputSafely(shownInput, reply) {
  try {
    return admitAnswerInput(shownInput, reply);
  } catch {
    return answerRefusal("threw");
  }
}
//@ chunk-a91k35xs.js:1709-3613 placement
/**
 * 校验宿主回传的 AskUserQuestion 答案：不得改动已展示字段，answers/annotations/response/followUp 逐项检查类型、长度与问题对应关系，总大小受限；通过返回 {kind:'admitted', input}。
 */
function admitAnswerInput(shownInput, reply) {
  if (!isPlainObject(reply)) return answerRefusal("not_an_object");
  for (let key of Object.keys(reply)) {
    if (key === AFKTIMEOUTMS) return answerRefusal("host_field");
    if (ANSWER_FIELDS.has(key)) {
      if (Object.hasOwn(shownInput, key)) return answerRefusal("changed_shown_field");
      continue;
    }
    if (!Object.hasOwn(shownInput, key)) return answerRefusal("unknown_field");
    if (
      !isSameAnswerInput(reply[key], shownInput[key]) &&
      !(
        key === "questions" &&
        !Object.hasOwn(shownInput, "title") &&
        questionsMatchIgnoringDefaults(reply[key], shownInput[key])
      )
    )
      return answerRefusal("changed_shown_field");
  }
  let { questions, extended } = indexShownQuestions(getOwnPropertyOrUndefined(shownInput, "questions"));
  let textChars = 0;
  let extraChars = 0;
  let answeredQuestions = new Set();
  let admitted = {
    ...shownInput,
  };
  let answersOut = Object.create(null);
  let answersIn = getOwnPropertyOrUndefined(reply, "answers");
  if (answersIn !== undefined) {
    if (!isPlainObject(answersIn)) return answerRefusal("answers");
    for (let key of Object.keys(answersIn)) {
      let question = questions.get(key);
      if (question === undefined) return answerRefusal("answers");
      answeredQuestions.add(key);
      let answer = answersIn[key];
      if (typeof answer === "string") {
        if (answer.length > MAX_ANSWER_CHARS) return answerRefusal("answers");
        textChars += answer.length;
        answersOut[key] = answer;
        continue;
      }
      if (!question.multiSelect || !Array.isArray(answer) || answer.length > question.optionCount + 1)
        return answerRefusal("answers");
      let selections = [];
      for (let idx = 0; idx < answer.length; idx++) {
        let selection = answer[idx];
        if (typeof selection !== "string" || selection.length > MAX_ANSWER_CHARS)
          return answerRefusal("answers");
        selections.push(selection);
      }
      let joined = formatSelectionList(selections);
      textChars += joined.length;
      answersOut[key] = joined;
    }
  }
  if (!Object.hasOwn(shownInput, "answers")) admitted.answers = answersOut;
  let annotationsIn = getOwnPropertyOrUndefined(reply, "annotations");
  if (annotationsIn !== undefined) {
    if (!isPlainObject(annotationsIn)) return answerRefusal("annotations");
    let annotationsByQuestion = Object.create(null);
    for (let key of Object.keys(annotationsIn)) {
      let annotationQuestion = questions.get(key);
      let annotationObject = annotationsIn[key];
      if (annotationQuestion === undefined || !isPlainObject(annotationObject))
        return answerRefusal("annotations");
      answeredQuestions.add(key);
      let sanitizedAnnotation = {};
      for (let key of Object.keys(annotationObject)) {
        let annotationFieldValue = annotationObject[key];
        switch (key) {
          case "preview":
            if (
              typeof annotationFieldValue !== "string" ||
              !isShownPreview(annotationQuestion, annotationFieldValue)
            )
              return answerRefusal("annotations");
            extraChars += annotationFieldValue.length;
            sanitizedAnnotation.preview = annotationFieldValue;
            break;
          case "notes":
            if (typeof annotationFieldValue !== "string" || annotationFieldValue.length > MAX_NOTES_CHARS)
              return answerRefusal("annotations");
            textChars += annotationFieldValue.length;
            sanitizedAnnotation.notes = annotationFieldValue;
            break;
          case "unanswered": {
            let found = UNANSWERED_REASONS.find((reason) => reason === annotationFieldValue);
            if (found === undefined) return answerRefusal("annotations");
            sanitizedAnnotation.unanswered = found;
            break;
          }
          default:
            return answerRefusal("annotations");
        }
      }
      annotationsByQuestion[key] = sanitizedAnnotation;
    }
    admitted.annotations = annotationsByQuestion;
  }
  let response = getOwnPropertyOrUndefined(reply, "response");
  if (response !== undefined) {
    if (typeof response !== "string" || response.length > MAX_ANSWER_CHARS) return answerRefusal("response");
    textChars += response.length;
    admitted.response = response;
  }
  let followUp = getOwnPropertyOrUndefined(reply, "followUp");
  if (followUp !== undefined) {
    if (typeof followUp !== "boolean" || !extended) return answerRefusal("follow_up");
    admitted.followUp = followUp;
  }
  for (let answeredQuestion of answeredQuestions) extraChars += answeredQuestion.length;
  if (textChars > MAX_TEXT_CHARS || textChars + extraChars > MAX_TOTAL_CHARS)
    return answerRefusal("too_large");
  return {
    kind: "admitted",
    input: admitted,
  };
}
//@ chunk-a91k35xs.js:3613-4090 placement
/**
 * 把问题数组整理为 question→{multiSelect、选项数、预览集合}，并判断是否全部使用扩展格式（带 kind）。
 */
function indexShownQuestions(ownPropertyOrUndefined) {
  let questionsByText = new Map();
  if (!Array.isArray(ownPropertyOrUndefined))
    return {
      questions: questionsByText,
      extended: false,
    };
  let isExtended = ownPropertyOrUndefined.length > 0;
  for (let question of ownPropertyOrUndefined) {
    if (!isPlainObject(question)) {
      isExtended = false;
      continue;
    }
    if (typeof getOwnPropertyOrUndefined(question, "kind") !== "string") isExtended = false;
    let ownPropertyOrUndefined = getOwnPropertyOrUndefined(question, "question");
    if (typeof ownPropertyOrUndefined !== "string") continue;
    let ownPropertyOrUndefined_2 = getOwnPropertyOrUndefined(question, "options");
    let options = Array.isArray(ownPropertyOrUndefined_2) ? ownPropertyOrUndefined_2 : [];
    let previews = new Set();
    for (let option of options) {
      let preview = isPlainObject(option) ? getOwnPropertyOrUndefined(option, "preview") : undefined;
      if (typeof preview === "string") previews.add(preview);
    }
    questionsByText.set(ownPropertyOrUndefined, {
      multiSelect: getOwnPropertyOrUndefined(question, "multiSelect") === true,
      optionCount: options.length,
      previews,
    });
  }
  return {
    questions: questionsByText,
    extended: isExtended,
  };
}
//@ chunk-a91k35xs.js:4090-4419 placement
/**
 * 比较两组问题，忽略补上的默认字段（kind=choice、multiSelect=false）后是否一致。
 */
function questionsMatchIgnoringDefaults(actualQuestions, defaultedQuestions) {
  if (
    !Array.isArray(actualQuestions) ||
    !Array.isArray(defaultedQuestions) ||
    actualQuestions.length !== defaultedQuestions.length
  )
    return false;
  let mapped = defaultedQuestions.map((defaultedQuestion, idx) => {
    let actualQuestion = actualQuestions[idx];
    if (!isPlainObject(defaultedQuestion) || !isPlainObject(actualQuestion)) return defaultedQuestion;
    let normalized = {
      ...defaultedQuestion,
    };
    if (
      getOwnPropertyOrUndefined(defaultedQuestion, "kind") === "choice" &&
      !Object.hasOwn(actualQuestion, "kind")
    )
      delete normalized.kind;
    if (
      getOwnPropertyOrUndefined(defaultedQuestion, "multiSelect") === false &&
      !Object.hasOwn(actualQuestion, "multiSelect")
    )
      delete normalized.multiSelect;
    return normalized;
  });
  return isSameAnswerInput(actualQuestions, mapped);
}
//@ chunk-a91k35xs.js:4419-4544 placement
function isShownPreview(question, text) {
  if (question.previews.has(text)) return true;
  for (let shownPreview of question.previews)
    if (
      shownPreview.length <= MAX_PREVIEW_COMPARE_CHARS &&
      displayText(shownPreview) === text &&
      !hasSuspiciousText(shownPreview)
    )
      return true;
  return false;
}
//@ chunk-a91k35xs.js:4544-4687 placement
function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  let prototypeOf = Object.getPrototypeOf(value);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-a91k35xs.js:4687-4741 placement
/**
 * 只读自有属性（Object.hasOwn），不存在或来自原型时返回 undefined；答案校验用它逐个读取 answers/annotations/response 等字段。
 */
function getOwnPropertyOrUndefined(object, key) {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}
//@ chunk-a91k35xs.js:4741-4785 placement
/**
 * 构造答案校验的拒绝结果 {kind:"refused", rule}，rule 是命中的拒绝规则名。
 */
function answerRefusal(rule) {
  return {
    kind: "refused",
    rule,
  };
}
export { formatSelectionList, UNANSWERED_REASONS, admitAnswerInputSafely, parseCommaSeparatedValues };
