<script setup lang="ts">
type Mode = 'request' | 'warranty' | 'progress' | 'requests';
// mode: 'request' | 'warranty' | 'progress' | 'requests'
type Attachment = { name: string; category: string; dataUrl: string; size: number };
type RepairItem = { materialCode: string; materialType: string; materialName: string; spec: string; serviceType: string; boardNo: string; faultCategory: string; faultPhenomenon: string; photoRequired?: boolean; photoRequirement?: string; verification?: any };
// faq-context is accepted from the service FAQ handoff and remains customer-editable.
const props = defineProps<{ model?: string; mode: Mode; requestNo?: string; faqContext?: any }>();
const emit = defineEmits<{ close: [] }>();

const form = reactive({
  agent: '', customerName: '', contact: '', phone: '', address: '', machineNo: '', serialNo: '', modelCode: '', modelName: '',
  warrantyScope: 'in', sendMethod: '寄回', outboundExpressCompany: '', outboundTrackingNo: '', faultDescription: '', requestNo: '', faqContext: null as any
});
const requestStep = ref(1);
const modelOptions = ref<any[]>([]);
const selectedMaterialCodes = ref<string[]>([]);
const items = ref<RepairItem[]>([]);
const attachments = ref<Attachment[]>([]);
const supplementFiles = ref<Attachment[]>([]);
const requests = ref<any[]>([]);
const result = ref<any>(null);
const error = ref('');
const loading = ref(false);
const supplementLoading = ref(false);
const authOpen = ref(false);
const authMode = ref<'login' | 'register'>('login');
const auth = reactive({ username: '', password: '', name: '', agent: '', contact: '', phone: '', address: '' });
const authError = ref('');
const authLoading = ref(false);
const faultCategories = ['无法上电', '报警提示', '通讯异常', '运行不稳定', '外观损坏', '其他'];
const materialOptions = computed(() => {
  const model = modelOptions.value.find((item) => String(item.code || '').toLowerCase() === String(form.modelCode || '').toLowerCase());
  const configured = Array.isArray(model?.photoItems) ? model.photoItems : [];
  return configured.length ? configured : [{ code: 'general', name: '设备故障', type: '维修物料', spec: '', required: false }];
});
const selectedItems = computed(() => items.value.filter((item) => selectedMaterialCodes.value.includes(item.materialCode)));
const currentModelLabel = computed(() => form.modelName || form.modelCode || props.model || '未选择型号');

