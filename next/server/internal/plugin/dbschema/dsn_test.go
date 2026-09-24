package dbschema

import "testing"

func TestRewriteDSN(t *testing.T) {
	got, err := rewriteDSN("postgres://host:pw@db:5432/app?sslmode=disable", "plg_x", "p/w+=", "plg_x")
	if err != nil {
		t.Fatal(err)
	}
	want := "postgres://plg_x:p%2Fw+=@db:5432/app?options=-c%20search_path%3Dplg_x&sslmode=disable"
	if got != want {
		t.Fatalf("got %s\nwant %s", got, want)
	}
	got, _ = rewriteDSN("host=db user=app password=secret dbname=app", "plg_x", "a'b", "plg_x")
	want = `host=db user=app password=secret dbname=app user='plg_x' password='a\'b' options='-c search_path=plg_x'`
	if got != want {
		t.Fatalf("got %s\nwant %s", got, want)
	}
	got, _ = rewriteDSN("postgres://app:secret@db/app", "", "", "plg_x")
	if got != "postgres://app:secret@db/app?options=-c%20search_path%3Dplg_x" {
		t.Fatalf("host credentials: %s", got)
	}
}
