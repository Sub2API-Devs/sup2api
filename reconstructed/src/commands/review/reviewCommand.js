/**
 * commands/review/reviewCommand.ts
 *
 * 2.1.316 新增：/code-review 主体：选择等级与模型，拼装分阶段多代理审查提示词并注册技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (9)
 * attribution: placement 9
 */
import { Uvt, UF, ultrareviewAuthPrecondition } from "./ultrareviewPreconditions.js";
import {
  REVIEW_LEVELS,
  parseReviewArgs,
  defaultReviewLevel,
  resolveMaxFindings,
  afterReviewSection,
  describeMaxFindings,
  Ys,
} from "./reviewArgs.js";
import {
  getMainLoopModel,
  getEffortValue,
  getEffortLayerOverride,
} from "../../utils/permissions/toolPermissionContext.js";
import { Ae, Rs, de, Ls, tt, buildReviewPromptForLevel } from "./reviewModels.js";
import {
  getReportFindingsMode,
  buildGitLabCommentSection,
  GITHUB_COMMENT_SECTION,
  buildFixSection,
  Us,
  js,
} from "./reviewPosting.js";
import { zt, buildReviewOutputSection } from "./reviewPhases.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { isGitLabMrTarget } from "../../utils/detectRepository.js";
import { canSpawnReviewAgents, formatReviewOutput } from "./reviewAngles.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ultrareviewProseTip } from "../../services/api/ultrareviewQuota.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { gitExe } from "../../utils/git.js";
import { getRemoteHostSessionCount } from "../insights.js";
import { resolveEffortValue, normalizeEffortLevel } from "../../utils/effort.js";
import { isCommandEnabled } from "../../commands.js";
import { registerBundledSkill } from "../../skills/bundledSkills.js";
import { CODE_REVIEW } from "../../skills/bundled/bundledSkillNames.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";

//@ chunk-hantmvxa.js:85992-87082 placement
function getReviewCommandDescription() {
  let e = Uvt()
      ? `; ultra: deep multi-agent review in the cloud${UF() ? "" : " (requires claude.ai account access)"}`
      : "",
    n = Uvt()
      ? " For ultra on a GitHub.com PR target, --post asks to post the finished review\u2019s findings to the PR as a single comment from the user\u2019s GitHub account (not a review; the launch dialog still confirms in interactive sessions, while non-interactive mode posts on the flag alone) and --no-post hides that option."
      : "";
  return `Review the current diff, or a PR number/branch/path target, for correctness bugs (plus reuse/simplification/efficiency cleanups where the model's recipe covers them) at the effort level given first, before any target (${REVIEW_LEVELS.join("|")}: from few high-confidence findings to many, some uncertain${e}); with no level given, it reuses the level you typed last. Pass --comment to post findings as inline PR comments, or --fix to apply them to the working tree after the review. Pass --max-findings <n> to report up to n findings, or --max-findings all for every finding. The choice stays until you pass --max-findings default.${n}`;
}
//@ chunk-hantmvxa.js:87082-87521 placement
function getReviewWhenToUse() {
  return Uvt()
    ? "Use the max or ultra level only when the user, or instructions such as CLAUDE.md or a skill, explicitly ask for one, never on your own judgment: they are the costliest reviews and start many reviewer subagents."
    : "Use the max level only when the user, or instructions such as CLAUDE.md or a skill, explicitly ask for it, never on your own judgment: it is the costliest level and starts many reviewer subagents.";
}
//@ chunk-hantmvxa.js:87521-87660 placement
function reviewArgumentHint() {
  return `[${Uvt() ? `${REVIEW_LEVELS.join("|")}|ultra` : REVIEW_LEVELS.join("|")}] [--fix] [--comment] [<pr#>|<branch>|<path>] [--max-findings <n>|all]`;
}
/**
 * /code-review 主体：解析参数、选择等级与模型、拼装分阶段多代理审查提示词（含发帖/修复/上限说明）。
 */
