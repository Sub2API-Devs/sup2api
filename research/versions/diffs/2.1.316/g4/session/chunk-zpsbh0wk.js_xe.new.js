class $l0 {
  #e = void 0;
  #t = null;
  #n = void 0;
  #o = false;
  #r = null;
  #s = null;
  #i = void 0;
  #d = void 0;
  #u = /* @__PURE__ */ new Set();
  #c = /* @__PURE__ */ new Map();
  #l = void 0;
  #p = null;
  #h = /* @__PURE__ */ new Set();
  #a = null;
  #g = 0;
  #S = null;
  #y = false;
  #v = () => false;
  #f = null;
  #m = void 0;
  #b = null;
  #k = null;
  sessionIngressToken() {
    return this.#e;
  }
  replaceSessionIngressToken($l1) {
    this.#e = $l1;
  }
  inferenceRequestToken() {
    return this.#t;
  }
  replaceInferenceRequestToken($l2) {
    this.#t = $l2;
  }
  oauthTokenFromFd() {
    return this.#n;
  }
  replaceOauthTokenFromFd($l3) {
    this.#n = $l3;
  }
  oauthTokenFromBgSnapshot() {
    return this.#o;
  }
  replaceOauthTokenFromBgSnapshot($l4) {
    this.#o = $l4;
  }
  loginStashedInTokenSlot() {
    return this.#r;
  }
  replaceLoginStashedInTokenSlot($l5) {
    this.#r = $l5;
  }
  oauthOrgFromBgSnapshot() {
    return this.#s;
  }
  replaceOauthOrgFromBgSnapshot($l6) {
    this.#s = $l6;
  }
  oauthScopesFromFd() {
    return this.#i;
  }
  replaceOauthScopesFromFd($l7) {
    this.#i = $l7;
  }
  apiKeyFromFd() {
    return this.#d;
  }
  replaceApiKeyFromFd($l8) {
    this.#d = $l8;
  }
  descriptorAnnouncementConsumed($l9) {
    return this.#u.has($l9);
  }
  markDescriptorAnnouncementConsumed($l10) {
    this.#u.add($l10);
  }
  credentialRoad($l11) {
    return this.#c.get($l11);
  }
  noteCredentialRoad($l12, $l13, $l14) {
    if ($l14 !== null && !this.#c.has($l12)) this.#c.set($l12, $l13);
  }
  gatewayTokenFromDescriptor() {
    return this.#l;
  }
  replaceGatewayTokenFromDescriptor($l15) {
    this.#l = $l15;
  }
  resetFdCredentialState() {
    this.#e = void 0, this.#n = void 0, this.#o = false, this.#r = null, this.#s = null, this.#i = void 0, this.#d = void 0;
  }
  gatewayAuth() {
    return this.#p;
  }
  replaceGatewayAuth($l16) {
    this.#p = $l16;
  }
  isGatewayHostHeldStrict($l17) {
    return this.#h.has($l17);
  }
  holdGatewayHostStrict($l18) {
    this.#h.add($l18);
  }
  releaseGatewayHost($l19) {
    this.#h.delete($l19);
  }
  gatewayServerProcess() {
    return this.#y;
  }
  replaceGatewayServerProcess($l20) {
    this.#y = $l20;
  }
  gatewayRequiredByHostPolicy() {
    return this.#v();
  }
  replaceGatewayRequiredByHostPolicyReader($l21) {
    this.#v = $l21;
  }
  authenticatedAccount() {
    return this.#a;
  }
  authenticatedAccountEpoch() {
    return this.#g;
  }
  stampAuthenticatedAccount($l22) {
    let $l23 = this.#a;
    if ($l22 !== null && $l23 !== null && $l22.accountUuid === $l23.accountUuid && $l22.emailAddress === $l23.emailAddress && $l22.organizationUuid === $l23.organizationUuid) return;
    this.#g += 1, this.#a = $l22, this.#S = null;
  }
  bearerPlan() {
    return this.#S;
  }
  replaceBearerPlan($l24) {
    this.#S = $l24;
  }
  startupPolicySnapshot() {
    return this.#m;
  }
  replaceStartupPolicySnapshot($l25) {
    this.#m = $l25;
  }
  gatewayRefreshInFlight() {
    return this.#f;
  }
  replaceGatewayRefreshInFlight($l26) {
    this.#f = $l26;
  }
  sdkOAuthTokenRefreshCallback() {
    return this.#b;
  }
  replaceSdkOAuthTokenRefreshCallback($l27) {
    this.#b = $l27;
  }
  hostAuthTokenRefreshCallback() {
    return this.#k;
  }
  replaceHostAuthTokenRefreshCallback($l28) {
    this.#k = $l28;
  }
  resetForTests() {
    this.#e = null, this.#t = null, this.#n = null, this.#o = false, this.#r = null, this.#i = void 0, this.#d = null, this.#u.clear(), this.#c.clear(), this.#l = void 0, this.#p = null, this.#h.clear(), this.#a = null, this.#g = 0, this.#S = null, this.#y = false, this.#v = () => false, this.#f = null, this.#m = void 0, this.#b = null, this.#k = null;
  }
}
;
