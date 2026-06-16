package com.example.calculadoraparley.ui.calculadora

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Observer
import com.example.calculadoraparley.R

class CalculadoraFragment : Fragment() {

    private val viewModel: CalculadoraViewModel by viewModels()
    private lateinit var etMonto: EditText
    private lateinit var btnAgregarLogro: Button
    private lateinit var btnCalcular: Button
    private lateinit var btnLimpiar: Button
    private lateinit var tvMontoTotal: TextView
    private lateinit var tvGanancia: TextView
    private lateinit var containerLogros: LinearLayout

    private val logroFields = mutableListOf<Pair<EditText, CheckBox>>()
    private val maxLogros = 12
    private val minLogros = 5

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? {
        return inflater.inflate(R.layout.fragment_calculadora, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        etMonto = view.findViewById(R.id.etMonto)
        btnAgregarLogro = view.findViewById(R.id.btnAgregarLogro)
        btnCalcular = view.findViewById(R.id.btnCalcular)
        btnLimpiar = view.findViewById(R.id.btnLimpiar)
        tvMontoTotal = view.findViewById(R.id.tvMontoTotal)
        tvGanancia = view.findViewById(R.id.tvGanancia)
        containerLogros = view.findViewById(R.id.container_logros)

        logroFields.clear()
        containerLogros.removeAllViews()
        // Crear 5 campos de logro al inicio
        repeat(minLogros) { agregarCampoLogro() }

        btnAgregarLogro.setOnClickListener {
            if (logroFields.size < maxLogros) {
                agregarCampoLogro()
            } else {
                Toast.makeText(requireContext(), "Solo puedes agregar hasta 12 logros", Toast.LENGTH_SHORT).show()
            }
        }

        btnCalcular.setOnClickListener {
            calcular()
        }
        btnLimpiar.setOnClickListener {
            limpiar()
        }

        viewModel.montoTotal.observe(viewLifecycleOwner, Observer {
            tvMontoTotal.text = "Monto Total: %.2f".format(it)
        })
        viewModel.ganancia.observe(viewLifecycleOwner, Observer {
            tvGanancia.text = "Ganancia: %.2f".format(it)
        })
    }

    private fun agregarCampoLogro() {
        val itemView = layoutInflater.inflate(R.layout.item_logro, containerLogros, false)
        val etLogro = itemView.findViewById<EditText>(R.id.etLogro)
        val cbNegativo = itemView.findViewById<CheckBox>(R.id.cbNegativo)
        containerLogros.addView(itemView)
        logroFields.add(Pair(etLogro, cbNegativo))
    }

    private fun calcular() {
        val monto = etMonto.text.toString().toDoubleOrNull()
        if (monto == null || monto <= 0) {
            Toast.makeText(requireContext(), "Ingrese un monto válido", Toast.LENGTH_SHORT).show()
            return
        }

        val logros = logroFields.map { pair ->
            val valor = pair.first.text.toString().toDoubleOrNull()
            val negativo = pair.second.isChecked
            Pair(valor, negativo)
        }
        viewModel.calcularParley(monto, logros)
    }

    private fun limpiar() {
        etMonto.text.clear()
        logroFields.forEach {
            it.first.text.clear()
            it.second.isChecked = false
        }
        viewModel.limpiar()
    }
}
