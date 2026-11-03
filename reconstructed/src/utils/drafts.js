/**
 * utils/drafts.ts
 *
 * 2.1.316 新增：由请求提交草稿。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4mbryacy.js (1)
 * attribution: placement 1
 */
import { R5 } from "../services/feedbackDrafts.js";
import { listFeedbackDrafts, FEEDBACK_TYPES } from "../services/feedback/feedbackDrafts.js";
import { submitFeedbackDraft } from "../services/feedback/feedbackDraft.js";

//@ chunk-4mbryacy.js:11925-12712 placement
async function submitDraftFromRequest({
  draftId: draftId,
  description: description,
  type: r,
  title: title,
  area: area,
  attachTranscript: attachTranscript,
  surface: surface,
  messages: messages,
  storageV5: storageV5,
  credentials: credentials,
  host: host,
}) {
  if (!R5()) return { feedback_id: null, failure_reason: "drafts_disabled" };
  let { queued: queued } = await listFeedbackDrafts(void 0, storageV5),
    found = queued.find((k) => k.draft_id === draftId);
  if (!found) return { feedback_id: null, failure_reason: "draft_not_found" };
  let i = r !== void 0 && FEEDBACK_TYPES.includes(r) ? r : void 0,
    b = {
      ...found,
      ...(i !== void 0 && { type: i }),
      ...(title != null && title !== "" && { title: title }),
      ...(area != null && area !== "" && { area: area }),
      ...(description && { details: description }),
    },
    e = await submitFeedbackDraft({
      draft: b,
      includeTranscript: attachTranscript == null ? !0 : attachTranscript === !0,
      currentSessionMessages: messages,
      surface: surface ?? "sdk",
      storageV5: storageV5,
      host: host,
      credentials: credentials,
    });
  if (e.success) return { feedback_id: e.feedbackId };
  return {
    feedback_id: null,
    failure_reason: e.error,
    ...(e.orgRefusalReason !== void 0 && { unavailable_reason: e.orgRefusalReason }),
  };
}
