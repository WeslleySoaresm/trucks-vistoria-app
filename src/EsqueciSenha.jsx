import React, { useState } from 'react';
import { supabase } from './supabaseClient'; // Importa seu cliente configurado
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export default function EsqueciSenha({ aoVoltar }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificacao, setNotificacao] = useState({ exibir: false, tipo: '', mensagem: '' });

  const dispararNotificacao = (tipo, mensagem) => {
    setNotificacao({ exibir: true, tipo, mensagem });
    setTimeout(() => {
      setNotificacao({ exibir: false, tipo: '', mensagem: '' });
    }, 4000);
  };

  const lidarComRecuperacao = async (e) => {
    e.preventDefault();
    if (!email) {
      dispararNotificacao('erro', 'Por favor, insira o seu e-mail.');
      return;
    }

    setLoading(true);

    try {
      // O Supabase envia um e-mail com um token de recuperação.
      // Substitua a URL abaixo pela URL oficial onde seu app roda (ex: Vercel)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://trucks-vistoria-app.vercel.app/atualizar-senha',
      });

      if (error) throw error;

      dispararNotificacao('sucesso', 'E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setEmail('');
    } catch (err) {
      console.error(err);
      dispararNotificacao('erro', err.message || 'Erro ao processar a solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* TOAST NOTIFICAÇÃO */}
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

      {/* CONTAINER DO FORMULÁRIO */}
      <div style={styles.cardContainer}>
        <button onClick={aoVoltar} style={styles.btnVoltar}>
          <ArrowLeft size={16} /> Voltar para o Login
        </button>

        <h2 style={styles.titulo}>Recuperar Senha</h2>
        <p style={styles.subtitulo}>
          Insira o e-mail cadastrado na sua conta. Enviaremos um link seguro para você definir uma nova senha.
        </p>

        <form onSubmit={lidarComRecuperacao} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail Institucional / Funcionário</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@exemplo.com"
              disabled={loading}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.btnEnviar}>
            {loading ? (
              <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
            ) : (
              'ENVIAR LINK DE RECUPERAÇÃO'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: { position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backgroundColor: '#1a202c', minHeight: '100vh', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif' },
  toastContainerCentral: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 12500 },
  toastBox: { padding: '16px 28px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '90%', pointerEvents: 'auto' },
  toastText: { color: '#fff', fontWeight: '800', fontSize: '14px', letterSpacing: '0.2px', textAlign: 'center' },
  cardContainer: { background: 'rgba(30, 41, 59, 0.95)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '450px', width: '100%', boxSizing: 'border-box' },
  btnVoltar: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#63b3ed', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '20px', fontWeight: '600' },
  titulo: { color: '#fff', fontSize: '24px', margin: '0 0 10px 0', fontWeight: 'bold' },
  subtitulo: { color: '#94a3b8', fontSize: '14px', margin: '0 0 25px 0', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#cbd5e0', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
  input: { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontSize: '15px', outline: 'none', transition: 'border 0.2s' },
  btnEnviar: { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3182ce', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }
};