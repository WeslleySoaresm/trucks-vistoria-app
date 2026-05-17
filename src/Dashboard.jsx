import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell
} from 'recharts';

// URL da sua API .NET
const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function Dashboard() {
  const [registrosRaw, setRegistrosRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipeFiltrada, setEquipeFiltrada] = useState('TODAS');
  const [fotosModal, setFotosModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- EFEITOS E BUSCA ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    buscarDados();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  async function buscarDados() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/Vistoria`);
      if (!response.ok) throw new Error("Erro ao buscar dados da API");
      
      const data = await response.json();
      
      const dataFormatada = data.map(v => {
        // CORREÇÃO: Remove a tag feia do Admin de dentro da observação
        let obsLimpa = v.observacao || "";
        if (obsLimpa.includes("[Enviado por Admin")) {
          obsLimpa = obsLimpa.replace(/\[Enviado por Admin.*?\]\s*/g, "");
        }

        return {
          ...v,
          id: v.id,
          data_vistoria: v.dataCriacao, 
          funcionario_email: v.usuarioId,
          cliente_nome: v.cliente || "Não Informado",
          localizacao_texto: v.localizacao || "Não autorizada",
          tipo_servico: v.tipoServico,
          observacao: obsLimpa.trim() || "-", // Aplica o texto limpo na tabela e no Excel
          evidencias_lista: v.evidencias || [] 
        };
      });

      setRegistrosRaw(dataFormatada);
    } catch (error) {
      console.error("Erro na integração:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- PROCESSAMENTO DE DADOS ---
  const listaVistorias = registrosRaw.map(v => ({
    ...v,
    data_formatada: v.data_vistoria ? new Date(v.data_vistoria).toLocaleDateString('pt-BR') : 'N/D',
    qtd_fotos: v.evidencias_lista?.length || 0,
    todas_fotos: v.evidencias_lista?.map(e => e.urlFoto) || []
  }));

  const dadosExibidos = equipeFiltrada === 'TODAS' 
    ? listaVistorias 
    : listaVistorias.filter(r => (r.equipe || "S/N") === equipeFiltrada);

  // --- LÓGICA DE EXPORTAÇÃO EXCEL ---
  const exportarExcel = () => {
    try {
      const dadosParaExportar = dadosExibidos.map(reg => ({
        'Data': reg.data_formatada,
        'Placa': reg.placa,
        'Equipe': reg.equipe,
        'Serviço': reg.tipo_servico || 'On Job',
        'Status': reg.status || 'Concluída',
        'Observação': reg.observacao || '-',
        'Localização': reg.localizacao_texto,
        'Total Fotos': reg.qtd_fotos
      }));

      const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vistorias");
      const nomeArquivo = `Relatorio_${equipeFiltrada}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("Erro ao gerar o arquivo Excel.");
    }
  };

  // --- FOTOS E MAPA ---
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
    } catch (err) { alert("Erro ao baixar foto"); }
  };

  const baixarTodasAsFotos = (fotos, placa) => {
    fotos.forEach((f, index) => {
      setTimeout(() => baixarFoto(f, placa), index * 500);
    });
  };

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível.");
    // CORREÇÃO: Adicionado o '$' antes das chaves na interpolação da URL do mapa
    const url = loc.includes('http') ? loc : `https://www.google.com/maps/search/?api=1&query=$/${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  // --- EXCLUSÕES ---
  async function removerVistoria(id) {
    if (!window.confirm(`Excluir este registro permanentemente?`)) return;
    try {
      const response = await fetch(`${API_URL}/Vistoria/${id}`, { method: 'DELETE' });
      if (response.ok) buscarDados();
      else alert("Erro ao excluir na API.");
    } catch (err) { console.error(err); }
  }

  // --- AJUSTE NA EXCLUSÃO EM MASSA ---
  async function excluirTudoEquipe() {
    if (equipeFiltrada === 'TODAS') return;
    const idsParaExcluir = dadosExibidos.map(reg => reg.id);
    if (idsParaExcluir.length === 0) return alert("Não há registros nesta equipe.");

    const confirmar = window.confirm(`ATENÇÃO: Você está prestes a excluir TODOS os ${idsParaExcluir.length} registros da Equipe ${equipeFiltrada}. Confirmar?`);
    if (!confirmar) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/Vistoria/acoes/excluir-massa`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(idsParaExcluir),
      });

      if (response.ok) {
        alert("Exclusão em massa realizada com sucesso!");
        await buscarDados();
      } else {
        const erro = await response.text();
        alert("Erro na exclusão: " + erro);
      }
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  // --- GRÁFICOS ---
  const prodEquipe = listaVistorias.reduce((acc, curr) => {
    const eq = curr.equipe || "S/N";
    acc[eq] = (acc[eq] || 0) + 1;
    return acc;
  }, {});
  const graficoEquipe = Object.entries(prodEquipe).map(([name, value]) => ({ name: `Equipe ${name}`, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getStatusStyle = (status) => {
    if (status?.toLowerCase().includes('conclui')) return { bg: '#c6f6d5', color: '#22543d' };
    return { bg: '#edf2f7', color: '#4a5568' };
  };

  if (loading) return <div style={styles.loading}>Carregando estatísticas...</div>;

  return (
    <div style={styles.pageWrapper}>
      
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

      {/* CARDS DE RESUMO */}
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

      {/* GRÁFICO E EXPORTAÇÃO */}
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

      {/* PAINEL DE GESTÃO */}
      {equipeFiltrada !== 'TODAS' && (
        <div style={styles.panelAcoes}>
          <div style={styles.panelAcoesInfo}>
            <span style={styles.panelAcoesIcon}>⚠️</span>
            <span style={styles.panelAcoesText}>EQUIPE: <strong>{equipeFiltrada}</strong></span>
          </div>
          <button onClick={excluirTudoEquipe} style={styles.btnExcluirMassa}>Limpar Tudo desta Equipe</button>
        </div>
      )}

      {/* TABELA / CARDS */}
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
                  <div>📅 {reg.data_formatada}</div>
                  <div>🛠️ {reg.tipo_servico || 'On Job'}</div>
                  <div style={{marginTop: '5px', fontStyle: 'italic'}}>📝 {reg.observacao}</div>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button onClick={() => setFotosModal({fotos: reg.todas_fotos, placa: reg.placa})} style={styles.btnActionMobile}>📷 {reg.qtd_fotos}</button>
                  <button onClick={() => abrirMapa(reg.localizacao_texto)} style={styles.btnActionMobile}>📍 Mapa</button>
                  <button onClick={() => removerVistoria(reg.id)} style={{...styles.btnActionMobile, color: '#fc8181'}}>🗑️</button>
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
                    <td style={styles.td}><span style={styles.badge}>{reg.equipe}</span></td>
                    <td style={styles.td}>{reg.tipo_servico || 'On Job'}</td>
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
                        <button onClick={() => removerVistoria(reg.id)} title="Excluir" style={styles.btnIconDel}>🗑️</button>
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

// --- ESTILOS MANTIDOS ---
const styles = {
  loading: { padding: '40px', textAlign: 'center', color: '#fff', background: '#1a202c', minHeight: '100vh' },
  pageWrapper: { minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif', backgroundColor: '#1a202c' },
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
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#1a202c', padding: '20px', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', marginBottom: '20px', alignItems: 'flex-start' },
  btnBaixarTudo: { marginTop: '10px', padding: '8px 15px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  btnCloseTop: { background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer' },
  galeria: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  fotoItem: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px' },
  btnDownloadSmall: { width: '100%', marginTop: '5px', background: 'transparent', border: '1px solid #3182ce', color: '#3182ce', padding: '5px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' },
  mobileList: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' },
  btnActionMobile: { flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }
};