function isUnauthorized(errorValue: any) { return errorValue?.status === 401 || errorValue?.statusCode === 401 || errorValue?.data?.statusCode === 401; }
function setModelFromProp() {
  const requested = String(props.model || '').trim();
  if (!requested) return;
  const model = modelOptions.value.find((item) => [item.code, item.name].some((value) => String(value || '').toLowerCase() === requested.toLowerCase()));
  form.modelCode = model?.code || requested;
  form.modelName = model?.name || requested;
}
function applyFaqContext() {
  if (props.mode !== 'request' || !props.faqContext) return;
  const context = props.faqContext;
  form.faqContext = context;
  if (context.symptomSummary && !form.faultDescription) form.faultDescription = String(context.symptomSummary).slice(0, 1000);
}
async function loadModelData() {
  if (props.mode !== 'request' || modelOptions.value.length) return;
  try { const response: any = await $fetch('/api/repair/models'); modelOptions.value = Array.isArray(response) ? response : response?.data || []; }
  catch { modelOptions.value = []; }
  setModelFromProp();
}
function addMaterial(material: any) {
  const code = String(material.code || material.id || '').trim();
  if (!code || selectedMaterialCodes.value.includes(code)) return;
  selectedMaterialCodes.value.push(code);
  items.value.push({ materialCode: code, materialType: material.type || '维修物料', materialName: material.name || code, spec: material.spec || '', serviceType: form.warrantyScope === 'in' ? '维修' : '直接替换', boardNo: '', faultCategory: '', faultPhenomenon: '', photoRequired: Boolean(material.required), photoRequirement: material.shootingRequirement || '' });
}
function removeMaterial(code: string) { selectedMaterialCodes.value = selectedMaterialCodes.value.filter((item) => item !== code); items.value = items.value.filter((item) => item.materialCode !== code); }
function syncSelectedMaterials() { materialOptions.value.forEach((material) => { if (selectedMaterialCodes.value.includes(String(material.code)) && !items.value.some((item) => item.materialCode === String(material.code))) addMaterial(material); }); items.value = items.value.filter((item) => selectedMaterialCodes.value.includes(item.materialCode)); }
function validateStep(step = requestStep.value) {
  if (step === 1 && form.warrantyScope === 'in' && !form.machineNo.trim()) { error.value = '保修期内申请必须填写机器编号'; return false; }
  if (step === 2 && !selectedMaterialCodes.value.length) { error.value = '请至少选择一个维修物料'; return false; }
  if (step === 3 && items.value.some((item) => !item.faultCategory && !item.faultPhenomenon.trim())) { error.value = '请为每个维修物料选择故障类别或填写故障现象'; return false; }
  if (step === 4 && (!form.customerName.trim() || !form.contact.trim() || !form.phone.trim())) { error.value = '请填写客户名称、联系人和联系电话'; return false; }
  return true;
}
async function verifyItem(item: RepairItem) {
  if (form.warrantyScope !== 'in' || item.serviceType === '借用') return null;
  if (!item.boardNo.trim()) { error.value = `${item.materialName} 需要填写板号/零件编号`; return false; }
  try { item.verification = await $fetch('/api/repair/warranty/check', { method: 'POST', body: { machineNo: form.machineNo, serialNo: item.boardNo, modelCode: form.modelCode, modelName: form.modelName || props.model, materialCode: item.materialCode, materialName: item.materialName } }); return item.verification; }
  catch (e: any) { error.value = e?.data?.message || `${item.materialName} 的保修核验失败`; return false; }
}
async function verifyRequestItems() { if (form.warrantyScope !== 'in') return true; const checks = await Promise.all(items.value.map(verifyItem)); return checks.every((check) => check !== false); }
async function nextRequestStep() { error.value = ''; syncSelectedMaterials(); if (!validateStep(requestStep.value)) return; if (requestStep.value === 4 && !(await verifyRequestItems())) return; requestStep.value = Math.min(5, requestStep.value + 1); }
function previousRequestStep() { error.value = ''; requestStep.value = Math.max(1, requestStep.value - 1); }
function buildRequestPayload() {
  const machineNo = form.warrantyScope === 'in' ? form.machineNo.trim() : `非保-${form.modelCode || 'MANUAL'}`;
  const details = items.value.map((item, index) => ({ serialNo: item.boardNo || `${item.materialCode}-${index + 1}`, boardNo: item.boardNo || `${item.materialCode}-${index + 1}`, serviceType: item.serviceType, warrantyScope: form.warrantyScope === 'in' ? '在保' : '不在保', materialCode: item.materialCode, materialType: item.materialType, materialName: item.materialName, spec: item.spec, faultPhenomenon: item.faultPhenomenon || item.faultCategory || form.faultDescription || '未填写故障现象' }));
  return { agent: form.agent, customerName: form.customerName, contact: form.contact, phone: form.phone, address: form.address, machineNo, modelCode: form.modelCode || props.model || '', modelName: form.modelName || props.model || '', sourceChannel: 'official_site', faqContext: form.faqContext, faultDescription: `型号：${currentModelLabel.value}；保修：${form.warrantyScope === 'in' ? '保内' : '保外'}；${form.faultDescription}`, sendMethod: form.sendMethod, outboundExpressCompany: form.outboundExpressCompany, outboundTrackingNo: form.outboundTrackingNo, details, attachments: attachments.value };
}
async function submitRequest() {
  error.value = ''; if (!validateStep(4) || !validateStep(3) || !validateStep(2)) return; loading.value = true;
  try { result.value = await $fetch('/api/repair/requests', { method: 'POST', body: buildRequestPayload() }); }
  catch (e: any) { if (isUnauthorized(e)) authOpen.value = true; else error.value = e?.data?.message || '提交失败，请稍后再试'; }
  finally { loading.value = false; }
}
async function submitAuth() {
  authError.value = ''; authLoading.value = true;
  try {
    const payload = { username: auth.username, password: auth.password, name: auth.name, agent: auth.agent, contact: auth.contact, phone: auth.phone, address: auth.address };
    if (authMode.value === 'register') { await $fetch('/api/repair/auth/register', { method: 'POST', body: payload }); authMode.value = 'login'; authError.value = '注册申请已提交，请审核通过后登录'; return; }
    await $fetch('/api/repair/auth/login', { method: 'POST', body: payload }); authOpen.value = false; if (props.mode === 'request') await submitRequest(); else await loadRequests();
  } catch (e: any) { authError.value = e?.data?.message || '账号操作失败，请稍后再试'; }
  finally { authLoading.value = false; }
}
async function checkWarranty() { error.value = ''; result.value = null; loading.value = true; try { result.value = await $fetch('/api/repair/warranty/check', { method: 'POST', body: { machineNo: form.machineNo, serialNo: form.serialNo, modelCode: form.modelCode, modelName: form.modelName || props.model } }); } catch (e: any) { error.value = e?.data?.message || '查询失败，请稍后再试'; } finally { loading.value = false; } }
async function loadProgress() { error.value = ''; result.value = null; loading.value = true; try { result.value = await $fetch(`/api/repair/requests/${encodeURIComponent(form.requestNo.trim())}`); } catch (e: any) { error.value = e?.data?.message || '未找到该维修申请，或当前账号无权查看'; } finally { loading.value = false; } }
async function loadRequests() { error.value = ''; loading.value = true; try { requests.value = await $fetch('/api/repair/requests'); } catch (e: any) { if (isUnauthorized(e)) authOpen.value = true; else error.value = e?.data?.message || '加载申请失败'; } finally { loading.value = false; } }
async function selectRequest(requestNo: string) { error.value = ''; loading.value = true; try { result.value = await $fetch(`/api/repair/requests/${encodeURIComponent(requestNo)}`); } catch (e: any) { error.value = e?.data?.message || '无法加载申请详情'; } finally { loading.value = false; } }
function readFile(event: Event, category: string, target: Ref<Attachment[]>) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) { error.value = '请上传 4MB 以内的 JPG、PNG 或 WebP 图片'; input.value = ''; return; } const reader = new FileReader(); reader.onload = () => { target.value = [...target.value.filter((item) => item.category !== category), { name: file.name, category, dataUrl: String(reader.result), size: file.size }]; }; reader.readAsDataURL(file); }
function readImage(event: Event) { readFile(event, 'other', attachments); }
function readSupplementImage(event: Event, category: string) { readFile(event, category, supplementFiles); }
function attachmentUrl(attachment: any, requestNo: string) {
  const fileName = String(attachment?.url || '').split('/').pop() || '';
  return fileName ? `/api/repair/attachments/${encodeURIComponent(requestNo)}/${encodeURIComponent(fileName)}` : '';
}
async function submitSupplement() { const required = result.value?.supplementRequirements || ['machine_nameplate', 'component_serial']; const categories = new Set(supplementFiles.value.map((item) => item.category)); if (required.some((category: string) => !categories.has(category))) { error.value = '请按要求上传机床铭牌和零件编号照片'; return; } supplementLoading.value = true; error.value = ''; try { result.value = await $fetch(`/api/repair/requests/${encodeURIComponent(result.value.requestNo)}`, { method: 'POST', body: { attachments: supplementFiles.value } }); supplementFiles.value = []; } catch (e: any) { error.value = e?.data?.message || '补充资料失败，请稍后再试'; } finally { supplementLoading.value = false; } }
const timeline = computed(() => { const request = result.value; if (!request || !['progress', 'requests'].includes(props.mode)) return []; const labels = ['待审核', '已生成工单', '维修中', '待寄回', '已寄回', '已完成']; const status = String(request.status || ''); const current = Math.max(0, labels.findIndex((label) => status.includes(label))); return labels.map((label, index) => ({ label, active: index <= current || status.includes(label), current: status.includes(label) })); });
onMounted(() => { if (props.requestNo) form.requestNo = props.requestNo; applyFaqContext(); if (props.mode === 'request') loadModelData(); if (props.mode === 'requests') loadRequests(); if (props.mode === 'progress' && props.requestNo) loadProgress(); });
watch(() => props.faqContext, applyFaqContext, { deep: true });
watch(() => props.model, setModelFromProp);
</script>
<template>
  <section class="repair-inline" aria-live="polite">
    <div class="inline-head"><div><small>REPAIR SERVICE <template v-if="model">· {{ model }}</template></small><h3>{{ mode === 'request' ? '提交维修申请' : mode === 'warranty' ? '核验保修状态' : mode === 'requests' ? '我的申请' : '查询维修进度' }}</h3></div><button type="button" aria-label="关闭" @click="emit('close')">×</button></div>
    <div v-if="mode === 'requests' && !result" class="request-list"><p v-if="loading">加载中...</p><p v-else-if="!requests.length">暂无维修申请</p><button v-for="item in requests" :key="item.requestNo" type="button" @click="selectRequest(item.requestNo)"><strong>{{ item.requestNo }}</strong><span>{{ item.modelName || item.modelCode || model || '维修申请' }} · {{ item.status || '处理中' }}</span><small>{{ item.createdAt || item.createTime || '' }}</small></button><p v-if="error" class="inline-error">{{ error }}</p></div>
    <div v-else-if="mode === 'request' && !result" class="request-flow">
      <ol class="flow-steps"><li v-for="step in 5" :key="step" :class="{ active: step <= requestStep, current: step === requestStep }">{{ step }}</li></ol>
      <section v-if="requestStep === 1" class="flow-step"><h4>1. 选择设备与保修范围</h4><p class="selected-model">{{ currentModelLabel }}</p><label v-if="!model">设备型号<select v-model="form.modelCode" @change="form.modelName = modelOptions.find((item) => item.code === form.modelCode)?.name || form.modelCode"><option value="">请选择设备型号</option><option v-for="item in modelOptions" :key="item.code" :value="item.code">{{ item.name || item.code }}</option></select></label><label>保修范围<select v-model="form.warrantyScope"><option value="in">保修期内</option><option value="out">保修期外</option></select></label><label v-if="form.warrantyScope === 'in'">机器编号<input v-model.trim="form.machineNo" required placeholder="请输入机器编号"></label></section>
      <section v-else-if="requestStep === 2" class="flow-step"><h4>2. 选择维修物料</h4><div class="material-grid"><label v-for="material in materialOptions" :key="material.code" class="material-option"><input type="checkbox" :checked="selectedMaterialCodes.includes(material.code)" @change="selectedMaterialCodes.includes(material.code) ? removeMaterial(material.code) : addMaterial(material)"><span>{{ material.name || material.code }}</span><small>{{ material.spec }}</small></label></div></section>
      <section v-else-if="requestStep === 3" class="flow-step"><h4>3. 描述每项故障</h4><article v-for="item in items" :key="item.materialCode" class="item-detail"><strong>{{ item.materialName }}</strong><label>服务方式<select v-model="item.serviceType"><option value="维修">维修</option><option value="直接替换">直接替换</option><option value="借用">借用</option></select></label><label>板号/零件编号<input v-model.trim="item.boardNo" :placeholder="form.warrantyScope === 'in' && item.serviceType !== '借用' ? '保内必填' : '可选'"></label><label>故障类别<select v-model="item.faultCategory"><option value="">请选择</option><option v-for="category in faultCategories" :key="category" :value="category">{{ category }}</option></select></label><label>故障现象<textarea v-model.trim="item.faultPhenomenon" maxlength="1000" placeholder="也可以直接填写故障现象"></textarea></label><p v-if="item.verification" class="verification-result">{{ item.verification.result }}：{{ item.verification.suggestion }}</p></article></section>
      <section v-else-if="requestStep === 4" class="flow-step"><h4>4. 填写联系人与寄回方式</h4><div class="two-col"><label>客户名称<input v-model.trim="form.agent" placeholder="公司或代理商名称"></label><label>联系人<input v-model.trim="form.customerName" required placeholder="请输入联系人"></label><label>联系电话<input v-model.trim="form.phone" required placeholder="请输入手机号"></label><label>联系邮箱/方式<input v-model.trim="form.contact" required placeholder="请输入联系方式"></label><label class="wide">地址<input v-model.trim="form.address" placeholder="用于寄回或联系"></label><label>寄回方式<select v-model="form.sendMethod"><option value="寄回">维修后寄回</option><option value="自取">到厂自取</option><option value="现场">现场服务</option></select></label><label>故障总述<textarea v-model.trim="form.faultDescription" maxlength="1000" placeholder="补充整体故障描述"></textarea></label><label class="wide">故障照片（可选）<input type="file" accept="image/jpeg,image/png,image/webp" @change="readImage"><small v-if="attachments.length">已选择：{{ attachments[0].name }}</small></label></div></section>
      <section v-else class="flow-step"><h4>5. 确认并提交</h4><dl class="request-summary"><div><dt>设备</dt><dd>{{ currentModelLabel }} · {{ form.machineNo || '非保设备' }}</dd></div><div><dt>物料</dt><dd>{{ selectedItems.map((item) => item.materialName).join('、') }}</dd></div><div><dt>联系人</dt><dd>{{ form.customerName }} · {{ form.phone }}</dd></div><div><dt>服务方式</dt><dd>{{ form.sendMethod }}</dd></div></dl></section>
      <p v-if="error" class="inline-error">{{ error }}</p><div class="flow-actions"><button v-if="requestStep > 1" type="button" @click="previousRequestStep">上一步</button><button v-if="requestStep < 5" class="inline-submit" type="button" @click="nextRequestStep">下一步 →</button><button v-else class="inline-submit" type="button" :disabled="loading" @click="submitRequest">{{ loading ? '提交中...' : '提交维修申请' }}</button></div>
    </div>
    <form v-else-if="!result" class="inline-form" @submit.prevent="mode === 'warranty' ? checkWarranty() : loadProgress()"><label v-if="mode === 'progress'" class="wide">维修申请单号<input v-model.trim="form.requestNo" required placeholder="例如 RQ202608060001"></label><template v-else><label>机器编号<input v-model.trim="form.machineNo" required placeholder="请输入机器编号"></label><label>零件编号<input v-model.trim="form.serialNo" placeholder="可选"></label></template><button class="inline-submit" :disabled="loading">{{ loading ? '处理中...' : mode === 'warranty' ? '开始查询 →' : '查询进度 →' }}</button><p v-if="error" class="inline-error">{{ error }}</p></form>
    <div v-else class="inline-result"><small>RESULT</small><h4>{{ mode === 'request' ? '申请已提交' : mode === 'warranty' ? (result.result || '已完成核验') : `申请 ${result.requestNo || form.requestNo}` }}</h4><p>{{ mode === 'request' ? `报修单号：${result.requestNo || '已生成'}` : mode === 'warranty' ? result.suggestion : `当前状态：${result.status || '处理中'}` }}</p><ol v-if="['progress', 'requests'].includes(mode)" class="timeline"><li v-for="item in timeline" :key="item.label" :class="{ active: item.active, current: item.current }"><i></i><span>{{ item.label }}<small v-if="item.at">{{ item.at }}</small></span></li></ol><div v-if="result.logistics" class="logistics-summary"><strong>寄回物流</strong><span>{{ [result.logistics.returnMethod, result.logistics.company, result.logistics.trackingNo].filter(Boolean).join(' · ') }}</span><small v-if="result.logistics.sentAt">登记时间：{{ result.logistics.sentAt }}</small></div><div v-if="['progress', 'requests'].includes(mode) && result.status === '待补充资料'" class="supplement-box"><strong>需要补充资料</strong><label>机床铭牌照片<input type="file" accept="image/jpeg,image/png,image/webp" @change="(event) => readSupplementImage(event, 'machine_nameplate')"></label><label>零件编号照片<input type="file" accept="image/jpeg,image/png,image/webp" @change="(event) => readSupplementImage(event, 'component_serial')"></label><button class="inline-submit" type="button" :disabled="supplementLoading" @click="submitSupplement">{{ supplementLoading ? '提交中...' : '提交补充资料' }}</button></div><p v-if="error" class="inline-error">{{ error }}</p><button type="button" @click="result = null; mode === 'requests' ? loadRequests() : emit('close')">返回</button></div>
    <div v-if="authOpen" class="inline-auth"><div class="inline-auth-box"><button type="button" @click="authOpen = false">×</button><small>{{ authMode === 'login' ? '登录后继续' : '注册售后账号' }}</small><h4>{{ authMode === 'login' ? '请先登录售后服务' : '创建售后账号' }}</h4><input v-model.trim="auth.username" required placeholder="用户名"><input v-model="auth.password" required type="password" placeholder="密码"><template v-if="authMode === 'register'"><input v-model.trim="auth.name" required placeholder="姓名"><input v-model.trim="auth.agent" required placeholder="代理商/公司"><input v-model.trim="auth.contact" required placeholder="联系人"><input v-model.trim="auth.phone" required placeholder="手机号"><input v-model.trim="auth.address" placeholder="地址"></template><p v-if="authError" class="inline-error">{{ authError }}</p><button class="inline-submit" :disabled="authLoading" @click="submitAuth">{{ authLoading ? '处理中...' : authMode === 'login' ? '登录并继续' : '提交注册' }}</button><button class="switch-auth" type="button" @click="authMode = authMode === 'login' ? 'register' : 'login'">切换登录/注册</button></div></div>
    <div v-if="result?.attachments?.length" class="attachment-summary"><strong>已提交附件</strong><a v-for="attachment in result.attachments" :key="attachment.id || attachment.url" :href="attachmentUrl(attachment, result.requestNo || form.requestNo)" target="_blank" rel="noreferrer">{{ attachment.name || attachment.category }}</a></div>
  </section>
