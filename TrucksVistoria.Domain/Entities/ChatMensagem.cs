using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities
{
    [Table("ChatMensagens", Schema = "MobileTrucks")]
    public class ChatMensagem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid SalaId { get; set; }

        [ForeignKey("SalaId")]
        public ChatSala? Sala { get; set; }

        // 1. Identifica quem enviou. Pode ser o Id de um Gestor ou de um Funcionário.
        [Required]
        public Guid RemetenteId { get; set; }

        // 2. Conteúdo de texto. Pode ser nulo se o usuário enviar apenas uma foto ou áudio gravado.
        public string? Texto { get; set; }

        // 3. Armazena a URL gerada pelo Storage do Supabase quando o usuário envia mídia.
        public string? ArquivoUrl { get; set; }

        // 4. Define o tipo da mensagem: "texto", "foto" ou "audio".
        [Required]
        [StringLength(20)]
        public string TipoMidia { get; set; } = "texto";

        public DateTime DataEnvio { get; set; } = DateTime.UtcNow;

        // 5. REGRA DOS RAIOS:
        // Entregue = true ativa o PRIMEIRO RAIO (cinza) no app indicando que chegou no servidor.
        public bool Entregue { get; set; } = true;

        // Visualizado = true ativa o SEGUNDO RAIO (e muda ambos para azul) quando a contraparte abre o chat.
        public bool Visualizado { get; set; } = false;
    }
}