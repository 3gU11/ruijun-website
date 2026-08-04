<script setup>
import { ArrowRight, Monitor, Setting } from '@element-plus/icons-vue';
</script>

<template>
  <div class="portal-shell">
    <div class="portal-panel">
      <div>
        <p class="portal-kicker">维修业务系统</p>
        <h1>请选择入口</h1>
        <p>客户和代理商从申请入口提交维修单；工厂人员从后台处理审核、维修、物流和资料维护。</p>
      </div>

      <div class="portal-grid">
        <a class="portal-card" href="/client.html">
          <el-icon><Monitor /></el-icon>
          <strong>客户端</strong>
          <span>新增维修申请、选择机型、填写物料和板号</span>
          <el-button type="primary" :icon="ArrowRight">进入申请</el-button>
        </a>
        <a class="portal-card" href="/admin.html">
          <el-icon><Setting /></el-icon>
          <strong>后台管理端</strong>
          <span>工厂审核、维修工单、物流登记、基础资料和报表</span>
          <el-button :icon="ArrowRight">进入后台</el-button>
        </a>
      </div>
    </div>
  </div>
</template>