//@ chunk-hantmvxa.js:87660-89673 placement
async function buildReviewPrompt(e, n) {
  let s = parseReviewArgs(e),
    {
      explicit: explicit,
      target: target,
      comment: comment,
      fix: fix,
      post: post,
      unrecognizedLevel: unrecognizedLevel,
      ultraFallback: ultraFallback,
    } = s,
    S = defaultReviewLevel(s, n),
    T = resolveReviewEffort(s, n),
    R = n.options ? getMainLoopModel(n) : void 0,
    L = Ae(R),
    x = n.options?.isSkillPreload && Rs.has(L) ? "default" : L,
    D = de[x][T],
    B = getReportFindingsMode(n),
    j = B !== void 0,
    W = !j,
    P = j ? zt : buildReviewOutputSection,
    N = resolveMaxFindings(s, D.cell, j, n),
    q = D.cell === "o5-bmin",
    Re = B === "spawn" && !D.measuredExternal ? await afterReviewSection(n) : "",
    se = firstLineOf(target, " "),
    we = isGitLabMrTarget(se),
    ve = buildReviewPreamble({
      ultraFallback: ultraFallback,
      fix: fix,
      post: post,
      comment: comment,
      gitlabTarget: we,
      unrecognizedLevel: unrecognizedLevel,
      lastUsed: S,
      level: T,
      willRunAsFork: W,
      context: n,
    }),
    re = describeMaxFindings({ ...N, ignored: s.maxFindingsIgnored }, "the user"),
    H = N.reused ? "passing `--max-findings default` goes back to the usual limit" : void 0,
    be = !re
      ? ""
      : W
        ? `(${re} Open your report with one short line telling the user this${H ? `, and that ${H}` : ""}; that opening line reaches them with the findings.)

`
        : `(${re} Tell the user this in one short line as you begin${H ? `, including that ${H}` : ""}.)

`,
    pe = canSpawnReviewAgents(n),
    ct = null,
    Oe = { text: "" };
  if (!n.options?.isSkillPreload) {
    if (pe) Oe = await estimateFinderBudgetHint(R, T, target, ct);
    let De = explicit ?? S;
    logEvent("tengu_code_review_routed", {
      effort_level: fromEnum(T),
      effort_source: fromEnum(
        explicit !== void 0
          ? "explicit"
          : S !== void 0
            ? "last_used"
            : ultraFallback
              ? "ultra_fallback"
              : "session",
      ),
      routed_to_workflow: !1,
      uses_report_findings_tool: j,
      has_fix: fix,
      has_comment: comment,
      has_target: target.length > 0,
      is_ultra_fallback: ultraFallback,
      low_variant: T === "low" ? fromEnum(Ls[x] ?? "default") : void 0,
      model_family: fromEnum(x),
      finder_budget: Oe.budget,
      agent_tool_available: pe,
      threaded_effort: De !== void 0 ? fromEnum(tt(x, De)) : void 0,
      findings_limit: fromEnum(N.stated === void 0 ? "default" : N.stated === "all" ? "all" : "number"),
      findings_limit_value: typeof N.stated === "number" ? N.stated : void 0,
    });
  }
  let ht =
      n.options?.isSkillPreload || n.agentId !== void 0 || ultraFallback || W || D.measuredExternal
        ? null
        : ultrareviewProseTip(n.storageV5, n.credentials),
    fn =
      ht !== null
        ? `

After you finish the review, end your response with this exact line on its own:
${ht}`
        : "",
    gn = target
      ? `Review target: \`${target}\`

`
      : "",
    yn = ct?.preamble ?? "";
  return [
    {
      type: "text",
      text: `${ve}${be}${gn}${yn}${Oe.text}${buildReviewPromptForLevel(D.cell, P, pe, j, N.stated)}${comment ? (we ? buildGitLabCommentSection(se) : GITHUB_COMMENT_SECTION) : ""}${fix ? buildFixSection(j) : ""}${j && !q ? Us : ""}${B === "message" && !q ? js : ""}${Re}${fn}`,
    },
  ];
}
//@ chunk-hantmvxa.js:89673-90366 placement
async function estimateFinderBudgetHint(e, n, s, r) {
  if (!de[Ae(e)][n].finderBudgetHint) return { text: "" };
  let h = r ? (s ? void 0 : await r.countDiffLines()) : await countDiffLines(s);
  if (h === void 0) return { text: "" };
  let max = Math.max(2, Math.min(8, Math.ceil(h / 150)));
  if (!s && !r)
    return {
      text: `The committed diff (@{upstream}...HEAD) is about ${h} lines. Uncommitted changes aren't counted here, so treat this as a floor \u2014 start with about ${max} finder subagents (min 2, max 8) and scale up if Phase 0 finds additional working-tree scope.

`,
      budget: max,
    };
  return {
    text: `This diff is about ${h} lines. Spawn about ${max} finder subagents (min 2, max 8) \u2014 scale your investigation depth to the diff size rather than using a fixed large fleet.

`,
    budget: max,
  };
}
//@ chunk-hantmvxa.js:90366-91018 placement
async function countDiffLines(e) {
  let n;
  if (!e) n = "@{upstream}...HEAD";
  else if (e.length <= 256 && /^[@\w][@\w./~^-]*\.\.\.?[@\w][@\w./~^-]*$/.test(e)) n = e;
  else return;
  try {
    let { stdout: stdout, code: code } = await execFileNoThrow(
      gitExe(),
      [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "core.fsmonitor=",
        "-c",
        "core.askPass=",
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--numstat",
        "--end-of-options",
        n,
        "--",
      ],
      {
        timeout: 5000,
        useCwd: !0,
        env: {
          ...getRemoteHostSessionCount(),
          [["SELF_HOSTED", "RUNNER_POOL_SECRET"].join("_")]: void 0,
          [["SELF_HOSTED", "RUNNER_ENVIRONMENT_SECRET"].join("_")]: void 0,
        },
      },
    );
    if (code !== 0) return;
    let h = 0;
    for (let y of stdout.split(`
`)) {
      let match = y.match(/^(\d+)\t(\d+)\t/);
      if (match) h += Number(match[1]) + Number(match[2]);
    }
    return h > 0 ? h : void 0;
  } catch {
    return;
  }
}
//@ chunk-hantmvxa.js:91018-91215 placement
function resolveReviewEffort(e, n) {
  let { explicit: explicit, ultraFallback: ultraFallback } = e,
    h = ultraFallback ? "max" : (explicit ?? defaultReviewLevel(e, n)),
    y = n.options ? getMainLoopModel(n) : void 0,
    w = y
      ? (resolveEffortValue(y, getEffortValue(n), {
          turnEffort: h ?? getEffortLayerOverride(n.permissionLayers),
        }) ?? h)
      : (h ?? getEffortValue(n));
  return w === void 0 ? "medium" : normalizeEffortLevel(w);
}
//@ chunk-hantmvxa.js:91215-93966 placement
function buildReviewPreamble({
  ultraFallback: ultraFallback,
  fix: fix,
  post: post,
  comment: comment,
  gitlabTarget: gitlabTarget,
  unrecognizedLevel: unrecognizedLevel,
  lastUsed: lastUsed,
  level: level,
  willRunAsFork: willRunAsFork,
  context: context,
}) {
  let S = comment
      ? gitlabTarget
        ? "when the target is a GitLab merge request, your `--comment` is what posts the findings as one general MR note via glab"
        : "when the target is a GitHub PR, your `--comment` is what posts the findings as inline PR comments"
      : gitlabTarget
        ? "this local review will not post to GitLab; `--comment` is the flag that posts local findings as a general MR note"
        : "this local review will not post to GitHub; `--comment` is the flag that posts local findings as inline PR comments",
    T = (x) =>
      post
        ? `${x}(The typed \`--post\` applies only to the \`/code-review ultra\` cloud review and was ignored \u2014 ${S}. Tell the user this in one short line.)

`
        : x;
  if (ultraFallback) {
    if (!UF()) {
      if (fix)
        return T(`(Running a local ${level}-effort review and applying its findings.)

`);
      if (Uvt()) {
        if (context.options?.isNonInteractiveSession) {
          let D = ultrareviewAuthPrecondition();
          if (D)
            return T(`(${D} Falling back to a local ${level}-effort review.)

`);
        }
        return T(`(ultra (cloud review) requires claude.ai account access this session doesn't have \u2014 see https://code.claude.com/docs/en/ultrareview. Falling back to a local ${level}-effort review.)

`);
      }
      return T(`(ultra (cloud review) isn't available in this environment \u2014 see https://code.claude.com/docs/en/ultrareview. Falling back to a local ${level}-effort review.)

`);
    }
    let x = context.options?.commands?.some((D) => D.name === "ultrareview" && isCommandEnabled(D)) ?? !1;
    if (fix)
      return T(
        x
          ? `(Claude can't launch the cloud review directly \u2014 type \`/code-review ultra --fix\` to review in the cloud and apply the findings locally when it completes. Running a local ${level}-effort review and applying its findings for now.)

`
          : `(Running a local ${level}-effort review and applying its findings.)

`,
      );
    return T(
      x
        ? `(Claude can't launch the cloud review directly \u2014 type \`/code-review ultra\` to run it. Falling back to a local ${level}-effort review for now.)

`
        : `(Claude can't launch the cloud review directly \u2014 the user can run \`claude ultrareview\` from a terminal to start it. Falling back to a local ${level}-effort review for now.)

`,
    );
  }
  let R = "typing a level (for example `/code-review high`) changes it",
    L = (x) =>
      willRunAsFork
        ? `(${x} Open your report with one short line telling the user this, and that ${R}; that opening line reaches them with the findings.)

`
        : `(${x} Tell the user this in one short line as you begin, including that ${R}.)

`;
  if (unrecognizedLevel !== void 0) {
    let x = `Ignoring unrecognized effort "${unrecognizedLevel}"; valid: ${REVIEW_LEVELS.join(", ")}. Using ${level}${lastUsed === level ? ", the level the user typed last time" : ""}.`;
    return T(
      lastUsed !== void 0
        ? L(x)
        : `(${x})

`,
    );
  }
  if (lastUsed !== void 0) {
    let x = `reusing ${lastUsed}, the level the user typed last time${level !== lastUsed ? `; running at ${level} here` : ""}`;
    return T(L(`No effort level given \u2014 ${x}.`));
  }
  return T("");
}
/**
 * 注册内置 code-review（/review、ultrareview 子命令）技能。
 */
