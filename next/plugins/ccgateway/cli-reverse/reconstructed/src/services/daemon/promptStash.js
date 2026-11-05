/**
 * services/daemon/promptStash.ts
 *
 * 后台提示暂存（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xmpgk2cc.js (9)
 * attribution: placement 9
 */
import { rm } from "fs/promises";
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  array,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { writeIfMissing, retryFsOp } from "../../utils/atomicPublishWrite.js";
import { parsePastedRefs } from "../../history.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { logJobWriteError } from "./jobState.js";
import { isENOENT } from "../../utils/errors.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xmpgk2cc.js:697-937 placement
var PROMPT_STASH_NAME; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_PROMPT_STASH_BYTES;
var MAX_STASHED_PASTES;
var promptStashSchema;
deferInit("chunk-xmpgk2cc.js:697", () => {
  PROMPT_STASH_NAME = ".prompt-stash";
  MAX_PROMPT_STASH_BYTES = 262144;
  MAX_STASHED_PASTES = 256;
  promptStashSchema = DoctorLazy(() =>
    objectSchema({
      text: stringSchema(),
      cursorOffset: numberSchema().int().nonnegative(),
      pasteIds: array(numberSchema().int().nonnegative()).max(MAX_STASHED_PASTES),
      launchWarning: objectSchema({
        type: _enum(["deep-link", "prefill"]),
        prefillLength: numberSchema().int().nonnegative(),
      }).optional(),
    }),
  );
});
//@ chunk-xmpgk2cc.js:937-1123 placement
function serializePromptStash(stash) {
  return jsonStringify({
    text: stash.text,
    cursorOffset: stash.cursorOffset,
    pasteIds: Object.values(stash.pastedContents)
      .filter((pastedContent) => !pastedContent.inline)
      .slice(0, MAX_STASHED_PASTES)
      .map((pastedContent) => pastedContent.id),
    launchWarning: stash.launchWarning,
  });
}
//@ chunk-xmpgk2cc.js:1123-1375 placement (2.1.88 match: _temp18, 0.75)
/**
 * 规整暂存文本：统一换行、制表符换空格、去掉不可见字符（以 ZWNJ 分段并在必要处保留分隔）。
 */
function normalizeStashText(text) {
  let parts = [];
  let prev = "";
  for (let chunk of text
    .replace(
      /\r\n|\r/g,
      `
`,
    )
    .replaceAll("\t", "    ")
    .split(/\u200C+/)) {
    let cleaned = stripInvisibleChars(chunk, "", {
      keepNewlines: true,
    });
    if (cleaned === "") continue;
    if (prev !== "" && /\S$/.test(prev) && /^\S/.test(cleaned)) parts.push("\u200C");
    parts.push(cleaned);
    prev = cleaned;
  }
  return parts.join("");
}
//@ chunk-xmpgk2cc.js:1375-1517 placement
/**
 * 删除旧文件后以独占方式写新文件（权限 600），再按重试规则落位，失败时清理临时文件。
 */
async function replaceFileExclusive(path, content) {
  await rm(path, {
    force: true,
  });
  let tmpPath = await writeIfMissing(path, content, 384);
  try {
    await retryFsOp(tmpPath, path);
  } catch (error) {
    await rm(tmpPath, {
      force: true,
    }).catch(() => {});
    throw error;
  }
}
//@ chunk-xmpgk2cc.js:1517-1944 placement
/**
 * 解析暂存的输入：校验 schema，去掉已不存在的粘贴占位，空文本返回 null，返回可恢复的输入状态。
 */
function parsePromptStash(smallFileOrNull) {
  let parsed;
  try {
    parsed = jsonParse(smallFileOrNull);
  } catch {
    return null;
  }
  let result = promptStashSchema().safeParse(parsed);
  if (!result.success) return null;
  let { cursorOffset, pasteIds, launchWarning } = result.data;
  let text = normalizeStashText(result.data.text);
  let ids = new Set(pasteIds);
  let out = "";
  let cursor = 0;
  for (let ref of parsePastedRefs(text))
    if (ids.has(ref.id)) {
      out += text.slice(cursor, ref.index);
      cursor = ref.index + ref.match.length;
    }
  out += text.slice(cursor);
  if (out.trim() === "") return null;
  return {
    text: out,
    mode: "prompt",
    cursorOffset: truncateToLength(out, Math.min(cursorOffset, out.length)).length,
    pastedContents: {},
    launchWarning,
  };
}
//@ chunk-xmpgk2cc.js:1944-2230 placement
/**
 * 把输入框状态暂存到作业目录的 .prompt-stash（超过上限只保留在内存）；为空时删除文件。
 */
async function writePromptStash(jobDir, stash) {
  let path = join(jobDir, PROMPT_STASH_NAME);
  let content = stash === null ? "" : serializePromptStash(stash);
  if (Buffer.byteLength(content) > MAX_PROMPT_STASH_BYTES) {
    logForDebugging("[bg] prompt stash too large to persist; kept in memory only", {
      level: "warn",
    });
    content = "";
  }
  try {
    let removed = await rm(path, {
      force: true,
    }).then(
      () => true,
      (error) => {
        logJobWriteError(error);
        return false;
      },
    );
    if (content === "" && removed) return;
    await replaceFileExclusive(path, content);
  } catch (error) {
    if (!isENOENT(error)) logJobWriteError(error);
  }
}
//@ chunk-xmpgk2cc.js:2230-2444 placement
async function readPromptStash(jobDir) {
  let smallFileOrNull = await readSmallFileOrNull(join(jobDir, PROMPT_STASH_NAME), MAX_PROMPT_STASH_BYTES);
  if (!smallFileOrNull) return null;
  let promptStash = parsePromptStash(smallFileOrNull);
  if (promptStash === null) {
    logForDebugging("[bg] persisted prompt stash unreadable or empty", {
      level: "warn",
    });
    logFeatureBad("bg_prompt_stash_restore", "unreadable_or_empty");
  }
  return promptStash;
}
//@ chunk-xmpgk2cc.js:2444-3050 placement
class PromptStash {
  #t;
  #e;
  #r = Promise.resolve();
  #s = false;
  #o;
  constructor(promptInput) {
    this.#t = promptInput;
    this.#e = visibleStash(promptInput.getState().stash);
    this.#o = promptInput.subscribe(this.#n);
  }
  #n = () => {
    let next = visibleStash(this.#t.getState().stash);
    if (next === this.#e) return;
    this.#e = next;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    this.#r = this.#r.then(() => writePromptStash(CLAUDE_JOB_DIR, next));
  };
  async restore() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (this.#s || !CLAUDE_JOB_DIR) return false;
    this.#s = true;
    let promptStash = await readPromptStash(CLAUDE_JOB_DIR);
    if (promptStash === null) return false;
    if (this.#t.getState().stash !== null) {
      logFeatureSad("bg_prompt_stash_restore", "slot_taken");
      return false;
    }
    this.#e = promptStash;
    this.#t.setState((stash) => ({
      ...stash,
      stash: promptStash,
    }));
    logFeatureOk("bg_prompt_stash_restore");
    return true;
  }
  flush() {
    return this.#r;
  }
  dispose() {
    this.#o();
  }
}
//@ chunk-xmpgk2cc.js:3050-3095 placement
/**
 * 取要展示的暂存草稿：已被回填过（cameBack）的返回 null。
 */
function visibleStash(stash) {
  return stash?.cameBack === true ? null : stash;
}
export { replaceFileExclusive, PromptStash, normalizeStashText };
