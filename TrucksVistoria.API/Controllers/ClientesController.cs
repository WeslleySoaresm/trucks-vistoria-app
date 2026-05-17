using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;

namespace TrucksVistoria.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClientesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClientesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Clientes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Clientes>>> GetClientes()
        {
            // Retorna os clientes ordenados por nome para facilitar o Select
            return await _context.Clientes.OrderBy(c => c.Nome).ToListAsync();
        }

        // POST: api/Clientes
        [HttpPost]
        public async Task<ActionResult<Clientes>> PostCliente(Clientes cliente)
        {
            if (string.IsNullOrWhiteSpace(cliente.Nome))
            {
                return BadRequest("O nome do cliente é obrigatório.");
            }

            // Opcional: Evita duplicar clientes com o mesmo nome
            var clienteExiste = await _context.Clientes
                .AnyAsync(c => c.Nome.ToLower() == cliente.Nome.ToLower().Trim());
                
            if (clienteExiste)
            {
                return BadRequest("Este cliente já está cadastrado.");
            }

            cliente.Nome = cliente.Nome.Trim().ToUpper();
            cliente.DataCriacao = DateTime.UtcNow;

            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClientes), new { id = cliente.Id }, cliente);
        }
    }
}