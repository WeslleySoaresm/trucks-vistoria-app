import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Camera, MapPin, CheckCircle, MessageCircle } from 'lucide-react';

const ItemFAQ = ({ pergunta, resposta, icone: Icone }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div style={s.itemContainer} onClick={() => setAberto(!aberto)}>
      <div style={s.perguntaRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Ícone com a cor azul neon do tema */}
          {Icone && <Icone size={20} color="#63b3ed" />}
          <span style={s.perguntaTexto}>{pergunta}</span>
        </div>
        <div style={{ color: '#718096', display: 'flex' }}>
          {aberto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      {aberto && (
        <div style={s.respostaContainer}>
          <p style={s.respostaTexto}>{resposta}</p>
        </div>
      )}
    </div>
  );
};

export default function Instrucoes() {
  
  // --- LÓGICA DO BOTÃO DE SUPORTE ---
  const abrirChatSuporte = () => {
    const numeroGestor = "+351966280773"; 
    const mensagem = "Olá, estou usando o App de Vistorias e preciso de suporte.";
    const urlChat = `https://wa.me/${numeroGestor}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(urlChat, '_blank');
  };

  return (
    <div style={s.container}>
      <header style={s.header}>
        <HelpCircle size={28} color="#63b3ed" />
        <h2 style={s.titulo}>Guia da Equipe</h2>
      </header>

      <div style={s.faqWrapper}>
        <ItemFAQ 
          icone={CheckCircle}
          pergunta="Como registrar uma vistoria?" 
          resposta="Vá na aba 'Nova', selecione sua equipe (ex: 812), digite a placa do veículo e tire a foto. O sistema salvará automaticamente após o upload." 
        />
        
        <ItemFAQ 
          icone={MapPin}
          pergunta="Por que o sistema pede minha localização?" 
          resposta="A localização é usada para comprovar que a vistoria foi feita no local correto. Certifique-se de permitir o acesso ao GPS no seu navegador." 
        />

        <ItemFAQ 
          icone={Camera}
          pergunta="A foto não está carregando, o que fazer?" 
          resposta="Verifique se você tem sinal de internet. Se estiver em local sem sinal, aguarde chegar em uma área melhor para enviar. Tente também limpar o cache do navegador." 
        />

        <ItemFAQ 
          icone={HelpCircle}
          pergunta="Como vejo minha meta?" 
          resposta="Na aba 'Meta', você acompanha quantas vistorias já fez no mês e quanto falta para atingir o objetivo de 20 vistorias." 
        />
      </div>

      {/* RODAPÉ COM BOTÃO DE SUPORTE */}
      <div style={s.footer}>
        <p style={s.textoRodape}>Dúvidas urgentes ou problemas técnicos?</p>
        <button onClick={abrirChatSuporte} style={s.btnSuporte}>
          <MessageCircle size={20} color="#fff" />
          Falar com o Gestor
        </button>
      </div>
    </div>
  );
}

const s = {
  container: { 
    padding: '40px 20px', 
    backgroundColor: '#1a202c', // Fundo escuro padrão do dashboard
    minHeight: '100vh', 
    fontFamily: '"Inter", sans-serif',
    boxSizing: 'border-box'
  },
  header: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    marginBottom: '30px',
    justifyContent: 'center'
  },
  titulo: { 
    fontSize: '28px', 
    margin: 0, 
    color: '#ffffff', 
    fontWeight: '800',
    letterSpacing: '-0.5px'
  },
  faqWrapper: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  itemContainer: { 
    background: 'rgba(30, 41, 59, 0.85)', // Fundo Glassmorphism
    borderRadius: '16px', 
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'all 0.2s ease-in-out'
  },
  perguntaRow: { 
    padding: '20px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  perguntaTexto: { 
    fontWeight: '600', 
    fontSize: '15px', 
    color: '#e2e8f0' // Cinza clarinho/branco
  },
  respostaContainer: { 
    padding: '0 20px 20px 20px', 
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)' // Leve escurecida na resposta
  },
  respostaTexto: { 
    fontSize: '14px', 
    color: '#cbd5e0', 
    lineHeight: '1.6', 
    margin: '15px 0 0 0' 
  },
  
  footer: { 
    marginTop: '40px', 
    textAlign: 'center', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: '15px',
    padding: '30px 20px',
    background: 'rgba(30, 41, 59, 0.6)', // Glassmorphism mais transparente
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    maxWidth: '800px',
    margin: '40px auto 0 auto'
  },
  textoRodape: { 
    margin: 0, 
    color: '#a0aec0', 
    fontSize: '14px', 
    fontWeight: '500' 
  },
  btnSuporte: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#25D366', // Verde Oficial WhatsApp
    color: '#ffffff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 8px 20px -6px rgba(37, 211, 102, 0.5)', // Glow Verde
    transition: 'transform 0.2s, boxShadow 0.2s',
    outline: 'none'
  }
};