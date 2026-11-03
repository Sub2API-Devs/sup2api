/**
 * services/deviceBridge/deviceMcpSnapshot.ts
 *
 * 2.1.316 新增：设备 MCP 快照。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-251gbqc0.js (15)
 * attribution: placement 15
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, string, record, union, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringifyRaw, jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { TOOL_META_KEYS } from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { normalizeHostname } from "../remoteTools/unattendedConsentStore.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { tildify } from "../../utils/path.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getFileReader } from "../../utils/fileStore.js";

//@ chunk-251gbqc0.js:711-755 placement
/**
 * 快照里单个名字的最大字符数（128）。
 */
var SNAPSHOT_SCHEMA_VERSION = 1;
var DEVICE_MCP_SNAPSHOT = "device-mcp-snapshot";
var MAX_SNAPSHOT_SERVERS = 8;
var MAX_SNAPSHOT_NAME_CHARS = 128;
//@ chunk-251gbqc0.js:755-815 placement
/**
 * 该服务器的快照是否有新增或变化。
 */
function hasSnapshotChanges(e) {
  return e.added.length > 0 || e.changed.length > 0;
}
//@ chunk-251gbqc0.js:815-957 placement
var DEVICE_MCP_SNAPSHOT_SCHEMA = DoctorLazy(() =>
  u({
    version: literal(SNAPSHOT_SCHEMA_VERSION),
    hostname: string(),
    servers: record(string(), union([record(string(), string()), literal("declined")])),
    withheld: record(
      string(),
      u({
        added: array(string()),
        changed: array(string()),
      }),
    ),
  }),
);
//@ chunk-251gbqc0.js:957-1139 placement
/**
 * 计算 MCP 工具外观（名称、描述、输入 schema、搜索提示）的内容哈希，用于检测工具变更。
 */
function hashToolShape(e) {
  let _meta = typeof e._meta === "object" && e._meta !== null ? e._meta : {};
  return computeContentHash(
    jsonStringifyRaw({
      name: e.name,
      description: e.description,
      inputSchema: e.inputSchema,
      searchHint: _meta[TOOL_META_KEYS.searchHint],
    }),
  );
}
//@ chunk-251gbqc0.js:1139-1206 placement
/**
 * 生成工具名到形状哈希的映射。
 */
function toolShapeHashes(e) {
  return Object.fromEntries(e.map((r) => [r.name, hashToolShape(r)]));
}
//@ chunk-251gbqc0.js:1206-1453 placement
function diffToolHashes(e, r) {
  if (r === "declined")
    return {
      added: [],
      changed: [],
    };
  let filtered = Object.keys(e).filter((key) => !Object.hasOwn(r, key));
  let filtered_2 = Object.keys(e).filter((key) => Object.hasOwn(r, key) && r[key] !== e[key]);
  if (filtered.length === 0 && filtered_2.length === 0) return;
  return {
    added: clipSnapshotEntries(filtered),
    changed: clipSnapshotEntries(filtered_2),
  };
}
//@ chunk-251gbqc0.js:1453-1512 placement
/**
 * 把快照条目裁剪成最多 8 组、每组名字最多 128 字符。
 */
function clipSnapshotEntries(e) {
  return e.slice(0, MAX_SNAPSHOT_SERVERS).map((r) => r.slice(0, MAX_SNAPSHOT_NAME_CHARS));
}
//@ chunk-251gbqc0.js:1512-1617 placement
/**
 * 合并设备 MCP 快照：服务器以新快照为准覆盖旧快照，保留新快照的 withheld。
 */
function mergeSnapshot(deviceMcpSnapshot, r) {
  if (r === undefined) return deviceMcpSnapshot;
  return {
    servers: {
      ...r.servers,
      ...deviceMcpSnapshot.servers,
    },
    withheld: deviceMcpSnapshot.withheld,
  };
}
//@ chunk-251gbqc0.js:1617-1960 placement
/**
 * 把当前各服务器的工具哈希与快照对比：新服务器直接记入；已知服务器的新增/变化工具记为扣留（需重新同意）；返回扣留明细、下一版快照与是否有变化。
 */
