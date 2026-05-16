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
    // Removemos a transação explícita temporariamente para isolar exatamente onde ocorre o erro
    try
    {
        // 1. Validar e converter o UsuarioId vindo do Front-end
        if (string.IsNullOrWhiteSpace(request.UsuarioId) || !Guid.TryParse(request.UsuarioId, out Guid usuarioGuid))
        {
            return BadRequest("O UsuarioId fornecido é inválido ou está vazio.");
        }

        // 2. Garantir que o Usuário existe no banco de dados local
        var usuarioExiste = await _context.Usuarios.AnyAsync(u => u.Id == usuarioGuid);
        if (!usuarioExiste)
        {
            var novoUsuario = new Usuario
            {
                Id = usuarioGuid,
                Email = $"usuario.{usuarioGuid.ToString().Substring(0,8)}@sistema.com", 
                Nome = "Usuário Mobile"
            };
            _context.Usuarios.Add(novoUsuario);
            await _context.SaveChangesAsync();
        }

        // 3. Upsert do Veículo
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

        // 4. Criar a Vistoria gerando um novo GUID explicitamente
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

        // 5. Vincular Evidências
        if (request.Evidencias != null && request.Evidencias.Any())
        {
            foreach (var fotoUrl in request.Evidencias)
            {
                var evidencia = new Evidencia
                {
                    Id = Guid.NewGuid(), 
                    VistoriaId = idVistoriaNova, 
                    UrlFoto = fotoUrl
                };
                _context.Evidencias.Add(evidencia);
            }
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Vistoria salva com sucesso!", id = idVistoriaNova });
    }
    catch (DbUpdateException dbEx)
    {
        // Captura erros específicos do Banco de Dados (Campos nulos, tamanho excedido, FK)
        var erroInterno = dbEx.InnerException != null ? dbEx.InnerException.Message : dbEx.Message;
        Console.WriteLine($"[Erro de Banco]: {erroInterno}");
        return BadRequest($"Erro de banco de dados: {erroInterno}");
    }
    catch (Exception ex)
    {
        var mensagemErro = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
        Console.WriteLine($"[Erro Geral]: {mensagemErro}");
        return BadRequest($"Erro ao processar: {mensagemErro}");
    }
}
    // Deleta tudo relacionado à vistoria: Vistoria + Evidências (se existirem)
// Alterado para "acoes/excluir-massa" para matar o conflito de rotas de vez
    [HttpDelete("acoes/excluir-massa")]
    public async Task<IActionResult> DeleteMultiple([FromBody] List<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest("Nenhum ID fornecido.");

        try
        {
            var vistorias = await _context.Vistorias
                .Include(v => v.Evidencias)
                .Where(v => ids.Contains(v.Id))
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
            return StatusCode(500, $"Erro interno: {ex.Message}");
        }
    }

    [HttpDelete("{id:guid}")] // Exclui uma vistoria específica e suas evidências relacionadas
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
    public string UsuarioId { get; set; } = string.Empty;
    public List<string> Evidencias { get; set; } = new();
}