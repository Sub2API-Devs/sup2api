/**
 * services/mcp/discoverVerdicts.ts
 *
 * 2.1.316 新增：MCP discover 判定文件的读写。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (15)
 * attribution: placement 15
 */
import { join, dirname, dirname as dirname_2 } from "path";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, o, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { getFileReader } from "../../utils/fileStore.js";
import { ws } from "../../utils/fsFlags.js";
import { isENOENT, getErrnoCode, errorMessage } from "../../utils/errors.js";
import { Yie } from "../orgMemory/memoryStores.js";
import { ht } from "./cliOwnedClients.js";

/**
 * discover 判定持久化常量：状态名 mcp-discover-verdicts、远程 TTL 1 天、stdio TTL 7 天、文件上限 256 KiB、键前缀 ccr:/stdio:。
 */
//@ chunk-8t8n4kdh.js:27904-27992 placement
var VERDICT_TTL_MS = 86400000,
  STDIO_VERDICT_TTL_MS = 604800000,
  DISCOVER_VERDICTS_STATE_NAME = "mcp-discover-verdicts",
  MAX_VERDICTS_FILE_BYTES = 262144,
  CCR_VERDICT_PREFIX = "ccr:",
  STDIO_VERDICT_PREFIX = "stdio:";
/**
 * getDiscoverVerdictsPath：<CLAUDE 配置目录>/state/mcp-discover-verdicts.json。
 */
//@ chunk-8t8n4kdh.js:27992-28043 placement
function getDiscoverVerdictsPath() {
  return join(getClaudeConfigDir(), "state", `${DISCOVER_VERDICTS_STATE_NAME}.json`);
}
//@ chunk-8t8n4kdh.js:28043-28126 placement
var Jr = DoctorLazy(() => u({ observedAt: E(), modernProtocolVersion: o() })),
  Sa = DoctorLazy(() => pe(o(), oe()));
//@ chunk-8t8n4kdh.js:28126-28180 placement
function isDiscoverVerdictMemoryEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dreamy_sundae", !0) !== !1;
}
//@ chunk-8t8n4kdh.js:28180-28271 placement
function Qr(e) {
  if (!isDiscoverVerdictMemoryEnabled()) return !1;
  return (
    !e.startsWith(CCR_VERDICT_PREFIX) || getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_brooks", !0) !== !1
  );
}
//@ chunk-8t8n4kdh.js:28271-28316 placement
function Zr(e) {
  return e.startsWith(STDIO_VERDICT_PREFIX) ? STDIO_VERDICT_TTL_MS : VERDICT_TTL_MS;
}
//@ chunk-8t8n4kdh.js:28316-28408 placement
function es(e, n, r) {
  let s = r - n.observedAt;
  return n.modernProtocolVersion === MCP_PROTOCOL_NEXT && s >= 0 && s < Zr(e);
}
//@ chunk-8t8n4kdh.js:28408-28469 placement
function Ea(e, n, r) {
  let s = r - n.observedAt;
  return s >= 0 && s < Zr(e);
}
/**
 * readDiscoverVerdicts：读取记住的 discover 判定（v5 存储或文件），读失败当作没有记录（服务器照常被 server/discover 探测）。
 */
//@ chunk-8t8n4kdh.js:28469-28896 placement
async function readDiscoverVerdicts(e) {
  let n;
  if (isStorageV5Enabled() && e !== void 0) {
    let text = await e.readText([STORAGE_SPACES.state(DISCOVER_VERDICTS_STATE_NAME)]);
    if (!text.ok)
      logForDebugging(
        `[mcp] could not read the remembered discover verdicts (${formatStorageError(text.error)}); servers are probed with server/discover as if nothing was remembered`,
      );
    else if (text.value.items[0]?.found) n = text.value.items[0].value;
  } else n = await readDiscoverVerdictsFile(getDiscoverVerdictsPath());
  if (n === void 0) return {};
  let r;
  try {
    r = jsonParse(n);
  } catch {
    return {};
  }
  let safeParse = Sa().safeParse(r);
  return safeParse.success ? safeParse.data : {};
}
/**
 * readDiscoverVerdictsFile：只读普通文件且不跟随符号链接、≤256 KiB。
 */
