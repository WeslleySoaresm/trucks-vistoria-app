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
    var idVistoriaNova = Guid.NewGuid();
    try
    {
        if (string.IsNullOrWhiteSpace(request.UsuarioId) || !Guid.TryParse(request.UsuarioId, out Guid usuarioGuid))
        {
            return BadRequest("O UsuarioId fornecido é inválido ou está vazio.");
        }

        // 1. Garantir a existência do Veículo (Upsert)
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
        catch (Exception exVeiculo) { Console.WriteLine($"[Aviso Veiculo]: {exVeiculo.Message}"); }

        // 2. Verificar antecipadamente se o utilizador existe na tabela local
        var usuarioExiste = await _context.Set<Usuario>().AnyAsync(u => u.Id == usuarioGuid);
        
        Guid idParaSalvar = usuarioGuid;

        // Se o utilizador não existir (caso do Admin do Supabase Auth que não está na tabela local)
        if (!usuarioExiste)
        {
            // Tenta encontrar o primeiro utilizador da equipa que já funcione
            var usuarioValido = await _context.Set<Usuario>().FirstOrDefaultAsync();
            
            // Se encontrar, usa o dele. Se não encontrar nenhum, usa o ID fixo do Administrador Central que criámos no SQL
            idParaSalvar = usuarioValido != null ? usuarioValido.Id : Guid.Parse("99999999-9999-9999-9999-999999999999");
        }

        // 3. Montar o objeto da Vistoria com a Observação 100% LIMPA
        var novaVistoria = new Vistoria
        {
            Id = idVistoriaNova, 
            Placa = request.Placa,
            UsuarioId = idParaSalvar, 
            Equipe = request.Equipe ?? "Geral",
            TipoServico = request.TipoServico ?? "Geral",
            // Mantém APENAS o que o utilizador digitou no formulário. Se não digitou nada, fica vazio.
            Observacao = request.Observacao ?? "", 
            Localizacao = request.Localizacao ?? "Não autorizada",
            Status = request.Status ?? "inicial",
            DataCriacao = DateTime.UtcNow
        };

        _context.Vistorias.Add(novaVistoria);
        
        try {
            if (_context.Entry(novaVistoria).Metadata.FindProperty("VeiculoPlaca") != null)
                _context.Entry(novaVistoria).Property("VeiculoPlaca").CurrentValue = request.Placa;
        } catch { }

        await _context.SaveChangesAsync();

        // 4. Processamento das Evidências (Fotos)
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
        _context.ChangeTracker.Clear();
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
    
    // HISTÓRICO DE CLIENTES (Busca direta na tabela de vistorias para mostrar os clientes já digitados)
    [HttpGet("clientes-historico")]
    public async Task<IActionResult> GetClientesHistorico()
    {
        try
        {
            // Vai buscar direto na tabela de vistorias todos os clientes já digitados
            var clientes = await _context.Vistorias
                .Where(v => !string.IsNullOrEmpty(v.Cliente))
                .Select(v => v.Cliente.Trim().ToUpper())
                .Distinct() // Remove os nomes duplicados
                .OrderBy(nome => nome)
                .ToListAsync();

            return Ok(clientes);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Erro ao buscar histórico: {ex.Message}");
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