/**
 * google-auth-library/build/src/auth/authclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_util } from "../util.js";
import { require_google_logging_utils } from "../../../../google-logging-utils/build/src/index.js";
import { require_shared_2 } from "../shared.cjs";

//@ chunk-na3pph4p.js:64376-67807 cjs-fingerprint
var require_authclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AuthClient =
    cjsExports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS =
    cjsExports.DEFAULT_UNIVERSE =
      undefined;
  var events_1 = importMetaRequire("events");
  var gaxios_1 = require_gaxios_2();
  var util_1 = require_util();
  var google_logging_utils_1 = require_google_logging_utils();
  var shared_cjs_1 = require_shared_2();
  cjsExports.DEFAULT_UNIVERSE = "googleapis.com";
  cjsExports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS = 300000;
  class AuthClient extends events_1.EventEmitter {
    apiKey;
    projectId;
    quotaProjectId;
    transporter;
    credentials = {};
    eagerRefreshThresholdMillis = cjsExports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS;
    forceRefreshOnFailure = false;
    universeDomain = cjsExports.DEFAULT_UNIVERSE;
    static RequestMethodNameSymbol = Symbol("request method name");
    static RequestLogIdSymbol = Symbol("request log id");
    constructor(opts = {}) {
      super();
      let options = util_1.originalOrCamelOptions(opts);
      this.apiKey = opts.apiKey;
      this.projectId = options.get("project_id") ?? null;
      this.quotaProjectId = options.get("quota_project_id");
      this.credentials = options.get("credentials") ?? {};
      this.universeDomain = options.get("universe_domain") ?? cjsExports.DEFAULT_UNIVERSE;
      this.transporter = opts.transporter ?? new gaxios_1.Gaxios(opts.transporterOptions);
      if (options.get("useAuthRequestParameters") !== false) {
        this.transporter.interceptors.request.add(AuthClient.DEFAULT_REQUEST_INTERCEPTOR);
        this.transporter.interceptors.response.add(AuthClient.DEFAULT_RESPONSE_INTERCEPTOR);
      }
      if (opts.eagerRefreshThresholdMillis)
        this.eagerRefreshThresholdMillis = opts.eagerRefreshThresholdMillis;
      this.forceRefreshOnFailure = opts.forceRefreshOnFailure ?? false;
    }
    fetch(...args) {
      let input = args[0];
      let init = args[1];
      let url = undefined;
      let headers = new Headers();
      if (typeof input === "string") url = new URL(input);
      else if (input instanceof URL) url = input;
      else if (input && input.url) url = new URL(input.url);
      if (input && typeof input === "object" && "headers" in input)
        gaxios_1.Gaxios.mergeHeaders(headers, input.headers);
      if (init) gaxios_1.Gaxios.mergeHeaders(headers, new Headers(init.headers));
      if (typeof input === "object" && !(input instanceof URL))
        return this.request({
          ...init,
          ...input,
          headers,
          url,
        });
      else
        return this.request({
          ...init,
          headers,
          url,
        });
    }
    setCredentials(credentials) {
      this.credentials = credentials;
    }
    addSharedMetadataHeaders(headers) {
      if (!headers.has("x-goog-user-project") && this.quotaProjectId)
        headers.set("x-goog-user-project", this.quotaProjectId);
      return headers;
    }
    addUserProjectAndAuthHeaders(target, source) {
      let xGoogUserProject = source.get("x-goog-user-project");
      let authorizationHeader = source.get("authorization");
      if (xGoogUserProject) target.set("x-goog-user-project", xGoogUserProject);
      if (authorizationHeader) target.set("authorization", authorizationHeader);
      return target;
    }
    static log = google_logging_utils_1.log("auth");
    static DEFAULT_REQUEST_INTERCEPTOR = {
      resolved: async (config) => {
        if (!config.headers.has("x-goog-api-client")) {
          let nodeVersion = process.version.replace(/^v/, "");
          config.headers.set("x-goog-api-client", `gl-node/${nodeVersion}`);
        }
        let userAgent = config.headers.get("User-Agent");
        if (!userAgent) config.headers.set("User-Agent", shared_cjs_1.USER_AGENT);
        else if (!userAgent.includes(`${shared_cjs_1.PRODUCT_NAME}/`))
          config.headers.set("User-Agent", `${userAgent} ${shared_cjs_1.USER_AGENT}`);
        try {
          let symbols = config;
          let methodName = symbols[AuthClient.RequestMethodNameSymbol];
          let logId = `${Math.floor(Math.random() * 1000)}`;
          symbols[AuthClient.RequestLogIdSymbol] = logId;
          let logObject = {
            url: config.url,
            headers: config.headers,
          };
          if (methodName) AuthClient.log.info("%s [%s] request %j", methodName, logId, logObject);
          else AuthClient.log.info("[%s] request %j", logId, logObject);
        } catch (e) {}
        return config;
      },
    };
    static DEFAULT_RESPONSE_INTERCEPTOR = {
      resolved: async (response) => {
        try {
          let symbols = response.config;
          let methodName = symbols[AuthClient.RequestMethodNameSymbol];
          let logId = symbols[AuthClient.RequestLogIdSymbol];
          if (methodName) AuthClient.log.info("%s [%s] response %j", methodName, logId, response.data);
          else AuthClient.log.info("[%s] response %j", logId, response.data);
        } catch (e) {}
        return response;
      },
      rejected: async (error) => {
        try {
          let symbols = error.config;
          let methodName = symbols[AuthClient.RequestMethodNameSymbol];
          let logId = symbols[AuthClient.RequestLogIdSymbol];
          if (methodName) AuthClient.log.info("%s [%s] error %j", methodName, logId, error.response?.data);
          else AuthClient.log.error("[%s] error %j", logId, error.response?.data);
        } catch (e) {}
        throw error;
      },
    };
    static setMethodName(config, methodName) {
      try {
        let symbols = config;
        symbols[AuthClient.RequestMethodNameSymbol] = methodName;
      } catch (e) {}
    }
    static get RETRY_CONFIG() {
      return {
        retry: true,
        retryConfig: {
          httpMethodsToRetry: ["GET", "PUT", "POST", "HEAD", "OPTIONS", "DELETE"],
        },
      };
    }
  }
  cjsExports.AuthClient = AuthClient;
});
export { require_authclient };
