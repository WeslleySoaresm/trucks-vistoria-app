import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Mantido apenas para o Storage das fotos
import { otimizarImagem } from './utils/compressor';
import { Camera, Trash2, Send, CheckCircle, Truck, Search, Plus } from 'lucide-react';

// Ajuste para a URL da sua API (Local ou Produção)
const API_URL = "https://trucks-vistoria-app-1.onrender.com/api"; 

export default function FormVistoria({ user }) {
  const [loading, setLoading] = useState(false);
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState(''); // Valor definitivo enviado no payload
  const [equipe, setEquipe] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [status, setStatus] = useState('inicial'); 
  const [fotosOtimizadas, setFotosOtimizadas] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  const fileInputRef = useRef(null);

  // ==========================================
  // ESTADOS DO NOVO DROPDOWN COM BUSCA
  // ==========================================
  const [clientesLista, setClientesLista] = useState([]); // Array global de clientes
  const [termoBusca, setTermoBusca] = useState(''); // O que o usuário digita na busca
  const [mostrarDropdown, setMostrarDropdown] = useState(false); // Controla visibilidade da lista
  const [modoNovoCliente, setModoNovoCliente] = useState(false); // Controla se o input de criação está ativo
  const [inputNovoCliente, setInputNovoCliente] = useState(''); // Valor do novo cliente digitado
  const dropdownRef = useRef(null);

  const tiposServicoDisponiveis = ["On Job", "Primeira Visita", "Procura Artificial", "Indicação"];
  const equipesDisponiveis = ["812", "811", "TFF", "805", "810"];
  const statusDisponiveis = [
    { label: "Inicial", value: "inicial" },
    { label: "Em processo", value: "em_processo" },
    { label: "Concluído", value: "concluida" }
  ];

  // Fecha o dropdown de busca se clicar fora dele
  useEffect(() => {
    function escutarCliqueFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false);
      }
    }
    document.addEventListener("mousedown", escutarCliqueFora);
    return () => document.removeEventListener("mousedown", escutarCliqueFora);
  }, []);

  // Carrega os clientes direto da sua API .NET ao iniciar
  useEffect(() => {
    async function carregarClientesExistentes() {
      try {
        const response = await fetch(`${API_URL}/Vistoria`);
        if (!response.ok) return;
        
        const data = await response.json();
        const clientesFiltrados = [
          ...new Set(
            data
              .map(v => v.cliente)
              .filter(nome => nome && nome.trim() !== "" && nome !== "Não Informado")
          )
        ].sort();

        setClientesLista(clientesFiltrados);
      } catch (err) {
        console.error("Erro ao carregar lista de clientes:", err);
      }
    }
    carregarClientesExistentes();
  }, []);

  // Filtra dinamicamente os clientes da array base de acordo com o termo buscado
  const clientesFiltrados = clientesLista.filter(cli =>
    cli.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const selecionarClienteExistente = (nomeCliente) => {
    setCliente(nomeCliente);
    setTermoBusca(nomeCliente); // Preenche o campo visual com o nome escolhido
    setModoNovoCliente(false);
    setMostrarDropdown(false);
  };

  const ativarModoNovoCliente = () => {
    setModoNovoCliente(true);
    setCliente('');
    setInputNovoCliente('');
    setMostrarDropdown(false);
  };

  // Esta função adiciona o cliente dinamicamente no Array local assim que o usuário digita
  const manipularInputNovoCliente = (e) => {
    const valor = e.target.value;
    setInputNovoCliente(valor);
    setCliente(valor);
  };

  // ==========================================
  // MANIPULAÇÃO DE FOTOS E GEOLOCALIZAÇÃO
  // ==========================================
  const manipularFotos = async (e) => {
    const arquivos = Array.from(e.target.files);
    if (arquivos.length === 0) return;
    if (fotosOtimizadas.length + arquivos.length > 10) {
      alert("Limite máximo de 10 fotos.");
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
      console.error("Erro ao processar imagem:", err);
      alert("O celular ficou sem memória. Tente enviar fotos uma a uma.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removerFoto = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFotosOtimizadas(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // SALVAR VISTORIA E ATUALIZAR ARRAYS
  // ==========================================
  const finalizarVistoria = async () => {
    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe || !tipoServico || !cliente.trim()) {
      alert("Preencha todos os campos (incluindo o cliente) e tire pelo menos 1 foto.");
      return;
    }

    setLoading(true);

    try {
      let localizacao = "Não autorizada";
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: false });
        });
        localizacao = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("GPS falhou."); }

      const placaFormatada = placa.trim().toUpperCase();
      const nomeClienteFinal = cliente.trim();
      const urlsFotosParaBanco = [];

      for (let i = 0; i < fotosOtimizadas.length; i++) {
        const foto = fotosOtimizadas[i];
        const fileName = `${placaFormatada}_${Date.now()}_${i}.jpg`;
        
        const { data: upData, error: upError } = await supabase.storage
          .from('vistorias')
          .upload(fileName, foto);

        if (upError) throw upError;
        urlsFotosParaBanco.push(upData.path); 
      }

      const payload = {
        Placa: String(placaFormatada).trim(),
        Cliente: nomeClienteFinal,
        UsuarioId: user?.id, 
        Equipe: String(equipe || 'Geral').trim(),
        TipoServico: String(tipoServico || 'On Job').trim(),
        Observacao: String(observacao || '').trim(),
        Localizacao: String(localizacao || 'Não autorizada').trim(),
        Status: String(status || 'inicial').trim(),
        Evidencias: urlsFotosParaBanco || []
      };

      const response = await fetch(`${API_URL}/Vistoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const erroMsg = await response.text();
        throw new Error(erroMsg || "Erro ao salvar na API .NET");
      }

      alert("Vistoria enviada com sucesso!");

      // REGRA PEDIDA: Se era um cliente novo, insere dinamicamente na lista sem precisar recarregar
      if (modoNovoCliente && !clientesLista.includes(nomeClienteFinal)) {
        setClientesLista(prev => [...prev, nomeClienteFinal].sort());
      }
      
      // Limpeza mantendo o estado pronto para a próxima entrada
      previews.forEach(url => URL.revokeObjectURL(url));
      setPlaca(''); setCliente(''); setObservacao(''); setEquipe(''); setTipoServico(''); setStatus('inicial');
      setFotosOtimizadas([]); setPreviews([]);
      setTermoBusca(''); setInputNovoCliente(''); setModoNovoCliente(false);

    } catch (err) {
      console.error("Erro fatal:", err);
      alert("Erro ao enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div translate="no" className="notranslate" style={styles.container}>
      <div style={styles.formHeader}>
        <div style={styles.iconCircle}>
          <img src="/NovaVistoriaLogo.png" alt="Logo" style={styles.logoImg} />
        </div>
        <h2 style={styles.title}>Nova Inspeção</h2>
      </div>
      
      <div style={styles.inputGroup}>
        <input 
          type="text" 
          placeholder="Placa do Veículo" 
          value={placa} 
          onChange={(e) => setPlaca(e.target.value.toUpperCase())} 
          style={styles.input} 
        />

        {/* COMPONENTE DE AUTOCOMPLETE CUSTOMIZADO COM BUSCA */}
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder={modoNovoCliente ? "Modo: Criando Novo Cliente..." : "🔍 Buscar ou Selecionar Cliente"} 
              value={modoNovoCliente ? "" : termoBusca} 
              disabled={modoNovoCliente}
              onFocus={() => setMostrarDropdown(true)}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                setMostrarDropdown(true);
              }} 
              style={{ 
                ...styles.input, 
                paddingLeft: '40px',
                backgroundColor: modoNovoCliente ? 'rgba(255,255,255,0.03)' : '#0f172a',
                color: modoNovoCliente ? '#4a5568' : '#fff'
              }} 
            />
            <Search size={18} style={{ position: 'absolute', left: '14px', color: '#4a5568' }} />
          </div>

          {/* LISTA SUSPENSA CONTAINER */}
          {mostrarDropdown && (
            <div style={styles.dropdownContainer}>
              {/* Opção Fixa no Topo para Adicionar Novo */}
              <div onClick={ativarModoNovoCliente} style={styles.dropdownOptionNew}>
                <Plus size={16} /> Adicionar Novo Cliente...
              </div>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

              {/* Lista filtrada de clientes existentes */}
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cli, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => selecionarClienteExistente(cli)} 
                    style={styles.dropdownOption}
                  >
                    {cli}
                  </div>
                ))
              ) : (
                <div style={styles.dropdownNoResults}>Nenhum cliente encontrado</div>
              )}
            </div>
          )}
        </div>

        {/* CAMPO CONDICIONAL ATIVADO QUANDO CLICA EM "ADICIONAR NOVO CLIENTE..." */}
        {modoNovoCliente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input 
              type="text" 
              placeholder="Escreva o nome do novo cliente" 
              value={inputNovoCliente} 
              onChange={manipularInputNovoCliente} 
              style={{ ...styles.input, border: '1px solid #63b3ed', boxShadow: '0 0 10px rgba(99,179,237,0.2)' }} 
            />
            <span 
              onClick={() => { setModoNovoCliente(false); setTermoBusca(''); setCliente(''); }} 
              style={styles.cancelarNovoBtn}
            >
              Cancelar e voltar para a busca
            </span>
          </div>
        )}
        
        <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.select}>
          <option value="" disabled>Selecione a Equipe</option>
          {equipesDisponiveis.map(eq => <option key={eq} value={eq}>Equipe {eq}</option>)}
        </select>
      
        <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} style={styles.select}>
          <option value="" disabled>Tipo de Serviço</option>
          {tiposServicoDisponiveis.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
          {statusDisponiveis.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <textarea 
          placeholder="Observações adicionais..." 
          value={observacao} 
          onChange={(e) => setObservacao(e.target.value)} 
          style={styles.textarea} 
        />
      </div>

      <div style={styles.uploadArea}>
        <label htmlFor="foto-input" style={styles.buttonAdd}>
          <Camera size={20} />
          ABRIR CÂMERA
        </label>
        <input 
          id="foto-input" 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={manipularFotos} 
          style={{ display: 'none' }} 
        />

        <div style={styles.grid}>
          {previews.map((url, index) => (
            <div key={index} style={styles.thumbWrap}>
              <img src={url} alt="preview" style={styles.img} />
              <button onClick={() => removerFoto(index)} style={styles.btnDel}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={finalizarVistoria} 
        disabled={loading || fotosOtimizadas.length === 0}
        style={loading ? styles.btnDisabled : styles.btnSend}
      >
        {loading ? "ENVIANDO DADOS..." : (
          <>
            <CheckCircle size={20} />
            FINALIZAR ({fotosOtimizadas.length}/10)
          </>
        )}
      </button>
    </div>
  );
}

const styles = {
  container: { width: '100%', maxWidth: '450px', minHeight: '100vh', margin: '0 auto', background: '#1a202c', padding: '20px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' },
  logoImg: { width: '110px', height: 'auto', objectFit: 'contain' },
  formHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '5px' },
  iconCircle: { width: '140px', height: '140px', background: 'rgba(99, 179, 237, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', border: '2px solid rgba(99, 179, 237, 0.2)' },
  title: { textAlign: 'center', margin: 0, color: '#fff', fontWeight: '800', fontSize: '22px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { width: '100%', height: '80px', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' },
  uploadArea: { marginTop: '20px', marginBottom: '25px' },
  buttonAdd: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(66, 153, 225, 0.15)', color: '#63b3ed', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', border: '1px dashed #63b3ed' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '15px' },
  thumbWrap: { position: 'relative', paddingTop: '100%' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' },
  btnDel: { position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnSend: { width: '100%', padding: '18px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  btnDisabled: { width: '100%', padding: '18px', background: 'rgba(255,255,255,0.05)', color: '#4a5568', border: 'none', borderRadius: '16px', cursor: 'not-allowed', fontWeight: '900' },
  
  // ESTILOS EXTRAS DO AUTOCOMPLETE CUSTOMIZADO
  dropdownContainer: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto', zIndex: 999, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', padding: '5px' },
  dropdownOption: { padding: '12px', color: '#e2e8f0', cursor: 'pointer', borderRadius: '8px', fontSize: '15px', transition: 'background 0.2s' },
  dropdownOptionNew: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: '#63b3ed', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', fontSize: '15px' },
  dropdownNoResults: { padding: '12px', color: '#4a5568', fontSize: '14px', textAlign: 'center' },
  cancelarNovoBtn: { fontSize: '12px', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-end', marginTop: '2px' }
};