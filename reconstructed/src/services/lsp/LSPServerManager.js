/**
 * services/lsp/LSPServerManager.ts
 *
 * LSP 服务器管理器：按插件配置创建实例、扩展名路由、按需懒启动、didOpen/didChange/didSave 同步与文档版本、打开文档 LRU 淘汰。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/LSPServerManager.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import { pathToFileURL, pathToFileURL as pathToFileURL_2, pathToFileURL as pathToFileURL_3 } from "url";
import { logForDebugging } from "../../utils/debug.js";
import { Wee } from "../../utils/plugins/pluginScopedWrite.js";
import { errorMessage } from "../../utils/errors.js";
import { getAllLspServers } from "./config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createLSPServerInstance } from "./LSPServerInstance.js";

/**
 * 已打开文档的上限 50；超过时按 LRU 对最早的文档发 textDocument/didClose。
 */
//@ chunk-e6aww6q8.js:4632970-4632981 affinity
var MAX_OPEN_DOCUMENTS = 50;
/**
 * LSP 服务器管理器：initialize() 通过 getAllLspServers 读取插件提供的服务器配置，校验 command/extensionToLanguage，为每个创建实例并建立扩展名→服务器映射（同一扩展名只用第一个）。提供 getServerForFile/ensureServerStarted（按需懒启动）/sendRequest/openFile(didOpen)/changeFile(didChange 全量)/saveFile(didSave)/isFileOpen/getDocumentVersion/shutdown，并维护文档版本号与 LRU 淘汰。
 */
