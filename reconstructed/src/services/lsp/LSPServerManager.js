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
import "path";
import * as pathModule_2 from "path";
import "path";
import { pathToFileURL } from "url";
import { logForDebugging } from "../../utils/debug.js";
import { logPluginScopedError } from "../../utils/plugins/pluginScopedWrite.js";
import { errorMessage } from "../../utils/errors.js";
import { getAllLspServers } from "./config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createLSPServerInstance } from "./LSPServerInstance.js";

//@ chunk-e6aww6q8.js:4632970-4632981 affinity
/**
 * 已打开文档的上限 50；超过时按 LRU 对最早的文档发 textDocument/didClose。
 */
var MAX_OPEN_DOCUMENTS = 50;
//@ chunk-e6aww6q8.js:4632981-4637859 fingerprint = createLSPServerManager (0.814)
/**
 * LSP 服务器管理器：initialize() 通过 getAllLspServers 读取插件提供的服务器配置，校验 command/extensionToLanguage，为每个创建实例并建立扩展名→服务器映射（同一扩展名只用第一个）。提供 getServerForFile/ensureServerStarted（按需懒启动）/sendRequest/openFile(didOpen)/changeFile(didChange 全量)/saveFile(didSave)/isFileOpen/getDocumentVersion/shutdown，并维护文档版本号与 LRU 淘汰。
 */
