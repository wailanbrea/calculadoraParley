(async () => {
  const host = location.hostname;
  const TEAM = {
    Arizona: "ARI",
    ArizonaDiamondbacks: "ARI",
    Diamondbacks: "ARI",
    Dbacks: "ARI",
    Atlanta: "ATL",
    AtlantaBraves: "ATL",
    Braves: "ATL",
    Baltimore: "BAL",
    BaltimoreOrioles: "BAL",
    Orioles: "BAL",
    Boston: "BOS",
    BostonRedSox: "BOS",
    RedSox: "BOS",
    ChicagoCubs: "CHC",
    Cubs: "CHC",
    ChicagoWhiteSox: "CWS",
    WhiteSox: "CWS",
    Cincinnati: "CIN",
    CincinnatiReds: "CIN",
    Reds: "CIN",
    Cleveland: "CLE",
    ClevelandGuardians: "CLE",
    Guardians: "CLE",
    Colorado: "COL",
    ColoradoRockies: "COL",
    Rockies: "COL",
    Detroit: "DET",
    DetroitTigers: "DET",
    Tigers: "DET",
    Houston: "HOU",
    HoustonAstros: "HOU",
    Astros: "HOU",
    KansasCity: "KC",
    KansasCityRoyals: "KC",
    Royals: "KC",
    LosAngelesAngels: "LAA",
    Angels: "LAA",
    LAAngels: "LAA",
    LosAngelesDodgers: "LAD",
    LADodgers: "LAD",
    Dodgers: "LAD",
    Miami: "MIA",
    MiamiMarlins: "MIA",
    Marlins: "MIA",
    Milwaukee: "MIL",
    MilwaukeeBrewers: "MIL",
    Brewers: "MIL",
    Minnesota: "MIN",
    MinnesotaTwins: "MIN",
    Twins: "MIN",
    NewYorkMets: "NYM",
    Mets: "NYM",
    NewYorkYankees: "NYY",
    Yankees: "NYY",
    Athletics: "ATH",
    Oakland: "OAK",
    OaklandAthletics: "OAK",
    Philadelphia: "PHI",
    PhiladelphiaPhillies: "PHI",
    Phillies: "PHI",
    Pittsburgh: "PIT",
    PittsburghPirates: "PIT",
    Pirates: "PIT",
    SanDiego: "SD",
    SanDiegoPadres: "SD",
    Padres: "SD",
    SanFrancisco: "SF",
    SanFranciscoGiants: "SF",
    Giants: "SF",
    Seattle: "SEA",
    SeattleMariners: "SEA",
    Mariners: "SEA",
    StLouis: "STL",
    StLouisCardinals: "STL",
    Cardinals: "STL",
    TampaBay: "TB",
    TampaBayRays: "TB",
    Rays: "TB",
    Texas: "TEX",
    TexasRangers: "TEX",
    Rangers: "TEX",
    Toronto: "TOR",
    TorontoBlueJays: "TOR",
    BlueJays: "TOR",
    Washington: "WSH",
    WashingtonNationals: "WSH",
    Nationals: "WSH",
  };

  const norm = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const key = (s) =>
    norm(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  const esc = (s) =>
    norm(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const abbr = (team) => {
    const clean = norm(team).replace(/^The\s+/i, "");
    const compactName = clean.replace(/[^A-Za-z]/g, "");
    if (TEAM[compactName]) return TEAM[compactName];
    const compact = key(clean);
    for (const name in TEAM) {
      if (key(name) === compact) return TEAM[name];
    }
    return clean;
  };
  const toHalf = (v) => String(v || "").replace(".5", "&frac12;");

  const openDirect = () => {
    const frames = [...document.querySelectorAll("iframe")].map((frame) => frame.src).filter(Boolean);
    let src = frames.find((frameSrc) => /digitalsportstech\.com/i.test(frameSrc));
    if (src) {
      window.open(src, "_blank", "noopener");
      return true;
    }
    const boss = frames.find((frameSrc) =>
      /BOSSWagering|propsEmbeded|deportes\.juancitosport\.com\.do/i.test(frameSrc),
    );
    if (!boss) return false;
    const url = new URL(boss);
    const token = url.searchParams.get("stoken") || url.searchParams.get("token");
    const lng = url.searchParams.get("lng") || "es-ES";
    if (!token) return false;
    src = `https://bv2-us.digitalsportstech.com/betbuilder?sb=juancito&user=JS37662&token=${encodeURIComponent(
      token,
    )}&currency=DOM&language=${encodeURIComponent(lng)}`;
    window.open(src, "_blank", "noopener");
    return true;
  };

  if (!/digitalsportstech\.com/i.test(host)) {
    if (openDirect()) {
      alert(
        "Se abrio DigitalSportsTech directo. En esa pestana entra a MLB -> Mas/Menos -> Ponches y pulsa otra vez el marcador para descargar el Word.",
      );
      return;
    }
    alert("No encontre el token del Prop Builder. Abre Juancito Prop Builder y espera que cargue el widget.");
    return;
  }

  if (window.__PONCHES_WORD_RUNNING__) {
    alert("Ya hay una extraccion corriendo. Espera a que termine.");
    return;
  }

  window.__PONCHES_WORD_RUNNING__ = true;

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
        throw new Error("Tiempo maximo agotado. Se capturo lo posible, pero la pagina tardo demasiado.");
      }
    };
    const click = (el) => {
      if (!el) return;
      ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) =>
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })),
      );
    };
    const dateFromText = (s) => {
      const m = norm(s).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
      if (!m) return new Date().toISOString().slice(0, 10);
      const mm = {
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
      return `${m[3]}-${mm[m[2]] || "01"}-${String(m[1]).padStart(2, "0")}`;
    };

    async function mlbProbables(date) {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${encodeURIComponent(
            date,
          )}&hydrate=probablePitcher,team`,
        );
        if (!response.ok) return new Map();
        const data = await response.json();
        const map = new Map();
        for (const d of data.dates || []) {
          for (const game of d.games || []) {
            const away = game.teams?.away;
            const home = game.teams?.home;
            if (!away?.team || !home?.team) continue;
            const awayAb = away.team.abbreviation || abbr(away.team.name);
            const homeAb = home.team.abbreviation || abbr(home.team.name);
            map.set(`${awayAb}@${homeAb}`, [
              {
                nombre: away.probablePitcher?.fullName || "",
                equipo: away.team.name || "",
                team: awayAb,
                line: "",
                mas: "",
                menos: "",
                src: "mlb",
              },
              {
                nombre: home.probablePitcher?.fullName || "",
                equipo: home.team.name || "",
                team: homeAb,
                line: "",
                mas: "",
                menos: "",
                src: "mlb",
              },
            ]);
          }
        }
        return map;
      } catch (error) {
        console.warn("MLB fallback no disponible", error);
        return new Map();
      }
    }

    function mergeTwo(matchup, pitchers, probables) {
      const parts = matchup.split("@").map(norm);
      const matchupKey = `${abbr(parts[0])}@${abbr(parts[1])}`;
      const mlb = (probables.get(matchupKey) || []).filter((pitcher) => pitcher.nombre);
      const out = [];
      for (const mlbPitcher of mlb) {
        const found = pitchers.find(
          (pitcher) => key(pitcher.nombre) === key(mlbPitcher.nombre) || pitcher.team === mlbPitcher.team,
        );
        out.push(found || mlbPitcher);
      }
      for (const pitcher of pitchers) {
        if (!out.some((item) => key(item.nombre) === key(pitcher.nombre))) out.push(pitcher);
      }
      while (out.length < 2) {
        out.push({ nombre: "", equipo: "", team: "", line: "", mas: "", menos: "" });
      }
      return out.slice(0, 2);
    }

    const findPonchesGroup = () =>
      [...document.querySelectorAll("app-main-stats-grouped")].find((group) =>
        key(group.querySelector(".main-stat__title")?.textContent).includes("ponches"),
      );

    function isScrollable(node) {
      if (!node || node === document.body || node === document.documentElement) return false;
      const style = getComputedStyle(node);
      const canScroll = node.scrollHeight > node.clientHeight + 30;
      return canScroll && /(auto|scroll|overlay)/i.test(style.overflowY);
    }

    function findScrollers(el) {
      const out = [];
      const add = (node) => {
        if (node && !out.includes(node)) out.push(node);
      };

      for (const node of el.querySelectorAll("*")) {
        if (isScrollable(node) && node.querySelector(".tiered-block__item")) add(node);
      }

      let node = el;
      while (node && node !== document.body && node !== document.documentElement) {
        if (isScrollable(node)) add(node);
        node = node.parentElement;
      }

      add(document.scrollingElement || document.documentElement);
      return out;
    }

    const getTop = (scroller) => scroller.scrollTop;
    const getMaxTop = (scroller) => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const setTop = (scroller, top) => {
      scroller.scrollTop = Math.max(0, Math.min(top, getMaxTop(scroller)));
      window.dispatchEvent(new Event("scroll"));
    };

    async function openBlock(block) {
      if (block.querySelector(".main-stat-block__item")) return true;
      const top = block.querySelector(".tiered-block__item__top") || block;
      top.scrollIntoView({ block: "center", inline: "nearest" });
      await sleep(80);
      click(top);
      for (let i = 0; i < OPEN_RETRIES; i++) {
        assertTime();
        if (block.querySelector(".main-stat-block__item")) return true;
        await sleep(OPEN_WAIT_MS);
      }
      return false;
    }

    function pitcherFrom(item) {
      const nombre = norm(item.querySelector(".main-stat-block__player-name")?.textContent);
      const equipo = norm(item.querySelector(".main-stat-block__player-team")?.textContent);
      const opts = [...item.querySelectorAll(".main-stat-block__selector")].map((selector) => ({
        label: norm(selector.querySelector(".main-stat-block__selector-text")?.textContent),
        value: norm(selector.querySelector(".main-stat-block__selector-value")?.textContent),
      }));
      const mas = opts.find((option) => key(option.label).startsWith("mas")) || opts[0];
      const menos = opts.find((option) => key(option.label).startsWith("menos")) || opts[1];
      const line = (mas?.label.match(/\(([\d.]+)\)/) || [])[1] || "";
      if (!nombre || !equipo) return null;
      return {
        nombre,
        equipo,
        team: abbr(equipo),
        line,
        mas: mas?.value || "",
        menos: menos?.value || "",
        src: "juancito",
      };
    }

    async function gameFromBlock(block) {
      const matchup = norm(block.querySelector(".tiered-block__player-team")?.textContent);
      const hora = norm(block.querySelector(".tiered-block__player-date")?.textContent);
      if (!matchup) return null;
      await openBlock(block);
      await sleep(90);
      const pitchers = [...block.querySelectorAll(".main-stat-block__item")].map(pitcherFrom).filter(Boolean);
      if (!pitchers.length) return null;
      return { matchup, hora, pitchers };
    }

    async function scanAllGames() {
      const initialGroup = findPonchesGroup();
      if (!initialGroup) {
        alert("No encuentro Mas/Menos (Ponches). Abre MLB -> Mas/Menos -> Ponches y vuelve a ejecutar.");
        return [];
      }

      const games = new Map();

      for (const scroller of findScrollers(initialGroup)) {
        setTop(scroller, 0);
        await sleep(350);
        let stagnantPasses = 0;
        let lastTop = -1;

        for (let pass = 0; pass < MAX_SCROLL_PASSES && games.size < MAX_GAMES; pass++) {
          assertTime();
          const group = findPonchesGroup();
          if (!group) break;
          const blocks = [...group.querySelectorAll(".tiered-block__item")];
          let addedThisPass = 0;

          for (const block of blocks) {
            assertTime();
            const game = await gameFromBlock(block);
            if (!game) continue;
            const id = `${game.matchup}|${game.hora}`;
            const previous = games.get(id);
            if (!previous || previous.pitchers.length < game.pitchers.length) {
              games.set(id, game);
              addedThisPass++;
            }
          }

          const top = getTop(scroller);
          const maxTop = getMaxTop(scroller);
          if (addedThisPass === 0 && Math.abs(top - lastTop) < 4) stagnantPasses++;
          else stagnantPasses = 0;

          if (top >= maxTop - 5 && addedThisPass === 0) break;
          if (stagnantPasses >= 4) break;

          const step = Math.max(260, Math.floor(scroller.clientHeight * 0.78));
          const nextTop = Math.min(maxTop, top + step);
          if (nextTop <= top + 2) break;
          lastTop = top;
          setTop(scroller, nextTop);
          await sleep(520);
        }
      }

      return [...games.values()];
    }

    const finales = await scanAllGames();
    if (!finales.length) {
      alert("Mercado encontrado, pero no hay lineas cargadas. Espera unos segundos y reintenta.");
      return;
    }

    const probables = await mlbProbables(dateFromText(finales[0].hora));
    for (const game of finales) {
      game.pitchers = mergeTwo(game.matchup, game.pitchers, probables);
    }

    let rows = "";
    let num = 1;
    for (const game of finales) {
      const time = (game.hora.match(/,\s*([\d:]+)/) || [])[1] || game.hora;
      game.pitchers.forEach((pitcher, idx, arr) => {
        const isLast = idx === arr.length - 1;
        const props = pitcher.line ? `${toHalf(pitcher.line)} O ${pitcher.mas}<br>${toHalf(pitcher.line)} U ${pitcher.menos}` : "";
        rows += `<tr class="${isLast ? "game-end" : ""}"><td class="c no">${
          idx === 0 ? String(num).padStart(2, "0") : ""
        }</td><td class="c hora">${idx === 0 ? esc(time) : ""}</td><td class="eq">${
          pitcher.nombre ? `${esc(pitcher.nombre)}(${esc(pitcher.team)})` : ""
        }</td><td class="manual"></td><td class="manual"></td><td class="props">${props}</td></tr>`;
      });
      num++;
    }

    const totalPitcherRows = finales.reduce((n, game) => n + game.pitchers.length, 0);
    const rowH = totalPitcherRows <= 28 ? "0.30in" : totalPitcherRows <= 32 ? "0.225in" : "0.205in";
    const baseFont = totalPitcherRows <= 28 ? "9pt" : totalPitcherRows <= 32 ? "8.2pt" : "7.7pt";
    const propsFont = totalPitcherRows <= 28 ? "9.8pt" : totalPitcherRows <= 32 ? "8.8pt" : "8.1pt";
    const fecha = new Date();
    const fechaTxt = fecha.toLocaleDateString("es-DO", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const stamp = fecha.toLocaleString("es-DO");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Ponches MLB</title><style>@page WordSection1{size:8.5in 11in;margin:0.05in 0.06in 0.05in 0.06in}div.WordSection1{page:WordSection1}body{font-family:Arial,Calibri,sans-serif;font-size:${baseFont};color:#111;margin:0;line-height:1}.top{width:8.38in;border-collapse:collapse;margin:0 auto 0.01in auto}.top td{font-size:6.8pt;line-height:1}.title{text-align:center;font-weight:700;font-size:9.2pt;line-height:1}.sub{text-align:center;font-weight:700;font-size:7.2pt;line-height:1}.normal{text-align:center;font-weight:700;font-size:7.2pt;margin:0 0 0.01in;line-height:1}.sheet{width:8.38in;margin:0 auto;border-collapse:collapse;table-layout:fixed}.sheet th,.sheet td{border:1px solid #222;padding:0 3px;vertical-align:middle;line-height:1}.sheet td{border-top:0;border-bottom:0;height:${rowH};mso-height-rule:exactly}.sheet tr.game-end td{border-bottom:1px solid #222}.sheet th{font-weight:700;text-align:center;background:#f2f2f2;font-size:7.4pt;height:0.13in;line-height:1}.section th{background:#fff;text-align:left;font-size:7.4pt;height:0.11in;line-height:1}.c{text-align:center}.no{width:4%}.hora{width:7%}.eq{width:31%;font-weight:700;font-size:${baseFont};line-height:1}.manual{width:19%;height:${rowH}}.props{width:20%;color:#b01818;font-weight:700;line-height:1.04;font-size:${propsFont};white-space:nowrap;padding-left:5px;padding-right:5px}.small{font-size:7pt}</style></head><body><div class="WordSection1"><table class="top"><tr><td>${esc(stamp)}</td><td class="title">Juancito Sport<br><span class="sub">Lineas del dia ${esc(fechaTxt)}</span></td><td style="text-align:right">Pag 1</td></tr></table><div class="normal">Normal</div><table class="sheet"><tr><th class="no">No.</th><th class="hora">Hora</th><th class="eq">Equipo</th><th class="manual">Maxxi</th><th class="manual">Miguel</th><th class="props">Props</th></tr><tr class="section"><th colspan="6">Strike Out</th></tr>${rows}</table></div></body></html>`;
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
    console.log(
      `Descargado ${finales.length} juegos (${finales.reduce(
        (n, game) => n + game.pitchers.length,
        0,
      )} lanzadores) -> Ponches_MLB_Formato.doc`,
    );
  } catch (error) {
    console.error(error);
    alert(error.message || "Error extrayendo Ponches.");
  } finally {
    window.__PONCHES_WORD_RUNNING__ = false;
  }
})();
