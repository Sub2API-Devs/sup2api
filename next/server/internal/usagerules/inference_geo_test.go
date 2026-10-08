package usagerules

import (
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"testing"
)

func TestInferenceGeoResponseFact(t *testing.T) {
	var rules manifest.UsageRules
	for _, p := range platforms.Builtin() {
		if p.ID == "anthropic" {
			rules = p.Usage
		}
	}
	for _, raw := range []string{`"not_available"`, `"future-region-7"`, `""`, `null`, `17`, `true`, `{}`, `[]`} {
		for _, stream := range []string{"json", "message_start", "message_delta"} {
			t.Run(fmt.Sprintf("%s/%v", raw, stream), func(t *testing.T) {
				u := New(rules)
				body := []byte(`{"usage":{"input_tokens":2,"output_tokens":1,"inference_geo":` + raw + `}}`)
				if stream == "message_start" {
					u.ApplySSE("message_start", []byte(`{"type":"message_start","message":`+string(body)+`}`))
				} else if stream == "message_delta" {
					u.ApplySSE("message_delta", body)
				} else {
					u.ApplyJSON(body)
				}
				wantString := raw[0] == '"'
				got, exists := u.Metrics["inference_geo"]
				if exists != wantString {
					t.Fatalf("metrics=%#v wantString=%v", u.Metrics, wantString)
				}
				facts := extractAttemptFacts(rules.Facts, body)
				if !wantString {
					if _, ok := facts["inference_geo"]; ok {
						t.Fatal(facts)
					}
					return
				}
				want := raw[1 : len(raw)-1]
				if got != want || facts["inference_geo"] != want {
					t.Fatalf("got=%v facts=%v", got, facts)
				}
				p, err := expr.Compile(`u("inference_geo") == ` + raw + ` ? 7 : 99`)
				if err != nil {
					t.Fatal(err)
				}
				r, err := p.Eval(expr.Input{Metrics: u.Metrics})
				if err != nil || r.Cost.String() != "0.000007" {
					t.Fatalf("price=%+v err=%v", r, err)
				}
				v, ok := Fact(rules.Facts["inference_geo"], want)
				if !ok || v != want {
					t.Fatalf("plugin=%v %v", v, ok)
				}
			})
		}
	}
}
