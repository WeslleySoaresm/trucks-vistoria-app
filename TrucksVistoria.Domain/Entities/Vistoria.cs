namespace TrucksVistoria.Domain.Entities;


// Entidade principal da aplicação, representando uma vistoria de caminhão
public class Vistoria
{
    public Guid? Id { get; set; } = Guid.NewGuid(); // O ? indica que o Id pode ser nulo, útil para quando a vistoria ainda não foi salva no banco
    public string Placa { get; set; } = string.Empty;
    public string Equipe { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string TipoServico { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public string Localizacao { get; set; } = string.Empty;
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "inicial";
    //Coluna para relacionar a vistoria com o usuário que a criou
    public Guid UsuarioId { get; set; }
    public Usuario? Usuario { get; set; } 

    
    // Lista de URLs das fotos (serão salvas em outra tabela)
    public List<Evidencia> Evidencias { get; set; } = new();
}

public class Evidencia 
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UrlFoto { get; set; } = string.Empty;
    public Guid VistoriaId { get; set; }
}