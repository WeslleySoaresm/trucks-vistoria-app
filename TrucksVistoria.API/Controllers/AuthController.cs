using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Domain.Entities;
using TrucksVistoria.Infrastructure;
using TrucksVistoria.API.DTOs;
using BC = BCrypt.Net.BCrypt;

namespace TrucksVistoria.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (await _context.Usuarios.AnyAsync(u => u.Email == dto.Email))
            return BadRequest("E-mail já cadastrado.");

        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Email = dto.Email,
            PasswordHash = BC.HashPassword(dto.Password),
            Cargo = dto.Cargo
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Usuário criado com sucesso!" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (usuario == null || !BC.Verify(dto.Password, usuario.PasswordHash))
            return Unauthorized("E-mail ou senha inválidos.");

        // Por enquanto retornamos os dados do usuário. 
        // Depois podemos adicionar o Token JWT aqui.
        return Ok(new { 
            id = usuario.Id, 
            nome = usuario.Nome, 
            email = usuario.Email,
            cargo = usuario.Cargo 
        });
    }
}