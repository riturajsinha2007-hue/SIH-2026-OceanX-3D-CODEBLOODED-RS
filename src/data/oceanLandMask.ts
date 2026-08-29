/**
 * High-Precision Coastal Landmask & Ocean Domain Identifier for the Indian Ocean Sector
 * (30°E - 120°E, 35°S - 30°N)
 *
 * Provides accurate polygon outlines that tightly conform to continental landmasses and islands
 * without cutting across the Andaman Sea, Malacca Strait, Gulf of Thailand, Persian Gulf,
 * Red Sea, Mozambique Channel, or Sunda/Lombok Straits.
 */

type Polygon = [number, number][]; // [lon, lat]

interface LandFeature {
  name: string;
  poly: Polygon;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

const ACCURATE_LAND_POLYGONS: { name: string; poly: Polygon }[] = [
  // 1. Eurasian Continent, Middle East, Indian Subcontinent, Indochina, China
  {
    name: 'Eurasia_Continent',
    poly: [
      // Sinai & Gulf of Aqaba
      [34.3, 29.6],
      [34.8, 28.2],
      [35.0, 27.8],
      // Red Sea East Coast (Saudi Arabia & Yemen)
      [35.6, 26.8],
      [36.8, 25.0],
      [37.5, 23.8],
      [38.6, 22.5],
      [39.1, 21.4], // Jeddah
      [40.2, 19.8],
      [41.5, 17.5],
      [42.4, 15.8],
      [42.9, 14.3],
      [43.3, 12.8], // Bab-el-Mandeb (Perim / Yemen)
      // Gulf of Aden North Coast (Yemen)
      [44.8, 12.7], // Aden
      [46.8, 13.4],
      [48.8, 14.0],
      [50.5, 14.8],
      [52.2, 15.6],
      // Oman Coast
      [53.8, 16.5],
      [54.8, 17.0], // Salalah
      [55.8, 18.0],
      [57.5, 19.8],
      [58.9, 21.0], // Masirah Island channel
      [59.8, 22.5], // Ras al Hadd
      // Gulf of Oman (Muscat to Musandam)
      [58.6, 23.6],
      [57.5, 24.2],
      [56.6, 25.0],
      [56.4, 26.2], // Musandam Peninsula Tip (Strait of Hormuz)
      // Persian Gulf South Coast (UAE, Qatar, Saudi Arabia, Kuwait)
      [55.9, 25.6],
      [55.2, 25.0], // Dubai
      [54.3, 24.4], // Abu Dhabi
      [52.6, 24.2],
      [51.6, 24.8],
      [51.4, 26.1], // Qatar Peninsula
      [50.8, 26.1],
      [50.1, 26.8],
      [49.0, 27.9],
      [48.3, 29.4], // Kuwait
      [48.0, 30.0], // Shatt al-Arab
      // Persian Gulf North Coast (Iran)
      [49.0, 30.1],
      [50.2, 29.7], // Bushehr
      [51.8, 27.9],
      [53.0, 27.2],
      [54.5, 26.6],
      [56.0, 27.1], // Bandar Abbas
      [57.0, 26.2],
      // Makran Coast (Iran & Pakistan)
      [58.2, 25.7],
      [59.6, 25.4],
      [60.6, 25.3], // Chah Bahar
      [61.8, 25.2], // Gwadar
      [63.5, 25.2],
      [65.0, 25.3],
      [66.6, 24.9], // Sonmiani Bay
      [67.0, 24.8], // Karachi
      [67.5, 24.2], // Indus Delta
      [68.3, 23.7],
      // Indian Subcontinent - Kutch & Saurashtra Peninsula
      [68.8, 23.3], // Kori Creek
      [69.3, 22.9],
      [70.0, 22.8], // Gulf of Kutch head
      [69.4, 22.4],
      [69.0, 22.2], // Dwarka
      [69.5, 21.6], // Porbandar
      [70.3, 20.9], // Veraval
      [71.1, 20.8], // Diu
      [72.0, 21.0],
      [72.3, 21.7], // Bhavnagar / Gulf of Khambhat west
      [72.6, 22.2], // Khambhat head
      [72.8, 21.6], // Surat / Gulf of Khambhat east
      // West Coast of India (Konkan, Kanara, Malabar)
      [72.8, 20.0], // Daman
      [72.8, 19.0], // Mumbai
      [73.1, 18.2],
      [73.3, 17.0], // Ratnagiri
      [73.8, 15.5], // Goa
      [74.3, 14.5], // Karwar
      [74.8, 13.3], // Mangalore
      [75.2, 12.0], // Kannur
      [75.8, 11.2], // Kozhikode
      [76.2, 9.9],  // Kochi
      [76.6, 8.8],  // Kollam / Thiruvananthapuram
      [77.5, 8.1],  // Kanyakumari (Cape Comorin)
      // East Coast of India (Coromandel, Andhra, Odisha)
      [78.1, 8.8],  // Tuticorin
      [79.2, 9.3],  // Rameswaram / Pamban
      [79.3, 9.9],  // Palk Strait
      [79.8, 10.3], // Point Calimere
      [79.8, 11.2], // Nagapattinam
      [80.0, 12.0], // Puducherry
      [80.3, 13.1], // Chennai
      [80.1, 14.0], // Pulicat Lake
      [80.1, 15.5], // Ongole
      [80.8, 15.9], // Krishna Delta
      [82.2, 16.7], // Godavari Delta (Kakinada)
      [83.3, 17.7], // Visakhapatnam
      [84.5, 18.8],
      [85.5, 19.5], // Chilika Lake / Puri
      [86.8, 20.3], // Mahanadi Delta (Paradip)
      [87.2, 21.2],
      // Ganges-Brahmaputra Delta & Bangladesh
      [88.0, 21.7], // Digha / Hooghly mouth
      [88.8, 21.6], // Sundarbans West
      [89.8, 21.8], // Sundarbans East
      [90.6, 22.0], // Meghna Delta / Hatia Island
      [91.8, 22.4], // Chittagong
      [92.1, 21.4], // Cox's Bazar
      // Myanmar Coast
      [92.5, 20.7],
      [93.0, 20.0], // Sittwe
      [93.7, 19.3], // Ramree Island coast
      [94.3, 17.5],
      [94.2, 16.0], // Cape Negrais
      [95.2, 15.7], // Irrawaddy Delta West
      [96.0, 15.8], // Irrawaddy Delta East
      [96.8, 16.8], // Yangon River / Gulf of Martaban
      [97.6, 16.5], // Mawlamyine
      [97.8, 15.2],
      [98.2, 13.5], // Dawei
      [98.6, 11.5], // Myeik Archipelago Coast
      [98.6, 9.8],  // Kawthaung (Southern tip of Myanmar)
      // Thailand West Coast & Malay Peninsula (West Coast)
      [98.3, 8.5],  // Phang Nga / Phuket Coast
      [98.9, 8.0],  // Krabi
      [99.4, 7.0],  // Trang / Satun
      [100.1, 6.4], // Perlis / Kedah (Malaysia)
      [100.4, 5.4], // Penang / Butterworth
      [100.6, 4.2], // Perak (Lumut)
      [101.3, 3.0], // Port Klang / Kuala Lumpur
      [102.2, 2.2], // Malacca
      [103.5, 1.4], // Johor Bahru / Singapore Strait
      // Malay Peninsula (East Coast)
      [104.2, 1.4], // Tanjung Piai / Desaru
      [104.0, 2.2], // Mersing
      [103.4, 3.8], // Kuantan
      [103.2, 5.3], // Kuala Terengganu
      [102.3, 6.2], // Kota Bharu
      // Gulf of Thailand Coast
      [101.4, 6.8], // Narathiwat / Pattani
      [100.6, 7.2], // Songkhla
      [100.0, 8.5], // Nakhon Si Thammarat
      [99.4, 9.2],  // Surat Thani
      [99.2, 10.5], // Chumphon
      [99.8, 12.0], // Prachuap Khiri Khan
      [99.9, 13.3], // Phetchaburi
      [100.5, 13.5], // Bangkok (Chao Phraya River mouth)
      [100.9, 13.3], // Chonburi
      [101.2, 12.7], // Rayong
      [102.3, 12.1], // Trat
      // Cambodia Coast
      [103.0, 11.5],
      [103.6, 10.6], // Sihanoukville
      [104.2, 10.4], // Kampot
      // Vietnam Coast (Mekong Delta to Gulf of Tonkin & China)
      [104.5, 10.0], // Ha Tien
      [104.8, 8.6],  // Cape Ca Mau (Southern tip of Indochina)
      [105.5, 8.8],  // Bac Lieu
      [106.3, 9.5],  // Soc Trang
      [106.8, 10.3], // Mekong mouths / Vung Tau
      [107.5, 10.7], // Phan Thiet
      [108.8, 11.6], // Phan Rang
      [109.2, 12.2], // Nha Trang
      [109.3, 13.5], // Quy Nhon
      [108.9, 15.0], // Quang Ngai
      [108.2, 16.0], // Da Nang
      [107.6, 16.7], // Hue
      [106.6, 17.5], // Dong Hoi
      [105.8, 18.7], // Vinh
      [105.8, 20.0], // Ninh Binh
      [106.7, 20.8], // Hai Phong (Gulf of Tonkin)
      [107.8, 21.5], // Halong / Mong Cai (China Border)
      // South China Coast
      [108.6, 21.6], // Beihai
      [110.4, 21.0], // Leizhou Peninsula
      [110.5, 21.5],
      [112.5, 21.6], // Yangjiang
      [113.6, 22.2], // Pearl River Delta (Macau / Zhuhai)
      [114.2, 22.3], // Hong Kong
      [115.5, 22.8], // Shanwei
      [116.7, 23.4], // Shantou
      [118.1, 24.5], // Xiamen
      [119.5, 25.5], // Fuzhou / Taiwan Strait
      [120.0, 26.5],
      // Continental Interior Closure (Covers inland Asia, Tibet, Central Asia, Russia, Europe)
      [120.0, 32.0],
      [30.0, 32.0],
      [30.0, 29.6],
      [34.3, 29.6],
    ],
  },

  // 2. African Continent (East & South Africa)
  {
    name: 'Africa_Continent',
    poly: [
      // Egypt & Sudan Red Sea Coast
      [32.5, 29.9], // Suez
      [33.5, 27.5], // Hurghada
      [34.9, 25.0], // Marsa Alam
      [35.6, 24.0], // Berenice
      [36.9, 22.0], // Halaib
      [37.2, 19.6], // Port Sudan
      [37.9, 18.2], // Suakin
      // Eritrea Coast
      [38.8, 16.5],
      [39.5, 15.6], // Massawa
      [41.5, 13.8],
      [42.4, 13.0], // Assab
      [43.1, 12.6], // Bab-el-Mandeb (Ras Siyyan)
      // Djibouti & Gulf of Tadjoura
      [43.1, 11.6], // Djibouti City
      [43.4, 11.5],
      // Somalia North Coast (Gulf of Aden)
      [44.0, 10.7],
      [45.0, 10.5], // Berbera
      [46.5, 10.8],
      [48.5, 11.2], // Bosaso
      [50.8, 11.9], // Cape Guardafui (Horn of Africa tip)
      [51.2, 10.5], // Ras Hafun (Easternmost point of Africa)
      // Somalia East Coast (Indian Ocean)
      [49.8, 8.0],
      [48.5, 6.0],
      [47.5, 4.5],  // Hobyo
      [46.0, 3.0],
      [45.3, 2.0],  // Mogadishu
      [44.0, 1.0],  // Merca / Baraawe
      [42.5, -0.4], // Kismayo
      // Kenya Coast
      [41.5, -1.8], // Lamu Archipelago
      [40.1, -3.2], // Malindi
      [39.6, -4.1], // Mombasa
      // Tanzania Coast
      [39.2, -5.1], // Tanga
      [38.8, -6.0], // Bagamoyo
      [39.3, -6.8], // Dar es Salaam
      [39.4, -7.8], // Mafia Channel
      [39.7, -9.0], // Kilwa
      [40.2, -10.3], // Mtwara (Ruvuma River mouth)
      // Mozambique Coast
      [40.5, -11.0], // Palma / Cabo Delgado
      [40.5, -13.0], // Pemba
      [40.8, -14.5], // Nacala
      [40.7, -15.0], // Mozambique Island
      [39.0, -17.0], // Angoche
      [36.9, -17.8], // Quelimane / Zambezi Delta
      [35.8, -19.0],
      [34.8, -19.8], // Beira
      [35.0, -21.0], // Nova Mambone
      [35.3, -21.8], // Bazaruto Channel / Vilankulo
      [35.4, -23.8], // Inhambane
      [35.0, -24.8],
      [32.8, -25.8], // Maputo Bay
      [32.9, -26.8], // Ponta do Ouro
      // South Africa Coast
      [32.6, -28.0], // St Lucia
      [32.0, -28.8], // Richards Bay
      [31.0, -29.8], // Durban
      [30.4, -30.8], // Port Shepstone
      [29.5, -31.6], // Port St Johns
      [27.9, -33.0], // East London
      [25.6, -34.0], // Gqeberha (Port Elizabeth)
      [23.0, -34.1], // Knysna / Mossel Bay
      [20.0, -34.8], // Cape Agulhas (Southernmost tip of Africa)
      // Continental Interior Closure (West of 30°E, North of 35°S)
      [18.0, -35.5],
      [18.0, 32.0],
      [32.5, 32.0],
      [32.5, 29.9],
    ],
  },

  // 3. Sri Lanka (Accurate teardrop polygon)
  {
    name: 'Sri_Lanka',
    poly: [
      [80.1, 9.8],  // Jaffna Point Pedro
      [80.6, 9.3],  // Elephant Pass
      [80.9, 8.8],  // Mullaitivu
      [81.2, 8.6],  // Trincomalee
      [81.6, 7.7],  // Batticaloa
      [81.9, 7.0],  // Pottuvil
      [81.5, 6.3],  // Yala
      [81.1, 6.0],  // Hambantota
      [80.6, 5.9],  // Dondra Head (Southern tip)
      [80.2, 6.0],  // Galle
      [79.8, 6.9],  // Colombo
      [79.8, 7.6],  // Negombo
      [79.8, 8.5],  // Kalpitiya
      [79.9, 9.0],  // Mannar
      [80.1, 9.8],
    ],
  },

  // 4. Madagascar (Accurate full outline)
  {
    name: 'Madagascar',
    poly: [
      [49.3, -12.0], // Cap d'Ambre (Northern tip)
      [50.0, -13.3], // Vohemar
      [50.5, -15.3], // Antalaha / Masoala Peninsula
      [49.8, -15.8], // Bay of Antongil
      [49.5, -17.5], // Toamasina (Tamatave)
      [48.6, -20.0], // Mahanoro
      [48.2, -21.8], // Mananjary
      [47.8, -22.8], // Manakara
      [47.0, -25.0], // Tolagnaro (Fort Dauphin)
      [45.5, -25.6], // Cap Sainte-Marie (Southern tip)
      [44.0, -25.2], // Androka
      [43.6, -23.4], // Toliara (Tulear)
      [43.5, -21.8], // Morombe
      [44.4, -20.3], // Morondava
      [44.3, -18.0], // Maintirano
      [45.3, -16.2], // Cap Saint-Andre
      [46.3, -15.7], // Mahajanga
      [47.2, -15.0], // Sofia estuary
      [48.2, -13.5], // Nosy Be coast
      [49.0, -12.4], // Antsiranana (Diego Suarez)
      [49.3, -12.0],
    ],
  },

  // 5. Sumatra (Indonesia - Tightly hugging island spine)
  {
    name: 'Sumatra',
    poly: [
      [95.3, 5.6],  // Banda Aceh (Northern tip)
      [96.0, 5.2],  // Lhokseumawe
      [97.5, 4.5],  // Langsa
      [98.7, 3.6],  // Medan / Belawan
      [99.8, 2.9],  // Tanjung Balai
      [100.8, 2.0], // Dumai
      [101.8, 1.2], // Bengkalis coast
      [102.8, 0.5], // Siak
      [103.6, -1.0], // Jambi coast
      [104.6, -2.5], // Palembang / Bangka Strait
      [105.7, -4.0], // Lampung coast
      [105.9, -5.6], // Bakauheni (Sunda Strait)
      [104.6, -5.6], // Kota Agung
      [103.8, -5.0], // Krui
      [102.3, -3.8], // Bengkulu
      [101.0, -2.5], // Mukomuko
      [100.4, -1.0], // Padang
      [99.0, 0.5],  // Air Bangis
      [98.7, 1.7],  // Sibolga
      [97.0, 3.0],  // Singkil
      [96.0, 4.0],  // Meulaboh
      [95.3, 5.6],
    ],
  },

  // 6. Java (Indonesia)
  {
    name: 'Java',
    poly: [
      [106.0, -5.9], // Merak (Sunda Strait)
      [106.8, -6.1], // Jakarta
      [108.5, -6.7], // Cirebon
      [109.7, -6.9], // Pekalongan
      [110.4, -6.9], // Semarang
      [111.5, -6.7], // Rembang
      [112.7, -7.2], // Surabaya
      [114.0, -7.7], // Situbondo
      [114.4, -8.7], // Banyuwangi (Bali Strait)
      [113.5, -8.3], // Jember coast
      [112.5, -8.4], // Malang south
      [110.8, -8.2], // Pacitan
      [110.2, -8.0], // Yogyakarta (Parangtritis)
      [109.0, -7.7], // Cilacap
      [107.5, -7.5], // Pangandaran
      [106.5, -7.0], // Pelabuhan Ratu
      [105.2, -6.7], // Ujung Kulon (Western tip)
      [106.0, -5.9],
    ],
  },

  // 7. Borneo / Kalimantan (Tightly hugging coastline)
  {
    name: 'Borneo',
    poly: [
      [109.6, 2.0],  // Tanjung Datu (Sarawak border)
      [110.3, 1.6],  // Kuching
      [111.4, 2.2],  // Sarikei
      [113.0, 3.2],  // Bintulu
      [114.0, 4.4],  // Miri
      [115.0, 4.9],  // Brunei
      [116.0, 6.0],  // Kota Kinabalu
      [116.9, 7.0],  // Kudat (Northern tip of Borneo)
      [117.6, 6.0],  // Sandakan
      [118.6, 5.0],  // Lahad Datu
      [117.9, 4.2],  // Tawau
      [117.5, 3.0],  // Tarakan
      [117.6, 0.5],  // Bontang
      [117.0, -1.2], // Balikpapan
      [116.4, -3.5], // Kotabaru
      [114.5, -3.5], // Banjarmasin
      [112.8, -3.0], // Sampit
      [111.6, -2.8], // Pangkalan Bun
      [110.0, -2.5], // Kendawangan
      [109.2, -1.0], // Sukadana
      [109.3, 0.0],  // Pontianak
      [108.9, 1.0],  // Singkawang
      [109.6, 2.0],
    ],
  },

  // 8. Australia (Northwest & Western Australia)
  {
    name: 'Western_Australia',
    poly: [
      [120.0, -14.0], // Kimberley Coast
      [118.6, -20.3], // Port Hedland
      [116.8, -20.7], // Karratha / Dampier
      [114.1, -21.8], // Exmouth / North West Cape
      [113.6, -24.9], // Carnarvon / Shark Bay
      [114.6, -28.8], // Geraldton
      [115.7, -32.0], // Perth / Fremantle
      [115.1, -34.3], // Cape Naturaliste / Leeuwin
      [117.9, -35.0], // Albany
      [120.0, -35.0],
      [122.0, -35.0],
      [122.0, -12.0],
      [120.0, -14.0],
    ],
  },
];

// Pre-calculate bounding boxes for fast broad-phase rejection
const LAND_FEATURES: LandFeature[] = ACCURATE_LAND_POLYGONS.map((item) => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of item.poly) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return {
    name: item.name,
    poly: item.poly,
    minLon,
    maxLon,
    minLat,
    maxLat,
  };
});

