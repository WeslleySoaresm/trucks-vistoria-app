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

    // LISTAR VISTORIAS (Necessário para o Dashboard carregar os dados)
    [HttpGet]
    public async Task<IActionResult> GetVistorias()
    {
        var vistorias = await _context.Vistorias
            .Include(v => v.Evidencias)
            .OrderByDescending(v => v.DataCriacao)
            .ToListAsync();
            
        return Ok(vistorias);
    }

    [HttpPost]
    public async Task<IActionResult> CriarVistoria([FromBody] VistoriaRequest request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // 1. Upsert do Veículo
            var veiculo = await _context.Veiculos.FirstOrDefaultAsync(v => v.Placa == request.Placa);
            if (veiculo == null)
            {
                veiculo = new Veiculo 
                { 
                    Placa = request.Placa, 
                    ClienteNome = request.Cliente ?? "Não Informado" 
                };
                _context.Veiculos.Add(veiculo);
            }

            // 2. Criar a Vistoria
            var novaVistoria = new Vistoria
            {
                Placa = request.Placa,
                UsuarioId = request.UsuarioId,
                Equipe = request.Equipe,
                TipoServico = request.TipoServico,
                Observacao = request.Observacao,
                Localizacao = request.Localizacao,
                Status = request.Status,
                DataCriacao = DateTime.UtcNow
            };

            _context.Vistorias.Add(novaVistoria);
            await _context.SaveChangesAsync();

            // 3. Vincular Evidências
            if (request.Evidencias != null && request.Evidencias.Any())
            {
                foreach (var fotoUrl in request.Evidencias)
                {
                    var evidencia = new Evidencia
                    {
                        VistoriaId = novaVistoria.Id.Value, // Usando .Value pois o Id na Entity pode ser Guid?
                        UrlFoto = fotoUrl
                    };
                    _context.Evidencias.Add(evidencia);
                }
                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();
            return Ok(new { message = "Vistoria salva com sucesso!", id = novaVistoria.Id });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Erro ao processar: {ex.Message}");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirVistoria(Guid id)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var vistoria = await _context.Vistorias
                .Include(v => v.Evidencias)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (vistoria == null) return NotFound("Vistoria não encontrada.");

            if (vistoria.Evidencias.Any())
            {
                _context.Evidencias.RemoveRange(vistoria.Evidencias);
            }

            _context.Vistorias.Remove(vistoria);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Excluída com sucesso!" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Erro: {ex.Message}");
        }
    }
} // <--- Classe fecha aqui

public class VistoriaRequest
{
    public string Placa { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string Equipe { get; set; } = string.Empty;
    public string TipoServico { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public string Localizacao { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid UsuarioId { get; set; } 
    public List<string> Evidencias { get; set; } = new();
}