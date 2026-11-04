/**
 * services/lsp/manager.ts
 *
 * LSP 管理器单例工厂：初始化状态机、代次、远程会话延后、插件刷新后重建、关闭；另混入两个与 LSP 无关的声明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/manager.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (3)
 * attribution: placement 3, fingerprint 1
 */
import { env } from "../../utils/env.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { createLSPServerManager } from "./LSPServerManager.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { registerLSPNotificationHandlers } from "./passiveFeedback.js";
import { logPluginScopedError } from "../../utils/plugins/pluginScopedWrite.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:288956-288982 placement
/**
 * LSP 管理器（外部构建为 null）。
 */
function getLspManager() {
  return null;
}
//@ chunk-e6aww6q8.js:4641689-4641986 placement
/**
 * 远程会话（CLAUDE_CODE_REMOTE / REMOTE_SESSION_ID / REMOTE_ENVIRONMENT_TYPE）且 GrowthBook tengu_moonlit_panda 为 true 时，延后 LSP 初始化。
 */
function shouldDeferLspForRemoteSession() {
  if (!(
    env.CLAUDE_CODE_REMOTE === true ||
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
    Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE)
  ))
    return false;
  let remoteFlag = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_moonlit_panda", false);
  logForDebugging(
    `[LSP MANAGER] Remote session: tengu_moonlit_panda=${String(remoteFlag.value)} (source: ${remoteFlag.source})`,
  );
  return remoteFlag.value === true;
}
//@ chunk-e6aww6q8.js:4641986-4644165 fingerprint = initializeLspServerManager (0.49)
/**
 * LSP 管理器单例工厂：持有 manager、initState(not-started/pending/success/failed)、代次号。initialize() 在 --bare 等禁用 lspServers 时跳过、远程会话按 tengu_moonlit_panda 延后，否则创建 LSPServerManager 并异步 initialize，成功后注册诊断处理器；reinitialize() 关掉旧实例按上次参数重建（插件刷新后）；另有 getStatus/isConnected/hasEverConnected/waitForInitialization/shutdown。
 */
