import assert from 'node:assert/strict';
import test from 'node:test';
import { REASON_ICON_ROLES, REASON_IMAGE_ROLES, resolveReasonIcon, resolveReasonImage, selectReasonMediaPath } from '../shared/homepage-reason-media.mjs';

const fallback = { image: '/assets/psd/reason-factory-full.jpg', icon: '/assets/psd/reason-tab-manufacturing.png' };

test('a bound background asset wins over the code fallback', () => {
  const section = { media: [{ role: 'background', media_asset_id: '90', path: '/media/reason-factory.jpg' }] };
  assert.equal(resolveReasonImage(section, fallback), '/media/reason-factory.jpg');
});

test('a machine-mode reason resolves through the foreground role', () => {
  const section = { mode: 'machine', media: [{ role: 'foreground', media_asset_id: '89', path: '/media/reason-machine.png' }] };
  assert.equal(resolveReasonImage(section, fallback), '/media/reason-machine.png');
});

test('an unresolved draft binding falls through to the fallback', () => {
  // Draft assets carry no `path` until the reader resolves them, so the page
  // must keep rendering the static image instead of breaking.
  const section = { media: [{ role: 'background', media_asset_id: '90' }] };
  assert.equal(selectReasonMediaPath(section), '');
  assert.equal(resolveReasonImage(section, fallback), fallback.image);
});

test('a section text field is preferred over the fallback when no media is bound', () => {
  const section = { image: '/media/from-text-field.jpg', media: [] };
  assert.equal(resolveReasonImage(section, fallback), '/media/from-text-field.jpg');
});

test('roles the canvas does not treat as an image are ignored', () => {
  const section = { media: [{ role: 'icon', media_asset_id: '144', path: '/media/icon.png' }] };
  assert.equal(resolveReasonImage(section, fallback), fallback.image);
  assert.equal(resolveReasonIcon(section, fallback), '/media/icon.png');
});

test('a blank role is not treated as a background', () => {
  // The workbench used to store an empty role, which matched nothing; it must
  // not silently become the background either.
  const section = { media: [{ role: '', media_asset_id: '90', path: '/media/unassigned.jpg' }] };
  assert.equal(selectReasonMediaPath(section), '');
  assert.equal(resolveReasonImage(section, fallback), fallback.image);
});

test('missing media arrays and null sections stay safe', () => {
  assert.equal(resolveReasonImage(null, fallback), fallback.image);
  assert.equal(resolveReasonIcon(undefined, fallback), fallback.icon);
  assert.equal(resolveReasonImage({}, {}), '');
});

test('the role lists stay aligned with the bindable roles used by the canvas', () => {
  for (const role of ['background', 'foreground', 'image', 'photo', 'primary']) {
    assert.ok(REASON_IMAGE_ROLES.includes(role), `image roles must include ${role}`);
  }
  for (const role of ['icon', 'tab-icon', 'thumbnail']) {
    assert.ok(REASON_ICON_ROLES.includes(role), `icon roles must include ${role}`);
  }
});
