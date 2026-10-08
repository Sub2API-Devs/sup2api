package gateway

import (
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

type failedPreparedReview struct {
	requestBoundConverter
	calls *int
	err   error
}

func (c failedPreparedReview) Prepare([]byte) (convert.Converter, []byte, error) {
	*c.calls++
	return nil, nil, c.err
}

func TestPreparedReviewRouteRetainsFailureWithoutRebinding(t *testing.T) {
	count := 0
	rejection := errors.New("unsupported semantic field")
	route := typeRoute{conv: failedPreparedReview{calls: &count, err: rejection}}
	for _, body := range []string{"first", "retry"} {
		out, err := route.upstreamBody([]byte(body))
		if out != nil || !errors.Is(err, rejection) {
			t.Fatal("failed route returned a body or lost failure")
		}
	}
	if count != 1 {
		t.Fatalf("failed request prepared %d times", count)
	}
	if !errors.Is(route.bodyErr, rejection) {
		t.Fatal("scheduler cannot exclude failed route")
	}
}
