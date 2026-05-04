# Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copiar arquivos de solução e projetos
COPY *.sln ./
COPY TrucksVistoria.API/*.csproj ./TrucksVistoria.API/
COPY TrucksVistoria.Domain/*.csproj ./TrucksVistoria.Domain/
COPY TrucksVistoria.Infrastructure/*.csproj ./TrucksVistoria.Infrastructure/

# Restaurar dependências
RUN dotnet restore

# Copiar o restante do código e publicar
COPY . ./
RUN dotnet publish TrucksVistoria.API/TrucksVistoria.API.csproj -c Release -o out

# Estágio de Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/out .

# Expor a porta que a API vai rodar (Render usa a 8080 por padrão)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TrucksVistoria.API.dll"]