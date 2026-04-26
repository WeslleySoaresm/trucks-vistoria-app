import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import FormVistoria from './FormVistoria';
import Dashboard from './Dashboard';
import DashboardFuncionario from './DashboardFuncionario';
import HistoricoVistorias from './HistoricoVistorias'; // 1. IMPORTANTE: Importe o novo componente aqui
import Instrucoes from './Instrucoes';
import { LogOut, LayoutDashboard, ClipboardList, Trophy, HelpCircle, History } from 'lucide-react'; // Adicionado History icon
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('nova');
  const emailAdmin = import.meta.env.VITE_EMAIL_AD || "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={s.loadingScreen}>Iniciando sistema...</div>;
  if (!session) return <Login />;

  const userEmail = session?.user?.email ? session.user.email.toLowerCase().trim() : "";
  const adminCheck = emailAdmin ? emailAdmin.toLowerCase().trim() : "";
  const isAdmin = userEmail === adminCheck;

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
          <span style={s.userEmailText}>{userEmail}</span>
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
          <button 
            onClick={() => setAbaAtiva('admin')} 
            style={abaAtiva === 'admin' ? s.tabActive : s.tab}
          >
            <LayoutDashboard size={18} />
            Painel
          </button>
        ) : (
          <>
            <button 
              onClick={() => setAbaAtiva('meta')} 
              style={abaAtiva === 'meta' ? s.tabActive : s.tab}
            >
              <Trophy size={18} />
              Meta
            </button>
            {/* 2. BOTÃO DA NOVA ABA DE HISTÓRICO */}
            <button 
              onClick={() => setAbaAtiva('historico')} 
              style={abaAtiva === 'historico' ? s.tabActive : s.tab}
            >
              <History size={18} />
              Histórico
            </button>
          </>
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
            <Dashboard />
          </div>
        )}

        {abaAtiva === 'meta' && !isAdmin && <DashboardFuncionario user={session.user} />}

        {/* 3. RENDERIZAÇÃO DA ABA DE HISTÓRICO */}
        {abaAtiva === 'historico' && !isAdmin && (
          <HistoricoVistorias user={session.user} />
        )}

        {abaAtiva === 'ajuda' && <Instrucoes />}
      </main>
      <SpeedInsights />
    </div>
  );
}

// OBJETO DE ESTILOS "PREMIUM DARK"
const s = {
  appWrapper: { 
    minHeight: '100vh', 
    backgroundColor: '#1a202c', 
    display: 'flex', 
    flexDirection: 'column', 
    fontFamily: '"Inter", sans-serif' 
  },
  loadingScreen: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a202c',
    color: '#fff',
    fontSize: '18px'
  },
  header: { 
    background: 'rgba(30, 41, 59, 0.8)', 
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '12px 20px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  userInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  userEmailText: { color: '#a0aec0', fontSize: '13px', fontWeight: '500' },
  badge: { 
    fontSize: '10px', 
    color: '#fff', 
    padding: '2px 8px', 
    borderRadius: '6px', 
    fontWeight: '900',
    width: 'fit-content',
    letterSpacing: '0.5px'
  },
  btnLogout: { 
    background: 'rgba(239, 68, 68, 0.1)', 
    color: '#ef4444', 
    border: '1px solid rgba(239, 68, 68, 0.2)', 
    padding: '8px 16px', 
    borderRadius: '10px', 
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  nav: { 
    display: 'flex', 
    background: 'rgba(30, 41, 59, 0.5)', 
    padding: '8px',
    margin: '15px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    gap: '8px',
    overflowX: 'auto' // Permite scroll se os botões ficarem apertados no celular
  },
  tab: { 
    flex: 1, 
    padding: '12px', 
    border: 'none', 
    background: 'transparent', 
    color: '#718096', 
    fontWeight: '700', 
    cursor: 'pointer',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column', // Empilha ícone e texto para ganhar espaço
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '11px', // Fonte menor para caber 4 itens
    transition: 'all 0.3s',
    minWidth: '60px'
  },
  tabActive: { 
    flex: 1, 
    padding: '12px', 
    border: 'none', 
    background: '#3182ce', 
    color: '#fff', 
    fontWeight: '700', 
    cursor: 'pointer',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '11px',
    boxShadow: '0 4px 15px rgba(49, 130, 206, 0.4)',
    transition: 'all 0.3s',
    minWidth: '60px'
  },
  mainContent: { 
    padding: '0 15px 30px 15px', 
    flex: 1,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box'
  }
};