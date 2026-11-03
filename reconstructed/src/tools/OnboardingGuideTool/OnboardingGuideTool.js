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
import { join, join as join_2 } from "path";
import { stat, readFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, U, o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SHAREONBOARDINGGUIDE, SHARE_ONBOARDING_GUIDE_PROMPT } from "../ShareOnboardingGuideTool/prompt.js";
import {
  isTeamOnboardingShareEnabled,
  deleteOnboardingGuide,
  listOnboardingGuides,
  updateOnboardingGuide,
  createOnboardingGuide,
} from "../../commands/team-onboarding/api.js";
import { ge } from "../RolePickerTool/RolePickerTool.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { isENOENT } from "../../utils/errors.js";

/**
 * ONBOARDING.md 指南工具 schema 与说明。
 */
//@ chunk-kxyd0g16.js:7974-11180 placement
var OnboardingGuideSchema = DoctorLazy(() =>
    zodStrictObject({
      mode: U(["check", "update", "create", "delete"])
        .default("check")
        .describe(
          "'check' (default): if ONBOARDING.md is present locally, uploads it to the most-recent guide (creates one if none exist); otherwise reports the existing link without uploading. 'update': upload to a specific guide by short_code. 'create': always make a new link. 'delete': remove a guide.",
        ),
      short_code: o()
        .regex(/^[A-Za-z0-9_-]{1,64}$/)
        .optional()
        .describe(
          "Short code of a specific guide to target (returned by a previous call). Honored by check, update, and delete \u2014 skips the org-wide lookup and targets this guide directly.",
        ),
    }),
  ),
  zn = DoctorLazy(() =>
    u({
      status: U(["created", "updated", "deleted", "has_existing", "unavailable"]),
      share_url: o().optional(),
      short_code: o().optional(),
      message: o(),
    }),
  ),
  ONBOARDING_MD = "ONBOARDING.md",
  Le = 65536,
  Vt = buildTool({
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
      return !1;
    },
    isReadOnly() {
      return !1;
    },
    get inputSchema() {
      return OnboardingGuideSchema();
    },
    get outputSchema() {
      return zn();
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
    create({ credentials: e }) {
      return {
        async call({ mode: r = "check", short_code: n }) {
          if (r === "delete")
            try {
              let y = n ?? (await latestOnboardingGuide(e))?.short_code;
              if (!y) return ge("No guide found for this org to delete.");
              return (
                await deleteOnboardingGuide(y, e),
                { data: { status: "deleted", message: `Guide ${y} deleted.` } }
              );
            } catch (error) {
              let k = error instanceof Error ? error.message : String(error);
              return ge(`Delete didn't go through (${k}).`);
            }
          if (r === "check")
            try {
              let y = n
                ? (await listOnboardingGuides(e)).find((k) => k.short_code === n)
                : await latestOnboardingGuide(e);
              if (y) {
                let k = join(getOriginalCwd(), ONBOARDING_MD),
                  w = null;
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
                if (w > Le) return ge(`${ONBOARDING_MD} is over ${Le / 1024}KB. Trim it before sharing.`);
                let S = await readFile(k, "utf8"),
                  R = await updateOnboardingGuide(y.short_code, S, e);
                return onboardingShareResult("updated", R, !1);
              }
            } catch (error) {
              let k = error instanceof Error ? error.message : String(error);
              return ge(`Upload didn't go through (${k}). Fall back to the manual share copy.`);
            }
          let s = join(getOriginalCwd(), ONBOARDING_MD),
            f;
          try {
            f = (await stat(s)).size;
          } catch (error) {
            if (isENOENT(error))
              return ge(`${ONBOARDING_MD} not found in the current directory. Write the guide first.`);
            throw error;
          }
          if (f > Le) return ge(`${ONBOARDING_MD} is over ${Le / 1024}KB. Trim it before sharing.`);
          let h = await readFile(s, "utf8");
          try {
            if (r === "update") {
              let k = n ?? (await latestOnboardingGuide(e))?.short_code;
              if (k) {
                let w = await updateOnboardingGuide(k, h, e);
                return onboardingShareResult("updated", w, !0);
              }
            }
            let y = await createOnboardingGuide(h, void 0, e);
            return onboardingShareResult("created", y, !1);
          } catch (error) {
            let k = error instanceof Error ? error.message : String(error);
            return ge(`Upload didn't go through (${k}). Fall back to the manual share copy.`);
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      return { tool_use_id: r, type: "tool_result", content: `[${e.status}] ${e.message}` };
    },
  });
/**
 * 取最近更新的入门指南。
 */
//@ chunk-kxyd0g16.js:11180-11297 placement
async function latestOnboardingGuide(e) {
  let r = await listOnboardingGuides(e);
  if (r.length === 0) return;
  return r.reduce((n, s) => (n.updated_at > s.updated_at ? n : s));
}
/**
 * 构造入门指南分享结果：状态、分享链接、短码与给模型的结束语。
 */
//@ chunk-kxyd0g16.js:11297-11581 placement
function onboardingShareResult(e, r, n) {
  let s = n
      ? `

Close with: "Here's your onboarding guide: ${r.share_url}" followed by the send-to-teammates line.`
      : "",
    f = "";
  return {
    data: {
      status: e,
      share_url: r.share_url,
      short_code: r.short_code,
      message: `Share link ${e}: ${r.share_url} (short_code: ${r.short_code})${s}`,
    },
  };
}

export { Vt };
