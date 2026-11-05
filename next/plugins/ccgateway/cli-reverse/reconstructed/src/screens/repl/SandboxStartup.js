/**
 * screens/repl/SandboxStartup.ts
 *
 * 2.1.316 新增。REPL 启动时的沙箱初始化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 3, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SandboxManager, isMisleadingConsentHost } from "../../utils/sandbox/sandbox-adapter.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { errorMessage } from "../../utils/errors.js";
import { getModeBaseBehavior } from "../../utils/permissions/PermissionMode.js";
import {
  areCommandNetworkListsOffered,
  commandDomainDenyReason,
  sandboxHostDenyReason,
  isNetworkSandboxRestricted,
  denyUnapprovedHost,
  makeSandboxNetworkDecider,
} from "../../tools/BashTool/sandboxNetwork.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  isTeammateContextReady,
  generateSandboxRequestId,
  sendSandboxPermissionRequestViaMailbox,
} from "../../utils/swarm/permissionSync.js";
import { conversationSnapshot } from "../../utils/inboxClassification.js";
import { isUnansweredWindowExpired } from "../../tools/BashTool/bashPermissionFlags.js";
import { denialDialogAutoDenyMs } from "../../utils/permissions/permissions.js";
import { classifySandboxNetworkHost } from "../../utils/permissions/sandboxNetworkClassifier.js";
import { isModelDrivenSession } from "../../utils/teammate.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { registerSandboxPermissionCallback } from "../../hooks/useSwarmPermissionPoller.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:386537-386541 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:386537", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:389961-389965 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:389961", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:451477-451491 affinity
var MAX_SANDBOX_ASK_MS = 60000;
//@ chunk-czq1j3j2.js:451491-454789 placement
/**
 * SandboxStartup：REPL 启动时初始化沙箱并处理失败提示。
 */
