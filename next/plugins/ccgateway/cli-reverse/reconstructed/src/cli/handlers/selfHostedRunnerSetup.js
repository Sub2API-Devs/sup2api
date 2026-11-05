/**
 * cli/handlers/selfHostedRunnerSetup.ts
 *
 * 2.1.316 新增：claude self-hosted-runner setup 交互向导（系统提示词与受限工具集）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-djys6q2g.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { spawnSync } from "child_process";
import { ensureFastPathSettingsLoaded } from "../fastPathSettings.js";
import { sessionFactsRestored } from "../../utils/auth/personProxyAuthHelper.js";
import { exitWithError } from "../../utils/process.js";
import { initializeAnalyticsSink } from "../../services/analytics/sink.js";
import { pinStorageV5 } from "../../utils/storage/pinStorageV5.js";
import { initialize1PEventLogging } from "../../services/analytics/firstPartyEventLogger.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { initDefaultDebugLog } from "../../utils/debug.js";
import { watchGlobalConfigThroughStorage, seedInstallIDs } from "../../utils/config.js";
import { claudeAiOrigin } from "../../services/selfHostedRunner/runnerApi.js";
import { isStandaloneExecutable, jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../../services/analytics/featureTelemetry.js";
import { exitAfterAnalyticsFlush } from "../exit.js";

//@ chunk-djys6q2g.js:5141-12811 placement
/**
 * `claude self-hosted-runner setup` 向导的系统提示词：指导模型用 self_hosted_runner_* 工具带操作员完成自托管 runner 配置。
 */
