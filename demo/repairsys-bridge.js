(function connectRepairSystem() {
  const config = window.RUIJUN_SITE_CONFIG?.repairsys;
  if (!config) return;

  const entryLinks = [...document.querySelectorAll('[data-repair-entry]')];
  const aiPromptLinks = [...document.querySelectorAll('[data-ai-question]')];
  const aiOpenLinks = [...document.querySelectorAll('[data-ai-open]')];
  const entryLabels = Object.freeze({
    support: '售后服务首页',
    request: '发起维修申请',
    requests: '维修进度查询',
    warranty: '保修状态核验'
  });
  const suggestions = Object.freeze({
    support: ['如何发起维修申请', '维修进度在哪里查询', '如何核验保修状态', '报修前需要准备哪些资料'],
    request: ['报修前需要准备哪些资料', '如何发起维修申请', '维修进度在哪里查询'],
    requests: ['维修进度在哪里查询', '维修申请包含哪些处理状态', '报修前需要准备哪些资料'],
    warranty: ['如何核验保修状态', '核验保修需要哪些资料', '报修前需要准备哪些资料']
  });

  const launcher = document.createElement('button');
  launcher.className = 'service-ai-launcher is-visible';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', '打开瑞钧 AI 客服');
  launcher.innerHTML = '<span class="service-ai-launcher__status" aria-hidden="true"></span><span><b>AI 服务助手</b><small>维修 · 保修 · 进度</small></span>';
  document.body.appendChild(launcher);

  const dialog = document.createElement('dialog');
  dialog.className = 'repair-exit-dialog service-ai-dialog';
  dialog.setAttribute('aria-labelledby', 'service-ai-title');
  dialog.innerHTML = `
    <header class="service-ai-head">
      <span class="service-ai-mark" aria-hidden="true">R</span>
      <div><h2 id="service-ai-title">瑞钧服务助手</h2><p><i aria-hidden="true"></i> 在线 · 官网流程问答</p></div>
      <button class="dialog-close" type="button" aria-label="关闭 AI 客服" data-repair-close>×</button>
    </header>
    <section class="service-ai-panel" data-faq-panel>
      <div class="service-ai-feed" role="log" aria-live="polite" aria-atomic="true" data-faq-feed></div>
      <div class="service-ai-quick-head"><b>常用服务</b><span>选择一个问题快速开始</span></div>
      <div class="service-ai-suggestions" aria-label="常用服务" data-faq-suggestions></div>
      <form class="service-ai-form" data-faq-form>
        <label class="sr-only" for="service-ai-question">输入问题</label>
        <input id="service-ai-question" name="question" type="text" maxlength="300" autocomplete="off" placeholder="输入你的问题" />
        <button type="submit" aria-label="发送问题" title="发送问题">→</button>
      </form>
      <p class="service-ai-error" role="alert" data-faq-error></p>
      <div class="service-ai-actions">
        <button type="button" class="service-ai-resolved" data-repair-close>关闭对话</button>
        <button type="button" class="service-ai-escalate" data-show-escalation>查看下一步 <span aria-hidden="true">→</span></button>
      </div>
    </section>
    <section class="service-ai-panel service-ai-escalation" data-escalation-panel hidden>
      <button class="service-ai-back" type="button" data-back-to-faq>← 返回 AI 客服</button>
      <div class="service-ai-route-icon" aria-hidden="true">→</div>
      <p class="repair-exit-kicker">RUIJUN REPAIR APPLICATION</p>
      <h2>前往<span data-entry-label>售后服务首页</span></h2>
      <p class="repair-exit-copy">AI 会先协助你确认办理步骤。维修系统仅用于提交申请、核验保修和查询进度，不提供实时人工对话。</p>
      <p class="repair-exit-status" role="status" data-repair-status>准备检查维修申请系统...</p>
      <div class="repair-exit-actions">
        <a class="repair-exit-confirm" href="#" target="_blank" rel="noopener noreferrer" data-repair-confirm aria-disabled="true">进入服务中心 →</a>
        <button type="button" data-back-to-faq>继续咨询 AI 客服</button>
      </div>
      <p class="repair-exit-fallback">安全风险、紧急停机或无法提交：<a href="tel:15050166844">${config.supportPhone}</a></p>
    </section>
  `;
  document.body.appendChild(dialog);

  const faqPanel = dialog.querySelector('[data-faq-panel]');
  const escalationPanel = dialog.querySelector('[data-escalation-panel]');
  const feed = dialog.querySelector('[data-faq-feed]');
  const suggestionList = dialog.querySelector('[data-faq-suggestions]');
  const form = dialog.querySelector('[data-faq-form]');
  const input = form.elements.question;
  const error = dialog.querySelector('[data-faq-error]');
  const confirmLink = dialog.querySelector('[data-repair-confirm]');
  const status = dialog.querySelector('[data-repair-status]');
  const entryLabel = dialog.querySelector('[data-entry-label]');
  const fallback = dialog.querySelector('.repair-exit-fallback');
  const escalationKicker = dialog.querySelector('.repair-exit-kicker');
  const escalationCopy = dialog.querySelector('.repair-exit-copy');
  let availabilityRequest = 0;
  let serviceEntries = null;
  let currentEntry = 'support';
  let currentModelCode = '';
  let currentIntent = 'repair';

  function entryUrl(entry, modelCode = '') {
    const configuredUrl = serviceEntries?.entries?.[entry];
    const route = configuredUrl || config.routes[entry] || config.routes.support;
    const url = new URL(route, `${config.baseUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('source', config.source);
    const requestedModel = String(modelCode).trim();
    if (['request', 'warranty'].includes(entry) && requestedModel) url.searchParams.set('modelCode', requestedModel);
    return url.toString();
  }

  function createText(className, text) {
    const element = document.createElement('p');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderWelcome() {
    dialog.classList.remove('has-answer');
    feed.replaceChildren();
    const welcome = document.createElement('div');
    welcome.className = 'service-ai-welcome';
    welcome.innerHTML = '<span class="service-ai-avatar" aria-hidden="true">R</span><div><b>你好，我是瑞钧服务助手</b><p>我可以先帮你确认报修资料、维修进度和保修办理流程。</p></div>';
    feed.appendChild(welcome);
  }

  function renderLoading(question) {
    dialog.classList.add('has-answer');
    feed.replaceChildren();
    const questionBlock = document.createElement('div');
    questionBlock.className = 'service-ai-current-question';
    questionBlock.append(createText('service-ai-label', '你的问题'), createText('service-ai-question-text', question));
    const loading = document.createElement('div');
    loading.className = 'service-ai-answer-card is-loading';
    loading.innerHTML = '<span class="service-ai-avatar" aria-hidden="true">R</span><div><p>正在查找已审核的服务信息...</p></div>';
    feed.append(questionBlock, loading);
  }

  function renderAnswer(question, result) {
    dialog.classList.add('has-answer');
    feed.replaceChildren();
    const questionBlock = document.createElement('div');
    questionBlock.className = 'service-ai-current-question';
    questionBlock.append(createText('service-ai-label', '你的问题'), createText('service-ai-question-text', question));

    const answerCard = document.createElement('div');
    answerCard.className = `service-ai-answer-card${result.matched ? '' : ' is-fallback'}`;
    const avatar = document.createElement('span');
    avatar.className = 'service-ai-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = 'R';
    const answerBody = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = result.title || '服务信息';
    answerBody.appendChild(title);
    if (Array.isArray(result.steps) && result.steps.length) {
      const list = document.createElement('ol');
      result.steps.forEach((step) => {
        const item = document.createElement('li');
        item.textContent = step;
        list.appendChild(item);
      });
      answerBody.appendChild(list);
    } else {
      answerBody.appendChild(createText('', result.answer));
    }
    if (result.note) answerBody.appendChild(createText('service-ai-answer-note', result.note));
    answerCard.append(avatar, answerBody);
    feed.append(questionBlock, answerCard);
  }

  function renderSuggestions(entry) {
    suggestionList.replaceChildren();
    (suggestions[entry] || suggestions.support).forEach((question, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('b');
      label.textContent = question;
      button.append(number, label);
      button.addEventListener('click', () => askQuestion(question));
      suggestionList.appendChild(button);
    });
  }

  function showFaq() {
    faqPanel.hidden = false;
    escalationPanel.hidden = true;
    window.setTimeout(() => input.focus(), 60);
  }

  function setAvailable(available) {
    confirmLink.setAttribute('aria-disabled', String(!available));
    confirmLink.classList.toggle('is-disabled', !available);
    status.classList.toggle('is-error', !available);
    status.textContent = available ? '在线服务连接正常' : '在线系统暂时无法连接，请电话联系售后';
  }

  async function checkAvailability(requestId) {
    if (!navigator.onLine) {
      if (requestId === availabilityRequest) setAvailable(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(config.serviceEntriesEndpoint, { method: 'GET', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Service entries failed: ${response.status}`);
      serviceEntries = await response.json();
      if (requestId === availabilityRequest) {
        confirmLink.href = entryUrl(currentEntry, currentModelCode);
        setAvailable(Boolean(serviceEntries.available));
      }
    } catch {
      if (requestId === availabilityRequest) setAvailable(false);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function showEscalation() {
    faqPanel.hidden = true;
    escalationPanel.hidden = false;
    if (currentIntent === 'sales' || currentIntent === 'visit') {
      const isVisit = currentIntent === 'visit';
      escalationKicker.textContent = isVisit ? 'RUIJUN FACTORY VISIT' : 'RUIJUN SALES CONSULTATION';
      entryLabel.textContent = isVisit ? '工厂来访咨询' : '销售顾问';
      escalationCopy.textContent = isVisit
        ? '请先与销售顾问确认来访时间、接待工厂和参观安排。'
        : '销售顾问将根据你的加工任务和设备需求，提供后续方案沟通。';
      confirmLink.href = 'tel:13738375470';
      confirmLink.dataset.entry = currentIntent;
      confirmLink.textContent = isVisit ? '联系来访接待 →' : '拨打销售电话 →';
      confirmLink.removeAttribute('target');
      confirmLink.removeAttribute('rel');
      confirmLink.setAttribute('aria-disabled', 'false');
      confirmLink.classList.remove('is-disabled');
      status.classList.remove('is-error');
      status.textContent = '销售咨询：137 3837 5470';
      fallback.innerHTML = '也可发送邮件：<a href="mailto:ksrjjx@126.com">ksrjjx@126.com</a>';
      return;
    }
    const repairEntryContent = {
      support: {
        label: '售后服务中心',
        action: '打开售后服务中心 →',
        copy: 'AI 已说明官网可提供的流程信息。下一步可在售后服务中心选择维修申请、保修核验或进度查询；该系统仅处理工单，不提供实时人工对话。'
      },
      request: {
        label: '提交维修申请',
        action: '开始填写维修申请 →',
        copy: 'AI 已帮你确认提交前需要准备的资料。下一步将在独立售后系统填写设备、故障和联系人信息并提交维修申请；该系统不提供实时人工对话。'
      },
      requests: {
        label: '查询维修进度',
        action: '查询维修申请进度 →',
        copy: 'AI 已说明查询步骤。下一步将在独立售后系统核验身份后查看审核、补充资料、维修与寄回状态；该系统不提供实时人工对话。'
      },
      warranty: {
        label: '核验保修状态',
        action: '开始保修核验 →',
        copy: 'AI 已确认核验所需的设备型号和机床编号。下一步将在独立售后系统提交信息并查看保修结果；该系统不提供实时人工对话。'
      }
    };
    const repairEntry = repairEntryContent[currentEntry] || repairEntryContent.support;
    escalationKicker.textContent = 'RUIJUN REPAIR APPLICATION';
    entryLabel.textContent = repairEntry.label;
    escalationCopy.textContent = repairEntry.copy;
    confirmLink.href = entryUrl(currentEntry, currentModelCode);
    confirmLink.dataset.entry = currentEntry;
    confirmLink.textContent = repairEntry.action;
    confirmLink.target = '_blank';
    confirmLink.rel = 'noopener noreferrer';
    confirmLink.setAttribute('aria-disabled', 'true');
    confirmLink.classList.add('is-disabled');
    status.classList.remove('is-error');
    status.textContent = '正在检查维修申请系统...';
    fallback.innerHTML = `安全风险、紧急停机或无法提交：<a href="tel:15050166844">${config.supportPhone}</a>`;
    availabilityRequest += 1;
    checkAvailability(availabilityRequest);
  }

  async function askQuestion(question) {
    const value = String(question || '').trim();
    if (!value) {
      error.textContent = '请先输入一个问题。';
      input.focus();
      return;
    }
    error.textContent = '';
    input.value = '';
    renderLoading(value);
    form.classList.add('is-loading');
    try {
      const response = await fetch(config.faqAnswerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: currentEntry, question: value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '服务暂时不可用');
      renderAnswer(value, result);
      if (result.suggestedAction && entryLabels[result.suggestedAction]) {
        currentEntry = result.suggestedAction;
        currentIntent = 'repair';
      } else if (['sales', 'visit'].includes(result.suggestedAction)) {
        currentIntent = result.suggestedAction;
      }
    } catch {
      renderAnswer(value, {
        matched: false,
        title: '问答服务暂时不可用',
        steps: ['整理设备型号、机床编号和故障现象', '进入维修系统提交申请', '安全风险或紧急停机时拨打 150 5016 6844'],
        note: '已经输入的官网页面内容不会自动提交为维修申请。'
      });
    } finally {
      form.classList.remove('is-loading');
    }
  }

  function openFaq(entry = 'support', modelCode = '') {
    currentEntry = entryLabels[entry] ? entry : 'support';
    currentModelCode = modelCode || '';
    currentIntent = 'repair';
    renderWelcome();
    renderSuggestions(currentEntry);
    error.textContent = '';
    showFaq();
    if (!dialog.open) dialog.show();
    launcher.classList.add('is-panel-open');
  }

  function closeFaq() {
    if (dialog.open) dialog.close();
  }

  entryLinks.forEach((link) => {
    link.href = entryUrl(link.dataset.repairEntry, link.dataset.modelCode);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openFaq(link.dataset.repairEntry, link.dataset.modelCode);
    });
  });

  aiPromptLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openFaq('support');
      askQuestion(link.dataset.aiQuestion);
    });
  });

  aiOpenLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openFaq(link.dataset.aiOpen || 'support');
    });
  });

  launcher.addEventListener('click', () => openFaq('support'));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    askQuestion(input.value);
  });
  dialog.querySelector('[data-show-escalation]').addEventListener('click', showEscalation);
  dialog.querySelectorAll('[data-back-to-faq]').forEach((button) => button.addEventListener('click', showFaq));
  dialog.querySelectorAll('[data-repair-close]').forEach((button) => button.addEventListener('click', closeFaq));
  confirmLink.addEventListener('click', (event) => {
    if (confirmLink.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }
    if (entryLabels[confirmLink.dataset.entry]) {
      const payload = JSON.stringify({ entry: confirmLink.dataset.entry, pagePath: window.location.pathname });
      if (!navigator.sendBeacon?.(config.analyticsEndpoint, new Blob([payload], { type: 'application/json' }))) {
        fetch(config.analyticsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
      }
    }
    closeFaq();
  });
  dialog.addEventListener('close', () => launcher.classList.remove('is-panel-open'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.open) closeFaq();
  });
})();
