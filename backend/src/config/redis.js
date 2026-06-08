import Redis from "ioredis";
export const makeRedis = (url) => new Redis(url);
