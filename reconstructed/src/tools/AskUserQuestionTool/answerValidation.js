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

//@ chunk-a91k35xs.js:859-946 placement
function fBt(e) {
  return e.map((t) => (t.includes(", ") || t.includes('"') ? jsonStringify(t) : t)).join(", ");
}
/**
 * 解析 ", " 分隔的值列表，支持 JSON 双引号字符串；格式不合法返回 null。
 */
//@ chunk-a91k35xs.js:946-1473 placement
function parseCommaSeparatedValues(input) {
  let values = [],
    rest = input;
  for (;;) {
    if (rest.startsWith('"')) {
      let closeIndex = -1,
        escaped = !1;
      for (let pos = 1; pos < rest.length; pos++) {
        let ch = rest[pos];
        if (escaped) {
          escaped = !1;
          continue;
        }
        if (ch === "\\") {
          escaped = !0;
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
      let index = rest.indexOf(", "),
        i = index === -1 ? rest : rest.slice(0, index);
      if (i.includes('"')) return null;
      (values.push(i), (rest = index === -1 ? "" : rest.slice(index)));
    }
    if (rest === "") break;
    if (!rest.startsWith(", ")) return null;
    if (((rest = rest.slice(2)), rest === "")) return null;
  }
  return values;
}
//@ chunk-a91k35xs.js:1473-1649 placement
var MAX_ANSWER_CHARS = 32768,
  MAX_NOTES_CHARS = 8192,
  MAX_TEXT_CHARS = 32768,
  SIZE_HEADROOM = 2000,
  MAX_TOTAL_CHARS = OUTPUT_SIZE_LIMITS - SIZE_HEADROOM,
  MAX_PREVIEW_COMPARE_CHARS = 2000,
  UNANSWERED_REASONS = ["skipped", "replied_in_chat", "dismissed"],
  ANSWER_FIELDS = new Set(["answers", "annotations", "response", "followUp"]),
  AFKTIMEOUTMS = "afkTimeoutMs";
//@ chunk-a91k35xs.js:1649-1709 placement
function V(e, t) {
  try {
    return admitAnswerInput(e, t);
  } catch {
    return S("threw");
  }
}
/**
 * 校验宿主回传的 AskUserQuestion 答案：不得改动已展示字段，answers/annotations/response/followUp 逐项检查类型、长度与问题对应关系，总大小受限；通过返回 {kind:'admitted', input}。
 */
//@ chunk-a91k35xs.js:1709-3613 placement
function admitAnswerInput(shownInput, reply) {
  if (!isPlainObject(reply)) return S("not_an_object");
  for (let key of Object.keys(reply)) {
    if (key === AFKTIMEOUTMS) return S("host_field");
    if (ANSWER_FIELDS.has(key)) {
      if (Object.hasOwn(shownInput, key)) return S("changed_shown_field");
      continue;
    }
    if (!Object.hasOwn(shownInput, key)) return S("unknown_field");
    if (
      !isSameAnswerInput(reply[key], shownInput[key]) &&
      !(
        key === "questions" &&
        !Object.hasOwn(shownInput, "title") &&
        questionsMatchIgnoringDefaults(reply[key], shownInput[key])
      )
    )
      return S("changed_shown_field");
  }
  let { questions: questions, extended: extended } = indexShownQuestions(I(shownInput, "questions")),
    textChars = 0,
    extraChars = 0,
    answeredQuestions = new Set(),
    admitted = { ...shownInput },
    answersOut = Object.create(null),
    answersIn = I(reply, "answers");
  if (answersIn !== void 0) {
    if (!isPlainObject(answersIn)) return S("answers");
    for (let d of Object.keys(answersIn)) {
      let question = questions.get(d);
      if (question === void 0) return S("answers");
      answeredQuestions.add(d);
      let answer = answersIn[d];
      if (typeof answer === "string") {
        if (answer.length > MAX_ANSWER_CHARS) return S("answers");
        ((textChars += answer.length), (answersOut[d] = answer));
        continue;
      }
      if (!question.multiSelect || !Array.isArray(answer) || answer.length > question.optionCount + 1)
        return S("answers");
      let selections = [];
      for (let idx = 0; idx < answer.length; idx++) {
        let selection = answer[idx];
        if (typeof selection !== "string" || selection.length > MAX_ANSWER_CHARS) return S("answers");
        selections.push(selection);
      }
      let joined = fBt(selections);
      ((textChars += joined.length), (answersOut[d] = joined));
    }
  }
  if (!Object.hasOwn(shownInput, "answers")) admitted.answers = answersOut;
  let annotationsIn = I(reply, "annotations");
  if (annotationsIn !== void 0) {
    if (!isPlainObject(annotationsIn)) return S("annotations");
    let create = Object.create(null);
    for (let R of Object.keys(annotationsIn)) {
      let T = questions.get(R),
        b = annotationsIn[R];
      if (T === void 0 || !isPlainObject(b)) return S("annotations");
      answeredQuestions.add(R);
      let y = {};
      for (let k of Object.keys(b)) {
        let g = b[k];
        switch (k) {
          case "preview":
            if (typeof g !== "string" || !isShownPreview(T, g)) return S("annotations");
            ((extraChars += g.length), (y.preview = g));
            break;
          case "notes":
            if (typeof g !== "string" || g.length > MAX_NOTES_CHARS) return S("annotations");
            ((textChars += g.length), (y.notes = g));
            break;
          case "unanswered": {
            let found = UNANSWERED_REASONS.find((z) => z === g);
            if (found === void 0) return S("annotations");
            y.unanswered = found;
            break;
          }
          default:
            return S("annotations");
        }
      }
      create[R] = y;
    }
    admitted.annotations = create;
  }
  let response = I(reply, "response");
  if (response !== void 0) {
    if (typeof response !== "string" || response.length > MAX_ANSWER_CHARS) return S("response");
    ((textChars += response.length), (admitted.response = response));
  }
  let followUp = I(reply, "followUp");
  if (followUp !== void 0) {
    if (typeof followUp !== "boolean" || !extended) return S("follow_up");
    admitted.followUp = followUp;
  }
  for (let d of answeredQuestions) extraChars += d.length;
  if (textChars > MAX_TEXT_CHARS || textChars + extraChars > MAX_TOTAL_CHARS) return S("too_large");
  return { kind: "admitted", input: admitted };
}
/**
 * 把问题数组整理为 question→{multiSelect、选项数、预览集合}，并判断是否全部使用扩展格式（带 kind）。
 */
//@ chunk-a91k35xs.js:3613-4090 placement
function indexShownQuestions(e) {
  let t = new Map();
  if (!Array.isArray(e)) return { questions: t, extended: !1 };
  let n = e.length > 0;
  for (let s of e) {
    if (!isPlainObject(s)) {
      n = !1;
      continue;
    }
    if (typeof I(s, "kind") !== "string") n = !1;
    let i = I(s, "question");
    if (typeof i !== "string") continue;
    let r = I(s, "options"),
      f = Array.isArray(r) ? r : [],
      h = new Set();
    for (let m of f) {
      let l = isPlainObject(m) ? I(m, "preview") : void 0;
      if (typeof l === "string") h.add(l);
    }
    t.set(i, { multiSelect: I(s, "multiSelect") === !0, optionCount: f.length, previews: h });
  }
  return { questions: t, extended: n };
}
/**
 * 比较两组问题，忽略补上的默认字段（kind=choice、multiSelect=false）后是否一致。
 */
//@ chunk-a91k35xs.js:4090-4419 placement
function questionsMatchIgnoringDefaults(e, t) {
  if (!Array.isArray(e) || !Array.isArray(t) || e.length !== t.length) return !1;
  let mapped = t.map((s, i) => {
    let r = e[i];
    if (!isPlainObject(s) || !isPlainObject(r)) return s;
    let f = { ...s };
    if (I(s, "kind") === "choice" && !Object.hasOwn(r, "kind")) delete f.kind;
    if (I(s, "multiSelect") === !1 && !Object.hasOwn(r, "multiSelect")) delete f.multiSelect;
    return f;
  });
  return isSameAnswerInput(e, mapped);
}
//@ chunk-a91k35xs.js:4419-4544 placement
function isShownPreview(e, t) {
  if (e.previews.has(t)) return !0;
  for (let preview of e.previews)
    if (
      preview.length <= MAX_PREVIEW_COMPARE_CHARS &&
      displayText(preview) === t &&
      !hasSuspiciousText(preview)
    )
      return !0;
  return !1;
}
//@ chunk-a91k35xs.js:4544-4687 placement
function isPlainObject(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return !1;
  let prototypeOf = Object.getPrototypeOf(e);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-a91k35xs.js:4687-4741 placement
function I(e, t) {
  return Object.hasOwn(e, t) ? e[t] : void 0;
}
//@ chunk-a91k35xs.js:4741-4785 placement
function S(e) {
  return { kind: "refused", rule: e };
}

export { fBt, UNANSWERED_REASONS, V, parseCommaSeparatedValues };
