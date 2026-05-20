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
                // Mapeia o DTO de entrada para a Entidade do Banco de Dados de forma explícita
                var novoUsuario = new TrucksVistoria.Domain.Entities.Usuario
                {
                    Id = model.Id == Guid.Empty ? Guid.NewGuid() : model.Id,
                    Nome = model.Nome,
                    Email = model.Email.ToLower().Trim(),
                    
                    // ALTERADO: Mapeia o texto da empresa tratando espaços e letras maiúsculas
                    EmpresaNome = model.EmpresaNome.ToLower().Trim(), 
                    
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

        // 2. GET: api/usuario?empresaNome=nome_da_empresa
        [HttpGet]
        public async Task<IActionResult> ListarPorEmpresa([FromQuery] string empresaNome)
        {
            if (string.IsNullOrEmpty(empresaNome))
            {
                return BadRequest("O nome da empresa é obrigatório.");
            }

            try
            {
                // ALTERADO: O filtro do chat agora compara strings de forma segura
                var usuarios = await _context.Usuarios
                    .Where(u => u.EmpresaNome == empresaNome.ToLower().Trim())
                    .ToListAsync();

                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao buscar usuários: {ex.Message}");
            }
        }
    }

    // Modelo de apoio ajustado com os tipos em String para o nome da empresa
    public class UsuarioRequest
    {
        public Guid Id { get; set; }
        public required string Nome { get; set; }
        public required string Email { get; set; }
        public required string EmpresaNome { get; set; } // 👈 Alterado para string
        public required string TipoUsuario { get; set; }
        public string? StatusPresenca { get; set; }
        public string? FotoUrl { get; set; }
    }
}