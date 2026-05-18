import React, { useState } from 'react';
// Removemos totalmente o 'Car' daqui para não ter perigo de erro de digitação/importação
// IMPORTANTE: Importamos novos ícones do 'lucide-react' para a busca: 'FileText' e 'Search'
import { CheckCircle2, Info, ShieldAlert, Gauge, X, FileText, Search } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function CheckCar({ user }) {
  const [loading, setLoading] = useState(false);
  
  // =========================================================================
  // NOVOS ESTADOS PARA A FUNCIONALIDADE DE BUSCA DE RELATÓRIOS (Não remova)
  const [showSearch, setShowSearch] = useState(false);     // Controla a exibição do dropdown de busca
  const [searchTerm, setSearchTerm] = useState('');       // Armazena o termo digitado (Placa, Cliente, Veículo)
  const [searchResults, setSearchResults] = useState([]); // Armazena a lista de resultados retornados pela API
  const [selectedReport, setSelectedReport] = useState(null); // Armazena o relatório completo selecionado para visualização final
  // =========================================================================

  const [dadosVeiculo, setDadosVeiculo] = useState({
    placa: '', modelo: '', cor: '', ano: '', combustivel: '', cliente: '', telefone: '', km: ''
  });
  
  const [nivelCombustivel, setNivelCombustivel] = useState('R');
  const [avariasCarro, setAvariasCarro] = useState({});
  const [pecaSelecionada, setPecaSelecionada] = useState(null);

  const [pneus, setPneus] = useState({
    dianteiroDireito: { marca: '', estado: '' },
    dianteiroEsquerdo: { marca: '', estado: '' },
    traseiroDireito: { marca: '', estado: '' },
    traseiroEsquerdo: { marca: '', estado: '' },
    estepe: { marca: '', estado: '' }
  });

  const itensVistoriaLista = [
    "Extintor de Incêndio", "Bancos Dianteiros", "Bancos Traseiros", "Tapetes",
    "Radio (CD/DVD/Disqueteira)", "Retirada de Pertences Pessoais", "Documentos do Veículo",
    "Manual do Proprietário", "Manual de Garantia", "Alarme", "Acendedor de Cigarro",
    "Teto Interno", "Retrovisor Interno", "Cinto de Segurança", "Tag Pedágio",
    "Antena (Int/Ext)", "Rack", "Calota D.E.", "Calota D.D.", "Rodas de Liga D.E.",
    "Rodas de Liga D.D.", "Protetor de Carter", "Para-brisa", "Faróis Dianteiros / Piscas",
    "Faróis de Neblina", "Kit Sport", "Fluído de Freio", "Líquido de Arrefecimento",
    "Fluído D. Hidráulica", "Bateria (controle visual)", "Amortecedor", "Palhetas Dianteiras",
    "Portinhola Tanque Combustível", "Calota T.E.", "Calota T.D.", "Rodas de Liga T.E.",
    "Rodas de Liga T.D.", "Sensor de Estacionamento", "Ponteira Escapamento", "Bagagito",
    "Triângulo", "Chave de Roda", "Macaco", "Palheta Traseira", "Lanternas , Piscas Traseiros",
    "Break Light", "Amplificador", "Chaves", "Chaveiro"
  ];

  const [checklistItens, setChecklistItens] = useState(
    itensVistoriaLista.reduce((acc, item) => ({ ...acc, [item]: 'S' }), {})
  );

  const [observacoes, setObservacoes] = useState('');

  const handleInputChange = (campo, valor) => {
    setDadosVeiculo(prev => ({ ...prev, [campo]: valor.toUpperCase() }));
  };

  const handlePneuChange = (posicao, campo, valor) => {
    setPneus(prev => ({
      ...prev,
      [posicao]: { ...prev[posicao], [campo]: valor.toUpperCase() }
    }));
  };

  const alternarStatusItem = (item, status) => {
    setChecklistItens(prev => ({ ...prev, [item]: status }));
  };

  const aplicarAvariaPeça = (tipoAvaria) => {
    if (!pecaSelecionada) return;
    setAvariasCarro(prev => ({
      ...prev,
      [pecaSelecionada]: tipoAvaria === 'OK' ? null : tipoAvaria
    }));
    setPecaSelecionada(null);
  };

  const salvarChecklistEntrada = async () => {
    if (!dadosVeiculo.placa || !dadosVeiculo.cliente) {
      alert("Placa e Cliente são campos obrigatórios!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        Placa: dadosVeiculo.placa.trim().toUpperCase(),
        Modelo: dadosVeiculo.modelo.trim(),
        Cor: dadosVeiculo.cor.trim(),
        Ano: dadosVeiculo.ano.trim(),
        Combustivel: dadosVeiculo.combustivel.trim(),
        Km: dadosVeiculo.km.trim(),
        Cliente: dadosVeiculo.cliente.trim().toUpperCase(),
        Telefone: dadosVeiculo.telefone.trim(),
        NivelCombustivel: nivelCombustivel,
        AvariasCarroJson: JSON.stringify(avariasCarro),
        ChecklistItensJson: JSON.stringify(checklistItens),
        PneusJson: JSON.stringify(pneus),
        Observacoes: observacoes.trim(),
        CriadoPor: user?.email || 'Vistoriador'
      };

      const response = await fetch(`${API_URL}/CheckCar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || "Erro ao salvar na API.");
      }

      alert("Checklist de Entrada GMC salvo com sucesso!");
      
      setDadosVeiculo({ placa: '', modelo: '', cor: '', ano: '', combustivel: '', cliente: '', telefone: '', km: '' });
      setAvariasCarro({});
      setChecklistItens(itensVistoriaLista.reduce((acc, item) => ({ ...acc, [item]: 'S' }), {}));
      setPneus({
        dianteiroDireito: { marca: '', estado: '' },
        dianteiroEsquerdo: { marca: '', estado: '' },
        traseiroDireito: { marca: '', estado: '' },
        traseiroEsquerdo: { marca: '', estado: '' },
        estepe: { marca: '', estado: '' }
      });
      setObservacoes('');
      setNivelCombustivel('R');
    } catch (err) {
      console.error(err);
      alert(`Falha no salvamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // NOVA FUNÇÃO PARA BUSCAR RELATÓRIOS NA API (Não remova)
  const buscarRelatorios = async () => {
    // Validação básica: requer pelo menos 2 caracteres para buscar
    if (searchTerm.trim().length < 2) return;
    setLoading(true);
    try {
      // Faz a chamada para o endpoint de busca da sua API, passando o termo na URL
      const response = await fetch(`${API_URL}/CheckCar/search?term=${searchTerm}`);
      if (!response.ok) throw new Error("Erro na busca de relatórios.");
      const data = await response.json();
      // Atualiza o estado com a lista de resultados recebida
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      alert(`Falha na busca: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // =========================================================================

  const pecasMapeadas = [
    { id: 'frente', nome: 'Para-choque Dianteiro / Grade', top: '50%', left: '12%', width: '25px', height: '60px' },
    { id: 'capo', nome: 'Capô Dianteiro', top: '50%', left: '30%', width: '65px', height: '55px' },
    { id: 'para_brisa', nome: 'Para-brisa', top: '50%', left: '41%', width: '20px', height: '55px' },
    { id: 'teto', nome: 'Teto / Capota', top: '50%', left: '51%', width: '55px', height: '55px' },
    { id: 'vidro_traseiro', nome: 'Vidro Traseiro', top: '50%', left: '61%', width: '20px', height: '55px' },
    { id: 'traseira', nome: 'Tampa do Porta-Malas', top: '50%', left: '69%', width: '40px', height: '55px' },
    { id: 'traseira_bumper', nome: 'Para-choque Traseiro', top: '50%', left: '79%', width: '20px', height: '60px' },
    { id: 'lateral_esquerda_cima', nome: 'Lateral Esquerda (Cima no Layout)', top: '16%', left: '49%', width: '180px', height: '40px' },
    { id: 'lateral_direita_baixo', nome: 'Lateral Direita (Baixo no Layout)', top: '84%', left: '49%', width: '180px', height: '40px' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {/* Modificamos o flex para alinhar o título e o novo botão de busca */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={styles.title}>Checklist de Entrada (G.M.C)</h2>
            <span style={styles.subtitle}>Inspeção Pericial Dinâmica do Veículo</span>
          </div>
          {/* =============================================================== */}
          {/* NOVO BOTÃO PARA EXIBIR/OCULTAR A ABA DE BUSCA (Não remova) */}
          <button 
            type="button" 
            onClick={() => setShowSearch(!showSearch)} 
            style={styles.btnSearchTab}
          >
            {showSearch ? <><X size={18} /> FECHAR RELATÓRIOS</> : <><FileText size={18} /> BUSCAR RELATÓRIOS</>}
          </button>
          {/* =============================================================== */}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOVA ABA/DROPDOWN DE BUSCA DE RELATÓRIOS (Não remova) */}
      {showSearch && (
        <div style={styles.dropdownSearch}>
          <div style={styles.cardHeader}><Search size={18} color="#60a5fa" /> Buscar por Placa, Cliente ou Veículo</div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
              placeholder="Digite Placa ou Cliente..." 
              value={searchTerm} 
              // Garante que o termo de busca esteja em maiúsculas (padrão de placa)
              onChange={e => setSearchTerm(e.target.value.toUpperCase())}
              style={styles.input}
              // Permite buscar pressionando 'Enter'
              onKeyPress={(e) => e.key === 'Enter' && buscarRelatorios()}
            />
            <button type="button" onClick={buscarRelatorios} style={styles.btnAction}>BUSCAR</button>
          </div>

          <div style={styles.resultsContainer}>
            {loading && <p style={styles.infoTxt}>Carregando...</p>}
            {!loading && searchResults.length === 0 && searchTerm && <p style={styles.infoTxt}>Nenhum relatório encontrado para "{searchTerm}".</p>}
            
            {/* Mapeia e renderiza a lista de relatórios encontrados */}
            {searchResults.map(report => (
              <div 
                key={report.id} 
                style={styles.reportItem} 
                // Ao clicar no item da lista, armazena o relatório inteiro no estado 'selectedReport' para abrir a visualização final
                onClick={() => { setSelectedReport(report); setShowSearch(false); }}
              >
                <div style={styles.reportHeaderItem}>
                  <strong style={{fontSize: '15px', color: '#fff'}}>{report.Placa}</strong>
                  <span style={styles.tag}>{report.dataCriacao}</span>
                </div>
                <div style={styles.reportDetailItem}>
                  <span>🚗 {report.Modelo} | {report.Cor} | {report.Ano}</span>
                  <span style={{textAlign: 'right'}}>👤 {report.Cliente}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ========================================================================= */}

      {/* BLOCO 1: DADOS DO VEÍCULO E CLIENTE */}
      <div style={styles.card}>
        <div style={styles.cardHeader}><span style={{fontSize: '18px'}}>🚗</span> Dados de Entrada</div>
        <div style={styles.gridForm}>
          <input placeholder="PLACA" value={dadosVeiculo.placa} onChange={e => handleInputChange('placa', e.target.value)} style={styles.input} />
          <input placeholder="MODELO" value={dadosVeiculo.modelo} onChange={e => handleInputChange('modelo', e.target.value)} style={styles.input} />
          <input placeholder="COR" value={dadosVeiculo.cor} onChange={e => handleInputChange('cor', e.target.value)} style={styles.input} />
          <input placeholder="ANO" value={dadosVeiculo.ano} onChange={e => handleInputChange('ano', e.target.value)} style={styles.input} />
          <input placeholder="COMBUSTÍVEL" value={dadosVeiculo.combustivel} onChange={e => handleInputChange('combustivel', e.target.value)} style={styles.input} />
          <input placeholder="KM ATUAL" value={dadosVeiculo.km} onChange={e => handleInputChange('km', e.target.value)} style={styles.input} />
          <input placeholder="CLIENTE" value={dadosVeiculo.cliente} onChange={e => handleInputChange('cliente', e.target.value)} style={styles.input} />
          <input placeholder="TELEFONE" value={dadosVeiculo.telefone} onChange={e => handleInputChange('telefone', e.target.value)} style={styles.input} />
        </div>
      </div>

      <div style={styles.splitLayout}>
        <div style={styles.leftColumn}>
          <div style={styles.cardInternal}>
            <div style={styles.cardHeader}><Gauge size={18} color="#60a5fa" /> Nível de Combustível</div>
            <div style={styles.combustivelFlex}>
              {['R', '1/4', '1/2', '3/4', '1/1'].map(nivel => (
                <button 
                  key={nivel} 
                  type="button"
                  onClick={() => setNivelCombustivel(nivel)} 
                  style={nivelCombustivel === nivel ? styles.btnNivelActive : styles.btnNivel}
                >
                  {nivel === 'R' ? 'Reserva (R)' : nivel}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.mapaContainer}>
            <div style={styles.cardHeader}><ShieldAlert size={18} color="#f87171" /> Mapeamento de Avarias Visuais</div>
            <p style={styles.infoTxt}>Clique diretamente sobre o contorno das peças para registrar danos:</p>
            
            <div style={styles.carWrapper}>
              <img src="/contorno-carro.png" alt="Mapeamento Veicular" style={styles.carImg} />
              
              {pecasMapeadas.map(peca => {
                const possuiAvaria = avariasCarro[peca.id];
                return (
                  <button
                    key={peca.id}
                    type="button"
                    onClick={() => setPecaSelecionada(peca.id)}
                    title={peca.nome}
                    style={{
                      ...styles.pecaBotao,
                      top: peca.top,
                      left: peca.left,
                      width: peca.width,
                      height: peca.height,
                      backgroundColor: possuiAvaria ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.04)',
                      borderColor: possuiAvaria ? '#ef4444' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {possuiAvaria ? <span style={styles.badgeAvaria}>{possuiAvaria}</span> : null}
                  </button>
                );
              })}
            </div>

            {pecaSelecionada && (
              <div style={styles.avariaModal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#f1f5f9' }}>Dano em: {pecasMapeadas.find(p => p.id === pecaSelecionada)?.nome}</h4>
                  <button type="button" onClick={() => setPecaSelecionada(null)} style={styles.btnCloseModal}><X size={16} /></button>
                </div>
                <div style={styles.avariaOpcoesGrid}>
                  <button type="button" onClick={() => aplicarAvariaPeça('A')} style={styles.btnOpcaoAvaria}>[A] Amassado</button>
                  <button type="button" onClick={() => aplicarAvariaPeça('R')} style={styles.btnOpcaoAvaria}>[R] Riscado</button>
                  <button type="button" onClick={() => aplicarAvariaPeça('X')} style={styles.btnOpcaoAvaria}>[X] Quebrado</button>
                  <button type="button" onClick={() => aplicarAvariaPeça('F')} style={styles.btnOpcaoAvaria}>[F] Faltante</button>
                  <button type="button" onClick={() => aplicarAvariaPeça('T')} style={styles.btnOpcaoAvaria}>[T] Trincado</button>
                  <button type="button" onClick={() => aplicarAvariaPeça('M')} style={styles.btnOpcaoAvaria}>[M] Manchado</button>
                  <button type="button" onClick={() => aplicarAvariaPeça('OK')} style={styles.btnLimparAvaria}>Sem Avarias (OK)</button>
                </div>
              </div>
            )}

            <div style={styles.legendaBox}>
              <strong>Legenda:</strong> A: Amassado | R: Riscado | X: Quebrado | F: Faltante | T: Trincado | M: Manchado
            </div>
          </div>

          <div style={styles.cardInternal}>
            <div style={styles.cardHeader}><Info size={16} color="#60a5fa" /> Verificação de Pneus</div>
            <table style={styles.tablePneus}>
              <thead>
                <tr>
                  <th style={styles.th}>PNEU</th>
                  <th style={styles.th}>MARCA</th>
                  <th style={styles.th}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'dianteiroDireito', label: 'Dianteiro Direito' },
                  { id: 'dianteiroEsquerdo', label: 'Dianteiro Esquerdo' },
                  { id: 'traseiroDireito', label: 'Traseiro Direito' },
                  { id: 'traseiroEsquerdo', label: 'Traseiro Esquerdo' },
                  { id: 'estepe', label: 'Estepe' }
                ].map(pneu => (
                  <tr key={pneu.id}>
                    <td style={styles.tdLabel}>{pneu.label}</td>
                    <td style={styles.tdInput}>
                      <input 
                        value={pneus[pneu.id].marca} 
                        onChange={e => handlePneuChange(pneu.id, 'marca', e.target.value)} 
                        style={styles.tableInputField} 
                        placeholder="Marca"
                      />
                    </td>
                    <td style={styles.tdInput}>
                      <input 
                        value={pneus[pneu.id].estado} 
                        onChange={e => handlePneuChange(pneu.id, 'estado', e.target.value)} 
                        style={styles.tableInputField} 
                        placeholder="Estado"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.checklistItensBox}>
          <div style={styles.cardHeader}><Info size={18} color="#10b981" /> Itens de Vistoria e Verificação</div>
          <div style={styles.scrollChecklist}>
            {itensVistoriaLista.map(item => (
              <div key={item} style={styles.itemLinha}>
                <span style={styles.itemNome}>{item}</span>
                <div style={styles.grupoBotoesStatus}>
                  {['S', 'N', 'I', 'A', 'M'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => alternarStatusItem(item, st)}
                      style={checklistItens[item] === st ? styles.btnStatusAtivo : styles.btnStatusInativo}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={styles.legendaStatusBox}>
            <strong>Status:</strong> S: Sim/OK | N: Não | I: Incompleto | A: Avariado | M: Manchado
          </div>
        </div>

      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Demais Observações do Perito</div>
        <textarea 
          placeholder="Escreva aqui observações adicionais..." 
          value={observacoes} 
          onChange={e => setObservacoes(e.target.value)} 
          style={styles.textarea} 
        />
      </div>

      <button onClick={salvarChecklistEntrada} disabled={loading} style={styles.btnSalvarTudo}>
        {loading ? "SALVANDO..." : <><CheckCircle2 size={20} /> FINALIZAR ENTRADA E GERAR RELATÓRIO</>}
      </button>

      {/* ========================================================================= */}
      {/* NOVA COMPONENTE PARA VISUALIZAÇÃO DO RELATÓRIO FINAL (Overlay) (Não remova) */}
      {selectedReport && (
        <div style={styles.finalReportOverlay}>
          <div style={styles.finalReportContent}>
            <div style={styles.finalReportHeader}>
              <h2 style={{margin: 0, color: '#f8fafc'}}>Relatório de Vistoria Final - {selectedReport.Placa}</h2>
              {/* Botão para fechar a visualização do relatório final */}
              <button onClick={() => setSelectedReport(null)} style={styles.btnCloseModal}><X size={24} /></button>
            </div>
            {/* ======================================================= */}
            {/* IMPLEMENTAÇÃO DO CONTEÚDO VISUAL DO RELATÓRIO FINAL */}
            {/* Este componente precisa ser preenchido com a estrutura e o design que você deseja para o relatório final. */}
            {/* Abaixo está um exemplo básico apenas para demonstrar que os dados foram carregados. */}
            <p style={styles.infoTxt}>Detalhes do Relatório Final para {selectedReport.Placa} de {selectedReport.Cliente} vão aqui.</p>
            <p style={styles.infoTxt}>O objeto 'selectedReport' contém todos os dados que você salvou no checklist.</p>
            <p style={styles.infoTxt}>Este componente de Relatório Final precisa ser desenvolvido separadamente com a estrutura visual do relatório.</p>
            {/* ======================================================= */}
          </div>
        </div>
      )}
      {/* ========================================================================= */}

    </div>
  );
}

const styles = {
  container: { width: '100%', color: '#fff', fontFamily: 'sans-serif', boxSizing: 'border-box' },
  header: { marginBottom: '20px' },
  title: { fontSize: '22px', fontWeight: '800', margin: '0 0 5px 0', color: '#f8fafc' },
  subtitle: { fontSize: '13px', color: '#94a3b8' },
  
  // =========================================================================
  // NOVOS ESTILOS PARA A FUNCIONALIDADE DE BUSCA E RELATÓRIO FINAL (Não remova)
  btnSearchTab: { 
    background: '#1f2937', 
    color: '#fff', 
    border: '1px solid rgba(255,255,255,0.05)', 
    borderRadius: '10px', 
    padding: '10px 16px', 
    fontWeight: '600', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    cursor: 'pointer', 
    transition: 'all 0.1s' 
  },
  btnAction: { 
    background: '#3b82f6', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '10px', 
    padding: '12px 20px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    outline: 'none' 
  },
  dropdownSearch: { 
    background: '#111827', 
    border: '1px solid rgba(255,255,255,0.05)', 
    borderRadius: '16px', 
    padding: '16px', 
    marginBottom: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
  },
  resultsContainer: { maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' },
  reportItem: { 
    background: '#0f172a', 
    padding: '14px', 
    borderRadius: '10px', 
    marginBottom: '8px', 
    border: '1px solid rgba(255,255,255,0.03)', 
    cursor: 'pointer', 
    transition: 'all 0.1s' 
  },
  reportHeaderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  reportDetailItem: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' },
  tag: { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' },
  
  finalReportOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    width: '100vw', 
    height: '100vh', 
    background: 'rgba(0,0,0,0.85)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 9999, 
    overflowY: 'auto' 
  },
  finalReportContent: { 
    background: '#111827', 
    border: '1px solid #475569', 
    borderRadius: '20px', 
    width: '90%', 
    maxWidth: '900px', 
    maxHeight: '85vh', 
    padding: '30px', 
    color: '#fff', 
    boxSizing: 'border-box',
    overflowY: 'auto'
  },
  finalReportHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  // =========================================================================

  // ESTILOS ORIGINAIS (Não alterados)
  card: { background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', marginBottom: '20px' },
  cardInternal: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', marginBottom: '15px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#cbd5e1', marginBottom: '15px' },
  gridForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  splitLayout: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' },
  leftColumn: { flex: 1.3, minWidth: '320px', display: 'flex', flexDirection: 'column' },
  combustivelFlex: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btnNivel: { flex: 1, padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
  btnNivelActive: { flex: 1, padding: '10px', background: '#3b82f6', border: '1px solid #3b82f6', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)' },
  mapaContainer: { background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', position: 'relative', marginBottom: '15px' },
  infoTxt: { fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' },
  carWrapper: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', background: '#0f172a', borderRadius: '12px', padding: '20px 0', overflow: 'hidden' },
  carImg: { width: '95%', maxWidth: '450px', height: 'auto', pointerEvents: 'none', opacity: 0.9 },
  pecaBotao: { position: 'absolute', transform: 'translate(-50%, -50%)', border: '1px dashed', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', outline: 'none', zIndex: 5 },
  badgeAvaria: { background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '1px 4px', borderRadius: '3px' },
  avariaModal: { position: 'absolute', bottom: '65px', left: '16px', right: '16px', background: '#1e293b', border: '1px solid #475569', borderRadius: '12px', padding: '12px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.6)' },
  btnCloseModal: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avariaOpcoesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
  btnOpcaoAvaria: { padding: '8px', background: '#334155', border: 'none', color: '#f1f5f9', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  btnLimparAvaria: { gridColumn: 'span 3', padding: '8px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginTop: '2px' },
  legendaBox: { marginTop: '12px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' },
  tablePneus: { width: '100%', borderCollapse: 'collapse', marginTop: '5px' },
  th: { textAlign: 'left', padding: '8px', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: '600' },
  tdLabel: { padding: '8px', fontSize: '12px', color: '#e2e8f0', fontWeight: '500' },
  tdInput: { padding: '4px' },
  tableInputField: { width: '100%', padding: '6px 10px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' },
  checklistItensBox: { flex: 1, minWidth: '320px', background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column' },
  scrollChecklist: { flex: 1, maxHeight: '540px', overflowY: 'auto', paddingRight: '5px' },
  itemLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  itemNome: { fontSize: '12px', color: '#e2e8f0', fontWeight: '500' },
  grupoBotoesStatus: { display: 'flex', gap: '3px' },
  btnStatusInativo: { width: '24px', height: '24px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  btnStatusAtivo: { width: '24px', height: '24px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' },
  legendaStatusBox: { marginTop: '15px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' },
  textarea: { width: '100%', height: '80px', padding: '12px', borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', resize: 'none', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  btnSalvarTudo: { width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }
};