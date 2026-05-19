using System.ComponentModel.DataAnnotations;
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

    [StringLength(255)]
    public string? FotoUrl { get; set; } 
    // 1. Armazena o link da imagem (gerada no bucket do Supabase). 
    // Se estiver nulo, o frontend usará as iniciais do nome do usuário.

    [Required]
    [StringLength(20)]
    public string StatusPresenca { get; set; } = "offline"; 
    // 2. Os valores aceitos serão estritamente: "online", "pausa" ou "offline".
    // Por padrão, todo usuário começa offline ao deslogar ou fechar o app.

    [Required]
    [StringLength(30)]
    public string TipoUsuario { get; set; } = "funcionario";
    // 3. Define a hierarquia: "gestor" ou "funcionario".
    // O chat usará isso para saber se cria uma sala privada ou se lista todo o time do grupo.
}