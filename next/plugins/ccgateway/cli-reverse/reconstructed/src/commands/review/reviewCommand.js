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
import {
  isUltrareviewAvailable,
  isUltrareviewWithBridge,
  ultrareviewAuthPrecondition,
} from "./ultrareviewPreconditions.js";
import {
  REVIEW_LEVELS,
  parseReviewArgs,
  defaultReviewLevel,
  resolveMaxFindings,
  afterReviewSection,
  describeMaxFindings,
  saveReviewEffort,
} from "./reviewArgs.js";
import {
  getMainLoopModel,
  getEffortValue,
  getEffortLayerOverride,
} from "../../utils/permissions/toolPermissionContext.js";
import {
  normalizeReviewModelKey,
  MODELS_WITH_MAX_CELL,
  REVIEW_LEVEL_TABLE_BY_MODEL,
  REVIEW_CELL_OVERRIDES,
  resolveLevelEffort,
  buildReviewPromptForLevel,
} from "./reviewModels.js";
import {
  getReportFindingsMode,
  buildGitLabCommentSection,
  GITHUB_COMMENT_SECTION,
  buildFixSection,
  REPORT_OUTCOMES_LATER_SECTION,
  REPORT_OUTCOMES_LINE_TEXT,
} from "./reviewPosting.js";
import { buildReportFindingsOutputSection, buildReviewOutputSection } from "./reviewPhases.js";
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
  let ultraSuffix = isUltrareviewAvailable()
    ? `; ultra: deep multi-agent review in the cloud${isUltrareviewWithBridge() ? "" : " (requires claude.ai account access)"}`
    : "";
  let postSuffix = isUltrareviewAvailable()
    ? " For ultra on a GitHub.com PR target, --post asks to post the finished review\u2019s findings to the PR as a single comment from the user\u2019s GitHub account (not a review; the launch dialog still confirms in interactive sessions, while non-interactive mode posts on the flag alone) and --no-post hides that option."
    : "";
  return `Review the current diff, or a PR number/branch/path target, for correctness bugs (plus reuse/simplification/efficiency cleanups where the model's recipe covers them) at the effort level given first, before any target (${REVIEW_LEVELS.join("|")}: from few high-confidence findings to many, some uncertain${ultraSuffix}); with no level given, it reuses the level you typed last. Pass --comment to post findings as inline PR comments, or --fix to apply them to the working tree after the review. Pass --max-findings <n> to report up to n findings, or --max-findings all for every finding. The choice stays until you pass --max-findings default.${postSuffix}`;
}
//@ chunk-hantmvxa.js:87082-87521 placement
function getReviewWhenToUse() {
  return isUltrareviewAvailable()
    ? "Use the max or ultra level only when the user, or instructions such as CLAUDE.md or a skill, explicitly ask for one, never on your own judgment: they are the costliest reviews and start many reviewer subagents."
    : "Use the max level only when the user, or instructions such as CLAUDE.md or a skill, explicitly ask for it, never on your own judgment: it is the costliest level and starts many reviewer subagents.";
}
//@ chunk-hantmvxa.js:87521-87660 placement
function reviewArgumentHint() {
  return `[${isUltrareviewAvailable() ? `${REVIEW_LEVELS.join("|")}|ultra` : REVIEW_LEVELS.join("|")}] [--fix] [--comment] [<pr#>|<branch>|<path>] [--max-findings <n>|all]`;
}
//@ chunk-hantmvxa.js:87660-89673 placement
/**
 * /code-review 主体：解析参数、选择等级与模型、拼装分阶段多代理审查提示词（含发帖/修复/上限说明）。
 */
