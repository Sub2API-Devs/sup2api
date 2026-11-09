package manifest

import (
	"encoding/json"
	"testing"
)

func TestSameControlValue(t *testing.T) {
	five := 5
	for _, tc := range []struct {
		a, b any
		same bool
	}{
		{&five, json.RawMessage(`5`), true},
		{int64(1_000_000_000_000), json.RawMessage(`1e12`), true},
		{json.RawMessage(`{"t": 0.50, "a": [1]}`), json.RawMessage(`{"a":[1],"t":5e-1}`), true},
		{[]string{}, nil, true},
		{map[string]string{}, json.RawMessage(`null`), true},
		{json.RawMessage(nil), json.RawMessage(`{}`), true},
		{[]string{"a"}, []string{"b"}, false},
		{true, json.RawMessage(`false`), false},
		{0, json.RawMessage(`null`), false},
	} {
		if got := SameControlValue(tc.a, tc.b); got != tc.same {
			t.Errorf("SameControlValue(%v, %v) = %v", tc.a, tc.b, got)
		}
	}
}

func TestAccountCommonControl(t *testing.T) {
	off := false
	for _, tc := range []struct {
		c                           AccountCommonControl
		visible, fixed, has, defval bool
	}{
		{AccountCommonControl{}, true, false, false, true},
		{AccountCommonControl{Default: json.RawMessage(`null`)}, true, false, false, true},
		{AccountCommonControl{Configurable: &off, Default: json.RawMessage(`false`)}, true, true, true, false},
		{AccountCommonControl{Visible: &off, Locked: true, Default: json.RawMessage(`true`)}, false, true, true, true},
	} {
		if tc.c.IsVisible() != tc.visible || tc.c.Fixed() != tc.fixed || tc.c.HasDefault() != tc.has || tc.c.DefaultValue() != tc.defval {
			t.Errorf("%+v: visible %v fixed %v default %v/%v", tc.c, tc.c.IsVisible(), tc.c.Fixed(), tc.c.HasDefault(), tc.c.DefaultValue())
		}
	}
	// The JSON of an existing manifest keeps reading the same.
	var c AccountCommonControl
	if err := json.Unmarshal([]byte(`{"configurable": true, "default": true}`), &c); err != nil || !c.IsConfigurable() || !c.DefaultValue() {
		t.Fatalf("legacy declaration: %+v %v", c, err)
	}
}

func TestControlDefaults(t *testing.T) {
	p, tpm := 3, int64(9)
	d := &AccountDefaultLimits{Priority: &p, TPMLimit: &tpm, ModelLimits: []DefaultModelLimit{{Models: []string{"m-1"}, RPMLimit: 2}}}
	got := d.ControlDefaults()
	if len(got) != 3 || !SameControlValue(got["priority"], 3) || !SameControlValue(got["tpm_limit"], 9) ||
		!SameControlValue(got["model_limits"], json.RawMessage(`[{"models":["m-1"],"max_concurrency":0,"rpm_limit":2,"tpm_limit":0,"spm_limit":0}]`)) {
		t.Fatalf("ControlDefaults = %v", got)
	}
	if len((*AccountDefaultLimits)(nil).ControlDefaults()) != 0 {
		t.Fatal("nil limits have no defaults")
	}
}
