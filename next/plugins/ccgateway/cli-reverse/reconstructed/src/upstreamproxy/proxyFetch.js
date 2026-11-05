/**
 * upstreamproxy/proxyFetch.ts
 *
 * 2.1.316 新增。经代理的 fetch。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9xh6zw2q.js (3)
 * attribution: placement 2, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isStandaloneExecutable } from "../utils/slowOperations.js";
import {
  getTLSFetchSession,
  modelApiPoolRetiresAfterServerError,
  mayComeFromOneBadMachine,
  retireTLSFetchSession,
  ccrHasLeftSharedPool,
} from "../utils/mtls.js";
import { logForDebugging } from "../utils/debug.js";
import { fetchFollowingCcsRedirect, logServerStatus } from "./ccrPoolRetire.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";

//@ chunk-9xh6zw2q.js:471-768 placement
function createTlsSessionFetch(sessionName, options, sessionKey) {
  let tlsSessionFetch = isStandaloneExecutable() ? getTLSFetchSession(sessionName, sessionKey) : undefined;
  if (!tlsSessionFetch) return;
  let sessionFetch = bindSessionFetch(tlsSessionFetch, options);
  if (sessionName !== "modelApi" || !modelApiPoolRetiresAfterServerError()) return sessionFetch;
  return (input) =>
    sessionFetch(input).then((response) => {
      let { status } = response;
      if (mayComeFromOneBadMachine(status) && retireTLSFetchSession(sessionName, tlsSessionFetch))
        logForDebugging(
          `A request to the model API got a ${status}: this worker closed its idle connections to that API and opens new ones`,
        );
      return response;
    });
}
//@ chunk-9xh6zw2q.js:768-872 layout
function bindSessionFetch(session, options) {
  let { tls, ...restOptions } = options ?? {};
  let fetchOptions = options?.proxy === undefined && options?.unix === undefined ? restOptions : options;
  return (input) => session.fetch(input, fetchOptions);
}
//@ chunk-9xh6zw2q.js:872-1324 placement
function proxyAwareFetch(input, options, ownConnectionPool, leavesPoolAfterServerError) {
  if (!leavesPoolAfterServerError?.()) {
    let sessionFetch =
      options.proxy === undefined && ownConnectionPool?.()
        ? createTlsSessionFetch("ccr", options, undefined)
        : undefined;
    return sessionFetch ? sessionFetch(input) : fetchFollowingCcsRedirect(input, options);
  }
  let ccrSessionFetch =
    ccrHasLeftSharedPool() && isStandaloneExecutable() ? getTLSFetchSession("ccr", undefined) : undefined;
  return (
    ccrSessionFetch
      ? bindSessionFetch(ccrSessionFetch, options)(input)
      : fetchFollowingCcsRedirect(input, options)
  ).then((response) => {
    let { status } = response;
    if (mayComeFromOneBadMachine(status)) {
      if (ccrSessionFetch === undefined) logServerStatus(status);
      else if (retireTLSFetchSession("ccr", ccrSessionFetch)) {
        logForDebugging(
          `A request to Anthropic's sessions server got a ${status}: this worker closed its idle connections to that server and opens new ones`,
        );
        logForDiagnosticsNoPII("info", "cli_ccr_own_pool_retired", {
          status,
        });
      }
    }
    return response;
  });
}
export { proxyAwareFetch, createTlsSessionFetch };
