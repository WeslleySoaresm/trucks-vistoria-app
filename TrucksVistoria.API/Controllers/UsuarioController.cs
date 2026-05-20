using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
// 1. ADICIONE as referências das suas outras camadas do projeto:
using TrucksVistoria.Infrastructure; // Ajuste para a pasta real do seu DbContext
using TrucksVistoria.Domain.Entities;
using TrucksVistoria.Infrastructure;     // Se a classe Usuario estiver na camada de Domain

namespace MobileTrucks.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuarioController : ControllerBase
    {
        // 2. ALTERE de 'YourDbContext' para o nome correto do seu contexto (Ex: AppDbContext)
        private readonly AppDbContext _context; 

        public UsuarioController(AppDbContext context)
        {
            _context = context;
        }

        // 1. POST: api/Usuario (Usado pelo seu FormCadastroUsuario.jsx)
        [HttpPost]
        public async Task<IActionResult> CadastrarUsuario([FromBody] Usuario model)
        {
            if (model == null)
            {
                return BadRequest("Dados inválidos.");
            }

            try
            {
                // Garante que o ID seja gerado caso não venha do front
                if (model.Id == Guid.Empty)
                {
                    model.Id = Guid.NewGuid();
                }

                _context.Usuarios.Add(model);
                await _context.SaveChangesAsync();

                return Ok(model);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro interno ao salvar: {ex.Message}");
            }
        }

        // 2. GET: api/Usuario?empresaId=GUID (Usado pelo seu ChatInterno.jsx)
        [HttpGet]
        public async Task<IActionResult> ListarPorEmpresa([FromQuery] Guid empresaId)
        {
            try
            {
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

    // Modelo de apoio (Caso você já não tenha a classe Usuario.cs em seu projeto)
    public class Usuario
    {
        public Guid Id { get; set; }
        public string Nome { get; set; }
        public string Email { get; set; }
        public Guid EmpresaId { get; set; }
        public string TipoUsuario { get; set; }
        public string StatusPresenca { get; set; }
        public string FotoUrl { get; set; }
    }
}