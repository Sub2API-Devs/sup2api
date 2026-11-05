/**
 * tools/WrapUpTool/WrapUpTool.ts
 *
 * Wrap up 工具定义：回传 recap、待拍板提问与最多两个按钮，并校验标签（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../../utils/sanitization.js";
import { describeLabelProblem } from "./labels.js";
import { hyphenateUltraKeyword } from "../../utils/ultraplan/keyword.js";
import { spellsSetupGuideCode } from "../../utils/commandPredicates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  booleanSchema,
  array,
  union,
  _enum,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { booleanishSchema } from "../../utils/spellcheck.js";
import { MODEL_FACING_MESSAGE_KEY } from "../ArtifactTool/publishEdits.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { WRAPUP, WRAPUP_TOOL_DESCRIPTION, WRAPUP_TOOL_PROMPT } from "./prompt.js";
import { getWrapUpOfferedAtLaunch } from "../../bootstrap/state.js";
import { isCodeModeOnlyToolsEnabled } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:26158-30190 placement
/**
 * Wrap up 工具的开关名（tengu_merry_thunder）与工具定义：把 recap、待拍板的提问和最多两个按钮回给用户。
 */
var TENGU_MERRY_THUNDER; // deferred: uses INVISIBLE_CHAR_CLASSES (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
var MAX_LABEL_CHARS;
var NON_WORD_CHARS;
var EXTRA_INVISIBLE_SOURCE;
var regExp_5;
var LABEL_CHECKS;
var RecapArgsSchema;
var wrapUpOutputSchema;
var WrapUpTool;
deferInit("chunk-fmnbrxwy.js:26158", () => {
  TENGU_MERRY_THUNDER = "tengu_merry_thunder";
  MAX_LABEL_CHARS = 24;
  NON_WORD_CHARS = /[^\p{L}\p{N}]/gu;
  EXTRA_INVISIBLE_SOURCE = String.raw`\uFFFC\u{1D159}\u{13441}\u{13442}\u{16910}\u{16FE4}`;
  regExp_5 = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}${EXTRA_INVISIBLE_SOURCE}]`, "u");
  LABEL_CHECKS = [
    describeLabelProblem,
    (label) =>
      hyphenateUltraKeyword(label.replace(NON_WORD_CHARS, "").toUpperCase()) ===
      label.replace(NON_WORD_CHARS, "").toUpperCase()
        ? undefined
        : "spells ultracode, ultraplan, ultrareview or ultrathink, in any case or width, once blanks and punctuation are left out: they change how a turn runs, and only the user may type them",
    (label) =>
      spellsSetupGuideCode(label.replace(NON_WORD_CHARS, "").toUpperCase())
        ? "has letters that, once blanks and punctuation are left out, spell the start of a code or link that only the user may paste: use other words"
        : undefined,
    (label) =>
      regExp_5.test(label)
        ? "holds a line break, a tab, or a character that may not show as written"
        : undefined,
    (label) => (/\S\s{2,}\S/.test(label) ? "holds two blanks in a row" : undefined),
  ];
  RecapArgsSchema = DoctorLazy(() =>
    zodStrictObject({
      recap: stringSchema().describe(
        "Two or three short sentences to the user, under 300 characters if you can: what is now true or changed, then where it stands, including what is not done or not verified.",
      ),
      ask: stringSchema()
        .optional()
        .describe(
          "The one decision that is the user's call, under 100 characters if you can: a choice, a go-ahead, an approval. No reason, no recommendation, no list of the options the buttons give.",
        ),
      blocked: booleanishSchema(booleanSchema().optional()).describe(
        "true when your work stops here until the user answers; omit when the answer can wait.",
      ),
      actions: array(
        union([
          zodStrictObject({
            label: stringSchema().describe(
              `A reply: the button's text, which a click sends you as the user's message. 1-3 plain words, at most ${MAX_LABEL_CHARS} characters ("Yes, fix 1", "Not now"). The first button is your pick, so no need to say so. Each word starts with a letter or digit. No quotes, code marks, arrows, emoji, @ or =. Write & only between blanks.`,
            ),
          }),
          zodStrictObject({
            action: _enum(["verify", "fix_ci", "address_comments", "resolve_conflicts"]).describe(
              "One of the app's own buttons, which asks you to check this turn's changes (verify) or, on an open pull request, to fix its failing checks, address its requested changes or resolve its merge conflicts. The app shows it only while that applies, so prefer a reply.",
            ),
          }),
        ]),
      )
        .max(2, {
          message: "The box has room for two buttons. Call again with two.",
        })
        .optional()
        .describe(
          "One or two buttons that answer ask, your recommendation first; a second only when it is a realistic alternative. Needs ask.",
        ),
    }).superRefine(({ ask, actions = [] }, refinementContext) => {
      if (actions.length > 0 && (ask ?? "").trim() === "")
        refinementContext.addIssue({
          code: "custom",
          path: ["ask"],
          message:
            "actions came without ask, and the box draws buttons only under a question. Call again with ask, or without actions.",
          params: {
            [MODEL_FACING_MESSAGE_KEY]: true,
          },
        });
      for (let [actionIndex, action] of actions.entries()) {
        let labelProblems = !("label" in action)
          ? []
          : action.label.length > MAX_LABEL_CHARS
            ? [`is longer than ${MAX_LABEL_CHARS} characters, the longest allowed`]
            : LABEL_CHECKS.flatMap(
                (labelCheck) =>
                  labelCheck(action.label) ??
                  labelCheck(action.label.normalize("NFKD"))?.replace(/^/, "(once decomposed, NFKD) ") ??
                  [],
              );
        if (labelProblems.length > 0)
          refinementContext.addIssue({
            code: "custom",
            path: ["actions", actionIndex, "label"],
            message: `The label of button ${actionIndex + 1} ${labelProblems.join("; ")}. Call again with 1-3 plain words.`,
            params: {
              [MODEL_FACING_MESSAGE_KEY]: true,
            },
          });
      }
    }),
  );
  wrapUpOutputSchema = DoctorLazy(() =>
    objectSchema({
      asks: booleanSchema().describe("Whether the call put a question to the user"),
    }),
  );
  WrapUpTool = buildTool({
    name: WRAPUP,
    searchHint: "offer the user a next step when a turn ends",
    backgrounding: "never",
    maxResultSizeChars: 1000,
    stampsOwnResults: true,
    isEnabled() {
      return (
        getWrapUpOfferedAtLaunch() &&
        !isCodeModeOnlyToolsEnabled() &&
        getFeatureValue_SESSION_PINNED(TENGU_MERRY_THUNDER, true)
      );
    },
    async description() {
      return WRAPUP_TOOL_DESCRIPTION;
    },
    async prompt() {
      return WRAPUP_TOOL_PROMPT;
    },
    get inputSchema() {
      return RecapArgsSchema();
    },
    get outputSchema() {
      return wrapUpOutputSchema();
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      let mapped = (input.actions ?? []).map((action) => ("label" in action ? action.label : action.action));
      return `${input.ask ?? ""} [${mapped.join(" | ")}]`;
    },
    userFacingName() {
      return "Wrap up";
    },
    renderToolUseMessage() {
      return null;
    },
    create() {
      return {
        async checkPermissions(updatedInput) {
          return {
            behavior: "allow",
            updatedInput,
          };
        },
        async call({ ask }) {
          return {
            data: {
              asks: ask !== undefined && ask.trim() !== "",
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam({ asks }, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: asks
          ? "Recorded. Write your closing message now, as the last thing you say this turn, and end it with your question in one short sentence: a client without the box still sees it."
          : "Recorded. Write your closing message now, as the last thing you say this turn.",
      };
    },
  });
});
export { WrapUpTool };
