package store

import "testing"

func TestPoolMaxConns(t *testing.T) {
	for _, c := range []struct {
		dsn, env string
		parsed   int32
		want     int32
	}{
		{"postgres://u@h/db", "", 4, defaultPoolMaxConns},    // pgxpool's max(4, NumCPU) is not a choice
		{"postgres://u@h/db?pool_max_conns=7", "", 7, 7},     // the DSN decides
		{"host=h dbname=db pool_max_conns=9", "", 9, 9},      // keyword form too
		{"postgres://u@h/db?pool_max_conns=7", "30", 7, 30},  // the environment wins
		{"postgres://u@h/db", "abc", 4, defaultPoolMaxConns}, // an invalid value is ignored
		{"postgres://u@h/db", "0", 4, defaultPoolMaxConns},   // so is a non-positive one
		{"postgres://u@h/db?pool_max_conns=3", "-1", 3, 3},
	} {
		if got := poolMaxConns(c.dsn, c.env, c.parsed); got != c.want {
			t.Errorf("poolMaxConns(%q, %q, %d) = %d, want %d", c.dsn, c.env, c.parsed, got, c.want)
		}
	}
}
