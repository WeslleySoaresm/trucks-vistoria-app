import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { otimizarImagem } from './utils/compressor';

export default function FormVistoria({ user }) {
  const [loading, setLoading] = useState(false);
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [equipe, setEquipe] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fotoOtimizada, setFotoOtimizada] = useState(null); // Estado para a foto processada
  const [previewUrl, setPreviewUrl] = useState(null); // Estado para mostrar a foto na tela
  
  const equipesDisponiveis = ["812", "811", "TFF", "805", "810"];
  const fileInputRef = useRef(null);

  // 1. FUNÇÃO APENAS PARA TIRAR E PROCESSAR A FOTO
  const manipularFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const otimizada = await otimizarImagem(file);
      setFotoOtimizada(otimizada);
      setPreviewUrl(URL.createObjectURL(otimizada)); // Cria um link temporário para ver a foto
    } catch (err) {
      alert("Erro ao processar foto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNÇÃO APENAS PARA ENVIAR OS DADOS (FINALIZAR)
  const finalizarVistoria = async () => {
    if (!placa.trim() || !fotoOtimizada || !equipe) {
      alert("Preencha a placa, a equipe e tire uma foto antes de finalizar.");
      return;
    }

    if (!user?.id) {
      alert("Erro de sessão. Refaça o login.");
      return;
    }

    setLoading(true);

    try {
      // Captura de Localização (Agora no clique do Finalizar - Melhor para iOS)
      let localizacaoFormatada = "Não autorizada";
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 10000 
          });
        });
        localizacaoFormatada = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("GPS não capturado"); }

      // Registro do Veículo
      await supabase.from('veiculos').upsert({ 
          placa: placa.trim().toUpperCase(), 
          cliente_nome: cliente.trim() || 'Não Informado',
          modelo: 'Vistoria Mobile'
      }, { onConflict: 'placa' });

      // Upload da Foto
      const fileName = `${placa.trim().toUpperCase()}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vistorias')
        .upload(fileName, fotoOtimizada);

      if (uploadError) throw uploadError;

      // Criar Vistoria
      const { data: vistoria, error: errorVistoria } = await supabase
        .from('vistorias')
        .insert([{ 
            veiculo_id: placa.trim().toUpperCase(), 
            usuario_id: user.id,
            equipe: equipe,
            observacao: observacao,
            localizacao_texto: localizacaoFormatada,
            status: 'concluida' 
        }])
        .select().single();

      if (errorVistoria) throw errorVistoria;

      // Registro da Evidência
      await supabase.from('evidencias').insert([{ 
        vistoria_id: vistoria.id, 
        url_foto: uploadData.path 
      }]);

      alert("✅ Vistoria salva com sucesso!");
      
      // Limpar tudo
      setPlaca(''); setCliente(''); setObservacao(''); setEquipe('');
      setFotoOtimizada(null); setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" style={styles.container}>
      <h2 style={styles.title}>Nova Inspeção</h2>
      
      <div style={styles.inputGroup}>
        <label style={styles.label}>Placa</label>
        <input type="text" placeholder="ABC1D23" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} style={styles.input} />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Cliente</label>
        <input type="text" placeholder="Nome do Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} style={styles.input} />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Equipe</label>
        <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={styles.input}>
          <option value="">Selecione...</option>
          {equipesDisponiveis.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Observações</label>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} style={styles.textarea} />
      </div>

      {/* ÁREA DE FOTO */}
      <div style={styles.uploadArea}>
        {!previewUrl ? (
          <>
            <label htmlFor="foto-input" style={styles.buttonPhoto}>📸 TIRAR FOTO</label>
            <input id="foto-input" ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={manipularFoto} style={{ display: 'none' }} />
          </>
        ) : (
          <div style={{textAlign: 'center'}}>
            <img src={previewUrl} alt="Preview" style={styles.previewImg} />
            <button onClick={() => {setPreviewUrl(null); setFotoOtimizada(null);}} style={styles.btnReset}>Trocar Foto</button>
          </div>
        )}
      </div>

      {/* BOTÃO FINALIZAR - Só aparece se tiver foto */}
      {previewUrl && (
        <button 
          onClick={finalizarVistoria} 
          disabled={loading} 
          style={loading ? styles.buttonDisabled : styles.buttonFinalizar}
        >
          {loading ? "Processando..." : "✅ FINALIZAR E ENVIAR"}
        </button>
      )}

      {loading && <div style={styles.loadingBar}><div style={styles.progress}></div></div>}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '400px', margin: '20px auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', color: '#333', marginBottom: '20px' },
  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', resize: 'none', boxSizing: 'border-box' },
  uploadArea: { marginBottom: '20px' },
  buttonPhoto: { display: 'block', textAlign: 'center', background: '#6c757d', color: '#fff', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  buttonFinalizar: { width: '100%', background: '#28a745', color: '#fff', padding: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  buttonDisabled: { width: '100%', background: '#ccc', color: '#fff', padding: '16px', borderRadius: '8px', border: 'none', cursor: 'not-allowed' },
  previewImg: { width: '100%', borderRadius: '8px', marginBottom: '10px', maxHeight: '200px', objectFit: 'cover' },
  btnReset: { background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' },
  loadingBar: { width: '100%', height: '4px', background: '#eee', marginTop: '10px', borderRadius: '2px', overflow: 'hidden' },
  progress: { width: '100%', height: '100%', background: '#28a745', animation: 'loading 2s infinite ease-in-out' }
};