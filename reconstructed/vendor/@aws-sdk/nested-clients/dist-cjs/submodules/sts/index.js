/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x as x_2 } from "../../../../../../runtime/bun-runtime.js";
import { le } from "./STSClient.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { pK } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { de } from "./endpoint/EndpointParameters.js";
import { _D } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { SD } from "../../../../core/dist-cjs/submodules/client/index.js";
import { Dae } from "../../../../region-config-resolver/dist-cjs/index.js";

//@ chunk-a8ee6x44.js:12668-21063 cjs-fingerprint
var Wns = x_2(function (ne) {
  var F = le(),
    U = ff(),
    Mt = pK(),
    $t = de(),
    y = _D(),
    _e = SD(),
    No = Dae(),
    S = class e extends U.ServiceException {
      constructor(t) {
        super(t);
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Kt = class e extends S {
      name = "ExpiredTokenException";
      $fault = "client";
      constructor(t) {
        super({ name: "ExpiredTokenException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Gt = class e extends S {
      name = "MalformedPolicyDocumentException";
      $fault = "client";
      constructor(t) {
        super({ name: "MalformedPolicyDocumentException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    zt = class e extends S {
      name = "PackedPolicyTooLargeException";
      $fault = "client";
      constructor(t) {
        super({ name: "PackedPolicyTooLargeException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Vt = class e extends S {
      name = "RegionDisabledException";
      $fault = "client";
      constructor(t) {
        super({ name: "RegionDisabledException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Bt = class e extends S {
      name = "IDPRejectedClaimException";
      $fault = "client";
      constructor(t) {
        super({ name: "IDPRejectedClaimException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Qt = class e extends S {
      name = "InvalidIdentityTokenException";
      $fault = "client";
      constructor(t) {
        super({ name: "InvalidIdentityTokenException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Yt = class e extends S {
      name = "IDPCommunicationErrorException";
      $fault = "client";
      constructor(t) {
        super({ name: "IDPCommunicationErrorException", $fault: "client", ...t });
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    Wo = "Arn",
    jo = "AccessKeyId",
    Fo = "AssumeRole",
    Uo = "AssumedRoleId",
    Lo = "AssumeRoleRequest",
    Mo = "AssumeRoleResponse",
    fe = "AssumedRoleUser",
    $o = "AssumeRoleWithWebIdentity",
    Ko = "AssumeRoleWithWebIdentityRequest",
    Go = "AssumeRoleWithWebIdentityResponse",
    zo = "Audience",
    Se = "Credentials",
    Vo = "ContextAssertion",
    Jt = "DurationSeconds",
    Bo = "Expiration",
    Qo = "ExternalId",
    Yo = "ExpiredTokenException",
    Jo = "IDPCommunicationErrorException",
    Xo = "IDPRejectedClaimException",
    Zo = "InvalidIdentityTokenException",
    en = "Key",
    tn = "MalformedPolicyDocumentException",
    Xt = "Policy",
    Zt = "PolicyArns",
    on = "ProviderArn",
    nn = "ProvidedContexts",
    rn = "ProvidedContextsListType",
    sn = "ProvidedContext",
    cn = "PolicyDescriptorType",
    an = "ProviderId",
    eo = "PackedPolicySize",
    un = "PackedPolicyTooLargeException",
    ln = "Provider",
    to = "RoleArn",
    dn = "RegionDisabledException",
    oo = "RoleSessionName",
    pn = "SecretAccessKey",
    gn = "SubjectFromWebIdentityToken",
    Pe = "SourceIdentity",
    mn = "SerialNumber",
    hn = "SessionToken",
    _n = "Tags",
    fn = "TokenCode",
    Sn = "TransitiveTagKeys",
    Pn = "Tag",
    En = "Value",
    vn = "WebIdentityToken",
    yn = "arn",
    Cn = "accessKeySecretType",
    I = "awsQueryError",
    T = "client",
    An = "clientTokenType",
    D = "error",
    b = "httpError",
    w = "message",
    xn = "policyDescriptorListType",
    no = "smithy.ts.sdk.synthetic.com.amazonaws.sts",
    Rn = "tagListType",
    c = "com.amazonaws.sts",
    In = [0, c, Cn, 8, 0],
    Tn = [0, c, An, 8, 0],
    ro = [3, c, fe, 0, [Uo, Wo], [0, 0]],
    Dn = [
      3,
      c,
      Lo,
      0,
      [to, oo, Zt, Xt, Jt, _n, Sn, Qo, mn, fn, Pe, nn],
      [0, 0, () => so, 0, 1, () => Gn, 64, 0, 0, 0, 0, () => Kn],
    ],
    bn = [3, c, Mo, 0, [Se, fe, eo, Pe], [[() => io, 0], () => ro, 1, 0]],
    wn = [3, c, Ko, 0, [to, oo, vn, an, Zt, Xt, Jt], [0, 0, [() => Tn, 0], 0, () => so, 0, 1]],
    qn = [3, c, Go, 0, [Se, gn, fe, eo, ln, zo, Pe], [[() => io, 0], 0, () => ro, 1, 0, 0, 0]],
    io = [3, c, Se, 0, [jo, pn, hn, Bo], [0, [() => In, 0], 0, 4]],
    kn = [-3, c, Yo, { [D]: T, [b]: 400, [I]: ["ExpiredTokenException", 400] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(kn, Kt);
  var On = [-3, c, Jo, { [D]: T, [b]: 400, [I]: ["IDPCommunicationError", 400] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(On, Yt);
  var Hn = [-3, c, Xo, { [D]: T, [b]: 403, [I]: ["IDPRejectedClaim", 403] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(Hn, Bt);
  var Nn = [-3, c, Zo, { [D]: T, [b]: 400, [I]: ["InvalidIdentityToken", 400] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(Nn, Qt);
  var Wn = [-3, c, tn, { [D]: T, [b]: 400, [I]: ["MalformedPolicyDocument", 400] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(Wn, Gt);
  var jn = [-3, c, un, { [D]: T, [b]: 400, [I]: ["PackedPolicyTooLarge", 400] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(jn, zt);
  var Fn = [3, c, cn, 0, [yn], [0]],
    Un = [3, c, sn, 0, [on, Vo], [0, 0]],
    Ln = [-3, c, dn, { [D]: T, [b]: 403, [I]: ["RegionDisabledException", 403] }, [w], [0]];
  y.TypeRegistry.for(c).registerError(Ln, Vt);
  var Mn = [3, c, Pn, 0, [en, En], [0, 0]],
    $n = [-3, no, "STSServiceException", 0, [], []];
  y.TypeRegistry.for(no).registerError($n, S);
  var so = [1, c, xn, 0, () => Fn],
    Kn = [1, c, rn, 0, () => Un],
    Gn = [1, c, Rn, 0, () => Mn],
    zn = [9, c, Fo, 0, () => Dn, () => bn],
    Vn = [9, c, $o, 0, () => wn, () => qn];
  class re extends U.Command.classBuilder()
    .ep($t.commonParams)
    .m(function (e, t, n, u) {
      return [Mt.getEndpointPlugin(n, e.getEndpointParameterInstructions())];
    })
    .s("AWSSecurityTokenServiceV20110615", "AssumeRole", {})
    .n("STSClient", "AssumeRoleCommand")
    .sc(zn)
    .build() {}
  class ie extends U.Command.classBuilder()
    .ep($t.commonParams)
    .m(function (e, t, n, u) {
      return [Mt.getEndpointPlugin(n, e.getEndpointParameterInstructions())];
    })
    .s("AWSSecurityTokenServiceV20110615", "AssumeRoleWithWebIdentity", {})
    .n("STSClient", "AssumeRoleWithWebIdentityCommand")
    .sc(Vn)
    .build() {}
  var Bn = { AssumeRoleCommand: re, AssumeRoleWithWebIdentityCommand: ie };
  class Ee extends F.STSClient {}
  U.createAggregatedClient(Bn, Ee);
  var co = (e) => {
      if (typeof e?.Arn === "string") {
        let parts = e.Arn.split(":");
        if (parts.length > 4 && parts[4] !== "") return parts[4];
      }
      return;
    },
    ao = async (e, t, n, u = {}) => {
      let r = typeof e === "function" ? await e() : e,
        g = typeof t === "function" ? await t() : t,
        l = await No.stsRegionDefaultResolver(u)();
      return (
        n?.debug?.(
          "@aws-sdk/client-sts::resolveRegion",
          "accepting first of:",
          `${r} (credential provider clientConfig)`,
          `${g} (contextual client)`,
          `${l} (STS default: AWS_REGION, profile region, or us-east-1)`,
        ),
        r ?? g ?? l
      );
    },
    Qn = (e, t) => {
      let n, u;
      return async (r, g) => {
        if (((u = r), !n)) {
          let {
              logger: logger = e?.parentClientConfig?.logger,
              profile: profile = e?.parentClientConfig?.profile,
              region: region,
              requestHandler: requestHandler = e?.parentClientConfig?.requestHandler,
              credentialProviderLogger: credentialProviderLogger,
              userAgentAppId: userAgentAppId = e?.parentClientConfig?.userAgentAppId,
            } = e,
            mo = await ao(region, e?.parentClientConfig?.region, credentialProviderLogger, {
              logger: logger,
              profile: profile,
            }),
            ho = !uo(requestHandler);
          n = new t({
            ...e,
            userAgentAppId: userAgentAppId,
            profile: profile,
            credentialDefaultProvider: () => async () => u,
            region: mo,
            requestHandler: ho ? requestHandler : void 0,
            logger: logger,
          });
        }
        let { Credentials: Credentials, AssumedRoleUser: AssumedRoleUser } = await n.send(new re(g));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey)
          throw Error(`Invalid response from STS.assumeRole call with role ${g.RoleArn}`);
        let A = co(AssumedRoleUser),
          R = {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
            expiration: Credentials.Expiration,
            ...(Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope }),
            ...(A && { accountId: A }),
          };
        return (_e.setCredentialFeature(R, "CREDENTIALS_STS_ASSUME_ROLE", "i"), R);
      };
    },
    Yn = (e, t) => {
      let n;
      return async (u) => {
        if (!n) {
          let {
              logger: logger = e?.parentClientConfig?.logger,
              profile: profile = e?.parentClientConfig?.profile,
              region: region,
              requestHandler: requestHandler = e?.parentClientConfig?.requestHandler,
              credentialProviderLogger: credentialProviderLogger,
              userAgentAppId: userAgentAppId = e?.parentClientConfig?.userAgentAppId,
            } = e,
            ce = await ao(region, e?.parentClientConfig?.region, credentialProviderLogger, {
              logger: logger,
              profile: profile,
            }),
            ae = !uo(requestHandler);
          n = new t({
            ...e,
            userAgentAppId: userAgentAppId,
            profile: profile,
            region: ce,
            requestHandler: ae ? requestHandler : void 0,
            logger: logger,
          });
        }
        let { Credentials: Credentials, AssumedRoleUser: AssumedRoleUser } = await n.send(new ie(u));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey)
          throw Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${u.RoleArn}`);
        let l = co(AssumedRoleUser),
          C = {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
            expiration: Credentials.Expiration,
            ...(Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope }),
            ...(l && { accountId: l }),
          };
        if (l) _e.setCredentialFeature(C, "RESOLVED_ACCOUNT_ID", "T");
        return (_e.setCredentialFeature(C, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k"), C);
      };
    },
    uo = (e) => e?.metadata?.handlerProtocol === "h2",
    lo = (e, t) => {
      if (!t) return e;
      else
        return class extends e {
          constructor(u) {
            super(u);
            for (let r of t) this.middlewareStack.use(r);
          }
        };
    },
    po = (e = {}, t) => Qn(e, lo(F.STSClient, t)),
    go = (e = {}, t) => Yn(e, lo(F.STSClient, t)),
    Jn = (e) => (t) => e({ roleAssumer: po(t), roleAssumerWithWebIdentity: go(t), ...t });
  Object.defineProperty(ne, "$Command", {
    enumerable: !0,
    get: function () {
      return U.Command;
    },
  });
  ne.AssumeRoleCommand = re;
  ne.AssumeRoleWithWebIdentityCommand = ie;
  ne.ExpiredTokenException = Kt;
  ne.IDPCommunicationErrorException = Yt;
  ne.IDPRejectedClaimException = Bt;
  ne.InvalidIdentityTokenException = Qt;
  ne.MalformedPolicyDocumentException = Gt;
  ne.PackedPolicyTooLargeException = zt;
  ne.RegionDisabledException = Vt;
  ne.STS = Ee;
  ne.STSServiceException = S;
  ne.decorateDefaultCredentialProvider = Jn;
  ne.getDefaultRoleAssumer = po;
  ne.getDefaultRoleAssumerWithWebIdentity = go;
  Object.keys(F).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(ne, e))
      Object.defineProperty(ne, e, {
        enumerable: !0,
        get: function () {
          return F[e];
        },
      });
  });
});

export { Wns };
