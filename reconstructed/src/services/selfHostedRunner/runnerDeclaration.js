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
var DECLARES_DIFF_FINDS_NESTED_REPOSITORY = "diff-finds-nested-repository",
  DECLARES_NO_REPOSITORY_CHECKED_OUT = "no-repository-checked-out";
//@ chunk-5x3g79tf.js:288-343 placement
function runnerDeclarationArgument(e) {
  return "--runner-declares=" + e.join(",");
}
/**
 * 解析 --runner-declares 参数（self-hosted runner 声明的能力）。
 */
//@ chunk-5x3g79tf.js:343-744 placement
async function adoptRunnerDeclaration(e) {
  if (!e.startsWith("--runner-declares=")) return;
  let parts = e.slice(18).split(","),
    included = parts.includes("diff-finds-nested-repository"),
    t = !1;
  if (!included && !t) return;
  let {
    setRunnerDeclaredFreshMachinePerSession: setRunnerDeclaredFreshMachinePerSession,
    setRunnerDeclaredNestedRepositoryDiff: setRunnerDeclaredNestedRepositoryDiff,
    setRunnerDeclaredNoRepositoryCheckedOut: setRunnerDeclaredNoRepositoryCheckedOut,
  } = await import("./chunk-nj7t53r7.js");
  if (included) {
    if ((setRunnerDeclaredNestedRepositoryDiff(!0), parts.includes("no-repository-checked-out")))
      setRunnerDeclaredNoRepositoryCheckedOut(!0);
  }
  if (t) setRunnerDeclaredFreshMachinePerSession(!0);
}

export {
  DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
  DECLARES_NO_REPOSITORY_CHECKED_OUT,
  runnerDeclarationArgument,
  RUNNER_DECLARES_ARG_KEY,
};
