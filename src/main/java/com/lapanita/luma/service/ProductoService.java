package com.lapanita.luma.service;

import com.lapanita.luma.model.Producto;
import com.lapanita.luma.model.ProductoStl;
import com.lapanita.luma.repository.ProductoRepository;
import com.lapanita.luma.repository.ProductoStlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoStlRepository productoStlRepository;

    @Value("${cloudinary.url}")
    private String cloudinaryUrl;

    private Cloudinary getCloudinary() {
        return new Cloudinary(cloudinaryUrl);
    }

    /** Traer todos los productos cargados */
    @Transactional(readOnly = true)
    public List<Producto> obtenerTodos() {
        return productoRepository.findAll();
    }

    /** Buscar un producto por su ID */
    @Transactional(readOnly = true)
    public Producto obtenerPorId(Integer id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con el ID: " + id));
    }

    /** Guardar o actualizar un producto con sus archivos en Cloudinary */
    @Transactional
    public Producto guardar(Producto producto, MultipartFile foto, List<MultipartFile> archivosStl) throws IOException {
        Cloudinary cloudinary = getCloudinary();

        // 1. Procesar la foto si el usuario subió una
        if (foto != null && !foto.isEmpty()) {
            Map uploadResult = cloudinary.uploader().upload(foto.getBytes(), ObjectUtils.emptyMap());
            producto.setRutaFoto(uploadResult.get("secure_url").toString());
        }

        // 2. Guardar el producto principal en la BD para generar su ID
        Producto productoGuardado = productoRepository.save(producto);

        // 3. Procesar la lista de archivos .STL si existen
        if (archivosStl != null && !archivosStl.isEmpty()) {
            boolean hasFiles = false;
            java.io.File tempFile = java.io.File.createTempFile("stls_", ".zip");
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
                 ZipOutputStream zos = new ZipOutputStream(fos)) {
                for (MultipartFile stl : archivosStl) {
                    if (!stl.isEmpty()) {
                        hasFiles = true;
                        ZipEntry entry = new ZipEntry(stl.getOriginalFilename());
                        zos.putNextEntry(entry);
                        stl.getInputStream().transferTo(zos);
                        zos.closeEntry();
                    }
                }
            }

            if (hasFiles) {
                String zipName = productoGuardado.getNombre().replaceAll("\\s+", "_") + "_stls.zip";
                Map uploadResult = cloudinary.uploader().upload(tempFile, ObjectUtils.asMap(
                        "resource_type", "raw",
                        "public_id", zipName
                ));
                
                // Crear la entidad ProductoStl y asociarla al producto padre con la URL de Cloudinary
                ProductoStl nuevoStl = new ProductoStl(zipName, uploadResult.get("secure_url").toString(), productoGuardado);
                productoStlRepository.save(nuevoStl);
            }
            if (tempFile.exists()) {
                tempFile.delete();
            }
        }

        return productoGuardado;
    }

    /** Actualizar un producto existente en Cloudinary */
    @Transactional
    public Producto actualizar(Integer id, String nombre, Integer pesoGramos, java.math.BigDecimal precioBase, String detalles, MultipartFile foto, List<MultipartFile> archivosStl) throws IOException {
        Producto producto = obtenerPorId(id);
        producto.setNombre(nombre);
        producto.setPesoGramos(pesoGramos);
        producto.setPrecioBase(precioBase);
        producto.setDetalles(detalles);

        Cloudinary cloudinary = getCloudinary();

        // Si se sube una nueva foto, se reemplaza la anterior (sin borrar en Cloudinary por simplicidad)
        if (foto != null && !foto.isEmpty()) {
            Map uploadResult = cloudinary.uploader().upload(foto.getBytes(), ObjectUtils.emptyMap());
            producto.setRutaFoto(uploadResult.get("secure_url").toString());
        }

        // Si se suben nuevos archivos STL, se reemplazan los anteriores
        if (archivosStl != null && !archivosStl.isEmpty()) {
            // Borrar de BD
            productoStlRepository.deleteAll(producto.getStlFiles());
            producto.getStlFiles().clear();

            boolean hasFiles = false;
            java.io.File tempFile = java.io.File.createTempFile("stls_", ".zip");
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
                 ZipOutputStream zos = new ZipOutputStream(fos)) {
                for (MultipartFile stl : archivosStl) {
                    if (!stl.isEmpty()) {
                        hasFiles = true;
                        ZipEntry entry = new ZipEntry(stl.getOriginalFilename());
                        zos.putNextEntry(entry);
                        stl.getInputStream().transferTo(zos);
                        zos.closeEntry();
                    }
                }
            }

            if (hasFiles) {
                String zipName = producto.getNombre().replaceAll("\\s+", "_") + "_stls.zip";
                Map uploadResult = cloudinary.uploader().upload(tempFile, ObjectUtils.asMap(
                        "resource_type", "raw",
                        "public_id", zipName
                ));

                ProductoStl nuevoStl = new ProductoStl(zipName, uploadResult.get("secure_url").toString(), producto);
                productoStlRepository.save(nuevoStl);
                producto.getStlFiles().add(nuevoStl);
            }
            if (tempFile.exists()) {
                tempFile.delete();
            }
        }

        return productoRepository.save(producto);
    }

    /** Eliminar un producto (no borramos de Cloudinary para mantenerlo simple) */
    @Transactional
    public void eliminar(Integer id) {
        // Eliminar el registro definitivo de la BD (por cascada borra la tabla productos_stl)
        productoRepository.deleteById(id);
    }
}