using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using TrucksVistoria.Domain.Entities; // Ajuste para o seu namespace correto

namespace TrucksVistoria.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly DbContext _context; // Substitua pelo nome do seu DbContext real (ex: AppDbContext)

        public ChatController(DbContext context)
        {
            _context = context;
        }

        // 1. ENDPOINT: Criar ou buscar uma sala individual/grupo
        [HttpPost("sala")]
        public async Task<IActionResult> CriarOuBuscarSala([FromBody] ChatSala novaSala, [FromQuery] Guid usuarioId2)
        {
            // Validação Multi-tenant: Garante que o isolamento por empresa seja respeitado
            if (novaSala.EmpresaId == Guid.Empty) return BadRequest("EmpresaId é obrigatório.");

            // Se for individual, verifica se já existe um chat entre essas duas pessoas para não duplicar
            if (novaSala.Tipo == "individual")
            {
                var salaExistente = await _context.Set<ChatParticipante>()
                    .Where(p => p.Sala!.EmpresaId == novaSala.EmpresaId && p.Sala.Tipo == "individual")
                    .GroupBy(p => p.SalaId)
                    .Where(g => g.Any(p => p.UsuarioId == novaSala.Id) && g.Any(p => p.UsuarioId == usuarioId2))
                    .Select(g => g.Key)
                    .FirstOrDefaultAsync();

                if (salaExistente != Guid.Empty)
                {
                    var sala = await _context.Set<ChatSala>().FindAsync(salaExistente);
                    return Ok(sala);
                }
            }

            // Se não existir, cria a nova sala no banco usando o EF
            _context.Set<ChatSala>().Add(novaSala);
            await _context.SaveChangesAsync();

            // Adiciona o criador como participante
            var participante1 = new ChatParticipante { SalaId = novaSala.Id, UsuarioId = novaSala.Id }; // Assumindo que o ID do criador veio mapeado
            _context.Set<ChatParticipante>().Add(participante1);

            if (novaSala.Tipo == "individual")
            {
                var participante2 = new ChatParticipante { SalaId = novaSala.Id, UsuarioId = usuarioId2 };
                _context.Set<ChatParticipante>().Add(participante2);
            }

            await _context.SaveChangesAsync();
            return Ok(novaSala);
        }

        // 2. ENDPOINT: Buscar sugestões do Autocomplete ordenadas por maior frequência (Alta Performance)
        [HttpGet("sugestoes/{empresaId}")]
        public async Task<IActionResult> ObterSugestoes(Guid empresaId, [FromQuery] string termo)
        {
            var query = _context.Set<ChatSugestao>()
                .Where(s => s.EmpresaId == empresaId);

            if (!string.IsNullOrEmpty(termo))
            {
                // Filtra pelo atalho digitado (ex: "/fim")
                query = query.Where(s => s.TextoCurto.ToLower().StartsWith(termo.ToLower()));
            }

            // O algoritmo ordena pela frequência de uso: as mais usadas aparecem no topo automaticamente!
            var resultado = await query
                .OrderByDescending(s => s.FrequenciaUso)
                .Take(5) // Limita a 5 resultados para máxima performance de renderização no input
                .ToListAsync();

            return Ok(resultado);
        }

        // 3. ENDPOINT: Incrementar uso da sugestão (Disparado quando o usuário clica no autocomplete)
        [HttpPost("sugestoes/computar-uso/{id}")]
        public async Task<IActionResult> ComputarUsoSugestao(Guid id)
        {
            var sugestao = await _context.Set<ChatSugestao>().FindAsync(id);
            if (sugestao == null) return NotFound();

            sugestao.FrequenciaUso += 1; // Soma 1 ponto no ranking de performance do algoritmo
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}