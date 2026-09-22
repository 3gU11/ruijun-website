<template>
  <private-view class="content-workbench-view" title="内容编辑工作台">
    <div class="editor-page" :class="{ 'live-website-preview-active': liveWebsitePreviewVisible && websitePreviewAvailable, 'visual-canvas-focus': visualCanvasFocus }">
      <header class="toolbar">
        <div>
          <p class="eyebrow">内容编辑工作台</p>
          <h2>官网内容编辑</h2>
          <p>按表单维护页面、产品、企业资料、服务支持和文章。保存只会更新草稿；审核与发布由对应负责人完成。</p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="guide-action" @click="helpOpen = !helpOpen">{{ helpOpen ? '收起操作说明' : '查看操作说明' }}</button>
          <button type="button" class="preview-action" :disabled="!previewAvailable" :title="previewAvailable ? '查看当前表单中的未保存修改' : '当前内容类型暂不支持画面预览'" @click="openPreview">预览当前草稿</button>
          <button type="button" class="live-preview-toggle" :disabled="!websitePreviewAvailable" @click="toggleLiveWebsitePreview">{{ liveWebsitePreviewVisible ? '关闭实时预览' : '打开实时预览' }}</button>
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
        <div v-if="technicalAccess" class="tab-group advanced-tabs" :class="{ expanded: showAdvanced }" aria-label="更多工具">
          <button type="button" class="advanced-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '收起高级设置' : '高级设置' }}<span aria-hidden="true">{{ showAdvanced ? '⌃' : '⌄' }}</span></button>
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
          <div><p class="eyebrow">媒体素材</p><h3>登记待审核媒体</h3></div>
            <span class="status" data-status="draft">仅草稿</span>
          </div>
          <p class="form-help">上传后只会创建私有候选素材。技术或品牌审核通过并由发布人员发布后，素材才会出现在官网内容的受控选择器中。</p>
          <form class="media-form-fields" @submit.prevent="createMediaCandidate">
            <div class="field-grid">
              <label class="full">文件<input ref="mediaFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,application/pdf" required @change="selectMediaFile"></label>
              <p v-if="mediaDraft.file" class="form-help full">已选择：{{ mediaDraft.file.name }} · {{ readableFileSize(mediaDraft.file.size) }} · {{ mediaMetadataLabel }}</p>
              <label>使用范围<select v-model="mediaDraft.usage_scope" required @change="syncMediaScopeContext"><option value="homepage">网站主页</option><option value="product">产品展示</option><option value="manufacturing">先进制造</option><option value="news">视频新闻</option><option value="about">关于瑞钧</option><option value="service">服务支持</option></select></label>
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
                <label>视频海报<span v-if="selectedMediaPlacement?.posterRequired">（必填）</span><span v-else>（可选，未填写使用视频首帧）</span><select v-model="mediaDraft.poster_asset_id" :required="Boolean(selectedMediaPlacement?.posterRequired)"><option value="">{{ selectedMediaPlacement?.posterRequired ? '选择合规海报素材' : '不使用单独海报' }}</option><option v-for="asset in videoPosterOptions" :key="asset.id" :value="String(asset.id)">{{ videoPosterAssetLabel(asset) }}</option></select></label>
                <label class="toggle-field"><input v-model="mediaDraft.autoplay" type="checkbox"><span>自动播放</span></label>
                <label class="toggle-field"><input v-model="mediaDraft.muted" type="checkbox"><span>默认静音</span></label>
                <label class="toggle-field"><input v-model="mediaDraft.loop" type="checkbox"><span>循环播放</span></label>
                <label class="full">字幕或文字稿<textarea v-model.trim="mediaDraft.transcript" rows="4" maxlength="30000" placeholder="视频分享可选；教学视频和首屏说明建议填写"></textarea></label>
              </template>
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
            <div><strong>{{ asset.title || asset.original_file_name }}</strong><p>{{ asset.original_file_name }} · {{ usageScopeLabel(asset.usage_scope) }} · {{ asset.placement_key || '未指定展示位置' }} · {{ asset.mime_type }} · {{ readableFileSize(asset.byte_size) }}</p><small>{{ asset.width && asset.height ? `${asset.width} x ${asset.height} px · ${asset.aspect_ratio || '比例未记录'}` : asset.media_type === 'document' ? 'PDF 文档' : '尺寸未记录' }} · {{ asset.alt_text || '未填写替代文本' }}</small></div>
            <span class="status" :data-status="asset.status">{{ statusLabel(asset.status) }}</span>
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
            <p v-if="!editableMediaAssets('knowledge').length" class="form-help">暂无可用的知识库素材。请先在“媒体资产”中登记素材；草稿可用于后台内部预览，公开展示仍需审核发布。</p>
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
            <div class="section-heading"><div><p class="eyebrow">{{ activePageSectionKey ? '当前编辑区块' : '页面段落' }}</p><h4 id="section-copy-title">{{ activePageSectionLabel }}</h4></div><div class="section-heading-actions"><button v-if="pageDraft.slug === 'home'" type="button" :disabled="!canEdit(pageDraft)" @click="addHomeReasonSection">新增首页理由</button><button v-if="supportedPageSectionSlugs.has(pageDraft.slug)" type="button" :disabled="!canEdit(pageDraft)" @click="addRequiredPageSections">补齐本页全部栏目</button><button type="button" :disabled="!canEdit(pageDraft)" @click="addPageSection">新增段落</button></div></div>
            <article v-for="(section, index) in visiblePageSections" :key="`${section.id}-${index}`" :data-section-key="section.id" class="section-card" @focusin="activePageSectionKey = section.id" @pointerdown="activePageSectionKey = section.id">
              <div class="section-card-heading"><strong>{{ pageSectionName(section, index) }}</strong><div><span v-if="section.requires_claim_review" class="review-badge">宣传主张待审核</span><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft) || pageDraft.sections.length < 2" @click="removePageSection(index)">删除</button></div></div>
              <div class="field-grid section-fields">
              <label v-if="sectionTitleIsRendered(section)" class="full">段落标题<input data-preview-field="title" v-model.trim="section.title" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="例如：我们为什么值得信赖"><small class="field-help">这一段的醒目标题，会直接显示在官网页面上。</small></label>
              <p v-else class="read-only-note full">此区块当前官网没有标题展示位，修改该字段不会出现在画布中。请管理已绑定的产品系列记录；如需展示标题，必须先在 Nuxt 模板中新增经确认的版式位置。</p>
              <label v-if="sectionBodyIsRendered(section)" class="full">正文<textarea data-preview-field="body" v-model="section.body" :disabled="!canEdit(pageDraft)" rows="5" maxlength="4000" placeholder="填写访客需要了解的内容"></textarea>
                  <small class="field-help">支持换行，建议一段只表达一个重点。</small>
                </label>
              <p v-else class="read-only-note full">此区块当前官网没有正文展示位，修改该字段不会出现在画布中。请编辑标题或已绑定的理由内容；如需展示正文，必须先在 Nuxt 模板中新增经确认的版式位置。</p>
                <template v-if="isHomeReasonSection(section)">
                  <label>理由短标题<input v-model.trim="section.shortTitle" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="例如：先进智造"></label>
                  <label>首屏理由标题<input v-model.trim="section.introTitle" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="首页三大理由中的标题"></label>
                  <label class="full">首屏理由说明<textarea v-model="section.introDetail" :disabled="!canEdit(pageDraft)" rows="3" maxlength="1000" placeholder="首页三大理由右侧说明"></textarea></label>
                  <label>展示模式<select v-model="section.mode" :disabled="!canEdit(pageDraft)"><option value="machine">设备展示</option><option value="photo">整幅图片</option></select></label>
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
                <p class="form-help">仅显示登记为“首页首屏视频”的素材。草稿视频只在已登录后台的实时预览中显示；审核发布前不会替换公开官网。</p>
              </section>
              <section v-if="isNewsHeroSection(section)" class="home-hero-video-editor" aria-label="视频新闻首屏视频">
                <div class="section-card-heading"><strong>视频新闻首屏视频</strong><span>{{ newsHeroVideoAssetId(section) ? '已选择' : '沿用官网原视频' }}</span></div>
                <label>视频素材<select :value="newsHeroVideoAssetId(section)" :disabled="!canEdit(pageDraft)" @change="setNewsHeroVideo(section, $event.target.value)"><option value="">沿用官网原首屏视频</option><option v-for="asset in newsHeroVideoOptionsForSection(section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, 'article') }}</option></select></label>
                <p class="form-help">仅显示登记为“视频新闻首屏”的视频。草稿视频只在已登录后台的实时预览中显示；审核发布前不会替换公开官网。</p>
              </section>
              <section v-if="!isHomeHeroSection(section)" class="media-reference-editor" :aria-label="`${section.title || '页面段落'}图片`">
                <div class="section-card-heading"><strong>图片与背景</strong><span>{{ section.media.length }}</span></div>
                <div class="media-reference-add"><select v-model="pageMediaSelection" :disabled="!canEdit(pageDraft)"><option value="">选择{{ pageMediaScopeLabel() }}素材</option><option v-for="asset in pageMediaOptionsForSection(pageMediaScope(), section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, pageMediaScope()) }}</option></select><button type="button" :disabled="!canEdit(pageDraft) || !pageMediaSelection" @click="addPageMedia(section)">添加素材</button></div>
                <p v-if="!pageMediaOptionsForSection(pageMediaScope(), section).length" class="form-help">暂无可用于此区块的{{ pageMediaScopeLabel() }}素材。请先在“更多工具 - 媒体资产”上传；草稿素材必须填写当前页面和段落，且只供当前内部预览使用。</p>
                <div v-for="reference in section.media" :key="reference.media_asset_id" class="media-reference-row"><span>{{ pageMediaLabel(reference) }}</span><label v-if="section.id === 'hero' && pageDraft.slug === 'about'">图片用途<select v-model="reference.role" :disabled="!canEdit(pageDraft)"><option value="backdrop">首屏共享背景</option><option value="background">首屏背景图层</option><option value="foreground">首屏机器前景</option></select></label><label v-else>展示位置<input v-model.trim="reference.role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：background、card-1、video、icon-1"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removePageMedia(section, reference.media_asset_id)">移除</button></div>
              </section>
              <section v-if="pageDraft.slug === 'service' && ['hero', 'support-models', 'support-actions', 'office-directory'].includes(section.id)" class="service-items-editor">
                <div class="section-card-heading"><strong>{{ section.id === 'hero' ? '首屏说明文字' : section.id === 'support-models' ? '设备型号卡片' : section.id === 'support-actions' ? '服务入口卡片' : '区域与直属办事处' }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addServiceItem(section, section.id === 'support-models' ? 'model' : section.id === 'support-actions' ? 'action' : section.id === 'office-directory' ? 'office' : 'copy')">新增</button></div>
                <div v-for="(item, itemIndex) in section.items || []" :key="`${section.id}-${itemIndex}`" class="service-item-card">
                  <template v-if="section.id === 'hero'"><label>说明文字<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="160"></label></template>
                  <template v-else-if="section.id === 'support-models'"><label>型号名称<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>图片位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：model-1"></label></template>
                  <template v-else-if="section.id === 'support-actions'"><label>编号<input v-model.trim="item.number" :disabled="!canEdit(pageDraft)" maxlength="8" placeholder="01 至 10"></label><label>按钮文字<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label class="full">按钮下方说明<input v-model.trim="item.description" :disabled="!canEdit(pageDraft)" maxlength="300"></label><label>点击后咨询内容<input v-model.trim="item.body" :disabled="!canEdit(pageDraft)" maxlength="240"></label><label>图案位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：action-1"></label></template>
                  <template v-else><label>区域名称<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>区域图片位置<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：office-1"></label><label>地图图片位置<input v-model.trim="item.map_media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="例如：office-map-1"></label><div v-for="(office, officeIndex) in item.offices || []" :key="officeIndex" class="office-inline-fields"><label>门店地址<input v-model.trim="office.address" :disabled="!canEdit(pageDraft)" maxlength="500"></label><label>负责人<input v-model.trim="office.manager" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>联系电话<input v-model.trim="office.phone" :disabled="!canEdit(pageDraft)" maxlength="80"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeOffice(section, itemIndex, officeIndex)">删除门店</button></div><button type="button" :disabled="!canEdit(pageDraft)" @click="addOffice(section, itemIndex)">新增门店</button></template>
                  <button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeServiceItem(section, itemIndex)">删除</button>
                </div>
              </section>
              <section v-else class="service-items-editor generic-items-editor">
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
            <label>受控系列封面<select v-model="seriesDraft.cover_asset" :disabled="!canEdit(seriesDraft)"><option value="">尚未选择</option><option v-if="seriesDraft.cover_asset && !isReviewedMediaAsset(seriesDraft.cover_asset, 'product')" :value="seriesDraft.cover_asset">当前引用 {{ seriesDraft.cover_asset }}（尚未通过选择器核验）</option><option v-for="asset in editableMediaAssetsForPlacement('product', 'product.gallery.image', 'image')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!editableMediaAssetsForPlacement('product', 'product.gallery.image', 'image').length" class="form-help full">暂无可用的产品素材。请先在“媒体资产”中登记素材；草稿可用于后台内部预览，公开展示仍需审核发布。</p>
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
            <label>内容类型<select v-model="editorialDraft.category" :disabled="!canEdit(editorialDraft)" required><option value="news">动态新闻</option><option value="video">视频分享</option></select></label>
            <label>官网显示日期<input v-model="editorialDraft.display_date" :disabled="!canEdit(editorialDraft)" type="date" required></label>
              <label>同日排序<input v-model.number="editorialDraft.sort_order" :disabled="!canEdit(editorialDraft)" type="number" min="0" step="1" placeholder="留空表示按系统默认顺序"><small class="field-help">数值小的排在同日内容前面；留空不会改变默认顺序。</small></label>
            <label class="full">标题<input v-model.trim="editorialDraft.title" :disabled="!canEdit(editorialDraft)" required maxlength="240"></label>
            <label class="full">摘要<textarea v-model="editorialDraft.summary" :disabled="!canEdit(editorialDraft)" rows="3" maxlength="1000"></textarea></label>
            <label class="full">图文正文<textarea v-model="editorialDraft.body" :disabled="!canEdit(editorialDraft)" rows="10" maxlength="30000" placeholder="填写段落；可使用基础 HTML（p、strong、em、ul、ol、a），发布时会自动过滤危险标签。"></textarea><small class="field-help">视频分享只需上传视频并填写标题；正文和字幕属于可选补充。</small></label>
            <label class="full">正文图片配置（受控媒体 JSON）<textarea v-model="editorialDraft.body_media_text" :disabled="!canEdit(editorialDraft)" rows="3" placeholder='[{"media_asset_id":"123","caption":"图片说明"}]'></textarea><small class="field-help">仅填写已登记的文章图片素材；正文图片可视化画布工具仍在后续切片实现。</small></label>
            <label v-if="editorialDraft.category === 'video'" class="full">字幕或文字稿<textarea v-model="editorialDraft.transcript" :disabled="!canEdit(editorialDraft)" rows="8" maxlength="30000" placeholder="可选：填写字幕或文字稿，便于检索和无障碍阅读。"></textarea></label>
            <section class="media-reference-editor full" aria-label="文章受控媒体">
              <div class="section-card-heading"><strong>{{ editorialDraft.category === 'video' ? '视频与正文受控媒体' : '动态新闻封面图' }}</strong><span>{{ editorialDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="editorialMediaSelection" :disabled="!canEdit(editorialDraft)"><option value="">{{ editorialDraft.category === 'video' ? '选择视频素材' : '选择动态新闻封面图' }}</option><option v-for="asset in eligibleEditorialMediaAssets(editorialDraft.category)" :key="asset.id" :value="String(asset.id)">{{ editorialMediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(editorialDraft) || !editorialMediaSelection" @click="addEditorialMediaReference">添加</button></div>
              <p class="field-help">动态新闻封面只接受“文章与资讯 / 动态新闻封面 / news / dynamic-news”的图片。视频分享可选择已发布视频，或仅用于登录后台实时预览的草稿视频。没有单独海报时，使用视频首帧；不能填写外部视频地址。</p>
              <p v-if="editorialDraft.category === 'video' && !eligibleEditorialMediaAssets('video').length" class="form-help">暂无可用于视频分享的素材。请先在“媒体资产”上传视频，并填写“文章与资讯 / 视频分享列表 / news / video-sharing”。</p>
              <p v-else-if="editorialDraft.category !== 'video' && !reviewedMediaAssets('article').length" class="form-help">暂无已发布的文章素材。请先在“媒体资产”完成上传、版权确认、规格检查和发布。</p>
              <div v-for="reference in editorialDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'article') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(editorialDraft)" @click="removeEditorialMediaReference(reference.media_asset_id)">移除</button></div>
            </section>
            <label>受控封面素材<select v-model="editorialDraft.cover_asset" :disabled="!canEdit(editorialDraft)"><option value="">{{ editorialDraft.category === 'video' ? '使用视频海报' : '尚未选择' }}</option><option v-if="editorialDraft.cover_asset && !isEditorialCoverAssetAllowed(editorialDraft.cover_asset, editorialDraft.category)" :value="editorialDraft.cover_asset">当前引用 {{ editorialDraft.cover_asset }}（尚未通过图片选择器核验）</option><option v-for="asset in eligibleEditorialCoverAssets(editorialDraft.category)" :key="asset.id" :value="String(asset.id)">{{ editorialMediaAssetLabel(asset) }}</option></select></label>
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

      <aside v-if="liveWebsitePreviewVisible && websitePreviewAvailable" class="live-website-preview" :class="{ 'visual-property-panel-open': selectedVisualElement }" aria-label="官网实时预览">
        <header class="visual-editor-toolbar" aria-label="画布编辑工具栏">
          <div class="visual-editor-brand"><span class="visual-editor-icon" aria-hidden="true">R</span><div><p class="eyebrow">官网画布编辑</p><strong>{{ previewTitle }}</strong></div></div>
          <div class="visual-editor-tools" role="toolbar" aria-label="编辑工具">
            <button type="button" :class="{ active: visualTool === 'select' }" :disabled="!visualCanvasEditable" title="选择元素" @click="visualTool = 'select'">↖<span>选择</span></button>
            <button type="button" :class="{ active: visualTool === 'text' }" :disabled="!visualCanvasEditable" title="选择文字元素" @click="visualTool = 'text'">T<span>文字</span></button>
            <button type="button" :class="{ active: visualTool === 'media' }" :disabled="!visualCanvasEditable" title="选择图片或视频" @click="visualTool = 'media'">▧<span>媒体</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" :class="{ active: visualDevice === 'desktop' }" title="桌面画布" @click="setVisualDevice('desktop')">▣<span>桌面</span></button>
            <button type="button" :class="{ active: visualDevice === 'tablet' }" title="平板画布" @click="setVisualDevice('tablet')">▤<span>平板</span></button>
            <button type="button" :class="{ active: visualDevice === 'mobile' }" title="手机画布" @click="setVisualDevice('mobile')">▥<span>手机</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" title="撤销" :disabled="!visualCanvasEditable || !canUndo" @click="undoVisualChange">↶<span>撤销</span></button>
            <button type="button" title="重做" :disabled="!visualCanvasEditable || !canRedo" @click="redoVisualChange">↷<span>重做</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" :disabled="!visualCanvasEditable" title="水平居中" @click="alignVisualElement('center')">↔<span>居中</span></button>
            <button type="button" @click="fitVisualCanvas">适应窗口</button>
            <label class="zoom-control" title="画布缩放">缩放 <input v-model.number="visualZoom" type="range" min="0.05" max="1" step="0.01"><output>{{ Math.round(visualZoom * 100) }}%</output></label>
          </div>
          <div class="visual-editor-actions">
            <label v-if="websitePreviewTarget?.collection === 'articles'" class="visual-record-switcher">新闻画布
              <select :value="articlePreviewSurface" aria-label="新闻画布" @change="switchArticlePreviewSurface($event.target.value)">
                <option value="detail">详情画布</option>
                <option value="list">列表卡片画布</option>
              </select>
            </label>
            <label v-if="visualRecordChoices.length > 1" class="visual-record-switcher">条目
              <select :value="String(websitePreviewTarget?.record?.id || '')" aria-label="切换预览条目" @change="handleVisualPreviewRecordChange($event)">
                <option v-for="choice in visualRecordChoices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
              </select>
            </label>
            <span class="visual-selected-label" :title="selectedVisualElement?.label || '未选择元素'">{{ selectedVisualElement?.label || '未选择元素' }}</span>
            <span :data-state="livePreviewStatus">{{ livePreviewStatusLabel }}</span>
            <button type="button" class="visual-mode-button" :class="{ 'visual-edit-active': visualEditMode }" :disabled="!visualCanvasEditable" :title="visualCanvasEditable ? (visualEditMode ? '关闭 PC 画布编辑' : '开启 PC 画布编辑') : '当前窗口仅支持只读预览'" @click="toggleVisualEditMode">{{ visualCanvasEditable ? (visualEditMode ? '编辑中' : '编辑模式') : '只读预览' }}</button>
            <button type="button" class="visual-save-button" :disabled="saving || !hasUnsavedChanges" title="保存当前草稿" @click="saveVisualDraft">{{ saving ? '保存中...' : '保存草稿' }}</button>
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
          <p v-if="selectedVisualElement.readonly" class="visual-property-help">{{ selectedVisualElement.readonlyReason || '此元素当前没有可写入的媒体记录。' }}</p>
          <template v-else>
            <label v-if="selectedVisualFieldOptions.length" class="visual-property-field">内容类型<select :value="selectedVisualFieldValue" @change="commitVisualField($event.target.value)"><option v-for="option in selectedVisualFieldOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
            <label v-else-if="selectedVisualElement.fieldPath && (selectedVisualElement.elementType === 'text' || selectedVisualElement.elementType === 'button')" class="visual-property-field">文字内容<textarea :value="selectedVisualFieldValue" rows="4" :maxlength="selectedVisualFieldMaxLength" @input="commitVisualField($event.target.value)"></textarea></label>
            <label v-if="selectedVisualElement.elementType === 'button' && selectedVisualElement.linkFieldPath" class="visual-property-field">按钮链接<input aria-label="按钮链接" :value="selectedVisualLinkValue" maxlength="1000" placeholder="例如：/contact 或 #reasons" @input="commitVisualLink($event.target.value)"></label>
            <label v-if="selectedVisualIsMedia && visualMediaOptions.length" class="visual-property-field">媒体替换<select v-model="visualMediaSelection" @change="replaceVisualMedia"><option value="">{{ selectedVisualCanRestoreDefault ? '沿用官网原图' : '选择媒体' }}</option><optgroup v-if="visualMediaAssets.length" label="已审核，可用于发布"><option v-for="asset in visualMediaAssets" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup><optgroup v-if="visualStagingMediaAssets.length" label="草稿素材，仅当前内部预览"><option v-for="asset in visualStagingMediaAssets" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup></select></label>
            <p v-if="selectedVisualIsMedia && visualStagingMediaAssets.length" class="visual-property-help">草稿素材只在已登录后台的实时预览中显示；保存的内容草稿不能提交发布，直到所用素材已审核发布。</p>
            <p v-else-if="selectedVisualIsMedia" class="visual-property-help">待媒体：当前没有符合该展示位置的已审核媒体或内部预览草稿。请先在媒体资产中导入并补全用途、替代文本和展示位置。</p>
            <div v-if="selectedVisualListReorder" class="visual-list-order"><span>当前第 {{ selectedVisualListReorder.index + 1 }} 项，共 {{ selectedVisualListReorder.length }} 项</span><div><button type="button" @click="duplicateSelectedVisualListItem">复制</button><button type="button" :disabled="selectedVisualListReorder.length <= 1" @click="removeSelectedVisualListItem">删除</button><button type="button" :disabled="selectedVisualListReorder.index === 0" @click="moveSelectedVisualListItem(-1)">上移</button><button type="button" :disabled="selectedVisualListReorder.index === selectedVisualListReorder.length - 1" @click="moveSelectedVisualListItem(1)">下移</button></div></div>
            <p v-if="selectedVisualParameterGroupRecords.length" class="visual-property-help">分组名称会同步更新当前型号中的 {{ selectedVisualParameterGroupRecords.length }} 项技术参数；该汇总标题不提供独立位置或样式设置。</p>
            <template v-if="!selectedVisualParameterGroupRecords.length"><div class="visual-property-grid"><label>水平偏移<input v-model.number="visualPosition.x" type="number" min="-30" max="30" step="0.1" @change="commitVisualPosition"></label><label>垂直偏移<input v-model.number="visualPosition.y" type="number" min="-30" max="30" step="0.1" @change="commitVisualPosition"></label></div>
            <div class="visual-property-grid"><label>字号<input v-model.number="visualTextStyle.fontSize" type="number" min="10" max="120" step="1" @change="commitVisualTextStyle"></label><label>字重<select v-model="visualTextStyle.fontWeight" @change="commitVisualTextStyle"><option value="400">正常</option><option value="500">中等</option><option value="600">半粗</option><option value="700">粗体</option></select></label></div>
            <div class="visual-property-grid"><label>行高<input v-model.number="visualTextStyle.lineHeight" type="number" min="1" max="2.2" step="0.05" @change="commitVisualTextStyle"></label><label>文字颜色<input v-model="visualTextStyle.textColor" type="color" @change="commitVisualTextStyle"></label></div></template>
            <p class="visual-property-help">只保存受控字段，不会修改 Nuxt 模板或写入任意 CSS。</p>
          </template>
        </aside>
      </aside>

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
      </section>
    </div>
  </private-view>
</template>

<script setup>
import { filterVisualMediaAssets } from './visual-media-filter.js';
import { filterPreviewStagingMediaAssets, isPreviewStagingMedia } from './visual-media-staging.js';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { resolveHomepageReasonMediaPlacement, resolveNewsCoverMediaPlacement, resolveQualificationMediaPlacement, qualificationDraftAssets } from './visual-media-placement.js';
import { filterEditorialRecords } from './editorial-record-filter.js';
import { livePreviewGrantIds } from './editorial-preview-grants.js';
import { useApi } from '@directus/extensions-sdk';
import { defaultSectionPresentation, normalizeFieldPresentations, normalizeSectionPresentation, validateSectionPresentation } from './section-presentation.js';
import { applyVisualMediaReplacement, duplicateVisualListItem, getVisualFieldValue, getVisualListReorder, getVisualMediaAssetId, hydrateHomeReasonFields, hydrateProductDimensionsFields, hydrateProductProofFields, hydrateServiceActionMediaFields, hydrateServiceOfficeFields, hydrateServiceSupportFields, isVisualMediaSelection, moveVisualListItem, removeVisualListItem, resolveVisualFieldTarget, setVisualFieldValue, shouldKeepVisualDraft, visualFieldMaxLength } from './visual-editing-fields.js';
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
import { editorialMediaAssets, isEditorialMediaAssetAllowed } from './editorial-media-assets.js';
import { visualPresentationFieldPath } from './visual-editing-presentation-path.js';
import { createManufacturingProcessNode } from './manufacturing-process-node.js';
import { validateMediaFileContent } from './media-file-validation.js';
import { canEditVisualCanvas } from './visual-editing-viewport.js';

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
const footerTextStyleDefinitions = Object.freeze([
  ['products', '产品中心标题'], ['workstation', '灵动切割工作站'], ['auto', 'FR-XS(auto)'], ['pro', 'FR-XS(pro)'], ['ft', 'FT-XS(pro)'], ['fr-y', 'FR-Y'], ['fl', 'FL-XS(pro)'],
  ['manufacturing', '先进智造标题'], ['cnc', 'CNC车间'], ['metal', '钣金车间'], ['assembly', '装配车间'], ['about', '关于我们标题'], ['honors', '荣誉资质认证'], ['history', '品牌发展历程'],
  ['address-changshu', '常熟工厂地址'], ['address-kunshan', '昆山工厂地址'], ['phone', '服务热线'], ['email-domestic', '国内邮箱'], ['email-export', '外贸邮箱'],
  ['purchase-title', '采购区按钮文案'], ['purchase-copy', '采购区标题与说明'], ['purchase-phone', '采购联系电话']
].map(([id, label]) => Object.freeze({ id, label })));
const repairPageKeys = new Set(['repair_home', 'repair_new', 'repair_warranty', 'repair_progress']);
const repairActionCodes = new Set(['01', '02', '09', '10']);
const activeTab = ref('home');
const siteArea = ref('home');
const siteAreaLabels = Object.freeze({
  home: '网站主页',
  product: '产品展示',
  manufacturing: '先进制造',
  news: '视频新闻',
  about: '关于瑞钧',
  service: '服务支持'
});
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
const siteAreaContentMap = Object.freeze({
  home: [
    { key: 'homepage-video', label: '首页视频', sectionKey: 'hero' },
    { key: 'homepage-reasons', label: '三大特点', sectionKey: 'why-ruijun' },
    { key: 'homepage-products', label: '产品系列展示图', sectionKey: 'products' },
    { key: 'homepage-history', label: '时间轴', sectionKey: 'history' },
    { key: 'homepage-product-task', label: '选型咨询', sectionKey: 'product-task' }
  ],
  product: [
    { key: 'product-hero', label: '产品首屏', sectionKey: 'hero' },
    { key: 'product-proofs', label: '三大指标', sectionKey: 'categories' },
    { key: 'product-series', label: '产品系列与型号', action: 'series' },
    { key: 'product-dimensions', label: '尺寸与资料说明', sectionKey: 'dimensions' },
    { key: 'product-parameters', label: '产品型号、参数与尺寸图', action: 'models' },
    { key: 'product-resources', label: '产品资料区标题', sectionKey: 'resources' },
    { key: 'product-cases', label: '应用案例区标题', sectionKey: 'cases' }
  ],
  manufacturing: [
    { key: 'manufacturing-hero', label: '制造首屏', sectionKey: 'hero' },
    { key: 'manufacturing-process', label: '工艺流程画布', sectionKey: 'process' },
    { key: 'manufacturing-precision-machining', label: 'CNC车间', sectionKey: 'precision-machining' },
    { key: 'manufacturing-sheet-metal', label: '钣金车间', sectionKey: 'sheet-metal' },
    { key: 'manufacturing-standardized-assembly', label: '装配车间', sectionKey: 'standardized-assembly' },
    { key: 'manufacturing-whole-machine-validation', label: '精密检测', sectionKey: 'whole-machine-validation' },
    { key: 'manufacturing-electrical-assembly', label: '电气装配', sectionKey: 'electrical-assembly' },
    { key: 'manufacturing-smart-warehouse', label: '智能物料仓储', sectionKey: 'smart-warehouse' },
    { key: 'manufacturing-equipment', label: '生产核心设备', sectionKey: 'core-equipment' }
  ],
  news: [
    { key: 'news-hero', label: '视频新闻首屏', sectionKey: 'hero' },
    { key: 'news-dynamic-section', label: '动态新闻标题', sectionKey: 'dynamic-news' },
    { key: 'news-articles', label: '动态新闻内容', action: 'articles' },
    { key: 'news-video-section', label: '视频分享标题', sectionKey: 'video-sharing' },
    { key: 'news-videos', label: '视频分享内容', action: 'videos' }
  ],
  about: [
    { key: 'about-hero', label: '关于瑞钧首屏', sectionKey: 'hero' },
    { key: 'about-story', label: '品牌故事', sectionKey: 'brand-story' },
    { key: 'about-overview', label: '公司简介', sectionKey: 'overview' },
    { key: 'about-history-title', label: '发展历程标题', sectionKey: 'history' },
    { key: 'about-history', label: '发展历程里程碑', action: 'milestones' },
    { key: 'about-factory', label: '厂区风貌', sectionKey: 'factory' },
    { key: 'about-certificates', label: '认证证书', sectionKey: 'certificates' },
    { key: 'about-honors', label: '荣誉证书', sectionKey: 'honors' },
    { key: 'about-patents', label: '专利证书', sectionKey: 'patents' },
    { key: 'about-galleries', label: '资质与图库素材', action: 'qualifications' },
    { key: 'about-partners', label: '合作品牌', sectionKey: 'partners' },
    { key: 'about-clients', label: '国内客户', sectionKey: 'clients-domestic' },
    { key: 'about-clients-global', label: '国外客户', sectionKey: 'clients-global' }
  ],
  service: [
    { key: 'service-hero', label: '服务支持首屏', sectionKey: 'hero' },
    { key: 'service-support', label: '瑞钧支持', sectionKey: 'support' },
    { key: 'service-models', label: '适用型号', sectionKey: 'support-models' },
    { key: 'service-actions', label: '服务入口', sectionKey: 'support-actions' },
    { key: 'service-offices', label: '国内直属办事处', sectionKey: 'office-directory' },
    { key: 'service-resource-records', label: '服务资料与视频教学', action: 'resources' },
    { key: 'service-location-records', label: '服务网点记录', action: 'locations' },
    { key: 'service-repair', label: '售后页面配置', action: 'repair' }
  ]
});
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
const showAdvanced = ref(false);
const helpOpen = ref(false);
const loading = ref(false);
const saving = ref(false);
const parametersLoading = ref(false);
const error = ref('');
const message = ref('');
const retrySaveAction = ref(null);
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
const pageMediaSelection = ref('');
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
const editorialCategory = ref('');
const selectedEditorialId = ref('');
const selectedKnowledgeId = ref('');
const pageDraft = ref(null);
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
const savedDraftFingerprint = ref('');
const savedDraftSnapshot = ref(null);

const livePreviewFields = Object.freeze({
  pages: ['id', 'slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  repair_page_configs: ['id', 'page_key', 'title', 'intro', 'hero_asset', 'model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo', 'language', 'status', 'publication_state', 'published_at'],
  product_series: ['id', 'series_code', 'slug', 'name', 'positioning', 'presentation', 'scenarios', 'capabilities', 'cover_asset', 'cover_media_asset_id', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['id', 'series_code', 'model_code', 'slug', 'name', 'parameters', 'parameter_groups', 'configuration', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  product_parameters: ['id', 'model_code', 'group_name', 'field_name', 'value', 'unit', 'presentation', 'sort_order', 'status', 'publication_state'],
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
function websitePreviewContextFor(target, requestedSectionKey = activePageSectionKey.value) {
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
const visualRecordChoices = computed(() => {
  const collection = String(websitePreviewTarget.value?.collection || '').trim();
  const recordsByCollection = {
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
  return (recordsByCollection[collection] || []).map((record) => ({
    id: String(record.id),
    label: visualRecordLabel(collection, record)
  }));
});
let preserveLivePreviewSessionOnce = false;
const livePreviewStatusLabel = computed(() => ({
  idle: '等待连接', opening: '正在打开', connected: '实时同步', syncing: '正在同步', error: '连接失败'
})[livePreviewStatus.value] || '等待连接');
const currentLivePreviewRecord = computed(() => buildLivePreviewRecord());
const hasUnsavedChanges = computed(() => Boolean(savedDraftFingerprint.value) && currentDraftFingerprint() !== savedDraftFingerprint.value);
const canUndo = computed(() => visualHistoryIndex.value > 0);
const canRedo = computed(() => visualHistoryIndex.value >= 0 && visualHistoryIndex.value < visualHistory.value.length - 1);
const visualCanvasEditable = computed(() => canEditVisualCanvas({ device: visualDevice.value, viewportWidth: visualViewportWidth.value }));
const visualCanvasWidth = computed(() => ({ desktop: '1920px', tablet: '900px', mobile: '390px' }[visualDevice.value] || '1920px'));
const visualCanvasHeight = computed(() => ({ desktop: '1080px', tablet: '1200px', mobile: '844px' }[visualDevice.value] || '1080px'));
const canvasViewport = ref(null);
let canvasResizeObserver;
function fitVisualCanvas() {
  const el = canvasViewport.value;
  if (!el) return;
  visualZoom.value = Math.max(0.05, Math.min(1, (el.clientWidth - 40) / parseInt(visualCanvasWidth.value), (el.clientHeight - 40) / parseInt(visualCanvasHeight.value)));
}
watch(canvasViewport, (el) => {
  canvasResizeObserver?.disconnect();
  if (!el) return;
  canvasResizeObserver = new ResizeObserver(fitVisualCanvas);
  canvasResizeObserver.observe(el);
  fitVisualCanvas();
});
watch(visualDevice, () => nextTick(fitVisualCanvas));
onBeforeUnmount(() => canvasResizeObserver?.disconnect());
function visualMediaFilterOptions() {
  const element = selectedVisualElement.value || {};
  const collection = String(websitePreviewTarget.value?.collection || '').trim();
  const slug = String(websitePreviewTarget.value?.record?.slug || '').trim();
  const recordCategory = String(websitePreviewTarget.value?.record?.category || '').trim();
  const qualificationPlacement = resolveQualificationMediaPlacement({ collection, type: websitePreviewTarget.value?.record?.type, fieldPath: element.fieldPath, elementType: element.elementType });
  if (qualificationPlacement) return qualificationPlacement;
  const newsCoverPlacement = resolveNewsCoverMediaPlacement({ collection, category: recordCategory, fieldPath: element.fieldPath, elementType: element.elementType });
  if (newsCoverPlacement) return newsCoverPlacement;
  const articleMediaField = /^media\.\d+\.path$/.test(String(element.fieldPath || '').trim());
  const homepageReasonPlacement = resolveHomepageReasonMediaPlacement({
    collection,
    slug,
    sectionKey: String(element.sectionKey || '').trim(),
    mediaRole: String(element.mediaRole || '').trim(),
    elementType: String(element.elementType || '').trim()
  });
  if (homepageReasonPlacement) return homepageReasonPlacement;
  if (collection === 'product_series' && String(element.mediaRole || '').trim() === 'cover') {
    return { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image', pageKey: 'product', sectionKey: '' };
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
  if (collection === 'articles' && articleMediaField && String(element.elementType || '') === 'video') {
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
const selectedVisualIsMedia = computed(() => isVisualMediaSelection(selectedVisualElement.value));
const previewableMediaAssets = computed(() => [
  ...mediaAssets.value,
  ...filterPreviewStagingMediaAssets(mediaCandidates.value)
]);
const selectedVisualRecord = computed(() => {
  const selection = selectedVisualElement.value || {};
  const resolved = resolveVisualEditingRecord({
    pages: preferVisualDraftRecord(pages.value, pageDraft.value),
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
function visualParameterGroupRecords(element = selectedVisualElement.value) {
  if (String(element?.collection || '') !== 'product_parameters' || String(element?.fieldPath || '') !== 'group_name') return [];
  const ids = Array.isArray(element?.groupRecordIds) ? element.groupRecordIds.map((id) => String(id || '').trim()) : [];
  if (!ids.length || ids.length > 32 || ids.some((id) => !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id))) return [];
  const records = parameters.value.filter((parameter) => ids.includes(String(parameter?.id || '')));
  return records.length === ids.length && records.every((parameter) => String(parameter?.model_code || '') === String(modelDraft.value?.model_code || '')) ? records : [];
}
const selectedVisualParameterGroupRecords = computed(() => visualParameterGroupRecords());
const selectedVisualFieldOptions = computed(() => {
  const collection = String(selectedVisualElement.value?.collection || '').trim();
  const fieldPath = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (collection === 'articles' && fieldPath === 'category') {
    return [
      { value: 'news', label: '动态新闻' },
      { value: 'video', label: '视频分享' }
    ];
  }
  return [];
});

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
  savedDraftSnapshot.value = cloneVisualSnapshot(currentDraftState());
  savedDraftFingerprint.value = JSON.stringify(savedDraftSnapshot.value);
  resetVisualHistory();
}

function cloneVisualState(value) {
  return cloneVisualSnapshot(value);
}

function resetVisualHistory() {
  const history = createVisualHistory(currentDraftState());
  visualHistory.value = history.entries;
  visualHistoryIndex.value = history.index;
}

function recordVisualHistory() {
  const history = recordVisualSnapshot({ entries: visualHistory.value, index: visualHistoryIndex.value }, currentDraftState());
  visualHistory.value = history.entries;
  visualHistoryIndex.value = history.index;
}

function applyVisualState(snapshot) {
  if (!snapshot) return;
  suppressDraftHistory = true;
  if (activeTab.value === 'pages') pageDraft.value = snapshot;
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
  markDraftSaved();
  // The iframe owns its own reactive snapshot; push the restored baseline
  // immediately instead of requiring a manual reconnect.
  postLivePreviewUpdate();
}

async function retrySave() {
  const action = retrySaveAction.value;
  if (typeof action === 'function') await action();
}

async function saveVisualDraft() {
  if (selectedVisualRecord.value?.collection === 'site_settings') {
    retrySaveAction.value = saveVisualDraft;
    await saveVisualSiteSettings();
    if (!error.value) retrySaveAction.value = null;
    return;
  }
  if (selectedVisualRecord.value?.collection === 'product_parameters') {
    retrySaveAction.value = saveVisualDraft;
    const groupRecords = selectedVisualParameterGroupRecords.value;
    if (groupRecords.length) await saveVisualParameterGroup(groupRecords);
    else await saveParameter(selectedVisualRecord.value.record);
    if (!error.value) retrySaveAction.value = null;
    return;
  }
  const handlers = { pages: savePage, series: saveSeries, models: saveModel, company: saveCompanyRecord, service: saveServiceRecord, repair: saveRepairPage, editorial: saveEditorialRecord, knowledge: saveKnowledge, settings: saveSettings };
  const handler = handlers[activeTab.value];
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
  const groupRecords = selectedVisualParameterGroupRecords.value;
  if (groupRecords.length) {
    const groupName = String(value || '').trim();
    if (!groupName || groupName.length > 120) {
      error.value = '分组名称不能为空，且不得超过 120 个字符。';
      return;
    }
    groupRecords.forEach((parameter) => { parameter.group_name = groupName; });
    error.value = '';
    recordVisualHistory();
    groupRecords.forEach((parameter) => postLivePreviewUpdate({ collection: 'product_parameters', record: parameter }));
    return;
  }
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

function remapVisualListPath(path, arrayPath, previousIndex, nextIndex) {
  const parts = String(path || '').trim().split('.').filter(Boolean);
  const arrayParts = String(arrayPath || '').trim().split('.').filter(Boolean);
  if (arrayParts.length && arrayParts.every((part, index) => parts[index] === part) && parts[arrayParts.length] === String(previousIndex)) {
    parts[arrayParts.length] = String(nextIndex);
  }
  return parts.join('.');
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

function replaceVisualMedia() {
  const assetId = String(visualMediaSelection.value || '').trim();
  const visualRecord = selectedVisualRecord.value;
  const record = visualRecord?.record || websitePreviewTarget.value?.record;
  const collection = visualRecord?.collection || websitePreviewTarget.value?.collection || '';
  const target = selectedVisualTarget.value;
  const path = String(selectedVisualElement.value?.fieldPath || '').trim();
  const mediaSlot = selectedVisualElement.value?.mediaSlot || '';
  const canRestoreDefault = canRestoreVisualMediaDefault(selectedVisualElement.value, collection, path);
  const isClearingGovernedSlot = !assetId && /^action-[1-8]$/.test(String(mediaSlot));
  if ((!assetId && !isClearingGovernedSlot && !canRestoreDefault) || !record || !target || !path || !canEdit(record)) return;
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
  if (!applyVisualMediaReplacement(target, path, assetId, { mediaSlot, allowEmpty: canRestoreDefault })) return;
  recordVisualHistory();
  if (livePreviewFrame.value?.contentWindow && livePreviewWebsiteOrigin.value) livePreviewFrame.value.contentWindow.postMessage(payload, livePreviewWebsiteOrigin.value);
  visualMediaSelection.value = assetId;
  queueLivePreviewUpdate(visualRecord);
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
  activateVisualEditingTarget({ collection, itemId: nextId, sectionKey: websitePreviewContext.value.sectionKey }, { discardConfirmed: true });
  return true;
}

function selectTab(tab) {
  if (tab === activeTab.value) return;
  if (!confirmDiscardChanges('切换内容类型')) return;
  activeTab.value = tab;
  if (advancedTabs.has(tab)) showAdvanced.value = true;
  markDraftSaved();
}

async function selectSiteArea(area) {
  if (!Object.hasOwn(siteAreaLabels, area)) return;
  if (!confirmDiscardChanges('切换官网栏目')) return;
  if (area === 'home') {
    const page = pages.value.find((record) => record.slug === 'home');
    if (!page) {
      error.value = '未找到首页草稿，请重新加载后再试。';
      return;
    }
    siteArea.value = area;
    activeTab.value = 'pages';
    clearVisualSelection();
    selectPage(page.id, true);
    activePageSectionKey.value = '';
    markDraftSaved();
    // Let the identity watcher reconnect an existing canvas before deciding
    // whether this is the first preview session.
    await nextTick();
    if (!liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
    return;
  }
  siteArea.value = area;
  // 先停留在栏目模块总览；只有点击具体模块时才进入页面编辑器。
  activeTab.value = 'home';
  selectedPageId.value = '';
  pageDraft.value = null;
  activePageSectionKey.value = '';
  clearVisualSelection();
  markDraftSaved();
}

function openSiteAreaPage() {
  selectSiteArea(siteArea.value);
}

function isSiteAreaEntryActive(entry) {
  if (entry.action === 'series') return activeTab.value === 'series' || activeTab.value === 'models';
  if (entry.action === 'models') return activeTab.value === 'models';
  if (entry.action === 'manufacturing') return activeTab.value === 'company' && companyMode.value === 'manufacturing_evidence';
  if (entry.action === 'articles') return activeTab.value === 'editorial' && editorialMode.value === 'articles' && editorialDraft.value?.category !== 'video';
  if (entry.action === 'videos') return activeTab.value === 'editorial' && editorialMode.value === 'articles' && editorialDraft.value?.category === 'video';
  if (entry.action === 'milestones') return activeTab.value === 'company' && companyMode.value === 'milestones';
  if (entry.action === 'qualifications') return activeTab.value === 'company' && companyMode.value === 'qualifications';
  if (entry.action === 'repair') return activeTab.value === 'repair';
  if (entry.action === 'resources') return activeTab.value === 'service' && serviceMode.value === 'service_resources';
  if (entry.action === 'locations') return activeTab.value === 'service' && serviceMode.value === 'service_locations';
  return activeTab.value === 'pages' && pageDraft.value?.slug === siteArea.value && activePageSectionKey.value === entry.sectionKey;
}

async function openSiteAreaEntry(entry) {
  if (!confirmDiscardChanges('切换官网内容模块')) return;
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
    const category = entry.action === 'videos' ? 'video' : 'news';
    const record = editorialRecords('articles').find((item) => item.category === category);
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
  } else if (collection === 'product_models') {
    Object.assign(record, productModelLivePreviewRecord(record, parameters.value));
    record.body_media = parseArray(record.body_media).map((reference) => ({ ...reference, ...(previewMediaAsset(reference?.media_asset_id) || {}) }));
    record.media = normalizeMediaReferences(record.mediaReferences || record.media || []).flatMap((reference) => {
      const media = previewMediaAsset(reference.media_asset_id);
      return media ? [{ ...reference, ...media }] : [reference];
    });
    const configuration = clone(record.configuration || {});
    configuration.features = parseArray(configuration.features).map((item) => ({ ...item }));
    configuration.drawings = parseArray(configuration.drawings).map((drawing) => {
      const drawingMedia = previewMediaAsset(drawing?.media_asset_id);
      return drawingMedia ? { ...drawing, ...drawingMedia } : drawing;
    });
    const technicalImage = previewMediaAsset(configuration.labels?.technical_image_asset_id)?.path;
    if (technicalImage) configuration.labels = { ...configuration.labels, technicalImage };
    record.configuration = configuration;
  } else if (collection === 'articles') {
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
  if (grantIds.length) {
    try {
      for (const assetId of grantIds) {
        const issued = await api.post('/content-preview-tokens/media/issue', { contentCollection: target.collection, contentItemId: String(target.record.id), assetId });
        mediaGrants.push(issued.data.data.token);
      }
    } catch { livePreviewStatus.value = 'error'; error.value = '素材预览授权失败，请重新打开预览。'; return; }
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
  if (!target?.record?.id || !editableStatuses.has(target.record.status) || target.record.publication_state === 'published') return;
  if (!automatic) livePreviewAutoRenewedForFrame = false;
  const targetSnapshot = { collection: String(target.collection), record: clone(target.record) };
  const contextSnapshot = target.context || websitePreviewContextFor(targetSnapshot);
  if (!preserveRoot) livePreviewRootTarget = { ...targetSnapshot, context: clone(contextSnapshot) };
  const requestSequence = ++livePreviewRequestSequence;
  liveWebsitePreviewVisible.value = true;
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
}

function activateVisualEditingTarget(selection, { discardConfirmed = false } = {}) {
  const collection = String(selection?.collection || '').trim();
  const itemId = String(selection?.itemId || '').trim();
  const state = {
    pages: pages.value,
    series: series.value,
    models: models.value,
    parameters: parameters.value,
    editorial: editorial.value,
    company: company.value,
    service: service.value,
    repairPages: repairPages.value,
    settings: settingsDraft.value
  };
  const resolved = resolveVisualEditingRecord(state, { collection, itemId, fieldPath: selection?.fieldPath });
  if (!resolved) return null;
  const currentTarget = websitePreviewTarget.value;
  if (!discardConfirmed && requiresVisualDraftSwitchConfirmation({
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
    selectSeries(resolvedItemId, true);
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
      mediaSlot: String(event.data.mediaSlot || ''),
      placementKey: '',
      allowDefaultMedia: event.data.allowDefaultMedia === true,
      readonly: true,
      readonlyReason: String(event.data.readonlyReason || '请先在媒体资产中导入、审核并发布后再替换。'),
      rect: event.data.rect || null
    };
    visualMediaSelection.value = '';
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:edit-request' || event.data?.type === 'ruijun:cms-preview:edit-commit') {
    const resolved = activateVisualEditingTarget(event.data);
    if (!resolved) return;
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
      mediaSlot: String(event.data.mediaSlot || ''),
      placementKey: String(event.data.placementKey || event.data.mediaPlacementKey || ''),
      allowDefaultMedia: event.data.allowDefaultMedia === true,
      groupRecordIds: Array.isArray(event.data.groupRecordIds) ? event.data.groupRecordIds.map((id) => String(id || '').trim()) : [],
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
    visualMediaSelection.value = isVisualMediaSelection(event.data)
      ? getVisualMediaAssetId(fieldTarget, fieldPath, { mediaSlot: String(event.data.mediaSlot || '') })
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
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

function normalizePageMedia(value) {
  const seen = new Set();
  return parseArray(value).flatMap((entry) => {
    const mediaAssetId = typeof entry?.media_asset_id === 'string' || Number.isSafeInteger(entry?.media_asset_id)
      ? String(entry.media_asset_id).trim() : '';
    if (!mediaAssetId || seen.has(mediaAssetId)) return [];
    seen.add(mediaAssetId);
    return [{ media_asset_id: mediaAssetId, role: typeof entry?.role === 'string' ? entry.role.trim().slice(0, 60) : '' }];
  });
}

function normalizeSections(value) {
  return parseArray(value).filter((section) => section && typeof section === 'object').map((section) => ({
    ...section,
    id: String(section.id || ''),
    kicker: typeof section.kicker === 'string' ? section.kicker : '',
    label: typeof section.label === 'string' ? section.label : '',
    title: typeof section.title === 'string' ? section.title : '',
    body: typeof section.body === 'string' ? section.body : '',
    description: typeof section.description === 'string' ? section.description : '',
    content: parseObject(section.content),
    value: typeof section.value === 'number' && Number.isFinite(section.value) ? section.value : (typeof section.value === 'string' ? section.value : ''),
    unit: typeof section.unit === 'string' ? section.unit : '',
    items: parseArray(section.items).map((item, itemIndex) => ({
      ...item,
      sort_order: Number.isInteger(Number(item?.sort_order)) ? Number(item.sort_order) : itemIndex,
      ...normalizeSectionPresentation(item)
    })),
    media: normalizePageMedia(section.media),
    pagination: normalizePagination(section.pagination),
    ...normalizeSectionPresentation(section)
  }));
}

function normalizePagination(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const pageSize = Number(source.page_size);
  return {
    page_size: Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 6 ? pageSize : 6,
    sort: ['manual', 'published_at_desc', 'sort_order_asc'].includes(source.sort) ? source.sort : 'manual',
    previous_label: String(source.previous_label || '上一页').slice(0, 120),
    next_label: String(source.next_label || '下一页').slice(0, 120),
    empty_label: String(source.empty_label || '').slice(0, 120)
  };
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

function normalizeSeries(record) {
  const presentationSource = parseObject(record.presentation);
  const fieldPresentation = normalizeFieldPresentations(presentationSource.field_presentation, ['name', 'positioning']);
  return {
    ...clone(record),
    presentation: Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {},
    scenariosText: textList(record.scenarios), capabilitiesText: textList(record.capabilities),
    sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0
  };
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

function normalizeModel(record) {
  const source = parseObject(record.configuration);
  const labels = parseObject(source.labels);
  const fieldPresentation = normalizeProductModelFeaturePresentation(source);
  return {
    ...clone(record),
    configurationSource: clone(source),
    configuration: {
      intro: {
        title: String(source.intro?.title || ''),
        subtitle: String(source.intro?.subtitle || ''),
        scene: String(source.intro?.scene || ''),
        body: String(source.intro?.body || '')
      },
      machine_asset_id: String(source.machine_asset_id || ''),
      labels: {
        technical: String(labels.technical || ''),
        drawing: String(labels.drawing || ''),
        technical_image_asset_id: String(labels.technical_image_asset_id || '')
      },
      features: parseArray(source.features).map((item) => ({ label: String(item?.label || ''), detail: String(item?.detail || ''), note: String(item?.note || ''), image: String(item?.image || ''), media_asset_id: String(item?.media_asset_id || '') })),
      drawings: parseArray(source.drawings).map((item) => ({ title: String(item?.title || item?.label || ''), caption: String(item?.caption || item?.description || ''), media_asset_id: String(item?.media_asset_id || '') })),
      ...(Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {})
    },
    resources: parseArray(record.resources).map((item) => ({ title: String(item?.title || ''), type: String(item?.type || ''), url: String(item?.url || item?.path || ''), media_asset_id: String(item?.media_asset_id || '') })),
    mediaReferences: normalizeMediaReferences(record.media)
  };
}

function emptyParameter() {
  return { group_name: '', field_name: '', value: '', unit: '', sort_order: 0, test_conditions: '' };
}

function emptyMediaDraft() {
  return {
    file: null, usage_scope: 'product', media_type: '', placement_key: '', page_key: '', section_key: '',
    width: 0, height: 0, duration_seconds: 0, aspect_ratio: '', poster_asset_id: '', sort_order: 0,
    enabled: true, autoplay: false, muted: true, loop: false, title: '', description: '', transcript: '',
    copyright_status: 'owned', alt_text: '', authorization_note: ''
  };
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

const mediaPlacementOptions = Object.freeze([
  { key: 'default.image', label: '通用大图', mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'brand.logo.image', label: '品牌标志', mediaType: 'image', minWidth: 400, minHeight: 120, aspectRatio: '自适应', maxBytes: 25 * 1024 * 1024 },
  { key: 'footer.icon.image', label: '页脚联系图标', mediaType: 'image', minWidth: 64, minHeight: 64, aspectRatio: '1:1', maxBytes: 25 * 1024 * 1024 },
  { key: 'product.gallery.image', label: '产品图或尺寸图', mediaType: 'image', minWidth: 1200, minHeight: 900, aspectRatio: '4:3 或透明底', maxBytes: 25 * 1024 * 1024 },
  { key: 'home.reason.background', label: '首页三大特点背景', mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'home.reason.machine', label: '首页三大特点设备前景', mediaType: 'image', minWidth: 160, minHeight: 240, aspectRatio: '按原图比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'home.reason.icon', label: '首页横移图标', mediaType: 'image', minWidth: 80, minHeight: 96, aspectRatio: '按原图比例', maxBytes: 5 * 1024 * 1024 },
  { key: 'manufacturing.gallery.image', label: '制造与厂区图片', mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'manufacturing.layer.image', label: '制造页面 PSD 图层图片', mediaType: 'image', minWidth: 452, minHeight: 254, aspectRatio: '按原图层比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'manufacturing.equipment.image', label: '生产核心设备卡图', mediaType: 'image', minWidth: 740, minHeight: 415, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'qualification.image', label: '证书或资质图片', mediaType: 'image', minWidth: 365, minHeight: 410, aspectRatio: '按原图比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'home.hero.video', label: '首页首屏视频', mediaType: 'video', minWidth: 1920, minHeight: 1080, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, maxDurationSeconds: 180, posterRequired: true, autoplay: true, muted: true },
  { key: 'home.hero.poster', label: '首页首屏视频海报', mediaType: 'image', minWidth: 1920, minHeight: 1080, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'news.hero.video', label: '视频新闻首屏', mediaType: 'video', minWidth: 1920, minHeight: 1080, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, posterRequired: true, autoplay: true, muted: true },
  { key: 'news.dynamic_news.cover', label: '动态新闻封面图', mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'news.video_share.list', label: '视频分享列表', mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, maxDurationSeconds: 600, posterRequired: false, transcriptRequired: false },
  { key: 'service.tutorial.video', label: '服务教学视频', mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, posterRequired: true, transcriptRequired: true },
  { key: 'service.tutorial.poster', label: '服务教学视频海报', mediaType: 'image', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.timeline.background', label: '关于页时间轴背景', mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.timeline.icon', label: '关于页时间轴导航图标', mediaType: 'image', minWidth: 96, minHeight: 96, aspectRatio: '1:1', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.hero.background', label: '关于瑞钧首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.hero.foreground', label: '关于瑞钧首屏机器图', mediaType: 'image', minWidth: 800, minHeight: 600, aspectRatio: '按原图比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.gallery.image', label: '关于页厂区图库', mediaType: 'image', minWidth: 792, minHeight: 446, aspectRatio: '按原图比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.client.image', label: '关于页客户图片', mediaType: 'image', minWidth: 542, minHeight: 406, aspectRatio: '按原图比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'about.partner.image', label: '关于页合作品牌图片', mediaType: 'image', minWidth: 800, minHeight: 500, aspectRatio: '自适应', maxBytes: 25 * 1024 * 1024 },
  { key: 'service.hero.image', label: '服务支持首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 960, aspectRatio: '2:1', maxBytes: 25 * 1024 * 1024 },
  { key: 'service.office.image', label: '服务办事处图片', mediaType: 'image', minWidth: 800, minHeight: 400, aspectRatio: '按原图比例', maxBytes: 25 * 1024 * 1024 },
  { key: 'service.office.map', label: '服务办事处地图', mediaType: 'image', minWidth: 1200, minHeight: 250, aspectRatio: '宽幅地图', maxBytes: 25 * 1024 * 1024 },
  { key: 'service.action.icon', label: '服务入口图标', mediaType: 'image', minWidth: 34, minHeight: 42, aspectRatio: '按原图标比例', maxBytes: 5 * 1024 * 1024 },
  { key: 'manufacturing.hero.image', label: '先进制造首屏背景', mediaType: 'image', minWidth: 1920, minHeight: 900, aspectRatio: '21:10 或 16:9', maxBytes: 25 * 1024 * 1024 },
  { key: 'manufacturing.process.image', label: '先进制造工艺节点图片', mediaType: 'image', minWidth: 1200, minHeight: 700, aspectRatio: '自适应', maxBytes: 25 * 1024 * 1024 },
  { key: 'manufacturing.hero.video', label: '先进制造首屏视频', mediaType: 'video', minWidth: 1920, minHeight: 900, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, maxDurationSeconds: 600, posterRequired: true, transcriptRequired: true },
  { key: 'manufacturing.process.video', label: '先进制造工艺演示视频', mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, maxDurationSeconds: 600, posterRequired: true, transcriptRequired: true },
  { key: 'manufacturing.gallery.video', label: '先进制造设备视频', mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * 1024 * 1024, maxDurationSeconds: 600, posterRequired: true, transcriptRequired: true },
  { key: 'product.document', label: '产品资料 PDF', mediaType: 'document', maxBytes: 50 * 1024 * 1024 },
  { key: 'service.document', label: '服务资料 PDF', mediaType: 'document', maxBytes: 50 * 1024 * 1024 }
]);

// Keep the upload form's page/section context aligned with the identifiers
// used by the Nuxt preview contract.  Placement keys are not safe to split on
// dots: e.g. news.video_share.list maps to section video-sharing.
const mediaPlacementContexts = Object.freeze({
  'home.hero.video': { pageKey: 'home', sectionKey: 'hero' },
  'home.hero.poster': { pageKey: 'home', sectionKey: 'hero' },
  'home.reason.background': { pageKey: 'home' },
  'home.reason.machine': { pageKey: 'home' },
  'home.reason.icon': { pageKey: 'home' },
  'news.hero.video': { pageKey: 'news', sectionKey: 'hero' },
  'news.dynamic_news.cover': { pageKey: 'news', sectionKey: 'dynamic-news' },
  'news.video_share.list': { pageKey: 'news', sectionKey: 'video-sharing' },
  'about.timeline.background': { pageKey: 'about', sectionKey: 'history' },
  'about.timeline.icon': { pageKey: 'about', sectionKey: 'history' },
  'about.hero.background': { pageKey: 'about', sectionKey: 'hero' },
  'about.hero.foreground': { pageKey: 'about', sectionKey: 'hero' },
  'about.gallery.image': { pageKey: 'about', sectionKey: 'factory' },
  'about.client.image': { pageKey: 'about' },
  'about.partner.image': { pageKey: 'about', sectionKey: 'partners' },
  'service.hero.image': { pageKey: 'service', sectionKey: 'hero' },
  'service.action.icon': { pageKey: 'service', sectionKey: 'support-actions' },
  'service.office.image': { pageKey: 'service', sectionKey: 'office-directory' },
  'service.office.map': { pageKey: 'service', sectionKey: 'office-directory' },
  'manufacturing.hero.image': { pageKey: 'manufacturing', sectionKey: 'hero' },
  'manufacturing.hero.video': { pageKey: 'manufacturing', sectionKey: 'hero' },
  'manufacturing.process.image': { pageKey: 'manufacturing', sectionKey: 'process' },
  'manufacturing.process.video': { pageKey: 'manufacturing', sectionKey: 'process' },
  'manufacturing.layer.image': { pageKey: 'manufacturing' },
  'manufacturing.equipment.image': { pageKey: 'manufacturing', sectionKey: 'core-equipment' },
  'manufacturing.gallery.video': { pageKey: 'manufacturing', sectionKey: 'core-equipment' },
  'product.gallery.image': { pageKey: 'product' },
  'product.document': { pageKey: 'product' },
  'service.document': { pageKey: 'service' },
  'service.tutorial.poster': { pageKey: 'service', sectionKey: 'download' },
  'service.tutorial.video': { pageKey: 'service', sectionKey: 'download' },
  'qualification.image': { pageKey: 'about' }
});

function applyMediaPlacementContext(placementKey, force = false) {
  const context = mediaPlacementContexts[String(placementKey || '').trim()];
  if (!context) return;
  if (force || !mediaDraft.value.page_key) mediaDraft.value.page_key = context.pageKey || '';
  if (force || !mediaDraft.value.section_key) mediaDraft.value.section_key = context.sectionKey || '';
}

const mediaScopePageKeys = Object.freeze({ homepage: 'home', product: 'product', manufacturing: 'manufacturing', news: 'news', about: 'about', service: 'service' });
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
  if (spec.minWidth && spec.minHeight) requirements.push(`至少 ${spec.minWidth} x ${spec.minHeight} px`);
  if (spec.aspectRatio) requirements.push(`建议比例 ${spec.aspectRatio}`);
  requirements.push(`最大 ${readableFileSize(spec.maxBytes)}`);
  if (spec.maxDurationSeconds) requirements.push(`时长不超过 ${spec.maxDurationSeconds} 秒`);
  if (spec.posterRequired) requirements.push('必须选择海报图片');
  if (spec.transcriptRequired) requirements.push('必须填写字幕或文字稿');
  return `${spec.label}：${requirements.join('；')}。`;
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
  publishedAssets: publishedImageAssets.value,
  candidates: mediaCandidates.value
}));
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
  return { homepage: '网站主页', product: '产品展示', manufacturing: '先进制造', news: '视频新闻', about: '关于瑞钧', service: '服务支持' }[scope] || scope || '未分类';
}

function videoPosterAssetLabel(asset) {
  const internalDraft = asset?.status !== 'published' || asset?.publication_state !== 'published';
  return `${mediaAssetLabel(asset)}${internalDraft ? '（仅内部预览草稿）' : ''}`;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Math.round(left)); let b = Math.abs(Math.round(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function mediaTypeForFile(file) {
  if (String(file?.type || '').startsWith('image/')) return 'image';
  if (String(file?.type || '').startsWith('video/')) return 'video';
  if (file?.type === 'application/pdf') return 'document';
  return '';
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
    const metadata = await new Promise((resolve, reject) => { video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration_seconds: Math.ceil(video.duration) }); video.onerror = () => reject(new Error('无法读取视频尺寸或时长')); video.src = url; });
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
    error.value = reason instanceof Error ? reason.message : '无法读取媒体文件元数据。';
  }
}

function validateMediaFile(file) {
  if (!file) return '请选择要登记的媒体文件。';
  const limit = mediaUploadRules[file.type];
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
  if (spec.minWidth && (mediaDraft.value.width < spec.minWidth || mediaDraft.value.height < spec.minHeight)) return `${spec.label}要求至少 ${spec.minWidth} x ${spec.minHeight} px。`;
  if (mediaDraft.value.file.size > spec.maxBytes) return `${spec.label}文件超过 ${readableFileSize(spec.maxBytes)}。`;
  if (spec.maxDurationSeconds && mediaDraft.value.duration_seconds > spec.maxDurationSeconds) return `${spec.label}时长不能超过 ${spec.maxDurationSeconds} 秒。`;
  if (spec.posterRequired && !mediaDraft.value.poster_asset_id) return `${spec.label}必须选择一张已发布图片作为海报。`;
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

function normalizeLink(value) {
  const link = parseObject(value);
  return { ...link, label: String(link.label || ''), href: String(link.href || '') };
}

function boundedFooterStyleNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, minimum), maximum) : fallback;
}

function normalizeFooterTextStyles(value) {
  const source = parseObject(value);
  return Object.fromEntries(footerTextStyleDefinitions.map(({ id }) => {
    const style = parseObject(source[id]);
    const color = /^#[0-9a-f]{6}$/i.test(String(style.color || '').trim()) ? String(style.color).trim().toUpperCase() : '';
    return [id, {
      enabled: style.enabled === true,
      weight: [300, 400, 500, 700, 800].includes(Number(style.weight)) ? Number(style.weight) : 400,
      size_desktop: boundedFooterStyleNumber(style.size_desktop, 12, 72, 16),
      size_mobile: boundedFooterStyleNumber(style.size_mobile, 12, 40, 14),
      line_height: boundedFooterStyleNumber(style.line_height, 1, 2.2, 1.35),
      color
    }];
  }));
}

function normalizeSettings(record) {
  const visualDefaults = mergeVisualSiteSettingsDefaults(record);
  const footer = parseObject(visualDefaults.footer);
  const brand = parseObject(record.brand);
  const contacts = parseObject(visualDefaults.contacts);
  const headerCta = parseObject(contacts.header_cta);
  const columns = parseArray(footer.columns).map((column, index) => ({
    title: String(column?.title || ''),
    sort_order: Number.isFinite(Number(column?.sort_order)) ? Number(column.sort_order) : index,
    links: parseArray(column?.links).map(normalizeLink)
  }));
  return {
    ...clone(record),
    navigation: parseArray(record.navigation).map(normalizeLink),
    footer: { ...footer, primary_links: parseArray(footer.primary_links).map(normalizeLink), columns, text_styles: normalizeFooterTextStyles(footer.text_styles), purchase_label: String(footer.purchase_label || ''), purchase_title: String(footer.purchase_title || ''), purchase_subtitle: String(footer.purchase_subtitle || ''), purchase_phone: String(footer.purchase_phone || ''), copyright: String(footer.copyright || ''), address_icon_asset: String(footer.address_icon_asset || ''), phone_icon_asset: String(footer.phone_icon_asset || ''), email_icon_asset: String(footer.email_icon_asset || ''), requires_business_review: footer.requires_business_review === true },
    brand: { ...brand, display_name: String(brand.display_name || ''), logo_asset: String(brand.logo_asset || ''), footer_logo_asset: String(brand.footer_logo_asset || '') },
    contacts: { ...contacts, service_phone: String(contacts.service_phone || ''), domestic_phone: String(contacts.domestic_phone || ''), export_phone: String(contacts.export_phone || ''), domestic_email: String(contacts.domestic_email || ''), export_email: String(contacts.export_email || ''), language_label: String(contacts.language_label || ''), addressesText: textList(contacts.addresses), header_cta: { ...headerCta, label: String(headerCta.label || ''), href: String(headerCta.href || '') } },
    languagesText: textList(record.languages)
  };
}

function normalizeOptionalSortOrder(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

function normalizeArticle(record) {
  const seo = parseObject(record.seo);
  const publishedAt = String(record.published_at || '').slice(0, 10);
  const displayDate = String(record.display_date || publishedAt).slice(0, 10);
  return { ...clone(record), category: record.category === 'video' ? 'video' : 'news', display_date: displayDate, sort_order: normalizeOptionalSortOrder(record.sort_order), published_at: publishedAt, transcript: String(record.transcript || ''), body_media_text: JSON.stringify(Array.isArray(record.body_media) ? record.body_media : [], null, 2), mediaReferences: normalizeMediaReferences(record.media), seo: { ...seo, title: typeof seo.title === 'string' ? seo.title : '', description: typeof seo.description === 'string' ? seo.description : '', keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : String(seo.keywords || '') } };
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

function isPageMediaOption(assetId, scope) {
  return pageMediaOptions(scope).some((asset) => String(asset.id) === String(assetId));
}

function isPageMediaOptionForSection(assetId, scope, section) {
  return isPageMediaOption(assetId, scope)
    && pageMediaOptionsForSection(scope, section).some((asset) => String(asset.id) === String(assetId));
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

function reviewedMediaAssetsForPlacement(scope, placementKey) {
  return reviewedMediaAssets(scope).filter((asset) => asset.placement_key === placementKey);
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
  return Boolean(record?.id) && editableStatuses.has(record.status) && record.publication_state !== 'published';
}

function canDeleteEditorialDraft(record) {
  return Boolean(record?.id) && record.status === 'draft' && record.publication_state === 'unpublished';
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
  const record = models.value.find((item) => String(item.id) === String(id));
  selectedModelId.value = record?.id ?? id;
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

function sectionBodyIsRendered(section) {
  return !(pageDraft.value?.slug === 'home' && String(section?.id || '') === 'why-ruijun');
}

function sectionTitleIsRendered(section) {
  return !(pageDraft.value?.slug === 'product' && String(section?.id || '') === 'model-list');
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

function addPageMedia(section) {
  const assetId = String(pageMediaSelection.value || '').trim();
  if (!section || !assetId || !isPageMediaOptionForSection(assetId, pageMediaScope(), section)) return;
  section.media ||= [];
  if (!section.media.some((entry) => String(entry.media_asset_id) === assetId)) section.media.push({ media_asset_id: assetId, role: '' });
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

function addPageSection() {
  pageDraft.value?.sections.push({ id: '', kicker: '', title: '', body: '', description: '', media: [], ...defaultSectionPresentation() });
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

function validateSections(sections) {
  if (!sections.length) return '至少保留一个页面段落。';
  const ids = new Set();
  for (const section of sections) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(section.id)) return '段落标识只能使用小写字母、数字和短横线。';
    if (ids.has(section.id)) return `段落标识“${section.id}”重复。`;
    ids.add(section.id);
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

async function loadSeries() {
  const response = await api.get('/items/product_series?fields=id,series_code,slug,name,positioning,presentation,scenarios,capabilities,cover_asset,sort_order,status,publication_state,source_document,source_url,review_note&sort=sort_order,name&limit=-1');
  series.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = series.value.some((item) => item.id === selectedSeriesId.value) ? selectedSeriesId.value : series.value[0]?.id;
  if (nextId) selectSeries(nextId, true); else { selectedSeriesId.value = ''; seriesDraft.value = null; }
}

async function loadModels() {
  const response = await api.get('/items/product_models?fields=id,series_code,model_code,slug,name,configuration,media,resources,status,publication_state,source_document,source_url,review_note&sort=series_code,model_code&limit=-1');
  models.value = Array.isArray(response.data?.data) ? response.data.data : [];
  const nextId = models.value.some((item) => item.id === selectedModelId.value) ? selectedModelId.value : models.value[0]?.id;
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
    api.get('/items/articles?fields=id,slug,category,title,display_date,sort_order,summary,body,body_media,transcript,field_presentation,media,cover_asset,seo,status,publication_state,published_at,source_document,source_url,review_note&sort=-display_date,sort_order,-id&limit=-1'),
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
  const query = new URLSearchParams({ fields: 'id,file_id,original_file_name,mime_type,usage_scope,media_type,poster_asset_id,transcript,placement_key,alt_text,status,publication_state,copyright_status', sort: 'original_file_name', limit: '-1' });
  query.set('filter[status][_eq]', 'published');
  query.set('filter[publication_state][_eq]', 'published');
  const response = await api.get(`/items/media_assets?${query.toString()}`);
  mediaAssets.value = Array.isArray(response.data?.data) ? response.data.data : [];
}

async function loadMediaCandidates() {
  const response = await api.get('/items/media_assets?fields=id,file_id,original_file_name,mime_type,byte_size,usage_scope,media_type,width,height,duration_seconds,aspect_ratio,poster_asset_id,placement_key,page_key,section_key,sort_order,enabled,autoplay,muted,loop,title,description,transcript,alt_text,copyright_status,authorization_note,status,publication_state,review_note&sort=original_file_name&limit=-1');
  clearMediaPreviews();
  mediaCandidates.value = Array.isArray(response.data?.data) ? response.data.data : [];
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
    const query = new URLSearchParams({ fields: 'id,model_code,group_name,field_name,value,unit,presentation,sort_order,test_conditions,status,publication_state', sort: 'sort_order,field_name', limit: '-1' });
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
    // The visual canvas needs private draft assets for authenticated preview,
    // even when the current editor cannot access the advanced media manager.
    const everyday = [loadPages(), loadSeries(), loadCompany(), loadEditorial(), loadMediaAssets(), loadMediaCandidates()];
    const technical = technicalAccess.value
      ? [loadModels(), loadService(), loadRepairPages(), loadKnowledge(), loadSettings()]
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
    // Canvas-only empty media slots make every editable location selectable,
    // but must not become persistent CMS references until a real asset is set.
    const persistedSections = normalizeSections(pageDraft.value.sections);
    if (seo.keywords) seo.keywords = String(seo.keywords).split(',').map((item) => item.trim()).filter(Boolean);
    else delete seo.keywords;
    if (!seo.title) delete seo.title;
    if (!seo.description) delete seo.description;
    await api.patch(`/items/pages/${encodeURIComponent(pageDraft.value.id)}`, { title: pageDraft.value.title, slug: pageDraft.value.slug, language: pageDraft.value.language, sections: persistedSections, seo });
    message.value = '页面草稿已保存，并已进入内容版本审计。';
    await loadPages();
    // A newly attached draft asset is not part of the previous one-time
    // preview session's allow-list. Renew it after a successful page save so
    // the canvas keeps working without requiring a manual reconnect.
    await renewLivePreviewAfterSuccessfulSave();
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
    await renewLivePreviewAfterSuccessfulSave();
  } catch (reason) { error.value = apiError(reason, '保存售后页面草稿失败。'); }
  finally { saving.value = false; }
}

async function saveSeries() {
  if (!seriesDraft.value || !canEdit(seriesDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/product_series/${encodeURIComponent(seriesDraft.value.id)}`, { series_code: seriesDraft.value.series_code, slug: seriesDraft.value.slug, name: seriesDraft.value.name, positioning: seriesDraft.value.positioning || null, presentation: seriesDraft.value.presentation, scenarios: fromTextList(seriesDraft.value.scenariosText), capabilities: fromTextList(seriesDraft.value.capabilitiesText), cover_asset: seriesDraft.value.cover_asset || null, sort_order: Number(seriesDraft.value.sort_order) || 0 });
    message.value = '产品系列草稿已保存，并已进入内容版本审计。';
    await loadSeries();
    await renewLivePreviewAfterSuccessfulSave();
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
    await loadCompany();
    await renewLivePreviewAfterSuccessfulSave();
  } catch (reason) {
    error.value = apiError(reason, '保存企业资料失败，内容没有更新。');
  } finally { saving.value = false; }
}

function nextServiceKey(prefix) {
  return `${prefix}-${Date.now()}`;
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
    await loadService();
    await renewLivePreviewAfterSuccessfulSave();
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
    await loadKnowledge();
    await renewLivePreviewAfterSuccessfulSave();
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
    await api.post('/items/media_assets', {
      file_id: uploadedFileId,
      original_file_name: uploaded.filename_download,
      mime_type: uploaded.type,
      byte_size: Number(uploaded.filesize),
      usage_scope: mediaDraft.value.usage_scope,
      media_type: mediaDraft.value.media_type,
      width: mediaDraft.value.width || null,
      height: mediaDraft.value.height || null,
      duration_seconds: mediaDraft.value.duration_seconds || null,
      aspect_ratio: mediaDraft.value.aspect_ratio || null,
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
      status: 'draft',
      publication_state: 'unpublished',
    });
    mediaRegistered = true;
    mediaDraft.value = emptyMediaDraft();
    if (mediaFileInput.value) mediaFileInput.value.value = '';
    message.value = '媒体候选素材已登记为草稿，尚未发布到官网。';
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

function nextDraftSlug(prefix) {
  return `cms-editor-${prefix}-${Date.now()}`;
}

async function createEditorialRecord() {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const payload = editorialMode.value === 'articles'
      ? { slug: nextDraftSlug('article'), category: editorialCategory.value || 'news', title: '未命名文章', display_date: new Date().toISOString().slice(0, 10), sort_order: 0, summary: '', body: '', transcript: '', media: [], seo: {}, published_at: new Date().toISOString().slice(0, 10), status: 'draft', publication_state: 'unpublished' }
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
      payload = { slug: editorialDraft.value.slug, category, title: editorialDraft.value.title, display_date: editorialDraft.value.display_date, sort_order: sortOrder, summary: editorialDraft.value.summary || null, body: editorialDraft.value.body || null, body_media: bodyMedia, transcript: editorialDraft.value.transcript || null, field_presentation: normalizeFieldPresentations(editorialDraft.value.field_presentation, ['category', 'title', 'display_date', 'summary', 'body', 'transcript']), media, cover_asset: editorialDraft.value.cover_asset || null, seo, published_at: editorialDraft.value.published_at || null, source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null };
    } else {
      payload = { slug: editorialDraft.value.slug, industry: editorialDraft.value.industry || null, material: editorialDraft.value.material || null, thickness: editorialDraft.value.thickness || null, model_code: editorialDraft.value.model_code || null, process: editorialDraft.value.process || null, result: editorialDraft.value.result || null, authorization_status: editorialDraft.value.authorization_status || 'review_required', source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null };
    }
    await api.patch(`/items/${encodeURIComponent(editorialMode.value)}/${encodeURIComponent(editorialDraft.value.id)}`, payload);
    message.value = '内容草稿已保存，并已进入内容版本审计。';
    await loadEditorial();
    await renewLivePreviewAfterSuccessfulSave();
  } catch (reason) {
    error.value = apiError(reason, '保存内容草稿失败，内容没有更新。');
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
    await loadSettings();
    markDraftSaved();
    await renewLivePreviewAfterSuccessfulSave();
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
    await loadSettings();
    markDraftSaved();
    await renewLivePreviewAfterSuccessfulSave();
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
    await api.patch(`/items/product_models/${encodeURIComponent(modelDraft.value.id)}`, { series_code: modelDraft.value.series_code, model_code: modelDraft.value.model_code, slug: modelDraft.value.slug || null, name: modelDraft.value.name, configuration, media: modelDraft.value.mediaReferences, resources });
    message.value = '型号草稿已保存，并已进入内容版本审计。';
    await loadModels();
    await renewLivePreviewAfterSuccessfulSave();
  } catch (reason) {
    error.value = apiError(reason, '保存型号失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveParameter(parameter) {
  if (!canEdit(parameter)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/product_parameters/${encodeURIComponent(parameter.id)}`, { group_name: parameter.group_name || null, field_name: parameter.field_name, value: parameter.value, unit: parameter.unit || null, presentation: parameter.presentation || null, test_conditions: parameter.test_conditions || null, sort_order: Number(parameter.sort_order) || 0 });
    message.value = '技术参数已保存，并已进入内容版本审计。';
    await loadParameters(modelDraft.value.model_code);
    markDraftSaved();
    await renewLivePreviewAfterSuccessfulSave();
  } catch (reason) {
    error.value = apiError(reason, '保存技术参数失败，内容没有更新。');
  } finally { saving.value = false; }
}

async function saveVisualParameterGroup(groupRecords) {
  const records = Array.isArray(groupRecords) ? groupRecords : [];
  const groupName = String(records[0]?.group_name || '').trim();
  const ids = records.map((record) => String(record?.id || '')).filter((id) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id));
  if (!modelDraft.value || !groupName || ids.length !== records.length || !records.every((record) => canEdit(record) && String(record?.model_code || '') === String(modelDraft.value.model_code || ''))) {
    error.value = '参数分组已发生变化，请重新选择分组标题后再保存。';
    return;
  }
  saving.value = true; error.value = ''; message.value = '';
  try {
    // Directus records one content-version audit entry per parameter. Keep this
    // as one visual action while issuing individual governed updates.
    await Promise.all(records.map((record) => api.patch(`/items/product_parameters/${encodeURIComponent(record.id)}`, { group_name: groupName })));
    message.value = `技术参数分组已同步保存（${ids.length} 项）。`;
    await loadParameters(modelDraft.value.model_code);
    markDraftSaved();
    await renewLivePreviewAfterSuccessfulSave();
  } catch (reason) {
    error.value = apiError(reason, '保存技术参数分组失败，内容没有更新。');
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
onMounted(() => {
  document.documentElement.classList.add('ruijun-workbench-active');
  window.addEventListener('keydown', handlePreviewKeydown);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('message', handleLivePreviewMessage);
  window.addEventListener('resize', handleVisualViewportResize);
  api.get('/users/me?fields=id,role.name').then((response) => {
    const user = response.data?.data || {};
    technicalAccess.value = ['Administrator', '系统管理员'].includes(String(user.role?.name || ''));
  }).catch(() => {
    technicalAccess.value = false;
  }).finally(load);
});
onBeforeUnmount(() => {
  document.documentElement.classList.remove('ruijun-workbench-active');
  window.removeEventListener('keydown', handlePreviewKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('message', handleLivePreviewMessage);
  window.removeEventListener('resize', handleVisualViewportResize);
  window.clearTimeout(livePreviewDebounceTimer);
  clearMediaPreviews();
});
</script>

<style scoped>
.editor-page{grid-template-columns:220px minmax(0,1fr);align-items:start;max-width:1440px;gap:20px}
.editor-page>.toolbar,.editor-page>.editor-guide,.editor-page>.message{grid-column:1/-1}
.editor-page>.toolbar{grid-row:1}
.editor-page>.editor-guide{grid-row:2}
.editor-page>.message{grid-row:3}
.editor-page>.wp-admin-menu,.editor-page>section:not(.editor-guide),.editor-page>.empty{grid-column:2;grid-row:4}
.editor-page>.wp-admin-menu{grid-column:1!important;grid-row:4;position:sticky;top:14px;z-index:4;display:grid;align-self:start;align-content:start;grid-auto-rows:max-content;justify-content:start;gap:12px;min-height:calc(100vh - 112px);box-sizing:border-box;border:0;border-radius:0;background:#1d2327;padding:14px 10px;box-shadow:4px 0 16px rgb(0 0 0/8%)}
.wp-admin-menu .tab-group{display:grid;align-content:start;gap:3px;min-height:0}
.wp-admin-menu .tab-group-label{padding:4px 10px 8px;color:#9ea7ad;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.wp-admin-menu .workspace-tabs button,.wp-admin-menu .tab-group button{display:flex;align-items:center;width:100%;box-sizing:border-box;border:0;border-left:3px solid transparent;border-radius:2px;padding:10px 11px;text-align:left;color:#c3cbd0;font-size:13px}
.wp-admin-menu .workspace-tabs button:hover,.wp-admin-menu .tab-group button:hover{background:#2c3338;color:#fff}
.wp-admin-menu .workspace-tabs button.active,.wp-admin-menu .tab-group button.active{border-left-color:#f08016;background:#2c3338;color:#fff;font-weight:600}
.wp-admin-menu .advanced-tabs{display:grid;align-content:start;justify-items:stretch;gap:5px;border-top:1px solid #3b4348;padding-top:12px}
.wp-admin-menu .advanced-toggle{justify-content:space-between;color:#f0a35a!important}
.wp-admin-menu .advanced-tab-list{display:grid;gap:3px;justify-content:stretch}
.wp-admin-menu .advanced-tab-list button{font-size:12px}
.editor-page>.toolbar{padding-bottom:2px}
@media(max-width:900px){.editor-page{grid-template-columns:1fr}.editor-page>.wp-admin-menu,.editor-page>section,.editor-page>.empty{grid-column:1}.editor-page>.wp-admin-menu{position:static;min-height:0;display:block;overflow:auto;padding:8px}.wp-admin-menu .tab-group{display:flex;align-items:center;overflow:auto}.wp-admin-menu .tab-group-label{display:none}.wp-admin-menu .workspace-tabs button,.wp-admin-menu .tab-group button{width:auto;white-space:nowrap;border-left:0;border-bottom:2px solid transparent}.wp-admin-menu .workspace-tabs button.active,.wp-admin-menu .tab-group button.active{border-left:0;border-bottom-color:var(--theme--primary)}.wp-admin-menu .advanced-tabs{display:flex;border-top:0;border-left:1px solid var(--theme--border-color);padding:0 0 0 8px}.wp-admin-menu .advanced-tab-list{display:flex}.wp-admin-menu .advanced-tab-list button{display:none}.wp-admin-menu .advanced-tabs.expanded .advanced-tab-list button{display:flex}}
.editor-page{display:grid;gap:18px;max-width:1320px;padding:4px 0 32px}.section-heading-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.media-reference-row label{display:flex;align-items:center;gap:7px;color:var(--theme--foreground-subdued);font-size:12px}.media-reference-row select{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:6px;font:inherit}.toolbar,.toolbar-actions,.form-actions,.section-heading,.form-heading,.panel-heading,.section-card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.toolbar{align-items:end;flex-wrap:wrap}.toolbar h2,.toolbar p,.form-heading h3,.panel-heading h3,.section-heading h3,.section-heading h4,.seo-editor h4{margin:0}.toolbar h2{margin-top:6px;font-size:25px}.toolbar>div>p:last-child{max-width:760px;margin-top:8px;color:var(--theme--foreground-subdued)}.toolbar-actions{flex-wrap:wrap}.toolbar button,.native-link,.primary-action,.section-heading button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 13px;font:inherit;text-decoration:none;cursor:pointer}.toolbar button:disabled,.primary-action:disabled,.section-heading button:disabled,.text-action:disabled{cursor:not-allowed;opacity:.5}.native-link{color:var(--theme--primary)}.unsaved-indicator{border:1px solid var(--theme--warning);border-radius:999px;background:var(--theme--background-accent);color:var(--theme--warning);padding:6px 9px;font-size:12px;white-space:nowrap}.eyebrow{margin:0;color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.message,.empty,.record-list-panel,.editor-form,.parameters-panel{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.message,.empty{margin:0}.error{border-color:var(--theme--danger);color:var(--theme--danger)}.workspace-tabs{display:flex;gap:6px;border-bottom:1px solid var(--theme--border-color)}.workspace-tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--theme--foreground-subdued);padding:10px 13px;font:inherit;cursor:pointer}.workspace-tabs button.active{border-bottom-color:var(--theme--primary);color:var(--theme--foreground)}.workspace-grid,.model-layout{display:grid;grid-template-columns:minmax(220px,290px) minmax(0,1fr);gap:16px}.record-list-panel{align-self:start;display:grid;gap:6px;max-height:760px;overflow:auto}.panel-heading{padding-bottom:10px;border-bottom:1px solid var(--theme--border-color)}.panel-heading h3{margin-top:5px;font-size:18px}.panel-heading strong,.parameters-panel>.section-heading>strong{font-size:26px}.record-choice{position:relative;display:grid;gap:3px;width:100%;border:1px solid transparent;border-radius:4px;background:transparent;padding:10px;text-align:left;color:var(--theme--foreground);cursor:pointer}.record-choice:hover,.record-choice.active{border-color:var(--theme--border-color);background:var(--theme--background-accent)}.record-choice span,.record-choice small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-choice small{color:var(--theme--foreground-subdued)}.record-choice i{position:absolute;right:8px;top:9px;font-style:normal;font-size:11px;color:var(--theme--foreground-subdued)}.record-choice i[data-status="rejected"]{color:var(--theme--danger)}.record-choice i[data-status="draft"]{color:var(--theme--warning)}.editor-form,.parameters-panel{display:grid;gap:18px}.form-heading{align-items:start}.form-heading h3{margin-top:5px;font-size:21px}.status,.review-badge{border-radius:999px;background:var(--theme--background-accent);padding:4px 8px;color:var(--theme--foreground-subdued);font-size:12px;white-space:nowrap}.status[data-status="rejected"]{color:var(--theme--danger)}.status[data-status="draft"]{color:var(--theme--warning)}.read-only-note{margin:0;border-left:3px solid var(--theme--warning);background:var(--theme--background-accent);padding:10px 12px;color:var(--theme--foreground-subdued);font-size:13px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field-grid label{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.field-grid label.full{grid-column:1/-1}.field-grid input,.field-grid select,.field-grid textarea,.table-wrap input{box-sizing:border-box;width:100%;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:9px 10px;font:inherit}.field-grid textarea{resize:vertical;line-height:1.5}.field-grid input:disabled,.field-grid select:disabled,.field-grid textarea:disabled,.table-wrap input:disabled{cursor:not-allowed;opacity:.66}.section-editor,.seo-editor,.new-parameter{display:grid;gap:12px;border-top:1px solid var(--theme--border-color);padding-top:18px}.section-heading{align-items:start}.section-heading h4,.seo-editor h4{margin-top:5px;font-size:17px}.section-heading>div>p:last-child{margin:6px 0 0;color:var(--theme--foreground-subdued);font-size:13px}.section-heading button{color:var(--theme--primary)}.section-card{display:grid;gap:13px;border:1px solid var(--theme--border-color);border-radius:5px;padding:14px}.section-card-heading{align-items:start}.section-card-heading>div{display:flex;align-items:center;gap:9px}.review-badge{color:var(--theme--warning)}.text-action{border:0;background:transparent;padding:4px;color:var(--theme--primary);font:inherit;cursor:pointer}.text-action.danger{color:var(--theme--danger)}.form-actions{padding-top:2px}.form-actions a{color:var(--theme--primary);font-size:13px;text-decoration:none}.primary-action{border-color:var(--theme--primary);background:var(--theme--primary);color:var(--theme--primary-foreground)}.model-workspace{display:grid;gap:16px}.parameters-panel>.section-heading{align-items:start}.parameters-panel>.section-heading h3{margin-top:5px;font-size:19px}.table-wrap{overflow:auto;border:1px solid var(--theme--border-color);border-radius:5px}.table-wrap table{width:100%;min-width:920px;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{border-bottom:1px solid var(--theme--border-color);padding:9px;vertical-align:middle}.table-wrap th{color:var(--theme--foreground-subdued);font-size:12px;font-weight:600}.table-wrap tr:last-child td{border-bottom:0}.table-wrap input{min-width:100px;padding:7px 8px}.table-empty{text-align:center;color:var(--theme--foreground-subdued)}.new-parameter h4{margin:0;font-size:16px}.parameter-fields{grid-template-columns:repeat(4,minmax(0,1fr))}.compact{font-size:13px;color:var(--theme--foreground-subdued)}.subtabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding-bottom:8px}.subtabs button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground-subdued);padding:7px 8px;font:inherit;font-size:12px;cursor:pointer}.subtabs button:last-child{grid-column:1/-1}.subtabs button.active{border-color:var(--theme--primary);color:var(--theme--primary)}.form-help{margin:0;color:var(--theme--foreground-subdued);font-size:13px;line-height:1.55}.media-workspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px}.media-form-fields{display:grid;gap:18px}.media-candidate-list{align-self:start;max-height:690px;overflow:auto}.media-candidate-row{display:flex;align-items:start;justify-content:space-between;gap:12px;border-top:1px solid var(--theme--border-color);padding:13px 0}.media-candidate-row>div{min-width:0}.media-candidate-row strong,.media-candidate-row p,.media-candidate-row small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.media-candidate-row p{margin:5px 0;color:var(--theme--foreground-subdued);font-size:13px}.media-candidate-row small{color:var(--theme--foreground-subdued);font-size:12px}@media(max-width:900px){.workspace-grid,.model-layout,.media-workspace{grid-template-columns:1fr}.record-list-panel{max-height:270px}.record-choice{grid-template-columns:1fr auto}.record-choice i{position:static;grid-column:2;grid-row:1/3;align-self:center}.parameter-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.toolbar,.toolbar-actions,.form-actions{align-items:stretch}.toolbar-actions,.toolbar-actions>*{width:100%;box-sizing:border-box;text-align:center}.workspace-tabs{overflow:auto}.workspace-tabs button{white-space:nowrap}.field-grid,.parameter-fields{grid-template-columns:1fr}.field-grid label.full{grid-column:auto}.section-card-heading{display:grid}.section-card-heading>div{justify-content:space-between}.form-actions{display:grid}.primary-action{width:100%}}
.toggle-field{display:flex!important;grid-template-columns:auto 1fr;align-items:center;gap:9px}.toggle-field input{width:auto}.toggle-field span{color:var(--theme--foreground)}
.presentation-enable-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0;padding:10px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background-accent)}
@media(max-width:900px){.presentation-enable-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.presentation-enable-grid{grid-template-columns:1fr}}
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
.page-editing-layout{grid-template-columns:minmax(200px,250px) minmax(380px,1fr);align-items:start}.live-preview-panel{position:sticky;top:14px;display:grid;gap:12px;border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:15px}.live-preview-heading{display:flex;align-items:start;justify-content:space-between;gap:10px}.live-preview-heading h3{margin:5px 0 0;font-size:17px}.live-dot{display:flex;align-items:center;gap:6px;color:var(--theme--success);font-size:11px;white-space:nowrap}.live-dot::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--theme--success)}.live-preview-canvas{max-height:600px;overflow:auto;border:1px solid var(--theme--border-color);border-radius:5px;background:#f6f5f0;color:#212428}.live-preview-nav{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid #dadbd7;background:#fff;font-size:12px}.live-preview-nav small{color:#697077}.live-preview-hero{display:grid;gap:9px;padding:28px 20px;background:#1c2328;color:#fff}.live-preview-hero span,.live-preview-section small{color:#dc7b20;font-size:10px;font-weight:700;letter-spacing:0}.live-preview-hero h4{margin:0;font-size:28px;line-height:1.15}.live-preview-hero p,.live-preview-section p{margin:0;color:#cbd0d2;font-size:13px;line-height:1.65;white-space:pre-wrap}.live-preview-section{display:grid;gap:7px;padding:18px 20px;border-top:1px solid #dedfdc}.live-preview-section h5{margin:0;font-size:18px;line-height:1.3}.live-preview-section p{color:#4c5358}.live-preview-more{margin:0;padding:13px 20px;color:#687077;font-size:12px}.live-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.live-preview-actions button{padding:9px 8px;border-radius:4px;font:inherit;font-size:12px;cursor:pointer}.live-preview-actions button:disabled{cursor:not-allowed;opacity:.55}
@media(max-width:620px){.workspace-tabs{display:grid;gap:0}.tab-group{overflow-x:auto}.advanced-tabs{justify-items:stretch}.advanced-tab-list{justify-content:flex-start}.workflow-steps{grid-template-columns:1fr}.workflow-steps li{align-items:flex-start}}
@media(max-width:1180px){.page-editing-layout{grid-template-columns:minmax(210px,270px) minmax(0,1fr)}.live-preview-panel{position:static;grid-column:2}}@media(max-width:1080px){.start-task-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.page-editing-layout{grid-template-columns:1fr}.live-preview-panel{grid-column:auto}.live-preview-canvas{max-height:440px}}@media(max-width:680px){.start-task-grid{grid-template-columns:1fr}.start-task{min-height:0}.editor-start{padding:20px}}
.live-preview-toggle{border-color:var(--theme--success)!important;color:var(--theme--success)!important}
/* PowerPoint-like visual editing surface. The iframe remains the original Nuxt page; only its viewport and editor chrome change. */
.visual-editor-toolbar{position:absolute;z-index:4;top:0;right:0;left:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;min-height:72px;box-sizing:border-box;border-bottom:1px solid var(--theme--border-color);background:var(--theme--background);padding:8px 10px}.visual-editor-brand,.visual-editor-tools,.visual-editor-actions{display:flex;align-items:center;gap:6px;min-width:0}.visual-editor-brand{gap:8px}.visual-editor-brand strong{display:block;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.visual-editor-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:4px;background:var(--theme--primary);color:var(--theme--primary-foreground);font-weight:800}.visual-editor-tools{justify-content:center}.visual-editor-tools button,.visual-editor-actions button{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:32px;height:32px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:0 7px;font:inherit;font-size:13px;cursor:pointer}.visual-editor-tools button span{font-size:10px;color:var(--theme--foreground-subdued)}.visual-editor-tools button.active,.visual-editor-actions .visual-edit-active{border-color:var(--theme--primary);background:var(--theme--primary);color:var(--theme--primary-foreground)}.visual-editor-tools button:disabled,.visual-editor-actions button:disabled{cursor:not-allowed;opacity:.45}.toolbar-divider{width:1px;height:24px;background:var(--theme--border-color);margin:0 3px}.zoom-control{display:flex;align-items:center;gap:5px;color:var(--theme--foreground-subdued);font-size:11px;white-space:nowrap}.zoom-control input{width:72px;accent-color:var(--theme--primary)}.zoom-control output{width:34px;text-align:right;color:var(--theme--foreground)}.visual-editor-actions{justify-content:flex-end}.visual-editor-actions>span{font-size:11px;white-space:nowrap}.visual-selected-label{max-width:105px;overflow:hidden;text-overflow:ellipsis;color:var(--theme--foreground-subdued)}.visual-save-button{border-color:var(--theme--primary)!important;background:var(--theme--primary)!important;color:var(--theme--primary-foreground)!important}.visual-canvas-viewport{position:absolute;inset:72px 0 0;overflow:auto;background:#e9ecef;padding:20px}.visual-canvas-viewport iframe{position:relative!important;top:auto!important;left:auto!important;display:block;width:calc(100% / var(--visual-zoom))!important;height:calc(100% / var(--visual-zoom))!important;min-height:900px;border:0;background:#fff;transform:scale(var(--visual-zoom))!important;transform-origin:top left!important}.live-website-preview{display:block!important}.live-website-preview>header{height:72px!important}.live-preview-error{top:72px!important}.visual-canvas-viewport iframe{pointer-events:auto}
.visual-record-switcher{display:flex;align-items:center;gap:5px;max-width:215px;color:var(--theme--foreground-subdued);font-size:11px;white-space:nowrap}.visual-record-switcher select{min-width:0;max-width:170px;height:32px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:0 24px 0 8px;font:inherit;font-size:12px;overflow:hidden;text-overflow:ellipsis}
@media(max-width:1100px){.visual-editor-toolbar{grid-template-columns:auto 1fr;align-items:start}.visual-editor-actions{grid-column:1/-1;justify-content:flex-start}.visual-editor-tools{justify-content:flex-start}.visual-canvas-viewport{inset:108px 0 0}}
@media(max-width:720px){.visual-editor-toolbar{position:absolute;grid-template-columns:1fr;gap:6px}.visual-editor-tools,.visual-editor-actions{flex-wrap:wrap;justify-content:flex-start}.visual-canvas-viewport{inset:126px 0 0;padding:8px}}
/* Reserve the fixed preview's width in the workbench itself. The side menu is
   part of this grid, so viewport-only widths let the form run underneath the
   preview on the right. */
.editor-page.live-website-preview-active{
  box-sizing:border-box;
  width:auto;
  max-width:none;
  min-width:0;
  margin-right:calc(46vw + 20px);
}
.editor-page.live-website-preview-active .workspace-grid,
.editor-page.live-website-preview-active .model-layout,
.editor-page.live-website-preview-active .media-workspace,
.editor-page.live-website-preview-active .editor-form,
.editor-page.live-website-preview-active .record-list-panel,
.editor-page.live-website-preview-active .parameters-panel{
  min-width:0;
}
.editor-page.live-website-preview-active .editor-form .field-grid{grid-template-columns:1fr}
.editor-page.live-website-preview-active .workspace-grid{grid-template-columns:minmax(0,1fr)}
.editor-page.live-website-preview-active .workspace-grid>.record-list-panel{display:none}
.live-website-preview{position:fixed;z-index:80;top:64px;right:0;bottom:0;width:46vw;min-width:0;max-width:100%;overflow:hidden;border-left:1px solid var(--theme--border-color);background:#fff;box-shadow:-12px 0 32px rgb(0 0 0/12%)}.live-website-preview>header{position:absolute;z-index:2;top:0;right:0;left:0;display:flex;align-items:center;justify-content:space-between;gap:14px;height:58px;box-sizing:border-box;border-bottom:1px solid var(--theme--border-color);background:var(--theme--background);padding:8px 12px}.live-website-preview>header p{margin:0 0 3px}.live-website-preview>header strong{display:block;max-width:28vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.live-preview-controls{display:flex;align-items:center;gap:7px}.live-preview-controls span{color:var(--theme--foreground-subdued);font-size:11px;white-space:nowrap}.live-preview-controls span[data-state="connected"],.live-preview-controls span[data-state="syncing"]{color:var(--theme--success)}.live-preview-controls span[data-state="error"]{color:var(--theme--danger)}.live-preview-controls button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--theme--border-color);border-radius:3px;background:var(--theme--background);color:var(--theme--foreground);padding:0;font-size:19px;line-height:1;cursor:pointer}.live-preview-error{position:absolute;z-index:3;top:58px;right:0;left:0;margin:0;background:var(--theme--danger);color:#fff;padding:9px 12px;font-size:12px}.live-website-preview iframe{position:absolute;top:58px;left:0;width:161.3%;height:calc((100% - 58px) * 1.613);border:0;background:#fff;transform:scale(.62);transform-origin:top left}@media(max-width:1180px){.editor-page.live-website-preview-active{width:calc(100% - 50vw - 20px);margin-right:calc(50vw + 20px)}.live-website-preview{width:50vw}.live-website-preview iframe{width:181.82%;height:calc((100% - 58px) * 1.8182);transform:scale(.55)}}@media(max-width:820px){.editor-page.live-website-preview-active{width:100%;margin-right:0}.live-website-preview{top:56px;width:min(92vw,720px)}.live-website-preview iframe{width:100%;height:calc(100% - 58px);transform:none}}
/* The workbench is a block in Directus' content area. Keep its width automatic
   so the right margin is subtracted from the actual available area, including
   the shell's left navigation offset. */
@media(min-width:821px){
  .editor-page.live-website-preview-active{width:auto;margin-right:calc(46vw + 20px)}
}
@media(min-width:821px) and (max-width:1180px){
  .editor-page.live-website-preview-active{width:auto;margin-right:calc(50vw + 20px)}
}
@media(max-width:820px){
  .editor-page.live-website-preview-active{width:100%;margin-right:0}
}
/* Desktop live preview is a real third grid column. Keeping it in the
   workbench flow prevents a fixed panel from covering the form. */
@media(min-width:1280px){
  .editor-page.live-website-preview-active{
    grid-template-columns:220px minmax(0,1fr) clamp(460px,38vw,920px);
    width:auto;
    max-width:none;
    margin-right:0;
    overflow:visible;
  }
  .editor-page.live-website-preview-active>.toolbar,
  .editor-page.live-website-preview-active>.editor-guide,
  .editor-page.live-website-preview-active>.message{
    grid-column:1/-1;
  }
  .editor-page.live-website-preview-active>.wp-admin-menu,
  .editor-page.live-website-preview-active>section:not(.editor-guide),
  .editor-page.live-website-preview-active>.empty{
    grid-row:4;
    min-width:0;
  }
  .editor-page.live-website-preview-active>.wp-admin-menu{
    grid-column:1!important;
  }
  .editor-page.live-website-preview-active>section:not(.editor-guide),
  .editor-page.live-website-preview-active>.empty{
    grid-column:2;
  }
  .editor-page.live-website-preview-active>.live-website-preview{
    position:sticky;
    top:64px;
    right:auto;
    bottom:auto;
    grid-column:3;
    grid-row:4;
    align-self:start;
    width:auto;
    min-width:0;
    height:calc(100vh - 64px);
  }
}
@media(min-width:821px) and (max-width:1279px){
  .editor-page.live-website-preview-active{
    grid-template-columns:220px minmax(0,1fr);
    width:auto;
    max-width:none;
    margin-right:0;
  }
  .editor-page.live-website-preview-active>.live-website-preview{
    position:static;
    grid-column:2;
    grid-row:5;
    width:auto;
    min-width:0;
    height:680px;
  }
}
/* Draft preview remains part of the editor flow so it cannot obscure the form. */
.editor-page > .preview-panel {
  grid-column: 2;
  grid-row: 5;
  position: relative;
  display: grid;
  min-width: 0;
}

.preview-panel .preview-dialog {
  display: grid;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
  max-height: none;
  overflow: auto;
}
</style>
<style>
html.ruijun-workbench-active .live-website-preview .visual-canvas-viewport > iframe{height:var(--canvas-height)!important;min-height:0!important;position:absolute!important;top:20px!important;left:max(20px,calc((100% - var(--canvas-width) * var(--visual-zoom)) / 2))!important}
</style>

<style>
/* Final canvas sizing overrides keep the zoom controlled by the toolbar. */
.visual-canvas-viewport{position:absolute;inset:72px 0 0;overflow:auto;background:#e9ecef;padding:20px}
.visual-canvas-viewport iframe{position:relative!important;top:auto!important;left:auto!important;width:calc(100% / var(--visual-zoom))!important;height:calc(100% / var(--visual-zoom))!important;min-height:900px;border:0;transform:scale(var(--visual-zoom))!important;transform-origin:top left!important}
.visual-canvas-viewport iframe{width:var(--canvas-width)!important}
.live-website-preview{--visual-toolbar-height:136px;--visual-property-panel-width:clamp(200px,34%,300px)}.live-website-preview.visual-property-panel-open .visual-canvas-viewport{right:var(--visual-property-panel-width)}.visual-property-panel{position:absolute;z-index:5;top:var(--visual-toolbar-height);right:0;bottom:0;width:var(--visual-property-panel-width);overflow:auto;box-sizing:border-box;border-left:1px solid var(--theme--border-color);background:var(--theme--background);padding:14px}.visual-property-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.visual-property-heading strong{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.visual-property-heading button{width:28px;height:28px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);cursor:pointer}.visual-property-source{margin:8px 0 14px;color:var(--theme--foreground-subdued);font-size:11px;overflow-wrap:anywhere}.visual-property-field{display:grid;gap:6px;margin-bottom:12px;color:var(--theme--foreground-subdued);font-size:12px}.visual-property-field textarea,.visual-property-field select,.visual-property-grid input,.visual-property-grid select{box-sizing:border-box;width:100%;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:8px;font:inherit}.visual-property-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.visual-property-grid label{display:grid;gap:5px;color:var(--theme--foreground-subdued);font-size:11px}.visual-list-order{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;padding:8px;border:1px solid var(--theme--border-color);border-radius:4px;color:var(--theme--foreground-subdued);font-size:11px}.visual-list-order>div{display:flex;gap:4px}.visual-list-order button{border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);padding:4px 7px;font:inherit;cursor:pointer}.visual-list-order button:disabled{cursor:not-allowed;opacity:.45}.visual-property-help{margin:8px 0;color:var(--theme--foreground-subdued);font-size:11px;line-height:1.5}
.visual-canvas-focus>.toolbar,.visual-canvas-focus>.editor-guide,.visual-canvas-focus>.message,.visual-canvas-focus>.wp-admin-menu,.visual-canvas-focus>section:not(.live-website-preview),.visual-canvas-focus>.empty{display:none!important}.visual-canvas-focus>.live-website-preview{position:fixed!important;inset:64px 0 0!important;width:100%!important;height:calc(100vh - 64px)!important;z-index:120}.visual-canvas-focus .visual-canvas-viewport{inset:72px 0 0!important}
.live-website-preview>header.visual-editor-toolbar{height:72px}
@media(max-width:1100px){.visual-canvas-viewport{inset:108px 0 0}}
@media(max-width:720px){.visual-canvas-viewport{inset:126px 0 0;padding:8px}}
/* 工作台导航覆盖 Directus 项目导航区域；宿主 DOM 不被修改，其它页面不受影响。 */
@media (min-width: 901px) {
  html.ruijun-workbench-active .v-sidebar,
  html.ruijun-workbench-active .private-view__sidebar,
  html.ruijun-workbench-active aside[aria-label="主导航"],
  html.ruijun-workbench-active aside[aria-label="Main navigation"] {
    display: none !important;
  }
  html.ruijun-workbench-active .editor-page {
    width: 100%;
    max-width: none;
    margin-left: 0;
    grid-template-columns: 222px minmax(0, 1fr);
  }
  html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) {
    grid-template-columns: 238px minmax(0, 1fr);
  }
  html.ruijun-workbench-active .editor-page > .wp-admin-menu {
    position: fixed;
    z-index: 100;
    top: 64px;
    left: 56px;
    width: 222px;
    height: calc(100vh - 64px);
    max-height: none;
    overflow-y: auto;
    box-sizing: border-box;
  }
  /* The fixed WordPress-style menu is removed from normal grid flow. Keep the
     workbench header and guide in the second track so they cannot sit beneath it. */
  html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) > .toolbar,
  html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) > .editor-guide,
  html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) > .message,
    html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) > .retry-save-action {
      grid-column: 2;
      margin-left: 16px;
    }
    /* The content cards share the second track with the fixed menu. Match the
       toolbar gap so a section cannot begin underneath the menu edge. */
    html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) > section:not(.editor-guide),
    html.ruijun-workbench-active .editor-page:not(.live-website-preview-active) > .empty {
      grid-column: 2;
      margin-left: 16px;
    }
    html.ruijun-workbench-active .editor-page.live-website-preview-active {
    grid-template-columns: 222px minmax(0, 1fr) clamp(460px, 38vw, 920px);
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }
}
@media(min-width:901px) and (max-width:1279px){
  html.ruijun-workbench-active .editor-page.live-website-preview-active{grid-template-columns:222px minmax(0,1fr)}
  html.ruijun-workbench-active .editor-page.live-website-preview-active>.wp-admin-menu{position:static!important;z-index:auto!important;grid-column:1!important;grid-row:4;width:auto;height:auto;min-height:0;overflow:visible}
  html.ruijun-workbench-active .editor-page.live-website-preview-active>section:not(.editor-guide),html.ruijun-workbench-active .editor-page.live-website-preview-active>.empty{grid-column:2;grid-row:4}
  /* The canvas viewport is absolutely positioned. Keep the preview itself as
     its containing block, otherwise the iframe escapes this grid cell and
     covers the workbench toolbar. */
  html.ruijun-workbench-active .editor-page.live-website-preview-active>.live-website-preview{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;grid-column:2;grid-row:5;width:auto;min-width:0;height:680px}
}
.visual-editor-toolbar{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;align-items:center;gap:4px;min-height:var(--visual-toolbar-height);padding:6px 10px}
.visual-editor-brand{grid-row:1;overflow:hidden}.visual-editor-tools{grid-row:2;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;white-space:nowrap}.visual-editor-actions{grid-row:3;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;white-space:nowrap}
.visual-editor-actions>*,.visual-editor-tools>*{flex-shrink:0}
.visual-editor-tools::-webkit-scrollbar,.visual-editor-actions::-webkit-scrollbar{height:3px}.visual-editor-tools::-webkit-scrollbar-thumb,.visual-editor-actions::-webkit-scrollbar-thumb{background:var(--theme--border-color)}
.live-website-preview>header.visual-editor-toolbar{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;min-height:var(--visual-toolbar-height);height:var(--visual-toolbar-height)!important}.live-preview-error{top:var(--visual-toolbar-height)!important}.visual-canvas-viewport{inset:var(--visual-toolbar-height) 0 0}.visual-canvas-focus .visual-canvas-viewport{inset:var(--visual-toolbar-height) 0 0!important}
/* The scoped legacy iframe rule otherwise shrinks a desktop canvas to the
   preview column. Preserve the chosen device viewport and let this surface scroll. */
html.ruijun-workbench-active .live-website-preview .visual-canvas-viewport > iframe{width:var(--canvas-width)!important}
/* At common desktop widths, a third column leaves insufficient space for a
   page form and lets the canvas property panel intercept its save action.
   Keep the editor in the first content row and place the preview after it.
   Wide desktops retain the side-by-side authoring layout below. */
@media(min-width:1280px) and (max-width:1599px){
  html.ruijun-workbench-active .editor-page.live-website-preview-active{
    grid-template-columns:176px minmax(0,1fr);
    gap:12px;
  }
  html.ruijun-workbench-active .editor-page.live-website-preview-active .editor-form{grid-template-columns:minmax(0,1fr)}
  html.ruijun-workbench-active .editor-page.live-website-preview-active .editor-form>*{min-width:0;max-width:100%;box-sizing:border-box}
  html.ruijun-workbench-active .editor-page.live-website-preview-active>.live-website-preview{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;grid-column:2;grid-row:5;width:auto;min-width:0;height:680px}
  html.ruijun-workbench-active .editor-page.live-website-preview-active .model-layout{grid-template-columns:minmax(0,1fr)}
  html.ruijun-workbench-active .editor-page.live-website-preview-active>.wp-admin-menu{width:176px}
}
@media(min-width:1600px){
  html.ruijun-workbench-active .editor-page.live-website-preview-active{
    grid-template-columns:222px minmax(400px,.85fr) minmax(640px,1.15fr);
    gap:16px;
  }
}
.live-preview-error{pointer-events:none}
@media(max-width:720px){
  html.ruijun-workbench-active .live-website-preview .visual-canvas-viewport > iframe{
    width:100%!important;
    height:calc(100% - 16px)!important;
    min-height:0!important;
    transform:none!important;
  }
}
</style>
