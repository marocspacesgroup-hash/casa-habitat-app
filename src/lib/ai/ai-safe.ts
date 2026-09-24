/**
 * Frontière de données entre le catalogue et le modèle.
 *
 * `PUBLIC_LISTING_SELECT` ne lit jamais la colonne `adresse`, et
 * `toPublicProperty` ne transmet qu'une liste blanche de champs. Reste le
 * texte libre saisi par l'agence — descriptif surtout : un nom de voie ou un
 * numéro d'immeuble peut s'y glisser, et il partirait tel quel vers le
 * modèle. Le prompt interdit de le répéter, mais ce n'est qu'une seconde
 * ligne de défense : ce qui n'est jamais transmis ne peut pas être répété.
 *
 * Ce masquage ne s'applique qu'à la copie destinée au modèle. Le site public
 * et les données Supabase restent inchangés.
 *
 * Choix délibérés, pour limiter les faux positifs :
 * - une voie sans numéro n'est masquée que si un nom propre la suit
 *   (« boulevard Exemple ») : « une rue calme » reste intacte ;
 * - « place » n'est masquée que suivie d'un nom propre : « 1 place de
 *   parking » reste intacte ;
 * - le quartier n'est jamais masqué : c'est l'information de localisation
 *   que le modèle doit pouvoir donner.
 *
 * Les expressions sont construites par `new RegExp` sans drapeau `i` :
 * combiné à `u`, il ferait correspondre `\p{Lu}` aux minuscules, et la
 * distinction nom propre / nom commun disparaîtrait.
 */

export const LOCATION_PLACEHOLDER = "[localisation retirée]";

/** « rue » → « [rR][uU][eE] » : insensible à la casse sans drapeau `i`. */
function anyCase(word: string): string {
  return word.replace(/\p{L}/gu, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
}

const alt = (words: string[]) => `(?:${words.map(anyCase).join("|")})`;

/** Ni lettre ni chiffre avant / après : `\b` ignore les lettres accentuées. */
const START = String.raw`(?<![\p{L}\p{N}])`;
const END = String.raw`(?![\p{L}\p{N}])`;
const SP = String.raw`[ \t ]`;

/** Voies qui, précédées d'un numéro, désignent toujours une adresse. */
const STREET = `(?:${alt(["boulevard", "avenue", "impasse", "allée", "allee", "route", "chemin", "passage", "rue", "blvd", "bd"])}|${anyCase("av")}\\.?)`;
/** Voies et bâtiments masqués seulement suivis d'un nom propre. */
const NAMED_PLACE = `(?:${STREET}|${alt(["place", "angle", "résidence", "residence", "immeuble", "lotissement"])})`;

const PARTICLE = `(?:${alt(["de", "du", "des", "la", "le", "les", "el", "al", "ibn", "ibnou", "bnou", "ben", "abou", "moulay", "sidi", "lalla"])}${SP}+|[lLdD]['’]${SP}*)`;
const PROPER = String.raw`\p{Lu}[\p{L}\p{M}'’\-]*`;
const ANY_WORD = String.raw`\p{L}[\p{L}\p{M}'’\-]*`;
/** Mots qui ouvrent la suite de la phrase : on s'arrête avant eux. */
const CLAUSE = alt(["et", "ou", "à", "au", "aux", "avec", "pour", "proche", "près", "dans", "en", "qui", "sur", "face", "non", "loin", "entre", "dont", "situé", "située", "donnant", "offrant", "un", "une"]);

/** Nom propre, particules comprises : « Mohamed Zerktouni », « d'Anfa », « Hassan II ». */
const PROPER_NAME = `${PARTICLE}*${PROPER}(?:${SP}+${PARTICLE}*(?:${PROPER}|\\d{1,4}${END}))*`;
/** Après un numéro de voie, le nom peut être en minuscules : jusqu'à trois mots. */
const LOOSE_NAME = `(?:${SP}+${PARTICLE}*(?!${CLAUSE}${END})${ANY_WORD}){0,3}`;
const NUMBER = String.raw`(?:[nN]°${SP}*)?\d{1,4}(?:${SP}?(?:bis|ter)|[a-zA-Z])?${END}`;
/** Numéro placé après un nom (« Résidence Exemple, 12 ») : jamais « 3 chambres ». */
const TRAILING_NUMBER = String.raw`(?:${SP}*,?${SP}*(?:[nN]°${SP}*)?\d{1,4}(?!${SP}*[\p{L}\p{N}]))?`;

const PATTERNS: RegExp[] = [
  // « Adresse : … » — tout le reste de la ligne.
  new RegExp(`${START}${anyCase("adresse")}(?:${SP}+${anyCase("exacte")})?${SP}*:[^\\n]*`, "gu"),
  // « 12 Rue Exemple », « 25, boulevard d'Anfa », « 18 bis rue des Orangers ».
  new RegExp(`${START}${NUMBER}${SP}*,?${SP}*${STREET}${END}${LOOSE_NAME}`, "gu"),
  // « Rue 7 », « rue n° 12 », « Boulevard 2 Mars ».
  new RegExp(`${START}${STREET}${END}${SP}*(?:[nN]°${SP}*)?\\d{1,4}${END}(?:${SP}+${PROPER_NAME})?`, "gu"),
  // « boulevard Exemple Exemple », « Place Mohammed V », « Résidence Exemple, 12 ».
  new RegExp(`${START}${NAMED_PLACE}${END}${SP}+${PROPER_NAME}${TRAILING_NUMBER}`, "gu"),
  // Coordonnées GPS : « 33.5731, -7.5898 ».
  /-?\d{1,2}[.,]\d{4,}\s*[,;/]\s*-?\d{1,3}[.,]\d{4,}/g,
];

/** Remplace tout motif de localisation précise par un marqueur neutre. */
export function redactLocation(text: string): string {
  let out = text;
  for (const pattern of PATTERNS) out = out.replace(pattern, LOCATION_PLACEHOLDER);
  return out;
}
