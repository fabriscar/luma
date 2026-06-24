package com.lapanita.luma.controller;

import com.lapanita.luma.model.CompraFilamento;
import com.lapanita.luma.service.CompraFilamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compras-filamentos")
@CrossOrigin(origins = "*")
public class CompraFilamentoController {

    @Autowired
    private CompraFilamentoService compraFilamentoService;

    @GetMapping
    public List<CompraFilamento> listar() {
        return compraFilamentoService.obtenerTodas();
    }

    @PostMapping
    public ResponseEntity<CompraFilamento> registrar(@RequestBody CompraFilamento compra) {
        CompraFilamento guardada = compraFilamentoService.registrarCompra(compra);
        return new ResponseEntity<>(guardada, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        compraFilamentoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
