/**
 * skills/bundled/hillclimb/build-report-lite.mjs
 *
 * 2.1.316 新增。hillclimb skill 的轻量报告构建脚本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: build-report-lite-jwtbvm49.mjs (29)
 * attribution: placement 28, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  constants as FS,
  lstatSync,
  openSync,
  fstatSync,
  readFileSync,
  closeSync,
  realpathSync,
  ftruncateSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { isAbsolute, join, dirname, resolve } from "node:path";
import { WIN } from "../../../constants/prompts.js";

//@ build-report-lite-jwtbvm49.mjs:1316-1379 placement
const isNum = (x) => typeof x === "number" && Number.isFinite(x);
//@ build-report-lite-jwtbvm49.mjs:2195-2236 affinity
/**
 * Windows 上为 0，否则 fs.constants.O_NOFOLLOW。属于 build-report-lite 脚本，不属于提示词模块。
 */
const NOFOLLOW = WIN ? 0 : FS.O_NOFOLLOW;
//@ build-report-lite-jwtbvm49.mjs:2396-2534 placement
const isSymlink = (filePath) => {
  try {
    return lstatSync(filePath).isSymbolicLink();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
};
//@ build-report-lite-jwtbvm49.mjs:2655-2683 placement
const skippedHardLinks = [];
//@ build-report-lite-jwtbvm49.mjs:2684-3210 placement
/**
 * 不跟随符号链接地读取文本文件，拒绝硬链接等异常情况，失败返回空字符串。
 */
const readText = (filePath) => {
  let fileHandle;
  try {
    if (WIN && isSymlink(filePath)) return "";
    fileHandle = openSync(filePath, FS.O_RDONLY | NOFOLLOW);
    const fileStat = fstatSync(fileHandle);
    // O_NOFOLLOW and lstat cannot see a hard link (a second name for a file
    // outside the flow dir); nothing in a flow dir needs one, so read nothing.
    if (!fileStat.isFile()) return "";
    if (fileStat.nlink > 1) {
      skippedHardLinks.push(filePath);
      return "";
    }
    return readFileSync(fileHandle, "utf8");
  } catch {
    return "";
  } finally {
    if (fileHandle !== undefined) closeSync(fileHandle);
  }
};
//@ build-report-lite-jwtbvm49.mjs:3839-4144 placement
/**
 * 确认目录真实路径位于输出根目录之内，否则抛错拒绝写入。
 */
function assertContained(dir, root) {
  if (root == null) throw new Error("refusing to write: output root not resolved");
  const dirReal = realpathSync(dir);
  if (dirReal !== root && !dirReal.startsWith(root + (WIN ? "\\" : "/")))
    throw new Error("refusing to write outside " + root + ": " + dir);
}
//@ build-report-lite-jwtbvm49.mjs:4965-6030 placement
/**
 * 解析并钉住输出根目录：拒绝 . / .. 段、相对路径中任一祖先是符号链接或根本身是符号链接，返回 realpath。
 */
function resolveOutputRoot(root) {
  // Only Windows treats `\` as a separator; on POSIX it is a filename byte, so
  // splitting on it would walk prefixes that are not real path components.
  root = String(root).replace(WIN ? /(.)[\\/]+$/ : /(.)\/+$/, "$1");
  const segments = root.split(WIN ? /[\\/]/ : "/");
  // A `.`/`..` segment (e.g. a trailing `/.`) makes the leaf lstat below
  // follow a planted link at the flow root, and the absolute branch skips the
  // ancestor walk. Refuse dot segments outright.
  if (segments.some((segment) => segment === "." || segment === ".."))
    throw new Error("refusing to write into " + root + ": '.'/'..' path segment");
  if (!isAbsolute(root)) {
    let walk = "";
    for (const segmentPart of segments.filter(Boolean).slice(0, -1)) {
      walk = walk ? join(walk, segmentPart) : segmentPart;
      if (isSymlink(walk))
        throw new Error("refusing to write into " + root + ": ancestor " + walk + " is a symlink");
    }
  }
  if (isSymlink(root)) throw new Error("refusing to write into " + root + ": it is a symlink");
  return realpathSync(root);
}
//@ build-report-lite-jwtbvm49.mjs:6031-7026 placement
/**
 * 不跟随符号链接地写文件：父目录不得是链接且须在输出根内，打开后确认是普通文件且没有多个硬链接，检查通过后才截断写入。
 */
function writeNoFollow(filePath, data, root) {
  if (isSymlink(dirname(filePath)))
    throw new Error("refusing to write through symlinked directory: " + dirname(filePath));
  assertContained(dirname(filePath), root);
  if (WIN && isSymlink(filePath)) throw new Error("refusing to write through symlink: " + filePath);
  // Opened without O_TRUNC and truncated only after the checks, so a refused
  // file keeps its bytes.
  const fileHandle = openSync(filePath, FS.O_WRONLY | FS.O_CREAT | NOFOLLOW, 0o644);
  try {
    const fileStat = fstatSync(fileHandle);
    if (!fileStat.isFile()) throw new Error("refusing to write to non-regular file: " + filePath);
    if (fileStat.nlink > 1)
      throw new Error(
        "refusing to write to " +
          filePath +
          ": it has a second hard link (another name for the same file); replace it with a plain copy if it is yours",
      );
    ftruncateSync(fileHandle, 0);
    // writeFileSync on the fd loops until every byte lands (a bare writeSync
    // is one write(2) that may return short on ENOSPC and silently truncate).
    writeFileSync(fileHandle, data);
  } finally {
    closeSync(fileHandle);
  }
}
//@ build-report-lite-jwtbvm49.mjs:7027-7296 placement
function mkdirNoFollow(dir, root) {
  if (isSymlink(dir)) throw new Error("refusing to use symlinked directory: " + dir);
  mkdirSync(dir, {
    recursive: true,
  });
  // Check after creating: mkdirSync(recursive) follows symlinked ancestors.
  assertContained(dir, root);
}
//@ build-report-lite-jwtbvm49.mjs:7297-7394 placement
const readJSON = (filePath, dflt) => {
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return dflt;
  }
};
//@ build-report-lite-jwtbvm49.mjs:7647-7736 placement
const ESC_SEQ = /\x1b\[[0-?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[@-_]/g;
//@ build-report-lite-jwtbvm49.mjs:7737-7777 placement
const CONTROL = /[\x00-\x1f\x7f-\x9f]/g;
//@ build-report-lite-jwtbvm49.mjs:7778-7852 placement
const termSafe = (text) => String(text).replace(ESC_SEQ, "").replace(CONTROL, "");
//@ build-report-lite-jwtbvm49.mjs:7853-7912 placement
const eprint = (...args) => console.error(...args.map(termSafe));
//@ build-report-lite-jwtbvm49.mjs:7913-8051 placement
/**
 * HTML 转义（& < > " '）。
 */
const esc = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
//@ build-report-lite-jwtbvm49.mjs:8052-8101 placement
const fmt = (x) => (x == null ? "" : x.toFixed(3));
//@ build-report-lite-jwtbvm49.mjs:8432-8561 placement
const tsvCell = (text) => {
  const flat = String(text).replace(/[\t\n\r]/g, " ");
  return /^[=+\-@]/.test(flat) ? "'" + flat : flat;
};
//@ build-report-lite-jwtbvm49.mjs:8632-8928 placement
function discoverVariants(flowDir) {
  const names = readdirSync(flowDir, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory() && /^(baseline|v\d+)$/.test(entry.name))
    .map((entry) => entry.name);
  const rank = (name) => (name === "baseline" ? -1 : +name.slice(1));
  return names.sort((left, right) => rank(left) - rank(right));
}
//@ build-report-lite-jwtbvm49.mjs:9046-9377 placement
/**
 * 把评分结果规范为数值字典：对象取数值或布尔字段，布尔值转为 score。
 */
function coerceScores(grade) {
  if (grade && typeof grade === "object" && !Array.isArray(grade)) {
    const scores = {};
    for (const [key, value] of Object.entries(grade))
      if (isNum(value) || typeof value === "boolean") scores[key] = +value;
    return scores;
  }
  if (typeof grade === "boolean")
    return {
      score: grade ? 1 : 0,
    };
  if (isNum(grade))
    return {
      score: grade,
    };
  return {};
}
//@ build-report-lite-jwtbvm49.mjs:9379-10000 placement
/**
 * 读取 results.jsonl，按用例 id 分组为行记录，解析失败的行记入警告。
 */
function loadRows(resultsPath, warnings, variant) {
  // Keyed by data-supplied ids: null-prototype so '__proto__' is a key, not a crash.
  const byId = Object.create(null);
  readText(resultsPath)
    .split("\n")
    .forEach((line, lineNumber) => {
      line = line.trim();
      if (!line) return;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        warnings.push(variant + "/results.jsonl:" + (lineNumber + 1) + ": malformed JSON, skipped");
        return;
      }
      const promptId = String(row.prompt_id ?? row.id ?? row.case_id ?? "");
      if (!promptId) {
        warnings.push(variant + "/results.jsonl:" + (lineNumber + 1) + ": no prompt_id, skipped");
        return;
      }
      (byId[promptId] ||= []).push(row);
    });
  return byId;
}
//@ build-report-lite-jwtbvm49.mjs:10002-10391 placement
/**
 * 统计 errors.jsonl 中的错误总数及按类别计数。
 */
function countErrors(variantDir) {
  let total = 0;
  const byClass = Object.create(null);
  for (const line of readText(join(variantDir, "errors.jsonl")).split("\n")) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    total++;
    const failureClass = String(record?.failure_class ?? "error");
    byClass[failureClass] = (byClass[failureClass] || 0) + 1;
  }
  return {
    total,
    byClass,
  };
}
//@ build-report-lite-jwtbvm49.mjs:10555-11173 placement
/**
 * 从所有变体的结果中推断出现过的指标名及其类型。
 */
