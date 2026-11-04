/**
 * tools/OnboardingGuideTool/OnboardingGuideTool.ts
 *
 * 2.1.316 新增：ONBOARDING.md 指南工具 schema 与说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { stat, readFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  _enum,
  stringSchema,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SHAREONBOARDINGGUIDE, SHARE_ONBOARDING_GUIDE_PROMPT } from "../ShareOnboardingGuideTool/prompt.js";
import {
  isTeamOnboardingShareEnabled,
  deleteOnboardingGuide,
  listOnboardingGuides,
  updateOnboardingGuide,
  createOnboardingGuide,
} from "../../commands/team-onboarding/api.js";
import { unavailableResult } from "../RolePickerTool/RolePickerTool.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { isENOENT } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kxyd0g16.js:7974-11180 placement
/**
 * OnboardingGuide 工具的输入 schema（mode 与目标 guide）、输出 schema（status/share_url/short_code/message）、guide 文件名与 64 KiB 大小上限，以及工具定义本身。
 */
var OnboardingGuideSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var onboardingGuideOutputSchema;
var ONBOARDING_MD;
var MAX_ONBOARDING_GUIDE_BYTES;
var onboardingGuideTool;
deferInit("chunk-kxyd0g16.js:7974", () => {
  OnboardingGuideSchema = DoctorLazy(() =>
    zodStrictObject({
      mode: _enum(["check", "update", "create", "delete"])
        .default("check")
        .describe(
          "'check' (default): if ONBOARDING.md is present locally, uploads it to the most-recent guide (creates one if none exist); otherwise reports the existing link without uploading. 'update': upload to a specific guide by short_code. 'create': always make a new link. 'delete': remove a guide.",
        ),
      short_code: stringSchema()
        .regex(/^[A-Za-z0-9_-]{1,64}$/)
        .optional()
        .describe(
          "Short code of a specific guide to target (returned by a previous call). Honored by check, update, and delete \u2014 skips the org-wide lookup and targets this guide directly.",
        ),
    }),
  );
  onboardingGuideOutputSchema = DoctorLazy(() =>
    objectSchema({
      status: _enum(["created", "updated", "deleted", "has_existing", "unavailable"]),
      share_url: stringSchema().optional(),
      short_code: stringSchema().optional(),
      message: stringSchema(),
    }),
  );
  ONBOARDING_MD = "ONBOARDING.md";
  MAX_ONBOARDING_GUIDE_BYTES = 65536;
  onboardingGuideTool = buildTool({
    name: SHAREONBOARDINGGUIDE,
    searchHint: "upload ONBOARDING.md and get a team share link",
    backgrounding: "never",
    maxResultSizeChars: 1000,
    async description() {
      return SHARE_ONBOARDING_GUIDE_PROMPT;
    },
    isEnabled() {
      return isTeamOnboardingShareEnabled();
    },
    isConcurrencySafe() {
      return false;
    },
    isReadOnly() {
      return false;
    },
    get inputSchema() {
      return OnboardingGuideSchema();
    },
    get outputSchema() {
      return onboardingGuideOutputSchema();
    },
    async prompt() {
      return SHARE_ONBOARDING_GUIDE_PROMPT;
    },
    toAutoClassifierInput(input) {
      return `share onboarding guide (mode: ${input.mode ?? "check"})`;
    },
    isDestructive(input) {
      return input.mode === "delete";
    },
    renderToolUseMessage(input) {
      return input.mode && input.mode !== "check" ? input.mode : null;
    },
    create({ credentials }) {
      return {
        async call({ mode = "check", short_code: shortCode }) {
          if (mode === "delete")
            try {
              let guideCode = shortCode ?? (await latestOnboardingGuide(credentials))?.short_code;
              if (!guideCode) return unavailableResult("No guide found for this org to delete.");
              await deleteOnboardingGuide(guideCode, credentials);
              return {
                data: {
                  status: "deleted",
                  message: `Guide ${guideCode} deleted.`,
                },
              };
            } catch (error) {
              let errorText = error instanceof Error ? error.message : String(error);
              return unavailableResult(`Delete didn't go through (${errorText}).`);
            }
          if (mode === "check")
            try {
              let guide = shortCode
                ? (await listOnboardingGuides(credentials)).find(
                    (candidate) => candidate.short_code === shortCode,
                  )
                : await latestOnboardingGuide(credentials);
              if (guide) {
                let onboardingPath = join(getOriginalCwd(), ONBOARDING_MD);
                let fileSize = null;
                try {
                  fileSize = (await stat(onboardingPath)).size;
                } catch (error) {
                  if (!isENOENT(error)) throw error;
                }
                if (fileSize === null)
                  return {
                    data: {
                      status: "has_existing",
                      share_url: guide.share_url,
                      short_code: guide.short_code,
                      message: `A guide already exists for this org at ${guide.share_url} (short_code: ${guide.short_code}). If this link is what the user needed, share it. If they want to create or update a guide, tell them to run /team-onboarding themselves (it scans local session data and cannot be invoked by the model).`,
                    },
                  };
                if (fileSize > MAX_ONBOARDING_GUIDE_BYTES)
                  return unavailableResult(
                    `${ONBOARDING_MD} is over ${MAX_ONBOARDING_GUIDE_BYTES / 1024}KB. Trim it before sharing.`,
                  );
                let content = await readFile(onboardingPath, "utf8");
                let updatedGuide = await updateOnboardingGuide(guide.short_code, content, credentials);
                return onboardingShareResult("updated", updatedGuide, false);
              }
            } catch (error) {
              let errorText = error instanceof Error ? error.message : String(error);
              return unavailableResult(
                `Upload didn't go through (${errorText}). Fall back to the manual share copy.`,
              );
            }
          let onboardingPath = join(getOriginalCwd(), ONBOARDING_MD);
          let fileSize;
          try {
            fileSize = (await stat(onboardingPath)).size;
          } catch (error) {
            if (isENOENT(error))
              return unavailableResult(
                `${ONBOARDING_MD} not found in the current directory. Write the guide first.`,
              );
            throw error;
          }
          if (fileSize > MAX_ONBOARDING_GUIDE_BYTES)
            return unavailableResult(
              `${ONBOARDING_MD} is over ${MAX_ONBOARDING_GUIDE_BYTES / 1024}KB. Trim it before sharing.`,
            );
          let content = await readFile(onboardingPath, "utf8");
          try {
            if (mode === "update") {
              let guideCode = shortCode ?? (await latestOnboardingGuide(credentials))?.short_code;
              if (guideCode) {
                let updatedGuide = await updateOnboardingGuide(guideCode, content, credentials);
                return onboardingShareResult("updated", updatedGuide, true);
              }
            }
            let guide = await createOnboardingGuide(content, undefined, credentials);
            return onboardingShareResult("created", guide, false);
          } catch (error) {
            let errorText = error instanceof Error ? error.message : String(error);
            return unavailableResult(
              `Upload didn't go through (${errorText}). Fall back to the manual share copy.`,
            );
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `[${result.status}] ${result.message}`,
      };
    },
  });
});
//@ chunk-kxyd0g16.js:11180-11297 placement
/**
 * 取最近更新的入门指南。
 */
async function latestOnboardingGuide(credentials) {
  let guides = await listOnboardingGuides(credentials);
  if (guides.length === 0) return;
  return guides.reduce((acc, guide) => (acc.updated_at > guide.updated_at ? acc : guide));
}
//@ chunk-kxyd0g16.js:11297-11581 placement
/**
 * 构造入门指南分享结果：状态、分享链接、短码与给模型的结束语。
 */
function onboardingShareResult(status, guide, isUpdate) {
  let closingNote = isUpdate
    ? `

Close with: "Here's your onboarding guide: ${guide.share_url}" followed by the send-to-teammates line.`
    : "";
  let unusedPlaceholder = "";
  return {
    data: {
      status,
      share_url: guide.share_url,
      short_code: guide.short_code,
      message: `Share link ${status}: ${guide.share_url} (short_code: ${guide.short_code})${closingNote}`,
    },
  };
}
export { onboardingGuideTool };
