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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, T, Ue, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { NCs, isConsentRow } from "../../components/permissions/consentRows.js";
import { isMisleadingConsentHost, SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { logForDebugging } from "../../utils/debug.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../../cli/structuredIO.js";
import { CountedAsk } from "../../utils/countedAsk.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { persistValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { reportSandboxErrorUnderStandIn } from "../../utils/sandbox/sandboxErrors.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:175184-175459 placement
var sandboxNetworkAccessDialogDef = withHideWhile({
  kind: "sandbox_network_access",
  payload: DoctorLazy(() =>
    u({ host: o(), port: E().optional(), forwardedFromWorker: T(!0).optional(), workerName: o().optional() }),
  ),
  result: DoctorLazy(() =>
    Ue([u({ allow: M(), persistToSettings: M(), persistRow: NCs().optional() }), T("cancelled")]),
  ),
  default: "cancelled",
});
/**
 * 沙箱网络访问询问器：沙箱运行时(srt)请求访问未在白名单的主机时，弹出 "Allow network connection to …" 对话框；拒绝 srt 会改写拼写的主机；可转发到 bridge/leader。
 */
//@ chunk-18hwfzwa.js:175459-176551 placement
class SandboxNetworkPrompts {
  deps;
  inFlight = new Map();
  constructor(h) {
    this.deps = h;
  }
  ask(h, { forwardToBridge: x = !0, expiry: D } = {}) {
    if (isMisleadingConsentHost(h.host))
      return (
        logForDebugging(
          `[SandboxNetworkPrompts] Refusing to ask for a host srt would re-spell: ${toApprovalLabel(h.host) ?? "(unshowable)"}`,
          { level: "warn" },
        ),
        Promise.resolve(!1)
      );
    let L = this.inFlight.get(h.host);
    if (L) return L;
    let ee = this.prompt(h, x, D).finally(() => {
      this.inFlight.delete(h.host);
    });
    return (this.inFlight.set(h.host, ee), ee);
  }
  async prompt({ host: h, port: x }, D, L) {
    let abortController = new AbortController(),
      ke,
      Re = !1,
      Be,
      He = (kt) => {},
      We = D ? this.deps.getBridge() : void 0;
    if (We) {
      let kt = randomUUID_3();
      We.sendRequest(
        kt,
        SANDBOX_NETWORK_ACCESS_TOOL_NAME,
        { host: h },
        randomUUID_3(),
        `Allow network connection to ${h}?`,
      );
      let onResponse = We.onResponse(kt, SANDBOX_NETWORK_ACCESS_TOOL_NAME, (It) => {
        ((Be = It.behavior === "allow"), abortController.abort());
      });
      He = (It) => {
        if ((onResponse(), !It)) We.cancelRequest(kt);
      };
    }
    let ze = new CountedAsk(),
      requestDialog = this.deps.requestDialog(
        sandboxNetworkAccessDialogDef,
        { host: h, port: x },
        {
          signal: abortController.signal,
          place: "under",
          armInputGrace: !0,
          countedAsk: ze,
          onFirstReveal: () => {
            Re = !0;
          },
        },
      );
    ze.settleWhen(requestDialog);
    let rt = await requestDialog;
    if ((clearTimeout(ke), He(Be !== void 0), rt === "cancelled")) {
      if (Be) SandboxManager.addSessionAllowedHost(h);
      return Be ?? !1;
    }
    return (applySandboxNetworkAnswer(rt, h, this.deps.applyPermissionUpdate), rt.allow);
  }
}
//@ chunk-18hwfzwa.js:176551-177218 placement
async function askSandboxNetworkFromWorker({ host: host, workerName: workerName, requestId: requestId }, L) {
  for (let ee = 0; ee < 2; ee++) {
    let ke = new CountedAsk(),
      requestDialog = L.requestDialog(
        sandboxNetworkAccessDialogDef,
        { host: host, forwardedFromWorker: !0, workerName: workerName },
        { place: "under", armInputGrace: !0, countedAsk: ke },
      );
    ke.settleWhen(requestDialog);
    let Be = await requestDialog;
    if (Be === "cancelled") {
      logForDebugging(
        `[sandbox] leader dialog for ${workerName === void 0 ? "an unrostered worker" : jsonStringify(workerName)}'s ask ${jsonStringify(requestId)} (${jsonStringify(host)}) closed unanswered; nothing sent`,
      );
      return;
    }
    if (!(await L.sendResponse(Be.allow))) {
      logForDebugging(
        `[sandbox] could not mail ${workerName === void 0 ? "an unrostered worker" : jsonStringify(workerName)} the answer for ${jsonStringify(host)} (${jsonStringify(requestId)}); ${ee === 0 ? "asking once more" : "dropped after one retry"}`,
        { level: "error" },
      );
      continue;
    }
    applySandboxNetworkAnswer(Be, host, L.applyPermissionUpdate);
    return;
  }
}
//@ chunk-18hwfzwa.js:177218-177486 placement
function applySandboxNetworkAnswer(
  { allow: allow, persistToSettings: persistToSettings, persistRow: persistRow },
  L,
  ee,
) {
  if (persistToSettings && allow && persistRow !== void 0 && isConsentRow(persistRow)) {
    for (let ke of persistRow.applies)
      (ee(ke),
        persistValidatedPermissionUpdate(ke)
          .then(() => SandboxManager.refreshConfig())
          .catch((Re) => reportSandboxErrorUnderStandIn(Re, "networkRuleNotApplied")));
    SandboxManager.addSessionAllowedHost(L);
  } else if (allow) SandboxManager.addSessionAllowedHost(L);
}
//@ chunk-18hwfzwa.js:177486-177490 placement
j();
//@ chunk-18hwfzwa.js:177490-177494 placement
j();
//@ chunk-18hwfzwa.js:177494-177498 placement
j();

export { SandboxNetworkPrompts, sandboxNetworkAccessDialogDef, askSandboxNetworkFromWorker };
