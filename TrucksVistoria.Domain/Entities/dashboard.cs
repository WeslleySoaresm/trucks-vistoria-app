namespace TrucksVistoria.Domain.Entities;

public class DashboardVistoria
{
    public Guid Id { get; set; }
    public DateTime DataVistoria { get; set; }
    public string Placa { get; set; }
    public string Equipe { get; set; }
    public string Status { get; set; }
    public string ClienteNome { get; set; }
    public string UrlFoto { get; set; }
}