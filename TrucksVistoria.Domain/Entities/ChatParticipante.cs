using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities
{
    [Table("ChatParticipantes", Schema = "MobileTrucks")]
    public class ChatParticipante
    {
        // 1. Vincula o participante a uma sala existente.
        [Required]
        public Guid SalaId { get; set; }

        // 2. Propriedade de navegação do EF Core para facilitar buscas (ex: .Include(p => p.Sala))
        [ForeignKey("SalaId")]
        public ChatSala? Sala { get; set; }

        // 3. Vincula o participante ao ID do usuário da sua tabela 'Usuario.cs'.
        [Required]
        public Guid UsuarioId { get; set; }

        // 4. Salva o momento exato em que o usuário entrou no chat ou grupo.
        public DateTime DataEntrada { get; set; } = DateTime.UtcNow;
    }
}