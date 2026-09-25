document.addEventListener("DOMContentLoaded", async function () {
  const API = 'api/index.php';
  const FRONTEND_REQUEST_TIMEOUT_MS = 65000;
  const rawInstanceConfig=window.AFLOW_INSTANCE_CONFIG&&typeof window.AFLOW_INSTANCE_CONFIG==='object'
    ?window.AFLOW_INSTANCE_CONFIG
    :{};
  const authConfig =
    rawInstanceConfig.supabase_auth &&
    typeof rawInstanceConfig.supabase_auth === 'object'
      ? rawInstanceConfig.supabase_auth
      : {};

  if (authConfig.enabled === true) {
    if (!window.AFLOW_AUTH_READY) return;

    try {
      await window.AFLOW_AUTH_READY;
    } catch (e) {
      return;
    }
  }
  const BUSINESS_PRODUCTS_BY_CATEGORY=Object.freeze(Object.fromEntries(
    Object.entries(rawInstanceConfig.categorias_produtos&&typeof rawInstanceConfig.categorias_produtos==='object'
      ?rawInstanceConfig.categorias_produtos
      :{}
    ).map(([category,products])=>[
      String(category||'').trim(),
      Object.freeze((Array.isArray(products)?products:[]).map(value=>String(value||'').trim()).filter(Boolean))
    ]).filter(([category])=>category)
  ));
  const BUSINESS_TYPE_OPTIONS=Object.freeze((Array.isArray(rawInstanceConfig.tipos_oportunidade)
    ?rawInstanceConfig.tipos_oportunidade
    :[]
  ).map(value=>String(value||'').trim()).filter(Boolean));
  const DIAGNOSTICS_ENABLED=String(rawInstanceConfig.modulo_adicional||'').trim().toLowerCase()==='diagnostics';
  const supabaseCoreReadConfig=rawInstanceConfig.supabase_core_read&&typeof rawInstanceConfig.supabase_core_read==='object'
    ?rawInstanceConfig.supabase_core_read
    :{};
  const SUPABASE_CORE_READ_ENABLED=supabaseCoreReadConfig.enabled===true;
  const supabaseCoreWriteConfig=rawInstanceConfig.supabase_core_write&&typeof rawInstanceConfig.supabase_core_write==='object'
    ?rawInstanceConfig.supabase_core_write
    :{};
  const SUPABASE_CORE_WRITE_ENABLED=supabaseCoreWriteConfig.enabled===true;
  const supabaseImportConfig=rawInstanceConfig.supabase_import&&typeof rawInstanceConfig.supabase_import==='object'
    ?rawInstanceConfig.supabase_import
    :{};
  const SUPABASE_IMPORT_ENABLED=supabaseImportConfig.enabled===true;
  const AFLOW_TENANT_PATTERN=/^[a-z0-9_-]{1,64}$/;
  const AFLOW_MODULE_TABLE_PATTERN=/^[a-z][a-z0-9_]{0,62}$/;
  const AFLOW_MODULE_TABLES=new Set((Array.isArray(rawInstanceConfig.ativos_habilitados)
    ?rawInstanceConfig.ativos_habilitados
    :[]
  ).map(value=>String(value||'').trim().toLowerCase()).filter(value=>AFLOW_MODULE_TABLE_PATTERN.test(value)));
  const AFLOW_CRM_HEADERS=Object.freeze([
    'ID','Lead Key','Nome','Empresa','Cargo','Endereço','Cidade','UF','Contato','Acesso Rápido',
    'Origem do Lead','Status','Colaboradores','Valor da Proposta','Data da Proposta',
    'Observações Estratégicas','Última Interação','Diagnóstico Enviado','Chance de Fechamento',
    'Receita Ponderada'
  ]);
  const AFLOW_IA_GPT_URL = String(rawInstanceConfig.ia_gpt_url||'').trim();
  const FUNNEL_STORAGE_TENANT=String(rawInstanceConfig.tenant||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,64);
  const FUNNEL_PRIORITIZED_STORAGE_KEY='aflorFlowFunnelPrioritizedCards:'+FUNNEL_STORAGE_TENANT;
  const LEGACY_NOVO_PRIORITIZED_STORAGE_KEY='aflorFlowNovoPrioritizedIds:'+FUNNEL_STORAGE_TENANT;
  const FUNNEL_CATEGORY_ACCENT_STORAGE_KEY='aflorFlowCategoryAccent:'+FUNNEL_STORAGE_TENANT;
  const FUNNEL_CATEGORY_ACCENT_CLASSES=Object.freeze([
    'gold','sapphire','ruby','emerald','bronze','titanium','amethyst'
  ]);
  const FLOW_IA_SPARK_SVG = '<svg class="flow-ia-spark" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="m12 3 1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8L12 3Z"/></svg>';
  const FUNNEL_PHONE_SVG = '<svg class="mfunnel-signal-icon mfunnel-followup-icon" aria-label="Próxima Ação" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.11 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L8.01 9.72a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92Z"/></svg>';
  const PERSONAL_EMAIL_DOMAINS = new Set([
    'gmail.com','hotmail.com','outlook.com','yahoo.com','yahoo.com.br',
    'icloud.com','live.com','live.com.br','msn.com','bol.com.br','uol.com.br','terra.com.br'
  ]);
  const CADENCIA_COMERCIAL_PADRAO = Object.freeze({
    qualificado: Object.freeze({ativo:true,dias:15,tipo:'uteis'}),
    proposta: Object.freeze({ativo:true,dias:7,tipo:'uteis'}),
    'em maturacao': Object.freeze({ativo:true,dias:60,tipo:'corridos'})
  });
  let cadenciaComercialAtual=normalizarCadenciaComercial(null),cadenciaComercialEdicao=null,cadenciaSaveInProgress=false,importInProgress=false;
  let flowModules=null, modulesReady=Promise.resolve(null);
  let leads = [], sk = null, sa = true, ch = {}, currentLead = null, activeBusinessId = '', newBusinessDraft = false, previousActiveBusinessId = '', businessDraftSnapshot = null, businessDraftPreviousDirty = false, commercialModalSnapshot = '', filtersBound = false, viewMode = 'commercial', manualRefreshRequested = false, loadInProgress = false, loadPromise = null, ultimaAtualizacaoHora = '', saveInProgress = false, createInProgress = false, newRecordDirty = false, commercialModalDirty = false, pendingBusinessCreation = null;

  // ============================================================
  // BOOTSTRAP
  // ============================================================
  const clientEl=document.getElementById('clientName');
  if(clientEl&&clientEl.dataset.clientName)clientEl.textContent=clientEl.dataset.clientName;
  const aflowLandingUrl=safeHttpUrl(rawInstanceConfig.referencia_oficial_url);
  if(clientEl&&aflowLandingUrl){
    clientEl.href=aflowLandingUrl;
    clientEl.target='_blank';
    clientEl.rel='noopener noreferrer';
  }


  function applyInstanceConfiguration(){
    document.querySelectorAll('[data-additional-module="diagnostics"]').forEach(element=>{
      element.hidden=!DIAGNOSTICS_ENABLED;
    });
    document.querySelectorAll('[data-without-additional-module="diagnostics"]').forEach(element=>{
      element.hidden=DIAGNOSTICS_ENABLED;
    });
    const baseSheetAction=document.getElementById('baseSheetAction');
    if(baseSheetAction){
      if(SUPABASE_IMPORT_ENABLED){
        try{
          getAflorSupabaseImportConfig();
          baseSheetAction.href='#';
          baseSheetAction.removeAttribute('target');
          baseSheetAction.removeAttribute('rel');
          baseSheetAction.hidden=false;
        }catch(e){
          baseSheetAction.removeAttribute('href');
          baseSheetAction.hidden=true;
        }
      }else{
        baseSheetAction.removeAttribute('href');
        baseSheetAction.hidden=true;
      }
    }
    const aflorSupportAction=document.getElementById('aflorSupportAction');
    if(aflorSupportAction){
      const tenant=String(rawInstanceConfig.tenant||'').trim();
      const message='Olá! Estou usando o AFLOR Flow e preciso de ajuda.'+(tenant?'\nInstância: '+tenant:'');
      const url=safeHttpUrl('https://wa.me/5519992264223?text='+encodeURIComponent(message));
      if(url){
        aflorSupportAction.href=url;
        aflorSupportAction.hidden=false;
      }else{
        aflorSupportAction.removeAttribute('href');
        aflorSupportAction.hidden=true;
      }
    }
    const categorySelect=document.getElementById('eCategoria');
    if(categorySelect){
      categorySelect.replaceChildren(new Option('Selecione',''));
      Object.keys(BUSINESS_PRODUCTS_BY_CATEGORY).forEach(category=>categorySelect.add(new Option(category,category)));
    }
    const typeSelect=document.getElementById('eTipoNegocio');
    if(typeSelect){
      typeSelect.replaceChildren(new Option('Selecione',''));
      BUSINESS_TYPE_OPTIONS.forEach(type=>typeSelect.add(new Option(type,type)));
    }
  }

  function atualizarContextoViews(){
    const contexto=leads.length+' registro'+(leads.length!==1?'s':'')+' · '+ultimaAtualizacaoHora;
    const el=document.getElementById('commercialContext');
    if(el)el.textContent=contexto;
  }

  function getFilterValues(id){
    const field=document.getElementById(id);
    return field&&field.value?field.value.split('|').filter(Boolean):[];
  }

  function syncSearchClear(){
    const search=document.getElementById('fQ');
    const clear=document.getElementById('clearSearch');
    if(clear)clear.classList.toggle('is-visible',!!(search&&search.value));
  }

  function closeMultiSelect(root){
    const menu=root&&root.querySelector('.multiselect-menu');
    const trigger=root&&root.querySelector('.multiselect-trigger');
    if(menu)menu.hidden=true;
    if(trigger)trigger.setAttribute('aria-expanded','false');
  }

  function syncMultiSelect(root){
    const id=root.dataset.filterId;
    const field=document.getElementById(id);
    const selected=[...root.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
    if(field){field.value=selected.join('|');field.dispatchEvent(new Event('input'));}
    const label=root.querySelector('.multiselect-trigger span');
    if(label)label.textContent=(root.title||'Filtro')+(selected.length?' · '+selected.length:'');
  }

  function setMultiSelectOptions(id,options){
    const root=document.querySelector(`.multiselect-filter[data-filter-id="${id}"]`);
    if(!root||root.dataset.viewMode===viewMode)return;
    const field=document.getElementById(id);
    const menu=root.querySelector('.multiselect-menu');
    if(menu)menu.innerHTML=options.map(([value,label])=>`<label><input type="checkbox" value="${value}" />${label}</label>`).join('');
    if(field)field.value='';
    root.dataset.viewMode=viewMode;
    const label=root.querySelector('.multiselect-trigger span');
    if(label)label.textContent=root.title;
  }

  function atualizarFiltrosContextuais(){
    ['fPr','fAc','fStatus'].forEach(id=>{
      const root=document.querySelector(`.multiselect-filter[data-filter-id="${id}"]`);
      const field=document.getElementById(id);
      if(!root)return;
      const trigger=root.querySelector('.multiselect-trigger');
      const label=trigger&&trigger.querySelector('span');
      const inactive=viewMode==='intelligence'||(viewMode==='operational'&&id!=='fStatus');
      if(inactive){
        root.querySelectorAll('input[type="checkbox"]').forEach(input=>{input.checked=false;});
        if(field)field.value='';
        closeMultiSelect(root);
      }
      root.classList.toggle('is-context-disabled',inactive);
      if(trigger){
        trigger.disabled=inactive;
        trigger.setAttribute('aria-disabled',String(inactive));
      }
      if(label)label.textContent=inactive?'—':root.title;
    });
  }

  function initMultiSelects(){
    document.querySelectorAll('.multiselect-filter').forEach(root=>{
      const trigger=root.querySelector('.multiselect-trigger');
      const menu=root.querySelector('.multiselect-menu');
      if(!trigger||!menu)return;
      trigger.addEventListener('click',()=>{
        const opening=menu.hidden;
        document.querySelectorAll('.multiselect-filter').forEach(closeMultiSelect);
        if(!opening)return;
        const rect=trigger.getBoundingClientRect();
        menu.hidden=false;
        menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-228))+'px';
        menu.style.top=Math.min(rect.bottom+4,window.innerHeight-220)+'px';
        trigger.setAttribute('aria-expanded','true');
      });
      menu.addEventListener('change',()=>syncMultiSelect(root));
    });
    document.addEventListener('click',event=>{
      if(!event.target.closest('.multiselect-filter'))document.querySelectorAll('.multiselect-filter').forEach(closeMultiSelect);
    });
  }

  function atualizarFiltroStatus(){
    const status=document.getElementById('fStatus');
    if(!status||status.dataset.viewMode===viewMode)return;
    const options=viewMode==='commercial'
      ?[['','Status'],['Novo','Novo'],['Qualificado','Qualificado'],['Proposta','Proposta'],['Em maturação','Em maturação']]
      :viewMode==='operational'
        ?[['','Status'],['Fechado','Fechado'],['Inativo','Inativo'],['Encerrado','Encerrado']]
        :[['','Status']];
    setMultiSelectOptions('fStatus',options.filter(([value])=>value));
    status.value='';
    status.dataset.viewMode=viewMode;
  }

  function setViewMode(mode){
    const nextViewMode=mode === 'operational' || (mode === 'intelligence'&&flowModules) ? mode : 'commercial';
    if(viewMode==='intelligence'&&nextViewMode!=='intelligence'&&(flowModules&&!flowModules.leaveIntelligenceObservationContext()))return false;
    const previousViewMode=viewMode;
    viewMode = nextViewMode;
    atualizarFiltroStatus();
    atualizarFiltrosContextuais();
    if(previousViewMode!==viewMode&&(viewMode==='intelligence'||previousViewMode==='intelligence')){
      const search=document.getElementById('fQ');
      const clear=document.getElementById('clearSearch');
      if(search)search.value='';
      syncSearchClear();
      if(flowModules)flowModules.resetSearch();
      if(previousViewMode==='intelligence'){
        microFunnel();
        tbl();
      }
    }
    document.querySelectorAll('[data-view-mode]').forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.viewMode === viewMode);
    });
    document.querySelectorAll('.view-commercial').forEach(el=>{
      el.classList.toggle('is-hidden', viewMode !== 'commercial');
    });
    document.querySelectorAll('.view-operational').forEach(el=>{
      el.classList.toggle('is-hidden', viewMode !== 'operational');
    });
    document.querySelectorAll('.view-intelligence').forEach(el=>{
      el.classList.toggle('is-hidden', viewMode !== 'intelligence');
    });
    if(viewMode==='commercial')microFunnel();
    if(viewMode==='operational')tbl();
    if(viewMode === 'intelligence')flowModules.loadIntelligenceData();
    return true;
  }

  async function openDiagnosticsForLead(leadKey){
    const key=String(leadKey||'').trim();
    if(!DIAGNOSTICS_ENABLED||!flowModules||!key)return false;
    if(!flowModules.isLoaded&&!(await flowModules.loadIntelligenceData()))return false;
    if(!cm())return false;
    if(!setViewMode('intelligence'))return false;
    return flowModules.selectLead(key);
  }

  applyInstanceConfiguration();
  document.querySelectorAll('[data-view-mode]').forEach(btn=>{
    btn.addEventListener('click',()=>setViewMode(btn.dataset.viewMode));
  });
  initMultiSelects();
  setViewMode('commercial');

  const qbarToggle=document.getElementById('qbarToggle');
  if(qbarToggle){
    const qbarCompact=window.matchMedia('(max-width: 1200px)');
    const syncQbarMode=()=>{
      document.body.classList.toggle('qbar-is-collapsed',qbarCompact.matches);
      qbarToggle.setAttribute('aria-expanded',String(!qbarCompact.matches));
      qbarToggle.setAttribute('aria-label',qbarCompact.matches?'Expandir navegação':'Recolher navegação');
    };
    syncQbarMode();
    qbarCompact.addEventListener('change',syncQbarMode);
    qbarToggle.addEventListener('click',()=>{
      const collapsed=document.body.classList.toggle('qbar-is-collapsed');
      qbarToggle.setAttribute('aria-expanded',String(!collapsed));
      qbarToggle.setAttribute('aria-label',collapsed?'Expandir navegação':'Recolher navegação');
    });
  }

  ['eDataProposta','eUltima'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener('input',()=>{el.value=maskDateYY(el.value);});
  });
  const valorPropostaEl=document.getElementById('eValorProposta');
  if(valorPropostaEl)valorPropostaEl.addEventListener('input',()=>{valorPropostaEl.value=maskMoneyBR(valorPropostaEl.value);});
  const categoriaNegocioEl=document.getElementById('eCategoria');
  if(categoriaNegocioEl)categoriaNegocioEl.addEventListener('change',()=>{setBusinessProductOptions(categoriaNegocioEl.value,'');});
  const produtoServicoEl=document.getElementById('eProdutoServico');
  const produtoServicoTrigger=document.getElementById('eProdutoServicoTrigger');
  const cargoNovoRegistroEl=document.getElementById('nCargo');
  const cargoGestaoEl=document.getElementById('eCargo');
  if(cargoNovoRegistroEl&&cargoGestaoEl)cargoGestaoEl.innerHTML=cargoNovoRegistroEl.innerHTML;
  const observacoesGestaoEl=document.getElementById('eObs');
  const syncObservacoesGestaoHeight=()=>{
    if(observacoesGestaoEl)observacoesGestaoEl.classList.toggle('has-content',Boolean(observacoesGestaoEl.value.trim()));
  };
  if(observacoesGestaoEl)observacoesGestaoEl.addEventListener('input',syncObservacoesGestaoHeight);
  if(produtoServicoEl)produtoServicoEl.addEventListener('change',()=>{produtoServicoEl.dataset.serializedValue=serializeBusinessProducts();updateBusinessProductTrigger();});
  if(produtoServicoTrigger)produtoServicoTrigger.addEventListener('click',()=>{
    if(produtoServicoTrigger.disabled)return;
    const open=!produtoServicoEl.classList.contains('is-open');
    produtoServicoEl.classList.toggle('is-open',open);
    produtoServicoTrigger.setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('click',event=>{
    if(!produtoServicoEl||produtoServicoEl.contains(event.target))return;
    produtoServicoEl.classList.remove('is-open');
    produtoServicoTrigger?.setAttribute('aria-expanded','false');
  });
  const negocioAtivoEl=document.getElementById('eNegocioAtivo');
  if(negocioAtivoEl)negocioAtivoEl.addEventListener('change',()=>{
    if(hasCommercialModalChanges()&&!canCloseEditableModal(true)){
      negocioAtivoEl.value=activeBusinessId;
      return;
    }
    const negocio=getLeadNegocios(currentLead).find(item=>String(item.negocio_id||'').trim()===negocioAtivoEl.value);
    activeBusinessId=negocio?String(negocio.negocio_id||'').trim():'';
    aplicarNegocioNosControles(negocio||null);
    syncNewBusinessDraftUi();
    captureCommercialModalSnapshot();
  });
  const businessDraftToggle=document.getElementById('businessDraftToggle');
  if(businessDraftToggle)businessDraftToggle.addEventListener('click',toggleNewBusinessDraft);
  ['eCelular','nContato'].forEach(id=>{
    const celularEl=document.getElementById(id);
    if(celularEl)celularEl.addEventListener('input',()=>{celularEl.value=formatPhoneLiteBR(celularEl.value);});
  });
  const refreshBtn=document.getElementById('btnR');
  if(refreshBtn)refreshBtn.addEventListener('click',()=>{manualRefreshRequested=true;},true);

  // ============================================================
  // API
  // ============================================================
  async function fetchCrm(payload,options){
    const body=Object.assign({},payload||{});
    if(SUPABASE_CORE_WRITE_ENABLED&&['create','update'].includes(String(body._action||''))){
      return writeSupabaseCrmAflor(body,options);
    }
    const headers={'Content-Type':'application/json;charset=utf-8'};
    if(authConfig.enabled===true){
      if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
      const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
      if(typeof accessToken!=='string'||accessToken==='')throw new Error('aflow_auth_required');
      headers.Authorization='Bearer '+accessToken;
    }
    return fetch(API,{
      method:'POST',
      headers,
      body:JSON.stringify(body),
      signal:options&&options.signal
    });
  }

  function getAflorSupabaseCoreReadConfig(){
    if(!SUPABASE_CORE_READ_ENABLED)return null;
    const tenant=String(supabaseCoreReadConfig.tenant||'').trim().toLowerCase();
    const schema=String(supabaseCoreReadConfig.schema||'').trim();
    const instanceTenant=String(rawInstanceConfig.tenant||'').trim().toLowerCase();
    const projectUrl=String(authConfig.url||'').trim().replace(/\/+$/,'');
    const publishableKey=String(authConfig.publishable_key||'').trim();
    if(!AFLOW_TENANT_PATTERN.test(instanceTenant)||!AFLOW_TENANT_PATTERN.test(tenant)||instanceTenant!==tenant||schema!=='aflow_shadow'||!/^https:\/\/[^/]+/i.test(projectUrl)||!publishableKey){
      throw new Error('aflow_supabase_core_read_unavailable');
    }
    return {projectUrl,publishableKey,schema,tenant};
  }

  function getAflorSupabaseCoreWriteConfig(){
    if(!SUPABASE_CORE_WRITE_ENABLED)return null;
    const tenant=String(supabaseCoreWriteConfig.tenant||'').trim().toLowerCase();
    const schema=String(supabaseCoreWriteConfig.schema||'').trim();
    const rpc=String(supabaseCoreWriteConfig.rpc||'').trim();
    const instanceTenant=String(rawInstanceConfig.tenant||'').trim().toLowerCase();
    const projectUrl=String(authConfig.url||'').trim().replace(/\/+$/,'');
    const publishableKey=String(authConfig.publishable_key||'').trim();
    if(authConfig.enabled!==true||!AFLOW_TENANT_PATTERN.test(instanceTenant)||!AFLOW_TENANT_PATTERN.test(tenant)||instanceTenant!==tenant||schema!=='aflow_shadow'||rpc!=='crm_write'||!/^https:\/\/[^/]+/i.test(projectUrl)||!publishableKey){
      throw new Error('aflow_supabase_core_write_unavailable');
    }
    return {projectUrl,publishableKey,schema,rpc,tenant};
  }

  async function writeSupabaseCrmAflor(payload,options){
    const config=getAflorSupabaseCoreWriteConfig();
    if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
    const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
    if(typeof accessToken!=='string'||!accessToken)throw new Error('aflow_auth_required');
    return fetch(config.projectUrl+'/rest/v1/rpc/'+encodeURIComponent(config.rpc),{
      method:'POST',
      headers:{
        apikey:config.publishableKey,
        Authorization:'Bearer '+accessToken,
        'Content-Type':'application/json;charset=utf-8',
        'Content-Profile':config.schema,
        'Accept-Profile':config.schema
      },
      body:JSON.stringify({p_tenant:config.tenant,p_payload:payload}),
      signal:options&&options.signal
    });
  }

  function getAflorSupabaseImportConfig(){
    if(!SUPABASE_IMPORT_ENABLED)return null;
    const tenant=String(supabaseImportConfig.tenant||'').trim().toLowerCase();
    const schema=String(supabaseImportConfig.schema||'').trim();
    const rpc=String(supabaseImportConfig.rpc||'').trim();
    const instanceTenant=String(rawInstanceConfig.tenant||'').trim().toLowerCase();
    const projectUrl=String(authConfig.url||'').trim().replace(/\/+$/,'');
    const publishableKey=String(authConfig.publishable_key||'').trim();
    if(authConfig.enabled!==true||!AFLOW_TENANT_PATTERN.test(instanceTenant)||!AFLOW_TENANT_PATTERN.test(tenant)||instanceTenant!==tenant||schema!=='aflow_shadow'||rpc!=='importacao_base_write'||!/^https:\/\/[^/]+/i.test(projectUrl)||!publishableKey){
      throw new Error('aflow_supabase_import_unavailable');
    }
    return {projectUrl,publishableKey,schema,rpc,tenant};
  }

  async function writeSupabaseImportAflor(rows,options){
    const config=getAflorSupabaseImportConfig();
    if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
    const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
    if(typeof accessToken!=='string'||!accessToken)throw new Error('aflow_auth_required');
    return fetch(config.projectUrl+'/rest/v1/rpc/'+encodeURIComponent(config.rpc),{
      method:'POST',
      headers:{
        apikey:config.publishableKey,
        Authorization:'Bearer '+accessToken,
        'Content-Type':'application/json;charset=utf-8',
        'Content-Profile':config.schema,
        'Accept-Profile':config.schema
      },
      body:JSON.stringify({p_tenant:config.tenant,p_payload:{rows}}),
      signal:options&&options.signal
    });
  }

  function normalizeImportHeader(value){
    return String(value||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function parseImportPaste(value){
    const expectedHeaders=['nome','empresa','endereco','cidade','uf','telefone whatsapp','e mail'];
    const lines=String(value||'').replace(/\r\n?/g,'\n').split('\n');
    const parsed=lines
      .map(line=>line.split('\t').map(cell=>String(cell||'').trim()))
      .filter(cells=>cells.some(Boolean));
    if(parsed.length&&expectedHeaders.every((header,index)=>normalizeImportHeader(parsed[0][index])===header)){
      parsed.shift();
    }
    if(!parsed.length)throw new Error('Cole ao menos uma linha para importar.');
    if(parsed.length>100)throw new Error('Limite excedido: máximo de 100 registros por lote.');
    if(parsed.some(cells=>cells.length>7))throw new Error('Cada linha deve conter no máximo 7 colunas.');
    return parsed.map(cells=>({
      nome:cells[0]||'',
      empresa:cells[1]||'',
      endereco:cells[2]||'',
      cidade:cells[3]||'',
      uf:cells[4]||'',
      contato:cells[5]||'',
      email:cells[6]||''
    }));
  }

  function renderImportResults(rows){
    const container=document.getElementById('importResults');
    const body=document.getElementById('importResultsBody');
    if(!container||!body)return;
    body.replaceChildren();
    (Array.isArray(rows)?rows:[]).forEach(row=>{
      const tr=document.createElement('tr');
      const result=String(row&&row.result||'');
      [
        String(row&&row.row||''),
        result,
        String(row&&row.message||''),
        String(row&&row.imported_at||'')
      ].forEach((value,index)=>{
        const td=document.createElement('td');
        td.textContent=value;
        if(index===1)td.className='import-result-'+result.toLowerCase();
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    container.hidden=body.childElementCount===0;
  }

  function setImportInputError(message){
    const error=document.getElementById('importInputError');
    if(!error)return;
    error.textContent=message?String(message):'';
    error.hidden=!message;
  }

  function resetImportBase(){
    if(importInProgress)return false;
    const paste=document.getElementById('importPaste');
    const status=document.getElementById('importStatus');
    const button=document.getElementById('importProcess');
    if(paste){paste.value='';paste.readOnly=false;}
    setImportInputError('');
    if(status){status.className='save-status';status.textContent='';}
    if(button){
      button.disabled=false;
      button.hidden=false;
      button.dataset.importState='initial';
      button.textContent='Processar importação';
    }
    renderImportResults([]);
    if(paste)paste.focus();
    return true;
  }

  function openImportBase(){
    if(!SUPABASE_IMPORT_ENABLED||importInProgress)return false;
    getAflorSupabaseImportConfig();
    const modal=document.getElementById('importMsk');
    if(modal)modal.classList.add('open');
    const box=document.getElementById('importMbox');
    if(box)box.scrollTop=0;
    const paste=document.getElementById('importPaste');
    if(paste&&!paste.readOnly)paste.focus();
    return true;
  }

  function closeImportBase(){
    if(importInProgress)return false;
    const modal=document.getElementById('importMsk');
    if(modal)modal.classList.remove('open');
    return true;
  }

  async function processImportBase(){
    if(importInProgress)return;
    const paste=document.getElementById('importPaste');
    const status=document.getElementById('importStatus');
    const button=document.getElementById('importProcess');
    if(button&&button.dataset.importState==='complete'){
      resetImportBase();
      return;
    }
    setImportInputError('');
    let rows;
    try{
      rows=parseImportPaste(paste&&paste.value);
    }catch(error){
      setImportInputError(error&&error.message?error.message:'Não foi possível validar os dados.');
      return;
    }

    importInProgress=true;
    if(button)button.disabled=true;
    if(status){status.className='save-status';status.textContent='Processando '+rows.length+' registro(s)…';}
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),FRONTEND_REQUEST_TIMEOUT_MS);
    try{
      const response=await writeSupabaseImportAflor(rows,{signal:controller.signal});
      if(!response.ok)throw new Error('Não foi possível processar a importação.');
      const data=await response.json();
      if(!data||data.status!=='ok'||!Array.isArray(data.rows))throw new Error('Resposta inválida da importação.');
      renderImportResults(data.rows);
      const hasErrors=Number(data.erros||0)>0;
      if(paste)paste.readOnly=!hasErrors;
      if(button){
        button.disabled=false;
        button.hidden=false;
        button.dataset.importState='complete';
        button.textContent='Nova importação';
      }
      if(status){
        status.className=hasErrors?'save-status err':'save-status ok';
        status.textContent='Importados: '+Number(data.importados||0)+' · Ignorados: '+Number(data.ignorados||0)+' · Erros: '+Number(data.erros||0);
      }
      try{await loadData();}catch(e){}
    }catch(error){
      if(button){
        button.disabled=false;
        button.hidden=false;
        button.dataset.importState='initial';
        button.textContent='Processar importação';
      }
      if(status){
        status.className='save-status err';
        status.textContent=controller.signal.aborted
          ?'Resultado indeterminado. Atualize a Base antes de tentar novamente.'
          :'✕ '+((error&&error.message)||'Não foi possível processar a importação.');
      }
    }finally{
      clearTimeout(timeoutId);
      importInProgress=false;
    }
  }

  function normalizarContatoSupabaseCore(valor){
    let digitos=String(valor||'').replace(/\D/g,'');
    if(digitos.startsWith('55')&&(digitos.length===12||digitos.length===13))digitos=digitos.slice(2);
    return digitos;
  }

  function montarLinhaSupabaseCore(registro,negociosPorLeadKey){
    const leadKey=String(registro&&registro.lead_key||'').trim();
    const negocios=(negociosPorLeadKey[leadKey]||[]).map(negocio=>({
      negocio_id:negocio.negocio_id??'',lead_key:negocio.lead_key??'',categoria:negocio.categoria??'',
      produto_servico:negocio.produto_servico??'',tipo_negocio:negocio.tipo_negocio??'',status:negocio.status??'',
      valor_proposta:negocio.valor_proposta??'',proposta_em:negocio.proposta_em??''
    }));
    const dadosNegocio=negocios.length===1?negocios[0]:{};
    const contato=normalizarContatoSupabaseCore(registro&&registro.contato);
    const email=String(registro&&registro.email||'').trim().toLowerCase();
    return Object.assign({
      ID:registro&&registro.id||'',
      'Lead Key':leadKey,
      Nome:registro&&registro.nome||'',
      Empresa:registro&&registro.empresa||'',
      Cargo:registro&&registro.cargo||'',
      'Endereço':registro&&registro.endereco||'',
      Cidade:registro&&registro.cidade||'',
      UF:registro&&registro.uf||'',
      Contato:registro&&registro.contato||'',
      'Acesso Rápido':contato?'https://wa.me/55'+contato:(email?'mailto:'+email:''),
      'Origem do Lead':registro&&registro.origem_lead||'',
      Status:registro&&registro.status||'',
      Colaboradores:registro&&registro.colaboradores||'',
      'Valor da Proposta':'',
      'Data da Proposta':'',
      'Observações Estratégicas':registro&&registro.observacoes_estrategicas||'',
      'Última Interação':registro&&registro.ultima_interacao_em||'',
      'Diagnóstico Enviado':'Não',
      'Chance de Fechamento':'',
      'Receita Ponderada':'',
      lead_key:leadKey,
      lead_nome:registro&&registro.nome||'',
      lead_empresa:registro&&registro.empresa||'',
      lead_email:registro&&registro.email||'',
      lead_celular:registro&&registro.contato||'',
      ultimo_registro_em:'',
      negocios,
      ioa_historico:[],
      iesg_historico:[]
    },dadosNegocio);
  }

  async function lerTabelaSupabaseCoreAflor(tabela,config,accessToken){
    const url=config.projectUrl+'/rest/v1/'+tabela+'?select=*&tenant_id=eq.'+encodeURIComponent(config.tenant);
    const headers={
      apikey:config.publishableKey,
      Authorization:'Bearer '+accessToken,
      'Accept-Profile':config.schema
    };
    const request=()=>fetch(url,{headers});
    let response=await request();

    if(
      !response.ok&&
      (tabela==='base'||tabela==='negocios'||tabela==='cadencia_comercial')&&
      response.status===401
    ){
      let errorCode='';
      try{
        const erro=await response.clone().json();
        errorCode=erro&&typeof erro.code==='string'?erro.code:'';
      }catch(_){ }

      if(errorCode==='PGRST303'){
        await new Promise((resolve)=>setTimeout(resolve,1000));
        response=await request();
      }
    }

    if(!response.ok)throw new Error('aflow_supabase_core_read_failed');
    const dados=await response.json();
    if(!Array.isArray(dados))throw new Error('aflow_supabase_core_read_invalid');
    return dados;
  }

  async function readSupabaseShadowTable(tabela){
    if(!SUPABASE_CORE_READ_ENABLED)throw new Error('aflow_supabase_core_read_unavailable');
    const moduleTable=String(tabela||'').trim().toLowerCase();
    if(!AFLOW_MODULE_TABLES.has(moduleTable))throw new Error('aflow_supabase_core_read_table_denied');
    const config=getAflorSupabaseCoreReadConfig();
    if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
    const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
    if(typeof accessToken!=='string'||!accessToken)throw new Error('aflow_auth_required');
    return lerTabelaSupabaseCoreAflor(moduleTable,config,accessToken);
  }

  async function lerCadenciaSupabaseAflor(){
    const config=getAflorSupabaseCoreReadConfig();
    if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
    const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
    if(typeof accessToken!=='string'||!accessToken)throw new Error('aflow_auth_required');
    const dados=await lerTabelaSupabaseCoreAflor('cadencia_comercial',config,accessToken);
    if(dados.length!==1||!dados[0]||typeof dados[0].cadencia!=='object'||Array.isArray(dados[0].cadencia)){
      throw new Error('aflow_cadencia_read_failed');
    }
    return {status:'ok',cadencia:dados[0].cadencia};
  }

  async function salvarCadenciaSupabaseAflor(cadencia){
    const config=getAflorSupabaseCoreReadConfig();
    if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
    const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
    if(typeof accessToken!=='string'||!accessToken)throw new Error('aflow_auth_required');
    const url=config.projectUrl+'/rest/v1/cadencia_comercial?tenant_id=eq.'+encodeURIComponent(config.tenant);
    const response=await fetch(url,{
      method:'PATCH',
      headers:{
        apikey:config.publishableKey,
        Authorization:'Bearer '+accessToken,
        'Content-Type':'application/json',
        'Accept-Profile':config.schema,
        'Content-Profile':config.schema,
        Prefer:'return=representation'
      },
      body:JSON.stringify({cadencia})
    });
    if(!response.ok)throw new Error('Não foi possível salvar a cadência.');
    const dados=await response.json();
    if(!Array.isArray(dados)||dados.length!==1||!dados[0]||typeof dados[0].cadencia!=='object'||Array.isArray(dados[0].cadencia)){
      throw new Error('Não foi possível salvar a cadência.');
    }
    return {status:'ok',cadencia:dados[0].cadencia};
  }
  async function lerDadosCoreAflor(){
    const config=getAflorSupabaseCoreReadConfig();
    if(typeof window.AFLOW_AUTH_GET_ACCESS_TOKEN!=='function')throw new Error('aflow_auth_required');
    const accessToken=await window.AFLOW_AUTH_GET_ACCESS_TOKEN();
    if(typeof accessToken!=='string'||!accessToken)throw new Error('aflow_auth_required');
    const [leituraCadencia,base,negocios]=await Promise.all([
      lerCadenciaSupabaseAflor(),
      lerTabelaSupabaseCoreAflor('base',config,accessToken),
      lerTabelaSupabaseCoreAflor('negocios',config,accessToken)
    ]);
    const negociosPorLeadKey={};
    negocios.forEach(negocio=>{
      const leadKey=String(negocio&&negocio.lead_key||'').trim();
      if(!leadKey)return;
      if(!negociosPorLeadKey[leadKey])negociosPorLeadKey[leadKey]=[];
      negociosPorLeadKey[leadKey].push(negocio);
    });
    return {
      status:'ok',
      headers:AFLOW_CRM_HEADERS,
      rows:base.map(registro=>montarLinhaSupabaseCore(registro,negociosPorLeadKey)),
      cadencia:leituraCadencia.cadencia
    };
  }

  let aflowIaFeedbackTimer=null;
  function showAflowIaFeedback(message){
    const loading=document.getElementById('ld');
    const text=document.getElementById('ld-t');
    if(!loading||!text)return;
    if(aflowIaFeedbackTimer)clearTimeout(aflowIaFeedbackTimer);
    text.textContent=message;
    loading.classList.remove('gone');
    aflowIaFeedbackTimer=setTimeout(()=>loading.classList.add('gone'),4200);
  }

  function buildAflowIaInstanceContext(){
    const categorias={};
    let caracteresCatalogo=0;
    Object.entries(BUSINESS_PRODUCTS_BY_CATEGORY).slice(0,40).forEach(([categoria,produtos])=>{
      const nome=String(categoria||'').trim().slice(0,100);
      if(!nome||caracteresCatalogo+nome.length>3000)return;
      caracteresCatalogo+=nome.length;
      categorias[nome]=(Array.isArray(produtos)?produtos:[])
        .slice(0,50)
        .map(produto=>String(produto||'').trim().slice(0,120))
        .filter(produto=>{
          if(!produto||caracteresCatalogo+produto.length>3000)return false;
          caracteresCatalogo+=produto.length;
          return true;
        });
    });
    return {
      tenant:String(rawInstanceConfig.tenant||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,64),
      modo_instancia:String(rawInstanceConfig.modo_instancia||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32),
      categorias_produtos:categorias,
      tipos_oportunidade:BUSINESS_TYPE_OPTIONS.slice(0,20).map(tipo=>String(tipo).slice(0,80)),
      modulo_adicional:DIAGNOSTICS_ENABLED?'diagnostics':null,
      ativos_habilitados:flowModules?[...flowModules.enabledAssets]:[],
      referencia_oficial_url:safeHttpUrl(String(rawInstanceConfig.referencia_oficial_url||'').slice(0,512))
    };
  }

  let aflowIaPreparedMessage='';
  let aflowIaPreparedUrl='';
  function closeAflowIaReadyModal(){
    const modal=document.getElementById('aflowIaReadyModal');
    if(modal)modal.hidden=true;
    aflowIaPreparedMessage='';
    aflowIaPreparedUrl='';
  }

  function showAflowIaReadyModal(message,iaUrl){
    const modal=document.getElementById('aflowIaReadyModal');
    const fallback=document.getElementById('aflowIaClipboardFallback');
    const feedback=document.getElementById('aflowIaClipboardFeedback');
    const field=document.getElementById('aflowIaPreparedMessage');
    const primary=document.getElementById('aflowIaCopyOpen');
    const cancel=document.getElementById('aflowIaCancel');
    if(!modal||!field||!primary||!cancel||!fallback||!feedback){
      showAflowIaFeedback('Não foi possível abrir a IA Flow. Tente novamente.');
      return;
    }
    aflowIaPreparedMessage=message;
    aflowIaPreparedUrl=iaUrl;
    field.value=message;
    fallback.hidden=true;
    feedback.hidden=true;
    primary.hidden=false;
    cancel.hidden=false;
    modal.hidden=false;
  }

  function showAflowIaClipboardFallback(){
    const fallback=document.getElementById('aflowIaClipboardFallback');
    const feedback=document.getElementById('aflowIaClipboardFeedback');
    const field=document.getElementById('aflowIaPreparedMessage');
    if(fallback)fallback.hidden=false;
    if(feedback)feedback.hidden=false;
    if(field){
      field.focus();
      field.select();
    }
  }

  function copyAflowIaPreparedMessage(){
    if(!aflowIaPreparedMessage)return false;
    const field=document.createElement('textarea');
    field.value=aflowIaPreparedMessage;
    field.setAttribute('readonly','');
    field.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(field);
    field.select();
    try{
      return document.execCommand('copy');
    }catch(e){
      return false;
    }finally{
      field.remove();
    }
  }

  function openAflowIaPreparedUrl(){
    if(!aflowIaPreparedUrl)return false;
    const target=window.open(aflowIaPreparedUrl,'_blank');
    if(!target){
      showAflowIaFeedback('Não foi possível abrir a IA Flow. Verifique a permissão de pop-ups e tente novamente.');
      return false;
    }
    try{target.opener=null;}catch(e){}
    return true;
  }

  function copyAndOpenAflowIa(){
    if(!aflowIaPreparedMessage||!aflowIaPreparedUrl){
      closeAflowIaReadyModal();
      showAflowIaFeedback('Não foi possível abrir a IA Flow. Tente novamente.');
      return;
    }
    if(!copyAflowIaPreparedMessage()){
      showAflowIaClipboardFallback();
      return;
    }
    if(openAflowIaPreparedUrl())closeAflowIaReadyModal();
  }

  let aflowIaContextInFlight=false;
  function setAflowIaContextInFlightState(inFlight){
    document.querySelectorAll('.aflow-ia-diagnostics-global,[data-open-aflow-ia],#aflowIaGeneral').forEach(button=>{
      if(!(button instanceof HTMLButtonElement))return;
      if(inFlight){
        if(button.dataset.aflowIaOriginalHtml!==undefined)return;
        button.dataset.aflowIaOriginalHtml=button.innerHTML;
        button.dataset.aflowIaWasDisabled=button.disabled?'true':'false';
        button.disabled=true;
        button.setAttribute('aria-busy','true');
        button.textContent='Preparando...';
        return;
      }
      if(button.dataset.aflowIaOriginalHtml===undefined)return;
      button.innerHTML=button.dataset.aflowIaOriginalHtml;
      button.disabled=button.dataset.aflowIaWasDisabled==='true';
      button.removeAttribute('aria-busy');
      delete button.dataset.aflowIaOriginalHtml;
      delete button.dataset.aflowIaWasDisabled;
    });
  }

  async function openAflowIaContext(payload){
    if(aflowIaContextInFlight)return;
    const scope=String(payload&&payload.scope||'').trim().toLowerCase();
    const origin=String(payload&&payload.origin||'').trim().toLowerCase();
    const request={_action:'prepareAiContext',scope,origin};
    const iaUrl=safeHttpUrl(AFLOW_IA_GPT_URL);
    if(!iaUrl||scope!=='general'||origin!=='sidebar'){
      showAflowIaFeedback('Não foi possível preparar o contexto da IA Flow. Tente novamente.');
      return;
    }
    aflowIaContextInFlight=true;
    setAflowIaContextInFlightState(true);
    try{
      if(DIAGNOSTICS_ENABLED&&!flowModules)await modulesReady;
      request.instance=buildAflowIaInstanceContext();
      delete request.instance.tenant;
      const data=await fetchCrmJson(request);
      const handoffRef=String(data&&data.handoff_ref||'').trim();
      if(data&&data.status==='ok'&&data.handoff_status==='pending'&&handoffRef){
        showAflowIaReadyModal(`Carregue o contexto disponível usando este handoff_ref: "${handoffRef}"`,iaUrl);
        return;
      }
      showAflowIaFeedback(data&&data.error==='pending_exists'
        ? 'A IA Flow já está preparando um contexto. Aguarde alguns segundos e tente novamente.'
        : 'Não foi possível abrir a IA Flow. Tente novamente.');
    }catch(e){
      showAflowIaFeedback(e&&e.responseData&&e.responseData.error==='pending_exists'
        ? 'A IA Flow já está preparando um contexto. Aguarde alguns segundos e tente novamente.'
        : 'Não foi possível abrir a IA Flow. Tente novamente.');
    }finally{
      aflowIaContextInFlight=false;
      setAflowIaContextInFlightState(false);
    }
  }

  function createCrmRequestError(message,code,details){
    const error=new Error(message);
    error.code=code;
    if(details)Object.assign(error,details);
    return error;
  }

  function isIndeterminateWriteError(error){
    if(!error)return true;
    if(error.code==='frontend_timeout'||error.code==='network_error'||error.code==='invalid_response')return true;
    return error.code==='http_error'&&(error.httpStatus===408||error.httpStatus>=500);
  }

  async function fetchCrmJson(payload,options){
    let lastError=null;
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),FRONTEND_REQUEST_TIMEOUT_MS);
    try{
      const r=await fetchCrm(payload,Object.assign({},options,{signal:controller.signal}));
      if(!r.ok)throw createCrmRequestError('HTTP '+r.status,'http_error',{httpStatus:r.status});
      const d=await r.json();
      if(d&&d.status==='error')throw createCrmRequestError(d.error||'Falha na requisição.','backend_error',{responseData:d});
      return d;
    }catch(e){
      if(controller.signal.aborted){
        lastError=createCrmRequestError('Tempo limite da requisição excedido.','frontend_timeout');
      }else if(e&&e.code){
        lastError=e;
      }else if(e instanceof SyntaxError){
        lastError=createCrmRequestError('Resposta inválida do servidor.','invalid_response');
      }else{
        lastError=createCrmRequestError((e&&e.message)||'Erro de rede.','network_error');
      }
    }finally{
      clearTimeout(timeoutId);
    }
    throw lastError||new Error('Erro de rede persistente.');
  }

  function inspectPendingBusinessCreation(rows,pending){
    if(!pending||!Array.isArray(rows))return {state:'ambiguous'};
    const lead=rows.find(row=>{
      const leadKey=String(getLeadValue(row,'leadKey','Lead Key','lead_key')||'').trim();
      const id=String(getLeadValue(row,'id','ID','Id')||'').trim();
      return pending.leadKey&&leadKey===pending.leadKey||id===pending.id;
    });
    if(!lead)return {state:'ambiguous'};
    const negocios=getLeadNegocios(lead);
    if(negocios.some(negocio=>!String(negocio.negocio_id||'').trim()))return {state:'ambiguous'};
    const anteriores=new Set(pending.businessIds||[]);
    const novos=negocios.filter(negocio=>!anteriores.has(String(negocio.negocio_id||'').trim()));
    if(novos.length===1)return {state:'created',business:novos[0]};
    if(novos.length===0)return {state:'not_created'};
    return {state:'ambiguous'};
  }

  function resolvePendingBusinessCreationFromRead(readResult){
    const pending=pendingBusinessCreation;
    if(!pending)return null;
    const outcome=inspectPendingBusinessCreation(readResult&&readResult.rows,pending);
    const localLead=leads.find(lead=>{
      const leadKey=String(getLeadValue(lead,'leadKey','Lead Key','lead_key')||'').trim();
      const id=String(getLeadValue(lead,'id','ID','Id')||'').trim();
      return pending.leadKey&&leadKey===pending.leadKey||id===pending.id;
    });
    const currentId=String(getLeadValue(currentLead,'id','ID','Id')||'').trim();
    const ownsModal=currentId===pending.id;
    const btn=document.getElementById('btnSave');
    const status=document.getElementById('saveStatus');

    if(outcome.state==='created'){
      pendingBusinessCreation=null;
      if(ownsModal&&localLead){
        currentLead=localLead;
        activeBusinessId=String(outcome.business.negocio_id||'').trim();
        newBusinessDraft=false;
        previousActiveBusinessId='';
        businessDraftSnapshot=null;
        businessDraftPreviousDirty=false;
        commercialModalDirty=false;
        syncNewBusinessDraftUi();
        atualizarSeletorNegocios(localLead,outcome.business,activeBusinessId);
        captureCommercialModalSnapshot();
      }
      if(ownsModal&&status){status.className='save-status ok';status.textContent='✓ Oportunidade confirmada e sincronizada.';}
      if(ownsModal&&btn)btn.disabled=false;
      return outcome;
    }

    if(outcome.state==='not_created'){
      pendingBusinessCreation=null;
      if(ownsModal&&localLead)currentLead=localLead;
      if(ownsModal&&status){status.className='save-status err';status.textContent='Nenhuma nova oportunidade foi criada. Você pode salvar novamente.';}
      if(ownsModal&&btn)btn.disabled=false;
      return outcome;
    }

    if(ownsModal&&status){status.className='save-status err';status.textContent='Resultado indeterminado. Atualize a lista antes de tentar novamente.';}
    if(ownsModal&&btn)btn.disabled=true;
    return outcome;
  }

  async function reconcilePendingBusinessCreation(){
    try{
      const readResult=await lerDadosCoreAflor();
      if(!readResult||!Array.isArray(readResult.rows)||!Array.isArray(readResult.headers))return {state:'ambiguous'};
      cadenciaComercialAtual=normalizarCadenciaComercial(readResult.cadencia);
      proc(readResult.rows,readResult.headers);
      return resolvePendingBusinessCreationFromRead(readResult)||{state:'ambiguous'};
    }catch(e){
      return {state:'ambiguous'};
    }
  }

  async function loadData(options){
    if(loadPromise)return loadPromise;
    if(manualRefreshRequested&&(flowModules&&!flowModules.leaveIntelligenceObservationContext())){
      manualRefreshRequested=false;
      return false;
    }
    const shouldLoadIntelligenceInBackground=DIAGNOSTICS_ENABLED&&!options&&(!flowModules||(!flowModules.isLoaded&&!flowModules.isLoading));
    loadPromise=(async()=>{
    loadInProgress=true;
    const btn=document.getElementById('btnR'),ldEl=document.getElementById('ld');
    const shouldRefreshIntelligence=DIAGNOSTICS_ENABLED&&manualRefreshRequested;
    manualRefreshRequested=false;
    btn.classList.add('spin');
    document.getElementById('ld-t').textContent='Atualizando dados…';
    ldEl.classList.remove('gone');
    try{
      const d=await lerDadosCoreAflor();
      cadenciaComercialAtual=normalizarCadenciaComercial(d.cadencia);
      proc(d.rows,d.headers);
      resolvePendingBusinessCreationFromRead(d);
      let intelligenceRefreshSucceeded=true;
      if(shouldRefreshIntelligence){
        const module=await modulesReady;
        intelligenceRefreshSucceeded=module?await module.loadIntelligenceData(true):false;
      }
      else if(shouldLoadIntelligenceInBackground)modulesReady.then(module=>module&&module.loadIntelligenceData(false)).catch(()=>{});
      ultimaAtualizacaoHora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      atualizarContextoViews();
      if(shouldRefreshIntelligence&&!intelligenceRefreshSucceeded){
        document.getElementById('ld-t').innerHTML='<span style="color:#DC2626">Dados comerciais atualizados; diagnósticos não puderam ser atualizados.</span>';
        ldEl.style.cursor='pointer';
        ldEl.onclick=()=>{manualRefreshRequested=true;loadData();};
        return true;
      }
      document.getElementById('ld-t').textContent='Atualizado';
      ldEl.style.cursor='';
      ldEl.onclick=null;
      setTimeout(()=>ldEl.classList.add('gone'),60);
      return true;
    }catch(e){
      const quiet=options&&options.quietError;
      const savedMessage=(options&&options.savedMessage)||'Registro salvo. Não foi possível atualizar a lista agora. Tente recarregar.';
      document.getElementById('ld-t').innerHTML=quiet
        ? '<span style="color:#DC2626">'+savedMessage+'</span>'
        : '<span style="color:#DC2626">Erro: '+e.message+'</span>'+
          '<br><small style="color:#8E8E93;margin-top:8px;display:block">Clique para tentar novamente</small>';
      ldEl.style.cursor='pointer';
      ldEl.onclick=loadData;
      return false;
    }finally{
      btn.classList.remove('spin');
      loadInProgress=false;
    }
    })();
    return loadPromise.finally(()=>{loadPromise=null;});
  }

  async function saveEdit(){
    if(!currentLead||saveInProgress)return;
    const btn=document.getElementById('btnSave'),st=document.getElementById('saveStatus');
    const savedLead=currentLead;
    const savedId=String(getLeadValue(savedLead,'id','ID','Id')||'').trim();
    const savedLeadKey=String(getLeadValue(savedLead,'leadKey','Lead Key','lead_key')||'').trim();
    if(flowModules&&flowModules.hasPendingObservations(savedLeadKey)){
      st.className='save-status err';
      st.textContent='✕ Conclua ou cancele a edição das observações.';
      return;
    }
    syncCommercialObservationFieldWithCanonical(savedLead,savedLeadKey);
    const negociosDoLead=getLeadNegocios(savedLead);
    const negocioFormulario=lerNegocioDosControles();
    const firstBusinessStatus=norm(negocioFormulario.status);
    const hasCommercialContent=['categoria','produto_servico','tipo_negocio','valor_proposta','proposta_em']
      .some(key=>String(negocioFormulario[key]||'').trim()!=='');
    const creatingBusiness=newBusinessDraft||(!negociosDoLead.length&&(
      ['qualificado','encerrado'].includes(firstBusinessStatus)||
      (firstBusinessStatus==='novo'&&hasCommercialContent)
    ));

    if(!savedId){
      st.className='save-status err';
      st.textContent='✕ Este lead não possui ID — salvar não é permitido em modo produção';
      console.error('[AFLOR save] currentLead sem ID');
      return;
    }

    saveInProgress=true;
    btn.disabled=true;st.className='save-status';st.textContent='Salvando…';

    const u={};
    u._id     = savedId;
    u.lead_key = savedLeadKey;
    u._action = 'update';
    const selecaoNegocioObrigatoria=!creatingBusiness&&negociosDoLead.length>1&&!activeBusinessId;
    if(newBusinessDraft)u.criar_negocio=true;
    else if(activeBusinessId)u.negocio_id=activeBusinessId;
    const addIfFilled=(key,value)=>{
      if(value===undefined||value===null)return;
      const texto=String(value).trim();
      if(!texto||texto==='N/A')return;
      u[key]=texto;
    };
    const addOptionalField=(key,value)=>{
      if(value===undefined||value===null)return;
      const texto=String(value).trim();
      if(texto==='N/A')return;
      u[key]=texto;
    };

    addIfFilled('nome',document.getElementById('eNomeCompleto').value);
    addIfFilled('empresa',document.getElementById('eEmpresa').value);
    addIfFilled('cargo',document.getElementById('eCargo').value);
    addOptionalField('endereco',document.getElementById('eEndereco').value);
    addOptionalField('cidade',document.getElementById('eCidade').value);
    addOptionalField('uf',document.getElementById('eUf').value.trim().toUpperCase().slice(0,2));
    if(!selecaoNegocioObrigatoria){
      if(creatingBusiness||activeBusinessId){
        addIfFilled('status',negocioFormulario.status||(creatingBusiness?'Novo':''));
        addOptionalField('categoria',negocioFormulario.categoria);
        addOptionalField('produto_servico',negocioFormulario.produto_servico);
        addOptionalField('tipo_negocio',negocioFormulario.tipo_negocio);
        addOptionalField('valorProposta',negocioFormulario.valor_proposta);
        addOptionalField('dataProposta',negocioFormulario.proposta_em);
      }
    }
    addOptionalField('ultimaInteracao',document.getElementById('eUltima').value);
    const celularEl = document.getElementById('eCelular');
    addOptionalField('contato',celularEl.value === celularEl.dataset.maskedValue ? celularEl.dataset.rawValue : celularEl.value);
    const emailValue=(document.getElementById('eEmail').value||'').trim();
    if(emailValue&&!isValidEmailLite(emailValue)){
      btn.disabled=false;
      saveInProgress=false;
      st.className='save-status err';
      st.textContent='✕ E-mail inválido';
      return;
    }
    if(newBusinessDraft&&pendingBusinessCreation&&pendingBusinessCreation.id===savedId){
      st.className='save-status err';
      st.textContent='Resultado indeterminado. Atualize a lista antes de tentar novamente.';
      btn.disabled=true;
      return;
    }
    addOptionalField('email',emailValue);
    addOptionalField('observacoesEstrategicas',document.getElementById('eObs').value);
    const previousBusinessIds=getLeadNegocios(savedLead)
      .map(negocio=>String(negocio.negocio_id||'').trim())
      .filter(Boolean);
    function _aplicarLocalmente(resposta){
      const leadLocal=leads.find(l=>
        String(getLeadValue(l,'id','ID','Id')||'').trim()===savedId
      )||savedLead;
      if(creatingBusiness&&!Array.isArray(leadLocal.negocios))leadLocal.negocios=[];
      const negociosLocais=getLeadNegocios(leadLocal);
      if(creatingBusiness){
        const novoNegocio={
          negocio_id:String(resposta.negocio_id||'').trim(),
          lead_key:savedLeadKey,
          categoria:u.categoria||'',
          produto_servico:u.produto_servico||'',
          tipo_negocio:u.tipo_negocio||'',
          status:u.status||'Novo',
          valor_proposta:u.valorProposta||'',
          proposta_em:u.dataProposta||''
        };
        negociosLocais.push(novoNegocio);
        activeBusinessId=novoNegocio.negocio_id;
      }
      const negocioIdLocal=creatingBusiness?activeBusinessId:u.negocio_id;
      const negocioLocal=negocioIdLocal
        ? negociosLocais.find(item=>String(item.negocio_id||'').trim()===negocioIdLocal)
        : negociosLocais.length===1?negociosLocais[0]:null;
      if(negocioLocal){
        if(u.categoria !== undefined)negocioLocal.categoria=u.categoria;
        if(u.produto_servico !== undefined)negocioLocal.produto_servico=u.produto_servico;
        if(u.tipo_negocio !== undefined)negocioLocal.tipo_negocio=u.tipo_negocio;
        if(u.status !== undefined)negocioLocal.status=u.status;
        if(u.valorProposta !== undefined)negocioLocal.valor_proposta=u.valorProposta;
        if(u.dataProposta !== undefined)negocioLocal.proposta_em=u.dataProposta;
      }
      if(resposta.status_base !== undefined)leadLocal.statusb=resposta.status_base;
      if(u.ultimaInteracao !== undefined) leadLocal.ultima = u.ultimaInteracao ? formatDateYY(u.ultimaInteracao) : '';
      if(u.observacoesEstrategicas !== undefined){
        if(flowModules)flowModules.syncObservations(savedLeadKey,u.observacoesEstrategicas);
        else syncCoreObservations(savedLeadKey,u.observacoesEstrategicas);
      }
      if(u.contato !== undefined) leadLocal.celular = u.contato;
      if(u.nome !== undefined) leadLocal.contato = u.nome;
      if(u.empresa !== undefined) leadLocal.empresa = u.empresa;
      if(u.cargo !== undefined) leadLocal.cargo = u.cargo;
      if(u.endereco !== undefined) leadLocal.endereco = u.endereco;
      if(u.cidade !== undefined) leadLocal.cidade = u.cidade;
      if(u.uf !== undefined) leadLocal.uf = u.uf;
      if(u.email !== undefined) leadLocal.email = u.email;
      const motorVisual=calcularMotorVisualLead(leadLocal);
      leadLocal.proximoFollowUpVisual=motorVisual.proximoFollowUp;
      leadLocal.proximaAcaoVisual=motorVisual.proximaAcao;
      leadLocal.prioridadeVisual=motorVisual.prioridade;
      const currentLeadId=String(getLeadValue(currentLead,'id','ID','Id')||'').trim();
      if(currentLeadId===savedId){
        currentLead=leadLocal;
        renderCommercialModalIdentity(leadLocal.empresa,leadLocal.contato);
        refreshIntelligenceChipsForLead(leadLocal);
        if(creatingBusiness){
          newBusinessDraft=false;
          previousActiveBusinessId='';
          businessDraftSnapshot=null;
          businessDraftPreviousDirty=false;
          syncNewBusinessDraftUi();
          atualizarSeletorNegocios(leadLocal,null,activeBusinessId);
        }else if(negocioLocal){
          syncStatusOptions(negocioLocal.status||'');
        }
      }
      tbl(); kpis(); charts(); microFunnel();
    }
    try{
      const resp=await fetchCrmJson(u);
      if(creatingBusiness&&!String(resp&&resp.negocio_id||'').trim())throw createCrmRequestError('Resposta sem negocio_id criado.','invalid_response');
      pendingBusinessCreation=null;
      commercialModalDirty=false;
      st.className='save-status ok';
      _aplicarLocalmente(resp);
      captureCommercialModalSnapshot();
      st.textContent='✓ Salvo!';
      btn.disabled=false;
      saveInProgress=false;
    }catch(err){
      if(u.criar_negocio===true&&isIndeterminateWriteError(err)){
        pendingBusinessCreation={id:savedId,leadKey:savedLeadKey,businessIds:previousBusinessIds};
        st.className='save-status';
        st.textContent='Confirmando criação da oportunidade…';
        const outcome=await reconcilePendingBusinessCreation();
        saveInProgress=false;
        if(outcome.state==='ambiguous'){
          st.className='save-status err';
          st.textContent='Resultado indeterminado. Atualize a lista antes de tentar novamente.';
          btn.disabled=true;
        }
        return;
      }
      btn.disabled=false;
      saveInProgress=false;
      st.className='save-status err';
      st.textContent='✕ '+err.message;
      console.error('[AFLOR save] fetch error:',err.message);
    }
  }

  function openNewRecord(){
    if(createInProgress)return false;
    clearNewRecordForm();
    newRecordDirty=false;
    const st=document.getElementById('newSaveStatus');
    if(st){st.className='save-status';st.textContent='';}
    const btn=document.getElementById('btnCreate');
    if(btn)btn.disabled=false;
    document.getElementById('newMsk').classList.add('open');
    document.getElementById('newMbox').scrollTop=0;
    return true;
  }

  function closeNewRecord(){
    if(createInProgress)return false;
    if(!canCloseEditableModal(newRecordDirty))return false;
    document.getElementById('newMsk').classList.remove('open');
    newRecordDirty=false;
    return true;
  }

  function openCadencia(){
    cadenciaComercialEdicao=normalizarCadenciaComercial(cadenciaComercialAtual);
    document.querySelectorAll('[data-cadencia-status]').forEach(row=>{
      const regra=cadenciaComercialEdicao[row.dataset.cadenciaStatus];
      if(!regra)return;
      row.querySelector('[data-cadencia-field="ativo"]').checked=regra.ativo;
      row.querySelector('[data-cadencia-field="dias"]').value=regra.dias;
      row.querySelector('[data-cadencia-field="tipo"]').value=regra.tipo;
    });
    const status=document.getElementById('cadenciaSaveStatus');
    status.className='save-status';
    status.textContent='';
    document.getElementById('cadMsk').classList.add('open');
    document.getElementById('cadMbox').scrollTop=0;
  }

  function closeCadencia(){
    if(cadenciaSaveInProgress)return;
    document.getElementById('cadMsk').classList.remove('open');
    cadenciaComercialEdicao=null;
  }

  function lerCadenciaFormulario(){
    const configuracao={};
    const rows=[...document.querySelectorAll('[data-cadencia-status]')];
    for(const row of rows){
      const status=row.dataset.cadenciaStatus;
      const diasEl=row.querySelector('[data-cadencia-field="dias"]');
      const dias=Number(diasEl.value);
      const tipo=row.querySelector('[data-cadencia-field="tipo"]').value;
      if(!Number.isInteger(dias)||dias<1||dias>365){
        diasEl.focus();
        throw new Error('Informe um prazo inteiro entre 1 e 365 dias.');
      }
      if(tipo!=='uteis'&&tipo!=='corridos'){
        throw new Error('Selecione um tipo de prazo válido.');
      }
      configuracao[status]={
        ativo:row.querySelector('[data-cadencia-field="ativo"]').checked,
        dias,
        tipo
      };
    }
    return configuracao;
  }

  async function saveCadencia(){
    if(cadenciaSaveInProgress)return;
    const btn=document.getElementById('btnCadenciaSave');
    const status=document.getElementById('cadenciaSaveStatus');
    let configuracao;
    try{
      configuracao=lerCadenciaFormulario();
    }catch(e){
      status.className='save-status err';
      status.textContent=e.message;
      return;
    }

    cadenciaSaveInProgress=true;
    btn.disabled=true;
    status.className='save-status';
    status.textContent='Salvando…';
    try{
      const resposta=await salvarCadenciaSupabaseAflor(configuracao);
      if(!resposta||resposta.status!=='ok'||!resposta.cadencia){
        throw new Error('Não foi possível salvar a cadência.');
      }
      cadenciaComercialAtual=normalizarCadenciaComercial(resposta.cadencia);
      cadenciaComercialEdicao=normalizarCadenciaComercial(cadenciaComercialAtual);
      recalcularMotorVisualLeads();
      status.className='save-status ok';
      status.textContent='✓ Cadência atualizada';
      document.getElementById('cadMsk').classList.remove('open');
      cadenciaComercialEdicao=null;
    }catch(e){
      status.className='save-status err';
      status.textContent=e.message||'Não foi possível salvar a cadência.';
    }finally{
      cadenciaSaveInProgress=false;
      btn.disabled=false;
    }
  }

  function normalizeCreateMatchValue(value){
    return String(value||'').trim().toLowerCase();
  }
  function getLoadedLeadIds(){
    return new Set(leads.map(lead=>String(getLeadValue(lead,'id','ID','Id')||'').trim()).filter(Boolean));
  }
  function findCreatedLeadAfterCreate(previousIds,expected){
    return leads.find(lead=>{
      const id=String(getLeadValue(lead,'id','ID','Id')||'').trim();
      if(!id||previousIds.has(id))return false;
      const email=normalizeCreateMatchValue(getLeadValue(lead,'email','E-mail','lead_email'));
      const nome=normalizeCreateMatchValue(getLeadValue(lead,'contato','Nome','nome'));
      const empresa=normalizeCreateMatchValue(getLeadValue(lead,'empresa','Empresa'));
      return email===expected.email&&nome===expected.nome&&empresa===expected.empresa;
    })||null;
  }
  function clearNewRecordForm(){
    ['nEmpresa','nNome','nCargo','nContato','nColaboradores','nOrigemLead','nStatus','newEmail'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.value='';
    });
    document.getElementById('nStatus').value='Lead';
  }
  async function confirmCreateAfterTimeout(previousIds,expected){
    const delays=[1000,2000];
    for(const delay of delays){
      await wait(delay);
      const reloaded=await loadData({quietError:true});
      if(reloaded&&findCreatedLeadAfterCreate(previousIds,expected))return true;
    }
    return false;
  }

  async function createRecord(){
    if(createInProgress)return;
    const btn=document.getElementById('btnCreate'),st=document.getElementById('newSaveStatus');
    const value=(id)=>{
      const el=document.getElementById(id);
      return el?el.value.trim():'';
    };
    const required=[
      ['nEmpresa','Empresa'],
      ['nNome','Nome'],
      ['newEmail','E-mail']
    ];
    const missing=required.filter(([id])=>!value(id)).map(([,label])=>label);
    if(missing.length){
      st.className='save-status err';
      st.textContent='✕ Preencha: '+missing.join(', ');
      return;
    }
    const emailNormalizado=value('newEmail').toLowerCase();
    if(!isValidEmailLite(emailNormalizado)){
      st.className='save-status err';
      st.textContent='✕ Informe um e-mail válido.';
      const emailEl=document.getElementById('newEmail');
      if(emailEl)emailEl.focus();
      return;
    }

    createInProgress=true;
    btn.disabled=true;st.className='save-status';st.textContent='Criando…';
    const releaseCreate=()=>{
      createInProgress=false;
      btn.disabled=false;
    };

    const previousIds=getLoadedLeadIds();
    const expectedCreatedLead={
      email:emailNormalizado,
      nome:normalizeCreateMatchValue(value('nNome')),
      empresa:normalizeCreateMatchValue(value('nEmpresa'))
    };
    const payload={_action:'create'};
    [
      ['empresa',value('nEmpresa')],
      ['nome',value('nNome')],
      ['cargo',value('nCargo')],
      ['contato',value('nContato')],
      ['colaboradores',value('nColaboradores')],
      ['origemLead',value('nOrigemLead')],
      ['status',value('nStatus')],
      ['email',emailNormalizado]
    ].forEach(([key,val])=>{if(val)payload[key]=val;});
    try{
      const resp=await fetchCrmJson(payload);
      if(resp&&resp.status==='ok'){
        newRecordDirty=false;
        st.className='save-status ok';
        st.textContent='✓ Registro criado! Atualizando…';
        setTimeout(async()=>{
          let reloaded=false;
          try{
            reloaded=await loadData({quietError:true});
          }catch(e){
            reloaded=false;
          }
          releaseCreate();
          if(reloaded){
            clearNewRecordForm();
            closeNewRecord();
          }else{
            st.className='save-status err';
            st.textContent='Registro salvo. Não foi possível atualizar a lista agora. Tente recarregar.';
          }
        },900);
      }else{
        releaseCreate();
        console.error('[AFLOR create] resposta com erro');
        st.className='save-status err';
        st.textContent='✕ '+((resp&&resp.error)||'Falha ao criar registro.');
      }
    }catch(err){
      console.error('[AFLOR create] erro',err.message);
      if(isIndeterminateWriteError(err)){
        st.className='save-status';
        st.textContent='Confirmando criação…';
        let confirmed=false;
        try{
          confirmed=await confirmCreateAfterTimeout(previousIds,expectedCreatedLead);
        }catch(e){
          confirmed=false;
        }
        releaseCreate();
        if(confirmed){
          newRecordDirty=false;
          st.className='save-status ok';
          st.textContent='✓ Registro criado! Atualizando…';
          clearNewRecordForm();
          closeNewRecord();
        }else{
          st.className='save-status err';
          st.textContent='Não foi possível confirmar a criação do registro. Atualize a lista antes de tentar novamente.';
        }
      }else{
        releaseCreate();
        st.className='save-status err';
        st.textContent='✕ Erro de rede — '+err.message;
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function norm(s){
    return(s||'').toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // remove acentos
      .replace(/[-_?.!,;:()/\\]/g,'')                  // remove pontuação/hífens
      .replace(/\s+/g,' ').trim();                      // normaliza espaços
  }
  function fc(H,...cc){
    for(const c of cc){
      const nc=norm(c);
      let i=H.findIndex(h=>norm(h)===nc);
      if(i>=0)return H[i];
      if(nc.length>=3){
        i=H.findIndex(h=>{ const nh=norm(h); return nh===nc||nh.startsWith(nc)||nh.includes(nc); });
        if(i>=0)return H[i];
      }
    }
    return null;
  }
  function getLeadValue(lead,...keys){
    if(!lead)return '';
    for(const key of keys){
      if(lead[key] !== undefined && lead[key] !== null && lead[key] !== '')return lead[key];
    }
    const raw=lead.__raw || {};
    for(const key of keys){
      if(raw[key] !== undefined && raw[key] !== null && raw[key] !== '')return raw[key];
      const nk=norm(key);
      const found=Object.keys(raw).find(k=>norm(k)===nk);
      if(found && raw[found] !== undefined && raw[found] !== null && raw[found] !== '')return raw[found];
    }
    return '';
  }
  function setSelectValueWithLegacy(select,value){
    if(!select)return;
    const v=value || '';
    const match=[...select.options].find(opt=>opt.value===v || norm(opt.value)===norm(v) || norm(opt.textContent)===norm(v));
    if(match){
      select.value=match.value;
      return;
    }
    if(v){
      const opt=document.createElement('option');
      opt.value=v;
      opt.textContent=v;
      opt.dataset.legacy='true';
      select.appendChild(opt);
    }
    select.value=v;
  }
  function setSelectValue(select,value){
    if(!select)return;
    const v=value || '';
    const match=[...select.options].find(opt=>opt.value===v || norm(opt.value)===norm(v) || norm(opt.textContent)===norm(v));
    select.value=match?match.value:v;
  }
  function hasValue(value){
    if(value===null||value===undefined)return false;
    const s=String(value).trim();
    return s!==''&&s!=='-'&&s!=='—'&&s.toLowerCase()!=='null'&&s.toLowerCase()!=='undefined';
  }
  function isValidEmailLite(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());
  }
  function isClosedStatus(value){return ['fechado','ganho','convertido'].includes(norm(value));}
  function isInactiveStatus(value){return norm(value)==='inativo';}
  function isConvertedStatus(value){return isClosedStatus(value)||isInactiveStatus(value);}
  function isEndedStatus(value){return ['encerrado','perdido'].includes(norm(value));}
  function isMaturingStatus(value){return norm(value)==='em maturacao';}
  function displayStatus(value){
    if(isClosedStatus(value))return 'Fechado';
    if(isInactiveStatus(value))return 'Inativo';
    if(isEndedStatus(value))return 'Encerrado';
    if(isMaturingStatus(value))return 'Em maturação';
    return value || '';
  }
  function opportunityProbability(status){
    return ({qualificado:30,proposta:70,'em maturacao':10,fechado:100,inativo:100,ganho:100,convertido:100})[norm(status)]||0;
  }
  function statusOperationalRank(value){
    const n=norm(value);
    if(n==='proposta')return 0;
    if(n==='qualificado')return 1;
    if(n==='novo')return 2;
    if(isMaturingStatus(value))return 3;
    if(isClosedStatus(value))return 4;
    if(isInactiveStatus(value))return 5;
    if(isEndedStatus(value))return 6;
    return 99;
  }
  function statusClass(value){
    if(isClosedStatus(value))return 'cFechado';
    if(isInactiveStatus(value))return 'cInativo';
    if(isEndedStatus(value))return 'cLost';
    if(isMaturingStatus(value))return 'cM';
    return 'cS';
  }
  function pct(c){
    if(c===null||c===undefined||c==='')return 0;
    const raw=String(c).trim().replace('%+','').replace('+','').replace('%','').replace(',','.');
    const n=parseFloat(raw);
    if(isNaN(n))return 0;
    return n>0&&n<=1?n*100:n;
  }

  function formatPercent(value){
    if(!hasValue(value))return '';
    const raw=String(value).trim().replace('%+','%').replace('+','');
    const n=parseFloat(raw.replace('%','').replace(',','.'));
    if(isNaN(n))return raw;
    return Math.round(n>0&&n<=1?n*100:n)+'%';
  }

  function parseMoneyNumber(value){
    if(value===null||value===undefined||value==='')return null;
    let s=String(value).trim().replace(/R\$/gi,'').replace(/\s+/g,'').replace(/[^0-9,.-]/g,'');
    if(!s)return null;
    const lastComma=s.lastIndexOf(','),lastDot=s.lastIndexOf('.');
    if(lastComma>=0&&lastDot>=0){
      s=lastComma>lastDot?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
    }else if(lastComma>=0){
      s=s.replace(',','.');
    }
    const n=Number(s);
    return isNaN(n)?null:n;
  }

  function formatMoneyBR(value){
    const n=parseMoneyNumber(value);
    if(n===null)return '';
    return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}).replace(/\u00A0/g,' ');
  }

  function safeMoney(value){
    const n=parseMoneyNumber(value);
    return n===null?0:n;
  }

  function maskMoneyBR(value){
    const digits=String(value||'').replace(/\D/g,'');
    if(!digits)return '';
    const cents=parseInt(digits,10);
    return (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}).replace(/\u00A0/g,' ');
  }

  function prioridadeRank(p){
    const rank={critico:0,crtico:0,alta:1,media:2,mdia:2,baixa:3}[norm(p)];
    if(rank!==undefined)return rank;
    return {'CRITICO':0,'CRÍTICO':0,'ALTA':1,'MEDIA':2,'MÉDIA':2,'BAIXA':3}[p] ?? 9;
  }

  function formatDateBR(d){
    if(!d)return'';
    const s=String(d).trim();
    if(/^\d{2}\/\d{2}\/\d{2}$/.test(s))return s;
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
      const[dd,mm,yyyy]=s.split('/');
      return dd.padStart(2,'0')+'/'+mm.padStart(2,'0')+'/'+yyyy.slice(-2);
    }
    const iso=s.split('T')[0];
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso)){
      const[y,m,dia]=iso.split('-');
      return dia+'/'+m+'/'+y.slice(-2);
    }
    return s;
  }

  function toISODate(br){
    if(!br||!br.includes('/'))return br;
    const[d,m,y]=br.split('/');
    if(!d||!m||!y)return br;
    const year=y.length===2?'20'+y:y;
    return year+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0');
  }

  function maskDateYY(value){
    const d=String(value||'').replace(/\D/g,'').slice(0,6);
    if(d.length<=2)return d;
    if(d.length<=4)return d.slice(0,2)+'/'+d.slice(2);
    return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);
  }

  function formatDateYY(value){
    if(!value)return '';
    const s=String(value).trim();
    const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(m)return m[1].padStart(2,'0')+'/'+m[2].padStart(2,'0')+'/'+m[3].slice(-2);
    const iso=s.split('T')[0];
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso)){
      const[y,mo,d]=iso.split('-');
      return d+'/'+mo+'/'+y.slice(-2);
    }
    return maskDateYY(s);
  }

  function pd(s){
    if(!s)return null;
    if(/^\d{4}-\d{2}-\d{2}/.test(s.trim())){
      const iso=s.trim().split('T')[0];
      const[y,m,d]=iso.split('-');
      return new Date(parseInt(y),parseInt(m)-1,parseInt(d));
    }
    const m2=s.replace(/\s/g,'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,6})/);
    if(!m2)return null;
    let y=parseInt(m2[3]);
    if(y<100)y+=2000;
    if(y>2100)y=2026;
    return new Date(y,parseInt(m2[2])-1,parseInt(m2[1]));
  }

  function adicionarDiasUteisVisual(data,quantidade){
    const resultado=new Date(data.getFullYear(),data.getMonth(),data.getDate());
    let adicionados=0;
    while(adicionados<quantidade){
      resultado.setDate(resultado.getDate()+1);
      const dia=resultado.getDay();
      if(dia!==0&&dia!==6)adicionados++;
    }
    return resultado;
  }

  function normalizarCadenciaComercial(configuracao){
    const origem=configuracao&&typeof configuracao==='object'&&!Array.isArray(configuracao)?configuracao:{};
    const normalizada={};
    Object.keys(CADENCIA_COMERCIAL_PADRAO).forEach(status=>{
      const padrao=CADENCIA_COMERCIAL_PADRAO[status];
      const entrada=origem[status]&&typeof origem[status]==='object'&&!Array.isArray(origem[status])?origem[status]:{};
      normalizada[status]={
        ativo:typeof entrada.ativo==='boolean'?entrada.ativo:padrao.ativo,
        dias:typeof entrada.dias==='number'&&Number.isInteger(entrada.dias)&&entrada.dias>=1&&entrada.dias<=365?entrada.dias:padrao.dias,
        tipo:entrada.tipo==='uteis'||entrada.tipo==='corridos'?entrada.tipo:padrao.tipo
      };
    });
    return normalizada;
  }

  function calcularMotorVisualNegocio(status,ultimaInteracao,hojeOpcional){
    const vazio={proximoFollowUp:null,proximaAcao:'',prioridade:''};
    const statusNormalizado=norm(status);
    if(['novo','fechado','encerrado'].includes(statusNormalizado)){
      return {proximoFollowUp:null,proximaAcao:'—',prioridade:'—'};
    }
    const regra=cadenciaComercialAtual[statusNormalizado];
    if(!regra)return vazio;
    if(!regra.ativo)return {proximoFollowUp:null,proximaAcao:'—',prioridade:'—'};

    const textoData=String(ultimaInteracao||'').trim();
    const iso=textoData.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    const br=textoData.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if(!iso&&!br)return vazio;
    const ano=Number(iso?iso[1]:(br[3].length===2?'20'+br[3]:br[3]));
    const mes=Number(iso?iso[2]:br[2]);
    const dia=Number(iso?iso[3]:br[1]);
    const ultima=new Date(ano,mes-1,dia);
    if(ultima.getFullYear()!==ano||ultima.getMonth()!==mes-1||ultima.getDate()!==dia)return vazio;

    const hojeFonte=hojeOpcional instanceof Date?hojeOpcional:(hojeOpcional?pd(String(hojeOpcional)):new Date());
    if(!hojeFonte||isNaN(hojeFonte.getTime()))return vazio;
    const hoje=new Date(hojeFonte.getFullYear(),hojeFonte.getMonth(),hojeFonte.getDate());
    const proximo=regra.tipo==='corridos'
      ? new Date(ultima.getFullYear(),ultima.getMonth(),ultima.getDate()+regra.dias)
      : adicionarDiasUteisVisual(ultima,regra.dias);
    const atrasoDias=Math.floor((hoje.getTime()-proximo.getTime())/86400000);

    return {
      proximoFollowUp:proximo,
      proximaAcao:atrasoDias>=0?'FOLLOW-UP':'AGUARDAR',
      prioridade:atrasoDias>2?'CRÍTICO':atrasoDias>=0?'ALTA':atrasoDias>=-2?'MÉDIA':'BAIXA'
    };
  }

  function calcularMotorVisualLead(lead,hojeOpcional){
    const semAcao={proximoFollowUp:null,proximaAcao:'—',prioridade:'—'};
    const ultimaInteracao=lead&&lead.ultima;
    const candidatos=getLeadNegocios(lead)
      .map(negocio=>calcularMotorVisualNegocio(negocio.status,ultimaInteracao,hojeOpcional))
      .filter(motor=>motor.proximoFollowUp instanceof Date);
    if(!candidatos.length)return semAcao;
    return candidatos.reduce((maisUrgente,motor)=>{
      const prioridadeAtual=prioridadeRank(motor.prioridade);
      const prioridadeMaisUrgente=prioridadeRank(maisUrgente.prioridade);
      if(prioridadeAtual<prioridadeMaisUrgente)return motor;
      if(prioridadeAtual>prioridadeMaisUrgente)return maisUrgente;
      return motor.proximoFollowUp.getTime()<maisUrgente.proximoFollowUp.getTime()
        ?motor
        :maisUrgente;
    });
  }

  function recalcularMotorVisualLeads(){
    leads.forEach(lead=>{
      const motorVisual=calcularMotorVisualLead(lead);
      lead.proximoFollowUpVisual=motorVisual.proximoFollowUp;
      lead.proximaAcaoVisual=motorVisual.proximaAcao;
      lead.prioridadeVisual=motorVisual.prioridade;
    });
    kpis();microFunnel();charts();filters();tbl();
  }

  function x(s){if(s===null||s===undefined)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  function normalizePhoneBR(value){
    let digits=String(value||'').replace(/\D/g,'');
    if((digits.length===10||digits.length===11)&&!digits.startsWith('55'))digits='55'+digits;
    if(digits.startsWith('55')&&(digits.length===12||digits.length===13))return digits;
    return '';
  }

  function maskPhoneBR(value){
    let digits=String(value||'').replace(/\D/g,'');
    if(digits.startsWith('55')&&(digits.length===12||digits.length===13))digits=digits.slice(2);
    if(digits.length===11)return '('+digits.slice(0,2)+') '+digits.slice(2,7)+'-'+digits.slice(7);
    if(digits.length===10)return '('+digits.slice(0,2)+') '+digits.slice(2,6)+'-'+digits.slice(6);
    return value||'';
  }

  function formatPhoneLiteBR(value){
    let digits=String(value||'').replace(/\D/g,'');
    if(digits.startsWith('55')&&(digits.length===12||digits.length===13))digits=digits.slice(2);
    digits=digits.slice(0,11);

    if(digits.length<=2)return digits;

    const ddd=digits.slice(0,2);
    const rest=digits.slice(2);
    const firstSize=digits.length>10?5:4;
    const first=rest.slice(0,firstSize);
    const second=rest.slice(firstSize,firstSize+4);

    return [ddd,first,second].filter(Boolean).join(' ');
  }

  function periodLabel(value){
    return {month:'Mês atual',quarter:'Últimos 90 dias',semester:'Semestre',year:'Ano atual','2025':'2025','2024':'2024',all:'Total'}[value]||'Mês atual';
  }

  function getPeriodRange(period,referenceDate){
    const now=referenceDate instanceof Date?referenceDate:new Date();
    const year=now.getFullYear(),month=now.getMonth();
    const todayEnd=new Date(year,month,now.getDate(),23,59,59,999);
    if(period==='all')return {start:null,end:null};
    if(period==='month')return {start:new Date(year,month,1),end:todayEnd};
    if(period==='quarter')return {start:new Date(year,month,now.getDate()-89),end:todayEnd};
    if(period==='semester')return {start:new Date(year,Math.floor(month/6)*6,1),end:todayEnd};
    if(period==='year')return {start:new Date(year,0,1),end:todayEnd};
    if(period==='2025'||period==='2024'){
      const selectedYear=Number(period);
      return {start:new Date(selectedYear,0,1),end:new Date(selectedYear,11,31,23,59,59,999)};
    }
    return null;
  }

  function inPeriod(date,period){
    const range=getPeriodRange(period);
    if(!range)return false;
    if(range.start===null&&range.end===null)return true;
    if(!(date instanceof Date)||isNaN(date.getTime()))return false;
    return date>=range.start&&date<=range.end;
  }

  function commercialDate(l){
    return pd(l.ultima);
  }

  function getPeriodLeads(){
    const periodEl=document.getElementById('kPeriod');
    const period=periodEl?periodEl.value:'all';
    return leads.filter(l=>inPeriod(commercialDate(l),period));
  }

  function hasFollowAction(l){
    return norm(l.proximaAcaoVisual).includes('follow');
  }

  function isPriorityAction(l){
    return ['critico','alta'].includes(norm(l.prioridadeVisual));
  }

  function priorityVisualClass(l){
    const prioridade=norm(l.prioridadeVisual);
    return prioridade==='media'||prioridade==='mdia'?' priority-media':prioridade==='alta'?' priority-alta':prioridade==='critico'||prioridade==='crtico'?' priority-critico':'';
  }

  // ============================================================
  // DATA NORMALIZATION
  // ============================================================
  function proc(rows,H){
    const C={
      id:         fc(H,'ID','Id','id'),
      leadKey:    fc(H,'Lead Key','lead_key'),
      contato:    fc(H,'Nome','nome'),
      empresa:    fc(H,'Empresa','empresa'),
      cargo:      fc(H,'Cargo','cargo'),
      endereco:   fc(H,'Endereço','Endereco','endereco'),
      cidade:     fc(H,'Cidade','cidade'),
      uf:         fc(H,'UF','uf'),
      celular:    fc(H,'contato','Contato','lead_celular'),
      email:      fc(H,'email','E-mail','lead_email'),
      setor:      fc(H,'Setor','setor'),
      acesso:     fc(H,'Acesso Rápido','Acesso Rapido'),
      origemLead: fc(H,'Origem do Lead','Origem Lead','origem_lead'),
      statusb:    fc(H,'Status','status'),
      categoria:  fc(H,'categoria','Categoria'),
      produtoServico: fc(H,'produto_servico','Produto / Serviço','Produto/Servico'),
      tipoNegocio: fc(H,'tipo_negocio','Tipo do negócio','Tipo do negocio'),
      colaboradores: fc(H,'Colaboradores','colaboradores'),
      faturamentoAnual: fc(H,'Faturamento Anual','faturamento_anual'),
      obs:        fc(H,'Observações Estratégicas','Observacoes Estrategicas','observacoes_estrategicas'),
      ultima:     fc(H,'Última Interação','Ultima Interacao','ultima_interacao_em'),
      diagnostico:fc(H,'Diagnóstico Enviado','Diagnostico Enviado'),
      prioridade: fc(H,'Prioridade','prioridade'),
      acao:       fc(H,'Próxima Ação','Proxima Acao','Ação','Acao','proxima_acao'),
    };
    leads=rows.map(r=>{
      const lead=Object.fromEntries(Object.entries(C).map(([k,col])=>{
      if(!col) return [k,''];
      let v=(r[col]||'').toString().trim();
      if(v && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(v)){
        try{ const d=new Date(v); if(!isNaN(d)) v=formatDateBR(d.toISOString()); }catch(e){}
      }
      if(k==='ultima' && v){
        v=formatDateBR(v);
      }
      v=v.replace(/(\d{1,2}\/\d{1,2}\/)2(\d{4})/g,'$1$2');
      v=v.replace(/(\d{1,2}\/\d{1,2}\/\d{4})\d+/g,'$1');
      if(k==='ultima' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)){
        v=formatDateBR(v);
      }
      return [k,v];
      }));
      lead.__raw=r;
      lead.negocios=Array.isArray(r.negocios)?r.negocios:[];
      lead.email=String(getLeadValue(lead,'email','E-mail','lead_email')||'').trim();
      return lead;
    }).filter(l=>l.empresa&&l.empresa.toLowerCase()!=='empresa'&&l.empresa.trim()!=='')
    .map(l=>{
      const statusb=displayStatus(l.statusb);
      const ultima=formatDateYY(l.ultima);
      const motorVisual=calcularMotorVisualLead(l);
      return {
        ...l,
        statusb,
        ultima,
        proximoFollowUpVisual: motorVisual.proximoFollowUp,
        proximaAcaoVisual: motorVisual.proximaAcao,
        prioridadeVisual: motorVisual.prioridade,
      };
    });
    kpis();microFunnel();charts();filters();tbl();
  }

  // Recursos compartilhados de relacionamento e apresentação.

  function formatDateFullBR(value){
    if(!value)return '';
    const s=String(value).trim();
    const br=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if(br){
      const year=br[3].length===2?'20'+br[3]:br[3];
      return br[1].padStart(2,'0')+'/'+br[2].padStart(2,'0')+'/'+year;
    }
    const iso=s.split('T')[0];
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso)){
      const[y,m,d]=iso.split('-');
      return d+'/'+m+'/'+y;
    }
    const date=new Date(s);
    if(!isNaN(date.getTime()))return date.toLocaleDateString('pt-BR');
    return s;
  }

  function getOperationalLeadForIntelligence(row){
    const leadKey=row&&row.leadKey!==undefined&&row.leadKey!==null?String(row.leadKey).trim().toLowerCase():'';
    if(!leadKey)return null;
    return leads.find(lead=>{
      const current=getLeadValue(lead,'leadKey','Lead Key','lead_key');
      return current&&String(current).trim().toLowerCase()===leadKey;
    })||null;
  }

  function safeHttpUrl(value){
    try{
      const url=new URL(String(value||'').trim());
      return url.protocol==='http:'||url.protocol==='https:'?url.href:'';
    }catch(e){
      return '';
    }
  }

  function deriveCorporateSiteFromEmail(email){
    const normalized=String(email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return '';
    const domain=normalized.split('@')[1];
    if(!domain||PERSONAL_EMAIL_DOMAINS.has(domain)||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain))return '';
    return safeHttpUrl(`https://${domain}`);
  }

  function syncCommercialObservationFieldWithCanonical(lead,leadKey){
    const field=document.getElementById('eObs');
    if(!field||!lead||!isSameIntelligenceLead(lead,leadKey))return;
    const canonical=String(lead.obs||'');
    if(!commercialModalSnapshot){
      field.value=canonical;
      return;
    }
    try{
      const snapshot=JSON.parse(commercialModalSnapshot);
      if(field.value===String(snapshot.obs||'')&&field.value!==canonical){
        field.value=canonical;
        snapshot.obs=canonical;
        commercialModalSnapshot=JSON.stringify(snapshot);
      }
    }catch(e){}
  }
  function isSameIntelligenceLead(lead,leadKey){
    const current=getLeadValue(lead,'leadKey','Lead Key','lead_key');
    return Boolean(current&&String(current).trim()===String(leadKey||'').trim());
  }
  function syncCommercialModalObservation(leadKey,value){
    if(!currentLead||!isSameIntelligenceLead(currentLead,leadKey))return;
    currentLead.obs=value;
    const managementModal=document.getElementById('msk');
    if(!managementModal||!managementModal.classList.contains('open'))return;
    const field=document.getElementById('eObs');
    if(field)field.value=value;
    if(!commercialModalSnapshot)return;
    try{
      const snapshot=JSON.parse(commercialModalSnapshot);
      snapshot.obs=value;
      commercialModalSnapshot=JSON.stringify(snapshot);
    }catch(e){}
  }

  // ============================================================
  // KPI
  // ============================================================
  function kpis(){
    const periodEl=document.getElementById('kPeriod');
    const period=periodEl?periodEl.value:'all';
    const oportunidadesAtuais=getOportunidadesComerciais(leads);
    const oportunidadesPeriodo=getOportunidadesComerciais(leads,period);
    const convertidosPeriodo=oportunidadesPeriodo.filter(item=>isConvertedStatus(item.status));
    const contratos=oportunidadesAtuais.filter(item=>
      isClosedStatus(item.status)&&norm(item.negocio.tipo_negocio)==='recorrente'
    );
    const propostas=oportunidadesAtuais.filter(item=>norm(item.status)==='proposta');
    const pontuaisConvertidas=oportunidadesPeriodo.filter(item=>
      isConvertedStatus(item.status)&&norm(item.negocio.tipo_negocio)==='pontual'
    );
    const receitaPontual=pontuaisConvertidas
      .reduce((sum,item)=>sum+safeMoney(item.negocio.valor_proposta),0);
    const movimentados=oportunidadesPeriodo.filter(item=>item.status&&norm(item.status)!=='novo'&&!isEndedStatus(item.status));
    const tx=movimentados.length?Math.round((convertidosPeriodo.length/movimentados.length)*100):0;
    const pipelineProposta=propostas.reduce((sum,item)=>sum+safeMoney(item.negocio.valor_proposta),0);
    const contratosAtivos=contratos.reduce((sum,item)=>sum+safeMoney(item.negocio.valor_proposta),0);
    const prioritarias=leads.filter(isPriorityAction);
    const followups=leads.filter(hasFollowAction);
    const interacoesRealizadas=leads.filter(l=>{
      const d=pd(l.ultima);
      return d&&inPeriod(d,period);
    });
    const maturacao=oportunidadesAtuais.filter(item=>norm(item.status)==='em maturacao').length;
    document.getElementById('kContratos').textContent=formatMoneyBR(contratosAtivos).replace(/^R\$\s*/,'');
    document.getElementById('kPipeline').textContent=formatMoneyBR(pipelineProposta).replace(/^R\$\s*/,'');
    document.getElementById('kReceita').textContent=formatMoneyBR(receitaPontual).replace(/^R\$\s*/,'');
    document.getElementById('kT').textContent=tx+'%';
    document.getElementById('kF').textContent=followups.length;
    document.getElementById('kVencidos').textContent=interacoesRealizadas.length;
    document.getElementById('kBadgeContratos').textContent=contratos.length+' ativos';
    document.getElementById('kBadge1').textContent=propostas.length+' propostas';
    document.getElementById('kBadgeConv').textContent=convertidosPeriodo.length+' de '+movimentados.length+' movimentadas';
    document.getElementById('kBadge2').textContent=pontuaisConvertidas.length+' convertidos';
    document.getElementById('kBadge3').textContent='Pendentes';
    document.getElementById('kBadgeVencidos').textContent='Concluídas';
  }

  function getFunnelPrioritizedCardIds(){
    try{
      const current=localStorage.getItem(FUNNEL_PRIORITIZED_STORAGE_KEY);
      if(current!==null){
        const stored=JSON.parse(current);
        return new Set(Array.isArray(stored)?stored.map(id=>String(id||'').trim()).filter(Boolean):[]);
      }
      const legacy=JSON.parse(localStorage.getItem(LEGACY_NOVO_PRIORITIZED_STORAGE_KEY));
      const migrated=new Set((Array.isArray(legacy)?legacy:[])
        .map(id=>String(id||'').trim())
        .filter(Boolean)
        .map(id=>'lead:'+id));
      localStorage.setItem(FUNNEL_PRIORITIZED_STORAGE_KEY,JSON.stringify([...migrated]));
      return migrated;
    }catch(e){return new Set();}
  }
  function saveFunnelPrioritizedCardIds(ids){
    try{localStorage.setItem(FUNNEL_PRIORITIZED_STORAGE_KEY,JSON.stringify([...ids]));}catch(e){}
  }
  function setFunnelCardPrioritized(cardId,prioritized){
    const ids=getFunnelPrioritizedCardIds();
    if(prioritized)ids.add(cardId);else ids.delete(cardId);
    saveFunnelPrioritizedCardIds(ids);
  }
  function funnelCardPriorityId(item){
    const negocioId=String(item&&item.negocio_id||'').trim();
    if(item&&item.negocio)return negocioId?'business:'+negocioId:'';
    const leadId=String(getLeadValue(item&&item.lead,'id','ID','Id')||'').trim();
    return leadId?'lead:'+leadId:'';
  }
  function isFunnelCategoryAccentEnabled(){
    try{return localStorage.getItem(FUNNEL_CATEGORY_ACCENT_STORAGE_KEY)!=='false';}catch(e){return true;}
  }
  function setFunnelCategoryAccentEnabled(enabled){
    try{localStorage.setItem(FUNNEL_CATEGORY_ACCENT_STORAGE_KEY,enabled?'true':'false');}catch(e){}
  }
  function funnelCategoryAccentClass(item,enabled){
    if(!enabled||!item||!item.negocio)return '';
    const category=String(item.negocio.categoria||'').trim();
    const index=Object.keys(BUSINESS_PRODUCTS_BY_CATEGORY).indexOf(category);
    if(index<0)return '';
    return ' mfunnel-category-accent mfunnel-category-'+FUNNEL_CATEGORY_ACCENT_CLASSES[index%FUNNEL_CATEGORY_ACCENT_CLASSES.length];
  }
  function closeFunnelPriorityMenu(){
    const menu=document.getElementById('funnelPriorityMenu');
    if(!menu)return;
    if(menu.cleanup)menu.cleanup();
    menu.remove();
  }
  function openFunnelPriorityMenu(event,cardId,prioritized){
    closeFunnelPriorityMenu();
    const menu=document.createElement('div');
    menu.id='funnelPriorityMenu';
    menu.className='mfunnel-priority-menu';
    const priorityAction=document.createElement('button');
    priorityAction.type='button';
    priorityAction.textContent=prioritized?'Remover prioridade':'Priorizar';
    priorityAction.addEventListener('click',()=>{
      setFunnelCardPrioritized(cardId,!prioritized);
      closeFunnelPriorityMenu();
      microFunnel();
    });
    const separator=document.createElement('div');
    separator.className='mfunnel-priority-menu-separator';
    separator.setAttribute('aria-hidden','true');
    const accentEnabled=isFunnelCategoryAccentEnabled();
    const accentAction=document.createElement('button');
    accentAction.type='button';
    accentAction.textContent=accentEnabled?'Desabilitar destaque':'Habilitar destaque';
    accentAction.addEventListener('click',()=>{
      setFunnelCategoryAccentEnabled(!accentEnabled);
      closeFunnelPriorityMenu();
      microFunnel();
    });
    menu.append(priorityAction,separator,accentAction);
    document.body.appendChild(menu);
    const rect=menu.getBoundingClientRect();
    const left=Math.max(8,Math.min(event.clientX,window.innerWidth-rect.width-8));
    const top=Math.max(8,Math.min(event.clientY,window.innerHeight-rect.height-8));
    menu.style.left=left+'px';
    menu.style.top=top+'px';
    const outsideClick=click=>{if(!menu.contains(click.target))closeFunnelPriorityMenu();};
    const escape=key=>{if(key.key==='Escape')closeFunnelPriorityMenu();};
    menu.cleanup=()=>{
      document.removeEventListener('click',outsideClick);
      document.removeEventListener('keydown',escape);
    };
    document.addEventListener('click',outsideClick);
    document.addEventListener('keydown',escape);
  }
  function projetarItensComerciaisFunil(leadsOrigem){
    const itens=[];
    (Array.isArray(leadsOrigem)?leadsOrigem:[]).forEach(lead=>{
      const leadKey=String(getLeadValue(lead,'leadKey','Lead Key','lead_key')||'').trim();
      const negocios=getLeadNegocios(lead);
      if(!negocios.length){
        itens.push({tipo:'lead',lead,lead_key:leadKey,negocio_id:null,status:'Novo'});
        return;
      }
      negocios.forEach(negocio=>{
        const negocioId=String(negocio&&negocio.negocio_id||'').trim();
        itens.push({
          tipo:'oportunidade',
          lead,
          lead_key:leadKey,
          negocio_id:negocioId,
          negocio,
          status:displayStatus(negocio.status)
        });
      });
    });
    return itens;
  }

  function getOportunidadesComerciais(leadsOrigem,period){
    return projetarItensComerciaisFunil(leadsOrigem).filter(item=>{
      if(item.tipo!=='oportunidade')return false;
      if(!period)return true;
      const data=pd(item.negocio.proposta_em);
      return inPeriod(data,period);
    });
  }

  function projetarItensBaseOperacional(leadsOrigem){
    const itens=[];
    (Array.isArray(leadsOrigem)?leadsOrigem:[]).forEach(lead=>{
      const leadKey=String(getLeadValue(lead,'leadKey','Lead Key','lead_key')||'').trim();
      getLeadNegocios(lead).forEach(negocio=>{
        const status=displayStatus(negocio.status);
        if(!['fechado','encerrado','inativo'].includes(norm(status)))return;
        itens.push({
          tipo:'oportunidade',
          lead,
          lead_key:leadKey,
          negocio_id:String(negocio&&negocio.negocio_id||'').trim(),
          negocio,
          status
        });
      });
    });
    return itens;
  }

  function presentationTimestamp(item){
    const proposta=pd(item&&item.negocio&&item.negocio.proposta_em);
    const data=proposta||pd(item&&item.lead&&item.lead.ultima);
    return data&&Number.isFinite(data.getTime())?data.getTime():null;
  }

  function sortByPresentationDateDescending(items){
    return [...items].sort((a,b)=>{
      const at=presentationTimestamp(a);
      const bt=presentationTimestamp(b);
      if(at===null)return bt===null?0:1;
      if(bt===null)return -1;
      return bt-at;
    });
  }

  function microFunnel(){
    const root=document.getElementById('microFunnel');
    if(!root)return;
    closeFunnelPriorityMenu();
    const periodItems=projetarItensComerciaisFunil(leads);
    const search=(document.getElementById('fQ').value||'').toLowerCase();
    const status=getFilterValues('fStatus');
    const priority=getFilterValues('fPr');
    const nextAction=getFilterValues('fAc');
    const funnelItems=periodItems.filter(item=>{
      const l=item.lead;
      if(search&&!String(l.empresa||'').toLowerCase().includes(search)&&!String(l.contato||'').toLowerCase().includes(search))return false;
      if(status.length&&!status.some(value=>norm(item.status)===norm(value)))return false;
      if(priority.length&&!priority.includes(l.prioridadeVisual))return false;
      if(nextAction.length&&!nextAction.some(value=>String(l.proximaAcaoVisual||'').toUpperCase().includes(value)))return false;
      return true;
    });
    const etapas=['Novo','Qualificado','Proposta','Em maturação'];
    const etapaTitulos={
      'Novo':'NOVO',
      'Qualificado':'QUALIFICADO',
      'Proposta':'PROPOSTA',
      'Em maturação':'MATURAÇÃO'
    };
    function funnelMeta(item,etapa){
      const lead=item.lead;
      const diagnostic=flowModules?flowModules.funnelSignal(lead):'';
      const followUp=hasFollowAction(lead)
        ?FUNNEL_PHONE_SVG
        :'';
      const n=norm(etapa);
      const value=n==='proposta'
        ?String(item.negocio&&item.negocio.valor_proposta||'').replace(/^R\$\s*/,'')
        :'';
      return [diagnostic,followUp,value].filter(hasValue);
    }
    const prioritizedCardIds=getFunnelPrioritizedCardIds();
    const categoryAccentEnabled=isFunnelCategoryAccentEnabled();
    root.innerHTML=etapas.map(etapa=>{
      const items=sortByPresentationDateDescending(funnelItems.filter(item=>norm(item.status)===norm(etapa)));
      const body=items.length?items.map(item=>{
        const l=item.lead;
        const originalIndex=leads.indexOf(l);
        const cardPriorityId=funnelCardPriorityId(item);
        const isPrioritized=prioritizedCardIds.has(cardPriorityId);
        const categoryAccentClass=funnelCategoryAccentClass(item,categoryAccentEnabled);
        const meta=funnelMeta(item,etapa).map(v=>v.startsWith('<svg')?`<span class="mfunnel-signal${v.includes('mfunnel-followup-icon')?' mfunnel-followup':''}">${v}</span>`:`<span>${x(v)}</span>`).join('');
        const priorityClass=priorityVisualClass(l);
        return `<button class="mfunnel-item${priorityClass}${categoryAccentClass}${isPrioritized?' mfunnel-item-prioritized':''}" type="button" data-lead-index="${originalIndex}" data-lead-key="${x(item.lead_key)}" data-negocio-id="${x(item.negocio_id||'')}" data-card-priority-id="${x(cardPriorityId)}">
          <span class="mfunnel-company">${x(l.empresa)||'-'}</span>
          ${meta?`<span class="mfunnel-meta">${meta}</span>`:''}
        </button>`;
      }).join(''):'<div class="mfunnel-empty">Sem leads</div>';

      return `<div class="mfunnel-col">
        <div class="mfunnel-col-head">
          <span>${etapaTitulos[etapa]||etapa} · <strong>${items.length}</strong></span>
        </div>
        <div class="mfunnel-list">${body}</div>
      </div>`;
    }).join('');

    root.querySelectorAll('.mfunnel-item[data-lead-index]').forEach(item=>{
      item.addEventListener('click',()=>{
        const index=Number(item.dataset.leadIndex);
        if(!Number.isNaN(index)&&leads[index]){
          om(leads[index],item.dataset.negocioId||undefined);
        }
      });
      item.addEventListener('contextmenu',event=>{
        const cardPriorityId=String(item.dataset.cardPriorityId||'').trim();
        if(!cardPriorityId)return;
        event.preventDefault();
        openFunnelPriorityMenu(event,cardPriorityId,prioritizedCardIds.has(cardPriorityId));
      });
    });
  }

  // ============================================================
  // CHARTS
  // ============================================================
  function charts(){
    Object.values(ch).forEach(c=>c.destroy());ch={};
    Chart.defaults.color='#8E8E93';Chart.defaults.borderColor='#E5E5EA';
    Chart.defaults.font.family="'Inter',sans-serif";

    const chartOportunidades=getOportunidadesComerciais(leads).filter(item=>
      ['qualificado','proposta','fechado'].includes(norm(item.status))
    );
    const sc={};
    chartOportunidades.forEach(item=>{if(item.status)sc[item.status]=(sc[item.status]||0)+1;});
    const statusOrder=['Qualificado','Proposta','Em maturação','Fechado','Inativo','Encerrado'];
    function statusColor(s){
      const ns=norm(s);
      if(ns==='novo')return '#FFE5D6';
      if(ns==='qualificado')return '#FDBA74';
      if(ns==='proposta')return '#FF8A3D';
      if(ns==='em maturacao')return '#FF5A00';
      if(ns==='fechado')return '#CC4A00';
      if(ns==='encerrado')return '#8E8E93';
      return '#FF5A00';
    }
    const ss=statusOrder.filter(status=>['qualificado','proposta','fechado'].includes(norm(status))).map(status=>[status,sc[status]||0]);
    ch.s=new Chart(document.getElementById('cS'),{type:'bar',
      data:{labels:ss.map(s=>s[0]),datasets:[{data:ss.map(s=>s[1]),backgroundColor:ss.map(s=>statusColor(s[0])),borderRadius:6,borderSkipped:false}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>`${context.label}: ${context.raw}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:9},color:'#8E8E93',maxRotation:0,minRotation:0}},y:{display:false,grid:{display:false},ticks:{display:false},border:{display:false}}}}
    });

    const chartLeads=leads;
    const pc={};chartLeads.forEach(l=>{
      const prioridade=norm(l.prioridadeVisual);
      if(['media','alta','critico'].includes(prioridade))pc[prioridade]=(pc[prioridade]||0)+1;
    });
    const priorityColors={critico:'#CC4A00',crtico:'#CC4A00',alta:'#FF5A00',media:'#FDBA74',mdia:'#FDBA74',baixa:'#FFE5D6'};
    const priorityOrder=[['Média','media'],['Alta','alta'],['Crítico','critico']];
    ch.p=new Chart(document.getElementById('cP'),{type:'bar',
      data:{labels:priorityOrder.map(item=>item[0]),datasets:[{data:priorityOrder.map(item=>pc[item[1]]||0),backgroundColor:priorityOrder.map(item=>priorityColors[item[1]]),borderRadius:6,borderSkipped:false}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>`${context.label}: ${context.raw}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:9},color:'#8E8E93',maxRotation:0,minRotation:0}},y:{display:false,grid:{display:false},ticks:{display:false},border:{display:false}}}}
    });

  }

  // ============================================================
  // FILTERS
  // ============================================================
  function filters(){
    if(!filtersBound){
      ['fQ','fStatus','fPr','fAc'].forEach(id=>{
        const el=document.getElementById(id);
        if(!el)return;
        el.addEventListener('input',tbl);
      });
      const search=document.getElementById('fQ');
      const clear=document.getElementById('clearSearch');
      if(search&&clear){
        search.addEventListener('input',syncSearchClear);
        clear.addEventListener('click',()=>{
          search.value='';
          if(viewMode==='intelligence'){
            if(flowModules)flowModules.clearSearch();
          }else{
            tbl();
            microFunnel();
          }
          syncSearchClear();
          search.focus();
        });
        syncSearchClear();
      }
      const periodEl=document.getElementById('kPeriod');
      if(periodEl)periodEl.addEventListener('input',()=>{
        kpis();
        if(viewMode==='intelligence'&&flowModules)flowModules.renderIntelligenceView();
      });
      ['fQ','fPr','fAc','fStatus'].forEach(id=>{
        const el=document.getElementById(id);
        if(!el)return;
        el.addEventListener('input',microFunnel);
      });
      filtersBound = true;
    }
  }

  // ============================================================
  // TABLE
  // ============================================================
  function srt(k){sa=sk===k?!sa:true;sk=k;tbl();}
  function tbl(){
    const q=document.getElementById('fQ').value.toLowerCase();
    const fStatus=getFilterValues('fStatus'),fP=getFilterValues('fPr');
    const fA=getFilterValues('fAc');
    const statusBase=fStatus.length?fStatus:['Fechado'];
    let list=projetarItensBaseOperacional(leads).filter(item=>{
      const l=item.lead;
      if(!statusBase.some(value=>norm(value)===norm(item.status)))return false;
      if(q&&!l.empresa.toLowerCase().includes(q)&&!l.contato.toLowerCase().includes(q))return false;
      if(fP.length&&!fP.includes(l.prioridadeVisual))return false;
      if(fA.length&&!fA.some(value=>String(l.proximaAcaoVisual||'').toUpperCase().includes(value)))return false;
      return true;
    });
    if(sk){
      list=[...list].sort((a,b)=>{
        const al=a.lead,bl=b.lead;
        const sr=statusOperationalRank(a.status)-statusOperationalRank(b.status);
        if(sr)return sr;
        if(sk==='statusb'){
          const va=statusOperationalRank(a.status),vb=statusOperationalRank(b.status);
          return sa?va-vb:vb-va;
        }
        if(sk==='valorProposta'){
          const va=safeMoney(a.negocio&&a.negocio.valor_proposta),vb=safeMoney(b.negocio&&b.negocio.valor_proposta);
          return sa?va-vb:vb-va;
        }
        const visualSortKey=sk==='prioridade'?'prioridadeVisual':sk==='acao'?'proximaAcaoVisual':sk;
        if(visualSortKey==='proximoFollowUpVisual'){
          const va=al[visualSortKey]?pd(al[visualSortKey].toISOString?formatDateFullBR(al[visualSortKey]):al[visualSortKey]):null;
          const vb=bl[visualSortKey]?pd(bl[visualSortKey].toISOString?formatDateFullBR(bl[visualSortKey]):bl[visualSortKey]):null;
          const ta=va?va.getTime():0,tb=vb?vb.getTime():0;
          return sa?ta-tb:tb-ta;
        }
        let va=al[visualSortKey]||'',vb=bl[visualSortKey]||'';
        return sa?va.localeCompare(vb,'pt'):vb.localeCompare(va,'pt');
      });
    }else{
      list=sortByPresentationDateDescending(list);
    }
    const operationalContext=document.getElementById('operationalContext');
    if(operationalContext)operationalContext.textContent=list.length+' registro'+(list.length!==1?'s':'')+' · '+ultimaAtualizacaoHora;
    const tb=document.getElementById('tb');
    if(!list.length){tb.innerHTML='<tr><td colspan="6"><div class="empt"><span>🔍</span>Nenhum resultado com os filtros aplicados.</div></td></tr>';return;}
    const inicioValido=value=>{
      const raw=String(value||'').trim();
      const br=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(!br&&!iso)return null;
      const dia=Number(br?br[1]:iso[3]);
      const mes=Number(br?br[2]:iso[2]);
      const ano=Number(br?(br[3].length===2?'20'+br[3]:br[3]):iso[1]);
      const data=pd(raw);
      return data&&data.getFullYear()===ano&&data.getMonth()===mes-1&&data.getDate()===dia?data:null;
    };
    const inicioFormatado=data=>data?String(data.getDate()).padStart(2,'0')+'/'+String(data.getMonth()+1).padStart(2,'0')+'/'+data.getFullYear():'—';
    const retencao=data=>{
      if(!data)return '—';
      const hoje=new Date();
      let meses=(hoje.getFullYear()-data.getFullYear())*12+hoje.getMonth()-data.getMonth();
      if(hoje.getDate()<data.getDate())meses--;
      meses=Math.max(0,meses);
      return meses+' '+(meses===1?'mês':'meses');
    };
    tb.innerHTML=list.map((item,index)=>{
      const l=item.lead;
      const negocio=item.negocio;
      const originalIndex=leads.indexOf(l);
      const isLost=isEndedStatus(item.status);
      const isFechado=isClosedStatus(item.status);
      const isConvertido=isConvertedStatus(item.status);
      const isGroupStart=index>0&&norm(item.status)!==norm(list[index-1].status);
      const trClass=[isFechado?'is-fechado':isLost?'is-closed':'',isGroupStart?'is-status-group-start':''].filter(Boolean).join(' ');
      const inicio=inicioValido(negocio&&negocio.proposta_em);
      const valor=negocio&&hasValue(negocio.valor_proposta)?formatMoneyBR(negocio.valor_proposta):'—';
      return`<tr class="${trClass}" data-lead-index="${originalIndex}" data-lead-key="${x(item.lead_key)}" data-negocio-id="${x(item.negocio_id||'')}">
        <td class="te">${x(l.empresa)}</td>
        <td class="tcn">${x(l.contato)||'—'}</td>
        <td>${item.status?`<span class="chip ${statusClass(item.status)}">${x(item.status)}</span>`:'—'}</td>
        <td>${x(valor)}</td>
        <td>${isConvertido?inicioFormatado(inicio):'—'}</td>
        <td>${isFechado&&norm(negocio&&negocio.tipo_negocio)==='recorrente'?retencao(inicio):'—'}</td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('tr[data-lead-index]').forEach(row=>{
      row.addEventListener('click',()=>{
        const index=Number(row.dataset.leadIndex);
        if(!Number.isNaN(index)&&leads[index]){
          om(leads[index],row.dataset.negocioId||undefined);
        }
      });
    });
  }

  // ============================================================
  // MODAL
  // ============================================================
  function renderCommercialModalIdentity(empresa,nome){
    const identity=[empresa,nome].filter(hasValue);
    document.getElementById('mEmp').innerHTML=identity.length
      ? identity.map((value,index)=>`<span class="${index===0?'m-company':'m-contact'}">${x(value)}</span>`).join('<span aria-hidden="true"> · </span>')
      : '—';
  }

  function om(l,negocioId){
    if(saveInProgress)return false;
    currentLead=l;
    resetarEstadoGestaoComercial();
    const empresa=getLeadValue(l,'empresa','Empresa');
    const nome=getLeadValue(l,'contato','Nome');
    const cargo=getLeadValue(l,'cargo','Cargo');
    const endereco=getLeadValue(l,'endereco','Endereço','Endereco');
    const cidade=getLeadValue(l,'cidade','Cidade');
    const uf=getLeadValue(l,'uf','UF');
    const celular=l.celular ?? '';
    const email=l.email ?? '';
    const colaboradores=getLeadValue(l,'colaboradores','Colaboradores');
    const setor=getLeadValue(l,'setor','Setor');
    renderCommercialModalIdentity(empresa,nome);
    const contexto=[cargo,setor,colaboradores].flatMap(valor=>String(valor||'').split('/').map(parte=>parte.trim()).filter(Boolean));
    document.getElementById('mSub').textContent=contexto.join(' · ');
    const whatsappNumber=normalizePhoneBR(celular);
    const whatsappChip=whatsappNumber?`<a class="chip cS m-access-chip m-action-chip" href="https://wa.me/${x(whatsappNumber)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:'';
    const acessoUrl=deriveCorporateSiteFromEmail(email);
    const acessoChip=acessoUrl?`<a class="chip cS m-access-chip m-action-chip" href="${x(acessoUrl)}" target="_blank" rel="noopener noreferrer">Acesso Rápido</a>`:'';
    renderMainQuickChips(l,{whatsappChip,acessoChip});
    document.getElementById('eNomeCompleto').value = nome || '';
    document.getElementById('eEmpresa').value = empresa || '';
    document.getElementById('eCargo').value = cargo || '';
    document.getElementById('eEndereco').value = endereco || '';
    document.getElementById('eCidade').value = cidade || '';
    document.getElementById('eUf').value = String(uf||'').trim().toUpperCase().slice(0,2);
    document.getElementById('eUltima').value = formatDateYY(l.ultima||'');
    document.getElementById('eObs').value = l.obs || '';
    syncObservacoesGestaoHeight();
    setEditIdentityOpen(false);
    atualizarSeletorNegocios(l,null,negocioId);
    const celularEl=document.getElementById('eCelular');
    const celularMasked=formatPhoneLiteBR(celular);
    celularEl.dataset.rawValue = celular || '';
    celularEl.dataset.maskedValue = celularMasked || '';
    celularEl.value = celularMasked || '';
    document.getElementById('eEmail').value = email || '';
    document.getElementById('saveStatus').textContent='';
    document.getElementById('saveStatus').className='save-status';
    document.getElementById('msk').classList.add('open');
    document.getElementById('mbox').scrollTop=0;
    captureCommercialModalSnapshot();
    if(DIAGNOSTICS_ENABLED)modulesReady.then(module=>module&&module.ensureLeadChips(l)).catch(()=>console.warn('[AFLOR intelligence chips] falhou'));
    return true;
  }

  function renderMainQuickChips(lead,parts){
    const email=getValidModalEmail(lead.email ?? '');
    const emailChip=email?`<a id="mEmailAction" class="chip cS m-access-chip m-action-chip" href="mailto:${x(email)}" aria-label="Enviar e-mail">E-mail</a>`:'';
    const leadId=String(getLeadValue(lead,'id','ID','Id')||'').trim();
    const aflowIaChip=leadId?`<button class="chip cS m-action-chip m-flow-ia" type="button" data-open-aflow-ia data-lead-id="${x(leadId)}" title="Abrir IA Flow com o contexto completo da oportunidade." aria-label="Abrir IA Flow com o contexto completo da oportunidade.">${FLOW_IA_SPARK_SVG}IA Flow</button>`:'';
    const diagnosticSignal=flowModules?flowModules.quickSignal(lead):'';
    const nextActionSignal=hasFollowAction(lead)
      ?`<button class="m-quick-signal m-next-action-signal${priorityVisualClass(lead)}" type="button" title="Fazer follow-up" aria-label="Fazer follow-up">${FUNNEL_PHONE_SVG}</button>`
      :'';
    const primaryChips=[aflowIaChip,parts.whatsappChip||'',emailChip].filter(Boolean).join('');
    const secondaryChips=[parts.acessoChip||'',diagnosticSignal,nextActionSignal].filter(Boolean).join('');
    const quickGroups=[
      primaryChips?`<div class="m-quick-group m-quick-group-primary">${primaryChips}</div>`:'',
      secondaryChips?`<div class="m-quick-group m-quick-group-secondary">${secondaryChips}</div>`:''
    ].filter(Boolean);
    const quick=document.getElementById('mQuick');
    quick.innerHTML=quickGroups.map((group,index)=>`${index?'<span class="m-quick-divider" aria-hidden="true"></span>':''}${group}`).join('');
    if(flowModules)flowModules.bindQuickSignals(quick,lead);
    quick.querySelectorAll('[data-open-aflow-ia]').forEach(button=>{
      button.addEventListener('click',()=>{
        openAflowIaContext({
          scope:'general',
          origin:'sidebar'
        });
      });
    });
  }

  const ZERO_BUSINESS_STATUS_OPTIONS=Object.freeze(['Novo','Qualificado','Encerrado']);
  const BUSINESS_STATUS_OPTIONS=Object.freeze(['Novo','Qualificado','Proposta','Em maturação','Fechado','Encerrado']);

  function serializeBusinessProducts(){
    const field=document.getElementById('eProdutoServico');
    return field?[...field.querySelectorAll('input:checked')].map(input=>input.value).join(';'):'';
  }

  function lerNegocioDosControles(){
    return {
      categoria:document.getElementById('eCategoria').value,
      produto_servico:serializeBusinessProducts(),
      tipo_negocio:document.getElementById('eTipoNegocio').value,
      status:document.getElementById('eStatus').value,
      valor_proposta:document.getElementById('eValorProposta').value,
      proposta_em:document.getElementById('eDataProposta').value
    };
  }

  function getCommercialModalSnapshot(){
    const value=id=>document.getElementById(id)?.value||'';
    return JSON.stringify({
      activeBusinessId,
      newBusinessDraft,
      nome:value('eNomeCompleto'), empresa:value('eEmpresa'), cargo:value('eCargo'),
      endereco:value('eEndereco'), cidade:value('eCidade'), uf:value('eUf'),
      celular:value('eCelular'), email:value('eEmail'), ultima:value('eUltima'),
      categoria:value('eCategoria'), produtoServico:serializeBusinessProducts(),
      tipoNegocio:value('eTipoNegocio'), status:value('eStatus'),
      valorProposta:value('eValorProposta'), propostaEm:value('eDataProposta'), obs:value('eObs')
    });
  }

  function hasCommercialModalChanges(){
    return Boolean(commercialModalSnapshot&&commercialModalSnapshot!==getCommercialModalSnapshot());
  }

  function captureCommercialModalSnapshot(){
    commercialModalSnapshot=getCommercialModalSnapshot();
    commercialModalDirty=false;
  }

  function syncNewBusinessDraftUi(){
    const toggle=document.getElementById('businessDraftToggle');
    const selector=document.getElementById('eNegocioAtivo');
    if(toggle){
      toggle.textContent=newBusinessDraft?'Cancelar':'+ Nova oportunidade';
      toggle.setAttribute('aria-pressed',String(newBusinessDraft));
    }
    if(selector)selector.disabled=newBusinessDraft;
    syncBusinessControlsState();
  }

  function resetarEstadoGestaoComercial(){
    activeBusinessId='';
    newBusinessDraft=false;
    previousActiveBusinessId='';
    businessDraftSnapshot=null;
    businessDraftPreviousDirty=false;
    const selector=document.getElementById('eNegocioAtivo');
    const field=document.getElementById('businessSelectorField');
    const state=document.getElementById('businessSelectorState');
    if(selector){
      selector.innerHTML='';
      selector.value='';
      selector.disabled=false;
      selector.hidden=true;
      selector.classList.remove('is-placeholder');
    }
    if(state){
      state.textContent='';
      state.hidden=true;
      state.classList.remove('is-empty');
    }
    if(field)field.hidden=true;
    aplicarNegocioNosControles(null);
    syncNewBusinessDraftUi();
  }

  function syncBusinessControlsState(){
    const semNegocioAtivo=!newBusinessDraft&&getLeadNegocios(currentLead).length>1&&!activeBusinessId;
    ['eCategoria','eTipoNegocio','eValorProposta','eDataProposta'].forEach(id=>{
      const campo=document.getElementById(id);
      if(campo)campo.disabled=semNegocioAtivo;
    });
    syncStatusOptions(document.getElementById('eStatus')?.value||'');
    const produtoTrigger=document.getElementById('eProdutoServicoTrigger');
    if(produtoTrigger&&semNegocioAtivo){
      produtoTrigger.disabled=true;
      document.getElementById('eProdutoServico')?.classList.remove('is-open');
    }
  }

  function toggleNewBusinessDraft(){
    if(!currentLead||saveInProgress)return false;
    const selector=document.getElementById('eNegocioAtivo');
    if(newBusinessDraft){
      const restaurarId=previousActiveBusinessId;
      const restaurarDados=businessDraftSnapshot;
      newBusinessDraft=false;
      previousActiveBusinessId='';
      businessDraftSnapshot=null;
      syncNewBusinessDraftUi();
      atualizarSeletorNegocios(currentLead,restaurarDados,restaurarId);
      if(!restaurarId&&restaurarDados)aplicarNegocioNosControles(restaurarDados);
      commercialModalDirty=hasCommercialModalChanges();
      businessDraftPreviousDirty=false;
      return true;
    }
    businessDraftSnapshot=lerNegocioDosControles();
    previousActiveBusinessId=activeBusinessId;
    businessDraftPreviousDirty=commercialModalDirty;
    newBusinessDraft=true;
    activeBusinessId='';
    if(selector)selector.value='';
    syncNewBusinessDraftUi();
    aplicarNegocioNosControles({
      categoria:'',
      produto_servico:'',
      tipo_negocio:'',
      status:'Novo',
      valor_proposta:'',
      proposta_em:''
    });
    commercialModalDirty=true;
    return true;
  }

  function updateBusinessProductTrigger(){
    const field=document.getElementById('eProdutoServico');
    const trigger=document.getElementById('eProdutoServicoTrigger');
    if(!field||!trigger)return;
    const selected=[...field.querySelectorAll('input:checked')].map(input=>input.value);
    trigger.textContent=!selected.length?'Selecione':selected.length===1?selected[0]:`${selected[0]} + ${selected.length-1}`;
  }

  function setBusinessProductOptions(category,serializedValue){
    const field=document.getElementById('eProdutoServico');
    if(!field)return;
    const trigger=document.getElementById('eProdutoServicoTrigger');
    const menu=document.getElementById('eProdutoServicoMenu');
    const options=BUSINESS_PRODUCTS_BY_CATEGORY[category]||[];
    const selected=new Set(String(serializedValue||'').split(';').map(value=>value.trim()).filter(value=>options.includes(value)));
    const disabled=!options.length;
    field.classList.toggle('is-disabled',disabled);
    field.classList.remove('is-open');
    trigger.disabled=disabled;
    trigger.setAttribute('aria-expanded','false');
    menu.innerHTML=options.map(value=>`<label><input type="checkbox" value="${x(value)}"${selected.has(value)?' checked':''}>${x(value)}</label>`).join('');
    field.dataset.serializedValue=serializeBusinessProducts();
    if(disabled)trigger.textContent='Selecione a categoria';
    else updateBusinessProductTrigger();
  }

  function getLeadNegocios(lead){
    return lead&&Array.isArray(lead.negocios)?lead.negocios:[];
  }

  function syncStatusOptions(selectedValue){
    const select=document.getElementById('eStatus');
    if(!select)return;
    const negocios=getLeadNegocios(currentLead);
    const negocioPersistido=activeBusinessId
      ?negocios.find(item=>String(item.negocio_id||'').trim()===String(activeBusinessId).trim())
      :null;
    const permiteInativo=!newBusinessDraft&&negocioPersistido&&
      ['fechado','inativo'].includes(norm(negocioPersistido.status));
    const options=newBusinessDraft?['Novo']:!negocios.length?ZERO_BUSINESS_STATUS_OPTIONS:permiteInativo?[...BUSINESS_STATUS_OPTIONS,'Inativo']:BUSINESS_STATUS_OPTIONS;
    const contextoEditavel=newBusinessDraft||Boolean(activeBusinessId)||!negocios.length;
    select.innerHTML=`<option value="">Selecione</option>${options.map(value=>`<option value="${x(value)}">${x(value)}</option>`).join('')}`;
    const selected=options.find(value=>norm(value)===norm(selectedValue));
    select.value=selected||(!negocios.length?'Novo':'');
    select.disabled=!contextoEditavel;
  }

  function atualizarSeletorNegocios(lead,negocioBase,selectedBusinessId){
    const negocios=getLeadNegocios(lead);
    const selector=document.getElementById('eNegocioAtivo');
    const field=document.getElementById('businessSelectorField');
    const state=document.getElementById('businessSelectorState');
    const selecionado=negocios.find(item=>
      String(item.negocio_id||'').trim()===String(selectedBusinessId||'').trim()
    )||null;
    field.hidden=false;
    if(negocios.length>1){
      state.hidden=true;
      selector.hidden=false;
      selector.innerHTML=`<option value="">Selecione a oportunidade</option>${negocios.map(negocio=>`<option value="${x(negocio.negocio_id||'')}">${x(negocio.negocio_id||'—')} · ${x(negocio.status||'—')}</option>`).join('')}`;
      activeBusinessId=selecionado?String(selecionado.negocio_id||'').trim():'';
      selector.value=activeBusinessId;
      selector.classList.toggle('is-placeholder',!activeBusinessId);
      aplicarNegocioNosControles(selecionado);
    }else{
      const negocioUnico=negocios[0]||null;
      activeBusinessId=negocioUnico?String(negocioUnico.negocio_id||'').trim():'';
      selector.hidden=true;
      selector.value='';
      selector.classList.remove('is-placeholder');
      state.hidden=false;
      state.textContent=negocioUnico
        ? `${negocioUnico.negocio_id||'—'} · ${negocioUnico.status||'—'}`
        : 'Adicione uma oportunidade';
      state.classList.toggle('is-empty',!negocioUnico);
      aplicarNegocioNosControles(negocioUnico);
    }
    syncNewBusinessDraftUi();
  }

  function aplicarNegocioNosControles(negocio){
    const categoria=negocio?.categoria||'';
    const produtoServico=negocio?.produto_servico||'';
    const tipoNegocio=negocio?.tipo_negocio||'';
    const categoriaEl=document.getElementById('eCategoria');
    categoriaEl.value=Object.prototype.hasOwnProperty.call(BUSINESS_PRODUCTS_BY_CATEGORY,categoria)?categoria:'';
    setBusinessProductOptions(categoriaEl.value,produtoServico);
    document.getElementById('eTipoNegocio').value=BUSINESS_TYPE_OPTIONS.includes(tipoNegocio)?tipoNegocio:'';
    const status=String(negocio?.status||(!newBusinessDraft&&!getLeadNegocios(currentLead).length?'Novo':'')||'').trim();
    syncStatusOptions(status?displayStatus(status):'');
    const valorProposta=negocio?.valor_proposta;
    document.getElementById('eValorProposta').value=valorProposta===undefined||valorProposta===null||String(valorProposta).trim()===''?'':formatMoneyBR(valorProposta);
    document.getElementById('eDataProposta').value=formatDateYY(negocio?.proposta_em||'');
  }

  function getValidModalEmail(value){
    const email=String(value??'').trim();
    if(!email||/^(?:—|-|null|undefined|n\/a|na)$/i.test(email))return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';
  }


  function refreshIntelligenceChipsForLead(lead){
    if(!lead||!currentLead||lead!==currentLead)return;
    const celular=lead.celular ?? '';
    const email=lead.email ?? '';
    const whatsappNumber=normalizePhoneBR(celular);
    const whatsappChip=whatsappNumber?`<a class="chip cS m-access-chip m-action-chip" href="https://wa.me/${x(whatsappNumber)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:'';
    const acessoUrl=deriveCorporateSiteFromEmail(email);
    const acessoChip=acessoUrl?`<a class="chip cS m-access-chip m-action-chip" href="${x(acessoUrl)}" target="_blank" rel="noopener noreferrer">Acesso Rápido</a>`:'';
    renderMainQuickChips(lead,{whatsappChip,acessoChip});
  }
  function onStatusChange(status){
    // Hook legado mantido por compatibilidade com versões anteriores.
  }

  function canCloseEditableModal(isDirty){
    return !isDirty||window.confirm('Há alterações não salvas. Deseja sair e descartá-las?');
  }

  function setEditIdentityOpen(isOpen){
    const toggle=document.getElementById('editIdentityToggle');
    const fields=document.getElementById('editIdentityFields');
    if(!toggle||!fields)return;
    fields.hidden=!isOpen;
    toggle.setAttribute('aria-expanded',isOpen?'true':'false');
    toggle.classList.toggle('is-open',isOpen);
  }

  function markEditableModalDirty(event,setDirty){
    const field=event.target;
    if(field&&field.matches('input, select, textarea')&&!field.disabled&&!field.readOnly)setDirty();
  }

  function syncCommercialModalDirty(event){
    const field=event.target;
    if(field&&field.matches('input, select, textarea')&&!field.disabled&&!field.readOnly){
      commercialModalDirty=hasCommercialModalChanges();
    }
  }

  function cm(){
    if(saveInProgress)return false;
    if(!canCloseEditableModal(commercialModalDirty))return false;
    document.getElementById('msk').classList.remove('open');
    currentLead=null;
    newBusinessDraft=false;
    previousActiveBusinessId='';
    businessDraftSnapshot=null;
    businessDraftPreviousDirty=false;
    commercialModalSnapshot='';
    syncNewBusinessDraftUi();
    commercialModalDirty=false;
    return true;
  }

  const commercialModal=document.getElementById('msk');
  if(commercialModal){
    commercialModal.addEventListener('input',syncCommercialModalDirty);
    commercialModal.addEventListener('change',syncCommercialModalDirty);
  }

  const editIdentityToggle=document.getElementById('editIdentityToggle');
  if(editIdentityToggle){
    editIdentityToggle.addEventListener('click',()=>{
      setEditIdentityOpen(editIdentityToggle.getAttribute('aria-expanded')!=='true');
    });
  }

  const aflowIaGeneral=document.getElementById('aflowIaGeneral');
  if(aflowIaGeneral){
    aflowIaGeneral.addEventListener('click',()=>openAflowIaContext({
      scope:'general',
      origin:'sidebar'
    }));
  }

  const newRecordModal=document.getElementById('newMsk');
  if(newRecordModal){
    newRecordModal.addEventListener('input',event=>markEditableModalDirty(event,()=>{newRecordDirty=true;}));
    newRecordModal.addEventListener('change',event=>markEditableModalDirty(event,()=>{newRecordDirty=true;}));
  }

  const baseSheetAction=document.getElementById('baseSheetAction');
  const importModal=document.getElementById('importMsk');
  const importClose=document.getElementById('importClose');
  const importProcess=document.getElementById('importProcess');
  if(baseSheetAction&&SUPABASE_IMPORT_ENABLED)baseSheetAction.addEventListener('click',event=>{event.preventDefault();openImportBase();});
  if(importClose)importClose.addEventListener('click',closeImportBase);
  if(importProcess)importProcess.addEventListener('click',processImportBase);
  if(importModal)importModal.addEventListener('click',event=>{if(event.target===importModal)closeImportBase();});

  function openFlowHelp(){
    const modal=document.getElementById('flowHelpModal');
    if(modal)modal.hidden=false;
  }

  function closeFlowHelp(){
    const modal=document.getElementById('flowHelpModal');
    if(modal)modal.hidden=true;
  }

  const flowHelpOpen=document.getElementById('flowHelpOpen');
  const flowHelpClose=document.getElementById('flowHelpClose');
  const flowHelpModal=document.getElementById('flowHelpModal');
  if(flowHelpOpen)flowHelpOpen.addEventListener('click',openFlowHelp);
  if(flowHelpClose)flowHelpClose.addEventListener('click',closeFlowHelp);
  if(flowHelpModal)flowHelpModal.addEventListener('click',e=>{if(e.target===flowHelpModal)closeFlowHelp();});

  const aflowIaReadyModal=document.getElementById('aflowIaReadyModal');
  const aflowIaCancel=document.getElementById('aflowIaCancel');
  const aflowIaCopyOpen=document.getElementById('aflowIaCopyOpen');
  if(aflowIaCancel)aflowIaCancel.addEventListener('click',closeAflowIaReadyModal);
  if(aflowIaCopyOpen)aflowIaCopyOpen.addEventListener('click',copyAndOpenAflowIa);
  if(aflowIaReadyModal)aflowIaReadyModal.addEventListener('click',e=>{if(e.target===aflowIaReadyModal)closeAflowIaReadyModal();});

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){
    cm();
    closeNewRecord();
    closeImportBase();
    if(flowModules)flowModules.handleEscape();
    closeCadencia();
    closeFlowHelp();
    closeAflowIaReadyModal();
  }});

  // Contratos chamados diretamente pelo HTML.
  window.loadData = loadData;
  window.saveEdit = saveEdit;
  window.openNewRecord = openNewRecord;
  window.closeNewRecord = closeNewRecord;
  window.createRecord = createRecord;
  window.srt = srt;
  window.cm = cm;
  window.setViewMode = setViewMode;
  window.openCadencia = openCadencia;
  window.closeCadencia = closeCadencia;
  window.saveCadencia = saveCadencia;


  // Ponte local e específica para Diagnósticos; o Core mantém API e relacionamentos.
  function syncCoreObservations(leadKey,value){
    leads.forEach(lead=>{
      if(isSameIntelligenceLead(lead,leadKey))lead.obs=value;
    });
    syncCommercialModalObservation(leadKey,value);
  }

  async function saveModuleObservations(id,key,savedText){
      const response=await fetchCrmJson({
        _action:'update',
        _id:id,
        lead_key:key,
        observacoesEstrategicas:savedText
      });
      if(!response||response.status!=='ok')throw new Error((response&&response.error)||'Não foi possível salvar as observações.');
  }

  async function mountFlowModules(){
    if(!DIAGNOSTICS_ENABLED)return null;
    const tab=document.querySelector('[data-view-mode="intelligence"]');
    if(tab)tab.disabled=true;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),FRONTEND_REQUEST_TIMEOUT_MS);
    const mounted=[];
    try{
      const markupUrl=new URL('modules.html',window.location.href);
      const scriptUrl=new URL('modules.js',window.location.href);
      if(markupUrl.origin!==window.location.origin||scriptUrl.origin!==window.location.origin)throw new Error('Origem inválida do módulo.');
      const response=await fetch(markupUrl.href,{mode:'same-origin',credentials:'same-origin',redirect:'error',signal:controller.signal});
      if(!response.ok)throw new Error('Não foi possível carregar Diagnósticos.');
      const markup=document.createElement('template');
      markup.innerHTML=await response.text();
      const fragments=Array.from(markup.content.querySelectorAll('template[data-flow-module-target]'));
      const targets=new Set();
      const slots=fragments.map(fragment=>{
        const id=fragment.dataset.flowModuleTarget;
        const target=document.getElementById(id);
        if(!target||target.tagName!=='TEMPLATE'||targets.has(id))throw new Error('Mount inválido de Diagnósticos.');
        targets.add(id);
        return {fragment,target};
      });
      if(!targets.has('flowModulesView')||slots.length!==document.querySelectorAll('template[id^="flowModules"]').length)throw new Error('Markup incompleto de Diagnósticos.');
      slots.forEach(({fragment,target})=>{
        const content=fragment.content.cloneNode(true);
        const nodes=Array.from(content.childNodes);
        mounted.push({target,nodes});
        target.replaceWith(content);
      });
      const {initializeFlowModules}=await import(scriptUrl.href);
      flowModules=initializeFlowModules(Object.freeze({
        config:Object.freeze({enabled:DIAGNOSTICS_ENABLED,ativos_habilitados:rawInstanceConfig.ativos_habilitados}),
        get viewMode(){return viewMode;},
        FLOW_IA_SPARK_SVG,
        syncSearchClear,
        openAflowIaContext,
        openDiagnosticsForLead,
        readSupabaseShadowTable,
        norm,
        getLeadValue,
        hasValue,
        displayStatus,
        statusClass,
        parseMoneyNumber,
        x,
        inPeriod,
        formatDateFullBR,
        microFunnel,
        canCloseEditableModal,
        getOperationalLeadForIntelligence,
        refreshIntelligenceChipsForLead,
        getObservationLead(key){return leads.find(item=>isSameIntelligenceLead(item,key));},
        isSavingObservations(key){
          const managementLeadKey=String(getLeadValue(currentLead,'leadKey','Lead Key','lead_key')||'').trim();
          return saveInProgress&&managementLeadKey===key;
        },
        syncCoreObservations,
        saveObservations:saveModuleObservations
      }));
      if(tab)tab.disabled=false;
      return flowModules;
    }catch(e){
      flowModules=null;
      mounted.reverse().forEach(({target,nodes})=>{
        if(nodes[0]&&nodes[0].parentNode)nodes[0].before(target);
        nodes.forEach(node=>node.remove());
      });
      if(tab)tab.title='Diagnósticos indisponíveis. Recarregue a página para tentar novamente.';
      console.warn('[AFLOR Flow Modules] Não foi possível inicializar Diagnósticos.');
      return null;
    }finally{
      clearTimeout(timeout);
    }
  }

  modulesReady=mountFlowModules();
  loadData();
  });



