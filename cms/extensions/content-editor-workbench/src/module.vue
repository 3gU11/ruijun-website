<template>
  <private-view title="内容编辑工作台">
    <div class="editor-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">内容编辑工作台</p>
          <h2>官网内容编辑</h2>
          <p>按表单维护页面、产品、企业资料、服务支持和文章。保存只会更新草稿；审核与发布由对应负责人完成。</p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="guide-action" @click="helpOpen = !helpOpen">{{ helpOpen ? '收起操作说明' : '查看操作说明' }}</button>
          <button type="button" class="preview-action" :disabled="!previewAvailable" :title="previewAvailable ? '查看当前表单中的未保存修改' : '当前内容类型暂不支持画面预览'" @click="openPreview">预览当前草稿</button>
          <button type="button" class="website-preview-action" :disabled="!websitePreviewAvailable || websitePreviewOpening" :title="websitePreviewAvailable ? '保存草稿后，在真实官网版式中检查显示效果' : '请先选择一条未发布的草稿内容'" @click="openWebsitePreview">{{ websitePreviewOpening ? '正在打开官网预览...' : '在官网中预览草稿' }}</button>
          <span v-if="hasUnsavedChanges" class="unsaved-indicator" role="status">有未保存修改</span>
          <button type="button" :disabled="loading" @click="requestReload">重新加载</button>
        </div>
      </header>

      <section class="editor-guide" aria-label="使用说明">
        <div class="guide-heading"><strong>三步完成一次更新</strong><span>不需要懂代码，只需填写中文内容并检查预览。</span></div>
        <ol class="workflow-steps">
          <li><b>1</b><span><strong>编辑</strong><small>选择内容并填写文字、图片或参数</small></span></li>
          <li><b>2</b><span><strong>预览</strong><small>先检查当前修改；保存后可在官网画面中复核</small></span></li>
          <li><b>3</b><span><strong>送审</strong><small>提交后由审核和发布人员继续处理</small></span></li>
        </ol>
        <div v-if="helpOpen" class="guide-detail">
          <p><strong>字段怎么填？</strong>标题和正文直接填写访客要看到的中文；图片先在“媒体资产”登记；带锁、灰色或标注“高级”的字段通常不需要修改。</p>
          <p><strong>状态怎么理解？</strong>“草稿”只保存在后台，“审核中”等待负责人检查，“待发布”已经批准但还没有出现在官网，“已发布”才会对外展示。</p>
          <p><strong>怎样选择预览？</strong>“预览当前草稿”可立即检查未保存文字；保存草稿后使用“在官网中预览草稿”打开真实官网审核画面。两者都不会发布或改变审核状态。</p>
        </div>
        <span>草稿不会出现在官网；带锁或灰色的字段是系统记录或审核字段，不能在这里直接修改。</span>
      </section>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-else-if="message" class="message" role="status">{{ message }}</p>

      <nav class="workspace-tabs" aria-label="内容类型">
        <div class="tab-group primary-tabs" aria-label="常用内容">
          <span class="tab-group-label">常用内容</span>
          <button type="button" class="start-tab" :class="{ active: activeTab === 'home' }" :aria-current="activeTab === 'home' ? 'page' : undefined" @click="selectTab('home')">从这里开始</button>
          <button type="button" :class="{ active: activeTab === 'pages' }" :aria-current="activeTab === 'pages' ? 'page' : undefined" @click="selectTab('pages')">页面文案</button>
          <button type="button" :class="{ active: activeTab === 'series' }" :aria-current="activeTab === 'series' ? 'page' : undefined" @click="selectTab('series')">产品系列</button>
          <button type="button" :class="{ active: activeTab === 'company' }" :aria-current="activeTab === 'company' ? 'page' : undefined" @click="selectTab('company')">企业资料</button>
          <button v-if="technicalAccess" type="button" :class="{ active: activeTab === 'service' }" :aria-current="activeTab === 'service' ? 'page' : undefined" @click="selectTab('service')">服务支持</button>
          <button v-if="technicalAccess" type="button" :class="{ active: activeTab === 'repair' }" :aria-current="activeTab === 'repair' ? 'page' : undefined" @click="selectTab('repair')">售后页面配置</button>
          <button type="button" :class="{ active: activeTab === 'editorial' }" :aria-current="activeTab === 'editorial' ? 'page' : undefined" @click="selectTab('editorial')">文章与案例</button>
          <button type="button" :class="{ active: activeTab === 'submit' }" :aria-current="activeTab === 'submit' ? 'page' : undefined" @click="selectTab('submit')">提交审核</button>
        </div>
        <div v-if="technicalAccess" class="tab-group advanced-tabs" :class="{ expanded: showAdvanced }" aria-label="更多工具">
          <button type="button" class="advanced-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '收起更多工具' : '更多工具' }}<span aria-hidden="true">{{ showAdvanced ? '⌃' : '⌄' }}</span></button>
          <div v-if="showAdvanced" class="advanced-tab-list">
            <button type="button" :class="{ active: activeTab === 'media' }" :aria-current="activeTab === 'media' ? 'page' : undefined" @click="selectTab('media')">媒体资产</button>
            <button type="button" :class="{ active: activeTab === 'knowledge' }" :aria-current="activeTab === 'knowledge' ? 'page' : undefined" @click="selectTab('knowledge')">常见问题知识</button>
            <button type="button" :class="{ active: activeTab === 'models' }" :aria-current="activeTab === 'models' ? 'page' : undefined" @click="selectTab('models')">型号与参数</button>
            <button type="button" :class="{ active: activeTab === 'review' }" :aria-current="activeTab === 'review' ? 'page' : undefined" @click="selectTab('review')">审核队列</button>
            <button type="button" :class="{ active: activeTab === 'settings' }" :aria-current="activeTab === 'settings' ? 'page' : undefined" @click="selectTab('settings')">全站设置</button>
          </div>
        </div>
      </nav>

      <section v-if="activeTab === 'repair' && !loading" class="workspace-grid repair-workspace" aria-label="售后页面配置编辑">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">售后页面配置</p><h3>页面草稿</h3></div><strong>{{ repairPages.length }}</strong></div>
          <button v-for="record in repairPages" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedRepairPageId }" @click="selectRepairPage(record.id)">
            <span>{{ record.title || record.page_key }}</span><small>{{ record.page_key }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="!repairPages.length" class="empty compact">暂无售后页面草稿。</p>
        </aside>
        <form v-if="repairDraft" class="editor-form" @submit.prevent="saveRepairPage">
          <div class="form-heading"><div><p class="eyebrow">售后页面配置</p><h3>{{ repairDraft.page_key }}</h3></div><span class="status" :data-status="repairDraft.status">{{ statusLabel(repairDraft.status) }}</span></div>
          <p class="form-help">这里仅维护官网售后页面的展示内容；维修申请、保修核验和进度查询仍由 Repair 服务处理。</p>
          <div class="field-grid">
            <label>页面键<input v-model.trim="repairDraft.page_key" disabled></label>
            <label>语言<input v-model.trim="repairDraft.language" :disabled="!canEdit(repairDraft)" maxlength="20"></label>
            <label class="full">标题<input v-model.trim="repairDraft.title" :disabled="!canEdit(repairDraft)" required maxlength="240"></label>
            <label class="full">介绍<textarea v-model.trim="repairDraft.intro" :disabled="!canEdit(repairDraft)" rows="4" maxlength="4000"></textarea></label>
            <label class="full">Hero 图片资源<input v-model.trim="repairDraft.hero_asset" :disabled="!canEdit(repairDraft)" placeholder="媒体资源 ID 或 URL"></label>
            <label class="full">型号卡片 JSON<textarea v-model="repairDraft.model_cards_text" :disabled="!canEdit(repairDraft)" rows="5" placeholder="[{&quot;model&quot;:&quot;FR400XS&quot;,&quot;label&quot;:&quot;FR400XS&quot;}]"></textarea></label>
            <label class="full">动作卡片 JSON（仅允许 01、02、09、10）<textarea v-model="repairDraft.action_cards_text" :disabled="!canEdit(repairDraft)" rows="6" placeholder="[{&quot;action&quot;:&quot;01&quot;,&quot;label&quot;:&quot;提交维修申请&quot;}]"></textarea></label>
            <label class="full">流程步骤 JSON<textarea v-model="repairDraft.process_steps_text" :disabled="!canEdit(repairDraft)" rows="5"></textarea></label>
            <label class="full">提示事项 JSON<textarea v-model="repairDraft.notices_text" :disabled="!canEdit(repairDraft)" rows="4"></textarea></label>
            <label class="full">常见问题引用 JSON<textarea v-model="repairDraft.faq_refs_text" :disabled="!canEdit(repairDraft)" rows="4"></textarea></label>
            <label class="full">SEO JSON<textarea v-model="repairDraft.seo_text" :disabled="!canEdit(repairDraft)" rows="4"></textarea></label>
          </div>
          <div class="form-actions"><a class="repair-page-preview" :href="repairPreviewUrl(repairDraft)" target="_blank" rel="noreferrer">打开官网草稿预览</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(repairDraft)">{{ saving ? '保存中...' : '保存售后页面草稿' }}</button></div>
        </form>
        <div v-else class="empty">请选择一条售后页面草稿。</div>
      </section>

      <div v-if="loading" class="empty">正在加载可编辑内容...</div>

      <section v-else-if="activeTab === 'home'" class="editor-start" aria-labelledby="editor-start-title">
        <div class="start-heading">
          <p class="eyebrow">内容更新</p>
          <h3 id="editor-start-title">今天想更新什么？</h3>
          <p>选择一项后填写中文内容，保存草稿并预览；不会直接对外发布。</p>
        </div>
        <div class="start-task-grid">
          <button type="button" class="start-task" @click="selectTab('pages')"><span>01</span><strong>修改官网页面</strong><small>首页、关于我们、服务等页面的标题和文案</small></button>
          <button type="button" class="start-task" @click="selectTab('series')"><span>02</span><strong>更新产品资料</strong><small>产品系列、机型介绍和展示内容</small></button>
          <button type="button" class="start-task" @click="selectTab('company')"><span>03</span><strong>补充企业资料</strong><small>发展历程、资质证书和制造信息</small></button>
          <button type="button" class="start-task" @click="selectTab('service')"><span>04</span><strong>维护服务支持</strong><small>资料下载、服务网点和售后入口</small></button>
          <button type="button" class="start-task" @click="selectTab('editorial')"><span>05</span><strong>发布新闻或案例</strong><small>新闻资讯、客户案例和搜索信息</small></button>
        </div>
        <p class="start-tip">需要管理图片、技术参数、审核或全站设置时，再打开“更多工具”。</p>
      </section>

      <section v-else-if="activeTab === 'media'" class="media-workspace" aria-label="媒体资产登记">
        <section class="editor-form media-upload-form">
          <div class="form-heading">
          <div><p class="eyebrow">媒体素材</p><h3>登记待审核媒体</h3></div>
            <span class="status" data-status="draft">仅草稿</span>
          </div>
          <p class="form-help">上传后只会创建私有候选素材。技术或品牌审核通过并由发布人员发布后，素材才会出现在官网内容的受控选择器中。</p>
          <form class="media-form-fields" @submit.prevent="createMediaCandidate">
            <div class="field-grid">
              <label class="full">文件<input ref="mediaFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,application/pdf" required @change="selectMediaFile"></label>
              <p v-if="mediaDraft.file" class="form-help full">已选择：{{ mediaDraft.file.name }} · {{ readableFileSize(mediaDraft.file.size) }}</p>
              <label>使用范围<select v-model="mediaDraft.usage_scope" required><option value="product">产品与型号</option><option value="manufacturing">制造与厂区</option><option value="service">服务资料</option><option value="knowledge">知识库</option><option value="brand">品牌与企业</option><option value="article">文章与资讯</option><option value="qualification">资质证书</option><option value="case_study">客户案例</option></select></label>
              <label>版权状态<select v-model="mediaDraft.copyright_status" required><option value="owned">自有素材</option><option value="licensed">已获许可</option><option value="authorized">已授权公开</option><option value="pending_review">待确认</option></select></label>
              <label class="full">替代文本<input v-model.trim="mediaDraft.alt_text" maxlength="300" placeholder="简要说明画面或文件内容，便于检索与无障碍访问"></label>
              <label class="full">授权与来源说明<textarea v-model.trim="mediaDraft.authorization_note" rows="3" maxlength="2000" placeholder="填写拍摄来源、许可证、授权范围或待确认事项"></textarea></label>
            </div>
            <div class="form-actions"><span></span><button class="primary-action" type="submit" :disabled="saving || !mediaDraft.file">{{ saving ? '正在上传...' : '上传并登记候选素材' }}</button></div>
          </form>
        </section>

        <section class="editor-form media-candidate-list" aria-labelledby="media-candidates-title">
          <div class="section-heading"><div><p class="eyebrow">素材清单</p><h3 id="media-candidates-title">当前媒体记录</h3></div><strong>{{ mediaCandidates.length }}</strong></div>
          <p v-if="!mediaCandidates.length" class="empty compact">暂未登记媒体资产。</p>
          <article v-for="asset in mediaCandidates" :key="asset.id" class="media-candidate-row">
            <div class="media-preview" aria-hidden="true"><img v-if="isPreviewableMedia(asset) && mediaPreviewUrl(asset)" :src="mediaPreviewUrl(asset)" :alt="asset.alt_text || asset.original_file_name"><span v-else>{{ mediaPreviewLabel(asset) }}</span></div>
            <div><strong>{{ asset.original_file_name }}</strong><p>{{ usageScopeLabel(asset.usage_scope) }} · {{ asset.mime_type }} · {{ readableFileSize(asset.byte_size) }}</p><small>{{ asset.alt_text || '未填写替代文本' }}</small></div>
            <span class="status" :data-status="asset.status">{{ statusLabel(asset.status) }}</span>
          </article>
        </section>
      </section>

      <section v-else-if="activeTab === 'knowledge'" class="workspace-grid" aria-label="常见问题知识草稿编辑">
        <aside class="record-list-panel knowledge-list">
          <div class="panel-heading"><div><p class="eyebrow">常见问题知识</p><h3>知识草稿</h3></div><strong>{{ filteredKnowledge.length }}</strong></div>
          <label class="list-search">检索问题<input v-model.trim="knowledgeSearch" type="search" placeholder="按标题或分类筛选"></label>
          <button v-for="record in filteredKnowledge" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedKnowledgeId }" @click="selectKnowledge(record.id)">
            <span>{{ record.question_title || '未命名知识' }}</span><small>{{ record.category || '未分类' }} · {{ riskLabel(record.risk_level) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="!filteredKnowledge.length" class="empty compact">没有符合当前筛选条件的常见问题知识草稿。</p>
        </aside>

        <form v-if="knowledgeDraft" class="editor-form" @submit.prevent="saveKnowledge">
          <div class="form-heading"><div><p class="eyebrow">知识草稿</p><h3>{{ knowledgeDraft.question_title || '未命名知识' }}</h3></div><span class="status" :data-status="knowledgeDraft.status">{{ statusLabel(knowledgeDraft.status) }}</span></div>
          <p v-if="!canEdit(knowledgeDraft)" class="read-only-note">该知识已进入审核、排期或发布状态。请通过内容版本流程恢复为草稿后再修改。</p>
          <p v-else class="form-help">这里只保存内部草稿。技术审核人仍需在审核流程中确认风险边界；智能问答知识库同步与公开发布不在此页面执行。</p>
          <div class="field-grid">
            <label>资料编号（系统维护）<input :value="knowledgeDraft.source_key" disabled></label>
            <label>来源文档<input :value="knowledgeDraft.source_document || '未填写'" disabled></label>
            <label class="full">问题标题<input v-model.trim="knowledgeDraft.question_title" :disabled="!canEdit(knowledgeDraft)" required maxlength="240"></label>
            <label>分类<input v-model.trim="knowledgeDraft.category" :disabled="!canEdit(knowledgeDraft)" required maxlength="120" placeholder="例如：伺服报警"></label>
            <label>风险等级<select v-model="knowledgeDraft.risk_level" :disabled="!canEdit(knowledgeDraft)" required><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option></select></label>
            <label>可见范围<select v-model="knowledgeDraft.visibility" :disabled="!canEdit(knowledgeDraft)" required><option value="support_internal">售后内部</option><option value="public">公开候选</option></select></label>
            <label>使用渠道<select v-model="knowledgeDraft.channel" :disabled="!canEdit(knowledgeDraft)" required><option value="both">官网与维修端</option><option value="website">官网</option><option value="repair_portal">维修端</option></select></label>
            <label>知识版本<input v-model.trim="knowledgeDraft.version" :disabled="!canEdit(knowledgeDraft)" required maxlength="80" placeholder="例如：v1.0"></label>
            <label>技术审核责任人<input v-model.trim="knowledgeDraft.technical_reviewer" :disabled="!canEdit(knowledgeDraft)" required maxlength="160" placeholder="姓名或岗位"></label>
            <label>适用型号（每行一项）<textarea v-model="knowledgeDraft.applicableModelsText" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="3000"></textarea></label>
            <label>错误代码（每行一项）<textarea v-model="knowledgeDraft.errorCodesText" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="3000"></textarea></label>
            <label class="full">故障现象<textarea v-model="knowledgeDraft.symptoms" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="6000" placeholder="描述用户可观察到的故障现象"></textarea></label>
            <label class="full">排障步骤或原始知识内容<textarea v-model="knowledgeDraft.troubleshootingStepsText" :disabled="!canEdit(knowledgeDraft)" rows="10" maxlength="20000" required placeholder="每行一条排障步骤，或保留导入的原始知识内容"></textarea></label>
            <label class="full">安全前置条件（高风险知识每行一项）<textarea v-model="knowledgeDraft.safetyPreconditionsText" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="6000" placeholder="例如：断开设备主电源并确认放电完成"></textarea></label>
            <label class="full">人工升级说明（高风险知识必填）<textarea v-model="knowledgeDraft.escalation_guidance" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="6000" placeholder="说明何时停止自助排障并转人工售后"></textarea></label>
            <label>知识库同步状态（系统维护）<input :value="knowledgeSyncStatusLabel(knowledgeDraft.dify_sync_status)" disabled></label>
          </div>
          <section class="media-reference-editor" aria-label="常见问题知识受控媒体">
            <div class="section-card-heading"><strong>受控知识媒体</strong><span>{{ knowledgeDraft.mediaReferences.length }}</span></div>
            <div class="media-reference-add"><select v-model="knowledgeMediaSelection" :disabled="!canEdit(knowledgeDraft)"><option value="">选择已发布知识素材</option><option v-for="asset in reviewedMediaAssets('knowledge')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(knowledgeDraft) || !knowledgeMediaSelection" @click="addKnowledgeMediaReference">添加</button></div>
            <p v-if="!reviewedMediaAssets('knowledge').length" class="form-help">暂无已发布的知识库素材。请先在“媒体资产”中完成登记、技术审核和发布。</p>
            <div v-for="reference in knowledgeDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'knowledge') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(knowledgeDraft)" @click="removeKnowledgeMediaReference(reference.media_asset_id)">移除</button></div>
          </section>
          <div class="form-actions"><a :href="nativeItemPath('knowledge_items', knowledgeDraft.id)">打开高级设置管理媒体与其他字段</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(knowledgeDraft)">{{ saving ? '保存中...' : '保存常见问题知识草稿' }}</button></div>
        </form>
        <div v-else class="empty">请选择一条常见问题知识草稿。</div>
      </section>

      <section v-else-if="activeTab === 'submit'" class="workspace-grid review-workspace" aria-label="内容送审清单">
        <aside class="record-list-panel review-list">
          <div class="panel-heading"><div><p class="eyebrow">提交审核</p><h3>{{ submissionMode === 'submit' ? '可提交草稿' : '待恢复内容' }}</h3></div><strong>{{ submissionQueue.length }}</strong></div>
          <div class="subtabs lifecycle-tabs"><button type="button" :class="{ active: submissionMode === 'submit' }" @click="setSubmissionMode('submit')">提交审核</button><button type="button" :class="{ active: submissionMode === 'restore' }" @click="setSubmissionMode('restore')">恢复草稿</button></div>
          <p class="form-help">{{ submissionMode === 'submit' ? '只显示当前账号可以读取的草稿。' : '只显示退回修改或下线内容；恢复后才能继续编辑或重新提交审核。' }}</p>
          <button type="button" class="text-action refresh-queue" :disabled="submissionLoading" @click="loadSubmissionQueue">{{ submissionLoading ? '正在刷新...' : '刷新清单' }}</button>
          <button v-for="record in submissionQueue" :key="submissionRecordKey(record)" type="button" class="record-choice" :class="{ active: submissionRecordKey(record) === selectedSubmissionKey }" @click="selectSubmissionRecord(record)">
            <span>{{ record.label }}</span><small>{{ record.collectionLabel }} · {{ record.secondary || statusLabel(record.status) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="submissionLoading" class="empty compact">正在读取各内容类型的{{ submissionMode === 'submit' ? '草稿' : '待恢复记录' }}...</p>
          <p v-else-if="!submissionQueue.length" class="empty compact">当前账号没有{{ submissionMode === 'submit' ? '可提交审核的草稿' : '可恢复的内容' }}。</p>
        </aside>

        <section v-if="selectedSubmissionRecord" class="editor-form review-detail">
          <div class="form-heading"><div><p class="eyebrow">{{ submissionMode === 'submit' ? '提交审核' : '恢复草稿' }}</p><h3>{{ selectedSubmissionRecord.label }}</h3></div><span class="status" :data-status="selectedSubmissionRecord.status">{{ statusLabel(selectedSubmissionRecord.status) }}</span></div>
          <div class="review-meta"><span>{{ selectedSubmissionRecord.collectionLabel }}</span><span v-if="selectedSubmissionRecord.secondary">{{ selectedSubmissionRecord.secondary }}</span></div>
          <p v-if="selectedSubmissionRecord.review_note" class="review-note-display"><strong>{{ submissionMode === 'submit' ? '现有审核说明' : '最近审核说明' }}</strong><span>{{ selectedSubmissionRecord.review_note }}</span></p>
          <p class="form-help">{{ submissionMode === 'submit' ? '提交后记录将冻结为“审核中”。审核人员将按内容类型、来源、受控媒体和发布前置条件进行复核。' : '恢复后记录变为非公开草稿，可再次编辑；恢复不代表通过审核，也不会自动发布。' }}</p>
          <label class="review-note">{{ submissionMode === 'submit' ? '提交说明' : '恢复说明' }}<textarea v-model.trim="submissionNote" rows="6" maxlength="2000" :placeholder="submissionMode === 'submit' ? '说明本次修改范围、待审核主张或技术复核重点' : '说明恢复原因或后续补充计划' "></textarea></label>
          <div class="form-actions"><a :href="nativeItemPath(selectedSubmissionRecord.collection, selectedSubmissionRecord.id)">打开高级设置（专业人员）</a><button type="button" class="primary-action" :disabled="submissionSaving" @click="submissionMode === 'submit' ? submitForReview() : restoreDraft()">{{ submissionSaving ? '正在提交...' : (submissionMode === 'submit' ? '提交审核' : '恢复为草稿') }}</button></div>
        </section>
        <div v-else class="empty">请从左侧选择一条{{ submissionMode === 'submit' ? '草稿' : '待恢复内容' }}。</div>
      </section>

      <section v-else-if="activeTab === 'review'" class="workspace-grid review-workspace" aria-label="待审核内容队列">
        <aside class="record-list-panel review-list">
          <div class="panel-heading"><div><p class="eyebrow">审核队列</p><h3>待审核内容</h3></div><strong>{{ reviewQueue.length }}</strong></div>
          <p class="form-help">只显示当前账号有权限查看的“审核中”记录。</p>
          <button type="button" class="text-action refresh-queue" :disabled="reviewLoading" @click="loadReviewQueue">{{ reviewLoading ? '正在刷新...' : '刷新队列' }}</button>
          <button v-for="record in reviewQueue" :key="reviewRecordKey(record)" type="button" class="record-choice" :class="{ active: reviewRecordKey(record) === selectedReviewKey }" @click="selectReviewRecord(record)">
            <span>{{ record.label }}</span><small>{{ record.collectionLabel }} · {{ record.secondary || '待审核' }}</small><i data-status="review">审核中</i>
          </button>
          <p v-if="reviewLoading" class="empty compact">正在读取各内容类型的待审核记录...</p>
          <p v-else-if="!reviewQueue.length" class="empty compact">当前账号没有可处理的待审核内容。</p>
        </aside>

        <section v-if="selectedReviewRecord" class="editor-form review-detail">
          <div class="form-heading"><div><p class="eyebrow">审核处理</p><h3>{{ selectedReviewRecord.label }}</h3></div><span class="status" data-status="review">审核中</span></div>
          <div class="review-meta"><span>{{ selectedReviewRecord.collectionLabel }}</span><span v-if="selectedReviewRecord.secondary">{{ selectedReviewRecord.secondary }}</span></div>
          <p v-if="selectedReviewRecord.review_note" class="review-note-display"><strong>提交说明</strong><span>{{ selectedReviewRecord.review_note }}</span></p>
          <p class="form-help">确认后，服务端会根据当前账号角色与内容就绪度决定是否允许流转。该页面不会执行发布。</p>
          <label class="review-note">审核说明<textarea v-model.trim="reviewNote" rows="6" maxlength="2000" placeholder="填写通过依据或退回修改要求"></textarea></label>
          <div class="form-actions"><a :href="nativeItemPath(selectedReviewRecord.collection, selectedReviewRecord.id)">打开高级设置（专业人员）</a><div class="review-actions"><button type="button" class="secondary-action" :disabled="reviewSaving" @click="decideReview('rejected')">退回修改</button><button type="button" class="primary-action" :disabled="reviewSaving" @click="decideReview('scheduled')">{{ reviewSaving ? '正在提交...' : '批准进入待发布' }}</button></div></div>
        </section>
        <div v-else class="empty">请从左侧选择一条待审核内容。</div>
      </section>

      <section v-else-if="activeTab === 'pages'" class="workspace-grid" aria-label="页面内容编辑">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">页面内容</p><h3>页面</h3></div><strong>{{ pages.length }}</strong></div>
          <button
            v-for="page in pages"
            :key="page.id"
            type="button"
            class="record-choice"
            :class="{ active: page.id === selectedPageId }"
            @click="selectPage(page.id)"
          >
            <span>{{ page.title || page.slug }}</span>
            <i :data-status="page.status">{{ statusLabel(page.status) }}</i>
          </button>
          <p v-if="!pages.length" class="empty compact">当前账号没有可读取的页面记录。</p>
        </aside>

        <form v-if="pageDraft" class="editor-form" @submit.prevent="savePage">
          <div class="form-heading">
            <div><p class="eyebrow">页面信息</p><h3>{{ pageDraft.title || '未命名页面' }}</h3></div>
            <span class="status" :data-status="pageDraft.status">{{ statusLabel(pageDraft.status) }}</span>
          </div>
          <p v-if="!canEdit(pageDraft)" class="read-only-note">此记录已进入审核、排期或发布状态。请通过内容版本工作台恢复为草稿后再修改。</p>

          <div class="field-grid">
            <label class="full">页面标题<input v-model.trim="pageDraft.title" :disabled="!canEdit(pageDraft)" required maxlength="160"><small class="field-help">访客看到的页面主标题，建议简短、明确。</small></label>
          </div>

          <details class="advanced-fields">
            <summary>高级设置（一般无需修改）</summary>
            <div class="field-grid">
              <label>页面地址标识<input v-model.trim="pageDraft.slug" :disabled="!canEdit(pageDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"><small class="field-help">用于生成网址，例如：about、product。</small></label>
              <label>页面语言<select v-model="pageDraft.language" :disabled="!canEdit(pageDraft)"><option value="zh-CN">简体中文</option><option value="en">英文</option></select></label>
              <label class="full">来源记录<input :value="pageDraft.source_document || '未填写'" disabled></label>
            </div>
          </details>

          <section class="section-editor" aria-labelledby="section-copy-title">
            <div class="section-heading"><div><p class="eyebrow">页面段落</p><h4 id="section-copy-title">页面段落</h4></div><button type="button" :disabled="!canEdit(pageDraft)" @click="addPageSection">新增段落</button></div>
            <article v-for="(section, index) in pageDraft.sections" :key="`${section.id}-${index}`" class="section-card">
              <div class="section-card-heading"><strong>段落 {{ index + 1 }}</strong><div><span v-if="section.requires_claim_review" class="review-badge">宣传主张待审核</span><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft) || pageDraft.sections.length < 2" @click="removePageSection(index)">删除</button></div></div>
              <div class="field-grid section-fields">
                <label class="full">段落标题<input v-model.trim="section.title" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="例如：我们为什么值得信赖"><small class="field-help">这一段的醒目标题，会直接显示在官网页面上。</small></label>
                <label class="full">正文<textarea v-model="section.body" :disabled="!canEdit(pageDraft)" rows="5" maxlength="4000" placeholder="填写访客需要了解的内容"></textarea>
                  <small class="field-help">支持换行，建议一段只表达一个重点。</small>
                </label>
              </div>
              <details class="advanced-fields section-advanced">
                <summary>段落高级设置（一般无需修改）</summary>
                <div class="field-grid">
                  <label>段落内部标识<input v-model.trim="section.id" :disabled="!canEdit(pageDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
                  <label>顶部小标题<input v-model.trim="section.kicker" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="可留空"></label>
                </div>
              </details>
            </article>
          </section>

          <section class="seo-editor" aria-labelledby="seo-title">
            <div><p class="eyebrow">搜索优化</p><h4 id="seo-title">搜索与分享信息</h4></div>
            <div class="field-grid">
              <label>搜索标题<input v-model.trim="pageDraft.seo.title" :disabled="!canEdit(pageDraft)" maxlength="160" placeholder="可留空，默认使用页面标题"></label>
              <label>关键词<input v-model.trim="pageDraft.seo.keywords" :disabled="!canEdit(pageDraft)" maxlength="500" placeholder="以逗号分隔"></label>
              <label class="full">搜索描述<textarea v-model="pageDraft.seo.description" :disabled="!canEdit(pageDraft)" rows="3" maxlength="500"></textarea></label>
            </div>
          </section>

          <div class="form-actions"><a :href="nativeItemPath('pages', pageDraft.id)">打开高级设置查看完整字段</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(pageDraft)">{{ saving ? '保存中...' : '保存页面草稿' }}</button></div>
        </form>
        <div v-else class="empty">请选择一条页面记录。</div>
      </section>

      <section v-else-if="activeTab === 'series'" class="workspace-grid" aria-label="产品系列编辑">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">产品系列</p><h3>产品系列</h3></div><strong>{{ series.length }}</strong></div>
          <button v-for="record in series" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedSeriesId }" @click="selectSeries(record.id)"><span>{{ record.name || record.series_code }}</span><small>{{ record.series_code }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!series.length" class="empty compact">当前账号没有可读取的产品系列。</p>
        </aside>

        <form v-if="seriesDraft" class="editor-form" @submit.prevent="saveSeries">
          <div class="form-heading"><div><p class="eyebrow">系列信息</p><h3>{{ seriesDraft.name || '未命名系列' }}</h3></div><span class="status" :data-status="seriesDraft.status">{{ statusLabel(seriesDraft.status) }}</span></div>
          <p v-if="!canEdit(seriesDraft)" class="read-only-note">该系列目前不可直接编辑。</p>
          <div class="field-grid">
            <label>系列名称<input v-model.trim="seriesDraft.name" :disabled="!canEdit(seriesDraft)" required maxlength="160"></label>
            <label>系列编码<input v-model.trim="seriesDraft.series_code" :disabled="!canEdit(seriesDraft)" required maxlength="80"></label>
            <label>访问标识<input v-model.trim="seriesDraft.slug" :disabled="!canEdit(seriesDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>排序<input v-model.number="seriesDraft.sort_order" :disabled="!canEdit(seriesDraft)" type="number" min="0" step="1"></label>
            <label>受控系列封面<select v-model="seriesDraft.cover_asset" :disabled="!canEdit(seriesDraft)"><option value="">尚未选择</option><option v-if="seriesDraft.cover_asset && !isReviewedMediaAsset(seriesDraft.cover_asset, 'product')" :value="seriesDraft.cover_asset">当前引用 {{ seriesDraft.cover_asset }}（尚未通过选择器核验）</option><option v-for="asset in reviewedMediaAssets('product')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!reviewedMediaAssets('product').length" class="form-help full">暂无已发布的产品素材。请先在“媒体资产”中完成登记、审核和发布。</p>
            <label class="full">定位说明<textarea v-model="seriesDraft.positioning" :disabled="!canEdit(seriesDraft)" rows="3" maxlength="2000"></textarea></label>
            <label>应用场景（每行一项）<textarea v-model="seriesDraft.scenariosText" :disabled="!canEdit(seriesDraft)" rows="5" maxlength="3000" placeholder="例如：精密零件加工"></textarea></label>
            <label>核心能力（每行一项）<textarea v-model="seriesDraft.capabilitiesText" :disabled="!canEdit(seriesDraft)" rows="5" maxlength="3000" placeholder="例如：自动穿丝"></textarea></label>
          </div>
          <div class="form-actions"><a :href="nativeItemPath('product_series', seriesDraft.id)">打开高级设置查看媒体与来源</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(seriesDraft)">{{ saving ? '保存中...' : '保存产品系列' }}</button></div>
        </form>
        <div v-else class="empty">请选择一个产品系列。</div>
      </section>

      <section v-else-if="activeTab === 'company'" class="workspace-grid" aria-label="企业资料编辑">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">企业资料</p><h3>企业资料</h3></div><strong>{{ companyRecords(companyMode).length }}</strong></div>
          <div class="subtabs" aria-label="企业资料类型">
            <button type="button" :class="{ active: companyMode === 'milestones' }" @click="selectCompanyMode('milestones')">发展历程</button>
            <button type="button" :class="{ active: companyMode === 'qualifications' }" @click="selectCompanyMode('qualifications')">资质证书</button>
            <button type="button" :class="{ active: companyMode === 'manufacturing_evidence' }" @click="selectCompanyMode('manufacturing_evidence')">制造证据</button>
          </div>
          <button v-for="record in companyRecords(companyMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedCompanyId }" @click="selectCompanyRecord(record.id)"><span>{{ companyLabel(record) }}</span><small>系统归档资料</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!companyRecords(companyMode).length" class="empty compact">当前账号没有可读取的企业资料。</p>
        </aside>

        <form v-if="companyDraft" class="editor-form" @submit.prevent="saveCompanyRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ companyHeading() }}</p><h3>{{ companyLabel(companyDraft) }}</h3></div><span class="status" :data-status="companyDraft.status">{{ statusLabel(companyDraft.status) }}</span></div>
          <p v-if="!canEdit(companyDraft)" class="read-only-note">该记录目前不可直接编辑。</p>
          <p v-else class="form-help">资料编号由系统维护，无需修改。证书图片和制造图片只能选择已发布的受控媒体资产。</p>

          <div v-if="companyMode === 'milestones'" class="field-grid">
            <label>资料编号（系统维护）<input :value="companyDraft.source_key" disabled></label>
            <label>年份<input v-model.number="companyDraft.year" :disabled="!canEdit(companyDraft)" required type="number" min="1900" max="2100" step="1"></label>
            <label class="full">历史事件<textarea v-model="companyDraft.event" :disabled="!canEdit(companyDraft)" rows="3" maxlength="2000" required></textarea></label>
            <label class="full">佐证说明<textarea v-model="companyDraft.evidence" :disabled="!canEdit(companyDraft)" rows="4" maxlength="4000" required></textarea></label>
            <label>排序<input v-model.number="companyDraft.sort_order" :disabled="!canEdit(companyDraft)" type="number" min="0" step="1"></label>
          </div>

          <div v-else-if="companyMode === 'qualifications'" class="field-grid">
            <label>资料编号（系统维护）<input :value="companyDraft.source_key" disabled></label>
            <label>资料类型<select v-model="companyDraft.type" :disabled="!canEdit(companyDraft)"><option value="certificate">认证证书</option><option value="honor">荣誉证书</option><option value="patent">专利证书</option></select></label>
            <label class="full">名称<input v-model.trim="companyDraft.name" :disabled="!canEdit(companyDraft)" maxlength="240" required></label>
            <label>证书编号<input v-model.trim="companyDraft.certificate_number" :disabled="!canEdit(companyDraft)" maxlength="160"></label>
            <label>颁发机构<input v-model.trim="companyDraft.issuer" :disabled="!canEdit(companyDraft)" maxlength="240"></label>
            <label>有效期<input v-model="companyDraft.valid_until" :disabled="!canEdit(companyDraft)" type="date"></label>
            <label>授权状态<select v-model="companyDraft.authorization_status" :disabled="!canEdit(companyDraft)"><option value="review_required">待核验</option><option value="owned">自有</option><option value="licensed">已授权</option><option value="authorized">已许可公开</option></select></label>
            <label>排序<input v-model.number="companyDraft.sort_order" :disabled="!canEdit(companyDraft)" type="number" min="0" step="1"></label>
            <section class="media-reference-editor full-field" aria-label="资质证书受控媒体">
              <div class="section-card-heading"><strong>受控证书媒体</strong><span>{{ companyDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">选择已发布资质素材</option><option v-for="asset in reviewedMediaAssets('qualification')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">添加</button></div>
              <p v-if="!reviewedMediaAssets('qualification').length" class="form-help">暂无已发布的资质素材。请先在“媒体资产”中登记，并完成品牌审核与发布。</p>
              <div v-for="reference in companyDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'qualification') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(companyDraft)" @click="removeCompanyMediaReference(reference.media_asset_id)">移除</button></div>
            </section>
          </div>

          <div v-else class="field-grid">
            <label>资料编号（系统维护）<input :value="companyDraft.source_key" disabled></label>
            <label>制造环节<input v-model.trim="companyDraft.process" :disabled="!canEdit(companyDraft)" maxlength="160" required></label>
            <label class="full">制造说明<textarea v-model="companyDraft.description" :disabled="!canEdit(companyDraft)" rows="4" maxlength="4000" required></textarea></label>
            <label class="full">检验依据<textarea v-model="companyDraft.inspection_evidence" :disabled="!canEdit(companyDraft)" rows="4" maxlength="4000" placeholder="请填写可追溯的检验依据"></textarea></label>
            <label>排序<input v-model.number="companyDraft.sort_order" :disabled="!canEdit(companyDraft)" type="number" min="0" step="1"></label>
            <section class="media-reference-editor full-field" aria-label="制造证据受控媒体">
              <div class="section-card-heading"><strong>受控制造媒体</strong><span>{{ companyDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">选择已发布制造素材</option><option v-for="asset in reviewedMediaAssets('manufacturing')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">添加</button></div>
              <p v-if="!reviewedMediaAssets('manufacturing').length" class="form-help">暂无已发布的制造素材。请先在“媒体资产”中登记，并完成技术审核与发布。</p>
              <div v-for="reference in companyDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'manufacturing') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(companyDraft)" @click="removeCompanyMediaReference(reference.media_asset_id)">移除</button></div>
            </section>
          </div>
          <div class="form-actions"><a :href="nativeItemPath(companyMode, companyDraft.id)">打开高级设置关联受控媒体与来源</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(companyDraft)">{{ saving ? '保存中...' : '保存企业资料' }}</button></div>
        </form>
        <div v-else class="empty">请选择一条企业资料记录。</div>
      </section>

      <section v-else-if="activeTab === 'service'" class="workspace-grid" aria-label="服务支持内容编辑">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">服务支持</p><h3>服务支持</h3></div><strong>{{ serviceRecords(serviceMode).length }}</strong></div>
          <div class="subtabs" aria-label="服务内容类型">
            <button type="button" :class="{ active: serviceMode === 'service_resources' }" @click="selectServiceMode('service_resources')">服务资料</button>
            <button type="button" :class="{ active: serviceMode === 'service_locations' }" @click="selectServiceMode('service_locations')">服务网点</button>
            <button type="button" :class="{ active: serviceMode === 'external_service_entries' }" @click="selectServiceMode('external_service_entries')">售后入口</button>
          </div>
          <button v-for="record in serviceRecords(serviceMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedServiceId }" @click="selectServiceRecord(record.id)"><span>{{ serviceLabel(record) }}</span><small>{{ serviceSecondary(record) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!serviceRecords(serviceMode).length" class="empty compact">当前账号没有可读取的服务支持内容。</p>
        </aside>

        <form v-if="serviceDraft" class="editor-form" @submit.prevent="saveServiceRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ serviceHeading() }}</p><h3>{{ serviceLabel(serviceDraft) }}</h3></div><span class="status" :data-status="serviceDraft.status">{{ statusLabel(serviceDraft.status) }}</span></div>
          <p v-if="!canEdit(serviceDraft)" class="read-only-note">该记录目前不可直接编辑。</p>

          <div v-if="serviceMode === 'service_resources'" class="field-grid">
            <label>资料编号（系统维护）<input :value="serviceDraft.source_key" disabled></label>
            <label>资料类型<input v-model.trim="serviceDraft.type" :disabled="!canEdit(serviceDraft)" maxlength="120" required placeholder="例如：manual"></label>
            <label>适用型号（每行一项）<textarea v-model="serviceDraft.applicableModelsText" :disabled="!canEdit(serviceDraft)" rows="4" maxlength="2000" placeholder="例如：FR400XS"></textarea></label>
            <label>语言<input v-model.trim="serviceDraft.language" :disabled="!canEdit(serviceDraft)" maxlength="40" placeholder="zh-CN"></label>
            <label>资料版本<input v-model.trim="serviceDraft.version" :disabled="!canEdit(serviceDraft)" maxlength="120" placeholder="例如：v1.0"></label>
            <label>受控媒体资产<select v-model="serviceDraft.asset" :disabled="!canEdit(serviceDraft)"><option value="">尚未选择</option><option v-if="serviceDraft.asset && !isReviewedMediaAsset(serviceDraft.asset, 'service')" :value="serviceDraft.asset">当前引用 {{ serviceDraft.asset }}（尚未通过选择器核验）</option><option v-for="asset in reviewedMediaAssets('service')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!reviewedMediaAssets('service').length" class="form-help full">暂无已发布的服务资料素材。请先在“媒体资产”中上传、登记、审核并发布。</p>
            <label class="full">资料更新时间<input v-model.trim="serviceDraft.updated_at" :disabled="!canEdit(serviceDraft)" maxlength="80" placeholder="例如：2026-08-04T09:30:00Z"></label>
          </div>

          <div v-else-if="serviceMode === 'service_locations'" class="field-grid">
            <label>资料编号（系统维护）<input :value="serviceDraft.source_key" disabled></label>
            <label>省份或区域<input v-model.trim="serviceDraft.region" :disabled="!canEdit(serviceDraft)" maxlength="120" required></label>
            <label>城市<input v-model.trim="serviceDraft.city" :disabled="!canEdit(serviceDraft)" maxlength="120" required></label>
            <label>服务状态<select v-model="serviceDraft.business_status" :disabled="!canEdit(serviceDraft)"><option value="review_required">待核验</option><option value="active">正常服务</option><option value="inactive">暂停服务</option></select></label>
            <label class="full">服务范围<textarea v-model="serviceDraft.service_scope" :disabled="!canEdit(serviceDraft)" rows="3" maxlength="4000" required></textarea></label>
            <label>企业联系人<input v-model.trim="serviceDraft.contact.name" :disabled="!canEdit(serviceDraft)" maxlength="120"></label>
            <label>服务电话<input v-model.trim="serviceDraft.contact.phone" :disabled="!canEdit(serviceDraft)" maxlength="80"></label>
            <label>服务邮箱<input v-model.trim="serviceDraft.contact.email" :disabled="!canEdit(serviceDraft)" maxlength="160"></label>
            <label>有效期<input v-model="serviceDraft.valid_until" :disabled="!canEdit(serviceDraft)" type="date"></label>
            <label class="full">服务地址<textarea v-model="serviceDraft.contact.address" :disabled="!canEdit(serviceDraft)" rows="3" maxlength="500"></textarea></label>
          </div>

          <div v-else class="field-grid">
            <label>入口类型<input :value="serviceDraft.entry_type" disabled></label>
            <label>打开方式<select v-model="serviceDraft.open_mode" :disabled="!canEdit(serviceDraft)"><option value="new_tab">新窗口</option><option value="same_tab">当前窗口</option></select></label>
            <label class="full">售后系统地址<input v-model.trim="serviceDraft.url" :disabled="!canEdit(serviceDraft)" type="url" maxlength="1000" required placeholder="https://service.example.com/repair/new"></label>
            <label>健康状态<select v-model="serviceDraft.health_status" :disabled="!canEdit(serviceDraft)"><option value="pending">待确认</option><option value="available">可用</option><option value="unavailable">不可用</option></select></label>
            <label>人工兜底电话<input v-model.trim="serviceDraft.fallback_phone" :disabled="!canEdit(serviceDraft)" maxlength="80"></label>
            <label class="toggle-field"><input v-model="serviceDraft.enabled" :disabled="!canEdit(serviceDraft)" type="checkbox"><span>启用官网入口</span></label>
            <p class="form-help full">只有在正式域名、健康状态、人工兜底及发布审核均完成后，才允许将入口发布到官网。</p>
          </div>
          <div class="form-actions"><a :href="nativeItemPath(serviceMode, serviceDraft.id)">打开高级设置查看来源与审核记录</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(serviceDraft)">{{ saving ? '保存中...' : '保存服务内容' }}</button></div>
        </form>
        <div v-else class="empty">请选择一条服务支持记录。</div>
      </section>

      <section v-else-if="activeTab === 'editorial'" class="workspace-grid" aria-label="文章与案例编辑">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">文章与案例</p><h3>文章与案例</h3></div><strong>{{ editorialRecords(editorialMode).length }}</strong></div>
          <div class="subtabs" aria-label="文章与案例类型">
            <button type="button" :class="{ active: editorialMode === 'articles' }" @click="selectEditorialMode('articles')">新闻与文章</button>
            <button type="button" :class="{ active: editorialMode === 'case_studies' }" @click="selectEditorialMode('case_studies')">客户案例</button>
          </div>
          <button type="button" class="primary-action" :disabled="saving" @click="createEditorialRecord">新建草稿</button>
          <button v-for="record in editorialRecords(editorialMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedEditorialId }" @click="selectEditorialRecord(record.id)"><span>{{ editorialLabel(record) }}</span><small>{{ editorialSecondary(record) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!editorialRecords(editorialMode).length" class="empty compact">暂时没有此类内容草稿，可使用“新建草稿”开始维护。</p>
        </aside>

        <form v-if="editorialDraft" class="editor-form" @submit.prevent="saveEditorialRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ editorialHeading() }}</p><h3>{{ editorialLabel(editorialDraft) }}</h3></div><span class="status" :data-status="editorialDraft.status">{{ statusLabel(editorialDraft.status) }}</span></div>
          <p v-if="!canEdit(editorialDraft)" class="read-only-note">该记录目前不可直接编辑。请先通过既有内容审核流程恢复为草稿或退回修改状态。</p>
          <p v-else class="form-help">所有保存均为内容草稿。封面媒体、来源和客户授权须在发布前完成受控审核，工作台不提供发布操作。</p>

          <div v-if="editorialMode === 'articles'" class="field-grid">
            <label>文章标识<input v-model.trim="editorialDraft.slug" :disabled="!canEdit(editorialDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>分类<input v-model.trim="editorialDraft.category" :disabled="!canEdit(editorialDraft)" required maxlength="80" placeholder="例如：news、technology、video"></label>
            <label class="full">标题<input v-model.trim="editorialDraft.title" :disabled="!canEdit(editorialDraft)" required maxlength="240"></label>
            <label class="full">摘要<textarea v-model="editorialDraft.summary" :disabled="!canEdit(editorialDraft)" rows="3" maxlength="1000"></textarea></label>
            <label class="full">正文<textarea v-model="editorialDraft.body" :disabled="!canEdit(editorialDraft)" rows="10" maxlength="30000" placeholder="文章可以填写正文，或填写已审核的视频地址。"></textarea></label>
            <label>视频地址<input v-model.trim="editorialDraft.video_url" :disabled="!canEdit(editorialDraft)" type="url" maxlength="1000" placeholder="https://..."></label>
            <label>受控封面素材<select v-model="editorialDraft.cover_asset" :disabled="!canEdit(editorialDraft)"><option value="">尚未选择</option><option v-if="editorialDraft.cover_asset && !isReviewedMediaAsset(editorialDraft.cover_asset, 'article')" :value="editorialDraft.cover_asset">当前引用 {{ editorialDraft.cover_asset }}（尚未通过选择器核验）</option><option v-for="asset in reviewedMediaAssets('article')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!reviewedMediaAssets('article').length" class="form-help full">暂无已发布的文章封面素材。请先在原生媒体流程完成上传、版权确认与发布。</p>
            <label>来源文档<input v-model.trim="editorialDraft.source_document" :disabled="!canEdit(editorialDraft)" maxlength="1000" placeholder="文件名或内部来源路径"></label>
            <label>来源地址<input v-model.trim="editorialDraft.source_url" :disabled="!canEdit(editorialDraft)" type="url" maxlength="1000" placeholder="https://..."></label>
          </div>

          <div v-else class="field-grid">
            <label>案例标识<input v-model.trim="editorialDraft.slug" :disabled="!canEdit(editorialDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>行业<input v-model.trim="editorialDraft.industry" :disabled="!canEdit(editorialDraft)" maxlength="160"></label>
            <label>材料<input v-model.trim="editorialDraft.material" :disabled="!canEdit(editorialDraft)" maxlength="160"></label>
            <label>厚度<input v-model.trim="editorialDraft.thickness" :disabled="!canEdit(editorialDraft)" maxlength="120" placeholder="例如：80 mm"></label>
            <label>关联型号编码<input v-model.trim="editorialDraft.model_code" :disabled="!canEdit(editorialDraft)" maxlength="80" placeholder="例如：FR400XS"></label>
            <label>客户授权状态<select v-model="editorialDraft.authorization_status" :disabled="!canEdit(editorialDraft)"><option value="review_required">待审核</option><option value="owned">自有</option><option value="licensed">已获许可</option><option value="authorized">已获公开授权</option></select></label>
            <label class="full">工艺过程<textarea v-model="editorialDraft.process" :disabled="!canEdit(editorialDraft)" rows="6" maxlength="12000"></textarea></label>
            <label class="full">结果说明<textarea v-model="editorialDraft.result" :disabled="!canEdit(editorialDraft)" rows="5" maxlength="8000"></textarea></label>
            <label>来源文档<input v-model.trim="editorialDraft.source_document" :disabled="!canEdit(editorialDraft)" maxlength="1000" placeholder="文件名或内部来源路径"></label>
            <label>来源地址<input v-model.trim="editorialDraft.source_url" :disabled="!canEdit(editorialDraft)" type="url" maxlength="1000" placeholder="https://..."></label>
          </div>

          <section v-if="editorialMode === 'articles'" class="seo-editor" aria-labelledby="article-seo-title">
            <div><p class="eyebrow">搜索优化</p><h4 id="article-seo-title">搜索与分享信息</h4></div>
            <div class="field-grid">
              <label>搜索标题<input v-model.trim="editorialDraft.seo.title" :disabled="!canEdit(editorialDraft)" maxlength="160"></label>
              <label>关键词<input v-model.trim="editorialDraft.seo.keywords" :disabled="!canEdit(editorialDraft)" maxlength="500" placeholder="以逗号分隔"></label>
              <label class="full">搜索描述<textarea v-model="editorialDraft.seo.description" :disabled="!canEdit(editorialDraft)" rows="3" maxlength="500"></textarea></label>
            </div>
          </section>

          <div class="form-actions"><a :href="nativeItemPath(editorialMode, editorialDraft.id)">打开高级设置关联受控媒体与查看审核记录</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(editorialDraft)">{{ saving ? '保存中...' : '保存内容草稿' }}</button></div>
        </form>
        <div v-else class="empty">请选择或新建一条{{ editorialMode === 'articles' ? '文章' : '客户案例' }}草稿。</div>
      </section>

      <section v-else-if="activeTab === 'settings'" class="settings-workspace" aria-label="全站设置编辑">
        <form v-if="settingsDraft" class="editor-form" @submit.prevent="saveSettings">
          <div class="form-heading">
            <div><p class="eyebrow">全站设置</p><h3>全站导航与联系方式</h3></div>
            <span class="status" :data-status="settingsDraft.status">{{ statusLabel(settingsDraft.status) }}</span>
          </div>
          <p v-if="!canEdit(settingsDraft)" class="read-only-note">该设置目前不可直接编辑。请先通过既有内容审核流程恢复为草稿或退回修改状态。</p>
          <p v-else class="form-help">保存仅更新草稿中的显示配置。设置标识与业务审核标记由既有流程维护，不能在此页面改写或绕过。</p>

          <div class="field-grid">
            <label>设置标识<input :value="settingsDraft.setting_key" disabled></label>
            <label>来源记录<input :value="settingsDraft.source_document || '未填写'" disabled></label>
          </div>

          <section class="section-editor" aria-labelledby="site-navigation-title">
            <div class="section-heading"><div><p class="eyebrow">主导航</p><h4 id="site-navigation-title">主导航</h4><p>支持站内路径或已确认的 HTTPS 地址。</p></div><button type="button" :disabled="!canEdit(settingsDraft)" @click="addSettingLink('navigation')">新增导航项</button></div>
            <article v-for="(item, index) in settingsDraft.navigation" :key="`navigation-${index}`" class="section-card">
              <div class="section-card-heading"><strong>导航项 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft) || settingsDraft.navigation.length < 1" @click="removeSettingLink('navigation', index)">删除</button></div>
              <div class="field-grid"><label>显示名称<input v-model.trim="item.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>链接地址<input v-model.trim="item.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/product 或 https://..."></label></div>
            </article>
            <p v-if="!settingsDraft.navigation.length" class="form-help">尚未配置主导航。发布检查会阻止空导航进入官网。</p>
          </section>

          <section class="section-editor" aria-labelledby="site-footer-title">
            <div class="section-heading"><div><p class="eyebrow">页脚设置</p><h4 id="site-footer-title">页脚链接</h4><p>企业主体、备案、隐私主体等业务信息必须继续走审核流程。</p></div><button type="button" :disabled="!canEdit(settingsDraft)" @click="addSettingLink('footer')">新增页脚链接</button></div>
            <p class="read-only-note">当前业务审核标记：{{ settingsDraft.footer.requires_business_review ? '待业务确认' : '已由审核流程确认' }}。该标记仅供查看，不能由内容编辑直接更改。</p>
            <article v-for="(item, index) in settingsDraft.footer.primary_links" :key="`footer-${index}`" class="section-card">
              <div class="section-card-heading"><strong>页脚链接 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft) || settingsDraft.footer.primary_links.length < 1" @click="removeSettingLink('footer', index)">删除</button></div>
              <div class="field-grid"><label>显示名称<input v-model.trim="item.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>链接地址<input v-model.trim="item.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/about 或 https://..."></label></div>
            </article>
            <p v-if="!settingsDraft.footer.primary_links.length" class="form-help">尚未配置页脚链接。发布检查会阻止空页脚进入官网。</p>
          </section>

          <section class="section-editor" aria-labelledby="site-brand-title">
            <div><p class="eyebrow">品牌与联系方式</p><h4 id="site-brand-title">品牌与页面联系入口</h4></div>
            <div class="field-grid">
              <label>品牌显示名称<input v-model.trim="settingsDraft.brand.display_name" :disabled="!canEdit(settingsDraft)" required maxlength="160"></label>
              <label>受控品牌标志素材<select v-model="settingsDraft.brand.logo_asset" :disabled="!canEdit(settingsDraft)" required><option value="">选择已发布品牌素材</option><option v-if="settingsDraft.brand.logo_asset && !isReviewedMediaAsset(settingsDraft.brand.logo_asset, 'brand')" :value="settingsDraft.brand.logo_asset">当前引用 {{ settingsDraft.brand.logo_asset }}（尚未通过选择器核验）</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <p v-if="!reviewedMediaAssets('brand').length" class="form-help full">暂无已发布的品牌标志素材。请先在“媒体资产”中完成登记、品牌审核和发布。</p>
              <label>服务电话<input v-model.trim="settingsDraft.contacts.service_phone" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label>
              <label>顶部按钮文案<input v-model.trim="settingsDraft.contacts.header_cta.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label>
              <label class="full">顶部按钮链接<input v-model.trim="settingsDraft.contacts.header_cta.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/service 或 https://..."></label>
              <label class="full">可用语言（每行一项）<textarea v-model="settingsDraft.languagesText" :disabled="!canEdit(settingsDraft)" rows="3" maxlength="400" placeholder="zh-CN"></textarea></label>
            </div>
          </section>

          <div class="form-actions"><a :href="nativeItemPath('site_settings', settingsDraft.id)">打开高级设置查看分析配置、来源与审核记录</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(settingsDraft)">{{ saving ? '保存中...' : '保存全站设置草稿' }}</button></div>
        </form>
        <div v-else class="empty">当前账号没有可读取的全站设置记录。</div>
      </section>

      <section v-else class="model-workspace" aria-label="产品型号与参数编辑">
        <div class="model-layout">
          <aside class="record-list-panel">
            <div class="panel-heading"><div><p class="eyebrow">产品型号</p><h3>产品型号</h3></div><strong>{{ models.length }}</strong></div>
            <button v-for="record in models" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedModelId }" @click="selectModel(record.id)"><span>{{ record.name || record.model_code }}</span><small>{{ record.model_code }} / {{ record.series_code }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
            <p v-if="!models.length" class="empty compact">当前账号没有可读取的产品型号。</p>
          </aside>

          <form v-if="modelDraft" class="editor-form" @submit.prevent="saveModel">
            <div class="form-heading"><div><p class="eyebrow">型号信息</p><h3>{{ modelDraft.name || '未命名型号' }}</h3></div><span class="status" :data-status="modelDraft.status">{{ statusLabel(modelDraft.status) }}</span></div>
            <p v-if="!canEdit(modelDraft)" class="read-only-note">该型号目前不可直接编辑。</p>
            <div class="field-grid">
              <label>型号名称<input v-model.trim="modelDraft.name" :disabled="!canEdit(modelDraft)" required maxlength="160"></label>
              <label>型号编码<input v-model.trim="modelDraft.model_code" :disabled="!canEdit(modelDraft)" required maxlength="80"></label>
              <label>所属系列编码<input v-model.trim="modelDraft.series_code" :disabled="!canEdit(modelDraft)" required maxlength="80"></label>
              <label>访问标识<input v-model.trim="modelDraft.slug" :disabled="!canEdit(modelDraft)" pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            </div>
            <section class="media-reference-editor" aria-label="型号受控媒体">
              <div class="section-card-heading"><strong>受控型号媒体</strong><span>{{ modelDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="modelMediaSelection" :disabled="!canEdit(modelDraft)"><option value="">选择已发布产品素材</option><option v-for="asset in reviewedMediaAssets('product')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(modelDraft) || !modelMediaSelection" @click="addModelMediaReference">添加</button></div>
              <p v-if="!reviewedMediaAssets('product').length" class="form-help">暂无已发布的产品素材。请先在“媒体资产”中完成登记、审核和发布。</p>
              <div v-for="reference in modelDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'product') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelMediaReference(reference.media_asset_id)">移除</button></div>
            </section>
            <div class="form-actions"><a :href="nativeItemPath('product_models', modelDraft.id)">打开高级设置查看配置与素材</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(modelDraft)">{{ saving ? '保存中...' : '保存型号信息' }}</button></div>
          </form>
          <div v-else class="empty">请选择一个产品型号。</div>
        </div>

        <section v-if="modelDraft" class="parameters-panel" aria-labelledby="parameters-title">
          <div class="section-heading"><div><p class="eyebrow">技术参数</p><h3 id="parameters-title">独立技术参数</h3><p>参数独立保存，便于审核、对比和统一发布。</p></div><strong>{{ parameters.length }}</strong></div>
          <p v-if="parametersLoading" class="message">正在加载参数...</p>
          <div v-else class="table-wrap">
            <table>
              <thead><tr><th>分组</th><th>字段名称</th><th>数值</th><th>单位</th><th>测试条件</th><th>排序</th><th></th></tr></thead>
              <tbody>
                <tr v-for="parameter in parameters" :key="parameter.id">
                  <td><input v-model.trim="parameter.group_name" :disabled="!canEdit(parameter)" maxlength="120"></td>
                  <td><input v-model.trim="parameter.field_name" :disabled="!canEdit(parameter)" maxlength="160" required></td>
                  <td><input v-model.trim="parameter.value" :disabled="!canEdit(parameter)" maxlength="500" required></td>
                  <td><input v-model.trim="parameter.unit" :disabled="!canEdit(parameter)" maxlength="80"></td>
                  <td><input v-model.trim="parameter.test_conditions" :disabled="!canEdit(parameter)" maxlength="1000"></td>
                  <td><input v-model.number="parameter.sort_order" :disabled="!canEdit(parameter)" type="number" min="0" step="1"></td>
                  <td><button type="button" class="text-action" :disabled="saving || !canEdit(parameter)" @click="saveParameter(parameter)">保存</button></td>
                </tr>
                <tr v-if="!parameters.length"><td colspan="7" class="table-empty">当前型号暂无独立参数。</td></tr>
              </tbody>
            </table>
          </div>
          <form v-if="canEdit(modelDraft)" class="new-parameter" @submit.prevent="createParameter">
            <h4>新增技术参数</h4>
            <div class="field-grid parameter-fields"><label>分组<input v-model.trim="newParameter.group_name" maxlength="120"></label><label>字段名称<input v-model.trim="newParameter.field_name" required maxlength="160"></label><label>数值<input v-model.trim="newParameter.value" required maxlength="500"></label><label>单位<input v-model.trim="newParameter.unit" maxlength="80"></label></div>
            <div class="form-actions"><span></span><button class="primary-action" type="submit" :disabled="saving">新增参数</button></div>
          </form>
        </section>
      </section>

      <div v-if="previewOpen" class="preview-backdrop" @click.self="closePreview">
        <section class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="draft-preview-title">
          <header class="preview-dialog-heading">
            <div><p class="eyebrow">草稿预览</p><h3 id="draft-preview-title">{{ previewTitle }}</h3></div>
            <button type="button" class="preview-close" aria-label="关闭预览" @click="closePreview">关闭</button>
          </header>
          <p class="preview-notice">这是当前表单内容的本地预览，不会发布到官网；带“待审核”标记的内容仍不能公开。</p>

          <article v-if="previewKind === 'page'" class="site-preview page-preview">
            <div class="preview-hero"><span>页面预览</span><h4>{{ pageDraft.title || '未命名页面' }}</h4><p>{{ pageDraft.seo.description || '尚未填写页面描述' }}</p></div>
            <section v-for="(section, index) in pageDraft.sections" :key="`${section.id}-${index}`" class="preview-section">
              <small>{{ section.kicker || `第 ${index + 1} 段` }}</small><h5>{{ section.title || '未命名段落' }} <em v-if="section.requires_claim_review">待审核</em></h5><p>{{ section.body || '尚未填写正文' }}</p>
            </section>
          </article>

          <article v-else-if="previewKind === 'article'" class="site-preview article-preview">
            <p class="preview-category">{{ editorialDraft.category || '未分类' }}</p><h4>{{ editorialDraft.title || '未命名文章' }}</h4><p class="preview-summary">{{ editorialDraft.summary || '尚未填写摘要' }}</p><div class="preview-body">{{ editorialDraft.body || '尚未填写正文' }}</div>
          </article>

          <article v-else-if="previewKind === 'series'" class="site-preview product-preview">
            <p class="preview-category">产品系列</p><h4>{{ seriesDraft.name || '未命名系列' }}</h4><p>{{ seriesDraft.positioning || '尚未填写系列定位' }}</p><div class="preview-columns"><section><strong>应用场景</strong><ul><li v-for="item in fromTextList(seriesDraft.scenariosText)" :key="item">{{ item }}</li><li v-if="!fromTextList(seriesDraft.scenariosText).length">尚未填写</li></ul></section><section><strong>核心能力</strong><ul><li v-for="item in fromTextList(seriesDraft.capabilitiesText)" :key="item">{{ item }}</li><li v-if="!fromTextList(seriesDraft.capabilitiesText).length">尚未填写</li></ul></section></div>
          </article>

          <article v-else-if="previewKind === 'model'" class="site-preview product-preview">
            <p class="preview-category">{{ modelDraft.series_code || '产品型号' }}</p><h4>{{ modelDraft.name || '未命名型号' }}</h4><p>型号编码：{{ modelDraft.model_code || '未填写' }}</p><table><thead><tr><th>参数</th><th>数值</th><th>单位</th></tr></thead><tbody><tr v-for="parameter in parameters" :key="parameter.id"><td>{{ parameter.field_name }}</td><td>{{ parameter.value }}</td><td>{{ parameter.unit || '-' }}</td></tr><tr v-if="!parameters.length"><td colspan="3">尚未填写技术参数</td></tr></tbody></table>
          </article>

          <div v-else class="preview-empty">当前内容类型暂不支持画面预览。请先保存草稿，再由对应页面的预览入口检查最终展示。</div>
        </section>
      </div>
    </div>
  </private-view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const editableStatuses = new Set(['draft', 'rejected', 'unpublished']);
const repairPageKeys = new Set(['repair_home', 'repair_new', 'repair_warranty', 'repair_progress']);
const repairActionCodes = new Set(['01', '02', '09', '10']);
const activeTab = ref('home');
const technicalAccess = ref(false);
const showAdvanced = ref(false);
const helpOpen = ref(false);
const loading = ref(false);
const saving = ref(false);
const parametersLoading = ref(false);
const error = ref('');
const message = ref('');
const pages = ref([]);
const series = ref([]);
const models = ref([]);
const parameters = ref([]);
const company = ref({ milestones: [], qualifications: [], manufacturing_evidence: [] });
const service = ref({ service_resources: [], service_locations: [], external_service_entries: [] });
const repairPages = ref([]);
const editorial = ref({ articles: [], case_studies: [] });
const mediaAssets = ref([]);
const mediaCandidates = ref([]);
const mediaPreviewUrls = ref({});
const mediaPreviewsLoaded = ref(false);
const mediaFileInput = ref(null);
const knowledgeItems = ref([]);
const knowledgeSearch = ref('');
const knowledgeMediaSelection = ref('');
const reviewQueue = ref([]);
const reviewLoading = ref(false);
const reviewSaving = ref(false);
const reviewQueueLoaded = ref(false);
const selectedReviewKey = ref('');
const reviewNote = ref('');
const submissionQueue = ref([]);
const submissionLoading = ref(false);
const submissionSaving = ref(false);
const submissionQueueLoaded = ref(false);
const selectedSubmissionKey = ref('');
const submissionNote = ref('');
const submissionMode = ref('submit');
const settingsDraft = ref(null);
const selectedPageId = ref('');
const selectedSeriesId = ref('');
const selectedModelId = ref('');
const companyMode = ref('milestones');
const selectedCompanyId = ref('');
const serviceMode = ref('service_resources');
const selectedServiceId = ref('');
const selectedRepairPageId = ref('');
const editorialMode = ref('articles');
const selectedEditorialId = ref('');
const selectedKnowledgeId = ref('');
const pageDraft = ref(null);
const seriesDraft = ref(null);
const modelDraft = ref(null);
const companyDraft = ref(null);
const companyMediaSelection = ref('');
const modelMediaSelection = ref('');
const serviceDraft = ref(null);
const repairDraft = ref(null);
const editorialDraft = ref(null);
const knowledgeDraft = ref(null);
const selectedReviewRecord = computed(() => reviewQueue.value.find((record) => reviewRecordKey(record) === selectedReviewKey.value) || null);
const selectedSubmissionRecord = computed(() => submissionQueue.value.find((record) => submissionRecordKey(record) === selectedSubmissionKey.value) || null);
const newParameter = ref(emptyParameter());
const mediaDraft = ref(emptyMediaDraft());
const previewOpen = ref(false);
const websitePreviewOpening = ref(false);
const savedDraftFingerprint = ref('');

const previewKind = computed(() => {
  if (activeTab.value === 'pages' && pageDraft.value) return 'page';
  if (activeTab.value === 'editorial' && editorialMode.value === 'articles' && editorialDraft.value) return 'article';
  if (activeTab.value === 'series' && seriesDraft.value) return 'series';
  if (activeTab.value === 'models' && modelDraft.value) return 'model';
  return '';
});
const previewAvailable = computed(() => Boolean(previewKind.value));
const previewTitle = computed(() => ({ page: pageDraft.value?.title, article: editorialDraft.value?.title, series: seriesDraft.value?.name, model: modelDraft.value?.name }[previewKind.value] || '当前草稿'));
const websitePreviewTarget = computed(() => {
  if (activeTab.value === 'pages' && pageDraft.value) return { collection: 'pages', record: pageDraft.value };
  if (activeTab.value === 'series' && seriesDraft.value) return { collection: 'product_series', record: seriesDraft.value };
  if (activeTab.value === 'models' && modelDraft.value) return { collection: 'product_models', record: modelDraft.value };
  if (activeTab.value === 'company' && companyDraft.value) return { collection: companyMode.value, record: companyDraft.value };
  if (activeTab.value === 'service' && serviceDraft.value) return { collection: serviceMode.value, record: serviceDraft.value };
  if (activeTab.value === 'repair' && repairDraft.value) return { collection: 'repair_page_configs', record: repairDraft.value };
  if (activeTab.value === 'editorial' && editorialDraft.value) return { collection: editorialMode.value, record: editorialDraft.value };
  if (activeTab.value === 'knowledge' && knowledgeDraft.value) return { collection: 'knowledge_items', record: knowledgeDraft.value };
  if (activeTab.value === 'settings' && settingsDraft.value) return { collection: 'site_settings', record: settingsDraft.value };
  return null;
});
const websitePreviewAvailable = computed(() => {
  const target = websitePreviewTarget.value;
  return Boolean(target?.record?.id && editableStatuses.has(target.record.status) && target.record.publication_state !== 'published');
});
const hasUnsavedChanges = computed(() => Boolean(savedDraftFingerprint.value) && currentDraftFingerprint() !== savedDraftFingerprint.value);

const advancedTabs = new Set(['media', 'knowledge', 'models', 'review', 'settings']);

function currentDraftState() {
  if (activeTab.value === 'pages') return pageDraft.value;
  if (activeTab.value === 'series') return seriesDraft.value;
  if (activeTab.value === 'models') return { model: modelDraft.value, parameters: parameters.value, newParameter: newParameter.value };
  if (activeTab.value === 'company') return companyDraft.value;
  if (activeTab.value === 'service') return serviceDraft.value;
  if (activeTab.value === 'repair') return repairDraft.value;
  if (activeTab.value === 'editorial') return editorialDraft.value;
  if (activeTab.value === 'knowledge') return knowledgeDraft.value;
  if (activeTab.value === 'settings') return settingsDraft.value;
  if (activeTab.value === 'media') return { ...mediaDraft.value, file: mediaDraft.value.file ? { name: mediaDraft.value.file.name, size: mediaDraft.value.file.size, type: mediaDraft.value.file.type, lastModified: mediaDraft.value.file.lastModified } : null };
  if (activeTab.value === 'submit') return { mode: submissionMode.value, selected: selectedSubmissionKey.value, note: submissionNote.value };
  if (activeTab.value === 'review') return { selected: selectedReviewKey.value, note: reviewNote.value };
  return null;
}

function currentDraftFingerprint() {
  return JSON.stringify(currentDraftState());
}

function markDraftSaved() {
  savedDraftFingerprint.value = currentDraftFingerprint();
}

function confirmDiscardChanges(action) {
  if (!hasUnsavedChanges.value) return true;
  return window.confirm(`当前内容有未保存的修改。确定要${action}吗？未保存内容将丢失。`);
}

function selectTab(tab) {
  if (tab === activeTab.value) return;
  if (!confirmDiscardChanges('切换内容类型')) return;
  activeTab.value = tab;
  if (advancedTabs.has(tab)) showAdvanced.value = true;
  markDraftSaved();
}

function requestReload() {
  if (!confirmDiscardChanges('重新加载')) return;
  load();
}

function openPreview() {
  if (previewAvailable.value) previewOpen.value = true;
}

function closePreview() {
  previewOpen.value = false;
}

function fallbackWebsitePreviewOpenUrl() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:4173/api/preview/open`;
}

function submitPreviewToken(openUrl, token) {
  const form = document.createElement('form');
  const field = document.createElement('input');
  form.method = 'post';
  form.action = openUrl;
  form.target = 'ruijun-website-draft-preview';
  form.style.display = 'none';
  field.name = 'token';
  field.value = token;
  form.append(field);
  document.body.append(form);
  form.submit();
  form.remove();
}

async function openWebsitePreview() {
  const target = websitePreviewTarget.value;
  if (!websitePreviewAvailable.value || !target) return;
  const previewWindow = window.open('about:blank', 'ruijun-website-draft-preview');
  if (!previewWindow) { error.value = '浏览器阻止了预览窗口，请允许本站点打开新窗口后重试。'; return; }
  try { previewWindow.opener = null; } catch { /* Browser policy can forbid changing opener. */ }
  websitePreviewOpening.value = true;
  error.value = ''; message.value = '';
  try {
    const response = await api.post('/content-preview-tokens/issue', { contentCollection: target.collection, contentItemId: target.record.id, ttlSeconds: 900 });
    const data = response.data?.data;
    if (!data?.token) throw new Error('预览令牌签发失败');
    submitPreviewToken(data.preview_open_url || fallbackWebsitePreviewOpenUrl(), data.token);
    message.value = '已在新窗口打开官网草稿预览；预览仅供内部审核，不会公开发布。';
  } catch (reason) {
    previewWindow.close();
    error.value = apiError(reason, '无法打开官网预览，请确认草稿已保存且预览服务正在运行。');
  } finally { websitePreviewOpening.value = false; }
}

function handlePreviewKeydown(event) {
  if (event.key === 'Escape' && previewOpen.value) closePreview();
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function parseObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return clone(value);
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
  }
  return fallback;
}

function parseArray(value) {
  if (Array.isArray(value)) return clone(value);
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function textList(value) {
  return parseArray(value).map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean).join('\n');
}

function fromTextList(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function contentListText(value) {
  return parseArray(value).map((item) => {
    if (typeof item === 'string') return item.trim();
    return typeof item?.content === 'string' ? item.content.trim() : '';
  }).filter(Boolean).join('\n');
}

function knowledgeSteps(record) {
  const steps = parseArray(record.troubleshooting_steps);
  if (steps.length === 1 && steps[0] && typeof steps[0] === 'object' && typeof steps[0].content === 'string') {
    return { text: steps[0].content, type: String(steps[0].type || 'manual_step') };
  }
  return { text: contentListText(steps), type: 'manual_step' };
}

function normalizeSections(value) {
  return parseArray(value).filter((section) => section && typeof section === 'object').map((section) => ({
    ...section,
    id: String(section.id || ''),
    kicker: typeof section.kicker === 'string' ? section.kicker : '',
    title: typeof section.title === 'string' ? section.title : '',
    body: typeof section.body === 'string' ? section.body : ''
  }));
}

function normalizePage(record) {
  const seo = parseObject(record.seo);
  return { ...clone(record), sections: normalizeSections(record.sections), seo: { ...seo, title: typeof seo.title === 'string' ? seo.title : '', description: typeof seo.description === 'string' ? seo.description : '', keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : String(seo.keywords || '') } };
}

function normalizeSeries(record) {
  return { ...clone(record), scenariosText: textList(record.scenarios), capabilitiesText: textList(record.capabilities), sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0 };
}

function normalizeMediaReferences(value) {
  const seen = new Set();
  return parseArray(value).flatMap((entry) => {
    const mediaAssetId = typeof entry?.media_asset_id === 'string' || Number.isSafeInteger(entry?.media_asset_id)
      ? String(entry.media_asset_id).trim() : '';
    if (!mediaAssetId || seen.has(mediaAssetId)) return [];
    seen.add(mediaAssetId);
    return [{ media_asset_id: mediaAssetId }];
  });
}

function normalizeCompany(record) {
  const mediaField = companyMode.value === 'qualifications' ? record.assets : record.media;
  return { ...clone(record), sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0, mediaReferences: normalizeMediaReferences(mediaField) };
}

function companyMediaScope() {
  return companyMode.value === 'qualifications' ? 'qualification' : 'manufacturing';
}

function mediaReferenceLabel(reference, scope) {
  const asset = reviewedMediaAssets(scope).find((candidate) => String(candidate.id) === String(reference.media_asset_id));
  return asset ? mediaAssetLabel(asset) : `当前引用 ${reference.media_asset_id}（尚未通过此选择器验证）`;
}

function normalizeModel(record) {
  return { ...clone(record), mediaReferences: normalizeMediaReferences(record.media) };
}

function emptyParameter() {
  return { group_name: '', field_name: '', value: '', unit: '', sort_order: 0, test_conditions: '' };
}

function emptyMediaDraft() {
  return { file: null, usage_scope: 'product', copyright_status: 'owned', alt_text: '', authorization_note: '' };
}

const mediaUploadRules = Object.freeze({
  'image/jpeg': 25 * 1024 * 1024,
  'image/png': 25 * 1024 * 1024,
  'image/webp': 25 * 1024 * 1024,
  'image/avif': 25 * 1024 * 1024,
  'video/mp4': 500 * 1024 * 1024,
  'video/webm': 500 * 1024 * 1024,
  'application/pdf': 50 * 1024 * 1024
});

function readableFileSize(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '未知大小';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function usageScopeLabel(scope) {
  return { product: '产品与型号', manufacturing: '制造与厂区', service: '服务资料', knowledge: '知识库', brand: '品牌与企业', article: '文章与资讯', qualification: '资质证书', case_study: '客户案例' }[scope] || scope || '未分类';
}

function selectMediaFile(event) {
  const file = event?.target?.files?.[0] || null;
  mediaDraft.value.file = file;
}

function validateMediaFile(file) {
  if (!file) return '请选择要登记的媒体文件。';
  const limit = mediaUploadRules[file.type];
  if (!limit) return '仅支持 JPG、PNG、WebP、AVIF、MP4、WebM 或 PDF 文件。';
  if (file.size < 1) return '不能上传空文件。';
  if (file.size > limit) return `文件超过 ${readableFileSize(limit)} 的上限。`;
  return '';
}

function companyRecords(mode) {
  return company.value[mode] || [];
}

function companyLabel(record) {
  if (companyMode.value === 'milestones') return `${record.year || '未填写'} 年 - ${record.event || '未填写事件'}`;
  if (companyMode.value === 'qualifications') return record.name || record.source_key || '未命名资质';
  return record.process || record.source_key || '未命名制造证据';
}

function companyHeading() {
  return { milestones: '发展历程', qualifications: '资质证书', manufacturing_evidence: '制造证据' }[companyMode.value];
}

function serviceRecords(mode) {
  return service.value[mode] || [];
}

function serviceLabel(record) {
  if (serviceMode.value === 'service_resources') return record.source_key || record.type || '未命名服务资料';
  if (serviceMode.value === 'service_locations') return `${record.region || '未填写'} ${record.city || '未填写'}`;
  return record.entry_type || '未命名售后入口';
}

function serviceSecondary(record) {
  if (serviceMode.value === 'service_resources') return record.type || '';
  if (serviceMode.value === 'service_locations') return record.source_key || '';
  return record.open_mode || '';
}

function serviceHeading() {
  return { service_resources: '服务资料', service_locations: '服务网点', external_service_entries: '售后入口' }[serviceMode.value];
}

function editorialRecords(mode) {
  return editorial.value[mode] || [];
}

function editorialLabel(record) {
  return editorialMode.value === 'articles' ? (record.title || record.slug || '未命名文章') : (record.slug || '未命名案例');
}

function editorialSecondary(record) {
  return editorialMode.value === 'articles' ? (record.category || record.slug || '') : (record.model_code || record.industry || '客户案例');
}

function editorialHeading() {
  return editorialMode.value === 'articles' ? '新闻与文章' : '客户案例';
}

function normalizeService(record) {
  const copy = clone(record);
  if (serviceMode.value === 'service_resources') copy.applicableModelsText = textList(copy.applicable_models);
  if (serviceMode.value === 'service_locations') copy.contact = { ...parseObject(copy.contact), name: String(parseObject(copy.contact).name || ''), phone: String(parseObject(copy.contact).phone || ''), email: String(parseObject(copy.contact).email || ''), address: String(parseObject(copy.contact).address || '') };
  return copy;
}

function normalizeLink(value) {
  const link = parseObject(value);
  return { ...link, label: String(link.label || ''), href: String(link.href || '') };
}

function normalizeSettings(record) {
  const footer = parseObject(record.footer);
  const brand = parseObject(record.brand);
  const contacts = parseObject(record.contacts);
  const headerCta = parseObject(contacts.header_cta);
  return {
    ...clone(record),
    navigation: parseArray(record.navigation).map(normalizeLink),
    footer: { ...footer, primary_links: parseArray(footer.primary_links).map(normalizeLink), requires_business_review: footer.requires_business_review === true },
    brand: { ...brand, display_name: String(brand.display_name || ''), logo_asset: String(brand.logo_asset || '') },
    contacts: { ...contacts, service_phone: String(contacts.service_phone || ''), header_cta: { ...headerCta, label: String(headerCta.label || ''), href: String(headerCta.href || '') } },
    languagesText: textList(record.languages)
  };
}

function normalizeArticle(record) {
  const seo = parseObject(record.seo);
  return { ...clone(record), seo: { ...seo, title: typeof seo.title === 'string' ? seo.title : '', description: typeof seo.description === 'string' ? seo.description : '', keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : String(seo.keywords || '') } };
}

function normalizeKnowledge(record) {
  const steps = knowledgeSteps(record);
  return {
    ...clone(record),
    applicableModelsText: textList(record.applicable_models),
    errorCodesText: textList(record.error_codes),
    troubleshootingStepsText: steps.text,
    troubleshootingStepType: steps.type,
    safetyPreconditionsText: contentListText(record.safety_preconditions),
    mediaReferences: normalizeMediaReferences(record.media),
    symptoms: String(record.symptoms || ''),
    escalation_guidance: String(record.escalation_guidance || ''),
    version: String(record.version || ''),
    technical_reviewer: String(record.technical_reviewer || '')
  };
}

function riskLabel(value) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[String(value || '').toLowerCase()] || '未分类';
}

const filteredKnowledge = computed(() => {
  const needle = knowledgeSearch.value.normalize('NFKC').trim().toLowerCase();
  return knowledgeItems.value.filter((item) => {
    if (!needle) return true;
    return [item.question_title, item.category, item.source_key].some((value) => String(value || '').normalize('NFKC').toLowerCase().includes(needle));
  });
});

function reviewedMediaAssets(scope) {
  return mediaAssets.value.filter((asset) => asset.usage_scope === scope);
}

function isReviewedMediaAsset(value, scope) {
  return reviewedMediaAssets(scope).some((asset) => String(asset.id) === String(value));
}

function mediaAssetLabel(asset) {
  return `${asset.original_file_name || `素材 ${asset.id}`} · ${asset.mime_type || '未知类型'}`;
}

function isPreviewableMedia(asset) {
  return String(asset?.mime_type || '').toLowerCase().startsWith('image/') && Boolean(asset?.file_id);
}

function mediaPreviewLabel(asset) {
  if (isPreviewableMedia(asset)) return '图片';
  if (String(asset?.mime_type || '').startsWith('video/')) return '视频';
  if (asset?.mime_type === 'application/pdf') return 'PDF';
  return '文件';
}

function mediaPreviewUrl(asset) {
  return mediaPreviewUrls.value[String(asset?.id || '')] || '';
}

function clearMediaPreviews() {
  Object.values(mediaPreviewUrls.value).forEach((url) => {
    if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
  mediaPreviewUrls.value = {};
  mediaPreviewsLoaded.value = false;
}

async function loadMediaPreview(asset) {
  const key = String(asset?.id || '');
  if (!key || !isPreviewableMedia(asset) || mediaPreviewUrls.value[key]) return;
  const response = await api.get(`/assets/${encodeURIComponent(asset.file_id)}?width=240&height=150&fit=cover`, { responseType: 'blob' });
  const blob = response.data;
  if (!(blob instanceof Blob) || !blob.size) return;
  mediaPreviewUrls.value = { ...mediaPreviewUrls.value, [key]: URL.createObjectURL(blob) };
}

async function loadMediaPreviews() {
  if (mediaPreviewsLoaded.value) return;
  const previewable = mediaCandidates.value.filter(isPreviewableMedia).slice(0, 24);
  await Promise.allSettled(previewable.map(loadMediaPreview));
  mediaPreviewsLoaded.value = true;
}

function normalizeEditorial(record) {
  return editorialMode.value === 'articles' ? normalizeArticle(record) : clone(record);
}

function canEdit(record) {
  return Boolean(record?.id) && editableStatuses.has(record.status) && record.publication_state !== 'published';
}

function statusLabel(status) {
  return { draft: '草稿', rejected: '退回修改', unpublished: '已下线', review: '审核中', scheduled: '待发布', published: '已发布', archived: '已归档' }[status] || status || '未知';
}

function knowledgeSyncStatusLabel(status) {
  return { eligible: '等待同步', synced: '已同步', failed: '同步失败', not_eligible: '暂不满足同步条件' }[status] || '暂不满足同步条件';
}

function nativeItemPath(collection, id) {
  return `/admin/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

function apiError(reason, fallback) {
  return reason?.response?.data?.errors?.[0]?.message || fallback;
}

const contentQueueDefinitions = Object.freeze([
  { collection: 'pages', label: '页面文案', fields: ['title', 'slug'] },
  { collection: 'product_series', label: '产品系列', fields: ['name', 'series_code'] },
  { collection: 'product_models', label: '产品型号', fields: ['name', 'model_code'] },
  { collection: 'product_parameters', label: '技术参数', fields: ['field_name', 'model_code'] },
  { collection: 'articles', label: '文章资讯', fields: ['title', 'slug'] },
  { collection: 'case_studies', label: '客户案例', fields: ['slug', 'model_code'] },
  { collection: 'manufacturing_evidence', label: '制造证据', fields: ['process', 'source_key'] },
  { collection: 'qualifications', label: '资质证书', fields: ['name', 'certificate_number'] },
  { collection: 'milestones', label: '发展历程', fields: ['event', 'year'] },
  { collection: 'service_resources', label: '服务资料', fields: ['source_key', 'type'] },
  { collection: 'service_locations', label: '服务网点', fields: ['city', 'region'] },
  { collection: 'knowledge_items', label: '常见问题知识', fields: ['question_title', 'source_key'] },
  { collection: 'external_service_entries', label: '售后入口', fields: ['entry_type', 'url'] },
  { collection: 'media_assets', label: '媒体资产', fields: ['original_file_name', 'usage_scope'] },
  { collection: 'site_settings', label: '全站设置', fields: ['setting_key'] }
]);

function reviewRecordKey(record) {
  return `${record.collection}:${record.id}`;
}

function submissionRecordKey(record) {
  return `${record.collection}:${record.id}`;
}

function normalizeReviewRecord(definition, record) {
  const [primaryField, secondaryField] = definition.fields;
  return {
    id: record.id,
    collection: definition.collection,
    collectionLabel: definition.label,
    label: String(record[primaryField] || record[secondaryField] || `${definition.label} ${record.id}`),
    secondary: String(record[secondaryField] || ''),
    status: record.status,
    publication_state: record.publication_state,
    review_note: String(record.review_note || '')
  };
}

async function loadContentQueue(status) {
  const responses = await Promise.allSettled(contentQueueDefinitions.map(async (definition) => {
      const fields = ['id', 'status', 'publication_state', 'review_note', ...definition.fields].join(',');
      const query = new URLSearchParams({ fields, limit: '-1', sort: definition.fields[0] });
      if (status.includes(',')) query.set('filter[status][_in]', status);
      else query.set('filter[status][_eq]', status);
      const response = await api.get(`/items/${definition.collection}?${query.toString()}`);
      const records = Array.isArray(response.data?.data) ? response.data.data : [];
      return records.map((record) => normalizeReviewRecord(definition, record));
  }));
  return responses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

async function loadReviewQueue() {
  reviewLoading.value = true;
  error.value = '';
  try {
    reviewQueue.value = await loadContentQueue('review');
    if (!reviewQueue.value.some((record) => reviewRecordKey(record) === selectedReviewKey.value)) {
      selectedReviewKey.value = reviewQueue.value[0] ? reviewRecordKey(reviewQueue.value[0]) : '';
      reviewNote.value = '';
    }
    reviewQueueLoaded.value = true;
    if (activeTab.value === 'review') markDraftSaved();
  } catch (reason) {
    reviewQueue.value = [];
    error.value = apiError(reason, '无法读取待审核内容。请确认当前账号具有对应审核权限。');
  } finally {
    reviewLoading.value = false;
  }
}

async function loadSubmissionQueue() {
  submissionLoading.value = true;
  error.value = '';
  try {
    submissionQueue.value = await loadContentQueue(submissionMode.value === 'restore' ? 'rejected,unpublished' : 'draft');
    if (!submissionQueue.value.some((record) => submissionRecordKey(record) === selectedSubmissionKey.value)) {
      selectedSubmissionKey.value = submissionQueue.value[0] ? submissionRecordKey(submissionQueue.value[0]) : '';
      submissionNote.value = '';
    }
    submissionQueueLoaded.value = true;
    if (activeTab.value === 'submit') markDraftSaved();
  } catch (reason) {
    submissionQueue.value = [];
    error.value = apiError(reason, '无法读取草稿清单。请确认当前账号具有内容读取权限。');
  } finally {
    submissionLoading.value = false;
  }
}

function setSubmissionMode(mode) {
  if (!['submit', 'restore'].includes(mode) || submissionMode.value === mode) return;
  if (!confirmDiscardChanges('切换审核任务')) return;
  submissionMode.value = mode;
  selectedSubmissionKey.value = '';
  submissionNote.value = '';
  submissionQueueLoaded.value = false;
  loadSubmissionQueue().then(markDraftSaved);
}

function selectReviewRecord(record, force = false) {
  if (!force && !confirmDiscardChanges('切换审核记录')) return;
  selectedReviewKey.value = reviewRecordKey(record);
  reviewNote.value = '';
  markDraftSaved();
}

function selectSubmissionRecord(record, force = false) {
  if (!force && !confirmDiscardChanges('切换草稿记录')) return;
  selectedSubmissionKey.value = submissionRecordKey(record);
  submissionNote.value = '';
  markDraftSaved();
}

async function submitForReview() {
  const record = selectedSubmissionRecord.value;
  if (!record) return;
  submissionSaving.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status: 'review', review_note: submissionNote.value || null });
    message.value = '已提交审核。内容将由对应审核角色处理，前端不会直接发布。';
    await Promise.all([loadSubmissionQueue(), loadReviewQueue()]);
  } catch (reason) {
    error.value = apiError(reason, '提交审核失败。请补全来源、受控媒体或内容前置条件后重试。');
  } finally {
    submissionSaving.value = false;
  }
}

async function restoreDraft() {
  const record = selectedSubmissionRecord.value;
  if (!record || !['rejected', 'unpublished'].includes(record.status)) return;
  submissionSaving.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status: 'draft', review_note: submissionNote.value || null });
    message.value = '内容已恢复为草稿，可继续编辑后再次提交审核。';
    await loadSubmissionQueue();
  } catch (reason) {
    error.value = apiError(reason, '恢复草稿失败。请确认当前账号具有内容编辑权限。');
  } finally {
    submissionSaving.value = false;
  }
}

async function decideReview(status) {
  const record = selectedReviewRecord.value;
  if (!record || !['scheduled', 'rejected'].includes(status)) return;
  reviewSaving.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status, review_note: reviewNote.value || null });
    message.value = status === 'scheduled' ? '审核已提交为待发布，是否允许流转由服务端规则确认。' : '已退回修改，内容编辑人员可在草稿流程中继续完善。';
    await loadReviewQueue();
  } catch (reason) {
    error.value = apiError(reason, '审核流转失败。请确认当前账号角色及内容就绪状态。');
  } finally {
    reviewSaving.value = false;
  }
}

function selectPage(id, force = false) {
  if (!force && id !== selectedPageId.value && !confirmDiscardChanges('切换页面内容')) return;
  selectedPageId.value = id;
  const record = pages.value.find((item) => item.id === id);
  pageDraft.value = record ? normalizePage(record) : null;
  markDraftSaved();
}

function selectSeries(id, force = false) {
  if (!force && id !== selectedSeriesId.value && !confirmDiscardChanges('切换产品系列')) return;
  selectedSeriesId.value = id;
  const record = series.value.find((item) => item.id === id);
  seriesDraft.value = record ? normalizeSeries(record) : null;
  markDraftSaved();
}

function selectCompanyMode(mode, force = false) {
  if (!force && mode !== companyMode.value && !confirmDiscardChanges('切换企业资料类型')) return;
  companyMode.value = mode;
  const nextId = companyRecords(mode).some((item) => item.id === selectedCompanyId.value) ? selectedCompanyId.value : companyRecords(mode)[0]?.id;
  if (nextId) selectCompanyRecord(nextId, true); else { selectedCompanyId.value = ''; companyDraft.value = null; markDraftSaved(); }
}

function selectCompanyRecord(id, force = false) {
  if (!force && id !== selectedCompanyId.value && !confirmDiscardChanges('切换企业资料')) return;
  selectedCompanyId.value = id;
  const record = companyRecords(companyMode.value).find((item) => item.id === id);
  companyMediaSelection.value = '';
  companyDraft.value = record ? normalizeCompany(record) : null;
  markDraftSaved();
}

function addCompanyMediaReference() {
  const assetId = String(companyMediaSelection.value || '').trim();
  if (!companyDraft.value || !assetId || !isReviewedMediaAsset(assetId, companyMediaScope())) return;
  if (!companyDraft.value.mediaReferences.some((reference) => String(reference.media_asset_id) === assetId)) {
    companyDraft.value.mediaReferences.push({ media_asset_id: assetId });
  }
  companyMediaSelection.value = '';
}

function addModelMediaReference() {
  const assetId = String(modelMediaSelection.value || '').trim();
  if (!modelDraft.value || !assetId || !isReviewedMediaAsset(assetId, 'product')) return;
  if (!modelDraft.value.mediaReferences.some((reference) => String(reference.media_asset_id) === assetId)) {
    modelDraft.value.mediaReferences.push({ media_asset_id: assetId });
  }
  modelMediaSelection.value = '';
}

function removeCompanyMediaReference(assetId) {
  if (!companyDraft.value) return;
  companyDraft.value.mediaReferences = companyDraft.value.mediaReferences.filter((reference) => String(reference.media_asset_id) !== String(assetId));
}

function removeModelMediaReference(assetId) {
  if (!modelDraft.value) return;
  modelDraft.value.mediaReferences = modelDraft.value.mediaReferences.filter((reference) => String(reference.media_asset_id) !== String(assetId));
}

function selectServiceMode(mode, force = false) {
  if (!force && mode !== serviceMode.value && !confirmDiscardChanges('切换服务内容类型')) return;
  serviceMode.value = mode;
  const nextId = serviceRecords(mode).some((item) => item.id === selectedServiceId.value) ? selectedServiceId.value : serviceRecords(mode)[0]?.id;
  if (nextId) selectServiceRecord(nextId, true); else { selectedServiceId.value = ''; serviceDraft.value = null; markDraftSaved(); }
}

function selectServiceRecord(id, force = false) {
  if (!force && id !== selectedServiceId.value && !confirmDiscardChanges('切换服务内容')) return;
  selectedServiceId.value = id;
  const record = serviceRecords(serviceMode.value).find((item) => item.id === id);
  serviceDraft.value = record ? normalizeService(record) : null;
  markDraftSaved();
}

function selectEditorialMode(mode, force = false) {
  if (!force && mode !== editorialMode.value && !confirmDiscardChanges('切换内容类型')) return;
  editorialMode.value = mode;
  const nextId = editorialRecords(mode).some((item) => item.id === selectedEditorialId.value) ? selectedEditorialId.value : editorialRecords(mode)[0]?.id;
  if (nextId) selectEditorialRecord(nextId, true); else { selectedEditorialId.value = ''; editorialDraft.value = null; markDraftSaved(); }
}

function selectEditorialRecord(id, force = false) {
  if (!force && id !== selectedEditorialId.value && !confirmDiscardChanges('切换文章或案例')) return;
  selectedEditorialId.value = id;
  const record = editorialRecords(editorialMode.value).find((item) => item.id === id);
  editorialDraft.value = record ? normalizeEditorial(record) : null;
  markDraftSaved();
}

function selectKnowledge(id, force = false) {
  if (!force && id !== selectedKnowledgeId.value && !confirmDiscardChanges('切换知识草稿')) return;
  selectedKnowledgeId.value = id;
  const record = knowledgeItems.value.find((item) => item.id === id);
  knowledgeDraft.value = record ? normalizeKnowledge(record) : null;
  knowledgeMediaSelection.value = '';
  markDraftSaved();
}

function addKnowledgeMediaReference() {
  const assetId = String(knowledgeMediaSelection.value || '').trim();
  if (!knowledgeDraft.value || !assetId || !isReviewedMediaAsset(assetId, 'knowledge')) return;
  if (!knowledgeDraft.value.mediaReferences.some((reference) => String(reference.media_asset_id) === assetId)) {
    knowledgeDraft.value.mediaReferences.push({ media_asset_id: assetId });
  }
  knowledgeMediaSelection.value = '';
}

function removeKnowledgeMediaReference(assetId) {
  if (!knowledgeDraft.value) return;
  knowledgeDraft.value.mediaReferences = knowledgeDraft.value.mediaReferences.filter((reference) => String(reference.media_asset_id) !== String(assetId));
}

async function selectModel(id, force = false) {
  if (!force && id !== selectedModelId.value && !confirmDiscardChanges('切换产品型号')) return;
  selectedModelId.value = id;
  const record = models.value.find((item) => item.id === id);
  modelDraft.value = record ? normalizeModel(record) : null;
  modelMediaSelection.value = '';
  parameters.value = [];
  newParameter.value = emptyParameter();
  if (modelDraft.value) {
    newParameter.value.model_code = modelDraft.value.model_code;
    await loadParameters(modelDraft.value.model_code);
  }
  markDraftSaved();
}

function addPageSection() {
  pageDraft.value?.sections.push({ id: '', kicker: '', title: '', body: '' });
}

function removePageSection(index) {
  if (pageDraft.value?.sections.length > 1) pageDraft.value.sections.splice(index, 1);
}

function addSettingLink(target) {
  if (!settingsDraft.value) return;
  if (target === 'footer') settingsDraft.value.footer.primary_links.push({ label: '', href: '' });
  else settingsDraft.value.navigation.push({ label: '', href: '' });
}

function removeSettingLink(target, index) {
  if (!settingsDraft.value) return;
  const links = target === 'footer' ? settingsDraft.value.footer.primary_links : settingsDraft.value.navigation;
  links.splice(index, 1);
}

function validateSections(sections) {
  if (!sections.length) return '至少保留一个页面段落。';
  const ids = new Set();
  for (const section of sections) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(section.id)) return '段落标识只能使用小写字母、数字和短横线。';
    if (ids.has(section.id)) return `段落标识“${section.id}”重复。`;
    ids.add(section.id);
  }
  return '';
}

