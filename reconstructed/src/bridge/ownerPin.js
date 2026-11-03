/**
 * bridge/ownerPin.ts
 *
 * 2.1.316 新增。桥接会话的所有者绑定（[bridge:owner-pin]），防止会话被其他账号接管。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zq2w8cvy.js (6)
 * attribution: placement 6
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

//@ chunk-zq2w8cvy.js:433-871 placement
/**
 * 确定守护进程的 owner 账号：优先本地登录账号；否则在开关允许时请服务端识别守护进程凭证，识别不了时警告。
 */
async function resolveDaemonOwner(d) {
  let authenticatedAccountInfo = getAuthenticatedAccountInfo();
  if (authenticatedAccountInfo?.accountUuid)
    return {
      accountUuid: authenticatedAccountInfo.accountUuid,
      organizationUuid: authenticatedAccountInfo.organizationUuid || undefined,
    };
  if (!isBridgeOwnerPinnedEndEnabled() || isEssentialTrafficOnly()) return;
  let c = d();
  let o = c === undefined ? undefined : await attributeTokenOwner(c);
  if (o === undefined)
    logForDebugging(
      "[bridge:owner-pin] daemon owner not declared: no bootstrap stamp, and the daemon credential is absent or was not attributed by the server in time \u2014 spawned sessions run the unverified inbox path",
      {
        level: "warn",
      },
    );
  return o;
}
//@ chunk-zq2w8cvy.js:871-918 placement
/**
 * owner pin 刷新节奏常量：最小刷新间隔 1s、未变化 5 分钟、有变化 15 秒、无法判定 10 秒重试、最多 4 次、归属查询超时 3s。
 */
var OWNER_PIN_MIN_REFRESH_MS = 1000;
var OWNER_PIN_UNCHANGED_TTL_MS = 300000;
var OWNER_PIN_CHANGED_TTL_MS = 15000;
var OWNER_PIN_MAX_ATTEMPTS = 4;
var OWNER_PIN_INCONCLUSIVE_TTL_MS = 1e4;
var OWNER_ATTRIBUTE_TIMEOUT_MS = 3000;
//@ chunk-zq2w8cvy.js:918-990 placement
/**
 * 判断是否为存储支撑的第一方登录：未覆盖桥接令牌、第一方提供商，且 OAuth 令牌来源为 store。
 */
async function isStoreBackedFirstPartyLogin(d) {
  return (
    getBridgeTokenOverride() === undefined &&
    isBridgeFirstParty() &&
    (await getClaudeAIOAuthTokenOriginAsync(d)) === "store"
  );
}
//@ chunk-zq2w8cvy.js:990-1037 placement
/**
 * 只解析并取回桥接会话所有者绑定的 pin（不返回原因）。
 */
