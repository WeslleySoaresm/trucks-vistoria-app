using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuração do CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PublicPolicy", policy =>
    {
        policy.AllowAnyOrigin() // Permite Vercel, localhost, etc.
              .AllowAnyMethod() // Permite GET, POST, DELETE, OPTIONS
              .AllowAnyHeader(); // Permite Content-Type, Authorization, etc.
    });
});



builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Configuração do Banco de Dados
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();
app.UseRouting();
// --- ORDEM DE MIDDLEWARE É CRUCIAL ---

// 3. Aplica o CORS logo no início


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TrucksVistoria.API v1"));
}

// Removido o UseHttpsRedirection se estiver usando ngrok (evita conflitos de certificado local)
// app.UseHttpsRedirection(); 
app.UseCors("PublicPolicy"); 
app.UseAuthorization();
app.MapControllers();

app.Run();