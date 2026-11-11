<template>
  <private-view class="content-workbench-view" title="鍐呭缂栬緫宸ヤ綔鍙?>
    <div class="editor-page" :class="{ 'live-website-preview-active': liveWebsitePreviewVisible && websitePreviewAvailable, 'visual-canvas-focus': visualCanvasFocus }" @input.capture="guardEditorInput" @focusin.capture="guardEditorFocus" @pointerdown.capture="captureEditorPointer" @wheel.capture="markEditorUserScroll" @touchmove.capture="markEditorUserScroll">
      <header class="toolbar">
        <div>
          <p class="eyebrow">鍐呭缂栬緫宸ヤ綔鍙?/p>
          <h2>瀹樼綉鍐呭缂栬緫</h2>
          <p>鎸夎〃鍗曠淮鎶ら〉闈€佷骇鍝併€佷紒涓氳祫鏂欍€佹湇鍔℃敮鎸佸拰鏂囩珷銆備繚瀛樺彧浼氭洿鏂拌崏绋匡紱瀹℃牳涓庡彂甯冪敱瀵瑰簲璐熻矗浜哄畬鎴愩€?/p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="guide-action" @click="helpOpen = !helpOpen">{{ helpOpen ? '鏀惰捣鎿嶄綔璇存槑' : '鏌ョ湅鎿嶄綔璇存槑' }}</button>
          <button type="button" class="preview-action" :disabled="!previewAvailable" :title="previewAvailable ? '鏌ョ湅褰撳墠琛ㄥ崟涓殑鏈繚瀛樹慨鏀? : '褰撳墠鍐呭绫诲瀷鏆備笉鏀寔鐢婚潰棰勮'" @click="openPreview">棰勮褰撳墠鑽夌</button>
          <button type="button" class="live-preview-toggle" :disabled="!websitePreviewAvailable" :title="websitePreviewAvailable ? '鍦ㄥ伐浣滃彴鍐呮墦寮€瀹樼綉瀹炴椂棰勮' : '瀹炴椂棰勮鍙鏈叕寮€鐨勮崏绋垮唴瀹瑰紑鏀撅細璇峰厛鎶婅鍐呭鎭㈠涓鸿崏绋匡紝骞跺湪宸︿晶閫変腑涓€涓〉闈㈠尯鍧?" @click="toggleLiveWebsitePreview">{{ websitePreviewAvailable && liveWebsitePreviewVisible ? '鍏抽棴瀹炴椂棰勮' : '鎵撳紑瀹炴椂棰勮' }}</button>
          <button type="button" class="website-preview-action" :disabled="!websitePreviewAvailable || websitePreviewOpening" :title="websitePreviewAvailable ? '淇濆瓨鑽夌鍚庯紝鍦ㄧ湡瀹炲畼缃戠増寮忎腑妫€鏌ユ樉绀烘晥鏋? : '璇峰厛閫夋嫨涓€鏉℃湭鍙戝竷鐨勮崏绋垮唴瀹?" @click="openWebsitePreview">{{ websitePreviewOpening ? '姝ｅ湪鎵撳紑瀹樼綉棰勮...' : '鍦ㄥ畼缃戜腑棰勮鑽夌' }}</button>
          <span v-if="hasUnsavedChanges" class="unsaved-indicator" role="status">鏈夋湭淇濆瓨淇敼</span>
          <button type="button" :disabled="loading" @click="requestReload">閲嶆柊鍔犺浇</button>
        </div>
      </header>

      <section class="editor-guide" aria-label="浣跨敤璇存槑">
        <div class="guide-heading"><strong>涓夋瀹屾垚涓€娆℃洿鏂?/strong><span>涓嶉渶瑕佹噦浠ｇ爜锛屽彧闇€濉啓涓枃鍐呭骞舵鏌ラ瑙堛€?/span></div>
        <ol class="workflow-steps">
          <li><b>1</b><span><strong>缂栬緫</strong><small>閫夋嫨鍐呭骞跺～鍐欐枃瀛椼€佸浘鐗囨垨鍙傛暟</small></span></li>
          <li><b>2</b><span><strong>棰勮</strong><small>鍏堟鏌ュ綋鍓嶄慨鏀癸紱淇濆瓨鍚庡彲鍦ㄥ畼缃戠敾闈腑澶嶆牳</small></span></li>
          <li><b>3</b><span><strong>閫佸</strong><small>鎻愪氦鍚庣敱瀹℃牳鍜屽彂甯冧汉鍛樼户缁鐞?/small></span></li>
        </ol>
        <div v-if="helpOpen" class="guide-detail">
          <p><strong>瀛楁鎬庝箞濉紵</strong>鏍囬鍜屾鏂囩洿鎺ュ～鍐欒瀹㈣鐪嬪埌鐨勪腑鏂囷紱鍥剧墖鍏堝湪鈥滃獟浣撹祫浜р€濈櫥璁帮紱甯﹂攣銆佺伆鑹叉垨鏍囨敞鈥滈珮绾р€濈殑瀛楁閫氬父涓嶉渶瑕佷慨鏀广€?/p>
          <p><strong>鐘舵€佹€庝箞鐞嗚В锛?/strong>鈥滆崏绋库€濆彧淇濆瓨鍦ㄥ悗鍙帮紝鈥滃鏍镐腑鈥濈瓑寰呰礋璐ｄ汉妫€鏌ワ紝鈥滃緟鍙戝竷鈥濆凡缁忔壒鍑嗕絾杩樻病鏈夊嚭鐜板湪瀹樼綉锛屸€滃凡鍙戝竷鈥濇墠浼氬澶栧睍绀恒€?/p>
          <p><strong>鎬庢牱閫夋嫨棰勮锛?/strong>鈥滈瑙堝綋鍓嶈崏绋库€濆彲绔嬪嵆妫€鏌ユ湭淇濆瓨鏂囧瓧锛涗繚瀛樿崏绋垮悗浣跨敤鈥滃湪瀹樼綉涓瑙堣崏绋库€濇墦寮€鐪熷疄瀹樼綉瀹℃牳鐢婚潰銆備袱鑰呴兘涓嶄細鍙戝竷鎴栨敼鍙樺鏍哥姸鎬併€?/p>
        </div>
        <span>鑽夌涓嶄細鍑虹幇鍦ㄥ畼缃戯紱甯﹂攣鎴栫伆鑹茬殑瀛楁鏄郴缁熻褰曟垨瀹℃牳瀛楁锛屼笉鑳藉湪杩欓噷鐩存帴淇敼銆?/span>
      </section>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <button v-if="error && retrySaveAction" type="button" class="retry-save-action" @click="retrySave">閲嶆柊淇濆瓨</button>
      <p v-else-if="message" class="message" role="status">{{ message }}</p>

      <nav class="workspace-tabs wp-admin-menu" aria-label="鍐呭绠＄悊鑿滃崟">
        <div class="tab-group site-area-tabs" aria-label="瀹樼綉鏍忕洰">
          <span class="tab-group-label">瀹樼綉鏍忕洰</span>
          <button type="button" :class="{ active: siteArea === 'home' }" :aria-current="siteArea === 'home' ? 'page' : undefined" @click="selectSiteArea('home')">缃戠珯涓婚〉</button>
          <button type="button" :class="{ active: siteArea === 'product' }" :aria-current="siteArea === 'product' ? 'page' : undefined" @click="selectSiteArea('product')">浜у搧灞曠ず</button>
          <button type="button" :class="{ active: siteArea === 'manufacturing' }" :aria-current="siteArea === 'manufacturing' ? 'page' : undefined" @click="selectSiteArea('manufacturing')">鍏堣繘鍒堕€?/button>
          <button type="button" :class="{ active: siteArea === 'news' }" :aria-current="siteArea === 'news' ? 'page' : undefined" @click="selectSiteArea('news')">瑙嗛鏂伴椈</button>
          <button type="button" :class="{ active: siteArea === 'about' }" :aria-current="siteArea === 'about' ? 'page' : undefined" @click="selectSiteArea('about')">鍏充簬鐟為挧</button>
          <button type="button" :class="{ active: siteArea === 'service' }" :aria-current="siteArea === 'service' ? 'page' : undefined" @click="selectSiteArea('service')">鏈嶅姟鏀寔</button>
        </div>
        <div class="tab-group area-tools" aria-label="甯哥敤鍐呭锛氬綋鍓嶅畼缃戞爮鐩唴瀹?>
          <span class="tab-group-label">{{ siteAreaLabel }}鍐呭</span>
          <button v-for="entry in siteAreaContentEntries" :key="entry.key" type="button" :class="{ active: isSiteAreaEntryActive(entry) }" @click="openSiteAreaEntry(entry)">{{ entry.label }}</button>
        </div>
        <div v-if="workflowAccess" class="tab-group workflow-tabs" aria-label="鍐呭娴佽浆">
          <span class="tab-group-label">鍐呭娴佽浆</span>
          <button type="button" :class="{ active: activeTab === 'submit' }" :aria-current="activeTab === 'submit' ? 'page' : undefined" @click="selectTab('submit')">鍐呭閫佸</button>
        </div>
        <div v-if="technicalAccess" class="tab-group advanced-tabs" :class="{ expanded: showAdvanced }" aria-label="鏇村宸ュ叿">
          <button type="button" class="advanced-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '鏀惰捣楂樼骇璁剧疆' : '楂樼骇璁剧疆' }}<span aria-hidden="true">{{ showAdvanced ? '鈱? : '鈱? }}</span></button>
          <div v-if="showAdvanced" class="advanced-tab-list">
            <button type="button" :class="{ active: activeTab === 'media' }" :aria-current="activeTab === 'media' ? 'page' : undefined" @click="selectTab('media')">濯掍綋璧勪骇</button>
            <button type="button" :class="{ active: activeTab === 'knowledge' }" :aria-current="activeTab === 'knowledge' ? 'page' : undefined" @click="selectTab('knowledge')">甯歌闂鐭ヨ瘑</button>
            <button type="button" :class="{ active: activeTab === 'models' }" :aria-current="activeTab === 'models' ? 'page' : undefined" @click="selectTab('models')">鍨嬪彿涓庡弬鏁?/button>
            <button type="button" :class="{ active: activeTab === 'review' }" :aria-current="activeTab === 'review' ? 'page' : undefined" @click="selectTab('review')">瀹℃牳闃熷垪</button>
            <a class="advanced-link" href="/admin/ruijun-content-publication-queue-workbench">鍙戝竷涓績</a>
            <button type="button" :class="{ active: activeTab === 'settings' }" :aria-current="activeTab === 'settings' ? 'page' : undefined" @click="selectTab('settings')">鍏ㄧ珯璁剧疆</button>
          </div>
        </div>
      </nav>

      <section v-if="activeTab === 'repair' && !loading" class="workspace-grid repair-workspace" aria-label="鍞悗椤甸潰閰嶇疆缂栬緫">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">鍞悗椤甸潰閰嶇疆</p><h3>椤甸潰鑽夌</h3></div><strong>{{ repairPages.length }}</strong></div>
          <button v-for="record in repairPages" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedRepairPageId }" @click="selectRepairPage(record.id)">
            <span>{{ record.title || record.page_key }}</span><small>{{ record.page_key }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="!repairPages.length" class="empty compact">鏆傛棤鍞悗椤甸潰鑽夌銆?/p>
        </aside>
        <form v-if="repairDraft" class="editor-form" @submit.prevent="saveRepairPage">
          <div class="form-heading"><div><p class="eyebrow">鍞悗椤甸潰閰嶇疆</p><h3>{{ repairDraft.page_key }}</h3></div><span class="status" :data-status="repairDraft.status">{{ statusLabel(repairDraft.status) }}</span></div>
          <p class="form-help">杩欓噷浠呯淮鎶ゅ畼缃戝敭鍚庨〉闈㈢殑灞曠ず鍐呭锛涚淮淇敵璇枫€佷繚淇牳楠屽拰杩涘害鏌ヨ浠嶇敱 Repair 鏈嶅姟澶勭悊銆?/p>
          <div class="field-grid">
            <label>椤甸潰閿?input v-model.trim="repairDraft.page_key" disabled></label>
            <label>璇█<input v-model.trim="repairDraft.language" :disabled="!canEdit(repairDraft)" maxlength="20"></label>
            <label class="full">鏍囬<input v-model.trim="repairDraft.title" :disabled="!canEdit(repairDraft)" required maxlength="240"></label>
            <label class="full">浠嬬粛<textarea v-model.trim="repairDraft.intro" :disabled="!canEdit(repairDraft)" rows="4" maxlength="4000"></textarea></label>
            <label class="full">Hero 鍥剧墖璧勬簮<input v-model.trim="repairDraft.hero_asset" :disabled="!canEdit(repairDraft)" placeholder="濯掍綋璧勬簮 ID 鎴?URL"></label>
            <label class="full">鍨嬪彿鍗＄墖 JSON<textarea v-model="repairDraft.model_cards_text" :disabled="!canEdit(repairDraft)" rows="5" placeholder="[{&quot;model&quot;:&quot;FR400XS&quot;,&quot;label&quot;:&quot;FR400XS&quot;}]"></textarea></label>
            <label class="full">鍔ㄤ綔鍗＄墖 JSON锛堜粎鍏佽 01銆?2銆?9銆?0锛?textarea v-model="repairDraft.action_cards_text" :disabled="!canEdit(repairDraft)" rows="6" placeholder="[{&quot;action&quot;:&quot;01&quot;,&quot;label&quot;:&quot;鎻愪氦缁翠慨鐢宠&quot;}]"></textarea></label>
            <label class="full">娴佺▼姝ラ JSON<textarea v-model="repairDraft.process_steps_text" :disabled="!canEdit(repairDraft)" rows="5"></textarea></label>
            <label class="full">鎻愮ず浜嬮」 JSON<textarea v-model="repairDraft.notices_text" :disabled="!canEdit(repairDraft)" rows="4"></textarea></label>
            <label class="full">甯歌闂寮曠敤 JSON<textarea v-model="repairDraft.faq_refs_text" :disabled="!canEdit(repairDraft)" rows="4"></textarea></label>
            <label class="full">SEO JSON<textarea v-model="repairDraft.seo_text" :disabled="!canEdit(repairDraft)" rows="4"></textarea></label>
          </div>
          <div class="form-actions"><a class="repair-page-preview" :href="repairPreviewUrl(repairDraft)" target="_blank" rel="noreferrer">鎵撳紑瀹樼綉鑽夌棰勮</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(repairDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨鍞悗椤甸潰鑽夌' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨涓€鏉″敭鍚庨〉闈㈣崏绋裤€?/div>
      </section>

      <div v-if="loading" class="empty">姝ｅ湪鍔犺浇鍙紪杈戝唴瀹?..</div>

      <section v-else-if="activeTab === 'home'" class="editor-start" aria-labelledby="editor-start-title">
        <div class="start-heading">
          <p class="eyebrow">{{ siteAreaLabel }}鍐呭</p>
          <h3 id="editor-start-title">閫夋嫨瑕佷慨鏀圭殑缃戠珯鍖哄潡</h3>
          <p>杩欓噷鎸夊畼缃戝疄闄呮樉绀哄尯鍧楀垎绫汇€傜偣鍑诲尯鍧楀悗锛屽伐浣滃彴浼氭墦寮€瀵瑰簲鍐呭骞跺畾浣嶅埌璇ヤ綅缃紝涓嶅啀鍏堣繘鍏ラ€氱敤鈥滈〉闈⑩€濆垪琛ㄣ€?/p>
        </div>
        <div class="start-task-grid">
          <button v-for="(entry, index) in siteAreaContentEntries" :key="entry.key" type="button" class="start-task" @click="openSiteAreaEntry(entry)">
            <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ entry.label }}</strong><small>{{ siteAreaEntryDescription(entry) }}</small>
          </button>
        </div>
        <p class="start-tip">闇€瑕佺鐞嗗浘鐗囥€佹妧鏈弬鏁般€佸鏍告垨鍏ㄧ珯璁剧疆鏃讹紝鍐嶆墦寮€鈥滈珮绾ц缃€濄€?/p>
      </section>

      <section v-else-if="activeTab === 'media'" class="media-workspace" aria-label="濯掍綋璧勪骇鐧昏">
        <section class="editor-form media-upload-form">
          <div class="form-heading">
          <div><p class="eyebrow">濯掍綋绱犳潗</p><h3>涓婁紶濯掍綋绱犳潗</h3></div>
            <span class="status" data-status="published">涓婁紶鍗冲彂甯?/span>
          </div>
          <p class="form-help">濯掍綋绱犳潗宸插彇娑堝鏍革細涓婁紶鎴愬姛鍗冲彂甯冨埌瀹樼綉绱犳潗搴擄紝鍙珛鍗冲湪鐢诲竷鍜屽唴瀹逛腑浣跨敤銆傝鍏堢‘璁ゅ浘鐗?瑙嗛鐨勭増鏉冧笌鎺堟潈鑼冨洿銆?/p>
          <form class="media-form-fields" @submit.prevent="createMediaCandidate">
            <div class="field-grid">
          <label class="full">鏂囦欢<input ref="mediaFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v,application/pdf" required @change="selectMediaFile"></label>
              <p v-if="mediaDraft.file" class="form-help full">宸查€夋嫨锛歿{ mediaDraft.file.name }} 路 {{ readableFileSize(mediaDraft.file.size) }} 路 {{ mediaMetadataLabel }}</p>
              <label>浣跨敤鑼冨洿<select v-model="mediaDraft.usage_scope" required @change="syncMediaScopeContext"><option value="homepage">缃戠珯涓婚〉</option><option value="product">浜у搧灞曠ず</option><option value="manufacturing">鍏堣繘鍒堕€?/option><option value="article">瑙嗛鏂伴椈</option><option value="brand">鍏充簬鐟為挧</option><option value="service">鏈嶅姟鏀寔</option></select></label>
              <label>瀹樼綉灞曠ず浣嶇疆<select v-model="mediaDraft.placement_key" required @change="applyMediaPlacementContext(mediaDraft.placement_key, true)"><option v-for="option in compatibleMediaPlacements" :key="option.key" :value="option.key">{{ option.label }}</option></select></label>
              <p class="field-help full">{{ selectedMediaPlacementHelp }}</p>
              <label>鎵€灞為〉闈?input v-model.trim="mediaDraft.page_key" maxlength="80" placeholder="渚嬪锛歨ome銆乶ews銆乸roduct"></label>
              <label>鎵€灞炴钀?input v-model.trim="mediaDraft.section_key" maxlength="80" placeholder="渚嬪锛歨ero銆乿ideo-sharing"></label>
              <label>绱犳潗鏍囬<input v-model.trim="mediaDraft.title" maxlength="160"></label>
              <label>鏄剧ず椤哄簭<input v-model.number="mediaDraft.sort_order" type="number" min="0" max="9999"></label>
              <label>鐗堟潈鐘舵€?select v-model="mediaDraft.copyright_status" required><option value="owned">鑷湁绱犳潗</option><option value="licensed">宸茶幏璁稿彲</option><option value="authorized">宸叉巿鏉冨叕寮€</option><option value="pending_review">寰呯‘璁?/option></select></label>
              <label class="toggle-field"><input v-model="mediaDraft.enabled" type="checkbox"><span>鍙戝竷鍚庡厑璁告浣嶇疆浣跨敤</span></label>
              <label class="full">鏇夸唬鏂囨湰<input v-model.trim="mediaDraft.alt_text" maxlength="300" placeholder="绠€瑕佽鏄庣敾闈㈡垨鏂囦欢鍐呭锛屼究浜庢绱笌鏃犻殰纰嶈闂?></label>
              <label class="full">绱犳潗璇存槑<textarea v-model.trim="mediaDraft.description" rows="2" maxlength="2000"></textarea></label>
              <template v-if="mediaDraft.media_type === 'video'">
                <label>瑙嗛灏侀潰<span>锛堝彲閫夛紝寤鸿濉啓锛涙湭濉啓鏃跺畼缃戝厛鏄剧ず瑙嗛棣栧抚锛?/span><select v-model="mediaDraft.poster_asset_id"><option value="">鏆備笉璁剧疆灏侀潰锛堜箣鍚庡彲鍦ㄧ礌鏉愭竻鍗曡ˉ鍏咃級</option><option v-for="asset in videoPosterOptions" :key="asset.id" :value="String(asset.id)">{{ videoPosterAssetLabel(asset) }}</option></select></label>
                <label class="toggle-field"><input v-model="mediaDraft.autoplay" type="checkbox"><span>鑷姩鎾斁</span></label>
                <label class="toggle-field"><input v-model="mediaDraft.muted" type="checkbox"><span>榛樿闈欓煶</span></label>
                <label class="toggle-field"><input v-model="mediaDraft.loop" type="checkbox"><span>寰幆鎾斁</span></label>
                <label class="full">瀛楀箷鎴栨枃瀛楃<textarea v-model.trim="mediaDraft.transcript" rows="4" maxlength="30000" placeholder="瑙嗛鍒嗕韩鍙€夛紱鏁欏瑙嗛鍜岄灞忚鏄庡缓璁～鍐?></textarea></label>
              </template>
              <label class="full">鎺堟潈涓庢潵婧愯鏄?textarea v-model.trim="mediaDraft.authorization_note" rows="3" maxlength="2000" placeholder="濉啓鎷嶆憚鏉ユ簮銆佽鍙瘉銆佹巿鏉冭寖鍥存垨寰呯‘璁や簨椤?></textarea></label>
            </div>
            <div class="form-actions"><span></span><button class="primary-action" type="submit" :disabled="saving || !mediaDraft.file">{{ saving ? '姝ｅ湪涓婁紶...' : '涓婁紶骞跺彂甯冪礌鏉? }}</button></div>
          </form>
          <p v-if="activeTab === 'media' && error" class="form-help media-upload-error" role="alert">{{ error }}</p>
        </section>

        <section class="editor-form media-candidate-list" aria-labelledby="media-candidates-title">
          <div class="section-heading"><div><p class="eyebrow">绱犳潗娓呭崟</p><h3 id="media-candidates-title">褰撳墠濯掍綋璁板綍</h3></div><strong>{{ mediaCandidates.length }}</strong></div>
          <p v-if="!mediaCandidates.length" class="empty compact">鏆傛湭鐧昏濯掍綋璧勪骇銆?/p>
          <article v-for="asset in mediaCandidates" :key="asset.id" class="media-candidate-row">
            <div class="media-preview" aria-hidden="true"><img v-if="isPreviewableMedia(asset) && mediaPreviewUrl(asset)" :src="mediaPreviewUrl(asset)" :alt="asset.alt_text || asset.original_file_name"><span v-else>{{ mediaPreviewLabel(asset) }}</span></div>
            <div><strong>{{ asset.title || asset.original_file_name }}</strong><p>{{ asset.original_file_name }} 路 {{ usageScopeLabel(asset.usage_scope) }} 路 {{ asset.placement_key || '鏈寚瀹氬睍绀轰綅缃? }} 路 {{ asset.mime_type }} 路 {{ readableFileSize(asset.byte_size) }}</p><small>{{ asset.width && asset.height ? `${asset.width} x ${asset.height} px 路 ${asset.aspect_ratio || '姣斾緥鏈褰?}` : asset.media_type === 'document' ? 'PDF 鏂囨。' : '灏哄鏈褰? }} 路 {{ asset.alt_text || '鏈～鍐欐浛浠ｆ枃鏈? }}</small></div>
            <span class="status" :data-status="asset.status">{{ statusLabel(asset.status) }}</span>
            <button type="button" class="text-action danger" @click="deleteMediaAsset(asset)">鍒犻櫎</button>
            <div v-if="asset.media_type === 'video'" class="media-poster-editor">
              <label>灏侀潰<select v-model="mediaPosterSelections[asset.id]"><option value="">鏈缃紙瀹樼綉鏄剧ず瑙嗛棣栧抚锛?/option><option v-for="poster in mediaPosterOptions(asset)" :key="poster.id" :value="String(poster.id)">{{ videoPosterAssetLabel(poster) }}</option></select></label>
              <button type="button" :disabled="mediaPosterSavingId === String(asset.id)" @click="saveMediaPoster(asset)">{{ mediaPosterSavingId === String(asset.id) ? '淇濆瓨涓?..' : '淇濆瓨灏侀潰' }}</button>
              <small>{{ mediaPosterHint(asset) }}</small>
            </div>
          </article>
        </section>
      </section>

      <section v-else-if="activeTab === 'knowledge'" class="workspace-grid" aria-label="甯歌闂鐭ヨ瘑鑽夌缂栬緫">
        <aside class="record-list-panel knowledge-list">
          <div class="panel-heading"><div><p class="eyebrow">甯歌闂鐭ヨ瘑</p><h3>鐭ヨ瘑鑽夌</h3></div><strong>{{ filteredKnowledge.length }}</strong></div>
          <label class="list-search">妫€绱㈤棶棰?input v-model.trim="knowledgeSearch" type="search" placeholder="鎸夋爣棰樻垨鍒嗙被绛涢€?></label>
          <button type="button" class="primary-action" :disabled="saving" @click="createKnowledgeRecord">鏂板缓瀹樼綉鐭ヨ瘑鑽夌</button>
          <button v-for="record in filteredKnowledge" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedKnowledgeId }" @click="selectKnowledge(record.id)">
            <span>{{ record.question_title || '鏈懡鍚嶇煡璇? }}</span><small>{{ record.category || '鏈垎绫? }} 路 {{ riskLabel(record.risk_level) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="!filteredKnowledge.length" class="empty compact">娌℃湁绗﹀悎褰撳墠绛涢€夋潯浠剁殑甯歌闂鐭ヨ瘑鑽夌銆?/p>
        </aside>

        <form v-if="knowledgeDraft" class="editor-form" @submit.prevent="saveKnowledge">
          <div class="form-heading"><div><p class="eyebrow">鐭ヨ瘑鑽夌</p><h3>{{ knowledgeDraft.question_title || '鏈懡鍚嶇煡璇? }}</h3></div><span class="status" :data-status="knowledgeDraft.status">{{ statusLabel(knowledgeDraft.status) }}</span></div>
          <p v-if="!canEdit(knowledgeDraft)" class="read-only-note">璇ョ煡璇嗗凡杩涘叆瀹℃牳銆佹帓鏈熸垨鍙戝竷鐘舵€併€傝閫氳繃鍐呭鐗堟湰娴佺▼鎭㈠涓鸿崏绋垮悗鍐嶄慨鏀广€?/p>
          <p v-else class="form-help">杩欓噷鍙繚瀛樺唴閮ㄨ崏绋裤€傛妧鏈鏍镐汉浠嶉渶鍦ㄥ鏍告祦绋嬩腑纭椋庨櫓杈圭晫锛涙櫤鑳介棶绛旂煡璇嗗簱鍚屾涓庡叕寮€鍙戝竷涓嶅湪姝ら〉闈㈡墽琛屻€?/p>
          <div class="field-grid">
            <label>璧勬枡缂栧彿锛堢郴缁熺淮鎶わ級<input :value="knowledgeDraft.source_key" disabled></label>
            <label>鏉ユ簮鏂囨。<input :value="knowledgeDraft.source_document || '鏈～鍐?" disabled></label>
            <label class="full">闂鏍囬<input v-model.trim="knowledgeDraft.question_title" :disabled="!canEdit(knowledgeDraft)" required maxlength="240"></label>
            <label>瀹樼綉鏍忕洰<select v-model="knowledgeDraft.category" :disabled="!canEdit(knowledgeDraft)" required><option value="fault_analysis">甯歌鏁呴殰鍒嗘瀽</option><option value="knowledge_share">鐭ヨ瘑鍒嗕韩</option></select></label>
            <label>椋庨櫓绛夌骇<select v-model="knowledgeDraft.risk_level" :disabled="!canEdit(knowledgeDraft)" required><option value="high">楂橀闄?/option><option value="medium">涓闄?/option><option value="low">浣庨闄?/option></select></label>
            <label>鍙鑼冨洿<select v-model="knowledgeDraft.visibility" :disabled="!canEdit(knowledgeDraft)" required><option value="support_internal">鍞悗鍐呴儴</option><option value="public">鍏紑鍊欓€?/option></select></label>
            <label>浣跨敤娓犻亾<select v-model="knowledgeDraft.channel" :disabled="!canEdit(knowledgeDraft)" required><option value="both">瀹樼綉涓庣淮淇</option><option value="website">瀹樼綉</option><option value="repair_portal">缁翠慨绔?/option></select></label>
            <label>鐭ヨ瘑鐗堟湰<input v-model.trim="knowledgeDraft.version" :disabled="!canEdit(knowledgeDraft)" required maxlength="80" placeholder="渚嬪锛歷1.0"></label>
            <label>灞曠ず鏃ユ湡<input v-model="knowledgeDraft.display_date" :disabled="!canEdit(knowledgeDraft)" type="date"></label>
            <label>椤甸潰鎺掑簭<input v-model.number="knowledgeDraft.sort_order" :disabled="!canEdit(knowledgeDraft)" type="number" min="0" step="1"></label>
            <label>鎶€鏈鏍歌矗浠讳汉<input v-model.trim="knowledgeDraft.technical_reviewer" :disabled="!canEdit(knowledgeDraft)" required maxlength="160" placeholder="濮撳悕鎴栧矖浣?></label>
            <label>閫傜敤鍨嬪彿锛堟瘡琛屼竴椤癸級<textarea v-model="knowledgeDraft.applicableModelsText" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="3000"></textarea></label>
            <label>閿欒浠ｇ爜锛堟瘡琛屼竴椤癸級<textarea v-model="knowledgeDraft.errorCodesText" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="3000"></textarea></label>
            <label class="full">鏁呴殰鐜拌薄<textarea v-model="knowledgeDraft.symptoms" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="6000" placeholder="鎻忚堪鐢ㄦ埛鍙瀵熷埌鐨勬晠闅滅幇璞?></textarea></label>
            <label class="full">鎺掗殰姝ラ鎴栧師濮嬬煡璇嗗唴瀹?textarea v-model="knowledgeDraft.troubleshootingStepsText" :disabled="!canEdit(knowledgeDraft)" rows="10" maxlength="20000" required placeholder="姣忚涓€鏉℃帓闅滄楠わ紝鎴栦繚鐣欏鍏ョ殑鍘熷鐭ヨ瘑鍐呭"></textarea></label>
            <label class="full">瀹夊叏鍓嶇疆鏉′欢锛堥珮椋庨櫓鐭ヨ瘑姣忚涓€椤癸級<textarea v-model="knowledgeDraft.safetyPreconditionsText" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="6000" placeholder="渚嬪锛氭柇寮€璁惧涓荤數婧愬苟纭鏀剧數瀹屾垚"></textarea></label>
            <label class="full">浜哄伐鍗囩骇璇存槑锛堥珮椋庨櫓鐭ヨ瘑蹇呭～锛?textarea v-model="knowledgeDraft.escalation_guidance" :disabled="!canEdit(knowledgeDraft)" rows="4" maxlength="6000" placeholder="璇存槑浣曟椂鍋滄鑷姪鎺掗殰骞惰浆浜哄伐鍞悗"></textarea></label>
            <label>鐭ヨ瘑搴撳悓姝ョ姸鎬侊紙绯荤粺缁存姢锛?input :value="knowledgeSyncStatusLabel(knowledgeDraft.dify_sync_status)" disabled></label>
          </div>
          <section class="media-reference-editor" aria-label="甯歌闂鐭ヨ瘑鍙楁帶濯掍綋">
            <div class="section-card-heading"><strong>鍙楁帶鐭ヨ瘑濯掍綋</strong><span>{{ knowledgeDraft.mediaReferences.length }}</span></div>
            <div class="media-reference-add"><select v-model="knowledgeMediaSelection" :disabled="!canEdit(knowledgeDraft)"><option value="">閫夋嫨鐭ヨ瘑搴撶礌鏉愶紙鍚唴閮ㄩ瑙堣崏绋匡級</option><option v-for="asset in editableMediaAssets('knowledge')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(knowledgeDraft) || !knowledgeMediaSelection" @click="addKnowledgeMediaReference">娣诲姞</button></div>
            <p v-if="!editableMediaAssets('knowledge').length" class="form-help">鏆傛棤鍙敤鐨勭煡璇嗗簱绱犳潗銆傝鍏堝湪鈥滃獟浣撹祫浜р€濅腑鐧昏绱犳潗锛涘獟浣撲笂浼犲嵆鍙戝竷锛岃崏绋夸粎鐢ㄤ簬鍚庡彴鍐呴儴棰勮銆?/p>
            <div v-for="reference in knowledgeDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'knowledge') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(knowledgeDraft)" @click="removeKnowledgeMediaReference(reference.media_asset_id)">绉婚櫎</button></div>
          </section>
          <div class="form-actions"><a :href="nativeItemPath('knowledge_items', knowledgeDraft.id)">鎵撳紑楂樼骇璁剧疆绠＄悊濯掍綋涓庡叾浠栧瓧娈?/a><button class="primary-action" type="submit" :disabled="saving || !canEdit(knowledgeDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨甯歌闂鐭ヨ瘑鑽夌' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨涓€鏉″父瑙侀棶棰樼煡璇嗚崏绋裤€?/div>
      </section>

      <section v-else-if="activeTab === 'submit'" class="workspace-grid review-workspace" aria-label="鍐呭閫佸娓呭崟">
        <aside class="record-list-panel review-list">
          <div class="panel-heading"><div><p class="eyebrow">鎻愪氦瀹℃牳</p><h3>{{ submissionMode === 'submit' ? '鍙彁浜よ崏绋? : '寰呮仮澶嶅唴瀹? }}</h3></div><strong>{{ filteredSubmissionQueue.length }}<template v-if="filteredSubmissionQueue.length !== submissionQueue.length"> / {{ submissionQueue.length }}</template></strong></div>
          <div class="subtabs lifecycle-tabs"><button type="button" :class="{ active: submissionMode === 'submit' }" @click="setSubmissionMode('submit')">鎻愪氦瀹℃牳</button><button type="button" :class="{ active: submissionMode === 'restore' }" @click="setSubmissionMode('restore')">鎭㈠鑽夌</button></div>
          <p class="form-help">{{ submissionMode === 'submit' ? '鍙樉绀哄綋鍓嶈处鍙峰彲浠ヨ鍙栫殑鑽夌銆? : '鍙樉绀洪€€鍥炰慨鏀规垨涓嬬嚎鍐呭锛涙仮澶嶅悗鎵嶈兘缁х画缂栬緫鎴栭噸鏂版彁浜ゅ鏍搞€? }}</p>
          <div v-if="submissionQueue.length > 1" class="queue-filters">
            <label>鎼滅储鍐呭<input v-model.trim="submissionQuery" type="search" placeholder="杈撳叆鍚嶇О鎴栨爣璇嗭紝渚嬪 娴嬭瘯1" maxlength="80"></label>
            <label>鍐呭绫诲瀷<select v-model="submissionCollectionFilter"><option value="">鍏ㄩ儴绫诲瀷锛坽{ submissionQueue.length }}锛?/option><option v-for="option in submissionCollectionOptions" :key="option.value" :value="option.value">{{ option.label }}锛坽{ option.count }}锛?/option></select></label>
          </div>
          <button type="button" class="text-action refresh-queue" :disabled="submissionLoading" @click="loadSubmissionQueue">{{ submissionLoading ? '姝ｅ湪鍒锋柊...' : '鍒锋柊娓呭崟' }}</button>
          <button v-for="record in filteredSubmissionQueue" :key="submissionRecordKey(record)" type="button" class="record-choice" :class="{ active: submissionRecordKey(record) === selectedSubmissionKey }" @click="selectSubmissionRecord(record)">
            <span>{{ record.label }}</span><small>{{ record.collectionLabel }} 路 {{ record.secondary || statusLabel(record.status) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="submissionLoading" class="empty compact">姝ｅ湪璇诲彇鍚勫唴瀹圭被鍨嬬殑{{ submissionMode === 'submit' ? '鑽夌' : '寰呮仮澶嶈褰? }}...</p>
          <p v-else-if="!submissionQueue.length" class="empty compact">褰撳墠璐﹀彿娌℃湁{{ submissionMode === 'submit' ? '鍙彁浜ゅ鏍哥殑鑽夌' : '鍙仮澶嶇殑鍐呭' }}銆?/p>
          <p v-else-if="!filteredSubmissionQueue.length" class="empty compact">娌℃湁绗﹀悎绛涢€夋潯浠剁殑{{ submissionMode === 'submit' ? '鑽夌' : '寰呮仮澶嶅唴瀹? }}銆?button type="button" class="text-action" @click="clearSubmissionFilters">娓呴櫎绛涢€?/button></p>
        </aside>

        <section v-if="selectedSubmissionRecord" class="editor-form review-detail">
          <div class="form-heading"><div><p class="eyebrow">{{ submissionMode === 'submit' ? '鎻愪氦瀹℃牳' : '鎭㈠鑽夌' }}</p><h3>{{ selectedSubmissionRecord.label }}</h3></div><span class="status" :data-status="selectedSubmissionRecord.status">{{ statusLabel(selectedSubmissionRecord.status) }}</span></div>
          <div class="review-meta"><span>{{ selectedSubmissionRecord.collectionLabel }}</span><span v-if="selectedSubmissionRecord.secondary">{{ selectedSubmissionRecord.secondary }}</span></div>
          <ul v-if="selectedSubmissionRecord.collection === 'content_submissions'" class="batch-item-list"><li v-for="item in selectedSubmissionRecord.items" :key="`${item.collection}:${item.id}`">{{ item.label || item.id }}</li></ul>
          <p v-if="selectedSubmissionRecord.review_note" class="review-note-display"><strong>{{ submissionMode === 'submit' ? '鐜版湁瀹℃牳璇存槑' : '鏈€杩戝鏍歌鏄? }}</strong><span>{{ selectedSubmissionRecord.review_note }}</span></p>
          <p class="form-help">{{ submissionMode === 'submit' ? '鎻愪氦鍚庤褰曞皢鍐荤粨涓衡€滃鏍镐腑鈥濄€傚鏍镐汉鍛樺皢鎸夊唴瀹圭被鍨嬨€佹潵婧愩€佸彈鎺у獟浣撳拰鍙戝竷鍓嶇疆鏉′欢杩涜澶嶆牳銆? : '鎭㈠鍚庤褰曞彉涓洪潪鍏紑鑽夌锛屽彲鍐嶆缂栬緫锛涙仮澶嶄笉浠ｈ〃閫氳繃瀹℃牳锛屼篃涓嶄細鑷姩鍙戝竷銆? }}</p>
          <label class="review-note">{{ submissionMode === 'submit' ? '鎻愪氦璇存槑' : '鎭㈠璇存槑' }}<textarea v-model.trim="submissionNote" rows="6" maxlength="2000" :placeholder="submissionMode === 'submit' ? '璇存槑鏈淇敼鑼冨洿銆佸緟瀹℃牳涓诲紶鎴栨妧鏈鏍搁噸鐐? : '璇存槑鎭㈠鍘熷洜鎴栧悗缁ˉ鍏呰鍒? "></textarea></label>
          <div class="form-actions"><a :href="nativeItemPath(selectedSubmissionRecord.collection, selectedSubmissionRecord.id)">鎵撳紑楂樼骇璁剧疆锛堜笓涓氫汉鍛橈級</a><button type="button" class="primary-action" :disabled="submissionSaving" @click="submissionMode === 'submit' ? submitForReview() : restoreDraft()">{{ submissionSaving ? '姝ｅ湪鎻愪氦...' : (submissionMode === 'submit' ? '鎻愪氦瀹℃牳' : '鎭㈠涓鸿崏绋?) }}</button></div>
        </section>
        <div v-else class="empty">璇蜂粠宸︿晶閫夋嫨涓€鏉{ submissionMode === 'submit' ? '鑽夌' : '寰呮仮澶嶅唴瀹? }}銆?/div>
      </section>

      <section v-else-if="activeTab === 'review'" class="workspace-grid review-workspace" aria-label="寰呭鏍稿唴瀹归槦鍒?>
        <aside class="record-list-panel review-list">
          <div class="panel-heading"><div><p class="eyebrow">瀹℃牳闃熷垪</p><h3>寰呭鏍稿唴瀹?/h3></div><strong>{{ reviewQueue.length }}</strong></div>
          <p class="form-help">鍙樉绀哄綋鍓嶈处鍙锋湁鏉冮檺鏌ョ湅鐨勨€滃鏍镐腑鈥濊褰曘€?/p>
          <button type="button" class="text-action refresh-queue" :disabled="reviewLoading" @click="loadReviewQueue">{{ reviewLoading ? '姝ｅ湪鍒锋柊...' : '鍒锋柊闃熷垪' }}</button>
          <p v-if="productReleaseHint" class="product-release-hint">浜у搧鍐呭宸叉壒鍑嗚繘鍏ュ緟鍙戝竷銆傝鍓嶅線 <a href="/admin/ruijun-product-release-workbench">浜у搧缁熶竴鍙戝竷</a> 鐢熸垚鍏紑蹇収銆?/p>
          <button v-for="record in reviewQueue" :key="reviewRecordKey(record)" type="button" class="record-choice" :class="{ active: reviewRecordKey(record) === selectedReviewKey }" @click="selectReviewRecord(record)">
            <span>{{ record.label }}</span><small>{{ record.collectionLabel }} 路 {{ record.secondary || '寰呭鏍? }}</small><i data-status="review">瀹℃牳涓?/i>
          </button>
          <p v-if="reviewLoading" class="empty compact">姝ｅ湪璇诲彇鍚勫唴瀹圭被鍨嬬殑寰呭鏍歌褰?..</p>
          <p v-else-if="!reviewQueue.length" class="empty compact">褰撳墠璐﹀彿娌℃湁鍙鐞嗙殑寰呭鏍稿唴瀹广€?/p>
        </aside>

        <section v-if="selectedReviewRecord" class="editor-form review-detail">
          <div class="form-heading"><div><p class="eyebrow">瀹℃牳澶勭悊</p><h3>{{ selectedReviewRecord.label }}</h3></div><span class="status" data-status="review">瀹℃牳涓?/span></div>
          <div class="review-meta"><span>{{ selectedReviewRecord.collectionLabel }}</span><span v-if="selectedReviewRecord.secondary">{{ selectedReviewRecord.secondary }}</span></div>
          <ul v-if="selectedReviewRecord.collection === 'content_submissions'" class="batch-item-list"><li v-for="item in selectedReviewRecord.items" :key="`${item.collection}:${item.id}`">{{ item.label || item.id }}</li></ul>
          <p v-if="selectedReviewRecord.review_note" class="review-note-display"><strong>鎻愪氦璇存槑</strong><span>{{ selectedReviewRecord.review_note }}</span></p>
          <p class="form-help">纭鍚庯紝鏈嶅姟绔細鏍规嵁褰撳墠璐﹀彿瑙掕壊涓庡唴瀹瑰氨缁害鍐冲畾鏄惁鍏佽娴佽浆銆傝椤甸潰涓嶄細鎵ц鍙戝竷銆?/p>
          <label class="review-note">瀹℃牳璇存槑<textarea v-model.trim="reviewNote" rows="6" maxlength="2000" placeholder="濉啓閫氳繃渚濇嵁鎴栭€€鍥炰慨鏀硅姹?></textarea></label>
          <div class="form-actions"><a :href="nativeItemPath(selectedReviewRecord.collection, selectedReviewRecord.id)">鎵撳紑楂樼骇璁剧疆锛堜笓涓氫汉鍛橈級</a><div class="review-actions"><button type="button" class="secondary-action" :disabled="reviewSaving" @click="decideReview('rejected')">閫€鍥炰慨鏀?/button><button type="button" class="primary-action" :disabled="reviewSaving" @click="decideReview('scheduled')">{{ reviewSaving ? '姝ｅ湪鎻愪氦...' : '鎵瑰噯杩涘叆寰呭彂甯? }}</button></div></div>
        </section>
        <div v-else class="empty">璇蜂粠宸︿晶閫夋嫨涓€鏉″緟瀹℃牳鍐呭銆?/div>
      </section>

      <section v-else-if="activeTab === 'pages'" class="workspace-grid page-editing-layout" aria-label="椤甸潰鍐呭缂栬緫">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">椤甸潰鍐呭</p><h3>椤甸潰</h3></div><strong>{{ pages.length }}</strong></div>
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
          <p v-if="!pages.length" class="empty compact">褰撳墠璐﹀彿娌℃湁鍙鍙栫殑椤甸潰璁板綍銆?/p>
        </aside>

        <form v-if="pageDraft" class="editor-form" @submit.prevent="savePage">
          <div class="form-heading">
            <div><p class="eyebrow">椤甸潰淇℃伅</p><h3>{{ pageDisplayName(pageDraft) }}</h3></div>
            <span class="status" :data-status="pageDraft.status">{{ statusLabel(pageDraft.status) }}</span>
          </div>
          <p v-if="!canEdit(pageDraft)" class="read-only-note">姝よ褰曞凡褰掓。锛屼笉鑳界洿鎺ヤ慨鏀广€?/p>

          <div class="field-grid">
            <label class="full">椤甸潰鏍囬<input v-model.trim="pageDraft.title" :disabled="!canEdit(pageDraft)" required maxlength="160"><small class="field-help">璁垮鐪嬪埌鐨勯〉闈富鏍囬锛屽缓璁畝鐭€佹槑纭€?/small></label>
          </div>

          <details class="advanced-fields">
            <summary>楂樼骇璁剧疆锛堜竴鑸棤闇€淇敼锛?/summary>
            <div class="field-grid">
              <label>椤甸潰鍦板潃鏍囪瘑<input v-model.trim="pageDraft.slug" :disabled="!canEdit(pageDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"><small class="field-help">鐢ㄤ簬鐢熸垚缃戝潃锛屼緥濡傦細about銆乸roduct銆?/small></label>
              <label>椤甸潰璇█<select v-model="pageDraft.language" :disabled="!canEdit(pageDraft)"><option value="zh-CN">绠€浣撲腑鏂?/option><option value="en">鑻辨枃</option></select></label>
              <label class="full">鏉ユ簮璁板綍<input :value="pageDraft.source_document || '鏈～鍐?" disabled></label>
            </div>
          </details>

          <section class="section-editor" aria-labelledby="section-copy-title">
            <div v-if="pageDraft.slug === 'home' && homepageSections.length" class="section-heading-actions" aria-label="棣栭〉鐙珛鍖哄潡">
              <button v-for="record in homepageSections" :key="record.id" type="button" @click="openHomepageSection(record)">缂栬緫鐙珛鍖哄潡锛歿{ record.title || record.section_key }}</button>
            </div>
            <div class="section-heading"><div><p class="eyebrow">{{ activePageSectionKey ? '褰撳墠缂栬緫鍖哄潡' : '椤甸潰娈佃惤' }}</p><h4 id="section-copy-title">{{ activePageSectionLabel }}</h4></div><div class="section-heading-actions"><button v-if="pageDraft.slug === 'home'" type="button" :disabled="!canEdit(pageDraft)" @click="addHomeReasonSection">鏂板棣栭〉鐞嗙敱</button><button v-if="supportedPageSectionSlugs.has(pageDraft.slug)" type="button" :disabled="!canEdit(pageDraft)" @click="addRequiredPageSections">琛ラ綈鏈〉鍏ㄩ儴鏍忕洰</button><button v-if="pageSectionTypeOptions.length" type="button" :disabled="!canEdit(pageDraft)" @click="openSectionLibrary">娣诲姞鍖哄潡</button><button v-if="canPastePageSection" type="button" :disabled="!canEdit(pageDraft)" @click="pastePageSection">绮樿创鍖哄潡</button><p v-else-if="supportedPageSectionSlugs.has(pageDraft.slug)" class="form-help">姝ゆ爮鐩殏鏈紑鏀鹃€氱敤鍖哄潡娣诲姞锛涘彲浠ヤ娇鐢ㄢ€滆ˉ榻愭湰椤靛叏閮ㄦ爮鐩€濈鐞嗘ā鏉垮畾涔夌殑鏍忕洰銆?/p></div></div>
            <nav v-if="sectionOutline.length > 1" class="section-outline" aria-label="鏈〉鍖哄潡澶х翰">
              <details open>
                <summary>鏈〉鍖哄潡澶х翰锛坽{ sectionOutline.length }}锛?/summary>
                <ol>
                  <li v-for="(entry, entryIndex) in sectionOutline" :key="entry.id">
                    <button type="button" :class="{ active: activePageSectionKey === entry.id }" @click="focusPageSection(entry.id)">
                      <span class="outline-index">{{ entryIndex + 1 }}</span>
                      <span class="outline-label">{{ entry.label }}</span>
                      <span class="outline-kind">{{ entry.kind }}</span>
                      <span v-if="entry.hidden" class="review-badge">宸查殣钘?/span>
                    </button>
                  </li>
                </ol>
              </details>
            </nav>
            <article v-for="(section, index) in visiblePageSections" :key="`${section.id}-${index}`" :data-section-key="section.id" class="section-card" :class="{ 'dragging-section': draggingPageSectionKey === section.id }" :draggable="canEdit(pageDraft) && !!section.type" @focusin="activePageSectionKey = section.id" @pointerdown="activePageSectionKey = section.id" @dragstart="handleSectionDragStart(section, $event)" @dragover.prevent @drop="handleSectionDrop(section)" @dragend="draggingPageSectionKey = ''">
              <div class="section-card-heading"><strong>{{ pageSectionName(section, index) }}</strong><div><span v-if="section.requires_claim_review" class="review-badge">瀹ｄ紶涓诲紶寰呭鏍?/span><span v-if="section.type && section.enabled === false" class="review-badge">宸查殣钘?/span><button v-if="section.type" type="button" class="text-action" :disabled="!canEdit(pageDraft)" @click="toggleRegisteredPageSection(section)">{{ section.enabled === false ? '鏄剧ず' : '闅愯棌' }}</button><button v-if="section.type" type="button" class="text-action" :disabled="!canEdit(pageDraft)" @click="duplicatePageSection(section)">澶嶅埗</button><button v-if="section.type" type="button" class="text-action" :disabled="!canEdit(pageDraft)" @click="copyPageSectionForReuse(section)">澶嶅埗鍒板叾浠栭〉</button><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft) || pageDraft.sections.length < 2" @click="removePageSection(section)">鍒犻櫎</button></div></div>
              <div class="field-grid section-fields">
                <template v-if="section.type">
                  <div v-if="registeredPageSectionPresets(section).length" class="section-preset-row">
                    <label>濂楃敤棰勮<select v-model="sectionPresetSelection[section.id]" :disabled="!canEdit(pageDraft)"><option value="">閫夋嫨棰勮</option><option v-for="preset in registeredPageSectionPresets(section)" :key="preset.key" :value="preset.key">{{ preset.label }}</option></select></label>
                    <button type="button" :disabled="!canEdit(pageDraft) || !sectionPresetSelection[section.id]" @click="applyRegisteredSectionPreset(section)">濂楃敤</button>
                    <span class="form-help">{{ sectionPresetDescription(section) }}</span>
                  </div>
                  <template v-for="field in registeredPageSectionFields(section)" :key="field.key">
                    <label v-if="field.type === 'text' || field.type === 'textarea'" :class="{ full: field.type === 'textarea' }">{{ field.label }}<textarea v-if="field.type === 'textarea'" v-model="section[field.key]" :disabled="!canEdit(pageDraft)" :maxlength="field.maxLength" rows="4" @input="pushPageDraftToPreview"></textarea><input v-else v-model.trim="section[field.key]" :disabled="!canEdit(pageDraft)" :maxlength="field.maxLength" @input="pushPageDraftToPreview"></label>
                    <label v-else-if="field.type === 'select'">{{ field.label }}<select v-model="section[field.key]" :disabled="!canEdit(pageDraft)" @change="pushPageDraftToPreview"><option v-for="option in field.options" :key="option" :value="option">{{ sectionSelectOptionLabel(field, option) }}</option></select></label>
                    <label v-else-if="field.type === 'number'">{{ field.label }}<input v-model.number="section[field.key]" type="number" :min="field.min" :max="field.max" :disabled="!canEdit(pageDraft)" @input="pushPageDraftToPreview"></label>
                    <section v-else-if="field.type === 'media'" class="media-reference-editor full-field" :aria-label="`${field.label}鍙楁帶绱犳潗`">
                      <div class="section-card-heading"><strong>{{ field.label }}</strong><span>{{ (section[field.key] || []).length }} / {{ field.maxItems }}</span></div>
                      <div class="media-reference-add"><select v-model="pageMediaSelection" :disabled="!canEdit(pageDraft)"><option value="">閫夋嫨{{ pageMediaScopeLabel() }}绱犳潗</option><option v-for="asset in pageMediaOptionsForSection(pageMediaScope(), section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, pageMediaScope()) }}</option></select><button type="button" :disabled="!canEdit(pageDraft) || !pageMediaSelection" @click="addRegisteredSectionMedia(section, field)">娣诲姞绱犳潗</button></div>
                      <p v-if="!pageMediaOptionsForSection(pageMediaScope(), section).length" class="form-help">鏆傛棤鍙敤浜庢鍖哄潡鐨剓{ pageMediaScopeLabel() }}绱犳潗銆傝鍏堝湪鈥滄洿澶氬伐鍏?- 濯掍綋璧勪骇鈥濅笂浼犮€?/p>
                      <div v-for="reference in section[field.key] || []" :key="reference.media_asset_id" class="media-reference-row"><span>{{ pageMediaLabel(reference) }}</span><label>灞曠ず浣嶇疆<input v-model.trim="reference.role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="渚嬪锛歩mage銆乧ard-1"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeRegisteredSectionMedia(section, field, reference.media_asset_id)">绉婚櫎</button></div>
                    </section>
                    <section v-else-if="field.type === 'list'" class="service-items-editor generic-items-editor full-field" :aria-label="`${field.label}鍒楄〃`">
                      <div class="section-card-heading"><strong>{{ field.label }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addRegisteredSectionItem(section, field)">鏂板涓€椤?/button></div>
                      <div v-for="(item, itemIndex) in section[field.key] || []" :key="`${section.id}-${field.key}-${itemIndex}`" class="service-item-card">
                        <div class="section-card-heading"><strong>绗?{{ itemIndex + 1 }} 椤?/strong><div><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === 0" @click="moveRegisteredSectionItem(section, field, itemIndex, -1)">涓婄Щ</button><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === (section[field.key] || []).length - 1" @click="moveRegisteredSectionItem(section, field, itemIndex, 1)">涓嬬Щ</button><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeRegisteredSectionItem(section, field, itemIndex)">鍒犻櫎</button></div></div>
                        <label v-for="itemField in field.itemFields" :key="itemField.key" :class="{ full: itemField.type === 'textarea' }">{{ itemField.label }}<textarea v-if="itemField.type === 'textarea'" v-model="item[itemField.key]" :disabled="!canEdit(pageDraft)" :maxlength="itemField.maxLength" rows="3" @input="pushPageDraftToPreview"></textarea><input v-else v-model.trim="item[itemField.key]" :disabled="!canEdit(pageDraft)" :maxlength="itemField.maxLength" @input="pushPageDraftToPreview"></label>
                      </div>
                    </section>
                  </template>
                  <p v-if="!registeredPageSectionFields(section).length" class="read-only-note full">姝ゅ尯鍧楃被鍨嬫病鏈夊彲缂栬緫瀛楁瀹氫箟锛屾棤娉曚繚瀛樸€?/p>
                </template>
                <template v-else>
              <label v-if="sectionTitleIsRendered(section)" class="full">{{ isHomeReasonSection(section) ? '棣栧睆鐞嗙敱鏍囬锛堢敾甯冩樉绀猴級' : '娈佃惤鏍囬' }}<input data-preview-field="title" :value="isHomeReasonSection(section) ? section.introTitle : section.title" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="渚嬪锛氭垜浠负浠€涔堝€煎緱淇¤禆" @input="updateSectionHeading(section, $event.target.value)"><small class="field-help">杩欎竴娈电殑閱掔洰鏍囬锛屼細鐩存帴鏄剧ず鍦ㄥ畼缃戦〉闈笂銆?/small></label>
              <p v-else class="read-only-note full">姝ゅ尯鍧楀綋鍓嶅畼缃戞病鏈夋爣棰樺睍绀轰綅锛屼慨鏀硅瀛楁涓嶄細鍑虹幇鍦ㄧ敾甯冧腑銆傝绠＄悊宸茬粦瀹氱殑浜у搧绯诲垪璁板綍锛涘闇€灞曠ず鏍囬锛屽繀椤诲厛鍦?Nuxt 妯℃澘涓柊澧炵粡纭鐨勭増寮忎綅缃€?/p>
              <label v-if="sectionBodyIsRendered(section)" class="full">姝ｆ枃<textarea data-preview-field="body" v-model="section.body" :disabled="!canEdit(pageDraft)" rows="5" maxlength="4000" placeholder="濉啓璁垮闇€瑕佷簡瑙ｇ殑鍐呭" @input="pushPageDraftToPreview"></textarea>
                  <small class="field-help">鏀寔鎹㈣锛屽缓璁竴娈靛彧琛ㄨ揪涓€涓噸鐐广€?/small>
                </label>
              <p v-else class="read-only-note full">姝ゅ尯鍧楀綋鍓嶅畼缃戞病鏈夋鏂囧睍绀轰綅锛屼慨鏀硅瀛楁涓嶄細鍑虹幇鍦ㄧ敾甯冧腑銆傝缂栬緫鏍囬鎴栧凡缁戝畾鐨勭悊鐢卞唴瀹癸紱濡傞渶灞曠ず姝ｆ枃锛屽繀椤诲厛鍦?Nuxt 妯℃澘涓柊澧炵粡纭鐨勭増寮忎綅缃€?/p>
                <template v-if="isHomeReasonSection(section)">
                  <label>鐞嗙敱鐭爣棰?input v-model.trim="section.shortTitle" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="渚嬪锛氬厛杩涙櫤閫? @input="pushPageDraftToPreview"></label>
                  <label>棣栧睆鐞嗙敱鏍囬<input v-model.trim="section.introTitle" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="棣栭〉涓夊ぇ鐞嗙敱涓殑鏍囬" @input="pushPageDraftToPreview"></label>
                  <label class="full">棣栧睆鐞嗙敱璇存槑<textarea v-model="section.introDetail" :disabled="!canEdit(pageDraft)" rows="3" maxlength="1000" placeholder="棣栭〉涓夊ぇ鐞嗙敱鍙充晶璇存槑" @input="pushPageDraftToPreview"></textarea></label>
                  <label>灞曠ず妯″紡<select v-model="section.mode" :disabled="!canEdit(pageDraft)" @change="pushPageDraftToPreview"><option value="machine">璁惧灞曠ず</option><option value="photo">鏁村箙鍥剧墖</option></select></label>
                  <p class="form-help full">鍥剧墖鍜屽浘鏍囪鍦ㄦ湰娈典笂鏂规坊鍔犲凡鍙戝竷绱犳潗锛屽苟灏嗗睍绀轰綅缃～鍐欎负 image銆乮con 鎴栧搴斿崱鐗囪鑹层€?/p>
                </template>
                <template v-if="pageDraft.slug === 'manufacturing' && ['precision-machining', 'sheet-metal'].includes(section.id)">
                  <label class="full">鏍稿績璁惧鎴栧尯鍩熻ˉ鍏呰鏄?textarea v-model="section.detail" :disabled="!canEdit(pageDraft)" rows="3" maxlength="2000" placeholder="渚嬪锛氭牳蹇冭澶囦笌宸ヨ壓璇存槑"></textarea></label>
                </template>
                <template v-if="pageDraft.slug === 'product' && ['proof-efficiency', 'proof-years', 'proof-champion'].includes(section.id)">
                  <label>灞曠ず鏁板€?input v-model.number="section.value" :disabled="!canEdit(pageDraft)" type="number" step="any" placeholder="鍙暀绌猴紝浠呬娇鐢ㄦ爣棰?></label>
                  <label>鏁板€煎崟浣?input v-model.trim="section.unit" :disabled="!canEdit(pageDraft)" maxlength="40" placeholder="渚嬪锛?銆乊EARS"></label>
                  <p class="form-help full">濉啓鏁板€煎悗瀹樼綉浼氭寜鍘熺増鍔ㄧ敾灞曠ず锛涚暀绌哄垯鏄剧ず娈佃惤鏍囬銆?/p>
                </template>
                <template v-if="pageDraft.slug === 'service' && section.id === 'hero'">
                  <label>鏍囬寮鸿皟鏂囧瓧<input v-model.trim="section.description" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="渚嬪锛氬揩浜轰竴姝?></label>
                  <label>鎸夐挳鏂囧瓧<input v-model.trim="section.label" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="渚嬪锛氬湪绾挎敮鎸?></label>
                </template>
                <template v-if="pageDraft.slug === 'service' && section.id === 'support'">
                  <label>鎼滅储妗嗘彁绀?input v-model.trim="section.description" :disabled="!canEdit(pageDraft)" maxlength="300"></label>
                  <label>鎼滅储鎸夐挳鏂囧瓧<input v-model.trim="section.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>浜哄伐鏀寔鎻愮ず<input v-model.trim="section.content.human_support_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>鍦ㄧ嚎鏈嶅姟鏍囬<input v-model.trim="section.content.online_title" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label>鍦ㄧ嚎鏈嶅姟璇存槑<input v-model.trim="section.content.online_intro" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>鍔╂墜鍝佺墝鏂囧瓧<input v-model.trim="section.content.assistant_brand" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>鍔╂墜涓绘爣棰?input v-model.trim="section.content.assistant_heading" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label class="full">鍔╂墜璇存槑<input v-model.trim="section.content.assistant_intro" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>鍔╂墜鎸夐挳鏂囧瓧<input v-model.trim="section.content.assistant_cta" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>鍔╂墜寮圭獥鏍囬<input v-model.trim="section.content.assistant_title" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label>寮圭獥鍏抽棴鏂囧瓧<input v-model.trim="section.content.assistant_close" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label class="full">鍔╂墜绌虹姸鎬佹枃瀛?input v-model.trim="section.content.assistant_empty" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>鍔犺浇涓彁绀?input v-model.trim="section.content.assistant_loading" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label>鍙戦€佹寜閽枃瀛?input v-model.trim="section.content.assistant_send" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>鏈夊府鍔╂寜閽?input v-model.trim="section.content.feedback_yes" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>闇€瑕佸崗鍔╂寜閽?input v-model.trim="section.content.feedback_no" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>璺宠浆纭鏍囬<input v-model.trim="section.content.exit_title" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                  <label class="full">璺宠浆纭璇存槑<input v-model.trim="section.content.exit_body" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label>鍙栨秷鎸夐挳鏂囧瓧<input v-model.trim="section.content.exit_cancel" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>缁х画鎸夐挳鏂囧瓧<input v-model.trim="section.content.exit_confirm" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label class="full">鍔╂墜寮圭獥涓庝氦浜掓枃妗?JSON<textarea v-model="section.content.assistant_copy_json" :disabled="!canEdit(pageDraft)" rows="5" maxlength="8000" placeholder="鍙€?JSON锛屼緥濡?{&quot;assistant_title&quot;:&quot;鏈嶅姟鍔╂墜&quot;,&quot;feedback_yes&quot;:&quot;鏈夊府鍔?quot;}"></textarea></label>
                </template>
                <template v-if="pageDraft.slug === 'service' && section.id === 'office-directory'">
                  <label>楂樺痉鍦板浘鏂囧瓧<input v-model.trim="section.content.map_amap_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>鐧惧害鍦板浘鏂囧瓧<input v-model.trim="section.content.map_baidu_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>绯荤粺鍦板浘鏂囧瓧<input v-model.trim="section.content.map_system_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>瀵艰埅寮圭獥鏍囬<input v-model.trim="section.content.map_dialog_title" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>瀵艰埅鐩殑鍦板墠缂€<input v-model.trim="section.content.map_dialog_destination" :disabled="!canEdit(pageDraft)" maxlength="80"></label>
                  <label>瀵艰埅鎸夐挳鏃犻殰纰嶆枃瀛?input v-model.trim="section.content.map_button_aria" :disabled="!canEdit(pageDraft)" maxlength="160"></label>
                </template>
                <template v-if="pageDraft.slug !== 'service' || !['hero', 'support'].includes(section.id)">
                  <label class="full">{{ sectionEmptyStateLabel(section) }}<input v-model.trim="section.description" :disabled="!canEdit(pageDraft)" maxlength="500" placeholder="鍙暀绌?></label>
                  <p v-if="sectionEmptyStateIsHiddenByRecords(section)" class="read-only-note full">褰撳墠宸叉湁鍔ㄦ€佹柊闂昏褰曪紝绌虹姸鎬佽鏄庝笉浼氬嚭鐜板湪瀹樼綉鐢诲竷涓€?/p>
                  <label>鎸夐挳鏂囧瓧<input v-model.trim="section.label" :disabled="!canEdit(pageDraft)" maxlength="24" placeholder="鍙暀绌?></label>
                  <label>鎸夐挳閾炬帴<input v-model.trim="section.href" :disabled="!canEdit(pageDraft)" maxlength="1000" placeholder="渚嬪锛?contact"></label>
                </template>
                </template>
              </div>
              <details class="advanced-fields section-presentation-editor" open>
                <summary>鐗堝紡銆佷綅缃笌鏂囧瓧鏍峰紡</summary>
                <p class="form-help">榛樿鍏ㄩ儴娌跨敤瀹樼綉鍘熺増銆傚彧鏈夊紑鍚搴斿垎缁勫悗锛岃缁勮缃墠浼氬奖鍝嶅畼缃戯紱涓嶆敮鎸佷换鎰?CSS 鎴栬嚜鐢辨嫋鍔ㄣ€?/p>
                <div class="presentation-enable-grid">
                  <label class="toggle-field"><input v-model="section.layout.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鍚敤鐗堝紡涓庝綅缃?/span></label>
                  <label class="toggle-field"><input v-model="section.text_style.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鍚敤鏂囧瓧鏍峰紡</span></label>
                  <label class="toggle-field"><input v-model="section.media_presentation.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鍚敤鍥剧墖瑁佸垏</span></label>
                  <label class="toggle-field"><input v-model="section.responsive.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鍚敤鍝嶅簲寮忔樉绀?/span></label>
                </div>
                <div class="field-grid">
                  <label>鐗堝紡妯℃澘<select v-model="section.layout.template" :disabled="!canEdit(pageDraft) || !section.layout.enabled"><option value="default">榛樿鐗堝紡</option><option value="overlay-left">濯掍綋涓婂乏渚ф枃瀛?/option><option value="overlay-center">濯掍綋涓婂眳涓枃瀛?/option><option value="overlay-right">濯掍綋涓婂彸渚ф枃瀛?/option><option value="split-media-left">宸﹀浘鍙虫枃</option><option value="split-media-right">宸︽枃鍙冲浘</option><option value="stack">涓婁笅鍫嗗彔</option><option value="grid">鍗＄墖缃戞牸</option><option value="gallery">鍥剧墖鐢诲粖</option><option value="timeline">鏃堕棿杞?/option><option value="process">宸ヨ壓娴佺▼</option></select></label>
                  <label>姘村钩瀵归綈<select v-model="section.layout.align_x" :disabled="!canEdit(pageDraft)"><option value="left">宸﹀榻?/option><option value="center">灞呬腑</option><option value="right">鍙冲榻?/option></select></label>
                  <label>鍨傜洿瀵归綈<select v-model="section.layout.align_y" :disabled="!canEdit(pageDraft)"><option value="top">椤堕儴</option><option value="center">灞呬腑</option><option value="bottom">搴曢儴</option></select></label>
                  <label>鍐呭瀹藉害<select v-model="section.layout.width" :disabled="!canEdit(pageDraft)"><option value="narrow">绐?/option><option value="normal">鏍囧噯</option><option value="wide">瀹?/option><option value="full">鍏ㄥ</option></select></label>
                  <label>鍐呭闂磋窛<select v-model="section.layout.gap" :disabled="!canEdit(pageDraft)"><option value="none">鏃?/option><option value="small">灏?/option><option value="medium">涓?/option><option value="large">澶?/option></select></label>
                  <label>闃呰椤哄簭<input v-model.number="section.layout.order" :disabled="!canEdit(pageDraft)" type="number" min="0" max="999"></label>
                  <label>灞傜骇<input v-model.number="section.layout.z_index" :disabled="!canEdit(pageDraft)" type="number" min="0" max="9"></label>
                  <label>妗岄潰妯悜鍋忕Щ锛?锛?input v-model.number="section.layout.desktop.offset_x" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                  <label>妗岄潰绾靛悜鍋忕Щ锛?锛?input v-model.number="section.layout.desktop.offset_y" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                  <label>鎵嬫満妯悜鍋忕Щ锛?锛?input v-model.number="section.layout.mobile.offset_x" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                  <label>鎵嬫満绾靛悜鍋忕Щ锛?锛?input v-model.number="section.layout.mobile.offset_y" :disabled="!canEdit(pageDraft)" type="number" min="-30" max="30" step="1"></label>
                </div>
                <div class="field-grid">
                  <label>鏂囧瓧鏍峰紡<select v-model="section.text_style.preset" :disabled="!canEdit(pageDraft)"><option value="inherit">娌跨敤椤甸潰</option><option value="hero">棣栧睆涓绘爣棰?/option><option value="section-title">鍖哄潡鏍囬</option><option value="body">姝ｆ枃</option><option value="data">骞翠唤/鏁版嵁</option><option value="card-title">鍗＄墖鏍囬</option><option value="caption">鍥炬敞</option><option value="button">鎸夐挳</option></select></label>
                  <label>瀛楅噸<select v-model.number="section.text_style.weight" :disabled="!canEdit(pageDraft)"><option :value="300">缁?/option><option :value="400">甯歌</option><option :value="500">涓瓑</option><option :value="700">绮?/option><option :value="800">鐗圭矖</option></select></label>
                  <label>妗岄潰瀛楀彿锛? 涓烘部鐢級<input v-model.number="section.text_style.size_desktop" :disabled="!canEdit(pageDraft)" type="number" min="0" max="120"></label>
                  <label>鎵嬫満瀛楀彿锛? 涓烘部鐢級<input v-model.number="section.text_style.size_mobile" :disabled="!canEdit(pageDraft)" type="number" min="0" max="72"></label>
                  <label>琛岄珮<input v-model.number="section.text_style.line_height" :disabled="!canEdit(pageDraft)" type="number" min="1" max="2.2" step="0.05"></label>
                  <label>鏂囧瓧鏈€澶у搴?select v-model="section.text_style.max_width" :disabled="!canEdit(pageDraft)"><option value="narrow">绐?/option><option value="normal">鏍囧噯</option><option value="wide">瀹?/option><option value="full">鍏ㄥ</option></select></label>
                  <label>鏂囧瓧棰滆壊<input v-model.trim="section.text_style.color" :disabled="!canEdit(pageDraft)" pattern="#[0-9a-fA-F]{6}" placeholder="#FFFFFF"></label>
                </div>
                <div class="field-grid">
                  <label>鍥剧墖閫傞厤<select v-model="section.media_presentation.fit" :disabled="!canEdit(pageDraft)"><option value="cover">閾烘弧骞惰鍒?/option><option value="contain">瀹屾暣鏄剧ず</option></select></label>
                  <label>鍥剧墖妯悜鐒︾偣锛?锛?input v-model.number="section.media_presentation.focal_x" :disabled="!canEdit(pageDraft)" type="number" min="0" max="100"></label>
                  <label>鍥剧墖绾靛悜鐒︾偣锛?锛?input v-model.number="section.media_presentation.focal_y" :disabled="!canEdit(pageDraft)" type="number" min="0" max="100"></label>
                  <label>濯掍綋閬僵<select v-model="section.media_presentation.overlay" :disabled="!canEdit(pageDraft)"><option value="none">鏃?/option><option value="dark-15">娣辫壊 15%</option><option value="dark-30">娣辫壊 30%</option><option value="dark-50">娣辫壊 50%</option><option value="light-15">娴呰壊 15%</option></select></label>
                  <label class="toggle-field"><input v-model="section.responsive.desktop_visible" :disabled="!canEdit(pageDraft)" type="checkbox"><span>妗岄潰鏄剧ず</span></label>
                  <label class="toggle-field"><input v-model="section.responsive.tablet_visible" :disabled="!canEdit(pageDraft)" type="checkbox"><span>骞虫澘鏄剧ず</span></label>
                  <label class="toggle-field"><input v-model="section.responsive.mobile_visible" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鎵嬫満鏄剧ず</span></label>
                  <label>鎵嬫満鐗堝紡<select v-model="section.responsive.mobile_template" :disabled="!canEdit(pageDraft)"><option value="inherit">娌跨敤妗岄潰</option><option value="stack">涓婁笅鍫嗗彔</option><option value="grid">鍗＄墖缃戞牸</option><option value="gallery">鍥剧墖鐢诲粖</option><option value="timeline">鏃堕棿杞?/option><option value="process">宸ヨ壓娴佺▼</option></select></label>
                </div>
              </details>
              <section v-if="isHomeHeroSection(section)" class="home-hero-video-editor" aria-label="棣栭〉棣栧睆瑙嗛">
                <div class="section-card-heading"><strong>棣栭〉棣栧睆瑙嗛</strong><span>{{ section.hero_video_asset_id ? '宸查€夋嫨' : '娌跨敤瀹樼綉鍘熻棰? }}</span></div>
                <label>瑙嗛绱犳潗<select :value="section.hero_video_asset_id || ''" :disabled="!canEdit(pageDraft)" @change="setHomeHeroVideo(section, $event.target.value)"><option value="">娌跨敤瀹樼綉鍘熼灞忚棰?/option><option v-for="asset in homeHeroVideoOptionsForSection(section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, 'homepage') }}</option></select></label>
                <p class="form-help">浠呮樉绀虹櫥璁颁负鈥滈椤甸灞忚棰戔€濈殑绱犳潗銆傛湭鍙戝竷瑙嗛鍙湪宸茬櫥褰曞悗鍙扮殑瀹炴椂棰勮涓樉绀猴紝鍙戝竷鍚庢墠浼氭浛鎹㈠叕寮€瀹樼綉銆?/p>
              </section>
              <section v-if="isNewsHeroSection(section)" class="home-hero-video-editor" aria-label="瑙嗛鏂伴椈棣栧睆瑙嗛">
                <div class="section-card-heading"><strong>瑙嗛鏂伴椈棣栧睆瑙嗛</strong><span>{{ newsHeroVideoAssetId(section) ? '宸查€夋嫨' : '娌跨敤瀹樼綉鍘熻棰? }}</span></div>
                <label>瑙嗛绱犳潗<select :value="newsHeroVideoAssetId(section)" :disabled="!canEdit(pageDraft)" @change="setNewsHeroVideo(section, $event.target.value)"><option value="">娌跨敤瀹樼綉鍘熼灞忚棰?/option><option v-for="asset in newsHeroVideoOptionsForSection(section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, 'article') }}</option></select></label>
                <p class="form-help">浠呮樉绀虹櫥璁颁负鈥滆棰戞柊闂婚灞忊€濈殑瑙嗛銆傛湭鍙戝竷瑙嗛鍙湪宸茬櫥褰曞悗鍙扮殑瀹炴椂棰勮涓樉绀猴紝鍙戝竷鍚庢墠浼氭浛鎹㈠叕寮€瀹樼綉銆?/p>
              </section>
              <section v-if="!section.type" class="media-reference-editor" :aria-label="`${section.title || '椤甸潰娈佃惤'}鍥剧墖`">
                <div class="section-card-heading"><strong>鍥剧墖涓庤儗鏅?/strong><span>{{ section.media.length }}</span></div>
                <div class="media-reference-add"><select v-model="pageMediaSelection" :disabled="!canEdit(pageDraft)"><option value="">閫夋嫨{{ pageMediaScopeLabel() }}绱犳潗</option><option v-for="asset in pageMediaOptionsForSection(pageMediaScope(), section)" :key="asset.id" :value="String(asset.id)">{{ pageMediaOptionLabel(asset, pageMediaScope()) }}</option></select><button type="button" :disabled="!canEdit(pageDraft) || !pageMediaSelection" @click="addPageMedia(section)">娣诲姞绱犳潗</button></div>
                <p v-if="!pageMediaOptionsForSection(pageMediaScope(), section).length" class="form-help">鏆傛棤鍙敤浜庢鍖哄潡鐨剓{ pageMediaScopeLabel() }}绱犳潗銆傝鍏堝湪鈥滄洿澶氬伐鍏?- 濯掍綋璧勪骇鈥濅笂浼狅紱鑽夌绱犳潗蹇呴』濉啓褰撳墠椤甸潰鍜屾钀斤紝涓斿彧渚涘綋鍓嶅唴閮ㄩ瑙堜娇鐢ㄣ€?/p>
                <p v-if="isHomeHeroSection(section)" class="form-help">棣栧睆瑙嗛鐨勪袱寮犻潤鎬佸浘涔熷湪杩欓噷缁戝畾锛氥€岃棰戞捣鎶ャ€嶅睍绀轰綅缃～ <strong>poster</strong>锛屻€岀粨鏉熼潤甯с€嶅～ <strong>end-frame</strong>銆傛湭缁戝畾鏃剁敾甯冧笂鍙兘鏌ョ湅銆佷笉鑳芥浛鎹€?/p>
                <div v-for="reference in section.media" :key="reference.media_asset_id" class="media-reference-row"><span>{{ pageMediaLabel(reference) }}</span><label v-if="section.id === 'hero' && pageDraft.slug === 'about'">鍥剧墖鐢ㄩ€?select v-model="reference.role" :disabled="!canEdit(pageDraft)"><option value="backdrop">棣栧睆鍏变韩鑳屾櫙</option><option value="background">棣栧睆鑳屾櫙鍥惧眰</option><option value="foreground">棣栧睆鏈哄櫒鍓嶆櫙</option></select></label><label v-else>灞曠ず浣嶇疆<input v-model.trim="reference.role" :disabled="!canEdit(pageDraft)" maxlength="60" :placeholder="isHomeHeroSection(section) ? '渚嬪锛歱oster銆乪nd-frame' : '渚嬪锛歜ackground銆乧ard-1銆乿ideo銆乮con-1'"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removePageMedia(section, reference.media_asset_id)">绉婚櫎</button></div>
              </section>
              <section v-if="!section.type && pageDraft.slug === 'service' && ['hero', 'support-models', 'support-actions', 'office-directory'].includes(section.id)" class="service-items-editor">
                <div class="section-card-heading"><strong>{{ section.id === 'hero' ? '棣栧睆璇存槑鏂囧瓧' : section.id === 'support-models' ? '璁惧鍨嬪彿鍗＄墖' : section.id === 'support-actions' ? '鏈嶅姟鍏ュ彛鍗＄墖' : '鍖哄煙涓庣洿灞炲姙浜嬪' }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addServiceItem(section, section.id === 'support-models' ? 'model' : section.id === 'support-actions' ? 'action' : section.id === 'office-directory' ? 'office' : 'copy')">鏂板</button></div>
                <div v-for="(item, itemIndex) in section.items || []" :key="`${section.id}-${itemIndex}`" class="service-item-card">
                  <template v-if="section.id === 'hero'"><label>璇存槑鏂囧瓧<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="160"></label></template>
                  <template v-else-if="section.id === 'support-models'"><label>鍨嬪彿鍚嶇О<input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>鍥剧墖浣嶇疆<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="渚嬪锛歮odel-1"></label></template>
                  <template v-else-if="section.id === 'support-actions'"><label>缂栧彿<input v-model.trim="item.number" :disabled="!canEdit(pageDraft)" maxlength="8" placeholder="01 鑷?10"></label><label>鎸夐挳鏂囧瓧<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label class="full">鎸夐挳涓嬫柟璇存槑<input v-model.trim="item.description" :disabled="!canEdit(pageDraft)" maxlength="300"></label><label>鐐瑰嚮鍚庡挩璇㈠唴瀹?input v-model.trim="item.body" :disabled="!canEdit(pageDraft)" maxlength="240"></label><label>鍥炬浣嶇疆<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="渚嬪锛歛ction-1"></label></template>
                  <template v-else><label>鍖哄煙鍚嶇О<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>鍖哄煙鍥剧墖浣嶇疆<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="渚嬪锛歰ffice-1"></label><label>鍦板浘鍥剧墖浣嶇疆<input v-model.trim="item.map_media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="渚嬪锛歰ffice-map-1"></label><div v-for="(office, officeIndex) in item.offices || []" :key="officeIndex" class="office-inline-fields"><label>闂ㄥ簵鍦板潃<input v-model.trim="office.address" :disabled="!canEdit(pageDraft)" maxlength="500"></label><label>璐熻矗浜?input v-model.trim="office.manager" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>鑱旂郴鐢佃瘽<input v-model.trim="office.phone" :disabled="!canEdit(pageDraft)" maxlength="80"></label><button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeOffice(section, itemIndex, officeIndex)">鍒犻櫎闂ㄥ簵</button></div><button type="button" :disabled="!canEdit(pageDraft)" @click="addOffice(section, itemIndex)">鏂板闂ㄥ簵</button></template>
                  <button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeServiceItem(section, itemIndex)">鍒犻櫎</button>
                </div>
              </section>
              <section v-else-if="!section.type" class="service-items-editor generic-items-editor">
                <div class="section-card-heading"><strong>{{ pageDraft.slug === 'manufacturing' && section.id === 'process' ? '鍒堕€犲伐鑹鸿妭鐐? : '閲嶅鍐呭锛堝崱鐗囥€佽妭鐐规垨鍒楄〃锛? }}</strong><button type="button" :disabled="!canEdit(pageDraft)" @click="addGenericSectionItem(section)">{{ pageDraft.slug === 'manufacturing' && section.id === 'process' ? '鏂板宸ヨ壓鑺傜偣' : '鏂板涓€椤? }}</button></div>
                <p class="form-help">{{ pageDraft.slug === 'manufacturing' && section.id === 'process' ? '姣忛」閮藉搴斿伐鑹虹敾甯冧腑鐨勪竴涓浐瀹氫綅缃€傚彲缁存姢鏍囬銆佽鏄庛€佽繛鎺ヨ鏄庡拰椤哄簭锛涚礌鏉愪粛椤诲湪涓婃柟閫氳繃鍙楁帶濯掍綋娴佺▼娣诲姞銆? : '鍙敤浜庝笁澶х悊鐢便€侀椤垫í绉诲浘鏂囥€佸伐鑹鸿妭鐐广€佸弬鏁拌鏄庡拰鐢诲粖椤圭洰銆傞椤电殑鈥渕arquee鈥濇钀藉氨鏄í绉诲浘鏂囷紱椤圭洰鍥剧墖璇峰湪涓婃柟娣诲姞绱犳潗锛屽苟濉啓鐩稿悓鐨勨€滃睍绀轰綅缃€濄€? }}</p>
                <div v-for="(item, itemIndex) in section.items || []" :key="`${section.id}-generic-${itemIndex}`" class="service-item-card">
                  <div class="section-card-heading"><strong>绗?{{ itemIndex + 1 }} 椤?/strong><div><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === 0" @click="moveGenericSectionItem(section, itemIndex, -1)">涓婄Щ</button><button type="button" class="text-action" :disabled="!canEdit(pageDraft) || itemIndex === section.items.length - 1" @click="moveGenericSectionItem(section, itemIndex, 1)">涓嬬Щ</button></div></div>
                  <label>鐭爣棰?input v-model.trim="item.label" :disabled="!canEdit(pageDraft)" maxlength="120"></label>
                  <label>鏍囬<input v-model.trim="item.title" :disabled="!canEdit(pageDraft)" maxlength="240"></label>
                  <label class="full">姝ｆ枃<textarea v-model="item.body" :disabled="!canEdit(pageDraft)" rows="3" maxlength="4000"></textarea></label>
                  <label class="full">琛ュ厖璇存槑<input v-model.trim="item.description" :disabled="!canEdit(pageDraft)" maxlength="500"></label>
                  <label v-if="pageDraft.slug === 'manufacturing' && section.id === 'process'">杩炴帴璇存槑<input v-model.trim="item.connection_label" :disabled="!canEdit(pageDraft)" maxlength="160" placeholder="宸ヨ壓鑺傜偣涔嬮棿鐨勮鏄庢枃瀛?></label>
                  <label>濯掍綋灞曠ず浣嶇疆<input v-model.trim="item.media_role" :disabled="!canEdit(pageDraft)" maxlength="60" placeholder="渚嬪锛歝ard-1銆乶ode-2"></label>
                  <label>鍥剧墖鏇夸唬鏂囧瓧<input v-model.trim="item.alt" :disabled="!canEdit(pageDraft)" maxlength="240" placeholder="璇存槑鍥剧墖涓彲瑙佺殑鍐呭"></label>
                  <label v-if="pageDraft.slug === 'manufacturing' && section.id === 'process'">宸ヨ壓鐢诲竷浣嶇疆<select v-model="item.anchor" :disabled="!canEdit(pageDraft)"><option value="auto">鎸夐『搴忚嚜鍔?/option><option value="top-left">宸︿笂</option><option value="top-center">涓婁腑</option><option value="top-right">鍙充笂</option><option value="bottom-left">宸︿笅</option><option value="bottom-center">涓嬩腑</option><option value="bottom-right">鍙充笅</option></select></label>
                  <label>閾炬帴<input v-model.trim="item.href" :disabled="!canEdit(pageDraft)" maxlength="1000" placeholder="渚嬪锛?product"></label>
                  <details class="advanced-fields item-presentation-editor">
                    <summary>鏈」浣嶇疆涓庢枃瀛楁牱寮?/summary>
                    <div class="presentation-enable-grid"><label class="toggle-field"><input v-model="item.layout.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>浣嶇疆</span></label><label class="toggle-field"><input v-model="item.text_style.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鏂囧瓧</span></label><label class="toggle-field"><input v-model="item.media_presentation.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鍥剧墖</span></label><label class="toggle-field"><input v-model="item.responsive.enabled" :disabled="!canEdit(pageDraft)" type="checkbox"><span>鍝嶅簲寮?/span></label></div>
                    <div class="field-grid"><label>姘村钩瀵归綈<select v-model="item.layout.align_x" :disabled="!canEdit(pageDraft) || !item.layout.enabled"><option value="left">宸?/option><option value="center">涓?/option><option value="right">鍙?/option></select></label><label>妗岄潰妯悜鍋忕Щ锛?锛?input v-model.number="item.layout.desktop.offset_x" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>妗岄潰绾靛悜鍋忕Щ锛?锛?input v-model.number="item.layout.desktop.offset_y" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>鎵嬫満妯悜鍋忕Щ锛?锛?input v-model.number="item.layout.mobile.offset_x" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>鎵嬫満绾靛悜鍋忕Щ锛?锛?input v-model.number="item.layout.mobile.offset_y" :disabled="!canEdit(pageDraft) || !item.layout.enabled" type="number" min="-30" max="30"></label><label>瀛楅噸<select v-model.number="item.text_style.weight" :disabled="!canEdit(pageDraft) || !item.text_style.enabled"><option :value="300">缁?/option><option :value="400">甯歌</option><option :value="500">涓瓑</option><option :value="700">绮?/option><option :value="800">鐗圭矖</option></select></label><label>妗岄潰瀛楀彿<input v-model.number="item.text_style.size_desktop" :disabled="!canEdit(pageDraft) || !item.text_style.enabled" type="number" min="0" max="120"></label><label>鎵嬫満瀛楀彿<input v-model.number="item.text_style.size_mobile" :disabled="!canEdit(pageDraft) || !item.text_style.enabled" type="number" min="0" max="72"></label><label>鏂囧瓧棰滆壊<input v-model.trim="item.text_style.color" :disabled="!canEdit(pageDraft) || !item.text_style.enabled" pattern="#[0-9a-fA-F]{6}" placeholder="#FFFFFF"></label><label>鍥剧墖閫傞厤<select v-model="item.media_presentation.fit" :disabled="!canEdit(pageDraft) || !item.media_presentation.enabled"><option value="cover">閾烘弧瑁佸垏</option><option value="contain">瀹屾暣鏄剧ず</option></select></label><label>妯悜鐒︾偣<input v-model.number="item.media_presentation.focal_x" :disabled="!canEdit(pageDraft) || !item.media_presentation.enabled" type="number" min="0" max="100"></label><label>绾靛悜鐒︾偣<input v-model.number="item.media_presentation.focal_y" :disabled="!canEdit(pageDraft) || !item.media_presentation.enabled" type="number" min="0" max="100"></label><label class="toggle-field"><input v-model="item.responsive.desktop_visible" :disabled="!canEdit(pageDraft) || !item.responsive.enabled" type="checkbox"><span>妗岄潰鏄剧ず</span></label><label class="toggle-field"><input v-model="item.responsive.mobile_visible" :disabled="!canEdit(pageDraft) || !item.responsive.enabled" type="checkbox"><span>鎵嬫満鏄剧ず</span></label></div>
                  </details>
                  <button type="button" class="text-action danger" :disabled="!canEdit(pageDraft)" @click="removeGenericSectionItem(section, itemIndex)">鍒犻櫎姝ら」</button>
                </div>
              </section>
              <section v-if="(pageDraft.slug === 'product' && section.id === 'pagination') || (pageDraft.slug === 'news' && ['dynamic-news', 'video-sharing'].includes(section.id)) || (pageDraft.slug === 'manufacturing' && section.id === 'core-equipment')" class="pagination-editor">
                <div class="section-card-heading"><strong>鍒嗛〉涓庡睍绀烘暟閲?/strong></div>
                <div class="field-grid"><label>姣忛〉鏁伴噺<input v-model.number="section.pagination.page_size" :disabled="!canEdit(pageDraft)" type="number" min="1" max="6"></label><label>鎺掑簭鏂瑰紡<select v-model="section.pagination.sort" :disabled="!canEdit(pageDraft)"><option value="manual">鎵嬪姩椤哄簭</option><option v-if="pageDraft.slug === 'news'" value="published_at_desc">鍙戝竷鏃ユ湡鍊掑簭</option><option value="sort_order_asc">鎺掑簭鏁板瓧鍗囧簭</option></select></label><label>涓婁竴椤垫枃瀛?input v-model.trim="section.pagination.previous_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label>涓嬩竴椤垫枃瀛?input v-model.trim="section.pagination.next_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label><label class="full">绌虹姸鎬佹枃瀛?input v-model.trim="section.pagination.empty_label" :disabled="!canEdit(pageDraft)" maxlength="120"></label></div>
                <p v-if="pageDraft.slug === 'news'" class="form-help">鏂伴椈鍜岃棰戝垎浜寜鍙戝竷鏃ユ湡鍊掑簭锛屾瘡椤垫渶澶?6 鏉°€?/p>
                <p v-else-if="pageDraft.slug === 'manufacturing'" class="form-help">绱犳潗搴撳瓨涓嶉檺鍒讹紱妗岄潰PSD鐢诲竷浠嶅彧鏄剧ず4涓叆鍙ｏ紝鍏朵綑绱犳潗鍙湪澶у浘娴忚涓户缁垏鎹€?/p>
              </section>
              <details class="advanced-fields section-advanced">
                <summary>娈佃惤楂樼骇璁剧疆锛堜竴鑸棤闇€淇敼锛?/summary>
                <div class="field-grid">
                  <label>娈佃惤鍐呴儴鏍囪瘑<input v-model.trim="section.id" :disabled="!canEdit(pageDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
                  <label>椤堕儴灏忔爣棰?input v-model.trim="section.kicker" :disabled="!canEdit(pageDraft)" maxlength="120" placeholder="鍙暀绌?></label>
                </div>
              </details>
            </article>

            <Teleport to="body">
              <div v-if="sectionLibraryOpen" class="section-library-overlay" @click.self="sectionLibraryOpen = false">
                <section class="section-library" role="dialog" aria-modal="true" aria-labelledby="section-library-title">
                  <header>
                    <div><p class="eyebrow">鍖哄潡搴?/p><h3 id="section-library-title">娣诲姞鍖哄潡</h3></div>
                    <button type="button" aria-label="鍏抽棴鍖哄潡搴? @click="sectionLibraryOpen = false">脳</button>
                  </header>
                  <div v-for="group in sectionLibraryGroups" :key="group.category" class="section-library-group">
                    <h4>{{ group.category }}</h4>
                    <button v-for="definition in group.definitions" :key="definition.type" type="button" :disabled="!canEdit(pageDraft)" @click="addLibrarySection(definition.type)">
                      <strong>{{ definition.label }}</strong>
                      <span>{{ definition.description }}</span>
                    </button>
                  </div>
                  <p v-if="!sectionLibraryGroups.length" class="form-help">褰撳墠椤甸潰鏆傛湭娉ㄥ唽鍙坊鍔犵殑鍖哄潡绫诲瀷銆?/p>
                </section>
              </div>
            </Teleport>
          </section>

          <section class="seo-editor" aria-labelledby="seo-title">
            <div><p class="eyebrow">鎼滅储浼樺寲</p><h4 id="seo-title">鎼滅储涓庡垎浜俊鎭?/h4></div>
            <div class="field-grid">
              <label>鎼滅储鏍囬<input v-model.trim="pageDraft.seo.title" :disabled="!canEdit(pageDraft)" maxlength="160" placeholder="鍙暀绌猴紝榛樿浣跨敤椤甸潰鏍囬"></label>
              <label>鍏抽敭璇?input v-model.trim="pageDraft.seo.keywords" :disabled="!canEdit(pageDraft)" maxlength="500" placeholder="浠ラ€楀彿鍒嗛殧"></label>
              <label class="full">鎼滅储鎻忚堪<textarea v-model="pageDraft.seo.description" :disabled="!canEdit(pageDraft)" rows="3" maxlength="500"></textarea></label>
            </div>
          </section>

          <div class="form-actions"><a :href="nativeItemPath('pages', pageDraft.id)">鎵撳紑楂樼骇璁剧疆鏌ョ湅瀹屾暣瀛楁</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(pageDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨椤甸潰鑽夌' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨涓€鏉￠〉闈㈣褰曘€?/div>
      </section>

      <section v-else-if="activeTab === 'series'" class="workspace-grid" aria-label="浜у搧绯诲垪缂栬緫">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">浜у搧绯诲垪</p><h3>浜у搧绯诲垪</h3></div><strong>{{ series.length }}</strong></div>
          <button v-for="record in series" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedSeriesId }" @click="selectSeries(record.id)"><span>{{ record.name || record.series_code }}</span><small>{{ record.series_code }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!series.length" class="empty compact">褰撳墠璐﹀彿娌℃湁鍙鍙栫殑浜у搧绯诲垪銆?/p>
        </aside>

        <form v-if="seriesDraft" class="editor-form" @submit.prevent="saveSeries">
          <div class="form-heading"><div><p class="eyebrow">绯诲垪淇℃伅</p><h3>{{ seriesDraft.name || '鏈懡鍚嶇郴鍒? }}</h3></div><span class="status" :data-status="seriesDraft.status">{{ statusLabel(seriesDraft.status) }}</span></div>
          <p v-if="!canEdit(seriesDraft)" class="read-only-note">璇ョ郴鍒楃洰鍓嶄笉鍙洿鎺ョ紪杈戙€?/p>
          <div class="field-grid">
            <label>绯诲垪鍚嶇О<input v-model.trim="seriesDraft.name" :disabled="!canEdit(seriesDraft)" required maxlength="160"></label>
            <label>绯诲垪缂栫爜<input v-model.trim="seriesDraft.series_code" :disabled="!canEdit(seriesDraft)" required maxlength="80"></label>
            <label>璁块棶鏍囪瘑<input v-model.trim="seriesDraft.slug" :disabled="!canEdit(seriesDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>鎺掑簭<input v-model.number="seriesDraft.sort_order" :disabled="!canEdit(seriesDraft)" type="number" min="0" step="1"></label>
            <label>鍙楁帶绯诲垪灏侀潰<select v-model="seriesDraft.cover_asset" :disabled="!canEdit(seriesDraft)"><option value="">灏氭湭閫夋嫨</option><option v-if="seriesDraft.cover_asset && !isReviewedMediaAsset(seriesDraft.cover_asset, 'product')" :value="seriesDraft.cover_asset">褰撳墠寮曠敤 {{ seriesDraft.cover_asset }}锛堝皻鏈€氳繃閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in editableMediaAssetsForPlacement('product', 'product.series.cover', 'image')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!editableMediaAssetsForPlacement('product', 'product.series.cover', 'image').length" class="form-help full">鏆傛棤鍙敤鐨勭郴鍒楀皝闈㈢礌鏉愩€傝鍏堢櫥璁扮敤閫斾负 product.series.cover 鐨勫獟浣擄紱灏哄鍥句笉浼氫綔涓虹郴鍒楀皝闈㈠€欓€夈€?/p>
            <label class="full">瀹氫綅璇存槑<textarea v-model="seriesDraft.positioning" :disabled="!canEdit(seriesDraft)" rows="3" maxlength="2000"></textarea></label>
            <label>搴旂敤鍦烘櫙锛堟瘡琛屼竴椤癸級<textarea v-model="seriesDraft.scenariosText" :disabled="!canEdit(seriesDraft)" rows="5" maxlength="3000" placeholder="渚嬪锛氱簿瀵嗛浂浠跺姞宸?></textarea></label>
            <label>鏍稿績鑳藉姏锛堟瘡琛屼竴椤癸級<textarea v-model="seriesDraft.capabilitiesText" :disabled="!canEdit(seriesDraft)" rows="5" maxlength="3000" placeholder="渚嬪锛氳嚜鍔ㄧ┛涓?></textarea></label>
          </div>
          <section v-if="seriesSupportsDetail" class="section-editor" aria-labelledby="series-detail-title">
            <div class="section-heading"><div><p class="eyebrow">璇︽儏棣栧睆</p><h4 id="series-detail-title">绯诲垪璇︽儏锛堟柟妗堝瀷绯诲垪锛?/h4><p>鐏靛姩鍒囧壊宸ヤ綔绔欒繖绫烩€滄柟妗堝瀷鈥濈郴鍒楁病鏈夌嫭绔嬪瀷鍙疯褰曪紝璇︽儏棣栧睆浣跨敤杩欓噷鐨勪粙缁嶄笌璁惧缁勬垚锛涘瀷鍙峰瀷绯诲垪璇峰埌鈥滀骇鍝佸瀷鍙枫€佸弬鏁颁笌灏哄鍥锯€濈淮鎶ゃ€?/p></div><button type="button" :disabled="!canEdit(seriesDraft)" @click="initializeSeriesDetail">浠庡畼缃戝師鐗堝垵濮嬪寲</button></div>
            <p v-if="seriesDetailIsEmpty" class="form-help">褰撳墠杩樻病鏈夊啓鍏ヨ鎯呫€傜偣鍑烩€滀粠瀹樼綉鍘熺増鍒濆鍖栤€濇妸瀹樼綉鐜版湁鐨勪粙缁嶄笌璁惧缁勬垚鍙樻垚鍙紪杈戝唴瀹癸紝鍐嶆寜闇€淇敼骞朵繚瀛樸€?/p>
            <div class="field-grid">
              <label>浠嬬粛鏍囬<input v-model.trim="seriesDraft.detail.intro.title" :disabled="!canEdit(seriesDraft)" maxlength="160" placeholder="渚嬪锛氱伒鍔ㄥ垏鍓插伐浣滅珯"></label>
              <label>浠嬬粛鍓爣棰?input v-model.trim="seriesDraft.detail.intro.subtitle" :disabled="!canEdit(seriesDraft)" maxlength="160" placeholder="渚嬪锛氭棤浜哄寲鍔犲伐瑙ｅ喅鏂规"></label>
              <label class="full">閫傚簲鍦烘櫙<input v-model.trim="seriesDraft.detail.intro.scene" :disabled="!canEdit(seriesDraft)" maxlength="240"></label>
              <label class="full">浠嬬粛姝ｆ枃<textarea v-model.trim="seriesDraft.detail.intro.body" :disabled="!canEdit(seriesDraft)" rows="4" maxlength="4000"></textarea></label>
              <label>璁惧涓诲浘<select v-model="seriesDraft.detail.machine_asset_id" :disabled="!canEdit(seriesDraft)"><option value="">娌跨敤瀹樼綉鍘熷浘</option><option v-if="seriesDraft.detail.machine_asset_id && !isReviewedMediaAsset(seriesDraft.detail.machine_asset_id, 'product')" :value="seriesDraft.detail.machine_asset_id">褰撳墠寮曠敤 {{ seriesDraft.detail.machine_asset_id }}锛堝皻鏈€氳繃閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in productFeatureMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
            </div>
            <p v-if="!productFeatureMediaAssets().length" class="form-help">鏆傛棤鍙敤鐨勪骇鍝佺礌鏉愩€傝鍏堝湪鈥滈珮绾ц缃?鈫?濯掍綋璧勪骇鈥濅笂浼犲浘鐗囷紝浣跨敤鑼冨洿閫夆€滀骇鍝佸睍绀衡€濓紝灞曠ず浣嶇疆閫夆€滀骇鍝佺郴鍒楀皝闈⑩€濇垨鈥滀骇鍝佸浘鎴栧昂瀵稿浘鈥濄€?/p>
            <div class="section-heading"><div><p class="eyebrow">璁惧缁勬垚</p><h4>鏍稿績鑳藉姏鏄庣粏</h4><p>姣忛」鍙互閰嶇疆鏍囬銆佽鏄庡拰澶囨敞锛涚敾甯冧笂鍙互鐩存帴鏀规枃瀛椼€?/p></div><button type="button" :disabled="!canEdit(seriesDraft)" @click="addSeriesDetailFeature">鏂板涓€椤?/button></div>
            <article v-for="(feature, index) in seriesDraft.detail.features" :key="`series-feature-${index}`" class="section-card">
              <div class="section-card-heading"><strong>绗?{{ index + 1 }} 椤?/strong><div><button type="button" class="text-action" :disabled="!canEdit(seriesDraft) || index === 0" @click="moveSeriesDetailFeature(index, -1)">涓婄Щ</button><button type="button" class="text-action" :disabled="!canEdit(seriesDraft) || index === seriesDraft.detail.features.length - 1" @click="moveSeriesDetailFeature(index, 1)">涓嬬Щ</button><button type="button" class="text-action danger" :disabled="!canEdit(seriesDraft)" @click="removeSeriesDetailFeature(index)">鍒犻櫎</button></div></div>
              <div class="field-grid"><label>鏍囬<input v-model.trim="feature.label" :disabled="!canEdit(seriesDraft)" maxlength="120"></label><label>澶囨敞<input v-model.trim="feature.note" :disabled="!canEdit(seriesDraft)" maxlength="300" placeholder="渚嬪锛氬绉嶆柟寮忓彲渚涢€夋嫨"></label><label>鍥剧墖<select v-model="feature.media_asset_id" :disabled="!canEdit(seriesDraft)"><option value="">涓嶄娇鐢ㄥ浘鐗?/option><option v-for="asset in productFeatureMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label><label class="full">璇存槑<textarea v-model.trim="feature.detail" :disabled="!canEdit(seriesDraft)" rows="2" maxlength="1000"></textarea></label></div>
            </article>
          </section>
          <div class="form-actions"><a :href="nativeItemPath('product_series', seriesDraft.id)">鎵撳紑楂樼骇璁剧疆鏌ョ湅濯掍綋涓庢潵婧?/a><button class="primary-action" type="submit" :disabled="saving || !canEdit(seriesDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨浜у搧绯诲垪' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨涓€涓骇鍝佺郴鍒椼€?/div>
      </section>

      <section v-else-if="activeTab === 'company'" class="workspace-grid" aria-label="浼佷笟璧勬枡缂栬緫">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">浼佷笟璧勬枡</p><h3>浼佷笟璧勬枡</h3></div><strong>{{ companyRecords(companyMode).length }}</strong></div>
          <div class="subtabs" aria-label="浼佷笟璧勬枡绫诲瀷">
            <button type="button" :class="{ active: companyMode === 'milestones' }" @click="selectCompanyMode('milestones')">鍙戝睍鍘嗙▼</button>
            <button type="button" :class="{ active: companyMode === 'qualifications' }" @click="selectCompanyMode('qualifications')">璧勮川璇佷功</button>
            <button type="button" :class="{ active: companyMode === 'manufacturing_evidence' }" @click="selectCompanyMode('manufacturing_evidence')">鍒堕€犺瘉鎹?/button>
          </div>
          <button v-for="record in companyRecords(companyMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedCompanyId }" @click="selectCompanyRecord(record.id)"><span>{{ companyLabel(record) }}</span><small>绯荤粺褰掓。璧勬枡</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!companyRecords(companyMode).length" class="empty compact">褰撳墠璐﹀彿娌℃湁鍙鍙栫殑浼佷笟璧勬枡銆?/p>
        </aside>

        <form v-if="companyDraft" class="editor-form" @submit.prevent="saveCompanyRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ companyHeading() }}</p><h3>{{ companyLabel(companyDraft) }}</h3></div><span class="status" :data-status="companyDraft.status">{{ statusLabel(companyDraft.status) }}</span></div>
          <p v-if="!canEdit(companyDraft)" class="read-only-note">璇ヨ褰曠洰鍓嶄笉鍙洿鎺ョ紪杈戙€?/p>
          <p v-else class="form-help">璧勬枡缂栧彿鐢辩郴缁熺淮鎶わ紝鏃犻渶淇敼銆傝瘉涔﹀浘鐗囧拰鍒堕€犲浘鐗囧彧鑳介€夋嫨宸插彂甯冪殑鍙楁帶濯掍綋璧勪骇銆?/p>

          <div v-if="companyMode === 'milestones'" class="field-grid">
            <label>璧勬枡缂栧彿锛堢郴缁熺淮鎶わ級<input :value="companyDraft.source_key" disabled></label>
            <label>骞翠唤<input v-model.number="companyDraft.year" :disabled="!canEdit(companyDraft)" required type="number" min="1900" max="2100" step="1"></label>
            <label class="full">鍘嗗彶浜嬩欢<textarea v-model="companyDraft.event" :disabled="!canEdit(companyDraft)" rows="3" maxlength="2000" required></textarea></label>
            <label class="full">浣愯瘉璇存槑<textarea v-model="companyDraft.evidence" :disabled="!canEdit(companyDraft)" rows="4" maxlength="4000" required></textarea></label>
            <label>鎺掑簭<input v-model.number="companyDraft.sort_order" :disabled="!canEdit(companyDraft)" type="number" min="0" step="1"></label>
            <section class="media-reference-editor full-field" aria-label="鏃堕棿杞村彈鎺у獟浣?>
              <div class="section-card-heading"><strong>鏃堕棿杞撮厤鍥撅紙鍙€夛級</strong><span>{{ companyDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">閫夋嫨鍝佺墝/浼佷笟绱犳潗锛堝惈鍐呴儴棰勮鑽夌锛?/option><option v-for="asset in editableMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">娣诲姞</button></div>
              <p v-if="!editableMediaAssets('brand').length" class="form-help">鏆傛棤鍙敤鐨勫搧鐗?浼佷笟绱犳潗銆傚彲鍏堝湪鈥滄洿澶氬伐鍏?- 濯掍綋璧勪骇鈥濈櫥璁版椂闂磋酱閰嶅浘锛涜崏绋垮彧鐢ㄤ簬鍚庡彴鍐呴儴棰勮銆?/p>
              <div v-for="reference in companyDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'brand') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(companyDraft)" @click="removeCompanyMediaReference(reference.media_asset_id)">绉婚櫎</button></div>
              <label class="full">鏃堕棿杞村鑸浘鏍?select v-model="companyDraft.icon_asset" :disabled="!canEdit(companyDraft)"><option value="">娌跨敤瀹樼綉鍘熺増鍥炬爣</option><option v-if="companyDraft.icon_asset && !isReviewedMediaAsset(companyDraft.icon_asset, 'brand')" :value="companyDraft.icon_asset">褰撳墠寮曠敤 {{ companyDraft.icon_asset }}锛堝皻鏈€氳繃閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in editableMediaAssetsForPlacement('brand', 'about.timeline.icon', 'image')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <small class="field-help">鍥炬爣鍙兘閫夋嫨宸插彂甯冪殑鍝佺墝/浼佷笟鍥剧墖锛涘缓璁?PNG/WebP锛?6脳96 鑷?256脳256 px銆傜暀绌烘椂浣跨敤瀹樼綉鍘熺増鍥炬爣銆?/small>
            </section>
          </div>

          <div v-else-if="companyMode === 'qualifications'" class="field-grid">
            <label>璧勬枡缂栧彿锛堢郴缁熺淮鎶わ級<input :value="companyDraft.source_key" disabled></label>
            <label>璧勬枡绫诲瀷<select v-model="companyDraft.type" :disabled="!canEdit(companyDraft)"><option value="certificate">璁よ瘉璇佷功</option><option value="honor">鑽ｈ獕璇佷功</option><option value="patent">涓撳埄璇佷功</option></select></label>
            <label class="full">鍚嶇О<input v-model.trim="companyDraft.name" :disabled="!canEdit(companyDraft)" maxlength="240" required></label>
            <label>璇佷功缂栧彿<input v-model.trim="companyDraft.certificate_number" :disabled="!canEdit(companyDraft)" maxlength="160"></label>
            <label>棰佸彂鏈烘瀯<input v-model.trim="companyDraft.issuer" :disabled="!canEdit(companyDraft)" maxlength="240"></label>
            <label>鏈夋晥鏈?input v-model="companyDraft.valid_until" :disabled="!canEdit(companyDraft)" type="date"></label>
            <label>鎺堟潈鐘舵€?select v-model="companyDraft.authorization_status" :disabled="!canEdit(companyDraft)"><option value="review_required">寰呮牳楠?/option><option value="owned">鑷湁</option><option value="licensed">宸叉巿鏉?/option><option value="authorized">宸茶鍙叕寮€</option></select></label>
            <label>鎺掑簭<input v-model.number="companyDraft.sort_order" :disabled="!canEdit(companyDraft)" type="number" min="0" step="1"></label>
            <section class="media-reference-editor full-field" aria-label="璧勮川璇佷功鍙楁帶濯掍綋">
              <div class="section-card-heading"><strong>鍙楁帶璇佷功濯掍綋</strong><span>{{ companyDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">閫夋嫨宸蹭笂浼犺祫璐ㄧ礌鏉?/option><option v-for="asset in qualificationMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ qualificationMediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">娣诲姞</button></div>
              <p v-if="!qualificationMediaAssets().length" class="form-help">鏆傛棤鍙敤鐨勮祫璐ㄧ礌鏉愩€傝鍏堝湪鈥滃獟浣撹祫浜р€濅腑鐧昏銆?/p>
              <div v-for="reference in companyDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'qualification') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(companyDraft)" @click="removeCompanyMediaReference(reference.media_asset_id)">绉婚櫎</button></div>
            </section>
          </div>

          <div v-else class="field-grid">
            <label>璧勬枡缂栧彿锛堢郴缁熺淮鎶わ級<input :value="companyDraft.source_key" disabled></label>
            <label>鍒堕€犵幆鑺?input v-model.trim="companyDraft.process" :disabled="!canEdit(companyDraft)" maxlength="160" required></label>
            <label class="full">鍒堕€犺鏄?textarea v-model="companyDraft.description" :disabled="!canEdit(companyDraft)" rows="4" maxlength="4000" required></textarea></label>
            <label class="full">妫€楠屼緷鎹?textarea v-model="companyDraft.inspection_evidence" :disabled="!canEdit(companyDraft)" rows="4" maxlength="4000" placeholder="璇峰～鍐欏彲杩芥函鐨勬楠屼緷鎹?></textarea></label>
            <label>鎺掑簭<input v-model.number="companyDraft.sort_order" :disabled="!canEdit(companyDraft)" type="number" min="0" step="1"></label>
            <section class="media-reference-editor full-field" aria-label="鍒堕€犺瘉鎹彈鎺у獟浣?>
              <div class="section-card-heading"><strong>鍙楁帶鍒堕€犲獟浣?/strong><span>{{ companyDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="companyMediaSelection" :disabled="!canEdit(companyDraft)"><option value="">閫夋嫨宸插彂甯冨埗閫犵礌鏉愶紙鍚唴閮ㄩ瑙堣崏绋匡級</option><option v-for="asset in editableMediaAssets('manufacturing')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(companyDraft) || !companyMediaSelection" @click="addCompanyMediaReference">娣诲姞</button></div>
              <p v-if="!editableMediaAssets('manufacturing').length" class="form-help">鏆傛棤鍙敤鐨勫埗閫犵礌鏉愩€傝鍏堝湪鈥滃獟浣撹祫浜р€濅腑鐧昏绱犳潗锛涜崏绋垮彧鐢ㄤ簬鍚庡彴鍐呴儴棰勮銆?/p>
              <div v-for="reference in companyDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'manufacturing') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(companyDraft)" @click="removeCompanyMediaReference(reference.media_asset_id)">绉婚櫎</button></div>
            </section>
          </div>
          <div class="form-actions"><a :href="nativeItemPath(companyMode, companyDraft.id)">鎵撳紑楂樼骇璁剧疆鍏宠仈鍙楁帶濯掍綋涓庢潵婧?/a><button class="primary-action" type="submit" :disabled="saving || !canEdit(companyDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨浼佷笟璧勬枡' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨涓€鏉′紒涓氳祫鏂欒褰曘€?/div>
      </section>

      <section v-else-if="activeTab === 'service'" class="workspace-grid" aria-label="鏈嶅姟鏀寔鍐呭缂栬緫">
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">鏈嶅姟鏀寔</p><h3>鏈嶅姟鏀寔</h3></div><strong>{{ serviceRecords(serviceMode).length }}</strong></div>
          <div class="subtabs" aria-label="鏈嶅姟鍐呭绫诲瀷">
            <button type="button" :class="{ active: serviceMode === 'service_resources' }" @click="selectServiceMode('service_resources')">鏈嶅姟璧勬枡</button>
            <button type="button" :class="{ active: serviceMode === 'service_locations' }" @click="selectServiceMode('service_locations')">鏈嶅姟缃戠偣</button>
            <button type="button" :class="{ active: serviceMode === 'external_service_entries' }" @click="selectServiceMode('external_service_entries')">鍞悗鍏ュ彛</button>
          </div>
          <button v-if="serviceMode === 'service_resources'" type="button" class="primary-action" :disabled="saving" @click="createServiceResource">鏂板缓鏈嶅姟璧勬枡鑽夌</button>
          <button v-for="record in serviceRecords(serviceMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedServiceId }" @click="selectServiceRecord(record.id)"><span>{{ serviceLabel(record) }}</span><small>{{ serviceSecondary(record) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!serviceRecords(serviceMode).length" class="empty compact">褰撳墠璐﹀彿娌℃湁鍙鍙栫殑鏈嶅姟鏀寔鍐呭銆?/p>
        </aside>

        <form v-if="serviceDraft" class="editor-form" @submit.prevent="saveServiceRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ serviceHeading() }}</p><h3>{{ serviceLabel(serviceDraft) }}</h3></div><span class="status" :data-status="serviceDraft.status">{{ statusLabel(serviceDraft.status) }}</span></div>
          <p v-if="!canEdit(serviceDraft)" class="read-only-note">璇ヨ褰曠洰鍓嶄笉鍙洿鎺ョ紪杈戙€?/p>

          <div v-if="serviceMode === 'service_resources'" class="field-grid">
            <label>璧勬枡缂栧彿锛堢郴缁熺淮鎶わ級<input :value="serviceDraft.source_key" disabled></label>
            <label>璧勬枡鏍忕洰<select v-model="serviceDraft.type" :disabled="!canEdit(serviceDraft)" required><option value="video">瑙嗛鏁欏</option><option value="product_manual">浜у搧鎶€鏈墜鍐?/option><option value="machine_manual">鏈哄簥璇存槑涔?/option><option value="software">绯荤粺杞欢</option></select></label>
            <label class="full">鏍囬<input v-model.trim="serviceDraft.title" :disabled="!canEdit(serviceDraft)" maxlength="240" required></label>
            <label class="full">鎽樿<textarea v-model="serviceDraft.summary" :disabled="!canEdit(serviceDraft)" rows="3" maxlength="1000"></textarea></label>
            <label class="full">姝ｆ枃璇存槑<textarea v-model="serviceDraft.body" :disabled="!canEdit(serviceDraft)" rows="6" maxlength="20000"></textarea></label>
            <label>閫傜敤鍨嬪彿锛堟瘡琛屼竴椤癸級<textarea v-model="serviceDraft.applicableModelsText" :disabled="!canEdit(serviceDraft)" rows="4" maxlength="2000" placeholder="渚嬪锛欶R400XS"></textarea></label>
            <label>璇█<input v-model.trim="serviceDraft.language" :disabled="!canEdit(serviceDraft)" maxlength="40" placeholder="zh-CN"></label>
            <label>璧勬枡鐗堟湰<input v-model.trim="serviceDraft.version" :disabled="!canEdit(serviceDraft)" maxlength="120" placeholder="渚嬪锛歷1.0"></label>
            <label>{{ serviceDraft.type === 'video' ? '鍙楁帶鏁欏瑙嗛' : '鍙楁帶涓嬭浇鏂囦欢' }}<select v-model="serviceDraft.asset" :disabled="!canEdit(serviceDraft)"><option value="">灏氭湭閫夋嫨</option><option v-if="serviceDraft.asset && !isServiceResourceMediaAsset(serviceDraft.asset, serviceDraft.type)" :value="serviceDraft.asset">褰撳墠寮曠敤 {{ serviceDraft.asset }}锛堝皻鏈€氳繃閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in serviceResourceMediaAssets(serviceDraft.type)" :key="asset.id" :value="String(asset.id)">{{ serviceResourceMediaAssetLabel(asset, serviceDraft.type) }}</option></select></label>
            <label>瑙嗛灏侀潰锛堜粎瑙嗛闇€瑕侊級<select v-model="serviceDraft.cover_asset" :disabled="!canEdit(serviceDraft)"><option value="">灏氭湭閫夋嫨</option><option v-if="serviceDraft.cover_asset && !isServiceTutorialPosterAsset(serviceDraft.cover_asset)" :value="serviceDraft.cover_asset">褰撳墠寮曠敤 {{ serviceDraft.cover_asset }}锛堝皻鏈€氳繃閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in serviceTutorialPosterAssets()" :key="asset.id" :value="String(asset.id)">{{ serviceTutorialPosterAssetLabel(asset) }}</option></select></label>
            <label>灞曠ず鏃ユ湡<input v-model="serviceDraft.display_date" :disabled="!canEdit(serviceDraft)" type="date"></label>
            <label>椤甸潰鎺掑簭<input v-model.number="serviceDraft.sort_order" :disabled="!canEdit(serviceDraft)" type="number" min="0" step="1"></label>
            <p v-if="!reviewedMediaAssets('service').length" class="form-help full">鏆傛棤宸插彂甯冪殑鏈嶅姟璧勬枡绱犳潗銆傝鍏堝湪鈥滃獟浣撹祫浜р€濅腑涓婁紶銆佺櫥璁般€佸鏍稿苟鍙戝竷銆?/p>
            <label class="full">璧勬枡鏇存柊鏃堕棿<input v-model.trim="serviceDraft.updated_at" :disabled="!canEdit(serviceDraft)" maxlength="80" placeholder="渚嬪锛?026-08-04T09:30:00Z"></label>
          </div>

          <div v-else-if="serviceMode === 'service_locations'" class="field-grid">
            <label>璧勬枡缂栧彿锛堢郴缁熺淮鎶わ級<input :value="serviceDraft.source_key" disabled></label>
            <label>鐪佷唤鎴栧尯鍩?input v-model.trim="serviceDraft.region" :disabled="!canEdit(serviceDraft)" maxlength="120" required></label>
            <label>鍩庡競<input v-model.trim="serviceDraft.city" :disabled="!canEdit(serviceDraft)" maxlength="120" required></label>
            <label>鏈嶅姟鐘舵€?select v-model="serviceDraft.business_status" :disabled="!canEdit(serviceDraft)"><option value="review_required">寰呮牳楠?/option><option value="active">姝ｅ父鏈嶅姟</option><option value="inactive">鏆傚仠鏈嶅姟</option></select></label>
            <label class="full">鏈嶅姟鑼冨洿<textarea v-model="serviceDraft.service_scope" :disabled="!canEdit(serviceDraft)" rows="3" maxlength="4000" required></textarea></label>
            <label>浼佷笟鑱旂郴浜?input v-model.trim="serviceDraft.contact.name" :disabled="!canEdit(serviceDraft)" maxlength="120"></label>
            <label>鏈嶅姟鐢佃瘽<input v-model.trim="serviceDraft.contact.phone" :disabled="!canEdit(serviceDraft)" maxlength="80"></label>
            <label>鏈嶅姟閭<input v-model.trim="serviceDraft.contact.email" :disabled="!canEdit(serviceDraft)" maxlength="160"></label>
            <label>鏈夋晥鏈?input v-model="serviceDraft.valid_until" :disabled="!canEdit(serviceDraft)" type="date"></label>
            <label class="full">鏈嶅姟鍦板潃<textarea v-model="serviceDraft.contact.address" :disabled="!canEdit(serviceDraft)" rows="3" maxlength="500"></textarea></label>
          </div>

          <div v-else class="field-grid">
            <label>鍏ュ彛绫诲瀷<input :value="serviceDraft.entry_type" disabled></label>
            <label>鎵撳紑鏂瑰紡<select v-model="serviceDraft.open_mode" :disabled="!canEdit(serviceDraft)"><option value="new_tab">鏂扮獥鍙?/option><option value="same_tab">褰撳墠绐楀彛</option></select></label>
            <label class="full">鍞悗绯荤粺鍦板潃<input v-model.trim="serviceDraft.url" :disabled="!canEdit(serviceDraft)" type="url" maxlength="1000" required placeholder="https://service.example.com/repair/new"></label>
            <label>鍋ュ悍鐘舵€?select v-model="serviceDraft.health_status" :disabled="!canEdit(serviceDraft)"><option value="pending">寰呯‘璁?/option><option value="available">鍙敤</option><option value="unavailable">涓嶅彲鐢?/option></select></label>
            <label>浜哄伐鍏滃簳鐢佃瘽<input v-model.trim="serviceDraft.fallback_phone" :disabled="!canEdit(serviceDraft)" maxlength="80"></label>
            <label class="toggle-field"><input v-model="serviceDraft.enabled" :disabled="!canEdit(serviceDraft)" type="checkbox"><span>鍚敤瀹樼綉鍏ュ彛</span></label>
            <p class="form-help full">鍙湁鍦ㄦ寮忓煙鍚嶃€佸仴搴风姸鎬併€佷汉宸ュ厹搴曞強鍙戝竷瀹℃牳鍧囧畬鎴愬悗锛屾墠鍏佽灏嗗叆鍙ｅ彂甯冨埌瀹樼綉銆?/p>
          </div>
          <div class="form-actions"><a :href="nativeItemPath(serviceMode, serviceDraft.id)">鎵撳紑楂樼骇璁剧疆鏌ョ湅鏉ユ簮涓庡鏍歌褰?/a><button class="primary-action" type="submit" :disabled="saving || !canEdit(serviceDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨鏈嶅姟鍐呭' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨涓€鏉℃湇鍔℃敮鎸佽褰曘€?/div>
      </section>

      <section v-else-if="activeTab === 'editorial'" :class="showVideoShareWorkspace ? 'video-share-tab' : 'workspace-grid'" aria-label="鏂囩珷涓庢渚嬬紪杈?>
        <VideoShareWorkspace v-if="showVideoShareWorkspace" ref="videoShareWorkspace" @changed="handleVideoShareChanged" @notify="handleVideoShareNotify" />
        <template v-else>
        <aside class="record-list-panel">
          <div class="panel-heading"><div><p class="eyebrow">鏂囩珷涓庢渚?/p><h3>鏂囩珷涓庢渚?/h3></div><strong>{{ editorialRecords(editorialMode).length }}</strong></div>
          <div class="subtabs" aria-label="鏂囩珷涓庢渚嬬被鍨?>
            <button type="button" :class="{ active: editorialMode === 'articles' }" @click="selectEditorialMode('articles')">鏂伴椈涓庢枃绔?/button>
            <button type="button" :class="{ active: editorialMode === 'case_studies' }" @click="selectEditorialMode('case_studies')">瀹㈡埛妗堜緥</button>
          </div>
          <button type="button" class="primary-action" :disabled="saving" @click="createEditorialRecord()">鏂板缓鑽夌</button>
          <button v-for="record in editorialRecords(editorialMode)" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedEditorialId }" @click="selectEditorialRecord(record.id)"><span>{{ editorialLabel(record) }}</span><small>{{ editorialSecondary(record) }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
          <p v-if="!editorialRecords(editorialMode).length" class="empty compact">鏆傛椂娌℃湁姝ょ被鍐呭鑽夌锛屽彲浣跨敤鈥滄柊寤鸿崏绋库€濆紑濮嬬淮鎶ゃ€?/p>
        </aside>

        <form v-if="editorialDraft" class="editor-form" @submit.prevent="saveEditorialRecord">
          <div class="form-heading"><div><p class="eyebrow">{{ editorialHeading() }}</p><h3>{{ editorialLabel(editorialDraft) }}</h3></div><span class="status" :data-status="editorialDraft.status">{{ statusLabel(editorialDraft.status) }}</span></div>
          <p v-if="!canEdit(editorialDraft)" class="read-only-note">璇ヨ褰曠洰鍓嶄笉鍙洿鎺ョ紪杈戙€傝鍏堥€氳繃鏃㈡湁鍐呭瀹℃牳娴佺▼鎭㈠涓鸿崏绋挎垨閫€鍥炰慨鏀圭姸鎬併€?/p>
          <p v-else class="form-help">鎵€鏈変繚瀛樺潎涓哄唴瀹硅崏绋裤€傚皝闈㈠獟浣撱€佹潵婧愬拰瀹㈡埛鎺堟潈椤诲湪鍙戝竷鍓嶅畬鎴愬彈鎺у鏍革紝宸ヤ綔鍙颁笉鎻愪緵鍙戝竷鎿嶄綔銆?/p>

          <div v-if="editorialMode === 'articles'" class="word-import-row">
            <label class="word-import-button" :class="{ disabled: !canEdit(editorialDraft) || importingWord }">
              {{ importingWord ? '姝ｅ湪瀵煎叆...' : '瀵煎叆 Word 鏂囨。' }}
              <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :disabled="!canEdit(editorialDraft) || importingWord" @change="importWordDocument">
            </label>
            <small>鏀寔 .docx锛涗繚鐣欐爣棰樺眰绾с€佹钀姐€佸姞绮?鏂滀綋銆佸垪琛ㄣ€佸紩鐢ㄣ€佽〃鏍煎拰鍥剧墖銆傚鍏ュ悗璇锋鏌ュ唴瀹癸紝鍐嶇偣鈥滀繚瀛樺唴瀹硅崏绋库€濄€?/small>
          </div>

          <div v-if="editorialMode === 'articles'" class="field-grid">
            <label>鏂囩珷鏍囪瘑<input v-model.trim="editorialDraft.slug" :disabled="!canEdit(editorialDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>鍐呭绫诲瀷<select v-model="editorialDraft.category" :disabled="!canEdit(editorialDraft)" required><option value="news">鍔ㄦ€佹柊闂?/option></select></label>
            <label>瀹樼綉鏄剧ず鏃ユ湡<input v-model="editorialDraft.display_date" :disabled="!canEdit(editorialDraft)" type="date" required></label>
              <label>鍚屾棩鎺掑簭<input v-model.number="editorialDraft.sort_order" :disabled="!canEdit(editorialDraft)" type="number" min="0" step="1" placeholder="鐣欑┖琛ㄧず鎸夌郴缁熼粯璁ら『搴?><small class="field-help">鏁板€煎皬鐨勬帓鍦ㄥ悓鏃ュ唴瀹瑰墠闈紱鐣欑┖涓嶄細鏀瑰彉榛樿椤哄簭銆?/small></label>
            <label class="full">鏍囬<input v-model.trim="editorialDraft.title" :disabled="!canEdit(editorialDraft)" required maxlength="240"></label>
            <label class="full">鍥炬枃姝ｆ枃<textarea v-model="editorialDraft.body" :disabled="!canEdit(editorialDraft)" rows="10" maxlength="30000" placeholder="濉啓娈佃惤锛涘彲浣跨敤鍩虹 HTML锛坧銆乭2-h4銆乻trong銆乪m銆乽l銆乷l銆乥lockquote銆乼able銆乤銆佸彈绠″浘鐗囪矾寰勶級锛屽彂甯冩椂浼氳嚜鍔ㄨ繃婊ゅ嵄闄╂爣绛俱€?></textarea><small class="field-help">鍔ㄦ€佹柊闂讳娇鐢ㄦ枃绔犲拰鍥剧墖锛涜棰戝垎浜鍦ㄢ€滆棰戝垎浜唴瀹光€濋噷鍗曠嫭缁存姢銆備篃鍙互鐩存帴瀵煎叆 Word 鏂囨。鐢熸垚鏍囬銆佹鏂囧拰鍥剧墖銆?/small></label>
            <label class="full">姝ｆ枃鍥剧墖閰嶇疆锛堝彈鎺у獟浣?JSON锛?textarea v-model="editorialDraft.body_media_text" :disabled="!canEdit(editorialDraft)" rows="3" placeholder='[{"media_asset_id":"123","caption":"鍥剧墖璇存槑"}]'></textarea><small class="field-help">浠呭～鍐欏凡鐧昏鐨勬枃绔犲浘鐗囩礌鏉愶紱淇濆瓨鍚庢鏂囧浘鐗囧彲鍦ㄦ柊闂昏鎯呯敾甯冧腑閫変腑骞舵寜鈥滄柊闂绘鏂囧浘鐗団€濈敤閫旀浛鎹€?/small></label>
            <label v-if="editorialDraft.category === 'video'" class="full">瀛楀箷鎴栨枃瀛楃<textarea v-model="editorialDraft.transcript" :disabled="!canEdit(editorialDraft)" rows="8" maxlength="30000" placeholder="鍙€夛細濉啓瀛楀箷鎴栨枃瀛楃锛屼究浜庢绱㈠拰鏃犻殰纰嶉槄璇汇€?></textarea></label>
            <section class="media-reference-editor full" aria-label="鏂囩珷鍙楁帶濯掍綋">
              <div class="section-card-heading"><strong>鍔ㄦ€佹柊闂诲皝闈㈠浘</strong><span>{{ editorialDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="editorialMediaSelection" :disabled="!canEdit(editorialDraft)"><option value="">閫夋嫨鍔ㄦ€佹柊闂诲皝闈㈠浘</option><option v-for="asset in eligibleEditorialMediaAssets('news')" :key="asset.id" :value="String(asset.id)">{{ editorialMediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(editorialDraft) || !editorialMediaSelection" @click="addEditorialMediaReference">娣诲姞</button></div>
              <p class="field-help">鍔ㄦ€佹柊闂诲皝闈㈠彧鎺ュ彈鈥滄枃绔犱笌璧勮 / 鍔ㄦ€佹柊闂诲皝闈?/ news / dynamic-news鈥濈殑鍥剧墖锛涗笉鑳藉～鍐欏閮ㄨ棰戝湴鍧€銆?/p>
              <p v-if="!reviewedMediaAssets('article').length" class="form-help">鏆傛棤宸插彂甯冪殑鏂囩珷绱犳潗銆傝鍏堝湪鈥滃獟浣撹祫浜р€濆畬鎴愪笂浼犮€佺増鏉冪‘璁ゃ€佽鏍兼鏌ュ拰鍙戝竷銆?/p>
              <div v-for="reference in editorialDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'article') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(editorialDraft)" @click="removeEditorialMediaReference(reference.media_asset_id)">绉婚櫎</button></div>
            </section>
            <label>鍙楁帶灏侀潰绱犳潗<select v-model="editorialDraft.cover_asset" :disabled="!canEdit(editorialDraft)"><option value="">灏氭湭閫夋嫨</option><option v-if="editorialDraft.cover_asset && !isEditorialCoverAssetAllowed(editorialDraft.cover_asset, 'news')" :value="editorialDraft.cover_asset">褰撳墠寮曠敤 {{ editorialDraft.cover_asset }}锛堝皻鏈€氳繃鍥剧墖閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in eligibleEditorialCoverAssets('news')" :key="asset.id" :value="String(asset.id)">{{ editorialMediaAssetLabel(asset) }}</option></select></label>
            <p v-if="!reviewedMediaAssets('article').length" class="form-help full">鏆傛棤宸插彂甯冪殑鏂囩珷灏侀潰绱犳潗銆傝鍏堝湪鍘熺敓濯掍綋娴佺▼瀹屾垚涓婁紶銆佺増鏉冪‘璁や笌鍙戝竷銆?/p>
            <label>鏉ユ簮鏂囨。<input v-model.trim="editorialDraft.source_document" :disabled="!canEdit(editorialDraft)" maxlength="1000" placeholder="鏂囦欢鍚嶆垨鍐呴儴鏉ユ簮璺緞"></label>
            <label>鏉ユ簮鍦板潃<input v-model.trim="editorialDraft.source_url" :disabled="!canEdit(editorialDraft)" type="url" maxlength="1000" placeholder="https://..."></label>
          </div>

          <div v-else class="field-grid">
            <label>妗堜緥鏍囪瘑<input v-model.trim="editorialDraft.slug" :disabled="!canEdit(editorialDraft)" required pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            <label>琛屼笟<input v-model.trim="editorialDraft.industry" :disabled="!canEdit(editorialDraft)" maxlength="160"></label>
            <label>鏉愭枡<input v-model.trim="editorialDraft.material" :disabled="!canEdit(editorialDraft)" maxlength="160"></label>
            <label>鍘氬害<input v-model.trim="editorialDraft.thickness" :disabled="!canEdit(editorialDraft)" maxlength="120" placeholder="渚嬪锛?0 mm"></label>
            <label>鍏宠仈鍨嬪彿缂栫爜<input v-model.trim="editorialDraft.model_code" :disabled="!canEdit(editorialDraft)" maxlength="80" placeholder="渚嬪锛欶R400XS"></label>
            <label>瀹㈡埛鎺堟潈鐘舵€?select v-model="editorialDraft.authorization_status" :disabled="!canEdit(editorialDraft)"><option value="review_required">寰呭鏍?/option><option value="owned">鑷湁</option><option value="licensed">宸茶幏璁稿彲</option><option value="authorized">宸茶幏鍏紑鎺堟潈</option></select></label>
            <label class="full">宸ヨ壓杩囩▼<textarea v-model="editorialDraft.process" :disabled="!canEdit(editorialDraft)" rows="6" maxlength="12000"></textarea></label>
            <label class="full">缁撴灉璇存槑<textarea v-model="editorialDraft.result" :disabled="!canEdit(editorialDraft)" rows="5" maxlength="8000"></textarea></label>
            <label>鏉ユ簮鏂囨。<input v-model.trim="editorialDraft.source_document" :disabled="!canEdit(editorialDraft)" maxlength="1000" placeholder="鏂囦欢鍚嶆垨鍐呴儴鏉ユ簮璺緞"></label>
            <label>鏉ユ簮鍦板潃<input v-model.trim="editorialDraft.source_url" :disabled="!canEdit(editorialDraft)" type="url" maxlength="1000" placeholder="https://..."></label>
          </div>

          <section v-if="editorialMode === 'articles'" class="seo-editor" aria-labelledby="article-seo-title">
            <div><p class="eyebrow">鎼滅储浼樺寲</p><h4 id="article-seo-title">鎼滅储涓庡垎浜俊鎭?/h4></div>
            <div class="field-grid">
              <label>鎼滅储鏍囬<input v-model.trim="editorialDraft.seo.title" :disabled="!canEdit(editorialDraft)" maxlength="160"></label>
              <label>鍏抽敭璇?input v-model.trim="editorialDraft.seo.keywords" :disabled="!canEdit(editorialDraft)" maxlength="500" placeholder="浠ラ€楀彿鍒嗛殧"></label>
              <label class="full">鎼滅储鎻忚堪<textarea v-model="editorialDraft.seo.description" :disabled="!canEdit(editorialDraft)" rows="3" maxlength="500"></textarea></label>
            </div>
          </section>

          <div class="form-actions"><a :href="nativeItemPath(editorialMode, editorialDraft.id)">鎵撳紑楂樼骇璁剧疆鍏宠仈鍙楁帶濯掍綋涓庢煡鐪嬪鏍歌褰?/a><button v-if="canDeleteEditorialDraft(editorialDraft)" type="button" class="text-action danger" :disabled="saving" @click="deleteEditorialDraft">鍒犻櫎褰撳墠鑽夌</button><button class="primary-action" type="submit" :disabled="saving || !canEdit(editorialDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨鍐呭鑽夌' }}</button></div>
        </form>
        <div v-else class="empty">璇烽€夋嫨鎴栨柊寤轰竴鏉{ editorialMode === 'articles' ? '鏂囩珷' : '瀹㈡埛妗堜緥' }}鑽夌銆?/div>
        </template>
      </section>

      <section v-else-if="activeTab === 'settings'" class="settings-workspace" aria-label="鍏ㄧ珯璁剧疆缂栬緫">
        <form v-if="settingsDraft" class="editor-form" @submit.prevent="saveSettings">
          <div class="form-heading">
            <div><p class="eyebrow">鍏ㄧ珯璁剧疆</p><h3>鍏ㄧ珯瀵艰埅涓庤仈绯绘柟寮?/h3></div>
            <span class="status" :data-status="settingsDraft.status">{{ statusLabel(settingsDraft.status) }}</span>
          </div>
          <p v-if="!canEdit(settingsDraft)" class="read-only-note">璇ヨ缃洰鍓嶄笉鍙洿鎺ョ紪杈戙€傝鍏堥€氳繃鏃㈡湁鍐呭瀹℃牳娴佺▼鎭㈠涓鸿崏绋挎垨閫€鍥炰慨鏀圭姸鎬併€?/p>
          <p v-else class="form-help">淇濆瓨浠呮洿鏂拌崏绋夸腑鐨勬樉绀洪厤缃€傝缃爣璇嗕笌涓氬姟瀹℃牳鏍囪鐢辨棦鏈夋祦绋嬬淮鎶わ紝涓嶈兘鍦ㄦ椤甸潰鏀瑰啓鎴栫粫杩囥€?/p>

          <div class="field-grid">
            <label>璁剧疆鏍囪瘑<input :value="settingsDraft.setting_key" disabled></label>
            <label>鏉ユ簮璁板綍<input :value="settingsDraft.source_document || '鏈～鍐?" disabled></label>
          </div>

          <section class="section-editor" aria-labelledby="site-navigation-title">
            <div class="section-heading"><div><p class="eyebrow">涓诲鑸?/p><h4 id="site-navigation-title">涓诲鑸?/h4><p>鏀寔绔欏唴璺緞鎴栧凡纭鐨?HTTPS 鍦板潃銆?/p></div><button type="button" :disabled="!canEdit(settingsDraft)" @click="addSettingLink('navigation')">鏂板瀵艰埅椤?/button></div>
            <article v-for="(item, index) in settingsDraft.navigation" :key="`navigation-${index}`" class="section-card">
              <div class="section-card-heading"><strong>瀵艰埅椤?{{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft) || settingsDraft.navigation.length < 1" @click="removeSettingLink('navigation', index)">鍒犻櫎</button></div>
              <div class="field-grid"><label>鏄剧ず鍚嶇О<input v-model.trim="item.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>閾炬帴鍦板潃<input v-model.trim="item.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/product 鎴?https://..."></label></div>
            </article>
            <p v-if="!settingsDraft.navigation.length" class="form-help">灏氭湭閰嶇疆涓诲鑸€傚彂甯冩鏌ヤ細闃绘绌哄鑸繘鍏ュ畼缃戙€?/p>
          </section>

          <section class="section-editor" aria-labelledby="site-footer-title">
            <div class="section-heading"><div><p class="eyebrow">椤佃剼璁剧疆</p><h4 id="site-footer-title">椤佃剼閾炬帴</h4><p>浼佷笟涓讳綋銆佸妗堛€侀殣绉佷富浣撶瓑涓氬姟淇℃伅蹇呴』缁х画璧板鏍告祦绋嬨€?/p></div><button type="button" :disabled="!canEdit(settingsDraft)" @click="addSettingLink('footer')">鏂板椤佃剼閾炬帴</button></div>
            <p class="read-only-note">褰撳墠涓氬姟瀹℃牳鏍囪锛歿{ settingsDraft.footer.requires_business_review ? '寰呬笟鍔＄‘璁? : '宸茬敱瀹℃牳娴佺▼纭' }}銆傝鏍囪浠呬緵鏌ョ湅锛屼笉鑳界敱鍐呭缂栬緫鐩存帴鏇存敼銆?/p>
            <article v-for="(item, index) in settingsDraft.footer.primary_links" :key="`footer-${index}`" class="section-card">
              <div class="section-card-heading"><strong>椤佃剼閾炬帴 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft) || settingsDraft.footer.primary_links.length < 1" @click="removeSettingLink('footer', index)">鍒犻櫎</button></div>
              <div class="field-grid"><label>鏄剧ず鍚嶇О<input v-model.trim="item.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>閾炬帴鍦板潃<input v-model.trim="item.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/about 鎴?https://..."></label></div>
            </article>
            <p v-if="!settingsDraft.footer.primary_links.length" class="form-help">灏氭湭閰嶇疆椤佃剼閾炬帴銆傚彂甯冩鏌ヤ細闃绘绌洪〉鑴氳繘鍏ュ畼缃戙€?/p>
            <div class="section-card-heading"><strong>椤佃剼鏍忕洰</strong><button type="button" :disabled="!canEdit(settingsDraft)" @click="addFooterColumn">鏂板鏍忕洰</button></div>
            <article v-for="(column, columnIndex) in settingsDraft.footer.columns" :key="`footer-column-${columnIndex}`" class="section-card">
              <div class="section-card-heading"><strong>鏍忕洰 {{ columnIndex + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft)" @click="removeFooterColumn(columnIndex)">鍒犻櫎鏍忕洰</button></div>
              <div class="field-grid"><label>鏍忕洰鏍囬<input v-model.trim="column.title" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>鏍忕洰鎺掑簭<input v-model.number="column.sort_order" :disabled="!canEdit(settingsDraft)" type="number" min="0" max="99"></label></div>
              <div v-for="(link, linkIndex) in column.links" :key="`footer-column-link-${columnIndex}-${linkIndex}`" class="field-grid nested-fields"><label>鏄剧ず鍚嶇О<input v-model.trim="link.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label><label>閾炬帴鍦板潃<input v-model.trim="link.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/about 鎴?https://..."></label><button type="button" class="text-action danger" :disabled="!canEdit(settingsDraft)" @click="removeFooterColumnLink(columnIndex, linkIndex)">鍒犻櫎閾炬帴</button></div>
              <button type="button" :disabled="!canEdit(settingsDraft)" @click="addFooterColumnLink(columnIndex)">鏂板鏍忕洰閾炬帴</button>
            </article>
            <details class="advanced-fields footer-text-style-editor">
              <summary>椤靛熬鏂囧瓧鏍峰紡锛堥粯璁ゅ叧闂級</summary>
              <p class="form-help">姣忛」榛樿娌跨敤瀹樼綉鍘熺増銆傚彧鏈夊崟鐙惎鐢ㄥ悗鎵嶄細璋冩暣璇ラ」鏂囧瓧锛屼笉浼氭敼鍙橀〉灏惧潗鏍囥€佸昂瀵告垨鍔ㄧ敾銆?/p>
              <article v-for="definition in footerTextStyleDefinitions" :key="definition.id" class="section-card compact-style-card">
                <div class="section-card-heading"><strong>{{ definition.label }}</strong><label class="toggle-field"><input v-model="settingsDraft.footer.text_styles[definition.id].enabled" :disabled="!canEdit(settingsDraft)" type="checkbox"><span>鍚敤</span></label></div>
                <div class="field-grid">
                  <label>瀛楅噸<select v-model.number="settingsDraft.footer.text_styles[definition.id].weight" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled"><option :value="300">缁?/option><option :value="400">甯歌</option><option :value="500">涓瓑</option><option :value="700">绮?/option><option :value="800">鐗圭矖</option></select></label>
                  <label>妗岄潰瀛楀彿锛坧x锛?input v-model.number="settingsDraft.footer.text_styles[definition.id].size_desktop" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" type="number" min="12" max="72"></label>
                  <label>鎵嬫満瀛楀彿锛坧x锛?input v-model.number="settingsDraft.footer.text_styles[definition.id].size_mobile" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" type="number" min="12" max="40"></label>
                  <label>琛岄珮<input v-model.number="settingsDraft.footer.text_styles[definition.id].line_height" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" type="number" min="1" max="2.2" step="0.05"></label>
                  <label>鏂囧瓧棰滆壊<input v-model.trim="settingsDraft.footer.text_styles[definition.id].color" :disabled="!canEdit(settingsDraft) || !settingsDraft.footer.text_styles[definition.id].enabled" pattern="#[0-9a-fA-F]{6}" placeholder="#BCBCBC"></label>
                </div>
              </article>
            </details>
          </section>

          <section class="section-editor" aria-labelledby="site-brand-title">
            <div><p class="eyebrow">鍝佺墝涓庤仈绯绘柟寮?/p><h4 id="site-brand-title">鍝佺墝涓庨〉闈㈣仈绯诲叆鍙?/h4></div>
            <div class="field-grid">
              <label>鍝佺墝鏄剧ず鍚嶇О<input v-model.trim="settingsDraft.brand.display_name" :disabled="!canEdit(settingsDraft)" required maxlength="160"></label>
              <label>鍙楁帶鍝佺墝鏍囧織绱犳潗<select v-model="settingsDraft.brand.logo_asset" :disabled="!canEdit(settingsDraft)" required><option value="">閫夋嫨宸插彂甯冨搧鐗岀礌鏉?/option><option v-if="settingsDraft.brand.logo_asset && !isReviewedMediaAsset(settingsDraft.brand.logo_asset, 'brand')" :value="settingsDraft.brand.logo_asset">褰撳墠寮曠敤 {{ settingsDraft.brand.logo_asset }}锛堝皻鏈€氳繃閫夋嫨鍣ㄦ牳楠岋級</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>椤佃剼鍝佺墝鍥?select v-model="settingsDraft.brand.footer_logo_asset" :disabled="!canEdit(settingsDraft)"><option value="">娌跨敤椤堕儴鍝佺墝鏍囧織</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>椤佃剼鍦板潃鍥炬爣<select v-model="settingsDraft.footer.address_icon_asset" :disabled="!canEdit(settingsDraft)"><option value="">娌跨敤瀹樼綉鍘熷浘</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>椤佃剼鐢佃瘽鍥炬爣<select v-model="settingsDraft.footer.phone_icon_asset" :disabled="!canEdit(settingsDraft)"><option value="">娌跨敤瀹樼綉鍘熷浘</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <label>椤佃剼閭鍥炬爣<select v-model="settingsDraft.footer.email_icon_asset" :disabled="!canEdit(settingsDraft)"><option value="">娌跨敤瀹樼綉鍘熷浘</option><option v-for="asset in reviewedMediaAssets('brand')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
              <p v-if="!reviewedMediaAssets('brand').length" class="form-help full">鏆傛棤宸插彂甯冪殑鍝佺墝鏍囧織绱犳潗銆傝鍏堝湪鈥滃獟浣撹祫浜р€濅腑瀹屾垚鐧昏銆佸搧鐗屽鏍稿拰鍙戝竷銆?/p>
              <label>鏈嶅姟鐢佃瘽<input v-model.trim="settingsDraft.contacts.service_phone" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label>
              <label>鍥藉唴涓氬姟鐢佃瘽<input v-model.trim="settingsDraft.contacts.domestic_phone" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label>娴峰涓氬姟鐢佃瘽<input v-model.trim="settingsDraft.contacts.export_phone" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label>鍥藉唴涓氬姟閭<input v-model.trim="settingsDraft.contacts.domestic_email" :disabled="!canEdit(settingsDraft)" type="email" maxlength="160"></label>
              <label>娴峰涓氬姟閭<input v-model.trim="settingsDraft.contacts.export_email" :disabled="!canEdit(settingsDraft)" type="email" maxlength="160"></label>
              <label>璇█鍒囨崲鎸夐挳鏂囧瓧<input v-model.trim="settingsDraft.contacts.language_label" :disabled="!canEdit(settingsDraft)" maxlength="24" placeholder="EN"></label>
              <label>椤堕儴鎸夐挳鏂囨<input v-model.trim="settingsDraft.contacts.header_cta.label" :disabled="!canEdit(settingsDraft)" required maxlength="80"></label>
              <label class="full">椤堕儴鎸夐挳閾炬帴<input v-model.trim="settingsDraft.contacts.header_cta.href" :disabled="!canEdit(settingsDraft)" required maxlength="1000" placeholder="/service 鎴?https://..."></label>
              <label class="full">鑱旂郴鍦板潃锛堟瘡琛屼竴椤癸級<textarea v-model="settingsDraft.contacts.addressesText" :disabled="!canEdit(settingsDraft)" rows="3" maxlength="1000" placeholder="涓浗娴欐睙鐪?..\n娴峰鍔炰簨澶?.."></textarea></label>
              <label>閲囪喘鍖烘寜閽枃妗?input v-model.trim="settingsDraft.footer.purchase_label" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label>閲囪喘鍖烘爣棰?input v-model.trim="settingsDraft.footer.purchase_title" :disabled="!canEdit(settingsDraft)" maxlength="160"></label>
              <label class="full">閲囪喘鍖鸿鏄?textarea v-model="settingsDraft.footer.purchase_subtitle" :disabled="!canEdit(settingsDraft)" rows="2" maxlength="400"></textarea></label>
              <label>閲囪喘鑱旂郴鐢佃瘽<input v-model.trim="settingsDraft.footer.purchase_phone" :disabled="!canEdit(settingsDraft)" maxlength="80"></label>
              <label class="full">鐗堟潈鏂囧瓧<input v-model.trim="settingsDraft.footer.copyright" :disabled="!canEdit(settingsDraft)" maxlength="240"></label>
              <label class="full">鍙敤璇█锛堟瘡琛屼竴椤癸級<textarea v-model="settingsDraft.languagesText" :disabled="!canEdit(settingsDraft)" rows="3" maxlength="400" placeholder="zh-CN"></textarea></label>
            </div>
          </section>

          <div class="form-actions"><a :href="nativeItemPath('site_settings', settingsDraft.id)">鎵撳紑楂樼骇璁剧疆鏌ョ湅鍒嗘瀽閰嶇疆銆佹潵婧愪笌瀹℃牳璁板綍</a><button class="primary-action" type="submit" :disabled="saving || !canEdit(settingsDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨鍏ㄧ珯璁剧疆鑽夌' }}</button></div>
        </form>
        <div v-else class="empty">褰撳墠璐﹀彿娌℃湁鍙鍙栫殑鍏ㄧ珯璁剧疆璁板綍銆?/div>
      </section>

      <section v-else class="model-workspace" aria-label="浜у搧鍨嬪彿涓庡弬鏁扮紪杈?>
        <div class="model-layout">
          <aside class="record-list-panel">
            <div class="panel-heading"><div><p class="eyebrow">浜у搧鍨嬪彿</p><h3>浜у搧鍨嬪彿</h3></div><strong>{{ models.length }}</strong></div>
            <button v-for="record in models" :key="record.id" type="button" class="record-choice" :class="{ active: record.id === selectedModelId }" @click="selectModel(record.id)"><span>{{ record.name || record.model_code }}</span><small>{{ record.model_code }} / {{ record.series_code }}</small><i :data-status="record.status">{{ statusLabel(record.status) }}</i></button>
            <p v-if="!models.length" class="empty compact">褰撳墠璐﹀彿娌℃湁鍙鍙栫殑浜у搧鍨嬪彿銆?/p>
          </aside>

          <form v-if="modelDraft" class="editor-form" @submit.prevent="saveModel">
            <div class="form-heading"><div><p class="eyebrow">鍨嬪彿淇℃伅</p><h3>{{ modelDraft.name || '鏈懡鍚嶅瀷鍙? }}</h3></div><span class="status" :data-status="modelDraft.status">{{ statusLabel(modelDraft.status) }}</span></div>
            <p v-if="!canEdit(modelDraft)" class="read-only-note">璇ュ瀷鍙风洰鍓嶄笉鍙洿鎺ョ紪杈戙€?/p>
            <p class="form-help">璇︽儏榛樿娌跨敤瀹樼綉鍘熺増锛堟ā鏉块噷鐨勪粙缁嶃€佽澶囩粍鎴愪笌绀烘剰鍥撅級銆傜偣鍑烩€滀粠瀹樼綉鍘熺増鍒濆鍖栬鎯呪€濇妸瀹冧滑鍐欏叆鏈瀷鍙凤紝涔嬪悗鎵嶈兘鍦ㄨ〃鍗曞拰鐢诲竷涓婁慨鏀癸紱宸插～鍐欑殑瀛楁涓嶄細琚鐩栥€?/p>
            <div class="form-actions"><span></span><button type="button" :disabled="!canEdit(modelDraft)" @click="initializeModelDetail">浠庡畼缃戝師鐗堝垵濮嬪寲璇︽儏</button></div>
            <div class="field-grid">
              <label>鍨嬪彿鍚嶇О<input v-model.trim="modelDraft.name" :disabled="!canEdit(modelDraft)" required maxlength="160"></label>
              <label>鍨嬪彿缂栫爜<input v-model.trim="modelDraft.model_code" :disabled="!canEdit(modelDraft)" required maxlength="80"></label>
              <label>鎵€灞炵郴鍒楃紪鐮?input v-model.trim="modelDraft.series_code" :disabled="!canEdit(modelDraft)" required maxlength="80"></label>
              <label>璁块棶鏍囪瘑<input v-model.trim="modelDraft.slug" :disabled="!canEdit(modelDraft)" pattern="(?:[a-z]|[0-9])(?:[a-z]|[0-9]|-){0,79}" maxlength="80"></label>
            </div>
            <section class="section-editor" aria-labelledby="model-labels-title">
              <div class="section-heading"><div><p class="eyebrow">椤甸潰鏂囧瓧</p><h4 id="model-labels-title">鍙傛暟涓庡昂瀵稿浘鏍囬</h4></div></div>
              <div class="field-grid">
                <label>鎶€鏈弬鏁版枃瀛?input v-model.trim="modelDraft.configuration.labels.technical" :disabled="!canEdit(modelDraft)" maxlength="80" placeholder="鎶€鏈弬鏁?></label>
                <label>宸ョ▼瑙嗗浘鏂囧瓧<input v-model.trim="modelDraft.configuration.labels.drawing" :disabled="!canEdit(modelDraft)" maxlength="80" placeholder="鏈哄瀷宸ョ▼瑙嗗浘"></label>
                <label class="full">鎶€鏈弬鏁颁晶杈瑰浘<select v-model="modelDraft.configuration.labels.technical_image_asset_id" :disabled="!canEdit(modelDraft)"><option value="">娌跨敤瀹樼綉鍘熷浘</option><option v-for="asset in productDrawingMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelDrawingMediaAssetLabel(asset) }}</option></select></label>
              </div>
            </section>
            <section v-if="modelSupportsWorkstationIntro" class="section-editor" aria-labelledby="model-intro-title">
              <div class="section-heading"><div><p class="eyebrow">璇︽儏棣栧睆</p><h4 id="model-intro-title">宸ヤ綔绔欎粙缁嶄笌璁惧涓诲浘</h4><p>浠呰鐩栧搴旂郴鍒楁湁浠嬬粛鐨勫尯鍩燂紝鏈～鍐欐椂瀹樼綉娌跨敤鍘?PSD 鏂囨涓庡浘鐗囥€?/p></div></div>
              <div class="field-grid">
                <label>浠嬬粛鏍囬<input v-model.trim="modelDraft.configuration.intro.title" :disabled="!canEdit(modelDraft)" maxlength="160" placeholder="渚嬪锛氱伒鍔ㄥ垏鍓插伐浣滅珯"></label>
                <label>浠嬬粛鍓爣棰?input v-model.trim="modelDraft.configuration.intro.subtitle" :disabled="!canEdit(modelDraft)" maxlength="160" placeholder="渚嬪锛氭棤浜哄寲鍔犲伐瑙ｅ喅鏂规"></label>
                <label>閫傚簲鍦烘櫙<input v-model.trim="modelDraft.configuration.intro.scene" :disabled="!canEdit(modelDraft)" maxlength="240"></label>
                <label>璁惧涓诲浘<select v-model="modelDraft.configuration.machine_asset_id" :disabled="!canEdit(modelDraft)"><option value="">娌跨敤瀹樼綉鍘熷浘</option><option v-for="asset in reviewedMediaAssets('product')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
                <label class="full">浠嬬粛姝ｆ枃<textarea v-model="modelDraft.configuration.intro.body" :disabled="!canEdit(modelDraft)" rows="4" maxlength="4000"></textarea></label>
              </div>
            </section>
            <p v-else class="read-only-note">褰撳墠鍨嬪彿鍦ㄥ畼缃戜娇鐢ㄢ€滃瀷鍙峰鑸笌鏍稿績鑳藉姏鈥濇ā鏉匡紝娌℃湁宸ヤ綔绔欎粙缁嶅睍绀轰綅銆?/p>
            <section class="section-editor" aria-labelledby="model-features-title">
              <div class="section-heading"><div><p class="eyebrow">浜у搧鐗圭偣</p><h4 id="model-features-title">鐗规€ч」鐩?/h4><p>姣忛」鍙互閰嶇疆鏍囬銆佽鏄庡拰宸插鏍稿浘鐗囷紱瀹樼綉鍘熸湁鍗＄墖甯冨眬涓嶅彉銆?/p></div><button type="button" :disabled="!canEdit(modelDraft)" @click="addModelFeature">鏂板鐗圭偣</button></div>
              <article v-for="(feature, index) in modelDraft.configuration.features" :key="`feature-${index}`" class="section-card">
                <div class="section-card-heading"><strong>鐗圭偣 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelFeature(index)">鍒犻櫎</button></div>
                <div class="field-grid"><label>鏍囬<input v-model.trim="feature.label" :disabled="!canEdit(modelDraft)" required maxlength="120"></label><label>鍥剧墖<select v-model="feature.media_asset_id" :disabled="!canEdit(modelDraft)"><option value="">涓嶄娇鐢ㄥ浘鐗?/option><option v-for="asset in productFeatureMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelDrawingMediaAssetLabel(asset) }}</option></select></label><label class="full">璇︾粏璇存槑<textarea v-model="feature.detail" :disabled="!canEdit(modelDraft)" rows="2" maxlength="1000"></textarea></label><label class="full">琛ュ厖澶囨敞<input v-model.trim="feature.note" :disabled="!canEdit(modelDraft)" maxlength="300"></label></div>
              </article>
            </section>
            <section class="section-editor" aria-labelledby="model-drawings-title">
              <div class="section-heading"><div><p class="eyebrow">灏哄涓庡伐绋嬪浘</p><h4 id="model-drawings-title">灏哄鍥?/h4></div><button type="button" :disabled="!canEdit(modelDraft)" @click="addModelDrawing">鏂板灏哄鍥?/button></div>
              <article v-for="(drawing, index) in modelDraft.configuration.drawings" :key="`drawing-${index}`" class="section-card">
                <div class="section-card-heading"><strong>灏哄鍥?{{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelDrawing(index)">鍒犻櫎</button></div>
                <div class="field-grid"><label>鏍囬<input v-model.trim="drawing.title" :disabled="!canEdit(modelDraft)" maxlength="120"></label><label>鍥剧墖<select v-model="drawing.media_asset_id" :disabled="!canEdit(modelDraft)" required><option value="">閫夋嫨浜у搧鍥剧墖锛堝凡鍙戝竷鎴栦粎鍐呴儴棰勮鑽夌锛?/option><option v-for="asset in productDrawingMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelDrawingMediaAssetLabel(asset) }}</option></select></label><label class="full">鍥剧墖璇存槑<input v-model.trim="drawing.caption" :disabled="!canEdit(modelDraft)" maxlength="500"></label></div>
              </article>
            </section>
            <section class="section-editor" aria-labelledby="model-resources-title">
              <div class="section-heading"><div><p class="eyebrow">涓嬭浇璧勬枡</p><h4 id="model-resources-title">浜у搧璧勬枡閾炬帴</h4></div><button type="button" :disabled="!canEdit(modelDraft)" @click="addModelResource">鏂板璧勬枡</button></div>
              <article v-for="(resource, index) in modelDraft.resources" :key="`resource-${index}`" class="section-card">
                <div class="section-card-heading"><strong>璧勬枡 {{ index + 1 }}</strong><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelResource(index)">鍒犻櫎</button></div>
                <div class="field-grid"><label>鏍囬<input v-model.trim="resource.title" :disabled="!canEdit(modelDraft)" required maxlength="160"></label><label>绫诲瀷<input v-model.trim="resource.type" :disabled="!canEdit(modelDraft)" maxlength="80" placeholder="璇存槑涔︺€佸昂瀵稿浘"></label><label class="full">浜у搧闄勪欢<select v-model="resource.media_asset_id" :disabled="!canEdit(modelDraft)"><option value="">涓嶄娇鐢ㄥ凡涓婁紶闄勪欢</option><option v-for="asset in productResourceMediaAssets()" :key="asset.id" :value="String(asset.id)">{{ modelResourceMediaAssetLabel(asset) }}</option></select></label><label class="full">绔欏唴鏂囦欢鎴?HTTPS 鍦板潃锛堜笉閫夐檮浠舵椂濉啓锛?input v-model.trim="resource.url" :disabled="!canEdit(modelDraft)" maxlength="1000" placeholder="/assets/... 鎴?https://..."></label></div>
              </article>
            </section>
            <section class="media-reference-editor" aria-label="鍨嬪彿鍙楁帶濯掍綋">
              <div class="section-card-heading"><strong>鍙楁帶鍨嬪彿濯掍綋</strong><span>{{ modelDraft.mediaReferences.length }}</span></div>
              <div class="media-reference-add"><select v-model="modelMediaSelection" :disabled="!canEdit(modelDraft)"><option value="">閫夋嫨宸插彂甯冧骇鍝佺礌鏉?/option><option v-for="asset in reviewedMediaAssets('product')" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select><button type="button" :disabled="!canEdit(modelDraft) || !modelMediaSelection" @click="addModelMediaReference">娣诲姞</button></div>
              <p v-if="!reviewedMediaAssets('product').length" class="form-help">鏆傛棤宸插彂甯冪殑浜у搧绱犳潗銆傝鍏堝湪鈥滃獟浣撹祫浜р€濅腑瀹屾垚鐧昏銆佸鏍稿拰鍙戝竷銆?/p>
              <div v-for="reference in modelDraft.mediaReferences" :key="reference.media_asset_id" class="media-reference-row"><span>{{ mediaReferenceLabel(reference, 'product') }}</span><button type="button" class="text-action danger" :disabled="!canEdit(modelDraft)" @click="removeModelMediaReference(reference.media_asset_id)">绉婚櫎</button></div>
            </section>
            <div class="form-actions"><a :href="nativeItemPath('product_models', modelDraft.id)">鎵撳紑楂樼骇璁剧疆鏌ョ湅閰嶇疆涓庣礌鏉?/a><button class="primary-action" type="submit" :disabled="saving || !canEdit(modelDraft)">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨鍨嬪彿淇℃伅' }}</button></div>
          </form>
          <div v-else class="empty">璇烽€夋嫨涓€涓骇鍝佸瀷鍙枫€?/div>
        </div>

        <section v-if="modelDraft" class="parameters-panel" aria-labelledby="parameters-title">
          <div class="section-heading"><div><p class="eyebrow">鎶€鏈弬鏁?/p><h3 id="parameters-title">鐙珛鎶€鏈弬鏁?/h3><p>鍙傛暟鐙珛淇濆瓨锛屼究浜庡鏍搞€佸姣斿拰缁熶竴鍙戝竷銆?/p></div><strong>{{ parameters.length }}</strong></div>
          <p v-if="parametersLoading" class="message">姝ｅ湪鍔犺浇鍙傛暟...</p>
          <div v-else class="table-wrap">
            <table>
              <thead><tr><th>瀛楁鍚嶇О</th><th>鏁板€?/th><th>鍗曚綅</th><th>娴嬭瘯鏉′欢</th><th>鎺掑簭</th><th></th></tr></thead>
              <tbody>
                <tr v-for="parameter in parameters" :key="parameter.id">
                  <td><input v-model.trim="parameter.field_name" :disabled="!canEdit(parameter)" maxlength="160" required @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.trim="parameter.value" :disabled="!canEdit(parameter)" maxlength="500" required @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.trim="parameter.unit" :disabled="!canEdit(parameter)" maxlength="80" @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.trim="parameter.test_conditions" :disabled="!canEdit(parameter)" maxlength="1000" @input="markParameterDirty(parameter)"></td>
                  <td><input v-model.number="parameter.sort_order" :disabled="!canEdit(parameter)" type="number" min="0" step="1" @input="markParameterDirty(parameter)"></td>
                  <td><button type="button" class="text-action" :disabled="saving || !canEdit(parameter)" @click="saveParameter(parameter)">淇濆瓨</button></td>
                </tr>
                <tr v-if="!parameters.length"><td colspan="6" class="table-empty">褰撳墠鍨嬪彿鏆傛棤鐙珛鍙傛暟銆?/td></tr>
              </tbody>
            </table>
          </div>
          <form v-if="canEdit(modelDraft)" class="new-parameter" @submit.prevent="createParameter">
            <h4>鏂板鎶€鏈弬鏁?/h4>
            <div class="field-grid parameter-fields"><label>瀛楁鍚嶇О<input v-model.trim="newParameter.field_name" required maxlength="160"></label><label>鏁板€?input v-model.trim="newParameter.value" required maxlength="500"></label><label>鍗曚綅<input v-model.trim="newParameter.unit" maxlength="80"></label></div>
            <div class="form-actions"><span></span><button class="primary-action" type="submit" :disabled="saving">鏂板鍙傛暟</button></div>
          </form>
        </section>
      </section>

      <aside v-if="liveWebsitePreviewVisible && websitePreviewAvailable" class="live-website-preview" :class="{ 'visual-property-panel-open': selectedVisualElement }" aria-label="瀹樼綉瀹炴椂棰勮">
        <header class="visual-editor-toolbar" aria-label="鐢诲竷缂栬緫宸ュ叿鏍?>
          <div class="visual-editor-brand"><span class="visual-editor-icon" aria-hidden="true">R</span><div><p class="eyebrow">瀹樼綉鐢诲竷缂栬緫</p><strong>{{ previewTitle }}</strong></div></div>
          <div class="visual-editor-tools" role="toolbar" aria-label="缂栬緫宸ュ叿">
            <button type="button" :class="{ active: visualTool === 'select' }" :disabled="!visualCanvasEditable" title="閫夋嫨鍏冪礌" @click="visualTool = 'select'; visualEditMode = true; postLivePreviewUpdate()">鈫?span>閫夋嫨</span></button>
            <button type="button" :class="{ active: visualTool === 'text' }" :disabled="!visualCanvasEditable" title="閫夋嫨鏂囧瓧鍏冪礌" @click="visualTool = 'text'; visualEditMode = true; postLivePreviewUpdate()">T<span>鏂囧瓧</span></button>
            <button type="button" :class="{ active: visualTool === 'media' }" :disabled="!visualCanvasEditable" title="閫夋嫨鍥剧墖鎴栬棰? @click="visualTool = 'media'; visualEditMode = true; postLivePreviewUpdate()">鈻?span>濯掍綋</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" :class="{ active: visualDevice === 'desktop' }" title="妗岄潰鐢诲竷" @click="setVisualDevice('desktop')">鈻?span>妗岄潰</span></button>
            <button type="button" :class="{ active: visualDevice === 'tablet' }" title="骞虫澘鐢诲竷" @click="setVisualDevice('tablet')">鈻?span>骞虫澘</span></button>
            <button type="button" :class="{ active: visualDevice === 'mobile' }" title="鎵嬫満鐢诲竷" @click="setVisualDevice('mobile')">鈻?span>鎵嬫満</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" title="鎾ら攢" :disabled="!visualCanvasEditable || !canUndo" @click="undoVisualChange">鈫?span>鎾ら攢</span></button>
            <button type="button" title="閲嶅仛" :disabled="!visualCanvasEditable || !canRedo" @click="redoVisualChange">鈫?span>閲嶅仛</span></button>
            <i class="toolbar-divider" aria-hidden="true"></i>
            <button type="button" :disabled="!visualCanvasEditable" title="姘村钩灞呬腑" @click="alignVisualElement('center')">鈫?span>灞呬腑</span></button>
            <button type="button" @click="fitVisualCanvas(true)">閫傚簲绐楀彛</button>
            <label class="zoom-control" title="鐢诲竷缂╂斁">缂╂斁 <input v-model.number="visualZoom" type="range" min="0.05" max="1" step="0.01"><output>{{ Math.round(visualZoom * 100) }}%</output></label>
          </div>
          <div class="visual-editor-actions">
            <label v-if="websitePreviewTarget?.collection === 'articles'" class="visual-record-switcher">鏂伴椈鐢诲竷
              <select :value="articlePreviewSurface" aria-label="鏂伴椈鐢诲竷" @change="switchArticlePreviewSurface($event.target.value)">
                <option value="detail">璇︽儏鐢诲竷</option>
                <option value="list">鍒楄〃鍗＄墖鐢诲竷</option>
              </select>
            </label>
            <template v-if="livePreviewRootSlug === 'news' || (websitePreviewTarget?.collection === 'pages' && websitePreviewTarget?.record?.slug === 'news')">
              <button type="button" :disabled="!visualCanvasEditable" @click="createEditorialFromCanvas('video')">鏂板瑙嗛鍒嗕韩</button>
              <button type="button" :disabled="!visualCanvasEditable" @click="createEditorialFromCanvas('news')">鏂板缓鍔ㄦ€佹柊闂?/button>
            </template>
            <label v-if="visualRecordChoices.length > 1" class="visual-record-switcher">鏉＄洰
              <select :value="String(websitePreviewTarget?.record?.id || '')" aria-label="鍒囨崲棰勮鏉＄洰" @change="handleVisualPreviewRecordChange($event)">
                <option v-for="choice in visualRecordChoices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
              </select>
            </label>
            <span class="visual-selected-label" :title="selectedVisualElement?.label || '鏈€夋嫨鍏冪礌'">{{ selectedVisualElement?.label || '鏈€夋嫨鍏冪礌' }}</span>
            <span v-if="unsavedDraftCount" class="visual-unsaved-count" title="褰撳墠椤甸潰杩樻湁杩欎簺鏉＄洰娌′繚瀛橈細閫愪釜鐐广€屼繚瀛樺綋鍓嶆潯鐩€嶏紝鎴栫瓑鏁撮〉鎵归噺淇濆瓨涓婄嚎">{{ `鏈〉鏈繚瀛?${unsavedDraftCount} 椤筦 }}</span>
            <span :data-state="livePreviewStatus">{{ livePreviewStatusLabel }}</span>
            <button type="button" class="visual-mode-button" :class="{ 'visual-edit-active': visualEditMode }" :disabled="!visualCanvasEditable" :title="visualCanvasEditable ? (visualEditMode ? '鍏抽棴 PC 鐢诲竷缂栬緫' : '寮€鍚?PC 鐢诲竷缂栬緫') : '褰撳墠绐楀彛浠呮敮鎸佸彧璇婚瑙?" @click="toggleVisualEditMode">{{ visualCanvasEditable ? (visualEditMode ? '缂栬緫涓? : '缂栬緫妯″紡') : '鍙棰勮' }}</button>
            <button type="button" class="visual-save-button" :disabled="saving || batchSaving || (!hasUnsavedChanges && !unsavedDraftCount && selectedVisualRecord?.collection !== 'articles')" :title="toolbarSaveTitle" @click="handleToolbarSave">{{ toolbarSaveLabel }}</button>
            <button v-if="selectedVisualRecord?.collection === 'articles'" type="button" class="secondary-action" @click="deleteSelectedVisualArticle">鍒犻櫎褰撳墠鏉＄洰</button>
            <button type="button" :disabled="!hasUnsavedChanges" title="鍙栨秷鏈繚瀛樹慨鏀? @click="discardVisualChanges">鍙栨秷</button>
            <button type="button" title="鍒囨崲鐢诲竷涓撴敞妯″紡" @click="visualCanvasFocus = !visualCanvasFocus">{{ visualCanvasFocus ? '閫€鍑虹敾甯? : '涓撴敞鐢诲竷' }}</button>
            <button type="button" title="閲嶆柊杩炴帴瀹炴椂棰勮" aria-label="閲嶆柊杩炴帴瀹炴椂棰勮" @click="reconnectLiveWebsitePreview">鈫?/button>
            <button type="button" title="鍏抽棴瀹炴椂棰勮" aria-label="鍏抽棴瀹炴椂棰勮" @click="liveWebsitePreviewVisible = false">脳</button>
          </div>
        </header>
        <p v-if="livePreviewError" class="live-preview-error">{{ livePreviewError }}</p>
        <div ref="canvasViewport" class="visual-canvas-viewport" :style="{ '--visual-zoom': visualZoom, '--canvas-width': visualCanvasWidth, '--canvas-height': visualCanvasHeight }">
          <iframe ref="livePreviewFrame" name="ruijun-live-website-preview" title="瀹樼綉瀹炴椂棰勮" @load="handleLivePreviewFrameLoad"></iframe>
        </div>
        <aside v-if="selectedVisualElement" class="visual-property-panel" aria-label="閫変腑鍏冪礌灞炴€?>
          <div class="visual-property-heading"><div><p class="eyebrow">閫変腑鍏冪礌</p><strong>{{ selectedVisualElement.label }}</strong></div><button type="button" title="鍏抽棴灞炴€ч潰鏉? aria-label="鍏抽棴灞炴€ч潰鏉? @click="selectedVisualElement = null">脳</button></div>
          <p class="visual-property-source">{{ visualSelectionSource(selectedVisualElement) }}</p>
          <details v-if="selectedVisualRecord?.collection === 'articles' && editorialDraft" class="visual-article-meta" open @focusin="ensureArticleDraftActive">
            <summary>鏂囩珷淇℃伅锛堝鏍稿繀濉級</summary>
            <label>SEO 鏍囬<input v-model.trim="editorialDraft.seo.title" maxlength="160"></label>
            <label>SEO 鎻忚堪<textarea v-model.trim="editorialDraft.seo.description" rows="2" maxlength="300"></textarea></label>
            <label>鏉ユ簮鍦板潃<input v-model.trim="editorialDraft.source_url" maxlength="500" placeholder="https://..."></label>
            <label>鏉ユ簮鏂囦欢<input v-model.trim="editorialDraft.source_document" maxlength="500" placeholder="鏂囦欢鍚嶆垨鏉ユ簮璇存槑"></label>
            <p class="visual-property-help">杩欎簺瀛楁涓庣敾甯冧慨鏀逛竴璧峰啓鍏ユ枃绔犺崏绋匡紝淇濆瓨璇风敤椤堕儴銆屼繚瀛樿崏绋裤€嶃€?/p>
          </details>
          <p v-if="selectedVisualElement.readonly" class="visual-property-help">{{ selectedVisualElement.readonlyReason || '姝ゅ厓绱犲綋鍓嶆病鏈夊彲鍐欏叆鐨勫獟浣撹褰曘€? }}</p>
          <template v-else>
            <label v-if="selectedVisualFieldOptions.length" class="visual-property-field">鍐呭绫诲瀷<select :value="selectedVisualFieldValue" @change="commitVisualField($event.target.value)"><option v-for="option in selectedVisualFieldOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
            <label v-else-if="selectedVisualElement.fieldPath && (selectedVisualElement.elementType === 'text' || selectedVisualElement.elementType === 'button')" class="visual-property-field">鏂囧瓧鍐呭<textarea :value="selectedVisualFieldValue" rows="4" :maxlength="selectedVisualFieldMaxLength" @input="commitVisualField($event.target.value)"></textarea></label>
            <label v-if="selectedVisualElement.elementType === 'button' && selectedVisualElement.linkFieldPath" class="visual-property-field">鎸夐挳閾炬帴<input aria-label="鎸夐挳閾炬帴" :value="selectedVisualLinkValue" maxlength="1000" placeholder="渚嬪锛?contact 鎴?#reasons" @input="commitVisualLink($event.target.value)"></label>
            <label v-if="selectedVisualIsMedia && visualMediaReplacementOptions.length" class="visual-property-field">濯掍綋鏇挎崲<select :value="visualMediaSelection" @change="replaceVisualMedia($event.target.value)"><option value="">{{ selectedVisualCanRestoreDefault ? (selectedVisualElement.elementType === 'video' ? '娌跨敤瀹樼綉鍘熻棰? : '娌跨敤瀹樼綉鍘熷浘') : '閫夋嫨绯荤粺涓殑濯掍綋' }}</option><optgroup v-if="visualMediaAssets.length" label="褰撳墠灞曠ず浣嶅彲鐢?><option v-for="asset in visualMediaAssets" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup><optgroup v-if="visualMediaFallbackOptions.length" label="绯荤粺涓殑鍏朵粬濯掍綋"><option v-for="asset in visualMediaFallbackOptions" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup><optgroup v-if="visualStagingMediaAssets.length" label="鏈彂甯冪礌鏉愶紙浠呭唴閮ㄩ瑙堬級"><option v-for="asset in visualStagingMediaAssets" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></optgroup></select></label>
            <p v-if="selectedVisualIsMedia && visualStagingMediaAssets.length" class="visual-property-help">鏈彂甯冪礌鏉愬彧鍦ㄥ凡鐧诲綍鍚庡彴鐨勫疄鏃堕瑙堜腑鏄剧ず锛涘獟浣撲笂浼犲嵆鍙戝竷锛屾甯镐笉浼氬嚭鐜拌繖涓€缁勩€?/p>
            <p v-else-if="selectedVisualIsMedia && !visualMediaReplacementOptions.length" class="visual-property-help">寰呭獟浣擄細褰撳墠绯荤粺閲屾病鏈夊悓绫诲瀷鐨勫凡鍙戝竷濯掍綋銆傚彲浠ュ湪涓嬫柟涓婁紶锛屾垨鍏堝埌鈥滃獟浣撹祫浜р€濅笂浼犮€?/p>
            <div v-if="selectedVisualIsMedia" class="visual-media-tools">
              <label class="visual-upload">涓婁紶骞舵浛鎹?input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" :disabled="visualUploading || !visualCanvasEditable" @change="uploadVisualMedia"></label>
              <template v-if="selectedVisualMediaAsset">
                <label>鍗＄墖鏍囬锛堢礌鏉愭爣棰橈級<input v-model.trim="visualMediaDraft.title" maxlength="160"></label>
                <p class="visual-property-help">淇敼鏍囬鍚庣偣鈥滀繚瀛樼礌鏉愪俊鎭€濓紝瀹樼綉鍗＄墖鏍囬浼氬悓姝ユ洿鏂般€?/p>
                <label>鏇夸唬鏂囨湰<input v-model.trim="visualMediaDraft.alt_text" maxlength="300"></label>
                <label v-if="selectedVisualMediaAsset.media_type === 'video'">瀛楀箷鎴栨枃瀛楃<textarea v-model.trim="visualMediaDraft.transcript" rows="2" maxlength="20000"></textarea></label>
                <label v-if="selectedVisualMediaAsset.media_type === 'video'">灏侀潰<select v-model="visualMediaDraft.poster_asset_id"><option value="">鏈缃紙瀹樼綉鏄剧ず瑙嗛棣栧抚锛?/option><option v-for="poster in mediaPosterOptions(selectedVisualMediaAsset)" :key="poster.id" :value="String(poster.id)">{{ videoPosterAssetLabel(poster) }}</option></select></label>
                <label>鐗堟潈鐘舵€?select v-model="visualMediaDraft.copyright_status"><option value="owned">鑷湁绱犳潗</option><option value="licensed">宸茶幏璁稿彲</option><option value="authorized">宸叉巿鏉冨叕寮€</option><option value="pending_review">寰呯‘璁?/option></select></label>
                <button type="button" :disabled="visualMediaSaving" @click="saveVisualMediaAttributes">{{ visualMediaSaving ? '淇濆瓨涓?..' : '淇濆瓨绱犳潗淇℃伅' }}</button>
              </template>
              <button v-if="selectedVisualElement.mediaAssetId && !selectedVisualIsArticleBodyImage" type="button" class="visual-card-delete" :disabled="visualMediaSaving" @click="deleteSelectedVideoShareCard">鍒犻櫎杩欏紶瑙嗛鍒嗕韩鍗＄墖</button>
              <button v-if="selectedVisualIsArticleBodyImage" type="button" class="visual-card-delete" :disabled="visualMediaSaving || saving" @click="deleteSelectedArticleBodyImage">鍒犻櫎杩欑瘒姝ｆ枃鍥剧墖</button>
            </div>
            <button v-if="selectedVisualRecord?.collection === 'articles' || selectedVisualElement?.collection === 'articles'" type="button" class="visual-card-delete" :disabled="saving" @click="deleteSelectedVisualArticle">鍒犻櫎杩欑瘒鍔ㄦ€佹柊闂?/button>
            <div v-if="selectedVisualListReorder" class="visual-list-order"><span>褰撳墠绗?{{ selectedVisualListReorder.index + 1 }} 椤癸紝鍏?{{ selectedVisualListReorder.length }} 椤?/span><div><button type="button" @click="addSelectedVisualListItem">鏂板</button><button type="button" @click="duplicateSelectedVisualListItem">澶嶅埗</button><button type="button" :disabled="selectedVisualListReorder.length <= 1" @click="removeSelectedVisualListItem">鍒犻櫎</button><button type="button" :disabled="selectedVisualListReorder.index === 0" @click="moveSelectedVisualListItem(-1)">涓婄Щ</button><button type="button" :disabled="selectedVisualListReorder.index === selectedVisualListReorder.length - 1" @click="moveSelectedVisualListItem(1)">涓嬬Щ</button></div></div>
            <div class="visual-property-grid"><label>姘村钩鍋忕Щ<input v-model.number="visualPosition.x" type="number" min="-30" max="30" step="0.1" @change="commitVisualPosition"></label><label>鍨傜洿鍋忕Щ<input v-model.number="visualPosition.y" type="number" min="-30" max="30" step="0.1" @change="commitVisualPosition"></label></div>
            <div class="visual-property-grid"><label>瀛楀彿<input v-model.number="visualTextStyle.fontSize" type="number" min="10" max="120" step="1" @change="commitVisualTextStyle"></label><label>瀛楅噸<select v-model="visualTextStyle.fontWeight" @change="commitVisualTextStyle"><option value="400">姝ｅ父</option><option value="500">涓瓑</option><option value="600">鍗婄矖</option><option value="700">绮椾綋</option></select></label></div>
            <div class="visual-property-grid"><label>琛岄珮<input v-model.number="visualTextStyle.lineHeight" type="number" min="1" max="2.2" step="0.05" @change="commitVisualTextStyle"></label><label>鏂囧瓧棰滆壊<input v-model="visualTextStyle.textColor" type="color" @change="commitVisualTextStyle"></label></div>
            <p class="visual-property-help">鍙繚瀛樺彈鎺у瓧娈碉紝涓嶄細淇敼 Nuxt 妯℃澘鎴栧啓鍏ヤ换鎰?CSS銆?/p>
          </template>
          <!-- Save right where the edit happens: the operator had to travel back to the
               toolbar every time, which made a one-field change feel expensive. -->
          <div class="visual-property-save">
            <button type="button" class="primary-action" title="鍙繚瀛樺綋鍓嶉€変腑鐨勮繖涓€鏉¤褰? :disabled="saving || (!hasUnsavedChanges && selectedVisualRecord?.collection !== 'articles')" @click="openSaveNameDialog">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨褰撳墠鏉＄洰' }}</button>
            <button type="button" class="secondary-action" :disabled="!hasUnsavedChanges" @click="discardVisualChanges">鍙栨秷淇敼</button>
            <span class="visual-property-save-state" :class="{ pending: hasUnsavedChanges }">{{ hasUnsavedChanges ? '鏈夋湭淇濆瓨淇敼' : '宸蹭繚瀛? }}</span>
          </div>
        </aside>
      </aside>

      <div v-if="seriesCreateOpen" class="cms-create-backdrop" @click.self="closeSeriesCreateDialog">
        <section class="cms-create-dialog" role="dialog" aria-modal="true" aria-label="鏂板绯诲垪鍗＄墖">
          <p class="eyebrow">鏂板绯诲垪鍗＄墖</p>
          <label>绯诲垪鍚嶇О<input v-model.trim="seriesCreateDraft.name" maxlength="120" placeholder="渚嬪锛欶R (pro)"></label>
          <label>绯诲垪缂栫爜<input v-model.trim="seriesCreateDraft.code" maxlength="80" placeholder="渚嬪锛歠t-pro锛堝皬鍐欏瓧姣嶃€佹暟瀛椼€佽繛瀛楃锛? @input="seriesCodeTouched = true"></label>
          <p class="form-help">绯诲垪缂栫爜鐢ㄤ簬鍏宠仈鏈哄瀷銆佸弬鏁板拰璇︽儏銆傝緭鍏ヨ嫳鏂囧悕绉版椂浼氳嚜鍔ㄥ缓璁紙濡?FT (Pro) 鈫?ft-pro锛夛紝鍙墜鍔ㄤ慨鏀癸紱涓枃鍚嶇О璇锋墜鍔ㄥ～鍐欒嫳鏂囩紪鐮併€?/p>
          <label>瀹氫綅鏂囨<input v-model.trim="seriesCreateDraft.positioning" maxlength="120" placeholder="鍗＄墖宸︿笂瑙掔殑涓€鍙ヨ瘽瀹氫綅"></label>
          <label>鍗＄墖灏侀潰<select v-model="seriesCreateDraft.coverAssetId"><option value="">绋嶅悗鍦ㄩ€夋嫨鍣ㄩ噷琛ュ厖</option><option v-for="asset in seriesCreateCoverOptions" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
          <p class="form-help">纭鍚庝細绔嬪嵆鍒涘缓涓€寮犺崏绋垮崱鐗囷紙浠呯敾甯冨彲瑙侊級锛岄殢鍚庡彲缁х画琛ュ厖鏈哄瀷涓庤鎯呫€?/p>
          <p v-if="seriesCreateError" class="save-name-error">{{ seriesCreateError }}</p>
          <div class="form-actions"><span></span><div class="review-actions"><button type="button" class="secondary-action" :disabled="seriesCreateSaving" @click="closeSeriesCreateDialog">鍙栨秷</button><button type="button" class="primary-action" :disabled="seriesCreateSaving || !seriesCreateDraft.name.trim()" @click="confirmSeriesCreate">{{ seriesCreateSaving ? '姝ｅ湪鍒涘缓...' : '纭鍒涘缓' }}</button></div></div>
        </section>
      </div>
      <div v-if="createArticleOpen" class="cms-create-backdrop" @click.self="closeCreateArticle">
        <section class="cms-create-dialog" role="dialog" aria-modal="true" :aria-label="createArticleCategory === 'video' ? '鏂板瑙嗛鍒嗕韩' : '鏂板鍔ㄦ€佹柊闂?">
          <p class="eyebrow">{{ createArticleCategory === 'video' ? '鏂板瑙嗛鍒嗕韩' : '鏂板鍔ㄦ€佹柊闂? }}</p>
          <label>鏍囬<input v-model.trim="createArticleTitle" maxlength="240" placeholder="璇疯緭鍏ユ爣棰?></label>
          <label>濯掍綋<select v-model="createArticleMediaId"><option value="">绋嶅悗鍦ㄨ鎯呯敾甯冭ˉ鍏?/option><option v-for="asset in createArticleMediaOptions" :key="asset.id" :value="String(asset.id)">{{ mediaAssetLabel(asset) }}</option></select></label>
          <p class="form-help">{{ createArticleCategory === 'video' ? '鍙洿鎺ラ€夋嫨绯荤粺閲屽凡鏈夌殑瑙嗛锛涗篃鍙互绋嶅悗涓婁紶鎴栨浛鎹€? : '鍙€夋嫨宸叉湁鍥剧墖浣滀负灏侀潰锛涗篃鍙互绋嶅悗琛ュ厖銆? }}</p>
          <div class="form-actions"><span></span><div class="review-actions"><button type="button" class="secondary-action" @click="closeCreateArticle">鍙栨秷</button><button type="button" class="primary-action" :disabled="createArticleSaving || !createArticleTitle.trim()" @click="confirmCreateArticle">{{ createArticleSaving ? '姝ｅ湪鍒涘缓...' : '鍒涘缓' }}</button></div></div>
        </section>
      </div>

      <section v-if="previewOpen" class="preview-panel" role="region" aria-labelledby="draft-preview-title">
        <section class="preview-dialog" aria-labelledby="draft-preview-title">
          <header class="preview-dialog-heading">
            <div><p class="eyebrow">鑽夌棰勮</p><h3 id="draft-preview-title">{{ previewTitle }}</h3></div>
            <button type="button" class="preview-close" aria-label="鍏抽棴棰勮" @click="closePreview">鍏抽棴</button>
          </header>
          <p class="preview-notice">杩欐槸褰撳墠琛ㄥ崟鍐呭鐨勬湰鍦伴瑙堬紝涓嶄細鍙戝竷鍒板畼缃戯紱甯︹€滃緟瀹℃牳鈥濇爣璁扮殑鍐呭浠嶄笉鑳藉叕寮€銆?/p>

          <article v-if="previewKind === 'page'" class="site-preview page-preview">
            <div class="preview-hero"><span>椤甸潰棰勮</span><h4>{{ pageDraft.title || '鏈懡鍚嶉〉闈? }}</h4><p>{{ pageDraft.seo.description || '灏氭湭濉啓椤甸潰鎻忚堪' }}</p></div>
            <section v-for="(section, index) in pageDraft.sections" :key="`${section.id}-${index}`" class="preview-section">
              <small>{{ section.kicker || `绗?${index + 1} 娈礰 }}</small><h5>{{ section.title || '鏈懡鍚嶆钀? }} <em v-if="section.requires_claim_review">寰呭鏍?/em></h5><p>{{ section.body || '灏氭湭濉啓姝ｆ枃' }}</p>
            </section>
          </article>

          <article v-else-if="previewKind === 'article'" class="site-preview article-preview">
            <p class="preview-category">{{ editorialDraft.category || '鏈垎绫? }}</p><h4>{{ editorialDraft.title || '鏈懡鍚嶆枃绔? }}</h4><div class="preview-body">{{ editorialDraft.body || '灏氭湭濉啓姝ｆ枃' }}</div>
          </article>

          <article v-else-if="previewKind === 'series'" class="site-preview product-preview">
            <p class="preview-category">浜у搧绯诲垪</p><h4>{{ seriesDraft.name || '鏈懡鍚嶇郴鍒? }}</h4><p>{{ seriesDraft.positioning || '灏氭湭濉啓绯诲垪瀹氫綅' }}</p><div class="preview-columns"><section><strong>搴旂敤鍦烘櫙</strong><ul><li v-for="item in fromTextList(seriesDraft.scenariosText)" :key="item">{{ item }}</li><li v-if="!fromTextList(seriesDraft.scenariosText).length">灏氭湭濉啓</li></ul></section><section><strong>鏍稿績鑳藉姏</strong><ul><li v-for="item in fromTextList(seriesDraft.capabilitiesText)" :key="item">{{ item }}</li><li v-if="!fromTextList(seriesDraft.capabilitiesText).length">灏氭湭濉啓</li></ul></section></div>
          </article>

          <article v-else-if="previewKind === 'model'" class="site-preview product-preview">
            <p class="preview-category">{{ modelDraft.series_code || '浜у搧鍨嬪彿' }}</p><h4>{{ modelDraft.name || '鏈懡鍚嶅瀷鍙? }}</h4><p>鍨嬪彿缂栫爜锛歿{ modelDraft.model_code || '鏈～鍐? }}</p><table><thead><tr><th>鍙傛暟</th><th>鏁板€?/th><th>鍗曚綅</th></tr></thead><tbody><tr v-for="parameter in parameters" :key="parameter.id"><td>{{ parameter.field_name }}</td><td>{{ parameter.value }}</td><td>{{ parameter.unit || '-' }}</td></tr><tr v-if="!parameters.length"><td colspan="3">灏氭湭濉啓鎶€鏈弬鏁?/td></tr></tbody></table>
          </article>

          <div v-else class="preview-empty">褰撳墠鍐呭绫诲瀷鏆備笉鏀寔鐢婚潰棰勮銆傝鍏堜繚瀛樿崏绋匡紝鍐嶇敱瀵瑰簲椤甸潰鐨勯瑙堝叆鍙ｆ鏌ユ渶缁堝睍绀恒€?/div>
        </section>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="saveNameDialogOpen" class="save-name-backdrop" @click.self="closeSaveNameDialog">
        <form class="save-name-dialog" @submit.prevent="confirmSaveNameDialog">
          <p class="eyebrow">{{ saveNameMode === 'batch' ? '淇濆瓨骞堕€佸' : '淇濆瓨鑽夌' }}</p>
          <h3>{{ saveNameMode === 'batch' ? '缁欒繖娆￠€佸璧蜂釜鍚嶅瓧' : '缁欒繖娆′繚瀛樿捣涓悕瀛? }}</h3>
          <p class="form-help">{{ saveNameMode === 'batch' ? '鏈淇濆瓨鐨勬墍鏈夋潯鐩細鍚堝苟鎴愪竴鏉￠€佸璁板綍锛屽鏍稿拰鍙戝竷閮芥寜杩欎竴鎵瑰鐞嗐€? : '榛樿鍚嶇О宸插～濂斤紝鍙互鐩存帴淇濆瓨锛屼篃鍙互淇敼鍚庡啀淇濆瓨銆? }}</p>
          <ul v-if="saveNameMode === 'batch' && batchMemberLabels.length" class="batch-member-list"><li v-for="label in batchMemberLabels" :key="label">{{ label }}</li></ul>
          <label>{{ saveNameMode === 'batch' ? '閫佸鍚嶇О' : '淇濆瓨鍚嶇О' }}<input v-model.trim="saveNameDraft" maxlength="160" autofocus></label>
          <p v-if="saveNameError" class="save-name-error">{{ saveNameError }}</p>
          <div class="form-actions">
            <button type="button" class="secondary-action" :disabled="saving" @click="closeSaveNameDialog">鍙栨秷</button>
            <button type="submit" class="primary-action" :disabled="saving">{{ saving ? '淇濆瓨涓?..' : '淇濆瓨' }}</button>
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
  'home:hero': '棣栭〉棣栧睆鏍囬',
  'home:why-ruijun': '涓夊ぇ鐞嗙敱鎬绘爣棰?,
  'home:performance': '涓夊ぇ鐞嗙敱锛氬鏁堥檷鎹?,
  'home:advanced-manufacturing': '涓夊ぇ鐞嗙敱锛氬厛杩涙櫤閫?,
  'home:industry-leadership': '涓夊ぇ鐞嗙敱锛氳涓氶鍏?,
  'home:products': '棣栭〉浜у搧灞曠ず',
  'home:history': '棣栭〉鍝佺墝鏃堕棿杞?,
  'home:product-task': '棣栭〉搴曢儴琛屽姩鍖?,
  'product:hero': '浜у搧椤甸灞忔爣棰?,
  'product:categories': '浜у搧鐞嗙敱鎬绘爣棰?,
  'product:proof-efficiency': '浜у搧鎸囨爣锛氬鏁堥檷鎹?,
  'product:proof-years': '浜у搧鎸囨爣锛氬埗閫犵粡楠?,
  'product:proof-champion': '浜у搧鎸囨爣锛氳涓氳〃鐜?,
  'product:model-list': '浜у搧绯诲垪鍒楄〃鏍囬',
  'product:parameters': '鎶€鏈弬鏁版爣棰?,
  'product:dimensions': '灏哄涓庤祫鏂欐爣棰?,
  'product:pagination': '浜у搧鍒嗛〉鏂囧瓧',
  'about:hero': '鍏充簬鐟為挧棣栧睆',
  'about:brand-story': '鍝佺墝鏁呬簨',
  'about:overview': '鍏徃绠€浠?,
  'about:history': '鍝佺墝鏃堕棿杞?,
  'about:factory': '鍘傚尯椋庤矊鍥惧簱',
  'about:certificates': '璁よ瘉璇佷功鍥惧簱',
  'about:honors': '鑽ｈ獕璇佷功鍥惧簱',
  'about:patents': '涓撳埄璇佷功鍥惧簱',
  'about:partners': '鍚堜綔鍝佺墝涓庝緵搴斿晢',
  'about:clients-domestic': '鍥藉唴瀹㈡埛鏍囬涓庡浘搴?,
  'about:clients-global': '鍥藉瀹㈡埛鏍囬涓庡浘搴?
});
const repairPageKeys = new Set(['repair_home', 'repair_new', 'repair_warranty', 'repair_progress']);
const repairActionCodes = new Set(['01', '02', '09', '10']);
const activeTab = ref('home');
const siteArea = ref('home');

const siteAreaLabel = computed(() => siteAreaLabels[siteArea.value] || '瀹樼綉鏍忕洰');
function pageDisplayName(page) {
  const slug = String(page?.slug || '').trim();
  if (slug === 'home') return '缃戠珯涓婚〉';
  return siteAreaLabels[slug] || String(page?.title || slug || '鏈懡鍚嶉〉闈?);
}
function syncSiteAreaForPage(page) {
  const slug = String(page?.slug || '').trim();
  if (Object.hasOwn(siteAreaLabels, slug)) siteArea.value = slug;
}

const siteAreaContentEntries = computed(() => siteAreaContentMap[siteArea.value] || []);
function siteAreaEntryDescription(entry) {
  const descriptions = {
    '棣栭〉瑙嗛': '淇敼瀹樼綉棣栭〉棣栧睆瑙嗛銆佸皝闈㈠拰棣栧睆鏂囧瓧銆?,
    '涓夊ぇ鐗圭偣': '淇敼棣栭〉涓夊ぇ鐞嗙敱鐨勬爣棰樸€佹鏂囧拰灞曠ず绱犳潗銆?,
    '浜у搧绯诲垪灞曠ず鍥?: '淇敼棣栭〉浜у搧绯诲垪鐨勫浘鐗囥€佸悕绉板拰灞曠ず椤哄簭銆?,
    '鏃堕棿杞?: '淇敼棣栭〉鏃堕棿杞磋儗鏅€佸勾浠姐€侀噷绋嬬鍜岃鏄庛€?,
    '閫夊瀷鍜ㄨ': '淇敼棣栭〉搴曢儴鑱旂郴鍖虹殑鏍囬銆佽鏄庡拰鎸夐挳閾炬帴銆?,
    '浜у搧璧勬枡鍖烘爣棰?: '淇敼浜у搧璧勬枡鍖哄煙鐨勪腑鑻辨枃鏍囬锛涘叿浣撹祫鏂欓摼鎺ュ湪鈥滀骇鍝佺郴鍒椾笌鍨嬪彿鈥濅腑缁存姢銆?,
    '搴旂敤妗堜緥鍖烘爣棰?: '淇敼搴旂敤妗堜緥鍖哄煙鐨勪腑鑻辨枃鏍囬锛涘叿浣撴渚嬪唴瀹归渶鍏堝缓绔嬪苟鍏宠仈鐪熷疄妗堜緥璁板綍銆?
  };
  const manufacturingDescriptions = {
    '鍒堕€犻灞?: '淇敼鍒堕€犻〉棣栧睆鏍囬銆佽鏄庡拰鑳屾櫙濯掍綋銆?,
    '宸ヨ壓娴佺▼鐢诲竷': '淇敼宸ヨ壓鑺傜偣鏍囬銆佹鏂囥€佽繛鎺ユ爣绛惧拰鑺傜偣濯掍綋銆?,
    'CNC杞﹂棿': '淇敼 CNC 杞﹂棿鏍囬銆佹鏂囥€佹牳蹇冭澶囪鏄庡拰鍥剧墖銆?,
    '閽ｉ噾杞﹂棿': '淇敼閽ｉ噾杞﹂棿鏍囬銆佹鏂囥€佹牳蹇冭澶囪鏄庡拰鍥剧墖銆?,
    '瑁呴厤杞﹂棿': '淇敼瑁呴厤杞﹂棿鏍囬銆佹鏂囧拰灞曠ず鍥剧墖銆?,
    '绮惧瘑妫€娴?: '淇敼绮惧瘑妫€娴嬫爣棰樸€佹鏂囧拰妫€娴嬭澶囧浘鐗囥€?,
    '鐢垫皵瑁呴厤': '淇敼鐢垫皵瑁呴厤鏍囬銆佹鏂囧拰灞曠ず鍥剧墖銆?,
    '鏅鸿兘鐗╂枡浠撳偍': '淇敼鏅鸿兘鐗╂枡浠撳偍鏍囬銆佹鏂囧拰灞曠ず鍥剧墖銆?,
    '鐢熶骇鏍稿績璁惧': '淇敼鐢熶骇鏍稿績璁惧鏍囬銆佸垎椤垫暟閲忓拰璁惧鍥惧簱銆?
  };
  return descriptions[entry.label] || manufacturingDescriptions[entry.label] || '鎵撳紑璇ユ爮鐩搴旂殑鍐呭銆佸浘鐗囨垨璧勬枡銆?;
}
const technicalAccess = ref(false);
// Submitting a draft for review is an editor's routine step, not an administrator
// tool, so the 鍐呭閫佸 entry cannot live inside the administrator-only advanced
// group. Without it the tab was rendered but unreachable 鈥?no navigation anywhere
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
// actually changed, otherwise the top "淇濆瓨鑽夌" saved only the model and the
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
// client-side 鈥?the API cannot sort by date_updated here because that field is
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
    const category = String(definition.category || '鍏朵粬');
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
      kind: definition ? definition.label : '妯℃澘鏍忕洰',
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
  if (!section) return '椤甸潰娈佃惤';
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
// 鐢诲竷鏍归〉闈笉闅忊€滈€変腑鍏冪礌/鍒囨崲鏉＄洰鈥濆彉鍖栵紱杩欎袱涓寜閽繀椤昏窡鏍归〉闈㈣蛋锛?
// 鍚﹀垯閫変腑鏂囩珷鎴栬棰戝悗 websitePreviewTarget 鍙樻垚 articles/media锛屾寜閽細娑堝け銆?
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
const previewTitle = computed(() => ({ page: pageDisplayName(pageDraft.value), article: editorialDraft.value?.title, series: seriesDraft.value?.name, model: modelDraft.value?.name }[previewKind.value] || '褰撳墠鑽夌'));
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
  idle: '绛夊緟杩炴帴', opening: '姝ｅ湪鎵撳紑', connected: '瀹炴椂鍚屾', syncing: '姝ｅ湪鍚屾', error: '杩炴帴澶辫触'
})[livePreviewStatus.value] || '绛夊緟杩炴帴');
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
  // the whole page out (26% 鈫?~16%) the moment an editor selects a field, so
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
  // 瑙嗛鏂囩珷璇︽儏涓殑濯掍綋鑺傜偣娌℃湁椤甸潰 section 灞炴€э紱瀹冧粛蹇呴』浣跨敤
  // 瑙嗛鍒嗕韩鐨勫彈鎺у睍绀轰綅锛屽惁鍒欑敾甯冧細閿欒鏄剧ず鈥滃緟濯掍綋鈥濄€?
  // video_url 鏄棫瑙嗛鏂囩珷鐨勫厹搴曠粦瀹氾紝鍙兘钀藉湪 <img> 涓婏紙elementType=image/cover锛夛紝
  // 涓嶈兘鍙 video 鍏冪礌锛屽惁鍒欒繖绫绘枃绔犵殑鐢诲竷閫変笉鍒颁换浣曞凡鏈夌礌鏉愩€?
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
// 灞曠ず浣嶈繃婊や负绌烘椂锛屼粛鐒跺厑璁歌繍钀ヤ粠绯荤粺閲岄€夋嫨鍚岀被鍨嬬殑宸插彂甯冨獟浣撱€?
// 杩欐牱瑙嗛鍒嗕韩鍗＄墖鍜岄〉闈㈣棰戞Ы閮借兘澶嶇敤濯掍綋璧勪骇锛岃€屼笉鏄彧鑳介噸鏂颁笂浼犮€?
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
    // 瑙嗛鍒嗕韩鍗＄墖鍙互鎹㈡垚鍙︿竴鏉¤棰戝垎浜礌鏉愶紙浼氫繚鐣欏綋鍓嶅崱鐗囧苟鍚堝苟鎺夋簮绱犳潗锛夛紝
    // 涔熷彲浠ユ崲鎴愬皻鏈垎閰嶅睍绀轰綅鐨勮棰戙€?
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
// 鐢诲竷鍐呯礌鏉愭搷浣滐細閫変腑濯掍綋鍏冪礌鍚庣洿鎺ヤ笂浼犳浛鎹紝骞剁紪杈戠礌鏉愯嚜韬睘鎬с€?
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
      { value: 'news', label: '鍔ㄦ€佹柊闂? }
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
// "鏈〉鏈繚瀛?N 椤?: every cached draft that differs from its saved baseline,
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
  if (collection === 'pages') return `椤甸潰锛?{entry?.page?.title || entry?.page?.slug || rawId}`;
  if (collection === 'homepage_sections') return `棣栭〉鍖哄潡锛?{entry?.section?.title || entry?.section?.section_key || rawId}`;
  if (collection === 'product_series') return `浜у搧绯诲垪锛?{entry?.series?.name || entry?.series?.series_code || rawId}`;
  if (collection === 'product_models') return `浜у搧鍨嬪彿锛?{entry?.model?.name || entry?.model?.model_code || rawId}`;
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
  return `璇ュ唴瀹瑰綋鍓嶄负銆?{statusLabel(record?.status)}銆嶏紝涓嶈兘鐩存帴淇濆瓨銆傝鍏堝湪銆屽唴瀹瑰彂甯冮槦鍒椼€嶆妸瀹冮€€鍥炶崏绋垮悗鍐嶄慨鏀广€俙;
}

function confirmPublishedRevision(record, label = '杩欐潯鍐呭') {
  if (!isPublishedRecord(record) || skipPublishedRevisionPrompt) return true;
  return window.confirm(`${label}褰撳墠宸插彂甯冦€備繚瀛樹細鐢熸垚涓€鐗堟柊鐨勮崏绋夸慨璁紝瀹樼綉鍦ㄩ噸鏂板鏍稿彂甯冨墠缁х画鏄剧ず鏃х増鏈€傜‘璁や繚瀛橈紵`);
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
  return String(record?.name || record?.title || record?.event || record?.field_name || record?.model_code || record?.series_code || '褰撳墠鏉＄洰');
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
  if (!activeIsDirty && !pendingKeys.length) { message.value = '褰撳墠椤甸潰娌℃湁鏈繚瀛樼殑淇敼銆?; return; }
  // Preflight before the first write: a record in review/scheduled cannot be
  // saved, and discovering that halfway through used to leave a half-applied
  // batch. Abort before touching anything.
  const targets = [
    ...(activeIsDirty ? [{ label: '褰撳墠鏉＄洰', record: currentDraftRecord() }] : []),
    ...pendingKeys.map((key) => ({ label: cachedDraftReportLabel(key), record: cachedDraftRecord(key), key }))
  ];
  const blocked = targets.filter((target) => target.record && !canEdit(target.record));
  if (blocked.length) {
    error.value = `鎵规鏈紑濮嬶細${blocked.map((target) => `${target.label}锛?{statusLabel(target.record.status)}锛塦).join('銆?)} 褰撳墠涓嶅彲淇濆瓨銆傝鍏堝湪銆屽唴瀹瑰彂甯冮槦鍒椼€嶉€€鍥炶崏绋垮悗鍐嶈瘯銆俙;
    message.value = '';
    return;
  }
  const publishedTargets = targets.filter((target) => isPublishedRecord(target.record));
  if (publishedTargets.length && !window.confirm(`鏈壒娆℃湁 ${publishedTargets.length} 椤瑰凡鍙戝竷鍐呭銆備繚瀛樹細涓哄畠浠敓鎴愭柊鐨勮崏绋夸慨璁紝瀹樼綉鍦ㄩ噸鏂板鏍稿彂甯冨墠缁х画鏄剧ず鏃х増鏈€傜‘璁ょ户缁紵`)) return;
  skipPublishedRevisionPrompt = true;
  batchSaving.value = true;
  error.value = ''; message.value = `姝ｅ湪鍚堝苟鎻愪氦鏈〉鏀瑰姩锛?{batchId}锛夆€;
  const failures = [];
  const savedItems = [];
  let savedCount = 0;
  let failedLabel = '';
  try {
    if (activeIsDirty) {
      await saveVisualDraft();
      if (error.value) { failures.push('褰撳墠鏉＄洰'); failedLabel = '褰撳墠鏉＄洰'; } else {
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
      if (!activated) { failures.push(`${label}锛堝凡璺宠繃锛塦); failedLabel = label; break; }
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
  message.value = `宸蹭繚瀛?${savedCount} 椤硅褰?{failures.length ? `锛屽け璐?${failures.length} 椤筦 : ''}銆俙;
  if (failures.length) {
    error.value = `鎵规宸插仠姝細${failedLabel || failures[0]} 淇濆瓨澶辫触銆傛鍓嶅凡淇濆瓨鐨?${savedCount} 椤逛笉浼氳嚜鍔ㄥ洖婊氾紱璇蜂慨姝ｅ悗閲嶆柊淇濆瓨鍓╀綑椤广€俙;
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
      message.value = `${message.value}宸茬敓鎴愰€佸鎵规銆?{name}銆嶏紝鍏?${savedItems.length} 椤广€俙;
    } catch {
      message.value = `${message.value}锛堝唴瀹瑰凡淇濆瓨锛屼絾閫佸鎵规鍒涘缓澶辫触锛岃閲嶆柊淇濆瓨浠ョ敓鎴愭壒娆★級`;
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
  if (!confirmDiscardChanges('鍙栨秷鏈繚瀛樹慨鏀?)) return;
  const baseline = cloneVisualSnapshot(savedDraftSnapshot.value);
  if (baseline == null) return;
  applyVisualState(baseline);
  selectedVisualElement.value = null;
  message.value = '宸插彇娑堟湭淇濆瓨淇敼锛屽苟鎭㈠鍒版渶杩戜竴娆℃垚鍔熶繚瀛樼殑鑽夌銆?;
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
  return `${String(editorialDraft.value?.title || '鏈懡鍚嶆枃绔?).trim()} ${stamp}`.slice(0, 160);
}

const toolbarSaveLabel = computed(() => {
  if (batchSaving.value) return '鏁撮〉淇濆瓨涓?..';
  if (selectedVisualRecord.value?.collection === 'articles') return '淇濆瓨鑽夌';
  return unsavedDraftCount.value ? `淇濆瓨鑽夌锛?{unsavedDraftCount.value} 椤癸級` : '淇濆瓨鑽夌';
});
const toolbarSaveTitle = computed(() => (selectedVisualRecord.value?.collection === 'articles'
  ? '淇濆瓨褰撳墠鏂囩珷鑽夌'
  : `淇濆瓨鏈〉鎵€鏈夋湭淇濆瓨鏉＄洰锛堝叡 ${unsavedDraftCount.value} 椤癸級`));
// Toolbar button: the article flow needs the naming dialog, everything else saves
// the whole page (B3).
function handleToolbarSave() {
  if (activeTab.value === 'editorial' && editorialDraft.value?.id) { openSaveNameDialog(); return; }
  if (!hasUnsavedChanges.value && !unsavedDraftCount.value) { message.value = '褰撳墠椤甸潰娌℃湁鏈繚瀛樼殑淇敼銆?; return; }
  openBatchSubmissionDialog();
}

function defaultBatchSubmissionName(firstLabel = '', count = 0) {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const suffix = firstLabel ? ` 路 ${firstLabel}${count > 1 ? ` 绛?{count}椤筦 : ''}` : '';
  return `${siteAreaLabel.value || '瀹樼綉鍐呭'}${suffix} ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function openBatchSubmissionDialog() {
  if (saving.value || batchSaving.value) return;
  const labels = [
    ...(hasUnsavedChanges.value ? [currentDraftLabel()] : []),
    ...dirtyCachedDraftKeys().map((key) => cachedDraftReportLabel(key))
  ].filter(Boolean);
  batchMemberLabels.value = [...new Set(labels)];
  if (!batchMemberLabels.value.length) { message.value = '褰撳墠椤甸潰娌℃湁鏈繚瀛樼殑淇敼銆?; return; }
  saveNameMode.value = 'batch';
  saveNameDraft.value = defaultBatchSubmissionName(batchMemberLabels.value[0], batchMemberLabels.value.length);
  saveNameError.value = '';
  saveNameDialogOpen.value = true;
}

function openSaveNameDialog() {
  if (saving.value) return;
  // 鐢诲竷椤堕儴鐨勪繚瀛樻寜閽笉涓€瀹氬凡缁忛€変腑鏌愪釜瑙嗚鍏冪礌锛涘彧瑕佸綋鍓嶇紪杈戠殑鏄?
  // articles 鑽夌锛屽氨蹇呴』寮瑰嚭鍛藉悕瀵硅瘽妗嗭紝涓嶈兘鍥犱负 selectedVisualRecord 涓虹┖
  // 鑰岄€€鍥炵洿鎺ヤ繚瀛橈紙鍚﹀垯鑷畾涔夊悕绉版案杩滀笉浼氬啓鍏?publication_log锛夈€?
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
  if (!name) { saveNameError.value = '璇峰～鍐欏悕绉般€?; return; }
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
    message.value = `${message.value}锛堝凡鐢熸垚鑽夌淇锛屽畼缃戦渶閲嶆柊瀹℃牳鍙戝竷鍚庢洿鏂帮級`;
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
    error.value = '璇疯緭鍏ユ湁鏁堟暟鍊兼垨绗﹀悎瀛楁鏍煎紡鐨勫唴瀹广€?;
    return;
  }
  if (error.value === '璇疯緭鍏ユ湁鏁堟暟鍊兼垨绗﹀悎瀛楁鏍煎紡鐨勫唴瀹广€?) error.value = '';
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
    error.value = '鎸夐挳閾炬帴鍙兘浣跨敤绔欏唴璺緞銆侀〉闈㈤敋鐐规垨 HTTPS 鍦板潃銆?;
    return;
  }
  if (!setVisualFieldValue(selectedVisualTarget.value, path, normalized)) return;
  if (error.value === '鎸夐挳閾炬帴鍙兘浣跨敤绔欏唴璺緞銆侀〉闈㈤敋鐐规垨 HTTPS 鍦板潃銆?) error.value = '';
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
  message.value = '宸叉柊澧炰竴椤圭┖鐧芥潯鐩紝濉啓鍚庝繚瀛樿崏绋垮嵆鍙€?;
}

function removeSelectedVisualListItem() {
  const record = selectedVisualRecord.value?.record || websitePreviewTarget.value?.record;
  const target = selectedVisualTarget.value;
  const element = selectedVisualElement.value;
  const fieldPath = String(element?.fieldPath || '').trim();
  const reorder = getVisualListReorder(target, fieldPath);
  if (!record || !target || !element || !reorder || !canEdit(record) || reorder.length <= 1) return;
  if (!window.confirm(`纭鍒犻櫎褰撳墠绗?${reorder.index + 1} 椤瑰悧锛熻鎿嶄綔浼氬湪淇濆瓨鑽夌鍚庣敓鏁堛€俙)) return;
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

// 瑙嗛鍒嗕韩鍗＄墖鏈韩灏辨槸涓€涓棰戠礌鏉愶紝娌℃湁鏂囩珷/椤甸潰瀛楁鍙啓銆傞€夋嫨绯荤粺閲岀殑
// 鍙︿竴鏉¤棰戞椂锛屾妸鍗＄墖绱犳潗鏇挎崲鎺夛細淇濈暀鍘熷崱鐗囩殑鏍囬涓庡睍绀鸿缃紝鎶婃柊绱犳潗
// 绾冲叆瑙嗛鍒嗕韩浣嶇疆锛屽苟鍒犻櫎鏃х礌鏉愶紝閬垮厤瀹樼綉鍑虹幇涓ゅ紶鍗°€?
async function replaceVideoShareCardMedia(oldMediaAssetId, newMediaAssetId) {
  const oldId = String(oldMediaAssetId || '').trim();
  const newId = String(newMediaAssetId || '').trim();
  if (!oldId || !newId || oldId === newId) return false;
  const all = [...mediaAssets.value, ...mediaCandidates.value];
  const oldAsset = all.find((asset) => String(asset.id) === oldId);
  const newAsset = all.find((asset) => String(asset.id) === newId);
  if (!oldAsset || !newAsset) {
    error.value = '鎵句笉鍒拌鏇挎崲鐨勮棰戠礌鏉愶紝璇峰埛鏂板悗閲嶈瘯銆?;
    return false;
  }
  if (String(newAsset.media_type || '').toLowerCase() !== 'video') {
    error.value = '瑙嗛鍒嗕韩鍗＄墖鍙兘鏇挎崲涓鸿棰戠礌鏉愩€?;
    return false;
  }
  const newPlacement = String(newAsset.placement_key || '');
  if (newPlacement && newPlacement !== 'news.video_share.list') {
    error.value = '杩欎釜瑙嗛宸茬粡鐢ㄤ簬鍏朵粬瀹樼綉浣嶇疆锛屼笉鑳界洿鎺ユ敼鎴愯棰戝垎浜€傝鍏堝湪濯掍綋璧勪骇閲屼笂浼犱竴鏉¤棰戝垎浜笓鐢ㄨ棰戙€?;
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
      error.value = apiError(reason, '鏂拌棰戝凡鐢ㄤ簬褰撳墠鍗＄墖锛屼絾鍘熺礌鏉愯褰曚粛琚叾浠栧唴瀹瑰紩鐢紝鏈垹闄ゃ€?);
    }
    const oldFileStillUsed = [...mediaAssets.value, ...mediaCandidates.value]
      .some((asset) => String(asset.file_id || '') === oldFileId && String(asset.id) !== oldId);
    if (oldFileId && oldFileId !== newAsset.file_id && !oldFileStillUsed) {
      try { await api.delete(`/files/${encodeURIComponent(oldFileId)}`); } catch { /* keep the new file usable even if old-file cleanup fails */ }
    }
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
    visualMediaSelection.value = oldId;
    message.value = '瑙嗛宸叉浛鎹紝浠嶄繚鐣欏師鍗＄墖銆?;
    return true;
  } catch (reason) {
    error.value = apiError(reason, '鏇挎崲瑙嗛澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
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
    error.value = '姝ｆ枃鍥剧墖鍙兘鏇挎崲涓哄浘鐗囩礌鏉愩€?;
    return false;
  }
  const container = document.createElement('div');
  container.innerHTML = String(draft.body);
  const image = [...container.querySelectorAll('img')]
    .find((node) => String(node.getAttribute('data-cms-preview-media-asset-id') || '') === oldId);
  if (!image) {
    error.value = '姝ｆ枃涓壘涓嶅埌杩欏紶鍥剧墖鐨勫彈鎺ц褰曪紱璇烽噸鏂板鍏?Word 鏂囨。銆?;
    return false;
  }
  const nextPath = `/api/public/v1/media/asset/${encodeURIComponent(String(newAsset.file_id))}`;
  image.setAttribute('src', nextPath);
  image.setAttribute('data-cms-preview-media-role', 'image');
  image.setAttribute('data-cms-preview-field-path', 'body');
  image.setAttribute('data-cms-preview-media-asset-id', newId);
  image.setAttribute('data-cms-preview-placement-key', 'news.article.body');
  if (!String(image.getAttribute('alt') || '').trim()) image.setAttribute('alt', String(newAsset.alt_text || newAsset.title || '姝ｆ枃鍥剧墖'));
  draft.body = container.innerHTML;
  visualMediaSelection.value = newId;
  error.value = '';
  message.value = '姝ｆ枃鍥剧墖宸叉浛鎹紝淇濆瓨鑽夌鍚庡畼缃戠敓鏁堛€?;
  queueLivePreviewUpdate(selectedVisualRecord.value);
  return true;
}

function replaceVisualMedia(selectedValue) {
  // 涓嶈兘渚濊禆 v-model 鐨勬洿鏂版椂闂达細@change 鍙兘鍏堜簬 v-model 鎵ц锛岃鍒版棫鍊间細璁?
  // 鈥滄崲浜嗙礌鏉愨€濆疄闄呬粛鍐欏洖鍘熺礌鏉愩€傜敱璋冪敤鏂规樉寮忎紶鍏ユ湰娆￠€夋嫨鐨勫€笺€?
  const assetId = String(selectedValue ?? visualMediaSelection.value ?? '').trim();
  let visualRecord = selectedVisualRecord.value;
  let record = visualRecord?.record || websitePreviewTarget.value?.record;
  const collection = visualRecord?.collection || websitePreviewTarget.value?.collection || '';
  let target = selectedVisualTarget.value;
  let path = String(selectedVisualElement.value?.fieldPath || '').trim();
  const videoShareCardAssetId = String(selectedVisualElement.value?.mediaAssetId || '').trim();
  // 鍔ㄦ€佹柊闂诲崱鐗囧皝闈㈣蛋 cover_asset銆傜敾甯冮€変腑鐨勬槸鍒楄〃缂撳瓨璁板綍鏃讹紝涓嶈兘鍙敼
  // 棰勮瀵硅薄锛涘繀椤诲悓鏃跺啓杩涘綋鍓?editorialDraft锛屽惁鍒欎繚瀛樿崏绋夸粛璇绘棫鍊笺€?
  if (collection === 'articles' && path === 'cover_asset') {
    if (!/^[1-9]\d*$/.test(assetId)) return;
    if (!editorialDraft.value?.id) { error.value = '璇峰厛鍦ㄥ乏渚ф墦寮€杩欑瘒鏂囩珷鐨勮崏绋裤€?; return; }
    editorialDraft.value.cover_asset = assetId;
    if (target && typeof target === 'object') target.cover_asset = assetId;
    visualMediaSelection.value = assetId;
    error.value = '';
    message.value = '灏侀潰宸查€夋嫨锛屼繚瀛樺唴瀹硅崏绋垮悗瀹樼綉鐢熸晥銆?;
    recordVisualHistory();
    queueLivePreviewUpdate({ collection: 'articles', record: editorialDraft.value });
    return;
  }
  // 鏂囩珷姝ｆ枃鍐呰仈鍥撅細鏇挎崲鐨勬槸 article.body 閲岀殑鍙楁帶 <img>锛屼笉鏄〉闈㈠獟浣撳瓧娈点€?
  if (selectedVisualIsArticleBodyImage.value) {
    if (!assetId) return;
    void replaceArticleBodyImage(videoShareCardAssetId, assetId);
    return;
  }
  // 瑙嗛鍒嗕韩鍗＄墖鐨?media 瀛楁璺緞鍙槸鐢诲竷鍗忚鍗犱綅锛堣閫変腑璇锋眰鍚堟硶锛夛紝鐪熸鍐欏叆
  // 鐨勭洰鏍囨槸 media_assets 璁板綍锛涘繀椤诲厛浜庨〉闈㈠瓧娈靛啓鍏ュ鐞嗐€?
  if (videoShareCardAssetId) {
    if (!assetId) return;
    void replaceVideoShareCardMedia(videoShareCardAssetId, assetId);
    return;
  }
  // 椤甸潰鍖哄潡鐨勫獟浣撳彲鑳芥潵鑷嫭绔嬪獟浣撲綅锛堜緥濡傝棰戞柊闂婚灞忥級锛岀敾甯冧笂鍙湁
  // 娓叉煋鑺傜偣鑰屾病鏈?fieldPath銆傛鏃舵妸閫夋嫨缁撴灉鍐欏叆璇ュ尯鍧楃殑 media 寮曠敤锛?
  // 淇濆瓨椤甸潰鑽夌鍚庡畼缃戝嵆鍙娇鐢ㄨ繖鏉＄郴缁熷獟浣撱€?
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
      message.value = '宸查€夋嫨绯荤粺濯掍綋锛屼繚瀛橀〉闈㈣崏绋垮悗瀹樼綉鐢熸晥銆?;
      recordVisualHistory();
      postLivePreviewUpdate(selectedVisualRecord.value);
      queueLivePreviewUpdate(selectedVisualRecord.value);
      return;
    }
  }
  // 鏃ц棰戞枃绔犲彧鏈?video_url锛涢€変腑绱犳潗鏃舵敼鍐欐垚鍙楃 media[0]锛屼笉瑕佸啓鍥炲瓧绗︿覆 URL銆?
  const upgradingLegacyVideo = collection === 'articles' && path === 'video_url';
  if (upgradingLegacyVideo) path = 'media.0.media_asset_id';
  const mediaSlot = selectedVisualElement.value?.mediaSlot || '';
  const canRestoreDefault = canRestoreVisualMediaDefault(selectedVisualElement.value, collection, path);
  const isClearingGovernedSlot = !assetId && /^action-[1-8]$/.test(String(mediaSlot));
  if ((!assetId && !isClearingGovernedSlot && !canRestoreDefault) || !record || !target || !canEdit(record)) return;
  if (!path) {
    error.value = '杩欎釜瑙嗛娌℃湁鍙啓鍏ョ殑椤甸潰濯掍綋浣嶇疆銆傝棰戝垎浜崱鐗囪浠庘€滆棰戞柊闂?鈫?瑙嗛鍒嗕韩鍐呭鈥濅慨鏀广€?;
    return;
  }
  // 鐢诲竷閫変腑鐨勬槸鍒楄〃閲岀殑鏂囩珷鏃讹紝蹇呴』鍏堟妸瀹冨垏鎴愬綋鍓嶇紪杈戣崏绋匡紱鍚﹀垯鏀瑰姩钀藉湪
  // 鍒楄〃缂撳瓨涓婏紝editorialDraft 娌″彉锛屼繚瀛樿崏绋挎寜閽細涓€鐩存槸鐏扮殑銆?
  if (collection === 'articles' && (activeTab.value !== 'editorial' || String(editorialDraft.value?.id || '') !== String(record.id || ''))) {
    const activated = activateVisualEditingTarget({ collection, itemId: record.id, fieldPath: path, sectionKey: selectedVisualElement.value?.sectionKey || '' });
    if (!activated?.record || activeTab.value !== 'editorial') {
      error.value = '鏃犳硶鎶婅鏂囩珷鍒囨崲涓哄綋鍓嶈崏绋匡紝璇蜂粠宸︿晶鈥滄枃绔?瑙嗛鍒嗕韩鈥濆垪琛ㄩ噸鏂伴€変腑鍚庡啀璇曘€?;
      return;
    }
    // activate 杩斿洖鐨勬槸鍒楄〃璁板綍锛涚湡姝ｈ鏀圭殑鏄?selectEditorialRecord 寤哄ソ鐨勮崏绋裤€?
    record = editorialDraft.value || activated.record;
    if (String(record.id || '') !== String(activated.record.id || '')) {
      error.value = '鏂囩珷鑽夌娌℃湁姝ｇ‘杞藉叆锛岃鍒锋柊宸ヤ綔鍙板悗閲嶈瘯銆?;
      return;
    }
    target = record;
    visualRecord = { collection, record };
  } else if (collection === 'articles' && editorialDraft.value) {
    // 鍗充娇閫変簡鍒楄〃缂撳瓨璁板綍锛屼篃寮哄埗鍐欒繘褰撳墠鑽夌锛屼繚璇佷繚瀛樻寜閽兘鎰熺煡淇敼銆?
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
  if (!applyVisualMediaReplacement(target, path, assetId, { mediaSlot, allowEmpty: canRestoreDefault })) { error.value = '鏃犳硶鍐欏叆璇ュ獟浣撲綅缃紝璇峰埛鏂板悗閲嶈瘯锛涜嫢鎸佺画鍑虹幇璇锋敼鐢ㄥ乏渚ц〃鍗曘€?; return; }
  if (upgradingLegacyVideo) target.video_url = '';
  recordVisualHistory();
  if (livePreviewFrame.value?.contentWindow && livePreviewWebsiteOrigin.value) livePreviewFrame.value.contentWindow.postMessage(payload, livePreviewWebsiteOrigin.value);
  visualMediaSelection.value = assetId;
  queueLivePreviewUpdate(visualRecord);
}

// 鐢诲竷鍐呬笂浼狅細濯掍綋宸插彇娑堝鏍革紝涓婁紶鍗冲彂甯冿紝闅忓悗鐩存帴鏇挎崲褰撳墠閫変腑鍏冪礌銆?
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
    error.value = '褰撳墠鐢诲竷浣嶇疆娌℃湁鍖归厤鐨勫彈鎺у睍绀轰綅锛屾棤娉曠洿鎺ヤ笂浼狅紱璇峰厛鍦ㄣ€屽獟浣撹祫浜с€嶄笂浼犲苟閫夋嫨灞曠ず浣嶃€?;
    reset();
    return;
  }
  if (!scope) { error.value = '鏃犳硶纭畾绱犳潗鐢ㄩ€旇寖鍥达紝璇峰厛鍦ㄣ€屽獟浣撹祫浜с€嶄笂浼犮€?; reset(); return; }
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
    if (!uploaded?.id || !uploaded.filename_download || !uploaded.type) throw new Error('涓婁紶鎺ュ彛鏈繑鍥炲畬鏁寸殑鏂囦欢淇℃伅');
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
    if (!isArticleBodyImage) message.value = '绱犳潗宸蹭笂浼犲苟鍙戝竷锛屽凡鏇挎崲褰撳墠鐢诲竷鍐呭銆?;
  } catch (reason) {
    error.value = apiError(reason, '涓婁紶绱犳潗澶辫触锛岀敾甯冨唴瀹规湭淇敼銆?);
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
    message.value = '绱犳潗淇℃伅宸蹭繚瀛橈紱宸插彂甯冪礌鏉愪笉浼氬洜姝や笅绾裤€?;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    // 鍗＄墖鏍囬鐩存帴鍙栧獟浣撹褰?title锛屽埛鏂扮敾甯冩墠鑳界湅鍒版敼鍚嶇粨鏋溿€?
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '绱犳潗淇℃伅淇濆瓨澶辫触銆?);
  } finally {
    visualMediaSaving.value = false;
  }
}

async function deleteMediaAsset(asset) {
  const id = String(asset?.id || '').trim();
  if (!id) return;
  const label = asset.title || asset.original_file_name || `#${id}`;
  if (!window.confirm(`纭畾鍒犻櫎绱犳潗銆?{label}銆嶅悧锛焅n鍒犻櫎鍓嶄細妫€鏌ユ槸鍚︿粛琚唴瀹瑰紩鐢紱琚紩鐢ㄦ椂浼氳鎷掔粷銆俙)) return;
  error.value = ''; message.value = '';
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: id });
    message.value = `绱犳潗銆?{label}銆嶅凡鍒犻櫎銆俙;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  } catch (reason) {
    error.value = apiError(reason, '鍒犻櫎绱犳潗澶辫触銆?);
  }
}

// 鐢诲竷鍐呯Щ闄わ細鍙В缁戝綋鍓嶅唴瀹归噷鐨勫獟浣撳紩鐢紝绱犳潗鏈韩淇濈暀锛岄殢鑽夌涓€璧蜂繚瀛樸€?
function removeVisualMedia() {
  const record = selectedVisualRecord.value?.record;
  const target = selectedVisualTarget.value;
  const path = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (!record || !target || !path || !canEdit(record)) return;
  if (path === 'video_url') {
    target.video_url = '';
  } else if (!applyVisualMediaReplacement(target, path, '', { mediaSlot: selectedVisualElement.value?.mediaSlot || '', allowEmpty: true })) {
    error.value = '鏃犳硶娓呴櫎璇ュ獟浣撲綅缃紝璇峰埛鏂板悗閲嶈瘯銆?;
    return;
  }
  visualMediaSelection.value = '';
  recordVisualHistory();
  queueLivePreviewUpdate(selectedVisualRecord.value);
  message.value = '宸蹭粠褰撳墠鍐呭绉婚櫎濯掍綋锛岃寰椾繚瀛樿崏绋裤€?;
}

// 鐢诲竷鍐呭垹闄ょ礌鏉愶細鍏堜粠褰撳墠鍐呭瑙ｇ粦骞朵繚瀛橈紝鍐嶅皾璇曞垹闄ょ礌鏉愶紱浠嶈鍏朵粬鍐呭寮曠敤鏃朵繚鐣欑礌鏉愩€?
async function deleteVisualMediaAsset() {
  const asset = selectedVisualMediaAsset.value;
  if (!asset) return;
  const label = asset.title || asset.original_file_name || `#${asset.id}`;
  if (!window.confirm(`浠庡綋鍓嶅唴瀹圭Щ闄ゅ苟鍒犻櫎绱犳潗銆?{label}銆嶅悧锛焅n鑻ヤ粛琚叾浠栧唴瀹瑰紩鐢紝绱犳潗浼氫繚鐣欍€俙)) return;
  removeVisualMedia();
  if (error.value) return;
  await saveVisualDraft();
  if (error.value) return;
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: String(asset.id) });
    message.value = `绱犳潗銆?{label}銆嶅凡浠庡綋鍓嶅唴瀹圭Щ闄ゅ苟鍒犻櫎銆俙;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  } catch (reason) {
    error.value = apiError(reason, '绱犳潗浠嶈鍏朵粬鍐呭寮曠敤锛屽凡浠庡綋鍓嶅唴瀹圭Щ闄わ紝浣嗙礌鏉愭湭鍒犻櫎銆?);
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
  return window.confirm(`褰撳墠鍐呭鏈夋湭淇濆瓨鐨勪慨鏀广€傜‘瀹氳${action}鍚楋紵鏈繚瀛樺唴瀹瑰皢涓㈠け銆俙);
}

function clearVisualSelection() {
  selectedVisualElement.value = null;
  visualMediaSelection.value = '';
}

function visualRecordLabel(collection, record) {
  if (collection === 'homepage_sections') return record.title || record.section_key || '棣栭〉鐙珛鍖哄潡';
  if (collection === 'pages') return pageDisplayName(record);
  if (collection === 'product_series') return record.name || record.series_code || '鏈懡鍚嶄骇鍝佺郴鍒?;
  if (collection === 'product_models') return record.name || record.model_code || '鏈懡鍚嶅瀷鍙?;
  if (collection === 'milestones') return `${record.year || '鏈～鍐?} 骞?- ${record.event || '鏈～鍐欎簨浠?}`;
  if (collection === 'qualifications') return record.name || record.source_key || '鏈懡鍚嶈祫璐?;
  if (collection === 'manufacturing_evidence') return record.process || record.source_key || '鏈懡鍚嶅埗閫犺瘉鎹?;
  if (collection === 'service_locations') return [record.region, record.city].filter(Boolean).join(' - ') || '鏈懡鍚嶆湇鍔＄綉鐐?;
  if (collection === 'service_resources') return record.title || record.source_key || '鏈懡鍚嶆湇鍔¤祫婧?;
  if (collection === 'external_service_entries') return record.entry_type || record.url || '鏈懡鍚嶆湇鍔″叆鍙?;
  if (collection === 'repair_page_configs') return record.title || record.page_key || '鏈懡鍚嶅敭鍚庨〉闈?;
  if (collection === 'knowledge_items') return record.question_title || record.source_key || '鏈懡鍚嶇煡璇嗘潯鐩?;
  return record.title || record.name || record.slug || record.source_key || '鏈懡鍚嶅唴瀹?;
}

function visualSelectionSource(element) {
  const collection = String(element?.collection || '').trim() || '椤甸潰';
  const itemId = String(element?.itemId || '').trim();
  const fieldPath = String(element?.fieldPath || '').trim();
  const sectionKey = String(element?.sectionKey || '').trim();
  const source = itemId ? `${collection}/${itemId}` : collection;
  if (collection === 'pages' && sectionKey && fieldPath) return `${source} 路 sections[${sectionKey}].${fieldPath}`;
  return fieldPath ? `${source} 路 ${fieldPath}` : `${source} 路 鍖哄潡浣嶇疆`;
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
  if (!confirmDiscardChanges('鍒囨崲棰勮鏉＄洰')) return false;
  clearVisualSelection();
  const activated = activateVisualEditingTarget({ collection, itemId: nextId, sectionKey: websitePreviewContext.value.sectionKey }, { discardConfirmed: true });
  if (!activated?.record) return false;
  // Switching the left draft alone left the canvas on the previous record's page,
  // so nothing on screen was editable (the new record does not exist there).
  // Re-open the canvas for the new record: same page simply refreshes, another
  // page navigates to its route.
  if (liveWebsitePreviewVisible.value) {
    message.value = '宸插垏鎹㈡潯鐩紝姝ｅ湪閲嶆柊鍔犺浇鐢诲竷鈥?;
    void startLiveWebsitePreview({ targetOverride: { collection: activated.collection, record: activated.record } });
  }
  return true;
}

function selectTab(tab) {
  if (tab === activeTab.value) return;
  // Series and models keep their drafts in the per-record cache, so moving
  // between their two forms cannot discard edits. Prompting here produced a
  // false "鏈夋湭淇濆瓨淇敼" dialog right after selecting a series (the model form had
  // just been hydrated) and blocked the switch.
  const productTabs = new Set(['series', 'models']);
  const keepsDraft = productTabs.has(String(tab)) && productTabs.has(String(activeTab.value));
  if (!keepsDraft && !confirmDiscardChanges('鍒囨崲鍐呭绫诲瀷')) return;
  // 涓撴敞鐢诲竷浼氭妸闄ゅ疄鏃堕瑙堝鐨勬墍鏈夊尯鍧楅殣钘忥紱鍒囨崲鍒拌〃鍗?鍐呭鍖烘椂蹇呴』閫€鍑猴紝
  // 鍚﹀垯鏂版墦寮€鐨勫伐浣滃尯涓嶅彲瑙侊紝鐪嬭捣鏉ュ儚鈥滃崱姝烩€濄€?
  visualCanvasFocus.value = false;
  activeTab.value = tab;
  if (advancedTabs.has(tab)) showAdvanced.value = true;
  markDraftSaved();
}

async function selectSiteArea(area) {
  if (!Object.hasOwn(siteAreaLabels, area)) return;
  if (area === siteArea.value && activeTab.value === 'pages' && String(pageDraft.value?.slug || '') === String(area)) return;
  if (!confirmDiscardChanges('鍒囨崲瀹樼綉鏍忕洰')) return;
  visualCanvasFocus.value = false;
  // 姣忎釜瀹樼綉鏍忕洰閮藉搴斾竴鏉?pages 璁板綍锛坔ome/product/manufacturing/news/about/service锛夈€?
  // 涔嬪墠鍙湁棣栭〉浼氳嚜鍔ㄩ€変腑椤甸潰骞舵墦寮€瀹炴椂棰勮锛屽叾浠栨爮鐩仠鍦ㄢ€滄ā鍧楁€昏鈥濓紝
  // 娌℃湁棰勮鐩爣锛岀敾甯冧笉娓叉煋鍗翠粛鏄剧ず鈥滃叧闂疄鏃堕瑙堚€濓紝鐪嬭捣鏉ュ儚棰勮鍧忎簡銆?
  const page = pages.value.find((record) => String(record.slug || '') === String(area));
  siteArea.value = area;
  if (!page) {
    // 椤甸潰璁板綍缂哄け鏃朵繚鐣欐ā鍧楁€昏锛涙病鏈夐瑙堢洰鏍囷紝棰勮寮€鍏充繚鎸佸叧闂苟绂佺敤銆?
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
  // it could report a false "鏈繚瀛? right after a model was hydrated and block
  // the switch.
  const productSections = new Set(['series', 'models']);
  const keepsDraft = productSections.has(String(entry.action)) && productSections.has(String(activeTab.value));
  if (!keepsDraft && !confirmDiscardChanges('鍒囨崲瀹樼綉鍐呭妯″潡')) return;
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
    error.value = `鏈壘鍒扳€?{siteAreaLabel.value}鈥濆搴旂殑椤甸潰鑽夌锛岃閲嶆柊鍔犺浇鍚庡啀璇曘€俙;
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
  if (!confirmDiscardChanges('閲嶆柊鍔犺浇')) return;
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
    // Keep blank rows in the canvas payload: the "锛? button adds one and the
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

// Last-resort fallback only. The authoritative value is preview_open_url, which
// the CMS endpoint builds from WEBSITE_PREVIEW_OPEN_URL; that variable must be
// injected into the Directus process, it is not reliably read from .env alone.
// Port 8091 is the deployed website port, replacing the old dev-only 4175.
function fallbackWebsitePreviewOpenUrl() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:8091/api/preview/open`;
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
      // "杩炴帴澶辫触", with editMode never delivered 鈥?the hero video then finished
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
  // 姣忔鎵嬪姩鎵撳紑鐢诲竷閮藉埛鏂颁竴娆″凡鍙戝竷绱犳潗锛氬獟浣撲笂浼犲嵆鍙戝竷锛岀鐞嗗憳鍦ㄥ埆澶勪笂浼犲悗
  // 鐢诲竷鐨勪笅鎷夊簲绔嬪嵆鑳界湅鍒帮紝鑰屼笉鏄瓑鏁撮〉鍒锋柊銆?
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
    if (!data?.token) throw new Error('棰勮浠ょ墝绛惧彂澶辫触');
    const openUrl = data.preview_open_url || fallbackWebsitePreviewOpenUrl();
    livePreviewWebsiteOrigin.value = previewWebsiteOrigin(openUrl);
    if (!livePreviewWebsiteOrigin.value) throw new Error('瀹樼綉棰勮鍦板潃鏃犳晥');
    submitPreviewToken(openUrl, data.token, 'ruijun-live-website-preview', contextSnapshot);
    return true;
  } catch (reason) {
    if (requestSequence !== livePreviewRequestSequence) return;
    livePreviewStatus.value = 'error';
    livePreviewError.value = apiError(reason, '鏃犳硶杩炴帴瀹樼綉瀹炴椂棰勮锛岃纭瀹樼綉涓庡唴瀹瑰悗鍙版湇鍔℃鍦ㄨ繍琛屻€?);
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
// "缁撴瀯鍖栧弬鏁? even though its spec table is filled.
const structuredParameterKeys = Object.freeze({
  'XY 琛岀▼': 'xyTravelMm',
  'Z 杞磋绋?: 'zAxisTravelMm',
  '鏈€澶у伐浠跺昂瀵?: 'maxWorkpieceMm',
  '鏈€澶у伐浠堕噸閲?: 'maxWorkpieceWeightKg',
  '鏈€澶ч敟搴?: 'maxTaperDegrees',
  '鏈€澶у垏鍓插帤搴?: 'maxCuttingHeightMm',
  '鏈哄簥澶栧舰灏哄': 'machineDimensionsMm',
  '鏈哄簥閲嶉噺': 'machineWeightKg'
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
// must not turn a successful PATCH into "淇濆瓨澶辫触锛屽唴瀹规病鏈夋洿鏂?.
async function refreshAfterSave(loaders = []) {
  for (const load of loaders) {
    try {
      await load();
    } catch {
      message.value = `${message.value}锛堝垪琛ㄥ埛鏂板け璐ワ紝璇烽噸鏂板姞杞介〉闈㈡煡鐪嬶級`;
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
  livePreviewError.value = '瀹炴椂棰勮鎺堟潈宸插埌鏈燂紝姝ｅ湪鑷姩鎭㈠銆傛湭淇濆瓨淇敼浠嶄繚鐣欍€?;
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
    error.value = '鏈壘鍒板綋鍓嶉〉闈㈢殑鑽夌锛岃閲嶆柊鍔犺浇鍚庡啀璇曘€?;
    return;
  }
  const section = (page.sections || pageDraft.value?.sections || []).find((item) => String(item?.id || '') === sectionKey);
  const label = String(section?.title || section?.kicker || sectionKey);
  if (!window.confirm(`杩欐鍐呭灞炰簬銆?{label}銆嶅尯鍧楋紝褰撳墠鐢诲竷娌℃湁瀹冪殑缂栬緫鏉冦€俓n\n鏄惁鍒囨崲鍒拌鍖哄潡缁х画缂栬緫锛焋)) return;
  if (!confirmDiscardChanges('鍒囨崲鐢诲竷缂栬緫鍖哄潡')) return;
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
    }) && !confirmDiscardChanges('鍒囨崲鐢诲竷缂栬緫鍐呭')) return null;
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
    livePreviewError.value = '棰勮浼氳瘽宸插け鏁堬紙瓒呰繃 15 鍒嗛挓鏈搷浣滐紝鎴栭〉闈㈣瀵艰埅鍒版櫘閫氬湴鍧€锛夛紝姝ｅ湪鑷姩鎭㈠銆傛湭淇濆瓨淇敼浠嶄繚鐣欍€?;
    void reconnectLiveWebsitePreview();
    return;
  }
  if (event.data?.type === 'ruijun:cms-preview:expired') {
    if (livePreviewAutoRenewInFlight) return;
    if (livePreviewAutoRenewedForFrame) {
      livePreviewStatus.value = 'error';
      livePreviewError.value = '瀹炴椂棰勮鑷姩鎭㈠澶辫触锛岃鐐瑰嚮閲嶆柊杩炴帴瀹炴椂棰勮銆傛湭淇濆瓨淇敼浠嶄繚鐣欍€?;
      return;
    }
    livePreviewStatus.value = 'opening';
    livePreviewError.value = '瀹炴椂棰勮鎺堟潈宸插埌鏈燂紝姝ｅ湪鑷姩鎭㈠銆傛湭淇濆瓨淇敼浠嶄繚鐣欍€?;
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
      label: String(event.data.label || '闈欐€佸獟浣?),
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
      readonlyReason: String(event.data.readonlyReason || '璇峰厛鍦ㄥ獟浣撹祫浜т腑瀵煎叆骞跺彂甯冨悗鍐嶆浛鎹€?),
      rect: event.data.rect || null
    };
    visualMediaSelection.value = '';
    // An unbound media slot can only be filled from the block's 鍥剧墖涓庤儗鏅?list,
    // so bring that editor into view instead of leaving the operator to hunt for
    // it after the canvas says "灏氭湭缁戝畾".
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
      label: String(event.data.label || event.data.fieldPath || event.data.field || '鐢诲竷鍏冪礌'),
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
    // 瑙嗛鍒嗕韩鍗＄墖鐢?media_assets 璁板綍鑷韩椹卞姩锛屾病鏈夐〉闈㈠瓧娈佃矾寰勫彲瑙ｆ瀽锛?
    // 閫変腑娑堟伅閲岀殑 mediaAssetId 鎵嶆槸褰撳墠绱犳潗锛岀洿鎺ョ敤瀹冩墦寮€绱犳潗灞炴€ч潰鏉裤€?
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
  if (!previewWindow) { error.value = '娴忚鍣ㄩ樆姝簡棰勮绐楀彛锛岃鍏佽鏈珯鐐规墦寮€鏂扮獥鍙ｅ悗閲嶈瘯銆?; return; }
  try { previewWindow.opener = null; } catch { /* Browser policy can forbid changing opener. */ }
  websitePreviewOpening.value = true;
  error.value = ''; message.value = '';
  try {
    const response = await api.post('/content-preview-tokens/issue', { contentCollection: target.collection, contentItemId: target.record.id, ttlSeconds: 900 });
    const data = response.data?.data;
    if (!data?.token) throw new Error('棰勮浠ょ墝绛惧彂澶辫触');
    submitPreviewToken(data.preview_open_url || fallbackWebsitePreviewOpenUrl(), data.token, 'ruijun-website-draft-preview', websitePreviewContext.value);
    message.value = '宸插湪鏂扮獥鍙ｆ墦寮€瀹樼綉鑽夌棰勮锛涜绐楀彛鏄彧璇荤殑锛屼笉浼氬叕寮€鍙戝竷銆傝鍦ㄧ敾闈笂閫変腑鍜屼慨鏀癸紝璇峰叧闂畠骞朵娇鐢ㄣ€屾墦寮€瀹炴椂棰勮銆嶃€?;
  } catch (reason) {
    previewWindow.close();
    error.value = apiError(reason, '鏃犳硶鎵撳紑瀹樼綉棰勮锛岃纭鑽夌宸蹭繚瀛樹笖棰勮鏈嶅姟姝ｅ湪杩愯銆?);
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
  if (!asset) return `褰撳墠寮曠敤 ${reference.media_asset_id}锛堝皻鏈€氳繃姝ら€夋嫨鍣ㄩ獙璇侊級`;
  return isPreviewStagingMedia(asset, { scope }) ? `${mediaAssetLabel(asset)}锛堣崏绋跨礌鏉愶紝浠呭綋鍓嶅唴閮ㄩ瑙堬級` : mediaAssetLabel(asset);
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

// 浣跨敤鑼冨洿 鈫?椤甸潰 slug銆傚彇鍊煎繀椤荤敤鏈嶅姟绔殑璇嶈〃锛氳棰戞柊闂绘槸 `article`銆佸叧浜庣憺閽ф槸 `brand`锛?
// 涓?content-preview/page-preview-media-policy.mjs 鐨?pageScopes 淇濇寔涓€鑷淬€?
// 鏇剧粡杩欓噷鍐欐垚 `news` / `about`锛屽鑷磋繖涓や釜椤甸潰閫夋嫨鏃朵笂浼犲繀鐒?400銆?
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
  if (!spec) return '閫夋嫨鏂囦欢鍚庡啀閫夋嫨瀵瑰簲鐨勫畼缃戝睍绀轰綅缃€?;
  const requirements = [];
  // 灏哄鍙槸寤鸿锛屼笉鍐嶆嫤鎴細杩愯惀鎵嬮噷甯稿父鍙湁涓€绉嶇礌鏉愶紝鍗″昂瀵哥瓑浜庢病娉曚笂绾裤€?
  if (spec.minWidth && spec.minHeight) requirements.push(`寤鸿 ${spec.minWidth} x ${spec.minHeight} px 浠ヤ笂锛堜笉杈炬爣涔熻兘涓婁紶锛屽彧鏄樉绀哄彲鑳藉亸妯＄硦锛塦);
  if (spec.aspectRatio) requirements.push(`寤鸿姣斾緥 ${spec.aspectRatio}`);
  requirements.push(`鏈€澶?${readableFileSize(spec.maxBytes)}`);
  if (spec.maxDurationSeconds) requirements.push(`寤鸿鏃堕暱涓嶈秴杩?${spec.maxDurationSeconds} 绉抈);
  if (spec.posterRecommended) requirements.push('寤鸿琛ュ厖灏侀潰鍥剧墖锛堟湭璁剧疆鏃跺畼缃戝厛鏄剧ず瑙嗛棣栧抚锛?);
  if (spec.transcriptRequired) requirements.push('蹇呴』濉啓瀛楀箷鎴栨枃瀛楃');

  // 宸茬粡閲忓嚭瀹為檯灏哄鏃讹紝鐩存帴瀵规瘮缁欏嚭缁撹锛岀渷寰楄繍钀ヨ嚜宸辩畻銆?
  const measured = [];
  if (Number.isInteger(mediaDraft.value.width) && mediaDraft.value.width > 0
    && Number.isInteger(mediaDraft.value.height) && mediaDraft.value.height > 0) {
    measured.push(`褰撳墠绱犳潗 ${mediaDraft.value.width} x ${mediaDraft.value.height} px`);
  }
  return `${spec.label}锛?{requirements.join('锛?)}銆?{measured.length ? measured.join('锛?) + '銆? : ''}`;
});
const mediaMetadataLabel = computed(() => {
  if (mediaDraft.value.media_type === 'document') return 'PDF 鏂囨。';
  if (!mediaDraft.value.width || !mediaDraft.value.height) return '姝ｅ湪璇诲彇灏哄';
  const duration = mediaDraft.value.media_type === 'video' ? ` 路 ${mediaDraft.value.duration_seconds} 绉抈 : '';
  return `${mediaDraft.value.width} x ${mediaDraft.value.height} px 路 ${mediaDraft.value.aspect_ratio}${duration}`;
});
const publishedImageAssets = computed(() => mediaAssets.value.filter((asset) => asset.media_type === 'image' || String(asset.mime_type || '').startsWith('image/')));
const videoPosterOptions = computed(() => videoPosterAssets({
  placementKey: mediaDraft.value.placement_key,
  usageScope: mediaDraft.value.usage_scope,
  publishedAssets: publishedImageAssets.value,
  candidates: mediaCandidates.value
}));
// 宸茬櫥璁扮礌鏉愮殑灏侀潰琛ュ綍锛氳蛋鍙敼灏侀潰鐨勭鐐癸紝閬垮厤宸插彂甯冭棰戣閫€鍥炶崏绋裤€?
const mediaPosterSelections = ref({});
const mediaPosterSavingId = ref('');
const mediaPosterOptions = (asset) => mediaPosterOptionsFor(asset, { publishedAssets: publishedImageAssets.value, candidates: mediaCandidates.value });
const mediaPosterHint = (asset) => mediaPosterHintFor(asset, mediaCandidates.value);
async function saveMediaPoster(asset) {
  const id = String(asset?.id || '');
  if (!id) return;
  const posterId = String(mediaPosterSelections.value[id] || '').trim();
  if (posterId && posterId === id) { error.value = '灏侀潰涓嶈兘鎸囧悜瑙嗛绱犳潗鏈韩銆?; return; }
  mediaPosterSavingId.value = id;
  error.value = ''; message.value = '';
  try {
    await api.post('/media-poster', { media_asset_id: id, poster_asset_id: posterId || null });
    message.value = posterId ? '灏侀潰宸蹭繚瀛樸€傚皝闈㈠彂甯冨悗浼氭浛鎹㈣棰戦甯ф樉绀恒€? : '宸叉竻闄ゅ皝闈紝瀹樼綉灏嗘樉绀鸿棰戦甯с€?;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
  } catch (reason) {
    error.value = apiError(reason, '灏侀潰淇濆瓨澶辫触锛岃棰戝唴瀹规病鏈夊彉鍖栥€?);
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
  return isPreviewStagingMedia(asset) ? `${mediaAssetLabel(asset)}锛堣崏绋跨礌鏉愶紝浠呭綋鍓嶅唴閮ㄩ瑙堬級` : mediaAssetLabel(asset);
}

function isEditorialCoverAssetAllowed(assetId, category) {
  return eligibleEditorialCoverAssets(category).some((asset) => String(asset.id) === String(assetId));
}

function readableFileSize(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '鏈煡澶у皬';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function usageScopeLabel(scope) {
  return { homepage: '缃戠珯涓婚〉', product: '浜у搧灞曠ず', manufacturing: '鍏堣繘鍒堕€?, article: '瑙嗛鏂伴椈', brand: '鍏充簬鐟為挧', service: '鏈嶅姟鏀寔' }[scope] || scope || '鏈垎绫?;
}

function videoPosterAssetLabel(asset) {
  const internalDraft = asset?.status !== 'published' || asset?.publication_state !== 'published';
  return `${mediaAssetLabel(asset)}${internalDraft ? '锛堜粎鍐呴儴棰勮鑽夌锛? : ''}`;
}

async function readMediaMetadata(file, mediaType) {
  if (mediaType === 'document') return { width: 0, height: 0, duration_seconds: 0, aspect_ratio: '' };
  const url = URL.createObjectURL(file);
  try {
    if (mediaType === 'image') {
      const image = new Image();
      const dimensions = await new Promise((resolve, reject) => { image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error('鏃犳硶璇诲彇鍥剧墖灏哄')); image.src = url; });
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
    message.value = '娴忚鍣ㄦ殏鏃舵棤娉曡鍙栬棰戜俊鎭紝浠嶅彲缁х画涓婁紶锛涗笂浼犲悗灏嗙敱鏈嶅姟绔牎楠屻€?;
  }
}

function validateMediaFile(file) {
  if (!file) return '璇烽€夋嫨瑕佺櫥璁扮殑濯掍綋鏂囦欢銆?;
  const mime = String(file.type || '').toLowerCase().trim();
  const extension = String(file.name || '').toLowerCase().split('.').pop();
  const normalizedMime = mime === 'video/quicktime' || ['mov', 'm4v'].includes(extension) ? 'video/mp4' : mime;
  const limit = mediaUploadRules[normalizedMime] || mediaUploadRules[mime];
  if (!limit) return '浠呮敮鎸?JPG銆丳NG銆乄ebP銆丄VIF銆丮P4銆乄ebM 鎴?PDF 鏂囦欢銆?;
  if (file.size < 1) return '涓嶈兘涓婁紶绌烘枃浠躲€?;
  if (file.size > limit) return `鏂囦欢瓒呰繃 ${readableFileSize(limit)} 鐨勪笂闄愩€俙;
  return '';
}

function validateMediaCandidate() {
  const fileError = validateMediaFile(mediaDraft.value.file);
  if (fileError) return fileError;
  const spec = selectedMediaPlacement.value;
  if (!spec || spec.mediaType !== mediaDraft.value.media_type) return '璇烽€夋嫨涓庢枃浠剁被鍨嬩竴鑷寸殑瀹樼綉灞曠ず浣嶇疆銆?;
  // 灏哄 / 浣撶Н / 鏃堕暱涓嶅啀鎷︽埅锛堜笌鍚庣 media-asset-governance.mjs 鐨勭瓥鐣ヤ竴鑷达級锛?
  // 杩欎簺鍙奖鍝嶇敾璐紝杩愯惀鎵嬮噷甯稿父鍙湁涓€绉嶇礌鏉愶紝鍗′綇绛変簬娌℃硶涓婄嚎銆?
  // 鐢昏川宸窛鐢?selectedMediaPlacementHelp 浠ユ彁绀哄舰寮忓睍绀恒€?
  // 涓嬮潰杩欎簺淇濈暀锛屽洜涓虹己浜嗛〉闈細鐩存帴鍧忔帀銆?
  if (spec.transcriptRequired && !String(mediaDraft.value.transcript || '').trim()) return `${spec.label}蹇呴』濉啓瀛楀箷鎴栨枃瀛楃銆俙;
  if (spec.autoplay && !mediaDraft.value.autoplay) return `${spec.label}蹇呴』鍚敤鑷姩鎾斁銆俙;
  if (spec.muted && !mediaDraft.value.muted) return `${spec.label}鑷姩鎾斁鏃跺繀椤婚粯璁ら潤闊炽€俙;
  return '';
}

function companyRecords(mode) {
  return company.value[mode] || [];
}

function companyLabel(record) {
  if (companyMode.value === 'milestones') return `${record.year || '鏈～鍐?} 骞?- ${record.event || '鏈～鍐欎簨浠?}`;
  if (companyMode.value === 'qualifications') return record.name || record.source_key || '鏈懡鍚嶈祫璐?;
  return record.process || record.source_key || '鏈懡鍚嶅埗閫犺瘉鎹?;
}

function companyHeading() {
  return { milestones: '鍙戝睍鍘嗙▼', qualifications: '璧勮川璇佷功', manufacturing_evidence: '鍒堕€犺瘉鎹? }[companyMode.value];
}

function serviceRecords(mode) {
  return service.value[mode] || [];
}

function serviceLabel(record) {
  if (serviceMode.value === 'service_resources') return record.title || record.source_key || record.type || '鏈懡鍚嶆湇鍔¤祫鏂?;
  if (serviceMode.value === 'service_locations') return `${record.region || '鏈～鍐?} ${record.city || '鏈～鍐?}`;
  return record.entry_type || '鏈懡鍚嶅敭鍚庡叆鍙?;
}

function serviceSecondary(record) {
  if (serviceMode.value === 'service_resources') return record.type || '';
  if (serviceMode.value === 'service_locations') return record.source_key || '';
  return record.open_mode || '';
}

function serviceHeading() {
  return { service_resources: '鏈嶅姟璧勬枡', service_locations: '鏈嶅姟缃戠偣', external_service_entries: '鍞悗鍏ュ彛' }[serviceMode.value];
}

function editorialRecords(mode) {
  return filterEditorialRecords(editorial.value[mode], mode === 'articles' ? editorialCategory.value : '');
}

function editorialLabel(record) {
  return editorialMode.value === 'articles' ? (record.title || record.slug || '鏈懡鍚嶆枃绔?) : (record.slug || '鏈懡鍚嶆渚?);
}

function editorialSecondary(record) {
  return editorialMode.value === 'articles' ? (record.category || record.slug || '') : (record.model_code || record.industry || '瀹㈡埛妗堜緥');
}

function editorialHeading() {
  return editorialMode.value === 'articles' ? '鏂伴椈涓庢枃绔? : '瀹㈡埛妗堜緥';
}

function normalizeService(record) {
  const copy = clone(record);
  if (serviceMode.value === 'service_resources') copy.applicableModelsText = textList(copy.applicable_models);
  if (serviceMode.value === 'service_locations') copy.contact = { ...parseObject(copy.contact), name: String(parseObject(copy.contact).name || ''), phone: String(parseObject(copy.contact).phone || ''), email: String(parseObject(copy.contact).email || ''), address: String(parseObject(copy.contact).address || '') };
  return copy;
}

function riskLabel(value) {
  return { high: '楂橀闄?, medium: '涓闄?, low: '浣庨闄? }[String(value || '').toLowerCase()] || '鏈垎绫?;
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
    error.value = '璇ョ礌鏉愪笉鏄椤甸灞忚棰戯紝鏈繚瀛樹慨鏀广€?;
    return;
  }
  if (error.value === '璇ョ礌鏉愪笉鏄椤甸灞忚棰戯紝鏈繚瀛樹慨鏀广€?) error.value = '';
}

function newsHeroVideoOptionsForSection(section) {
  return newsHeroVideoOptions(pageMediaOptionsForSection('article', section));
}

function setNewsHeroVideo(section, assetId) {
  if (!setNewsHeroVideoAsset(section, assetId, newsHeroVideoOptionsForSection(section))) {
    error.value = '璇ョ礌鏉愪笉鏄棰戞柊闂婚灞忚棰戯紝鏈繚瀛樹慨鏀广€?;
    return;
  }
  if (error.value === '璇ョ礌鏉愪笉鏄棰戞柊闂婚灞忚棰戯紝鏈繚瀛樹慨鏀广€?) error.value = '';
}

function pageMediaOptionLabel(asset, scope) {
  return isPreviewStagingMedia(asset, { scope })
    ? `${mediaAssetLabel(asset)}锛堣崏绋跨礌鏉愶紝浠呭綋鍓嶅唴閮ㄩ瑙堬級`
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
    ? `${mediaAssetLabel(asset)}锛?{isVideo ? '鑽夌绱犳潗锛屼粎褰撳墠鍐呴儴棰勮' : '浠呭唴閮ㄩ瑙堜笅杞?}锛塦
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
    ? `${mediaAssetLabel(asset)}锛堣崏绋跨礌鏉愶紝浠呭綋鍓嶅唴閮ㄩ瑙堬級`
    : mediaAssetLabel(asset);
}

function modelResourceMediaAssetLabel(asset) {
  return isPreviewStagingMedia(asset, { scope: 'product', placementKey: 'product.document' })
    ? `${mediaAssetLabel(asset)}锛堜粎鍐呴儴棰勮涓嬭浇锛塦
    : mediaAssetLabel(asset);
}

function modelDrawingMediaAssetLabel(asset) {
  const label = formatProductDrawingMediaLabel(asset);
  return isPreviewStagingMedia(asset, { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image' })
    ? `${label}锛堜粎鍐呴儴棰勮鑽夌锛塦
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
    ? `${mediaAssetLabel(asset)}锛堣崏绋跨礌鏉愶紝浠呭綋鍓嶅唴閮ㄩ瑙堬級`
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
  const filename = String(asset?.original_file_name || `绱犳潗 ${asset?.id || ''}`).trim();
  return `${title || filename} 路 ${filename} 路 ${asset?.mime_type || '鏈煡绫诲瀷'}`;
}

function isPreviewableMedia(asset) {
  return String(asset?.mime_type || '').toLowerCase().startsWith('image/') && Boolean(asset?.file_id);
}

function mediaPreviewLabel(asset) {
  if (isPreviewableMedia(asset)) return '鍥剧墖';
  if (String(asset?.mime_type || '').startsWith('video/')) return '瑙嗛';
  if (asset?.mime_type === 'application/pdf') return 'PDF';
  return '鏂囦欢';
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
  return { draft: '鑽夌', rejected: '閫€鍥炰慨鏀?, unpublished: '宸蹭笅绾?, review: '瀹℃牳涓?, scheduled: '寰呭彂甯?, published: '宸插彂甯?, archived: '宸插綊妗? }[status] || status || '鏈煡';
}

function knowledgeSyncStatusLabel(status) {
  return { eligible: '绛夊緟鍚屾', synced: '宸插悓姝?, failed: '鍚屾澶辫触', not_eligible: '鏆備笉婊¤冻鍚屾鏉′欢' }[status] || '鏆備笉婊¤冻鍚屾鏉′欢';
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
    return '鐧诲綍浼氳瘽宸插け鏁堛€傛湭淇濆瓨鍐呭浠嶄繚鐣欏湪椤甸潰涓紝璇烽噸鏂扮櫥褰曞悗淇濆瓨銆?;
  }
  if (status === 403) {
    // The publication workflow rejects writes to review/scheduled records with
    // a Chinese reason. Treating every 403 as "login expired" sent operators to
    // re-login while the actual fix was to take the record back to draft.
    if (code === 'PUBLICATION_BLOCKED' || /鍙兘鍙戝竷|宸叉壒鍑唡褰撳墠鐘舵€亅瀹℃牳|鍙戝竷闃熷垪|閫€鍥炶崏绋縷涓嬬嚎/.test(message)) {
      return `褰撳墠鍐呭涓嶈兘淇濆瓨锛?{message || '璁板綍鐘舵€佷笉鍏佽淇濆瓨'}銆傝鍏堝湪銆屽唴瀹瑰彂甯冮槦鍒椼€嶉€€鍥炶崏绋垮悗鍐嶄慨鏀广€俙;
    }
    if (/permission to access field|瀛楁|field/i.test(message)) {
      return `褰撳墠璐﹀彿娌℃湁璇ュ瓧娈电殑淇濆瓨鏉冮檺锛?{message || '璇疯仈绯荤鐞嗗憳璋冩暣鏉冮檺'}`;
    }
    return `褰撳墠璐﹀彿娌℃湁淇濆瓨鏉冮檺锛?{message || '璇风‘璁ゅ唴瀹圭姸鎬佹垨鑱旂郴绠＄悊鍛?}`;
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
    return '杩欐潯鍐呭宸茬粡鍙戝竷锛岀敾甯冧笉鑳芥浛鎹㈠畠鐨勭礌鏉愩€傝鍏堝湪銆屽唴瀹瑰彂甯冮槦鍒椼€嶆妸瀹冧笅绾匡紝鍐嶆仮澶嶄负鑽夌锛岀劧鍚庡洖鏉ユ崲绱犳潗銆?;
  }
  if (code === 'PREVIEW_MEDIA_INVALID') {
    return '鎵€閫夌礌鏉愪笉閫傜敤浜庤繖涓尯鍧楋細绱犳潗鐨勭敤閫旇寖鍥淬€佹墍灞為〉闈㈠拰灞曠ず浣嶇疆蹇呴』涓庡綋鍓嶅尯鍧椾竴鑷淬€傝鍒般€屽獟浣撹祫浜с€嶆牳瀵硅绱犳潗鐧昏鐨勪綅缃€?;
  }
  return issue?.message || '绱犳潗棰勮鎺堟潈澶辫触锛岃閲嶆柊鎵撳紑棰勮銆?;
}

function setSaveError(reason, fallback) {
  error.value = apiError(reason, fallback);
  // Keep the detached draft untouched so retry is the same button press after
  // the server or login session recovers. A visible success message must never
  // survive a failed request.
  message.value = '';
}

const contentQueueDefinitions = Object.freeze([
  { collection: 'content_submissions', label: '閫佸鎵规', fields: ['submission_name', 'batch_key', 'items'] },
  { collection: 'pages', label: '椤甸潰鏂囨', fields: ['title', 'slug'] },
  { collection: 'product_series', label: '浜у搧绯诲垪', fields: ['name', 'series_code'] },
  { collection: 'product_models', label: '浜у搧鍨嬪彿', fields: ['name', 'model_code'] },
  { collection: 'product_parameters', label: '鎶€鏈弬鏁?, fields: ['field_name', 'model_code'] },
  { collection: 'articles', label: '鏂囩珷璧勮', fields: ['title', 'slug'] },
  { collection: 'case_studies', label: '瀹㈡埛妗堜緥', fields: ['slug', 'model_code'] },
  { collection: 'manufacturing_evidence', label: '鍒堕€犺瘉鎹?, fields: ['process', 'source_key'] },
  { collection: 'qualifications', label: '璧勮川璇佷功', fields: ['name', 'certificate_number'] },
  { collection: 'milestones', label: '鍙戝睍鍘嗙▼', fields: ['event', 'year'] },
  { collection: 'service_resources', label: '鏈嶅姟璧勬枡', fields: ['source_key', 'type'] },
  { collection: 'service_locations', label: '鏈嶅姟缃戠偣', fields: ['city', 'region'] },
  { collection: 'knowledge_items', label: '甯歌闂鐭ヨ瘑', fields: ['question_title', 'source_key'] },
  { collection: 'external_service_entries', label: '鍞悗鍏ュ彛', fields: ['entry_type', 'url'] },
  { collection: 'site_settings', label: '鍏ㄧ珯璁剧疆', fields: ['setting_key'] }
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
    error.value = apiError(reason, '鏃犳硶璇诲彇寰呭鏍稿唴瀹广€傝纭褰撳墠璐﹀彿鍏锋湁瀵瑰簲瀹℃牳鏉冮檺銆?);
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
    error.value = apiError(reason, '鏃犳硶璇诲彇鑽夌娓呭崟銆傝纭褰撳墠璐﹀彿鍏锋湁鍐呭璇诲彇鏉冮檺銆?);
  } finally {
    submissionLoading.value = false;
  }
}

function invalidateSubmissionQueue() {
  // 淇濆瓨/鏂板缓/鍒犻櫎鍚庢棫娓呭崟绔嬪嵆澶辨晥銆傜暀鍒扮敤鎴风湡姝ｈ繘鍏モ€滃唴瀹归€佸鈥濇椂鍐嶈姹傦紝
  // 閬垮厤鍦ㄧ紪杈戦〉鏃犳剰涔夊湴鍒锋柊鍑犲崄涓泦鍚堛€?
  submissionQueueLoaded.value = false;
  if (activeTab.value === 'submit') void loadSubmissionQueue();
}

function setSubmissionMode(mode) {
  if (!['submit', 'restore'].includes(mode) || submissionMode.value === mode) return;
  if (!confirmDiscardChanges('鍒囨崲瀹℃牳浠诲姟')) return;
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
  if (!force && !confirmDiscardChanges('鍒囨崲瀹℃牳璁板綍')) return;
  selectedReviewKey.value = reviewRecordKey(record);
  reviewNote.value = '';
  markDraftSaved();
}

function selectSubmissionRecord(record, force = false) {
  if (!force && !confirmDiscardChanges('鍒囨崲鑽夌璁板綍')) return;
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
        error.value = `鎵规鏈彁浜わ紝浠ヤ笅鍐呭鏈揪鍒板彂甯冩潯浠讹細${blockers.join('锛?)}`;
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
        error.value = `鎵规鏈彁浜わ細${failures.length} 椤瑰け璐ワ紙${failures.join('銆?)}锛夛紝鍏朵綑宸叉敼涓哄鏍镐腑锛涜淇鍚庨噸璇曘€俙;
        message.value = '';
        await loadSubmissionQueue();
        return;
      }
      await api.patch(`/items/content_submissions/${encodeURIComponent(record.id)}`, { status: 'review', review_note: submissionNote.value || null, submitted_at: new Date().toISOString() });
    } else {
      await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status: 'review', review_note: submissionNote.value || null });
    }
    message.value = '宸叉彁浜ゅ鏍搞€傛暣鎵瑰唴瀹瑰皢鐢卞搴斿鏍歌鑹插鐞嗭紝鍓嶇涓嶄細鐩存帴鍙戝竷銆?;
    await Promise.all([loadSubmissionQueue(), loadReviewQueue()]);
  } catch (reason) {
    error.value = apiError(reason, '鎻愪氦瀹℃牳澶辫触銆傝琛ュ叏鏉ユ簮銆佸彈鎺у獟浣撴垨鍐呭鍓嶇疆鏉′欢鍚庨噸璇曘€?);
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
    message.value = '鍐呭宸叉仮澶嶄负鑽夌锛屽彲缁х画缂栬緫鍚庡啀娆℃彁浜ゅ鏍搞€?;
    await loadSubmissionQueue();
  } catch (reason) {
    error.value = apiError(reason, '鎭㈠鑽夌澶辫触銆傝纭褰撳墠璐﹀彿鍏锋湁鍐呭缂栬緫鏉冮檺銆?);
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
      const blockers = (readiness?.blockers || []).filter((blocker) => blocker !== '鏈畬鎴愬彂甯?);
      return blockers.length ? [`${item.label || item.id}锛?{blockers.join('銆?)}`] : [];
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
          error.value = `鎵规鏈壒鍑嗭紝浠ヤ笅鍐呭鏈揪鍒板彂甯冩潯浠讹細${blockers.join('锛?)}`;
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
        error.value = `鎵规鏈畬鎴愬鏍革細${failures.length} 椤瑰け璐ワ紙${failures.join('銆?)}锛夛紱璇烽€愰」淇鍚庨噸璇曘€俙;
        message.value = '';
        await loadReviewQueue();
        return;
      }
      await api.patch(`/items/content_submissions/${encodeURIComponent(record.id)}`, { status, review_note: reviewNote.value || null, reviewed_at: new Date().toISOString() });
    } else {
      await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, { status, review_note: reviewNote.value || null });
    }
    message.value = status === 'scheduled' ? '鏁存壒瀹℃牳宸叉彁浜や负寰呭彂甯冿紝鏄惁鍏佽娴佽浆鐢辨湇鍔＄瑙勫垯纭銆? : '宸叉暣鎵归€€鍥炰慨鏀癸紝鍐呭缂栬緫浜哄憳鍙湪鑽夌娴佺▼涓户缁畬鍠勩€?;
    if (status === 'scheduled' && hasProductItem) {
      productReleaseHint.value = true;
      message.value = '浜у搧鍐呭宸叉壒鍑嗚繘鍏ュ緟鍙戝竷銆傝鍓嶅線銆屼骇鍝佺粺涓€鍙戝竷銆嶇敓鎴愬叕寮€蹇収銆?;
    }
    await loadReviewQueue();
  } catch (reason) {
    error.value = apiError(reason, '瀹℃牳娴佽浆澶辫触銆傝纭褰撳墠璐﹀彿瑙掕壊鍙婂唴瀹瑰氨缁姸鎬併€?);
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
  // "锛?鏂板鏈哄瀷" wrote the model into the old series.
  livePreviewFrame.value.contentWindow.postMessage({
    type: 'ruijun:cms-preview:notice',
    kind: 'series-selected',
    itemId: String(record.id),
    seriesCode: String(record.series_code || ''),
    slug: String(record.slug || ''),
    label: record.name || record.series_code || '绯诲垪'
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
  // back would make the page select 鈫?notify 鈫?select again.
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
  if (!seeded) { error.value = '璇ョ郴鍒楁病鏈夊彲鍒濆鍖栫殑鍘熺増璇︽儏銆?; return; }
  seriesDraft.value.detail = {
    intro: { ...emptySeriesDetail().intro, ...(seeded.intro || {}) },
    features: (seeded.features || []).map((feature) => ({ label: feature.label, detail: feature.detail || '', note: feature.note || '' }))
  };
  message.value = '宸插啓鍏ュ畼缃戝師鐗堣鎯咃紝淇敼鍚庤淇濆瓨鑽夌銆?;
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
  if (!seeded) { error.value = '璇ョ郴鍒楁病鏈夊彲鍒濆鍖栫殑鍘熺増璇︽儏銆?; return; }
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
  message.value = '宸插啓鍏ュ畼缃戝師鐗堣鎯咃紝淇敼鍚庤淇濆瓨鑽夌銆?;
}

function selectCompanyMode(mode, force = false) {
  if (!force && mode !== companyMode.value && !confirmDiscardChanges('鍒囨崲浼佷笟璧勬枡绫诲瀷')) return;
  companyMode.value = mode;
  const nextId = companyRecords(mode).some((item) => item.id === selectedCompanyId.value) ? selectedCompanyId.value : companyRecords(mode)[0]?.id;
  if (nextId) selectCompanyRecord(nextId, true); else { selectedCompanyId.value = ''; companyDraft.value = null; markDraftSaved(); }
}

function selectCompanyRecord(id, force = false) {
  if (!force && id !== selectedCompanyId.value && !confirmDiscardChanges('鍒囨崲浼佷笟璧勬枡')) return;
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
  if (!force && mode !== serviceMode.value && !confirmDiscardChanges('鍒囨崲鏈嶅姟鍐呭绫诲瀷')) return;
  serviceMode.value = mode;
  const nextId = serviceRecords(mode).some((item) => item.id === selectedServiceId.value) ? selectedServiceId.value : serviceRecords(mode)[0]?.id;
  if (nextId) selectServiceRecord(nextId, true); else { selectedServiceId.value = ''; serviceDraft.value = null; markDraftSaved(); }
}

function selectServiceRecord(id, force = false) {
  if (!force && id !== selectedServiceId.value && !confirmDiscardChanges('鍒囨崲鏈嶅姟鍐呭')) return;
  selectedServiceId.value = id;
  const record = serviceRecords(serviceMode.value).find((item) => item.id === id);
  serviceDraft.value = record ? normalizeService(record) : null;
  markDraftSaved();
}

function selectEditorialMode(mode, force = false) {
  if (!force && mode !== editorialMode.value && !confirmDiscardChanges('鍒囨崲鍐呭绫诲瀷')) return;
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
  if (!force && id !== selectedEditorialId.value && !confirmDiscardChanges('鍒囨崲鏂囩珷鎴栨渚?)) return;
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
  if (!force && id !== selectedKnowledgeId.value && !confirmDiscardChanges('鍒囨崲鐭ヨ瘑鑽夌')) return;
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
  if (pageDraft.value?.slug === 'news' && String(section?.id || '') === 'dynamic-news') return '绌虹姸鎬佽鏄庯紙浠呭綋娌℃湁鍔ㄦ€佹柊闂绘椂鏄剧ず锛?;
  if (pageDraft.value?.slug === 'news' && String(section?.id || '') === 'video-sharing') return '绌虹姸鎬佽鏄庯紙浠呭綋娌℃湁瑙嗛鍒嗕韩鏃舵樉绀猴級';
  return '琛ュ厖璇存槑';
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
  return ({ homepage: '缃戠珯涓婚〉', service: '鏈嶅姟', manufacturing: '鍒堕€?, article: '鏂囩珷涓庤祫璁?, product: '浜у搧', brand: '鍝佺墝涓庝紒涓? })[pageMediaScope()] || '鍝佺墝涓庝紒涓?;
}

function addAboutSections() {
  if (!pageDraft.value || !isAboutPage()) return;
  const defaults = [
    { id: 'hero', title: '涓撴敾鐢靛姞宸ュ崱鑴栧瓙鎶€鏈痋n涓哄鎴峰垱閫犳渶澶т环鍊?, kicker: '30', description: '骞存繁鑰曠嚎鍒囧壊鍒堕€? },
    { id: 'brand-story', title: '鍝佺墝鏁呬簨', body: '涓婁笘绾?90 骞翠唬鍒濓紝浜屽崄鏉ュ瞾鐨勫勾杞诲厔寮熶咯绔嬭冻娓╁窞锛岀粡钀ョ嚎鍒囧壊鍔犲伐涓氬姟锛屽苟闅忕埗浜茬粡閿€鍥借惀绾垮垏鍓叉満搴娿€傞殢鐫€甯傚満缁忔祹钃媰鍙戝睍锛屽競鍦烘満搴婇渶姹傞珮娑紝鍥借惀鍘備骇鑳介毦浠ユ弧瓒宠鍗曘€?997 骞达紝鍏勫紵浜屼汉鍒涘姙涓板崕鏁版帶锛岃浆鍨嬭嚜涓荤敓浜ф満搴娿€俓n\n2003 骞粹€滈潪鍏糕€濆競鍦洪亣鍐凤紝鍥㈤槦娼滃績鐮斿彂锛屾垚鍔熸帹鍑轰腑璧颁笣绾垮垏鍓叉満搴娿€?006 骞翠紒涓氳縼鑷充骇涓氬尯浣嶆洿浼樼殑鏄嗗北锛屽洜鈥滀赴鍗庘€濆晢鏍囧凡琚敞鍐岋紝鍙栬嚜鍏勫紵濮撳悕鍚勪竴瀛楋紝瀹氬悕鐟為挧銆俓n\n2013 骞存暣鏈洪攢閲忕獊鐮?1000 鍙帮紱2014 骞磋縼鍏ユ柊鍒堕€犲熀鍦帮紝2016 骞存墿寤烘爣鍑嗗寲浜х嚎锛岃坊韬涓氬ご閮ㄣ€?022 骞寸爺鍙戣嚜鍔ㄧ┛涓濅腑璧颁笣锛岃繄鍚戣澶囪嚜鍔ㄥ寲銆?023 骞存枼璧勬暟浜垮厓鍦ㄥ父鐔熷缓璁?4.0 鏅烘収宸ュ巶锛屽紩杩涚櫨鍙板姞宸ユ瘝鏈猴紝鏂板伐鍘備簬 2025 骞存寮忔姇浜с€? },
    { id: 'overview', title: '鎰挎櫙锛氭垚涓轰竴瀹朵负瀹㈡埛鍒涢€犳洿澶т环鍊肩殑浼佷笟', body: '鐟為挧鏅虹鏄竴瀹朵笓涓氱爺鍙戙€佸埗閫犱笌閿€鍞數鐏姳鍛ㄨ竟绯荤粺鍙婃暟鎺ф満搴婄殑楂樻柊鎶€鏈紒涓氥€傚叕鍙稿鍒涗簬1997骞达紝鍦ㄦ睙鑻忔槅灞便€佸父鐔熷缓鏈夊埗閫犲熀鍦帮紝鎸佺画涓哄鎴锋彁渚涙櫤鑳藉寲涓蛋涓濈嚎鍒囧壊鏈哄簥銆?, kicker: '绱鏁颁竾鐢ㄦ埛', description: '绮剧锛氫笓娉ㄣ€佷笓涓氥€佽瘹淇°€佸垱鏂?, items: ['鎴戜滑鎷ユ湁瀹屽叏鑷富鐨勪骇鍝佽璁°€佺爺鍙戯紒', '鎴戜滑鎷ユ湁鍏ㄤ骇涓氶摼鍒堕€犺兘鍔涳紒', '鎴戜滑鎷ユ湁鎶€鏈竴娴佺殑鍛樺伐鍥㈤槦锛?, '鎴戜滑鎷ユ湁鍏堣繘鐨勭簿鑹澶囷紒', '鎴戜滑鎷ユ湁淇濊瘉浜у搧璐ㄩ噺鐨勪弗璋ㄧ珷绋嬶紒', '鎴戜滑鎷ユ湁瀹屽杽鐨勫敭鍓嶃€佸敭涓€佸敭鍚庢湇鍔★紒'].map((label) => ({ label })) },
    { id: 'history', title: '鐟為挧鏅虹鐨勪腑璧颁笣鍒堕€犲巻鍙? },
    { id: 'factory', title: '鍘傚尯椋庤矊' }, { id: 'certificates', title: '璁よ瘉璇佷功' },
    { id: 'honors', title: '鑽ｈ獕璇佷功' }, { id: 'patents', title: '涓撳埄璇佷功', description: '79浠朵笓鍒╋紝鍏朵腑鍙戞槑涓撳埄9浠? },
    { id: 'partners', title: '浼楀涓栫晫鐭ュ悕鍝佺墝鍘傚鍜屼緵搴斿晢鍚堜綔' }, { id: 'clients-domestic', title: '鍥藉唴瀹㈡埛' }, { id: 'clients-global', title: '鍥藉瀹㈡埛' }
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
    { id: 'hero', title: '鐟為挧鏅虹涓蛋涓濈嚎鍒囧壊鏈哄簥', body: '', label: '', href: '#reasons' },
    { id: 'why-ruijun', title: '閫夋嫨鐟為挧鐨刓n涓夊ぇ鐞嗙敱' },
    { id: 'performance', kicker: '澧炴晥闄嶆崯', shortTitle: '澧炴晥闄嶆崯', introTitle: '澧炴晥闄嶆崯', introDetail: '鏁堣兘鎻愬崌50%锛屼笣鎹熼檷浣?0%', title: '澧炴晥闄嶆崯', body: '鏁堣兘鎻愬崌50%锛屼笣鎹熼檷浣?0%', description: '鏁堣兘鎻愬崌50%锛屼笣鎹熼檷浣?0%', mode: 'machine', requires_claim_review: true },
    { id: 'advanced-manufacturing', kicker: '鍏堣繘鏅洪€?, shortTitle: '鍏堣繘鏅洪€?, introTitle: '鍏堣繘鏅洪€?, introDetail: '30骞存妧鏈矇娣€锛屽厛杩涘埗閫犲伐鍘?, title: '30骞存妧鏈矇娣€锛屽厛杩涘埗閫犲伐鍘?, description: '30骞存妧鏈矇娣€锛屽厛杩涘埗閫犲伐鍘?, mode: 'photo' },
    { id: 'industry-leadership', kicker: '棰嗗啗鍝佺墝', shortTitle: '棰嗗啗鍝佺墝', introTitle: '琛屼笟棰嗗啗鍝佺墝', introDetail: '閿€閲忔寔缁鍏堬紝鍝佽川濮嬬粓濡備竴', title: '閿€閲忔寔缁鍏堬紝鍝佽川濮嬬粓濡備竴', description: '閿€閲忔寔缁鍏堬紝鍝佽川濮嬬粓濡備竴', mode: 'photo' },
    { id: 'products', title: '鎴戜滑鐨勪骇鍝? },
    { id: 'history', title: '鐟為挧鏅虹鐨勪腑璧颁笣鍒堕€犲巻鍙? },
    { id: 'product-task', title: '璁╀笅涓€鍙拌澶囧尮閰嶄綘鐨勫姞宸ヤ换鍔?, body: '閫氳繃宸ヤ欢銆佺簿搴︺€佽妭鎷嶅拰鑷姩鍖栭渶姹傝幏寰楅€夊瀷寤鸿銆?, label: '鑾峰彇閫夊瀷寤鸿', href: '/contact' }
  ],
  product: [
    { id: 'hero', title: '浜у搧灞曠ず', body: '鎸夊姞宸ヤ换鍔°€佽嚜鍔ㄥ寲鏂瑰紡涓庤鏍奸€夋嫨璁惧銆? },
    { id: 'categories', title: '閫夋嫨鐟為挧鐞嗙敱' },
    { id: 'proof-efficiency', title: '澧炴晥闄嶆崯', body: '鏁堣兘鎻愬崌50%锛屼笣鎹熼檷浣?0%', requires_claim_review: true },
    { id: 'proof-years', title: '30 YEARS', body: '30骞存妧鏈矇娣€锛屽厛杩涙櫤閫犲伐鍘? },
    { id: 'proof-champion', title: 'Champion', body: '閿€閲忔寔缁鍏堬紝鍝佽川濮嬬粓濡備竴' },
    { id: 'model-list', title: '浜у搧绯诲垪' },
    { id: 'parameters', title: '鎶€鏈弬鏁? }, { id: 'dimensions', title: '灏哄涓庤祫鏂? },
    { id: 'pagination', title: '鏇村浜у搧', description: '娌℃湁绗﹀悎鏉′欢鐨勪骇鍝併€? }
  ],
  manufacturing: [
    { id: 'hero', title: '鍏堣繘鍒堕€?, body: '鍏ㄤ骇涓氶摼鍒堕€犱笌涓ユ牸璐ㄩ噺鎺у埗銆? },
    { id: 'process', title: '涓栫晫涓€娴佺殑鐢熶骇宸ヨ壓' },
    { id: 'precision-machining', title: 'CNC杞﹂棿' }, { id: 'sheet-metal', title: '閽ｉ噾杞﹂棿' },
    { id: 'standardized-assembly', title: '瑁呴厤杞﹂棿' }, { id: 'whole-machine-validation', title: '绮惧瘑妫€娴? },
    { id: 'electrical-assembly', title: '鐢垫皵瑁呴厤' }, { id: 'smart-warehouse', title: '鏅鸿兘鐗╂枡浠撳偍' },
    { id: 'core-equipment', title: '鐢熶骇鏍稿績璁惧' }
  ],
  news: [
    { id: 'hero', title: '瑙嗛鏂伴椈', body: '灞曠ず瀹樻柟鐑棬瑙嗛銆佸睍浼氭柊闂? },
    { id: 'dynamic-news', title: '鍔ㄦ€佹柊闂?, description: '鏆傛棤鍔ㄦ€佹柊闂汇€? },
    { id: 'video-sharing', title: '瑙嗛鍒嗕韩', description: '鏆傛棤瑙嗛鍒嗕韩銆? }
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
    shortTitle: `鐞嗙敱 ${number}`,
    introTitle: `棣栭〉鐞嗙敱 ${number}`,
    introDetail: '',
    title: `棣栭〉鐞嗙敱 ${number}`,
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
    || `娈佃惤 ${index + 1}`;
}

function addServiceSections() {
  if (!pageDraft.value || !isServicePage()) return;
  const defaults = [
    {
      id: 'hero', kicker: 'SERVICE SUPPORT', title: '鍞悗鏈嶅姟', body: '鍦ㄧ嚎鎶ュ崟銆佽繘搴﹁拷韪€佷笓浜烘敮鎸侊紝鍏ㄧ▼閫忔槑鍙煡', description: '蹇汉涓€姝?, label: '鍦ㄧ嚎鏀寔',
      items: [{ label: '鍏ㄧ悆鏈嶅姟缃戠粶 鍘熷巶澶囦欢淇濋殰' }, { label: '鍥藉唴50澶氫釜鐩村睘鍔炰簨澶勶紝瑕嗙洊鍏ㄥ浗涓昏鐪佸競' }, { label: '娴峰 20 浣欏闀挎湡鍚堜綔缁忛攢鍟? }], media: []
    },
    { id: 'support', title: '鐟為挧鏀寔', body: '闇€瑕佸崗鍔?浠庤繖閲屽紑濮?, description: '杈撳叆璁惧鍨嬪彿銆佹晠闅滅幇璞°€佺淮淇繘搴︽垨淇濅慨闂', label: '鍜ㄨ AI', media: [] },
    { id: 'support-models', title: '璁惧鍨嬪彿', body: '', items: [], media: [] },
    { id: 'support-actions', title: '鏈嶅姟閫夐」', body: '閫夋嫨鏈嶅姟椤圭洰锛屾満鍨嬪彲鍦ㄥ悗缁楠よˉ鍏?, items: [], media: [] },
    { id: 'office-directory', kicker: 'RUIJUN SERVICE NETWORK', title: '鍥藉唴鐩村睘鍔炰簨澶勮鐩栧叏鍥戒富瑕佺渷甯?, body: '', items: [], media: [] }
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
  if (kind === 'model') section.items.push({ label: '鏂拌澶囧瀷鍙?, media_role: `model-${section.items.length + 1}` });
  else if (kind === 'action') section.items.push({ number: String(section.items.length + 1).padStart(2, '0'), title: '鏂版湇鍔″叆鍙?, body: '鐐瑰嚮鍚庢墦寮€瀵瑰簲鏈嶅姟', description: '', media_role: `action-${section.items.length + 1}` });
  else if (kind === 'office') section.items.push({ title: '鏂板尯鍩?, media_role: `office-${section.items.length + 1}`, map_media_role: `office-map-${section.items.length + 1}`, offices: [{ address: '闂ㄥ簵鍦板潃', manager: '璐熻矗浜?, phone: '' }] });
  else section.items.push({ label: '鏂拌鏄庢枃瀛? });
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
  section.items.push({ label: '', title: '鏂板唴瀹?, body: '', description: '', media_role: `item-${section.items.length + 1}`, href: '', sort_order: section.items.length, ...defaultSectionPresentation() });
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
  section.items[region].offices.push({ address: '闂ㄥ簵鍦板潃', manager: '璐熻矗浜?, phone: '' });
}

function removeOffice(section, region, index) {
  section?.items?.[region]?.offices?.splice(index, 1);
}

// Roles the website actually binds to a slot. A media entry whose role is empty
// matches none of them, so the element stays read-only on the canvas and the
// operator sees "姝や负闈欐€佺礌鏉? even after adding an asset. Derive the role from
// the asset's registered placement so "娣诲姞绱犳潗" is enough on its own.
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
  if (!String(reference.media_asset_id ?? '').trim()) return '娌跨敤瀹樼綉榛樿鍥炬';
  const asset = pageMediaOptions(pageMediaScope()).find((candidate) => String(candidate.id) === String(reference.media_asset_id));
  return asset ? pageMediaOptionLabel(asset, pageMediaScope()) : `褰撳墠寮曠敤 ${reference.media_asset_id}锛堝皻鏈€氳繃姝ら€夋嫨鍣ㄩ獙璇侊級`;
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
    error.value = `鈥?{field.label}鈥濇渶澶氬彧鑳芥湁 ${max} 涓礌鏉愩€俙;
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
    error.value = `鈥?{field.label}鈥濇渶澶氬彧鑳芥湁 ${max} 椤广€俙;
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
    error.value = '褰撳墠椤甸潰娌℃湁娉ㄥ唽璇ュ尯鍧楃被鍨嬨€?;
    return;
  }
  pageDraft.value.sections.push({ ...section, ...defaultSectionPresentation() });
  activePageSectionKey.value = section.id;
  error.value = '';
  message.value = `宸叉坊鍔犫€?{pageSectionTypeOptions.value.find((item) => item.type === section.type)?.label || section.type}鈥濆尯鍧楋紝璇峰～鍐欏唴瀹瑰悗淇濆瓨鑽夌銆俙;
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
    error.value = '褰撳墠椤甸潰娌℃湁娉ㄥ唽璇ュ尯鍧楃被鍨嬨€?;
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
  message.value = '宸插鍒跺尯鍧楋紝璇风‘璁ゅ唴瀹瑰悗淇濆瓨鑽夌銆?;
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
  message.value = '宸插鐢ㄩ璁撅紝璇风‘璁ゅ唴瀹瑰悗淇濆瓨鑽夌銆?;
  recordVisualHistory();
  postLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
  queueLivePreviewUpdate({ collection: 'pages', record: pageDraft.value });
}

// Cross-page reuse. True "shared modules" would need a new collection plus
// reference-integrity rules (what happens when a referenced block is edited or
// deleted), and the site-wide chrome is already component-driven 鈥?so the real
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
  message.value = '宸插鍒跺尯鍧楋紝鍒囨崲鍒扮洰鏍囬〉闈㈠悗鐐瑰嚮銆岀矘璐村尯鍧椼€嶃€?;
}

function pastePageSection() {
  const copied = copiedPageSection.value;
  if (!copied?.type || !pageDraft.value || !canEdit(pageDraft.value)) return;
  const definition = getPageSectionDefinition(copied.type, pageDraft.value.slug);
  if (!definition) {
    error.value = '褰撳墠椤甸潰娌℃湁娉ㄥ唽璇ュ尯鍧楃被鍨嬶紝鏃犳硶绮樿创銆?;
    return;
  }
  const sections = pageDraft.value.sections;
  const clone = createPageSectionInstance(copied.type, pageDraft.value.slug, sections);
  if (!clone) {
    error.value = '鏃犳硶涓烘鍖哄潡鐢熸垚鍞竴鏍囪瘑锛岃閲嶈瘯銆?;
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
  message.value = '宸茬矘璐村尯鍧楋紝璇风‘璁ゅ唴瀹瑰悗淇濆瓨鑽夌銆?;
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
  if (section.type && !window.confirm(`纭畾鍒犻櫎鈥?{getPageSectionDefinition(section.type, pageDraft.value.slug)?.label || '鑷畾涔夊尯鍧?}鈥濆悧锛熷垹闄や細鍦ㄤ繚瀛樿崏绋垮悗鐢熸晥銆俙)) return;
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
  if (!sections.length) return '鑷冲皯淇濈暀涓€涓〉闈㈡钀姐€?;
  const ids = new Set();
  for (const section of sections) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(section.id)) return '娈佃惤鏍囪瘑鍙兘浣跨敤灏忓啓瀛楁瘝銆佹暟瀛楀拰鐭í绾裤€?;
    if (ids.has(section.id)) return `娈佃惤鏍囪瘑鈥?{section.id}鈥濋噸澶嶃€俙;
    ids.add(section.id);
    const registeredSectionError = validatePageSectionInstance(section, pageSlug);
    if (registeredSectionError) return registeredSectionError;
    if (section.href && !isValidSiteLink(section.href)) return `娈佃惤鈥?{section.id}鈥濈殑鎸夐挳閾炬帴鍙兘浣跨敤绔欏唴璺緞鎴?HTTPS 鍦板潃銆俙;
    for (const item of Array.isArray(section.items) ? section.items : []) {
      if (item?.href && !isValidSiteLink(item.href)) return `娈佃惤鈥?{section.id}鈥濈殑閲嶅鍐呭閾炬帴鍙兘浣跨敤绔欏唴璺緞鎴?HTTPS 鍦板潃銆俙;
      const itemPresentationError = validateSectionPresentation(item);
      if (itemPresentationError) return `娈佃惤鈥?{section.id}鈥濈殑閲嶅鍐呭锛?{itemPresentationError}`;
      if (item?.anchor && !['auto', 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].includes(item.anchor)) return `娈佃惤鈥?{section.id}鈥濆寘鍚笉鍙楁敮鎸佺殑宸ヨ壓鑺傜偣閿氱偣銆俙;
    }
    const pageSize = Number(section.pagination?.page_size || 6);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 6) return `娈佃惤鈥?{section.id}鈥濈殑姣忛〉鏁伴噺鍙兘鏄?1 鑷?6銆俙;
    const presentationError = validateSectionPresentation(section);
    if (presentationError) return `娈佃惤鈥?{section.id}鈥濓細${presentationError}`;
  }
  return '';
}

function isValidSiteLink(value) {
  const href = String(value || '').trim();
  if (href.startsWith('#')) return /^#[A-Za-z][A-Za-z0-9:_-]{0,119}$/.test(href);
  return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]*$/.test(href) || /^https:\/\/[^\s/$.?#][^\s]*$/i.test(href);
}

function validateSettingLinks(links, label) {
  if (!links.length) return `${label}鑷冲皯闇€瑕佷繚鐣欎竴椤广€俙;
  for (const link of links) {
    if (!String(link.label || '').trim()) return `${label}鐨勬樉绀哄悕绉颁笉鑳戒负绌恒€俙;
    if (!isValidSiteLink(link.href)) return `${label}閾炬帴鍙兘浣跨敤绔欏唴璺緞鎴?HTTPS 鍦板潃銆俙;
  }
  return '';
}

function validateFooterColumns(columns) {
  if (!Array.isArray(columns)) return '椤佃剼鏍忕洰閰嶇疆鏃犳晥銆?;
  for (const column of columns) {
    if (!String(column?.title || '').trim()) return '椤佃剼鏍忕洰鏍囬涓嶈兘涓虹┖銆?;
    const errorText = validateSettingLinks(Array.isArray(column.links) ? column.links : [], `椤佃剼鏍忕洰鈥?{column.title}鈥濋摼鎺);
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
  if (!force && id !== selectedRepairPageId.value && !confirmDiscardChanges('鍒囨崲鍞悗椤甸潰')) return;
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
    error.value = apiError(reason, '鏃犳硶璇诲彇璇ュ瀷鍙风殑鎶€鏈弬鏁般€?);
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
    message.value = '宸插姞杞藉綋鍓嶈处鍙锋湁鏉冮檺鏌ョ湅鐨勭粨鏋勫寲鍐呭銆?;
  } catch (reason) {
    // A load right after a page reload can race the admin app's own session
    // handoff: the extension mounts with no access token, /auth/refresh answers
    // 400 ("The refresh token is required in either the payload or cookie"), and
    // every content call comes back 403. The handshake completes a moment later,
    // and Promise.all's siblings keep running anyway, so the page is in fact
    // loaded and editable 鈥?leaving the panel reporting "鏃犳硶璇诲彇鍚庡彴鍐呭" would
    // send the operator hunting a permission problem that does not exist.
    // One retry settles it; the error is only kept if it persists.
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    try {
      await Promise.all([...everyday(), ...technical()]);
      error.value = '';
      markDraftSaved();
      message.value = '宸插姞杞藉綋鍓嶈处鍙锋湁鏉冮檺鏌ョ湅鐨勭粨鏋勫寲鍐呭銆?;
    } catch (retryReason) {
      error.value = apiError(retryReason, '鏃犳硶璇诲彇鍚庡彴鍐呭銆傝纭褰撳墠璐﹀彿鏈夊唴瀹硅鍙栨潈闄愩€?);
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
  // persisted, not the canvas draft 鈥?otherwise those placeholders are read as
  // "鏈櫥璁扮殑绱犳潗" and every save is rejected. This only started biting once the
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
      message.value = '椤甸潰鑽夌宸蹭繚瀛橈紱淇濆瓨鏈熼棿鍙堟湁鏂扮殑淇敼锛屽皻鏈啓鍏ワ紝璇峰啀娆′繚瀛樸€?;
      await refreshAfterSave([]);
      return;
    }
    message.value = '椤甸潰鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    // A newly attached draft asset is not part of the previous one-time
    // preview session's allow-list. Renew it after a successful page save so
    // the canvas keeps working without requiring a manual reconnect.
    await refreshAfterSave([loadPages]);
  } catch (reason) {
    setSaveError(reason, '淇濆瓨椤甸潰澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
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
    message.value = '棣栭〉鍖哄潡鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    let reloaded = true;
    try { await loadHomepageSections(); } catch { reloaded = false; message.value += '锛堝垪琛ㄥ埛鏂板け璐ワ紝璇烽噸鏂板姞杞介〉闈㈡煡鐪嬶級'; }
    const persisted = reloaded ? homepageSections.value.find((item) => String(item.id) === String(record.id)) : null;
    if (persisted) {
      homepageSectionDraft.value = clone(persisted);
      markDraftSaved();
    } else if (reloaded) {
      message.value += '锛堜繚瀛樻垚鍔燂紝浣嗘湭鑳藉洖璇昏鍖哄潡锛岃閲嶆柊鍔犺浇椤甸潰锛?;
    }
    await refreshAfterSave([]);
  } catch (reason) {
    setSaveError(reason, '淇濆瓨棣栭〉鍖哄潡澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
  } finally { saving.value = false; }
}

async function saveRepairPage() {
  if (!repairDraft.value || !canEdit(repairDraft.value)) return;
  if (!repairPageKeys.has(repairDraft.value.page_key)) { error.value = '涓嶆敮鎸佺殑鍞悗椤甸潰閿€?; return; }
  let parsed = {};
  try {
    for (const key of ['model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo']) parsed[key] = JSON.parse(repairDraft.value[`${key}_text`] || (key === 'seo' ? '{}' : '[]'));
  } catch { error.value = '鍞悗椤甸潰閰嶇疆涓殑 JSON 鏍煎紡涓嶆纭€?; return; }
  const actions = Array.isArray(parsed.action_cards) ? parsed.action_cards : [];
  if (actions.some((item) => !repairActionCodes.has(String(item.action)))) { error.value = '鍔ㄤ綔鍗＄墖浠呭厑璁?01銆?2銆?9銆?0銆?; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/repair_page_configs/${encodeURIComponent(repairDraft.value.id)}`, { page_key: repairDraft.value.page_key, title: repairDraft.value.title, intro: repairDraft.value.intro, hero_asset: repairDraft.value.hero_asset || null, ...parsed, language: repairDraft.value.language || 'zh-CN' });
    message.value = '鍞悗椤甸潰鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    await refreshAfterSave([loadRepairPages]);
  } catch (reason) { error.value = apiError(reason, '淇濆瓨鍞悗椤甸潰鑽夌澶辫触銆?); }
  finally { saving.value = false; }
}

async function saveSeries() {
  if (!seriesDraft.value || !canEdit(seriesDraft.value)) return;
  const invalidDetailFeature = (seriesDraft.value.detail?.features || []).find((feature) => !String(feature?.label || '').trim());
  if (invalidDetailFeature) { error.value = '姣忎釜璁惧缁勬垚椤归兘蹇呴』濉啓鏍囬銆?; return; }
  const previous = series.value.find((item) => String(item.id) === String(seriesDraft.value.id));
  const previousCode = String(previous?.series_code || '').trim();
  const nextCode = String(seriesDraft.value.series_code || '').trim();
  if (!nextCode) { error.value = '鎵€灞炵郴鍒楃紪鐮佷笉鑳戒负绌恒€?; return; }
  if (series.value.some((item) => String(item.id) !== String(seriesDraft.value.id) && String(item.series_code || '').trim() === nextCode)) {
    error.value = '璇ョ郴鍒楃紪鐮佸凡琚叾浠栫郴鍒椾娇鐢紝璇锋崲涓€涓€?;
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
      error.value = `璇ョ郴鍒椾笅鏈?${locked.length} 涓凡鍙戝竷鎴栧鏍镐腑鐨勬満鍨嬶紝淇敼绯诲垪缂栫爜鍓嶈鍏堜笅绾匡紱鏈鏈繚瀛樸€俙;
      return;
    }
    if (!window.confirm(`绯诲垪缂栫爜灏嗕粠銆?{previousCode}銆嶆敼涓恒€?{nextCode}銆嶏紝骞跺悓姝ユ洿鏂?${renamedModels.length} 涓満鍨嬨€傜‘璁や繚瀛橈紵`)) return;
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
      ? `浜у搧绯诲垪鑽夌宸蹭繚瀛橈紝骞跺悓姝ユ洿鏂?${renamedModels.length} 涓満鍨嬬殑鎵€灞炵郴鍒楃紪鐮併€俙
      : '浜у搧绯诲垪鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    if (JSON.stringify(seriesDraft.value) !== seriesBefore) {
      message.value = '浜у搧绯诲垪鑽夌宸蹭繚瀛橈紱淇濆瓨鏈熼棿鍙堟湁鏂扮殑淇敼锛屽皻鏈啓鍏ワ紝璇峰啀娆′繚瀛樸€?;
      await refreshAfterSave([]);
      return;
    }
    markDraftSaved();
    await refreshAfterSave(renamedModels.length ? [loadSeries, loadModels] : [loadSeries]);
    if (renamedModels.length && modelDraft.value && renamedModels.some((model) => String(model.id) === String(modelDraft.value.id))) {
      modelDraft.value.series_code = nextCode;
    }
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨浜у搧绯诲垪澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
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
    message.value = '浼佷笟璧勬枡鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    await refreshAfterSave([loadCompany]);
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨浼佷笟璧勬枡澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
  } finally { saving.value = false; }
}

async function createServiceResource() {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const response = await api.post('/items/service_resources', {
      source_key: nextServiceKey('service-resource'), type: 'video', title: '鏈懡鍚嶆湇鍔¤祫鏂?, language: 'zh-CN',
      applicable_models: [], sort_order: service.value.service_resources.length, status: 'draft', publication_state: 'unpublished'
    });
    const id = response.data?.data?.id;
    await loadService();
    if (id) selectServiceRecord(id, true);
    message.value = '鏂扮殑鏈嶅姟璧勬枡鑽夌宸插垱寤恒€傝濉啓鍐呭骞跺叧鑱斿凡瀹℃牳鐨勬枃浠躲€?;
  } catch (reason) { error.value = apiError(reason, '鍒涘缓鏈嶅姟璧勬枡鑽夌澶辫触銆?); }
  finally { saving.value = false; }
}

async function createKnowledgeRecord() {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const response = await api.post('/items/knowledge_items', {
      source_key: nextServiceKey('website-knowledge'), visibility: 'public', channel: 'website', category: 'knowledge_share',
      question_title: '鏈懡鍚嶇煡璇嗗唴瀹?, applicable_models: [], error_codes: [], symptoms: '', troubleshooting_steps: [{ type: 'manual_step', content: '璇峰～鍐欏唴瀹? }],
      risk_level: 'low', safety_preconditions: [], media: [], version: 'v1.0', technical_reviewer: '寰呮寚瀹?,
      sort_order: knowledgeItems.value.length, status: 'draft', publication_state: 'unpublished'
    });
    const id = response.data?.data?.id;
    await loadKnowledge();
    if (id) selectKnowledge(id, true);
    message.value = '鏂扮殑瀹樼綉鐭ヨ瘑鑽夌宸插垱寤恒€?;
  } catch (reason) { error.value = apiError(reason, '鍒涘缓瀹樼綉鐭ヨ瘑鑽夌澶辫触銆?); }
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
    message.value = '鏈嶅姟鏀寔鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    await refreshAfterSave([loadService]);
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨鏈嶅姟鏀寔鍐呭澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
  } finally { saving.value = false; }
}

async function saveKnowledge() {
  if (!knowledgeDraft.value || !canEdit(knowledgeDraft.value)) return;
  const stepsText = String(knowledgeDraft.value.troubleshootingStepsText || '').trim();
  if (!stepsText) { error.value = '璇峰～鍐欒嚦灏戜竴鏉℃帓闅滄楠ゆ垨淇濈暀鍘熷鐭ヨ瘑鍐呭銆?; return; }
  if (knowledgeDraft.value.risk_level === 'high' && (!String(knowledgeDraft.value.safetyPreconditionsText || '').trim() || !String(knowledgeDraft.value.escalation_guidance || '').trim())) {
    error.value = '楂橀闄╃煡璇嗗繀椤昏ˉ鍏呭畨鍏ㄥ墠缃潯浠跺拰浜哄伐鍗囩骇璇存槑銆?;
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
    message.value = '甯歌闂鐭ヨ瘑鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    await refreshAfterSave([loadKnowledge]);
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨甯歌闂鐭ヨ瘑鑽夌澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
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
      throw new Error('涓婁紶鎺ュ彛鏈繑鍥炲畬鏁寸殑鏂囦欢鍏冩暟鎹?);
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
      ? '濯掍綋绱犳潗宸蹭笂浼犲苟鍙戝竷銆傛祻瑙堝櫒鏈兘璇诲彇鐪熷疄灏哄锛屽悗鍙版寜灞曠ず浣嶅缓璁昂瀵告爣璁帮紝璇锋牳瀵规樉绀烘晥鏋溿€?
      : '濯掍綋绱犳潗宸蹭笂浼犲苟鍙戝竷锛屽彲鐩存帴鍦ㄧ敾甯冧腑浣跨敤銆?;
    await Promise.all([loadMediaCandidates(), loadMediaAssets()]);
    markDraftSaved();
  } catch (reason) {
    if (uploadedFileId && !mediaRegistered) {
      try { await api.delete(`/files/${encodeURIComponent(uploadedFileId)}`); } catch { /* Keep the original error if orphan cleanup is unavailable. */ }
    }
    error.value = mediaRegistered
      ? '绱犳潗宸茬櫥璁帮紝浣嗗垪琛ㄥ埛鏂板け璐ャ€傛枃浠跺凡淇濈暀锛岃閲嶆柊鍔犺浇锛屼笉瑕侀噸澶嶄笂浼犮€?
      : apiError(reason, '濯掍綋涓婁紶鎴栧€欓€夌櫥璁板け璐ワ紝瀹樼綉鍐呭娌℃湁鏇存柊銆?);
  } finally { saving.value = false; }
}

async function createEditorialRecord({ media = [] } = {}) {
  saving.value = true; error.value = ''; message.value = '';
  try {
    const payload = editorialMode.value === 'articles'
      ? { slug: nextDraftSlug('article'), category: editorialCategory.value || 'news', title: '鏈懡鍚嶆枃绔?, display_date: new Date().toISOString().slice(0, 10), sort_order: 0, summary: '', body: '', transcript: '', media: Array.isArray(media) ? media : [], seo: {}, published_at: new Date().toISOString().slice(0, 10), status: 'draft', publication_state: 'unpublished' }
      : { slug: nextDraftSlug('case-study'), industry: '', material: '', thickness: '', model_code: '', process: '', result: '', authorization_status: 'review_required', status: 'draft', publication_state: 'unpublished' };
    const response = await api.post(`/items/${encodeURIComponent(editorialMode.value)}`, payload);
    const id = response.data?.data?.id;
    await loadEditorial();
    if (id) selectEditorialRecord(id, true);
    markDraftSaved();
    invalidateSubmissionQueue();
    message.value = editorialMode.value === 'articles' ? '鏂扮殑鏂囩珷鑽夌宸插垱寤恒€? : '鏂扮殑瀹㈡埛妗堜緥鑽夌宸插垱寤恒€?;
  } catch (reason) {
    error.value = apiError(reason, '鍒涘缓鑽夌澶辫触锛岃纭褰撳墠璐﹀彿鎷ユ湁鍐呭缂栬緫鏉冮檺銆?);
  } finally { saving.value = false; }
}

// 鐢诲竷鍐呯殑鈥滄柊寤哄唴瀹光€濓細浠庢柊闂诲垪琛ㄧ敾甯冪洿鎺ュ缓涓€绡囪棰戝垎浜垨鍔ㄦ€佹柊闂伙紝
// 寤哄畬鑷姩鍒囧埌璇ユ枃绔犵殑璇︽儏鐢诲竷锛屼笉绂诲紑鐢诲竷鍘诲乏渚ц〃鍗曘€?
async function createEditorialFromCanvas(category) {
  if (category === 'video') {
    if (!confirmDiscardChanges('鏂板瑙嗛鍒嗕韩')) return;
    // 浠庝笓娉ㄧ敾甯冪偣鈥滄柊澧炶棰戝垎浜€濇椂锛岀紪杈戝尯琚笓娉ㄦ牱寮忛殣钘忥紱鍏堥€€鍑轰笓娉紝
    // 鍐嶅垏鍒拌棰戝垎浜伐浣滃尯骞舵墦寮€鏂板寮圭獥銆?
    visualCanvasFocus.value = false;
    editorialMode.value = 'articles';
    editorialCategory.value = 'video';
    activeTab.value = 'editorial';
    await nextTick();
    videoShareWorkspace.value?.openCreate();
    return;
  }
  if (!confirmDiscardChanges('鏂板缓鍐呭')) return;
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
  message.value = '宸叉柊寤哄姩鎬佹柊闂昏崏绋匡紝鍙洿鎺ュ湪鐢诲竷涓紪杈戙€?;
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
  createArticleTitle.value = createArticleCategory.value === 'video' ? '鏂板缓瑙嗛鍒嗕韩' : '鏂板缓鍔ㄦ€佹柊闂?;
  createArticleMediaId.value = '';
  createArticleOpen.value = true;
}
async function confirmCreateArticle() {
  const title = createArticleTitle.value.normalize('NFKC').trim().slice(0, 240);
  if (!title) { error.value = '鏍囬涓嶈兘涓虹┖銆?; return; }
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
    // 鍔ㄦ€佹柊闂荤殑鍥剧墖鏄皝闈㈠瓧娈碉紝涓嶆槸瑙嗛鏂囩珷閭ｇ media 鍒楄〃銆?
    if (!isVideo && mediaId) payload.cover_asset = mediaId;
    await api.post('/items/articles', payload);
    createArticleOpen.value = false;
    await Promise.all([loadEditorial(), loadMediaAssets()]);
    await startLiveWebsitePreview();
    message.value = `宸叉柊澧炪€?{title}銆?{mediaId ? '骞剁粦瀹氭墍閫夊獟浣? : ''}锛屽彲鍦ㄧ敾甯冧腑缁х画缂栬緫銆俙;
  } catch (reason) {
    error.value = apiError(reason, '鏂板鏂囩珷澶辫触銆?);
  } finally {
    createArticleSaving.value = false;
  }
}

// 鏂囩珷淇℃伅闈㈡澘鍙兘鍏堝湪鈥滈〉闈㈣崏绋库€濈姸鎬佷笅琚墦寮€锛涙鏃剁洿鎺ョ紪杈?editorialDraft
// 涓嶄細鏀瑰彉褰撳墠鑽夌鎸囩汗锛屼繚瀛樿崏绋夸細涓€鐩存槸鐏扮殑銆傝仛鐒﹂潰鏉挎椂鍏堝垏鍒拌鏂囩珷鑽夌銆?
function ensureArticleDraftActive() {
  const record = selectedVisualRecord.value?.record;
  if (!record?.id) return;
  if (activeTab.value === 'editorial' && String(editorialDraft.value?.id || '') === String(record.id)) return;
  activateVisualEditingTarget({ collection: 'articles', itemId: record.id, fieldPath: selectedVisualElement.value?.fieldPath || '' });
}

async function deleteSelectedVisualArticle() {  const record = selectedVisualRecord.value?.record;
  if (!record?.id) return;
  await deleteArticleFromCanvas({ collection: 'articles', targetItemId: String(record.id), label: `鍒犻櫎 ${record.title || ''}` });
}

async function deleteSelectedVideoShareCard() {
  const mediaAssetId = String(selectedVisualElement.value?.mediaAssetId || '').trim();
  if (!mediaAssetId) return;
  await deleteCandidateMedia({
    mediaAssetId,
    label: `鍒犻櫎 ${selectedVisualElement.value?.label || '褰撳墠瑙嗛鍒嗕韩鍗＄墖'}`
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
  if (!image) { error.value = '姝ｆ枃涓壘涓嶅埌杩欏紶鍥剧墖鐨勫彈鎺ц褰曘€?; return; }
  image.remove();
  draft.body = container.innerHTML;
  visualMediaSaving.value = true; error.value = ''; message.value = '';
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: mediaAssetId });
    message.value = '姝ｆ枃鍥剧墖宸插垹闄わ紝淇濆瓨鑽夌鍚庡畼缃戠敓鏁堛€?;
  } catch (reason) {
    error.value = apiError(reason, '鍥剧墖宸蹭粠姝ｆ枃绉婚櫎锛屼絾绱犳潗浠嶈鍏朵粬鍐呭寮曠敤锛屾湭鍒犻櫎濯掍綋璧勪骇銆?);
  } finally {
    visualMediaSaving.value = false;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    queueLivePreviewUpdate(selectedVisualRecord.value);
    clearVisualSelection();
  }
}

// Canvas "锛?/ 脳" buttons name one of these arrays directly. The allowlist keeps
// the command surface as small as the two detail editors that expose it.
const canvasListPaths = new Set(['configuration.features', 'detail.features']);

function canvasListTarget(collection, itemId) {
  if (collection === 'product_models') return modelDraft.value && String(modelDraft.value.id) === itemId ? modelDraft.value : null;
  if (collection === 'product_series') return seriesDraft.value && String(seriesDraft.value.id) === itemId ? seriesDraft.value : null;
  return null;
}

// A record whose detail was never initialized renders the website original. Both
// "锛? and "脳" seed that original into the draft first, otherwise the edit would
// replace the visible copy with a single blank row (add) or hit nothing at all
// (remove). Returns false when nothing can be seeded.
function seedCanvasListDetail(collection, record) {
  if (collection === 'product_models') {
    if (Array.isArray(record.configuration?.features) && record.configuration.features.length) return true;
    initializeModelDetail();
    if (Array.isArray(record.configuration?.features) && record.configuration.features.length) return true;
    error.value = '璇ュ瀷鍙锋病鏈夊彲鍒濆鍖栫殑瀹樼綉鍘熺増璇︽儏锛岃鍏堝湪宸︿晶琛ㄥ崟鏂板銆?;
    return false;
  }
  if (collection === 'product_series') {
    if (Array.isArray(record.detail?.features) && record.detail.features.length) return true;
    if (!seriesSupportsDetail.value) {
      error.value = '璇ョ郴鍒楀睘浜庡瀷鍙峰瀷绯诲垪锛屾病鏈夌郴鍒楃骇璇︽儏锛涜鍏堥€変腑鍏蜂綋鍨嬪彿鍐嶇紪杈戝畠鐨勪粙缁嶄笌鐗圭偣銆?;
      return false;
    }
    initializeSeriesDetail();
    if (Array.isArray(record.detail?.features) && record.detail.features.length) return true;
    error.value = '璇ョ郴鍒楁病鏈夊彲鍒濆鍖栫殑瀹樼綉鍘熺増璇︽儏锛岃鍏堝湪宸︿晶琛ㄥ崟鏂板銆?;
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
  if (!owner) { error.value = '鐢诲竷娌℃湁璇嗗埆鍒拌璇︽儏鎵€灞炵殑绯诲垪锛岃鍏堝湪宸︿晶閫変腑绯诲垪鍚庡啀澧炲垹銆?; return; }
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
      if (!target) { error.value = '娌℃湁鎵惧埌璇ヨ鎯呭搴旂殑鍨嬪彿璁板綍锛岃鍏堝湪宸︿晶閫変腑鍨嬪彿銆?; return; }
      await selectModel(target.id, true);
    } else {
      const target = series.value.find((candidate) => String(candidate.id) === itemId);
      if (!target) { error.value = '娌℃湁鎵惧埌璇ヨ鎯呭搴旂殑绯诲垪璁板綍锛岃鍏堝湪宸︿晶閫変腑绯诲垪銆?; return; }
      selectSeries(target.id, true, false, false);
    }
    record = canvasListTarget(collection, itemId);
  }
  if (!record || !canEdit(record)) { error.value = '璇ュ唴瀹瑰綋鍓嶄笉鍙紪杈戯紝鏃犳硶鍦ㄧ敾甯冧腑澧炲垹鍒楄〃椤广€?; return; }
  error.value = '';
  if (kind === 'remove') {
    const index = Number(payload?.listIndex);
    const items = path.split('.').reduce((cursor, part) => (cursor && typeof cursor === 'object' ? cursor[part] : null), record);
    const label = String(payload?.listLabel || (Array.isArray(items) ? items[index]?.label : '') || '').trim();
    if (!window.confirm(`纭鍒犻櫎${label ? `銆?{label}銆峘 : `绗?${index + 1} 椤筦}鍚楋紵璇ユ搷浣滀細鍦ㄤ繚瀛樿崏绋垮悗鐢熸晥銆俙)) return;
    if (!seedCanvasListDetail(collection, record)) return;
    const removed = removeVisualListItemAt(record, path, index);
    if (!removed) return;
    clearVisualSelection();
    recordVisualHistory();
    postLivePreviewUpdate({ collection, record });
    queueLivePreviewUpdate({ collection, record });
    message.value = '宸插垹闄や竴椤癸紝淇濆瓨鑽夌鍚庣敓鏁堛€?;
    return;
  }
  if (!seedCanvasListDetail(collection, record)) return;
  const added = appendVisualListItem(record, path);
  if (!added) {
    error.value = '褰撳墠璇︽儏娌℃湁鍙柊澧炵殑鍒楄〃锛岃鍏堝湪宸︿晶鍒濆鍖栬鎯呫€?;
    return;
  }
  recordVisualHistory();
  postLivePreviewUpdate({ collection, record });
  queueLivePreviewUpdate({ collection, record });
  message.value = '宸插啓鍏ュ畼缃戝師鐗堣鎯呭苟杩藉姞涓€鏉＄┖鐧芥潯鐩紝濉啓鏍囬鍚庝繚瀛樿崏绋垮嵆鍙€?;
}

// A product-series card is a `product_series` record with models and parameters
// hanging off its series code. Creating one is a draft; deleting one is only
// allowed while it has no models and has never been published.
// A draft card in the canvas has no editable form of its own yet: clicking its name
// opens the series in the left panel (and shows that series in the canvas).
// "锛?鏂板绯诲垪鍗＄墖" opens a form first: the operator types the name/positioning and
// picks a cover, then confirms 鈥?the card is created with real content instead of
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
  if (!name) { seriesCreateError.value = '璇峰～鍐欑郴鍒楀悕绉般€?; return; }
  const code = String(seriesCreateDraft.code || '').trim();
  if (!code) { seriesCreateError.value = '璇峰～鍐欑郴鍒楃紪鐮侊紱涓枃鍚嶇О涓嶄細鑷姩鐢熸垚缂栫爜锛岃鎵嬪姩濉啓鑻辨枃缂栫爜銆?; return; }
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(code)) { seriesCreateError.value = '绯诲垪缂栫爜鍙兘浣跨敤灏忓啓瀛楁瘝銆佹暟瀛楀拰杩炲瓧绗︼紝涓斾互瀛楁瘝鎴栨暟瀛楀紑澶淬€?; return; }
  if (series.value.some((item) => String(item.series_code || '').toLowerCase() === code.toLowerCase())) {
    seriesCreateError.value = `绯诲垪缂栫爜銆?{code}銆嶅凡琚叾浠栫郴鍒椾娇鐢紝璇锋崲涓€涓€俙;
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
      positioning: String(seriesCreateDraft.positioning || '').trim() || '寰呭～鍐?,
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
        label: record.name || record.series_code || '鏂扮郴鍒?
      }, livePreviewWebsiteOrigin.value);
    } else {
      await loadSeries();
    }
    message.value = `宸叉柊澧炶崏绋垮崱鐗囥€?{name}銆嶏紝鍙湪宸︿晶缁х画琛ュ厖璇︽儏鍚庝繚瀛樸€俙;
    seriesCreateOpen.value = false;
  } catch (reason) {
    seriesCreateError.value = apiError(reason, '鏂板绯诲垪鍗＄墖澶辫触銆?);
  } finally {
    seriesCreateSaving.value = false;
  }
}
// A model chip in the canvas taps straight into the workbench: an existing record is
// selected, a template-only name gets a draft record so its name becomes editable.
async function focusCanvasModel(payload) {
  const code = String(payload?.modelCode || payload?.modelName || '').trim();
  if (!code) { error.value = '鐢诲竷娌℃湁璇嗗埆鍒版満鍨嬪悕绉般€?; return; }
  const activeWasDirty = hasUnsavedChanges.value;
  const dirtyKeysBefore = new Set(dirtyCachedDraftKeys());
  const seriesCode = String(payload?.seriesCode || '').trim();
  const modelId = String(payload?.modelId || '').trim();
  // Prefer the record id the canvas sent: resolving by name alone could land on a
  // same-named model of another family (and jump to 鐏靛姩鍒囧壊宸ヤ綔绔?.
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
    message.value = '宸插湪宸︿晶鎵撳紑璇ユ満鍨嬶紝鍙慨鏀瑰悕绉般€佸弬鏁颁笌璇︽儏銆?;
    return;
  }
  // A template-only name belongs to the website original, not a CMS record.
  // Selecting it must not create a record (which also reloaded the canvas); the
  // explicit "锛嬫柊澧炴満鍨? action is the creation path.
  error.value = '';
  message.value = '璇ユ満鍨嬫槸瀹樼綉鍘熺増鍚嶇О锛屽皻鏈缓绔?CMS 璁板綍锛涜鐐圭敾甯冧笂鐨勩€岋紜鏂板鏈哄瀷銆嶅缓绔嬪悗鍐嶇紪杈戙€?;
}
function baselineCanvasSelection(activeWasDirty, dirtyKeysBefore) {
  // Opening a card from the canvas is a read/navigation action. Series
  // normalization, auto-selecting the first model and the async parameter load
  // all mutate drafts after render; without re-baselining them the badge showed
  // "鏈繚瀛? immediately after clicking "璇︽儏" without any operator input.
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
  if (!activated?.record) { error.value = '娌℃湁鎵惧埌璇ョ郴鍒楄崏绋匡紝璇峰埛鏂板悗閲嶈瘯銆?; return; }
  baselineCanvasSelection(activeWasDirty, dirtyKeysBefore);
  message.value = '宸插湪宸︿晶鎵撳紑璇ョ郴鍒楋細琛ュ厖鍚嶇О銆佸畾浣嶃€佸皝闈笌鏈哄瀷鍚庝繚瀛樸€?;
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
      series_code: `鏂扮郴鍒?${series.value.length + 1}`,
      slug: `new-series-${stamp}`,
      name: '鏂扮郴鍒?,
      positioning: '寰呭～鍐?,
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
      // Select the card on the canvas as well: otherwise the next "鏂板鏈哄瀷"
      // still sends the previous `activeSeriesCode`.
      selectSeries(record.id, true);
      // Tell the canvas where the new card went: it lives in the draft strip below
      // the grid, so without this the click looked like it did nothing.
      livePreviewFrame.value?.contentWindow?.postMessage({
        type: 'ruijun:cms-preview:notice',
        kind: 'series-added',
        itemId: String(record.id),
        label: record.name || record.series_code || '鏂扮郴鍒?
      }, livePreviewWebsiteOrigin.value);
    } else {
      await loadSeries();
    }
    message.value = '宸叉柊澧炰竴鏉＄郴鍒楀崱鐗囪崏绋匡紙鍚嶇О銆佸畾浣嶃€佸皝闈㈠緟濉啓锛夛紝鍙戝竷鍓嶉渶琛ユ潵婧愪笌鏈哄瀷銆?;
  } catch (reason) {
    error.value = apiError(reason, '鏂板绯诲垪鍗＄墖澶辫触銆?);
  }
}

async function removeCanvasSeries(payload) {
  const id = String(payload?.seriesRecordId || '').trim();
  const record = series.value.find((item) => String(item.id) === id);
  if (!record) { error.value = '鐢诲竷娌℃湁璇嗗埆鍒拌鍒犻櫎鐨勭郴鍒楀崱鐗囥€?; return; }
  if (!canDeleteContent(record)) {
    error.value = '宸插彂甯冩垨瀹℃牳涓殑绯诲垪涓嶈兘鐩存帴鍒犻櫎锛岃鍏堝湪鍙戝竷闃熷垪涓嬬嚎骞堕€€鍥炶崏绋裤€?;
    return;
  }
  error.value = ''; message.value = '';
  let childModels = [];
  try {
    const modelsResponse = await api.get(`/items/product_models?fields=id,model_code,status,publication_state&filter[series_code][_eq]=${encodeURIComponent(String(record.series_code || ''))}&limit=-1`);
    childModels = Array.isArray(modelsResponse.data?.data) ? modelsResponse.data.data : [];
  } catch {
    error.value = '鏃犳硶纭璇ョ郴鍒椾笅鐨勬満鍨嬶紝鏈墽琛屽垹闄ゃ€?;
    return;
  }
  const undeletableModels = childModels.filter((model) => !canDeleteContent(model));
  if (undeletableModels.length) {
    error.value = `璇ョ郴鍒椾笅鏈?${undeletableModels.length} 鍙板凡鍙戝竷鎴栧鏍镐腑鐨勬満鍨嬶紝涓嶈兘绾ц仈鍒犻櫎锛涜鍏堝湪鍙戝竷闃熷垪涓嬬嚎骞堕€€鍥炶崏绋裤€俙;
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
      error.value = '鏃犳硶纭璇ョ郴鍒楁満鍨嬬殑鎶€鏈弬鏁帮紝鏈墽琛屽垹闄ゃ€?;
      return;
    }
  }
  const undeletableParameters = childParameters.filter((parameter) => !canDeleteContent(parameter));
  if (undeletableParameters.length) {
    error.value = `璇ョ郴鍒椾笅鏈?${undeletableParameters.length} 鏉″凡鍙戝竷鎴栧鏍镐腑鐨勫弬鏁帮紝涓嶈兘绾ц仈鍒犻櫎锛涜鍏堝湪鍙戝竷闃熷垪涓嬬嚎骞堕€€鍥炶崏绋裤€俙;
    return;
  }
  const cascadeNote = childModels.length
    ? `鍙婂叾 ${childModels.length} 鍙版満鍨?{childParameters.length ? `銆?{childParameters.length} 鏉″弬鏁癭 : ''}`
    : '';
  if (!window.confirm(`纭鍒犻櫎绯诲垪銆?{record.name || record.series_code}銆?{cascadeNote}鍚楋紵鍒犻櫎鍚庨渶瑕侀噸鏂板缓绔嬨€俙)) return;
  try {
    for (const parameter of childParameters) {
      await api.delete(`/items/product_parameters/${encodeURIComponent(String(parameter.id))}`);
    }
    for (const model of childModels) {
      await api.delete(`/items/product_models/${encodeURIComponent(String(model.id))}`);
      dropCachedProductDraft('product_models', model.id);
    }
    await api.delete(`/items/product_series/${encodeURIComponent(String(record.id))}`);
    message.value = childModels.length ? '绯诲垪鍗＄墖鍙婂叾鏈哄瀷銆佸弬鏁板凡鍒犻櫎銆? : '绯诲垪鍗＄墖宸插垹闄ゃ€?;
    dropCachedProductDraft('product_series', record.id);
    await loadSeries();
    await loadModels();
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '鍒犻櫎绯诲垪鍗＄墖澶辫触銆?);
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
  if (!seriesCode) { error.value = '鐢诲竷娌℃湁璇嗗埆鍒版墍灞炵郴鍒楋紝璇峰厛鍦ㄥ乏渚ч€変腑绯诲垪銆?; return; }
  const siblings = models.value.filter((model) => String(model.series_code || '') === seriesCode);
  const slug = `new-model-${Date.now().toString(36)}`;
  // A brand-new series has no official template, so seeding it with the default
  // (pro family) copy made every new card show that family's photo and features.
  const seeded = siblings.length ? defaultModelConfiguration({ series_code: seriesCode, slug }) : null;
  error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_models', {
      series_code: seriesCode,
      model_code: `鏂版満鍨?${siblings.length + 1}`,
      slug,
      // Keep the visible chip unique from the start; the name is the canvas
      // label, so a shared "鏂版満鍨? made every new model look identical.
      name: `鏂版満鍨?${siblings.length + 1}`,
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
    message.value = '宸叉柊澧炰竴鏉℃満鍨嬭崏绋匡紙鍚嶇О涓庡瀷鍙风紪鐮佸緟濉啓锛夛紝鍙戝竷鍓嶉渶琛ユ潵婧愪笌鍙傛暟銆?;
  } catch (reason) {
    error.value = apiError(reason, '鏂板鏈哄瀷澶辫触銆?);
  }
}

async function removeCanvasModel(payload) {
  const id = String(payload?.modelId || '').trim();
  const record = models.value.find((model) => String(model.id) === id);
  if (!record) { error.value = '鐢诲竷娌℃湁璇嗗埆鍒拌鍒犻櫎鐨勬満鍨嬶紝璇峰厛鍦ㄥ乏渚ч€変腑鏈哄瀷銆?; return; }
  if (!canDeleteContent(record)) {
    error.value = '宸插彂甯冩垨瀹℃牳涓殑鏈哄瀷涓嶈兘鐩存帴鍒犻櫎锛岃鍏堝湪鍙戝竷闃熷垪涓嬬嚎骞堕€€鍥炶崏绋裤€?;
    return;
  }
  error.value = ''; message.value = '';
  try {
    // Parameters are keyed by model_code, so deleting the model would orphan them.
    const response = await api.get(`/items/product_parameters?fields=id&filter[model_code][_eq]=${encodeURIComponent(String(record.model_code || ''))}&limit=1`);
    const parameterRows = Array.isArray(response.data?.data) ? response.data.data : [];
    if (parameterRows.length) {
      error.value = '璇ユ満鍨嬭繕鏈夋妧鏈弬鏁帮紝璇峰厛鍒犻櫎鍙傛暟鍚庡啀鍒犻櫎鏈哄瀷銆?;
      return;
    }
  } catch { /* the delete below still reports the real failure */ }
  if (!window.confirm(`纭鍒犻櫎鏈哄瀷銆?{record.model_code || record.id}銆嶅悧锛熷垹闄ゅ悗闇€瑕侀噸鏂板缓绔嬨€俙)) return;
  try {
    await api.delete(`/items/product_models/${encodeURIComponent(String(record.id))}`);
    message.value = '鏈哄瀷宸插垹闄ゃ€?;
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
    error.value = apiError(reason, '鍒犻櫎鏈哄瀷澶辫触銆?);
  }
}

// Parameter rows are records, not JSON entries: the canvas buttons create and
// delete a draft parameter via the API, and the published guard below keeps
// published rows out of reach.
async function addCanvasParameter(payload) {
  const modelCode = String(payload?.modelCode || '').trim();
  if (!modelCode) { error.value = '鐢诲竷娌℃湁璇嗗埆鍒板綋鍓嶅瀷鍙凤紝璇峰厛鍦ㄥ乏渚ч€変腑鍨嬪彿銆?; return; }
  const rows = parameters.value.filter((parameter) => String(parameter.model_code || '') === modelCode);
  const sortOrder = rows.reduce((max, parameter) => Math.max(max, Number(parameter.sort_order) || 0), 0) + 1;
  error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_parameters', {
      model_code: modelCode,
      field_name: '鏂板弬鏁?,
      value: '寰呭～鍐?,
      unit: null,
      test_conditions: null,
      sort_order: sortOrder,
      status: 'draft',
      publication_state: 'unpublished'
    });
    const record = created?.data?.data;
    if (record) {
      // Push the new row instead of reloading the canvas: repeated "鏂板鍙傛暟"
      // used to reload after every click and lose the table's scroll/selection.
      postLivePreviewUpdate({ collection: 'product_parameters', record });
      queueLivePreviewUpdate({ collection: 'product_parameters', record });
    }
    message.value = '宸叉柊澧炰竴鏉℃妧鏈弬鏁拌崏绋匡紝璇峰～鍐欏悕绉颁笌鏁板€硷紙鍙戝竷鍓嶈繕闇€琛ュ厖鏉ユ簮锛夈€?;
    if (record && modelDraft.value && String(modelDraft.value.model_code) === modelCode) upsertParameter(record);
    else if (!record) await loadParameters(modelCode);
    if (!record && liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '鏂板鎶€鏈弬鏁板け璐ャ€?);
  }
}

async function removeCanvasParameter(payload) {
  const id = String(payload?.parameterId || '').trim();
  if (!id) { error.value = '娌℃湁璇嗗埆鍒拌鍒犻櫎鐨勫弬鏁般€?; return; }
  const modelCode = String(payload?.modelCode || '').trim();
  let record = parameters.value.find((parameter) => String(parameter.id) === id);
  // The row may belong to a model whose parameter list is not loaded locally;
  // read it once so the delete still works instead of failing silently.
  if (!record) {
    try {
      const response = await api.get(`/items/product_parameters/${encodeURIComponent(id)}`);
      record = response?.data?.data || null;
    } catch (reason) {
      error.value = apiError(reason, '娌℃湁鎵惧埌杩欐潯鍙傛暟锛屽彲鑳藉凡琚垹闄ゃ€?);
      return;
    }
  }
  if (!record) { error.value = '娌℃湁鎵惧埌杩欐潯鍙傛暟锛屽彲鑳藉凡琚垹闄ゃ€?; return; }
  if (!canDeleteContent(record)) {
    error.value = '宸插彂甯冩垨瀹℃牳涓殑鍙傛暟涓嶈兘鐩存帴鍒犻櫎锛岃鍏堝湪鍙戝竷闃熷垪涓嬬嚎骞堕€€鍥炶崏绋裤€?;
    return;
  }
  if (!window.confirm(`纭鍒犻櫎鍙傛暟銆?{record.field_name || record.id}銆嶅悧锛熷垹闄ゅ悗闇€瑕侀噸鏂板缓绔嬨€俙)) return;
  error.value = ''; message.value = '';
  try {
    await api.delete(`/items/product_parameters/${encodeURIComponent(id)}`);
    message.value = '鎶€鏈弬鏁板凡鍒犻櫎銆?;
    const reloadCode = modelCode || String(record.model_code || '');
    if (modelDraft.value && String(modelDraft.value.model_code) === reloadCode) {
      parameters.value = parameters.value.filter((row) => String(row.id) !== String(id));
      clearParameterDirty(id);
    }
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '鍒犻櫎鎶€鏈弬鏁板け璐ャ€?);
  }
}

async function deleteCandidateMedia(payload) {  const id = String(payload?.mediaAssetId || '').trim();
  if (!id) return;
  const label = String(payload?.label || '').replace(/^鍒犻櫎\s*/, '') || `#${id}`;
  error.value = ''; message.value = '';
  try {
    await api.post('/media-poster/asset/delete', { media_asset_id: id });
    message.value = `绱犳潗銆?{label}銆嶅凡鍒犻櫎銆俙;
    await Promise.all([loadMediaAssets(), loadMediaCandidates()]);
    if (liveWebsitePreviewVisible.value) await startLiveWebsitePreview();
  } catch (reason) {
    error.value = apiError(reason, '绱犳潗浠嶈鍏朵粬鍐呭寮曠敤锛屾湭鍒犻櫎銆?);
  }
}

async function deleteAllCandidateVideos() {
  const candidates = mediaAssets.value.filter((asset) => (
    String(asset.media_type || '').toLowerCase() === 'video'
    && String(asset.placement_key || '') === 'news.video_share.list'
  ));
  if (!candidates.length) { message.value = '褰撳墠娌℃湁鍊欓€夎棰戠礌鏉愩€?; return; }
  if (!window.confirm(`鍒犻櫎 ${candidates.length} 涓€欓€夎棰戠礌鏉愶紵浠嶈鍐呭寮曠敤鐨勪細淇濈暀銆俙)) return;
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
  message.value = `宸插垹闄?${deleted} 涓€欓€夎棰?{blocked.length ? `锛?{blocked.length} 涓粛琚紩鐢ㄨ€屼繚鐣檂 : ''}銆俙;
  if (blocked.length) error.value = `浠ヤ笅绱犳潗浠嶈鍐呭寮曠敤锛屾湭鍒犻櫎锛?{blocked.join('銆?)}`;
}

async function deleteArticleFromCanvas(payload) {
  const collection = String(payload?.collection || 'articles');
  const id = String(payload?.targetItemId || '').trim();
  if (!id) return;
  const record = (editorial.value.articles || []).find((item) => String(item.id) === id)
    || (editorial.value.case_studies || []).find((item) => String(item.id) === id);
  const title = record?.title || String(payload?.label || '').replace(/^鍒犻櫎\s*/, '') || `#${id}`;
  const published = record?.status === 'published' || record?.publication_state === 'published';
  if (!technicalAccess.value && !canDeleteEditorialDraft(record)) {
    error.value = '鍙湁鑽夌銆侀€€鍥炰慨鏀规垨宸蹭笅绾跨殑鍐呭鍙互鐩存帴鍒犻櫎锛涘凡鍙戝竷/瀹℃牳涓殑鍐呭璇峰厛璧版祦绋嬨€?;
    return;
  }
  if (!window.confirm(`纭畾鍒犻櫎銆?{title}銆嶅悧锛?{published ? '璇ュ唴瀹瑰凡鍙戝竷锛屽垹闄ゅ悗浼氱珛鍗充粠瀹樼綉绉婚櫎銆? : '鍒犻櫎鍚庝笉鍙仮澶嶃€?}`)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.delete(`/items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
    await loadEditorial();
    if (String(selectedEditorialId.value) === id) { selectedEditorialId.value = ''; editorialDraft.value = null; }
    if (collection === 'articles') {
      // 鍒犻櫎鏂囩珷鍚庝笉瑕佸仠鐣欏湪 articles 鍒楄〃鍗＄墖鐢诲竷锛氳鐢诲竷娌℃湁鏂板鎸夐挳锛?
      // 涓斿師鏂囩珷 target 宸插け鏁堛€傜粺涓€鍥炲埌鏂伴椈椤电敾甯冿紝淇濈暀鈥滄柊澧炶棰戝垎浜?鍔ㄦ€佹柊闂烩€濄€?
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
    message.value = `宸插垹闄ゃ€?{title}銆嶃€俙;
  } catch (reason) {
    error.value = apiError(reason, '鍒犻櫎鏂囩珷澶辫触銆?);
  } finally { saving.value = false; }
}

async function deleteEditorialDraft() {
  const record = editorialDraft.value;
  if (!canDeleteEditorialDraft(record)) return;
  const collection = editorialMode.value;
  const id = String(record.id);
  const label = editorialLabel(record);
  if (!window.confirm(`纭畾鍒犻櫎鈥?{label}鈥濊崏绋垮悧锛熷垹闄ゅ悗鏃犳硶鎭㈠銆俙)) return;

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
    message.value = `宸插垹闄も€?{label}鈥濊崏绋裤€俙;
  } catch (reason) {
    error.value = apiError(reason, '鍒犻櫎鑽夌澶辫触锛屽唴瀹规湭鍒犻櫎銆?);
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
  if (!uploaded?.id || !uploaded.filename_download || !uploaded.type) throw new Error('鍥剧墖涓婁紶鎺ュ彛鏈繑鍥炲畬鏁存枃浠朵俊鎭?);
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
  if (!created?.id) throw new Error('鍥剧墖绱犳潗鐧昏澶辫触');
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
    error.value = '璇烽€夋嫨 .docx 鏍煎紡鐨?Word 鏂囨。銆?;
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
      result.imageCount ? `宸插鍏?${result.imageCount} 寮犲浘鐗嘸 : '',
      result.imageFailed ? `${result.imageFailed} 寮犲浘鐗囧け璐 : ''
    ].filter(Boolean).join('锛?);
    message.value = `宸插鍏?Word 鏂囨。锛?{draft.title || '鏈懡鍚?}${suffix ? `锛?{suffix}` : ''}銆傝妫€鏌ユ帓鐗堝悗淇濆瓨鍐呭鑽夌銆俙;
    if (result.warnings.length) error.value = result.warnings.join('锛?);
  } catch (reason) {
    error.value = apiError(reason, 'Word 鏂囨。瀵煎叆澶辫触锛屽師鏈夊唴瀹规湭淇敼銆?);
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
        error.value = '淇濆瓨瑙嗛鍒嗕韩鑽夌鍓嶅繀椤诲～鍐欎繚瀛樺悕绉般€?;
        return;
      }
      const media = normalizeMediaReferences(editorialDraft.value.mediaReferences);
      let bodyMedia = [];
      try {
        const parsedBodyMedia = JSON.parse(String(editorialDraft.value.body_media_text || '[]'));
        if (!Array.isArray(parsedBodyMedia)) throw new Error('not-array');
        bodyMedia = parsedBodyMedia.map((item) => ({ media_asset_id: String(item?.media_asset_id || '').trim(), caption: String(item?.caption || '').trim() })).filter((item) => item.media_asset_id);
      } catch { error.value = '姝ｆ枃鍥剧墖閰嶇疆蹇呴』鏄悎娉曠殑 JSON 鏁扮粍銆?; return; }
      if (!editorialDraft.value.display_date) { error.value = '璇峰～鍐欏畼缃戞樉绀烘棩鏈熴€?; return; }
      const rawSortOrder = editorialDraft.value.sort_order;
      const hasSortOrder = rawSortOrder !== null && rawSortOrder !== undefined && String(rawSortOrder).trim() !== '';
      const sortOrder = normalizeOptionalSortOrder(editorialDraft.value.sort_order);
      if (hasSortOrder && sortOrder === null) { error.value = '鍚屾棩鎺掑簭蹇呴』鏄ぇ浜庢垨绛変簬 0 鐨勬暣鏁般€?; return; }
      if (category === 'video' && !media.length) { error.value = '瑙嗛鍒嗕韩鑷冲皯闇€瑕佸叧鑱斾竴鏉¤棰戠礌鏉愩€?; return; }
      const selectedVideoAssets = category === 'video' ? media.map((reference) => String(reference?.media_asset_id || '')).filter(Boolean) : [];
      if (category === 'video' && (selectedVideoAssets.length !== media.length || selectedVideoAssets.some((assetId) => !isEditorialMediaAssetAllowed(assetId, {
        category: 'video', publishedAssets: reviewedMediaAssets('article'), candidates: mediaCandidates.value
      })))) { error.value = '瑙嗛鍒嗕韩绱犳潗涓嶇鍚堚€滄枃绔犱笌璧勮 / 瑙嗛鍒嗕韩鍒楄〃 / news / video-sharing鈥濈殑浣跨敤鑼冨洿锛屾湭淇濆瓨銆?; return; }
      const coverAssetId = String(editorialDraft.value.cover_asset || '').trim();
      if (category === 'news' && coverAssetId && !isEditorialMediaAssetAllowed(coverAssetId, {
        category: 'news', publishedAssets: reviewedMediaAssets('article'), candidates: mediaCandidates.value
      })) { error.value = '鍔ㄦ€佹柊闂诲皝闈㈠繀椤讳娇鐢ㄢ€滄枃绔犱笌璧勮 / 鍔ㄦ€佹柊闂诲皝闈?/ news / dynamic-news鈥濈殑鍥剧墖锛屾湭淇濆瓨銆?; return; }
      payload = { slug: editorialDraft.value.slug, category, title: editorialDraft.value.title, display_date: editorialDraft.value.display_date, sort_order: sortOrder, summary: editorialDraft.value.summary || null, body: editorialDraft.value.body || null, body_media: bodyMedia, transcript: editorialDraft.value.transcript || null, field_presentation: normalizeFieldPresentations(editorialDraft.value.field_presentation, ['category', 'title', 'display_date', 'summary', 'body', 'transcript']), media, cover_asset: editorialDraft.value.cover_asset || null, seo, published_at: editorialDraft.value.published_at || null, source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null, submission_name: draftSubmissionName.value.trim() || null };
    } else {
      payload = { slug: editorialDraft.value.slug, industry: editorialDraft.value.industry || null, material: editorialDraft.value.material || null, thickness: editorialDraft.value.thickness || null, model_code: editorialDraft.value.model_code || null, process: editorialDraft.value.process || null, result: editorialDraft.value.result || null, authorization_status: editorialDraft.value.authorization_status || 'review_required', source_document: editorialDraft.value.source_document || null, source_url: editorialDraft.value.source_url || null };
    }
    await api.patch(`/items/${encodeURIComponent(editorialMode.value)}/${encodeURIComponent(editorialDraft.value.id)}`, payload);
    message.value = '鍐呭鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    invalidateSubmissionQueue();
    await refreshAfterSave([loadEditorial]);
  } catch (reason) {
    setSaveError(reason, '淇濆瓨鍐呭鑽夌澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
  } finally { saving.value = false; }
}

async function saveSettings() {
  if (!settingsDraft.value || !canEdit(settingsDraft.value)) return;
  const navigationError = validateSettingLinks(settingsDraft.value.navigation, '涓诲鑸?);
  const footerError = validateSettingLinks(settingsDraft.value.footer.primary_links, '椤佃剼閾炬帴');
  const footerColumnsError = validateFooterColumns(settingsDraft.value.footer.columns);
  if (navigationError || footerError || footerColumnsError) { error.value = navigationError || footerError || footerColumnsError; return; }
  if (!String(settingsDraft.value.brand.display_name || '').trim() || !String(settingsDraft.value.brand.logo_asset || '').trim() || !String(settingsDraft.value.contacts.service_phone || '').trim()) {
    error.value = '鍝佺墝鍚嶇О銆佸搧鐗屾爣蹇楃礌鏉愬紩鐢ㄥ拰鏈嶅姟鐢佃瘽涓嶈兘涓虹┖銆?;
    return;
  }
  if (!String(settingsDraft.value.contacts.header_cta.label || '').trim() || !isValidSiteLink(settingsDraft.value.contacts.header_cta.href)) {
    error.value = '璇峰～鍐?Header CTA 鏂囨锛屽苟浣跨敤绔欏唴璺緞鎴?HTTPS 鍦板潃銆?;
    return;
  }
  const languages = fromTextList(settingsDraft.value.languagesText);
  if (!languages.length) { error.value = '璇疯嚦灏戜繚鐣欎竴绉嶅彲鐢ㄨ瑷€銆?; return; }
  saving.value = true; error.value = ''; message.value = '';
  try {
    // Deliberately retain footer review metadata and all non-editorial configuration fields.
    const footer = { ...settingsDraft.value.footer, primary_links: settingsDraft.value.footer.primary_links.map(normalizeLink), columns: settingsDraft.value.footer.columns.map((column, index) => ({ title: column.title.trim(), sort_order: Number(column.sort_order) || index, links: column.links.map(normalizeLink) })), text_styles: normalizeFooterTextStyles(settingsDraft.value.footer.text_styles), purchase_label: settingsDraft.value.footer.purchase_label.trim(), purchase_title: settingsDraft.value.footer.purchase_title.trim(), purchase_subtitle: settingsDraft.value.footer.purchase_subtitle.trim(), purchase_phone: settingsDraft.value.footer.purchase_phone.trim(), copyright: settingsDraft.value.footer.copyright.trim(), address_icon_asset: settingsDraft.value.footer.address_icon_asset.trim(), phone_icon_asset: settingsDraft.value.footer.phone_icon_asset.trim(), email_icon_asset: settingsDraft.value.footer.email_icon_asset.trim() };
    const brand = { ...settingsDraft.value.brand, display_name: settingsDraft.value.brand.display_name.trim(), logo_asset: settingsDraft.value.brand.logo_asset.trim(), footer_logo_asset: settingsDraft.value.brand.footer_logo_asset.trim() };
    const contacts = { ...settingsDraft.value.contacts, service_phone: settingsDraft.value.contacts.service_phone.trim(), domestic_phone: settingsDraft.value.contacts.domestic_phone.trim(), export_phone: settingsDraft.value.contacts.export_phone.trim(), domestic_email: settingsDraft.value.contacts.domestic_email.trim(), export_email: settingsDraft.value.contacts.export_email.trim(), language_label: settingsDraft.value.contacts.language_label.trim(), addresses: fromTextList(settingsDraft.value.contacts.addressesText), header_cta: { ...settingsDraft.value.contacts.header_cta, label: settingsDraft.value.contacts.header_cta.label.trim(), href: settingsDraft.value.contacts.header_cta.href.trim() } };
    await api.patch(`/items/site_settings/${encodeURIComponent(settingsDraft.value.id)}`, { navigation: settingsDraft.value.navigation.map(normalizeLink), footer, brand, contacts, languages });
    message.value = '鍏ㄧ珯璁剧疆鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    let reloaded = true;
    try { await loadSettings(); } catch { reloaded = false; message.value += '锛堝垪琛ㄥ埛鏂板け璐ワ紝璇烽噸鏂板姞杞介〉闈㈡煡鐪嬶級'; }
    if (reloaded) markDraftSaved();
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨鍏ㄧ珯璁剧疆澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
  } finally { saving.value = false; }
}

async function saveVisualSiteSettings() {
  const record = settingsDraft.value;
  const fieldPath = String(selectedVisualElement.value?.fieldPath || '').trim();
  if (!record || !canEdit(record)) return;
  const payload = visualSiteSettingsPayload(record, fieldPath);
  if (!payload) {
    error.value = '璇ュ叏绔欒缃瓧娈典笉鏀寔鍦ㄧ敾甯冧腑淇濆瓨銆?;
    return;
  }
  saving.value = true; error.value = ''; message.value = '';
  try {
    await api.patch(`/items/site_settings/${encodeURIComponent(record.id)}`, payload);
    message.value = '椤佃剼鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    let reloaded = true;
    try { await loadSettings(); } catch { reloaded = false; message.value += '锛堝垪琛ㄥ埛鏂板け璐ワ紝璇烽噸鏂板姞杞介〉闈㈡煡鐪嬶級'; }
    if (reloaded) markDraftSaved();
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨椤佃剼鑽夌澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
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
  if (invalidFeature) { error.value = '姣忎釜浜у搧鐗圭偣閮藉繀椤诲～鍐欐爣棰樸€?; return; }
  if (invalidDrawing) { error.value = '姣忓紶灏哄鍥鹃兘蹇呴』閫夋嫨浜у搧鍥剧墖銆?; return; }
  if (invalidResource) { error.value = '姣忔潯浜у搧璧勬枡閮藉繀椤诲～鍐欐爣棰橈紝骞堕€夋嫨宸蹭笂浼犻檮浠舵垨濉啓绔欏唴璺緞銆丠TTPS 鍦板潃銆?; return; }
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
      error.value = `鍨嬪彿淇℃伅宸蹭繚瀛橈紝浣嗘湁 ${parameterResult.failed.length} 鏉℃妧鏈弬鏁版湭淇濆瓨锛?{parameterResult.failed.map((row) => row.field_name || row.id).join('銆?)}锛夈€傝淇鍚庨噸璇曡繖浜涘弬鏁般€俙;
      message.value = '';
      await refreshAfterSave([]);
      return;
    }
    if (JSON.stringify(modelDraft.value) !== modelBefore) {
      message.value = '鍨嬪彿鑽夌宸蹭繚瀛橈紱淇濆瓨鏈熼棿鍙堟湁鏂扮殑淇敼锛屽皻鏈啓鍏ワ紝璇峰啀娆′繚瀛樸€?;
      await refreshAfterSave([]);
      return;
    }
    message.value = '鍨嬪彿鑽夌宸蹭繚瀛橈紝骞跺凡杩涘叆鍐呭鐗堟湰瀹¤銆?;
    markDraftSaved();
    await refreshAfterSave([loadModels]);
  } catch (reason) {
    setSaveError(reason, '淇濆瓨鍨嬪彿澶辫触锛屽唴瀹规病鏈夋洿鏂般€?);
  } finally { saving.value = false; }
}

async function saveParameter(parameter) {
  if (!canEdit(parameter)) { error.value = saveBlockedMessage(parameter); return; }
  if (!confirmPublishedRevision(parameter, '杩欐潯鎶€鏈弬鏁?)) return;
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
      ? '鎶€鏈弬鏁板凡淇濆瓨锛屽苟宸茶繘鍏ュ唴瀹圭増鏈璁°€?
      : '鎶€鏈弬鏁板凡淇濆瓨锛涗繚瀛樻湡闂磋琛屽張鏈変慨鏀癸紝璇峰啀娆′繚瀛樸€?;
    if (publishedRevision) message.value = `${message.value}锛堝凡鐢熸垚鑽夌淇锛屽畼缃戦渶閲嶆柊瀹℃牳鍙戝竷鍚庢洿鏂帮級`;
    // Do not reload the whole table: it would discard edits in the other rows.
    await refreshAfterSave([]);
  } catch (reason) {
    error.value = apiError(reason, '淇濆瓨鎶€鏈弬鏁板け璐ワ紝鍐呭娌℃湁鏇存柊銆?);
  } finally { saving.value = false; }
}

async function createParameter() {
  if (!modelDraft.value || !canEdit(modelDraft.value)) return;
  saving.value = true; error.value = ''; message.value = '';
  try {
    const created = await api.post('/items/product_parameters', { model_code: modelDraft.value.model_code, field_name: newParameter.value.field_name, value: newParameter.value.value, unit: newParameter.value.unit || null, test_conditions: newParameter.value.test_conditions || null, sort_order: Number(newParameter.value.sort_order) || 0, status: 'draft', publication_state: 'unpublished' });
    const record = created?.data?.data;
    message.value = '鏂扮殑鎶€鏈弬鏁拌崏绋垮凡鍒涘缓銆?;
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
    error.value = apiError(reason, '鏂板鎶€鏈弬鏁板け璐ャ€?);
  } finally { saving.value = false; }
}

watch(activeTab, (tab) => {
  error.value = '';
  message.value = '';
  closePreview();
  if (tab === 'media') loadMediaPreviews();
  // 姣忔杩涘叆鍐呭閫佸閮介噸鏂拌鍙栥€備繚瀛樿崏绋垮悗鏃у揩鐓ч噷鐨勬柊鏂囩珷涓嶄細鑷繁鍑虹幇锛?
  // 鍙潬 submissionQueueLoaded 浼氳闃熷垪姘镐箙鍋滅暀鍦ㄧ涓€娆℃墦寮€鏃剁殑鐘舵€併€?
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
// Directus 鐨勨€滆烦杞彍鍗曗€濋伄缃╂湁鏃朵繚鎸?active锛屽苟鍦?document 鎹曡幏闃舵鍚炴帀鐐瑰嚮锛?
// 浠呯鐢?pointer-events 鍙兘璁╃湡瀹為紶鏍囩┛杩囷紝鎸夐挳鐨?click 浠嶅彲鑳借鎴柇銆傚伐浣滃彴
// 鎵撳紑鏃朵互鍙婃瘡娆℃寚閽?鐒︾偣杩涘叆鍓嶄富鍔ㄥ叧闂畠锛屽彸渚ч潰鏉跨殑淇濆瓨銆佸垹闄ゆ墠鍙潬銆?
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
    technicalAccess.value = ['Administrator', '绯荤粺绠＄悊鍛?].includes(roleName);
    workflowAccess.value = ['Administrator', '绯荤粺绠＄悊鍛?, '鍐呭缂栬緫', '瀹℃牳绠＄悊'].includes(roleName);
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

