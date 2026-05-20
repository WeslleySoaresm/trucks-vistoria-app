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
        [HttpPost]
        public async Task<IActionResult> CadastrarUsuario([FromBody] UsuarioRequest model)
        {
            if (model == null)
            {
                return BadRequest("Dados inválidos.");
            }

            try
            {
                var novoUsuario = new TrucksVistoria.Domain.Entities.Usuario
                {
                    Id = model.Id == Guid.Empty ? Guid.NewGuid() : model.Id,
                    Nome = model.Nome,
                    Email = model.Email.ToLower().Trim(),
                    EmpresaNome = model.EmpresaNome.Trim(), // 👈 Atribuição direta da string limpa
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

        // 2. GET: api/usuario?empresaNome=TEXTO
        // CORRIGIDO: Modificado de 'Guid empresaId' para 'string empresaNome' para habilitar o isolamento nominal solicitado
        [HttpGet]
        public async Task<IActionResult> ListarPorEmpresa([FromQuery] string? empresaNome)
        {
            if (string.IsNullOrWhiteSpace(empresaNome))
            {
                return BadRequest("O parâmetro 'empresaNome' é obrigatório.");
            }

            try
            {
                // Busca ignorando espaçamentos marginais e case-sensitivity
                var usuarios = await _context.Usuarios
                    .Where(u => u.EmpresaNome.ToLower() == empresaNome.ToLower().Trim())
                    .ToListAsync();

                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao buscar usuários: {ex.Message}");
            }
        }
    }

    public class UsuarioRequest
    {
        public Guid Id { get; set; }
        public required string Nome { get; set; }
        public required string Email { get; set; }
        public required string EmpresaNome { get; set; } // 👈 Modificado de Guid para string
        public required string TipoUsuario { get; set; }
        public string? StatusPresenca { get; set; }
        public string? FotoUrl { get; set; }
    }
}