package com.example.calculadoraparley.util

import android.util.Log
import com.example.calculadoraparley.ui.notifications.TablaRow
import org.json.JSONArray
import org.json.JSONObject

object ParseUtils {

    // -------- JSON helpers --------
    private fun JSONObject.optObj(key: String): JSONObject? =
        if (has(key) && !isNull(key)) getJSONObject(key) else null

    private fun JSONObject.optStr(key: String): String =
        if (has(key) && !isNull(key)) getString(key).trim() else ""

    private fun JSONObject.optPair(key: String): Pair<String, String> {
        val o = optObj(key) ?: return "" to ""
        val v = o.optStr("visit")
        val c = o.optStr("casa")
        return v to c
    }

    private fun JSONArray.toLines(): List<String> =
        (0 until length()).map { optString(it, "").trim() }.filter { it.isNotEmpty() }

    // -------- Normalización --------
    private fun sanitize(raw: String?): String =
        raw.orEmpty()
            .replace('\u00A0', ' ')
            .replace(" ", "")
            .replace('−', '-')
            .replace('–', '-')
            .replace('—', '-')
            .replace('＋', '+')

    private fun normalizeHalf(s: String?): String =
        sanitize(s)
            .replace("½", ".5")
            .replace(Regex("""(?<=\d)1/2"""), ".5")

    private fun canonHalf(x: Double): Double =
        kotlin.math.round(x * 2.0) / 2.0

    // -------- Parseos básicos --------
    fun parseMl(raw: String?): Int? {
        val s = sanitize(raw)
        if (s.isBlank()) return null
        val m = Regex("""([+-])(\d{3})(?!\d)""").find(s) ?: return null
        val sign = if (m.groupValues[1] == "-") -1 else 1
        return sign * m.groupValues[2].toInt()
    }

    // token "+120"/"-155"
    private fun mlToken(raw: String?): String? =
        Regex("([+-]\\d{3})(?!\\d)").find(sanitize(raw))?.groupValues?.get(1)

    data class TotalParsed(val total: Double, val tipo: String, val linea: String)

    fun parseTotalField(field: String): TotalParsed? {
        val cleaned = normalizeHalf(field).lowercase()
        val m = Regex("""^(\d+(?:\.\d+)?)([oup])([+-]?\d+)$""").find(cleaned) ?: return null
        val t = m.groupValues[1].toDoubleOrNull() ?: return null
        val tipo = m.groupValues[2].uppercase()
        val linea = m.groupValues[3]
        return TotalParsed(t, tipo, linea)
    }

    // SI/NO desde TOTAL (JC)
    fun extraerSiNoParamsDesdeTotalJC(totalRaw: String?): Triple<Double, String, String>? {
        if (totalRaw.isNullOrBlank()) return null
        val s = normalizeHalf(totalRaw).lowercase()

        Regex("""^(\d+(?:\.\d+)?)([oup])([+-]?\d+)$""").find(s)?.let { m ->
            val total = canonHalf(m.groupValues[1].toDouble())
            val tipo  = m.groupValues[2].uppercase()
            val linea0 = m.groupValues[3]
            val linea = if (linea0.startsWith("+") || linea0.startsWith("-")) linea0 else "-$linea0"
            return Triple(total, tipo, linea)
        }

        Regex("""^(\d+(?:\.\d+)?)([+-]\d+)$""").find(s)?.let { m ->
            val total = canonHalf(m.groupValues[1].toDouble())
            val tipo  = "P"
            val linea = m.groupValues[2]
            return Triple(total, tipo, linea)
        }

        Log.w("Parse", "TOTAL no parseable: '$totalRaw'")
        return null
    }

    // ===== NUEVO: parser de H (mitad.total) para TERCIO =====
    // Acepta: "4o115", "4 o115", "4u120", "4½ u120", "5pk-110", "5 pk -110"
    fun extraerHParamsDesdeMitad(totalMitadRaw: String?): Triple<Double, String, String>? {
        if (totalMitadRaw.isNullOrBlank()) return null
        val s = normalizeHalf(totalMitadRaw).lowercase()

        Regex("""^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$""").find(s)?.let { m ->
            val h      = canonHalf(m.groupValues[1].toDouble())
            val tipo   = when (m.groupValues[2]) { "o" -> "O"; "u" -> "U"; else -> "PK" }
            val linea0 = m.groupValues[3]
            val linea  = if (linea0.startsWith("+") || linea0.startsWith("-")) linea0 else "-$linea0"
            return Triple(h, tipo, linea)
        }

        Log.w("Parse", "H (mitad.total) no parseable: '$totalMitadRaw'")
        return null
    }

