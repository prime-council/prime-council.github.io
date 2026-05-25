const WHATSAPP_URL = 'https://wa.me/5519992402233?text=Ol%C3%A1%2C%20equipe%20Prime%20Council.%20Acabei%20de%20preencher%20minha%20inscri%C3%A7%C3%A3o%20para%20a%20Sess%C3%A3o%20Executiva%20Prime%20e%20gostaria%20de%20receber%20os%20dados%20oficiais%20de%20pagamento%20e%20confirmar%20os%20pr%C3%B3ximos%20passos.';
const FRONTEND_TOKEN = 'prime2026-f7c9a3d41e8b4c2fa6d9b0e73a2c8f51';

// SUBSTITUIR PELOS DADOS OFICIAIS DE PAGAMENTO PRIME.
const PIX_CHAVE_OFICIAL = '00020126580014BR.GOV.BCB.PIX013603c7a785-3230-4710-a2ba-b3da0a6734e35204000053039865406960.005802BR5925PRIME OSHI SERVICOS E TRE6009SAO PAULO61080540900062250521mH0GrEHihcJzu4Ocdiimm6304A398';
const PIX_FALLBACK_MSG = 'Dados de pagamento serão enviados pela equipe Prime Council.';

// [SEGURANÇA 4] Flag de controle de duplo submit
let isSubmitting = false;

let currentStep = 1;

function $(id){return document.getElementById(id)}

function setProgress(step){
  for(let i=1;i<=4;i++){
    const dot=$('dot'+i);
    const label=document.querySelectorAll('.step-label')[i-1];
    dot.className='step-dot'+(i<step?' done':i===step?' active':'');
    label.className='step-label'+(i<step?' done':i===step?' active':'');
    if(i<4){
      const line=$('line'+i);
      line.className='progress-line'+(i<step?' done':'');
    }
  }
}

function showStep(n){
  document.querySelectorAll('.step-panel').forEach(p=>p.classList.remove('active'));
  $('step'+n).classList.add('active');
  $('btnBack').style.visibility=n===1?'hidden':'visible';
  const btn=$('btnNext');
  if(n===4){
    btn.innerHTML='Confirmar minha inscrição <div class="spinner" id="spinner"></div>';
    btn.className='btn-next gold';
  } else {
    btn.innerHTML='Próximo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg><div class="spinner" id="spinner"></div>';
    btn.className='btn-next';
  }
  setProgress(n);
  window.scrollTo({top:0,behavior:'smooth'});
}

function validate(step){
  let ok=true;
  if(step===1){
    ok=req('nome','f-nome','Informe seu nome completo.')&&ok;
    ok=reqEmail('email','f-email')&&ok;
    ok=reqPhone('whatsapp','f-whatsapp')&&ok;
  }
  if(step===2){
    ok=req('empresa','f-empresa','Informe o nome da empresa.')&&ok;
    ok=req('cidade','f-cidade','Informe a cidade.')&&ok;
    ok=reqSel('estado','f-estado','Selecione o estado.')&&ok;
    ok=reqSel('cargo','f-cargo','Selecione sua posição.')&&ok;
    ok=reqSel('setor','f-setor','Selecione o setor.')&&ok;
  }
  if(step===3){
    ok=reqSel('colaboradores','f-colaboradores','Selecione o porte da equipe.')&&ok;
    ok=reqRadio('desafio','f-desafio','Selecione o principal desafio.')&&ok;
    ok=reqRadio('gestao','f-gestao','Selecione a estrutura de gestão.')&&ok;
    ok=reqSel('faturamento','f-faturamento','Selecione a faixa de faturamento.')&&ok;
  }
  if(step===4){
    const cb=$('confirmacao');
    const cerr=$('confirm-err');
    if(!cb.checked){cerr.textContent='Confirme a declaração para concluir.';cerr.style.display='block';ok=false;}
    else{cerr.style.display='none';}
  }
  return ok;
}

