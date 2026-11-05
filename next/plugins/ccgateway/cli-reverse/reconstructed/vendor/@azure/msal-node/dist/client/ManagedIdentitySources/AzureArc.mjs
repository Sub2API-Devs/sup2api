/**
 * @azure/msal-node/dist/client/ManagedIdentitySources/AzureArc.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-fingerprint 2
 */
import { accessSync, constants, statSync, readFileSync } from "fs";
import path from "path";
import {
  BaseManagedIdentitySource,
  ManagedIdentityEnvironmentVariableNames,
  ManagedIdentitySourceNames,
  ManagedIdentityIdType,
  createManagedIdentityError,
  unableToCreateAzureArc,
  ManagedIdentityRequestParameters,
  HttpMethod,
  ManagedIdentityHeaders,
  ManagedIdentityQueryParameters,
  wwwAuthenticateHeaderMissing,
  wwwAuthenticateHeaderUnsupportedFormat,
  platformNotSupported,
  invalidFileExtension,
  invalidFilePath,
  unableToReadSecretFile,
  AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES,
  invalidSecret,
} from "../../../lib/msal-node.cjs";
import {
  HttpStatus,
  EncodingTypes,
  AuthError,
  createClientAuthError,
  networkError,
} from "../../../../msal-common/lib/index-node-DhUjlPuB.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-b5df2wx1.js:273815-274154 esm-fingerprint
var ARC_API_VERSION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT;
var HIMDS_EXECUTABLE_HELPER_STRING;
var SUPPORTED_AZURE_ARC_PLATFORMS;
var AZURE_ARC_FILE_DETECTION;
deferInit("chunk-b5df2wx1.js:273815", () => {
  ARC_API_VERSION = "2019-11-01";
  DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT = "http://127.0.0.1:40342/metadata/identity/oauth2/token";
  HIMDS_EXECUTABLE_HELPER_STRING = "N/A: himds executable exists";
  SUPPORTED_AZURE_ARC_PLATFORMS = {
    win32: `${process.env.ProgramData}\\AzureConnectedMachineAgent\\Tokens\\`,
    linux: "/var/opt/azcmagent/tokens/",
  };
  AZURE_ARC_FILE_DETECTION = {
    win32: `${process.env.ProgramFiles}\\AzureConnectedMachineAgent\\himds.exe`,
    linux: "/opt/azcmagent/bin/himds",
  };
});
//@ chunk-b5df2wx1.js:274154-276388 esm-fingerprint
let AzureArc; // deferred: uses BaseManagedIdentitySource (../../../lib/msal-node.cjs) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:274154", () => {
  AzureArc = class AzureArc extends BaseManagedIdentitySource {
    constructor(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      identityEndpoint,
    ) {
      super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
      this.identityEndpoint = identityEndpoint;
    }
    static getEnvironmentVariables() {
      let identityEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT];
      let imdsEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT];
      if (!identityEndpoint || !imdsEndpoint) {
        let fileDetectionPath = AZURE_ARC_FILE_DETECTION.linux;
        try {
          accessSync(fileDetectionPath, constants.F_OK | constants.R_OK);
          identityEndpoint = DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT;
          imdsEndpoint = HIMDS_EXECUTABLE_HELPER_STRING;
        } catch (err) {}
      }
      return [identityEndpoint, imdsEndpoint];
    }
    static tryCreate(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      managedIdentityId,
    ) {
      let [identityEndpoint, imdsEndpoint] = AzureArc.getEnvironmentVariables();
      if (!identityEndpoint || !imdsEndpoint) {
        logger.info(
          `[Managed Identity] ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is unavailable through environment variables because one or both of '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' and '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' are not defined. ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is also unavailable through file detection.`,
        );
        return null;
      }
      if (imdsEndpoint === HIMDS_EXECUTABLE_HELPER_STRING)
        logger.info(
          `[Managed Identity] ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is available through file detection. Defaulting to known ${ManagedIdentitySourceNames.AZURE_ARC} endpoint: ${DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT}. Creating ${ManagedIdentitySourceNames.AZURE_ARC} managed identity.`,
        );
      else {
        let validatedIdentityEndpoint = AzureArc.getValidatedEnvVariableUrlString(
          ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT,
          identityEndpoint,
          ManagedIdentitySourceNames.AZURE_ARC,
          logger,
        );
        if (validatedIdentityEndpoint.endsWith("/")) validatedIdentityEndpoint.slice(0, -1);
        AzureArc.getValidatedEnvVariableUrlString(
          ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT,
          imdsEndpoint,
          ManagedIdentitySourceNames.AZURE_ARC,
          logger,
        );
        logger.info(
          `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.AZURE_ARC} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.AZURE_ARC} managed identity.`,
        );
      }
      if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED)
        throw createManagedIdentityError(unableToCreateAzureArc);
      return new AzureArc(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        identityEndpoint,
      );
    }
    createRequest(resource) {
      let request = new ManagedIdentityRequestParameters(
        HttpMethod.GET,
        this.identityEndpoint.replace("localhost", "127.0.0.1"),
      );
      request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
      request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = ARC_API_VERSION;
      request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
      return request;
    }
    async getServerTokenResponseAsync(
      originalResponse,
      networkClient,
      networkRequest,
      networkRequestOptions,
    ) {
      let retryResponse;
      if (originalResponse.status === HttpStatus.UNAUTHORIZED) {
        let wwwAuthHeader = originalResponse.headers["www-authenticate"];
        if (!wwwAuthHeader) throw createManagedIdentityError(wwwAuthenticateHeaderMissing);
        if (!wwwAuthHeader.includes("Basic realm="))
          throw createManagedIdentityError(wwwAuthenticateHeaderUnsupportedFormat);
        let secretFilePath = wwwAuthHeader.split("Basic realm=")[1];
        if (!SUPPORTED_AZURE_ARC_PLATFORMS.hasOwnProperty("linux"))
          throw createManagedIdentityError(platformNotSupported);
        let expectedSecretFilePath = SUPPORTED_AZURE_ARC_PLATFORMS.linux;
        let fileName = path.basename(secretFilePath);
        if (!fileName.endsWith(".key")) throw createManagedIdentityError(invalidFileExtension);
        if (expectedSecretFilePath + fileName !== secretFilePath)
          throw createManagedIdentityError(invalidFilePath);
        let secretFileSize;
        try {
          secretFileSize = await statSync(secretFilePath).size;
        } catch (e) {
          throw createManagedIdentityError(unableToReadSecretFile);
        }
        if (secretFileSize > AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES)
          throw createManagedIdentityError(invalidSecret);
        let secret;
        try {
          secret = readFileSync(secretFilePath, EncodingTypes.UTF8);
        } catch (e) {
          throw createManagedIdentityError(unableToReadSecretFile);
        }
        let authHeaderValue = `Basic ${secret}`;
        this.logger.info("[Managed Identity] Adding authorization header to the request.");
        networkRequest.headers[ManagedIdentityHeaders.AUTHORIZATION_HEADER_NAME] = authHeaderValue;
        try {
          retryResponse = await networkClient.sendGetRequestAsync(
            networkRequest.computeUri(),
            networkRequestOptions,
          );
        } catch (error) {
          if (error instanceof AuthError) throw error;
          else throw createClientAuthError(networkError);
        }
      }
      return this.getServerTokenResponse(retryResponse || originalResponse);
    }
  };
});
export { AzureArc };
