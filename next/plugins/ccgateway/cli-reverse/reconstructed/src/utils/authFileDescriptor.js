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
import { fstatSync, mkdirSync, writeFileSync } from "fs";
import { unlink } from "fs/promises";
import { slowLogging } from "./slowOperations.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isENOENT,
  getErrnoCode,
} from "./errors.js";
import { readBoundedFdClose, readBoundedSync, isSocket } from "./fsSafety/atomicWriteStaging.js";
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
import { isMuslEnvironment_2 } from "./envDynamic.js";
import { sleep } from "./sleep.js";
import { getPlatform } from "./platform.js";

//@ chunk-847rdpmn.js:5373-5638 placement
/**
 * 同步读取继承的描述符（只允许管道或 socket，有大小上限）。
 */
function readInheritedFdSync(fd, { maxBytes }) {
  using span = slowLogging`fs.readInheritedFdSync(fd ${fd}, max ${maxBytes} bytes)`;
  let stats = fstatSync(fd);
  if (!stats.isSocket() && !stats.isFIFO())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `refusing to read fd ${fd}: not a pipe or socket`,
      "readInheritedFdSync: descriptor is not a pipe or socket",
    );
  return readBoundedFdClose(fd, maxBytes);
}
//@ chunk-pspx8z4e.js:191-205 placement
/**
 * 凭据读取的字节上限（64 KiB）。
 */
var MAX_CREDENTIAL_READ_BYTES = 65536;
//@ chunk-hvpfdswb.js:695-833 fingerprint = CCR_TOKEN_DIR (0.4)
/**
 * CCR（Claude Code Remote）令牌目录 /home/claude/.claude/remote 及 .oauth_token / .api_key / .session_ingress_token 文件路径。
 */
var CCR_TOKEN_DIR = "/home/claude/.claude/remote";
var CCR_OAUTH_TOKEN_PATH = `${CCR_TOKEN_DIR}/.oauth_token`;
var CCR_API_KEY_PATH = `${CCR_TOKEN_DIR}/.api_key`;
var CCR_SESSION_INGRESS_TOKEN_PATH = `${CCR_TOKEN_DIR}/.session_ingress_token`;
var CCR_CREDENTIAL_PATHS = [CCR_OAUTH_TOKEN_PATH, CCR_API_KEY_PATH, CCR_SESSION_INGRESS_TOKEN_PATH];
var MAX_CREDENTIAL_BYTES = MAX_CREDENTIAL_READ_BYTES;
//@ chunk-hvpfdswb.js:833-1347 fingerprint = maybePersistTokenForSubprocesses (0.694)
/**
 * CCR 环境下把从 fd 读到的令牌写到 /home/claude/.claude/remote 下的已知文件，供子进程读取。
 */
