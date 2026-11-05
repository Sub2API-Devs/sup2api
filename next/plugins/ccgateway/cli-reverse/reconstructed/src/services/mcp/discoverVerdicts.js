/**
 * services/mcp/discoverVerdicts.ts
 *
 * 2.1.316 新增：MCP discover 判定文件的读写。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  stringSchema,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { getFileReader } from "../../utils/fileStore.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { isENOENT, getErrnoCode, errorMessage } from "../../utils/errors.js";
import { isDisklessWithoutState } from "../orgMemory/memoryStores.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sywnjtqb.js:29643-29731 placement
/**
 * discover 判定持久化常量：状态名 mcp-discover-verdicts、远程 TTL 1 天、stdio TTL 7 天、文件上限 256 KiB、键前缀 ccr:/stdio:。
 */
var VERDICT_TTL_MS = 86400000;
var STDIO_VERDICT_TTL_MS = 604800000;
var DISCOVER_VERDICTS_STATE_NAME = "mcp-discover-verdicts";
var MAX_VERDICTS_FILE_BYTES = 262144;
var CCR_VERDICT_PREFIX = "ccr:";
var STDIO_VERDICT_PREFIX = "stdio:";
//@ chunk-sywnjtqb.js:29731-29782 placement
/**
 * getDiscoverVerdictsPath：<CLAUDE 配置目录>/state/mcp-discover-verdicts.json。
 */
function getDiscoverVerdictsPath() {
  return join(getClaudeConfigDir(), "state", `${DISCOVER_VERDICTS_STATE_NAME}.json`);
}
//@ chunk-sywnjtqb.js:29782-29865 placement
/**
 * 判定记录表的 schema。
 */
var DiscoverVerdictSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var verdictMapSchema;
deferInit("chunk-sywnjtqb.js:29782", () => {
  DiscoverVerdictSchema = DoctorLazy(() =>
    objectSchema({
      observedAt: numberSchema(),
      modernProtocolVersion: stringSchema(),
    }),
  );
  verdictMapSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-sywnjtqb.js:29865-29919 placement
function isDiscoverVerdictMemoryEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dreamy_sundae", true) !== false;
}
//@ chunk-sywnjtqb.js:29919-30010 placement
/**
 * 判断该服务器的判定是否值得记住。
 */
function shouldRememberVerdict(discoverVerdictKey) {
  if (!isDiscoverVerdictMemoryEnabled()) return false;
  return (
    !discoverVerdictKey.startsWith(CCR_VERDICT_PREFIX) ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_brooks", true) !== false
  );
}
//@ chunk-sywnjtqb.js:30010-30055 placement
/**
 * 判定的有效期（stdio 用较短 TTL）。
 */
function verdictTtlMs(verdictKey) {
  return verdictKey.startsWith(STDIO_VERDICT_PREFIX) ? STDIO_VERDICT_TTL_MS : VERDICT_TTL_MS;
}
//@ chunk-sywnjtqb.js:30055-30147 placement
/**
 * 判定是否仍有效且协议为现代版本。
 */
function isModernVerdictValid(verdictKey, discoverVerdict, now) {
  let ageMs = now - discoverVerdict.observedAt;
  return (
    discoverVerdict.modernProtocolVersion === MCP_PROTOCOL_NEXT &&
    ageMs >= 0 &&
    ageMs < verdictTtlMs(verdictKey)
  );
}
//@ chunk-sywnjtqb.js:30147-30208 placement
/**
 * 判定是否仍有效（不区分协议）。
 */
function isVerdictValid(verdictKey, verdict, now) {
  let ageMs = now - verdict.observedAt;
  return ageMs >= 0 && ageMs < verdictTtlMs(verdictKey);
}
//@ chunk-sywnjtqb.js:30208-30635 placement
/**
 * readDiscoverVerdicts：读取记住的 discover 判定（v5 存储或文件），读失败当作没有记录（服务器照常被 server/discover 探测）。
 */
async function readDiscoverVerdicts(storage) {
  let raw;
  if (isStorageV5Enabled() && storage !== undefined) {
    let text = await storage.readText([STORAGE_SPACES.state(DISCOVER_VERDICTS_STATE_NAME)]);
    if (!text.ok)
      logForDebugging(
        `[mcp] could not read the remembered discover verdicts (${formatStorageError(text.error)}); servers are probed with server/discover as if nothing was remembered`,
      );
    else if (text.value.items[0]?.found) raw = text.value.items[0].value;
  } else raw = await readDiscoverVerdictsFile(getDiscoverVerdictsPath());
  if (raw === undefined) return {};
  let parsed;
  try {
    parsed = jsonParse(raw);
  } catch {
    return {};
  }
  let parseResult = verdictMapSchema().safeParse(parsed);
  return parseResult.success ? parseResult.data : {};
}
//@ chunk-sywnjtqb.js:30635-31403 placement
/**
 * readDiscoverVerdictsFile：只读普通文件且不跟随符号链接、≤256 KiB。
 */
async function readDiscoverVerdictsFile(discoverVerdictsPath) {
  let buffer;
  try {
    let fileReader = getFileReader();
    if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
      let stats = await fileReader.lstat(discoverVerdictsPath);
      if (stats !== undefined && !stats.isFile) {
        logForDebugging(
          `[mcp] ${discoverVerdictsPath} is not a regular file; ignoring it, so servers are probed with server/discover as if nothing was remembered`,
        );
        return;
      }
    }
    buffer = await fileReader.readTail(discoverVerdictsPath, MAX_VERDICTS_FILE_BYTES + 1, {
      noFollow: true,
    });
  } catch (error) {
    if (isENOENT(error)) return;
    let errnoCode = getErrnoCode(error);
    logForDebugging(
      errnoCode === "ELOOP" || errnoCode === "ENXIO"
        ? `[mcp] ${discoverVerdictsPath} is not a regular file; ignoring it, so servers are probed with server/discover as if nothing was remembered`
        : `[mcp] could not read ${discoverVerdictsPath} (${errorMessage(error)}); ignoring it, so servers are probed with server/discover as if nothing was remembered`,
    );
    return;
  }
  if (buffer.length > MAX_VERDICTS_FILE_BYTES) {
    logForDebugging(
      `[mcp] ${discoverVerdictsPath} is larger than ${MAX_VERDICTS_FILE_BYTES} bytes; ignoring it, so servers are probed with server/discover as if nothing was remembered`,
    );
    return;
  }
  return buffer.toString("utf8");
}
//@ chunk-sywnjtqb.js:31403-31542 placement
/**
 * getDiscoverVerdicts：进程内记忆化的判定表读取。
 */
