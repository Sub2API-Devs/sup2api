/**
 * services/mcp/agentProxyFallback.ts
 *
 * 2.1.316 新增：MCP 经代理连接时的 CA 证书回退
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-47an5z4k.js (1)
 * attribution: placement 1
 */
import { readFile } from "fs/promises";
import { currentToolCall } from "../../plugins/functionHooks/mcpServerHooks.js";
import { getProxyFetchOptions, getUsableProxyUrl } from "../../utils/proxy.js";
import { agentProxyEnv } from "../../utils/subprocessEnv.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-47an5z4k.js:378-900 placement
/**
 * MCP 连接的代理选项：未配置可用代理但代理子环境提供了 HTTPS_PROXY 时，用它做回退代理并尝试读取 SSL_CERT_FILE 作为 CA；否则按常规代理配置。
 */
async function mcpProxyFetchOptions(url) {
  if (currentToolCall()?.serves?.(url))
    return {
      ...getProxyFetchOptions({
        url,
      }),
      proxy: false,
      redirect: "error",
    };
  if (!getUsableProxyUrl()) {
    let agentEnv = agentProxyEnv();
    if (agentEnv.HTTPS_PROXY && URL.parse(url)?.protocol === "https:") {
      let fallbackProxy = {
        url: agentEnv.HTTPS_PROXY,
        noProxy: agentEnv.NO_PROXY,
      };
      let proxyFetchOptions = getProxyFetchOptions({
        url,
        fallbackProxy,
      });
      if (proxyFetchOptions.proxy === undefined || !agentEnv.SSL_CERT_FILE) return proxyFetchOptions;
      let ca;
      try {
        ca = await readFile(agentEnv.SSL_CERT_FILE, "utf8");
      } catch (error) {
        logForDebugging(
          `MCP agent-proxy fallback: failed to read CA bundle: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "warn",
          },
        );
      }
      return getProxyFetchOptions({
        url,
        fallbackProxy: {
          ...fallbackProxy,
          ca,
        },
      });
    }
  }
  return getProxyFetchOptions({
    url,
  });
}
export { mcpProxyFetchOptions };
