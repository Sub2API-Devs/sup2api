class $l0 {
  #e = void 0;
  #t = null;
  #n = void 0;
  #o = false;
  #r = null;
  #s = void 0;
  #i = void 0;
  #d = /* @__PURE__ */ new Set();
  #u = /* @__PURE__ */ new Map();
  #l = void 0;
  #c = null;
  #p = /* @__PURE__ */ new Set();
  #a = null;
  #h = 0;
  #g = null;
  #m = false;
  #y = () => false;
  #S = null;
  #f = void 0;
  #v = null;
  #b = null;
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
  oauthOrgFromBgSnapshot() {
    return this.#r;
  }
  replaceOauthOrgFromBgSnapshot($l5) {
    this.#r = $l5;
  }
  oauthScopesFromFd() {
    return this.#s;
  }
  replaceOauthScopesFromFd($l6) {
    this.#s = $l6;
  }
  apiKeyFromFd() {
    return this.#i;
  }
  replaceApiKeyFromFd($l7) {
    this.#i = $l7;
  }
  descriptorAnnouncementConsumed($l8) {
    return this.#d.has($l8);
  }
  markDescriptorAnnouncementConsumed($l9) {
    this.#d.add($l9);
  }
  credentialRoad($l10) {
    return this.#u.get($l10);
  }
  noteCredentialRoad($l11, $l12, $l13) {
    if ($l13 !== null && !this.#u.has($l11)) this.#u.set($l11, $l12);
  }
  gatewayTokenFromDescriptor() {
    return this.#l;
  }
  replaceGatewayTokenFromDescriptor($l14) {
    this.#l = $l14;
  }
  resetFdCredentialState() {
    this.#e = void 0, this.#n = void 0, this.#o = false, this.#r = null, this.#s = void 0, this.#i = void 0;
  }
  gatewayAuth() {
    return this.#c;
  }
  replaceGatewayAuth($l15) {
    this.#c = $l15;
  }
  isGatewayHostHeldStrict($l16) {
    return this.#p.has($l16);
  }
  holdGatewayHostStrict($l17) {
    this.#p.add($l17);
  }
  releaseGatewayHost($l18) {
    this.#p.delete($l18);
  }
  gatewayServerProcess() {
    return this.#m;
  }
  replaceGatewayServerProcess($l19) {
    this.#m = $l19;
  }
  gatewayRequiredByHostPolicy() {
    return this.#y();
  }
  replaceGatewayRequiredByHostPolicyReader($l20) {
    this.#y = $l20;
  }
  authenticatedAccount() {
    return this.#a;
  }
  authenticatedAccountEpoch() {
    return this.#h;
  }
  stampAuthenticatedAccount($l21) {
    let $l22 = this.#a;
    if ($l21 !== null && $l22 !== null && $l21.accountUuid === $l22.accountUuid && $l21.emailAddress === $l22.emailAddress && $l21.organizationUuid === $l22.organizationUuid) return;
    this.#h += 1, this.#a = $l21, this.#g = null;
  }
  bearerPlan() {
    return this.#g;
  }
  replaceBearerPlan($l23) {
    this.#g = $l23;
  }
  startupPolicySnapshot() {
    return this.#f;
  }
  replaceStartupPolicySnapshot($l24) {
    this.#f = $l24;
  }
  gatewayRefreshInFlight() {
    return this.#S;
  }
  replaceGatewayRefreshInFlight($l25) {
    this.#S = $l25;
  }
  sdkOAuthTokenRefreshCallback() {
    return this.#v;
  }
  replaceSdkOAuthTokenRefreshCallback($l26) {
    this.#v = $l26;
  }
  hostAuthTokenRefreshCallback() {
    return this.#b;
  }
  replaceHostAuthTokenRefreshCallback($l27) {
    this.#b = $l27;
  }
  resetForTests() {
    this.#e = null, this.#t = null, this.#n = null, this.#o = false, this.#s = void 0, this.#i = null, this.#d.clear(), this.#u.clear(), this.#l = void 0, this.#c = null, this.#p.clear(), this.#a = null, this.#h = 0, this.#g = null, this.#m = false, this.#y = () => false, this.#S = null, this.#f = void 0, this.#v = null, this.#b = null;
  }
}
;
