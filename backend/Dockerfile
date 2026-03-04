# -------- Stage 1: Build --------
FROM eclipse-temurin:11-jdk-alpine AS builder

WORKDIR /app

# Copy everything
COPY . .

# Make mvnw executable
RUN chmod +x mvnw

# Build jar
RUN ./mvnw clean package -DskipTests


# -------- Stage 2: Run --------
FROM eclipse-temurin:11-jre-alpine

WORKDIR /app

# Copy built jar from builder
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]