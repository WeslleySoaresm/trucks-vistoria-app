import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { otimizarImagem } from './utils/compressor';
import { Camera, Search, Plus, CheckCircle2, XCircle, WifiOff, Car, User, Settings, ClipboardList } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function FormVistoria({ user }) {
  const [loading, setLoading] = useState(false);
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState(''); 
  const [equipe, setEquipe] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [status, setStatus] = useState('inicial'); 
  const [fotosOtimizadas, setFotosOtimizadas] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  const fileInputRef = useRef(null);
  const [notificacao, setNotificacao] = useState({ exibir: false, tipo: '', mensagem: '' });
  const [clientesLista, setClientesLista] = useState([]); 
  const [termoBusca, setTermoBusca] = useState(''); 
  const [mostrarDropdown, setMostrarDropdown] = useState(false); 
  const [modoNovoCliente, setModoNovoCliente] = useState(false); 
  const [inputNovoCliente, setInputNovoCliente] = useState(''); 
  const dropdownRef = useRef(null);

  const tiposServicoDisponiveis = ["Bate Chapa", "Pintura", "mecanica"];
  const equipesDisponiveis = ["teste01", "teste02", "teste03", "teste04", "teste05"];
  const statusDisponiveis = [
    { label: "Inicial", value: "inicial" },
    { label: "Em processo", value: "em_processo" },
    { label: "Concluído", value: "concluida" }
  ];

  const dispararNotificacao = (tipo, mensagem) => {
    setNotificacao({ exibir: true, tipo, mensagem });
    setTimeout(() => setNotificacao({ exibir: false, tipo: '', mensagem: '' }), 3500);
  };

  useEffect(() => {
    function escutarCliqueFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setMostrarDropdown(false);
    }
    document.addEventListener("mousedown", escutarCliqueFora);
    return () => document.removeEventListener("mousedown", escutarCliqueFora);
  }, []);

  useEffect(() => {
    async function carregarClientesExistentes() {
      try {
        const response = await fetch(`${API_URL}/Clientes`);
        if (!response.ok) return;
        const data = await response.json();
        const clientesFiltrados = data.map(c => (c.nome || c.Nome || "").toString().toUpperCase().trim()).filter(nome => nome !== "" && nome !== "NÃO INFORMADO");
        setClientesLista(clientesFiltrados);
      } catch (err) { console.error(err); }
    }
    carregarClientesExistentes();
  }, []);

  const selecionarClienteExistente = (nomeCliente) => {
    const nomeMaiusculo = nomeCliente.toUpperCase();
    setCliente(nomeMaiusculo);
    setTermoBusca(nomeMaiusculo); 
    setModoNovoCliente(false);
    setMostrarDropdown(false);
  };

  const manipularFotos = async (e) => {
    const arquivos = Array.from(e.target.files);
    if (arquivos.length === 0) return;
    if (fotosOtimizadas.length + arquivos.length > 10) {
      dispararNotificacao('erro', 'Limite máximo de 10 fotos atingido.');
      return;
    }
    setLoading(true);
    try {
      for (const arquivo of arquivos) {
        const otimizada = await otimizarImagem(arquivo);
        const novoPreview = URL.createObjectURL(otimizada);
        setFotosOtimizadas(prev => [...prev, otimizada]);
        setPreviews(prev => [...prev, novoPreview]);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } catch (err) {
      dispararNotificacao('erro', 'O celular ficou sem memória. Envie uma a uma.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // FUNÇÃO DE REMOÇÃO QUE ESTAVA FALTANDO PARA EVITAR QUEBRAS
  const removerFoto = (indexAlvo) => {
    setFotosOtimizadas(prev => prev.filter((_, idx) => idx !== indexAlvo));
    setPreviews(prev => prev.filter((_, idx) => idx !== indexAlvo));
  };

  const finalizarVistoria = async () => {
    const nomeClienteFinal = cliente.trim().toUpperCase();
    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe || !tipoServico || !nomeClienteFinal) {
      dispararNotificacao('erro', 'Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    setTimeout(() => { 
        dispararNotificacao('sucesso', 'Inspeção finalizada!'); 
        setLoading(false); 
        setPlaca(''); setCliente(''); setTermoBusca(''); setFotosOtimizadas([]); setPreviews([]);
    }, 2000);
  };

  return (
    <div translate="no" className="notranslate" style={styles.container}>
      
      {/* TOAST CENTRALIZADO */}
      {notificacao.exibir && (
        <div style={styles.toastContainerCentral}>
          <div style={{...styles.toastBox, backgroundColor: notificacao.tipo === 'sucesso' ? '#10b981' : '#ef4444'}}>
            {notificacao.tipo === 'sucesso' ? <CheckCircle2 size={24} color="#fff" /> : <XCircle size={24} color="#fff" />}
            <span style={styles.toastText}>{notificacao.mensagem}</span>
          </div>
        </div>
      )}

      {/* HEADER INTEGRADO */}
      <div style={styles.header}>
        <img src="/CheckFrotas.png" alt="Logo" style={styles.logoImg} />
        <h2 style={styles.headerTitle}>Nova Inspeção</h2>
      </div>

      <div style={styles.scrollContent}>
        
        {/* SEÇÃO 1: DETALHES DO VEÍCULO */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <Car size={16} color="#63b3ed" />
            <span style={styles.sectionTitle}>Detalhes do Veículo</span>
          </div>
          <div style={styles.inputWrapper}>
            <input 
              type="text" 
              placeholder="Placa do Veículo" 
              value={placa} 
              onChange={(e) => setPlaca(e.target.value.toUpperCase())} 
              style={styles.input} 
            />
          </div>
        </section>

        {/* SEÇÃO 2: INFORMAÇÕES DO CLIENTE */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <User size={16} color="#63b3ed" />
            <span style={styles.sectionTitle}>Informações do Cliente</span>
          </div>
          
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div style={styles.inputWrapper}>
              <Search size={18} style={styles.fieldIcon} />
              <input 
                type="text" 
                placeholder={modoNovoCliente ? "CADASTRANDO NOVO..." : "Buscar ou Selecionar Cliente"} 
                value={modoNovoCliente ? "" : termoBusca} 
                disabled={modoNovoCliente}
                onFocus={() => setMostrarDropdown(true)}
                onChange={(e) => { setTermoBusca(e.target.value.toUpperCase()); setMostrarDropdown(true); }} 
                style={{ ...styles.input, paddingLeft: '45px' }} 
              />
            </div>

            {mostrarDropdown && (
              <div style={styles.dropdown}>
                <div onClick={() => {setModoNovoCliente(true); setMostrarDropdown(false);}} style={styles.dropdownNew}>
                  <Plus size={16} /> ADICIONAR NOVO CLIENTE
                </div>
                {clientesLista.filter(cli => cli.includes(termoBusca)).map((cli, idx) => (
                  <div key={idx} onClick={() => selecionarClienteExistente(cli)} style={styles.dropdownOption}>{cli}</div>
                ))}
              </div>
            )}
          </div>

          {modoNovoCliente && (
            <div style={styles.newClientBox}>
              <input 
                placeholder="NOME DO NOVO CLIENTE" 
                value={inputNovoCliente} 
                onChange={(e) => setInputNovoCliente(e.target.value.toUpperCase())} 
                style={styles.inputSmall} 
              />
              <div style={{display:'flex', gap:'10px', marginTop:'8px'}}>
                <button onClick={() => {setModoNovoCliente(false); setInputNovoCliente('');}} style={styles.btnCancel}>Cancelar</button>
                <button onClick={finalizarVistoria} style={styles.btnConfirm}>Confirmar</button>
              </div>
            </div>
          )}
        </section>

        {/* SEÇÃO 3: SERVIÇO E EQUIPE */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <Settings size={16} color="#63b3ed" />
            <span style={styles.sectionTitle}>Serviço e Equipe</span>
          </div>
          <div style={styles.inputGroupVertical}>
            <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.select}>
              <option value="" disabled>Selecione a Equipe</option>
              {equipesDisponiveis.map(eq => <option key={eq} value={eq}>Equipe {eq}</option>)}
            </select>
            <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} style={styles.select}>
              <option value="" disabled>Tipo de Serviço</option>
              {tiposServicoDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
              {statusDisponiveis.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </section>

        {/* SEÇÃO 4: OBSERVAÇÕES E FOTOS */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <ClipboardList size={16} color="#63b3ed" />
            <span style={styles.sectionTitle}>Evidências</span>
          </div>
          <textarea 
            placeholder="Observações adicionais..." 
            value={observacao} 
            onChange={(e) => setObservacao(e.target.value)} 
            style={styles.textarea} 
          />
          
          <div style={styles.photoContainer}>
            <label htmlFor="foto-input" style={styles.cameraBtn}>
              <Camera size={20} /> ABRIR CÂMERA
            </label>
            <input id="foto-input" ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={manipularFotos} style={{ display: 'none' }} />
            
            <div style={styles.photoGrid}>
              {previews.map((url, index) => (
                <div key={index} style={styles.photoThumb}>
                  <img src={url} alt="preview" style={styles.imgFull} />
                  <button onClick={() => removerFoto(index)} style={styles.btnRemovePhoto}>×</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTÃO DE AÇÃO INTEGRADO DIRETAMENTE NO FLUXO */}
        <div style={styles.footerButtonArea}>
          <button 
            onClick={finalizarVistoria} 
            disabled={loading || fotosOtimizadas.length === 0} 
            style={loading ? styles.btnFinalizeDisabled : styles.btnFinalize}
          >
            {loading ? "PROCESSANDO..." : (
              navigator.onLine ? 
              <><CheckCircle2 size={20} /> FINALIZAR INSPEÇÃO ({fotosOtimizadas.length}/10)</> :
              <><WifiOff size={20} /> SALVAR OFFLINE ({fotosOtimizadas.length}/10)</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { 
    width: '100%', maxWidth: '480px', margin: '0 auto', 
    background: '#0f172a', display: 'flex', flexDirection: 'column', 
    color: '#fff', fontFamily: 'sans-serif', borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden'
  },
  header: { 
    padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'linear-gradient(to bottom, #1e293b, #0f172a)'
  },
  logoImg: { width: '120px', marginBottom: '10px' },
  headerTitle: { fontSize: '18px', fontWeight: '700', margin: 0, color: '#e2e8f0' },
  
  scrollContent: { padding: '20px' },
  
  section: { 
    marginBottom: '20px', padding: '15px', borderRadius: '16px', 
    background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)' 
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  
  inputWrapper: { position: 'relative', width: '100%' },
  fieldIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 10 },
  input: { 
    width: '100%', padding: '14px', borderRadius: '12px', background: '#020617', 
    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box'
  },
  inputSmall: { 
    width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', 
    border: '1px solid #3182ce', color: '#fff', boxSizing: 'border-box' 
  },
  inputGroupVertical: { display: 'flex', flexDirection: 'column', gap: '10px' },
  select: { 
    width: '100%', padding: '14px', borderRadius: '12px', background: '#020617', 
    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none'
  },
  textarea: { 
    width: '100%', height: '80px', padding: '12px', borderRadius: '12px', background: '#020617', 
    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', resize: 'none', boxSizing: 'border-box', outline: 'none'
  },
  
  cameraBtn: { 
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
    background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '14px', 
    borderRadius: '12px', border: '1px dashed #3b82f6', fontWeight: '700', marginTop: '15px', cursor: 'pointer'
  },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '15px' },
  photoThumb: { position: 'relative', paddingTop: '100%', borderRadius: '8px', overflow: 'hidden' },
  imgFull: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
  btnRemovePhoto: { position: 'absolute', top: '2px', right: '2px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  footerButtonArea: { marginTop: '25px', marginBottom: '10px' },
  btnFinalize: { 
    width: '100%', padding: '16px', background: '#10b981', color: '#fff', 
    border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '16px', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)'
  },
  btnFinalizeDisabled: { 
    width: '100%', padding: '16px', background: '#334155', color: '#64748b', 
    border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },

  dropdown: { 
    position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', 
    borderRadius: '12px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', border: '1px solid #334155', marginTop: '5px' 
  },
  dropdownOption: { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' },
  dropdownNew: { padding: '12px', color: '#60a5fa', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  newClientBox: { marginTop: '10px', padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' },
  btnConfirm: { background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' },
  btnCancel: { background: 'transparent', color: '#94a3b8', border: 'none', padding: '8px 15px', fontWeight: '600', cursor: 'pointer' },
  
  toastContainerCentral: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 },
  toastBox: { padding: '15px 25px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  toastText: { color: '#fff', fontWeight: '700', fontSize: '14px' }
};