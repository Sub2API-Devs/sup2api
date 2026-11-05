/**
 * services/deviceBridge/deviceMcpSnapshot.ts
 *
 * 2.1.316 新增：设备 MCP 快照。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-grjat6we.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  record,
  union,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringifyRaw, jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { TOOL_META_KEYS } from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { normalizeHostname } from "../remoteTools/unattendedConsentStore.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { tildify } from "../../utils/path.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getFileReader } from "../../utils/fileStore.js";

//@ chunk-grjat6we.js:711-755 placement
/**
 * 快照里单个名字的最大字符数（128）。
 */
var SNAPSHOT_SCHEMA_VERSION = 1;
var DEVICE_MCP_SNAPSHOT = "device-mcp-snapshot";
var MAX_SNAPSHOT_SERVERS = 8;
var MAX_SNAPSHOT_NAME_CHARS = 128;
//@ chunk-grjat6we.js:755-815 placement
/**
 * 该服务器的快照是否有新增或变化。
 */
function hasSnapshotChanges(snapshot) {
  return snapshot.added.length > 0 || snapshot.changed.length > 0;
}
//@ chunk-grjat6we.js:815-957 placement
var DEVICE_MCP_SNAPSHOT_SCHEMA = DoctorLazy(() =>
  objectSchema({
    version: literal(SNAPSHOT_SCHEMA_VERSION),
    hostname: stringSchema(),
    servers: record(stringSchema(), union([record(stringSchema(), stringSchema()), literal("declined")])),
    withheld: record(
      stringSchema(),
      objectSchema({
        added: array(stringSchema()),
        changed: array(stringSchema()),
      }),
    ),
  }),
);
//@ chunk-grjat6we.js:957-1139 placement
/**
 * 计算 MCP 工具外观（名称、描述、输入 schema、搜索提示）的内容哈希，用于检测工具变更。
 */
function hashToolShape(tool) {
  let _meta = typeof tool._meta === "object" && tool._meta !== null ? tool._meta : {};
  return computeContentHash(
    jsonStringifyRaw({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      searchHint: _meta[TOOL_META_KEYS.searchHint],
    }),
  );
}
//@ chunk-grjat6we.js:1139-1206 placement
/**
 * 生成工具名到形状哈希的映射。
 */
function toolShapeHashes(tools) {
  return Object.fromEntries(tools.map((tool) => [tool.name, hashToolShape(tool)]));
}
//@ chunk-grjat6we.js:1206-1453 placement
function diffToolHashes(current, previous) {
  if (previous === "declined")
    return {
      added: [],
      changed: [],
    };
  let entries = Object.keys(current).filter((key) => !Object.hasOwn(previous, key));
  let entries_2 = Object.keys(current).filter(
    (key) => Object.hasOwn(previous, key) && previous[key] !== current[key],
  );
  if (entries.length === 0 && entries_2.length === 0) return;
  return {
    added: clipSnapshotEntries(entries),
    changed: clipSnapshotEntries(entries_2),
  };
}
//@ chunk-grjat6we.js:1453-1512 placement
/**
 * 把快照条目裁剪成最多 8 组、每组名字最多 128 字符。
 */
function clipSnapshotEntries(entries) {
  return entries.slice(0, MAX_SNAPSHOT_SERVERS).map((entry) => entry.slice(0, MAX_SNAPSHOT_NAME_CHARS));
}
//@ chunk-grjat6we.js:1512-1617 placement
/**
 * 合并设备 MCP 快照：服务器以新快照为准覆盖旧快照，保留新快照的 withheld。
 */
function mergeSnapshot(deviceMcpSnapshot, base) {
  if (base === undefined) return deviceMcpSnapshot;
  return {
    servers: {
      ...base.servers,
      ...deviceMcpSnapshot.servers,
    },
    withheld: deviceMcpSnapshot.withheld,
  };
}
//@ chunk-grjat6we.js:1617-1960 placement
/**
 * 把当前各服务器的工具哈希与快照对比：新服务器直接记入；已知服务器的新增/变化工具记为扣留（需重新同意）；返回扣留明细、下一版快照与是否有变化。
 */
