package usage

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestReconcilePreservesVideoSubmissionFacts(t *testing.T) {
	gen := reconcileGen(nil).(*recGen)
	gen.pf.Usage.Facts = map[string]manifest.UsageFact{
		"video_input": {Type: "boolean"}, "video_estimated": {Type: "boolean"}, "video_seconds": {Type: "number"},
	}
	s := &Service{rec: &reconciler{}}
	s.rec.Registry = recRegistry{gen: gen}
	s.rec.log = slog.New(slog.NewTextHandler(io.Discard, nil))
	p := &pending{UpstreamProtocol: "vid.gen", Metrics: map[string]any{"video_input": true, "video_estimated": true, "video_seconds": 5.0}}
	m := s.reconciledFacts(context.Background(), &settleEntry{}, p, map[string]string{"video_estimated": "false", "video_seconds": "4"})
	if m["video_input"] != true || m["video_estimated"] != false || m["video_seconds"] != float64(4) {
		t.Fatalf("facts: %v", m)
	}
	if p.Metrics["video_estimated"] != true {
		t.Fatal("mutated reservation")
	}
}
