package com.lapanita.luma.controller;

import com.lapanita.luma.model.Pedido;
import com.lapanita.luma.model.EstadoProduccion;
import com.lapanita.luma.service.PedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    @Autowired
    private PedidoService pedidoService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private void notificarCambio() {
        messagingTemplate.convertAndSend("/topic/pedidos", "update");
    }

    @GetMapping
    public List<Pedido> listar() {
        return pedidoService.obtenerTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pedido> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(pedidoService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<Pedido> guardar(@RequestBody Pedido pedido) {
        Pedido guardado = pedidoService.guardar(pedido);
        notificarCambio();
        return new ResponseEntity<>(guardado, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pedido> actualizar(@PathVariable Integer id, @RequestBody Pedido pedidoActualizado) {
        Pedido actualizado = pedidoService.actualizar(id, pedidoActualizado);
        notificarCambio();
        return ResponseEntity.ok(actualizado);
    }

    // Endpoint específico para mover las tarjetas en el tablero Kanban
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Pedido> cambiarEstado(
            @PathVariable Integer id,
            @RequestParam("nuevoEstado") EstadoProduccion nuevoEstado) {
        Pedido actualizado = pedidoService.actualizarEstadoProduccion(id, nuevoEstado);
        notificarCambio();
        return ResponseEntity.ok(actualizado);
    }

    @PatchMapping("/{id}/pago")
    public ResponseEntity<Pedido> cambiarEstadoPago(
            @PathVariable Integer id,
            @RequestParam("nuevoEstado") com.lapanita.luma.model.EstadoPago nuevoEstado) {
        Pedido pedido = pedidoService.obtenerPorId(id);
        pedido.setEstadoPago(nuevoEstado);
        Pedido guardado = pedidoService.guardar(pedido);
        notificarCambio();
        return ResponseEntity.ok(guardado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        pedidoService.eliminar(id);
        notificarCambio();
        return ResponseEntity.noContent().build();
    }
}