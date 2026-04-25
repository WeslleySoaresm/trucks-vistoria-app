import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Loader2, Camera, MapPin, X } from 'lucide-react';

export default function DashboardFuncionario({ user }) {
  const [stats, setStats] = useState({ total_vistorias: 0, porcentagem_meta: 0 });
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false); // Iniciamos como false para evitar hidratação incorreta
  const [fotosModal, setFotosModal] = useState(null);

  const META_MENSAL = 20;

  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Busca estatísticas da View
      const { data: dataMeta } = await supabase
        .from('resumo_pessoal_funcionario')
        .select('*')
        .eq('usuario_id', user.id)
        .maybeSingle();
      
      if (dataMeta) {
        setStats({
          total_vistorias: dataMeta.total_vistorias || 0,
          porcentagem_meta: dataMeta.porcentagem_meta || dataMeta.Porcentagem_meta || 0
        });
      }

      // 2. Busca vistorias
      const { data, error } = await supabase
        .from('vistorias')
        .select(`
          id, 
          data_vistoria, 
          veiculo_id, 
          tipo_servico, 
          status, 
          equipe, 
          observacao, 
          localizacao_texto,
          evidencias (url_foto)
        `)
        .eq('usuario_id', user.id)
        .order('data_vistoria', { ascending: false });

      if (error) throw error;

      const formatados = data.map(v => ({
        ...v,
        data_formatada: v.data_vistoria ? new Date(v.data_vistoria).toLocaleDateString('pt-BR') : '---',
        placa: v.veiculo_id,
        todas_fotos: v.evidencias ? v.evidencias.map(e => e.url_foto) : [],
        qtd_fotos: v.evidencias ? v.evidencias.length : 0
      }));

      setVistorias(formatados);
    } catch (err) {
      console.error("Erro ao carregar dados:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // Função para verificar mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Executa imediatamente
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    carregarDados();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [carregarDados]);

  const removerVistoria = async (id) => {
    if (!window.confirm("Excluir esta vistoria permanentemente?")) return;
    const { error } = await supabase.from('vistorias').delete().eq('id', id);
    if (!error) {
      setVistorias(prev => prev.filter(v => v.id !== id));
      setStats(prev => ({ 
        ...prev, 
        total_vistorias: Math.max(0, prev.total_vistorias - 1),
        porcentagem_meta: Math.max(0, ((prev.total_vistorias - 1) / META_MENSAL) * 100)
      }));
    } else {
      alert("Erro ao excluir.");
    }
  };

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível.");
    // Removido o 0 extra e corrigida a interpolação da URL
    const url = loc.includes('http') ? loc : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.cardMeta}>
        <div style={styles.statsNum}>
          <span style={{ ...styles.bigNum, color: stats.porcentagem_meta >= 80 ? '#48bb78' : '#ed8936' }}>
            {stats.total_vistorias}
          </span>
          <span style={styles.subNum}> / {META_MENSAL} vistorias</span>
        </div>
        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${Math.min(stats.porcentagem_meta, 100)}%`, background: stats.porcentagem_meta >= 80 ? '#48bb78' : '#ed8936' }}>
             <span style={styles.progressText}>{Math.round(stats.porcentagem_meta)}%</span>
          </div>
        </div>
      </div>

      <h3 style={{ color: '#fff', marginBottom: '15px' }}>Meu Histórico</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><Loader2 size={40} className="animate-spin" color="#63b3ed" /></div>
      ) : (
        <div style={styles.tableWrapper}>
          {isMobile ? (
            <div style={styles.mobileList}>
              {vistorias.length > 0 ? vistorias.map((reg) => (
                <div key={reg.id} style={styles.mobileCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '18px', color: '#fff' }}>{reg.placa}</strong>
                    <span style={styles.badge}>{reg.equipe}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e0', marginBottom: '10px' }}>
                    <div>📅 {reg.data_formatada}</div>
                    <div>🛠️ {reg.tipo_servico || 'NP'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
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
              )) : <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8'}}>Nenhuma vistoria encontrada.</div>}
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
          {!loading && !isMobile && vistorias.length === 0 && (
            <div style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>Nenhuma vistoria encontrada.</div>
          )}
        </div>
      )}

      {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#fff', margin: 0 }}>Fotos - {fotosModal.placa}</h3>
              <button onClick={() => setFotosModal(null)} style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}}><X /></button>
            </div>
            <div style={styles.galeria}>
              {fotosModal.fotos.length > 0 ? fotosModal.fotos.map((url, i) => (
                <img 
                  key={i}
                  src={supabase.storage.from('vistorias').getPublicUrl(url).data.publicUrl} 
                  style={styles.fotoItem} 
                  alt="vistoria" 
                />
              )) : <p style={{color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center'}}>Nenhuma foto anexada.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageWrapper: { padding: '20px', backgroundColor: '#1a202c', minHeight: '100vh', boxSizing: 'border-box' },
  cardMeta: { background: 'rgba(30, 41, 59, 0.9)', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)' },
  bigNum: { fontSize: '40px', fontWeight: 'bold' },
  subNum: { color: '#94a3b8', fontSize: '14px' },
  progressContainer: { background: '#0f172a', borderRadius: '15px', height: '25px', margin: '15px 0', overflow: 'hidden', position: 'relative' },
  progressBar: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease-out' },
  progressText: { color: '#fff', fontWeight: 'bold', fontSize: '11px', zIndex: 2 },
  tableWrapper: { background: 'rgba(30, 41, 59, 0.95)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.2)', textTransform: 'uppercase' },
  td: { padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#e2e8f0' },
  mobileList: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', width: '100%', boxSizing: 'border-box' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', boxSizing: 'border-box' },
  btnActionMobile: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' },
  badge: { background: 'rgba(49, 130, 206, 0.3)', color: '#90cdf4', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' },
  btnIcon: { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  btnIconDel: { background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#fc8181', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' },
  galeria: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  fotoItem: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }
};