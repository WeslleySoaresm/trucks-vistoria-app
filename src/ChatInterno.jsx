import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Search, Send, Mic, ImageIcon, Circle, Shield, User, Check, CheckCheck } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

const tocarSomNotificacao = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(580, audioCtx.currentTime); // Frequência suave estilo Telegram
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (err) {
    console.warn("Navegador bloqueou áudio automatizado temporariamente:", err);
  }
};

const vibrarDispositivo = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([80, 50, 80]);
  }
};

export default function ChatInterno({ 
  usuarioLogado, 
  salaAtiva, 
  setSalaAtiva, 
  contatoAtivo, 
  setContatoAtivo, 
  mensagens, 
  setMensagens 
}) {

  let minhaEmpresa = usuarioLogado?.EmpresaNome || usuarioLogado?.empresaNome || "";
  const meuId = usuarioLogado?.Id || usuarioLogado?.id || "";
  const meuEmail = usuarioLogado?.Email || usuarioLogado?.email || "";
  const meuNome = usuarioLogado?.Nome || usuarioLogado?.nome || "";
  const meuStatus = usuarioLogado?.statusPresenca || usuarioLogado?.StatusPresenca || "online";
  const meuCargo = usuarioLogado?.TipoUsuario || usuarioLogado?.tipoUsuario || "";
  const minhaFoto = usuarioLogado?.FotoUrl || usuarioLogado?.fotoUrl || "";

  if (!minhaEmpresa || minhaEmpresa.trim() === '') {
    minhaEmpresa = "juniorcar";
  }

  const [contatos, setContatos] = useState([]); 
  const [buscaContato, setBuscaContato] = useState('');
  const [novoTexto, setNovoTexto] = useState('');
  const [loadingContatos, setLoadingContatos] = useState(true);
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const mensagensEndRef = useRef(null);

  const obterCorStatus = (status) => {
    const s = status?.toString().toLowerCase().trim();
    if (s === 'online') return '#00c73c'; // Verde vivo nativo do Telegram
    if (s === 'pausa' || s === 'away' || s === 'ausente') return '#ff9f0a'; // Laranja de atenção
    return '#8e8e93'; // Cinza fosco para usuários offline
  };

  // 1. CARREGAR CONTATOS DA MESMA EMPRESA
  useEffect(() => {
    const buscarContatos = async () => {
      if (!minhaEmpresa) return;
      setLoadingContatos(true);
      try {
        const response = await fetch(`${API_URL}/usuario?empresaNome=${encodeURIComponent(minhaEmpresa.trim())}`);
        if (!response.ok) throw new Error("Erro ao buscar time");
        const dados = await response.json();
        
        const filtrados = dados.filter(u => {
          const uId = u.id || u.Id;
          const uEmail = u.email || u.Email;
          return uId !== meuId && uEmail?.toLowerCase() !== meuEmail?.toLowerCase();
        });

        setContatos(filtrados);
      } catch (err) {
        console.error("Erro ao carregar contatos do chat:", err);
      } finally {
        setLoadingContatos(false);
      }
    };

    buscarContatos();
  }, [minhaEmpresa, meuId, meuEmail]);

  // 2. AUTOCOMPLETE DE EFICIÊNCIA VIA COMANCO '/'
  useEffect(() => {
    if (novoTexto.startsWith('/') && minhaEmpresa) {
      const termoBusca = novoTexto.toLowerCase();
      fetch(`${API_URL}/chat/sugestoes/${encodeURIComponent(minhaEmpresa.trim())}?termo=${termoBusca}`)
        .then(res => res.json())
        .then(dados => {
          setSugestoes(dados || []);
          setMostrarSugestoes(dados && dados.length > 0);
        })
        .catch(() => setMostrarSugestoes(false));
    } else {
      setMostrarSugestoes(false);
    }
  }, [novoTexto, minhaEmpresa]);

  // 3. SELECIONAR OU CRIAR UMA SALA ESPECÍFICA (Isolando Histórico)
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
      
      const sId = sala.id || sala.Id;
      const resMsg = await fetch(`${API_URL}/chat/mensagens/${sId}`);
      if (resMsg.ok) {
        const historico = await resMsg.json();
        setMensagens(historico || []);
      }
    } catch (err) {
      console.error("Erro ao inicializar sala de chat:", err);
    }
  };

  // 4. FIX REALTIME: FILTRAGEM E ESCUTA BLINDADA POR SALAID ATIVA
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

          // Validação crucial: Impede que mensagens de outras salas vazem para o contato selecionado
          if (novaMsg.SalaId === sId) {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, [salaAtiva, meuId, setMensagens]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 5. ENVIAR MENSAGEM COM ATUALIZAÇÃO OTIMISTA (Sem delay de renderização)
  const enviarMensagem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const sId = salaAtiva?.id || salaAtiva?.Id;
    if (!novoTexto.trim() || !sId) return;

    const textoEnvio = novoTexto;
    setNovoTexto('');
    setMostrarSugestoes(false);

    const msgOtimista = {
      id: Math.random().toString(),
      salaId: sId,
      remetenteId: meuId,
      texto: textoEnvio,
      tipoMidia: 'texto',
      dataEnvio: new Date().toISOString(),
      visualizado: false
    };
    setMensagens(prev => [...prev, msgOtimista]);

    try {
      await fetch(`${API_URL}/chat/mensagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salaId: sId,
          remetenteId: meuId,
          texto: textoEnvio,
          tipoMidia: 'texto'
        })
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

  // Mapeamento correto do status do contato ativo para o cabeçalho
  const statusContatoAtivo = contatoAtivo?.statusPresenca || contatoAtivo?.StatusPresenca || "offline";

  return (
    <div style={styles.chatContainer}>
      {/* BARRA LATERAL (CONTATOS) */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.perfilLogado}>
            <div style={styles.avatarWrapper}>
              {minhaFoto ? (
                <img src={minhaFoto} alt="Eu" style={styles.avatarImagem} />
              ) : (
                <div style={styles.avatarFallback}>{meuNome?.substring(0,2).toUpperCase()}</div>
              )}
              <Circle size={10} fill={obterCorStatus(meuStatus)} color="#0f172a" style={styles.statusBadgeDot} />
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
            <p style={styles.AvisoLinha}>Nenhum membro ativo.</p>
          ) : (
            contatosFiltrados.map(c => {
              const cId = c.id || c.Id;
              const cNome = c.nome || c.Nome;
              const cFoto = c.fotoUrl || c.FotoUrl;
              const cStatus = c.statusPresenca || c.StatusPresenca || "offline";
              const cCargo = c.tipoUsuario || c.TipoUsuario;
              const ativoId = contatoAtivo?.id || contatoAtivo?.Id;
              const selecionado = ativoId === cId;

              return (
                <div 
                  key={cId} 
                  onClick={() => abrirConversa(c)}
                  style={{
                    ...styles.contatoRow,
                    background: selecionado ? '#2b5278' : 'transparent' // Azul clássico do Telegram Premium
                  }}
                >
                  <div style={styles.avatarWrapper}>
                    {cFoto ? (
                      <img src={cFoto} alt={cNome} style={styles.avatarImagem} />
                    ) : (
                      <div style={{...styles.avatarFallback, backgroundColor: selecionado ? '#182533' : '#24303f'}}>{cNome?.substring(0,2).toUpperCase()}</div>
                    )}
                    <Circle size={10} fill={obterCorStatus(cStatus)} color={selecionado ? '#2b5278' : '#0f172a'} style={styles.statusBadgeDot} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={styles.contatoNomeLinha}>
                      <span style={{...styles.contatoNome, color: '#fff'}}>{cNome}</span>
                      {cCargo === 'gestor' && <Shield size={12} color={selecionado ? '#fff' : '#63b3ed'} title="Gestor" />}
                    </div>
                    {/* Correção dinâmica da label de status na lista lateral */}
                    <span style={{
                      ...styles.contatoStatusTexto, 
                      color: cStatus.toLowerCase() === 'online' ? '#5288c1' : '#707579'
                    }}>
                      {cStatus.toLowerCase() === 'online' ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ÁREA DE CONVERSA */}
      <div style={styles.chatArea}>
        {salaAtiva && contatoAtivo ? (
          <>
            <div style={styles.chatHeader}>
              <div style={styles.avatarWrapper}>
                {(contatoAtivo.fotoUrl || contatoAtivo.FotoUrl) ? (
                  <img src={contatoAtivo.fotoUrl || contatoAtivo.FotoUrl} alt={contatoAtivo.nome || contatoAtivo.Nome} style={styles.avatarImagem} />
                ) : (
                  <div style={styles.avatarFallback}>{(contatoAtivo.nome || contatoAtivo.Nome)?.substring(0,2).toUpperCase()}</div>
                )}
                <Circle size={10} fill={obterCorStatus(statusContatoAtivo)} color="#0f172a" style={styles.statusBadgeDot} />
              </div>
              <div>
                <h4 style={styles.chatHeaderNome}>{contatoAtivo.nome || contatoAtivo.Nome}</h4>
                {/* CORREÇÃO DO STATUS DINÂMICO NO HEADER */}
                <span style={{ 
                  fontSize: '13px', 
                  color: statusContatoAtivo.toLowerCase() === 'online' ? '#5288c1' : '#707579',
                  fontWeight: '500' 
                }}>
                  {statusContatoAtivo.toLowerCase() === 'online' ? 'online' : 'offline'}
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
                      background: euEnviei ? '#2b5278' : '#182533', // Balões no padrão Dark do Telegram
                      borderRadius: euEnviei ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                    }}>
                      <p style={styles.balaoTexto}>{txt}</p>
                      <div style={styles.balaoMeta}>
                        <span style={styles.balaoHora}>
                          {data ? new Date(data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                        {euEnviei && (
                          <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
                            {visto ? (
                              <CheckCheck size={14} color="#5288c1" /> // Duplo check azul do Telegram
                            ) : (
                              <Check size={14} color="rgba(255,255,255,0.4)" />
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
                <button type="submit" style={styles.btnEnviar}><Send size={16} color="#fff" /></button>
              </form>
            </div>
          </>
        ) : (
          <div style={styles.noChatSelected}>
            <div style={styles.circuloIcone}>
              <User size={36} color="#5288c1" />
            </div>
            <h3 style={{ color: '#fff', margin: '15px 0 5px 0', fontSize: '18px' }}>Nenhuma conversa ativa</h3>
            <p style={{ color: '#707579', fontSize: '14px', maxWidth: '320px', lineHeight: '1.5' }}>
              Selecione um membro do seu time na barra lateral para iniciar o chat criptografado em tempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 🎨 DESIGN SYSTEM REFINADO — TELEGRAM K DARK MODE
const styles = {
  chatContainer: { display: 'flex', width: '100%', height: '78vh', background: '#0e1621', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '320px', background: '#17212b', borderRight: '1px solid #101921', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '16px', borderBottom: '1px solid #101921' },
  perfilLogado: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' },
  nomePerfil: { display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fff' },
  cargoPerfil: { display: 'block', fontSize: '11px', color: '#5288c1', fontWeight: '500' },
  avatarWrapper: { position: 'relative', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImagem: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
  avatarFallback: { width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#fff' },
  statusBadgeDot: { position: 'absolute', bottom: '-1px', right: '-1px', zIndex: 2 },
  searchBox: { position: 'relative', width: '100%' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  inputSearch: { width: '100%', padding: '10px 10px 10px 36px', borderRadius: '12px', background: '#24303f', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
  contatosList: { flex: 1, overflowY: 'auto', padding: '6px' },
  contatoRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px', cursor: 'pointer', transition: 'background 0.15s', marginBottom: '2px' },
  contatoNomeLinha: { display: 'flex', alignItems: 'center', gap: '6px' },
  contatoNome: { fontSize: '14.5px', fontWeight: '500' },
  contatoStatusTexto: { fontSize: '12px' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0e1621' },
  chatHeader: { padding: '14px 20px', background: '#17212b', borderBottom: '1px solid #101921', display: 'flex', alignItems: 'center', gap: '12px' },
  chatHeaderNome: { margin: 0, fontSize: '15px', fontWeight: '600', color: '#fff' },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' },
  messageRow: { display: 'flex', width: '100%' },
  balao: { padding: '8px 14px', maxWidth: '60%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  balaoTexto: { margin: 0, fontSize: '14.5px', color: '#fff', lineHeight: '1.45', wordBreak: 'break-word' },
  balaoMeta: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '3px', gap: '2px', opacity: 0.8 },
  balaoHora: { fontSize: '10px', color: '#707579' },
  inputAreaContainer: { padding: '14px 20px', background: '#17212b', position: 'relative' },
  inputForm: { display: 'flex', alignItems: 'center', gap: '12px' },
  midiaBtn: { background: 'none', border: 'none', color: '#707579', cursor: 'pointer', padding: '4px' },
  chatInputInput: { flex: 1, padding: '10px 14px', borderRadius: '12px', background: '#24303f', border: 'none', color: '#fff', fontSize: '14.5px', outline: 'none' },
  btnEnviar: { background: 'transparent', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' },
  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  circuloIcone: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(82, 136, 193, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  AvisoLinha: { textAlign: 'center', color: '#707579', fontSize: '13px', paddingTop: '20px' },
  autocompleteBox: { position: 'absolute', bottom: '72px', left: '20px', right: '20px', background: '#17212b', borderRadius: '14px', border: '1px solid #5288c1', boxShadow: '0 -4px 24px rgba(0,0,0,0.5)', zIndex: 10, overflow: 'hidden' },
  autocompleteHeader: { background: 'rgba(82, 136, 193, 0.1)', padding: '10px 14px', fontSize: '11px', color: '#5288c1', fontWeight: 'bold', textTransform: 'uppercase' },
  autocompleteItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid #101921' },
  atalhoTexto: { background: 'rgba(82, 136, 193, 0.2)', color: '#5288c1', padding: '2px 6px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold' },
  completoTexto: { color: '#e2e8f0', fontSize: '13px' }
};