async function buildReviewPrompt(args, context) {
  let reviewArgs = parseReviewArgs(args);
  let { explicit, target, comment, fix, post, unrecognizedLevel, ultraFallback } = reviewArgs;
  let lastUsedLevel = defaultReviewLevel(reviewArgs, context);
  let reviewEffort = resolveReviewEffort(reviewArgs, context);
  let mainLoopModel = context.options ? getMainLoopModel(context) : undefined;
  let modelKey = normalizeReviewModelKey(mainLoopModel);
  let effectiveModelKey =
    context.options?.isSkillPreload && MODELS_WITH_MAX_CELL.has(modelKey) ? "default" : modelKey;
  let levelConfig = REVIEW_LEVEL_TABLE_BY_MODEL[effectiveModelKey][reviewEffort];
  let reportFindingsMode = getReportFindingsMode(context);
  let hasReportTool = reportFindingsMode !== undefined;
  let willRunAsFork = !hasReportTool;
  let outputSectionBuilder = hasReportTool ? buildReportFindingsOutputSection : buildReviewOutputSection;
  let maxFindings = resolveMaxFindings(reviewArgs, levelConfig.cell, hasReportTool, context);
  let isMinimalCell = levelConfig.cell === "o5-bmin";
  let afterReviewNote =
    reportFindingsMode === "spawn" && !levelConfig.measuredExternal ? await afterReviewSection(context) : "";
  let targetFirstLine = firstLineOf(target, " ");
  let isGitLabTarget = isGitLabMrTarget(targetFirstLine);
  let reviewPreamble = buildReviewPreamble({
    ultraFallback,
    fix,
    post,
    comment,
    gitlabTarget: isGitLabTarget,
    unrecognizedLevel,
    lastUsed: lastUsedLevel,
    level: reviewEffort,
    willRunAsFork,
    context,
  });
  let maxFindingsNote = describeMaxFindings(
    {
      ...maxFindings,
      ignored: reviewArgs.maxFindingsIgnored,
    },
    "the user",
  );
  let resetHint = maxFindings.reused
    ? "passing `--max-findings default` goes back to the usual limit"
    : undefined;
  let maxFindingsSection = !maxFindingsNote
    ? ""
    : willRunAsFork
      ? `(${maxFindingsNote} Open your report with one short line telling the user this${resetHint ? `, and that ${resetHint}` : ""}; that opening line reaches them with the findings.)

`
      : `(${maxFindingsNote} Tell the user this in one short line as you begin${resetHint ? `, including that ${resetHint}` : ""}.)

`;
  let canSpawnFinders = canSpawnReviewAgents(context);
  let promptState = null;
  let finderBudget = {
    text: "",
  };
  if (!context.options?.isSkillPreload) {
    if (canSpawnFinders)
      finderBudget = await estimateFinderBudgetHint(mainLoopModel, reviewEffort, target, promptState);
    let threadedLevel = explicit ?? lastUsedLevel;
    logEvent("tengu_code_review_routed", {
      effort_level: fromEnum(reviewEffort),
      effort_source: fromEnum(
        explicit !== undefined
          ? "explicit"
          : lastUsedLevel !== undefined
            ? "last_used"
            : ultraFallback
              ? "ultra_fallback"
              : "session",
      ),
      routed_to_workflow: false,
      uses_report_findings_tool: hasReportTool,
      has_fix: fix,
      has_comment: comment,
      has_target: target.length > 0,
      is_ultra_fallback: ultraFallback,
      low_variant:
        reviewEffort === "low" ? fromEnum(REVIEW_CELL_OVERRIDES[effectiveModelKey] ?? "default") : undefined,
      model_family: fromEnum(effectiveModelKey),
      finder_budget: finderBudget.budget,
      agent_tool_available: canSpawnFinders,
      threaded_effort:
        threadedLevel !== undefined
          ? fromEnum(resolveLevelEffort(effectiveModelKey, threadedLevel))
          : undefined,
      findings_limit: fromEnum(
        maxFindings.stated === undefined ? "default" : maxFindings.stated === "all" ? "all" : "number",
      ),
      findings_limit_value: typeof maxFindings.stated === "number" ? maxFindings.stated : undefined,
    });
  }
  let ultraTip =
    context.options?.isSkillPreload ||
    context.agentId !== undefined ||
    ultraFallback ||
    willRunAsFork ||
    levelConfig.measuredExternal
      ? null
      : ultrareviewProseTip(context.storageV5, context.credentials);
  let ultraTipSection =
    ultraTip !== null
      ? `

After you finish the review, end your response with this exact line on its own:
${ultraTip}`
      : "";
  let targetSection = target
    ? `Review target: \`${target}\`

`
    : "";
  let preamble = promptState?.preamble ?? "";
  return [
    {
      type: "text",
      text: `${reviewPreamble}${maxFindingsSection}${targetSection}${preamble}${finderBudget.text}${buildReviewPromptForLevel(levelConfig.cell, outputSectionBuilder, canSpawnFinders, hasReportTool, maxFindings.stated)}${comment ? (isGitLabTarget ? buildGitLabCommentSection(targetFirstLine) : GITHUB_COMMENT_SECTION) : ""}${fix ? buildFixSection(hasReportTool) : ""}${hasReportTool && !isMinimalCell ? REPORT_OUTCOMES_LATER_SECTION : ""}${reportFindingsMode === "message" && !isMinimalCell ? REPORT_OUTCOMES_LINE_TEXT : ""}${afterReviewNote}${ultraTipSection}`,
    },
  ];
}
//@ chunk-hantmvxa.js:89673-90366 placement
async function estimateFinderBudgetHint(model, reviewEffort, target, countDiffLinesFn) {
  if (!REVIEW_LEVEL_TABLE_BY_MODEL[normalizeReviewModelKey(model)][reviewEffort].finderBudgetHint)
    return {
      text: "",
    };
  let diffLineCount = countDiffLinesFn
    ? target
      ? undefined
      : await countDiffLinesFn.countDiffLines()
    : await countDiffLines(target);
  if (diffLineCount === undefined)
    return {
      text: "",
    };
  let max = Math.max(2, Math.min(8, Math.ceil(diffLineCount / 150)));
  if (!target && !countDiffLinesFn)
    return {
      text: `The committed diff (@{upstream}...HEAD) is about ${diffLineCount} lines. Uncommitted changes aren't counted here, so treat this as a floor \u2014 start with about ${max} finder subagents (min 2, max 8) and scale up if Phase 0 finds additional working-tree scope.

`,
      budget: max,
    };
  return {
    text: `This diff is about ${diffLineCount} lines. Spawn about ${max} finder subagents (min 2, max 8) \u2014 scale your investigation depth to the diff size rather than using a fixed large fleet.

`,
    budget: max,
  };
}
//@ chunk-hantmvxa.js:90366-91018 placement
async function countDiffLines(target) {
  let range;
  if (!target) range = "@{upstream}...HEAD";
  else if (target.length <= 256 && /^[@\w][@\w./~^-]*\.\.\.?[@\w][@\w./~^-]*$/.test(target)) range = target;
  else return;
  try {
    let { stdout, code } = await execFileNoThrow(
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
        range,
        "--",
      ],
      {
        timeout: 5000,
        useCwd: true,
        env: {
          ...getRemoteHostSessionCount(),
          [["SELF_HOSTED", "RUNNER_POOL_SECRET"].join("_")]: undefined,
          [["SELF_HOSTED", "RUNNER_ENVIRONMENT_SECRET"].join("_")]: undefined,
        },
      },
    );
    if (code !== 0) return;
    let totalLines = 0;
    for (let line of stdout.split(`
`)) {
      let match = line.match(/^(\d+)\t(\d+)\t/);
      if (match) totalLines += Number(match[1]) + Number(match[2]);
    }
    return totalLines > 0 ? totalLines : undefined;
  } catch {
    return;
  }
}
//@ chunk-hantmvxa.js:91018-91215 placement
function resolveReviewEffort(reviewArgs, context) {
  let { explicit, ultraFallback } = reviewArgs;
  let levelGuess = ultraFallback ? "max" : (explicit ?? defaultReviewLevel(reviewArgs, context));
  let mainLoopModel = context.options ? getMainLoopModel(context) : undefined;
  let resolvedEffort = mainLoopModel
    ? (resolveEffortValue(mainLoopModel, getEffortValue(context), {
        turnEffort: levelGuess ?? getEffortLayerOverride(context.permissionLayers),
      }) ?? levelGuess)
    : (levelGuess ?? getEffortValue(context));
  return resolvedEffort === undefined ? "medium" : normalizeEffortLevel(resolvedEffort);
}
//@ chunk-hantmvxa.js:91215-93966 placement
function buildReviewPreamble({
  ultraFallback,
  fix,
  post,
  comment,
  gitlabTarget,
  unrecognizedLevel,
  lastUsed,
  level,
  willRunAsFork,
  context,
}) {
  let commentNote = comment
    ? gitlabTarget
      ? "when the target is a GitLab merge request, your `--comment` is what posts the findings as one general MR note via glab"
      : "when the target is a GitHub PR, your `--comment` is what posts the findings as inline PR comments"
    : gitlabTarget
      ? "this local review will not post to GitLab; `--comment` is the flag that posts local findings as a general MR note"
      : "this local review will not post to GitHub; `--comment` is the flag that posts local findings as inline PR comments";
  let withPostNote = (preamble) =>
    post
      ? `${preamble}(The typed \`--post\` applies only to the \`/code-review ultra\` cloud review and was ignored \u2014 ${commentNote}. Tell the user this in one short line.)

`
      : preamble;
  if (ultraFallback) {
    if (!isUltrareviewWithBridge()) {
      if (fix)
        return withPostNote(`(Running a local ${level}-effort review and applying its findings.)

`);
      if (isUltrareviewAvailable()) {
        if (context.options?.isNonInteractiveSession) {
          let authProblem = ultrareviewAuthPrecondition();
          if (authProblem)
            return withPostNote(`(${authProblem} Falling back to a local ${level}-effort review.)

`);
        }
        return withPostNote(`(ultra (cloud review) requires claude.ai account access this session doesn't have \u2014 see https://code.claude.com/docs/en/ultrareview. Falling back to a local ${level}-effort review.)

`);
      }
      return withPostNote(`(ultra (cloud review) isn't available in this environment \u2014 see https://code.claude.com/docs/en/ultrareview. Falling back to a local ${level}-effort review.)

`);
    }
    let hasUltrareviewCommand =
      context.options?.commands?.some(
        (command) => command.name === "ultrareview" && isCommandEnabled(command),
      ) ?? false;
    if (fix)
      return withPostNote(
        hasUltrareviewCommand
          ? `(Claude can't launch the cloud review directly \u2014 type \`/code-review ultra --fix\` to review in the cloud and apply the findings locally when it completes. Running a local ${level}-effort review and applying its findings for now.)

`
          : `(Running a local ${level}-effort review and applying its findings.)

`,
      );
    return withPostNote(
      hasUltrareviewCommand
        ? `(Claude can't launch the cloud review directly \u2014 type \`/code-review ultra\` to run it. Falling back to a local ${level}-effort review for now.)

`
        : `(Claude can't launch the cloud review directly \u2014 the user can run \`claude ultrareview\` from a terminal to start it. Falling back to a local ${level}-effort review for now.)

`,
    );
  }
  let levelHint = "typing a level (for example `/code-review high`) changes it";
  let withLevelHint = (notice) =>
    willRunAsFork
      ? `(${notice} Open your report with one short line telling the user this, and that ${levelHint}; that opening line reaches them with the findings.)

`
      : `(${notice} Tell the user this in one short line as you begin, including that ${levelHint}.)

`;
  if (unrecognizedLevel !== undefined) {
    let ignoredLevelNote = `Ignoring unrecognized effort "${unrecognizedLevel}"; valid: ${REVIEW_LEVELS.join(", ")}. Using ${level}${lastUsed === level ? ", the level the user typed last time" : ""}.`;
    return withPostNote(
      lastUsed !== undefined
        ? withLevelHint(ignoredLevelNote)
        : `(${ignoredLevelNote})

`,
    );
  }
  if (lastUsed !== undefined) {
    let reuseNote = `reusing ${lastUsed}, the level the user typed last time${level !== lastUsed ? `; running at ${level} here` : ""}`;
    return withPostNote(withLevelHint(`No effort level given \u2014 ${reuseNote}.`));
  }
  return withPostNote("");
}
//@ chunk-hantmvxa.js:93966-95240 placement
/**
 * 注册内置 code-review（/review、ultrareview 子命令）技能。
 */
