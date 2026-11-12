package account

import (
	"context"
	"fmt"
	"net/http"
	"testing"
)

// Actions follow the row: whoever may update that account sees them, so a
// caller reading every account but updating only its own gets none on the
// accounts of others (list and GET /accounts/:id/actions alike).
func TestAccountActionsFollowRowOwnership(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	e.withCCGateway(true, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{}`)) })
	admin := e.uid
	mixed, reader := e.addUser("mixed@x.com"), e.addUser("reader@x.com")
	authz.keys[admin] = adminKeys
	authz.keys[mixed] = []string{"account:read", "account:own:update"}
	authz.keys[reader] = []string{"account:read"}

	create := func(name string, owner int64) int64 {
		t.Helper()
		code, out := e.doAs(admin, "POST", "/accounts", map[string]any{"name": name, "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}})
		if code != 201 {
			t.Fatalf("create %s: %d %v", name, code, out)
		}
		id := int64(data(out)["id"].(float64))
		if _, err := e.db.Pool.Exec(context.Background(), `UPDATE accounts SET created_by = $2 WHERE id = $1`, id, owner); err != nil {
			t.Fatal(err)
		}
		return id
	}
	mine, theirs := create("mine", mixed), create("theirs", admin)

	// count is the number of actions uid sees on account id, by both routes.
	count := func(uid, id int64) (detail, list int) {
		t.Helper()
		code, out := e.doAs(uid, "GET", fmt.Sprintf("/accounts/%d/actions", id), nil)
		actions, ok := data(out)["actions"].([]any)
		if code != 200 || !ok {
			t.Fatalf("actions of %d as %d: %d %v", id, uid, code, out)
		}
		code, out = e.doAs(uid, "GET", "/accounts", nil)
		if code != 200 {
			t.Fatalf("list as %d: %d %v", uid, code, out)
		}
		for _, it := range out["data"].([]any) {
			if a := it.(map[string]any); int64(a["id"].(float64)) == id {
				listed, _ := a["actions"].([]any)
				return len(actions), len(listed)
			}
		}
		t.Fatalf("account %d not listed for %d", id, uid)
		return 0, 0
	}
	for _, tc := range []struct {
		name    string
		uid, id int64
		want    int
	}{
		{"own row of an own-level updater", mixed, mine, 1},
		{"foreign row of an own-level updater", mixed, theirs, 0},
		{"administrator, own row", admin, theirs, 1},
		{"administrator, foreign row", admin, mine, 1},
		{"reader", reader, mine, 0},
	} {
		if detail, list := count(tc.uid, tc.id); detail != tc.want || list != tc.want {
			t.Errorf("%s: detail %d, list %d, want %d", tc.name, detail, list, tc.want)
		}
	}
}
