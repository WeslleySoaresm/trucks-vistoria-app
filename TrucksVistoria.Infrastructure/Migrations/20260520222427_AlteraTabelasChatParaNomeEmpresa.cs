using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrucksVistoria.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlteraTabelasChatParaNomeEmpresa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ChatSugestoes",
                schema: "MobileTrucks",
                table: "ChatSugestoes");

            migrationBuilder.DropIndex(
                name: "IX_ChatSugestoes_Busca",
                schema: "MobileTrucks",
                table: "ChatSugestoes");

            migrationBuilder.DropColumn(
                name: "EmpresaId",
                schema: "MobileTrucks",
                table: "ChatSalas");

            migrationBuilder.DropColumn(
                name: "EmpresaId",
                schema: "MobileTrucks",
                table: "ChatSugestoes");

            migrationBuilder.RenameTable(
                name: "ChatSugestoes",
                schema: "MobileTrucks",
                newName: "ChatSugestao",
                newSchema: "MobileTrucks");

            migrationBuilder.AddColumn<string>(
                name: "EmpresaNome",
                schema: "MobileTrucks",
                table: "ChatSalas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmpresaNome",
                schema: "MobileTrucks",
                table: "ChatSugestao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ChatSugestao",
                schema: "MobileTrucks",
                table: "ChatSugestao",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSugestoes_Busca",
                schema: "MobileTrucks",
                table: "ChatSugestao",
                columns: new[] { "EmpresaNome", "TextoCurto" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ChatSugestao",
                schema: "MobileTrucks",
                table: "ChatSugestao");

            migrationBuilder.DropIndex(
                name: "IX_ChatSugestoes_Busca",
                schema: "MobileTrucks",
                table: "ChatSugestao");

            migrationBuilder.DropColumn(
                name: "EmpresaNome",
                schema: "MobileTrucks",
                table: "ChatSalas");

            migrationBuilder.DropColumn(
                name: "EmpresaNome",
                schema: "MobileTrucks",
                table: "ChatSugestao");

            migrationBuilder.RenameTable(
                name: "ChatSugestao",
                schema: "MobileTrucks",
                newName: "ChatSugestoes",
                newSchema: "MobileTrucks");

            migrationBuilder.AddColumn<Guid>(
                name: "EmpresaId",
                schema: "MobileTrucks",
                table: "ChatSalas",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "EmpresaId",
                schema: "MobileTrucks",
                table: "ChatSugestoes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_ChatSugestoes",
                schema: "MobileTrucks",
                table: "ChatSugestoes",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSugestoes_Busca",
                schema: "MobileTrucks",
                table: "ChatSugestoes",
                columns: new[] { "EmpresaId", "TextoCurto" });
        }
    }
}
