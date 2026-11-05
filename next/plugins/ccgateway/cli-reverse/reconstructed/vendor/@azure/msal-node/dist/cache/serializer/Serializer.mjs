/**
 * @azure/msal-node/dist/cache/serializer/Serializer.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:88382-90381 esm-fingerprint
class Serializer {
  static serializeJSONBlob(data) {
    return JSON.stringify(data);
  }
  static serializeAccounts(accCache) {
    let accounts = {};
    Object.keys(accCache).map(function (key) {
      let accountEntity = accCache[key];
      accounts[key] = {
        home_account_id: accountEntity.homeAccountId,
        environment: accountEntity.environment,
        realm: accountEntity.realm,
        local_account_id: accountEntity.localAccountId,
        username: accountEntity.username,
        authority_type: accountEntity.authorityType,
        name: accountEntity.name,
        client_info: accountEntity.clientInfo,
        last_modification_time: accountEntity.lastModificationTime,
        last_modification_app: accountEntity.lastModificationApp,
        tenantProfiles: accountEntity.tenantProfiles?.map((tenantProfile) => JSON.stringify(tenantProfile)),
      };
    });
    return accounts;
  }
  static serializeIdTokens(idTCache) {
    let idTokens = {};
    Object.keys(idTCache).map(function (key) {
      let idTEntity = idTCache[key];
      idTokens[key] = {
        home_account_id: idTEntity.homeAccountId,
        environment: idTEntity.environment,
        credential_type: idTEntity.credentialType,
        client_id: idTEntity.clientId,
        secret: idTEntity.secret,
        realm: idTEntity.realm,
      };
    });
    return idTokens;
  }
  static serializeAccessTokens(atCache) {
    let accessTokens = {};
    Object.keys(atCache).map(function (key) {
      let atEntity = atCache[key];
      accessTokens[key] = {
        home_account_id: atEntity.homeAccountId,
        environment: atEntity.environment,
        credential_type: atEntity.credentialType,
        client_id: atEntity.clientId,
        secret: atEntity.secret,
        realm: atEntity.realm,
        target: atEntity.target,
        cached_at: atEntity.cachedAt,
        expires_on: atEntity.expiresOn,
        extended_expires_on: atEntity.extendedExpiresOn,
        refresh_on: atEntity.refreshOn,
        key_id: atEntity.keyId,
        token_type: atEntity.tokenType,
        requestedClaims: atEntity.requestedClaims,
        requestedClaimsHash: atEntity.requestedClaimsHash,
        userAssertionHash: atEntity.userAssertionHash,
      };
    });
    return accessTokens;
  }
  static serializeRefreshTokens(rtCache) {
    let refreshTokens = {};
    Object.keys(rtCache).map(function (key) {
      let rtEntity = rtCache[key];
      refreshTokens[key] = {
        home_account_id: rtEntity.homeAccountId,
        environment: rtEntity.environment,
        credential_type: rtEntity.credentialType,
        client_id: rtEntity.clientId,
        secret: rtEntity.secret,
        family_id: rtEntity.familyId,
        target: rtEntity.target,
        realm: rtEntity.realm,
      };
    });
    return refreshTokens;
  }
  static serializeAppMetadata(amdtCache) {
    let appMetadata = {};
    Object.keys(amdtCache).map(function (key) {
      let amdtEntity = amdtCache[key];
      appMetadata[key] = {
        client_id: amdtEntity.clientId,
        environment: amdtEntity.environment,
        family_id: amdtEntity.familyId,
      };
    });
    return appMetadata;
  }
  static serializeAllCache(inMemCache) {
    return {
      Account: this.serializeAccounts(inMemCache.accounts),
      IdToken: this.serializeIdTokens(inMemCache.idTokens),
      AccessToken: this.serializeAccessTokens(inMemCache.accessTokens),
      RefreshToken: this.serializeRefreshTokens(inMemCache.refreshTokens),
      AppMetadata: this.serializeAppMetadata(inMemCache.appMetadata),
    };
  }
}
export { Serializer };