function registerCodeReviewSkill() {
  registerBundledSkill({
    name: CODE_REVIEW,
    aliases: ["review"],
    menuDescription: "Review the current diff or a PR for bugs and cleanups",
    subcommands: {
      ultra: "ultrareview",
    },
    description: getReviewCommandDescription,
    whenToUse: getReviewWhenToUse,
    argumentHint: reviewArgumentHint,
    userInvocable: true,
    getEffort(args, context) {
      let { explicit } = parseReviewArgs(args);
      if (explicit === undefined) return;
      return resolveLevelEffort(
        normalizeReviewModelKey(context?.options ? getMainLoopModel(context) : undefined),
        explicit,
      );
    },
    getDefaultEffort(args, context) {
      let reviewArgs = parseReviewArgs(args);
      let lastUsedLevel = defaultReviewLevel(reviewArgs, context);
      if (lastUsedLevel === undefined) return;
      let level = context ? resolveReviewEffort(reviewArgs, context) : lastUsedLevel;
      let modelKey = normalizeReviewModelKey(context?.options ? getMainLoopModel(context) : undefined);
      let maxFindings = resolveMaxFindings(
        reviewArgs,
        REVIEW_LEVEL_TABLE_BY_MODEL[modelKey][level].cell,
        context !== undefined && getReportFindingsMode(context) !== undefined,
        context,
      );
      let maxFindingsNote = describeMaxFindings(
        {
          ...maxFindings,
          ignored: reviewArgs.maxFindingsIgnored,
        },
        "you",
      );
      return {
        value: resolveLevelEffort(modelKey, lastUsedLevel),
        notice: `${reviewArgs.unrecognizedLevel !== undefined ? `Ignoring unrecognized effort "${reviewArgs.unrecognizedLevel}"; valid: ${REVIEW_LEVELS.join(", ")}. ` : ""}Reusing ${lastUsedLevel} effort, the level you typed last time${level !== lastUsedLevel ? `; running at ${level} here` : ""}. Type a level like \`/code-review high\` to change it.${maxFindingsNote ? ` ${maxFindingsNote}${maxFindings.reused ? " Pass `--max-findings default` to go back to the usual limit." : ""}` : ""}`,
      };
    },
    onUserTypedArgs(args, context) {
      let { explicit, maxFindings } = parseReviewArgs(args);
      if (explicit !== undefined) saveReviewEffort(explicit, context.storageV5);
      if (maxFindings !== undefined) {
        let storedLimit = maxFindings === "default" ? undefined : maxFindings;
        saveGlobalConfig(
          (config) =>
            config.codeReviewLastMaxFindings === storedLimit
              ? config
              : {
                  ...config,
                  codeReviewLastMaxFindings: storedLimit,
                },
          context.storageV5,
        );
      }
    },
    getContext(args, context) {
      if (isCoordinatorMode_2()) return "inline";
      if (getReportFindingsMode(context) !== undefined) return "inline";
      return "fork";
    },
    formatForegroundForkResult: formatReviewOutput,
    getPromptForCommand: buildReviewPrompt,
  });
}
export { registerCodeReviewSkill };
