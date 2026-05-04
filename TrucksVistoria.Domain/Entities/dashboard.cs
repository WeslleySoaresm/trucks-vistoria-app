namespace TrucksVistoria.Domain.Entities;

public class DashboardVistoria
{
    public Guid Id { get; set; }
    public DateTime DataVistoria { get; set; }
    public string Placa { get; set; } = string.Empty;
    public string Equipe { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ClienteNome { get; set; } = string.Empty;
    public string UrlFoto { get; set; } = string.Empty;
    public string? FuncionarioEmail { get; set; } // Esse pode ser nulo (LEFT JOIN)
}