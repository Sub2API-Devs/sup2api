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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9fcadreh.js:227-2198 placement
/**
 * 自托管 runner 变更面板不显示仓库的原因文本。
 */
var CHANGES_PANE_PREFIX; // deferred: uses urlPatternToRegex (../../utils/stringUtils.js) of its import cycle while loading; runs once the cycle is complete
var HINT_DIFF_FINDS_NESTED;
var MAX_REASONS_SHOWN_TEXT;
var FIRST_ARG_NOT_FORWARDED_TEXT;
var DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT;
var GIT_TOO_OLD_TEXT;
var GIT_SETTINGS_SUBJECT;
var GIT_SETTING_NAME_SHAPE;
var GIT_COMMON_SUBDIRS;
var GIT_ROOT_FILES;
var GIT_REFS_SUBDIRS;
var joined;
deferInit("chunk-9fcadreh.js:227", () => {
  CHANGES_PANE_PREFIX = "[changes pane] repository not shown:";
  HINT_DIFF_FINDS_NESTED =
    'See the runner option --diff-finds-nested-repository in "claude self-hosted-runner --help" and in the operator guide.';
  MAX_REASONS_SHOWN_TEXT = `${CHANGES_PANE_PREFIX} Further reasons are not shown: eight have been, for this session's process.`;
  FIRST_ARG_NOT_FORWARDED_TEXT = `${CHANGES_PANE_PREFIX} The runner's first argument did not reach Claude Code in first place, so --diff-finds-nested-repository is off for this session. If a wrapper script or command hook starts Claude Code, it must put nothing before "$@": its own options go after. See "Pass every argument through" in the operator guide.`;
  DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT =
    "The variable in which the runner names the folder for the checked copy of the repository's git settings (CLAUDE_CODE_DIFF_COPY_ROOT) did not reach Claude Code as an absolute path. If a wrapper script or command hook starts Claude Code, it must pass the runner's environment on unchanged.";
  GIT_TOO_OLD_TEXT =
    "The git that Claude Code runs is older than 2.32, or its version could not be read; an older git would follow a .gitattributes or .gitignore committed as a link. Update git to 2.32 or newer.";
  GIT_SETTINGS_SUBJECT = urlPatternToRegex("Its own git settings (.git/config or .git/config.worktree)");
  GIT_SETTING_NAME_SHAPE = String.raw`"[a-z0-9-]{1,40}(?:\.<\.\.\.>)?\.[a-z0-9-]{1,40}" \(shown in lower case(?:, "<\.\.\.>" for the middle of its name)?\)`;
  GIT_COMMON_SUBDIRS = "commondir|gitdir|reftable";
  GIT_ROOT_FILES = String.raw`config|config\.worktree|HEAD|packed-refs|shallow`;
  GIT_REFS_SUBDIRS = "refs|info";
  joined = [
    String.raw`oversized \.git`,
    String.raw`unknown \.git entry`,
    String.raw`no \.git/config or \.git/HEAD`,
    String.raw`symlinked, hardlinked or unexpected \.git/index`,
    String.raw`symlinked or oversized \.git/objects entry`,
    String.raw`\.git/objects/info/alternates`,
    String.raw`config config(?:\.worktree)? unlistable`,
    "a folder that is no longer the one that was checked",
    String.raw`\.git/(?:${GIT_COMMON_SUBDIRS})`,
    String.raw`symlinked or unexpected \.git/(?:${GIT_ROOT_FILES}|${GIT_REFS_SUBDIRS}|objects)`,
    String.raw`unreadable, linked or oversized \.git/(?:${GIT_ROOT_FILES})`,
    String.raw`unreadable, linked or oversized entry under \.git/(?:${GIT_REFS_SUBDIRS})`,
  ].join("|");
});
//@ chunk-9fcadreh.js:2198-2254 placement
/**
 * 判断一条消息是否是变更面板设置问题描述。
 */
function matchesJoinedGitIgnorePattern(filePath) {
  return new RegExp(`^(?:${joined})$`).test(filePath);
}
//@ chunk-9fcadreh.js:2254-2907 placement
/**
 * 变更面板设置问题的匹配模式。
 */
var CHANGES_PANE_SETTING_PATTERNS; // deferred: uses CHANGES_PANE_PREFIX of its import cycle while loading; runs once the cycle is complete
var regExp;
deferInit("chunk-9fcadreh.js:2254", () => {
  CHANGES_PANE_SETTING_PATTERNS = [
    `${GIT_SETTINGS_SUBJECT} have a setting whose name is not shown: it is too long, or not plain letters, digits and dashes\\.`,
    `${GIT_SETTINGS_SUBJECT} have the setting ${GIT_SETTING_NAME_SHAPE}, which is not one Claude Code accepts there\\.`,
    `${GIT_SETTINGS_SUBJECT} give the setting ${GIT_SETTING_NAME_SHAPE} a value that is not one Claude Code accepts there\\.`,
    `${GIT_SETTINGS_SUBJECT} give the setting ${GIT_SETTING_NAME_SHAPE} a value that runs over several lines\\.`,
    urlPatternToRegex(
      "An unexpected error stopped the check of its .git folder; the session's debug log has the details.",
    ),
    `The check of its \\.git folder stopped at: (?:${joined})\\.`,
    urlPatternToRegex("The check of its .git folder stopped for a reason that is not shown."),
    urlPatternToRegex(DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT),
    urlPatternToRegex(GIT_TOO_OLD_TEXT),
  ];
  regExp = new RegExp(
    `^${urlPatternToRegex(CHANGES_PANE_PREFIX)} (?:${CHANGES_PANE_SETTING_PATTERNS.join("|")}) ${urlPatternToRegex(HINT_DIFF_FINDS_NESTED)}$`,
  );
});
//@ chunk-9fcadreh.js:2907-2958 placement
/**
 * 判断一条消息是否属于变更面板的问题提示。
 */
function isChangesPaneProblemMessage(message) {
  return (
    message === MAX_REASONS_SHOWN_TEXT || message === FIRST_ARG_NOT_FORWARDED_TEXT || regExp.test(message)
  );
}
export {
  FIRST_ARG_NOT_FORWARDED_TEXT,
  MAX_REASONS_SHOWN_TEXT,
  CHANGES_PANE_PREFIX,
  HINT_DIFF_FINDS_NESTED,
  DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT,
  GIT_TOO_OLD_TEXT,
  matchesJoinedGitIgnorePattern,
  isChangesPaneProblemMessage,
};
