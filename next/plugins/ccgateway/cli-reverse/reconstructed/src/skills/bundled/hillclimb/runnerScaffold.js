/**
 * skills/bundled/hillclimb/runnerScaffold.ts
 *
 * hillclimb 技能 runner 脚手架（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: runner-scaffold-q2rf9gg9.mjs (31)
 * attribution: placement 31
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  constants as FS,
  lstatSync,
  realpathSync,
  openSync,
  fstatSync,
  closeSync,
  ftruncateSync,
  writeFileSync,
  writeSync,
  readFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

//@ runner-scaffold-q2rf9gg9.mjs:2620-2661 placement
const WIN = process.platform === "win32";
//@ runner-scaffold-q2rf9gg9.mjs:2662-2703 placement
const NOFOLLOW = WIN ? 0 : FS.O_NOFOLLOW;
//@ runner-scaffold-q2rf9gg9.mjs:2863-2983 placement
const lstatOrNull = (filePath) => {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};
//@ runner-scaffold-q2rf9gg9.mjs:2984-3049 placement
const isSymlink = (filePath) => lstatOrNull(filePath)?.isSymbolicLink() === true;
//@ runner-scaffold-q2rf9gg9.mjs:3340-3429 placement
const ESC_SEQ = /\x1b\[[0-?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[@-_]/g;
//@ runner-scaffold-q2rf9gg9.mjs:3430-3470 placement
const CONTROL = /[\x00-\x1f\x7f-\x9f]/g;
//@ runner-scaffold-q2rf9gg9.mjs:3471-3545 placement
const termSafe = (text) => String(text).replace(ESC_SEQ, "").replace(CONTROL, "");
//@ runner-scaffold-q2rf9gg9.mjs:3546-3605 placement
const eprint = (...args) => console.error(...args.map(termSafe));
//@ runner-scaffold-q2rf9gg9.mjs:4228-4252 placement
let flowRealRoot = null;
//@ runner-scaffold-q2rf9gg9.mjs:4253-4600 placement
/**
 * 确认目录真实路径位于 flow 根目录之内，否则抛错。
 */
function assertInFlow(dirPath, what) {
  if (flowRealRoot == null) throw new Error(`refusing to ${what}: flow root not resolved yet`);
  const dirReal = realpathSync(dirPath);
  if (dirReal !== flowRealRoot && !dirReal.startsWith(flowRealRoot + (WIN ? "\\" : "/")))
    throw new Error(`refusing to ${what}: ${dirPath} resolves outside the flow directory`);
}
//@ runner-scaffold-q2rf9gg9.mjs:4601-5483 placement
/**
 * 不跟随符号链接地打开 flow 内的文件，拒绝经过符号链接目录或硬链接的路径。
 */
function openNoFollow(filePath, flags) {
  if (isSymlink(dirname(filePath)))
    throw new Error(`refusing to open through symlinked directory: ${dirname(filePath)}`);
  assertInFlow(dirname(filePath), "open");
  if (WIN && isSymlink(filePath)) throw new Error(`refusing to open through symlink: ${filePath}`);
  const fileHandle = openSync(filePath, flags | NOFOLLOW, 0o644);
  try {
    const fileStat = fstatSync(fileHandle);
    if (!fileStat.isFile()) throw new Error(`refusing to use non-regular file: ${filePath}`);
    // O_NOFOLLOW and lstat cannot see a hard link: a second name for a file
    // outside the flow dir opens as an ordinary regular file. Nothing the
    // runner creates has more than one link, so refuse any that does.
    if (fileStat.nlink > 1)
      throw new Error(
        `refusing to use ${filePath}: it has a second hard link (another name for the same file); replace it with a plain copy if it is yours`,
      );
  } catch (error) {
    closeSync(fileHandle);
    throw error;
  }
  return fileHandle;
}
//@ runner-scaffold-q2rf9gg9.mjs:5771-5950 placement
function writeFileNoFollow(filePath, data) {
  const fileHandle = openNoFollow(filePath, FS.O_WRONLY | FS.O_CREAT);
  try {
    ftruncateSync(fileHandle, 0);
    writeFileSync(fileHandle, data);
  } finally {
    closeSync(fileHandle);
  }
}
//@ runner-scaffold-q2rf9gg9.mjs:6174-6654 placement
/**
 * 以不跟随符号链接的方式追加写文件（Windows 下分块写）。
 */