function isValidSiteLink(value) {
  const href = String(value || '').trim();
  return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]*$/.test(href) || /^https:\/\/[^\s/$.?#][^\s]*$/i.test(href);
}

function validateSettingLinks(links, label) {
  if (!links.length) return `${label}至少需要保留一项。`;
  for (const link of links) {
    if (!String(link.label || '').trim()) return `${label}的显示名称不能为空。`;
    if (!isValidSiteLink(link.href)) return `${label}链接只能使用站内路径或 HTTPS 地址。`;
  }
  return '';
}

async function loadPages() {
  const response = await api.get('/items/pages?fields=id,title,slug,language,sections,seo,status,publication_state,source_document,source_url,review_note&sort=title&limit=-1');
  pages.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = pages.value.some((item) => item.id === selectedPageId.value) ? selectedPageId.value : pages.value[0]?.id;
  if (nextId) selectPage(nextId, true); else { selectedPageId.value = ''; pageDraft.value = null; }
}

async function loadSeries() {
  const response = await api.get('/items/product_series?fields=id,series_code,slug,name,positioning,scenarios,capabilities,cover_asset,sort_order,status,publication_state,source_document,source_url,review_note&sort=sort_order,name&limit=-1');
  series.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = series.value.some((item) => item.id === selectedSeriesId.value) ? selectedSeriesId.value : series.value[0]?.id;
  if (nextId) selectSeries(nextId, true); else { selectedSeriesId.value = ''; seriesDraft.value = null; }
}

