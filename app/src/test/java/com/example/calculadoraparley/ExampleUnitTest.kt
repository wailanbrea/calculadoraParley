package com.example.calculadoraparley

import org.junit.Test

import org.junit.Assert.*
import com.example.calculadoraparley.ui.notifications.TercioData

/**
 * Example local unit test, which will execute on the development machine (host).
 *
 * See [testing documentation](http://d.android.com/tools/testing).
 */
class ExampleUnitTest {
    @Test
    fun addition_isCorrect() {
        assertEquals(4, 2 + 2)
    }

    @Test
    fun testCalcularMlDesdeH_Under150() {
        val res1 = TercioData.calcularMlDesdeH("-125", "+105")
        assertNotNull(res1)
        assertEquals("-115", res1?.visit)
        assertEquals("-115", res1?.casa)
        assertEquals("Visitante", res1?.favSide)
    }

    @Test
    fun testCalcularMlDesdeH_Over150() {
        val res = TercioData.calcularMlDesdeH("-190", "+165")
        assertNotNull(res)
        assertEquals("-165", res?.visit)
        assertEquals("+135", res?.casa)
        assertEquals("Visitante", res?.favSide)
    }
}