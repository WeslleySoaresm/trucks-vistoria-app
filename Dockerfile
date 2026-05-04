# Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copiar arquivos de solução e projetos para restaurar
COPY *.sln ./
COPY TrucksVistoria.API/*.csproj ./TrucksVistoria.API/
COPY TrucksVistoria.Domain/*.csproj ./TrucksVistoria.Domain/
COPY TrucksVistoria.Infrastructure/*.csproj ./TrucksVistoria.Infrastructure/

# Restaurar as dependências
RUN dotnet restore

# Agora copia o resto dos arquivos
COPY . .

# Publica o projeto
RUN dotnet publish TrucksVistoria.API/TrucksVistoria.API.csproj -c Release -o /app/publish

# Estágio de Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Render usa a porta 8080 por padrão para Docker
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TrucksVistoria.API.dll"]