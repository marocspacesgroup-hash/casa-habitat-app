/**
 * Redis simulé pour les tests du circuit financier.
 *
 * Il exécute les VRAIS scripts Lua du circuit (moteur Lua fengari) contre un
 * magasin clé-valeur en mémoire, avec une horloge contrôlable pour les
 * expirations. Seules les commandes utilisées par les scripts existent ;
 * toute autre commande fait échouer le test.
 *
 * Atomicité : JavaScript exécutant un script de bout en bout sans rendre la
 * main, deux scripts ne peuvent pas s'entrelacer — comme dans Redis.
 * Conversions : identiques à Redis (nil → false, entier → number, statut → {ok}).
 */
// @ts-expect-error — fengari ne fournit pas de déclarations de types.
import { lua, lauxlib, lualib, to_luastring } from "fengari";
import type { ScriptStore } from "@/lib/ai/finance/store";

type Entry =
  | { type: "string"; value: string; expireAt?: number }
  | { type: "hash"; value: Map<string, string>; expireAt?: number }
  | { type: "zset"; value: Map<string, number>; expireAt?: number };

type Reply = null | number | string | { ok: string } | Reply[];

export class FakeRedis {
  private data = new Map<string, Entry>();
  private clockMs: number;
  readonly executed: string[] = [];

  constructor(startMs = Date.UTC(2026, 8, 17, 10, 0, 0)) {
    this.clockMs = startMs;
  }

  now(): number {
    return this.clockMs;
  }

  advance(ms: number) {
    this.clockMs += ms;
  }

  /** Lecture directe d'une chaîne (assertions de test). */
  peek(key: string): string | null {
    const entry = this.live(key);
    return entry?.type === "string" ? entry.value : null;
  }

  peekNumber(key: string): number {
    return Number(this.peek(key) ?? "0");
  }

  zcard(key: string): number {
    const entry = this.live(key);
    return entry?.type === "zset" ? entry.value.size : 0;
  }

  hget(key: string, field: string): string | null {
    const entry = this.live(key);
    return entry?.type === "hash" ? (entry.value.get(field) ?? null) : null;
  }

  ttlSeconds(key: string): number {
    const entry = this.live(key);
    if (!entry) return -2;
    if (entry.expireAt === undefined) return -1;
    return Math.floor((entry.expireAt - this.clockMs + 500) / 1000);
  }

  zscore(key: string, member: string): number | null {
    const entry = this.live(key);
    return entry?.type === "zset" ? (entry.value.get(member) ?? null) : null;
  }

  /** Pose une valeur de chaîne (préparation de scénario de test). */
  set(key: string, value: string, ttlSeconds?: number) {
    this.data.set(key, {
      type: "string",
      value,
      expireAt: ttlSeconds === undefined ? undefined : this.clockMs + ttlSeconds * 1000,
    });
  }

