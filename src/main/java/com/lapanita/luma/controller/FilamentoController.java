package com.lapanita.luma.controller;

import com.lapanita.luma.model.Filamento;
import com.lapanita.luma.service.FilamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/filamentos")
@CrossOrigin(origins = "*")
public class FilamentoController {

    @Autowired
    private FilamentoService filamentoService;

    @GetMapping
    public List<Filamento> listar() {
        return filamentoService.obtenerTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Filamento> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(filamentoService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<Filamento> guardar(@RequestBody Filamento filamento) {
        Filamento guardado = filamentoService.guardar(filamento);
        return new ResponseEntity<>(guardado, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Filamento> actualizar(@PathVariable Integer id, @RequestBody Filamento filamentoActualizado) {
        Filamento filamento = filamentoService.obtenerPorId(id);
        filamento.setTipo(filamentoActualizado.getTipo());
        filamento.setMarca(filamentoActualizado.getMarca());
        filamento.setColor(filamentoActualizado.getColor());
        filamento.setCantidadGramos(filamentoActualizado.getCantidadGramos());
        filamento.setPrecioCompra(filamentoActualizado.getPrecioCompra());
        return ResponseEntity.ok(filamentoService.guardar(filamento));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        filamentoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