function createLspManagerSingleton() {
  let manager;
  let initState = "not-started";
  let initError;
  let generation = 0;
  let initPromise;
  let lastContext;
  let deferredForRemote = false;
  function getManager() {
    if (initState === "failed") return;
    return manager;
  }
  function getStatus() {
    if (initState === "failed")
      return {
        status: "failed",
        error: initError || Error("Initialization failed"),
      };
    if (initState === "not-started")
      return {
        status: "not-started",
      };
    if (initState === "pending")
      return {
        status: "pending",
      };
    return {
      status: "success",
    };
  }
  function isConnected() {
    if (initState === "failed") return false;
    let manager = getManager();
    if (!manager) return false;
    let servers = manager.getAllServers();
    if (servers.size === 0) return false;
    for (let server of servers.values()) if (server.state !== "error") return true;
    return false;
  }
  let everConnected = false;
  function hasEverConnected() {
    if (!everConnected && isConnected()) everConnected = true;
    return everConnected;
  }
  async function waitForInitialization() {
    if (initState === "success" || initState === "failed") return;
    if (initState === "pending" && initPromise) await initPromise;
  }
  function initialize(context, storageV5, credentials) {
    if (isCustomizationDisabled("lspServers")) return;
    if (shouldDeferLspForRemoteSession()) {
      lastContext = context;
      deferredForRemote = true;
      everConnected = false;
      generation++;
      return;
    }
    deferredForRemote = false;
    logForDebugging("[LSP MANAGER] initializeLspServerManager() called");
    if (manager !== undefined && initState !== "failed") {
      logForDebugging("[LSP MANAGER] Already initialized or initializing, skipping");
      return;
    }
    if (initState === "failed") {
      manager = undefined;
      initError = undefined;
    }
    lastContext = context;
    manager = createLSPServerManager(storageV5, credentials);
    initState = "pending";
    logForDebugging("[LSP MANAGER] Created manager instance, state=pending");
    let currentGeneration = ++generation;
    logForDebugging(`[LSP MANAGER] Starting async initialization (generation ${currentGeneration})`);
    initPromise = manager
      .initialize()
      .then(() => {
        if (currentGeneration === generation) {
          initState = "success";
          logForDebugging("LSP server manager initialized successfully");
          logFeatureOk("lsp_init");
          if (manager) {
            registerLSPNotificationHandlers(manager, context);
            if (manager.getAllServers().size === 0 && !manager.didLastConfigLoadFail()) everConnected = false;
          }
        }
      })
      .catch((error) => {
        if (currentGeneration === generation) {
          initState = "failed";
          initError = error;
          manager = undefined;
          logPluginScopedError(error, "Failed to initialize LSP server manager");
          logForDebugging(`Failed to initialize LSP server manager: ${errorMessage(error)}`);
          logFeatureBad("lsp_init", "lsp_init_failed");
        }
      });
  }
  function reinitialize(storageV5, credentials) {
    let context = lastContext;
    if ((initState === "not-started" && !deferredForRemote) || context === undefined) return;
    logForDebugging("[LSP MANAGER] reinitializeLspServerManager() called");
    if (manager)
      manager.shutdown().catch((error) => {
        logForDebugging(`[LSP MANAGER] old instance shutdown during reinit failed: ${errorMessage(error)}`);
      });
    manager = undefined;
    initState = "not-started";
    initError = undefined;
    initialize(context, storageV5, credentials);
  }
  async function shutdown() {
    if (manager === undefined) {
      deferredForRemote = false;
      return;
    }
    try {
      await manager.shutdown();
      logForDebugging("LSP server manager shut down successfully");
      logFeatureOk("lsp_shutdown");
    } catch (error) {
      logFeatureSad("lsp_shutdown", "lsp_shutdown_failed");
      logForDebugging(`Failed to shutdown LSP server manager: ${errorMessage(error)}`, {
        level: "error",
      });
    } finally {
      manager = undefined;
      initState = "not-started";
      initError = undefined;
      initPromise = undefined;
      lastContext = undefined;
      generation++;
    }
  }
  return {
    get: getManager,
    getStatus,
    isConnected,
    hasEverConnected,
    waitForInitialization,
    initialize,
    reinitialize,
    shutdown,
  };
}
//@ chunk-e6aww6q8.js:4644165-4644313 placement
/**
 * LSP 管理器单例，并解构导出 getLspServerManager/getInitializationStatus/isLspConnected/hasLspEverConnected/waitForLspInitialization/initializeLspServerManager/reinitializeLspServerManager/shutdownLspServerManager。
 */
var lspManagerSingleton; // deferred: uses createLspManagerSingleton of its import cycle while loading; runs once the cycle is complete
var getLspServerManager;
var getInitializationStatus;
var isLspConnected;
var hasLspEverConnected;
var waitForLspInitialization;
var initializeLspServerManager;
var reinitializeLspServerManager;
var shutdownLspServerManager;
deferInit("chunk-e6aww6q8.js:4644165", () => {
  lspManagerSingleton = createLspManagerSingleton();
  ({
    get: getLspServerManager,
    getStatus: getInitializationStatus,
    isConnected: isLspConnected,
    hasEverConnected: hasLspEverConnected,
    waitForInitialization: waitForLspInitialization,
    initialize: initializeLspServerManager,
    reinitialize: reinitializeLspServerManager,
    shutdown: shutdownLspServerManager,
  } = lspManagerSingleton);
});
export {
  getLspManager,
  reinitializeLspServerManager,
  hasLspEverConnected,
  getInitializationStatus,
  getLspServerManager,
  initializeLspServerManager,
  shouldDeferLspForRemoteSession,
  shutdownLspServerManager,
  waitForLspInitialization,
};
