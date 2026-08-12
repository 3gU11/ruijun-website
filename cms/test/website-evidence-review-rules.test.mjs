import assert from 'node:assert/strict';
import test from 'node:test';

const {
  assessManufacturingEvidence,
  assessMilestone,
  assessQualification
} = await import('../reports/website-evidence-review-rules.mjs');

test('manufacturing evidence requires descriptive, controlled media and inspection evidence before publication', () => {
  assert.deepEqual(assessManufacturingEvidence({
    source_key: 'precision-machining', process: 'precision-machining', description: '',
    media: [{ path: '/legacy/factory.jpg' }], inspection_evidence: '', source_document: 'manufacturing.html'
  }), ['说明', '受控媒体未关联', '检测依据']);
  assert.deepEqual(assessManufacturingEvidence({
    source_key: 'precision-machining', process: 'precision-machining', description: '精密加工过程',
    media: [{ media_asset_id: 3 }], inspection_evidence: '检测记录编号 QA-01', source_document: 'manufacturing.html'
  }), []);
});

test('qualification evidence requires identity, controlled media and confirmed republication authorization', () => {
  assert.deepEqual(assessQualification({
    source_key: 'certificate-01', type: 'certificate', name: '质量管理体系认证证书',
    certificate_number: '', issuer: '', valid_until: null, assets: [{ path: '/legacy/certificate.jpg' }],
    authorization_status: 'review_required', source_document: 'about.html'
  }), ['证书编号', '颁发方', '有效期', '受控媒体未关联', '授权状态待确认']);
  assert.deepEqual(assessQualification({
    source_key: 'certificate-01', type: 'certificate', name: '质量管理体系认证证书',
    certificate_number: 'CERT-01', issuer: '认证机构', valid_until: '2027-12-31',
    assets: [{ media_asset_id: 'asset-1' }], authorization_status: 'authorized', source_document: 'about.html'
  }), []);
});

test('milestones require a stable year, event, source and supporting evidence', () => {
  assert.deepEqual(assessMilestone({ source_key: 'timeline', year: null, event: '', evidence: '', source_document: 'about.html' }), ['年份', '历程事件', '佐证材料']);
  assert.deepEqual(assessMilestone({ source_key: 'timeline-1997', year: 1997, event: '公司始创', evidence: '工商档案编号', source_document: 'about.html' }), []);
});
