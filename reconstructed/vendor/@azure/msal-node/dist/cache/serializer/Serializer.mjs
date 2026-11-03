/**
 * @azure/msal-node/dist/cache/serializer/Serializer.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:88382-90381 esm-fingerprint
class Jr {
  static serializeJSONBlob(e) {
    return JSON.stringify(e);
  }
  static serializeAccounts(e) {
    let t = {};
    return (
      Object.keys(e).map(function (r) {
        let n = e[r];
        t[r] = {
          home_account_id: n.homeAccountId,
          environment: n.environment,
          realm: n.realm,
          local_account_id: n.localAccountId,
          username: n.username,
          authority_type: n.authorityType,
          name: n.name,
          client_info: n.clientInfo,
          last_modification_time: n.lastModificationTime,
          last_modification_app: n.lastModificationApp,
          tenantProfiles: n.tenantProfiles?.map((o) => JSON.stringify(o)),
        };
      }),
      t
    );
  }
  static serializeIdTokens(e) {
    let t = {};
    return (
      Object.keys(e).map(function (r) {
        let n = e[r];
        t[r] = {
          home_account_id: n.homeAccountId,
          environment: n.environment,
          credential_type: n.credentialType,
          client_id: n.clientId,
          secret: n.secret,
          realm: n.realm,
        };
      }),
      t
    );
  }
  static serializeAccessTokens(e) {
    let t = {};
    return (
      Object.keys(e).map(function (r) {
        let n = e[r];
        t[r] = {
          home_account_id: n.homeAccountId,
          environment: n.environment,
          credential_type: n.credentialType,
          client_id: n.clientId,
          secret: n.secret,
          realm: n.realm,
          target: n.target,
          cached_at: n.cachedAt,
          expires_on: n.expiresOn,
          extended_expires_on: n.extendedExpiresOn,
          refresh_on: n.refreshOn,
          key_id: n.keyId,
          token_type: n.tokenType,
          requestedClaims: n.requestedClaims,
          requestedClaimsHash: n.requestedClaimsHash,
          userAssertionHash: n.userAssertionHash,
        };
      }),
      t
    );
  }
  static serializeRefreshTokens(e) {
    let t = {};
    return (
      Object.keys(e).map(function (r) {
        let n = e[r];
        t[r] = {
          home_account_id: n.homeAccountId,
          environment: n.environment,
          credential_type: n.credentialType,
          client_id: n.clientId,
          secret: n.secret,
          family_id: n.familyId,
          target: n.target,
          realm: n.realm,
        };
      }),
      t
    );
  }
  static serializeAppMetadata(e) {
    let t = {};
    return (
      Object.keys(e).map(function (r) {
        let n = e[r];
        t[r] = { client_id: n.clientId, environment: n.environment, family_id: n.familyId };
      }),
      t
    );
  }
  static serializeAllCache(e) {
    return {
      Account: this.serializeAccounts(e.accounts),
      IdToken: this.serializeIdTokens(e.idTokens),
      AccessToken: this.serializeAccessTokens(e.accessTokens),
      RefreshToken: this.serializeRefreshTokens(e.refreshTokens),
      AppMetadata: this.serializeAppMetadata(e.appMetadata),
    };
  }
}

export { Jr };
