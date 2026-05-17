import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { otimizarImagem } from './utils/compressor';
import { Camera, Search, Plus, CheckCircle2, XCircle, ArrowRight, WifiOff } from 'lucide-react';

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

  const tiposServicoDisponiveis = ["On Job", "Primeira Visita", "Procura Artificial", "Indicação"];
  const equipesDisponiveis = ["812", "811", "TFF", "805", "810"];
  const statusDisponiveis = [
    { label: "Inicial", value: "inicial" },
    { label: "Em processo", value: "em processo" },
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
            backgroundColor: notificacao.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.98)' : 'rgba(239, 68, 68, 0.98)'
          }}>
            {notificacao.tipo === 'sucesso' ? (
              <CheckCircle2 size={28} color="#fff" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={28} color="#fff" style={{ flexShrink: 0 }} />
            )}
            <span style={styles.toastText}>{notificacao.mensagem}</span>
          </div>
        </div>
      )}

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

        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder={modoNovoCliente ? "Modo: Criando Novo Cliente..." : " Buscar ou Selecionar Cliente"} 
              value={modoNovoCliente ? "➕ CADASTRANDO NOVO REGISTRO..." : termoBusca} 
              disabled={modoNovoCliente}
              onFocus={() => setMostrarDropdown(true)}
              onChange={(e) => {
                setTermoBusca(e.target.value.toUpperCase());
                setMostrarDropdown(true);
              }} 
              style={{ 
                ...styles.input, 
                paddingLeft: '40px',
                backgroundColor: modoNovoCliente ? 'rgba(255,255,255,0.03)' : '#0f172a',
                color: modoNovoCliente ? '#a0aec0' : '#fff'
              }} 
            />
            <Search size={18} style={{ position: 'absolute', left: '14px', color: '#4a5568' }} />
          </div>

          {mostrarDropdown && (
            <div style={styles.dropdownContainer}>
              <div onClick={activarModoNovoCliente} style={styles.dropdownOptionNew}>
                <Plus size={16} /> ADICIONAR NOVO CLIENTE...
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(99, 179, 237, 0.04)', padding: '10px', borderRadius: '12px', border: '1px dashed rgba(99, 179, 237, 0.3)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="ESCREVA O NOME DO NOVO CLIENTE" 
                value={inputNovoCliente} 
                onChange={(e) => setInputNovoCliente(e.target.value.toUpperCase())} 
                style={{ ...styles.input, flex: 1, border: '1px solid #63b3ed' }} 
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
        
        <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.select}>
          <option value="" disabled>Selecione a Equipe</option>
          {equipesDisponiveis.map(eq => <option key={eq} value={eq}>Equipe {eq}</option>)}
        </select>
      
        <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} style={styles.select}>
          <option value="" disabled>Tipo de Serviço</option>
          {tiposServicoDisponiveis.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
          {statusDisponiveis.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <textarea placeholder="Observações adicionais..." value={observacao} onChange={(e) => setObservacao(e.target.value)} style={styles.textarea} />
      </div>

      <div style={styles.uploadArea}>
        <label htmlFor="foto-input" style={styles.buttonAdd}>
          <Camera size={20} /> ABRIR CÂMERA
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

      <button onClick={finalizarVistoria} disabled={loading || fotosOtimizadas.length === 0} style={loading ? styles.btnDisabled : styles.btnSend}>
        {loading ? "ENVIANDO DADOS..." : (
          !navigator.onLine ? (
            <><WifiOff size={20} /> SALVAR OFFLINE ({fotosOtimizadas.length}/10)</>
          ) : (
            <><CheckCircle2 size={20} /> FINALIZAR ({fotosOtimizadas.length}/10)</>
          )
        )}
      </button>
    </div>
  );
}

const styles = {
  container: { position: 'relative', width: '100%', maxWidth: '450px', minHeight: '100vh', margin: '0 auto', background: '#1a202c', padding: '20px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', boxSizing: 'border-box', overflowY: 'auto' },
  toastContainerCentral: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 13000 },
  toastBox: { padding: '16px 28px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '90%', pointerEvents: 'auto' },
  toastText: { color: '#fff', fontWeight: '800', fontSize: '14px', letterSpacing: '0.2px', textAlign: 'center' },
  logoImg: { width: '110px', height: 'auto', objectFit: 'contain' },
  formHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '5px' },
  iconCircle: { width: '140px', height: '140px', background: 'rgba(99, 179, 237, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(99, 179, 237, 0.2)' },
  title: { textAlign: 'center', margin: 0, color: '#fff', fontWeight: '800', fontSize: '22px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '80px', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' },
  uploadArea: { marginTop: '20px', marginBottom: '25px' },
  buttonAdd: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(66, 153, 225, 0.15)', color: '#63b3ed', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', border: '1px dashed #63b3ed' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '15px' },
  thumbWrap: { position: 'relative', paddingTop: '100%' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' },
  btnDel: { position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' },
  btnSend: { width: '100%', padding: '18px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' },
  btnDisabled: { width: '100%', padding: '18px', background: 'rgba(255,255,255,0.05)', color: '#4a5568', border: 'none', borderRadius: '16px', cursor: 'not-allowed', fontWeight: '900' },
  dropdownContainer: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto', zIndex: 999, padding: '5px' },
  dropdownOption: { padding: '12px', color: '#e2e8f0', cursor: 'pointer', borderRadius: '8px', fontSize: '15px' },
  dropdownOptionNew: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: '#63b3ed', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', fontSize: '15px' },
  dropdownNoResults: { padding: '12px', color: '#4a5568', fontSize: '14px', textAlign: 'center' },
  cancelarNovoBtn: { fontSize: '12px', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-end' },
  btnConfirmarCliente: { background: '#3182ce', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};