function reconcileSnapshot(byServer, snapshot) {
  let withheld = new Map();
  let servers = {
    ...snapshot.servers,
  };
  let addedServers = false;
  for (let [serverName, tools] of byServer) {
    let hashes = toolShapeHashes(tools);
    let previous = Object.hasOwn(snapshot.servers, serverName) ? snapshot.servers[serverName] : undefined;
    if (previous === undefined) {
      servers[serverName] = hashes;
      addedServers = true;
      continue;
    }
    let diff = diffToolHashes(hashes, previous);
    if (diff !== undefined) withheld.set(serverName, diff);
  }
  let changedWithheld = Object.fromEntries(
    [...withheld].filter(([, entries]) => hasSnapshotChanges(entries)),
  );
  return {
    withheld,
    next: {
      servers,
      withheld: changedWithheld,
    },
    changed: addedServers || jsonStringifyRaw(changedWithheld) !== jsonStringifyRaw(snapshot.withheld),
  };
}
//@ chunk-grjat6we.js:1960-2097 placement
/**
 * 按用户选择更新快照中的服务器同意状态（接受则删除记录，拒绝则标记 declined），并清空 withheld。
 */
function applyConsentChoice(snapshot, serverNames, choice) {
  let servers = {
    ...snapshot.servers,
  };
  for (let serverName of serverNames)
    if (choice === "accepted") delete servers[serverName];
    else servers[serverName] = "declined";
  return {
    servers,
    withheld: {},
  };
}
//@ chunk-grjat6we.js:2097-2453 placement
/**
 * 读取设备 MCP 工具快照：读不到返回 unreadable，没有文件或主机名不一致/格式错误时返回空快照。
 */
async function readDeviceMcpSnapshot(snapshotStore) {
  let initial = {
    servers: {},
    withheld: {},
  };
  let text;
  try {
    text = await snapshotStore.readText();
  } catch (error) {
    logForDebugging(`device-mcp snapshot: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return "unreadable";
  }
  if (text === undefined) return initial;
  try {
    let parsed = DEVICE_MCP_SNAPSHOT_SCHEMA().safeParse(jsonParse(text));
    return parsed.success &&
      normalizeHostname(parsed.data.hostname) === normalizeHostname(snapshotStore.hostname())
      ? {
          servers: parsed.data.servers,
          withheld: parsed.data.withheld,
        }
      : initial;
  } catch {
    return initial;
  }
}
//@ chunk-grjat6we.js:2453-2681 placement
/**
 * 把设备 MCP 快照（版本、主机名、服务器与 withheld）写成 JSON 文件，失败时返回 false。
 */
async function writeDeviceMcpSnapshot(snapshot, snapshotStore) {
  try {
    await snapshotStore.writeText(
      jsonStringify(
        {
          version: SNAPSHOT_SCHEMA_VERSION,
          hostname: normalizeHostname(snapshotStore.hostname()),
          servers: snapshot.servers,
          withheld: snapshot.withheld,
        },
        null,
        2,
      ) +
        `
`,
    );
    return true;
  } catch (error) {
    logForDebugging(`device-mcp snapshot: not saved (${errorMessage(error)})`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-grjat6we.js:2681-2729 placement
/**
 * 设备 MCP 快照文件的路径。
 */
function snapshotFilePath() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_MCP_SNAPSHOT}.json`);
}
//@ chunk-grjat6we.js:2729-2803 placement
/**
 * 重置快照的提示文案（删掉快照文件）。
 */
function resetSnapshotHint() {
  return `delete ${tildify(snapshotFilePath())} to reset every server's baseline`;
}
//@ chunk-grjat6we.js:2803-3302 placement
/**
 * 为设备 MCP 快照建立读写对象：启用 v5 存储时用存储的 state 键，否则用本地文件（0600 原子写）。
 */
function createSnapshotStore(storageV5) {
  let storage = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let snapshotKey = STORAGE_SPACES.state(DEVICE_MCP_SNAPSHOT);
  return {
    readText: async () => {
      if (storage) {
        let text = await storage.readText([snapshotKey]);
        if (!text.ok) throw Error("device-mcp snapshot read failed");
        let item = text.value.items[0];
        return item.found ? item.value : undefined;
      }
      try {
        return await getFileReader().read(snapshotFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (text) => {
      if (storage) {
        if (
          !(
            await storage.write(snapshotKey, text, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device-mcp snapshot write failed");
        return;
      }
      let filePath = snapshotFilePath();
      await getFileReader().mkdir(dirname(filePath), 448);
      await getFileReader().atomicWrite(filePath, text, 384);
    },
    hostname,
  };
}
export {
  createSnapshotStore,
  readDeviceMcpSnapshot,
  mergeSnapshot,
  reconcileSnapshot,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
  resetSnapshotHint,
  hasSnapshotChanges,
  MAX_SNAPSHOT_SERVERS,
};
