/**
 * skills/bundled/hillclimb/build-report-lite.mjs
 *
 * 2.1.316 新增。hillclimb skill 的轻量报告构建脚本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: build-report-lite-jwtbvm49.mjs (29)
 * attribution: placement 28, affinity 1
 */
import {
  constants,
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
/**
 * Windows 上为 0，否则 fs.constants.O_NOFOLLOW。属于 build-report-lite 脚本，不属于提示词模块。
 */
//@ build-report-lite-jwtbvm49.mjs:2195-2236 affinity
const NOFOLLOW = WIN ? 0 : constants.O_NOFOLLOW;
//@ build-report-lite-jwtbvm49.mjs:2396-2534 placement
const isSymlink = (p) => {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
};
//@ build-report-lite-jwtbvm49.mjs:2655-2683 placement
const skippedHardLinks = [];
/**
 * 不跟随符号链接地读取文本文件，拒绝硬链接等异常情况，失败返回空字符串。
 */
//@ build-report-lite-jwtbvm49.mjs:2684-3210 placement
const readText = (p) => {
  let fd;
  try {
    if (WIN && isSymlink(p)) return "";
    fd = openSync(p, constants.O_RDONLY | NOFOLLOW);
    const st = fstatSync(fd);
    // O_NOFOLLOW and lstat cannot see a hard link (a second name for a file
    // outside the flow dir); nothing in a flow dir needs one, so read nothing.
    if (!st.isFile()) return "";
    if (st.nlink > 1) {
      skippedHardLinks.push(p);
      return "";
    }
    return readFileSync(fd, "utf8");
  } catch {
    return "";
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
};
/**
 * 确认目录真实路径位于输出根目录之内，否则抛错拒绝写入。
 */
//@ build-report-lite-jwtbvm49.mjs:3839-4144 placement
function assertContained(dir, root) {
  if (root == null) throw new Error("refusing to write: output root not resolved");
  const dirReal = realpathSync(dir);
  if (dirReal !== root && !dirReal.startsWith(root + (WIN ? "\\" : "/")))
    throw new Error("refusing to write outside " + root + ": " + dir);
}
/**
 * 解析并钉住输出根目录：拒绝 . / .. 段、相对路径中任一祖先是符号链接或根本身是符号链接，返回 realpath。
 */
//@ build-report-lite-jwtbvm49.mjs:4965-6030 placement
function resolveOutputRoot(root) {
  // Only Windows treats `\` as a separator; on POSIX it is a filename byte, so
  // splitting on it would walk prefixes that are not real path components.
  root = String(root).replace(WIN ? /(.)[\\/]+$/ : /(.)\/+$/, "$1");
  const parts = root.split(WIN ? /[\\/]/ : "/");
  // A `.`/`..` segment (e.g. a trailing `/.`) makes the leaf lstat below
  // follow a planted link at the flow root, and the absolute branch skips the
  // ancestor walk. Refuse dot segments outright.
  if (parts.some((seg) => seg === "." || seg === ".."))
    throw new Error("refusing to write into " + root + ": '.'/'..' path segment");
  if (!isAbsolute(root)) {
    let walk = "";
    for (const part of parts.filter(Boolean).slice(0, -1)) {
      walk = walk ? join(walk, part) : part;
      if (isSymlink(walk))
        throw new Error("refusing to write into " + root + ": ancestor " + walk + " is a symlink");
    }
  }
  if (isSymlink(root)) throw new Error("refusing to write into " + root + ": it is a symlink");
  return realpathSync(root);
}
/**
 * 不跟随符号链接地写文件：父目录不得是链接且须在输出根内，打开后确认是普通文件且没有多个硬链接，检查通过后才截断写入。
 */
//@ build-report-lite-jwtbvm49.mjs:6031-7026 placement
function writeNoFollow(p, data, root) {
  if (isSymlink(dirname(p))) throw new Error("refusing to write through symlinked directory: " + dirname(p));
  assertContained(dirname(p), root);
  if (WIN && isSymlink(p)) throw new Error("refusing to write through symlink: " + p);
  // Opened without O_TRUNC and truncated only after the checks, so a refused
  // file keeps its bytes.
  const fd = openSync(p, constants.O_WRONLY | constants.O_CREAT | NOFOLLOW, 0o644);
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) throw new Error("refusing to write to non-regular file: " + p);
    if (st.nlink > 1)
      throw new Error(
        "refusing to write to " +
          p +
          ": it has a second hard link (another name for the same file); replace it with a plain copy if it is yours",
      );
    ftruncateSync(fd, 0);
    // writeFileSync on the fd loops until every byte lands (a bare writeSync
    // is one write(2) that may return short on ENOSPC and silently truncate).
    writeFileSync(fd, data);
  } finally {
    closeSync(fd);
  }
}
//@ build-report-lite-jwtbvm49.mjs:7027-7296 placement
function mkdirNoFollow(dir, root) {
  if (isSymlink(dir)) throw new Error("refusing to use symlinked directory: " + dir);
  mkdirSync(dir, { recursive: true });
  // Check after creating: mkdirSync(recursive) follows symlinked ancestors.
  assertContained(dir, root);
}
//@ build-report-lite-jwtbvm49.mjs:7297-7394 placement
const readJSON = (p, dflt) => {
  try {
    return JSON.parse(readText(p));
  } catch {
    return dflt;
  }
};
//@ build-report-lite-jwtbvm49.mjs:7647-7736 placement
const ESC_SEQ = /\x1b\[[0-?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[@-_]/g;
//@ build-report-lite-jwtbvm49.mjs:7737-7777 placement
const CONTROL = /[\x00-\x1f\x7f-\x9f]/g;
//@ build-report-lite-jwtbvm49.mjs:7778-7852 placement
const termSafe = (s) => String(s).replace(ESC_SEQ, "").replace(CONTROL, "");
//@ build-report-lite-jwtbvm49.mjs:7853-7912 placement
const eprint = (...a) => console.error(...a.map(termSafe));
//@ build-report-lite-jwtbvm49.mjs:7913-8051 placement
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
//@ build-report-lite-jwtbvm49.mjs:8052-8101 placement
const fmt = (x) => (x == null ? "" : x.toFixed(3));
//@ build-report-lite-jwtbvm49.mjs:8432-8561 placement
const tsvCell = (s) => {
  const replaced = String(s).replace(/[\t\n\r]/g, " ");
  return /^[=+\-@]/.test(replaced) ? "'" + replaced : replaced;
};
//@ build-report-lite-jwtbvm49.mjs:8632-8928 placement
function discoverVariants(flow) {
  const mapped = readdirSync(flow, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^(baseline|v\d+)$/.test(e.name))
    .map((e) => e.name);
  const rank = (n) => (n === "baseline" ? -1 : +n.slice(1));
  return mapped.sort((a, b) => rank(a) - rank(b));
}
/**
 * 把评分结果规范为数值字典：对象取数值或布尔字段，布尔值转为 score。
 */
//@ build-report-lite-jwtbvm49.mjs:9046-9377 placement
function coerceScores(g) {
  if (g && typeof g === "object" && !Array.isArray(g)) {
    const out = {};
    for (const [k, v] of Object.entries(g)) if (isNum(v) || typeof v === "boolean") out[k] = +v;
    return out;
  }
  if (typeof g === "boolean") return { score: g ? 1 : 0 };
  if (isNum(g)) return { score: g };
  return {};
}
/**
 * 读取 results.jsonl，按用例 id 分组为行记录，解析失败的行记入警告。
 */
//@ build-report-lite-jwtbvm49.mjs:9379-10000 placement
function loadRows(p, warnings, dir) {
  // Keyed by data-supplied ids: null-prototype so '__proto__' is a key, not a crash.
  const create = Object.create(null);
  readText(p)
    .split("\n")
    .forEach((line, i) => {
      line = line.trim();
      if (!line) return;
      let r;
      try {
        r = JSON.parse(line);
      } catch {
        warnings.push(dir + "/results.jsonl:" + (i + 1) + ": malformed JSON, skipped");
        return;
      }
      const pid = String(r.prompt_id ?? r.id ?? r.case_id ?? "");
      if (!pid) {
        warnings.push(dir + "/results.jsonl:" + (i + 1) + ": no prompt_id, skipped");
        return;
      }
      (create[pid] ||= []).push(r);
    });
  return create;
}
/**
 * 统计 errors.jsonl 中的错误总数及按类别计数。
 */
//@ build-report-lite-jwtbvm49.mjs:10002-10391 placement
function countErrors(vdir) {
  let total = 0;
  const create = Object.create(null);
  for (const line of readText(join(vdir, "errors.jsonl")).split("\n")) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    total++;
    const c = String(e?.failure_class ?? "error");
    create[c] = (create[c] || 0) + 1;
  }
  return { total, byClass: create };
}
/**
 * 从所有变体的结果中推断出现过的指标名及其类型。
 */
//@ build-report-lite-jwtbvm49.mjs:10555-11173 placement
function inferMetrics(rows, variants) {
  const seen = new Map();
  for (const v of variants)
    for (const reps of Object.values(rows[v]))
      for (const r of reps) {
        const expl = r.explanation && typeof r.explanation === "object" ? r.explanation : {};
        for (const [k, val] of Object.entries(coerceScores(r.grade))) {
          const m = seen.get(k) || { binary: true, judge: false };
          if (val !== 0 && val !== 1) m.binary = false;
          if (k in expl) m.judge = true;
          seen.set(k, m);
        }
      }
  return [...seen.entries()].map(([id, s]) => ({
    id,
    kind: s.judge ? "judge" : s.binary ? "binary" : "float",
  }));
}
/**
 * 读取 hillclimb 流程目录：发现 baseline/vN 变体目录（命名不符的目录给出警告），读 _state.json 的 train/val/test 划分、各变体 results.jsonl 与 errors.jsonl、traces 链接（经符号链接的不链接），汇总每个用例与指标的得分，写出 trajectory/scores.tsv 与 report.html。
 */
//@ build-report-lite-jwtbvm49.mjs:11175-20623 placement
function build(flowArg) {
  const flow = resolve(flowArg);
  if (!statSync(flow, { throwIfNoEntry: false })?.isDirectory()) throw new Error("not a directory: " + flow);
  // Pinned from the path as the caller named it, so the relative-ancestor
  // walk in resolveOutputRoot applies (resolve() would skip it).
  const flowRoot = resolveOutputRoot(flowArg);
  const variants = discoverVariants(flow);
  if (!variants.length) throw new Error("no variant directories (baseline/, v1/, ...) under " + flow);
  const warnings = [];
  // Same warning the full builder gives: a mis-named variant dir is the usual
  // reason the header shows one variant fewer than expected.
  const nonVariant = new Set([
    "trajectory",
    "attachments",
    "refs",
    "ref",
    "inputs",
    "out",
    "target",
    "__pycache__",
  ]);
  for (const e of readdirSync(flow, { withFileTypes: true }))
    if (
      e.isDirectory() &&
      !variants.includes(e.name) &&
      !nonVariant.has(e.name) &&
      !e.name.startsWith(".") &&
      !e.name.startsWith("_")
    )
      warnings.push(
        "ignored directory '" +
          e.name +
          "/' - variant dirs must be named 'baseline' or 'v<N>'; put the descriptive name in change.md's first line instead",
      );
  const state = readJSON(join(flow, "_state.json"), {}) || {};

  const create = Object.create(null);
  for (const sp of ["train", "val", "test"]) {
    const ids = state[sp + "_ids"];
    if (ids == null) continue;
    if (!Array.isArray(ids)) {
      warnings.push("_state.json " + sp + "_ids is not a list - ignored");
      continue;
    }
    for (const pid of ids) create[String(pid)] = sp;
  }

  const create_2 = Object.create(null);
  for (const v of variants) create_2[v] = loadRows(join(flow, v, "results.jsonl"), warnings, v);

  // Trace links are emitted only for a real traces/ directory that resolves
  // inside the pinned flow root: the per-file lstat below refuses a symlinked
  // trace but silently resolves a symlinked traces/ (or variant) directory,
  // which would link files from wherever it points into the report.
  const create_3 = Object.create(null);
  for (const v of variants) {
    const tdir = join(flow, v, "traces");
    try {
      if (isSymlink(join(flow, v)) || isSymlink(tdir)) {
        warnings.push(v + "/traces is reached through a symlink - trace links omitted");
        create_3[v] = false;
      } else {
        const real = realpathSync(tdir);
        create_3[v] = real.startsWith(flowRoot + (WIN ? "\\" : "/"));
      }
    } catch {
      create_3[v] = false;
    }
  }

  // Same as the full builder: drop non-baseline variants with zero result
  // rows (a vN/ holding only change.md while the run warms up would render a
  // blank column), and refuse to build when the first variant itself has none
  // rather than overwrite a good trajectory/scores.tsv with a header-only file.
  for (let i = variants.length - 1; i > 0; i--) {
    const v = variants[i];
    if (Object.keys(create_2[v]).length) continue;
    warnings.push(v + ": zero result rows - dropping (run not started or results.jsonl missing/empty)");
    variants.splice(i, 1);
  }
  if (!Object.keys(create_2[variants[0]]).length)
    throw new Error(
      variants[0] +
        "/ has no result rows under " +
        flow +
        " - nothing to report" +
        (skippedHardLinks.length
          ? " (not read, second hard link: " +
            skippedHardLinks.map((p) => p.slice(flow.length + 1)).join(", ") +
            " - replace with plain copies if they are yours)"
          : ""),
    );

  const create_4 = Object.create(null);
  for (const v of variants) {
    const vdir = join(flow, v);
    const change =
      readText(join(vdir, "change.md"))
        .split("\n")
        .find((l) => l.trim()) || "";
    const summary = readJSON(join(vdir, "summary.json"), {}) || {};
    // Model: summary.json wins, else the most common row.model (what the app called).
    const create = Object.create(null);
    for (const reps of Object.values(create_2[v]))
      for (const r of reps) if (typeof r.model === "string") create[r.model] = (create[r.model] || 0) + 1;
    const rowModel = Object.entries(create).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    create_4[v] = {
      change: change.replace(/^#+\s*/, ""),
      model: summary.model || rowModel,
      errors: countErrors(vdir),
    };
  }

  // Metrics: _state.json `metrics` (or the legacy `criteria` key) wins,
  // keeping each declared `kind`; else inferred from grade keys. Primary is
  // the first declared-or-inferred binary metric, else the first - the same
  // selection the full builder's lib/adapter.mjs makes, so both builders
  // report the same metric's numbers on the same flow.
  const metricsCfg = state.metrics || state.criteria;
  const filtered = (Array.isArray(metricsCfg) ? metricsCfg : [])
    .map((m) => (typeof m === "string" ? { id: m } : { id: m?.id, kind: m?.kind }))
    .filter((m) => m.id);
  const metrics = filtered.length ? filtered : inferMetrics(create_2, variants);
  if (!metrics.length) metrics.push({ id: "score", kind: "float" });
  const id = (metrics.find((m) => m.kind === "binary") || metrics[0]).id;

  // Cases: union of ids across variants, in first-seen order.
  const ids = [];
  const seenId = new Set();
  for (const v of variants)
    for (const pid of Object.keys(create_2[v]))
      if (!seenId.has(pid)) {
        seenId.add(pid);
        ids.push(pid);
      }

  const okReps = (reps) => reps.filter((r) => r.status == null || r.status === "ok");
  const caseMean = (reps, m) => {
    const filtered = okReps(reps)
      .map((r) => coerceScores(r.grade)[m])
      .filter(isNum);
    return filtered.length ? filtered.reduce((s, x) => s + x, 0) / filtered.length : null;
  };
  const mapped = ids.map((pid) => {
    const first = variants.map((v) => create_2[v][pid]?.[0]).find(Boolean) || {};
    const tags = Array.isArray(first.tags) ? first.tags.map(String) : [];
    const per = {};
    for (const v of variants) {
      const reps = create_2[v][pid] || [];
      per[v] = {
        mean: caseMean(reps, id),
        reps: reps.length,
        truncated: reps.filter((r) => r.status === "truncated").length,
        traces: reps
          .map((r, k) => {
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
            if (!create_3[v]) return null;
            const rep = r.rep ?? k;
            if (!/^[A-Za-z0-9_.-]+$/.test(pid) || /^\.+$/.test(pid)) return null;
            if (!Number.isInteger(+rep) || +rep < 0) return null;
            const stems = +rep === 0 ? [pid + "_rep" + rep, pid] : [pid + "_rep" + rep];
            for (const stem of stems) {
              const rel = v + "/traces/" + stem + ".json";
              const abs = resolve(flow, rel);
              if (dirname(abs) !== join(flow, v, "traces")) return null;
              // A hard-linked trace is no more ours than a symlinked one.
              const ls = lstatSync(abs, { throwIfNoEntry: false });
              if (ls?.isFile() && !(ls.nlink > 1)) return { rep, rel };
            }
            return null;
          })
          .filter(Boolean),
      };
    }
    return { id: pid, split: create[pid] || "", tags, prompt: String(first.prompt ?? ""), per };
  });

  // Per-variant aggregate: mean over cases that have a value, per split.
  const agg = {};
  for (const v of variants) {
    const filtered = mapped.map((c) => c.per[v].mean).filter(isNum);
    const filtered_2 = mapped
      .filter((c) => c.split === "test")
      .map((c) => c.per[v].mean)
      .filter(isNum);
    const m = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
    agg[v] = {
      all: m(filtered),
      n: filtered.length,
      test: m(filtered_2),
      nTest: filtered_2.length,
      truncated: mapped.reduce((s, c) => s + c.per[v].truncated, 0),
    };
  }

  // trajectory/scores.tsv - same shape as the full builder.
  mkdirNoFollow(join(flow, "trajectory"), flowRoot);
  const tsv = [["id", "split", ...variants].join("\t")];
  for (const c of mapped)
    tsv.push(
      [tsvCell(c.id), tsvCell(c.split || "all"), ...variants.map((v) => fmt(c.per[v].mean))].join("\t"),
    );
  writeNoFollow(join(flow, "trajectory", "scores.tsv"), tsv.join("\n") + "\n", flowRoot);

  // _state.json's `best` is {round, test_score}; map the round to a variant
  // name the way the full builder does (0 = baseline), and drop it when the
  // named variant isn't on disk.
  let best = null;
  if (Number.isInteger(state.best?.round)) {
    best = state.best.round === 0 ? "baseline" : "v" + state.best.round;
    if (!variants.includes(best)) best = null;
  }

  for (const p of new Set(skippedHardLinks))
    warnings.push(
      p.slice(flow.length + 1) +
        " has a second hard link - not read; replace it with a plain copy if it is yours",
    );
  const html = render({
    flow,
    variants,
    header: create_4,
    agg,
    cases: mapped,
    primary: id,
    metrics: metrics.map((m) => m.id),
    warnings,
    best,
  });
  writeNoFollow(join(flow, "report.html"), html, flowRoot);
  return { variants: variants.length, cases: mapped.length, warnings };
}
/**
 * 把汇总结果渲染为单文件 HTML 报告：变体概览表（得分、错误分类计数）、每个用例在各变体上的指标、警告列表；所有数据值经 HTML 转义。
 */
//@ build-report-lite-jwtbvm49.mjs:20625-24431 placement
function render({ flow, variants, header, agg, cases, primary, metrics, warnings, best }) {
  const any = cases.some((c) => c.split);
  const any_2 = variants.some((v) => agg[v].nTest > 0);
  const th = (label, key) => '<th data-k="' + esc(key) + '">' + esc(label) + "</th>";

  const joined = variants
    .map((v) => {
      const h = header[v],
        a = agg[v];
      const err = h.errors.total
        ? h.errors.total +
          " (" +
          Object.entries(h.errors.byClass)
            .map(([k, n]) => esc(k) + " " + n)
            .join(", ") +
          ")"
        : "0";
      return (
        "<tr" +
        (best === v ? ' class="best"' : "") +
        "><td>" +
        esc(v) +
        (best === v ? ' <span class="pill">best</span>' : "") +
        "</td>" +
        "<td>" +
        esc(h.change) +
        "</td><td>" +
        esc(h.model) +
        "</td>" +
        '<td class="num">' +
        fmt(a.all) +
        '</td><td class="num">' +
        a.n +
        "</td>" +
        (any_2 ? '<td class="num">' + fmt(a.test) + '</td><td class="num">' + a.nTest + "</td>" : "") +
        '<td class="num">' +
        a.truncated +
        "</td><td>" +
        err +
        "</td></tr>"
      );
    })
    .join("\n");

  const joined_2 = cases
    .map((c) => {
      const joined = variants
        .map((v) => {
          const p = c.per[v];
          const joined = p.traces
            .map((trace) => '<a href="' + esc(trace.rel) + '">rep' + esc(trace.rep) + "</a>")
            .join(" ");
          return (
            '<td class="num" data-v="' +
            fmt(p.mean) +
            '">' +
            fmt(p.mean) +
            (p.truncated ? ' <span class="pill warn">' + p.truncated + " truncated</span>" : "") +
            (joined ? '<div class="links">' + joined + "</div>" : "") +
            "</td>"
          );
        })
        .join("");
      const prompt = c.prompt.length > 600 ? c.prompt.slice(0, 600) + "..." : c.prompt;
      return (
        '<tr><td class="id">' +
        esc(c.id) +
        "</td>" +
        (any ? "<td>" + esc(c.split) + "</td>" : "") +
        "<td>" +
        c.tags.map((tag) => '<span class="pill">' + esc(tag) + "</span>").join(" ") +
        "</td>" +
        joined +
        '<td class="prompt"><details><summary>' +
        esc(prompt.split("\n")[0].slice(0, 80)) +
        "</summary><pre>" +
        esc(prompt) +
        "</pre></details></td></tr>"
      );
    })
    .join("\n");

  const warn = warnings.length
    ? '<section class="warnings"><h2>Warnings</h2><ul>' +
      warnings.map((w) => "<li>" + esc(w) + "</li>").join("") +
      "</ul></section>"
    : "";

  return (
    '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>" +
    esc(flow.split(/[\\/]/).pop()) +
    " - eval report</title>" +
    "<style>" +
    joined_3 +
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
    esc(primary) +
    "</code>" +
    (metrics.length > 1
      ? " (also: " +
        metrics
          .filter((m) => m !== primary)
          .map(esc)
          .join(", ") +
        ")"
      : "") +
    " &middot; generated " +
    new Date().toISOString().slice(0, 19).replace("T", " ") +
    " UTC" +
    " &middot; lite report (no transcripts inlined; click rep links)</p></header>" +
    "<section><h2>Variants</h2><table><thead><tr>" +
    th("variant", "s") +
    th("change", "s") +
    th("model", "s") +
    th("mean " + primary, "n") +
    th("cases", "n") +
    (any_2 ? th("test mean", "n") + th("test cases", "n") : "") +
    th("truncated", "n") +
    th("failed attempts", "s") +
    "</tr></thead><tbody>" +
    joined +
    "</tbody></table></section>" +
    '<section><h2>Cases</h2><p class="hint">Click a column header to sort. Per-case values are the mean of <code>' +
    esc(primary) +
    "</code> over status-ok reps.</p>" +
    '<table id="cases"><thead><tr>' +
    th("id", "s") +
    (any ? th("split", "s") : "") +
    th("tags", "s") +
    variants.map((v) => th(v, "n")).join("") +
    th("prompt", "s") +
    "</tr></thead><tbody>" +
    joined_2 +
    "</tbody></table></section>" +
    warn +
    "<script>" +
    joined_2_2 +
    "</script></body></html>\n"
  );
}
//@ build-report-lite-jwtbvm49.mjs:24433-25885 placement
const joined_3 = [
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
const joined_2_2 = [
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
  for (const w of warnings) eprint("warning: " + w);
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