async function loadModels() {
  const response = await api.get('/items/product_models?fields=id,series_code,model_code,slug,name,media,status,publication_state,source_document,source_url,review_note&sort=series_code,model_code&limit=-1');
  models.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = models.value.some((item) => item.id === selectedModelId.value) ? selectedModelId.value : models.value[0]?.id;
  if (nextId) await selectModel(nextId, true); else { selectedModelId.value = ''; modelDraft.value = null; parameters.value = []; }
}

async function loadCompany() {
  const requests = [
    api.get('/items/milestones?fields=id,source_key,year,event,evidence,sort_order,status,publication_state,source_document,source_url,review_note&sort=sort_order,year&limit=-1'),
    api.get('/items/qualifications?fields=id,source_key,type,name,certificate_number,issuer,valid_until,assets,sort_order,authorization_status,status,publication_state,source_document,source_url,review_note&sort=sort_order,name&limit=-1'),
    api.get('/items/manufacturing_evidence?fields=id,source_key,process,description,media,inspection_evidence,sort_order,status,publication_state,source_document,source_url,review_note&sort=sort_order,process&limit=-1')
  ];
  const [milestones, qualifications, manufacturing] = await Promise.all(requests);
  company.value = {
    milestones: Array.isArray(milestones.data?.data) ? milestones.data.data : [],
    qualifications: Array.isArray(qualifications.data?.data) ? qualifications.data.data : [],
    manufacturing_evidence: Array.isArray(manufacturing.data?.data) ? manufacturing.data.data : []
  };
  selectCompanyMode(companyMode.value, true);
}

