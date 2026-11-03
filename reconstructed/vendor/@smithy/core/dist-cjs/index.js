/**
 * @smithy/core/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-83tv5s1x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_types } from "../../types/dist-cjs/index.js";
import { require_util_middleware } from "../../util-middleware/dist-cjs/index.js";
import { require_middleware_serde } from "../../middleware-serde/dist-cjs/index.js";
import { require_protocol_http } from "../../protocol-http/dist-cjs/index.js";
import { require_protocols } from "./submodules/protocols/index.js";

//@ chunk-83tv5s1x.js:2070-7981 cjs-fingerprint
var require_core = x(function (cjsExports) {
  var HttpApiKeyAuthLocation = require_types();
  var getSmithyContext = require_util_middleware();
  var U = require_middleware_serde();
  var HttpRequest = require_protocol_http();
  var V = require_protocols();
  var getSmithyContext_2 = (e) =>
    e[HttpApiKeyAuthLocation.SMITHY_CONTEXT_KEY] || (e[HttpApiKeyAuthLocation.SMITHY_CONTEXT_KEY] = {});
  var Z = (candidateAuthOptions, authSchemePreference) => {
    if (!authSchemePreference || authSchemePreference.length === 0) return candidateAuthOptions;
    let preferredAuthOptions = [];
    for (let preferredSchemeName of authSchemePreference)
      for (let candidateAuthOption of candidateAuthOptions)
        if (candidateAuthOption.schemeId.split("#")[1] === preferredSchemeName)
          preferredAuthOptions.push(candidateAuthOption);
    for (let candidateAuthOption of candidateAuthOptions)
      if (!preferredAuthOptions.find(({ schemeId }) => schemeId === candidateAuthOption.schemeId))
        preferredAuthOptions.push(candidateAuthOption);
    return preferredAuthOptions;
  };
  function convertHttpAuthSchemesToMap(httpAuthSchemes) {
    let map = new Map();
    for (let scheme of httpAuthSchemes) map.set(scheme.schemeId, scheme);
    return map;
  }
  var httpAuthSchemeMiddleware = (config, mwOptions) => (next, context) => async (args) => {
    let options = config.httpAuthSchemeProvider(
      await mwOptions.httpAuthSchemeParametersProvider(config, context, args.input),
    );
    let authSchemePreference = config.authSchemePreference ? await config.authSchemePreference() : [];
    let resolvedOptions = Z(options, authSchemePreference);
    let authSchemes = convertHttpAuthSchemesToMap(config.httpAuthSchemes);
    let smithyContext = getSmithyContext.getSmithyContext(context);
    let failureReasons = [];
    for (let option of resolvedOptions) {
      let scheme = authSchemes.get(option.schemeId);
      if (!scheme) {
        failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` was not enabled for this service.`);
        continue;
      }
      let identityProvider = scheme.identityProvider(await mwOptions.identityProviderConfigProvider(config));
      if (!identityProvider) {
        failureReasons.push(
          `HttpAuthScheme \`${option.schemeId}\` did not have an IdentityProvider configured.`,
        );
        continue;
      }
      let { identityProperties = {}, signingProperties = {} } =
        option.propertiesExtractor?.(config, context) || {};
      option.identityProperties = Object.assign(option.identityProperties || {}, identityProperties);
      option.signingProperties = Object.assign(option.signingProperties || {}, signingProperties);
      smithyContext.selectedHttpAuthScheme = {
        httpAuthOption: option,
        identity: await identityProvider(option.identityProperties),
        signer: scheme.signer,
      };
      break;
    }
    if (!smithyContext.selectedHttpAuthScheme)
      throw Error(
        failureReasons.join(`
`),
      );
    return next(args);
  };
  var httpAuthSchemeEndpointRuleSetMiddlewareOptions = {
    step: "serialize",
    tags: ["HTTP_AUTH_SCHEME"],
    name: "httpAuthSchemeMiddleware",
    override: true,
    relation: "before",
    toMiddleware: "endpointV2Middleware",
  };
  var getHttpAuthSchemeEndpointRuleSetPlugin = (
    config,
    { httpAuthSchemeParametersProvider, identityProviderConfigProvider },
  ) => ({
    applyToStack: (clientStack) => {
      clientStack.addRelativeTo(
        httpAuthSchemeMiddleware(config, {
          httpAuthSchemeParametersProvider,
          identityProviderConfigProvider,
        }),
        httpAuthSchemeEndpointRuleSetMiddlewareOptions,
      );
    },
  });
  var httpAuthSchemeMiddlewareOptions = {
    step: "serialize",
    tags: ["HTTP_AUTH_SCHEME"],
    name: "httpAuthSchemeMiddleware",
    override: true,
    relation: "before",
    toMiddleware: U.serializerMiddlewareOption.name,
  };
  var getHttpAuthSchemePlugin = (
    config,
    { httpAuthSchemeParametersProvider, identityProviderConfigProvider },
  ) => ({
    applyToStack: (clientStack) => {
      clientStack.addRelativeTo(
        httpAuthSchemeMiddleware(config, {
          httpAuthSchemeParametersProvider,
          identityProviderConfigProvider,
        }),
        httpAuthSchemeMiddlewareOptions,
      );
    },
  });
  var defaultErrorHandler = (signingProperties) => (error) => {
    throw error;
  };
  var defaultSuccessHandler = (httpResponse, signingProperties) => {};
  var httpSigningMiddleware = (config) => (next, t) => async (args) => {
    if (!HttpRequest.HttpRequest.isInstance(args.request)) return next(args);
    let scheme = getSmithyContext.getSmithyContext(t).selectedHttpAuthScheme;
    if (!scheme) throw Error("No HttpAuthScheme was selected: unable to sign request");
    let {
      httpAuthOption: { signingProperties = {} },
      identity,
      signer,
    } = scheme;
    let output = await next({
      ...args,
      request: await signer.sign(args.request, identity, signingProperties),
    }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
    (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
    return output;
  };
  var httpSigningMiddlewareOptions = {
    step: "finalizeRequest",
    tags: ["HTTP_SIGNING"],
    name: "httpSigningMiddleware",
    aliases: ["apiKeyMiddleware", "tokenMiddleware", "awsAuthMiddleware"],
    override: true,
    relation: "after",
    toMiddleware: "retryMiddleware",
  };
  var getHttpSigningPlugin = (config) => ({
    applyToStack: (clientStack) => {
      clientStack.addRelativeTo(httpSigningMiddleware(), httpSigningMiddlewareOptions);
    },
  });
  var normalizeProvider = (input) => {
    if (typeof input === "function") return input;
    let promisified = Promise.resolve(input);
    return () => promisified;
  };
  var makePagedClientRequest = async (CommandCtor, client, input, withCommand = (_) => _, ...args) => {
    let command = new CommandCtor(input);
    command = withCommand(command) ?? command;
    return await client.send(command, ...args);
  };
  function createPaginator(ClientCtor, CommandCtor, inputTokenName, outputTokenName, pageSizeTokenName) {
    return async function* (config, input, ...additionalArguments) {
      let _input = input;
      let token = config.startingToken ?? _input[inputTokenName];
      let hasNext = true;
      let page;
      while (hasNext) {
        _input[inputTokenName] = token;
        if (pageSizeTokenName) _input[pageSizeTokenName] = _input[pageSizeTokenName] ?? config.pageSize;
        if (config.client instanceof ClientCtor)
          page = await makePagedClientRequest(
            CommandCtor,
            config.client,
            input,
            config.withCommand,
            ...additionalArguments,
          );
        else throw Error(`Invalid client, expected instance of ${ClientCtor.name}`);
        yield page;
        let prevToken = token;
        token = get(page, outputTokenName);
        hasNext = !!(token && (!config.stopOnSameToken || token !== prevToken));
      }
      return;
    };
  }
  var get = (fromObject, path) => {
    let cursor = fromObject;
    let pathComponents = path.split(".");
    for (let step of pathComponents) {
      if (!cursor || typeof cursor !== "object") return;
      cursor = cursor[step];
    }
    return cursor;
  };
  function setFeature(context, feature, value) {
    if (!context.__smithy_context)
      context.__smithy_context = {
        features: {},
      };
    else if (!context.__smithy_context.features) context.__smithy_context.features = {};
    context.__smithy_context.features[feature] = value;
  }
  class DefaultIdentityProviderConfig {
    authSchemes = new Map();
    constructor(e) {
      for (let [key, value] of Object.entries(e)) if (value !== undefined) this.authSchemes.set(key, value);
    }
    getIdentityProvider(schemeId) {
      return this.authSchemes.get(schemeId);
    }
  }
  class HttpApiKeyAuthSigner {
    async sign(httpRequest, identity, signingProperties) {
      if (!signingProperties)
        throw Error(
          "request could not be signed with `apiKey` since the `name` and `in` signer properties are missing",
        );
      if (!signingProperties.name)
        throw Error("request could not be signed with `apiKey` since the `name` signer property is missing");
      if (!signingProperties.in)
        throw Error("request could not be signed with `apiKey` since the `in` signer property is missing");
      if (!identity.apiKey)
        throw Error("request could not be signed with `apiKey` since the `apiKey` is not defined");
      let clonedRequest = HttpRequest.HttpRequest.clone(httpRequest);
      if (signingProperties.in === HttpApiKeyAuthLocation.HttpApiKeyAuthLocation.QUERY)
        clonedRequest.query[signingProperties.name] = identity.apiKey;
      else if (signingProperties.in === HttpApiKeyAuthLocation.HttpApiKeyAuthLocation.HEADER)
        clonedRequest.headers[signingProperties.name] = signingProperties.scheme
          ? `${signingProperties.scheme} ${identity.apiKey}`
          : identity.apiKey;
      else
        throw Error(
          "request can only be signed with `apiKey` locations `query` or `header`, but found: `" +
            signingProperties.in +
            "`",
        );
      return clonedRequest;
    }
  }
  class HttpBearerAuthSigner {
    async sign(httpRequest, identity, signingProperties) {
      let clonedRequest = HttpRequest.HttpRequest.clone(httpRequest);
      if (!identity.token)
        throw Error("request could not be signed with `token` since the `token` is not defined");
      clonedRequest.headers.Authorization = `Bearer ${identity.token}`;
      return clonedRequest;
    }
  }
  class NoAuthSigner {
    async sign(httpRequest, identity, signingProperties) {
      return httpRequest;
    }
  }
  var createIsIdentityExpiredFunction = (expirationMs) =>
    function (identity) {
      return (
        doesIdentityRequireRefresh(identity) && identity.expiration.getTime() - Date.now() < expirationMs
      );
    };
  var EXPIRATION_MS = 300000;
  var isIdentityExpired = createIsIdentityExpiredFunction(EXPIRATION_MS);
  var doesIdentityRequireRefresh = (identity) => identity.expiration !== undefined;
  var memoizeIdentityProvider = (provider, isExpired, requiresRefresh) => {
    if (provider === undefined) return;
    let normalizedProvider =
      typeof provider !== "function" ? async () => Promise.resolve(provider) : provider;
    let resolved;
    let pending;
    let hasResult;
    let isConstant = false;
    let coalesceProvider = async (options) => {
      if (!pending) pending = normalizedProvider(options);
      try {
        resolved = await pending;
        hasResult = true;
        isConstant = false;
      } finally {
        pending = undefined;
      }
      return resolved;
    };
    if (isExpired === undefined)
      return async (options) => {
        if (!hasResult || options?.forceRefresh) resolved = await coalesceProvider(options);
        return resolved;
      };
    return async (options) => {
      if (!hasResult || options?.forceRefresh) resolved = await coalesceProvider(options);
      if (isConstant) return resolved;
      if (!requiresRefresh(resolved)) {
        isConstant = true;
        return resolved;
      }
      if (isExpired(resolved)) {
        await coalesceProvider(options);
        return resolved;
      }
      return resolved;
    };
  };
  Object.defineProperty(cjsExports, "requestBuilder", {
    enumerable: true,
    get: function () {
      return V.requestBuilder;
    },
  });
  cjsExports.DefaultIdentityProviderConfig = DefaultIdentityProviderConfig;
  cjsExports.EXPIRATION_MS = EXPIRATION_MS;
  cjsExports.HttpApiKeyAuthSigner = HttpApiKeyAuthSigner;
  cjsExports.HttpBearerAuthSigner = HttpBearerAuthSigner;
  cjsExports.NoAuthSigner = NoAuthSigner;
  cjsExports.createIsIdentityExpiredFunction = createIsIdentityExpiredFunction;
  cjsExports.createPaginator = createPaginator;
  cjsExports.doesIdentityRequireRefresh = doesIdentityRequireRefresh;
  cjsExports.getHttpAuthSchemeEndpointRuleSetPlugin = getHttpAuthSchemeEndpointRuleSetPlugin;
  cjsExports.getHttpAuthSchemePlugin = getHttpAuthSchemePlugin;
  cjsExports.getHttpSigningPlugin = getHttpSigningPlugin;
  cjsExports.getSmithyContext = getSmithyContext_2;
  cjsExports.httpAuthSchemeEndpointRuleSetMiddlewareOptions = httpAuthSchemeEndpointRuleSetMiddlewareOptions;
  cjsExports.httpAuthSchemeMiddleware = httpAuthSchemeMiddleware;
  cjsExports.httpAuthSchemeMiddlewareOptions = httpAuthSchemeMiddlewareOptions;
  cjsExports.httpSigningMiddleware = httpSigningMiddleware;
  cjsExports.httpSigningMiddlewareOptions = httpSigningMiddlewareOptions;
  cjsExports.isIdentityExpired = isIdentityExpired;
  cjsExports.memoizeIdentityProvider = memoizeIdentityProvider;
  cjsExports.normalizeProvider = normalizeProvider;
  cjsExports.setFeature = setFeature;
});
export { require_core };
