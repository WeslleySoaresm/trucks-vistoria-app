using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    
    // ADICIONADO: Campo crucial para isolar os dados por empresa parceira
    [Required]
    public Guid EmpresaId { get; set; } 

    [Column("PasswordHash")]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Column("Cargo")]
    public string Cargo { get; set; } = "Funcionario"; // ex: Admin, Funcionario
    
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    [StringLength(255)]
    public string? FotoUrl { get; set; } 

    [Required]
    [StringLength(20)]
    public string StatusPresenca { get; set; } = "offline"; 

    [Required]
    [StringLength(30)]
    public string TipoUsuario { get; set; } = "funcionario";
}