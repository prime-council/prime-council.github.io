const dtEl = document.getElementById('dt');
if (dtEl) {
  dtEl.textContent=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
}

const GAS_URL='https://script.google.com/macros/s/AKfycbxNYq9rDo_iI-7iTJZcsHMYnpga1pVCRhkCBcBb5ZZfWP8XCwbRPREtX1t_u49Mmew/exec';
const FRONTEND_TOKEN='prime2026-f7c9a3d41e8b4c2fa6d9b0e73a2c8f51';


let ultimoPayloadComercial = null;
let ultimoResultadoComercial = null;
let ultimoComercialSalvo = null;
let envioComercialEmAndamento = false;
let pdfComercialGeradoPendente = false;
let pdfComercialRegistroEmAndamento = false;
const DIAGNOSIS_FLOW_STANDARD_VERSION = '1.0';
const DIAGNOSIS_LOADING_DURATION_MS = 4000;

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
  addEl('desc', {id:'risk-map-desc'}, 'Quanto mais próximo da borda, melhor o desempenho nessa área. Pontos próximos ao centro indicam aspectos que precisam de atenção.');

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
const wizardTotalSteps = 5;
const wizardFields = {
  1: ['setor','funcionarios','faturamento','desafio_comercial','estrutura_comercial'],
  2: ['comercial_q01','comercial_q02'],
  3: ['comercial_q03','comercial_q04','comercial_q05','comercial_q06'],
  4: ['comercial_q07','comercial_q08','comercial_q09','comercial_q10'],
  5: ['responsavel','email','telefone','lgpd']
};

const wizardMultiFields = [
  'desafio_comercial',
  'estrutura_comercial'
];

const wizardRadioFields = [
  'comercial_q01',
  'comercial_q02',
  'comercial_q03',
  'comercial_q04',
  'comercial_q05',
  'comercial_q06',
  'comercial_q07',
  'comercial_q08',
  'comercial_q09',
  'comercial_q10'
];

