/**
 * bridge/ownerPin.ts
 *
 * 2.1.316 新增。桥接会话的所有者绑定（[bridge:owner-pin]），防止会话被其他账号接管。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8b8mbw6q.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getAuthenticatedAccountInfo,
  getClaudeAIOAuthTokenOriginAsync,
  getClaudeAIOAuthTokensAsync,
  getOauthAccountInfo,
  readFreshOAuthCredentialSnapshot,
} from "../utils/auth.js";
import { isBridgeOwnerPinnedEndEnabled } from "./bridgeGates.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { logForDebugging } from "../utils/debug.js";
import { getBridgeTokenOverride } from "./bridgeConfig.js";
import { isBridgeFirstParty } from "./bridgeEnabled.js";
import { readFreshOauthAccountFromDisk, subscribeGlobalConfigInstalled } from "../utils/config.js";
import { withDeadline } from "../utils/sleep.js";
import { validateOauthToken } from "../services/oauth/validateOauthToken.js";

//@ chunk-8b8mbw6q.js:433-871 placement
/**
 * 确定守护进程的 owner 账号：优先本地登录账号；否则在开关允许时请服务端识别守护进程凭证，识别不了时警告。
 */
async function resolveDaemonOwner(getAccessToken) {
  let authenticatedAccountInfo = getAuthenticatedAccountInfo();
  if (authenticatedAccountInfo?.accountUuid)
    return {
      accountUuid: authenticatedAccountInfo.accountUuid,
      organizationUuid: authenticatedAccountInfo.organizationUuid || undefined,
    };
  if (!isBridgeOwnerPinnedEndEnabled() || isEssentialTrafficOnly()) return;
  let token = getAccessToken();
  let owner = token === undefined ? undefined : await attributeTokenOwner(token);
  if (owner === undefined)
    logForDebugging(
      "[bridge:owner-pin] daemon owner not declared: no bootstrap stamp, and the daemon credential is absent or was not attributed by the server in time \u2014 spawned sessions run the unverified inbox path",
      {
        level: "warn",
      },
    );
  return owner;
}
//@ chunk-8b8mbw6q.js:871-918 placement
/**
 * owner pin 刷新节奏常量：最小刷新间隔 1s、未变化 5 分钟、有变化 15 秒、无法判定 10 秒重试、最多 4 次、归属查询超时 3s。
 */
var OWNER_PIN_MIN_REFRESH_MS = 1000;
var OWNER_PIN_UNCHANGED_TTL_MS = 300000;
var OWNER_PIN_CHANGED_TTL_MS = 15000;
var OWNER_PIN_MAX_ATTEMPTS = 4;
var OWNER_PIN_INCONCLUSIVE_TTL_MS = 1e4;
var OWNER_ATTRIBUTE_TIMEOUT_MS = 3000;
//@ chunk-8b8mbw6q.js:918-990 placement
/**
 * 判断是否为存储支撑的第一方登录：未覆盖桥接令牌、第一方提供商，且 OAuth 令牌来源为 store。
 */
async function isStoreBackedFirstPartyLogin(credentials) {
  return (
    getBridgeTokenOverride() === undefined &&
    isBridgeFirstParty() &&
    (await getClaudeAIOAuthTokenOriginAsync(credentials)) === "store"
  );
}
//@ chunk-8b8mbw6q.js:990-1037 placement
/**
 * 只解析并取回桥接会话所有者绑定的 pin（不返回原因）。
 */
async function resolveBridgeOwnerPinOnly(credentials) {
  return (await resolveBridgeOwnerPin(credentials)).pin;
}
//@ chunk-8b8mbw6q.js:1037-5120 placement
/**
 * 解析 Remote Control 桥接会话的所有者绑定。
 */
