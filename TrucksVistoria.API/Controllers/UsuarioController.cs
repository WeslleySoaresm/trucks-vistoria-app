using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using TrucksVistoria.Infrastructure; 
using TrucksVistoria.Domain.Entities;

namespace MobileTrucks.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuarioController : ControllerBase
    {
        private readonly AppDbContext _context; 

        public UsuarioController(AppDbContext context)
        {
            _context = context;
        }

        // 1. POST: api/usuario
        // Alterado para receber 'UsuarioRequest' para blindar a API e evitar o erro CS1061/CS1503
        [HttpPost]
        public async Task<IActionResult> CadastrarUsuario([FromBody] UsuarioRequest model)
        {
            if (model == null)
            {
                return BadRequest("Dados inválidos.");
            }

            try
            {
                // Mapeia o DTO de entrada para a Entidade do Banco de Dados de forma explícita
                var novoUsuario = new TrucksVistoria.Domain.Entities.Usuario
                {
                    Id = model.Id == Guid.Empty ? Guid.NewGuid() : model.Id,
                    Nome = model.Nome,
                    Email = model.Email.ToLower().Trim(),
                    EmpresaId = model.EmpresaId, // 👈 Vincula com segurança
                    TipoUsuario = model.TipoUsuario,
                    StatusPresenca = model.StatusPresenca ?? "offline",
                    FotoUrl = model.FotoUrl
                };

                _context.Usuarios.Add(novoUsuario);
                await _context.SaveChangesAsync();

                return Ok(novoUsuario);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro interno ao salvar: {ex.Message}");
            }
        }

        // 2. GET: api/usuario?empresaId=GUID
        [HttpGet]
        public async Task<IActionResult> ListarPorEmpresa([FromQuery] Guid empresaId)
        {
            try
            {
                // IMPORTANTE: Garanta que na sua classe 'Usuario' dentro de Domain.Entities, 
                // a propriedade se chame exatamente 'EmpresaId' com 'I' maiúsculo e 'd' minúsculo.
                var usuarios = await _context.Usuarios
                    .Where(u => u.EmpresaId == empresaId)
                    .ToListAsync();

                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao buscar usuários: {ex.Message}");
            }
        }
    }

    // Modelo de apoio ajustado para evitar Warnings de nulos do .NET 9 (CS8618)
    public class UsuarioRequest
    {
        public Guid Id { get; set; }
        public required string Nome { get; set; }
        public required string Email { get; set; }
        public required Guid EmpresaId { get; set; }
        public required string TipoUsuario { get; set; }
        public string? StatusPresenca { get; set; }
        public string? FotoUrl { get; set; }
    }
}