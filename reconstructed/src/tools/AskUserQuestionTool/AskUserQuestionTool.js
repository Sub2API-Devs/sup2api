/**
 * tools/AskUserQuestionTool/AskUserQuestionTool.tsx
 *
 * AskUserQuestion 工具：1–4 个问题、每题 2–4 选项（扩展模式支持 text/number 题），由权限组件收集答案并映射成给模型的结果文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AskUserQuestionTool/AskUserQuestionTool.tsx
 * pieces: chunk-a91k35xs.js (10), chunk-e6aww6q8.js (2)
 * attribution: fingerprint 7, callgraph-fingerprint 1, layout 3, affinity 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A, M, U, E, pe, Ka, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_QUESTION_HEADER_CHARS,
  ASKUSERQUESTION,
  ASK_USER_QUESTION_DESCRIPTION,
  ASK_USER_QUESTION_BASE_PROMPT,
  ASK_USER_QUESTION_PROMPT_WITH_PLAN_NOTE,
  ASK_ONLY_WHEN_NEEDED_PROMPT,
  EXTENDED_QUESTIONS_PROMPT,
  STANDALONE_QUESTION_PROMPT,
  PREVIEW_FEATURE_PROMPTS,
  escapeDoubleQuoted,
  Bsr,
  FOLLOW_UP_REQUEST_TEXT,
} from "./prompt.js";
import { $as } from "../../services/analytics/juniperShoalConfig.js";
import { UNANSWERED_REASONS, V, parseCommaSeparatedValues, fBt } from "./answerValidation.js";
import {
  getExtendedQuestionsEnabled,
  getQuestionPreviewFormat,
  getQuestionOptionDescriptionsOptional,
} from "../../bootstrap/state.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { gD, nK } from "../../utils/model/promptBundles.js";
import { _1r } from "../AgentTool/agentEffort.js";
import { XQo, Dfi } from "../../constants/promptSections.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { ebe } from "../../utils/permissions/permissions.js";
import { count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { gn } from "../../utils/shortHash.js";
import { getOwn } from "../../utils/objectSafety.js";
import { sanitizeAttentionText } from "../../components/fleet/sessionAttention.js";

//@ chunk-a91k35xs.js:4785-5526 fingerprint = questionOptionSchema (0.784)
var questionOptionSchema = DoctorLazy(() =>
    u({
      label: o().describe(
        "The display text for this option that the user will see and select. Should be concise (1-5 words) and clearly describe the choice.",
      ),
      description: o().describe(
        "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.",
      ),
      preview: o()
        .optional()
        .describe(
          "Optional preview content rendered when this option is focused. Use for mockups, code snippets, or visual comparisons that help users compare options. See the tool description for the expected content format.",
        ),
    }),
  ),
  questionOptionSchemaOptionalDescription = DoctorLazy(() =>
    questionOptionSchema().extend({
      description: o()
        .optional()
        .describe(
          "Optional: add only when the label alone would be ambiguous. One short line on what choosing it leads to.",
        ),
    }),
  );
/**
 * 按给定选项 schema 构造单个问题 schema：question、header（短标签）、options 2–4 项、multiSelect（默认 false）。
 */
//@ chunk-a91k35xs.js:5526-6700 fingerprint = questionSchema (0.844)
function questionSchema(e) {
  return u({
    question: o().describe(
      'The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: "Which library should we use for date formatting?" If multiSelect is true, phrase it accordingly, e.g. "Which features do you want to enable?"',
    ),
    header: o().describe(
      `Very short label displayed as a chip/tag (max ${MAX_QUESTION_HEADER_CHARS} chars). Examples: "Auth method", "Library", "Approach".`,
    ),
    options: A(e)
      .min(2)
      .max(4)
      .describe(
        $as()
          ? "The available choices for this question. Must have 2-4 options (this cap applies to multiSelect too \u2014 group or split if you have more). Each option should be a distinct choice; mutually exclusive unless multiSelect is enabled. There should be no 'Other' option, that will be provided automatically."
          : "The available choices for this question. Must have 2-4 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.",
      ),
    multiSelect: M()
      .default(!1)
      .describe(
        "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.",
      ),
  });
}
/**
 * 扩展问题 schema 的组合校验：placeholder 只给 text，min/max/step/defaultValue/unit 只给 number；choice 至少 2 个选项；text/number 不能有选项或 multiSelect；number 需 min<max 且默认值在区间内。
 */
