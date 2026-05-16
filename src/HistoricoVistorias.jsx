import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Mantido apenas para gerar a URL pública das imagens do Storage
import { Loader2, Camera, MapPin, X } from 'lucide-react';

// URL da sua API .NET
const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function HistoricoVistorias({ user }) {
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fotosModal, setFotosModal] = useState(null);

  const carregarHistorico = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Busca o histórico geral direto da sua API .NET
      const response = await fetch(`${API_URL}/Vistoria`);
      if (!response.ok) throw new Error("Erro ao conectar com a API");
      
      const data = await response.json();

      // 2. Filtra as vistorias pertencentes ao funcionário logado (Tratando camelCase ou PascalCase)
      const minhasVistorias = data.filter(v => {
        const idDoUsuarioNoBanco = v.usuarioId || v.UsuarioId;
        if (!idDoUsuarioNoBanco || !user.id) return false;
        return String(idDoUsuarioNoBanco).trim().toLowerCase() === String(user.id).trim().toLowerCase();
      });

      // 3. Mapeia e formata os dados vindos do C# para a estrutura da tela
      const formatados = minhasVistorias.map(v => {
        const dataCriacao = v.dataCriacao || v.DataCriacao;
        const placa = v.placa || v.Placa;
        const tipoServico = v.tipoServico || v.TipoServico;
        const equipe = v.equipe || v.Equipe;
        const localizacao = v.localizacao || v.Localizacao;
        const evidencias = v.evidencias || v.Evidencias;

        return {
          id: v.id || v.Id,
          data_formatada: dataCriacao ? new Date(dataCriacao).toLocaleDateString('pt-BR') : '---',
          placa: placa || '---',
          tipo_servico: tipoServico || 'Geral',
          equipe: equipe || '---',
          localizacao_texto: localizacao,
          todas_fotos: evidencias ? evidencias.map(e => e.urlFoto || e.UrlFoto) : [],
          qtd_fotos: evidencias ? evidencias.length : 0
        };
      });

      setVistorias(formatados);
    } catch (err) {
      console.error("Erro ao carregar histórico da API .NET:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível.");
    const url = loc.includes('http') ? loc : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
      <Loader2 className="animate-spin" color="#63b3ed" size={40} />
    </div>
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Meu Histórico</h2>
      
      {vistorias.length === 0 ? (
        <p style={styles.empty}>Nenhuma vistoria encontrada.</p>
      ) : (
        <div style={styles.list}>
          {vistorias.map((reg) => (
            <div key={reg.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.placa}>{reg.placa}</span>
                <span style={styles.badge}>Equipe {reg.equipe}</span>
              </div>
              <div style={styles.details}>
                <div>📅 {reg.data_formatada}</div>
                <div>🛠️ {reg.tipo_servico}</div>
              </div>
              <div style={styles.actions}>
                <button onClick={() => setFotosModal({ fotos: reg.todas_fotos, placa: reg.placa })} style={styles.btn}>
                  <Camera size={16} /> {reg.qtd_fotos} Fotos
                </button>
                <button onClick={() => abrirMapa(reg.localizacao_texto)} style={styles.btnMap}>
                  <MapPin size={16} /> Mapa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Fotos */}
      {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <strong>Placa: {fotosModal.placa}</strong>
              <X onClick={() => setFotosModal(null)} style={{ cursor: 'pointer' }} />
            </div>
            <div style={styles.grid}>
              {fotosModal.fotos.map((url, i) => {
                const finalUrl = url.startsWith('http') 
                  ? url 
                  : supabase.storage.from('vistorias').getPublicUrl(url).data.publicUrl;

                return (
                  <img 
                    key={i} 
                    src={finalUrl} 
                    style={styles.img} 
                    alt="vistoria" 
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Erro+na+Foto'; }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '15px', color: '#fff' },
  title: { fontSize: '20px', marginBottom: '20px' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: '40px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { background: 'rgba(30, 41, 59, 0.7)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  placa: { fontWeight: 'bold', fontSize: '18px' },
  badge: { background: '#2d3748', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' },
  details: { fontSize: '14px', color: '#cbd5e0', marginBottom: '15px' },
  actions: { display: 'flex', gap: '8px' },
  btn: { flex: 1, background: '#3182ce', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' },
  btnMap: { flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '15px', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  img: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }
};