async function loadService() {
  const requests = [
    api.get('/items/service_resources?fields=id,source_key,type,applicable_models,version,language,asset,updated_at,status,publication_state,source_document,source_url,review_note&sort=source_key&limit=-1'),
    api.get('/items/service_locations?fields=id,source_key,region,city,service_scope,contact,business_status,valid_until,status,publication_state,source_document,source_url,review_note&sort=region,city&limit=-1'),
    api.get('/items/external_service_entries?fields=id,entry_type,url,enabled,open_mode,fallback_phone,health_status,status,publication_state,source_document,source_url,review_note&sort=entry_type&limit=-1')
  ];
  const [resources, locations, entries] = await Promise.all(requests);
  service.value = {
    service_resources: Array.isArray(resources.data?.data) ? resources.data.data : [],
    service_locations: Array.isArray(locations.data?.data) ? locations.data.data : [],
    external_service_entries: Array.isArray(entries.data?.data) ? entries.data.data : []
  };
  selectServiceMode(serviceMode.value, true);
}

function normalizeRepairPage(record) {
  const copy = clone(record);
  for (const key of ['model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo']) {
    const value = copy[key];
    copy[`${key}_text`] = JSON.stringify(value ?? (key === 'seo' ? {} : []), null, 2);
  }
  return copy;
}

