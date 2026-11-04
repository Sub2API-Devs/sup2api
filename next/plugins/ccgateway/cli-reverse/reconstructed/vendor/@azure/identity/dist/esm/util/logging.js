/**
 * @azure/identity/dist/esm/util/logging.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (6)
 * attribution: esm-fingerprint 6
 */
import { createClientLogger_2 } from "../../../../logger/dist/esm/index.js";

//@ chunk-mrx6y2r5.js:26851-26873 esm-fingerprint
var logger = createClientLogger_2("identity");
//@ chunk-mrx6y2r5.js:26873-27008 esm-fingerprint
function processEnvVars(supportedEnvVars) {
  return supportedEnvVars.reduce(
    (acc, envVariable) => {
      if (process.env[envVariable]) acc.assigned.push(envVariable);
      else acc.missing.push(envVariable);
      return acc;
    },
    {
      missing: [],
      assigned: [],
    },
  );
}
//@ chunk-mrx6y2r5.js:27008-27084 esm-fingerprint
function formatSuccess(scope) {
  return `SUCCESS. Scopes: ${Array.isArray(scope) ? scope.join(", ") : scope}.`;
}
//@ chunk-mrx6y2r5.js:27084-27269 esm-fingerprint
function formatError(scope, error) {
  let message = "ERROR.";
  if (scope === null || scope === undefined ? undefined : scope.length)
    message += ` Scopes: ${Array.isArray(scope) ? scope.join(", ") : scope}.`;
  return `${message} Error message: ${typeof error === "string" ? error : error.message}.`;
}
//@ chunk-mrx6y2r5.js:27269-27529 esm-fingerprint
function credentialLoggerInstance(title, parent, log = logger) {
  let fullTitle = parent ? `${parent.fullTitle} ${title}` : title;
  function info(message) {
    log.info(`${fullTitle} =>`, message);
  }
  function warning(message) {
    log.warning(`${fullTitle} =>`, message);
  }
  function verbose(message) {
    log.verbose(`${fullTitle} =>`, message);
  }
  function error(message) {
    log.error(`${fullTitle} =>`, message);
  }
  return {
    title,
    fullTitle,
    info,
    warning,
    verbose,
    error,
  };
}
//@ chunk-mrx6y2r5.js:27529-27655 esm-fingerprint
function credentialLogger(title, log = logger) {
  let credLogger = credentialLoggerInstance(title, undefined, log);
  return Object.assign(Object.assign({}, credLogger), {
    parent: log,
    getToken: credentialLoggerInstance("=> getToken()", credLogger, log),
  });
}
export { formatError, credentialLogger, processEnvVars, formatSuccess, logger };
