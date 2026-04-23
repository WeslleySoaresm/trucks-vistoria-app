import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { otimizarImagem } from './utils/compressor';

export default function FormVistoria({ user }) {
  const [loading, setLoading] = useState(false);
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [equipe, setEquipe] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // MUDANÇA: Agora usamos arrays para suportar várias fotos
  const [fotosOtimizadas, setFotosOtimizadas] = useState([]); 
  const [previews, setPreviews] = useState([]); 

  const equipesDisponiveis = ["812", "811", "TFF", "805", "810"];
  const fileInputRef = useRef(null);

  // 1. FUNÇÃO PARA ADICIONAR FOTOS (Câmera ou Galeria)
  const manipularFotos = async (e) => {
    const arquivos = Array.from(e.target.files);
    if (arquivos.length === 0) return;

    // Verifica se não ultrapassa o limite (ex: 10 fotos)
    if (fotosOtimizadas.length + arquivos.length > 10) {
      alert("O limite máximo é de 10 fotos por vistoria.");
      return;
    }

    setLoading(true);
    try {
      const novasFotos = [];
      const novosPreviews = [];

      for (const arquivo of arquivos) {
        const otimizada = await otimizarImagem(arquivo);
        novasFotos.push(otimizada);
        novosPreviews.push(URL.createObjectURL(otimizada));
      }

      setFotosOtimizadas([...fotosOtimizadas, ...novasFotos]);
      setPreviews([...previews, ...novosPreviews]);
    } catch (err) {
      alert("Erro ao processar uma ou mais fotos.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Limpa o input para permitir nova seleção
    }
  };

  // Remover uma foto específica antes de enviar
  const removerFoto = (index) => {
    setFotosOtimizadas(fotosOtimizadas.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  // 2. FUNÇÃO PARA FINALIZAR (Envia todas as fotos)
  const finalizarVistoria = async () => {
    if (!placa.trim() || fotosOtimizadas.length === 0 || !equipe) {
      alert("Preencha a placa, a equipe e adicione ao menos uma foto.");
      return;
    }

    setLoading(true);

    try {
      // Captura de Localização
      let localizacaoFormatada = "Não autorizada";
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        localizacaoFormatada = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("GPS falhou"); }

      // Registro do Veículo
      await supabase.from('veiculos').upsert({ 
          placa: placa.trim().toUpperCase(), 
          cliente_nome: cliente.trim() || 'Não Informado'
      }, { onConflict: 'placa' });

      // Criar a Vistoria primeiro
      const { data: vistoria, error: errorVistoria } = await supabase
        .from('vistorias')
        .insert([{ 
            veiculo_id: placa.trim().toUpperCase(), 
            usuario_id: user.id,
            equipe,
            observacao,
            localizacao_texto: localizacaoFormatada,
            status: 'concluida' 
        }])
        .select().single();

      if (errorVistoria) throw errorVistoria;

      // Upload de TODAS as fotos e registro das evidências
      for (const [index, fotoBlob] of fotosOtimizadas.entries()) {
        const fileName = `${placa.trim()}_${Date.now()}_${index}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vistorias')
          .upload(fileName, fotoBlob);

        if (!uploadError) {
          await supabase.from('evidencias').insert([{ 
            vistoria_id: vistoria.id, 
            url_foto: uploadData.path 
          }]);
        }
      }

      alert("✅ Vistoria com " + fotosOtimizadas.length + " fotos salva!");
      
      // Resetar form
      setPlaca(''); setCliente(''); setObservacao('');
      setFotosOtimizadas([]); setPreviews([]);
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Nova Inspeção</h2>
      
      {/* Inputs de texto (Placa, Cliente, Equipe, Obs) - Mantidos iguais */}
      <input type="text" placeholder="Placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} style={styles.input} />
      <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.input}>
         <option value="">Equipe...</option>
         {equipesDisponiveis.map(eq => <option key={eq} value={eq}>{eq}</option>)}
      </select>
      <textarea placeholder="Observações" value={observacao} onChange={(e) => setObservacao(e.target.value)} style={styles.textarea} />

      {/* ÁREA DE FOTOS */}
      <div style={styles.uploadArea}>
        <label htmlFor="foto-input" style={styles.buttonAdd}>➕ ADICIONAR FOTOS</label>
        {/* MUDANÇA: 'multiple' permite várias, e sem 'capture' abre a galeria por padrão no celular */}
        <input 
          id="foto-input" 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={manipularFotos} 
          style={{ display: 'none' }} 
        />
        
        <div style={styles.gridPreviews}>
          {previews.map((url, index) => (
            <div key={index} style={styles.thumbContainer}>
              <img src={url} alt="preview" style={styles.thumb} />
              <button onClick={() => removerFoto(index)} style={styles.btnRemove}>X</button>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={finalizarVistoria} 
        disabled={loading || fotosOtimizadas.length === 0} 
        style={loading ? styles.buttonDisabled : styles.buttonFinalizar}
      >
        {loading ? "Enviando..." : `✅ FINALIZAR (${fotosOtimizadas.length} FOTOS)`}
      </button>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '12px' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '60px', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' },
  buttonAdd: { display: 'block', textAlign: 'center', background: '#6c757d', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '15px' },
  gridPreviews: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
  thumbContainer: { position: 'relative', width: '100%', height: '100px' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' },
  btnRemove: { position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' },
  buttonFinalizar: { width: '100%', background: '#28a745', color: '#fff', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold' },
  buttonDisabled: { width: '100%', background: '#ccc', color: '#fff', padding: '15px', borderRadius: '8px', border: 'none' }
};