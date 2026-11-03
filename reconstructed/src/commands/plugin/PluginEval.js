/**
 * commands/plugin/PluginEval.tsx
 *
 * 2.1.316 新增。/plugin eval：读取技能 evals/ 中的查询，跑触发测试并输出报告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (7)
 * attribution: placement 7
 */
import { readdir, readFile, readFile as readFile_2 } from "fs/promises";
import * as pathModule from "path";
import { homedir } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { tv } from "../../utils/remoteFileState.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";
import { parseYaml } from "../../utils/yaml.js";
import { logForDebugging } from "../../utils/debug.js";
import { count } from "../../utils/collections.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { R, P, j } from "../../../vendor/react/cjs/react.production.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

/**
 * 触发判定 schema（{query, should_trigger}）与上限常量；与 WebSearch UI 关系不明。
 */
//@ chunk-vrb44rx7.js:97309-97386 placement = getToolUseSummary (0.537)
var MIN_EVAL_QUERIES = 5,
  jh = DoctorLazy(() => u({ query: o().min(1), should_trigger: M() })),
  Fl = async () => null;
/**
 * 读取 evals/*.md 的 query/should_trigger
 */
//@ chunk-vrb44rx7.js:97386-98463 placement
async function loadEvalQueries(i) {
  let h = [],
    k = [],
    C;
  try {
    C = await readdir(i);
  } catch (error) {
    if (isENOENT(error))
      return {
        queries: [],
        warnings: [
          `No evals/ folder found at ${i}. Create one with at least ${MIN_EVAL_QUERIES} <name>.md files (frontmatter: query, should_trigger).`,
        ],
      };
    throw error;
  }
  for (let x of C.filter((T) => T.endsWith(".md")).sort()) {
    let joined = pathModule.join(i, x),
      D;
    try {
      D = await readFile(joined, "utf8");
    } catch (error) {
      k.push(`Could not read ${x}: ${errorMessage(error)}`);
      continue;
    }
    D = tv(D);
    let match = D.match(FRONTMATTER_REGEX);
    if (!match) {
      k.push(`${x}: missing YAML frontmatter (expected ---\\nquery: \u2026\\nshould_trigger: \u2026\\n---).`);
      continue;
    }
    let L;
    try {
      L = parseYaml(match[1] ?? "");
    } catch (error) {
      k.push(`${x}: invalid YAML \u2014 ${errorMessage(error)}`);
      continue;
    }
    let safeParse = jh().safeParse(L);
    if (!safeParse.success) {
      let joined = safeParse.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      k.push(`${x}: ${joined}`);
      continue;
    }
    let trimmed = D.slice(match[0].length).trim();
    h.push({
      file: x,
      query: safeParse.data.query,
      shouldTrigger: safeParse.data.should_trigger,
      ...(trimmed && { notes: trimmed }),
    });
  }
  if (h.length > 0 && h.length < MIN_EVAL_QUERIES)
    k.push(
      `Only ${h.length} eval ${h.length === 1 ? "query" : "queries"} found; the spec recommends at least ${MIN_EVAL_QUERIES} for meaningful coverage.`,
    );
  return { queries: h, warnings: k };
}
/**
 * 读 SKILL.md frontmatter 的 description
 */
//@ chunk-vrb44rx7.js:98463-98700 placement
async function readSkillDescription(i) {
  try {
    let h = await readFile(pathModule.join(i, "SKILL.md"), "utf8"),
      match = tv(h).match(FRONTMATTER_REGEX);
    if (!match) return "";
    let C = parseYaml(match[1] ?? "");
    if (C && typeof C === "object" && "description" in C && typeof C.description === "string")
      return C.description;
  } catch {}
  return "";
}
/**
 * 对 evals/ 中每条查询跑触发测试
 */
//@ chunk-vrb44rx7.js:98700-99647 placement
async function runSkillTriggerEvals(i, h, k) {
  let C = i === "~" || i.startsWith("~/") ? pathModule.join(homedir(), i.slice(1)) : i,
    resolved = pathModule.resolve(C),
    base = pathModule.basename(resolved),
    D = await readSkillDescription(resolved),
    joined = pathModule.join(resolved, "evals"),
    { queries: queries, warnings: warnings } = await loadEvalQueries(joined),
    K = [];
  for (let V of queries) {
    if (h.aborted) break;
    try {
      let B = await k({ skillName: base, description: D, query: V, signal: h });
      if (B === null) {
        K.push({
          query: V,
          modelWouldTrigger: null,
          reason: "Model evaluation not yet wired up \u2014 tracks the plugin evaluation framework.",
          verdict: "skipped",
        });
        continue;
      }
      K.push({
        query: V,
        modelWouldTrigger: B.wouldTrigger,
        reason: B.reason,
        verdict: B.wouldTrigger === V.shouldTrigger ? "pass" : "fail",
      });
    } catch (error) {
      (logForDebugging(`plugin eval: trigger test for ${V.file} threw: ${errorMessage(error)}`, {
        level: "error",
      }),
        K.push({ query: V, modelWouldTrigger: null, reason: errorMessage(error), verdict: "fail" }));
    }
  }
  return {
    pluginName: base,
    pluginPath: resolved,
    evalsPath: joined,
    queries: queries,
    warnings: warnings,
    triggerResults: K,
    passCount: count(K, (V) => V.verdict === "pass"),
    failCount: count(K, (V) => V.verdict === "fail"),
    skippedCount: count(K, (V) => V.verdict === "skipped"),
  };
}
/**
 * 格式化插件评测报告
 */
