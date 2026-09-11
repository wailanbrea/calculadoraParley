// Extractor de BetOnline R+H+E para la Extensión BSolutions Sync
(function () {
  "use strict";

  const MLB_TEAMS = [
    'diamondbacks', 'braves', 'orioles', 'red sox', 'cubs', 'white sox', 'reds', 'guardians',
    'rockies', 'tigers', 'astros', 'royals', 'angels', 'dodgers', 'marlins', 'brewers',
    'twins', 'mets', 'yankees', 'athletics', 'phillies', 'pirates', 'padres', 'giants',
    'mariners', 'cardinals', 'rays', 'rangers', 'blue jays', 'nationals'
  ];

  function extractBetonlineGames() {
    const links = Array.from(document.querySelectorAll('a')).map(a => a.innerText.trim()).filter(t => t.includes('Total') && t.includes('O '));
    const games = [];

    for (const text of links) {
      const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
      const totalIdx = lines.findIndex(l => l.toLowerCase() === 'total');
      if (totalIdx === -1) continue;

      const beforeTotal = lines.slice(0, totalIdx);
      const candidateTeams = beforeTotal.filter(l => 
        !l.includes('Starts in') && 
        !l.includes('Today,') && 
        !/^\d+\s*-?$/.test(l) && 
        !/^[A-Z]\.\s*[A-Za-z]+.*-[RL]$/i.test(l)
      );

      let away = candidateTeams[0] || '';
      let home = candidateTeams[1] || '';

      const afterTotal = lines.slice(totalIdx + 1);
      let line = '';
      let over = '';
      let under = '';

      for (let i = 0; i < afterTotal.length; i++) {
        const item = afterTotal[i];
        if (/^O\s*(\d+(\.\d+)?)/i.test(item)) {
          line = item.replace(/^O\s*/i, '').trim();
          if (i + 1 < afterTotal.length) over = afterTotal[i + 1];
        } else if (/^U\s*(\d+(\.\d+)?)/i.test(item)) {
          if (!line) line = item.replace(/^U\s*/i, '').trim();
          if (i + 1 < afterTotal.length) under = afterTotal[i + 1];
        }
      }

      // Filtrar solo partidos de MLB
      const isMlb = (t) => MLB_TEAMS.some(w => t.toLowerCase().includes(w));
      if (away && home && line && (isMlb(away) || isMlb(home))) {
        games.push({ away, home, total: parseFloat(line), line, over_odds: parseInt(over, 10), under_odds: parseInt(under, 10), over, under, raw: text });
      }
    }

    return games;
  }

  // Responder a mensajes de background.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_BETONLINE') {
      const games = extractBetonlineGames();
      sendResponse({ games, count: games.length });
    }
    return true;
  });

  // Notificar al background si esta pestaña se abrió con el parámetro ?bsolutions_auto=true
  if (window.location.search.includes('bsolutions_auto=true')) {
    setTimeout(() => {
      const games = extractBetonlineGames();
      chrome.runtime.sendMessage({
        action: 'AUTO_SCRAPED_BETONLINE',
        games,
        count: games.length
      });
    }, 2000);
  }
})();
