import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipeFiltrada, setEquipeFiltrada] = useState('TODAS'); // Estado para o filtro

  useEffect(() => {
    buscarDados();
  }, []);

  async function buscarDados() {
    try {
      const { data, error } = await supabase.from('dashboard_vistorias').select('*');
      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error("Erro:", error.message);
    } finally {
      setLoading(false);
    }
  }
 // Função para abrir o Google Maps com a localização
    const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível para esta vistoria.");
    // Abre o Google Maps com as coordenadas
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(loc)}`, '_blank');
    
    };

  // Lógica de Agrupamento para os Cards
  const resumoEquipes = registros.reduce((acc, curr) => {
    const eq = curr.equipe || "S/N";
    acc[eq] = (acc[eq] || 0) + 1;
    return acc;
  }, {});

  // Formata o objeto resumoEquipes em um array que o gráfico entende
    const dadosGrafico = Object.entries(resumoEquipes).map(([nome, total]) => ({
    name: `Equipe ${nome}`,
    vistorias: total
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Filtragem da lista baseada no clique
  const dadosExibidos = equipeFiltrada === 'TODAS' 
    ? registros 
    : registros.filter(r => (r.equipe || "S/N") === equipeFiltrada);

  if (loading) return <p style={{padding: '20px'}}>Carregando Painel...</p>;


  const exportarExcel = () => {
  // 1. Prepara os dados para o Excel (limpando nomes de colunas)
  const dadosParaExportar = dadosExibidos.map(reg => ({
    Data: new Date(reg.data_vistoria).toLocaleDateString('pt-BR'),
    Placa: reg.placa,
    Equipe: reg.equipe || 'S/N',
    Observacao: reg.observacao || '',
    Cliente: reg.cliente_nome || 'Não Informado',
    Funcionario: reg.funcionario_email,
    Localizacao: reg.localizacao_texto,
    Link_Foto: `https://ptewdmezpswwrymtqgmg.supabase.co/storage/v1/object/public/vistorias/${reg.url_foto}`
  }));

  // 2. Cria a planilha
  const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vistorias");

  // 3. Gera o arquivo e faz o download
  const nomeArquivo = `Relatorio_Vistorias_${equipeFiltrada}_${new Date().toLocaleDateString('pt-BR')}.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
};

  return (
    <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Gestão de Equipes</h2>
        
        <button 
            onClick={exportarExcel}
            style={styles.btnExcel}
        >
            📊 Gerar Relatório Excel
        </button>
    </div>
      <h2 style={{fontSize: '18px', marginBottom: '15px'}}>Gestão de Equipes</h2>

      {/* Row de Seleção (Cards) */}
      <div style={styles.rowCards}>
        <div 
          onClick={() => setEquipeFiltrada('TODAS')}
          style={{...styles.cardResumo, borderLeftColor: '#666', opacity: equipeFiltrada === 'TODAS' ? 1 : 0.6}}
        >
          <small>Geral</small>
          <div style={styles.cardNum}>{registros.length}</div>
        </div>

        {Object.entries(resumoEquipes).map(([nome, total]) => (
          <div 
            key={nome} 
            onClick={() => setEquipeFiltrada(nome)}
            style={{
              ...styles.cardResumo, 
              opacity: equipeFiltrada === nome ? 1 : 0.6,
              transform: equipeFiltrada === nome ? 'scale(1.05)' : 'scale(1)',
              borderLeftColor: '#007bff'
            }}
          >
            <small>Equipe {nome}</small>
            <div style={styles.cardNum}>{total}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom: '10px', fontSize: '14px', color: '#666'}}>
        Exibindo: <strong>{equipeFiltrada}</strong> ({dadosExibidos.length} vistorias)
      </div>
        

      <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Produtividade por Equipe</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                <BarChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{fill: '#f5f5f5'}} />
                    <Bar dataKey="vistorias" radius={[5, 5, 0, 0]}>
                    {dadosGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
      </div>






      {/* Tabela Filtrada */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px' }}>
        <table style={styles.table}>
            <thead>
                <tr style={styles.header}>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Placa</th>
                <th style={styles.th}>Equipe</th>
                <th style={styles.th}>Observação</th>
                <th style={styles.th}>Funcionário</th>
                <th style={styles.th}>Localização</th> {/* Nova Coluna */}
                <th style={styles.th}>Ações</th>
                
                </tr>
            </thead>
            <tbody>
                {dadosExibidos.map((reg) => (
                <tr key={reg.id} style={styles.row}>
                    <td style={styles.td}>{new Date(reg.data_vistoria).toLocaleDateString('pt-BR')}</td>
                    <td style={styles.td}><strong>{reg.placa}</strong></td>
                    <td style={styles.td}><span style={styles.badge}>{reg.equipe || 'S/N'}</span></td>
                    {/* Célula da Observação */}
                    <td style={styles.tdObs}>
                        {reg.observacao || <span style={{color: '#ccc', fontSize: '11px'}}>Sem obs.</span>}
                    </td>
                    <td style={styles.td}>{reg.funcionario_email?.split('@')[0]}</td>
                    
                    {/* Coluna Localização com Botão */}
                    <td style={styles.td}>
                    <button 
                        onClick={() => abrirMapa(reg.localizacao_texto)} 
                        style={styles.btnMap}
                    >
                        📍 Ver Mapa
                    </button>
                    </td>

                    <td style={styles.td}>
                    <a 
                        href={`https://ptewdmezpswwrymtqgmg.supabase.co/storage/v1/object/public/vistorias/${reg.url_foto}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={styles.btnLink}
                    >
                        🖼️ Foto
                    </a>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '10px' },
  rowCards: { display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' },
  cardResumo: { 
    background: '#fff', padding: '15px', borderRadius: '10px', minWidth: '100px', 
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid', cursor: 'pointer', transition: 'all 0.2s' 
  },
  cardNum: { fontSize: '22px', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  header: { background: '#f4f4f4', textAlign: 'left' },
  th: { padding: '12px', borderBottom: '2px solid #ddd' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
  badge: { background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  btnLink: { color: '#007bff', textDecoration: 'none', fontWeight: 'bold' },
  btnExcel: {
    background: '#1D6F42', // Verde do Excel
    color: '#fff',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tdObs: {
    padding: '12px',
    borderBottom: '1px solid #eee',
    maxWidth: '200px',        // Limita a largura
    overflow: 'hidden',
    textOverflow: 'ellipsis', // Coloca "..." se o texto for muito longo
    whiteSpace: 'nowrap',    // Mantém em uma linha (opcional)
    fontSize: '12px',
    color: '#666'
  },
};