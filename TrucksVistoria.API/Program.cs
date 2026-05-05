using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using TrucksVistoria.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuração do CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PublicPolicy", policy =>
    {
        policy.WithOrigins("https://trucks-vistoria-app.vercel.app") // Permite Vercel, localhost, etc.
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

// 1. O CORS deve ser quase a primeira coisa
app.UseRouting();

// Use o nome da política que você criou (ex: "PublicPolicy")
app.UseCors("PublicPolicy"); 

// 2. Swagger e Redirecionamentos
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 3. Autenticação e Autorização DEVEM vir DEPOIS do CORS
app.UseAuthorization();

app.MapControllers();

app.Run();