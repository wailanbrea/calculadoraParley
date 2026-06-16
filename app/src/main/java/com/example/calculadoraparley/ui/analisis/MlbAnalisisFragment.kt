package com.example.calculadoraparley.ui.analisis

import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.calculadoraparley.databinding.FragmentMlbAnalisisBinding
import com.example.calculadoraparley.ui.notifications.NotificationsViewModel
import com.example.calculadoraparley.ui.notifications.MlbAdapter
import com.example.calculadoraparley.ui.notifications.TablaRow
import com.example.calculadoraparley.util.ParseUtils // ajusta el paquete si difiere

class MlbAnalisisFragment : Fragment() {
    private var _binding: FragmentMlbAnalisisBinding? = null
    private val binding get() = _binding!!

    private val viewModel: NotificationsViewModel by viewModels()

    private val jsonPicker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let { importJsonFromUri(it) }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMlbAnalisisBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.rvMlb.layoutManager = LinearLayoutManager(requireContext())
        binding.rvMlb.adapter = MlbAdapter(emptyList())

        viewModel.juegosSolo.observe(viewLifecycleOwner) { lista ->
            binding.rvMlb.adapter = MlbAdapter(lista)
        }

        binding.btnImportJson.setOnClickListener {
            jsonPicker.launch(arrayOf("application/json", "text/json", "*/*"))
        }
    }

    private fun importJsonFromUri(uri: Uri) {
        try {
            requireContext().contentResolver.openInputStream(uri)?.use { stream ->
                val json = stream.bufferedReader().use { it.readText() }

                // NUEVO: adaptar JSON extraído (mlb + mitad) -> List<TablaRow>
                val filas: List<TablaRow> = ParseUtils.parseMlbJsonNuevo(json)

                Log.d("Analisis", "Registros JSON adaptados: ${filas.size}")

                // Procesar en VM (SOLO ya ok, SI/NO desde ML de MITAD, PA con PaData)
                viewModel.analizarJuegos(filas)

                Toast.makeText(
                    requireContext(),
                    "JSON importado y analizado: ${filas.size} juegos",
                    Toast.LENGTH_SHORT
                ).show()
            } ?: run {
                Toast.makeText(requireContext(), "Error al abrir el JSON", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al importar JSON: ${e.message}", Toast.LENGTH_LONG).show()
            Log.e("Analisis", "importJsonFromUri", e)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
