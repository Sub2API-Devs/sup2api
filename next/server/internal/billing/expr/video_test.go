package expr

import (
	"encoding/json"
	"testing"
)

func TestVideoPriceLifecycle(t *testing.T) {
	cfg := `{"video":{"price_per_million_tokens":7,"video_input_price_per_million_tokens":4.3,"video_price_per_second":0.2,"resolution_prices":[{"sizes":["1920x1080"],"price_per_million_tokens":10}]}}`
	src, err := Generate(ModeExpression, json.RawMessage(cfg))
	if err != nil {
		t.Fatal(err)
	}
	if r := Validate(src, ValidateOptions{}); !r.OK {
		t.Fatalf("validation: %+v", r.Errors)
	}
	p := mustCompile(t, src)
	for _, tc := range []struct {
		name            string
		input, estimate bool
		w, h            float64
		want            string
	}{
		{"reserve", false, true, 1280, 720, "1"},
		{"reserve_video_input", true, true, 1280, 720, "0.6142857142857143"},
		{"actual", false, false, 1280, 720, "0.7"},
		{"actual_video_input", true, false, 1280, 720, "0.43"},
		{"override", false, false, 1920, 1080, "1"},
		{"portrait_override", false, false, 1080, 1920, "1"},
		{"override_inherits_input", true, false, 1920, 1080, "0.43"},
		{"override_inherits_seconds", false, true, 1920, 1080, "2.25"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r, err := p.Eval(Input{Vars: Vars{C: 100000}, Metrics: map[string]any{"video_input": tc.input, "video_estimated": tc.estimate, "video_seconds": 5, "video_width": tc.w, "video_height": tc.h, "video_pixels": tc.w * tc.h}})
			if err != nil {
				t.Fatal(err)
			}
			if r.Cost.Sub(dec(tc.want)).Abs().GreaterThan(dec("0.000000001")) {
				t.Fatalf("cost=%s want=%s", r.Cost, tc.want)
			}
		})
	}
}

func TestVideoPriceRejectsInvalidConfig(t *testing.T) {
	for _, cfg := range []string{
		`{"video":{}}`,
		`{"video":{"price_per_million_tokens":-1}}`,
		`{"video":{"price_per_million_tokens":7,"video_price_per_second":"NaN"}}`,
		`{"video":{"price_per_million_tokens":7,"resolution_prices":[{"sizes":["1920x1080"],"price_per_million_tokens":9},{"sizes":["1080x1920"],"video_price_per_second":1}]}}`,
		`{"video":{"price_per_million_tokens":7,"resolution_prices":[{"sizes":["bad"],"price_per_million_tokens":9}]}}`,
		`{"video":{"price_per_million_tokens":7},"tiers":[{"name":"base"}]}`,
	} {
		if _, err := Generate(ModeExpression, json.RawMessage(cfg)); err == nil {
			t.Fatalf("accepted %s", cfg)
		}
	}
}
