/**
 * Scripts Lua exécutés par Redis.
 *
 * Chaque script s'exécute en une seule étape indivisible : aucune autre
 * commande, d'aucun serveur, ne peut s'intercaler entre la lecture d'un
 * compteur et son écriture. C'est ce qui empêche deux requêtes simultanées
 * — sur deux instances Vercel différentes — de dépasser ensemble un budget.
 *
 * Règles communes :
 * - toutes les clés sont passées dans KEYS ;
 * - l'heure et les montants arrivent dans ARGV (script déterministe) ;
 * - les réponses ne contiennent que des chaînes et des entiers ;
 * - chaque script est idempotent vis-à-vis de son identifiant.
 */

/**
 * ADMIT — admission d'une requête visiteur.
 *
 * KEYS : 1 kill · 2 état de la requête · 3 fenêtre minute visiteur ·
 *        4 fenêtre heure visiteur · 5 concurrence visiteur · 6 concurrence globale ·
 *        7 pause
 * ARGV : 1 requestId · 2 maintenant (ms) · 3 limite/minute · 4 limite/heure ·
 *        5 concurrence visiteur max · 6 concurrence globale max ·
 *        7 TTL place (ms) · 8 TTL minute (s) · 9 TTL heure (s) · 10 TTL requête (s) ·
 *        11 visiteur (HMAC)
 *
 * Réponse : { décision } — "admitted" | "killed" | "paused" | "rate_minute" |
 *           "rate_hour" | "concurrency_visitor" | "concurrency_global"
 * Rejouer une admission déjà accordée renvoie "admitted" sans rien recompter
 * (et sans recréer de place : RESERVE vérifie de toute façon la place).
 */
export const ADMIT_SCRIPT = `
local previous = redis.call('HGET', KEYS[2], 'decision')
if previous then
  return { previous }
end

if redis.call('EXISTS', KEYS[1]) == 1 then
  return { 'killed' }
end
if redis.call('EXISTS', KEYS[7]) == 1 then
  return { 'paused' }
end

local now = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[5], '-inf', now)
redis.call('ZREMRANGEBYSCORE', KEYS[6], '-inf', now)

if tonumber(redis.call('GET', KEYS[3]) or '0') >= tonumber(ARGV[3]) then
  return { 'rate_minute' }
end
if tonumber(redis.call('GET', KEYS[4]) or '0') >= tonumber(ARGV[4]) then
  return { 'rate_hour' }
end
if redis.call('ZCARD', KEYS[5]) >= tonumber(ARGV[5]) then
  return { 'concurrency_visitor' }
end
if redis.call('ZCARD', KEYS[6]) >= tonumber(ARGV[6]) then
  return { 'concurrency_global' }
end

redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], tonumber(ARGV[8]))
redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], tonumber(ARGV[9]))

local expiresAt = now + tonumber(ARGV[7])
redis.call('ZADD', KEYS[5], expiresAt, ARGV[1])
redis.call('PEXPIRE', KEYS[5], tonumber(ARGV[7]))
redis.call('ZADD', KEYS[6], expiresAt, ARGV[1])
redis.call('PEXPIRE', KEYS[6], tonumber(ARGV[7]))

redis.call('HSET', KEYS[2], 'decision', 'admitted', 'visitor', ARGV[11])
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[10]))
return { 'admitted' }
`;

/**
 * RELEASE — libère les places de concurrence d'une requête.
 *
 * KEYS : 1 état de la requête · 2 concurrence visiteur · 3 concurrence globale
 * ARGV : 1 requestId
 * Réponse : { "released", places retirées }. Rejouer ne retire rien de plus.
 * La requête est marquée libérée : aucune réservation ne peut plus s'y rattacher.
 */
export const RELEASE_SCRIPT = `
local removed = redis.call('ZREM', KEYS[2], ARGV[1]) + redis.call('ZREM', KEYS[3], ARGV[1])
if redis.call('EXISTS', KEYS[1]) == 1 then
  redis.call('HSET', KEYS[1], 'released', '1')
end
return { 'released', removed }
`;

