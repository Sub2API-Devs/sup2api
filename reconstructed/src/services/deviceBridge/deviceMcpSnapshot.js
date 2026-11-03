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
import { u, T, o, pe, Ue, A } from "../../../vendor/zod/v4/classic/schemas.js";
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
var v = 1,
  DEVICE_MCP_SNAPSHOT = "device-mcp-snapshot",
  Ppo = 8,
  M = 128;
//@ chunk-251gbqc0.js:755-815 placement
function Ipo(e) {
  return e.added.length > 0 || e.changed.length > 0;
}
//@ chunk-251gbqc0.js:815-957 placement
var DEVICE_MCP_SNAPSHOT_SCHEMA = DoctorLazy(() =>
  u({
    version: T(v),
    hostname: o(),
    servers: pe(o(), Ue([pe(o(), o()), T("declined")])),
    withheld: pe(o(), u({ added: A(o()), changed: A(o()) })),
  }),
);
/**
 * 计算 MCP 工具外观（名称、描述、输入 schema、搜索提示）的内容哈希，用于检测工具变更。
 */
//@ chunk-251gbqc0.js:957-1139 placement
function hashToolShape(e) {
  let r = typeof e._meta === "object" && e._meta !== null ? e._meta : {};
  return computeContentHash(
    jsonStringifyRaw({
      name: e.name,
      description: e.description,
      inputSchema: e.inputSchema,
      searchHint: r[TOOL_META_KEYS.searchHint],
    }),
  );
}
//@ chunk-251gbqc0.js:1139-1206 placement
function j(e) {
  return Object.fromEntries(e.map((r) => [r.name, hashToolShape(r)]));
}
//@ chunk-251gbqc0.js:1206-1453 placement
function diffToolHashes(e, r) {
  if (r === "declined") return { added: [], changed: [] };
  let filtered = Object.keys(e).filter((s) => !Object.hasOwn(r, s)),
    filtered_2 = Object.keys(e).filter((s) => Object.hasOwn(r, s) && r[s] !== e[s]);
  if (filtered.length === 0 && filtered_2.length === 0) return;
  return { added: m(filtered), changed: m(filtered_2) };
}
//@ chunk-251gbqc0.js:1453-1512 placement
function m(e) {
  return e.slice(0, Ppo).map((r) => r.slice(0, M));
}
/**
 * 合并设备 MCP 快照：服务器以新快照为准覆盖旧快照，保留新快照的 withheld。
 */
//@ chunk-251gbqc0.js:1512-1617 placement
function mergeSnapshot(e, r) {
  if (r === void 0) return e;
  return { servers: { ...r.servers, ...e.servers }, withheld: e.withheld };
}
/**
 * 把当前各服务器的工具哈希与快照对比：新服务器直接记入；已知服务器的新增/变化工具记为扣留（需重新同意）；返回扣留明细、下一版快照与是否有变化。
 */
//@ chunk-251gbqc0.js:1617-1960 placement
function reconcileSnapshot(e, r) {
  let i = new Map(),
    n = { ...r.servers },
    s = !1;
  for (let [a, y] of e) {
    let f = j(y),
      l = Object.hasOwn(r.servers, a) ? r.servers[a] : void 0;
    if (l === void 0) {
      ((n[a] = f), (s = !0));
      continue;
    }
    let S = diffToolHashes(f, l);
    if (S !== void 0) i.set(a, S);
  }
  let fromEntries = Object.fromEntries([...i].filter(([, a]) => Ipo(a)));
  return {
    withheld: i,
    next: { servers: n, withheld: fromEntries },
    changed: s || jsonStringifyRaw(fromEntries) !== jsonStringifyRaw(r.withheld),
  };
}
/**
 * 按用户选择更新快照中的服务器同意状态（接受则删除记录，拒绝则标记 declined），并清空 withheld。
 */
//@ chunk-251gbqc0.js:1960-2097 placement
function applyConsentChoice(e, r, i) {
  let n = { ...e.servers };
  for (let s of r)
    if (i === "accepted") delete n[s];
    else n[s] = "declined";
  return { servers: n, withheld: {} };
}
/**
 * 读取设备 MCP 工具快照：读不到返回 unreadable，没有文件或主机名不一致/格式错误时返回空快照。
 */
//@ chunk-251gbqc0.js:2097-2453 placement
async function readDeviceMcpSnapshot(e) {
  let r = { servers: {}, withheld: {} },
    i;
  try {
    i = await e.readText();
  } catch (error) {
    return (
      logForDebugging(`device-mcp snapshot: store unreadable (${errorMessage(error)})`, { level: "warn" }),
      "unreadable"
    );
  }
  if (i === void 0) return r;
  try {
    let safeParse = DEVICE_MCP_SNAPSHOT_SCHEMA().safeParse(jsonParse(i));
    return safeParse.success && normalizeHostname(safeParse.data.hostname) === normalizeHostname(e.hostname())
      ? { servers: safeParse.data.servers, withheld: safeParse.data.withheld }
      : r;
  } catch {
    return r;
  }
}
/**
 * 把设备 MCP 快照（版本、主机名、服务器与 withheld）写成 JSON 文件，失败时返回 false。
 */
//@ chunk-251gbqc0.js:2453-2681 placement
async function writeDeviceMcpSnapshot(e, r) {
  try {
    return (
      await r.writeText(
        jsonStringify(
          { version: v, hostname: normalizeHostname(r.hostname()), servers: e.servers, withheld: e.withheld },
          null,
          2,
        ) +
          `
`,
      ),
      !0
    );
  } catch (error) {
    return (
      logForDebugging(`device-mcp snapshot: not saved (${errorMessage(error)})`, { level: "warn" }),
      !1
    );
  }
}
//@ chunk-251gbqc0.js:2681-2729 placement
function h() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_MCP_SNAPSHOT}.json`);
}
//@ chunk-251gbqc0.js:2729-2803 placement
function VTs() {
  return `delete ${tildify(h())} to reset every server's baseline`;
}
/**
 * 为设备 MCP 快照建立读写对象：启用 v5 存储时用存储的 state 键，否则用本地文件（0600 原子写）。
 */
//@ chunk-251gbqc0.js:2803-3302 placement
function createSnapshotStore(e) {
  let r = isStorageV5Enabled() && e !== void 0 ? e : void 0,
    state = STORAGE_SPACES.state(DEVICE_MCP_SNAPSHOT);
  return {
    readText: async () => {
      if (r) {
        let text = await r.readText([state]);
        if (!text.ok) throw Error("device-mcp snapshot read failed");
        let s = text.value.items[0];
        return s.found ? s.value : void 0;
      }
      try {
        return await getFileReader().read(h());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (n) => {
      if (r) {
        if (!(await r.write(state, n, { mode: 384 })).ok) throw Error("device-mcp snapshot write failed");
        return;
      }
      let s = h();
      (await getFileReader().mkdir(dirname(s), 448), await getFileReader().atomicWrite(s, n, 384));
    },
    hostname: hostname,
  };
}

export {
  readDeviceMcpSnapshot,
  createSnapshotStore,
  Ipo,
  Ppo,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
  VTs,
  mergeSnapshot,
  reconcileSnapshot,
};
