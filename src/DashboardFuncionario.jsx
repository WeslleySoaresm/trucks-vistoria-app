import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function DashboardFuncionario({ user }) {
  const [stats, setStats] = useState({ total_vistorias: 0, porcentagem_meta: 0 });
  const META_MENSAL = 20;

  useEffect(() => {
    async function carregarMeta() {
      const { data } = await supabase
        .from('resumo_pessoal_funcionario')
        .select('*')
        .eq('usuario_id', user.id)
        .single();
      
      if (data) setStats(data);
    }
    carregarMeta();
  }, [user.id]);

  // Lógica de Cores Dinâmicas
  const obterCorBarra = (porcentagem) => {
    if (porcentagem < 40) return '#ff4d4d'; // Vermelho
    if (porcentagem < 80) return '#ffa500'; // Laranja
    return '#28a745'; // Verde
  };
  
  const corAtual = obterCorBarra(stats.porcentagem_meta);
  const progressoLimitado = Math.min(stats.porcentagem_meta, 100);

  return (
    <div style={styles.container}>
      <h3>Olá, {user.email.split('@')[0]}!</h3>
      <p>Seu desempenho este mês:</p>
      
      <div style={styles.cardMeta}>
            <div style={styles.statsNum}>
            {/* Cor do número grande agora muda conforme o progresso */}
            <span style={{ ...styles.bigNum, color: corAtual }}>{stats.total_vistorias}</span>
            <span> / {META_MENSAL} vistorias</span>
            </div>

            {/* Barra de Progresso com Raio */}
            <div style={styles.progressContainer}>
            <div style={{ 
                ...styles.progressBar, 
                width: `${progressoLimitado}%`,
                background: corAtual,
                position: 'relative', // Necessário para o raio
                overflow: 'hidden'
            }}>
                {/* ESTA É A DIV QUE GERA O EFEITO DE RAIO */}
                {/* O RAIO ATUALIZADO */}
                <div style={{
                ...styles.raioEfeito,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', // Mais brilhante
                width: '120px', // Mais largo para aparecer bem
                }}></div>
                
                <span style={styles.progressText}>
                {Math.round(stats.porcentagem_meta)}%
                </span>
            </div>
            </div>
        
            <p style={styles.txtMeta}>
            {stats.total_vistorias >= META_MENSAL 
                ? "✅ Meta batida! Parabéns!" 
                : `Faltam ${Math.max(META_MENSAL - stats.total_vistorias, 0)} para o objetivo.`}
            </p>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', textAlign: 'center' },
  cardMeta: { background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  bigNum: { fontSize: '48px', fontWeight: 'bold', transition: 'color 0.5s ease' },
  statsNum: { marginBottom: '10px' },
  progressContainer: { 
    background: '#eee', 
    borderRadius: '15px', 
    height: '35px', 
    margin: '20px 0', 
    overflow: 'hidden', 
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
    position: 'relative' 
  },
  progressBar: { 
    height: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    transition: 'width 0.8s ease-in-out',
    position: 'relative',
    overflow: 'hidden'
  },
  raioEfeito: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '150px', // Largura do feixe de luz
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
    animation: 'passarRaio 2s infinite linear', // 'linear' deixa o movimento constante
    zIndex: 1,
    transform: 'skewX(-20deg)' // Inclina o raio para ficar mais bonito
  },
  progressText: {
    position: 'relative',
    zIndex: 2,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
  },
  txtMeta: { fontSize: '14px', color: '#666', marginTop: '10px' }
};