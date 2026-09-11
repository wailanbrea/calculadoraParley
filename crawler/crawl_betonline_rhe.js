/* global process */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFile = process.argv[2] || path.join(__dirname, '..', 'server_hce_betonline.json');

async function scrapeBetonlineRHE() {
    console.log('[BetOnline Crawler] Iniciando...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 }
        });

        const page = await context.newPage();
        console.log('[BetOnline Crawler] Navegando a BetOnline...');
        await page.goto('https://www.betonline.ag/sportsbook/baseball/r+h+e');
        
        console.log('[BetOnline Crawler] Esperando 5 segundos para carga de cuotas...');
        await page.waitForTimeout(5000);

        const games = await page.evaluate(() => {
            const league = document.querySelector('.league-container');
            if (!league) return [];

            const lines = league.innerText.split('\n').map(s => s.trim()).filter(Boolean);
            const parsed = [];

            let i = 0;
            while (i < lines.length) {
                const timeMatch = lines[i].match(/^(Today|Tomorrow|\w+day|\w+ \d{1,2}),?\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
                if (timeMatch) {
                    const timeStr = lines[i];
                    i++;

                    let awayRot = '';
                    let awayTeam = '';
                    let awayPitcher = '';
                    let homeRot = '';
                    let homeTeam = '';
                    let homePitcher = '';
                    let overLine = '';
                    let overOdds = '';
                    let underLine = '';
                    let underOdds = '';

                    if (i < lines.length && /^\d{3,5}\s*-?$/.test(lines[i])) {
                        awayRot = lines[i].replace(/[^\d]/g, '');
                        i++;
                    }
                    if (i < lines.length) {
                        awayTeam = lines[i];
                        i++;
                    }
                    if (i < lines.length && /[-–][RL]\b/i.test(lines[i])) {
                        awayPitcher = lines[i];
                        i++;
                    }

                    if (i < lines.length && /^\d{3,5}\s*-?$/.test(lines[i])) {
                        homeRot = lines[i].replace(/[^\d]/g, '');
                        i++;
                    }
                    if (i < lines.length) {
                        homeTeam = lines[i];
                        i++;
                    }
                    if (i < lines.length && /[-–][RL]\b/i.test(lines[i])) {
                        homePitcher = lines[i];
                        i++;
                    }

                    if (i < lines.length && lines[i].toLowerCase() === 'total') {
                        i++;
                    }

                    if (i < lines.length && /^O\s+[\d.]+/i.test(lines[i])) {
                        const m = lines[i].match(/^O\s+([\d.]+)/i);
                        overLine = m ? m[1] : '';
                        i++;
                    }
                    if (i < lines.length && /^[+-]\d{2,4}$/.test(lines[i])) {
                        overOdds = lines[i];
                        i++;
                    }

                    if (i < lines.length && /^U\s+[\d.]+/i.test(lines[i])) {
                        const m = lines[i].match(/^U\s+([\d.]+)/i);
                        underLine = m ? m[1] : '';
                        i++;
                    }
                    if (i < lines.length && /^[+-]\d{2,4}$/.test(lines[i])) {
                        underOdds = lines[i];
                        i++;
                    }

                    if (awayTeam && homeTeam) {
                        parsed.push({
                            time: timeStr,
                            awayRot,
                            awayTeam,
                            awayPitcher,
                            homeRot,
                            homeTeam,
                            homePitcher,
                            line: overLine || underLine || '',
                            overOdds,
                            underOdds,
                            rawMatchup: awayTeam + ' vs ' + homeTeam
                        });
                    }
                } else {
                    i++;
                }
            }

            return parsed;
        });

        console.log('[BetOnline Crawler] Exito: ' + games.length + ' juegos extraidos.');
        const payload = {
            source: 'BetOnline',
            url: 'https://www.betonline.ag/sportsbook/baseball/r+h+e',
            captured_at: new Date().toISOString(),
            count: games.length,
            games: games
        };

        fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2), 'utf-8');
        console.log('[BetOnline Crawler] Guardado en: ' + outputFile);
        return payload;
    } finally {
        await browser.close();
    }
}

scrapeBetonlineRHE().catch(err => {
    console.error('[BetOnline Crawler] Error:', err);
    process.exit(1);
});
