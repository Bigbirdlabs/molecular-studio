/**
 * Curated molecule library (Molecular Studio).
 *
 * GENERATED DATA (gauntlet/scratch/build-library.mjs): coordinates come from PubChem 3D conformers
 * (PUG REST, record_type=3d) with explicit hydrogens, except where noted below. Every molecule is centered on its
 * centroid and rotated onto its principal axes (longest extent along x, plane normal along z) so planar molecules
 * face the default camera. Kekule bond orders are kept as delivered by PubChem; rings that satisfy a simple Hueckel
 * test (planar 5/6-membered ring, all sp2, 4n+2 pi electrons, no exocyclic C=O/C=S) carry the aromatic flag on
 * their bonds.
 *
 * Sources that are NOT PubChem conformers (PubChem has no usable 3D record for these):
 *  - metan: exact tetrahedron, C-H 1.087 A (CCCBDB experimental); su/amonyak/karbondioksit also use CCCBDB experimental geometries (O-H 0.9578 A, 104.48 deg; N-H 1.012 A, 106.67 deg; C=O 1.160 A, 180 deg)
 *  - bor-triflorur: D3h, B-F 1.313 A; kukurt-heksaflorur: Oh, S-F 1.56 A; kukurt-dioksit: S=O 1.431 A, O=S=O 119.3 deg
 *    (experimental gas-phase geometries from electron diffraction / microwave spectroscopy)
 *  - tristearin: RCSB Chemical Component Dictionary ideal coordinates (component TGL), a computed extended conformer.
 */
import { emptyMolecule, type BondOrder, type Molecule } from './molecule'

export interface LibraryEntry {
  id: string
  name: string
  nameEn: string
  /** Turkish category name (see CATEGORY_EN for the English label). */
  category: string
  description: string
  descriptionEn: string
  molecule: Molecule
}

/** English labels for the Turkish category names used in `LibraryEntry.category`. */
export const CATEGORY_EN: Record<string, string> = {
  'Temel Moleküller': 'Basic molecules',
  'Özel Geometriler': 'Special geometries',
  'Hidrokarbonlar': 'Hydrocarbons',
  'Aromatik Bileşikler': 'Aromatic compounds',
  'Alkol, Eter ve Karbonil': 'Alcohols, ethers and carbonyls',
  'Biyomoleküller': 'Biomolecules',
  'İlaçlar ve Alkaloitler': 'Drugs and alkaloids',
}

/** [symbol, x, y, z, formalCharge?] */
type AtomRow = [string, number, number, number, number?]
/** [atom number a (1-based), atom number b (1-based), order, aromatic flag (1)?] */
type BondRow = [number, number, number, number?]
interface RawEntry extends Omit<LibraryEntry, 'molecule'> {
  atoms: AtomRow[]
  bonds: BondRow[]
}

