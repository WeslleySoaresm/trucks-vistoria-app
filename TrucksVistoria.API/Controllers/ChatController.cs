using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;
using TrucksVistoria.Domain.Entities;
using System;
using System.Threading.Tasks;
using System.Linq;

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

        // 1. POST: api/chat/sala
        [HttpPost("sala")]
        public async Task<IActionResult> ObterOuCriarSala([FromBody] NovaSalaRequest request)
        {
            try 
            {
                if (string.IsNullOrWhiteSpace(request.EmpresaNome))
                    return BadRequest("O nome da empresa é obrigatório.");

                string empresaNormalizada = request.EmpresaNome.ToLower().Trim();

                var salaExistente = await _context.ChatSalas
                    .FirstOrDefaultAsync(s => s.EmpresaNome.ToLower() == empresaNormalizada && s.Tipo == "individual");

                if (salaExistente != null)
                {
                    return Ok(salaExistente);
                }

                var novaSala = new ChatSala
                {
                    Id = Guid.NewGuid(),
                    EmpresaNome = empresaNormalizada,
                    Tipo = request.Tipo ?? "individual",
                    DataCriacao = DateTime.UtcNow
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

        // 2. POST: api/chat/mensagem (SALVA A MENSAGEM NO BANCO - FIM DO ERRO 404)
        [HttpPost("mensagem")]
        public async Task<IActionResult> EnviarMensagem([FromBody] NovaMensagemRequest request)
        {
            try
            {
                var novaMensagem = new ChatMensagem
                {
                    Id = Guid.NewGuid(),
                    SalaId = request.SalaId,
                    RemetenteId = request.RemetenteId,
                    Texto = request.Texto,
                    TipoMidia = request.TipoMidia ?? "texto",
                    DataEnvio = DateTime.UtcNow,
                    Entregue = true,
                    Visualizado = false
                };

                _context.ChatMensagens.Add(novaMensagem);
                await _context.SaveChangesAsync();

                return Ok(novaMensagem);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao enviar mensagem: {ex.Message}");
            }
        }

        // 3. GET: api/chat/mensagens/{salaId} (TRAZ O HISTÓRICO DAS MENSAGENS)
        [HttpGet("mensagens/{salaId}")]
        public async Task<IActionResult> ObterMensagens(Guid salaId)
        {
            try
            {
                var mensagens = await _context.ChatMensagens
                    .Where(m => m.SalaId == salaId)
                    .OrderBy(m => m.DataEnvio)
                    .ToListAsync();

                return Ok(mensagens);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao recuperar mensagens: {ex.Message}");
            }
        }

        // 4. GET: api/chat/sugestoes/juniorcar?termo=/
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

    public class NovaSalaRequest
    {
        public required string EmpresaNome { get; set; }
        public string? Tipo { get; set; }
    }

    public class NovaMensagemRequest
    {
        public required Guid SalaId { get; set; }
        public required Guid RemetenteId { get; set; }
        public string? Texto { get; set; }
        public string? TipoMidia { get; set; }
    }
}