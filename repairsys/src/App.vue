<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowRight,
  Box,
  CircleCheck,
  Close,
  Connection,
  Cpu,
  DataLine,
  Monitor,
  Plus,
  Position,
  Refresh,
  Search,
  Tickets,
  Tools
} from '@element-plus/icons-vue';
import { api } from './api';

const activeTab = ref('new');
const loading = ref(false);
const overview = ref({ status: {}, warrantyStats: {}, byAgent: [], byMaterialType: {}, recentLogs: [] });
const requests = ref([]);
const workOrders = ref([]);
const master = ref({ machines: [], materials: [], materialInstances: [], bindings: [], logs: [] });
const syncTasks = ref([]);
const modelDictionary = ref([]);

const guideStep = ref(1);
const modelDialog = ref(false);
const selectedModel = ref(null);
const warrantyResult = ref(null);

const guideForm = reactive({
  agent: '上海瑞景代理商',
  customerName: '',
  contact: '',
  phone: '',
  address: '',
  modelCode: '',
  modelName: '',
  machineNo: '',
  warrantyScope: 'in',
  sendMethod: '寄回',
  outboundExpressCompany: '',
  outboundTrackingNo: '',
  faultDescription: '',
  customProductName: '',
  selectedMaterialCodes: [],
  items: []
});

const auditDrawer = ref(false);
const selectedRequest = ref(null);
const auditForm = reactive({ result: '通过', department: '电器维修', comment: '编号匹配，进入维修部处理', operator: '工厂审核员' });

const resultDrawer = ref(false);
const logisticsDrawer = ref(false);
const selectedOrder = ref(null);
const resultForm = reactive({
  repairPerson: '电器维修员',
  detectionResult: '',
  repairPlan: '',
  repairResult: '已修复',
  replaced: false,
  replacements: [{ oldSerialNo: '', newSerialNo: 'PCB-SPARE-009', position: '电柜主控位', reason: '' }]
});
const logisticsForm = reactive({
  returnMethod: '快递',
  company: '顺丰',
  trackingNo: '',
  sentAt: new Date().toISOString().slice(0, 10),
  receiver: '',
  phone: '',
  address: ''
});

const materialForm = reactive({ materialCode: 'MAT-NEW-', name: '', type: '板卡', spec: '', defaultWarrantyMonths: 12 });
const instanceForm = reactive({ serialNo: '', materialCode: 'MAT-MAIN-BOARD', batchNo: '', flowNo: '', status: '备用' });
const bindingForm = reactive({ machineNo: 'RJ-MC-2025-001', serialNo: 'PCB-SPARE-009', position: '电柜备用位', source: '人工新增' });
const warrantyForm = reactive({ machineNo: 'RJ-MC-2025-001', serialNo: 'PCB-850-0001' });
const quickWarrantyResult = ref(null);
const syncForm = reactive({ source: 'V8 Excel 导入', target: '机床/物料/绑定关系', successCount: 0, failCount: 0, summary: '记录一次模拟同步任务' });

const pendingRequests = computed(() => requests.value.filter((item) => item.status === '待审核'));
const activeOrders = computed(() => workOrders.value.filter((item) => !['已完成'].includes(item.status)));

