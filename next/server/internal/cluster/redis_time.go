package cluster

import "time"

// Shared scores use Redis's clock, never the observing node's wall clock.
// ARGV[1] is an explicit test clock override (zero in production).
const redisTimeLua = `
local now = tonumber(ARGV[1])
if now == 0 then
  local t = redis.call('TIME')
  now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
end
`

func sharedClockOverride(now func() time.Time) int64 {
	if now != nil {
		return now().UnixMilli()
	}
	return 0
}
