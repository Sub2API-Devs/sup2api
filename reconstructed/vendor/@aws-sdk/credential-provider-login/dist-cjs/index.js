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
import { SD } from "../../core/dist-cjs/submodules/client/index.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-hecvqqcj.js:3742-3757 esm-layout
var G = Re(SD());
//@ chunk-hecvqqcj.js:3757-3794 esm-layout
var q = Re(SD()),
  M = Re($h()),
  C = Re(hU());
//@ chunk-hecvqqcj.js:3794-3831 esm-layout
var f = Re($h()),
  j = Re(Kg()),
  W = Re(hU());
//@ chunk-hecvqqcj.js:4026-9353 esm-fingerprint
class w {
  profileData;
  init;
  callerClientConfig;
  static REFRESH_THRESHOLD = 300000;
  constructor(e, r, t) {
    ((this.profileData = e), (this.init = r), (this.callerClientConfig = t));
  }
  async loadCredentials() {
    let token = await this.loadToken();
    if (!token)
      throw new f.CredentialsProviderError(
        `Failed to load a token for session ${this.loginSession}, please re-authenticate using aws login`,
        { tryNextLink: !1, logger: this.logger },
      );
    let accessToken = token.accessToken,
      now = Date.now();
    if (new Date(accessToken.expiresAt).getTime() - now <= w.REFRESH_THRESHOLD) return this.refresh(token);
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
  async refresh(e) {
    let { SigninClient: SigninClient, CreateOAuth2TokenCommand: CreateOAuth2TokenCommand } =
        await import("./chunk-y366fgzk.js").then((m) => Re(m.default)),
      { logger: logger, userAgentAppId: userAgentAppId } = this.callerClientConfig ?? {},
      i = ((a) => a?.metadata?.handlerProtocol === "h2")(this.callerClientConfig?.requestHandler)
        ? void 0
        : this.callerClientConfig?.requestHandler,
      u = this.profileData.region ?? (await this.callerClientConfig?.region?.()) ?? process.env.AWS_REGION,
      g = new SigninClient({
        credentials: { accessKeyId: "", secretAccessKey: "" },
        region: u,
        requestHandler: i,
        logger: logger,
        userAgentAppId: userAgentAppId,
        ...this.init?.clientConfig,
      });
    this.createDPoPInterceptor(g.middlewareStack);
    let l = {
      tokenInput: { clientId: e.clientId, refreshToken: e.refreshToken, grantType: "refresh_token" },
    };
    try {
      let send = await g.send(new CreateOAuth2TokenCommand(l)),
        {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
          sessionToken: sessionToken,
        } = send.tokenOutput?.accessToken ?? {},
        { refreshToken: refreshToken, expiresIn: expiresIn } = send.tokenOutput ?? {};
      if (!accessKeyId || !secretAccessKey || !sessionToken || !refreshToken)
        throw new f.CredentialsProviderError("Token refresh response missing required fields", {
          logger: this.logger,
          tryNextLink: !1,
        });
      let E = (expiresIn ?? 900) * 1000,
        date = new Date(Date.now() + E),
        D = {
          ...e,
          accessToken: {
            ...e.accessToken,
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            sessionToken: sessionToken,
            expiresAt: date.toISOString(),
          },
          refreshToken: refreshToken,
        };
      await this.saveToken(D);
      let accessToken = D.accessToken;
      return {
        accessKeyId: accessToken.accessKeyId,
        secretAccessKey: accessToken.secretAccessKey,
        sessionToken: accessToken.sessionToken,
        accountId: accessToken.accountId,
        expiration: date,
      };
    } catch (error) {
      if (error.name === "AccessDeniedException") {
        let error_2 = error.error,
          c;
        switch (error_2) {
          case "TOKEN_EXPIRED":
            c = "Your session has expired. Please reauthenticate.";
            break;
          case "USER_CREDENTIALS_CHANGED":
            c =
              "Unable to refresh credentials because of a change in your password. Please reauthenticate with your new password.";
            break;
          case "INSUFFICIENT_PERMISSIONS":
            c =
              "Unable to refresh credentials due to insufficient permissions. You may be missing permission for the 'CreateOAuth2Token' action.";
            break;
          default:
            c = `Failed to refresh token: ${String(error)}. Please re-authenticate using \`aws login\``;
        }
        throw new f.CredentialsProviderError(c, { logger: this.logger, tryNextLink: !1 });
      }
      throw new f.CredentialsProviderError(
        `Failed to refresh token: ${String(error)}. Please re-authenticate using aws login`,
        { logger: this.logger },
      );
    }
  }
  async loadToken() {
    let tokenFilePath = this.getTokenFilePath();
    try {
      let r;
      try {
        r = await W.readFile(tokenFilePath, { ignoreCache: this.init?.ignoreCache });
      } catch {
        r = await promises.readFile(tokenFilePath, "utf8");
      }
      let parsed = JSON.parse(r),
        filtered = ["accessToken", "clientId", "refreshToken", "dpopKey"].filter((s) => !parsed[s]);
      if (!parsed.accessToken?.accountId) filtered.push("accountId");
      if (filtered.length > 0)
        throw new f.CredentialsProviderError(
          `Token validation failed, missing fields: ${filtered.join(", ")}`,
          { logger: this.logger, tryNextLink: !1 },
        );
      return parsed;
    } catch (error) {
      throw new f.CredentialsProviderError(`Failed to load token from ${tokenFilePath}: ${String(error)}`, {
        logger: this.logger,
        tryNextLink: !1,
      });
    }
  }
  async saveToken(e) {
    let tokenFilePath = this.getTokenFilePath(),
      t = dirname(tokenFilePath);
    try {
      await promises.mkdir(t, { recursive: !0 });
    } catch (error) {}
    await promises.writeFile(tokenFilePath, JSON.stringify(e, null, 2), "utf8");
  }
  getTokenFilePath() {
    let e = process.env.AWS_LOGIN_CACHE_DIRECTORY ?? join(homedir(), ".aws", "login", "cache"),
      buffer = Buffer.from(this.loginSession, "utf8"),
      digest = createHash("sha256").update(buffer).digest("hex");
    return join(e, `${digest}.json`);
  }
  derToRawSignature(e) {
    let r = 2;
    if (e[r] !== 2) throw Error("Invalid DER signature");
    r++;
    let t = e[r++],
      chunk = e.subarray(r, r + t);
    if (((r += t), e[r] !== 2)) throw Error("Invalid DER signature");
    r++;
    let s = e[r++],
      chunk_2 = e.subarray(r, r + s);
    ((chunk = chunk[0] === 0 ? chunk.subarray(1) : chunk),
      (chunk_2 = chunk_2[0] === 0 ? chunk_2.subarray(1) : chunk_2));
    let buffer = Buffer.concat([Buffer.alloc(32 - chunk.length), chunk]),
      buffer_2 = Buffer.concat([Buffer.alloc(32 - chunk_2.length), chunk_2]);
    return Buffer.concat([buffer, buffer_2]);
  }
  createDPoPInterceptor(e) {
    e.add(
      (r) => async (t) => {
        if (j.HttpRequest.isInstance(t.request)) {
          let request = t.request,
            s = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`,
            generateDpop = await this.generateDpop(request.method, s);
          request.headers = { ...request.headers, DPoP: generateDpop };
        }
        return r(t);
      },
      { step: "finalizeRequest", name: "dpopInterceptor", override: !0 },
    );
  }
  async generateDpop(e = "POST", r) {
    let token = await this.loadToken();
    try {
      let o = createPrivateKey({ key: token.dpopKey, format: "pem", type: "sec1" }),
        n = createPublicKey(o).export({ format: "der", type: "spki" }),
        i = -1;
      for (let p = 0; p < n.length; p++)
        if (n[p] === 4) {
          i = p;
          break;
        }
      let sliced = n.slice(i + 1, i + 33),
        sliced_2 = n.slice(i + 33, i + 65),
        l = {
          alg: "ES256",
          typ: "dpop+jwt",
          jwk: {
            kty: "EC",
            crv: "P-256",
            x: sliced.toString("base64url"),
            y: sliced_2.toString("base64url"),
          },
        },
        a = { jti: crypto.randomUUID(), htm: e, htu: r, iat: Math.floor(Date.now() / 1000) },
        str = Buffer.from(JSON.stringify(l)).toString("base64url"),
        str_2 = Buffer.from(JSON.stringify(a)).toString("base64url"),
        m = `${str}.${str_2}`,
        h = sign("sha256", Buffer.from(m), o),
        str_3 = this.derToRawSignature(h).toString("base64url");
      return `${m}.${str_3}`;
    } catch (error) {
      throw new f.CredentialsProviderError(
        `Failed to generate Dpop proof: ${error instanceof Error ? error.message : String(error)}`,
        { logger: this.logger, tryNextLink: !1 },
      );
    }
  }
}
//@ chunk-hecvqqcj.js:9353-9813 esm-fingerprint
var U =
  (e) =>
  async ({ callerClientConfig: r } = {}) => {
    e?.logger?.debug?.("@aws-sdk/credential-providers - fromLoginCredentials");
    let knownFiles = await C.parseKnownFiles(e || {}),
      profileName = C.getProfileName({ profile: e?.profile ?? r?.profile }),
      s = knownFiles[profileName];
    if (!s?.login_session)
      throw new M.CredentialsProviderError(`Profile ${profileName} does not contain login_session.`, {
        tryNextLink: !0,
        logger: e?.logger,
      });
    let credentials = await new w(s, e, r).loadCredentials();
    return q.setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
  };

export { U, G };
