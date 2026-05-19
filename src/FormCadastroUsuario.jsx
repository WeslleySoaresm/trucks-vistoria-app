import React, { useState } from 'react';
import { UserPlus, Shield, Building, Mail, User } from 'lucide-react';

const API_URL = "https://trucks-vistoria-app-1.onrender.com/api";

export default function FormCadastroUsuario() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('funcionario');
  const [fotoUrl, setFotoUrl] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleCadastro = async (e) => {
    e.preventDefault();
    if (!nome || !email || !empresaId) {
      alert("Por favor, preencha os campos obrigatórios (Nome, E-mail e Empresa ID).");
      return;
    }

    setEnviando(true);

    const novoUsuario = {
      nome,
      email: email.toLowerCase().trim(),
      empresaId,
      tipoUsuario,
      statusPresenca: 'offline', // Todo usuário novo começa offline
      fotoUrl: fotoUrl.trim() || null
    };

    try {
      const response = await fetch(`${API_URL}/Usuario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoUsuario)
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar usuário na API.");
      }

      alert(`Usuário ${nome} cadastrado com sucesso com a empresa especificada!`);
      
      // Limpa os campos após o sucesso
      setNome('');
      setEmail('');
      setTipoUsuario('funcionario');
      setFotoUrl('');
    } catch (error) {
      console.error("Erro no cadastro:", error);
      alert("Erro ao cadastrar usuário: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <UserPlus size={24} color="#3182ce" />
        <h2 style={styles.titulo}>Painel do Desenvolvedor: Cadastrar Membro do Time</h2>
      </div>
      <p style={styles.subtitulo}>Apenas você ({email}) tem acesso a esta tela para criar usuários atrelados às empresas parceiras.</p>

      <form onSubmit={handleCadastro} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}><User size={14} /> Nome Completo *</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" style={styles.input} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}><Mail size={14} /> E-mail de Acesso *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@empresa.com" style={styles.input} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}><Building size={14} /> Empresa ID (GUID do Banco) *</label>
          <input type="text" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} placeholder="Cole o UUID da empresa aqui..." style={styles.input} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}><Image size={14} /> URL da Foto de Perfil (Opcional)</label>
          <input type="url" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} placeholder="https://linkdafoto.com/imagem.png" style={styles.input} />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}><Shield size={14} /> Nível de Acesso *</label>
          <select value={tipoUsuario} onChange={(e) => setTipoUsuario(e.target.value)} style={styles.select}>
            <option value="funcionario">Funcionário / Inspecionador</option>
            <option value="gestor">Gestor Administrativo</option>
          </select>
        </div>

        <button type="submit" disabled={enviando} style={styles.btn}>
          {enviando ? "CADASTRANDO..." : "SALVAR USUÁRIO NO BANCO"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  card: { background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', maxWidth: '600px', margin: '20px auto', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  titulo: { color: '#fff', fontSize: '18px', fontWeight: 'bold', margin: 0 },
  subtitulo: { color: '#94a3b8', fontSize: '13px', marginBottom: '24px', lineHeight: '1.4' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#cbd5e1', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  btn: { background: '#3182ce', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s', marginTop: '10px' }
};