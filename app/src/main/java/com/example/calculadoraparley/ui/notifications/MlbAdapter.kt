package com.example.calculadoraparley.ui.notifications

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.calculadoraparley.R
import com.example.calculadoraparley.databinding.ItemMlbRowBinding
import kotlin.math.abs

class MlbAdapter(
    private val juegosAnalizados: List<JuegoSoloAnalizado>
) : RecyclerView.Adapter<MlbAdapter.VH>() {

    private val expandedPositions = mutableSetOf<Int>()

    init {
        val firstProblemIndex = juegosAnalizados.indexOfFirst { overallState(it) != State.OK }
        if (firstProblemIndex >= 0) expandedPositions += firstProblemIndex
    }

    class VH(val b: ItemMlbRowBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemMlbRowBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VH(binding)
    }

    override fun getItemCount() = juegosAnalizados.size

    private enum class State { OK, REVIEW, ERROR }

    private fun fmtSigned(i: Int?): String = i?.let { if (it > 0) "+$it" else it.toString() } ?: "--"

    private fun Double.prettyHalf(): String =
        if (this % 1.0 == 0.0) this.toInt().toString() else "${this.toInt()}½"

    private fun parseSignedIntLoose(s: String?): Int? {
        if (s.isNullOrBlank()) return null
        val m = Regex("""^\s*([+-])?\s*(\d{2,3})\s*$""").find(s) ?: return null
        val sign = m.groupValues[1]
        val num = m.groupValues[2].toIntOrNull() ?: return null
        return if (sign == "-") -num else num
    }

    private fun parseSignedIntAbs(s: String?): Int? = parseSignedIntLoose(s)?.let { abs(it) }

    private fun eqLineAbs(a: String?, b: String?): Boolean {
        val ai = parseSignedIntAbs(a)
        val bi = parseSignedIntAbs(b)
        return ai != null && bi != null && ai == bi
    }

    private fun detectHalfFavorite(visitLine: String?, casaLine: String?): String {
        val visit = parseSignedIntLoose(visitLine)
        val casa = parseSignedIntLoose(casaLine)
        return when {
            visit != null && casa != null -> when {
                visit < 0 && casa >= 0 -> "Visitante"
                casa < 0 && visit >= 0 -> "Casa"
                visit < 0 && casa < 0 -> if (abs(visit) >= abs(casa)) "Visitante" else "Casa"
                else -> "--"
            }
            visit != null && visit < 0 -> "Visitante"
            casa != null && casa < 0 -> "Casa"
            else -> "--"
        }
    }

    private fun paWithinRange(jsonRaw: String?, calc: Int?): Boolean {
        val json = parseSignedIntLoose(jsonRaw) ?: return true
        val calcValue = calc ?: return false
        return abs(json - calcValue) <= 5
    }

    private fun mlWithinRange(jsonRaw: String?, calcRaw: String?): Boolean {
        val json = parseSignedIntLoose(jsonRaw) ?: return true
        val calc = parseSignedIntLoose(calcRaw) ?: return false
        return abs(json - calc) <= 5
    }

    private fun tercioMlMatches(jsonVisit: String?, jsonCasa: String?, calcVisit: String?, calcCasa: String?): Boolean {
        val directMatch = mlWithinRange(jsonVisit, calcVisit) && mlWithinRange(jsonCasa, calcCasa)
        val invertedMatch = mlWithinRange(jsonVisit, calcCasa) && mlWithinRange(jsonCasa, calcVisit)
        return directMatch || invertedMatch
    }

    private fun splitTeamPitcher(raw: String?): Pair<String, String> {
        val value = raw.orEmpty().trim()
        if (!value.contains("(")) return value to "--"
        val team = value.substringBefore("(").trim()
        val pitcher = "(${value.substringAfter("(")}".trim()
        return team to pitcher
    }

    private fun normalizeHalfGlyph(raw: String?): String =
        raw.orEmpty().replace("Â½", "½").replace("Ã‚Â½", "½").ifBlank { "--" }

    private fun normalizedTotal(raw: String): String = normalizeHalfGlyph(raw)

    private fun halfTotalSummary(row: TablaRow): String {
        return formatOuLine(row.hTotal, row.hTipo, row.hLinea)
    }

    private fun formatOuLine(total: Double?, tipo: String?, linea: String?): String {
        if (total == null && tipo == null && linea == null) return "--"
        val totalText = total?.prettyHalf() ?: "--"
        val tipoText = tipo?.uppercase() ?: "--"
        val lineText = normalizeHalfGlyph(linea)
        return "$totalText $tipoText $lineText"
    }

    private fun overallState(j: JuegoSoloAnalizado): State {
        val siJson = parseSignedIntLoose(j.sinoJsonSi)
        val noJson = parseSignedIntLoose(j.sinoJsonNo)
        val siOk = siJson == null || siJson == j.sinoCalcSi
        val noOk = noJson == null || noJson == j.sinoCalcNo
        val paVisitOk = j.coincidePaVisit || paWithinRange(j.paJsonVisit, j.paCalcVisit)
        val paCasaOk = j.coincidePaCasa || paWithinRange(j.paJsonCasa, j.paCalcCasa)
        val paAnyMismatch = (j.paCalcVisit != null || j.paCalcCasa != null) && (!paVisitOk || !paCasaOk)
        val soloAnyMismatch = !j.coincideVisit || !j.coincideCasa
        val hasTercioMlJson = j.tercioJsonMlVisit != null && j.tercioJsonMlCasa != null
        val tercioMlOk = hasTercioMlJson &&
            tercioMlMatches(j.tercioJsonMlVisit, j.tercioJsonMlCasa, j.tercioMlCalcVisit, j.tercioMlCalcCasa)
        val tercioOuOk = j.tercioJsonTotal != null &&
            j.tercioOuCalcTotal != null &&
            abs(j.tercioJsonTotal - j.tercioOuCalcTotal) < 0.001 &&
            j.tercioJsonTipo.equals(j.tercioOuCalcTipo, true) &&
            eqLineAbs(j.tercioJsonLinea, j.tercioOuCalcLinea)
        val tercioHasIssue = (j.tercioJsonMlVisit != null || j.tercioJsonTotal != null) && !(tercioMlOk && tercioOuOk)

        return when {
            soloAnyMismatch || paAnyMismatch || !siOk || !noOk -> State.ERROR
            tercioHasIssue || j.diagnostico.contains("NO SOPORTADO", ignoreCase = true) -> State.REVIEW
            else -> State.OK
        }
    }

    private fun stateLabel(state: State): String = when (state) {
        State.OK -> "OK"
        State.REVIEW -> "REVISAR"
        State.ERROR -> "ERROR"
    }

    private fun setStatusVisuals(binding: ItemMlbRowBinding, state: State) {
        val context = binding.root.context
        val (textColor, backgroundColor, strokeColor) = when (state) {
            State.OK -> Triple(
                R.color.md_theme_onPrimaryContainer,
                R.color.md_theme_primaryContainer,
                R.color.md_theme_primary
            )
            State.REVIEW -> Triple(
                R.color.md_theme_onTertiaryContainer,
                R.color.md_theme_tertiaryContainer,
                R.color.md_theme_tertiary
            )
            State.ERROR -> Triple(
                R.color.md_theme_onErrorContainer,
                R.color.md_theme_errorContainer,
                R.color.md_theme_error
            )
        }

        binding.tvStatus.text = stateLabel(state)
        binding.tvStatus.setTextColor(ContextCompat.getColor(context, textColor))
        binding.tvStatus.setBackgroundColor(ContextCompat.getColor(context, backgroundColor))
        binding.cardContainer.strokeColor = ContextCompat.getColor(context, strokeColor)
    }

    private fun buildTercioMlBlock(j: JuegoSoloAnalizado): String {
        return "ML\n" +
            "Visitante  JSON ${j.tercioJsonMlVisit ?: "--"}   Calc ${j.tercioMlCalcVisit ?: "--"}\n" +
            "Casa       JSON ${j.tercioJsonMlCasa ?: "--"}   Calc ${j.tercioMlCalcCasa ?: "--"}"
    }

    private fun buildTercioTotalBlock(feedText: String, calcText: String): String {
        return "TOTAL\n" +
            "Feed      $feedText\n" +
            "Calc      $calcText"
    }

    @SuppressLint("SetTextI18n")
    override fun onBindViewHolder(holder: VH, position: Int) {
        val j = juegosAnalizados[position]
        val row = j.row
        val b = holder.b
        val context = b.root.context
        val expanded = expandedPositions.contains(position)
        val state = overallState(j)

        val (visitTeam, visitPitcher) = splitTeamPitcher(row.equipos.getOrNull(0))
        val (homeTeam, homePitcher) = splitTeamPitcher(row.equipos.getOrNull(1))
        val timeLabel = row.hora.ifBlank { "--:--" }

        b.tvTime.text = timeLabel
        b.tvTeams.text = "$visitTeam vs $homeTeam"
        b.tvPitchers.text = "$visitPitcher vs $homePitcher"

        b.tvSummaryMl.text = "ML JC\n${row.ml.getOrNull(0) ?: "--"} / ${row.ml.getOrNull(1) ?: "--"}"
        b.tvSummaryHalf.text = "ML 1H\n${row.paLineaVisit ?: "--"} / ${row.paLineaCasa ?: "--"}"
        b.tvSummaryTotal.text = "TOTAL JC\n${normalizedTotal(row.total).uppercase()}"
        b.tvSummaryHalfTotal.text = "TOTAL H\n${halfTotalSummary(row)}"

        val soloVisitJson = j.soloJsonVisit ?: "--"
        val soloCasaJson = j.soloJsonCasa ?: "--"
        val soloVisitOk = j.coincideVisit
        val soloCasaOk = j.coincideCasa
        val soloVisitRef = if (soloVisitOk) "OK" else "ERROR (Ref: ML ${row.ml.getOrNull(0) ?: "--"} / Tot ${row.total})"
        val soloCasaRef = if (soloCasaOk) "OK" else "ERROR (Ref: ML ${row.ml.getOrNull(1) ?: "--"} / Tot ${row.total})"
        b.tvSoloBlock.text =
            "SOLO\n" +
                "Visitante  JSON $soloVisitJson   Calc ${j.soloCalcVisit}   $soloVisitRef\n" +
                "Casa       JSON $soloCasaJson   Calc ${j.soloCalcCasa}   $soloCasaRef"
        b.tvSoloBlock.setTextColor(ContextCompat.getColor(context, R.color.md_theme_onSurface))

        val paLineUsed = when {
            row.paLineaCasa != null && row.paLineaVisit != null -> "${row.paLineaVisit} / ${row.paLineaCasa}"
            row.paLineaVisit != null -> row.paLineaVisit
            row.paLineaCasa != null -> row.paLineaCasa
            else -> "--"
        }
        val paFavorite = detectHalfFavorite(row.paLineaVisit, row.paLineaCasa)
        val paVisitOk = j.coincidePaVisit || paWithinRange(j.paJsonVisit, j.paCalcVisit)
        val paCasaOk = j.coincidePaCasa || paWithinRange(j.paJsonCasa, j.paCalcCasa)
        val paStatus = when {
            j.paCalcVisit == null && j.paCalcCasa == null -> "NO SOPORTADO"
            j.coincidePaVisit && j.coincidePaCasa -> "OK"
            paVisitOk && paCasaOk -> "DENTRO DEL RANGO"
            else -> "DIFERENCIA DETECTADA"
        }
        val paStateText = when {
            j.paCalcVisit == null && j.paCalcCasa == null -> "PA\nNo soportado"
            else ->
                "PA\n" +
                    "JSON\n" +
                    "  Visitante  ${j.paJsonVisit ?: "--"}\n" +
                    "  Casa       ${j.paJsonCasa ?: "--"}\n" +
                    "CALC\n" +
                    "  Visitante  ${fmtSigned(j.paCalcVisit)}\n" +
                    "  Casa       ${fmtSigned(j.paCalcCasa)}\n" +
                    "Linea usada  $paLineUsed\n" +
                    "Favorito     $paFavorite\n" +
                    "Estado       $paStatus"
        }
        b.tvPaBlock.text = paStateText
        b.tvPaBlock.setTextColor(
            ContextCompat.getColor(
                context,
                when {
                    paStatus == "DIFERENCIA DETECTADA" -> R.color.md_theme_error
                    paStatus == "DENTRO DEL RANGO" -> R.color.md_theme_tertiary
                    else -> R.color.md_theme_onSurface
                }
            )
        )

        val siJson = j.sinoJsonSi ?: "--"
        val noJson = j.sinoJsonNo ?: "--"
        val siCalc = fmtSigned(j.sinoCalcSi)
        val noCalc = fmtSigned(j.sinoCalcNo)
        val siOk = parseSignedIntLoose(j.sinoJsonSi)?.let { it == j.sinoCalcSi } ?: true
        val noOk = parseSignedIntLoose(j.sinoJsonNo)?.let { it == j.sinoCalcNo } ?: true
        val siNoStatus = if (siOk && noOk) "MATCH" else "FAIL (Ref: Tot ${row.total})"
        b.tvSiNoBlock.text =
            "SI / NO\n" +
                "JSON   SI $siJson   NO $noJson\n" +
                "CALC   SI $siCalc   NO $noCalc\n" +
                "Estado $siNoStatus"
        b.tvSiNoBlock.setTextColor(
            ContextCompat.getColor(context, if (siOk && noOk) R.color.md_theme_onSurface else R.color.md_theme_error)
        )

        val hasTercioMlJson = j.tercioJsonMlVisit != null && j.tercioJsonMlCasa != null
        val hasTercioOuJson = j.tercioJsonTotal != null && j.tercioJsonTipo != null && j.tercioJsonLinea != null
        val hasTercioMlCalc = j.tercioMlCalcVisit != null && j.tercioMlCalcCasa != null
        val hasTercioOuCalc = j.tercioOuCalcTotal != null && j.tercioOuCalcTipo != null && j.tercioOuCalcLinea != null

        val tercioMlOk = hasTercioMlJson &&
            tercioMlMatches(j.tercioJsonMlVisit, j.tercioJsonMlCasa, j.tercioMlCalcVisit, j.tercioMlCalcCasa)
        val tercioOuOk = j.tercioJsonTotal != null &&
            j.tercioOuCalcTotal != null &&
            abs(j.tercioJsonTotal - j.tercioOuCalcTotal) < 0.001 &&
            j.tercioJsonTipo.equals(j.tercioOuCalcTipo, true) &&
            eqLineAbs(j.tercioJsonLinea, j.tercioOuCalcLinea)
        val tercioStatus = when {
            hasTercioMlJson || hasTercioOuJson -> if (tercioMlOk && tercioOuOk) "EN RANGO" else "REVISAR"
            hasTercioMlCalc || hasTercioOuCalc -> "OK"
            else -> "REVISAR"
        }

        val tercioFeedTotal = formatOuLine(j.tercioJsonTotal, j.tercioJsonTipo, j.tercioJsonLinea)
        val tercioCalcTotal = formatOuLine(j.tercioOuCalcTotal, j.tercioOuCalcTipo, j.tercioOuCalcLinea)

        b.tvTercioBlock.text =
            "TERCIO\n" +
                buildTercioMlBlock(j) + "\n\n" +
                buildTercioTotalBlock(tercioFeedTotal, tercioCalcTotal) + "\n\n" +
                "Favorito  ${j.tercioFavCalc ?: "--"}\n" +
                "Estado    $tercioStatus"
        b.tvTercioBlock.setTextColor(
            ContextCompat.getColor(context, if (tercioMlOk && tercioOuOk) R.color.md_theme_onSurface else R.color.md_theme_tertiary)
        )

        val diagnosticParts = mutableListOf<String>()
        if (!soloVisitOk || !soloCasaOk) diagnosticParts += "SOLO mismatch"
        if (!(paVisitOk && paCasaOk) && (j.paCalcVisit != null || j.paCalcCasa != null)) {
            diagnosticParts += "PA mismatch"
        } else if (!(j.coincidePaVisit && j.coincidePaCasa) && (j.paCalcVisit != null || j.paCalcCasa != null)) {
            diagnosticParts += "PA dentro de rango"
        }
        if (!(siOk && noOk)) diagnosticParts += "SI/NO fail"
        if (tercioStatus == "REVISAR" && (j.tercioJsonMlVisit != null || j.tercioJsonTotal != null)) {
            diagnosticParts += "TERCIO revisar"
        } else if (tercioStatus == "EN RANGO") {
            diagnosticParts += "TERCIO en rango"
        } else if (tercioStatus == "OK") {
            diagnosticParts += "TERCIO ok"
        }
        if (diagnosticParts.isEmpty()) diagnosticParts += "Todo coincide"
        b.tvDiagnostic.text = diagnosticParts.joinToString(" | ").uppercase()

        b.layoutExpanded.visibility = if (expanded) View.VISIBLE else View.GONE
        setStatusVisuals(b, state)

        val expandedBg = when (state) {
            State.OK -> R.color.md_theme_surfaceContainerLow
            State.REVIEW -> R.color.md_theme_surfaceContainerLow
            State.ERROR -> R.color.md_theme_surfaceContainerHigh
        }
        b.cardContainer.setCardBackgroundColor(ContextCompat.getColor(context, expandedBg))

        val toggle = View.OnClickListener {
            if (expandedPositions.contains(position)) expandedPositions.remove(position) else expandedPositions.add(position)
            notifyItemChanged(position)
        }
        b.root.setOnClickListener(toggle)
        b.btnViewJson.setOnClickListener(toggle)
        b.btnRecalculate.setOnClickListener(toggle)
    }
}
