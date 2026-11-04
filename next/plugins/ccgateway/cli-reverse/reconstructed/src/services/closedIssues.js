/**
 * services/closedIssues.ts
 *
 * 2.1.316 新增。已关闭问题提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (11)
 * attribution: placement 11
 */
import { join } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, numberSchema, stringSchema, array } from "../../vendor/zod/v4/classic/schemas.js";
import { createJsonStore } from "../utils/jsonStore.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import {
  isSadFsErrno,
  isSadFsErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { uniq } from "../utils/collections.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:778738-778841 placement
var CLOSED_ISSUE_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CLOSED_ISSUES_SCHEMA;
var CLOSED_ISSUES_TIMEOUT_MS;
var CLOSED_ISSUES_CACHE_TTL_MS;
var CLOSED_ISSUES_LOOKBACK_DAYS;
deferInit("chunk-18hwfzwa.js:778738", () => {
  CLOSED_ISSUE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      number: numberSchema(),
      title: stringSchema(),
      closedAt: stringSchema(),
    }),
  );
  CLOSED_ISSUES_SCHEMA = DoctorLazy(() => array(CLOSED_ISSUE_SCHEMA()));
  CLOSED_ISSUES_TIMEOUT_MS = 5000;
  CLOSED_ISSUES_CACHE_TTL_MS = 86400000;
  CLOSED_ISSUES_LOOKBACK_DAYS = 30;
});
//@ chunk-18hwfzwa.js:778841-778949 placement
function closedIssuesCachePath() {
  return createJsonStore(join(getClaudeConfigDir(), "cache", "my-closed-issues.json"), CLOSED_ISSUES_SCHEMA, {
    defaultValue: () => [],
    ensureDir: true,
  });
}
//@ chunk-18hwfzwa.js:778949-779024 placement
/**
 * 已关闭 issue 缓存的存储位置（my-closed-issues.json）。
 */
function closedIssuesCacheFile() {
  return STORAGE_SPACES.cache("my-closed-issues", "my-closed-issues.json");
}
//@ chunk-18hwfzwa.js:779024-779103 placement
/**
 * 按回看天数（CLOSED_ISSUES_LOOKBACK_DAYS）算出查询用的起始日期（YYYY-MM-DD）。
 */