function inferMetrics(rows, variants) {
  const seen = new Map();
  for (const variant of variants)
    for (const reps of Object.values(rows[variant]))
      for (const row of reps) {
        const explanation = row.explanation && typeof row.explanation === "object" ? row.explanation : {};
        for (const [metricId, value] of Object.entries(coerceScores(row.grade))) {
          const metric = seen.get(metricId) || {
            binary: true,
            judge: false,
          };
          if (value !== 0 && value !== 1) metric.binary = false;
          if (metricId in explanation) metric.judge = true;
          seen.set(metricId, metric);
        }
      }
  return [...seen.entries()].map(([metricId, metric]) => ({
    id: metricId,
    kind: metric.judge ? "judge" : metric.binary ? "binary" : "float",
  }));
}
//@ build-report-lite-jwtbvm49.mjs:11175-20623 placement
/**
 * 读取 hillclimb 流程目录：发现 baseline/vN 变体目录（命名不符的目录给出警告），读 _state.json 的 train/val/test 划分、各变体 results.jsonl 与 errors.jsonl、traces 链接（经符号链接的不链接），汇总每个用例与指标的得分，写出 trajectory/scores.tsv 与 report.html。
 */
function build(flowArg) {
  const flow = resolve(flowArg);
  if (
    !statSync(flow, {
      throwIfNoEntry: false,
    })?.isDirectory()
  )
    throw new Error("not a directory: " + flow);
  // Pinned from the path as the caller named it, so the relative-ancestor
  // walk in resolveOutputRoot applies (resolve() would skip it).
  const flowRoot = resolveOutputRoot(flowArg);
  const variants = discoverVariants(flow);
  if (!variants.length) throw new Error("no variant directories (baseline/, v1/, ...) under " + flow);
  const warnings = [];
  // Same warning the full builder gives: a mis-named variant dir is the usual
  // reason the header shows one variant fewer than expected.
  const nonVariantDirNames = new Set([
    "trajectory",
    "attachments",
    "refs",
    "ref",
    "inputs",
    "out",
    "target",
    "__pycache__",
  ]);
  for (const entry of readdirSync(flow, {
    withFileTypes: true,
  }))
    if (
      entry.isDirectory() &&
      !variants.includes(entry.name) &&
      !nonVariantDirNames.has(entry.name) &&
      !entry.name.startsWith(".") &&
      !entry.name.startsWith("_")
    )
      warnings.push(
        "ignored directory '" +
          entry.name +
          "/' - variant dirs must be named 'baseline' or 'v<N>'; put the descriptive name in change.md's first line instead",
      );
  const state = readJSON(join(flow, "_state.json"), {}) || {};
  const splitOf = Object.create(null);
  for (const splitName of ["train", "val", "test"]) {
    const splitIds = state[splitName + "_ids"];
    if (splitIds == null) continue;
    if (!Array.isArray(splitIds)) {
      warnings.push("_state.json " + splitName + "_ids is not a list - ignored");
      continue;
    }
    for (const promptId of splitIds) splitOf[String(promptId)] = splitName;
  }
  const rows = Object.create(null);
  for (const variant of variants)
    rows[variant] = loadRows(join(flow, variant, "results.jsonl"), warnings, variant);

  // Trace links are emitted only for a real traces/ directory that resolves
  // inside the pinned flow root: the per-file lstat below refuses a symlinked
  // trace but silently resolves a symlinked traces/ (or variant) directory,
  // which would link files from wherever it points into the report.
  const traceDirOk = Object.create(null);
  for (const variant of variants) {
    const traceDir = join(flow, variant, "traces");
    try {
      if (isSymlink(join(flow, variant)) || isSymlink(traceDir)) {
        warnings.push(variant + "/traces is reached through a symlink - trace links omitted");
        traceDirOk[variant] = false;
      } else {
        const resolvedTraceDir = realpathSync(traceDir);
        traceDirOk[variant] = resolvedTraceDir.startsWith(flowRoot + (WIN ? "\\" : "/"));
      }
    } catch {
      traceDirOk[variant] = false;
    }
  }

  // Same as the full builder: drop non-baseline variants with zero result
  // rows (a vN/ holding only change.md while the run warms up would render a
  // blank column), and refuse to build when the first variant itself has none
  // rather than overwrite a good trajectory/scores.tsv with a header-only file.
  for (let index = variants.length - 1; index > 0; index--) {
    const variant = variants[index];
    if (Object.keys(rows[variant]).length) continue;
    warnings.push(variant + ": zero result rows - dropping (run not started or results.jsonl missing/empty)");
    variants.splice(index, 1);
  }
  if (!Object.keys(rows[variants[0]]).length)
    throw new Error(
      variants[0] +
        "/ has no result rows under " +
        flow +
        " - nothing to report" +
        (skippedHardLinks.length
          ? " (not read, second hard link: " +
            skippedHardLinks.map((hardLinkPath) => hardLinkPath.slice(flow.length + 1)).join(", ") +
            " - replace with plain copies if they are yours)"
          : ""),
    );
  const header = Object.create(null);
  for (const variant of variants) {
    const variantDir = join(flow, variant);
    const changeText =
      readText(join(variantDir, "change.md"))
        .split("\n")
        .find((line) => line.trim()) || "";
    const summary = readJSON(join(variantDir, "summary.json"), {}) || {};
    // Model: summary.json wins, else the most common row.model (what the app called).
    const modelTally = Object.create(null);
    for (const reps of Object.values(rows[variant]))
      for (const row of reps)
        if (typeof row.model === "string") modelTally[row.model] = (modelTally[row.model] || 0) + 1;
    const rowModel = Object.entries(modelTally).sort((left, right) => right[1] - left[1])[0]?.[0] || "";
    header[variant] = {
      change: changeText.replace(/^#+\s*/, ""),
      model: summary.model || rowModel,
      errors: countErrors(variantDir),
    };
  }

  // Metrics: _state.json `metrics` (or the legacy `criteria` key) wins,
  // keeping each declared `kind`; else inferred from grade keys. Primary is
  // the first declared-or-inferred binary metric, else the first - the same
  // selection the full builder's lib/adapter.mjs makes, so both builders
  // report the same metric's numbers on the same flow.
  const metricsCfg = state.metrics || state.criteria;
  const declaredMetrics = (Array.isArray(metricsCfg) ? metricsCfg : [])
    .map((metric) =>
      typeof metric === "string"
        ? {
            id: metric,
          }
        : {
            id: metric?.id,
            kind: metric?.kind,
          },
    )
    .filter((metric) => metric.id);
  const metrics = declaredMetrics.length ? declaredMetrics : inferMetrics(rows, variants);
  if (!metrics.length)
    metrics.push({
      id: "score",
      kind: "float",
    });
  const binaryMetric = (metrics.find((metric) => metric.kind === "binary") || metrics[0]).id;

  // Cases: union of ids across variants, in first-seen order.
  const caseIds = [];
  const seenIds = new Set();
  for (const variant of variants)
    for (const promptId of Object.keys(rows[variant]))
      if (!seenIds.has(promptId)) {
        seenIds.add(promptId);
        caseIds.push(promptId);
      }
  const okReps = (reps) => reps.filter((row) => row.status == null || row.status === "ok");
  const caseMean = (reps, metricId) => {
    const vals = okReps(reps)
      .map((row) => coerceScores(row.grade)[metricId])
      .filter(isNum);
    return vals.length ? vals.reduce((sum, value) => sum + value, 0) / vals.length : null;
  };
  const cases = caseIds.map((promptId) => {
    const first = variants.map((variant) => rows[variant][promptId]?.[0]).find(Boolean) || {};
    const tags = Array.isArray(first.tags) ? first.tags.map(String) : [];
    const perCase = {};
    for (const variant of variants) {
      const reps = rows[variant][promptId] || [];
      perCase[variant] = {
        mean: caseMean(reps, binaryMetric),
        reps: reps.length,
        truncated: reps.filter((row) => row.status === "truncated").length,
        traces: reps
          .map((row, caseId) => {
            // Link only to files directly inside this variant's traces/ dir:
            // ids and reps come from results.jsonl (data, not trusted), so the
            // composed path must not resolve anywhere else, and a symlinked
            // trace must not become a link out of the tree. Keep the rep
            // number so the link label matches the file it points at even when
            // earlier reps have no trace. For rep 0 also accept the flat
            // traces/<id>.json a single-rep runner may write (the full builder
            // reads it as rep 0 too).
            // The href is resolved by a browser with URL semantics, not the
            // filesystem's: allowlist the id to the scaffold's path-safe
            // charset (so `#`, `?`, `\\`, `%` and separators never reach the
            // link) and require an integer rep, on top of the traceDirOk
            // resolved-path check above and the lexical one below.
            if (!traceDirOk[variant]) return null;
            const traceRep = row.rep ?? caseId;
            if (!/^[A-Za-z0-9_.-]+$/.test(promptId) || /^\.+$/.test(promptId)) return null;
            if (!Number.isInteger(+traceRep) || +traceRep < 0) return null;
            const stems =
              +traceRep === 0 ? [promptId + "_rep" + traceRep, promptId] : [promptId + "_rep" + traceRep];
            for (const stem of stems) {
              const relPath = variant + "/traces/" + stem + ".json";
              const absPath = resolve(flow, relPath);
              if (dirname(absPath) !== join(flow, variant, "traces")) return null;
              // A hard-linked trace is no more ours than a symlinked one.
              const entries = lstatSync(absPath, {
                throwIfNoEntry: false,
              });
              if (entries?.isFile() && !(entries.nlink > 1))
                return {
                  rep: traceRep,
                  rel: relPath,
                };
            }
            return null;
          })
          .filter(Boolean),
      };
    }
    return {
      id: promptId,
      split: splitOf[promptId] || "",
      tags,
      prompt: String(first.prompt ?? ""),
      per: perCase,
    };
  });

  // Per-variant aggregate: mean over cases that have a value, per split.
  const aggregate = {};
  for (const variant of variants) {
    const allRows = cases.map((caseId) => caseId.per[variant].mean).filter(isNum);
    const testIds = cases
      .filter((caseId) => caseId.split === "test")
      .map((caseId) => caseId.per[variant].mean)
      .filter(isNum);
    const metric = (values) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    aggregate[variant] = {
      all: metric(allRows),
      n: allRows.length,
      test: metric(testIds),
      nTest: testIds.length,
      truncated: cases.reduce((sum, value) => sum + value.per[variant].truncated, 0),
    };
  }

  // trajectory/scores.tsv - same shape as the full builder.
  mkdirNoFollow(join(flow, "trajectory"), flowRoot);
  const tsvLines = [["id", "split", ...variants].join("\t")];
  for (const caseId of cases)
    tsvLines.push(
      [
        tsvCell(caseId.id),
        tsvCell(caseId.split || "all"),
        ...variants.map((variant) => fmt(caseId.per[variant].mean)),
      ].join("\t"),
    );
  writeNoFollow(join(flow, "trajectory", "scores.tsv"), tsvLines.join("\n") + "\n", flowRoot);

  // _state.json's `best` is {round, test_score}; map the round to a variant
  // name the way the full builder does (0 = baseline), and drop it when the
  // named variant isn't on disk.
  let best = null;
  if (Number.isInteger(state.best?.round)) {
    best = state.best.round === 0 ? "baseline" : "v" + state.best.round;
    if (!variants.includes(best)) best = null;
  }
  for (const entryPath of new Set(skippedHardLinks))
    warnings.push(
      entryPath.slice(flow.length + 1) +
        " has a second hard link - not read; replace it with a plain copy if it is yours",
    );
  const html = render({
    flow,
    variants,
    header,
    agg: aggregate,
    cases,
    primary: binaryMetric,
    metrics: metrics.map((metric) => metric.id),
    warnings,
    best,
  });
  writeNoFollow(join(flow, "report.html"), html, flowRoot);
  return {
    variants: variants.length,
    cases: cases.length,
    warnings,
  };
}
//@ build-report-lite-jwtbvm49.mjs:20625-24431 placement
/**
 * 把汇总结果渲染为单文件 HTML 报告：变体概览表（得分、错误分类计数）、每个用例在各变体上的指标、警告列表；所有数据值经 HTML 转义。
 */
function render({
  flow,
  variants,
  header,
  agg: aggregate,
  cases,
  primary: primaryMetric,
  metrics,
  warnings,
  best: bestRow,
}) {
  const hasSplit = cases.some((caseId) => caseId.split);
  const hasTestIds = variants.some((variant) => aggregate[variant].nTest > 0);
  const tableHead = (label, sortKey) => '<th data-k="' + esc(sortKey) + '">' + esc(label) + "</th>";
  const variantRows = variants
    .map((variant) => {
      const thead = header[variant];
      const aggregateForVariant = aggregate[variant];
      const readError = thead.errors.total
        ? thead.errors.total +
          " (" +
          Object.entries(thead.errors.byClass)
            .map(([sortKey, headerEntry]) => esc(sortKey) + " " + headerEntry)
            .join(", ") +
          ")"
        : "0";
      return (
        "<tr" +
        (bestRow === variant ? ' class="best"' : "") +
        "><td>" +
        esc(variant) +
        (bestRow === variant ? ' <span class="pill">best</span>' : "") +
        "</td>" +
        "<td>" +
        esc(thead.change) +
        "</td><td>" +
        esc(thead.model) +
        "</td>" +
        '<td class="num">' +
        fmt(aggregateForVariant.all) +
        '</td><td class="num">' +
        aggregateForVariant.n +
        "</td>" +
        (hasTestIds
          ? '<td class="num">' +
            fmt(aggregateForVariant.test) +
            '</td><td class="num">' +
            aggregateForVariant.nTest +
            "</td>"
          : "") +
        '<td class="num">' +
        aggregateForVariant.truncated +
        "</td><td>" +
        readError +
        "</td></tr>"
      );
    })
    .join("\n");
  const caseRows = cases
    .map((caseId) => {
      const cells = variants
        .map((variant) => {
          const cell = caseId.per[variant];
          const traceLinks = cell.traces
            .map((trace) => '<a href="' + esc(trace.rel) + '">rep' + esc(trace.rep) + "</a>")
            .join(" ");
          return (
            '<td class="num" data-v="' +
            fmt(cell.mean) +
            '">' +
            fmt(cell.mean) +
            (cell.truncated ? ' <span class="pill warn">' + cell.truncated + " truncated</span>" : "") +
            (traceLinks ? '<div class="links">' + traceLinks + "</div>" : "") +
            "</td>"
          );
        })
        .join("");
      const promptText = caseId.prompt.length > 600 ? caseId.prompt.slice(0, 600) + "..." : caseId.prompt;
      return (
        '<tr><td class="id">' +
        esc(caseId.id) +
        "</td>" +
        (hasSplit ? "<td>" + esc(caseId.split) + "</td>" : "") +
        "<td>" +
        caseId.tags.map((cell) => '<span class="pill">' + esc(cell) + "</span>").join(" ") +
        "</td>" +
        cells +
        '<td class="prompt"><details><summary>' +
        esc(promptText.split("\n")[0].slice(0, 80)) +
        "</summary><pre>" +
        esc(promptText) +
        "</pre></details></td></tr>"
      );
    })
    .join("\n");
  const warningList = warnings.length
    ? '<section class="warnings"><h2>Warnings</h2><ul>' +
      warnings.map((warning) => "<li>" + esc(warning) + "</li>").join("") +
      "</ul></section>"
    : "";
  return (
    '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>" +
    esc(flow.split(/[\\/]/).pop()) +
    " - eval report</title>" +
    "<style>" +
    CSS_TEXT +
    "</style></head><body>" +
    "<header><h1>" +
    esc(flow.split(/[\\/]/).pop()) +
    "</h1>" +
    '<p class="meta">' +
    variants.length +
    " variant" +
    (variants.length === 1 ? "" : "s") +
    " &middot; " +
    cases.length +
    " cases" +
    " &middot; primary metric <code>" +
    esc(primaryMetric) +
    "</code>" +
    (metrics.length > 1
      ? " (also: " +
        metrics
          .filter((metric) => metric !== primaryMetric)
          .map(esc)
          .join(", ") +
        ")"
      : "") +
    " &middot; generated " +
    new Date().toISOString().slice(0, 19).replace("T", " ") +
    " UTC" +
    " &middot; lite report (no transcripts inlined; click rep links)</p></header>" +
    "<section><h2>Variants</h2><table><thead><tr>" +
    tableHead("variant", "s") +
    tableHead("change", "s") +
    tableHead("model", "s") +
    tableHead("mean " + primaryMetric, "n") +
    tableHead("cases", "n") +
    (hasTestIds ? tableHead("test mean", "n") + tableHead("test cases", "n") : "") +
    tableHead("truncated", "n") +
    tableHead("failed attempts", "s") +
    "</tr></thead><tbody>" +
    variantRows +
    "</tbody></table></section>" +
    '<section><h2>Cases</h2><p class="hint">Click a column header to sort. Per-case values are the mean of <code>' +
    esc(primaryMetric) +
    "</code> over status-ok reps.</p>" +
    '<table id="cases"><thead><tr>' +
    tableHead("id", "s") +
    (hasSplit ? tableHead("split", "s") : "") +
    tableHead("tags", "s") +
    variants.map((variant) => tableHead(variant, "n")).join("") +
    tableHead("prompt", "s") +
    "</tr></thead><tbody>" +
    caseRows +
    "</tbody></table></section>" +
    warningList +
    "<script>" +
    SORT_JS +
    "</script></body></html>\n"
  );
}
//@ build-report-lite-jwtbvm49.mjs:24433-25885 placement
const CSS_TEXT = [
  ":root{color-scheme:light dark;--fg:#1a1a1a;--bg:#fff;--muted:#666;--line:#ddd;--pill:#eee;--warn:#b45309;--best:#ecfdf5}",
  "@media(prefers-color-scheme:dark){:root{--fg:#e6e6e6;--bg:#121212;--muted:#9a9a9a;--line:#333;--pill:#2a2a2a;--warn:#f59e0b;--best:#0f2a1f}}",
  "body{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--fg);background:var(--bg);margin:0;padding:24px;max-width:1400px}",
  "h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}.meta,.hint{color:var(--muted);margin:0 0 8px}",
  "table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}",
  'th{cursor:pointer;user-select:none;white-space:nowrap}th.asc:after{content:" \\25B4"}th.desc:after{content:" \\25BE"}',
  "td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}td.id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}",
  ".pill{display:inline-block;background:var(--pill);border-radius:10px;padding:0 8px;font-size:12px}.pill.warn{color:var(--warn)}",
  "tr.best td{background:var(--best)}.links{font-size:12px}.links a{margin-right:6px}",
  "td.prompt{max-width:520px}details summary{cursor:pointer;color:var(--muted)}pre{white-space:pre-wrap;font-size:12px;margin:6px 0 0}",
  ".warnings{color:var(--warn)}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}",
].join("");
//@ build-report-lite-jwtbvm49.mjs:25887-26791 placement
const SORT_JS = [
  'document.querySelectorAll("th[data-k]").forEach(function(th){th.addEventListener("click",function(){',
  'var t=th.closest("table"),tb=t.tBodies[0],i=Array.prototype.indexOf.call(th.parentNode.children,th);',
  'var asc=!th.classList.contains("asc");t.querySelectorAll("th").forEach(function(h){h.classList.remove("asc","desc")});',
  'th.classList.add(asc?"asc":"desc");var num=th.dataset.k==="n";',
  "var rows=Array.prototype.slice.call(tb.rows);rows.sort(function(a,b){var x=a.cells[i],y=b.cells[i];",
  'var u=num?parseFloat("v" in x.dataset?x.dataset.v:x.textContent):x.textContent.trim().toLowerCase();',
  'var w=num?parseFloat("v" in y.dataset?y.dataset.v:y.textContent):y.textContent.trim().toLowerCase();',
  "if(num){if(isNaN(u))u=-Infinity;if(isNaN(w))w=-Infinity}return (u<w?-1:u>w?1:0)*(asc?1:-1)});",
  "rows.forEach(function(r){tb.appendChild(r)})})});",
].join("");
//@ build-report-lite-jwtbvm49.mjs:26793-26821 placement
const arg = process.argv[2];
//@ build-report-lite-jwtbvm49.mjs:26822-26993 placement
if (!arg || arg === "-h" || arg === "--help") {
  eprint("usage: node build-report-lite.mjs <flow-dir>   (e.g. .claude/hillclimb/<flow>/)");
  process.exit(arg ? 0 : 2);
}
//@ build-report-lite-jwtbvm49.mjs:26994-27328 placement
try {
  const { variants, cases, warnings } = build(arg);
  for (const warning of warnings) eprint("warning: " + warning);
  eprint(
    "wrote " +
      join(resolve(arg), "report.html") +
      " (" +
      variants +
      " variants, " +
      cases +
      " cases) and trajectory/scores.tsv",
  );
} catch (error) {
  eprint("build-report-lite: " + (error?.message || error));
  process.exit(1);
}
