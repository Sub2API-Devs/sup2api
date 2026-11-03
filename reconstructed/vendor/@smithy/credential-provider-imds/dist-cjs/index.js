/**
 * @smithy/credential-provider-imds/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/credential-provider-imds@4.3.0..4.3.9
 * pieces: chunk-7bg2190x.js (32)
 * attribution: esm-fingerprint 10, esm-layout 22
 */
import { request } from "http";
import { Buffer as ae } from "buffer";
import { parse } from "url";
import { Xa, Re } from "../../../../runtime/bun-runtime.js";
import { $h } from "../../property-provider/dist-cjs/index.js";
import { wD } from "../../node-config-provider/dist-cjs/index.js";
import { P4 } from "../../url-parser/dist-cjs/index.js";

//@ chunk-7bg2190x.js:431-1060 esm-fingerprint
function p(e) {
  return new Promise((t, n) => {
    let o = request({ method: "GET", ...e, hostname: e.hostname?.replace(/^\[(.+)\]$/, "$1") });
    (o.on("error", (r) => {
      (n(Object.assign(new A.ProviderError("Unable to connect to instance metadata service"), r)),
        o.destroy());
    }),
      o.on("timeout", () => {
        (n(new A.ProviderError("TimeoutError from instance metadata service")), o.destroy());
      }),
      o.on("response", (r) => {
        let { statusCode: statusCode = 400 } = r;
        if (statusCode < 200 || 300 <= statusCode)
          (n(
            Object.assign(new A.ProviderError("Error response received from instance metadata service"), {
              statusCode: statusCode,
            }),
          ),
            o.destroy());
        let m = [];
        (r.on("data", (s) => {
          m.push(s);
        }),
          r.on("end", () => {
            (t(ae.concat(m)), o.destroy());
          }));
      }),
      o.end());
  });
}
//@ chunk-7bg2190x.js:1060-1066 esm-layout
var A;
//@ chunk-7bg2190x.js:1066-1093 esm-layout
var S = Xa(() => {
  A = Re($h());
});
//@ chunk-7bg2190x.js:1093-1431 esm-fingerprint
var N = (e) =>
    Boolean(e) &&
    typeof e === "object" &&
    typeof e.AccessKeyId === "string" &&
    typeof e.SecretAccessKey === "string" &&
    typeof e.Token === "string" &&
    typeof e.Expiration === "string",
  g = (e) => ({
    accessKeyId: e.AccessKeyId,
    secretAccessKey: e.SecretAccessKey,
    sessionToken: e.Token,
    expiration: new Date(e.Expiration),
    ...(e.AccountId && { accountId: e.AccountId }),
  });
//@ chunk-7bg2190x.js:1431-1444 esm-layout
var O = () => {};
//@ chunk-7bg2190x.js:1444-1512 esm-fingerprint
var C = ({ maxRetries: maxRetries = 0, timeout: timeout = 1000 }) => ({
  maxRetries: maxRetries,
  timeout: timeout,
});
//@ chunk-7bg2190x.js:1512-1525 esm-layout
var h = () => {};
//@ chunk-7bg2190x.js:1525-1592 esm-layout
var _ = (e, t) => {
  let n = e();
  for (let o = 0; o < t; o++) n = n.catch(e);
  return n;
};
//@ chunk-7bg2190x.js:1592-1605 esm-layout
var D = () => {};
//@ chunk-7bg2190x.js:1634-2878 esm-layout
var T,
  AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI",
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
  AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN",
  Fe = (e = {}) => {
    let { timeout: timeout, maxRetries: maxRetries } = C(e);
    return () =>
      _(async () => {
        let o = await me({ logger: e.logger }),
          parsed = JSON.parse(await ce(timeout, o));
        if (!N(parsed))
          throw new T.CredentialsProviderError("Invalid response received from instance metadata service.", {
            logger: e.logger,
          });
        return g(parsed);
      }, maxRetries);
  },
  ce = async (e, t) => {
    if (process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN])
      t.headers = { ...t.headers, Authorization: process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN] };
    return (await p({ ...t, timeout: e })).toString();
  },
  de = "169.254.170.2",
  le,
  pe,
  me = async ({ logger: logger }) => {
    if (process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI])
      return { hostname: de, path: process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI] };
    if (process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI]) {
      let t = parse(process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI]);
      if (!t.hostname || !(t.hostname in le))
        throw new T.CredentialsProviderError(
          `${t.hostname} is not a valid container metadata service hostname`,
          { tryNextLink: !1, logger: logger },
        );
      if (!t.protocol || !(t.protocol in pe))
        throw new T.CredentialsProviderError(
          `${t.protocol} is not a valid container metadata service protocol`,
          { tryNextLink: !1, logger: logger },
        );
      return { ...t, port: t.port ? parseInt(t.port, 10) : void 0 };
    }
    throw new T.CredentialsProviderError(
      `The container metadata credential provider cannot be used unless the ${AWS_CONTAINER_CREDENTIALS_RELATIVE_URI} or ${AWS_CONTAINER_CREDENTIALS_FULL_URI} environment variable is set`,
      { tryNextLink: !1, logger: logger },
    );
  };
