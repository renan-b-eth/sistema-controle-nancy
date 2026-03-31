'use client';

import { useEffect } from 'react';

/**
 * Componente de Registro do Service Worker
 * Responsável por registrar o SW e gerenciar subscriptions Push
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service Workers não suportados');
      return;
    }

    let isSubscribed = false;

    async function registerServiceWorker() {
      try {
        // Registrar Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        console.log('[SW] Registrado:', registration.scope);

        // Aguardar ativação
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[SW] Novo SW ativado');
                setupPushNotifications(registration);
              }
            });
          }
        });

        // Se já estiver ativo, configurar push
        if (registration.active) {
          setupPushNotifications(registration);
        }

        // Escutar mensagens do SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[SW] Mensagem recebida:', event.data);
          
          // Reagir a liberações
          if (event.data.type === 'LIBERACAO_ACEITA') {
            // Tocar som de confirmação
            playNotificationSound('success');
          }
          if (event.data.type === 'LIBERACAO_NEGADA') {
            playNotificationSound('error');
          }
        });

      } catch (error) {
        console.error('[SW] Erro ao registrar:', error);
      }
    }

    async function setupPushNotifications(registration: ServiceWorkerRegistration) {
      // Verificar se já tem subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('[SW] Subscription existente encontrada');
        await saveSubscription(existingSubscription);
        isSubscribed = true;
        return;
      }

      // Solicitar permissão de notificação
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('[SW] Permissão de notificação negada');
        return;
      }

      // Criar nova subscription
      try {
        // VAPID public key - substituir pela sua chave pública
        const applicationServerKey = urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
          'BEl62iSMgV_DAv8h0J0D8D5bU6y0cC1g_y4lU9-3W0G1XbY9g5n9m5u5n8m7n9s5h8g5r8e5w8q9w8e9r8t9y0u1i2o3p4a5s6d7f8g9h0j'
        );

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });

        console.log('[SW] Nova subscription criada');
        await saveSubscription(subscription);
        isSubscribed = true;

      } catch (error) {
        console.error('[SW] Erro ao criar subscription:', error);
      }
    }

    async function saveSubscription(subscription: PushSubscription) {
      try {
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subscription })
        });

        if (!response.ok) {
          throw new Error('Falha ao salvar subscription');
        }

        const data = await response.json();
        console.log('[SW] Subscription salva:', data);

      } catch (error) {
        console.error('[SW] Erro ao salvar subscription:', error);
      }
    }

    function playNotificationSound(type: 'success' | 'error' | 'default') {
      try {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback para Web Audio API
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          if (type === 'success') {
            osc.frequency.value = 880; // A5
          } else if (type === 'error') {
            osc.frequency.value = 220; // A3
          } else {
            osc.frequency.value = 440; // A4
          }
          
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        });
      } catch (e) {
        console.log('[SW] Não foi possível tocar som:', e);
      }
    }

    // Helper para converter VAPID key
    function urlBase64ToUint8Array(base64String: string): Uint8Array {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
      
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      
      return outputArray;
    }

    // Registrar após carregamento
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // Cleanup
    return () => {
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  return null; // Componente não renderiza nada visual
}