//@ chunk-hantmvxa.js:93966-95240 placement
function registerCodeReviewSkill() {
  registerBundledSkill({
    name: CODE_REVIEW,
    aliases: ["review"],
    menuDescription: "Review the current diff or a PR for bugs and cleanups",
    subcommands: { ultra: "ultrareview" },
    description: getReviewCommandDescription,
    whenToUse: getReviewWhenToUse,
    argumentHint: reviewArgumentHint,
    userInvocable: !0,
    getEffort(e, n) {
      let { explicit: explicit } = parseReviewArgs(e);
      if (explicit === void 0) return;
      return tt(Ae(n?.options ? getMainLoopModel(n) : void 0), explicit);
    },
    getDefaultEffort(e, n) {
      let s = parseReviewArgs(e),
        r = defaultReviewLevel(s, n);
      if (r === void 0) return;
      let h = n ? resolveReviewEffort(s, n) : r,
        y = Ae(n?.options ? getMainLoopModel(n) : void 0),
        w = resolveMaxFindings(s, de[y][h].cell, n !== void 0 && getReportFindingsMode(n) !== void 0, n),
        b = describeMaxFindings({ ...w, ignored: s.maxFindingsIgnored }, "you");
      return {
        value: tt(y, r),
        notice: `${s.unrecognizedLevel !== void 0 ? `Ignoring unrecognized effort "${s.unrecognizedLevel}"; valid: ${REVIEW_LEVELS.join(", ")}. ` : ""}Reusing ${r} effort, the level you typed last time${h !== r ? `; running at ${h} here` : ""}. Type a level like \`/code-review high\` to change it.${b ? ` ${b}${w.reused ? " Pass `--max-findings default` to go back to the usual limit." : ""}` : ""}`,
      };
    },
    onUserTypedArgs(e, n) {
      let { explicit: explicit, maxFindings: maxFindings } = parseReviewArgs(e);
      if (explicit !== void 0) Ys(explicit, n.storageV5);
      if (maxFindings !== void 0) {
        let h = maxFindings === "default" ? void 0 : maxFindings;
        saveGlobalConfig(
          (y) => (y.codeReviewLastMaxFindings === h ? y : { ...y, codeReviewLastMaxFindings: h }),
          n.storageV5,
        );
      }
    },
    getContext(e, n) {
      if (isCoordinatorMode_2()) return "inline";
      if (getReportFindingsMode(n) !== void 0) return "inline";
      return "fork";
    },
    formatForegroundForkResult: formatReviewOutput,
    getPromptForCommand: buildReviewPrompt,
  });
}

export { registerCodeReviewSkill };
