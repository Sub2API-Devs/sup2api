/**
 * services/deviceBridge/deviceMcpConsent.ts
 *
 * 2.1.316 新增：设备 MCP 同意与"暂不"状态的读写。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-weh04swb.js (24)
 * attribution: placement 24
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { lit } from "../analytics/safeMetadata.js";
import { ADMIN_SCOPES } from "./passthroughMcp.js";
import { FORCE_NOT_REMOTELY_EXECUTABLE } from "../../remote/tools/serve/servedPermissionDecision.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, _enum, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { tildify } from "../../utils/path.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { normalizeHostname } from "../remoteTools/unattendedConsentStore.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getFileReader } from "../../utils/fileStore.js";
import { shortLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-weh04swb.js:18955-18984 placement
var MCP_PASSTHROUGH = lit("mcp_passthrough");
//@ chunk-weh04swb.js:18984-19016 placement
/**
 * 判断作用域是否属于管理员作用域。
 */
function isAdminScope(scope) {
  return ADMIN_SCOPES.has(scope);
}
//@ chunk-weh04swb.js:19016-19025 placement
/**
 * 是否允许把 project 作用域的 MCP 服务器透传给远程设备（当前恒 false）。
 */
var PROJECT_SERVERS_ALLOWED = false;
//@ chunk-weh04swb.js:19025-19074 placement
/**
 * 是否需要对每个服务器单独询问同意（非管理员作用域且允许 project 服务器）。
 */
function shouldAskPerServer(scope) {
  return !isAdminScope(scope) && (PROJECT_SERVERS_ALLOWED || scope !== "project");
}
//@ chunk-weh04swb.js:19074-19083 placement
/**
 * 设备 MCP 同意记录的 schema 版本（1）。
 */
var CONSENT_SCHEMA_VERSION = 1;
//@ chunk-weh04swb.js:19083-19199 placement
function describeConsentPolicy() {
  return [
    FORCE_NOT_REMOTELY_EXECUTABLE ? "each-call-asked" : "local-rules-decide",
    PROJECT_SERVERS_ALLOWED ? "project-servers" : "no-project-servers",
  ].join("+");
}
//@ chunk-weh04swb.js:19199-19364 placement
/**
 * 设备 MCP 同意记录的 schema（版本、接受/拒绝、条款、决定时间、主机名）及其存储键名与"暂不"键名。
 */
var DEVICE_MCP_CONSENT_SCHEMA; // deferred: uses CONSENT_SCHEMA_VERSION of its import cycle while loading; runs once the cycle is complete
var DEVICE_MCP_CONSENT;
var DEVICE_MCP_CONSENT_NOT_NOW;
var CONSENT_SCHEMA_VERSION_2;
deferInit("chunk-weh04swb.js:19199", () => {
  DEVICE_MCP_CONSENT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      version: literal(CONSENT_SCHEMA_VERSION),
      choice: _enum(["accepted", "declined"]),
      terms: stringSchema(),
      decidedAt: stringSchema(),
      hostname: stringSchema(),
    }),
  );
  DEVICE_MCP_CONSENT = "device-mcp-consent";
  DEVICE_MCP_CONSENT_NOT_NOW = "device-mcp-consent-not-now";
  CONSENT_SCHEMA_VERSION_2 = 1;
});
//@ chunk-weh04swb.js:19364-19424 placement
/**
 * 如何让用户被重新询问的提示：删掉同意文件。
 */
function deleteConsentHint() {
  return `delete ${tildify(consentFilePath())} to be asked again`;
}
//@ chunk-weh04swb.js:19424-19507 placement
/**
 * 如何让用户被重新询问的提示：删掉 not-now 文件并新开 cloud 会话。
 */
function deleteNotNowHint() {
  return `delete ${tildify(notNowFilePath())}, then start a new claude --cloud session`;
}
//@ chunk-weh04swb.js:19507-19558 placement
/**
 * 设备 MCP 状态文件的路径（configDir/state/<key>.json）。
 */
function stateFilePath(key) {
  return join(getClaudeConfigDir(), "state", `${key}.json`);
}
//@ chunk-weh04swb.js:19558-19586 placement
/**
 * 设备 MCP 同意记录的文件路径。
 */
function consentFilePath() {
  return stateFilePath(DEVICE_MCP_CONSENT);
}
//@ chunk-weh04swb.js:19586-19614 placement
/**
 * 设备 MCP “暂不同意”记录的文件路径。
 */
