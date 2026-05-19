using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities
{
    [Table("ChatSugestoes", Schema = "MobileTrucks")]
    public class ChatSugestao
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // 1. Isolamento por empresa: cada cliente gestor customiza suas próprias frases rápidas.
        [Required]
        public Guid EmpresaId { get; set; }

        // 2. O gatilho rápido que o usuário digita (Ex: "/atraso")
        [Required]
        [StringLength(50)]
        public string TextoCurto { get; set; } = string.Empty;

        // 3. O texto longo expandido que será enviado no chat (Ex: "Identificamos um atraso na liberação da vistoria.")
        [Required]
        public string TextoCompleto { get; set; } = string.Empty;

        // 4. Toda vez que essa sugestão for usada, incrementamos esse contador. 
        // Nosso algoritmo trará na busca as frases de maior frequência primeiro. Performance pura!
        public int FrequenciaUso { get; set; } = 0;
    }
}