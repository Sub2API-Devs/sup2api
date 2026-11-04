/**
 * google-auth-library/build/src/auth/awsclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_awsrequestsigner } from "./awsrequestsigner.js";
import { require_baseexternalclient } from "./baseexternalclient.js";
import { require_defaultawssecuritycredentialssupplier } from "./defaultawssecuritycredentialssupplier.js";
import { require_util } from "../util.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";

//@ chunk-na3pph4p.js:125888-128266 cjs-fingerprint
var require_awsclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AwsClient = undefined;
  var awsrequestsigner_1 = require_awsrequestsigner();
  var baseexternalclient_1 = require_baseexternalclient();
  var defaultawssecuritycredentialssupplier_1 = require_defaultawssecuritycredentialssupplier();
  var util_1 = require_util();
  var gaxios_1 = require_gaxios_2();
  class AwsClient extends baseexternalclient_1.BaseExternalAccountClient {
    environmentId;
    awsSecurityCredentialsSupplier;
    regionalCredVerificationUrl;
    awsRequestSigner;
    region;
    static #e = "https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15";
    static AWS_EC2_METADATA_IPV4_ADDRESS = "169.254.169.254";
    static AWS_EC2_METADATA_IPV6_ADDRESS = "fd00:ec2::254";
    constructor(options) {
      super(options);
      let opts = util_1.originalOrCamelOptions(options);
      let credentialSource = opts.get("credential_source");
      let awsSecurityCredentialsSupplier = opts.get("aws_security_credentials_supplier");
      if (!credentialSource && !awsSecurityCredentialsSupplier)
        throw Error("A credential source or AWS security credentials supplier must be specified.");
      if (credentialSource && awsSecurityCredentialsSupplier)
        throw Error("Only one of credential source or AWS security credentials supplier can be specified.");
      if (awsSecurityCredentialsSupplier) {
        this.awsSecurityCredentialsSupplier = awsSecurityCredentialsSupplier;
        this.regionalCredVerificationUrl = AwsClient.#e;
        this.credentialSourceType = "programmatic";
      } else {
        let credentialSourceOpts = util_1.originalOrCamelOptions(credentialSource);
        this.environmentId = credentialSourceOpts.get("environment_id");
        let regionUrl = credentialSourceOpts.get("region_url");
        let securityCredentialsUrl = credentialSourceOpts.get("url");
        let imdsV2SessionTokenUrl = credentialSourceOpts.get("imdsv2_session_token_url");
        this.awsSecurityCredentialsSupplier =
          new defaultawssecuritycredentialssupplier_1.DefaultAwsSecurityCredentialsSupplier({
            regionUrl,
            securityCredentialsUrl,
            imdsV2SessionTokenUrl,
          });
        this.regionalCredVerificationUrl = credentialSourceOpts.get("regional_cred_verification_url");
        this.credentialSourceType = "aws";
        this.validateEnvironmentId();
      }
      this.awsRequestSigner = null;
      this.region = "";
    }
    validateEnvironmentId() {
      let match = this.environmentId?.match(/^(aws)(\d+)$/);
      if (!match || !this.regionalCredVerificationUrl)
        throw Error('No valid AWS "credential_source" provided');
      else if (parseInt(match[2], 10) !== 1)
        throw Error(`aws version "${match[2]}" is not supported in the current build.`);
    }
    async retrieveSubjectToken() {
      if (!this.awsRequestSigner) {
        this.region = await this.awsSecurityCredentialsSupplier.getAwsRegion(this.supplierContext);
        this.awsRequestSigner = new awsrequestsigner_1.AwsRequestSigner(
          async () => this.awsSecurityCredentialsSupplier.getAwsSecurityCredentials(this.supplierContext),
          this.region,
        );
      }
      let options = await this.awsRequestSigner.getRequestOptions({
        ...AwsClient.RETRY_CONFIG,
        url: this.regionalCredVerificationUrl.replace("{region}", this.region),
        method: "POST",
      });
      let reformattedHeader = [];
      gaxios_1.Gaxios.mergeHeaders(
        {
          "x-goog-cloud-target-resource": this.audience,
        },
        options.headers,
      ).forEach((value, key) =>
        reformattedHeader.push({
          key,
          value,
        }),
      );
      return encodeURIComponent(
        JSON.stringify({
          url: options.url,
          method: options.method,
          headers: reformattedHeader,
        }),
      );
    }
  }
  cjsExports.AwsClient = AwsClient;
});
export { require_awsclient };