//@ chunk-a91k35xs.js:6700-11203 callgraph-fingerprint = commonFields (0.195)
var choiceQuestionSchema = DoctorLazy(() => questionSchema(questionOptionSchema())),
  choiceQuestionSchemaOptionalDescription = DoctorLazy(() =>
    questionSchema(questionOptionSchemaOptionalDescription()),
  ),
  QUESTION_KINDS = ["choice", "text", "number"],
  extendedQuestionSchema = DoctorLazy(() =>
    u({
      question: choiceQuestionSchema().shape.question,
      header: choiceQuestionSchema().shape.header,
      kind: U(QUESTION_KINDS)
        .optional()
        .describe(
          'How the user answers. "choice" (the default when omitted): picks from options. "text": a free-text box, no options \u2014 for open-ended input. "number": a slider/stepper between min and max \u2014 for quantities.',
        ),
      description: o().optional().describe("Optional single helper line shown under the question."),
      options: A(questionOptionSchemaOptionalDescription())
        .max(4)
        .default(() => [])
        .describe(
          `Choices for a "choice" question: 2-4 distinct options; with multiSelect false they must be mutually exclusive. Omit for "text" and "number" questions. There should be no 'Other' or 'Skip' option; the form lets the user type their own answer or leave a question unanswered.`,
        ),
      multiSelect: choiceQuestionSchema().shape.multiSelect,
      placeholder: o().optional().describe('"text" questions only: placeholder for the empty text box.'),
      min: E().optional().describe('"number" questions only (required there): lowest value.'),
      max: E().optional().describe('"number" questions only (required there): highest value.'),
      step: E().positive().optional().describe('"number" questions only: increment between values.'),
      defaultValue: E()
        .optional()
        .describe('"number" questions only: the value the control starts at (within min..max).'),
      unit: o()
        .optional()
        .describe('"number" questions only: short unit shown next to the value, e.g. "px", "slides", "%".'),
    }),
  ),
  refinedExtendedQuestionSchema = DoctorLazy(() =>
    extendedQuestionSchema().superRefine((e, t) => {
      let n = e.kind ?? "choice";
      for (let [f, h] of [
        ["placeholder", "text"],
        ["min", "number"],
        ["max", "number"],
        ["step", "number"],
        ["defaultValue", "number"],
        ["unit", "number"],
      ])
        if (n !== h && e[f] !== void 0)
          t.addIssue({ code: "custom", path: [f], message: `${f} applies only to "${h}" questions.` });
      if (n === "choice") {
        if (e.options.length < 2)
          t.addIssue({
            code: "custom",
            path: ["options"],
            message: 'A choice question needs 2-4 options; use kind "text" for an open-ended question.',
          });
        return;
      }
      if (e.options.length > 0)
        t.addIssue({
          code: "custom",
          path: ["options"],
          message: `A "${n}" question takes no options; remove them or omit kind to ask a choice question.`,
        });
      if (e.multiSelect)
        t.addIssue({
          code: "custom",
          path: ["multiSelect"],
          message: `multiSelect applies only to choice questions, not "${n}".`,
        });
      if (n !== "number") return;
      let { min: min, max: max } = e;
      if (min === void 0 || max === void 0 || !(min < max)) {
        t.addIssue({
          code: "custom",
          path: ["min"],
          message: "A number question needs numeric min and max with min < max.",
        });
        return;
      }
      let { defaultValue: defaultValue } = e;
      if (defaultValue !== void 0 && (defaultValue < min || defaultValue > max))
        t.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "defaultValue must lie within min..max.",
        });
    }),
  ),
  questionAnnotationSchema = DoctorLazy(() =>
    u({
      preview: o()
        .optional()
        .describe("The preview content of the selected option, if the question used previews."),
      notes: o().optional().describe("Free-text notes the user added to their selection."),
    }),
  ),
  ANNOTATIONS_DESCRIPTION =
    "Optional per-question annotations from the user (e.g., notes on preview selections). Keyed by question text.",
  annotationsInputSchema = DoctorLazy(() =>
    pe(o(), questionAnnotationSchema()).optional().describe(ANNOTATIONS_DESCRIPTION),
  ),
  annotationsOutputSchema = DoctorLazy(() =>
    pe(
      o(),
      questionAnnotationSchema().extend({
        unanswered: U(UNANSWERED_REASONS)
          .optional()
          .catch(void 0)
          .describe(
            "How the question went unanswered: 'skipped' (the user skipped it), 'replied_in_chat' (the user sent a chat message instead), or 'dismissed' (the user closed the card). The model does not see this field; put the text it should read in `answers`. Absent when the question was answered, and also when the answering client did not report it (in a session that does not advertise ask_user_question_unanswered_v1, from an older client, or in an older transcript): then only the text in `answers` says how it ended. Treat any other value as absent.",
          ),
      }),
    )
      .optional()
      .describe(ANNOTATIONS_DESCRIPTION),
  ),
  UNIQUENESS_REFINE = {
    check: (e) => {
      let mapped = e.questions.map((question) => question.question);
      if (mapped.length !== new Set(mapped).size) return !1;
      for (let question of e.questions) {
        let mapped = question.options.map((option) => option.label);
        if (mapped.length !== new Set(mapped).size) return !1;
      }
      return !0;
    },
    message: "Question texts must be unique, option labels must be unique within each question",
  },
  MAX_ARRAY_LENGTH = 4294967295,
  MAX_ENTRIES_FOR_CLASSIFIER = 256,
  answerValueSchema = DoctorLazy(() =>
    Ka((e) => {
      if (!Array.isArray(e)) return e;
      let t = e.length;
      if (!Number.isInteger(t) || t < 0 || t > MAX_ARRAY_LENGTH) return e;
      let n = "";
      for (let s = 0; s < t; s++) {
        let i = e[s];
        if (typeof i !== "string") return e;
        n = s === 0 ? i : n + ", " + i;
      }
      return n;
    }, o()),
  ),
  answerFieldsSchema = DoctorLazy(() => ({
    answers: pe(o(), answerValueSchema())
      .optional()
      .describe("User answers collected by the permission component"),
    annotations: annotationsInputSchema(),
    metadata: u({
      source: o()
        .optional()
        .describe(
          'Optional identifier for the source of this question (e.g., "remember" for /remember command). Used for analytics tracking.',
        ),
    })
      .optional()
      .describe("Optional metadata for tracking and analytics purposes. Not displayed to user."),
  }));
