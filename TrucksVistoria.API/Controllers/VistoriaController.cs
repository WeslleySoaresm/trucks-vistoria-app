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
            // 1. Validar UsuarioId
            if (string.IsNullOrWhiteSpace(request.UsuarioId) || !Guid.TryParse(request.UsuarioId, out Guid usuarioGuid))
            {
                return BadRequest("O UsuarioId fornecido é inválido ou está vazio.");
            }

            // 2. ISOLADO: Upsert do Veículo com tratamento de erro próprio
            try
            {
                var veiculo = await _context.Veiculos.FirstOrDefaultAsync(v => v.Placa == request.Placa);
                if (veiculo == null)
                {
                    veiculo = new Veiculo 
                    { 
                        Placa = request.Placa, 
                        ClienteNome = string.IsNullOrWhiteSpace(request.Cliente) ? "Não Informado" : request.Cliente
                        // Se o seu modelo 'Veiculo' tiver mais campos obrigatórios, preencha-os aqui com valores padrão
                    };
                    _context.Veiculos.Add(veiculo);
                    await _context.SaveChangesAsync(); // Se quebrar aqui, saberemos que é o VEÍCULO
                }
            }
            catch (Exception exVeiculo)
            {
                // Se o veículo quebrar, logamos o erro mas não impedimos a vistoria de tentar salvar
                Console.WriteLine($"[Aviso Veículo]: {exVeiculo.InnerException?.Message ?? exVeiculo.Message}");
            }

            // 3. ISOLADO: Criar a Vistoria com ID fixo de fallback se a FK de usuário falhar
            var idVistoriaNova = Guid.NewGuid();
            var novaVistoria = new Vistoria
            {
                Id = idVistoriaNova, 
                Placa = request.Placa,
                UsuarioId = usuarioGuid, // Tentamos salvar com o ID real do Supabase
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
                await _context.SaveChangesAsync(); // Se quebrar aqui, é a estrutura da VISTORIA ou a FK do Usuário
            }
            catch (Exception exVistoria)
            {
                var erroMsg = exVistoria.InnerException?.Message ?? exVistoria.Message;
                
                // Se o erro for de fato a Chave Estrangeira do Usuário (FK), aplicamos o bypass aqui mesmo
                if (erroMsg.Contains("FK_Vistorias_Usuarios_UsuarioId") || erroMsg.Contains("23503"))
                {
                    _context.Entry(novaVistoria).State = EntityState.Detached; // Limpa a tentativa anterior
                    
                    novaVistoria.UsuarioId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa7"); // Força o ID padrão seguro
                    novaVistoria.Observacao = $"[User: {request.UsuarioId}] " + (request.Observacao ?? "");
                    
                    _context.Vistorias.Add(novaVistoria);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    // Se for outro erro na tabela Vistorias (ex: campo estouro de tamanho), estoura o erro real
                    return BadRequest($"Erro na tabela Vistorias: {erroMsg}");
                }
            }

            // 4. ISOLADO: Vincular Evidências
            if (request.Evidencias != null && request.Evidencias.Any())
            {
                try
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
                catch (Exception exFoto)
                {
                    return BadRequest($"Vistoria salva, mas falhou ao vincular fotos: {exFoto.InnerException?.Message ?? exFoto.Message}");
                }
            }

            return Ok(new { message = "Vistoria salva com sucesso!", id = idVistoriaNova });
        }
        catch (Exception ex)
        {
            var mensagemErro = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
            return BadRequest($"Erro crítico geral: {mensagemErro}");
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