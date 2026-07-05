# =====================================================
# STAGE 1: BUILD — Compila el proyecto con Maven
# =====================================================
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

# Copiar primero solo el pom.xml para aprovechar la caché de dependencias de Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copiar TODO el código fuente (incluyendo src/main/resources/static/)
# Este COPY invalida el cache de Docker cada vez que cambia cualquier archivo en src/
COPY src ./src
RUN mvn package -DskipTests -B --no-transfer-progress

# =====================================================
# STAGE 2: RUN — Imagen liviana solo con el JRE
# =====================================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Crear carpeta de uploads
RUN mkdir -p /app/uploads

# Copiar el JAR generado en la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Exponer el puerto (Render lo inyecta via variable PORT)
EXPOSE 8080

# Limitar memoria JVM para el plan gratuito de Render (512MB)
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m"

# Comando de arranque
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
