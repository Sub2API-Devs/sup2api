/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-brqnbz3r.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_STSClient } from "./STSClient.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_middleware_endpoint } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_EndpointParameters } from "./endpoint/EndpointParameters.js";
import { require_schema } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_client as require_client_2 } from "../../../../core/dist-cjs/submodules/client/index.js";
import { require_region_config_resolver } from "../../../../region-config-resolver/dist-cjs/index.js";

//@ chunk-brqnbz3r.js:12668-21063 cjs-fingerprint
var require_sts = __commonJS(function (cjsExports) {
  var STSClient = require_STSClient();
  var smithyClient = require_client();
  var middlewareEndpoint = require_middleware_endpoint();
  var EndpointParameters = require_EndpointParameters();
  var schema = require_schema();
  var client = require_client_2();
  var regionConfigResolver = require_region_config_resolver();
  var STSServiceException$1 = class STSServiceException extends smithyClient.ServiceException {
    constructor(options) {
      super(options);
      Object.setPrototypeOf(this, STSServiceException.prototype);
    }
  };
  var ExpiredTokenException$1 = class ExpiredTokenException extends STSServiceException$1 {
    name = "ExpiredTokenException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ExpiredTokenException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ExpiredTokenException.prototype);
    }
  };
  var MalformedPolicyDocumentException$1 = class MalformedPolicyDocumentException extends STSServiceException$1 {
    name = "MalformedPolicyDocumentException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "MalformedPolicyDocumentException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, MalformedPolicyDocumentException.prototype);
    }
  };
  var PackedPolicyTooLargeException$1 = class PackedPolicyTooLargeException extends STSServiceException$1 {
    name = "PackedPolicyTooLargeException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "PackedPolicyTooLargeException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, PackedPolicyTooLargeException.prototype);
    }
  };
  var RegionDisabledException$1 = class RegionDisabledException extends STSServiceException$1 {
    name = "RegionDisabledException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "RegionDisabledException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, RegionDisabledException.prototype);
    }
  };
  var IDPRejectedClaimException$1 = class IDPRejectedClaimException extends STSServiceException$1 {
    name = "IDPRejectedClaimException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "IDPRejectedClaimException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, IDPRejectedClaimException.prototype);
    }
  };
  var InvalidIdentityTokenException$1 = class InvalidIdentityTokenException extends STSServiceException$1 {
    name = "InvalidIdentityTokenException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "InvalidIdentityTokenException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, InvalidIdentityTokenException.prototype);
    }
  };
  var IDPCommunicationErrorException$1 = class IDPCommunicationErrorException extends STSServiceException$1 {
    name = "IDPCommunicationErrorException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "IDPCommunicationErrorException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, IDPCommunicationErrorException.prototype);
    }
  };
  var _A = "Arn";
  var _AKI = "AccessKeyId";
  var _AR = "AssumeRole";
  var _ARI = "AssumedRoleId";
  var _ARR = "AssumeRoleRequest";
  var _ARRs = "AssumeRoleResponse";
  var _ARU = "AssumedRoleUser";
  var _ARWWI = "AssumeRoleWithWebIdentity";
  var _ARWWIR = "AssumeRoleWithWebIdentityRequest";
  var _ARWWIRs = "AssumeRoleWithWebIdentityResponse";
  var _Au = "Audience";
  var _C = "Credentials";
  var _CA = "ContextAssertion";
  var _DS = "DurationSeconds";
  var _E = "Expiration";
  var _EI = "ExternalId";
  var _ETE = "ExpiredTokenException";
  var _IDPCEE = "IDPCommunicationErrorException";
  var _IDPRCE = "IDPRejectedClaimException";
  var _IITE = "InvalidIdentityTokenException";
  var _K = "Key";
  var _MPDE = "MalformedPolicyDocumentException";
  var _P = "Policy";
  var _PA = "PolicyArns";
  var _PAr = "ProviderArn";
  var _PC = "ProvidedContexts";
  var _PCLT = "ProvidedContextsListType";
  var _PCr = "ProvidedContext";
  var _PDT = "PolicyDescriptorType";
  var _PI = "ProviderId";
  var _PPS = "PackedPolicySize";
  var _PPTLE = "PackedPolicyTooLargeException";
  var _Pr = "Provider";
  var _RA = "RoleArn";
  var _RDE = "RegionDisabledException";
  var _RSN = "RoleSessionName";
  var _SAK = "SecretAccessKey";
  var _SFWIT = "SubjectFromWebIdentityToken";
  var _SI = "SourceIdentity";
  var _SN = "SerialNumber";
  var _ST = "SessionToken";
  var _T = "Tags";
  var _TC = "TokenCode";
  var _TTK = "TransitiveTagKeys";
  var _Ta = "Tag";
  var _V = "Value";
  var _WIT = "WebIdentityToken";
  var _a = "arn";
  var _aKST = "accessKeySecretType";
  var _aQE = "awsQueryError";
  var _c = "client";
  var _cTT = "clientTokenType";
  var _e = "error";
  var _hE = "httpError";
  var _m = "message";
  var _pDLT = "policyDescriptorListType";
  var _s = "smithy.ts.sdk.synthetic.com.amazonaws.sts";
  var _tLT = "tagListType";
  var n0 = "com.amazonaws.sts";
  var accessKeySecretType = [0, n0, _aKST, 8, 0];
  var clientTokenType = [0, n0, _cTT, 8, 0];
  var AssumedRoleUser = [3, n0, _ARU, 0, [_ARI, _A], [0, 0]];
  var AssumeRoleRequest = [
    3,
    n0,
    _ARR,
    0,
    [_RA, _RSN, _PA, _P, _DS, _T, _TTK, _EI, _SN, _TC, _SI, _PC],
    [
      0,
      0,
      () => policyDescriptorListType,
      0,
      1,
      () => tagListType,
      64,
      0,
      0,
      0,
      0,
      () => ProvidedContextsListType,
    ],
  ];
  var AssumeRoleResponse = [
    3,
    n0,
    _ARRs,
    0,
    [_C, _ARU, _PPS, _SI],
    [[() => Credentials, 0], () => AssumedRoleUser, 1, 0],
  ];
  var AssumeRoleWithWebIdentityRequest = [
    3,
    n0,
    _ARWWIR,
    0,
    [_RA, _RSN, _WIT, _PI, _PA, _P, _DS],
    [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1],
  ];
  var AssumeRoleWithWebIdentityResponse = [
    3,
    n0,
    _ARWWIRs,
    0,
    [_C, _SFWIT, _ARU, _PPS, _Pr, _Au, _SI],
    [[() => Credentials, 0], 0, () => AssumedRoleUser, 1, 0, 0, 0],
  ];
  var Credentials = [3, n0, _C, 0, [_AKI, _SAK, _ST, _E], [0, [() => accessKeySecretType, 0], 0, 4]];
  var ExpiredTokenException = [
    -3,
    n0,
    _ETE,
    {
      [_e]: _c,
      [_hE]: 400,
      [_aQE]: ["ExpiredTokenException", 400],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(ExpiredTokenException, ExpiredTokenException$1);
  var IDPCommunicationErrorException = [
    -3,
    n0,
    _IDPCEE,
    {
      [_e]: _c,
      [_hE]: 400,
      [_aQE]: ["IDPCommunicationError", 400],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(IDPCommunicationErrorException, IDPCommunicationErrorException$1);
  var IDPRejectedClaimException = [
    -3,
    n0,
    _IDPRCE,
    {
      [_e]: _c,
      [_hE]: 403,
      [_aQE]: ["IDPRejectedClaim", 403],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(IDPRejectedClaimException, IDPRejectedClaimException$1);
  var InvalidIdentityTokenException = [
    -3,
    n0,
    _IITE,
    {
      [_e]: _c,
      [_hE]: 400,
      [_aQE]: ["InvalidIdentityToken", 400],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(InvalidIdentityTokenException, InvalidIdentityTokenException$1);
  var MalformedPolicyDocumentException = [
    -3,
    n0,
    _MPDE,
    {
      [_e]: _c,
      [_hE]: 400,
      [_aQE]: ["MalformedPolicyDocument", 400],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(
    MalformedPolicyDocumentException,
    MalformedPolicyDocumentException$1,
  );
  var PackedPolicyTooLargeException = [
    -3,
    n0,
    _PPTLE,
    {
      [_e]: _c,
      [_hE]: 400,
      [_aQE]: ["PackedPolicyTooLarge", 400],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(PackedPolicyTooLargeException, PackedPolicyTooLargeException$1);
  var PolicyDescriptorType = [3, n0, _PDT, 0, [_a], [0]];
  var ProvidedContext = [3, n0, _PCr, 0, [_PAr, _CA], [0, 0]];
  var RegionDisabledException = [
    -3,
    n0,
    _RDE,
    {
      [_e]: _c,
      [_hE]: 403,
      [_aQE]: ["RegionDisabledException", 403],
    },
    [_m],
    [0],
  ];
  schema.TypeRegistry.for(n0).registerError(RegionDisabledException, RegionDisabledException$1);
  var Tag = [3, n0, _Ta, 0, [_K, _V], [0, 0]];
  var STSServiceException = [-3, _s, "STSServiceException", 0, [], []];
  schema.TypeRegistry.for(_s).registerError(STSServiceException, STSServiceException$1);
  var policyDescriptorListType = [1, n0, _pDLT, 0, () => PolicyDescriptorType];
  var ProvidedContextsListType = [1, n0, _PCLT, 0, () => ProvidedContext];
  var tagListType = [1, n0, _tLT, 0, () => Tag];
  var AssumeRole = [9, n0, _AR, 0, () => AssumeRoleRequest, () => AssumeRoleResponse];
  var AssumeRoleWithWebIdentity = [
    9,
    n0,
    _ARWWI,
    0,
    () => AssumeRoleWithWebIdentityRequest,
    () => AssumeRoleWithWebIdentityResponse,
  ];
  class AssumeRoleCommand extends smithyClient.Command.classBuilder()
    .ep(EndpointParameters.commonParams)
    .m(function (Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    })
    .s("AWSSecurityTokenServiceV20110615", "AssumeRole", {})
    .n("STSClient", "AssumeRoleCommand")
    .sc(AssumeRole)
    .build() {}
  class AssumeRoleWithWebIdentityCommand extends smithyClient.Command.classBuilder()
    .ep(EndpointParameters.commonParams)
    .m(function (Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    })
    .s("AWSSecurityTokenServiceV20110615", "AssumeRoleWithWebIdentity", {})
    .n("STSClient", "AssumeRoleWithWebIdentityCommand")
    .sc(AssumeRoleWithWebIdentity)
    .build() {}
  var commands = {
    AssumeRoleCommand,
    AssumeRoleWithWebIdentityCommand,
  };
  class STS extends STSClient.STSClient {}
  smithyClient.createAggregatedClient(commands, STS);
  var getAccountIdFromAssumedRoleUser = (assumedRoleUser) => {
    if (typeof assumedRoleUser?.Arn === "string") {
      let arnComponents = assumedRoleUser.Arn.split(":");
      if (arnComponents.length > 4 && arnComponents[4] !== "") return arnComponents[4];
    }
    return;
  };
  var resolveRegion = async (_region, _parentRegion, credentialProviderLogger, loaderConfig = {}) => {
    let region = typeof _region === "function" ? await _region() : _region;
    let parentRegion = typeof _parentRegion === "function" ? await _parentRegion() : _parentRegion;
    let stsDefaultRegion = await regionConfigResolver.stsRegionDefaultResolver(loaderConfig)();
    credentialProviderLogger?.debug?.(
      "@aws-sdk/client-sts::resolveRegion",
      "accepting first of:",
      `${region} (credential provider clientConfig)`,
      `${parentRegion} (contextual client)`,
      `${stsDefaultRegion} (STS default: AWS_REGION, profile region, or us-east-1)`,
    );
    return region ?? parentRegion ?? stsDefaultRegion;
  };
  var getDefaultRoleAssumer$1 = (stsOptions, STSClient) => {
    let stsClient;
    let closureSourceCreds;
    return async (sourceCreds, params) => {
      closureSourceCreds = sourceCreds;
      if (!stsClient) {
        let {
          logger = stsOptions?.parentClientConfig?.logger,
          profile = stsOptions?.parentClientConfig?.profile,
          region,
          requestHandler = stsOptions?.parentClientConfig?.requestHandler,
          credentialProviderLogger,
          userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId,
        } = stsOptions;
        let resolvedRegion = await resolveRegion(
          region,
          stsOptions?.parentClientConfig?.region,
          credentialProviderLogger,
          {
            logger,
            profile,
          },
        );
        let isCompatibleRequestHandler = !isH2(requestHandler);
        stsClient = new STSClient({
          ...stsOptions,
          userAgentAppId,
          profile,
          credentialDefaultProvider: () => async () => closureSourceCreds,
          region: resolvedRegion,
          requestHandler: isCompatibleRequestHandler ? requestHandler : undefined,
          logger,
        });
      }
      let { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleCommand(params));
      if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey)
        throw Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
      let accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
      let credentials = {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken,
        expiration: Credentials.Expiration,
        ...(Credentials.CredentialScope && {
          credentialScope: Credentials.CredentialScope,
        }),
        ...(accountId && {
          accountId,
        }),
      };
      client.setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE", "i");
      return credentials;
    };
  };
  var getDefaultRoleAssumerWithWebIdentity$1 = (stsOptions, STSClient) => {
    let stsClient;
    return async (params) => {
      if (!stsClient) {
        let {
          logger = stsOptions?.parentClientConfig?.logger,
          profile = stsOptions?.parentClientConfig?.profile,
          region,
          requestHandler = stsOptions?.parentClientConfig?.requestHandler,
          credentialProviderLogger,
          userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId,
        } = stsOptions;
        let resolvedRegion = await resolveRegion(
          region,
          stsOptions?.parentClientConfig?.region,
          credentialProviderLogger,
          {
            logger,
            profile,
          },
        );
        let isCompatibleRequestHandler = !isH2(requestHandler);
        stsClient = new STSClient({
          ...stsOptions,
          userAgentAppId,
          profile,
          region: resolvedRegion,
          requestHandler: isCompatibleRequestHandler ? requestHandler : undefined,
          logger,
        });
      }
      let { Credentials, AssumedRoleUser } = await stsClient.send(
        new AssumeRoleWithWebIdentityCommand(params),
      );
      if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey)
        throw Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
      let accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
      let credentials = {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken,
        expiration: Credentials.Expiration,
        ...(Credentials.CredentialScope && {
          credentialScope: Credentials.CredentialScope,
        }),
        ...(accountId && {
          accountId,
        }),
      };
      if (accountId) client.setCredentialFeature(credentials, "RESOLVED_ACCOUNT_ID", "T");
      client.setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k");
      return credentials;
    };
  };
  var isH2 = (requestHandler) => requestHandler?.metadata?.handlerProtocol === "h2";
  var getCustomizableStsClientCtor = (baseCtor, customizations) => {
    if (!customizations) return baseCtor;
    else
      return class extends baseCtor {
        constructor(config) {
          super(config);
          for (let customization of customizations) this.middlewareStack.use(customization);
        }
      };
  };
  var getDefaultRoleAssumer = (stsOptions = {}, stsPlugins) =>
    getDefaultRoleAssumer$1(stsOptions, getCustomizableStsClientCtor(STSClient.STSClient, stsPlugins));
  var getDefaultRoleAssumerWithWebIdentity = (stsOptions = {}, stsPlugins) =>
    getDefaultRoleAssumerWithWebIdentity$1(
      stsOptions,
      getCustomizableStsClientCtor(STSClient.STSClient, stsPlugins),
    );
  var decorateDefaultCredentialProvider = (provider) => (input) =>
    provider({
      roleAssumer: getDefaultRoleAssumer(input),
      roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity(input),
      ...input,
    });
  Object.defineProperty(cjsExports, "$Command", {
    enumerable: true,
    get: function () {
      return smithyClient.Command;
    },
  });
  cjsExports.AssumeRoleCommand = AssumeRoleCommand;
  cjsExports.AssumeRoleWithWebIdentityCommand = AssumeRoleWithWebIdentityCommand;
  cjsExports.ExpiredTokenException = ExpiredTokenException$1;
  cjsExports.IDPCommunicationErrorException = IDPCommunicationErrorException$1;
  cjsExports.IDPRejectedClaimException = IDPRejectedClaimException$1;
  cjsExports.InvalidIdentityTokenException = InvalidIdentityTokenException$1;
  cjsExports.MalformedPolicyDocumentException = MalformedPolicyDocumentException$1;
  cjsExports.PackedPolicyTooLargeException = PackedPolicyTooLargeException$1;
  cjsExports.RegionDisabledException = RegionDisabledException$1;
  cjsExports.STS = STS;
  cjsExports.STSServiceException = STSServiceException$1;
  cjsExports.decorateDefaultCredentialProvider = decorateDefaultCredentialProvider;
  cjsExports.getDefaultRoleAssumer = getDefaultRoleAssumer;
  cjsExports.getDefaultRoleAssumerWithWebIdentity = getDefaultRoleAssumerWithWebIdentity;
  Object.keys(STSClient).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return STSClient[k];
        },
      });
  });
});
export { require_sts };
