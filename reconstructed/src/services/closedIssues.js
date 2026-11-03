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
import { u, E, string, array } from "../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-18hwfzwa.js:778738-778841 placement
var CLOSED_ISSUE_SCHEMA = DoctorLazy(() =>
  u({
    number: E(),
    title: string(),
    closedAt: string(),
  }),
);
var CLOSED_ISSUES_SCHEMA = DoctorLazy(() => array(CLOSED_ISSUE_SCHEMA()));
var CLOSED_ISSUES_TIMEOUT_MS = 5000;
var CLOSED_ISSUES_CACHE_TTL_MS = 86400000;
var CLOSED_ISSUES_LOOKBACK_DAYS = 30;
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
function closedSinceDate(h) {
  return new Date(h - CLOSED_ISSUES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
//@ chunk-18hwfzwa.js:779103-780382 placement
async function fetchMyClosedIssues(storageV5) {
  if (getIsNonInteractiveSession()) return null;
  if (isEssentialTrafficOnly()) return null;
  let globalConfig = getGlobalConfig();
  let now = Date.now();
  if (now - (globalConfig.closedIssuesLastChecked ?? 0) < CLOSED_ISSUES_CACHE_TTL_MS) return null;
  let L = now;
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
  let Re = Date.now() - L;
  let Be = null;
  if (code === 0)
    try {
      Be = jsonParse(stdout)
        .filter((rt) => rt.stateReason === "COMPLETED")
        .map((rt) => ({
          number: rt.number,
          title: rt.title,
          closedAt: rt.closedAt,
        }));
    } catch (error) {
      logForDebugging(`Failed to parse gh issue list output: ${error}`, {
        level: "error",
      });
    }
  if (Be !== null)
    if (isStorageV5Enabled() && storageV5 !== undefined)
      try {
        let Xe = await storageV5.write(closedIssuesCacheFile(), jsonStringify(Be), {
          mode: 438 & ~process.umask(),
        });
        if (!Xe.ok)
          logForDebugging(`Failed to write closed-issues cache: ${formatStorageError(Xe.error)}`, {
            level: "error",
          });
      } catch (error) {
        logForDebugging(`Failed to write closed-issues cache: ${error}`, {
          level: "error",
        });
      }
    else
      try {
        await closedIssuesCachePath().write(Be);
      } catch (error) {
        logForDebugging(`Failed to write closed-issues cache: ${error}`, {
          level: "error",
        });
      }
  let closedIssuesAcknowledged = globalConfig.closedIssuesAcknowledged ?? [];
  let We = closedIssuesAcknowledged;
  if (Be !== null) {
    let Xe = new Set(Be.map((rt) => rt.number));
    We = closedIssuesAcknowledged.filter((rt) => Xe.has(rt));
  }
  let ze =
    We.length !== closedIssuesAcknowledged.length || We.some((Xe, rt) => Xe !== closedIssuesAcknowledged[rt]);
  await saveGlobalConfig(
    (Xe) => ({
      ...Xe,
      closedIssuesLastChecked: now,
      ...(ze && {
        closedIssuesAcknowledged: We,
      }),
    }),
    storageV5,
  );
  return Re;
}
//@ chunk-18hwfzwa.js:780382-781217 placement
async function readClosedIssuesCache(storageV5) {
  if (storageV5) {
    let x;
    try {
      x = await storageV5.read([closedIssuesCacheFile()]);
    } catch (error) {
      if (isSadFsErrno(error)) logForDebugging(`closed-issues cache read failed: ${error}`);
      else logError(error);
      return [];
    }
    if (!x.ok) {
      let error = x.error;
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
    let D = x.value.items[0];
    if (!D?.found) return [];
    let L;
    try {
      L = jsonParse(Buffer.from(D.value).toString("utf-8"));
    } catch (error) {
      logForDebugging(`closed-issues cache is not valid JSON: ${error}`, {
        level: "warn",
      });
      return [];
    }
    let ee = CLOSED_ISSUES_SCHEMA().safeParse(L);
    if (!ee.success) {
      logForDebugging(`closed-issues cache failed schema validation: ${ee.error.message}`, {
        level: "warn",
      });
      return [];
    }
    return ee.data;
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
  let x = new Set(getGlobalConfig().closedIssuesAcknowledged ?? []);
  return closedIssuesCache.filter((D) => !x.has(D.number));
}
//@ chunk-18hwfzwa.js:781320-781497 placement
function acknowledgeClosedIssues(h, storageV5) {
  if (h.length === 0) return;
  let closedIssuesAcknowledged = getGlobalConfig().closedIssuesAcknowledged ?? [];
  let L = uniq([...closedIssuesAcknowledged, ...h]);
  if (L.length === closedIssuesAcknowledged.length) return;
  saveGlobalConfig(
    (ee) => ({
      ...ee,
      closedIssuesAcknowledged: L,
    }),
    storageV5,
  );
}
//@ chunk-18hwfzwa.js:781497-781531 placement
function selectNumber(Dt) {
  return Dt.number;
}
//@ chunk-18hwfzwa.js:781531-781561 placement
/**
 * 恒等函数（返回第二个参数），疑为占位或选择器包装。
 */
function identity_2(Lt, oo) {
  return oo;
}
//@ chunk-18hwfzwa.js:781561-781595 placement
function selectNumber2(Xt) {
  return Xt.number;
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
