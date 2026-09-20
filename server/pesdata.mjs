import crypto from "node:crypto";
const positions = {
  GK: "Kaleci",
  CB: "Stoper",
  LB: "Sol Bek",
  RB: "Sağ Bek",
  DMF: "Ön Libero",
  CMF: "Merkez Orta Saha",
  LMF: "Sol Orta Saha",
  RMF: "Sağ Orta Saha",
  AMF: "On Numara",
  LWF: "Sol Kanat",
  RWF: "Sağ Kanat",
  SS: "Forvet Arkası",
  CF: "Santrfor",
};
const countries = {
  228: "Portekiz",
  144: "Arjantin",
  208: "Fransa",
  190: "Türkiye",
  200: "Hırvatistan",
  204: "İngiltere",
  226: "Norveç",
  146: "Brezilya",
  236: "İspanya",
  210: "Almanya",
  215: "İtalya",
  224: "Hollanda",
  197: "Belçika",
  237: "İsveç",
  152: "Uruguay",
  148: "Kolombiya",
  76: "Fas",
  58: "Mısır",
  13: "Japonya",
  16: "Güney Kore",
  135: "ABD",
  238: "İsviçre",
  303: "Sırbistan",
};
export async function searchPesdata(query, start = 0, nationalityLookup = {}) {
  const word = encodeURIComponent(query.trim()).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
  const timestamp = String(Math.floor(Date.now() / 1000)),
    nonce = crypto.randomBytes(12).toString("hex"),
    limit = 100;
  const signed = `limit=${limit}&order=DESC&searchword=${word}&start=${start}`;
  const signature = crypto
    .createHash("md5")
    .update(timestamp + nonce + "777888" + signed)
    .digest("hex");
  const response = await fetch(
    `https://www.pesdata.net/api/player/list?start=${start}&limit=${limit}&order=DESC&searchword=${word}`,
    {
      headers: {
        version: "1.9.0",
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw Error(
      `PESDATA sunucusu ${response.status} yanıtı verdi. Yerel katalog kullanılabilir.`,
    );
  const json = await response.json();
  if (json.code !== 1)
    throw Error("PESDATA aramaya yanıt vermedi. Daha sonra tekrar deneyin.");
  const data = json.data || json,
    result = data.list || [];
  return {
    count: Number(data.count) || result.length,
    start,
    players: result
      .filter((p) => p.playerId && p.playerName)
      .map((p) => ({
        pesdataId: String(p.playerId),
        name: p.playerName,
        position: positions[p.position] || p.position || "",
        nation:
          countries[p.country_id] ||
          p.country_name ||
          nationalityLookup[String(p.playerId)] ||
          "",
        rating: Number(p.overall) || 0,
        speed: p.Speed == null ? null : Number(p.Speed),
        shoot: p.Finishing == null ? null : Number(p.Finishing),
        pass: p.LowPass == null ? null : Number(p.LowPass),
        dribble: p.Dribbling == null ? null : Number(p.Dribbling),
        stamina: p.Stamina == null ? null : Number(p.Stamina),
        detail: `https://www.pesdata.net/player/detail/${p.playerId}`,
        image: `https://img.pesdata.net/images/playerCard/${p.playerId}_l.webp`,
      })),
  };
}
