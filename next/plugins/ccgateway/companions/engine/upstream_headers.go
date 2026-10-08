package engine

import (
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"net/http"
)

// Forward provider retry/debug facts, never credentials, cookies, connection
// state or an unrelated auxiliary request's identity.
func mainErrorHeaders(resp *http.Response) http.Header {
	if resp.Request == nil {
		return nil
	}
	ctx := resp.Request.Context()
	main := ctx.Value(apiOutputRequestKey{}) != nil || ctx.Value(tokenCountRequestKey{}) != nil || ctx.Value(warmupRequestKey{}) != nil
	if !main {
		return nil
	}
	return httpfacts.Select(resp.Header)
}
