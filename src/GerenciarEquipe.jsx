import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function GerenciarEquipe({ usuarioLogado }) {
  const [meusTecnicos, setMeusTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDadosEquipe() {
      try {
        setLoading(true);

        if (usuarioLogado.role === 'gestor') {
          // 1. Descobre qual é a equipe que o "Junior" (gestor logado) lidera
          const { data: equipe, error: erroEquipe } = await supabase
            .from('equipes')
            .select('id')
            .eq('gestor_id', usuarioLogado.id)
            .single();

          if (erroEquipe) throw erroEquipe;

          if (equipe) {
            // 2. Busca apenas os técnicos (Weslley, Janaina) que pertencem a essa equipe
            const { data: tecnicos, error: erroTecnicos } = await supabase
              .from('usuarios')
              .select('*')
              .eq('equipe_id', equipe.id)
              .eq('role', 'tecnico');

            if (erroTecnicos) throw erroTecnicos;
            setMeusTecnicos(tenicos);
          }
        } else if (usuarioLogado.role === 'master') {
          // Se for o Gestor Master Geral, ele vê absolutamente todo mundo (inclusive a Matilde)
          const { data: todos, error: erroTodos } = await supabase
            .from('usuarios')
            .select('*');
          
          if (erroTodos) throw erroTodos;
          setMeusTecnicos(todos);
        }

      } catch (error) {
        console.error("Erro ao filtrar equipe:", error.message);
      } finally {
        setLoading(false);
      }
    }

    if (usuarioLogado) {
      carregarDadosEquipe();
    }
  }, [usuarioLogado]);

  if (loading) return <p>Carregando membros da equipe...</p>;

  return (
    <div style={styles.container}>
      <h2>Minha Equipe de Vistoria</h2>
      <p style={{ color: '#94a3b8' }}>
        Logado como Gestor: <strong>{usuarioLogado.nome}</strong>
      </p>
      
      <ul style={styles.lista}>
        {meusTecnicos.map((tecnico) => (
          <li key={tecnico.id} style={styles.item}>
            <span>{tecnico.nome}</span>
            <span style={styles.badge}>{tecnico.role}</span>
          </li>
        ))}
        {meusTecnicos.length === 0 && (
          <p>Nenhum técnico vinculado à sua gestão no momento.</p>
        )}
      </ul>
    </div>
  );
}

const styles = {
  container: { padding: '20px', color: '#fff', backgroundColor: '#1e293b', borderRadius: '12px' },
  lista: { listStyle: 'none', padding: 0 },
  item: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #334155' },
  badge: { backgroundColor: '#3182ce', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }
};