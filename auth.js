(function () {
  'use strict';

  const rawConfig = window.AFLOW_INSTANCE_CONFIG && typeof window.AFLOW_INSTANCE_CONFIG === 'object'
    ? window.AFLOW_INSTANCE_CONFIG
    : {};
  const authConfig = rawConfig.supabase_auth && typeof rawConfig.supabase_auth === 'object'
    ? rawConfig.supabase_auth
    : {};

  if (authConfig.enabled !== true) {
    window.AFLOW_AUTH_READY = Promise.resolve(null);
    return;
  }

  let resolveReady;
  let rejectReady;
  let supabaseClient = null;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  window.AFLOW_AUTH_READY = ready;
  ready.catch(() => {});

  window.AFLOW_AUTH_GET_ACCESS_TOKEN = async function () {
    if (!supabaseClient) throw new Error('aflow_auth_session_unavailable');
    const result = await supabaseClient.auth.getSession();
    const session = result && result.data ? result.data.session : null;
    if (result.error || !session || typeof session.access_token !== 'string' || session.access_token === '') {
      throw new Error('aflow_auth_session_unavailable');
    }
    return session.access_token;
  };

  function validProjectUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      return url.protocol === 'https:' && Boolean(url.hostname);
    } catch {
      return false;
    }
  }

  function validPublishableKey(value) {
    return typeof value === 'string' && value.trim().length >= 16;
  }

  function validTenant(value) {
    return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(value);
  }

  function userHasTenantAccess(user, tenant) {
    const appMetadata = user && user.app_metadata && typeof user.app_metadata === 'object'
      ? user.app_metadata
      : {};
    const allowedTenants = Array.isArray(appMetadata.aflow_tenants)
      ? appMetadata.aflow_tenants
      : [];

    return allowedTenants.some((allowedTenant) => (
      typeof allowedTenant === 'string'
      && allowedTenant.trim().toLowerCase() === tenant
    ));
  }

  function getSupabaseSessionStorageKey(projectUrl) {
    try {
      const projectRef = new URL(projectUrl).hostname.split('.')[0];
      return /^[a-z0-9]+$/i.test(projectRef) ? 'sb-' + projectRef + '-auth-token' : '';
    } catch {
      return '';
    }
  }

  function discardInvalidPersistedSession(projectUrl) {
    const storageKey = getSupabaseSessionStorageKey(projectUrl);
    if (!storageKey) return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Storage may be unavailable; the login flow remains available.
    }
  }

  function isInvalidPersistedSessionError(error) {
    const status = Number(error && error.status);
    if (status === 400 || status === 401 || status === 403) return true;
    const message = String(error && error.message || '').toLowerCase();
    return message.includes('unexpected token')
      || message.includes('invalid json')
      || message.includes('invalid session');
  }
  function mountScreen() {
    const screen = document.createElement('section');
    screen.id = 'aflowAuthScreen';
    screen.setAttribute('aria-live', 'polite');
    screen.innerHTML = [
      '<div id="aflowAuthCard">',
      '<div class="aflow-auth-heading"><img class="aflow-auth-mark" src="assets/favicon-32.png" alt=""><h1>AFLOR Flow</h1></div>',
      '<p>Entre com seu e-mail e senha.</p>',
      '<form id="aflowAuthForm">',
      '<label>E-mail<input id="aflowAuthEmail" type="email" autocomplete="email" required></label>',
      '<label>Senha<input id="aflowAuthPassword" type="password" autocomplete="current-password" required></label>',
      '<button type="submit">Entrar</button>',
      '<p id="aflowAuthMessage" role="status"></p>',
      '</form>',
      '</div>'
    ].join('');
    document.body.appendChild(screen);
    return screen;
  }

  function showUnavailable(message) {
    const screen = document.createElement('section');
    screen.id = 'aflowAuthScreen';
    screen.setAttribute('aria-live', 'polite');
    screen.innerHTML = '<div id="aflowAuthCard"><div class="aflow-auth-heading"><img class="aflow-auth-mark" src="assets/favicon-32.png" alt=""><h1>AFLOR Flow</h1></div><p class="aflow-auth-error">' + message + '</p></div>';
    document.body.appendChild(screen);
  }

  function mountLogout(client) {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('aflowAuthLogout')) return;
    const button = document.createElement('button');
    button.id = 'aflowAuthLogout';
    button.type = 'button';
    button.className = 'topbar-action aflow-auth-logout';
    button.setAttribute('aria-label', 'Sair');
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5v14"></path><path d="M15 8l4 4-4 4"></path><path d="M19 12H9"></path><path d="M5 5h4"></path><path d="M5 19h4"></path></svg><span>Sair</span>';
    button.addEventListener('click', async function () {
      button.disabled = true;
      try {
        await client.auth.signOut();
      } finally {
        window.location.reload();
      }
    });
    actions.appendChild(button);
  }

  function release(session, client, screen) {
    if (screen && screen.parentNode) screen.parentNode.removeChild(screen);
    mountLogout(client);
    resolveReady(session);
  }

  function failClosed(message) {
    showUnavailable(message);
    rejectReady(new Error('aflow_auth_unavailable'));
  }

  async function initialize() {
    const projectUrl = String(authConfig.url || '').trim();
    const publishableKey = String(authConfig.publishable_key || '').trim();
    const tenant = String(rawConfig.tenant || '').trim().toLowerCase();
    let tenantAccessDenied = false;

    if (!validProjectUrl(projectUrl) || !validPublishableKey(publishableKey) || !validTenant(tenant)) {
      failClosed('Acesso indisponível.');
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      failClosed('Acesso indisponível.');
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(projectUrl, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });

      const sessionResult = await supabaseClient.auth.getSession();
      if (sessionResult.error) {
        if (isInvalidPersistedSessionError(sessionResult.error)) {
          discardInvalidPersistedSession(projectUrl);
        } else {
          throw sessionResult.error;
        }
      } else if (sessionResult.data && sessionResult.data.session && sessionResult.data.session.access_token) {
        const userResult = await supabaseClient.auth.getUser();

        if (userResult.error) {
          if (isInvalidPersistedSessionError(userResult.error)) {
            discardInvalidPersistedSession(projectUrl);
          } else {
            throw userResult.error;
          }
        } else if (!userResult.data || !userResult.data.user) {
          discardInvalidPersistedSession(projectUrl);
        } else if (userHasTenantAccess(userResult.data.user, tenant)) {
          release(sessionResult.data.session, supabaseClient, null);
          return;
        } else {
          tenantAccessDenied = true;
        }
      }
    } catch {
      failClosed('Acesso indisponível.');
      return;
    }

    const screen = mountScreen();
    const form = document.getElementById('aflowAuthForm');
    const email = document.getElementById('aflowAuthEmail');
    const password = document.getElementById('aflowAuthPassword');
    const message = document.getElementById('aflowAuthMessage');
    const submit = form.querySelector('button[type="submit"]');

    if (tenantAccessDenied) {
      message.textContent = 'Seu usuário não possui acesso a este ambiente.';
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      message.textContent = '';
      submit.disabled = true;

      try {
        const result = await supabaseClient.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value,
        });

        if (result.error || !result.data || !result.data.session || !result.data.user) {
          throw result.error || new Error('login_failed');
        }

        if (!userHasTenantAccess(result.data.user, tenant)) {
          password.value = '';
          message.textContent = 'Seu usuário não possui acesso a este ambiente.';
          submit.disabled = false;
          return;
        }

        release(result.data.session, supabaseClient, screen);
      } catch {
        password.value = '';
        message.textContent = 'Não foi possível entrar. Verifique seus dados.';
        submit.disabled = false;
      }
    });
  }

  initialize();
}());