function req(id,fid,msg){
  const el=$(id),f=$(fid);
  if(!el.value.trim()){
    f.classList.add('has-error');
    f.querySelector('.err-msg').textContent=msg;
    return false;
  }
  f.classList.remove('has-error');return true;
}
function reqEmail(id,fid){
  const el=$(id),f=$(fid);
  const ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
  if(!ok){
    f.classList.add('has-error');
    const m=f.querySelector('.err-msg');
    if(m)m.textContent='Informe um e-mail válido.';
  }else{f.classList.remove('has-error');}
  return ok;
}
function reqPhone(id,fid){
  const el=$(id),f=$(fid);
  const digits=el.value.replace(/\D/g,'');
  const ok=digits.length===11 && digits[2]==='9';
  if(!ok){
    f.classList.add('has-error');
    const m=f.querySelector('.err-msg');
    if(m)m.textContent=digits.length!==11?'Informe um celular válido com DDD (11 dígitos).':'Informe um celular válido (com 9 após o DDD).';
  }else{f.classList.remove('has-error');}
  return ok;
}
function reqSel(id,fid,msg){
  const el=$(id),f=$(fid);
  if(!el.value){
    f.classList.add('has-error');
    if(f.querySelector('.err-msg'))f.querySelector('.err-msg').textContent=msg;
    return false;
  }
  f.classList.remove('has-error');return true;
}
function reqRadio(name,fid,msg){
  const checked=document.querySelector('input[name="'+name+'"]:checked');
  const f=$(fid);
  if(!checked){
    f.classList.add('has-error');
    f.querySelector('.err-msg').textContent=msg;
    return false;
  }
  f.classList.remove('has-error');return true;
}

function nextStep(){
  if(!validate(currentStep))return;
  if(currentStep<4){currentStep++;showStep(currentStep);}
  else{submitForm();}
}
function prevStep(){if(currentStep>1){currentStep--;showStep(currentStep);}}

document.querySelectorAll('.radio-opt').forEach(opt=>{
  opt.addEventListener('click',function(){
    const input=this.querySelector('input[type=radio]');
    const name=input.name;
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.closest('.radio-opt').classList.remove('selected');
    });
    this.classList.add('selected');
    input.checked=true;
    const fid='f-'+name;
    if($(fid))$(fid).classList.remove('has-error');
  });
});

$('whatsapp').addEventListener('input',function(){
  let digits = this.value.replace(/\D/g, '');

  if (digits.length > 11) digits = digits.slice(0, 11);

  if (digits.length <= 2) {
    this.value = digits ? '(' + digits : '';
  } else if (digits.length <= 7) {
    this.value = '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
  } else {
    this.value = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + ' ' + digits.slice(7);
  }
});

function copyPix(){
  const pixKey = document.getElementById('pix-chave');
  const text = (
    PIX_CHAVE_OFICIAL ||
    (pixKey && pixKey.dataset ? pixKey.dataset.pixCode : '') ||
    (pixKey ? pixKey.textContent : '')
  ).trim();
  if(!text)return;
  const btn=document.querySelector('.pix-copy-btn');
  const showFeedback = copied => {
    if(!btn)return;
    const original=btn.textContent;
    btn.textContent=copied?'Copiado':'Copiar';
    setTimeout(()=>{btn.textContent=original;},2000);
  };
  const fallbackCopy = () => {
    const field=document.createElement('textarea');
    field.value=text;
    field.setAttribute('readonly','');
    field.style.position='fixed';
    field.style.left='-9999px';
    field.style.top='0';
    document.body.appendChild(field);
    field.select();
    let copied=false;
    try{
      copied=document.execCommand('copy');
    }catch(_err){
      copied=false;
    }
    document.body.removeChild(field);
    showFeedback(copied);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>{
      showFeedback(true);
    }).catch(()=>{
      fallbackCopy();
    });
    return;
  }
  fallbackCopy();
}

