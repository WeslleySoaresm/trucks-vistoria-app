using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Domain.Entities;
using TrucksVistoria.Infrastructure;

namespace TrucksVistoria.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VistoriaController : ControllerBase
{
    private readonly AppDbContext _context;

    public VistoriaController(AppDbContext context)
    {
        _context = context;
    }

    // POST: api/vistoria
    [HttpPost]
    public async Task<IActionResult> CriarVistoria([FromBody] Vistoria vistoria)
    {
        try
        {
            if (vistoria == null) return BadRequest("Dados inválidos.");

            // Adiciona a vistoria ao banco
            _context.Vistorias.Add(vistoria);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Vistoria salva com sucesso!", id = vistoria.Id });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Erro interno: {ex.Message}");
        }
    }

    // GET: api/vistoria
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Vistoria>>> ListarVistorias()
    {
        return await _context.Vistorias
            .Include(v => v.Evidencias) // Traz as fotos junto
            .OrderByDescending(v => v.DataCriacao)
            .ToListAsync();
    }
}