    // -------- Adaptador JSON -> TablaRow --------
    fun parseMlbJsonNuevo(json: String): List<TablaRow> {
        val arr = JSONArray(json)

        // === util local ===
        data class TercioPack(
            val mlVisit: String?, val mlCasa: String?,
            val total: Double?, val tipo: String?, val linea: String?
        )
        fun normTeam(raw: String): String =
            raw.substringBefore("(")
                .lowercase()
                .replace("2j-", "")
                .replace("\\s+".toRegex(), " ")
                .replace("[^a-z ]".toRegex(), "")
                .replace(" ", "")
                .trim()
        fun normHora(h: String) = h.lowercase().replace("\\s+".toRegex(), "")
        fun tercioKey(visit: String, casa: String, hora: String) =
            "${normTeam(visit)}|${normTeam(casa)}|${normHora(hora)}"

        fun parseOuToken(tok: String): Triple<Double, String, String>? {
            val m = Regex("^\\s*(\\d+(?:[.,]5|½)?)\\s*([ouOU])\\s*([+-]?\\d{2,3})\\s*$").find(tok) ?: return null
            val total = m.groupValues[1].replace("½", ".5").replace(",", ".").toDouble()
            val tipo = m.groupValues[2].uppercase() // O/U
            val lineaRaw = m.groupValues[3]
            val linea = if (lineaRaw.startsWith("+") || lineaRaw.startsWith("-")) lineaRaw else "-$lineaRaw"
            return Triple(total, tipo, linea)
        }

        // === 1) construir mapa de datos 'tercio' ===
        val tercioMap = mutableMapOf<String, TercioPack>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optString("tipo") != "tercio") continue

            val hora = o.optString("hora")
            val eq = o.optJSONObject("equipos") ?: continue
            val v = eq.optString("visit")
            val c = eq.optString("casa")

            val ml = o.optJSONObject("ml")
            val mlV = ml?.optString("visit")?.trim()?.takeIf { it.isNotEmpty() }
            val mlC = ml?.optString("casa") ?.trim()?.takeIf { it.isNotEmpty() }

            val rlTot = o.optJSONArray("rl_total")
            val ouTok = rlTot?.optString(0)
            val ou = ouTok?.let { parseOuToken(it) }

