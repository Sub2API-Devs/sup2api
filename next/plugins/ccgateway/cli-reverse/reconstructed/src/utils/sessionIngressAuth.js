/**
 * utils/sessionIngressAuth.ts
 *
 * 远程会话 ingress 令牌与认证头（环境变量或文件描述符）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionIngressAuth.ts
 * pieces: chunk-ja0weedh.js (6)
 * attribution: callgraph-witnessed 1, layout 2, fingerprint 2, placement 1
 */
import {
  getCredentialFromFd,
  CCR_SESSION_INGRESS_TOKEN_PATH,
  readCredentialFromDescriptor,
} from "./authFileDescriptor.js";
import { getSessionIngressToken, setSessionIngressToken } from "../bootstrap/state.js";
import { configureApiKeyHeaders } from "../services/api/client.js";

//@ chunk-ja0weedh.js:277-532 callgraph-witnessed (2.1.88 match: getTokenFromFileDescriptor, 0.22)
function getTokenFromFileDescriptor() {
  return getCredentialFromFd({
    envVar: "CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",
    wellKnownPath: CCR_SESSION_INGRESS_TOKEN_PATH,
    readPath: process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ?? CCR_SESSION_INGRESS_TOKEN_PATH,
    label: "token",
    fileLabel: "session ingress token",
    getCached: getSessionIngressToken,
    setCached: setSessionIngressToken,
    skipInReviewOrigin: true,
  });
}
//@ chunk-ja0weedh.js:532-864 layout
/**
 * 未设置会话访问令牌时，从文件描述符或约定路径读取会话入口令牌并缓存（审核来源跳过）。
 */
async function loadSessionIngressToken(credentials) {
  if (process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN) return;
  await readCredentialFromDescriptor({
    envVar: "CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",
    wellKnownPath: CCR_SESSION_INGRESS_TOKEN_PATH,
    readPath: process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ?? CCR_SESSION_INGRESS_TOKEN_PATH,
    label: "token",
    fileLabel: "session ingress token",
    getCached: getSessionIngressToken,
    setCached: setSessionIngressToken,
    credentials,
    skipInReviewOrigin: true,
  });
}
//@ chunk-ja0weedh.js:864-954 fingerprint (2.1.88 match: getSessionIngressAuthToken, 1)
/**
 * 远程会话 ingress 令牌：CLAUDE_CODE_SESSION_ACCESS_TOKEN 或 CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR 指向的文件描述符。
 */
function getSessionIngressAuthToken() {
  let envToken = process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
  if (envToken) return envToken;
  return getTokenFromFileDescriptor();
}
//@ chunk-ja0weedh.js:954-988 layout
function hasSessionIngressAuthToken() {
  return getSessionIngressAuthToken() !== null;
}
//@ chunk-ja0weedh.js:988-1191 fingerprint (2.1.88 match: getSessionIngressAuthHeaders, 0.906)
/**
 * ingress 请求头：sk-ant-sid 会话密钥用 Cookie sessionKey=，否则 Bearer，附 X-Organization-Uuid。
 */
function getSessionIngressAuthHeaders() {
  let token = getSessionIngressAuthToken();
  if (!token) return {};
  if (token.startsWith("sk-ant-sid")) {
    let headers = {
      Cookie: `sessionKey=${token}`,
    };
    let orgUuid = process.env.CLAUDE_CODE_ORGANIZATION_UUID;
    if (orgUuid) headers["X-Organization-Uuid"] = orgUuid;
    return headers;
  }
  return configureApiKeyHeaders(token);
}
//@ chunk-ja0weedh.js:1249-1312 placement (2.1.88 match: getSessionIngressAuthToken, 1)
function getSessionIngressAuthToken_2(token) {
  process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = token;
}
export {
  getSessionIngressAuthToken,
  getSessionIngressAuthHeaders,
  getSessionIngressAuthToken_2,
  hasSessionIngressAuthToken,
  loadSessionIngressToken,
};
