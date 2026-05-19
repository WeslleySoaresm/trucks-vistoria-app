using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrucksVistoria.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CriarEstruturaChatEDominio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FotoUrl",
                schema: "MobileTrucks",
                table: "Usuarios",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusPresenca",
                schema: "MobileTrucks",
                table: "Usuarios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TipoUsuario",
                schema: "MobileTrucks",
                table: "Usuarios",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ChatSalas",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmpresaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DataCriacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatSalas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ChatSugestoes",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmpresaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TextoCurto = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TextoCompleto = table.Column<string>(type: "text", nullable: false),
                    FrequenciaUso = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatSugestoes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ChatMensagens",
                schema: "MobileTrucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SalaId = table.Column<Guid>(type: "uuid", nullable: false),
                    RemetenteId = table.Column<Guid>(type: "uuid", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: true),
                    ArquivoUrl = table.Column<string>(type: "text", nullable: true),
                    TipoMidia = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DataEnvio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Entregue = table.Column<bool>(type: "boolean", nullable: false),
                    Visualizado = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMensagens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMensagens_ChatSalas_SalaId",
                        column: x => x.SalaId,
                        principalSchema: "MobileTrucks",
                        principalTable: "ChatSalas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ChatParticipantes",
                schema: "MobileTrucks",
                columns: table => new
                {
                    SalaId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    DataEntrada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatParticipantes", x => new { x.SalaId, x.UsuarioId });
                    table.ForeignKey(
                        name: "FK_ChatParticipantes_ChatSalas_SalaId",
                        column: x => x.SalaId,
                        principalSchema: "MobileTrucks",
                        principalTable: "ChatSalas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMensagens_SalaId",
                schema: "MobileTrucks",
                table: "ChatMensagens",
                column: "SalaId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSugestoes_Busca",
                schema: "MobileTrucks",
                table: "ChatSugestoes",
                columns: new[] { "EmpresaId", "TextoCurto" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatMensagens",
                schema: "MobileTrucks");

            migrationBuilder.DropTable(
                name: "ChatParticipantes",
                schema: "MobileTrucks");

            migrationBuilder.DropTable(
                name: "ChatSugestoes",
                schema: "MobileTrucks");

            migrationBuilder.DropTable(
                name: "ChatSalas",
                schema: "MobileTrucks");

            migrationBuilder.DropColumn(
                name: "FotoUrl",
                schema: "MobileTrucks",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "StatusPresenca",
                schema: "MobileTrucks",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "TipoUsuario",
                schema: "MobileTrucks",
                table: "Usuarios");
        }
    }
}
