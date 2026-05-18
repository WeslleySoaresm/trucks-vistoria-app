using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeuProjeto.Models;
using System;
using System.Collections.Generic; // Adicionado para IEnumerable
using System.Linq; // Adicionado para consultas LINQ
using System.Threading.Tasks;
using TrucksVistoria.Infrastructure;

namespace SeuProjeto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CheckCarController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CheckCarController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================================
        // NOVO ENDPOINT DE BUSCA (Resolve o erro 404 do Frontend)
        // GET: api/CheckCar/search?term=ABC
        // =========================================================================
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<ChecklistEntrada>>> BuscarRelatorios([FromQuery] string term)
        {
            // Validação básica
            if (string.IsNullOrWhiteSpace(term) || term.Trim().Length < 2)
            {
                // Retorna uma lista vazia ou erro 400 se o termo for muito curto
                return BadRequest(new { mensagem = "O termo de busca deve ter pelo menos 2 caracteres." });
            }

            string searchTerm = term.Trim().ToUpper();

            try
            {
                // Realiza a busca no banco de dados usando EF Core
                // Procuramos por correspondências parciais (contém) na Placa, Cliente ou Modelo.
                var resultados = await _context.ChecklistsEntrada
                    .AsNoTracking() // Melhora performance para apenas leitura
                    .Where(c => c.Placa.ToUpper().Contains(searchTerm) ||
                                c.Cliente.ToUpper().Contains(searchTerm) ||
                                c.Modelo.ToUpper().Contains(searchTerm))
                    .OrderByDescending(c => c.DataCadastro) // Mais recentes primeiro
                    .Take(50) // Limita a 50 resultados para não sobrecarregar
                    .ToListAsync();

                // Se não encontrar nada, retorna a lista vazia (o que está ok)
                return Ok(resultados);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensagem = $"Erro interno na busca: {ex.Message}" });
            }
        }
        // =========================================================================

        // POST: api/CheckCar (Original, não alterado)
        [HttpPost]
        public async Task<IActionResult> SalvarChecklist([FromBody] ChecklistEntrada novoChecklist)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                novoChecklist.DataCadastro = DateTime.UtcNow;
                _context.ChecklistsEntrada.Add(novoChecklist);
                await _context.SaveChangesAsync();

                return Ok(new { mensagem = "Checklist de entrada pericial salvo com sucesso!", id = novoChecklist.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro interno ao salvar no banco: {ex.Message}");
            }
        }

        // GET: api/CheckCar/relatorio/ABC1234 (Original, não alterado)
        // Rota para buscar o relatório final da entrada do carro com base na Placa exata
        [HttpGet("relatorio/{placa}")]
        public async Task<IActionResult> ObterRelatorioPorPlaca(string placa)
        {
            if (string.IsNullOrEmpty(placa)) return BadRequest("Placa inválida.");

            var checklist = await _context.ChecklistsEntrada
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Placa == placa.ToUpper().Trim());

            if (checklist == null)
            {
                return NotFound(new { mensagem = "Nenhum checklist de entrada encontrado para esta placa." });
            }

            return Ok(checklist);
        }
    }
}