<script setup>
import { Connection, DataLine, Plus } from '@element-plus/icons-vue';

defineProps({
  master: { type: Object, required: true },
  modelDictionary: { type: Array, required: true },
  machineBindingSource: { type: Object, required: true },
  materialForm: { type: Object, required: true },
  instanceForm: { type: Object, required: true },
  bindingForm: { type: Object, required: true },
  syncForm: { type: Object, required: true },
  syncTasks: { type: Array, required: true },
  boardQrCodes: { type: Array, required: true },
  boardQrForm: { type: Object, required: true }
});

defineEmits(['create-material', 'create-instance', 'create-binding', 'create-sync-task', 'issue-board-qr', 'revoke-board-qr']);
</script>

<template>
  <div class="tab-body split">
    <div>
      <div class="panel board-qr-codes">
        <div class="section-title"><div><h2>板卡二维码</h2><p>二维码只对应板卡实例，不包含客户资料。</p></div></div>
        <div class="form-row">
          <el-select v-model="boardQrForm.serialNo" filterable placeholder="选择板卡实例">
            <el-option v-for="item in master.materialInstances" :key="item.serialNo" :label="`${item.serialNo} ${item.material?.name || ''}`" :value="item.serialNo" />
          </el-select>
          <el-date-picker v-model="boardQrForm.expiresAt" value-format="YYYY-MM-DD HH:mm:ss" type="datetime" placeholder="有效期（可选）" style="width: 100%" />
        </div>
        <div class="inline-actions" style="margin: 12px 0"><el-button type="primary" :icon="Plus" @click="$emit('issue-board-qr')">签发二维码</el-button></div>
        <el-table :data="boardQrCodes" height="240">
          <el-table-column prop="id" label="编号" min-width="95" />
          <el-table-column prop="serialNo" label="板卡编号" min-width="130" />
          <el-table-column prop="issuedAt" label="签发时间" min-width="145" />
          <el-table-column prop="expiresAt" label="有效期" min-width="145"><template #default="{ row }">{{ row.expiresAt || '长期有效' }}</template></el-table-column>
          <el-table-column label="状态" width="85"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '有效' : '已作废' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button v-if="row.status === 'active'" text type="danger" @click="$emit('revoke-board-qr', row.id)">作废</el-button></template></el-table-column>
        </el-table>
      </div>
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
          <div class="inline-actions"><el-button type="primary" :icon="Plus" @click="$emit('create-material')">保存物料</el-button></div>
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
        <div class="inline-actions" style="margin-top: 12px"><el-button type="primary" :icon="Plus" @click="$emit('create-instance')">保存实例</el-button></div>
      </div>
      <div class="panel">
        <div class="section-title"><h2>新增绑定关系</h2></div>
        <div class="form-row">
          <el-select v-model="bindingForm.machineNo" filterable><el-option v-for="item in master.machines" :key="item.machineNo" :label="item.machineNo" :value="item.machineNo" /></el-select>
          <el-select v-model="bindingForm.serialNo" filterable><el-option v-for="item in master.materialInstances" :key="item.serialNo" :label="`${item.serialNo} ${item.material?.name || ''}`" :value="item.serialNo" /></el-select>
          <el-input v-model="bindingForm.position" placeholder="绑定位置" />
          <el-input v-model="bindingForm.source" placeholder="来源" />
        </div>
        <div class="inline-actions" style="margin-top: 12px"><el-button type="primary" :icon="Connection" @click="$emit('create-binding')">保存绑定</el-button></div>
      </div>
    </div>
    <div>
      <div class="panel">
        <div class="section-title"><h2>机型字典</h2></div>
        <el-table :data="modelDictionary" height="180"><el-table-column prop="code" label="编码" /><el-table-column prop="name" label="机型" /><el-table-column prop="source" label="来源" /></el-table>
      </div>
      <div class="panel">
        <div class="section-title"><div><h2>机台与零件绑定基础资料</h2><p>{{ machineBindingSource.source }}</p></div></div>
        <el-alert v-if="!machineBindingSource.deliveryDateColumn" type="warning" :closable="false" show-icon title="外部表暂未提供机台出库时间，匹配成功的申请会显示“出库时间待补充”" />
        <el-table :data="machineBindingSource.rows" height="360">
          <el-table-column prop="machineNo" label="机床编号" min-width="120" />
          <el-table-column prop="modelName" label="机型" min-width="140" />
          <el-table-column prop="componentSerialNo" label="零件编号" min-width="145" />
          <el-table-column prop="materialName" label="物料" min-width="120" />
          <el-table-column prop="positionName" label="位置" min-width="110" />
          <el-table-column label="机台出库时间" min-width="130"><template #default="{ row }">{{ row.deliveryDate || '待补充' }}</template></el-table-column>
          <el-table-column label="有效" width="70"><template #default="{ row }"><el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '是' : '否' }}</el-tag></template></el-table-column>
        </el-table>
      </div>
      <div class="panel">
        <div class="section-title"><h2>V8 同步任务</h2></div>
        <div class="form-row"><el-input v-model="syncForm.source" placeholder="来源" /><el-input v-model="syncForm.summary" placeholder="摘要" /></div>
        <div class="inline-actions" style="margin: 12px 0"><el-button :icon="DataLine" @click="$emit('create-sync-task')">记录同步</el-button></div>
        <el-table :data="syncTasks" height="150"><el-table-column prop="id" label="任务" /><el-table-column prop="summary" label="摘要" /></el-table>
      </div>
    </div>
  </div>
</template>
