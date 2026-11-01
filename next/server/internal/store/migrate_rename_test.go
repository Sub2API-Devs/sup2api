package store

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
)

// A renamed core migration is reported under its current id with the
// recorded checksum, which must still be the file's: the rename may not
// change the content.
func TestRenamedCoreMigrationsKeepTheirChecksum(t *testing.T) {
	for old, cur := range renamedCoreMigrations {
		body, err := migrations.FS.ReadFile(cur)
		require.NoError(t, err, cur)
		sum := sha256.Sum256(body)
		checksum := hex.EncodeToString(sum[:])
		_, err = migrations.FS.ReadFile(old)
		require.Error(t, err, "%s must no longer ship", old)

		got := renameApplied(map[string]string{"0072_x.sql": "a", old: checksum})
		require.Equal(t, map[string]string{"0072_x.sql": "a", cur: checksum}, got)
		// Both recorded (cannot happen through Migrate): the current id wins.
		got = renameApplied(map[string]string{old: "old", cur: "cur"})
		require.Equal(t, map[string]string{cur: "cur"}, got)
	}
}
