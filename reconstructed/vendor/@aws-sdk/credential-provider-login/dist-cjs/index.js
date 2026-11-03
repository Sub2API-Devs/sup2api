/**
 * @aws-sdk/credential-provider-login/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-login@3.936.0..3.972.52
 * pieces: chunk-hecvqqcj.js (5)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { promises } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { createHash, createPrivateKey, createPublicKey, sign } from "crypto";
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_client } from "../../core/dist-cjs/submodules/client/index.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-hecvqqcj.js:3742-3757 esm-layout
var import_client_2 = Re(require_client());
//@ chunk-hecvqqcj.js:3757-3794 esm-layout
var import_client_3 = Re(require_client());
var import_property_provider_3 = Re(require_property_provider());
var import_shared_ini_file_loader_2 = Re(require_shared_ini_file_loader());
//@ chunk-hecvqqcj.js:3794-3831 esm-layout
var config = Re(require_property_provider());
var protocols = Re(require_protocol_http());
var import_shared_ini_file_loader_3 = Re(require_shared_ini_file_loader());
//@ chunk-hecvqqcj.js:4026-9353 esm-fingerprint
class LoginCredentialsFetcher {
  profileData;
  init;
  callerClientConfig;
  static REFRESH_THRESHOLD = 300000;
  constructor(profileData, init, callerClientConfig) {
    this.profileData = profileData;
    this.init = init;
    this.callerClientConfig = callerClientConfig;
  }
  async loadCredentials() {
    let token = await this.loadToken();
    if (!token)
      throw new config.CredentialsProviderError(
        `Failed to load a token for session ${this.loginSession}, please re-authenticate using aws login`,
        {
          tryNextLink: false,
          logger: this.logger,
        },
      );
    let accessToken = token.accessToken;
    let now = Date.now();
    if (new Date(accessToken.expiresAt).getTime() - now <= LoginCredentialsFetcher.REFRESH_THRESHOLD)
      return this.refresh(token);
    return {
      accessKeyId: accessToken.accessKeyId,
      secretAccessKey: accessToken.secretAccessKey,
      sessionToken: accessToken.sessionToken,
      accountId: accessToken.accountId,
      expiration: new Date(accessToken.expiresAt),
    };
  }
  get logger() {
    return this.init?.logger;
  }
  get loginSession() {
    return this.profileData.login_session;
  }
  async refresh(token) {
    let { SigninClient, CreateOAuth2TokenCommand } = await import("./chunk-y366fgzk.js").then((m) =>
      Re(m.default),
    );
    let { logger, userAgentAppId } = this.callerClientConfig ?? {};
    let requestHandler = ((requestHandler) => requestHandler?.metadata?.handlerProtocol === "h2")(
      this.callerClientConfig?.requestHandler,
    )
      ? undefined
      : this.callerClientConfig?.requestHandler;
    let region =
      this.profileData.region ?? (await this.callerClientConfig?.region?.()) ?? process.env.AWS_REGION;
    let client = new SigninClient({
      credentials: {
        accessKeyId: "",
        secretAccessKey: "",
      },
      region,
      requestHandler,
      logger,
      userAgentAppId,
      ...this.init?.clientConfig,
    });
    this.createDPoPInterceptor(client.middlewareStack);
    let commandInput = {
      tokenInput: {
        clientId: token.clientId,
        refreshToken: token.refreshToken,
        grantType: "refresh_token",
      },
    };
    try {
      let response = await client.send(new CreateOAuth2TokenCommand(commandInput));
      let { accessKeyId, secretAccessKey, sessionToken } = response.tokenOutput?.accessToken ?? {};
      let { refreshToken, expiresIn } = response.tokenOutput ?? {};
      if (!accessKeyId || !secretAccessKey || !sessionToken || !refreshToken)
        throw new config.CredentialsProviderError("Token refresh response missing required fields", {
          logger: this.logger,
          tryNextLink: false,
        });
      let expiresInMs = (expiresIn ?? 900) * 1000;
      let expiration = new Date(Date.now() + expiresInMs);
      let updatedToken = {
        ...token,
        accessToken: {
          ...token.accessToken,
          accessKeyId,
          secretAccessKey,
          sessionToken,
          expiresAt: expiration.toISOString(),
        },
        refreshToken,
      };
      await this.saveToken(updatedToken);
      let newAccessToken = updatedToken.accessToken;
      return {
        accessKeyId: newAccessToken.accessKeyId,
        secretAccessKey: newAccessToken.secretAccessKey,
        sessionToken: newAccessToken.sessionToken,
        accountId: newAccessToken.accountId,
        expiration,
      };
    } catch (error) {
      if (error.name === "AccessDeniedException") {
        let errorType = error.error;
        let message;
        switch (errorType) {
          case "TOKEN_EXPIRED":
            message = "Your session has expired. Please reauthenticate.";
            break;
          case "USER_CREDENTIALS_CHANGED":
            message =
              "Unable to refresh credentials because of a change in your password. Please reauthenticate with your new password.";
            break;
          case "INSUFFICIENT_PERMISSIONS":
            message =
              "Unable to refresh credentials due to insufficient permissions. You may be missing permission for the 'CreateOAuth2Token' action.";
            break;
          default:
            message = `Failed to refresh token: ${String(error)}. Please re-authenticate using \`aws login\``;
        }
        throw new config.CredentialsProviderError(message, {
          logger: this.logger,
          tryNextLink: false,
        });
      }
      throw new config.CredentialsProviderError(
        `Failed to refresh token: ${String(error)}. Please re-authenticate using aws login`,
        {
          logger: this.logger,
        },
      );
    }
  }
  async loadToken() {
    let tokenFilePath = this.getTokenFilePath();
    try {
      let tokenData;
      try {
        tokenData = await import_shared_ini_file_loader_3.readFile(tokenFilePath, {
          ignoreCache: this.init?.ignoreCache,
        });
      } catch {
        tokenData = await promises.readFile(tokenFilePath, "utf8");
      }
      let token = JSON.parse(tokenData);
      let missingFields = ["accessToken", "clientId", "refreshToken", "dpopKey"].filter((k) => !token[k]);
      if (!token.accessToken?.accountId) missingFields.push("accountId");
      if (missingFields.length > 0)
        throw new config.CredentialsProviderError(
          `Token validation failed, missing fields: ${missingFields.join(", ")}`,
          {
            logger: this.logger,
            tryNextLink: false,
          },
        );
      return token;
    } catch (error) {
      throw new config.CredentialsProviderError(
        `Failed to load token from ${tokenFilePath}: ${String(error)}`,
        {
          logger: this.logger,
          tryNextLink: false,
        },
      );
    }
  }
  async saveToken(token) {
    let tokenFilePath = this.getTokenFilePath();
    let directory = dirname(tokenFilePath);
    try {
      await promises.mkdir(directory, {
        recursive: true,
      });
    } catch (error) {}
    await promises.writeFile(tokenFilePath, JSON.stringify(token, null, 2), "utf8");
  }
  getTokenFilePath() {
    let directory = process.env.AWS_LOGIN_CACHE_DIRECTORY ?? join(homedir(), ".aws", "login", "cache");
    let loginSessionBytes = Buffer.from(this.loginSession, "utf8");
    let loginSessionSha256 = createHash("sha256").update(loginSessionBytes).digest("hex");
    return join(directory, `${loginSessionSha256}.json`);
  }
  derToRawSignature(derSignature) {
    let offset = 2;
    if (derSignature[offset] !== 2) throw Error("Invalid DER signature");
    offset++;
    let rLength = derSignature[offset++];
    let r = derSignature.subarray(offset, offset + rLength);
    offset += rLength;
    if (derSignature[offset] !== 2) throw Error("Invalid DER signature");
    offset++;
    let sLength = derSignature[offset++];
    let s = derSignature.subarray(offset, offset + sLength);
    r = r[0] === 0 ? r.subarray(1) : r;
    s = s[0] === 0 ? s.subarray(1) : s;
    let rPadded = Buffer.concat([Buffer.alloc(32 - r.length), r]);
    let sPadded = Buffer.concat([Buffer.alloc(32 - s.length), s]);
    return Buffer.concat([rPadded, sPadded]);
  }
  createDPoPInterceptor(middlewareStack) {
    middlewareStack.add(
      (next) => async (args) => {
        if (protocols.HttpRequest.isInstance(args.request)) {
          let request = args.request;
          let actualEndpoint = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`;
          let dpop = await this.generateDpop(request.method, actualEndpoint);
          request.headers = {
            ...request.headers,
            DPoP: dpop,
          };
        }
        return next(args);
      },
      {
        step: "finalizeRequest",
        name: "dpopInterceptor",
        override: true,
      },
    );
  }
  async generateDpop(method = "POST", endpoint) {
    let token = await this.loadToken();
    try {
      let privateKey = createPrivateKey({
        key: token.dpopKey,
        format: "pem",
        type: "sec1",
      });
      let publicDer = createPublicKey(privateKey).export({
        format: "der",
        type: "spki",
      });
      let pointStart = -1;
      for (let i = 0; i < publicDer.length; i++)
        if (publicDer[i] === 4) {
          pointStart = i;
          break;
        }
      let x = publicDer.slice(pointStart + 1, pointStart + 33);
      let y = publicDer.slice(pointStart + 33, pointStart + 65);
      let header = {
        alg: "ES256",
        typ: "dpop+jwt",
        jwk: {
          kty: "EC",
          crv: "P-256",
          x: x.toString("base64url"),
          y: y.toString("base64url"),
        },
      };
      let payload = {
        jti: crypto.randomUUID(),
        htm: method,
        htu: endpoint,
        iat: Math.floor(Date.now() / 1000),
      };
      let headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
      let payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      let message = `${headerB64}.${payloadB64}`;
      let h = sign("sha256", Buffer.from(message), privateKey);
      let str = this.derToRawSignature(h).toString("base64url");
      return `${message}.${str}`;
    } catch (error) {
      throw new config.CredentialsProviderError(
        `Failed to generate Dpop proof: ${error instanceof Error ? error.message : String(error)}`,
        {
          logger: this.logger,
          tryNextLink: false,
        },
      );
    }
  }
}
//@ chunk-hecvqqcj.js:9353-9813 esm-fingerprint
var fromLoginCredentials =
  (init) =>
  async ({ callerClientConfig } = {}) => {
    init?.logger?.debug?.("@aws-sdk/credential-providers - fromLoginCredentials");
    let profiles = await import_shared_ini_file_loader_2.parseKnownFiles(init || {});
    let profileName = import_shared_ini_file_loader_2.getProfileName({
      profile: init?.profile ?? callerClientConfig?.profile,
    });
    let profile = profiles[profileName];
    if (!profile?.login_session)
      throw new import_property_provider_3.CredentialsProviderError(
        `Profile ${profileName} does not contain login_session.`,
        {
          tryNextLink: true,
          logger: init?.logger,
        },
      );
    let credentials = await new LoginCredentialsFetcher(profile, init, callerClientConfig).loadCredentials();
    return import_client_3.setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
  };
export { fromLoginCredentials, import_client_2 };