const productGroups = computed(() => {
  const source = modelDictionary.value.length
    ? modelDictionary.value
    : master.value.machines.map((item) => ({ id: item.machineNo, code: item.model, name: item.model, series: '机床' }));
  const groups = source.reduce((acc, item) => {
    const key = item.series || '机床型号';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});

const materialOptions = computed(() => {
  const base = master.value.materials.map((item) => ({
    code: item.materialCode,
    name: item.name,
    type: item.type,
    spec: item.spec
  }));
  if (guideForm.customProductName.trim()) {
    base.unshift({
      code: `CUSTOM-${guideForm.customProductName.trim()}`,
      name: guideForm.customProductName.trim(),
      type: '手工填写',
      spec: ''
    });
  }
  return base;
});

function statusTag(status) {
  if (['在保', '通过', '已修复', '已完成', '已寄回'].includes(status)) return 'success';
  if (['不在保', '出保', '过保'].includes(status)) return 'danger';
  if (['出库时间待补充', '待审核', '待接单', '待寄回', '维修中'].includes(status)) return 'warning';
  if (['未建档', '绑定不一致', '未绑定', '已驳回', '无法维修'].includes(status)) return 'danger';
  return 'info';
}

function statusAlert(status) {
  const type = statusTag(status);
  return type === 'danger' ? 'error' : type;
}

function modelIcon(index) {
  return [Monitor, Cpu, Box, Tools][index % 4];
}

async function loadAll() {
  loading.value = true;
  try {
    const [overviewData, requestData, orderData, masterData, syncData, models] = await Promise.all([
      api.overview(),
      api.requests(),
      api.workOrders(),
      api.masterData(),
      api.syncTasks(),
      api.modelDictionary()
    ]);
    overview.value = overviewData;
    requests.value = requestData;
    workOrders.value = orderData;
    master.value = masterData;
    syncTasks.value = syncData;
    modelDictionary.value = models;
  } finally {
    loading.value = false;
  }
}

function resetGuide() {
  guideStep.value = 1;
  selectedModel.value = null;
  warrantyResult.value = null;
  Object.assign(guideForm, {
    agent: '上海瑞景代理商',
    customerName: '',
    contact: '',
    phone: '',
    address: '',
    modelCode: '',
    modelName: '',
    machineNo: '',
    warrantyScope: 'in',
    sendMethod: '寄回',
    outboundExpressCompany: '',
    outboundTrackingNo: '',
    faultDescription: '',
    customProductName: '',
    selectedMaterialCodes: [],
    items: []
  });
}

function openModelDialog(model) {
  selectedModel.value = model;
  guideForm.modelCode = model.code;
  guideForm.modelName = model.name;
  modelDialog.value = true;
}

function confirmModel() {
  if (!guideForm.modelCode) {
    ElMessage.warning('请先选择机型');
    return;
  }
  const model = modelDictionary.value.find((item) => item.code === guideForm.modelCode);
  if (model) guideForm.modelName = model.name;
  modelDialog.value = false;
  guideStep.value = guideForm.warrantyScope === 'in' ? 3 : 4;
}

function chooseWarranty(scope) {
  guideForm.warrantyScope = scope;
  guideStep.value = scope === 'in' ? 3 : 4;
}

async function verifyMachine() {
  if (!guideForm.machineNo) {
    ElMessage.warning('保修期内申请必须填写机床编号');
    return;
  }
  const machine = master.value.machines.find((item) => item.machineNo === guideForm.machineNo);
  if (!machine) {
    warrantyResult.value = { result: '未建档', suggestion: '系统未找到该机床，提交后由审核员人工确认' };
  } else {
    const inWarranty = !machine.warrantyEnd || new Date().toISOString().slice(0, 10) <= machine.warrantyEnd;
    warrantyResult.value = {
      result: inWarranty ? '在保' : '出保',
      suggestion: inWarranty ? '可继续填写维修物料和板号' : '该机床已出保，可按收费维修处理',
      machine
    };
  }
  guideStep.value = 4;
}

function toggleMaterial(material) {
  const index = guideForm.selectedMaterialCodes.indexOf(material.code);
  if (index >= 0) {
    guideForm.selectedMaterialCodes.splice(index, 1);
    guideForm.items = guideForm.items.filter((item) => item.materialCode !== material.code);
    return;
  }
  guideForm.selectedMaterialCodes.push(material.code);
  guideForm.items.push({
    materialCode: material.code,
    materialType: material.type,
    materialName: material.name,
    spec: material.spec,
    boardNo: '',
    serviceType: guideForm.warrantyScope === 'in' ? '维修' : '直接替换',
    faultPhenomenon: ''
  });
}

function syncSelectedMaterials() {
  const existingCodes = new Set(guideForm.items.map((item) => item.materialCode));
  materialOptions.value.forEach((material) => {
    if (guideForm.selectedMaterialCodes.includes(material.code) && !existingCodes.has(material.code)) {
      guideForm.items.push({
        materialCode: material.code,
        materialType: material.type,
        materialName: material.name,
        spec: material.spec,
        boardNo: '',
        serviceType: guideForm.warrantyScope === 'in' ? '维修' : '直接替换',
        faultPhenomenon: ''
      });
    }
  });
  guideForm.items = guideForm.items.filter((item) => guideForm.selectedMaterialCodes.includes(item.materialCode));
}

function goItemDetail() {
  syncSelectedMaterials();
  if (!guideForm.items.length) {
    ElMessage.warning('请选择至少一个维修产品或物料');
    return;
  }
  guideStep.value = 5;
}

function validateItemDetail() {
  const missingBoardNo = guideForm.warrantyScope === 'in' && guideForm.items.some((item) => !item.boardNo);
  if (missingBoardNo) {
    ElMessage.warning('保修期内每个维修物料都必须填写板号/零件编号');
    return false;
  }
  return true;
}

function goContactInfo() {
  if (!validateItemDetail()) return;
  guideStep.value = 6;
}

async function submitGuideRequest() {
  if (!guideForm.customerName || !guideForm.contact || !guideForm.phone) {
    ElMessage.warning('请填写客户名称、联系人和电话');
    return;
  }
  if (guideForm.warrantyScope === 'in' && !guideForm.machineNo) {
    ElMessage.warning('保修期内申请必须填写机床编号');
    return;
  }
  if (!validateItemDetail()) return;

  const machineNo = guideForm.warrantyScope === 'in' ? guideForm.machineNo : `非保-${guideForm.modelCode || 'MANUAL'}`;
  const details = guideForm.items.map((item, index) => ({
    serialNo: item.boardNo || `${item.materialCode}-${index + 1}`,
    materialType: item.materialType,
    materialName: item.materialName,
    spec: item.spec,
    faultPhenomenon: `服务：${item.serviceType}；${item.faultPhenomenon || guideForm.faultDescription || '未填写故障现象'}`
  }));

  await api.createRequest({
    agent: guideForm.agent,
    customerName: guideForm.customerName,
    contact: guideForm.contact,
    phone: guideForm.phone,
    address: guideForm.address,
    machineNo,
    faultDescription: `机型：${guideForm.modelName || guideForm.modelCode}；保修：${guideForm.warrantyScope === 'in' ? '保内' : '保外'}；${guideForm.faultDescription}`,
    sendMethod: guideForm.sendMethod,
    outboundExpressCompany: guideForm.outboundExpressCompany,
    outboundTrackingNo: guideForm.outboundTrackingNo,
    details
  });
  ElMessage.success('维修申请已提交');
  resetGuide();
  await loadAll();
  activeTab.value = 'review';
}

function openAudit(row) {
  selectedRequest.value = row;
  auditDrawer.value = true;
}

async function submitAudit(result) {
  if (!selectedRequest.value) return;
  auditForm.result = result;
  if (result === '驳回' && !auditForm.comment) {
    ElMessage.warning('驳回时需要填写审核意见');
    return;
  }
  await api.auditRequest(selectedRequest.value.requestNo, auditForm);
  ElMessage.success(result === '通过' ? '已生成维修工单' : '审核结果已保存');
  auditDrawer.value = false;
  await loadAll();
  activeTab.value = result === '通过' ? 'orders' : 'review';
}

async function acceptOrder(order) {
  await api.acceptWorkOrder(order.workOrderNo, { repairPerson: resultForm.repairPerson });
  ElMessage.success('已接单');
  await loadAll();
}

function openResult(order) {
  selectedOrder.value = order;
  resultForm.repairPerson = order.repairPerson || '电器维修员';
  const firstDetail = order.request?.details?.[0];
  if (firstDetail) resultForm.replacements[0].oldSerialNo = firstDetail.serialNo;
  resultDrawer.value = true;
}

async function submitRepairResult() {
  if (!selectedOrder.value) return;
  await api.repairResult(selectedOrder.value.workOrderNo, resultForm);
  ElMessage.success('维修结果已登记');
  resultDrawer.value = false;
  await loadAll();
}

function openLogistics(order) {
  selectedOrder.value = order;
  logisticsForm.receiver = order.request?.contact || '';
  logisticsForm.phone = order.request?.phone || '';
  logisticsForm.address = order.request?.address || '';
  logisticsDrawer.value = true;
}

async function submitLogistics() {
  if (!selectedOrder.value) return;
  await api.logistics(selectedOrder.value.workOrderNo, logisticsForm);
  ElMessage.success('寄回物流已登记');
  logisticsDrawer.value = false;
  await loadAll();
}

async function archiveOrder(order) {
  await ElMessageBox.confirm(`确认归档工单 ${order.workOrderNo}？`, '归档确认', { type: 'warning' });
  await api.archive(order.workOrderNo, { operator: '系统管理员' });
  ElMessage.success('工单已归档');
  await loadAll();
}

async function createMaterial() {
  await api.createMaterial(materialForm);
  ElMessage.success('物料档案已新增');
  materialForm.materialCode = 'MAT-NEW-';
  materialForm.name = '';
  materialForm.spec = '';
  await loadAll();
}

async function createInstance() {
  await api.createInstance(instanceForm);
  ElMessage.success('物料实例已新增');
  instanceForm.serialNo = '';
  instanceForm.batchNo = '';
  instanceForm.flowNo = '';
  await loadAll();
}

async function createBinding() {
  await api.createBinding(bindingForm.machineNo, bindingForm);
  ElMessage.success('绑定关系已新增');
  await loadAll();
}

async function checkWarranty() {
  quickWarrantyResult.value = await api.warrantyCheck(warrantyForm);
}

async function createSyncTask() {
  await api.createSyncTask(syncForm);
  ElMessage.success('同步任务已记录');
  await loadAll();
}

onMounted(loadAll);
</script>

<template>
  <div class="app-shell" v-loading="loading">
    <header class="topbar">
      <div class="brand">
        <h1>维修服务</h1>
        <span>按产品、保修状态、物料和板号逐步创建维修申请</span>
      </div>
      <div class="top-actions">
        <el-tag type="success" effect="dark">本地开发库</el-tag>
        <el-button :icon="Refresh" @click="loadAll">刷新</el-button>
      </div>
    </header>

    <main class="content">
      <section class="kpi-grid">
        <div class="kpi"><div class="kpi-label">今日新增申请</div><div class="kpi-value">{{ overview.status.todayNew || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">待审核</div><div class="kpi-value">{{ overview.status.pendingReview || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">维修中</div><div class="kpi-value">{{ overview.status.repairing || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">待寄回</div><div class="kpi-value">{{ overview.status.pendingReturn || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">已完成</div><div class="kpi-value">{{ overview.status.completed || 0 }}</div></div>
      </section>

      <section class="workspace">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="新建申请" name="new">
            <div class="support-page">
              <div class="support-hero">
                <div>
                  <h2>需要维修哪台设备？</h2>
                  <p>先选择机型，再根据是否在保决定填写机床编号、物料和板号。</p>
                </div>
                <el-button :icon="Close" @click="resetGuide">重新开始</el-button>
              </div>

              <div class="guide-steps">
                <div :class="['guide-step', { active: guideStep >= 1 }]">1 选择机型</div>
                <div :class="['guide-step', { active: guideStep >= 2 }]">2 保修状态</div>
                <div :class="['guide-step', { active: guideStep >= 4 }]">3 维修物料</div>
                <div :class="['guide-step', { active: guideStep >= 5 }]">4 板号与服务</div>
                <div :class="['guide-step', { active: guideStep >= 6 }]">5 联系信息</div>
              </div>

              <section v-if="guideStep === 1" class="support-section">
                <div v-for="group in productGroups" :key="group.name" class="product-group">
                  <h3>{{ group.name }}</h3>
                  <div class="product-grid">
                    <button v-for="(model, index) in group.items" :key="`${model.source}-${model.id}-${model.code}`" class="product-card" @click="openModelDialog(model)">
                      <el-icon><component :is="modelIcon(index)" /></el-icon>
                      <span>{{ model.name }}</span>
                      <small>{{ model.code }}</small>
                    </button>
                  </div>
                </div>
              </section>

              <section v-if="guideStep === 2" class="support-section narrow">
                <h3>{{ guideForm.modelName }}</h3>
                <p class="muted">请选择这次申请是否属于保修期内。</p>
                <div class="choice-grid">
                  <button class="choice-card" @click="chooseWarranty('in')">
                    <strong>保修期内</strong>
                    <span>需要填写机床编号，选择维修物料后逐项填写板号。</span>
                  </button>
                  <button class="choice-card" @click="chooseWarranty('out')">
                    <strong>不在保修期内</strong>
                    <span>可直接选择或手工写入产品，再选择借用、替换或维修。</span>
                  </button>
                </div>
              </section>

              <section v-if="guideStep === 3" class="support-section narrow">
                <h3>填写机床编号</h3>
                <p class="muted">保修期内申请必须用机床编号做绑定和保修判断。</p>
                <div class="machine-check">
                  <el-input v-model="guideForm.machineNo" placeholder="请输入机床编号，例如 RJ-MC-2025-001" clearable />
                  <el-button type="primary" :icon="Search" @click="verifyMachine">检查并继续</el-button>
                </div>
                <el-alert v-if="warrantyResult" :title="`${warrantyResult.result}：${warrantyResult.suggestion}`" :type="statusAlert(warrantyResult.result)" show-icon :closable="false" />
              </section>

              <section v-if="guideStep === 4" class="support-section">
                <div class="section-title">
                  <div>
                    <h2>选择维修物料</h2>
                    <p>{{ guideForm.warrantyScope === 'in' ? '可多选，下一步为每块板填写板号。' : '可多选，也可以先手工写入产品名称。' }}</p>
                  </div>
                </div>
                <el-input v-if="guideForm.warrantyScope === 'out'" v-model="guideForm.customProductName" placeholder="没有档案时可手工写入产品，例如：主轴编码器" style="margin-bottom: 14px" />
                <div class="material-grid">
                  <button
                    v-for="material in materialOptions"
                    :key="material.code"
                    :class="['material-card', { selected: guideForm.selectedMaterialCodes.includes(material.code) }]"
                    @click="toggleMaterial(material)"
                  >
                    <strong>{{ material.name }}</strong>
                    <span>{{ material.type }} · {{ material.spec || material.code }}</span>
                  </button>
                </div>
                <div class="inline-actions" style="margin-top: 18px">
                  <el-button @click="guideStep = guideForm.warrantyScope === 'in' ? 3 : 2">上一步</el-button>
                  <el-button type="primary" :icon="ArrowRight" @click="goItemDetail">下一步</el-button>
                </div>
              </section>

              <section v-if="guideStep === 5" class="support-section">
                <div class="section-title">
                  <div>
                    <h2>填写板号和服务方式</h2>
                    <p>每个物料可单独选择借用、直接替换或维修。</p>
                  </div>
                </div>
                <div class="wizard-items">
                  <div v-for="item in guideForm.items" :key="item.materialCode" class="wizard-item">
                    <div>
                      <strong>{{ item.materialName }}</strong>
                      <span>{{ item.materialType }} · {{ item.spec || item.materialCode }}</span>
                    </div>
                    <el-radio-group v-model="item.serviceType">
                      <el-radio-button value="维修">维修</el-radio-button>
                      <el-radio-button value="直接替换">直接替换</el-radio-button>
                      <el-radio-button value="借用">借用</el-radio-button>
                    </el-radio-group>
                    <el-input v-model="item.boardNo" :placeholder="guideForm.warrantyScope === 'in' ? '必填：板号/零件编号' : '可选：板号/零件编号'" />
                    <el-input v-model="item.faultPhenomenon" placeholder="故障现象，例如：上电无反应、报警、通讯异常" />
                  </div>
                </div>
                <div class="inline-actions" style="margin-top: 18px">
                  <el-button @click="guideStep = 4">上一步</el-button>
                  <el-button type="primary" :icon="ArrowRight" @click="goContactInfo">下一步，填写信息</el-button>
                </div>
              </section>

              <section v-if="guideStep === 6" class="support-section narrow">
                <h3>填写联系和寄修信息</h3>
                <el-form label-position="top">
                  <div class="form-row">
                    <el-form-item label="代理商"><el-input v-model="guideForm.agent" /></el-form-item>
                    <el-form-item label="客户名称"><el-input v-model="guideForm.customerName" /></el-form-item>
                    <el-form-item label="联系人"><el-input v-model="guideForm.contact" /></el-form-item>
                    <el-form-item label="联系电话"><el-input v-model="guideForm.phone" /></el-form-item>
                    <el-form-item label="寄出物流公司"><el-input v-model="guideForm.outboundExpressCompany" /></el-form-item>
                    <el-form-item label="寄出物流单号"><el-input v-model="guideForm.outboundTrackingNo" /></el-form-item>
                  </div>
                  <el-form-item label="地址"><el-input v-model="guideForm.address" /></el-form-item>
                  <el-form-item label="整体故障描述"><el-input v-model="guideForm.faultDescription" type="textarea" :rows="4" /></el-form-item>
                </el-form>
                <div class="inline-actions">
                  <el-button @click="guideStep = 5">上一步</el-button>
                  <el-button type="primary" :icon="CircleCheck" @click="submitGuideRequest">提交维修申请</el-button>
                </div>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="工作台" name="desk">
            <div class="tab-body">
              <div class="status-flow">
                <div class="flow-step"><strong>1 代理商申请</strong>多零件明细</div>
                <div class="flow-step"><strong>2 保修提示</strong>绑定和在保判断</div>
                <div class="flow-step"><strong>3 工厂审核</strong>通过生成工单</div>
                <div class="flow-step"><strong>4 维修处理</strong>检测和结果登记</div>
                <div class="flow-step"><strong>5 编号更换</strong>更新绑定关系</div>
                <div class="flow-step"><strong>6 物流归档</strong>寄回和完成</div>
              </div>
              <div class="split">
                <div class="panel">
                  <div class="section-title"><div><h2>待处理申请</h2><p>工厂审核员关注这些单据</p></div><el-button type="primary" :icon="Plus" @click="activeTab = 'new'">新建</el-button></div>
                  <el-table :data="pendingRequests" height="320">
                    <el-table-column prop="requestNo" label="申请单" width="110" />
                    <el-table-column prop="customerName" label="客户" min-width="140" />
                    <el-table-column prop="machineNo" label="机床编号" min-width="150" />
                    <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button size="small" type="primary" @click="openAudit(row)">审核</el-button></template></el-table-column>
                  </el-table>
                </div>
                <div class="panel">
                  <div class="section-title"><div><h2>活动工单</h2><p>维修部当前需要推进的工单</p></div><el-button :icon="Tickets" @click="activeTab = 'orders'">查看全部</el-button></div>
                  <el-table :data="activeOrders" height="320">
                    <el-table-column prop="workOrderNo" label="工单" width="110" />
                    <el-table-column prop="request.customerName" label="客户" min-width="140" />
                    <el-table-column prop="department" label="部门" width="110" />
                    <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag></template></el-table-column>
                    <el-table-column label="操作" width="180" fixed="right"><template #default="{ row }"><el-button size="small" @click="openResult(row)">维修</el-button><el-button size="small" @click="openLogistics(row)" :disabled="row.status !== '待寄回'">物流</el-button></template></el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="工厂审核" name="review">
            <div class="tab-body">
              <div class="section-title"><div><h2>维修申请列表</h2><p>审核时可查看系统给出的保修和绑定提示</p></div></div>
              <el-table :data="requests" row-key="requestNo">
                <el-table-column prop="requestNo" label="申请单" width="110" />
                <el-table-column prop="agent" label="代理商" min-width="150" />
                <el-table-column prop="customerName" label="客户" min-width="140" />
                <el-table-column prop="machineNo" label="机床编号" min-width="150" />
                <el-table-column label="保修提示" min-width="220"><template #default="{ row }"><el-space wrap><el-tag v-for="detail in row.details" :key="detail.id" :type="statusTag(detail.warrantyResult)">{{ detail.serialNo }} {{ detail.warrantyResult }}</el-tag></el-space></template></el-table-column>
                <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag></template></el-table-column>
                <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button size="small" type="primary" @click="openAudit(row)" :disabled="row.status !== '待审核'">审核</el-button></template></el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="维修工单" name="orders">
            <div class="tab-body">
              <div class="section-title"><div><h2>维修工单</h2><p>由审核通过自动生成</p></div></div>
              <el-table :data="workOrders" row-key="workOrderNo">
                <el-table-column prop="workOrderNo" label="工单" width="110" />
                <el-table-column prop="requestNo" label="来源申请" width="110" />
                <el-table-column prop="request.customerName" label="客户" min-width="140" />
                <el-table-column prop="department" label="维修部门" width="120" />
                <el-table-column prop="repairPerson" label="维修人员" width="120" />
                <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag></template></el-table-column>
                <el-table-column prop="repairResult" label="维修结果" min-width="120" />
                <el-table-column label="物流" min-width="150"><template #default="{ row }">{{ row.logistics?.trackingNo || '未登记' }}</template></el-table-column>
                <el-table-column label="操作" width="280" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" @click="acceptOrder(row)" :disabled="row.status !== '待接单'">接单</el-button>
                    <el-button size="small" type="primary" @click="openResult(row)">维修</el-button>
                    <el-button size="small" @click="openLogistics(row)" :disabled="row.status !== '待寄回'">物流</el-button>
                    <el-button size="small" type="success" @click="archiveOrder(row)" :disabled="row.status !== '已寄回'">归档</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="基础资料" name="master">
            <div class="tab-body split">
              <div>
                <div class="panel">
                  <div class="section-title"><h2>新增物料档案</h2></div>
                  <el-form label-position="top">
                    <div class="form-row">
                      <el-form-item label="物料编码"><el-input v-model="materialForm.materialCode" /></el-form-item>
                      <el-form-item label="物料名称"><el-input v-model="materialForm.name" /></el-form-item>
                      <el-form-item label="类型"><el-select v-model="materialForm.type"><el-option label="板卡" value="板卡" /><el-option label="驱动器" value="驱动器" /><el-option label="电机" value="电机" /><el-option label="传感器" value="传感器" /></el-select></el-form-item>
                      <el-form-item label="默认保修月数"><el-input-number v-model="materialForm.defaultWarrantyMonths" :min="0" style="width: 100%" /></el-form-item>
                    </div>
                    <el-form-item label="规格型号"><el-input v-model="materialForm.spec" /></el-form-item>
                    <div class="inline-actions"><el-button type="primary" :icon="Plus" @click="createMaterial">保存物料</el-button></div>
                  </el-form>
                </div>
                <div class="panel">
                  <div class="section-title"><h2>新增物料实例</h2></div>
                  <div class="form-row">
                    <el-input v-model="instanceForm.serialNo" placeholder="实例编号" />
                    <el-select v-model="instanceForm.materialCode" filterable><el-option v-for="item in master.materials" :key="item.materialCode" :label="`${item.materialCode} ${item.name}`" :value="item.materialCode" /></el-select>
                    <el-input v-model="instanceForm.batchNo" placeholder="批次号" />
                    <el-select v-model="instanceForm.status"><el-option label="备用" value="备用" /><el-option label="在机" value="在机" /><el-option label="送修" value="送修" /></el-select>
                  </div>
                  <div class="inline-actions" style="margin-top: 12px"><el-button type="primary" :icon="Plus" @click="createInstance">保存实例</el-button></div>
                </div>
                <div class="panel">
                  <div class="section-title"><h2>新增绑定关系</h2></div>
                  <div class="form-row">
                    <el-select v-model="bindingForm.machineNo" filterable><el-option v-for="item in master.machines" :key="item.machineNo" :label="item.machineNo" :value="item.machineNo" /></el-select>
                    <el-select v-model="bindingForm.serialNo" filterable><el-option v-for="item in master.materialInstances" :key="item.serialNo" :label="`${item.serialNo} ${item.material?.name || ''}`" :value="item.serialNo" /></el-select>
                    <el-input v-model="bindingForm.position" placeholder="绑定位置" />
                    <el-input v-model="bindingForm.source" placeholder="来源" />
                  </div>
                  <div class="inline-actions" style="margin-top: 12px"><el-button type="primary" :icon="Connection" @click="createBinding">保存绑定</el-button></div>
                </div>
              </div>
              <div>
                <div class="panel">
                  <div class="section-title"><h2>机型字典</h2></div>
                  <el-table :data="modelDictionary" height="180"><el-table-column prop="code" label="编码" /><el-table-column prop="name" label="机型" /><el-table-column prop="source" label="来源" /></el-table>
                </div>
                <div class="panel">
                  <div class="section-title"><h2>当前有效绑定</h2></div>
                  <el-table :data="master.bindings.filter((item) => item.active)" height="260"><el-table-column prop="machineNo" label="机床编号" /><el-table-column prop="serialNo" label="实例编号" /><el-table-column prop="position" label="位置" /></el-table>
                </div>
                <div class="panel">
                  <div class="section-title"><h2>V8 同步任务</h2></div>
                  <div class="form-row"><el-input v-model="syncForm.source" placeholder="来源" /><el-input v-model="syncForm.summary" placeholder="摘要" /></div>
                  <div class="inline-actions" style="margin: 12px 0"><el-button :icon="DataLine" @click="createSyncTask">记录同步</el-button></div>
                  <el-table :data="syncTasks" height="150"><el-table-column prop="id" label="任务" /><el-table-column prop="summary" label="摘要" /></el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="报表日志" name="reports">
            <div class="tab-body">
              <div class="result-grid">
                <div class="panel"><div class="section-title"><h2>保修判断统计</h2></div><div v-for="(count, key) in overview.warrantyStats" :key="key" class="stat-line"><span>{{ key }}</span><el-tag :type="statusTag(key)">{{ count }}</el-tag></div></div>
                <div class="panel"><div class="section-title"><h2>代理商统计</h2></div><div v-for="item in overview.byAgent" :key="item.agent" class="stat-line"><span>{{ item.agent }}</span><span>申请 {{ item.total }} / 异常 {{ item.abnormal }}</span></div></div>
                <div class="panel"><div class="section-title"><h2>零件类型统计</h2></div><div v-for="(count, key) in overview.byMaterialType" :key="key" class="stat-line"><span>{{ key }}</span><span>{{ count }}</span></div></div>
              </div>
              <div class="panel" style="margin-top: 14px"><div class="section-title"><h2>操作日志</h2></div><div class="log-list"><div v-for="log in overview.recentLogs" :key="log.id" class="log-item"><strong>{{ log.action }} · {{ log.targetNo }}</strong><span class="muted">{{ log.operator }} / {{ log.createdAt }} / {{ log.note }}</span></div></div></div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>
    </main>

    <el-dialog v-model="modelDialog" width="880px" class="model-dialog" :show-close="false">
      <button class="dialog-close" @click="modelDialog = false"><el-icon><Close /></el-icon></button>
      <div class="model-picker">
        <div class="model-visual">
          <el-icon><Monitor /></el-icon>
          <strong>{{ selectedModel?.name }}</strong>
        </div>
        <div class="model-options">
          <h2>{{ selectedModel?.name }}</h2>
          <label>选择机型</label>
          <el-select v-model="guideForm.modelCode" size="large" filterable style="width: 100%">
            <el-option v-for="model in modelDictionary" :key="`${model.source}-${model.id}`" :label="`${model.name} ${model.code}`" :value="model.code" @click="guideForm.modelName = model.name" />
          </el-select>
          <label>选择保修状态</label>
          <el-radio-group v-model="guideForm.warrantyScope" class="warranty-radio">
            <el-radio-button label="in">保修期内</el-radio-button>
            <el-radio-button label="out">不在保修期内</el-radio-button>
          </el-radio-group>
          <div class="dialog-divider"></div>
          <el-button type="primary" size="large" round @click="confirmModel">下一步，选择需要的服务</el-button>
        </div>
      </div>
    </el-dialog>

    <el-drawer v-model="auditDrawer" size="520px" title="工厂审核">
      <div v-if="selectedRequest">
        <div class="drawer-block">
          <h3>{{ selectedRequest.requestNo }} · {{ selectedRequest.customerName }}</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="机床编号">{{ selectedRequest.machineNo }}</el-descriptions-item>
            <el-descriptions-item label="故障描述">{{ selectedRequest.faultDescription }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="drawer-block">
          <h3>保修提示</h3>
          <el-table :data="selectedRequest.details">
            <el-table-column prop="serialNo" label="编号" />
            <el-table-column prop="materialName" label="物料" />
            <el-table-column label="结果"><template #default="{ row }"><el-tag :type="statusTag(row.warrantyResult)">{{ row.warrantyResult }}</el-tag></template></el-table-column>
          </el-table>
        </div>
        <el-form label-position="top">
          <el-form-item label="维修部门"><el-select v-model="auditForm.department"><el-option label="电器维修" value="电器维修" /><el-option label="机械维修" value="机械维修" /><el-option label="研发处理" value="研发处理" /></el-select></el-form-item>
          <el-form-item label="审核意见"><el-input v-model="auditForm.comment" type="textarea" :rows="4" /></el-form-item>
        </el-form>
        <div class="inline-actions"><el-button @click="submitAudit('补充资料')">补充资料</el-button><el-button type="danger" @click="submitAudit('驳回')">驳回</el-button><el-button type="primary" @click="submitAudit('通过')">通过并生成工单</el-button></div>
      </div>
    </el-drawer>

    <el-drawer v-model="resultDrawer" size="560px" title="维修结果登记">
      <el-form v-if="selectedOrder" label-position="top">
        <el-form-item label="维修人员"><el-input v-model="resultForm.repairPerson" /></el-form-item>
        <el-form-item label="检测结果"><el-input v-model="resultForm.detectionResult" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="维修方案"><el-input v-model="resultForm.repairPlan" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="维修结果"><el-select v-model="resultForm.repairResult"><el-option label="已修复" value="已修复" /><el-option label="无法维修" value="无法维修" /><el-option label="检测无故障" value="检测无故障" /><el-option label="建议更换" value="建议更换" /><el-option label="转研发处理" value="转研发处理" /></el-select></el-form-item>
        <el-form-item label="是否更换零件"><el-switch v-model="resultForm.replaced" /></el-form-item>
        <div v-if="resultForm.replaced" class="detail-item"><div class="form-row"><el-input v-model="resultForm.replacements[0].oldSerialNo" placeholder="旧件编号" /><el-input v-model="resultForm.replacements[0].newSerialNo" placeholder="新件编号" /><el-input v-model="resultForm.replacements[0].position" placeholder="安装位置" /><el-input v-model="resultForm.replacements[0].reason" placeholder="更换原因" /></div></div>
        <div class="inline-actions" style="margin-top: 14px"><el-button type="primary" :icon="CircleCheck" @click="submitRepairResult">保存维修结果</el-button></div>
      </el-form>
    </el-drawer>

    <el-drawer v-model="logisticsDrawer" size="520px" title="寄回物流登记">
      <el-form v-if="selectedOrder" label-position="top">
        <div class="form-row">
          <el-select v-model="logisticsForm.returnMethod"><el-option label="快递" value="快递" /><el-option label="随车带回" value="随车带回" /><el-option label="自提" value="自提" /></el-select>
          <el-input v-model="logisticsForm.company" placeholder="快递公司" />
          <el-input v-model="logisticsForm.trackingNo" placeholder="快递单号" />
          <el-date-picker v-model="logisticsForm.sentAt" value-format="YYYY-MM-DD" style="width: 100%" />
          <el-input v-model="logisticsForm.receiver" placeholder="收件人" />
          <el-input v-model="logisticsForm.phone" placeholder="电话" />
        </div>
        <el-form-item label="收件地址" style="margin-top: 12px"><el-input v-model="logisticsForm.address" /></el-form-item>
        <div class="inline-actions"><el-button type="primary" :icon="Position" @click="submitLogistics">保存物流</el-button></div>
      </el-form>
    </el-drawer>
  </div>
</template>
