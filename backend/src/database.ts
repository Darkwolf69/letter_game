import mysql, { type ResultSetHeader } from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: false,
  })
  .promise();

export async function getUserByName(username: string) {
  try {
    const [rows] = (await pool.execute(
      `SELECT * FROM users WHERE BINARY username = BINARY ?`,
      [username],
    )) as any;
    return rows[0];
  } catch (e: any) {
    throw new Error(e.message, { cause: e });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const [rows] = (await pool.execute(`SELECT * FROM users WHERE email = ?`, [
      email,
    ])) as any;
    return rows[0];
  } catch (e: any) {
    throw new Error(e.message, { cause: e });
  }
}
export async function createUser(
  username: string,
  email: string,
  password: string,
) {
  try {
    const [result] = (await pool.execute(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
      [username, email, password],
    )) as any;
    return await getUserById(result.insertId);
  } catch (e: any) {
    throw new Error(e.message, { cause: e });
  }
}

export async function getUserById(id: number) {
  try {
    const [rows] = (await pool.execute(
      `SELECT username FROM users WHERE id = ?`,
      [id],
    )) as any;
    return rows[0];
  } catch (e: any) {
    throw new Error(e.message, { cause: e });
  }
}
