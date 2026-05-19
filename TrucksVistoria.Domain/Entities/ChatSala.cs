using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrucksVistoria.Domain.Entities
{
    // 1. O [Table] força o EF a mapear para o schema correto (MobileTrucks) em vez do public padrão.
    [Table("ChatSalas", Schema = "MobileTrucks")]
    public class ChatSala
    {
        // 2. Definimos o Id como Guid (UUID no Postgres) gerando um novo por padrão.
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // 3. O EmpresaId garante o isolamento total (Multi-tenant). 
        // Nenhuma empresa consegue ler ou interceptar IDs de outra empresa.
        [Required]
        public Guid EmpresaId { get; set; }

        // 4. Nome do grupo. Como conversas individuais não têm nome de grupo, usamos a interrogação (?) para permitir nulo.
        [StringLength(100)]
        public string? Nome { get; set; }

        // 5. Tipo da sala: "individual" ou "grupo". Definimos um valor padrão inicial.
        [Required]
        [StringLength(20)]
        public string Tipo { get; set; } = "individual";

        // 6. Registra quando a sala foi aberta para auditoria ou ordenação na listagem do app.
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}