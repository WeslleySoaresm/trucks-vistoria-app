using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;




var builder = WebApplication.CreateBuilder(args);



builder.Services.AddCors(options =>
{
    options.AddPolicy("VercelPolicy", policy =>
    {
        policy.WithOrigins("https://trucks-vistoria-app.vercel.app/") // Em produção, coloque a URL do seu site
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); // Adiciona o Swagger para documentação da API


// ALTERE ESTA LINHA: De UseSqlite para UseNpgsql
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();



var app = builder.Build();
app.UseCors("VercelPolicy"); // Aplica a política de CORS que criamos para permitir o React acessar a API

//configuração do swagger UI
if (app.Environment.IsDevelopment())
{
 
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TrucksVistoria.API v1"));// Isso cria uma interface web para testar os endpoints da API, acessível em /swagger/index.html


}

app.UseHttpsRedirection();
app.UseCors("AllowReact"); // Aplica a política de CORS que criamos para permitir o React acessar a API
app.UseAuthorization();
app.MapControllers();

app.Run();