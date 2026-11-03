/**
 * @azure/identity/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (35)
 * attribution: esm-fingerprint 33, esm-layout 2
 */
import { readFile } from "fs/promises";
import * as child_processModule from "child_process";
import child_process from "child_process";
import { formatError, credentialLogger, processEnvVars, formatSuccess } from "./esm/util/logging.js";
import { DEVELOPER_SIGN_ON_CLIENT_ID, ALL_TENANTS } from "./esm/constants.js";
import { createMsalClient } from "./esm/msal/nodeFlows/msalClient.js";
import { tracingClient } from "./esm/util/tracing.js";
import { ensureValidScopeForDevTimeCreds, getScopeResource, ensureScopes } from "./esm/util/scopeUtils.js";

//@ chunk-mrx6y2r5.js:27655-27745 esm-fingerprint
function isErrorResponse(errorBody) {
  return errorBody && typeof errorBody.error === "string" && typeof errorBody.error_description === "string";
}
//@ chunk-mrx6y2r5.js:27745-27781 esm-fingerprint
var CredentialUnavailableErrorName = "CredentialUnavailableError";
//@ chunk-mrx6y2r5.js:27781-27845 esm-layout
class CredentialUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = CredentialUnavailableErrorName;
  }
}
//@ chunk-mrx6y2r5.js:27845-27874 esm-fingerprint
var AuthenticationErrorName = "AuthenticationError";
//@ chunk-mrx6y2r5.js:27874-28577 esm-fingerprint
class $n extends Error {
  constructor(statusCode, errorBody, options) {
    let errorResponse = {
      error: "unknown",
      errorDescription: "An unknown error occurred and no additional details are available.",
    };
    if (isErrorResponse(errorBody)) errorResponse = convertOAuthErrorResponseToErrorResponse(errorBody);
    else if (typeof errorBody === "string")
      try {
        let oauthErrorResponse = JSON.parse(errorBody);
        errorResponse = convertOAuthErrorResponseToErrorResponse(oauthErrorResponse);
      } catch (e) {
        if (statusCode === 400)
          errorResponse = {
            error: "invalid_request",
            errorDescription: `The service indicated that the request was invalid.

${errorBody}`,
          };
        else
          errorResponse = {
            error: "unknown_error",
            errorDescription: `An unknown error has occurred. Response body:

${errorBody}`,
          };
      }
    else
      errorResponse = {
        error: "unknown_error",
        errorDescription: "An unknown error occurred and no additional details are available.",
      };
    super(
      `${errorResponse.error} Status code: ${statusCode}
More details:
${errorResponse.errorDescription},`,
      options,
    );
    this.statusCode = statusCode;
    this.errorResponse = errorResponse;
    this.name = AuthenticationErrorName;
  }
}
//@ chunk-mrx6y2r5.js:28577-28615 esm-fingerprint
var AggregateAuthenticationErrorName = "AggregateAuthenticationError";
//@ chunk-mrx6y2r5.js:28615-28720 esm-fingerprint
class AggregateAuthenticationError extends Error {
  constructor(errors, errorMessage) {
    let errorDetail = errors.join(`
`);
    super(`${errorMessage}
${errorDetail}`);
    this.errors = errors;
    this.name = AggregateAuthenticationErrorName;
  }
}
//@ chunk-mrx6y2r5.js:28720-28891 esm-fingerprint
function convertOAuthErrorResponseToErrorResponse(errorBody) {
  return {
    error: errorBody.error,
    errorDescription: errorBody.error_description,
    correlationId: errorBody.correlation_id,
    errorCodes: errorBody.error_codes,
    timestamp: errorBody.timestamp,
    traceId: errorBody.trace_id,
  };
}
//@ chunk-mrx6y2r5.js:28891-29078 esm-fingerprint
class AuthenticationRequiredError extends Error {
  constructor(options) {
    super(
      options.message,
      options.cause
        ? {
            cause: options.cause,
          }
        : undefined,
    );
    this.scopes = options.scopes;
    this.getTokenOptions = options.getTokenOptions;
    this.name = "AuthenticationRequiredError";
  }
}
//@ chunk-mrx6y2r5.js:29078-29371 esm-fingerprint
function createConfigurationErrorMessage(tenantId) {
  return `The current credential is not configured to acquire tokens for tenant ${tenantId}. To enable acquiring tokens for this tenant add it to the AdditionallyAllowedTenants on the credential options, or add "*" to AdditionallyAllowedTenants to allow acquiring tokens for any tenant.`;
}
//@ chunk-mrx6y2r5.js:29371-29698 esm-fingerprint
function processMultiTenantRequest(tenantId, getTokenOptions, additionallyAllowedTenantIds = [], n) {
  var _a;
  let resolvedTenantId;
  if (process.env.AZURE_IDENTITY_DISABLE_MULTITENANTAUTH) resolvedTenantId = tenantId;
  else if (tenantId === "adfs") resolvedTenantId = tenantId;
  else
    resolvedTenantId =
      (_a =
        getTokenOptions === null || getTokenOptions === undefined ? undefined : getTokenOptions.tenantId) !==
        null && _a !== undefined
        ? _a
        : tenantId;
  if (
    tenantId &&
    resolvedTenantId !== tenantId &&
    !additionallyAllowedTenantIds.includes("*") &&
    !additionallyAllowedTenantIds.some((t) => t.localeCompare(resolvedTenantId) === 0)
  ) {
    let configurationErrorMessage = createConfigurationErrorMessage(resolvedTenantId);
    if (!(n === null || n === undefined)) n.info(configurationErrorMessage);
    throw new CredentialUnavailableError(configurationErrorMessage);
  }
  return resolvedTenantId;
}
//@ chunk-mrx6y2r5.js:29698-29959 esm-fingerprint
/**
 * Azure Identity：校验 tenant id 格式（第三方 @azure/identity 代码）。
 */
