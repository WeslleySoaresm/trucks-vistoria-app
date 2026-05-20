import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Search, Send, Mic, ImageIcon, Circle, Shield, User, Zap } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

const tocarSomNotificacao = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (err) {
    console.warn("Ambiente do navegador bloqueou a reprodução automática de áudio:", err);
  }
};

const vibrarDispositivo = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
};

export default function ChatInterno({ usuarioLogado }) {
  console.log("CONTEÚDO DO USUÁRIO LOGADO NO CHAT:", usuarioLogado);
    
   
  // Normalização das propriedades para evitar problemas com maiúsculas/minúsculas
   let minhaEmpresa = usuarioLogado?.EmpresaNome || usuarioLogado?.empresaNome || "";
    const meuId = usuarioLogado?.Id || usuarioLogado?.id || "";
    const meuEmail = usuarioLogado?.Email || usuarioLogado?.email || "";
    const meuNome = usuarioLogado?.Nome || usuarioLogado?.nome || "";
    const meuStatus = usuarioLogado?.StatusPresenca || usuarioLogado?.statusPresenca || "";
    const meuCargo = usuarioLogado?.TipoUsuario || usuarioLogado?.tipoUsuario || "";
    const minhaFoto = usuarioLogado?.FotoUrl || usuarioLogado?.fotoUrl || "";

    // Se o objeto de login veio sem a empresa, nós forçamos o valor correto pelo seu ID ou Nome
    if (!minhaEmpresa || minhaEmpresa.trim() === '') {
      if (meuNome.includes("weslley") || meuId === "605882d4-8506-49e7-9ccc-518b6f3507e0") {
        console.log("⚠️ Propriedade EmpresaNome ausente no login. Forçando 'juniorcar' via código.");
        minhaEmpresa = "juniorcar";
      }
    }

  const [contatos, setContatos] = useState([]); 
  const [buscaContato, setBuscaContato] = useState('');
  const [salaAtiva, setSalaAtiva] = useState(null);
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [loadingContatos, setLoadingContatos] = useState(true);

  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const mensagensEndRef = useRef(null);

  const obterCorStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return '#48bb78';
      case 'pausa': return '#ed8936';
      case 'offline': return '#e53e3e';
      default: return '#a0aec0';
    }
  };

  // 1. CARREGAR CONTATOS DA MESMA EMPRESA
  useEffect(() => {
    const buscarContatos = async () => {
      if (!minhaEmpresa || minhaEmpresa.trim() === '') {
        console.warn("Aguardando um EmpresaNome válido para carregar os contatos.");
        setContatos([]);
        setLoadingContatos(false);
        return;
      }

      setLoadingContatos(true);
      try {
        const response = await fetch(`${API_URL}/usuario?empresaNome=${encodeURIComponent(minhaEmpresa.trim())}`);
        if (!response.ok) throw new Error("Erro ao buscar time");
        const dados = await response.json();
        
        // Filtra para não listar você mesmo na barra lateral de contatos
        const filtrados = dados.filter(u => {
          const uId = u.id || u.Id;
          const uEmail = u.email || u.Email;
          return uId !== meuId && uEmail?.toLowerCase() !== meuEmail?.toLowerCase();
        });

        setContatos(filtrados);
      } catch (err) {
        console.error("Erro ao carregar contatos do chat:", err);
        setContatos([]);
      } finally {
        setLoadingContatos(false);
      }
    };

    buscarContatos();
  }, [minhaEmpresa, meuId, meuEmail]);

  // 2. ALGORITMO DO AUTOCOMPLETE POR STRING
  useEffect(() => {
    if (novoTexto.startsWith('/') && minhaEmpresa) {
      const termoBusca = novoTexto.toLowerCase();
      
      fetch(`${API_URL}/chat/sugestoes/${encodeURIComponent(minhaEmpresa.trim())}?termo=${termoBusca}`)
        .then(res => res.json())
        .then(dados => {
          setSugestoes(dados || []);
          setMostrarSugestoes(dados && dados.length > 0);
        })
        .catch(err => {
          console.error("Erro no autocomplete:", err);
          setMostrarSugestoes(false);
        });
    } else {
      setMostrarSugestoes(false);
      setSugestoes([]);
    }
  }, [novoTexto, minhaEmpresa]);

  // 3. SELECIONAR OU CRIAR UMA SALA AO CLICAR EM UM CONTATO
  const abrirConversa = async (contato) => {
    const cId = contato.id || contato.Id;
    setContatoAtivo(contato);
    try {
      const response = await fetch(`${API_URL}/chat/sala?usuarioId2=${cId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaNome: minhaEmpresa.trim(),
          tipo: 'individual'
        })
      });
      
      if (!response.ok) throw new Error("Erro ao obter/criar sala");
      const sala = await response.json();
      setSalaAtiva(sala);
      
      const resMsg = await fetch(`${API_URL}/chat/mensagens/${sala.id || sala.Id}`);
      if (resMsg.ok) {
        const historico = await resMsg.json();
        setMensagens(historico || []);
      }
    } catch (err) {
      console.error("Erro ao inicializar sala de chat:", err);
    }
  };

  // 4. ESCUTA EM TEMPO REAL DO SUPABASE
  useEffect(() => {
    const sId = salaAtiva?.id || salaAtiva?.Id;
    if (!sId) return;

    const canalRealtime = supabase
      .channel(`sala-${sId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'MobileTrucks', table: 'ChatMensagens', filter: `SalaId=eq.${sId}` },
        (payload) => {
          const novaMsg = payload.new;
          
          setMensagens(prev => {
            if (prev.some(m => (m.id || m.Id) === novaMsg.Id)) return prev;
            return [...prev, {
              id: novaMsg.Id,
              salaId: novaMsg.SalaId,
              remetenteId: novaMsg.RemetenteId,
              texto: novaMsg.Texto,
              tipoMidia: novaMsg.TipoMidia,
              arquivoUrl: novaMsg.ArquivoUrl,
              dataEnvio: novaMsg.DataEnvio,
              entregue: novaMsg.Entregue,
              visualizado: novaMsg.Visualizado
            }];
          });
          
          if (novaMsg.RemetenteId !== meuId) {
            tocarSomNotificacao();
            vibrarDispositivo();
            fetch(`${API_URL}/chat/mensagens/visualizar/${novaMsg.Id}`, { method: 'POST' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, [salaAtiva, meuId]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 5. ENVIAR MENSAGEM
  const enviarMensagem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const sId = salaAtiva?.id || salaAtiva?.Id;
    if (!novoTexto.trim() || !sId) return;

    const payloadMensagem = {
      salaId: sId,
      remetenteId: meuId,
      texto: novoTexto,
      tipoMidia: 'texto'
    };

    try {
      setNovoTexto('');
      setMostrarSugestoes(false);

      await fetch(`${API_URL}/chat/mensagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadMensagem)
      });
    } catch (err) {
      console.error("Erro ao disparar mensagem:", err);
    }
  };

  const selecionarSugestao = (sugestao) => {
    setNovoTexto(sugestao.textoCompleto || sugestao.TextoCompleto);
    setMostrarSugestoes(false);
    const sugId = sugestao.id || sugestao.Id;
    fetch(`${API_URL}/chat/sugestoes/computar-uso/${sugId}`, { method: 'POST' });
  };

  const contatosFiltrados = contatos.filter(c => {
    const cNome = c.nome || c.Nome || "";
    return cNome.toLowerCase().includes(buscaContato.toLowerCase());
  });

  return (
    <div style={styles.chatContainer}>
      {/* BARRA LATERAL */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.perfilLogado}>
            <div style={styles.avatarWrapper}>
              {minhaFoto ? (
                <img src={minhaFoto} alt="Eu" style={styles.avatarImagem} />
              ) : (
                <div style={styles.avatarFallback}>{meuNome?.substring(0,2).toUpperCase()}</div>
              )}
              <Circle size={12} fill={obterCorStatus(meuStatus)} color="#1e293b" style={styles.statusBadgeDot} />
            </div>
            <div>
              <span style={styles.nomePerfil}>{meuNome}</span>
              <span style={styles.cargoPerfil}>{meuCargo === 'gestor' ? 'Gestor Master' : 'Inspecionador'}</span>
            </div>
          </div>
          
          <div style={styles.searchBox}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar no time..." 
              value={buscaContato}
              onChange={(e) => setBuscaContato(e.target.value)}
              style={styles.inputSearch} 
            />
          </div>
        </div>

        <div style={styles.contatosList}>
          {loadingContatos ? (
            <p style={styles.AvisoLinha}>Carregando integrantes...</p>
          ) : contatosFiltrados.length === 0 ? (
            <p style={styles.AvisoLinha}>Nenhum membro ativo nesta empresa.</p>
          ) : (
            contatosFiltrados.map(c => {
              const cId = c.id || c.Id;
              const cNome = c.nome || c.Nome;
              const cFoto = c.fotoUrl || c.FotoUrl;
              const cStatus = c.statusPresenca || c.StatusPresenca;
              const cCargo = c.tipoUsuario || c.TipoUsuario;
              const ativoId = contatoAtivo?.id || contatoAtivo?.Id;

              return (
                <div 
                  key={cId} 
                  onClick={() => abrirConversa(c)}
                  style={{
                    ...styles.contatoRow,
                    background: ativoId === cId ? 'rgba(99, 179, 237, 0.1)' : 'transparent'
                  }}
                >
                  <div style={styles.avatarWrapper}>
                    {cFoto ? (
                      <img src={cFoto} alt={cNome} style={styles.avatarImagem} />
                    ) : (
                      <div style={styles.avatarFallback}>{cNome?.substring(0,2).toUpperCase()}</div>
                    )}
                    <Circle size={12} fill={obterCorStatus(cStatus)} color="#1e293b" style={styles.statusBadgeDot} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.contatoNomeLinha}>
                      <span style={styles.contatoNome}>{cNome}</span>
                      {cCargo === 'gestor' && <Shield size={12} color="#63b3ed" title="Gestor" />}
                    </div>
                    <span style={styles.contatoStatusTexto}>{cStatus || 'offline'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={styles.chatArea}>
        {salaAtiva && contatoAtivo ? (
          <>
            <div style={styles.chatHeader}>
              <div style={styles.avatarWrapper}>
                {/* Definições de cabeçalho do contato ativo */}
                {(contatoAtivo.fotoUrl || contatoAtivo.FotoUrl) ? (
                  <img src={contatoAtivo.fotoUrl || contatoAtivo.FotoUrl} alt={contatoAtivo.nome || contatoAtivo.Nome} style={styles.avatarImagem} />
                ) : (
                  <div style={styles.avatarFallback}>{(contatoAtivo.nome || contatoAtivo.Nome)?.substring(0,2).toUpperCase()}</div>
                )}
                <Circle size={12} fill={obterCorStatus(contatoAtivo.statusPresenca || contatoAtivo.StatusPresenca)} color="#1e293b" style={styles.statusBadgeDot} />
              </div>
              <div>
                <h4 style={styles.chatHeaderNome}>{contatoAtivo.nome || contatoAtivo.Nome}</h4>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {(contatoAtivo.tipoUsuario || contatoAtivo.TipoUsuario) === 'gestor' ? 'Gestor Corporativo' : 'Colaborador Equipe'}
                </span>
              </div>
            </div>

            <div style={styles.messagesArea}>
              {mensagens.map((msg, index) => {
                const rId = msg.remetenteId || msg.RemetenteId;
                const txt = msg.texto || msg.Texto;
                const data = msg.dataEnvio || msg.DataEnvio;
                const visto = msg.visualizado || msg.Visualizado;
                const euEnviei = rId === meuId;

                return (
                  <div key={msg.id || msg.Id || index} style={{ ...styles.messageRow, justifyContent: euEnviei ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      ...styles.balao,
                      background: euEnviei ? '#2563eb' : '#334155',
                      borderRadius: euEnviei ? '16px 16px 2px 16px' : '16px 16px 16px 2px'
                    }}>
                      <p style={styles.balaoTexto}>{txt}</p>
                      <div style={styles.balaoMeta}>
                        <span style={styles.balaoHora}>
                          {data ? new Date(data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                        {euEnviei && (
                          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                            {visto ? (
                              <>
                                <Zap size={11} fill="#63b3ed" color="#63b3ed" />
                                <Zap size={11} fill="#63b3ed" color="#63b3ed" style={{ marginLeft: '-4px' }} />
                              </>
                            ) : (
                              <Zap size={11} fill="#718096" color="#718096" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={mensagensEndRef} />
            </div>

            <div style={styles.inputAreaContainer}>
              {mostrarSugestoes && (
                <div style={styles.autocompleteBox}>
                  <div style={styles.autocompleteHeader}>Sugestões de eficiência</div>
                  {sugestoes.map((sug) => {
                    const sId = sug.id || sug.Id;
                    const sCurto = sug.textoCurto || sug.TextoCurto;
                    const sCompleto = sug.textoCompleto || sug.TextoCompleto;
                    return (
                      <div key={sId} onClick={() => selecionarSugestao(sug)} style={styles.autocompleteItem}>
                        <span style={styles.atalhoTexto}>{sCurto}</span>
                        <span style={styles.completoTexto}>{sCompleto}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={enviarMensagem} style={styles.inputForm}>
                <button type="button" style={styles.midiaBtn} title="Enviar Foto"><ImageIcon size={20} /></button>
                <button type="button" style={styles.midiaBtn} title="Gravar Áudio"><Mic size={20} /></button>
                <input 
                  type="text"
                  placeholder="Digite uma mensagem... (Use '/' para respostas rápidas)"
                  value={novoTexto}
                  onChange={(e) => setNovoTexto(e.target.value)}
                  style={styles.chatInputInput}
                />
                <button type="submit" style={styles.btnEnviar}><Send size={16} /></button>
              </form>
            </div>
          </>
        ) : (
          <div style={styles.noChatSelected}>
            <User size={48} color="#475569" />
            <h3>Nenhuma conversa activa</h3>
            <p>Selecione um membro do seu time na barra lateral para iniciar o chat criptografado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  chatContainer: { display: 'flex', width: '100%', height: '82vh', background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '320px', background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  perfilLogado: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' },
  nomePerfil: { display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fff' },
  cargoPerfil: { display: 'block', fontSize: '11px', color: '#63b3ed', fontWeight: '500' },
  avatarWrapper: { position: 'relative', width: '42px', height: '42px' },
  avatarImagem: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' },
  avatarFallback: { width: '100%', height: '100%', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#cbd5e0' },
  statusBadgeDot: { position: 'absolute', bottom: '0', right: '0', zIndex: 2 },
  searchBox: { position: 'relative', width: '100%' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  inputSearch: { width: '100%', padding: '10px 10px 10px 36px', borderRadius: '10px', background: '#1e293b', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
  contatosList: { flex: 1, overflowY: 'auto', padding: '10px' },
  contatoRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', marginBottom: '4px' },
  contatoNomeLinha: { display: 'flex', alignItems: 'center', gap: '6px' },
  contatoNome: { fontSize: '14px', fontWeight: '600', color: '#f1f5f9' },
  contatoStatusTexto: { fontSize: '11px', color: '#64748b', textTransform: 'capitalize' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', background: '#1e293b' },
  chatHeader: { padding: '15px 20px', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' },
  chatHeaderNome: { margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#fff' },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  messageRow: { display: 'flex', width: '100%' },
  balao: { padding: '12px 16px', maxWidth: '70%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  balaoTexto: { margin: 0, fontSize: '14px', color: '#fff', lineHeight: '1.4', wordBreak: 'break-word' },
  balaoMeta: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' },
  balaoHora: { fontSize: '9px' },
  inputAreaContainer: { padding: '20px', background: '#0f172a', position: 'relative' },
  inputForm: { display: 'flex', alignItems: 'center', gap: '10px' },
  midiaBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' },
  chatInputInput: { flex: 1, padding: '12px 16px', borderRadius: '10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none' },
  btnEnviar: { background: '#2563eb', color: '#fff', border: 'none', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '4px' },
  AvisoLinha: { textAlign: 'center', color: '#64748b', fontSize: '13px', paddingTop: '20px' },
  autocompleteBox: { position: 'absolute', bottom: '75px', left: '20px', right: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #3b82f6', boxShadow: '0 -4px 20px rgba(0,0,0,0.4)', zIndex: 10, overflow: 'hidden' },
  autocompleteHeader: { background: 'rgba(59, 130, 246, 0.1)', padding: '8px 14px', fontSize: '11px', color: '#63b3ed', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  autocompleteItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' },
  atalhoTexto: { background: 'rgba(99, 179, 237, 0.15)', color: '#63b3ed', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' },
  completoTexto: { color: '#e2e8f0', fontSize: '13px' }
};