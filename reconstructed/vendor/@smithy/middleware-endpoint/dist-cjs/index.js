/**
 * @smithy/middleware-endpoint/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_getEndpointFromConfig } from "./adaptors/getEndpointFromConfig.js";
import { require_url_parser } from "../../url-parser/dist-cjs/index.js";
import { require_core as require_core_2 } from "../../core/dist-cjs/index.js";
import { require_util_middleware } from "../../util-middleware/dist-cjs/index.js";
import { require_middleware_serde } from "../../middleware-serde/dist-cjs/index.js";

//@ chunk-edce4vxq.js:116495-120842 cjs-fingerprint
var require_middleware_endpoint = x(function (cjsExports) {
  var getEndpointFromConfig = require_getEndpointFromConfig();
  var urlParser = require_url_parser();
  var core = require_core_2();
  var utilMiddleware = require_util_middleware();
  var middlewareSerde = require_middleware_serde();
  var resolveParamsForS3 = async (endpointParams) => {
    let bucket = endpointParams?.Bucket || "";
    if (typeof endpointParams.Bucket === "string")
      endpointParams.Bucket = bucket
        .replace(/#/g, encodeURIComponent("#"))
        .replace(/\?/g, encodeURIComponent("?"));
    if (isArnBucketName(bucket)) {
      if (endpointParams.ForcePathStyle === true)
        throw Error("Path-style addressing cannot be used with ARN buckets");
    } else if (
      !isDnsCompatibleBucketName(bucket) ||
      (bucket.indexOf(".") !== -1 && !String(endpointParams.Endpoint).startsWith("http:")) ||
      bucket.toLowerCase() !== bucket ||
      bucket.length < 3
    )
      endpointParams.ForcePathStyle = true;
    if (endpointParams.DisableMultiRegionAccessPoints) {
      endpointParams.disableMultiRegionAccessPoints = true;
      endpointParams.DisableMRAP = true;
    }
    return endpointParams;
  };
  var DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
  var IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
  var DOTS_PATTERN = /\.\./;
  var isDnsCompatibleBucketName = (bucketName) =>
    DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName);
  var isArnBucketName = (bucketName) => {
    let [arn, partition, service, , , bucket] = bucketName.split(":");
    let isArn = arn === "arn" && bucketName.split(":").length >= 6;
    let isValidArn = Boolean(isArn && partition && service && bucket);
    if (isArn && !isValidArn) throw Error(`Invalid ARN: ${bucketName} was an invalid ARN.`);
    return isValidArn;
  };
  var createConfigValueProvider = (configKey, canonicalEndpointParamKey, config) => {
    let configProvider = async () => {
      let configValue = config[configKey] ?? config[canonicalEndpointParamKey];
      if (typeof configValue === "function") return configValue();
      return configValue;
    };
    if (configKey === "credentialScope" || canonicalEndpointParamKey === "CredentialScope")
      return async () => {
        let credentials =
          typeof config.credentials === "function" ? await config.credentials() : config.credentials;
        return credentials?.credentialScope ?? credentials?.CredentialScope;
      };
    if (configKey === "accountId" || canonicalEndpointParamKey === "AccountId")
      return async () => {
        let credentials =
          typeof config.credentials === "function" ? await config.credentials() : config.credentials;
        return credentials?.accountId ?? credentials?.AccountId;
      };
    if (configKey === "endpoint" || canonicalEndpointParamKey === "endpoint")
      return async () => {
        if (config.isCustomEndpoint === false) return;
        let endpoint = await configProvider();
        if (endpoint && typeof endpoint === "object") {
          if ("url" in endpoint) return endpoint.url.href;
          if ("hostname" in endpoint) {
            let { protocol, hostname, port, path } = endpoint;
            return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
          }
        }
        return endpoint;
      };
    return configProvider;
  };
  var toEndpointV1 = (endpoint) => {
    if (typeof endpoint === "object") {
      if ("url" in endpoint) return urlParser.parseUrl(endpoint.url);
      return endpoint;
    }
    return urlParser.parseUrl(endpoint);
  };
  var getEndpointFromInstructions = async (commandInput, instructionsSupplier, clientConfig, context) => {
    if (!clientConfig.isCustomEndpoint) {
      let endpointFromConfig;
      if (clientConfig.serviceConfiguredEndpoint)
        endpointFromConfig = await clientConfig.serviceConfiguredEndpoint();
      else endpointFromConfig = await getEndpointFromConfig.getEndpointFromConfig(clientConfig.serviceId);
      if (endpointFromConfig) {
        clientConfig.endpoint = () => Promise.resolve(toEndpointV1(endpointFromConfig));
        clientConfig.isCustomEndpoint = true;
      }
    }
    let endpointParams = await resolveParams(commandInput, instructionsSupplier, clientConfig);
    if (typeof clientConfig.endpointProvider !== "function")
      throw Error("config.endpointProvider is not set.");
    return clientConfig.endpointProvider(endpointParams, context);
  };
  var resolveParams = async (commandInput, instructionsSupplier, clientConfig) => {
    let endpointParams = {};
    let instructions = instructionsSupplier?.getEndpointParameterInstructions?.() || {};
    for (let [name, instruction] of Object.entries(instructions))
      switch (instruction.type) {
        case "staticContextParams":
          endpointParams[name] = instruction.value;
          break;
        case "contextParams":
          endpointParams[name] = commandInput[instruction.name];
          break;
        case "clientContextParams":
        case "builtInParams":
          endpointParams[name] = await createConfigValueProvider(instruction.name, name, clientConfig)();
          break;
        case "operationContextParams":
          endpointParams[name] = instruction.get(commandInput);
          break;
        default:
          throw Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(instruction));
      }
    if (Object.keys(instructions).length === 0) Object.assign(endpointParams, clientConfig);
    if (String(clientConfig.serviceId).toLowerCase() === "s3") await resolveParamsForS3(endpointParams);
    return endpointParams;
  };
  var endpointMiddleware =
    ({ config, instructions }) =>
    (next, context) =>
    async (args) => {
      if (config.isCustomEndpoint) core.setFeature(context, "ENDPOINT_OVERRIDE", "N");
      let endpoint = await getEndpointFromInstructions(
        args.input,
        {
          getEndpointParameterInstructions() {
            return instructions;
          },
        },
        {
          ...config,
        },
        context,
      );
      context.endpointV2 = endpoint;
      context.authSchemes = endpoint.properties?.authSchemes;
      let authScheme = context.authSchemes?.[0];
      if (authScheme) {
        context.signing_region = authScheme.signingRegion;
        context.signing_service = authScheme.signingName;
        let httpAuthOption = utilMiddleware.getSmithyContext(context)?.selectedHttpAuthScheme?.httpAuthOption;
        if (httpAuthOption)
          httpAuthOption.signingProperties = Object.assign(
            httpAuthOption.signingProperties || {},
            {
              signing_region: authScheme.signingRegion,
              signingRegion: authScheme.signingRegion,
              signing_service: authScheme.signingName,
              signingName: authScheme.signingName,
              signingRegionSet: authScheme.signingRegionSet,
            },
            authScheme.properties,
          );
      }
      return next({
        ...args,
      });
    };
  var endpointMiddlewareOptions = {
    step: "serialize",
    tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
    name: "endpointV2Middleware",
    override: true,
    relation: "before",
    toMiddleware: middlewareSerde.serializerMiddlewareOption.name,
  };
  var getEndpointPlugin = (config, instructions) => ({
    applyToStack: (clientStack) => {
      clientStack.addRelativeTo(
        endpointMiddleware({
          config,
          instructions,
        }),
        endpointMiddlewareOptions,
      );
    },
  });
  var resolveEndpointConfig = (input) => {
    let tls = input.tls ?? true;
    let { endpoint, useDualstackEndpoint, useFipsEndpoint } = input;
    let customEndpointProvider =
      endpoint != null
        ? async () => toEndpointV1(await utilMiddleware.normalizeProvider(endpoint)())
        : undefined;
    let resolvedConfig = Object.assign(input, {
      endpoint: customEndpointProvider,
      tls,
      isCustomEndpoint: !!endpoint,
      useDualstackEndpoint: utilMiddleware.normalizeProvider(useDualstackEndpoint ?? false),
      useFipsEndpoint: utilMiddleware.normalizeProvider(useFipsEndpoint ?? false),
    });
    let configuredEndpointPromise = undefined;
    resolvedConfig.serviceConfiguredEndpoint = async () => {
      if (input.serviceId && !configuredEndpointPromise)
        configuredEndpointPromise = getEndpointFromConfig.getEndpointFromConfig(input.serviceId);
      return configuredEndpointPromise;
    };
    return resolvedConfig;
  };
  var resolveEndpointRequiredConfig = (input) => {
    let { endpoint } = input;
    if (endpoint === undefined)
      input.endpoint = async () => {
        throw Error(
          "@smithy/middleware-endpoint: (default endpointRuleSet) endpoint is not set - you must configure an endpoint.",
        );
      };
    return input;
  };
  cjsExports.endpointMiddleware = endpointMiddleware;
  cjsExports.endpointMiddlewareOptions = endpointMiddlewareOptions;
  cjsExports.getEndpointFromInstructions = getEndpointFromInstructions;
  cjsExports.getEndpointPlugin = getEndpointPlugin;
  cjsExports.resolveEndpointConfig = resolveEndpointConfig;
  cjsExports.resolveEndpointRequiredConfig = resolveEndpointRequiredConfig;
  cjsExports.resolveParams = resolveParams;
  cjsExports.toEndpointV1 = toEndpointV1;
});
export { require_middleware_endpoint };
