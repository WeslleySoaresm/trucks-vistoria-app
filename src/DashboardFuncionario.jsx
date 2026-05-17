import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient'; 
import { Trash2, Loader2, Camera, MapPin, X, FileDown, CheckCircle2, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function DashboardFuncionario({ user }) {
  const [stats, setStats] = useState({ total_vistorias: 0, porcentagem_meta: 0 });
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [fotosModal, setFotosModal] = useState(null);

  // NOVO ESTADO PARA AS NOTIFICAÇÕES TOAST VISUAIS
  const [notificacao, setNotificacao] = useState({ exibir: false, tipo: '', mensagem: '' });

  const META_MENSAL = 20;

  // FUNÇÃO AUXILIAR PARA DISPARAR A NOTIFICAÇÃO
  const dispararNotificacao = (tipo, mensagem) => {
    setNotificacao({ exibir: true, tipo, mensagem });
    setTimeout(() => {
      setNotificacao({ exibir: false, tipo: '', mensagem: '' });
    }, 3000);
  };

  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/Vistoria`);
      if (!response.ok) throw new Error("Erro ao conectar com a API");
      
      const data = await response.json();

      const minhasVistorias = data.filter(v => {
        const idDoUsuarioNoBanco = v.usuarioId || v.UsuarioId;
        if (!idDoUsuarioNoBanco || !user.id) return false;
        return String(idDoUsuarioNoBanco).trim().toLowerCase() === String(user.id).trim().toLowerCase();
      });

      const formatados = minhasVistorias.map(v => {
        const dataCriacao = v.dataCriacao || v.DataCriacao;
        const placa = v.placa || v.Placa;
        const tipoServico = v.tipoServico || v.TipoServico;
        const status = v.status || v.Status;
        const equipe = v.equipe || v.Equipe;
        const observacao = v.observacao || v.Observacao;
        const localizacao = v.localizacao || v.Localizacao;
        const evidencias = v.evidencias || v.Evidencias;

        return {
          id: v.id || v.Id,
          data_formatada: dataCriacao ? new Date(dataCriacao).toLocaleDateString('pt-BR') : '---',
          placa: placa || '---',
          tipo_servico: tipoServico || 'Geral',
          status: status,
          equipe: equipe,
          observacao: observacao,
          localizacao_texto: localizacao,
          todas_fotos: evidencias ? evidencias.map(e => e.urlFoto || e.UrlFoto || e) : [],
          qtd_fotos: evidencias ? evidencias.length : 0
        };
      });

      setVistorias(formatados);

      const total = formatados.length;
      setStats({
        total_vistorias: total,
        porcentagem_meta: (total / META_MENSAL) * 100
      });

    } catch (err) {
      console.error("Erro ao carregar dados da API .NET:", err.message);
      dispararNotificacao('erro', 'Falha ao sincronizar com o servidor.');
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

  // EXPORTADOR EXCEL INTEGRADO
  const exportarExcel = () => {
    try {
      if (vistorias.length === 0) {
        dispararNotificacao('erro', 'Não existem registros para exportar.');
        return;
      }
      const dadosParaExportar = vistorias.map(reg => ({
        'Data': reg.data_formatada,
        'Placa': reg.placa,
        'Serviço': reg.tipo_servico,
        'Equipe': reg.equipe || 'S/N',
        'Status': reg.status || 'Concluída',
        'Observação': reg.observacao || '',
        'Localização': reg.localizacao_texto,
        'Total Fotos': reg.qtd_fotos
      }));

      const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Minhas Vistorias");
      
      const nomeArquivo = `Meu_Relatorio_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      dispararNotificacao('sucesso', 'Planilha exportada com sucesso!');
    } catch (error) {
      dispararNotificacao('erro', 'Erro ao gerar o arquivo Excel.');
    }
  };

  // DOWNLOAD INDIVIDUAL E PACOTE DE IMAGENS
  const baixarFoto = async (path, placa) => {
    try {
      const finalUrl = path.startsWith('http') 
        ? path 
        : supabase.storage.from('vistorias').getPublicUrl(path).data.publicUrl;

      const resposta = await fetch(finalUrl);
      const blob = await resposta.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vistoria_${placa}_${path.split('/').pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { 
      dispararNotificacao('erro', 'Erro ao baixar imagem.');
    }
  };

  const baixarTodasAsFotos = (fotos, placa) => {
    if (!fotos || fotos.length === 0) return;
    dispararNotificacao('sucesso', `Iniciando download de ${fotos.length} fotos...`);
    fotos.forEach((f, index) => {
      setTimeout(() => baixarFoto(f, placa), index * 500);
    });
  };

  const removerVistoria = async (id) => {
    if (!window.confirm("Excluir esta vistoria permanentemente?")) return;
    
    try {
      const response = await fetch(`${API_URL}/Vistoria/${id}`, { method: 'DELETE' });

      if (response.ok) {
        dispararNotificacao('sucesso', 'Vistoria excluída!');
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
        dispararNotificacao('erro', 'Não foi possível excluir no servidor.');
      }
    } catch (err) {
      console.error("Erro ao remover:", err);
      dispararNotificacao('erro', 'Erro na conexão de rede.');
    }
  };

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") {
      dispararNotificacao('erro', 'Localização GPS indisponível.');
      return;
    }
    const url = loc.includes('http') ? loc : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={styles.pageWrapper}>
      
      {/* BANNER FLUTUANTE DE NOTIFICAÇÃO */}
      {notificacao.exibir && (
        <div style={{
          ...styles.toastOverlay,
          backgroundColor: notificacao.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.98)' : 'rgba(239, 68, 68, 0.98)'
        }}>
          {notificacao.tipo === 'sucesso' ? (
            <div style={styles.toastContent}>
              <CheckCircle2 size={44} color="#fff" />
              <span style={styles.toastText}>{notificacao.mensagem}</span>
            </div>
          ) : (
            <div style={styles.toastContent}>
              <XCircle size={44} color="#fff" />
              <span style={styles.toastText}>{notificacao.mensagem}</span>
            </div>
          )}
        </div>
      )}

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
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          {stats.total_vistorias >= META_MENSAL 
            ? "Objetivo alcançado!" 
            : `Faltam ${META_MENSAL - stats.total_vistorias} para o objetivo.`}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>Meu Histórico</h3>
        <button onClick={exportarExcel} style={styles.btnExcel}>
          <FileDown size={14} /> EXPORTAR EXCEL
        </button>
      </div>

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
                    {reg.observacao && <div style={{marginTop: '4px', fontStyle: 'italic', color: '#a0aec0'}}>📝 {reg.observacao}</div>}
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
                {vistorias.length > 0 ? vistorias.map((reg) => (
                  <tr key={reg.id} style={styles.trHover}>
                    <td style={styles.td}>{reg.data_formatada}</td>
                    <td style={styles.td}><strong>{reg.placa}</strong></td>
                    <td style={styles.td}>{reg.tipo_servico}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setFotosModal({ fotos: reg.todas_fotos, placa: reg.placa })} title="Fotos" style={styles.btnIcon}>📷</button>
                        <button onClick={() => abrirMapa(reg.localizacao_texto)} title="Mapa" style={styles.btnIcon}>📍</button>
                        <button onClick={() => removerVistoria(reg.id)} title="Excluir" style={styles.btnIconDel}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#94a3b8'}}>Nenhuma vistoria vinculada a este usuário.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL DE FOTOS COM DOWNLOAD INDIVIDUAL E COMPLETO */}
      {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>Placa: {fotosModal.placa}</h3>
                <button onClick={() => baixarTodasAsFotos(fotosModal.fotos, fotosModal.placa)} style={styles.btnBaixarTudo}>
                  📥 Baixar Pacote ({fotosModal.fotos.length})
                </button>
              </div>
              <button onClick={() => setFotosModal(null)} style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}}><X /></button>
            </div>
            <div style={styles.galeria}>
              {fotosModal.fotos.map((url, i) => {
                const finalUrl = url.startsWith('http') 
                  ? url 
                  : supabase.storage.from('vistorias').getPublicUrl(url).data.publicUrl;

                return (
                  <div key={i} style={styles.fotoWrapper}>
                    <img 
                       src={finalUrl} 
                       style={styles.fotoItem} 
                       alt="evidencia" 
                       onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Erro+na+Foto'; }}
                    />
                    <button onClick={() => baixarFoto(url, fotosModal.placa)} style={styles.btnDownloadSmall}>Download</button>
                  </div>
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
  pageWrapper: { position: 'relative', padding: '20px', backgroundColor: '#1a202c', minHeight: '100vh', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif' },
  
  // ESTILOS DO POPUP FLUTUANTE CENTRALIZADO
  toastOverlay: { position: 'fixed', top: '25px', left: '50%', transform: 'translateX(-50%)', padding: '14px 28px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000, boxShadow: '0 15px 35px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' },
  toastContent: { display: 'flex', alignItems: 'center', gap: '12px' },
  toastText: { color: '#fff', fontWeight: '800', fontSize: '14px', letterSpacing: '0.2px' },

  cardMeta: { background: 'rgba(30, 41, 59, 0.9)', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)' },
  bigNum: { fontSize: '40px', fontWeight: 'bold' },
  subNum: { color: '#94a3b8', fontSize: '14px' },
  progressContainer: { background: '#0f172a', borderRadius: '15px', height: '25px', margin: '15px 0', overflow: 'hidden' },
  progressBar: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' },
  progressText: { color: '#fff', fontWeight: 'bold', fontSize: '11px' },
  
  btnExcel: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#276749', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' },
  
  tableWrapper: { background: 'rgba(30, 41, 59, 0.95)', borderRadius: '20px', overflow: 'hidden', width: '100%', border: '1px solid rgba(255,255,255,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.2)', textTransform: 'uppercase' },
  td: { padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#e2e8f0' },
  
  mobileList: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' },
  btnActionMobile: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  badge: { background: 'rgba(49, 130, 206, 0.3)', color: '#90cdf4', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' },
  btnIcon: { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  btnIconDel: { background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#fc8181', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' },
  btnBaixarTudo: { marginTop: '8px', padding: '8px 14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  galeria: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  fotoWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  fotoItem: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' },
  btnDownloadSmall: { width: '100%', background: 'transparent', border: '1px solid #3182ce', color: '#63b3ed', padding: '5px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }
};