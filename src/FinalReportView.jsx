import React from 'react';
import { Printer, X } from 'lucide-react';

export default function FinalReportView({ report, onClose }) {
  if (!report) return null;

  // 1. Normalização dos dados gerais do veículo (Garante leitura de campos maiúsculos ou minúsculos da API)
  const placa = report.placa || report.Placa || "N/D";
  const modelo = report.modelo || report.Modelo || "N/D";
  const cor = report.cor || report.Cor || "N/D";
  const ano = report.ano || report.Ano || "N/D";
  const combustivel = report.combustivel || report.Combustivel || "N/D";
  const km = report.km || report.Km || "0";
  const cliente = report.cliente || report.Cliente || "N/D";
  const telefone = report.telefone || report.Telefone || "N/D";
  const nivelCombustivel = report.nivelCombustivel || report.NivelCombustivel || "R";
  const observacoes = report.observacoes || report.Observacoes || "Nenhuma observação registrada.";
  const dataCriacao = report.data_cadastro || report.DataCadastro || report.dataCriacao || "N/D";

  // 2. Parse seguro das strings JSON vindas do Banco de Dados
  const parseJsonSeguro = (dados) => {
    if (!dados) return {};
    if (typeof dados === 'object') return dados; // Se já vier como objeto
    try {
      return JSON.parse(dados);
    } catch (e) {
      console.error("Erro ao converter JSON:", e);
      return {};
    }
  };

  const avarias = parseJsonSeguro(report.avariasCarroJson || report.AvariasCarroJson || report.avariasCarro || report.AvariasCarro);
  const checklistItens = parseJsonSeguro(report.checklistItensJson || report.ChecklistItensJson || report.checklistItens || report.ChecklistItens);
  const pneus = parseJsonSeguro(report.pneusJson || report.PneusJson || report.pneus || report.Pneus);

  // Mapeamento visual das posições para renderizar as letras vermelhas em cima do carro no relatório
  const pecasMapeadas = [
    { id: 'frente', top: '50%', left: '12%', width: '25px', height: '60px' },
    { id: 'capo', top: '50%', left: '30%', width: '65px', height: '55px' },
    { id: 'para_brisa', top: '50%', left: '41%', width: '20px', height: '55px' },
    { id: 'teto', top: '50%', left: '51%', width: '55px', height: '55px' },
    { id: 'vidro_traseiro', top: '50%', left: '61%', width: '20px', height: '55px' },
    { id: 'traseira', top: '50%', left: '69%', width: '40px', height: '55px' },
    { id: 'traseira_bumper', top: '50%', left: '79%', width: '20px', height: '60px' },
    { id: 'lateral_esquerda_cima', top: '16%', left: '49%', width: '180px', height: '40px' },
    { id: 'lateral_direita_baixo', top: '84%', left: '49%', width: '180px', height: '40px' },
  ];

  // Tradução das siglas das avarias para texto descritivo por extenso
  const obterNomeAvaria = (sigla) => {
    const legenda = { A: 'Amassado', R: 'Riscado', X: 'Quebrado', F: 'Faltante', T: 'Trincado', M: 'Manchado' };
    return legenda[sigla] || sigla;
  };

  const listaAvariasRegistradas = Object.entries(avarias).filter(([_, valor]) => valor);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.pageContainer}>
      {/* Botões de Ação da Janela (Escondidos na Impressão Física) */}
      <div style={styles.noPrintHeader}>
        <button onClick={handlePrint} style={styles.btnPrint}><Printer size={16} /> IMPRIMIR</button>
        <button onClick={onClose} style={styles.btnClose}><X size={16} /> FECHAR</button>
      </div>

      {/* ÁREA DE IMPRESSÃO (Fundo Branco Padrão Papel Timbrado) */}
      <div className="print-area" style={styles.printArea}>
        
        {/* CABEÇALHO */}
        <div style={styles.headerFlex}>
          <div>
            <h1 style={styles.mainTitle}>CHECKLIST DE ENTRADA</h1>
            <p style={styles.subTitle}>G.M.C CENTRO DE REPARAÇÃO AUTOMOTIVA</p>
          </div>
          <div style={styles.boxDataHora}>
            <div><strong>Data de Chegada:</strong> {dataCriacao.split('T')[0]}</div>
            <div><strong>Horário:</strong> {dataCriacao.includes('T') ? dataCriacao.split('T')[1].substring(0, 5) : '--:--'}</div>
          </div>
        </div>

        {/* DADOS DO VEÍCULO */}
        <div style={styles.secaoTitulo}>DADOS DO VEÍCULO</div>
        <table style={styles.tabelaDados}>
          disabledBorder
          <tbody>
            <tr>
              <td style={styles.tdDado}><strong>PLACA:</strong> <span style={styles.valorPlaca}>{placa}</span></td>
              <td style={styles.tdDado}><strong>MODELO:</strong> {modelo}</td>
              <td style={styles.tdDado}><strong>COR:</strong> {cor}</td>
            </tr>
            <tr>
              <td style={styles.tdDado}><strong>ANO:</strong> {ano}</td>
              <td style={styles.tdDado}><strong>COMBUSTÍVEL:</strong> {combustivel}</td>
              <td style={styles.tdDado}><strong>CLIENTE:</strong> {cliente}</td>
            </tr>
            <tr>
              <td style={styles.tdDado} colSpan={2}><strong>TELEFONE:</strong> {telefone}</td>
              <td style={styles.tdDado}><strong>KM ATUAL:</strong> {km} KM</td>
            </tr>
          </tbody>
        </table>

        {/* ESTADO DE ENTRADA & COMBUSTÍVEL */}
        <div style={styles.secaoTitulo}>ESTADO NA ENTRADA</div>
        <div style={styles.combustivelContainer}>
          <strong>NÍVEL DE COMBUSTÍVEL:</strong>
          <div style={styles.combustivelBarra}>
            {['R', '1/4', '1/2', '3/4', '1/1'].map(nivel => (
              <span 
                key={nivel} 
                style={nivelCombustivel === nivel ? styles.nivelAtivo : styles.nivelInativo}
              >
                {nivel === 'R' ? 'Reserva (R)' : nivel}
              </span>
            ))}
          </div>
        </div>

        {/* CONTAINER DO MEIO: CARRO E ITENS */}
        <div style={styles.colunasFlex}>
          
          {/* MAPEAMENTO DE AVARIAS (Esquerda) */}
          <div style={{ flex: 1.2, position: 'relative' }}>
            <div style={styles.subSecaoTitulo}>MAPEAMENTO DE AVARIAS EXTERNAS</div>
            <div style={styles.carWrapper}>
              <img src="/contorno-carro.png" alt="Carro" style={styles.carImg} />
              {pecasMapeadas.map(peca => {
                const avariaDaPeca = avarias[peca.id];
                if (!avariaDaPeca) return null;
                return (
                  <div
                    key={peca.id}
                    style={{
                      ...styles.pecaAvariaBadge,
                      top: peca.top,
                      left: peca.left,
                    }}
                  >
                    {avariaDaPeca}
                  </div>
                );
              })}
            </div>

            <div style={styles.detalheAvariasBox}>
              <strong>Detalhamento das Avarias:</strong>
              {listaAvariasRegistradas.length === 0 ? (
                <p style={{ color: '#10b981', margin: '5px 0 0 0', fontSize: '12px' }}>Nenhuma avaria externa registrada.</p>
              ) : (
                <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '11px' }}>
                  {listaAvariasRegistradas.map(([pecaId, sigla]) => (
                    <li key={pecaId}>
                      <span style={{ textTransform: 'uppercase' }}>{pecaId.replace(/_/g, ' ')}</span>: <strong style={{ color: '#ef4444' }}>{obterNomeAvaria(sigla)} ({sigla})</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* TABELA DE PNEUS ENCAIXADA ABAIXO DO CARRO */}
            <div style={{ marginTop: '15px' }}>
              <div style={styles.subSecaoTitulo}>VERIFICAÇÃO DE PNEUS</div>
              <table style={styles.tabelaPneus}>
                <thead>
                  <tr>
                    <th style={styles.thPneu}>PNEU</th>
                    <th style={styles.thPneu}>MARCA</th>
                    <th style={styles.thPneu}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(pneus).length > 0 ? (
                    Object.entries(pneus).map(([key, value]) => (
                      <tr key={key}>
                        <td style={styles.tdPneu}>{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td style={styles.tdPneu}>{value.marca || '---'}</td>
                        <td style={styles.tdPneu}>{value.estado || '---'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} style={styles.tdPneu}>Nenhum dado de pneus registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ITENS DE VISTORIA (Direita) */}
          <div style={{ flex: 1 }}>
            <div style={styles.subSecaoTitulo}>ITENS DE VISTORIA E VERIFICAÇÃO</div>
            <div style={styles.tabelaItensContainer}>
              <table style={styles.tabelaItens}>
                <thead>
                  <tr>
                    <th style={styles.thItem}>Item</th>
                    <th style={styles.thItemCentrado}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(checklistItens).map(([item, status]) => (
                    <tr key={item} style={styles.linhaItem}>
                      <td style={styles.tdItemName}>{item}</td>
                      <td style={styles.tdItemStatus}>
                        <span style={styles.badgeStatus(status)}>{status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={styles.legendaItensPrint}>
              <strong>Legenda:</strong> S: Sim/OK | N: Não | I: Incompleto | A: Avariado | M: Manchado
            </div>
          </div>

        </div>

        {/* OBSERVAÇÕES DO PERITO */}
        <div style={styles.secaoTitulo}>OBSERVAÇÕES DO PERITO / DEMAIS OBSERVAÇÕES</div>
        <div style={styles.observacoesBox}>{observacoes}</div>

        {/* ASSINATURAS */}
        <div style={styles.assinaturasFlex}>
          <div style={styles.blocoAssinatura}>
            <div style={styles.linhaAssinatura}></div>
            <span>Responsável pela Inspeção</span>
          </div>
          <div style={styles.blocoAssinatura}>
            <div style={styles.linhaAssinatura}></div>
            <span>Assinatura do Cliente ou Autorizado</span>
          </div>
        </div>

      </div>

      {/* Regra CSS Injetada dinamicamente para ocultar botões e ajustar margens na impressão real */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .${styles.noPrintHeader} { display: none !important; }
          div { box-shadow: none !important; border-radius: 0 !important; }
          .print-area { margin: 0 !important; padding: 0 !important; max-width: 100% !important; border: none !important; }
        }
      `}} />
    </div>
  );
}

// ESTILOS FORMATADOS EM JAVASCRIPT COM CORES DE PAPEL BRANCO PARA O RELATÓRIO FINAL
const styles = {
  pageContainer: { width: '100%', background: '#111827', minHeight: '100vh', padding: '10px 0', boxSizing: 'border-box' },
  noPrintHeader: { display: 'flex', justifyContent: 'flex-end', gap: '10px', maxWidth: '900px', margin: '0 auto 15px auto', padding: '0 10px' },
  btnPrint: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnClose: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  printArea: { background: '#fff', color: '#000', maxWidth: '880px', margin: '0 auto', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', boxSizing: 'border-box' },
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '15px' },
  mainTitle: { fontSize: '24px', fontWeight: '900', margin: 0, color: '#000', letterSpacing: '1px' },
  subTitle: { fontSize: '13px', margin: '4px 0 0 0', color: '#4b5563', fontWeight: 'bold' },
  boxDataHora: { background: '#f3f4f6', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', textAlign: 'right', color: '#000' },
  secaoTitulo: { background: '#334155', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '6px 10px', borderRadius: '4px', letterSpacing: '0.5px', marginTop: '15px', marginBottom: '10px', textTransform: 'uppercase' },
  subSecaoTitulo: { background: '#f1f5f9', borderLeft: '3px solid #334155', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', marginBottom: '10px' },
  tabelaDados: { width: '100%', borderCollapse: 'collapse', marginBottom: '10px' },
  tdDado: { border: '1px solid #cbd5e1', padding: '8px', fontSize: '12px', color: '#000' },
  valorPlaca: { background: '#000', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' },
  combustivelContainer: { display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', fontSize: '12px' },
  combustivelBarra: { display: 'flex', gap: '5px' },
  nivelInativo: { padding: '3px 8px', background: '#f3f4f6', color: '#9ca3af', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '11px' },
  nivelAtivo: { padding: '3px 8px', background: '#000', color: '#fff', fontWeight: 'bold', borderRadius: '4px', fontSize: '11px' },
  colunasFlex: { display: 'flex', gap: '25px', marginTop: '15px' },
  carWrapper: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px 0' },
  carImg: { width: '90%', maxWidth: '380px', height: 'auto', opacity: 0.85 },
  pecaAvariaBadge: { position: 'absolute', transform: 'translate(-50%, -50%)', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '900', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  detalheAvariasBox: { marginTop: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' },
  tabelaPneus: { width: '100%', borderCollapse: 'collapse' },
  thPneu: { textTransform: 'uppercase', background: '#f1f5f9', fontSize: '10px', padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' },
  tdPneu: { fontSize: '11px', padding: '6px', border: '1px solid #cbd5e1', color: '#000' },
  tabelaItensContainer: { maxHeight: '420px', overflowY: 'visible', border: '1px solid #cbd5e1', borderRadius: '6px' },
  tabelaItens: { width: '100%', borderCollapse: 'collapse' },
  thItem: { background: '#f1f5f9', fontSize: '11px', padding: '6px', borderBottom: '2px solid #cbd5e1', textAlign: 'left' },
  thItemCentrado: { background: '#f1f5f9', fontSize: '11px', padding: '6px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', width: '50px' },
  linhaItem: { borderBottom: '1px solid #e2e8f0' },
  tdItemName: { fontSize: '11px', padding: '5px 8px', color: '#000', fontWeight: '500' },
  tdItemStatus: { padding: '4px', textAlign: 'center' },
  badgeStatus: (status) => ({
    display: 'inline-block',
    width: '18px',
    height: '18px',
    lineHeight: '18px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: status === 'S' ? '#10b981' : status === 'N' ? '#ef4444' : '#f59e0b',
    textAlign: 'center'
  }),
  legendaItensPrint: { marginTop: '8px', fontSize: '10px', color: '#4b5563', textAlign: 'center' },
  observacoesBox: { width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', fontSize: '12px', minHeight: '60px', background: '#f8fafc', boxSizing: 'border-box' },
  assinaturasFlex: { display: 'flex', justifyContent: 'space-between', marginTop: '60px', gap: '40px' },
  blocoAssinatura: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', color: '#374151' },
  linhaAssinatura: { width: '100%', borderTop: '1px solid #000', marginBottom: '6px' }
};