package com.example.calculadoraparley.ui.notifications

import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.calculadoraparley.util.ParseUtils
import kotlin.math.abs

class NotificationsViewModel : ViewModel() {

    private val _juegosSolo = MutableLiveData<List<JuegoSoloAnalizado>>()
    val juegosSolo: LiveData<List<JuegoSoloAnalizado>> get() = _juegosSolo

    private val _rowsNormalizados = MutableLiveData<List<TablaRow>>()
    val rowsNormalizados: LiveData<List<TablaRow>> get() = _rowsNormalizados

    fun analizarJuegos(listaRows: List<TablaRow>) {
        val analizados = mutableListOf<JuegoSoloAnalizado>()
        val normalizados = mutableListOf<TablaRow>()

        fun String?.mlInt(): Int? =
            Regex("-?\\d+").find(this ?: "")?.value?.toIntOrNull()
        fun String?.mlToken(): String? =
            Regex("([+-]\\d{3})").find(this ?: "")?.groupValues?.get(1)
        fun String?.signedInt(): Int? =
            Regex("([+-]?\\d{2,3})").find(this ?: "")?.groupValues?.get(1)?.toIntOrNull()
        fun fmtSigned(n: Int): String = if (n > 0) "+$n" else n.toString()
        fun withinRange(a: Int?, b: Int?): Boolean =
            a != null && b != null && kotlin.math.abs(a - b) <= 5

        listaRows.filter { it.tipo == "juego_completo" }.forEach { rowOriginal ->
            // --- ML JC ---
            val mlVisitStr = rowOriginal.ml.getOrNull(0)
            val mlCasaStr  = rowOriginal.ml.getOrNull(1)
            val mlVisitInt = mlVisitStr.mlInt()
            val mlCasaInt  = mlCasaStr.mlInt()

            // --- SOLO ---
            val (soloCalcCasa, soloCalcVisit) =
                SoloData.calcularSolo(rowOriginal.total, mlCasaStr, mlVisitStr)

            fun String?.toSoloDouble(): Double? = this
                ?.replace("½", ".5")?.replace(",", ".")?.replace(" ", "")?.toDoubleOrNull()
            val soloJsonVisit = rowOriginal.solo.getOrNull(0)
            val soloJsonCasa  = rowOriginal.solo.getOrNull(1)
            val coincideCasa  = soloJsonCasa .toSoloDouble() == soloCalcCasa .replace("½", ".5").toDoubleOrNull()
            val coincideVisit = soloJsonVisit.toSoloDouble() == soloCalcVisit.replace("½", ".5").toDoubleOrNull()

            // --- SI/NO (JC) ---
            val siNoParams = ParseUtils.extraerSiNoParamsDesdeTotalJC(rowOriginal.total)
            val siNoCalc: Pair<Int, Int>? = siNoParams?.let { (tot, tipo, linea) ->
                SiNoData.buscarPrecioFlexible(tot, tipo, linea)
            }
            val sinoJsonSi  = rowOriginal.sino.getOrNull(0).signedInt()
            val sinoJsonNo  = rowOriginal.sino.getOrNull(1).signedInt()
            val coincideSi  = sinoJsonSi != null && siNoCalc?.first  == sinoJsonSi
            val coincideNo  = sinoJsonNo != null && siNoCalc?.second == sinoJsonNo

            // --- PA (favorito 1ra mitad) ---
            val paLineaCasaUse  = rowOriginal.paLineaCasa  ?: mlCasaStr.mlToken()
            val paLineaVisitUse = rowOriginal.paLineaVisit ?: mlVisitStr.mlToken()

            val halfCasaInt  = paLineaCasaUse.mlInt()
            val halfVisitInt = paLineaVisitUse.mlInt()
            val favoritoMitad = when {
                halfCasaInt != null && halfVisitInt != null -> when {
                    halfCasaInt < 0 && halfVisitInt >= 0 -> "Casa"
                    halfVisitInt < 0 && halfCasaInt  >= 0 -> "Visitante"
                    halfCasaInt < 0 && halfVisitInt < 0 ->
                        if (kotlin.math.abs(halfCasaInt) >= kotlin.math.abs(halfVisitInt)) "Casa" else "Visitante"
                    else -> null
                }
                halfCasaInt != null && halfCasaInt < 0 -> "Casa"
                halfVisitInt != null && halfVisitInt < 0 -> "Visitante"
                else -> null
            }

            val lineaFavorito = when (favoritoMitad) {
                "Casa"      -> paLineaCasaUse
                "Visitante" -> paLineaVisitUse
                else        -> null
            }
            val paFav: Pair<Int, Int>? =
                if (favoritoMitad != null && !lineaFavorito.isNullOrBlank())
                    PaData.buscarPrecio(lineaFavorito, favoritoMitad)
                else null

            val paJsonVisitRaw = rowOriginal.pa.getOrNull(0)?.signedInt()
            val paJsonCasaRaw  = rowOriginal.pa.getOrNull(1)?.signedInt()

            val directPaCasaCalc: Int? = when (favoritoMitad) {
                "Casa" -> paFav?.first
                "Visitante" -> paFav?.second
                else -> null
            }
            val directPaVisitCalc: Int? = when (favoritoMitad) {
                "Casa" -> paFav?.second
                "Visitante" -> paFav?.first
                else -> null
            }
            val swappedPaVisitCalc = directPaCasaCalc
            val swappedPaCasaCalc = directPaVisitCalc

            fun scorePa(visitCalc: Int?, casaCalc: Int?): Int {
                var score = 0
                if (visitCalc != null && paJsonVisitRaw != null) {
                    score += if (visitCalc == paJsonVisitRaw) 3 else if (withinRange(visitCalc, paJsonVisitRaw)) 1 else 0
                }
                if (casaCalc != null && paJsonCasaRaw != null) {
                    score += if (casaCalc == paJsonCasaRaw) 3 else if (withinRange(casaCalc, paJsonCasaRaw)) 1 else 0
                }
                return score
            }

            val directScore = scorePa(directPaVisitCalc, directPaCasaCalc)
            val swappedScore = scorePa(swappedPaVisitCalc, swappedPaCasaCalc)
            val useSwappedPa = swappedScore > directScore

            val paVisitCalc = if (useSwappedPa) swappedPaVisitCalc else directPaVisitCalc
            val paCasaCalc = if (useSwappedPa) swappedPaCasaCalc else directPaCasaCalc
            val paInverted = useSwappedPa

            val coincidePaVisit = paVisitCalc != null && paJsonVisitRaw != null && paJsonVisitRaw == paVisitCalc
            val coincidePaCasa  = paCasaCalc  != null && paJsonCasaRaw  != null && paJsonCasaRaw  == paCasaCalc

            // --- TERCIO: ML (regla 30) y O/U (tabla)
            val tercioMl = TercioData.calcularMlDesdeH(paLineaVisitUse, paLineaCasaUse)
            val tercioMlList = tercioMl?.let { listOf(it.visit, it.casa) } ?: emptyList()

            val tercioTabla = if (rowOriginal.hTotal != null && rowOriginal.hTipo != null && rowOriginal.hLinea != null) {
                TercioData.buscarTercio(rowOriginal.hTotal, rowOriginal.hTipo, rowOriginal.hLinea)
            } else null

            val tercioDesc = tercioTabla?.let { "${it.tercio} ${it.tipoT} ${it.lineaT}" } ?: "NO SOPORTADO"
            val diagTercioMl = tercioMl?.let { "TERCIO-ML: Visit=${it.visit} / Casa=${it.casa} [Fav=${it.favSide}]" } ?: "TERCIO-ML: --"
            val diagTercioOU = "TERCIO: $tercioDesc"

            // --- Diagnóstico general ---
            val diagSolo = if (coincideCasa && coincideVisit)
                "SOLO: OK" else "SOLO: Casa=$soloCalcCasa / Visit=$soloCalcVisit"
            val diagSino = if (coincideSi && coincideNo)
                "SI/NO: OK" else "SI/NO: Sí=${siNoCalc?.first ?: "--"} / No=${siNoCalc?.second ?: "--"}"
            val diagPa = when {
                paFav == null -> "PA: NO SOPORTADO"
                coincidePaCasa && coincidePaVisit -> "PA: OK"
                else -> "PA: Casa=${paCasaCalc ?: "--"} / Visit=${paVisitCalc ?: "--"}" +
                        (if (paInverted) " [JSON invertido]" else "")
            }

            // --- Favorito ML JC (display) ---
            val favoritoSide = when {
                mlCasaInt != null && mlVisitInt != null -> when {
                    mlCasaInt < 0 && mlVisitInt >= 0 -> "Casa"
                    mlVisitInt < 0 && mlCasaInt >= 0 -> "Visitante"
                    mlCasaInt < 0 && mlVisitInt < 0 ->
                        if (abs(mlCasaInt) >= abs(mlVisitInt)) "Casa" else "Visitante"
                    else -> "—"
                }
                mlCasaInt != null && mlCasaInt < 0 -> "Casa"
                mlVisitInt != null && mlVisitInt < 0 -> "Visitante"
                else -> "—"
            }

            val soloFinal: List<String> = listOf(soloCalcVisit, soloCalcCasa)
            val sinoFinal = siNoCalc?.let { listOf(it.first.toString(), it.second.toString()) } ?: rowOriginal.sino

            val paFinal: List<String> = when {
                paVisitCalc != null && paCasaCalc != null ->
                    listOf(paVisitCalc.toString(), paCasaCalc.toString())
                else -> rowOriginal.pa
            }

            val rowNormalizado = rowOriginal.copy(
                solo = soloFinal,
                sino = sinoFinal,
                pa   = paFinal,
                paLineaCasa  = paLineaCasaUse,
                paLineaVisit = paLineaVisitUse,
                // Guardamos resultados de TERCIO
                tercioMl = tercioMlList,
                tercio   = tercioTabla?.tercio,
                tercioTipo  = tercioTabla?.tipoT,
                tercioLinea = tercioTabla?.lineaT
            )

            // ...tras construir rowNormalizado y diag*...
            // ...después de calcular todo (soloCalc, siNoCalc, pa*, tercioMl, tercioTabla)...

            val tercioJsonMlVisit = rowOriginal.tercioMl.getOrNull(0)
            val tercioJsonMlCasa  = rowOriginal.tercioMl.getOrNull(1)
            val tercioJsonTotal   = rowOriginal.tercio
            val tercioJsonTipo    = rowOriginal.tercioTipo
            val tercioJsonLinea   = rowOriginal.tercioLinea

            val tercioFav = tercioMl?.favSide
            val tercioMlCalcVisit = tercioMl?.visit
            val tercioMlCalcCasa  = tercioMl?.casa
            val tercioOuCalcTotal = tercioTabla?.tercio
            val tercioOuCalcTipo  = tercioTabla?.tipoT
            val tercioOuCalcLinea = tercioTabla?.lineaT

            analizados += JuegoSoloAnalizado(
                row = rowOriginal, // ← no uses el normalizado para no pisar JSON

                // SOLO
                soloCalcCasa = soloCalcCasa,
                soloCalcVisit = soloCalcVisit,
                coincideCasa = coincideCasa,
                coincideVisit = coincideVisit,
                soloJsonVisit = rowOriginal.solo.getOrNull(0),
                soloJsonCasa  = rowOriginal.solo.getOrNull(1),

                // SI/NO
                sinoCalcSi = siNoCalc?.first,
                sinoCalcNo = siNoCalc?.second,
                coincideSi = coincideSi,
                coincideNo = coincideNo,
                sinoJsonSi = rowOriginal.sino.getOrNull(0),
                sinoJsonNo = rowOriginal.sino.getOrNull(1),

                // PA
                paCalcCasa = paCasaCalc,
                paCalcVisit = paVisitCalc,
                coincidePaCasa = coincidePaCasa,
                coincidePaVisit = coincidePaVisit,
                paJsonVisit = rowOriginal.pa.getOrNull(0),
                paJsonCasa  = rowOriginal.pa.getOrNull(1),

                // TERCIO JSON
                tercioJsonMlVisit = tercioJsonMlVisit,
                tercioJsonMlCasa  = tercioJsonMlCasa,
                tercioJsonTotal   = tercioJsonTotal,
                tercioJsonTipo    = tercioJsonTipo,
                tercioJsonLinea   = tercioJsonLinea,

                // TERCIO Calc
                tercioMlCalcVisit = tercioMlCalcVisit,
                tercioMlCalcCasa  = tercioMlCalcCasa,
                tercioFavCalc     = tercioFav,
                tercioOuCalcTotal = tercioOuCalcTotal,
                tercioOuCalcTipo  = tercioOuCalcTipo,
                tercioOuCalcLinea = tercioOuCalcLinea,

                diagnostico = listOf(diagSolo, diagSino, diagPa, diagTercioMl, diagTercioOU).joinToString(" | "),
                favorito = favoritoSide
            )

// (si aún necesitas _rowsNormalizados, sigue llenándolo aparte)


            normalizados += rowNormalizado

            Log.d(
                "Analisis",
                "${rowOriginal.equipos.getOrNull(0)} vs ${rowOriginal.equipos.getOrNull(1)} @ ${rowOriginal.hora} | " +
                        "$diagSolo | $diagSino | $diagPa | $diagTercioMl | $diagTercioOU | Fav=$favoritoSide"
            )
        }

        _juegosSolo.postValue(analizados)
        _rowsNormalizados.postValue(normalizados)
    }
}