function getDiscoverVerdicts(storage) {
  if (isDisklessWithoutState(storage)) return Promise.resolve({});
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.discoverVerdictsRead ??= readDiscoverVerdicts(storage).catch(() => ({}));
  return cliOwnedState.discoverVerdictsRead;
}
//@ chunk-sywnjtqb.js:31542-31778 placement (2.1.88 match: ensureScratchpadDir, 0.624)
/**
 * 把 MCP discover 判定结果写入状态：有托管存储时写存储（0600），否则在本地路径原子写入（目录 0700、文件 0600），失败返回错误。旧版名 ensureScratchpadDir 误配，应归 MCP 模块。
 */
async function writeDiscoverVerdicts(verdicts, storage) {
  let serialized = jsonStringify(verdicts);
  if (isStorageV5Enabled() && storage !== undefined) {
    let writeResult = await storage.write(STORAGE_SPACES.state(DISCOVER_VERDICTS_STATE_NAME), serialized, {
      mode: 384,
    });
    return writeResult.ok ? undefined : formatStorageError(writeResult.error);
  }
  let fs = getDiscoverVerdictsPath();
  try {
    await getFileReader().mkdir(dirname(fs), 448);
    await getFileReader().atomicWrite(fs, serialized, 384);
    return;
  } catch (error) {
    return errorMessage(error);
  }
}
//@ chunk-sywnjtqb.js:31778-31883 placement
function readDiscoverVerdict(verdicts, discoverVerdictKey) {
  if (!Object.hasOwn(verdicts, discoverVerdictKey)) return;
  let parseResult = DiscoverVerdictSchema().safeParse(verdicts[discoverVerdictKey]);
  return parseResult.success ? parseResult.data : undefined;
}
//@ chunk-sywnjtqb.js:31883-32017 placement
function retainValidDiscoverVerdicts(verdicts, now) {
  let kept = {};
  for (let [key, value] of Object.entries(verdicts)) {
    let parseResult = DiscoverVerdictSchema().safeParse(value);
    if (parseResult.success && isVerdictValid(key, parseResult.data, now)) kept[key] = parseResult.data;
  }
  return kept;
}
//@ chunk-sywnjtqb.js:32017-32463 placement
/**
 * updateDiscoverVerdicts：串行化的读-改-写；写失败丢弃改动并在下次重新读取。
 */
function updateDiscoverVerdicts(storage, update) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.discoverVerdictsWriteChain = cliOwnedState.discoverVerdictsWriteChain
    .then(async () => {
      if (isDisklessWithoutState(storage)) return;
      let verdicts = update(await getDiscoverVerdicts(storage));
      if (verdicts === undefined) return;
      cliOwnedState.discoverVerdictsRead = Promise.resolve(verdicts);
      let writeError = await writeDiscoverVerdicts(verdicts, storage);
      if (writeError !== undefined) {
        cliOwnedState.discoverVerdictsRead = null;
        logForDebugging(
          `[mcp] could not save the remembered discover verdicts (${writeError}); the change is dropped and storage is read again at the next use`,
        );
      }
    })
    .catch(() => {});
  return cliOwnedState.discoverVerdictsWriteChain;
}
export {
  STDIO_VERDICT_PREFIX,
  CCR_VERDICT_PREFIX,
  shouldRememberVerdict,
  readDiscoverVerdict,
  getDiscoverVerdicts,
  isModernVerdictValid,
  updateDiscoverVerdicts,
  retainValidDiscoverVerdicts,
};
