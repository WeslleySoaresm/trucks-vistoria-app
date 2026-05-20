import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import EsqueciSenha from './EsqueciSenha'; 
import FormVistoria from './FormVistoria';
import Dashboard from './Dashboard';
import DashboardFuncionario from './DashboardFuncionario';
import HistoricoVistorias from './HistoricoVistorias'; 
import Instrucoes from './Instrucoes';
import { LogOut, LayoutDashboard, ClipboardList, Trophy, HelpCircle, History, Database, Car, MessageSquare, UserPlus } from 'lucide-react'; 
import DashboardGestor from './DashboardGestor';
import CheckCar from './CheckCar';
import ChatInterno from './ChatInterno'; 
import FormCadastroUsuario from './FormCadastroUsuario';

export default function App() {
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('nova');
  const [telaRecuperacao, setTelaRecuperacao] = useState(false); 
  
  // 💾 ESTADO PARA O PERFIL OFICIAL DO POSTGRESQL (Evita injeções e gambiarras)
  const [perfilDb, setPerfilDb] = useState(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);

  const [modoAtualizarSenha, setModoAtualizarSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const emailAdmin = import.meta.env.VITE_EMAIL_AD || "";

  // 1. Ciclo de Vida: Monitoramento da Sessão de Autenticação
  useEffect(() => {
    document.documentElement.classList.add('notranslate');
    document.documentElement.setAttribute('lang', 'pt-BR');

    const meta = document.createElement('meta');
    meta.name = "google";
    meta.content = "notranslate";
    document.head.appendChild(meta);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (event === 'SIGNED_OUT') {
        setPerfilDb(null); // Limpa o estado ao deslogar
      }

      if (event === 'PASSWORD_RECOVERY') {
        setModoAtualizarSenha(true);
      }
    });

    return () => {
      document.documentElement.classList.remove('notranslate');
      if (document.head.contains(meta)) {
        document.head.removeChild(meta);
      }
      subscription.unsubscribe();
    };
  }, []);

  // 2. Sincronização Arquitetural: Busca o Perfil Real no Banco Local pelo E-mail logado
  useEffect(() => {
    async function carregarPerfilUsuario() {
      if (!session?.user?.email) return;

      setCarregandoPerfil(true);
      try {
        const emailSanitizado = session.user.email.toLowerCase().trim();
        // Chamada ao novo endpoint limpo da API
        const response = await fetch(`https://trucks-vistoria-app-1.onrender.com/api/usuario/perfil?email=${emailSanitizado}`);
        
        if (response.ok) {
          const dadosUsuario = await response.json();
          setPerfilDb(dadosUsuario);
        } else {
          console.warn("Usuário autenticado, mas não localizado na base local do PostgreSQL.");
        }
      } catch (error) {
        console.error("Erro de conexão ao sincronizar perfil com a API local:", error);
      } finally {
        setCarregandoPerfil(false);
      }
    }

    carregarPerfilUsuario();
  }, [session]);

  const handleAtualizarSenha = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setAtualizando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      alert("Senha updated com sucesso!");
      setModoAtualizarSenha(false);
      setNovaSenha('');
    } catch (error) {
      alert("Erro ao atualizar senha: " + error.message);
    } finally {
      setAtualizando(false);
    }
  };

  if (loading) return <div style={s.loadingScreen}>Iniciando sistema...</div>;
  if (carregandoPerfil) return <div style={s.loadingScreen}>Sincronizando dados com o servidor...</div>;

  if (modoAtualizarSenha) {
    return (
      <div style={s.loadingScreen}>
        <form onSubmit={handleAtualizarSenha} style={{ background: 'rgba(30, 41, 59, 0.95)', padding: '30px', borderRadius: '20px', maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ marginBottom: '10px', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>Definir Nova Senha</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>Digite a sua nova senha de acesso abaixo.</p>
          <input
            type="password"
            placeholder="No mínimo 6 caracteres"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0f172a', color: '#fff', marginBottom: '20px', boxSizing: 'border-box', fontSize: '15px', outline: 'none' }}
          />
          <button type="submit" disabled={atualizando} style={{ width: '100%', padding: '14px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            {atualizando ? "SALVANDO..." : "ATUALIZAR SENHA"}
          </button>
        </form>
      </div>
    );
  }

  if (!session) {
    if (telaRecuperacao) {
      return <EsqueciSenha aoVoltar={() => setTelaRecuperacao(false)} />;
    }
    return <Login aoEsquecerSenha={() => setTelaRecuperacao(true)} />;
  }

  const userEmail = session?.user?.email ? session.user.email.toLowerCase().trim() : "";
  
  // 🔐 Validação de Regras Administrativas baseadas no perfil real retornado do banco
  const isAdmin = perfilDb 
    ? (perfilDb.tipoUsuario?.toLowerCase() === 'admin' || perfilDb.cargo?.toLowerCase() === 'admin' || perfilDb.tipoUsuario?.toLowerCase() === 'gestor')
    : (userEmail === (emailAdmin ? emailAdmin.toLowerCase().trim() : ""));

  return (
    <div style={s.appWrapper}>
      {/* HEADER PREMIUM */}
      <header style={s.header}>
        <div style={s.userInfo}>
          <span style={{ 
            ...s.badge, 
            backgroundColor: isAdmin ? '#d4af37' : '#3182ce',
            boxShadow: isAdmin ? '0 0 10px rgba(212, 175, 55, 0.3)' : '0 0 10px rgba(49, 130, 206, 0.3)'
          }}>
            {isAdmin ? "GESTOR" : "EQUIPE"}
          </span>
          <span style={s.userEmailText}>
            {userEmail} {perfilDb?.empresaNome ? `(${perfilDb.empresaNome.toUpperCase()})` : ''}
          </span>
        </div>
        
        <button 
          onClick={async () => await supabase.auth.signOut()} 
          style={s.btnLogout}
        >
          <LogOut size={16} />
          Sair
        </button>
      </header>

      {/* NAVEGAÇÃO ESTILO TABS MODERNAS */}
      <nav style={s.nav}>
        <button 
          onClick={() => setAbaAtiva('nova')} 
          style={abaAtiva === 'nova' ? s.tabActive : s.tab}
        >
          <ClipboardList size={18} />
          Nova
        </button>

        {isAdmin ? (
          <>
            <button 
              onClick={() => setAbaAtiva('admin')} 
              style={abaAtiva === 'admin' ? s.tabActive : s.tab}
            >
              <LayoutDashboard size={18} />
              Painel
            </button>
            
            <button 
              onClick={() => setAbaAtiva('dados')} 
              style={abaAtiva === 'dados' ? s.tabActive : s.tab}
            >
              <Database size={18} />
              Gestão Dados
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setAbaAtiva('meta')} 
              style={abaAtiva === 'meta' ? s.tabActive : s.tab}
            >
              <Trophy size={18} />
              Meta
            </button>
            <button 
              onClick={() => setAbaAtiva('historico')} 
              style={abaAtiva === 'historico' ? s.tabActive : s.tab}
            >
              <History size={18} />
              Histórico
            </button>
          </>
        )}
        
        <button onClick={() => setAbaAtiva('checkcar')} style={abaAtiva === 'checkcar' ? s.tabActive : s.tab}>
          <Car size={18} /> CheckCar
        </button>

        {/* ABA DO CHAT: Visível para toda a operação mapeada */}
        <button 
          onClick={() => setAbaAtiva('chat')} 
          style={abaAtiva === 'chat' ? s.tabActive : s.tab}
        >
          <MessageSquare size={18} />
          Chat Interno
        </button>

        {/* 🔒 ABA EXCLUSIVA DO DESENVOLVEDOR MASTER */}
        {userEmail === "correweslleysoares@gmail.com" && (
          <button 
            onClick={() => setAbaAtiva('dev_cadastro')} 
            style={abaAtiva === 'dev_cadastro' ? s.tabActive : s.tab}
          >
            <UserPlus size={18} />
            Cadastrar Usuário
          </button>
        )}

        <button 
          onClick={() => setAbaAtiva('ajuda')} 
          style={abaAtiva === 'ajuda' ? s.tabActive : s.tab}
        >
          <HelpCircle size={18} />
          Ajuda
        </button>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={s.mainContent}>
        {abaAtiva === 'nova' && <FormVistoria user={session.user} />}

        {abaAtiva === 'admin' && isAdmin && (
          <div key="admin-view">
            <DashboardGestor />
          </div>
        )}

        {abaAtiva === 'dados' && isAdmin && (
          <div key="dados-view">
            <Dashboard />
          </div>
        )}
        
        {abaAtiva === 'checkcar' && <CheckCar user={session.user} />}
        
        {abaAtiva === 'meta' && !isAdmin && <DashboardFuncionario user={session.user} />}

        {abaAtiva === 'historico' && !isAdmin && (
          <HistoricoVistorias user={session.user} />
        )}

        {/* RENDERING DO CHAT UTILIZANDO O CONTEXTO DO PROVEDOR LOCAL DO POSTGRES */}
        {abaAtiva === 'chat' && perfilDb && (
          <ChatInterno 
            usuarioLogado={perfilDb} 
            conversaAtivaId={conversaAtivaId}
            setConversaAtivaId={setConversaAtivaId}
           />
        )}

        {/* 🔒 RENDERIZAÇÃO EXCLUSIVA DO FORMULÁRIO DE CADASTRO */}
        {abaAtiva === 'dev_cadastro' && userEmail === "correweslleysoares@gmail.com" && (
          <FormCadastroUsuario />
        )}
        
        {abaAtiva === 'ajuda' && <Instrucoes />}
      </main>
    </div>
  );
}

const s = {
  appWrapper: { minHeight: '100vh', backgroundColor: '#1a202c', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif' },
  loadingScreen: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a202c', color: '#fff', fontSize: '18px' },
  header: { background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 },
  userInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  userEmailText: { color: '#a0aec0', fontSize: '13px', fontWeight: '500' },
  badge: { fontSize: '10px', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: '900', width: 'fit-content', letterSpacing: '0.5px' },
  btnLogout: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  nav: { display: 'flex', background: 'rgba(30, 41, 59, 0.5)', padding: '8px', margin: '15px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', gap: '8px', overflowX: 'auto' },
  tab: { flex: 1, padding: '12px', border: 'none', background: 'transparent', color: '#718096', fontWeight: '700', cursor: 'pointer', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', transition: 'all 0.3s', minWidth: '60px' },
  tabActive: { flex: 1, padding: '12px', border: 'none', background: '#3182ce', color: '#fff', fontWeight: '700', cursor: 'pointer', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', boxShadow: '0 4px 15px rgba(49, 130, 206, 0.4)', transition: 'all 0.3s', minWidth: '60px' },
  mainContent: { padding: '0 15px 30px 15px', flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }
};