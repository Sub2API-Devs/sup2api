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
import { isFeedbackDraftsEnabled } from "../services/feedbackDrafts.js";
import { listFeedbackDrafts, FEEDBACK_TYPES } from "../services/feedback/feedbackDrafts.js";
import { submitFeedbackDraft } from "../services/feedback/feedbackDraft.js";

//@ chunk-4mbryacy.js:11925-12712 placement
async function submitDraftFromRequest({
  draftId,
  description,
  type: r,
  title,
  area,
  attachTranscript,
  surface,
  messages,
  storageV5,
  credentials,
  host,
}) {
  if (!isFeedbackDraftsEnabled())
    return {
      feedback_id: null,
      failure_reason: "drafts_disabled",
    };
  let { queued } = await listFeedbackDrafts(undefined, storageV5);
  let found = queued.find((k) => k.draft_id === draftId);
  if (!found)
    return {
      feedback_id: null,
      failure_reason: "draft_not_found",
    };
  let i = r !== undefined && FEEDBACK_TYPES.includes(r) ? r : undefined;
  let draft = {
    ...found,
    ...(i !== undefined && {
      type: i,
    }),
    ...(title != null &&
      title !== "" && {
        title,
      }),
    ...(area != null &&
      area !== "" && {
        area,
      }),
    ...(description && {
      details: description,
    }),
  };
  let e = await submitFeedbackDraft({
    draft,
    includeTranscript: attachTranscript == null ? true : attachTranscript === true,
    currentSessionMessages: messages,
    surface: surface ?? "sdk",
    storageV5,
    host,
    credentials,
  });
  if (e.success)
    return {
      feedback_id: e.feedbackId,
    };
  return {
    feedback_id: null,
    failure_reason: e.error,
    ...(e.orgRefusalReason !== undefined && {
      unavailable_reason: e.orgRefusalReason,
    }),
  };
}
