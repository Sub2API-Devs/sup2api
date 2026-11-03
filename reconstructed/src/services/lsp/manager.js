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
import { Wee } from "../../utils/plugins/pluginScopedWrite.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 远程会话（CLAUDE_CODE_REMOTE / REMOTE_SESSION_ID / REMOTE_ENVIRONMENT_TYPE）且 GrowthBook tengu_moonlit_panda 为 true 时，延后 LSP 初始化。
 */
//@ chunk-e6aww6q8.js:4641689-4641986 placement
function shouldDeferLspForRemoteSession() {
  if (!(
    env.CLAUDE_CODE_REMOTE === !0 ||
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
    Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE)
  ))
    return !1;
  let n = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_moonlit_panda", !1);
  return (
    logForDebugging(
      `[LSP MANAGER] Remote session: tengu_moonlit_panda=${String(n.value)} (source: ${n.source})`,
    ),
    n.value === !0
  );
}
/**
 * LSP 管理器单例工厂：持有 manager、initState(not-started/pending/success/failed)、代次号。initialize() 在 --bare 等禁用 lspServers 时跳过、远程会话按 tengu_moonlit_panda 延后，否则创建 LSPServerManager 并异步 initialize，成功后注册诊断处理器；reinitialize() 关掉旧实例按上次参数重建（插件刷新后）；另有 getStatus/isConnected/hasEverConnected/waitForInitialization/shutdown。
 */
//@ chunk-e6aww6q8.js:4641986-4644165 fingerprint = initializeLspServerManager (0.49)
function createLspManagerSingleton() {
  let manager,
    initState = "not-started",
    initError,
    generation = 0,
    initPromise,
    lastContext,
    deferredForRemote = !1;
  function getManager() {
    if (initState === "failed") return;
    return manager;
  }
  function getStatus() {
    if (initState === "failed")
      return { status: "failed", error: initError || Error("Initialization failed") };
    if (initState === "not-started") return { status: "not-started" };
    if (initState === "pending") return { status: "pending" };
    return { status: "success" };
  }
  function isConnected() {
    if (initState === "failed") return !1;
    let Ae = getManager();
    if (!Ae) return !1;
    let allServers = Ae.getAllServers();
    if (allServers.size === 0) return !1;
    for (let Me of allServers.values()) if (Me.state !== "error") return !0;
    return !1;
  }
  let everConnected = !1;
  function hasEverConnected() {
    if (!everConnected && isConnected()) everConnected = !0;
    return everConnected;
  }
  async function waitForInitialization() {
    if (initState === "success" || initState === "failed") return;
    if (initState === "pending" && initPromise) await initPromise;
  }
  function initialize(context, storageV5, credentials) {
    if (isCustomizationDisabled("lspServers")) return;
    if (shouldDeferLspForRemoteSession()) {
      ((lastContext = context), (deferredForRemote = !0), (everConnected = !1), generation++);
      return;
    }
    if (
      ((deferredForRemote = !1),
      logForDebugging("[LSP MANAGER] initializeLspServerManager() called"),
      manager !== void 0 && initState !== "failed")
    ) {
      logForDebugging("[LSP MANAGER] Already initialized or initializing, skipping");
      return;
    }
    if (initState === "failed") ((manager = void 0), (initError = void 0));
    ((lastContext = context),
      (manager = createLSPServerManager(storageV5, credentials)),
      (initState = "pending"),
      logForDebugging("[LSP MANAGER] Created manager instance, state=pending"));
    let currentGeneration = ++generation;
    (logForDebugging(`[LSP MANAGER] Starting async initialization (generation ${currentGeneration})`),
      (initPromise = manager
        .initialize()
        .then(() => {
          if (currentGeneration === generation) {
            if (
              ((initState = "success"),
              logForDebugging("LSP server manager initialized successfully"),
              logFeatureOk("lsp_init"),
              manager)
            ) {
              if (
                (registerLSPNotificationHandlers(manager, context),
                manager.getAllServers().size === 0 && !manager.didLastConfigLoadFail())
              )
                everConnected = !1;
            }
          }
        })
        .catch((error) => {
          if (currentGeneration === generation)
            ((initState = "failed"),
              (initError = error),
              (manager = void 0),
              Wee(error, "Failed to initialize LSP server manager"),
              logForDebugging(`Failed to initialize LSP server manager: ${errorMessage(error)}`),
              logFeatureBad("lsp_init", "lsp_init_failed"));
        })));
  }
  function reinitialize(Ae, Ie) {
    let Me = lastContext;
    if ((initState === "not-started" && !deferredForRemote) || Me === void 0) return;
    if ((logForDebugging("[LSP MANAGER] reinitializeLspServerManager() called"), manager))
      manager.shutdown().catch((We) => {
        logForDebugging(`[LSP MANAGER] old instance shutdown during reinit failed: ${errorMessage(We)}`);
      });
    ((manager = void 0), (initState = "not-started"), (initError = void 0), initialize(Me, Ae, Ie));
  }
  async function shutdown() {
    if (manager === void 0) {
      deferredForRemote = !1;
      return;
    }
    try {
      (await manager.shutdown(),
        logForDebugging("LSP server manager shut down successfully"),
        logFeatureOk("lsp_shutdown"));
    } catch (error) {
      (logFeatureSad("lsp_shutdown", "lsp_shutdown_failed"),
        logForDebugging(`Failed to shutdown LSP server manager: ${errorMessage(error)}`, { level: "error" }));
    } finally {
      ((manager = void 0),
        (initState = "not-started"),
        (initError = void 0),
        (initPromise = void 0),
        (lastContext = void 0),
        generation++);
    }
  }
  return {
    get: getManager,
    getStatus: getStatus,
    isConnected: isConnected,
    hasEverConnected: hasEverConnected,
    waitForInitialization: waitForInitialization,
    initialize: initialize,
    reinitialize: reinitialize,
    shutdown: shutdown,
  };
}
/**
 * LSP 管理器单例，并解构导出 getLspServerManager/getInitializationStatus/isLspConnected/hasLspEverConnected/waitForLspInitialization/initializeLspServerManager/reinitializeLspServerManager/shutdownLspServerManager。
 */
//@ chunk-e6aww6q8.js:4644165-4644313 placement
var lspManagerSingleton = createLspManagerSingleton(),
  {
    get: getLspServerManager,
    getStatus: getInitializationStatus,
    isConnected: isLspConnected,
    hasEverConnected: hasLspEverConnected,
    waitForInitialization: waitForLspInitialization,
    initialize: initializeLspServerManager,
    reinitialize: reinitializeLspServerManager,
    shutdown: shutdownLspServerManager,
  } = lspManagerSingleton;
/**
 * LSP 管理器（外部构建为 null）。
 */
//@ chunk-aepeg2w5.js:288956-288982 placement
function getLspManager() {
  return null;
}

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