/**
 * RESERVE — réserve le coût maximal d'un appel avant qu'il n'ait lieu.
 *
 * KEYS : 1 kill · 2 pause · 3 état de l'appel · 4 dépense jour · 5 dépense heure ·
 *        6 dépense visiteur jour · 7 alerte 60 % · 8 alerte 80 % ·
 *        9 état de la requête · 10 concurrence visiteur · 11 concurrence globale
 * ARGV : 1 callId · 2 montant réservé · 3 plafond jour · 4 plafond heure ·
 *        5 plafond visiteur · 6 TTL jour (s) · 7 TTL heure (s) · 8 TTL appel (s) ·
 *        9 seuil 60 % · 10 seuil 80 % · 11 requestId · 12 maintenant (ms) ·
 *        13 visiteur (HMAC)
 *
 * Réponse : { décision, alerte60, alerte80 } — "reserved" | "replay" | "killed" |
 *           "paused" | "slot_expired" | "budget_day" | "budget_hour" | "budget_visitor"
 *
 * PLACE VIVANTE (décision D3) : la réservation est refusée si la requête
 * n'a pas été admise, a été libérée, appartient à un autre visiteur, ou si
 * sa place globale ou visiteur est absente ou expirée. La vérification et
 * l'écriture se font dans le même script : impossible de réserver pour une
 * place qui expire entre les deux.
 *
 * Les périodes (clés 4 à 6) sont mémorisées dans l'état de l'appel : le
 * règlement agit exactement sur elles, même après minuit.
 */
export const RESERVE_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 then
  return { 'replay', 0, 0 }
end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return { 'killed', 0, 0 }
end
if redis.call('EXISTS', KEYS[2]) == 1 then
  return { 'paused', 0, 0 }
end

local now = tonumber(ARGV[12])
if redis.call('HGET', KEYS[9], 'decision') ~= 'admitted'
  or redis.call('HGET', KEYS[9], 'released') == '1'
  or redis.call('HGET', KEYS[9], 'visitor') ~= ARGV[13] then
  return { 'slot_expired', 0, 0 }
end
local globalSlot = redis.call('ZSCORE', KEYS[11], ARGV[11])
local visitorSlot = redis.call('ZSCORE', KEYS[10], ARGV[11])
if not globalSlot or not visitorSlot
  or tonumber(globalSlot) <= now or tonumber(visitorSlot) <= now then
  return { 'slot_expired', 0, 0 }
end

local amount = tonumber(ARGV[2])
local day = tonumber(redis.call('GET', KEYS[4]) or '0')
local hour = tonumber(redis.call('GET', KEYS[5]) or '0')
local visitor = tonumber(redis.call('GET', KEYS[6]) or '0')

if day + amount > tonumber(ARGV[3]) then
  return { 'budget_day', 0, 0 }
end
if hour + amount > tonumber(ARGV[4]) then
  return { 'budget_hour', 0, 0 }
end
if visitor + amount > tonumber(ARGV[5]) then
  return { 'budget_visitor', 0, 0 }
end

local newDay = redis.call('INCRBY', KEYS[4], amount)
redis.call('EXPIRE', KEYS[4], tonumber(ARGV[6]))
redis.call('INCRBY', KEYS[5], amount)
redis.call('EXPIRE', KEYS[5], tonumber(ARGV[7]))
redis.call('INCRBY', KEYS[6], amount)
redis.call('EXPIRE', KEYS[6], tonumber(ARGV[6]))

redis.call('HSET', KEYS[3], 'status', 'reserved', 'amount', ARGV[2],
  'day', KEYS[4], 'hour', KEYS[5], 'visitor', KEYS[6], 'request', ARGV[11])
redis.call('EXPIRE', KEYS[3], tonumber(ARGV[8]))

local a60 = 0
local a80 = 0
if newDay >= tonumber(ARGV[9]) and redis.call('SET', KEYS[7], '1', 'NX', 'EX', tonumber(ARGV[6])) then
  a60 = 1
end
if newDay >= tonumber(ARGV[10]) and redis.call('SET', KEYS[8], '1', 'NX', 'EX', tonumber(ARGV[6])) then
  a80 = 1
