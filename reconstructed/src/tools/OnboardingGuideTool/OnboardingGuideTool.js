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
import { zodStrictObject, _enum, string, u } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-kxyd0g16.js:7974-11180 placement
/**
 * OnboardingGuide 工具的输入 schema（mode 与目标 guide）、输出 schema（status/share_url/short_code/message）、guide 文件名与 64 KiB 大小上限，以及工具定义本身。
 */
var OnboardingGuideSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: _enum(["check", "update", "create", "delete"])
      .default("check")
      .describe(
        "'check' (default): if ONBOARDING.md is present locally, uploads it to the most-recent guide (creates one if none exist); otherwise reports the existing link without uploading. 'update': upload to a specific guide by short_code. 'create': always make a new link. 'delete': remove a guide.",
      ),
    short_code: string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .optional()
      .describe(
        "Short code of a specific guide to target (returned by a previous call). Honored by check, update, and delete \u2014 skips the org-wide lookup and targets this guide directly.",
      ),
  }),
);
var onboardingGuideOutputSchema = DoctorLazy(() =>
  u({
    status: _enum(["created", "updated", "deleted", "has_existing", "unavailable"]),
    share_url: string().optional(),
    short_code: string().optional(),
    message: string(),
  }),
);
var ONBOARDING_MD = "ONBOARDING.md";
var MAX_ONBOARDING_GUIDE_BYTES = 65536;
var onboardingGuideTool = buildTool({
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
  toAutoClassifierInput(e) {
    return `share onboarding guide (mode: ${e.mode ?? "check"})`;
  },
  isDestructive(e) {
    return e.mode === "delete";
  },
  renderToolUseMessage(e) {
    return e.mode && e.mode !== "check" ? e.mode : null;
  },
  create({ credentials }) {
    return {
      async call({ mode = "check", short_code: shortCode }) {
        if (mode === "delete")
          try {
            let y = shortCode ?? (await latestOnboardingGuide(credentials))?.short_code;
            if (!y) return unavailableResult("No guide found for this org to delete.");
            await deleteOnboardingGuide(y, credentials);
            return {
              data: {
                status: "deleted",
                message: `Guide ${y} deleted.`,
              },
            };
          } catch (error) {
            let k = error instanceof Error ? error.message : String(error);
            return unavailableResult(`Delete didn't go through (${k}).`);
          }
        if (mode === "check")
          try {
            let y = shortCode
              ? (await listOnboardingGuides(credentials)).find((k) => k.short_code === shortCode)
              : await latestOnboardingGuide(credentials);
            if (y) {
              let k = join(getOriginalCwd(), ONBOARDING_MD);
              let w = null;
              try {
                w = (await stat(k)).size;
              } catch (error) {
                if (!isENOENT(error)) throw error;
              }
              if (w === null)
                return {
                  data: {
                    status: "has_existing",
                    share_url: y.share_url,
                    short_code: y.short_code,
                    message: `A guide already exists for this org at ${y.share_url} (short_code: ${y.short_code}). If this link is what the user needed, share it. If they want to create or update a guide, tell them to run /team-onboarding themselves (it scans local session data and cannot be invoked by the model).`,
                  },
                };
              if (w > MAX_ONBOARDING_GUIDE_BYTES)
                return unavailableResult(
                  `${ONBOARDING_MD} is over ${MAX_ONBOARDING_GUIDE_BYTES / 1024}KB. Trim it before sharing.`,
                );
              let content = await readFile(k, "utf8");
              let R = await updateOnboardingGuide(y.short_code, content, credentials);
              return onboardingShareResult("updated", R, false);
            }
          } catch (error) {
            let k = error instanceof Error ? error.message : String(error);
            return unavailableResult(`Upload didn't go through (${k}). Fall back to the manual share copy.`);
          }
        let s = join(getOriginalCwd(), ONBOARDING_MD);
        let f;
        try {
          f = (await stat(s)).size;
        } catch (error) {
          if (isENOENT(error))
            return unavailableResult(
              `${ONBOARDING_MD} not found in the current directory. Write the guide first.`,
            );
          throw error;
        }
        if (f > MAX_ONBOARDING_GUIDE_BYTES)
          return unavailableResult(
            `${ONBOARDING_MD} is over ${MAX_ONBOARDING_GUIDE_BYTES / 1024}KB. Trim it before sharing.`,
          );
        let content = await readFile(s, "utf8");
        try {
          if (mode === "update") {
            let k = shortCode ?? (await latestOnboardingGuide(credentials))?.short_code;
            if (k) {
              let w = await updateOnboardingGuide(k, content, credentials);
              return onboardingShareResult("updated", w, true);
            }
          }
          let onboardingGuide = await createOnboardingGuide(content, undefined, credentials);
          return onboardingShareResult("created", onboardingGuide, false);
        } catch (error) {
          let k = error instanceof Error ? error.message : String(error);
          return unavailableResult(`Upload didn't go through (${k}). Fall back to the manual share copy.`);
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: `[${e.status}] ${e.message}`,
    };
  },
});
//@ chunk-kxyd0g16.js:11180-11297 placement
/**
 * 取最近更新的入门指南。
 */
async function latestOnboardingGuide(credentials) {
  let r = await listOnboardingGuides(credentials);
  if (r.length === 0) return;
  return r.reduce((acc, s) => (acc.updated_at > s.updated_at ? acc : s));
}
//@ chunk-kxyd0g16.js:11297-11581 placement
/**
 * 构造入门指南分享结果：状态、分享链接、短码与给模型的结束语。
 */
function onboardingShareResult(e, r, n) {
  let s = n
    ? `

Close with: "Here's your onboarding guide: ${r.share_url}" followed by the send-to-teammates line.`
    : "";
  let f = "";
  return {
    data: {
      status: e,
      share_url: r.share_url,
      short_code: r.short_code,
      message: `Share link ${e}: ${r.share_url} (short_code: ${r.short_code})${s}`,
    },
  };
}
export { onboardingGuideTool };