function scrollToWizard(){
  const panel=document.getElementById('diagnostico-comercial');
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

    if(wizardRadioFields.includes(id) || wizardMultiFields.includes(id)){
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
      errMsg.textContent=step===wizardTotalSteps ? 'Preencha todos os campos obrigatórios e aceite o termo de consentimento para prosseguir.' : 'Preencha os campos obrigatórios desta etapa para continuar.';
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
  ultimoComercialSalvo=null;
  pdfComercialGeradoPendente=false;
  pdfComercialRegistroEmAndamento=false;
  desativarPdfComercial();
  if(app) app.setAttribute('data-view','questionnaire');
  if(questionnaire) questionnaire.style.display='';
  if(results) results.style.display='none';
  sending=false;
  scrollToWizard();
}

function getSelectedRadioValue(name){
  const checked=document.querySelector('input[name="' + name + '"]:checked');
  return checked ? checked.value : '';
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

function getSelectedRadioNumber(name){
  const value=getSelectedRadioValue(name);
  return value ? Number(value) : null;
}

function validarTodasEtapasComerciais(){
  for(let step=1; step<=wizardTotalSteps; step++){
    wizardStep=step;
    updateWizard();
    if(!validateWizardStep(step)){
      scrollToWizard();
      return false;
    }
  }
  wizardStep=wizardTotalSteps;
  updateWizard();
  return true;
}

function getDimensaoComercialScore(resultado, key){
  const item = resultado && Array.isArray(resultado.dimensoes) ? resultado.dimensoes.find(dimensao => dimensao.key === key) : null;
  return item ? item.score : null;
}

function setComercialSubmitBusy(active){
  const submit=document.getElementById('wizard-submit');
  if(!submit) return;
  submit.disabled=!!active;
  submit.setAttribute('aria-busy', active ? 'true' : 'false');
}

function limparEstadoConfirmadoComercial(){
  ultimoPayloadComercial = null;
  ultimoResultadoComercial = null;
  ultimoComercialSalvo = null;
  pdfComercialGeradoPendente = false;
  window.__comercialPayloadPreview = null;
  window.__comercialResultadoPreview = null;
  desativarPdfComercial();
}

async function coletarPayloadComercialR1(){
  if(envioComercialEmAndamento) return;
  if(!validarTodasEtapasComerciais()) return;
  const honeypot = document.getElementById('hp_website') ? document.getElementById('hp_website').value.trim() : '';
  if(honeypot) return;
  const funcionarios = document.getElementById('funcionarios') ? document.getElementById('funcionarios').value : '';
  const payload = {
    _token: FRONTEND_TOKEN,
    website: honeypot,
    source: 'comercial', tipo: 'comercial', origem: 'prime-comercial', versao: 'r1-questionario', asset: 'prime',
    setor: document.getElementById('setor') ? document.getElementById('setor').value : '',
    faixa_funcionarios: getFuncionariosLabel(funcionarios), numero_colaboradores: getFuncionariosLabel(funcionarios),
    faturamento_anual: document.getElementById('faturamento') ? document.getElementById('faturamento').value : '',
    desafio_comercial: getSelectedOptionLabels('desafio_comercial'), estrutura_comercial: getSelectedOptionLabels('estrutura_comercial'),
    comercial_q01: getSelectedRadioNumber('comercial_q01'), comercial_q02: getSelectedRadioNumber('comercial_q02'),
    comercial_q03: getSelectedRadioNumber('comercial_q03'), comercial_q04: getSelectedRadioNumber('comercial_q04'),
    comercial_q05: getSelectedRadioNumber('comercial_q05'), comercial_q06: getSelectedRadioNumber('comercial_q06'),
    comercial_q07: getSelectedRadioNumber('comercial_q07'), comercial_q08: getSelectedRadioNumber('comercial_q08'),
    comercial_q09: getSelectedRadioNumber('comercial_q09'), comercial_q10: getSelectedRadioNumber('comercial_q10'),
    nome: document.getElementById('responsavel') ? sanitize(document.getElementById('responsavel').value).trim() : '',
    empresa: document.getElementById('empresa') ? sanitize(document.getElementById('empresa').value).trim() : '',
    cargo: document.getElementById('cargo') ? document.getElementById('cargo').value : '',
    email: document.getElementById('email') ? sanitize(document.getElementById('email').value).trim() : '',
    whatsapp: document.getElementById('telefone') ? phoneDigits(document.getElementById('telefone').value) : '', pdf_gerado: false, aceite_lgpd: document.getElementById('lgpd') ? document.getElementById('lgpd').checked === true : false
  };
  try{
    const resultadoComercial = calcularMotorComercialV1(payload);
    payload.indice_comercial = resultadoComercial.indice_geral;
    payload.classificacao_comercial = resultadoComercial.classificacao.label;
    payload.direcao_comercial = getDimensaoComercialScore(resultadoComercial, 'direcao_comercial');
    payload.prospeccao_recorrencia = getDimensaoComercialScore(resultadoComercial, 'prospeccao_recorrencia');
    payload.portfolio_solucoes = getDimensaoComercialScore(resultadoComercial, 'portfolio_solucoes');
    payload.conversao_valor = getDimensaoComercialScore(resultadoComercial, 'conversao_valor');
    payload.disciplina_gestao_carteira = getDimensaoComercialScore(resultadoComercial, 'disciplina_gestao_carteira');
    console.info('[Diagnóstico Comercial Prime] Payload declarado para envio:', payload);
    console.info('[Diagnóstico Comercial Prime] Motor Comercial V1:', resultadoComercial);

    envioComercialEmAndamento = true;
    setComercialSubmitBusy(true);
    limparEstadoConfirmadoComercial();
    setDiagnosisLoading(true);

    const salvamentoPromise = fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .catch(error => ({ success: false, error }));

    const loadingPromise = new Promise(resolve =>
      setTimeout(resolve, DIAGNOSIS_LOADING_DURATION_MS)
    );

    const [resposta] = await Promise.all([
      salvamentoPromise,
      loadingPromise
    ]);

    if(resposta?.success === true){
      window.__comercialPayloadPreview = payload;
      window.__comercialResultadoPreview = resultadoComercial;
      ultimoPayloadComercial = payload;
      ultimoResultadoComercial = resultadoComercial;
      ultimoComercialSalvo = {
        id_comercial: resposta.id || null,
        email: payload.email,
        pdfRegistrado: false
      };
      if(pdfComercialGeradoPendente){
        registrarPdfComercialGerado();
      }
      setDiagnosisLoading(false);
      renderizarResultadoComercialV1(payload, resultadoComercial);
    } else {
      setDiagnosisLoading(false);
      limparEstadoConfirmadoComercial();
      console.warn('Falha ao registrar Diagnóstico Comercial no backend.', resposta);
    }
    envioComercialEmAndamento = false;
    setComercialSubmitBusy(false);
  } catch(error){
    setDiagnosisLoading(false);
    limparEstadoConfirmadoComercial();
    envioComercialEmAndamento = false;
    setComercialSubmitBusy(false);
    console.warn('Falha ao preparar Diagnóstico Comercial.', error);
  }
}

// ================================================================
// MOTOR COMERCIAL V1
// Resultado web ativo. Sem PDF, GAS ou persistência.
// ================================================================
const COMERCIAL_DIMENSOES = Object.freeze([
  Object.freeze({
    key: 'direcao_comercial',
    label: 'Direção Comercial',
    perguntas: Object.freeze(['comercial_q01', 'comercial_q02'])
  }),
  Object.freeze({
    key: 'prospeccao_recorrencia',
    label: 'Prospecção e Recorrência',
    perguntas: Object.freeze(['comercial_q03', 'comercial_q04'])
  }),
  Object.freeze({
    key: 'portfolio_solucoes',
    label: 'Portfólio e Soluções',
    perguntas: Object.freeze(['comercial_q05', 'comercial_q06'])
  }),
  Object.freeze({
    key: 'conversao_valor',
    label: 'Conversão e Valor',
    perguntas: Object.freeze(['comercial_q07', 'comercial_q08'])
  }),
  Object.freeze({
    key: 'disciplina_gestao_carteira',
    label: 'Disciplina e Gestão da Carteira',
    perguntas: Object.freeze(['comercial_q09', 'comercial_q10'])
  })
]);

const COMERCIAL_PERGUNTAS = Object.freeze(COMERCIAL_DIMENSOES.flatMap(dimensao => dimensao.perguntas));
const COMERCIAL_MENSAGEM_NIVELAMENTO = 'A operação apresenta um estágio semelhante entre os cinco pilares. O aprofundamento é necessário para identificar quais fatores mais influenciam o desempenho comercial.';
const COMERCIAL_MENSAGEM_DESEQUILIBRIO = 'Desenvolvimento comercial desigual entre os pilares.';

function arredondarComercial(valor, casas = 2){
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function classificarEstagioComercial(indiceGeral){
  if(indiceGeral < 1.75) return { key: 'reativo', label: 'Reativo' };
  if(indiceGeral < 2.50) return { key: 'em_estruturacao', label: 'Em estruturação' };
  if(indiceGeral < 3.25) return { key: 'estruturado', label: 'Estruturado' };
  return { key: 'consolidado', label: 'Consolidado' };
}

function obterDimensaoComercialPublica(dimensao){
  return {
    key: dimensao.key,
    label: dimensao.label
  };
}

function agruparDimensoesPorScore(dimensoes){
  const grupos = [];
  dimensoes.forEach(dimensao => {
    let grupo = grupos.find(item => Math.abs(item.score - dimensao.score) < 1e-9);
    if(!grupo){
      grupo = { score: dimensao.score, dimensoes: [] };
      grupos.push(grupo);
    }
    grupo.dimensoes.push(obterDimensaoComercialPublica(dimensao));
  });
  return grupos.sort((a, b) => a.score - b.score).map((grupo, index) => ({
    nivel: index + 1,
    score: grupo.score,
    empate: grupo.dimensoes.length > 1,
    dimensoes: grupo.dimensoes
  }));
}

function validarRespostaComercial(payload, campo){
  const valorOriginal = payload ? payload[campo] : undefined;
  if(valorOriginal === undefined || valorOriginal === null || String(valorOriginal).trim() === ''){
    throw new Error('[Motor Comercial V1] Resposta inválida em ' + campo + '.');
  }
  const valor = Number(valorOriginal);
  if(!Number.isInteger(valor) || valor < 1 || valor > 4){
    throw new Error('[Motor Comercial V1] Resposta inválida em ' + campo + '.');
  }
  return valor;
}

function montarDestaqueComercial(tipo, tituloSingular, tituloPlural, score, dimensoes){
  return {
    tipo,
    titulo: dimensoes.length > 1 ? tituloPlural : tituloSingular,
    score,
    empate: dimensoes.length > 1,
    dimensoes: dimensoes.map(obterDimensaoComercialPublica)
  };
}

function calcularMotorComercialV1(payload){
  const respostas = {};
  COMERCIAL_PERGUNTAS.forEach(campo => {
    respostas[campo] = validarRespostaComercial(payload, campo);
  });

  const dimensoes = COMERCIAL_DIMENSOES.map(dimensao => {
    const soma = dimensao.perguntas.reduce((total, campo) => total + respostas[campo], 0);
    return {
      key: dimensao.key,
      label: dimensao.label,
      perguntas: [...dimensao.perguntas],
      score: arredondarComercial(soma / dimensao.perguntas.length)
    };
  });

  const indicePorDimensoes = dimensoes.reduce((total, dimensao) => total + dimensao.score, 0) / dimensoes.length;
  const indicePorRespostas = COMERCIAL_PERGUNTAS.reduce((total, campo) => total + respostas[campo], 0) / COMERCIAL_PERGUNTAS.length;
  if(Math.abs(indicePorDimensoes - indicePorRespostas) > 1e-9){
    throw new Error('[Motor Comercial V1] Divergência interna no índice geral.');
  }

  const indiceGeral = arredondarComercial(indicePorDimensoes);
  const scores = dimensoes.map(dimensao => dimensao.score);
  const maiorScore = Math.max(...scores);
  const menorScore = Math.min(...scores);
  const gapDimensoes = arredondarComercial(maiorScore - menorScore);
  const desenvolvimentoDesigual = gapDimensoes >= 1.50;
  const nivelado = dimensoes.every(dimensao => Math.abs(dimensao.score - dimensoes[0].score) < 1e-9);

  let destaqueSuperior = null;
  let destaqueInferior = null;
  let prioridades = [];

  if(!nivelado){
    const dimensoesSuperiores = dimensoes.filter(dimensao => Math.abs(dimensao.score - maiorScore) < 1e-9);
    const dimensoesInferiores = dimensoes.filter(dimensao => Math.abs(dimensao.score - menorScore) < 1e-9);

    destaqueSuperior = maiorScore >= 3.00
      ? montarDestaqueComercial('forca_comercial', 'Força comercial', 'Forças comerciais', maiorScore, dimensoesSuperiores)
      : montarDestaqueComercial('base_mais_desenvolvida', 'Base mais desenvolvida atualmente', 'Bases mais desenvolvidas atualmente', maiorScore, dimensoesSuperiores);

    destaqueInferior = menorScore < 2.50
      ? montarDestaqueComercial('ponto_atencao', 'Principal ponto de atenção', 'Principais pontos de atenção', menorScore, dimensoesInferiores)
      : montarDestaqueComercial('oportunidade_evolucao', 'Próxima oportunidade de evolução', 'Próximas oportunidades de evolução', menorScore, dimensoesInferiores);

    prioridades = agruparDimensoesPorScore(dimensoes.filter(dimensao => dimensao.score < 2.50)).slice(0, 3);
  }

  return {
    versao_motor: 'comercial-v1-preview',
    escala: {
      minimo: 1,
      maximo: 4
    },
    respostas,
    dimensoes,
    indice_geral: indiceGeral,
    classificacao: classificarEstagioComercial(indiceGeral),
    maior_score: maiorScore,
    menor_score: menorScore,
    gap_dimensoes: gapDimensoes,
    desenvolvimento_desigual: desenvolvimentoDesigual,
    mensagem_desenvolvimento_desigual: desenvolvimentoDesigual ? COMERCIAL_MENSAGEM_DESEQUILIBRIO : null,
    nivelado,
    mensagem_nivelamento: nivelado ? COMERCIAL_MENSAGEM_NIVELAMENTO : null,
    destaque_superior: destaqueSuperior,
    destaque_inferior: destaqueInferior,
    prioridades,
    regras_aplicadas: {
      pesos_iguais: true,
      normalizacao_0_100: false,
      overrides: false,
      penalidades: false,
      campos_contextuais_pontuam: false
    }
  };
}

window.calcularMotorComercialV1 = calcularMotorComercialV1;
// ================================================================
// RESULTADO WEB COMERCIAL V1
// Reutiliza integralmente a estrutura visual validada do IRFE.
// Sem PDF, GAS, planilhas, e-mails ou persistência.
// ================================================================
function formatarScoreComercial(valor){
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function normalizarScoreComercialVisual(score){
  const normalizado = ((Number(score) - 1) / 3) * 100;
  return Math.max(0, Math.min(100, normalizado));
}

function estiloEstagioComercial(classificacaoKey){
  const estilos = {
    reativo: {
      bg: '#fee2e2',
      tc: '#7f1d1d',
      bc: '#fca5a5',
      gc: '#ef4444',
      ctaBg: '#991b1b'
    },
    em_estruturacao: {
      bg: '#ffedd5',
      tc: '#7c2d12',
      bc: '#fb923c',
      gc: '#f97316',
      ctaBg: '#FF5A00'
    },
    estruturado: {
      bg: '#fef9c3',
      tc: '#713f12',
      bc: '#fde047',
      gc: '#eab308',
      ctaBg: '#111111'
    },
    consolidado: {
      bg: '#dcfce7',
      tc: '#166534',
      bc: '#86efac',
      gc: '#22c55e',
      ctaBg: '#111111'
    }
  };
  return estilos[classificacaoKey] || estilos.reativo;
}

function corScoreComercial(score){
  return estiloEstagioComercial(classificarEstagioComercial(Number(score)).key).gc;
}

function textoDimensoesComerciais(dimensoes){
  const labels = Array.isArray(dimensoes) ? dimensoes.map(dimensao => dimensao.label).filter(Boolean) : [];
  if(labels.length === 0) return '';
  if(labels.length === 1) return labels[0];
  const ultima = labels[labels.length - 1];
  return labels.slice(0, -1).join(', ') + ', além de ' + ultima;
}

function textoPrioridadesComerciais(prioridades){
  return prioridades.map(grupo => textoDimensoesComerciais(grupo.dimensoes)).join('; ');
}

function contarDimensoesPrioritariasComerciais(prioridades){
  return Array.isArray(prioridades) ? prioridades.reduce((total, grupo) => total + (Array.isArray(grupo.dimensoes) ? grupo.dimensoes.length : 0), 0) : 0;
}

function fraseClassificacaoComercial(classificacaoKey){
  const frases = {
    reativo: 'A atuação comercial depende principalmente de demandas imediatas e iniciativas individuais.',
    em_estruturacao: 'Existem práticas comerciais, mas sua aplicação ainda é irregular.',
    estruturado: 'A empresa possui práticas comerciais definidas e aplicadas com frequência.',
    consolidado: 'As práticas comerciais orientam decisões e são aprimoradas continuamente.'
  };
  return frases[classificacaoKey] || frases.reativo;
}

function gerarSinteseExecutivaComercial(resultado){
  const frases = [fraseClassificacaoComercial(resultado.classificacao.key)];
  if(resultado.nivelado){
    frases.push(COMERCIAL_MENSAGEM_NIVELAMENTO);
    return frases.join(' ');
  }

  if(resultado.destaque_superior){
    const nomes = textoDimensoesComerciais(resultado.destaque_superior.dimensoes);
    if(resultado.destaque_superior.tipo === 'forca_comercial'){
      frases.push(resultado.destaque_superior.empate ? 'As forças comerciais identificadas estão em ' + nomes + '.' : 'A força comercial identificada está em ' + nomes + '.');
    } else {
      frases.push(resultado.destaque_superior.empate ? 'As bases mais desenvolvidas atualmente estão em ' + nomes + '.' : 'A base mais desenvolvida atualmente está em ' + nomes + '.');
    }
  }

  if(resultado.destaque_inferior){
    const nomes = textoDimensoesComerciais(resultado.destaque_inferior.dimensoes);
    if(resultado.destaque_inferior.tipo === 'ponto_atencao'){
      frases.push(resultado.destaque_inferior.empate ? 'Os principais pontos de atenção estão em ' + nomes + '.' : 'O principal ponto de atenção está em ' + nomes + '.');
    } else {
      frases.push(resultado.destaque_inferior.empate ? 'As próximas oportunidades de evolução estão em ' + nomes + '.' : 'A próxima oportunidade de evolução está em ' + nomes + '.');
    }
  }

  if(resultado.prioridades.length){
    const totalPrioridades = contarDimensoesPrioritariasComerciais(resultado.prioridades);
    const rotuloPrioridade = totalPrioridades === 1 ? 'Prioridade de aprofundamento' : 'Prioridades de aprofundamento';
    frases.push(rotuloPrioridade + ': ' + textoPrioridadesComerciais(resultado.prioridades) + '.');
  }
  if(resultado.desenvolvimento_desigual){
    frases.push('O desenvolvimento comercial está desigual entre os pilares.');
  }

  if(frases.length <= 4) return frases.join(' ');

  const reduzidas = [frases[0]];
  const inferior = frases.find(frase => frase.startsWith('O principal ponto') || frase.startsWith('Os principais pontos') || frase.startsWith('A próxima oportunidade') || frase.startsWith('As próximas oportunidades'));
  const prioridades = frases.find(frase => frase.startsWith('Prioridade de aprofundamento:') || frase.startsWith('Prioridades de aprofundamento:'));
  const desigual = frases.find(frase => frase === 'O desenvolvimento comercial está desigual entre os pilares.');
  [inferior, prioridades, desigual].forEach(frase => {
    if(frase && reduzidas.length < 4) reduzidas.push(frase);
  });
  return reduzidas.join(' ');
}

function gerarBlocoAprofundamentoComercial(resultado){
  const titulos = {
    reativo: 'Aprofunde os fatores que limitam a operação',
    em_estruturacao: 'Identifique onde consolidar a execução',
    estruturado: 'Aprofunde as próximas oportunidades de evolução',
    consolidado: 'Sustente a evolução comercial'
  };
  return {
    titulo: titulos[resultado.classificacao.key] || titulos.reativo,
    texto: 'O diagnóstico mostra o estágio da operação e os aspectos que merecem aprofundamento. As causas específicas e os caminhos mais adequados dependem do contexto da sua operação.'
  };
}

function renderRadarComercial(dimensoes){
  const svg = document.getElementById('risk-map-svg');
  if(!svg || !Array.isArray(dimensoes) || dimensoes.length === 0) return;

  const mapa = {
    direcao_comercial: {l: 'Direção', fullLabel: 'Direção Comercial'},
    prospeccao_recorrencia: {l: 'Prospecção', fullLabel: 'Prospecção e Recorrência'},
    portfolio_solucoes: {l: 'Portfólio', fullLabel: 'Portfólio e Soluções'},
    conversao_valor: {l: 'Conversão', fullLabel: 'Conversão e Valor'},
    disciplina_gestao_carteira: {l: 'Carteira', fullLabel: 'Disciplina e Gestão da Carteira'}
  };
  const subs = dimensoes.map(dimensao => ({
    key: dimensao.key,
    l: mapa[dimensao.key] ? mapa[dimensao.key].l : dimensao.label,
    fullLabel: mapa[dimensao.key] ? mapa[dimensao.key].fullLabel : dimensao.label,
    v: normalizarScoreComercialVisual(dimensao.score)
  }));

  const ns = 'http://www.w3.org/2000/svg';
  const cx = 150;
  const cy = 150;
  const radius = 88;
  const labelRadius = 124;
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
  addEl('title', {id:'risk-map-title'}, 'Radar de Eficácia Comercial');
  addEl('desc', {id:'risk-map-desc'}, 'Quanto mais próximo da borda, melhor o desempenho nessa área. Pontos próximos ao centro indicam aspectos que precisam de atenção.');

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
    const anchor = labelPoint.x < cx - 8 ? 'end' : labelPoint.x > cx + 8 ? 'start' : 'middle';

    addEl('circle', {
      cx: p.x.toFixed(1),
      cy: p.y.toFixed(1),
      r: 4,
      class: 'risk-map-dot',
      'data-key': p.item.key,
      'data-value': String(p.value)
    });

    addEl('text', {
      x: labelPoint.x.toFixed(1),
      y: labelPoint.y.toFixed(1),
      class: 'risk-map-label',
      'text-anchor': anchor
    }, p.item.l);
  });

  addEl('circle', {cx: cx, cy: cy, r: 2.5, class: 'risk-map-center'});
}

function desativarPdfComercial(){
  const btnPdf = document.querySelector('.btn-pdf');
  if(!btnPdf) return;
  btnPdf.disabled = true;
  btnPdf.setAttribute('aria-disabled', 'true');
  btnPdf.setAttribute('title', 'PDF comercial em implantação');
  btnPdf.removeAttribute('onclick');
}

function ativarPdfComercial(){
  const btnPdf = document.querySelector('.btn-pdf');
  if(!btnPdf) return;
  btnPdf.disabled = false;
  btnPdf.removeAttribute('aria-disabled');
  btnPdf.setAttribute('title', 'Gerar PDF do diagnóstico');
  btnPdf.onclick = gerarPdfDiagnosticoComercial;
}

function renderizarResultadoComercialV1(payload, resultado){
  if(!payload || !resultado) throw new Error('[Resultado Comercial V1] Payload e resultado são obrigatórios.');

  const estilo = estiloEstagioComercial(resultado.classificacao.key);
  const app = document.getElementById('diagnostic-app');
  const questionnaire = document.getElementById('questionnaire');
  const results = document.getElementById('results');
  const resultDate = document.getElementById('result-date');
  const resultTitle = document.getElementById('result-title');
  const scoreNum = document.getElementById('score-num');
  const badge = document.getElementById('badge');
  const chip = document.getElementById('cc2');
  const subcards = document.getElementById('subcards');
  const interpText = document.getElementById('interp-text');
  const cta = document.getElementById('cta-box');
  const ctaH = document.getElementById('cta-h');
  const ctaP = document.getElementById('cta-p');
  const btnAg = document.getElementById('btn-ag');

  if(resultDate) resultDate.textContent = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'});
  if(resultTitle) resultTitle.textContent = payload.empresa ? 'Análise comercial · ' + payload.empresa : 'Análise comercial';

  const rEmpresa = document.getElementById('r-empresa');
  const rResponsavel = document.getElementById('r-responsavel');
  const rFuncionarios = document.getElementById('r-funcionarios');
  const rContato = document.getElementById('r-contato');
  const rEmail = document.getElementById('r-email');
  if(rEmpresa) rEmpresa.textContent = payload.empresa || '—';
  if(rResponsavel) rResponsavel.textContent = payload.nome || '—';
  if(rFuncionarios) rFuncionarios.textContent = payload.faixa_funcionarios || payload.numero_colaboradores || '—';
  if(rContato) rContato.textContent = payload.whatsapp ? formatPhone(payload.whatsapp) : '—';
  if(rEmail) rEmail.textContent = payload.email || '—';

  if(scoreNum){
    scoreNum.textContent = formatarScoreComercial(resultado.indice_geral);
    scoreNum.style.color = estilo.gc;
  }
  if(badge){
    badge.textContent = resultado.classificacao.label;
    badge.style.background = estilo.bg;
    badge.style.color = estilo.tc;
    badge.style.border = '1px solid ' + estilo.bc;
  }
  if(chip){
    chip.textContent = 'Escala de 1 a 4';
    chip.style.background = estilo.bg;
    chip.style.color = estilo.tc;
  }

  if(subcards){
    subcards.innerHTML = resultado.dimensoes.map(dimensao => {
      const cor = corScoreComercial(dimensao.score);
      const visual = normalizarScoreComercialVisual(dimensao.score);
      const estagio = classificarEstagioComercial(dimensao.score).label;
      return `<div class="sc"><div class="sc-lbl">${dimensao.label}</div><div class="sc-num" style="color:${cor}">${formatarScoreComercial(dimensao.score)}<span style="font-size:11px;color:#B0AA9F;font-family:'DM Sans',sans-serif">/4</span></div><div class="sc-note">Estágio: ${estagio}</div><div class="sc-bar-bg"><div class="sc-bar" style="width:${visual}%;background:${cor}"></div></div></div>`;
    }).join('');
  }

  renderRadarComercial(resultado.dimensoes);

  if(interpText) interpText.textContent = gerarSinteseExecutivaComercial(resultado);

  const bloco = gerarBlocoAprofundamentoComercial(resultado);
  if(cta){
    cta.style.background = estilo.ctaBg;
  }
  if(btnAg) btnAg.style.setProperty('--risk-cta-bg', estilo.ctaBg);
  if(ctaH) ctaH.textContent = bloco.titulo;
  if(ctaP) ctaP.textContent = bloco.texto;

  ativarPdfComercial();
  if(app) app.setAttribute('data-view', 'result');
  if(questionnaire) questionnaire.style.display = 'none';
  if(results){
    results.style.display = 'flex';
    results.scrollIntoView({behavior:'smooth'});
  }
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

function prepararRelatorioComercialParaImpressao(){
  const report = document.getElementById('irfePrintReport');
  const indicators = document.getElementById('pr-irfe-indicators');
  const sourceSvg = document.getElementById('risk-map-svg');
  const radarWrap = document.getElementById('pr-irfe-radar-wrap');
  const whatsapp = document.getElementById('btn-ag');
  if(!report || !indicators || !sourceSvg || !radarWrap || !ultimoPayloadComercial || !ultimoResultadoComercial) return false;

  const dataAtual = textFrom('result-date') || new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const empresa = ultimoPayloadComercial.empresa || textFrom('r-empresa') || 'Empresa';
  const meta = empresa + ' · Diagnóstico Comercial Prime · ' + dataAtual;
  const estilo = estiloEstagioComercial(ultimoResultadoComercial.classificacao.key);

  setPrintText('pr-irfe-meta-main', meta);
  setPrintText('pr-irfe-meta-secondary', 'Diagnóstico Comercial Prime');
  setPrintText('pr-irfe-company', ultimoPayloadComercial.empresa || textFrom('r-empresa'));
  setPrintText('pr-irfe-owner', ultimoPayloadComercial.nome || textFrom('r-responsavel'));
  setPrintText('pr-irfe-phone', ultimoPayloadComercial.whatsapp ? formatPhone(ultimoPayloadComercial.whatsapp) : textFrom('r-contato'));
  setPrintText('pr-irfe-email', ultimoPayloadComercial.email || textFrom('r-email'));
  setPrintText('pr-irfe-desafio', checkedRadioText('desafio_comercial'));
  setPrintText('pr-irfe-gestao', checkedRadioText('estrutura_comercial'));
  setPrintText('pr-irfe-analysis', textFrom('interp-text'));
  setPrintText('pr-irfe-recommendation-title', textFrom('cta-h'));
  setPrintText('pr-irfe-recommendation-text', textFrom('cta-p'));

  const recommendation = document.getElementById('pr-irfe-recommendation');
  if(recommendation){
    recommendation.style.background = estilo.ctaBg;
  }

  const printWhatsapp = document.getElementById('pr-irfe-whatsapp');
  if(printWhatsapp && whatsapp){
    printWhatsapp.href = whatsapp.href;
  }

  indicators.innerHTML = '';
  indicators.appendChild(criarCardPrint({
    label: 'ÍNDICE COMERCIAL',
    value: formatarScoreComercial(ultimoResultadoComercial.indice_geral),
    badge: ultimoResultadoComercial.classificacao.label,
    badgeStyle: estilo,
    scoreCard: true
  }));

  ultimoResultadoComercial.dimensoes.forEach(dimensao => {
    indicators.appendChild(criarCardPrint({
      label: dimensao.label,
      value: formatarScoreComercial(dimensao.score) + '/4',
      note: 'Estágio: ' + classificarEstagioComercial(dimensao.score).label,
      color: corScoreComercial(dimensao.score)
    }));
  });

  limparRadarPrint();
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

function gerarPdfDiagnosticoComercial(){
  const report = document.getElementById('irfePrintReport');
  if(!prepararRelatorioComercialParaImpressao()) return false;

  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `diagnostico_comercial_prime_${dataAtual}.pdf`;
  const tituloOriginal = document.title;
  document.title = nomeArquivo;
  window.print();
  if(ultimoComercialSalvo && ultimoComercialSalvo.id_comercial) registrarPdfComercialGerado();
  else pdfComercialGeradoPendente = true;
  setTimeout(()=>{
    document.title = tituloOriginal;
    limparRadarPrint();
    if(report) report.setAttribute('aria-hidden','true');
  },500);
  return true;
}

function registrarPdfComercialGerado(){
  if(!GAS_URL || !ultimoComercialSalvo || !ultimoComercialSalvo.id_comercial || ultimoComercialSalvo.pdfRegistrado || pdfComercialRegistroEmAndamento) return;
  pdfComercialRegistroEmAndamento = true;

  fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      _token: FRONTEND_TOKEN,
      website: '',
      source: 'comercial_pdf',
      id_comercial: ultimoComercialSalvo.id_comercial,
      email: ultimoComercialSalvo.email,
      pdf_gerado: true
    })
  })
  .then(r => r.json())
  .then(res => {
    if(res.success){
      ultimoComercialSalvo.pdfRegistrado = true;
      pdfComercialGeradoPendente = false;
      console.log('PDF comercial registrado no backend.');
    } else {
      console.warn('Falha ao registrar PDF comercial no backend.', res);
    }
  })
  .catch(err => console.warn('Falha ao registrar PDF comercial no backend.', err))
  .finally(() => {
    pdfComercialRegistroEmAndamento = false;
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
document.querySelectorAll(wizardRadioFields.concat(wizardMultiFields).map(name => 'input[name="' + name + '"]').join(', ')).forEach(el=>{
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