end
return { 'reserved', a60, a80 }
`;

/**
 * SETTLE — remplace la réservation par le coût réel (0 = restitution).
 *
 * KEYS : 1 kill · 2 état de l'appel · 3 dépense jour · 4 dépense heure ·
 *        5 dépense visiteur jour · 6 alerte 60 % · 7 alerte 80 %
 * ARGV : 1 coût réel · 2 tokens comptés avant l'appel · 3 tokens d'entrée
 *        facturés · 4 marge (%) · 5 TTL jour (s) · 6 seuil 60 % · 7 seuil 80 % ·
 *        8 anomalie signalée par l'application (0/1) · 9 motif de l'anomalie
 *
 * Réponse : { décision, coût > réservation, écart de comptage, kill posé,
 *             alerte60, alerte80 }
 *   décision : "settled" | "replay" | "cancelled" | "unknown" | "key_mismatch"
 *
 * - "cancelled" : appel annulé par CANCEL (jamais envoyé au modèle) ; rien n'est modifié.
 * - "unknown" : aucune réservation (expirée ou inexistante) ; rien n'est rendu.
 * - "key_mismatch" : clés différentes de celles réservées ; rien n'est modifié.
 * - Aucun compteur ne descend sous zéro.
 * - Coût réel > réservation, écart de comptage > marge, ou anomalie signalée :
 *   le drapeau kill global est posé (sans expiration : remise en service manuelle).
 */
export const SETTLE_SCRIPT = `
local status = redis.call('HGET', KEYS[2], 'status')
if not status then
  return { 'unknown', 0, 0, 0, 0, 0 }
end
if status == 'settled' then
  return { 'replay', 0, 0, 0, 0, 0 }
end
if status == 'cancelled' then
  return { 'cancelled', 0, 0, 0, 0, 0 }
end
if redis.call('HGET', KEYS[2], 'day') ~= KEYS[3]
  or redis.call('HGET', KEYS[2], 'hour') ~= KEYS[4]
  or redis.call('HGET', KEYS[2], 'visitor') ~= KEYS[5] then
  return { 'key_mismatch', 0, 0, 0, 0, 0 }
end

local amount = tonumber(redis.call('HGET', KEYS[2], 'amount'))
local actual = tonumber(ARGV[1])
local delta = actual - amount

local newDay = 0
for i = 3, 5 do
  local ttl = redis.call('TTL', KEYS[i])
  local value = redis.call('INCRBY', KEYS[i], delta)
  if value < 0 then
    redis.call('SET', KEYS[i], '0')
    value = 0
  end
  -- Clé expirée entre-temps (recréée par INCRBY) ou TTL effacé par SET :
  -- on restaure la durée d'origine, ou à défaut la durée d'un jour.
  if ttl > 0 then
    redis.call('EXPIRE', KEYS[i], ttl)
  else
    redis.call('EXPIRE', KEYS[i], tonumber(ARGV[5]))
  end
  if i == 3 then
    newDay = value
  end
end

local overCost = 0
if actual > amount then
  overCost = 1
end
local countDrift = 0
local counted = tonumber(ARGV[2])
if counted > 0 and tonumber(ARGV[3]) * 100 > counted * (100 + tonumber(ARGV[4])) then
  countDrift = 1
end

local killSet = 0
if overCost == 1 or countDrift == 1 or ARGV[8] == '1' then
  local reason = ARGV[9]
  if overCost == 1 then
    reason = 'cout_reel_superieur_reservation'
  elseif countDrift == 1 then
    reason = 'ecart_comptage_superieur_marge'
  end
  redis.call('SET', KEYS[1], reason)
  killSet = 1
end

redis.call('HSET', KEYS[2], 'status', 'settled', 'actual', ARGV[1])

local a60 = 0
local a80 = 0
if newDay >= tonumber(ARGV[6]) and redis.call('SET', KEYS[6], '1', 'NX', 'EX', tonumber(ARGV[5])) then
  a60 = 1
end
if newDay >= tonumber(ARGV[7]) and redis.call('SET', KEYS[7], '1', 'NX', 'EX', tonumber(ARGV[5])) then
  a80 = 1
