import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Loader2, Camera, MapPin, X } from 'lucide-react';

export default function HistoricoVistorias({ user }) {
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fotosModal, setFotosModal] = useState(null);

  const carregarHistorico = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vistorias')
        .select(`id, data_vistoria, veiculo_id, tipo_servico, equipe, localizacao_texto, evidencias (url_foto)`)
        .eq('usuario_id', user.id)
        .order('data_vistoria', { ascending: false });

      if (error) throw error;

      setVistorias(data.map(v => ({
        ...v,
        data_formatada: v.data_vistoria ? new Date(v.data_vistoria).toLocaleDateString('pt-BR') : '---',
        placa: v.veiculo_id,
        todas_fotos: v.evidencias ? v.evidencias.map(e => e.url_foto) : [],
        qtd_fotos: v.evidencias ? v.evidencias.length : 0
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

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
                <span style={styles.badge}>{reg.equipe}</span>
              </div>
              <div style={styles.details}>
                <div>📅 {reg.data_formatada}</div>
                <div>🛠️ {reg.tipo_servico}</div>
              </div>
              <div style={styles.actions}>
                <button onClick={() => setFotosModal({ fotos: reg.todas_fotos, placa: reg.placa })} style={styles.btn}>
                  <Camera size={16} /> {reg.qtd_fotos} Fotos
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
              <strong>{fotosModal.placa}</strong>
              <X onClick={() => setFotosModal(null)} style={{ cursor: 'pointer' }} />
            </div>
            <div style={styles.grid}>
              {fotosModal.fotos.map((url, i) => (
                <img key={i} src={supabase.storage.from('vistorias').getPublicUrl(url).data.publicUrl} style={styles.img} alt="vistoria" />
              ))}
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
  btn: { width: '100%', background: '#3182ce', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '15px', width: '90%', maxWidth: '400px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  img: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }
};