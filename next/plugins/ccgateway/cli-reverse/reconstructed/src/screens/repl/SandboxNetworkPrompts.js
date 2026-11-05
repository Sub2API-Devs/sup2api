/**
 * screens/repl/SandboxNetworkPrompts.ts
 *
 * 2.1.316 新增。沙箱网络请求提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 */
import { randomUUID } from "crypto";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  literal,
  union,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { ConsentRowSchema, isConsentRow } from "../../components/permissions/consentRows.js";
import { isMisleadingConsentHost, SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { logForDebugging } from "../../utils/debug.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../../cli/structuredIO.js";
import { CountedAsk } from "../../utils/countedAsk.js";
import { setUnansweredWindowExpired } from "../../tools/BashTool/bashPermissionFlags.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { persistValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { reportSandboxErrorUnderStandIn } from "../../utils/sandbox/sandboxErrors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:165450-165454 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:165450", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:180556-180831 placement
var sandboxNetworkAccessDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:180556", () => {
  sandboxNetworkAccessDialogDef = withHideWhile({
    kind: "sandbox_network_access",
    payload: DoctorLazy(() =>
      objectSchema({
        host: stringSchema(),
        port: numberSchema().optional(),
        forwardedFromWorker: literal(true).optional(),
        workerName: stringSchema().optional(),
      }),
    ),
    result: DoctorLazy(() =>
      union([
        objectSchema({
          allow: booleanSchema(),
          persistToSettings: booleanSchema(),
          persistRow: ConsentRowSchema().optional(),
        }),
        literal("cancelled"),
      ]),
    ),
    default: "cancelled",
  });
});
//@ chunk-czq1j3j2.js:180831-182080 placement
/**
 * 沙箱网络访问询问器：沙箱运行时(srt)请求访问未在白名单的主机时，弹出 "Allow network connection to …" 对话框；拒绝 srt 会改写拼写的主机；可转发到 bridge/leader。
 */
class SandboxNetworkPrompts {
  deps;
  inFlight = new Map();
  constructor(deps) {
    this.deps = deps;
  }
  ask(request, { forwardToBridge = true, expiry } = {}) {
    if (isMisleadingConsentHost(request.host)) {
      logForDebugging(
        `[SandboxNetworkPrompts] Refusing to ask for a host srt would re-spell: ${toApprovalLabel(request.host) ?? "(unshowable)"}`,
        {
          level: "warn",
        },
      );
      return Promise.resolve(false);
    }
    let existing = this.inFlight.get(request.host);
    if (existing) return existing;
    let pending = this.prompt(request, forwardToBridge, expiry).finally(() => {
      this.inFlight.delete(request.host);
    });
    this.inFlight.set(request.host, pending);
    return pending;
  }
  async prompt({ host, port }, forwardToBridge, expiry) {
    let abortController = new AbortController();
    let expiryTimer;
    let revealed = false;
    let bridgeAnswer;
    let finishBridgeAsk = (answer) => {};
    let bridge = forwardToBridge ? this.deps.getBridge() : undefined;
    if (bridge) {
      let requestId = randomUUID();
      bridge.sendRequest(
        requestId,
        SANDBOX_NETWORK_ACCESS_TOOL_NAME,
        {
          host,
        },
        randomUUID(),
        `Allow network connection to ${host}?`,
      );
      let unsubscribe = bridge.onResponse(requestId, SANDBOX_NETWORK_ACCESS_TOOL_NAME, (response) => {
        bridgeAnswer = response.behavior === "allow";
        abortController.abort();
      });
      finishBridgeAsk = (finishedEarly) => {
        unsubscribe();
        if (!finishedEarly) bridge.cancelRequest(requestId);
      };
    }
    let countedAsk = new CountedAsk();
    let answerPromise = this.deps.requestDialog(
      sandboxNetworkAccessDialogDef,
      {
        host,
        port,
      },
      {
        signal: abortController.signal,
        place: "under",
        armInputGrace: true,
        countedAsk,
        onFirstReveal: () => {
          revealed = true;
        },
      },
    );
    countedAsk.settleWhen(answerPromise);
    if (expiry !== undefined) {
      expiryTimer = setTimeout(() => {
        if (revealed)
          setUnansweredWindowExpired({
            expired: true,
          });
        expiry.onExpired();
        abortController.abort();
      }, expiry.afterMs);
      expiryTimer.unref();
    }
    let answer = await answerPromise;
    clearTimeout(expiryTimer);
    if (expiry !== undefined && answer !== "cancelled")
      setUnansweredWindowExpired({
        expired: false,
      });
    finishBridgeAsk(bridgeAnswer !== undefined);
    if (answer === "cancelled") {
      if (bridgeAnswer) SandboxManager.addSessionAllowedHost(host);
      return bridgeAnswer ?? false;
    }
    applySandboxNetworkAnswer(answer, host, this.deps.applyPermissionUpdate);
    return answer.allow;
  }
}
//@ chunk-czq1j3j2.js:182080-182747 placement
async function askSandboxNetworkFromWorker({ host, workerName, requestId }, deps) {
  for (let idx = 0; idx < 2; idx++) {
    let countedAsk = new CountedAsk();
    let answer = deps.requestDialog(
      sandboxNetworkAccessDialogDef,
      {
        host,
        forwardedFromWorker: true,
        workerName,
      },
      {
        place: "under",
        armInputGrace: true,
        countedAsk,
      },
    );
    countedAsk.settleWhen(answer);
    let answer_2 = await answer;
    if (answer_2 === "cancelled") {
      logForDebugging(
        `[sandbox] leader dialog for ${workerName === undefined ? "an unrostered worker" : jsonStringify(workerName)}'s ask ${jsonStringify(requestId)} (${jsonStringify(host)}) closed unanswered; nothing sent`,
      );
      return;
    }
    if (!(await deps.sendResponse(answer_2.allow))) {
      logForDebugging(
        `[sandbox] could not mail ${workerName === undefined ? "an unrostered worker" : jsonStringify(workerName)} the answer for ${jsonStringify(host)} (${jsonStringify(requestId)}); ${idx === 0 ? "asking once more" : "dropped after one retry"}`,
        {
          level: "error",
        },
      );
      continue;
    }
    applySandboxNetworkAnswer(answer_2, host, deps.applyPermissionUpdate);
    return;
  }
}
//@ chunk-czq1j3j2.js:182747-183015 placement
function applySandboxNetworkAnswer({ allow, persistToSettings, persistRow }, host, applyPermissionUpdate) {
  if (persistToSettings && allow && persistRow !== undefined && isConsentRow(persistRow)) {
    for (let update of persistRow.applies) {
      applyPermissionUpdate(update);
      persistValidatedPermissionUpdate(update)
        .then(() => SandboxManager.refreshConfig())
        .catch((error) => reportSandboxErrorUnderStandIn(error, "networkRuleNotApplied"));
    }
    SandboxManager.addSessionAllowedHost(host);
  } else if (allow) SandboxManager.addSessionAllowedHost(host);
}
//@ chunk-czq1j3j2.js:183015-183019 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:183015", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:183019-183023 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:183019", () => {
  init_react_production();
});
export { SandboxNetworkPrompts, sandboxNetworkAccessDialogDef, askSandboxNetworkFromWorker };
