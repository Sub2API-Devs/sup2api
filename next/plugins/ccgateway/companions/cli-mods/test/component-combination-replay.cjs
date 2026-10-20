// Generate the reviewed independent oracle using this container's OS facts,
// retain the exact manifest on the output mount, then run the standard gate.
if (!process.env.PROBE_MANIFEST) throw Error('PROBE_MANIFEST must name the retained output manifest');
process.argv[2] = process.env.PROBE_MANIFEST;
require('./fixtures/build-component-combination-manifest.cjs');
require('./assembly-replay.cjs');
