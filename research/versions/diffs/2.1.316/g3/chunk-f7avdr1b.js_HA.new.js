class $l0 {
  value = void 0;
  promise = null;
  lastCredentialsMtimeMs = 0;
  lastCredentialsVersion = void 0;
  lastKeychainAccessToken = null;
  lastUnusableTokenRecheckAt = 0;
  lastOwnSavedAccessToken = null;
  loginSwitch = null;
  loginSwitchStopOn = false;
  credentialsChangedOnDisk = $m_Me();
  pending401Handlers = /* @__PURE__ */ new Map();
  pendingRefreshChecks = { bare: null, store: null, backend: null };
  pendingOptedInRefreshChecks = { bare: null, store: null, backend: null };
  clear() {
    this.value = void 0, this.promise = null;
  }
  resetChangeCheck() {
    this.lastCredentialsMtimeMs = 0, this.lastCredentialsVersion = void 0, this.lastKeychainAccessToken = null, this.lastUnusableTokenRecheckAt = 0, this.lastOwnSavedAccessToken = null, this.loginSwitch = null, this.loginSwitchStopOn = false;
  }
}
;
