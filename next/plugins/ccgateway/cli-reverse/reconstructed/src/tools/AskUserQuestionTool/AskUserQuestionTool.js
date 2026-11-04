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
import { sanitizeAttentionText } from "../../components/fleet/sessionAttention.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  booleanSchema,
  _enum,
  numberSchema,
  record,
  preprocess,
  zodStrictObject,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
  stringifyPromptScalar,
  FOLLOW_UP_REQUEST_TEXT,
} from "./prompt.js";
import { schemaDescFixesConfig } from "../../services/analytics/juniperShoalConfig.js";
import {
  UNANSWERED_REASONS,
  admitAnswerInputSafely,
  parseCommaSeparatedValues,
  formatSelectionList,
} from "./answerValidation.js";
import {
  getExtendedQuestionsEnabled,
  getQuestionPreviewFormat,
  getQuestionOptionDescriptionsOptional,
} from "../../bootstrap/state.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { leanPromptOf, leanRewriteOf } from "../../utils/model/promptBundles.js";
import { isPlanModeToolUnavailable } from "../AgentTool/agentEffort.js";
import { ASK_USER_QUESTION_SECTION, PLAN_MODE_ASK_NOTE } from "../../constants/promptSections.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { canPromptUserForPermission } from "../../utils/permissions/permissions.js";
import { count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import { getOwn } from "../../utils/objectSafety.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1729603-1729837 fingerprint (2.1.88 match: UNIQUENESS_REFINE, 0.523)
/**
 * 把任意输入清洗成 {questions:[{question, options:[{label}]}]}，只保留第一题、每题最多 4 个选项，丢弃空文本。
 */
function UNIQUENESS_REFINE_2(input) {
  let [firstInput] = takeFirstFourObjects([input]);
  return {
    questions: takeFirstFourObjects(firstInput?.questions)
      .flatMap((question) => {
        let questionText = sanitizeAttentionText(question.question);
        return questionText === ""
          ? []
          : [
              {
                question: questionText,
                options: takeFirstFourObjects(question.options).flatMap((option) => {
                  let label = sanitizeAttentionText(option.label);
                  return label === ""
                    ? []
                    : [
                        {
                          label,
                        },
                      ];
                }),
              },
            ];
      })
      .slice(0, 1),
  };
}
//@ chunk-e6aww6q8.js:1729837-1729936 affinity
function takeFirstFourObjects(value) {
  return Array.isArray(value)
    ? value.slice(0, 4).filter((entry) => typeof entry === "object" && entry !== null)
    : [];
}
//@ chunk-a91k35xs.js:4785-5526 fingerprint (2.1.88 match: questionOptionSchema, 0.784)
var questionOptionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var questionOptionSchemaOptionalDescription;
deferInit("chunk-a91k35xs.js:4785", () => {
  questionOptionSchema = DoctorLazy(() =>
    objectSchema({
      label: stringSchema().describe(
        "The display text for this option that the user will see and select. Should be concise (1-5 words) and clearly describe the choice.",
      ),
      description: stringSchema().describe(
        "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.",
      ),
      preview: stringSchema()
        .optional()
        .describe(
          "Optional preview content rendered when this option is focused. Use for mockups, code snippets, or visual comparisons that help users compare options. See the tool description for the expected content format.",
        ),
    }),
  );
  questionOptionSchemaOptionalDescription = DoctorLazy(() =>
    questionOptionSchema().extend({
      description: stringSchema()
        .optional()
        .describe(
          "Optional: add only when the label alone would be ambiguous. One short line on what choosing it leads to.",
        ),
    }),
  );
});
//@ chunk-a91k35xs.js:5526-6700 fingerprint (2.1.88 match: questionSchema, 0.844)
/**
 * 按给定选项 schema 构造单个问题 schema：question、header（短标签）、options 2–4 项、multiSelect（默认 false）。
 */
function questionSchema(optionSchema) {
  return objectSchema({
    question: stringSchema().describe(
      'The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: "Which library should we use for date formatting?" If multiSelect is true, phrase it accordingly, e.g. "Which features do you want to enable?"',
    ),
    header: stringSchema().describe(
      `Very short label displayed as a chip/tag (max ${MAX_QUESTION_HEADER_CHARS} chars). Examples: "Auth method", "Library", "Approach".`,
    ),
    options: array(optionSchema)
      .min(2)
      .max(4)
      .describe(
        schemaDescFixesConfig()
          ? "The available choices for this question. Must have 2-4 options (this cap applies to multiSelect too \u2014 group or split if you have more). Each option should be a distinct choice; mutually exclusive unless multiSelect is enabled. There should be no 'Other' option, that will be provided automatically."
          : "The available choices for this question. Must have 2-4 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.",
      ),
    multiSelect: booleanSchema()
      .default(false)
      .describe(
        "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.",
      ),
  });
}
//@ chunk-a91k35xs.js:6700-11203 callgraph-fingerprint (2.1.88 match: commonFields, 0.195)
/**
 * 扩展问题 schema 的组合校验：placeholder 只给 text，min/max/step/defaultValue/unit 只给 number；choice 至少 2 个选项；text/number 不能有选项或 multiSelect；number 需 min<max 且默认值在区间内。
 */
var choiceQuestionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var choiceQuestionSchemaOptionalDescription;
var QUESTION_KINDS;
var extendedQuestionSchema;
var refinedExtendedQuestionSchema;
var questionAnnotationSchema;
var ANNOTATIONS_DESCRIPTION;
var annotationsInputSchema;
var annotationsOutputSchema;
var UNIQUENESS_REFINE;
var MAX_ARRAY_LENGTH;
var MAX_ENTRIES_FOR_CLASSIFIER;
var answerValueSchema;
var answerFieldsSchema;
deferInit("chunk-a91k35xs.js:6700", () => {
  choiceQuestionSchema = DoctorLazy(() => questionSchema(questionOptionSchema()));
  choiceQuestionSchemaOptionalDescription = DoctorLazy(() =>
    questionSchema(questionOptionSchemaOptionalDescription()),
  );
  QUESTION_KINDS = ["choice", "text", "number"];
  extendedQuestionSchema = DoctorLazy(() =>
    objectSchema({
      question: choiceQuestionSchema().shape.question,
      header: choiceQuestionSchema().shape.header,
      kind: _enum(QUESTION_KINDS)
        .optional()
        .describe(
          'How the user answers. "choice" (the default when omitted): picks from options. "text": a free-text box, no options \u2014 for open-ended input. "number": a slider/stepper between min and max \u2014 for quantities.',
        ),
      description: stringSchema()
        .optional()
        .describe("Optional single helper line shown under the question."),
      options: array(questionOptionSchemaOptionalDescription())
        .max(4)
        .default(() => [])
        .describe(
          `Choices for a "choice" question: 2-4 distinct options; with multiSelect false they must be mutually exclusive. Omit for "text" and "number" questions. There should be no 'Other' or 'Skip' option; the form lets the user type their own answer or leave a question unanswered.`,
        ),
      multiSelect: choiceQuestionSchema().shape.multiSelect,
      placeholder: stringSchema()
        .optional()
        .describe('"text" questions only: placeholder for the empty text box.'),
      min: numberSchema().optional().describe('"number" questions only (required there): lowest value.'),
      max: numberSchema().optional().describe('"number" questions only (required there): highest value.'),
      step: numberSchema()
        .positive()
        .optional()
        .describe('"number" questions only: increment between values.'),
      defaultValue: numberSchema()
        .optional()
        .describe('"number" questions only: the value the control starts at (within min..max).'),
      unit: stringSchema()
        .optional()
        .describe('"number" questions only: short unit shown next to the value, e.g. "px", "slides", "%".'),
    }),
  );
  refinedExtendedQuestionSchema = DoctorLazy(() =>
    extendedQuestionSchema().superRefine((value, ctx) => {
      let kind = value.kind ?? "choice";
      for (let [field, expectedKind] of [
        ["placeholder", "text"],
        ["min", "number"],
        ["max", "number"],
        ["step", "number"],
        ["defaultValue", "number"],
        ["unit", "number"],
      ])
        if (kind !== expectedKind && value[field] !== undefined)
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} applies only to "${expectedKind}" questions.`,
          });
      if (kind === "choice") {
        if (value.options.length < 2)
          ctx.addIssue({
            code: "custom",
            path: ["options"],
            message: 'A choice question needs 2-4 options; use kind "text" for an open-ended question.',
          });
        return;
      }
      if (value.options.length > 0)
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: `A "${kind}" question takes no options; remove them or omit kind to ask a choice question.`,
        });
      if (value.multiSelect)
        ctx.addIssue({
          code: "custom",
          path: ["multiSelect"],
          message: `multiSelect applies only to choice questions, not "${kind}".`,
        });
      if (kind !== "number") return;
      let { min, max } = value;
      if (min === undefined || max === undefined || !(min < max)) {
        ctx.addIssue({
          code: "custom",
          path: ["min"],
          message: "A number question needs numeric min and max with min < max.",
        });
        return;
      }
      let { defaultValue } = value;
      if (defaultValue !== undefined && (defaultValue < min || defaultValue > max))
        ctx.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "defaultValue must lie within min..max.",
        });
    }),
  );
  questionAnnotationSchema = DoctorLazy(() =>
    objectSchema({
      preview: stringSchema()
        .optional()
        .describe("The preview content of the selected option, if the question used previews."),
      notes: stringSchema().optional().describe("Free-text notes the user added to their selection."),
    }),
  );
  ANNOTATIONS_DESCRIPTION =
    "Optional per-question annotations from the user (e.g., notes on preview selections). Keyed by question text.";
  annotationsInputSchema = DoctorLazy(() =>
    record(stringSchema(), questionAnnotationSchema()).optional().describe(ANNOTATIONS_DESCRIPTION),
  );
  annotationsOutputSchema = DoctorLazy(() =>
    record(
      stringSchema(),
      questionAnnotationSchema().extend({
        unanswered: _enum(UNANSWERED_REASONS)
          .optional()
          .catch(undefined)
          .describe(
            "How the question went unanswered: 'skipped' (the user skipped it), 'replied_in_chat' (the user sent a chat message instead), or 'dismissed' (the user closed the card). The model does not see this field; put the text it should read in `answers`. Absent when the question was answered, and also when the answering client did not report it (in a session that does not advertise ask_user_question_unanswered_v1, from an older client, or in an older transcript): then only the text in `answers` says how it ended. Treat any other value as absent.",
          ),
      }),
    )
      .optional()
      .describe(ANNOTATIONS_DESCRIPTION),
  );
  UNIQUENESS_REFINE = {
    check: (data) => {
      let questions = data.questions.map((question) => question.question);
      if (questions.length !== new Set(questions).size) return false;
      for (let question of data.questions) {
        let labels = question.options.map((opt) => opt.label);
        if (labels.length !== new Set(labels).size) return false;
      }
      return true;
    },
    message: "Question texts must be unique, option labels must be unique within each question",
  };
  MAX_ARRAY_LENGTH = 4294967295;
  MAX_ENTRIES_FOR_CLASSIFIER = 256;
  answerValueSchema = DoctorLazy(() =>
    preprocess((value) => {
      if (!Array.isArray(value)) return value;
      let entryCount = value.length;
      if (!Number.isInteger(entryCount) || entryCount < 0 || entryCount > MAX_ARRAY_LENGTH) return value;
      let joined = "";
      for (let k = 0; k < entryCount; k++) {
        let entry = value[k];
        if (typeof entry !== "string") return value;
        joined = k === 0 ? entry : joined + ", " + entry;
      }
      return joined;
    }, stringSchema()),
  );
  answerFieldsSchema = DoctorLazy(() => ({
    answers: record(stringSchema(), answerValueSchema())
      .optional()
      .describe("User answers collected by the permission component"),
    annotations: annotationsInputSchema(),
    metadata: objectSchema({
      source: stringSchema()
        .optional()
        .describe(
          'Optional identifier for the source of this question (e.g., "remember" for /remember command). Used for analytics tracking.',
        ),
    })
      .optional()
      .describe("Optional metadata for tracking and analytics purposes. Not displayed to user."),
  }));
});
//@ chunk-a91k35xs.js:11203-11571 fingerprint (2.1.88 match: inputSchema, 0.713)
/**
 * 构造 AskUserQuestion 输入 schema：questions 1–4 项 + answers/annotations/metadata，并附加唯一性 refine。
 */
function inputSchema(questionSchema) {
  return zodStrictObject({
    questions: array(questionSchema)
      .min(1)
      .max(4)
      .describe(
        schemaDescFixesConfig()
          ? "Questions to ask the user (1-4 questions). The 1-4 questions and 2-4 options bounds are hard schema constraints; do not exceed them even if the user requests more \u2014 split into multiple calls instead."
          : "Questions to ask the user (1-4 questions)",
      ),
    ...answerFieldsSchema(),
  }).refine(UNIQUENESS_REFINE.check, {
    message: UNIQUENESS_REFINE.message,
  });
}
//@ chunk-a91k35xs.js:11571-12802 fingerprint (2.1.88 match: outputSchema, 0.43)
var askUserQuestionInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var askUserQuestionInputSchemaOptionalDescription;
var extendedAskUserQuestionInputSchema;
var askUserQuestionOutputSchema;
var extendedAskUserQuestionOutputSchema;
deferInit("chunk-a91k35xs.js:11571", () => {
  askUserQuestionInputSchema = DoctorLazy(() => inputSchema(choiceQuestionSchema()));
  askUserQuestionInputSchemaOptionalDescription = DoctorLazy(() =>
    inputSchema(choiceQuestionSchemaOptionalDescription()),
  );
  extendedAskUserQuestionInputSchema = DoctorLazy(() =>
    zodStrictObject({
      title: stringSchema()
        .optional()
        .describe('Optional single-line heading shown above the questions, e.g. "Before I build your deck".'),
      questions: array(refinedExtendedQuestionSchema())
        .min(1)
        .max(4)
        .describe(
          "Questions to ask the user (1-4, most important first). The 1-4 questions and 2-4 options bounds are hard schema constraints; do not exceed them even if the user requests more \u2014 split into multiple calls instead.",
        ),
      ...answerFieldsSchema(),
    }).refine(UNIQUENESS_REFINE.check, {
      message: UNIQUENESS_REFINE.message,
    }),
  );
  askUserQuestionOutputSchema = DoctorLazy(() =>
    objectSchema({
      questions: array(choiceQuestionSchema()).describe("The questions that were asked"),
      answers: record(stringSchema(), stringSchema()).describe(
        "The answers provided by the user (question text -> answer string; multi-select answers are comma-separated)",
      ),
      response: stringSchema()
        .optional()
        .describe("Freeform text the user typed instead of selecting a structured option"),
      annotations: annotationsOutputSchema(),
      afkTimeoutMs: numberSchema()
        .int()
        .positive()
        .optional()
        .describe(
          "Set when the dialog auto-resolved after this many milliseconds of idle (user away from keyboard). Absent on every human-resolved path.",
        ),
    }),
  );
  extendedAskUserQuestionOutputSchema = DoctorLazy(() =>
    askUserQuestionOutputSchema().extend({
      questions: array(extendedQuestionSchema()).describe("The questions that were asked"),
      followUp: booleanSchema()
        .optional()
        .describe(
          "Set when the user asked for another round of questions instead of (or after partially) answering.",
        ),
    }),
  );
});
//@ chunk-a91k35xs.js:12802-12825 layout
/**
 * AskUserQuestion 中"只有备注、未选选项"的答案占位文本 "(notes only)"，权限组件写入、结果映射时视为未选。
 */
var NOTES_ONLY_ANSWER = "(notes only)";
//@ chunk-a91k35xs.js:12825-13052 layout
/**
 * AFK 超时后返回给模型的说明：用户可能离开，按已有上下文自行判断，之后可再问。
 */
function formatAfkTimeoutMessage(afkTimeoutMs) {
  return `No response after ${Math.round(afkTimeoutMs / 1000)}s \u2014 the user may be away from keyboard. Proceed using your best judgment based on the context so far; you can re-ask this question later if it's still relevant.`;
}
//@ chunk-a91k35xs.js:13052-13251 layout
/**
 * 生成展示给卡片/外部 UI 的输入（title、questions、metadata），扩展模式下给缺省 kind 填 "choice"。
 */
function toShownCardInput(input) {
  return {
    ...("title" in input &&
      input.title && {
        title: input.title,
      }),
    questions: getExtendedQuestionsEnabled()
      ? input.questions.map((question) => ({
          ...question,
          kind: "kind" in question && question.kind ? question.kind : "choice",
        }))
      : input.questions,
    ...(input.metadata && {
      metadata: input.metadata,
    }),
  };
}
//@ chunk-a91k35xs.js:13251-20068 fingerprint (2.1.88 match: AskUserQuestionTool, 0.356)
/**
 * AskUserQuestion 工具（只读、可并发、requiresUserInteraction；isEnabled 为 ebe()：非交互会话且没有可用的提问通道时关闭）。输入 1–4 个问题，每题 2–4 个选项（扩展模式下支持 kind text/number 与 title），问题文本与选项 label 必须唯一；HTML 预览格式下校验预览为不含 script/style 的 HTML 片段。checkPermissions 恒为 ask（由权限组件收集答案写回 answers/annotations）。结果文本区分：AFK 超时、要求追问（followUp）、自由回复、答案全部合规、答案需细读、未作答。prompt 由多段拼成（计划模式说明、GrowthBook tengu_cinder_plover/tengu_cinder_wren 追加文本、扩展问题说明、preview 说明）。
 */
var AskUserQuestionTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a91k35xs.js:13251", () => {
  AskUserQuestionTool = buildTool({
    name: ASKUSERQUESTION,
    searchHint: "prompt the user with a multiple-choice question",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return ASK_USER_QUESTION_DESCRIPTION;
    },
    async prompt({ model, leanPrompt, tools, leanRewrite }) {
      let isLeanPrompt = leanPromptOf({
        model,
        leanPrompt,
      });
      let isPlanModeUnavailable = isPlanModeToolUnavailable(tools);
      let basePrompt =
        isLeanPrompt &&
        leanRewriteOf({
          model,
          leanRewrite,
        })
          ? isPlanModeUnavailable
            ? ASK_USER_QUESTION_SECTION
            : PLAN_MODE_ASK_NOTE
          : isPlanModeUnavailable
            ? ASK_USER_QUESTION_BASE_PROMPT
            : ASK_USER_QUESTION_PROMPT_WITH_PLAN_NOTE;
      let featurePrompt = "";
      if (isLeanPrompt) {
        let trimmed = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cinder_plover", "").trim();
        featurePrompt = trimmed
          ? `
${trimmed}
`
          : ASK_ONLY_WHEN_NEEDED_PROMPT;
      }
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cinder_wren", "");
      let wrenPrompt =
        typeof featureValue_CACHED_MAY_BE_STALE === "string" ? featureValue_CACHED_MAY_BE_STALE.trim() : "";
      let wrenSection = wrenPrompt
        ? `
${wrenPrompt}
`
        : "";
      let extendedQuestionsSection = getExtendedQuestionsEnabled() ? EXTENDED_QUESTIONS_PROMPT : "";
      let fullPrompt =
        basePrompt + featurePrompt + STANDALONE_QUESTION_PROMPT + wrenSection + extendedQuestionsSection;
      let questionPreviewFormat = getQuestionPreviewFormat();
      if (questionPreviewFormat === undefined) return fullPrompt;
      return fullPrompt + PREVIEW_FEATURE_PROMPTS[questionPreviewFormat];
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
    validationErrorSteer(input) {
      if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
      let questions = input.questions;
      if (!Array.isArray(questions)) return null;
      let hasQuestionWithTooFewOptions = false;
      let questionCount = questions.length;
      if (!Number.isInteger(questionCount) || questionCount < 0 || questionCount > MAX_ARRAY_LENGTH)
        return null;
      for (let idx = 0; idx < questionCount && idx < MAX_ENTRIES_FOR_CLASSIFIER; idx++) {
        let question = questions[idx];
        if (typeof question !== "object" || question === null || Array.isArray(question)) continue;
        if (getExtendedQuestionsEnabled()) {
          let kind = question.kind;
          if (kind === "text" || kind === "number") continue;
        }
        let options = question.options;
        if (Array.isArray(options) && options.length < 2) {
          hasQuestionWithTooFewOptions = true;
          break;
        }
      }
      if (!hasQuestionWithTooFewOptions) return null;
      if (getExtendedQuestionsEnabled())
        return 'This call included a choice question with fewer than 2 options, so it was rejected and the person never saw it. If that question is open-ended, re-ask it with "kind": "text" and no options; if there is really only one path, state it as the approach you are taking and continue with the task. Do not invent a filler second option.';
      return "This call included a question with fewer than 2 options, so it was rejected and the person never saw it. A question with a single option has no decision in it. Do not retry this call and do not invent a filler second option. Instead, state the one path you were going to offer as the approach you are taking, then continue with the task. If this call also contained questions with 2 to 4 options (each with distinct labels), you may re-ask those questions alone in a new call. Ask a question only when the person has at least two genuinely distinct choices.";
    },
    isEnabled() {
      return canPromptUserForPermission();
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      let stringifyForDisplay = escapeDoubleQuoted;
      let extendedQuestionsEnabled = getExtendedQuestionsEnabled();
      try {
        let questions = typeof input === "object" && input !== null ? input.questions : undefined;
        if (!Array.isArray(questions)) return "[malformed AskUserQuestion input]";
        let questionParts = [];
        let questionCount = questions.length;
        if (!Number.isInteger(questionCount) || questionCount < 0 || questionCount > MAX_ARRAY_LENGTH)
          return "[malformed AskUserQuestion input]";
        for (let idx = 0; idx < questionCount; idx++) {
          if (questionParts.length >= MAX_ENTRIES_FOR_CLASSIFIER) {
            questionParts.push(`[\u2026 further question entries elided: reported length ${questionCount}]`);
            break;
          }
          let question = questions[idx];
          if (typeof question !== "object" || question === null) {
            let escaped = stringifyForDisplay(question);
            questionParts.push(
              escaped ? `[malformed question entry] ${escaped}` : "[malformed question entry]",
            );
            continue;
          }
          let options = question.options;
          let optionParts = [];
          if (Array.isArray(options)) {
            let optionCount = options.length;
            for (let idx = 0; idx < optionCount; idx++) {
              if (optionParts.length >= MAX_ENTRIES_FOR_CLASSIFIER) {
                optionParts.push("[\u2026 further option entries elided]");
                break;
              }
              let option = options[idx];
              if (typeof option !== "object" || option === null) {
                optionParts.push(`(${idx + 1}) "${stringifyForDisplay(option)}"`);
                continue;
              }
              let optionValue = option;
              let optionSegments = [`(${idx + 1}) "${stringifyForDisplay(optionValue.label)}"`];
              let description = stringifyForDisplay(optionValue.description);
              if (description) optionSegments.push(`\u2014 ${description}`);
              let preview = stringifyForDisplay(optionValue.preview);
              if (preview) optionSegments.push(`[preview: ${preview}]`);
              optionParts.push(optionSegments.join(" "));
            }
          }
          let joined = optionParts.join(" ");
          let multiSelectSuffix = question.multiSelect === true ? " [multiSelect]" : "";
          let header = stringifyForDisplay(question.header);
          let headerSuffix = header ? ` [header: ${header}]` : "";
          let extensionSuffix = "";
          if (extendedQuestionsEnabled) {
            let questionValue = question;
            for (let [fieldName, fieldValue] of [
              ["kind", stringifyForDisplay(questionValue.kind)],
              ["description", stringifyForDisplay(questionValue.description)],
              ["placeholder", stringifyForDisplay(questionValue.placeholder)],
              ["min", stringifyPromptScalar(questionValue.min)],
              ["max", stringifyPromptScalar(questionValue.max)],
              ["step", stringifyPromptScalar(questionValue.step)],
              ["default", stringifyPromptScalar(questionValue.defaultValue)],
              ["unit", stringifyForDisplay(questionValue.unit)],
            ])
              if (fieldValue) extensionSuffix += ` [${fieldName}: ${fieldValue}]`;
          }
          questionParts.push(
            `"${stringifyForDisplay(question.question)}"${headerSuffix}${extensionSuffix}${multiSelectSuffix} options: ${joined}`,
          );
        }
        if (questionParts.length === 0) return "[malformed AskUserQuestion input]";
        let title = extendedQuestionsEnabled ? stringifyForDisplay(input.title) : "";
        return (title ? `[title: ${title}] ` : "") + questionParts.join(" | ");
      } catch {
        return "[malformed AskUserQuestion input]";
      }
    },
    admitCardAnswer: admitAnswerInputSafely,
    shownCardInput: toShownCardInput,
    requiresUserInteraction() {
      return true;
    },
    renderToolUseMessage() {
      return null;
    },
    create() {
      return {
        async validateInput({ questions }) {
          if (getQuestionPreviewFormat() !== "html")
            return {
              result: true,
            };
          for (let question of questions)
            for (let opt of question.options) {
              let err = validateHtmlPreview(opt.preview);
              if (err)
                return {
                  result: false,
                  message: `Option "${opt.label}" in question "${question.question}": ${err}`,
                  errorCode: 1,
                };
            }
          return {
            result: true,
          };
        },
        async checkPermissions(input) {
          return {
            behavior: "ask",
            message: "Answer questions?",
            updatedInput: toShownCardInput(input),
          };
        },
        async call(input) {
          let { answers = {}, annotations } = input;
          let mapped = input.questions.map((question) =>
            Array.isArray(question.options)
              ? question
              : {
                  ...question,
                  options: [],
                },
          );
          let { response, afkTimeoutMs, followUp } = input;
          let answerCount = count(mapped, ({ question }) => {
            let answer = answers[question];
            return Array.isArray(answer)
              ? answer.length > 0
              : typeof answer === "string" && answer !== "" && answer !== NOTES_ONLY_ANSWER;
          });
          logEvent("tengu_ask_user_question_completed", {
            extended: getExtendedQuestionsEnabled(),
            questionCount: mapped.length,
            choiceCount: count(
              mapped,
              (question) => (question.kind ?? "choice") === "choice" && !question.multiSelect,
            ),
            multiSelectCount: count(
              mapped,
              (question) => (question.kind ?? "choice") === "choice" && question.multiSelect,
            ),
            textCount: count(mapped, (question) => question.kind === "text"),
            numberCount: count(mapped, (question) => question.kind === "number"),
            answerCount,
            followUp: followUp === true,
            outcome: fromEnum(
              afkTimeoutMs
                ? "afk_timeout"
                : followUp
                  ? "follow_up"
                  : response?.trim()
                    ? "responded"
                    : answerCount > 0
                      ? "answered"
                      : "unanswered",
            ),
            ...(input.metadata?.source && {
              source_hash: shortHash(input.metadata.source),
            }),
          });
          return {
            data: {
              questions: mapped,
              answers,
              ...(response?.trim() && {
                response,
              }),
              ...(annotations && {
                annotations,
              }),
              ...(afkTimeoutMs && {
                afkTimeoutMs,
              }),
              ...(followUp === true && {
                followUp: true,
              }),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(
      { questions, answers, response, annotations, afkTimeoutMs, followUp },
      toolUseId,
    ) {
      let joined = questions
        .map(({ question }) => {
          let answer = getOwn(answers, question);
          let annotation = annotations && getOwn(annotations, question);
          let hasAnswer = answer && answer !== NOTES_ONLY_ANSWER;
          if (!hasAnswer && !annotation?.notes) return null;
          let answerParts = [hasAnswer ? `"${question}"="${answer}"` : `"${question}"=(no option selected)`];
          if (annotation?.preview)
            answerParts.push(`selected preview:
${annotation.preview}`);
          if (annotation?.notes) answerParts.push(`notes: ${annotation.notes}`);
          return answerParts.join(" ");
        })
        .filter((answerPart) => answerPart !== null)
        .join(", ");
      let content;
      if (afkTimeoutMs)
        content = joined
          ? `${formatAfkTimeoutMessage(afkTimeoutMs)}

Before going idle the user had selected: ${joined}.`
          : formatAfkTimeoutMessage(afkTimeoutMs);
      else if (followUp) {
        let responseSuffix = response?.trim() ? ` They also wrote: "${response}".` : "";
        content = joined
          ? `${FOLLOW_UP_REQUEST_TEXT} before you proceed. So far they answered: ${joined}.${responseSuffix} Call ${ASKUSERQUESTION} again with follow-up questions that build on these answers (do not repeat these); do not start the task yet.`
          : `${FOLLOW_UP_REQUEST_TEXT} before answering.${responseSuffix} Call ${ASKUSERQUESTION} again now with further questions about this decision (do not repeat these); do not proceed with the task yet.`;
      } else if (response?.trim()) content = `The user responded: ${response}`;
      else if (joined)
        content = questions.every(({ question, options, multiSelect, kind, min, max }) => {
          if ((annotations && getOwn(annotations, question))?.notes) return false;
          if (kind === "text" || kind === "number") {
            let answer = getOwn(answers, question);
            if (answer === undefined || answer === "") return true;
            if (kind === "text" || typeof answer !== "string") return false;
            let trimmed = answer.trim();
            let numericAnswer = Number(trimmed);
            return (
              /^-?\d+(\.\d+)?$/.test(trimmed) &&
              Number.isFinite(numericAnswer) &&
              (min === undefined || numericAnswer >= min) &&
              (max === undefined || numericAnswer <= max)
            );
          }
          let answer = getOwn(answers, question);
          let optionLabels = new Set(options.map((option) => option.label));
          if (Array.isArray(answer))
            return multiSelect && answer.length > 0 && answer.every((label) => optionLabels.has(label));
          if (!answer || answer === NOTES_ONLY_ANSWER) return true;
          if (optionLabels.has(answer)) return true;
          if (!multiSelect) return false;
          let selections = parseCommaSeparatedValues(answer);
          return (
            selections !== null &&
            selections.length >= 1 &&
            formatSelectionList(selections) === answer &&
            selections.every((label) => optionLabels.has(label))
          );
        })
          ? `Your questions have been answered: ${joined}. You can now continue with these answers in mind.`
          : `The user answered: ${joined}. Read the answers carefully \u2014 they may request clarification, changes, or that you not proceed \u2014 and follow what they actually say.`;
      else content = "The user did not answer the questions.";
      return {
        type: "tool_result",
        content,
        tool_use_id: toolUseId,
      };
    },
  });
});
//@ chunk-a91k35xs.js:20068-20545 fingerprint (2.1.88 match: validateHtmlPreview, 1)
/**
 * 校验 HTML 预览：不能是完整文档、不能含 script/style、必须含 HTML 标签；返回错误文本或 null。
 */
function validateHtmlPreview(preview) {
  if (preview === undefined) return null;
  if (/<\s*(html|body|!doctype)\b/i.test(preview))
    return "preview must be an HTML fragment, not a full document (no <html>, <body>, or <!DOCTYPE>)";
  if (/<\s*(script|style)\b/i.test(preview))
    return "preview must not contain <script> or <style> tags. Use inline styles via the style attribute if needed.";
  if (!/<[a-z][^>]*>/i.test(preview))
    return 'preview must contain HTML (previewFormat is set to "html"). Wrap content in a tag like <div> or <pre>.';
  return null;
}
export { NOTES_ONLY_ANSWER, AskUserQuestionTool, UNIQUENESS_REFINE_2 };
