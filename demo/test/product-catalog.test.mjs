import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogPath = new URL('../data/product-catalog.json', import.meta.url);

test('source-backed product catalog covers every public legacy series without sensitive data', async () => {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const seriesCodes = catalog.series.map(series => series.code);

  assert.deepEqual(seriesCodes, ['workstation', 'fr-xs-auto', 'fr-y', 'fl-xs', 'fr-pro', 'ft-xs', 'fr-g']);
  assert.equal(catalog.models.length, 29);
  assert.deepEqual(catalog.models.map(model => model.code), [
    'fr400xs-auto', 'fr500xs-auto', 'fr600xs-auto', 'fr7055xs-auto', 'fr8055xs-auto',
    'ft400s-pro', 'ft500s-pro', 'ft600s-pro', 'ft7055s-pro',
    'ft400xs', 'ft500xs', 'ft600xs', 'ft7055xs',
    'fl8560', 'fl1180', 'fl1390', 'fl1610',
    'fr8060y', 'fr1080y',
    'fr400xs-pro', 'fr500xs-pro', 'fr600xs-pro', 'fr7055xs-pro', 'fr8055xs-pro', 'fr8060xs-pro',
    'fr400g', 'fr500g', 'fr600g', 'fr7055g'
  ]);
  assert.equal(catalog.models[0].parameters.xyTravelMm, '400*290');
  assert.deepEqual(catalog.models[0].detailPageEvidence, {
    sourceUrl: 'http://www.ksrjjx.com/proshow__2129.html',
    observedParameters: { maxWorkpieceMm: '500*650*200' },
    conflictsWithTechnicalPackage: ['maxWorkpieceMm']
  });
  assert.equal(catalog.models[4].parameters.maxWorkpieceWeightKg, 1200);
  assert.equal(catalog.models[5].seriesCode, 'unmapped-ft-pro');
  assert.equal(catalog.models.find(model => model.code === 'ft400xs').seriesCode, 'ft-xs');
  assert.equal(catalog.models.find(model => model.code === 'ft400xs').parameters.zAxisTravelMm, 350);
  assert.match(catalog.models.find(model => model.code === 'ft400xs').sourceUrl, /proshow__2119\.html$/);
  assert.deepEqual(catalog.models.find(model => model.code === 'fl8560').observedModelNames, ['FL8560XS', 'FL8560']);
  assert.equal(catalog.models.find(model => model.code === 'fl1610').parameters.maxWorkpieceWeightKg, 4500);
  assert.equal(catalog.models.find(model => model.code === 'fr1080y').parameters.maxTaperDegrees, 35);
  assert.equal(catalog.models.find(model => model.code === 'fr8060xs-pro').parameters.maxWorkpieceWeightKg, 1400);
  assert.equal(catalog.models.find(model => model.code === 'fr7055g').parameters.maxTaperDegrees, 6);

  const serialized = JSON.stringify(catalog);
  assert.doesNotMatch(serialized, /555555|厂商参数口令/i);
});
