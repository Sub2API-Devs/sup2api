/**
 * utils/authFileDescriptor.ts
 *
 * 从文件描述符或 CCR 已知文件（/home/claude/.claude/remote/.oauth_token 等）读取 OAuth 令牌、API key、网关令牌，并落盘给子进程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/authFileDescriptor.ts
 * pieces: chunk-847rdpmn.js (1), chunk-hvpfdswb.js (26), chunk-pspx8z4e.js (1)
 * attribution: placement 18, fingerprint 6, layout 4
 */
import { mkdirSync, writeFileSync, fstatSync } from "fs";
import { unlink } from "fs/promises";
import { env } from "./env.js";
import {
  isDiskless,
  noteCredentialRoad,
  markDescriptorAnnouncementConsumed,
  setGatewayTokenFromDescriptor,
  setOauthTokenFromFd,
  setOauthTokenFromBgSnapshot,
  setOauthOrgFromBgSnapshot,
  setOauthScopesFromFd,
  wasDescriptorAnnouncementConsumed,
  getOauthTokenFromFd,
  getGatewayTokenFromDescriptor,
  getApiKeyFromFd,
  setApiKeyFromFd,
} from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { isReviewSession, usesSessionAccessToken } from "./sessionAccessToken.js";
import {
  errorMessage,
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { isMuslEnvironment } from "./envDynamic.js";
import { readBoundedSync, isSocket, he } from "./fsSafety/atomicWriteStaging.js";
import { sleep } from "./sleep.js";
import { getPlatform } from "./platform.js";
import { slowLogging } from "./slowOperations.js";

/**
 * CCR（Claude Code Remote）令牌目录 /home/claude/.claude/remote 及 .oauth_token / .api_key / .session_ingress_token 文件路径。
 */
//@ chunk-hvpfdswb.js:695-833 fingerprint = CCR_TOKEN_DIR (0.4)
var CCR_TOKEN_DIR = "/home/claude/.claude/remote",
  CCR_OAUTH_TOKEN_PATH = `${CCR_TOKEN_DIR}/.oauth_token`,
  CCR_API_KEY_PATH = `${CCR_TOKEN_DIR}/.api_key`,
  CCR_SESSION_INGRESS_TOKEN_PATH = `${CCR_TOKEN_DIR}/.session_ingress_token`,
  whs = [CCR_OAUTH_TOKEN_PATH, CCR_API_KEY_PATH, CCR_SESSION_INGRESS_TOKEN_PATH],
  z1e = _Mn;
/**
 * CCR 环境下把从 fd 读到的令牌写到 /home/claude/.claude/remote 下的已知文件，供子进程读取。
 */
//@ chunk-hvpfdswb.js:833-1347 fingerprint = maybePersistTokenForSubprocesses (0.694)
function maybePersistTokenForSubprocesses(e, n, r, { skipInReviewOrigin: o = !1 } = {}) {
  if (!env.CLAUDE_CODE_REMOTE) return;
  if (isDiskless()) {
    logForDebugging(`Skipping ${r} disk persistence in a session with no disk`);
    return;
  }
  if (isHttpMcpServeInvocation()) {
    logForDebugging(`Skipping ${r} disk persistence in a tool server's daemon`);
    return;
  }
  if (o && isReviewSession()) {
    logForDebugging(`Skipping ${r} disk persistence in review-origin session`);
    return;
  }
  try {
    (mkdirSync(CCR_TOKEN_DIR, { recursive: !0, mode: 448 }),
      writeFileSync(e, n, { encoding: "utf8", mode: 384 }),
      logForDebugging(`Persisted ${r} to ${e} for subprocess access`));
  } catch (error) {
    logForDebugging(`Failed to persist ${r} to disk (non-fatal): ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-hvpfdswb.js:1347-1601 placement
async function removeCredentialFile() {
  if (!env.CLAUDE_CODE_REMOTE || isDiskless()) return;
  for (let e of whs)
    try {
      (await unlink(e), logForDebugging(`Removed the credential file at ${e}`));
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(
          `Failed to remove the credential file at ${e} (non-fatal): ${getErrnoCode(error) ?? "unknown error"}`,
          { level: "error" },
        );
    }
}
//@ chunk-hvpfdswb.js:1666-1706 placement
function yMn(e, n) {
  return readWellKnownCredentialFile(e, n).token;
}
//@ chunk-hvpfdswb.js:1706-2175 placement
function readWellKnownCredentialFile(e, n) {
  if (isHttpMcpServeInvocation()) return { token: null, miss: "enoent" };
  if (usesSessionAccessToken()) return { token: null, miss: "enoent" };
  if (isDiskless() || isMuslEnvironment(e)) return { token: null, miss: "enoent" };
  try {
    let trimmed = readBoundedSync(e, { maxBytes: z1e, regularFileOnly: !0 }).trim();
    if (!trimmed) return { token: null, miss: "empty" };
    return (logForDebugging(`Read ${n} from well-known file ${e}`), { token: trimmed });
  } catch (error) {
    if (isENOENT(error)) return { token: null, miss: "enoent" };
    return (
      logForDebugging(`Failed to read ${n} from ${e}: ${errorMessage(error)}`, { level: "debug" }),
      { token: null, miss: getErrnoCode(error) === "EACCES" ? "eacces" : "other" }
    );
  }
}
/**
 * 把凭据写到磁盘供子进程读取（无磁盘会话、工具服务器守护进程、审查来源会话跳过）。
 */
//@ chunk-hvpfdswb.js:2175-2712 placement
async function persistCredentialForSubprocess(e, n, r, o, { skipInReviewOrigin: s = !1 } = {}) {
  if (!env.CLAUDE_CODE_REMOTE) return;
  if (isDiskless()) {
    logForDebugging(`Skipping ${r} disk persistence in a session with no disk`);
    return;
  }
  if (isHttpMcpServeInvocation()) {
    logForDebugging(`Skipping ${r} disk persistence in a tool server's daemon`);
    return;
  }
  if (s && isReviewSession()) {
    logForDebugging(`Skipping ${r} disk persistence in review-origin session`);
    return;
  }
  let writeHandoffCredential = await o.writeHandoffCredential(e, n);
  if (writeHandoffCredential.state === "written") {
    logForDebugging(`Persisted ${r} to ${e} for subprocess access`);
    return;
  }
  logForDebugging(
    `Failed to persist ${r} to disk (non-fatal): ${writeHandoffCredential.code ?? "unknown error"}`,
    { level: "error" },
  );
}
//@ chunk-hvpfdswb.js:2712-3095 fingerprint = readTokenFromWellKnownFile (0.599)
async function readTokenFromWellKnownFile(e, n, r) {
  if (isHttpMcpServeInvocation() || usesSessionAccessToken() || isDiskless() || isMuslEnvironment(e))
    return null;
  let handoffCredential = await r.readHandoffCredential(e, { symlinkAtPath: "follow" });
  switch (handoffCredential.state) {
    case "present": {
      let token = handoffCredential.contents.trim();
      if (!token) return null;
      return (logForDebugging(`Read ${n} from well-known file ${e}`), token);
    }
    case "absent":
      return null;
    case "read-failed":
      return (
        logForDebugging(`Failed to read ${n} from ${e}: ${handoffCredential.code ?? "unknown error"}`, {
          level: "debug",
        }),
        null
      );
  }
}
/**
 * 从文件描述符读凭证（OAuth 令牌/API key/会话令牌）：env 指定 fd 号，CCR 模式下直接读 fd 并删 env，否则读已知文件路径；结果缓存，必要时落盘给子进程。
 */
//@ chunk-hvpfdswb.js:3095-4265 fingerprint = getCredentialFromFd (0.578)
function getCredentialFromFd({
  envVar: envVar,
  wellKnownPath: wellKnownPath,
  readPath: readPath = wellKnownPath,
  label: label,
  fileLabel: fileLabel = label,
  getCached: getCached,
  setCached: setCached,
  skipInReviewOrigin: skipInReviewOrigin = !1,
}) {
  let cached = getCached();
  if (cached !== void 0) return cached;
  let fdEnv = process.env[envVar];
  if (!fdEnv) {
    let fromFile = yMn(readPath, fileLabel);
    return (noteCredentialRoad(envVar, "file", fromFile), setCached(fromFile), fromFile);
  }
  let fd = parseInt(fdEnv, 10);
  if (Number.isNaN(fd))
    return (
      logForDebugging(`${envVar} must be a valid file descriptor number, got: ${fdEnv}`, { level: "error" }),
      setCached(null),
      null
    );
  if (isSocket(fd)) {
    let fsOps = canUseInheritedFd(),
      fdPath = fsOps ? readFromInheritedDescriptor(fd, label) : yMn(readPath, fileLabel);
    if (fsOps) (delete process.env[envVar], markDescriptorAnnouncementConsumed(envVar));
    if (
      (noteCredentialRoad(envVar, fsOps ? "descriptor_direct" : "file_after_socket", fdPath),
      setCached(fdPath),
      fdPath && fsOps)
    )
      maybePersistTokenForSubprocesses(wellKnownPath, fdPath, fileLabel, {
        skipInReviewOrigin: skipInReviewOrigin,
      });
    return fdPath;
  }
  try {
    let l = `/proc/self/fd/${fd}`,
      token = readBoundedSync(l, { maxBytes: z1e }).trim();
    if (!token)
      return (
        logForDebugging(`File descriptor contained empty ${label}`, { level: "error" }),
        setCached(null),
        null
      );
    return (
      logForDebugging(`Successfully read ${label} from file descriptor ${fd}`),
      noteCredentialRoad(envVar, "descriptor_by_path", token),
      setCached(token),
      maybePersistTokenForSubprocesses(wellKnownPath, token, fileLabel, {
        skipInReviewOrigin: skipInReviewOrigin,
      }),
      token
    );
  } catch (error) {
    logForDebugging(`Failed to read ${label} from file descriptor ${fd}: ${errorMessage(error)}`, {
      level: "error",
    });
    let fromFile = yMn(readPath, fileLabel);
    if (fromFile)
      return (noteCredentialRoad(envVar, "file_after_failed_read", fromFile), setCached(fromFile), fromFile);
    let A = getErrnoCode(error);
    if ((A === "EACCES" || A === "EPERM") && canUseInheritedFd()) {
      let u = readFromInheritedDescriptor(fd, label);
      if ((delete process.env[envVar], markDescriptorAnnouncementConsumed(envVar), u))
        return (
          noteCredentialRoad(envVar, "descriptor_direct", u),
          setCached(u),
          maybePersistTokenForSubprocesses(wellKnownPath, u, fileLabel, {
            skipInReviewOrigin: skipInReviewOrigin,
          }),
          u
        );
    }
    return (setCached(null), null);
  }
}
/**
 * 非远程（或远程允许）且不是 IPC 子进程。旧版名 isCCRMode 错配；疑似归 utils/authFileDescriptor.ts。
 */
//@ chunk-hvpfdswb.js:4265-4348 placement = isCCRMode (0.656)
function canUseInheritedFd() {
  return (!env.CLAUDE_CODE_REMOTE || usesSessionAccessToken()) && typeof process.send !== "function";
}
//@ chunk-hvpfdswb.js:4348-4747 placement
function readFromInheritedDescriptor(e, n) {
  try {
    logForDebugging(`Reading ${n} from inherited descriptor ${e} (until newline or end-of-stream)`);
    let trimmed = readInheritedFdSync(e, { maxBytes: z1e }).trim();
    if (!trimmed)
      return (logForDebugging(`File descriptor ${e} contained empty ${n}`, { level: "error" }), null);
    return (logForDebugging(`Successfully read ${n} directly from inherited descriptor ${e}`), trimmed);
  } catch (error) {
    return (
      logForDebugging(`Failed to read ${n} directly from descriptor ${e}: ${errorMessage(error)}`, {
        level: "error",
      }),
      null
    );
  }
}
/**
 * 从文件描述符（或其 /proc 路径）读取凭据，多种回退方式。
 */
//@ chunk-hvpfdswb.js:4747-5997 placement
async function readCredentialFromDescriptor({
  envVar: envVar,
  wellKnownPath: wellKnownPath,
  readPath: readPath = wellKnownPath,
  label: label,
  fileLabel: fileLabel = label,
  getCached: getCached,
  setCached: setCached,
  credentials: credentials,
  skipInReviewOrigin: skipInReviewOrigin = !1,
}) {
  let E = getCached();
  if (E !== void 0) return E;
  let p = process.env[envVar];
  if (!p) {
    let u = await readTokenFromWellKnownFile(readPath, fileLabel, credentials);
    return (noteCredentialRoad(envVar, "file", u), C(getCached, setCached, u));
  }
  let l = parseInt(p, 10);
  if (Number.isNaN(l))
    return (
      logForDebugging(`${envVar} must be a valid file descriptor number, got: ${p}`, { level: "error" }),
      setCached(null),
      null
    );
  let c = canUseInheritedFd(),
    A = () => {
      (delete process.env[envVar], markDescriptorAnnouncementConsumed(envVar));
    };
  if (isSocket(l)) {
    if (!c) {
      let f = await readTokenFromWellKnownFile(readPath, fileLabel, credentials);
      return (noteCredentialRoad(envVar, "file_after_socket", f), C(getCached, setCached, f));
    }
    let u = readFromInheritedDescriptor(l, label);
    if ((A(), noteCredentialRoad(envVar, "descriptor_direct", u), setCached(u), u))
      await persistCredentialForSubprocess(wellKnownPath, u, fileLabel, credentials, {
        skipInReviewOrigin: skipInReviewOrigin,
      });
    return u;
  }
  try {
    let u = `/proc/self/fd/${l}`,
      trimmed = readBoundedSync(u, { maxBytes: z1e }).trim();
    if (!trimmed)
      return (
        logForDebugging(`File descriptor contained empty ${label}`, { level: "error" }),
        setCached(null),
        null
      );
    return (
      logForDebugging(`Successfully read ${label} from file descriptor ${l}`),
      noteCredentialRoad(envVar, "descriptor_by_path", trimmed),
      setCached(trimmed),
      await persistCredentialForSubprocess(wellKnownPath, trimmed, fileLabel, credentials, {
        skipInReviewOrigin: skipInReviewOrigin,
      }),
      trimmed
    );
  } catch (error) {
    logForDebugging(`Failed to read ${label} from file descriptor ${l}: ${errorMessage(error)}`, {
      level: "error",
    });
    let f = await readTokenFromWellKnownFile(readPath, fileLabel, credentials);
    if (f) return (noteCredentialRoad(envVar, "file_after_failed_read", f), C(getCached, setCached, f));
    let w = getErrnoCode(error);
    if ((w === "EACCES" || w === "EPERM") && c) {
      let T = readFromInheritedDescriptor(l, label);
      if ((A(), T))
        return (
          noteCredentialRoad(envVar, "descriptor_direct", T),
          setCached(T),
          await persistCredentialForSubprocess(wellKnownPath, T, fileLabel, credentials, {
            skipInReviewOrigin: skipInReviewOrigin,
          }),
          T
        );
    }
    return C(getCached, setCached, null);
  }
}
//@ chunk-hvpfdswb.js:5997-6062 placement
function C(e, n, r) {
  let o = e();
  if (o !== void 0) return o;
  return (n(r), r);
}
//@ chunk-hvpfdswb.js:6062-6140 placement
function K1e() {
  return Boolean(process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH) && !isDiskless();
}
/**
 * 等待后台认证快照被消费完：按次数与间隔重试，返回最终是否已无待处理快照。
 */
//@ chunk-hvpfdswb.js:6140-6250 placement
async function waitForBgAuthSnapshot({ attempts: e = 10, delayMs: n = 100 } = {}) {
  for (let r = 0; r < e && K1e(); r++) (await sleep(n), consumeBgAuthSnapshot());
  return !K1e();
}
//@ chunk-hvpfdswb.js:6250-6339 placement
function S() {
  (env.unset("CLAUDE_BG_AUTH_SNAPSHOT_PATH"),
    markDescriptorAnnouncementConsumed("CLAUDE_BG_AUTH_SNAPSHOT_PATH"));
}
/**
 * 读取后台会话的认证快照（CLAUDE_BG_AUTH_SNAPSHOT_PATH），忙时下次重试。
 */
//@ chunk-hvpfdswb.js:6339-7371 placement
function consumeBgAuthSnapshot() {
  let envClaudeBgAuthSnapshotPath = process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH;
  if (!envClaudeBgAuthSnapshotPath || isDiskless()) return;
  let n;
  try {
    n = readCredentialFile(envClaudeBgAuthSnapshotPath);
  } catch (error) {
    if (v(error))
      return (
        logForDebugging(`bg auth snapshot busy, will retry on the next read: ${errorMessage(error)}`, {
          level: "warn",
        }),
        getErrnoCode(error)
      );
    if (!isENOENT(error))
      logForDebugging(`Failed to consume bg auth snapshot: ${errorMessage(error)}`, { level: "warn" });
  }
  if ((S(), n === void 0)) return;
  try {
    unlink(envClaudeBgAuthSnapshotPath).catch(() => {});
    let parsed = JSON.parse(n);
    if (typeof parsed?.gatewayToken === "string" && parsed.gatewayToken) {
      (setGatewayTokenFromDescriptor(parsed.gatewayToken),
        logForDebugging("Consumed gateway token from bg auth snapshot"));
      return;
    }
    if (typeof parsed?.accessToken !== "string" || !parsed.accessToken) {
      logForDebugging("bg auth snapshot missing accessToken", { level: "warn" });
      return;
    }
    if (
      (setOauthTokenFromFd(parsed.accessToken),
      setOauthTokenFromBgSnapshot(!0),
      setOauthOrgFromBgSnapshot(typeof parsed.organizationUuid === "string" ? parsed.organizationUuid : null),
      Array.isArray(parsed.scopes) && parsed.scopes.length > 0)
    )
      setOauthScopesFromFd(parsed.scopes);
    if (parsed.subscriptionType) process.env.CLAUDE_CODE_SUBSCRIPTION_TYPE = parsed.subscriptionType;
    if (parsed.rateLimitTier) process.env.CLAUDE_CODE_RATE_LIMIT_TIER = parsed.rateLimitTier;
    logForDebugging("Consumed bg auth snapshot from sockDir");
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to consume bg auth snapshot: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-hvpfdswb.js:7371-8643 placement
async function openCredentialPathPolicy(e) {
  let envClaudeBgAuthSnapshotPath = process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH;
  if (!envClaudeBgAuthSnapshotPath || isDiskless()) return;
  let handoffCredential = await e.readHandoffCredential(envClaudeBgAuthSnapshotPath, {
    symlinkAtPath: env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ? "follow" : "refuse",
  });
  if (process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH !== envClaudeBgAuthSnapshotPath) return;
  switch (handoffCredential.state) {
    case "absent":
      S();
      return;
    case "read-failed":
      if (
        handoffCredential.code !== "EBUSY" &&
        handoffCredential.code !== "EPERM" &&
        !(handoffCredential.code === "EACCES" && getPlatform() === "windows")
      )
        S();
      logForDebugging(`Failed to consume bg auth snapshot: ${handoffCredential.code ?? "unknown error"}`, {
        level: "warn",
      });
      return;
    case "present":
      break;
  }
  (S(), e.discardSpentCredentialFile(envClaudeBgAuthSnapshotPath).catch(() => {}));
  try {
    let parsed = JSON.parse(handoffCredential.contents);
    if (typeof parsed?.gatewayToken === "string" && parsed.gatewayToken) {
      (setGatewayTokenFromDescriptor(parsed.gatewayToken),
        logForDebugging("Consumed gateway token from bg auth snapshot"));
      return;
    }
    if (typeof parsed?.accessToken !== "string" || !parsed.accessToken) {
      logForDebugging("bg auth snapshot missing accessToken", { level: "warn" });
      return;
    }
    if (
      (setOauthTokenFromFd(parsed.accessToken),
      setOauthTokenFromBgSnapshot(!0),
      setOauthOrgFromBgSnapshot(typeof parsed.organizationUuid === "string" ? parsed.organizationUuid : null),
      Array.isArray(parsed.scopes) && parsed.scopes.length > 0)
    )
      setOauthScopesFromFd(parsed.scopes);
    if (parsed.subscriptionType) env.set("CLAUDE_CODE_SUBSCRIPTION_TYPE", String(parsed.subscriptionType));
    if (parsed.rateLimitTier) env.set("CLAUDE_CODE_RATE_LIMIT_TIER", String(parsed.rateLimitTier));
    logForDebugging("Consumed bg auth snapshot from sockDir");
  } catch (error) {
    logForDebugging(`Failed to consume bg auth snapshot: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-hvpfdswb.js:8643-8706 placement
function v$(e) {
  return (process.env[e]?.trim() ?? "") !== "" || wasDescriptorAnnouncementConsumed(e);
}
/**
 * CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR（或 CCR 的 /home/claude/.claude/remote/.oauth_token）读 OAuth 令牌。
 */
//@ chunk-hvpfdswb.js:8706-8874 fingerprint = getOAuthTokenFromFileDescriptor (0.937)
function getOAuthTokenFromFileDescriptor() {
  return (
    consumeBgAuthSnapshot(),
    getCredentialFromFd({
      envVar: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
      wellKnownPath: CCR_OAUTH_TOKEN_PATH,
      label: "OAuth token",
      getCached: getOauthTokenFromFd,
      setCached: setOauthTokenFromFd,
      skipInReviewOrigin: !0,
    })
  );
}
//@ chunk-hvpfdswb.js:8874-8923 layout
async function getOAuthTokenFromFileDescriptorAsync(e) {
  return (await openCredentialPathPolicy(e), getOAuthTokenFromFileDescriptor_2(e));
}
//@ chunk-hvpfdswb.js:8923-9107 layout = getOAuthTokenFromFileDescriptor (0.937)
async function getOAuthTokenFromFileDescriptor_2(e) {
  return readCredentialFromDescriptor({
    envVar: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
    wellKnownPath: CCR_OAUTH_TOKEN_PATH,
    label: "OAuth token",
    getCached: getOauthTokenFromFd,
    setCached: setOauthTokenFromFd,
    credentials: e,
    skipInReviewOrigin: !0,
  });
}
/**
 * CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR 读网关令牌（有后台认证快照时不读）。
 */
//@ chunk-hvpfdswb.js:9107-9584 layout
function getGatewayTokenFromFileDescriptor() {
  let e = getGatewayTokenFromDescriptor();
  if (e !== void 0) return e;
  consumeBgAuthSnapshot();
  let n = getGatewayTokenFromDescriptor();
  if (n !== void 0) return n;
  if (process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH) return null;
  let r = env.CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR,
    o = r ? parseInt(r, 10) : Number.NaN,
    s =
      Number.isNaN(o) || env.CLAUDE_CODE_REMOTE || typeof process.send === "function" || !isSocket(o)
        ? null
        : readFromInheritedDescriptor(o, "gateway token");
  if (
    (setGatewayTokenFromDescriptor(s),
    delete process.env.CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR,
    r?.trim())
  )
    markDescriptorAnnouncementConsumed("CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR");
  return s;
}
/**
 * CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR（或 CCR .api_key）读 API key。
 */
//@ chunk-hvpfdswb.js:9584-9754 fingerprint = getApiKeyFromFileDescriptor (1)
function getApiKeyFromFileDescriptor() {
  let e = getApiKeyFromFd();
  if (e !== void 0) return e;
  return getCredentialFromFd({
    envVar: "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
    wellKnownPath: CCR_API_KEY_PATH,
    label: "API key",
    getCached: getApiKeyFromFd,
    setCached: setApiKeyFromFd,
  });
}
//@ chunk-hvpfdswb.js:9754-9911 layout = getApiKeyFromFileDescriptor (1)
async function getApiKeyFromFileDescriptor_2(e) {
  return readCredentialFromDescriptor({
    envVar: "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
    wellKnownPath: CCR_API_KEY_PATH,
    label: "API key",
    getCached: getApiKeyFromFd,
    setCached: setApiKeyFromFd,
    credentials: e,
  });
}
//@ chunk-hvpfdswb.js:9911-9999 placement
function v(e) {
  let n = getErrnoCode(e);
  return n === "EBUSY" || n === "EPERM" || (n === "EACCES" && getPlatform() === "windows");
}
//@ chunk-hvpfdswb.js:9999-10187 placement
function readCredentialFile(e) {
  let n = () =>
    readBoundedSync(e, {
      maxBytes: z1e,
      symlinkAtPath: env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ? "follow" : "refuse",
      regularFileOnly: !0,
    });
  try {
    return n();
  } catch (error) {
    if (v(error)) return n();
    throw error;
  }
}
/**
 * 同步读取继承的描述符（只允许管道或 socket，有大小上限）。
 */
//@ chunk-847rdpmn.js:5373-5638 placement
function readInheritedFdSync(e, { maxBytes: maxBytes }) {
  using r = slowLogging`fs.readInheritedFdSync(fd ${e}, max ${maxBytes} bytes)`;
  let s = fstatSync(e);
  if (!s.isSocket() && !s.isFIFO())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `refusing to read fd ${e}: not a pipe or socket`,
      "readInheritedFdSync: descriptor is not a pipe or socket",
    );
  return he(e, maxBytes);
}
//@ chunk-pspx8z4e.js:191-205 placement
var _Mn = 65536;

export {
  getOAuthTokenFromFileDescriptor,
  getGatewayTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
  v$,
  K1e,
  getOAuthTokenFromFileDescriptorAsync,
  openCredentialPathPolicy,
  getOAuthTokenFromFileDescriptor_2,
  getApiKeyFromFileDescriptor_2,
  removeCredentialFile,
  _Mn,
  CCR_TOKEN_DIR,
  waitForBgAuthSnapshot,
  consumeBgAuthSnapshot,
  CCR_SESSION_INGRESS_TOKEN_PATH,
  z1e,
  readWellKnownCredentialFile,
  CCR_OAUTH_TOKEN_PATH,
  CCR_API_KEY_PATH,
  readFromInheritedDescriptor,
  yMn,
  getCredentialFromFd,
  readCredentialFromDescriptor,
  whs,
};
