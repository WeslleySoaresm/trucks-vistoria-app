using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrucksVistoria.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlteraEmpresaParaNome : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmpresaId",
                schema: "MobileTrucks",
                table: "Usuarios");

            migrationBuilder.AddColumn<string>(
                name: "EmpresaNome",
                schema: "MobileTrucks",
                table: "Usuarios",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmpresaNome",
                schema: "MobileTrucks",
                table: "Usuarios");

            migrationBuilder.AddColumn<Guid>(
                name: "EmpresaId",
                schema: "MobileTrucks",
                table: "Usuarios",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