  del(key: string) {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()].filter((k) => this.live(k));
  }

  private live(key: string): Entry | undefined {
    const entry = this.data.get(key);
    if (entry && entry.expireAt !== undefined && entry.expireAt <= this.clockMs) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  private command(args: string[]): Reply {
    const [rawName, ...rest] = args;
    const name = rawName.toUpperCase();
    this.executed.push(name);
    const key = rest[0];

    switch (name) {
      case "GET": {
        const e = this.live(key);
        if (!e) return null;
        if (e.type !== "string") throw new Error("WRONGTYPE");
        return e.value;
      }
      case "SET": {
        const options = rest.slice(2).map((o) => o.toUpperCase());
        const exists = this.live(key) !== undefined;
        if (options.includes("NX") && exists) return null;
        const entry: Entry = { type: "string", value: rest[1] };
        const ex = options.indexOf("EX");
        if (ex !== -1) entry.expireAt = this.clockMs + Number(rest[2 + ex + 1]) * 1000;
        this.data.set(key, entry);
        return { ok: "OK" };
      }
      case "INCR":
      case "INCRBY": {
        const e = this.live(key);
        if (e && e.type !== "string") throw new Error("WRONGTYPE");
        const current = e ? Number(e.value) : 0;
        if (!Number.isSafeInteger(current)) throw new Error("ERR value is not an integer");
        const by = name === "INCR" ? 1 : Number(rest[1]);
        if (!Number.isSafeInteger(by)) throw new Error("ERR increment is not an integer");
        const next = current + by;
        this.data.set(key, { type: "string", value: String(next), expireAt: e?.expireAt });
        return next;
      }
      case "EXPIRE":
      case "PEXPIRE": {
        const e = this.live(key);
        if (!e) return 0;
        const amount = Number(rest[1]) * (name === "EXPIRE" ? 1000 : 1);
        if (amount <= 0) {
          this.data.delete(key);
          return 1;
        }
        e.expireAt = this.clockMs + amount;
        return 1;
      }
      case "TTL":
        return this.ttlSeconds(key);
      case "EXISTS":
        return this.live(key) ? 1 : 0;
      case "HGET": {
        const e = this.live(key);
        if (!e) return null;
        if (e.type !== "hash") throw new Error("WRONGTYPE");
        return e.value.get(rest[1]) ?? null;
      }
      case "HSET": {
        let e = this.live(key);
        if (!e) {
          e = { type: "hash", value: new Map() };
          this.data.set(key, e);
        }
        if (e.type !== "hash") throw new Error("WRONGTYPE");
        let added = 0;
        for (let i = 1; i < rest.length; i += 2) {
          if (!e.value.has(rest[i])) added += 1;
          e.value.set(rest[i], rest[i + 1]);
        }
        return added;
      }
      case "ZADD": {
        let e = this.live(key);
        if (!e) {
          e = { type: "zset", value: new Map() };
          this.data.set(key, e);
        }
        if (e.type !== "zset") throw new Error("WRONGTYPE");
        const isNew = !e.value.has(rest[2]);
        e.value.set(rest[2], Number(rest[1]));
        return isNew ? 1 : 0;
      }
      case "ZREM": {
        const e = this.live(key);
        if (!e || e.type !== "zset") return 0;
        const removed = e.value.delete(rest[1]) ? 1 : 0;
        if (e.value.size === 0) this.data.delete(key);
        return removed;
      }
      case "ZSCORE": {
        const e = this.live(key);
        if (!e || e.type !== "zset") return null;
        const score = e.value.get(rest[1]);
        return score === undefined ? null : String(score);
      }
      case "ZCARD": {
        const e = this.live(key);
        return e?.type === "zset" ? e.value.size : 0;
      }
      case "ZREMRANGEBYSCORE": {
        const e = this.live(key);
        if (!e || e.type !== "zset") return 0;
        const min = rest[1] === "-inf" ? -Infinity : Number(rest[1]);
        const max = rest[2] === "+inf" ? Infinity : Number(rest[2]);
        let removed = 0;
        for (const [member, score] of e.value) {
          if (score >= min && score <= max) {
            e.value.delete(member);
            removed += 1;
          }
        }
        if (e.value.size === 0) this.data.delete(key);
        return removed;
      }
      default:
        throw new Error(`Commande non simulée : ${name}`);
    }
  }

  /** Exécute un script Lua comme EVAL. */
  eval(script: string, keys: string[], argv: string[]): Reply {
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    const setArray = (name: string, values: string[]) => {
      lua.lua_createtable(L, values.length, 0);
      values.forEach((v, i) => {
        lua.lua_pushstring(L, to_luastring(v));
        lua.lua_rawseti(L, -2, i + 1);
      });
      lua.lua_setglobal(L, to_luastring(name));
    };
    setArray("KEYS", keys);
    setArray("ARGV", argv);

    lua.lua_newtable(L);
    lua.lua_pushjsfunction(L, (state: unknown) => {
      const count = lua.lua_gettop(state);
      const args: string[] = [];
      for (let i = 1; i <= count; i += 1) {
        if (lua.lua_type(state, i) === lua.LUA_TNUMBER) {
          const n = lua.lua_tonumber(state, i);
          args.push(Number.isInteger(n) ? String(n) : n.toPrecision(17));
        } else {
          args.push(lua.lua_tojsstring(state, i));
        }
      }
      let reply: Reply;
      try {
        reply = this.command(args);
      } catch (error) {
        return lauxlib.luaL_error(state, to_luastring((error as Error).message));
      }
      pushReply(state, reply);
      return 1;
    });
    lua.lua_setfield(L, -2, to_luastring("call"));
    lua.lua_setglobal(L, to_luastring("redis"));

    // Redis embarque Lua 5.1, où tout nombre est un flottant double (exact
    // jusqu'à 2^53). fengari implémente Lua 5.3 avec des entiers 32 bits qui
    // débordent au-delà de 2 147 483 647 — soit 2,15 $ en nanodollars. Pour
    // reproduire Redis, toute conversion `tonumber` produit un flottant.
    const redisNumbers =
      "local __tonumber = tonumber\n" +
      "local tonumber = function(v, b) local n = __tonumber(v, b) if n then return n + 0.0 end return nil end\n";

    if (lauxlib.luaL_loadstring(L, to_luastring(redisNumbers + script)) !== lua.LUA_OK) {
      throw new Error(`Script invalide : ${lua.lua_tojsstring(L, -1)}`);
    }
    if (lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
      throw new Error(`Erreur de script : ${lua.lua_tojsstring(L, -1)}`);
    }
    return readReply(L, -1);
  }
}

