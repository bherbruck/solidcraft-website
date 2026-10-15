import assert from 'node:assert/strict';
import { test } from 'node:test';
import { progressBase, upstreamProgressUrl } from '../src/lib/progress-routes.ts';

test('live unit routing supports new unit IDs and rejects traversal or foreign destinations', () => {
  const page = { path: `${progressBase}unit/`, kind: 'unit' as const, heading: 'Unit report' };
  assert.equal(
    upstreamProgressUrl(page, 'new.geometry'),
    'https://bherbruck.github.io/solidcore/units/new.geometry.html',
  );
  for (const id of [
    '',
    '../evil',
    'a/../../evil',
    'https://evil.example/unit',
    'a%2fb',
    'a..b',
    '<script>',
  ])
    assert.throws(() => upstreamProgressUrl(page, id));
});
