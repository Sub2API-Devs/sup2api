/**
 * screens/repl/SandboxNetworkPrompts.ts
 *
 * 2.1.316 新增。沙箱网络请求提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { randomUUID } from "crypto";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, literal, union, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { ConsentRowSchema, isConsentRow } from "../../components/permissions/consentRows.js";
import { isMisleadingConsentHost, SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { logForDebugging } from "../../utils/debug.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../../cli/structuredIO.js";
import { CountedAsk } from "../../utils/countedAsk.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { persistValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { reportSandboxErrorUnderStandIn } from "../../utils/sandbox/sandboxErrors.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:175184-175459 placement
var sandboxNetworkAccessDialogDef = withHideWhile({
  kind: "sandbox_network_access",
  payload: DoctorLazy(() =>
    u({
      host: string(),
      port: E().optional(),
      forwardedFromWorker: literal(true).optional(),
      workerName: string().optional(),
    }),
  ),
  result: DoctorLazy(() =>
    union([
      u({
        allow: M(),
        persistToSettings: M(),
        persistRow: ConsentRowSchema().optional(),
      }),
      literal("cancelled"),
    ]),
  ),
  default: "cancelled",
});
//@ chunk-18hwfzwa.js:175459-176551 placement
/**
 * 沙箱网络访问询问器：沙箱运行时(srt)请求访问未在白名单的主机时，弹出 "Allow network connection to …" 对话框；拒绝 srt 会改写拼写的主机；可转发到 bridge/leader。
 */
class SandboxNetworkPrompts {
  deps;
  inFlight = new Map();
  constructor(deps) {
    this.deps = deps;
  }
  ask(h, { forwardToBridge: x = true, expiry: D } = {}) {
    if (isMisleadingConsentHost(h.host)) {
      logForDebugging(
        `[SandboxNetworkPrompts] Refusing to ask for a host srt would re-spell: ${toApprovalLabel(h.host) ?? "(unshowable)"}`,
        {
          level: "warn",
        },
      );
      return Promise.resolve(false);
    }
    let L = this.inFlight.get(h.host);
    if (L) return L;
    let ee = this.prompt(h, x, D).finally(() => {
      this.inFlight.delete(h.host);
    });
    this.inFlight.set(h.host, ee);
    return ee;
  }
  async prompt({ host, port }, D, L) {
    let abortController = new AbortController();
    let ke;
    let Re = false;
    let Be;
    let He = (kt) => {};
    let We = D ? this.deps.getBridge() : undefined;
    if (We) {
      let kt = randomUUID();
      We.sendRequest(
        kt,
        SANDBOX_NETWORK_ACCESS_TOOL_NAME,
        {
          host,
        },
        randomUUID(),
        `Allow network connection to ${host}?`,
      );
      let At = We.onResponse(kt, SANDBOX_NETWORK_ACCESS_TOOL_NAME, (It) => {
        Be = It.behavior === "allow";
        abortController.abort();
      });
      He = (It) => {
        At();
        if (!It) We.cancelRequest(kt);
      };
    }
    let ze = new CountedAsk();
    let Xe = this.deps.requestDialog(
      sandboxNetworkAccessDialogDef,
      {
        host,
        port,
      },
      {
        signal: abortController.signal,
        place: "under",
        armInputGrace: true,
        countedAsk: ze,
        onFirstReveal: () => {
          Re = true;
        },
      },
    );
    ze.settleWhen(Xe);
    let rt = await Xe;
    clearTimeout(ke);
    He(Be !== undefined);
    if (rt === "cancelled") {
      if (Be) SandboxManager.addSessionAllowedHost(host);
      return Be ?? false;
    }
    applySandboxNetworkAnswer(rt, host, this.deps.applyPermissionUpdate);
    return rt.allow;
  }
}
//@ chunk-18hwfzwa.js:176551-177218 placement
async function askSandboxNetworkFromWorker({ host, workerName, requestId }, L) {
  for (let idx = 0; idx < 2; idx++) {
    let ke = new CountedAsk();
    let Re = L.requestDialog(
      sandboxNetworkAccessDialogDef,
      {
        host,
        forwardedFromWorker: true,
        workerName,
      },
      {
        place: "under",
        armInputGrace: true,
        countedAsk: ke,
      },
    );
    ke.settleWhen(Re);
    let Be = await Re;
    if (Be === "cancelled") {
      logForDebugging(
        `[sandbox] leader dialog for ${workerName === undefined ? "an unrostered worker" : jsonStringify(workerName)}'s ask ${jsonStringify(requestId)} (${jsonStringify(host)}) closed unanswered; nothing sent`,
      );
      return;
    }
    if (!(await L.sendResponse(Be.allow))) {
      logForDebugging(
        `[sandbox] could not mail ${workerName === undefined ? "an unrostered worker" : jsonStringify(workerName)} the answer for ${jsonStringify(host)} (${jsonStringify(requestId)}); ${idx === 0 ? "asking once more" : "dropped after one retry"}`,
        {
          level: "error",
        },
      );
      continue;
    }
    applySandboxNetworkAnswer(Be, host, L.applyPermissionUpdate);
    return;
  }
}
//@ chunk-18hwfzwa.js:177218-177486 placement
function applySandboxNetworkAnswer({ allow, persistToSettings, persistRow }, host, applyPermissionUpdate) {
  if (persistToSettings && allow && persistRow !== undefined && isConsentRow(persistRow)) {
    for (let ke of persistRow.applies) {
      applyPermissionUpdate(ke);
      persistValidatedPermissionUpdate(ke)
        .then(() => SandboxManager.refreshConfig())
        .catch((error) => reportSandboxErrorUnderStandIn(error, "networkRuleNotApplied"));
    }
    SandboxManager.addSessionAllowedHost(host);
  } else if (allow) SandboxManager.addSessionAllowedHost(host);
}
//@ chunk-18hwfzwa.js:177486-177490 placement
init_react_production();
//@ chunk-18hwfzwa.js:177490-177494 placement
init_react_production();
//@ chunk-18hwfzwa.js:177494-177498 placement
init_react_production();
export { SandboxNetworkPrompts, sandboxNetworkAccessDialogDef, askSandboxNetworkFromWorker };
