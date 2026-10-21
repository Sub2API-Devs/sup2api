// The native CC vocabulary as the CLI renders it (fixture checked against the
// recovered CLI by native-vocabulary.test.mjs), for tests that run the
// content policy without the CLI.
import fs from 'node:fs';
export const vocabulary = JSON.parse(fs.readFileSync(new URL('./fixtures/native-vocabulary-2.1.304.json', import.meta.url), 'utf8'));
