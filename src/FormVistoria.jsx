import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Mantido para suporte a URLs do Storage
import { Trash2, Loader2, Camera, MapPin, X } from 'lucide-react';

// URL da sua API .NET (Certifique-se de que o CORS no Render permite a Vercel)
const API_URL = 'https://trucks-vistoria-app-1.onrender.com'; 

export default function DashboardFuncionario({ user }) {
  const [stats, setStats] = useState({ total_vistorias: 0, porcentagem_meta: 0 });
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [fotosModal, setFotosModal] = useState(null);

  const META_MENSAL = 20;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Busca vistorias da API .NET
      // Importante: O endpoint no seu C# é /api/Vistoria
      const response = await fetch(`${API_URL}/api/Vistoria`);
      if (!response.ok) throw new Error("Erro ao conectar com a API");
      
      const data = await response.json();

      // Filtra as vistorias pertencentes ao usuário logado (C# retorna usuarioId em camelCase)
      const minhasVistorias = data.filter(v => v.usuarioId === user.id);

      const formatados = minhasVistorias.map(v => ({
        id: v.id,
        data_formatada: v.dataCriacao ? new Date(v.dataCriacao).toLocaleDateString('pt-BR') : '---',
        placa: v.placa,
        tipo_servico: v.tipoServico,
        status: v.status,
        equipe: v.equipe,
        observacao: v.observacao,
        localizacao_texto: v.localizacao,
        // Mapeia a lista de objetos de evidências do C# para uma lista de strings (URLs)
        todas_fotos: v.evidencias ? v.evidencias.map(e => e.urlFoto) : [],
        qtd_fotos: v.evidencias ? v.evidencias.length : 0
      }));

      setVistorias(formatados);

      // 2. Cálculo das Estatísticas
      const total = formatados.length;
      setStats({
        total_vistorias: total,
        porcentagem_meta: (total / META_MENSAL) * 100
      });

    } catch (err) {
      console.error("Erro ao carregar dados da API .NET:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    carregarDados();
    return () => window.removeEventListener('resize', checkMobile);
  }, [carregarDados]);

  const removerVistoria = async (id) => {
    if (!window.confirm("Excluir esta vistoria permanentemente?")) return;
    
    try {
      // Chama o DELETE da sua API C# (api/Vistoria/{id})
      const response = await fetch(`${API_URL}/api/Vistoria/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setVistorias(prev => prev.filter(v => v.id !== id));
        setStats(prev => {
          const novoTotal = Math.max(0, prev.total_vistorias - 1);
          return { 
            ...prev, 
            total_vistorias: novoTotal,
            porcentagem_meta: (novoTotal / META_MENSAL) * 100
          };
        });
      } else {
        alert("Erro ao excluir no servidor.");
      }
    } catch (err) {
      console.error("Erro ao remover:", err);
    }
  };

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível.");
    // Correção na montagem da URL do Google Maps
    const url = loc.includes('http') ? loc : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={styles.pageWrapper}>
      {/* CARD DE META */}
      <div style={styles.cardMeta}>
        <div style={styles.statsNum}>
          <span style={{ ...styles.bigNum, color: stats.porcentagem_meta >= 80 ? '#48bb78' : '#ed8936' }}>
            {stats.total_vistorias}
          </span>
          <span style={styles.subNum}> / {META_MENSAL} vistorias</span>
        </div>
        <div style={styles.progressContainer}>
          <div style={{ 
            ...styles.progressBar, 
            width: `${Math.min(stats.porcentagem_meta, 100)}%`, 
            background: stats.porcentagem_meta >= 80 ? '#48bb78' : '#ed8936' 
          }}>
             <span style={styles.progressText}>{Math.round(stats.porcentagem_meta)}%</span>
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          {stats.total_vistorias >= META_MENSAL 
            ? "Objetivo alcançado!" 
            : `Faltam ${META_MENSAL - stats.total_vistorias} para o objetivo.`}
        </p>
      </div>

      <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '18px' }}>Meu Histórico</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" color="#63b3ed" /></div>
      ) : (
        <div style={styles.tableWrapper}>
          {isMobile ? (
            <div style={styles.mobileList}>
              {vistorias.length > 0 ? vistorias.map((reg) => (
                <div key={reg.id} style={styles.mobileCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ color: '#fff' }}>{reg.placa}</strong>
                    <span style={styles.badge}>{reg.equipe || 'Equipe'}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e0', marginBottom: '12px' }}>
                    <div>📅 {reg.data_formatada}</div>
                    <div>🛠️ {reg.tipo_servico || 'Geral'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setFotosModal({ fotos: reg.todas_fotos, placa: reg.placa })} style={styles.btnActionMobile}>
                      <Camera size={14} /> {reg.qtd_fotos}
                    </button>
                    <button onClick={() => abrirMapa(reg.localizacao_texto)} style={styles.btnActionMobile}>
                      <MapPin size={14} /> Mapa
                    </button>
                    <button onClick={() => removerVistoria(reg.id)} style={{ ...styles.btnActionMobile, color: '#fc8181' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhum registro encontrado.</div>}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Placa</th>
                  <th style={styles.th}>Serviço</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vistorias.map((reg) => (
                  <tr key={reg.id}>
                    <td style={styles.td}>{reg.data_formatada}</td>
                    <td style={styles.td}><strong>{reg.placa}</strong></td>
                    <td style={styles.td}>{reg.tipo_servico}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setFotosModal({ fotos: reg.todas_fotos, placa: reg.placa })} style={styles.btnIcon}>📷</button>
                        <button onClick={() => abrirMapa(reg.localizacao_texto)} style={styles.btnIcon}>📍</button>
                        <button onClick={() => removerVistoria(reg.id)} style={styles.btnIconDel}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL DE FOTOS */}
      {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#fff', margin: 0 }}>Placa: {fotosModal.placa}</h3>
              <button onClick={() => setFotosModal(null)} style={{background: 'none', border: 'none', color: '#fff'}}><X /></button>
            </div>
            <div style={styles.galeria}>
              {fotosModal.fotos.map((url, i) => {
                // Se a URL já for completa (HTTP), usa ela. Se for só o nome do arquivo, gera via Supabase.
                const finalUrl = url.startsWith('http') 
                  ? url 
                  : supabase.storage.from('vistorias').getPublicUrl(url).data.publicUrl;

                return (
                  <img 
                     key={i} 
                     src={finalUrl} 
                     style={styles.fotoItem} 
                     alt="evidencia" 
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
  pageWrapper: { padding: '20px', backgroundColor: '#1a202c', minHeight: '100vh', width: '100%', boxSizing: 'border-box' },
  cardMeta: { background: 'rgba(30, 41, 59, 0.9)', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)' },
  bigNum: { fontSize: '40px', fontWeight: 'bold' },
  subNum: { color: '#94a3b8', fontSize: '14px' },
  progressContainer: { background: '#0f172a', borderRadius: '15px', height: '25px', margin: '15px 0', overflow: 'hidden' },
  progressBar: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' },
  progressText: { color: '#fff', fontWeight: 'bold', fontSize: '11px' },
  tableWrapper: { background: 'rgba(30, 41, 59, 0.95)', borderRadius: '20px', overflow: 'hidden', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.2)' },
  td: { padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#e2e8f0' },
  mobileList: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' },
  btnActionMobile: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px' },
  badge: { background: 'rgba(49, 130, 206, 0.3)', color: '#90cdf4', padding: '4px 10px', borderRadius: '6px', fontSize: '10px' },
  btnIcon: { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  btnIconDel: { background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#fc8181', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' },
  galeria: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  fotoItem: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }
};