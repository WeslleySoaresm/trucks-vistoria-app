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

    // CRIAR VISTORIA (Com tratamento contra quebra de FK de Usuário)
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

        // 2. Upsert do Veículo (Isolado)
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

        // 3. Montar objeto da Vistoria com os dados originais
        var idVistoriaNova = Guid.NewGuid();
        var novaVistoria = new Vistoria
        {
            Id = idVistoriaNova, 
            Placa = request.Placa,
            UsuarioId = usuarioGuid, // Tentativa inicial com o ID do usuário logado
            Equipe = request.Equipe ?? "Geral",
            TipoServico = request.TipoServico ?? "Geral",
            Observacao = request.Observacao ?? "",
            Localizacao = request.Localizacao ?? "Não autorizada",
            Status = request.Status ?? "inicial",
            DataCriacao = DateTime.UtcNow
        };

        try
        {
            _context.Vistorias.Add(novaVistoria);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx)
        {
            var erroInterno = dbEx.InnerException?.Message ?? dbEx.Message;
            
            // Se falhar por restrição de Chave Estrangeira do Usuário (23503)
            if (erroInterno.Contains("FK_Vistorias_Usuarios_UsuarioId") || erroInterno.Contains("23503"))
            {
                // Remove a entidade travada do rastreamento do Entity Framework para limpar o cache de erro
                _context.Entry(novaVistoria).State = EntityState.Detached;

                return await SalvarVistoriaComUsuarioValido(request, idVistoriaNova);
            }

            return BadRequest($"Erro estrutural na tabela Vistorias: {erroInterno}");
        }

        // 4. Salvar Evidências se a vistoria foi criada com sucesso
        await VincularEvidencias(idVistoriaNova, request.Evidencias);

        return Ok(new { message = "Vistoria salva com sucesso!", id = idVistoriaNova });
    }
    catch (Exception exGeral)
    {
        return BadRequest($"Erro crítico geral: {exGeral.InnerException?.Message ?? exGeral.Message}");
    }
}

// Método auxiliar de contingência avançada
private async Task<IActionResult> SalvarVistoriaComUsuarioValido(VistoriaRequest request, Guid idVistoriaNova)
{
    try
    {
        // Busca o primeiro usuário cadastrado fisicamente na tabela local do banco
        var usuarioValido = await _context.Set<TrucksVistoria.Domain.Entities.Usuario>().FirstOrDefaultAsync();
        Guid idUsuarioParaVinculo;

        if (usuarioValido != null)
        {
            idUsuarioParaVinculo = usuarioValido.Id;
        }
        else
        {
            // Se a tabela de usuários estiver 100% vazia, criamos um usuário padrão de sistema na força bruta
            idUsuarioParaVinculo = Guid.Parse("99999999-9999-9999-9999-999999999999");
            
            var queryInsercaoDireta = $@"
                INSERT INTO ""MobileTrucks"".""Usuarios"" (""Id"", ""Nome"", ""Email"", ""DataCadastro"") 
                VALUES ('{idUsuarioParaVinculo}', 'Usuario Sistema', 'sistema@trucks.com', '{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}');";
            
            await _context.Database.ExecuteSqlRawAsync(queryInsercaoDireta);
        }

        // Monta a nova vistoria apontando para o ID físico garantido
        var vistoriaContingencia = new Vistoria
        {
            Id = idVistoriaNova,
            Placa = request.Placa,
            UsuarioId = idUsuarioParaVinculo,
            Observacao = $"[User original Supabase: {request.UsuarioId}] " + (request.Observacao ?? ""),
            Equipe = request.Equipe ?? "Geral",
            TipoServico = request.TipoServico ?? "Geral",
            Localizacao = request.Localizacao ?? "Não autorizada",
            Status = request.Status ?? "inicial",
            DataCriacao = DateTime.UtcNow
        };

        _context.Vistorias.Add(vistoriaContingencia);
        await _context.SaveChangesAsync();

        // Vincula as fotos à vistoria criada na contingência
        await VincularEvidencias(idVistoriaNova, request.Evidencias);

        return Ok(new { message = "Vistoria salva com sucesso em modo de compatibilidade!", id = idVistoriaNova });
    }
    catch (Exception ex)
    {
        return BadRequest($"Falha na contingência de chaves: {ex.InnerException?.Message ?? ex.Message}");
    }
}

// Método auxiliar para processar as evidências de forma limpa
private async Task VincularEvidencias(Guid vistoriaId, List<string> evidenciasUrls)
{
    if (evidenciasUrls != null && evidenciasUrls.Any())
    {
        foreach (var fotoUrl in evidenciasUrls)
        {
            _context.Evidencias.Add(new Evidencia
            {
                Id = Guid.NewGuid(), 
                VistoriaId = vistoriaId, 
                UrlFoto = fotoUrl
            });
        }
        await _context.SaveChangesAsync();
    }
}
    private async Task<IActionResult> SalvarVistoriaContingencia(VistoriaRequest request)
    {
        try
        {
            var idVistoriaNova = Guid.NewGuid();
            var novaVistoria = new Vistoria
            {
                Id = idVistoriaNova,
                Placa = request.Placa,
                UsuarioId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa7"), 
                Observacao = $"[UserSupabase: {request.UsuarioId}] " + (request.Observacao ?? ""),
                Equipe = request.Equipe ?? "Geral",
                TipoServico = request.TipoServico ?? "Geral",
                Localizacao = request.Localizacao ?? "Não autorizada",
                Status = request.Status ?? "inicial",
                DataCriacao = DateTime.UtcNow
            };

            _context.Vistorias.Add(novaVistoria);
            await _context.SaveChangesAsync();

            if (request.Evidencias != null && request.Evidencias.Any())
            {
                foreach (var fotoUrl in request.Evidencias)
                {
                    _context.Evidencias.Add(new Evidencia { Id = Guid.NewGuid(), VistoriaId = idVistoriaNova, UrlFoto = fotoUrl });
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Vistoria salva em modo de compatibilidade!", id = idVistoriaNova });
        }
        catch (Exception ex)
        {
            return BadRequest($"Erro crítico na contingência: {ex.Message}");
        }
    }

    // EXCLUSÃO EM MASSA (CORRIGIDO: Adicionado o .Value no mapeamento do LINQ)
    [HttpDelete("acoes/excluir-massa")]
    public async Task<IActionResult> DeleteMultiple([FromBody] List<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest("Nenhum ID fornecido.");

        try
        {
            var vistorias = await _context.Vistorias
                .Include(v => v.Evidencias)
                .Where(v => v.Id != null && ids.Contains(v.Id.Value)) // CORREÇÃO AQUI: v.Id.Value resolve o erro CS1503
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
            return BadRequest($"Erro: {ex.Message}");
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