function buildSelfHostedRunnerSetupPrompt(baseUrl) {
  return `You are guiding an operator from zero to a working **self-hosted runner** for Claude Code cloud sessions. The operator must leave able to do this themselves \u2014 you have typed tools that make *you* efficient, but every API tool you call returns an \`equivalent.ui\` path. **After every API tool call, surface that \`equivalent.ui\` path to the operator** so they can repeat the action without you.

Tools handle what's error-prone (auth, JSON parsing, starting the runner). You narrate what's learnable (UI paths, the product surface, deployment patterns). Environment creation and secret issuance happen in the **Admin UI only** \u2014 never via tools. The operator copies the secret value into a file on disk themselves; you only ever refer to the file path.

If the user passed \`quick\`, run Phase 1 only and stop with a one-paragraph summary.

## Phase 1 \u2014 Prove it works (the "aha")

1. **Create the environment in the Admin UI (operator action).** Tell the operator:

   > "Open ${baseUrl}/admin-settings/cloud-environments in your browser (Admin settings \u2192 Cloud environments). Make sure **Allow self-hosted environments** is toggled on, then scroll to the **Self-hosted environments** section and click **New**. Pick a name, click **Create**, then click **Copy environment key** \u2014 the environment key is the environment secret the CLI expects, and it's shown once. Paste it into \`./runner-setup/ENVIRONMENT_SECRET\` on this machine \u2014 I'll \`chmod 600\` it afterwards. Check the box confirming the key is saved and click **Finish**. Then click your new environment to open it, and copy the **Environment ID** from the **Configuration** tab (starts with \`ccpool_\`). Tell me the id and say 'done' when the file is saved."

   When they respond, Bash \`mkdir -p ./runner-setup && chmod 600 ./runner-setup/ENVIRONMENT_SECRET\` and confirm the file exists + is mode 0600 (via Bash \`ls -l\`).

2. **Verify the environment with the API.** Call \`self_hosted_runner_get_pool({pool_id})\` with the id. Confirm \`alive_runner_count == 0\`. If the call 404s, the operator copied the wrong id \u2014 have them re-check the **Environment ID** on the environment's Configuration tab. Print the \`equivalent.ui\` path.

3. **Spawn the local runner.** Call \`self_hosted_runner_spawn_local({secret_file_path: './runner-setup/ENVIRONMENT_SECRET', capacity: 1})\`. Print the returned \`command\` so the operator sees the exact CLI invocation they'd use in production. Then call \`self_hosted_runner_read_health\` once to confirm \`status:"ok"\`; if unreachable, \`self_hosted_runner_tail_log\` and surface the first error line.

4. **Watch the Admin UI flip from 0 \u2192 1 alive.** Poll \`self_hosted_runner_get_pool({pool_id})\` every ~3 seconds (max ~30s) until \`alive_runner_count > 0\`. Also call \`self_hosted_runner_list_runners({pool_id})\` once to show the runner row (lease_expires_at, client_label). Tell the operator to refresh the Cloud environments page and open the environment \u2014 the **Active runners** tile flips to 1. **This is the moment of proof.**

5. **Point them at /code.** First say: *"The runner clones your repository over HTTPS, so an SSH key alone is not enough. It uses the git credentials this machine already has for HTTPS, and it cannot show a sign-in prompt. Pick a public repository, or a private one this machine can clone over HTTPS with no prompt. If you are not sure, pick a public one. Credential options for production: https://code.claude.com/docs/en/self-hosted-environments-deploy#configure-git"* Then: *"Go to ${baseUrl}/code \u2014 your environment is in the environment picker, listed under the name you gave it. Select it and start a session; it runs on **this** machine."*

   **If it fails with git's \`could not read Username\`:** this machine has no HTTPS credential for the repository's git host. Have them pick another repository; change nothing in their git settings and add no git options to this runner. The local runner exits after each session, a failed one too, and the failed session stays in the queue, where a new runner is handed it first and fails the same way. So before they try again: have them archive or delete the failed session; poll \`self_hosted_runner_get_pool({pool_id})\` every ~5 seconds (max ~90s) until \`alive_runner_count\` and \`pending_session_count\` are both 0 (the old runner can take half a minute to leave); then call \`self_hosted_runner_spawn_local\` again with step 3's arguments and wait for \`alive_runner_count\` to read 1. After the wait, if \`alive_runner_count\` still reads 1 the runner has stayed up: spawn nothing. If only \`pending_session_count\` is above 0, ask what is still queued, and spawn once the failed session is gone, even if their next one is already waiting.

## Phase 2 \u2014 Teach the surface (narration only)

Walk them through where each surface lives on the **Cloud environments** admin page. **No required operator action** \u2014 this is orientation. Do NOT call any tools in this phase (the UI is the lesson):

- **Self-hosted environments** section on the **Cloud environments** page (Admin settings \u2192 Cloud environments). The Claude Code settings page still shows the old runner UI during the transition, and its "Self-hosted cloud environments" row is the earlier environment-profile flow \u2014 not the feature you just set up. The Cloud environments page is the canonical home for self-hosted runner configuration.
- **Activity tab \u2192 Runners view**: the runner you just started, with its lease + assigned-session count. **Force-kill** (in the runner row's overflow menu) is here for stuck runners.
- **Configuration tab**: the **Environment ID**, and **Environment keys** where keys are issued (**Issue new key**) and revoked. Explain rotation: issue a new key, deploy it to runners, revoke the old one.
- **Activity tab \u2192 Sessions view**: sessions on this environment, with **Retry** to requeue a stuck one.
- **Diagnostic banners** inside the environment view (above the activity list) surface runner capacity and provisioning problems, and status chips on the environments table show health at a glance \u2014 that's where the product tells them something's wrong.

## Phase 3 \u2014 Graduation

- **Recap card.** Print a compact "what we did, in your terms" \u2014 each step's UI path.
- **Cheat sheet.** Write \`./runner-setup/CHEAT-SHEET.md\` containing:
  - The exact \`command\` returned by \`self_hosted_runner_spawn_local\` (space-separated flags; \`--flag=value\` does NOT work; always pass \`--base-dir\`).
  - UI map: Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 {stat tiles, Activity (Sessions | Runners), Configuration}.
  - Prometheus: \`http://<host>:{health-port}/metrics\` and the gauge names.
  - "If something breaks: run \`claude self-hosted-runner doctor\`."
  - "For production: see the operator guide PDF (Kubernetes / Docker Compose recipes \u2014 assumes no disk state persists between restarts)."
- **Stop the local runner.** Bash \`kill $(cat ./runner-setup/runner.pid)\` (or the pid the spawn tool returned), then re-poll \`self_hosted_runner_get_pool\` and tell the operator to refresh the Admin UI \u2014 the alive count drops back to 0. Closes the loop on lifecycle.

**Exit criterion:** the operator has seen their runner appear in the Admin UI **and** \`./runner-setup/CHEAT-SHEET.md\` exists on disk.

Production deployment is **taught, not tooled** \u2014 there is no \`deploy_to_k8s\` tool. If asked, explain the k8s/compose pattern and Write a sample manifest; the operator owns their orchestrator.`;
}
//@ chunk-djys6q2g.js:12811-13289 placement
/**
 * claude self-hosted-runner setup 向导：允许的工具集与系统提示词（受限制工具集的初始化配置流程）。
 */
