package com.example.calculadoraparley.ui.notifications

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.example.calculadoraparley.databinding.FragmentNotificationsBinding

class NotificationsFragment : Fragment() {
    private var _binding: FragmentNotificationsBinding? = null
    private val binding get() = _binding!!

    // Normaliza 110 -> -110. Mantiene +120 o -115.
    private fun String.normalizeJuice(): String {
        val t = this.trim().replace(" ", "")
        val m = Regex("^[+-]?\\d{2,3}$").matchEntire(t) ?: return t
        return if (t.startsWith("+") || t.startsWith("-")) t else "-$t"
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // CALC general: SI/NO, PA, SOLO
        binding.btnCalcular.setOnClickListener {
            val total = binding.etTotal.text.toString().toDoubleOrNull()

            val lineaRaw = binding.etLineaSiNoPa.text.toString()
            val lineaNorm = lineaRaw.normalizeJuice()

            val tipo = binding.etTipo.text.toString().uppercase().trim()
            val side = if (binding.rgSide.checkedRadioButtonId == binding.rbCasa.id) "Casa" else "Visitante"

            val mlVisit = binding.etMlVisit.text.toString().toIntOrNull()
            val mlCasa = binding.etMlCasa.text.toString().toIntOrNull()

            // SI/NO y PA: requieren tabla exacta
            if (total == null || lineaNorm.isBlank() || tipo.isBlank()) {
                Toast.makeText(requireContext(), "Completa Total, Tipo y Línea", Toast.LENGTH_SHORT).show()
                binding.tvSiNo.text = ""
                binding.tvPa.text = ""
            } else {
                // SI/NO (tabla exacta)
                val siNo = SiNoData.buscarPrecio(total, tipo, lineaNorm)
                binding.tvSiNo.text = siNo
                    ?.let { "SI/NO → Sí: ${it.first}   No: ${it.second}" }
                    ?: "SI/NO: No soportado"

                // PA (tabla exacta según side)
                val pa = PaData.buscarPrecio(lineaNorm, side)
                binding.tvPa.text = pa
                    ?.let { "PA → Sí: ${it.first}   No: ${it.second}" }
                    ?: "PA: No soportado"
            }

            // SOLO: requiere total y al menos uno de los ML JC
            if (total != null && (mlCasa != null || mlVisit != null)) {
                val solo = SoloData.calcularSolo(
                    total.toString(),
                    mlCasa?.toString(),
                    mlVisit?.toString()
                )
                binding.tvSolo.text = "SOLO → Casa: ${solo.first}   Visitante: ${solo.second}"
            } else {
                binding.tvSolo.text = "SOLO: -"
            }
        }

        // TERCIO: O/U por tabla y ML de tercio por regla desde ML 1ª mitad
        binding.btnBuscarTercio.setOnClickListener {
            binding.tvTercioError.text = ""
            binding.tvTercioResult.text = ""

            // --- O/U Tercio por tabla (desde H, Tipo, Línea) ---
            val h = binding.etTercioH.text.toString().toDoubleOrNull()
            val tipoH = binding.etTercioTipo.text.toString().uppercase().trim()
            val lineaH = binding.etTercioLinea.text.toString().trim().normalizeJuice()

            if (h == null || tipoH.isEmpty() || lineaH.isEmpty()) {
                binding.tvTercioError.text = "Parámetros de tercio inválidos"
            } else {
                val tercio = TercioData.buscarTercio(h, tipoH, lineaH)
                if (tercio != null) {
                    binding.tvTercioResult.text = "TERCIO (O/U) → ${tercio.tercio} ${tercio.tipoT} ${tercio.lineaT}"
                } else {
                    binding.tvTercioError.text = "TERCIO (O/U): No soportado"
                }
            }

            // --- ML de Tercio por regla desde ML 1ª mitad ---
            val mlVisitH = binding.etMlVisit.text.toString().trim().takeIf { it.isNotEmpty() }?.normalizeJuice()
            val mlCasaH  = binding.etMlCasa.text.toString().trim().takeIf { it.isNotEmpty() }?.normalizeJuice()

            if (!mlVisitH.isNullOrBlank() && !mlCasaH.isNullOrBlank()) {
                val tercioMl = TercioData.calcularMlDesdeH(mlVisitH, mlCasaH)
                if (tercioMl != null) {
                    val prev = binding.tvTercioResult.text?.toString().orEmpty()
                    val lineMl = "TERCIO (ML) → Visit: ${tercioMl.visit}   Casa: ${tercioMl.casa}   Fav: ${tercioMl.favSide}"
                    binding.tvTercioResult.text = if (prev.isBlank()) lineMl else "$prev\n$lineMl"
                } else {
                    val prevErr = binding.tvTercioError.text?.toString().orEmpty()
                    val lineErr = "ML de Tercio: No soportado"
                    binding.tvTercioError.text = if (prevErr.isBlank()) lineErr else "$prevErr\n$lineErr"
                }
            } // si faltan ML 1ª mitad, no calculamos ML de tercio
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