/**
 * 构造 AskUserQuestion 输入 schema：questions 1–4 项 + answers/annotations/metadata，并附加唯一性 refine。
 */
//@ chunk-a91k35xs.js:11203-11571 fingerprint = inputSchema (0.713)
function inputSchema(e) {
  return zodStrictObject({
    questions: A(e)
      .min(1)
      .max(4)
      .describe(
        $as()
          ? "Questions to ask the user (1-4 questions). The 1-4 questions and 2-4 options bounds are hard schema constraints; do not exceed them even if the user requests more \u2014 split into multiple calls instead."
          : "Questions to ask the user (1-4 questions)",
      ),
    ...answerFieldsSchema(),
  }).refine(UNIQUENESS_REFINE.check, { message: UNIQUENESS_REFINE.message });
}
//@ chunk-a91k35xs.js:11571-12802 fingerprint = outputSchema (0.43)
var askUserQuestionInputSchema = DoctorLazy(() => inputSchema(choiceQuestionSchema())),
  askUserQuestionInputSchemaOptionalDescription = DoctorLazy(() =>
    inputSchema(choiceQuestionSchemaOptionalDescription()),
  ),
  extendedAskUserQuestionInputSchema = DoctorLazy(() =>
    zodStrictObject({
      title: o()
        .optional()
        .describe('Optional single-line heading shown above the questions, e.g. "Before I build your deck".'),
      questions: A(refinedExtendedQuestionSchema())
        .min(1)
        .max(4)
        .describe(
          "Questions to ask the user (1-4, most important first). The 1-4 questions and 2-4 options bounds are hard schema constraints; do not exceed them even if the user requests more \u2014 split into multiple calls instead.",
        ),
      ...answerFieldsSchema(),
    }).refine(UNIQUENESS_REFINE.check, { message: UNIQUENESS_REFINE.message }),
  ),
  askUserQuestionOutputSchema = DoctorLazy(() =>
    u({
      questions: A(choiceQuestionSchema()).describe("The questions that were asked"),
      answers: pe(o(), o()).describe(
        "The answers provided by the user (question text -> answer string; multi-select answers are comma-separated)",
      ),
      response: o()
        .optional()
        .describe("Freeform text the user typed instead of selecting a structured option"),
      annotations: annotationsOutputSchema(),
      afkTimeoutMs: E()
        .int()
        .positive()
        .optional()
        .describe(
          "Set when the dialog auto-resolved after this many milliseconds of idle (user away from keyboard). Absent on every human-resolved path.",
        ),
    }),
  ),
  extendedAskUserQuestionOutputSchema = DoctorLazy(() =>
    askUserQuestionOutputSchema().extend({
      questions: A(extendedQuestionSchema()).describe("The questions that were asked"),
      followUp: M()
        .optional()
        .describe(
          "Set when the user asked for another round of questions instead of (or after partially) answering.",
        ),
    }),
  );
