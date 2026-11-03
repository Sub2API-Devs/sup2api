/**
 * services/daemon/promptStash.ts
 *
 * 后台提示暂存（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nfave34y.js (9)
 * attribution: placement 9
 */
import { rm } from "fs/promises";
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, array, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-nfave34y.js:665-905 placement
var PROMPT_STASH_NAME = ".prompt-stash";
var MAX_PROMPT_STASH_BYTES = 262144;
var MAX_STASHED_PASTES = 256;
var promptStashSchema = DoctorLazy(() =>
  u({
    text: string(),
    cursorOffset: E().int().nonnegative(),
    pasteIds: array(E().int().nonnegative()).max(MAX_STASHED_PASTES),
    launchWarning: u({
      type: _enum(["deep-link", "prefill"]),
      prefillLength: E().int().nonnegative(),
    }).optional(),
  }),
);
//@ chunk-nfave34y.js:905-1091 placement
function serializePromptStash(e) {
  return jsonStringify({
    text: e.text,
    cursorOffset: e.cursorOffset,
    pasteIds: Object.values(e.pastedContents)
      .filter((pastedContent) => !pastedContent.inline)
      .slice(0, MAX_STASHED_PASTES)
      .map((pastedContent) => pastedContent.id),
    launchWarning: e.launchWarning,
  });
}
//@ chunk-nfave34y.js:1091-1343 placement
/**
 * 规整暂存文本：统一换行、制表符换空格、去掉不可见字符（以 ZWNJ 分段并在必要处保留分隔）。
 */
function normalizeStashText(e) {
  let r = [];
  let s = "";
  for (let a of e
    .replace(
      /\r\n|\r/g,
      `
`,
    )
    .replaceAll("\t", "    ")
    .split(/\u200C+/)) {
    let n = stripInvisibleChars(a, "", {
      keepNewlines: true,
    });
    if (n === "") continue;
    if (s !== "" && /\S$/.test(s) && /^\S/.test(n)) r.push("\u200C");
    r.push(n);
    s = n;
  }
  return r.join("");
}
//@ chunk-nfave34y.js:1343-1485 placement
/**
 * 删除旧文件后以独占方式写新文件（权限 600），再按重试规则落位，失败时清理临时文件。
 */
async function replaceFileExclusive(e, r) {
  await rm(e, {
    force: true,
  });
  let s = await writeIfMissing(e, r, 384);
  try {
    await retryFsOp(s, e);
  } catch (error) {
    await rm(s, {
      force: true,
    }).catch(() => {});
    throw error;
  }
}
//@ chunk-nfave34y.js:1485-1913 placement
/**
 * 解析暂存的输入：校验 schema，去掉已不存在的粘贴占位，空文本返回 null，返回可恢复的输入状态。
 */
function parsePromptStash(smallFileOrNull) {
  let r;
  try {
    r = jsonParse(smallFileOrNull);
  } catch {
    return null;
  }
  let s = promptStashSchema().safeParse(r);
  if (!s.success) return null;
  let { cursorOffset, pasteIds, launchWarning } = s.data;
  let d = normalizeStashText(s.data.text);
  let O = new Set(pasteIds);
  let l = "";
  let S = 0;
  for (let c of parsePastedRefs(d))
    if (O.has(c.id)) {
      l += d.slice(S, c.index);
      S = c.index + c.match.length;
    }
  l += d.slice(S);
  if (l.trim() === "") return null;
  return {
    text: l,
    mode: "prompt",
    cursorOffset: truncateToLength(l, Math.min(cursorOffset, l.length)).length,
    pastedContents: {},
    launchWarning,
  };
}
//@ chunk-nfave34y.js:1913-2199 placement
/**
 * 把输入框状态暂存到作业目录的 .prompt-stash（超过上限只保留在内存）；为空时删除文件。
 */
async function writePromptStash(e, r) {
  let s = join(e, PROMPT_STASH_NAME);
  let a = r === null ? "" : serializePromptStash(r);
  if (Buffer.byteLength(a) > MAX_PROMPT_STASH_BYTES) {
    logForDebugging("[bg] prompt stash too large to persist; kept in memory only", {
      level: "warn",
    });
    a = "";
  }
  try {
    let n = await rm(s, {
      force: true,
    }).then(
      () => true,
      (error) => {
        logJobWriteError(error);
        return false;
      },
    );
    if (a === "" && n) return;
    await replaceFileExclusive(s, a);
  } catch (error) {
    if (!isENOENT(error)) logJobWriteError(error);
  }
}
//@ chunk-nfave34y.js:2199-2413 placement
async function readPromptStash(e) {
  let smallFileOrNull = await readSmallFileOrNull(join(e, PROMPT_STASH_NAME), MAX_PROMPT_STASH_BYTES);
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
//@ chunk-nfave34y.js:2413-3019 placement
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
    let e = visibleStash(this.#t.getState().stash);
    if (e === this.#e) return;
    this.#e = e;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    this.#r = this.#r.then(() => writePromptStash(CLAUDE_JOB_DIR, e));
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
    this.#t.setState((s) => ({
      ...s,
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
//@ chunk-nfave34y.js:3019-3064 placement
/**
 * 取要展示的暂存草稿：已被回填过（cameBack）的返回 null。
 */
function visibleStash(stash) {
  return stash?.cameBack === true ? null : stash;
}
export { replaceFileExclusive, PromptStash, normalizeStashText };
