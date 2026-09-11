(async () => {
  const TEAM_DATA = {
    arizona: ["ARI", 4030],
    diamondbacks: ["ARI", 4030],
    dbacks: ["ARI", 4030],
    atlanta: ["ATL", 4025],
    braves: ["ATL", 4025],
    baltimore: ["BAL", 4005],
    orioles: ["BAL", 4005],
    boston: ["BOS", 4002],
    redsox: ["BOS", 4002],
    cubs: ["CHC", 4023],
    whitesox: ["CWS", 4001],
    cincinnati: ["CIN", 4024],
    reds: ["CIN", 4024],
    cleveland: ["CLE", 4009],
    guardians: ["CLE", 4009],
    colorado: ["COL", 4027],
    rockies: ["COL", 4027],
    detroit: ["DET", 4012],
    tigers: ["DET", 4012],
    houston: ["HOU", 4020],
    astros: ["HOU", 4020],
    kansas: ["KC", 4006],
    royals: ["KC", 4006],
    angels: ["LAA", 4011],
    dodgers: ["LAD", 4021],
    miami: ["MIA", 4028],
    marlins: ["MIA", 4028],
    brewers: ["MIL", 4010],
    twins: ["MIN", 4007],
    minnesota: ["MIN", 4007],
    mets: ["NYM", 4018],
    yankees: ["NYY", 4013],
    oakland: ["ATH", 4014],
    athletics: ["ATH", 4014],
    philadelphia: ["PHI", 4015],
    phillies: ["PHI", 4015],
    pittsburgh: ["PIT", 4017],
    pirates: ["PIT", 4017],
    sandiego: ["SD", 4026],
    padres: ["SD", 4026],
    sanfrancisco: ["SF", 4022],
    giants: ["SF", 4022],
    seattle: ["SEA", 4008],
    mariners: ["SEA", 4008],
    stlouis: ["STL", 4016],
    cardinals: ["STL", 4016],
    tampa: ["TB", 4029],
    rays: ["TB", 4029],
    texas: ["TEX", 4004],
    rangers: ["TEX", 4004],
    toronto: ["TOR", 4003],
    bluejays: ["TOR", 4003],
    washington: ["WSH", 4019],
    nationals: ["WSH", 4019],
  };

  const norm = (value) => (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const key = (value) =>
    norm(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  const esc = (value) =>
    norm(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const addAlias = (aliases, value) => {
    const normalized = norm(value);
    if (!normalized) return;
    const compact = normalized.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^[A-Z]{2,4}$/.test(compact)) aliases.add(compact);
  };
  const teamAliases = (value) => {
    const aliases = new Set();
    const k = key(value);
    for (const team in TEAM_DATA) {
      if (k.includes(team)) {
        aliases.add(TEAM_DATA[team][0]);
        if (team === "athletics" || team === "oakland") {
          aliases.add("ATH");
          aliases.add("OAK");
        }
      }
    }
    addAlias(aliases, value);
    return Array.from(aliases);
  };
  const abbr = (value) => {
    const aliases = teamAliases(value);
    return aliases[0] || norm(value);
  };
  const blankPitcher = () => ({ nombre: "", equipo: "", team: "", line: "", mas: "", menos: "" });
  const toHalf = (value) => String(value || "").replace(".5", "&frac12;");
  const parsePrice = (value) => {
    const parsed = parseInt(String(value || "").replace(/[^\-\d]/g, ""), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const bestPrice = (over, under) => {
    const o = parsePrice(over);
    const u = parsePrice(under);
    if (o === null) return { side: "U", value: under || "" };
    if (u === null) return { side: "O", value: over || "" };
    if (o < 0 && u < 0) return o < u ? { side: "O", value: over } : { side: "U", value: under };
    if (o < 0) return { side: "O", value: over };
    if (u < 0) return { side: "U", value: under };
    return o < u ? { side: "O", value: over } : { side: "U", value: under };
  };

  function openDigitalSportsDirect() {
    const frames = Array.from(document.querySelectorAll("iframe")).map((frame) => frame.src).filter(Boolean);
    let direct = frames.find((src) => /digitalsportstech\.com/i.test(src));
    if (direct) {
      window.open(direct, "_blank", "noopener");
      return true;
    }

    const boss = frames.find((src) => /BOSSWagering|propsEmbeded|deportes\.juancitosport\.com\.do/i.test(src));
    if (!boss) return false;

    const url = new URL(boss);
    const token = url.searchParams.get("stoken") || url.searchParams.get("token");
    const user = url.searchParams.get("user") || "JS37662";
    const language = url.searchParams.get("lng") || url.searchParams.get("language") || "es-ES";
    const currency = url.searchParams.get("currency") || "DOM";
    if (!token) return false;

    direct = `https://bv2-us.digitalsportstech.com/betbuilder?sb=juancito&user=${encodeURIComponent(
      user,
    )}&token=${encodeURIComponent(token)}&currency=${encodeURIComponent(currency)}&language=${encodeURIComponent(language)}`;
    window.open(direct, "_blank", "noopener");
    return true;
  }

  if (!/digitalsportstech\.com/i.test(location.hostname)) {
    if (openDigitalSportsDirect()) {
      alert("Abri DigitalSportsTech directo. En esa nueva pestana abre MLB -> Mas/Menos -> Ponches y pulsa este marcador otra vez.");
      return;
    }
    alert("No encontre el iframe/token de DigitalSportsTech. Abre Juancito Prop Builder y espera que cargue completo.");
    return;
  }

  if (window.__JUANCITO_PONCHES_RUNNING__) {
    alert("Ya hay una extraccion corriendo. Espera a que termine.");
    return;
  }
  window.__JUANCITO_PONCHES_RUNNING__ = true;

  try {
    const MAX_GAMES = 80;
    const MAX_SCROLL_PASSES = 70;
    const MAX_TOTAL_MS = 90000;
    const OPEN_RETRIES = 18;
    const OPEN_WAIT_MS = 200;
    const startedAt = Date.now();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const assertTime = () => {
      if (Date.now() - startedAt > MAX_TOTAL_MS) {
        throw new Error("Tiempo maximo agotado. La pagina tardo demasiado cargando las lineas.");
      }
    };
    const click = (el) => {
      if (!el) return;
      ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      });
    };
    const todayISO = () => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 10);
    };
    const dateFromText = (text) => {
      const m = norm(text).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
      if (!m) return todayISO();
      const months = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
      };
      return `${m[3]}-${months[m[2]] || "01"}-${String(m[1]).padStart(2, "0")}`;
    };

    async function fetchMLB(dateStr) {
      try {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${encodeURIComponent(dateStr)}&hydrate=probablePitcher,team`,
        );
        if (!res.ok) return new Map();
        const data = await res.json();
        const map = new Map();
        for (const d of data.dates || []) {
          for (const game of d.games || []) {
            const away = game.teams?.away;
            const home = game.teams?.home;
            if (!away?.team || !home?.team) continue;
            const awayAbbr = abbr(away.team.abbreviation || away.team.name);
            const homeAbbr = abbr(home.team.abbreviation || home.team.name);
            const pitchers = [
              {
                nombre: away.probablePitcher?.fullName || "TBD",
                equipo: away.team.name || "",
                team: awayAbbr,
                line: "",
                mas: "",
                menos: "",
              },
              {
                nombre: home.probablePitcher?.fullName || "TBD",
                equipo: home.team.name || "",
                team: homeAbbr,
                line: "",
                mas: "",
                menos: "",
              },
            ];
            for (const mlbKey of matchupKeysFromTeams(away.team, home.team)) {
              map.set(mlbKey, pitchers);
            }
          }
        }
        return map;
      } catch (error) {
        console.warn("MLB fallback no disponible", error);
        return new Map();
      }
    }

    const findPonchesGroup = () => {
      const groups = Array.from(document.querySelectorAll("app-main-stats-grouped"));
      const exact = groups.find((group) => key(group.querySelector(".main-stat__title")?.textContent).includes("ponches"));
      if (exact) return exact;
      const block = document.querySelector(".tiered-block__item");
      return block ? block.closest("app-main-stats-grouped, app-main-stats, app-stats, main, section") || document.body : null;
    };

    function isScrollable(node) {
      if (!node || node === document.body || node === document.documentElement) return false;
      const style = getComputedStyle(node);
      return node.scrollHeight > node.clientHeight + 30 && /(auto|scroll|overlay)/i.test(style.overflowY);
    }

    function findScrollers(root) {
      const out = [];
      const add = (node) => {
        if (node && !out.includes(node)) out.push(node);
      };
      for (const node of root.querySelectorAll("*")) {
        if (isScrollable(node) && node.querySelector(".tiered-block__item")) add(node);
      }
      let node = root;
      while (node && node !== document.body && node !== document.documentElement) {
        if (isScrollable(node)) add(node);
        node = node.parentElement;
      }
      add(document.scrollingElement || document.documentElement);
      return out;
    }

    const getMaxTop = (scroller) => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const setTop = (scroller, top) => {
      scroller.scrollTop = Math.max(0, Math.min(top, getMaxTop(scroller)));
      window.dispatchEvent(new Event("scroll"));
    };

    async function openBlock(block) {
      if (block.querySelector(".main-stat-block__item, [class*='stat-block__item']")) return true;
      const top = block.querySelector(".tiered-block__item__top") || block;
      top.scrollIntoView({ block: "center", inline: "nearest" });
      await sleep(80);
      click(top);
      for (let i = 0; i < OPEN_RETRIES; i++) {
        assertTime();
        if (block.querySelector(".main-stat-block__item, [class*='stat-block__item']")) return true;
        await sleep(OPEN_WAIT_MS);
      }
      return false;
    }

    function pitcherFrom(item, defaultTeam) {
      const nombre = norm(item.querySelector(".main-stat-block__player-name, [class*='player-name']")?.textContent);
      const equipo = norm(item.querySelector(".main-stat-block__player-team, [class*='player-team']")?.textContent) || defaultTeam || "";
      const selectors = Array.from(item.querySelectorAll(".main-stat-block__selector, [class*='selector']")).map((selector) => ({
        label: norm(selector.querySelector(".main-stat-block__selector-text, [class*='selector-text']")?.textContent || selector.textContent),
        value: norm(selector.querySelector(".main-stat-block__selector-value, [class*='selector-value']")?.textContent || selector.textContent),
      }));
      const mas = selectors.find((option) => key(option.label).startsWith("mas") || key(option.label).startsWith("over")) || selectors[0];
      const menos = selectors.find((option) => key(option.label).startsWith("menos") || key(option.label).startsWith("under")) || selectors[1];
      const line = (mas?.label.match(/\(([\d.]+)\)/) || [])[1] || "";
      if (!nombre) return null;
      return {
        nombre,
        equipo,
        team: abbr(equipo),
        line,
        mas: mas?.value || "",
        menos: menos?.value || "",
      };
    }

    function matchupSides(matchup) {
      if (matchup.includes("@")) return matchup.split("@").map(norm);
      if (/\bvs\b/i.test(matchup)) return matchup.split(/\bvs\b/i).map(norm);
      return [];
    }

    function matchupKeysFromSides(awaySide, homeSide) {
      const awayAliases = [...teamAliases(awaySide), key(awaySide)].filter(Boolean);
      const homeAliases = [...teamAliases(homeSide), key(homeSide)].filter(Boolean);
      const keys = new Set();
      for (const awayAlias of awayAliases) {
        for (const homeAlias of homeAliases) {
          keys.add(`${awayAlias}@${homeAlias}`);
        }
      }
      return Array.from(keys);
    }

    function matchupKeysFromTeams(awayTeam, homeTeam) {
      const awayValues = [
        awayTeam?.abbreviation,
        awayTeam?.fileCode,
        awayTeam?.teamCode,
        awayTeam?.name,
        awayTeam?.teamName,
        awayTeam?.shortName,
      ].filter(Boolean);
      const homeValues = [
        homeTeam?.abbreviation,
        homeTeam?.fileCode,
        homeTeam?.teamCode,
        homeTeam?.name,
        homeTeam?.teamName,
        homeTeam?.shortName,
      ].filter(Boolean);
      const keys = new Set();
      for (const awayValue of awayValues) {
        for (const homeValue of homeValues) {
          matchupKeysFromSides(awayValue, homeValue).forEach((value) => keys.add(value));
        }
      }
      return Array.from(keys);
    }

    function matchupKeys(matchup) {
      const sides = matchupSides(matchup);
      if (sides.length !== 2) return [norm(matchup)];
      return matchupKeysFromSides(sides[0], sides[1]);
    }

    function displayMatchupKey(matchup) {
      const sides = matchupSides(matchup);
      if (sides.length !== 2) return norm(matchup);
      return `${abbr(sides[0])}@${abbr(sides[1])}`;
    }

    function sameTeam(left, right) {
      const leftAliases = teamAliases(left?.team || left?.equipo);
      const rightAliases = teamAliases(right?.team || right?.equipo);
      return leftAliases.some((alias) => rightAliases.includes(alias));
    }

    function samePitcher(left, right) {
      const leftName = key(left?.nombre);
      const rightName = key(right?.nombre);
      if (leftName && rightName && leftName === rightName) return true;
      return sameTeam(left, right);
    }

    function mergePitchers(juancitoPitchers, probablePitchers) {
      const pending = [...juancitoPitchers];
      const merged = [];
      if (probablePitchers?.length) {
        for (const probable of probablePitchers.slice(0, 2)) {
          const foundIndex = pending.findIndex((pitcher) => samePitcher(pitcher, probable));
          merged.push(foundIndex >= 0 ? pending.splice(foundIndex, 1)[0] : probable);
        }
      }
      for (const pitcher of pending) {
        if (merged.length >= 2) break;
        if (!merged.some((item) => key(item.nombre) === key(pitcher.nombre) && sameTeam(item, pitcher))) {
          merged.push(pitcher);
        }
      }
      while (merged.length < 2) merged.push(blankPitcher());
      return merged.slice(0, 2);
    }

    async function gameFromBlock(block) {
      const matchup = norm(block.querySelector(".tiered-block__player-team, [class*='player-team']")?.textContent);
      const hora = norm(block.querySelector(".tiered-block__player-date, [class*='player-date']")?.textContent);
      if (!matchup) return null;
      await openBlock(block);
      await sleep(90);
      const sides = matchupSides(matchup);
      const pitchers = Array.from(block.querySelectorAll(".main-stat-block__item, [class*='stat-block__item']"))
        .map((item, index) => pitcherFrom(item, sides[index] || matchup))
        .filter(Boolean);
      return { matchup, hora, pitchers };
    }

    async function scanAllGames() {
      const root = findPonchesGroup();
      if (!root) {
        throw new Error("No encontre Mas/Menos (Ponches). Abre MLB -> Mas/Menos -> Ponches y ejecuta de nuevo.");
      }

      const games = new Map();
      let nextOrder = 0;
      for (const scroller of findScrollers(root)) {
        setTop(scroller, 0);
        await sleep(350);
        let stagnant = 0;
        let lastTop = -1;

        for (let pass = 0; pass < MAX_SCROLL_PASSES && games.size < MAX_GAMES; pass++) {
          assertTime();
          const currentRoot = findPonchesGroup() || root;
          const blocks = Array.from(currentRoot.querySelectorAll(".tiered-block__item"));
          let added = 0;

          for (const block of blocks) {
            const game = await gameFromBlock(block);
            if (!game) continue;
            const id = `${game.matchup}|${game.hora}`;
            const old = games.get(id);
            if (!old || old.pitchers.length < game.pitchers.length) {
              game.order = old?.order ?? nextOrder++;
              games.set(id, game);
              added++;
            }
          }

          const top = scroller.scrollTop;
          const maxTop = getMaxTop(scroller);
          if (added === 0 && Math.abs(top - lastTop) < 4) stagnant++;
          else stagnant = 0;
          if (top >= maxTop - 5 && added === 0) break;
          if (stagnant >= 4) break;

          const nextTop = Math.min(maxTop, top + Math.max(260, Math.floor(scroller.clientHeight * 0.78)));
          if (nextTop <= top + 2) break;
          lastTop = top;
          setTop(scroller, nextTop);
          await sleep(520);
        }
      }
      return Array.from(games.values()).sort((left, right) => left.order - right.order);
    }

    const juancitoGames = await scanAllGames();
    if (!juancitoGames.length) throw new Error("No encontre lineas de Ponches cargadas en la pantalla actual.");

    const dateStr = dateFromText(juancitoGames.find((game) => game.hora)?.hora || "");
    const mlbMap = await fetchMLB(dateStr);
    const finales = juancitoGames.map((game) => {
      const probablePitchers = matchupKeys(game.matchup).map((candidate) => mlbMap.get(candidate)).find(Boolean);
      return {
        matchup: displayMatchupKey(game.matchup),
        hora: game.hora,
        pitchers: mergePitchers(game.pitchers, probablePitchers),
      };
    });
    window.__JUANCITO_PONCHES_LAST_RESULT__ = finales;

    let rows = "";
    let num = 1;
    for (const game of finales) {
      const time = (game.hora.match(/,\s*([\d:]+)/) || game.hora.match(/([\d:]+(:\d{2})?\s*(am|pm)?)/i) || [])[1] || "";
      game.pitchers.forEach((pitcher, idx, arr) => {
        const best = bestPrice(pitcher.mas, pitcher.menos);
        const propTxt = pitcher.line ? `${toHalf(pitcher.line)} ${best.side} ${best.value}` : "";
        rows += `<tr class="${idx === arr.length - 1 ? "game-end" : ""}"><td class="c no">${
          idx === 0 ? String(num).padStart(2, "0") : ""
        }</td><td class="c hora">${idx === 0 ? esc(time) : ""}</td><td class="eq">${
          pitcher.nombre ? `${esc(pitcher.nombre)}(${esc(pitcher.team)})` : ""
        }</td><td class="manual"></td><td class="manual"></td><td class="props">${propTxt}</td></tr>`;
      });
      num++;
    }

    const totalPitcherRows = finales.reduce((acc, game) => acc + game.pitchers.length, 0);
    const rowH = totalPitcherRows <= 28 ? "0.32in" : totalPitcherRows <= 32 ? "0.25in" : "0.22in";
    const baseFont = totalPitcherRows <= 28 ? "9.2pt" : totalPitcherRows <= 32 ? "8.4pt" : "7.9pt";
    const propsFont = totalPitcherRows <= 28 ? "12pt" : totalPitcherRows <= 32 ? "11.2pt" : "10.5pt";
    const fechaObj = new Date();
    const fechaTxt = fechaObj.toLocaleDateString("es-DO", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
    const stamp = fechaObj.toLocaleString("es-DO");

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Ponches MLB</title><style>@page WordSection1{size:8.5in 11in;margin:0.05in 0.06in 0.05in 0.06in}div.WordSection1{page:WordSection1}body{font-family:Arial,Calibri,sans-serif;font-size:${baseFont};color:#111;margin:0;line-height:1}.top{width:8.38in;border-collapse:collapse;margin:0 auto 0.01in auto}.top td{font-size:6.8pt;line-height:1}.title{text-align:center;font-weight:700;font-size:9.2pt;line-height:1}.sub{text-align:center;font-weight:700;font-size:7.2pt;line-height:1}.normal{text-align:center;font-weight:700;font-size:7.2pt;margin:0 0 0.01in;line-height:1}.sheet{width:8.38in;margin:0 auto;border-collapse:collapse;table-layout:fixed}.sheet th,.sheet td{border:1px solid #222;padding:0 3px;vertical-align:middle;line-height:1}.sheet td{border-top:0;border-bottom:0;height:${rowH};mso-height-rule:exactly}.sheet tr.game-end td{border-bottom:1px solid #222}.sheet th{font-weight:700;text-align:center;background:#f2f2f2;font-size:7.4pt;height:0.13in;line-height:1}.section th{background:#fff;text-align:left;font-size:7.4pt;height:0.11in;line-height:1}.c{text-align:center}.no{width:4%}.hora{width:7%}.eq{width:30%;font-weight:700;font-size:${baseFont};line-height:1;white-space:nowrap;mso-fit-text:yes}.maxxi{width:18%}.miguel{width:16%}.manual{height:${rowH}}.props{width:25%;color:#b01818;font-weight:700;line-height:1;font-size:${propsFont};white-space:nowrap;text-align:center}.small{font-size:7pt}</style></head><body><div class="WordSection1"><table class="top"><tr><td>${esc(stamp)}</td><td class="title">Juancito Sport<br><span class="sub">Lineas del dia ${esc(fechaTxt)}</span></td><td style="text-align:right">Pag 1</td></tr></table><div class="normal">Normal</div><table class="sheet"><tr><th class="no">No.</th><th class="hora">Hora</th><th class="eq">Equipo</th><th class="maxxi">Maxxi</th><th class="miguel">Miguel</th><th class="props">Props</th></tr><tr class="section"><th colspan="6">Strike Out</th></tr>${rows}</table></div></body></html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Ponches_MLB_Formato.doc";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    alert(`OK: archivo creado con ${finales.length} juegos / ${totalPitcherRows} lanzadores.`);
  } catch (err) {
    console.error(err);
    alert(err.message || "Error extrayendo Ponches.");
  } finally {
    window.__JUANCITO_PONCHES_RUNNING__ = false;
  }
})();
