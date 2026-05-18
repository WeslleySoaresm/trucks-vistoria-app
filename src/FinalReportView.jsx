import React from 'react';
import { Car, User, CalendarDays, Gauge, MapPin, CheckSquare, Layers3, Zap, FileText, Printer } from 'lucide-react';

const legendaAvarias = { 'A': 'Amassado', 'R': 'Riscado', 'X': 'Quebrado', 'F': 'Faltante', 'T': 'Trincado', 'M': 'Manchado' };
const legendaStatus = { 'S': 'Sim/OK', 'N': 'Não', 'I': 'Incompleto', 'A': 'Avariado', 'M': 'Manchado' };

// Mapeamento para renderizar os pontos de avarias visuais no relatório final
const pecasMapeadas = {
  'frente': { nome: 'Para-choque Dianteiro / Grade', top: '50%', left: '12%' },
  'capo': { nome: 'Capô Dianteiro', top: '50%', left: '30%' },
  'para_brisa': { nome: 'Para-brisa', top: '50%', left: '41%' },
  'teto': { nome: 'Teto / Capota', top: '50%', left: '51%' },
  'vidro_traseiro': { nome: 'Vidro Traseiro', top: '50%', left: '61%' },
  'traseira': { nome: 'Tampa do Porta-Malas', top: '50%', left: '69%' },
  'traseira_bumper': { nome: 'Para-choque Traseiro', top: '50%', left: '79%' },
  'lateral_esquerda_cima': { nome: 'Lateral Esquerda (Cima)', top: '16%', left: '49%' },
  'lateral_direita_baixo': { nome: 'Lateral Direita (Baixo)', top: '84%', left: '49%' },
};

function getNomePeca(id) {
  return pecasMapeadas[id]?.nome || id;
}

function getNomePneu(id) {
  const nomesPneus = { 'dianteiroDireito': 'Dianteiro Direito', 'dianteiroEsquerdo': 'Dianteiro Esquerdo', 'traseiroDireito': 'Traseiro Direito', 'traseiroEsquerdo': 'Traseiro Esquerdo', 'estepe': 'Estepe' };
  return nomesPneus[id] || id;
}

