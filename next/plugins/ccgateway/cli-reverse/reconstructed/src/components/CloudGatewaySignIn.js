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
  FINGERPRINT_LABEL,
  CERT_ROTATED_MESSAGE,
  FIRST_TRUST_MESSAGE,
  TRUST_ACCEPT_LABEL,
  PIN_MISMATCH_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  TRUST_DECLINE_LABEL,
  TRUST_REJECTED_MESSAGE,
  GatewayLoginFlow,
  NO_GATEWAY_URL_MESSAGE,
} from "../services/oauth/gatewayLogin/GatewayLogin.js";
import { isValidBrowserUrl } from "../utils/browser.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { cleanForDisplay } from "../utils/stringUtils.js";
import { safeParseJSON } from "../utils/json.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { normalizeGatewayUrl } from "../services/gateway/hostCheck.js";

//@ chunk-gy23bf9p.js:3682-3741 placement
var SIGN_IN_STATE_VERSION = 1;
var signInStateSchema = DoctorLazy(() =>
  create({
    state: create_2(),
    shown: create_2(),
    accept: create_25(true),
  }),
);
//@ chunk-gy23bf9p.js:3741-3827 placement
function originPathOf(url) {
  let { origin, pathname } = new URL(url);
  return `${origin}${pathname}`.replace(/\/+$/, "");
}
//@ chunk-gy23bf9p.js:3827-4416 placement
/**
 * 按登录状态（输入网关 URL / 信任指纹 / 确认账号）给出提示框的标题、展示值、说明与确认/取消按钮文字。
 */
function describeSignInPrompt(state, target) {
  switch (state.state) {
    case "url_input":
      return {
        shown: originPathOf(target.url),
        shownLabel: "Gateway URL:",
        title: "Sign in to Cloud gateway?",
        confirmLabel: "Connect",
        cancelLabel: "Cancel sign-in",
      };
    case "trust_prompt":
      return {
        shown: state.fingerprint,
        shownLabel: FINGERPRINT_LABEL,
        title: `Trust gateway ${state.hostname}?`,
        detail: [
          state.previouslyPinned ? CERT_ROTATED_MESSAGE : FIRST_TRUST_MESSAGE,
          ...(state.route ? [`Connecting ${state.route}`] : []),
        ].join(`

`),
        confirmLabel: TRUST_ACCEPT_LABEL,
        cancelLabel: "Cancel sign-in",
      };
    case "confirm_account":
      return {
        shown: state.email,
        shownLabel: "Account:",
        title: "Signed in to Cloud gateway",
        detail: PIN_MISMATCH_MESSAGE,
        confirmLabel: LOGIN_FAILED_MESSAGE,
        cancelLabel: "Cancel sign-in",
      };
    default:
      return;
  }
}
//@ chunk-gy23bf9p.js:4416-4467 placement
function validBrowserUrlHref(url) {
  return isValidBrowserUrl(url) ? new URL(url).href : undefined;
}
//@ chunk-gy23bf9p.js:4467-4750 placement
function serializeSignInState(state, described) {
  return jsonStringify({
    version: SIGN_IN_STATE_VERSION,
    state: state.state,
    ...described,
    ...(state.state === "polling" && {
      detail: TRUST_DECLINE_LABEL,
      userCode: cleanForDisplay(state.userCode),
      verificationUriLabel: TRUST_REJECTED_MESSAGE,
      verificationUri: validBrowserUrlHref(state.verificationUri),
      browserUrl: validBrowserUrlHref(state.browserUrl),
    }),
    ...(state.state === "error" && {
      message: cleanForDisplay(state.message),
      detail: state.detail && cleanForDisplay(state.detail),
    }),
  });
}
//@ chunk-gy23bf9p.js:4750-4827 placement
async function finishSignInWithError(write, message) {
  await write(
    serializeSignInState(
      {
        state: "error",
        message,
      },
      undefined,
    ),
  );
  return false;
}
//@ chunk-gy23bf9p.js:4827-6085 placement
class CloudGatewaySignInFlow {
  target;
  write;
  signIn;
  ended = Promise.withResolvers();
  lastWrite = Promise.resolve();
  constructor(target, write, credentials) {
    this.target = target;
    this.write = write;
    this.signIn = new GatewayLoginFlow(credentials, () => {});
  }
  report() {
    let state = this.signIn.status.getSnapshot();
    if (state.state !== "cancelled")
      this.lastWrite = this.write(serializeSignInState(state, describeSignInPrompt(state, this.target)));
    if (state.state === "done" || state.state === "error" || state.state === "cancelled")
      this.ended.resolve(state.state === "done");
  }
  cancel() {
    let { state } = this.signIn.status.getSnapshot();
    if (state !== "saving" && state !== "done") this.signIn.cancel();
  }
  async readAnswers(input) {
    try {
      for await (let line of createInterface({
        input,
      })) {
        let state = this.signIn.status.getSnapshot();
        let parsed = signInStateSchema().safeParse(safeParseJSON(line, false));
        if (
          !parsed.success ||
          parsed.data.state !== state.state ||
          parsed.data.shown !== describeSignInPrompt(state, this.target)?.shown
        )
          return;
        switch (state.state) {
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
      logForDebugging(`[gateway-login] reading answers failed: ${errorMessage(error)}`, {
        level: "error",
      });
    } finally {
      this.cancel();
    }
  }
  async run(input, signal) {
    this.signIn.status.subscribe(() => this.report());
    this.report();
    signal.addEventListener("abort", () => this.cancel(), {
      once: true,
    });
    if (signal.aborted) this.cancel();
    this.readAnswers(input);
    let promise = await this.ended.promise;
    await Promise.all([this.lastWrite, this.signIn.revoking]);
    return promise;
  }
}
//@ chunk-gy23bf9p.js:6085-6277 placement
async function runCloudGatewaySignIn({ gateway, stdin, write, signal, credentials }) {
  if (gateway.url === undefined) return finishSignInWithError(write, NO_GATEWAY_URL_MESSAGE);
  let url;
  try {
    url = normalizeGatewayUrl(gateway.url);
  } catch (error) {
    return finishSignInWithError(write, errorMessage(error));
  }
  return new CloudGatewaySignInFlow(
    {
      ...gateway,
      url,
    },
    write,
    credentials,
  ).run(stdin, signal);
}
export { runCloudGatewaySignIn };
