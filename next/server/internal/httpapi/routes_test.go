package httpapi

import (
	"slices"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// Every registration through the router and its views lands in Routes with
// its mode, keys, step-up scope and access key rule; Uses adds extra keys.
func TestRoutesRecordSpecs(t *testing.T) {
	t.Parallel()
	r := NewRouter(gin.New(), keyTokens{}, fakeAuthz{})
	h := func(*gin.Context) {}
	r.Public("POST", "/login", h)
	r.AuthedRead("/me", h)
	r.SessionOnly().Handle("DELETE", "/me/sessions/:id", h)
	r.Perm("GET", "/x", "x:read", h).Uses("x:extra").UsesPluginKeys()
	r.PermAny("GET", "/any", h, "x:read", "y:read")
	r.StepUp("x.reveal").PermScoped("POST", "/rows/:id/reveal", h, perm.AccountCredentialView)
	r.Self("PUT", "/me", "self:profile", h)

	want := []RouteSpec{
		{Method: "POST", Path: "/login", Mode: ModePublic},
		{Method: "GET", Path: "/me", Mode: ModeAuthed},
		{Method: "DELETE", Path: "/me/sessions/:id", Mode: ModeAuthed, NoAccessKey: true},
		{Method: "GET", Path: "/x", Mode: ModePerm, Keys: []perm.Key{"x:read"}, Extra: []perm.Key{"x:extra"}, PluginKeys: true},
		{Method: "GET", Path: "/any", Mode: ModeAny, Keys: []perm.Key{"x:read", "y:read"}},
		{Method: "POST", Path: "/rows/:id/reveal", Mode: ModeScoped, Keys: []perm.Key{perm.AccountCredentialView}, StepUp: "x.reveal"},
		{Method: "PUT", Path: "/me", Mode: ModePerm, Keys: []perm.Key{"self:profile"}},
	}
	got := r.Routes()
	if !slices.EqualFunc(got, want, func(a, b RouteSpec) bool {
		return a.ID() == b.ID() && a.Mode == b.Mode && slices.Equal(a.Keys, b.Keys) && slices.Equal(a.Extra, b.Extra) &&
			a.PluginKeys == b.PluginKeys && a.StepUp == b.StepUp && a.NoAccessKey == b.NoAccessKey
	}) {
		t.Fatalf("routes:\n%+v\nwant\n%+v", got, want)
	}
	// Routes returns copies.
	got[3].Extra[0] = "changed"
	if r.Routes()[3].Extra[0] != "x:extra" {
		t.Fatal("Routes shares its slices")
	}
	keys, ok := RouteKeys(got)("GET /any")
	if !ok || strings.Join(keys, ",") != "x:read,y:read" {
		t.Fatalf("RouteKeys = %v, %v", keys, ok)
	}
	if _, ok := RouteKeys(got)("GET /missing"); ok {
		t.Fatal("RouteKeys found a missing route")
	}
}

func TestCheckRoutes(t *testing.T) {
	t.Parallel()
	rules := RouteRules{
		KnownKey:       func(k string) bool { return k == "x:read" || k == "x:extra" },
		KnownStepUp:    func(s string) bool { return s == "x.reveal" },
		Permissionless: map[string]Access{"POST /login": AccessPublic, "GET /me": AccessSession},
	}
	ok := []RouteSpec{
		{Method: "POST", Path: "/login", Mode: ModePublic},
		{Method: "GET", Path: "/me", Mode: ModeAuthed, NoAccessKey: true},
		{Method: "GET", Path: "/x", Mode: ModePerm, Keys: []perm.Key{"x:read"}, Extra: []perm.Key{"x:extra"}, StepUp: "x.reveal"},
	}
	if err := CheckRoutes(ok, rules); err != nil {
		t.Fatal(err)
	}
	for name, tc := range map[string]struct {
		specs []RouteSpec
		want  string
	}{
		"unknown key":   {append(slices.Clone(ok), RouteSpec{Method: "GET", Path: "/y", Mode: ModeScoped, Keys: []perm.Key{"y:read"}}), `route GET /y: unknown permission "y:read"`},
		"unknown extra": {append(slices.Clone(ok), RouteSpec{Method: "GET", Path: "/y", Mode: ModePerm, Keys: []perm.Key{"x:read"}, Extra: []perm.Key{"y:bind"}}), `unknown permission "y:bind"`},
		"unknown scope": {append(slices.Clone(ok), RouteSpec{Method: "GET", Path: "/y", Mode: ModePerm, Keys: []perm.Key{"x:read"}, StepUp: "y.reveal"}), `unknown step-up scope "y.reveal"`},
		"unlisted open": {append(slices.Clone(ok), RouteSpec{Method: "POST", Path: "/me/verify", Mode: ModeAuthed}), "route POST /me/verify: authed route without a permission is not on the permissionless list"},
		"stale entry":   {ok[1:], "permissionless list: POST /login is not a route without a permission"},
		"lost auth":     {[]RouteSpec{{Method: "POST", Path: "/login", Mode: ModePublic}, {Method: "GET", Path: "/me", Mode: ModePublic}}, "route GET /me: public route, the permissionless list says session"},
		"lost session":  {[]RouteSpec{ok[0], {Method: "GET", Path: "/me", Mode: ModeAuthed}}, "route GET /me: authed route, the permissionless list says session"},
	} {
		err := CheckRoutes(tc.specs, rules)
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: %v, want %q", name, err, tc.want)
		}
	}
}

func TestPublicOnAViewPanics(t *testing.T) {
	t.Parallel()
	r := NewRouter(gin.New(), keyTokens{}, fakeAuthz{})
	for name, v := range map[string]*Router{"session": r.SessionOnly(), "step-up": r.StepUp("x.reveal")} {
		func() {
			defer func() {
				if recover() == nil {
					t.Errorf("Public on a %s view did not panic", name)
				}
			}()
			v.Public("GET", "/"+name, func(*gin.Context) {})
		}()
	}
}
