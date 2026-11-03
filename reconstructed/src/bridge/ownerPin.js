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

/**
 * 确定守护进程的 owner 账号：优先本地登录账号；否则在开关允许时请服务端识别守护进程凭证，识别不了时警告。
 */
//@ chunk-zq2w8cvy.js:433-871 placement
async function resolveDaemonOwner(d) {
  let r = getAuthenticatedAccountInfo();
  if (r?.accountUuid) return { accountUuid: r.accountUuid, organizationUuid: r.organizationUuid || void 0 };
  if (!isBridgeOwnerPinnedEndEnabled() || isEssentialTrafficOnly()) return;
  let c = d(),
    o = c === void 0 ? void 0 : await attributeTokenOwner(c);
  if (o === void 0)
    logForDebugging(
      "[bridge:owner-pin] daemon owner not declared: no bootstrap stamp, and the daemon credential is absent or was not attributed by the server in time \u2014 spawned sessions run the unverified inbox path",
      { level: "warn" },
    );
  return o;
}
//@ chunk-zq2w8cvy.js:871-918 placement
var V = 1000,
  I = 300000,
  C = 15000,
  N = 4,
  R6n = 1e4,
  H = 3000;
//@ chunk-zq2w8cvy.js:918-990 placement
async function VNo(d) {
  return (
    getBridgeTokenOverride() === void 0 &&
    isBridgeFirstParty() &&
    (await getClaudeAIOAuthTokenOriginAsync(d)) === "store"
  );
}
//@ chunk-zq2w8cvy.js:990-1037 placement
async function OKs(d) {
  return (await resolveBridgeOwnerPin(d)).pin;
}
/**
 * 解析 Remote Control 桥接会话的所有者绑定。
 */