end
return { 'settled', overCost, countDrift, killSet, a60, a80 }
`;

/**
 * CANCEL — annule un appel dont la réservation est INCERTAINE (RESERVE sans
 * réponse exploitable) et qui, par construction, n'a jamais été envoyé au
 * modèle : le circuit n'appelle le modèle qu'après un RESERVE confirmé.
 *
 * KEYS : 1 état de l'appel · 2 dépense jour · 3 dépense heure · 4 dépense visiteur jour
 * ARGV : 1 TTL appel (s) · 2 requestId · 3 TTL jour (s)
 *
 * Réponse : { décision, montant restitué }
 *   - aucun état : pose une pierre tombale « cancelled » (TTL d'appel). Un
 *     RESERVE parti avant et arrivé après trouve l'état existant et répond
 *     "replay" : il ne compte rien. → { "tombstoned", 0 }
 *   - "reserved" : le RESERVE incertain avait bien été appliqué ; sa
 *     réservation est rendue en entier (aucun appel n'a eu lieu), puis l'état
 *     passe à « cancelled ». → { "refunded", montant }
 *   - "settled" ou "cancelled" : rien n'est modifié. → { "replay", 0 }
 *   - clés différentes de celles de la réservation : rien n'est modifié.
 *     → { "key_mismatch", 0 }
 * Aucun compteur ne descend sous zéro.
 */
export const CANCEL_SCRIPT = `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then
  redis.call('HSET', KEYS[1], 'status', 'cancelled', 'amount', '0', 'request', ARGV[2])
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
  return { 'tombstoned', 0 }
end
if status ~= 'reserved' then
  return { 'replay', 0 }
end
if redis.call('HGET', KEYS[1], 'day') ~= KEYS[2]
  or redis.call('HGET', KEYS[1], 'hour') ~= KEYS[3]
  or redis.call('HGET', KEYS[1], 'visitor') ~= KEYS[4] then
  return { 'key_mismatch', 0 }
end

local amount = tonumber(redis.call('HGET', KEYS[1], 'amount'))
for i = 2, 4 do
  local ttl = redis.call('TTL', KEYS[i])
  local value = redis.call('INCRBY', KEYS[i], -amount)
  if value < 0 then
    redis.call('SET', KEYS[i], '0')
  end
  if ttl > 0 then
    redis.call('EXPIRE', KEYS[i], ttl)
  else
    redis.call('EXPIRE', KEYS[i], tonumber(ARGV[3]))
  end
end

redis.call('HSET', KEYS[1], 'status', 'cancelled', 'actual', '0')
return { 'refunded', amount }
`;

/**
 * THROTTLE_429 — enregistre un 429 Anthropic sans `retry-after` (décision D1).
 *
 * KEYS : 1 kill · 2 pause · 3 compteur fenêtre courte · 4 compteur fenêtre longue
 * ARGV : 1 seuil de pause · 2 fenêtre courte (s) · 3 durée de pause (s) ·
 *        4 seuil de kill · 5 fenêtre longue (s)
 *
 * Réponse : { "recorded", occurrences courtes, occurrences longues, pause posée, kill posé }
 *
 * - occurrences longues ≥ seuil de kill → kill global (problème persistant) ;
 * - sinon occurrences courtes ≥ seuil de pause → pause globale avec expiration.
 * Pendant la pause, ADMIT et RESERVE refusent : les 429 suivants ne peuvent
 * survenir qu'après son expiration, ce qui mesure la persistance du problème.
 */
export const THROTTLE_429_SCRIPT = `
local short = redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], tonumber(ARGV[2]) * 2)
local long = redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], tonumber(ARGV[5]) * 2)

local paused = 0
local killed = 0
if long >= tonumber(ARGV[4]) then
  redis.call('SET', KEYS[1], '429_sans_retry_after_persistant')
  killed = 1
elseif short >= tonumber(ARGV[1]) then
  redis.call('SET', KEYS[2], '429_sans_retry_after', 'EX', tonumber(ARGV[3]))
  paused = 1
end
return { 'recorded', short, long, paused, killed }
`;
