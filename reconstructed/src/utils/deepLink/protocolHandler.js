/**
 * utils/deepLink/protocolHandler.ts
 *
 * --handle-uri 入口：解析深链接、确定工作目录、在终端中启动新的 claude 会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/protocolHandler.ts
 * pieces: chunk-bh9w80kx.js (2)
 * attribution: fingerprint 2
 */
import { realpath } from "fs/promises";
import { homedir } from "os";
import { logForDebugging } from "../debug.js";
import { parseDeepLink } from "./parseDeepLink.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../slowOperations.js";
import { readLastFetchTime } from "./banner.js";
import { formatMarketplaceInstallCommand } from "../../commands/plugin/parseArgs.js";
import { launchInTerminal } from "./terminalLauncher.js";
import { getKnownPathsForRepo, filterExistingPaths } from "../githubRepoPathMapping.js";

/**
 * `claude --handle-uri <uri>` 的处理：解析深链接；open 时解析工作目录（cwd 或按 repo 查本地克隆）并读最近 fetch 时间，install-plugin 时在家目录用预置 query 安装插件；然后在终端里启动新的 claude 会话。返回退出码并上报 deep_link_handle。
 */
//@ chunk-bh9w80kx.js:10523-11432 fingerprint = handleDeepLinkUri (0.685)
async function handleDeepLinkUri(uri) {
  logForDebugging(`Handling deep link URI: ${uri}`);
  let action;
  try {
    action = parseDeepLink(uri);
  } catch (error) {
    let l = error instanceof Error ? error.message : String(error);
    return (console.error(`Deep link error: ${l}`), logFeatureBad("deep_link_handle", "parse_failed"), 1);
  }
  logForDebugging(`Parsed deep link action: ${jsonStringify(action)}`);
  let e = await realpath(process.execPath).catch(() => process.execPath),
    launchAction;
  switch (action.action) {
    case "open": {
      let { cwd: cwd, resolvedRepo: resolvedRepo } = await resolveCwd(action),
        c = resolvedRepo ? await readLastFetchTime(cwd) : void 0;
      launchAction = { query: action.query, cwd: cwd, repo: resolvedRepo, lastFetchMs: c?.getTime() };
      break;
    }
    case "install-plugin":
      launchAction = {
        cwd: homedir(),
        query: formatMarketplaceInstallCommand({
          plugin: action.plugin,
          marketplaceSource: action.marketplace,
        }),
      };
      break;
  }
  let launched;
  try {
    launched = await launchInTerminal(e, launchAction);
  } catch (error) {
    let l = error instanceof Error ? error.message : String(error);
    return (console.error(`Deep link error: ${l}`), logFeatureBad("deep_link_handle", "launch_error"), 1);
  }
  if (!launched)
    return (
      console.error("Failed to open a terminal. Make sure a supported terminal emulator is installed."),
      logFeatureBad("deep_link_handle", "no_terminal"),
      1
    );
  return (logFeatureOk("deep_link_handle"), 0);
}
/**
 * 确定深链接会话的工作目录：显式 cwd；否则按 repo 在已知路径中找存在的本地克隆；都没有用家目录。
 */
//@ chunk-bh9w80kx.js:11432-11696 fingerprint = resolveCwd (1)
async function resolveCwd(action) {
  if (action.cwd) return { cwd: action.cwd };
  if (action.repo) {
    let known = getKnownPathsForRepo(action.repo),
      existing = await filterExistingPaths(known);
    if (existing[0])
      return (
        logForDebugging(`Resolved repo ${action.repo} \u2192 ${existing[0]}`),
        { cwd: existing[0], resolvedRepo: action.repo }
      );
    logForDebugging(`No local clone found for repo ${action.repo}, falling back to home`);
  }
  return { cwd: homedir() };
}
