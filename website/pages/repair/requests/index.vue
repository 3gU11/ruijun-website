<script setup lang="ts">
useSeoMeta({ title: '我的维修申请', description: '查看本人维修申请、服务状态和补充资料要求' });
</script>

<template>
  <RepairShell title="我的维修申请" intro="登录后查看本人申请的审核、维修、寄回和完成状态。">
    <RepairInlinePanel mode="requests" @close="navigateTo('/service')" />
  </RepairShell>
</template>
