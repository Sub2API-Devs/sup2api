package billing

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

func TestVideoConfigOverridesStaleExpression(t *testing.T) {
	cfg := json.RawMessage(`{"video":{"price_per_million_tokens":7}}`)
	src, err := expressionFor("expression", cfg, `flat(0)`)
	if err != nil || !strings.Contains(src, "7") || src == "flat(0)" {
		t.Fatalf("%s %v", src, err)
	}
	p := &syncPrice{Mode: "expression", Config: cfg}
	if err := scalePrice(p, decimal.NewFromInt(2)); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(p.Config), "video") || !strings.Contains(string(p.Config), "14") {
		t.Fatalf("lost video config: %s", p.Config)
	}
}

func TestVideoPriceAPIRoundTrip(t *testing.T) {
	e := newEnv(t)
	admin := e.user("video-admin@example.com")
	cfg := map[string]any{"video": map[string]any{"price_per_million_tokens": 7, "video_input_price_per_million_tokens": 4.3, "video_price_per_second": 0.2}}
	created := data(e.mustCall(admin, 201, "POST", "/prices", map[string]any{"model": "seedance-video", "mode": "expression", "config": cfg, "expression": "flat(0)", "confirm": true}))
	r, err := e.svc.Resolve(context.Background(), "seedance-video")
	if err != nil || r == nil || !r.VideoOnly || r.Expression == "flat(0)" {
		t.Fatalf("rule %+v %v", r, err)
	}
	id := int64(created["id"].(float64))
	out := data(e.mustCall(admin, 200, "POST", "/prices/preview", map[string]any{"price_id": id, "usage": map[string]any{"c": 100000}, "metrics": map[string]any{"video_input": true, "video_estimated": false}}))
	if str(out["cost"]) != "0.43" {
		t.Fatalf("preview: %v", out)
	}
}
