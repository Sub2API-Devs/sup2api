package gateway

import (
	"context"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// admitKey takes a slot of the API key's requests in flight and counts the
// request in the key's minute windows, under the caps its owner set
// (CONTRACTS §60; 0 = unlimited). Every request is counted, capped or not,
// so the key list shows the current rates. release frees the slot; ctx is
// cancelled if the slot is lost.
func (g *Gateway) admitKey(ctx context.Context, p *core.APIKeyPrincipal, rid string) (context.Context, func(), *gwError) {
	l := p.KeyLimits
	ctx, release, ok, err := core.AcquireSlot(ctx, g.d.Slots, core.KeySlots, p.KeyID, l.Concurrency, rid)
	if err != nil {
		return ctx, nil, fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal)
	}
	if !ok {
		return ctx, nil, keyLimited("too many concurrent requests for this API key", 5*time.Second)
	}
	if w := g.d.KeyWindows; w != nil {
		admitted, retry, err := w.Admit(ctx, p.KeyID, l.RPM, l.TPM)
		if err != nil {
			release()
			return ctx, nil, fromCore(core.ErrUnavailable.WithMessage("API key limits unavailable").WithCause(err), errTypeInternal)
		}
		if !admitted {
			release()
			return ctx, nil, keyLimited("this API key reached its requests or tokens per minute", retry)
		}
	}
	return ctx, release, nil
}

func keyLimited(msg string, retry time.Duration) *gwError {
	e := fromCore(core.ErrRateLimited.WithMessage(msg), errTypeRateLimited)
	e.Headers = http.Header{"Retry-After": {itoa(int64(max(retry.Round(time.Second)/time.Second, 1)))}}
	return e
}
