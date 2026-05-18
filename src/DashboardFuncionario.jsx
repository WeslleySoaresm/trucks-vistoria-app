import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient'; 
import { Trash2, Loader2, Camera, MapPin, X, FileDown, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function DashboardFuncionario({ user }) {
  const [stats, setStats] = useState({ total_vistorias: 0, porcentagem_meta: 0 });
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMais, setLoadingMais] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fotosModal, setFotosModal] = useState(null);
  
  // PAGINAÇÃO PERFORMANCE
  const [pagina, setPagina] = useState(1);
  const [temMaisRegistros, setTemMaisRegistros] = useState(true);
  const ITENS_POR_PAGINA = 20;

  const [notificacao, setNotificacao] = useState({ exibir: false, tipo: '', mensagem: '' });
  const META_MENSAL = 20;

  const dispararNotificacao = (tipo, mensagem) => {
    setNotificacao({ exibir: true, tipo, mensagem });
    setTimeout(() => {
      setNotificacao({ exibir: false, tipo: '', mensagem: '' });
    }, 3000);
  };

  // FUNÇÃO DE CARREGAMENTO OTIMIZADA E RETIFICADA
  const carregarDados = useCallback(async (paginaAlvo = 1, append = false) => {
    if (!user?.id) return;
    
    if (append) {
      setLoadingMais(true);
    } else {
      setLoading(true);
    }

    try {
      // Passa os parâmetros de paginação e o ID do usuário conectado
      const urlComFiltros = `${API_URL}/Vistoria?usuarioId=${user.id}&pagina=${paginaAlvo}&limite=${ITENS_POR_PAGINA}`;
      
      const response = await fetch(urlComFiltros);
      if (!response.ok) throw new Error("Erro ao conectar com a API");
      
      const data = await response.json();

      // Normaliza se a API responder com objeto paginado { dados: [...] } ou array direta
      const listaBruta = Array.isArray(data) ? data : (data.dados || data.vistorias || []);

      // Mapeamento tolerante a variações de letras maiúsculas/minúsculas do banco de dados
      const formatados = listaBruta.map(v => {
        const dataCriacao = v.dataCriacao || v.DataCriacao || v.data_cadastro;
        return {
          id: v.id || v.Id,
          data_formatada: dataCriacao ? new Date(dataCriacao).toLocaleDateString('pt-BR') : '---',
          placa: v.placa || v.Placa || '---',
          tipo_servico: v.tipoServico || v.TipoServico || 'Geral',
          status: v.status || v.Status || 'Concluída',
          equipe: v.equipe || v.Equipe || 'Padrão',
          observacao: v.observacao || v.Observacao || '',
          localizacao_texto: v.localizacao || v.Localizacao || '',
          todas_fotos: v.evidencias || v.Evidencias ? (Array.isArray(v.evidencias || v.Evidencias) ? (v.evidencias || v.Evidencias).map(e => e.urlFoto || e.UrlFoto || e) : []) : [],
          qtd_fotos: v.evidencias || v.Evidencias ? (v.evidencias || v.Evidencias).length : 0
        };
      });

      // Atualização segura do estado das vistorias
      let listaAtualizada;
      if (append) {
        setVistorias(prev => {
          listaAtualizada = [...prev, ...formatados];
          return listaAtualizada;
        });
      } else {
        listaAtualizada = formatados;
        setVistorias(formatados);
      }

      // Validação de fim de registros
      if (formatados.length < ITENS_POR_PAGINA) {
        setTemMaisRegistros(false);
      } else {
        setTemMaisRegistros(true);
      }

      // CORREÇÃO DA META: Baseia-se no tamanho total real do histórico carregado
      const totalVistoriasUsuario = listaAtualizada ? listaAtualizada.length : formatados.length;
      setStats({
        total_vistorias: totalVistoriasUsuario,
        porcentagem_meta: (totalVistoriasUsuario / META_MENSAL) * 100
      });

    } catch (err) {
      console.error("Erro na carga de dados:", err.message);
      dispararNotificacao('erro', 'Falha ao sincronizar dados com o servidor.');
    } finally {
      setLoading(false);
      setLoadingMais(false);
    }
  }, [user?.id]);

  // Monitora alterações de usuário e monta o componente
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    setPagina(1);
    carregarDados(1, false);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [user?.id, carregarDados]);

  const lidarComCarregarMais = () => {
    const proximaPagina = pagina + 1;
    setPagina(proximaPagina);
    carregarDados(proximaPagina, true);
  };

  const exportarExcel = () => {
    try {
      if (vistorias.length === 0) {
        dispararNotificacao('erro', 'Não existem registros carregados para exportar.');
        return;
      }
      const dadosParaExportar = vistorias.map(reg => ({
        'Data': reg.data_formatada,
        'Placa': reg.placa,
        'Serviço': reg.tipo_servico,
        'Equipe': reg.equipe,
        'Status': reg.status,
        'Observação': reg.observacao,
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
        setVistorias(prev => {
          const filtrados = prev.filter(v => v.id !== id);
          setStats({ 
            total_vistorias: filtrados.length,
            porcentagem_meta: (filtrados.length / META_MENSAL) * 100
          });
          return filtrados;
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
      
      {notificacao.exibir && (
        <div style={styles.toastContainerCentral}>
          <div style={{
            ...styles.toastBox,
            backgroundColor: notificacao.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.98)' : 'rgba(239, 68, 68, 0.98)'
          }}>
            {notificacao.tipo === 'sucesso' ? (
              <CheckCircle2 size={28} color="#fff" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={28} color="#fff" style={{ flexShrink: 0 }} />
            )}
            <span style={styles.toastText}>{notificacao.mensagem}</span>
          </div>
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

      {loading && pagina === 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" color="#63b3ed" /></div>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            {isMobile ? (
              <div style={styles.mobileList}>
                {vistorias.length > 0 ? vistorias.map((reg) => (
                  <div key={reg.id} style={styles.mobileCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong style={{ color: '#fff' }}>{reg.placa}</strong>
                      <span style={styles.badge}>{reg.equipe}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#cbd5e0', marginBottom: '12px' }}>
                      <div>📅 {reg.data_formatada}</div>
                      <div>🛠️ {reg.tipo_servico}</div>
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
                )) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhuma vistoria encontrada.</div>}
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

          {temMaisRegistros && vistorias.length >= ITENS_POR_PAGINA && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '20px' }}>
              <button 
                onClick={lidarComCarregarMais} 
                disabled={loadingMais}
                style={styles.btnCarregarMais}
              >
                {loadingMais ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <><ChevronDown size={16} /> Carregar Mais Vistorias</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL DE FOTOS */}
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
  toastContainerCentral: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 12500 },
  toastBox: { padding: '16px 28px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '90%', pointerEvents: 'auto' },
  toastText: { color: '#fff', fontWeight: '800', fontSize: '14px', letterSpacing: '0.2px', textAlign: 'center' },
  cardMeta: { background: 'rgba(30, 41, 59, 0.9)', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)' },
  statsNum: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '5px' },
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
  trHover: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  mobileList: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' },
  btnActionMobile: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  badge: { background: 'rgba(49, 130, 206, 0.3)', color: '#90cdf4', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' },
  btnIcon: { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  btnIconDel: { background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#fc8181', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' },
  btnBaixarTudo: { marginTop: '8px', padding: '8px 14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  galeria: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  fotoWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  fotoItem: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' },
  btnDownloadSmall: { width: '100%', background: 'transparent', border: '1px solid #3182ce', color: '#63b3ed', padding: '5px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' },
  btnCarregarMais: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(99, 179, 237, 0.15)', color: '#63b3ed', border: '1px solid #63b3ed', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }
};