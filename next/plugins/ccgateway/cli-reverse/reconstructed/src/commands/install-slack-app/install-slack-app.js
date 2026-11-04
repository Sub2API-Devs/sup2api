/**
 * commands/install-slack-app/install-slack-app.ts
 *
 * /install-slack-app 实现：打开 Slack 市场页并记录遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-slack-app/install-slack-app.ts
 * pieces: chunk-xarcg2hx.js (2)
 * attribution: fingerprint 2
 */
import { logEvent } from "../../services/analytics/index.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";

//@ chunk-xarcg2hx.js:3378-3435 fingerprint (2.1.88 match: SLACK_APP_URL, 1)
/**
 * SLACK_APP_URL：同旧版。
 */
var SLACK_APP_URL = "https://slack.com/marketplace/A08SF47R6P4-claude";
//@ chunk-xarcg2hx.js:3435-3748 fingerprint (2.1.88 match: call, 1)
/**
 * /install-slack-app 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(args, context) {
  logEvent("tengu_install_slack_app_clicked", {});
  await saveGlobalConfig(
    (current) => ({
      ...current,
      slackAppInstallCount: (current.slackAppInstallCount ?? 0) + 1,
    }),
    context.storageV5,
  );
  if (await openValidatedUrlSucceeded(SLACK_APP_URL))
    return {
      type: "text",
      value: "Opening Slack app installation page in browser\u2026",
    };
  else
    return {
      type: "text",
      value: `Couldn't open browser. Visit: ${SLACK_APP_URL}`,
    };
}
export { call };
