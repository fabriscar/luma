package com.lapanita.luma.security;

import com.lapanita.luma.model.Usuario;
import com.lapanita.luma.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        List<Usuario> usuarios = usuarioRepository.findAll();

        // Si la base está vacía (primer deploy), crear el usuario admin por defecto
        if (usuarios.isEmpty()) {
            Usuario admin = new Usuario();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            usuarioRepository.save(admin);
            System.out.println("=== Usuario admin creado por defecto (primera vez) ===");
            return;
        }

        // Migrar contraseñas antiguas que estén en texto plano
        for (Usuario u : usuarios) {
            // BCrypt hashes siempre empiezan con $2a$, $2b$ o $2y$
            if (!u.getPasswordHash().startsWith("$2")) {
                String hashed = passwordEncoder.encode(u.getPasswordHash());
                u.setPasswordHash(hashed);
                usuarioRepository.save(u);
                System.out.println("Contraseña encriptada para el usuario: " + u.getUsername());
            }
        }
    }
}
