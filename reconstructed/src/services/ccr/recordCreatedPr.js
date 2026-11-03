/**
 * services/ccr/recordCreatedPr.ts
 *
 * 2.1.316 新增：CCR 中记录创建的 PR
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fnctemcf.js (5)
 * attribution: placement 5
 */
import { hasRemoteSdkUrl } from "../ccrAgentProxy/agentProxy.js";
import { getReplBridgeHandle, getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getBranch } from "../../utils/git.js";
import { apiClient } from "../routines/routinesApi.js";
import { nXo } from "../../bridge/githubPrSubscription.js";
import { classifyAxiosError } from "../../utils/errors.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-fnctemcf.js:3568-3579 placement
var u = 1500;
/**
 * 把新建的 GitHub PR 记录到 CCR：优先经桥接句柄调用，否则以会话 JWT POST 到 CCR 会话接口，记录成功、跳过或失败。
 */
//@ chunk-fnctemcf.js:3579-4280 placement
async function recordCreatedPrToCcr(r, e) {
  let d = hasRemoteSdkUrl(),
    c = d ? null : (getReplBridgeHandle() ?? getSdkHostedBridgeHandle());
  if (!d && !c?.recordCreatedPR) return;
  if (r.provider !== "github") return;
  if (isEssentialTrafficOnly()) return;
  let index = r.prRepository.indexOf("/"),
    sliced = r.prRepository.slice(0, index),
    sliced_2 = r.prRepository.slice(index + 1),
    p = await getBranch(e),
    l = p === "HEAD" ? "" : p;
  try {
    if (c?.recordCreatedPR) {
      let recordCreatedPR = await c.recordCreatedPR(
        { owner: sliced, repo: sliced_2, prNumber: r.prNumber, headRef: l },
        u,
      );
      if (recordCreatedPR.ok) _(recordCreatedPR.status);
      else if ("skipped" in recordCreatedPR) R(recordCreatedPR.skipped);
      else logRecordPrFailure(recordCreatedPR.kind, recordCreatedPR.status);
      return;
    }
    let post = await apiClient.post(
      nXo,
      { owner: sliced, repo: sliced_2, pr_number: r.prNumber, head_ref: l },
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: { "anthropic-version": "2023-06-01" },
        timeout: u,
      },
    );
    if (!post.ok) {
      R(post.reason);
      return;
    }
    _(post.status);
  } catch (error) {
    let { kind: kind, status: status } = classifyAxiosError(error);
    logRecordPrFailure(kind, status);
  }
}
//@ chunk-fnctemcf.js:4280-4372 placement
function _(r) {
  (logFeatureOk("ccr_record_created_pr"), logForDebugging(`recordCreatedPrToCcr: RecordCreatedPR -> ${r}`));
}
//@ chunk-fnctemcf.js:4372-4457 placement
function R(r) {
  (logFeatureSad("ccr_record_created_pr", r), logForDebugging(`recordCreatedPrToCcr: skipped (${r})`));
}
//@ chunk-fnctemcf.js:4457-4660 placement
function logRecordPrFailure(r, e) {
  if (e === 404 || e === 501) logFeatureSad("ccr_record_created_pr", "not_deployed");
  else logFeatureBad("ccr_record_created_pr", `${r}${e ? `_${e}` : ""}`);
  logForDebugging(`recordCreatedPrToCcr: RecordCreatedPR failed: ${r}${e ? ` ${e}` : ""}`);
}
