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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
} from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E, o, A } from "../../vendor/zod/v4/classic/schemas.js";
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
var CLOSED_ISSUE_SCHEMA = DoctorLazy(() => u({ number: E(), title: o(), closedAt: o() })),
  CLOSED_ISSUES_SCHEMA = DoctorLazy(() => A(CLOSED_ISSUE_SCHEMA())),
  CLOSED_ISSUES_TIMEOUT_MS = 5000,
  CLOSED_ISSUES_CACHE_TTL_MS = 86400000,
  CLOSED_ISSUES_LOOKBACK_DAYS = 30;
//@ chunk-18hwfzwa.js:778841-778949 placement
function closedIssuesCachePath() {
  return createJsonStore(
    join_8(getClaudeConfigDir(), "cache", "my-closed-issues.json"),
    CLOSED_ISSUES_SCHEMA,
    { defaultValue: () => [], ensureDir: !0 },
  );
}
//@ chunk-18hwfzwa.js:778949-779024 placement
function i5e() {
  return STORAGE_SPACES.cache("my-closed-issues", "my-closed-issues.json");
}
//@ chunk-18hwfzwa.js:779024-779103 placement
function H8t(h) {
  return new Date(h - CLOSED_ISSUES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
//@ chunk-18hwfzwa.js:779103-780382 placement
async function fetchMyClosedIssues(h) {
  if (getIsNonInteractiveSession()) return null;
  if (isEssentialTrafficOnly()) return null;
  let x = getGlobalConfig(),
    now = Date.now();
  if (now - (x.closedIssuesLastChecked ?? 0) < CLOSED_ISSUES_CACHE_TTL_MS) return null;
  let L = now,
    { stdout: stdout, code: code } = await execFileNoThrow(
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
        `closed:>${H8t(now)}`,
        "--json",
        "number,title,closedAt,stateReason",
        "--limit",
        "30",
      ],
      { timeout: CLOSED_ISSUES_TIMEOUT_MS, preserveOutputOnError: !1 },
    ),
    Re = Date.now() - L,
    Be = null;
  if (code === 0)
    try {
      Be = jsonParse(stdout)
        .filter((rt) => rt.stateReason === "COMPLETED")
        .map((rt) => ({ number: rt.number, title: rt.title, closedAt: rt.closedAt }));
    } catch (error) {
      logForDebugging(`Failed to parse gh issue list output: ${error}`, { level: "error" });
    }
  if (Be !== null)
    if (isStorageV5Enabled() && h !== void 0)
      try {
        let write = await h.write(i5e(), jsonStringify(Be), { mode: 438 & ~process.umask() });
        if (!write.ok)
          logForDebugging(`Failed to write closed-issues cache: ${formatStorageError(write.error)}`, {
            level: "error",
          });
      } catch (error) {
        logForDebugging(`Failed to write closed-issues cache: ${error}`, { level: "error" });
      }
    else
      try {
        await closedIssuesCachePath().write(Be);
      } catch (error) {
        logForDebugging(`Failed to write closed-issues cache: ${error}`, { level: "error" });
      }
  let He = x.closedIssuesAcknowledged ?? [],
    We = He;
  if (Be !== null) {
    let Xe = new Set(Be.map((rt) => rt.number));
    We = He.filter((rt) => Xe.has(rt));
  }
  let ze = We.length !== He.length || We.some((Xe, rt) => Xe !== He[rt]);
  return (
    await saveGlobalConfig(
      (Xe) => ({ ...Xe, closedIssuesLastChecked: now, ...(ze && { closedIssuesAcknowledged: We }) }),
      h,
    ),
    Re
  );
}
//@ chunk-18hwfzwa.js:780382-781217 placement
async function readClosedIssuesCache(h) {
  if (h) {
    let x;
    try {
      x = await h.read([i5e()]);
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
      return (logForDebugging(`closed-issues cache is not valid JSON: ${error}`, { level: "warn" }), []);
    }
    let safeParse = CLOSED_ISSUES_SCHEMA().safeParse(L);
    if (!safeParse.success)
      return (
        logForDebugging(`closed-issues cache failed schema validation: ${safeParse.error.message}`, {
          level: "warn",
        }),
        []
      );
    return safeParse.data;
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
function unacknowledgedClosedIssues(h) {
  let x = new Set(getGlobalConfig().closedIssuesAcknowledged ?? []);
  return h.filter((D) => !x.has(D.number));
}
//@ chunk-18hwfzwa.js:781320-781497 placement
function acknowledgeClosedIssues(h, x) {
  if (h.length === 0) return;
  let D = getGlobalConfig().closedIssuesAcknowledged ?? [],
    L = uniq([...D, ...h]);
  if (L.length === D.length) return;
  saveGlobalConfig((ee) => ({ ...ee, closedIssuesAcknowledged: L }), x);
}
//@ chunk-18hwfzwa.js:781497-781531 placement
function selectNumber(Dt) {
  return Dt.number;
}
//@ chunk-18hwfzwa.js:781531-781561 placement
function X8t(Lt, oo) {
  return oo;
}
//@ chunk-18hwfzwa.js:781561-781595 placement
function selectNumber2(Xt) {
  return Xt.number;
}

export {
  selectNumber,
  X8t,
  acknowledgeClosedIssues,
  selectNumber2,
  readClosedIssuesCache,
  unacknowledgedClosedIssues,
  fetchMyClosedIssues,
};
