package ccgateway

import (
	"net/http"
	"testing"
)

// Recording the login email (the plugin's read-only extension account_email,
// CONTRACTS §59.6) is no runtime change: the runtime's revision stays, so the
// controller does not re-apply (on 2026-10-25 a recorded email rebuilt an
// account's egress container). The admin's environment still changes it, and
// an account that never had the email keeps the revision it always had.
func TestLoginEmailKeepsTheRuntimeRevision(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(404) })
	id := f.account(true)
	revision := func() string {
		t.Helper()
		d, err := f.s.desired(t.Context(), id, false)
		if err != nil {
			t.Fatal(err)
		}
		return d.Revision
	}
	set := func(settings string) {
		t.Helper()
		if _, err := f.db.Pool.Exec(t.Context(), `UPDATE accounts SET settings=$2::jsonb WHERE id=$1`, id, settings); err != nil {
			t.Fatal(err)
		}
	}
	set(`{"locale":"en-US"}`)
	before := revision()
	set(`{"locale":"en-US","account_email":"ops@example.invalid"}`)
	if revision() != before {
		t.Fatal("a recorded login email changed the runtime revision")
	}
	set(`{"locale":"en-US","account_email":"other@example.invalid"}`)
	if revision() != before {
		t.Fatal("another login email changed the runtime revision")
	}
	set(`{"locale":"de-DE","account_email":"other@example.invalid"}`)
	if revision() == before {
		t.Fatal("the environment no longer changes the runtime revision")
	}
}