async function loadRepairPages() {
  const response = await api.get('/items/repair_page_configs?fields=id,page_key,title,intro,hero_asset,model_cards,action_cards,process_steps,notices,faq_refs,seo,language,status,publication_state,source_document,source_url,review_note&sort=page_key&limit=-1');
  repairPages.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = repairPages.value.some((item) => item.id === selectedRepairPageId.value) ? selectedRepairPageId.value : repairPages.value[0]?.id;
  if (nextId) selectRepairPage(nextId, true); else { selectedRepairPageId.value = ''; repairDraft.value = null; }
}

function selectRepairPage(id, force = false) {
  if (!force && id !== selectedRepairPageId.value && !confirmDiscardChanges('切换售后页面')) return;
  selectedRepairPageId.value = id;
  const record = repairPages.value.find((item) => item.id === id);
  repairDraft.value = record ? normalizeRepairPage(record) : null;
  markDraftSaved();
}

function repairPreviewUrl(record) {
  return record?.page_key ? `/service?repairPage=${encodeURIComponent(record.page_key)}&preview=draft` : '/service';
}

async function loadEditorial() {
  const requests = [
    api.get('/items/articles?fields=id,slug,category,title,summary,body,video_url,cover_asset,seo,status,publication_state,source_document,source_url,review_note&sort=title,slug&limit=-1'),
    api.get('/items/case_studies?fields=id,slug,industry,material,thickness,model_code,process,result,authorization_status,status,publication_state,source_document,source_url,review_note&sort=slug&limit=-1')
  ];
  const [articles, cases] = await Promise.all(requests);
  editorial.value = {
    articles: Array.isArray(articles.data?.data) ? articles.data.data : [],
    case_studies: Array.isArray(cases.data?.data) ? cases.data.data : []
  };
  selectEditorialMode(editorialMode.value, true);
}