export default function FinalReportView({ report, onClose }) {
  if (!report) return null;

  // Realiza o PARSE seguro dos campos JSON do banco de dados
  let avarias = {};
  let checklistItens = {};
  let pneus = {};

  try {
    avarias = typeof report.AvariasCarroJson === 'string' ? JSON.parse(report.AvariasCarroJson) : (report.AvariasCarroJson || {});
  } catch(e) { console.error(e); }

  try {
    checklistItens = typeof report.ChecklistItensJson === 'string' ? JSON.parse(report.ChecklistItensJson) : (report.ChecklistItensJson || {});
  } catch(e) { console.error(e); }

  try {
    pneus = typeof report.PneusJson === 'string' ? JSON.parse(report.PneusJson) : (report.PneusJson || {});
  } catch(e) { console.error(e); }

  // Filtra as avarias registradas
  const pecasComAvaria = Object.entries(avarias)
    .filter(([key, value]) => value && value !== 'OK')
    .map(([id, codigo]) => ({ id, nome: getNomePeca(id), avaria: legendaAvarias[codigo] || codigo }));

  const formatarData = (dataStr) => {
    if (!dataStr) return 'N/D';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-print-container" style={styles.container}>
      
      {/* CABEÇALHO DO RELATÓRIO */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>RELATÓRIO DE VISTORIA PERICIAL DE ENTRADA</h1>
          <div style={styles.metaInfo}>
            <span><FileText size={12} /> ID: <strong>{report.Id || report.id || 'N/D'}</strong></span> | 
            <span><CalendarDays size={12} /> Gerado em: <strong>{formatarData(report.DataCadastro || report.dataCriacao)}</strong></span> | 
            <span><Zap size={12} /> Por: <strong>{report.CriadoPor || 'Vistoriador'}</strong></span>
          </div>
        </div>
        <div style={styles.actionButtons} className="no-print">
          <button onClick={handlePrint} style={styles.btnPrint}><Printer size={18} /> IMPRIMIR</button>
          <button onClick={onClose} style={styles.btnCloseOverlay}><X size={18} /> FECHAR</button>
        </div>
      </div>

      <div style={styles.divider}></div>

      {/* SEÇÃO 1: IDENTIFICAÇÃO GERAL */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}><Car size={18} /> <User size={18} /> Identificação Geral</div>
        <div style={styles.grid2Col}>
          <div style={styles.infoGroup}>
            <label style={styles.label}>Placa</label>
            <span style={styles.placaBadge}>{report.Placa || 'N/D'}</span>
          </div>
          <div style={styles.infoGroup}>
            <label style={styles.label}>Cliente</label>
            <span style={styles.valueLarge}>{report.Cliente || 'N/D'}</span>
          </div>
          <div style={styles.infoGroup}>
            <label style={styles.label}>Veículo</label>
            <span style={styles.value}>{report.Modelo || 'N/D'} | {report.Cor || 'N/D'} | {report.Ano || 'N/D'} | {report.Combustivel || 'N/D'}</span>
          </div>
          <div style={styles.infoGroup}>
            <label style={styles.label}>Telefone</label>
            <span style={styles.value}>{report.Telefone || 'N/D'}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: ESTADO NA ENTRADA */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}><Gauge size={18} /> Estado na Entrada</div>
        <div style={styles.flexRow}>
          <div style={styles.infoGroup}>
            <label style={styles.label}>Quilometragem Atual (KM)</label>
            <span style={styles.valueLarge}>{report.Km || '0'} KM</span>
          </div>
          <div style={styles.infoGroup}>
            <label style={styles.label}>Nível de Combustível</label>
            <div style={styles.combustivelVisual}>
              {['R', '1/4', '1/2', '3/4', '1/1'].map(nivel => (
                <span key={nivel} style={report.NivelCombustivel === nivel ? styles.nivelAtivo : styles.nivelInativo}>
                  {nivel === 'R' ? 'R' : nivel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: MAPEAMENTO DE AVARIAS VISUAIS */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}><Layers3 size={18} /> Mapeamento de Avarias Externas</div>
        <div style={styles.splitLayout}>
          <div style={styles.carWrapper}>
            <img src="/contorno-carro.png" alt="Mapeamento Veicular" style={styles.carImg} />
            {Object.keys(pecasMapeadas).map(pecaId => {
              const codigoAvaria = avarias[pecaId];
              if (!codigoAvaria || codigoAvaria === 'OK') return null;
              const peca = pecasMapeadas[pecaId];
              return (
                <div key={pecaId} style={{ ...styles.avariaPonto, top: peca.top, left: peca.left }}>
                  {codigoAvaria}
                </div>
              );
            })}
          </div>
          <div style={styles.avariasListaBox}>
            <label style={styles.label}>Detalhamento das Avarias:</label>
            {pecasComAvaria.length > 0 ? (
              <ul style={styles.ulAvarias}>
                {pecasComAvaria.map(av => (
                  <li key={av.id} style={styles.liAvaria}>
                    <strong>[{avarias[av.id]}] {av.nome}:</strong> <span style={styles.textWarning}>{av.avaria}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.textSuccess}>Nenhuma avaria externa registrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: VERIFICAÇÃO DE PNEUS E CHECKLIST */}
      <div style={styles.splitLayoutEven}>
        <div style={styles.card}>
          <div style={styles.sectionTitle}><MapPin size={18} /> Verificação de Pneus</div>
          <table style={styles.tableReport}>
            <thead>
              <tr>
                <th style={{textAlign: 'left', paddingBottom: '5px'}}>Pneu</th>
                <th style={{textAlign: 'left', paddingBottom: '5px'}}>Marca</th>
                <th style={{textAlign: 'left', paddingBottom: '5px'}}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pneus).map(([id, dados]) => (
                <tr key={id}>
                  <td style={{padding: '5px 0', borderBottom: '1px solid #f1f5f9'}}><strong>{getNomePneu(id)}</strong></td>
                  <td style={{padding: '5px 0', borderBottom: '1px solid #f1f5f9'}}>{dados.marca || 'N/D'}</td>
                  <td style={{padding: '5px 0', borderBottom: '1px solid #f1f5f9'}}>{dados.estado || 'N/D'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={styles.card}>
          <div style={styles.sectionTitle}><CheckSquare size={18} /> Itens de Vistoria e Verificação</div>
          <div style={{maxHeight: '260px', overflowY: 'auto'}}>
            <table style={styles.tableReport}>
              <thead>
                <tr>
                  <th style={{textAlign: 'left', paddingBottom: '5px'}}>Item</th>
                  <th style={{textAlign: 'left', paddingBottom: '5px'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(checklistItens).map(([item, st]) => (
                  <tr key={item}>
                    <td style={{padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px'}}>{item}</td>
                    <td style={{padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px'}}>
                      <strong>{legendaStatus[st] || st}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: OBSERVAÇÕES DO PERITO */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}><Zap size={18} /> Observações do Perito</div>
        <p style={styles.textareaValue}>
          {report.Observacoes ? report.Observacoes : "Nenhuma observação adicional registrada."}
        </p>
      </div>

      {/* RODAPÉ DO RELATÓRIO (Assinatura) */}
      <div style={styles.footer}>
        <div style={styles.assinaturaBox}>
          <div style={styles.linhaAssinatura}></div>
          <p style={styles.labelAssinatura}>Assinatura do Vistoriador / Perito (GMC)</p>
          <p style={styles.valueSmall}>{report.CriadoPor || 'Vistoriador'}</p>
        </div>
        <div style={styles.assinaturaBox}>
          <div style={styles.linhaAssinatura}></div>
          <p style={styles.labelAssinatura}>Assinatura do Cliente (Recebimento)</p>
          <p style={styles.valueSmall}>{report.Cliente || 'Cliente'}</p>
        </div>
      </div>

    </div>
  );
}

const styles = {
  container: { width: '100%', padding: '0', background: '#fff', color: '#0f172a', fontFamily: "Arial, sans-serif", boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  title: { fontSize: '18px', fontWeight: '800', margin: '0 0 5px 0', color: '#0f172a' },
  metaInfo: { fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' },
  actionButtons: { display: 'flex', gap: '10px' },
  btnPrint: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnCloseOverlay: { background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  divider: { height: '2px', background: '#0f172a', marginBottom: '15px' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', marginBottom: '15px', boxSizing: 'border-box' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' },
  grid2Col: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  flexRow: { display: 'flex', gap: '20px', alignItems: 'center' },
  infoGroup: { display: 'flex', flexDirection: 'column', gap: '3px' },
  label: { fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' },
  value: { fontSize: '13px', color: '#0f172a', fontWeight: '500' },
  valueLarge: { fontSize: '15px', color: '#0f172a', fontWeight: '700' },
  placaBadge: { background: '#0f172a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '15px', letterSpacing: '1px', display: 'inline-block', textAlign: 'center', width: 'fit-content' },
  combustivelVisual: { display: 'flex', gap: '3px' },
  nivelAtivo: { background: '#0f172a', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' },
  nivelInativo: { background: '#f1f5f9', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', border: '1px solid #e2e8f0' },
  splitLayout: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' },
  splitLayoutEven: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' },
  carWrapper: { position: 'relative', width: '100%', background: '#f8fafc', borderRadius: '10px', padding: '15px', border: '1px solid #e2e8f0', textAlign: 'center' },
  carImg: { width: '100%', maxWidth: '320px', height: 'auto', opacity: 0.8 },
  avariaPonto: { position: 'absolute', transform: 'translate(-50%, -50%)', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '900', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 0 5px rgba(239,68,68,0.5)', zIndex: 5 },
  avariasListaBox: { flex: 1 },
  ulAvarias: { listStyleType: 'none', padding: 0, margin: '8px 0 0 0', fontSize: '12px' },
  liAvaria: { padding: '5px 0', borderBottom: '1px solid #f1f5f9' },
  textWarning: { color: '#ef4444', fontWeight: '600' },
  textSuccess: { color: '#10b981', fontWeight: '600', fontSize: '12px', margin: '8px 0 0 0' },
  tableReport: { width: '100%', borderCollapse: 'collapse', marginTop: '5px', fontSize: '12px' },
  textareaValue: { fontSize: '12px', color: '#334155', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.5' },
  footer: { marginTop: '30px', display: 'flex', justifyContent: 'space-between', gap: '30px' },
  assinaturaBox: { flex: 1, textAlign: 'center' },
  linhaAssinatura: { height: '1px', background: '#0f172a', width: '100%', marginBottom: '6px' },
  labelAssinatura: { fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', margin: 0 },
  valueSmall: { fontSize: '12px', color: '#0f172a', fontWeight: '500', margin: '3px 0 0 0' }
};