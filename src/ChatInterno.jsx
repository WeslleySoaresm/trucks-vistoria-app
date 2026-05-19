import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Search, Send, Mic, Image, Circle, Shield, User, Zap } from 'lucide-react';
import { tocarSomNotificacao, vibrarDispositivo } from './chatUtils';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

export default function ChatInterno({ usuarioLogado }) {
  // Estados de dados
  const [contatos, setContatos] = useState([]); // Lista de funcionários/gestores da empresa
  const [buscaContato, setBuscaContato] = useState('');
  const [salaAtiva, setSalaAtiva] = useState(null);
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [loadingContatos, setLoadingContatos] = useState(true);

  // Estados do Autocomplete (Sugestões Rápidas)
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [indiceSugestaoAtiva, setIndiceSugestaoAtiva] = useState(0);

  const mensagensEndRef = useRef(null);

  // 1. CARREGAR CONTATOS DA MESMA EMPRESA (Isolamento Multi-tenant)
  useEffect(() => {
    const buscarContatos = async () => {
      setLoadingContatos(true);
      try {
        // Puxa todos os usuários que pertencem ao mesmo EmpresaId do usuário logado
        const response = await fetch(`${API_URL}/Usuario?empresaId=${usuarioLogado.empresaId}`);
        if (!response.ok) throw new Error("Erro ao buscar time");
        const dados = await response.json();
        
        // Remove o próprio usuário logado da lista de contatos para ele não conversar consigo mesmo
        const filtrados = dados.filter(u => u.id !== usuarioLogado.id);
        setContatos(filtrados);
      } catch (err) {
        console.error("Erro ao carregar contatos do chat:", err);
      } finally {
        setLoadingContatos(false);
      }
    };

    buscarContatos();
  }, [usuarioLogado.empresaId, usuarioLogado.id]);

  // 2. ALGORITMO DO AUTOCOMPLETE (Disparado em tempo real no input)
  useEffect(() => {
    if (novoTexto.startsWith('/')) {
      const termoBusca = novoTexto.toLowerCase();
      
      // Busca as frases no endpoint C# de alta performance
      fetch(`${API_URL}/Chat/sugestoes/${usuarioLogado.empresaId}?termo=${termoBusca}`)
        .then(res => res.json())
        .then(dados => {
          setSugestoes(dados);
          setMostrarSugestoes(dados.length > 0);
        })
        .catch(err => console.error("Erro no autocomplete:", err));
    } else {
      setMostrarSugestoes(false);
    }
  }, [novoTexto, usuarioLogado.empresaId]);

  // 3. SELECIONAR OU CRIAR UMA SALA AO CLICAR EM UM CONTATO
  const abrirConversa = async (contato) => {
    setContatoAtivo(contato);
    try {
      // Chama o endpoint C# que criamos para buscar a sala existente ou criar uma nova
      const response = await fetch(`${API_URL}/Chat/sala?usuarioId2=${contato.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: usuarioLogado.empresaId,
          tipo: 'individual'
        })
      });
      const sala = await response.json();
      setSalaAtiva(sala);
      
      // Carrega o histórico de mensagens inicial da sala
      const resMsg = await fetch(`${API_URL}/Chat/mensagens/${sala.id}`);
      if (resMsg.ok) {
        const historico = await resMsg.json();
        setMensagens(historico);
      }
    } catch (err) {
      console.error("Erro ao inicializar sala de chat:", err);
    }
  };

  // 4. LÓGICA DE ESCUTA REALTIME DO SUPABASE (Ouvindo o PostgreSQL)
  useEffect(() => {
    if (!salaAtiva) return;

    const canalRealtime = supabase
      .channel(`sala-${salaAtiva.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'MobileTrucks', table: 'ChatMensagens', filter: `SalaId=eq.${salaAtiva.id}` },
        (payload) => {
          const novaMsg = payload.new;
          
          // Evita duplicar na tela a mensagem que o próprio usuário acabou de enviar
          setMensagens(prev => {
            if (prev.some(m => m.id === novaMsg.Id)) return prev;
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
          
          // SE A MENSAGEM FOR DA OUTRA PESSOA: Toca som e vibra o celular na hora!
          if (novaMsg.RemetenteId !== usuarioLogado.id) {
            tocarSomNotificacao();
            vibrarDispositivo();
            
            // Notifica o backend via EF que a mensagem foi aberta e visualizada
            fetch(`${API_URL}/Chat/mensagens/visualizar/${novaMsg.Id}`, { method: 'POST' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, [salaAtiva, usuarioLogado.id]);

  // Rola a tela para a última mensagem de forma suave
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 5. ENVIAR MENSAGEM
  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!novoTexto.trim() || !salaAtiva) return;

    const payloadMensagem = {
      salaId: salaAtiva.id,
      remetenteId: usuarioLogado.id,
      texto: novoTexto,
      tipoMidia: 'texto'
    };

    try {
      setNovoTexto('');
      setMostrarSugestoes(false);

      // Envia via API .NET que persiste no Postgres e engatilha o Supabase Realtime
      await fetch(`${API_URL}/Chat/mensagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadMensagem)
      });
    } catch (err) {
      console.error("Erro ao disparar mensagem:", err);
    }
  };

  const selecionarSugestao = (sugestao) => {
    setNovoTexto(sugestao.textoCompleto);
    setMostrarSugestoes(false);
    fetch(`${API_URL}/Chat/sugestoes/computar-uso/${sugestao.id}`, { method: 'POST' });
  };

  // Filtra os contatos digitados na busca lateral
  const contatosFiltrados = contatos.filter(c => 
    c.nome.toLowerCase().includes(buscaContato.toLowerCase())
  );

  // Retorna a cor exata baseado no status real do banco de dados
  const obterCorStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return '#48bb78';  // Verde
      case 'pausa': return '#ed8936';   // Laranja
      case 'offline': return '#e53e3e';  // Vermelho
      default: return '#a0aec0';
    }
  };

  return (
    <div style={styles.chatContainer}>
      
      {/* BARRA LATERAL: LISTA DE CONTATOS */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.perfilLogado}>
            <div style={styles.avatarWrapper}>
              {usuarioLogado.fotoUrl ? (
                <img src={usuarioLogado.fotoUrl} alt="Eu" style={styles.avatarImagem} />
              ) : (
                <div style={styles.avatarFallback}>{usuarioLogado.nome?.substring(0,2).toUpperCase()}</div>
              )}
              <Circle size={12} fill={obterCorStatus(usuarioLogado.statusPresenca)} color="#1e293b" style={styles.statusBadgeDot} />
            </div>
            <div>
              <span style={styles.nomePerfil}>{usuarioLogado.nome}</span>
              <span style={styles.cargoPerfil}>{usuarioLogado.tipoUsuario === 'gestor' ? 'Gestor Master' : 'Inspecionador'}</span>
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
          ) : contatosFiltrados.map(c => (
            <div 
              key={c.id} 
              onClick={() => abrirConversa(c)}
              style={{
                ...styles.contatoRow,
                background: contatoAtivo?.id === c.id ? 'rgba(99, 179, 237, 0.1)' : 'transparent'
              }}
            >
              <div style={styles.avatarWrapper}>
                {c.fotoUrl ? (
                  <img src={c.fotoUrl} alt={c.nome} style={styles.avatarImagem} />
                ) : (
                  <div style={styles.avatarFallback}>{c.nome.substring(0,2).toUpperCase()}</div>
                )}
                <Circle size={12} fill={obterCorStatus(c.statusPresenca)} color="#1e293b" style={styles.statusBadgeDot} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.contatoNomeLinha}>
                  <span style={styles.contatoNome}>{c.nome}</span>
                  {c.tipoUsuario === 'gestor' && <Shield size={12} color="#63b3ed" title="Gestor" />}
                </div>
                <span style={styles.contatoStatusTexto}>{c.statusPresenca}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* JANELA PRINCIPAL DA CONVERSA */}
      <div style={styles.chatArea}>
        {salaAtiva && contatoAtivo ? (
          <>
            {/* TOPO DA CONVERSA ATIVA */}
            <div style={styles.chatHeader}>
              <div style={styles.avatarWrapper}>
                {contatoAtivo.fotoUrl ? (
                  <img src={contatoAtivo.fotoUrl} alt={contatoAtivo.nome} style={styles.avatarImagem} />
                ) : (
                  <div style={styles.avatarFallback}>{contatoAtivo.nome.substring(0,2).toUpperCase()}</div>
                )}
                <Circle size={12} fill={obterCorStatus(contatoAtivo.statusPresenca)} color="#1e293b" style={styles.statusBadgeDot} />
              </div>
              <div>
                <h4 style={styles.chatHeaderNome}>{contatoAtivo.nome}</h4>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {contatoAtivo.tipoUsuario === 'gestor' ? 'Gestor Corporativo' : 'Colaborador Equipe'}
                </span>
              </div>
            </div>

            {/* ÁREA HISTÓRICO DE BALÕES */}
            <div style={styles.messagesArea}>
              {mensagens.map((msg, index) => {
                const euEnviei = msg.remetenteId === usuarioLogado.id;
                return (
                  <div key={msg.id || index} style={{ ...styles.messageRow, justifyContent: euEnviei ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      ...styles.balao,
                      background: euEnviei ? '#2563eb' : '#334155',
                      borderRadius: euEnviei ? '16px 16px 2px 16px' : '16px 16px 16px 2px'
                    }}>
                      <p style={styles.balaoTexto}>{msg.texto}</p>
                      <div style={styles.balaoMeta}>
                        <span style={styles.balaoHora}>
                          {msg.dataEnvio ? new Date(msg.dataEnvio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                        
                        {/* REGRA DOS RAIOS SOLICITADA */}
                        {euEnviei && (
                          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                            {msg.visualizado ? (
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

            {/* INPUT DE ENVIO + CAIXA DE AUTOCOMPLETE FLUTUANTE */}
            <div style={styles.inputAreaContainer}>
              
              {/* MENU DO AUTOCOMPLETE FLUTUANTE */}
              {mostrarSugestoes && (
                <div style={styles.autocompleteBox}>
                  <div style={styles.autocompleteHeader}>Sugestões de eficiência</div>
                  {sugestoes.map((sug, idx) => (
                    <div 
                      key={sug.id} 
                      onClick={() => selecionarSugestao(sug)}
                      style={styles.autocompleteItem}
                    >
                      <span style={styles.atalhoTexto}>{sug.textoCurto}</span>
                      <span style={styles.completoTexto}>{sug.textoCompleto}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={enviarMensagem} style={styles.inputForm}>
                <button type="button" style={styles.midiaBtn} title="Enviar Foto"><Image size={20} /></button>
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
            <h3>Nenhuma conversa ativa</h3>
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
  
  // ESTILOS EXCLUSIVOS DO MENU FLUTUANTE DE AUTOCOMPLETE
  autocompleteBox: { position: 'absolute', bottom: '75px', left: '20px', right: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #3b82f6', boxShadow: '0 -4px 20px rgba(0,0,0,0.4)', zIndex: 10, overflow: 'hidden' },
  autocompleteHeader: { background: 'rgba(59, 130, 246, 0.1)', padding: '8px 14px', fontSize: '11px', color: '#63b3ed', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  autocompleteItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' },
  atalhoTexto: { background: 'rgba(99, 179, 237, 0.15)', color: '#63b3ed', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' },
  completoTexto: { color: '#e2e8f0', fontSize: '13px' }
};