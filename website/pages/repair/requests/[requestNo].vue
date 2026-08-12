<script setup lang="ts">
const route = useRoute();
const requestNo = computed(() => String(route.params.requestNo || '').trim());
useSeoMeta({ title: '维修申请详情', description: '查看维修申请的客户可见状态时间线和补充资料要求' });
</script>

<template>
  <RepairShell title="维修申请详情" intro="以下信息仅显示当前账号有权查看的客户可见状态。">
    <RepairInlinePanel mode="progress" :request-no="requestNo" @close="navigateTo('/repair/requests')" />
  </RepairShell>
</template>
