package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	resourcecontract "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// ResourceTransport keeps account discovery and credentials inside the host
// transport. Provider identity is verified by the authenticated Worker.
func (s *Service) ResourceTransport() core.ProviderResourceTransport {
	return resourceTransport{s: s}
}

type resourceTransport struct{ s *Service }

func validResourceIdentity(principal, generation string) bool {
	return principal != "" && generation != "" && len(principal) <= 256 && len(generation) <= 256 && !strings.ContainsAny(principal+generation, "\r\n\x00")
}

func (t resourceTransport) Identity(ctx context.Context, accountID int64) (core.ResourceBinding, error) {
	if accountID <= 0 {
		return core.ResourceBinding{}, core.ErrInvalidArgument
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://ccgateway.internal"+resourcecontract.IdentityPath, nil)
	resp, err := (modelTransport{s: t.s, accountID: accountID}).forwardManaged(req, resourcecontract.IdentityPath, true)
	if err != nil {
		return core.ResourceBinding{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		missing := verifiedMissingResourceIssuer(resp) // One bounded read; never log its contents.
		if missing {
			return core.ResourceBinding{}, verificationHTTPError("identity", resp, "issuer_unsupported", core.ErrUnsupported.WithMessage("account has no managed resource issuer"))
		}
		return core.ResourceBinding{}, verificationHTTPError("identity", resp, "", core.ErrUnavailable.WithMessage("account does not provide a verified resource issuer"))
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8193))
	var identity resourcecontract.Identity
	if err != nil || len(raw) > 8192 || json.Unmarshal(raw, &identity) != nil || !validResourceIdentity(identity.PrincipalID, identity.Generation) {
		return core.ResourceBinding{}, verificationHTTPError("identity", resp, "invalid_document", errors.New("invalid Worker resource identity response"))
	}
	return core.ResourceBinding{AccountID: accountID, PrincipalID: identity.PrincipalID, Generation: identity.Generation}, nil
}

func verifiedMissingResourceIssuer(resp *http.Response) bool {
	if resp.StatusCode != http.StatusServiceUnavailable {
		return false
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8193))
	if err != nil || len(raw) > 8192 {
		return false
	}
	var body struct {
		Type  string `json:"type"`
		Error struct {
			Type string `json:"type"`
		} `json:"error"`
	}
	return json.Unmarshal(raw, &body) == nil && body.Type == "error" && body.Error.Type == resourcecontract.IdentityUnsupportedErrorType
}

func (t resourceTransport) RoundTrip(accountID int64, expected core.ResourceBinding, req *http.Request) (*http.Response, error) {
	if err := validateResourceRequest(accountID, expected, req); err != nil {
		return nil, err
	}
	clone := req.Clone(req.Context())
	clone.Header = resourceRequestHeaders(req.Header)
	clone.Header.Set(resourcecontract.PrincipalHeader, expected.PrincipalID)
	clone.Header.Set(resourcecontract.GenerationHeader, expected.Generation)
	resp, err := (modelTransport{s: t.s, accountID: accountID}).forwardManaged(clone, resourcecontract.InternalPrefix+req.URL.Path, true)
	if err != nil {
		return nil, err
	}
	if resp.Header.Get(resourcecontract.PrincipalHeader) != expected.PrincipalID || resp.Header.Get(resourcecontract.GenerationHeader) != expected.Generation {
		resp.Body.Close()
		return nil, core.ErrConflict.WithMessage("resource response issuer could not be verified")
	}
	return resp, nil
}

func validateResourceRequest(accountID int64, expected core.ResourceBinding, req *http.Request) error {
	if req == nil || req.URL == nil || accountID <= 0 || expected.AccountID != accountID || !validResourceIdentity(expected.PrincipalID, expected.Generation) {
		return core.ErrInvalidArgument
	}
	u := req.URL
	if u.User != nil || u.Fragment != "" || u.Opaque != "" || u.RawPath != "" || u.Host != "" && u.Host != "ccgateway.internal" || u.Scheme != "" && u.Scheme != "https" {
		return core.ErrInvalidArgument.WithMessage("invalid provider resource destination")
	}
	if _, err := resourcecontract.ValidateOperation(resourcecontract.Operation{Method: req.Method, Path: u.Path, RawQuery: u.RawQuery}); err != nil {
		return core.ErrInvalidArgument.WithMessage("unsupported provider resource operation")
	}
	return nil
}

func resourceRequestHeaders(source http.Header) http.Header {
	out := http.Header{}
	for _, name := range []string{"Content-Type", "Anthropic-Version", "Anthropic-Beta"} {
		for _, value := range source.Values(name) {
			if !strings.ContainsAny(value, "\r\n\x00") {
				out.Add(name, value)
			}
		}
	}
	return out
}
