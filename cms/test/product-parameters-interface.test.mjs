import assert from 'node:assert/strict';
import test from 'node:test';
import {
  displayParameterValue,
  parameterFields,
  parameterRecord,
  updateParameterValue
} from '../extensions/product-parameters-interface/src/parameter-value.js';

test('product parameter form covers every parameter currently used by product models', () => {
  assert.deepEqual(parameterFields.map((field) => field.key), [
    'xyTravelMm', 'zAxisTravelMm', 'maxWorkpieceMm', 'maxWorkpieceWeightKg',
    'maxCuttingHeightMm', 'maxTaperDegrees', 'machineDimensionsMm', 'machineWeightKg'
  ]);
});

test('product parameter form displays dimensions without exposing JSON syntax', () => {
  const field = parameterFields.find((candidate) => candidate.key === 'xyTravelMm');
  assert.equal(displayParameterValue({ xyTravelMm: '400*300' }, field), '400 × 300');
  assert.deepEqual(parameterRecord('{"machineWeightKg":1850}'), { machineWeightKg: 1850 });
});

test('product parameter form normalizes dimensions, stores numbers and preserves unknown values', () => {
  const dimension = parameterFields.find((field) => field.key === 'maxWorkpieceMm');
  const weight = parameterFields.find((field) => field.key === 'machineWeightKg');
  const original = { xyTravelMm: '400*300', futureParameter: 'keep-me' };
  const withDimension = updateParameterValue(original, dimension, '550 × 690 × 300');
  const withWeight = updateParameterValue(withDimension, weight, '1850');

  assert.deepEqual(withWeight, {
    xyTravelMm: '400*300', futureParameter: 'keep-me', maxWorkpieceMm: '550*690*300', machineWeightKg: 1850
  });
  assert.deepEqual(updateParameterValue(withWeight, weight, ''), {
    xyTravelMm: '400*300', futureParameter: 'keep-me', maxWorkpieceMm: '550*690*300'
  });
});
