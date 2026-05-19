import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { BarChart3, Users, Truck, Calendar, Search, ShieldCheck, RefreshCw, FileText, ArrowUp, PieChart, TrendingUp, Activity } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

export default function DashboardGestor() {
  const [loading, setLoading] = useState(true);
  const [vistorias, setVistorias] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Filtros do Gestor
  const [busca, setBusca] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  // KPIs calculados
  const [kpis, setKpis] = useState({
    total: 0,
    concluidas: 0,
    emProcesso: 0,
    inicial: 0,
    placasUnicas: 0
  });

  const [rankingEquipes, setRankingEquipes] = useState({});
  const [dadosGraficoServicos, setDadosGraficoServicos] = useState({});
  const [dadosGraficoDias, setDadosGraficoDias] = useState({});

  // Monitora o scroll para mostrar/esconder a seta de voltar ao topo
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const voltarAoTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const carregarDadosGestor = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/Vistoria`);
      if (!response.ok) throw new Error("Erro ao buscar dados gerenciais");
      const data = await response.json();

      const formatados = data.map(v => ({
        id: v.id || v.Id,
        dataRaw: v.dataCriacao || v.DataCriacao,
        data: v.dataCriacao ? new Date(v.dataCriacao).toLocaleDateString('pt-BR') : '---',
        placa: (v.placa || v.Placa || '---').toUpperCase(),
        cliente: (v.cliente || v.Cliente || v.clienteNome || 'Não Informado').toUpperCase(),
        tipoServico: v.tipoServico || v.TipoServico || 'Geral',
        status: (v.status || v.Status || 'concluida').toLowerCase().trim(),
        equipe: v.equipe || v.Equipe || 'S/E',
        qtdFotos: v.evidencias || v.Evidencias ? (v.evidencias || v.Evidencias).length : 0
      }));

      formatados.sort((a, b) => new Date(b.dataRaw) - new Date(a.dataRaw));

      setVistorias(formatados);
      calcularMetricas(formatados);
    } catch (err) {
      console.error("Erro no painel do gestor:", err);
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (lista) => {
    const total = lista.length;
    const concluidas = lista.filter(v => v.status.includes('concl')).length;
    const emProcesso = lista.filter(v => v.status.includes('processo') || v.status.includes('proce')).length;
    const inicial = lista.filter(v => v.status.includes('inic')).length;
    
    const placas = new Set(lista.map(v => v.placa));

    setKpis({
      total,
      concluidas,
      emProcesso,
      inicial,
      placasUnicas: placas.size
    });

    // 1. Métrica de Ranking de Equipes
    const ranking = {};
    // 2. Métrica de Tipos de Serviço
    const servicos = {};
    // 3. Métrica Cronológica por Dia
    const dias = {};

    lista.forEach(v => {
      ranking[v.equipe] = (ranking[v.equipe] || 0) + 1;
      servicos[v.tipoServico] = (servicos[v.tipoServico] || 0) + 1;
      dias[v.data] = (dias[v.data] || 0) + 1;
    });

    setRankingEquipes(ranking);
    setDadosGraficoServicos(servicos);
    
    // Pega os últimos 5 dias com vistorias para o gráfico de linha/evolução
    const diasOrdenados = Object.entries(dias)
      .sort((a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-')))
      .slice(-5);
    setDadosGraficoDias(Object.fromEntries(diasOrdenados));
  };

  // Filtros inteligentes corrigidos para ignorar diferenças de underlines, espaços e nomenclaturas
  useEffect(() => {
    let resultado = vistorias;

    if (busca.trim() !== '') {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(v => 
        v.placa.toLowerCase().includes(termo) || 
        v.cliente.toLowerCase().includes(termo)
      );
    }

    if (filtroEquipe !== 'TODAS') {
      resultado = resultado.filter(v => {
        const eqVistoria = v.equipe.toLowerCase().replace(/[^0-9]/g, '');
        const eqFiltro = filtroEquipe.toLowerCase().replace(/[^0-9]/g, '');
        return eqVistoria === eqFiltro || v.equipe === filtroEquipe;
      });
    }

    if (filtroStatus !== 'TODOS') {
      resultado = resultado.filter(v => {
        const statusLimpo = v.status.replace('_', ' ').toLowerCase();
        const filtroLimpo = filtroStatus.replace('_', ' ').toLowerCase();
        
        if (filtroLimpo === 'concluida') {
          return statusLimpo.includes('concl');
        }
        if (filtroLimpo === 'em processo') {
          return statusLimpo.includes('processo') || statusLimpo.includes('proce');
        }
        if (filtroLimpo === 'inicial') {
          return statusLimpo.includes('inic');
        }
        return statusLimpo === filtroLimpo;
      });
    }

    setFiltradas(resultado);
  }, [busca, filtroEquipe, filtroStatus, vistorias]);

  useEffect(() => {
    carregarDadosGestor();
  }, []);

  // Encontra o maior valor para calibrar a escala visual dos gráficos
  const maxServicos = Math.max(...Object.values(dadosGraficoServicos), 1);
  const maxDias = Math.max(...Object.values(dadosGraficoDias), 1);

  return (
    <div style={styles.container}>
      {/* HEADER DO GESTOR */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}><ShieldCheck size={24} color="#63b3ed" /> Painel do Gestor</h2>
          <p style={styles.subtitle}>Visão analítica e auditoria de vistorias em tempo real</p>
        </div>
        <button onClick={carregarDadosGestor} disabled={loading} style={styles.btnAtualizar}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* BLOCO DE CARD DE INDICAÇÃO / KPIS */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}><FileText size={20} color="#63b3ed" /> <span>Total Vistorias</span></div>
          <span style={styles.kpiValue}>{kpis.total}</span>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}><BarChart3 size={20} color="#48bb78" /> <span>Concluídas</span></div>
          <span style={{ ...styles.kpiValue, color: '#48bb78' }}>{kpis.concluidas}</span>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}><Truck size={20} color="#ed8936" /> <span>Frota Atendida</span></div>
          <span style={styles.kpiValue}>{kpis.placasUnicas} <small style={{fontSize: '12px', color: '#a0aec0'}}>veículos</small></span>
        </div>
      </div>

      {/* RANKING VISUAL DE PRODUTIVIDADE POR EQUIPE */}
      <div style={styles.sectionCard}>
        <h4 style={styles.sectionTitle}><Users size={16} color="#63b3ed" /> Produtividade por Equipe</h4>
        <div style={styles.rankingContainer}>
          {Object.keys(rankingEquipes).length > 0 ? (
            Object.entries(rankingEquipes).map(([equipe, qtd]) => {
              const porcentagem = kpis.total > 0 ? (qtd / kpis.total) * 100 : 0;
              return (
                <div key={equipe} style={styles.rankingRow}>
                  <span style={styles.rankingLabel}>{equipe}</span>
                  <div style={styles.barWrapper}>
                    <div style={{ ...styles.barFill, width: `${porcentagem}%` }} />
                  </div>
                  <span style={styles.rankingCount}>{qtd} vist.</span>
                </div>
              );
            })
          ) : (
            <p style={{ color: '#a0aec0', fontSize: '14px' }}>Nenhum dado computado.</p>
          )}
        </div>
      </div>

      {/* FILTROS DE AUDITORIA */}
      <div style={styles.filterSection}>
        <div style={styles.searchBox}>
          <Search size={18} color="#4a5568" style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por Placa ou Cliente..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            style={styles.inputBusca}
          />
        </div>

        <div style={styles.selectGroup}>
          <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} style={styles.selectFiltragem}>
            <option value="TODAS">Todas Equipes</option>
            <option value="Equipe 01">Equipe 01</option>
            <option value="Equipe 02">Equipe 02</option>
            <option value="Equipe 03">Equipe 03</option>
            <option value="Equipe 04">Equipe 04</option>
            <option value="Equipe 05">Equipe 05</option>
          </select>

          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={styles.selectFiltragem}>
            <option value="TODOS">Todos Status</option>
            <option value="inicial">Inicial</option>
            <option value="em_processo">Em Processo</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>
      </div>

      {/* LISTA GERAL DE AUDITORIA DE VISTORIAS */}
      <div style={styles.tableCard}>
        <h4 style={{ ...styles.sectionTitle, padding: '15px 20px 5px 20px', margin: 0 }}>Registros Recentes ({filtradas.length})</h4>
        <div style={styles.tableWrapper}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Carregando dados consolidados...</p>
          ) : filtradas.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Placa</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Equipe</th>
                  <th style={styles.th}>Fotos</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v) => (
                  <tr key={v.id} style={styles.tr}>
                    <td style={styles.td}>{v.data}</td>
                    <td style={styles.td}><strong>{v.placa}</strong></td>
                    <td style={styles.td} title={v.cliente}>{v.cliente.length > 15 ? v.cliente.substring(0, 15) + '...' : v.cliente}</td>
                    <td style={styles.td}>{v.equipe}</td>
                    <td style={styles.td}><span style={styles.photoCount}>📸 {v.qtdFotos}</span></td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: v.status.includes('concl') ? 'rgba(72, 187, 120, 0.2)' : v.status.includes('proc') ? 'rgba(237, 137, 54, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                        color: v.status.includes('concl') ? '#48bb78' : v.status.includes('proc') ? '#ed8936' : '#94a3b8'
                      }}>{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Nenhuma vistoria corresponde aos filtros aplicados.</p>
          )}
        </div>
      </div>

      {/* SEÇÃO INJETADA COM OS 4 GRÁFICOS ANALÍTICOS */}
      <div style={styles.chartsGrid}>
        
        {/* GRÁFICO 1: Distribuição de Status */}
        <div style={styles.chartCard}>
          <h5 style={styles.chartTitle}><PieChart size={16} color="#48bb78" /> Distribuição por Status</h5>
          <div style={styles.pieContainer}>
            <div style={styles.pieRow}>
              <div style={{...styles.pieDot, background: '#48bb78'}} />
              <span style={styles.pieLabel}>Concluídas</span>
              <span style={styles.pieValueText}>{kpis.concluidas} ({kpis.total > 0 ? Math.round((kpis.concluidas/kpis.total)*100) : 0}%)</span>
            </div>
            <div style={{...styles.chartBarProgress, background: 'rgba(72, 187, 120, 0.2)'}}>
              <div style={{...styles.chartBarProgressFill, background: '#48bb78', width: `${kpis.total > 0 ? (kpis.concluidas/kpis.total)*100 : 0}%`}} />
            </div>

            <div style={{...styles.pieRow, marginTop: '12px'}}>
              <div style={{...styles.pieDot, background: '#ed8936'}} />
              <span style={styles.pieLabel}>Em Processo</span>
              <span style={styles.pieValueText}>{kpis.emProcesso} ({kpis.total > 0 ? Math.round((kpis.emProcesso/kpis.total)*100) : 0}%)</span>
            </div>
            <div style={{...styles.chartBarProgress, background: 'rgba(237, 137, 54, 0.2)'}}>
              <div style={{...styles.chartBarProgressFill, background: '#ed8936', width: `${kpis.total > 0 ? (kpis.emProcesso/kpis.total)*100 : 0}%`}} />
            </div>

            <div style={{...styles.pieRow, marginTop: '12px'}}>
              <div style={{...styles.pieDot, background: '#a0aec0'}} />
              <span style={styles.pieLabel}>Inicial / Aberto</span>
              <span style={styles.pieValueText}>{kpis.inicial} ({kpis.total > 0 ? Math.round((kpis.inicial/kpis.total)*100) : 0}%)</span>
            </div>
            <div style={{...styles.chartBarProgress, background: 'rgba(160, 174, 192, 0.2)'}}>
              <div style={{...styles.chartBarProgressFill, background: '#a0aec0', width: `${kpis.total > 0 ? (kpis.inicial/kpis.total)*100 : 0}%`}} />
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: Tipos de Serviços Realizados */}
        <div style={styles.chartCard}>
          <h5 style={styles.chartTitle}><Activity size={16} color="#63b3ed" /> Demanda por Tipo de Serviço</h5>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px'}}>
            {Object.keys(dadosGraficoServicos).length > 0 ? (
              Object.entries(dadosGraficoServicos).map(([servico, qtd]) => (
                <div key={servico}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px'}}>
                    <span style={{color: '#cbd5e0'}}>{servico}</span>
                    <span style={{fontWeight: 'bold', color: '#63b3ed'}}>{qtd}</span>
                  </div>
                  <div style={{background: '#0f172a', height: '6px', borderRadius: '3px', overflow: 'hidden'}}>
                    <div style={{background: '#63b3ed', height: '100%', width: `${(qtd / maxServicos) * 100}%`}} />
                  </div>
                </div>
              ))
            ) : (
              <p style={{color: '#64748b', fontSize: '12px'}}>Aguardando volumetria...</p>
            )}
          </div>
        </div>

        {/* GRÁFICO 3: Histórico Cronológico (Últimos Dias) */}
        <div style={styles.chartCard}>
          <h5 style={styles.chartTitle}><TrendingUp size={16} color="#9f7aea" /> Evolução Diária (Vistorias)</h5>
          <div style={styles.barChartVisualContainer}>
            {Object.keys(dadosGraficoDias).length > 0 ? (
              Object.entries(dadosGraficoDias).map(([data, qtd]) => (
                <div key={data} style={styles.barChartVisualColumn}>
                  <div style={{flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center'}}>
                    <div style={{
                      background: 'linear-gradient(to top, #718096, #9f7aea)',
                      width: '24px',
                      borderRadius: '4px 4px 0 0',
                      height: `${(qtd / maxDias) * 100}%`,
                      minHeight: '4px',
                      transition: 'height 0.3s ease',
                      position: 'relative'
                    }} title={`${qtd} vistorias`}>
                      <span style={styles.barChartTooltip}>{qtd}</span>
                    </div>
                  </div>
                  <span style={styles.barChartXLabel}>{data.substring(0, 5)}</span>
                </div>
              ))
            ) : (
              <p style={{color: '#64748b', fontSize: '12px', gridColumn: '1/-1', textAlign: 'center'}}>Sem histórico recente.</p>
            )}
          </div>
        </div>

        {/* GRÁFICO 4: Auditoria de Cobertura de Fotos por Vistoria */}
        <div style={styles.chartCard}>
          <h5 style={styles.chartTitle}><FileText size={16} color="#f6ad55" /> Média de Evidências Fotográficas</h5>
          <div style={{textAlign: 'center', padding: '10px 0'}}>
            <div style={{fontSize: '36px', fontWeight: 'bold', color: '#f6ad55', marginBottom: '5px'}}>
              {kpis.total > 0 ? (vistorias.reduce((acc, curr) => acc + curr.qtdFotos, 0) / kpis.total).toFixed(1) : "0.0"}
            </div>
            <p style={{color: '#94a3b8', fontSize: '12px', margin: 0}}>Média de fotos capturadas por check-list realizado</p>
            <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px'}}>
              <div>
                <span style={{display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase'}}>Total Mídias</span>
                <span style={{fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0'}}>{vistorias.reduce((acc, curr) => acc + curr.qtdFotos, 0)} mídias</span>
              </div>
              <div style={{borderLeft: '1px solid rgba(255,255,255,0.05)'}} />
              <div>
                <span style={{display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase'}}>Eficiência</span>
                <span style={{fontSize: '14px', fontWeight: 'bold', color: '#48bb78'}}>100% Auditável</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTÃO FLUTUANTE - SETA VOLTAR AO INÍCIO DA PÁGINA */}
      <button 
        onClick={voltarAoTopo} 
        style={{
          ...styles.btnScrollTop,
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none'
        }}
        title="Voltar ao topo"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0f172a', minHeight: '100vh', color: '#fff', fontFamily: '"Inter", sans-serif', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', gap: '10px' },
  title: { display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '22px', fontWeight: '800' },
  subtitle: { margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' },
  btnAtualizar: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 179, 237, 0.15)', color: '#63b3ed', border: '1px solid #63b3ed', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '25px' },
  kpiCard: { background: '#1e293b', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' },
  kpiHeader: { display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: '600' },
  kpiValue: { display: 'block', fontSize: '26px', fontWeight: 'bold', marginTop: '10px', color: '#fff' },
  sectionCard: { background: '#1e293b', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0', fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' },
  rankingContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  rankingRow: { display: 'flex', alignItems: 'center', gap: '15px' },
  rankingLabel: { width: '90px', fontSize: '13px', color: '#cbd5e0' },
  barWrapper: { flex: 1, background: '#0f172a', height: '10px', borderRadius: '5px', overflow: 'hidden' },
  barFill: { height: '100%', background: '#63b3ed', borderRadius: '5px', transition: 'width 0.4s ease' },
  rankingCount: { width: '55px', textAlign: 'right', fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' },
  filterSection: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' },
  searchBox: { position: 'relative', width: '100%' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' },
  inputBusca: { width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  selectGroup: { display: 'flex', gap: '10px' },
  selectFiltragem: { flex: 1, padding: '12px', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none' },
  tableCard: { background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '25px' },
  tableWrapper: { overflowX: 'auto', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 20px', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(0,0,0,0.1)' },
  td: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px', color: '#e2e8f0' },
  tr: { transition: 'background 0.2s' },
  photoCount: { fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', color: '#cbd5e0' },
  statusBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', display: 'inline-block' },
  
  // DESIGN SISTEMÁTICO DOS NOVOS ELEMENTOS SOLICITADOS
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' },
  chartCard: { background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  chartTitle: { display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 15px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
  pieContainer: { display: 'flex', flexDirection: 'column', gap: '4px' },
  pieRow: { display: 'flex', alignItems: 'center', fontSize: '13px' },
  pieDot: { width: '8px', height: '8px', borderRadius: '50%', marginRight: '8px' },
  pieLabel: { flex: 1, color: '#cbd5e0' },
  pieValueText: { fontWeight: 'bold', color: '#fff' },
  chartBarProgress: { width: '100%', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '4px', marginBottom: '8px' },
  chartBarProgressFill: { height: '100%', borderRadius: '3px' },
  barChartVisualContainer: { display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '120px', paddingTop: '15px' },
  barChartVisualColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', flex: 1 },
  barChartXLabel: { fontSize: '11px', color: '#64748b', marginTop: '6px' },
  barChartTooltip: { position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#cbd5e0', fontWeight: 'bold' },
  btnScrollTop: { position: 'fixed', bottom: '25px', right: '25px', background: '#63b3ed', color: '#0f172a', border: 'none', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.3s ease, transform 0.2s', zIndex: 100 }
};