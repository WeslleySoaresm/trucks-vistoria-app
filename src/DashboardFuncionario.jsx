import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Loader2, Camera, MapPin, X } from 'lucide-react';

// URL da sua API .NET
const API_URL = 'http://localhost:5000/api'; 

export default function DashboardFuncionario({ user }) {
  const [stats, setStats] = useState({ total_vistorias: 0, porcentagem_meta: 0 });
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [fotosModal, setFotosModal] = useState(null);

  const META_MENSAL = 20;

  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Busca vistorias da sua NOVA API (Endpoint que criamos)
      // Nota: Idealmente você teria um endpoint /api/Vistoria/usuario/{id}
      const response = await fetch(`${API_URL}/Vistoria`);
      const data = await response.json();

      // Filtra vistorias do usuário logado (enquanto não temos o endpoint específico)
      const minhasVistorias = data.filter(v => v.usuarioId === user.id);

      const formatados = minhasVistorias.map(v => ({
        id: v.id,
        data_formatada: v.dataCriacao ? new Date(v.dataCriacao).toLocaleDateString('pt-BR') : '---',
        placa: v.placa, // Mudou de veiculo_id para placa
        tipo_servico: v.tipoServico,
        equipe: v.equipe,
        localizacao_texto: v.localizacao,
        todas_fotos: v.evidencias ? v.evidencias.map(e => e.urlFoto) : [],
        qtd_fotos: v.evidencias ? v.evidencias.length : 0
      }));

      setVistorias(formatados);
      
      // 2. Cálculo de Stats (Local enquanto não migramos a View de resumo)
      const total = formatados.length;
      setStats({
        total_vistorias: total,
        porcentagem_meta: (total / META_MENSAL) * 100
      });

    } catch (err) {
      console.error("Erro ao carregar dados da API .NET:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    checkMobile();
    carregarDados();
    return () => window.removeEventListener('resize', checkMobile);
  }, [carregarDados]);

  const removerVistoria = async (id) => {
    if (!window.confirm("Excluir esta vistoria permanentemente?")) return;
    
    try {
      const response = await fetch(`${API_URL}/Vistoria/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setVistorias(prev => prev.filter(v => v.id !== id));
        // Atualiza stats localmente
      }
    } catch (err) {
      alert("Erro ao excluir no servidor.");
    }
  };

  const abrirMapa = (loc) => {
    if (!loc || loc === "Não autorizada") return alert("Localização não disponível.");
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    window.open(url, '_blank');
  };

  // ... (O restante do seu JSX permanece quase igual, apenas verifique as variáveis)
  return (
    <div style={styles.pageWrapper}>
       {/* (Mantenha o Card de Meta e a Tabela que você já tem, eles funcionarão com o novo estado) */}
       {/* IMPORTANTE: No Modal de fotos, se as URLs forem do Supabase, você ainda as usa diretamente */}
       {fotosModal && (
        <div style={styles.modalOverlay} onClick={() => setFotosModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#fff' }}>{fotosModal.placa}</h3>
              <button onClick={() => setFotosModal(null)} style={{background:'none', border:'none', color:'#fff'}}><X/></button>
            </div>
            <div style={styles.galeria}>
              {fotosModal.fotos.map((url, i) => (
                <img key={i} src={url} style={styles.fotoItem} alt="vistoria" />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ... restante do código ... */}
    </div>
  );
}