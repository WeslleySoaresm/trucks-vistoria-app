using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TrucksVistoria.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarCheckCarTabela : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "checklist_entrada",
                schema: "MobileTrucks",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    placa = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    modelo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    cor = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ano = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    combustivel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    km = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    cliente = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    telefone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    nivel_combustivel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    avarias_carro_json = table.Column<string>(type: "jsonb", nullable: false),
                    checklist_itens_json = table.Column<string>(type: "jsonb", nullable: false),
                    observacoes = table.Column<string>(type: "text", nullable: false),
                    criado_por = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    data_cadastro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checklist_entrada", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "checklist_entrada",
                schema: "MobileTrucks");
        }
    }
}