const RAW: RawEntry[] = [
  {
    id: 'metan',
    category: 'Hidrokarbonlar',
    name: "Metan",
    nameEn: "Methane",
    description: "CH₄ — Doğal gazın ana bileşenidir; dört C–H bağı düzgün bir dörtyüzlünün köşelerine yönelir ve H–C–H açısı 109,5°'dir.",
    descriptionEn: "CH₄ — Main component of natural gas; its four C–H bonds point to the corners of a regular tetrahedron, with H–C–H angles of 109.5°.",
    atoms: [
      ['C',0,0,0], ['H',0.6276,0.6276,0.6276], ['H',0.6276,-0.6276,-0.6276], ['H',-0.6276,0.6276,-0.6276],
      ['H',-0.6276,-0.6276,0.6276],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1], [1,5,1],
    ],
  },
  {
    id: 'su',
    category: 'Temel Moleküller',
    name: "Su",
    nameEn: "Water",
    description: "H₂O — Bükülmüş bir moleküldür (H–O–H açısı gaz fazında yaklaşık 104,5°); hidrojen bağları nedeniyle kaynama noktası 100 °C'dir, kütlesi benzer H₂S ise −60 °C'de kaynar.",
    descriptionEn: "H₂O — A bent molecule (H–O–H angle about 104.5° in the gas phase); hydrogen bonding gives it a boiling point of 100 °C, whereas the similar-mass H₂S boils at −60 °C.",
    atoms: [
      ['O',0,0.391,0], ['H',0.7572,-0.1955,0], ['H',-0.7572,-0.1955,0],
    ],
    bonds: [
      [1,2,1], [1,3,1],
    ],
  },
  {
    id: 'amonyak',
    category: 'Temel Moleküller',
    name: "Amonyak",
    nameEn: "Ammonia",
    description: "H₃N — Üçgen piramit geometrisindedir: azot üzerinde bir ortaklanmamış elektron çifti vardır, N–H bağı 1,012 Å ve H–N–H açısı yaklaşık 106,7°'dir (düzlemsel değildir). Haber–Bosch süreciyle N₂ ve H₂'den endüstriyel ölçekte üretilir.",
    descriptionEn: "H₃N — Trigonal pyramidal: nitrogen carries one lone pair, the N–H bond is 1.012 Å and the H–N–H angle is about 106.7° (not planar). It is made industrially from N₂ and H₂ by the Haber–Bosch process.",
    atoms: [
      ['N',0,0,-0.2861], ['H',0.9373,0,0.0954], ['H',-0.4687,0.8118,0.0954], ['H',-0.4687,-0.8118,0.0954],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1],
    ],
  },
  {
    id: 'karbondioksit',
    category: 'Temel Moleküller',
    name: "Karbondioksit",
    nameEn: "Carbon dioxide",
    description: "CO₂ — Doğrusal bir moleküldür (O=C=O açısı 180°). Katı hali olan kuru buz, atmosfer basıncında sıvılaşmadan doğrudan gaza dönüşür (−78,5 °C'de süblimleşir).",
    descriptionEn: "CO₂ — A linear molecule (O=C=O angle 180°). Its solid form, dry ice, sublimes directly to gas at atmospheric pressure (−78.5 °C).",
    atoms: [
      ['O',-1.16,0,0], ['O',1.16,0,0], ['C',0,0,0],
    ],
    bonds: [
      [1,3,2], [2,3,2],
    ],
  },
  {
    id: 'hidrojen-peroksit',
    category: 'Temel Moleküller',
    name: "Hidrojen peroksit",
    nameEn: "Hydrogen peroxide",
    description: "H₂O₂ — Tek bir O–O bağı içerir; H–O–O–H burulma açısı gaz fazında yaklaşık 111°'dir, yani molekül düzlemsel değildir. Seyreltik çözeltileri ağartıcı ve antiseptik olarak kullanılır.",
    descriptionEn: "H₂O₂ — Contains a single O–O bond; the H–O–O–H torsion angle is about 111° in the gas phase, so the molecule is not planar. Dilute solutions are used as bleach and antiseptic.",
    atoms: [
      ['O',-0.6311,0.3299,-0.3563], ['O',0.6311,0.33,0.3562], ['H',-1.0647,-0.3299,0.2112], ['H',1.0647,-0.33,-0.2112],
    ],
    bonds: [
      [1,2,1], [1,3,1], [2,4,1],
    ],
  },
  {
    id: 'kukurt-dioksit',
    category: 'Temel Moleküller',
    name: "Kükürt dioksit",
    nameEn: "Sulfur dioxide",
    description: "O₂S — Bükülmüş bir moleküldür (O=S=O açısı yaklaşık 119°). Fosil yakıtların yanmasıyla ve volkanik gazlarla atmosfere karışır ve asit yağmuruna katkıda bulunur.",
    descriptionEn: "O₂S — A bent molecule (O=S=O angle about 119°). It enters the atmosphere from fossil-fuel combustion and volcanic gases, and contributes to acid rain.",
    atoms: [
      ['S',0,0.482,0], ['O',1.2349,-0.241,0], ['O',-1.2349,-0.241,0],
    ],
    bonds: [
      [1,2,2], [1,3,2],
    ],
  },
  {
    id: 'bor-triflorur',
    category: 'Özel Geometriler',
    name: "Bor triflorür",
    nameEn: "Boron trifluoride",
    description: "BF₃ — Düzlemsel üçgen geometridedir (F–B–F açısı 120°). Bor çevresinde yalnızca 6 değerlik elektronu bulunur (elektron eksikliği), bu yüzden güçlü bir Lewis asididir.",
    descriptionEn: "BF₃ — Trigonal planar (F–B–F angle 120°). Boron has only 6 valence electrons around it (electron deficient), which makes BF₃ a strong Lewis acid.",
    atoms: [
      ['B',0,0,0], ['F',1.313,0,0], ['F',-0.6565,1.1371,0], ['F',-0.6565,-1.1371,0],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1],
    ],
  },
  {
    id: 'kukurt-heksaflorur',
    category: 'Özel Geometriler',
    name: "Kükürt heksaflorür",
    nameEn: "Sulfur hexafluoride",
    description: "F₆S — Düzgün sekizyüzlü geometridedir: altı S–F bağı birbirine 90° ile diktir ve kükürt oktetten fazla (12) elektronla çevrilidir. Kimyasal olarak çok kararlıdır; yüksek gerilim şalt cihazlarında yalıtkan gaz olarak kullanılır.",
    descriptionEn: "F₆S — Regular octahedral geometry: the six S–F bonds are at 90° to each other and sulfur is surrounded by more than an octet (12 electrons). Chemically very stable, it is used as an insulating gas in high-voltage switchgear.",
    atoms: [
      ['S',0,0,0], ['F',1.56,0,0], ['F',-1.56,0,0], ['F',0,1.56,0],
      ['F',0,-1.56,0], ['F',0,0,1.56], ['F',0,0,-1.56],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1], [1,5,1], [1,6,1], [1,7,1],
    ],
  },
  {
    id: 'sulfurik-asit',
    category: 'Özel Geometriler',
    name: "Sülfürik asit",
    nameEn: "Sulfuric acid",
    description: "H₂O₄S — Dünyada en çok üretilen endüstriyel kimyasallardan biridir ve kurşun-asit akülerde elektrolit olarak kullanılır. Kükürt atomu dörtyüzlü bir çevrede iki S=O ve iki S–OH bağı taşır.",
    descriptionEn: "H₂O₄S — One of the most widely produced industrial chemicals, used as the electrolyte in lead-acid batteries. The sulfur atom sits in a tetrahedral environment with two S=O and two S–OH bonds.",
    atoms: [
      ['S',-0.0002,0.5841,0], ['O',-1.1313,-0.4304,0.5898], ['O',1.1315,-0.43,-0.5898], ['O',-0.5818,1.3028,-1.1174],
      ['O',0.5811,1.3034,1.1172], ['H',-1.3944,-1.1653,-0.0126], ['H',1.395,-1.1646,0.0128],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,2], [1,5,2], [2,6,1], [3,7,1],
    ],
  },
  {
    id: 'fosforik-asit',
    category: 'Özel Geometriler',
    name: "Fosforik asit",
    nameEn: "Phosphoric acid",
    description: "H₃O₄P — Gıdalarda asitlik düzenleyici olarak (E338) kullanılır, örneğin kola içeceklerinde. Fosfor atomu dörtyüzlü bir çevrede bir P=O ve üç P–OH grubu taşır.",
    descriptionEn: "H₃O₄P — Used in foods as an acidity regulator (E338), for example in cola drinks. The phosphorus atom sits in a tetrahedral environment with one P=O and three P–OH groups.",
    atoms: [
      ['P',0.1644,-0.2825,-0.3966], ['O',-0.403,1.1904,-0.7393], ['O',-1.1372,-1.0916,0.1162], ['O',1.0729,-0.086,0.9235],
      ['O',0.8776,-0.9499,-1.5376], ['H',-0.8958,1.6827,-0.0486], ['H',-1.6647,-0.7226,0.8564], ['H',1.9857,0.2595,0.8259],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1], [1,5,2], [2,6,1], [3,7,1], [4,8,1],
    ],
  },
  {
    id: 'etan',
    category: 'Hidrokarbonlar',
    name: "Etan",
    nameEn: "Ethane",
    description: "C₂H₆ — İki karbonlu en basit alkandır ve doğal gazın bir bileşenidir. C–C tek bağı etrafındaki dönmede engelli (şaşırtmalı) konformasyon, örtüşmüş konformasyondan yaklaşık 12 kJ/mol daha kararlıdır.",
    descriptionEn: "C₂H₆ — The simplest two-carbon alkane and a component of natural gas. Around the C–C single bond the staggered conformation is about 12 kJ/mol more stable than the eclipsed one.",
    atoms: [
      ['C',-0.756,0,0], ['C',0.756,0,0], ['H',-1.1404,0.8777,0.5281], ['H',-1.1404,0.0186,-1.0241],
      ['H',-1.1405,-0.8962,0.496], ['H',1.1404,-0.0186,1.0241], ['H',1.1405,0.8962,-0.496], ['H',1.1404,-0.8777,-0.5281],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1], [1,5,1], [2,6,1], [2,7,1], [2,8,1],
    ],
  },
  {
    id: 'propan',
    category: 'Hidrokarbonlar',
    name: "Propan",
    nameEn: "Propane",
    description: "C₃H₈ — Üç karbonlu bir alkandır ve sıvılaştırılmış petrol gazının (LPG) ana bileşenlerinden biridir; C–C–C açısı yaklaşık 112°'dir.",
    descriptionEn: "C₃H₈ — A three-carbon alkane and one of the main components of liquefied petroleum gas (LPG); the C–C–C angle is about 112°.",
    atoms: [
      ['C',0,0.6196,0], ['C',-1.2571,-0.2338,0], ['C',1.2571,-0.2338,0], ['H',0,1.2689,-0.8824],
      ['H',0,1.269,0.8824], ['H',-1.2969,-0.8738,-0.8873], ['H',-1.2967,-0.8738,0.8872], ['H',-2.1475,0.4026,0.0001],
      ['H',2.1475,0.4027,0], ['H',1.2968,-0.8738,-0.8872], ['H',1.2968,-0.8738,0.8872],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,4,1], [1,5,1], [2,6,1], [2,7,1], [2,8,1], [3,9,1],
      [3,10,1], [3,11,1],
    ],
  },
  {
    id: 'etilen',
    category: 'Hidrokarbonlar',
    name: "Etilen (eten)",
    nameEn: "Ethylene (ethene)",
    description: "C₂H₄ — Düzlemsel bir moleküldür ve C=C çift bağı yaklaşık 1,34 Å uzunluğundadır. Bitkilerde meyve olgunlaşmasını düzenleyen bir hormondur ve polietilenin hammaddesidir.",
    descriptionEn: "C₂H₄ — A planar molecule with a C=C double bond about 1.34 Å long. It is a plant hormone that regulates fruit ripening and the feedstock for polyethylene.",
    atoms: [
      ['C',-0.6672,0,0], ['C',0.6672,0,0], ['H',-1.2213,0.9317,0], ['H',-1.2212,-0.9317,0],
      ['H',1.2213,-0.9317,0], ['H',1.2213,0.9317,0],
    ],
    bonds: [
      [1,2,2], [1,3,1], [1,4,1], [2,5,1], [2,6,1],
    ],
  },
  {
    id: 'asetilen',
    category: 'Hidrokarbonlar',
    name: "Asetilen (etin)",
    nameEn: "Acetylene (ethyne)",
    description: "C₂H₂ — Doğrusal H–C≡C–H yapısındadır ve C≡C üçlü bağı yaklaşık 1,20 Å uzunluğundadır. Oksi-asetilen kaynağında alev sıcaklığı 3000 °C'nin üzerine çıkar.",
    descriptionEn: "C₂H₂ — Linear H–C≡C–H with a C≡C triple bond about 1.20 Å long. The flame in oxy-acetylene welding exceeds 3000 °C.",
    atoms: [
      ['C',-0.6,0,0], ['C',0.6,0,0], ['H',-1.665,0,0], ['H',1.665,0,0],
    ],
    bonds: [
      [1,2,3], [1,3,1], [2,4,1],
    ],
  },
  {
    id: 'siklohekzan',
    category: 'Hidrokarbonlar',
    name: "Siklohekzan",
    nameEn: "Cyclohexane",
    description: "C₆H₁₂ — Sandalye konformasyonunda C–C–C açıları yaklaşık 111°'dir; bu yüzden halka açı gerilimi taşımaz. Hidrojenleri eksenel ve ekvatoral olmak üzere iki gruba ayrılır.",
    descriptionEn: "C₆H₁₂ — In the chair conformation the C–C–C angles are about 111°, so the ring carries essentially no angle strain. Its hydrogens fall into axial and equatorial sets.",
    atoms: [
      ['C',0.135,-1.4517,-0.2258], ['C',1.3248,-0.6088,0.2258], ['C',-1.1897,-0.8428,0.2258], ['C',1.1896,0.8429,-0.2257],
      ['C',-1.3248,0.6088,-0.2258], ['C',-0.135,1.4517,0.2258], ['H',0.143,-1.5365,-1.3194], ['H',0.2296,-2.4675,0.1741],
      ['H',1.4022,-0.6444,1.3194], ['H',2.2518,-1.035,-0.1742], ['H',-2.0221,-1.4326,-0.1741], ['H',-1.2592,-0.8921,1.3195],
      ['H',2.0221,1.4326,0.1742], ['H',1.2593,0.8922,-1.3194], ['H',-1.4022,0.6444,-1.3195], ['H',-2.2518,1.0349,0.1741],
      ['H',-0.1431,1.5365,1.3195], ['H',-0.2297,2.4675,-0.1742],
    ],
    bonds: [
      [1,2,1], [1,3,1], [1,7,1], [1,8,1], [2,4,1], [2,9,1], [2,10,1], [3,5,1],
      [3,11,1], [3,12,1], [4,6,1], [4,13,1], [4,14,1], [5,6,1], [5,15,1], [5,16,1],
      [6,17,1], [6,18,1],
    ],
  },
  {
    id: 'adamantan',
    category: 'Hidrokarbonlar',
    name: "Adamantan",
    nameEn: "Adamantane",
    description: "C₁₀H₁₆ — Karbon iskeleti elmas kristal örgüsünün en küçük kafes birimine benzeyen bir hidrokarbondur; ilk kez 1933'te petrolden izole edilmiştir.",
    descriptionEn: "C₁₀H₁₆ — A hydrocarbon whose carbon skeleton resembles the smallest cage unit of the diamond lattice; it was first isolated from petroleum in 1933.",
    atoms: [
      ['C',0.3856,-0.989,-1.1222], ['C',-0.6216,-0.7779,1.1809], ['C',-1.0263,1.0193,-0.5421], ['C',1.2623,0.7477,0.4834],
      ['C',-0.2347,-1.757,0.0584], ['C',-0.6372,0.0301,-1.6548], ['C',1.6385,-0.24,-0.6351], ['C',-1.6385,0.24,0.6351],
      ['C',0.6371,-0.0301,1.6549], ['C',0.2347,1.757,-0.0584], ['H',0.6591,-1.6906,-1.9181], ['H',-1.0624,-1.3297,2.0184],
      ['H',-1.7541,1.7423,-0.9266], ['H',2.1576,1.278,0.8263], ['H',-1.1206,-2.3094,-0.2784], ['H',0.4782,-2.4992,0.4383],
      ['H',-0.2138,0.5742,-2.5082], ['H',-1.5299,-0.4918,-2.0209], ['H',2.3835,-0.9562,-0.2671], ['H',2.1008,0.2995,-1.471],
      ['H',-2.5483,-0.2783,0.3081], ['H',-1.9359,0.9351,1.4298], ['H',0.3786,0.6604,2.4672], ['H',1.3649,-0.7427,2.062],
      ['H',0.6729,2.3304,-0.8844], ['H',-0.0306,2.478,0.7245],
    ],
    bonds: [
      [1,5,1], [1,6,1], [1,7,1], [1,11,1], [2,5,1], [2,8,1], [2,9,1], [2,12,1],
      [3,6,1], [3,8,1], [3,10,1], [3,13,1], [4,7,1], [4,9,1], [4,10,1], [4,14,1],
      [5,15,1], [5,16,1], [6,17,1], [6,18,1], [7,19,1], [7,20,1], [8,21,1], [8,22,1],
      [9,23,1], [9,24,1], [10,25,1], [10,26,1],
    ],
  },
  {
    id: 'benzen',
    category: 'Aromatik Bileşikler',
    name: "Benzen",
    nameEn: "Benzene",
    description: "C₆H₆ — Düzlemsel altılı halkadır ve tüm C–C bağları yaklaşık 1,39 Å ile eşit uzunluktadır (tek ve çift bağ arasında). Kekulé halka yapısını 1865'te önermiştir; burada Kekulé gösterimi çizilir, halka aromatik olarak işaretlidir.",
    descriptionEn: "C₆H₆ — A planar six-membered ring whose C–C bonds are all equal at about 1.39 Å (between single and double). Kekulé proposed the ring structure in 1865; the Kekulé drawing is shown and the ring is flagged aromatic.",
    atoms: [
      ['C',-0.9949,0.9776,0], ['C',-1.3442,-0.3728,-0.0001], ['C',0.3492,1.3504,0], ['C',-0.3492,-1.3504,0.0001],
      ['C',1.3441,0.3727,0], ['C',0.9949,-0.9776,0], ['H',-1.7696,1.7388,0], ['H',-2.3907,-0.6631,-0.0001],
      ['H',0.6211,2.402,0.0001], ['H',-0.6211,-2.4018,0], ['H',2.3908,0.663,-0.0001], ['H',1.7696,-1.7388,0],
    ],
    bonds: [
      [1,2,2,1], [1,3,1,1], [1,7,1], [2,4,1,1], [2,8,1], [3,5,2,1], [3,9,1], [4,6,2,1],
      [4,10,1], [5,6,1,1], [5,11,1], [6,12,1],
    ],
  },
  {
    id: 'naftalin',
    category: 'Aromatik Bileşikler',
    name: "Naftalin",
    nameEn: "Naphthalene",
    description: "C₁₀H₈ — İki kaynaşmış benzen halkasından oluşan düzlemsel bir bileşiktir. Oda sıcaklığında katıdır ve süblimleşir; güve kovucu olarak kullanılmıştır.",
    descriptionEn: "C₁₀H₈ — A planar compound made of two fused benzene rings. It is a solid at room temperature that sublimes, and has been used as a moth repellent.",
    atoms: [
      ['C',0,-0.7076,-0.0001], ['C',0,0.7076,0], ['C',1.225,-1.3944,0], ['C',1.225,1.3944,-0.0001],
      ['C',-1.225,-1.3943,0], ['C',-1.225,1.3943,0], ['C',2.4327,-0.6959,0.0001], ['C',2.4327,0.6958,0],
      ['C',-2.4327,-0.6958,0], ['C',-2.4327,0.6958,0.0001], ['H',1.2489,-2.4821,0.0001], ['H',1.2489,2.4822,-0.0001],
      ['H',-1.249,-2.4821,-0.0001], ['H',-1.2489,2.4822,0.0001], ['H',3.3732,-1.2391,0.0001], ['H',3.3733,1.239,0.0001],
      ['H',-3.3732,-1.239,0], ['H',-3.3733,1.239,0.0001],
    ],
    bonds: [
      [1,2,1,1], [1,3,2,1], [1,5,1,1], [2,4,2,1], [2,6,1,1], [3,7,1,1], [3,11,1], [4,8,1,1],
      [4,12,1], [5,9,2,1], [5,13,1], [6,10,2,1], [6,14,1], [7,8,2,1], [7,15,1], [8,16,1],
      [9,10,1,1], [9,17,1], [10,18,1],
    ],
  },
  {
    id: 'toluen',
    category: 'Aromatik Bileşikler',
    name: "Toluen",
    nameEn: "Toluene",
    description: "C₇H₈ — Benzen halkasına bir metil grubu bağlıdır. Kaynama noktası yaklaşık 111 °C olan, boya inceltici ve çözücü olarak kullanılan bir sıvıdır.",
    descriptionEn: "C₇H₈ — A methyl group attached to a benzene ring. It is a liquid boiling at about 111 °C, used as a paint thinner and solvent.",
    atoms: [
      ['C',0.7143,0,0.0006], ['C',0.0168,1.2079,0.0001], ['C',0.017,-1.2079,0.0002], ['C',2.2059,0.0001,0.0022],
      ['C',-1.3781,1.208,-0.0009], ['C',-1.3779,-1.208,-0.001], ['C',-2.0754,0,-0.0015], ['H',0.5487,2.1557,0.0023],
      ['H',0.549,-2.1556,0.0024], ['H',2.6016,-0.8801,-0.516], ['H',2.6016,0.8808,-0.5152], ['H',2.5804,-0.0004,1.0306],
      ['H',-1.9213,2.1484,-0.0008], ['H',-1.9211,-2.1485,-0.0009], ['H',-3.1615,-0.0001,-0.0021],
    ],
    bonds: [
      [1,2,2,1], [1,3,1,1], [1,4,1], [2,5,1,1], [2,8,1], [3,6,2,1], [3,9,1], [4,10,1],
      [4,11,1], [4,12,1], [5,7,2,1], [5,13,1], [6,7,1,1], [6,14,1], [7,15,1],
    ],
  },
  {
    id: 'fenol',
    category: 'Aromatik Bileşikler',
    name: "Fenol",
    nameEn: "Phenol",
    description: "C₆H₆O — Benzen halkasına doğrudan bir hidroksil grubu bağlıdır. Karbolik asit adıyla Joseph Lister tarafından 1860'ların ortasında cerrahide antiseptik olarak kullanılmıştır.",
    descriptionEn: "C₆H₆O — A hydroxyl group bonded directly to a benzene ring. Under the name carbolic acid it was used by Joseph Lister as a surgical antiseptic in the mid-1860s.",
    atoms: [
      ['O',2.3999,0.7035,-0.0003], ['C',1.0834,0.3579,0.0004], ['C',0.7156,-0.9876,0.0003], ['C',0.1022,1.3492,0.0002],
      ['C',-0.6336,-1.3418,0], ['C',-1.247,0.995,0.0001], ['C',-1.6149,-0.3505,-0.0001], ['H',1.4703,-1.7694,0.0003],
      ['H',0.3825,2.399,0.0001], ['H',-0.9202,-2.3893,-0.0002], ['H',-2.0111,1.7669,-0.0001], ['H',-2.6654,-0.6262,-0.0003],
      ['H',2.9382,-0.1065,-0.0004],
    ],
    bonds: [
      [1,2,1], [1,13,1], [2,3,2,1], [2,4,1,1], [3,5,1,1], [3,8,1], [4,6,2,1], [4,9,1],
      [5,7,2,1], [5,10,1], [6,7,1,1], [6,11,1], [7,12,1],
    ],
  },
  {
    id: 'anilin',
    category: 'Aromatik Bileşikler',
    name: "Anilin",
    nameEn: "Aniline",
    description: "C₆H₇N — Benzen halkasına bir NH₂ grubu bağlı en basit aromatik amindir. William Perkin 1856'da ilk sentetik boya olan mauveini anilin içeren bir karışımdan elde etmiştir.",
    descriptionEn: "C₆H₇N — The simplest aromatic amine, an NH₂ group on a benzene ring. In 1856 William Perkin obtained mauveine, the first synthetic dye, from an aniline-containing mixture.",
    atoms: [
      ['N',2.3107,0.0001,0.0008], ['C',0.9002,0.0003,-0.0001], ['C',0.2031,-1.2078,-0.0002], ['C',0.2026,1.2081,-0.0003],
      ['C',-1.1918,-1.208,0], ['C',-1.1923,1.2078,0], ['C',-1.8896,-0.0002,0.0001], ['H',0.7351,-2.1557,-0.0001],
      ['H',0.7343,2.1562,-0.0001], ['H',-1.7349,-2.1486,0], ['H',-1.7357,2.1482,0], ['H',-2.9757,-0.0005,0.0002],
      ['H',2.817,0.8757,-0.0001], ['H',2.8169,-0.8754,-0.0002],
    ],
    bonds: [
      [1,2,1], [1,13,1], [1,14,1], [2,3,2,1], [2,4,1,1], [3,5,1,1], [3,8,1], [4,6,2,1],
      [4,9,1], [5,7,2,1], [5,10,1], [6,7,1,1], [6,11,1], [7,12,1],
    ],
  },
  {
    id: 'piridin',
    category: 'Aromatik Bileşikler',
    name: "Piridin",
    nameEn: "Pyridine",
    description: "C₅H₅N — Benzendeki bir CH grubunun azotla değiştiği altılı aromatik halkadır; azotun ortaklanmamış elektron çifti halka düzleminde yer alır ve nikotin gibi birçok bileşikte bulunur.",
    descriptionEn: "C₅H₅N — A six-membered aromatic ring in which one CH of benzene is replaced by nitrogen; the nitrogen lone pair lies in the ring plane. The ring occurs in many compounds such as nicotine.",
    atoms: [
      ['N',0.0002,-1.6165,0], ['C',-0.0002,1.1788,0], ['C',1.2025,0.481,-0.0001], ['C',-1.2027,0.4807,0],
      ['C',1.149,-0.9035,0.0001], ['C',-1.1486,-0.9039,0], ['H',-0.0004,2.2647,0.0001], ['H',2.1518,1.0043,-0.0001],
      ['H',-2.152,1.0038,0.0001], ['H',2.059,-1.4945,0.0001], ['H',-2.0585,-1.495,0],
    ],
    bonds: [
      [1,5,2,1], [1,6,1,1], [2,3,2,1], [2,4,1,1], [2,7,1], [3,5,1,1], [3,8,1], [4,6,2,1],
      [4,9,1], [5,10,1], [6,11,1],
    ],
  },
  {
    id: 'metanol',
    category: 'Alkol, Eter ve Karbonil',
    name: "Metanol",
    nameEn: "Methanol",
    description: "CH₄O — En basit alkoldür ve odun alkolü olarak da bilinir; zehirlidir. Hidroksil grubu sayesinde hidrojen bağı kurar.",
    descriptionEn: "CH₄O — The simplest alcohol, also known as wood alcohol; it is toxic. Its hydroxyl group lets it form hydrogen bonds.",
    atoms: [
      ['O',0.9229,0.576,0.0007], ['C',-0.3712,0.0019,0], ['H',-0.4989,-0.6123,0.8948], ['H',-0.4988,-0.6101,-0.8962],
      ['H',-1.115,0.8022,0.0009], ['H',1.561,-0.1578,-0.0002],
    ],
    bonds: [
      [1,2,1], [1,6,1], [2,3,1], [2,4,1], [2,5,1],
    ],
  },
  {
    id: 'etanol',
    category: 'Alkol, Eter ve Karbonil',
    name: "Etanol",
    nameEn: "Ethanol",
    description: "C₂H₆O — Alkollü içeceklerdeki alkoldür. Hidrojen bağı yaptığı için kaynama noktası 78 °C'dir; benzer boyuttaki etan ise −89 °C'de kaynar.",
    descriptionEn: "C₂H₆O — The alcohol in alcoholic drinks. Because it hydrogen-bonds, it boils at 78 °C, whereas ethane of similar size boils at −89 °C.",
    atoms: [
      ['O',-1.4437,-0.4036,0.468], ['C',-0.4699,0.5141,-0.0066], ['C',0.887,-0.1569,0.0054], ['H',-0.7456,0.8333,-1.016],
      ['H',-0.4736,1.3894,0.6493], ['H',1.6645,0.5308,-0.339], ['H',1.1398,-0.4994,1.0143], ['H',0.8886,-1.0411,-0.6406],
      ['H',-1.447,-1.1667,-0.1348],
    ],
    bonds: [
      [1,2,1], [1,9,1], [2,3,1], [2,4,1], [2,5,1], [3,6,1], [3,7,1], [3,8,1],
    ],
  },
  {
    id: 'gliserol',
    category: 'Alkol, Eter ve Karbonil',
    name: "Gliserol (gliserin)",
    nameEn: "Glycerol (glycerin)",
    description: "C₃H₈O₃ — Üç hidroksil grubu taşıyan, renksiz ve viskoz bir sıvıdır. Yağların ve yağ asidi trigliseritlerinin omurgasını oluşturur.",
    descriptionEn: "C₃H₈O₃ — A colourless, viscous liquid with three hydroxyl groups. It forms the backbone of fats and fatty-acid triglycerides.",
    atoms: [
      ['O',-0.2866,1.5335,-0.1297], ['O',-2.4646,-0.1599,-0.4067], ['O',2.3055,0.4693,-0.4736], ['C',-0.0874,0.1567,-0.4584],
      ['C',-1.2401,-0.6405,0.1377], ['C',1.2538,-0.2929,0.1097], ['H',-0.0911,0.0982,-1.5519], ['H',-1.294,-0.5258,1.2255],
      ['H',-1.1519,-1.7045,-0.1007], ['H',1.4331,-1.3511,-0.1054], ['H',1.2945,-0.1342,1.1926], ['H',-0.282,1.6147,0.8394],
      ['H',-2.5271,0.7868,-0.1927], ['H',3.1379,0.1494,-0.0858],
    ],
    bonds: [
      [1,4,1], [1,12,1], [2,5,1], [2,13,1], [3,6,1], [3,14,1], [4,5,1], [4,6,1],
      [4,7,1], [5,8,1], [5,9,1], [6,10,1], [6,11,1],
    ],
  },
  {
    id: 'formaldehit',
    category: 'Alkol, Eter ve Karbonil',
    name: "Formaldehit",
    nameEn: "Formaldehyde",
    description: "CH₂O — Düzlemsel yapıdaki en basit aldehittir. Sulu çözeltisi formalin adıyla bilinir ve örnek saklamada kullanılır.",
    descriptionEn: "CH₂O — The simplest aldehyde, with a planar structure. Its aqueous solution is known as formalin and is used to preserve specimens.",
    atoms: [
      ['O',1.2123,-0.0001,0], ['C',-0.0123,0,0], ['H',-0.6001,-0.9319,0], ['H',-0.5999,0.9319,0],
    ],
    bonds: [
      [1,2,2], [2,3,1], [2,4,1],
    ],
  },
  {
    id: 'aseton',
    category: 'Alkol, Eter ve Karbonil',
    name: "Aseton",
    nameEn: "Acetone",
    description: "C₃H₆O — En basit ketondur; kaynama noktası yaklaşık 56 °C olan, suyla her oranda karışabilen bir çözücüdür ve oje çıkarıcılarda kullanılır.",
    descriptionEn: "C₃H₆O — The simplest ketone: a solvent boiling at about 56 °C, miscible with water in all proportions, and used in nail-polish remover.",
    atoms: [
      ['O',-0.0001,1.8512,0], ['C',0,0.6213,0.0008], ['C',-1.2812,-0.1681,0], ['C',1.2811,-0.1681,-0.0001],
      ['H',-1.3282,-0.7891,-0.8979], ['H',-1.3263,-0.7939,0.8946], ['H',-2.1351,0.5149,0.0029], ['H',2.1352,0.515,0.0029],
      ['H',1.3281,-0.7891,-0.8979], ['H',1.3263,-0.794,0.8946],
    ],
    bonds: [
      [1,2,2], [2,3,1], [2,4,1], [3,5,1], [3,6,1], [3,7,1], [4,8,1], [4,9,1],
      [4,10,1],
    ],
  },
  {
    id: 'asetik-asit',
    category: 'Alkol, Eter ve Karbonil',
    name: "Asetik asit",
    nameEn: "Acetic acid",
    description: "C₂H₄O₂ — Sirkenin ekşi tadını ve kokusunu veren karboksilik asittir. Saf (susuz) hali 16,6 °C'nin altında donar ve buzul asetik asit olarak adlandırılır.",
    descriptionEn: "C₂H₄O₂ — The carboxylic acid that gives vinegar its sour taste and smell. Pure (anhydrous) acid freezes below 16.6 °C and is called glacial acetic acid.",
    atoms: [
      ['O',1.3149,-0.7091,0.0003], ['O',0.8326,1.5188,-0.0001], ['C',-0.953,-0.1065,-0.0002], ['C',0.4709,0.3515,0.0008],
      ['H',-1.1544,-0.6899,-0.902], ['H',-1.1523,-0.7005,0.8953], ['H',-1.6139,0.7651,0.0062], ['H',2.2552,-0.4293,-0.0002],
    ],
    bonds: [
      [1,4,1], [1,8,1], [2,4,2], [3,4,1], [3,5,1], [3,6,1], [3,7,1],
    ],
  },
  {
    id: 'dietil-eter',
    category: 'Alkol, Eter ve Karbonil',
    name: "Dietil eter",
    nameEn: "Diethyl ether",
    description: "C₄H₁₀O — Çok uçucu ve yanıcı bir sıvıdır. Eter anestezisi 1846'da Boston'da W. T. G. Morton tarafından gösterilmiş ve cerrahide ilk yaygın genel anesteziklerden biri olmuştur.",
    descriptionEn: "C₄H₁₀O — A highly volatile, flammable liquid. Ether anaesthesia was demonstrated in Boston in 1846 by W. T. G. Morton and became one of the first widely used general anaesthetics.",
    atoms: [
      ['O',-0.0008,-0.3355,0], ['C',-1.1748,0.4628,0], ['C',1.1753,0.4634,0], ['C',-2.3873,-0.4434,0],
      ['C',2.3874,-0.4435,0], ['H',-1.1906,1.0997,0.8916], ['H',-1.1906,1.0994,-0.8916], ['H',1.1908,1.0998,-0.8918],
      ['H',1.1907,1.0998,0.8918], ['H',-3.3119,0.1405,0], ['H',-2.3814,-1.0957,-0.8796], ['H',-2.3815,-1.0956,0.8796],
      ['H',3.3125,0.1398,-0.0001], ['H',2.381,-1.0957,0.8797], ['H',2.3811,-1.0958,-0.8795],
    ],
    bonds: [
      [1,2,1], [1,3,1], [2,4,1], [2,6,1], [2,7,1], [3,5,1], [3,8,1], [3,9,1],
      [4,10,1], [4,11,1], [4,12,1], [5,13,1], [5,14,1], [5,15,1],
    ],
  },
  {
    id: 'glikoz',
    category: 'Biyomoleküller',
    name: "Glikoz",
    nameEn: "Glucose",
    description: "C₆H₁₂O₆ — Hücrelerin başlıca enerji kaynağıdır ve hücresel solunumda CO₂ ve suya yıkılır. Sulu çözeltide ağırlıklı olarak altı üyeli piranoz halkası biçimindedir; burada halka biçimi gösterilir.",
    descriptionEn: "C₆H₁₂O₆ — The main energy source of cells, broken down to CO₂ and water in cellular respiration. In aqueous solution it exists mostly as a six-membered pyranose ring, which is the form shown here.",
    atoms: [
      ['O',0.529,-1.3106,0.1839], ['O',0.9168,2.3157,-0.1527], ['O',-1.8044,2.0169,0.7756], ['O',-2.9923,-0.4593,-0.2913],
      ['O',-1.3388,-2.7088,0.1716], ['O',3.2153,-1.229,-0.393], ['C',0.3665,1.102,0.3525], ['C',-1.1191,1.0342,-0.0024],
      ['C',1.123,-0.0852,-0.248], ['C',-1.6976,-0.3482,0.2995], ['C',-0.8141,-1.4575,-0.2712], ['C',2.5842,-0.1032,0.1893],
      ['H',0.48,1.1197,1.4434], ['H',-1.2849,1.3007,-1.0535], ['H',1.0977,-0.0542,-1.3458], ['H',-1.8314,-0.4666,1.3815],
      ['H',-0.8334,-1.4758,-1.3669], ['H',2.6764,-0.1939,1.2768], ['H',3.1153,0.7959,-0.1359], ['H',0.827,2.3059,-1.1209],
      ['H',-1.4052,2.88,0.5714], ['H',-2.895,-0.3501,-1.2528], ['H',-1.6494,-2.6074,1.0866], ['H',2.7346,-2.0213,-0.0979],
    ],
    bonds: [
      [1,9,1], [1,11,1], [2,7,1], [2,20,1], [3,8,1], [3,21,1], [4,10,1], [4,22,1],
      [5,11,1], [5,23,1], [6,12,1], [6,24,1], [7,8,1], [7,9,1], [7,13,1], [8,10,1],
      [8,14,1], [9,12,1], [9,15,1], [10,11,1], [10,16,1], [11,17,1], [12,18,1], [12,19,1],
    ],
  },
  {
    id: 'sukroz',
    category: 'Biyomoleküller',
    name: "Sakkaroz (sofra şekeri)",
    nameEn: "Sucrose (table sugar)",
    description: "C₁₂H₂₂O₁₁ — Bir glikoz ve bir fruktoz biriminin α(1→2)β glikozidik bağıyla bağlandığı disakkarittir; sofra şekeridir.",
    descriptionEn: "C₁₂H₂₂O₁₁ — A disaccharide in which a glucose and a fructose unit are joined by an α(1→2)β glycosidic bond; it is table sugar.",
    atoms: [
      ['O',1.5022,-0.0943,-0.9911], ['O',0.7011,0.617,1.0981], ['O',-0.8588,-0.4043,-0.3198], ['O',3.1624,1.6445,1.6958],
      ['O',4.7371,-0.674,0.3864], ['O',-1.0123,-1.0322,2.5058], ['O',-3.5317,1.3244,1.3669], ['O',-2.977,-2.2093,0.7501],
      ['O',1.8711,2.5588,-1.7519], ['O',1.4739,-2.7767,-1.8206], ['O',-3.8799,0.4306,-2.2034], ['C',1.5351,0.959,-0.0101],
      ['C',2.9902,1.0104,0.4441], ['C',3.3409,-0.4618,0.4826], ['C',2.6255,-0.9698,-0.764], ['C',-0.6719,0.5579,0.7161],
      ['C',-1.5011,0.1882,1.9477], ['C',-2.9815,0.0305,1.5933], ['C',-3.1816,-0.8498,0.3528], ['C',-2.2061,-0.5286,-0.7927],
      ['C',1.0597,2.2649,-0.6275], ['C',2.1313,-2.3991,-0.6222], ['C',-2.6137,0.6862,-1.6239], ['H',3.6347,1.5195,-0.2832],
      ['H',2.9813,-0.9296,1.4066], ['H',3.2646,-0.8944,-1.6527], ['H',-1.024,1.5454,0.4114], ['H',-1.3738,0.961,2.7155],
      ['H',-3.5071,-0.414,2.4474], ['H',-4.2187,-0.7781,0.0073], ['H',-2.1918,-1.3938,-1.468], ['H',1.1031,3.0921,0.0886],
      ['H',0.0517,2.2107,-1.0407], ['H',1.4104,-2.4957,0.1965], ['H',2.9596,-3.0918,-0.4475], ['H',-1.8852,0.8752,-2.4199],
      ['H',-2.6843,1.6034,-1.0353], ['H',4.0891,1.5181,1.9617], ['H',4.8835,-1.6334,0.3264], ['H',-0.0632,-0.9124,2.68],
      ['H',-4.476,1.2107,1.1652], ['H',-3.1835,-2.7732,-0.0148], ['H',1.5646,3.4072,-2.1148], ['H',0.7403,-2.1536,-1.9609],
      ['H',-3.7901,-0.3461,-2.7813],
    ],
    bonds: [
      [1,12,1], [1,15,1], [2,12,1], [2,16,1], [3,16,1], [3,20,1], [4,13,1], [4,38,1],
      [5,14,1], [5,39,1], [6,17,1], [6,40,1], [7,18,1], [7,41,1], [8,19,1], [8,42,1],
      [9,21,1], [9,43,1], [10,22,1], [10,44,1], [11,23,1], [11,45,1], [12,13,1], [12,21,1],
      [13,14,1], [13,24,1], [14,15,1], [14,25,1], [15,22,1], [15,26,1], [16,17,1], [16,27,1],
      [17,18,1], [17,28,1], [18,19,1], [18,29,1], [19,20,1], [19,30,1], [20,23,1], [20,31,1],
      [21,32,1], [21,33,1], [22,34,1], [22,35,1], [23,36,1], [23,37,1],
    ],
  },
  {
    id: 'glisin',
    category: 'Biyomoleküller',
    name: "Glisin",
    nameEn: "Glycine",
    description: "C₂H₅NO₂ — Yan zinciri yalnızca bir hidrojen olan en basit amino asittir ve proteinlerdeki standart amino asitler arasında kiral olmayan tek amino asittir. Burada nötr (zwitter iyon olmayan) biçimi gösterilir.",
    descriptionEn: "C₂H₅NO₂ — The simplest amino acid, with just a hydrogen as its side chain, and the only achiral one among the standard protein amino acids. The neutral (non-zwitterionic) form is shown.",
    atoms: [
      ['O',1.9643,0.338,0.004], ['O',0.6376,-1.5063,-0.0178], ['N',-1.6349,-0.0959,0.0108], ['C',-0.3989,0.6698,-0.0035],
      ['C',0.7602,-0.2879,-0.0199], ['H',-0.3404,1.2943,0.8921], ['H',-0.3613,1.2986,-0.8971], ['H',-1.6572,-0.7064,0.8266],
      ['H',-1.6781,-0.7032,-0.8066], ['H',2.7087,-0.3009,0.0114],
    ],
    bonds: [
      [1,5,1], [1,10,1], [2,5,2], [3,4,1], [3,8,1], [3,9,1], [4,5,1], [4,6,1],
      [4,7,1],
    ],
  },
  {
    id: 'alanin',
    category: 'Biyomoleküller',
    name: "L-Alanin",
    nameEn: "L-Alanine",
    description: "C₃H₇NO₂ — Yan zinciri bir metil grubu olan, proteinlerde bulunan 20 standart amino asitten biridir. Burada nötr (zwitter iyon olmayan) biçimi gösterilir.",
    descriptionEn: "C₃H₇NO₂ — One of the 20 standard protein amino acids, with a methyl group as its side chain. The neutral (non-zwitterionic) form is shown.",
    atoms: [
      ['O',2.0812,0.4448,-0.2843], ['O',1.5087,-1.5649,0.608], ['N',-1.089,-1.2821,-0.161], ['C',-0.1913,-0.1684,-0.4609],
      ['C',-0.6898,1.0939,0.2295], ['C',1.1939,-0.5367,0.0261], ['H',-0.1511,-0.0328,-1.5468], ['H',-0.0613,1.9545,-0.0249],
      ['H',-1.7143,1.3337,-0.076], ['H',-0.6734,0.9906,1.3207], ['H',-2.0265,-1.0633,-0.4969], ['H',-1.1758,-1.3953,0.8488],
      ['H',2.9886,0.2259,0.0177],
    ],
    bonds: [
      [1,6,1], [1,13,1], [2,6,2], [3,4,1], [3,11,1], [3,12,1], [4,5,1], [4,6,1],
      [4,7,1], [5,8,1], [5,9,1], [5,10,1],
    ],
  },
  {
    id: 'ure',
    category: 'Biyomoleküller',
    name: "Üre",
    nameEn: "Urea",
    description: "CH₄N₂O — Bir karbonil grubuna bağlı iki NH₂ grubu içerir. Friedrich Wöhler 1828'de onu amonyum siyanattan sentezleyerek bir organik bileşiğin inorganik maddeden elde edilebileceğini göstermiştir.",
    descriptionEn: "CH₄N₂O — Contains two NH₂ groups on a carbonyl group. In 1828 Friedrich Wöhler synthesised it from ammonium cyanate, showing that an organic compound can be made from inorganic material.",
    atoms: [
      ['O',0,1.7948,0], ['N',1.1484,-0.1989,-0.0001], ['N',-1.1484,-0.1989,-0.0001], ['C',0.0001,0.5655,0.0003],
      ['H',1.1122,-1.2127,0.0001], ['H',2.0671,0.2315,-0.0001], ['H',-2.067,0.2315,-0.0001], ['H',-1.1123,-1.2127,0],
    ],
    bonds: [
      [1,4,2], [2,4,1], [2,5,1], [2,6,1], [3,4,1], [3,7,1], [3,8,1],
    ],
  },
  {
    id: 'adenin',
    category: 'Biyomoleküller',
    name: "Adenin",
    nameEn: "Adenine",
    description: "C₅H₅N₅ — Bir pirimidin ve bir imidazol halkasının kaynaşmasından oluşan purin bazıdır. DNA'da timinle, RNA'da urasille eşleşir ve ATP'nin bir parçasıdır.",
    descriptionEn: "C₅H₅N₅ — A purine base made of a fused pyrimidine and imidazole ring. It pairs with thymine in DNA and with uracil in RNA, and is part of ATP.",
    atoms: [
      ['N',1.4983,0.6908,0], ['N',1.8945,-1.5028,0.0001], ['N',-0.4314,-2.2105,0], ['N',-2.0251,-0.3634,-0.0001],
      ['N',-1.3196,1.9279,-0.0002], ['C',0.2705,0.0924,0.0001], ['C',0.5429,-1.2691,0.0001], ['C',-1.0313,0.5531,-0.0001],
      ['C',2.4392,-0.3049,0], ['C',-1.6689,-1.6702,0], ['H',1.6828,1.6853,-0.0003], ['H',3.4981,-0.089,0],
      ['H',-2.4906,-2.3784,-0.0001], ['H',-2.2851,2.228,0.0001], ['H',-0.5744,2.6109,0.0002],
    ],
    bonds: [
      [1,6,1,1], [1,9,1,1], [1,11,1], [2,7,1,1], [2,9,2,1], [3,7,2,1], [3,10,1,1], [4,8,1,1],
      [4,10,2,1], [5,8,1], [5,14,1], [5,15,1], [6,7,1,1], [6,8,2,1], [9,12,1], [10,13,1],
    ],
  },
  {
    id: 'askorbik-asit',
    category: 'Biyomoleküller',
    name: "Askorbik asit (C vitamini)",
    nameEn: "Ascorbic acid (vitamin C)",
    description: "C₆H₈O₆ — C vitamini olan, suda çözünen bir antioksidandır; insanlar onu sentezleyemez ve kollajen sentezi için gereklidir. Eksikliği skorbüte yol açar.",
    descriptionEn: "C₆H₈O₆ — Vitamin C, a water-soluble antioxidant. Humans cannot synthesise it and need it for collagen formation; deficiency causes scurvy.",
    atoms: [
      ['O',-0.4721,-1.0609,-0.8064], ['O',0.7152,-0.2352,1.5445], ['O',-1.492,2.2396,0.1831], ['O',3.3523,-0.1649,0.6867],
      ['O',-3.6007,0.1583,0.4878], ['O',-2.3448,-2.3511,-0.4259], ['C',-0.1288,0.3284,-0.6288], ['C',1.0535,0.42,0.3227],
      ['C',-1.3761,0.9095,-0.0945], ['C',2.2897,-0.2571,-0.2562], ['C',-2.3302,-0.0063,0.0395], ['C',-1.7635,-1.2805,-0.4075],
      ['H',0.1133,0.7526,-1.6097], ['H',1.2861,1.4611,0.5725], ['H',2.1159,-1.3218,-0.4433], ['H',2.6036,0.2262,-1.1865],
      ['H',0.5393,-1.1706,1.3447], ['H',-0.653,2.665,-0.0641], ['H',4.1254,-0.5995,0.2879], ['H',-4.0331,-0.7126,0.4534],
    ],
    bonds: [
      [1,7,1], [1,12,1], [2,8,1], [2,17,1], [3,9,1], [3,18,1], [4,10,1], [4,19,1],
      [5,11,1], [5,20,1], [6,12,2], [7,8,1], [7,9,1], [7,13,1], [8,10,1], [8,14,1],
      [9,11,2], [10,15,1], [10,16,1], [11,12,1],
    ],
  },
  {
    id: 'kolesterol',
    category: 'Biyomoleküller',
    name: "Kolesterol",
    nameEn: "Cholesterol",
    description: "C₂₇H₄₆O — Dört kaynaşmış halkadan oluşan steroid iskeleti taşır. Hayvan hücre zarlarının bir bileşenidir ve steroid hormonların öncüsüdür.",
    descriptionEn: "C₂₇H₄₆O — Has a steroid skeleton of four fused rings. It is a component of animal cell membranes and the precursor of steroid hormones.",
    atoms: [
      ['O',-7.9028,1.7944,0.6951], ['C',0.296,-1.1207,-0.1501], ['C',-0.3752,-0.155,-1.1469], ['C',-1.9052,-0.2275,-1.1238],
      ['C',-2.4187,0.0854,0.3119], ['C',1.7795,-0.8299,-0.4837], ['C',-0.1396,-0.7027,1.2613], ['C',-3.9945,-0.0148,0.3976],
      ['C',0.3538,-0.4246,-2.4598], ['C',-1.6711,-0.7241,1.4072], ['C',1.7973,-0.7441,-2.0282], ['C',-2.512,0.7621,-2.1296],
      ['C',2.8059,-1.8096,0.0667], ['C',-0.0481,-2.6121,-0.3881], ['C',-4.6516,0.672,-0.808], ['C',-4.4583,0.6958,1.7043],
      ['C',-3.9686,1.0196,-1.9126], ['C',-4.4642,-1.4894,0.4219], ['C',-6.1316,0.9633,-0.7142], ['C',-5.9668,0.921,1.7972],
      ['C',4.255,-1.4255,-0.2996], ['C',-6.4875,1.6831,0.5838], ['C',2.6788,-1.9018,1.5926], ['C',4.7145,-0.031,0.1463],
      ['C',6.1341,0.3197,-0.3112], ['C',6.6208,1.6909,0.1972], ['C',6.5812,1.7995,1.7224], ['C',5.7689,2.8037,-0.4193],
      ['H',-0.1079,0.8759,-0.8585], ['H',-2.2251,-1.2339,-1.4162], ['H',-2.1552,1.1393,0.5004], ['H',2.0002,0.1745,-0.0971],
      ['H',0.2208,0.309,1.4877], ['H',0.251,-1.3563,2.0412], ['H',0.3215,0.4394,-3.1313], ['H',-0.0825,-1.2761,-2.9937],
      ['H',-2.001,-1.767,1.4062], ['H',-1.9222,-0.3244,2.3963], ['H',2.1191,-1.6831,-2.4927], ['H',2.4858,0.0403,-2.3621],
      ['H',-2.3713,0.3715,-3.1448], ['H',-1.9902,1.7263,-2.0866], ['H',2.6386,-2.812,-0.347], ['H',0.3827,-3.2549,0.3852],
      ['H',-1.1249,-2.8011,-0.3771], ['H',0.3212,-2.976,-1.3523], ['H',-3.967,1.6753,1.7837], ['H',-4.1437,0.1211,2.5835],
      ['H',-4.4851,1.5233,-2.7261], ['H',-4.1544,-1.9976,1.3408], ['H',-5.5547,-1.58,0.3789], ['H',-4.0672,-2.0565,-0.4264],
      ['H',-6.4778,1.5699,-1.5611], ['H',-6.6979,0.0265,-0.7895], ['H',-6.4949,-0.035,1.9], ['H',-6.2021,1.4816,2.7105],
      ['H',4.9399,-2.1734,0.1214], ['H',4.3757,-1.4997,-1.3878], ['H',-6.0712,2.6979,0.5809], ['H',2.549,-0.9223,2.0633],
      ['H',3.5839,-2.3455,2.0253], ['H',1.8702,-2.5711,1.892], ['H',4.0293,0.7191,-0.2555], ['H',4.6497,0.0176,1.2372],
      ['H',-8.2198,2.2853,-0.0822], ['H',6.1835,0.2944,-1.4069], ['H',6.8246,-0.4529,0.0499], ['H',7.658,1.8224,-0.1352],
      ['H',7.1017,0.9557,2.1869], ['H',7.0824,2.7181,2.0476], ['H',5.5597,1.8345,2.1135], ['H',5.7285,2.7109,-1.5096],
      ['H',6.2049,3.7822,-0.1884], ['H',4.7443,2.8087,-0.0346],
    ],
    bonds: [
      [1,22,1], [1,65,1], [2,3,1], [2,6,1], [2,7,1], [2,14,1], [3,4,1], [3,9,1],
      [3,29,1], [4,5,1], [4,12,1], [4,30,1], [5,8,1], [5,10,1], [5,31,1], [6,11,1],
      [6,13,1], [6,32,1], [7,10,1], [7,33,1], [7,34,1], [8,15,1], [8,16,1], [8,18,1],
      [9,11,1], [9,35,1], [9,36,1], [10,37,1], [10,38,1], [11,39,1], [11,40,1], [12,17,1],
      [12,41,1], [12,42,1], [13,21,1], [13,23,1], [13,43,1], [14,44,1], [14,45,1], [14,46,1],
      [15,17,2], [15,19,1], [16,20,1], [16,47,1], [16,48,1], [17,49,1], [18,50,1], [18,51,1],
      [18,52,1], [19,22,1], [19,53,1], [19,54,1], [20,22,1], [20,55,1], [20,56,1], [21,24,1],
      [21,57,1], [21,58,1], [22,59,1], [23,60,1], [23,61,1], [23,62,1], [24,25,1], [24,63,1],
      [24,64,1], [25,26,1], [25,66,1], [25,67,1], [26,27,1], [26,28,1], [26,68,1], [27,69,1],
      [27,70,1], [27,71,1], [28,72,1], [28,73,1], [28,74,1],
    ],
  },
  {
    id: 'vitamin-e',
    category: 'Biyomoleküller',
    name: "α-Tokoferol (E vitamini)",
    nameEn: "α-Tocopherol (vitamin E)",
    description: "C₂₉H₅₀O₂ — Yağda çözünen antioksidan bir vitamindir; fenolik hidroksil taşıyan kromanol halkası ve uzun doymuş fitil yan zincirinden oluşur.",
    descriptionEn: "C₂₉H₅₀O₂ — A fat-soluble antioxidant vitamin made of a chromanol ring bearing a phenolic hydroxyl and a long saturated phytyl side chain.",
    atoms: [
      ['O',1.119,1.5097,0.2498], ['O',5.6327,-1.2604,1.8191], ['C',1.2013,2.511,-0.782], ['C',-0.2236,2.6625,-1.3344],
      ['C',2.1323,2.0761,-1.9254], ['C',-1.2657,2.6443,-0.2146], ['C',-3.7947,2.7449,0.292], ['C',-2.6802,2.8294,-0.775],
      ['C',3.5316,1.7636,-1.4142], ['C',-3.8172,1.3674,0.9885], ['C',1.6231,3.8453,-0.1482], ['C',3.4533,0.9199,-0.1766],
      ['C',-4.0238,0.1919,0.0268], ['C',2.2745,0.8499,0.5751], ['C',-4.0655,-1.1734,0.7279], ['C',-4.2044,-2.4137,-0.1855],
      ['C',-3.6079,3.8892,1.2952], ['C',-3.1102,-2.4465,-1.2731], ['C',4.5834,0.213,0.2567], ['C',2.2198,0.0552,1.7238],
      ['C',-1.6631,-2.4926,-0.7651], ['C',3.3461,-0.6536,2.1399], ['C',-4.1703,-3.6737,0.689], ['C',4.5286,-0.5719,1.4087],
      ['C',-0.5794,-2.4684,-1.85], ['C',0.8744,-2.4325,-1.3414], ['C',5.8677,0.281,-0.5107], ['C',0.948,-0.0435,2.5076],
      ['C',3.2902,-1.5058,3.3678], ['C',1.8898,-2.3506,-2.4815], ['C',1.1543,-3.6726,-0.4888], ['H',-0.3131,3.572,-1.941],
      ['H',-0.4505,1.818,-1.9992], ['H',2.1815,2.8403,-2.71], ['H',1.7325,1.1634,-2.3891], ['H',-1.0541,3.4347,0.5095],
      ['H',-1.2179,1.687,0.3108], ['H',-4.7561,2.8939,-0.2162], ['H',-2.8667,2.1032,-1.5739], ['H',-2.7373,3.8122,-1.2622],
      ['H',4.0714,2.6906,-1.1901], ['H',4.0713,1.2442,-2.214], ['H',-4.6408,1.3661,1.7147], ['H',-2.9058,1.212,1.5771],
      ['H',1.6138,4.6582,-0.8819], ['H',0.9773,4.1241,0.6901], ['H',2.6305,3.7893,0.2774], ['H',-3.2012,0.1834,-0.6918],
      ['H',-4.951,0.336,-0.5403], ['H',-3.1698,-1.2736,1.3543], ['H',-4.9123,-1.1681,1.4275], ['H',-5.1783,-2.3691,-0.689],
      ['H',-2.7322,3.741,1.9345], ['H',-4.48,3.9507,1.9558], ['H',-3.511,4.854,0.7865], ['H',-3.278,-3.3327,-1.8998],
      ['H',-3.2321,-1.5919,-1.9485], ['H',-1.4801,-1.6446,-0.0959], ['H',-1.5412,-3.4007,-0.1668], ['H',-5.0278,-3.6876,1.3708],
      ['H',-4.2234,-4.576,0.0709], ['H',-3.2635,-3.7287,1.2995], ['H',-0.7162,-3.3389,-2.5044], ['H',-0.7449,-1.5842,-2.4793],
      ['H',0.9998,-1.5446,-0.7121], ['H',6.1083,1.3142,-0.7831], ['H',6.7276,-0.0815,0.061], ['H',5.7934,-0.3238,-1.4206],
      ['H',0.6675,-1.0917,2.6603], ['H',0.0899,0.4165,2.0091], ['H',1.0585,0.4554,3.4762], ['H',3.2099,-2.5616,3.0882],
      ['H',4.1855,-1.364,3.9839], ['H',2.4584,-1.271,4.0364], ['H',1.8254,-3.2275,-3.1344], ['H',2.9111,-2.2894,-2.0912],
      ['H',1.7117,-1.4594,-3.0923], ['H',0.9291,-4.5947,-1.035], ['H',0.5698,-3.6657,0.4361], ['H',2.2092,-3.7063,-0.1937],
      ['H',5.3877,-1.9782,2.4239],
    ],
    bonds: [
      [1,3,1], [1,14,1], [2,24,1], [2,81,1], [3,4,1], [3,5,1], [3,11,1], [4,6,1],
      [4,32,1], [4,33,1], [5,9,1], [5,34,1], [5,35,1], [6,8,1], [6,36,1], [6,37,1],
      [7,8,1], [7,10,1], [7,17,1], [7,38,1], [8,39,1], [8,40,1], [9,12,1], [9,41,1],
      [9,42,1], [10,13,1], [10,43,1], [10,44,1], [11,45,1], [11,46,1], [11,47,1], [12,14,1,1],
      [12,19,2,1], [13,15,1], [13,48,1], [13,49,1], [14,20,2,1], [15,16,1], [15,50,1], [15,51,1],
      [16,18,1], [16,23,1], [16,52,1], [17,53,1], [17,54,1], [17,55,1], [18,21,1], [18,56,1],
      [18,57,1], [19,24,1,1], [19,27,1], [20,22,1,1], [20,28,1], [21,25,1], [21,58,1], [21,59,1],
      [22,24,2,1], [22,29,1], [23,60,1], [23,61,1], [23,62,1], [25,26,1], [25,63,1], [25,64,1],
      [26,30,1], [26,31,1], [26,65,1], [27,66,1], [27,67,1], [27,68,1], [28,69,1], [28,70,1],
      [28,71,1], [29,72,1], [29,73,1], [29,74,1], [30,75,1], [30,76,1], [30,77,1], [31,78,1],
      [31,79,1], [31,80,1],
    ],
  },
  {
    id: 'tristearin',
    category: 'Biyomoleküller',
    name: "Tristearin",
    nameEn: "Tristearin",
    description: "C₅₇H₁₁₀O₆ — Gliserolün üç stearik asit (C18, doymuş) ile esterleşmesinden oluşan bir trigliseriddir; hayvansal yağlarda ve kakao yağında bulunur. Burada uzamış zincir konformasyonu gösterilir.",
    descriptionEn: "C₅₇H₁₁₀O₆ — A triglyceride formed by esterifying glycerol with three stearic acid (C18, saturated) chains, found in animal fats and cocoa butter. An extended-chain conformation is shown.",
    atoms: [
      ['C',-1.9996,-4.725,-0.1266], ['C',-3.3129,-4.0854,0.2419], ['C',-4.4608,-5.025,-0.1327], ['C',-5.7951,-4.3753,0.2419],
      ['C',-6.943,-5.3149,-0.1327], ['C',-8.2763,-4.6661,0.2409], ['C',-9.4242,-5.6057,-0.1327], ['C',-10.7575,-4.957,0.2409],
      ['C',-11.9055,-5.8956,-0.1337], ['O',-1.9832,-5.8191,-0.6378], ['C',0.7156,-1.4942,-0.0419], ['C',0.5627,-0.1941,-0.7864],
      ['C',-0.2761,0.7757,0.0467], ['C',-0.4299,2.0968,-0.7077], ['C',-1.2698,3.0666,0.1254], ['C',-1.4246,4.3877,-0.629],
      ['C',-2.2644,5.3575,0.2041], ['C',-2.4192,6.6786,-0.5513], ['C',-3.2591,7.6475,0.2818], ['C',-3.4129,8.9696,-0.4726],
      ['C',-4.2527,9.9384,0.3605], ['C',-4.4075,11.2595,-0.3949], ['C',-5.2474,12.2293,0.4392], ['C',-5.4022,13.5504,-0.3162],
      ['O',0.2043,-1.6322,1.0439], ['O',-0.8479,-4.0782,0.1114], ['C',0.4175,-4.6936,-0.2431], ['C',1.5645,-3.754,0.1315],
      ['O',1.4184,-2.5,-0.5851], ['C',2.8987,-4.4037,-0.2431], ['O',3.9875,-3.5119,0.1124], ['C',5.2579,-3.8756,-0.1256],
      ['C',6.3888,-2.9499,0.244], ['C',7.7221,-3.5986,-0.1306], ['C',8.87,-2.659,0.244], ['C',10.2033,-3.3087,-0.1296],
      ['C',11.3512,-2.3691,0.244], ['C',12.6855,-3.0178,-0.1296], ['C',13.8334,-2.0782,0.245], ['C',15.1667,-2.7279,-0.1296],
      ['C',16.3146,-1.7883,0.245], ['C',17.6479,-2.4371,-0.1286], ['C',18.7958,-1.4975,0.246], ['C',20.1301,-2.1472,-0.1286],
      ['C',21.278,-1.2076,0.246], ['O',5.4945,-4.9446,-0.6357], ['C',-13.2397,-5.2469,0.2409], ['C',-14.3877,-6.1865,-0.1337],
      ['C',-15.7209,-5.5378,0.2399], ['C',-16.8689,-6.4764,-0.1347], ['C',-18.2021,-5.8277,0.2398], ['C',-19.3501,-6.7673,-0.1347],
      ['C',-20.6843,-6.1186,0.2398], ['C',-21.8323,-7.0582,-0.1347], ['C',-23.1655,-6.4085,0.2388], ['C',-6.2411,14.5202,0.5169],
      ['C',-6.3958,15.8413,-0.2375], ['C',-7.2357,16.8111,0.5956], ['C',-7.3905,18.1323,-0.1598], ['C',22.6113,-1.8563,-0.1285],
      ['C',23.7592,-0.9167,0.246], ['C',25.0925,-1.5664,-0.1275], ['C',26.2404,-0.6268,0.247], ['H',-3.4232,-3.1439,-0.2952],
      ['H',-3.3359,-3.8954,1.3153], ['H',-4.3506,-5.9665,0.4055], ['H',-4.4389,-5.215,-1.205], ['H',-5.9044,-3.4348,-0.2962],
      ['H',-5.8171,-4.1853,1.3143], ['H',-6.8328,-6.2564,0.4045], ['H',-6.9201,-5.5059,-1.2061], ['H',-8.3866,-3.7246,-0.2962],
      ['H',-8.2993,-4.4761,1.3143], ['H',-9.314,-6.5473,0.4045], ['H',-9.4013,-5.7957,-1.2061], ['H',-10.8678,-4.0155,-0.2963],
      ['H',-10.7805,-4.766,1.3143], ['H',-11.7952,-6.8371,0.4044], ['H',-11.8835,-6.0866,-1.2061], ['H',1.5475,0.2392,-0.9657],
      ['H',0.0678,-0.3762,-1.7396], ['H',-1.2599,0.3423,0.2261], ['H',0.2188,0.9578,1.001], ['H',0.5528,2.5301,-0.887],
      ['H',-0.9259,1.9147,-1.6609], ['H',-2.2545,2.6333,0.3048], ['H',-0.7748,3.2487,1.0787], ['H',-0.4408,4.8211,-0.8083],
      ['H',-1.9205,4.2046,-1.5832], ['H',-3.2482,4.9242,0.3835], ['H',-1.7685,5.5396,1.1574], ['H',-1.4345,7.112,-0.7306],
      ['H',-2.9152,6.4955,-1.5045], ['H',-4.2428,7.2151,0.4612], ['H',-2.7631,7.8306,1.2351], ['H',-2.4292,9.4019,-0.6519],
      ['H',-3.9089,8.7864,-1.4258], ['H',-5.2375,9.505,0.5399], ['H',-3.7568,10.1215,1.3138], ['H',-3.4238,11.6928,-0.5742],
      ['H',-4.9035,11.0774,-1.3481], ['H',-6.2311,11.796,0.6186], ['H',-4.7514,12.4124,1.3925], ['H',-4.4175,13.9838,-0.4956],
      ['H',-5.8972,13.3683,-1.2694], ['H',0.5268,-5.6351,0.294], ['H',0.4395,-4.8846,-1.3165], ['H',1.5425,-3.564,1.2038],
      ['H',3.009,-5.3453,0.294], ['H',2.9207,-4.5937,-1.3165], ['H',6.2785,-2.0084,-0.2942], ['H',6.3658,-2.7589,1.3163],
      ['H',7.8324,-4.5401,0.4075], ['H',7.745,-3.7896,-1.203], ['H',8.7597,-1.7185,-0.2932], ['H',8.847,-2.469,1.3173],
      ['H',10.3136,-4.2502,0.4075], ['H',10.2263,-3.4987,-1.203], ['H',11.2409,-1.4276,-0.2932], ['H',11.3292,-2.1781,1.3174],
      ['H',12.7958,-3.9593,0.4076], ['H',12.7075,-3.2088,-1.203], ['H',13.7231,-1.1377,-0.2931], ['H',13.8104,-1.8882,1.3174],
      ['H',15.277,-3.6685,0.4086], ['H',15.1897,-2.9179,-1.202], ['H',16.2043,-0.8468,-0.2921], ['H',16.2916,-1.5973,1.3184],
      ['H',17.7582,-3.3786,0.4086], ['H',17.6709,-2.6281,-1.2019], ['H',18.6855,-0.5559,-0.2921], ['H',18.7738,-1.3075,1.3184],
      ['H',20.2404,-3.0877,0.4096], ['H',20.1521,-2.3372,-1.2019], ['H',21.1677,-0.2671,-0.2911], ['H',21.255,-1.0166,1.3194],
      ['H',-13.35,-4.3054,-0.2973], ['H',-13.2617,-5.0569,1.3132], ['H',-14.2774,-7.128,0.4034], ['H',-14.3647,-6.3765,-1.2071],
      ['H',-15.8312,-4.5963,-0.2973], ['H',-15.7439,-5.3468,1.3132], ['H',-16.7586,-7.4179,0.4034], ['H',-16.8459,-6.6674,-1.2071],
      ['H',-18.3124,-4.8862,-0.2973], ['H',-18.2251,-5.6377,1.3132], ['H',-19.2398,-7.7088,0.4024], ['H',-19.3281,-6.9573,-1.2081],
      ['H',-20.7946,-5.1771,-0.2983], ['H',-20.7063,-5.9276,1.3122], ['H',-21.722,-7.9987,0.4024], ['H',-21.8093,-7.2482,-1.2081],
      ['H',-23.9833,-7.0776,-0.0273], ['H',-23.1885,-6.2185,1.3122], ['H',-23.2758,-5.467,-0.2983], ['H',-7.2258,14.0869,0.6963],
      ['H',-5.7461,14.7023,1.4702], ['H',-5.4121,16.2747,-0.4169], ['H',-6.8918,15.6592,-1.1907], ['H',-8.2194,16.3778,0.775],
      ['H',-6.7397,16.9933,1.5488], ['H',-7.9886,18.8225,0.4337], ['H',-6.4068,18.5656,-0.3392], ['H',-7.8865,17.9501,-1.113],
      ['H',22.7216,-2.7978,0.4096], ['H',22.6343,-2.0473,-1.2009], ['H',23.6489,0.0238,-0.2911], ['H',23.7362,-0.7267,1.3194],
      ['H',25.2028,-2.5069,0.4096], ['H',25.1155,-1.7564,-1.2009], ['H',27.1905,-1.0892,-0.0191], ['H',26.1311,0.3137,-0.2911],
      ['H',26.2184,-0.4368,1.3194],
    ],
    bonds: [
      [1,2,1], [1,10,2], [1,26,1], [2,3,1], [2,64,1], [2,65,1], [3,4,1], [3,66,1],
      [3,67,1], [4,5,1], [4,68,1], [4,69,1], [5,6,1], [5,70,1], [5,71,1], [6,7,1],
      [6,72,1], [6,73,1], [7,8,1], [7,74,1], [7,75,1], [8,9,1], [8,76,1], [8,77,1],
      [9,47,1], [9,78,1], [9,79,1], [11,12,1], [11,25,2], [11,29,1], [12,13,1], [12,80,1],
      [12,81,1], [13,14,1], [13,82,1], [13,83,1], [14,15,1], [14,84,1], [14,85,1], [15,16,1],
      [15,86,1], [15,87,1], [16,17,1], [16,88,1], [16,89,1], [17,18,1], [17,90,1], [17,91,1],
      [18,19,1], [18,92,1], [18,93,1], [19,20,1], [19,94,1], [19,95,1], [20,21,1], [20,96,1],
      [20,97,1], [21,22,1], [21,98,1], [21,99,1], [22,23,1], [22,100,1], [22,101,1], [23,24,1],
      [23,102,1], [23,103,1], [24,56,1], [24,104,1], [24,105,1], [26,27,1], [27,28,1], [27,106,1],
      [27,107,1], [28,29,1], [28,30,1], [28,108,1], [30,31,1], [30,109,1], [30,110,1], [31,32,1],
      [32,33,1], [32,46,2], [33,34,1], [33,111,1], [33,112,1], [34,35,1], [34,113,1], [34,114,1],
      [35,36,1], [35,115,1], [35,116,1], [36,37,1], [36,117,1], [36,118,1], [37,38,1], [37,119,1],
      [37,120,1], [38,39,1], [38,121,1], [38,122,1], [39,40,1], [39,123,1], [39,124,1], [40,41,1],
      [40,125,1], [40,126,1], [41,42,1], [41,127,1], [41,128,1], [42,43,1], [42,129,1], [42,130,1],
      [43,44,1], [43,131,1], [43,132,1], [44,45,1], [44,133,1], [44,134,1], [45,60,1], [45,135,1],
      [45,136,1], [47,48,1], [47,137,1], [47,138,1], [48,49,1], [48,139,1], [48,140,1], [49,50,1],
      [49,141,1], [49,142,1], [50,51,1], [50,143,1], [50,144,1], [51,52,1], [51,145,1], [51,146,1],
      [52,53,1], [52,147,1], [52,148,1], [53,54,1], [53,149,1], [53,150,1], [54,55,1], [54,151,1],
      [54,152,1], [55,153,1], [55,154,1], [55,155,1], [56,57,1], [56,156,1], [56,157,1], [57,58,1],
      [57,158,1], [57,159,1], [58,59,1], [58,160,1], [58,161,1], [59,162,1], [59,163,1], [59,164,1],
      [60,61,1], [60,165,1], [60,166,1], [61,62,1], [61,167,1], [61,168,1], [62,63,1], [62,169,1],
      [62,170,1], [63,171,1], [63,172,1], [63,173,1],
    ],
  },
  {
    id: 'aspirin',
    category: 'İlaçlar ve Alkaloitler',
    name: "Aspirin (asetilsalisilik asit)",
    nameEn: "Aspirin (acetylsalicylic acid)",
    description: "C₉H₈O₄ — Salisilik asidin asetillenmiş türevidir. Siklooksijenaz (COX) enzimini asetilleyerek geri dönüşümsüz biçimde inhibe eder.",
    descriptionEn: "C₉H₈O₄ — The acetylated derivative of salicylic acid. It inhibits cyclooxygenase (COX) enzymes irreversibly by acetylating them.",
    atoms: [
      ['O',1.1788,-0.4626,-0.6814], ['O',-0.8501,2.9208,0.4046], ['O',0.7303,2.2477,-1.0698], ['O',1.6041,-0.4844,1.6204],
      ['C',-0.1563,-0.4983,-0.41], ['C',-0.8866,0.6796,-0.2512], ['C',-0.7924,-1.7343,-0.2929], ['C',-2.2527,0.6214,0.0246],
      ['C',-2.1585,-1.7925,-0.0172], ['C',-2.8886,-0.6146,0.1416], ['C',-0.2424,1.9802,-0.3707], ['C',1.9948,-0.4599,0.4609],
      ['C',3.4392,-0.4196,0.0583], ['H',-0.2306,-2.6561,-0.4165], ['H',-2.8523,1.5205,0.1403], ['H',-2.654,-2.7547,0.0729],
      ['H',-3.9529,-0.6602,0.3532], ['H',3.6804,-1.3018,-0.5397], ['H',4.0661,-0.4227,0.9546], ['H',3.6393,0.4949,-0.5054],
      ['H',-0.4155,3.7965,0.3234],
    ],
    bonds: [
      [1,5,1], [1,12,1], [2,11,1], [2,21,1], [3,11,2], [4,12,2], [5,6,1,1], [5,7,2,1],
      [6,8,2,1], [6,11,1], [7,9,1,1], [7,14,1], [8,10,1,1], [8,15,1], [9,10,2,1], [9,16,1],
      [10,17,1], [12,13,1], [13,18,1], [13,19,1], [13,20,1],
    ],
  },
  {
    id: 'parasetamol',
    category: 'İlaçlar ve Alkaloitler',
    name: "Parasetamol (asetaminofen)",
    nameEn: "Paracetamol (acetaminophen)",
    description: "C₈H₉NO₂ — Fenol halkasına bağlı bir amid grubu taşıyan, ağrı kesici ve ateş düşürücü bir ilaçtır; belirgin bir antiinflamatuvar etkisi yoktur.",
    descriptionEn: "C₈H₉NO₂ — An analgesic and antipyretic with an amide group on a phenol ring; it has no marked anti-inflammatory effect.",
    atoms: [
      ['O',-4.1946,-0.1069,0.0011], ['O',2.1003,-1.8083,-0.0027], ['N',1.3264,0.4189,-0.0001], ['C',-0.0625,0.2866,-0.0004],
      ['C',-0.6422,-0.982,-0.0001], ['C',-0.8714,1.423,-0.0005], ['C',-2.0308,-1.1142,-0.0003], ['C',-2.26,1.2906,-0.0005],
      ['C',-2.8396,0.0221,-0.0004], ['C',2.2921,-0.5965,0.0003], ['C',3.6924,-0.0364,0.0005], ['H',-0.0826,-1.9069,0.0003],
      ['H',-0.4334,2.4179,-0.0005], ['H',1.6714,1.3765,0.0002], ['H',-2.4714,-2.1079,0.0001], ['H',-2.8849,2.1796,-0.0003],
      ['H',3.8545,0.5532,-0.9061], ['H',4.4186,-0.8535,0.0281], ['H',3.8386,0.5971,0.8799], ['H',-4.421,-1.0529,0.0013],
    ],
    bonds: [
      [1,9,1], [1,20,1], [2,10,2], [3,4,1], [3,10,1], [3,14,1], [4,5,2,1], [4,6,1,1],
      [5,7,1,1], [5,12,1], [6,8,2,1], [6,13,1], [7,9,2,1], [7,15,1], [8,9,1,1], [8,16,1],
      [10,11,1], [11,17,1], [11,18,1], [11,19,1],
    ],
  },
  {
    id: 'ibuprofen',
    category: 'İlaçlar ve Alkaloitler',
    name: "İbuprofen",
    nameEn: "Ibuprofen",
    description: "C₁₃H₁₈O₂ — Propiyonik asit türevi, steroid olmayan bir antiinflamatuvar ilaçtır (NSAİİ). Bir kiral merkezi vardır ve genellikle rasemik karışım olarak kullanılır.",
    descriptionEn: "C₁₃H₁₈O₂ — A propionic-acid-derived non-steroidal anti-inflammatory drug (NSAID). It has one stereocentre and is usually used as a racemic mixture.",
    atoms: [
      ['O',4.7528,-0.8604,-1.45], ['O',2.6315,-1.6551,-1.5183], ['C',-3.4561,-0.0864,0.0205], ['C',-2.546,0.5625,1.0817],
      ['C',-1.077,0.5121,0.7389], ['C',1.6211,0.4201,0.1108], ['C',3.0729,0.3709,-0.2274], ['C',-3.256,0.5345,-1.3643],
      ['C',-3.184,-1.5912,-0.0453], ['C',-0.3198,-0.5724,1.1526], ['C',-0.5115,1.5516,0.0173], ['C',1.0379,-0.6186,0.8366],
      ['C',0.8463,1.5053,-0.2988], ['C',4.0012,0.3412,1.0039], ['C',3.433,-0.8166,-1.127], ['H',-4.4977,0.0664,0.3289],
      ['H',-2.7121,0.0883,2.0582], ['H',-2.8447,1.6105,1.2192], ['H',3.3284,1.2656,-0.8118], ['H',-2.2802,0.2946,-1.798],
      ['H',-3.3676,1.623,-1.3262], ['H',-4.0147,0.1527,-2.057], ['H',-3.939,-2.0786,-0.6727], ['H',-2.2089,-1.8251,-0.4836],
      ['H',-3.2418,-2.0488,0.9479], ['H',-0.7603,-1.384,1.7245], ['H',-1.1026,2.4049,-0.302], ['H',1.6248,-1.4715,1.1671],
      ['H',1.2847,2.3239,-0.8635], ['H',3.751,1.152,1.6969], ['H',3.9205,-0.6063,1.5483], ['H',5.0504,0.4643,0.7139],
      ['H',4.9635,-1.6294,-2.0213],
    ],
    bonds: [
      [1,15,1], [1,33,1], [2,15,2], [3,4,1], [3,8,1], [3,9,1], [3,16,1], [4,5,1],
      [4,17,1], [4,18,1], [5,10,2,1], [5,11,1,1], [6,7,1], [6,12,2,1], [6,13,1,1], [7,14,1],
      [7,15,1], [7,19,1], [8,20,1], [8,21,1], [8,22,1], [9,23,1], [9,24,1], [9,25,1],
      [10,12,1,1], [10,26,1], [11,13,2,1], [11,27,1], [12,28,1], [13,29,1], [14,30,1], [14,31,1],
      [14,32,1],
    ],
  },
  {
    id: 'kafein',
    category: 'İlaçlar ve Alkaloitler',
    name: "Kafein",
    nameEn: "Caffeine",
    description: "C₈H₁₀N₄O₂ — Kahve, çay ve kakaoda bulunan bir metilksantindir; adenozin reseptörlerini bloke ederek merkezi sinir sistemini uyarır. Molar kütlesi yaklaşık 194,19 g/mol'dür.",
    descriptionEn: "C₈H₁₀N₄O₂ — A methylxanthine found in coffee, tea and cocoa; it stimulates the central nervous system by blocking adenosine receptors. Its molar mass is about 194.19 g/mol.",
    atoms: [
      ['O',0.6863,-2.4644,-0.0003], ['O',-3.2251,0.1269,0.0008], ['N',-1.1773,1.2317,0.0004], ['N',2.1521,0.1435,0.0006],
      ['N',-1.2865,-1.1879,0.0005], ['N',1.1184,2.1187,0.0001], ['C',0.8135,-0.1259,0.0011], ['C',0.2045,1.0993,0.0008],
      ['C',0.1215,-1.3739,0.0009], ['C',-1.99,0.0706,0.0008], ['C',2.2854,1.508,0], ['C',-1.7881,2.5552,-0.0003],
      ['C',3.2395,-0.8057,-0.0001], ['C',-2.1058,-2.3955,-0.0003], ['H',3.2497,1.9978,-0.0005], ['H',-1.464,3.0961,0.8942],
      ['H',-2.8794,2.4964,-0.0006], ['H',-1.4636,3.0952,-0.8952], ['H',4.1921,-0.2698,0], ['H',3.1621,-1.4214,0.8994],
      ['H',3.1617,-1.4205,-0.9002], ['H',-1.5114,-3.3117,0.0006], ['H',-2.7467,-2.3816,-0.8877], ['H',-2.7491,-2.3813,0.8853],
    ],
    bonds: [
      [1,9,2], [2,10,2], [3,8,1], [3,10,1], [3,12,1], [4,7,1,1], [4,11,1,1], [4,13,1],
      [5,9,1], [5,10,1], [5,14,1], [6,8,1,1], [6,11,2,1], [7,8,2,1], [7,9,1], [11,15,1],
      [12,16,1], [12,17,1], [12,18,1], [13,19,1], [13,20,1], [13,21,1], [14,22,1], [14,23,1],
      [14,24,1],
    ],
  },
  {
    id: 'nikotin',
    category: 'İlaçlar ve Alkaloitler',
    name: "Nikotin",
    nameEn: "Nicotine",
    description: "C₁₀H₁₄N₂ — Tütün bitkisinde bulunan bir alkaloittir; bir piridin halkası ile bir N-metilpirolidin halkasından oluşur.",
    descriptionEn: "C₁₀H₁₄N₂ — An alkaloid found in the tobacco plant, made of a pyridine ring and an N-methylpyrrolidine ring.",
    atoms: [
      ['N',-1.2562,0.7422,-0.2007], ['N',2.6784,0.5167,-1.6267], ['C',-0.3657,-0.1931,0.515], ['C',-0.9485,-1.5885,0.2236],
      ['C',-2.1966,-1.3324,-0.6091], ['C',-2.5673,0.0964,-0.2663], ['C',1.0808,-0.063,0.0869], ['C',-1.3241,2.0589,0.42],
      ['C',2.1123,-0.3863,0.9573], ['C',1.4092,0.3796,-1.1818], ['C',3.4312,-0.2581,0.536], ['C',3.659,0.1934,-0.754],
      ['H',-0.4345,-0.0159,1.598], ['H',-1.23,-2.0731,1.1665], ['H',-0.2611,-2.2584,-0.3044], ['H',-1.9571,-1.42,-1.6763],
      ['H',-2.9985,-2.0406,-0.381], ['H',-3.2077,0.542,-1.0337], ['H',-3.0893,0.1315,0.6984], ['H',-1.9821,2.7173,-0.1578],
      ['H',-0.3375,2.5342,0.4369], ['H',-1.7013,2.0155,1.448], ['H',1.9029,-0.7398,1.9629], ['H',0.6595,0.6354,-1.9232],
      ['H',4.2547,-0.5044,1.1963], ['H',4.6696,0.3105,-1.131],
    ],
    bonds: [
      [1,3,1], [1,6,1], [1,8,1], [2,10,1,1], [2,12,2,1], [3,4,1], [3,7,1], [3,13,1],
      [4,5,1], [4,14,1], [4,15,1], [5,6,1], [5,16,1], [5,17,1], [6,18,1], [6,19,1],
      [7,9,1,1], [7,10,2,1], [8,20,1], [8,21,1], [8,22,1], [9,11,2,1], [9,23,1], [10,24,1],
      [11,12,1,1], [11,25,1], [12,26,1],
    ],
  },
  {
    id: 'morfin',
    category: 'İlaçlar ve Alkaloitler',
    name: "Morfin",
    nameEn: "Morphine",
    description: "C₁₇H₁₉NO₃ — Haşhaş bitkisinden (afyon) elde edilen, güçlü bir opioid ağrı kesicidir. Beş halkalı bir yapıya sahiptir ve 19. yüzyıl başında Friedrich Sertürner tarafından izole edilen ilk bitkisel alkaloit olarak bilinir.",
    descriptionEn: "C₁₇H₁₉NO₃ — A potent opioid analgesic obtained from the opium poppy. It has a five-ring structure and is known as the first plant alkaloid isolated, by Friedrich Sertürner in the early 19th century.",
    atoms: [
      ['O',-2.5015,-0.0717,1.1828], ['O',-3.7026,-1.708,-0.4601], ['O',-3.6041,2.5963,0.8723], ['N',2.6516,-0.6105,0.3618],
      ['C',-0.242,-0.7326,0.5586], ['C',0.5356,-1.3617,-0.6075], ['C',1.7977,-0.4697,-0.8425], ['C',-1.6809,-1.2363,0.8186],
      ['C',0.6351,-0.7503,1.826], ['C',-0.586,0.6731,0.1911], ['C',1.4338,1.0064,-1.2241], ['C',2.0232,-0.1301,1.5965],
      ['C',0.1818,1.5319,-0.5744], ['C',-2.3131,-2.012,-0.3664], ['C',-0.3384,-1.5468,-1.8217], ['C',-1.8513,0.9966,0.6268],
      ['C',-1.6452,-1.825,-1.7028], ['C',3.9898,-0.0536,0.1933], ['C',-0.323,2.8151,-0.7918], ['C',-2.3671,2.2589,0.4319],
      ['C',-1.5815,3.1799,-0.2729], ['H',0.8756,-2.3699,-0.3266], ['H',2.358,-0.8983,-1.685], ['H',-1.7051,-1.8971,1.6949],
      ['H',0.7658,-1.7921,2.1487], ['H',0.1462,-0.2256,2.657], ['H',1.2663,1.0308,-2.3095], ['H',2.2651,1.6902,-1.0269],
      ['H',1.9464,0.9643,1.5976], ['H',2.6525,-0.3939,2.4559], ['H',-2.2452,-3.0858,-0.1481], ['H',0.1111,-1.4948,-2.8084],
      ['H',-2.2317,-1.997,-2.6007], ['H',3.9947,1.0401,0.1509], ['H',4.4614,-0.4386,-0.7175], ['H',4.6328,-0.3577,1.027],
      ['H',0.2372,3.5327,-1.3852], ['H',-1.9584,4.183,-0.4589], ['H',-4.0954,-1.8657,0.4156], ['H',-3.9893,1.8251,1.3235],
    ],
    bonds: [
      [1,8,1], [1,16,1], [2,14,1], [2,39,1], [3,20,1], [3,40,1], [4,7,1], [4,12,1],
      [4,18,1], [5,6,1], [5,8,1], [5,9,1], [5,10,1], [6,7,1], [6,15,1], [6,22,1],
      [7,11,1], [7,23,1], [8,14,1], [8,24,1], [9,12,1], [9,25,1], [9,26,1], [10,13,2,1],
      [10,16,1,1], [11,13,1], [11,27,1], [11,28,1], [12,29,1], [12,30,1], [13,19,1,1], [14,17,1],
      [14,31,1], [15,17,2], [15,32,1], [16,20,2,1], [17,33,1], [18,34,1], [18,35,1], [18,36,1],
      [19,21,2,1], [19,37,1], [20,21,1,1], [21,38,1],
    ],
  },
  {
    id: 'penisilin-g',
    category: 'İlaçlar ve Alkaloitler',
    name: "Penisilin G (benzilpenisilin)",
    nameEn: "Penicillin G (benzylpenicillin)",
    description: "C₁₆H₁₈N₂O₄S — Dört üyeli bir β-laktam halkası taşıyan antibiyotiktir; bakteri hücre duvarı sentezini engeller. Penicillium küfü Alexander Fleming tarafından 1928'de gözlemlenmiştir.",
    descriptionEn: "C₁₆H₁₈N₂O₄S — An antibiotic with a four-membered β-lactam ring that blocks bacterial cell-wall synthesis. The Penicillium mould was observed by Alexander Fleming in 1928.",
    atoms: [
      ['S',-0.9372,0.7616,0.5518], ['O',-2.0689,-3.1212,-1.196], ['O',-5.4433,0.2177,-0.8278], ['O',-5.0675,-1.5344,0.5811],
      ['O',2.291,-2.2429,1.269], ['N',-2.4337,-1.3435,0.3129], ['N',0.6625,-1.7171,-0.2985], ['C',-1.3058,-0.9276,1.1517],
      ['C',-2.7297,1.0453,0.1323], ['C',-3.2069,-0.3315,-0.378], ['C',-0.501,-2.0745,0.5253], ['C',-1.7754,-2.3772,-0.288],
      ['C',-3.4399,1.5353,1.4014], ['C',-2.8218,2.1087,-0.9636], ['C',-4.6507,-0.6375,-0.1367], ['C',1.9786,-1.8347,0.1535],
      ['C',2.9837,-1.3966,-0.8937], ['C',3.8486,-0.248,-0.4465], ['C',3.4354,1.054,-0.6908], ['C',5.0472,-0.5078,0.2035],
      ['C',4.2367,2.118,-0.2767], ['C',5.8484,0.5563,0.6178], ['C',5.4432,1.8693,0.3777], ['H',-1.5161,-1.0176,2.2213],
      ['H',-3.0138,-0.4547,-1.4522], ['H',-0.2732,-2.8863,1.2274], ['H',-3.4287,0.7842,2.1993], ['H',-2.9745,2.4475,1.7938],
      ['H',-4.4886,1.7805,1.1998], ['H',-2.3959,3.0636,-0.6334], ['H',-2.2913,1.8036,-1.8732], ['H',-3.8634,2.3004,-1.2425],
      ['H',0.508,-1.3564,-1.2371], ['H',-6.3957,0.0338,-0.6818], ['H',3.6076,-2.2684,-1.1303], ['H',2.4893,-1.1343,-1.837],
      ['H',2.4963,1.2583,-1.1978], ['H',5.3712,-1.5265,0.3969], ['H',3.9208,3.1404,-0.463], ['H',6.7875,0.3626,1.1278],
      ['H',6.0668,2.6977,0.7005],
    ],
    bonds: [
      [1,8,1], [1,9,1], [2,12,2], [3,15,1], [3,34,1], [4,15,2], [5,16,2], [6,8,1],
      [6,10,1], [6,12,1], [7,11,1], [7,16,1], [7,33,1], [8,11,1], [8,24,1], [9,10,1],
      [9,13,1], [9,14,1], [10,15,1], [10,25,1], [11,12,1], [11,26,1], [13,27,1], [13,28,1],
      [13,29,1], [14,30,1], [14,31,1], [14,32,1], [16,17,1], [17,18,1], [17,35,1], [17,36,1],
      [18,19,2,1], [18,20,1,1], [19,21,1,1], [19,37,1], [20,22,2,1], [20,38,1], [21,23,2,1], [21,39,1],
      [22,23,1,1], [22,40,1], [23,41,1],
    ],
  },
]

/** Build a Molecule. Atom ids are 1..n, bond ids continue from n+1 (one shared counter, as the store expects). */
function build(r: RawEntry): Molecule {
  const m = emptyMolecule(r.name)
  m.id = `lib-${r.id}` // stable and unique; cannot collide with the generated "mol-N" ids
  m.atoms = r.atoms.map((a, i) => ({ id: i + 1, symbol: a[0], pos: [a[1], a[2], a[3]], charge: a[4] ?? 0 }))
  const n = m.atoms.length
  m.bonds = r.bonds.map((b, i) => ({ id: n + 1 + i, a: b[0], b: b[1], order: b[2] as BondOrder, ...(b[3] ? { aromatic: true } : {}) }))
  m.nextId = n + r.bonds.length + 1
  return m
}

export const LIBRARY: LibraryEntry[] = RAW.map((r) => ({
  id: r.id,
  name: r.name,
  nameEn: r.nameEn,
  category: r.category,
  description: r.description,
  descriptionEn: r.descriptionEn,
  molecule: build(r),
}))

const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]))

/** Look up an entry by its stable id (e.g. "metan"). The returned molecule is shared: clone it before editing. */
export function getEntry(id: string): LibraryEntry | undefined {
  return BY_ID.get(id)
}