function notNowFilePath() {
  return stateFilePath(DEVICE_MCP_CONSENT_NOT_NOW);
}
//@ chunk-weh04swb.js:19614-19974 placement
async function readDeviceMcpConsent(store) {
  let text;
  try {
    text = await store.readText();
  } catch (error) {
    logForDebugging(`device-mcp consent: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return "unreadable";
  }
  if (text === undefined) return "unset";
  try {
    let parsed = DEVICE_MCP_CONSENT_SCHEMA().safeParse(jsonParse(text));
    return parsed.success &&
      normalizeHostname(parsed.data.hostname) === normalizeHostname(store.hostname()) &&
      (parsed.data.choice === "declined" || parsed.data.terms === describeConsentPolicy())
      ? parsed.data.choice
      : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-weh04swb.js:19974-20049 placement
async function deviceMcpConsentAnswer(store) {
  let deviceMcpConsent = await readDeviceMcpConsent(store);
  return deviceMcpConsent === "unreadable" ? "unset" : deviceMcpConsent;
}
//@ chunk-weh04swb.js:20049-20298 placement
async function writeDeviceMcpConsent(choice, store) {
  try {
    await store.writeText(
      jsonStringify(
        {
          version: CONSENT_SCHEMA_VERSION,
          choice,
          terms: describeConsentPolicy(),
          decidedAt: store.now().toISOString(),
          hostname: normalizeHostname(store.hostname()),
        },
        null,
        2,
      ) +
        `
`,
    );
    return true;
  } catch (error) {
    logForDebugging(`device-mcp consent: answer not saved (${errorMessage(error)})`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-weh04swb.js:20298-20373 placement
/**
 * not-now 记录的 schema。
 */
var notNowSchema; // deferred: uses DEVICE_MCP_CONSENT_SCHEMA of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-weh04swb.js:20298", () => {
  notNowSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(CONSENT_SCHEMA_VERSION_2),
      servers: array(stringSchema()),
      decidedAt: stringSchema(),
      hostname: stringSchema(),
    }),
  );
});
//@ chunk-weh04swb.js:20373-20658 placement
async function readDeviceMcpNotNow(store) {
  let text;
  try {
    text = await store.readText();
  } catch (error) {
    logForDebugging(`device-mcp not-now: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return [];
  }
  if (text === undefined) return [];
  try {
    let parsed = notNowSchema().safeParse(jsonParse(text));
    return parsed.success && normalizeHostname(parsed.data.hostname) === normalizeHostname(store.hostname())
      ? parsed.data.servers
      : [];
  } catch {
    return [];
  }
}
//@ chunk-weh04swb.js:20658-20890 placement
async function writeDeviceMcpNotNow(servers, store) {
  try {
    await store.writeText(
      jsonStringify(
        {
          version: CONSENT_SCHEMA_VERSION_2,
          servers,
          decidedAt: store.now().toISOString(),
          hostname: normalizeHostname(store.hostname()),
        },
        null,
        2,
      ) +
        `
`,
    );
    return true;
  } catch (error) {
    logForDebugging(`device-mcp not-now: not saved (${errorMessage(error)})`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-weh04swb.js:20890-21009 placement
async function clearDeviceMcpNotNow(store) {
  try {
    await store.removeText();
  } catch (error) {
    logForDebugging(`device-mcp not-now: not cleared (${errorMessage(error)})`, {
      level: "warn",
    });
  }
}
//@ chunk-weh04swb.js:21009-21099 placement
/**
 * 判断 n 是否是 e 的子集（e 为空时 false）。
 */
function containsAll(all, required) {
  if (all.length === 0) return false;
  let requiredSet = new Set(all);
  return required.every((name) => requiredSet.has(name));
}
//@ chunk-weh04swb.js:21099-21768 placement
/**
 * 为设备 MCP 状态建立读写对象：启用 v5 存储时读写存储里的 state 键，否则读写本地文件（0600 原子写）；附带当前时间与主机名函数。
 */
function createDeviceMcpStateStore(key, storage) {
  let v5Storage = isStorageV5Enabled() && storage !== undefined ? storage : undefined;
  let storageKey = STORAGE_SPACES.state(key);
  let filePath = stateFilePath(key);
  return {
    readText: async () => {
      if (v5Storage) {
        let text = await v5Storage.readText([storageKey]);
        if (!text.ok) throw Error("device-mcp state read failed");
        let item = text.value.items[0];
        return item.found ? item.value : undefined;
      }
      try {
        return await getFileReader().read(filePath);
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (text) => {
      if (v5Storage) {
        if (
          !(
            await v5Storage.write(storageKey, text, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device-mcp state write failed");
        return;
      }
      await getFileReader().mkdir(dirname(filePath), 448);
      await getFileReader().atomicWrite(filePath, text, 384);
    },
    removeText: async () => {
      if (v5Storage) {
        if (!(await v5Storage.delete(storageKey)).ok) throw Error("device-mcp state delete failed");
        return;
      }
      try {
        await getFileReader().delete(filePath);
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-weh04swb.js:21768-21800 placement
function deviceMcpConsentStore(storageV5) {
  return createDeviceMcpStateStore(DEVICE_MCP_CONSENT, storageV5);
}
//@ chunk-weh04swb.js:21800-21832 placement
function deviceMcpNotNowStore(storageV5) {
  return createDeviceMcpStateStore(DEVICE_MCP_CONSENT_NOT_NOW, storageV5);
}
//@ chunk-weh04swb.js:21832-21861 placement
/**
 * 取服务器的短标签。
 */
function shortServerLabel(serverName) {
  return shortLabel(serverName);
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/services/deviceBridge/deviceMcpConsent.js");
export {
  deviceMcpConsentAnswer,
  deviceMcpConsentStore,
  containsAll,
  readDeviceMcpNotNow,
  deviceMcpNotNowStore,
  readDeviceMcpConsent,
  writeDeviceMcpNotNow,
  clearDeviceMcpNotNow,
  shortServerLabel,
  writeDeviceMcpConsent,
  shouldAskPerServer,
  deleteConsentHint,
  deleteNotNowHint,
  isAdminScope,
  MCP_PASSTHROUGH,
};