//@ chunk-7bg2190x.js:2878-2982 esm-layout
var V = Xa(() => {
  S();
  O();
  h();
  D();
  ((T = Re($h())), (le = { localhost: !0, "127.0.0.1": !0 }), (pe = { "http:": !0, "https:": !0 }));
});
//@ chunk-7bg2190x.js:2982-2990 esm-layout
var U, v;
//@ chunk-7bg2190x.js:2990-3205 esm-fingerprint
var W = Xa(() => {
  U = Re($h());
  v = class v extends U.CredentialsProviderError {
    tryNextLink;
    name = "InstanceMetadataV1FallbackError";
    constructor(e, t = !0) {
      super(e, t);
      ((this.tryNextLink = t), Object.setPrototypeOf(this, v.prototype));
    }
  };
});
//@ chunk-7bg2190x.js:3205-3211 esm-layout
var u;
//@ chunk-7bg2190x.js:3211-3317 esm-fingerprint
var B = Xa(() => {
  (function (e) {
    ((e.IPv4 = "http://169.254.169.254"), (e.IPv6 = "http://[fd00:ec2::254]"));
  })(u || (u = {}));
});
//@ chunk-7bg2190x.js:3317-3323 esm-layout
var K;
//@ chunk-7bg2190x.js:3323-3483 esm-layout
var G = Xa(() => {
  K = {
    environmentVariableSelector: (e) => e.AWS_EC2_METADATA_SERVICE_ENDPOINT,
    configFileSelector: (e) => e.ec2_metadata_service_endpoint,
    default: void 0,
  };
});
//@ chunk-7bg2190x.js:3483-3489 esm-layout
var l;
//@ chunk-7bg2190x.js:3489-3559 esm-fingerprint
var M = Xa(() => {
  (function (e) {
    ((e.IPv4 = "IPv4"), (e.IPv6 = "IPv6"));
  })(l || (l = {}));
});
//@ chunk-7bg2190x.js:3559-3649 esm-fingerprint
var AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE = "AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE",
  EC2_METADATA_SERVICE_ENDPOINT_MODE = "ec2_metadata_service_endpoint_mode",
  q;
//@ chunk-7bg2190x.js:3649-3757 esm-fingerprint
var H = Xa(() => {
  M();
  q = {
    environmentVariableSelector: (e) => e[AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE],
    configFileSelector: (e) => e[EC2_METADATA_SERVICE_ENDPOINT_MODE],
    default: l.IPv4,
  };
});
//@ chunk-7bg2190x.js:3757-4036 esm-layout
var P,
  Y,
  y = async () => Y.parseUrl((await Ie()) || (await _e())),
  Ie = async () => P.loadConfig(K)(),
  _e = async () => {
    let e = await P.loadConfig(q)();
    switch (e) {
      case l.IPv4:
        return u.IPv4;
      case l.IPv6:
        return u.IPv6;
      default:
        throw Error(`Unsupported endpoint mode: ${e}. Select from ${Object.values(l)}`);
    }
  };
