import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { otimizarImagem } from './utils/compressor';
import { Camera, Trash2, Send, CheckCircle, Info, Truck } from 'lucide-react';

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
    
    // Verifica limite
    if (fotosOtimizadas.length + arquivos.length > 10) {
      alert("Limite máximo de 10 fotos.");
      return;
    }

    setLoading(true);
    
    try {
      for (const arquivo of arquivos) {
        // Otimiza uma por uma
        const otimizada = await otimizarImagem(arquivo);
        const novoPreview = URL.createObjectURL(otimizada);
        
        // Atualiza o estado individualmente para o usuário ver o progresso
        setFotosOtimizadas(prev => [...prev, otimizada]);
        setPreviews(prev => [...prev, novoPreview]);
        
        // Pequena pausa para o celular não travar a UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error("Erro ao processar:", err);
      alert("Erro ao processar imagens. Tente tirar a foto com uma resolução menor.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removerFoto = (index) => {
    setFotosOtimizadas(fotosOtimizadas.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const finalizarVistoria = async () => {
    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe || !tipoServico) {
      alert("Preencha todos os campos e tire pelo menos 1 foto.");
      return;
    }

    setLoading(true);

    try {
      let localizacao = "Não autorizada";
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 });
        });
        localizacao = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("Erro GPS"); }

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

      const promisesEvidencias = fotosOtimizadas.map(async (foto, i) => {
        const fileName = `${placaFormatada}_${Date.now()}_${i}.jpg`;
        const { data: upData, error: upError } = await supabase.storage
          .from('vistorias')
          .upload(fileName, foto);

        if (upError) throw upError;

        return supabase.from('evidencias').insert([{ 
          vistoria_id: vistoria.id, 
          url_foto: upData.path 
        }]);
      });

      await Promise.all(promisesEvidencias);

      alert("Vistoria finalizada com sucesso!");
      
      setPlaca(''); setCliente(''); setObservacao(''); setEquipe(''); setTipoServico(''); setStatus('inicial');
      setFotosOtimizadas([]); setPreviews([]);

    } catch (err) {
      console.error(err);
      alert("Erro ao enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formHeader}>
        <div style={styles.iconCircle}><img 
      src="/NovaVistoriaLogo.png" 
      alt="Logo" 
      style={styles.logoImg} // <-- Adicione isso aqui
    /></div>
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
          ADICIONAR FOTOS
        </label>
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
        {loading ? (
          "PROCESSANDO..."
        ) : (
          <>
            <CheckCircle size={20} />
            FINALIZAR ({fotosOtimizadas.length}/10)
          </>
        )}
      </button>
    </div>
  );
}

const styles = {
  container: { 
    width: '100%',
    maxWidth: '450px', 
    minHeight: '100vh', // Garante que preencha a tela no mobile
    margin: '0 auto',
    background: '#1e293b', // Cor sólida de fundo para evitar transparência bugada no mobile
    padding: '20px', 
    borderRadius: isMobile ? '0' : '24px', // Opcional: remover borda arredondada no celular
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxSizing: 'border-box',
    overflowY: 'auto', // Permite scroll se o teclado do celular abrir
  },
  logoImg: {
    width: '110px',          // Imagem um pouco menor que o círculo
    height: 'auto',
    filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.4))', // Sombra no escudo
    objectFit: 'contain'
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',    // Garante que o círculo e o título fiquem no meio
    marginBottom: '25px',
    gap: '5px'
  },
  iconCircle: {
    width: '140px',          // Tamanho fixo para o círculo
    height: '140px',         // Altura igual à largura
    background: 'rgba(99, 179, 237, 0.1)',
    borderRadius: '50%',     // 50% é o padrão para círculos perfeitos
    display: 'flex',
    alignItems: 'center',    // Centraliza a imagem verticalmente
    justifyContent: 'center',// Centraliza a imagem horizontalmente
    marginBottom: '10px',
    border: '2px solid rgba(99, 179, 237, 0.2)' // Detalhe extra opcional
  },
  title: { textAlign: 'center', margin: 0, color: '#fff', fontWeight: '800', fontSize: '22px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { 
    width: '100%', padding: '14px', borderRadius: '12px', 
    background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', 
    color: '#fff', fontSize: '16px', boxSizing: 'border-box', outline: 'none' 
  },
  select: { 
    width: '100%', padding: '14px', borderRadius: '12px', 
    background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', 
    color: '#fff', fontSize: '16px', boxSizing: 'border-box', cursor: 'pointer', appearance: 'none'
  },
  textarea: { 
    width: '100%', height: '80px', padding: '14px', borderRadius: '12px', 
    background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', 
    color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box', outline: 'none' 
  },
  uploadArea: { marginTop: '20px', marginBottom: '25px' },
  buttonAdd: { 
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    background: 'rgba(66, 153, 225, 0.15)', color: '#63b3ed', padding: '14px', 
    borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px',
    border: '1px dashed #63b3ed'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '15px' },
  thumbWrap: { position: 'relative', paddingTop: '100%' }, // Mantém o aspecto quadrado
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' },
  btnDel: { 
    position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', 
    color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
  },
  btnSend: { 
    width: '100%', padding: '18px', background: '#48bb78', color: '#fff', 
    border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    boxShadow: '0 10px 20px -5px rgba(72, 187, 120, 0.4)', transition: 'transform 0.2s'
  },
  btnDisabled: { 
    width: '100%', padding: '18px', background: 'rgba(255,255,255,0.05)', 
    color: '#4a5568', border: 'none', borderRadius: '16px', cursor: 'not-allowed',
    fontWeight: '900'
  }
};