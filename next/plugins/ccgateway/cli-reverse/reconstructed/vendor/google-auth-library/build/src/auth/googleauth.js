/**
 * google-auth-library/build/src/auth/googleauth.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_gcp_metadata } from "../../../../gcp-metadata/build/src/index.js";
import { require_crypto_3 } from "../crypto/crypto.js";
import { require_computeclient } from "./computeclient.js";
import { require_idtokenclient } from "./idtokenclient.js";
import { require_envDetect } from "./envDetect.js";
import { require_jwtclient } from "./jwtclient.js";
import { require_refreshclient } from "./refreshclient.js";
import { require_impersonated } from "./impersonated.js";
import { require_externalclient } from "./externalclient.js";
import { require_baseexternalclient } from "./baseexternalclient.js";
import { require_authclient } from "./authclient.js";
import { require_externalAccountAuthorizedUserClient } from "./externalAccountAuthorizedUserClient.js";
import { require_util } from "../util.js";

//@ chunk-e8d3a8an.js:139003-151258 cjs-fingerprint
var require_googleauth = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GoogleAuth = cjsExports.GoogleAuthExceptionMessages = undefined;
  var child_process_1 = importMetaRequire("child_process");
  var fs = importMetaRequire("fs");
  var gaxios_1 = require_gaxios_2();
  var gcpMetadata = require_gcp_metadata();
  var os = importMetaRequire("os");
  var path = importMetaRequire("path");
  var crypto_1 = require_crypto_3();
  var computeclient_1 = require_computeclient();
  var idtokenclient_1 = require_idtokenclient();
  var envDetect_1 = require_envDetect();
  var jwtclient_1 = require_jwtclient();
  var refreshclient_1 = require_refreshclient();
  var impersonated_1 = require_impersonated();
  var externalclient_1 = require_externalclient();
  var baseexternalclient_1 = require_baseexternalclient();
  var authclient_1 = require_authclient();
  var externalAccountAuthorizedUserClient_1 = require_externalAccountAuthorizedUserClient();
  var util_1 = require_util();
  cjsExports.GoogleAuthExceptionMessages = {
    API_KEY_WITH_CREDENTIALS:
      "API Keys and Credentials are mutually exclusive authentication methods and cannot be used together.",
    NO_PROJECT_ID_FOUND: `Unable to detect a Project Id in the current environment. 
To learn more about authentication and Google APIs, visit: 
https://cloud.google.com/docs/authentication/getting-started`,
    NO_CREDENTIALS_FOUND: `Unable to find credentials in current environment. 
To learn more about authentication and Google APIs, visit: 
https://cloud.google.com/docs/authentication/getting-started`,
    NO_ADC_FOUND:
      "Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.",
    NO_UNIVERSE_DOMAIN_FOUND: `Unable to detect a Universe Domain in the current environment.
To learn more about Universe Domain retrieval, visit: 
https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys`,
  };
  class GoogleAuth {
    checkIsGCE = undefined;
    useJWTAccessWithScope;
    defaultServicePath;
    get isGCE() {
      return this.checkIsGCE;
    }
    _findProjectIdPromise;
    _cachedProjectId;
    jsonContent = null;
    apiKey;
    cachedCredential = null;
    #e = null;
    defaultScopes;
    keyFilename;
    scopes;
    clientOptions = {};
    constructor(opts = {}) {
      this._cachedProjectId = opts.projectId || null;
      this.cachedCredential = opts.authClient || null;
      this.keyFilename = opts.keyFilename || opts.keyFile;
      this.scopes = opts.scopes;
      this.clientOptions = opts.clientOptions || {};
      this.jsonContent = opts.credentials || null;
      this.apiKey = opts.apiKey || this.clientOptions.apiKey || null;
      if (this.apiKey && (this.jsonContent || this.clientOptions.credentials))
        throw RangeError(cjsExports.GoogleAuthExceptionMessages.API_KEY_WITH_CREDENTIALS);
      if (opts.universeDomain) this.clientOptions.universeDomain = opts.universeDomain;
    }
    setGapicJWTValues(client) {
      client.defaultServicePath = this.defaultServicePath;
      client.useJWTAccessWithScope = this.useJWTAccessWithScope;
      client.defaultScopes = this.defaultScopes;
    }
    getProjectId(callback) {
      if (callback) this.getProjectIdAsync().then((r) => callback(null, r), callback);
      else return this.getProjectIdAsync();
    }
    async getProjectIdOptional() {
      try {
        return await this.getProjectId();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === cjsExports.GoogleAuthExceptionMessages.NO_PROJECT_ID_FOUND
        )
          return null;
        else throw error;
      }
    }
    async findAndCacheProjectId() {
      let projectId = null;
      projectId ||= await this.getProductionProjectId();
      projectId ||= await this.getFileProjectId();
      projectId ||= await this.getDefaultServiceProjectId();
      projectId ||= await this.getGCEProjectId();
      projectId ||= await this.getExternalAccountClientProjectId();
      if (projectId) {
        this._cachedProjectId = projectId;
        return projectId;
      } else throw Error(cjsExports.GoogleAuthExceptionMessages.NO_PROJECT_ID_FOUND);
    }
    async getProjectIdAsync() {
      if (this._cachedProjectId) return this._cachedProjectId;
      if (!this._findProjectIdPromise) this._findProjectIdPromise = this.findAndCacheProjectId();
      return this._findProjectIdPromise;
    }
    async getUniverseDomainFromMetadataServer() {
      let universeDomain;
      try {
        universeDomain = await gcpMetadata.universe("universe-domain");
        universeDomain ||= authclient_1.DEFAULT_UNIVERSE;
      } catch (e) {
        if (e && e?.response?.status === 404) universeDomain = authclient_1.DEFAULT_UNIVERSE;
        else throw e;
      }
      return universeDomain;
    }
    async getUniverseDomain() {
      let universeDomain = util_1.originalOrCamelOptions(this.clientOptions).get("universe_domain");
      try {
        universeDomain ??= (await this.getClient()).universeDomain;
      } catch {
        universeDomain ??= authclient_1.DEFAULT_UNIVERSE;
      }
      return universeDomain;
    }
    getAnyScopes() {
      return this.scopes || this.defaultScopes;
    }
    getApplicationDefault(optionsOrCallback = {}, callback) {
      let options;
      if (typeof optionsOrCallback === "function") callback = optionsOrCallback;
      else options = optionsOrCallback;
      if (callback)
        this.getApplicationDefaultAsync(options).then(
          (r) => callback(null, r.credential, r.projectId),
          callback,
        );
      else return this.getApplicationDefaultAsync(options);
    }
    async getApplicationDefaultAsync(options = {}) {
      if (this.cachedCredential) return await this.#t(this.cachedCredential, null);
      let credential;
      credential = await this._tryGetApplicationCredentialsFromEnvironmentVariable(options);
      if (credential) {
        if (credential instanceof jwtclient_1.JWT) credential.scopes = this.scopes;
        else if (credential instanceof baseexternalclient_1.BaseExternalAccountClient)
          credential.scopes = this.getAnyScopes();
        return await this.#t(credential);
      }
      credential = await this._tryGetApplicationCredentialsFromWellKnownFile(options);
      if (credential) {
        if (credential instanceof jwtclient_1.JWT) credential.scopes = this.scopes;
        else if (credential instanceof baseexternalclient_1.BaseExternalAccountClient)
          credential.scopes = this.getAnyScopes();
        return await this.#t(credential);
      }
      if (await this._checkIsGCE()) {
        options.scopes = this.getAnyScopes();
        return await this.#t(new computeclient_1.Compute(options));
      }
      throw Error(cjsExports.GoogleAuthExceptionMessages.NO_ADC_FOUND);
    }
    async #t(credential, quotaProjectIdOverride = process.env.GOOGLE_CLOUD_QUOTA_PROJECT || null) {
      let projectId = await this.getProjectIdOptional();
      if (quotaProjectIdOverride) credential.quotaProjectId = quotaProjectIdOverride;
      this.cachedCredential = credential;
      return {
        credential,
        projectId,
      };
    }
    async _checkIsGCE() {
      if (this.checkIsGCE === undefined)
        this.checkIsGCE = gcpMetadata.getGCPResidency() || (await gcpMetadata.isAvailable());
      return this.checkIsGCE;
    }
    async _tryGetApplicationCredentialsFromEnvironmentVariable(options) {
      let credentialsPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.google_application_credentials;
      if (!credentialsPath || credentialsPath.length === 0) return null;
      try {
        return this._getApplicationCredentialsFromFilePath(credentialsPath, options);
      } catch (e) {
        if (e instanceof Error)
          e.message = `Unable to read the credential file specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable: ${e.message}`;
        throw e;
      }
    }
    async _tryGetApplicationCredentialsFromWellKnownFile(requestOptions) {
      let location = null;
      if (this._isWindows()) location = process.env.APPDATA;
      else {
        let home = process.env.HOME;
        if (home) location = path.join(home, ".config");
      }
      if (location) {
        location = path.join(location, "gcloud", "application_default_credentials.json");
        if (!fs.existsSync(location)) location = null;
      }
      if (!location) return null;
      return await this._getApplicationCredentialsFromFilePath(location, requestOptions);
    }
    async _getApplicationCredentialsFromFilePath(filePath, options = {}) {
      if (!filePath || filePath.length === 0) throw Error("The file path is invalid.");
      try {
        filePath = fs.realpathSync(filePath);
        if (!fs.lstatSync(filePath).isFile()) throw Error();
      } catch (err) {
        if (err instanceof Error)
          err.message = `The file at ${filePath} does not exist, or it is not a file. ${err.message}`;
        throw err;
      }
      let readStream = fs.createReadStream(filePath);
      return this.fromStream(readStream, options);
    }
    fromImpersonatedJSON(json) {
      if (!json) throw Error("Must pass in a JSON object containing an  impersonated refresh token");
      if (json.type !== impersonated_1.IMPERSONATED_ACCOUNT_TYPE)
        throw Error(
          `The incoming JSON object does not have the "${impersonated_1.IMPERSONATED_ACCOUNT_TYPE}" type`,
        );
      if (!json.source_credentials)
        throw Error("The incoming JSON object does not contain a source_credentials field");
      if (!json.service_account_impersonation_url)
        throw Error("The incoming JSON object does not contain a service_account_impersonation_url field");
      let sourceClient = this.fromJSON(json.source_credentials, {
        transporterOptions: this.clientOptions.transporterOptions,
      });
      if (json.service_account_impersonation_url?.length > 256)
        throw RangeError(`Target principal is too long: ${json.service_account_impersonation_url}`);
      let targetPrincipal = /(?<target>[^/]+):(generateAccessToken|generateIdToken)$/.exec(
        json.service_account_impersonation_url,
      )?.groups?.target;
      if (!targetPrincipal)
        throw RangeError(`Cannot extract target principal from ${json.service_account_impersonation_url}`);
      let targetScopes = (this.scopes || json.scopes || this.defaultScopes) ?? [];
      return new impersonated_1.Impersonated({
        ...json,
        transporterOptions: this.clientOptions.transporterOptions,
        sourceClient,
        targetPrincipal,
        targetScopes: Array.isArray(targetScopes) ? targetScopes : [targetScopes],
      });
    }
    fromJSON(json, options = {}) {
      let client;
      let preferredUniverseDomain = util_1.originalOrCamelOptions(options).get("universe_domain");
      if (json.type === refreshclient_1.USER_REFRESH_ACCOUNT_TYPE) {
        client = new refreshclient_1.UserRefreshClient(options);
        client.fromJSON(json);
      } else if (json.type === impersonated_1.IMPERSONATED_ACCOUNT_TYPE)
        client = this.fromImpersonatedJSON(json);
      else if (json.type === baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE) {
        client = externalclient_1.ExternalAccountClient.fromJSON({
          ...json,
          ...options,
        });
        client.scopes = this.getAnyScopes();
      } else if (json.type === externalAccountAuthorizedUserClient_1.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE)
        client = new externalAccountAuthorizedUserClient_1.ExternalAccountAuthorizedUserClient({
          ...json,
          ...options,
        });
      else {
        options.scopes = this.scopes;
        client = new jwtclient_1.JWT(options);
        this.setGapicJWTValues(client);
        client.fromJSON(json);
      }
      if (preferredUniverseDomain) client.universeDomain = preferredUniverseDomain;
      return client;
    }
    _cacheClientFromJSON(json, options) {
      let client = this.fromJSON(json, options);
      this.jsonContent = json;
      this.cachedCredential = client;
      return client;
    }
    fromStream(inputStream, optionsOrCallback = {}, callback) {
      let options = {};
      if (typeof optionsOrCallback === "function") callback = optionsOrCallback;
      else options = optionsOrCallback;
      if (callback) this.fromStreamAsync(inputStream, options).then((r) => callback(null, r), callback);
      else return this.fromStreamAsync(inputStream, options);
    }
    fromStreamAsync(inputStream, options) {
      return new Promise((resolve, reject) => {
        if (!inputStream) throw Error("Must pass in a stream containing the Google auth settings.");
        let chunks = [];
        inputStream
          .setEncoding("utf8")
          .on("error", reject)
          .on("data", (chunk) => chunks.push(chunk))
          .on("end", () => {
            try {
              try {
                let data = JSON.parse(chunks.join(""));
                let r = this._cacheClientFromJSON(data, options);
                return resolve(r);
              } catch (err) {
                if (!this.keyFilename) throw err;
                let client = new jwtclient_1.JWT({
                  ...this.clientOptions,
                  keyFile: this.keyFilename,
                });
                this.cachedCredential = client;
                this.setGapicJWTValues(client);
                return resolve(client);
              }
            } catch (err) {
              return reject(err);
            }
          });
      });
    }
    fromAPIKey(apiKey, options = {}) {
      return new jwtclient_1.JWT({
        ...options,
        apiKey,
      });
    }
    _isWindows() {
      let sys = os.platform();
      if (sys && sys.length >= 3) {
        if (sys.substring(0, 3).toLowerCase() === "win") return true;
      }
      return false;
    }
    async getDefaultServiceProjectId() {
      return new Promise((resolve) => {
        child_process_1.exec("gcloud config config-helper --format json", (err, stdout) => {
          if (!err && stdout)
            try {
              let projectId = JSON.parse(stdout).configuration.properties.core.project;
              resolve(projectId);
              return;
            } catch (e) {}
          resolve(null);
        });
      });
    }
    getProductionProjectId() {
      return (
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.gcloud_project ||
        process.env.google_cloud_project
      );
    }
    async getFileProjectId() {
      if (this.cachedCredential) return this.cachedCredential.projectId;
      if (this.keyFilename) {
        let creds = await this.getClient();
        if (creds && creds.projectId) return creds.projectId;
      }
      let r = await this._tryGetApplicationCredentialsFromEnvironmentVariable();
      if (r) return r.projectId;
      else return null;
    }
    async getExternalAccountClientProjectId() {
      if (!this.jsonContent || this.jsonContent.type !== baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE)
        return null;
      return await (await this.getClient()).getProjectId();
    }
    async getGCEProjectId() {
      try {
        return await gcpMetadata.project("project-id");
      } catch (error) {
        return null;
      }
    }
    getCredentials(callback) {
      if (callback) this.getCredentialsAsync().then((r) => callback(null, r), callback);
      else return this.getCredentialsAsync();
    }
    async getCredentialsAsync() {
      let client = await this.getClient();
      if (client instanceof impersonated_1.Impersonated)
        return {
          client_email: client.getTargetPrincipal(),
        };
      if (client instanceof baseexternalclient_1.BaseExternalAccountClient) {
        let serviceAccountEmail = client.getServiceAccountEmail();
        if (serviceAccountEmail)
          return {
            client_email: serviceAccountEmail,
            universe_domain: client.universeDomain,
          };
      }
      if (this.jsonContent)
        return {
          client_email: this.jsonContent.client_email,
          private_key: this.jsonContent.private_key,
          universe_domain: this.jsonContent.universe_domain,
        };
      if (await this._checkIsGCE()) {
        let [client_email, universe_domain] = await Promise.all([
          gcpMetadata.instance("service-accounts/default/email"),
          this.getUniverseDomain(),
        ]);
        return {
          client_email,
          universe_domain,
        };
      }
      throw Error(cjsExports.GoogleAuthExceptionMessages.NO_CREDENTIALS_FOUND);
    }
    async getClient() {
      if (this.cachedCredential) return this.cachedCredential;
      this.#e = this.#e || this.#r();
      try {
        return await this.#e;
      } finally {
        this.#e = null;
      }
    }
    async #r() {
      if (this.jsonContent) return this._cacheClientFromJSON(this.jsonContent, this.clientOptions);
      else if (this.keyFilename) {
        let filePath = path.resolve(this.keyFilename);
        let stream = fs.createReadStream(filePath);
        return await this.fromStreamAsync(stream, this.clientOptions);
      } else if (this.apiKey) {
        let client = await this.fromAPIKey(this.apiKey, this.clientOptions);
        client.scopes = this.scopes;
        let { credential } = await this.#t(client);
        return credential;
      } else {
        let { credential } = await this.getApplicationDefaultAsync(this.clientOptions);
        return credential;
      }
    }
    async getIdTokenClient(targetAudience) {
      let client = await this.getClient();
      if (!("fetchIdToken" in client))
        throw Error(
          "Cannot fetch ID token in this environment, use GCE or set the GOOGLE_APPLICATION_CREDENTIALS environment variable to a service account credentials JSON file.",
        );
      return new idtokenclient_1.IdTokenClient({
        targetAudience,
        idTokenProvider: client,
      });
    }
    async getAccessToken() {
      return (await (await this.getClient()).getAccessToken()).token;
    }
    async getRequestHeaders(url) {
      return (await this.getClient()).getRequestHeaders(url);
    }
    async authorizeRequest(opts = {}) {
      let url = opts.url;
      let headers = await (await this.getClient()).getRequestHeaders(url);
      opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers, headers);
      return opts;
    }
    async fetch(...args) {
      return (await this.getClient()).fetch(...args);
    }
    async request(opts) {
      return (await this.getClient()).request(opts);
    }
    getEnv() {
      return envDetect_1.getEnv();
    }
    async sign(data, endpoint) {
      let client = await this.getClient();
      let universe = await this.getUniverseDomain();
      endpoint = endpoint || `https://iamcredentials.${universe}/v1/projects/-/serviceAccounts/`;
      if (client instanceof impersonated_1.Impersonated) return (await client.sign(data)).signedBlob;
      let cryptoModule = crypto_1.createCrypto();
      if (client instanceof jwtclient_1.JWT && client.key) return await cryptoModule.sign(client.key, data);
      let creds = await this.getCredentials();
      if (!creds.client_email) throw Error("Cannot sign data without `client_email`.");
      return this.signBlob(cryptoModule, creds.client_email, data, endpoint);
    }
    async signBlob(cryptoModule, emailOrUniqueId, data, endpoint) {
      let url = new URL(endpoint + `${emailOrUniqueId}:signBlob`);
      return (
        await this.request({
          method: "POST",
          url: url.href,
          data: {
            payload: cryptoModule.encodeBase64StringUtf8(data),
          },
          retry: true,
          retryConfig: {
            httpMethodsToRetry: ["POST"],
          },
        })
      ).data.signedBlob;
    }
  }
  cjsExports.GoogleAuth = GoogleAuth;
});
export { require_googleauth };
