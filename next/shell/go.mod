module github.com/Sub2API-Devs/sup2api/next/shell

go 1.27

require (
	github.com/Masterminds/semver/v3 v3.5.0
	github.com/Sub2API-Devs/sup2api/next/runtime-contract v0.0.0
	github.com/alicebob/miniredis/v2 v2.39.0
	github.com/go-redsync/redsync/v4 v4.18.0
	github.com/jackc/pgx/v5 v5.11.0
	github.com/redis/go-redis/v9 v9.22.0
)

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	github.com/klauspost/cpuid/v2 v2.3.0 // indirect
	github.com/yuin/gopher-lua v1.1.1 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/sync v0.23.0 // indirect
	golang.org/x/sys v0.47.0 // indirect
	golang.org/x/text v0.42.0 // indirect
)

replace github.com/Sub2API-Devs/sup2api/next/runtime-contract => ../runtime-contract
