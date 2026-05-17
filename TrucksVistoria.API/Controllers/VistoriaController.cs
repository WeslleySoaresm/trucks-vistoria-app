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

    // LISTAR VISTORIAS
    [HttpGet]
    public async Task<IActionResult> GetVistorias()
    {
        var vistorias = await _context.Vistorias
            .Include(v => v.Evidencias)
            .OrderByDescending(v => v.DataCriacao)
            .ToListAsync();
            
        return Ok(vistorias);
    }

    // CRIAR VISTORIA (Direto e simplificado após a remoção da CONSTRAINT no banco)
    [HttpPost]
    public async Task<IActionResult> CriarVistoria([FromBody] VistoriaRequest request)
    {
        try
        {
            // 1. Validar UsuarioId enviado pelo front-end
            if (string.IsNullOrWhiteSpace(request.UsuarioId) || !Guid.TryParse(request.UsuarioId, out Guid usuarioGuid))
            {
                return BadRequest("O UsuarioId fornecido é inválido ou está vazio.");
            }

            // 2. Upsert do Veículo (Garante a existência do registro do carro/caminhão)
            try
            {
                var veiculo = await _context.Veiculos.FirstOrDefaultAsync(v => v.Placa == request.Placa);
                if (veiculo == null)
                {
                    veiculo = new Veiculo 
                    { 
                        Placa = request.Placa, 
                        ClienteNome = string.IsNullOrWhiteSpace(request.Cliente) ? "Não Informado" : request.Cliente
                    };
                    _context.Veiculos.Add(veiculo);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception exVeiculo)
            {
                Console.WriteLine($"[Aviso Veiculo]: {exVeiculo.Message}");
            }

            // 3. Montar e salvar a Vistoria (Aceita qualquer ID enviado do Supabase)
            var idVistoriaNova = Guid.NewGuid();
            var novaVistoria = new Vistoria
            {
                Id = idVistoriaNova, 
                Placa = request.Placa,
                UsuarioId = usuarioGuid, 
                Equipe = request.Equipe ?? "Geral",
                TipoServico = request.TipoServico ?? "Geral",
                Observacao = request.Observacao ?? "",
                Localizacao = request.Localizacao ?? "Não autorizada",
                Status = request.Status ?? "inicial",
                DataCriacao = DateTime.UtcNow
            };

            _context.Vistorias.Add(novaVistoria);
            await _context.SaveChangesAsync();

            // 4. Vincular as imagens da vistoria
            if (request.Evidencias != null && request.Evidencias.Any())
            {
                foreach (var fotoUrl in request.Evidencias)
                {
                    _context.Evidencias.Add(new Evidencia
                    {
                        Id = Guid.NewGuid(), 
                        VistoriaId = idVistoriaNova, 
                        UrlFoto = fotoUrl
                    });
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Vistoria salva com sucesso!", id = idVistoriaNova });
        }
        catch (Exception exGeral)
        {
            var erroInterno = exGeral.InnerException != null ? exGeral.InnerException.Message : exGeral.Message;
            return BadRequest($"Erro crítico geral ao salvar: {erroInterno}");
        }
    }

    // EXCLUSÃO EM MASSA
    [HttpDelete("acoes/excluir-massa")]
    public async Task<IActionResult> DeleteMultiple([FromBody] List<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest("Nenhum ID fornecido.");

        try
        {
            var vistorias = await _context.Vistorias
                .Include(v => v.Evidencias)
                .Where(v => v.Id != null && ids.Contains(v.Id.Value)) 
                .ToListAsync();

            if (vistorias.Count == 0)
                return NotFound("Nenhum registro encontrado para os IDs informados.");

            foreach (var v in vistorias)
            {
                if (v.Evidencias != null && v.Evidencias.Any())
                {
                    _context.Evidencias.RemoveRange(v.Evidencias);
                }
            }

            _context.Vistorias.RemoveRange(vistorias);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"{vistorias.Count} registros excluídos com sucesso." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Erro interno ao excluir em massa: {ex.Message}");
        }
    }

    // EXCLUSÃO UNITÁRIA
    [HttpDelete("{id:guid}")] 
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
            return BadRequest($"Erro ao excluir: {ex.Message}");
        }
    }
} 

public class VistoriaRequest
{
    public string Placa { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string Equipe { get; set; } = string.Empty;
    public string TipoServico { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public string Localizacao { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string UsuarioId { get; set; } = string.Empty;
    public List<string> Evidencias { get; set; } = new();
}