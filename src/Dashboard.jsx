import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';

export default function Dashboard() {
  const [registrosRaw, setRegistrosRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipeFiltrada, setEquipeFiltrada] = useState('TODAS');
  // Estados para o Modal de Fotos
    const [fotosModal, setFotosModal] = useState(null);

    useEffect(() => {
      buscarDados();
    }, []);

    async function buscarDados() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('dashboard_vistorias')
          .select('*')
          .order('data_vistoria', { ascending: false });

        if (error) throw error;
        setRegistrosRaw(data || []);
      } catch (error) {
        console.error("Erro:", error.message);
      } finally {
        setLoading(false);
      }
    }
  useEffect(() => {
    buscarDados();
  }, []);

  async function buscarDados() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dashboard_vistorias')
        .select('*')
        .order('data_vistoria', { ascending: false });

      if (error) throw error;
      setRegistrosRaw(data || []);
    } catch (error) {
      console.error("Erro:", error.message);
    } finally {
      setLoading(false);
    }
  }

  /// --- LÓGICA DE AGRUPAMENTO (CORRIGIDA) ---
  const vistoriasUnicas = registrosRaw.reduce((acc, curr) => {
    const dataAjustada = new Date(curr.data_vistoria).toLocaleDateString('pt-BR');
    const chave = `${curr.placa}-${dataAjustada}`; 
    
    if (!acc[chave]) {
      // Criamos o objeto inicial incluindo a array 'todas_fotos'
      acc[chave] = { 
        ...curr, 
        qtd_fotos: 1, 
        data_formatada: dataAjustada,
        todas_fotos: curr.url_foto ? [curr.url_foto] : [] 
      };
    } else {
      // Adicionamos a foto atual à lista do grupo
      acc[chave].qtd_fotos += 1;
      if (curr.url_foto) {
        acc[chave].todas_fotos.push(curr.url_foto);
      }
    }
    return acc;
  }, {});

  const listaVistorias = Object.values(vistoriasUnicas);

  const dadosExibidos = equipeFiltrada === 'TODAS' 
    ? listaVistorias 
    : listaVistorias.filter(r => (r.equipe || "S/N") === equipeFiltrada);



  // --- FUNÇÃO PARA BAIXAR FOTO ---
  const baixarFoto = async (nomeArquivo, placa) => {
    const url = `https://ptewdmezpswwrymtqgmg.supabase.co/storage/v1/object/public/vistorias/${nomeArquivo}`;
    try {
      const resposta = await fetch(url);
      const blob = await resposta.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vistoria_${placa}_${nomeArquivo}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Erro ao baixar foto");
    }
  };

  const baixarTodasAsFotos = (fotos, placa) => {
      fotos.forEach((f, index) => {
        setTimeout(() => baixarFoto(f, placa), index * 500); // Delay para não travar o navegador
      });
    };


  // --- DADOS PARA OS GRÁFICOS ---
  const prodFuncionario = dadosExibidos.reduce((acc, curr) => {
    const nome = curr.funcionario_email?.split('@')[0] || "Sistema";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
  const graficoFuncionario = Object.entries(prodFuncionario).map(([name, value]) => ({ name, value }));

  const prodCliente = dadosExibidos.reduce((acc, curr) => {
    const cliente = curr.cliente_nome || "Não Informado";
    acc[cliente] = (acc[cliente] || 0) + 1;
    return acc;
  }, {});
  const graficoCliente = Object.entries(prodCliente).map(([name, value]) => ({ name, value }));

  const prodEquipe = listaVistorias.reduce((acc, curr) => {
    const eq = curr.equipe || "S/N";
    acc[eq] = (acc[eq] || 0) + 1;
    return acc;
  }, {});
  const graficoEquipe = Object.entries(prodEquipe).map(([name, value]) => ({ name: `Equipe ${name}`, value }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Função para definir cor do Status
  const getStatusStyle = (status) => {
    if (status?.toLowerCase() === 'concluida') return { bg: '#c6f6d5', color: '#22543d' };
    return { bg: '#edf2f7', color: '#4a5568' };
  };

  async function removerVistoria(placa) {
    if (!window.confirm(`Excluir todos os registros da placa ${placa}?`)) return;
    const { error } = await supabase.from('dashboard_vistorias').delete().eq('placa', placa);
    if (!error) buscarDados();
  }

  async function excluirTudoEquipe() {
    if (equipeFiltrada === 'TODAS') return;
    if (!window.confirm(`Confirmar exclusão TOTAL da Equipe ${equipeFiltrada}?`)) return;
    const { error } = await supabase.from('dashboard_vistorias').delete().eq('equipe', equipeFiltrada);
    if (!error) { setEquipeFiltrada('TODAS'); buscarDados(); }
  }

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível.");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`, '_blank');
  };

  if (loading) return <p style={{padding: '20px'}}>Carregando estatísticas...</p>;

  return (
    <div style={styles.container}>
      
      {/* MODAL DE FOTOS COM DOWNLOAD */}
      {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{margin: 0}}>Fotos: {fotosModal.placa}</h3>
                <button 
                  onClick={() => baixarTodasAsFotos(fotosModal.fotos, fotosModal.placa)}
                  style={styles.btnBaixarTudo}
                >
                  📥 Baixar Todas as {fotosModal.fotos.length} fotos
                </button>
              </div>
              <button onClick={() => setFotosModal(null)} style={styles.btnCloseTop}>×</button>
            </div>

            <div style={styles.galeria}>
              {fotosModal.fotos.map((foto, i) => (
                <div key={i} style={styles.fotoContainer}>
                  <img 
                    src={`https://ptewdmezpswwrymtqgmg.supabase.co/storage/v1/object/public/vistorias/${foto}`} 
                    alt="Vistoria" 
                    style={styles.fotoItem}
                  />
                  <button 
                    onClick={() => baixarFoto(foto, fotosModal.placa)}
                    style={styles.btnDownloadIndividual}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* SELEÇÃO DE EQUIPES */}
      <div style={styles.rowCards}>
        <div 
          onClick={() => setEquipeFiltrada('TODAS')}
          style={{...styles.cardResumo, borderLeftColor: '#666', opacity: equipeFiltrada === 'TODAS' ? 1 : 0.6}}
        >
          <small>Total Geral</small>
          <div style={styles.cardNum}>{listaVistorias.length}</div>
        </div>
        {graficoEquipe.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => setEquipeFiltrada(item.name.replace('Equipe ', ''))}
            style={{...styles.cardResumo, borderLeftColor: COLORS[idx % COLORS.length], opacity: equipeFiltrada === item.name.replace('Equipe ', '') ? 1 : 0.6}}
          >
            <small>{item.name}</small>
            <div style={styles.cardNum}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ÁREA DE GRÁFICOS */}
      <div style={styles.gridGraficos}>
        <div style={styles.chartBoxFull}>
          <h3 style={styles.chartTitle}>Produtividade por Equipe (Vistorias Totais)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graficoEquipe} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" fontSize={12} hide />
              <YAxis dataKey="name" type="category" fontSize={12} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                 {graficoEquipe.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Vistorias por Funcionário</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graficoFuncionario}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#3182ce" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Clientes Atendidos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={graficoCliente} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                {graficoCliente.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{fontSize: '10px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PAINEL DE EXCLUSÃO SEGURA - VERSÃO ALERTA MÁXIMO */}
      {equipeFiltrada !== 'TODAS' && (
        <div style={styles.panelAcoes}>
          <div style={styles.panelAcoesInfo}>
            <span style={styles.panelAcoesIcon}>⚠️</span>
            <span style={styles.panelAcoesText}>
              MODO DE GESTÃO CRÍTICA: <strong>EQUIPE {equipeFiltrada}</strong>
            </span>
          </div>
          <button onClick={excluirTudoEquipe} style={styles.btnExcluirMassa}>
            🗑️ EXCLUIR TODOS OS REGISTROS
          </button>
        </div>
      )}

      {/* TABELA ATUALIZADA */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Data</th>
              <th style={styles.th}>Placa</th>
              <th style={styles.th}>Equipe</th>
              <th style={styles.th}>Serviço</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Observação</th>
              <th style={styles.th}>Funcionário</th>
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
                    <span style={{
                      ...styles.statusBadge, 
                      backgroundColor: statusStyle.bg, 
                      color: statusStyle.color
                    }}>
                      {reg.status || 'Concluída'}
                    </span>
                  </td>
                  {/* COLUNA OBSERVAÇÃO COM TRATAMENTO DE TEXTO */}
                <td style={{...styles.td, ...styles.colObs}}>
                  {reg.observacao || <span style={{color: '#ccc'}}>Nenhuma obs.</span>}
                </td>
                  <td style={styles.td}>{reg.funcionario_email?.split('@')[0]}</td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button onClick={() => setFotosModal({fotos: reg.todas_fotos, placa: reg.placa})} style={styles.btnIcon} title="Ver Fotos">📷 ({reg.qtd_fotos})</button>
                      <button onClick={() => abrirMapa(reg.localizacao_texto)} style={styles.btnIcon}>📍</button>
                      <button onClick={() => removerVistoria(reg.placa)} style={styles.btnIconDel}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: '100vh', 
    width: '100%', 
    padding: '40px 20px', 
    boxSizing: 'border-box',
    backgroundSize: 'cover', 
    backgroundPosition: 'center', 
    backgroundAttachment: 'fixed',
    transition: 'all 0.8s ease-in-out', 
    fontFamily: '"Inter", sans-serif',
    backgroundColor: '#1a202c' // Cor de segurança caso a imagem falhe
  },
  loading: { color: '#fff', textAlign: 'center', padding: '50px', fontSize: '18px' },
  headerDashboard: { textAlign: 'center', marginBottom: '40px' },
  mainTitle: { color: '#ffffff', fontSize: '32px', margin: 0, fontWeight: '800', textShadow: '0 2px 10px rgba(0,0,0,0.5)' },
  mainSubtitle: { color: '#e2e8f0', fontSize: '16px', marginTop: '5px' },
  
  rowCards: { display: 'flex', gap: '20px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '10px' },
  cardResumo: { 
    background: 'rgba(30, 41, 59, 0.9)', // Mais escuro e menos transparente
    backdropFilter: 'blur(12px)',
    padding: '20px', 
    borderRadius: '16px', 
    minWidth: '150px', 
    border: '1px solid rgba(255, 255, 255, 0.2)', // Borda mais visível
    borderLeft: '6px solid', 
    cursor: 'pointer',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)', // Sombra para dar profundidade
  },
  cardLabel: { color: '#cbd5e0', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' },
  cardNum: { color: '#ffffff', fontSize: '32px', fontWeight: 'bold', marginTop: '5px' },

  gridGraficos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' },
  chartBox: { 
    background: 'rgba(30, 41, 59, 0.85)', 
    padding: '20px', 
    borderRadius: '20px', 
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
  },
  chartBoxFull: { 
    background: 'rgba(30, 41, 59, 0.85)', 
    padding: '25px', 
    borderRadius: '20px', 
    border: '1px solid rgba(255, 255, 255, 0.1)', 
    gridColumn: 'span 2',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
  },
  chartTitle: { color: '#ffffff', fontSize: '16px', marginBottom: '15px', fontWeight: '600' },
  
  tableWrapper: { 
    background: 'rgba(30, 41, 59, 0.95)', // Quase sólido para leitura perfeita
    borderRadius: '24px', 
    border: '1px solid rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  headerRow: { backgroundColor: 'rgba(0, 0, 0, 0.3)' }, // Cabeçalho da tabela bem escuro
  th: { padding: '18px', textAlign: 'left', color: '#ffffff', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' },
  td: { padding: '18px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px', color: '#e2e8f0' },
  
  badge: { background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' },
  btnAction: { 
    background: '#4a5568', 
    border: '1px solid rgba(255,255,255,0.2)', 
    color: '#fff', 
    cursor: 'pointer', 
    padding: '8px 12px', 
    borderRadius: '10px', 
    fontSize: '13px',
    fontWeight: 'bold'
  },
  
  // --- MODAL REFORÇADO ---
    modalOverlay: { 
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', 
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 
    },
    modalContent: { 
      background: '#1a202c', padding: '30px', borderRadius: '24px', 
      width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #334155' 
    },
    modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
    btnCloseTop: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' },
    btnBaixarTudo: { width: '100%', padding: '12px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '12px', marginBottom: '20px', fontWeight: 'bold', cursor: 'pointer' },
    galeria: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
    fotoItem: { width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px' },
    btnDownloadSmall: { width: '100%', marginTop: '5px', background: 'transparent', border: '1px solid #63b3ed', color: '#63b3ed', borderRadius: '8px', padding: '5px', fontSize: '11px', cursor: 'pointer' },
  
  
  // Modal corrigido para legibilidade máxima
  
  panelAcoes: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    background: 'rgba(153, 27, 27, 0.4)', // Vermelho escuro semi-transparente
    padding: '20px 25px', 
    borderRadius: '16px', 
    marginBottom: '25px', 
    border: '2px solid #ef4444', // Borda vermelha viva
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)', // Glow vermelho ao redor
    backdropFilter: 'blur(10px)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  panelAcoesInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  panelAcoesIcon: {
    fontSize: '24px'
  },
  panelAcoesText: {
    color: '#fff',
    fontSize: '14px',
    letterSpacing: '0.5px'
  },
  btnExcluirMassa: { 
    backgroundColor: '#ef4444', 
    color: '#fff', 
    border: 'none', 
    padding: '12px 24px', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontWeight: '900', 
    fontSize: '12px',
    textTransform: 'uppercase',
    boxShadow: '0 4px 0px #991b1b', // Efeito de botão 3D
    transition: 'all 0.2s ease',
    outline: 'none'
  }, 
  statusBadge: { 
    display: 'inline-flex', // Alinha ícone e texto
    alignItems: 'center',
    padding: '3px 12px', // Mais espaço nas laterais
    borderRadius: '50px', // Deixa totalmente arredondado (estilo pílula)
    fontSize: '11px', 
    fontWeight: '800', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    border: '1px solid rgba(255, 255, 255, 0.05)', // Borda sutil para dar acabamento
  }

};