async function loadMediaAssets() {
  const query = new URLSearchParams({ fields: 'id,original_file_name,mime_type,usage_scope,status,publication_state,copyright_status', sort: 'original_file_name', limit: '-1' });
  query.set('filter[status][_eq]', 'published');
  query.set('filter[publication_state][_eq]', 'published');
  const response = await api.get(`/items/media_assets?${query.toString()}`);
  mediaAssets.value = Array.isArray(response.data?.data) ? response.data.data : [];
}

async function loadMediaCandidates() {
  const response = await api.get('/items/media_assets?fields=id,file_id,original_file_name,mime_type,byte_size,usage_scope,alt_text,copyright_status,authorization_note,status,publication_state,review_note&sort=original_file_name&limit=-1');
  clearMediaPreviews();
  mediaCandidates.value = Array.isArray(response.data?.data) ? response.data.data : [];
  if (activeTab.value === 'media') await loadMediaPreviews();
}

async function loadKnowledge() {
  const response = await api.get('/items/knowledge_items?fields=id,source_key,visibility,channel,category,question_title,applicable_models,error_codes,symptoms,troubleshooting_steps,risk_level,safety_preconditions,escalation_guidance,media,version,technical_reviewer,dify_sync_status,status,publication_state,source_document,source_url,review_note&sort=risk_level,question_title&limit=-1');
  knowledgeItems.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = knowledgeItems.value.some((item) => item.id === selectedKnowledgeId.value) ? selectedKnowledgeId.value : knowledgeItems.value[0]?.id;
  if (nextId) selectKnowledge(nextId, true); else { selectedKnowledgeId.value = ''; knowledgeDraft.value = null; }
}

