/**
 * utils/user.ts
 *
 * 用户身份数据：邮箱、git 邮箱、遥测/GrowthBook 用的核心用户数据。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/user.ts
 * pieces: chunk-4pc1m5n9.js (1), chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (1)
 * attribution: callgraph-fingerprint 1, fingerprint 2
 */
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getOrCreateUserID, getGlobalConfig } from "./config.js";
import {
  getSubscriptionType,
  getRateLimitTier,
  getAuthenticatedAccountInfo,
  getOauthAccountInfo,
  getStoredOauthAccountInfo,
} from "./auth.js";
import { isDiskless, getSessionId, getAuthenticatedAccountEpoch } from "../bootstrap/state.js";
import { env, getHostPlatformForAnalytics } from "./env.js";
import { nonEmptyName } from "../services/analytics/growthbook.js";
import { isEnvTruthy } from "./envUtils.js";
import { readGitConfigValue } from "./git.js";
import { getWIFAccountInfo } from "./wifProfile.js";

//@ chunk-aepeg2w5.js:627885-629737 fingerprint = getCoreUserData (0.614)
/**
 * 组装遥测/GrowthBook 用的核心用户数据：deviceId、sessionId、email、appVersion、platform、组织/账户 UUID、订阅类型、GitHub Actions 元数据等。
 */
class getCoreUserData {
  cachedEmail = null;
  emailFetchPromise = null;
  coreUserData = memoizeAlias(
    (includeAnalyticsMetadata) => {
      let deviceId = getOrCreateUserID();
      let config = getGlobalConfig();
      let subscriptionType;
      let rateLimitTier;
      let firstTokenTime;
      if (includeAnalyticsMetadata) {
        subscriptionType = getSubscriptionType() ?? undefined;
        rateLimitTier = getRateLimitTier() ?? undefined;
        if (subscriptionType && config.claudeCodeFirstTokenDate) {
          let configFirstTokenTime = new Date(config.claudeCodeFirstTokenDate).getTime();
          if (!isNaN(configFirstTokenTime)) firstTokenTime = configFirstTokenTime;
        }
      }
      let authenticatedAccountInfo = getAuthenticatedAccountInfo();
      let accountInfo =
        authenticatedAccountInfo ??
        getOauthAccountInfo() ??
        (isDiskless()
          ? {
              organizationUuid: env.CLAUDE_CODE_ORGANIZATION_UUID,
              accountUuid: env.CLAUDE_CODE_ACCOUNT_UUID,
            }
          : undefined);
      let organizationUuid = nonEmptyName(accountInfo?.organizationUuid);
      let accountUuid = nonEmptyName(accountInfo?.accountUuid);
      return {
        deviceId,
        sessionId: getSessionId(),
        email: authenticatedAccountInfo ? undefined : this.email(),
        appVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        platform: getHostPlatformForAnalytics(),
        organizationUuid,
        accountUuid,
        userType: "external",
        subscriptionType,
        rateLimitTier,
        firstTokenTime,
        ...(isEnvTruthy(env.GITHUB_ACTIONS) && {
          githubActionsMetadata: {
            actor: env.GITHUB_ACTOR,
            actorId: env.GITHUB_ACTOR_ID,
            repository: env.GITHUB_REPOSITORY,
            repositoryId: env.GITHUB_REPOSITORY_ID,
            repositoryOwner: env.GITHUB_REPOSITORY_OWNER,
            repositoryOwnerId: env.GITHUB_REPOSITORY_OWNER_ID,
          },
        }),
      };
    },
    (includeAnalyticsMetadata) => `${includeAnalyticsMetadata}|${getAuthenticatedAccountEpoch()}`,
  );
  gitEmail = memoizeAlias(async () => (await readGitConfigValue("user.email")) ?? undefined);
  gitUserName = memoizeAlias(async () => (await readGitConfigValue("user.name")) ?? undefined);
  async init() {
    if (this.cachedEmail === null && !this.emailFetchPromise) {
      this.emailFetchPromise = this.emailAsync();
      this.cachedEmail = await this.emailFetchPromise;
      this.emailFetchPromise = null;
      this.coreUserData.cache.clear?.();
    }
  }
  reset() {
    this.cachedEmail = null;
    this.emailFetchPromise = null;
    this.coreUserData.cache.clear?.();
    this.gitEmail.cache.clear?.();
  }
  email() {
    return;
  }
  async emailAsync() {
    return;
  }
}
//@ chunk-e6aww6q8.js:98782-98843 fingerprint = getGitEmail (0.394)
/**
 * git config user.email。
 */
function getGitEmail(args) {
  return args.shell === undefined && args.osVersion === undefined;
}
//@ chunk-4pc1m5n9.js:12383-12619 callgraph-fingerprint = getEmail (0.255)
/**
 * 当前用户邮箱：oauthAccount.emailAddress，或 env 提供的值。
 */
function getEmail() {
  let oauthAccount = getWIFAccountInfo();
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  return oauthAccount?.organizationUuid &&
    oauthAccount.accountEmail &&
    storedOauthAccountInfo?.organizationUuid === oauthAccount.organizationUuid &&
    storedOauthAccountInfo.emailAddress === oauthAccount.accountEmail &&
    storedOauthAccountInfo.accountUuid
    ? {
        organizationUuid: oauthAccount.organizationUuid,
        accountUuid: storedOauthAccountInfo.accountUuid,
      }
    : undefined;
}
export { getGitEmail, getEmail, getCoreUserData };