</template>
<style scoped>
.repair-inline{position:relative;margin-top:18px;padding:24px;background:#f5b400;color:#151515}.inline-head{display:flex;justify-content:space-between;align-items:start}.inline-head small,.inline-result small{font-size:10px;letter-spacing:.14em}.inline-head h3{margin:5px 0 20px;font-size:26px;font-weight:400}.inline-head>button,.inline-auth-box>button{border:0;background:none;font-size:25px;cursor:pointer}.request-flow,.flow-step{display:grid;gap:14px}.flow-steps{display:flex;gap:8px;padding:0;margin:0 0 8px;list-style:none}.flow-steps li{width:28px;height:28px;display:grid;place-items:center;border:1px solid #9d7800;border-radius:50%;font-size:12px}.flow-steps li.active{background:#171717;color:#fff;border-color:#171717}.flow-steps li.current{outline:2px solid #fff;outline-offset:2px}.flow-step h4{margin:0;font-size:22px;font-weight:400}.flow-step label,.item-detail label,.two-col label,.inline-form label,.supplement-box label{display:grid;gap:5px;font-size:12px}.flow-step input,.flow-step select,.flow-step textarea,.inline-form input,.inline-form select,.inline-form textarea,.item-detail input,.item-detail select,.item-detail textarea,.two-col input,.two-col select,.two-col textarea,.inline-auth-box input{padding:10px;border:1px solid #9d7800;background:#fff}.selected-model{margin:0;padding:12px;background:#ffffff66;font-size:18px}.material-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.material-option{display:grid!important;grid-template-columns:auto 1fr;column-gap:8px;padding:12px;background:#ffffff66}.material-option small{grid-column:2;color:#666}.item-detail{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:14px;background:#ffffff66}.item-detail strong,.item-detail textarea{grid-column:1/-1}.two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.two-col .wide{grid-column:1/-1}.request-summary{display:grid;gap:10px;margin:0}.request-summary div{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #c49a00;padding-bottom:8px}.request-summary dt{color:#765c00}.request-summary dd{margin:0;text-align:right}.flow-actions{display:flex;justify-content:flex-end;gap:10px}.flow-actions button,.inline-result button{padding:10px 14px;border:0;background:#171717;color:#fff;cursor:pointer}.inline-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.inline-form .wide{grid-column:1/-1}.inline-submit{width:max-content;padding:11px 16px;border:0;background:#171717;color:#fff;cursor:pointer}.inline-error{color:#8e1111}.inline-result h4{margin:8px 0;font-size:28px;font-weight:400}.inline-result p{margin:0 0 15px}.request-list{display:grid;gap:10px}.request-list button{padding:10px 14px;border:0;background:#171717;color:#fff;text-align:left;cursor:pointer}.request-list button span,.request-list button small{display:block;margin-top:4px}.timeline{display:flex;gap:0;margin:26px 0;padding:0;list-style:none}.timeline li{min-width:82px;display:grid;justify-items:center;gap:8px;color:#777;font-size:12px;text-align:center}.timeline i{width:11px;height:11px;border:2px solid #999;border-radius:50%;background:#f5b400}.timeline li.active{color:#171717}.timeline li.active i{border-color:#171717;background:#171717}.supplement-box{display:grid;gap:9px;margin:18px 0;padding:14px;background:#ffffff66}.inline-auth{position:absolute;z-index:4;inset:0;display:grid;place-items:center;background:#f5b400eF}.inline-auth-box{width:min(390px,100%);display:grid;gap:10px;padding:25px;background:#fff;box-shadow:0 10px 30px #0003}.switch-auth{border:0;background:none;color:#555;cursor:pointer}@media(max-width:620px){.material-grid,.two-col,.item-detail,.inline-form{grid-template-columns:1fr}.two-col .wide,.inline-form .wide{grid-column:auto}.inline-submit{width:100%}.request-summary div{display:grid;gap:4px}.request-summary dd{text-align:left}}
 .timeline small{display:block;margin-top:4px;color:#666;font-size:10px}.logistics-summary{display:grid;gap:5px;margin:18px 0;padding:14px;background:#ffffff66}.logistics-summary span,.logistics-summary small{color:#555}
</style>
