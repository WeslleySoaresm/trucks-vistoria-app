namespace TrucksVistoria.API.DTOs;

public record LoginDto(string Email, string Password);
public record RegisterDto(string Nome, string Email, string Password, string Cargo);