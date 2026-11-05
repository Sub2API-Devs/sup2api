/**
 * @azure/core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (8)
 * attribution: esm-fingerprint 8
 */
import { createSpan } from "./tracingPolicy.js";
import { coreRestPipelineLogger } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { createTokenCycler } from "../util/tokenCycler.js";

//@ chunk-b5df2wx1.js:64307-64348 esm-fingerprint
var bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
//@ chunk-b5df2wx1.js:64348-64466 esm-fingerprint
async function trySendRequest(request, next) {
  try {
    return [await next(request), undefined];
  } catch (e) {
    if (createSpan(e) && e.response) return [e.response, e];
    else throw e;
  }
}
//@ chunk-b5df2wx1.js:64466-64684 esm-fingerprint
async function defaultAuthorizeRequest(options) {
  let { scopes, getAccessToken, request } = options;
  let getTokenOptions = {
    abortSignal: request.abortSignal,
    tracingOptions: request.tracingOptions,
    enableCae: true,
  };
  let accessToken = await getAccessToken(scopes, getTokenOptions);
  if (accessToken) options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
}
//@ chunk-b5df2wx1.js:64684-64756 esm-fingerprint
function isChallengeResponse(response) {
  return response.status === 401 && response.headers.has("WWW-Authenticate");
}
//@ chunk-b5df2wx1.js:64756-64979 esm-fingerprint
async function authorizeRequestOnCaeChallenge(onChallengeOptions, caeClaims) {
  var _a;
  let { scopes } = onChallengeOptions;
  let accessToken = await onChallengeOptions.getAccessToken(scopes, {
    enableCae: true,
    claims: caeClaims,
  });
  if (!accessToken) return false;
  onChallengeOptions.request.headers.set(
    "Authorization",
    `${(_a = accessToken.tokenType) !== null && _a !== undefined ? _a : "Bearer"} ${accessToken.token}`,
  );
  return true;
}
//@ chunk-b5df2wx1.js:64979-66674 esm-fingerprint
function bearerTokenAuthenticationPolicy(options) {
  var _a;
  var _b;
  var _c;
  let { credential, scopes, challengeCallbacks } = options;
  let logger = options.logger || coreRestPipelineLogger;
  let callbacks = {
    authorizeRequest:
      (_b =
        (_a =
          challengeCallbacks === null || challengeCallbacks === undefined
            ? undefined
            : challengeCallbacks.authorizeRequest) === null || _a === undefined
          ? undefined
          : _a.bind(challengeCallbacks)) !== null && _b !== undefined
        ? _b
        : defaultAuthorizeRequest,
    authorizeRequestOnChallenge:
      (_c =
        challengeCallbacks === null || challengeCallbacks === undefined
          ? undefined
          : challengeCallbacks.authorizeRequestOnChallenge) === null || _c === undefined
        ? undefined
        : _c.bind(challengeCallbacks),
  };
  let getAccessToken = credential ? createTokenCycler(credential) : () => Promise.resolve(null);
  return {
    name: bearerTokenAuthenticationPolicyName,
    async sendRequest(request, next) {
      if (!request.url.toLowerCase().startsWith("https://"))
        throw Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
      await callbacks.authorizeRequest({
        scopes: Array.isArray(scopes) ? scopes : [scopes],
        request,
        getAccessToken,
        logger,
      });
      let response;
      let error;
      let shouldSendRequest;
      [response, error] = await trySendRequest(request, next);
      if (isChallengeResponse(response)) {
        let claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
        if (claims) {
          let parsedClaim;
          try {
            parsedClaim = atob(claims);
          } catch (e) {
            logger.warning(
              `The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`,
            );
            return response;
          }
          shouldSendRequest = await authorizeRequestOnCaeChallenge(
            {
              scopes: Array.isArray(scopes) ? scopes : [scopes],
              response,
              request,
              getAccessToken,
              logger,
            },
            parsedClaim,
          );
          if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
        } else if (callbacks.authorizeRequestOnChallenge) {
          shouldSendRequest = await callbacks.authorizeRequestOnChallenge({
            scopes: Array.isArray(scopes) ? scopes : [scopes],
            request,
            response,
            getAccessToken,
            logger,
          });
          if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
          if (isChallengeResponse(response)) {
            claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
            if (claims) {
              let parsedClaim;
              try {
                parsedClaim = atob(claims);
              } catch (e) {
                logger.warning(
                  `The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`,
                );
                return response;
              }
              shouldSendRequest = await authorizeRequestOnCaeChallenge(
                {
                  scopes: Array.isArray(scopes) ? scopes : [scopes],
                  response,
                  request,
                  getAccessToken,
                  logger,
                },
                parsedClaim,
              );
              if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
            }
          }
        }
      }
      if (error) throw error;
      else return response;
    },
  };
}
//@ chunk-b5df2wx1.js:66674-66898 esm-fingerprint
function parseChallenges(challenges) {
  let challengeRegex = /(\w+)\s+((?:\w+=(?:"[^"]*"|[^,]*),?\s*)+)/g;
  let paramRegex = /(\w+)="([^"]*)"/g;
  let parsedChallenges = [];
  let match;
  while ((match = challengeRegex.exec(challenges)) !== null) {
    let scheme = match[1];
    let paramsString = match[2];
    let params = {};
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramsString)) !== null) params[paramMatch[1]] = paramMatch[2];
    parsedChallenges.push({
      scheme,
      params,
    });
  }
  return parsedChallenges;
}
//@ chunk-b5df2wx1.js:66898-67078 esm-fingerprint
function getCaeChallengeClaims(challenges) {
  var _a;
  if (!challenges) return;
  return (_a = parseChallenges(challenges).find(
    (x) => x.scheme === "Bearer" && x.params.claims && x.params.error === "insufficient_claims",
  )) === null || _a === undefined
    ? undefined
    : _a.params.claims;
}
export { bearerTokenAuthenticationPolicy };
