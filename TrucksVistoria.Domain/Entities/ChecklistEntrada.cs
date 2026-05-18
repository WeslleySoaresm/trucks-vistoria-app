using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeuProjeto.Models
{
    [Table("checklist_entrada")]
    public class ChecklistEntrada
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Required]
        [StringLength(20)]
        [Column("placa")]
        public string Placa { get; set; }

        [StringLength(100)]
        [Column("modelo")]
        public string Modelo { get; set; }

        [StringLength(50)]
        [Column("cor")]
        public string Cor { get; set; }

        [StringLength(20)]
        [Column("ano")]
        public string Ano { get; set; }

        [StringLength(50)]
        [Column("combustivel")]
        public string Combustivel { get; set; }

        [StringLength(50)]
        [Column("km")]
        public string Km { get; set; }

        [Required]
        [StringLength(150)]
        [Column("cliente")]
        public string Cliente { get; set; }

        [StringLength(50)]
        [Column("telefone")]
        public string Telefone { get; set; }

        [StringLength(10)]
        [Column("nivel_combustivel")]
        public string NivelCombustivel { get; set; }

        // Mapeado como string para receber o JSON do Front-end no formato text/jsonb
        [Column("avarias_carro_json", TypeName = "jsonb")] 
        public string AvariasCarroJson { get; set; }

        [Column("checklist_itens_json", TypeName = "jsonb")]
        public string ChecklistItensJson { get; set; }

        [Column("observacoes")]
        public string Observacoes { get; set; }

        [StringLength(150)]
        [Column("criado_por")]
        public string CriadoPor { get; set; }

        [Column("data_cadastro")]
        public DateTime DataCadastro { get; set; } = DateTime.UtcNow;
    }
}