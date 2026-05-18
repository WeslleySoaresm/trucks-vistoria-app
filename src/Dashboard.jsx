import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { FileDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell
} from 'recharts';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function Dashboard() {
  const [registrosRaw, setRegistrosRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipeFiltrada, setEquipeFiltrada] = useState('TODAS');
  const [fotosModal, setFotosModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // NOTIFICAÇÕES VISUAIS E ELEGANTES
  const [notificacao, setNotificacao] = useState({ exibir: false, tipo: '', mensagem: '' });

  // ESTADO PARA GERENCIAR MODAL DE CONFIRMAÇÃO CUSTOMIZADO
  const [confirmacaoModal, setConfirmacaoModal] = useState({
    exibir: false,
    mensagem: '',
    acaoConfirmar: null
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    buscarDados();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FUNÇÃO AUXILIAR PARA DISPARAR O BANNER NA TELA
  const dispararNotificacao = (tipo, mensagem) => {
    setNotificacao({ exibir: true, tipo, mensagem });
    setTimeout(() => {
      setNotificacao({ exibir: false, tipo: '', mensagem: '' });
    }, 3000);
  };
  
  async function buscarDados() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/Vistoria`);
      if (!response.ok) throw new Error("Erro ao buscar dados da API");
      
      const data = await response.json();
      
      const dataFormatada = data.map(v => {
        let obsLimpa = v.observacao || "";

        if (obsLimpa.includes("[Admin Autenticado")) {
          obsLimpa = obsLimpa.replace(/\[Admin Autenticado.*?\]\s*/g, "");
        }

        const observacaoFinal = obsLimpa.trim() ? obsLimpa.trim() : "";
        const clienteFinal = v.clienteNome || v.ClienteNome || v.cliente || v.Cliente || "NÃO INFORMADO";
        const dataFinal = v.dataCriacao || v.data_vitoria || v.data_vistoria;

        return {
          ...v,
          id: v.id,
          data_vistoria: dataFinal, 
          funcionario_email: v.usuarioId || v.funcionario_email,
          cliente_nome: clienteFinal.toString().trim() ? clienteFinal.toString().toUpperCase().trim() : "NÃO INFORMADO",
          localizacao_texto: v.localizacao || v.localizacao_texto || "Não autorizada",
          tipo_servico: v.tipoServico || v.tipo_servico || "No Local",
          observacao: observacaoFinal, 
          evidencias_lista: v.evidencias || v.evidencias_lista || [] 
        };
      });

      setRegistrosRaw(dataFormatada);
    } catch (error) {
      console.error("Erro na integração:", error.message);
      dispararNotificacao('erro', 'Falha ao carregar registros do servidor.');
    } finally {
      setLoading(false);
    }
  }

  const listaVistorias = registrosRaw.map(v => ({
    ...v,
    data_formatada: v.data_vistoria ? new Date(v.data_vistoria).toLocaleDateString('pt-BR') : 'N/D',
    qtd_fotos: v.evidencias_lista?.length || 0,
    todas_fotos: v.evidencias_lista?.map(e => e.urlFoto || e) || []
  }));

  const dadosExibidos = equipeFiltrada === 'TODAS' 
    ? listaVistorias 
    : listaVistorias.filter(r => (r.equipe || "S/N") === equipeFiltrada);

  const exportarExcel = () => {
    try {
      const dadosParaExportar = dadosExibidos.map(reg => ({
        'Data': reg.data_formatada,
        'Placa': reg.placa,
        'Cliente': reg.cliente_nome,
        'Equipe': reg.equipe,
        'Serviço': reg.tipo_servico || 'No Local',
        'Status': reg.status || 'Concluída',
        'Observação': reg.observacao || '',
        'Localização': reg.localizacao_texto,
        'Total Fotos': reg.qtd_fotos
      }));

      const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vistorias");
      
      const nomeArquivo = `Relatorio_${equipeFiltrada}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      dispararNotificacao('sucesso', 'Planilha exportada com sucesso!');
    } catch (error) {
      dispararNotificacao('erro', 'Erro ao gerar o arquivo Excel.');
    }
  };

  const baixarFoto = async (path, placa) => {
    const { data } = supabase.storage.from('vistorias').getPublicUrl(path);
    try {
      const resposta = await fetch(data.publicUrl);
      const blob = await resposta.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vistoria_${placa}_${path.split('/').pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { 
      dispararNotificacao('erro', 'Erro ao baixar imagem do Storage.');
    }
  };

  const baixarTodasAsFotos = (fotos, placa) => {
    if(!fotos || fotos.length === 0) return;
    dispararNotificacao('sucesso', `Baixando pacote de ${fotos.length} fotos...`);
    fotos.forEach((f, index) => {
      setTimeout(() => baixarFoto(f, placa), index * 500);
    });
  };

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") {
      dispararNotificacao('erro', 'Coordenadas de GPS indisponíveis para este registro.');
      return;
    }
    const url = loc.includes('http') ? loc : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  const solicitarRemoverVistoria = (id) => {
    setConfirmacaoModal({
      exibir: true,
      mensagem: 'Deseja realmente excluir este registro de vistoria permanentemente?',
      acaoConfirmar: () => executarRemoverVistoria(id)
    });
  };

  async function executarRemoverVistoria(id) {
    setConfirmacaoModal({ exibir: false, mensagem: '', acaoConfirmar: null });
    try {
      const response = await fetch(`${API_URL}/Vistoria/${id}`, { method: 'DELETE' });
      if (response.ok) {
        dispararNotificacao('sucesso', 'Registro removido com sucesso!');
        buscarDados();
      } else {
        dispararNotificacao('erro', 'A API recusou a exclusão.');
      }
    } catch (err) { 
      console.error(err);
      dispararNotificacao('erro', 'Falha na comunicação com o servidor.');
    }
  }

  const solicitarExcluirTudoEquipe = () => {
    if (equipeFiltrada === 'TODAS') return;
    const idsParaExcluir = dadosExibidos.map(reg => reg.id);
    if (idsParaExcluir.length === 0) {
      dispararNotificacao('erro', 'Não há registros nesta equipe.');
      return;
    }

    setConfirmacaoModal({
      exibir: true,
      mensagem: `ATENÇÃO CRÍTICA: Deseja apagar TODOS os ${idsParaExcluir.length} registros integrados à Equipe ${equipeFiltrada}? Esta ação é irreversível.`,
      acaoConfirmar: () => executarExcluirTudoEquipe(idsParaExcluir)
    });
  };

  async function executarExcluirTudoEquipe(idsParaExcluir) {
    setConfirmacaoModal({ exibir: false, mensagem: '', acaoConfirmar: null });
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/Vistoria/acoes/excluir-massa`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idsParaExcluir),
      });

      if (response.ok) {
        dispararNotificacao('sucesso', 'Limpeza em massa concluída!');
        await buscarDados();
      } else {
        dispararNotificacao('erro', 'Erro ao remover bloco de vistorias.');
      }
    } catch (err) {
      dispararNotificacao('erro', 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  const prodEquipe = listaVistorias.reduce((acc, curr) => {
    const eq = curr.equipe || "S/N";
    acc[eq] = (acc[eq] || 0) + 1;
    return acc;
  }, {});

  const graficoEquipe = Object.entries(prodEquipe).map(([name, value]) => ({ name: `Equipe ${name}`, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getStatusStyle = (status) => {
    if (status?.toLowerCase().includes('conclui')) return { bg: '#c6f6d5', color: '#22543d' };
    if (status?.toLowerCase().includes('processo')) return { bg: '#feebc8', color: '#744210' };
    return { bg: '#edf2f7', color: '#4a5568' };
  };

  if (loading) return <div style={styles.loading}>Carregando estatísticas...</div>;

  return (
    <div style={styles.pageWrapper}>
      
      {/* TOAST DE NOTIFICAÇÃO CENTRALIZADO NO CENTRO DA TELA */}
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

      {/* MODAL DE CONFIRMAÇÃO CENTRALIZADO NO CENTRO DA TELA */}
      {confirmacaoModal.exibir && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmBox}>
            <AlertTriangle size={48} color="#f6ad55" style={{ marginBottom: '15px' }} />
            <h3 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800' }}>Confirmar Operação</h3>
            <p style={{ color: '#cbd5e0', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {confirmacaoModal.mensagem}
            </p>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setConfirmacaoModal({ exibir: false, mensagem: '', acaoConfirmar: null })} 
                style={styles.btnConfirmCancelar}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmacaoModal.acaoConfirmar} 
                style={styles.btnConfirmConfirmar}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FOTOS */}
      {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{flex: 1}}>
                <h3 style={{margin: 0, color: '#fff', fontSize: isMobile ? '16px' : '20px'}}>Fotos: {fotosModal.placa}</h3>
                <button onClick={() => baixarTodasAsFotos(fotosModal.fotos, fotosModal.placa)} style={styles.btnBaixarTudo}>
                  📥 Baixar Tudo ({fotosModal.fotos.length})
                </button>
              </div>
              <button onClick={() => setFotosModal(null)} style={styles.btnCloseTop}>×</button>
            </div>
            <div style={styles.galeria}>
              {fotosModal.fotos.map((foto, i) => (
                <div key={i} style={styles.fotoContainer}>
                  <img src={supabase.storage.from('vistorias').getPublicUrl(foto).data.publicUrl} alt="" style={styles.fotoItem}/>
                  <button onClick={() => baixarFoto(foto, fotosModal.placa)} style={styles.btnDownloadSmall}>Download</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CARDS RESUMO */}
      <div style={styles.rowCards}>
        <div onClick={() => setEquipeFiltrada('TODAS')} style={{...styles.cardResumo, borderLeftColor: '#666', opacity: equipeFiltrada === 'TODAS' ? 1 : 0.6, cursor: 'pointer'}}>
          <small style={styles.cardLabel}>Geral</small>
          <div style={styles.cardNum}>{listaVistorias.length}</div>
        </div>
        {graficoEquipe.map((item, idx) => (
          <div key={idx} onClick={() => setEquipeFiltrada(item.name.replace('Equipe ', ''))} style={{...styles.cardResumo, borderLeftColor: COLORS[idx % COLORS.length], opacity: equipeFiltrada === item.name.replace('Equipe ', '') ? 1 : 0.6, cursor: 'pointer'}}>
            <small style={styles.cardLabel}>{item.name}</small>
            <div style={styles.cardNum}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICOS */}
      <div style={{...styles.gridGraficos, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
        <div style={{...styles.chartBoxFull, gridColumn: isMobile ? 'auto' : 'span 2'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3 style={{...styles.chartTitle, margin: 0}}>Produtividade por Equipe</h3>
            <button onClick={exportarExcel} style={styles.btnExcel}>
              <FileDown size={16} /> EXCEL
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graficoEquipe} layout={isMobile ? "horizontal" : "vertical"}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)"/>
              <XAxis dataKey={isMobile ? "name" : undefined} type={isMobile ? "category" : "number"} hide={!isMobile} fontSize={10}/>
              <YAxis dataKey={isMobile ? undefined : "name"} type={isMobile ? "number" : "category"} fontSize={10} width={isMobile ? 30 : 80}/>
              <Tooltip contentStyle={{backgroundColor: '#1a202c', border: 'none'}}/>
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                 {graficoEquipe.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {equipeFiltrada !== 'TODAS' && (
        <div style={styles.panelAcoes}>
          <div style={styles.panelAcoesInfo}>
            <span style={styles.panelAcoesIcon}>⚠️</span>
            <span style={styles.panelAcoesText}>EQUIPE: <strong>{equipeFiltrada}</strong></span>
          </div>
          <button onClick={solicitarExcluirTudoEquipe} style={styles.btnExcluirMassa}>Limpar Tudo desta Equipe</button>
        </div>
      )}

      {/* LISTAGEM DE REGISTROS */}
      <div style={styles.tableWrapper}>
        {isMobile ? (
          <div style={styles.mobileList}>
            {dadosExibidos.map((reg, idx) => (
              <div key={idx} style={styles.mobileCard}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                  <strong style={{fontSize: '18px', color: '#fff'}}>{reg.placa}</strong>
                  <span style={styles.badge}>{reg.equipe}</span>
                </div>
                <div style={{fontSize: '13px', color: '#cbd5e0', marginBottom: '10px'}}>
                  <div style={{color: '#63b3ed', fontWeight: 'bold', marginBottom: '6px'}}>👤 CLIENTE: {reg.cliente_nome}</div>
                  <div>📅 {reg.data_formatada}</div>
                  <div>🛠️ {reg.tipo_servico || 'No Local'}</div>
                  <div style={{marginTop: '5px', fontStyle: 'italic'}}>📝 {reg.observacao}</div>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button onClick={() => setFotosModal({fotos: reg.todas_fotos, placa: reg.placa})} style={styles.btnActionMobile}>📷 {reg.qtd_fotos}</button>
                  <button onClick={() => abrirMapa(reg.localizacao_texto)} style={styles.btnActionMobile}>📍 Mapa</button>
                  <button onClick={() => solicitarRemoverVistoria(reg.id)} style={{...styles.btnActionMobile, color: '#fc8181'}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Placa</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Equipe</th>
                <th style={styles.th}>Serviço</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Observação</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {dadosExibidos.map((reg, idx) => {
                const statusStyle = getStatusStyle(reg.status);
                return (
                  <tr key={idx} style={styles.row}>
                    <td style={styles.td}>{reg.data_formatada}</td>
                    <td style={styles.td}><strong>{reg.placa}</strong></td>
                    <td style={{...styles.td, color: '#63b3ed', fontWeight: 'bold'}}>{reg.cliente_nome}</td>
                    <td style={styles.td}><span style={styles.badge}>{reg.equipe}</span></td>
                    <td style={styles.td}>{reg.tipo_servico || 'No Local'}</td>
                    <td style={styles.td}>
                      <span style={{...styles.statusBadge, backgroundColor: statusStyle.bg, color: statusStyle.color}}>
                        {reg.status || 'Concluída'}
                      </span>
                    </td>
                    <td style={{...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                      {reg.observacao}
                    </td>
                    <td style={styles.td}>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button onClick={() => setFotosModal({fotos: reg.todas_fotos, placa: reg.placa})} title="Ver Fotos" style={styles.btnIcon}>📷</button>
                        <button onClick={() => abrirMapa(reg.localizacao_texto)} title="Abrir Mapa" style={styles.btnIcon}>📍</button>
                        <button onClick={() => solicitarRemoverVistoria(reg.id)} title="Excluir" style={styles.btnIconDel}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  loading: { padding: '40px', textAlign: 'center', color: '#fff', background: '#1a202c', minHeight: '100vh' },
  pageWrapper: { position: 'relative', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif', backgroundColor: '#1a202c' },
  
  // CONTAINER FIXO PARA CENTRALIZAR O TOAST EXATAMENTE NO MEIO DA TELA
  toastContainerCentral: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 13000 },
  toastBox: { padding: '16px 28px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '90%', pointerEvents: 'auto', animation: 'fadeIn 0.2s ease-out' },
  toastText: { color: '#fff', fontWeight: '700', fontSize: '15px', letterSpacing: '0.1px', textAlign: 'center' },

  // CAIXA DE CONFIRMAÇÃO AGORA TOTALMENTE INTEGRADA À ESTRUTURA CENTRALIZADA
  confirmBox: { background: '#1e293b', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' },
  btnConfirmCancelar: { flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  btnConfirmConfirmar: { flex: 1, padding: '12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },

  rowCards: { display: 'flex', gap: '15px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' },
  cardResumo: { background: 'rgba(30, 41, 59, 0.9)', padding: '15px', borderRadius: '16px', minWidth: '120px', borderLeft: '5px solid', flexShrink: 0 },
  cardLabel: { color: '#cbd5e0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' },
  cardNum: { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' },
  gridGraficos: { display: 'grid', gap: '20px', marginBottom: '20px' },
  chartBoxFull: { background: 'rgba(30, 41, 59, 0.85)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' },
  chartTitle: { color: '#ffffff', fontSize: '14px', marginBottom: '15px', textAlign: 'center' },
  btnExcel: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#276749', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  tableWrapper: { background: 'rgba(30, 41, 59, 0.95)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', color: '#fff', fontSize: '11px', background: 'rgba(0,0,0,0.2)' },
  td: { padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#e2e8f0' },
  badge: { background: 'rgba(49, 130, 206, 0.3)', color: '#90cdf4', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' },
  statusBadge: { padding: '3px 10px', borderRadius: '50px', fontSize: '10px', fontWeight: 'bold' },
  btnIcon: { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  btnIconDel: { background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#fc8181', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  panelAcoes: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.15)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e53e3e' },
  btnExcluirMassa: { background: '#e53e3e', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  
  // MODAL OVERLAY PARA PEGAR TODA A TELA E CENTRALIZAR CONTEÚDOS DE FORMA ABSOLUTA
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 },
  
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', marginBottom: '20px', alignItems: 'flex-start' },
  btnBaixarTudo: { marginTop: '10px', padding: '8px 15px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  btnCloseTop: { background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer' },
  galeria: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  fotoItem: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px' },
  btnDownloadSmall: { width: '100%', marginTop: '5px', background: 'transparent', border: '1px solid #3182ce', color: '#3182ce', padding: '5px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' },
  mobileList: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' },
  btnActionMobile: { flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  panelAcoesInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  panelAcoesText: { color: '#fff', fontSize: '13px' },
  panelAcoesIcon: { fontSize: '16px' },
  headerRow: { background: 'rgba(0,0,0,0.1)' },
  fotoContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' }
};