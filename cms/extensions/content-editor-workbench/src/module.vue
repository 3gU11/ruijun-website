<template>
  <private-view class="content-workbench-view" title="内容编辑工作台">
    <div class="editor-page" :class="{ 'live-website-preview-active': liveWebsitePreviewVisible && websitePreviewAvailable, 'visual-canvas-focus': visualCanvasFocus }" @input.capture="guardEditorInput" @focusin.capture="guardEditorFocus" @pointerdown.capture="captureEditorPointer" @wheel.capture="markEditorUserScroll" @touchmove.capture="markEditorUserScroll">
      <header class="toolbar">
        <div>
          <p class="eyebrow">内容编辑工作台</p>
          <h2>官网内容编辑</h2>
          <p>按表单维护页面、产品、企业资料、服务支持和文章。保存只会更新草稿；审核与发布由对应负责人完成。</p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="guide-action" @click="helpOpen = !helpOpen">{{ helpOpen ? '收起操作说明' : '查看操作说明' }}</button>
          <button type="button" class="preview-action" :disabled="!previewAvailable" :title="previewAvailable ? '查看当前表单中的未保存修改' : '当前内容类型暂不支持画面预览'" @click="openPreview">预览当前草稿</button>
          <button type="button" class="live-preview-toggle" :disabled="!websitePreviewAvailable" :title="websitePreviewAvailable ? '在工作台内打开官网实时预览' : '实时预览只对未公开的草稿内容开放：请先把该内容恢复为草稿，并在左侧选中一个页面区块'" @click="toggleLiveWebsitePreview">{{ websitePreviewAvailable && liveWebsitePreviewVisible ? '关闭实时预览' : '打开实时预览' }}</button>
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
      <button v-if="error && retrySaveAction" type="button" class="retry-save-action" @click="retrySave">重新保存</button>
      <p v-else-if="message" class="message" role="status">{{ message }}</p>

      <nav class="workspace-tabs wp-admin-menu" aria-label="内容管理菜单">
        <div class="tab-group site-area-tabs" aria-label="官网栏目">
          <span class="tab-group-label">官网栏目</span>
          <button type="button" :class="{ active: siteArea === 'home' }" :aria-current="siteArea === 'home' ? 'page' : undefined" @click="selectSiteArea('home')">网站主页</button>
          <button type="button" :class="{ active: siteArea === 'product' }" :aria-current="siteArea === 'product' ? 'page' : undefined" @click="selectSiteArea('product')">产品展示</button>
          <button type="button" :class="{ active: siteArea === 'manufacturing' }" :aria-current="siteArea === 'manufacturing' ? 'page' : undefined" @click="selectSiteArea('manufacturing')">先进制造</button>
          <button type="button" :class="{ active: siteArea === 'news' }" :aria-current="siteArea === 'news' ? 'page' : undefined" @click="selectSiteArea('news')">视频新闻</button>
          <button type="button" :class="{ active: siteArea === 'about' }" :aria-current="siteArea === 'about' ? 'page' : undefined" @click="selectSiteArea('about')">关于瑞钧</button>
          <button type="button" :class="{ active: siteArea === 'service' }" :aria-current="siteArea === 'service' ? 'page' : undefined" @click="selectSiteArea('service')">服务支持</button>
        </div>
        <div class="tab-group area-tools" aria-label="常用内容：当前官网栏目内容">
          <span class="tab-group-label">{{ siteAreaLabel }}内容</span>
          <button v-for="entry in siteAreaContentEntries" :key="entry.key" type="button" :class="{ active: isSiteAreaEntryActive(entry) }" @click="openSiteAreaEntry(entry)">{{ entry.label }}</button>
        </div>
        <div v-if="workflowAccess" class="tab-group workflow-tabs" aria-label="内容流转">
          <span class="tab-group-label">内容流转</span>
          <button type="button" :class="{ active: activeTab === 'submit' }" :aria-current="activeTab === 'submit' ? 'page' : undefined" @click="selectTab('submit')">内容送审</button>
        </div>
        <div v-if="technicalAccess" class="tab-group advanced-tabs" :class="{ expanded: showAdvanced }" aria-label="更多工具">
          <button type="button" class="advanced-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '收起高级设置' : '高级设置' }}<span aria-hidden="true">{{ showAdvanced ? '⌃' : '⌄' }}</span></button>
          <div v-if="showAdvanced" class="advanced-tab-list">
            <button type="button" :class="{ active: activeTab === 'media' }" :aria-current="activeTab === 'media' ? 'page' : undefined" @click="selectTab('media')">媒体资产</button>
            <button type="button" :class="{ active: activeTab === 'knowledge' }" :aria-current="activeTab === 'knowledge' ? 'page' : undefined" @click="selectTab('knowledge')">常见问题知识</button>
            <button type="button" :class="{ active: activeTab === 'models' }" :aria-current="activeTab === 'models' ? 'page' : undefined" @click="selectTab('models')">型号与参数</button>
            <button type="button" :class="{ active: activeTab === 'review' }" :aria-current="activeTab === 'review' ? 'page' : undefined" @click="selectTab('review')">审核队列</button>
            <a class="advanced-link" href="/admin/ruijun-content-publication-queue-workbench">发布中心</a>
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
          <p class="eyebrow">{{ siteAreaLabel }}内容</p>
          <h3 id="editor-start-title">选择要修改的网站区块</h3>
          <p>这里按官网实际显示区块分类。点击区块后，工作台会打开对应内容并定位到该位置，不再先进入通用“页面”列表。</p>
        </div>
        <div class="start-task-grid">
          <button v-for="(entry, index) in siteAreaContentEntries" :key="entry.key" type="button" class="start-task" @click="openSiteAreaEntry(entry)">
            <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ entry.label }}</strong><small>{{ siteAreaEntryDescription(entry) }}</small>
          </button>
        </div>
        <p class="start-tip">需要管理图片、技术参数、审核或全站设置时，再打开“高级设置”。</p>
      </section>

      <section v-else-if="activeTab === 'media'" class="media-workspace" aria-label="媒体资产登记">
        <section class="editor-form media-upload-form">
          <div class="form-heading">
          <div><p class="eyebrow">媒体素材</p><h3>上传媒体素材</h3></div>
            <span class="status" data-status="published">上传即发布</span>
          </div>
          <p class="form-help">媒体素材已取消审核：上传成功即发布到官网素材库，可立即在画布和内容中使用。请先确认图片/视频的版权与授权范围。</p>
          <form class="media-form-fields" @submit.prevent="createMediaCandidate">
            <div class="field-grid">
          <label class="full">文件<input ref="mediaFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v,application/pdf" required @change="selectMediaFile"></label>
              <p v-if="mediaDraft.file" class="form-help full">已选择：{{ mediaDraft.file.name }} · {{ readableFileSize(mediaDraft.file.size) }} · {{ mediaMetadataLabel }}</p>
              <label>使用范围<select v-model="mediaDraft.usage_scope" required @change="syncMediaScopeContext"><option value="homepage">网站主页</option><option value="product">产品展示</option><option value="manufacturing">先进制造</option><option value="article">视频新闻</option><option value="brand">关于瑞钧</option><option value="service">服务支持</option></select></label>
              <label>官网展示位置<select v-model="mediaDraft.placement_key" required @change="applyMediaPlacementContext(mediaDraft.placement_key, true)"><option v-for="option in compatibleMediaPlacements" :key="option.key" :value="option.key">{{ option.label }}</option></select></label>
              <p class="field-help full">{{ selectedMediaPlacementHelp }}</p>
              <label>所属页面<input v-model.trim="mediaDraft.page_key" maxlength="80" placeholder="例如：home、news、product"></label>
              <label>所属段落<input v-model.trim="mediaDraft.section_key" maxlength="80" placeholder="例如：hero、video-sharing"></label>
              <label>素材标题<input v-model.trim="mediaDraft.title" maxlength="160"></label>
              <label>显示顺序<input v-model.number="mediaDraft.sort_order" type="number" min="0" max="9999"></label>
              <label>版权状态<select v-model="mediaDraft.copyright_status" required><option value="owned">自有素材</option><option value="licensed">已获许可</option><option value="authorized">已授权公开</option><option value="pending_review">待确认</option></select></label>
              <label class="toggle-field"><input v-model="mediaDraft.enabled" type="checkbox"><span>发布后允许此位置使用</span></label>
              <label class="full">替代文本<input v-model.trim="mediaDraft.alt_text" maxlength="300" placeholder="简要说明画面或文件内容，便于检索与无障碍访问"></label>
              <label class="full">素材说明<textarea v-model.trim="mediaDraft.description" rows="2" maxlength="2000"></textarea></label>
              <template v-if="mediaDraft.media_type === 'video'">
                <label>视频封面<span>（可选，建议填写；未填写时官网先显示视频首帧）</span><select v-model="mediaDraft.poster_asset_id"><option value="">暂不设置封面（之后可在素材清单补充）</option><option v-for="asset in videoPosterOptions" :key="asset.id" :value="String(asset.id)">{{ videoPosterAssetLabel(asset) }}</option></select></label>
                <label class="toggle-field"><input v-model="mediaDraft.autoplay" type="checkbox"><span>自动播放</span></label>
                <label class="toggle-field"><input v-model="mediaDraft.muted" type="checkbox"><span>默认静音</span></label>
                <label class="toggle-field"><input v-model="mediaDraft.loop" type="checkbox"><span>循环播放</span></label>
                <label class="full">字幕或文字稿<textarea v-model.trim="mediaDraft.transcript" rows="4" maxlength="30000" placeholder="视频分享可选；教学视频和首屏说明建议填写"></textarea></label>
              </template>
              <label class="full">授权与来源说明<textarea v-model.trim="mediaDraft.authorization_note" rows="3" maxlength="2000" placeholder="填写拍摄来源、许可证、授权范围或待确认事项"></textarea></label>
            </div>
            <div class="form-actions"><span></span><button class="primary-action" type="submit" :disabled="saving || !mediaDraft.file">{{ saving ? '正在上传...' : '上传并发布素材' }}</button></div>
          </form>
          <p v-if="activeTab === 'media' && error" class="form-help media-upload-error" role="alert">{{ error }}</p>
        </section>

        <section class="editor-form media-candidate-list" aria-labelledby="media-candidates-title">
          <div class="section-heading"><div><p class="eyebrow">素材清单</p><h3 id="media-candidates-title">当前媒体记录</h3></div><strong>{{ mediaCandidates.length }}</strong></div>
          <p v-if="!mediaCandidates.length" class="empty compact">暂未登记媒体资产。</p>
          <article v-for="asset in mediaCandidates" :key="asset.id" class="media-candidate-row">
            <div class="media-preview" aria-hidden="true"><img v-if="isPreviewableMedia(asset) && mediaPreviewUrl(asset)" :src="mediaPreviewUrl(asset)" :alt="asset.alt_text || asset.original_file_name"><span v-else>{{ mediaPreviewLabel(asset) }}</span></div>
            <div><strong>{{ asset.title || asset.original_file_name }}</strong><p>{{ asset.original_file_name }} · {{ usageScopeLabel(asset.usage_scope) }} · {{ asset.placement_key || '未指定展示位置' }} · {{ asset.mime_type }} · {{ readableFileSize(asset.byte_size) }}</p><small>{{ asset.width && asset.height ? `${asset.width} x ${asset.height} px · ${asset.aspect_ratio || '比例未记录'}` : asset.media_type === 'document' ? 'PDF 文档' : '尺寸未记录' }} · {{ asset.alt_text || '未填写替代文本' }}</small></div>
            <span class="status" :data-status="asset.status">{{ statusLabel(asset.status) }}</span>
            <button type="button" class="text-action danger" @click="deleteMediaAsset(asset)">删除</button>
            <div v-if="asset.media_type === 'video'" class="media-poster-editor">
              <label>封面<select v-model="mediaPosterSelections[asset.id]"><option value="">未设置（官网显示视频首帧）</option><option v-for="poster in mediaPosterOptions(asset)" :key="poster.id" :value="String(poster.id)">{{ videoPosterAssetLabel(poster) }}</option></select></label>
              <button type="button" :disabled="mediaPosterSavingId === String(asset.id)" @click="saveMediaPoster(asset)">{{ mediaPosterSavingId === String(asset.id) ? '保存中...' : '保存封面' }}</button>
              <small>{{ mediaPosterHint(asset) }}</small>
            </div>
          </article>
        </section>
      </section>

      <section v-else-if="activeTab === 'knowledge'" class="workspace-grid" aria-label="常见问题知识草稿编辑">
        <aside class="record-list-panel knowledge-list">
          <div class="panel-heading"><div><p class="eyebrow">常见问题知识</p><h3>知识草稿</h3></div><strong>{{ filteredKnowledge.length }}</strong></div>
          <label class="list-search">检索问题<input v-model.trim="knowledgeSearch" type="search" placeholder="按标题或分类筛选"></label>
          <button type="button" class="primary-action" :disabled="saving" @click="createKnowledgeRecord">新建官网知识草稿</button>
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
            <label>官网栏目<select v-model="knowledgeDraft.category" :disabled="!canEdit(knowledgeDraft)" required><option value="fault_analysis">常见故障分析</option><option value="knowledge_share">知识分享</option></select></label>
            <label>风险等级<select v-model="knowledgeDraft.risk_level" :disabled="!canEdit(knowledgeDraft)" required><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option></select></label>
            <label>可见范围<select v-model="knowledgeDraft.visibility" :disabled="!canEdit(knowledgeDraft)" required><option value="support_internal">售后内部</option><option value="public">公开候选</option></select></label>
            <label>使用渠道<select v-model="knowledgeDraft.channel" :disabled="!canEdit(knowledgeDraft)" required><option value="both">官网与维修端</option><option value="website">官网</option><option value="repair_portal">维修端</option></select></label>
            <label>知识版本<input v-model.trim="knowledgeDraft.version" :disabled="!canEdit(knowledgeDraft)" required maxlength="80" placeholder="例如：v1.0"></label>
            <label>展示日期<input v-model="knowledgeDraft.display_date" :disabled="!canEdit(knowledgeDraft)" type="date"></label>
            <label>页面排序<input v-model.number="knowledgeDraft.sort_order" :disabled="!canEdit(knowledgeDraft)" type="number" min="0" step="1"></label>
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
            <div class="media-reference-add"><select v-model="knowledgeMediaSelection" :disabled="!canEdit(knowledgeDraft)"><option value="">选择知识库素材（含内部预览草稿）</option><option v-for="asset in editableMediaAssets('knowledge')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(knowledgeDraft) || !knowledgeMediaSelection" @click="addKnowledgeMediaReference">添加</button></div>
            <p v-if="!editableMediaAssets('knowledge').length" class="form-help">暂无可用的知识库素材。请先在“媒体资产”中登记素材；媒体上传即发布，草稿仅用于后台内部预览。</p>
            <div v-for="reference in knowledgeDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'knowledge') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(knowledgeDraft)" @click="removeKnowledgeMediaReference(reference.media_asset_id)">移除</button></div>
          </section>
          <div class="form-actions"><a :href="nativeItemPath('knowledge_items', knowledgeDraft.id)">打开高级设置管理媒体与其他字段</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(knowledgeDraft)">{{ saving ? '保存中...' : '保存常见问题知识草稿' }}</button></div>
        </form>
        <div v-else class="empty">请选择一条常见问题知识草稿。</div>
      </section>

      <section v-else-if="activeTab === 'submit'" class="workspace-grid review-workspace" aria-label="内容送审清单">
        <aside class="record-list-panel review-list">
          <div class="panel-heading"><div><p class="eyebrow">提交审核</p><h3>{{ submissionMode === 'submit' ? '可提交草稿' : '待恢复内容' }}</h3></div><strong>{{ filteredSubmissionQueue.length }}<template v-if="filteredSubmissionQueue.length !== submissionQueue.length"> / {{ submissionQueue.length }}</template></strong></div>
          <div class="subtabs lifecycle-tabs"><button type="button" :class="{ active: submissionMode === 'submit' }" @click="setSubmissionMode('submit')">提交审核</button><button type="button" :class="{ active: submissionMode === 'restore' }" @click="setSubmissionMode('restore')">恢复草稿</button></div>
          <p class="form-help">{{ submissionMode === 'submit' ? '只显示当前账号可以读取的草稿。' : '只显示退回修改或下线内容；恢复后才能继续编辑或重新提交审核。' }}</p>
          <div v-if="submissionQueue.length > 1" class="queue-filters">
            <label>搜索内容<input v-model.trim="submissionQuery" type="search" placeholder="输入名称或标识，例如 测试1" maxlength="80"></label>
            <label>内容类型<select v-model="submissionCollectionFilter"><option value="">全部类型（{{ submissionQueue.length }}）</option><option v-for="option in submissionCollectionOptions" :key="option.value" :value="option.value">{{ option.label }}（{{ option.count }}）</option></select></label>
          </div>
          <button type="button" class="text-action refresh-queue" :disabled="submissionLoading" @click="loadSubmissionQueue">{{ submissionLoading ? '正在刷新...' : '刷新清单' }}</button>
          <button v-for="record in filteredSubmissionQueue" :key="submissionRecordKey(record)" type="button" class="record-choice" :class="{ active: submissionRecordKey(record) === selectedSubmissionKey }" @click="selectSubmissionRecord(record)">
            <span>{{ record.label }}</span><small>{{ record.collectionLabel }} · {{ record.secondary || statusLabel(record.status) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="submissionLoading" class="empty compact">正在读取各内容类型的{{ submissionMode === 'submit' ? '草稿' : '待恢复记录' }}...</p>
          <p v-else-if="!submissionQueue.length" class="empty compact">当前账号没有{{ submissionMode === 'submit' ? '可提交审核的草稿' : '可恢复的内容' }}。</p>
          <p v-else-if="!filteredSubmissionQueue.length" class="empty compact">没有符合筛选条件的{{ submissionMode === 'submit' ? '草稿' : '待恢复内容' }}。<button type="button" class="text-action" @click="clearSubmissionFilters">清除筛选</button></p>
        </aside>

        <section v-if="selectedSubmissionRecord" class="editor-form review-detail">
          <div class="form-heading"><div><p class="eyebrow">{{ submissionMode === 'submit' ? '提交审核' : '恢复草稿' }}</p><h3>{{ selectedSubmissionRecord.label }}</h3></div><span class="status" :data-status="selectedSubmissionRecord.status">{{ statusLabel(selectedSubmissionRecord.status) }}</span></div>
          <div class="review-meta"><span>{{ selectedSubmissionRecord.collectionLabel }}</span><span v-if="selectedSubmissionRecord.secondary">{{ selectedSubmissionRecord.secondary }}</span></div>
          <ul v-if="selectedSubmissionRecord.collection === 'content_submissions'" class="batch-item-list"><li v-for="item in selectedSubmissionRecord.items" :key="`${item.collection}:${item.id}`">{{ item.label || item.id }}</li></ul>
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
          <p v-if="productReleaseHint" class="product-release-hint">产品内容已批准进入待发布。请前往 <a href="/admin/ruijun-product-release-workbench">产品统一发布</a> 生成公开快照。</p>
          <button v-for="record in reviewQueue" :key="reviewRecordKey(record)" type="button" class="record-choice" :class="{ active: reviewRecordKey(record) === selectedReviewKey }" @click="selectReviewRecord(record)">
            <span>{{ record.label }}</span><small>{{ record.collectionLabel }} · {{ record.secondary || '待审核' }}</small><i data-status="review">审核中</i>
          </button>
          <p v-if="reviewLoading" class="empty compact">正在读取各内容类型的待审核记录...</p>
          <p v-else-if="!reviewQueue.length" class="empty compact">当前账号没有可处理的待审核内容。</p>
        </aside>

        <section v-if="selectedReviewRecord" class="editor-form review-detail">
          <div class="form-heading"><div><p class="eyebrow">审核处理</p><h3>{{ selectedReviewRecord.label }}</h3></div><span class="status" data-status="review">审核中</span></div>
          <div class="review-meta"><span>{{ selectedReviewRecord.collectionLabel }}</span><span v-if="selectedReviewRecord.secondary">{{ selectedReviewRecord.secondary }}</span></div>
          <ul v-if="selectedReviewRecord.collection === 'content_submissions'" class="batch-item-list"><li v-for="item in selectedReviewRecord.items" :key="`${item.collection}:${item.id}`">{{ item.label || item.id }}</li></ul>
          <p v-if="selectedReviewRecord.review_note" class="review-note-display"><strong>提交说明</strong><span>{{ selectedReviewRecord.review_note }}</span></p>
          <p class="form-help">确认后，服务端会根据当前账号角色与内容就绪度决定是否允许流转。该页面不会执行发布。</p>
          <label class="review-note">审核说明<textarea v-model.trim="reviewNote" rows="6" maxlength="2000" placeholder="填写通过依据或退回修改要求"></textarea></label>
          <div class="form-actions"><a :href="nativeItemPath(selectedReviewRecord.collection, selectedReviewRecord.id)">打开高级设置（专业人员）</a><div class="review-actions"><button type="button" class="secondary-action" :disabled="reviewSaving" @click="decideReview('rejected')">退回修改</button><button type="button" class="primary-action" :disabled="reviewSaving" @click="decideReview('scheduled')">{{ reviewSaving ? '正在提交...' : '批准进入待发布' }}</button></div></div>
        </section>
        <div v-else class="empty">请从左侧选择一条待审核内容。</div>
      </section>

      <section v-else-if="activeTab === 'pages'" class="workspace-grid page-editing-layout" aria-label="页面内容编辑">
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
            <span>{{ pageDisplayName(page) }}</span>
            <i :data-status="page.status">{{ statusLabel(page.status) }}</i>
          </button>
          <p v-if="!pages.length" class="empty compact">当前账号没有可读取的页面记录。</p>
        </aside>

        <form v-if="pageDraft" class="editor-form" @submit.prevent="savePage">
          <div class="form-heading">
            <div><p class="eyebrow">页面信息</p><h3>{{ pageDisplayName(pageDraft) }}</h3></div>
            <span class="status" :data-status="pageDraft.status">{{ statusLabel(pageDraft.status) }}</span>
          </div>
          <p v-if="!canEdit(pageDraft)" class="read-only-note">此记录已归档，不能直接修改。</p>

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
            <div v-if="pageDraft.slug === 'home' && homepageSections.length" class="section-heading-actions" aria-label="首页独立区块">
              <button v-for="record in homepageSections" :key="record.id" type="button" @click="openHomepageSection(record)">编辑独立区块：{{ record.title || record.section_key }}</button>
            </div>
            <div class="section-heading"><div><p class="eyebrow">{{ activePageSectionKey ? '当前编辑区块' : '页面段落' }}</p><h4 id="section-copy-title">{{ activePageSectionLabel }}</h4></div><div class="section-heading-actions"><button v-if="pageDraft.slug === 'home'" type="button" :disabled="!canEdit(pageDraft)" @click="addHomeReasonSection">新增首页理由</button><button v-if="supportedPageSectionSlugs.has(pageDraft.slug)" type="button" :disabled="!canEdit(pageDraft)" @click="addRequiredPageSections">补齐本页全部栏目</button><button v-if="pageSectionTypeOptions.length" type="button" :disabled="!canEdit(pageDraft)" @click="openSectionLibrary">添加区块</button><button v-if="canPastePageSection" type="button" :disabled="!canEdit(pageDraft)" @click="pastePageSection">粘贴区块</button><p v-else-if="supportedPageSectionSlugs.has(pageDraft.slug)" class="form-help">此栏目暂未开放通用区块添加；可以使用“补齐本页全部栏目”管理模板定义的栏目。</p></div></div>
            <nav v-if="sectionOutline.length > 1" class="section-outline" aria-label="本页区块大纲">
              <details open>
                <summary>本页区块大纲（{{ sectionOutline.length }}）</summary>
                <ol>
                  <li v-for="(entry, entryIndex) in sectionOutline" :key="entry.id">
                    <button type="button" :class="{ active: activePageSectionKey === entry.id }" @click="focusPageSection(entry.id)">
                      <span class="outline-index">{{ entryIndex + 1 }}</span>
                      <span class="outline-label">{{ entry.label }}</span>
                      <span class="outline-kind">{{ entry.kind }}</span>
                      <span v-if="entry.hidden" class="review-badge">已隐藏</span>
                    </button>
                  </li>
                </ol>
              </details>
            </nav>
            <article v-for="(section, index) in visiblePageSections" :key="`${section.id}-${index}`" :data-section-key="section.id" class="section-card" :class="{ 'dragging-section': draggingPageSectionKey === section.id }" :draggable="canEdit(pageDraft) && !!section.type" @focusin="activePageSectionKey = section.id" @pointerdown="activePageSectionKey = section.id" @dragstart="handleSectionDragStart(section, $event)" @dragover.prevent @drop="handleSectionDrop(section)" @dragend="draggingPageSectionKey = ''">
              <div class="section-card-heading"><strong>{{ pageSectionName(section, index) }}</strong><div><span v-if="section.requires_claim_review" class="review-badge">宣传主张待审核</span><span v-if="section.type && section.enabled === false" class="review-badge">已隐藏</span><button v-if="section.type" type="button" class="text-action" :disabled="!canEdit(pageDraft)" @click="toggleRegisteredPageSection(section)">{{ section.enabled === false ? '显示' : '隐藏' }}</button><button v-if="section.type" type="button" class="text-action" :disabled="!canEdit(pageDraft)" @click="duplicatePageSection(section)">复制</button><button v-if="section.type" type="button" class="text-action" :disabled="!canEdit(pageDraft)" @click="copyPageSectionForReuse(section)">复制到其他页</button><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft) || pageDraft.sections.length < 2" @click="removePageSection(section)">删除</button></div></div>
              <div class="field-grid section-fields">
                <template v-if="section.type">
                  <div v-if="registeredPageSectionPresets(section).length" class="section-preset-row">
                    <label>套用预设<select v-model="sectionPresetSelection[section.id]" :disabled="!canEdit(pageDraft)"><option value="">选择预设</option><option v-for="preset in registeredPageSectionPresets(section)" :key="preset.key" :value="preset.key">{{ preset.label }}</option></select></label>
                    <button type="button" :disabled="!canEdit(pageDraft) || !sectionPresetSelection[section.id]" @click="applyRegisteredSectionPreset(section)">套用</button>
                    <span class="form-help">{{ sectionPresetDescription(section) }}</span>
                  </div>
                  <template v-for="field in registeredPageSectionFields(section)" :key="field.key">
                    <label v-if="field.type === 'text' || field.type === 'textarea'" :class="{ full: field.type === 'textarea' }">{{ field.label }}<textarea v-if="field.type === 'textarea'" v-model="section[field.key]" :disabled="!canEdit(pageDraft)" :maxlength="field.maxLength" rows="4" @input="pushPageDraftToPreview"></textarea><input v-else v-model.trim="section[field.key]" :disabled="!canEdit(pageDraft)" :maxlength="field.maxLength" @input="pushPageDraftToPreview"></label>
                    <label v-else-if="field.type === 'select'">{{ field.label }}<select v-model="section[field.key]" :disabled="!canEdit(pageDraft)" @change="pushPageDraftToPreview"><option v-for="option in field.options" :key="option" :value="option">{{ sectionSelectOptionLabel(field, option) }}</option></select></label>
                    <label v-else-if="field.type === 'number'">{{ field.label }}<input v-model.number="section[field.key]" type="number" :min="field.min" :max="field.max" :disabled="!canEdit(pageDraft)" @input="pushPageDraftToPreview"></label>
                    <section v-else-if="field.type === 'media'" class="media-reference-editor full-field" :aria-label="`${field.label}受控素材`">
                      <div class="section-card-heading"><strong>{{ field.label }}</strong><span>{{ (section[field.key] || []).length }} / {{ field.maxItems }}</span></div>
                      <div class="media-reference-add"><select v-model="pageMediaSelection" :disabled="!canEdit(pageDraft)"><option value="">选择{{ pageMediaScopeLabel() }}素材</option><option v-for="asset in pageMediaOptionsForSection(pageMediaScope(), section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, pageMediaScope()) }}</option></select><button type="button" :disabled="!canEdit(pageDraft) || !pageMediaSelection" @click="addRegisteredSectionMedia(section, field)">添加素材</button></div>
                      <p v-if="!pageMediaOptionsForSection(pageMediaScope(), section).length" class="form-help">暂无可用于此区块的{{ pageMediaScopeLabel() }}素材。请先在“更多工具 - 媒体资产”上传。</p>
                      <div v-for="reference in section[field.key] || []" :key="reference.media_asset_id" class="media-reference-row"><span>{{ pageMediaLabel(reference) }}</span><label>展示位置<input v-model.trim="reference.role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：image、card-1"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeRegisteredSectionMedia(section, field, reference.media_asset_id)">移除</button></div>
                    </section>
                    <section v-else-if="field.type === 'list'" class="service-items-editor generic-items-editor full-field" :aria-label="`${field.label}列表`">
                      <div class="section-card-heading"><strong>{{ field.label }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addRegisteredSectionItem(section, field)">新增一项</button></div>
                      <div v-for="(item, itemIndex) in section[field.key] || []" :key="`${section.id}-${field.key}-${itemIndex}`" class="service-item-card">
                        <div class="section-card-heading"><strong>第 {{ itemIndex + 1 }} 项</strong><div><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === 0" @click="moveRegisteredSectionItem(section, field, itemIndex, -1)">上移</button><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === (section[field.key] || []).length - 1" @click="moveRegisteredSectionItem(section, field, itemIndex, 1)">下移</button><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeRegisteredSectionItem(section, field, itemIndex)">删除</button></div></div>
                        <label v-for="itemField in field.itemFields" :key="itemField.key" :class="{ full: itemField.type === 'textarea' }">{{ itemField.label }}<textarea v-if="itemField.type === 'textarea'" v-model="item[itemField.key]" :disabled="!canEdit(pageDraft)" :maxlength="itemField.maxLength" rows="3" @input="pushPageDraftToPreview"></textarea><input v-else v-model.trim="item[itemField.key]" :disabled="!canEdit(pageDraft)" :maxlength="itemField.maxLength" @input="pushPageDraftToPreview"></label>
                      </div>
                    </section>
                  </template>
                  <p v-if="!registeredPageSectionFields(section).length" class="read-only-note full">此区块类型没有可编辑字段定义，无法保存。</p>
                </template>
                <template v-else>
              <label v-if="sectionTitleIsRendered(section)" class="full">{{ isHomeReasonSection(section) ? '首屏理由标题（画布显示）' : '段落标题' }}<input data-preview-field="title" :value="isHomeReasonSection(section) ? section.introTitle : section.title" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="例如：我们为什么值得信赖" @input="updateSectionHeading(section, $event.target.value)"><small class="field-help">这一段的醒目标题，会直接显示在官网页面上。</small></label>
              <p v-else class="read-only-note full">此区块当前官网没有标题展示位，修改该字段不会出现在画布中。请管理已绑定的产品系列记录；如需展示标题，必须先在 Nuxt 模板中新增经确认的版式位置。</p>
              <label v-if="sectionBodyIsRendered(section)" class="full">正文<textarea data-preview-field="body" v-model="section.body" :disabled="!canEdit(pageDraft)" rows="5" maxlength="4000" placeholder="填写访客需要了解的内容" @input="pushPageDraftToPreview"></textarea>
                  <small class="field-help">支持换行，建议一段只表达一个重点。</small>
                </label>
              <p v-else class="read-only-note full">此区块当前官网没有正文展示位，修改该字段不会出现在画布中。请编辑标题或已绑定的理由内容；如需展示正文，必须先在 Nuxt 模板中新增经确认的版式位置。</p>
                <template v-if="isHomeReasonSection(section)">
                  <label>理由短标题<input v-model.trim="section.shortTitle" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="例如：先进智造" @input="pushPageDraftToPreview"></label>
                  <label>首屏理由标题<input v-model.trim="section.introTitle" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="首页三大理由中的标题" @input="pushPageDraftToPreview"></label>
                  <label class="full">首屏理由说明<textarea v-model="section.introDetail" :disabled="!canEdit(pageDraft)" rows="3" maxlength="1000" placeholder="首页三大理由右侧说明" @input="pushPageDraftToPreview"></textarea></label>
                  <label>展示模式<select v-model="section.mode" :disabled="!canEdit(pageDraft)" @change="pushPageDraftToPreview"><option value="machine">设备展示</option><option value="photo">整幅图片</option></select></label>
                  <p class="form-help full">图片和图标请在本段上方添加已发布素材，并将展示位置填写为 image、icon 或对应卡片角色。</p>
                </template>
                <template v-if="pageDraft.slug === 'manufacturing' && ['precision-machining', 'sheet-metal'].includes(section.id)">
                  <label class="full">核心设备或区域补充说明<textarea v-model="section.detail" :disabled="!canEdit(pageDraft)" rows="3" maxlength="2000" placeholder="例如：核心设备与工艺说明"></textarea></label>
                </template>
                <template v-if="pageDraft.slug === 'product' && ['proof-efficiency', 'proof-years', 'proof-champion'].includes(section.id)">
                  <label>展示数值<input v-model.number="section.value" :disabled="!canEdit(pageDraft)" type="number" step="any" placeholder="可留空，仅使用标题"></label>
                  <label>数值单位<input v-model.trim="section.unit" :disabled="!canEdit(pageDraft)" maxlength="40" placeholder="例如：%、YEARS"></label>
                  <p class="form-help full">填写数值后官网会按原版动画展示；留空则显示段落标题。</p>
                </template>
                <template v-if="pageDraft.slug === 'service' && section.id === 'hero'">
                  <label>标题强调文字<input v-model.trim="section.description" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="例如：快人一步"></label>
                  <label>按钮文字<input v-model.trim="section.label" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="例如：在线支持"></label>
                </template>
                <template v-if="pageDraft.slug === 'service' && section.id === 'support'">
                  <label>搜索框提示<input v-model.trim="section.description" :disabled="!canEdit(pageDraft)" maxlength="300"></label>
                  <label>搜索按钮文字<input v-model.trim="section.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>人工支持提示<input v-model.trim="section.content.human_support_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>在线服务标题<input v-model.trim="section.content.online_title" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label>在线服务说明<input v-model.trim="section.content.online_intro" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>助手品牌文字<input v-model.trim="section.content.assistant_brand" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>助手主标题<input v-model.trim="section.content.assistant_heading" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label class="full">助手说明<input v-model.trim="section.content.assistant_intro" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>助手按钮文字<input v-model.trim="section.content.assistant_cta" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>助手弹窗标题<input v-model.trim="section.content.assistant_title" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label>弹窗关闭文字<input v-model.trim="section.content.assistant_close" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label class="full">助手空状态文字<input v-model.trim="section.content.assistant_empty" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>加载中提示<input v-model.trim="section.content.assistant_loading" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label>发送按钮文字<input v-model.trim="section.content.assistant_send" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>有帮助按钮<input v-model.trim="section.content.feedback_yes" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>需要协助按钮<input v-model.trim="section.content.feedback_no" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>跳转确认标题<input v-model.trim="section.content.exit_title" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label class="full">跳转确认说明<input v-model.trim="section.content.exit_body" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>取消按钮文字<input v-model.trim="section.content.exit_cancel" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>继续按钮文字<input v-model.trim="section.content.exit_confirm" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label class="full">助手弹窗与交互文案 JSON<textarea v-model="section.content.assistant_copy_json" :disabled="!canEdit(pageDraft)" rows="5" maxlength="8000" placeholder="可选 JSON，例如 {&quot;assistant_title&quot;:&quot;服务助手&quot;,&quot;feedback_yes&quot;:&quot;有帮助&quot;}"></textarea></label>
                </template>
                <template v-if="pageDraft.slug === 'service' && section.id === 'office-directory'">
                  <label>高德地图文字<input v-model.trim="section.content.map_amap_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>百度地图文字<input v-model.trim="section.content.map_baidu_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>系统地图文字<input v-model.trim="section.content.map_system_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>导航弹窗标题<input v-model.trim="section.content.map_dialog_title" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>导航目的地前缀<input v-model.trim="section.content.map_dialog_destination" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>导航按钮无障碍文字<input v-model.trim="section.content.map_button_aria" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                </template>
                <template v-if="pageDraft.slug !== 'service' || !['hero', 'support'].includes(section.id)">
                  <label class="full">{{ sectionEmptyStateLabel(section) }}<input v-model.trim="section.description" :disabled="!canEdit(pageDraft)" maxlength="500" placeholder="可留空"></label>
                  <p v-if="sectionEmptyStateIsHiddenByRecords(section)" class="read-only-note full">当前已有动态新闻记录，空状态说明不会出现在官网画布中。</p>
                  <label>按钮文字<input v-model.trim="section.label" :disabled="!canEdit(pageDraft)" maxlength="24" placeholder="可留空"></label>
                  <label>按钮链接<input v-model.trim="section.href" :disabled="!canEdit(pageDraft)" maxlength="1000" placeholder="例如：/contact"></label>
                </template>
                </template>
              </div>
              <details class="advanced-fields section-presentation-editor" open>
                <summary>版式、位置与文字样式</summary>
                <p class="form-help">默认全部沿用官网原版。只有开启对应分组后，该组设置才会影响官网；不支持任意 CSS 或自由拖动。</p>
                <div class="presentation-enable-grid">
                  <label class="toggle-field"><input v-model="section.layout.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>启用版式与位置</span></label>
                  <label class="toggle-field"><input v-model="section.text_style.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>启用文字样式</span></label>
                  <label class="toggle-field"><input v-model="section.media_presentation.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>启用图片裁切</span></label>
                  <label class="toggle-field"><input v-model="section.responsive.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>启用响应式显示</span></label>
                </div>
                <div class="field-grid">
                  <label>版式模板<select v-model="section.layout.template" :disabled="!canEdit(pageDraft) || !section.layout.enabled"><option value="default">默认版式</option><option value="overlay-left">媒体上左侧文字</option><option value="overlay-center">媒体上居中文字</option><option value="overlay-right">媒体上右侧文字</option><option value="split-media-left">左图右文</option><option value="split-media-right">左文右图</option><option value="stack">上下堆叠</option><option value="grid">卡片网格</option><option value="gallery">图片画廊</option><option value="timeline">时间轴</option><option value="process">工艺流程</option></select></label>
                  <label>水平对齐<select v-model="section.layout.align_x" :disabled="!canEdit(pageDraft)"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label>
                  <label>垂直对齐<select v-model="section.layout.align_y" :disabled="!canEdit(pageDraft)"><option value="top">顶部</option><option value="center">居中</option><option value="bottom">底部</option></select></label>
                  <label>内容宽度<select v-model="section.layout.width" :disabled="!canEdit(pageDraft)"><option value="narrow">窄</option><option value="normal">标准</option><option value="wide">宽</option><option value="full">全宽</option></select></label>
                  <label>内容间距<select v-model="section.layout.gap" :disabled="!canEdit(pageDraft)"><option value="none">无</option><option value="small">小</option><option value="medium">中</option><option value="large">大</option></select></label>
                  <label>阅读顺序<input v-model.number="section.layout.order" :disabled="!canEdit(pageDraft)" type="number" min="0" max="999"></label>
                  <label>层级<input v-model.number="section.layout.z_index" :disabled="!canEdit(pageDraft)" type="number" min="0" max="9"></label>
                  <label>桌面横向偏移（%）<input v-model.number="section.layout.desktop.offset_x" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                  <label>桌面纵向偏移（%）<input v-model.number="section.layout.desktop.offset_y" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                  <label>手机横向偏移（%）<input v-model.number="section.layout.mobile.offset_x" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                  <label>手机纵向偏移（%）<input v-model.number="section.layout.mobile.offset_y" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                </div>
                <div class="field-grid">
                  <label>文字样式<select v-model="section.text_style.preset" :disabled="!canEdit(pageDraft)"><option value="inherit">沿用页面</option><option value="hero">首屏主标题</option><option value="section-title">区块标题</option><option value="body">正文</option><option value="data">年份/数据</option><option value="card-title">卡片标题</option><option value="caption">图注</option><option value="button">按钮</option></select></label>
                  <label>字重<select v-model.number="section.text_style.weight" :disabled="!canEdit(pageDraft)"><option :value="300">细</option><option :value="400">常规</option><option :value="500">中等</option><option :value="700">粗</option><option :value="800">特粗</option></select></label>
                  <label>桌面字号（0 为沿用）<input v-model.number="section.text_style.size_desktop" :disabled="!canEdit(pageDraft)" type="number" min="0" max="120"></label>
                  <label>手机字号（0 为沿用）<input v-model.number="section.text_style.size_mobile" :disabled="!canEdit(pageDraft)" type="number" min="0" max="72"></label>
                  <label>行高<input v-model.number="section.text_style.line_height" :disabled="!canEdit(pageDraft)" type="number" min="1" max="2.2" step="0.05"></label>
                  <label>文字最大宽度<select v-model="section.text_style.max_width" :disabled="!canEdit(pageDraft)"><option value="narrow">窄</option><option value="normal">标准</option><option value="wide">宽</option><option value="full">全宽</option></select></label>
                  <label>文字颜色<input v-model.trim="section.text_style.color" :disabled="!canEdit(pageDraft)" pattern="#[0-9a-fA-F]{6}" placeholder="#FFFFFF"></label>
                </div>
                <div class="field-grid">
                  <label>图片适配<select v-model="section.media_presentation.fit" :disabled="!canEdit(pageDraft)"><option value="cover">铺满并裁切</option><option value="contain">完整显示</option></select></label>
                  <label>图片横向焦点（%）<input v-model.number="section.media_presentation.focal_x" :disabled="!canEdit(pageDraft)" type="number" min="0" max="100"></label>
                  <label>图片纵向焦点（%）<input v-model.number="section.media_presentation.focal_y" :disabled="!canEdit(pageDraft)" type="number" min="0" max="100"></label>
                  <label>媒体遮罩<select v-model="section.media_presentation.overlay" :disabled="!canEdit(pageDraft)"><option value="none">无</option><option value="dark-15">深色 15%</option><option value="dark-30">深色 30%</option><option value="dark-50">深色 50%</option><option value="light-15">浅色 15%</option></select></label>
                  <label class="toggle-field"><input v-model="section.responsive.desktop_visible" :disabled="!canEdit(pageDraft)" type="checkbox"><span>桌面显示</span></label>
                  <label class="toggle-field"><input v-model="section.responsive.tablet_visible" :disabled="!canEdit(pageDraft)" type="checkbox"><span>平板显示</span></label>
                  <label class="toggle-field"><input v-model="section.responsive.mobile_visible" :disabled="!canEdit(pageDraft)" type="checkbox"><span>手机显示</span></label>
                  <label>手机版式<select v-model="section.responsive.mobile_template" :disabled="!canEdit(pageDraft)"><option value="inherit">沿用桌面</option><option value="stack">上下堆叠</option><option value="grid">卡片网格</option><option value="gallery">图片画廊</option><option value="timeline">时间轴</option><option value="process">工艺流程</option></select></label>
                </div>
              </details>
              <section v-if="isHomeHeroSection(section)" class="home-hero-video-editor" aria-label="首页首屏视频">
                <div class="section-card-heading"><strong>首页首屏视频</strong><span>{{ section.hero_video_asset_id ? '已选择' : '沿用官网原视频' }}</span></div>
                <label>视频素材<select :value="section.hero_video_asset_id || ''" :disabled="!canEdit(pageDraft)" @change="setHomeHeroVideo(section, $event.target.value)"><option value="">沿用官网原首屏视频</option><option v-for="asset in homeHeroVideoOptionsForSection(section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, 'homepage') }}</option></select></label>
                <p class="form-help">仅显示登记为“首页首屏视频”的素材。未发布视频只在已登录后台的实时预览中显示，发布后才会替换公开官网。</p>
              </section>
              <section v-if="isNewsHeroSection(section)" class="home-hero-video-editor" aria-label="视频新闻首屏视频">
                <div class="section-card-heading"><strong>视频新闻首屏视频</strong><span>{{ newsHeroVideoAssetId(section) ? '已选择' : '沿用官网原视频' }}</span></div>
                <label>视频素材<select :value="newsHeroVideoAssetId(section)" :disabled="!canEdit(pageDraft)" @change="setNewsHeroVideo(section, $event.target.value)"><option value="">沿用官网原首屏视频</option><option v-for="asset in newsHeroVideoOptionsForSection(section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, 'article') }}</option></select></label>
                <p class="form-help">仅显示登记为“视频新闻首屏”的视频。未发布视频只在已登录后台的实时预览中显示，发布后才会替换公开官网。</p>
              </section>
              <section v-if="!section.type" class="media-reference-editor" :aria-label="`${section.title || '页面段落'}图片`">
                <div class="section-card-heading"><strong>图片与背景</strong><span>{{ section.media.length }}</span></div>
                <div class="media-reference-add"><select v-model="pageMediaSelection" :disabled="!canEdit(pageDraft)"><option value="">选择{{ pageMediaScopeLabel() }}素材</option><option v-for="asset in pageMediaOptionsForSection(pageMediaScope(), section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, pageMediaScope()) }}</option></select><button type="button" :disabled="!canEdit(pageDraft) || !pageMediaSelection" @click="addPageMedia(section)">添加素材</button></div>
                <p v-if="!pageMediaOptionsForSection(pageMediaScope(), section).length" class="form-help">暂无可用于此区块的{{ pageMediaScopeLabel() }}素材。请先在“更多工具 - 媒体资产”上传；草稿素材必须填写当前页面和段落，且只供当前内部预览使用。</p>
                <p v-if="isHomeHeroSection(section)" class="form-help">首屏视频的两张静态图也在这里绑定：「视频海报」展示位置填 <strong>poster</strong>，「结束静帧」填 <strong>end-frame</strong>。未绑定时画布上只能查看、不能替换。</p>
                <div v-for="reference in section.media" :key="reference.media_asset_id" class="media-reference-row"><span>{{ pageMediaLabel(reference) }}</span><label v-if="section.id === 'hero' && pageDraft.slug === 'about'">图片用途<select v-model="reference.role" :disabled="!canEdit(pageDraft)"><option value="backdrop">首屏共享背景</option><option value="background">首屏背景图层</option><option value="foreground">首屏机器前景</option></select></label><label v-else>展示位置<input v-model.trim="reference.role" :disabled="!canEdit(pageDraft)" maxlength="60" :placeholder="isHomeHeroSection(section) ? '例如：poster、end-frame' : '例如：background、card-1、video、icon-1'"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removePageMedia(section, reference.media_asset_id)">移除</button></div>
              </section>
              <section v-if="!section.type && pageDraft.slug === 'service' && ['hero', 'support-models', 'support-actions', 'office-directory'].includes(section.id)" class="service-items-editor">
                <div class="section-card-heading"><strong>{{ section.id === 'hero' ? '首屏说明文字' : section.id === 'support-models' ? '设备型号卡片' : section.id === 'support-actions' ? '服务入口卡片' : '区域与直属办事处' }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addServiceItem(section, section.id === 'support-models' ? 'model' : section.id === 'support-actions' ? 'action' : section.id === 'office-directory' ? 'office' : 'copy')">新增</button></div>
                <div v-for="(item, itemIndex) in section.items || []" :key="`${section.id}-${itemIndex}`" class="service-item-card">
                  <template v-if="section.id === 'hero'"><label>说明文字<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="160"></label></template>
                  <template v-else-if="section.id === 'support-models'"><label>型号名称<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>图片位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：model-1"></label></template>
                  <template v-else-if="section.id === 'support-actions'"><label>编号<input v-model.trim="item.number" :disabled="!canEdit(pageDraft)" maxlength="8" placeholder="01 至 10"></label><label>按钮文字<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label class="full">按钮下方说明<input v-model.trim="item.description" :disabled="!canEdit(pageDraft)" maxlength="300"></label><label>点击后咨询内容<input v-model.trim="item.body" :disabled="!canEdit(pageDraft)" maxlength="240"></label><label>图案位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：action-1"></label></template>
                  <template v-else><label>区域名称<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>区域图片位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：office-1"></label><label>地图图片位置<input v-model.trim="item.map_media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：office-map-1"></label><div v-for="(office, officeIndex) in item.offices || []" :key="officeIndex" class="office-inline-fields"><label>门店地址<input v-model.trim="office.address" :disabled="!canEdit(pageDraft)" maxlength="500"></label><label>负责人<input v-model.trim="office.manager" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>联系电话<input v-model.trim="office.phone" :disabled="!canEdit(pageDraft)" maxlength="80"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeOffice(section, itemIndex, officeIndex)">删除门店</button></div><button type="button" :disabled="!canEdit(pageDraft)" @click="addOffice(section, itemIndex)">新增门店</button></template>
                  <button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeServiceItem(section, itemIndex)">删除</button>
                </div>
              </section>
              <section v-else-if="!section.type" class="service-items-editor generic-items-editor">
                <div class="section-card-heading"><strong>{{ pageDraft.slug === 'manufacturing' && section.id === 'process' ? '制造工艺节点' : '重复内容（卡片、节点或列表）' }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addGenericSectionItem(section)">{{ pageDraft.slug === 'manufacturing' && section.id === 'process' ? '新增工艺节点' : '新增一项' }}</button></div>
                <p class="form-help">{{ pageDraft.slug === 'manufacturing' && section.id === 'process' ? '每项都对应工艺画布中的一个固定位置。可维护标题、说明、连接说明和顺序；素材仍须在上方通过受控媒体流程添加。' : '可用于三大理由、首页横移图文、工艺节点、参数说明和画廊项目。首页的“marquee”段落就是横移图文；项目图片请在上方添加素材，并填写相同的“展示位置”。' }}</p>
                <div v-for="(item, itemIndex) in section.items || []" :key="`${section.id}-generic-${itemIndex}`" class="service-item-card">
                  <div class="section-card-heading"><strong>第 {{ itemIndex + 1 }} 项</strong><div><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === 0" @click="moveGenericSectionItem(section, itemIndex, -1)">上移</button><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === section.items.length - 1" @click="moveGenericSectionItem(section, itemIndex, 1)">下移</button></div></div>
                  <label>短标题<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>标题<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="240"></label>
                  <label class="full">正文<textarea v-model="item.body" :disabled="!canEdit(pageDraft)" rows="3" maxlength="4000"></textarea></label>
                  <label class="full">补充说明<input v-model.trim="item.description" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label v-if="pageDraft.slug === 'manufacturing' && section.id === 'process'">连接说明<input v-model.trim="item.connection_label" :disabled="!canEdit(pageDraft)" maxlength="160" placeholder="工艺节点之间的说明文字"></label>
                  <label>媒体展示位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：card-1、node-2"></label>
                  <label>图片替代文字<input v-model.trim="item.alt" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="说明图片中可见的内容"></label>
                  <label v-if="pageDraft.slug === 'manufacturing' && section.id === 'process'">工艺画布位置<select v-model="item.anchor" :disabled="!canEdit(pageDraft)"><option value="auto">按顺序自动</option><option value="top-left">左上</option><option value="top-center">上中</option><option value="top-right">右上</option><option value="bottom-left">左下</option><option value="bottom-center">下中</option><option value="bottom-right">右下</option></select></label>
                  <label>链接<input v-model.trim="item.href" :disabled="!canEdit(pageDraft)" maxlength="1000" placeholder="例如：/product"></label>
                  <details class="advanced-fields item-presentation-editor">
                    <summary>本项位置与文字样式</summary>
                    <div class="presentation-enable-grid"><label class="toggle-field"><input v-model="item.layout.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>位置</span></label><label class="toggle-field"><input v-model="item.text_style.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>文字</span></label><label class="toggle-field"><input v-model="item.media_presentation.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>图片</span></label><label class="toggle-field"><input v-model="item.responsive.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>响应式</span></label></div>
                    <div class="field-grid"><label>水平对齐<select v-model="item.layout.align_x" :disabled="!canEdit(pageDraft) || !item.layout.enabled"><option value="left">左</option><option value="center">中</option><option value="right">右</option></select></label><label>桌面横向偏移（%）<input v-model.number="item.layout.desktop.offset_x" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>桌面纵向偏移（%）<input v-model.number="item.layout.desktop.offset_y" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>手机横向偏移（%）<input v-model.number="item.layout.mobile.offset_x" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>手机纵向偏移（%）<input v-model.number="item.layout.mobile.offset_y" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>字重<select v-model.number="item.text_style.weight" :disabled="!canEdit(pageDraft) || !item.text_style.enabled"><option :value="300">细</option><option :value="400">常规</option><option :value="500">中等</option><option :value="700">粗</option><option :value="800">特粗</option></select></label><label>桌面字号<input v-model.number="item.text_style.size_desktop" :disabled="!canEdit(pageDraft) || !item.text_style.enabled" type="number" min="0" max="120"></label><label>手机字号<input v-model.number="item.text_style.size_mobile" :disabled="!canEdit(pageDraft) || !item.text_style.enabled" type="number" min="0" max="72"></label><label>文字颜色<input v-model.trim="item.text_style.color" :disabled="!canEdit(pageDraft) || !item.text_style.enabled" pattern="#[0-9a-fA-F]{6}" placeholder="#FFFFFF"></label><label>图片适配<select v-model="item.media_presentation.fit" :disabled="!canEdit(pageDraft) || !item.media_presentation.enabled"><option value="cover">铺满裁切</option><option value="contain">完整显示</option></select></label><label>横向焦点<input v-model.number="item.media_presentation.focal_x" :disabled="!canEdit(pageDraft) || !item.media_presentation.enabled" type="number" min="0" max="100"></label><label>纵向焦点<input v-model.number="item.media_presentation.focal_y" :disabled="!canEdit(pageDraft) || !item.media_presentation.enabled" type="number" min="0" max="100"></label><label class="toggle-field"><input v-model="item.responsive.desktop_visible" :disabled="!canEdit(pageDraft) || !item.responsive.enabled" type="checkbox"><span>桌面显示</span></label><label class="toggle-field"><input v-model="item.responsive.mobile_visible" :disabled="!canEdit(pageDraft) || !item.responsive.enabled" type="checkbox"><span>手机显示</span></label></div>
                  </details>
                  <button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeGenericSectionItem(section, itemIndex)">删除此项</button>
                </div>
              </section>
              <section v-if="(pageDraft.slug === 'product' && section.id === 'pagination') || (pageDraft.slug === 'news' && ['dynamic-news', 'video-sharing'].includes(section.id)) || (pageDraft.slug === 'manufacturing' && section.id === 'core-equipment')" class="pagination-editor">
                <div class="section-card-heading"><strong>分页与展示数量</strong></div>
                <div class="field-grid"><label>每页数量<input v-model.number="section.pagination.page_size" :disabled="!canEdit(pageDraft)" type="number" min="1" max="6"></label><label>排序方式<select v-model="section.pagination.sort" :disabled="!canEdit(pageDraft)"><option value="manual">手动顺序</option><option v-if="pageDraft.slug === 'news'" value="published_at_desc">发布日期倒序</option><option value="sort_order_asc">排序数字升序</option></select></label><label>上一页文字<input v-model.trim="section.pagination.previous_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>下一页文字<input v-model.trim="section.pagination.next_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label class="full">空状态文字<input v-model.trim="section.pagination.empty_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label></div>
                <p v-if="pageDraft.slug === 'news'" class="form-help">新闻和视频分享按发布日期倒序，每页最多 6 条。</p>
                <p v-else-if="pageDraft.slug === 'manufacturing'" class="form-help">素材库存不限制；桌面PSD画布仍只显示4个入口，其余素材可在大图浏览中继续切换。</p>
              </section>
              <details class="advanced-fields section-advanced">
                <summary>段落高级设置（一般无需修改）</summary>
                <div class="field-grid">
                  <label>段落内部标识<input v-model.trim="section.id" :disabled="!canEdit(pageDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
                  <label>顶部小标题<input v-model.trim="section.kicker" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="可留空"></label>
                </div>
              </details>
            </article>

            <Teleport to="body">
              <div v-if="sectionLibraryOpen" class="section-library-overlay" @click.self="sectionLibraryOpen = false">
                <section class="section-library" role="dialog" aria-modal="true" aria-labelledby="section-library-title">
                  <header>
                    <div><p class="eyebrow">区块库</p><h3 id="section-library-title">添加区块</h3></div>
                    <button type="button" aria-label="关闭区块库" @click="sectionLibraryOpen = false">×</button>
                  </header>
                  <div v-for="group in sectionLibraryGroups" :key="group.category" class="section-library-group">
                    <h4>{{ group.category }}</h4>
                    <button v-for="definition in group.definitions" :key="definition.type" type="button" :disabled="!canEdit(pageDraft)" @click="addLibrarySection(definition.type)">
                      <strong>{{ definition.label }}</strong>
                      <span>{{ definition.description }}</span>
                    </button>
                  </div>
                  <p v-if="!sectionLibraryGroups.length" class="form-help">当前页面暂未注册可添加的区块类型。</p>
                </section>
              </div>
            </Teleport>
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
            <label>受控系列封面<select v-model="seriesDraft.cover_asset" :disabled="!canEdit(seriesDraft)"><option value="">尚未选择</option><option v-if="seriesDraft.cover_asset && !isReviewedMediaAsset(seriesDraft.cover_asset, 'product')" :value="seriesDraft.cover_asset">当前引用 {{ seriesDraft.cover_asset }}（尚未通过选择器核验）</option><option v-for="asset in editableMediaAssetsForPlacement('product', 'product.series.cover', 'image')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!editableMediaAssetsForPlacement('product', 'product.series.cover', 'image').length" class="form-help full">暂无可用的系列封面素材。请先登记用途为 product.series.cover 的媒体；尺寸图不会作为系列封面候选。</p>
            <label class="full">定位说明<textarea v-model="seriesDraft.positioning" :disabled="!canEdit(seriesDraft)" rows="3" maxlength="2000"></textarea></label>
            <label>应用场景（每行一项）<textarea v-model="seriesDraft.scenariosText" :disabled="!canEdit(seriesDraft)" rows="5" maxlength="3000" placeholder="例如：精密零件加工"></textarea></label>
            <label>核心能力（每行一项）<textarea v-model="seriesDraft.capabilitiesText" :disabled="!canEdit(seriesDraft)" rows="5" maxlength="3000" placeholder="例如：自动穿丝"></textarea></label>
          </div>
          <section v-if="seriesSupportsDetail" class="section-editor" aria-labelledby="series-detail-title">
            <div class="section-heading"><div><p class="eyebrow">详情首屏</p><h4 id="series-detail-title">系列详情（方案型系列）</h4><p>灵动切割工作站这类“方案型”系列没有独立型号记录，详情首屏使用这里的介绍与设备组成；型号型系列请到“产品型号、参数与尺寸图”维护。</p></div><button type="button" :disabled="!canEdit(seriesDraft)" @click="initializeSeriesDetail">从官网原版初始化</button></div>
            <p v-if="seriesDetailIsEmpty" class="form-help">当前还没有写入详情。点击“从官网原版初始化”把官网现有的介绍与设备组成变成可编辑内容，再按需修改并保存。</p>
            <div class="field-grid">
              <label>介绍标题<input v-model.trim="seriesDraft.detail.intro.title" :disabled="!canEdit(seriesDraft)" maxlength="160" placeholder="例如：灵动切割工作站"></label>
              <label>介绍副标题<input v-model.trim="seriesDraft.detail.intro.subtitle" :disabled="!canEdit(seriesDraft)" maxlength="160" placeholder="例如：无人化加工解决方案"></label>
              <label class="full">适应场景<input v-model.trim="seriesDraft.detail.intro.scene" :disabled="!canEdit(seriesDraft)" maxlength="240"></label>
              <label class="full">介绍正文<textarea v-model.trim="seriesDraft.detail.intro.body" :disabled="!canEdit(seriesDraft)" rows="4" maxlength="4000"></textarea></label>
              <label>设备主图<select v-model="seriesDraft.detail.machine_asset_id" :disabled="!canEdit(seriesDraft)"><option value="">沿用官网原图</option><option v-if="seriesDraft.detail.machine_asset_id && !isReviewedMediaAsset(seriesDraft.detail.machine_asset_id, 'product')" :value="seriesDraft.detail.machine_asset_id">当前引用 {{ seriesDraft.detail.machine_asset_id }}（尚未通过选择器核验）</option><option v-for="asset in productFeatureMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            </div>
            <p v-if="!productFeatureMediaAssets().length" class="form-help">暂无可用的产品素材。请先在“高级设置 → 媒体资产”上传图片，使用范围选“产品展示”，展示位置选“产品系列封面”或“产品图或尺寸图”。</p>
            <div class="section-heading"><div><p class="eyebrow">设备组成</p><h4>核心能力明细</h4><p>每项可以配置标题、说明和备注；画布上可以直接改文字。</p></div><button type="button" :disabled="!canEdit(seriesDraft)" @click="addSeriesDetailFeature">新增一项</button></div>
            <article v-for="(feature, index) in seriesDraft.detail.features" :key="`series-feature-${index}`" class="section-card">
              <div class="section-card-heading"><strong>第 {{ index + 1 }} 项</strong><div><button type="button" class="text-action" :disabled="!canEdit(seriesDraft) || index === 0" @click="moveSeriesDetailFeature(index, -1)">上移</button><button type="button" class="text-action" :disabled="!canEdit(seriesDraft) || index === seriesDraft.detail.features.length - 1" @click="moveSeriesDetailFeature(index, 1)">下移</button><button type="button" class="text-action danger" :disabled="!canEdit(seriesDraft)" @click="removeSeriesDetailFeature(index)">删除</button></div></div>
              <div class="field-grid"><label>标题<input v-model.trim="feature.label" :disabled="!canEdit(seriesDraft)" maxlength="120"></label><label>备注<input v-model.trim="feature.note" :disabled="!canEdit(seriesDraft)" maxlength="300" placeholder="例如：多种方式可供选择"></label><label>图片<select v-model="feature.media_asset_id" :disabled="!canEdit(seriesDraft)"><option value="">不使用图片</option><option v-for="asset in productFeatureMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label><label class="full">说明<textarea v-model.trim="feature.detail" :disabled="!canEdit(seriesDraft)" rows="2" maxlength="1000"></textarea></label></div>
            </article>
          </section>
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
            <section class="media-reference-editor full-field" aria-label="时间轴受控媒体">
              <div class="section-card-heading"><strong>时间轴配图（可选）</strong><span>{{ companyDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">选择品牌/企业素材（含内部预览草稿）</option><option v-for="asset in editableMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">添加</button></div>
              <p v-if="!editableMediaAssets('brand').length" class="form-help">暂无可用的品牌/企业素材。可先在“更多工具 - 媒体资产”登记时间轴配图；草稿只用于后台内部预览。</p>
              <div v-for="reference in companyDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'brand') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(companyDraft)" @click="removeCompanyMediaReference(reference.media_asset_id)">移除</button></div>
              <label class="full">时间轴导航图标<select v-model="companyDraft.icon_asset" :disabled="!canEdit(companyDraft)"><option value="">沿用官网原版图标</option><option v-if="companyDraft.icon_asset && !isReviewedMediaAsset(companyDraft.icon_asset, 'brand')" :value="companyDraft.icon_asset">当前引用 {{ companyDraft.icon_asset }}（尚未通过选择器核验）</option><option v-for="asset in editableMediaAssetsForPlacement('brand', 'about.timeline.icon', 'image')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <small class="field-help">图标只能选择已发布的品牌/企业图片；建议 PNG/WebP，96×96 至 256×256 px。留空时使用官网原版图标。</small>
            </section>
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
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">选择已上传资质素材</option><option v-for="asset in qualificationMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ qualificationMediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">添加</button></div>
              <p v-if="!qualificationMediaAssets().length" class="form-help">暂无可用的资质素材。请先在“媒体资产”中登记。</p>
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
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">选择已发布制造素材（含内部预览草稿）</option><option v-for="asset in editableMediaAssets('manufacturing')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">添加</button></div>
              <p v-if="!editableMediaAssets('manufacturing').length" class="form-help">暂无可用的制造素材。请先在“媒体资产”中登记素材；草稿只用于后台内部预览。</p>
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
          <button v-if="serviceMode === 'service_resources'" type="button" class="primary-action" :disabled="saving" @click="createServiceResource">新建服务资料草稿</button>
          <button v-for="record in serviceRecords(serviceMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedServiceId }" @click="selectServiceRecord(record.id)"><span>{{ serviceLabel(record) }}</span><small>{{ serviceSecondary(record) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!serviceRecords(serviceMode).length" class="empty compact">当前账号没有可读取的服务支持内容。</p>
        </aside>

        <form v-if="serviceDraft" class="editor-form" @submit.prevent="saveServiceRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ serviceHeading() }}</p><h3>{{ serviceLabel(serviceDraft) }}</h3></div><span class="status" :data-status="serviceDraft.status">{{ statusLabel(serviceDraft.status) }}</span></div>
          <p v-if="!canEdit(serviceDraft)" class="read-only-note">该记录目前不可直接编辑。</p>

          <div v-if="serviceMode === 'service_resources'" class="field-grid">
            <label>资料编号（系统维护）<input :value="serviceDraft.source_key" disabled></label>
            <label>资料栏目<select v-model="serviceDraft.type" :disabled="!canEdit(serviceDraft)" required><option value="video">视频教学</option><option value="product_manual">产品技术手册</option><option value="machine_manual">机床说明书</option><option value="software">系统软件</option></select></label>
            <label class="full">标题<input v-model.trim="serviceDraft.title" :disabled="!canEdit(serviceDraft)" maxlength="240" required></label>
            <label class="full">摘要<textarea v-model="serviceDraft.summary" :disabled="!canEdit(serviceDraft)" rows="3" maxlength="1000"></textarea></label>
            <label class="full">正文说明<textarea v-model="serviceDraft.body" :disabled="!canEdit(serviceDraft)" rows="6" maxlength="20000"></textarea></label>
            <label>适用型号（每行一项）<textarea v-model="serviceDraft.applicableModelsText" :disabled="!canEdit(serviceDraft)" rows="4" maxlength="2000" placeholder="例如：FR400XS"></textarea></label>
            <label>语言<input v-model.trim="serviceDraft.language" :disabled="!canEdit(serviceDraft)" maxlength="40" placeholder="zh-CN"></label>
            <label>资料版本<input v-model.trim="serviceDraft.version" :disabled="!canEdit(serviceDraft)" maxlength="120" placeholder="例如：v1.0"></label>
            <label>{{ serviceDraft.type === 'video' ? '受控教学视频' : '受控下载文件' }}<select v-model="serviceDraft.asset" :disabled="!canEdit(serviceDraft)"><option value="">尚未选择</option><option v-if="serviceDraft.asset && !isServiceResourceMediaAsset(serviceDraft.asset, serviceDraft.type)" :value="serviceDraft.asset">当前引用 {{ serviceDraft.asset }}（尚未通过选择器核验）</option><option v-for="asset in serviceResourceMediaAssets(serviceDraft.type)" :key="asset.id" :value="String(asset.id)">{{ serviceResourceMediaAssetLabel(asset, serviceDraft.type) }}</option></select></label>
            <label>视频封面（仅视频需要）<select v-model="serviceDraft.cover_asset" :disabled="!canEdit(serviceDraft)"><option value="">尚未选择</option><option v-if="serviceDraft.cover_asset && !isServiceTutorialPosterAsset(serviceDraft.cover_asset)" :value="serviceDraft.cover_asset">当前引用 {{ serviceDraft.cover_asset }}（尚未通过选择器核验）</option><option v-for="asset in serviceTutorialPosterAssets()" :key="asset.id" :value="String(asset.id)">{{ serviceTutorialPosterAssetLabel(asset) }}</option></select></label>
            <label>展示日期<input v-model="serviceDraft.display_date" :disabled="!canEdit(serviceDraft)" type="date"></label>
            <label>页面排序<input v-model.number="serviceDraft.sort_order" :disabled="!canEdit(serviceDraft)" type="number" min="0" step="1"></label>
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

      <section v-else-if="activeTab === 'editorial'" :class="showVideoShareWorkspace ? 'video-share-tab' : 'workspace-grid'" aria-label="文章与案例编辑">
        <VideoShareWorkspace v-if="showVideoShareWorkspace" ref="videoShareWorkspace" @changed="handleVideoShareChanged" @notify="handleVideoShareNotify" />
        <template v-else>
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">文章与案例</p><h3>文章与案例</h3></div><strong>{{ editorialRecords(editorialMode).length }}</strong></div>
          <div class="subtabs" aria-label="文章与案例类型">
            <button type="button" :class="{ active: editorialMode === 'articles' }" @click="selectEditorialMode('articles')">新闻与文章</button>
            <button type="button" :class="{ active: editorialMode === 'case_studies' }" @click="selectEditorialMode('case_studies')">客户案例</button>
          </div>
          <button type="button" class="primary-action" :disabled="saving" @click="createEditorialRecord()">新建草稿</button>
          <button v-for="record in editorialRecords(editorialMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedEditorialId }" @click="selectEditorialRecord(record.id)"><span>{{ editorialLabel(record) }}</span><small>{{ editorialSecondary(record) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!editorialRecords(editorialMode).length" class="empty compact">暂时没有此类内容草稿，可使用“新建草稿”开始维护。</p>
        </aside>

        <form v-if="editorialDraft" class="editor-form" @submit.prevent="saveEditorialRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ editorialHeading() }}</p><h3>{{ editorialLabel(editorialDraft) }}</h3></div><span class="status" :data-status="editorialDraft.status">{{ statusLabel(editorialDraft.status) }}</span></div>
          <p v-if="!canEdit(editorialDraft)" class="read-only-note">该记录目前不可直接编辑。请先通过既有内容审核流程恢复为草稿或退回修改状态。</p>
          <p v-else class="form-help">所有保存均为内容草稿。封面媒体、来源和客户授权须在发布前完成受控审核，工作台不提供发布操作。</p>

          <div v-if="editorialMode === 'articles'" class="word-import-row">
            <label class="word-import-button" :class="{ disabled: !canEdit(editorialDraft) || importingWord }">
              {{ importingWord ? '正在导入...' : '导入 Word 文档' }}
              <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :disabled="!canEdit(editorialDraft) || importingWord" @change="importWordDocument">
            </label>
            <small>支持 .docx；保留标题层级、段落、加粗/斜体、列表、引用、表格和图片。导入后请检查内容，再点“保存内容草稿”。</small>
          </div>

          <div v-if="editorialMode === 'articles'" class="field-grid">
            <label>文章标识<input v-model.trim="editorialDraft.slug" :disabled="!canEdit(editorialDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>内容类型<select v-model="editorialDraft.category" :disabled="!canEdit(editorialDraft)" required><option value="news">动态新闻</option></select></label>
            <label>官网显示日期<input v-model="editorialDraft.display_date" :disabled="!canEdit(editorialDraft)" type="date" required></label>
              <label>同日排序<input v-model.number="editorialDraft.sort_order" :disabled="!canEdit(editorialDraft)" type="number" min="0" step="1" placeholder="留空表示按系统默认顺序"><small class="field-help">数值小的排在同日内容前面；留空不会改变默认顺序。</small></label>
            <label class="full">标题<input v-model.trim="editorialDraft.title" :disabled="!canEdit(editorialDraft)" required maxlength="240"></label>
            <label class="full">图文正文<textarea v-model="editorialDraft.body" :disabled="!canEdit(editorialDraft)" rows="10" maxlength="30000" placeholder="填写段落；可使用基础 HTML（p、h2-h4、strong、em、ul、ol、blockquote、table、a、受管图片路径），发布时会自动过滤危险标签。"></textarea><small class="field-help">动态新闻使用文章和图片；视频分享请在“视频分享内容”里单独维护。也可以直接导入 Word 文档生成标题、正文和图片。</small></label>
            <label class="full">正文图片配置（受控媒体 JSON）<textarea v-model="editorialDraft.body_media_text" :disabled="!canEdit(editorialDraft)" rows="3" placeholder='[{"media_asset_id":"123","caption":"图片说明"}]'></textarea><small class="field-help">仅填写已登记的文章图片素材；保存后正文图片可在新闻详情画布中选中并按“新闻正文图片”用途替换。</small></label>
            <label v-if="editorialDraft.category === 'video'" class="full">字幕或文字稿<textarea v-model="editorialDraft.transcript" :disabled="!canEdit(editorialDraft)" rows="8" maxlength="30000" placeholder="可选：填写字幕或文字稿，便于检索和无障碍阅读。"></textarea></label>
            <section class="media-reference-editor full" aria-label="文章受控媒体">
              <div class="section-card-heading"><strong>动态新闻封面图</strong><span>{{ editorialDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="editorialMediaSelection" :disabled="!canEdit(editorialDraft)"><option value="">选择动态新闻封面图</option><option v-for="asset in eligibleEditorialMediaAssets('news')" :key="asset.id" :value="String(asset.id)">{{ editorialMediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(editorialDraft) || !editorialMediaSelection" @click="addEditorialMediaReference">添加</button></div>
              <p class="field-help">动态新闻封面只接受“文章与资讯 / 动态新闻封面 / news / dynamic-news”的图片；不能填写外部视频地址。</p>
              <p v-if="!reviewedMediaAssets('article').length" class="form-help">暂无已发布的文章素材。请先在“媒体资产”完成上传、版权确认、规格检查和发布。</p>
              <div v-for="reference in editorialDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'article') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(editorialDraft)" @click="removeEditorialMediaReference(reference.media_asset_id)">移除</button></div>
            </section>
            <label>受控封面素材<select v-model="editorialDraft.cover_asset" :disabled="!canEdit(editorialDraft)"><option value="">尚未选择</option><option v-if="editorialDraft.cover_asset && !isEditorialCoverAssetAllowed(editorialDraft.cover_asset, 'news')" :value="editorialDraft.cover_asset">当前引用 {{ editorialDraft.cover_asset }}（尚未通过图片选择器核验）</option><option v-for="asset in eligibleEditorialCoverAssets('news')" :key="asset.id" :value="String(asset.id)">{{ editorialMediaAssetLabel(asset) }}</option></select></label>
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

          <div class="form-actions"><a :href="nativeItemPath(editorialMode, editorialDraft.id)">打开高级设置关联受控媒体与查看审核记录</a><button v-if="canDeleteEditorialDraft(editorialDraft)" type="button" class="text-action danger" :disabled="saving" @click="deleteEditorialDraft">删除当前草稿</button><button class="primary-action" type="submit" :disabled="saving || !canEdit(editorialDraft)">{{ saving ? '保存中...' : '保存内容草稿' }}</button></div>
        </form>
        <div v-else class="empty">请选择或新建一条{{ editorialMode === 'articles' ? '文章' : '客户案例' }}草稿。</div>
        </template>
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
            <div class="section-card-heading"><strong>页脚栏目</strong><button type="button" :disabled="!canEdit(settingsDraft)" @click="addFooterColumn">新增栏目</button></div>
            <article v-for="(column, columnIndex) in settingsDraft.footer.columns" :key="`footer-column-${columnIndex}`" class="section-card">
              <div class="section-card-heading"><strong>栏目 {{ columnIndex + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft)" @click="removeFooterColumn(columnIndex)">删除栏目</button></div>
              <div class="field-grid"><label>栏目标题<input v-model.trim="column.title" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>栏目排序<input v-model.number="column.sort_order" :disabled="!canEdit(settingsDraft)" type="number" min="0" max="99"></label></div>
              <div v-for="(link, linkIndex) in column.links" :key="`footer-column-link-${columnIndex}-${linkIndex}`" class="field-grid nested-fields"><label>显示名称<input v-model.trim="link.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>链接地址<input v-model.trim="link.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/about 或 https://..."></label><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft)" @click="removeFooterColumnLink(columnIndex, linkIndex)">删除链接</button></div>
              <button type="button" :disabled="!canEdit(settingsDraft)" @click="addFooterColumnLink(columnIndex)">新增栏目链接</button>
            </article>
            <details class="advanced-fields footer-text-style-editor">
              <summary>页尾文字样式（默认关闭）</summary>
              <p class="form-help">每项默认沿用官网原版。只有单独启用后才会调整该项文字，不会改变页尾坐标、尺寸或动画。</p>
              <article v-for="definition in footerTextStyleDefinitions" :key="definition.id" class="section-card compact-style-card">
                <div class="section-card-heading"><strong>{{ definition.label }}</strong><label class="toggle-field"><input v-model="settingsDraft.footer.text_styles[definition.id].enabled" :disabled="!canEdit(settingsDraft)" type="checkbox"><span>启用</span></label></div>
                <div class="field-grid">
                  <label>字重<select v-model.number="settingsDraft.footer.text_styles[definition.id].weight" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled"><option :value="300">细</option><option :value="400">常规</option><option :value="500">中等</option><option :value="700">粗</option><option :value="800">特粗</option></select></label>
                  <label>桌面字号（px）<input v-model.number="settingsDraft.footer.text_styles[definition.id].size_desktop" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" type="number" min="12" max="72"></label>
                  <label>手机字号（px）<input v-model.number="settingsDraft.footer.text_styles[definition.id].size_mobile" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" type="number" min="12" max="40"></label>
                  <label>行高<input v-model.number="settingsDraft.footer.text_styles[definition.id].line_height" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" type="number" min="1" max="2.2" step="0.05"></label>
                  <label>文字颜色<input v-model.trim="settingsDraft.footer.text_styles[definition.id].color" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" pattern="#[0-9a-fA-F]{6}" placeholder="#BCBCBC"></label>
                </div>
              </article>
            </details>
          </section>

          <section class="section-editor" aria-labelledby="site-brand-title">
            <div><p class="eyebrow">品牌与联系方式</p><h4 id="site-brand-title">品牌与页面联系入口</h4></div>
            <div class="field-grid">
              <label>品牌显示名称<input v-model.trim="settingsDraft.brand.display_name" :disabled="!canEdit(settingsDraft)" required maxlength="160"></label>
              <label>受控品牌标志素材<select v-model="settingsDraft.brand.logo_asset" :disabled="!canEdit(settingsDraft)" required><option value="">选择已发布品牌素材</option><option v-if="settingsDraft.brand.logo_asset && !isReviewedMediaAsset(settingsDraft.brand.logo_asset, 'brand')" :value="settingsDraft.brand.logo_asset">当前引用 {{ settingsDraft.brand.logo_asset }}（尚未通过选择器核验）</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>页脚品牌图<select v-model="settingsDraft.brand.footer_logo_asset" :disabled="!canEdit(settingsDraft)"><option value="">沿用顶部品牌标志</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>页脚地址图标<select v-model="settingsDraft.footer.address_icon_asset" :disabled="!canEdit(settingsDraft)"><option value="">沿用官网原图</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>页脚电话图标<select v-model="settingsDraft.footer.phone_icon_asset" :disabled="!canEdit(settingsDraft)"><option value="">沿用官网原图</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>页脚邮箱图标<select v-model="settingsDraft.footer.email_icon_asset" :disabled="!canEdit(settingsDraft)"><option value="">沿用官网原图</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <p v-if="!reviewedMediaAssets('brand').length" class="form-help full">暂无已发布的品牌标志素材。请先在“媒体资产”中完成登记、品牌审核和发布。</p>
              <label>服务电话<input v-model.trim="settingsDraft.contacts.service_phone" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label>
              <label>国内业务电话<input v-model.trim="settingsDraft.contacts.domestic_phone" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label>海外业务电话<input v-model.trim="settingsDraft.contacts.export_phone" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label>国内业务邮箱<input v-model.trim="settingsDraft.contacts.domestic_email" :disabled="!canEdit(settingsDraft)" type="email" maxlength="160"></label>
              <label>海外业务邮箱<input v-model.trim="settingsDraft.contacts.export_email" :disabled="!canEdit(settingsDraft)" type="email" maxlength="160"></label>
              <label>语言切换按钮文字<input v-model.trim="settingsDraft.contacts.language_label" :disabled="!canEdit(settingsDraft)" maxlength="24" placeholder="EN"></label>
              <label>顶部按钮文案<input v-model.trim="settingsDraft.contacts.header_cta.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label>
              <label class="full">顶部按钮链接<input v-model.trim="settingsDraft.contacts.header_cta.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/service 或 https://..."></label>
              <label class="full">联系地址（每行一项）<textarea v-model="settingsDraft.contacts.addressesText" :disabled="!canEdit(settingsDraft)" rows="3" maxlength="1000" placeholder="中国浙江省...\n海外办事处..."></textarea></label>
              <label>采购区按钮文案<input v-model.trim="settingsDraft.footer.purchase_label" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label>采购区标题<input v-model.trim="settingsDraft.footer.purchase_title" :disabled="!canEdit(settingsDraft)" maxlength="160"></label>
              <label class="full">采购区说明<textarea v-model="settingsDraft.footer.purchase_subtitle" :disabled="!canEdit(settingsDraft)" rows="2" maxlength="400"></textarea></label>
              <label>采购联系电话<input v-model.trim="settingsDraft.footer.purchase_phone" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label class="full">版权文字<input v-model.trim="settingsDraft.footer.copyright" :disabled="!canEdit(settingsDraft)" maxlength="240"></label>
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
            <p class="form-help">详情默认沿用官网原版（模板里的介绍、设备组成与示意图）。点击“从官网原版初始化详情”把它们写入本型号，之后才能在表单和画布上修改；已填写的字段不会被覆盖。</p>
            <div class="form-actions"><span></span><button type="button" :disabled="!canEdit(modelDraft)" @click="initializeModelDetail">从官网原版初始化详情</button></div>
            <div class="field-grid">
              <label>型号名称<input v-model.trim="modelDraft.name" :disabled="!canEdit(modelDraft)" required maxlength="160"></label>
              <label>型号编码<input v-model.trim="modelDraft.model_code" :disabled="!canEdit(modelDraft)" required maxlength="80"></label>
              <label>所属系列编码<input v-model.trim="modelDraft.series_code" :disabled="!canEdit(modelDraft)" required maxlength="80"></label>
              <label>访问标识<input v-model.trim="modelDraft.slug" :disabled="!canEdit(modelDraft)" pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            </div>
            <section class="section-editor" aria-labelledby="model-labels-title">
              <div class="section-heading"><div><p class="eyebrow">页面文字</p><h4 id="model-labels-title">参数与尺寸图标题</h4></div></div>
              <div class="field-grid">
                <label>技术参数文字<input v-model.trim="modelDraft.configuration.labels.technical" :disabled="!canEdit(modelDraft)" maxlength="80" placeholder="技术参数"></label>
                <label>工程视图文字<input v-model.trim="modelDraft.configuration.labels.drawing" :disabled="!canEdit(modelDraft)" maxlength="80" placeholder="机型工程视图"></label>
                <label class="full">技术参数侧边图<select v-model="modelDraft.configuration.labels.technical_image_asset_id" :disabled="!canEdit(modelDraft)"><option value="">沿用官网原图</option><option v-for="asset in productDrawingMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelDrawingMediaAssetLabel(asset) }}</option></select></label>
              </div>
            </section>
            <section v-if="modelSupportsWorkstationIntro" class="section-editor" aria-labelledby="model-intro-title">
              <div class="section-heading"><div><p class="eyebrow">详情首屏</p><h4 id="model-intro-title">工作站介绍与设备主图</h4><p>仅覆盖对应系列有介绍的区域，未填写时官网沿用原 PSD 文案与图片。</p></div></div>
              <div class="field-grid">
                <label>介绍标题<input v-model.trim="modelDraft.configuration.intro.title" :disabled="!canEdit(modelDraft)" maxlength="160" placeholder="例如：灵动切割工作站"></label>
                <label>介绍副标题<input v-model.trim="modelDraft.configuration.intro.subtitle" :disabled="!canEdit(modelDraft)" maxlength="160" placeholder="例如：无人化加工解决方案"></label>
                <label>适应场景<input v-model.trim="modelDraft.configuration.intro.scene" :disabled="!canEdit(modelDraft)" maxlength="240"></label>
                <label>设备主图<select v-model="modelDraft.configuration.machine_asset_id" :disabled="!canEdit(modelDraft)"><option value="">沿用官网原图</option><option v-for="asset in reviewedMediaAssets('product')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
                <label class="full">介绍正文<textarea v-model="modelDraft.configuration.intro.body" :disabled="!canEdit(modelDraft)" rows="4" maxlength="4000"></textarea></label>
              </div>
            </section>
            <p v-else class="read-only-note">当前型号在官网使用“型号导航与核心能力”模板，没有工作站介绍展示位。</p>
            <section class="section-editor" aria-labelledby="model-features-title">
              <div class="section-heading"><div><p class="eyebrow">产品特点</p><h4 id="model-features-title">特性项目</h4><p>每项可以配置标题、说明和已审核图片；官网原有卡片布局不变。</p></div><button type="button" :disabled="!canEdit(modelDraft)" @click="addModelFeature">新增特点</button></div>
              <article v-for="(feature, index) in modelDraft.configuration.features" :key="`feature-${index}`" class="section-card">
                <div class="section-card-heading"><strong>特点 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelFeature(index)">删除</button></div>
                <div class="field-grid"><label>标题<input v-model.trim="feature.label" :disabled="!canEdit(modelDraft)" required maxlength="120"></label><label>图片<select v-model="feature.media_asset_id" :disabled="!canEdit(modelDraft)"><option value="">不使用图片</option><option v-for="asset in productFeatureMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelDrawingMediaAssetLabel(asset) }}</option></select></label><label class="full">详细说明<textarea v-model="feature.detail" :disabled="!canEdit(modelDraft)" rows="2" maxlength="1000"></textarea></label><label class="full">补充备注<input v-model.trim="feature.note" :disabled="!canEdit(modelDraft)" maxlength="300"></label></div>
              </article>
            </section>
            <section class="section-editor" aria-labelledby="model-drawings-title">
              <div class="section-heading"><div><p class="eyebrow">尺寸与工程图</p><h4 id="model-drawings-title">尺寸图</h4></div><button type="button" :disabled="!canEdit(modelDraft)" @click="addModelDrawing">新增尺寸图</button></div>
              <article v-for="(drawing, index) in modelDraft.configuration.drawings" :key="`drawing-${index}`" class="section-card">
                <div class="section-card-heading"><strong>尺寸图 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelDrawing(index)">删除</button></div>
                <div class="field-grid"><label>标题<input v-model.trim="drawing.title" :disabled="!canEdit(modelDraft)" maxlength="120"></label><label>图片<select v-model="drawing.media_asset_id" :disabled="!canEdit(modelDraft)" required><option value="">选择产品图片（已发布或仅内部预览草稿）</option><option v-for="asset in productDrawingMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelDrawingMediaAssetLabel(asset) }}</option></select></label><label class="full">图片说明<input v-model.trim="drawing.caption" :disabled="!canEdit(modelDraft)" maxlength="500"></label></div>
              </article>
            </section>
            <section class="section-editor" aria-labelledby="model-resources-title">
              <div class="section-heading"><div><p class="eyebrow">下载资料</p><h4 id="model-resources-title">产品资料链接</h4></div><button type="button" :disabled="!canEdit(modelDraft)" @click="addModelResource">新增资料</button></div>
              <article v-for="(resource, index) in modelDraft.resources" :key="`resource-${index}`" class="section-card">
                <div class="section-card-heading"><strong>资料 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelResource(index)">删除</button></div>
                <div class="field-grid"><label>标题<input v-model.trim="resource.title" :disabled="!canEdit(modelDraft)" required maxlength="160"></label><label>类型<input v-model.trim="resource.type" :disabled="!canEdit(modelDraft)" maxlength="80" placeholder="说明书、尺寸图"></label><label class="full">产品附件<select v-model="resource.media_asset_id" :disabled="!canEdit(modelDraft)"><option value="">不使用已上传附件</option><option v-for="asset in productResourceMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelResourceMediaAssetLabel(asset) }}</option></select></label><label class="full">站内文件或 HTTPS 地址（不选附件时填写）<input v-model.trim="resource.url" :disabled="!canEdit(modelDraft)" maxlength="1000" placeholder="/assets/... 或 https://..."></label></div>
              </article>
            </section>
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
              <thead><tr><th>字段名称</th><th>数值</th><th>单位</th><th>测试条件</th><th>排序</th><th></th></tr></thead>
              <tbody>
                <tr v-for="parameter in parameters" :key="parameter.id">
                  <td><input v-model.trim="parameter.field_name" :disabled="!canEdit(parameter)" maxlength="160" required @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.trim="parameter.value" :disabled="!canEdit(parameter)" maxlength="500" required @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.trim="parameter.unit" :disabled="!canEdit(parameter)" maxlength="80" @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.trim="parameter.test_conditions" :disabled="!canEdit(parameter)" maxlength="1000" @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.number="parameter.sort_order" :disabled="!canEdit(parameter)" type="number" min="0" step="1" @input="markParameterDirty(parameter)"></td>
                  <td><button type="button" class="text-action" :disabled="saving || !canEdit(parameter)" @click="saveParameter(parameter)">保存</button></td>
                </tr>
                <tr v-if="!parameters.length"><td colspan="6" class="table-empty">当前型号暂无独立参数。</td></tr>
              </tbody>
            </table>
          </div>
          <form v-if="canEdit(modelDraft)" class="new-parameter" @submit.prevent="createParameter">
            <h4>新增技术参数</h4>
            <div class="field-grid parameter-fields"><label>字段名称<input v-model.trim="newParameter.field_name" required maxlength="160"></label><label>数值<input v-model.trim="newParameter.value" required maxlength="500"></label><label>单位<input v-model.trim="newParameter.unit" maxlength="80"></label></div>
            <div class="form-actions"><span></span><button class="primary-action" type="submit" :disabled="saving">新增参数</button></div>
          </form>
        </section>
      </section>

      <aside v-if="liveWebsitePreviewVisible && websitePreviewAvailable" class="live-website-preview" :class="{ 'visual-property-panel-open': selectedVisualElement }" aria-label="官网实时预览">
        <header class="visual-editor-toolbar" aria-label="画布编辑工具栏">
          <div class="visual-editor-brand"><span class="visual-editor-icon" aria-hidden="true">R</span><div><p class="eyebrow">官网画布编辑</p><strong>{{ previewTitle }}</strong></div></div>
          <div class="visual-editor-tools" role="toolbar" aria-label="编辑工具">
            <button type="button" :class="{ active: visualTool === 'select' }" :disabled="!visualCanvasEditable" title="选择元素" @click="visualTool = 'select'; visualEditMode = true; postLivePreviewUpdate()">↖<span>选择</span></button>
            <button type="button" :class="{ active: visualTool === 'text' }" :disabled="!visualCanvasEditable" title="选择文字元素" @click="visualTool = 'text'; visualEditMode = true; postLivePreviewUpdate()">T<span>文字</span></button>
            <button type="button" :class="{ active: visualTool === 'media' }" :disabled="!visualCanvasEditable" title="选择图片或视频" @click="visualTool = 'media'; visualEditMode = true; postLivePreviewUpdate()">▧<span>媒体</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" :class="{ active: visualDevice === 'desktop' }" title="桌面画布" @click="setVisualDevice('desktop')">▣<span>桌面</span></button>
            <button type="button" :class="{ active: visualDevice === 'tablet' }" title="平板画布" @click="setVisualDevice('tablet')">▤<span>平板</span></button>
            <button type="button" :class="{ active: visualDevice === 'mobile' }" title="手机画布" @click="setVisualDevice('mobile')">▥<span>手机</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" title="撤销" :disabled="!visualCanvasEditable || !canUndo" @click="undoVisualChange">↶<span>撤销</span></button>
            <button type="button" title="重做" :disabled="!visualCanvasEditable || !canRedo" @click="redoVisualChange">↷<span>重做</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" :disabled="!visualCanvasEditable" title="水平居中" @click="alignVisualElement('center')">↔<span>居中</span></button>
            <button type="button" @click="fitVisualCanvas(true)">适应窗口</button>
            <label class="zoom-control" title="画布缩放">缩放 <input v-model.number="visualZoom" type="range" min="0.05" max="1" step="0.01"><output>{{ Math.round(visualZoom * 100) }}%</output></label>
          </div>
          <div class="visual-editor-actions">
            <label v-if="websitePreviewTarget?.collection === 'articles'" class="visual-record-switcher">新闻画布
              <select :value="articlePreviewSurface" aria-label="新闻画布" @change="switchArticlePreviewSurface($event.target.value)">
                <option value="detail">详情画布</option>
                <option value="list">列表卡片画布</option>
              </select>
            </label>
            <template v-if="livePreviewRootSlug === 'news' || (websitePreviewTarget?.collection === 'pages' && websitePreviewTarget?.record?.slug === 'news')">
              <button type="button" :disabled="!visualCanvasEditable" @click="createEditorialFromCanvas('video')">新增视频分享</button>
              <button type="button" :disabled="!visualCanvasEditable" @click="createEditorialFromCanvas('news')">新建动态新闻</button>
            </template>
            <label v-if="visualRecordChoices.length > 1" class="visual-record-switcher">条目
              <select :value="String(websitePreviewTarget?.record?.id || '')" aria-label="切换预览条目" @change="handleVisualPreviewRecordChange($event)">
                <option v-for="choice in visualRecordChoices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
              </select>
            </label>
            <span class="visual-selected-label" :title="selectedVisualElement?.label || '未选择元素'">{{ selectedVisualElement?.label || '未选择元素' }}</span>
            <span v-if="unsavedDraftCount" class="visual-unsaved-count" title="当前页面还有这些条目没保存：逐个点「保存当前条目」，或等整页批量保存上线">{{ `本页未保存 ${unsavedDraftCount} 项` }}</span>
            <span :data-state="livePreviewStatus">{{ livePreviewStatusLabel }}</span>
            <button type="button" class="visual-mode-button" :class="{ 'visual-edit-active': visualEditMode }" :disabled="!visualCanvasEditable" :title="visualCanvasEditable ? (visualEditMode ? '关闭 PC 画布编辑' : '开启 PC 画布编辑') : '当前窗口仅支持只读预览'" @click="toggleVisualEditMode">{{ visualCanvasEditable ? (visualEditMode ? '编辑中' : '编辑模式') : '只读预览' }}</button>
            <button type="button" class="visual-save-button" :disabled="saving || batchSaving || (!hasUnsavedChanges && !unsavedDraftCount && selectedVisualRecord?.collection !== 'articles')" :title="toolbarSaveTitle" @click="handleToolbarSave">{{ toolbarSaveLabel }}</button>
            <button v-if="selectedVisualRecord?.collection === 'articles'" type="button" class="secondary-action" @click="deleteSelectedVisualArticle">删除当前条目</button>
            <button type="button" :disabled="!hasUnsavedChanges" title="取消未保存修改" @click="discardVisualChanges">取消</button>
            <button type="button" title="切换画布专注模式" @click="visualCanvasFocus = !visualCanvasFocus">{{ visualCanvasFocus ? '退出画布' : '专注画布' }}</button>
            <button type="button" title="重新连接实时预览" aria-label="重新连接实时预览" @click="reconnectLiveWebsitePreview">↻</button>
            <button type="button" title="关闭实时预览" aria-label="关闭实时预览" @click="liveWebsitePreviewVisible = false">×</button>
          </div>
        </header>
        <p v-if="livePreviewError" class="live-preview-error">{{ livePreviewError }}</p>
        <div ref="canvasViewport" class="visual-canvas-viewport" :style="{ '--visual-zoom': visualZoom, '--canvas-width': visualCanvasWidth, '--canvas-height': visualCanvasHeight }">
          <iframe ref="livePreviewFrame" name="ruijun-live-website-preview" title="官网实时预览" @load="handleLivePreviewFrameLoad"></iframe>
        </div>
        <aside v-if="selectedVisualElement" class="visual-property-panel" aria-label="选中元素属性">
          <div class="visual-property-heading"><div><p class="eyebrow">选中元素</p><strong>{{ selectedVisualElement.label }}</strong></div><button type="button" title="关闭属性面板" aria-label="关闭属性面板" @click="selectedVisualElement = null">×</button></div>
          <p class="visual-property-source">{{ visualSelectionSource(selectedVisualElement) }}</p>
          <details v-if="selectedVisualRecord?.collection === 'articles' && editorialDraft" class="visual-article-meta" open @focusin="ensureArticleDraftActive">
            <summary>文章信息（审核必填）</summary>
            <label>SEO 标题<input v-model.trim="editorialDraft.seo.title" maxlength="160"></label>
            <label>SEO 描述<textarea v-model.trim="editorialDraft.seo.description" rows="2" maxlength="300"></textarea></label>
            <label>来源地址<input v-model.trim="editorialDraft.source_url" maxlength="500" placeholder="https://..."></label>
            <label>来源文件<input v-model.trim="editorialDraft.source_document" maxlength="500" placeholder="文件名或来源说明"></label>
            <p class="visual-property-help">这些字段与画布修改一起写入文章草稿，保存请用顶部「保存草稿」。</p>
          </details>
          <p v-if="selectedVisualElement.readonly" class="visual-property-help">{{ selectedVisualElement.readonlyReason || '此元素当前没有可写入的媒体记录。' }}</p>
          <template v-else>
            <label v-if="selectedVisualFieldOptions.length" class="visual-property-field">内容类型<select :value="selectedVisualFieldValue" @change="commitVisualField($event.target.value)"><option v-for="option in selectedVisualFieldOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
            <label v-else-if="selectedVisualElement.fieldPath && (selectedVisualElement.elementType === 'text' || selectedVisualElement.elementType === 'button')" class="visual-property-field">文字内容<textarea :value="selectedVisualFieldValue" rows="4" :maxlength="selectedVisualFieldMaxLength" @input="commitVisualField($event.target.value)"></textarea></label>
            <label v-if="selectedVisualElement.elementType === 'button' && selectedVisualElement.linkFieldPath" class="visual-property-field">按钮链接<input aria-label="按钮链接" :value="selectedVisualLinkValue" maxlength="1000" placeholder="例如：/contact 或 #reasons" @input="commitVisualLink($event.target.value)"></label>
            <label v-if="selectedVisualIsMedia && visualMediaReplacementOptions.length" class="visual-property-field">媒体替换<select :value="visualMediaSelection" @change="replaceVisualMedia($event.target.value)"><option value="">{{ selectedVisualCanRestoreDefault ? (selectedVisualElement.elementType === 'video' ? '沿用官网原视频' : '沿用官网原图') : '选择系统中的媒体' }}</option><optgroup v-if="visualMediaAssets.length" label="当前展示位可用"><option v-for="asset in visualMediaAssets" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup><optgroup v-if="visualMediaFallbackOptions.length" label="系统中的其他媒体"><option v-for="asset in visualMediaFallbackOptions" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup><optgroup v-if="visualStagingMediaAssets.length" label="未发布素材（仅内部预览）"><option v-for="asset in visualStagingMediaAssets" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup></select></label>
            <p v-if="selectedVisualIsMedia && visualStagingMediaAssets.length" class="visual-property-help">未发布素材只在已登录后台的实时预览中显示；媒体上传即发布，正常不会出现这一组。</p>
            <p v-else-if="selectedVisualIsMedia && !visualMediaReplacementOptions.length" class="visual-property-help">待媒体：当前系统里没有同类型的已发布媒体。可以在下方上传，或先到“媒体资产”上传。</p>
            <div v-if="selectedVisualIsMedia" class="visual-media-tools">
              <label class="visual-upload">上传并替换<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" :disabled="visualUploading || !visualCanvasEditable" @change="uploadVisualMedia"></label>
              <template v-if="selectedVisualMediaAsset">
                <label>卡片标题（素材标题）<input v-model.trim="visualMediaDraft.title" maxlength="160"></label>
                <p class="visual-property-help">修改标题后点“保存素材信息”，官网卡片标题会同步更新。</p>
                <label>替代文本<input v-model.trim="visualMediaDraft.alt_text" maxlength="300"></label>
                <label v-if="selectedVisualMediaAsset.media_type === 'video'">字幕或文字稿<textarea v-model.trim="visualMediaDraft.transcript" rows="2" maxlength="20000"></textarea></label>
                <label v-if="selectedVisualMediaAsset.media_type === 'video'">封面<select v-model="visualMediaDraft.poster_asset_id"><option value="">未设置（官网显示视频首帧）</option><option v-for="poster in mediaPosterOptions(selectedVisualMediaAsset)" :key="poster.id" :value="String(poster.id)">{{ videoPosterAssetLabel(poster) }}</option></select></label>
                <label>版权状态<select v-model="visualMediaDraft.copyright_status"><option value="owned">自有素材</option><option value="licensed">已获许可</option><option value="authorized">已授权公开</option><option value="pending_review">待确认</option></select></label>
                <button type="button" :disabled="visualMediaSaving" @click="saveVisualMediaAttributes">{{ visualMediaSaving ? '保存中...' : '保存素材信息' }}</button>
              </template>
              <button v-if="selectedVisualElement.mediaAssetId && !selectedVisualIsArticleBodyImage" type="button" class="visual-card-delete" :disabled="visualMediaSaving" @click="deleteSelectedVideoShareCard">删除这张视频分享卡片</button>
              <button v-if="selectedVisualIsArticleBodyImage" type="button" class="visual-card-delete" :disabled="visualMediaSaving || saving" @click="deleteSelectedArticleBodyImage">删除这篇正文图片</button>
            </div>
            <button v-if="selectedVisualRecord?.collection === 'articles' || selectedVisualElement?.collection === 'articles'" type="button" class="visual-card-delete" :disabled="saving" @click="deleteSelectedVisualArticle">删除这篇动态新闻</button>
            <div v-if="selectedVisualListReorder" class="visual-list-order"><span>当前第 {{ selectedVisualListReorder.index + 1 }} 项，共 {{ selectedVisualListReorder.length }} 项</span><div><button type="button" @click="addSelectedVisualListItem">新增</button><button type="button" @click="duplicateSelectedVisualListItem">复制</button><button type="button" :disabled="selectedVisualListReorder.length <= 1" @click="removeSelectedVisualListItem">删除</button><button type="button" :disabled="selectedVisualListReorder.index === 0" @click="moveSelectedVisualListItem(-1)">上移</button><button type="button" :disabled="selectedVisualListReorder.index === selectedVisualListReorder.length - 1" @click="moveSelectedVisualListItem(1)">下移</button></div></div>
            <div class="visual-property-grid"><label>水平偏移<input v-model.number="visualPosition.x" type="number" min="-30" max="30" step="0.1" @change="commitVisualPosition"></label><label>垂直偏移<input v-model.number="visualPosition.y" type="number" min="-30" max="30" step="0.1" @change="commitVisualPosition"></label></div>
            <div class="visual-property-grid"><label>字号<input v-model.number="visualTextStyle.fontSize" type="number" min="10" max="120" step="1" @change="commitVisualTextStyle"></label><label>字重<select v-model="visualTextStyle.fontWeight" @change="commitVisualTextStyle"><option value="400">正常</option><option value="500">中等</option><option value="600">半粗</option><option value="700">粗体</option></select></label></div>
            <div class="visual-property-grid"><label>行高<input v-model.number="visualTextStyle.lineHeight" type="number" min="1" max="2.2" step="0.05" @change="commitVisualTextStyle"></label><label>文字颜色<input v-model="visualTextStyle.textColor" type="color" @change="commitVisualTextStyle"></label></div>
            <p class="visual-property-help">只保存受控字段，不会修改 Nuxt 模板或写入任意 CSS。</p>
          </template>
          <!-- Save right where the edit happens: the operator had to travel back to the
               toolbar every time, which made a one-field change feel expensive. -->
          <div class="visual-property-save">
            <button type="button" class="primary-action" title="只保存当前选中的这一条记录" :disabled="saving || (!hasUnsavedChanges && selectedVisualRecord?.collection !== 'articles')" @click="openSaveNameDialog">{{ saving ? '保存中...' : '保存当前条目' }}</button>
            <button type="button" class="secondary-action" :disabled="!hasUnsavedChanges" @click="discardVisualChanges">取消修改</button>
            <span class="visual-property-save-state" :class="{ pending: hasUnsavedChanges }">{{ hasUnsavedChanges ? '有未保存修改' : '已保存' }}</span>
          </div>
        </aside>
      </aside>

      <div v-if="seriesCreateOpen" class="cms-create-backdrop" @click.self="closeSeriesCreateDialog">
        <section class="cms-create-dialog" role="dialog" aria-modal="true" aria-label="新增系列卡片">
          <p class="eyebrow">新增系列卡片</p>
          <label>系列名称<input v-model.trim="seriesCreateDraft.name" maxlength="120" placeholder="例如：FR (pro)"></label>
          <label>系列编码<input v-model.trim="seriesCreateDraft.code" maxlength="80" placeholder="例如：ft-pro（小写字母、数字、连字符）" @input="seriesCodeTouched = true"></label>
          <p class="form-help">系列编码用于关联机型、参数和详情。输入英文名称时会自动建议（如 FT (Pro) → ft-pro），可手动修改；中文名称请手动填写英文编码。</p>
          <label>定位文案<input v-model.trim="seriesCreateDraft.positioning" maxlength="120" placeholder="卡片左上角的一句话定位"></label>
          <label>卡片封面<select v-model="seriesCreateDraft.coverAssetId"><option value="">稍后在选择器里补充</option><option v-for="asset in seriesCreateCoverOptions" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
          <p class="form-help">确认后会立即创建一张草稿卡片（仅画布可见），随后可继续补充机型与详情。</p>
          <p v-if="seriesCreateError" class="save-name-error">{{ seriesCreateError }}</p>
          <div class="form-actions"><span></span><div class="review-actions"><button type="button" class="secondary-action" :disabled="seriesCreateSaving" @click="closeSeriesCreateDialog">取消</button><button type="button" class="primary-action" :disabled="seriesCreateSaving || !seriesCreateDraft.name.trim()" @click="confirmSeriesCreate">{{ seriesCreateSaving ? '正在创建...' : '确认创建' }}</button></div></div>
        </section>
      </div>
      <div v-if="createArticleOpen" class="cms-create-backdrop" @click.self="closeCreateArticle">
        <section class="cms-create-dialog" role="dialog" aria-modal="true" :aria-label="createArticleCategory === 'video' ? '新增视频分享' : '新增动态新闻'">
          <p class="eyebrow">{{ createArticleCategory === 'video' ? '新增视频分享' : '新增动态新闻' }}</p>
          <label>标题<input v-model.trim="createArticleTitle" maxlength="240" placeholder="请输入标题"></label>
          <label>媒体<select v-model="createArticleMediaId"><option value="">稍后在详情画布补充</option><option v-for="asset in createArticleMediaOptions" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
          <p class="form-help">{{ createArticleCategory === 'video' ? '可直接选择系统里已有的视频；也可以稍后上传或替换。' : '可选择已有图片作为封面；也可以稍后补充。' }}</p>
          <div class="form-actions"><span></span><div class="review-actions"><button type="button" class="secondary-action" @click="closeCreateArticle">取消</button><button type="button" class="primary-action" :disabled="createArticleSaving || !createArticleTitle.trim()" @click="confirmCreateArticle">{{ createArticleSaving ? '正在创建...' : '创建' }}</button></div></div>
        </section>
      </div>

      <section v-if="previewOpen" class="preview-panel" role="region" aria-labelledby="draft-preview-title">
        <section class="preview-dialog" aria-labelledby="draft-preview-title">
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
            <p class="preview-category">{{ editorialDraft.category || '未分类' }}</p><h4>{{ editorialDraft.title || '未命名文章' }}</h4><div class="preview-body">{{ editorialDraft.body || '尚未填写正文' }}</div>
          </article>

          <article v-else-if="previewKind === 'series'" class="site-preview product-preview">
            <p class="preview-category">产品系列</p><h4>{{ seriesDraft.name || '未命名系列' }}</h4><p>{{ seriesDraft.positioning || '尚未填写系列定位' }}</p><div class="preview-columns"><section><strong>应用场景</strong><ul><li v-for="item in fromTextList(seriesDraft.scenariosText)" :key="item">{{ item }}</li><li v-if="!fromTextList(seriesDraft.scenariosText).length">尚未填写</li></ul></section><section><strong>核心能力</strong><ul><li v-for="item in fromTextList(seriesDraft.capabilitiesText)" :key="item">{{ item }}</li><li v-if="!fromTextList(seriesDraft.capabilitiesText).length">尚未填写</li></ul></section></div>
          </article>

          <article v-else-if="previewKind === 'model'" class="site-preview product-preview">
            <p class="preview-category">{{ modelDraft.series_code || '产品型号' }}</p><h4>{{ modelDraft.name || '未命名型号' }}</h4><p>型号编码：{{ modelDraft.model_code || '未填写' }}</p><table><thead><tr><th>参数</th><th>数值</th><th>单位</th></tr></thead><tbody><tr v-for="parameter in parameters" :key="parameter.id"><td>{{ parameter.field_name }}</td><td>{{ parameter.value }}</td><td>{{ parameter.unit || '-' }}</td></tr><tr v-if="!parameters.length"><td colspan="3">尚未填写技术参数</td></tr></tbody></table>
          </article>

          <div v-else class="preview-empty">当前内容类型暂不支持画面预览。请先保存草稿，再由对应页面的预览入口检查最终展示。</div>
        </section>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="saveNameDialogOpen" class="save-name-backdrop" @click.self="closeSaveNameDialog">
        <form class="save-name-dialog" @submit.prevent="confirmSaveNameDialog">
          <p class="eyebrow">{{ saveNameMode === 'batch' ? '保存并送审' : '保存草稿' }}</p>
          <h3>{{ saveNameMode === 'batch' ? '给这次送审起个名字' : '给这次保存起个名字' }}</h3>
          <p class="form-help">{{ saveNameMode === 'batch' ? '本次保存的所有条目会合并成一条送审记录，审核和发布都按这一批处理。' : '默认名称已填好，可以直接保存，也可以修改后再保存。' }}</p>
          <ul v-if="saveNameMode === 'batch' && batchMemberLabels.length" class="batch-member-list"><li v-for="label in batchMemberLabels" :key="label">{{ label }}</li></ul>
          <label>{{ saveNameMode === 'batch' ? '送审名称' : '保存名称' }}<input v-model.trim="saveNameDraft" maxlength="160" autofocus></label>
          <p v-if="saveNameError" class="save-name-error">{{ saveNameError }}</p>
          <div class="form-actions">
            <button type="button" class="secondary-action" :disabled="saving" @click="closeSaveNameDialog">取消</button>
            <button type="submit" class="primary-action" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </Teleport>
  </private-view>
</template>

<script setup>
import { apiStatus, boundedFooterStyleNumber, clone, defaultPageMediaRole, emptySeriesDetail, filterQueueRecords, footerTextStyleDefinitions, cloneVisualState, contentListText, emptyMediaDraft, emptyParameter, greatestCommonDivisor, isPageMediaOptionForSection, knowledgeSteps, mediaTypeForFile, nextDraftSlug, nextServiceKey, normalizeArticle, normalizeFooterTextStyles, normalizeKnowledge, normalizeLink, normalizeMediaReferences, normalizeModel, normalizeOptionalSortOrder, normalizePageMedia, normalizePagination, normalizeRepairPage, normalizeReviewRecord, normalizeSections, normalizeSeries, normalizeSettings, parseArray, parseObject, queueCollectionOptions, registeredSectionList, remapVisualListPath, reviewedMediaAssetsForPlacement, textList } from './draft-shapes.js';
import { filterVisualMediaAssets } from './visual-media-filter.js';
import { filterPreviewStagingMediaAssets, isPreviewStagingMedia } from './visual-media-staging.js';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { resolveHomepageReasonMediaPlacement, resolveNewsBodyMediaPlacement, resolveNewsCoverMediaPlacement, resolveQualificationMediaPlacement, qualificationDraftAssets } from './visual-media-placement.js';
import { filterEditorialRecords } from './editorial-record-filter.js';
import { readWordArticle } from './word-import.js';
import { normalizePageMediaReferences } from './page-media-references.js';
import { livePreviewGrantIds } from './editorial-preview-grants.js';
import { siteAreaContentMap, siteAreaLabels } from './content-navigation.js';
import { mediaPlacementContexts, mediaPlacementOptions } from './media-placement-catalog.js';
import { defaultModelConfiguration, defaultSeriesDetail, normalizeSeriesDetail, seriesDetailKey } from '../../../../website/shared/product-series-details.mjs';
import { useApi } from '@directus/extensions-sdk';
import { defaultSectionPresentation, normalizeFieldPresentations, normalizeSectionPresentation, validateSectionPresentation } from './section-presentation.js';
import { addVisualListItem, appendVisualListItem, applyVisualMediaReplacement, duplicateVisualListItem, getVisualFieldValue, getVisualListReorder, getVisualMediaAssetId, hydrateHomeReasonFields, hydrateProductDimensionsFields, hydrateProductProofFields, hydrateServiceActionMediaFields, hydrateServiceOfficeFields, hydrateServiceSupportFields, isVisualMediaSelection, moveVisualListItem, removeVisualListItem, removeVisualListItemAt, resolveVisualFieldTarget, setVisualFieldValue, shouldKeepVisualDraft, visualFieldMaxLength } from './visual-editing-fields.js';
import { homeHeroVideoOptions, setHomeHeroVideoAsset } from './homepage-hero-video.js';
import { newsHeroVideoAssetId, newsHeroVideoOptions, setNewsHeroVideoAsset } from './news-hero-video.js';
import { applyVisualPositionDelta, readVisualPosition, setVisualPosition } from './visual-editing-position.js';
import { setVisualTextStyle } from './visual-editing-text-style.js';
import { setVisualAlignment } from './visual-editing-layout.js';
import { preferVisualDraftRecord, resolveActiveVisualEditingTarget, resolveVisualEditingRecord } from './visual-editing-target.js';
import { requiresVisualDraftSwitchConfirmation } from './visual-editing-switch-guard.js';
import { cloneVisualSnapshot, createVisualHistory, recordVisualSnapshot, stepVisualHistory } from './visual-editing-history.js';
import { productModelLivePreviewRecord } from './product-model-live-preview.js';
import { materializeVisualMediaRecord } from './visual-preview-media.js';
import { hydrateFactoryMediaSlots } from '../../../../website/shared/about-factory-gallery.mjs';
import { mergeVisualSiteSettingsDefaults, visualSiteSettingsPayload } from './site-settings-visual-defaults.js';
import { normalizeProductModelFeaturePresentation } from './product-model-presentation.js';
import { formatProductDrawingMediaLabel, orderProductDrawingMediaAssets } from './product-drawing-media.js';
import { videoPosterAssets } from './video-poster-assets.js';
import { mediaPosterHintFor, mediaPosterOptionsFor } from './media-poster-editor.js';
import { editorialMediaAssets, isEditorialMediaAssetAllowed } from './editorial-media-assets.js';
import { visualPresentationFieldPath } from './visual-editing-presentation-path.js';
import { createManufacturingProcessNode } from './manufacturing-process-node.js';
import { validateMediaFileContent } from './media-file-validation.js';
import { canEditVisualCanvas } from './visual-editing-viewport.js';
import VideoShareWorkspace from './video-share-workspace.vue';
import { applyPageSectionPreset, createPageSectionInstance, getPageSectionDefinition, listPageSectionDefinitions, listPageSectionPresets, validatePageSectionInstance } from '../../../../website/shared/page-section-registry.mjs';

const api = useApi();
const editableStatuses = new Set(['draft', 'rejected', 'unpublished']);
const supportedPageSectionSlugs = new Set(['home', 'product', 'manufacturing', 'news', 'about', 'service']);
const pageSectionLabels = Object.freeze({
  'home:hero': '首页首屏标题',
  'home:why-ruijun': '三大理由总标题',
  'home:performance': '三大理由：增效降损',
  'home:advanced-manufacturing': '三大理由：先进智造',
  'home:industry-leadership': '三大理由：行业领先',
  'home:products': '首页产品展示',
  'home:history': '首页品牌时间轴',
  'home:product-task': '首页底部行动区',
  'product:hero': '产品页首屏标题',
  'product:categories': '产品理由总标题',
  'product:proof-efficiency': '产品指标：增效降损',
  'product:proof-years': '产品指标：制造经验',
  'product:proof-champion': '产品指标：行业表现',
  'product:model-list': '产品系列列表标题',
  'product:parameters': '技术参数标题',
  'product:dimensions': '尺寸与资料标题',
  'product:pagination': '产品分页文字',
  'about:hero': '关于瑞钧首屏',
  'about:brand-story': '品牌故事',
  'about:overview': '公司简介',
  'about:history': '品牌时间轴',
  'about:factory': '厂区风貌图库',
  'about:certificates': '认证证书图库',
  'about:honors': '荣誉证书图库',
  'about:patents': '专利证书图库',
  'about:partners': '合作品牌与供应商',
  'about:clients-domestic': '国内客户标题与图库',
  'about:clients-global': '国外客户标题与图库'
});
const repairPageKeys = new Set(['repair_home', 'repair_new', 'repair_warranty', 'repair_progress']);
const repairActionCodes = new Set(['01', '02', '09', '10']);
const activeTab = ref('home');
const siteArea = ref('home');

const siteAreaLabel = computed(() => siteAreaLabels[siteArea.value] || '官网栏目');
function pageDisplayName(page) {
  const slug = String(page?.slug || '').trim();
  if (slug === 'home') return '网站主页';
  return siteAreaLabels[slug] || String(page?.title || slug || '未命名页面');
}
function syncSiteAreaForPage(page) {
  const slug = String(page?.slug || '').trim();
  if (Object.hasOwn(siteAreaLabels, slug)) siteArea.value = slug;
}

const siteAreaContentEntries = computed(() => siteAreaContentMap[siteArea.value] || []);
function siteAreaEntryDescription(entry) {
  const descriptions = {
    '首页视频': '修改官网首页首屏视频、封面和首屏文字。',
    '三大特点': '修改首页三大理由的标题、正文和展示素材。',
    '产品系列展示图': '修改首页产品系列的图片、名称和展示顺序。',
    '时间轴': '修改首页时间轴背景、年份、里程碑和说明。',
    '选型咨询': '修改首页底部联系区的标题、说明和按钮链接。',
    '产品资料区标题': '修改产品资料区域的中英文标题；具体资料链接在“产品系列与型号”中维护。',
    '应用案例区标题': '修改应用案例区域的中英文标题；具体案例内容需先建立并关联真实案例记录。'
  };
  const manufacturingDescriptions = {
    '制造首屏': '修改制造页首屏标题、说明和背景媒体。',
    '工艺流程画布': '修改工艺节点标题、正文、连接标签和节点媒体。',
    'CNC车间': '修改 CNC 车间标题、正文、核心设备说明和图片。',
    '钣金车间': '修改钣金车间标题、正文、核心设备说明和图片。',
    '装配车间': '修改装配车间标题、正文和展示图片。',
    '精密检测': '修改精密检测标题、正文和检测设备图片。',
    '电气装配': '修改电气装配标题、正文和展示图片。',
    '智能物料仓储': '修改智能物料仓储标题、正文和展示图片。',
    '生产核心设备': '修改生产核心设备标题、分页数量和设备图库。'
  };
  return descriptions[entry.label] || manufacturingDescriptions[entry.label] || '打开该栏目对应的内容、图片或资料。';
}
const technicalAccess = ref(false);
// Submitting a draft for review is an editor's routine step, not an administrator
// tool, so the 内容送审 entry cannot live inside the administrator-only advanced
// group. Without it the tab was rendered but unreachable — no navigation anywhere
// set activeTab to 'submit', so the only button that calls submitForReview() was
// on a screen nobody could open, and the publish chain had no way past `draft`.
const workflowAccess = ref(false);
const showAdvanced = ref(false);
const helpOpen = ref(false);
const loading = ref(false);
const saving = ref(false);
const importingWord = ref(false);
const parametersLoading = ref(false);
const error = ref('');
const message = ref('');
const retrySaveAction = ref(null);
const pages = ref([]);
const homepageSections = ref([]);
const homepageSectionDraft = ref(null);
const series = ref([]);
const models = ref([]);
const parameters = ref([]);
// Inline parameter rows are independent records. Track which rows the operator
// actually changed, otherwise the top "保存草稿" saved only the model and the
// edited rows silently reverted on the next reload.
const dirtyParameterIds = ref([]);
const savedModelFingerprint = ref('');
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
const pageMediaSelection = ref('');
const reviewQueue = ref([]);
const reviewLoading = ref(false);
const reviewSaving = ref(false);
const productReleaseHint = ref(false);
const reviewQueueLoaded = ref(false);
const selectedReviewKey = ref('');
const reviewNote = ref('');
const submissionQueue = ref([]);
const submissionLoading = ref(false);
const submissionSaving = ref(false);
const submissionQueueLoaded = ref(false);
const selectedSubmissionKey = ref('');
const submissionNote = ref('');
const draftSubmissionName = ref('');
const saveNameDialogOpen = ref(false);
const saveNameMode = ref('article');
const batchMemberLabels = ref([]);
const saveNameDraft = ref('');
const saveNameError = ref('');
const submissionMode = ref('submit');
// The submission queue spans every content collection and routinely holds
// hundreds of drafts (the FAQ knowledge base alone contributes 235), so the flat
// list buried whatever the operator had just created. These two narrow it down
// client-side — the API cannot sort by date_updated here because that field is
// not readable through the collection permission.
const submissionQuery = ref('');
const submissionCollectionFilter = ref('');
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
const editorialCategory = ref('');
const selectedEditorialId = ref('');
const videoShareWorkspace = ref(null);
const showVideoShareWorkspace = computed(() => editorialMode.value === 'articles' && editorialCategory.value === 'video');
const selectedKnowledgeId = ref('');
const pageDraft = ref(null);
const draggingPageSectionKey = ref('');
const sectionPresetSelection = ref({});
const pageSectionTypeOptions = computed(() => listPageSectionDefinitions(String(pageDraft.value?.slug || '')));
const sectionLibraryOpen = ref(false);

// The library groups registered types by their declared category so an operator
// can browse what a page supports instead of guessing from a flat dropdown.
const sectionLibraryGroups = computed(() => {
  const groups = new Map();
  for (const definition of pageSectionTypeOptions.value) {
    const category = String(definition.category || '其他');
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(definition);
  }
  return [...groups.entries()].map(([category, definitions]) => ({ category, definitions }));
});

// Outline is a full-page map: it always lists every section, even while the
// editor itself is filtered down to one grouped entry.
const sectionOutline = computed(() => {
  const sections = Array.isArray(pageDraft.value?.sections) ? pageDraft.value.sections : [];
  const slug = String(pageDraft.value?.slug || '');
  return sections.map((section, index) => {
    const definition = section?.type ? getPageSectionDefinition(section.type, slug) : null;
    return {
      id: String(section?.id || ''),
      label: pageSectionName(section, index),
      kind: definition ? definition.label : '模板栏目',
      registered: Boolean(definition),
      hidden: Boolean(section?.type) && section.enabled === false,
      review: section?.requires_claim_review === true
    };
  });
});

function focusPageSection(sectionId) {
  const key = String(sectionId || '').trim();
  if (!key) return;
  // Reveal the whole list first, otherwise the target may be filtered out.
  if (activePageSection.value && String(activePageSection.value.id || '') !== key) activePageSectionKey.value = '';
  nextTick(() => {
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key;
    document.querySelector(`[data-section-key="${escaped}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function openSectionLibrary() {
  if (!canEdit(pageDraft.value) || !pageSectionTypeOptions.value.length) return;
  sectionLibraryOpen.value = true;
}

function addLibrarySection(type) {
  addPageSection(type);
  sectionLibraryOpen.value = false;
}
const seriesDraft = ref(null);
const modelDraft = ref(null);
const modelSupportsWorkstationIntro = computed(() => String(modelDraft.value?.series_code || '').trim() === 'workstation');
const companyDraft = ref(null);
const companyMediaSelection = ref('');
const modelMediaSelection = ref('');
const editorialMediaSelection = ref('');
const serviceDraft = ref(null);
const repairDraft = ref(null);
const editorialDraft = ref(null);
const knowledgeDraft = ref(null);
const selectedReviewRecord = computed(() => reviewQueue.value.find((record) => reviewRecordKey(record) === selectedReviewKey.value) || null);
const selectedSubmissionRecord = computed(() => submissionQueue.value.find((record) => submissionRecordKey(record) === selectedSubmissionKey.value) || null);
// Content types present in the current queue, with counts, so the operator can
// jump straight to the collection they are working on.
const submissionCollectionOptions = computed(() => queueCollectionOptions(submissionQueue.value));
const filteredSubmissionQueue = computed(() => filterQueueRecords(submissionQueue.value, {
  query: submissionQuery.value,
  collection: submissionCollectionFilter.value
}));
const newParameter = ref(emptyParameter());
const mediaDraft = ref(emptyMediaDraft());
const previewOpen = ref(false);
const websitePreviewOpening = ref(false);
const liveWebsitePreviewVisible = ref(false);
const livePreviewFrame = ref(null);
const livePreviewFrameReady = ref(false);
const livePreviewStatus = ref('idle');
const livePreviewError = ref('');
const livePreviewWebsiteOrigin = ref('');
const activePageSectionKey = ref('');
const pageSectionGroupKeys = Object.freeze({
  'home:why-ruijun': ['why-ruijun', 'performance', 'advanced-manufacturing', 'industry-leadership'],
  'product:categories': ['categories', 'proof-efficiency', 'proof-years', 'proof-champion']
});
const activePageSection = computed(() => {
  const sections = Array.isArray(pageDraft.value?.sections) ? pageDraft.value.sections : [];
  const sectionKey = String(activePageSectionKey.value || '').trim();
  return sectionKey ? sections.find((section) => String(section?.id || '') === sectionKey) || null : null;
});
const visiblePageSections = computed(() => {
  const sections = Array.isArray(pageDraft.value?.sections) ? pageDraft.value.sections : [];
  if (!activePageSection.value) return sections;
  const sectionKey = String(activePageSectionKey.value || '').trim();
  const groupKeys = pageSectionGroupKeys[`${pageDraft.value?.slug || ''}:${sectionKey}`];
  return groupKeys ? sections.filter((section) => groupKeys.includes(String(section?.id || ''))) : [activePageSection.value];
});
const activePageSectionLabel = computed(() => {
  const section = activePageSection.value;
  if (!section) return '页面段落';
  const index = (pageDraft.value?.sections || []).indexOf(section);
  return pageSectionName(section, index < 0 ? 0 : index);
});
const visualEditMode = ref(false);
const visualTool = ref('select');
const visualZoom = ref(0.62);
const visualDevice = ref('desktop');
const visualViewportWidth = ref(typeof window === 'undefined' ? Infinity : window.innerWidth);
const visualCanvasFocus = ref(false);
const selectedVisualElement = ref(null);
const visualMediaSelection = ref('');
const visualPosition = reactive({ x: 0, y: 0 });
const visualTextStyle = reactive({ fontSize: 16, fontWeight: '400', lineHeight: 1.4, textColor: '#000000' });
const visualHistory = ref([]);
const visualHistoryIndex = ref(-1);
const articlePreviewSurface = ref('detail');
let suppressDraftHistory = false;
let livePreviewDebounceTimer = 0;
let pendingLivePreviewTarget = null;
let livePreviewRequestSequence = 0;
let livePreviewAutoRenewedForFrame = false;
let livePreviewAutoRenewInFlight = false;
let livePreviewRootTarget = null;
// 画布根页面不随“选中元素/切换条目”变化；这两个按钮必须跟根页面走，
// 否则选中文章或视频后 websitePreviewTarget 变成 articles/media，按钮会消失。
const livePreviewRootSlug = ref('');
const savedDraftFingerprint = ref('');
const savedDraftSnapshot = ref(null);

const livePreviewFields = Object.freeze({
  homepage_sections: ['id', 'page_key', 'section_key', 'title', 'kicker', 'body', 'content', 'media', 'sort_order', 'enabled', 'language', 'status', 'publication_state', 'published_at'],
  pages: ['id', 'slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  repair_page_configs: ['id', 'page_key', 'title', 'intro', 'hero_asset', 'model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo', 'language', 'status', 'publication_state', 'published_at'],
  product_series: ['id', 'series_code', 'slug', 'name', 'positioning', 'presentation', 'scenarios', 'capabilities', 'cover_asset', 'cover_media_asset_id', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['id', 'series_code', 'model_code', 'slug', 'name', 'parameters', 'parameter_groups', 'configuration', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  product_parameters: ['id', 'model_code', 'field_name', 'value', 'unit', 'presentation', 'sort_order', 'status', 'publication_state'],
  case_studies: ['id', 'slug', 'industry', 'material', 'thickness', 'model_code', 'process', 'result', 'authorization_status', 'status', 'publication_state', 'published_at'],
  articles: ['id', 'slug', 'category', 'title', 'display_date', 'sort_order', 'summary', 'body', 'body_media', 'transcript', 'field_presentation', 'media', 'cover_asset', 'cover_media_asset_id', 'seo', 'status', 'publication_state', 'published_at'],
  manufacturing_evidence: ['id', 'source_key', 'process', 'description', 'media', 'inspection_evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  qualifications: ['id', 'source_key', 'type', 'name', 'certificate_number', 'issuer', 'valid_until', 'assets', 'sort_order', 'authorization_status', 'status', 'publication_state', 'published_at'],
  milestones: ['id', 'source_key', 'year', 'event', 'evidence', 'media', 'icon_asset', 'sort_order', 'status', 'publication_state', 'published_at'],
  service_resources: ['id', 'source_key', 'type', 'title', 'summary', 'body', 'applicable_models', 'version', 'language', 'asset', 'cover_asset', 'asset_media_asset_id', 'cover_media_asset_id', 'display_date', 'sort_order', 'updated_at', 'status', 'publication_state', 'published_at'],
  service_locations: ['id', 'source_key', 'region', 'city', 'service_scope', 'contact', 'business_status', 'valid_until', 'status', 'publication_state', 'published_at'],
  knowledge_items: ['id', 'source_key', 'visibility', 'channel', 'category', 'question_title', 'applicable_models', 'error_codes', 'symptoms', 'troubleshooting_steps', 'risk_level', 'safety_preconditions', 'escalation_guidance', 'media', 'version', 'technical_reviewer', 'dify_sync_status', 'status', 'publication_state', 'published_at'],
  external_service_entries: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'health_status', 'status', 'publication_state', 'published_at'],
  site_settings: ['id', 'setting_key', 'navigation', 'footer', 'brand', 'contacts', 'languages', 'analytics', 'status', 'publication_state', 'published_at']
});

const previewKind = computed(() => {
  if (activeTab.value === 'pages' && pageDraft.value) return 'page';
  if (activeTab.value === 'editorial' && editorialMode.value === 'articles' && editorialDraft.value) return 'article';
  if (activeTab.value === 'series' && seriesDraft.value) return 'series';
  if (activeTab.value === 'models' && modelDraft.value) return 'model';
  return '';
});
const previewAvailable = computed(() => Boolean(previewKind.value));
const previewTitle = computed(() => ({ page: pageDisplayName(pageDraft.value), article: editorialDraft.value?.title, series: seriesDraft.value?.name, model: modelDraft.value?.name }[previewKind.value] || '当前草稿'));
const websitePreviewTarget = computed(() => {
  if (activeTab.value === 'homepage_sections' && homepageSectionDraft.value) return { collection: 'homepage_sections', record: homepageSectionDraft.value };
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
  return Boolean(target?.record?.id && (editableStatuses.has(target.record.status) || target.record.publication_state === 'published'));
});
function websitePreviewContextFor(target, requestedSectionKey = activePageSectionKey.value) {
  if (target?.collection === 'homepage_sections') return { sectionKey: target.record.section_key };
  const articleSectionKey = articlePreviewSectionKey(target);
  if (articleSectionKey) return { sectionKey: articleSectionKey };
  if (target?.collection !== 'pages') return requestedSectionKey ? { sectionKey: requestedSectionKey } : {};
  const sections = Array.isArray(target.record?.sections) ? target.record.sections : [];
  const selected = String(requestedSectionKey || '');
  const sectionKey = sections.some((section) => String(section?.id || '') === selected)
    ? selected
    : String(sections[0]?.id || '');
  return sectionKey ? { sectionKey } : {};
}
function articlePreviewSectionKey(target) {
  if (target?.collection !== 'articles' || articlePreviewSurface.value !== 'list') return '';
  return target.record?.category === 'video' ? 'video-sharing' : 'dynamic-news';
}
function switchArticlePreviewSurface(value) {
  const next = value === 'list' ? 'list' : 'detail';
  if (articlePreviewSurface.value === next) return;
  articlePreviewSurface.value = next;
  clearVisualSelection();
  if (liveWebsitePreviewVisible.value) void startLiveWebsitePreview();
}
const websitePreviewContext = computed(() => websitePreviewContextFor(websitePreviewTarget.value));
const livePreviewIdentity = computed(() => websitePreviewAvailable.value && websitePreviewTarget.value
  ? `${websitePreviewTarget.value.collection}:${websitePreviewTarget.value.record.id}`
  : '');
// The switcher should list what belongs to the page being edited, not the whole
// table: on a model page it used to offer all 30 models across every series.
function scopeVisualRecordChoices(collection, records) {
  const target = websitePreviewTarget.value;
  const current = target?.record || {};
  const list = Array.isArray(records) ? records : [];
  if (collection === 'product_models') {
    const seriesCode = String(current.series_code || '').trim();
    if (!seriesCode) return list;
    const scoped = list.filter((record) => String(record?.series_code || '') === seriesCode);
    return scoped.length ? scoped : list;
  }
  if (collection === 'homepage_sections') {
    const pageKey = String(current.page_key || '').trim();
    if (!pageKey) return list;
    const scoped = list.filter((record) => String(record?.page_key || '') === pageKey);
    return scoped.length ? scoped : list;
  }
  return list;
}
const visualRecordChoices = computed(() => {
  const collection = String(websitePreviewTarget.value?.collection || '').trim();
  const recordsByCollection = {
    homepage_sections: homepageSections.value,
    pages: pages.value,
    product_series: series.value,
    product_models: models.value,
    articles: editorial.value.articles,
    case_studies: editorial.value.case_studies,
    milestones: company.value.milestones,
    qualifications: company.value.qualifications,
    manufacturing_evidence: company.value.manufacturing_evidence,
    service_resources: service.value.service_resources,
    service_locations: service.value.service_locations,
    external_service_entries: service.value.external_service_entries,
    repair_page_configs: repairPages.value,
    knowledge_items: knowledgeItems.value
  };
  return scopeVisualRecordChoices(collection, recordsByCollection[collection] || []).map((record) => ({
    id: String(record.id),
    label: visualRecordLabel(collection, record)
  }));
});
let preserveLivePreviewSessionOnce = false;
// Throttle canvas session recovery so a persistent failure cannot reload the
// frame on every message.
let lastPreviewSessionRecoveryAt = 0;
const livePreviewStatusLabel = computed(() => ({
  idle: '等待连接', opening: '正在打开', connected: '实时同步', syncing: '正在同步', error: '连接失败'
})[livePreviewStatus.value] || '等待连接');
const currentLivePreviewRecord = computed(() => buildLivePreviewRecord());
const hasUnsavedChanges = computed(() => dirtyParameterIds.value.length > 0 || (Boolean(savedDraftFingerprint.value) && currentDraftFingerprint() !== savedDraftFingerprint.value));
const canUndo = computed(() => visualHistoryIndex.value > 0);
const canRedo = computed(() => visualHistoryIndex.value >= 0 && visualHistoryIndex.value < visualHistory.value.length - 1);
const visualCanvasEditable = computed(() => canEditVisualCanvas({ device: visualDevice.value, viewportWidth: visualViewportWidth.value }));
const visualCanvasWidth = computed(() => ({ desktop: '1920px', tablet: '900px', mobile: '390px' }[visualDevice.value] || '1920px'));
// A product detail is a long page: its series panel starts below the second
// card row (~1050px) and the specifications follow it. A fixed 1080px artboard
// put the whole detail panel outside the canvas. Product canvases therefore use
// a long artboard, and fit-to-window only fits the width so the page can be
// scrolled vertically instead of shrinking to an unreadable thumbnail.
const productDetailCanvas = computed(() => ['product_series', 'product_models'].includes(String(websitePreviewTarget.value?.collection || '')));
const visualCanvasHeight = computed(() => {
  if (visualDevice.value === 'desktop' && productDetailCanvas.value) return '2800px';
  return ({ desktop: '1080px', tablet: '1200px', mobile: '844px' }[visualDevice.value] || '1080px');
});
const canvasViewport = ref(null);
let canvasResizeObserver;
function fitVisualCanvas(force = false) {
  const el = canvasViewport.value;
  if (!el) return;
  // Opening the property panel narrows the viewport. Refitting here would zoom
  // the whole page out (26% → ~16%) the moment an editor selects a field, so
  // keep the current zoom while a selection is active; the viewport can scroll.
  if (selectedVisualElement.value && !force) return;
  const widthFit = (el.clientWidth - 40) / parseInt(visualCanvasWidth.value);
  const heightFit = (el.clientHeight - 40) / parseInt(visualCanvasHeight.value);
  const longPage = parseInt(visualCanvasHeight.value) > 1400;
  visualZoom.value = Math.max(0.05, Math.min(1, longPage ? widthFit : Math.min(widthFit, heightFit)));
}
watch(canvasViewport, (el) => {
  canvasResizeObserver?.disconnect();
  if (!el) return;
  canvasResizeObserver = new ResizeObserver(() => fitVisualCanvas());
  canvasResizeObserver.observe(el);
  fitVisualCanvas();
});
watch(visualDevice, () => nextTick(fitVisualCanvas));
watch(visualCanvasHeight, () => nextTick(fitVisualCanvas));
onBeforeUnmount(() => canvasResizeObserver?.disconnect());
function visualMediaFilterOptions() {
  const element = selectedVisualElement.value || {};
  const target = selectedVisualRecord.value || websitePreviewTarget.value;
  const collection = String(target?.collection || '').trim();
  const slug = String(target?.record?.slug || target?.record?.page_key || '').trim();
  const recordCategory = String(target?.record?.category || '').trim();
  const qualificationPlacement = resolveQualificationMediaPlacement({ collection, type: target?.record?.type, fieldPath: element.fieldPath, elementType: element.elementType });
  if (qualificationPlacement) return qualificationPlacement;
  const newsCoverPlacement = resolveNewsCoverMediaPlacement({ collection, category: recordCategory, fieldPath: element.fieldPath, elementType: element.elementType });
  if (newsCoverPlacement) return newsCoverPlacement;
  const newsBodyPlacement = resolveNewsBodyMediaPlacement({ collection, category: recordCategory, fieldPath: element.fieldPath, elementType: element.elementType });
  if (newsBodyPlacement) return newsBodyPlacement;
  const articleMediaField = /^media\.\d+\.(?:path|media_asset_id)$/.test(String(element.fieldPath || '').trim())
    || (collection === 'articles' && String(element.fieldPath || '').trim() === 'video_url');
  const homepageReasonPlacement = resolveHomepageReasonMediaPlacement({
    collection,
    slug,
    sectionKey: String(element.sectionKey || '').trim(),
    mediaRole: String(element.mediaRole || '').trim(),
    elementType: String(element.elementType || '').trim()
  });
  if (homepageReasonPlacement) return homepageReasonPlacement;
  if (collection === 'pages' && slug === 'home' && element.sectionKey === 'history') {
    return {scope:'brand',pageKey:'about',sectionKey:'history',elementType:'image',placementKey:element.mediaRole === 'icon' ? 'about.timeline.icon' : 'about.timeline.background'};
  }
  if (collection === 'product_series' && String(element.mediaRole || '').trim() === 'cover') {
    return { scope: 'product', placementKey: 'product.series.cover', elementType: 'image', pageKey: 'product', sectionKey: '' };
  }
  if (collection === 'product_models' && ['feature', 'drawing', 'technical', 'machine'].includes(String(element.mediaRole || '').trim())) {
    return { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image', pageKey: 'product', sectionKey: '' };
  }
  const scopeByCollection = {
    product_series: 'product',
    product_models: 'product',
    articles: 'article',
    manufacturing_evidence: 'manufacturing',
    qualifications: 'qualification',
    milestones: 'brand',
    service_locations: 'service',
    service_resources: 'service'
  };
  const placementBySection = {
    'hero': slug === 'home' && element.elementType === 'video' ? 'home.hero.video'
        : slug === 'news' && element.elementType === 'video' ? 'news.hero.video'
        : slug === 'service' ? 'service.hero.image'
          : slug === 'about' && element.mediaRole === 'foreground' ? 'about.hero.foreground'
            : slug === 'about' ? 'about.hero.background'
          : slug === 'manufacturing' ? `manufacturing.hero.${element.elementType === 'video' ? 'video' : 'image'}`
            : '',
    'process': `manufacturing.process.${element.elementType === 'video' ? 'video' : 'image'}`,
    'core-equipment': element.elementType === 'video' ? 'manufacturing.gallery.video' : 'manufacturing.equipment.image',
    'precision-machining': 'manufacturing.layer.image',
    'sheet-metal': 'manufacturing.layer.image',
    'standardized-assembly': 'manufacturing.layer.image',
    'whole-machine-validation': 'manufacturing.layer.image',
    'electrical-assembly': 'manufacturing.layer.image',
    'smart-warehouse': 'manufacturing.layer.image',
    'support-actions': 'service.action.icon',
    'office-directory': element.mediaRole === 'map' ? 'service.office.map' : 'service.office.image',
    'partners': 'about.partner.image',
    'clients-domestic': 'about.client.image',
    'clients-global': 'about.client.image',
    'factory': 'about.gallery.image',
    'certificates': 'qualification.image',
    'honors': 'qualification.image',
    'patents': 'qualification.image',
    'history': (slug === 'home' || slug === 'about') ? (element.mediaRole === 'icon' ? 'about.timeline.icon' : 'about.timeline.background') : '',
    'performance': 'home.reason.machine',
    'advanced-manufacturing': 'home.reason.background',
    'industry-leadership': 'home.reason.background'
  };
  // 视频文章详情中的媒体节点没有页面 section 属性；它仍必须使用
  // 视频分享的受控展示位，否则画布会错误显示“待媒体”。
  // video_url 是旧视频文章的兜底绑定，可能落在 <img> 上（elementType=image/cover），
  // 不能只认 video 元素，否则这类文章的画布选不到任何已有素材。
  if (collection === 'articles' && articleMediaField
    && (String(element.elementType || '') === 'video' || String(element.fieldPath || '').trim() === 'video_url')) {
    return {
      scope: 'article',
      placementKey: 'news.video_share.list',
      elementType: 'video',
      pageKey: 'news',
      sectionKey: 'video-sharing'
    };
  }
  return {
    scope: scopeByCollection[collection] || (collection === 'pages' ? pageMediaScope() : ''),
    placementKey: String(element.placementKey || placementBySection[String(element.sectionKey || '').trim()] || '').trim(),
    elementType: String(element.elementType || '').trim(),
    pageKey: slug === 'home' && String(element.sectionKey || '').trim() === 'history' ? '' : slug,
    sectionKey: String(element.sectionKey || '').trim()
  };
}
const visualMediaAssets = computed(() => filterVisualMediaAssets(mediaAssets.value, visualMediaFilterOptions()));
const visualStagingMediaAssets = computed(() => filterPreviewStagingMediaAssets(mediaCandidates.value, visualMediaFilterOptions()));
const visualMediaOptions = computed(() => [...visualMediaAssets.value, ...visualStagingMediaAssets.value]);
// 展示位过滤为空时，仍然允许运营从系统里选择同类型的已发布媒体。
// 这样视频分享卡片和页面视频槽都能复用媒体资产，而不是只能重新上传。
const visualMediaFallbackOptions = computed(() => {
  const elementType = String(selectedVisualElement.value?.elementType || '');
  if (!['video', 'image'].includes(elementType)) return [];
  const videoShareCard = Boolean(selectedVisualElement.value?.mediaAssetId && !selectedVisualElement.value?.fieldPath);
  const known = new Set(visualMediaOptions.value.map((asset) => String(asset.id)));
  return mediaAssets.value.filter((asset) => {
    const id = String(asset?.id || '');
    if (!id || known.has(id) || asset.enabled === false) return false;
    if (!['owned', 'licensed', 'authorized'].includes(String(asset.copyright_status || ''))) return false;
    const mediaType = String(asset.media_type || '').toLowerCase();
    const typeMatches = elementType === 'video' ? mediaType === 'video' : mediaType !== 'video';
    if (!typeMatches) return false;
    // 视频分享卡片可以换成另一条视频分享素材（会保留当前卡片并合并掉源素材），
    // 也可以换成尚未分配展示位的视频。
    if (videoShareCard) {
      const currentId = String(selectedVisualElement.value?.mediaAssetId || '');
      if (id === currentId) return false;
      return !String(asset.placement_key || '') || String(asset.placement_key || '') === 'news.video_share.list';
    }
    return true;
  });
});
const visualMediaReplacementOptions = computed(() => [...visualMediaOptions.value, ...visualMediaFallbackOptions.value]);
const selectedVisualIsMedia = computed(() => isVisualMediaSelection(selectedVisualElement.value));
const selectedVisualIsArticleBodyImage = computed(() => (
  selectedVisualRecord.value?.collection === 'articles'
  && String(selectedVisualElement.value?.fieldPath || '') === 'body'
  && Boolean(selectedVisualElement.value?.mediaAssetId)
));
const previewableMediaAssets = computed(() => [
  ...mediaAssets.value,
  ...filterPreviewStagingMediaAssets(mediaCandidates.value)
]);
// 画布内素材操作：选中媒体元素后直接上传替换，并编辑素材自身属性。
const visualUploading = ref(false);
const visualMediaSaving = ref(false);
const visualMediaDraft = ref({ title: '', alt_text: '', transcript: '', copyright_status: 'owned', poster_asset_id: '' });
const selectedVisualMediaAsset = computed(() => {
  const id = String(visualMediaSelection.value || '').trim();
  return id ? previewableMediaAssets.value.find((asset) => String(asset.id) === id) || null : null;
});
watch(selectedVisualMediaAsset, (asset) => {
  visualMediaDraft.value = {
    title: asset?.title || '',
    alt_text: asset?.alt_text || '',
    transcript: asset?.transcript || '',
    copyright_status: asset?.copyright_status || 'owned',
    poster_asset_id: asset?.poster_asset_id ? String(asset.poster_asset_id) : ''
  };
}, { immediate: true });
const selectedVisualRecord = computed(() => {
  const selection = selectedVisualElement.value || {};
  const resolved = resolveVisualEditingRecord({
    pages: preferVisualDraftRecord(pages.value, pageDraft.value),
    homepageSections: homepageSections.value,
    series: preferVisualDraftRecord(series.value, seriesDraft.value),
    models: preferVisualDraftRecord(models.value, modelDraft.value),
    parameters: parameters.value,
    editorial: {
      ...editorial.value,
      articles: editorialMode.value === 'articles' ? preferVisualDraftRecord(editorial.value.articles, editorialDraft.value) : editorial.value.articles,
      case_studies: editorialMode.value === 'case_studies' ? preferVisualDraftRecord(editorial.value.case_studies, editorialDraft.value) : editorial.value.case_studies
    },
    company: {
      ...company.value,
      milestones: companyMode.value === 'milestones' ? preferVisualDraftRecord(company.value.milestones, companyDraft.value) : company.value.milestones,
      qualifications: companyMode.value === 'qualifications' ? preferVisualDraftRecord(company.value.qualifications, companyDraft.value) : company.value.qualifications,
      manufacturing_evidence: companyMode.value === 'manufacturing_evidence' ? preferVisualDraftRecord(company.value.manufacturing_evidence, companyDraft.value) : company.value.manufacturing_evidence
    },
    service: {
      ...service.value,
      service_resources: serviceMode.value === 'service_resources' ? preferVisualDraftRecord(service.value.service_resources, serviceDraft.value) : service.value.service_resources,
      service_locations: serviceMode.value === 'service_locations' ? preferVisualDraftRecord(service.value.service_locations, serviceDraft.value) : service.value.service_locations,
      external_service_entries: serviceMode.value === 'external_service_entries' ? preferVisualDraftRecord(service.value.external_service_entries, serviceDraft.value) : service.value.external_service_entries
    },
    knowledge: { knowledge_items: activeTab.value === 'knowledge' ? preferVisualDraftRecord(knowledgeItems.value, knowledgeDraft.value) : knowledgeItems.value },
    repairPages: preferVisualDraftRecord(repairPages.value, repairDraft.value),
    settings: settingsDraft.value
  }, selection);
  return resolveActiveVisualEditingTarget(websitePreviewTarget.value, resolved, selection);
});
const selectedVisualTarget = computed(() => resolveVisualFieldTarget(selectedVisualRecord.value?.record, selectedVisualElement.value || {}));
const selectedVisualFieldValue = computed(() => getVisualFieldValue(selectedVisualTarget.value, selectedVisualElement.value?.fieldPath));
const selectedVisualLinkValue = computed(() => getVisualFieldValue(selectedVisualTarget.value, selectedVisualElement.value?.linkFieldPath));
const selectedVisualFieldMaxLength = computed(() => visualFieldMaxLength(selectedVisualElement.value || {}));
const selectedVisualListReorder = computed(() => getVisualListReorder(selectedVisualTarget.value, selectedVisualElement.value?.fieldPath));
function canRestoreVisualMediaDefault(element, collection, path) {
  if (collection === 'product_series' && path === 'cover_asset') return true;
  if (element?.allowDefaultMedia === true && collection === 'pages' && /^media\.\d+$/.test(path)) return true;
  if (element?.allowDefaultMedia === true && collection === 'pages' && path === 'hero_video_asset_id') return true;
  return element?.allowDefaultMedia === true
    && collection === 'site_settings'
    && /^(?:brand\.(?:logo_asset|footer_logo_asset)|footer\.(?:address_icon_asset|phone_icon_asset|email_icon_asset))$/.test(path);
}
const selectedVisualCanRestoreDefault = computed(() => canRestoreVisualMediaDefault(
  selectedVisualElement.value,
  String(selectedVisualRecord.value?.collection || websitePreviewTarget.value?.collection || ''),
  String(selectedVisualElement.value?.fieldPath || '').trim()
));
const selectedVisualFieldOptions = computed(() => {
  const collection = String(selectedVisualElement.value?.collection || '').trim();
  const fieldPath = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (collection === 'articles' && fieldPath === 'category') {
    return [
      { value: 'news', label: '动态新闻' }
    ];
  }
  return [];
});

const advancedTabs = new Set(['media', 'knowledge', 'models', 'review', 'settings']);

function currentDraftState() {
  if (activeTab.value === 'homepage_sections') return homepageSectionDraft.value;
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

// Unsaved drafts are kept per record, so switching a page/section/series/model
// no longer asks to throw the edits away. Saving is still per record; the batch
// save (save the whole page) builds on this cache.
const productDraftCache = new Map();
function productDraftKey(collection, id) {
  return `${collection}:${String(id)}`;
}
function stashProductDraft() {
  if (activeTab.value === 'series' && selectedSeriesId.value && seriesDraft.value) {
    productDraftCache.set(productDraftKey('product_series', selectedSeriesId.value), {
      series: clone(seriesDraft.value),
      savedFingerprint: savedDraftFingerprint.value,
      savedAt: Date.now()
    });
  }
  if (activeTab.value === 'models' && selectedModelId.value) {
    productDraftCache.set(productDraftKey('product_models', selectedModelId.value), {
      model: modelDraft.value ? clone(modelDraft.value) : null,
      parameters: clone(parameters.value),
      newParameter: clone(newParameter.value),
      dirtyParameterIds: [...dirtyParameterIds.value],
      savedModelFingerprint: savedModelFingerprint.value,
      savedFingerprint: savedDraftFingerprint.value,
      savedAt: Date.now()
    });
  }
  if (activeTab.value === 'pages' && selectedPageId.value && pageDraft.value) {
    productDraftCache.set(productDraftKey('pages', selectedPageId.value), {
      page: clone(pageDraft.value),
      savedFingerprint: savedDraftFingerprint.value,
      savedAt: Date.now()
    });
  }
  if (activeTab.value === 'homepage_sections' && homepageSectionDraft.value?.id != null) {
    productDraftCache.set(productDraftKey('homepage_sections', homepageSectionDraft.value.id), {
      section: clone(homepageSectionDraft.value),
      savedFingerprint: savedDraftFingerprint.value,
      savedAt: Date.now()
    });
  }
}
function hasCachedProductDraft(collection, id) {
  return productDraftCache.has(productDraftKey(collection, id));
}
function dropCachedProductDraft(collection, id) {
  productDraftCache.delete(productDraftKey(collection, id));
}
// Fingerprint of one cache entry, using the same shape `currentDraftState()` has
// for that tab so it can be compared with the saved baseline.
function cachedDraftFingerprint(entry) {
  if (!entry) return '';
  if (entry.series) return JSON.stringify(entry.series);
  if (entry.model !== undefined) return JSON.stringify({ model: entry.model, parameters: entry.parameters, newParameter: entry.newParameter });
  if (entry.page) return JSON.stringify(entry.page);
  if (entry.section) return JSON.stringify(entry.section);
  return '';
}
function activeDraftCacheKey() {
  if (activeTab.value === 'series' && selectedSeriesId.value) return productDraftKey('product_series', selectedSeriesId.value);
  if (activeTab.value === 'models' && selectedModelId.value) return productDraftKey('product_models', selectedModelId.value);
  if (activeTab.value === 'pages' && selectedPageId.value) return productDraftKey('pages', selectedPageId.value);
  if (activeTab.value === 'homepage_sections' && homepageSectionDraft.value?.id != null) return productDraftKey('homepage_sections', homepageSectionDraft.value.id);
  return '';
}
// "本页未保存 N 项": every cached draft that differs from its saved baseline,
// plus the active draft when it is dirty.
// `productDraftCache` is a plain Map, so bumping this counter is what makes the
// count recompute after a batch save updates the cached baselines.
const cacheRevision = ref(0);
const unsavedDraftCount = computed(() => {
  void cacheRevision.value;
  const activeKey = activeDraftCacheKey();
  let count = 0;
  for (const [key, entry] of productDraftCache) {
    if (key === activeKey) continue;
    if (!entry?.savedFingerprint) continue;
    if (cachedDraftFingerprint(entry) !== entry.savedFingerprint) count += 1;
  }
  if (hasUnsavedChanges.value) count += 1;
  return count;
});

// B3: save every dirty draft of the current page in one go. Each record is still
// written on its own (one audit entry per record); the report names the failures.
const batchSaving = ref(false);

function dirtyCachedDraftKeys() {
  const activeKey = activeDraftCacheKey();
  const keys = [];
  for (const [key, entry] of productDraftCache) {
    if (key === activeKey) continue;
    if (!entry?.savedFingerprint) continue;
    if (cachedDraftFingerprint(entry) !== entry.savedFingerprint) keys.push(key);
  }
  return keys;
}

function cachedDraftReportLabel(key) {
  const [collection, rawId] = String(key).split(':');
  const entry = productDraftCache.get(key);
  if (collection === 'pages') return `页面：${entry?.page?.title || entry?.page?.slug || rawId}`;
  if (collection === 'homepage_sections') return `首页区块：${entry?.section?.title || entry?.section?.section_key || rawId}`;
  if (collection === 'product_series') return `产品系列：${entry?.series?.name || entry?.series?.series_code || rawId}`;
  if (collection === 'product_models') return `产品型号：${entry?.model?.name || entry?.model?.model_code || rawId}`;
  return key;
}

function cachedDraftRecord(key) {
  const entry = productDraftCache.get(key);
  return entry?.page || entry?.section || entry?.series || entry?.model || null;
}

async function activateCachedDraft(key) {
  const separator = String(key).indexOf(':');
  const collection = separator > 0 ? String(key).slice(0, separator) : '';
  const id = separator > 0 ? String(key).slice(separator + 1) : '';
  const entry = productDraftCache.get(key);
  if (!entry) return false;
  if (collection === 'pages') {
    selectPage(id, true);
    return Boolean(pageDraft.value);
  }
  if (collection === 'homepage_sections') {
    if (!entry.section) return false;
    homepageSectionDraft.value = clone(entry.section);
    activeTab.value = 'homepage_sections';
    activePageSectionKey.value = String(entry.section.section_key || '');
    savedDraftFingerprint.value = entry.savedFingerprint;
    resetVisualHistory();
    return true;
  }
  if (collection === 'product_series') {
    selectSeries(id, true);
    return Boolean(seriesDraft.value);
  }
  if (collection === 'product_models') {
    await selectModel(id, true);
    return Boolean(modelDraft.value);
  }
  return false;
}

function currentDraftRecord() {
  if (activeTab.value === 'pages') return pageDraft.value;
  if (activeTab.value === 'homepage_sections') return homepageSectionDraft.value;
  if (activeTab.value === 'series') return seriesDraft.value;
  if (activeTab.value === 'models') return modelDraft.value;
  if (activeTab.value === 'company') return companyDraft.value;
  if (activeTab.value === 'service') return serviceDraft.value;
  if (activeTab.value === 'repair') return repairDraft.value;
  if (activeTab.value === 'editorial') return editorialDraft.value;
  if (activeTab.value === 'knowledge') return knowledgeDraft.value;
  if (activeTab.value === 'settings') return settingsDraft.value;
  return null;
}

let skipPublishedRevisionPrompt = false;

function isPublishedRecord(record) {
  return String(record?.status || '') === 'published' || String(record?.publication_state || '') === 'published';
}

function saveBlockedMessage(record) {
  return `该内容当前为「${statusLabel(record?.status)}」，不能直接保存。请先在「内容发布队列」把它退回草稿后再修改。`;
}

function confirmPublishedRevision(record, label = '这条内容') {
  if (!isPublishedRecord(record) || skipPublishedRevisionPrompt) return true;
  return window.confirm(`${label}当前已发布。保存会生成一版新的草稿修订，官网在重新审核发布前继续显示旧版本。确认保存？`);
}

function currentDraftCollection() {
  if (activeTab.value === 'pages') return 'pages';
  if (activeTab.value === 'homepage_sections') return 'homepage_sections';
  if (activeTab.value === 'series') return 'product_series';
  if (activeTab.value === 'models') return 'product_models';
  if (activeTab.value === 'company') return companyMode.value;
  if (activeTab.value === 'service') return serviceMode.value;
  if (activeTab.value === 'repair') return 'repair_page_configs';
  if (activeTab.value === 'editorial') return editorialMode.value;
  if (activeTab.value === 'knowledge') return 'knowledge_items';
  if (activeTab.value === 'settings') return 'site_settings';
  return '';
}

function currentDraftLabel() {
  const record = currentDraftRecord();
  return String(record?.name || record?.title || record?.event || record?.field_name || record?.model_code || record?.series_code || '当前条目');
}

async function saveWholePage(submissionName = '') {
  if (batchSaving.value || saving.value) return;
  stashProductDraft();
  // One submission: a single batch id covers every record written by this click.
  const batchId = `batch-${Date.now().toString(36)}`;
  // Newest wins: the active draft is applied first and `dirtyCachedDraftKeys()`
  // already excludes the active record, so a stale cached copy of the same record
  // can never overwrite the newer edits; the rest run newest-first.
  const pendingKeys = dirtyCachedDraftKeys()
    .sort((left, right) => (productDraftCache.get(right)?.savedAt || 0) - (productDraftCache.get(left)?.savedAt || 0));
  const activeIsDirty = hasUnsavedChanges.value;
  if (!activeIsDirty && !pendingKeys.length) { message.value = '当前页面没有未保存的修改。'; return; }
  // Preflight before the first write: a record in review/scheduled cannot be
  // saved, and discovering that halfway through used to leave a half-applied
  // batch. Abort before touching anything.
  const targets = [
    ...(activeIsDirty ? [{ label: '当前条目', record: currentDraftRecord() }] : []),
    ...pendingKeys.map((key) => ({ label: cachedDraftReportLabel(key), record: cachedDraftRecord(key), key }))
  ];
  const blocked = targets.filter((target) => target.record && !canEdit(target.record));
  if (blocked.length) {
    error.value = `批次未开始：${blocked.map((target) => `${target.label}（${statusLabel(target.record.status)}）`).join('、')} 当前不可保存。请先在「内容发布队列」退回草稿后再试。`;
    message.value = '';
    return;
  }
  const publishedTargets = targets.filter((target) => isPublishedRecord(target.record));
  if (publishedTargets.length && !window.confirm(`本批次有 ${publishedTargets.length} 项已发布内容。保存会为它们生成新的草稿修订，官网在重新审核发布前继续显示旧版本。确认继续？`)) return;
  skipPublishedRevisionPrompt = true;
  batchSaving.value = true;
  error.value = ''; message.value = `正在合并提交本页改动（${batchId}）…`;
  const failures = [];
  const savedItems = [];
  let savedCount = 0;
  let failedLabel = '';
  try {
    if (activeIsDirty) {
      await saveVisualDraft();
      if (error.value) { failures.push('当前条目'); failedLabel = '当前条目'; } else {
        savedCount += 1;
        const record = currentDraftRecord();
        if (record?.id != null && currentDraftCollection()) {
          savedItems.push({ collection: currentDraftCollection(), id: String(record.id), label: currentDraftLabel() });
        }
        // Re-baseline the active cache entry even if a hydration tick made the
        // in-flight snapshot comparison look "changed"; the PATCH succeeded.
        markDraftSaved();
      }
    }
    for (const key of pendingKeys) {
      if (failedLabel) break;
      const label = cachedDraftReportLabel(key);
      const activated = await activateCachedDraft(key);
      if (!activated) { failures.push(`${label}（已跳过）`); failedLabel = label; break; }
      await saveVisualDraft();
      if (error.value) { failures.push(label); failedLabel = label; } else {
        savedCount += 1;
        const separator = key.indexOf(':');
        savedItems.push({ collection: key.slice(0, separator), id: key.slice(separator + 1), label });
        const entry = productDraftCache.get(key);
        if (entry) {
          entry.savedFingerprint = cachedDraftFingerprint(entry);
          cacheRevision.value += 1;
        }
      }
    }
  } finally {
    skipPublishedRevisionPrompt = false;
    batchSaving.value = false;
    stashProductDraft();
  }
  message.value = `已保存 ${savedCount} 项记录${failures.length ? `，失败 ${failures.length} 项` : ''}。`;
  if (failures.length) {
    error.value = `批次已停止：${failedLabel || failures[0]} 保存失败。此前已保存的 ${savedCount} 项不会自动回滚；请修正后重新保存剩余项。`;
  }
  if (savedItems.length) {
    const name = String(submissionName || '').trim() || defaultBatchSubmissionName();
    try {
      await api.post('/items/content_submissions', {
        submission_name: name,
        batch_key: batchId,
        items: savedItems,
        status: 'draft',
        publication_state: 'unpublished'
      });
      message.value = `${message.value}已生成送审批次「${name}」，共 ${savedItems.length} 项。`;
    } catch {
      message.value = `${message.value}（内容已保存，但送审批次创建失败，请重新保存以生成批次）`;
    }
  }
  await refreshAfterSave([]);
}
// The spec table of a model that still shows the website original binds to
// configuration.parameters.<n>; seed the whole table from the payload before the
// first edit lands so the other rows are not dropped.
function seedCanvasParameterRows(target, fieldPath, payload) {
  const path = String(fieldPath || '');
  const isModelTable = path.startsWith('configuration.parameters.');
  const isSeriesTable = path.startsWith('presentation.parameters.');
  if (!isModelTable && !isSeriesTable) return false;
  if (!target || typeof target !== 'object') return false;
  const rows = Array.isArray(payload?.parameterRows) ? payload.parameterRows : [];
  if (!rows.length) return false;
  if (isModelTable) {
    target.configuration = target.configuration && typeof target.configuration === 'object' ? target.configuration : {};
    if (Array.isArray(target.configuration.parameters) && target.configuration.parameters.length) return false;
    target.configuration.parameters = rows.map((row) => ({
      field_name: String(row.field_name || ''),
      value: String(row.value == null ? '' : row.value),
      unit: String(row.unit || '')
    }));
    return true;
  }
  target.presentation = target.presentation && typeof target.presentation === 'object' ? target.presentation : {};
  if (Array.isArray(target.presentation.parameters) && target.presentation.parameters.length) return false;
  target.presentation.parameters = rows.map((row) => ({
    field_name: String(row.field_name || ''),
    value: String(row.value == null ? '' : row.value),
    unit: String(row.unit || '')
  }));
  return true;
}

function markDraftSaved() {
  savedDraftSnapshot.value = cloneVisualSnapshot(currentDraftState());
  savedDraftFingerprint.value = JSON.stringify(savedDraftSnapshot.value);
  if (activeTab.value === 'models' && modelDraft.value) {
    savedModelFingerprint.value = JSON.stringify(modelDraft.value);
  }
  resetVisualHistory();
  // Keep the cache in step with what the server now holds.
  stashProductDraft();
}

// Draft hydration (section/scenario text mirrors, detail defaults) runs after the
// first render, so a freshly loaded record looked "unsaved" and every card click
// asked to discard changes. Re-baseline once the hydration tick settles, unless
// the operator already edited something (history recorded).
let pendingHydrationBaseline = false;
function markDraftSavedAfterHydration() {
  markDraftSaved();
  pendingHydrationBaseline = true;
  nextTick(() => {
    if (!pendingHydrationBaseline) return;
    pendingHydrationBaseline = false;
    if (!hasUnsavedChanges.value) return;
    // The diff can only come from hydration here: a user edit needs a click, and
    // any recorded history clears the flag before this tick runs.
    markDraftSaved();
  });
}

function resetVisualHistory() {
  const history = createVisualHistory(currentDraftState());
  visualHistory.value = history.entries;
  visualHistoryIndex.value = history.index;
}

function recordVisualHistory() {
  // A recorded edit means the draft is genuinely dirty; the hydration baseline no
  // longer applies.
  pendingHydrationBaseline = false;
  const history = recordVisualSnapshot({ entries: visualHistory.value, index: visualHistoryIndex.value }, currentDraftState());
  visualHistory.value = history.entries;
  visualHistoryIndex.value = history.index;
}

function applyVisualState(snapshot) {
  if (!snapshot) return;
  suppressDraftHistory = true;
  if (activeTab.value === 'homepage_sections') homepageSectionDraft.value = snapshot;
  else if (activeTab.value === 'pages') pageDraft.value = snapshot;
  else if (activeTab.value === 'series') seriesDraft.value = snapshot;
  else if (activeTab.value === 'models') { modelDraft.value = snapshot.model; parameters.value = snapshot.parameters || []; newParameter.value = snapshot.newParameter || emptyParameter(); }
  else if (activeTab.value === 'company') companyDraft.value = snapshot;
  else if (activeTab.value === 'service') serviceDraft.value = snapshot;
  else if (activeTab.value === 'repair') repairDraft.value = snapshot;
  else if (activeTab.value === 'editorial') editorialDraft.value = snapshot;
  else if (activeTab.value === 'knowledge') knowledgeDraft.value = snapshot;
  else if (activeTab.value === 'settings') settingsDraft.value = snapshot;
  queueLivePreviewUpdate();
  nextTick(() => { suppressDraftHistory = false; });
}

function undoVisualChange() {
  const result = stepVisualHistory({ entries: visualHistory.value, index: visualHistoryIndex.value }, -1);
  if (!result) return;
  visualHistory.value = result.history.entries;
  visualHistoryIndex.value = result.history.index;
  applyVisualState(result.state);
}

function redoVisualChange() {
  const result = stepVisualHistory({ entries: visualHistory.value, index: visualHistoryIndex.value }, 1);
  if (!result) return;
  visualHistory.value = result.history.entries;
  visualHistoryIndex.value = result.history.index;
  applyVisualState(result.state);
}

function discardVisualChanges() {
  if (!confirmDiscardChanges('取消未保存修改')) return;
  const baseline = cloneVisualSnapshot(savedDraftSnapshot.value);
  if (baseline == null) return;
  applyVisualState(baseline);
  selectedVisualElement.value = null;
  message.value = '已取消未保存修改，并恢复到最近一次成功保存的草稿。';
  error.value = '';
  // Drop the cached draft of the active record too, otherwise switching back
  // would resurrect the changes that were just discarded.
  if (activeTab.value === 'series' && selectedSeriesId.value) dropCachedProductDraft('product_series', selectedSeriesId.value);
  if (activeTab.value === 'models' && selectedModelId.value) dropCachedProductDraft('product_models', selectedModelId.value);
  markDraftSaved();
  // The iframe owns its own reactive snapshot; push the restored baseline
  // immediately instead of requiring a manual reconnect.
  postLivePreviewUpdate();
}

async function retrySave() {
  const action = retrySaveAction.value;
  if (typeof action === 'function') await action();
}

function defaultSubmissionName() {
  const current = String(draftSubmissionName.value || '').trim();
  if (current) return current;
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${String(editorialDraft.value?.title || '未命名文章').trim()} ${stamp}`.slice(0, 160);
}

const toolbarSaveLabel = computed(() => {
  if (batchSaving.value) return '整页保存中...';
  if (selectedVisualRecord.value?.collection === 'articles') return '保存草稿';
  return unsavedDraftCount.value ? `保存草稿（${unsavedDraftCount.value} 项）` : '保存草稿';
});
const toolbarSaveTitle = computed(() => (selectedVisualRecord.value?.collection === 'articles'
  ? '保存当前文章草稿'
  : `保存本页所有未保存条目（共 ${unsavedDraftCount.value} 项）`));
// Toolbar button: the article flow needs the naming dialog, everything else saves
// the whole page (B3).
function handleToolbarSave() {
  if (activeTab.value === 'editorial' && editorialDraft.value?.id) { openSaveNameDialog(); return; }
  if (!hasUnsavedChanges.value && !unsavedDraftCount.value) { message.value = '当前页面没有未保存的修改。'; return; }
  openBatchSubmissionDialog();
}

function defaultBatchSubmissionName(firstLabel = '', count = 0) {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const suffix = firstLabel ? ` · ${firstLabel}${count > 1 ? ` 等${count}项` : ''}` : '';
  return `${siteAreaLabel.value || '官网内容'}${suffix} ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function openBatchSubmissionDialog() {
  if (saving.value || batchSaving.value) return;
  const labels = [
    ...(hasUnsavedChanges.value ? [currentDraftLabel()] : []),
    ...dirtyCachedDraftKeys().map((key) => cachedDraftReportLabel(key))
  ].filter(Boolean);
  batchMemberLabels.value = [...new Set(labels)];
  if (!batchMemberLabels.value.length) { message.value = '当前页面没有未保存的修改。'; return; }
  saveNameMode.value = 'batch';
  saveNameDraft.value = defaultBatchSubmissionName(batchMemberLabels.value[0], batchMemberLabels.value.length);
  saveNameError.value = '';
  saveNameDialogOpen.value = true;
}

function openSaveNameDialog() {
  if (saving.value) return;
  // 画布顶部的保存按钮不一定已经选中某个视觉元素；只要当前编辑的是
  // articles 草稿，就必须弹出命名对话框，不能因为 selectedVisualRecord 为空
  // 而退回直接保存（否则自定义名称永远不会写入 publication_log）。
  const isArticleDraft = selectedVisualRecord.value?.collection === 'articles'
    || (activeTab.value === 'editorial'
      && editorialMode.value === 'articles'
      && Boolean(editorialDraft.value?.id));
  if (!isArticleDraft) {
    void saveVisualDraft();
    return;
  }
  saveNameMode.value = 'article';
  saveNameDraft.value = defaultSubmissionName();
  saveNameError.value = '';
  saveNameDialogOpen.value = true;
}

function closeSaveNameDialog() {
  if (saving.value) return;
  saveNameDialogOpen.value = false;
  saveNameError.value = '';
}

async function confirmSaveNameDialog() {
  const name = String(saveNameDraft.value || '').trim();
  if (!name) { saveNameError.value = '请填写名称。'; return; }
  const mode = saveNameMode.value;
  saveNameDialogOpen.value = false;
  if (mode === 'batch') {
    await saveWholePage(name);
    return;
  }
  draftSubmissionName.value = name;
  await saveVisualDraft();
}

async function saveVisualDraft() {
  const targetRecord = selectedVisualRecord.value?.record || currentDraftRecord();
  if (targetRecord && !canEdit(targetRecord)) { error.value = saveBlockedMessage(targetRecord); return; }
  if (!confirmPublishedRevision(targetRecord)) return;
  const publishedRevision = isPublishedRecord(targetRecord);
  await saveVisualDraftRecord();
  if (!error.value && publishedRevision) {
    message.value = `${message.value}（已生成草稿修订，官网需重新审核发布后更新）`;
  }
}

async function saveVisualDraftRecord() {
  if (selectedVisualRecord.value?.collection === 'site_settings') {
    retrySaveAction.value = saveVisualDraft;
    await saveVisualSiteSettings();
    if (!error.value) retrySaveAction.value = null;
    return;
  }
  if (selectedVisualRecord.value?.collection === 'product_parameters') {
    retrySaveAction.value = saveVisualDraft;
    await saveParameter(selectedVisualRecord.value.record);
    if (!error.value) retrySaveAction.value = null;
    return;
  }
  const handlers = { pages: savePage, homepage_sections: saveHomepageSection, series: saveSeries, models: saveModel, company: saveCompanyRecord, service: saveServiceRecord, repair: saveRepairPage, editorial: saveEditorialRecord, knowledge: saveKnowledge, settings: saveSettings };
  const handler = handlers[selectedVisualRecord.value?.collection] || handlers[activeTab.value];
  if (typeof handler !== 'function') return;
  retrySaveAction.value = saveVisualDraft;
  await handler();
  if (!error.value) retrySaveAction.value = null;
}

function alignVisualElement(mode) {
  const normalizedMode = String(mode || '').trim();
  if (!['left', 'center', 'right'].includes(normalizedMode)) return;
  const record = websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const path = visualPresentationFieldPath(selectedVisualElement.value);
  if (!selectedVisualElement.value || !record || !target || !path || !canEdit(record)) return;
  if (!setVisualAlignment(target, path, normalizedMode)) return;
  recordVisualHistory();
  queueLivePreviewUpdate();
  if (!livePreviewFrame.value?.contentWindow || !livePreviewWebsiteOrigin.value) return;
  livePreviewFrame.value.contentWindow.postMessage({ type: 'ruijun:cms-preview:command', command: 'align', mode: normalizedMode, sectionKey: selectedVisualElement.value.sectionKey || activePageSectionKey.value, fieldPath: selectedVisualElement.value.fieldPath || 'layout.align_x' }, livePreviewWebsiteOrigin.value);
}

function commitVisualField(value) {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const path = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (!record || !target || !path || !canEdit(record)) return;
  const options = selectedVisualFieldOptions.value;
  const normalizedValue = options.length ? options.find((option) => option.value === value)?.value : value;
  if (normalizedValue == null || !setVisualFieldValue(target, path, normalizedValue)) {
    error.value = '请输入有效数值或符合字段格式的内容。';
    return;
  }
  if (error.value === '请输入有效数值或符合字段格式的内容。') error.value = '';
  recordVisualHistory();
  // A deep watcher can replace the debounced callback after a nested page
  // edit. Send the current controlled snapshot now; the queue remains the
  // fallback for frames that are still connecting.
  postLivePreviewUpdate(selectedVisualRecord.value);
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

function commitVisualLink(value) {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const path = String(selectedVisualElement.value?.linkFieldPath || '').trim();
  const normalized = String(value || '').trim();
  if (!record || !target || !path || !canEdit(record)) return;
  if (normalized && !isValidSiteLink(normalized)) {
    error.value = '按钮链接只能使用站内路径、页面锚点或 HTTPS 地址。';
    return;
  }
  if (!setVisualFieldValue(selectedVisualTarget.value, path, normalized)) return;
  if (error.value === '按钮链接只能使用站内路径、页面锚点或 HTTPS 地址。') error.value = '';
  recordVisualHistory();
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

function commitVisualPosition() {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const path = visualPresentationFieldPath(selectedVisualElement.value);
  if (!record || !target || !path || !canEdit(record)) return;
  setVisualPosition(target, path, visualPosition);
  recordVisualHistory();
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

function commitVisualTextStyle() {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const path = visualPresentationFieldPath(selectedVisualElement.value);
  if (!record || !target || !path || !canEdit(record)) return;
  if (!setVisualTextStyle(target, path, {
    fontSize: visualTextStyle.fontSize,
    fontWeight: visualTextStyle.fontWeight,
    lineHeight: visualTextStyle.lineHeight,
    textColor: visualTextStyle.textColor
  })) return;
  recordVisualHistory();
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

function moveSelectedVisualListItem(direction) {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const element = selectedVisualElement.value;
  const fieldPath = String(element?.fieldPath || '').trim();
  const reorder = getVisualListReorder(target, fieldPath);
  if (!record || !target || !element || !reorder || !canEdit(record)) return;
  const moved = moveVisualListItem(target, fieldPath, direction);
  if (!moved) return;
  selectedVisualElement.value = {
    ...element,
    fieldPath: moved.fieldPath,
    positionFieldPath: remapVisualListPath(element.positionFieldPath, moved.arrayPath, reorder.index, moved.index)
  };
  recordVisualHistory();
  postLivePreviewUpdate(selectedVisualRecord.value);
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

function duplicateSelectedVisualListItem() {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const element = selectedVisualElement.value;
  const fieldPath = String(element?.fieldPath || '').trim();
  const reorder = getVisualListReorder(target, fieldPath);
  if (!record || !target || !element || !reorder || !canEdit(record)) return;
  const duplicated = duplicateVisualListItem(target, fieldPath);
  if (!duplicated) return;
  selectedVisualElement.value = {
    ...element,
    fieldPath: duplicated.fieldPath,
    positionFieldPath: remapVisualListPath(element.positionFieldPath, duplicated.arrayPath, reorder.index, duplicated.index)
  };
  visualMediaSelection.value = isVisualMediaSelection(element) ? getVisualMediaAssetId(target, duplicated.fieldPath, { mediaSlot: element.mediaSlot }) : '';
  recordVisualHistory();
  postLivePreviewUpdate(selectedVisualRecord.value);
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

function addSelectedVisualListItem() {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const element = selectedVisualElement.value;
  const fieldPath = String(element?.fieldPath || '').trim();
  const reorder = getVisualListReorder(target, fieldPath);
  if (!record || !target || !element || !reorder || !canEdit(record)) return;
  const added = addVisualListItem(target, fieldPath);
  if (!added) return;
  selectedVisualElement.value = {
    ...element,
    fieldPath: added.fieldPath,
    positionFieldPath: remapVisualListPath(element.positionFieldPath, added.arrayPath, reorder.index, added.index)
  };
  visualMediaSelection.value = '';
  recordVisualHistory();
  postLivePreviewUpdate(selectedVisualRecord.value);
  queueLivePreviewUpdate(selectedVisualRecord.value);
  message.value = '已新增一项空白条目，填写后保存草稿即可。';
}

function removeSelectedVisualListItem() {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const element = selectedVisualElement.value;
  const fieldPath = String(element?.fieldPath || '').trim();
  const reorder = getVisualListReorder(target, fieldPath);
  if (!record || !target || !element || !reorder || !canEdit(record) || reorder.length <= 1) return;
  if (!window.confirm(`确认删除当前第 ${reorder.index + 1} 项吗？该操作会在保存草稿后生效。`)) return;
  const removed = removeVisualListItem(target, fieldPath);
  if (!removed) return;
  selectedVisualElement.value = {
    ...element,
    fieldPath: removed.fieldPath,
    positionFieldPath: remapVisualListPath(element.positionFieldPath, removed.arrayPath, reorder.index, removed.index)
  };
  visualMediaSelection.value = isVisualMediaSelection(element) ? getVisualMediaAssetId(target, removed.fieldPath, { mediaSlot: element.mediaSlot }) : '';
  recordVisualHistory();
  postLivePreviewUpdate(selectedVisualRecord.value);
  queueLivePreviewUpdate(selectedVisualRecord.value);
}

// 视频分享卡片本身就是一个视频素材，没有文章/页面字段可写。选择系统里的
// 另一条视频时，把卡片素材替换掉：保留原卡片的标题与展示设置，把新素材
// 纳入视频分享位置，并删除旧素材，避免官网出现两张卡。
async function replaceVideoShareCardMedia(oldMediaAssetId, newMediaAssetId) {
  const oldId = String(oldMediaAssetId || '').trim();
  const newId = String(newMediaAssetId || '').trim();
  if (!oldId || !newId || oldId === newId) return false;
  const all = [...mediaAssets.value, ...mediaCandidates.value];
  const oldAsset = all.find((asset) => String(asset.id) === oldId);
  const newAsset = all.find((asset) => String(asset.id) === newId);
  if (!oldAsset || !newAsset) {
    error.value = '找不到要替换的视频素材，请刷新后重试。';
    return false;
  }
  if (String(newAsset.media_type || '').toLowerCase() !== 'video') {
    error.value = '视频分享卡片只能替换为视频素材。';
    return false;
  }
  const newPlacement = String(newAsset.placement_key || '');
  if (newPlacement && newPlacement !== 'news.video_share.list') {
    error.value = '这个视频已经用于其他官网位置，不能直接改成视频分享。请先在媒体资产里上传一条视频分享专用视频。';
    return false;
  }
  const oldFileId = String(oldAsset.file_id || '');
  visualMediaSaving.value = true;
  error.value = '';
  message.value = '';
  try {
    // Keep the original card (and its title/settings) and swap its file to the
    // selected video. Deleting the selected source asset afterwards avoids a
    // second card while leaving its file available to the original card.
    await api.patch(`/items/media_assets/${encodeURIComponent(oldId)}`, {
      file_id: newAsset.file_id,
      original_file_name: newAsset.original_file_name,
      mime_type: newAsset.mime_type,
      byte_size: newAsset.byte_size,
      width: newAsset.width,
      height: newAsset.height,
      duration_seconds: newAsset.duration_seconds,
      aspect_ratio: newAsset.aspect_ratio,
      poster_asset_id: newAsset.poster_asset_id || oldAsset.poster_asset_id || null
    });
    try {
      await api.post('/media-poster/asset/delete', { media_asset_id: newId });
    } catch (reason) {
      error.value = apiError(reason, '新视频已用于当前卡片，但原素材记录仍被其他内容引用，未删除。');
    }
    const oldFileStillUsed = [...mediaAssets.value, ...mediaCandidates.value]
      .some((asset) => String(asset.file_id || '') === oldFileId && String(asset.id) !== oldId);
    if (oldFileId && oldFileId !== newAsset.file_id && !oldFileStillUsed) {
      try { await api.delete(`/files/${encodeURIComponent(oldFileId)}`); } catch { /* keep the new file usable even if old-file cleanup fails */ }
    }
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
    visualMediaSelection.value = oldId;
    message.value = '视频已替换，仍保留原卡片。';
    return true;
  } catch (reason) {
    error.value = apiError(reason, '替换视频失败，内容没有更新。');
    return false;
  } finally {
    visualMediaSaving.value = false;
  }
}

function replaceArticleBodyImage(oldMediaAssetId, newMediaAssetId) {
  const oldId = String(oldMediaAssetId || '').trim();
  const newId = String(newMediaAssetId || '').trim();
  const draft = editorialDraft.value;
  if (!draft?.body || !oldId || !newId || oldId === newId) return false;
  const all = [...mediaAssets.value, ...mediaCandidates.value];
  const newAsset = all.find((asset) => String(asset.id) === newId);
  if (!newAsset?.file_id || String(newAsset.media_type || '').toLowerCase() === 'video') {
    error.value = '正文图片只能替换为图片素材。';
    return false;
  }
  const container = document.createElement('div');
  container.innerHTML = String(draft.body);
  const image = [...container.querySelectorAll('img')]
    .find((node) => String(node.getAttribute('data-cms-preview-media-asset-id') || '') === oldId);
  if (!image) {
    error.value = '正文中找不到这张图片的受控记录；请重新导入 Word 文档。';
    return false;
  }
  const nextPath = `/api/public/v1/media/asset/${encodeURIComponent(String(newAsset.file_id))}`;
  image.setAttribute('src', nextPath);
  image.setAttribute('data-cms-preview-media-role', 'image');
  image.setAttribute('data-cms-preview-field-path', 'body');
  image.setAttribute('data-cms-preview-media-asset-id', newId);
  image.setAttribute('data-cms-preview-placement-key', 'news.article.body');
  if (!String(image.getAttribute('alt') || '').trim()) image.setAttribute('alt', String(newAsset.alt_text || newAsset.title || '正文图片'));
  draft.body = container.innerHTML;
  visualMediaSelection.value = newId;
  error.value = '';
  message.value = '正文图片已替换，保存草稿后官网生效。';
  queueLivePreviewUpdate(selectedVisualRecord.value);
  return true;
}

function replaceVisualMedia(selectedValue) {
  // 不能依赖 v-model 的更新时间：@change 可能先于 v-model 执行，读到旧值会让
  // “换了素材”实际仍写回原素材。由调用方显式传入本次选择的值。
  const assetId = String(selectedValue ?? visualMediaSelection.value ?? '').trim();
  let visualRecord = selectedVisualRecord.value;
  let record = visualRecord?.record || websitePreviewTarget.value?.record;
  const collection = visualRecord?.collection || websitePreviewTarget.value?.collection || '';
  let target = selectedVisualTarget.value;
  let path = String(selectedVisualElement.value?.fieldPath || '').trim();
  const videoShareCardAssetId = String(selectedVisualElement.value?.mediaAssetId || '').trim();
  // 动态新闻卡片封面走 cover_asset。画布选中的是列表缓存记录时，不能只改
  // 预览对象；必须同时写进当前 editorialDraft，否则保存草稿仍读旧值。
  if (collection === 'articles' && path === 'cover_asset') {
    if (!/^[1-9]\d*$/.test(assetId)) return;
    if (!editorialDraft.value?.id) { error.value = '请先在左侧打开这篇文章的草稿。'; return; }
    editorialDraft.value.cover_asset = assetId;
    if (target && typeof target === 'object') target.cover_asset = assetId;
    visualMediaSelection.value = assetId;
    error.value = '';
    message.value = '封面已选择，保存内容草稿后官网生效。';
    recordVisualHistory();
    queueLivePreviewUpdate({ collection: 'articles', record: editorialDraft.value });
    return;
  }
  // 文章正文内联图：替换的是 article.body 里的受控 <img>，不是页面媒体字段。
  if (selectedVisualIsArticleBodyImage.value) {
    if (!assetId) return;
    void replaceArticleBodyImage(videoShareCardAssetId, assetId);
    return;
  }
  // 视频分享卡片的 media 字段路径只是画布协议占位（让选中请求合法），真正写入
  // 的目标是 media_assets 记录；必须先于页面字段写入处理。
  if (videoShareCardAssetId) {
    if (!assetId) return;
    void replaceVideoShareCardMedia(videoShareCardAssetId, assetId);
    return;
  }
  // 页面区块的媒体可能来自独立媒体位（例如视频新闻首屏），画布上只有
  // 渲染节点而没有 fieldPath。此时把选择结果写入该区块的 media 引用，
  // 保存页面草稿后官网即可使用这条系统媒体。
  if (!path && collection === 'pages' && assetId) {
    const elementType = String(selectedVisualElement.value?.elementType || '').trim();
    const sectionKey = String(
      selectedVisualElement.value?.sectionKey
      || activePageSectionKey.value
      || (pageDraft.value?.slug === 'news' && elementType === 'video' ? 'hero' : '')
      || ''
    ).trim();
    const section = (Array.isArray(pageDraft.value?.sections) ? pageDraft.value.sections : [])
      .find((item) => String(item?.id || '') === sectionKey);
    const role = elementType === 'video' ? 'video' : elementType === 'image' ? 'image' : '';
    if (section && role) {
      const media = Array.isArray(section.media) ? section.media : [];
      const index = media.findIndex((item) => String(item?.role || '') === role);
      if (index >= 0) media[index] = { ...media[index], media_asset_id: assetId };
      else media.push({ media_asset_id: assetId, role });
      section.media = media;
      visualMediaSelection.value = assetId;
      error.value = '';
      message.value = '已选择系统媒体，保存页面草稿后官网生效。';
      recordVisualHistory();
      postLivePreviewUpdate(selectedVisualRecord.value);
      queueLivePreviewUpdate(selectedVisualRecord.value);
      return;
    }
  }
  // 旧视频文章只有 video_url；选中素材时改写成受管 media[0]，不要写回字符串 URL。
  const upgradingLegacyVideo = collection === 'articles' && path === 'video_url';
  if (upgradingLegacyVideo) path = 'media.0.media_asset_id';
  const mediaSlot = selectedVisualElement.value?.mediaSlot || '';
  const canRestoreDefault = canRestoreVisualMediaDefault(selectedVisualElement.value, collection, path);
  const isClearingGovernedSlot = !assetId && /^action-[1-8]$/.test(String(mediaSlot));
  if ((!assetId && !isClearingGovernedSlot && !canRestoreDefault) || !record || !target || !canEdit(record)) return;
  if (!path) {
    error.value = '这个视频没有可写入的页面媒体位置。视频分享卡片请从“视频新闻 → 视频分享内容”修改。';
    return;
  }
  // 画布选中的是列表里的文章时，必须先把它切成当前编辑草稿；否则改动落在
  // 列表缓存上，editorialDraft 没变，保存草稿按钮会一直是灰的。
  if (collection === 'articles' && (activeTab.value !== 'editorial' || String(editorialDraft.value?.id || '') !== String(record.id || ''))) {
    const activated = activateVisualEditingTarget({ collection, itemId: record.id, fieldPath: path, sectionKey: selectedVisualElement.value?.sectionKey || '' });
    if (!activated?.record || activeTab.value !== 'editorial') {
      error.value = '无法把该文章切换为当前草稿，请从左侧“文章/视频分享”列表重新选中后再试。';
      return;
    }
    // activate 返回的是列表记录；真正要改的是 selectEditorialRecord 建好的草稿。
    record = editorialDraft.value || activated.record;
    if (String(record.id || '') !== String(activated.record.id || '')) {
      error.value = '文章草稿没有正确载入，请刷新工作台后重试。';
      return;
    }
    target = record;
    visualRecord = { collection, record };
  } else if (collection === 'articles' && editorialDraft.value) {
    // 即使选了列表缓存记录，也强制写进当前草稿，保证保存按钮能感知修改。
    record = editorialDraft.value;
    target = editorialDraft.value;
    visualRecord = { collection, record };
  }
  const payload = {
    type: 'ruijun:cms-preview:media-replace',
    collection,
    itemId: String(record.id || ''),
    sectionKey: selectedVisualElement.value?.sectionKey || '',
    fieldPath: path,
    mediaRole: selectedVisualElement.value?.mediaRole || selectedVisualElement.value?.elementType || 'asset',
    mediaSlot,
    mediaAssetId: assetId,
    mediaUrl: previewMediaAsset(assetId)?.path || ''
  };
  const selectedAsset = visualMediaOptions.value.find((asset) => String(asset.id) === assetId);
  const posterUrl = selectedAsset?.poster_asset_id ? previewMediaAsset(selectedAsset.poster_asset_id)?.path : '';
  if (posterUrl) payload.posterUrl = posterUrl;
  if (isPreviewStagingMedia(selectedAsset)) payload.previewOnly = true;
  if (!applyVisualMediaReplacement(target, path, assetId, { mediaSlot, allowEmpty: canRestoreDefault })) { error.value = '无法写入该媒体位置，请刷新后重试；若持续出现请改用左侧表单。'; return; }
  if (upgradingLegacyVideo) target.video_url = '';
  recordVisualHistory();
  if (livePreviewFrame.value?.contentWindow && livePreviewWebsiteOrigin.value) livePreviewFrame.value.contentWindow.postMessage(payload, livePreviewWebsiteOrigin.value);
  visualMediaSelection.value = assetId;
  queueLivePreviewUpdate(visualRecord);
}

// 画布内上传：媒体已取消审核，上传即发布，随后直接替换当前选中元素。
async function uploadVisualMedia(event) {
  const input = event.target;
  const file = input?.files?.[0];
  const reset = () => { if (input) input.value = ''; };
  if (!file) return;
  const videoShareCardAssetId = String(selectedVisualElement.value?.mediaAssetId || '').trim();
  const isArticleBodyImage = selectedVisualIsArticleBodyImage.value;
  const isArticleCover = String(selectedVisualElement.value?.collection || '') === 'articles'
    && String(selectedVisualElement.value?.fieldPath || '') === 'cover_asset';
  const isVideoShareCard = Boolean(videoShareCardAssetId && !selectedVisualElement.value?.fieldPath);
  const options = isVideoShareCard
    ? { scope: 'article', placementKey: 'news.video_share.list', elementType: 'video', pageKey: 'news', sectionKey: 'video-sharing' }
    : isArticleBodyImage
      ? { scope: 'article', placementKey: 'news.article.body', elementType: 'image', pageKey: 'news', sectionKey: 'article' }
      : isArticleCover
        ? { scope: 'article', placementKey: 'news.dynamic_news.cover', elementType: 'image', pageKey: 'news', sectionKey: 'dynamic-news' }
        : visualMediaFilterOptions();
  const placementKey = String(options.placementKey || '').trim();
  const scope = String(options.scope || '').trim();
  const mediaType = mediaTypeForFile(file);
  if (!placementKey || !mediaType || (options.elementType && options.elementType !== mediaType)) {
    error.value = '当前画布位置没有匹配的受控展示位，无法直接上传；请先在「媒体资产」上传并选择展示位。';
    reset();
    return;
  }
  if (!scope) { error.value = '无法确定素材用途范围，请先在「媒体资产」上传。'; reset(); return; }
  visualUploading.value = true; error.value = ''; message.value = '';
  try {
    const metadata = await readMediaMetadata(file, mediaType).catch(() => ({}));
    const spec = mediaPlacementOptions.find((option) => option.key === placementKey);
    const extension = String(file.name || '').toLowerCase().split('.').pop();
    const uploadType = mediaType === 'video'
      ? (String(file.type || '').startsWith('video/') ? file.type : (extension === 'webm' ? 'video/webm' : 'video/mp4'))
      : file.type;
    const uploadFile = file.type === uploadType ? file : new Blob([file], { type: uploadType });
    const form = new FormData();
    form.append('title', file.name);
    form.append('file', uploadFile, file.name);
    const uploaded = (await api.post('/files', form)).data?.data;
    if (!uploaded?.id || !uploaded.filename_download || !uploaded.type) throw new Error('上传接口未返回完整的文件信息');
    const created = (await api.post('/items/media_assets', {
      file_id: String(uploaded.id),
      original_file_name: uploaded.filename_download,
      mime_type: uploaded.type,
      byte_size: Number(uploaded.filesize),
      usage_scope: scope,
      media_type: mediaType,
      width: Number(metadata.width) || Number(spec?.minWidth) || 1,
      height: Number(metadata.height) || Number(spec?.minHeight) || 1,
      duration_seconds: Number(metadata.duration_seconds) > 0 ? Math.ceil(Number(metadata.duration_seconds)) : null,
      aspect_ratio: metadata.aspect_ratio || spec?.aspectRatio || null,
      placement_key: placementKey,
      page_key: options.pageKey || null,
      section_key: options.sectionKey || null,
      sort_order: 0,
      enabled: true,
      autoplay: mediaType === 'video',
      muted: true,
      title: file.name.replace(/\.[^.]+$/, ''),
      copyright_status: 'owned',
      status: 'published',
      publication_state: 'published'
    })).data?.data;
    await Promise.all([loadMediaCandidates(), loadMediaAssets()]);
    if (created?.id) {
      visualMediaSelection.value = String(created.id);
      if (isArticleBodyImage) replaceArticleBodyImage(videoShareCardAssetId, String(created.id));
      else if (isArticleCover) replaceVisualMedia(String(created.id));
      else if (isVideoShareCard) await replaceVideoShareCardMedia(videoShareCardAssetId, String(created.id));
      else replaceVisualMedia();
    }
    if (!isArticleBodyImage) message.value = '素材已上传并发布，已替换当前画布内容。';
  } catch (reason) {
    error.value = apiError(reason, '上传素材失败，画布内容未修改。');
  } finally {
    visualUploading.value = false;
    reset();
  }
}

async function saveVisualMediaAttributes() {
  const asset = selectedVisualMediaAsset.value;
  if (!asset) return;
  visualMediaSaving.value = true; error.value = ''; message.value = '';
  try {
    const payload = {
      media_asset_id: String(asset.id),
      title: visualMediaDraft.value.title || null,
      alt_text: visualMediaDraft.value.alt_text || null,
      transcript: visualMediaDraft.value.transcript || null,
      copyright_status: visualMediaDraft.value.copyright_status || 'owned'
    };
    if (asset.media_type === 'video') payload.poster_asset_id = visualMediaDraft.value.poster_asset_id || null;
    await api.post('/media-poster/asset', payload);
    message.value = '素材信息已保存；已发布素材不会因此下线。';
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    // 卡片标题直接取媒体记录 title，刷新画布才能看到改名结果。
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '素材信息保存失败。');
  } finally {
    visualMediaSaving.value = false;
  }
}

async function deleteMediaAsset(asset) {
  const id = String(asset?.id || '').trim();
  if (!id) return;
  const label = asset.title || asset.original_file_name || `#${id}`;
  if (!window.confirm(`确定删除素材「${label}」吗？\n删除前会检查是否仍被内容引用；被引用时会被拒绝。`)) return;
  error.value = ''; message.value = '';
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: id });
    message.value = `素材「${label}」已删除。`;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  } catch (reason) {
    error.value = apiError(reason, '删除素材失败。');
  }
}

// 画布内移除：只解绑当前内容里的媒体引用，素材本身保留，随草稿一起保存。
function removeVisualMedia() {
  const record = selectedVisualRecord.value?.record;
  const target = selectedVisualTarget.value;
  const path = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (!record || !target || !path || !canEdit(record)) return;
  if (path === 'video_url') {
    target.video_url = '';
  } else if (!applyVisualMediaReplacement(target, path, '', { mediaSlot: selectedVisualElement.value?.mediaSlot || '', allowEmpty: true })) {
    error.value = '无法清除该媒体位置，请刷新后重试。';
    return;
  }
  visualMediaSelection.value = '';
  recordVisualHistory();
  queueLivePreviewUpdate(selectedVisualRecord.value);
  message.value = '已从当前内容移除媒体，记得保存草稿。';
}

// 画布内删除素材：先从当前内容解绑并保存，再尝试删除素材；仍被其他内容引用时保留素材。
async function deleteVisualMediaAsset() {
  const asset = selectedVisualMediaAsset.value;
  if (!asset) return;
  const label = asset.title || asset.original_file_name || `#${asset.id}`;
  if (!window.confirm(`从当前内容移除并删除素材「${label}」吗？\n若仍被其他内容引用，素材会保留。`)) return;
  removeVisualMedia();
  if (error.value) return;
  await saveVisualDraft();
  if (error.value) return;
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: String(asset.id) });
    message.value = `素材「${label}」已从当前内容移除并删除。`;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  } catch (reason) {
    error.value = apiError(reason, '素材仍被其他内容引用，已从当前内容移除，但素材未删除。');
  }
}

function setVisualDevice(device) {
  if (!['desktop', 'tablet', 'mobile'].includes(device)) return;
  visualDevice.value = device;
  if (device !== 'desktop') {
    // Mobile and tablet previews are verification surfaces only. Keep all
    // editing gestures confined to the desktop canvas and clear stale
    // selection state when leaving it.
    visualEditMode.value = false;
    clearVisualSelection();
  }
  if (device === 'desktop') visualZoom.value = 0.62;
  if (device === 'tablet') visualZoom.value = 0.72;
  if (device === 'mobile') visualZoom.value = 0.9;
  postLivePreviewUpdate();
}

function handleVisualViewportResize() {
  visualViewportWidth.value = window.innerWidth;
  if (!visualCanvasEditable.value) {
    visualEditMode.value = false;
    clearVisualSelection();
  }
  postLivePreviewUpdate();
}

function confirmDiscardChanges(action) {
  if (!hasUnsavedChanges.value) return true;
  return window.confirm(`当前内容有未保存的修改。确定要${action}吗？未保存内容将丢失。`);
}

function clearVisualSelection() {
  selectedVisualElement.value = null;
  visualMediaSelection.value = '';
}

function visualRecordLabel(collection, record) {
  if (collection === 'homepage_sections') return record.title || record.section_key || '首页独立区块';
  if (collection === 'pages') return pageDisplayName(record);
  if (collection === 'product_series') return record.name || record.series_code || '未命名产品系列';
  if (collection === 'product_models') return record.name || record.model_code || '未命名型号';
  if (collection === 'milestones') return `${record.year || '未填写'} 年 - ${record.event || '未填写事件'}`;
  if (collection === 'qualifications') return record.name || record.source_key || '未命名资质';
  if (collection === 'manufacturing_evidence') return record.process || record.source_key || '未命名制造证据';
  if (collection === 'service_locations') return [record.region, record.city].filter(Boolean).join(' - ') || '未命名服务网点';
  if (collection === 'service_resources') return record.title || record.source_key || '未命名服务资源';
  if (collection === 'external_service_entries') return record.entry_type || record.url || '未命名服务入口';
  if (collection === 'repair_page_configs') return record.title || record.page_key || '未命名售后页面';
  if (collection === 'knowledge_items') return record.question_title || record.source_key || '未命名知识条目';
  return record.title || record.name || record.slug || record.source_key || '未命名内容';
}

function visualSelectionSource(element) {
  const collection = String(element?.collection || '').trim() || '页面';
  const itemId = String(element?.itemId || '').trim();
  const fieldPath = String(element?.fieldPath || '').trim();
  const sectionKey = String(element?.sectionKey || '').trim();
  const source = itemId ? `${collection}/${itemId}` : collection;
  if (collection === 'pages' && sectionKey && fieldPath) return `${source} · sections[${sectionKey}].${fieldPath}`;
  return fieldPath ? `${source} · ${fieldPath}` : `${source} · 区块位置`;
}

function handleVisualPreviewRecordChange(event) {
  const switched = switchVisualPreviewRecord(event.target.value);
  if (!switched) event.target.value = String(websitePreviewTarget.value?.record?.id || '');
}

function switchVisualPreviewRecord(itemId) {
  const target = websitePreviewTarget.value;
  const collection = String(target?.collection || '').trim();
  const nextId = String(itemId || '').trim();
  if (!collection || !nextId || String(target?.record?.id || '') === nextId) return false;
  if (!visualRecordChoices.value.some((choice) => choice.id === nextId)) return false;
  if (!confirmDiscardChanges('切换预览条目')) return false;
  clearVisualSelection();
  const activated = activateVisualEditingTarget({ collection, itemId: nextId, sectionKey: websitePreviewContext.value.sectionKey }, { discardConfirmed: true });
  if (!activated?.record) return false;
  // Switching the left draft alone left the canvas on the previous record's page,
  // so nothing on screen was editable (the new record does not exist there).
  // Re-open the canvas for the new record: same page simply refreshes, another
  // page navigates to its route.
  if (liveWebsitePreviewVisible.value) {
    message.value = '已切换条目，正在重新加载画布…';
    void startLiveWebsitePreview({ targetOverride: { collection: activated.collection, record: activated.record } });
  }
  return true;
}

function selectTab(tab) {
  if (tab === activeTab.value) return;
  // Series and models keep their drafts in the per-record cache, so moving
  // between their two forms cannot discard edits. Prompting here produced a
  // false "有未保存修改" dialog right after selecting a series (the model form had
  // just been hydrated) and blocked the switch.
  const productTabs = new Set(['series', 'models']);
  const keepsDraft = productTabs.has(String(tab)) && productTabs.has(String(activeTab.value));
  if (!keepsDraft && !confirmDiscardChanges('切换内容类型')) return;
  // 专注画布会把除实时预览外的所有区块隐藏；切换到表单/内容区时必须退出，
  // 否则新打开的工作区不可见，看起来像“卡死”。
  visualCanvasFocus.value = false;
  activeTab.value = tab;
  if (advancedTabs.has(tab)) showAdvanced.value = true;
  markDraftSaved();
}

async function selectSiteArea(area) {
  if (!Object.hasOwn(siteAreaLabels, area)) return;
  if (area === siteArea.value && activeTab.value === 'pages' && String(pageDraft.value?.slug || '') === String(area)) return;
  if (!confirmDiscardChanges('切换官网栏目')) return;
  visualCanvasFocus.value = false;
  // 每个官网栏目都对应一条 pages 记录（home/product/manufacturing/news/about/service）。
  // 之前只有首页会自动选中页面并打开实时预览，其他栏目停在“模块总览”，
  // 没有预览目标，画布不渲染却仍显示“关闭实时预览”，看起来像预览坏了。
  const page = pages.value.find((record) => String(record.slug || '') === String(area));
  siteArea.value = area;
  if (!page) {
    // 页面记录缺失时保留模块总览；没有预览目标，预览开关保持关闭并禁用。
    activeTab.value = 'home';
    selectedPageId.value = '';
    pageDraft.value = null;
    activePageSectionKey.value = '';
    clearVisualSelection();
    if (liveWebsitePreviewVisible.value) {
      livePreviewRequestSequence += 1;
      liveWebsitePreviewVisible.value = false;
    }
    markDraftSaved();
    return;
  }
  activeTab.value = 'pages';
  clearVisualSelection();
  selectPage(page.id, true);
  activePageSectionKey.value = '';
  markDraftSaved();
  await nextTick();
  if (!liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
}

function openSiteAreaPage() {
  selectSiteArea(siteArea.value);
}

function isSiteAreaEntryActive(entry) {
  if (entry.action === 'series') return activeTab.value === 'series' || activeTab.value === 'models';
  if (entry.action === 'models') return activeTab.value === 'models';
  if (entry.action === 'manufacturing') return activeTab.value === 'company' && companyMode.value === 'manufacturing_evidence';
  if (entry.action === 'articles') return activeTab.value === 'editorial' && editorialMode.value === 'articles' && editorialCategory.value !== 'video';
  if (entry.action === 'videos') return activeTab.value === 'editorial' && editorialMode.value === 'articles' && editorialCategory.value === 'video';
  if (entry.action === 'milestones') return activeTab.value === 'company' && companyMode.value === 'milestones';
  if (entry.action === 'qualifications') return activeTab.value === 'company' && companyMode.value === 'qualifications';
  if (entry.action === 'repair') return activeTab.value === 'repair';
  if (entry.action === 'resources') return activeTab.value === 'service' && serviceMode.value === 'service_resources';
  if (entry.action === 'locations') return activeTab.value === 'service' && serviceMode.value === 'service_locations';
  return activeTab.value === 'pages' && pageDraft.value?.slug === siteArea.value && activePageSectionKey.value === entry.sectionKey;
}

async function openSiteAreaEntry(entry) {
  // Series and models keep their drafts per record, so moving between the two
  // product forms cannot lose work. The global dirty fingerprint spans tabs, so
  // it could report a false "未保存" right after a model was hydrated and block
  // the switch.
  const productSections = new Set(['series', 'models']);
  const keepsDraft = productSections.has(String(entry.action)) && productSections.has(String(activeTab.value));
  if (!keepsDraft && !confirmDiscardChanges('切换官网内容模块')) return;
  clearVisualSelection();
  markDraftSaved();
  if (entry.action === 'series') {
    selectTab('series');
    return;
  }
  if (entry.action === 'models') {
    selectTab('models');
    return;
  }
  if (entry.action === 'manufacturing') {
    selectTab('company');
    selectCompanyMode('manufacturing_evidence');
    return;
  }
  if (entry.action === 'articles' || entry.action === 'videos') {
    selectTab('editorial');
    editorialCategory.value = entry.action === 'videos' ? 'video' : 'news';
    selectEditorialMode('articles');
    if (entry.action === 'videos') {
      // The media-first video-share workspace loads its own cards. Do not leave
      // an unrelated article draft selected behind the canvas.
      selectedEditorialId.value = '';
      editorialDraft.value = null;
      draftSubmissionName.value = '';
      markDraftSaved();
      return;
    }
    const record = editorialRecords('articles').find((item) => item.category === 'news');
    if (record) selectEditorialRecord(record.id, true);
    return;
  }
  if (entry.action === 'milestones' || entry.action === 'qualifications') {
    activePageSectionKey.value = entry.sectionKey || '';
    selectTab('company');
    selectCompanyMode(entry.action);
    return;
  }
  if (entry.action === 'repair') {
    selectTab('repair');
    return;
  }
  if (entry.action === 'resources') {
    selectTab('service');
    selectServiceMode('service_resources');
    return;
  }
  if (entry.action === 'locations') {
    selectTab('service');
    selectServiceMode('service_locations');
    return;
  }
  let page = pages.value.find((record) => record.slug === siteArea.value);
  if (!page) {
    await loadPages();
    page = pages.value.find((record) => record.slug === siteArea.value);
  }
  if (!page) {
    error.value = `未找到“${siteAreaLabel.value}”对应的页面草稿，请重新加载后再试。`;
    return;
  }
  activeTab.value = 'pages';
  selectPage(page.id, true);
  activePageSectionKey.value = entry.sectionKey || '';
  nextTick(() => {
    const target = document.querySelector(`[data-section-key="${CSS.escape(entry.sectionKey || '')}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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

function previewSafeRecord(collection, record) {
  const fields = livePreviewFields[collection] || [];
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(record || {}, field)).map((field) => [field, clone(record[field])]));
}

function previewMediaAsset(assetId) {
  // The selected page can already reference an internal-preview draft before
  // the filtered computed list has re-evaluated after asynchronous loading.
  const stagingAsset = mediaCandidates.value.find((item) => String(item.id) === String(assetId) && isPreviewStagingMedia(item));
  const asset = previewableMediaAssets.value.find((item) => String(item.id) === String(assetId)) || stagingAsset;
  if (!asset?.file_id) return null;
  const poster = asset.poster_asset_id ? previewableMediaAssets.value.find((item) => String(item.id) === String(asset.poster_asset_id)) : null;
  const mimeType = String(asset.mime_type || '').toLowerCase();
  return {
    // The Nuxt preview session authorizes the asset ID. Do not expose a Directus
    // file URL in an internal draft preview, even when the active editor can read it.
    path: `/api/preview/media/${encodeURIComponent(String(asset.id))}`,
    media_asset_id: String(asset.id),
    alt: String(asset.alt_text || asset.original_file_name || ''),
    mediaType: asset.media_type || (mimeType.startsWith('video/') ? 'video' : 'image'),
    ...(poster?.file_id ? { posterPath: `/api/preview/media/${encodeURIComponent(String(poster.id))}` } : {})
  };
}

function buildLivePreviewRecord(target = websitePreviewTarget.value) {
  if (!target) return null;
  const collection = target.collection;
  const record = clone(target.record) || {};
  if (collection === 'product_series') {
    record.scenarios = fromTextList(record.scenariosText);
    record.capabilities = fromTextList(record.capabilitiesText);
    const coverAssetId = String(record.cover_asset || '').trim();
    if (/^[1-9]\d*$/.test(coverAssetId)) record.cover_media_asset_id = coverAssetId;
    // The card renders `cover_asset` directly. The public reader resolves the
    // stored asset id to a public URL, so the canvas must resolve it to the
    // authorized preview URL or a freshly bound cover shows as a broken image.
    const cover = previewMediaAsset(coverAssetId);
    if (cover) record.cover_asset = cover.path;
    // Series-level detail is persisted inside `presentation`. Send the unsaved
    // draft the same way so the canvas shows edits before they are saved, and
    // resolve feature images to the authorized preview URL.
    // Keep blank rows in the canvas payload: the "＋" button adds one and the
    // editor has to see it before filling the title.
    const detail = normalizeSeriesDetail(record.detail, { keepEmpty: true });
    const presentation = { ...(record.presentation || {}) };
    if (detail) {
      // The canvas edits `detail.*` (the workbench draft field); the persisted
      // shape lives at presentation.detail and the page reads it from there.
      record.detail = detail;
      presentation.detail = {
        ...(detail.intro ? { intro: { ...detail.intro } } : {}),
        features: (detail.features || []).map((feature) => {
          const media = feature.media_asset_id ? previewMediaAsset(feature.media_asset_id) : null;
          return media ? { ...feature, image: media.path } : { ...feature };
        })
      };
    } else {
      record.detail = null;
      delete presentation.detail;
    }
    record.presentation = presentation;
  } else if (collection === 'product_models') {
    Object.assign(record, productModelLivePreviewRecord(record, parameters.value));
    record.media = normalizeMediaReferences(record.mediaReferences || record.media || []).flatMap((reference) => {
      const media = previewMediaAsset(reference.media_asset_id);
      return media ? [{ ...reference, ...media }] : [reference];
    });
    const configuration = clone(record.configuration || {});
    configuration.features = parseArray(configuration.features).map((item) => {
      // Keep the canvas in step with a just-picked feature image: the stored
      // value is a media asset id, while the page renders `image`.
      const media = item?.media_asset_id ? previewMediaAsset(item.media_asset_id) : null;
      return media ? { ...item, image: media.path } : { ...item };
    });
    configuration.drawings = parseArray(configuration.drawings).map((drawing) => {
      const drawingMedia = previewMediaAsset(drawing?.media_asset_id);
      return drawingMedia ? { ...drawing, ...drawingMedia } : drawing;
    });
    const technicalImage = previewMediaAsset(configuration.labels?.technical_image_asset_id)?.path;
    if (technicalImage) configuration.labels = { ...configuration.labels, technicalImage };
    record.configuration = configuration;
  } else if (collection === 'articles') {
    record.body_media = parseArray(record.body_media).map((reference) => ({ ...reference, ...(previewMediaAsset(reference?.media_asset_id) || {}) }));
    // Article media references may point at a private draft video or image.
    // Resolve them to the signed preview proxy before the snapshot is sent to
    // Nuxt; retaining the asset id keeps the preview authorizer's allow-list
    // intact while path/mediaType make the article detail renderer usable.
    record.media = normalizeMediaReferences(record.mediaReferences || record.media || []).flatMap((reference) => {
      const media = previewMediaAsset(reference.media_asset_id);
      return media ? [{ ...reference, ...media }] : [reference];
    });
    const cover = previewMediaAsset(record.cover_asset);
    if (cover) {
      record.cover_asset = cover.path;
      record.cover_media_asset_id = cover.media_asset_id;
    }
  } else if (collection === 'qualifications') {
    record.assets = qualificationDraftAssets(record.mediaReferences || record.assets || []).flatMap((reference) => {
      const media = previewMediaAsset(reference.media_asset_id);
      return media ? [{ ...reference, ...media, managed: true }] : [reference];
    });
  } else if (collection === 'milestones') {
    record.media = clone(record.mediaReferences || record.media || []);
  } else if (collection === 'manufacturing_evidence') {
    record.media = clone(record.mediaReferences || record.media || []);
  } else if (collection === 'service_resources') {
    record.applicable_models = fromTextList(record.applicableModelsText);
    const asset = previewMediaAsset(record.asset?.media_asset_id || record.asset);
    const coverAsset = previewMediaAsset(record.cover_asset?.media_asset_id || record.cover_asset);
    if (asset) {
      record.asset_media_asset_id = asset.media_asset_id;
      record.asset = asset.path;
    }
    if (coverAsset) {
      record.cover_media_asset_id = coverAsset.media_asset_id;
      record.cover_asset = coverAsset.path;
    }
  } else if (collection === 'repair_page_configs') {
    record.model_cards = parseArray(record.model_cards_text ?? record.model_cards);
    record.action_cards = parseArray(record.action_cards_text ?? record.action_cards);
    record.process_steps = parseArray(record.process_steps_text ?? record.process_steps);
    record.notices = parseArray(record.notices_text ?? record.notices);
    record.faq_refs = parseArray(record.faq_refs_text ?? record.faq_refs);
    record.seo = parseObject(record.seo_text ?? record.seo);
  } else if (collection === 'knowledge_items') {
    record.applicable_models = fromTextList(record.applicableModelsText);
    record.error_codes = fromTextList(record.errorCodesText);
    record.troubleshooting_steps = record.troubleshootingStepsText ? [{ type: record.troubleshootingStepType || 'manual_step', content: record.troubleshootingStepsText }] : [];
    record.safety_preconditions = fromTextList(record.safetyPreconditionsText).map((content) => ({ content }));
    record.media = clone(record.mediaReferences || record.media || []);
  } else if (collection === 'site_settings') {
    record.languages = fromTextList(record.languagesText);
    const logo = previewMediaAsset(record.brand?.logo_asset)?.path;
    const footerLogo = previewMediaAsset(record.brand?.footer_logo_asset)?.path;
    record.brand = { ...record.brand, ...(logo ? { logo_path: logo } : {}), ...(footerLogo ? { footer_logo_path: footerLogo } : {}) };
    record.footer = { ...record.footer };
    for (const [assetField, pathField] of [['address_icon_asset', 'address_icon_path'], ['phone_icon_asset', 'phone_icon_path'], ['email_icon_asset', 'email_icon_path']]) {
      const path = previewMediaAsset(record.footer?.[assetField])?.path;
      if (path) record.footer[pathField] = path;
    }
  }
  if (collection === 'pages' && record.slug === 'home' && Array.isArray(record.sections)) {
    const hero = record.sections.find((section) => String(section?.id || '') === 'hero');
    const heroVideo = previewMediaAsset(hero?.hero_video_asset_id);
    if (hero && heroVideo?.path) hero.hero_video_asset_url = heroVideo.path;
  }
  return previewSafeRecord(collection, materializeVisualMediaRecord(record, previewMediaAsset));
}

function fallbackWebsitePreviewOpenUrl() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:4175/api/preview/open`;
}

function submitPreviewToken(openUrl, token, targetName = 'ruijun-website-draft-preview', context = {}) {
  const form = document.createElement('form');
  const field = document.createElement('input');
  form.method = 'post';
  form.action = openUrl;
  form.target = targetName;
  form.style.display = 'none';
  field.name = 'token';
  field.value = token;
  form.append(field);
  if (context.sectionKey) {
    const sectionField = document.createElement('input');
    sectionField.type = 'hidden';
    sectionField.name = 'sectionKey';
    sectionField.value = String(context.sectionKey);
    form.append(sectionField);
  }
  document.body.append(form);
  form.submit();
  // Let the browser commit the cross-document POST before removing the
  // submitting form. Removing it synchronously can cancel the iframe
  // navigation on slower Chromium/Directus responses and leave a blank
  // canvas even though the preview token was issued successfully.
  window.setTimeout(() => form.remove(), 0);
}

function previewWebsiteOrigin(openUrl) {
  try { return new URL(openUrl, window.location.href).origin; } catch { return ''; }
}

let liveCoverUpdateSequence = 0;
async function postLivePreviewUpdate(forcedTarget = null) {
  const sequence = ++liveCoverUpdateSequence;
  const pageTarget = websitePreviewTarget.value;
  const selected = forcedTarget || selectedVisualRecord.value;
  // Viewport changes and iframe reconnects are asynchronous. Derive the
  // capability at the protocol boundary so non-desktop canvases can never
  // receive a stale editable state.
  const previewEditMode = visualCanvasEditable.value && visualEditMode.value;
  // A canvas selection can target a related record such as a product
  // parameter while the surrounding page remains rooted in its model.
  // Send that exact record so the preview can overlay its authorized related
  // item instead of re-sending the unchanged model snapshot.
  const target = selected && (String(selected.collection) !== String(pageTarget?.collection || '') || selected.record !== pageTarget?.record) ? selected : pageTarget;
  const preview = buildLivePreviewRecord(target);
  if (!livePreviewFrameReady.value || !target || !preview || !livePreviewWebsiteOrigin.value || !livePreviewFrame.value?.contentWindow) return;
  livePreviewStatus.value = 'syncing';
  const mediaGrants = [];
  const grantIds = livePreviewGrantIds(target.collection, preview);
  // Published content can never be granted a preview media token, so asking is a
  // guaranteed failure that used to spam the panel. Skip it and let the canvas
  // render the published assets it already has.
  const targetPublished = String(target.record?.publication_state || '') === 'published' || String(target.record?.status || '') === 'published';
  if (grantIds.length && !targetPublished) {
    try {
      for (const assetId of grantIds) {
        const issued = await api.post('/content-preview-tokens/media/issue', { contentCollection: target.collection, contentItemId: String(target.record.id), assetId });
        mediaGrants.push(issued.data.data.token);
      }
    } catch (reason) {
      // A published record can never obtain a media grant. That is expected and
      // must not abort the update: dropping the message left the canvas stuck on
      // "连接失败", with editMode never delivered — the hero video then finished
      // playing and unmounted, so the operator saw a canvas that ignored edits.
      error.value = mediaGrantError(reason, target);
    }
    if (sequence !== liveCoverUpdateSequence || !livePreviewFrameReady.value || !livePreviewFrame.value?.contentWindow) return;
  }
  livePreviewFrame.value.contentWindow.postMessage({
    type: 'ruijun:cms-preview:update',
    collection: target.collection,
    itemId: String(target.record.id),
    preview,
    mediaGrants,
    sectionKey: websitePreviewContext.value.sectionKey || '',
    editMode: previewEditMode,
    tool: visualTool.value,
    device: visualDevice.value
  }, livePreviewWebsiteOrigin.value);
  window.setTimeout(() => {
    if (livePreviewStatus.value === 'syncing') livePreviewStatus.value = 'connected';
  }, 120);
}

function toggleVisualEditMode() {
  if (!visualCanvasEditable.value) return;
  visualEditMode.value = !visualEditMode.value;
  postLivePreviewUpdate();
}

function queueLivePreviewUpdate(target = null) {
  const explicitTarget = target?.collection && target?.record ? target : null;
  if (explicitTarget) pendingLivePreviewTarget = explicitTarget;
  window.clearTimeout(livePreviewDebounceTimer);
  if (!liveWebsitePreviewVisible.value) {
    pendingLivePreviewTarget = null;
    return;
  }
  livePreviewDebounceTimer = window.setTimeout(() => {
    const updateTarget = pendingLivePreviewTarget || explicitTarget;
    pendingLivePreviewTarget = null;
    postLivePreviewUpdate(updateTarget);
  }, 80);
}

async function startLiveWebsitePreview({ automatic = false, targetOverride = null, preserveRoot = false } = {}) {
  const target = targetOverride || (automatic && livePreviewRootTarget ? livePreviewRootTarget : websitePreviewTarget.value);
  if (!target?.record?.id || (!editableStatuses.has(target.record.status) && target.record.publication_state !== 'published')) return;
  if (!automatic) livePreviewAutoRenewedForFrame = false;
  const targetSnapshot = { collection: String(target.collection), record: clone(target.record) };
  const contextSnapshot = target.context || websitePreviewContextFor(targetSnapshot);
  if (!preserveRoot) {
    livePreviewRootTarget = { ...targetSnapshot, context: clone(contextSnapshot) };
    livePreviewRootSlug.value = targetSnapshot.collection === 'pages' ? String(targetSnapshot.record?.slug || '') : '';
  }
  const requestSequence = ++livePreviewRequestSequence;
  liveWebsitePreviewVisible.value = true;
  // 每次手动打开画布都刷新一次已发布素材：媒体上传即发布，管理员在别处上传后
  // 画布的下拉应立即能看到，而不是等整页刷新。
  if (!automatic) void loadMediaAssets().catch(() => {});
  // Canvas clicks should select bound elements as soon as the visual preview opens.
  visualEditMode.value = visualCanvasEditable.value;
  livePreviewFrameReady.value = false;
  livePreviewStatus.value = 'opening';
  livePreviewError.value = '';
  await nextTick();
  try {
    const response = await api.post('/content-preview-tokens/issue', { contentCollection: targetSnapshot.collection, contentItemId: targetSnapshot.record.id, ttlSeconds: 900 });
    if (requestSequence !== livePreviewRequestSequence) return;
    const data = response.data?.data;
    if (!data?.token) throw new Error('预览令牌签发失败');
    const openUrl = data.preview_open_url || fallbackWebsitePreviewOpenUrl();
    livePreviewWebsiteOrigin.value = previewWebsiteOrigin(openUrl);
    if (!livePreviewWebsiteOrigin.value) throw new Error('官网预览地址无效');
    submitPreviewToken(openUrl, data.token, 'ruijun-live-website-preview', contextSnapshot);
    return true;
  } catch (reason) {
    if (requestSequence !== livePreviewRequestSequence) return;
    livePreviewStatus.value = 'error';
    livePreviewError.value = apiError(reason, '无法连接官网实时预览，请确认官网与内容后台服务正在运行。');
    return false;
  }
}

// A preview token contains a media allow-list. Re-issue it after any
// successful content save so newly attached draft assets remain available in
// the already-open canvas without a manual reconnect.
async function renewLivePreviewAfterSuccessfulSave() {
  if (!liveWebsitePreviewVisible.value || !websitePreviewTarget.value?.record?.id) return false;
  const currentTarget = websitePreviewTarget.value;
  if (livePreviewRootTarget
    && (String(livePreviewRootTarget.collection) !== String(currentTarget.collection)
      || String(livePreviewRootTarget.record?.id) !== String(currentTarget.record?.id))) {
    return startLiveWebsitePreview({ targetOverride: livePreviewRootTarget, preserveRoot: true });
  }
  return startLiveWebsitePreview();
}

function markParameterDirty(parameter) {
  const id = String(parameter?.id || '').trim();
  if (!id) return;
  if (!dirtyParameterIds.value.includes(id)) dirtyParameterIds.value = [...dirtyParameterIds.value, id];
}

function clearParameterDirty(id) {
  const key = String(id || '');
  dirtyParameterIds.value = dirtyParameterIds.value.filter((value) => value !== key);
}

function parameterPayload(parameter) {
  return {
    field_name: parameter.field_name,
    value: parameter.value,
    unit: parameter.unit || null,
    presentation: parameter.presentation || null,
    test_conditions: parameter.test_conditions || null,
    sort_order: Number(parameter.sort_order) || 0
  };
}

// The public product reader and the approval gate use the model's top-level
// `parameters` object; the workbench table edits product_parameters rows. Keep
// the standard fields in sync on save so a newly created model is not blocked by
// "结构化参数" even though its spec table is filled.
const structuredParameterKeys = Object.freeze({
  'XY 行程': 'xyTravelMm',
  'Z 轴行程': 'zAxisTravelMm',
  '最大工件尺寸': 'maxWorkpieceMm',
  '最大工件重量': 'maxWorkpieceWeightKg',
  '最大锥度': 'maxTaperDegrees',
  '最大切割厚度': 'maxCuttingHeightMm',
  '机床外形尺寸': 'machineDimensionsMm',
  '机床重量': 'machineWeightKg'
});

function structuredModelParameters() {
  const existing = parseObject(modelDraft.value?.parameters) || {};
  const merged = { ...existing };
  for (const row of parameters.value) {
    if (String(row.model_code || '') !== String(modelDraft.value?.model_code || '')) continue;
    const label = String(row.field_name || '').replace(/\s+/g, ' ').trim();
    const key = structuredParameterKeys[label];
    if (key && String(row.value || '').trim()) merged[key] = String(row.value).trim();
  }
  return Object.keys(merged).length ? merged : null;
}

function upsertParameter(record) {
  if (!record?.id) return;
  const row = { ...record, sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0 };
  const index = parameters.value.findIndex((item) => String(item.id) === String(row.id));
  if (index >= 0) parameters.value[index] = { ...parameters.value[index], ...row };
  else parameters.value = [...parameters.value, row].sort((left, right) => (Number(left.sort_order) || 0) - (Number(right.sort_order) || 0));
}

// Parameter rows are separate records, so a model save must flush the rows the
// operator edited as well. Only dirty rows are written; an audit entry per
// untouched row would be noise.
async function persistDirtyParameters() {
  const modelCode = String(modelDraft.value?.model_code || '');
  const rows = parameters.value.filter((parameter) => (
    dirtyParameterIds.value.includes(String(parameter.id))
    && (!modelCode || String(parameter.model_code || '') === modelCode)
  ));
  const failed = [];
  let saved = 0;
  for (const row of rows) {
    try {
      await api.patch(`/items/product_parameters/${encodeURIComponent(row.id)}`, parameterPayload(row));
      clearParameterDirty(row.id);
      saved += 1;
    } catch {
      failed.push(row);
    }
  }
  return { saved, failed };
}

// Reloading lists and renewing the preview are follow-up steps. A failure here
// must not turn a successful PATCH into "保存失败，内容没有更新".
async function refreshAfterSave(loaders = []) {
  for (const load of loaders) {
    try {
      await load();
    } catch {
      message.value = `${message.value}（列表刷新失败，请重新加载页面查看）`;
    }
  }
  try {
    await renewLivePreviewAfterSuccessfulSave();
  } catch { /* preview refresh only */ }
}

async function renewLiveWebsitePreview() {
  if (!liveWebsitePreviewVisible.value || livePreviewAutoRenewedForFrame) return;
  livePreviewAutoRenewedForFrame = true;
  livePreviewAutoRenewInFlight = true;
  livePreviewStatus.value = 'opening';
  livePreviewError.value = '实时预览授权已到期，正在自动恢复。未保存修改仍保留。';
  const renewed = await startLiveWebsitePreview({ automatic: true });
  if (!renewed) livePreviewAutoRenewInFlight = false;
}

async function reconnectLiveWebsitePreview() {
  livePreviewAutoRenewedForFrame = false;
  if (livePreviewRootTarget) {
    return startLiveWebsitePreview({ targetOverride: livePreviewRootTarget, preserveRoot: true });
  }
  return startLiveWebsitePreview();
}

function toggleLiveWebsitePreview() {
  if (liveWebsitePreviewVisible.value) {
    livePreviewRequestSequence += 1;
    clearVisualSelection();
    liveWebsitePreviewVisible.value = false;
    return;
  }
  startLiveWebsitePreview();
}

function handleLivePreviewFrameLoad() {
  if (livePreviewStatus.value === 'idle') livePreviewStatus.value = 'opening';
  flushPendingFocusField();
}

// A canvas click can land in a block the workbench is not editing right now
// (the session targets another record, so that block rendered without edit
// markers). Offering the switch here keeps the click meaningful instead of
// leaving the operator with a canvas that silently ignores it.
let pendingFocusField = null;
async function offerBlockedSectionSwitch(payload) {
  const sectionKey = String(payload?.sectionKey || '').trim();
  if (!sectionKey) return;
  const page = pages.value.find((record) => String(record.slug || '') === String(siteArea.value || ''))
    || pages.value.find((record) => String(record.id) === String(pageDraft.value?.id || ''));
  if (!page) {
    error.value = '未找到当前页面的草稿，请重新加载后再试。';
    return;
  }
  const section = (page.sections || pageDraft.value?.sections || []).find((item) => String(item?.id || '') === sectionKey);
  const label = String(section?.title || section?.kicker || sectionKey);
  if (!window.confirm(`这段内容属于「${label}」区块，当前画布没有它的编辑权。\n\n是否切换到该区块继续编辑？`)) return;
  if (!confirmDiscardChanges('切换画布编辑区块')) return;
  activeTab.value = 'pages';
  selectPage(page.id, true);
  activePageSectionKey.value = sectionKey;
  clearVisualSelection();
  await nextTick();
  const opened = await startLiveWebsitePreview();
  if (!opened) return;
  pendingFocusField = { sectionKey, fieldPath: String(payload?.fieldPath || '') };
  flushPendingFocusField();
}

async function revealSectionMediaEditor(sectionKey) {
  const key = String(sectionKey || '').trim();
  if (!key) return;
  await nextTick();
  const card = document.querySelector(`.editor-page [data-section-key="${CSS.escape(key)}"]`);
  const editor = card?.querySelector('.media-reference-editor');
  if (!editor) return;
  editor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  editor.querySelector('select')?.focus({ preventScroll: true });
}

function flushPendingFocusField(attempt = 0) {
  if (!pendingFocusField) return;
  const frame = livePreviewFrame.value;
  if (!frame?.contentWindow || !livePreviewWebsiteOrigin.value) return;
  frame.contentWindow.postMessage({ type: 'ruijun:cms-preview:focus-field', ...pendingFocusField }, livePreviewWebsiteOrigin.value);
  // The iframe may still be hydrating when the first attempt lands, so retry a
  // few times and give up quietly rather than leaving a stuck pending target.
  if (attempt >= 3) { pendingFocusField = null; return; }
  window.setTimeout(() => flushPendingFocusField(attempt + 1), 900);
}

async function openHomepageSection(record) {
  // Keep whatever draft the current tab holds instead of demanding a discard.
  stashProductDraft();
  clearVisualSelection();
  const cached = productDraftCache.get(productDraftKey('homepage_sections', record?.id));
  homepageSectionDraft.value = cached ? clone(cached.section) : clone(record);
  activeTab.value = 'homepage_sections';
  activePageSectionKey.value = record.section_key;
  if (cached) {
    savedDraftFingerprint.value = cached.savedFingerprint;
    resetVisualHistory();
  } else {
    markDraftSavedAfterHydration();
  }
  await nextTick();
  if (!liveWebsitePreviewVisible.value) startLiveWebsitePreview();
}

function activateVisualEditingTarget(selection, { discardConfirmed = false } = {}) {
  const collection = String(selection?.collection || '').trim();
  const itemId = String(selection?.itemId || '').trim();
  const state = {
    pages: pages.value,
    homepageSections: homepageSections.value,
    series: series.value,
    models: models.value,
    parameters: parameters.value,
    editorial: editorial.value,
    company: company.value,
    service: service.value,
    knowledge: { knowledge_items: knowledgeItems.value },
    repairPages: repairPages.value,
    settings: settingsDraft.value
  };
  const resolved = resolveVisualEditingRecord(state, { collection, itemId, fieldPath: selection?.fieldPath });
  if (!resolved) return null;
  const currentTarget = websitePreviewTarget.value;
  // These collections keep their drafts in the cache, so switching cannot lose
  // anything; asking to discard made a plain card click look destructive.
  const keepsDraftOnSwitch = new Set(['pages', 'homepage_sections', 'product_series', 'product_models']);
  if (!discardConfirmed
    && !keepsDraftOnSwitch.has(collection)
    && requiresVisualDraftSwitchConfirmation({
      hasUnsavedChanges: hasUnsavedChanges.value,
      currentTarget,
      nextTarget: { collection, itemId: resolved.record.id }
    }) && !confirmDiscardChanges('切换画布编辑内容')) return null;
  if (collection === 'pages') syncSiteAreaForPage(resolved.record);
  preserveLivePreviewSessionOnce = Boolean(
    collection !== 'pages'
    && liveWebsitePreviewVisible.value
    && currentTarget
    && (String(currentTarget.collection) !== collection || String(currentTarget.record?.id) !== itemId)
  );
  const resolvedItemId = resolved.record.id;
  if (collection === 'homepage_sections') {
    if (activeTab.value !== 'homepage_sections' || String(homepageSectionDraft.value?.id) !== String(resolvedItemId)) {
      homepageSectionDraft.value = clone(resolved.record);
      activeTab.value = 'homepage_sections';
      markDraftSaved();
    }
    return { collection, record: homepageSectionDraft.value };
  }
  // postMessage turns numeric Directus IDs into strings. Re-selecting the
  // current model must retain its draft and mounted live-preview iframe.
  if (collection === 'product_models' && activeTab.value === 'models' && String(selectedModelId.value) === String(resolvedItemId) && modelDraft.value) {
    return resolved;
  }
  // A page canvas contains many editable fields. Re-selecting another field
  // on the same page must retain its unsaved draft rather than rebuild it from
  // the last Directus response.
  if (collection === 'pages' && activeTab.value === 'pages' && String(selectedPageId.value) === String(resolvedItemId) && pageDraft.value) {
    activePageSectionKey.value = String(selection.sectionKey || activePageSectionKey.value || '');
    return resolved;
  }
  if (collection === 'pages') {
    activeTab.value = 'pages';
    selectPage(resolvedItemId, true);
    activePageSectionKey.value = String(selection.sectionKey || activePageSectionKey.value || '');
  } else if (collection === 'product_series') {
    activeTab.value = 'series';
    selectSeries(resolvedItemId, true, false);
  } else if (collection === 'product_models') {
    activeTab.value = 'models';
    selectModel(resolvedItemId, true);
  } else if (collection === 'articles' || collection === 'case_studies') {
    const keepDraft = shouldKeepVisualDraft({
      collection: editorialMode.value,
      itemId: selectedEditorialId.value,
      draft: editorialDraft.value
    }, { collection, itemId: resolvedItemId });
    if (!keepDraft) {
      activeTab.value = 'editorial';
      selectEditorialMode(collection, true);
      selectEditorialRecord(resolvedItemId, true);
    }
  } else if (['milestones', 'qualifications', 'manufacturing_evidence'].includes(collection)) {
    activeTab.value = 'company';
    selectCompanyMode(collection, true);
    selectCompanyRecord(resolvedItemId, true);
  } else if (['service_resources', 'service_locations', 'external_service_entries'].includes(collection)) {
    activeTab.value = 'service';
    selectServiceMode(collection, true);
    selectServiceRecord(resolvedItemId, true);
  } else if (collection === 'knowledge_items') {
    activeTab.value = 'knowledge';
    selectKnowledge(resolvedItemId, true);
  } else if (collection === 'repair_page_configs') {
    activeTab.value = 'repair';
    selectRepairPage(resolvedItemId, true);
  } else if (collection === 'site_settings') {
    activeTab.value = 'settings';
  }
  return resolved;
}

function handleLivePreviewMessage(event) {
  if (event.origin !== livePreviewWebsiteOrigin.value || event.source !== livePreviewFrame.value?.contentWindow) return;
  if (event.data?.type === 'ruijun:cms-preview:list-add') {
    void applyCanvasListAction('add', event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:list-remove') {
    void applyCanvasListAction('remove', event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:request-series-models') {
    void pushSeriesCanvasModels(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:select-model-target') {
    void focusCanvasModel(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:series-select') {
    void focusCanvasSeries(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:series-add') {
    openSeriesCreateDialog();
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:series-remove') {
    void removeCanvasSeries(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:model-add') {
    void addCanvasModel(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:model-remove') {
    void removeCanvasModel(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:parameter-add') {
    void addCanvasParameter(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:parameter-remove') {
    void removeCanvasParameter(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:create-article') {
    void createArticleFromCanvas(event.data.category);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:delete-article') {
    void deleteArticleFromCanvas(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:delete-media') {
    void deleteCandidateMedia(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:request-update') {
    // The frame missed our first update; answer with the current snapshot.
    livePreviewFrameReady.value = Boolean(livePreviewFrame.value?.contentWindow);
    livePreviewStatus.value = 'connected';
    queueLivePreviewUpdate();
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:session-missing') {
    // The frame is no longer a draft preview (idle expiry or a navigation that
    // dropped ?cmsPreview=1). Re-issue a token instead of leaving an inert page
    // that looks like the canvas until the operator clicks something.
    if (!liveWebsitePreviewVisible.value || livePreviewAutoRenewInFlight) return;
    const now = Date.now();
    if (now - lastPreviewSessionRecoveryAt < 30000) return;
    lastPreviewSessionRecoveryAt = now;
    livePreviewStatus.value = 'opening';
    livePreviewError.value = '预览会话已失效（超过 15 分钟未操作，或页面被导航到普通地址），正在自动恢复。未保存修改仍保留。';
    void reconnectLiveWebsitePreview();
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:expired') {
    if (livePreviewAutoRenewInFlight) return;
    if (livePreviewAutoRenewedForFrame) {
      livePreviewStatus.value = 'error';
      livePreviewError.value = '实时预览自动恢复失败，请点击重新连接实时预览。未保存修改仍保留。';
      return;
    }
    livePreviewStatus.value = 'opening';
    livePreviewError.value = '实时预览授权已到期，正在自动恢复。未保存修改仍保留。';
    void renewLiveWebsitePreview();
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:readonly' && event.data?.blockedSection === true) {
    void offerBlockedSectionSwitch(event.data);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:readonly') {
    const resolved = activateVisualEditingTarget(event.data);
    if (!resolved) return;
    selectedVisualElement.value = {
      label: String(event.data.label || '静态媒体'),
      elementType: String(event.data.elementType || 'image'),
      fieldPath: '',
      positionFieldPath: '',
      sectionKey: String(event.data.sectionKey || ''),
      collection: String(event.data.collection || ''),
      itemId: String(event.data.itemId || ''),
      mediaRole: String(event.data.mediaRole || ''),
      mediaAssetId: String(event.data.mediaAssetId || ''),
      mediaSlot: String(event.data.mediaSlot || ''),
      placementKey: '',
      allowDefaultMedia: event.data.allowDefaultMedia === true,
      readonly: true,
      readonlyReason: String(event.data.readonlyReason || '请先在媒体资产中导入并发布后再替换。'),
      rect: event.data.rect || null
    };
    visualMediaSelection.value = '';
    // An unbound media slot can only be filled from the block's 图片与背景 list,
    // so bring that editor into view instead of leaving the operator to hunt for
    // it after the canvas says "尚未绑定".
    void revealSectionMediaEditor(event.data?.sectionKey);
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:edit-request' || event.data?.type === 'ruijun:cms-preview:edit-commit') {
    const resolved = activateVisualEditingTarget(event.data);
    if (!resolved) return;
    // A product detail that only exists as the website original is selectable now;
    // seed the original into the draft before the edit lands, otherwise one typed
    // field would replace the whole fallback configuration.
    if (String(resolved.collection || '') === 'product_models' || String(resolved.collection || '') === 'product_series') {
      const record = resolved.record;
      const needsSeed = String(resolved.collection) === 'product_models'
        ? !(Array.isArray(record?.configuration?.features) && record.configuration.features.length)
        : !(Array.isArray(record?.detail?.features) && record.detail.features.length);
      if (needsSeed) seedCanvasListDetail(String(resolved.collection), record);
    }
    selectedVisualElement.value = {
      label: String(event.data.label || event.data.fieldPath || event.data.field || '画布元素'),
      elementType: String(event.data.elementType || 'element'),
      fieldPath: String(event.data.fieldPath || event.data.field || ''),
      linkFieldPath: String(event.data.linkFieldPath || ''),
      positionFieldPath: String(event.data.positionFieldPath || event.data.fieldPath || event.data.field || ''),
      sectionKey: String(event.data.sectionKey || ''),
      collection: String(event.data.collection || ''),
      itemId: String(event.data.itemId || ''),
      mediaRole: String(event.data.mediaRole || ''),
      mediaAssetId: String(event.data.mediaAssetId || ''),
      mediaSlot: String(event.data.mediaSlot || ''),
      placementKey: String(event.data.placementKey || event.data.mediaPlacementKey || ''),
      allowDefaultMedia: event.data.allowDefaultMedia === true,
      rect: event.data.rect || null
    };
    visualPosition.x = Number(event.data.position?.x || 0);
    visualPosition.y = Number(event.data.position?.y || 0);
    visualTextStyle.fontSize = Number(event.data.textStyle?.fontSize || 16);
    visualTextStyle.fontWeight = String(event.data.textStyle?.fontWeight || '400');
    visualTextStyle.lineHeight = Number(event.data.textStyle?.lineHeight || 1.4);
    visualTextStyle.textColor = /^#[0-9a-f]{6}$/i.test(String(event.data.textStyle?.textColor || ''))
      ? String(event.data.textStyle.textColor).toUpperCase()
      : '#000000';
    const sectionKey = String(event.data.sectionKey || '').trim();
    const fieldPath = String(event.data.fieldPath || event.data.field || '').trim();
    const target = websitePreviewTarget.value;
    const selectedRecord = selectedVisualRecord.value;
    const record = selectedRecord?.record || target?.record;
    const sameTarget = record && String(event.data.collection || '') === String(selectedRecord?.collection || target?.collection || '') && String(event.data.itemId || '') === String(record.id || '');
    if (!sameTarget) return;
    const fieldTarget = resolveVisualFieldTarget(record, { collection: selectedRecord?.collection || target?.collection, sectionKey });
    if (!fieldTarget) return;
    // 视频分享卡片由 media_assets 记录自身驱动，没有页面字段路径可解析；
    // 选中消息里的 mediaAssetId 才是当前素材，直接用它打开素材属性面板。
    visualMediaSelection.value = isVisualMediaSelection(event.data)
      ? (String(event.data.mediaAssetId || '').trim()
        || getVisualMediaAssetId(fieldTarget, fieldPath, { mediaSlot: String(event.data.mediaSlot || '') }))
      : '';
    const presentationPath = visualPresentationFieldPath({
      collection: String(event.data.collection || ''),
      fieldPath,
      positionFieldPath: String(event.data.positionFieldPath || '')
    });
    const initialPosition = readVisualPosition(fieldTarget, presentationPath);
    if (!event.data.offsetDelta && !event.data.position) {
      visualPosition.x = initialPosition.x;
      visualPosition.y = initialPosition.y;
    }
    activePageSectionKey.value = sectionKey;
    if (event.data.type === 'ruijun:cms-preview:edit-commit' && fieldPath) {
      seedCanvasParameterRows(fieldTarget, fieldPath, event.data);
      if (setVisualFieldValue(fieldTarget, fieldPath, event.data.value)) recordVisualHistory();
    }
    const delta = event.data.offsetDelta;
    const positionPath = presentationPath;
    let shouldScroll = false;
    if (delta && typeof delta === 'object' && positionPath) {
      const position = applyVisualPositionDelta(fieldTarget, positionPath, delta);
      if (!position) return;
      visualPosition.x = position.x;
      visualPosition.y = position.y;
      recordVisualHistory();
      shouldScroll = true;
    }
    nextTick(() => {
      const card = document.querySelector(`[data-section-key="${CSS.escape(sectionKey)}"]`);
      if (shouldScroll && activePageSectionKey.value !== sectionKey) {
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const control = fieldPath ? card?.querySelector(`[data-preview-field="${CSS.escape(fieldPath)}"]`) : null;
      if (control instanceof HTMLElement) control.focus();
    });
    queueLivePreviewUpdate();
    return;
  }
  if (event.data?.type !== 'ruijun:cms-preview:ready') return;
  livePreviewFrameReady.value = true;
  livePreviewStatus.value = 'connected';
  livePreviewAutoRenewedForFrame = false;
  livePreviewAutoRenewInFlight = false;
  livePreviewError.value = '';
  postLivePreviewUpdate();
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
    submitPreviewToken(data.preview_open_url || fallbackWebsitePreviewOpenUrl(), data.token, 'ruijun-website-draft-preview', websitePreviewContext.value);
    message.value = '已在新窗口打开官网草稿预览；该窗口是只读的，不会公开发布。要在画面上选中和修改，请关闭它并使用「打开实时预览」。';
  } catch (reason) {
    previewWindow.close();
    error.value = apiError(reason, '无法打开官网预览，请确认草稿已保存且预览服务正在运行。');
  } finally { websitePreviewOpening.value = false; }
}

function handlePreviewKeydown(event) {
  if (event.key === 'Escape' && previewOpen.value) closePreview();
}

// Chrome scrolls the nearest scroll container to keep the caret of a focused
// input visible. In this workbench that container also holds the header, guide
// and the whole form, so typing in any editor field made the page drift down
// ~32px per keystroke. Record the position before the browser reacts and put it
// back for a short window; a genuine wheel/touch scroll cancels the guard.
let editorUserScrollUntil = 0;
let editorPointerTop = null;
let editorPointerAt = 0;
function markEditorUserScroll() {
  editorUserScrollUntil = Date.now() + 400;
  editorPointerTop = null;
}
function captureEditorPointer(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const scope = target.closest('.editor-form') || target.closest('.record-list-panel');
  const container = scope?.closest('.scrolling-container');
  if (!(container instanceof HTMLElement)) return;
  editorPointerTop = container.scrollTop;
  editorPointerAt = Date.now();
  for (const delay of [0, 50, 150, 300]) {
    window.setTimeout(() => {
      if (editorPointerTop == null || Date.now() - editorPointerAt > 800) return;
      const delta = container.scrollTop - editorPointerTop;
      if (delta > 0 && delta <= 160) container.scrollTop = editorPointerTop;
    }, delay);
  }
}
function guardEditorInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
  if (!target.closest('.editor-form')) return;
  guardScrollAround(target);
}

function guardEditorFocus(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  // Selecting a record or focusing a form control also makes Chrome reveal the
  // element. Restrict the guard to the editor form and record lists so an
  // intentional section-navigation click can still scroll the page.
  if (!target.closest('.editor-form') && !target.closest('.record-list-panel')) return;
  guardScrollAround(target);
}

function guardScrollAround(target) {
  const container = target.closest('.editor-form')?.closest('.scrolling-container')
    || target.closest('.record-list-panel')?.closest('.scrolling-container');
  if (!(container instanceof HTMLElement)) return;
  const top = container.scrollTop;
  const until = editorUserScrollUntil;
  for (const delay of [0, 30, 80, 160, 300]) {
    window.setTimeout(() => {
      if (Date.now() < until || !target.isConnected) return;
      const delta = container.scrollTop - top;
      // Only undo the small caret/focus-driven jump, never a deliberate long scroll.
      if (delta > 0 && delta <= 160) container.scrollTop = top;
    }, delay);
  }
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
}

function fromTextList(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function normalizePage(record) {
  const seo = parseObject(record.seo);
  const sections = normalizeSections(record.sections);
  if (record.slug === 'about') sections.forEach(hydrateFactoryMediaSlots);
  if (record.slug === 'home') sections.forEach(hydrateHomeReasonFields);
  if (record.slug === 'product') {
    sections.forEach(hydrateProductProofFields);
    sections.forEach(hydrateProductDimensionsFields);
  }
  if (record.slug === 'service') sections.forEach(hydrateServiceOfficeFields);
  if (record.slug === 'service') sections.forEach(hydrateServiceSupportFields);
  if (record.slug === 'service') sections.forEach(hydrateServiceActionMediaFields);
  const normalized = { ...clone(record), sections, seo: { ...seo, title: typeof seo.title === 'string' ? seo.title : '', description: typeof seo.description === 'string' ? seo.description : '', keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : String(seo.keywords || '') } };

  // Pages only persist their CMS content through `sections`. Keep the video
  // reference on the hero section so canvas replacement survives a save/reload.
  if (record.slug === 'home') {
    const hero = sections.find((section) => String(section?.id || '') === 'hero');
    if (hero) hero.hero_video_asset_id = String(hero.hero_video_asset_id || '');
  }
  return normalized;
}

function normalizeCompany(record) {
  const mediaField = companyMode.value === 'qualifications' ? record.assets : record.media;
  if (companyMode.value === 'qualifications') {
    const assets = qualificationDraftAssets(clone(mediaField));
    return { ...clone(record), assets, mediaReferences: assets, sort_order: Number(record.sort_order) || 0 };
  }
  return { ...clone(record), icon_asset: String(record.icon_asset || ''), sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0, mediaReferences: normalizeMediaReferences(mediaField) };
}

function companyMediaScope() {
  if (companyMode.value === 'milestones') return 'brand';
  return companyMode.value === 'qualifications' ? 'qualification' : 'manufacturing';
}

function mediaReferenceLabel(reference, scope) {
  const asset = [...reviewedMediaAssets(scope), ...mediaCandidates.value].find((candidate) => String(candidate.id) === String(reference.media_asset_id));
  if (!asset) return `当前引用 ${reference.media_asset_id}（尚未通过此选择器验证）`;
  return isPreviewStagingMedia(asset, { scope }) ? `${mediaAssetLabel(asset)}（草稿素材，仅当前内部预览）` : mediaAssetLabel(asset);
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



// Keep the upload form's page/section context aligned with the identifiers
// used by the Nuxt preview contract.  Placement keys are not safe to split on
// dots: e.g. news.video_share.list maps to section video-sharing.


function applyMediaPlacementContext(placementKey, force = false) {
  const context = mediaPlacementContexts[String(placementKey || '').trim()];
  if (!context) return;
  if (force || !mediaDraft.value.page_key) mediaDraft.value.page_key = context.pageKey || '';
  if (force || !mediaDraft.value.section_key) mediaDraft.value.section_key = context.sectionKey || '';
  const placement = mediaPlacementOptions.find((option) => option.key === placementKey);
  if (placement?.autoplay) mediaDraft.value.autoplay = true;
  if (placement?.muted) mediaDraft.value.muted = true;
}

// 使用范围 → 页面 slug。取值必须用服务端的词表：视频新闻是 `article`、关于瑞钧是 `brand`，
// 与 content-preview/page-preview-media-policy.mjs 的 pageScopes 保持一致。
// 曾经这里写成 `news` / `about`，导致这两个页面选择时上传必然 400。
const mediaScopePageKeys = Object.freeze({ homepage: 'home', product: 'product', manufacturing: 'manufacturing', article: 'news', brand: 'about', service: 'service' });
const compatibleMediaPlacements = computed(() => mediaPlacementOptions.filter((option) => {
  const context = mediaPlacementContexts[option.key];
  return (!mediaDraft.value.media_type || option.mediaType === mediaDraft.value.media_type)
    && (!context || context.pageKey === mediaScopePageKeys[mediaDraft.value.usage_scope]);
}));
const selectedMediaPlacement = computed(() => mediaPlacementOptions.find((option) => option.key === mediaDraft.value.placement_key));
function syncMediaScopeContext() {
  const pageKey = mediaScopePageKeys[mediaDraft.value.usage_scope] || '';
  const current = mediaPlacementContexts[mediaDraft.value.placement_key];
  if (current?.pageKey !== pageKey) {
    mediaDraft.value.placement_key = compatibleMediaPlacements.value[0]?.key || '';
  }
  applyMediaPlacementContext(mediaDraft.value.placement_key, true);
}
const selectedMediaPlacementHelp = computed(() => {
  const spec = selectedMediaPlacement.value;
  if (!spec) return '选择文件后再选择对应的官网展示位置。';
  const requirements = [];
  // 尺寸只是建议，不再拦截：运营手里常常只有一种素材，卡尺寸等于没法上线。
  if (spec.minWidth && spec.minHeight) requirements.push(`建议 ${spec.minWidth} x ${spec.minHeight} px 以上（不达标也能上传，只是显示可能偏模糊）`);
  if (spec.aspectRatio) requirements.push(`建议比例 ${spec.aspectRatio}`);
  requirements.push(`最大 ${readableFileSize(spec.maxBytes)}`);
  if (spec.maxDurationSeconds) requirements.push(`建议时长不超过 ${spec.maxDurationSeconds} 秒`);
  if (spec.posterRecommended) requirements.push('建议补充封面图片（未设置时官网先显示视频首帧）');
  if (spec.transcriptRequired) requirements.push('必须填写字幕或文字稿');

  // 已经量出实际尺寸时，直接对比给出结论，省得运营自己算。
  const measured = [];
  if (Number.isInteger(mediaDraft.value.width) && mediaDraft.value.width > 0
    && Number.isInteger(mediaDraft.value.height) && mediaDraft.value.height > 0) {
    measured.push(`当前素材 ${mediaDraft.value.width} x ${mediaDraft.value.height} px`);
  }
  return `${spec.label}：${requirements.join('；')}。${measured.length ? measured.join('；') + '。' : ''}`;
});
const mediaMetadataLabel = computed(() => {
  if (mediaDraft.value.media_type === 'document') return 'PDF 文档';
  if (!mediaDraft.value.width || !mediaDraft.value.height) return '正在读取尺寸';
  const duration = mediaDraft.value.media_type === 'video' ? ` · ${mediaDraft.value.duration_seconds} 秒` : '';
  return `${mediaDraft.value.width} x ${mediaDraft.value.height} px · ${mediaDraft.value.aspect_ratio}${duration}`;
});
const publishedImageAssets = computed(() => mediaAssets.value.filter((asset) => asset.media_type === 'image' || String(asset.mime_type || '').startsWith('image/')));
const videoPosterOptions = computed(() => videoPosterAssets({
  placementKey: mediaDraft.value.placement_key,
  usageScope: mediaDraft.value.usage_scope,
  publishedAssets: publishedImageAssets.value,
  candidates: mediaCandidates.value
}));
// 已登记素材的封面补录：走只改封面的端点，避免已发布视频被退回草稿。
const mediaPosterSelections = ref({});
const mediaPosterSavingId = ref('');
const mediaPosterOptions = (asset) => mediaPosterOptionsFor(asset, { publishedAssets: publishedImageAssets.value, candidates: mediaCandidates.value });
const mediaPosterHint = (asset) => mediaPosterHintFor(asset, mediaCandidates.value);
async function saveMediaPoster(asset) {
  const id = String(asset?.id || '');
  if (!id) return;
  const posterId = String(mediaPosterSelections.value[id] || '').trim();
  if (posterId && posterId === id) { error.value = '封面不能指向视频素材本身。'; return; }
  mediaPosterSavingId.value = id;
  error.value = ''; message.value = '';
  try {
    await api.post('/media-poster', { media_asset_id: id, poster_asset_id: posterId || null });
    message.value = posterId ? '封面已保存。封面发布后会替换视频首帧显示。' : '已清除封面，官网将显示视频首帧。';
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  } catch (reason) {
    error.value = apiError(reason, '封面保存失败，视频内容没有变化。');
  } finally {
    mediaPosterSavingId.value = '';
  }
}
function eligibleEditorialMediaAssets(category) {
  return editorialMediaAssets({
    category,
    publishedAssets: reviewedMediaAssets('article'),
    candidates: mediaCandidates.value
  });
}

function eligibleEditorialCoverAssets(category) {
  if (category === 'video') return reviewedMediaAssets('article').filter((asset) => (
    asset.media_type === 'image' || String(asset.mime_type || '').startsWith('image/')
  ));
  return eligibleEditorialMediaAssets('news');
}

function editorialMediaAssetLabel(asset) {
  return isPreviewStagingMedia(asset) ? `${mediaAssetLabel(asset)}（草稿素材，仅当前内部预览）` : mediaAssetLabel(asset);
}

function isEditorialCoverAssetAllowed(assetId, category) {
  return eligibleEditorialCoverAssets(category).some((asset) => String(asset.id) === String(assetId));
}

function readableFileSize(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '未知大小';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function usageScopeLabel(scope) {
  return { homepage: '网站主页', product: '产品展示', manufacturing: '先进制造', article: '视频新闻', brand: '关于瑞钧', service: '服务支持' }[scope] || scope || '未分类';
}

function videoPosterAssetLabel(asset) {
  const internalDraft = asset?.status !== 'published' || asset?.publication_state !== 'published';
  return `${mediaAssetLabel(asset)}${internalDraft ? '（仅内部预览草稿）' : ''}`;
}

async function readMediaMetadata(file, mediaType) {
  if (mediaType === 'document') return { width: 0, height: 0, duration_seconds: 0, aspect_ratio: '' };
  const url = URL.createObjectURL(file);
  try {
    if (mediaType === 'image') {
      const image = new Image();
      const dimensions = await new Promise((resolve, reject) => { image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error('无法读取图片尺寸')); image.src = url; });
      const divisor = greatestCommonDivisor(dimensions.width, dimensions.height);
      return { ...dimensions, duration_seconds: 0, aspect_ratio: `${dimensions.width / divisor}:${dimensions.height / divisor}` };
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    const metadata = await new Promise((resolve, reject) => { video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration_seconds: Math.ceil(video.duration) }); video.onerror = () => reject(new Error('browser-video-metadata-unavailable')); video.src = url; });
    const divisor = greatestCommonDivisor(metadata.width, metadata.height);
    return { ...metadata, aspect_ratio: `${metadata.width / divisor}:${metadata.height / divisor}` };
  } finally { URL.revokeObjectURL(url); }
}

async function selectMediaFile(event) {
  const file = event?.target?.files?.[0] || null;
  mediaDraft.value.file = file;
  mediaDraft.value.media_type = mediaTypeForFile(file);
  mediaDraft.value.width = 0; mediaDraft.value.height = 0; mediaDraft.value.duration_seconds = 0; mediaDraft.value.aspect_ratio = '';
  if (!file || !mediaDraft.value.media_type) return;
  try {
    Object.assign(mediaDraft.value, await readMediaMetadata(file, mediaDraft.value.media_type));
    const options = compatibleMediaPlacements.value;
    if (!options.some((option) => option.key === mediaDraft.value.placement_key)) mediaDraft.value.placement_key = options[0]?.key || '';
    const placement = selectedMediaPlacement.value;
    if (placement?.autoplay) mediaDraft.value.autoplay = true;
    if (placement?.muted) mediaDraft.value.muted = true;
    applyMediaPlacementContext(mediaDraft.value.placement_key);
  } catch (reason) {
    error.value = '';
    message.value = '浏览器暂时无法读取视频信息，仍可继续上传；上传后将由服务端校验。';
  }
}

function validateMediaFile(file) {
  if (!file) return '请选择要登记的媒体文件。';
  const mime = String(file.type || '').toLowerCase().trim();
  const extension = String(file.name || '').toLowerCase().split('.').pop();
  const normalizedMime = mime === 'video/quicktime' || ['mov', 'm4v'].includes(extension) ? 'video/mp4' : mime;
  const limit = mediaUploadRules[normalizedMime] || mediaUploadRules[mime];
  if (!limit) return '仅支持 JPG、PNG、WebP、AVIF、MP4、WebM 或 PDF 文件。';
  if (file.size < 1) return '不能上传空文件。';
  if (file.size > limit) return `文件超过 ${readableFileSize(limit)} 的上限。`;
  return '';
}

function validateMediaCandidate() {
  const fileError = validateMediaFile(mediaDraft.value.file);
  if (fileError) return fileError;
  const spec = selectedMediaPlacement.value;
  if (!spec || spec.mediaType !== mediaDraft.value.media_type) return '请选择与文件类型一致的官网展示位置。';
  // 尺寸 / 体积 / 时长不再拦截（与后端 media-asset-governance.mjs 的策略一致）：
  // 这些只影响画质，运营手里常常只有一种素材，卡住等于没法上线。
  // 画质差距由 selectedMediaPlacementHelp 以提示形式展示。
  // 下面这些保留，因为缺了页面会直接坏掉。
  if (spec.transcriptRequired && !String(mediaDraft.value.transcript || '').trim()) return `${spec.label}必须填写字幕或文字稿。`;
  if (spec.autoplay && !mediaDraft.value.autoplay) return `${spec.label}必须启用自动播放。`;
  if (spec.muted && !mediaDraft.value.muted) return `${spec.label}自动播放时必须默认静音。`;
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
  if (serviceMode.value === 'service_resources') return record.title || record.source_key || record.type || '未命名服务资料';
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
  return filterEditorialRecords(editorial.value[mode], mode === 'articles' ? editorialCategory.value : '');
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

// Edit-time selectors may include a matching private candidate so an editor
// can verify a replacement before review. Public readers still use only the
// separately loaded, published mediaAssets collection.
function editableMediaAssets(scope, options = {}) {
  const approved = reviewedMediaAssets(scope);
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope, ...options });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return [...approved, ...staging.filter((asset) => !known.has(String(asset.id)))];
}

function editableMediaAssetsForPlacement(scope, placementKey, elementType = '') {
  return editableMediaAssets(scope, { placementKey, elementType });
}

function pageMediaOptions(scope) {
  const approved = reviewedMediaAssets(scope);
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return [...approved, ...staging.filter((asset) => !known.has(String(asset.id)))];
}

function pageMediaOptionsForSection(scope, section) {
  const pageKey = String(pageDraft.value?.slug || '').trim();
  const sectionKey = String(section?.id || '').trim();
  return pageMediaOptions(scope).filter((asset) => {
    if (!isPreviewStagingMedia(asset, { scope })) return true;
    return String(asset.page_key || '').trim() === pageKey
      && String(asset.section_key || '').trim() === sectionKey;
  });
}

function isHomeHeroSection(section) {
  return String(pageDraft.value?.slug || '') === 'home' && String(section?.id || '') === 'hero';
}

function isNewsHeroSection(section) {
  return String(pageDraft.value?.slug || '') === 'news' && String(section?.id || '') === 'hero';
}

function homeHeroVideoOptionsForSection(section) {
  return homeHeroVideoOptions(pageMediaOptionsForSection('homepage', section));
}

function setHomeHeroVideo(section, assetId) {
  if (!setHomeHeroVideoAsset(section, assetId, homeHeroVideoOptionsForSection(section))) {
    error.value = '该素材不是首页首屏视频，未保存修改。';
    return;
  }
  if (error.value === '该素材不是首页首屏视频，未保存修改。') error.value = '';
}

function newsHeroVideoOptionsForSection(section) {
  return newsHeroVideoOptions(pageMediaOptionsForSection('article', section));
}

function setNewsHeroVideo(section, assetId) {
  if (!setNewsHeroVideoAsset(section, assetId, newsHeroVideoOptionsForSection(section))) {
    error.value = '该素材不是视频新闻首屏视频，未保存修改。';
    return;
  }
  if (error.value === '该素材不是视频新闻首屏视频，未保存修改。') error.value = '';
}

function pageMediaOptionLabel(asset, scope) {
  return isPreviewStagingMedia(asset, { scope })
    ? `${mediaAssetLabel(asset)}（草稿素材，仅当前内部预览）`
    : mediaAssetLabel(asset);
}

function productDrawingMediaAssets() {
  const approved = reviewedMediaAssets('product');
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image' });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return orderProductDrawingMediaAssets([...approved, ...staging.filter((asset) => !known.has(String(asset.id)))], modelDraft.value?.model_code);
}

function productFeatureMediaAssets() {
  const approved = reviewedMediaAssets('product');
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image' });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return [...approved, ...staging.filter((asset) => !known.has(String(asset.id)))];
}

function productResourceMediaAssets() {
  const approved = reviewedMediaAssets('product').filter((asset) => String(asset.media_type || '') === 'document');
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope: 'product', placementKey: 'product.document' });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return [...approved, ...staging.filter((asset) => !known.has(String(asset.id)) && String(asset.media_type || '') === 'document')];
}

function serviceResourceMediaPlacement(type) {
  return String(type || '') === 'video' ? 'service.tutorial.video' : 'service.document';
}

function serviceResourceMediaAssets(type = serviceDraft.value?.type) {
  const isVideo = String(type || '') === 'video';
  const placementKey = serviceResourceMediaPlacement(type);
  const matchesType = (asset) => isVideo
    ? String(asset.media_type || '') === 'video' || String(asset.mime_type || '').toLowerCase().startsWith('video/')
    : String(asset.media_type || '') === 'document' || String(asset.mime_type || '').toLowerCase() === 'application/pdf';
  const approved = reviewedMediaAssets('service').filter(matchesType);
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope: 'service', placementKey, elementType: isVideo ? 'video' : '' });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return [...approved, ...staging.filter((asset) => !known.has(String(asset.id)) && matchesType(asset))];
}

function isServiceResourceMediaAsset(value, type = serviceDraft.value?.type) {
  return serviceResourceMediaAssets(type).some((asset) => String(asset.id) === String(value || ''));
}

function serviceResourceMediaAssetLabel(asset, type = serviceDraft.value?.type) {
  const isVideo = String(type || '') === 'video';
  const placementKey = serviceResourceMediaPlacement(type);
  return isPreviewStagingMedia(asset, { scope: 'service', placementKey, elementType: isVideo ? 'video' : '' })
    ? `${mediaAssetLabel(asset)}（${isVideo ? '草稿素材，仅当前内部预览' : '仅内部预览下载'}）`
    : mediaAssetLabel(asset);
}

function serviceTutorialPosterAssets() {
  return editableMediaAssetsForPlacement('service', 'service.tutorial.poster', 'image');
}

function isServiceTutorialPosterAsset(value) {
  return serviceTutorialPosterAssets().some((asset) => String(asset.id) === String(value || ''));
}

function serviceTutorialPosterAssetLabel(asset) {
  return isPreviewStagingMedia(asset, {
    scope: 'service',
    placementKey: 'service.tutorial.poster',
    elementType: 'image'
  })
    ? `${mediaAssetLabel(asset)}（草稿素材，仅当前内部预览）`
    : mediaAssetLabel(asset);
}

function modelResourceMediaAssetLabel(asset) {
  return isPreviewStagingMedia(asset, { scope: 'product', placementKey: 'product.document' })
    ? `${mediaAssetLabel(asset)}（仅内部预览下载）`
    : mediaAssetLabel(asset);
}

function modelDrawingMediaAssetLabel(asset) {
  const label = formatProductDrawingMediaLabel(asset);
  return isPreviewStagingMedia(asset, { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image' })
    ? `${label}（仅内部预览草稿）`
    : label;
}

function qualificationMediaAssets() {
  const approved = reviewedMediaAssetsForPlacement('qualification', 'qualification.image');
  const staging = filterPreviewStagingMediaAssets(mediaCandidates.value, { scope: 'qualification', placementKey: 'qualification.image', elementType: 'image' });
  const known = new Set(approved.map((asset) => String(asset.id)));
  return [...approved, ...staging.filter((asset) => !known.has(String(asset.id)))];
}

function qualificationMediaAssetLabel(asset) {
  return isPreviewStagingMedia(asset, { scope: 'qualification', placementKey: 'qualification.image', elementType: 'image' })
    ? `${mediaAssetLabel(asset)}（草稿素材，仅当前内部预览）`
    : mediaAssetLabel(asset);
}

function isReviewedMediaAsset(value, scope) {
  return reviewedMediaAssets(scope).some((asset) => String(asset.id) === String(value));
}

function isCompanyMediaSelectable(value) {
  const assetId = String(value || '').trim();
  if (!assetId) return false;
  if (isReviewedMediaAsset(assetId, companyMediaScope())) return true;
  return companyMode.value === 'qualifications' && qualificationMediaAssets().some((asset) => String(asset.id) === assetId);
}

function mediaAssetLabel(asset) {
  const title = String(asset?.title || '').trim();
  const filename = String(asset?.original_file_name || `素材 ${asset?.id || ''}`).trim();
  return `${title || filename} · ${filename} · ${asset?.mime_type || '未知类型'}`;
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
  return Boolean(record?.id) && (editableStatuses.has(record.status) || record.status === 'published');
}

// Editing a published row is a UI-level allowance (the save hook still blocks
// it), but deleting one must never be allowed. The old delete guards reused
// canEdit, which includes "published", so a published series with no models
// offered a native confirm and then called DELETE on live content.
function canDeleteContent(record) {
  return Boolean(record?.id) && editableStatuses.has(record.status) && record.publication_state !== 'published';
}

function canDeleteEditorialDraft(record) {
  const deletableStatuses = new Set(['draft', 'rejected', 'unpublished']);
  return Boolean(record?.id) && deletableStatuses.has(record.status) && record.publication_state === 'unpublished';
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
  const status = apiStatus(reason);
  const issue = reason?.response?.data?.errors?.[0];
  const message = String(issue?.message || '').trim();
  const code = String(issue?.extensions?.code || '');
  if (status === 401) {
    return '登录会话已失效。未保存内容仍保留在页面中，请重新登录后保存。';
  }
  if (status === 403) {
    // The publication workflow rejects writes to review/scheduled records with
    // a Chinese reason. Treating every 403 as "login expired" sent operators to
    // re-login while the actual fix was to take the record back to draft.
    if (code === 'PUBLICATION_BLOCKED' || /只能发布|已批准|当前状态|审核|发布队列|退回草稿|下线/.test(message)) {
      return `当前内容不能保存：${message || '记录状态不允许保存'}。请先在「内容发布队列」退回草稿后再修改。`;
    }
    if (/permission to access field|字段|field/i.test(message)) {
      return `当前账号没有该字段的保存权限：${message || '请联系管理员调整权限'}`;
    }
    return `当前账号没有保存权限：${message || '请确认内容状态或联系管理员'}`;
  }
  return message || fallback;
}

// The canvas can select a media asset on a record the server refuses to grant a
// preview for. The old message told the operator to reopen the preview, which
// never helps: the two real causes are a published record and a placement
// mismatch, and both need a different action.
function mediaGrantError(reason, target) {
  const issue = reason?.response?.data?.errors?.[0];
  const code = String(issue?.extensions?.code || '');
  const record = target?.record || {};
  const published = String(record.publication_state || '') === 'published' || String(record.status || '') === 'published';
  if (code === 'PREVIEW_MEDIA_INVALID' && published) {
    return '这条内容已经发布，画布不能替换它的素材。请先在「内容发布队列」把它下线，再恢复为草稿，然后回来换素材。';
  }
  if (code === 'PREVIEW_MEDIA_INVALID') {
    return '所选素材不适用于这个区块：素材的用途范围、所属页面和展示位置必须与当前区块一致。请到「媒体资产」核对该素材登记的位置。';
  }
  return issue?.message || '素材预览授权失败，请重新打开预览。';
}

function setSaveError(reason, fallback) {
  error.value = apiError(reason, fallback);
  // Keep the detached draft untouched so retry is the same button press after
  // the server or login session recovers. A visible success message must never
  // survive a failed request.
  message.value = '';
}

const contentQueueDefinitions = Object.freeze([
  { collection: 'content_submissions', label: '送审批次', fields: ['submission_name', 'batch_key', 'items'] },
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
  { collection: 'site_settings', label: '全站设置', fields: ['setting_key'] }
]);

function reviewRecordKey(record) {
  return `${record.collection}:${record.id}`;
}

function submissionRecordKey(record) {
  return `${record.collection}:${record.id}`;
}

async function loadContentQueue(status) {
  const responses = await Promise.allSettled(contentQueueDefinitions.map(async (definition) => {
      const fields = ['id', 'status', 'publication_state', 'review_note', 'publication_log', ...definition.fields].join(',');
      const query = new URLSearchParams({ fields, limit: '-1', sort: definition.fields[0] });
      if (status.includes(',')) query.set('filter[status][_in]', status);
      else query.set('filter[status][_eq]', status);
      const response = await api.get(`/items/${definition.collection}?${query.toString()}`);
      const records = Array.isArray(response.data?.data) ? response.data.data : [];
      return records.map((record) => normalizeReviewRecord(definition, record));
  }));
  return responses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

// A batch is the single queue row; its members must not be listed a second time.
function hideBatchedMembers(records) {
  const batched = new Set();
  for (const record of records) {
    if (record.collection !== 'content_submissions') continue;
    for (const item of Array.isArray(record.items) ? record.items : []) {
      batched.add(`${item.collection}:${item.id}`);
    }
  }
  return records.filter((record) => record.collection === 'content_submissions' || !batched.has(reviewRecordKey(record)));
}

async function loadReviewQueue() {
  reviewLoading.value = true;
  error.value = '';
  try {
    reviewQueue.value = hideBatchedMembers(await loadContentQueue('review'));
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
    submissionQueue.value = hideBatchedMembers(await loadContentQueue(submissionMode.value === 'restore' ? 'rejected,unpublished' : 'draft'));
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

function invalidateSubmissionQueue() {
  // 保存/新建/删除后旧清单立即失效。留到用户真正进入“内容送审”时再请求，
  // 避免在编辑页无意义地刷新几十个集合。
  submissionQueueLoaded.value = false;
  if (activeTab.value === 'submit') void loadSubmissionQueue();
}

function setSubmissionMode(mode) {
  if (!['submit', 'restore'].includes(mode) || submissionMode.value === mode) return;
  if (!confirmDiscardChanges('切换审核任务')) return;
  submissionMode.value = mode;
  selectedSubmissionKey.value = '';
  submissionNote.value = '';
  submissionQueueLoaded.value = false;
  // Filters describe one queue's contents, so they must not leak into the other.
  clearSubmissionFilters();
  loadSubmissionQueue().then(markDraftSaved);
}

function clearSubmissionFilters() {
  submissionQuery.value = '';
  submissionCollectionFilter.value = '';
}

// Narrowing the list should land the operator on a visible record rather than
// leaving the detail panel showing something that is no longer listed.
watch(filteredSubmissionQueue, (visible) => {
  if (!visible.length) return;
  if (visible.some((record) => submissionRecordKey(record) === selectedSubmissionKey.value)) return;
  selectedSubmissionKey.value = submissionRecordKey(visible[0]);
  submissionNote.value = '';
});

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
    if (record.collection === 'content_submissions') {
      const items = Array.isArray(record.items) ? record.items : [];
      // Catch incomplete members before they enter review; approval is too late
      // and used to leave the batch stuck with an unrelated/incomplete item.
      const blockers = await batchReadinessBlockers(items);
      if (blockers.length) {
        error.value = `批次未提交，以下内容未达到发布条件：${blockers.join('；')}`;
        message.value = '';
        return;
      }
      const failures = [];
      for (const item of items) {
        try {
          await api.patch(`/items/${encodeURIComponent(item.collection)}/${encodeURIComponent(item.id)}`, { status: 'review', review_note: submissionNote.value || null });
        } catch {
          failures.push(item.label || `${item.collection}:${item.id}`);
        }
      }
      if (failures.length) {
        error.value = `批次未提交：${failures.length} 项失败（${failures.join('、')}），其余已改为审核中；请修正后重试。`;
        message.value = '';
        await loadSubmissionQueue();
        return;
      }
      await api.patch(`/items/content_submissions/${encodeURIComponent(record.id)}`, { status: 'review', review_note: submissionNote.value || null, submitted_at: new Date().toISOString() });
    } else {
      await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status: 'review', review_note: submissionNote.value || null });
    }
    message.value = '已提交审核。整批内容将由对应审核角色处理，前端不会直接发布。';
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

async function batchReadinessBlockers(items) {
  try {
    const response = await api.get('/publication-readiness');
    const report = response?.data?.data;
    if (!Array.isArray(report?.items)) return [];
    return items.flatMap((item) => {
      const editPath = `/admin/content/${encodeURIComponent(item.collection)}/${encodeURIComponent(String(item.id))}`;
      const readiness = report.items.find((entry) => String(entry.edit_path || '') === editPath);
      const blockers = (readiness?.blockers || []).filter((blocker) => blocker !== '未完成发布');
      return blockers.length ? [`${item.label || item.id}：${blockers.join('、')}`] : [];
    });
  } catch {
    // Readiness is publisher-only. A reviewer still gets the server's per-item
    // error; preflight just cannot enrich it here.
    return [];
  }
}

async function decideReview(status) {
  const record = selectedReviewRecord.value;
  if (!record || !['scheduled', 'rejected'].includes(status)) return;
  reviewSaving.value = true;
  error.value = '';
  message.value = '';
  productReleaseHint.value = false;
  const productCollections = new Set(['product_series', 'product_models', 'product_parameters']);
  const hasProductItem = record.collection === 'content_submissions'
    ? (Array.isArray(record.items) && record.items.some((item) => productCollections.has(item.collection)))
    : productCollections.has(record.collection);
  try {
    if (record.collection === 'content_submissions') {
      const items = Array.isArray(record.items) ? record.items : [];
      // Approve is the last human gate. Check every member before changing any
      // status: a later failure used to leave the batch half-approved.
      if (status === 'scheduled') {
        const blockers = await batchReadinessBlockers(items);
        if (blockers.length) {
          error.value = `批次未批准，以下内容未达到发布条件：${blockers.join('；')}`;
          message.value = '';
          return;
        }
      }
      const failures = [];
      for (const item of items) {
        try {
          await api.patch(`/items/${encodeURIComponent(item.collection)}/${encodeURIComponent(item.id)}`, { status, review_note: reviewNote.value || null });
        } catch {
          failures.push(item.label || `${item.collection}:${item.id}`);
        }
      }
      if (failures.length) {
        error.value = `批次未完成审核：${failures.length} 项失败（${failures.join('、')}）；请逐项修正后重试。`;
        message.value = '';
        await loadReviewQueue();
        return;
      }
      await api.patch(`/items/content_submissions/${encodeURIComponent(record.id)}`, { status, review_note: reviewNote.value || null, reviewed_at: new Date().toISOString() });
    } else {
      await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status, review_note: reviewNote.value || null });
    }
    message.value = status === 'scheduled' ? '整批审核已提交为待发布，是否允许流转由服务端规则确认。' : '已整批退回修改，内容编辑人员可在草稿流程中继续完善。';
    if (status === 'scheduled' && hasProductItem) {
      productReleaseHint.value = true;
      message.value = '产品内容已批准进入待发布。请前往「产品统一发布」生成公开快照。';
    }
    await loadReviewQueue();
  } catch (reason) {
    error.value = apiError(reason, '审核流转失败。请确认当前账号角色及内容就绪状态。');
  } finally {
    reviewSaving.value = false;
  }
}

function selectPage(id, force = false) {
  // Switching keeps the previous page draft, so no discard prompt.
  stashProductDraft();
  selectedPageId.value = id;
  const record = pages.value.find((item) => item.id === id);
  const cached = productDraftCache.get(productDraftKey('pages', id));
  if (cached) {
    pageDraft.value = clone(cached.page);
    savedDraftFingerprint.value = cached.savedFingerprint;
    resetVisualHistory();
    return;
  }
  pageDraft.value = record ? normalizePage(record) : null;
  markDraftSavedAfterHydration();
}

function notifyCanvasSeriesSelection(record) {
  if (!record?.id || !livePreviewFrame.value?.contentWindow || !livePreviewWebsiteOrigin.value) return;
  // Tell the canvas which card the operator selected in the left list. Without
  // this the iframe kept its previous `activeSeriesCode`, so the next
  // "＋ 新增机型" wrote the model into the old series.
  livePreviewFrame.value.contentWindow.postMessage({
    type: 'ruijun:cms-preview:notice',
    kind: 'series-selected',
    itemId: String(record.id),
    seriesCode: String(record.series_code || ''),
    slug: String(record.slug || ''),
    label: record.name || record.series_code || '系列'
  }, livePreviewWebsiteOrigin.value);
}

function selectSeries(id, force = false, notifyCanvas = true, syncModel = true) {
  // Switching keeps the previous draft in the cache, so no discard prompt.
  stashProductDraft();
  selectedSeriesId.value = id;
  const record = series.value.find((item) => item.id === id);
  const cached = productDraftCache.get(productDraftKey('product_series', id));
  if (cached) {
    seriesDraft.value = clone(cached.series);
    savedDraftFingerprint.value = cached.savedFingerprint;
    resetVisualHistory();
  } else {
    seriesDraft.value = record ? normalizeSeries(record) : null;
    markDraftSavedAfterHydration();
  }
  // The left model form must never keep showing the previous series' model:
  // that made a card look like its models carried another family's series_code.
  if (syncModel) {
    const seriesCode = String(record?.series_code || '').trim();
    const current = models.value.find((model) => String(model.id) === String(selectedModelId.value));
    const currentInSeries = current && (!seriesCode || String(current.series_code || '').trim() === seriesCode);
    if (!currentInSeries) {
      const first = models.value.find((model) => seriesCode && String(model.series_code || '').trim() === seriesCode);
      if (first) void selectModel(first.id, true);
      else {
        selectedModelId.value = '';
        modelDraft.value = null;
        parameters.value = [];
        newParameter.value = emptyParameter();
      }
    }
  }
  // A canvas-originated selection already shows that card; echoing a notice
  // back would make the page select → notify → select again.
  if (notifyCanvas && record) notifyCanvasSeriesSelection(record);
}

const seriesDetailIsEmpty = computed(() => {
  const detail = seriesDraft.value?.detail;
  if (!detail) return true;
  const intro = detail.intro || {};
  const hasIntro = ['title', 'subtitle', 'scene', 'body'].some((key) => String(intro[key] || '').trim());
  const hasFeatures = Array.isArray(detail.features) && detail.features.some((feature) => String(feature?.label || '').trim());
  return !hasIntro && !hasFeatures;
});
// Only solution-type series own a series-level detail. Machine families keep
// their detail on the model, so showing this editor there would let one series
// override every model's features.
const seriesSupportsDetail = computed(() => seriesDetailKey({
  slug: seriesDraft.value?.slug,
  series_code: seriesDraft.value?.series_code,
  id: seriesDraft.value?.series_code || seriesDraft.value?.slug
}) === 'workstation');

// Materialize the PSD copy the public page renders into editable CMS data. Until
// this runs the series detail has no owner record, so a canvas edit would have
// nothing to write to.
function initializeSeriesDetail() {
  if (!seriesDraft.value || !canEdit(seriesDraft.value) || !seriesSupportsDetail.value) return;
  const seeded = defaultSeriesDetail({ ...seriesDraft.value, id: seriesDraft.value.slug || seriesDraft.value.series_code });
  if (!seeded) { error.value = '该系列没有可初始化的原版详情。'; return; }
  seriesDraft.value.detail = {
    intro: { ...emptySeriesDetail().intro, ...(seeded.intro || {}) },
    features: (seeded.features || []).map((feature) => ({ label: feature.label, detail: feature.detail || '', note: feature.note || '' }))
  };
  message.value = '已写入官网原版详情，修改后请保存草稿。';
}

function addSeriesDetailFeature() {
  if (!seriesDraft.value || !canEdit(seriesDraft.value)) return;
  seriesDraft.value.detail.features.push({ label: '', detail: '', note: '' });
}

function removeSeriesDetailFeature(index) {
  if (!seriesDraft.value || !canEdit(seriesDraft.value)) return;
  seriesDraft.value.detail.features.splice(index, 1);
}

function moveSeriesDetailFeature(index, offset) {
  const features = seriesDraft.value?.detail?.features;
  if (!Array.isArray(features)) return;
  const next = index + offset;
  if (next < 0 || next >= features.length) return;
  [features[index], features[next]] = [features[next], features[index]];
}

function initializeModelDetail() {
  if (!modelDraft.value || !canEdit(modelDraft.value)) return;
  const seeded = defaultModelConfiguration({ series_code: modelDraft.value.series_code, slug: modelDraft.value.slug });
  if (!seeded) { error.value = '该系列没有可初始化的原版详情。'; return; }
  if (seeded.intro) {
    for (const [key, value] of Object.entries(seeded.intro)) {
      if (!String(modelDraft.value.configuration.intro[key] || '').trim()) modelDraft.value.configuration.intro[key] = value;
    }
  }
  if (seeded.features?.length && !modelDraft.value.configuration.features.length) {
    modelDraft.value.configuration.features = seeded.features.map((feature) => ({
      label: feature.label,
      detail: feature.detail || '',
      note: feature.note || '',
      image: feature.image || '',
      media_asset_id: ''
    }));
  }
  message.value = '已写入官网原版详情，修改后请保存草稿。';
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
  if (!companyDraft.value || !assetId || !isCompanyMediaSelectable(assetId)) return;
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

function addModelFeature() {
  modelDraft.value?.configuration.features.push({ label: '', detail: '', note: '', media_asset_id: '' });
}

function removeModelFeature(index) {
  modelDraft.value?.configuration.features.splice(index, 1);
}

function addModelDrawing() {
  modelDraft.value?.configuration.drawings.push({ title: '', caption: '', media_asset_id: '' });
}

function removeModelDrawing(index) {
  modelDraft.value?.configuration.drawings.splice(index, 1);
}

function addModelResource() {
  modelDraft.value?.resources.push({ title: '', type: '', url: '', media_asset_id: '' });
}

function removeModelResource(index) {
  modelDraft.value?.resources.splice(index, 1);
}

function addEditorialMediaReference() {
  const assetId = String(editorialMediaSelection.value || '').trim();
  if (!editorialDraft.value || !assetId || !isEditorialMediaAssetAllowed(assetId, {
    category: editorialDraft.value.category,
    publishedAssets: reviewedMediaAssets('article'),
    candidates: mediaCandidates.value
  })) return;
  if (!editorialDraft.value.mediaReferences.some((reference) => String(reference.media_asset_id) === assetId)) editorialDraft.value.mediaReferences.push({ media_asset_id: assetId });
  editorialMediaSelection.value = '';
}

function removeEditorialMediaReference(assetId) {
  if (!editorialDraft.value) return;
  editorialDraft.value.mediaReferences = editorialDraft.value.mediaReferences.filter((reference) => String(reference.media_asset_id) !== String(assetId));
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
  // Video shares are edited by the media-first card workspace, not by the
  // article form. Selecting a video article here would leak its draft into the
  // generic article save path.
  if (mode === 'articles' && editorialCategory.value === 'video') {
    selectedEditorialId.value = '';
    editorialDraft.value = null;
    draftSubmissionName.value = '';
    markDraftSaved();
    return;
  }
  const nextId = editorialRecords(mode).some((item) => item.id === selectedEditorialId.value) ? selectedEditorialId.value : editorialRecords(mode)[0]?.id;
  if (nextId) selectEditorialRecord(nextId, true); else { selectedEditorialId.value = ''; editorialDraft.value = null; markDraftSaved(); }
}

function submissionNameFromLog(record) {
  let log = record?.publication_log;
  if (typeof log === 'string') {
    try { log = JSON.parse(log); } catch { log = []; }
  }
  const entry = Array.isArray(log)
    ? [...log].reverse().find((item) => String(item?.submission_name || '').trim())
    : null;
  return String(entry?.submission_name || '').trim();
}

function selectEditorialRecord(id, force = false) {
  if (!force && id !== selectedEditorialId.value && !confirmDiscardChanges('切换文章或案例')) return;
  selectedEditorialId.value = id;
  const record = editorialRecords(editorialMode.value).find((item) => String(item.id) === String(id));
  editorialDraft.value = record ? normalizeEditorial(record) : null;
  selectedEditorialId.value = record ? record.id : id;
  draftSubmissionName.value = submissionNameFromLog(record);
  markDraftSaved();
}

async function handleVideoShareChanged() {
  // The video-share workspace owns its media/article writes. Refresh the shared
  // caches so the canvas, media picker and news page see the same records.
  await Promise.all([loadEditorial(), loadMediaAssets(), loadMediaCandidates()]);
  if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
}

function handleVideoShareNotify(payload) {
  const text = String(payload?.text || '');
  if (!text) return;
  if (payload?.type === 'error') {
    error.value = text;
  } else {
    message.value = text;
    error.value = '';
  }
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
  // Switching keeps the previous draft (model + its parameter rows) in the cache.
  stashProductDraft();
  const record = models.value.find((item) => String(item.id) === String(id));
  selectedModelId.value = record?.id ?? id;
  const cached = productDraftCache.get(productDraftKey('product_models', selectedModelId.value));
  modelDraft.value = cached ? clone(cached.model) : record ? normalizeModel(record) : null;
  modelMediaSelection.value = '';
  if (cached) {
    parameters.value = clone(cached.parameters) || [];
    newParameter.value = clone(cached.newParameter) || emptyParameter();
    dirtyParameterIds.value = Array.isArray(cached.dirtyParameterIds) ? [...cached.dirtyParameterIds] : [];
    savedModelFingerprint.value = String(cached.savedModelFingerprint || '');
    savedDraftFingerprint.value = cached.savedFingerprint;
    resetVisualHistory();
    return;
  }
  parameters.value = [];
  dirtyParameterIds.value = [];
  newParameter.value = emptyParameter();
  if (modelDraft.value) {
    newParameter.value.model_code = modelDraft.value.model_code;
    await loadParameters(modelDraft.value.model_code);
  }
  markDraftSavedAfterHydration();
}

function isAboutPage() {
  return pageDraft.value?.slug === 'about';
}

function isServicePage() {
  return pageDraft.value?.slug === 'service';
}

function isHomeReasonSection(section) {
  if (pageDraft.value?.slug !== 'home') return false;
  const id = String(section?.id || '');
  return ['performance', 'advanced-manufacturing', 'industry-leadership'].includes(id) || /^reason-[1-9][0-9]*$/.test(id);
}

function updateSectionHeading(section, value) {
  if (!section || !canEdit(pageDraft.value)) return;
  const text = String(value ?? '');
  if (isHomeReasonSection(section)) section.introTitle = text;
  else section.title = text;
  pushPageDraftToPreview();
}

function sectionBodyIsRendered(section) {
  return !(pageDraft.value?.slug === 'home' && String(section?.id || '') === 'why-ruijun');
}

function sectionTitleIsRendered(section) {
  return !(pageDraft.value?.slug === 'product' && String(section?.id || '') === 'model-list');
}

function registeredPageSectionFields(section) {
  return getPageSectionDefinition(section?.type, pageDraft.value?.slug)?.fields || [];
}

function sectionEmptyStateIsHiddenByRecords(section) {
  if (pageDraft.value?.slug !== 'news') return false;
  const sectionId = String(section?.id || '');
  const category = sectionId === 'dynamic-news' ? 'news' : sectionId === 'video-sharing' ? 'video' : '';
  return Boolean(category && editorial.value.articles.some((record) => String(record?.category || '') === category));
}

function sectionEmptyStateLabel(section) {
  if (pageDraft.value?.slug === 'news' && String(section?.id || '') === 'dynamic-news') return '空状态说明（仅当没有动态新闻时显示）';
  if (pageDraft.value?.slug === 'news' && String(section?.id || '') === 'video-sharing') return '空状态说明（仅当没有视频分享时显示）';
  return '补充说明';
}

function pageMediaScope() {
  const slug = String(pageDraft.value?.slug || '');
  if (slug === 'home') return 'homepage';
  if (slug === 'service') return 'service';
  if (slug === 'manufacturing') return 'manufacturing';
  if (slug === 'news') return 'article';
  if (slug === 'product') return 'product';
  return 'brand';
}

function pageMediaScopeLabel() {
  return ({ homepage: '网站主页', service: '服务', manufacturing: '制造', article: '文章与资讯', product: '产品', brand: '品牌与企业' })[pageMediaScope()] || '品牌与企业';
}

function addAboutSections() {
  if (!pageDraft.value || !isAboutPage()) return;
  const defaults = [
    { id: 'hero', title: '专攻电加工卡脖子技术\n为客户创造最大价值', kicker: '30', description: '年深耕线切割制造' },
    { id: 'brand-story', title: '品牌故事', body: '上世纪 90 年代初，二十来岁的年轻兄弟俩立足温州，经营线切割加工业务，并随父亲经销国营线切割机床。随着市场经济蓬勃发展，市场机床需求高涨，国营厂产能难以满足订单。1997 年，兄弟二人创办丰华数控，转型自主生产机床。\n\n2003 年“非典”市场遇冷，团队潜心研发，成功推出中走丝线切割机床。2006 年企业迁至产业区位更优的昆山，因“丰华”商标已被注册，取自兄弟姓名各一字，定名瑞钧。\n\n2013 年整机销量突破 1000 台；2014 年迁入新制造基地，2016 年扩建标准化产线，跻身行业头部。2022 年研发自动穿丝中走丝，迈向设备自动化。2023 年斥资数亿元在常熟建设 4.0 智慧工厂，引进百台加工母机，新工厂于 2025 年正式投产。' },
    { id: 'overview', title: '愿景：成为一家为客户创造更大价值的企业', body: '瑞钧智科是一家专业研发、制造与销售电火花周边系统及数控机床的高新技术企业。公司始创于1997年，在江苏昆山、常熟建有制造基地，持续为客户提供智能化中走丝线切割机床。', kicker: '累计数万用户', description: '精神：专注、专业、诚信、创新', items: ['我们拥有完全自主的产品设计、研发！', '我们拥有全产业链制造能力！', '我们拥有技术一流的员工团队！', '我们拥有先进的精良设备！', '我们拥有保证产品质量的严谨章程！', '我们拥有完善的售前、售中、售后服务！'].map((label) => ({ label })) },
    { id: 'history', title: '瑞钧智科的中走丝制造历史' },
    { id: 'factory', title: '厂区风貌' }, { id: 'certificates', title: '认证证书' },
    { id: 'honors', title: '荣誉证书' }, { id: 'patents', title: '专利证书', description: '79件专利，其中发明专利9件' },
    { id: 'partners', title: '众多世界知名品牌厂家和供应商合作' }, { id: 'clients-domestic', title: '国内客户' }, { id: 'clients-global', title: '国外客户' }
  ];
  for (const section of defaults) {
    const existing = pageDraft.value.sections.find((item) => item.id === section.id);
    if (existing) {
      for (const [key, value] of Object.entries(section)) {
        if ((existing[key] == null || existing[key] === '' || (Array.isArray(existing[key]) && !existing[key].length)) && key !== 'id') existing[key] = clone(value);
      }
    } else pageDraft.value.sections.push({ body: '', kicker: '', description: '', items: [], media: [], ...clone(section), ...defaultSectionPresentation() });
  }
}

const requiredPageSections = Object.freeze({
  home: [
    { id: 'hero', title: '瑞钧智科中走丝线切割机床', body: '', label: '', href: '#reasons' },
    { id: 'why-ruijun', title: '选择瑞钧的\n三大理由' },
    { id: 'performance', kicker: '增效降损', shortTitle: '增效降损', introTitle: '增效降损', introDetail: '效能提升50%，丝损降低30%', title: '增效降损', body: '效能提升50%，丝损降低30%', description: '效能提升50%，丝损降低30%', mode: 'machine', requires_claim_review: true },
    { id: 'advanced-manufacturing', kicker: '先进智造', shortTitle: '先进智造', introTitle: '先进智造', introDetail: '30年技术沉淀，先进制造工厂', title: '30年技术沉淀，先进制造工厂', description: '30年技术沉淀，先进制造工厂', mode: 'photo' },
    { id: 'industry-leadership', kicker: '领军品牌', shortTitle: '领军品牌', introTitle: '行业领军品牌', introDetail: '销量持续领先，品质始终如一', title: '销量持续领先，品质始终如一', description: '销量持续领先，品质始终如一', mode: 'photo' },
    { id: 'products', title: '我们的产品' },
    { id: 'history', title: '瑞钧智科的中走丝制造历史' },
    { id: 'product-task', title: '让下一台设备匹配你的加工任务', body: '通过工件、精度、节拍和自动化需求获得选型建议。', label: '获取选型建议', href: '/contact' }
  ],
  product: [
    { id: 'hero', title: '产品展示', body: '按加工任务、自动化方式与规格选择设备。' },
    { id: 'categories', title: '选择瑞钧理由' },
    { id: 'proof-efficiency', title: '增效降损', body: '效能提升50%，丝损降低30%', requires_claim_review: true },
    { id: 'proof-years', title: '30 YEARS', body: '30年技术沉淀，先进智造工厂' },
    { id: 'proof-champion', title: 'Champion', body: '销量持续领先，品质始终如一' },
    { id: 'model-list', title: '产品系列' },
    { id: 'parameters', title: '技术参数' }, { id: 'dimensions', title: '尺寸与资料' },
    { id: 'pagination', title: '更多产品', description: '没有符合条件的产品。' }
  ],
  manufacturing: [
    { id: 'hero', title: '先进制造', body: '全产业链制造与严格质量控制。' },
    { id: 'process', title: '世界一流的生产工艺' },
    { id: 'precision-machining', title: 'CNC车间' }, { id: 'sheet-metal', title: '钣金车间' },
    { id: 'standardized-assembly', title: '装配车间' }, { id: 'whole-machine-validation', title: '精密检测' },
    { id: 'electrical-assembly', title: '电气装配' }, { id: 'smart-warehouse', title: '智能物料仓储' },
    { id: 'core-equipment', title: '生产核心设备' }
  ],
  news: [
    { id: 'hero', title: '视频新闻', body: '展示官方热门视频、展会新闻' },
    { id: 'dynamic-news', title: '动态新闻', description: '暂无动态新闻。' },
    { id: 'video-sharing', title: '视频分享', description: '暂无视频分享。' }
  ]
});

function addRequiredPageSections() {
  if (!pageDraft.value) return;
  if (pageDraft.value.slug === 'about') { addAboutSections(); return; }
  if (pageDraft.value.slug === 'service') { addServiceSections(); return; }
  const defaults = requiredPageSections[pageDraft.value.slug] || [];
  for (const section of defaults) {
    const existing = pageDraft.value.sections.find((item) => item.id === section.id);
    if (existing) {
      for (const [key, value] of Object.entries(section)) if ((existing[key] == null || existing[key] === '') && key !== 'id') existing[key] = clone(value);
    } else pageDraft.value.sections.push({ kicker: '', title: '', body: '', description: '', label: '', href: '', items: [], media: [], ...clone(section), ...defaultSectionPresentation() });
  }
}

function addHomeReasonSection() {
  if (!pageDraft.value || pageDraft.value.slug !== 'home') return;
  const used = new Set(pageDraft.value.sections.map((section) => String(section?.id || '')));
  let number = 4;
  while (used.has(`reason-${number}`)) number += 1;
  pageDraft.value.sections.push({
    id: `reason-${number}`,
    kicker: '',
    shortTitle: `理由 ${number}`,
    introTitle: `首页理由 ${number}`,
    introDetail: '',
    title: `首页理由 ${number}`,
    body: '',
    description: '',
    label: '',
    href: '',
    mode: 'photo',
    items: [],
    media: [],
    ...defaultSectionPresentation()
  });
}

function pageSectionName(section, index) {
  const pageKey = String(pageDraft.value?.slug || '');
  const sectionKey = String(section?.id || '');
  return pageSectionLabels[`${pageKey}:${sectionKey}`]
    || String(section?.title || '').trim()
    || (section?.type ? getPageSectionDefinition(section.type, pageKey)?.label : '')
    || `段落 ${index + 1}`;
}

function addServiceSections() {
  if (!pageDraft.value || !isServicePage()) return;
  const defaults = [
    {
      id: 'hero', kicker: 'SERVICE SUPPORT', title: '售后服务', body: '在线报单、进度追踪、专人支持，全程透明可查', description: '快人一步', label: '在线支持',
      items: [{ label: '全球服务网络 原厂备件保障' }, { label: '国内50多个直属办事处，覆盖全国主要省市' }, { label: '海外 20 余家长期合作经销商' }], media: []
    },
    { id: 'support', title: '瑞钧支持', body: '需要协助 从这里开始', description: '输入设备型号、故障现象、维修进度或保修问题', label: '咨询 AI', media: [] },
    { id: 'support-models', title: '设备型号', body: '', items: [], media: [] },
    { id: 'support-actions', title: '服务选项', body: '选择服务项目，机型可在后续步骤补充', items: [], media: [] },
    { id: 'office-directory', kicker: 'RUIJUN SERVICE NETWORK', title: '国内直属办事处覆盖全国主要省市', body: '', items: [], media: [] }
  ];
  for (const section of defaults) {
    const existing = pageDraft.value.sections.find((item) => item.id === section.id);
    if (existing) {
      for (const [key, value] of Object.entries(section)) {
        if ((existing[key] == null || existing[key] === '' || (Array.isArray(existing[key]) && !existing[key].length)) && key !== 'id') existing[key] = clone(value);
      }
    } else pageDraft.value.sections.push({ ...section, ...defaultSectionPresentation() });
  }
}

function addServiceItem(section, kind) {
  if (!section) return;
  section.items ||= [];
  if (kind === 'model') section.items.push({ label: '新设备型号', media_role: `model-${section.items.length + 1}` });
  else if (kind === 'action') section.items.push({ number: String(section.items.length + 1).padStart(2, '0'), title: '新服务入口', body: '点击后打开对应服务', description: '', media_role: `action-${section.items.length + 1}` });
  else if (kind === 'office') section.items.push({ title: '新区域', media_role: `office-${section.items.length + 1}`, map_media_role: `office-map-${section.items.length + 1}`, offices: [{ address: '门店地址', manager: '负责人', phone: '' }] });
  else section.items.push({ label: '新说明文字' });
}

function removeServiceItem(section, index) {
  if (Array.isArray(section?.items)) section.items.splice(index, 1);
}

function addGenericSectionItem(section) {
  if (!section) return;
  section.items ||= [];
  if (pageDraft.value?.slug === 'manufacturing' && section.id === 'process') {
    section.items.push({ ...createManufacturingProcessNode(section.items.length), ...defaultSectionPresentation() });
    return;
  }
  section.items.push({ label: '', title: '新内容', body: '', description: '', media_role: `item-${section.items.length + 1}`, href: '', sort_order: section.items.length, ...defaultSectionPresentation() });
}

function removeGenericSectionItem(section, index) {
  if (Array.isArray(section?.items)) section.items.splice(index, 1);
}

function moveGenericSectionItem(section, index, direction) {
  if (!Array.isArray(section?.items)) return;
  const target = index + direction;
  if (target < 0 || target >= section.items.length) return;
  const [item] = section.items.splice(index, 1);
  section.items.splice(target, 0, item);
  section.items.forEach((entry, itemIndex) => { entry.sort_order = itemIndex; });
}

function addOffice(section, region) {
  if (!section?.items?.[region]) return;
  section.items[region].offices ||= [];
  section.items[region].offices.push({ address: '门店地址', manager: '负责人', phone: '' });
}

function removeOffice(section, region, index) {
  section?.items?.[region]?.offices?.splice(index, 1);
}

// Roles the website actually binds to a slot. A media entry whose role is empty
// matches none of them, so the element stays read-only on the canvas and the
// operator sees "此为静态素材" even after adding an asset. Derive the role from
// the asset's registered placement so "添加素材" is enough on its own.
const pageMediaSlotRoles = new Set([
  'background', 'image', 'photo', 'primary', 'foreground', 'icon', 'video', 'cover',
  'gallery', 'map', 'drawing', 'technical', 'equipment', 'feature', 'asset'
]);

function addPageMedia(section) {
  const assetId = String(pageMediaSelection.value || '').trim();
  const scope = pageMediaScope();
  // The candidate list has to be passed in: draft-shapes.js is pure and cannot
  // reach the workbench's live media list.
  const candidates = pageMediaOptionsForSection(scope, section);
  if (!section || !assetId || !isPageMediaOptionForSection(assetId, scope, section, candidates)) return;
  section.media ||= [];
  if (!section.media.some((entry) => String(entry.media_asset_id) === assetId)) {
    section.media.push({ media_asset_id: assetId, role: defaultPageMediaRole(section, assetId, pageMediaOptions(scope)) });
  }
  pageMediaSelection.value = '';
}

function removePageMedia(section, assetId) {
  if (!section) return;
  section.media = (section.media || []).filter((entry) => String(entry.media_asset_id) !== String(assetId));
}

function pageMediaLabel(reference) {
  if (!String(reference.media_asset_id ?? '').trim()) return '沿用官网默认图案';
  const asset = pageMediaOptions(pageMediaScope()).find((candidate) => String(candidate.id) === String(reference.media_asset_id));
  return asset ? pageMediaOptionLabel(asset, pageMediaScope()) : `当前引用 ${reference.media_asset_id}（尚未通过此选择器验证）`;
}

// Registry-driven media and list editing. These stay generic so a newly
// registered block type gets a working panel without touching this file.
function sectionSelectOptionLabel(field, value) {
  return field?.optionLabels?.[value] || String(value || '');
}

function addRegisteredSectionMedia(section, field) {
  if (!section || !canEdit(pageDraft.value)) return;
  const assetId = String(pageMediaSelection.value || '').trim();
  const scope = pageMediaScope();
  if (!assetId || !isPageMediaOptionForSection(assetId, scope, section, pageMediaOptionsForSection(scope, section))) return;
  const list = registeredSectionList(section, field);
  const max = Number.isInteger(field.maxItems) ? field.maxItems : 1;
  if (list.length >= max) {
    error.value = `“${field.label}”最多只能有 ${max} 个素材。`;
    return;
  }
  if (list.some((entry) => String(entry.media_asset_id) === assetId)) return;
  const roles = Array.isArray(field.roles) ? field.roles : [];
  list.push({ media_asset_id: assetId, role: roles[0] || 'image' });
  error.value = '';
  pageMediaSelection.value = '';
  recordVisualHistory();
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function removeRegisteredSectionMedia(section, field, assetId) {
  if (!section || !canEdit(pageDraft.value)) return;
  section[field.key] = registeredSectionList(section, field)
    .filter((entry) => String(entry.media_asset_id) !== String(assetId));
  recordVisualHistory();
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function addRegisteredSectionItem(section, field) {
  if (!section || !canEdit(pageDraft.value)) return;
  const list = registeredSectionList(section, field);
  const max = Number.isInteger(field.maxItems) ? field.maxItems : 20;
  if (list.length >= max) {
    error.value = `“${field.label}”最多只能有 ${max} 项。`;
    return;
  }
  list.push(Object.fromEntries((field.itemFields || []).map((itemField) => [itemField.key, ''])));
  error.value = '';
  recordVisualHistory();
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function removeRegisteredSectionItem(section, field, index) {
  if (!section || !canEdit(pageDraft.value)) return;
  registeredSectionList(section, field).splice(index, 1);
  recordVisualHistory();
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function moveRegisteredSectionItem(section, field, index, delta) {
  if (!section || !canEdit(pageDraft.value)) return;
  const list = registeredSectionList(section, field);
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  const [entry] = list.splice(index, 1);
  list.splice(target, 0, entry);
  recordVisualHistory();
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function toggleRegisteredPageSection(section) {
  if (!section?.type || !canEdit(pageDraft.value)) return;
  section.enabled = section.enabled === false;
  recordVisualHistory();
  postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function addPageSection(type) {
  if (!pageDraft.value || !canEdit(pageDraft.value)) return;
  const section = createPageSectionInstance(type, pageDraft.value.slug, pageDraft.value.sections);
  if (!section) {
    error.value = '当前页面没有注册该区块类型。';
    return;
  }
  pageDraft.value.sections.push({ ...section, ...defaultSectionPresentation() });
  activePageSectionKey.value = section.id;
  error.value = '';
  message.value = `已添加“${pageSectionTypeOptions.value.find((item) => item.type === section.type)?.label || section.type}”区块，请填写内容后保存草稿。`;
  recordVisualHistory();
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

// The rendered list can be a filtered group, so an index from v-for does not
// address the underlying array. Always resolve the true position by object.
function pageSectionIndex(section) {
  const sections = Array.isArray(pageDraft.value?.sections) ? pageDraft.value.sections : [];
  return sections.indexOf(section);
}

function movePageSection(from, to) {
  const sections = pageDraft.value?.sections;
  if (!canEdit(pageDraft.value) || !Array.isArray(sections)) return;
  if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return;
  const [entry] = sections.splice(from, 1);
  sections.splice(to, 0, entry);
  recordVisualHistory();
  postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function handleSectionDragStart(section, event) {
  if (!canEdit(pageDraft.value) || !section?.type) return;
  draggingPageSectionKey.value = String(section.id || '');
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(section.id || ''));
  }
}

function handleSectionDrop(section) {
  const sections = Array.isArray(pageDraft.value?.sections) ? pageDraft.value.sections : [];
  const from = sections.findIndex((entry) => String(entry?.id || '') === draggingPageSectionKey.value);
  const to = sections.indexOf(section);
  draggingPageSectionKey.value = '';
  if (from < 0 || to < 0) return;
  movePageSection(from, to);
}

function duplicatePageSection(section) {
  const sections = pageDraft.value?.sections;
  const index = pageSectionIndex(section);
  if (!canEdit(pageDraft.value) || !Array.isArray(sections) || index < 0 || !section?.type) return;
  const clone = createPageSectionInstance(section.type, pageDraft.value.slug, sections);
  if (!clone) {
    error.value = '当前页面没有注册该区块类型。';
    return;
  }
  // Carry the editable content across; the fresh id keeps both blocks independent.
  for (const field of registeredPageSectionFields(section)) {
    if (field.type === 'text' || field.type === 'textarea') clone[field.key] = section[field.key];
    else if (Array.isArray(section[field.key])) clone[field.key] = JSON.parse(JSON.stringify(section[field.key]));
  }
  sections.splice(index + 1, 0, { ...section, ...clone });
  activePageSectionKey.value = clone.id;
  error.value = '';
  message.value = '已复制区块，请确认内容后保存草稿。';
  recordVisualHistory();
  postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

// Presets are declared by the block definition, so applying one is a pure data
// copy. There is no per-type logic here, and an unknown key is a no-op.
function registeredPageSectionPresets(section) {
  if (!section?.type) return [];
  return listPageSectionPresets(section.type, pageDraft.value?.slug || '');
}

function sectionPresetDescription(section) {
  const key = sectionPresetSelection.value[section?.id];
  return registeredPageSectionPresets(section).find((preset) => preset.key === key)?.description || '';
}

function applyRegisteredSectionPreset(section) {
  const key = sectionPresetSelection.value[section?.id];
  if (!section || !key || !canEdit(pageDraft.value)) return;
  Object.assign(section, applyPageSectionPreset(section, key, pageDraft.value.slug));
  sectionPresetSelection.value[section.id] = '';
  error.value = '';
  message.value = '已套用预设，请确认内容后保存草稿。';
  recordVisualHistory();
  postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

// Cross-page reuse. True "shared modules" would need a new collection plus
// reference-integrity rules (what happens when a referenced block is edited or
// deleted), and the site-wide chrome is already component-driven — so the real
// remaining need is "I built this block, I want it on another page". A clipboard
// covers that without inventing a reference graph.
const copiedPageSection = ref(null);

const canPastePageSection = computed(() => {
  const copied = copiedPageSection.value;
  if (!copied?.type || !pageDraft.value || !canEdit(pageDraft.value)) return false;
  return Boolean(getPageSectionDefinition(copied.type, pageDraft.value.slug));
});

function copyPageSectionForReuse(section) {
  if (!section?.type || !canEdit(pageDraft.value)) return;
  copiedPageSection.value = JSON.parse(JSON.stringify(section));
  error.value = '';
  message.value = '已复制区块，切换到目标页面后点击「粘贴区块」。';
}

function pastePageSection() {
  const copied = copiedPageSection.value;
  if (!copied?.type || !pageDraft.value || !canEdit(pageDraft.value)) return;
  const definition = getPageSectionDefinition(copied.type, pageDraft.value.slug);
  if (!definition) {
    error.value = '当前页面没有注册该区块类型，无法粘贴。';
    return;
  }
  const sections = pageDraft.value.sections;
  const clone = createPageSectionInstance(copied.type, pageDraft.value.slug, sections);
  if (!clone) {
    error.value = '无法为此区块生成唯一标识，请重试。';
    return;
  }
  // Carry the source content across; the fresh id keeps the two blocks independent.
  for (const field of definition.fields) {
    if (field.type === 'text' || field.type === 'textarea') clone[field.key] = copied[field.key];
    else if (Array.isArray(copied[field.key])) clone[field.key] = JSON.parse(JSON.stringify(copied[field.key]));
  }
  sections.push({ ...copied, ...clone });
  activePageSectionKey.value = clone.id;
  error.value = '';
  message.value = '已粘贴区块，请确认内容后保存草稿。';
  recordVisualHistory();
  postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

// Registry field edits must reach the canvas as they are typed, otherwise the
// panel and the preview disagree until the next explicit action. The underlying
// queue debounces (80ms) and no-ops while the canvas is closed, so wiring this
// to every input is safe.
function pushPageDraftToPreview() {
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

function removePageSection(section) {
  const sections = pageDraft.value?.sections;
  const index = pageSectionIndex(section);
  if (!canEdit(pageDraft.value) || !Array.isArray(sections) || index < 0 || sections.length <= 1) return;
  if (section.type && !window.confirm(`确定删除“${getPageSectionDefinition(section.type, pageDraft.value.slug)?.label || '自定义区块'}”吗？删除会在保存草稿后生效。`)) return;
  sections.splice(index, 1);
  if (activePageSectionKey.value === section.id) activePageSectionKey.value = '';
  if (section.type) {
    recordVisualHistory();
    postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
    queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  }
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

function addFooterColumn() {
  if (!settingsDraft.value) return;
  settingsDraft.value.footer.columns ||= [];
  settingsDraft.value.footer.columns.push({ title: '', sort_order: settingsDraft.value.footer.columns.length, links: [{ label: '', href: '' }] });
}

function removeFooterColumn(index) {
  settingsDraft.value?.footer?.columns?.splice(index, 1);
}

function addFooterColumnLink(columnIndex) {
  const column = settingsDraft.value?.footer?.columns?.[columnIndex];
  if (!column) return;
  column.links ||= [];
  column.links.push({ label: '', href: '' });
}

function removeFooterColumnLink(columnIndex, linkIndex) {
  const links = settingsDraft.value?.footer?.columns?.[columnIndex]?.links;
  if (links?.length > 1) links.splice(linkIndex, 1);
}

function validateSections(sections, pageSlug = pageDraft.value?.slug) {
  if (!sections.length) return '至少保留一个页面段落。';
  const ids = new Set();
  for (const section of sections) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(section.id)) return '段落标识只能使用小写字母、数字和短横线。';
    if (ids.has(section.id)) return `段落标识“${section.id}”重复。`;
    ids.add(section.id);
    const registeredSectionError = validatePageSectionInstance(section, pageSlug);
    if (registeredSectionError) return registeredSectionError;
    if (section.href && !isValidSiteLink(section.href)) return `段落“${section.id}”的按钮链接只能使用站内路径或 HTTPS 地址。`;
    for (const item of Array.isArray(section.items) ? section.items : []) {
      if (item?.href && !isValidSiteLink(item.href)) return `段落“${section.id}”的重复内容链接只能使用站内路径或 HTTPS 地址。`;
      const itemPresentationError = validateSectionPresentation(item);
      if (itemPresentationError) return `段落“${section.id}”的重复内容：${itemPresentationError}`;
      if (item?.anchor && !['auto', 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].includes(item.anchor)) return `段落“${section.id}”包含不受支持的工艺节点锚点。`;
    }
    const pageSize = Number(section.pagination?.page_size || 6);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 6) return `段落“${section.id}”的每页数量只能是 1 至 6。`;
    const presentationError = validateSectionPresentation(section);
    if (presentationError) return `段落“${section.id}”：${presentationError}`;
  }
  return '';
}

function isValidSiteLink(value) {
  const href = String(value || '').trim();
  if (href.startsWith('#')) return /^#[A-Za-z][A-Za-z0-9:_-]{0,119}$/.test(href);
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

function validateFooterColumns(columns) {
  if (!Array.isArray(columns)) return '页脚栏目配置无效。';
  for (const column of columns) {
    if (!String(column?.title || '').trim()) return '页脚栏目标题不能为空。';
    const errorText = validateSettingLinks(Array.isArray(column.links) ? column.links : [], `页脚栏目“${column.title}”链接`);
    if (errorText) return errorText;
  }
  return '';
}

async function loadPages() {
  const response = await api.get('/items/pages?fields=id,title,slug,language,sections,seo,status,publication_state,source_document,source_url,review_note&sort=title&limit=-1');
  pages.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = pages.value.some((item) => item.id === selectedPageId.value) ? selectedPageId.value : pages.value[0]?.id;
  if (nextId) selectPage(nextId, true); else { selectedPageId.value = ''; pageDraft.value = null; }
}

async function loadHomepageSections() {
  const response = await api.get('/items/homepage_sections?fields=id,page_key,section_key,title,kicker,body,content,media,sort_order,enabled,language,status,publication_state,source_document,source_url,review_note&filter[page_key][_eq]=home&sort=sort_order&limit=-1');
  homepageSections.value = Array.isArray(response.data?.data) ? response.data.data : [];
}

async function loadSeries() {
  const response = await api.get('/items/product_series?fields=id,series_code,slug,name,positioning,presentation,scenarios,capabilities,cover_asset,sort_order,status,publication_state,source_document,source_url,review_note&sort=sort_order,name&limit=-1');
  series.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = series.value.some((item) => item.id === selectedSeriesId.value) ? selectedSeriesId.value : series.value[0]?.id;
  if (nextId) selectSeries(nextId, true); else { selectedSeriesId.value = ''; seriesDraft.value = null; }
}

async function loadModels() {
  const response = await api.get('/items/product_models?fields=id,series_code,model_code,slug,name,parameters,configuration,media,resources,status,publication_state,source_document,source_url,review_note&sort=series_code,model_code&limit=-1');
  models.value = Array.isArray(response.data?.data) ? response.data.data : [];
  // Keep the model form inside the selected series: a global first-model
  // selection made the left form show another family's model after a reload.
  const seriesCode = String(seriesDraft.value?.series_code || '').trim();
  const current = models.value.find((item) => String(item.id) === String(selectedModelId.value));
  const currentInSeries = current && (!seriesCode || String(current.series_code || '').trim() === seriesCode);
  const preferred = seriesCode ? models.value.find((item) => String(item.series_code || '').trim() === seriesCode) : null;
  const nextId = currentInSeries ? current.id : (preferred?.id ?? models.value[0]?.id);
  if (nextId) await selectModel(nextId, true); else { selectedModelId.value = ''; modelDraft.value = null; parameters.value = []; }
}

async function loadCompany() {
  const requests = [
    api.get('/items/milestones?fields=id,source_key,year,event,evidence,media,icon_asset,sort_order,status,publication_state,source_document,source_url,review_note&sort=sort_order,year&limit=-1'),
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
    api.get('/items/service_resources?fields=id,source_key,type,title,summary,body,applicable_models,version,language,asset,cover_asset,display_date,sort_order,updated_at,status,publication_state,source_document,source_url,review_note&sort=sort_order,title&limit=-1'),
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
    api.get('/items/articles?fields=id,slug,category,title,display_date,sort_order,summary,body,body_media,transcript,field_presentation,media,cover_asset,seo,status,publication_state,published_at,source_document,source_url,review_note,publication_log&sort=-display_date,sort_order,-id&limit=-1'),
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
  // page_key / section_key must be selected here: isApprovedVisualMedia rejects
  // an asset whose page/section does not match the canvas target, and without
  // these fields every page-scoped asset silently filtered out (the panel then
  // claimed no approved media existed at all).
  const query = new URLSearchParams({ fields: 'id,file_id,original_file_name,title,mime_type,usage_scope,media_type,poster_asset_id,transcript,placement_key,page_key,section_key,alt_text,status,publication_state,copyright_status,enabled,width,height,aspect_ratio,byte_size', sort: 'original_file_name', limit: '-1' });
  query.set('filter[status][_eq]', 'published');
  query.set('filter[publication_state][_eq]', 'published');
  const response = await api.get(`/items/media_assets?${query.toString()}`);
  mediaAssets.value = Array.isArray(response.data?.data) ? response.data.data : [];
}

async function loadMediaCandidates() {
  const response = await api.get('/items/media_assets?fields=id,file_id,original_file_name,mime_type,byte_size,usage_scope,media_type,width,height,duration_seconds,aspect_ratio,poster_asset_id,placement_key,page_key,section_key,sort_order,enabled,autoplay,muted,loop,title,description,transcript,alt_text,copyright_status,authorization_note,status,publication_state,review_note&sort=original_file_name&limit=-1');
  clearMediaPreviews();
  mediaCandidates.value = Array.isArray(response.data?.data) ? response.data.data : [];
  mediaPosterSelections.value = Object.fromEntries(mediaCandidates.value.map((asset) => [String(asset.id), String(asset.poster_asset_id || '')]));
  if (activeTab.value === 'media') await loadMediaPreviews();
}

async function loadKnowledge() {
  const response = await api.get('/items/knowledge_items?fields=id,source_key,visibility,channel,category,question_title,applicable_models,error_codes,symptoms,troubleshooting_steps,risk_level,safety_preconditions,escalation_guidance,media,version,display_date,sort_order,technical_reviewer,dify_sync_status,status,publication_state,source_document,source_url,review_note&sort=sort_order,question_title&limit=-1');
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
    const query = new URLSearchParams({ fields: 'id,model_code,field_name,value,unit,presentation,sort_order,test_conditions,status,publication_state', sort: 'sort_order,field_name', limit: '-1' });
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
  // The visual canvas needs private draft assets for authenticated preview,
  // even when the current editor cannot access the advanced media manager.
  const everyday = () => [loadPages(), loadHomepageSections(), loadSeries(), loadCompany(), loadEditorial(), loadMediaAssets(), loadMediaCandidates()];
  const technical = () => (technicalAccess.value
    ? [loadModels(), loadService(), loadRepairPages(), loadKnowledge(), loadSettings()]
    : []);

  try {
    await Promise.all([...everyday(), ...technical()]);
    markDraftSaved();
    message.value = '已加载当前账号有权限查看的结构化内容。';
  } catch (reason) {
    // A load right after a page reload can race the admin app's own session
    // handoff: the extension mounts with no access token, /auth/refresh answers
    // 400 ("The refresh token is required in either the payload or cookie"), and
    // every content call comes back 403. The handshake completes a moment later,
    // and Promise.all's siblings keep running anyway, so the page is in fact
    // loaded and editable — leaving the panel reporting "无法读取后台内容" would
    // send the operator hunting a permission problem that does not exist.
    // One retry settles it; the error is only kept if it persists.
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    try {
      await Promise.all([...everyday(), ...technical()]);
      error.value = '';
      markDraftSaved();
      message.value = '已加载当前账号有权限查看的结构化内容。';
    } catch (retryReason) {
      error.value = apiError(retryReason, '无法读取后台内容。请确认当前账号有内容读取权限。');
    }
  } finally {
    loading.value = false;
  }
}

async function savePage() {
  if (!pageDraft.value || !canEdit(pageDraft.value)) return;
  // Canvas-only empty media slots make every editable location selectable, but
  // they are not content: normalizePageMediaReferences drops any entry without an
  // asset id. Validation therefore has to judge the shape that will actually be
  // persisted, not the canvas draft — otherwise those placeholders are read as
  // "未登记的素材" and every save is rejected. This only started biting once the
  // service page's sections gained a registered `type`: unregistered legacy
  // sections skip field validation entirely, so the placeholders went unnoticed.
  const persistedSections = normalizeSections(pageDraft.value.sections);
  const sectionError = validateSections(persistedSections);
  if (sectionError) { error.value = sectionError; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    const pageBefore = JSON.stringify(pageDraft.value);
    const seo = { ...pageDraft.value.seo };
    if (seo.keywords) seo.keywords = String(seo.keywords).split(',').map((item) => item.trim()).filter(Boolean);
    else delete seo.keywords;
    if (!seo.title) delete seo.title;
    if (!seo.description) delete seo.description;
    await api.patch(`/items/pages/${encodeURIComponent(pageDraft.value.id)}`, { title: pageDraft.value.title, slug: pageDraft.value.slug, language: pageDraft.value.language, sections: persistedSections, seo });
    if (JSON.stringify(pageDraft.value) !== pageBefore) {
      message.value = '页面草稿已保存；保存期间又有新的修改，尚未写入，请再次保存。';
      await refreshAfterSave([]);
      return;
    }
    message.value = '页面草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    // A newly attached draft asset is not part of the previous one-time
    // preview session's allow-list. Renew it after a successful page save so
    // the canvas keeps working without requiring a manual reconnect.
    await refreshAfterSave([loadPages]);
  } catch (reason) {
    setSaveError(reason, '保存页面失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveHomepageSection() {
  const record = activeTab.value === 'homepage_sections' ? homepageSectionDraft.value : null;
  if (!record || !canEdit(record)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    const payload = {
      page_key: record.page_key,
      section_key: record.section_key,
      title: record.title,
      kicker: record.kicker,
      body: record.body,
      content: record.content,
      media: record.media,
      sort_order: record.sort_order,
      enabled: record.enabled,
      language: record.language,
      source_document: record.source_document,
      source_url: record.source_url,
      review_note: record.review_note
    };
    await api.patch(`/items/homepage_sections/${encodeURIComponent(record.id)}`, payload);
    message.value = '首页区块草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    let reloaded = true;
    try { await loadHomepageSections(); } catch { reloaded = false; message.value += '（列表刷新失败，请重新加载页面查看）'; }
    const persisted = reloaded ? homepageSections.value.find((item) => String(item.id) === String(record.id)) : null;
    if (persisted) {
      homepageSectionDraft.value = clone(persisted);
      markDraftSaved();
    } else if (reloaded) {
      message.value += '（保存成功，但未能回读该区块，请重新加载页面）';
    }
    await refreshAfterSave([]);
  } catch (reason) {
    setSaveError(reason, '保存首页区块失败，内容没有更新。');
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
    markDraftSaved();
    await refreshAfterSave([loadRepairPages]);
  } catch (reason) { error.value = apiError(reason, '保存售后页面草稿失败。'); }
  finally { saving.value = false; }
}

async function saveSeries() {
  if (!seriesDraft.value || !canEdit(seriesDraft.value)) return;
  const invalidDetailFeature = (seriesDraft.value.detail?.features || []).find((feature) => !String(feature?.label || '').trim());
  if (invalidDetailFeature) { error.value = '每个设备组成项都必须填写标题。'; return; }
  const previous = series.value.find((item) => String(item.id) === String(seriesDraft.value.id));
  const previousCode = String(previous?.series_code || '').trim();
  const nextCode = String(seriesDraft.value.series_code || '').trim();
  if (!nextCode) { error.value = '所属系列编码不能为空。'; return; }
  if (series.value.some((item) => String(item.id) !== String(seriesDraft.value.id) && String(item.series_code || '').trim() === nextCode)) {
    error.value = '该系列编码已被其他系列使用，请换一个。';
    return;
  }
  // `product_models.series_code` is a denormalized copy, not a foreign key.
  // Renaming a series used to leave every child model on the old code, so new
  // models kept inheriting a stale series. Cascade the rename explicitly.
  const renamedModels = previousCode && previousCode !== nextCode
    ? models.value.filter((model) => String(model.series_code || '').trim() === previousCode)
    : [];
  if (renamedModels.length) {
    const locked = renamedModels.filter((model) => !canEdit(model));
    if (locked.length) {
      error.value = `该系列下有 ${locked.length} 个已发布或审核中的机型，修改系列编码前请先下线；本次未保存。`;
      return;
    }
    if (!window.confirm(`系列编码将从「${previousCode}」改为「${nextCode}」，并同步更新 ${renamedModels.length} 个机型。确认保存？`)) return;
  }
  saving.value = true; error.value = ''; message.value = '';
  try {
    const seriesBefore = JSON.stringify(seriesDraft.value);
    const detail = normalizeSeriesDetail(seriesDraft.value.detail);
    const presentation = { ...(seriesDraft.value.presentation || {}) };
    if (detail) presentation.detail = detail; else delete presentation.detail;
    await api.patch(`/items/product_series/${encodeURIComponent(seriesDraft.value.id)}`, { series_code: seriesDraft.value.series_code, slug: seriesDraft.value.slug, name: seriesDraft.value.name, positioning: seriesDraft.value.positioning || null, presentation: Object.keys(presentation).length ? presentation : null, scenarios: fromTextList(seriesDraft.value.scenariosText), capabilities: fromTextList(seriesDraft.value.capabilitiesText), cover_asset: seriesDraft.value.cover_asset || null, sort_order: Number(seriesDraft.value.sort_order) || 0 });
    for (const model of renamedModels) {
      await api.patch(`/items/product_models/${encodeURIComponent(model.id)}`, { series_code: nextCode });
    }
    message.value = renamedModels.length
      ? `产品系列草稿已保存，并同步更新 ${renamedModels.length} 个机型的所属系列编码。`
      : '产品系列草稿已保存，并已进入内容版本审计。';
    if (JSON.stringify(seriesDraft.value) !== seriesBefore) {
      message.value = '产品系列草稿已保存；保存期间又有新的修改，尚未写入，请再次保存。';
      await refreshAfterSave([]);
      return;
    }
    markDraftSaved();
    await refreshAfterSave(renamedModels.length ? [loadSeries, loadModels] : [loadSeries]);
    if (renamedModels.length && modelDraft.value && renamedModels.some((model) => String(model.id) === String(modelDraft.value.id))) {
      modelDraft.value.series_code = nextCode;
    }
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
      payload = { year: Number(companyDraft.value.year), event: companyDraft.value.event, evidence: companyDraft.value.evidence, media: companyDraft.value.mediaReferences, icon_asset: companyDraft.value.icon_asset || null, sort_order: Number(companyDraft.value.sort_order) || 0 };
    } else if (companyMode.value === 'qualifications') {
      payload = { type: companyDraft.value.type, name: companyDraft.value.name, certificate_number: companyDraft.value.certificate_number || null, issuer: companyDraft.value.issuer || null, valid_until: companyDraft.value.valid_until || null, authorization_status: companyDraft.value.authorization_status, assets: companyDraft.value.mediaReferences, sort_order: Number(companyDraft.value.sort_order) || 0 };
    } else {
      payload = { process: companyDraft.value.process, description: companyDraft.value.description, inspection_evidence: companyDraft.value.inspection_evidence || null, media: companyDraft.value.mediaReferences, sort_order: Number(companyDraft.value.sort_order) || 0 };
    }
    await api.patch(`/items/${encodeURIComponent(companyMode.value)}/${encodeURIComponent(companyDraft.value.id)}`, payload);
    message.value = '企业资料草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    await refreshAfterSave([loadCompany]);
  } catch (reason) {
    error.value = apiError(reason, '保存企业资料失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function createServiceResource() {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const response = await api.post('/items/service_resources', {
      source_key: nextServiceKey('service-resource'), type: 'video', title: '未命名服务资料', language: 'zh-CN',
      applicable_models: [], sort_order: service.value.service_resources.length, status: 'draft', publication_state: 'unpublished'
    });
    const id = response.data?.data?.id;
    await loadService();
    if (id) selectServiceRecord(id, true);
    message.value = '新的服务资料草稿已创建。请填写内容并关联已审核的文件。';
  } catch (reason) { error.value = apiError(reason, '创建服务资料草稿失败。'); }
  finally { saving.value = false; }
}

async function createKnowledgeRecord() {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const response = await api.post('/items/knowledge_items', {
      source_key: nextServiceKey('website-knowledge'), visibility: 'public', channel: 'website', category: 'knowledge_share',
      question_title: '未命名知识内容', applicable_models: [], error_codes: [], symptoms: '', troubleshooting_steps: [{ type: 'manual_step', content: '请填写内容' }],
      risk_level: 'low', safety_preconditions: [], media: [], version: 'v1.0', technical_reviewer: '待指定',
      sort_order: knowledgeItems.value.length, status: 'draft', publication_state: 'unpublished'
    });
    const id = response.data?.data?.id;
    await loadKnowledge();
    if (id) selectKnowledge(id, true);
    message.value = '新的官网知识草稿已创建。';
  } catch (reason) { error.value = apiError(reason, '创建官网知识草稿失败。'); }
  finally { saving.value = false; }
}

async function saveServiceRecord() {
  if (!serviceDraft.value || !canEdit(serviceDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    let payload;
    if (serviceMode.value === 'service_resources') {
      payload = { type: serviceDraft.value.type, title: serviceDraft.value.title, summary: serviceDraft.value.summary || null, body: serviceDraft.value.body || null, applicable_models: fromTextList(serviceDraft.value.applicableModelsText), version: serviceDraft.value.version || null, language: serviceDraft.value.language || null, asset: serviceDraft.value.asset || null, cover_asset: serviceDraft.value.cover_asset || null, display_date: serviceDraft.value.display_date || null, sort_order: Number(serviceDraft.value.sort_order) || 0, updated_at: serviceDraft.value.updated_at || null };
    } else if (serviceMode.value === 'service_locations') {
      const contact = Object.fromEntries(Object.entries(serviceDraft.value.contact || {}).filter(([, value]) => String(value || '').trim()));
      payload = { region: serviceDraft.value.region, city: serviceDraft.value.city, service_scope: serviceDraft.value.service_scope, contact, business_status: serviceDraft.value.business_status || null, valid_until: serviceDraft.value.valid_until || null };
    } else {
      payload = { url: serviceDraft.value.url, enabled: serviceDraft.value.enabled === true, open_mode: serviceDraft.value.open_mode, fallback_phone: serviceDraft.value.fallback_phone || null, health_status: serviceDraft.value.health_status || null };
    }
    await api.patch(`/items/${encodeURIComponent(serviceMode.value)}/${encodeURIComponent(serviceDraft.value.id)}`, payload);
    message.value = '服务支持草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    await refreshAfterSave([loadService]);
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
      display_date: knowledgeDraft.value.display_date || null,
      sort_order: Number(knowledgeDraft.value.sort_order) || 0,
      technical_reviewer: knowledgeDraft.value.technical_reviewer
    });
    message.value = '常见问题知识草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    await refreshAfterSave([loadKnowledge]);
  } catch (reason) {
    error.value = apiError(reason, '保存常见问题知识草稿失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function createMediaCandidate() {
  const file = mediaDraft.value.file;
  const fileError = validateMediaCandidate();
  if (fileError) { error.value = fileError; return; }
  const contentError = await validateMediaFileContent(file, mediaDraft.value.media_type);
  if (contentError) { error.value = contentError; return; }
  saving.value = true; error.value = ''; message.value = '';
  let uploadedFileId = '';
  let mediaRegistered = false;
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
    const serverWidth = Number(uploaded?.width);
    const serverHeight = Number(uploaded?.height);
    const serverDuration = Number(uploaded?.duration);
    const browserWidth = Number(mediaDraft.value.width);
    const browserHeight = Number(mediaDraft.value.height);
    const metadataUnavailable = mediaDraft.value.media_type !== 'document'
      && !(Number.isInteger(serverWidth) && serverWidth > 0 && Number.isInteger(serverHeight) && serverHeight > 0)
      && !(Number.isInteger(browserWidth) && browserWidth > 0 && Number.isInteger(browserHeight) && browserHeight > 0);
    // Directus does not populate video dimensions for every codec. The media
    // governance hook still requires positive dimensions, so retain the upload
    // and record the selected placement's minimum as a review-needed fallback.
    const width = mediaDraft.value.media_type === 'document' ? 0 : Number.isInteger(serverWidth) && serverWidth > 0
      ? serverWidth
      : Number.isInteger(browserWidth) && browserWidth > 0
        ? browserWidth
        : (selectedMediaPlacement.value?.minWidth || 1);
    const height = mediaDraft.value.media_type === 'document' ? 0 : Number.isInteger(serverHeight) && serverHeight > 0
      ? serverHeight
      : Number.isInteger(browserHeight) && browserHeight > 0
        ? browserHeight
        : (selectedMediaPlacement.value?.minHeight || 1);
    const durationSeconds = Number.isFinite(serverDuration) && serverDuration >= 0 ? Math.ceil(serverDuration) : mediaDraft.value.duration_seconds;
    const divisor = width > 0 && height > 0 ? greatestCommonDivisor(width, height) : 0;
    await api.post('/items/media_assets', {
      file_id: uploadedFileId,
      original_file_name: uploaded.filename_download,
      mime_type: uploaded.type,
      byte_size: Number(uploaded.filesize),
      usage_scope: mediaDraft.value.usage_scope,
      media_type: mediaDraft.value.media_type,
      width: width || null,
      height: height || null,
      duration_seconds: durationSeconds || null,
      aspect_ratio: mediaDraft.value.aspect_ratio || (divisor ? `${width / divisor}:${height / divisor}` : null),
      poster_asset_id: mediaDraft.value.poster_asset_id || null,
      placement_key: mediaDraft.value.placement_key,
      page_key: mediaDraft.value.page_key || null,
      section_key: mediaDraft.value.section_key || null,
      sort_order: Number(mediaDraft.value.sort_order) || 0,
      enabled: mediaDraft.value.enabled === true,
      autoplay: mediaDraft.value.media_type === 'video' && mediaDraft.value.autoplay === true,
      muted: mediaDraft.value.media_type !== 'video' || mediaDraft.value.muted !== false,
      loop: mediaDraft.value.media_type === 'video' && mediaDraft.value.loop === true,
      title: mediaDraft.value.title || null,
      description: mediaDraft.value.description || null,
      transcript: mediaDraft.value.transcript || null,
      alt_text: mediaDraft.value.alt_text || null,
      copyright_status: mediaDraft.value.copyright_status,
      authorization_note: mediaDraft.value.authorization_note || null,
      // Media assets are published on upload; the publication hook normalizes
      // these fields, but sending them makes the workbench intent explicit.
      status: 'published',
      publication_state: 'published',
    });
    mediaRegistered = true;
    saving.value = false;
    mediaDraft.value = emptyMediaDraft();
    if (mediaFileInput.value) mediaFileInput.value.value = '';
    message.value = metadataUnavailable
      ? '媒体素材已上传并发布。浏览器未能读取真实尺寸，后台按展示位建议尺寸标记，请核对显示效果。'
      : '媒体素材已上传并发布，可直接在画布中使用。';
    await Promise.all([loadMediaCandidates(), loadMediaAssets()]);
    markDraftSaved();
  } catch (reason) {
    if (uploadedFileId && !mediaRegistered) {
      try { await api.delete(`/files/${encodeURIComponent(uploadedFileId)}`); } catch { /* Keep the original error if orphan cleanup is unavailable. */ }
    }
    error.value = mediaRegistered
      ? '素材已登记，但列表刷新失败。文件已保留，请重新加载，不要重复上传。'
      : apiError(reason, '媒体上传或候选登记失败，官网内容没有更新。');
  } finally { saving.value = false; }
}

async function createEditorialRecord({ media = [] } = {}) {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const payload = editorialMode.value === 'articles'
      ? { slug: nextDraftSlug('article'), category: editorialCategory.value || 'news', title: '未命名文章', display_date: new Date().toISOString().slice(0, 10), sort_order: 0, summary: '', body: '', transcript: '', media: Array.isArray(media) ? media : [], seo: {}, published_at: new Date().toISOString().slice(0, 10), status: 'draft', publication_state: 'unpublished' }
      : { slug: nextDraftSlug('case-study'), industry: '', material: '', thickness: '', model_code: '', process: '', result: '', authorization_status: 'review_required', status: 'draft', publication_state: 'unpublished' };
    const response = await api.post(`/items/${encodeURIComponent(editorialMode.value)}`, payload);
    const id = response.data?.data?.id;
    await loadEditorial();
    if (id) selectEditorialRecord(id, true);
    markDraftSaved();
    invalidateSubmissionQueue();
    message.value = editorialMode.value === 'articles' ? '新的文章草稿已创建。' : '新的客户案例草稿已创建。';
  } catch (reason) {
    error.value = apiError(reason, '创建草稿失败，请确认当前账号拥有内容编辑权限。');
  } finally { saving.value = false; }
}

// 画布内的“新建内容”：从新闻列表画布直接建一篇视频分享或动态新闻，
// 建完自动切到该文章的详情画布，不离开画布去左侧表单。
async function createEditorialFromCanvas(category) {
  if (category === 'video') {
    if (!confirmDiscardChanges('新增视频分享')) return;
    // 从专注画布点“新增视频分享”时，编辑区被专注样式隐藏；先退出专注，
    // 再切到视频分享工作区并打开新增弹窗。
    visualCanvasFocus.value = false;
    editorialMode.value = 'articles';
    editorialCategory.value = 'video';
    activeTab.value = 'editorial';
    await nextTick();
    videoShareWorkspace.value?.openCreate();
    return;
  }
  if (!confirmDiscardChanges('新建内容')) return;
  visualCanvasFocus.value = false;
  editorialMode.value = 'articles';
  editorialCategory.value = 'news';
  activeTab.value = 'editorial';
  await createEditorialRecord();
  if (!editorialDraft.value?.id) return;
  editorialCategory.value = 'news';
  articlePreviewSurface.value = 'detail';
  await nextTick();
  if (!liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  message.value = '已新建动态新闻草稿，可直接在画布中编辑。';
}

const createArticleOpen = ref(false);
const createArticleCategory = ref('news');
const createArticleTitle = ref('');
const createArticleMediaId = ref('');
const createArticleSaving = ref(false);
const createArticleMediaOptions = computed(() => {
  const wantVideo = createArticleCategory.value === 'video';
  return [...mediaAssets.value].filter((asset) => (
    String(asset.media_type || '').toLowerCase() === (wantVideo ? 'video' : 'image')
    && asset.enabled !== false
    && (!wantVideo || String(asset.placement_key || '') === 'news.video_share.list')
  ));
});
function closeCreateArticle() {
  createArticleOpen.value = false;
  createArticleMediaId.value = '';
}
function createArticleFromCanvas(category) {
  if (category === 'video') {
    void createEditorialFromCanvas('video');
    return;
  }
  createArticleCategory.value = 'news';
  createArticleTitle.value = createArticleCategory.value === 'video' ? '新建视频分享' : '新建动态新闻';
  createArticleMediaId.value = '';
  createArticleOpen.value = true;
}
async function confirmCreateArticle() {
  const title = createArticleTitle.value.normalize('NFKC').trim().slice(0, 240);
  if (!title) { error.value = '标题不能为空。'; return; }
  const isVideo = createArticleCategory.value === 'video';
  const mediaId = String(createArticleMediaId.value || '').trim();
  createArticleSaving.value = true; error.value = ''; message.value = '';
  try {
    const payload = {
      slug: nextDraftSlug('article'),
      category: isVideo ? 'video' : 'news',
      title,
      display_date: new Date().toISOString().slice(0, 10),
      sort_order: 0, summary: '', body: '', transcript: '', seo: {},
      media: isVideo && mediaId ? [{ media_asset_id: mediaId }] : [],
      published_at: new Date().toISOString().slice(0, 10),
      status: 'draft', publication_state: 'unpublished'
    };
    // 动态新闻的图片是封面字段，不是视频文章那种 media 列表。
    if (!isVideo && mediaId) payload.cover_asset = mediaId;
    await api.post('/items/articles', payload);
    createArticleOpen.value = false;
    await Promise.all([loadEditorial(), loadMediaAssets()]);
    await startLiveWebsitePreview();
    message.value = `已新增「${title}」${mediaId ? '并绑定所选媒体' : ''}，可在画布中继续编辑。`;
  } catch (reason) {
    error.value = apiError(reason, '新增文章失败。');
  } finally {
    createArticleSaving.value = false;
  }
}

// 文章信息面板可能先在“页面草稿”状态下被打开；此时直接编辑 editorialDraft
// 不会改变当前草稿指纹，保存草稿会一直是灰的。聚焦面板时先切到该文章草稿。
function ensureArticleDraftActive() {
  const record = selectedVisualRecord.value?.record;
  if (!record?.id) return;
  if (activeTab.value === 'editorial' && String(editorialDraft.value?.id || '') === String(record.id)) return;
  activateVisualEditingTarget({ collection: 'articles', itemId: record.id, fieldPath: selectedVisualElement.value?.fieldPath || '' });
}

async function deleteSelectedVisualArticle() {  const record = selectedVisualRecord.value?.record;
  if (!record?.id) return;
  await deleteArticleFromCanvas({ collection: 'articles', targetItemId: String(record.id), label: `删除 ${record.title || ''}` });
}

async function deleteSelectedVideoShareCard() {
  const mediaAssetId = String(selectedVisualElement.value?.mediaAssetId || '').trim();
  if (!mediaAssetId) return;
  await deleteCandidateMedia({
    mediaAssetId,
    label: `删除 ${selectedVisualElement.value?.label || '当前视频分享卡片'}`
  });
  clearVisualSelection();
}

async function deleteSelectedArticleBodyImage() {
  const mediaAssetId = String(selectedVisualElement.value?.mediaAssetId || '').trim();
  const draft = editorialDraft.value;
  if (!mediaAssetId || !draft?.body) return;
  const container = document.createElement('div');
  container.innerHTML = String(draft.body);
  const image = [...container.querySelectorAll('img')]
    .find((node) => String(node.getAttribute('data-cms-preview-media-asset-id') || '') === mediaAssetId);
  if (!image) { error.value = '正文中找不到这张图片的受控记录。'; return; }
  image.remove();
  draft.body = container.innerHTML;
  visualMediaSaving.value = true; error.value = ''; message.value = '';
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: mediaAssetId });
    message.value = '正文图片已删除，保存草稿后官网生效。';
  } catch (reason) {
    error.value = apiError(reason, '图片已从正文移除，但素材仍被其他内容引用，未删除媒体资产。');
  } finally {
    visualMediaSaving.value = false;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    queueLivePreviewUpdate(selectedVisualRecord.value);
    clearVisualSelection();
  }
}

// Canvas "＋ / ×" buttons name one of these arrays directly. The allowlist keeps
// the command surface as small as the two detail editors that expose it.
const canvasListPaths = new Set(['configuration.features', 'detail.features']);

function canvasListTarget(collection, itemId) {
  if (collection === 'product_models') return modelDraft.value && String(modelDraft.value.id) === itemId ? modelDraft.value : null;
  if (collection === 'product_series') return seriesDraft.value && String(seriesDraft.value.id) === itemId ? seriesDraft.value : null;
  return null;
}

// A record whose detail was never initialized renders the website original. Both
// "＋" and "×" seed that original into the draft first, otherwise the edit would
// replace the visible copy with a single blank row (add) or hit nothing at all
// (remove). Returns false when nothing can be seeded.
function seedCanvasListDetail(collection, record) {
  if (collection === 'product_models') {
    if (Array.isArray(record.configuration?.features) && record.configuration.features.length) return true;
    initializeModelDetail();
    if (Array.isArray(record.configuration?.features) && record.configuration.features.length) return true;
    error.value = '该型号没有可初始化的官网原版详情，请先在左侧表单新增。';
    return false;
  }
  if (collection === 'product_series') {
    if (Array.isArray(record.detail?.features) && record.detail.features.length) return true;
    if (!seriesSupportsDetail.value) {
      error.value = '该系列属于型号型系列，没有系列级详情；请先选中具体型号再编辑它的介绍与特点。';
      return false;
    }
    initializeSeriesDetail();
    if (Array.isArray(record.detail?.features) && record.detail.features.length) return true;
    error.value = '该系列没有可初始化的官网原版详情，请先在左侧表单新增。';
    return false;
  }
  return false;
}

// The page only knows the series it displays; it cannot see models that are still
// drafts, so the workbench owns the lookup. A model of that series wins, otherwise
// the series record itself (the workstation has no model record).
function canvasListOwner(payload) {
  const seriesCode = String(payload?.seriesCode || '').trim();
  const explicitCollection = String(payload?.collection || '');
  const explicitId = String(payload?.itemId || '').trim();
  if (explicitCollection === 'product_models' && explicitId) {
    const record = models.value.find((model) => String(model.id) === explicitId);
    if (record && (!seriesCode || String(record.series_code || '') === seriesCode)) {
      return { collection: 'product_models', itemId: explicitId };
    }
  }
  if (!seriesCode) return null;
  const model = models.value.find((candidate) => String(candidate.series_code || '') === seriesCode);
  if (model) return { collection: 'product_models', itemId: String(model.id) };
  const series = series.value.find((candidate) => String(candidate.series_code || '') === seriesCode || String(candidate.slug || '') === seriesCode);
  if (series) return { collection: 'product_series', itemId: String(series.id) };
  return null;
}

async function applyCanvasListAction(kind, payload) {
  const requestedPath = String(payload?.listPath || '').trim();
  if (!canvasListPaths.has(requestedPath)) return;
  const owner = canvasListOwner(payload);
  if (!owner) { error.value = '画布没有识别到该详情所属的系列，请先在左侧选中系列后再增删。'; return; }
  const collection = owner.collection;
  const itemId = owner.itemId;
  // The page cannot know whether the resolved owner is a model or a series (the
  // workstation has no model record), so map the array onto the owner.
  const path = collection === 'product_series' && requestedPath === 'configuration.features'
    ? 'detail.features'
    : collection === 'product_models' && requestedPath === 'detail.features'
      ? 'configuration.features'
      : requestedPath;
  let record = canvasListTarget(collection, itemId);
  if (!record) {
    // The canvas can show the detail panel while the left side edits a page.
    // Load the owning draft directly (selectSeries/selectModel compare ids with
    // ===, so pass the raw record id).
    if (collection === 'product_models') {
      const target = models.value.find((model) => String(model.id) === itemId);
      if (!target) { error.value = '没有找到该详情对应的型号记录，请先在左侧选中型号。'; return; }
      await selectModel(target.id, true);
    } else {
      const target = series.value.find((candidate) => String(candidate.id) === itemId);
      if (!target) { error.value = '没有找到该详情对应的系列记录，请先在左侧选中系列。'; return; }
      selectSeries(target.id, true, false, false);
    }
    record = canvasListTarget(collection, itemId);
  }
  if (!record || !canEdit(record)) { error.value = '该内容当前不可编辑，无法在画布中增删列表项。'; return; }
  error.value = '';
  if (kind === 'remove') {
    const index = Number(payload?.listIndex);
    const items = path.split('.').reduce((cursor, part) => (cursor && typeof cursor === 'object' ? cursor[part] : null), record);
    const label = String(payload?.listLabel || (Array.isArray(items) ? items[index]?.label : '') || '').trim();
    if (!window.confirm(`确认删除${label ? `「${label}」` : `第 ${index + 1} 项`}吗？该操作会在保存草稿后生效。`)) return;
    if (!seedCanvasListDetail(collection, record)) return;
    const removed = removeVisualListItemAt(record, path, index);
    if (!removed) return;
    clearVisualSelection();
    recordVisualHistory();
    postLivePreviewUpdate({ collection, record });
    queueLivePreviewUpdate({ collection, record });
    message.value = '已删除一项，保存草稿后生效。';
    return;
  }
  if (!seedCanvasListDetail(collection, record)) return;
  const added = appendVisualListItem(record, path);
  if (!added) {
    error.value = '当前详情没有可新增的列表，请先在左侧初始化详情。';
    return;
  }
  recordVisualHistory();
  postLivePreviewUpdate({ collection, record });
  queueLivePreviewUpdate({ collection, record });
  message.value = '已写入官网原版详情并追加一条空白条目，填写标题后保存草稿即可。';
}

// A product-series card is a `product_series` record with models and parameters
// hanging off its series code. Creating one is a draft; deleting one is only
// allowed while it has no models and has never been published.
// A draft card in the canvas has no editable form of its own yet: clicking its name
// opens the series in the left panel (and shows that series in the canvas).
// "＋ 新增系列卡片" opens a form first: the operator types the name/positioning and
// picks a cover, then confirms — the card is created with real content instead of
// a placeholder that then has to be hunted down in the draft strip.
const seriesCreateOpen = ref(false);
const seriesCreateSaving = ref(false);
const seriesCreateError = ref('');
const seriesCreateDraft = reactive({ name: '', code: '', positioning: '', coverAssetId: '' });
const seriesCreateCoverOptions = computed(() => editableMediaAssetsForPlacement('product', 'product.series.cover', 'image'));
// The series code is the business key that models/parameters hang off. Suggest
// it from the English part of the name, but never overwrite a code the operator
// edited by hand.
const seriesCodeTouched = ref(false);

function suggestedSeriesCode(name) {
  const ascii = String(name || '').normalize('NFKC')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return ascii.replace(/-{2,}/g, '-');
}

function availableSeriesCode(base) {
  if (!base) return '';
  const used = new Set(series.value.map((item) => String(item.series_code || '').toLowerCase()));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function applySeriesCodeSuggestion() {
  if (seriesCodeTouched.value) return;
  const suggestion = suggestedSeriesCode(seriesCreateDraft.name);
  seriesCreateDraft.code = suggestion ? availableSeriesCode(suggestion) : '';
}

watch(() => seriesCreateDraft.name, () => {
  if (seriesCreateOpen.value) applySeriesCodeSuggestion();
});

function openSeriesCreateDialog() {
  if (seriesCreateSaving.value) return;
  const position = Math.min(0, ...series.value.map((item) => Number(item.sort_order) || 0)) - 1;
  seriesCreateDraft.name = '';
  seriesCreateDraft.code = '';
  seriesCreateDraft.positioning = '';
  seriesCreateDraft.coverAssetId = '';
  seriesCodeTouched.value = false;
  seriesCreateError.value = '';
  seriesCreateOpen.value = true;
}

function closeSeriesCreateDialog() {
  if (seriesCreateSaving.value) return;
  seriesCreateOpen.value = false;
  seriesCreateError.value = '';
}

async function confirmSeriesCreate() {
  const name = String(seriesCreateDraft.name || '').trim();
  if (!name) { seriesCreateError.value = '请填写系列名称。'; return; }
  const code = String(seriesCreateDraft.code || '').trim();
  if (!code) { seriesCreateError.value = '请填写系列编码；中文名称不会自动生成编码，请手动填写英文编码。'; return; }
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(code)) { seriesCreateError.value = '系列编码只能使用小写字母、数字和连字符，且以字母或数字开头。'; return; }
  if (series.value.some((item) => String(item.series_code || '').toLowerCase() === code.toLowerCase())) {
    seriesCreateError.value = `系列编码「${code}」已被其他系列使用，请换一个。`;
    return;
  }
  const position = Math.min(0, ...series.value.map((item) => Number(item.sort_order) || 0)) - 1;
  seriesCreateSaving.value = true;
  seriesCreateError.value = '';
  error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_series', {
      series_code: code,
      slug: `new-series-${Date.now().toString(36)}`,
      name,
      positioning: String(seriesCreateDraft.positioning || '').trim() || '待填写',
      ...(String(seriesCreateDraft.coverAssetId || '').trim() ? { cover_asset: String(seriesCreateDraft.coverAssetId).trim() } : {}),
      sort_order: position,
      status: 'draft',
      publication_state: 'unpublished'
    });
    const record = created?.data?.data;
    if (record?.id != null) {
      series.value = [...series.value, record];
      // Push the record before selecting it: the canvas can only switch to a
      // card it already knows about.
      postLivePreviewUpdate({ collection: 'product_series', record });
      queueLivePreviewUpdate({ collection: 'product_series', record });
      selectSeries(record.id, true);
      livePreviewFrame.value?.contentWindow?.postMessage({
        type: 'ruijun:cms-preview:notice',
        kind: 'series-added',
        itemId: String(record.id),
        label: record.name || record.series_code || '新系列'
      }, livePreviewWebsiteOrigin.value);
    } else {
      await loadSeries();
    }
    message.value = `已新增草稿卡片「${name}」，可在左侧继续补充详情后保存。`;
    seriesCreateOpen.value = false;
  } catch (reason) {
    seriesCreateError.value = apiError(reason, '新增系列卡片失败。');
  } finally {
    seriesCreateSaving.value = false;
  }
}
// A model chip in the canvas taps straight into the workbench: an existing record is
// selected, a template-only name gets a draft record so its name becomes editable.
async function focusCanvasModel(payload) {
  const code = String(payload?.modelCode || payload?.modelName || '').trim();
  if (!code) { error.value = '画布没有识别到机型名称。'; return; }
  const activeWasDirty = hasUnsavedChanges.value;
  const dirtyKeysBefore = new Set(dirtyCachedDraftKeys());
  const seriesCode = String(payload?.seriesCode || '').trim();
  const modelId = String(payload?.modelId || '').trim();
  // Prefer the record id the canvas sent: resolving by name alone could land on a
  // same-named model of another family (and jump to 灵动切割工作站).
  let existing = modelId ? models.value.find((model) => String(model.id) === modelId) : null;
  if (!existing && modelId) {
    existing = await api.get(`/items/product_models/${encodeURIComponent(modelId)}`)
      .then((response) => response?.data?.data || null)
      .catch(() => null);
  }
  if (!existing) {
    existing = models.value.find((model) => {
      const key = String(model.model_code || model.name || '').trim().toLowerCase();
      return key === code.toLowerCase();
    });
  }
  if (existing?.id != null) {
    // A chip click is an in-place model switch inside the already-open product
    // canvas. Follow the record in the left form, but keep the current preview
    // session: the series token already authorizes the related model drafts, so
    // re-issuing the token here only reloads the iframe for no benefit.
    preserveLivePreviewSessionOnce = Boolean(
      liveWebsitePreviewVisible.value
      && websitePreviewTarget.value
      && (String(websitePreviewTarget.value.collection) !== 'product_models'
        || String(websitePreviewTarget.value.record?.id) !== String(existing.id))
    );
    // The chip may belong to another series than the one currently open; switch the
    // series too, otherwise selectModel has no record to normalize and the form
    // keeps showing the previous family.
    const ownerCode = String(existing.series_code || seriesCode || '').trim();
    let owner = series.value.find((item) => String(item.series_code || '') === ownerCode || String(item.slug || '') === ownerCode);
    // Records created before the slug fix carry the series slug as series_code; the
    // series itself may not be loaded yet, so resolve it from the API by slug.
    if (!owner && ownerCode) {
      const found = await api.get(`/items/product_series?filter[slug][_eq]=${encodeURIComponent(ownerCode)}&limit=1`)
        .then((response) => response?.data?.data?.[0] || null)
        .catch(() => null);
      if (found?.id != null) {
        series.value = [...series.value, found];
        owner = found;
      }
    }
    if (owner?.id != null) {
      // Heal records whose series_code was written as the series slug before the fix.
      const ownerSeriesCode = String(owner.series_code || '').trim();
      if (ownerSeriesCode && String(existing.series_code || '').trim() !== ownerSeriesCode) {
        try {
          await api.patch(`/items/product_models/${encodeURIComponent(existing.id)}`, { series_code: ownerSeriesCode });
          existing = { ...existing, series_code: ownerSeriesCode };
        } catch { /* keep the old value when the repair is rejected */ }
      }
    }
    if (owner?.id != null && String(selectedSeriesId.value) !== String(owner.id)) {
      activeTab.value = 'series';
      selectSeries(owner.id, true, false, false);
      await loadModels();
    }
    if (!models.value.some((model) => String(model.id) === String(existing.id))) {
      models.value = [...models.value, existing];
    }
    activeTab.value = 'models';
    await selectModel(existing.id, true);
    baselineCanvasSelection(activeWasDirty, dirtyKeysBefore);
    message.value = '已在左侧打开该机型，可修改名称、参数与详情。';
    return;
  }
  // A template-only name belongs to the website original, not a CMS record.
  // Selecting it must not create a record (which also reloaded the canvas); the
  // explicit "＋新增机型" action is the creation path.
  error.value = '';
  message.value = '该机型是官网原版名称，尚未建立 CMS 记录；请点画布上的「＋新增机型」建立后再编辑。';
}
function baselineCanvasSelection(activeWasDirty, dirtyKeysBefore) {
  // Opening a card from the canvas is a read/navigation action. Series
  // normalization, auto-selecting the first model and the async parameter load
  // all mutate drafts after render; without re-baselining them the badge showed
  // "未保存" immediately after clicking "详情" without any operator input.
  // Only records that were genuinely dirty before the click keep their baseline.
  setTimeout(() => {
    const activeKey = activeDraftCacheKey();
    for (const [key, entry] of productDraftCache) {
      if (key === activeKey || dirtyKeysBefore.has(key)) continue;
      entry.savedFingerprint = cachedDraftFingerprint(entry);
    }
    if (!activeWasDirty) markDraftSaved();
    cacheRevision.value += 1;
  }, 120);
}

async function focusCanvasSeries(payload) {
  const id = String(payload?.seriesRecordId || '').trim();
  if (!id) return;
  const activeWasDirty = hasUnsavedChanges.value;
  const dirtyKeysBefore = new Set(dirtyCachedDraftKeys());
  const activated = activateVisualEditingTarget({ collection: 'product_series', itemId: id }, { discardConfirmed: true });
  if (!activated?.record) { error.value = '没有找到该系列草稿，请刷新后重试。'; return; }
  baselineCanvasSelection(activeWasDirty, dirtyKeysBefore);
  message.value = '已在左侧打开该系列：补充名称、定位、封面与机型后保存。';
  // The page already opens the series panel in place, and the preview token
  // carries the related series/models. `activateVisualEditingTarget` preserved
  // the session, so re-issuing a token here only reloaded the canvas.
}

async function addCanvasSeries() {
  error.value = ''; message.value = '';
  // New cards go first: the grid is sorted by sort_order and paginated, so a card
  // appended at the end could land on a page the editor is not looking at.
  const position = Math.min(0, ...series.value.map((item) => Number(item.sort_order) || 0)) - 1;
  const stamp = Date.now().toString(36);
  try {
    const created = await api.post('/items/product_series', {
      series_code: `新系列-${series.value.length + 1}`,
      slug: `new-series-${stamp}`,
      name: '新系列',
      positioning: '待填写',
      sort_order: position,
      status: 'draft',
      publication_state: 'unpublished'
    });
    const record = created?.data?.data;
    if (record?.id != null) {
      series.value = [...series.value, record];
      // The preview session only carries related records, so a brand-new series
      // is not part of it yet. Push the record so the card appears immediately
      // instead of reloading into a page that still does not know about it.
      postLivePreviewUpdate({ collection: 'product_series', record });
      queueLivePreviewUpdate({ collection: 'product_series', record });
      // Select the card on the canvas as well: otherwise the next "新增机型"
      // still sends the previous `activeSeriesCode`.
      selectSeries(record.id, true);
      // Tell the canvas where the new card went: it lives in the draft strip below
      // the grid, so without this the click looked like it did nothing.
      livePreviewFrame.value?.contentWindow?.postMessage({
        type: 'ruijun:cms-preview:notice',
        kind: 'series-added',
        itemId: String(record.id),
        label: record.name || record.series_code || '新系列'
      }, livePreviewWebsiteOrigin.value);
    } else {
      await loadSeries();
    }
    message.value = '已新增一条系列卡片草稿（名称、定位、封面待填写），发布前需补来源与机型。';
  } catch (reason) {
    error.value = apiError(reason, '新增系列卡片失败。');
  }
}

async function removeCanvasSeries(payload) {
  const id = String(payload?.seriesRecordId || '').trim();
  const record = series.value.find((item) => String(item.id) === id);
  if (!record) { error.value = '画布没有识别到要删除的系列卡片。'; return; }
  if (!canDeleteContent(record)) {
    error.value = '已发布或审核中的系列不能直接删除，请先在发布队列下线并退回草稿。';
    return;
  }
  error.value = ''; message.value = '';
  let childModels = [];
  try {
    const modelsResponse = await api.get(`/items/product_models?fields=id,model_code,status,publication_state&filter[series_code][_eq]=${encodeURIComponent(String(record.series_code || ''))}&limit=-1`);
    childModels = Array.isArray(modelsResponse.data?.data) ? modelsResponse.data.data : [];
  } catch {
    error.value = '无法确认该系列下的机型，未执行删除。';
    return;
  }
  const undeletableModels = childModels.filter((model) => !canDeleteContent(model));
  if (undeletableModels.length) {
    error.value = `该系列下有 ${undeletableModels.length} 台已发布或审核中的机型，不能级联删除；请先在发布队列下线并退回草稿。`;
    return;
  }
  const childParameters = [];
  for (const model of childModels) {
    const code = String(model?.model_code || '').trim();
    if (!code) continue;
    try {
      const parameterResponse = await api.get(`/items/product_parameters?fields=id,status,publication_state&filter[model_code][_eq]=${encodeURIComponent(code)}&limit=-1`);
      childParameters.push(...(Array.isArray(parameterResponse.data?.data) ? parameterResponse.data.data : []));
    } catch {
      error.value = '无法确认该系列机型的技术参数，未执行删除。';
      return;
    }
  }
  const undeletableParameters = childParameters.filter((parameter) => !canDeleteContent(parameter));
  if (undeletableParameters.length) {
    error.value = `该系列下有 ${undeletableParameters.length} 条已发布或审核中的参数，不能级联删除；请先在发布队列下线并退回草稿。`;
    return;
  }
  const cascadeNote = childModels.length
    ? `及其 ${childModels.length} 台机型${childParameters.length ? `、${childParameters.length} 条参数` : ''}`
    : '';
  if (!window.confirm(`确认删除系列「${record.name || record.series_code}」${cascadeNote}吗？删除后需要重新建立。`)) return;
  try {
    for (const parameter of childParameters) {
      await api.delete(`/items/product_parameters/${encodeURIComponent(String(parameter.id))}`);
    }
    for (const model of childModels) {
      await api.delete(`/items/product_models/${encodeURIComponent(String(model.id))}`);
      dropCachedProductDraft('product_models', model.id);
    }
    await api.delete(`/items/product_series/${encodeURIComponent(String(record.id))}`);
    message.value = childModels.length ? '系列卡片及其机型、参数已删除。' : '系列卡片已删除。';
    dropCachedProductDraft('product_series', record.id);
    await loadSeries();
    await loadModels();
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '删除系列卡片失败。');
  }
}

// A model is its own record with its own publication gate (model code, source
// file, structured parameters). The canvas can create a draft seeded from the
// website original, and remove a model that never left draft/rejected.
// The page cannot see the models of a draft series (they are not server-rendered),
// so open the card's session and push them to the canvas.
async function pushSeriesCanvasModels(payload) {
  const seriesCode = String(payload?.seriesCode || '').trim();
  if (!seriesCode) return;
  try {
    const response = await api.get(`/items/product_models?filter[series_code][_eq]=${encodeURIComponent(seriesCode)}&limit=-1`);
    const records = Array.isArray(response?.data?.data) ? response.data.data : [];
    records.forEach((record) => {
      if (record?.id == null) return;
      postLivePreviewUpdate({ collection: 'product_models', record });
      queueLivePreviewUpdate({ collection: 'product_models', record });
    });
  } catch { /* the canvas keeps the chips it already has */ }
}

async function addCanvasModel(payload) {
  const seriesCode = String(payload?.seriesCode || '').trim();
  if (!seriesCode) { error.value = '画布没有识别到所属系列，请先在左侧选中系列。'; return; }
  const siblings = models.value.filter((model) => String(model.series_code || '') === seriesCode);
  const slug = `new-model-${Date.now().toString(36)}`;
  // A brand-new series has no official template, so seeding it with the default
  // (pro family) copy made every new card show that family's photo and features.
  const seeded = siblings.length ? defaultModelConfiguration({ series_code: seriesCode, slug }) : null;
  error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_models', {
      series_code: seriesCode,
      model_code: `新机型-${siblings.length + 1}`,
      slug,
      // Keep the visible chip unique from the start; the name is the canvas
      // label, so a shared "新机型" made every new model look identical.
      name: `新机型-${siblings.length + 1}`,
      configuration: seeded || null,
      status: 'draft',
      publication_state: 'unpublished'
    });
    const record = created?.data?.data;
    if (record?.id != null) {
      models.value = [...models.value, record];
      await selectModel(record.id, true);
      // Push the record instead of reloading the canvas: the page merges session
      // models, so the new chip appears without losing scroll or panel state.
      postLivePreviewUpdate({ collection: 'product_models', record });
      queueLivePreviewUpdate({ collection: 'product_models', record });
    } else {
      await loadModels();
    }
    message.value = '已新增一条机型草稿（名称与型号编码待填写），发布前需补来源与参数。';
  } catch (reason) {
    error.value = apiError(reason, '新增机型失败。');
  }
}

async function removeCanvasModel(payload) {
  const id = String(payload?.modelId || '').trim();
  const record = models.value.find((model) => String(model.id) === id);
  if (!record) { error.value = '画布没有识别到要删除的机型，请先在左侧选中机型。'; return; }
  if (!canDeleteContent(record)) {
    error.value = '已发布或审核中的机型不能直接删除，请先在发布队列下线并退回草稿。';
    return;
  }
  error.value = ''; message.value = '';
  try {
    // Parameters are keyed by model_code, so deleting the model would orphan them.
    const response = await api.get(`/items/product_parameters?fields=id&filter[model_code][_eq]=${encodeURIComponent(String(record.model_code || ''))}&limit=1`);
    const parameterRows = Array.isArray(response.data?.data) ? response.data.data : [];
    if (parameterRows.length) {
      error.value = '该机型还有技术参数，请先删除参数后再删除机型。';
      return;
    }
  } catch { /* the delete below still reports the real failure */ }
  if (!window.confirm(`确认删除机型「${record.model_code || record.id}」吗？删除后需要重新建立。`)) return;
  try {
    await api.delete(`/items/product_models/${encodeURIComponent(String(record.id))}`);
    message.value = '机型已删除。';
    // The canvas may still be targeted at the record that no longer exists; the
    // token for a deleted record fails and left the whole canvas inert (every
    // card then kept showing whichever detail panel was open last).
    if (livePreviewRootTarget
      && String(livePreviewRootTarget.collection) === 'product_models'
      && String(livePreviewRootTarget.record?.id || '') === String(record.id)) {
      livePreviewRootTarget = null;
    }
    dropCachedProductDraft('product_models', record.id);
    clearVisualSelection();
    await loadModels();
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '删除机型失败。');
  }
}

// Parameter rows are records, not JSON entries: the canvas buttons create and
// delete a draft parameter via the API, and the published guard below keeps
// published rows out of reach.
async function addCanvasParameter(payload) {
  const modelCode = String(payload?.modelCode || '').trim();
  if (!modelCode) { error.value = '画布没有识别到当前型号，请先在左侧选中型号。'; return; }
  const rows = parameters.value.filter((parameter) => String(parameter.model_code || '') === modelCode);
  const sortOrder = rows.reduce((max, parameter) => Math.max(max, Number(parameter.sort_order) || 0), 0) + 1;
  error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_parameters', {
      model_code: modelCode,
      field_name: '新参数',
      value: '待填写',
      unit: null,
      test_conditions: null,
      sort_order: sortOrder,
      status: 'draft',
      publication_state: 'unpublished'
    });
    const record = created?.data?.data;
    if (record) {
      // Push the new row instead of reloading the canvas: repeated "新增参数"
      // used to reload after every click and lose the table's scroll/selection.
      postLivePreviewUpdate({ collection: 'product_parameters', record });
      queueLivePreviewUpdate({ collection: 'product_parameters', record });
    }
    message.value = '已新增一条技术参数草稿，请填写名称与数值（发布前还需补充来源）。';
    if (record && modelDraft.value && String(modelDraft.value.model_code) === modelCode) upsertParameter(record);
    else if (!record) await loadParameters(modelCode);
    if (!record && liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '新增技术参数失败。');
  }
}

async function removeCanvasParameter(payload) {
  const id = String(payload?.parameterId || '').trim();
  if (!id) { error.value = '没有识别到要删除的参数。'; return; }
  const modelCode = String(payload?.modelCode || '').trim();
  let record = parameters.value.find((parameter) => String(parameter.id) === id);
  // The row may belong to a model whose parameter list is not loaded locally;
  // read it once so the delete still works instead of failing silently.
  if (!record) {
    try {
      const response = await api.get(`/items/product_parameters/${encodeURIComponent(id)}`);
      record = response?.data?.data || null;
    } catch (reason) {
      error.value = apiError(reason, '没有找到这条参数，可能已被删除。');
      return;
    }
  }
  if (!record) { error.value = '没有找到这条参数，可能已被删除。'; return; }
  if (!canDeleteContent(record)) {
    error.value = '已发布或审核中的参数不能直接删除，请先在发布队列下线并退回草稿。';
    return;
  }
  if (!window.confirm(`确认删除参数「${record.field_name || record.id}」吗？删除后需要重新建立。`)) return;
  error.value = ''; message.value = '';
  try {
    await api.delete(`/items/product_parameters/${encodeURIComponent(id)}`);
    message.value = '技术参数已删除。';
    const reloadCode = modelCode || String(record.model_code || '');
    if (modelDraft.value && String(modelDraft.value.model_code) === reloadCode) {
      parameters.value = parameters.value.filter((row) => String(row.id) !== String(id));
      clearParameterDirty(id);
    }
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '删除技术参数失败。');
  }
}

async function deleteCandidateMedia(payload) {  const id = String(payload?.mediaAssetId || '').trim();
  if (!id) return;
  const label = String(payload?.label || '').replace(/^删除\s*/, '') || `#${id}`;
  error.value = ''; message.value = '';
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: id });
    message.value = `素材「${label}」已删除。`;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '素材仍被其他内容引用，未删除。');
  }
}

async function deleteAllCandidateVideos() {
  const candidates = mediaAssets.value.filter((asset) => (
    String(asset.media_type || '').toLowerCase() === 'video'
    && String(asset.placement_key || '') === 'news.video_share.list'
  ));
  if (!candidates.length) { message.value = '当前没有候选视频素材。'; return; }
  if (!window.confirm(`删除 ${candidates.length} 个候选视频素材？仍被内容引用的会保留。`)) return;
  error.value = ''; message.value = '';
  let deleted = 0;
  const blocked = [];
  for (const asset of candidates) {
    try {
      await api.post('/media-poster/asset/delete', { media_asset_id: String(asset.id) });
      deleted += 1;
    } catch {
      blocked.push(asset.title || asset.original_file_name || String(asset.id));
    }
  }
  await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  message.value = `已删除 ${deleted} 个候选视频${blocked.length ? `；${blocked.length} 个仍被引用而保留` : ''}。`;
  if (blocked.length) error.value = `以下素材仍被内容引用，未删除：${blocked.join('、')}`;
}

async function deleteArticleFromCanvas(payload) {
  const collection = String(payload?.collection || 'articles');
  const id = String(payload?.targetItemId || '').trim();
  if (!id) return;
  const record = (editorial.value.articles || []).find((item) => String(item.id) === id)
    || (editorial.value.case_studies || []).find((item) => String(item.id) === id);
  const title = record?.title || String(payload?.label || '').replace(/^删除\s*/, '') || `#${id}`;
  const published = record?.status === 'published' || record?.publication_state === 'published';
  if (!technicalAccess.value && !canDeleteEditorialDraft(record)) {
    error.value = '只有草稿、退回修改或已下线的内容可以直接删除；已发布/审核中的内容请先走流程。';
    return;
  }
  if (!window.confirm(`确定删除「${title}」吗？${published ? '该内容已发布，删除后会立即从官网移除。' : '删除后不可恢复。'}`)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.delete(`/items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
    await loadEditorial();
    if (String(selectedEditorialId.value) === id) { selectedEditorialId.value = ''; editorialDraft.value = null; }
    if (collection === 'articles') {
      // 删除文章后不要停留在 articles 列表卡片画布：该画布没有新增按钮，
      // 且原文章 target 已失效。统一回到新闻页画布，保留“新增视频分享/动态新闻”。
      articlePreviewSurface.value = 'list';
      activeTab.value = 'pages';
      const newsPage = pages.value.find((page) => String(page.slug) === 'news');
      if (newsPage) selectPage(newsPage.id, true);
      clearVisualSelection();
    } else if (String(websitePreviewTarget.value?.collection || '') === collection && String(websitePreviewTarget.value?.record?.id || '') === id) {
      activeTab.value = 'pages';
      const newsPage = pages.value.find((page) => String(page.slug) === 'news');
      if (newsPage) selectPage(newsPage.id, true);
    }
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
    invalidateSubmissionQueue();
    message.value = `已删除「${title}」。`;
  } catch (reason) {
    error.value = apiError(reason, '删除文章失败。');
  } finally { saving.value = false; }
}

async function deleteEditorialDraft() {
  const record = editorialDraft.value;
  if (!canDeleteEditorialDraft(record)) return;
  const collection = editorialMode.value;
  const id = String(record.id);
  const label = editorialLabel(record);
  if (!window.confirm(`确定删除“${label}”草稿吗？删除后无法恢复。`)) return;

  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.delete(`/items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
    if (String(websitePreviewTarget.value?.collection || '') === collection && String(websitePreviewTarget.value?.record?.id || '') === id) {
      livePreviewRequestSequence += 1;
      liveWebsitePreviewVisible.value = false;
      livePreviewFrameReady.value = false;
      livePreviewStatus.value = 'idle';
      livePreviewError.value = '';
    }
    selectedEditorialId.value = '';
    editorialDraft.value = null;
    clearVisualSelection();
    await loadEditorial();
    message.value = `已删除“${label}”草稿。`;
  } catch (reason) {
    error.value = apiError(reason, '删除草稿失败，内容未删除。');
  } finally {
    saving.value = false;
  }
}

function base64ToBlob(base64, contentType) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: contentType || 'image/png' });
}

async function uploadWordArticleImage({ contentType, base64, alt, index }) {
  const mime = String(contentType || 'image/png').toLowerCase();
  const extension = mime.includes('jpeg') ? 'jpg' : mime.includes('gif') ? 'gif' : mime.includes('webp') ? 'webp' : 'png';
  const fileName = `word-image-${Number(index) + 1}.${extension}`;
  const file = new File([base64ToBlob(base64, mime)], fileName, { type: mime });
  const metadata = await readMediaMetadata(file, 'image').catch(() => ({}));
  const form = new FormData();
  form.append('title', alt || fileName);
  form.append('file', file, fileName);
  const uploaded = (await api.post('/files', form)).data?.data;
  if (!uploaded?.id || !uploaded.filename_download || !uploaded.type) throw new Error('图片上传接口未返回完整文件信息');
  const created = (await api.post('/items/media_assets', {
    file_id: String(uploaded.id),
    original_file_name: uploaded.filename_download,
    mime_type: uploaded.type,
    byte_size: Number(uploaded.filesize),
    usage_scope: 'article',
    media_type: 'image',
    width: Number(metadata.width) || null,
    height: Number(metadata.height) || null,
    aspect_ratio: metadata.aspect_ratio || null,
    placement_key: 'news.article.body',
    page_key: 'news',
    section_key: 'article',
    sort_order: Number(index) || 0,
    enabled: true,
    title: alt || fileName.replace(/\.[^.]+$/, ''),
    alt_text: alt || null,
    copyright_status: 'owned',
    status: 'published',
    publication_state: 'published'
  })).data?.data;
  if (!created?.id) throw new Error('图片素材登记失败');
  return {
    path: `/api/public/v1/media/asset/${encodeURIComponent(String(uploaded.id))}`,
    mediaAssetId: String(created.id)
  };
}

async function importWordDocument(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (input) input.value = '';
  if (!file || !editorialDraft.value || !canEdit(editorialDraft.value)) return;
  if (!/\.docx$/i.test(String(file.name || ''))) {
    error.value = '请选择 .docx 格式的 Word 文档。';
    return;
  }
  importingWord.value = true; error.value = ''; message.value = '';
  try {
    const result = await readWordArticle(file, {
      uploadImage: uploadWordArticleImage,
      fallbackTitle: String(file.name || '').replace(/\.docx$/i, '')
    });
    const draft = editorialDraft.value;
    if (result.title) draft.title = result.title;
    draft.summary = '';
    if (result.body) draft.body = result.body;
    if (!draft.source_document) draft.source_document = file.name;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    const suffix = [
      result.imageCount ? `已导入 ${result.imageCount} 张图片` : '',
      result.imageFailed ? `${result.imageFailed} 张图片失败` : ''
    ].filter(Boolean).join('，');
    message.value = `已导入 Word 文档：${draft.title || '未命名'}${suffix ? `；${suffix}` : ''}。请检查排版后保存内容草稿。`;
    if (result.warnings.length) error.value = result.warnings.join('；');
  } catch (reason) {
    error.value = apiError(reason, 'Word 文档导入失败，原有内容未修改。');
  } finally {
    importingWord.value = false;
  }
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
      const category = editorialDraft.value.category === 'video' ? 'video' : 'news';
      if (category === 'video' && !draftSubmissionName.value.trim()) {
        error.value = '保存视频分享草稿前必须填写保存名称。';
        return;
      }
      const media = normalizeMediaReferences(editorialDraft.value.mediaReferences);
      let bodyMedia = [];
      try {
        const parsedBodyMedia = JSON.parse(String(editorialDraft.value.body_media_text || '[]'));
        if (!Array.isArray(parsedBodyMedia)) throw new Error('not-array');
        bodyMedia = parsedBodyMedia.map((item) => ({ media_asset_id: String(item?.media_asset_id || '').trim(), caption: String(item?.caption || '').trim() })).filter((item) => item.media_asset_id);
      } catch { error.value = '正文图片配置必须是合法的 JSON 数组。'; return; }
      if (!editorialDraft.value.display_date) { error.value = '请填写官网显示日期。'; return; }
      const rawSortOrder = editorialDraft.value.sort_order;
      const hasSortOrder = rawSortOrder !== null && rawSortOrder !== undefined && String(rawSortOrder).trim() !== '';
      const sortOrder = normalizeOptionalSortOrder(editorialDraft.value.sort_order);
      if (hasSortOrder && sortOrder === null) { error.value = '同日排序必须是大于或等于 0 的整数。'; return; }
      if (category === 'video' && !media.length) { error.value = '视频分享至少需要关联一条视频素材。'; return; }
      const selectedVideoAssets = category === 'video' ? media.map((reference) => String(reference?.media_asset_id || '')).filter(Boolean) : [];
      if (category === 'video' && (selectedVideoAssets.length !== media.length || selectedVideoAssets.some((assetId) => !isEditorialMediaAssetAllowed(assetId, {
        category: 'video', publishedAssets: reviewedMediaAssets('article'), candidates: mediaCandidates.value
      })))) { error.value = '视频分享素材不符合“文章与资讯 / 视频分享列表 / news / video-sharing”的使用范围，未保存。'; return; }
      const coverAssetId = String(editorialDraft.value.cover_asset || '').trim();
      if (category === 'news' && coverAssetId && !isEditorialMediaAssetAllowed(coverAssetId, {
        category: 'news', publishedAssets: reviewedMediaAssets('article'), candidates: mediaCandidates.value
      })) { error.value = '动态新闻封面必须使用“文章与资讯 / 动态新闻封面 / news / dynamic-news”的图片，未保存。'; return; }
      payload = { slug: editorialDraft.value.slug, category, title: editorialDraft.value.title, display_date: editorialDraft.value.display_date, sort_order: sortOrder, summary: editorialDraft.value.summary || null, body: editorialDraft.value.body || null, body_media: bodyMedia, transcript: editorialDraft.value.transcript || null, field_presentation: normalizeFieldPresentations(editorialDraft.value.field_presentation, ['category', 'title', 'display_date', 'summary', 'body', 'transcript']), media, cover_asset: editorialDraft.value.cover_asset || null, seo, published_at: editorialDraft.value.published_at || null, source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null, submission_name: draftSubmissionName.value.trim() || null };
    } else {
      payload = { slug: editorialDraft.value.slug, industry: editorialDraft.value.industry || null, material: editorialDraft.value.material || null, thickness: editorialDraft.value.thickness || null, model_code: editorialDraft.value.model_code || null, process: editorialDraft.value.process || null, result: editorialDraft.value.result || null, authorization_status: editorialDraft.value.authorization_status || 'review_required', source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null };
    }
    await api.patch(`/items/${encodeURIComponent(editorialMode.value)}/${encodeURIComponent(editorialDraft.value.id)}`, payload);
    message.value = '内容草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    invalidateSubmissionQueue();
    await refreshAfterSave([loadEditorial]);
  } catch (reason) {
    setSaveError(reason, '保存内容草稿失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveSettings() {
  if (!settingsDraft.value || !canEdit(settingsDraft.value)) return;
  const navigationError = validateSettingLinks(settingsDraft.value.navigation, '主导航');
  const footerError = validateSettingLinks(settingsDraft.value.footer.primary_links, '页脚链接');
  const footerColumnsError = validateFooterColumns(settingsDraft.value.footer.columns);
  if (navigationError || footerError || footerColumnsError) { error.value = navigationError || footerError || footerColumnsError; return; }
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
    const footer = { ...settingsDraft.value.footer, primary_links: settingsDraft.value.footer.primary_links.map(normalizeLink), columns: settingsDraft.value.footer.columns.map((column, index) => ({ title: column.title.trim(), sort_order: Number(column.sort_order) || index, links: column.links.map(normalizeLink) })), text_styles: normalizeFooterTextStyles(settingsDraft.value.footer.text_styles), purchase_label: settingsDraft.value.footer.purchase_label.trim(), purchase_title: settingsDraft.value.footer.purchase_title.trim(), purchase_subtitle: settingsDraft.value.footer.purchase_subtitle.trim(), purchase_phone: settingsDraft.value.footer.purchase_phone.trim(), copyright: settingsDraft.value.footer.copyright.trim(), address_icon_asset: settingsDraft.value.footer.address_icon_asset.trim(), phone_icon_asset: settingsDraft.value.footer.phone_icon_asset.trim(), email_icon_asset: settingsDraft.value.footer.email_icon_asset.trim() };
    const brand = { ...settingsDraft.value.brand, display_name: settingsDraft.value.brand.display_name.trim(), logo_asset: settingsDraft.value.brand.logo_asset.trim(), footer_logo_asset: settingsDraft.value.brand.footer_logo_asset.trim() };
    const contacts = { ...settingsDraft.value.contacts, service_phone: settingsDraft.value.contacts.service_phone.trim(), domestic_phone: settingsDraft.value.contacts.domestic_phone.trim(), export_phone: settingsDraft.value.contacts.export_phone.trim(), domestic_email: settingsDraft.value.contacts.domestic_email.trim(), export_email: settingsDraft.value.contacts.export_email.trim(), language_label: settingsDraft.value.contacts.language_label.trim(), addresses: fromTextList(settingsDraft.value.contacts.addressesText), header_cta: { ...settingsDraft.value.contacts.header_cta, label: settingsDraft.value.contacts.header_cta.label.trim(), href: settingsDraft.value.contacts.header_cta.href.trim() } };
    await api.patch(`/items/site_settings/${encodeURIComponent(settingsDraft.value.id)}`, { navigation: settingsDraft.value.navigation.map(normalizeLink), footer, brand, contacts, languages });
    message.value = '全站设置草稿已保存，并已进入内容版本审计。';
    let reloaded = true;
    try { await loadSettings(); } catch { reloaded = false; message.value += '（列表刷新失败，请重新加载页面查看）'; }
    if (reloaded) markDraftSaved();
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '保存全站设置失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveVisualSiteSettings() {
  const record = settingsDraft.value;
  const fieldPath = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (!record || !canEdit(record)) return;
  const payload = visualSiteSettingsPayload(record, fieldPath);
  if (!payload) {
    error.value = '该全站设置字段不支持在画布中保存。';
    return;
  }
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/site_settings/${encodeURIComponent(record.id)}`, payload);
    message.value = '页脚草稿已保存，并已进入内容版本审计。';
    let reloaded = true;
    try { await loadSettings(); } catch { reloaded = false; message.value += '（列表刷新失败，请重新加载页面查看）'; }
    if (reloaded) markDraftSaved();
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '保存页脚草稿失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveModel() {
  if (!modelDraft.value || !canEdit(modelDraft.value)) return;
  const invalidFeature = modelDraft.value.configuration.features.find((item) => !String(item.label || '').trim());
  const invalidDrawing = modelDraft.value.configuration.drawings.find((item) => !String(item.media_asset_id || '').trim());
  const invalidResource = modelDraft.value.resources.find((item) => {
    const assetId = String(item.media_asset_id || '').trim();
    return !String(item.title || '').trim() || (!assetId && !isValidSiteLink(item.url));
  });
  if (invalidFeature) { error.value = '每个产品特点都必须填写标题。'; return; }
  if (invalidDrawing) { error.value = '每张尺寸图都必须选择产品图片。'; return; }
  if (invalidResource) { error.value = '每条产品资料都必须填写标题，并选择已上传附件或填写站内路径、HTTPS 地址。'; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    const modelBefore = JSON.stringify(modelDraft.value);
    const labels = modelDraft.value.configuration.labels;
    const { field_presentation: ignoredFieldPresentation, ...configurationSource } = parseObject(modelDraft.value.configurationSource);
    const fieldPresentation = normalizeProductModelFeaturePresentation(modelDraft.value.configuration);
    const configuration = {
      ...configurationSource,
      intro: {
        ...parseObject(modelDraft.value.configurationSource?.intro),
        title: modelDraft.value.configuration.intro.title.trim(),
        subtitle: modelDraft.value.configuration.intro.subtitle.trim(),
        scene: modelDraft.value.configuration.intro.scene.trim(),
        body: modelDraft.value.configuration.intro.body.trim()
      },
      machine_asset_id: modelDraft.value.configuration.machine_asset_id || null,
      labels: {
        ...parseObject(modelDraft.value.configurationSource?.labels),
        technical: labels.technical.trim(),
        drawing: labels.drawing.trim(),
        technical_image_asset_id: labels.technical_image_asset_id || null
      },
      features: modelDraft.value.configuration.features.map((item) => ({ label: item.label.trim(), detail: item.detail.trim(), note: item.note.trim(), ...(item.image ? { image: item.image } : {}), media_asset_id: item.media_asset_id || null })),
      drawings: modelDraft.value.configuration.drawings.map((item) => ({ title: item.title.trim(), caption: item.caption.trim(), media_asset_id: item.media_asset_id })),
      ...(Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {})
    };
    const resources = modelDraft.value.resources.map((item) => ({ title: item.title.trim(), type: item.type.trim(), url: item.url.trim(), media_asset_id: item.media_asset_id || null }));
    await api.patch(`/items/product_models/${encodeURIComponent(modelDraft.value.id)}`, { series_code: modelDraft.value.series_code, model_code: modelDraft.value.model_code, slug: modelDraft.value.slug || null, name: modelDraft.value.name, parameters: structuredModelParameters(), configuration, media: modelDraft.value.mediaReferences, resources });
    // The top save button owns the whole model form, including its parameter
    // rows. Flush the edited rows before reloading, otherwise the reload below
    // replaces them with the server's old values.
    const parameterResult = await persistDirtyParameters();
    if (parameterResult.failed.length) {
      error.value = `型号信息已保存，但有 ${parameterResult.failed.length} 条技术参数未保存（${parameterResult.failed.map((row) => row.field_name || row.id).join('、')}）。请修正后重试这些参数。`;
      message.value = '';
      await refreshAfterSave([]);
      return;
    }
    if (JSON.stringify(modelDraft.value) !== modelBefore) {
      message.value = '型号草稿已保存；保存期间又有新的修改，尚未写入，请再次保存。';
      await refreshAfterSave([]);
      return;
    }
    message.value = '型号草稿已保存，并已进入内容版本审计。';
    markDraftSaved();
    await refreshAfterSave([loadModels]);
  } catch (reason) {
    setSaveError(reason, '保存型号失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveParameter(parameter) {
  if (!canEdit(parameter)) { error.value = saveBlockedMessage(parameter); return; }
  if (!confirmPublishedRevision(parameter, '这条技术参数')) return;
  const publishedRevision = isPublishedRecord(parameter);
  saving.value = true; error.value = ''; message.value = '';
  try {
    const sent = parameterPayload(parameter);
    await api.patch(`/items/product_parameters/${encodeURIComponent(parameter.id)}`, sent);
    const current = parameters.value.find((row) => String(row.id) === String(parameter.id));
    const unchanged = Boolean(current) && JSON.stringify(parameterPayload(current)) === JSON.stringify(sent);
    if (unchanged) clearParameterDirty(parameter.id);
    else markParameterDirty(parameter);
    if (unchanged && dirtyParameterIds.value.length === 0 && JSON.stringify(modelDraft.value) === savedModelFingerprint.value) {
      markDraftSaved();
    }
    message.value = unchanged
      ? '技术参数已保存，并已进入内容版本审计。'
      : '技术参数已保存；保存期间该行又有修改，请再次保存。';
    if (publishedRevision) message.value = `${message.value}（已生成草稿修订，官网需重新审核发布后更新）`;
    // Do not reload the whole table: it would discard edits in the other rows.
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '保存技术参数失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function createParameter() {
  if (!modelDraft.value || !canEdit(modelDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_parameters', { model_code: modelDraft.value.model_code, field_name: newParameter.value.field_name, value: newParameter.value.value, unit: newParameter.value.unit || null, test_conditions: newParameter.value.test_conditions || null, sort_order: Number(newParameter.value.sort_order) || 0, status: 'draft', publication_state: 'unpublished' });
    const record = created?.data?.data;
    message.value = '新的技术参数草稿已创建。';
    newParameter.value = { ...emptyParameter(), model_code: modelDraft.value.model_code };
    if (record) upsertParameter(record);
    else await loadParameters(modelDraft.value.model_code);
    if (dirtyParameterIds.value.length === 0) markDraftSaved();
    // Creating a record is a save: push it into the open canvas now instead of
    // waiting for an unrelated save or a manual preview reconnect.
    if (record) {
      postLivePreviewUpdate({ collection: 'product_parameters', record });
      queueLivePreviewUpdate({ collection: 'product_parameters', record });
    }
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '新增技术参数失败。');
  } finally { saving.value = false; }
}

watch(activeTab, (tab) => {
  error.value = '';
  message.value = '';
  closePreview();
  if (tab === 'media') loadMediaPreviews();
  // 每次进入内容送审都重新读取。保存草稿后旧快照里的新文章不会自己出现，
  // 只靠 submissionQueueLoaded 会让队列永久停留在第一次打开时的状态。
  if (tab === 'submit') loadSubmissionQueue();
  if (tab === 'review' && !reviewQueueLoaded.value) loadReviewQueue();
});
watch(livePreviewIdentity, (identity, previousIdentity) => {
  if (identity === previousIdentity) return;
  if (preserveLivePreviewSessionOnce) {
    preserveLivePreviewSessionOnce = false;
    livePreviewStatus.value = livePreviewFrameReady.value ? 'connected' : livePreviewStatus.value;
    queueLivePreviewUpdate();
    return;
  }
  selectedVisualElement.value = null;
  visualMediaSelection.value = '';
  livePreviewFrameReady.value = false;
  livePreviewStatus.value = identity ? 'opening' : 'idle';
  livePreviewError.value = '';
  if (identity && liveWebsitePreviewVisible.value) startLiveWebsitePreview();
});
watch(currentLivePreviewRecord, () => queueLivePreviewUpdate(), { deep: true });
watch(() => currentDraftState(), (next, previous) => {
  if (suppressDraftHistory) return;
  if (!previous || !savedDraftFingerprint.value) return;
  recordVisualHistory();
}, { deep: true, flush: 'post' });
watch(activePageSectionKey, () => queueLivePreviewUpdate());
// Keep the iframe's hit-testing mode in step with the desktop toolbar.
watch(visualTool, () => postLivePreviewUpdate());
watch(visualDevice, () => postLivePreviewUpdate());
// Directus 的“跳转菜单”遮罩有时保持 active，并在 document 捕获阶段吞掉点击；
// 仅禁用 pointer-events 只能让真实鼠标穿过，按钮的 click 仍可能被截断。工作台
// 打开时以及每次指针/焦点进入前主动关闭它，右侧面板的保存、删除才可靠。
function closeDirectusSkipMenu() {
  const overlay = document.querySelector('.container.left .v-overlay.active');
  if (overlay instanceof HTMLElement) overlay.click();
}
onMounted(() => {
  document.documentElement.classList.add('ruijun-workbench-active');
  // Module navigation keeps the shell's previous scroll offset. A short page
  // then clamps it back, which looked like a random jump on entry.
  window.requestAnimationFrame(() => {
    document.querySelector('.scrolling-container')?.scrollTo({ top: 0 });
  });
  closeDirectusSkipMenu();
  window.setTimeout(closeDirectusSkipMenu, 300);
  window.addEventListener('pointerdown', closeDirectusSkipMenu, true);
  window.addEventListener('focusin', closeDirectusSkipMenu, true);
  window.addEventListener('keydown', handlePreviewKeydown);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('message', handleLivePreviewMessage);
  window.addEventListener('resize', handleVisualViewportResize);
  api.get('/users/me?fields=id,role.name').then((response) => {
    const user = response.data?.data || {};
    const roleName = String(user.role?.name || '');
    technicalAccess.value = ['Administrator', '系统管理员'].includes(roleName);
    workflowAccess.value = ['Administrator', '系统管理员', '内容编辑', '审核管理'].includes(roleName);
  }).catch(() => {
    technicalAccess.value = false;
    workflowAccess.value = false;
  }).finally(load);
});
onBeforeUnmount(() => {
  document.documentElement.classList.remove('ruijun-workbench-active');
  window.removeEventListener('pointerdown', closeDirectusSkipMenu, true);
  window.removeEventListener('focusin', closeDirectusSkipMenu, true);
  window.removeEventListener('keydown', handlePreviewKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('message', handleLivePreviewMessage);
  window.removeEventListener('resize', handleVisualViewportResize);
  window.clearTimeout(livePreviewDebounceTimer);
  clearMediaPreviews();
});
</script>

<style scoped src="./src/module.css"></style>

<style src="./src/module-global.css"></style>

