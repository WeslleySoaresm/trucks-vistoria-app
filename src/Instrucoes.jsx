import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Camera, MapPin, CheckCircle } from 'lucide-react';

const ItemFAQ = ({ pergunta, resposta, icone: Icone }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div style={s.itemContainer} onClick={() => setAberto(!aberto)}>
      <div style={s.perguntaRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icone && <Icone size={18} color="#007bff" />}
          <span style={s.perguntaTexto}>{pergunta}</span>
        </div>
        {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
  return (
    <div style={s.container}>
      <header style={s.header}>
        <HelpCircle size={24} color="#007bff" />
        <h2 style={s.titulo}>Guia da Equipe</h2>
      </header>

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

      <div style={s.footer}>
        <p>Dúvidas urgentes? Fale com o Gestor via WhatsApp.</p>
      </div>
    </div>
  );
}

const s = {
  container: { padding: '15px', background: '#f4f7f6', minHeight: '80vh' },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  titulo: { fontSize: '20px', margin: 0, color: '#333' },
  itemContainer: { 
    background: '#fff', 
    borderRadius: '10px', 
    marginBottom: '10px', 
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    overflow: 'hidden'
  },
  perguntaRow: { 
    padding: '15px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  perguntaTexto: { fontWeight: 'bold', fontSize: '15px', color: '#444' },
  respostaContainer: { padding: '0 15px 15px 15px', borderTop: '1px solid #eee' },
  respostaTexto: { fontSize: '14px', color: '#666', lineHeight: '1.5', margin: '10px 0 0 0' },
  footer: { marginTop: '30px', textAlign: 'center', color: '#999', fontSize: '12px' }
};