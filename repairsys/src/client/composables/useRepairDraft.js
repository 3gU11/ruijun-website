import { watch } from 'vue';

const DRAFT_KEY = 'repair_client_draft_v1';
const DRAFT_TTL = 2 * 60 * 60 * 1000;

function browserStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

function safeItems(items = []) {
  return items.map((item) => ({
    materialCode: item.materialCode || '',
    positionCode: item.positionCode || item.materialCode || '',
    materialType: item.materialType || '',
    materialName: item.materialName || '',
    spec: item.spec || '',
    photoRequirement: item.photoRequirement || '',
    photoRequired: Boolean(item.photoRequired),
    serviceType: item.serviceType || '维修',
    faultCategory: item.faultCategory || '',
    boardNo: item.boardNo || '',
    faultPhenomenon: item.faultPhenomenon || '',
    verification: item.verification || null
  }));
}

export function useRepairDraft(guideForm, guideStep) {
  function clearDraft() {
    browserStorage()?.removeItem(DRAFT_KEY);
  }

  function persistDraft() {
    const storage = browserStorage();
    if (!storage) return;
    if (!guideForm.modelCode) {
      clearDraft();
      return;
    }
    storage.setItem(DRAFT_KEY, JSON.stringify({
      savedAt: Date.now(),
      step: Math.min(Number(guideStep.value) || 1, 4),
      modelCode: guideForm.modelCode,
      modelName: guideForm.modelName,
      warrantyScope: guideForm.warrantyScope,
      sendMethod: guideForm.sendMethod,
      faultDescription: guideForm.faultDescription || '',
      faqContext: guideForm.faqContext || null,
      selectedMaterialCodes: [...guideForm.selectedMaterialCodes],
      items: safeItems(guideForm.items)
    }));
  }

  function restoreDraft() {
    const storage = browserStorage();
    if (!storage) return false;
    try {
      const draft = JSON.parse(storage.getItem(DRAFT_KEY) || 'null');
      if (!draft || Date.now() - Number(draft.savedAt || 0) > DRAFT_TTL || !draft.modelCode) {
        clearDraft();
        return false;
      }
      guideForm.modelCode = draft.modelCode || '';
      guideForm.modelName = draft.modelName || draft.modelCode || '';
      guideForm.warrantyScope = draft.warrantyScope === 'out' ? 'out' : 'in';
      guideForm.sendMethod = draft.sendMethod || '寄回';
      guideForm.faultDescription = draft.faultDescription || '';
      guideForm.faqContext = draft.faqContext || null;
      guideForm.selectedMaterialCodes = Array.isArray(draft.selectedMaterialCodes) ? [...draft.selectedMaterialCodes] : [];
      guideForm.items = safeItems(draft.items);
      guideStep.value = Math.max(1, Math.min(Number(draft.step) || 1, 4));
      return true;
    } catch {
      clearDraft();
      return false;
    }
  }

  watch([guideForm, guideStep], persistDraft, { deep: true });

  return { clearDraft, persistDraft, restoreDraft };
}
