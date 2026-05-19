import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { otimizarImagem } from './utils/compressor';
import { Camera, Search, Plus, CheckCircle2, XCircle, ArrowRight, WifiOff, Car, User, Settings, ClipboardList } from 'lucide-react';

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

  // NOTIFICAÇÃO CENTRALIZADA
  const [notificacao, setNotificacao] = useState({ exibir: false, tipo: '', mensagem: '' });

  // ESTADOS DO DROPDOWN DINÂMICO
  const [clientesLista, setClientesLista] = useState([]); 
  const [termoBusca, setTermoBusca] = useState(''); 
  const [mostrarDropdown, setMostrarDropdown] = useState(false); 
  const [modoNovoCliente, setModoNovoCliente] = useState(false); 
  const [inputNovoCliente, setInputNovoCliente] = useState(''); 
  const dropdownRef = useRef(null);

  const tiposServicoDisponiveis = ["No Local", "Novo Lead", "Indicação"];
  const equipesDisponiveis = [" Equipe 01", " Equipe 02", "Equipe 03", "Equipe 04", "Equipe 05"];
  const statusDisponiveis = [
    { label: "Inicial", value: "inicial" },
    { label: "Em processo", value: "em_processo" },
    { label: "Concluído", value: "concluida" }
  ];
  
  const dispararNotificacao = (tipo, mensagem) => {
    setNotificacao({ exibir: true, tipo, mensagem });
    setTimeout(() => {
      setNotificacao({ exibir: false, tipo: '', mensagem: '' });
    }, 3500);
  };

  useEffect(() => {
    function escutarCliqueFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false);
      }
    }
    document.addEventListener("mousedown", escutarCliqueFora);
    return () => document.removeEventListener("mousedown", escutarCliqueFora);
  }, []);

  // CARREGAR CLIENTES DA NOVA TABELA FIXA
  useEffect(() => {
    async function carregarClientesExistentes() {
      try {
        const response = await fetch(`${API_URL}/Clientes`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        const clientesFiltrados = data
          .map(c => (c.nome || c.Nome || "").toString().toUpperCase().trim())
          .filter(nome => nome !== "" && nome !== "NÃO INFORMADO");

        setClientesLista(clientesFiltrados);
      } catch (err) {
        console.error("Erro ao carregar lista de clientes fixos:", err);
      }
    }
    carregarClientesExistentes();
  }, []);

  // LÓGICA DE ENGENHARIA DE DADOS: AGENTE DE SINCRONIZAÇÃO AUTOMÁTICA (OFFLINE -> ONLINE)
  useEffect(() => {
    const processarFilaOffline = async () => {
      if (!navigator.onLine) return;
      
      const fila = JSON.parse(localStorage.getItem('fila_vistorias_offline') || '[]');
      if (fila.length === 0) return;

      console.log(`[Sync] Conexão restaurada. Sincronizando ${fila.length} vistorias travadas...`);
      dispararNotificacao('sucesso', `Sinal recuperado! Sincronizando ${fila.length} vistorias pendentes...`);

      const filaRestante = [];

      for (const vistoria of fila) {
        try {
          const urlsFotosParaBanco = [];

          // 1. Faz o upload das fotos convertidas em Base64 para o Supabase
          for (let i = 0; i < vistoria.fotosBase64.length; i++) {
            const base64Data = vistoria.fotosBase64[i];
            
            // Decodifica a string Base64 de volta para Blob/File para o Supabase Storage
            const res = await fetch(base64Data);
            const blob = await res.blob();
            
            const fileName = `${vistoria.payload.Placa}_${Date.now()}_sync_${i}.jpg`;
            const { data: upData, error: upError } = await supabase.storage
              .from('vistorias')
              .upload(fileName, blob);

            if (upError) throw upError;
            urlsFotosParaBanco.push(upData.path);
          }

          // 2. Vincula os caminhos oficiais de storage gerados no payload final
          const payloadPronto = {
            ...vistoria.payload,
            Evidencias: urlsFotosParaBanco
          };

          // 3. Envia para a API principal do sistema (.NET)
          const response = await fetch(`${API_URL}/Vistoria`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPronto)
          });

          if (!response.ok) throw new Error("API recusou sincronização temporariamente");

        } catch (error) {
          console.error("[Sync] Erro ao sincronizar item da fila, mantendo armazenado:", error);
          filaRestante.push(vistoria); // Se der erro, mantém no aparelho para tentar depois
        }
      }

      localStorage.setItem('fila_vistorias_offline', JSON.stringify(filaRestante));
      if (filaRestante.length === 0) {
        dispararNotificacao('sucesso', 'Todos os registros de campo foram sincronizados!');
      }
    };

    // Fica escutando as mudanças de rede do celular do funcionário em tempo real
    window.addEventListener('online', processarFilaOffline);
    return () => window.removeEventListener('online', processarFilaOffline);
  }, []);

  const clientesFiltrados = clientesLista.filter(cli =>
    cli.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const selecionarClienteExistente = (nomeCliente) => {
    const nomeMaiusculo = nomeCliente.toUpperCase();
    setCliente(nomeMaiusculo);
    setTermoBusca(nomeMaiusculo); 
    setModoNovoCliente(false);
    setMostrarDropdown(false);
  };

  const activarModoNovoCliente = () => {
    setModoNovoCliente(true);
    setCliente('');
    setInputNovoCliente('');
    setMostrarDropdown(false);
  };

  const confirmarEInserirClienteNaLista = async () => {
    const nomeFormatado = inputNovoCliente.trim().toUpperCase();
    if (!nomeFormatado) {
      dispararNotificacao('erro', 'Por favor, digite um nome válido para o cliente.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/Clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Nome: nomeFormatado })
      });

      if (!response.ok) {
        const txtErro = await response.text();
        throw new Error(txtErro || "Erro ao registrar cliente no banco.");
      }

      if (!clientesLista.includes(nomeFormatado)) {
        setClientesLista(prev => [...prev, nomeFormatado].sort());
      }

      setCliente(nomeFormatado);
      setTermoBusca(nomeFormatado);
      setModoNovoCliente(false);
      setInputNovoCliente('');
      dispararNotificacao('sucesso', 'Cliente fixado no banco de dados com sucesso!');
    } catch (err) {
      console.error(err);
      dispararNotificacao('erro', `Não foi possível fixar o cliente: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
      dispararNotificacao('erro', 'O celular ficou sem memória. Envie as fotos uma a uma.');
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

  // FUNÇÃO DE CONVERSÃO DE ARQUIVO PARA STRING BASE64 (ESSENCIAL PARA CACHE LOCAL)
  const converterParaBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const finalizarVistoria = async () => {
    const nomeClienteFinal = cliente.trim().toUpperCase();

    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe || !tipoServico || !nomeClienteFinal || nomeClienteFinal === "NÃO INFORMADO") {
      dispararNotificacao('erro', 'Preencha todos os campos e adicione ao menos 1 foto.');
      return;
    }

    setLoading(true);

    // Captura GPS resiliente
    let localizacao = "Não autorizada";
    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000, enableHighAccuracy: false });
      });
      localizacao = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (e) { console.warn("GPS indisponível."); }

    const placaFormatada = placa.trim().toUpperCase();
    const usuarioIdFinal = user?.id && user.id !== "Sistema" ? user.id : "3fa85f64-5717-4562-b3fc-2c963f66afa6";

    const payloadGeral = {
      Placa: String(placaFormatada).trim(),
      Cliente: nomeClienteFinal, 
      ClienteNome: nomeClienteFinal,
      clienteNome: nomeClienteFinal,
      UsuarioId: usuarioIdFinal, 
      Equipe: String(equipe).trim(),
      TipoServico: String(tipoServico).trim(),
      Observacao: String(observacao || '').trim(),
      Localizacao: String(localizacao).trim(),
      Status: String(status).trim()
    };

    // INTERCEPTADOR OFFLINE SE O SMARTPHONE FICAR SEM INTERNET
    if (!navigator.onLine) {
      try {
        // Converte o pacote de fotos binárias para strings persistentes em localStorage
        const fotosConvertidas = [];
        for (const foto of fotosOtimizadas) {
          const b64 = await converterParaBase64(foto);
          fotosConvertidas.push(b64);
        }

        const vistoriaOffline = {
          payload: payloadGeral,
          fotosBase64: fotosConvertidas
        };

        const filaAtual = JSON.parse(localStorage.getItem('fila_vistorias_offline') || '[]');
        filaAtual.push(vistoriaOffline);
        localStorage.setItem('fila_vistorias_offline', JSON.stringify(filaAtual));

        dispararNotificacao('sucesso', '⚠️ Modo Sem Sinal! Vistoria guardada localmente no celular.');

        // Reseta o formulário limpando a memória com segurança
        previews.forEach(url => URL.revokeObjectURL(url));
        setPlaca(''); setCliente(''); setObservacao(''); setEquipe(''); setTipoServico(''); setStatus('inicial');
        setFotosOtimizadas([]); setPreviews([]); setTermoBusca(''); setInputNovoCliente(''); setModoNovoCliente(false);
      } catch (err) {
        dispararNotificacao('erro', 'Erro de persistência local ao salvar offline.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // FLUXO TRADICIONAL ONLINE (MANTIDO COMPLETO)
    try {
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

      const payloadFinal = {
        ...payloadGeral,
        Evidencias: urlsFotosParaBanco.map(path => String(path))
      };

      const response = await fetch(`${API_URL}/Vistoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFinal)
      });

      if (!response.ok) {
        const erroMsg = await response.text();
        throw new Error(erroMsg || "Erro ao salvar na API .NET");
      }

      dispararNotificacao('sucesso', 'Inspeção finalizada com sucesso!');

      if (!clientesLista.includes(nomeClienteFinal)) {
        setClientesLista(prev => [...prev, nomeClienteFinal].sort());
      }

      previews.forEach(url => URL.revokeObjectURL(url));
      setPlaca(''); setCliente(''); setObservacao(''); setEquipe(''); setTipoServico(''); setStatus('inicial');
      setFotosOtimizadas([]); setPreviews([]);
      setTermoBusca(''); setInputNovoCliente(''); setModoNovoCliente(false);

    } catch (err) {
      console.error("Erro fatal:", err);
      dispararNotificacao('erro', `Falha no envio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div translate="no" className="notranslate" style={styles.container}>
      
      {/* TOAST DE NOTIFICAÇÃO CENTRALIZADO */}
      {notificacao.exibir && (
        <div style={styles.toastContainerCentral}>
          <div style={{
            ...styles.toastBox,
            backgroundColor: notificacao.tipo === 'sucesso' ? '#10b981' : '#ef4444'
          }}>
            {notificacao.tipo === 'sucesso' ? (
              <CheckCircle2 size={24} color="#fff" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={24} color="#fff" style={{ flexShrink: 0 }} />
            )}
            <span style={styles.toastText}>{notificacao.mensagem}</span>
          </div>
        </div>
      )}

      <div style={styles.formHeader}>
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
          
          <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder={modoNovoCliente ? "CADASTRANDO NOVO..." : "Buscar ou Selecionar Cliente"} 
                value={modoNovoCliente ? "" : termoBusca} 
                disabled={modoNovoCliente}
                onFocus={() => setMostrarDropdown(true)}
                onChange={(e) => {
                  setTermoBusca(e.target.value.toUpperCase());
                  setMostrarDropdown(true);
                }} 
                style={{ ...styles.input, paddingLeft: '45px' }} 
              />
              <Search size={18} style={styles.fieldIcon} />
            </div>

            {mostrarDropdown && (
              <div style={styles.dropdownContainer}>
                <div onClick={activarModoNovoCliente} style={styles.dropdownOptionNew}>
                  <Plus size={16} /> ADICIONAR NOVO CLIENTE...
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((cli, idx) => (
                    <div key={idx} onClick={() => selecionarClienteExistente(cli)} style={styles.dropdownOption}>
                      {cli}
                    </div>
                  ))
                ) : (
                  <div style={styles.dropdownNoResults}>NENHUM CLIENTE ENCONTRADO</div>
                )}
              </div>
            )}
          </div>

          {modoNovoCliente && (
            <div style={styles.newClientBox}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="NOME DO NOVO CLIENTE" 
                  value={inputNovoCliente} 
                  onChange={(e) => setInputNovoCliente(e.target.value.toUpperCase())} 
                  style={styles.inputSmall} 
                />
                <button type="button" onClick={confirmarEInserirClienteNaLista} disabled={loading} style={styles.btnConfirmarCliente}>
                  <ArrowRight size={20} color="#fff" />
                </button>
              </div>
              <span onClick={() => { setModoNovoCliente(false); setTermoBusca(''); setCliente(''); }} style={styles.cancelarNovoBtn}>
                Cancelar e voltar para a busca
              </span>
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
              {equipesDisponiveis.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          
            <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} style={styles.select}>
              <option value="" disabled>Tipo de Serviço</option>
              {tiposServicoDisponiveis.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
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
          <textarea placeholder="Observações adicionais..." value={observacao} onChange={(e) => setObservacao(e.target.value)} style={styles.textarea} />
          
          <div style={styles.uploadArea}>
            <label htmlFor="foto-input" style={styles.buttonAdd}>
              <Camera size={20} /> TIRAR FOTOS DE EVIDÊNCIA
            </label>
            <input id="foto-input" ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={manipularFotos} style={{ display: 'none' }} />
            
            <div style={styles.grid}>
              {previews.map((url, index) => (
                <div key={index} style={styles.thumbWrap}>
                  <img src={url} alt="preview" style={styles.img} />
                  <button onClick={() => removerFoto(index)} style={styles.btnDel}>×</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTÃO DE SUBMISSÃO INTEGRADO */}
        <div style={styles.footerButtonArea}>
          <button onClick={finalizarVistoria} disabled={loading || fotosOtimizadas.length === 0} style={loading ? styles.btnDisabled : styles.btnSend}>
            {loading ? "ENVIANDO DADOS..." : (
              !navigator.onLine ? (
                <><WifiOff size={20} /> SALVAR OFFLINE ({fotosOtimizadas.length}/10)</>
              ) : (
                <><CheckCircle2 size={20} /> FINALIZAR INSPEÇÃO ({fotosOtimizadas.length}/10)</>
              )
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { width: '100%', maxWidth: '480px', margin: '0 auto', background: '#0f172a', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'sans-serif', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxSizing: 'border-box' },
  formHeader: { padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(to bottom, #1e293b, #0f172a)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logoImg: { width: '120px', marginBottom: '10px', height: 'auto', objectFit: 'contain' },
  headerTitle: { fontSize: '18px', fontWeight: '700', margin: 0, color: '#e2e8f0' },
  scrollContent: { padding: '20px' },
  section: { marginBottom: '20px', padding: '15px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  inputWrapper: { position: 'relative', width: '100%' },
  fieldIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 10 },
  input: { width: '100%', padding: '14px', borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '12px', borderRadius: '12px', background: '#020617', border: '1px solid #3182ce', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none', flex: 1 },
  inputGroupVertical: { display: 'flex', flexDirection: 'column', gap: '10px' },
  select: { width: '100%', padding: '14px', borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none' },
  textarea: { width: '100%', height: '80px', padding: '14px', borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', resize: 'none', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  uploadArea: { marginTop: '10px' },
  buttonAdd: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '14px', borderRadius: '12px', border: '1px dashed #3b82f6', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '15px' },
  thumbWrap: { position: 'relative', paddingTop: '100%' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' },
  btnDel: { position: 'absolute', top: '2px', right: '2px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  footerButtonArea: { marginTop: '15px', marginBottom: '10px' },
  btnSend: { width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' },
  btnDisabled: { width: '100%', padding: '16px', background: '#334155', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' },
  dropdownContainer: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', marginTop: '5px', maxHeight: '180px', overflowY: 'auto', zIndex: 100, padding: '5px' },
  dropdownOption: { padding: '12px', color: '#e2e8f0', cursor: 'pointer', borderRadius: '8px', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.02)' },
  dropdownOptionNew: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: '#60a5fa', fontWeight: '700', cursor: 'pointer', borderRadius: '8px', fontSize: '15px' },
  dropdownNoResults: { padding: '12px', color: '#64748b', fontSize: '14px', textAlign: 'center' },
  newClientBox: { marginTop: '10px', padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' },
  btnConfirmarCliente: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cancelarNovoBtn: { fontSize: '12px', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-end', marginTop: '4px' },
  toastContainerCentral: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 },
  toastBox: { padding: '15px 25px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  toastText: { color: '#fff', fontWeight: '700', fontSize: '14px' }
};