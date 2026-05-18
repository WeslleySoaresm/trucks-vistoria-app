import React, { useState } from 'react';
import { Car, CheckCircle2, Info, ShieldAlert, Gauge, X } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function CheckCar({ user }) {
  const [loading, setLoading] = useState(false);
  
  // 1. Dados Iniciais do Veículo
  const [dadosVeiculo, setDadosVeiculo] = useState({
    placa: '', modelo: '', cor: '', ano: '', combustivel: '', cliente: '', telefone: '', km: ''
  });
  
  // 2. Nível de Combustível (R, 1/4, 1/2, 3/4, 1/1)
  const [nivelCombustivel, setNivelCombustivel] = useState('R');

  // 3. Estado de Avarias do Carro Interativo (Peça -> Tipo de Avaria)
  const [avariasCarro, setAvariasCarro] = useState({});
  const [pecaSelecionada, setPecaSelecionada] = useState(null);

  // 4. Checklist Lateral Direita
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

  // Estado que armazena a resposta de cada item do checklist (Chave do Item -> Status)
  const [checklistItens, setChecklistItens] = useState(
    itensVistoriaLista.reduce((acc, item) => ({ ...acc, [item]: 'S' }), {})
  );

  const [observacoes, setObservacoes] = useState('');

  // Manipuladores de Input
  const handleInputChange = (campo, valor) => {
    setDadosVeiculo(prev => ({ ...prev, [campo]: valor.toUpperCase() }));
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

  // Envio dos dados estruturados para a API C#
  const salvarChecklistEntrada = async () => {
    if (!dadosVeiculo.placa || !dadosVeiculo.cliente) {
      alert("Placa e Cliente são campos obrigatórios para abrir o Checklist!");
      return;
    }

    setLoading(true);
    try {
      // Montagem do payload batendo com as propriedades exatas da entidade C#
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
        AvariasCarroJson: JSON.stringify(avariasCarro), // Transforma o objeto em String JSON para o campo jsonb
        ChecklistItensJson: JSON.stringify(checklistItens), // Transforma o checklist em String JSON para o campo jsonb
        Observacoes: observacoes.trim(),
        CriadoPor: user?.email || 'Vistoriador'
      };

      const response = await fetch(`${API_URL}/CheckCar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || "Erro ao salvar na API.");
      }

      alert("Checklist de Entrada salvo com sucesso e relatório gerado no banco!");
      
      // Limpeza dos estados após o sucesso
      setDadosVeiculo({ placa: '', modelo: '', cor: '', ano: '', combustivel: '', cliente: '', telefone: '', km: '' });
      setAvariasCarro({});
      setChecklistItens(itensVistoriaLista.reduce((acc, item) => ({ ...acc, [item]: 'S' }), {}));
      setObservacoes('');
      setNivelCombustivel('R');
    } catch (err) {
      console.error(err);
      alert(`Falha no salvamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pecasMapeadas = [
    { id: 'capo', nome: 'Capô Dianteiro', top: '48%', left: '32%', width: '60px', height: '50px' },
    { id: 'teto', nome: 'Teto / Capota', top: '48%', left: '50%', width: '60px', height: '60px' },
    { id: 'porta_de', nome: 'Porta Dianteira Esquerda', top: '15%', left: '46%', width: '65px', height: '25px' },
    { id: 'porta_te', nome: 'Porta Traseira Esquerda', top: '15%', left: '57%', width: '55px', height: '25px' },
    { id: 'porta_dd', nome: 'Porta Dianteira Direita', top: '78%', left: '46%', width: '65px', height: '25px' },
    { id: 'porta_td', nome: 'Porta Traseira Direita', top: '78%', left: '57%', width: '55px', height: '25px' },
    { id: 'para_brisa', nome: 'Para-brisa Dianteiro', top: '48%', left: '41%', width: '20px', height: '50px' },
    { id: 'vidro_traseiro', nome: 'Vidro Traseiro', top: '48%', left: '61%', width: '20px', height: '50px' },
    { id: 'traseira', nome: 'Porta-Malas / Traseira', top: '48%', left: '67%', width: '40px', height: '50px' },
    { id: 'frente', nome: 'Parachoque Dianteiro', top: '48%', left: '17%', width: '25px', height: '50px' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Checklist de Entrada (G.M.C)</h2>
        <span style={styles.subtitle}>Inspeção Pericial Dinâmica do Veículo</span>
      </div>

      {/* BLOCO 1: DADOS DO VEÍCULO E CLIENTE */}
      <div style={styles.card}>
        <div style={styles.cardHeader}><Car size={18} color="#60a5fa" /> Dados de Entrada</div>
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

      {/* BLOCO 2: NÍVEL DE COMBUSTÍVEL */}
      <div style={styles.card}>
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

      {/* LAYOUT DOIS LADOS: MAPA INTERATIVO VS CHECKLIST ITEM A ITEM */}
      <div style={styles.splitLayout}>
        
        {/* LADO ESQUERDO: CARRO INTERATIVO */}
        <div style={styles.mapaContainer}>
          <div style={styles.cardHeader}><ShieldAlert size={18} color="#f87171" /> Mapeamento de Avarias Visuais</div>
          <p style={styles.infoTxt}>Clique diretamente sobre as partes do carro abaixo para assinalar danos:</p>
          
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
                    backgroundColor: possuiAvaria ? 'rgba(239, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.08)',
                    borderColor: possuiAvaria ? '#ef4444' : 'rgba(255,255,255,0.15)'
                  }}
                >
                  {possuiAvaria ? <span style={styles.badgeAvaria}>{possuiAvaria}</span> : null}
                </button>
              );
            })}
          </div>

          {/* Modal Suspenso Interno Otimizado */}
          {pecaSelecionada && (
            <div style={styles.avariaModal}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Assinalar em: {pecasMapeadas.find(p => p.id === pecaSelecionada)?.nome}</h4>
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
            <strong>Legenda de Danos:</strong> A: Amassado | R: Riscado | X: Quebrado | F: Faltante | T: Trincado | M: Manchado
          </div>
        </div>

        {/* LADO DIREITO: CHECKLIST EXTRATOR/ACESSÓRIOS */}
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

      {/* TEXTAREA DE OBSERVAÇÕES FINAIS */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>Demais Observações do Perito</div>
        <textarea 
          placeholder="Escreva aqui observações adicionais sobre o motor, barulhos, chassi ou itens não listados..." 
          value={observacoes} 
          onChange={e => setObservacoes(e.target.value)} 
          style={styles.textarea} 
        />
      </div>

      {/* BOTÃO FINALIZAR GERAL */}
      <button 
        onClick={salvarChecklistEntrada} 
        disabled={loading} 
        style={styles.btnSalvarTudo}
      >
        {loading ? "SALVANDO E GERANDO RELATÓRIO..." : <><CheckCircle2 size={20} /> FINALIZAR ENTRADA E GERAR RELATÓRIO</>}
      </button>
    </div>
  );
}

const styles = {
  container: { width: '100%', color: '#fff', fontFamily: 'sans-serif', boxSizing: 'border-box' },
  header: { marginBottom: '20px' },
  title: { fontSize: '22px', fontWeight: '800', margin: '0 0 5px 0', color: '#f8fafc' },
  subtitle: { fontSize: '13px', color: '#94a3b8' },
  card: { background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', marginBottom: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#cbd5e1', marginBottom: '15px' },
  gridForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  combustivelFlex: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  btnNivel: { flex: 1, padding: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnNivelActive: { flex: 1, padding: '12px', background: '#3b82f6', border: '1px solid #3b82f6', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)' },
  splitLayout: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' },
  mapaContainer: { flex: 1.2, minWidth: '320px', background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', position: 'relative' },
  infoTxt: { fontSize: '13px', color: '#94a3b8', margin: '0 0 15px 0' },
  carWrapper: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', background: '#0f172a', borderRadius: '12px', padding: '20px 0', overflow: 'hidden' },
  carImg: { width: '90%', maxWidth: '440px', height: 'auto', pointerEvents: 'none', opacity: 0.85 },
  pecaBotao: { position: 'absolute', transform: 'translate(-50%, -50%)', border: '1px dashed', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', outline: 'none', zIndex: 5 },
  badgeAvaria: { background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '900', padding: '2px 5px', borderRadius: '4px' },
  avariaModal: { position: 'absolute', bottom: '70px', left: '16px', right: '16px', background: '#1e293b', border: '1px solid #475569', borderRadius: '12px', padding: '14px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.6)' },
  btnCloseModal: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avariaOpcoesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  btnOpcaoAvaria: { padding: '8px', background: '#334155', border: 'none', color: '#f1f5f9', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  btnLimparAvaria: { gridColumn: 'span 3', padding: '8px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' },
  legendaBox: { marginTop: '15px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '11px', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' },
  checklistItensBox: { flex: 1, minWidth: '320px', background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column' },
  scrollChecklist: { flex: 1, maxHeight: '380px', overflowY: 'auto', paddingRight: '5px' },
  itemLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  itemNome: { fontSize: '12px', color: '#e2e8f0', fontWeight: '500', maxWidth: '170px' },
  grupoBotoesStatus: { display: 'flex', gap: '3px' },
  btnStatusInativo: { width: '24px', height: '24px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  btnStatusAtivo: { width: '24px', height: '24px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' },
  legendaStatusBox: { marginTop: '15px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' },
  textarea: { width: '100%', height: '80px', padding: '12px', borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', resize: 'none', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  btnSalvarTudo: { width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s' }
};