async function loadSettings() {
  const response = await api.get('/items/site_settings?fields=id,setting_key,navigation,footer,brand,contacts,languages,analytics,status,publication_state,source_document,source_url,review_note&sort=setting_key&limit=-1');
  const records = Array.isArray(response.data?.data) ? response.data.data : [];
  const global = records.find((record) => record.setting_key === 'global') || records[0];
  settingsDraft.value = global ? normalizeSettings(global) : null;
}

async function loadParameters(modelCode) {
  parametersLoading.value = true;
  try {
    const query = new URLSearchParams({ fields: 'id,model_code,group_name,field_name,value,unit,sort_order,test_conditions,status,publication_state', sort: 'sort_order,field_name', limit: '-1' });
    query.set('filter[model_code][_eq]', modelCode);
    const response = await api.get(`/items/product_parameters?${query.toString()}`);
    parameters.value = Array.isArray(response.data?.data) ? response.data.data.map((record) => ({ ...record, sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0 })) : [];
  } catch (reason) {
    parameters.value = [];
    error.value = apiError(reason, '无法读取该型号的技术参数。');
  } finally {
    parametersLoading.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    const everyday = [loadPages(), loadSeries(), loadCompany(), loadEditorial()];
    const technical = technicalAccess.value
      ? [loadModels(), loadService(), loadRepairPages(), loadMediaAssets(), loadMediaCandidates(), loadKnowledge(), loadSettings()]
      : [];
    await Promise.all([...everyday, ...technical]);
    markDraftSaved();
    message.value = '已加载当前账号有权限查看的结构化内容。';
  } catch (reason) {
    error.value = apiError(reason, '无法读取后台内容。请确认当前账号有内容读取权限。');
  } finally {
    loading.value = false;
  }
}

