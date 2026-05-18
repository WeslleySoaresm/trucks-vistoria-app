import React from 'react';
import { Printer, X } from 'lucide-react';

export default function FinalReportView({ report, onClose }) {
  if (!report) return null;

  // 1. Normalização dos dados gerais do veículo
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

  // 2. Parse seguro das strings JSON vindo do Banco de Dados
  const parseJsonSeguro = (dados) => {
    if (!dados) return {};
    if (typeof dados === 'object') return dados;
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

  // FILTRO ATUALIZADO: Remove os que estão com "S", vazios ou nulos. Mantém apenas N, I, A, M.
  const itensModificados = Object.entries(checklistItens).filter(([_, status]) => {
    if (!status) return false;
    const statusClean = status.trim().toUpperCase();
    return statusClean !== "S" && statusClean !== "";
  });

  const pecasMapeadas = [
    { id: 'frente', top: '50%', left: '12%' },
    { id: 'capo', top: '50%', left: '30%' },
    { id: 'para_brisa', top: '50%', left: '41%' },
    { id: 'teto', top: '50%', left: '51%' },
    { id: 'vidro_traseiro', top: '50%', left: '61%' },
    { id: 'traseira', top: '50%', left: '69%' },
    { id: 'traseira_bumper', top: '50%', left: '79%' },
    { id: 'lateral_esquerda_cima', top: '16%', left: '49%' },
    { id: 'lateral_direita_baixo', top: '84%', left: '49%' },
  ];

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
      {/* Botões de Ação (Ocultados no papel) */}
      <div className="no-print-header" style={styles.noPrintHeader}>
        <button onClick={handlePrint} style={styles.btnPrint}><Printer size={16} /> IMPRIMIR</button>
        <button onClick={onClose} style={styles.btnClose}><X size={16} /> FECHAR</button>
      </div>

      {/* ÁREA DA FOLHA BRANCA */}
      <div className="print-area" style={styles.printArea}>
        
        {/* CABEÇALHO */}
        <div style={styles.headerFlex}>
          <div>
            <h1 style={styles.mainTitle}>CHECKLIST DE ENTRADA</h1>
            <p style={styles.subTitle}>G.M.C CENTRO DE REPARAÇÃO AUTOMOTIVA</p>
          </div>
          <div style={styles.boxDataHora}>
            <div><strong>Data:</strong> {dataCriacao.split('T')[0]}</div>
            <div><strong>Hora:</strong> {dataCriacao.includes('T') ? dataCriacao.split('T')[1].substring(0, 5) : '--:--'}</div>
          </div>
        </div>

        {/* DADOS DO VEÍCULO */}
        <div style={styles.secaoTitulo}>DADOS DO VEÍCULO</div>
        <table style={styles.tabelaDados}>
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
              <td style={styles.tdDado}><strong>KM:</strong> {km} KM</td>
            </tr>
          </tbody>
        </table>

        {/* ESTADO DE COMBUSTÍVEL */}
        <div style={styles.secaoTitulo}>ESTADO NA ENTRADA</div>
        <div style={styles.combustivelContainer}>
          <strong>NÍVEL DE COMBUSTÍVEL:</strong>
          <div style={styles.combustivelBarra}>
            {['R', '1/4', '1/2', '3/4', '1/1'].map(nivel => (
              <span key={nivel} style={nivelCombustivel === nivel ? styles.nivelAtivo : styles.nivelInativo}>
                {nivel === 'R' ? 'Reserva (R)' : nivel}
              </span>
            ))}
          </div>
        </div>

        {/* DIVISÃO DAS DUAS COLUNAS LADO A LADO */}
        <div className="print-colunas-wrapper" style={styles.colunasFlex}>
          
          {/* COLUNA ESQUERDA: AVARIAS DO MAPA + PNEUS */}
          <div className="print-coluna-item" style={styles.colunaEsquerda}>
            <div style={styles.subSecaoTitulo}>MAPEAMENTO DE AVARIAS EXTERNAS</div>
            <div style={styles.carWrapper}>
              <img src="/contorno-carro.png" alt="Carro" style={styles.carImg} />
              {pecasMapeadas.map(peca => {
                const avariaDaPeca = avarias[peca.id];
                if (!avariaDaPeca) return null;
                return (
                  <div key={peca.id} style={{ ...styles.pecaAvariaBadge, top: peca.top, left: peca.left }}>
                    {avariaDaPeca}
                  </div>
                );
              })}
            </div>

            <div style={styles.detalheAvariasBox}>
              <strong>Detalhamento das Avarias:</strong>
              {listaAvariasRegistradas.length === 0 ? (
                <p style={{ color: '#10b981', margin: '3px 0 0 0', fontSize: '11px' }}>Nenhuma avaria externa registrada.</p>
              ) : (
                <ul style={{ margin: '3px 0 0 0', paddingLeft: '15px', fontSize: '11px' }}>
                  {listaAvariasRegistradas.map(([pecaId, sigla]) => (
                    <li key={pecaId}>
                      <span style={{ textTransform: 'uppercase' }}>{pecaId.replace(/_/g, ' ')}</span>: <strong style={{ color: '#ef4444' }}>{obterNomeAvaria(sigla)} ({sigla})</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: '10px' }}>
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

          {/* COLUNA DIREITA: APENAS ADVERSIDADES (N, I, A, M) */}
          <div className="print-coluna-item" style={styles.colunaDireita}>
            <div style={styles.subSecaoTitulo}>ITENS DE VISTORIA COM ANOMALIA</div>
            <div className="print-checklist-container" style={styles.checklistGridContainer}>
              <table style={styles.tabelaItens}>
                <thead>
                  <tr>
                    <th style={styles.thItem}>Item de Inspeção</th>
                    <th style={styles.thItemCentrado}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {itensModificados.length > 0 ? (
                    itensModificados.map(([item, status]) => (
                      <tr key={item} style={styles.linhaItem}>
                        <td style={styles.tdItemName}>{item}</td>
                        <td style={styles.tdItemStatus}>
                          <span style={styles.badgeStatus(status)}>{status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ ...styles.tdItemName, textAlign: 'center', padding: '20px', color: '#10b981' }}>
                        Todos os itens de vistoria encontram-se em conformidade (OK).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={styles.legendaItensPrint}>
              <strong>Legenda do Erro:</strong> N: Não | I: Incompleto | A: Avariado | M: Manchado
            </div>
          </div>

        </div>

        {/* OBSERVAÇÕES DO PERITO */}
        <div style={styles.secaoTitulo}>OBSERVAÇÕES DO PERITO / DEMAIS OBSERVAÇÕES</div>
        <div style={styles.observacoesBox}>{observacoes}</div>

        {/* ASSINATURAS CORRIGIDAS SEM VAZAMENTO */}
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

      {/* ESTILOS REFORÇADOS PARA COMBATER CORTES FÍSICOS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print-header { display: none !important; }
          
          /* Garante que o corpo do documento se comporte como bloco único contido */
          .print-area { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 10px !important; box-shadow: none !important; border: none !important; display: block !important; }
          
          .print-colunas-wrapper { display: table !important; width: 100% !important; table-layout: fixed !important; }
          .print-coluna-item { display: table-cell !important; vertical-align: top !important; }
          .print-coluna-item:first-child { width: 50% !important; padding-right: 15px !important; }
          .print-coluna-item:last-child { width: 50% !important; }

          .print-checklist-container { 
            max-height: none !important; 
            overflow: visible !important; 
            overflow-y: visible !important;
            height: auto !important;
          }
          
          /* Proteção absoluta contra geração de múltiplas páginas vazias */
          .print-area { page-break-inside: avoid !important; }
        }
      `}} />
    </div>
  );
}

// FOLHA DE ESTILOS LIMPA E INTEGRADA
const styles = {
  pageContainer: { width: '100%', background: '#111827', minHeight: '100vh', padding: '20px 0', boxSizing: 'border-box' },
  noPrintHeader: { display: 'flex', justifyContent: 'flex-end', gap: '10px', maxWidth: '940px', margin: '0 auto 15px auto', padding: '0 10px' },
  btnPrint: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnClose: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  
  // AREA DA FOLHA BRANCA MODIFICADA (SEM POSIÇÃO FIXA/ABSOLUTA PARA NÃO QUEBRAR ASSINATURA)
  printArea: { background: '#fff', color: '#000', maxWidth: '940px', margin: '0 auto', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', boxSizing: 'border-box', display: 'block' },
  
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '10px' },
  mainTitle: { fontSize: '20px', fontWeight: '900', margin: 0, color: '#000' },
  subTitle: { fontSize: '11px', margin: '2px 0 0 0', color: '#4b5563', fontWeight: 'bold' },
  boxDataHora: { background: '#f3f4f6', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', textAlign: 'right' },
  secaoTitulo: { background: '#334155', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '5px 8px', borderRadius: '4px', marginTop: '12px', marginBottom: '8px', textTransform: 'uppercase' },
  subSecaoTitulo: { background: '#f1f5f9', borderLeft: '3px solid #334155', color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '5px 6px', marginBottom: '8px' },
  tabelaDados: { width: '100%', borderCollapse: 'collapse', marginBottom: '5px' },
  tdDado: { border: '1px solid #cbd5e1', padding: '5px', fontSize: '11px', color: '#000' },
  valorPlaca: { background: '#000', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' },
  combustivelContainer: { display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #cbd5e1', padding: '5px', borderRadius: '6px', fontSize: '11px' },
  combustivelBarra: { display: 'flex', gap: '4px' },
  nivelInativo: { padding: '2px 5px', background: '#f3f4f6', color: '#9ca3af', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '10px' },
  nivelAtivo: { padding: '2px 5px', background: '#000', color: '#fff', fontWeight: 'bold', borderRadius: '4px', fontSize: '10px' },
  
  colunasFlex: { display: 'flex', gap: '20px', marginTop: '10px', alignItems: 'flex-start' },
  colunaEsquerda: { flex: '1', width: '50%', display: 'flex', flexDirection: 'column' },
  colunaDireita: { flex: '1', width: '50%', display: 'flex', flexDirection: 'column' },
  
  carWrapper: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 0' },
  carImg: { width: '85%', maxWidth: '280px', height: 'auto', opacity: 0.85 },
  pecaAvariaBadge: { position: 'absolute', transform: 'translate(-50%, -50%)', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: '900', width: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff' },
  detalheAvariasBox: { marginTop: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px' },
  tabelaPneus: { width: '100%', borderCollapse: 'collapse' },
  thPneu: { textTransform: 'uppercase', background: '#f1f5f9', fontSize: '9px', padding: '5px', border: '1px solid #cbd5e1', textAlign: 'left' },
  tdPneu: { fontSize: '10px', padding: '5px', border: '1px solid #cbd5e1', color: '#000' },
  
  checklistGridContainer: { border: '1px solid #cbd5e1', borderRadius: '6px', overflowY: 'auto', maxHeight: '350px' },
  tabelaItens: { width: '100%', borderCollapse: 'collapse' },
  thItem: { background: '#f1f5f9', fontSize: '10px', padding: '6px', borderBottom: '1px solid #cbd5e1', textAlign: 'left' },
  thItemCentrado: { background: '#f1f5f9', fontSize: '10px', padding: '6px', borderBottom: '1px solid #cbd5e1', textAlign: 'center', width: '40px' },
  linhaItem: { borderBottom: '1px solid #e2e8f0' },
  tdItemName: { fontSize: '10px', padding: '5px 6px', color: '#000', fontWeight: '500' },
  tdItemStatus: { padding: '3px', textAlign: 'center' },
  badgeStatus: (status) => ({
    display: 'inline-block',
    width: '16px',
    height: '16px',
    lineHeight: '16px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: status === 'N' ? '#ef4444' : status === 'I' ? '#f59e0b' : '#3b82f6',
    textAlign: 'center'
  }),
  legendaItensPrint: { marginTop: '6px', fontSize: '9px', color: '#4b5563', textAlign: 'center' },
  observacoesBox: { width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px', fontSize: '11px', minHeight: '45px', background: '#f8fafc', boxSizing: 'border-box' },
  
  // BLOCO DE ASSINATURAS CORRIGIDO PARA FLUXO NATURAL DO DOCUMENTO
  assinaturasFlex: { display: 'flex', justifyContent: 'space-between', marginTop: '40px', gap: '40px', width: '100%' },
  blocoAssinatura: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#374151' },
  linhaAssinatura: { width: '100%', borderTop: '1px solid #000', marginBottom: '6px' }
};