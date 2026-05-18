using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeuProjeto.Models;
using System;
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

        // POST: api/CheckCar
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

        // GET: api/CheckCar/relatorio/ABC1234
        // Rota para buscar o relatório final da entrada do carro com base na Placa
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