async function resolveBridgeOwnerPin({ getAccessToken, storageV5, credentials, presetOwner }) {
  let accessToken = getAccessToken();
  if (accessToken === undefined)
    return {
      pin: undefined,
      reason: "no_token",
    };
  if (!isBridgeOwnerPinnedEndEnabled() || isEssentialTrafficOnly())
    return {
      pin: undefined,
      reason: "disabled",
    };
  if (presetOwner === undefined && !(await isStoreBackedFirstPartyLogin(credentials)))
    return {
      pin: undefined,
      reason: "not_store_login",
    };
  let freshOauthAccountFromDisk = await readFreshOauthAccountFromDisk(storageV5);
  let owner;
  let ownerToken = accessToken;
  let ownerVerified = false;
  if (presetOwner !== undefined) {
    owner = {
      accountUuid: presetOwner.accountUuid,
      organizationUuid: presetOwner.organizationUuid || undefined,
    };
    let verdict = (await isExpired(accessToken)) ? "unknown" : await classifyToken(accessToken);
    if (verdict === "foreign")
      return {
        pin: undefined,
        reason: "not_owner",
      };
    if (verdict === "unknown" && !isSameOwner(freshOauthAccountFromDisk))
      return {
        pin: undefined,
        reason: "unresolved",
      };
  } else {
    if (!freshOauthAccountFromDisk?.accountUuid)
      return {
        pin: undefined,
        reason: "no_identity",
      };
    owner = {
      accountUuid: freshOauthAccountFromDisk.accountUuid,
      organizationUuid: freshOauthAccountFromDisk.organizationUuid || undefined,
    };
  }
  let authenticatedAccountInfo = presetOwner === undefined ? getAuthenticatedAccountInfo() : undefined;
  if (
    authenticatedAccountInfo !== undefined &&
    !acceptAuthenticatedInfo(authenticatedAccountInfo) &&
    !(await adoptAttributedOwner())
  ) {
    logForDebugging(
      "[bridge:owner-pin] identity sources disagree and the credential could not be validated \u2014 session runs unpinned",
    );
    return {
      pin: undefined,
      reason: "unresolved",
    };
  }
  let pendingConfirm;
  let pendingNoteAccepted;
  let nextConfirmAt = 0;
  let lastVerdict = "unchanged";
  let inconclusiveUntil = 0;
  let onChange;
  let changeTimer;
  let recheckTimer;
  let retriesLeft = OWNER_PIN_MAX_ATTEMPTS;
  function isSameOwner(account) {
    return (
      account !== undefined &&
      Boolean(account.accountUuid) &&
      account.accountUuid === owner.accountUuid &&
      (!account.organizationUuid ||
        !owner.organizationUuid ||
        account.organizationUuid === owner.organizationUuid)
    );
  }
  function acceptAuthenticatedInfo(authenticatedAccountInfo) {
    if (!isSameOwner(authenticatedAccountInfo)) return false;
    owner = {
      accountUuid: owner.accountUuid,
      organizationUuid: owner.organizationUuid ?? (authenticatedAccountInfo.organizationUuid || undefined),
    };
    ownerVerified = true;
    return true;
  }
  async function adoptAttributedOwner() {
    let attributed = await attributeTokenOwner(ownerToken);
    if (attributed === undefined) return false;
    owner = attributed;
    ownerVerified = true;
    return true;
  }
  async function classifyToken(accessToken) {
    let attributed = await attributeTokenOwner(accessToken);
    if (attributed === undefined) return "unknown";
    if (!isSameOwner(attributed)) return "foreign";
    owner = {
      accountUuid: owner.accountUuid,
      organizationUuid: owner.organizationUuid ?? attributed.organizationUuid,
    };
    ownerToken = accessToken;
    ownerVerified = true;
    return "owner";
  }
  async function isExpired(accessToken) {
    let tokens = await getClaudeAIOAuthTokensAsync(credentials).catch(() => null);
    return tokens?.accessToken === accessToken && tokens.expiresAt !== null && tokens.expiresAt <= Date.now();
  }
  function identityLooksChanged() {
    if (!ownerVerified && presetOwner !== undefined) return true;
    if (!ownerVerified) {
      let authenticatedAccountInfo = getAuthenticatedAccountInfo();
      if (authenticatedAccountInfo !== undefined && !acceptAuthenticatedInfo(authenticatedAccountInfo))
        return true;
    }
    let oauthAccountInfo = getOauthAccountInfo();
    return Boolean(oauthAccountInfo?.accountUuid) && !isSameOwner(oauthAccountInfo);
  }
  function noteChecked(ttlMs) {
    nextConfirmAt = Date.now() + ttlMs;
    retriesLeft = OWNER_PIN_MAX_ATTEMPTS;
    if (ttlMs > 0) {
      lastVerdict = "unchanged";
      inconclusiveUntil = Date.now() + OWNER_PIN_INCONCLUSIVE_TTL_MS;
    }
  }
  function noteInconclusive(verdict) {
    nextConfirmAt = Date.now() + OWNER_PIN_CHANGED_TTL_MS;
    if (verdict === "inconclusive") {
      lastVerdict = verdict;
      inconclusiveUntil = Date.now() + OWNER_PIN_INCONCLUSIVE_TTL_MS;
    }
    if (onChange === undefined || recheckTimer !== undefined || retriesLeft === 0) return verdict;
    retriesLeft--;
    recheckTimer = setTimeout(() => {
      recheckTimer = undefined;
      try {
        if (identityLooksChanged()) onChange?.();
      } catch {}
    }, OWNER_PIN_CHANGED_TTL_MS);
    return verdict;
  }
  async function confirmChanged(fresh) {
    if (pendingNoteAccepted !== undefined) await pendingNoteAccepted;
    let snapshot = undefined;
    if (!ownerVerified && presetOwner !== undefined) {
      snapshot = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
        return;
      });
      if (snapshot === undefined) return noteInconclusive("inconclusive");
      let verdict = (await isExpired(snapshot.accessToken))
        ? "unknown"
        : await classifyToken(snapshot.accessToken);
      if (verdict === "foreign") {
        noteChecked(0);
        return "changed";
      }
      if (verdict === "unknown")
        return noteInconclusive(isSameOwner(snapshot) ? "unchanged" : "inconclusive");
    } else if (!ownerVerified) {
      let authenticatedAccountInfo = getAuthenticatedAccountInfo();
      if (
        !(authenticatedAccountInfo !== undefined && acceptAuthenticatedInfo(authenticatedAccountInfo)) &&
        !(await adoptAttributedOwner())
      )
        return noteInconclusive("inconclusive");
    }
    snapshot ??= await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
      return;
    });
    if (!snapshot?.accountUuid) return noteInconclusive(fresh ? "inconclusive" : "unchanged");
    let sameOwner = isSameOwner(snapshot);
    if (snapshot.accessToken === ownerToken) {
      noteChecked(sameOwner ? OWNER_PIN_CHANGED_TTL_MS : OWNER_PIN_UNCHANGED_TTL_MS);
      return "unchanged";
    }
    let attributed = (await isExpired(snapshot.accessToken))
      ? undefined
      : await attributeTokenOwner(snapshot.accessToken);
    if (attributed === undefined) return noteInconclusive("inconclusive");
    if (isSameOwner(attributed)) {
      logForDebugging(
        "[bridge:owner-pin] the server attributes the rotated credential to the owner \u2014 re-baselining",
      );
      owner = {
        accountUuid: owner.accountUuid,
        organizationUuid: owner.organizationUuid ?? attributed.organizationUuid,
      };
      ownerToken = snapshot.accessToken;
      noteChecked(sameOwner ? OWNER_PIN_CHANGED_TTL_MS : OWNER_PIN_UNCHANGED_TTL_MS);
      return "unchanged";
    }
    noteChecked(0);
    return "changed";
  }
  function recentlyChecked() {
    let remainingMs = inconclusiveUntil - Date.now();
    return remainingMs > 0 && remainingMs <= OWNER_PIN_INCONCLUSIVE_TTL_MS;
  }
  let pin = {
    identityLooksChanged,
    confirmChanged(options) {
      if (options?.fresh) {
        inconclusiveUntil = 0;
        let pending = pendingConfirm;
        if (pending !== undefined)
          return pending.then(() =>
            pin.confirmChanged({
              fresh: true,
            }),
          );
      } else if (pendingConfirm === undefined && recentlyChecked()) return Promise.resolve(lastVerdict);
      pendingConfirm ??= confirmChanged(options?.fresh === true).finally(() => {
        pendingConfirm = undefined;
      });
      return pendingConfirm;
    },
    confirmedUnchangedRecently() {
      return pendingConfirm === undefined && lastVerdict === "unchanged" && recentlyChecked();
    },
    noteAcceptedToken(token) {
      let rotated = token !== ownerToken;
      ownerToken = token;
      inconclusiveUntil = 0;
      if (!rotated || pendingNoteAccepted !== undefined || !isBridgeOwnerPinnedEndEnabled()) return;
      pendingNoteAccepted = readFreshOauthAccountFromDisk(storageV5)
        .then(async (freshOauthAccountFromDisk) => {
          if (!freshOauthAccountFromDisk?.accountUuid || isSameOwner(freshOauthAccountFromDisk)) return;
          let adopted = await adoptAttributedOwner();
          logForDebugging(
            adopted
              ? "[bridge:owner-pin] request accepted while the identity file names another account \u2014 re-pinned to the tenant the server attributes the credential to"
              : "[bridge:owner-pin] request accepted while the identity file names another account, but the credential could not be attributed \u2014 keeping the pinned owner",
          );
        })
        .finally(() => {
          pendingNoteAccepted = undefined;
        });
    },
    ownerToken: () => ownerToken,
    ownerVerified: () => ownerVerified,
    subscribe(listener) {
      onChange = listener;
      let unsubscribeConfig = subscribeGlobalConfigInstalled(() => {
        try {
          if (Date.now() < nextConfirmAt || !identityLooksChanged()) return;
        } catch {
          return;
        }
        clearTimeout(changeTimer);
        changeTimer = setTimeout(() => {
          changeTimer = undefined;
          onChange?.();
        }, OWNER_PIN_MIN_REFRESH_MS);
      });
      return () => {
        onChange = undefined;
        clearTimeout(changeTimer);
        changeTimer = undefined;
        clearTimeout(recheckTimer);
        recheckTimer = undefined;
        unsubscribeConfig();
      };
    },
  };
  return {
    pin,
  };
}
//@ chunk-8b8mbw6q.js:5120-5291 placement
/**
 * 带超时调用 validateOauthToken，返回 token 所属 {accountUuid, organizationUuid}。
 */
async function attributeTokenOwner(token) {
  let info = await withDeadline(
    validateOauthToken(token).catch(() => {
      return;
    }),
    OWNER_ATTRIBUTE_TIMEOUT_MS,
  );
  return info?.account_uuid
    ? {
        accountUuid: info.account_uuid,
        organizationUuid: info.organization_uuid || undefined,
      }
    : undefined;
}
export {
  resolveDaemonOwner,
  OWNER_PIN_INCONCLUSIVE_TTL_MS,
  attributeTokenOwner,
  isStoreBackedFirstPartyLogin,
  resolveBridgeOwnerPinOnly,
  resolveBridgeOwnerPin,
};
