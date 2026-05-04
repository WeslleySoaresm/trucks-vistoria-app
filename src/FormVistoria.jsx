import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient'; // Mantido apenas para o Storage das fotos
import { otimizarImagem } from './utils/compressor';
import { Camera, Trash2, Send, CheckCircle, Truck } from 'lucide-react';

// Ajuste para a URL da sua API (Local ou Produção)
const API_URL = 'https://trucks-vistoria-app-1.onrender.com/api'; 

export default function FormVistoria({ user }) {
  const [loading, setLoading] = useState(false);
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [equipe, setEquipe] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [status, setStatus] = useState('inicial'); 

  const [fotosOtimizadas, setFotosOtimizadas] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  const fileInputRef = useRef(null);

  const tiposServicoDisponiveis = ["On Job", "Primeira Visita", "Procura Artificial", "Indicação"];
  const equipesDisponiveis = ["812", "811", "TFF", "805", "810"];
  const statusDisponiveis = [
    { label: "Inicial", value: "inicial" },
    { label: "Em processo", value: "em_processo" },
    { label: "Concluído", value: "concluida" }
  ];

  const manipularFotos = async (e) => {
    const arquivos = Array.from(e.target.files);
    if (arquivos.length === 0) return;
    if (fotosOtimizadas.length + arquivos.length > 10) {
      alert("Limite máximo de 10 fotos.");
      return;
    }

    setLoading(true);
    try {
      for (const arquivo of arquivos) {
        const otimizada = await otimizarImagem(arquivo);
        const novoPreview = URL.createObjectURL(otimizada);
        
        setFotosOtimizadas(prev => [...prev, otimizada]);
        setPreviews(prev => [...prev, novoPreview]);
        
        // Delay para evitar crash de memória no mobile
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      alert("O celular ficou sem memória. Tente enviar fotos uma a uma.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removerFoto = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFotosOtimizadas(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const finalizarVistoria = async () => {
    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe || !tipoServico) {
      alert("Preencha todos os campos e tire pelo menos 1 foto.");
      return;
    }

    setLoading(true);

    try {
      // 1. GPS (Funcionalidade mantida)
      let localizacao = "Não autorizada";
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: false });
        });
        localizacao = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("GPS falhou."); }

      const placaFormatada = placa.trim().toUpperCase();
      const urlsFotosParaBanco = [];

      // 2. Upload de fotos SEQUENCIAL para o Supabase Storage
      for (let i = 0; i < fotosOtimizadas.length; i++) {
        const foto = fotosOtimizadas[i];
        const fileName = `${placaFormatada}_${Date.now()}_${i}.jpg`;
        
        const { data: upData, error: upError } = await supabase.storage
          .from('vistorias')
          .upload(fileName, foto);

        if (upError) throw upError;
        urlsFotosParaBanco.push(upData.path); // Guardamos o caminho retornado
      }

      // 3. Envio para a API .NET (Substitui os múltiplos inserts do Supabase)
      const payload = {
        Placa: placaFormatada,
        Cliente: cliente.trim() || 'Não Informado',
        UsuarioId: user.id, // ID do seu novo sistema de Login
        Equipe: equipe,
        TipoServico: tipoServico,
        Observacao: observacao,
        Localizacao: localizacao,
        Status: status,
        Evidencias: urlsFotosParaBanco // Lista de strings enviada para o C#
      };

      const response = await fetch(`${API_URL}/Vistoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const erroMsg = await response.text();
        throw new Error(erroMsg || "Erro ao salvar na API .NET");
      }

      alert("Vistoria enviada com sucesso para o novo servidor!");
      
      // Limpeza de memória e estado
      previews.forEach(url => URL.revokeObjectURL(url));
      setPlaca(''); setCliente(''); setObservacao(''); setEquipe(''); setTipoServico(''); setStatus('inicial');
      setFotosOtimizadas([]); setPreviews([]);

    } catch (err) {
      console.error("Erro fatal:", err);
      alert("Erro ao enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* O JSX permanece IDENTICO ao seu original para manter o design */}
      <div style={styles.formHeader}>
        <div style={styles.iconCircle}>
          <img src="/NovaVistoriaLogo.png" alt="Logo" style={styles.logoImg} />
        </div>
        <h2 style={styles.title}>Nova Inspeção</h2>
      </div>
      
      <div style={styles.inputGroup}>
        <input 
          type="text" 
          placeholder="Placa do Veículo" 
          value={placa} 
          onChange={(e) => setPlaca(e.target.value.toUpperCase())} 
          style={styles.input} 
        />
        <input 
          type="text" 
          placeholder="Nome do Cliente" 
          value={cliente} 
          onChange={(e) => setCliente(e.target.value)} 
          style={styles.input} 
        />
        
        <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.select}>
          <option value="" disabled>Selecione a Equipe</option>
          {equipesDisponiveis.map(eq => <option key={eq} value={eq}>Equipe {eq}</option>)}
        </select>
      
        <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} style={styles.select}>
          <option value="" disabled>Tipo de Serviço</option>
          {tiposServicoDisponiveis.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
          {statusDisponiveis.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <textarea 
          placeholder="Observações adicionais..." 
          value={observacao} 
          onChange={(e) => setObservacao(e.target.value)} 
          style={styles.textarea} 
        />
      </div>

      <div style={styles.uploadArea}>
        <label htmlFor="foto-input" style={styles.buttonAdd}>
          <Camera size={20} />
          ABRIR CÂMERA
        </label>
        <input 
          id="foto-input" 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={manipularFotos} 
          style={{ display: 'none' }} 
        />

        <div style={styles.grid}>
          {previews.map((url, index) => (
            <div key={index} style={styles.thumbWrap}>
              <img src={url} alt="preview" style={styles.img} />
              <button onClick={() => removerFoto(index)} style={styles.btnDel}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={finalizarVistoria} 
        disabled={loading || fotosOtimizadas.length === 0}
        style={loading ? styles.btnDisabled : styles.btnSend}
      >
        {loading ? "ENVIANDO DADOS..." : (
          <>
            <CheckCircle size={20} />
            FINALIZAR ({fotosOtimizadas.length}/10)
          </>
        )}
      </button>
    </div>
  );
}

// Estilos mantidos exatamente como os seus
const styles = {
  container: { width: '100%', maxWidth: '450px', minHeight: '100vh', margin: '0 auto', background: '#1a202c', padding: '20px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' },
  logoImg: { width: '110px', height: 'auto', objectFit: 'contain' },
  formHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '5px' },
  iconCircle: { width: '140px', height: '140px', background: 'rgba(99, 179, 237, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', border: '2px solid rgba(99, 179, 237, 0.2)' },
  title: { textAlign: 'center', margin: 0, color: '#fff', fontWeight: '800', fontSize: '22px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { width: '100%', height: '80px', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' },
  uploadArea: { marginTop: '20px', marginBottom: '25px' },
  buttonAdd: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(66, 153, 225, 0.15)', color: '#63b3ed', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', border: '1px dashed #63b3ed' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '15px' },
  thumbWrap: { position: 'relative', paddingTop: '100%' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' },
  btnDel: { position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnSend: { width: '100%', padding: '18px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  btnDisabled: { width: '100%', padding: '18px', background: 'rgba(255,255,255,0.05)', color: '#4a5568', border: 'none', borderRadius: '16px', cursor: 'not-allowed', fontWeight: '900' }
};