//@ chunk-e6aww6q8.js:4632981-4637859 fingerprint = createLSPServerManager (0.814)
function createLSPServerManager(storageV5, credentials) {
  let servers = new Map(),
    extensionMap = new Map(),
    openedFiles = new Map(),
    documentVersions = new Map(),
    lastConfigLoadFailed = !1;
  function nextDocumentVersion(Je) {
    let nt = (documentVersions.get(Je) ?? 0) + 1;
    return (documentVersions.set(Je, nt), nt);
  }
  function touchOpenedFile(Je, nt) {
    (openedFiles.delete(Je), openedFiles.set(Je, nt));
  }
  function evictOpenedFiles() {
    for (let [fileUri, nt] of openedFiles) {
      if (openedFiles.size <= MAX_OPEN_DOCUMENTS) return;
      openedFiles.delete(fileUri);
      let server = servers.get(nt);
      if (!server || server.state !== "running") continue;
      (logForDebugging(`LSP: Sending didClose for evicted document ${fileUri}`),
        server.sendNotification("textDocument/didClose", { textDocument: { uri: fileUri } }).catch((Et) => {
          (Wee(Et, "Failed to send didClose for evicted document"),
            logForDebugging(
              `LSP: Failed to send didClose for evicted document ${fileUri}: ${errorMessage(Et)}`,
              { level: "error" },
            ));
        }));
    }
  }
  async function initialize() {
    let serverConfigs;
    try {
      let pt = await getAllLspServers(storageV5, credentials);
      ((serverConfigs = pt.servers),
        (lastConfigLoadFailed = pt.loadFailed),
        logForDebugging(
          `[LSP SERVER MANAGER] getAllLspServers returned ${Object.keys(serverConfigs).length} server(s)`,
        ));
    } catch (error) {
      throw (
        (lastConfigLoadFailed = !0),
        Wee(
          Error(`Failed to load LSP server configuration: ${errorMessage(error)}`),
          "Failed to load LSP server configuration",
        ),
        logFeatureBad("lsp_config_load", "lsp_config_load_failed"),
        error
      );
    }
    let hadInvalidConfig = !1;
    for (let [serverName, serverConfig] of Object.entries(serverConfigs))
      try {
        if (!serverConfig.command) throw Error(`Server ${serverName} missing required 'command' field`);
        if (!serverConfig.extensionToLanguage || Object.keys(serverConfig.extensionToLanguage).length === 0)
          throw Error(`Server ${serverName} missing required 'extensionToLanguage' field`);
        let instance = createLSPServerInstance(serverName, serverConfig);
        servers.set(serverName, instance);
        let fileExtensions = Object.keys(serverConfig.extensionToLanguage);
        for (let ext of fileExtensions) {
          let normalized = ext.toLowerCase();
          if (!extensionMap.has(normalized)) extensionMap.set(normalized, []);
          let serverList = extensionMap.get(normalized);
          if (serverList) {
            if (serverList.length > 0 && serverList[0] !== serverName)
              logForDebugging(
                `LSP: extension ${normalized} already handled by "${serverList[0]}"; "${serverName}" will not be used for ${normalized} files`,
                { level: "warn" },
              );
            serverList.push(serverName);
          }
        }
      } catch (error) {
        let gt = error;
        (Wee(gt, "Failed to initialize LSP server"),
          logForDebugging(`Failed to initialize LSP server ${serverName}: ${gt.message}`, { level: "error" }),
          (hadInvalidConfig = !0));
      }
    if ((logForDebugging(`LSP manager initialized with ${servers.size} servers`), hadInvalidConfig))
      ((lastConfigLoadFailed = !0), logFeatureSad("lsp_config_load", "lsp_server_config_invalid"));
    else if (lastConfigLoadFailed) logFeatureSad("lsp_config_load", "config_load_failed");
    else logFeatureOk("lsp_config_load");
  }
  async function shutdown() {
    let toStop = Array.from(servers.entries()).filter(
        ([, Et]) => Et.state === "running" || Et.state === "error",
      ),
      results = await Promise.allSettled(toStop.map(([, Et]) => Et.stop()));
    (servers.clear(), extensionMap.clear(), openedFiles.clear(), documentVersions.clear());
    let errors = results
      .map((Et, yt) => (Et.status === "rejected" ? `${toStop[yt][0]}: ${errorMessage(Et.reason)}` : null))
      .filter((Et) => Et !== null);
    if (errors.length > 0) {
      let Et = Error(`Failed to stop ${errors.length} LSP server(s): ${errors.join("; ")}`);
      throw (
        logForDebugging(`Failed to stop ${errors.length} LSP server(s): ${errors.join("; ")}`, {
          level: "error",
        }),
        Et
      );
    }
  }
  function getServerForFile(filePath) {
    let ext = pathModule.extname(filePath).toLowerCase(),
      serverNames = extensionMap.get(ext);
    if (!serverNames || serverNames.length === 0) return;
    let serverName = serverNames[0];
    if (!serverName) return;
    return servers.get(serverName);
  }
  async function ensureServerStarted(filePath) {
    let server = getServerForFile(filePath);
    if (!server) return;
    if (server.state === "stopped" || server.state === "error")
      try {
        await server.start();
        for (let [pt, Et] of openedFiles) if (Et === server.name) openedFiles.delete(pt);
      } catch (error) {
        throw (
          logForDebugging(`Failed to start LSP server for file ${filePath}: ${error.message}`, {
            level: "error",
          }),
          error
        );
      }
    return server;
  }
  async function sendRequest(filePath, method, params) {
    let server = await ensureServerStarted(filePath);
    if (!server) return;
    let href = pathToFileURL(pathModule.resolve(filePath)).href;
    if (openedFiles.get(href) === server.name) touchOpenedFile(href, server.name);
    try {
      return await server.sendRequest(method, params);
    } catch (error) {
      throw (
        logForDebugging(`LSP request failed for file ${filePath}, method '${method}': ${error.message}`, {
          level: "error",
        }),
        error
      );
    }
  }
  function getAllServers() {
    return servers;
  }
  function didLastConfigLoadFail() {
    return lastConfigLoadFailed;
  }
  async function openFile(filePath, content) {
    let server = await ensureServerStarted(filePath);
    if (!server) return;
    let fileUri = pathToFileURL(pathModule.resolve(filePath)).href;
    if (openedFiles.get(fileUri) === server.name) {
      (touchOpenedFile(fileUri, server.name),
        logForDebugging(`LSP: File already open, skipping didOpen for ${filePath}`));
      return;
    }
    let ext = pathModule.extname(filePath).toLowerCase(),
      languageId = server.config.extensionToLanguage[ext] || "plaintext";
    try {
      let At = nextDocumentVersion(fileUri);
      (await server.sendNotification("textDocument/didOpen", {
        textDocument: { uri: fileUri, languageId: languageId, version: At, text: content },
      }),
        touchOpenedFile(fileUri, server.name),
        evictOpenedFiles(),
        logForDebugging(`LSP: Sent didOpen for ${filePath} (languageId: ${languageId})`));
    } catch (error) {
      let It = Error(`Failed to sync file open ${filePath}: ${errorMessage(error)}`);
      throw (logForDebugging(It.message, { level: "error" }), It);
    }
  }
  async function changeFile(filePath, content) {
    let server = getServerForFile(filePath);
    if (!server || server.state !== "running") return openFile(filePath, content);
    let fileUri = pathToFileURL(pathModule.resolve(filePath)).href;
    if (openedFiles.get(fileUri) !== server.name) return openFile(filePath, content);
    touchOpenedFile(fileUri, server.name);
    try {
      let yt = nextDocumentVersion(fileUri);
      (await server.sendNotification("textDocument/didChange", {
        textDocument: { uri: fileUri, version: yt },
        contentChanges: [{ text: content }],
      }),
        logForDebugging(`LSP: Sent didChange for ${filePath} (v${yt})`));
    } catch (error) {
      let gt = Error(`Failed to sync file change ${filePath}: ${errorMessage(error)}`);
      throw (
        logForDebugging(`Failed to sync file change ${filePath}: ${errorMessage(error)}`, { level: "error" }),
        gt
      );
    }
  }
  async function saveFile(filePath) {
    let server = getServerForFile(filePath);
    if (!server || server.state !== "running") return;
    let href = pathToFileURL(pathModule.resolve(filePath)).href;
    if (openedFiles.get(href) !== server.name) return;
    try {
      (await server.sendNotification("textDocument/didSave", { textDocument: { uri: href } }),
        logForDebugging(`LSP: Sent didSave for ${filePath}`));
    } catch (error) {
      let yt = Error(`Failed to sync file save ${filePath}: ${errorMessage(error)}`);
      throw (logForDebugging(yt.message, { level: "error" }), yt);
    }
  }
  function isFileOpen(filePath) {
    let fileUri = pathToFileURL(pathModule.resolve(filePath)).href,
      pt = openedFiles.get(fileUri);
    if (pt === void 0) return !1;
    let Et = servers.get(pt);
    return Et !== void 0 && Et.state === "running";
  }
  function getDocumentVersion(filePath) {
    return documentVersions.get(filePath);
  }
  return {
    initialize: initialize,
    shutdown: shutdown,
    getServerForFile: getServerForFile,
    ensureServerStarted: ensureServerStarted,
    sendRequest: sendRequest,
    getAllServers: getAllServers,
    didLastConfigLoadFail: didLastConfigLoadFail,
    openFile: openFile,
    changeFile: changeFile,
    saveFile: saveFile,
    isFileOpen: isFileOpen,
    getDocumentVersion: getDocumentVersion,
  };
}

export { createLSPServerManager };