function closedSinceDate(ts) {
  return new Date(ts - CLOSED_ISSUES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
//@ chunk-18hwfzwa.js:779103-780382 placement
async function fetchMyClosedIssues(storageV5) {
  if (getIsNonInteractiveSession()) return null;
  if (isEssentialTrafficOnly()) return null;
  let globalConfig = getGlobalConfig();
  let now = Date.now();
  if (now - (globalConfig.closedIssuesLastChecked ?? 0) < CLOSED_ISSUES_CACHE_TTL_MS) return null;
  let startMs = now;
  let { stdout, code } = await execFileNoThrow(
    "gh",
    [
      "issue",
      "list",
      "-R",
      "anthropics/claude-code",
      "--author",
      "@me",
      "--state",
      "closed",
      "--search",
      `closed:>${closedSinceDate(now)}`,
      "--json",
      "number,title,closedAt,stateReason",
      "--limit",
      "30",
    ],
    {
      timeout: CLOSED_ISSUES_TIMEOUT_MS,
      preserveOutputOnError: false,
    },
  );
  let elapsedMs = Date.now() - startMs;
  let closedIssues = null;
  if (code === 0)
    try {
      closedIssues = jsonParse(stdout)
        .filter((issue) => issue.stateReason === "COMPLETED")
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          closedAt: issue.closedAt,
        }));
    } catch (error) {
      logForDebugging(`Failed to parse gh issue list output: ${error}`, {
        level: "error",
      });
    }
  if (closedIssues !== null)
    if (isStorageV5Enabled() && storageV5 !== undefined)
      try {
        let writeResult = await storageV5.write(closedIssuesCacheFile(), jsonStringify(closedIssues), {
          mode: 438 & ~process.umask(),
        });
        if (!writeResult.ok)
          logForDebugging(`Failed to write closed-issues cache: ${formatStorageError(writeResult.error)}`, {
            level: "error",
          });
      } catch (error) {
        logForDebugging(`Failed to write closed-issues cache: ${error}`, {
          level: "error",
        });
      }
    else
      try {
        await closedIssuesCachePath().write(closedIssues);
      } catch (error) {
        logForDebugging(`Failed to write closed-issues cache: ${error}`, {
          level: "error",
        });
      }
  let closedIssuesAcknowledged = globalConfig.closedIssuesAcknowledged ?? [];
  let acknowledged = closedIssuesAcknowledged;
  if (closedIssues !== null) {
    let visibleNumbers = new Set(closedIssues.map((issue) => issue.number));
    acknowledged = closedIssuesAcknowledged.filter((number) => visibleNumbers.has(number));
  }
  let acknowledgedChanged =
    acknowledged.length !== closedIssuesAcknowledged.length ||
    acknowledged.some((number, index) => number !== closedIssuesAcknowledged[index]);
  await saveGlobalConfig(
    (config) => ({
      ...config,
      closedIssuesLastChecked: now,
      ...(acknowledgedChanged && {
        closedIssuesAcknowledged: acknowledged,
      }),
    }),
    storageV5,
  );
  return elapsedMs;
}
//@ chunk-18hwfzwa.js:780382-781217 placement
async function readClosedIssuesCache(storageV5) {
  if (storageV5) {
    let readResult;
    try {
      readResult = await storageV5.read([closedIssuesCacheFile()]);
    } catch (error) {
      if (isSadFsErrno(error)) logForDebugging(`closed-issues cache read failed: ${error}`);
      else logError(error);
      return [];
    }
    if (!readResult.ok) {
      let error = readResult.error;
      if ("telemetryCode" in error && isSadFsErrnoCode(error.telemetryCode))
        logForDebugging(`closed-issues cache read failed: ${formatStorageError(error)}`);
      else
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `closed-issues cache read failed: ${formatStorageError(error)}`,
            "closed-issues cache read failed (v5 backend error)",
          ),
        );
      return [];
    }
    let error = readResult.value.items[0];
    if (!error?.found) return [];
    let text;
    try {
      text = jsonParse(Buffer.from(error.value).toString("utf-8"));
    } catch (error) {
      logForDebugging(`closed-issues cache is not valid JSON: ${error}`, {
        level: "warn",
      });
      return [];
    }
    let parsed = CLOSED_ISSUES_SCHEMA().safeParse(text);
    if (!parsed.success) {
      logForDebugging(`closed-issues cache failed schema validation: ${parsed.error.message}`, {
        level: "warn",
      });
      return [];
    }
    return parsed.data;
  }
  try {
    return await closedIssuesCachePath().read();
  } catch (error) {
    if (isSadFsErrno(error)) logForDebugging(`closed-issues cache read failed: ${error}`);
    else logError(error);
    return [];
  }
}
//@ chunk-18hwfzwa.js:781217-781320 placement
function unacknowledgedClosedIssues(closedIssuesCache) {
  let acknowledged = new Set(getGlobalConfig().closedIssuesAcknowledged ?? []);
  return closedIssuesCache.filter((issue) => !acknowledged.has(issue.number));
}
//@ chunk-18hwfzwa.js:781320-781497 placement
function acknowledgeClosedIssues(numbers, storageV5) {
  if (numbers.length === 0) return;
  let closedIssuesAcknowledged = getGlobalConfig().closedIssuesAcknowledged ?? [];
  let next = uniq([...closedIssuesAcknowledged, ...numbers]);
  if (next.length === closedIssuesAcknowledged.length) return;
  saveGlobalConfig(
    (config) => ({
      ...config,
      closedIssuesAcknowledged: next,
    }),
    storageV5,
  );
}
//@ chunk-18hwfzwa.js:781497-781531 placement
function selectNumber(item) {
  return item.number;
}
//@ chunk-18hwfzwa.js:781531-781561 placement
/**
 * 恒等函数（返回第二个参数），疑为占位或选择器包装。
 */
function identity_2(value, other) {
  return other;
}
//@ chunk-18hwfzwa.js:781561-781595 placement
function selectNumber2(item) {
  return item.number;
}
export {
  selectNumber,
  identity_2,
  acknowledgeClosedIssues,
  selectNumber2,
  readClosedIssuesCache,
  unacknowledgedClosedIssues,
  fetchMyClosedIssues,
};
