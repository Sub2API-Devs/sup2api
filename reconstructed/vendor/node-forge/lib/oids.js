/**
 * node-forge/lib/oids.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";

//@ chunk-fq0cr76a.js:47100-52411 cjs-fingerprint
var Ja = x(function (dfe, ET) {
  var mf = Tn();
  mf.pki = mf.pki || {};
  var aS = (ET.exports = mf.pki.oids = mf.oids = mf.oids || {});
  function st(e, n) {
    ((aS[e] = n), (aS[n] = e));
  }
  function ir(e, n) {
    aS[e] = n;
  }
  st("1.2.840.113549.1.1.1", "rsaEncryption");
  st("1.2.840.113549.1.1.4", "md5WithRSAEncryption");
  st("1.2.840.113549.1.1.5", "sha1WithRSAEncryption");
  st("1.2.840.113549.1.1.7", "RSAES-OAEP");
  st("1.2.840.113549.1.1.8", "mgf1");
  st("1.2.840.113549.1.1.9", "pSpecified");
  st("1.2.840.113549.1.1.10", "RSASSA-PSS");
  st("1.2.840.113549.1.1.11", "sha256WithRSAEncryption");
  st("1.2.840.113549.1.1.12", "sha384WithRSAEncryption");
  st("1.2.840.113549.1.1.13", "sha512WithRSAEncryption");
  st("1.3.101.112", "EdDSA25519");
  st("1.2.840.10040.4.3", "dsa-with-sha1");
  st("1.3.14.3.2.7", "desCBC");
  st("1.3.14.3.2.26", "sha1");
  st("1.3.14.3.2.29", "sha1WithRSASignature");
  st("2.16.840.1.101.3.4.2.1", "sha256");
  st("2.16.840.1.101.3.4.2.2", "sha384");
  st("2.16.840.1.101.3.4.2.3", "sha512");
  st("2.16.840.1.101.3.4.2.4", "sha224");
  st("2.16.840.1.101.3.4.2.5", "sha512-224");
  st("2.16.840.1.101.3.4.2.6", "sha512-256");
  st("1.2.840.113549.2.2", "md2");
  st("1.2.840.113549.2.5", "md5");
  st("1.2.840.113549.1.7.1", "data");
  st("1.2.840.113549.1.7.2", "signedData");
  st("1.2.840.113549.1.7.3", "envelopedData");
  st("1.2.840.113549.1.7.4", "signedAndEnvelopedData");
  st("1.2.840.113549.1.7.5", "digestedData");
  st("1.2.840.113549.1.7.6", "encryptedData");
  st("1.2.840.113549.1.9.1", "emailAddress");
  st("1.2.840.113549.1.9.2", "unstructuredName");
  st("1.2.840.113549.1.9.3", "contentType");
  st("1.2.840.113549.1.9.4", "messageDigest");
  st("1.2.840.113549.1.9.5", "signingTime");
  st("1.2.840.113549.1.9.6", "counterSignature");
  st("1.2.840.113549.1.9.7", "challengePassword");
  st("1.2.840.113549.1.9.8", "unstructuredAddress");
  st("1.2.840.113549.1.9.14", "extensionRequest");
  st("1.2.840.113549.1.9.20", "friendlyName");
  st("1.2.840.113549.1.9.21", "localKeyId");
  st("1.2.840.113549.1.9.22.1", "x509Certificate");
  st("1.2.840.113549.1.12.10.1.1", "keyBag");
  st("1.2.840.113549.1.12.10.1.2", "pkcs8ShroudedKeyBag");
  st("1.2.840.113549.1.12.10.1.3", "certBag");
  st("1.2.840.113549.1.12.10.1.4", "crlBag");
  st("1.2.840.113549.1.12.10.1.5", "secretBag");
  st("1.2.840.113549.1.12.10.1.6", "safeContentsBag");
  st("1.2.840.113549.1.5.13", "pkcs5PBES2");
  st("1.2.840.113549.1.5.12", "pkcs5PBKDF2");
  st("1.2.840.113549.1.12.1.1", "pbeWithSHAAnd128BitRC4");
  st("1.2.840.113549.1.12.1.2", "pbeWithSHAAnd40BitRC4");
  st("1.2.840.113549.1.12.1.3", "pbeWithSHAAnd3-KeyTripleDES-CBC");
  st("1.2.840.113549.1.12.1.4", "pbeWithSHAAnd2-KeyTripleDES-CBC");
  st("1.2.840.113549.1.12.1.5", "pbeWithSHAAnd128BitRC2-CBC");
  st("1.2.840.113549.1.12.1.6", "pbewithSHAAnd40BitRC2-CBC");
  st("1.2.840.113549.2.7", "hmacWithSHA1");
  st("1.2.840.113549.2.8", "hmacWithSHA224");
  st("1.2.840.113549.2.9", "hmacWithSHA256");
  st("1.2.840.113549.2.10", "hmacWithSHA384");
  st("1.2.840.113549.2.11", "hmacWithSHA512");
  st("1.2.840.113549.3.7", "des-EDE3-CBC");
  st("2.16.840.1.101.3.4.1.2", "aes128-CBC");
  st("2.16.840.1.101.3.4.1.22", "aes192-CBC");
  st("2.16.840.1.101.3.4.1.42", "aes256-CBC");
  st("2.5.4.3", "commonName");
  st("2.5.4.4", "surname");
  st("2.5.4.5", "serialNumber");
  st("2.5.4.6", "countryName");
  st("2.5.4.7", "localityName");
  st("2.5.4.8", "stateOrProvinceName");
  st("2.5.4.9", "streetAddress");
  st("2.5.4.10", "organizationName");
  st("2.5.4.11", "organizationalUnitName");
  st("2.5.4.12", "title");
  st("2.5.4.13", "description");
  st("2.5.4.15", "businessCategory");
  st("2.5.4.17", "postalCode");
  st("2.5.4.42", "givenName");
  st("2.5.4.65", "pseudonym");
  st("1.3.6.1.4.1.311.60.2.1.2", "jurisdictionOfIncorporationStateOrProvinceName");
  st("1.3.6.1.4.1.311.60.2.1.3", "jurisdictionOfIncorporationCountryName");
  st("2.16.840.1.113730.1.1", "nsCertType");
  st("2.16.840.1.113730.1.13", "nsComment");
  ir("2.5.29.1", "authorityKeyIdentifier");
  ir("2.5.29.2", "keyAttributes");
  ir("2.5.29.3", "certificatePolicies");
  ir("2.5.29.4", "keyUsageRestriction");
  ir("2.5.29.5", "policyMapping");
  ir("2.5.29.6", "subtreesConstraint");
  ir("2.5.29.7", "subjectAltName");
  ir("2.5.29.8", "issuerAltName");
  ir("2.5.29.9", "subjectDirectoryAttributes");
  ir("2.5.29.10", "basicConstraints");
  ir("2.5.29.11", "nameConstraints");
  ir("2.5.29.12", "policyConstraints");
  ir("2.5.29.13", "basicConstraints");
  st("2.5.29.14", "subjectKeyIdentifier");
  st("2.5.29.15", "keyUsage");
  ir("2.5.29.16", "privateKeyUsagePeriod");
  st("2.5.29.17", "subjectAltName");
  st("2.5.29.18", "issuerAltName");
  st("2.5.29.19", "basicConstraints");
  ir("2.5.29.20", "cRLNumber");
  ir("2.5.29.21", "cRLReason");
  ir("2.5.29.22", "expirationDate");
  ir("2.5.29.23", "instructionCode");
  ir("2.5.29.24", "invalidityDate");
  ir("2.5.29.25", "cRLDistributionPoints");
  ir("2.5.29.26", "issuingDistributionPoint");
  ir("2.5.29.27", "deltaCRLIndicator");
  ir("2.5.29.28", "issuingDistributionPoint");
  ir("2.5.29.29", "certificateIssuer");
  ir("2.5.29.30", "nameConstraints");
  st("2.5.29.31", "cRLDistributionPoints");
  st("2.5.29.32", "certificatePolicies");
  ir("2.5.29.33", "policyMappings");
  ir("2.5.29.34", "policyConstraints");
  st("2.5.29.35", "authorityKeyIdentifier");
  ir("2.5.29.36", "policyConstraints");
  st("2.5.29.37", "extKeyUsage");
  ir("2.5.29.46", "freshestCRL");
  ir("2.5.29.54", "inhibitAnyPolicy");
  st("1.3.6.1.4.1.11129.2.4.2", "timestampList");
  st("1.3.6.1.5.5.7.1.1", "authorityInfoAccess");
  st("1.3.6.1.5.5.7.3.1", "serverAuth");
  st("1.3.6.1.5.5.7.3.2", "clientAuth");
  st("1.3.6.1.5.5.7.3.3", "codeSigning");
  st("1.3.6.1.5.5.7.3.4", "emailProtection");
  st("1.3.6.1.5.5.7.3.8", "timeStamping");
});

export { Ja };
