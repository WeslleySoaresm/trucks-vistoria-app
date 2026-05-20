using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SeuProjeto.Models; // Nota: Certifique-se de que este namespace está correto no seu app
using TrucksVistoria.Domain.Entities;

namespace TrucksVistoria.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<DashboardVistoria> DashboardVistorias { get; set; }
    public DbSet<Vistoria> Vistorias { get; set; }
    public DbSet<Clientes> Clientes { get; set; }
    public DbSet<Veiculo> Veiculos { get; set; }
    public DbSet<Evidencia> Evidencias { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<ChecklistEntrada> ChecklistsEntrada { get; set; }
    public DbSet<ChatSala> ChatSalas { get; set; }
    public DbSet<ChatParticipante> ChatParticipantes { get; set; }
    public DbSet<ChatMensagem> ChatMensagens { get; set; }
    public DbSet<ChatSugestao> ChatSugestoes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique(); // Impede e-mails duplicados

        modelBuilder.Entity<DashboardVistoria>()
                .ToView("dashboard_vistorias", "MobileTrucks") // Diz que é uma VIEW
                .HasNoKey(); // Views geralmente não têm chave primária no EF

        // Isso força o EF Core a usar o seu schema específico
        modelBuilder.HasDefaultSchema("MobileTrucks");

        // Aqui definimos que a Placa é a chave única do veículo
        modelBuilder.Entity<Veiculo>()
            .HasKey(v => v.Placa);
        
        // Configuração de Chave Composta para os Participantes do Chat
         modelBuilder.Entity<ChatParticipante>()
            .HasKey(p => new { p.SalaId, p.UsuarioId });

        // CORRIGIDO: Alterado de s.EmpresaId para s.EmpresaNome para refletir o novo modelo de texto puro!
        modelBuilder.Entity<ChatSugestao>()
            .HasIndex(s => new { s.EmpresaNome, s.TextoCurto })
            .HasDatabaseName("IX_ChatSugestoes_Busca"); 

        base.OnModelCreating(modelBuilder);
    }
}