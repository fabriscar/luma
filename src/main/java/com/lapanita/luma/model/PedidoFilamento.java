package com.lapanita.luma.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "pedidos_filamentos")
public class PedidoFilamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "pedido_id", nullable = false)
    @JsonBackReference
    private Pedido pedido;

    @ManyToOne
    @JoinColumn(name = "filamento_id", nullable = false)
    private Filamento filamento;

    @Column(name = "gramos_usados", nullable = false)
    private Integer gramosUsados;

    public PedidoFilamento() {}

    public PedidoFilamento(Pedido pedido, Filamento filamento, Integer gramosUsados) {
        this.pedido = pedido;
        this.filamento = filamento;
        this.gramosUsados = gramosUsados;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Pedido getPedido() {
        return pedido;
    }

    public void setPedido(Pedido pedido) {
        this.pedido = pedido;
    }

    public Filamento getFilamento() {
        return filamento;
    }

    public void setFilamento(Filamento filamento) {
        this.filamento = filamento;
    }

    public Integer getGramosUsados() {
        return gramosUsados;
    }

    public void setGramosUsados(Integer gramosUsados) {
        this.gramosUsados = gramosUsados;
    }
}
