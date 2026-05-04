# Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copia TUDO primeiro para garantir que nada fique de fora
COPY . .

# Restaura as dependências apontando diretamente para o arquivo da API
# (Isso pula a necessidade do arquivo .sln caso ele esteja extraviado)
RUN dotnet restore TrucksVistoria.API/TrucksVistoria.API.csproj

# Publica o projeto
RUN dotnet publish TrucksVistoria.API/TrucksVistoria.API.csproj -c Release -o /app/publish

# Estágio de Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Porta padrão do Render
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TrucksVistoria.API.dll"]