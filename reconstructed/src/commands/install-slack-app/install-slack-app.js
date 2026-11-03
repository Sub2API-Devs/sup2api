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
import { fi } from "../../utils/browser.js";

/**
 * SLACK_APP_URL：同旧版。
 */
//@ chunk-xarcg2hx.js:3378-3435 fingerprint = SLACK_APP_URL (1)
var SLACK_APP_URL = "https://slack.com/marketplace/A08SF47R6P4-claude";
/**
 * /install-slack-app 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-xarcg2hx.js:3435-3748 fingerprint = call (1)
async function call(args, context) {
  if (
    (logEvent("tengu_install_slack_app_clicked", {}),
    await saveGlobalConfig(
      (current) => ({ ...current, slackAppInstallCount: (current.slackAppInstallCount ?? 0) + 1 }),
      context.storageV5,
    ),
    await fi(SLACK_APP_URL))
  )
    return { type: "text", value: "Opening Slack app installation page in browser\u2026" };
  else return { type: "text", value: `Couldn't open browser. Visit: ${SLACK_APP_URL}` };
}
