package check

import (
	"reflect"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestUpstreamFields(t *testing.T) {
	f := "accountTypes[0].upstreamFields"
	for _, tc := range []struct {
		fields []string
		want   map[string]string
	}{
		{nil, map[string]string{}},
		{[]string{}, map[string]string{}},
		{[]string{"base_url", "video_endpoint"}, map[string]string{}},
		{[]string{"base_url", " "}, map[string]string{f + "[1]": "required"}},
		{[]string{"base_url", "base_url"}, map[string]string{f + "[1]": "duplicate"}},
	} {
		m := controlsManifest(nil)
		m.AccountTypes[0].UpstreamFields = tc.fields
		if got := controlCodes(m); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%q: codes = %v, want %v", tc.fields, got, tc.want)
		}
	}
}

func TestWarningsUndeclaredAddress(t *testing.T) {
	files := map[string][]byte{"forms/k.json": []byte(`{"type":"object","properties":{"api_key":{},"base_url":{},"asset_endpoint":{}}}`)}
	warn := func(at func(*manifest.AccountType)) []FieldError {
		m := controlsManifest(nil)
		at(&m.AccountTypes[0])
		return Warnings(m, files)
	}
	want := []FieldError{{Field: "accountTypes[0].upstreamFields", Code: "undeclared",
		Message: "form fields asset_endpoint, base_url look like upstream addresses; declare upstreamFields"}}
	if got := warn(func(*manifest.AccountType) {}); !reflect.DeepEqual(got, want) {
		t.Fatalf("undeclared: %v", got)
	}
	for name, at := range map[string]func(*manifest.AccountType){
		"declared":    func(at *manifest.AccountType) { at.UpstreamFields = []string{"base_url"} },
		"derived":     func(at *manifest.AccountType) { at.Upstream = &manifest.Upstream{} },
		"native form": func(at *manifest.AccountType) { at.Form = manifest.Form{Mode: "native"} },
		"no address":  func(at *manifest.AccountType) { at.Form.Schema = "forms/none.json" },
	} {
		if got := warn(at); len(got) != 0 {
			t.Errorf("%s: %v", name, got)
		}
	}
}
