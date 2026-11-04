/**
 * google-auth-library/build/src/auth/certificatesubjecttokensupplier.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_util } from "../util.js";

//@ chunk-na3pph4p.js:114685-118656 cjs-fingerprint
var require_certificatesubjecttokensupplier = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CertificateSubjectTokenSupplier =
    cjsExports.InvalidConfigurationError =
    cjsExports.CertificateSourceUnavailableError =
    cjsExports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE =
      undefined;
  var util_1 = require_util();
  var fs = importMetaRequire("fs");
  var crypto_1 = importMetaRequire("crypto");
  var https = importMetaRequire("https");
  cjsExports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE = "GOOGLE_API_CERTIFICATE_CONFIG";
  class CertificateSourceUnavailableError extends Error {
    constructor(message) {
      super(message);
      this.name = "CertificateSourceUnavailableError";
    }
  }
  cjsExports.CertificateSourceUnavailableError = CertificateSourceUnavailableError;
  class InvalidConfigurationError extends Error {
    constructor(message) {
      super(message);
      this.name = "InvalidConfigurationError";
    }
  }
  cjsExports.InvalidConfigurationError = InvalidConfigurationError;
  class CertificateSubjectTokenSupplier {
    certificateConfigPath;
    trustChainPath;
    cert;
    key;
    constructor(opts) {
      if (!opts.useDefaultCertificateConfig && !opts.certificateConfigLocation)
        throw new InvalidConfigurationError(
          "Either `useDefaultCertificateConfig` must be true or a `certificateConfigLocation` must be provided.",
        );
      if (opts.useDefaultCertificateConfig && opts.certificateConfigLocation)
        throw new InvalidConfigurationError(
          "Both `useDefaultCertificateConfig` and `certificateConfigLocation` cannot be provided.",
        );
      this.trustChainPath = opts.trustChainPath;
      this.certificateConfigPath = opts.certificateConfigLocation ?? "";
    }
    async createMtlsHttpsAgent() {
      if (!this.key || !this.cert)
        throw new InvalidConfigurationError("Cannot create mTLS Agent with missing certificate or key");
      return new https.Agent({
        key: this.key,
        cert: this.cert,
      });
    }
    async getSubjectToken() {
      this.certificateConfigPath = await this.#e();
      let { certPath, keyPath } = await this.#t();
      ({ cert: this.cert, key: this.key } = await this.#r(certPath, keyPath));
      return await this.#s(this.cert);
    }
    async #e() {
      let overridePath = this.certificateConfigPath;
      if (overridePath) {
        if (await util_1.isValidFile(overridePath)) return overridePath;
        throw new CertificateSourceUnavailableError(
          `Provided certificate config path is invalid: ${overridePath}`,
        );
      }
      let envPath = process.env[cjsExports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE];
      if (envPath) {
        if (await util_1.isValidFile(envPath)) return envPath;
        throw new CertificateSourceUnavailableError(
          `Path from environment variable "${cjsExports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE}" is invalid: ${envPath}`,
        );
      }
      let wellKnownPath = util_1.getWellKnownCertificateConfigFileLocation();
      if (await util_1.isValidFile(wellKnownPath)) return wellKnownPath;
      throw new CertificateSourceUnavailableError(
        `Could not find certificate configuration file. Searched override path, the "${cjsExports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE}" env var, and the gcloud path (${wellKnownPath}).`,
      );
    }
    async #t() {
      let configPath = this.certificateConfigPath;
      let fileContents;
      try {
        fileContents = await fs.promises.readFile(configPath, "utf8");
      } catch (err) {
        throw new CertificateSourceUnavailableError(
          `Failed to read certificate config file at: ${configPath}`,
        );
      }
      try {
        let config = JSON.parse(fileContents);
        let certPath = config?.cert_configs?.workload?.cert_path;
        let keyPath = config?.cert_configs?.workload?.key_path;
        if (!certPath || !keyPath)
          throw new InvalidConfigurationError(
            `Certificate config file (${configPath}) is missing required "cert_path" or "key_path" in the workload config.`,
          );
        return {
          certPath,
          keyPath,
        };
      } catch (e) {
        if (e instanceof InvalidConfigurationError) throw e;
        throw new InvalidConfigurationError(
          `Failed to parse certificate config from ${configPath}: ${e.message}`,
        );
      }
    }
    async #r(certPath, keyPath) {
      let cert;
      let key;
      try {
        cert = await fs.promises.readFile(certPath);
        new crypto_1.X509Certificate(cert);
      } catch (err) {
        let message = err instanceof Error ? err.message : String(err);
        throw new CertificateSourceUnavailableError(
          `Failed to read certificate file at ${certPath}: ${message}`,
        );
      }
      try {
        key = await fs.promises.readFile(keyPath);
        crypto_1.createPrivateKey(key);
      } catch (err) {
        let message = err instanceof Error ? err.message : String(err);
        throw new CertificateSourceUnavailableError(
          `Failed to read private key file at ${keyPath}: ${message}`,
        );
      }
      return {
        cert,
        key,
      };
    }
    async #s(leafCertBuffer) {
      let leafCert = new crypto_1.X509Certificate(leafCertBuffer);
      if (!this.trustChainPath) return JSON.stringify([leafCert.raw.toString("base64")]);
      try {
        let chainCerts = (
          (await fs.promises.readFile(this.trustChainPath, "utf8")).match(
            /-----BEGIN CERTIFICATE-----[^-]+-----END CERTIFICATE-----/g,
          ) ?? []
        ).map((pem, index) => {
          try {
            return new crypto_1.X509Certificate(pem);
          } catch (err) {
            let message = err instanceof Error ? err.message : String(err);
            throw new InvalidConfigurationError(
              `Failed to parse certificate at index ${index} in trust chain file ${this.trustChainPath}: ${message}`,
            );
          }
        });
        let leafIndex = chainCerts.findIndex((chainCert) => leafCert.raw.equals(chainCert.raw));
        let finalChain;
        if (leafIndex === -1) finalChain = [leafCert, ...chainCerts];
        else if (leafIndex === 0) finalChain = chainCerts;
        else
          throw new InvalidConfigurationError(
            `Leaf certificate exists in the trust chain but is not the first entry (found at index ${leafIndex}).`,
          );
        return JSON.stringify(finalChain.map((cert) => cert.raw.toString("base64")));
      } catch (err) {
        if (err instanceof InvalidConfigurationError) throw err;
        let message = err instanceof Error ? err.message : String(err);
        throw new CertificateSourceUnavailableError(
          `Failed to process certificate chain from ${this.trustChainPath}: ${message}`,
        );
      }
    }
  }
  cjsExports.CertificateSubjectTokenSupplier = CertificateSubjectTokenSupplier;
});
export { require_certificatesubjecttokensupplier };
