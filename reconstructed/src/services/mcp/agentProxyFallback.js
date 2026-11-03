/**
 * services/mcp/agentProxyFallback.ts
 *
 * 2.1.316 新增：MCP 经代理连接时的 CA 证书回退
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xf20zefw.js (1)
 * attribution: placement 1
 */
import { readFile } from "fs/promises";
import { getUsableProxyUrl, getProxyFetchOptions } from "../../utils/proxy.js";
import { agentProxyEnv } from "../../utils/subprocessEnv.js";
import { logForDebugging } from "../../utils/debug.js";

/**
 * MCP 连接的代理选项：未配置可用代理但代理子环境提供了 HTTPS_PROXY 时，用它做回退代理并尝试读取 SSL_CERT_FILE 作为 CA；否则按常规代理配置。
 */
//@ chunk-xf20zefw.js:341-792 placement
async function mcpProxyFetchOptions(e) {
  if (!getUsableProxyUrl()) {
    let r = agentProxyEnv();
    if (r.HTTPS_PROXY && URL.parse(e)?.protocol === "https:") {
      let n = { url: r.HTTPS_PROXY, noProxy: r.NO_PROXY },
        a = getProxyFetchOptions({ url: e, fallbackProxy: n });
      if (a.proxy === void 0 || !r.SSL_CERT_FILE) return a;
      let i;
      try {
        i = await readFile(r.SSL_CERT_FILE, "utf8");
      } catch (error) {
        logForDebugging(
          `MCP agent-proxy fallback: failed to read CA bundle: ${error instanceof Error ? error.message : String(error)}`,
          { level: "warn" },
        );
      }
      return getProxyFetchOptions({ url: e, fallbackProxy: { ...n, ca: i } });
    }
  }
  return getProxyFetchOptions({ url: e });
}

export { mcpProxyFetchOptions };