//@ chunk-8t8n4kdh.js:28896-29664 placement
async function readDiscoverVerdictsFile(e) {
  let r;
  try {
    let s = getFileReader();
    if (ws === 0) {
      let stats = await s.lstat(e);
      if (stats !== void 0 && !stats.isFile) {
        logForDebugging(
          `[mcp] ${e} is not a regular file; ignoring it, so servers are probed with server/discover as if nothing was remembered`,
        );
        return;
      }
    }
    r = await s.readTail(e, MAX_VERDICTS_FILE_BYTES + 1, { noFollow: !0 });
  } catch (error) {
    if (isENOENT(error)) return;
    let h = getErrnoCode(error);
    logForDebugging(
      h === "ELOOP" || h === "ENXIO"
        ? `[mcp] ${e} is not a regular file; ignoring it, so servers are probed with server/discover as if nothing was remembered`
        : `[mcp] could not read ${e} (${errorMessage(error)}); ignoring it, so servers are probed with server/discover as if nothing was remembered`,
    );
    return;
  }
  if (r.length > MAX_VERDICTS_FILE_BYTES) {
    logForDebugging(
      `[mcp] ${e} is larger than ${MAX_VERDICTS_FILE_BYTES} bytes; ignoring it, so servers are probed with server/discover as if nothing was remembered`,
    );
    return;
  }
  return r.toString("utf8");
}
/**
 * getDiscoverVerdicts：进程内记忆化的判定表读取。
 */
//@ chunk-8t8n4kdh.js:29664-29804 placement
function getDiscoverVerdicts(e) {
  if (Yie(e)) return Promise.resolve({});
  let n = ht();
  return ((n.discoverVerdictsRead ??= readDiscoverVerdicts(e).catch(() => ({}))), n.discoverVerdictsRead);
}
/**
 * 把 MCP discover 判定结果写入状态：有托管存储时写存储（0600），否则在本地路径原子写入（目录 0700、文件 0600），失败返回错误。旧版名 ensureScratchpadDir 误配，应归 MCP 模块。
 */
//@ chunk-8t8n4kdh.js:29804-30040 placement = ensureScratchpadDir (0.624)
async function writeDiscoverVerdicts(verdicts, storage) {
  let r = jsonStringify(verdicts);
  if (isStorageV5Enabled() && storage !== void 0) {
    let write = await storage.write(STORAGE_SPACES.state(DISCOVER_VERDICTS_STATE_NAME), r, { mode: 384 });
    return write.ok ? void 0 : formatStorageError(write.error);
  }
  let fs = getDiscoverVerdictsPath();
  try {
    (await getFileReader().mkdir(dirname(fs), 448), await getFileReader().atomicWrite(fs, r, 384));
    return;
  } catch (error) {
    return errorMessage(error);
  }
}
//@ chunk-8t8n4kdh.js:30040-30145 placement
function readDiscoverVerdict(e, n) {
  if (!Object.hasOwn(e, n)) return;
  let safeParse = Jr().safeParse(e[n]);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-8t8n4kdh.js:30145-30279 placement
function retainValidDiscoverVerdicts(e, n) {
  let r = {};
  for (let [s, h] of Object.entries(e)) {
    let safeParse = Jr().safeParse(h);
    if (safeParse.success && Ea(s, safeParse.data, n)) r[s] = safeParse.data;
  }
  return r;
}
/**
 * updateDiscoverVerdicts：串行化的读-改-写；写失败丢弃改动并在下次重新读取。
 */
//@ chunk-8t8n4kdh.js:30279-30726 placement
function updateDiscoverVerdicts(e, n) {
  let r = ht();
  return (
    (r.discoverVerdictsWriteChain = r.discoverVerdictsWriteChain
      .then(async () => {
        if (Yie(e)) return;
        let s = n(await getDiscoverVerdicts(e));
        if (s === void 0) return;
        r.discoverVerdictsRead = Promise.resolve(s);
        let h = await writeDiscoverVerdicts(s, e);
        if (h !== void 0)
          ((r.discoverVerdictsRead = null),
            logForDebugging(
              `[mcp] could not save the remembered discover verdicts (${h}); the change is dropped and storage is read again at the next use`,
            ));
      })
      .catch(() => {})),
    r.discoverVerdictsWriteChain
  );
}

export {
  STDIO_VERDICT_PREFIX,
  CCR_VERDICT_PREFIX,
  Qr,
  readDiscoverVerdict,
  getDiscoverVerdicts,
  es,
  updateDiscoverVerdicts,
  retainValidDiscoverVerdicts,
};
