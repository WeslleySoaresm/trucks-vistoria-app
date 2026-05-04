using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuração do CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("VercelPolicy", policy =>
    {
        // REMOVIDA a barra "/" do final da URL
        policy.WithOrigins(
        "https://trucks-vistoria-9l7kqa9r4-weslleysoaresms-projects.vercel.app", 
         "https://trucks-vistoria-app.vercel.app") 
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Configuração do Banco de Dados
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// --- ORDEM DE MIDDLEWARE É CRUCIAL ---

// 3. Aplica o CORS logo no início


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TrucksVistoria.API v1"));
}

// Removido o UseHttpsRedirection se estiver usando ngrok (evita conflitos de certificado local)
// app.UseHttpsRedirection(); 
app.UseCors("VercelPolicy"); 
app.UseCors("ProductionPolicy");
app.UseAuthorization();
app.MapControllers();

app.Run();