namespace TrucksVistoria.Domain.Entities;

public class Veiculo
{
    public string Placa { get; set; } = string.Empty;
    public string ClienteNome { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public DateTime DataCadastro { get; set; } = DateTime.UtcNow;

    // Relacionamento: Um veículo pode ter várias vistorias
    public List<Vistoria> Vistorias { get; set; } = new();
}