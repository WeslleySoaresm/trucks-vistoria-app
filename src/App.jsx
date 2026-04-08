import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import FormVistoria from './FormVistoria';
import Dashboard from './Dashboard';
import DashboardFuncionario from './DashboardFuncionario';
import Instrucoes from './Instrucoes'; // Com I maiúsculo

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

  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Iniciando...</div>;
  if (!session) return <Login />;

  // Proteção contra undefined
  const userEmail = session?.user?.email ? session.user.email.toLowerCase().trim() : "";
  const adminCheck = emailAdmin ? emailAdmin.toLowerCase().trim() : "";
  const isAdmin = userEmail === adminCheck;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#333', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '10px', background: isAdmin ? '#d4af37' : '#007bff', padding: '2px 6px', borderRadius: '4px', display: 'block', width: 'fit-content' }}>
            {isAdmin ? "GESTOR" : "EQUIPE"}
          </span>
          <span style={{ fontSize: '12px' }}>{userEmail}</span>
        </div>
        <button 
  onClick={async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Erro ao sair:", error.message);
  }} 
  style={{ 
    background: '#ff4d4d', 
    color: '#fff', 
    border: 'none', 
    padding: '8px 12px', 
    borderRadius: '4px', 
    cursor: 'pointer',
    fontWeight: 'bold'
  }}
>
  Sair
</button>
      </header>

      <nav style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #ddd' }}>
        <button onClick={() => setAbaAtiva('nova')} style={{ flex: 1, padding: '15px', border: 'none', borderBottom: abaAtiva === 'nova' ? '3px solid #007bff' : 'none', color: abaAtiva === 'nova' ? '#007bff' : '#666', fontWeight: 'bold', background: 'none' }}>📝 Nova</button>
        {isAdmin ? (
          <button onClick={() => setAbaAtiva('admin')} style={{ flex: 1, padding: '15px', border: 'none', borderBottom: abaAtiva === 'admin' ? '3px solid #007bff' : 'none', color: abaAtiva === 'admin' ? '#007bff' : '#666', fontWeight: 'bold', background: 'none' }}>👑 Painel</button>
        ) : (
          <button onClick={() => setAbaAtiva('meta')} style={{ flex: 1, padding: '15px', border: 'none', borderBottom: abaAtiva === 'meta' ? '3px solid #007bff' : 'none', color: abaAtiva === 'meta' ? '#007bff' : '#666', fontWeight: 'bold', background: 'none' }}>🏆 Meta</button>
        )}
        <button onClick={() => setAbaAtiva('ajuda')} style={abaAtiva === 'ajuda' ? styles.tabActive : styles.tab}>
          ❓ Ajuda
        </button>
      </nav>

      <main style={{ padding: '15px', flex: 1 }}>
        {/* Se a aba for nova, mostra o formulário */}
        {abaAtiva === 'nova' && <FormVistoria user={session.user} />}

        {/* Se a aba for admin E o usuário for gestor, mostra o dashboard */}
        {abaAtiva === 'admin' && isAdmin && (
          <div key="admin-view">
            <Dashboard />
          </div>
        )}

        {/* Se a aba for meta E NÃO for gestor, mostra a meta do funcionário */}
        {abaAtiva === 'meta' && !isAdmin && <DashboardFuncionario user={session.user} />}

        {abaAtiva === 'ajuda' && <Instrucoes />} {/* Nova Aba */}
      </main>
      
    </div>

    
  );


  
}

// Adicione isso ao final do arquivo App.jsx
const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '20px',
    padding: '10px',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  },
  tab: { 
    padding: '10px 15px', 
    border: 'none', 
    background: '#f0f0f0', 
    cursor: 'pointer',
    borderRadius: '8px',
    fontWeight: 'bold',
    color: '#666'
  },
  tabActive: { 
    padding: '10px 15px', 
    border: 'none', 
    background: '#007bff', 
    color: '#fff', 
    cursor: 'pointer',
    borderRadius: '8px',
    fontWeight: 'bold'
  }
};