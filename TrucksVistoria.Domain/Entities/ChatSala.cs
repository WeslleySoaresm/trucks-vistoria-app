using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities
{
    [Table("ChatSalas", Schema = "MobileTrucks")]
    public class ChatSala
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // ALTERADO: Mudamos de Guid para string para bater com o "JuniorCar" que o front-end envia
        [Required]
        public string EmpresaNome { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Nome { get; set; }

        [Required]
        [StringLength(20)]
        public string Tipo { get; set; } = "individual";

        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}