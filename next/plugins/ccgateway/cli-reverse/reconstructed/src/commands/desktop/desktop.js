/**
 * commands/desktop/desktop.tsx
 *
 * /desktop 实现：把当前会话交接给 Claude Desktop
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/desktop/desktop.tsx
 * pieces: chunk-nj7rp16y.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAccepted } from "../../utils/codeMode/accepted.js";
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { CODE_MODE_EXPERIMENTAL_LABEL } from "../../constants/codeMode.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DesktopHandoff, nullRef } from "../../components/DesktopHandoff.js";
import { submittedMessages } from "../../utils/promptSubmissionOrigin.js";

//@ chunk-nj7rp16y.js:19487-19699 callgraph-fingerprint (2.1.88 match: call, 0.155)
async function call(onDone, context) {
  if (isAccepted() && isCodeModeEnabled()) {
    onDone(
      `This session is in ${CODE_MODE_EXPERIMENTAL_LABEL}, which Claude Desktop can't use yet, so it stays here.`,
      {
        display: "system",
      },
    );
    return null;
  }
  return jsxProd_default(DesktopHandoff, {
    onDone,
    handoff: nullRef(),
    getTranscript: () => submittedMessages(context),
  });
}
export { call };
