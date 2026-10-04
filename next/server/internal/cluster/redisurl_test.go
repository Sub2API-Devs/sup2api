package cluster

import "testing"

func TestParseRedisURLAcceptsValkeySchemes(t *testing.T) {
	for raw, want := range map[string]struct {
		addr string
		db   int
		tls  bool
		pass string
	}{
		"redis://cache:6379/0":          {"cache:6379", 0, false, ""},
		"rediss://cache:6380/1":         {"cache:6380", 1, true, ""},
		"valkey://cache:6379/2":         {"cache:6379", 2, false, ""},
		"VALKEY://cache/3":              {"cache:6379", 3, false, ""},
		"valkeys://:secret@cache:6380/": {"cache:6380", 0, true, "secret"},
		" valkey://cache:6379 ":         {"cache:6379", 0, false, ""},
	} {
		opt, err := ParseRedisURL(raw)
		if err != nil {
			t.Errorf("%q: %v", raw, err)
			continue
		}
		if opt.Addr != want.addr || opt.DB != want.db || (opt.TLSConfig != nil) != want.tls || opt.Password != want.pass {
			t.Errorf("%q: addr=%s db=%d tls=%v pass=%q, want %+v", raw, opt.Addr, opt.DB, opt.TLSConfig != nil, opt.Password, want)
		}
	}
	for _, raw := range []string{"", "memcached://cache:11211", "valkey-cluster://cache"} {
		if _, err := ParseRedisURL(raw); err == nil {
			t.Errorf("%q accepted", raw)
		}
	}
}
