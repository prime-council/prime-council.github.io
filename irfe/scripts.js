const dtEl = document.getElementById('dt');
if (dtEl) {
  dtEl.textContent=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
}

const GAS_URL='https://script.google.com/macros/s/AKfycbxNYq9rDo_iI-7iTJZcsHMYnpga1pVCRhkCBcBb5ZZfWP8XCwbRPREtX1t_u49Mmew/exec';
const FRONTEND_TOKEN='prime2026-f7c9a3d41e8b4c2fa6d9b0e73a2c8f51';

let ultimoIrfeSalvo = {
  id_irfe: null,
  email: null,
  pdfRegistrado: false
};
let pdfGeradoPendente = false;
let pdfRegistroEmAndamento = false;
const DIAGNOSIS_FLOW_STANDARD_VERSION = '1.0';
const DIAGNOSIS_LOADING_DURATION_MS = 4000;
let ultimoResultadoIrfe = null;

function calcRcc(cc){
  if(cc<=-30)return 0;
  if(cc<=0)return(cc+30)*0.400;
  if(cc<=30)return 12+(cc*0.933);
  if(cc<=60)return 40+(cc-30)*1.000;
  if(cc<=90)return 70+(cc-60)*0.667;
  return Math.min(100,90+(cc-90)*0.333);
}

function calcRm(m){
  if(m>=20)return 0;
  if(m>=10)return(20-m)*4.0;
  if(m>=5)return 40+(10-m)*6.0;
  if(m>=0)return 70+(5-m)*6.0;
  return 100;
}

function calcRi(i){
  let res;
  if(i<3)res=i*5;
  else if(i<8)res=15+(i-3)*7;
  else if(i<15)res=50+(i-8)*4.29;
  else res=80+(i-15)*4;
  return Math.min(100, Math.max(0, res));
}

function calcRa(a){
  let res;
  if(a < 30) res = a * 0.80;
  else if(a < 50) res = 24 + (a - 30) * 1.50;
  else if(a < 70) res = 54 + (a - 50) * 1.30;
  else res = 80 + (a - 70) * 0.667;
  return Math.min(100, Math.max(0, res));
}

function calcRcg(dias){
  dias = Math.min(180, Math.max(0, dias));
  if(dias <= 7)  return 100 - dias * 1.43;
  if(dias <= 15) return 90 - (dias - 7) * 1.25;
  if(dias <= 30) return 80 - (dias - 15) * 1.333;
  if(dias <= 60) return 60 - (dias - 30) * 0.833;
  if(dias <= 90) return 35 - (dias - 60) * 0.667;
  return Math.max(0, 15 - (dias - 90) * 0.167);
}

function classify(s){
  if(s<=25)return{label:'Risco Baixo',sub:'Empresa Financeiramente Resiliente',bg:'#dcfce7',tc:'#166534',bc:'#86efac',gc:'#22c55e',ctaBg:'#111'};
  if(s<=50)return{label:'Risco Moderado',sub:'Empresa em Zona de Atenção',bg:'#fef9c3',tc:'#713f12',bc:'#fde047',gc:'#eab308',ctaBg:'#111'};
  if(s<=75)return{label:'Risco Alto',sub:'Vulnerabilidade Financeira Significativa',bg:'#ffedd5',tc:'#7c2d12',bc:'#fb923c',gc:'#f97316',ctaBg:'#FF5A00'};
  return{label:'Risco Crítico',sub:'Emergência Financeira — Ação Imediata',bg:'#fee2e2',tc:'#7f1d1d',bc:'#fca5a5',gc:'#ef4444',ctaBg:'#991b1b'};
}

function interp(s,cc,marg,inad,alav){
  if(s<=25)return'Os fundamentos financeiros da empresa estão sólidos. Ciclo de Caixa sob controle e margens operacionais adequadas. Este é o momento de estruturar um planejamento estratégico, com ações adequadas e decisões assertivas para garantir crescimento com governança, elencando o que é de fato importante para não agir na urgência. O Conselho Executivo contribuirá de forma ativa na elaboração do planejamento e na garantia da realização das ações compatíveis com esse momento.';
  if(s<=50)return'A empresa opera com vetores de fragilidade, identificados como risco moderado. A margem pressionada, a alavancagem migrando para uma zona de atenção e o Ciclo de Caixa de cauda longa empurram a empresa para uma dependência maior de capital de terceiros. Esses pontos somados têm potencial de se tornar críticos nos próximos 12 a 18 meses. A intervenção preventiva através de um Conselho Executivo pode minimizar os potenciais riscos, além de dar sustentabilidade e credibilidade adicional à empresa na relação com seus stakeholders.';
  if(s<=75)return'A empresa opera com margem de segurança estreita. Uma crise pontual, inadimplência crescente, receita concentrada em poucos clientes e alavancagem elevada com altas taxas de juros pode comprometer a longevidade da empresa. A cauda longa do Ciclo de Caixa agrava a dependência de capital de terceiros. A intervenção é urgente e não deve depender de opiniões ou sugestões amadoras. O Conselho Executivo composto por executivos experientes e pares com vivências semelhantes é a única garantia de decisões e ações efetivas neste momento.';
  return'Múltiplos vetores de risco operam simultaneamente. A empresa está em uma espiral negativa que se autoalimenta: ciclo de caixa longo pressionando o custo financeiro da operação, falta de capital de giro próprio, elevada exposição financeira, oferta de crédito reduzida e incapacidade de investimento, além de margens comprometidas e gestão fragilizada. Sem estrutura de governança, o horizonte de sustentabilidade é curto. A intervenção de um Conselho Executivo é mais que urgente para dar credibilidade à empresa, aos stakeholders e garantir tempo para realizar mudanças absolutamente necessárias.';
}