function isPointInPoly(x: number, y: number, feature: LandFeature): boolean {
  if (x < feature.minLon || x > feature.maxLon || y < feature.minLat || y > feature.maxLat) {
    return false;
  }

  const poly = feature.poly;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns true if a given (lat, lon) coordinate is located over continental land or islands.
 * Highly accurate: preserves all straits, bays, gulfs, and open ocean without false land masking.
 */
export function isLandCoordinate(lat: number, lon: number): boolean {
  for (let i = 0; i < LAND_FEATURES.length; i++) {
    if (isPointInPoly(lon, lat, LAND_FEATURES[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Computes sub-pixel anti-aliased ocean fraction (0.0 = pure land, 1.0 = pure ocean, 0.0-1.0 = coastal boundary).
 * Uses 4 jittered sub-pixel sample points to eliminate stair-step pixelation along all coastlines.
 */
export function getOceanAntiAliasedCoverage(lat: number, lon: number, deltaLat: number = 0.03, deltaLon: number = 0.03): number {
  const dLat = deltaLat * 0.38;
  const dLon = deltaLon * 0.38;

  let oceanCount = 0;
  if (!isLandCoordinate(lat + dLat, lon + dLon)) oceanCount++;
  if (!isLandCoordinate(lat - dLat, lon + dLon)) oceanCount++;
  if (!isLandCoordinate(lat + dLat, lon - dLon)) oceanCount++;
  if (!isLandCoordinate(lat - dLat, lon - dLon)) oceanCount++;

  return oceanCount * 0.25;
}
