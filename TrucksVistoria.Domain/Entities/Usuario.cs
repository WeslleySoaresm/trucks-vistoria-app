using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    [Column("PasswordHash")]
    public string PasswordHash { get; set; } = string.Empty;
    [Column("Cargo")]
    public string Cargo { get; set; } = "Funcionario"; // ex: Admin, Funcionario
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
}