/**
 * components/CloudGatewaySignIn.tsx
 *
 * 2.1.316 新增。云网关登录流程界面。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gy23bf9p.js (8)
 * attribution: placement 8
 */
import { createInterface } from "readline";
import { DoctorLazy } from "../cli/handlers/util.js";
import { create, create_2, create_25 } from "../../vendor/zod/lib/index.mjs";
import {
  inn,
  snn,
  onn,
  ann,
  cnn,
  unn,
  lnn,
  dnn,
  GatewayLoginFlow,
  rnn,
} from "../services/oauth/gatewayLogin/GatewayLogin.js";
import { isValidBrowserUrl } from "../utils/browser.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { ql } from "../utils/stringUtils.js";
import { safeParseJSON } from "../utils/json.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { normalizeGatewayUrl } from "../services/gateway/hostCheck.js";

//@ chunk-gy23bf9p.js:3682-3741 placement
var h = 1,
  w = DoctorLazy(() => create({ state: create_2(), shown: create_2(), accept: create_25(!0) }));
//@ chunk-gy23bf9p.js:3741-3827 placement
function S(e) {
  let { origin: origin, pathname: pathname } = new URL(e);
  return `${origin}${pathname}`.replace(/\/+$/, "");
}
/**
 * 按登录状态（输入网关 URL / 信任指纹 / 确认账号）给出提示框的标题、展示值、说明与确认/取消按钮文字。
 */
//@ chunk-gy23bf9p.js:3827-4416 placement
function describeSignInPrompt(e, n) {
  switch (e.state) {
    case "url_input":
      return {
        shown: S(n.url),
        shownLabel: "Gateway URL:",
        title: "Sign in to Cloud gateway?",
        confirmLabel: "Connect",
        cancelLabel: "Cancel sign-in",
      };
    case "trust_prompt":
      return {
        shown: e.fingerprint,
        shownLabel: inn,
        title: `Trust gateway ${e.hostname}?`,
        detail: [e.previouslyPinned ? snn : onn, ...(e.route ? [`Connecting ${e.route}`] : [])].join(`

`),
        confirmLabel: ann,
        cancelLabel: "Cancel sign-in",
      };
    case "confirm_account":
      return {
        shown: e.email,
        shownLabel: "Account:",
        title: "Signed in to Cloud gateway",
        detail: cnn,
        confirmLabel: unn,
        cancelLabel: "Cancel sign-in",
      };
    default:
      return;
  }
}
//@ chunk-gy23bf9p.js:4416-4467 placement
function o(e) {
  return isValidBrowserUrl(e) ? new URL(e).href : void 0;
}
//@ chunk-gy23bf9p.js:4467-4750 placement
function serializeSignInState(e, n) {
  return jsonStringify({
    version: h,
    state: e.state,
    ...n,
    ...(e.state === "polling" && {
      detail: lnn,
      userCode: ql(e.userCode),
      verificationUriLabel: dnn,
      verificationUri: o(e.verificationUri),
      browserUrl: o(e.browserUrl),
    }),
    ...(e.state === "error" && { message: ql(e.message), detail: e.detail && ql(e.detail) }),
  });
}
//@ chunk-gy23bf9p.js:4750-4827 placement
async function l(e, n) {
  return (await e(serializeSignInState({ state: "error", message: n }, void 0)), !1);
}
//@ chunk-gy23bf9p.js:4827-6085 placement
class CloudGatewaySignInFlow {
  target;
  write;
  signIn;
  ended = Promise.withResolvers();
  lastWrite = Promise.resolve();
  constructor(e, n, r) {
    this.target = e;
    this.write = n;
    this.signIn = new GatewayLoginFlow(r, () => {});
  }
  report() {
    let snapshot = this.signIn.status.getSnapshot();
    if (snapshot.state !== "cancelled")
      this.lastWrite = this.write(
        serializeSignInState(snapshot, describeSignInPrompt(snapshot, this.target)),
      );
    if (snapshot.state === "done" || snapshot.state === "error" || snapshot.state === "cancelled")
      this.ended.resolve(snapshot.state === "done");
  }
  cancel() {
    let { state: state } = this.signIn.status.getSnapshot();
    if (state !== "saving" && state !== "done") this.signIn.cancel();
  }
  async readAnswers(e) {
    try {
      for await (let n of createInterface({ input: e })) {
        let snapshot = this.signIn.status.getSnapshot(),
          safeParse = w().safeParse(safeParseJSON(n, !1));
        if (
          !safeParse.success ||
          safeParse.data.state !== snapshot.state ||
          safeParse.data.shown !== describeSignInPrompt(snapshot, this.target)?.shown
        )
          return;
        switch (snapshot.state) {
          case "url_input":
            this.signIn.connect(this.target);
            break;
          case "trust_prompt":
            this.signIn.trust();
            break;
          case "confirm_account":
            this.signIn.confirmAccount();
            break;
          default:
        }
      }
    } catch (error) {
      logForDebugging(`[gateway-login] reading answers failed: ${errorMessage(error)}`, { level: "error" });
    } finally {
      this.cancel();
    }
  }
  async run(e, n) {
    if (
      (this.signIn.status.subscribe(() => this.report()),
      this.report(),
      n.addEventListener("abort", () => this.cancel(), { once: !0 }),
      n.aborted)
    )
      this.cancel();
    this.readAnswers(e);
    let promise = await this.ended.promise;
    return (await Promise.all([this.lastWrite, this.signIn.revoking]), promise);
  }
}
//@ chunk-gy23bf9p.js:6085-6277 placement
async function runCloudGatewaySignIn({
  gateway: gateway,
  stdin: stdin,
  write: write,
  signal: signal,
  credentials: credentials,
}) {
  if (gateway.url === void 0) return l(write, rnn);
  let a;
  try {
    a = normalizeGatewayUrl(gateway.url);
  } catch (error) {
    return l(write, errorMessage(error));
  }
  return new CloudGatewaySignInFlow({ ...gateway, url: a }, write, credentials).run(stdin, signal);
}