function appendFileNoFollow(filePath, data) {
  const fileHandle = openNoFollow(filePath, FS.O_WRONLY | FS.O_CREAT | FS.O_APPEND);
  try {
    if (!WIN) {
      writeFileSync(fileHandle, data);
      return;
    }
    const buffer = Buffer.from(data);
    const start = fstatSync(fileHandle).size;
    for (let offset = 0; offset < buffer.length;) {
      const written = writeSync(fileHandle, buffer, offset, buffer.length - offset, start + offset);
      if (written <= 0) throw new Error(`append to ${filePath} made no progress`);
      offset += written;
    }
  } finally {
    closeSync(fileHandle);
  }
}
//@ runner-scaffold-q2rf9gg9.mjs:7035-7079 placement
const lexists = (filePath) => lstatOrNull(filePath) != null;
//@ runner-scaffold-q2rf9gg9.mjs:7080-7225 placement
function readFileNoFollow(filePath) {
  const fileHandle = openNoFollow(filePath, FS.O_RDONLY);
  try {
    return readFileSync(fileHandle, "utf8");
  } finally {
    closeSync(fileHandle);
  }
}
//@ runner-scaffold-q2rf9gg9.mjs:7311-7440 placement
function readIfPresent(filePath) {
  try {
    return readFileNoFollow(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
//@ runner-scaffold-q2rf9gg9.mjs:7441-7833 placement
/**
 * 创建目录并在创建后确认没有经过符号链接祖先目录。
 */
function mkdirNoFollow(dir) {
  if (isSymlink(dir)) throw new Error(`refusing to use symlinked directory: ${dir}`);
  mkdirSync(dir, {
    recursive: true,
  });
  // Check after creating: mkdirSync(recursive) follows symlinked ancestors,
  // so a dir minted through one resolves outside the flow root and is refused
  // here before any file lands in it.
  assertInFlow(dir, "create directory");
}
//@ runner-scaffold-q2rf9gg9.mjs:7983-8031 placement
const REF_EXTS = ["", ".html", ".txt", ".json"];
//@ runner-scaffold-q2rf9gg9.mjs:8183-8321 placement
async function loadCases() {
  // e.g. return JSON.parse(readFileSync('eval/cases.json', 'utf8'));
  throw new Error("TODO: loadCases");
}
//@ runner-scaffold-q2rf9gg9.mjs:8542-9084 placement
/**
 * 执行单个用例的模板函数，需由用户实现调用模型并返回输出、对话记录和用量。
 */
async function runCase(input, ctx) {
  // const res = await client.messages.create({ model: ctx.model, ... });
  // return {
  //   output: res.content.at(-1).text,      // or a file you wrote, an HTML page, ...
  //   transcript: [...],                     // Turn[] - see SCHEMA.md
  //   model: res.model, usage: res.usage, stop_reason: res.stop_reason,
  //   // optional, for model-graded cost: judge_model, judge_usage
  //   // optional, per-turn artifacts: attachments: [{kind, ref, alt}]
  // };
  throw new Error("TODO: runCase");
}
//@ runner-scaffold-q2rf9gg9.mjs:9590-9756 placement
async function gradeCase(input, run, ref, ctx) {
  // return { grade: { pass: run.output.includes(input.expected) ? 1 : 0 } };
  throw new Error("TODO: gradeCase");
}
//@ runner-scaffold-q2rf9gg9.mjs:9829-9866 placement
function perfFrom(run) {
  return {};
}
//@ runner-scaffold-q2rf9gg9.mjs:9949-11746 placement
/**
 * 解析 runner 脚手架的命令行参数（--flow、--variant、--approve-harness 等），缺少必填项时打印用法并退出。
 */
function parseArgs(argv) {
  const parsed = {
    flow: ".claude/hillclimb/flow",
    variant: "baseline",
    model: undefined,
    reps: 1,
    concurrency: 4,
    timeoutS: 1800,
    approveHarness: false,
  };
  // A flag at the end of argv would otherwise consume undefined - which for
  // --model equals the default and silently disables the served-model check.
  const value = (index) => {
    if (argv[index] === undefined) {
      eprint(`missing value for ${argv[index - 1]}`);
      usage();
      process.exit(2);
    }
    return argv[index];
  };
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (key === "--flow") parsed.flow = value(++index);
    else if (key === "--variant") parsed.variant = value(++index);
    else if (key === "--model") parsed.model = value(++index);
    else if (key === "--reps") parsed.reps = +value(++index);
    else if (key === "--concurrency") parsed.concurrency = +value(++index);
    else if (key === "--timeout-s") parsed.timeoutS = +value(++index);
    else if (key === "--approve-harness") parsed.approveHarness = true;
    else if (key === "-h" || key === "--help") {
      usage();
      process.exit(0);
    } else {
      eprint(`unknown argument: ${key}`);
      usage();
      process.exit(2);
    }
  }
  if (!/^(baseline|v[1-9]\d*)$/.test(parsed.variant)) {
    // The report only reads directories named 'baseline' or 'v<N>' - any other
    // name runs to completion but spends the pass into a directory the Summary,
    // trajectory, and budget arithmetic never see.
    eprint(`--variant must be 'baseline' or 'v<N>', got '${parsed.variant}'`);
    usage();
    process.exit(2);
  }
  if (
    !Number.isFinite(parsed.timeoutS) ||
    parsed.timeoutS < 0 ||
    parsed.timeoutS * 1000 > 2147483647 || // setTimeout clamps >2^31-1 ms to 1 ms - the ceiling would fire instantly
    !Number.isInteger(parsed.reps) ||
    parsed.reps < 1 ||
    !Number.isInteger(parsed.concurrency) ||
    parsed.concurrency < 1
  ) {
    usage();
    process.exit(2);
  }
  return parsed;
}
//@ runner-scaffold-q2rf9gg9.mjs:11747-11924 placement
function usage() {
  eprint(
    "usage: node run-eval.mjs --flow DIR --variant ID [--model ID] [--reps N] [--concurrency N] [--timeout-s N (0 = no ceiling)] [--approve-harness]",
  );
}
//@ runner-scaffold-q2rf9gg9.mjs:13459-15440 placement
/**
 * 对运行脚本自身、旁边的锁文件与 _state.json 列出的 harness 文件计算 sha256；与已批准值一致则继续，--approve-harness 时记录新值，否则打印差异说明并以退出码 2 结束。
 */
function checkHarness(statePath, state, approve) {
  const context = fileURLToPath(import.meta.url);
  const listed = Array.isArray(state.harness_paths) ? state.harness_paths.map(String) : [];
  const lockfiles = [
    ...new Set(
      [dirname(context), process.cwd()].flatMap((dir) =>
        ["package-lock.json", "bun.lock", "bun.lockb", "yarn.lock", "pnpm-lock.yaml"].map((file) =>
          join(dir, file),
        ),
      ),
    ),
  ].filter((file) => existsSync(file));
  const paths = [...new Set([context, ...lockfiles, ...listed.map((path) => resolve(path))])].sort();
  const hash = createHash("sha256");
  const hashed = [];
  for (const path of paths) {
    let fileBuffer;
    try {
      fileBuffer = readFileSync(path);
    } catch (error) {
      if (path === context) throw error;
      eprint(
        `warning: harness path '${relative(process.cwd(), path)}' not readable (${error?.code || "error"}) - skipped`,
      );
      continue;
    }
    hash.update(relative(process.cwd(), path)).update("\0").update(fileBuffer).update("\0");
    hashed.push(relative(process.cwd(), path));
  }
  const sha256 = hash.digest("hex");
  if (state.harness_sha === sha256) return;
  // Said only here, where a person is about to approve or is being refused.
  if (!lockfiles.length)
    eprint(
      "note: no lockfile beside the runner or in the current directory - dependency changes are outside the harness sha",
    );
  if (approve) {
    state.harness_sha = sha256;
    writeFileNoFollow(statePath, JSON.stringify(state, null, 2) + "\n");
    eprint(
      `harness approved: sha256 ${sha256.slice(0, 12)} over ${hashed.length} file(s) recorded in ${statePath}`,
    );
    return;
  }
  if (state.harness_sha == null) {
    eprint(
      `no approved harness sha in ${statePath} (computed ${sha256.slice(0, 12)} over: ${hashed.join(", ")}).`,
    );
    eprint("Review the harness, then run once with --approve-harness to record it.");
  } else {
    eprint(
      `harness changed since last approved run (files: ${hashed.join(", ")}); ` +
        `approved ${String(state.harness_sha).slice(0, 12)}, now ${sha256.slice(0, 12)}.`,
    );
    eprint("Re-run with --approve-harness after reviewing the diff.");
  }
  process.exit(2);
}
//@ runner-scaffold-q2rf9gg9.mjs:15797-16994 placement
/**
 * 带退避重试执行函数：每次尝试前检查截止时间（超时抛 timeout 类错误），429/529/5xx 或 overloaded/rate limit 视为暂时错误按指数退避重试，最多 tries 次。
 */
async function withBackoff(operation, retry, deadline = Infinity, tries = 5) {
  for (let attempt = 0; ; attempt++) {
    // Checked before every attempt, not just before sleeps: once the case's
    // ceiling has passed, an abandoned chain must not issue another call
    // (e.g. a judge call after the app call consumed the whole ceiling).
    if (Date.now() >= deadline) {
      const error = new Error("wall-clock ceiling exceeded before attempt");
      error.failure_class = "timeout";
      throw error;
    }
    try {
      return await operation();
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      const transient =
        status === 429 ||
        status === 529 ||
        (status >= 500 && status < 600) ||
        /overloaded|rate.?limit/i.test(String(error?.message ?? ""));
      if (!transient || attempt >= tries - 1) throw error;
      const delay = Math.min(60_000, 1000 * 2 ** attempt) * (0.5 + Math.random());
      // Never start a retry that would outlive the case's wall-clock ceiling -
      // otherwise an abandoned chain keeps issuing API calls after the case failed.
      if (Date.now() + delay >= deadline) throw error;
      retry.count++;
      await new Promise((reason) => setTimeout(reason, delay));
    }
  }
}
//@ runner-scaffold-q2rf9gg9.mjs:17230-17648 placement
/**
 * 给 Promise 加墙钟超时，超时以带失败类别的错误拒绝。
 */
function withTimeout(promise, seconds, label) {
  if (!(seconds > 0)) return promise;
  let timer;
  const ceiling = new Promise((ignored, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label}: exceeded ${seconds}s wall-clock ceiling`);
      error.failure_class = "timeout";
      reject(error);
    }, seconds * 1000);
  });
  return Promise.race([promise, ceiling]).finally(() => clearTimeout(timer));
}
//@ runner-scaffold-q2rf9gg9.mjs:17960-18600 placement
/**
 * 把用例 id 转成可作文件名的安全形式，过长时截断并加哈希后缀，结果幂等。
 */
function pathSafeId(caseIdValue) {
  const rawValue = String(caseIdValue);
  const cleaned = rawValue.replace(/[^\w.-]/g, "_");
  // Idempotent by construction: anything already path-safe and within the
  // length bound - including this function's own truncated+suffixed output -
  // passes through unchanged. Long ids (URLs, prompt text as id) truncate to
  // 120 chars plus an 8-hex hash of the full original, so they fail here, not
  // at the trace write after the spend, and distinct ids stay distinct.
  if (cleaned === rawValue && rawValue.length <= 129) return rawValue;
  return `${cleaned.slice(0, 120)}-${createHash("sha256").update(rawValue).digest("hex").slice(0, 8)}`;
}
//@ runner-scaffold-q2rf9gg9.mjs:18602-32458 placement
/**
 * hillclimb 运行脚手架入口：解析参数、拒绝含 . / .. 的 --flow、在首次调用模型前预检所有输出路径不是符号链接、校验 harness 摘要，然后逐个用例运行、评分并写 results.jsonl、errors.jsonl 与 progress.txt。
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  // lstat("link/") follows the final symlink, so a trailing separator on
  // --flow would blind every leaf isSymlink check below - strip it first.
  // Only Windows treats `\` as a separator; on POSIX it is a filename byte, so
  // splitting on it would walk prefixes that are not real path components.
  args.flow = args.flow.replace(WIN ? /(.)[\\/]+$/ : /(.)\/+$/, "$1");
  const flowSegments = args.flow.split(WIN ? /[\\/]/ : "/");
  // A `.`/`..` segment (e.g. a trailing `/.`) makes isSymlink(args.flow) below
  // resolve a different final component than the named dir - following a
  // planted link at the flow root - while join() collapses it and the absolute
  // branch skips the ancestor walk. Refuse dot segments outright
  // (absolute --flow stays supported).
  if (flowSegments.some((segment) => segment === "." || segment === "..")) {
    eprint(`refusing to run: --flow must not contain '.' or '..' segments, got '${args.flow}'`);
    process.exit(2);
  }
  const variantDir = join(args.flow, args.variant);
  // Preflight every output path before the first model call: a planted
  // symlink would otherwise fail each case after its (billed) run.
  for (const part of [
    args.flow,
    join(args.flow, "baseline"),
    variantDir,
    join(variantDir, "traces"),
    join(variantDir, "results.jsonl"),
    join(variantDir, "errors.jsonl"),
    join(variantDir, "progress.txt"),
    join(args.flow, "baseline", "ref"),
    join(args.flow, "_state.json"),
  ])
    if (isSymlink(part)) {
      eprint(`refusing to run: ${part} is a symlink (the flow dir must hold regular files)`);
      process.exit(2);
    }
  // A relative --flow (the documented `.claude/hillclimb/<name>` layout) is
  // also lstat-walked component by component from the cwd: a pre-planted
  // link at an ancestor (`.claude/hillclimb -> elsewhere`) would otherwise
  // relocate the root capture below - the containment anchor itself - to the
  // attacker's target. An absolute --flow is the caller's own trust decision
  // and is not walked (an absolute ancestor link can be legitimate: /tmp on
  // macOS).
  if (!isAbsolute(args.flow)) {
    let walk = "";
    for (const part of flowSegments.filter(Boolean).slice(0, -1)) {
      walk = walk ? join(walk, part) : part;
      if (isSymlink(walk)) {
        eprint(`refusing to run: ${walk} is a symlink (ancestor of --flow)`);
        process.exit(2);
      }
    }
  }
  // Every later open/mkdir is bound to this resolved root (see assertInFlow):
  // create the flow dir when fresh (the preflight above refused a link at it
  // and, for a relative path, at every ancestor), then capture where it
  // really resolves.
  mkdirSync(args.flow, {
    recursive: true,
  });
  flowRealRoot = realpathSync(args.flow);
  mkdirNoFollow(join(variantDir, "traces"));
  // _state.json is READ-ONLY here. The orchestrator owns it. Absent is fine
  // (a baseline-only run has no loop state yet), but present-and-unparsable
  // must not let the id-space gate below pass vacuously over a corrupt file.
  const statePath = join(args.flow, "_state.json");
  let state = {};
  // Read through the no-follow opener like every other flow-dir file; the
  // parse message is not echoed (it can quote the file's first bytes).
  const stateText = readIfPresent(statePath);
  if (stateText != null) {
    try {
      state = JSON.parse(stateText) || {};
    } catch {
      eprint(`${statePath} exists but is not valid JSON - fix it before spending a pass`);
      process.exit(2);
    }
  }
  checkHarness(statePath, state, args.approveHarness);
  const context = {
    ...args,
    state,
  };

  // Resume: which (id, rep) pairs already have a row?
  const resultsPath = join(variantDir, "results.jsonl");
  const finished = new Set();
  for (const line of (readIfPresent(resultsPath) ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      finished.add(`${record.prompt_id}\0${record.rep}`);
    } catch {}
  }
  // Rows key on the path-safe id (see pathSafeId), so resume must too.

  const cases = await loadCases();
  // Validate the id space before spending anything: duplicate path-safe ids -
  // including case-insensitive twins, which macOS/Windows filesystems collapse -
  // would silently overwrite traces and frozen refs; and a _state.json split id
  // that matches no case would silently shrink the scored denominator.
  const seen = new Map();
  for (const caseId of cases) {
    const key = pathSafeId(caseId.id).toLowerCase();
    if (seen.has(key)) {
      eprint(`duplicate case id after sanitization: '${caseId.id}' collides with '${seen.get(key)}'`);
      process.exit(2);
    }
    seen.set(key, caseId.id);
  }
  const safeIds = new Set(cases.map((caseId) => pathSafeId(caseId.id)));
  for (const key of ["train_ids", "val_ids", "test_ids"])
    if (state[key] != null && !Array.isArray(state[key])) {
      eprint(`_state.json ${key} must be a list of ids`);
      process.exit(2);
    }
  for (const safeId of [...(state.train_ids ?? []), ...(state.val_ids ?? []), ...(state.test_ids ?? [])]) {
    const slot = String(safeId); // the adapter joins with String() on both sides - numeric ids are fine
    if (safeIds.has(slot)) continue; // matches a loaded case - definitionally valid
    if (slot !== pathSafeId(slot)) {
      // Can never match a row: rows key on path-safe ids. This is the silent
      // shrunken-denominator bug - fail before anything is spent.
      eprint(
        `_state.json split id '${slot}' is not a path-safe id - record split ids exactly as they appear in results.jsonl's prompt_id`,
      );
      process.exit(2);
    }
    // Well-formed but absent is legitimate (a trimmed top-K subset run) - note it, don't fail.
    eprint(`note: split id '${slot}' matches no loaded case (expected for a trimmed subset run)`);
  }
  const refDir = join(args.flow, "baseline", "ref");
  const tasks = [];
  for (const caseId of cases)
    for (let replicate = 0; replicate < args.reps; replicate++) {
      if (finished.has(`${pathSafeId(caseId.id)}\0${replicate}`)) continue;
      tasks.push({
        c: caseId,
        rep: replicate,
      });
    }
  eprint(`[${args.variant}] ${tasks.length} of ${cases.length * args.reps} (id,rep) to run`);
  let index = 0;
  let okCount = 0;
  let failCount = 0;
  const errorsPath = join(variantDir, "errors.jsonl");
  // A hard crash (power loss, ENOSPC) can leave a torn final line with no
  // trailing newline; the next append would merge two rows into one permanently
  // unparseable line. Isolate any fragment before appending anything.
  for (const part of [resultsPath, errorsPath]) {
    const tail = readIfPresent(part);
    if (tail && !tail.endsWith("\n")) appendFileNoFollow(part, "\n");
  }
  async function worker() {
    while (index < tasks.length) {
      const { c: caseId, rep: replicate } = tasks[index++];
      const safeId = pathSafeId(caseId.id);
      const startTime = Date.now();
      let lastRun = null; // survives into the catch - billed spend on a failed attempt
      let rowWritten = false; // set once the results row lands - the attempt is scored
      const deadline = args.timeoutS > 0 ? startTime + args.timeoutS * 1000 : Infinity;
      const appRetry = {
        count: 0,
      };
      const judgeRetry = {
        count: 0,
      };
      try {
        // One ceiling over the whole case - app call, identity check, and grading -
        // so a hung judge stream can't hold the slot either.
        const {
          run: runResult,
          g: grade,
          latency_s: latencySeconds,
        } = await withTimeout(
          (async () => {
            let attemptTime = startTime;
            const judgeRun = await withBackoff(
              () => {
                attemptTime = Date.now();
                return runCase(caseId, context);
              },
              appRetry,
              deadline,
            );
            lastRun = judgeRun;
            // latency_s = the final app attempt only; backoff sleeps, failed
            // attempts, and judge time are excluded (retry counts are in meta).
            const judgeLatencySeconds = (Date.now() - attemptTime) / 1000;
            // Serving identity: fail loudly when the response was served by a model
            // other than the one requested. Accept exact match or a documented
            // alias->snapshot resolution - 'foo-latest'/'foo-0'/'foo' served as
            // 'foo-20250101', 'foo@20250101', or 'foo-2025-01-01'. Anything else -
            // another snapshot of the requested pin, a sibling model, or the bare
            // base id ('foo-latest' served as 'foo', an unversioned echo that can
            // hide snapshot drift across rounds) - fails the attempt. Non-Anthropic
            // id schemes (e.g. Bedrock's 'anthropic.claude-...-v1:0') need their own
            // rule here.
            if (context.model && judgeRun.model && judgeRun.model !== context.model) {
              const base = context.model.replace(/-latest$|-0$/, "");
              const rest = String(judgeRun.model).startsWith(base)
                ? String(judgeRun.model).slice(base.length)
                : null;
              if (!(rest != null && /^[-@](\d{8}|\d{4}-\d{2}-\d{2})$/.test(rest))) {
                const error = new Error(`served model ${judgeRun.model} != requested ${context.model}`);
                error.failure_class = "serving_substitution";
                throw error;
              }
            }
            // Frozen pairwise reference (never regenerated): baseline/ref/<id>.*
            let refText = null;
            if (args.variant !== "baseline") {
              const part = join(refDir, safeId);
              // A planted symlink throws (ELOOP) rather than feeding the judge
              // its target; the case then fails loudly instead of leaking.
              for (const extension of REF_EXTS) {
                try {
                  refText = readFileNoFollow(part + extension);
                  break;
                } catch (error) {
                  if (error?.code !== "ENOENT") throw error;
                }
              }
            }
            const grade = await withBackoff(
              () => gradeCase(caseId, judgeRun, refText, context),
              judgeRetry,
              deadline,
            );
            return {
              run: judgeRun,
              g: grade,
              latency_s: judgeLatencySeconds,
            };
          })(),
          args.timeoutS,
          `${caseId.id} rep${replicate}`,
        );
        const resultRow = {
          prompt_id: safeId,
          rep: replicate,
          prompt: caseId.prompt ?? caseId.input ?? caseId.id,
          tags: caseId.tags,
          attachments: caseId.attachments,
          meta:
            safeId !== String(caseId.id) || appRetry.count || judgeRetry.count
              ? {
                  ...(caseId.meta ?? {}),
                  ...(safeId !== String(caseId.id)
                    ? {
                        original_id: String(caseId.id),
                      }
                    : {}),
                  ...(appRetry.count
                    ? {
                        retries: appRetry.count,
                      }
                    : {}),
                  ...(judgeRetry.count
                    ? {
                        judge_retries: judgeRetry.count,
                      }
                    : {}),
                }
              : caseId.meta,
          model: runResult.model,
          usage: runResult.usage,
          stop_reason: runResult.stop_reason,
          // The report keys on `status`, not stop_reason: a clipped answer is
          // counted and shown but kept out of the means. runCase may set
          // run.status to override the max_tokens rule.
          status: runResult.status ?? (runResult.stop_reason === "max_tokens" ? "truncated" : "ok"),
          judge_model: grade.judge_model ?? runResult.judge_model,
          judge_usage: grade.judge_usage ?? runResult.judge_usage,
          latency_s: latencySeconds,
          ...perfFrom(runResult),
          grade: grade.grade,
          explanation: grade.explanation,
        };
        appendFileNoFollow(resultsPath, JSON.stringify(resultRow) + "\n");
        rowWritten = true; // past this point the attempt is scored - a later throw (trace write, ref freeze) must not also append an error row
        if (runResult.transcript)
          writeFileNoFollow(
            join(variantDir, "traces", `${safeId}_rep${replicate}.json`),
            JSON.stringify(runResult.transcript, null, 2),
          );
        // For pairwise: on the baseline run, freeze the reference output once.
        if (
          args.variant === "baseline" &&
          runResult.output != null &&
          !REF_EXTS.some((extension) => lexists(join(refDir, safeId) + extension))
        ) {
          mkdirNoFollow(refDir);
          writeFileNoFollow(
            join(refDir, safeId),
            typeof runResult.output === "string" ? runResult.output : JSON.stringify(runResult.output),
          );
        }
        okCount++;
      } catch (error) {
        failCount++;
        if (rowWritten) {
          // The attempt scored; only a post-row write (trace, ref) failed. An error
          // row here would double-count the billed usage under the budget rule.
          eprint(
            `  [${args.variant}] ${caseId.id} rep${replicate} scored, but a post-row write failed: ${error?.message || error}`,
          );
          continue;
        }
        // Failed attempts are data too - but they must not occupy the (case, rep)
        // slot in results.jsonl, or resume would never re-run them.
        appendFileNoFollow(
          errorsPath,
          JSON.stringify({
            prompt_id: safeId,
            rep: replicate,
            ...(safeId !== String(caseId.id)
              ? {
                  original_id: String(caseId.id),
                }
              : {}),
            failure_class: error?.failure_class ?? "error",
            error: String(error?.message || error),
            retries: appRetry.count,
            judge_retries: judgeRetry.count,
            // Billed-but-failed spend stays countable: when the app call completed
            // before the failure (e.g. a served-model mismatch, a judge-stage
            // ceiling), carry its identity and usage on the error row.
            model: lastRun?.model,
            usage: lastRun?.usage,
            judge_model: error?.judge_model ?? lastRun?.judge_model,
            judge_usage: error?.judge_usage ?? lastRun?.judge_usage,
            latency_s: (Date.now() - startTime) / 1000,
          }) + "\n",
        );
        eprint(`  [${args.variant}] ${caseId.id} rep${replicate} FAILED: ${error?.message || error}`);
      }
    }
  }
  // One progress line every 30s (and to <vdir>/progress.txt) so "how far along
  // is it?" is answerable from the background shell's output or one file read,
  // without the orchestrator parsing results.jsonl mid-write. ETA is a plain
  // rate extrapolation from this pass.
  const startTime = Date.now();
  const progress = () => {
    const finished = okCount + failCount;
    const total = tasks.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const etaText = finished ? Math.round((elapsed / finished) * (total - finished)) : null;
    const line =
      `[${args.variant}] ${finished}/${total} done (${okCount} ok, ${failCount} failed), ` +
      `${Math.round(elapsed)}s elapsed` +
      (etaText != null ? `, ~${etaText}s left` : "");
    eprint(line);
    try {
      writeFileNoFollow(join(variantDir, "progress.txt"), line + "\n");
    } catch {}
  };
  const tick = setInterval(progress, 30_000);
  workersStarted = true;
  await Promise.all(
    Array.from(
      {
        length: Math.max(1, args.concurrency),
      },
      worker,
    ),
  );
  clearInterval(tick);
  progress();
  eprint(`[${args.variant}] done - ${okCount} ok, ${failCount} failed -> ${resultsPath}`);
  process.exit(failCount ? 1 : 0);
}
//@ runner-scaffold-q2rf9gg9.mjs:32838-32865 placement
let workersStarted = false;
//@ runner-scaffold-q2rf9gg9.mjs:32866-33141 placement
main().catch((e) => {
  const m = String(e?.message || e);
  if (workersStarted) {
    eprint("stopped mid-run (rows already written are kept; re-run to resume): " + m);
    process.exit(1);
  }
  eprint(m.startsWith("refusing to ") ? m : "refusing to run: " + m);
  process.exit(2);
});