            tercioMap[tercioKey(v, c, hora)] = TercioPack(
                mlVisit = mlV,
                mlCasa  = mlC,
                total   = ou?.first,
                tipo    = ou?.second,
                linea   = ou?.third
            )
        }

        // === 2) filas 'mlb' fusionadas con 'tercio' ===
        val out = mutableListOf<TablaRow>()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            if (obj.optString("tipo") != "mlb") continue

            val hora = obj.optStr("hora")

            val eqObj = obj.getJSONObject("equipos")
            val eqVisit = eqObj.optStr("visit")
            val eqCasa  = eqObj.optStr("casa")

            val jc = obj.getJSONObject("jc")
            val (mlVisitJC, mlCasaJC) = jc.optPair("ml")
            val rlJC    = jc.optJSONArray("rl")?.toLines() ?: emptyList()
            val totalJC = jc.optStr("total")
            val soloObj = jc.optObj("solo")
            val soloVisit = soloObj?.optStr("visit") ?: ""
            val soloCasa  = soloObj?.optStr("casa")  ?: ""
            val paObj = jc.optObj("pa")
            val paVisitJC = paObj?.optStr("visit") ?: ""
            val paCasaJC  = paObj?.optStr("casa")  ?: ""

            // 1ª mitad
            val mitadObj = obj.optObj("mitad")
            val (mlMitadVisit, mlMitadCasa) = mitadObj?.optPair("ml") ?: ("" to "")
            val hTriple = extraerHParamsDesdeMitad(mitadObj?.optStr("total"))

            // Tokens ML para PA/TERCIO: prioridad MITAD > JC
            val paLineaCasaFinal  = mlToken(mlMitadCasa)  ?: mlToken(mlCasaJC)
            val paLineaVisitFinal = mlToken(mlMitadVisit) ?: mlToken(mlVisitJC)

            // Validación básica de ML JC
            val mlOk = listOf(mlVisitJC, mlCasaJC).all { Regex("""[+-]\d{3}\b""").containsMatchIn(sanitize(it)) }
            if (!mlOk || eqVisit.isBlank() || eqCasa.isBlank()) {
                Log.w("Parse", "Fila ignorada por ML inválido o equipos vacíos: visit='$mlVisitJC' casa='$mlCasaJC' eqV='$eqVisit' eqC='$eqCasa'")
                continue
            }

            val sinoTriple = extraerSiNoParamsDesdeTotalJC(totalJC)
            if (sinoTriple == null && totalJC.isNotBlank()) {
                Log.w("Parse", "TOTAL no parseable en fila: '$totalJC'")
            }

            // Emparejar con 'tercio'
            val key = tercioKey(eqVisit, eqCasa, hora)
            val tercio = tercioMap[key]

            out += TablaRow(
                tipo = "juego_completo",
                hora = hora,
                equipos = listOf(eqVisit, eqCasa),
                ml = listOf(mlVisitJC, mlCasaJC),
                rl = rlJC,
                total = totalJC,
                solo = listOf(soloVisit, soloCasa),
                pa = listOf(paVisitJC, paCasaJC),
                sino = emptyList(),
                tipoSino = sinoTriple?.second,
                lineaSino = sinoTriple?.third,
                paLineaCasa = paLineaCasaFinal,
                paLineaVisit = paLineaVisitFinal,
                // H para TERCIO
                hTotal = hTriple?.first,
                hTipo = hTriple?.second,
                hLinea = hTriple?.third,
                // Datos TERCIO del bloque dedicado
                tercioMl = listOf(tercio?.mlVisit, tercio?.mlCasa),
                tercio = tercio?.total,
                tercioTipo = tercio?.tipo,
                tercioLinea = tercio?.linea,
                rl_total = null
            )
        }
        Log.d("Analisis", "Registros JSON adaptados: ${out.size}")
        return out
    }


    private fun normTeam(raw: String): String =
        raw.substringBefore("(")                // quita pitcher
            .lowercase()
            .replace("2j-", "")                 // quita prefijos
            .replace("\\s+".toRegex(), " ")
            .replace("[^a-z ]".toRegex(), "")   // solo letras y espacios
            .replace(" ", "")                   // compara sin espacios
            .trim()

    private fun normHora(h: String): String =
        h.lowercase().replace("\\s+".toRegex(), "")

    private fun tercioKey(visit: String, casa: String, hora: String) =
        "${normTeam(visit)}|${normTeam(casa)}|${normHora(hora)}"

    private fun parseOuToken(tok: String): Triple<Double,String,String>? {
        // "3 o125", "2½ u140", "3.5 U -115"
        val m = Regex(
            "^\\s*(\\d+(?:[.,]5|½)?)\\s*([ouOU])\\s*([+-]?\\d{2,3})\\s*$"
        ).find(tok) ?: return null
        val total = m.groupValues[1]
            .replace("½",".5")
            .replace(",",".")
            .toDouble()
        val tipo = m.groupValues[2].uppercase() // O / U
        val linea = if (m.groupValues[3].startsWith("+") || m.groupValues[3].startsWith("-"))
            m.groupValues[3] else "-${m.groupValues[3]}"
        return Triple(total, tipo, linea)
    }

    private data class TercioPack(
        val mlVisit: String?, val mlCasa: String?,
        val total: Double?, val tipo: String?, val linea: String?
    )

    private fun buildTercioMap(arr: org.json.JSONArray): Map<String, TercioPack> {
        val map = mutableMapOf<String, TercioPack>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optString("tipo") != "tercio") continue
            val eq = o.optJSONObject("equipos") ?: continue
            val visit = eq.optString("visit")
            val casa  = eq.optString("casa")
            val hora  = o.optString("hora")
            val ml    = o.optJSONObject("ml")
            val mlV   = ml?.optString("visit")?.trim()?.ifBlank { null }
            val mlC   = ml?.optString("casa") ?.trim()?.ifBlank { null }
            val rlTot = o.optJSONArray("rl_total")
            val ouTok = rlTot?.optString(0)
            val ou    = ouTok?.let { parseOuToken(it) }
            map[tercioKey(visit, casa, hora)] = TercioPack(
                mlVisit = mlV,
                mlCasa  = mlC,
                total   = ou?.first,
                tipo    = ou?.second,
                linea   = ou?.third
            )
        }
        return map
    }

}
