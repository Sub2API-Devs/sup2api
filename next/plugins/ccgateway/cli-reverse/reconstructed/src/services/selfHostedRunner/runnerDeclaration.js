/**
 * services/selfHostedRunner/runnerDeclaration.ts
 *
 * 2.1.316 新增。解析 --runner-declares 参数（self-hosted runner 声明的能力）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5x3g79tf.js (4)
 * attribution: placement 4
 */

//@ chunk-5x3g79tf.js:191-217 placement
var RUNNER_DECLARES_ARG_KEY = "runner-declares";
//@ chunk-5x3g79tf.js:217-288 placement
var DECLARES_DIFF_FINDS_NESTED_REPOSITORY = "diff-finds-nested-repository";
var DECLARES_NO_REPOSITORY_CHECKED_OUT = "no-repository-checked-out";
//@ chunk-5x3g79tf.js:288-343 placement
function runnerDeclarationArgument(names) {
  return "--runner-declares=" + names.join(",");
}
//@ chunk-5x3g79tf.js:343-744 placement
/**
 * 解析 --runner-declares 参数（self-hosted runner 声明的能力）。
 */
async function adoptRunnerDeclaration(arg) {
  if (!arg.startsWith("--runner-declares=")) return;
  let parts = arg.slice(18).split(",");
  let included = parts.includes("diff-finds-nested-repository");
  let freshMachine = false;
  if (!included && !freshMachine) return;
  let {
    setRunnerDeclaredFreshMachinePerSession,
    setRunnerDeclaredNestedRepositoryDiff,
    setRunnerDeclaredNoRepositoryCheckedOut,
  } = await import("../../bootstrap/state.js");
  if (included) {
    setRunnerDeclaredNestedRepositoryDiff(true);
    if (parts.includes("no-repository-checked-out")) setRunnerDeclaredNoRepositoryCheckedOut(true);
  }
  if (freshMachine) setRunnerDeclaredFreshMachinePerSession(true);
}
export {
  DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
  DECLARES_NO_REPOSITORY_CHECKED_OUT,
  runnerDeclarationArgument,
  RUNNER_DECLARES_ARG_KEY,
  adoptRunnerDeclaration,
};
