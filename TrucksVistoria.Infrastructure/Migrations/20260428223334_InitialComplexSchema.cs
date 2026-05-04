using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrucksVistoria.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialComplexSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "MobileTrucks");

            migrationBuilder.CreateTable(
                name: "Usuarios",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Cargo = table.Column<string>(type: "text", nullable: false),
                    DataCriacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Veiculos",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Placa = table.Column<string>(type: "text", nullable: false),
                    ClienteNome = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    DataCadastro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Veiculos", x => x.Placa);
                });

            migrationBuilder.CreateTable(
                name: "Vistorias",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Placa = table.Column<string>(type: "text", nullable: false),
                    Equipe = table.Column<string>(type: "text", nullable: false),
                    Cliente = table.Column<string>(type: "text", nullable: false),
                    TipoServico = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: false),
                    Localizacao = table.Column<string>(type: "text", nullable: false),
                    DataCriacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    VeiculoPlaca = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vistorias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vistorias_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalSchema: "MobileTrucks",
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Vistorias_Veiculos_VeiculoPlaca",
                        column: x => x.VeiculoPlaca,
                        principalSchema: "MobileTrucks",
                        principalTable: "Veiculos",
                        principalColumn: "Placa");
                });

            migrationBuilder.CreateTable(
                name: "Evidencias",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UrlFoto = table.Column<string>(type: "text", nullable: false),
                    VistoriaId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evidencias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Evidencias_Vistorias_VistoriaId",
                        column: x => x.VistoriaId,
                        principalSchema: "MobileTrucks",
                        principalTable: "Vistorias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Evidencias_VistoriaId",
                schema: "MobileTrucks",
                table: "Evidencias",
                column: "VistoriaId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Email",
                schema: "MobileTrucks",
                table: "Usuarios",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vistorias_UsuarioId",
                schema: "MobileTrucks",
                table: "Vistorias",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Vistorias_VeiculoPlaca",
                schema: "MobileTrucks",
                table: "Vistorias",
                column: "VeiculoPlaca");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Evidencias",
                schema: "MobileTrucks");

            migrationBuilder.DropTable(
                name: "Vistorias",
                schema: "MobileTrucks");

            migrationBuilder.DropTable(
                name: "Usuarios",
                schema: "MobileTrucks");

            migrationBuilder.DropTable(
                name: "Veiculos",
                schema: "MobileTrucks");
        }
    }
}