//@ chunk-7bg2190x.js:4036-4090 esm-layout
var R = Xa(() => {
  B();
  G();
  M();
  H();
  ((P = Re(wD())), (Y = Re(P4())));
});
//@ chunk-7bg2190x.js:4090-4561 esm-fingerprint
var b = (e, t) => {
  let n = 300 + Math.floor(Math.random() * 300),
    date = new Date(Date.now() + n * 1000);
  t.warn(`Attempting credential expiration extension due to a credential service availability issue. A refresh of these credentials will be attempted after ${new Date(date)}.
For more information, please visit: https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html`);
  let r = e.originalExpiration ?? e.expiration;
  return { ...e, ...(r ? { originalExpiration: r } : {}), expiration: date };
};
//@ chunk-7bg2190x.js:4561-4574 esm-layout
var j = () => {};
//@ chunk-7bg2190x.js:4574-4806 esm-fingerprint
var J = (e, t = {}) => {
  let n = t?.logger || console,
    o;
  return async () => {
    let r;
    try {
      if (((r = await e()), r.expiration && r.expiration.getTime() < Date.now())) r = b(r, n);
    } catch (error) {
      if (o) (n.warn("Credential renew failed: ", error), (r = b(o, n)));
      else throw error;
    }
    return ((o = r), r);
  };
};
//@ chunk-7bg2190x.js:4806-4826 esm-layout
var z = Xa(() => {
  j();
});
//@ chunk-7bg2190x.js:4826-6960 esm-layout
var Q,
  L,
  ee = "/latest/meta-data/iam/security-credentials/",
  Te = "/latest/api/token",
  AWS_EC2_METADATA_V1_DISABLED = "AWS_EC2_METADATA_V1_DISABLED",
  EC2_METADATA_V1_DISABLED = "ec2_metadata_v1_disabled",
  X_AWS_EC2_METADATA_TOKEN = "x-aws-ec2-metadata-token",
  nt = (e = {}) => J(ue(e), { logger: e.logger }),
  ue = (e = {}) => {
    let t = !1,
      { logger: logger, profile: profile } = e,
      { timeout: timeout, maxRetries: maxRetries } = C(e),
      m = async (s, f) => {
        if (t || f.headers?.[X_AWS_EC2_METADATA_TOKEN] == null) {
          let i = !1,
            c = !1,
            ne = await Q.loadConfig(
              {
                environmentVariableSelector: (d) => {
                  let E = d[AWS_EC2_METADATA_V1_DISABLED];
                  if (((c = !!E && E !== "false"), E === void 0))
                    throw new L.CredentialsProviderError(
                      `${AWS_EC2_METADATA_V1_DISABLED} not set in env, checking config file next.`,
                      { logger: e.logger },
                    );
                  return c;
                },
                configFileSelector: (d) => {
                  let E = d[EC2_METADATA_V1_DISABLED];
                  return ((i = !!E && E !== "false"), i);
                },
                default: !1,
              },
              { profile: profile },
            )();
          if (e.ec2MetadataV1Disabled || ne) {
            let d = [];
            if (e.ec2MetadataV1Disabled)
              d.push("credential provider initialization (runtime option ec2MetadataV1Disabled)");
            if (i) d.push(`config file profile (${EC2_METADATA_V1_DISABLED})`);
            if (c) d.push(`process environment variable (${AWS_EC2_METADATA_V1_DISABLED})`);
            throw new v(
              `AWS EC2 Metadata v1 fallback has been blocked by AWS SDK configuration in the following: [${d.join(", ")}].`,
            );
          }
        }
        let trimmed = (
          await _(async () => {
            let i;
            try {
              i = await Se(f);
            } catch (error) {
              if (error.statusCode === 401) t = !1;
              throw error;
            }
            return i;
          }, s)
        ).trim();
        return _(async () => {
          let i;
          try {
            i = await Ne(trimmed, f, e);
          } catch (error) {
            if (error.statusCode === 401) t = !1;
            throw error;
          }
          return i;
        }, s);
      };
    return async () => {
      let s = await y();
      if (t)
        return (
          logger?.debug("AWS SDK Instance Metadata", "using v1 fallback (no token fetch)"),
          m(maxRetries, { ...s, timeout: timeout })
        );
      else {
        let f;
        try {
          f = (await Ae({ ...s, timeout: timeout })).toString();
        } catch (error) {
          if (error?.statusCode === 400)
            throw Object.assign(error, { message: "EC2 Metadata token request returned error" });
          else if (error.message === "TimeoutError" || [403, 404, 405].includes(error.statusCode)) t = !0;
          return (
            logger?.debug("AWS SDK Instance Metadata", "using v1 fallback (initial)"),
            m(maxRetries, { ...s, timeout: timeout })
          );
        }
        return m(maxRetries, { ...s, headers: { [X_AWS_EC2_METADATA_TOKEN]: f }, timeout: timeout });
      }
    };
  },
  Ae = async (e) =>
    p({ ...e, path: Te, method: "PUT", headers: { "x-aws-ec2-metadata-token-ttl-seconds": "21600" } }),
  Se = async (e) => (await p({ ...e, path: ee })).toString(),
  Ne = async (e, t, n) => {
    let parsed = JSON.parse((await p({ ...t, path: ee + e })).toString());
    if (!N(parsed))
      throw new L.CredentialsProviderError("Invalid response received from instance metadata service.", {
        logger: n.logger,
      });
    return g(parsed);
  };
//@ chunk-7bg2190x.js:6960-7027 esm-layout
var te = Xa(() => {
  W();
  S();
  O();
  h();
  D();
  R();
  z();
  ((Q = Re(wD())), (L = Re($h())));
});
//@ chunk-7bg2190x.js:7027-7041 esm-layout
var oe = () => {};
//@ chunk-7bg2190x.js:7041-7084 esm-layout
var ge = Xa(() => {
  S();
  R();
  V();
  te();
  h();
  oe();
});
//@ chunk-7bg2190x.js:7084-7089 esm-layout
ge();
