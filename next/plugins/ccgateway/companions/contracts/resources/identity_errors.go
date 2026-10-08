package resources

// IdentityUnsupportedErrorType is returned only after the Worker has verified
// an API-key auth mode lacking the administrator's stable issuer configuration.
// Transport, profile, credential, and persistence failures must not use it.
const IdentityUnsupportedErrorType = "resource_identity_unsupported"
