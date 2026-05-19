// chatUtils.js

// 1. Função para emitir o som de notificação usando a Web Audio API do navegador
export const tocarSomNotificacao = () => {
  try {
    // Cria o contexto de áudio do navegador
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Cria um oscilador (gerador de ondas sonoras) e um ganho (controle de volume)
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Tipo de onda senoidal (som limpo de "bip")
    oscillator.type = 'sine';
    
    // Frequência do som (800Hz é um tom agudo agradável para chat)
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    
    // Controla o volume para fazer um efeito fade-out (suave)
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    // Inicializa e para o som em 150 milissegundos (um estalo rápido)
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (err) {
    console.warn("Ambiente do navegador bloqueou a reprodução automática de áudio:", err);
  }
};

// 2. Função para acionar o motor de vibração física do dispositivo (Celulares/Tabelts Android)
export const vibrarDispositivo = () => {
  // Verifica se o navegador atual dá suporte para a API de vibração
  if ('vibrate' in navigator) {
    // Vibra por 100ms, pausa 50ms, e vibra mais 100ms (padrão de mensagem dupla)
    navigator.vibrate([100, 50, 100]);
  }
};