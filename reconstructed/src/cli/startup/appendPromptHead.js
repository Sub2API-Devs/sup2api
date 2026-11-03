/**
 * cli/startup/appendPromptHead.ts
 *
 * 2.1.316 新增：追加系统提示词头部的解析、读取与插入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (4)
 * attribution: placement 4
 */
import { createHash } from "crypto";
import { env } from "../../utils/env.js";
import {
  MODEL_PIN_PATTERNS,
  BLANK_NOTICE_RE,
  MAX_OVERRIDE_NOTICE_CHARS,
} from "../../utils/model/modelOverrideNotices.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../../entrypoints/sdk/coreSchemas.js";
import { joinCacheablePrompt, isUncachedPromptBoundary } from "../../utils/configDirPathShape.js";
import { withAddedSections } from "../../utils/systemPromptBoundary.js";

//@ chunk-3wek6r2k.js:66663-67121 placement
function parseAppendPromptHead(e, o) {
  if (!env.CLAUDE_CODE_REMOTE)
    return {
      outcome: "not_remote",
    };
  if (!o)
    return {
      outcome: "no_append",
    };
  let match = MODEL_PIN_PATTERNS.exec(e);
  if (!match)
    return {
      outcome: "bad_designator",
    };
  let r = Number(match[1]);
  let buffer = Buffer.from(o, "utf8");
  let chunk = buffer.subarray(0, r);
  if (
    buffer.length < r + 2 ||
    buffer[r] !== 10 ||
    buffer[r + 1] !== 10 ||
    createHash("sha256").update(chunk).digest("hex") !== match[2]
  )
    return {
      outcome: "no_match",
    };
  let str = chunk.toString("utf8");
  if (
    !o.startsWith(`${str}

`)
  )
    return {
      outcome: "no_match",
    };
  return {
    outcome: "verified_at_startup",
    head: str,
  };
}
//@ chunk-3wek6r2k.js:67121-67409 placement
/**
 * 读取 CLAUDE_CODE_APPEND_PROMPT_HEAD（仅远程会话），解析追加系统提示的"头"标识并上报。
 */
function readAppendPromptHead(appendSystemPrompt) {
  try {
    let CLAUDE_CODE_APPEND_PROMPT_HEAD = env.CLAUDE_CODE_APPEND_PROMPT_HEAD;
    if (!CLAUDE_CODE_APPEND_PROMPT_HEAD) return;
    let { outcome, head } = parseAppendPromptHead(CLAUDE_CODE_APPEND_PROMPT_HEAD, appendSystemPrompt);
    logEvent("tengu_append_head_designator", {
      outcome: fromEnum(outcome),
      appendHeadBytes: head === undefined ? 0 : Buffer.byteLength(head, "utf8"),
    });
    return head;
  } catch (error) {
    logError(error);
    return;
  } finally {
    env.unset("CLAUDE_CODE_APPEND_PROMPT_HEAD");
  }
}
//@ chunk-3wek6r2k.js:67409-67649 placement
function renderAppendPromptHead(e, appendSystemPrompt, appendSystemPromptHead, r) {
  if (!appendSystemPromptHead) return;
  try {
    let u = insertAppendPromptHead(e, appendSystemPrompt, appendSystemPromptHead, r);
    logEvent("tengu_append_head_render", {
      outcome: fromEnum(u.outcome),
      appendHeadBytes: Buffer.byteLength(appendSystemPromptHead, "utf8"),
    });
    return u.outcome === "moved"
      ? {
          base: u.base,
          append: u.append,
        }
      : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-3wek6r2k.js:67649-68365 placement
function insertAppendPromptHead(e, o, n, r) {
  if (!r)
    return {
      outcome: "no_cache_scope",
    };
  if (!o)
    return {
      outcome: "no_append",
    };
  let index = e.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY);
  if (index === -1)
    return {
      outcome: "no_boundary",
    };
  let index_2 = o.indexOf(n);
  let h = index_2 + n.length;
  if (
    index_2 === -1 ||
    o.indexOf(n, index_2 + 1) !== -1 ||
    !o.startsWith(
      `

`,
      h,
    ) ||
    (index_2 !== 0 &&
      (index_2 < 2 ||
        o.slice(index_2 - 2, index_2) !==
          `

`))
  )
    return {
      outcome: "head_not_found",
    };
  let S = o.slice(0, index_2) + o.slice(h + 2);
  let sliced = e.slice(0, index);
  let sliced_2 = e.slice(index + 1);
  let E = joinCacheablePrompt([...sliced, n]);
  let w = joinCacheablePrompt([...sliced_2, S]);
  if (
    [
      n,
      S,
      o,
      E,
      w,
      joinCacheablePrompt([...sliced, n, ...sliced_2, S]),
      joinCacheablePrompt(sliced),
      joinCacheablePrompt([...sliced_2, o]),
      joinCacheablePrompt([...sliced, ...sliced_2, o]),
    ].some(isUncachedPromptBoundary)
  )
    return {
      outcome: "own_block_text",
    };
  if ([S, E, w].some((P) => BLANK_NOTICE_RE.test(P)))
    return {
      outcome: "blank_text",
    };
  if (E.length <= 2 * MAX_OVERRIDE_NOTICE_CHARS && Array.from(E).length <= MAX_OVERRIDE_NOTICE_CHARS)
    return {
      outcome: "short_block",
    };
  return {
    outcome: "moved",
    base: withAddedSections(e, [["shared", n]], r),
    append: S,
  };
}
export { renderAppendPromptHead, readAppendPromptHead };