function reconcileSnapshot(byServer, r) {
  let i = new Map();
  let n = {
    ...r.servers,
  };
  let s = false;
  for (let [a, y] of byServer) {
    let f = toolShapeHashes(y);
    let l = Object.hasOwn(r.servers, a) ? r.servers[a] : undefined;
    if (l === undefined) {
      n[a] = f;
      s = true;
      continue;
    }
    let S = diffToolHashes(f, l);
    if (S !== undefined) i.set(a, S);
  }
  let c = Object.fromEntries([...i].filter(([, a]) => hasSnapshotChanges(a)));
  return {
    withheld: i,
    next: {
      servers: n,
      withheld: c,
    },
    changed: s || jsonStringifyRaw(c) !== jsonStringifyRaw(r.withheld),
  };
}
//@ chunk-251gbqc0.js:1960-2097 placement
/**
 * 按用户选择更新快照中的服务器同意状态（接受则删除记录，拒绝则标记 declined），并清空 withheld。
 */
function applyConsentChoice(e, r, i) {
  let n = {
    ...e.servers,
  };
  for (let s of r)
    if (i === "accepted") delete n[s];
    else n[s] = "declined";
  return {
    servers: n,
    withheld: {},
  };
}
//@ chunk-251gbqc0.js:2097-2453 placement
/**
 * 读取设备 MCP 工具快照：读不到返回 unreadable，没有文件或主机名不一致/格式错误时返回空快照。
 */
async function readDeviceMcpSnapshot(snapshotStore) {
  let r = {
    servers: {},
    withheld: {},
  };
  let i;
  try {
    i = await snapshotStore.readText();
  } catch (error) {
    logForDebugging(`device-mcp snapshot: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return "unreadable";
  }
  if (i === undefined) return r;
  try {
    let n = DEVICE_MCP_SNAPSHOT_SCHEMA().safeParse(jsonParse(i));
    return n.success && normalizeHostname(n.data.hostname) === normalizeHostname(snapshotStore.hostname())
      ? {
          servers: n.data.servers,
          withheld: n.data.withheld,
        }
      : r;
  } catch {
    return r;
  }
}
//@ chunk-251gbqc0.js:2453-2681 placement
/**
 * 把设备 MCP 快照（版本、主机名、服务器与 withheld）写成 JSON 文件，失败时返回 false。
 */
async function writeDeviceMcpSnapshot(e, snapshotStore) {
  try {
    await snapshotStore.writeText(
      jsonStringify(
        {
          version: SNAPSHOT_SCHEMA_VERSION,
          hostname: normalizeHostname(snapshotStore.hostname()),
          servers: e.servers,
          withheld: e.withheld,
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
//@ chunk-251gbqc0.js:2681-2729 placement
/**
 * 设备 MCP 快照文件的路径。
 */
function snapshotFilePath() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_MCP_SNAPSHOT}.json`);
}
//@ chunk-251gbqc0.js:2729-2803 placement
/**
 * 重置快照的提示文案（删掉快照文件）。
 */
function resetSnapshotHint() {
  return `delete ${tildify(snapshotFilePath())} to reset every server's baseline`;
}
//@ chunk-251gbqc0.js:2803-3302 placement
/**
 * 为设备 MCP 快照建立读写对象：启用 v5 存储时用存储的 state 键，否则用本地文件（0600 原子写）。
 */
function createSnapshotStore(storageV5) {
  let r = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let i = STORAGE_SPACES.state(DEVICE_MCP_SNAPSHOT);
  return {
    readText: async () => {
      if (r) {
        let text = await r.readText([i]);
        if (!text.ok) throw Error("device-mcp snapshot read failed");
        let s = text.value.items[0];
        return s.found ? s.value : undefined;
      }
      try {
        return await getFileReader().read(snapshotFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (n) => {
      if (r) {
        if (
          !(
            await r.write(i, n, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device-mcp snapshot write failed");
        return;
      }
      let s = snapshotFilePath();
      await getFileReader().mkdir(dirname(s), 448);
      await getFileReader().atomicWrite(s, n, 384);
    },
    hostname,
  };
}
export {
  readDeviceMcpSnapshot,
  createSnapshotStore,
  hasSnapshotChanges,
  MAX_SNAPSHOT_SERVERS,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
  resetSnapshotHint,
  mergeSnapshot,
  reconcileSnapshot,
};