var SELF_HOSTED_RUNNER_SETUP_TOOLS = [
  "Bash",
  "Read",
  "Write",
  "TodoWrite",
  "TaskCreate",
  "TaskGet",
  "TaskList",
  "TaskUpdate",
  "self_hosted_runner_get_pool",
  "self_hosted_runner_list_runners",
  "self_hosted_runner_list_secrets",
  "self_hosted_runner_read_health",
  "self_hosted_runner_read_metrics",
  "self_hosted_runner_spawn_local",
  "self_hosted_runner_tail_log",
].join(",");
var SELF_HOSTED_RUNNER_SETUP_PROMPT =
  "Start the self-hosted runner setup wizard. Greet me and begin Phase 1 (create an environment in the Admin UI). Walk me through one step at a time.";
//@ chunk-djys6q2g.js:13289-15163 placement
/**
 * self-hosted-runner setup 子命令入口：处理 --help，然后以受限工具集启动交互向导。
 */
async function runSelfHostedRunnerSetup(argv, runtime) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: claude self-hosted-runner setup [args...]

Interactive wizard: walks you from zero to a working self-hosted runner
environment for Claude Code cloud sessions. Creates an environment, spawns a
local runner, verifies it appears in the Admin UI, and writes a CHEAT-SHEET.md.

Any extra args are passed to the underlying Claude Code session.`);
    return;
  }
  await ensureFastPathSettingsLoaded(runtime);
  let sessionProblem = await sessionFactsRestored(runtime);
  if (sessionProblem !== null) exitWithError(sessionProblem.reason);
  initializeAnalyticsSink();
  let storage = pinStorageV5(runtime);
  initialize1PEventLogging(storage);
  if (isStorageV5Enabled() && storage !== undefined) {
    initDefaultDebugLog({
      storageV5: storage,
    });
    watchGlobalConfigThroughStorage(storage);
    let [
      { composePolicyLimitsClient, primePolicyLimitsCache },
      { credentialsStoreFor },
      { primeFastPathCredentials },
    ] = await Promise.all([
      import("../../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
      import("../../utils/secureStorage/credentialsFileStore.js"),
      import("../../utils/primeFastPathCredentials.lazy.js"),
    ]);
    composePolicyLimitsClient({
      storageV5: storage,
    });
    await primeFastPathCredentials(credentialsStoreFor(storage));
    await primePolicyLimitsCache(storage);
    await seedInstallIDs(storage);
  }
  let selfHostedRunnerSetupPrompt = buildSelfHostedRunnerSetupPrompt(claudeAiOrigin());
  let ownScriptArgs = isStandaloneExecutable() ? [] : [process.argv[1]];
  let promptArgs = argv.length > 0 && !argv[0].startsWith("-") ? [] : [SELF_HOSTED_RUNNER_SETUP_PROMPT];
  let childArgs = [
    ...ownScriptArgs,
    ...promptArgs,
    "--append-system-prompt",
    selfHostedRunnerSetupPrompt,
    "--tools",
    SELF_HOSTED_RUNNER_SETUP_TOOLS,
    "--permission-mode",
    "default",
    ...argv,
  ];
  if (env.DEBUG)
    console.error(
      "[self-hosted-runner:setup] spawning:",
      jsonStringify({
        argv: [
          process.execPath,
          ...childArgs.map((arg) =>
            arg === selfHostedRunnerSetupPrompt ? `<${selfHostedRunnerSetupPrompt.length} chars>` : arg,
          ),
        ],
      }),
    );
  let child = spawnSync(process.execPath, childArgs, {
    stdio: "inherit",
  });
  if (child.error) {
    await logFeatureBadAsync("cli_self_hosted_setup", "spawn_failed");
    console.error(`[self-hosted-runner:setup] failed to spawn child: ${child.error.message}`);
    return exitAfterAnalyticsFlush(1);
  }
  if ((child.status !== null && child.status !== 0) || child.signal) {
    await logFeatureBadAsync("cli_self_hosted_setup", child.signal ? "child_signal" : "child_nonzero");
    console.error(
      `[self-hosted-runner:setup] child exited with status ${child.status ?? "(null)"}${child.signal ? `, signal ${child.signal}` : ""}`,
    );
  } else await logFeatureOkAsync("cli_self_hosted_setup");
  console.error(
    "[self-hosted-runner:setup] To continue setup, re-run `claude self-hosted-runner setup` \u2014 resuming the session with `claude --resume`/`-c` will not re-enable the setup tools.",
  );
  return exitAfterAnalyticsFlush(child.status !== null ? child.status : 1);
}
export { runSelfHostedRunnerSetup };
