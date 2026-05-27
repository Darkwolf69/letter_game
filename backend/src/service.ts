import * as queries from "./database.js";

export async function getUserByEmail(email: string) {
  const user = await queries.getUserByEmail(email);
  return user ?? undefined;
}

export async function getUserByName(username: string) {
  const user = await queries.getUserByName(username);
  return user ?? undefined;
}

export async function createUser(
  username: string,
  email: string,
  password: string,
  role?: string,
) {
  const user = (await queries.createUser(username, email, password)) as unknown;
  if (user === undefined || user === null) {
    throw new Error("Új felhasználó létrehozása sikertelen!");
  }
  return user;
}
