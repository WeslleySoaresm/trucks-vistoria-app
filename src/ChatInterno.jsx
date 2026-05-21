import React, { useState, useEffect, useRef } from 'react';
import * as Ably from 'ably';
import { Search, Send, Mic, ImageIcon, Circle, Shield, User, Check, CheckCheck, Import } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

// CHAVE PÚBLICA GRATUITA DO ABLY (Substitua pela sua chave obtida em ably.com se preferir)
// Formato padrão da chave: "ID_DO_APP:SEGREDO"
const ABLY_KEY = Import.meta.env.VITE_ABLY_KEY

const tocarSomNotificacao = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(580, audioCtx.currentTime); // Frequência suave do Telegram
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (err) {
    console.warn("Áudio automático bloqueado pelo navegador. Interaja com a página primeiro.");
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

  let minhaEmpresa = usuarioLogado?.EmpresaNome || usuarioLogado?.empresaNome || "juniorcar";
  const meuId = usuarioLogado?.Id || usuarioLogado?.id || "";
  const meuEmail = usuarioLogado?.Email || usuarioLogado?.email || "";
  const meuNome = usuarioLogado?.Nome || usuarioLogado?.nome || "";
  const meuCargo = usuarioLogado?.TipoUsuario || usuarioLogado?.tipoUsuario || "";
  const minhaFoto = usuarioLogado?.FotoUrl || usuarioLogado?.fotoUrl || "";

  const [contatos, setContatos] = useState([]); 
  const [usuariosOnline, setUsuariosOnline] = useState({}); // Controla dinamicamente quem está ativo no WebSocket
  const [buscaContato, setBuscaContato] = useState('');
  const [novoTexto, setNovoTexto] = useState('');
  const [loadingContatos, setLoadingContatos] = useState(true);

  const mensagensEndRef = useRef(null);
  const ablyClientRef = useRef(null);
  const canalMensagensRef = useRef(null);
  const canalPresencaGlobalRef = useRef(null);

  // 1. INICIALIZAÇÃO DO ABLY E CONTROLE DE PRESENÇA EM TEMPO REAL
  useEffect(() => {
    if (!meuId) return;

    // Conecta ao serviço de WebSocket do Ably informando quem é o usuário atual
    const ably = new Ably.Realtime({
      key: ABLY_KEY,
      clientId: meuId
    });
    ablyClientRef.current = ably;

    // Canal global da empresa para monitorar quem está online/offline
    const canalPresenca = ably.channels.get(`presenca-${minhaEmpresa}`);
    canalPresencaGlobalRef.current = canalPresenca;

    // Entra no canal informando seu nome e foto para os colegas
    canalPresenca.presence.enter({ nome: meuNome, foto: minhaFoto });

    // Escuta quem entra, sai ou muda de status na empresa
    const atualizarPresenca = async () => {
      const membros = await canalPresenca.presence.get();
      const mapaOnline = {};
      membros.forEach(m => {
        mapaOnline[m.clientId] = true; // Se está na lista, está online
      });
      setUsuariosOnline(mapaOnline);
    };

    canalPresenca.presence.subscribe('enter', atualizarPresenca);
    canalPresenca.presence.subscribe('leave', atualizarPresenca);
    canalPresenca.presence.subscribe('update', atualizarPresenca);
    
    // Executa a primeira carga de presença
    atualizarPresenca();

    return () => {
      canalPresenca.presence.leave();
      ably.close();
    };
  }, [meuId, minhaEmpresa]);

  // 2. CARREGAR LISTA DE INTEGRANTES DO TIME
  useEffect(() => {
    const buscarContatos = async () => {
      setLoadingContatos(true);
      try {
        const response = await fetch(`${API_URL}/usuario?empresaNome=${encodeURIComponent(minhaEmpresa.trim())}`);
        if (!response.ok) throw new Error("Erro ao carregar time");
        const dados = await response.json();
        
        // Remove você mesmo da barra lateral de contatos
        const filtrados = dados.filter(u => {
          const uId = u.id || u.Id;
          const uEmail = u.email || u.Email;
          return uId !== meuId && uEmail?.toLowerCase() !== meuEmail?.toLowerCase();
        });

        setContatos(filtrados);
      } catch (err) {
        console.error("Erro ao processar contatos:", err);
      } finally {
        setLoadingContatos(false);
      }
    };

    if (minhaEmpresa) buscarContatos();
  }, [minhaEmpresa, meuId, meuEmail]);

  // 3. SELECIONAR CONVERSA E ABRIR CANAL PRIVADO (Evita duplicação de mensagens)
  const abrirConversa = async (contato) => {
    const cId = contato.id || contato.Id;
    setContatoAtivo(contato);
    setMensagens([]); // Limpa a tela anterior imediatamente para evitar fantasmas

    try {
      const response = await fetch(`${API_URL}/chat/sala?usuarioId2=${cId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaNome: minhaEmpresa.trim(), tipo: 'individual' })
      });
      
      if (!response.ok) throw new Error("Erro ao obter sala");
      const sala = await response.json();
      setSalaAtiva(sala);
      
      const sId = sala.id || sala.Id;
      const resMsg = await fetch(`${API_URL}/chat/mensagens/${sId}`);
      if (resMsg.ok) {
        const historico = await resMsg.json();
        setMensagens(historico || []);
      }
    } catch (err) {
      console.error("Erro ao inicializar sala de conversa:", err);
    }
  };

  // 4. ESCUTA EM TEMPO REAL ISOLADA VIA ABLY WEBSOCKET
  useEffect(() => {
    const sId = salaAtiva?.id || salaAtiva?.Id;
    if (!sId || !ablyClientRef.current) return;

    // Desinscreve do canal anterior se houver
    if (canalMensagensRef.current) {
      canalMensagensRef.current.unsubscribe();
    }

    // Assina o canal privado EXCLUSIVO desta sala
    const canalSala = ablyClientRef.current.channels.get(`sala-${sId}`);
    canalMensagensRef.current = canalSala;

    canalSala.subscribe('nova-mensagem', (message) => {
      const novaMsg = message.data;

      setMensagens(prev => {
        // Evita duplicar na tela se a mensagem já foi renderizada de forma otimista
        if (prev.some(m => (m.id || m.Id) === novaMsg.Id)) return prev;
        return [...prev, {
          id: novaMsg.Id,
          salaId: novaMsg.SalaId,
          remetenteId: novaMsg.RemetenteId,
          texto: novaMsg.Texto,
          dataEnvio: novaMsg.DataEnvio,
          visualizado: novaMsg.Visualizado
        }];
      });

      // Toca o som de notificação apenas se o remetente for o outro usuário
      if (novaMsg.RemetenteId !== meuId) {
        tocarSomNotificacao();
        fetch(`${API_URL}/chat/mensagens/visualizar/${novaMsg.Id}`, { method: 'POST' });
      }
    });

    return () => {
      canalSala.unsubscribe();
    };
  }, [salaAtiva, meuId, setMensagens]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 5. ENVIO INSTANTÂNEO COM ATUALIZAÇÃO OTIMISTA
  const enviarMensagem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const sId = salaAtiva?.id || salaAtiva?.Id;
    if (!novoTexto.trim() || !sId) return;

    const textoEnvio = novoTexto;
    setNovoTexto('');

    const idMensagemUnica = Math.random().toString(36).substring(7);

    const corpoMensagem = {
      Id: idMensagemUnica,
      SalaId: sId,
      RemetenteId: meuId,
      Texto: textoEnvio,
      DataEnvio: new Date().toISOString(),
      Visualizado: false
    };

    // Renderiza na tela na mesma hora (Estilo Telegram)
    setMensagens(prev => [...prev, {
      id: corpoMensagem.Id,
      salaId: corpoMensagem.SalaId,
      remetenteId: corpoMensagem.RemetenteId,
      texto: corpoMensagem.Texto,
      dataEnvio: corpoMensagem.DataEnvio,
      visualizado: corpoMensagem.Visualizado
    }]);

    // Publica no WebSocket do Ably para chegar instantaneamente na outra ponta
    if (canalMensagensRef.current) {
      canalMensagensRef.current.publish('nova-mensagem', corpoMensagem);
    }

    // Salva no seu banco de dados em segundo plano
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
      console.error("Erro ao persistir mensagem no banco:", err);
    }
  };

  const contatosFiltrados = contatos.filter(c => {
    const nome = c.nome || c.Nome || "";
    return nome.toLowerCase().includes(buscaContato.toLowerCase());
  });

  const contatoAtivoId = contatoAtivo?.id || contatoAtivo?.Id;
  const estaOnline = usuariosOnline[contatoAtivoId] === true;

  return (
    <div style={styles.chatContainer}>
      {/* SIDEBAR TELEGRAM PREMIUM */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.perfilLogado}>
            <div style={styles.avatarWrapper}>
              {minhaFoto ? (
                <img src={minhaFoto} alt="Eu" style={styles.avatarImagem} />
              ) : (
                <div style={styles.avatarFallback}>{meuNome?.substring(0,2).toUpperCase()}</div>
              )}
              <Circle size={10} fill="#00c73c" color="#17212b" style={styles.statusBadgeDot} />
            </div>
            <div>
              <span style={styles.nomePerfil}>{meuNome}</span>
              <span style={styles.cargoPerfil}>{meuCargo === 'gestor' ? 'Gestor Master' : 'Inspecionador'}</span>
            </div>
          </div>
          
          <div style={styles.searchBox}>
            <Search size={16} color="#707579" style={styles.searchIcon} />
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
            <p style={styles.AvisoLinha}>Sincronizando canais...</p>
          ) : contatosFiltrados.length === 0 ? (
            <p style={styles.AvisoLinha}>Nenhum membro ativo.</p>
          ) : (
            contatosFiltrados.map(c => {
              const cId = c.id || c.Id;
              const cNome = c.nome || c.Nome;
              const cFoto = c.fotoUrl || c.FotoUrl;
              const cCargo = c.tipoUsuario || c.TipoUsuario;
              const selecionado = contatoAtivoId === cId;
              
              // Verifica se o id do usuário está na lista de presença do WebSocket
              const ativoAgora = usuariosOnline[cId] === true;

              return (
                <div 
                  key={cId} 
                  onClick={() => abrirConversa(c)}
                  style={{
                    ...styles.contatoRow,
                    background: selecionado ? '#2b5278' : 'transparent'
                  }}
                >
                  <div style={styles.avatarWrapper}>
                    {cFoto ? (
                      <img src={cFoto} alt={cNome} style={styles.avatarImagem} />
                    ) : (
                      <div style={{...styles.avatarFallback, backgroundColor: selecionado ? '#182533' : '#24303f'}}>{cNome?.substring(0,2).toUpperCase()}</div>
                    )}
                    <Circle size={10} fill={ativoAgora ? '#00c73c' : '#8e8e93'} color={selecionado ? '#2b5278' : '#17212b'} style={styles.statusBadgeDot} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={styles.contatoNomeLinha}>
                      <span style={{...styles.contatoNome, color: '#fff'}}>{cNome}</span>
                      {cCargo === 'gestor' && <Shield size={12} color={selecionado ? '#fff' : '#5288c1'} />}
                    </div>
                    <span style={{
                      ...styles.contatoStatusTexto, 
                      color: ativoAgora ? '#5288c1' : '#707579'
                    }}>
                      {ativoAgora ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ÁREA DA CONVERSA ACTIVA */}
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
                <Circle size={10} fill={estaOnline ? '#00c73c' : '#8e8e93'} color="#17212b" style={styles.statusBadgeDot} />
              </div>
              <div>
                <h4 style={styles.chatHeaderNome}>{contatoAtivo.nome || contatoAtivo.Nome}</h4>
                <span style={{ 
                  fontSize: '13px', 
                  color: estaOnline ? '#5288c1' : '#707579',
                  fontWeight: '500' 
                }}>
                  {estaOnline ? 'online' : 'offline'}
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
                      background: euEnviei ? '#2b5278' : '#182533', // Cores originais do Telegram K Dark
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
                              <CheckCheck size={14} color="#5288c1" />
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
              <form onSubmit={enviarMensagem} style={styles.inputForm}>
                <button type="button" style={styles.midiaBtn}><ImageIcon size={20} /></button>
                <button type="button" style={styles.midiaBtn}><Mic size={20} /></button>
                <input 
                  type="text"
                  placeholder="Digite uma mensagem..."
                  value={novoTexto}
                  onChange={(e) => setNovoTexto(e.target.value)}
                  style={styles.chatInputInput}
                />
                <button type="submit" style={styles.btnEnviar}><Send size={16} color="#5288c1" /></button>
              </form>
            </div>
          </>
        ) : (
          <div style={styles.noChatSelected}>
            <div style={styles.circuloIcone}>
              <User size={36} color="#5288c1" />
            </div>
            <h3 style={{ color: '#fff', margin: '15px 0 5px 0', fontSize: '18px' }}>Nenhuma conversa activa</h3>
            <p style={{ color: '#707579', fontSize: '14px', maxWidth: '320px', lineHeight: '1.5', textAlign: 'center' }}>
              Selecione um inspecionador ou gestor ao lado para abrir o chat em tempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 🎨 DESIGN SYSTEM TELEGRAM ORIGINAL DARK
const styles = {
  chatContainer: { display: 'flex', width: '100%', height: '78vh', background: '#0e1621', borderRadius: '24px', overflow: 'hidden', border: '1px solid #101921', fontFamily: '"Inter", sans-serif' },
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
  messagesArea: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#0e1621' },
  messageRow: { display: 'flex', width: '100%' },
  balao: { padding: '8px 14px', maxWidth: '60%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  balaoTexto: { margin: 0, fontSize: '14.5px', color: '#fff', lineHeight: '1.45', wordBreak: 'break-word' },
  balaoMeta: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '3px', gap: '2px', opacity: 0.8 },
  balaoHora: { fontSize: '10px', color: '#707579' },
  inputAreaContainer: { padding: '14px 20px', background: '#17212b' },
  inputForm: { display: 'flex', alignItems: 'center', gap: '12px' },
  midiaBtn: { background: 'none', border: 'none', color: '#707579', cursor: 'pointer', padding: '4px' },
  chatInputInput: { flex: 1, padding: '10px 14px', borderRadius: '12px', background: '#24303f', border: 'none', color: '#fff', fontSize: '14.5px', outline: 'none' },
  btnEnviar: { background: 'transparent', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' },
  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  circuloIcone: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(82, 136, 193, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  AvisoLinha: { textAlign: 'center', color: '#707579', fontSize: '13px', paddingTop: '20px' }
};