/**
 * AskUserQuestion 中"只有备注、未选选项"的答案占位文本 "(notes only)"，权限组件写入、结果映射时视为未选。
 */
//@ chunk-a91k35xs.js:12802-12825 layout
var NOTES_ONLY_ANSWER = "(notes only)";
/**
 * AFK 超时后返回给模型的说明：用户可能离开，按已有上下文自行判断，之后可再问。
 */
//@ chunk-a91k35xs.js:12825-13052 layout
function formatAfkTimeoutMessage(e) {
  return `No response after ${Math.round(e / 1000)}s \u2014 the user may be away from keyboard. Proceed using your best judgment based on the context so far; you can re-ask this question later if it's still relevant.`;
}
/**
 * 生成展示给卡片/外部 UI 的输入（title、questions、metadata），扩展模式下给缺省 kind 填 "choice"。
 */
//@ chunk-a91k35xs.js:13052-13251 layout
function toShownCardInput(e) {
  return {
    ...("title" in e && e.title && { title: e.title }),
    questions: getExtendedQuestionsEnabled()
      ? e.questions.map((question) => ({
          ...question,
          kind: "kind" in question && question.kind ? question.kind : "choice",
        }))
      : e.questions,
    ...(e.metadata && { metadata: e.metadata }),
  };
}
/**
 * AskUserQuestion 工具（只读、可并发、requiresUserInteraction；isEnabled 为 ebe()：非交互会话且没有可用的提问通道时关闭）。输入 1–4 个问题，每题 2–4 个选项（扩展模式下支持 kind text/number 与 title），问题文本与选项 label 必须唯一；HTML 预览格式下校验预览为不含 script/style 的 HTML 片段。checkPermissions 恒为 ask（由权限组件收集答案写回 answers/annotations）。结果文本区分：AFK 超时、要求追问（followUp）、自由回复、答案全部合规、答案需细读、未作答。prompt 由多段拼成（计划模式说明、GrowthBook tengu_cinder_plover/tengu_cinder_wren 追加文本、扩展问题说明、preview 说明）。
 */