//@ chunk-zq2w8cvy.js:1037-5120 placement
async function resolveBridgeOwnerPin({
  getAccessToken: getAccessToken,
  storageV5: storageV5,
  credentials: credentials,
  presetOwner: presetOwner,
}) {
  let k = getAccessToken();
  if (k === void 0) return { pin: void 0, reason: "no_token" };
  if (!isBridgeOwnerPinnedEndEnabled() || isEssentialTrafficOnly())
    return { pin: void 0, reason: "disabled" };
  if (presetOwner === void 0 && !(await VNo(credentials))) return { pin: void 0, reason: "not_store_login" };
  let _ = await readFreshOauthAccountFromDisk(storageV5),
    i,
    s = k,
    a = !1;
  if (presetOwner !== void 0) {
    i = { accountUuid: presetOwner.accountUuid, organizationUuid: presetOwner.organizationUuid || void 0 };
    let e = (await A(k)) ? "unknown" : await D(k);
    if (e === "foreign") return { pin: void 0, reason: "not_owner" };
    if (e === "unknown" && !u(_)) return { pin: void 0, reason: "unresolved" };
  } else {
    if (!_?.accountUuid) return { pin: void 0, reason: "no_identity" };
    i = { accountUuid: _.accountUuid, organizationUuid: _.organizationUuid || void 0 };
  }
  let R = presetOwner === void 0 ? getAuthenticatedAccountInfo() : void 0;
  if (R !== void 0 && !v(R) && !(await x()))
    return (
      logForDebugging(
        "[bridge:owner-pin] identity sources disagree and the credential could not be validated \u2014 session runs unpinned",
      ),
      { pin: void 0, reason: "unresolved" }
    );
  let f,
    l,
    P = 0,
    O = "unchanged",
    g = 0,
    w,
    p,
    h,
    E = N;
  function u(e) {
    return (
      e !== void 0 &&
      Boolean(e.accountUuid) &&
      e.accountUuid === i.accountUuid &&
      (!e.organizationUuid || !i.organizationUuid || e.organizationUuid === i.organizationUuid)
    );
  }
  function v(e) {
    if (!u(e)) return !1;
    return (
      (i = {
        accountUuid: i.accountUuid,
        organizationUuid: i.organizationUuid ?? (e.organizationUuid || void 0),
      }),
      (a = !0),
      !0
    );
  }
  async function x() {
    let e = await attributeTokenOwner(s);
    if (e === void 0) return !1;
    return ((i = e), (a = !0), !0);
  }
  async function D(e) {
    let n = await attributeTokenOwner(e);
    if (n === void 0) return "unknown";
    if (!u(n)) return "foreign";
    return (
      (i = { accountUuid: i.accountUuid, organizationUuid: i.organizationUuid ?? n.organizationUuid }),
      (s = e),
      (a = !0),
      "owner"
    );
  }
  async function A(e) {
    let n = await getClaudeAIOAuthTokensAsync(credentials).catch(() => null);
    return n?.accessToken === e && n.expiresAt !== null && n.expiresAt <= Date.now();
  }
  function z() {
    if (!a && presetOwner !== void 0) return !0;
    if (!a) {
      let n = getAuthenticatedAccountInfo();
      if (n !== void 0 && !v(n)) return !0;
    }
    let e = getOauthAccountInfo();
    return Boolean(e?.accountUuid) && !u(e);
  }
  function T(e) {
    if (((P = Date.now() + e), (E = N), e > 0)) ((O = "unchanged"), (g = Date.now() + R6n));
  }
  function m(e) {
    if (((P = Date.now() + C), e === "inconclusive")) ((O = e), (g = Date.now() + R6n));
    if (w === void 0 || h !== void 0 || E === 0) return e;
    return (
      E--,
      (h = setTimeout(() => {
        h = void 0;
        try {
          if (z()) w?.();
        } catch {}
      }, C)),
      e
    );
  }
  async function F(e) {
    if (l !== void 0) await l;
    let n = void 0;
    if (!a && presetOwner !== void 0) {
      if (
        ((n = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
          return;
        })),
        n === void 0)
      )
        return m("inconclusive");
      let y = (await A(n.accessToken)) ? "unknown" : await D(n.accessToken);
      if (y === "foreign") return (T(0), "changed");
      if (y === "unknown") return m(u(n) ? "unchanged" : "inconclusive");
    } else if (!a) {
      let y = getAuthenticatedAccountInfo();
      if (!(y !== void 0 && v(y)) && !(await x())) return m("inconclusive");
    }
    if (
      ((n ??= await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
        return;
      })),
      !n?.accountUuid)
    )
      return m(e ? "inconclusive" : "unchanged");
    let b = u(n);
    if (n.accessToken === s) return (T(b ? C : I), "unchanged");
    let U = (await A(n.accessToken)) ? void 0 : await attributeTokenOwner(n.accessToken);
    if (U === void 0) return m("inconclusive");
    if (u(U))
      return (
        logForDebugging(
          "[bridge:owner-pin] the server attributes the rotated credential to the owner \u2014 re-baselining",
        ),
        (i = { accountUuid: i.accountUuid, organizationUuid: i.organizationUuid ?? U.organizationUuid }),
        (s = n.accessToken),
        T(b ? C : I),
        "unchanged"
      );
    return (T(0), "changed");
  }
  function B() {
    let e = g - Date.now();
    return e > 0 && e <= R6n;
  }
  let S = {
    identityLooksChanged: z,
    confirmChanged(e) {
      if (e?.fresh) {
        g = 0;
        let n = f;
        if (n !== void 0) return n.then(() => S.confirmChanged({ fresh: !0 }));
      } else if (f === void 0 && B()) return Promise.resolve(O);
      return (
        (f ??= F(e?.fresh === !0).finally(() => {
          f = void 0;
        })),
        f
      );
    },
    confirmedUnchangedRecently() {
      return f === void 0 && O === "unchanged" && B();
    },
    noteAcceptedToken(e) {
      let n = e !== s;
      if (((s = e), (g = 0), !n || l !== void 0 || !isBridgeOwnerPinnedEndEnabled())) return;
      l = readFreshOauthAccountFromDisk(storageV5)
        .then(async (b) => {
          if (!b?.accountUuid || u(b)) return;
          let U = await x();
          logForDebugging(
            U
              ? "[bridge:owner-pin] request accepted while the identity file names another account \u2014 re-pinned to the tenant the server attributes the credential to"
              : "[bridge:owner-pin] request accepted while the identity file names another account, but the credential could not be attributed \u2014 keeping the pinned owner",
          );
        })
        .finally(() => {
          l = void 0;
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
        (clearTimeout(p),
          (p = setTimeout(() => {
            ((p = void 0), w?.());
          }, V)));
      });
      return () => {
        ((w = void 0), clearTimeout(p), (p = void 0), clearTimeout(h), (h = void 0), n());
      };
    },
  };
  return { pin: S };
}
/**
 * 带超时调用 validateOauthToken，返回 token 所属 {accountUuid, organizationUuid}。
 */
//@ chunk-zq2w8cvy.js:5120-5291 placement
async function attributeTokenOwner(d) {
  let r = await withDeadline(
    validateOauthToken(d).catch(() => {
      return;
    }),
    H,
  );
  return r?.account_uuid
    ? { accountUuid: r.account_uuid, organizationUuid: r.organization_uuid || void 0 }
    : void 0;
}

export { resolveDaemonOwner, R6n, attributeTokenOwner, VNo, OKs, resolveBridgeOwnerPin };
