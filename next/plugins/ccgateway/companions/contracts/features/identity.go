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
// without metadata instead of being given an identity.
type RequestIdentitySources map[string]string

func (p RequestIdentitySources) Validate() error {
	for field, source := range p {
		if field != "user_id" || (source != "client" && source != "worker" && source != "replace") {
			return fmt.Errorf("invalid request_identity_sources: %s=%s", field, source)
		}
	}
	return nil
}

// Mode is the effective source: the configured one, or the default replace.
func (p RequestIdentitySources) Mode() string {
	if source := p["user_id"]; source == "client" || source == "worker" {
		return source
	}
	return "replace"
}

// UsesWorker reports whether the Worker rewrites the client's value at all.
func (p RequestIdentitySources) UsesWorker() bool { return p.Mode() != "client" }
