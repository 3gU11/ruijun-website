<script setup>
import { defineAsyncComponent, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus/es/components/message/index.mjs';
import 'element-plus/es/components/message/style/css';
import { api } from './api';

const AdminWorkspace = defineAsyncComponent(() => import('./AdminWorkspace.vue'));

const authLoading = ref(true);
const currentAdmin = ref(null);
const adminAuthMode = ref('login');
const roles = ref([]);
const adminLoginForm = reactive({ username: '', password: '' });
const adminRegisterForm = reactive({ username: '', password: '', name: '', role: 'Reviewer', contact: '', phone: '' });

function roleLabel(roleId) {
  const role = roles.value.find((item) => item.roleId === roleId);
  return role ? `${role.roleName || role.roleId} (${role.roleId})` : roleId;
}

async function loadAuthOptions() {
  const data = await api.adminAuthOptions();
  roles.value = data.roles || [];
}

async function submitAdminAuth() {
  authLoading.value = true;
  try {
    if (adminAuthMode.value === 'register') {
      await api.adminRegister(adminRegisterForm);
      ElMessage.success('后台注册申请已提交，请等待审核');
      adminAuthMode.value = 'login';
      adminRegisterForm.password = '';
      return;
    }

    currentAdmin.value = await api.adminLogin(adminLoginForm);
    ElMessage.success(`登录成功：${currentAdmin.value.name}`);
  } catch (error) {
    ElMessage.error(error.message || '登录失败');
  } finally {
    authLoading.value = false;
  }
}

async function restoreAdminSession() {
  try {
    await loadAuthOptions();
    currentAdmin.value = await api.me('admin');
  } catch (error) {
    if (error?.status && error.status !== 401) ElMessage.error(error.message || '后台服务暂不可用');
    currentAdmin.value = null;
  } finally {
    authLoading.value = false;
  }
}

onMounted(restoreAdminSession);
</script>

<template>
  <AdminWorkspace
    v-if="currentAdmin"
    :initial-admin="currentAdmin"
    @logout="currentAdmin = null"
  />

  <section v-else class="admin-auth-page">
    <div class="auth-copy">
      <h2>维修后台登录</h2>
      <p>后台账号经审核后，按身份与权限进入对应功能。</p>
    </div>
    <div class="auth-card">
      <div class="auth-switch">
        <button :class="{ active: adminAuthMode === 'login' }" @click="adminAuthMode = 'login'">登录</button>
        <button :class="{ active: adminAuthMode === 'register' }" @click="adminAuthMode = 'register'">注册申请</button>
      </div>
      <el-form label-position="top" @submit.prevent="submitAdminAuth">
        <template v-if="adminAuthMode === 'login'">
          <el-form-item label="账号"><el-input v-model="adminLoginForm.username" autocomplete="username" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="adminLoginForm.password" type="password" show-password autocomplete="current-password" @keyup.enter="submitAdminAuth" /></el-form-item>
        </template>
        <template v-else>
          <el-form-item label="账号"><el-input v-model="adminRegisterForm.username" autocomplete="username" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="adminRegisterForm.password" type="password" show-password autocomplete="new-password" /></el-form-item>
          <el-form-item label="姓名"><el-input v-model="adminRegisterForm.name" /></el-form-item>
          <el-form-item label="申请身份">
            <el-select v-model="adminRegisterForm.role" style="width: 100%">
              <el-option v-for="role in roles" :key="role.roleId" :label="roleLabel(role.roleId)" :value="role.roleId" />
            </el-select>
          </el-form-item>
          <div class="form-row compact">
            <el-form-item label="电话"><el-input v-model="adminRegisterForm.phone" /></el-form-item>
            <el-form-item label="备注/岗位"><el-input v-model="adminRegisterForm.contact" /></el-form-item>
          </div>
        </template>
        <el-button type="primary" native-type="submit" size="large" :loading="authLoading">
          {{ adminAuthMode === 'login' ? '登录后台' : '提交注册申请' }}
        </el-button>
      </el-form>
    </div>
  </section>
</template>