// [SEGURANÇA 6] Sanitização básica: remove caracteres perigosos de strings antes do envio
function sanitize(str){
  if(typeof str !== 'string') return str;
  // [SEGURANÇA 8] Sanitização ampliada: remove tags HTML, protocolos perigosos e event handlers
  str = str.replace(/<[^>]*>/gi, '');            // tags HTML (<script>, <img>, etc)
  str = str.replace(/javascript\s*:/gi, '');     // protocolo javascript:
  str = str.replace(/data\s*:/gi, '');           // protocolo data:
  str = str.replace(/on\w+\s*=/gi, '');          // event handlers (onerror=, onclick=, etc)
  str = str.replace(/[<>{}"]/g, '');            // caracteres estruturais remanescentes
  return str.trim();
}

function getRadioVal(name){
  const c=document.querySelector('input[name="'+name+'"]:checked');
  if(!c)return '';
  return c.value;
}

function getSafeValue(id){
  const el = $(id);
  return el ? sanitize(el.value || '') : '';
}

function getFirstSafeValue(ids){
  for(let i = 0; i < ids.length; i++){
    const value = getSafeValue(ids[i]);
    if(value) return value;
  }
  return '';
}

function normalizeLabel(text){
  return sanitize(String(text || '').replace(/\s+/g, ' ').trim());
}

function getSelectedOptionLabel(id){
  const el = $(id);
  if(!el || el.tagName !== 'SELECT') return '';
  const opt = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
  if(!opt || !el.value) return '';
  return normalizeLabel(opt.textContent);
}

function getSelectedRadioLabel(name){
  const c = document.querySelector('input[name="'+name+'"]:checked');
  if(!c) return '';
  const opt = c.closest('.radio-opt');
  return opt ? normalizeLabel(opt.textContent) : sanitize(c.value || '');
}

function getFirstSelectedOptionLabel(ids){
  for(let i = 0; i < ids.length; i++){
    const value = getSelectedOptionLabel(ids[i]);
    if(value) return value;
  }
  return '';
}

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxNYq9rDo_iI-7iTJZcsHMYnpga1pVCRhkCBcBb5ZZfWP8XCwbRPREtX1t_u49Mmew/exec';

function showSuccessScreen(){
  $('mainCard').style.display='none';
  $('btnNav').style.display='none';
  $('successScreen').classList.add('visible');
  setProgress(5);
}

function showSubmitError(message){
  const formErr = $('form-err');
  if(formErr){
    formErr.textContent = message || 'Não foi possível confirmar sua inscrição automaticamente. Revise os dados e tente novamente em instantes.';
    formErr.style.display = 'block';
  }
}

async function submitForm(){
  // [SEGURANÇA 4] Bloqueia duplo submit
  if(isSubmitting) return;

  isSubmitting = true;
  const formErr=$('form-err');
  if(formErr){formErr.textContent='';formErr.style.display='none';}

  const honeypot = $('hp_website');
  if(honeypot && honeypot.value.trim()){
    showSuccessScreen();
    return;
  }

  // Envio ao backend — não bloqueia experiência do usuário
  const payload = {
    _token:           FRONTEND_TOKEN,
    website:          honeypot ? sanitize(honeypot.value) : '',
    source:           'inscricao',
    tipo:             'inscricao',
    origem:           'prime-form',
    versao:           'v1',
    asset:            'prime',
    nome:             sanitize($('nome').value),
    empresa:          sanitize($('empresa').value),
    cargo:            sanitize($('cargo').value),
    email:            sanitize($('email').value),
    whatsapp:         sanitize($('whatsapp').value),
    cidade:           sanitize($('cidade').value),
    estado:           sanitize($('estado').value),
    setor:                 getSelectedOptionLabel('setor'),
    numero_colaboradores:  getSelectedOptionLabel('colaboradores'),
    desafio_estrategico:   getSelectedRadioLabel('desafio'),
    estrutura_gestao:      getSelectedRadioLabel('gestao'),
    faturamento_anual:     getSelectedOptionLabel('faturamento'),
    origem_evento:         getFirstSelectedOptionLabel(['origem_evento', 'como_soube', 'origem']),
    aceite_pagamento: $('confirmacao').checked === true,
    aceite_lgpd:      $('confirmacao').checked === true
  };

  const whatsappMsg = encodeURIComponent(
    `Olá, equipe Prime Council. Acabei de preencher minha inscrição para a Sessão Executiva Prime.

Nome: ${payload.nome}
Empresa: ${payload.empresa}
E-mail: ${payload.email}
WhatsApp: ${payload.whatsapp}

Gostaria de conversar e receber informações adicionais sobre o Ecossistema Prime Council.`
  );

  const whatsappBtn = document.querySelector('.success-actions .btn-gold');

  if (whatsappBtn) {
    whatsappBtn.href = `https://wa.me/5519992402233?text=${whatsappMsg}`;
  }

  fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(res => {
      if(res && res.success === true){
        console.log('Inscrição registrada no backend.');
        showSuccessScreen();
      } else {
        console.warn('Falha ao registrar inscrição no backend.', res && res.message ? res.message : res);
        showSubmitError('Não foi possível confirmar sua inscrição automaticamente. Revise os dados e tente novamente em instantes.');
        isSubmitting = false;
      }
    })
    .catch(err => {
      console.warn('Falha ao registrar inscrição no backend.', err);
      showSubmitError('Não foi possível confirmar sua inscrição automaticamente. Revise os dados e tente novamente em instantes.');
      isSubmitting = false;
    });
}
