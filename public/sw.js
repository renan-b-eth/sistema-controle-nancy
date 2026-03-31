/**
 * PortãoEdu Service Worker
 * Web Push Notifications + Background Sync
 * @version 1.0.0
 */

const CACHE_NAME = 'portaoedu-v1';

// Install event - skip waiting immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

/**
 * PUSH EVENT - Recebe notificações do backend
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'PortãoEdu',
      body: event.data.text(),
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    };
  }

  const options = {
    body: data.body || 'Nova notificação do PortãoEdu',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    tag: data.tag || 'portaoedu-default',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
    sound: 'default',
    actions: [
      {
        action: 'aceitar',
        title: '✅ Aceitar',
        icon: '/icons/check.png'
      },
      {
        action: 'negar',
        title: '❌ Negar',
        icon: '/icons/x.png'
      }
    ],
    data: {
      entradaId: data.entradaId,
      alunoRA: data.alunoRA,
      alunoNome: data.alunoNome,
      url: data.url || '/adm',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'PortãoEdu - Liberação Pendente',
      options
    )
  );
});

/**
 * NOTIFICATION CLICK - Handler de ações interativas
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action, event.notification);

  const notification = event.notification;
  const data = notification.data || {};
  const entradaId = data.entradaId;
  const alunoNome = data.alunoNome || 'Aluno';

  notification.close();

  // Ação: Aceitar liberação
  if (event.action === 'aceitar') {
    event.waitUntil(
      fetch('/api/adm/entradas/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: entradaId,
          status: 'autorizado'
        })
      })
      .then(response => {
        if (response.ok) {
          console.log('[SW] Liberação aceita:', entradaId);
          // Notificar outras abas
          return notifyClients({
            type: 'LIBERACAO_ACEITA',
            entradaId,
            alunoNome,
            status: 'autorizado'
          });
        }
        throw new Error('Falha ao aceitar liberação');
      })
      .catch(error => {
        console.error('[SW] Erro ao aceitar:', error);
        // Re-notificar em caso de erro
        return self.registration.showNotification(
          'PortãoEdu - Erro',
          {
            body: 'Não foi possível aceitar a liberação. Tente pelo sistema.',
            icon: '/icon-192x192.png',
            tag: 'erro-liberação'
          }
        );
      })
    );
  }

  // Ação: Negar liberação
  else if (event.action === 'negar') {
    event.waitUntil(
      fetch('/api/adm/entradas/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: entradaId,
          status: 'direcao'
        })
      })
      .then(response => {
        if (response.ok) {
          console.log('[SW] Liberação negada:', entradaId);
          return notifyClients({
            type: 'LIBERACAO_NEGADA',
            entradaId,
            alunoNome,
            status: 'direcao'
          });
        }
        throw new Error('Falha ao negar liberação');
      })
      .catch(error => {
        console.error('[SW] Erro ao negar:', error);
      })
    );
  }

  // Clique fora dos botões - Abrir/focar a aba
  else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          const urlToOpen = data.url || '/adm';
          
          // Procurar aba já aberta
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Abrir nova aba se não encontrar
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

/**
 * MESSAGE EVENT - Comunicação com a aplicação
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_SUBSCRIPTION') {
    event.ports[0].postMessage({
      subscription: null // Será preenchido pelo client
    });
  }
});

/**
 * SYNC EVENT - Background Sync para quando voltar online
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entradas') {
    event.waitUntil(syncPendingEntradas());
  }
});

// Função auxiliar: Notificar clients
function notifyClients(message) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clientList => {
      clientList.forEach(client => {
        client.postMessage(message);
      });
    });
}

// Função auxiliar: Sync pendente
async function syncPendingEntradas() {
  // Implementação futura para sync offline
  console.log('[SW] Syncing pending entradas...');
}

// Fetch event - estratégia cache-first para assets
self.addEventListener('fetch', (event) => {
  // Apenas cachear requests GET de assets estáticos
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Não cachear API calls
  if (url.pathname.startsWith('/api/')) return;
  
  // Cachear assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(fetchResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