function checkTenantId(e, tenantId) {
  if (!tenantId.match(/^[0-9a-zA-Z-.]+$/)) {
    let r = Error(
      "Invalid tenant id provided. You can locate your tenant id by following the instructions listed here: https://learn.microsoft.com/partner-center/find-ids-and-domain-names.",
    );
    e.info(formatError("", r));
    throw r;
  }
}
//@ chunk-mrx6y2r5.js:29959-30058 esm-fingerprint
/**
 * Azure Identity：解析 tenant（显式 tenant 校验后返回；否则按 clientId 返回 common/organizations）。
 */
function resolveTenantId(options, tenantId, clientId) {
  if (tenantId) {
    checkTenantId(options, tenantId);
    return tenantId;
  }
  if (!clientId) clientId = DEVELOPER_SIGN_ON_CLIENT_ID;
  if (clientId !== DEVELOPER_SIGN_ON_CLIENT_ID) return "common";
  return "organizations";
}
//@ chunk-mrx6y2r5.js:30058-30140 esm-layout
function resolveAdditionallyAllowedTenantIds(additionallyAllowedTenants) {
  if (!additionallyAllowedTenants || additionallyAllowedTenants.length === 0) return [];
  if (additionallyAllowedTenants.includes("*")) return ALL_TENANTS;
  return additionallyAllowedTenants;
}
//@ chunk-mrx6y2r5.js:302180-302218 esm-fingerprint
var logger$h = credentialLogger("ClientAssertionCredential");
//@ chunk-mrx6y2r5.js:302218-303019 esm-fingerprint
class ClientAssertionCredential {
  constructor(tenantId, clientId, getAssertion, options = {}) {
    if (!tenantId)
      throw new CredentialUnavailableError("ClientAssertionCredential: tenantId is a required parameter.");
    if (!clientId)
      throw new CredentialUnavailableError("ClientAssertionCredential: clientId is a required parameter.");
    if (!getAssertion)
      throw new CredentialUnavailableError(
        "ClientAssertionCredential: clientAssertion is a required parameter.",
      );
    this.tenantId = tenantId;
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.options = options;
    this.getAssertion = getAssertion;
    this.msalClient = createMsalClient(
      clientId,
      tenantId,
      Object.assign(Object.assign({}, options), {
        logger: logger$h,
        tokenCredentialOptions: this.options,
      }),
    );
  }
  async getToken(scopes, options = {}) {
    return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
      newOptions.tenantId = processMultiTenantRequest(
        this.tenantId,
        newOptions,
        this.additionallyAllowedTenantIds,
        logger$h,
      );
      let arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
      return this.msalClient.getTokenByClientAssertion(arrayScopes, this.getAssertion, newOptions);
    });
  }
}
//@ chunk-mrx6y2r5.js:303059-303174 esm-fingerprint
var credentialName$4 = "WorkloadIdentityCredential";
var SupportedWorkloadEnvironmentVariables = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_FEDERATED_TOKEN_FILE",
];
var logger$g = credentialLogger(credentialName$4);
//@ chunk-mrx6y2r5.js:303174-305977 esm-fingerprint
class WorkloadIdentityCredential {
  constructor(options) {
    this.azureFederatedTokenFileContent = undefined;
    this.cacheDate = undefined;
    let assignedEnv = processEnvVars(SupportedWorkloadEnvironmentVariables).assigned.join(", ");
    logger$g.info(`Found the following environment variables: ${assignedEnv}`);
    let workloadIdentityCredentialOptions = options !== null && options !== undefined ? options : {};
    let tenantId = workloadIdentityCredentialOptions.tenantId || process.env.AZURE_TENANT_ID;
    let clientId = workloadIdentityCredentialOptions.clientId || process.env.AZURE_CLIENT_ID;
    this.federatedTokenFilePath =
      workloadIdentityCredentialOptions.tokenFilePath || process.env.AZURE_FEDERATED_TOKEN_FILE;
    if (tenantId) checkTenantId(logger$g, tenantId);
    if (!clientId)
      throw new CredentialUnavailableError(`${credentialName$4}: is unavailable. clientId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_CLIENT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
    if (!tenantId)
      throw new CredentialUnavailableError(`${credentialName$4}: is unavailable. tenantId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_TENANT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
    if (!this.federatedTokenFilePath)
      throw new CredentialUnavailableError(`${credentialName$4}: is unavailable. federatedTokenFilePath is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_FEDERATED_TOKEN_FILE".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
    logger$g.info(
      `Invoking ClientAssertionCredential with tenant ID: ${tenantId}, clientId: ${workloadIdentityCredentialOptions.clientId} and federated token path: [REDACTED]`,
    );
    this.client = new ClientAssertionCredential(
      tenantId,
      clientId,
      this.readFileContents.bind(this),
      options,
    );
  }
  async getToken(scopes, options) {
    if (!this.client) {
      let errorMessage = `${credentialName$4}: is unavailable. tenantId, clientId, and federatedTokenFilePath are required parameters. 
      In DefaultAzureCredential and ManagedIdentityCredential, these can be provided as environment variables - 
      "AZURE_TENANT_ID",
      "AZURE_CLIENT_ID",
      "AZURE_FEDERATED_TOKEN_FILE". See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`;
      logger$g.info(errorMessage);
      throw new CredentialUnavailableError(errorMessage);
    }
    logger$g.info("Invoking getToken() of Client Assertion Credential");
    return this.client.getToken(scopes, options);
  }
  async readFileContents() {
    if (this.cacheDate !== undefined && Date.now() - this.cacheDate >= 300000)
      this.azureFederatedTokenFileContent = undefined;
    if (!this.federatedTokenFilePath)
      throw new CredentialUnavailableError(
        `${credentialName$4}: is unavailable. Invalid file path provided ${this.federatedTokenFilePath}.`,
      );
    if (!this.azureFederatedTokenFileContent) {
      let value = (await readFile(this.federatedTokenFilePath, "utf8")).trim();
      if (!value)
        throw new CredentialUnavailableError(
          `${credentialName$4}: is unavailable. No content on the file ${this.federatedTokenFilePath}.`,
        );
      else {
        this.azureFederatedTokenFileContent = value;
        this.cacheDate = Date.now();
      }
    }
    return this.azureFederatedTokenFileContent;
  }
}
//@ chunk-mrx6y2r5.js:305977-306645 esm-fingerprint
var msiName_2 = "ManagedIdentityCredential - Token Exchange";
var cC = credentialLogger(msiName_2);
var vc = {
  name: "tokenExchangeMsi",
  async isAvailable(clientId) {
    let env = process.env;
    let result = Boolean(
      (clientId || env.AZURE_CLIENT_ID) && env.AZURE_TENANT_ID && process.env.AZURE_FEDERATED_TOKEN_FILE,
    );
    if (!result)
      cC.info(
        `${msiName_2}: Unavailable. The environment variables needed are: AZURE_CLIENT_ID (or the client ID sent through the parameters), AZURE_TENANT_ID and AZURE_FEDERATED_TOKEN_FILE`,
      );
    return result;
  },
  async getToken(configuration, getTokenOptions = {}) {
    let { scopes, clientId } = configuration;
    let identityClientTokenCredentialOptions = {};
    return new WorkloadIdentityCredential(
      Object.assign(
        Object.assign(
          {
            clientId,
            tenantId: process.env.AZURE_TENANT_ID,
            tokenFilePath: process.env.AZURE_FEDERATED_TOKEN_FILE,
          },
          identityClientTokenCredentialOptions,
        ),
        {
          disableInstanceDiscovery: true,
        },
      ),
    ).getToken(scopes, getTokenOptions);
  },
};
//@ chunk-mrx6y2r5.js:314766-315144 esm-fingerprint
var logger$c = credentialLogger("AzureDeveloperCliCredential");
var developerCliCredentialInternals = {
  getSafeWorkingDir() {
    return "/bin";
  },
  async getAzdAccessToken(scopes, tenantId, timeout) {
    let tenantSection = [];
    if (tenantId) tenantSection = ["--tenant-id", tenantId];
    return new Promise((resolve, reject) => {
      try {
        child_process.execFile(
          "azd",
          [
            "auth",
            "token",
            "--output",
            "json",
            ...scopes.reduce((previous, current) => previous.concat("--scope", current), []),
            ...tenantSection,
          ],
          {
            cwd: developerCliCredentialInternals.getSafeWorkingDir(),
            timeout,
          },
          (error, stdout, stderr) => {
            resolve({
              stdout,
              stderr,
              error,
            });
          },
        );
      } catch (err) {
        reject(err);
      }
    });
  },
};
//@ chunk-mrx6y2r5.js:315144-317050 esm-fingerprint
class AzureDeveloperCliCredential {
  constructor(options) {
    if (options === null || options === undefined ? undefined : options.tenantId) {
      checkTenantId(logger$c, options === null || options === undefined ? undefined : options.tenantId);
      this.tenantId = options === null || options === undefined ? undefined : options.tenantId;
    }
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.timeout = options === null || options === undefined ? undefined : options.processTimeoutInMs;
  }
  async getToken(scopes, options = {}) {
    let tenantId = processMultiTenantRequest(this.tenantId, options, this.additionallyAllowedTenantIds);
    if (tenantId) checkTenantId(logger$c, tenantId);
    let scopeList;
    if (typeof scopes === "string") scopeList = [scopes];
    else scopeList = scopes;
    logger$c.getToken.info(`Using the scopes ${scopes}`);
    return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
      var _a;
      var _b;
      var _c;
      var _d;
      try {
        scopeList.forEach((scope) => {
          ensureValidScopeForDevTimeCreds(scope, logger$c);
        });
        let obj = await developerCliCredentialInternals.getAzdAccessToken(scopeList, tenantId, this.timeout);
        let isNotLoggedInError =
          ((_a = obj.stderr) === null || _a === undefined
            ? undefined
            : _a.match("not logged in, run `azd login` to login")) ||
          ((_b = obj.stderr) === null || _b === undefined
            ? undefined
            : _b.match("not logged in, run `azd auth login` to login"));
        if (
          ((_c = obj.stderr) === null || _c === undefined ? undefined : _c.match("azd:(.*)not found")) ||
          ((_d = obj.stderr) === null || _d === undefined
            ? undefined
            : _d.startsWith("'azd' is not recognized")) ||
          (obj.error && obj.error.code === "ENOENT")
        ) {
          let error = new CredentialUnavailableError(
            "Azure Developer CLI couldn't be found. To mitigate this issue, see the troubleshooting guidelines at https://aka.ms/azsdk/js/identity/azdevclicredential/troubleshoot.",
          );
          logger$c.getToken.info(formatError(scopes, error));
          throw error;
        }
        if (isNotLoggedInError) {
          let error = new CredentialUnavailableError(
            "Please run 'azd auth login' from a command prompt to authenticate before using this credential. For more information, see the troubleshooting guidelines at https://aka.ms/azsdk/js/identity/azdevclicredential/troubleshoot.",
          );
          logger$c.getToken.info(formatError(scopes, error));
          throw error;
        }
        try {
          let resp = JSON.parse(obj.stdout);
          logger$c.getToken.info(formatSuccess(scopes));
          return {
            token: resp.token,
            expiresOnTimestamp: new Date(resp.expiresOn).getTime(),
            tokenType: "Bearer",
          };
        } catch (e) {
          if (obj.stderr) throw new CredentialUnavailableError(obj.stderr);
          throw e;
        }
      } catch (err) {
        let error =
          err.name === "CredentialUnavailableError"
            ? err
            : new CredentialUnavailableError(
                err.message || "Unknown error while trying to retrieve the access token",
              );
        logger$c.getToken.info(formatError(scopes, error));
        throw error;
      }
    });
  }
}
//@ chunk-mrx6y2r5.js:317083-317288 esm-fingerprint
var processUtils = {
  execFile(file, params, options) {
    return new Promise((resolve, reject) => {
      child_processModule.execFile(file, params, options, (error, stdout, stderr) => {
        if (Buffer.isBuffer(stdout)) stdout = stdout.toString("utf8");
        if (Buffer.isBuffer(stderr)) stderr = stderr.toString("utf8");
        if (stderr || error) reject(stderr ? Error(stderr) : error);
        else resolve(stdout);
      });
    });
  },
};
//@ chunk-mrx6y2r5.js:317288-317332 esm-fingerprint
var logger$b = credentialLogger("AzurePowerShellCredential");
var isWindows = false;
//@ chunk-mrx6y2r5.js:317332-317384 esm-fingerprint
function formatCommand(commandName) {
  if (isWindows) return `${commandName}.exe`;
  else return commandName;
}
//@ chunk-mrx6y2r5.js:317384-317518 esm-fingerprint
async function runCommands(commands, timeout) {
  let results = [];
  for (let command of commands) {
    let [file, ...parameters] = command;
    let result = await processUtils.execFile(file, parameters, {
      encoding: "utf8",
      timeout,
    });
    results.push(result);
  }
  return results;
}
//@ chunk-mrx6y2r5.js:317518-318208 esm-fingerprint
var powerShellErrors = {
  login: "Run Connect-AzAccount to login",
  installed:
    "The specified module 'Az.Accounts' with version '2.2.0' was not loaded because no valid module file was found in any module directory",
};
var powerShellPublicErrorMessages = {
  login: "Please run 'Connect-AzAccount' from PowerShell to authenticate before using this credential.",
  installed: `The 'Az.Account' module >= 2.2.0 is not installed. Install the Azure Az PowerShell module with: "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force".`,
  troubleshoot: "To troubleshoot, visit https://aka.ms/azsdk/js/identity/powershellcredential/troubleshoot.",
};
var isLoginError = (err) => err.message.match(`(.*)${powerShellErrors.login}(.*)`);
var isNotInstalledError = (err) => err.message.match(powerShellErrors.installed);
var commandStack = [formatCommand("pwsh")];
//@ chunk-mrx6y2r5.js:318208-318240 esm-fingerprint
if (isWindows) commandStack.push(formatCommand("powershell"));
//@ chunk-mrx6y2r5.js:318240-320501 esm-fingerprint
class AzurePowerShellCredential {
  constructor(options) {
    if (options === null || options === undefined ? undefined : options.tenantId) {
      checkTenantId(logger$b, options === null || options === undefined ? undefined : options.tenantId);
      this.tenantId = options === null || options === undefined ? undefined : options.tenantId;
    }
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.timeout = options === null || options === undefined ? undefined : options.processTimeoutInMs;
  }
  async getAzurePowerShellAccessToken(resource, tenantId, timeout) {
    for (let powerShellCommand of [...commandStack]) {
      try {
        await runCommands([[powerShellCommand, "/?"]], timeout);
      } catch (e) {
        commandStack.shift();
        continue;
      }
      let result = (
        await runCommands([
          [
            powerShellCommand,
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `
          $tenantId = "${tenantId !== null && tenantId !== undefined ? tenantId : ""}"
          $m = Import-Module Az.Accounts -MinimumVersion 2.2.0 -PassThru
          $useSecureString = $m.Version -ge [version]'2.17.0'

          $params = @{
            ResourceUrl = "${resource}"
          }

          if ($tenantId.Length -gt 0) {
            $params["TenantId"] = $tenantId
          }

          if ($useSecureString) {
            $params["AsSecureString"] = $true
          }

          $token = Get-AzAccessToken @params

          $result = New-Object -TypeName PSObject
          $result | Add-Member -MemberType NoteProperty -Name ExpiresOn -Value $token.ExpiresOn
          if ($useSecureString) {
            $result | Add-Member -MemberType NoteProperty -Name Token -Value (ConvertFrom-SecureString -AsPlainText $token.Token)
          } else {
            $result | Add-Member -MemberType NoteProperty -Name Token -Value $token.Token
          }

          Write-Output (ConvertTo-Json $result)
          `,
          ],
        ])
      )[0];
      return parseJsonToken(result);
    }
    throw Error("Unable to execute PowerShell. Ensure that it is installed in your system");
  }
  async getToken(scopes, options = {}) {
    return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
      let tenantId = processMultiTenantRequest(this.tenantId, options, this.additionallyAllowedTenantIds);
      let scope = typeof scopes === "string" ? scopes : scopes[0];
      if (tenantId) checkTenantId(logger$b, tenantId);
      try {
        ensureValidScopeForDevTimeCreds(scope, logger$b);
        logger$b.getToken.info(`Using the scope ${scope}`);
        let resource = getScopeResource(scope);
        let response = await this.getAzurePowerShellAccessToken(resource, tenantId, this.timeout);
        logger$b.getToken.info(formatSuccess(scopes));
        return {
          token: response.Token,
          expiresOnTimestamp: new Date(response.ExpiresOn).getTime(),
          tokenType: "Bearer",
        };
      } catch (err) {
        if (isNotInstalledError(err)) {
          let error = new CredentialUnavailableError(powerShellPublicErrorMessages.installed);
          logger$b.getToken.info(formatError(scope, error));
          throw error;
        } else if (isLoginError(err)) {
          let error = new CredentialUnavailableError(powerShellPublicErrorMessages.login);
          logger$b.getToken.info(formatError(scope, error));
          throw error;
        }
        let error = new CredentialUnavailableError(`${err}. ${powerShellPublicErrorMessages.troubleshoot}`);
        logger$b.getToken.info(formatError(scope, error));
        throw error;
      }
    });
  }
}
//@ chunk-mrx6y2r5.js:320501-320882 esm-fingerprint
async function parseJsonToken(result) {
  let jsonRegex = /{[^{}]*}/g;
  let matches = result.match(jsonRegex);
  let resultWithoutToken = result;
  if (matches)
    try {
      for (let item of matches)
        try {
          let jsonContent = JSON.parse(item);
          if (jsonContent === null || jsonContent === undefined ? undefined : jsonContent.Token) {
            resultWithoutToken = resultWithoutToken.replace(item, "");
            if (resultWithoutToken) logger$b.getToken.warning(resultWithoutToken);
            return jsonContent;
          }
        } catch (e) {
          continue;
        }
    } catch (e) {
      throw Error(`Unable to parse the output of PowerShell. Received output: ${result}`);
    }
  throw Error(`No access token found in the output. Received output: ${result}`);
}
//@ chunk-mrx6y2r5.js:320882-320917 esm-fingerprint
var logger$a = credentialLogger("ChainedTokenCredential");
//@ chunk-mrx6y2r5.js:320917-321699 esm-fingerprint
class ChainedTokenCredential {
  constructor(...sources) {
    this._sources = [];
    this._sources = sources;
  }
  async getToken(scopes, options = {}) {
    let { token } = await this.getTokenInternal(scopes, options);
    return token;
  }
  async getTokenInternal(scopes, options = {}) {
    let token = null;
    let successfulCredential;
    let errors = [];
    return tracingClient.withSpan("ChainedTokenCredential.getToken", options, async (updatedOptions) => {
      for (let i = 0; i < this._sources.length && token === null; i++)
        try {
          token = await this._sources[i].getToken(scopes, updatedOptions);
          successfulCredential = this._sources[i];
        } catch (err) {
          if (err.name === "CredentialUnavailableError" || err.name === "AuthenticationRequiredError")
            errors.push(err);
          else {
            logger$a.getToken.info(formatError(scopes, err));
            throw err;
          }
        }
      if (!token && errors.length > 0) {
        let err = new AggregateAuthenticationError(errors, "ChainedTokenCredential authentication failed.");
        logger$a.getToken.info(formatError(scopes, err));
        throw err;
      }
      logger$a.getToken.info(`Result for ${successfulCredential.constructor.name}: ${formatSuccess(scopes)}`);
      if (token === null) throw new CredentialUnavailableError("Failed to retrieve a valid token");
      return {
        token,
        successfulCredential,
      };
    });
  }
}
//@ chunk-mrx6y2r5.js:324245-324280 esm-fingerprint
var logger$8 = credentialLogger("ClientSecretCredential");
//@ chunk-mrx6y2r5.js:324280-325326 esm-fingerprint
class ClientSecretCredential {
  constructor(tenantId, clientId, clientSecret, options = {}) {
    if (!tenantId)
      throw new CredentialUnavailableError(
        "ClientSecretCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.",
      );
    if (!clientId)
      throw new CredentialUnavailableError(
        "ClientSecretCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.",
      );
    if (!clientSecret)
      throw new CredentialUnavailableError(
        "ClientSecretCredential: clientSecret is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.",
      );
    this.clientSecret = clientSecret;
    this.tenantId = tenantId;
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.msalClient = createMsalClient(
      clientId,
      tenantId,
      Object.assign(Object.assign({}, options), {
        logger: logger$8,
        tokenCredentialOptions: options,
      }),
    );
  }
  async getToken(scopes, options = {}) {
    return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
      newOptions.tenantId = processMultiTenantRequest(
        this.tenantId,
        newOptions,
        this.additionallyAllowedTenantIds,
        logger$8,
      );
      let arrayScopes = ensureScopes(scopes);
      return this.msalClient.getTokenByClientSecret(arrayScopes, this.clientSecret, newOptions);
    });
  }
}
//@ chunk-mrx6y2r5.js:325326-325365 esm-fingerprint
var logger$7 = credentialLogger("UsernamePasswordCredential");
//@ chunk-mrx6y2r5.js:325365-326641 esm-fingerprint
class UsernamePasswordCredential {
  constructor(tenantId, clientId, username, password, options = {}) {
    if (!tenantId)
      throw new CredentialUnavailableError(
        "UsernamePasswordCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    if (!clientId)
      throw new CredentialUnavailableError(
        "UsernamePasswordCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    if (!username)
      throw new CredentialUnavailableError(
        "UsernamePasswordCredential: username is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    if (!password)
      throw new CredentialUnavailableError(
        "UsernamePasswordCredential: password is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    this.tenantId = tenantId;
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.username = username;
    this.password = password;
    this.msalClient = createMsalClient(
      clientId,
      this.tenantId,
      Object.assign(Object.assign({}, options), {
        tokenCredentialOptions: options !== null && options !== undefined ? options : {},
      }),
    );
  }
  async getToken(scopes, options = {}) {
    return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
      newOptions.tenantId = processMultiTenantRequest(
        this.tenantId,
        newOptions,
        this.additionallyAllowedTenantIds,
        logger$7,
      );
      let arrayScopes = ensureScopes(scopes);
      return this.msalClient.getTokenByUsernamePassword(
        arrayScopes,
        this.username,
        this.password,
        newOptions,
      );
    });
  }
}
export {
  $n,
  AuthenticationErrorName,
  AuthenticationRequiredError,
  CredentialUnavailableError,
  resolveTenantId,
  vc,
  checkTenantId,
  resolveAdditionallyAllowedTenantIds,
  processMultiTenantRequest,
  ClientSecretCredential,
  UsernamePasswordCredential,
  WorkloadIdentityCredential,
  AzureDeveloperCliCredential,
  AzurePowerShellCredential,
  ChainedTokenCredential,
};