class SandboxStartup {
  #e;
  constructor(options) {
    this.#e = options;
  }
  start() {
    let { store, setAppState, isRemoteSession } = this.#e;
    let sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
    if (sandboxUnavailableReason && SandboxManager.isSandboxRequired()) {
      process.stderr.write(
        `
Error: sandbox required but unavailable: ${sandboxUnavailableReason}
` +
          `  sandbox.failIfUnavailable is set \u2014 refusing to start without a working sandbox.

`,
      );
      gracefulShutdownSync(1, "other");
      return {
        stop: () => {},
        refused: true,
      };
    }
    if (sandboxUnavailableReason)
      logForDebugging(`sandbox disabled: ${sandboxUnavailableReason}`, {
        level: "warn",
      });
    let credentialWarning = sandboxUnavailableReason ? undefined : SandboxManager.getMaskCredentialWarning();
    if (credentialWarning)
      logForDebugging(`sandbox: ${credentialWarning}`, {
        level: "warn",
      });
    if (sandboxUnavailableReason || credentialWarning) {
      logSetupIssues("sandbox", 1);
      setAppState((state) => {
        if (state.setupIssues.sandboxIssueCount === 1) return state;
        return {
          ...state,
          setupIssues: {
            ...state.setupIssues,
            sandboxIssueCount: 1,
          },
        };
      });
    }
    let retryWarning =
      sandboxUnavailableReason && !isRemoteSession ? SandboxManager.getSandboxSetUpAgainWarning() : undefined;
    if (retryWarning !== undefined)
      setAppState((state) =>
        state.setupIssues.securityWarnings.some((securityWarning) => securityWarning.text === retryWarning)
          ? state
          : {
              ...state,
              setupIssues: {
                ...state.setupIssues,
                securityWarnings: [
                  ...state.setupIssues.securityWarnings,
                  {
                    text: retryWarning,
                  },
                ],
              },
            },
      );
    if (isRemoteSession)
      return {
        stop: () => {},
        refused: false,
      };
    return {
      stop: createDependencyWatcher(
        [store],
        () => [SandboxManager.isSandboxingEnabled(), SandboxManager.getSandboxRestartWarning()],
        (existing, warningText) => {
          if (warningText !== undefined) {
            setAppState((state) =>
              state.setupIssues.securityWarnings.some(
                (securityWarning) => securityWarning.text === warningText,
              )
                ? state
                : {
                    ...state,
                    setupIssues: {
                      ...state.setupIssues,
                      securityWarnings: [
                        ...state.setupIssues.securityWarnings,
                        {
                          text: warningText,
                        },
                      ],
                    },
                  },
            );
            return () => {
              setAppState((state) => ({
                ...state,
                setupIssues: {
                  ...state.setupIssues,
                  securityWarnings: state.setupIssues.securityWarnings.filter(
                    (securityWarning) => securityWarning.text !== warningText,
                  ),
                },
              }));
            };
          }
          if (!existing) return;
          if (retryWarning !== undefined)
            setAppState((state) =>
              state.setupIssues.securityWarnings.some(
                (securityWarning) => securityWarning.text === retryWarning,
              )
                ? {
                    ...state,
                    setupIssues: {
                      ...state.setupIssues,
                      securityWarnings: state.setupIssues.securityWarnings.filter(
                        (securityWarning) => securityWarning.text !== retryWarning,
                      ),
                    },
                  }
                : state,
            );
          SandboxManager.initialize(this.ask)
            .then(() => {
              let profileReadSecurityWarnings = SandboxManager.getProfileReadSecurityWarnings();
              if (profileReadSecurityWarnings.length === 0) return;
              setAppState((state) => ({
                ...state,
                setupIssues: {
                  ...state.setupIssues,
                  securityWarnings: [
                    ...state.setupIssues.securityWarnings.filter(
                      (securityWarning) => !profileReadSecurityWarnings.includes(securityWarning.text),
                    ),
                    ...profileReadSecurityWarnings.map((text) => ({
                      text,
                    })),
                  ],
                },
              }));
            })
            .catch((error) => {
              process.stderr.write(`
\u274C Sandbox Error: ${errorMessage(error)}
`);
              gracefulShutdownSync(1, "other");
            });
        },
      ),
      refused: false,
    };
  }
  ask = async (request) => {
    let { store, storageV5, credentials, scope, getMessages } = this.#e;
    let state = store.getState();
    let { mode, isBypassPermissionsModeAvailable } = state.toolPermissionContext;
    switch (getModeBaseBehavior(mode, isBypassPermissionsModeAvailable)) {
      case "allow":
        return true;
      case "deny":
        return false;
      case "classify":
        if (areCommandNetworkListsOffered()) return commandDomainDenyReason();
        let denyReason = sandboxHostDenyReason();
        if (denyReason !== undefined) return denyReason;
        if (isNetworkSandboxRestricted(mode)) {
          if (isAgentSwarmsEnabled() && isTeammateContextReady()) return denyUnapprovedHost();
          return (
            (await scope
              .sandboxClassifierVerdicts()
              .getOrClassify(request.host, request.port, conversationSnapshot(getMessages()), async () => {
                if (isUnansweredWindowExpired()) return makeSandboxNetworkDecider(false, true);
                let answeredLate = false;
                let answer = await this.#t(request, {
                  afterMs: Math.min(denialDialogAutoDenyMs(), MAX_SANDBOX_ASK_MS),
                  onExpired: () => {
                    answeredLate = true;
                  },
                });
                return makeSandboxNetworkDecider(answer, answeredLate);
              })) || denyUnapprovedHost()
          );
        }
        return scope
          .sandboxClassifierVerdicts()
          .getOrClassify(request.host, request.port, conversationSnapshot(getMessages()), () =>
            classifySandboxNetworkHost(
              request.host,
              request.port,
              getMessages(),
              scope.computeTools(),
              state.toolPermissionContext,
              new AbortController().signal,
              {
                isSubagentLoop: isModelDrivenSession(undefined),
                recordPresumed: true,
                storageV5,
                credentials,
              },
            ),
          );
      case "ask":
        return this.#t(request, undefined);
    }
  };
  async #t(request, expiry) {
    let { setAppState, storageV5, networkPrompts } = this.#e;
    if (isAgentSwarmsEnabled() && isTeammateContextReady()) {
      if (isMisleadingConsentHost(request.host)) {
        logForDebugging(
          `[sandbox] Refusing to forward a worker ask for a host srt would re-spell: ${toApprovalLabel(request.host) ?? "(unshowable)"}`,
          {
            level: "warn",
          },
        );
        return false;
      }
      let requestId = generateSandboxRequestId();
      if (!(await sendSandboxPermissionRequestViaMailbox(request.host, requestId, undefined, storageV5)))
        return networkPrompts.ask(request, {
          forwardToBridge: false,
          expiry,
        });
      return new Promise((resolve) => {
        registerSandboxPermissionCallback({
          requestId,
          host: request.host,
          resolve,
        });
        setAppState((state) => ({
          ...state,
          pendingSandboxRequest: {
            requestId,
            host: request.host,
          },
        }));
      });
    }
    return networkPrompts.ask(request, {
      expiry,
    });
  }
}
export { SandboxStartup };
