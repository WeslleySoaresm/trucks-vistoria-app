using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Domain.Entities;

namespace TrucksVistoria.Infrastructure;
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<DashboardVistoria> DashboardVistorias { get; set; }
    public DbSet<Vistoria> Vistorias { get; set; }
    public DbSet<Veiculo> Veiculos { get; set; }
    public DbSet<Evidencia> Evidencias { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }

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
            
        base.OnModelCreating(modelBuilder);
    }
}