import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { BarChart3, Users, Truck, Calendar, Search, ShieldCheck, RefreshCw, FileText } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

export default function DashboardGestor() {
  const [loading, setLoading] = useState(true);
  const [vistorias, setVistorias] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  
  // Filtros do Gestor
  const [busca, setBusca] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  // KPIs calculados
  const [kpis, setKpis] = useState({
    total: 0,
    concluidas: 0,
    emProcesso: 0,
    placasUnicas: 0
  });

  const [rankingEquipes, setRankingEquipes] = useState({});

  const carregarDadosGestor = async () => {
    setLoading(true);
    try {
      // Puxa o histórico geral para análise gerencial
      const response = await fetch(`${API_URL}/Vistoria`);
      if (!response.ok) throw new Error("Erro ao buscar dados gerenciais");
      const data = await response.json();

      // Formata os dados vindos da API .NET
      const formatados = data.map(v => ({
        id: v.id || v.Id,
        dataRaw: v.dataCriacao || v.DataCriacao,
        data: v.dataCriacao ? new Date(v.dataCriacao).toLocaleDateString('pt-BR') : '---',
        placa: (v.placa || v.Placa || '---').toUpperCase(),
        cliente: (v.cliente || v.Cliente || v.clienteNome || 'Não Informado').toUpperCase(),
        tipoServico: v.tipoServico || v.TipoServico || 'Geral',
        status: (v.status || v.Status || 'concluida').toLowerCase(),
        equipe: v.equipe || v.Equipe || 'S/E',
        qtdFotos: v.evidencias || v.Evidencias ? (v.evidencias || v.Evidencias).length : 0
      }));

      // Ordena por data mais recente
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
    const concluidas = lista.filter(v => v.status === 'concluida' || v.status === 'concluído').length;
    const emProcesso = lista.filter(v => v.status === 'em processo').length;
    
    // Contagem de caminhões únicos na frota inspecionada
    const placas = new Set(lista.map(v => v.placa));

    setKpis({
      total,
      concluidas,
      emProcesso,
      placasUnicas: placas.size
    });

    // Ranking de vistorias por equipe
    const ranking = {};
    lista.forEach(v => {
      ranking[v.equipe] = (ranking[v.equipe] || 0) + 1;
    });
    setRankingEquipes(ranking);
  };

  // Monitora alterações nos filtros e atualiza a listagem em tempo real
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
      resultado = resultado.filter(v => v.equipe === filtroEquipe);
    }

    if (filtroStatus !== 'TODOS') {
      resultado = resultado.filter(v => v.status === filtroStatus);
    }

    setFiltradas(resultado);
  }, [busca, filtroEquipe, filtroStatus, vistorias]);

  useEffect(() => {
    carregarDadosGestor();
  }, []);

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
                  <span style={styles.rankingLabel}>Equipe {equipe}</span>
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
            <option value="812">Equipe 812</option>
            <option value="811">Equipe 811</option>
            <option value="TFF">Equipe TFF</option>
            <option value="805">Equipe 805</option>
            <option value="810">Equipe 810</option>
          </select>

          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={styles.selectFiltragem}>
            <option value="TODOS">Todos Status</option>
            <option value="inicial">Inicial</option>
            <option value="em processo">Em Processo</option>
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
                        backgroundColor: v.status.includes('concl') ? 'rgba(72, 187, 120, 0.2)' : 'rgba(237, 137, 54, 0.2)',
                        color: v.status.includes('concl') ? '#48bb78' : '#ed8936'
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
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0f172a', minHeight: '100vh', color: '#fff', fontFamily: '"Inter", sans-serif' },
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
  statusBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', display: 'inline-block' }
};