package engine

import (
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"io"
	"net/http"
)

// Planning only: no diagnostic logger, resource admission, native session,
// issuer lookup or provider request is created on this path.
func (g *Gateway) serveHelperRequirement(w http.ResponseWriter, r *http.Request) bool {
	if r.URL.Path != helperhistory.RequirementPath {
		return false
	}
	if g.Key == "" || !g.authorized(r) {
		apiError(w, http.StatusUnauthorized, "authentication_error", "Invalid Worker credential")
		return true
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return true
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
	if err != nil {
		apiError(w, http.StatusRequestEntityTooLarge, "request_too_large", "Request exceeds 32 MiB")
		return true
	}
	_, err = parsePolicyRequest(raw, r.Header)
	decision := helperhistory.RequirementOrdinary
	var required *helperCustodyRequiredError
	if errors.As(err, &required) {
		decision = helperhistory.RequirementNeedsCustody
	} else if err != nil {
		decision = helperhistory.RequirementDeferToOrdinary
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(helperhistory.RequirementResponse{Version: helperhistory.Version, Decision: decision})
	return true
}