function createLSPServerManager(storageV5, credentials) {
  let servers = new Map();
  let extensionMap = new Map();
  let openedFiles = new Map();
  let documentVersions = new Map();
  let lastConfigLoadFailed = false;
  function nextDocumentVersion(fileUri) {
    let version = (documentVersions.get(fileUri) ?? 0) + 1;
    documentVersions.set(fileUri, version);
    return version;
  }
  function touchOpenedFile(fileUri, name) {
    openedFiles.delete(fileUri);
    openedFiles.set(fileUri, name);
  }
  function evictOpenedFiles() {
    for (let [fileUri, serverName] of openedFiles) {
      if (openedFiles.size <= MAX_OPEN_DOCUMENTS) return;
      openedFiles.delete(fileUri);
      let server = servers.get(serverName);
      if (!server || server.state !== "running") continue;
      logForDebugging(`LSP: Sending didClose for evicted document ${fileUri}`);
      server
        .sendNotification("textDocument/didClose", {
          textDocument: {
            uri: fileUri,
          },
        })
        .catch((error) => {
          logPluginScopedError(error, "Failed to send didClose for evicted document");
          logForDebugging(
            `LSP: Failed to send didClose for evicted document ${fileUri}: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        });
    }
  }
  async function initialize() {
    let serverConfigs;
    try {
      let result = await getAllLspServers(storageV5, credentials);
      serverConfigs = result.servers;
      lastConfigLoadFailed = result.loadFailed;
      logForDebugging(
        `[LSP SERVER MANAGER] getAllLspServers returned ${Object.keys(serverConfigs).length} server(s)`,
      );
    } catch (error) {
      lastConfigLoadFailed = true;
      logPluginScopedError(
        Error(`Failed to load LSP server configuration: ${errorMessage(error)}`),
        "Failed to load LSP server configuration",
      );
      logFeatureBad("lsp_config_load", "lsp_config_load_failed");
      throw error;
    }
    let hadInvalidConfig = false;
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
                {
                  level: "warn",
                },
              );
            serverList.push(serverName);
          }
        }
      } catch (error) {
        let err = error;
        logPluginScopedError(err, "Failed to initialize LSP server");
        logForDebugging(`Failed to initialize LSP server ${serverName}: ${err.message}`, {
          level: "error",
        });
        hadInvalidConfig = true;
      }
    logForDebugging(`LSP manager initialized with ${servers.size} servers`);
    if (hadInvalidConfig) {
      lastConfigLoadFailed = true;
      logFeatureSad("lsp_config_load", "lsp_server_config_invalid");
    } else if (lastConfigLoadFailed) logFeatureSad("lsp_config_load", "config_load_failed");
    else logFeatureOk("lsp_config_load");
  }
  async function shutdown() {
    let toStop = Array.from(servers.entries()).filter(
      ([, server]) => server.state === "running" || server.state === "error",
    );
    let results = await Promise.allSettled(toStop.map(([, server]) => server.stop()));
    servers.clear();
    extensionMap.clear();
    openedFiles.clear();
    documentVersions.clear();
    let errors = results
      .map((result, i) =>
        result.status === "rejected" ? `${toStop[i][0]}: ${errorMessage(result.reason)}` : null,
      )
      .filter((e) => e !== null);
    if (errors.length > 0) {
      let err = Error(`Failed to stop ${errors.length} LSP server(s): ${errors.join("; ")}`);
      logForDebugging(`Failed to stop ${errors.length} LSP server(s): ${errors.join("; ")}`, {
        level: "error",
      });
      throw err;
    }
  }
  function getServerForFile(filePath) {
    let ext = pathModule_2.extname(filePath).toLowerCase();
    let serverNames = extensionMap.get(ext);
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
        for (let [fileUri, openServerName] of openedFiles)
          if (openServerName === server.name) openedFiles.delete(fileUri);
      } catch (error) {
        logForDebugging(`Failed to start LSP server for file ${filePath}: ${error.message}`, {
          level: "error",
        });
        throw error;
      }
    return server;
  }
  async function sendRequest(filePath, method, params) {
    let server = await ensureServerStarted(filePath);
    if (!server) return;
    let href = pathToFileURL(pathModule_2.resolve(filePath)).href;
    if (openedFiles.get(href) === server.name) touchOpenedFile(href, server.name);
    try {
      return await server.sendRequest(method, params);
    } catch (error) {
      logForDebugging(`LSP request failed for file ${filePath}, method '${method}': ${error.message}`, {
        level: "error",
      });
      throw error;
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
    let fileUri = pathToFileURL(pathModule_2.resolve(filePath)).href;
    if (openedFiles.get(fileUri) === server.name) {
      touchOpenedFile(fileUri, server.name);
      logForDebugging(`LSP: File already open, skipping didOpen for ${filePath}`);
      return;
    }
    let ext = pathModule_2.extname(filePath).toLowerCase();
    let languageId = server.config.extensionToLanguage[ext] || "plaintext";
    try {
      let version = nextDocumentVersion(fileUri);
      await server.sendNotification("textDocument/didOpen", {
        textDocument: {
          uri: fileUri,
          languageId,
          version,
          text: content,
        },
      });
      touchOpenedFile(fileUri, server.name);
      evictOpenedFiles();
      logForDebugging(`LSP: Sent didOpen for ${filePath} (languageId: ${languageId})`);
    } catch (error) {
      let err = Error(`Failed to sync file open ${filePath}: ${errorMessage(error)}`);
      logForDebugging(err.message, {
        level: "error",
      });
      throw err;
    }
  }
  async function changeFile(filePath, content) {
    let server = getServerForFile(filePath);
    if (!server || server.state !== "running") return openFile(filePath, content);
    let fileUri = pathToFileURL(pathModule_2.resolve(filePath)).href;
    if (openedFiles.get(fileUri) !== server.name) return openFile(filePath, content);
    touchOpenedFile(fileUri, server.name);
    try {
      let version = nextDocumentVersion(fileUri);
      await server.sendNotification("textDocument/didChange", {
        textDocument: {
          uri: fileUri,
          version,
        },
        contentChanges: [
          {
            text: content,
          },
        ],
      });
      logForDebugging(`LSP: Sent didChange for ${filePath} (v${version})`);
    } catch (error) {
      let err = Error(`Failed to sync file change ${filePath}: ${errorMessage(error)}`);
      logForDebugging(`Failed to sync file change ${filePath}: ${errorMessage(error)}`, {
        level: "error",
      });
      throw err;
    }
  }
  async function saveFile(filePath) {
    let server = getServerForFile(filePath);
    if (!server || server.state !== "running") return;
    let href = pathToFileURL(pathModule_2.resolve(filePath)).href;
    if (openedFiles.get(href) !== server.name) return;
    try {
      await server.sendNotification("textDocument/didSave", {
        textDocument: {
          uri: href,
        },
      });
      logForDebugging(`LSP: Sent didSave for ${filePath}`);
    } catch (error) {
      let err = Error(`Failed to sync file save ${filePath}: ${errorMessage(error)}`);
      logForDebugging(err.message, {
        level: "error",
      });
      throw err;
    }
  }
  function isFileOpen(filePath) {
    let fileUri = pathToFileURL(pathModule_2.resolve(filePath)).href;
    let openServerName = openedFiles.get(fileUri);
    if (openServerName === undefined) return false;
    let server = servers.get(openServerName);
    return server !== undefined && server.state === "running";
  }
  function getDocumentVersion(filePath) {
    return documentVersions.get(filePath);
  }
  return {
    initialize,
    shutdown,
    getServerForFile,
    ensureServerStarted,
    sendRequest,
    getAllServers,
    didLastConfigLoadFail,
    openFile,
    changeFile,
    saveFile,
    isFileOpen,
    getDocumentVersion,
  };
}
export { createLSPServerManager };
