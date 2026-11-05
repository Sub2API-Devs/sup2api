/**
 * services/ccr/recordCreatedPr.ts
 *
 * 2.1.316 新增：CCR 中记录创建的 PR
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rrg4j6m9.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-rrg4j6m9.js:3876-3887 placement
/**
 * 向 CCR 记录新建 PR 请求的超时（1500 毫秒）。
 */
var RECORD_PR_TIMEOUT_MS = 1500;
//@ chunk-rrg4j6m9.js:3887-4588 placement
/**
 * 把新建的 GitHub PR 记录到 CCR：优先经桥接句柄调用，否则以会话 JWT POST 到 CCR 会话接口，记录成功、跳过或失败。
 */
async function recordCreatedPrToCcr(pr, cwd) {
  let hasRemote = hasRemoteSdkUrl();
  let bridge = hasRemote ? null : (getReplBridgeHandle() ?? getSdkHostedBridgeHandle());
  if (!hasRemote && !bridge?.recordCreatedPR) return;
  if (pr.provider !== "github") return;
  if (isEssentialTrafficOnly()) return;
  let index = pr.prRepository.indexOf("/");
  let owner = pr.prRepository.slice(0, index);
  let repo = pr.prRepository.slice(index + 1);
  let branch = await getBranch(cwd);
  let headRef = branch === "HEAD" ? "" : branch;
  try {
    if (bridge?.recordCreatedPR) {
      let result = await bridge.recordCreatedPR(
        {
          owner,
          repo,
          prNumber: pr.prNumber,
          headRef,
        },
        RECORD_PR_TIMEOUT_MS,
      );
      if (result.ok) _(result.status);
      else if ("skipped" in result) logRecordPrSkipped(result.skipped);
      else logRecordPrFailure(result.kind, result.status);
      return;
    }
    let response = await apiClient.post(
      RECORD_CREATED_PR_PATH,
      {
        owner,
        repo,
        pr_number: pr.prNumber,
        head_ref: headRef,
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
    if (!response.ok) {
      logRecordPrSkipped(response.reason);
      return;
    }
    _(response.status);
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    logRecordPrFailure(kind, status);
  }
}
//@ chunk-rrg4j6m9.js:4588-4680 placement
function _(status) {
  logFeatureOk("ccr_record_created_pr");
  logForDebugging(`recordCreatedPrToCcr: RecordCreatedPR -> ${status}`);
}
//@ chunk-rrg4j6m9.js:4680-4765 placement
/**
 * 记录 PR 记录被跳过的原因（埋点 + 调试日志）。
 */
function logRecordPrSkipped(reason) {
  logFeatureSad("ccr_record_created_pr", reason);
  logForDebugging(`recordCreatedPrToCcr: skipped (${reason})`);
}
//@ chunk-rrg4j6m9.js:4765-4968 placement
function logRecordPrFailure(kind, status) {
  if (status === 404 || status === 501) logFeatureSad("ccr_record_created_pr", "not_deployed");
  else logFeatureBad("ccr_record_created_pr", `${kind}${status ? `_${status}` : ""}`);
  logForDebugging(`recordCreatedPrToCcr: RecordCreatedPR failed: ${kind}${status ? ` ${status}` : ""}`);
}
export { recordCreatedPrToCcr };
