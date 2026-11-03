/**
 * services/artifacts/frameHost.ts
 *
 * 2.1.316 新增：artifact frame 宿主地址
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (3)
 * attribution: placement 3
 */
import { isCoworkEntrypoint } from "../../utils/entrypointKinds.js";
import { describeCoworkEgress } from "./frameDomains.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";

/**
 * 根据 artifact slug 与环境返回其内容域名（<slug>.frame[.staging].claudeusercontent.com）与 https 基础 URL。
 */
//@ chunk-jv307fw4.js:41841-41981 placement
function getFrameHost(e) {
  let n = `${e.slug}.frame.${e.env === "staging" ? "staging." : ""}claudeusercontent.com`,
    r = void 0;
  return { host: n, base: `https://${n}` };
}
/**
 * 返回 artifact 框架页面的主机通配模式（staging 与正式环境不同）。
 */
//@ chunk-jv307fw4.js:41981-42089 placement
function getFrameHostPattern(e) {
  return e === "staging" ? "*.frame.staging.claudeusercontent.com" : "*.frame.claudeusercontent.com";
}
/**
 * 读取 artifact 被网络拦截时，按运行环境（Cowork、云环境、远程会话、本地沙箱/桌面应用）说明需把哪个通配域名加入允许列表。
 */
//@ chunk-jv307fw4.js:42089-42867 placement
function describeFrameAllowlistHint(env_2) {
  let hostPattern = getFrameHostPattern(env_2);
  return isCoworkEntrypoint()
    ? describeCoworkEgress(hostPattern)
    : mn()
      ? `To allow direct artifact reads here, add ${hostPattern} to the environment's allowed domains: environment settings \u2192 Code \u2192 Network access \u2192 Custom \u2192 Allowed domains. An admin can add the same entry to a shared environment from admin settings \u2192 Cloud environments; sessions that run in that environment get the access.`
      : env.CLAUDE_CODE_REMOTE
        ? `To allow artifact reads here, add ${hostPattern} to the network allowlist of the environment this remote session runs in.`
        : `To allow artifact reads here, add ${hostPattern} to the network allowlist this session runs behind \u2014 the sandbox's allowed domains, or the Claude desktop app's network settings (Settings \u2192 Capabilities; a workspace admin can add it on Team/Enterprise).`;
}

export { getFrameHost, describeFrameAllowlistHint, getFrameHostPattern };
