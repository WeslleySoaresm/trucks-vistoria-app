import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { otimizarImagem } from './utils/compressor';

export default function FormVistoria({ user }) {
  console.log("Usuário logado:", user);
  // 0. Estado para controle de carregamento e inputs
  const [loading, setLoading] = useState(false);
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [equipe, setEquipe] = useState('');
  const equipesDisponiveis = ["812", "811", "TFF", "805", "810"];
  const [observacao, setObservacao] = useState('');
  const fileInputRef = useRef(null);

  const enviarVistoria = async (e) => {
  const file = e.target.files[0];
  // 1. PRIMEIRO: Garantir que o veículo existe no banco
 // Sem isso, a vistoria vai dar erro de Chave Estrangeira (o erro que você teve)
    const { error: errorVeiculo } = await supabase
    .from('veiculos')
    .upsert({ 
        placa: placa.trim().toUpperCase(), 
        cliente_nome: cliente.trim() || 'Não Informado',
        modelo: 'Vistoria Mobile'
    }, { onConflict: 'placa' }); // Força o reconhecimento da placa como chave

    if (errorVeiculo) {
    console.error("Erro ao registrar veículo:", errorVeiculo);
    throw new Error("Não foi possível registrar o veículo: " + errorVeiculo.message);
    }
  // 1. Validação de segurança: se o objeto 'user' sumiu por algum motivo, para aqui.
  if (!user || !user.id) {
    alert("Erro de sessão: Usuário não identificado. Tente sair e entrar novamente.");
    return;
  }

  if (!file || !placa.trim()) return;

  setLoading(true);

  try {
    // Captura de Localização
    let localizacaoFormatada = "Não autorizada";
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      localizacaoFormatada = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (e) {
      console.warn("GPS não capturado");
    }

    // Otimização e Nome do Arquivo
    const fotoOtimizada = await otimizarImagem(file);
    const fileName = `${placa.trim().toUpperCase()}_${Date.now()}.jpg`;

    // Upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vistorias')
      .upload(fileName, fotoOtimizada);

    if (uploadError) throw uploadError;

    // Inserção no Banco
    // IMPORTANTE: usamos user.id que agora temos certeza que existe aqui
    // 2. AGORA SIM: Criar a Vistoria
    const { data: vistoria, error: errorVistoria } = await supabase
    .from('vistorias')
    .insert([{ 
        veiculo_id: placa.trim().toUpperCase(), 
        usuario_id: user.id,
        equipe: equipe, // <--- Enviando a equipe selecionada
        observacao: observacao,
        localizacao_texto: localizacaoFormatada,
        status: 'concluida' 
    }])
    .select()
    .single();

    if (errorVistoria) throw errorVistoria;

    // Registro da Evidência
    await supabase.from('evidencias').insert([{ 
      vistoria_id: vistoria.id, 
      url_foto: uploadData.path 
    }]);

    alert("✅ Vistoria salva com sucesso!");
    setPlaca('');
    setCliente('');
    setObservacao('');
    if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err) {
        console.error("Erro detalhado:", err);
        alert("❌ Erro: " + (err.message || "Falha ao salvar dados"));
    } finally {
        setLoading(false);
    }
};


  return (
    <div className="form-container" style={styles.container}>
      <h2 style={styles.title}>Nova Inspeção</h2>
      
      <div style={styles.inputGroup}>
        <label>Placa</label>
        <input 
          type="text" 
          placeholder="ABC1D23" 
          value={placa} 
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          disabled={loading}
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label>Nome do Cliente / Motorista</label>
        <input 
          type="text" 
          placeholder="Ex: João Silva" 
          value={cliente} 
          onChange={(e) => setCliente(e.target.value)}
          disabled={loading}
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Equipe / Prefixo</label>
        <select 
            value={equipe} 
            onChange={(e) => setEquipe(e.target.value)} 
            style={styles.input}
            required
            >
            <option value="">Selecione a Equipe</option>
            {equipesDisponiveis.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>
        {/* Campo de Observação */}
      <div style={styles.inputGroup}>
            <label style={styles.label}>Observações:</label>
            <textarea
                placeholder="Digite aqui detalhes importantes da vistoria..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                style={styles.textarea}
            />
      </div>

      <div style={styles.uploadArea}>
        <label htmlFor="foto-input" style={loading ? styles.buttonDisabled : styles.button}>
          {loading ? "Enviando dados..." : "📸 TIRAR FOTO E FINALIZAR"}
        </label>
        <input 
          id="foto-input"
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="environment" // Abre a câmera traseira no celular
          onChange={enviarVistoria}
          disabled={loading}
          style={{ display: 'none' }}
        />
      </div>

      {loading && (
        <div style={styles.loadingBar}>
          <div style={styles.progress}></div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '400px', margin: '0 auto', marginTop: '50px', background: '#f9f9f9', borderRadius: '8px' },
  title: { color: '#2d2d2dff', textAlign: 'center' },
  inputGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #eeeeeeff', fontSize: '16px' },
  button: { display: 'block', textAlign: 'center', background: '#007bff', color: '#ffffffff', padding: '15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  buttonDisabled: { display: 'block', textAlign: 'center', background: '#ccc', color: '#fdfdfdff', padding: '15px', borderRadius: '4px', cursor: 'not-allowed' },
  loadingBar: { width: '100%', height: '4px', background: '#eee', marginTop: '10px', overflow: 'hidden' },
  progress: { width: '50%', height: '100%', background: '#00ff62ff', animation: 'loading 1s infinite linear' },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333'
  },
  textarea: {
    width: '100%',
    height: '100px', // Altura boa para digitar no celular
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px', // Evita que o iPhone dê zoom automático ao clicar
    fontFamily: 'inherit',
    resize: 'none', // Impede o usuário de desconfigurar o layout
    boxSizing: 'border-box'}};