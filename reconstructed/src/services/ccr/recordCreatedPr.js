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
import { RECORD_CREATED_PR_PATH } from "../../bridge/githubPrSubscription.js";
import { classifyAxiosError } from "../../utils/errors.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-fnctemcf.js:3568-3579 placement
/**
 * 向 CCR 记录新建 PR 请求的超时（1500 毫秒）。
 */
var RECORD_PR_TIMEOUT_MS = 1500;
//@ chunk-fnctemcf.js:3579-4280 placement
/**
 * 把新建的 GitHub PR 记录到 CCR：优先经桥接句柄调用，否则以会话 JWT POST 到 CCR 会话接口，记录成功、跳过或失败。
 */
async function recordCreatedPrToCcr(r, e) {
  let d = hasRemoteSdkUrl();
  let c = d ? null : (getReplBridgeHandle() ?? getSdkHostedBridgeHandle());
  if (!d && !c?.recordCreatedPR) return;
  if (r.provider !== "github") return;
  if (isEssentialTrafficOnly()) return;
  let index = r.prRepository.indexOf("/");
  let owner = r.prRepository.slice(0, index);
  let repo = r.prRepository.slice(index + 1);
  let branch = await getBranch(e);
  let l = branch === "HEAD" ? "" : branch;
  try {
    if (c?.recordCreatedPR) {
      let o = await c.recordCreatedPR(
        {
          owner,
          repo,
          prNumber: r.prNumber,
          headRef: l,
        },
        RECORD_PR_TIMEOUT_MS,
      );
      if (o.ok) _(o.status);
      else if ("skipped" in o) logRecordPrSkipped(o.skipped);
      else logRecordPrFailure(o.kind, o.status);
      return;
    }
    let i = await apiClient.post(
      RECORD_CREATED_PR_PATH,
      {
        owner,
        repo,
        pr_number: r.prNumber,
        head_ref: l,
      },
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: {
          "anthropic-version": "2023-06-01",
        },
        timeout: RECORD_PR_TIMEOUT_MS,
      },
    );
    if (!i.ok) {
      logRecordPrSkipped(i.reason);
      return;
    }
    _(i.status);
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    logRecordPrFailure(kind, status);
  }
}
//@ chunk-fnctemcf.js:4280-4372 placement
function _(status) {
  logFeatureOk("ccr_record_created_pr");
  logForDebugging(`recordCreatedPrToCcr: RecordCreatedPR -> ${status}`);
}
//@ chunk-fnctemcf.js:4372-4457 placement
/**
 * 记录 PR 记录被跳过的原因（埋点 + 调试日志）。
 */
function logRecordPrSkipped(r) {
  logFeatureSad("ccr_record_created_pr", r);
  logForDebugging(`recordCreatedPrToCcr: skipped (${r})`);
}
//@ chunk-fnctemcf.js:4457-4660 placement
function logRecordPrFailure(kind, status) {
  if (status === 404 || status === 501) logFeatureSad("ccr_record_created_pr", "not_deployed");
  else logFeatureBad("ccr_record_created_pr", `${kind}${status ? `_${status}` : ""}`);
  logForDebugging(`recordCreatedPrToCcr: RecordCreatedPR failed: ${kind}${status ? ` ${status}` : ""}`);
}
