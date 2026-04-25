import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, Mail, Loader2 } from 'lucide-react'; // Ícones para um ar mais premium

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
    } catch (error) {
      alert("Erro ao entrar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.glassCard}>
        
        {/* LOGO AJUSTADA - Removido o círculo restritivo */}
        <div style={styles.logoContainer}>
          <img 
            src="/public/logoInicial.png" 
            alt="TruckVistoria Logo" 
            style={styles.logoImg} 
          />
        </div>

        <div style={styles.headerText}>
          
          <p style={styles.subtitle}>Gestão de frotas e vistorias técnicas</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail Institucional</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Senha de Acesso</label>
              <span style={styles.forgotPass}>Esqueceu a senha?</span>
            </div>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={loading ? styles.buttonDisabled : styles.button}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={styles.spin} />
                <span>Verificando...</span>
              </>
            ) : (
              "ENTRAR NO SISTEMA"
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>© 2026 TruckVistoria Pro - v2.4.0</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#1a202c',
    backgroundImage: 'radial-gradient(circle at top right, #2d3748, #1a202c)',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '40px 30px',
    borderRadius: '28px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  logoImg: {
    width: '160px', // Aumentado para dar destaque ao escudo
    height: 'auto',
    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))',
  },
  headerText: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: { 
    margin: '0', 
    color: '#fff', 
    fontSize: '26px', 
    fontWeight: '800',
    letterSpacing: '-0.5px'
  },
  subtitle: { 
    margin: '5px 0 0 0', 
    color: '#94a3b8', 
    fontSize: '14px',
  },
  form: { width: '100%' },
  inputGroup: { marginBottom: '20px' },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  label: { 
    color: '#cbd5e0', 
    fontWeight: '600', 
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#718096'
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 45px', // Espaço para o ícone
    borderRadius: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxSizing: 'border-box',
    fontSize: '15px',
    color: '#fff',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  forgotPass: {
    color: '#63b3ed',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  button: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '15px',
    marginTop: '10px',
    boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px'
  },
  buttonDisabled: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#4a5568',
    color: '#a0aec0',
    border: 'none',
    borderRadius: '14px',
    cursor: 'not-allowed',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px'
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '20px'
  },
  footerText: {
    color: '#718096',
    fontSize: '11px',
    opacity: 0.8
  },
  spin: {
    animation: 'spin 1s linear infinite',
  }
};