//@ chunk-a91k35xs.js:13251-20068 fingerprint = AskUserQuestionTool (0.356)
var AskUserQuestionTool = buildTool({
  name: ASKUSERQUESTION,
  searchHint: "prompt the user with a multiple-choice question",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return ASK_USER_QUESTION_DESCRIPTION;
  },
  async prompt({ model: e, leanPrompt: t, tools: n, leanRewrite: s }) {
    let i = gD({ model: e, leanPrompt: t }),
      r = _1r(n),
      f =
        i && nK({ model: e, leanRewrite: s })
          ? r
            ? XQo
            : Dfi
          : r
            ? ASK_USER_QUESTION_BASE_PROMPT
            : ASK_USER_QUESTION_PROMPT_WITH_PLAN_NOTE,
      h = "";
    if (i) {
      let trimmed = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cinder_plover", "").trim();
      h = trimmed
        ? `
${trimmed}
`
        : ASK_ONLY_WHEN_NEEDED_PROMPT;
    }
    let m = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cinder_wren", ""),
      l = typeof m === "string" ? m.trim() : "",
      w = l
        ? `
${l}
`
        : "",
      O = getExtendedQuestionsEnabled() ? EXTENDED_QUESTIONS_PROMPT : "",
      q = f + h + STANDALONE_QUESTION_PROMPT + w + O,
      d = getQuestionPreviewFormat();
    if (d === void 0) return q;
    return q + PREVIEW_FEATURE_PROMPTS[d];
  },
  get inputSchema() {
    if (getExtendedQuestionsEnabled()) return extendedAskUserQuestionInputSchema();
    return getQuestionOptionDescriptionsOptional()
      ? askUserQuestionInputSchemaOptionalDescription()
      : askUserQuestionInputSchema();
  },
  get outputSchema() {
    return extendedAskUserQuestionOutputSchema();
  },
  userFacingName() {
    return "";
  },
  validationErrorSteer(e) {
    if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
    let questions = e.questions;
    if (!Array.isArray(questions)) return null;
    let n = !1,
      s = questions.length;
    if (!Number.isInteger(s) || s < 0 || s > MAX_ARRAY_LENGTH) return null;
    for (let i = 0; i < s && i < MAX_ENTRIES_FOR_CLASSIFIER; i++) {
      let r = questions[i];
      if (typeof r !== "object" || r === null || Array.isArray(r)) continue;
      if (getExtendedQuestionsEnabled()) {
        let kind = r.kind;
        if (kind === "text" || kind === "number") continue;
      }
      let options = r.options;
      if (Array.isArray(options) && options.length < 2) {
        n = !0;
        break;
      }
    }
    if (!n) return null;
    if (getExtendedQuestionsEnabled())
      return 'This call included a choice question with fewer than 2 options, so it was rejected and the person never saw it. If that question is open-ended, re-ask it with "kind": "text" and no options; if there is really only one path, state it as the approach you are taking and continue with the task. Do not invent a filler second option.';
    return "This call included a question with fewer than 2 options, so it was rejected and the person never saw it. A question with a single option has no decision in it. Do not retry this call and do not invent a filler second option. Instead, state the one path you were going to offer as the approach you are taking, then continue with the task. If this call also contained questions with 2 to 4 options (each with distinct labels), you may re-ask those questions alone in a new call. Ask a question only when the person has at least two genuinely distinct choices.";
  },
  isEnabled() {
    return ebe();
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(e) {
    let t = escapeDoubleQuoted,
      n = getExtendedQuestionsEnabled();
    try {
      let s = typeof e === "object" && e !== null ? e.questions : void 0;
      if (!Array.isArray(s)) return "[malformed AskUserQuestion input]";
      let i = [],
        r = s.length;
      if (!Number.isInteger(r) || r < 0 || r > MAX_ARRAY_LENGTH) return "[malformed AskUserQuestion input]";
      for (let h = 0; h < r; h++) {
        if (i.length >= MAX_ENTRIES_FOR_CLASSIFIER) {
          i.push(`[\u2026 further question entries elided: reported length ${r}]`);
          break;
        }
        let m = s[h];
        if (typeof m !== "object" || m === null) {
          let b = t(m);
          i.push(b ? `[malformed question entry] ${b}` : "[malformed question entry]");
          continue;
        }
        let options = m.options,
          w = [];
        if (Array.isArray(options)) {
          let b = options.length;
          for (let y = 0; y < b; y++) {
            if (w.length >= MAX_ENTRIES_FOR_CLASSIFIER) {
              w.push("[\u2026 further option entries elided]");
              break;
            }
            let k = options[y];
            if (typeof k !== "object" || k === null) {
              w.push(`(${y + 1}) "${t(k)}"`);
              continue;
            }
            let g = k,
              x = [`(${y + 1}) "${t(g.label)}"`],
              z = t(g.description);
            if (z) x.push(`\u2014 ${z}`);
            let Q = t(g.preview);
            if (Q) x.push(`[preview: ${Q}]`);
            w.push(x.join(" "));
          }
        }
        let joined = w.join(" "),
          q = m.multiSelect === !0 ? " [multiSelect]" : "",
          d = t(m.header),
          R = d ? ` [header: ${d}]` : "",
          T = "";
        if (n) {
          let b = m;
          for (let [y, k] of [
            ["kind", t(b.kind)],
            ["description", t(b.description)],
            ["placeholder", t(b.placeholder)],
            ["min", Bsr(b.min)],
            ["max", Bsr(b.max)],
            ["step", Bsr(b.step)],
            ["default", Bsr(b.defaultValue)],
            ["unit", t(b.unit)],
          ])
            if (k) T += ` [${y}: ${k}]`;
        }
        i.push(`"${t(m.question)}"${R}${T}${q} options: ${joined}`);
      }
      if (i.length === 0) return "[malformed AskUserQuestion input]";
      let f = n ? t(e.title) : "";
      return (f ? `[title: ${f}] ` : "") + i.join(" | ");
    } catch {
      return "[malformed AskUserQuestion input]";
    }
  },
  admitCardAnswer: V,
  shownCardInput: toShownCardInput,
  requiresUserInteraction() {
    return !0;
  },
  renderToolUseMessage() {
    return null;
  },
  create() {
    return {
      async validateInput({ questions: e }) {
        if (getQuestionPreviewFormat() !== "html") return { result: !0 };
        for (let t of e)
          for (let option of t.options) {
            let s = validateHtmlPreview(option.preview);
            if (s)
              return {
                result: !1,
                message: `Option "${option.label}" in question "${t.question}": ${s}`,
                errorCode: 1,
              };
          }
        return { result: !0 };
      },
      async checkPermissions(e) {
        return { behavior: "ask", message: "Answer questions?", updatedInput: toShownCardInput(e) };
      },
      async call(e) {
        let { answers: answers = {}, annotations: annotations } = e,
          mapped = e.questions.map((question) =>
            Array.isArray(question.options) ? question : { ...question, options: [] },
          ),
          { response: response, afkTimeoutMs: afkTimeoutMs, followUp: followUp } = e,
          m = count(mapped, ({ question: question }) => {
            let w = answers[question];
            return Array.isArray(w)
              ? w.length > 0
              : typeof w === "string" && w !== "" && w !== NOTES_ONLY_ANSWER;
          });
        return (
          logEvent("tengu_ask_user_question_completed", {
            extended: getExtendedQuestionsEnabled(),
            questionCount: mapped.length,
            choiceCount: count(mapped, (l) => (l.kind ?? "choice") === "choice" && !l.multiSelect),
            multiSelectCount: count(mapped, (l) => (l.kind ?? "choice") === "choice" && l.multiSelect),
            textCount: count(mapped, (l) => l.kind === "text"),
            numberCount: count(mapped, (l) => l.kind === "number"),
            answerCount: m,
            followUp: followUp === !0,
            outcome: fromEnum(
              afkTimeoutMs
                ? "afk_timeout"
                : followUp
                  ? "follow_up"
                  : response?.trim()
                    ? "responded"
                    : m > 0
                      ? "answered"
                      : "unanswered",
            ),
            ...(e.metadata?.source && { source_hash: gn(e.metadata.source) }),
          }),
          {
            data: {
              questions: mapped,
              answers: answers,
              ...(response?.trim() && { response: response }),
              ...(annotations && { annotations: annotations }),
              ...(afkTimeoutMs && { afkTimeoutMs: afkTimeoutMs }),
              ...(followUp === !0 && { followUp: !0 }),
            },
          }
        );
      },
    };
  },
  mapToolResultToToolResultBlockParam(
    { questions: e, answers: t, response: n, annotations: s, afkTimeoutMs: i, followUp: r },
    f,
  ) {
    let joined = e
        .map(({ question: question }) => {
          let w = getOwn(t, question),
            O = s && getOwn(s, question),
            q = w && w !== NOTES_ONLY_ANSWER;
          if (!q && !O?.notes) return null;
          let d = [q ? `"${question}"="${w}"` : `"${question}"=(no option selected)`];
          if (O?.preview)
            d.push(`selected preview:
${O.preview}`);
          if (O?.notes) d.push(`notes: ${O.notes}`);
          return d.join(" ");
        })
        .filter((l) => l !== null)
        .join(", "),
      m;
    if (i)
      m = joined
        ? `${formatAfkTimeoutMessage(i)}

Before going idle the user had selected: ${joined}.`
        : formatAfkTimeoutMessage(i);
    else if (r) {
      let l = n?.trim() ? ` They also wrote: "${n}".` : "";
      m = joined
        ? `${FOLLOW_UP_REQUEST_TEXT} before you proceed. So far they answered: ${joined}.${l} Call ${ASKUSERQUESTION} again with follow-up questions that build on these answers (do not repeat these); do not start the task yet.`
        : `${FOLLOW_UP_REQUEST_TEXT} before answering.${l} Call ${ASKUSERQUESTION} again now with further questions about this decision (do not repeat these); do not proceed with the task yet.`;
    } else if (n?.trim()) m = `The user responded: ${n}`;
    else if (joined)
      m = e.every(
        ({
          question: question,
          options: options,
          multiSelect: multiSelect,
          kind: kind,
          min: min,
          max: max,
        }) => {
          if ((s && getOwn(s, question))?.notes) return !1;
          if (kind === "text" || kind === "number") {
            let x = getOwn(t, question);
            if (x === void 0 || x === "") return !0;
            if (kind === "text" || typeof x !== "string") return !1;
            let trimmed = x.trim(),
              Q = Number(trimmed);
            return (
              /^-?\d+(\.\d+)?$/.test(trimmed) &&
              Number.isFinite(Q) &&
              (min === void 0 || Q >= min) &&
              (max === void 0 || Q <= max)
            );
          }
          let y = getOwn(t, question),
            k = new Set(options.map((x) => x.label));
          if (Array.isArray(y)) return multiSelect && y.length > 0 && y.every((x) => k.has(x));
          if (!y || y === NOTES_ONLY_ANSWER) return !0;
          if (k.has(y)) return !0;
          if (!multiSelect) return !1;
          let g = parseCommaSeparatedValues(y);
          return g !== null && g.length >= 1 && fBt(g) === y && g.every((x) => k.has(x));
        },
      )
        ? `Your questions have been answered: ${joined}. You can now continue with these answers in mind.`
        : `The user answered: ${joined}. Read the answers carefully \u2014 they may request clarification, changes, or that you not proceed \u2014 and follow what they actually say.`;
    else m = "The user did not answer the questions.";
    return { type: "tool_result", content: m, tool_use_id: f };
  },
});
/**
 * 校验 HTML 预览：不能是完整文档、不能含 script/style、必须含 HTML 标签；返回错误文本或 null。
 */
