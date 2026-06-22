-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: luma
-- ------------------------------------------------------
-- Server version	8.0.45


--
-- Table structure for table `detalle_pedidos`
--

DROP TABLE IF EXISTS `detalle_pedidos`;
CREATE TABLE `detalle_pedidos` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_pedido` int NOT NULL,
  `id_producto` int NOT NULL,
  `id_filamento` int NOT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_detalle`),
  KEY `id_pedido` (`id_pedido`),
  KEY `id_producto` (`id_producto`),
  KEY `id_filamento` (`id_filamento`),
  CONSTRAINT `detalle_pedidos_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE,
  CONSTRAINT `detalle_pedidos_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  CONSTRAINT `detalle_pedidos_ibfk_3` FOREIGN KEY (`id_filamento`) REFERENCES `filamentos` (`id_filamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `detalle_pedidos`
--

LOCK TABLES `detalle_pedidos` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `filamentos`
--

DROP TABLE IF EXISTS `filamentos`;
CREATE TABLE `filamentos` (
  `id_filamento` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(30) NOT NULL,
  `marca` varchar(50) NOT NULL,
  `color` varchar(50) NOT NULL,
  `cantidad_gramos` int NOT NULL DEFAULT '0',
  `precio_compra` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_filamento`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `filamentos`
--

LOCK TABLES `filamentos` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
CREATE TABLE `pedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `cliente` varchar(100) NOT NULL,
  `fecha_pedido` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_entrega` date NOT NULL,
  `total_pedido` decimal(10,2) NOT NULL,
  `estado_pago` enum('NO_PAGADO','SENADO','PAGADO') DEFAULT 'NO_PAGADO',
  `monto_sena` decimal(10,2) DEFAULT '0.00',
  `estado_produccion` enum('PENDIENTE_HACER','EN_PRODUCCION','PENDIENTE_ENTREGA','ENTREGADO') DEFAULT 'PENDIENTE_HACER',
  PRIMARY KEY (`id_pedido`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `peso_gramos` int NOT NULL,
  `precio_base` decimal(10,2) NOT NULL,
  `ruta_foto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
INSERT INTO `productos` VALUES (2,'Maceta M├írmol',220,4000.00,NULL),(3,'asdasd12',123123,123.00,NULL),(4,'asd',1231,123.00,NULL);
UNLOCK TABLES;

--
-- Table structure for table `productos_stl`
--

DROP TABLE IF EXISTS `productos_stl`;
CREATE TABLE `productos_stl` (
  `id_stl` int NOT NULL AUTO_INCREMENT,
  `id_producto` int NOT NULL,
  `nombre_archivo` varchar(150) NOT NULL,
  `ruta_archivo` varchar(255) NOT NULL,
  PRIMARY KEY (`id_stl`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `productos_stl_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `productos_stl`
--

LOCK TABLES `productos_stl` WRITE;
INSERT INTO `productos_stl` VALUES (3,2,'maceta.stl','/uploads/stl/maceta.stl');
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` varchar(20) DEFAULT 'ADMIN',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
INSERT INTO `usuarios` VALUES (1,'admin1','1234','ADMIN'),(2,'admin2','1234','ADMIN');
UNLOCK TABLES;


-- Dump completed on 2026-06-21 21:01:22
