package features

import "fmt"

// RequestIdentityFields is the configurable vocabulary of the identity source.
// The console exposes one row per field; omitted fields inherit.
var RequestIdentityFields = []string{"user_id"}

// RequestIdentitySources selects where metadata.user_id comes from:
//
//	client  - the client's own value, forwarded unchanged
//	worker  - the Worker CLI's own identity (device, account, native session)
//	replace - the client's value, mapped one-way with the account key (default)
//
// A client that sends no user_id never gets one: the request is forwarded
// without metadata instead of being given an identity. An API-key account has
// no Claude account to map for, so replace forwards the client's value there.
type RequestIdentitySources map[string]string

func (p RequestIdentitySources) Validate() error {
	for field, source := range p {
		if field != "user_id" || (source != "client" && source != "worker" && source != "replace") {
			return fmt.Errorf("invalid request_identity_sources: %s=%s", field, source)
		}
	}
	return nil
}

// RequestIdentityDefault applies when no layer configures the source. It is
// also the wire default: the host omits it, so a Worker whose CLI cannot map
// identities keeps forwarding the client's value instead of refusing requests.
const RequestIdentityDefault = "replace"

// Mode is the effective source: the configured one, or the default.
func (p RequestIdentitySources) Mode() string {
	if source := p["user_id"]; source == "client" || source == "worker" {
		return source
	}
	return RequestIdentityDefault
}

// Explicit reports whether the policy names a source that only a CLI with
// RequestIdentityCapability can honour; such a request is refused rather than
// silently forwarded with the client's identity.
func (p RequestIdentitySources) Explicit() bool {
	source := p["user_id"]
	return source != "" && source != "client"
}
