namespace TrucksVistoria.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Cargo { get; set; } = "Funcionario"; // ex: Admin, Funcionario
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
}