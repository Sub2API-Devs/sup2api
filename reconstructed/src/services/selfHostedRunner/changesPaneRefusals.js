/**
 * services/selfHostedRunner/changesPaneRefusals.ts
 *
 * 2.1.316 新增：自托管 runner 变更面板不显示仓库的原因文本；变更面板设置问题的匹配模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9fcadreh.js (4)
 * attribution: placement 4
 */
import { urlPatternToRegex } from "../../utils/stringUtils.js";

/**
 * 自托管 runner 变更面板不显示仓库的原因文本。
 */
//@ chunk-9fcadreh.js:227-2198 placement
var CHANGES_PANE_PREFIX = "[changes pane] repository not shown:",
  jmo =
    'See the runner option --diff-finds-nested-repository in "claude self-hosted-runner --help" and in the operator guide.',
  Wmo = `${CHANGES_PANE_PREFIX} Further reasons are not shown: eight have been, for this session's process.`,
  Gmo = `${CHANGES_PANE_PREFIX} The runner's first argument did not reach Claude Code in first place, so --diff-finds-nested-repository is off for this session. If a wrapper script or command hook starts Claude Code, it must put nothing before "$@": its own options go after. See "Pass every argument through" in the operator guide.`,
  zmo =
    "The variable in which the runner names the folder for the checked copy of the repository's git settings (CLAUDE_CODE_DIFF_COPY_ROOT) did not reach Claude Code as an absolute path. If a wrapper script or command hook starts Claude Code, it must pass the runner's environment on unchanged.",
  Kmo =
    "The git that Claude Code runs is older than 2.32, or its version could not be read; an older git would follow a .gitattributes or .gitignore committed as a link. Update git to 2.32 or newer.",
  t = urlPatternToRegex("Its own git settings (.git/config or .git/config.worktree)"),
  o = String.raw`"[a-z0-9-]{1,40}(?:\.<\.\.\.>)?\.[a-z0-9-]{1,40}" \(shown in lower case(?:, "<\.\.\.>" for the middle of its name)?\)`,
  s = "commondir|gitdir|reftable",
  n = String.raw`config|config\.worktree|HEAD|packed-refs|shallow`,
  r = "refs|info",
  joined = [
    String.raw`oversized \.git`,
    String.raw`unknown \.git entry`,
    String.raw`no \.git/config or \.git/HEAD`,
    String.raw`symlinked, hardlinked or unexpected \.git/index`,
    String.raw`symlinked or oversized \.git/objects entry`,
    String.raw`\.git/objects/info/alternates`,
    String.raw`config config(?:\.worktree)? unlistable`,
    "a folder that is no longer the one that was checked",
    String.raw`\.git/(?:${s})`,
    String.raw`symlinked or unexpected \.git/(?:${n}|${r}|objects)`,
    String.raw`unreadable, linked or oversized \.git/(?:${n})`,
    String.raw`unreadable, linked or oversized entry under \.git/(?:${r})`,
  ].join("|");
//@ chunk-9fcadreh.js:2198-2254 placement
function DCs(e) {
  return new RegExp(`^(?:${joined})$`).test(e);
}
/**
 * 变更面板设置问题的匹配模式。
 */
//@ chunk-9fcadreh.js:2254-2907 placement
var CHANGES_PANE_SETTING_PATTERNS = [
    `${t} have a setting whose name is not shown: it is too long, or not plain letters, digits and dashes\\.`,
    `${t} have the setting ${o}, which is not one Claude Code accepts there\\.`,
    `${t} give the setting ${o} a value that is not one Claude Code accepts there\\.`,
    `${t} give the setting ${o} a value that runs over several lines\\.`,
    urlPatternToRegex(
      "An unexpected error stopped the check of its .git folder; the session's debug log has the details.",
    ),
    `The check of its \\.git folder stopped at: (?:${joined})\\.`,
    urlPatternToRegex("The check of its .git folder stopped for a reason that is not shown."),
    urlPatternToRegex(zmo),
    urlPatternToRegex(Kmo),
  ],
  regExp = new RegExp(
    `^${urlPatternToRegex(CHANGES_PANE_PREFIX)} (?:${CHANGES_PANE_SETTING_PATTERNS.join("|")}) ${urlPatternToRegex(jmo)}$`,
  );
//@ chunk-9fcadreh.js:2907-2958 placement
function LCs(e) {
  return e === Wmo || e === Gmo || regExp.test(e);
}

export { Gmo, Wmo, CHANGES_PANE_PREFIX, jmo, zmo, Kmo, DCs, LCs };