async function savePage() {
  if (!pageDraft.value || !canEdit(pageDraft.value)) return;
  const sectionError = validateSections(pageDraft.value.sections);
  if (sectionError) { error.value = sectionError; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    const seo = { ...pageDraft.value.seo };
    if (seo.keywords) seo.keywords = String(seo.keywords).split(',').map((item) => item.trim()).filter(Boolean);
    else delete seo.keywords;
    if (!seo.title) delete seo.title;
    if (!seo.description) delete seo.description;
    await api.patch(`/items/pages/${encodeURIComponent(pageDraft.value.id)}`, { title: pageDraft.value.title, slug: pageDraft.value.slug, language: pageDraft.value.language, sections: pageDraft.value.sections, seo });
    message.value = '页面草稿已保存，并已进入内容版本审计。';
    await loadPages();
  } catch (reason) {
    error.value = apiError(reason, '保存页面失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveRepairPage() {
  if (!repairDraft.value || !canEdit(repairDraft.value)) return;
  if (!repairPageKeys.has(repairDraft.value.page_key)) { error.value = '不支持的售后页面键。'; return; }
  let parsed = {};
  try {
    for (const key of ['model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo']) parsed[key] = JSON.parse(repairDraft.value[`${key}_text`] || (key === 'seo' ? '{}' : '[]'));
  } catch { error.value = '售后页面配置中的 JSON 格式不正确。'; return; }
  const actions = Array.isArray(parsed.action_cards) ? parsed.action_cards : [];
  if (actions.some((item) => !repairActionCodes.has(String(item.action)))) { error.value = '动作卡片仅允许 01、02、09、10。'; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/repair_page_configs/${encodeURIComponent(repairDraft.value.id)}`, { page_key: repairDraft.value.page_key, title: repairDraft.value.title, intro: repairDraft.value.intro, hero_asset: repairDraft.value.hero_asset || null, ...parsed, language: repairDraft.value.language || 'zh-CN' });
    message.value = '售后页面草稿已保存，并已进入内容版本审计。';
    await loadRepairPages();
  } catch (reason) { error.value = apiError(reason, '保存售后页面草稿失败。'); }
  finally { saving.value = false; }
}

async function saveSeries() {
  if (!seriesDraft.value || !canEdit(seriesDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/product_series/${encodeURIComponent(seriesDraft.value.id)}`, { series_code: seriesDraft.value.series_code, slug: seriesDraft.value.slug, name: seriesDraft.value.name, positioning: seriesDraft.value.positioning || null, scenarios: fromTextList(seriesDraft.value.scenariosText), capabilities: fromTextList(seriesDraft.value.capabilitiesText), cover_asset: seriesDraft.value.cover_asset || null, sort_order: Number(seriesDraft.value.sort_order) || 0 });
    message.value = '产品系列草稿已保存，并已进入内容版本审计。';
    await loadSeries();
  } catch (reason) {
    error.value = apiError(reason, '保存产品系列失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveCompanyRecord() {
  if (!companyDraft.value || !canEdit(companyDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    let payload;
    if (companyMode.value === 'milestones') {
      payload = { year: Number(companyDraft.value.year), event: companyDraft.value.event, evidence: companyDraft.value.evidence, sort_order: Number(companyDraft.value.sort_order) || 0 };
    } else if (companyMode.value === 'qualifications') {
      payload = { type: companyDraft.value.type, name: companyDraft.value.name, certificate_number: companyDraft.value.certificate_number || null, issuer: companyDraft.value.issuer || null, valid_until: companyDraft.value.valid_until || null, authorization_status: companyDraft.value.authorization_status, assets: companyDraft.value.mediaReferences, sort_order: Number(companyDraft.value.sort_order) || 0 };
    } else {
      payload = { process: companyDraft.value.process, description: companyDraft.value.description, inspection_evidence: companyDraft.value.inspection_evidence || null, media: companyDraft.value.mediaReferences, sort_order: Number(companyDraft.value.sort_order) || 0 };
    }
    await api.patch(`/items/${encodeURIComponent(companyMode.value)}/${encodeURIComponent(companyDraft.value.id)}`, payload);
    message.value = '企业资料草稿已保存，并已进入内容版本审计。';
    await loadCompany();
  } catch (reason) {
    error.value = apiError(reason, '保存企业资料失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveServiceRecord() {
  if (!serviceDraft.value || !canEdit(serviceDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    let payload;
    if (serviceMode.value === 'service_resources') {
      payload = { type: serviceDraft.value.type, applicable_models: fromTextList(serviceDraft.value.applicableModelsText), version: serviceDraft.value.version || null, language: serviceDraft.value.language || null, asset: serviceDraft.value.asset || null, updated_at: serviceDraft.value.updated_at || null };
    } else if (serviceMode.value === 'service_locations') {
      const contact = Object.fromEntries(Object.entries(serviceDraft.value.contact || {}).filter(([, value]) => String(value || '').trim()));
      payload = { region: serviceDraft.value.region, city: serviceDraft.value.city, service_scope: serviceDraft.value.service_scope, contact, business_status: serviceDraft.value.business_status || null, valid_until: serviceDraft.value.valid_until || null };
    } else {
      payload = { url: serviceDraft.value.url, enabled: serviceDraft.value.enabled === true, open_mode: serviceDraft.value.open_mode, fallback_phone: serviceDraft.value.fallback_phone || null, health_status: serviceDraft.value.health_status || null };
    }
    await api.patch(`/items/${encodeURIComponent(serviceMode.value)}/${encodeURIComponent(serviceDraft.value.id)}`, payload);
    message.value = '服务支持草稿已保存，并已进入内容版本审计。';
    await loadService();
  } catch (reason) {
    error.value = apiError(reason, '保存服务支持内容失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveKnowledge() {
  if (!knowledgeDraft.value || !canEdit(knowledgeDraft.value)) return;
  const stepsText = String(knowledgeDraft.value.troubleshootingStepsText || '').trim();
  if (!stepsText) { error.value = '请填写至少一条排障步骤或保留原始知识内容。'; return; }
  if (knowledgeDraft.value.risk_level === 'high' && (!String(knowledgeDraft.value.safetyPreconditionsText || '').trim() || !String(knowledgeDraft.value.escalation_guidance || '').trim())) {
    error.value = '高风险知识必须补充安全前置条件和人工升级说明。';
    return;
  }
  saving.value = true; error.value = ''; message.value = '';
  try {
    const steps = knowledgeDraft.value.troubleshootingStepType === 'source_markdown'
      ? [{ type: 'source_markdown', content: stepsText }]
      : fromTextList(stepsText).map((content) => ({ type: 'manual_step', content }));
    await api.patch(`/items/knowledge_items/${encodeURIComponent(knowledgeDraft.value.id)}`, {
      visibility: knowledgeDraft.value.visibility,
      channel: knowledgeDraft.value.channel,
      category: knowledgeDraft.value.category,
      question_title: knowledgeDraft.value.question_title,
      applicable_models: fromTextList(knowledgeDraft.value.applicableModelsText),
      error_codes: fromTextList(knowledgeDraft.value.errorCodesText),
      symptoms: knowledgeDraft.value.symptoms || null,
      troubleshooting_steps: steps,
      risk_level: knowledgeDraft.value.risk_level,
      safety_preconditions: fromTextList(knowledgeDraft.value.safetyPreconditionsText),
      escalation_guidance: knowledgeDraft.value.escalation_guidance || null,
      media: knowledgeDraft.value.mediaReferences,
      version: knowledgeDraft.value.version,
      technical_reviewer: knowledgeDraft.value.technical_reviewer
    });
    message.value = '常见问题知识草稿已保存，并已进入内容版本审计。';
    await loadKnowledge();
  } catch (reason) {
    error.value = apiError(reason, '保存常见问题知识草稿失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function createMediaCandidate() {
  const file = mediaDraft.value.file;
  const fileError = validateMediaFile(file);
  if (fileError) { error.value = fileError; return; }
  saving.value = true; error.value = ''; message.value = '';
  let uploadedFileId = '';
  try {
    const form = new FormData();
    form.append('title', file.name);
    form.append('file', file, file.name);
    const upload = await api.post('/files', form);
    const uploaded = upload.data?.data;
    uploadedFileId = String(uploaded?.id || '');
    if (!uploadedFileId || !uploaded?.filename_download || !uploaded?.type || !Number.isFinite(Number(uploaded?.filesize))) {
      throw new Error('上传接口未返回完整的文件元数据');
    }
    await api.post('/items/media_assets', {
      file_id: uploadedFileId,
      original_file_name: uploaded.filename_download,
      mime_type: uploaded.type,
      byte_size: Number(uploaded.filesize),
      usage_scope: mediaDraft.value.usage_scope,
      alt_text: mediaDraft.value.alt_text || null,
      copyright_status: mediaDraft.value.copyright_status,
      authorization_note: mediaDraft.value.authorization_note || null
    });
    mediaDraft.value = emptyMediaDraft();
    if (mediaFileInput.value) mediaFileInput.value.value = '';
    message.value = '媒体候选素材已登记为草稿，尚未发布到官网。';
    await Promise.all([loadMediaCandidates(), loadMediaAssets()]);
    markDraftSaved();
  } catch (reason) {
    if (uploadedFileId) {
      try { await api.delete(`/files/${encodeURIComponent(uploadedFileId)}`); } catch { /* Keep the original error if orphan cleanup is unavailable. */ }
    }
    error.value = apiError(reason, '媒体上传或候选登记失败，官网内容没有更新。');
  } finally { saving.value = false; }
}

function nextDraftSlug(prefix) {
  return `cms-editor-${prefix}-${Date.now()}`;
}

async function createEditorialRecord() {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const payload = editorialMode.value === 'articles'
      ? { slug: nextDraftSlug('article'), category: 'news', title: '未命名文章', summary: '', body: '', seo: {}, status: 'draft', publication_state: 'unpublished' }
      : { slug: nextDraftSlug('case-study'), industry: '', material: '', thickness: '', model_code: '', process: '', result: '', authorization_status: 'review_required', status: 'draft', publication_state: 'unpublished' };
    const response = await api.post(`/items/${encodeURIComponent(editorialMode.value)}`, payload);
    const id = response.data?.data?.id;
    await loadEditorial();
    if (id) selectEditorialRecord(id, true);
    markDraftSaved();
    message.value = editorialMode.value === 'articles' ? '新的文章草稿已创建。' : '新的客户案例草稿已创建。';
  } catch (reason) {
    error.value = apiError(reason, '创建草稿失败，请确认当前账号拥有内容编辑权限。');
  } finally { saving.value = false; }
}

async function saveEditorialRecord() {
  if (!editorialDraft.value || !canEdit(editorialDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    let payload;
    if (editorialMode.value === 'articles') {
      const seo = { ...editorialDraft.value.seo };
      if (seo.keywords) seo.keywords = String(seo.keywords).split(',').map((item) => item.trim()).filter(Boolean);
      else delete seo.keywords;
      if (!seo.title) delete seo.title;
      if (!seo.description) delete seo.description;
      payload = { slug: editorialDraft.value.slug, category: editorialDraft.value.category, title: editorialDraft.value.title, summary: editorialDraft.value.summary || null, body: editorialDraft.value.body || null, video_url: editorialDraft.value.video_url || null, cover_asset: editorialDraft.value.cover_asset || null, seo, source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null };
    } else {
      payload = { slug: editorialDraft.value.slug, industry: editorialDraft.value.industry || null, material: editorialDraft.value.material || null, thickness: editorialDraft.value.thickness || null, model_code: editorialDraft.value.model_code || null, process: editorialDraft.value.process || null, result: editorialDraft.value.result || null, authorization_status: editorialDraft.value.authorization_status || 'review_required', source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null };
    }
    await api.patch(`/items/${encodeURIComponent(editorialMode.value)}/${encodeURIComponent(editorialDraft.value.id)}`, payload);
    message.value = '内容草稿已保存，并已进入内容版本审计。';
    await loadEditorial();
  } catch (reason) {
    error.value = apiError(reason, '保存内容草稿失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveSettings() {
  if (!settingsDraft.value || !canEdit(settingsDraft.value)) return;
  const navigationError = validateSettingLinks(settingsDraft.value.navigation, '主导航');
  const footerError = validateSettingLinks(settingsDraft.value.footer.primary_links, '页脚链接');
  if (navigationError || footerError) { error.value = navigationError || footerError; return; }
  if (!String(settingsDraft.value.brand.display_name || '').trim() || !String(settingsDraft.value.brand.logo_asset || '').trim() || !String(settingsDraft.value.contacts.service_phone || '').trim()) {
    error.value = '品牌名称、品牌标志素材引用和服务电话不能为空。';
    return;
  }
  if (!String(settingsDraft.value.contacts.header_cta.label || '').trim() || !isValidSiteLink(settingsDraft.value.contacts.header_cta.href)) {
    error.value = '请填写 Header CTA 文案，并使用站内路径或 HTTPS 地址。';
    return;
  }
  const languages = fromTextList(settingsDraft.value.languagesText);
  if (!languages.length) { error.value = '请至少保留一种可用语言。'; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    // Deliberately retain footer review metadata and all non-editorial configuration fields.
    const footer = { ...settingsDraft.value.footer, primary_links: settingsDraft.value.footer.primary_links.map(normalizeLink) };
    const brand = { ...settingsDraft.value.brand, display_name: settingsDraft.value.brand.display_name.trim(), logo_asset: settingsDraft.value.brand.logo_asset.trim() };
    const contacts = { ...settingsDraft.value.contacts, service_phone: settingsDraft.value.contacts.service_phone.trim(), header_cta: { ...settingsDraft.value.contacts.header_cta, label: settingsDraft.value.contacts.header_cta.label.trim(), href: settingsDraft.value.contacts.header_cta.href.trim() } };
    await api.patch(`/items/site_settings/${encodeURIComponent(settingsDraft.value.id)}`, { navigation: settingsDraft.value.navigation.map(normalizeLink), footer, brand, contacts, languages });
    message.value = '全站设置草稿已保存，并已进入内容版本审计。';
    await loadSettings();
    markDraftSaved();
  } catch (reason) {
    error.value = apiError(reason, '保存全站设置失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveModel() {
  if (!modelDraft.value || !canEdit(modelDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/product_models/${encodeURIComponent(modelDraft.value.id)}`, { series_code: modelDraft.value.series_code, model_code: modelDraft.value.model_code, slug: modelDraft.value.slug || null, name: modelDraft.value.name, media: modelDraft.value.mediaReferences });
    message.value = '型号草稿已保存，并已进入内容版本审计。';
    await loadModels();
  } catch (reason) {
    error.value = apiError(reason, '保存型号失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveParameter(parameter) {
  if (!canEdit(parameter)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/product_parameters/${encodeURIComponent(parameter.id)}`, { group_name: parameter.group_name || null, field_name: parameter.field_name, value: parameter.value, unit: parameter.unit || null, test_conditions: parameter.test_conditions || null, sort_order: Number(parameter.sort_order) || 0 });
    message.value = '技术参数已保存，并已进入内容版本审计。';
    await loadParameters(modelDraft.value.model_code);
  } catch (reason) {
    error.value = apiError(reason, '保存技术参数失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function createParameter() {
  if (!modelDraft.value || !canEdit(modelDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.post('/items/product_parameters', { model_code: modelDraft.value.model_code, group_name: newParameter.value.group_name || null, field_name: newParameter.value.field_name, value: newParameter.value.value, unit: newParameter.value.unit || null, test_conditions: newParameter.value.test_conditions || null, sort_order: Number(newParameter.value.sort_order) || 0, status: 'draft', publication_state: 'unpublished' });
    message.value = '新的技术参数草稿已创建。';
    newParameter.value = { ...emptyParameter(), model_code: modelDraft.value.model_code };
    await loadParameters(modelDraft.value.model_code);
    markDraftSaved();
  } catch (reason) {
    error.value = apiError(reason, '新增技术参数失败。');
  } finally { saving.value = false; }
}

watch(activeTab, (tab) => {
  error.value = '';
  message.value = '';
  closePreview();
  if (tab === 'media') loadMediaPreviews();
  if (tab === 'submit' && !submissionQueueLoaded.value) loadSubmissionQueue();
  if (tab === 'review' && !reviewQueueLoaded.value) loadReviewQueue();
});
onMounted(() => {
  window.addEventListener('keydown', handlePreviewKeydown);
  window.addEventListener('beforeunload', handleBeforeUnload);
  api.get('/users/me?fields=admin_access,role.name').then((response) => {
    const user = response.data?.data || {};
    technicalAccess.value = Boolean(user.admin_access || user.role?.name === '系统管理员');
  }).catch(() => {
    technicalAccess.value = false;
  }).finally(load);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePreviewKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  clearMediaPreviews();
});
</script>

<style scoped>
.editor-page{display:grid;gap:18px;max-width:1320px;padding:4px 0 32px}.toolbar,.toolbar-actions,.form-actions,.section-heading,.form-heading,.panel-heading,.section-card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.toolbar{align-items:end;flex-wrap:wrap}.toolbar h2,.toolbar p,.form-heading h3,.panel-heading h3,.section-heading h3,.section-heading h4,.seo-editor h4{margin:0}.toolbar h2{margin-top:6px;font-size:25px}.toolbar>div>p:last-child{max-width:760px;margin-top:8px;color:var(--theme--foreground-subdued)}.toolbar-actions{flex-wrap:wrap}.toolbar button,.native-link,.primary-action,.section-heading button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 13px;font:inherit;text-decoration:none;cursor:pointer}.toolbar button:disabled,.primary-action:disabled,.section-heading button:disabled,.text-action:disabled{cursor:not-allowed;opacity:.5}.native-link{color:var(--theme--primary)}.unsaved-indicator{border:1px solid var(--theme--warning);border-radius:999px;background:var(--theme--background-accent);color:var(--theme--warning);padding:6px 9px;font-size:12px;white-space:nowrap}.eyebrow{margin:0;color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.message,.empty,.record-list-panel,.editor-form,.parameters-panel{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.message,.empty{margin:0}.error{border-color:var(--theme--danger);color:var(--theme--danger)}.workspace-tabs{display:flex;gap:6px;border-bottom:1px solid var(--theme--border-color)}.workspace-tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--theme--foreground-subdued);padding:10px 13px;font:inherit;cursor:pointer}.workspace-tabs button.active{border-bottom-color:var(--theme--primary);color:var(--theme--foreground)}.workspace-grid,.model-layout{display:grid;grid-template-columns:minmax(220px,290px) minmax(0,1fr);gap:16px}.record-list-panel{align-self:start;display:grid;gap:6px;max-height:760px;overflow:auto}.panel-heading{padding-bottom:10px;border-bottom:1px solid var(--theme--border-color)}.panel-heading h3{margin-top:5px;font-size:18px}.panel-heading strong,.parameters-panel>.section-heading>strong{font-size:26px}.record-choice{position:relative;display:grid;gap:3px;width:100%;border:1px solid transparent;border-radius:4px;background:transparent;padding:10px;text-align:left;color:var(--theme--foreground);cursor:pointer}.record-choice:hover,.record-choice.active{border-color:var(--theme--border-color);background:var(--theme--background-accent)}.record-choice span,.record-choice small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-choice small{color:var(--theme--foreground-subdued)}.record-choice i{position:absolute;right:8px;top:9px;font-style:normal;font-size:11px;color:var(--theme--foreground-subdued)}.record-choice i[data-status="rejected"]{color:var(--theme--danger)}.record-choice i[data-status="draft"]{color:var(--theme--warning)}.editor-form,.parameters-panel{display:grid;gap:18px}.form-heading{align-items:start}.form-heading h3{margin-top:5px;font-size:21px}.status,.review-badge{border-radius:999px;background:var(--theme--background-accent);padding:4px 8px;color:var(--theme--foreground-subdued);font-size:12px;white-space:nowrap}.status[data-status="rejected"]{color:var(--theme--danger)}.status[data-status="draft"]{color:var(--theme--warning)}.read-only-note{margin:0;border-left:3px solid var(--theme--warning);background:var(--theme--background-accent);padding:10px 12px;color:var(--theme--foreground-subdued);font-size:13px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field-grid label{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.field-grid label.full{grid-column:1/-1}.field-grid input,.field-grid select,.field-grid textarea,.table-wrap input{box-sizing:border-box;width:100%;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 10px;font:inherit}.field-grid textarea{resize:vertical;line-height:1.5}.field-grid input:disabled,.field-grid select:disabled,.field-grid textarea:disabled,.table-wrap input:disabled{cursor:not-allowed;opacity:.66}.section-editor,.seo-editor,.new-parameter{display:grid;gap:12px;border-top:1px solid var(--theme--border-color);padding-top:18px}.section-heading{align-items:start}.section-heading h4,.seo-editor h4{margin-top:5px;font-size:17px}.section-heading>div>p:last-child{margin:6px 0 0;color:var(--theme--foreground-subdued);font-size:13px}.section-heading button{color:var(--theme--primary)}.section-card{display:grid;gap:13px;border:1px solid var(--theme--border-color);border-radius:5px;padding:14px}.section-card-heading{align-items:start}.section-card-heading>div{display:flex;align-items:center;gap:9px}.review-badge{color:var(--theme--warning)}.text-action{border:0;background:transparent;padding:4px;color:var(--theme--primary);font:inherit;cursor:pointer}.text-action.danger{color:var(--theme--danger)}.form-actions{padding-top:2px}.form-actions a{color:var(--theme--primary);font-size:13px;text-decoration:none}.primary-action{border-color:var(--theme--primary);background:var(--theme--primary);color:var(--theme--primary-foreground)}.model-workspace{display:grid;gap:16px}.parameters-panel>.section-heading{align-items:start}.parameters-panel>.section-heading h3{margin-top:5px;font-size:19px}.table-wrap{overflow:auto;border:1px solid var(--theme--border-color);border-radius:5px}.table-wrap table{width:100%;min-width:920px;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{border-bottom:1px solid var(--theme--border-color);padding:9px;vertical-align:middle}.table-wrap th{color:var(--theme--foreground-subdued);font-size:12px;font-weight:600}.table-wrap tr:last-child td{border-bottom:0}.table-wrap input{min-width:100px;padding:7px 8px}.table-empty{text-align:center;color:var(--theme--foreground-subdued)}.new-parameter h4{margin:0;font-size:16px}.parameter-fields{grid-template-columns:repeat(4,minmax(0,1fr))}.compact{font-size:13px;color:var(--theme--foreground-subdued)}.subtabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding-bottom:8px}.subtabs button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground-subdued);padding:7px 8px;font:inherit;font-size:12px;cursor:pointer}.subtabs button:last-child{grid-column:1/-1}.subtabs button.active{border-color:var(--theme--primary);color:var(--theme--primary)}.form-help{margin:0;color:var(--theme--foreground-subdued);font-size:13px;line-height:1.55}.media-workspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px}.media-form-fields{display:grid;gap:18px}.media-candidate-list{align-self:start;max-height:690px;overflow:auto}.media-candidate-row{display:flex;align-items:start;justify-content:space-between;gap:12px;border-top:1px solid var(--theme--border-color);padding:13px 0}.media-candidate-row>div{min-width:0}.media-candidate-row strong,.media-candidate-row p,.media-candidate-row small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.media-candidate-row p{margin:5px 0;color:var(--theme--foreground-subdued);font-size:13px}.media-candidate-row small{color:var(--theme--foreground-subdued);font-size:12px}@media(max-width:900px){.workspace-grid,.model-layout,.media-workspace{grid-template-columns:1fr}.record-list-panel{max-height:270px}.record-choice{grid-template-columns:1fr auto}.record-choice i{position:static;grid-column:2;grid-row:1/3;align-self:center}.parameter-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.toolbar,.toolbar-actions,.form-actions{align-items:stretch}.toolbar-actions,.toolbar-actions>*{width:100%;box-sizing:border-box;text-align:center}.workspace-tabs{overflow:auto}.workspace-tabs button{white-space:nowrap}.field-grid,.parameter-fields{grid-template-columns:1fr}.field-grid label.full{grid-column:auto}.section-card-heading{display:grid}.section-card-heading>div{justify-content:space-between}.form-actions{display:grid}.primary-action{width:100%}}
.toggle-field{display:flex!important;grid-template-columns:auto 1fr;align-items:center;gap:9px}.toggle-field input{width:auto}.toggle-field span{color:var(--theme--foreground)}
.knowledge-list{gap:8px}.list-search{display:grid;gap:6px;padding:4px 2px 8px;color:var(--theme--foreground-subdued);font-size:12px}.list-search input{box-sizing:border-box;width:100%;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:8px;font:inherit}
.full-field{grid-column:1/-1}.media-reference-editor{display:grid;gap:10px;border:1px solid var(--theme--border-color);border-radius:5px;padding:13px}.media-reference-editor .section-card-heading{align-items:center}.media-reference-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.media-reference-add select{box-sizing:border-box;width:100%;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 10px;font:inherit}.media-reference-add button{border:1px solid var(--theme--primary);border-radius:4px;background:var(--theme--background);color:var(--theme--primary);padding:8px 12px;font:inherit;cursor:pointer}.media-reference-add button:disabled{cursor:not-allowed;opacity:.55}.media-reference-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--theme--border-color);padding-top:9px}.media-reference-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.media-candidate-row{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center}.media-preview{display:grid!important;place-items:center;width:72px;aspect-ratio:1.35;overflow:hidden;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background-accent);color:var(--theme--foreground-subdued);font-size:11px}.media-preview img{width:100%;height:100%;object-fit:cover}
.review-list{gap:8px}.refresh-queue{justify-self:start}.review-detail{align-self:start}.review-meta{display:flex;flex-wrap:wrap;gap:7px}.review-meta span{border-radius:999px;background:var(--theme--background-accent);padding:4px 8px;color:var(--theme--foreground-subdued);font-size:12px}.review-note-display{display:grid;gap:6px;margin:0;border-left:3px solid var(--theme--primary);background:var(--theme--background-accent);padding:10px 12px;color:var(--theme--foreground-subdued);font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.review-note-display strong{color:var(--theme--foreground)}.review-note{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.review-note textarea{box-sizing:border-box;width:100%;resize:vertical;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 10px;font:inherit;line-height:1.5}.review-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:9px}.secondary-action{border:1px solid var(--theme--danger);border-radius:4px;background:var(--theme--background);color:var(--theme--danger);padding:9px 13px;font:inherit;cursor:pointer}.secondary-action:disabled{cursor:not-allowed;opacity:.5}@media(max-width:620px){.review-actions{display:grid;grid-template-columns:1fr}.secondary-action{width:100%}}
.editor-guide{display:grid;gap:8px;border:1px solid var(--theme--border-color);border-left:4px solid var(--theme--primary);border-radius:6px;background:var(--theme--background-accent);padding:14px 16px;color:var(--theme--foreground)}.editor-guide strong{font-size:15px}.editor-guide ol{display:flex;flex-wrap:wrap;gap:8px 28px;margin:0;padding-left:20px;color:var(--theme--foreground);font-size:13px}.editor-guide li::marker{color:var(--theme--primary);font-weight:700}.editor-guide span{color:var(--theme--foreground-subdued);font-size:12px}.preview-action{border-color:var(--theme--primary)!important;color:var(--theme--primary)!important}.website-preview-action{border-color:var(--theme--primary)!important;background:var(--theme--primary)!important;color:var(--theme--primary-foreground)!important}.preview-backdrop{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:24px;background:rgb(0 0 0/64%)}.preview-dialog{display:grid;gap:16px;width:min(980px,calc(100vw - 48px));max-height:min(900px,calc(100vh - 48px));overflow:auto;border:1px solid var(--theme--border-color);border-radius:10px;background:var(--theme--background);box-shadow:0 22px 80px rgb(0 0 0/32%);padding:22px}.preview-dialog-heading{display:flex;align-items:start;justify-content:space-between;gap:18px}.preview-dialog-heading h3{margin:5px 0 0;font-size:23px}.preview-close{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:8px 13px;font:inherit;cursor:pointer}.preview-notice{margin:0;border-radius:5px;background:var(--theme--background-accent);padding:10px 12px;color:var(--theme--foreground-subdued);font-size:13px;line-height:1.55}.site-preview{min-height:360px;overflow:hidden;border:1px solid var(--theme--border-color);border-radius:7px;background:#101214;color:#f7f7f5}.preview-hero{display:grid;gap:12px;padding:58px clamp(24px,6vw,72px);background:linear-gradient(120deg,#15191d,#30383d)}.preview-hero span,.preview-category{margin:0;color:#e47b12;font-size:12px;letter-spacing:.08em}.preview-hero h4,.site-preview h4{margin:0;font-size:clamp(30px,4vw,56px);font-weight:500;line-height:1.1}.preview-hero p,.site-preview>p{max-width:650px;margin:0;color:#c9cccf;line-height:1.7}.preview-section{display:grid;gap:9px;padding:26px clamp(24px,6vw,72px);border-top:1px solid rgb(255 255 255/12%)}.preview-section small{color:#aeb3b7;text-transform:uppercase}.preview-section h5{margin:0;font-size:25px;font-weight:500}.preview-section h5 em{display:inline-block;margin-left:8px;border-radius:999px;background:#5b431d;color:#ffcf76;padding:3px 8px;font-size:11px;font-style:normal;vertical-align:middle}.preview-section p{margin:0;white-space:pre-wrap;color:#c9cccf;line-height:1.7}.article-preview,.product-preview{display:grid;gap:18px;padding:clamp(24px,6vw,70px);background:#f3f2ee;color:#24272a}.article-preview h4,.product-preview h4{color:#24272a}.article-preview>p,.product-preview>p{color:#666b70}.preview-summary{font-size:18px;line-height:1.6}.preview-body{white-space:pre-wrap;color:#42464a;line-height:1.85}.preview-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.preview-columns section{border:1px solid rgb(36 39 42/15%);border-radius:6px;padding:15px}.preview-columns strong{display:block;margin-bottom:10px}.preview-columns ul{margin:0;padding-left:18px;color:#5b6065;line-height:1.8}.product-preview table{width:100%;border-collapse:collapse;background:#fff;color:#24272a}.product-preview th,.product-preview td{padding:10px;text-align:left;border-bottom:1px solid #e1e3e4;font-size:13px}.preview-empty{display:grid;min-height:260px;place-items:center;border:1px dashed var(--theme--border-color);border-radius:6px;color:var(--theme--foreground-subdued);text-align:center;padding:24px}@media(max-width:620px){.preview-backdrop{padding:10px}.preview-dialog{width:calc(100vw - 20px);max-height:calc(100vh - 20px);padding:15px}.editor-guide ol{display:grid;gap:5px}.preview-columns{grid-template-columns:1fr}.preview-hero h4,.site-preview h4{font-size:30px}}
/* 面向非技术人员的简化导航与字段提示 */
.guide-action{color:var(--theme--foreground-subdued)!important}
.workspace-tabs{align-items:stretch;justify-content:space-between;flex-wrap:wrap}
.tab-group{display:flex;align-items:center;gap:5px;min-height:48px}
.tab-group-label{padding:0 8px;color:var(--theme--foreground-subdued);font-size:12px;white-space:nowrap}
.advanced-tabs{display:grid;align-content:center;justify-items:end;gap:5px}
.advanced-tabs.expanded{justify-items:stretch}
.advanced-toggle{display:flex!important;align-items:center;gap:8px;color:var(--theme--primary)!important}
.advanced-toggle span{font-size:16px;line-height:1}
.advanced-tab-list{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.guide-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.guide-heading>span{color:var(--theme--foreground-subdued);font-size:12px}
.workflow-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none}
.workflow-steps li{display:flex;align-items:center;gap:10px;border:1px solid var(--theme--border-color);border-radius:5px;background:var(--theme--background);padding:10px}
.workflow-steps b{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--theme--primary);color:var(--theme--primary-foreground);font-size:12px}
.workflow-steps span{display:grid;gap:2px}.workflow-steps strong{font-size:13px}.workflow-steps small{color:var(--theme--foreground-subdued);font-size:11px;line-height:1.35}
.guide-detail{display:grid;gap:6px;border-top:1px solid var(--theme--border-color);padding-top:10px;color:var(--theme--foreground-subdued);font-size:12px;line-height:1.6}
.guide-detail p{margin:0}.guide-detail strong{color:var(--theme--foreground)}
.field-help{display:block;color:var(--theme--foreground-subdued);font-size:11px;line-height:1.4}
.advanced-fields{border:1px dashed var(--theme--border-color);border-radius:5px;padding:10px 12px}
.advanced-fields summary{cursor:pointer;color:var(--theme--foreground-subdued);font-size:12px}
.advanced-fields[open] summary{margin-bottom:12px;color:var(--theme--primary)}
.section-advanced{margin-top:-4px}
.editor-start{display:grid;gap:18px;border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:clamp(20px,3vw,34px)}
.start-heading{display:grid;gap:7px;max-width:660px}.start-heading h3,.start-heading p{margin:0}.start-heading h3{font-size:clamp(24px,3vw,34px);font-weight:600}.start-heading>p:last-child,.start-tip{color:var(--theme--foreground-subdued);line-height:1.6}
.start-task-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.start-task{display:grid;min-height:174px;align-content:start;gap:12px;border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px;text-align:left;color:var(--theme--foreground);font:inherit;cursor:pointer;transition:border-color .18s ease,transform .18s ease,background .18s ease}.start-task:hover,.start-task:focus-visible{border-color:var(--theme--primary);background:var(--theme--background-accent);transform:translateY(-2px);outline:0}.start-task span{color:var(--theme--primary);font-size:12px;font-weight:700}.start-task strong{font-size:16px}.start-task small{color:var(--theme--foreground-subdued);font-size:12px;line-height:1.5}.start-tip{margin:0;font-size:13px}.start-tab{color:var(--theme--primary)!important}
@media(max-width:620px){.workspace-tabs{display:grid;gap:0}.tab-group{overflow-x:auto}.advanced-tabs{justify-items:stretch}.advanced-tab-list{justify-content:flex-start}.workflow-steps{grid-template-columns:1fr}.workflow-steps li{align-items:flex-start}}
@media(max-width:1080px){.start-task-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:680px){.start-task-grid{grid-template-columns:1fr}.start-task{min-height:0}.editor-start{padding:20px}}
</style>