//@ chunk-vrb44rx7.js:99647-100690 placement
function formatEvalReport(i) {
  let h = [];
  (h.push(`Evaluating ${i.pluginName} (${i.evalsPath})`), h.push(""));
  for (let warning of i.warnings) h.push(`! ${warning}`);
  if (i.warnings.length > 0) h.push("");
  if (i.queries.length === 0)
    return (
      h.push("No eval queries to run."),
      h.join(`
`)
    );
  h.push("Level 1 \u2014 trigger tests:");
  for (let triggerResult of i.triggerResults) {
    let padded = triggerResult.verdict.toUpperCase().padEnd(7),
      x = triggerResult.query.shouldTrigger ? "trigger" : "skip";
    if (triggerResult.verdict === "skipped")
      h.push(`  [${padded}] ${triggerResult.query.file} \u2014 expected ${x}`);
    else {
      let T = triggerResult.modelWouldTrigger ? "trigger" : "skip";
      if (
        (h.push(`  [${padded}] ${triggerResult.query.file} \u2014 expected ${x}, got ${T}`),
        triggerResult.verdict === "fail")
      )
        h.push(`            ${triggerResult.reason}`);
    }
  }
  if ((h.push(""), i.skippedCount === i.triggerResults.length))
    h.push("All trigger tests skipped \u2014 model evaluation not yet wired up.");
  else
    h.push(
      `${i.passCount}/${i.passCount + i.failCount} trigger tests passed${i.skippedCount > 0 ? ` (${i.skippedCount} skipped)` : ""}.`,
    );
  return (
    h.push(""),
    h.push("Level 2 \u2014 interplay tests: not yet implemented. Tracks the plugin evaluation framework."),
    h.join(`
`)
  );
}
/**
 * /plugin eval 的运行组件
 */
//@ chunk-vrb44rx7.js:100690-101918 placement
function PluginEvalRunner(i) {
  let C = w(6),
    { onComplete: onComplete, target: target } = i,
    x;
  if (C[0] === MEMO_CACHE_SENTINEL) ((x = new AbortController()), (C[0] = x));
  else x = C[0];
  let T = R(x),
    D,
    U;
  if (C[1] !== onComplete || C[2] !== target)
    ((D = () => {
      let L = T.current;
      let _ = async function _() {
        if (!target) {
          onComplete(`Usage: /plugin eval [path]

Run trigger evaluations for a skill against the queries in its evals/ folder.

Examples:
  /plugin eval ./my-skill
  /plugin eval ~/.claude/skills/pdf-tools

Each evals/*.md file needs frontmatter with \`query\` (string)
and \`should_trigger\` (boolean). The spec recommends at least five.

Or from the command line:
  claude plugin eval [path]`);
          return;
        }
        try {
          let K = await runSkillTriggerEvals(target, L.signal, Fl);
          process.exitCode = K.failCount > 0 ? 1 : 0;
          let V =
            K.queries.length === 0
              ? ""
              : K.failCount > 0
                ? `

${re.cross} Evaluation failed`
                : K.skippedCount === K.queries.length
                  ? `

${re.info} Eval queries validated; trigger tests pending model integration`
                  : `

${re.tick} Evaluation passed`;
          onComplete(formatEvalReport(K) + V);
        } catch (error) {
          let B = error;
          ((process.exitCode = 2),
            logForDebugging(`Plugin eval failed for ${target}: ${errorMessage(B)}`, { level: "error" }),
            onComplete(`${re.cross} ${errorMessage(B)}`));
        }
      };
      return (_(), () => L.abort());
    }),
      (U = [onComplete, target]),
      (C[1] = onComplete),
      (C[2] = target),
      (C[3] = D),
      (C[4] = U));
  else ((D = C[3]), (U = C[4]));
  P(D, U);
  let A;
  if (C[5] === MEMO_CACHE_SENTINEL)
    ((A = e(Box, { flexDirection: "column", children: e(Text, { children: "Running evaluation\u2026" }) })),
      (C[5] = A));
  else A = C[5];
  return A;
}
//@ chunk-vrb44rx7.js:101918-101922 placement
j();

export { PluginEvalRunner };
