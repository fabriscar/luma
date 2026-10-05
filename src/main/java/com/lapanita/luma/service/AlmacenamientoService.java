package com.lapanita.luma.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Guarda fotos y archivos STL.
 * - Si CLOUDINARY_URL está configurada (Render/Railway), los sube a Cloudinary.
 * - Si no (uso local), los guarda en la carpeta de uploads y se sirven en /uploads/**.
 */
@Service
public class AlmacenamientoService {

    private static final Logger log = LoggerFactory.getLogger(AlmacenamientoService.class);
    private static final Set<String> EXTENSIONES_FOTO = Set.of("jpg", "jpeg", "png", "gif", "webp", "avif");

    private final Cloudinary cloudinary; // null = guardado local
    private final Path carpetaUploads;

    public AlmacenamientoService(@Value("${cloudinary.url:}") String cloudinaryUrl,
                                 @Value("${luma.uploads.dir:uploads}") String uploadsDir) {
        this.cloudinary = cloudinaryUrl.isBlank() ? null : new Cloudinary(cloudinaryUrl);
        this.carpetaUploads = Paths.get(uploadsDir).toAbsolutePath().normalize();
        if (cloudinary == null) {
            log.info("CLOUDINARY_URL vacía: fotos y STLs se guardan en {}", carpetaUploads);
        }
    }

    /** Guarda la foto de un producto y devuelve la URL para mostrarla. */
    public String guardarFoto(MultipartFile foto) throws IOException {
        if (cloudinary != null) {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(foto.getBytes(), ObjectUtils.emptyMap());
            return uploadResult.get("secure_url").toString();
        }
        String extension = extension(foto.getOriginalFilename());
        if (!EXTENSIONES_FOTO.contains(extension)) {
            extension = "jpg";
        }
        try (InputStream in = foto.getInputStream()) {
            return guardarLocal(in, "fotos", UUID.randomUUID() + "." + extension);
        }
    }

    /** Guarda el .zip con los STLs de un producto y devuelve la URL de descarga. */
    public String guardarZipStl(File zip, String nombreZip) throws IOException {
        if (cloudinary != null) {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(zip, ObjectUtils.asMap(
                    "resource_type", "raw",
                    "public_id", nombreZip
            ));
            return uploadResult.get("secure_url").toString();
        }
        // Subcarpeta única para que el archivo descargado conserve su nombre sin pisar a otros
        String nombreSeguro = nombreZip.replaceAll("[^A-Za-z0-9._-]", "_");
        try (InputStream in = Files.newInputStream(zip.toPath())) {
            return guardarLocal(in, "stl/" + UUID.randomUUID(), nombreSeguro);
        }
    }

    private String guardarLocal(InputStream contenido, String subcarpeta, String nombreArchivo) throws IOException {
        Path carpeta = carpetaUploads.resolve(subcarpeta);
        Files.createDirectories(carpeta);
        Files.copy(contenido, carpeta.resolve(nombreArchivo), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/" + subcarpeta + "/" + nombreArchivo;
    }

    private static String extension(String nombreArchivo) {
        if (nombreArchivo == null || !nombreArchivo.contains(".")) {
            return "";
        }
        return nombreArchivo.substring(nombreArchivo.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
