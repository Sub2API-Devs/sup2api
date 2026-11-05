/**
 * commands/project/projectCommand.ts
 *
 * /project 命令：设置、清除、--save 到 localSettings 的 claude.ai Project 归属，并给出各种不可用原因（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y6cabgnn.js (8)
 * attribution: placement 8
 */
import {
  currentAttributionProject,
  resolveAttributionProject,
  normalizeAttributionProjectId,
} from "../../utils/attributionProject.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { tildify } from "../../utils/path.js";
import {
  getSettingsFilePathForSource,
  getSettingsForSource,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import {
  sourceLabel,
  projectOriginLabel,
  attributionSourceLabel,
} from "../../utils/status/attributionProjectNotice.js";
import { getFlagSettingsInline, setFlagSettingsInline } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";

//@ chunk-y6cabgnn.js:3755-3950 placement
var SAVE_FLAG = "--save";
var CANNOT_APPLY =
  "Claude Code couldn't apply that Project here. Set CLAUDE_CODE_ATTRIBUTION_PROJECT when you start it instead.";
var PROJECT_URL_PATTERN = /^(?:https:\/\/)?claude\.ai\/project\/([^/?#]+)\/?(?:[?#].*)?$/i;
//@ chunk-y6cabgnn.js:3950-6344 placement
/**
 * /project 命令主体：解析参数，写/清 localSettings 的 attributionProject，并给出不可用原因。
 */
async function runProjectCommand(args, ctx) {
  let filtered = args.split(/\s+/).filter((arg) => arg !== "");
  let included = filtered.includes(SAVE_FLAG);
  let [projectArg, ...extra] = filtered.filter((arg) => arg !== SAVE_FLAG);
  let canSave = !ctx.options.isNonInteractiveSession;
  let current = currentAttributionProject();
  if (current === undefined)
    return textResult(
      "This session can't name a Project. That needs your claude.ai login, a direct connection to Anthropic and no cloud session, with CLAUDE_CODE_ATTRIBUTION_HEADER not set to 0.",
    );
  if (extra.length > 0 || (projectArg === undefined && included))
    return textResult(`Nothing changed. ${usageHint(current, canSave)}`);
  if (projectArg === undefined)
    return textResult(
      `${currentProjectText(current)} ${blockedHint(current) ?? usageHint(current, canSave)}`,
    );
  let replaced = stripControlChars(
    tildify(getSettingsFilePathForSource("localSettings") ?? sourceLabel("local")),
  ).replace(/[\t\n\r]+/g, " ");
  if (included && !canSave)
    return textResult(
      `--save isn't available in this kind of session, so nothing changed. To change a saved Project, edit attributionProject in ${replaced}.`,
    );
  if (projectArg === "clear") {
    let fromFlag = getFlagSettingsInline()?.attributionProject !== undefined;
    setFlagAttributionProject(undefined);
    let saveNote;
    if (included)
      if (getSettingsForSource("localSettings")?.attributionProject === undefined)
        saveNote = `No Project is saved in ${replaced}.`;
      else if (await saveAttributionProject(undefined, ctx.storageV5))
        saveNote = `Removed the Project from ${replaced}.`;
      else
        saveNote = `Couldn't remove the Project from ${replaced}. Check that it holds valid JSON and that you can write to it, then try again.`;
    let resolved = resolveAttributionProject();
    let clearedNote = fromFlag
      ? "Removed the Project set with /project."
      : included
        ? undefined
        : "/project hadn't set a Project, so nothing changed.";
    let hint =
      blockedHint(resolved) ??
      (resolved.project?.source === "local" && canSave && !included
        ? "To remove it, run /project clear --save."
        : undefined);
    return textResult(
      [clearedNote, saveNote, currentProjectText(resolved), hint]
        .filter((part) => part !== undefined)
        .join(" "),
    );
  }
  let attributionProject = PROJECT_URL_PATTERN.exec(projectArg)?.[1] ?? projectArg;
  if (normalizeAttributionProjectId(attributionProject) === undefined)
    return textResult(
      "That isn't a Project /project can use, so nothing changed. Use a claude.ai Project whose address looks like https://claude.ai/project/<ID>, or its ID.",
    );
  let attributionProject_2 = getFlagSettingsInline()?.attributionProject;
  setFlagAttributionProject(attributionProject);
  let resolved;
  try {
    resolved = resolveAttributionProject();
  } catch (error) {
    setFlagAttributionProject(attributionProject_2);
    logForDebugging(`/project: reading back failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return textResult(`Project not changed. ${CANNOT_APPLY}`);
  }
  if (resolved.project?.source !== "flag" || resolved.written !== attributionProject) {
    setFlagAttributionProject(attributionProject_2);
    let why = blockedHint(resolved) ?? CANNOT_APPLY;
    return textResult(`Project not changed. ${currentProjectText(resolved)} ${why}`);
  }
  let applied = `This session now names claude.ai Project ${attributionProject} for usage reports`;
  if (!included) {
    let persistHint = canSave
      ? `To keep it for this folder, run /project ${attributionProject} --save.`
      : "A one-shot claude -p run ends before any request uses this, so set CLAUDE_CODE_ATTRIBUTION_PROJECT for those.";
    return textResult(`${applied}, until Claude Code restarts. ${persistHint}`);
  }
  return textResult(
    (await saveAttributionProject(attributionProject, ctx.storageV5))
      ? `${applied}. Saved in ${replaced}, which every session in this folder reads.`
      : `${applied}, until Claude Code restarts. Couldn't save it in ${replaced}, so new sessions in this folder won't use it. Check that it holds valid JSON and that you can write to it, then try again.`,
  );
}
//@ chunk-y6cabgnn.js:6344-6386 placement
function textResult(value) {
  return {
    type: "text",
    value,
  };
}
//@ chunk-y6cabgnn.js:6386-6757 placement
/**
 * 提示如何设置或清除 Project 的用法文案。
 */
function usageHint(current, interactive) {
  let hint = interactive
    ? "Run /project <Project ID or claude.ai address> to set a Project, and add --save to keep it for this folder."
    : "Run /project <Project ID or claude.ai address> to set a Project.";
  if (getFlagSettingsInline()?.attributionProject !== undefined)
    return `${hint} Run /project clear to remove it.`;
  return current.project?.source === "local" && interactive
    ? `${hint} Run /project clear --save to remove it.`
    : hint;
}
//@ chunk-y6cabgnn.js:6757-7089 placement
/**
 * 说明当前会话命名/未命名 Project 的状态。
 */
function currentProjectText(resolved) {
  let project = projectOriginLabel(resolved);
  if (project !== undefined)
    return `This session names claude.ai Project ${project.name} for usage reports (${project.origin}).`;
  let [ignored] = resolved.ignored;
  return ignored === undefined
    ? "This session names no claude.ai Project for usage reports."
    : `This session names no claude.ai Project for usage reports (skipped ${attributionSourceLabel(ignored)}, which isn't a Project ID).`;
}
//@ chunk-y6cabgnn.js:7089-7436 placement
/**
 * 说明 harness 变量或托管设置挡住 /project 的原因。
 */
function blockedHint(resolved) {
  if (resolved.project?.source === "harness")
    return "That variable was set when Claude Code started and takes precedence over /project. To use /project, start Claude Code without it.";
  if (getSettingsForSource("policySettings")?.attributionProject !== undefined)
    return "Managed settings stop /project from setting a Project. Ask your administrator to change them.";
  return;
}
//@ chunk-y6cabgnn.js:7436-7573 placement
function setFlagAttributionProject(attributionProject) {
  let { attributionProject: attributionProject_2, ...rest } = getFlagSettingsInline() ?? {};
  let next =
    attributionProject === undefined
      ? rest
      : {
          ...rest,
          attributionProject,
        };
  setFlagSettingsInline(Object.keys(next).length > 0 ? next : null);
  invalidateCommandNames();
}
//@ chunk-y6cabgnn.js:7573-7748 placement
async function saveAttributionProject(attributionProject, storageV5) {
  let { error } = await updateSettingsForSource(
    "localSettings",
    {
      attributionProject,
    },
    undefined,
    storageV5,
  );
  if (error !== null)
    logForDebugging(`/project: saving failed: ${errorMessage(error)}`, {
      level: "error",
    });
  return error === null;
}
export { runProjectCommand };
