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
import { u, o, E, A, U } from "../../../vendor/zod/v4/classic/schemas.js";
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
var PROMPT_STASH_NAME = ".prompt-stash",
  MAX_PROMPT_STASH_BYTES = 262144,
  MAX_STASHED_PASTES = 256,
  promptStashSchema = DoctorLazy(() =>
    u({
      text: o(),
      cursorOffset: E().int().nonnegative(),
      pasteIds: A(E().int().nonnegative()).max(MAX_STASHED_PASTES),
      launchWarning: u({
        type: U(["deep-link", "prefill"]),
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
      .filter((r) => !r.inline)
      .slice(0, MAX_STASHED_PASTES)
      .map((r) => r.id),
    launchWarning: e.launchWarning,
  });
}
/**
 * 规整暂存文本：统一换行、制表符换空格、去掉不可见字符（以 ZWNJ 分段并在必要处保留分隔）。
 */
//@ chunk-nfave34y.js:1091-1343 placement
function normalizeStashText(e) {
  let r = [],
    s = "";
  for (let a of e
    .replace(
      /\r\n|\r/g,
      `
`,
    )
    .replaceAll("\t", "    ")
    .split(/\u200C+/)) {
    let n = stripInvisibleChars(a, "", { keepNewlines: !0 });
    if (n === "") continue;
    if (s !== "" && /\S$/.test(s) && /^\S/.test(n)) r.push("\u200C");
    (r.push(n), (s = n));
  }
  return r.join("");
}
/**
 * 删除旧文件后以独占方式写新文件（权限 600），再按重试规则落位，失败时清理临时文件。
 */
//@ chunk-nfave34y.js:1343-1485 placement
async function replaceFileExclusive(e, r) {
  await rm(e, { force: !0 });
  let s = await writeIfMissing(e, r, 384);
  try {
    await retryFsOp(s, e);
  } catch (error) {
    throw (await rm(s, { force: !0 }).catch(() => {}), error);
  }
}
/**
 * 解析暂存的输入：校验 schema，去掉已不存在的粘贴占位，空文本返回 null，返回可恢复的输入状态。
 */
//@ chunk-nfave34y.js:1485-1913 placement
function parsePromptStash(e) {
  let r;
  try {
    r = jsonParse(e);
  } catch {
    return null;
  }
  let safeParse = promptStashSchema().safeParse(r);
  if (!safeParse.success) return null;
  let { cursorOffset: cursorOffset, pasteIds: pasteIds, launchWarning: launchWarning } = safeParse.data,
    d = normalizeStashText(safeParse.data.text),
    O = new Set(pasteIds),
    l = "",
    S = 0;
  for (let c of parsePastedRefs(d))
    if (O.has(c.id)) ((l += d.slice(S, c.index)), (S = c.index + c.match.length));
  if (((l += d.slice(S)), l.trim() === "")) return null;
  return {
    text: l,
    mode: "prompt",
    cursorOffset: truncateToLength(l, Math.min(cursorOffset, l.length)).length,
    pastedContents: {},
    launchWarning: launchWarning,
  };
}
/**
 * 把输入框状态暂存到作业目录的 .prompt-stash（超过上限只保留在内存）；为空时删除文件。
 */
//@ chunk-nfave34y.js:1913-2199 placement
async function writePromptStash(e, r) {
  let s = join(e, PROMPT_STASH_NAME),
    a = r === null ? "" : serializePromptStash(r);
  if (Buffer.byteLength(a) > MAX_PROMPT_STASH_BYTES)
    (logForDebugging("[bg] prompt stash too large to persist; kept in memory only", { level: "warn" }),
      (a = ""));
  try {
    let n = await rm(s, { force: !0 }).then(
      () => !0,
      (h) => (logJobWriteError(h), !1),
    );
    if (a === "" && n) return;
    await replaceFileExclusive(s, a);
  } catch (error) {
    if (!isENOENT(error)) logJobWriteError(error);
  }
}
//@ chunk-nfave34y.js:2199-2413 placement
async function readPromptStash(e) {
  let r = await readSmallFileOrNull(join(e, PROMPT_STASH_NAME), MAX_PROMPT_STASH_BYTES);
  if (!r) return null;
  let s = parsePromptStash(r);
  if (s === null)
    (logForDebugging("[bg] persisted prompt stash unreadable or empty", { level: "warn" }),
      logFeatureBad("bg_prompt_stash_restore", "unreadable_or_empty"));
  return s;
}
//@ chunk-nfave34y.js:2413-3019 placement
class PromptStash {
  #t;
  #e;
  #r = Promise.resolve();
  #s = !1;
  #o;
  constructor(e) {
    ((this.#t = e), (this.#e = b(e.getState().stash)), (this.#o = e.subscribe(this.#n)));
  }
  #n = () => {
    let e = b(this.#t.getState().stash);
    if (e === this.#e) return;
    this.#e = e;
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    this.#r = this.#r.then(() => writePromptStash(CLAUDE_JOB_DIR, e));
  };
  async restore() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (this.#s || !CLAUDE_JOB_DIR) return !1;
    this.#s = !0;
    let r = await readPromptStash(CLAUDE_JOB_DIR);
    if (r === null) return !1;
    if (this.#t.getState().stash !== null)
      return (logFeatureSad("bg_prompt_stash_restore", "slot_taken"), !1);
    return (
      (this.#e = r),
      this.#t.setState((s) => ({ ...s, stash: r })),
      logFeatureOk("bg_prompt_stash_restore"),
      !0
    );
  }
  flush() {
    return this.#r;
  }
  dispose() {
    this.#o();
  }
}
//@ chunk-nfave34y.js:3019-3064 placement
function b(e) {
  return e?.cameBack === !0 ? null : e;
}

export { replaceFileExclusive, PromptStash, normalizeStashText };
