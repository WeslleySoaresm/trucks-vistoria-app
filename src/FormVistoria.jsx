import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { otimizarImagem } from './utils/compressor';
import { Camera, Trash2, CheckCircle } from 'lucide-react';

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
        // Otimização
        const otimizada = await otimizarImagem(arquivo);
        const novoPreview = URL.createObjectURL(otimizada);
        
        setFotosOtimizadas(prev => [...prev, otimizada]);
        setPreviews(prev => [...prev, novoPreview]);
        
        // Pequena pausa para o hardware respirar
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error("Erro memória:", err);
      alert("Memória cheia. Tente fechar outros apps e use o Chrome.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removerFoto = (index) => {
    URL.revokeObjectURL(previews[index]); // Libera memória RAM imediatamente
    setFotosOtimizadas(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const finalizarVistoria = async () => {
    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe || !tipoServico) {
      alert("Preencha todos os campos e anexe as fotos.");
      return;
    }

    setLoading(true);

    try {
      let localizacao = "Não autorizada";
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
        });
        localizacao = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("GPS Off"); }

      const placaFormatada = placa.trim().toUpperCase();

      await supabase.from('veiculos').upsert({ 
        placa: placaFormatada, 
        cliente_nome: cliente.trim() || 'Não Informado',
        modelo: 'Vistoria Mobile' 
      }, { onConflict: 'placa' });

      const { data: vistoria, error: vError } = await supabase
        .from('vistorias')
        .insert([{ 
          veiculo_id: placaFormatada, 
          usuario_id: user.id,
          equipe: equipe,
          tipo_servico: tipoServico,
          observacao: observacao,
          localizacao_texto: localizacao,
          status: status 
        }])
        .select().single();

      if (vError) throw vError;

      // Upload SEQUENCIAL (evita erro de rede e memória)
      for (let i = 0; i < fotosOtimizadas.length; i++) {
        const foto = fotosOtimizadas[i];
        const fileName = `${placaFormatada}_${Date.now()}_${i}.jpg`;
        
        const { data: upData, error: upError } = await supabase.storage
          .from('vistorias')
          .upload(fileName, foto);

        if (upError) throw upError;

        await supabase.from('evidencias').insert([{ 
          vistoria_id: vistoria.id, 
          url_foto: upData.path 
        }]);
      }

      alert("Vistoria enviada!");
      previews.forEach(url => URL.revokeObjectURL(url));
      setPlaca(''); setCliente(''); setObservacao(''); setEquipe(''); setTipoServico('');
      setFotosOtimizadas([]); setPreviews([]);

    } catch (err) {
      alert("Erro ao enviar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formHeader}>
        <img src="/NovaVistoriaLogo.png" alt="Logo" style={styles.logoImg} />
        <h2 style={styles.title}>Nova Inspeção</h2>
      </div>
      
      <div style={styles.inputGroup}>
        <input type="text" placeholder="Placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} style={styles.input} />
        <input type="text" placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} style={styles.input} />
        
        <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.select}>
          <option value="" disabled>Equipe</option>
          {equipesDisponiveis.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      
        <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} style={styles.select}>
          <option value="" disabled>Serviço</option>
          {tiposServicoDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <textarea placeholder="Observações..." value={observacao} onChange={(e) => setObservacao(e.target.value)} style={styles.textarea} />
      </div>

      <div style={styles.uploadArea}>
        <label htmlFor="foto-input" style={styles.buttonAdd}>
          <Camera size={20} />
          ADICIONAR FOTOS / CÂMERA
        </label>
        {/* capture REMOVIDO para permitir galeria e economizar RAM */}
        <input 
          id="foto-input" 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          multiple
          onChange={manipularFotos} 
          style={{ display: 'none' }} 
        />

        <div style={styles.grid}>
          {previews.map((url, index) => (
            <div key={index} style={styles.thumbWrap}>
              <img src={url} alt="preview" style={styles.img} />
              <button onClick={() => removerFoto(index)} style={styles.btnDel}>X</button>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={finalizarVistoria} 
        disabled={loading || fotosOtimizadas.length === 0}
        style={loading ? styles.btnDisabled : styles.btnSend}
      >
        {loading ? "ENVIANDO..." : `FINALIZAR (${fotosOtimizadas.length}/10)`}
      </button>
    </div>
  );
}

const styles = {
  container: { width: '100%', maxWidth: '450px', minHeight: '100vh', margin: '0 auto', background: '#1a202c', padding: '20px', borderRadius: '24px', boxSizing: 'border-box' },
  logoImg: { width: '100px', marginBottom: '10px' },
  formHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' },
  title: { color: '#fff', fontSize: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff' },
  textarea: { width: '100%', height: '70px', padding: '12px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', resize: 'none' },
  uploadArea: { marginTop: '20px' },
  buttonAdd: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#3182ce22', color: '#63b3ed', padding: '15px', borderRadius: '12px', border: '1px dashed #63b3ed', cursor: 'pointer', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' },
  thumbWrap: { position: 'relative', paddingTop: '100%' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' },
  btnDel: { position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px' },
  btnSend: { width: '100%', padding: '16px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px' },
  btnDisabled: { width: '100%', padding: '16px', background: '#2d3748', color: '#718096', border: 'none', borderRadius: '12px', marginTop: '20px' }
};