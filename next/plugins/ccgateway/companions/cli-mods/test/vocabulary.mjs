// The native CC vocabulary as the CLI under test renders it (the version's
// fixture, checked against its recovered CLI by native/<version>/
// vocabulary.test.mjs), for tests that run the content policy without the CLI.
import fs from 'node:fs';
import { fixture } from './artifacts.mjs';
export const vocabulary = JSON.parse(fs.readFileSync(fixture('native-vocabulary'), 'utf8'));
// The layer vocabulary and loop header names (ccgatewayLayerVocabulary), checked the same way.
export const layers = JSON.parse(fs.readFileSync(fixture('native-layers'), 'utf8'));