function arc(cx,cy,r,a1,a2){
  function pt(a){let rad=(a-90)*Math.PI/180;return[cx+r*Math.cos(rad),cy+r*Math.sin(rad)]}
  let s=pt(a2),e=pt(a1),lg=a2-a1>180?1:0;
  return`M ${s[0].toFixed(2)} ${s[1].toFixed(2)} A ${r} ${r} 0 ${lg} 0 ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
}

function barColor(v){return v<=25?'#22c55e':v<=50?'#eab308':v<=75?'#f97316':'#ef4444'}

function renderMapaVetoresRisco(subs){
  const svg = document.getElementById('risk-map-svg');
  if(!svg || !Array.isArray(subs) || subs.length === 0) return;

  const ns = 'http://www.w3.org/2000/svg';
  const cx = 150;
  const cy = 150;
  const radius = 88;
  const isMobileRadar = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  const labelRadius = 124;
  const valueRadiusOffset = 14;
  const total = subs.length;

  function clearSvg(){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function pointFor(index, value, baseRadius){
    const angle = -90 + (360 / total) * index;
    const rad = angle * Math.PI / 180;
    const scaledRadius = baseRadius * Math.max(0, Math.min(100, value)) / 100;
    return {
      x: cx + scaledRadius * Math.cos(rad),
      y: cy + scaledRadius * Math.sin(rad)
    };
  }

  function polygonPoints(level){
    return subs.map((_, index) => {
      const p = pointFor(index, level, radius);
      return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
  }

  function addEl(type, attrs, text){
    const el = document.createElementNS(ns, type);
    Object.keys(attrs || {}).forEach(key => el.setAttribute(key, attrs[key]));
    if(text !== undefined) el.textContent = text;
    svg.appendChild(el);
    return el;
  }

  clearSvg();
  addEl('title', {id:'risk-map-title'}, 'Mapa dos Vetores de Risco');
  addEl('desc', {id:'risk-map-desc'}, 'Quanto mais distante do centro, maior a exposição ao risco naquele vetor.');

  [20,40,60,80,100].forEach(level => {
    addEl('polygon', {
      points: polygonPoints(level),
      class: 'risk-map-grid',
      'data-level': String(level)
    });
  });

  subs.forEach((item, index) => {
    const axisEnd = pointFor(index, 100, radius);
    addEl('line', {
      x1: cx,
      y1: cy,
      x2: axisEnd.x.toFixed(1),
      y2: axisEnd.y.toFixed(1),
      class: 'risk-map-axis'
    });
  });

  const dataPoints = subs.map((item, index) => {
    const value = Math.max(0, Math.min(100, Number(item.v) || 0));
    const p = pointFor(index, value, radius);
    return Object.assign({}, p, {value, item});
  });

  addEl('polygon', {
    points: dataPoints.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '),
    class: 'risk-map-area'
  });

  dataPoints.forEach((p, index) => {
    const labelPoint = pointFor(index, 100, labelRadius);
    let anchor = labelPoint.x < cx - 8 ? 'end' : labelPoint.x > cx + 8 ? 'start' : 'middle';
    let labelX = labelPoint.x;
    let labelLines = null;

    if(isMobileRadar && p.item.key === 'rcg'){
      anchor = 'middle';
      labelX = 38;
      labelLines = ['Capital', 'de giro'];
    } else if(isMobileRadar && p.item.key === 'rm'){
      anchor = 'middle';
      labelX = 262;
    }

    addEl('circle', {
      cx: p.x.toFixed(1),
      cy: p.y.toFixed(1),
      r: 4,
      class: 'risk-map-dot',
      'data-key': p.item.key,
      'data-value': String(p.value)
    });

    const labelEl = addEl('text', {
      x: labelX.toFixed(1),
      y: (labelLines ? labelPoint.y - 5 : labelPoint.y).toFixed(1),
      class: 'risk-map-label',
      'text-anchor': anchor
    }, labelLines ? undefined : p.item.l);

    if(labelLines){
      labelLines.forEach((line, lineIndex) => {
        const tspan = document.createElementNS(ns, 'tspan');
        tspan.setAttribute('x', labelX.toFixed(1));
        tspan.setAttribute('dy', lineIndex === 0 ? '0' : '1.15em');
        tspan.textContent = line;
        labelEl.appendChild(tspan);
      });
    }

  });

  addEl('circle', {cx: cx, cy: cy, r: 2.5, class: 'risk-map-center'});
}

function sanitize(str){ return str.replace(/[<>]/g,''); }

function phoneDigits(value){
  return String(value || '').replace(/\D/g,'').slice(0,11);
}

function formatPhone(value){
  let digits=phoneDigits(value);
  if(digits.length<=2) return digits ? '(' + digits : '';
  if(digits.length<=7) return '(' + digits.slice(0,2) + ') ' + digits.slice(2);
  return '(' + digits.slice(0,2) + ') ' + digits.slice(2,7) + ' ' + digits.slice(7);
}

function getFuncionariosLabel(value){
  const labels = {
    '10–50': 'Até 50 colaboradores',
    '51–100': '51 a 100 colaboradores',
    '101–200': '101 a 200 colaboradores',
    'mais de 200': 'Acima de 200 colaboradores'
  };
  return labels[value] || value || '';
}

function isValidMobile(value){
  let digits=phoneDigits(value);
  return digits.length===11 && digits[2]==='9';
}

function parseMetric(id){
  let el=document.getElementById(id);
  if(!el) return NaN;
  let raw=String(el.value).trim();
  if(raw==='') return NaN;
  return Number(raw.replace(',','.'));
}

function validateMetric(id,min,max){
  let el=document.getElementById(id);
  if(!el) return false;
  let val=parseMetric(id);
  let valid=Number.isFinite(val) && val>=min && val<=max;
  el.closest('.field').classList.toggle('field-err', !valid);
  return valid;
}

let wizardStep = 1;
const wizardTotalSteps = 4;
const wizardFields = {
  1: ['setor','funcionarios','faturamento','desafio','gestao'],
  2: ['pmr','pmp','inad'],
  3: ['marg','alav','reserva_caixa'],
  4: ['responsavel','email','telefone','lgpd']
};

function scrollToWizard(){
  const panel=document.getElementById('diagnostico-irfe');
  if(panel) panel.scrollIntoView({behavior:'smooth',block:'start'});
}

function clearWizardError(){
  const errMsg=document.getElementById('err-msg');
  if(errMsg){
    errMsg.textContent='Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.';
    errMsg.classList.remove('visible');
  }
  document.querySelectorAll('.wizard-step .field .err-msg.visible').forEach(msg=>msg.classList.remove('visible'));
}

function validateWizardStep(step){
  const ids=wizardFields[step] || [];
  let firstInvalid=null;
  let valid=true;
  ids.forEach(id=>{
    if(id==='lgpd'){
      const lgpd=document.getElementById('lgpd');
      const lgpdField=document.getElementById('lgpd-field');
      const ok=!!(lgpd && lgpd.checked);
      if(lgpdField) lgpdField.classList.toggle('field-err', !ok);
      if(!ok && !firstInvalid) firstInvalid=lgpdField || lgpd;
      valid = valid && ok;
      return;
    }

    if(id==='desafio' || id==='gestao'){
      const field=document.getElementById('f-' + id);
      const checked=document.querySelector('input[name="' + id + '"]:checked');
      const msg=field ? field.querySelector('.err-msg') : null;
      const ok=!!checked;
      if(field) field.classList.toggle('field-err', !ok);
      if(msg) msg.classList.toggle('visible', !ok);
      if(!ok && !firstInvalid) firstInvalid=field;
      valid = valid && ok;
      return;
    }

    let ok=true;
    const el=document.getElementById(id);
    if(!el) return;
    const field=el.closest('.field');
    const fieldMsg=field ? field.querySelector('.err-msg') : null;
    if(['pmr','pmp','inad','marg','alav','reserva_caixa'].includes(id)){
      const ranges={
        pmr:[0,360],
        pmp:[0,360],
        inad:[0,100],
        marg:[-100,100],
        alav:[0,100],
        reserva_caixa:[0,180]
      };
      ok=validateMetric(id,ranges[id][0],ranges[id][1]);
    } else {
      ok=!!String(el.value || '').trim();
      field.classList.toggle('field-err', !ok);
      if(ok && id==='email'){
        ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        field.classList.toggle('field-err', !ok);
      }
      if(ok && id==='telefone'){
        ok=isValidMobile(el.value);
        field.classList.toggle('field-err', !ok);
      }
      if(fieldMsg) fieldMsg.classList.toggle('visible', !ok);
    }
    if(!ok && !firstInvalid) firstInvalid=el.closest('.field') || el;
    valid = valid && ok;
  });

  const errMsg=document.getElementById('err-msg');
  if(!valid){
    if(errMsg){
      errMsg.textContent=step===4 ? 'Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.' : 'Preencha os campos obrigatórios desta etapa para continuar.';
      errMsg.classList.add('visible');
    }
    if(firstInvalid) firstInvalid.scrollIntoView({behavior:'smooth',block:'center'});
  } else {
    clearWizardError();
  }
  return valid;
}

function updateWizard(){
  document.querySelectorAll('.wizard-step').forEach(step=>{
    step.classList.toggle('active', Number(step.getAttribute('data-step'))===wizardStep);
  });
  const percent=Math.round((wizardStep / wizardTotalSteps) * 100);
  const stepLabel=document.getElementById('wizard-step-label');
  const stepPercent=document.getElementById('wizard-step-percent');
  const fill=document.getElementById('wizard-progress-fill');
  const track=document.querySelector('.wizard-progress-track');
  const back=document.getElementById('wizard-back');
  const next=document.getElementById('wizard-next');
  const submit=document.getElementById('wizard-submit');
  if(stepLabel) stepLabel.textContent='ETAPA ' + wizardStep + ' DE ' + wizardTotalSteps;
  if(stepPercent) stepPercent.textContent=percent + '% DO PERCURSO';
  if(fill) fill.style.width=percent + '%';
  if(track) track.setAttribute('aria-valuenow', String(percent));
  if(back) back.disabled=wizardStep===1;
  if(next) next.hidden=wizardStep===wizardTotalSteps;
  if(submit) submit.hidden=wizardStep!==wizardTotalSteps;
}

function initWizard(){
  const back=document.getElementById('wizard-back');
  const next=document.getElementById('wizard-next');
  const submit=document.getElementById('wizard-submit');
  if(back) back.addEventListener('click',()=>{
    if(wizardStep>1){
      wizardStep--;
      updateWizard();
      scrollToWizard();
    }
  });
  if(next) next.addEventListener('click',()=>{
    if(!validateWizardStep(wizardStep)) return;
    if(wizardStep<wizardTotalSteps){
      wizardStep++;
      updateWizard();
      scrollToWizard();
    }
  });
  if(submit) submit.hidden=true;
  const review=document.getElementById('btn-review-answers');
  if(review) review.addEventListener('click',voltarRevisarRespostas);
  updateWizard();
}

let sending = false;

function setIrfeSubmitBusy(active){
  const submit=document.getElementById('wizard-submit');
  if(!submit) return;
  submit.disabled=!!active;
  submit.setAttribute('aria-busy', active ? 'true' : 'false');
}

function setIrfePdfEnabled(enabled){
  const btnPdf=document.querySelector('.btn-pdf');
  if(!btnPdf) return;
  btnPdf.disabled=!enabled;
  btnPdf.setAttribute('aria-disabled', enabled ? 'false' : 'true');
}

function limparEstadoConfirmadoIrfe(){
  ultimoResultadoIrfe = null;
  ultimoIrfeSalvo = {
    id_irfe: null,
    email: null,
    pdfRegistrado: false
  };
  pdfGeradoPendente = false;
  setIrfePdfEnabled(false);
}

function setDiagnosisLoading(active){
  let loading=document.getElementById('diagnosis-loading');
  let results=document.getElementById('results');
  let questionnaire=document.getElementById('questionnaire');
  if(!loading) return;
  loading.classList.toggle('visible', active);
  loading.setAttribute('aria-hidden', active ? 'false' : 'true');
  if(active && results) results.style.display='none';
  if(questionnaire) questionnaire.style.display=active ? 'none' : '';
}

function voltarRevisarRespostas(){
  const app=document.getElementById('diagnostic-app');
  const questionnaire=document.getElementById('questionnaire');
  const results=document.getElementById('results');
  wizardStep=1;
  updateWizard();
  setDiagnosisLoading(false);
  if(app) app.setAttribute('data-view','questionnaire');
  if(questionnaire) questionnaire.style.display='';
  if(results) results.style.display='none';
  sending=false;
  setIrfeSubmitBusy(false);
  scrollToWizard();
}

function renderizarResultadoIrfeConfirmado(resultado){
  const app=document.getElementById('diagnostic-app');
  const resultDate=document.getElementById('result-date');
  const resultTitle=document.getElementById('result-title');

  document.getElementById('score-num').textContent=resultado.irfe.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  document.getElementById('score-num').style.color=resultado.classificacaoStyle.gc;
  let bdg=document.getElementById('badge');
  bdg.textContent=resultado.classificacaoStyle.label;
  bdg.style.background=resultado.classificacaoStyle.bg;
  bdg.style.color=resultado.classificacaoStyle.tc;
  bdg.style.border='1px solid '+resultado.classificacaoStyle.bc;

  let chip=document.getElementById('cc2');
  if(resultado.cicloCaixa<0){chip.style.background='#dcfce7';chip.style.color='#166534';chip.textContent='↓ Ciclo de caixa: '+Math.abs(resultado.cicloCaixa)+'d negativo (vantagem competitiva)';}
  else{chip.style.background=resultado.cicloCaixa>60?'#fee2e2':resultado.cicloCaixa>30?'#ffedd5':'#fef9c3';chip.style.color=resultado.cicloCaixa>60?'#7f1d1d':resultado.cicloCaixa>30?'#7c2d12':'#713f12';chip.textContent='Ciclo de caixa: +'+resultado.cicloCaixa+'d';}

  renderMapaVetoresRisco(resultado.subs);
  document.getElementById('subcards').innerHTML=resultado.subs.map(s=>`<div class="sc"><div class="sc-lbl">${s.l}</div><div class="sc-num" style="color:${barColor(s.v)}">${s.v}<span style="font-size:11px;color:#B0AA9F;font-family:'DM Sans',sans-serif">/100</span></div><div class="sc-note">${s.n}</div><div class="sc-bar-bg"><div class="sc-bar" style="width:${s.v}%;background:${barColor(s.v)}"></div></div></div>`).join('');

  document.getElementById('interp-text').textContent=resultado.analise;

  let cta=document.getElementById('cta-box');
  cta.style.background=resultado.recomendacaoCor;
  let btnAg=document.getElementById('btn-ag');
  if(btnAg) btnAg.style.setProperty('--risk-cta-bg', resultado.recomendacaoCor);
  document.getElementById('cta-h').textContent=resultado.recomendacaoTitulo;
  document.getElementById('cta-p').textContent=resultado.recomendacaoTexto;

  document.getElementById('r-empresa').textContent     = resultado.empresa      || '—';
  document.getElementById('r-responsavel').textContent = resultado.responsavel  || '—';
  document.getElementById('r-funcionarios').textContent= resultado.funcionariosLabel || '—';
  document.getElementById('r-contato').textContent     = resultado.telefone || '—';
  document.getElementById('r-email').textContent       = resultado.email || '—';

  if(app) app.setAttribute('data-view','result');
  if(resultDate) resultDate.textContent=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  if(resultTitle) resultTitle.textContent=resultado.empresa ? 'Análise financeira · ' + resultado.empresa : 'Análise financeira';
  setIrfePdfEnabled(true);
  document.getElementById('results').style.display='flex';
  document.getElementById('results').scrollIntoView({behavior:'smooth'});
}

async function calcular(){
  // ── Captura — Identificação da Empresa ────────────────────────
  let empresa     = (document.getElementById('empresa')     ? document.getElementById('empresa').value.trim()     : '');
  let funcionarios= (document.getElementById('funcionarios')? document.getElementById('funcionarios').value        : '');
  let setor       = (document.getElementById('setor')       ? document.getElementById('setor').value              : '');
  let faturamento = (document.getElementById('faturamento') ? document.getElementById('faturamento').value        : '');
  let desafioEstrategico = getSelectedOptionLabels('desafio');
  let estruturaGestao = getSelectedOptionLabels('gestao');
  let responsavel = (document.getElementById('responsavel') ? document.getElementById('responsavel').value.trim() : '');
  let cargo       = (document.getElementById('cargo')       ? document.getElementById('cargo').value              : '');
  let email       = (document.getElementById('email')       ? document.getElementById('email').value.trim()       : '');
  let telefone    = (document.getElementById('telefone')    ? document.getElementById('telefone').value.trim()    : '');
  let lgpd        = (document.getElementById('lgpd')        ? document.getElementById('lgpd').checked              : false);
  let honeypot    = (document.getElementById('hp_website')  ? document.getElementById('hp_website').value.trim()   : '');

  if(honeypot) return;

  // ── Validação — campos obrigatórios + consentimento ───────────
  const idsObrig = ['setor','funcionarios','faturamento','responsavel','email','telefone'];
  let erros = false;
  idsObrig.forEach(id => {
    let el = document.getElementById(id);
    if(!el) return;
    let vazio = !el.value.trim();
    el.closest('.field').classList.toggle('field-err', vazio);
    if(vazio) erros = true;
  });
  ['desafio','gestao'].forEach(name=>{
    const field=document.getElementById('f-' + name);
    const ok=!!document.querySelector('input[name="' + name + '"]:checked');
    if(field) field.classList.toggle('field-err', !ok);
    if(!ok) erros = true;
  });
  let lgpdField = document.getElementById('lgpd-field');
  if(!lgpd){ lgpdField.classList.add('field-err'); erros = true; }
  else { lgpdField.classList.remove('field-err'); }
  let errMsg = document.getElementById('err-msg');
  if(erros){ errMsg.classList.add('visible'); errMsg.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  errMsg.classList.remove('visible');

  // ── Hardening ─────────────────────────────────────────────────
  // 1. Sanitização + trim
  empresa     = sanitize(empresa).trim();
  responsavel = sanitize(responsavel).trim();
  email       = sanitize(email).trim();

  // 1a. Bloquear vazios após sanitização
  if(!responsavel || !email){ alert('Preencha corretamente os campos obrigatórios'); return; }

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    document.getElementById('email').closest('.field').classList.add('field-err');
    errMsg.textContent='Informe um e-mail válido.';
    errMsg.classList.add('visible');
    errMsg.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }

  // 2. Normalização + validação telefone
  if(!isValidMobile(telefone)){
    document.getElementById('telefone').closest('.field').classList.add('field-err');
    errMsg.textContent='Informe um celular válido com DDD e 9 dígitos.';
    errMsg.classList.add('visible');
    errMsg.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  telefone = formatPhone(telefone);
  document.getElementById('telefone').value = telefone;

  // 4. Validação funcionários (whitelist)
  let validFuncs=['10–50','51–100','101–200','mais de 200'];if(!validFuncs.includes(funcionarios)){alert('Selecione uma faixa de funcionários válida');return;}
  let funcionariosLabel = getFuncionariosLabel(funcionarios);

  // 5. Validação dos indicadores usados no cálculo
  const metricasValidas = [
    validateMetric('pmr',0,360),
    validateMetric('pmp',0,360),
    validateMetric('inad',0,100),
    validateMetric('marg',-100,100),
    validateMetric('alav',0,100),
    validateMetric('reserva_caixa',0,180)
  ].every(Boolean);
  if(!metricasValidas){
    errMsg.textContent='Preencha os indicadores financeiros dentro das faixas esperadas para calcular o diagnóstico.';
    errMsg.classList.add('visible');
    errMsg.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  errMsg.textContent='Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.';

  let pmr=parseMetric('pmr');
  let pmp=parseMetric('pmp');
  let inad=parseMetric('inad');
  let marg=parseMetric('marg');
  let alav=parseMetric('alav');
  let reservaCaixa=parseMetric('reserva_caixa');
  let cc=pmr-pmp;

  // 6. Bloqueio de envio duplicado
  if(sending) return; sending = true;
  setIrfeSubmitBusy(true);
  limparEstadoConfirmadoIrfe();
  setDiagnosisLoading(true);
  // 2. Calcular subscores
  let rcc=calcRcc(cc);
  let rm=calcRm(marg);
  let ri=calcRi(inad);
  let ra=calcRa(alav);
  let rcg=calcRcg(reservaCaixa);
  
  // 3. Calcular IRFE base
  let irfe = 0.28 * rcc + 0.25 * rm + 0.20 * ri + 0.12 * ra + 0.15 * rcg;
  
  // 4. Aplicar Override Nível 1 — Alerta
  if (rcc >= 80 || rm >= 80 || ri >= 80 || ra >= 80 || rcg >= 80) {
    irfe = Math.max(irfe, 55);
  }

  // 5. Aplicar Override Nível 2 — Falha Sistêmica (Contagem explícita)
  let count75 = 0;
  if (rcc >= 75) count75++;
  if (rm >= 75) count75++;
  if (ri >= 75) count75++;
  if (rcg >= 75) count75++;

  if ((rcc >= 95 || rm >= 95 || ri >= 95 || ra >= 95 || rcg >= 95) || count75 >= 2) {
    irfe = Math.max(irfe, 68);
  }

  if (rcg >= 90 && (rcc >= 70 || rm >= 70 || ri >= 70)) {
    irfe = Math.max(irfe, 68);
  }

  // 6. Clamp final e arredondamento
  irfe = Math.min(100, Math.max(0, irfe));
  irfe = parseFloat(irfe.toFixed(1));
  
  let cl=classify(irfe);

  let subs=[
    {key:'rcc',l:'Ciclo de caixa',v:Math.round(rcc),n:'CC = '+cc+'d'},
    {key:'rm',l:'Margem',v:Math.round(rm),n:marg+'%'},
    {key:'ri',l:'Inadimplência',v:Math.round(ri),n:inad+'%'},
    {key:'ra',l:'Alavancagem',v:Math.round(ra),n:alav+'%'},
    {key:'rcg',l:'Capital de giro',v:Math.round(rcg),n:reservaCaixa+' dias de cobertura'}
  ];
  let ctaTitles={0:'Governança e Crescimento',25:'Prevenção e Estrutura',50:'Ação Estratégica',75:'Emergência Financeira'};
  let ctaPs={0:'Sua empresa tem fundamentos sólidos. É o momento de blindar o negócio com governança consultiva para escalar com segurança.',25:'Existem pontos de atenção que podem comprometer o futuro. Uma análise externa pode identificar gargalos antes que se tornem críticos.',50:'O risco é elevado e a margem de erro é mínima. É necessária uma revisão imediata dos processos financeiros e operacionais.',75:'Situação de alta vulnerabilidade. A intervenção deve ser imediata para estancar perdas e reestruturar a viabilidade do negócio.'};
  
  let level=irfe<=25?0:irfe<=50?25:irfe<=75?50:75;

  const resultadoIrfe = {
    empresa,
    responsavel,
    funcionariosLabel,
    telefone,
    email,
    irfe,
    classificacao: cl.label,
    classificacaoStyle: cl,
    cicloCaixa: cc,
    subs,
    analise: interp(irfe,cc,marg,inad,alav),
    recomendacaoTitulo: ctaTitles[level],
    recomendacaoTexto: ctaPs[level],
    recomendacaoCor: cl.ctaBg
  };

  // ── Envio ao backend GAS ───────────────────────────────────────
  const payload = {
    _token: FRONTEND_TOKEN,
    website: honeypot,
    source: "irfe",
    tipo: 'irfe',
    origem: 'prime-irfe',
    versao: 'v2',
    asset: 'prime',
    nome: responsavel,
    empresa: empresa,
    cargo: cargo,
    email: email,
    whatsapp: phoneDigits(telefone),
    setor: setor,
    faixa_funcionarios: funcionariosLabel,
    numero_colaboradores: funcionariosLabel,
    faturamento_anual: faturamento,
    desafio_estrategico: desafioEstrategico,
    estrutura_gestao: estruturaGestao,
    pmr: pmr,
    pmp: pmp,
    ciclo_caixa: cc,
    margem_operacional: marg,
    inadimplencia: inad,
    endividamento: alav,
    reserva_caixa: reservaCaixa,
    score_irfe: irfe,
    classificacao_risco: cl.label,
    score_ciclo_caixa: Math.round(rcc),
    score_margem_operacional: Math.round(rm),
    score_exposicao_crises: Math.round(ri),
    score_alavancagem: Math.round(ra),
    score_reserva_caixa: Math.round(rcg),
    pdf_gerado: false,
    aceite_lgpd: true
  };

  const salvamentoPromise = GAS_URL
    ? fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .catch(err => ({ success: false, error: err }))
    : Promise.resolve({ success: false });

  const loadingPromise = new Promise(resolve =>
    setTimeout(resolve, DIAGNOSIS_LOADING_DURATION_MS)
  );

  const [res] = await Promise.all([
    salvamentoPromise,
    loadingPromise
  ]);

  if(res?.success === true){
    ultimoResultadoIrfe = resultadoIrfe;
    ultimoIrfeSalvo.id_irfe = res.id || null;
    ultimoIrfeSalvo.email = email || null;
    ultimoIrfeSalvo.pdfRegistrado = false;
    console.log('IRFE registrado no backend.');
    if(pdfGeradoPendente){
      registrarPdfGerado();
    }
    setDiagnosisLoading(false);
    renderizarResultadoIrfeConfirmado(resultadoIrfe);
  } else {
    limparEstadoConfirmadoIrfe();
    console.warn('Falha ao registrar IRFE no backend.', res);
    setDiagnosisLoading(false);
  }
  sending = false;
  setIrfeSubmitBusy(false);
}

function agendar(){
  window.open('https://primecouncil.com/','_blank','noopener,noreferrer');
}

function textFrom(id){
  const el = document.getElementById(id);
  return el ? String(el.textContent || '').trim() : '';
}

function setPrintText(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value || '—';
}

function getSelectedRadioLabel(name){
  const input = document.querySelector('input[name="' + name + '"]:checked');
  if(!input) return '';
  const label = input.closest('label');
  const textSource = label ? label.querySelector('.radio-label') || label : null;
  return textSource ? String(textSource.textContent || '').replace(/\s+/g,' ').trim() : '';
}

function getSelectedOptionLabels(name){
  return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked'))
    .map(input => {
      const label = input.closest('label');
      const textSource = label ? label.querySelector('.radio-label') || label : null;
      return textSource ? String(textSource.textContent || '').replace(/\s+/g,' ').trim() : '';
    })
    .filter(Boolean)
    .join('; ');
}

function checkedRadioText(name){
  const text = getSelectedOptionLabels(name);
  return text || 'Não informado';
}

function formatPublicDiagnosticId(id){
  const raw = String(id || '').trim();
  if(!raw) return 'IF';
  const withoutRepeatedIrfe = raw.replace(/^(IRFE-)+/i, '');
  const withoutIf = withoutRepeatedIrfe.replace(/^IF-/i, '');
  return 'IF-' + withoutIf;
}

function limparRadarPrint(){
  const wrap = document.getElementById('pr-irfe-radar-wrap');
  if(wrap) wrap.innerHTML = '';
}

function criarCardPrint(item){
  const card = document.createElement('div');
  card.className = 'irfe-print-card' + (item.scoreCard ? ' irfe-print-score-card' : '');

  const label = document.createElement('div');
  label.className = 'irfe-print-card-label';
  label.textContent = item.label;
  card.appendChild(label);

  const value = document.createElement('div');
  value.className = 'irfe-print-card-value';
  value.textContent = item.value;
  if(item.color) value.style.color = item.color;
  card.appendChild(value);

  if(item.note){
    const note = document.createElement('div');
    note.className = 'irfe-print-card-note';
    note.textContent = item.note;
    card.appendChild(note);
  }

  if(item.badge){
    const pill = document.createElement('div');
    pill.className = 'irfe-print-risk-pill';
    pill.textContent = item.badge;
    if(item.badgeStyle){
      pill.style.background = item.badgeStyle.bg;
      pill.style.color = item.badgeStyle.tc;
      pill.style.border = '1px solid ' + item.badgeStyle.bc;
    }
    card.appendChild(pill);
  }

  return card;
}

function prepararRelatorioIrfeParaImpressao(){
  const report = document.getElementById('irfePrintReport');
  const indicators = document.getElementById('pr-irfe-indicators');
  const sourceSvg = document.getElementById('risk-map-svg');
  const whatsapp = document.getElementById('btn-ag');
  if(!report || !indicators || !sourceSvg) return false;

  const dataAtual = textFrom('result-date') || new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const empresa = (ultimoResultadoIrfe && ultimoResultadoIrfe.empresa) || textFrom('r-empresa') || 'Empresa';
  const idAtual = formatPublicDiagnosticId(ultimoIrfeSalvo && ultimoIrfeSalvo.id_irfe ? ultimoIrfeSalvo.id_irfe : '');
  const meta = empresa + ' · ' + idAtual + ' · ' + dataAtual;

  setPrintText('pr-irfe-meta-main', meta);
  setPrintText('pr-irfe-meta-secondary', 'Diagnóstico Financeiro Prime');
  setPrintText('pr-irfe-company', textFrom('r-empresa'));
  setPrintText('pr-irfe-owner', textFrom('r-responsavel'));
  setPrintText('pr-irfe-phone', textFrom('r-contato'));
  setPrintText('pr-irfe-email', textFrom('r-email'));
  setPrintText('pr-irfe-desafio', checkedRadioText('desafio'));
  setPrintText('pr-irfe-gestao', checkedRadioText('gestao'));
  setPrintText('pr-irfe-analysis', textFrom('interp-text'));
  setPrintText('pr-irfe-recommendation-title', textFrom('cta-h'));
  setPrintText('pr-irfe-recommendation-text', textFrom('cta-p'));

  const recommendation = document.getElementById('pr-irfe-recommendation');
  if(recommendation && ultimoResultadoIrfe && ultimoResultadoIrfe.recomendacaoCor){
    recommendation.style.background = ultimoResultadoIrfe.recomendacaoCor;
  }

  const printWhatsapp = document.getElementById('pr-irfe-whatsapp');
  if(printWhatsapp && whatsapp){
    printWhatsapp.href = whatsapp.href;
  }

  indicators.innerHTML = '';
  indicators.appendChild(criarCardPrint({
    label: 'ÍNDICE FINANCEIRO',
    value: textFrom('score-num'),
    badge: textFrom('badge'),
    badgeStyle: ultimoResultadoIrfe ? ultimoResultadoIrfe.classificacaoStyle : null,
    scoreCard: true
  }));

  const subs = ultimoResultadoIrfe && Array.isArray(ultimoResultadoIrfe.subs) ? ultimoResultadoIrfe.subs : [];
  subs.forEach(item => {
    indicators.appendChild(criarCardPrint({
      label: item.l,
      value: String(item.v) + '/100',
      note: item.n,
      color: barColor(item.v)
    }));
  });

  limparRadarPrint();
  const radarWrap = document.getElementById('pr-irfe-radar-wrap');
  const clonedSvg = sourceSvg.cloneNode(true);
  clonedSvg.removeAttribute('id');
  clonedSvg.querySelectorAll('[id]').forEach((node, index) => {
    node.setAttribute('id', 'pr-irfe-radar-' + index);
  });
  clonedSvg.setAttribute('aria-hidden', 'true');
  radarWrap.appendChild(clonedSvg);
  report.setAttribute('aria-hidden', 'false');
  return true;
}
function gerarPdfDiagnostico(){
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `irfe_prime_${dataAtual}.pdf`;
  const tituloOriginal = document.title;
  document.title = nomeArquivo;
  prepararRelatorioIrfeParaImpressao();
  if(ultimoIrfeSalvo.id_irfe) registrarPdfGerado();
  else pdfGeradoPendente = true;
  window.print();
  setTimeout(()=>{
    document.title = tituloOriginal;
    limparRadarPrint();
    const report = document.getElementById('irfePrintReport');
    if(report) report.setAttribute('aria-hidden','true');
  },500);
}

function registrarPdfGerado(){
  if(!GAS_URL || !ultimoIrfeSalvo.id_irfe || ultimoIrfeSalvo.pdfRegistrado || pdfRegistroEmAndamento) return;
  pdfRegistroEmAndamento = true;

  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({
      _token: FRONTEND_TOKEN,
      source: "irfe_pdf",
      id_irfe: ultimoIrfeSalvo.id_irfe,
      email: ultimoIrfeSalvo.email,
      pdf_gerado: true
    })
  })
  .then(r => r.json())
  .then(res => {
    if(res.success){
      ultimoIrfeSalvo.pdfRegistrado = true;
      pdfGeradoPendente = false;
      console.log('PDF registrado no backend.');
    } else {
      console.warn('Falha ao registrar PDF no backend.', res);
    }
  })
  .catch(err => console.warn('Falha ao registrar PDF no backend.', err))
  .finally(() => {
    pdfRegistroEmAndamento = false;
  });
}

// ── Limpar estado de erro ao corrigir campo ────────────────────
['empresa','responsavel','email','telefone'].forEach(id=>{
  let el=document.getElementById(id);
  if(el) el.addEventListener('input',function(){
    if(id==='telefone') this.value=formatPhone(this.value);
    this.closest('.field').classList.remove('field-err');
    const fieldMsg=this.closest('.field').querySelector('.err-msg');
    if(fieldMsg) fieldMsg.classList.remove('visible');
    let errMsg=document.getElementById('err-msg');
    errMsg.textContent='Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.';
    errMsg.classList.remove('visible');
  });
});
['setor','funcionarios','faturamento','cargo'].forEach(id=>{
  let el=document.getElementById(id);
  if(el) el.addEventListener('change',function(){
    this.closest('.field').classList.remove('field-err');
    const fieldMsg=this.closest('.field').querySelector('.err-msg');
    if(fieldMsg) fieldMsg.classList.remove('visible');
    let errMsg=document.getElementById('err-msg');
    errMsg.textContent='Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.';
    errMsg.classList.remove('visible');
  });
});
document.querySelectorAll('input[name="desafio"], input[name="gestao"]').forEach(el=>{
  el.addEventListener('change',function(){
    const field=this.closest('.field');
    if(field){
      field.classList.remove('field-err');
      const fieldMsg=field.querySelector('.err-msg');
      if(fieldMsg) fieldMsg.classList.remove('visible');
    }
    let errMsg=document.getElementById('err-msg');
    errMsg.textContent='Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.';
    errMsg.classList.remove('visible');
  });
});
['pmr','pmp','inad','marg','alav','reserva_caixa'].forEach(id=>{
  let el=document.getElementById(id);
  if(el) el.addEventListener('input',function(){
    this.closest('.field').classList.remove('field-err');
    let errMsg=document.getElementById('err-msg');
    errMsg.textContent='Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.';
    errMsg.classList.remove('visible');
  });
});
let lgpdEl=document.getElementById('lgpd');
if(lgpdEl) lgpdEl.addEventListener('change',function(){
  document.getElementById('lgpd-field').classList.remove('field-err');
  document.getElementById('err-msg').classList.remove('visible');
});

let helpTip=document.querySelector('.help-tip');
if(helpTip){
  helpTip.addEventListener('focus',()=>helpTip.classList.add('is-active'));
  helpTip.addEventListener('blur',()=>helpTip.classList.remove('is-active'));
}

initWizard();
