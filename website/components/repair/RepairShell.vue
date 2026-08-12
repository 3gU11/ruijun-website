<script setup lang="ts">
const props = withDefaults(defineProps<{ title: string; eyebrow?: string; intro?: string }>(), { eyebrow: 'AFTER-SALES SERVICE', intro: '' });
const { data: me, refresh } = await useFetch('/api/repair/auth/me', { default: () => null });
const route = useRoute();
const menuOpen = ref(false);
const form = reactive({ username: '', password: '', name: '', phone: '' });
const authMode = ref<'login' | 'register'>('login');
const authError = ref('');
const authLoading = ref(false);
async function submitAuth() {
  authError.value = ''; authLoading.value = true;
  try {
    await $fetch(`/api/repair/auth/${authMode.value}`, { method: 'POST', body: form });
    await refresh(); menuOpen.value = false;
  } catch (error: any) { authError.value = error?.data?.message || '登录失败，请稍后再试'; }
  finally { authLoading.value = false; }
}
async function logout() { await $fetch('/api/repair/auth/logout', { method: 'POST' }); await refresh(); }
const isCurrent = (path: string) => route.path === path;
</script>

<template>
  <div class="repair-app">
    <SiteHeader />
    <main class="repair-main">
      <section class="repair-hero"><p>{{ eyebrow }}</p><h1>{{ title }}</h1><span v-if="intro">{{ intro }}</span></section>
      <nav class="repair-nav" aria-label="售后服务导航">
        <NuxtLink to="/repair" :class="{ active: isCurrent('/repair') }">服务中心</NuxtLink>
        <NuxtLink to="/repair/new" :class="{ active: isCurrent('/repair/new') }">提交报修</NuxtLink>
        <NuxtLink to="/repair/warranty" :class="{ active: isCurrent('/repair/warranty') }">保修查询</NuxtLink>
        <NuxtLink to="/repair/requests" :class="{ active: isCurrent('/repair/requests') }">维修进度</NuxtLink>
        <button v-if="me" type="button" @click="logout">退出 {{ me.name || me.username }}</button>
        <button v-else type="button" @click="menuOpen = true">登录 / 注册</button>
      </nav>
      <slot :user="me" />
    </main>
    <div v-if="menuOpen" class="auth-layer" @click.self="menuOpen = false"><form class="auth-card" @submit.prevent="submitAuth">
      <button class="auth-close" type="button" aria-label="关闭" @click="menuOpen = false">×</button>
      <p>{{ authMode === 'login' ? '客户登录' : '注册售后账号' }}</p><h2>{{ authMode === 'login' ? '继续查看您的服务进度' : '创建售后服务账号' }}</h2>
      <input v-model.trim="form.username" required placeholder="用户名" autocomplete="username"><input v-model="form.password" required minlength="6" type="password" placeholder="密码" autocomplete="current-password">
      <template v-if="authMode === 'register'"><input v-model.trim="form.name" required placeholder="姓名"><input v-model.trim="form.phone" required placeholder="手机号码"></template>
      <p v-if="authError" class="form-error">{{ authError }}</p><button class="primary" :disabled="authLoading">{{ authLoading ? '处理中…' : authMode === 'login' ? '登录' : '注册' }}</button>
      <button class="text-button" type="button" @click="authMode = authMode === 'login' ? 'register' : 'login'; authError = ''">{{ authMode === 'login' ? '还没有账号？注册' : '已有账号？登录' }}</button>
    </form></div>
  </div>
</template>

<style scoped>
.repair-app{min-height:100vh;background:#f5f5f3;color:#151515}.repair-main{padding:112px max(6.2%,calc((100% - 1280px)/2)) 72px}.repair-hero{max-width:720px;padding:40px 0 44px}.repair-hero p{margin:0 0 12px;color:#e51b23;letter-spacing:.16em;font-size:12px}.repair-hero h1{margin:0;font-size:clamp(36px,5vw,66px);font-weight:400;line-height:1.1}.repair-hero span{display:block;margin-top:18px;color:#646464}.repair-nav{display:flex;gap:8px;flex-wrap:wrap;padding:13px 0;border-top:1px solid #d7d7d4;border-bottom:1px solid #d7d7d4}.repair-nav a,.repair-nav button{padding:8px 13px;border:0;background:transparent;color:#606060;text-decoration:none;cursor:pointer}.repair-nav .active,.repair-nav a:hover{color:#fff;background:#171717}.repair-nav button:last-child{margin-left:auto;color:#e51b23}.auth-layer{position:fixed;z-index:300;inset:0;display:grid;place-items:center;padding:20px;background:rgb(0 0 0/.45)}.auth-card{position:relative;width:min(100%,430px);display:grid;gap:12px;padding:34px;background:#fff;box-shadow:0 20px 70px rgb(0 0 0/.25)}.auth-card p{margin:0;color:#777}.auth-card h2{margin:0 0 12px;font-weight:400;font-size:27px}.auth-card input{width:100%;padding:13px;border:1px solid #d5d5d2}.auth-close{position:absolute;right:13px;top:8px;border:0;background:none;font-size:28px;cursor:pointer}.primary{padding:13px;border:0;background:#e51b23;color:#fff;cursor:pointer}.text-button{border:0;background:none;color:#555;cursor:pointer}.form-error{color:#b11!important}@media(max-width:760px){.repair-main{padding:20px 20px 46px}.repair-hero{padding:40px 0 30px}.repair-nav a,.repair-nav button{font-size:13px;padding:7px 9px}.repair-nav button:last-child{margin-left:0}}
</style>
