using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;
using TrucksVistoria.Domain.Entities;

namespace MobileTrucks.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        // 1. POST: api/chat/sala (Abre ou cria chat entre 2 usuários)
        [HttpPost("sala")]
        public async Task<IActionResult> ObterOuCriarSala([FromQuery] Guid usuarioId2, [FromBody] NovaSalaRequest request)
        {
            // Pega o ID do usuário que está logado a partir do contexto ou requisição (ajuste conforme seu padrão)
            // Aqui vamos focar em salvar a sala com o EmpresaNome vindo do front-end
            
            try 
            {
                // Verifica se já existe uma sala individual para esses participantes na mesma empresa
                // (Sua lógica nativa de busca de sala existente permanece aqui...)

                // Se não existir, cria uma nova sala usando o nome textual da empresa:
                var novaSala = new ChatSala
                {
                    Id = Guid.NewGuid(),
                    EmpresaNome = request.EmpresaNome.ToLower().Trim(), // 👈 Salvando "juniorcar"
                    Tipo = request.Tipo ?? "individual"
                };

                _context.ChatSalas.Add(novaSala);
                await _context.SaveChangesAsync();

                return Ok(novaSala);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao criar sala: {ex.Message}");
            }
        }

        // 2. GET: api/chat/sugestoes/juniorcar?termo=/
        [HttpGet("sugestoes/{empresaNome}")]
        public async Task<IActionResult> ObterSugestoes([FromRoute] string empresaNome, [FromQuery] string termo)
        {
            try
            {
                var sugestoes = await _context.ChatSugestoes
                    .Where(s => s.EmpresaNome.ToLower() == empresaNome.ToLower().Trim() && 
                                s.TextoCurto.ToLower().Contains(termo.ToLower()))
                    .OrderByDescending(s => s.FrequenciaUso)
                    .ToListAsync();

                return Ok(sugestoes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao buscar atalhos: {ex.Message}");
            }
        }
    }

    // DTO de apoio corrigido para receber String
    public class NovaSalaRequest
    {
        public required string EmpresaNome { get; set; } // 👈 Mudado para string!
        public string? Tipo { get; set; }
    }
}