function maybePersistTokenForSubprocesses(path, token, tokenName, { skipInReviewOrigin = false } = {}) {
  if (!env.CLAUDE_CODE_REMOTE) return;
  if (isDiskless()) {
    logForDebugging(`Skipping ${tokenName} disk persistence in a session with no disk`);
    return;
  }
  if (isHttpMcpServeInvocation()) {
    logForDebugging(`Skipping ${tokenName} disk persistence in a tool server's daemon`);
    return;
  }
  if (skipInReviewOrigin && isReviewSession()) {
    logForDebugging(`Skipping ${tokenName} disk persistence in review-origin session`);
    return;
  }
  try {
    mkdirSync(CCR_TOKEN_DIR, {
      recursive: true,
      mode: 448,
    });
    writeFileSync(path, token, {
      encoding: "utf8",
      mode: 384,
    });
    logForDebugging(`Persisted ${tokenName} to ${path} for subprocess access`);
  } catch (error) {
    logForDebugging(`Failed to persist ${tokenName} to disk (non-fatal): ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-hvpfdswb.js:1347-1601 placement
async function removeCredentialFile() {
  if (!env.CLAUDE_CODE_REMOTE || isDiskless()) return;
  for (let path of CCR_CREDENTIAL_PATHS)
    try {
      await unlink(path);
      logForDebugging(`Removed the credential file at ${path}`);
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(
          `Failed to remove the credential file at ${path} (non-fatal): ${getErrnoCode(error) ?? "unknown error"}`,
          {
            level: "error",
          },
        );
    }
}
//@ chunk-hvpfdswb.js:1666-1706 placement
/**
 * 读取已知路径凭据文件里的令牌。
 */
function readWellKnownCredentialToken(readPath, fileLabel) {
  return readWellKnownCredentialFile(readPath, fileLabel).token;
}
//@ chunk-hvpfdswb.js:1706-2175 placement
function readWellKnownCredentialFile(path, label) {
  if (isHttpMcpServeInvocation())
    return {
      token: null,
      miss: "enoent",
    };
  if (usesSessionAccessToken())
    return {
      token: null,
      miss: "enoent",
    };
  if (isDiskless() || isMuslEnvironment_2(path))
    return {
      token: null,
      miss: "enoent",
    };
  try {
    let trimmed = readBoundedSync(path, {
      maxBytes: MAX_CREDENTIAL_BYTES,
      regularFileOnly: true,
    }).trim();
    if (!trimmed)
      return {
        token: null,
        miss: "empty",
      };
    logForDebugging(`Read ${label} from well-known file ${path}`);
    return {
      token: trimmed,
    };
  } catch (error) {
    if (isENOENT(error))
      return {
        token: null,
        miss: "enoent",
      };
    logForDebugging(`Failed to read ${label} from ${path}: ${errorMessage(error)}`, {
      level: "debug",
    });
    return {
      token: null,
      miss: getErrnoCode(error) === "EACCES" ? "eacces" : "other",
    };
  }
}
//@ chunk-hvpfdswb.js:2175-2712 placement
/**
 * 把凭据写到磁盘供子进程读取（无磁盘会话、工具服务器守护进程、审查来源会话跳过）。
 */
async function persistCredentialForSubprocess(
  wellKnownPath,
  token,
  fileLabel,
  credentials,
  { skipInReviewOrigin = false } = {},
) {
  if (!env.CLAUDE_CODE_REMOTE) return;
  if (isDiskless()) {
    logForDebugging(`Skipping ${fileLabel} disk persistence in a session with no disk`);
    return;
  }
  if (isHttpMcpServeInvocation()) {
    logForDebugging(`Skipping ${fileLabel} disk persistence in a tool server's daemon`);
    return;
  }
  if (skipInReviewOrigin && isReviewSession()) {
    logForDebugging(`Skipping ${fileLabel} disk persistence in review-origin session`);
    return;
  }
  let writeResult = await credentials.writeHandoffCredential(wellKnownPath, token);
  if (writeResult.state === "written") {
    logForDebugging(`Persisted ${fileLabel} to ${wellKnownPath} for subprocess access`);
    return;
  }
  logForDebugging(
    `Failed to persist ${fileLabel} to disk (non-fatal): ${writeResult.code ?? "unknown error"}`,
    {
      level: "error",
    },
  );
}
//@ chunk-hvpfdswb.js:2712-3095 fingerprint = readTokenFromWellKnownFile (0.599)
async function readTokenFromWellKnownFile(path, tokenName, credentials) {
  if (isHttpMcpServeInvocation() || usesSessionAccessToken() || isDiskless() || isMuslEnvironment_2(path))
    return null;
  let handoffCredential = await credentials.readHandoffCredential(path, {
    symlinkAtPath: "follow",
  });
  switch (handoffCredential.state) {
    case "present": {
      let token = handoffCredential.contents.trim();
      if (!token) return null;
      logForDebugging(`Read ${tokenName} from well-known file ${path}`);
      return token;
    }
    case "absent":
      return null;
    case "read-failed":
      logForDebugging(
        `Failed to read ${tokenName} from ${path}: ${handoffCredential.code ?? "unknown error"}`,
        {
          level: "debug",
        },
      );
      return null;
  }
}
//@ chunk-hvpfdswb.js:3095-4265 fingerprint = getCredentialFromFd (0.578)
/**
 * 从文件描述符读凭证（OAuth 令牌/API key/会话令牌）：env 指定 fd 号，CCR 模式下直接读 fd 并删 env，否则读已知文件路径；结果缓存，必要时落盘给子进程。
 */
function getCredentialFromFd({
  envVar,
  wellKnownPath,
  readPath = wellKnownPath,
  label,
  fileLabel = label,
  getCached,
  setCached,
  skipInReviewOrigin = false,
}) {
  let cached = getCached();
  if (cached !== undefined) return cached;
  let fdEnv = process.env[envVar];
  if (!fdEnv) {
    let fromFile = readWellKnownCredentialToken(readPath, fileLabel);
    noteCredentialRoad(envVar, "file", fromFile);
    setCached(fromFile);
    return fromFile;
  }
  let fd = parseInt(fdEnv, 10);
  if (Number.isNaN(fd)) {
    logForDebugging(`${envVar} must be a valid file descriptor number, got: ${fdEnv}`, {
      level: "error",
    });
    setCached(null);
    return null;
  }
  if (isSocket(fd)) {
    let fsOps = canUseInheritedFd();
    let fdPath = fsOps
      ? readFromInheritedDescriptor(fd, label)
      : readWellKnownCredentialToken(readPath, fileLabel);
    if (fsOps) {
      delete process.env[envVar];
      markDescriptorAnnouncementConsumed(envVar);
    }
    noteCredentialRoad(envVar, fsOps ? "descriptor_direct" : "file_after_socket", fdPath);
    setCached(fdPath);
    if (fdPath && fsOps)
      maybePersistTokenForSubprocesses(wellKnownPath, fdPath, fileLabel, {
        skipInReviewOrigin,
      });
    return fdPath;
  }
  try {
    let procPath = `/proc/self/fd/${fd}`;
    let token = readBoundedSync(procPath, {
      maxBytes: MAX_CREDENTIAL_BYTES,
    }).trim();
    if (!token) {
      logForDebugging(`File descriptor contained empty ${label}`, {
        level: "error",
      });
      setCached(null);
      return null;
    }
    logForDebugging(`Successfully read ${label} from file descriptor ${fd}`);
    noteCredentialRoad(envVar, "descriptor_by_path", token);
    setCached(token);
    maybePersistTokenForSubprocesses(wellKnownPath, token, fileLabel, {
      skipInReviewOrigin,
    });
    return token;
  } catch (error) {
    logForDebugging(`Failed to read ${label} from file descriptor ${fd}: ${errorMessage(error)}`, {
      level: "error",
    });
    let fromFile = readWellKnownCredentialToken(readPath, fileLabel);
    if (fromFile) {
      noteCredentialRoad(envVar, "file_after_failed_read", fromFile);
      setCached(fromFile);
      return fromFile;
    }
    let errnoCode = getErrnoCode(error);
    if ((errnoCode === "EACCES" || errnoCode === "EPERM") && canUseInheritedFd()) {
      let token = readFromInheritedDescriptor(fd, label);
      delete process.env[envVar];
      markDescriptorAnnouncementConsumed(envVar);
      if (token) {
        noteCredentialRoad(envVar, "descriptor_direct", token);
        setCached(token);
        maybePersistTokenForSubprocesses(wellKnownPath, token, fileLabel, {
          skipInReviewOrigin,
        });
        return token;
      }
    }
    setCached(null);
    return null;
  }
}
//@ chunk-hvpfdswb.js:4265-4348 placement = isCCRMode (0.656)
/**
 * 非远程（或远程允许）且不是 IPC 子进程。旧版名 isCCRMode 错配；疑似归 utils/authFileDescriptor.ts。
 */
function canUseInheritedFd() {
  return (!env.CLAUDE_CODE_REMOTE || usesSessionAccessToken()) && typeof process.send !== "function";
}
//@ chunk-hvpfdswb.js:4348-4747 placement
function readFromInheritedDescriptor(fd, label) {
  try {
    logForDebugging(`Reading ${label} from inherited descriptor ${fd} (until newline or end-of-stream)`);
    let trimmed = readInheritedFdSync(fd, {
      maxBytes: MAX_CREDENTIAL_BYTES,
    }).trim();
    if (!trimmed) {
      logForDebugging(`File descriptor ${fd} contained empty ${label}`, {
        level: "error",
      });
      return null;
    }
    logForDebugging(`Successfully read ${label} directly from inherited descriptor ${fd}`);
    return trimmed;
  } catch (error) {
    logForDebugging(`Failed to read ${label} directly from descriptor ${fd}: ${errorMessage(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-hvpfdswb.js:4747-5997 placement
/**
 * 从文件描述符（或其 /proc 路径）读取凭据，多种回退方式。
 */
async function readCredentialFromDescriptor({
  envVar,
  wellKnownPath,
  readPath = wellKnownPath,
  label,
  fileLabel = label,
  getCached,
  setCached,
  credentials,
  skipInReviewOrigin = false,
}) {
  let cached = getCached();
  if (cached !== undefined) return cached;
  let fdEnv = process.env[envVar];
  if (!fdEnv) {
    let tokenFromWellKnownFile = await readTokenFromWellKnownFile(readPath, fileLabel, credentials);
    noteCredentialRoad(envVar, "file", tokenFromWellKnownFile);
    return cacheOrStoreCredential(getCached, setCached, tokenFromWellKnownFile);
  }
  let fd = parseInt(fdEnv, 10);
  if (Number.isNaN(fd)) {
    logForDebugging(`${envVar} must be a valid file descriptor number, got: ${fdEnv}`, {
      level: "error",
    });
    setCached(null);
    return null;
  }
  let canReadInherited = canUseInheritedFd();
  let finishDescriptor = () => {
    delete process.env[envVar];
    markDescriptorAnnouncementConsumed(envVar);
  };
  if (isSocket(fd)) {
    if (!canReadInherited) {
      let tokenFromWellKnownFile = await readTokenFromWellKnownFile(readPath, fileLabel, credentials);
      noteCredentialRoad(envVar, "file_after_socket", tokenFromWellKnownFile);
      return cacheOrStoreCredential(getCached, setCached, tokenFromWellKnownFile);
    }
    let token = readFromInheritedDescriptor(fd, label);
    finishDescriptor();
    noteCredentialRoad(envVar, "descriptor_direct", token);
    setCached(token);
    if (token)
      await persistCredentialForSubprocess(wellKnownPath, token, fileLabel, credentials, {
        skipInReviewOrigin,
      });
    return token;
  }
  try {
    let procPath = `/proc/self/fd/${fd}`;
    let token = readBoundedSync(procPath, {
      maxBytes: MAX_CREDENTIAL_BYTES,
    }).trim();
    if (!token) {
      logForDebugging(`File descriptor contained empty ${label}`, {
        level: "error",
      });
      setCached(null);
      return null;
    }
    logForDebugging(`Successfully read ${label} from file descriptor ${fd}`);
    noteCredentialRoad(envVar, "descriptor_by_path", token);
    setCached(token);
    await persistCredentialForSubprocess(wellKnownPath, token, fileLabel, credentials, {
      skipInReviewOrigin,
    });
    return token;
  } catch (error) {
    logForDebugging(`Failed to read ${label} from file descriptor ${fd}: ${errorMessage(error)}`, {
      level: "error",
    });
    let tokenFromWellKnownFile = await readTokenFromWellKnownFile(readPath, fileLabel, credentials);
    if (tokenFromWellKnownFile) {
      noteCredentialRoad(envVar, "file_after_failed_read", tokenFromWellKnownFile);
      return cacheOrStoreCredential(getCached, setCached, tokenFromWellKnownFile);
    }
    let errnoCode = getErrnoCode(error);
    if ((errnoCode === "EACCES" || errnoCode === "EPERM") && canReadInherited) {
      let token = readFromInheritedDescriptor(fd, label);
      finishDescriptor();
      if (token) {
        noteCredentialRoad(envVar, "descriptor_direct", token);
        setCached(token);
        await persistCredentialForSubprocess(wellKnownPath, token, fileLabel, credentials, {
          skipInReviewOrigin,
        });
        return token;
      }
    }
    return cacheOrStoreCredential(getCached, setCached, null);
  }
}
//@ chunk-hvpfdswb.js:5997-6062 placement
/**
 * 先取缓存，没有则调用设置函数缓存并返回该值。
 */
function cacheOrStoreCredential(getCached, setCached, tokenFromWellKnownFile) {
  let cached = getCached();
  if (cached !== undefined) return cached;
  setCached(tokenFromWellKnownFile);
  return tokenFromWellKnownFile;
}
//@ chunk-hvpfdswb.js:6062-6140 placement
/**
 * 是否还有待消费的后台认证快照（设置了路径且非无盘）。
 */
function hasBgAuthSnapshotPending() {
  return Boolean(process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH) && !isDiskless();
}
//@ chunk-hvpfdswb.js:6140-6250 placement
/**
 * 等待后台认证快照被消费完：按次数与间隔重试，返回最终是否已无待处理快照。
 */
async function waitForBgAuthSnapshot({ attempts = 10, delayMs = 100 } = {}) {
  for (let j = 0; j < attempts && hasBgAuthSnapshotPending(); j++) {
    await sleep(delayMs);
    consumeBgAuthSnapshot();
  }
  return !hasBgAuthSnapshotPending();
}
//@ chunk-hvpfdswb.js:6250-6339 placement
/**
 * 清除后台认证快照环境变量并标记已消费。
 */
function unsetBgAuthSnapshotEnv() {
  env.unset("CLAUDE_BG_AUTH_SNAPSHOT_PATH");
  markDescriptorAnnouncementConsumed("CLAUDE_BG_AUTH_SNAPSHOT_PATH");
}
//@ chunk-hvpfdswb.js:6339-7371 placement
/**
 * 读取后台会话的认证快照（CLAUDE_BG_AUTH_SNAPSHOT_PATH），忙时下次重试。
 */
function consumeBgAuthSnapshot() {
  let envClaudeBgAuthSnapshotPath = process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH;
  if (!envClaudeBgAuthSnapshotPath || isDiskless()) return;
  let contents;
  try {
    contents = readCredentialFile(envClaudeBgAuthSnapshotPath);
  } catch (error) {
    if (isCredentialFileBusyError(error)) {
      logForDebugging(`bg auth snapshot busy, will retry on the next read: ${errorMessage(error)}`, {
        level: "warn",
      });
      return getErrnoCode(error);
    }
    if (!isENOENT(error))
      logForDebugging(`Failed to consume bg auth snapshot: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
  unsetBgAuthSnapshotEnv();
  if (contents === undefined) return;
  try {
    unlink(envClaudeBgAuthSnapshotPath).catch(() => {});
    let parsed = JSON.parse(contents);
    if (typeof parsed?.gatewayToken === "string" && parsed.gatewayToken) {
      setGatewayTokenFromDescriptor(parsed.gatewayToken);
      logForDebugging("Consumed gateway token from bg auth snapshot");
      return;
    }
    if (typeof parsed?.accessToken !== "string" || !parsed.accessToken) {
      logForDebugging("bg auth snapshot missing accessToken", {
        level: "warn",
      });
      return;
    }
    setOauthTokenFromFd(parsed.accessToken);
    setOauthTokenFromBgSnapshot(true);
    setOauthOrgFromBgSnapshot(typeof parsed.organizationUuid === "string" ? parsed.organizationUuid : null);
    if (Array.isArray(parsed.scopes) && parsed.scopes.length > 0) setOauthScopesFromFd(parsed.scopes);
    if (parsed.subscriptionType) process.env.CLAUDE_CODE_SUBSCRIPTION_TYPE = parsed.subscriptionType;
    if (parsed.rateLimitTier) process.env.CLAUDE_CODE_RATE_LIMIT_TIER = parsed.rateLimitTier;
    logForDebugging("Consumed bg auth snapshot from sockDir");
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to consume bg auth snapshot: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
}
//@ chunk-hvpfdswb.js:7371-8643 placement
async function openCredentialPathPolicy(credentials) {
  let envClaudeBgAuthSnapshotPath = process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH;
  if (!envClaudeBgAuthSnapshotPath || isDiskless()) return;
  let handoffCredential = await credentials.readHandoffCredential(envClaudeBgAuthSnapshotPath, {
    symlinkAtPath: env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ? "follow" : "refuse",
  });
  if (process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH !== envClaudeBgAuthSnapshotPath) return;
  switch (handoffCredential.state) {
    case "absent":
      unsetBgAuthSnapshotEnv();
      return;
    case "read-failed":
      if (
        handoffCredential.code !== "EBUSY" &&
        handoffCredential.code !== "EPERM" &&
        !(handoffCredential.code === "EACCES" && getPlatform() === "windows")
      )
        unsetBgAuthSnapshotEnv();
      logForDebugging(`Failed to consume bg auth snapshot: ${handoffCredential.code ?? "unknown error"}`, {
        level: "warn",
      });
      return;
    case "present":
      break;
  }
  unsetBgAuthSnapshotEnv();
  credentials.discardSpentCredentialFile(envClaudeBgAuthSnapshotPath).catch(() => {});
  try {
    let parsed = JSON.parse(handoffCredential.contents);
    if (typeof parsed?.gatewayToken === "string" && parsed.gatewayToken) {
      setGatewayTokenFromDescriptor(parsed.gatewayToken);
      logForDebugging("Consumed gateway token from bg auth snapshot");
      return;
    }
    if (typeof parsed?.accessToken !== "string" || !parsed.accessToken) {
      logForDebugging("bg auth snapshot missing accessToken", {
        level: "warn",
      });
      return;
    }
    setOauthTokenFromFd(parsed.accessToken);
    setOauthTokenFromBgSnapshot(true);
    setOauthOrgFromBgSnapshot(typeof parsed.organizationUuid === "string" ? parsed.organizationUuid : null);
    if (Array.isArray(parsed.scopes) && parsed.scopes.length > 0) setOauthScopesFromFd(parsed.scopes);
    if (parsed.subscriptionType) env.set("CLAUDE_CODE_SUBSCRIPTION_TYPE", String(parsed.subscriptionType));
    if (parsed.rateLimitTier) env.set("CLAUDE_CODE_RATE_LIMIT_TIER", String(parsed.rateLimitTier));
    logForDebugging("Consumed bg auth snapshot from sockDir");
  } catch (error) {
    logForDebugging(`Failed to consume bg auth snapshot: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-hvpfdswb.js:8643-8706 placement
/**
 * 凭据是否可能来自环境变量声明的文件描述符。
 */
function hasPossibleCredentialFromDescriptor(envVarName) {
  return (process.env[envVarName]?.trim() ?? "") !== "" || wasDescriptorAnnouncementConsumed(envVarName);
}
//@ chunk-hvpfdswb.js:8706-8874 fingerprint = getOAuthTokenFromFileDescriptor (0.937)
/**
 * CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR（或 CCR 的 /home/claude/.claude/remote/.oauth_token）读 OAuth 令牌。
 */
function getOAuthTokenFromFileDescriptor() {
  consumeBgAuthSnapshot();
  return getCredentialFromFd({
    envVar: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
    wellKnownPath: CCR_OAUTH_TOKEN_PATH,
    label: "OAuth token",
    getCached: getOauthTokenFromFd,
    setCached: setOauthTokenFromFd,
    skipInReviewOrigin: true,
  });
}
//@ chunk-hvpfdswb.js:8874-8923 layout
async function getOAuthTokenFromFileDescriptorAsync(credentials) {
  await openCredentialPathPolicy(credentials);
  return getOAuthTokenFromFileDescriptor_2(credentials);
}
//@ chunk-hvpfdswb.js:8923-9107 layout = getOAuthTokenFromFileDescriptor (0.937)
async function getOAuthTokenFromFileDescriptor_2(credentials) {
  return readCredentialFromDescriptor({
    envVar: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
    wellKnownPath: CCR_OAUTH_TOKEN_PATH,
    label: "OAuth token",
    getCached: getOauthTokenFromFd,
    setCached: setOauthTokenFromFd,
    credentials,
    skipInReviewOrigin: true,
  });
}
//@ chunk-hvpfdswb.js:9107-9584 layout
/**
 * CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR 读网关令牌（有后台认证快照时不读）。
 */
function getGatewayTokenFromFileDescriptor() {
  let gatewayTokenFromDescriptor = getGatewayTokenFromDescriptor();
  if (gatewayTokenFromDescriptor !== undefined) return gatewayTokenFromDescriptor;
  consumeBgAuthSnapshot();
  let gatewayTokenFromDescriptor_2 = getGatewayTokenFromDescriptor();
  if (gatewayTokenFromDescriptor_2 !== undefined) return gatewayTokenFromDescriptor_2;
  if (process.env.CLAUDE_BG_AUTH_SNAPSHOT_PATH) return null;
  let fdValue = env.CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR;
  let fd = fdValue ? parseInt(fdValue, 10) : Number.NaN;
  let token =
    Number.isNaN(fd) || env.CLAUDE_CODE_REMOTE || typeof process.send === "function" || !isSocket(fd)
      ? null
      : readFromInheritedDescriptor(fd, "gateway token");
  setGatewayTokenFromDescriptor(token);
  delete process.env.CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR;
  if (fdValue?.trim()) markDescriptorAnnouncementConsumed("CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR");
  return token;
}
//@ chunk-hvpfdswb.js:9584-9754 fingerprint = getApiKeyFromFileDescriptor (1)
/**
 * CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR（或 CCR .api_key）读 API key。
 */
function getApiKeyFromFileDescriptor() {
  let apiKeyFromFd = getApiKeyFromFd();
  if (apiKeyFromFd !== undefined) return apiKeyFromFd;
  return getCredentialFromFd({
    envVar: "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
    wellKnownPath: CCR_API_KEY_PATH,
    label: "API key",
    getCached: getApiKeyFromFd,
    setCached: setApiKeyFromFd,
  });
}
//@ chunk-hvpfdswb.js:9754-9911 layout = getApiKeyFromFileDescriptor (1)
async function getApiKeyFromFileDescriptor_2(credentials) {
  return readCredentialFromDescriptor({
    envVar: "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
    wellKnownPath: CCR_API_KEY_PATH,
    label: "API key",
    getCached: getApiKeyFromFd,
    setCached: setApiKeyFromFd,
    credentials,
  });
}
//@ chunk-hvpfdswb.js:9911-9999 placement
/**
 * 判断错误是否为文件被占用或无权限（Windows 上 EACCES 也算）。
 */
function isCredentialFileBusyError(error) {
  let errnoCode = getErrnoCode(error);
  return (
    errnoCode === "EBUSY" || errnoCode === "EPERM" || (errnoCode === "EACCES" && getPlatform() === "windows")
  );
}
//@ chunk-hvpfdswb.js:9999-10187 placement
function readCredentialFile(path) {
  let readOnce = () =>
    readBoundedSync(path, {
      maxBytes: MAX_CREDENTIAL_BYTES,
      symlinkAtPath: env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ? "follow" : "refuse",
      regularFileOnly: true,
    });
  try {
    return readOnce();
  } catch (error) {
    if (isCredentialFileBusyError(error)) return readOnce();
    throw error;
  }
}
export {
  getOAuthTokenFromFileDescriptor,
  getGatewayTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
  hasPossibleCredentialFromDescriptor,
  hasBgAuthSnapshotPending,
  getOAuthTokenFromFileDescriptorAsync,
  openCredentialPathPolicy,
  getOAuthTokenFromFileDescriptor_2,
  getApiKeyFromFileDescriptor_2,
  removeCredentialFile,
  MAX_CREDENTIAL_READ_BYTES,
  CCR_TOKEN_DIR,
  readFromInheritedDescriptor,
  waitForBgAuthSnapshot,
  consumeBgAuthSnapshot,
  CCR_SESSION_INGRESS_TOKEN_PATH,
  MAX_CREDENTIAL_BYTES,
  readWellKnownCredentialFile,
  CCR_OAUTH_TOKEN_PATH,
  CCR_API_KEY_PATH,
  readWellKnownCredentialToken,
  getCredentialFromFd,
  readCredentialFromDescriptor,
  CCR_CREDENTIAL_PATHS,
};
