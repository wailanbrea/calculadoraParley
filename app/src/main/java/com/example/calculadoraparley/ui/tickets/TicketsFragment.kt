package com.example.calculadoraparley.ui.tickets

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.calculadoraparley.databinding.FragmentTicketsBinding

class TicketsFragment : Fragment() {

    private var _binding: FragmentTicketsBinding? = null
    private val binding get() = _binding!!
    private lateinit var viewModel: TicketsViewModel

    private var mostrandoDetalle = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTicketsBinding.inflate(inflater, container, false)
        viewModel = ViewModelProvider(this)[TicketsViewModel::class.java]

        binding.btnCalcular.setOnClickListener {
            calcular()
            mostrandoDetalle = false
            binding.btnDetalle.text = "Ver detalle"
        }

        // Mostrar resumen por defecto
        viewModel.resultado.observe(viewLifecycleOwner) {
            if (!mostrandoDetalle) {
                binding.tvResultado.text = it
            }
        }

        // Mostrar detalle al dar click, o volver al resumen
        binding.btnDetalle.setOnClickListener {
            if (!mostrandoDetalle) {
                binding.tvResultado.text = viewModel.detalle.value
                binding.btnDetalle.text = "Ver resumen"
                mostrandoDetalle = true
            } else {
                binding.tvResultado.text = viewModel.resultado.value
                binding.btnDetalle.text = "Ver detalle"
                mostrandoDetalle = false
            }
        }

        return binding.root
    }

    private fun calcular() {
        val gananciaStr = binding.etGananciaDeseada.text.toString()
        val lineaStr = binding.etLinea.text.toString()
        val tieneCodigo = binding.cbTieneCodigo.isChecked

        val gananciaDeseada = gananciaStr.toDoubleOrNull()
        val linea = lineaStr.toDoubleOrNull()

        if (gananciaDeseada == null || gananciaDeseada <= 0) {
            Toast.makeText(requireContext(), "Ingrese una ganancia válida", Toast.LENGTH_SHORT).show()
            return
        }
        if (linea == null || linea == 0.0) {
            Toast.makeText(requireContext(), "Ingrese una línea válida (≠ 0)", Toast.LENGTH_SHORT).show()
            return
        }

        viewModel.calcularMontoApostar(gananciaDeseada, linea, tieneCodigo)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
