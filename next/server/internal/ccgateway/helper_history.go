package ccgateway

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// HelperHistoryRequirement uses the same account-direct transport and effective
// policy as execution. A legacy 404 is absence of this probe, not admission.
func (s *Service) HelperHistoryRequirement(ctx context.Context, accountID int64, req *http.Request) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	res, err := (modelTransport{s: s, accountID: accountID}).forwardManaged(req.Clone(ctx), wire.RequirementPath, false)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return wire.RequirementDeferToOrdinary, nil
	}
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Worker requirement probe returned status %d", res.StatusCode)
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, 4097))
	if err != nil {
		return "", err
	}
	r, err := wire.DecodeRequirement(raw)
	return r.Decision, err
}

// WorkerCapabilities reads the running account's declaration without creating,
// reconciling or restarting it. A missing schema is not a downgrade permission.
func (s *Service) WorkerCapabilities(ctx context.Context, accountID int64) (features.RuntimeCapabilities, error) {
	var zero features.RuntimeCapabilities
	d, err := s.desired(ctx, accountID, false)
	if err != nil {
		return zero, err
	}
	if !d.Enabled {
		return zero, fmt.Errorf("Worker is unavailable")
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	res, closeConn, err := s.runtimeRequest(ctx, d.Key, http.MethodGet, "admin/features", nil, d.Revision)
	if err != nil {
		return zero, err
	}
	defer closeConn()
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return zero, fmt.Errorf("Worker capabilities unavailable")
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, (128<<10)+1))
	if err != nil || len(raw) > 128<<10 {
		return zero, fmt.Errorf("invalid Worker capabilities response")
	}
	return features.DecodeRuntimeCapabilities(raw)
}
