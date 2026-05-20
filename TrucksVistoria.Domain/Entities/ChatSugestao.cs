using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities
{
    [Table("ChatSugestao", Schema = "MobileTrucks")]
    public class ChatSugestao
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // ALTERADO: Mudamos de Guid para string para isolar os comandos por nome de empresa
        [Required]
        public string EmpresaNome { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string TextoCurto { get; set; } = string.Empty;

        [Required]
        public string TextoCompleto { get; set; } = string.Empty;

        public int FrequenciaUso { get; set; } = 0;
    }
}