function pushReply(L: unknown, reply: Reply) {
  if (reply === null) {
    lua.lua_pushboolean(L, false);
  } else if (typeof reply === "number") {
    lua.lua_pushnumber(L, reply);
  } else if (typeof reply === "string") {
    lua.lua_pushstring(L, to_luastring(reply));
  } else if (Array.isArray(reply)) {
    lua.lua_createtable(L, reply.length, 0);
    reply.forEach((item, i) => {
      pushReply(L, item);
      lua.lua_rawseti(L, -2, i + 1);
    });
  } else {
    lua.lua_createtable(L, 0, 1);
    lua.lua_pushstring(L, to_luastring(reply.ok));
    lua.lua_setfield(L, -2, to_luastring("ok"));
  }
}

/** Conversion Lua → réponse Redis (nombre tronqué en entier, tableau jusqu'au premier nil). */
function readReply(L: unknown, index: number): Reply {
  const type = lua.lua_type(L, index);
  if (type === lua.LUA_TNUMBER) return Math.trunc(lua.lua_tonumber(L, index));
  if (type === lua.LUA_TSTRING) return lua.lua_tojsstring(L, index);
  if (type === lua.LUA_TBOOLEAN) return lua.lua_toboolean(L, index) ? 1 : null;
  if (type === lua.LUA_TTABLE) {
    const abs = lua.lua_absindex(L, index);
    lua.lua_getfield(L, abs, to_luastring("ok"));
    if (lua.lua_type(L, -1) === lua.LUA_TSTRING) {
      const ok = lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
      return { ok };
    }
    lua.lua_pop(L, 1);
    const out: Reply[] = [];
    for (let i = 1; ; i += 1) {
      lua.lua_rawgeti(L, abs, i);
      if (lua.lua_type(L, -1) === lua.LUA_TNIL) {
        lua.lua_pop(L, 1);
        break;
      }
      out.push(readReply(L, -1));
      lua.lua_pop(L, 1);
    }
    return out;
  }
  return null;
}

/**
 * Store de test branché sur un FakeRedis partagé.
 * `jitterMs` retarde aléatoirement chaque exécution pour mélanger l'ordre
 * d'arrivée des requêtes simultanées, sans jamais couper un script en deux.
 */
export function fakeStore(redis: FakeRedis, options: { jitterMs?: number } = {}): ScriptStore {
  return {
    async evalScript(script, keys, args) {
      if (options.jitterMs) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * options.jitterMs!));
      }
      return redis.eval(script, keys, args);
    },
  };
}
