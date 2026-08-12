<script setup lang="ts">
const route = useRoute();
const model = computed(() => String(route.query.model || route.query.modelCode || '').trim());
useSeoMeta({ title: '提交维修申请', description: '提交设备维修申请并查看后续服务进度' });
</script>

<template>
  <RepairShell title="提交维修申请" intro="填写设备、物料和联系人信息，申请将进入售后审核流程。">
    <RepairInlinePanel mode="request" :model="model" @close="navigateTo('/service')" />
  </RepairShell>
</template>