//@ chunk-a91k35xs.js:20068-20545 fingerprint = validateHtmlPreview (1)
function validateHtmlPreview(preview) {
  if (preview === void 0) return null;
  if (/<\s*(html|body|!doctype)\b/i.test(preview))
    return "preview must be an HTML fragment, not a full document (no <html>, <body>, or <!DOCTYPE>)";
  if (/<\s*(script|style)\b/i.test(preview))
    return "preview must not contain <script> or <style> tags. Use inline styles via the style attribute if needed.";
  if (!/<[a-z][^>]*>/i.test(preview))
    return 'preview must contain HTML (previewFormat is set to "html"). Wrap content in a tag like <div> or <pre>.';
  return null;
}
/**
 * 把任意输入清洗成 {questions:[{question, options:[{label}]}]}，只保留第一题、每题最多 4 个选项，丢弃空文本。
 */
//@ chunk-e6aww6q8.js:1729603-1729837 fingerprint = UNIQUENESS_REFINE (0.523)
function UNIQUENESS_REFINE_2(e) {
  let [n] = takeFirstFourObjects([e]);
  return {
    questions: takeFirstFourObjects(n?.questions)
      .flatMap((r) => {
        let s = sanitizeAttentionText(r.question);
        return s === ""
          ? []
          : [
              {
                question: s,
                options: takeFirstFourObjects(r.options).flatMap((h) => {
                  let y = sanitizeAttentionText(h.label);
                  return y === "" ? [] : [{ label: y }];
                }),
              },
            ];
      })
      .slice(0, 1),
  };
}
//@ chunk-e6aww6q8.js:1729837-1729936 affinity
function takeFirstFourObjects(e) {
  return Array.isArray(e) ? e.slice(0, 4).filter((n) => typeof n === "object" && n !== null) : [];
}

export { NOTES_ONLY_ANSWER, AskUserQuestionTool, UNIQUENESS_REFINE_2 };