async function resolveBridgeOwnerPinOnly(d) {
  return (await resolveBridgeOwnerPin(d)).pin;
}
//@ chunk-zq2w8cvy.js:1037-5120 placement
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
  let i;
  let s = accessToken;
  let a = false;
  if (presetOwner !== undefined) {
    i = {
      accountUuid: presetOwner.accountUuid,
      organizationUuid: presetOwner.organizationUuid || undefined,
    };
    let e = (await A(accessToken)) ? "unknown" : await D(accessToken);
    if (e === "foreign")
      return {
        pin: undefined,
        reason: "not_owner",
      };
    if (e === "unknown" && !u(freshOauthAccountFromDisk))
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
    i = {
      accountUuid: freshOauthAccountFromDisk.accountUuid,
      organizationUuid: freshOauthAccountFromDisk.organizationUuid || undefined,
    };
  }
  let R = presetOwner === undefined ? getAuthenticatedAccountInfo() : undefined;
  if (R !== undefined && !v(R) && !(await x())) {
    logForDebugging(
      "[bridge:owner-pin] identity sources disagree and the credential could not be validated \u2014 session runs unpinned",
    );
    return {
      pin: undefined,
      reason: "unresolved",
    };
  }
  let f;
  let l;
  let P = 0;
  let O = "unchanged";
  let g = 0;
  let w;
  let p;
  let h;
  let E = OWNER_PIN_MAX_ATTEMPTS;
  function u(e) {
    return (
      e !== undefined &&
      Boolean(e.accountUuid) &&
      e.accountUuid === i.accountUuid &&
      (!e.organizationUuid || !i.organizationUuid || e.organizationUuid === i.organizationUuid)
    );
  }
  function v(authenticatedAccountInfo) {
    if (!u(authenticatedAccountInfo)) return false;
    i = {
      accountUuid: i.accountUuid,
      organizationUuid: i.organizationUuid ?? (authenticatedAccountInfo.organizationUuid || undefined),
    };
    a = true;
    return true;
  }
  async function x() {
    let e = await attributeTokenOwner(s);
    if (e === undefined) return false;
    i = e;
    a = true;
    return true;
  }
  async function D(accessToken) {
    let n = await attributeTokenOwner(accessToken);
    if (n === undefined) return "unknown";
    if (!u(n)) return "foreign";
    i = {
      accountUuid: i.accountUuid,
      organizationUuid: i.organizationUuid ?? n.organizationUuid,
    };
    s = accessToken;
    a = true;
    return "owner";
  }
  async function A(accessToken) {
    let n = await getClaudeAIOAuthTokensAsync(credentials).catch(() => null);
    return n?.accessToken === accessToken && n.expiresAt !== null && n.expiresAt <= Date.now();
  }
  function z() {
    if (!a && presetOwner !== undefined) return true;
    if (!a) {
      let authenticatedAccountInfo = getAuthenticatedAccountInfo();
      if (authenticatedAccountInfo !== undefined && !v(authenticatedAccountInfo)) return true;
    }
    let oauthAccountInfo = getOauthAccountInfo();
    return Boolean(oauthAccountInfo?.accountUuid) && !u(oauthAccountInfo);
  }
  function T(e) {
    P = Date.now() + e;
    E = OWNER_PIN_MAX_ATTEMPTS;
    if (e > 0) {
      O = "unchanged";
      g = Date.now() + OWNER_PIN_INCONCLUSIVE_TTL_MS;
    }
  }
  function m(e) {
    P = Date.now() + OWNER_PIN_CHANGED_TTL_MS;
    if (e === "inconclusive") {
      O = e;
      g = Date.now() + OWNER_PIN_INCONCLUSIVE_TTL_MS;
    }
    if (w === undefined || h !== undefined || E === 0) return e;
    E--;
    h = setTimeout(() => {
      h = undefined;
      try {
        if (z()) w?.();
      } catch {}
    }, OWNER_PIN_CHANGED_TTL_MS);
    return e;
  }
  async function F(e) {
    if (l !== undefined) await l;
    let n = undefined;
    if (!a && presetOwner !== undefined) {
      n = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
        return;
      });
      if (n === undefined) return m("inconclusive");
      let y = (await A(n.accessToken)) ? "unknown" : await D(n.accessToken);
      if (y === "foreign") {
        T(0);
        return "changed";
      }
      if (y === "unknown") return m(u(n) ? "unchanged" : "inconclusive");
    } else if (!a) {
      let authenticatedAccountInfo = getAuthenticatedAccountInfo();
      if (!(authenticatedAccountInfo !== undefined && v(authenticatedAccountInfo)) && !(await x()))
        return m("inconclusive");
    }
    n ??= await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
      return;
    });
    if (!n?.accountUuid) return m(e ? "inconclusive" : "unchanged");
    let b = u(n);
    if (n.accessToken === s) {
      T(b ? OWNER_PIN_CHANGED_TTL_MS : OWNER_PIN_UNCHANGED_TTL_MS);
      return "unchanged";
    }
    let U = (await A(n.accessToken)) ? undefined : await attributeTokenOwner(n.accessToken);
    if (U === undefined) return m("inconclusive");
    if (u(U)) {
      logForDebugging(
        "[bridge:owner-pin] the server attributes the rotated credential to the owner \u2014 re-baselining",
      );
      i = {
        accountUuid: i.accountUuid,
        organizationUuid: i.organizationUuid ?? U.organizationUuid,
      };
      s = n.accessToken;
      T(b ? OWNER_PIN_CHANGED_TTL_MS : OWNER_PIN_UNCHANGED_TTL_MS);
      return "unchanged";
    }
    T(0);
    return "changed";
  }
  function B() {
    let e = g - Date.now();
    return e > 0 && e <= OWNER_PIN_INCONCLUSIVE_TTL_MS;
  }
  let S = {
    identityLooksChanged: z,
    confirmChanged(e) {
      if (e?.fresh) {
        g = 0;
        let n = f;
        if (n !== undefined)
          return n.then(() =>
            S.confirmChanged({
              fresh: true,
            }),
          );
      } else if (f === undefined && B()) return Promise.resolve(O);
      f ??= F(e?.fresh === true).finally(() => {
        f = undefined;
      });
      return f;
    },
    confirmedUnchangedRecently() {
      return f === undefined && O === "unchanged" && B();
    },
    noteAcceptedToken(e) {
      let n = e !== s;
      s = e;
      g = 0;
      if (!n || l !== undefined || !isBridgeOwnerPinnedEndEnabled()) return;
      l = readFreshOauthAccountFromDisk(storageV5)
        .then(async (freshOauthAccountFromDisk) => {
          if (!freshOauthAccountFromDisk?.accountUuid || u(freshOauthAccountFromDisk)) return;
          let U = await x();
          logForDebugging(
            U
              ? "[bridge:owner-pin] request accepted while the identity file names another account \u2014 re-pinned to the tenant the server attributes the credential to"
              : "[bridge:owner-pin] request accepted while the identity file names another account, but the credential could not be attributed \u2014 keeping the pinned owner",
          );
        })
        .finally(() => {
          l = undefined;
        });
    },
    ownerToken: () => s,
    ownerVerified: () => a,
    subscribe(e) {
      w = e;
      let n = subscribeGlobalConfigInstalled(() => {
        try {
          if (Date.now() < P || !z()) return;
        } catch {
          return;
        }
        clearTimeout(p);
        p = setTimeout(() => {
          p = undefined;
          w?.();
        }, OWNER_PIN_MIN_REFRESH_MS);
      });
      return () => {
        w = undefined;
        clearTimeout(p);
        p = undefined;
        clearTimeout(h);
        h = undefined;
        n();
      };
    },
  };
  return {
    pin: S,
  };
}
//@ chunk-zq2w8cvy.js:5120-5291 placement
/**
 * 带超时调用 validateOauthToken，返回 token 所属 {accountUuid, organizationUuid}。
 */
async function attributeTokenOwner(d) {
  let r = await withDeadline(
    validateOauthToken(d).catch(() => {
      return;
    }),
    OWNER_ATTRIBUTE_TIMEOUT_MS,
  );
  return r?.account_uuid
    ? {
        accountUuid: r.account_uuid,
        organizationUuid: r.organization_uuid || undefined,
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
